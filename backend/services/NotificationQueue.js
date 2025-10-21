/**
 * NotificationQueue Service
 *
 * Manages asynchronous notification delivery using Bull queue with Redis
 * Ensures notifications are processed reliably with retry logic
 *
 * Features:
 * - Async processing (non-blocking submission flow)
 * - Priority queue (high, medium, low)
 * - Exponential backoff retry (3 attempts, 2s initial delay)
 * - Job status tracking (waiting, active, completed, failed)
 * - Batch processing for scheduled notifications
 * - Clean completed jobs (24-hour retention)
 *
 * Q-Collector v0.8.0 Advanced Telegram Notification System
 * Created: 2025-10-20
 * Phase: 4 (Bull Queue Setup)
 */

const Queue = require('bull');
const NotificationExecutorService = require('./NotificationExecutorService');
const logger = require('../utils/logger.util');

class NotificationQueue {
  constructor() {
    // Initialize Bull queue with Redis connection
    this.queue = new Queue('telegram-notifications', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000, // 2 seconds initial delay
        },
        removeOnComplete: {
          age: 86400, // 24 hours
          count: 1000, // Keep last 1000 completed jobs
        },
        removeOnFail: {
          age: 604800, // 7 days for failed jobs
        },
      },
    });

    this.setupProcessor();
    this.setupEventHandlers();

    logger.info('[NotificationQueue] Initialized with Redis');
  }

  /**
   * Setup queue processor for notification jobs
   * Routes to NotificationExecutorService based on job type
   */
  setupProcessor() {
    this.queue.process(async (job) => {
      const { type, ruleId, submissionId, submissionIds } = job.data;

      logger.info(`[NotificationQueue Job ${job.id}] Processing: ${type} for rule ${ruleId}`);

      try {
        let result;

        switch (type) {
          case 'immediate':
            // Single notification (field_update trigger)
            result = await NotificationExecutorService.executeRule(ruleId, submissionId);
            logger.info(`[NotificationQueue Job ${job.id}] Immediate notification completed`);
            break;

          case 'scheduled':
            // Batch notifications (cron-based)
            const results = [];
            for (const sid of submissionIds) {
              const res = await NotificationExecutorService.executeRule(ruleId, sid);
              results.push(res);
            }
            result = {
              success: true,
              batch: true,
              total: submissionIds.length,
              sent: results.filter((r) => r.success).length,
              skipped: results.filter((r) => r.skipped).length,
              failed: results.filter((r) => !r.success && !r.skipped).length,
            };
            logger.info(`[NotificationQueue Job ${job.id}] Scheduled batch completed: ${result.sent}/${result.total} sent`);
            break;

          case 'test':
            // Test notification (dry run)
            result = await NotificationExecutorService.testNotification(ruleId, job.data.testData);
            logger.info(`[NotificationQueue Job ${job.id}] Test notification completed`);
            break;

          default:
            throw new Error(`Unknown notification job type: ${type}`);
        }

        return {
          success: true,
          type,
          ruleId,
          ...result,
        };
      } catch (error) {
        logger.error(`[NotificationQueue Job ${job.id}] Failed (attempt ${job.attemptsMade + 1}/3):`, {
          type,
          ruleId,
          submissionId,
          error: error.message,
          stack: error.stack,
        });

        // Re-throw to trigger Bull retry mechanism
        throw error;
      }
    });

    logger.info('[NotificationQueue] Processor configured');
  }

  /**
   * Setup event handlers for job lifecycle events
   */
  setupEventHandlers() {
    // Job completed successfully
    this.queue.on('completed', (job, result) => {
      logger.info(`[NotificationQueue Job ${job.id}] Completed successfully`, {
        type: job.data.type,
        ruleId: job.data.ruleId,
        duration: Date.now() - job.timestamp,
      });
    });

    // Job failed after all retry attempts
    this.queue.on('failed', (job, err) => {
      logger.error(`[NotificationQueue Job ${job.id}] Failed permanently after ${job.attemptsMade} attempts`, {
        type: job.data.type,
        ruleId: job.data.ruleId,
        submissionId: job.data.submissionId,
        error: err.message,
      });

      // TODO: Send admin alert for permanent failures
      // Could integrate with existing TelegramService or email notification
    });

    // Job stalled (worker died while processing)
    this.queue.on('stalled', (job) => {
      logger.warn(`[NotificationQueue Job ${job.id}] Stalled (worker died)`, {
        type: job.data.type,
        ruleId: job.data.ruleId,
      });
    });

    // Job is waiting to be processed
    this.queue.on('waiting', (jobId) => {
      logger.debug(`[NotificationQueue Job ${jobId}] Waiting in queue`);
    });

    // Job is now active
    this.queue.on('active', (job) => {
      logger.debug(`[NotificationQueue Job ${job.id}] Started processing`);
    });

    // Queue error
    this.queue.on('error', (error) => {
      logger.error('[NotificationQueue] Queue error:', error);
    });

    logger.info('[NotificationQueue] Event handlers configured');
  }

  /**
   * Add immediate notification job (field_update trigger)
   * @param {string} ruleId - Notification rule ID
   * @param {string} submissionId - Submission ID
   * @param {string} priority - Priority level (high, medium, low)
   * @returns {Promise<Object>} Job object
   */
  async addImmediateNotification(ruleId, submissionId, priority = 'medium') {
    try {
      const priorityValue = this._getPriorityValue(priority);

      const job = await this.queue.add(
        {
          type: 'immediate',
          ruleId,
          submissionId,
        },
        {
          priority: priorityValue,
          attempts: 3,
        }
      );

      logger.info(`[NotificationQueue] Immediate notification queued: Job ${job.id} (Rule: ${ruleId}, Priority: ${priority})`);

      return job;
    } catch (error) {
      logger.error('[NotificationQueue] Error adding immediate notification:', error);
      throw error;
    }
  }

  /**
   * Add scheduled notification job (cron-based batch)
   * @param {string} ruleId - Notification rule ID
   * @param {Array<string>} submissionIds - Array of submission IDs
   * @param {string} priority - Priority level
   * @returns {Promise<Object>} Job object
   */
  async addScheduledNotification(ruleId, submissionIds, priority = 'medium') {
    try {
      const priorityValue = this._getPriorityValue(priority);

      const job = await this.queue.add(
        {
          type: 'scheduled',
          ruleId,
          submissionIds,
        },
        {
          priority: priorityValue,
          attempts: 3,
        }
      );

      logger.info(`[NotificationQueue] Scheduled notification queued: Job ${job.id} (Rule: ${ruleId}, Batch: ${submissionIds.length})`);

      return job;
    } catch (error) {
      logger.error('[NotificationQueue] Error adding scheduled notification:', error);
      throw error;
    }
  }

  /**
   * Add test notification job (dry run)
   * @param {string} ruleId - Notification rule ID
   * @param {Object} testData - Test data
   * @returns {Promise<Object>} Job object
   */
  async addTestNotification(ruleId, testData = {}) {
    try {
      const job = await this.queue.add(
        {
          type: 'test',
          ruleId,
          testData,
        },
        {
          priority: 1, // High priority for tests
          attempts: 1, // Don't retry tests
        }
      );

      logger.info(`[NotificationQueue] Test notification queued: Job ${job.id} (Rule: ${ruleId})`);

      return job;
    } catch (error) {
      logger.error('[NotificationQueue] Error adding test notification:', error);
      throw error;
    }
  }

  /**
   * Get job status by ID
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Job status
   */
  async getJobStatus(jobId) {
    try {
      const job = await this.queue.getJob(jobId);

      if (!job) {
        return {
          found: false,
          jobId,
        };
      }

      const state = await job.getState();
      const progress = job._progress;
      const failedReason = job.failedReason;

      return {
        found: true,
        jobId: job.id,
        state,
        progress,
        data: job.data,
        attemptsMade: job.attemptsMade,
        failedReason,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
      };
    } catch (error) {
      logger.error('[NotificationQueue] Error getting job status:', error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   * @returns {Promise<Object>} Queue stats
   */
  async getQueueStats() {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount(),
        this.queue.getCompletedCount(),
        this.queue.getFailedCount(),
        this.queue.getDelayedCount(),
      ]);

      return {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed,
      };
    } catch (error) {
      logger.error('[NotificationQueue] Error getting queue stats:', error);
      throw error;
    }
  }

  /**
   * Get waiting jobs
   * @param {number} start - Start index
   * @param {number} end - End index
   * @returns {Promise<Array>} Waiting jobs
   */
  async getWaitingJobs(start = 0, end = 10) {
    try {
      return await this.queue.getWaiting(start, end);
    } catch (error) {
      logger.error('[NotificationQueue] Error getting waiting jobs:', error);
      throw error;
    }
  }

  /**
   * Get active jobs
   * @returns {Promise<Array>} Active jobs
   */
  async getActiveJobs() {
    try {
      return await this.queue.getActive();
    } catch (error) {
      logger.error('[NotificationQueue] Error getting active jobs:', error);
      throw error;
    }
  }

  /**
   * Get failed jobs
   * @param {number} start - Start index
   * @param {number} end - End index
   * @returns {Promise<Array>} Failed jobs
   */
  async getFailedJobs(start = 0, end = 10) {
    try {
      return await this.queue.getFailed(start, end);
    } catch (error) {
      logger.error('[NotificationQueue] Error getting failed jobs:', error);
      throw error;
    }
  }

  /**
   * Clean old completed jobs
   * @param {number} olderThanMs - Clean jobs older than this (milliseconds)
   * @returns {Promise<number>} Number of jobs cleaned
   */
  async cleanCompletedJobs(olderThanMs = 86400000) {
    try {
      const removed = await this.queue.clean(olderThanMs, 'completed');
      logger.info(`[NotificationQueue] Cleaned ${removed.length} completed jobs older than ${olderThanMs}ms`);
      return removed.length;
    } catch (error) {
      logger.error('[NotificationQueue] Error cleaning completed jobs:', error);
      throw error;
    }
  }

  /**
   * Clean old failed jobs
   * @param {number} olderThanMs - Clean jobs older than this (milliseconds)
   * @returns {Promise<number>} Number of jobs cleaned
   */
  async cleanFailedJobs(olderThanMs = 604800000) {
    try {
      const removed = await this.queue.clean(olderThanMs, 'failed');
      logger.info(`[NotificationQueue] Cleaned ${removed.length} failed jobs older than ${olderThanMs}ms`);
      return removed.length;
    } catch (error) {
      logger.error('[NotificationQueue] Error cleaning failed jobs:', error);
      throw error;
    }
  }

  /**
   * Pause queue processing
   * @returns {Promise<void>}
   */
  async pause() {
    try {
      await this.queue.pause();
      logger.info('[NotificationQueue] Queue paused');
    } catch (error) {
      logger.error('[NotificationQueue] Error pausing queue:', error);
      throw error;
    }
  }

  /**
   * Resume queue processing
   * @returns {Promise<void>}
   */
  async resume() {
    try {
      await this.queue.resume();
      logger.info('[NotificationQueue] Queue resumed');
    } catch (error) {
      logger.error('[NotificationQueue] Error resuming queue:', error);
      throw error;
    }
  }

  /**
   * Get priority value for Bull queue
   * @private
   * @param {string} priority - Priority level (high, medium, low)
   * @returns {number} Priority value (1-3)
   */
  _getPriorityValue(priority) {
    switch (priority) {
      case 'high':
        return 1;
      case 'medium':
        return 2;
      case 'low':
        return 3;
      default:
        return 2;
    }
  }

  /**
   * Close queue gracefully
   * @returns {Promise<void>}
   */
  async close() {
    try {
      await this.queue.close();
      logger.info('[NotificationQueue] Queue closed');
    } catch (error) {
      logger.error('[NotificationQueue] Error closing queue:', error);
      throw error;
    }
  }
}

// Export singleton instance
const notificationQueue = new NotificationQueue();
module.exports = notificationQueue;
