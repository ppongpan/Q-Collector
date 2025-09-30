/**
 * Q-Collector Queue Management Routes
 * API endpoints for job queue monitoring and management
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const authMiddleware = require('../../middleware/auth.middleware');
const logger = require('../../utils/logger.util');

// Services
const queueService = require('../../services/QueueService');
const emailService = require('../../services/EmailService');

// Processors
const EmailProcessor = require('../../processors/EmailProcessor');
const FileProcessor = require('../../processors/FileProcessor');
const ExportProcessor = require('../../processors/ExportProcessor');
const AnalyticsProcessor = require('../../processors/AnalyticsProcessor');
const SystemProcessor = require('../../processors/SystemProcessor');

/**
 * @swagger
 * tags:
 *   name: Queue
 *   description: Job queue management and monitoring
 */

/**
 * @swagger
 * /api/v1/queue/stats:
 *   get:
 *     summary: Get queue statistics
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Queue statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 */
router.get('/stats', authMiddleware.authenticate, async (req, res) => {
  try {
    const stats = await queueService.getAllQueueStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to get queue stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'QUEUE_STATS_ERROR',
        message: 'Failed to retrieve queue statistics',
      },
    });
  }
});

/**
 * @swagger
 * /api/v1/queue/{queueName}/stats:
 *   get:
 *     summary: Get specific queue statistics
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: queueName
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the queue
 *     responses:
 *       200:
 *         description: Queue statistics retrieved successfully
 *       404:
 *         description: Queue not found
 */
router.get('/:queueName/stats',
  authMiddleware.authenticate,
  param('queueName').isString().notEmpty(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: errors.array(),
          },
        });
      }

      const { queueName } = req.params;
      const stats = await queueService.getQueueStats(queueName);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      if (error.message.includes('does not exist')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'QUEUE_NOT_FOUND',
            message: `Queue '${req.params.queueName}' not found`,
          },
        });
      }

      logger.error('Failed to get queue stats:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'QUEUE_STATS_ERROR',
          message: 'Failed to retrieve queue statistics',
        },
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/queue/jobs:
 *   post:
 *     summary: Add a job to queue
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - queueName
 *               - jobType
 *               - data
 *             properties:
 *               queueName:
 *                 type: string
 *               jobType:
 *                 type: string
 *               data:
 *                 type: object
 *               options:
 *                 type: object
 *     responses:
 *       201:
 *         description: Job added successfully
 *       400:
 *         description: Invalid request data
 */
router.post('/jobs',
  authMiddleware.authenticate,
  [
    body('queueName').isString().notEmpty(),
    body('jobType').isString().notEmpty(),
    body('data').isObject(),
    body('options').optional().isObject(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: errors.array(),
          },
        });
      }

      const { queueName, jobType, data, options = {} } = req.body;

      // Add user context to job data
      data.userId = req.user.id;
      data.username = req.user.username;

      const job = await queueService.addJob(queueName, jobType, data, options);

      res.status(201).json({
        success: true,
        data: {
          jobId: job.id,
          queueName,
          jobType,
          status: 'queued',
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to add job to queue:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'JOB_CREATION_ERROR',
          message: error.message || 'Failed to add job to queue',
        },
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/queue/{queueName}/jobs/{jobId}:
 *   get:
 *     summary: Get job details
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: queueName
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job details retrieved successfully
 *       404:
 *         description: Job not found
 */
router.get('/:queueName/jobs/:jobId',
  authMiddleware.authenticate,
  [
    param('queueName').isString().notEmpty(),
    param('jobId').isString().notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: errors.array(),
          },
        });
      }

      const { queueName, jobId } = req.params;
      const job = await queueService.getJob(queueName, jobId);

      if (!job) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'JOB_NOT_FOUND',
            message: 'Job not found',
          },
        });
      }

      const jobData = {
        id: job.id,
        name: job.name,
        data: job.data,
        opts: job.opts,
        progress: job.progress(),
        delay: job.delay,
        timestamp: job.timestamp,
        attemptsMade: job.attemptsMade,
        finishedOn: job.finishedOn,
        processedOn: job.processedOn,
        failedReason: job.failedReason,
        stacktrace: job.stacktrace,
      };

      res.json({
        success: true,
        data: jobData,
      });
    } catch (error) {
      logger.error('Failed to get job details:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'JOB_FETCH_ERROR',
          message: 'Failed to retrieve job details',
        },
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/queue/{queueName}/jobs/{jobId}:
 *   delete:
 *     summary: Remove job from queue
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: queueName
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job removed successfully
 *       404:
 *         description: Job not found
 */
router.delete('/:queueName/jobs/:jobId',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin', 'super_admin'),
  [
    param('queueName').isString().notEmpty(),
    param('jobId').isString().notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: errors.array(),
          },
        });
      }

      const { queueName, jobId } = req.params;
      const removed = await queueService.removeJob(queueName, jobId);

      if (!removed) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'JOB_NOT_FOUND',
            message: 'Job not found',
          },
        });
      }

      res.json({
        success: true,
        message: 'Job removed successfully',
      });
    } catch (error) {
      logger.error('Failed to remove job:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'JOB_REMOVAL_ERROR',
          message: 'Failed to remove job',
        },
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/queue/{queueName}/pause:
 *   post:
 *     summary: Pause queue
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: queueName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Queue paused successfully
 */
router.post('/:queueName/pause',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin', 'super_admin'),
  param('queueName').isString().notEmpty(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: errors.array(),
          },
        });
      }

      const { queueName } = req.params;
      await queueService.pauseQueue(queueName);

      res.json({
        success: true,
        message: `Queue '${queueName}' paused successfully`,
      });
    } catch (error) {
      logger.error('Failed to pause queue:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'QUEUE_PAUSE_ERROR',
          message: error.message || 'Failed to pause queue',
        },
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/queue/{queueName}/resume:
 *   post:
 *     summary: Resume queue
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: queueName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Queue resumed successfully
 */
router.post('/:queueName/resume',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin', 'super_admin'),
  param('queueName').isString().notEmpty(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: errors.array(),
          },
        });
      }

      const { queueName } = req.params;
      await queueService.resumeQueue(queueName);

      res.json({
        success: true,
        message: `Queue '${queueName}' resumed successfully`,
      });
    } catch (error) {
      logger.error('Failed to resume queue:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'QUEUE_RESUME_ERROR',
          message: error.message || 'Failed to resume queue',
        },
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/queue/{queueName}/clean:
 *   post:
 *     summary: Clean old jobs from queue
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: queueName
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               grace:
 *                 type: integer
 *                 description: Grace period in milliseconds
 *                 default: 86400000
 *     responses:
 *       200:
 *         description: Queue cleaned successfully
 */
router.post('/:queueName/clean',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin', 'super_admin'),
  [
    param('queueName').isString().notEmpty(),
    body('grace').optional().isInt({ min: 0 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: errors.array(),
          },
        });
      }

      const { queueName } = req.params;
      const { grace = 24 * 60 * 60 * 1000 } = req.body; // 24 hours default

      const result = await queueService.cleanQueue(queueName, grace);

      res.json({
        success: true,
        data: result,
        message: `Queue '${queueName}' cleaned successfully`,
      });
    } catch (error) {
      logger.error('Failed to clean queue:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'QUEUE_CLEAN_ERROR',
          message: error.message || 'Failed to clean queue',
        },
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/queue/health:
 *   get:
 *     summary: Get queue service health status
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Queue health status retrieved successfully
 */
router.get('/health', authMiddleware.authenticate, async (req, res) => {
  try {
    const health = await queueService.healthCheck();

    const statusCode = health.status === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      success: health.status === 'healthy',
      data: health,
    });
  } catch (error) {
    logger.error('Failed to get queue health:', error);
    res.status(503).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_ERROR',
        message: 'Failed to check queue health',
      },
    });
  }
});

/**
 * @swagger
 * /api/v1/queue/email/health:
 *   get:
 *     summary: Get email service health status
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email service health status retrieved successfully
 */
router.get('/email/health', authMiddleware.authenticate, async (req, res) => {
  try {
    const health = await emailService.healthCheck();

    const statusCode = health.status === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      success: health.status === 'healthy',
      data: health,
    });
  } catch (error) {
    logger.error('Failed to get email service health:', error);
    res.status(503).json({
      success: false,
      error: {
        code: 'EMAIL_HEALTH_CHECK_ERROR',
        message: 'Failed to check email service health',
      },
    });
  }
});

/**
 * @swagger
 * /api/v1/queue/dashboard:
 *   get:
 *     summary: Get queue dashboard data
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 */
router.get('/dashboard', authMiddleware.authenticate, async (req, res) => {
  try {
    const [queueStats, queueHealth, emailHealth] = await Promise.all([
      queueService.getAllQueueStats(),
      queueService.healthCheck(),
      emailService.healthCheck(),
    ]);

    const dashboard = {
      timestamp: new Date().toISOString(),
      overview: {
        totalQueues: Object.keys(queueStats.queues).length,
        totalJobs: queueStats.global.totalJobs,
        activeJobs: queueStats.global.activeJobs,
        completedJobs: queueStats.global.completedJobs,
        failedJobs: queueStats.global.failedJobs,
      },
      queues: queueStats.queues,
      health: {
        queue: queueHealth,
        email: emailHealth,
      },
      system: queueStats.system,
    };

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    logger.error('Failed to get dashboard data:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DASHBOARD_ERROR',
        message: 'Failed to retrieve dashboard data',
      },
    });
  }
});

module.exports = router;