/**
 * MigrationQueue Service
 *
 * Manages sequential field migration operations using Bull queue with Redis
 * Ensures migrations are processed one at a time per form to prevent conflicts
 *
 * Features:
 * - Sequential processing per form
 * - Exponential backoff retry (3 attempts, 2s initial delay)
 * - Job status tracking (waiting, active, completed, failed)
 * - Telegram notifications for failures
 * - Clean completed jobs (24-hour retention)
 *
 * Created: 2025-10-07
 * Sprint: 3 (Integration - Auto-migration with FormService)
 */

const Queue = require('bull');
const FieldMigrationService = require('./FieldMigrationService');
const logger = require('../utils/logger.util');

class MigrationQueue {
  constructor() {
    // Initialize Bull queue with Redis connection
    this.queue = new Queue('field-migrations', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000 // 2 seconds initial delay
        },
        removeOnComplete: {
          age: 86400, // 24 hours in seconds
          count: 1000 // Keep last 1000 completed jobs
        },
        removeOnFail: {
          age: 604800 // 7 days in seconds for failed jobs
        }
      }
    });

    this.setupProcessor();
    this.setupEventHandlers();

    logger.info('MigrationQueue initialized with Redis');
  }

  /**
   * Setup queue processor for migration jobs
   * Processes jobs sequentially with migration type routing
   */
  setupProcessor() {
    this.queue.process(async (job) => {
      const { type, tableName, fieldId, formId, userId, ...params } = job.data;

      logger.info(`[Job ${job.id}] Processing migration: ${type} for table "${tableName}"`);

      try {
        let result;

        // Route to appropriate FieldMigrationService method
        switch (type) {
          case 'ADD_FIELD':
            result = await FieldMigrationService.addColumn(
              tableName,
              fieldId,
              params.columnName,
              params.dataType,
              { userId, formId }
            );
            logger.info(`[Job ${job.id}] ADD_FIELD completed: ${params.columnName}`);
            break;

          case 'DELETE_FIELD':
            result = await FieldMigrationService.dropColumn(
              tableName,
              fieldId,
              params.columnName,
              {
                backup: true, // Always backup before deletion
                userId,
                formId
              }
            );
            logger.info(`[Job ${job.id}] DELETE_FIELD completed: ${params.columnName}`);
            break;

          case 'RENAME_FIELD':
            result = await FieldMigrationService.renameColumn(
              tableName,
              fieldId,
              params.oldColumnName,
              params.newColumnName,
              { userId, formId }
            );
            logger.info(`[Job ${job.id}] RENAME_FIELD completed: ${params.oldColumnName} -> ${params.newColumnName}`);
            break;

          case 'CHANGE_TYPE':
            result = await FieldMigrationService.migrateColumnType(
              tableName,
              fieldId,
              params.columnName,
              params.oldType,
              params.newType,
              { userId, formId }
            );
            logger.info(`[Job ${job.id}] CHANGE_TYPE completed: ${params.columnName} (${params.oldType} -> ${params.newType})`);
            break;

          default:
            throw new Error(`Unknown migration type: ${type}`);
        }

        return {
          success: true,
          migrationId: result.id,
          type,
          tableName,
          columnName: params.columnName || params.newColumnName || params.oldColumnName
        };

      } catch (error) {
        logger.error(`[Job ${job.id}] Migration failed (attempt ${job.attemptsMade + 1}/3):`, {
          type,
          tableName,
          error: error.message,
          stack: error.stack
        });

        // Re-throw to trigger Bull retry mechanism
        throw error;
      }
    });

    logger.info('Migration queue processor configured');
  }

  /**
   * Setup event handlers for job lifecycle events
   */
  setupEventHandlers() {
    // Job completed successfully
    this.queue.on('completed', (job, result) => {
      logger.info(`[Job ${job.id}] Migration completed successfully`, {
        type: job.data.type,
        tableName: job.data.tableName,
        migrationId: result.migrationId,
        duration: Date.now() - job.timestamp
      });
    });

    // Job failed after all retries
    this.queue.on('failed', async (job, err) => {
      logger.error(`[Job ${job.id}] Migration failed after ${job.attemptsMade} attempts`, {
        type: job.data.type,
        tableName: job.data.tableName,
        formId: job.data.formId,
        error: err.message
      });

      // Send Telegram notification for critical failures (optional)
      try {
        const TelegramService = require('./TelegramService');
        if (TelegramService && typeof TelegramService.sendAlert === 'function') {
          await TelegramService.sendAlert({
            title: '⚠️ Migration Failed',
            formId: job.data.formId,
            jobId: job.id,
            type: job.data.type,
            tableName: job.data.tableName,
            columnName: job.data.columnName || job.data.newColumnName,
            error: err.message,
            attempts: job.attemptsMade
          });
        }
      } catch (notificationError) {
        logger.warn(`Failed to send Telegram notification: ${notificationError.message}`);
      }
    });

    // Job is waiting to be processed
    this.queue.on('waiting', (jobId) => {
      logger.debug(`[Job ${jobId}] Migration job added to queue`);
    });

    // Job started processing
    this.queue.on('active', (job) => {
      logger.info(`[Job ${job.id}] Migration started: ${job.data.type} for ${job.data.tableName}`);
    });

    // Job stalled (worker died during processing)
    this.queue.on('stalled', (job) => {
      logger.warn(`[Job ${job.id}] Migration job stalled - will be retried`);
    });

    // Queue error
    this.queue.on('error', (error) => {
      logger.error('Migration queue error:', error);
    });

    logger.info('Migration queue event handlers configured');
  }

  /**
   * Add migration job to queue
   *
   * @param {Object} change - Migration change object
   * @param {string} change.type - Migration type (ADD_FIELD, DELETE_FIELD, RENAME_FIELD, CHANGE_TYPE)
   * @param {string} change.tableName - Target table name
   * @param {string} change.fieldId - Field UUID
   * @param {string} change.formId - Form UUID
   * @param {string} change.userId - User executing migration
   * @param {Object} change.params - Additional migration parameters
   * @returns {Promise<Object>} Bull job object
   */
  async add(change) {
    try {
      const job = await this.queue.add(change, {
        priority: this._getPriority(change.type),
        jobId: `${change.formId}_${change.fieldId}_${Date.now()}` // Unique job ID
      });

      logger.info(`Migration job queued: ${job.id}`, {
        type: change.type,
        tableName: change.tableName,
        formId: change.formId
      });

      return job;
    } catch (error) {
      logger.error('Failed to queue migration:', error);
      throw new Error(`Failed to queue migration: ${error.message}`);
    }
  }

  /**
   * Get priority for migration type
   * Lower number = higher priority
   *
   * @private
   * @param {string} type - Migration type
   * @returns {number} Priority value
   */
  _getPriority(type) {
    const priorities = {
      'ADD_FIELD': 1,      // Highest priority (safe operation)
      'RENAME_FIELD': 2,   // Medium priority (safe, no data loss)
      'CHANGE_TYPE': 3,    // Lower priority (potentially risky)
      'DELETE_FIELD': 4    // Lowest priority (destructive)
    };
    return priorities[type] || 5;
  }

  /**
   * Get queue status for a specific form
   *
   * @param {string} formId - Form UUID
   * @returns {Promise<Object>} Status object with counts
   */
  async getStatus(formId) {
    try {
      const waiting = await this.queue.getWaiting();
      const active = await this.queue.getActive();
      const completed = await this.queue.getCompleted();
      const failed = await this.queue.getFailed();

      const filterByForm = (jobs) => jobs.filter(j => j.data.formId === formId);

      return {
        waiting: filterByForm(waiting).length,
        active: filterByForm(active).length,
        completed: filterByForm(completed).length,
        failed: filterByForm(failed).length,
        total: filterByForm([...waiting, ...active, ...completed, ...failed]).length
      };
    } catch (error) {
      logger.error(`Failed to get queue status for form ${formId}:`, error);
      throw new Error(`Failed to get queue status: ${error.message}`);
    }
  }

  /**
   * Get all pending jobs for a form
   *
   * @param {string} formId - Form UUID
   * @returns {Promise<Array>} Array of pending jobs
   */
  async getPendingJobs(formId) {
    try {
      const waiting = await this.queue.getWaiting();
      const active = await this.queue.getActive();

      const allPending = [...waiting, ...active];
      const formJobs = allPending.filter(j => j.data.formId === formId);

      return formJobs.map(job => ({
        id: job.id,
        type: job.data.type,
        tableName: job.data.tableName,
        columnName: job.data.columnName || job.data.newColumnName,
        status: job.processedOn ? 'active' : 'waiting',
        attempts: job.attemptsMade,
        createdAt: new Date(job.timestamp)
      }));
    } catch (error) {
      logger.error(`Failed to get pending jobs for form ${formId}:`, error);
      throw new Error(`Failed to get pending jobs: ${error.message}`);
    }
  }

  /**
   * Retry a failed job
   *
   * @param {string} jobId - Job ID to retry
   * @returns {Promise<Object>} New job object
   */
  async retryJob(jobId) {
    try {
      const job = await this.queue.getJob(jobId);

      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      if (await job.isCompleted()) {
        throw new Error(`Job ${jobId} is already completed`);
      }

      // Retry the job
      await job.retry();

      logger.info(`Retrying job ${jobId}`, {
        type: job.data.type,
        tableName: job.data.tableName
      });

      return job;
    } catch (error) {
      logger.error(`Failed to retry job ${jobId}:`, error);
      throw new Error(`Failed to retry job: ${error.message}`);
    }
  }

  /**
   * Clean completed jobs older than specified age
   *
   * @param {number} olderThan - Age in milliseconds (default: 24 hours)
   * @returns {Promise<Array>} Array of removed job IDs
   */
  async clearCompleted(olderThan = 24 * 60 * 60 * 1000) {
    try {
      const removed = await this.queue.clean(olderThan, 'completed');
      logger.info(`Cleaned ${removed.length} completed migration jobs older than ${olderThan}ms`);
      return removed;
    } catch (error) {
      logger.error('Failed to clean completed jobs:', error);
      throw new Error(`Failed to clean completed jobs: ${error.message}`);
    }
  }

  /**
   * Pause queue processing
   */
  async pause() {
    await this.queue.pause();
    logger.info('Migration queue paused');
  }

  /**
   * Resume queue processing
   */
  async resume() {
    await this.queue.resume();
    logger.info('Migration queue resumed');
  }

  /**
   * Close queue and connections
   */
  async close() {
    await this.queue.close();
    logger.info('Migration queue closed');
  }

  /**
   * Get queue metrics
   *
   * @returns {Promise<Object>} Queue metrics
   */
  async getMetrics() {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount(),
        this.queue.getCompletedCount(),
        this.queue.getFailedCount(),
        this.queue.getDelayedCount()
      ]);

      return {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed
      };
    } catch (error) {
      logger.error('Failed to get queue metrics:', error);
      throw new Error(`Failed to get queue metrics: ${error.message}`);
    }
  }
}

// Export singleton instance
module.exports = new MigrationQueue();
