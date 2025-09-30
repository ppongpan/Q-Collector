/**
 * Q-Collector Queue Service
 * Bull.js-based background job processing system
 * Handles async tasks with Redis backend
 */

const Bull = require('bull');
const redis = require('redis');
const logger = require('../utils/logger.util');

class QueueService {
  constructor() {
    this.queues = new Map();
    this.processors = new Map();
    this.redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: process.env.REDIS_QUEUE_DB || 1, // Use different DB for queues
    };

    this.isInitialized = false;
    this.metrics = {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      activeJobs: 0,
    };
  }

  /**
   * Initialize queue service
   */
  async initialize() {
    try {
      logger.info('Initializing Queue Service...');

      // Test Redis connection
      await this.testRedisConnection();

      // Create default queues
      await this.createQueues();

      // Setup queue event listeners
      this.setupEventListeners();

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      this.isInitialized = true;
      logger.info('Queue Service initialized successfully');

      return true;
    } catch (error) {
      logger.error('Failed to initialize Queue Service:', error);
      throw error;
    }
  }

  /**
   * Test Redis connection
   */
  async testRedisConnection() {
    const client = redis.createClient(this.redisConfig);

    try {
      await client.connect();
      await client.ping();
      logger.info('Redis connection test successful');
    } catch (error) {
      logger.error('Redis connection failed:', error);
      throw new Error('Queue Service requires Redis connection');
    } finally {
      await client.disconnect();
    }
  }

  /**
   * Create all required queues
   */
  async createQueues() {
    const queueConfigs = [
      // Email queues
      {
        name: 'email:send',
        options: {
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
          },
        },
      },
      {
        name: 'email:batch',
        options: {
          defaultJobOptions: {
            removeOnComplete: 50,
            removeOnFail: 25,
            attempts: 2,
            backoff: { type: 'exponential', delay: 5000 },
          },
        },
      },

      // File processing queues
      {
        name: 'file:process',
        options: {
          defaultJobOptions: {
            removeOnComplete: 50,
            removeOnFail: 25,
            attempts: 3,
            backoff: { type: 'fixed', delay: 10000 },
          },
        },
      },
      {
        name: 'file:cleanup',
        options: {
          defaultJobOptions: {
            removeOnComplete: 20,
            removeOnFail: 10,
            attempts: 2,
            backoff: { type: 'fixed', delay: 30000 },
          },
        },
      },

      // Data export queues
      {
        name: 'export:data',
        options: {
          defaultJobOptions: {
            removeOnComplete: 30,
            removeOnFail: 15,
            attempts: 2,
            backoff: { type: 'fixed', delay: 15000 },
          },
        },
      },

      // Analytics and reporting
      {
        name: 'analytics:calculate',
        options: {
          defaultJobOptions: {
            removeOnComplete: 20,
            removeOnFail: 10,
            attempts: 2,
            backoff: { type: 'exponential', delay: 10000 },
          },
        },
      },

      // System maintenance
      {
        name: 'system:cleanup',
        options: {
          defaultJobOptions: {
            removeOnComplete: 10,
            removeOnFail: 5,
            attempts: 1,
          },
        },
      },
      {
        name: 'system:backup',
        options: {
          defaultJobOptions: {
            removeOnComplete: 5,
            removeOnFail: 5,
            attempts: 2,
            backoff: { type: 'fixed', delay: 60000 },
          },
        },
      },
    ];

    for (const config of queueConfigs) {
      const queue = new Bull(config.name, {
        redis: this.redisConfig,
        ...config.options,
      });

      this.queues.set(config.name, queue);
      logger.info(`Created queue: ${config.name}`);
    }
  }

  /**
   * Setup event listeners for all queues
   */
  setupEventListeners() {
    for (const [name, queue] of this.queues) {
      // Job events
      queue.on('completed', (job, result) => {
        this.metrics.completedJobs++;
        logger.debug(`Job completed in queue ${name}:`, {
          jobId: job.id,
          processingTime: job.finishedOn - job.processedOn,
        });
      });

      queue.on('failed', (job, err) => {
        this.metrics.failedJobs++;
        logger.error(`Job failed in queue ${name}:`, {
          jobId: job.id,
          error: err.message,
          attempts: job.attemptsMade,
        });
      });

      queue.on('active', (job) => {
        this.metrics.activeJobs++;
        logger.debug(`Job started in queue ${name}:`, {
          jobId: job.id,
          data: job.data,
        });
      });

      queue.on('stalled', (job) => {
        logger.warn(`Job stalled in queue ${name}:`, {
          jobId: job.id,
        });
      });

      queue.on('progress', (job, progress) => {
        logger.debug(`Job progress in queue ${name}:`, {
          jobId: job.id,
          progress: `${progress}%`,
        });
      });

      // Queue events
      queue.on('error', (error) => {
        logger.error(`Queue error in ${name}:`, error);
      });

      queue.on('waiting', (jobId) => {
        logger.debug(`Job waiting in queue ${name}:`, { jobId });
      });
    }
  }

  /**
   * Register a job processor
   */
  registerProcessor(queueName, processor, concurrency = 1) {
    if (!this.queues.has(queueName)) {
      throw new Error(`Queue ${queueName} does not exist`);
    }

    const queue = this.queues.get(queueName);

    // Wrap processor with error handling and metrics
    const wrappedProcessor = async (job) => {
      const startTime = Date.now();

      try {
        logger.info(`Processing job ${job.id} in queue ${queueName}`);

        const result = await processor(job);

        const duration = Date.now() - startTime;
        logger.info(`Job ${job.id} completed in ${duration}ms`);

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`Job ${job.id} failed after ${duration}ms:`, error);
        throw error;
      }
    };

    queue.process(concurrency, wrappedProcessor);
    this.processors.set(queueName, processor);

    logger.info(`Registered processor for queue: ${queueName} (concurrency: ${concurrency})`);
  }

  /**
   * Add a job to a queue
   */
  async addJob(queueName, jobType, data, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Queue Service not initialized');
    }

    if (!this.queues.has(queueName)) {
      throw new Error(`Queue ${queueName} does not exist`);
    }

    const queue = this.queues.get(queueName);

    const jobOptions = {
      priority: options.priority || 0,
      delay: options.delay || 0,
      attempts: options.attempts || undefined,
      backoff: options.backoff || undefined,
      ...options,
    };

    try {
      const job = await queue.add(jobType, data, jobOptions);
      this.metrics.totalJobs++;

      logger.info(`Job added to queue ${queueName}:`, {
        jobId: job.id,
        jobType,
        priority: jobOptions.priority,
        delay: jobOptions.delay,
      });

      return job;
    } catch (error) {
      logger.error(`Failed to add job to queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Add recurring job (cron-style)
   */
  async addRecurringJob(queueName, jobType, data, cronPattern, options = {}) {
    if (!this.queues.has(queueName)) {
      throw new Error(`Queue ${queueName} does not exist`);
    }

    const queue = this.queues.get(queueName);

    try {
      const job = await queue.add(jobType, data, {
        repeat: { cron: cronPattern },
        ...options,
      });

      logger.info(`Recurring job added to queue ${queueName}:`, {
        jobId: job.id,
        jobType,
        cronPattern,
      });

      return job;
    } catch (error) {
      logger.error(`Failed to add recurring job to queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Get job by ID
   */
  async getJob(queueName, jobId) {
    if (!this.queues.has(queueName)) {
      throw new Error(`Queue ${queueName} does not exist`);
    }

    const queue = this.queues.get(queueName);
    return await queue.getJob(jobId);
  }

  /**
   * Remove job by ID
   */
  async removeJob(queueName, jobId) {
    const job = await this.getJob(queueName, jobId);
    if (job) {
      await job.remove();
      logger.info(`Job ${jobId} removed from queue ${queueName}`);
      return true;
    }
    return false;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName) {
    if (!this.queues.has(queueName)) {
      throw new Error(`Queue ${queueName} does not exist`);
    }

    const queue = this.queues.get(queueName);

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);

    return {
      name: queueName,
      counts: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
      },
      jobs: {
        waiting: waiting.slice(0, 10), // Latest 10
        active: active.slice(0, 10),
        completed: completed.slice(0, 10),
        failed: failed.slice(0, 10),
        delayed: delayed.slice(0, 10),
      },
    };
  }

  /**
   * Get all queue statistics
   */
  async getAllQueueStats() {
    const stats = {};

    for (const queueName of this.queues.keys()) {
      stats[queueName] = await this.getQueueStats(queueName);
    }

    return {
      queues: stats,
      global: this.metrics,
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        redisConfig: {
          host: this.redisConfig.host,
          port: this.redisConfig.port,
          db: this.redisConfig.db,
        },
      },
    };
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName) {
    if (!this.queues.has(queueName)) {
      throw new Error(`Queue ${queueName} does not exist`);
    }

    const queue = this.queues.get(queueName);
    await queue.pause();
    logger.info(`Queue ${queueName} paused`);
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName) {
    if (!this.queues.has(queueName)) {
      throw new Error(`Queue ${queueName} does not exist`);
    }

    const queue = this.queues.get(queueName);
    await queue.resume();
    logger.info(`Queue ${queueName} resumed`);
  }

  /**
   * Clean old jobs from queue
   */
  async cleanQueue(queueName, grace = 24 * 60 * 60 * 1000) { // 24 hours
    if (!this.queues.has(queueName)) {
      throw new Error(`Queue ${queueName} does not exist`);
    }

    const queue = this.queues.get(queueName);

    try {
      const results = await Promise.all([
        queue.clean(grace, 'completed'),
        queue.clean(grace, 'failed'),
      ]);

      const [completedCleaned, failedCleaned] = results;

      logger.info(`Cleaned queue ${queueName}:`, {
        completed: completedCleaned.length,
        failed: failedCleaned.length,
      });

      return {
        completed: completedCleaned.length,
        failed: failedCleaned.length,
      };
    } catch (error) {
      logger.error(`Failed to clean queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Health check for queue service
   */
  async healthCheck() {
    try {
      if (!this.isInitialized) {
        return { status: 'unhealthy', reason: 'Not initialized' };
      }

      // Test Redis connection
      await this.testRedisConnection();

      // Check queue health
      const queueHealths = {};
      for (const [name, queue] of this.queues) {
        try {
          const stats = await this.getQueueStats(name);
          queueHealths[name] = 'healthy';
        } catch (error) {
          queueHealths[name] = 'unhealthy';
        }
      }

      const unhealthyQueues = Object.entries(queueHealths)
        .filter(([name, status]) => status === 'unhealthy')
        .map(([name]) => name);

      if (unhealthyQueues.length > 0) {
        return {
          status: 'degraded',
          reason: `Unhealthy queues: ${unhealthyQueues.join(', ')}`,
          queues: queueHealths,
        };
      }

      return {
        status: 'healthy',
        queues: queueHealths,
        metrics: this.metrics,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        reason: error.message,
      };
    }
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}, shutting down queue service gracefully...`);

      try {
        // Close all queues
        const shutdownPromises = Array.from(this.queues.values()).map(queue =>
          queue.close()
        );

        await Promise.all(shutdownPromises);
        logger.info('All queues closed successfully');

        process.exit(0);
      } catch (error) {
        logger.error('Error during queue shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  /**
   * Get queue instance by name
   */
  getQueue(queueName) {
    return this.queues.get(queueName);
  }

  /**
   * Get all queue names
   */
  getQueueNames() {
    return Array.from(this.queues.keys());
  }
}

// Export singleton instance
const queueService = new QueueService();

module.exports = queueService;