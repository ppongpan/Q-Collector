/**
 * Notification Routes
 * Q-Collector Advanced Telegram Notification System v0.8.0 - Phase 7: API Layer
 *
 * REST API endpoints for notification rules management with role-based access control
 * Provides CRUD operations, testing, history viewing, and statistics
 *
 * Permissions:
 * - super_admin: Full access to all operations
 * - admin: Can create, update, delete, test rules, view history
 *
 * Created: 2025-10-20
 * Phase: 7 (API Layer - Advanced Telegram Notification System)
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { asyncHandler, ApiError } = require('../../middleware/error.middleware');
const NotificationRuleService = require('../../services/NotificationRuleService');
const NotificationExecutorService = require('../../services/NotificationExecutorService');
const NotificationQueue = require('../../services/NotificationQueue');
const { NotificationRule, NotificationHistory } = require('../../models');
const logger = require('../../utils/logger.util');

/**
 * Note: Authentication is already applied in index.js
 * No need to apply authenticate() here to avoid duplicate middleware
 */

/**
 * Helper: Validate UUID format
 */
const isValidUUID = (value) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

/**
 * Helper: Validate cron expression format
 */
const isValidCron = (value) => {
  const parts = value.trim().split(/\s+/);
  return parts.length === 5; // Simple validation: must have 5 parts
};

// ===========================
// Rule Management Endpoints
// ===========================

/**
 * POST /api/v1/notifications/rules
 * Create a new notification rule
 *
 * Permission: admin, super_admin
 * Body: { name, description, triggerType, formId, subFormId, fieldId, condition,
 *         messageTemplate, botToken, groupId, schedule, isEnabled, sendOnce, priority }
 */
router.post(
  '/rules',
  authorize(['admin', 'super_admin']),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('triggerType')
      .isIn(['field_update', 'scheduled'])
      .withMessage('Invalid trigger type'),
    body('conditionFormula').notEmpty().withMessage('Condition formula is required'),
    body('messageTemplate').notEmpty().withMessage('Message template is required'),
    body('formId').optional().custom(isValidUUID).withMessage('Invalid form ID'),
    body('subFormId').optional().custom(isValidUUID).withMessage('Invalid sub-form ID'),
    body('targetFieldId').optional().custom(isValidUUID).withMessage('Invalid field ID'),
    body('schedule').optional().custom(isValidCron).withMessage('Invalid cron expression'),
    body('priority').optional().isIn(['high', 'medium', 'low']).withMessage('Invalid priority'),
  ],
  asyncHandler(async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', errors.array());
    }

    const userId = req.user.id;

    // Create rule
    const rule = await NotificationRuleService.createRule(req.body, userId);

    logger.info(`[API] Notification rule created: ${rule.id} by user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Notification rule created successfully',
      rule,
    });
  })
);

/**
 * GET /api/v1/notifications/rules
 * List notification rules with filtering and pagination
 *
 * Permission: admin, super_admin
 * Query: { formId, subFormId, triggerType, isEnabled, priority, search, page, limit }
 */
router.get(
  '/rules',
  authorize(['admin', 'super_admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('formId').optional().custom(isValidUUID).withMessage('Invalid form ID'),
    query('triggerType').optional().isIn(['field_update', 'scheduled']).withMessage('Invalid trigger type'),
  ],
  asyncHandler(async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', errors.array());
    }

    const filters = {
      formId: req.query.formId,
      subFormId: req.query.subFormId,
      triggerType: req.query.triggerType,
      isEnabled: req.query.isEnabled === 'true' ? true : req.query.isEnabled === 'false' ? false : undefined,
      priority: req.query.priority,
      search: req.query.search,
    };

    const pagination = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    };

    const result = await NotificationRuleService.listRules(filters, pagination);

    res.json({
      success: true,
      ...result,
    });
  })
);

/**
 * GET /api/v1/notifications/rules/:ruleId
 * Get a specific notification rule by ID
 *
 * Permission: admin, super_admin
 */
router.get(
  '/rules/:ruleId',
  authorize(['admin', 'super_admin']),
  [param('ruleId').custom(isValidUUID).withMessage('Invalid rule ID')],
  asyncHandler(async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', errors.array());
    }

    const rule = await NotificationRuleService.getRule(req.params.ruleId);

    res.json({
      success: true,
      rule,
    });
  })
);

/**
 * PATCH /api/v1/notifications/rules/:ruleId
 * Update an existing notification rule
 *
 * Permission: admin, super_admin
 */
router.patch(
  '/rules/:ruleId',
  authorize(['admin', 'super_admin']),
  [
    param('ruleId').custom(isValidUUID).withMessage('Invalid rule ID'),
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('triggerType').optional().isIn(['field_update', 'scheduled']).withMessage('Invalid trigger type'),
    body('conditionFormula').optional().notEmpty().withMessage('Condition formula cannot be empty'),
    body('messageTemplate').optional().notEmpty().withMessage('Message template cannot be empty'),
    body('schedule').optional().custom(isValidCron).withMessage('Invalid cron expression'),
    body('priority').optional().isIn(['high', 'medium', 'low']).withMessage('Invalid priority'),
  ],
  asyncHandler(async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', errors.array());
    }

    const userId = req.user.id;

    const rule = await NotificationRuleService.updateRule(req.params.ruleId, req.body, userId);

    logger.info(`[API] Notification rule updated: ${rule.id} by user ${userId}`);

    res.json({
      success: true,
      message: 'Notification rule updated successfully',
      rule,
    });
  })
);

/**
 * DELETE /api/v1/notifications/rules/:ruleId
 * Delete a notification rule
 *
 * Permission: admin, super_admin
 */
router.delete(
  '/rules/:ruleId',
  authorize(['admin', 'super_admin']),
  [param('ruleId').custom(isValidUUID).withMessage('Invalid rule ID')],
  asyncHandler(async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', errors.array());
    }

    const userId = req.user.id;

    await NotificationRuleService.deleteRule(req.params.ruleId, userId);

    logger.info(`[API] Notification rule deleted: ${req.params.ruleId} by user ${userId}`);

    res.json({
      success: true,
      message: 'Notification rule deleted successfully',
    });
  })
);

/**
 * POST /api/v1/notifications/rules/:ruleId/test
 * Test a notification rule with sample or real data
 *
 * Permission: admin, super_admin
 * Body: { submissionId (optional), testData (optional) }
 */
router.post(
  '/rules/:ruleId/test',
  authorize(['admin', 'super_admin']),
  [
    param('ruleId').custom(isValidUUID).withMessage('Invalid rule ID'),
    body('submissionId').optional().custom(isValidUUID).withMessage('Invalid submission ID'),
  ],
  asyncHandler(async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', errors.array());
    }

    const result = await NotificationRuleService.testRule(
      req.params.ruleId,
      req.body.submissionId
    );

    logger.info(`[API] Notification rule tested: ${req.params.ruleId} by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Test completed (no notification sent)',
      result,
    });
  })
);

// ===========================
// History & Statistics Endpoints
// ===========================

/**
 * GET /api/v1/notifications/history
 * Get notification history with filtering
 *
 * Permission: admin, super_admin
 * Query: { ruleId, submissionId, status, startDate, endDate, page, limit }
 */
router.get(
  '/history',
  authorize(['admin', 'super_admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('ruleId').optional().custom(isValidUUID).withMessage('Invalid rule ID'),
    query('submissionId').optional().custom(isValidUUID).withMessage('Invalid submission ID'),
    query('status').optional().isIn(['pending', 'sent', 'failed', 'skipped']).withMessage('Invalid status'),
  ],
  asyncHandler(async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', errors.array());
    }

    const { page = 1, limit = 50, ruleId, submissionId, status, startDate, endDate } = req.query;

    // Build where clause
    const where = {};
    if (ruleId) where.notification_rule_id = ruleId;
    if (submissionId) where.submission_id = submissionId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at[require('sequelize').Op.gte] = new Date(startDate);
      if (endDate) where.created_at[require('sequelize').Op.lte] = new Date(endDate);
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await NotificationHistory.findAndCountAll({
      where,
      include: [
        {
          model: NotificationRule,
          as: 'notificationRule',
          attributes: ['id', 'name', 'trigger_type', 'priority'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      success: true,
      history: rows,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit),
    });
  })
);

/**
 * GET /api/v1/notifications/rules/:ruleId/stats
 * Get statistics for a specific notification rule
 *
 * Permission: admin, super_admin
 */
router.get(
  '/rules/:ruleId/stats',
  authorize(['admin', 'super_admin']),
  [param('ruleId').custom(isValidUUID).withMessage('Invalid rule ID')],
  asyncHandler(async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', errors.array());
    }

    const stats = await NotificationRuleService.getRuleStatistics(req.params.ruleId);

    res.json({
      success: true,
      stats,
    });
  })
);

// ===========================
// Queue Management Endpoints
// ===========================

/**
 * GET /api/v1/notifications/queue/stats
 * Get notification queue statistics
 *
 * Permission: admin, super_admin
 */
router.get(
  '/queue/stats',
  authorize(['admin', 'super_admin']),
  asyncHandler(async (req, res) => {
    const stats = await NotificationQueue.getQueueStats();

    res.json({
      success: true,
      stats,
    });
  })
);

/**
 * GET /api/v1/notifications/queue/jobs
 * Get queue jobs (waiting, active, failed)
 *
 * Permission: admin, super_admin
 * Query: { type (waiting|active|failed), start, end }
 */
router.get(
  '/queue/jobs',
  authorize(['admin', 'super_admin']),
  [
    query('type').optional().isIn(['waiting', 'active', 'failed']).withMessage('Invalid job type'),
    query('start').optional().isInt({ min: 0 }).withMessage('Start must be non-negative integer'),
    query('end').optional().isInt({ min: 0 }).withMessage('End must be non-negative integer'),
  ],
  asyncHandler(async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', errors.array());
    }

    const { type = 'waiting', start = 0, end = 10 } = req.query;

    let jobs;
    if (type === 'waiting') {
      jobs = await NotificationQueue.getWaitingJobs(parseInt(start), parseInt(end));
    } else if (type === 'active') {
      jobs = await NotificationQueue.getActiveJobs();
    } else if (type === 'failed') {
      jobs = await NotificationQueue.getFailedJobs(parseInt(start), parseInt(end));
    }

    res.json({
      success: true,
      type,
      jobs,
      count: jobs.length,
    });
  })
);

/**
 * GET /api/v1/notifications/queue/jobs/:jobId
 * Get status of a specific job
 *
 * Permission: admin, super_admin
 */
router.get(
  '/queue/jobs/:jobId',
  authorize(['admin', 'super_admin']),
  asyncHandler(async (req, res) => {
    const status = await NotificationQueue.getJobStatus(req.params.jobId);

    res.json({
      success: true,
      status,
    });
  })
);

/**
 * POST /api/v1/notifications/queue/clean
 * Clean old completed/failed jobs
 *
 * Permission: super_admin
 * Body: { type (completed|failed), olderThanDays }
 */
router.post(
  '/queue/clean',
  authorize(['super_admin']),
  [
    body('type').isIn(['completed', 'failed']).withMessage('Type must be completed or failed'),
    body('olderThanDays').optional().isInt({ min: 1 }).withMessage('olderThanDays must be positive integer'),
  ],
  asyncHandler(async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', errors.array());
    }

    const { type, olderThanDays = 1 } = req.body;
    const olderThanMs = olderThanDays * 86400000; // Convert days to milliseconds

    let count;
    if (type === 'completed') {
      count = await NotificationQueue.cleanCompletedJobs(olderThanMs);
    } else {
      count = await NotificationQueue.cleanFailedJobs(olderThanMs);
    }

    logger.info(`[API] Cleaned ${count} ${type} jobs older than ${olderThanDays} days by user ${req.user.id}`);

    res.json({
      success: true,
      message: `Cleaned ${count} ${type} jobs`,
      count,
    });
  })
);

module.exports = router;
