/**
 * Public Form Routes
 * Anonymous form submission endpoints (no authentication required)
 *
 * Features:
 * - Slug-based form access
 * - Anonymous submissions with IP tracking
 * - Token validation for security
 * - Rate limiting (5 submissions/hour per IP)
 * - PDPA consent support
 *
 * @version v0.9.0-dev
 * @date 2025-10-26
 */

const express = require('express');
const router = express.Router();
const { optionalAuth, attachMetadata } = require('../../middleware/auth.middleware');
const { publicFormRateLimiter } = require('../../middleware/rateLimit.middleware');
const { sanitizeBody } = require('../../middleware/sanitization.middleware');
const FormService = require('../../services/FormService');
const SubmissionService = require('../../services/SubmissionService');
const ConsentRecordService = require('../../services/ConsentRecordService');
const logger = require('../../utils/logger.util');
const { ApiError } = require('../../middleware/error.middleware');

/**
 * GET /api/v1/public/forms/:slug
 * Get public form details by slug
 *
 * Access: Public (no authentication)
 * Rate Limit: None (read-only)
 *
 * @param {string} slug - URL slug (from form.settings.publicLink.slug)
 * @returns {Object} Form data (filtered for public access)
 *
 * Response:
 * {
 *   success: true,
 *   form: {
 *     id: "uuid",
 *     title: "Customer Feedback",
 *     description: "...",
 *     fields: [...],
 *     consentItems: [...],
 *     settings: {
 *       privacyNotice: {...},
 *       publicLink: { banner: {...} }
 *     }
 *   }
 * }
 *
 * Errors:
 * - 404: Form not found or public link disabled
 * - 410: Public link expired
 * - 429: Submission limit reached
 */
router.get('/forms/:slug',
  optionalAuth,
  attachMetadata,
  async (req, res, next) => {
    try {
      const { slug } = req.params;

      logger.info(`📋 Public form request: /public/forms/${slug}`);

      // Get form by slug (includes expiration/limit checks)
      const form = await FormService.getFormBySlug(slug);

      res.json({
        success: true,
        form
      });

      logger.info(`✅ Public form loaded: ${slug} (Form ID: ${form.id})`);
    } catch (error) {
      // Pass ApiError to error handler
      next(error);
    }
  }
);

/**
 * POST /api/v1/public/forms/:slug/submit
 * Submit public form (anonymous allowed)
 *
 * Access: Public (no authentication)
 * Rate Limit: 5 submissions per hour per IP
 *
 * Request Body:
 * {
 *   token: "abc123...",              // Security token from publicLink.token
 *   data: {                           // Form field data
 *     field1: "value1",
 *     field2: "value2"
 *   },
 *   consents: [                       // Optional PDPA consents
 *     { consentItemId: 1, consentGiven: true }
 *   ],
 *   fullName: "John Doe",             // For signature
 *   signatureData: "data:image/png;base64,...",
 *   privacyNoticeAccepted: true
 * }
 *
 * Response:
 * {
 *   success: true,
 *   message: "Form submitted successfully",
 *   submissionId: "uuid"
 * }
 *
 * Errors:
 * - 400: Missing required fields
 * - 401: Missing public token
 * - 403: Invalid public token
 * - 404: Form not found
 * - 410: Public link expired
 * - 429: Rate limit exceeded OR submission limit reached
 */
router.post('/forms/:slug/submit',
  optionalAuth,        // Allow anonymous users
  attachMetadata,      // Extract IP address & user-agent
  publicFormRateLimiter, // 5 submissions/hour per IP
  sanitizeBody(),      // XSS protection
  async (req, res, next) => {
    try {
      const { slug } = req.params;
      const {
        token,
        data,
        consents,
        fullName,
        signatureData,
        privacyNoticeAccepted
      } = req.body;

      logger.info(`📝 Public form submission: /public/forms/${slug}`);
      logger.info(`   IP: ${req.metadata.ipAddress}`);
      logger.info(`   User-Agent: ${req.metadata.userAgent?.substring(0, 50)}...`);

      // Validate required fields
      if (!token) {
        throw new ApiError(400, 'Security token is required', 'MISSING_TOKEN');
      }

      if (!data || typeof data !== 'object') {
        throw new ApiError(400, 'Form data is required', 'MISSING_DATA');
      }

      // Get form by slug
      const form = await FormService.getFormBySlug(slug);

      logger.info(`✅ Form loaded: ${form.title} (ID: ${form.id})`);

      // Validate token (critical security check)
      if (form.settings.publicLink.token !== token) {
        logger.warn(`⚠️  Invalid token attempt for form ${form.id} from IP ${req.metadata.ipAddress}`);
        throw new ApiError(403, 'Invalid or expired security token', 'INVALID_TOKEN');
      }

      logger.info('✅ Security token validated');

      // Create submission (anonymous)
      const submission = await SubmissionService.createSubmission(
        form.id,
        req.userId || null,  // NULL for anonymous submissions
        {
          fieldData: data,  // Wrap data in expected format
          status: 'submitted'
        },
        {
          ipAddress: req.metadata.ipAddress,
          userAgent: req.metadata.userAgent,
          publicToken: token
        },
        {
          isPublic: true  // Enable public mode (skip role check)
        }
      );

      logger.info(`✅ Submission created: ${submission.id}`);

      // Record PDPA consents (if any)
      if (consents && consents.length > 0) {
        try {
          await ConsentRecordService.createConsentRecords({
            submissionId: submission.id,
            formId: form.id,
            userId: req.userId || null,
            consents,
            signatureData,
            fullName,
            ipAddress: req.metadata.ipAddress,
            userAgent: req.metadata.userAgent,
            privacyNoticeAccepted,
            privacyNoticeVersion: form.settings?.privacyNotice?.version || '1.0'
          });

          logger.info(`✅ PDPA consents recorded: ${consents.length} items`);
        } catch (consentError) {
          // Log error but don't fail submission
          logger.error('❌ Failed to record consents:', consentError);
          // Continue - submission was successful
        }
      }

      // Success response
      res.status(201).json({
        success: true,
        message: 'Form submitted successfully',
        submissionId: submission.id
      });

      logger.info(`✅ Public submission complete: ${submission.id} for form ${form.id}`);
    } catch (error) {
      // Pass error to error handler
      next(error);
    }
  }
);

/**
 * GET /api/v1/public/forms/:slug/status
 * Get public form status (for debugging/monitoring)
 *
 * Access: Public
 *
 * Response:
 * {
 *   enabled: true,
 *   submissionCount: 42,
 *   maxSubmissions: 100,
 *   expiresAt: "2025-12-31T23:59:59Z",
 *   remainingSlots: 58
 * }
 */
router.get('/forms/:slug/status',
  optionalAuth,
  async (req, res, next) => {
    try {
      const { slug } = req.params;

      const form = await FormService.getFormBySlug(slug);
      const publicLink = form.settings.publicLink;

      const remainingSlots = publicLink.maxSubmissions
        ? publicLink.maxSubmissions - publicLink.submissionCount
        : null;

      res.json({
        success: true,
        status: {
          enabled: publicLink.enabled,
          submissionCount: publicLink.submissionCount || 0,
          maxSubmissions: publicLink.maxSubmissions,
          expiresAt: publicLink.expiresAt,
          remainingSlots,
          isExpired: publicLink.expiresAt
            ? new Date(publicLink.expiresAt) < new Date()
            : false
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
