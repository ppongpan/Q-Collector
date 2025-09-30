/**
 * Analytics Routes
 * Advanced Analytics & Dashboard API endpoints
 */

const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const analyticsService = require('../../services/AnalyticsService');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const logger = require('../../utils/logger.util');

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Advanced Analytics & Dashboard API
 */

/**
 * @swagger
 * /analytics/dashboard:
 *   get:
 *     summary: Get comprehensive dashboard statistics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     overview:
 *                       type: object
 *                       properties:
 *                         totalUsers:
 *                           type: integer
 *                         totalForms:
 *                           type: integer
 *                         totalSubmissions:
 *                           type: integer
 *                         totalFiles:
 *                           type: integer
 *                         storageUsed:
 *                           type: integer
 *                     today:
 *                       type: object
 *                     thisWeek:
 *                       type: object
 *                     thisMonth:
 *                       type: object
 *                     thisYear:
 *                       type: object
 *                     trends:
 *                       type: array
 *                     performance:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/dashboard',
  authenticate,
  authorize('admin', 'super_admin'),
  async (req, res) => {
    try {
      const stats = await analyticsService.getDashboardStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Failed to get dashboard stats:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DASHBOARD_STATS_ERROR',
          message: 'Failed to retrieve dashboard statistics',
          details: error.message
        }
      });
    }
  }
);

/**
 * @swagger
 * /analytics/forms:
 *   get:
 *     summary: Get form usage analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d, 90d, 1y]
 *           default: 30d
 *         description: Time range for analytics
 *       - in: query
 *         name: formId
 *         schema:
 *           type: string
 *         description: Specific form ID to analyze
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include inactive forms in analysis
 *     responses:
 *       200:
 *         description: Form analytics data
 *       401:
 *         description: Unauthorized
 */
router.get('/forms',
  authenticate,
  authorize('admin', 'super_admin', 'moderator'),
  [
    query('timeRange').optional().isIn(['24h', '7d', '30d', '90d', '1y']),
    query('formId').optional().isUUID(),
    query('includeInactive').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: errors.array()
          }
        });
      }

      const { timeRange, formId, includeInactive } = req.query;

      const analytics = await analyticsService.getFormAnalytics({
        timeRange,
        formId,
        includeInactive: includeInactive === 'true'
      });

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Failed to get form analytics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FORM_ANALYTICS_ERROR',
          message: 'Failed to retrieve form analytics',
          details: error.message
        }
      });
    }
  }
);

/**
 * @swagger
 * /analytics/users:
 *   get:
 *     summary: Get user activity analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d, 90d, 1y]
 *           default: 30d
 *         description: Time range for analytics
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filter by user role
 *     responses:
 *       200:
 *         description: User analytics data
 */
router.get('/users',
  authenticate,
  authorize('admin', 'super_admin'),
  [
    query('timeRange').optional().isIn(['24h', '7d', '30d', '90d', '1y']),
    query('role').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: errors.array()
          }
        });
      }

      const { timeRange, role } = req.query;

      const analytics = await analyticsService.getUserAnalytics({
        timeRange,
        role
      });

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Failed to get user analytics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'USER_ANALYTICS_ERROR',
          message: 'Failed to retrieve user analytics',
          details: error.message
        }
      });
    }
  }
);

/**
 * @swagger
 * /analytics/performance:
 *   get:
 *     summary: Get system performance metrics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Performance metrics
 */
router.get('/performance',
  authenticate,
  authorize('admin', 'super_admin'),
  async (req, res) => {
    try {
      const metrics = await analyticsService.getPerformanceMetrics();

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Failed to get performance metrics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PERFORMANCE_METRICS_ERROR',
          message: 'Failed to retrieve performance metrics',
          details: error.message
        }
      });
    }
  }
);

/**
 * @swagger
 * /analytics/export:
 *   post:
 *     summary: Export analytics data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [full, forms, users, submissions]
 *                 default: full
 *               format:
 *                 type: string
 *                 enum: [json, csv]
 *                 default: json
 *               timeRange:
 *                 type: string
 *                 enum: [24h, 7d, 30d, 90d, 1y]
 *                 default: 30d
 *               filters:
 *                 type: object
 *     responses:
 *       200:
 *         description: Export data
 */
router.post('/export',
  authenticate,
  authorize('admin', 'super_admin'),
  [
    body('type').optional().isIn(['full', 'forms', 'users', 'submissions']),
    body('format').optional().isIn(['json', 'csv']),
    body('timeRange').optional().isIn(['24h', '7d', '30d', '90d', '1y']),
    body('filters').optional().isObject()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid export parameters',
            details: errors.array()
          }
        });
      }

      const { type, format, timeRange, filters } = req.body;

      const exportData = await analyticsService.getExportData({
        type,
        format,
        timeRange,
        filters
      });

      // Set appropriate headers for download
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="analytics-${type}-${timeRange}.csv"`);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="analytics-${type}-${timeRange}.json"`);
      }

      res.json({
        success: true,
        data: exportData
      });
    } catch (error) {
      logger.error('Failed to export analytics data:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'EXPORT_ERROR',
          message: 'Failed to export analytics data',
          details: error.message
        }
      });
    }
  }
);

/**
 * @swagger
 * /analytics/cache/clear:
 *   delete:
 *     summary: Clear analytics cache
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pattern
 *         schema:
 *           type: string
 *         description: Cache pattern to clear (optional)
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 */
router.delete('/cache/clear',
  authenticate,
  authorize('super_admin'),
  [
    query('pattern').optional().isString()
  ],
  async (req, res) => {
    try {
      const { pattern } = req.query;

      await analyticsService.clearCache(pattern);

      logger.info(`Analytics cache cleared by ${req.user.username}`, {
        pattern,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: {
          message: 'Analytics cache cleared successfully',
          pattern: pattern || 'all',
          clearedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Failed to clear analytics cache:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CACHE_CLEAR_ERROR',
          message: 'Failed to clear analytics cache',
          details: error.message
        }
      });
    }
  }
);

/**
 * @swagger
 * /analytics/real-time:
 *   get:
 *     summary: Get real-time analytics data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Real-time analytics
 */
router.get('/real-time',
  authenticate,
  authorize('admin', 'super_admin'),
  async (req, res) => {
    try {
      // Get real-time data (cached for very short time)
      const [
        dashboardStats,
        performanceMetrics
      ] = await Promise.all([
        analyticsService.getDashboardStats(),
        analyticsService.getPerformanceMetrics()
      ]);

      const realTimeData = {
        overview: dashboardStats.overview,
        today: dashboardStats.today,
        performance: performanceMetrics,
        lastUpdated: new Date().toISOString()
      };

      res.json({
        success: true,
        data: realTimeData
      });
    } catch (error) {
      logger.error('Failed to get real-time analytics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REALTIME_ANALYTICS_ERROR',
          message: 'Failed to retrieve real-time analytics',
          details: error.message
        }
      });
    }
  }
);

module.exports = router;