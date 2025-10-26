/**
 * Personal Data Management Routes
 * API endpoints for Personal Data Management Dashboard (PDPA/GDPR compliance)
 *
 * Features:
 * - Dashboard statistics for PDPA compliance monitoring
 * - List and search unified user profiles (data subjects)
 * - Get detailed profile with submissions, consents, PII, DSR requests
 * - Export user data (GDPR Article 20 - Right to Data Portability)
 * - Merge duplicate profiles with audit trail
 * - Find potential duplicate profiles using matching algorithms
 *
 * Security:
 * - Read operations: super_admin, admin
 * - Merge operations: super_admin only (destructive)
 * - All endpoints require authentication
 * - Input validation with express-validator
 * - Comprehensive error handling
 *
 * @version v0.8.2-dev
 * @date 2025-10-24
 */

const express = require('express');
const router = express.Router();
const { param, query, body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const UnifiedUserProfileService = require('../../services/UnifiedUserProfileService');
const DataRetentionService = require('../../services/DataRetentionService');
const DSRActionService = require('../../services/DSRActionService');
const logger = require('../../utils/logger.util');
const { Op } = require('sequelize');
const { User, DSRRequest, sequelize } = require('../../models');
const { generateDSRNumber } = require('../../utils/dsr-number-generator');

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Validation error handler
 * Returns 400 Bad Request with validation errors
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.error('Validation errors in personal data routes:', errors.array());
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// ============================================================================
// DASHBOARD ROUTES
// ============================================================================

/**
 * GET /api/v1/personal-data/dashboard-stats
 * Get dashboard statistics for PDPA compliance monitoring
 *
 * @access super_admin, admin
 * @returns {Object} Dashboard statistics
 *
 * Response example:
 * {
 *   "success": true,
 *   "data": {
 *     "dataSubjects": 1250,
 *     "consents": {
 *       "total": 3500,
 *       "given": 3200,
 *       "denied": 300,
 *       "complianceRate": "91.43"
 *     },
 *     "dsrRequests": {
 *       "pending": 5,
 *       "overdue": 2
 *     },
 *     "dataRetention": {
 *       "toDelete": 0
 *     },
 *     "activity": {
 *       "recentSubmissions": 450,
 *       "formsWithConsents": 12,
 *       "sensitiveFields": 45
 *     }
 *   }
 * }
 */
router.get(
  '/dashboard-stats',
  authenticate,
  authorize('super_admin', 'admin'),
  async (req, res) => {
    try {
      const stats = await UnifiedUserProfileService.getDashboardStats();

      logger.info(`Dashboard stats retrieved by ${req.user.username} (${req.userRole})`);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error fetching dashboard stats:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve dashboard statistics'
      });
    }
  }
);

// ============================================================================
// PROFILE LISTING & SEARCH ROUTES
// ============================================================================

/**
 * GET /api/v1/personal-data/profiles
 * List all unified user profiles with pagination and search
 *
 * @access super_admin, admin
 * @query {number} page - Page number (1-indexed, default: 1)
 * @query {number} limit - Items per page (1-100, default: 20)
 * @query {string} search - Search by email, phone, or name (optional, max 255 chars)
 * @query {string} sortBy - Sort field (default: last_submission_date)
 * @query {string} sortOrder - Sort order (ASC|DESC, default: DESC)
 * @returns {Object} Paginated profiles list
 *
 * Response example:
 * {
 *   "success": true,
 *   "data": {
 *     "profiles": [...],
 *     "total": 1250,
 *     "totalPages": 63,
 *     "page": 1,
 *     "limit": 20
 *   }
 * }
 */
router.get(
  '/profiles',
  authenticate,
  authorize('super_admin', 'admin'),
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('search')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Search term must not exceed 255 characters'),
    query('sortBy')
      .optional()
      .isIn([
        'total_submissions',
        'last_submission_date',
        'first_submission_date',
        'created_at',
        'updated_at',
        'primary_email',
        'full_name'
      ])
      .withMessage('Invalid sort field'),
    query('sortOrder')
      .optional()
      .isIn(['ASC', 'DESC', 'asc', 'desc'])
      .withMessage('Sort order must be ASC or DESC')
  ],
  validate,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        search = null,
        sortBy = 'last_submission_date',
        sortOrder = 'DESC'
      } = req.query;

      const result = await UnifiedUserProfileService.getAllProfiles({
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        search,
        sortBy,
        sortOrder: sortOrder.toUpperCase()
      });

      logger.info(
        `Profiles list retrieved by ${req.user.username}: ` +
        `page=${result.page}, limit=${result.limit}, total=${result.total}` +
        (search ? `, search="${search}"` : '')
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error fetching profiles list:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve profiles'
      });
    }
  }
);

// ============================================================================
// PROFILE DETAIL ROUTES
// ============================================================================

/**
 * GET /api/v1/personal-data/profiles/:profileId
 * Get detailed profile with all related data
 *
 * @access super_admin, admin
 * @param {string} profileId - UUID of the profile
 * @returns {Object} Comprehensive profile object
 *
 * Response includes:
 * - Profile information (emails, phones, names)
 * - All submissions with form details
 * - All consents with consent items
 * - Personal data fields from submitted forms
 * - DSR requests (access, deletion, etc.)
 * - Statistics (compliance, PII count, etc.)
 */
router.get(
  '/profiles/:profileId',
  authenticate,
  authorize('super_admin', 'admin'),
  [
    param('profileId')
      .isUUID()
      .withMessage('Profile ID must be a valid UUID')
  ],
  validate,
  async (req, res) => {
    try {
      const { profileId } = req.params;

      const profile = await UnifiedUserProfileService.getProfileDetail(profileId);

      logger.info(
        `Profile detail retrieved by ${req.user.username}: ` +
        `profileId=${profileId}, submissions=${profile.submissions.length}`
      );

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      // Check if profile not found
      if (error.message && error.message.includes('not found')) {
        logger.warn(`Profile not found: ${req.params.profileId}`);
        return res.status(404).json({
          success: false,
          error: 'Profile not found'
        });
      }

      logger.error(`Error fetching profile detail for ${req.params.profileId}:`, error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve profile details'
      });
    }
  }
);

/**
 * GET /api/v1/personal-data/profiles/:profileId/forms
 * Get list of forms for a profile (for DSR submission)
 * v0.8.7-dev: Used in DSR request form to show which forms the data subject has submitted
 *
 * @access super_admin, admin
 * @param {string} profileId - UUID of the profile
 * @returns {Array} Array of forms with submission counts
 *
 * Response format:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "formId": "uuid",
 *       "formTitle": "ฟอร์มทดสอบ",
 *       "submissionCount": 3,
 *       "lastSubmissionDate": "2025-10-24T10:30:00Z",
 *       "hasConsents": true,
 *       "hasPII": true
 *     }
 *   ]
 * }
 */
router.get(
  '/profiles/:profileId/forms',
  authenticate,
  authorize('super_admin', 'admin'),
  [
    param('profileId')
      .isUUID()
      .withMessage('Profile ID must be a valid UUID')
  ],
  validate,
  async (req, res) => {
    try {
      const { profileId } = req.params;

      const forms = await UnifiedUserProfileService.getProfileForms(profileId);

      logger.info(
        `Profile forms retrieved by ${req.user.username}: ` +
        `profileId=${profileId}, forms=${forms.length}`
      );

      res.json({
        success: true,
        data: forms
      });
    } catch (error) {
      // Check if profile not found
      if (error.message && error.message.includes('not found')) {
        logger.warn(`Profile not found: ${req.params.profileId}`);
        return res.status(404).json({
          success: false,
          error: 'Profile not found'
        });
      }

      logger.error(`Error fetching forms for profile ${req.params.profileId}:`, error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve profile forms'
      });
    }
  }
);

// ============================================================================
// DATA EXPORT ROUTES (GDPR/PDPA Article 20)
// ============================================================================

/**
 * GET /api/v1/personal-data/profiles/:profileId/export
 * Export user data for GDPR/PDPA compliance (Right to Data Portability)
 *
 * @access super_admin, admin
 * @param {string} profileId - UUID of the profile
 * @query {string} format - Export format (json|csv, default: json)
 * @returns {Object} Formatted data ready for download
 *
 * Response includes:
 * - Export metadata (date, version, format)
 * - Personal information (emails, phones, names)
 * - All submissions data
 * - All consents with signature data
 * - Personal data fields
 * - DSR requests history
 * - Statistics
 */
router.get(
  '/profiles/:profileId/export',
  authenticate,
  authorize('super_admin', 'admin'),
  [
    param('profileId')
      .isUUID()
      .withMessage('Profile ID must be a valid UUID'),
    query('format')
      .optional()
      .isIn(['json', 'csv'])
      .withMessage('Format must be json or csv')
  ],
  validate,
  async (req, res) => {
    try {
      const { profileId } = req.params;
      const { format = 'json' } = req.query;

      const exportData = await UnifiedUserProfileService.exportUserData(profileId, format);

      // Set response headers for download
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `user-data-export-${profileId}-${timestamp}.${format}`;

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      logger.info(
        `Data export performed by ${req.user.username}: ` +
        `profileId=${profileId}, format=${format}`
      );

      // Log audit trail for export
      logger.logAudit(
        'EXPORT_USER_DATA',
        req.userId,
        'UnifiedUserProfile',
        profileId,
        { format },
        { exportedBy: req.user.username }
      );

      res.json({
        success: true,
        data: exportData
      });
    } catch (error) {
      // Check if profile not found
      if (error.message && error.message.includes('not found')) {
        logger.warn(`Profile not found for export: ${req.params.profileId}`);
        return res.status(404).json({
          success: false,
          error: 'Profile not found'
        });
      }

      // Check if format not supported
      if (error.message && error.message.includes('format')) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      logger.error(`Error exporting user data for ${req.params.profileId}:`, error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to export user data'
      });
    }
  }
);

// ============================================================================
// DUPLICATE DETECTION ROUTES
// ============================================================================

/**
 * GET /api/v1/personal-data/duplicates
 * Find potential duplicate profiles using matching algorithms
 *
 * @access super_admin, admin
 * @query {number} minConfidence - Minimum confidence score (0-100, default: 70)
 * @query {number} minSubmissions - Minimum submissions to consider (default: 1)
 * @query {number} limit - Maximum duplicate groups to return (max: 50, default: 50)
 * @returns {Array} Array of duplicate groups with confidence scores
 *
 * Response example:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "confidence": 90,
 *       "matchReasons": ["Exact email match", "Exact phone match"],
 *       "profiles": [profile1, profile2]
 *     }
 *   ],
 *   "count": 15
 * }
 */
router.get(
  '/duplicates',
  authenticate,
  authorize('super_admin', 'admin'),
  [
    query('minConfidence')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Minimum confidence must be between 0 and 100'),
    query('minSubmissions')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Minimum submissions must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ],
  validate,
  async (req, res) => {
    try {
      const {
        minConfidence = 70,
        minSubmissions = 1,
        limit = 50
      } = req.query;

      const duplicates = await UnifiedUserProfileService.findPotentialDuplicates({
        minConfidence: parseInt(minConfidence, 10),
        minSubmissions: parseInt(minSubmissions, 10),
        limit: parseInt(limit, 10)
      });

      logger.info(
        `Duplicate detection performed by ${req.user.username}: ` +
        `minConfidence=${minConfidence}, found=${duplicates.length} groups`
      );

      res.json({
        success: true,
        data: duplicates,
        count: duplicates.length
      });
    } catch (error) {
      logger.error('Error finding potential duplicates:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to find potential duplicates'
      });
    }
  }
);

// ============================================================================
// PROFILE MERGE ROUTES (SUPER ADMIN ONLY)
// ============================================================================

/**
 * POST /api/v1/personal-data/profiles/:primaryId/merge
 * Merge duplicate profiles into a primary profile
 *
 * @access super_admin only (destructive operation)
 * @param {string} primaryId - UUID of the primary profile to keep
 * @body {string[]} duplicateIds - Array of duplicate profile UUIDs to merge (1-10 items)
 * @returns {Object} Updated primary profile with merged data
 *
 * Request body example:
 * {
 *   "duplicateIds": [
 *     "550e8400-e29b-41d4-a716-446655440001",
 *     "550e8400-e29b-41d4-a716-446655440002"
 *   ]
 * }
 *
 * Effects:
 * - Merges emails, phones, names, submissions, forms
 * - Updates date ranges (first/last submission)
 * - Tracks merge in merged_from_ids array
 * - Creates audit trail
 * - Deletes duplicate profiles (hard delete)
 */
router.post(
  '/profiles/:primaryId/merge',
  authenticate,
  authorize('super_admin'), // Only super_admin can merge (destructive operation)
  [
    param('primaryId')
      .isUUID()
      .withMessage('Primary profile ID must be a valid UUID'),
    body('duplicateIds')
      .isArray({ min: 1, max: 10 })
      .withMessage('duplicateIds must be an array with 1-10 items'),
    body('duplicateIds.*')
      .isUUID()
      .withMessage('Each duplicate ID must be a valid UUID')
  ],
  validate,
  async (req, res) => {
    try {
      const { primaryId } = req.params;
      const { duplicateIds } = req.body;

      // Security check: prevent merging into itself
      if (duplicateIds.includes(primaryId)) {
        return res.status(400).json({
          success: false,
          error: 'Cannot merge profile into itself'
        });
      }

      // Security check: prevent duplicate IDs in array
      const uniqueIds = [...new Set(duplicateIds)];
      if (uniqueIds.length !== duplicateIds.length) {
        return res.status(400).json({
          success: false,
          error: 'Duplicate IDs found in duplicateIds array'
        });
      }

      const mergedProfile = await UnifiedUserProfileService.mergeDuplicateProfiles(
        primaryId,
        duplicateIds
      );

      logger.info(
        `Profile merge completed by ${req.user.username}: ` +
        `primaryId=${primaryId}, merged=${duplicateIds.length} profiles`
      );

      // Create audit trail for critical operation
      logger.logAudit(
        'MERGE_USER_PROFILES',
        req.userId,
        'UnifiedUserProfile',
        primaryId,
        { duplicateIds },
        {
          mergedBy: req.user.username,
          mergedCount: duplicateIds.length,
          totalSubmissions: mergedProfile.statistics.totalSubmissions
        }
      );

      res.json({
        success: true,
        data: mergedProfile,
        message: `Successfully merged ${duplicateIds.length} duplicate profile(s) into primary profile`
      });
    } catch (error) {
      // Check if profile not found
      if (error.message && error.message.includes('not found')) {
        logger.warn(`Profile not found for merge: ${error.message}`);
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      // Check if validation error
      if (error.message && error.message.includes('must be')) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      logger.error(`Error merging profiles into ${req.params.primaryId}:`, error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to merge profiles'
      });
    }
  }
);

// ============================================================================
// DATA RETENTION ROUTES
// ============================================================================

/**
 * GET /api/v1/personal-data/retention/expired
 * Get list of expired data that should be deleted
 *
 * @access super_admin, admin
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 50, max: 100)
 * @query {string} category - Filter by category (all|consents|submissions)
 * @returns {Object} List of expired data with pagination
 */
router.get(
  '/retention/expired',
  authenticate,
  authorize('super_admin', 'admin'),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('category').optional().isIn(['all', 'consents', 'submissions']).withMessage('Invalid category')
  ],
  validate,
  async (req, res) => {
    try {
      const { page = 1, limit = 50, category = 'all' } = req.query;

      const result = await DataRetentionService.getExpiredData({
        page: parseInt(page),
        limit: parseInt(limit),
        category
      });

      logger.info(`Expired data list retrieved by ${req.user.username}: ${result.total} items`);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error retrieving expired data:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve expired data'
      });
    }
  }
);

/**
 * POST /api/v1/personal-data/retention/delete
 * Delete expired data (soft delete by default)
 *
 * @access super_admin only (destructive operation)
 * @body {string[]} dataIds - Array of data IDs to delete
 * @body {string} category - Category (consents|submissions|all)
 * @body {string} reason - Reason for deletion
 * @body {boolean} hardDelete - Use hard delete (default: false)
 * @returns {Object} Deletion result with counts
 */
router.post(
  '/retention/delete',
  authenticate,
  authorize('super_admin'),
  [
    body('dataIds').isArray({ min: 1, max: 100 }).withMessage('dataIds must be an array with 1-100 items'),
    body('dataIds.*').isUUID().withMessage('Each data ID must be a valid UUID'),
    body('category').isIn(['consents', 'submissions', 'all']).withMessage('Invalid category'),
    body('reason').trim().isLength({ min: 5, max: 500 }).withMessage('Reason must be 5-500 characters'),
    body('hardDelete').optional().isBoolean().withMessage('hardDelete must be boolean')
  ],
  validate,
  async (req, res) => {
    try {
      const { dataIds, category, reason, hardDelete = false } = req.body;

      logger.info(`Deleting expired data: ${dataIds.length} items by ${req.user.username}`);

      const result = await DataRetentionService.deleteExpiredData({
        dataIds,
        category,
        reason,
        deletedBy: req.userId,
        hardDelete
      });

      logger.info(`Deletion completed: ${result.deleted} deleted, ${result.failed.length} failed`);

      res.json({
        success: true,
        deleted: result.deleted,
        failed: result.failed,
        message: `Successfully deleted ${result.deleted} item(s)`
      });
    } catch (error) {
      logger.error('Error deleting expired data:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete expired data'
      });
    }
  }
);

/**
 * GET /api/v1/personal-data/retention/report
 * Get data retention compliance report
 *
 * @access super_admin, admin
 * @query {string} startDate - Report start date (ISO 8601)
 * @query {string} endDate - Report end date (ISO 8601)
 * @returns {Object} Retention compliance report
 */
router.get(
  '/retention/report',
  authenticate,
  authorize('super_admin', 'admin'),
  [
    query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date format')
  ],
  validate,
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const report = await DataRetentionService.getRetentionReport({
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined
      });

      logger.info(`Retention report generated by ${req.user.username}`);

      res.json({
        success: true,
        report
      });
    } catch (error) {
      logger.error('Error generating retention report:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate retention report'
      });
    }
  }
);

/**
 * POST /api/v1/personal-data/retention/schedule
 * Schedule automatic deletion (with dry-run mode)
 *
 * @access super_admin only
 * @body {string} category - Category to delete (all|consents|submissions)
 * @body {boolean} dryRun - Dry run mode (default: true)
 * @returns {Object} Summary of scheduled deletion
 */
router.post(
  '/retention/schedule',
  authenticate,
  authorize('super_admin'),
  [
    body('category').isIn(['all', 'consents', 'submissions']).withMessage('Invalid category'),
    body('dryRun').optional().isBoolean().withMessage('dryRun must be boolean')
  ],
  validate,
  async (req, res) => {
    try {
      const { category = 'all', dryRun = true } = req.body;

      logger.info(`Scheduled deletion: category=${category}, dryRun=${dryRun}, by ${req.user.username}`);

      const result = await DataRetentionService.scheduleAutoDeletion({
        category,
        dryRun,
        deletedBy: dryRun ? null : req.userId
      });

      logger.info(`Scheduled deletion completed: ${result.deleted.total} deleted (dry-run: ${dryRun})`);

      res.json({
        success: true,
        summary: result,
        message: dryRun
          ? `Dry run: Would delete ${result.expired.total} item(s)`
          : `Deleted ${result.deleted.total} item(s)`
      });
    } catch (error) {
      logger.error('Error in scheduled deletion:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to execute scheduled deletion'
      });
    }
  }
);

// ============================================================================
// DSR (DATA SUBJECT RIGHTS) REQUEST ROUTES
// ============================================================================

/**
 * POST /api/v1/personal-data/profiles/:profileId/dsr-requests
 * Create a new DSR request for a profile
 *
 * @access super_admin, admin
 * @param {string} profileId - UUID of the profile
 * @body {string} requestType - Type of DSR request (access|rectification|erasure|portability|restriction|objection)
 * @body {string} userIdentifier - Email or phone to identify the user
 * @body {Object} requestDetails - Additional details about the request
 * @body {string} reason - Reason for the request (optional)
 * @returns {Object} Created DSR request
 *
 * Request body example:
 * {
 *   "requestType": "erasure",
 *   "userIdentifier": "user@example.com",
 *   "requestDetails": {
 *     "reason": "ขอลบข้อมูลทั้งหมด",
 *     "specificForms": ["form-id-1", "form-id-2"],
 *     "specificFields": ["email", "phone"]
 *   },
 *   "ipAddress": "127.0.0.1",
 *   "userAgent": "Mozilla/5.0..."
 * }
 */
router.post(
  '/profiles/:profileId/dsr-requests',
  authenticate,
  authorize('super_admin', 'admin'),
  [
    param('profileId')
      .isUUID()
      .withMessage('Profile ID must be a valid UUID'),
    body('requestType')
      .isIn(['access', 'rectification', 'erasure', 'portability', 'restriction', 'objection'])
      .withMessage('Invalid request type'),
    body('userIdentifier')
      .trim()
      .notEmpty()
      .withMessage('User identifier is required'),
    body('requestDetails')
      .isObject()
      .withMessage('Request details must be an object'),
    body('ipAddress')
      .optional(),
    body('userAgent')
      .optional()
  ],
  validate,
  async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
      const { profileId } = req.params;
      const { requestType, userIdentifier, requestDetails, ipAddress, userAgent } = req.body;

      // Verify profile exists
      const profile = await UnifiedUserProfileService.getProfileDetail(profileId);
      if (!profile) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: 'Profile not found'
        });
      }

      // v0.8.7-dev: Generate unique DSR number (DSR-YYYYMMDD-XXXX)
      const dsrNumber = await generateDSRNumber(transaction);

      // Extract affected forms from request details (if provided)
      const affectedForms = requestDetails.specificForms || [];

      // Create DSR request
      const dsrRequest = await DSRRequest.create({
        profile_id: profileId,
        request_type: requestType,
        user_identifier: userIdentifier,
        request_details: requestDetails,
        status: 'pending',
        ip_address: ipAddress || req.ip,
        user_agent: userAgent || req.get('user-agent'),
        verification_method: 'manual_verification', // Admin creating on behalf of user
        verified_at: new Date(), // Auto-verified since admin is creating
        dsr_number: dsrNumber, // v0.8.7-dev: Unique DSR identifier
        affected_forms: affectedForms // v0.8.7-dev: Track which forms are affected
      }, { transaction });

      await transaction.commit();

      logger.info(
        `DSR request created by ${req.user.username}: ` +
        `dsrNumber=${dsrNumber}, type=${requestType}, profileId=${profileId}, requestId=${dsrRequest.id}`
      );

      res.status(201).json({
        success: true,
        data: dsrRequest,
        message: 'DSR request created successfully'
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error creating DSR request:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create DSR request'
      });
    }
  }
);

/**
 * GET /api/v1/personal-data/profiles/:profileId/dsr-requests
 * Get all DSR requests for a specific profile
 *
 * @access super_admin, admin
 * @param {string} profileId - UUID of the profile
 * @query {string} status - Filter by status (pending|in_progress|completed|rejected|cancelled)
 * @query {string} requestType - Filter by request type
 * @returns {Array} List of DSR requests
 */
router.get(
  '/profiles/:profileId/dsr-requests',
  authenticate,
  authorize('super_admin', 'admin'),
  [
    param('profileId')
      .isUUID()
      .withMessage('Profile ID must be a valid UUID'),
    query('status')
      .optional()
      .isIn(['pending', 'in_progress', 'completed', 'rejected', 'cancelled'])
      .withMessage('Invalid status'),
    query('requestType')
      .optional()
      .isIn(['access', 'rectification', 'erasure', 'portability', 'restriction', 'objection'])
      .withMessage('Invalid request type')
  ],
  validate,
  async (req, res) => {
    try {
      const { profileId } = req.params;
      const { status, requestType } = req.query;

      // Verify profile exists
      const profile = await UnifiedUserProfileService.getProfileDetail(profileId);
      if (!profile) {
        return res.status(404).json({
          success: false,
          error: 'Profile not found'
        });
      }

      // ✅ v0.8.7-dev: Build where clause using profile_id directly
      // This is simpler and more reliable than matching user_identifier
      const where = {
        profile_id: profileId
      };

      if (status) where.status = status;
      if (requestType) where.request_type = requestType;

      // Get DSR requests
      const requests = await DSRRequest.findAll({
        where,
        include: [
          {
            model: User,
            as: 'processor',
            attributes: ['id', 'username', 'email', 'role']
          }
        ],
        order: [['created_at', 'DESC']]
      });

      logger.info(
        `DSR requests retrieved for profile ${profileId}: ` +
        `${requests.length} requests found`
      );

      res.json({
        success: true,
        data: requests,
        count: requests.length
      });
    } catch (error) {
      logger.error(`Error fetching DSR requests for profile ${req.params.profileId}:`, error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve DSR requests'
      });
    }
  }
);

/**
 * GET /api/v1/personal-data/dsr-requests
 * Get all DSR requests with filtering and pagination
 *
 * @access super_admin, admin
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 20, max: 100)
 * @query {string} status - Filter by status
 * @query {string} requestType - Filter by request type
 * @query {boolean} overdue - Filter overdue requests only
 * @returns {Object} Paginated list of DSR requests
 */
router.get(
  '/dsr-requests',
  authenticate,
  authorize('super_admin', 'admin'),
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('status')
      .optional()
      .isIn(['pending', 'in_progress', 'completed', 'rejected', 'cancelled'])
      .withMessage('Invalid status'),
    query('requestType')
      .optional()
      .isIn(['access', 'rectification', 'erasure', 'portability', 'restriction', 'objection'])
      .withMessage('Invalid request type'),
    query('overdue')
      .optional()
      .isBoolean()
      .withMessage('Overdue must be boolean')
  ],
  validate,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        requestType,
        overdue
      } = req.query;

      const validPage = Math.max(1, parseInt(page, 10));
      const validLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
      const offset = (validPage - 1) * validLimit;

      // Build where clause
      const where = {};
      if (status) where.status = status;
      if (requestType) where.request_type = requestType;
      if (overdue === 'true' || overdue === true) {
        where.deadline_date = { [Op.lt]: new Date() };
        where.status = { [Op.notIn]: ['completed', 'rejected', 'cancelled'] };
      }

      // Query DSR requests
      const { count, rows } = await DSRRequest.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'processor',
            attributes: ['id', 'username', 'email', 'role']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: validLimit,
        offset
      });

      const totalPages = Math.ceil(count / validLimit);

      logger.info(
        `DSR requests list retrieved by ${req.user.username}: ` +
        `page=${validPage}, total=${count}`
      );

      res.json({
        success: true,
        data: {
          requests: rows,
          total: count,
          totalPages,
          page: validPage,
          limit: validLimit
        }
      });
    } catch (error) {
      logger.error('Error fetching DSR requests:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve DSR requests'
      });
    }
  }
);

/**
 * GET /api/v1/personal-data/dsr-requests/stats
 * Get DSR request statistics
 *
 * @access super_admin, admin
 * @returns {Object} DSR statistics
 *
 * Response includes:
 * - Total requests by type
 * - Total requests by status
 * - Overdue count
 * - Average processing time
 * - Compliance metrics
 */
router.get(
  '/dsr-requests/stats',
  authenticate,
  authorize('super_admin', 'admin'),
  async (req, res) => {
    try {
      const stats = await DSRRequest.getStatistics();

      logger.info(`DSR statistics retrieved by ${req.user.username}`);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error fetching DSR statistics:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve DSR statistics'
      });
    }
  }
);

/**
 * GET /api/v1/personal-data/dsr-requests/:requestId
 * Get a specific DSR request by ID
 *
 * @access super_admin, admin
 * @param {string} requestId - UUID of the DSR request
 * @returns {Object} DSR request details
 */
router.get(
  '/dsr-requests/:requestId',
  authenticate,
  authorize('super_admin', 'admin'),
  [
    param('requestId')
      .isUUID()
      .withMessage('Request ID must be a valid UUID')
  ],
  validate,
  async (req, res) => {
    try {
      const { requestId } = req.params;

      const request = await DSRRequest.findByPk(requestId, {
        include: [
          {
            model: User,
            as: 'processor',
            attributes: ['id', 'username', 'email', 'role']
          }
        ]
      });

      if (!request) {
        return res.status(404).json({
          success: false,
          error: 'DSR request not found'
        });
      }

      logger.info(`DSR request ${requestId} retrieved by ${req.user.username}`);

      res.json({
        success: true,
        data: request
      });
    } catch (error) {
      logger.error(`Error fetching DSR request ${req.params.requestId}:`, error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve DSR request'
      });
    }
  }
);

/**
 * PUT /api/v1/personal-data/dsr-requests/:requestId/status
 * Update DSR request status with tracking
 *
 * @access super_admin, admin
 * @param {string} requestId - UUID of the DSR request
 * @body {string} status - New status (in_progress|completed|rejected|cancelled)
 * @body {string} note - Note about the status change
 * @body {Object} responseData - Response data (for completed requests)
 * @body {string} responseNotes - Additional notes
 * @returns {Object} Updated DSR request
 *
 * Request body example:
 * {
 *   "status": "completed",
 *   "note": "Data exported and sent to user",
 *   "responseData": {
 *     "exportedAt": "2025-10-24T10:00:00Z",
 *     "filesGenerated": ["export-data.json"]
 *   },
 *   "responseNotes": "All data exported successfully"
 * }
 */
router.put(
  '/dsr-requests/:requestId/status',
  authenticate,
  authorize('super_admin', 'admin'),
  [
    param('requestId')
      .isUUID()
      .withMessage('Request ID must be a valid UUID'),
    body('status')
      .isIn(['in_progress', 'completed', 'rejected', 'cancelled'])
      .withMessage('Invalid status'),
    body('note')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Note must not exceed 1000 characters'),
    body('responseData')
      .optional()
      .isObject()
      .withMessage('Response data must be an object'),
    body('responseNotes')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Response notes must not exceed 2000 characters')
  ],
  validate,
  async (req, res) => {
    try {
      const { requestId } = req.params;
      const { status, note, responseData, responseNotes, justification } = req.body;

      // Use DSRActionService for status update with action tracking
      const updatedRequest = await DSRActionService.updateRequestStatus(
        requestId,
        {
          status,
          notes: note,
          justification,
          responseData,
          responseNotes
        },
        req.user,
        req
      );

      logger.info(
        `DSR request ${requestId} status updated to ${status} by ${req.user.username}`
      );

      res.json({
        success: true,
        data: updatedRequest,
        message: `DSR request status updated to ${status}`
      });
    } catch (error) {
      // Handle status transition errors
      if (error.message && error.message.includes('Invalid status transition')) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      logger.error(`Error updating DSR request ${req.params.requestId}:`, error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update DSR request'
      });
    }
  }
);

/**
 * GET /api/v1/personal-data/dsr-requests/:requestId/actions
 * Get action timeline for a DSR request
 *
 * @access super_admin, admin
 * @param {string} requestId - UUID of the DSR request
 * @returns {Array} Action history in chronological order
 *
 * Response example:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "uuid",
 *       "actionType": "in_progress",
 *       "oldStatus": "pending",
 *       "newStatus": "in_progress",
 *       "performedByUsername": "admin",
 *       "notes": "Started processing request",
 *       "createdAt": "2025-10-24T10:00:00Z"
 *     }
 *   ]
 * }
 */
router.get(
  '/dsr-requests/:requestId/actions',
  authenticate,
  authorize('super_admin', 'admin'),
  [
    param('requestId')
      .isUUID()
      .withMessage('Request ID must be a valid UUID')
  ],
  validate,
  async (req, res) => {
    try {
      const { requestId } = req.params;

      // Verify DSR request exists
      const request = await DSRRequest.findByPk(requestId);
      if (!request) {
        return res.status(404).json({
          success: false,
          error: 'DSR request not found'
        });
      }

      // Get action timeline
      const actions = await DSRActionService.getActionTimeline(requestId);

      logger.info(
        `DSR action timeline retrieved by ${req.user.username}: ` +
        `requestId=${requestId}, actions=${actions.length}`
      );

      res.json({
        success: true,
        data: actions
      });
    } catch (error) {
      logger.error(`Error fetching DSR action timeline for ${req.params.requestId}:`, error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve action timeline'
      });
    }
  }
);

/**
 * POST /api/v1/personal-data/dsr-requests/:requestId/comments
 * Add a comment to a DSR request
 *
 * @access super_admin, admin
 * @param {string} requestId - UUID of the DSR request
 * @body {string} comment - Comment text (1-2000 characters)
 * @returns {Object} Created action record
 *
 * Request body example:
 * {
 *   "comment": "Contacted user to verify identity before proceeding with data export."
 * }
 */
router.post(
  '/dsr-requests/:requestId/comments',
  authenticate,
  authorize('super_admin', 'admin'),
  [
    param('requestId')
      .isUUID()
      .withMessage('Request ID must be a valid UUID'),
    body('comment')
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage('Comment must be 1-2000 characters')
  ],
  validate,
  async (req, res) => {
    try {
      const { requestId } = req.params;
      const { comment } = req.body;

      // Verify DSR request exists
      const request = await DSRRequest.findByPk(requestId);
      if (!request) {
        return res.status(404).json({
          success: false,
          error: 'DSR request not found'
        });
      }

      // Add comment using DSRActionService
      const action = await DSRActionService.addComment(
        requestId,
        comment,
        req.user,
        req
      );

      logger.info(
        `Comment added to DSR request ${requestId} by ${req.user.username}`
      );

      res.status(201).json({
        success: true,
        data: action,
        message: 'Comment added successfully'
      });
    } catch (error) {
      logger.error(`Error adding comment to DSR request ${req.params.requestId}:`, error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to add comment'
      });
    }
  }
);

module.exports = router;
