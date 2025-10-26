/**
 * Consent Management Routes
 * API endpoints for PDPA consent management system
 *
 * Features:
 * - Consent item CRUD operations
 * - User consent recording
 * - Consent withdrawal
 * - Consent history
 *
 * @version 0.9.0-dev
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { ConsentItem, UserConsent, Form, Submission } = require('../../models');
const logger = require('../../utils/logger.util');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.error('❌ Validation errors:', errors.array());
    logger.error('❌ Request body:', JSON.stringify(req.body, null, 2));
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

// ==========================================
// Consent Item Routes (Admin Only)
// ==========================================

/**
 * GET /api/v1/consents/forms/:formId/items
 * Get all consent items for a form
 */
router.get(
  '/forms/:formId/items',
  authenticate,
  [
    param('formId').isString().notEmpty().withMessage('Form ID is required')
  ],
  validate,
  async (req, res) => {
    try {
      const { formId } = req.params;

      // Check form access
      const form = await Form.findByPk(formId);
      if (!form) {
        return res.status(404).json({
          success: false,
          error: 'Form not found'
        });
      }

      // Check if user can access this form
      const canAccess = await form.canAccessByRole(req.user.role);
      if (!canAccess && req.user.role !== 'super_admin' && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Get consent items
      const items = await ConsentItem.findAllByForm(formId);

      res.json({
        success: true,
        data: items,
        count: items.length
      });
    } catch (error) {
      logger.error('Error fetching consent items:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /api/v1/consents/forms/:formId/items
 * Create a new consent item
 */
router.post(
  '/forms/:formId/items',
  authenticate,
  authorize('super_admin', 'admin'),
  [
    param('formId').isString().notEmpty().withMessage('Form ID is required'),
    body('titleTh').notEmpty().withMessage('Thai title is required'),
    body('titleEn').optional(),
    body('descriptionTh').optional(),
    body('descriptionEn').optional(),
    body('purpose').notEmpty().withMessage('Purpose is required'),
    body('retentionPeriod')
      .notEmpty().withMessage('Retention period is required')
      .default('3 ปี'),
    body('required').isBoolean().withMessage('Required must be boolean'),
    body('order').optional().isInt().withMessage('Order must be integer'),
    body('version').optional().isInt().withMessage('Version must be integer')
  ],
  validate,
  async (req, res) => {
    try {
      const { formId } = req.params;
      const {
        titleTh,
        titleEn,
        descriptionTh,
        descriptionEn,
        purpose,
        retentionPeriod,
        required,
        order,
        version
      } = req.body;

      // Check form exists
      const form = await Form.findByPk(formId);
      if (!form) {
        return res.status(404).json({
          success: false,
          error: 'Form not found'
        });
      }

      // Create consent item
      const consentItem = await ConsentItem.create({
        form_id: formId,
        title_th: titleTh,
        title_en: titleEn,
        description_th: descriptionTh,
        description_en: descriptionEn,
        purpose,
        retention_period: retentionPeriod,
        required: required || false,
        order: order || 0,
        version: version || 1,
        is_active: true
      });

      logger.info(`Consent item created: ${consentItem.id} for form ${formId}`);

      res.status(201).json({
        success: true,
        data: consentItem
      });
    } catch (error) {
      logger.error('Error creating consent item:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * PUT /api/v1/consents/items/:itemId
 * Update a consent item
 */
router.put(
  '/items/:itemId',
  authenticate,
  authorize('super_admin', 'admin'),
  [
    param('itemId').isUUID().withMessage('Invalid item ID'),
    body('titleTh').optional(),
    body('titleEn').optional(),
    body('descriptionTh').optional(),
    body('descriptionEn').optional(),
    body('purpose').optional(),
    body('retentionPeriod')
      .optional()
      .notEmpty().withMessage('Retention period cannot be empty if provided'),
    body('required').optional().isBoolean(),
    body('order').optional().isInt(),
    body('isActive').optional().isBoolean()
  ],
  validate,
  async (req, res) => {
    try {
      const { itemId } = req.params;
      const updates = req.body;

      const consentItem = await ConsentItem.findByPk(itemId);
      if (!consentItem) {
        return res.status(404).json({
          success: false,
          error: 'Consent item not found'
        });
      }

      // Convert camelCase to snake_case for model
      const dbUpdates = {};
      if (updates.titleTh !== undefined) dbUpdates.title_th = updates.titleTh;
      if (updates.titleEn !== undefined) dbUpdates.title_en = updates.titleEn;
      if (updates.descriptionTh !== undefined) dbUpdates.description_th = updates.descriptionTh;
      if (updates.descriptionEn !== undefined) dbUpdates.description_en = updates.descriptionEn;
      if (updates.purpose !== undefined) dbUpdates.purpose = updates.purpose;
      if (updates.retentionPeriod !== undefined) dbUpdates.retention_period = updates.retentionPeriod;
      if (updates.required !== undefined) dbUpdates.required = updates.required;
      if (updates.order !== undefined) dbUpdates.order = updates.order;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

      // Update item
      await consentItem.update(dbUpdates);

      logger.info(`Consent item updated: ${itemId}`);

      res.json({
        success: true,
        data: consentItem
      });
    } catch (error) {
      logger.error('Error updating consent item:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * DELETE /api/v1/consents/items/:itemId
 * Delete (deactivate) a consent item
 */
router.delete(
  '/items/:itemId',
  authenticate,
  authorize('super_admin', 'admin'),
  [
    param('itemId').isUUID().withMessage('Invalid item ID')
  ],
  validate,
  async (req, res) => {
    try {
      const { itemId } = req.params;

      const consentItem = await ConsentItem.findByPk(itemId);
      if (!consentItem) {
        return res.status(404).json({
          success: false,
          error: 'Consent item not found'
        });
      }

      // Soft delete (deactivate)
      await consentItem.update({ is_active: false });

      logger.info(`Consent item deactivated: ${itemId}`);

      res.json({
        success: true,
        message: 'Consent item deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting consent item:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// ==========================================
// User Consent Routes (Public + Admin)
// ==========================================

/**
 * POST /api/v1/consents/record
 * Record user consent from form submission
 */
router.post(
  '/record',
  [
    body('submissionId').isUUID().withMessage('Invalid submission ID'),
    body('consents').isArray().withMessage('Consents must be an array'),
    body('consents.*.consentItemId').isUUID().withMessage('Invalid consent item ID'),
    body('consents.*.consentGiven').isBoolean().withMessage('Consent given must be boolean'),
    body('userEmail').optional({ nullable: true }).isEmail().withMessage('Invalid email'),
    body('userPhone').optional({ nullable: true }),
    body('userFullName').optional({ nullable: true }),
    // ✅ v0.8.2: Add PDPA signature and privacy notice fields
    body('signatureData').optional({ nullable: true }),
    body('fullName').optional({ nullable: true }),
    body('privacyNoticeAccepted').optional({ nullable: true }).isBoolean(),
    body('privacyNoticeVersion').optional({ nullable: true })
  ],
  validate,
  async (req, res) => {
    try {
      const {
        submissionId,
        consents,
        userEmail,
        userPhone,
        userFullName,
        // ✅ v0.8.2: Extract PDPA fields
        signatureData,
        fullName,
        privacyNoticeAccepted,
        privacyNoticeVersion
      } = req.body;

      // Get submission and form
      const submission = await Submission.findByPk(submissionId, {
        include: [{ model: Form, as: 'form' }]
      });

      if (!submission) {
        return res.status(404).json({
          success: false,
          error: 'Submission not found'
        });
      }

      const formId = submission.form_id;

      // Get IP and user agent
      const ipAddress = req.headers['x-forwarded-for'] ||
                       req.connection.remoteAddress ||
                       req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      // Record each consent (idempotent: check before insert)
      const consentRecords = [];
      for (const consent of consents) {
        const consentItem = await ConsentItem.findByPk(consent.consentItemId);

        if (!consentItem) {
          logger.warn(`Consent item not found: ${consent.consentItemId}`);
          continue;
        }

        // ✅ v0.8.2: Check if consent record already exists (idempotency for retry attempts)
        let userConsent = await UserConsent.findOne({
          where: {
            submission_id: submissionId,
            consent_item_id: consent.consentItemId
          }
        });

        // If doesn't exist, create it
        if (!userConsent) {
          // ✅ v0.8.2: Use fullName from identity verification (not userFullName from form data)
          userConsent = await UserConsent.create({
            submission_id: submissionId,
            consent_item_id: consent.consentItemId,
            consent_given: consent.consentGiven,
            consented_at: new Date(),
            ip_address: ipAddress,
            user_agent: userAgent,
            form_id: formId,
            // ✅ v0.8.2: PDPA signature and identity verification
            signature_data: signatureData || null,
            full_name: fullName || userFullName || null,
            privacy_notice_accepted: privacyNoticeAccepted || false,
            privacy_notice_version: privacyNoticeVersion || null
          });
          logger.info(`Created new consent record: ${userConsent.id}`);
        } else {
          logger.info(`Consent record already exists: ${userConsent.id} (idempotent retry)`);
        }

        consentRecords.push(userConsent);
      }

      logger.info(`Recorded ${consentRecords.length} consents for submission ${submissionId}`);

      res.status(201).json({
        success: true,
        data: consentRecords,
        count: consentRecords.length
      });
    } catch (error) {
      logger.error('Error recording consent:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/v1/consents/submission/:submissionId
 * Get all consents for a submission
 */
router.get(
  '/submission/:submissionId',
  authenticate,
  [
    param('submissionId').isUUID().withMessage('Invalid submission ID')
  ],
  validate,
  async (req, res) => {
    try {
      const { submissionId } = req.params;

      const consents = await UserConsent.findBySubmission(submissionId);

      res.json({
        success: true,
        data: consents,
        count: consents.length
      });
    } catch (error) {
      logger.error('Error fetching submission consents:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/v1/consents/user
 * Get all consents for a user (by email or phone)
 */
router.get(
  '/user',
  authenticate,
  authorize('super_admin', 'admin'),
  [
    query('email').optional().isEmail().withMessage('Invalid email'),
    query('phone').optional()
  ],
  validate,
  async (req, res) => {
    try {
      const { email, phone } = req.query;

      if (!email && !phone) {
        return res.status(400).json({
          success: false,
          error: 'Email or phone is required'
        });
      }

      const consents = await UserConsent.findByUser(email, phone);

      res.json({
        success: true,
        data: consents,
        count: consents.length
      });
    } catch (error) {
      logger.error('Error fetching user consents:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /api/v1/consents/withdraw
 * Withdraw consent
 */
router.post(
  '/withdraw',
  authenticate,
  authorize('super_admin', 'admin'),
  [
    body('consentId').isUUID().withMessage('Invalid consent ID'),
    body('reason').optional()
  ],
  validate,
  async (req, res) => {
    try {
      const { consentId, reason } = req.body;

      const consent = await UserConsent.findByPk(consentId);
      if (!consent) {
        return res.status(404).json({
          success: false,
          error: 'Consent not found'
        });
      }

      // Withdraw consent
      await consent.withdraw(req.user.id, reason);

      logger.info(`Consent withdrawn: ${consentId} by ${req.user.id}`);

      res.json({
        success: true,
        data: consent
      });
    } catch (error) {
      logger.error('Error withdrawing consent:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// ==========================================
// Consent Management Routes (User Consent Records)
// ==========================================

/**
 * PUT /api/v1/consents/:id
 * Update user consent (change consent status with reason)
 */
router.put(
  '/:id',
  authenticate,
  authorize('super_admin', 'admin'),
  [
    param('id').isUUID().withMessage('Invalid consent ID'),
    body('consent_given').isBoolean().withMessage('consent_given must be boolean'),
    body('reason').isString().trim().isLength({ min: 10, max: 500 }).withMessage('Reason must be 10-500 characters'),
    body('legal_basis').optional().isString().trim().isLength({ max: 500 }).withMessage('Legal basis max 500 characters'),
    body('signature_data_url').optional().isString().withMessage('Invalid signature data')
  ],
  validate,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { consent_given, reason, legal_basis, signature_data_url } = req.body;

      // Find consent record
      const consent = await UserConsent.findByPk(id);
      if (!consent) {
        return res.status(404).json({
          success: false,
          error: 'Consent record not found'
        });
      }

      const ConsentHistoryService = require('../../services/ConsentHistoryService');

      // Determine action type
      const action = consent_given
        ? (consent.consent_given ? 'edited' : 'renewed')
        : 'withdrawn';

      // Record consent change in history (includes PDPAAuditLog)
      await ConsentHistoryService.recordConsentChange(
        {
          user_consent_id: id,
          profile_id: consent.profile_id,
          consent_item_id: consent.consent_item_id,
          action,
          old_status: consent.consent_given ? 'given' : 'withdrawn',
          new_status: consent_given ? 'given' : 'withdrawn',
          reason,
          legal_basis,
          signature_data_url
        },
        req.user,
        req
      );

      // Update consent record
      await consent.update({
        consent_given,
        withdrawn_at: consent_given ? null : new Date(),
        withdrawn_by: consent_given ? null : req.user.id
      });

      logger.info(`Consent updated: ${id} - ${action} by ${req.user.username}`);

      res.json({
        success: true,
        data: consent,
        message: `Consent ${action} successfully`
      });
    } catch (error) {
      logger.error('Error updating consent:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/v1/consents/:id/history
 * Get consent change history with pagination
 */
router.get(
  '/:id/history',
  authenticate,
  [
    param('id').isUUID().withMessage('Invalid consent ID'),
    query('action').optional().isIn(['given', 'withdrawn', 'edited', 'renewed', 'expired']).withMessage('Invalid action type'),
    query('page').optional().isInt({ min: 1 }).toInt().withMessage('Invalid page number'),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('Invalid limit')
  ],
  validate,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { action, page, limit } = req.query;

      // Verify consent exists
      const consent = await UserConsent.findByPk(id);
      if (!consent) {
        return res.status(404).json({
          success: false,
          error: 'Consent record not found'
        });
      }

      const ConsentHistoryService = require('../../services/ConsentHistoryService');

      // Get consent history
      const history = await ConsentHistoryService.getConsentHistory(id, {
        action,
        page: page || 1,
        limit: limit || 20
      });

      res.json({
        success: true,
        ...history // Contains data and pagination
      });
    } catch (error) {
      logger.error('Error getting consent history:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /api/v1/consents/:id/withdraw
 * Withdraw a specific consent (convenience endpoint)
 */
router.post(
  '/:id/withdraw',
  authenticate,
  authorize('super_admin', 'admin'),
  [
    param('id').isUUID().withMessage('Invalid consent ID'),
    body('reason').isString().trim().isLength({ min: 10, max: 500 }).withMessage('Reason must be 10-500 characters'),
    body('signature_data_url').isString().withMessage('Signature is required for withdrawal')
  ],
  validate,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reason, signature_data_url } = req.body;

      // Find consent record
      const consent = await UserConsent.findByPk(id);
      if (!consent) {
        return res.status(404).json({
          success: false,
          error: 'Consent record not found'
        });
      }

      if (!consent.consent_given) {
        return res.status(400).json({
          success: false,
          error: 'Consent already withdrawn'
        });
      }

      const ConsentHistoryService = require('../../services/ConsentHistoryService');

      // Record consent withdrawal in history (includes PDPAAuditLog)
      await ConsentHistoryService.recordConsentChange(
        {
          user_consent_id: id,
          profile_id: consent.profile_id,
          consent_item_id: consent.consent_item_id,
          action: 'withdrawn',
          old_status: 'given',
          new_status: 'withdrawn',
          reason,
          legal_basis: 'PDPA Section 19: Right to withdraw consent',
          signature_data_url
        },
        req.user,
        req
      );

      // Update consent record
      await consent.update({
        consent_given: false,
        withdrawn_at: new Date(),
        withdrawn_by: req.user.id
      });

      logger.info(`Consent withdrawn: ${id} by ${req.user.username}`);

      res.json({
        success: true,
        data: consent,
        message: 'Consent withdrawn successfully'
      });
    } catch (error) {
      logger.error('Error withdrawing consent:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/v1/consents/statistics
 * Get consent statistics (admin only)
 */
router.get(
  '/statistics',
  authenticate,
  authorize('super_admin', 'admin'),
  async (req, res) => {
    try {
      const stats = await UserConsent.getStatistics();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error fetching consent statistics:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

module.exports = router;
