/**
 * Q-Collector Processor Service
 * Initializes and manages all background job processors
 */

const logger = require('../utils/logger.util');
const queueService = require('./QueueService');

// Import processors
const EmailProcessor = require('../processors/EmailProcessor');
const FileProcessor = require('../processors/FileProcessor');
const ExportProcessor = require('../processors/ExportProcessor');
const AnalyticsProcessor = require('../processors/AnalyticsProcessor');
const SystemProcessor = require('../processors/SystemProcessor');

class ProcessorService {
  constructor() {
    this.isInitialized = false;
    this.processors = new Map();
  }

  /**
   * Initialize all processors
   */
  async initialize() {
    try {
      logger.info('Initializing Processor Service...');

      // Register email processors
      await this.registerEmailProcessors();

      // Register file processors
      await this.registerFileProcessors();

      // Register export processors
      await this.registerExportProcessors();

      // Register analytics processors
      await this.registerAnalyticsProcessors();

      // Register system processors
      await this.registerSystemProcessors();

      // Setup recurring jobs
      await this.setupRecurringJobs();

      this.isInitialized = true;
      logger.info('Processor Service initialized successfully');

      return true;
    } catch (error) {
      logger.error('Failed to initialize Processor Service:', error);
      throw error;
    }
  }

  /**
   * Register email processors
   */
  async registerEmailProcessors() {
    const emailProcessors = [
      { type: 'send', processor: EmailProcessor.processSingleEmail, concurrency: 5 },
      { type: 'batch', processor: EmailProcessor.processBatchEmail, concurrency: 2 },
      { type: 'welcome', processor: EmailProcessor.processWelcomeEmail, concurrency: 3 },
      { type: 'submission-notification', processor: EmailProcessor.processSubmissionNotification, concurrency: 3 },
      { type: 'password-reset', processor: EmailProcessor.processPasswordResetEmail, concurrency: 5 },
      { type: 'export-notification', processor: EmailProcessor.processExportNotification, concurrency: 3 },
    ];

    for (const { type, processor, concurrency } of emailProcessors) {
      const queueName = type === 'batch' ? 'email:batch' : 'email:send';

      queueService.registerProcessor(queueName, async (job) => {
        return await processor(job);
      }, concurrency);

      this.processors.set(`email:${type}`, processor);
      logger.debug(`Registered email processor: ${type}`);
    }

    logger.info('Email processors registered');
  }

  /**
   * Register file processors
   */
  async registerFileProcessors() {
    const fileProcessors = [
      { type: 'image-process', processor: FileProcessor.processImageFile, concurrency: 2 },
      { type: 'cleanup', processor: FileProcessor.processFileCleanup, concurrency: 1 },
      { type: 'compress', processor: FileProcessor.processFileCompression, concurrency: 1 },
      { type: 'virus-scan', processor: FileProcessor.processVirusScan, concurrency: 3 },
    ];

    for (const { type, processor, concurrency } of fileProcessors) {
      const queueName = type === 'cleanup' ? 'file:cleanup' : 'file:process';

      queueService.registerProcessor(queueName, async (job) => {
        return await processor(job);
      }, concurrency);

      this.processors.set(`file:${type}`, processor);
      logger.debug(`Registered file processor: ${type}`);
    }

    logger.info('File processors registered');
  }

  /**
   * Register export processors
   */
  async registerExportProcessors() {
    const exportProcessors = [
      { type: 'csv', processor: ExportProcessor.processCSVExport, concurrency: 2 },
      { type: 'json', processor: ExportProcessor.processJSONExport, concurrency: 2 },
      { type: 'excel', processor: ExportProcessor.processExcelExport, concurrency: 1 },
      { type: 'form-submissions', processor: ExportProcessor.processFormSubmissionsExport, concurrency: 1 },
    ];

    for (const { type, processor, concurrency } of exportProcessors) {
      queueService.registerProcessor('export:data', async (job) => {
        return await processor(job);
      }, concurrency);

      this.processors.set(`export:${type}`, processor);
      logger.debug(`Registered export processor: ${type}`);
    }

    logger.info('Export processors registered');
  }

  /**
   * Register analytics processors
   */
  async registerAnalyticsProcessors() {
    const analyticsProcessors = [
      { type: 'form-stats', processor: AnalyticsProcessor.calculateFormStats, concurrency: 2 },
      { type: 'system-analytics', processor: AnalyticsProcessor.calculateSystemAnalytics, concurrency: 1 },
      { type: 'user-activity', processor: AnalyticsProcessor.calculateUserActivity, concurrency: 2 },
    ];

    for (const { type, processor, concurrency } of analyticsProcessors) {
      queueService.registerProcessor('analytics:calculate', async (job) => {
        return await processor(job);
      }, concurrency);

      this.processors.set(`analytics:${type}`, processor);
      logger.debug(`Registered analytics processor: ${type}`);
    }

    logger.info('Analytics processors registered');
  }

  /**
   * Register system processors
   */
  async registerSystemProcessors() {
    const systemProcessors = [
      { type: 'cleanup', processor: SystemProcessor.processCleanup, concurrency: 1 },
      { type: 'backup', processor: SystemProcessor.processBackup, concurrency: 1 },
      { type: 'health-check', processor: SystemProcessor.processHealthCheck, concurrency: 2 },
    ];

    for (const { type, processor, concurrency } of systemProcessors) {
      const queueName = type === 'backup' ? 'system:backup' : 'system:cleanup';

      queueService.registerProcessor(queueName, async (job) => {
        return await processor(job);
      }, concurrency);

      this.processors.set(`system:${type}`, processor);
      logger.debug(`Registered system processor: ${type}`);
    }

    logger.info('System processors registered');
  }

  /**
   * Setup recurring jobs
   */
  async setupRecurringJobs() {
    logger.info('Setting up recurring jobs...');

    const recurringJobs = [
      // Daily cleanup jobs
      {
        queueName: 'system:cleanup',
        jobType: 'cleanup',
        cronPattern: '0 2 * * *', // 2 AM daily
        data: {
          tasks: [
            {
              type: 'temp_files',
              maxAge: 24 * 60 * 60 * 1000, // 24 hours
            },
            {
              type: 'old_sessions',
              maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            },
            {
              type: 'old_logs',
              directory: 'logs',
              maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
              pattern: '\\.(log|out)$',
            },
          ],
        },
        options: { priority: 5 },
      },

      // Weekly backup jobs
      {
        queueName: 'system:backup',
        jobType: 'backup',
        cronPattern: '0 3 * * 0', // 3 AM every Sunday
        data: {
          type: 'weekly',
          targets: [
            { type: 'database' },
            { type: 'uploads' },
            { type: 'logs' },
          ],
        },
        options: { priority: 8 },
      },

      // Daily system analytics
      {
        queueName: 'analytics:calculate',
        jobType: 'system-analytics',
        cronPattern: '0 1 * * *', // 1 AM daily
        data: {
          period: 'day',
        },
        options: { priority: 3 },
      },

      // Weekly system analytics
      {
        queueName: 'analytics:calculate',
        jobType: 'system-analytics',
        cronPattern: '0 1 * * 1', // 1 AM every Monday
        data: {
          period: 'week',
        },
        options: { priority: 3 },
      },

      // Monthly system analytics
      {
        queueName: 'analytics:calculate',
        jobType: 'system-analytics',
        cronPattern: '0 1 1 * *', // 1 AM on 1st of each month
        data: {
          period: 'month',
        },
        options: { priority: 3 },
      },

      // Health check every 30 minutes
      {
        queueName: 'system:cleanup',
        jobType: 'health-check',
        cronPattern: '*/30 * * * *', // Every 30 minutes
        data: {
          services: ['database', 'redis', 'email', 'queue'],
        },
        options: { priority: 2 },
      },

      // File cleanup every 6 hours
      {
        queueName: 'file:cleanup',
        jobType: 'cleanup',
        cronPattern: '0 */6 * * *', // Every 6 hours
        data: {
          files: [], // Will be populated by the processor
          olderThan: 24 * 60 * 60 * 1000, // 24 hours
        },
        options: { priority: 4 },
      },
    ];

    for (const job of recurringJobs) {
      try {
        await queueService.addRecurringJob(
          job.queueName,
          job.jobType,
          job.data,
          job.cronPattern,
          job.options
        );

        logger.debug(`Setup recurring job: ${job.jobType} (${job.cronPattern})`);
      } catch (error) {
        logger.error(`Failed to setup recurring job ${job.jobType}:`, error);
      }
    }

    logger.info('Recurring jobs setup completed');
  }

  /**
   * Add convenience methods for common job types
   */

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(user, options = {}) {
    return await queueService.addJob(
      'email:send',
      'welcome',
      { user },
      { priority: 5, ...options }
    );
  }

  /**
   * Send form submission notification
   */
  async sendSubmissionNotification(submission, form, recipients, options = {}) {
    return await queueService.addJob(
      'email:send',
      'submission-notification',
      { submission, form, recipients },
      { priority: 7, ...options }
    );
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user, resetToken, expiresAt, options = {}) {
    return await queueService.addJob(
      'email:send',
      'password-reset',
      { user, resetToken, expiresAt },
      { priority: 8, ...options }
    );
  }

  /**
   * Process image upload
   */
  async processImageUpload(filePath, outputDir, options = {}) {
    return await queueService.addJob(
      'file:process',
      'image-process',
      { filePath, outputDir, options },
      { priority: 4, ...options.jobOptions }
    );
  }

  /**
   * Export form submissions
   */
  async exportFormSubmissions(formId, format, dateRange, options = {}) {
    return await queueService.addJob(
      'export:data',
      'form-submissions',
      { formId, format, dateRange, options },
      { priority: 3, ...options.jobOptions }
    );
  }

  /**
   * Calculate form statistics
   */
  async calculateFormStats(formId, dateRange, options = {}) {
    return await queueService.addJob(
      'analytics:calculate',
      'form-stats',
      { formId, dateRange },
      { priority: 2, ...options }
    );
  }

  /**
   * Trigger system cleanup
   */
  async triggerSystemCleanup(tasks, options = {}) {
    return await queueService.addJob(
      'system:cleanup',
      'cleanup',
      { tasks },
      { priority: 6, ...options }
    );
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      processors: Array.from(this.processors.keys()),
      queues: queueService.getQueueNames(),
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      if (!this.isInitialized) {
        return { status: 'unhealthy', reason: 'Service not initialized' };
      }

      const queueHealth = await queueService.healthCheck();

      if (queueHealth.status !== 'healthy') {
        return {
          status: 'degraded',
          reason: 'Queue service unhealthy',
          details: queueHealth,
        };
      }

      return {
        status: 'healthy',
        processors: this.processors.size,
        queues: queueService.getQueueNames().length,
        queueHealth,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        reason: error.message,
      };
    }
  }
}

// Export singleton instance
const processorService = new ProcessorService();

module.exports = processorService;