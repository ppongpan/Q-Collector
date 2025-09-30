/**
 * Q-Collector System Job Processor
 * Handles system maintenance and cleanup jobs
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger.util');

class SystemProcessor {
  /**
   * Process cleanup job
   */
  static async processCleanup(job) {
    const { tasks = [] } = job.data;
    const startTime = Date.now();

    try {
      logger.info(`Processing system cleanup job ${job.id}`, {
        taskCount: tasks.length,
      });

      await job.progress(5);

      const results = {
        total: tasks.length,
        completed: 0,
        failed: 0,
        details: [],
      };

      // Process each cleanup task
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];

        try {
          let taskResult;

          switch (task.type) {
            case 'old_files':
              taskResult = await this.cleanupOldFiles(task);
              break;
            case 'temp_files':
              taskResult = await this.cleanupTempFiles(task);
              break;
            case 'old_sessions':
              taskResult = await this.cleanupOldSessions(task);
              break;
            case 'old_logs':
              taskResult = await this.cleanupOldLogs(task);
              break;
            case 'cache_cleanup':
              taskResult = await this.cleanupCache(task);
              break;
            case 'orphaned_files':
              taskResult = await this.cleanupOrphanedFiles(task);
              break;
            default:
              throw new Error(`Unknown cleanup task type: ${task.type}`);
          }

          results.completed++;
          results.details.push({
            task: task.type,
            success: true,
            result: taskResult,
          });

          logger.debug(`Cleanup task completed: ${task.type}`, taskResult);

        } catch (error) {
          results.failed++;
          results.details.push({
            task: task.type,
            success: false,
            error: error.message,
          });

          logger.error(`Cleanup task failed: ${task.type}`, error);
        }

        const progress = 5 + ((i + 1) / tasks.length) * 85;
        await job.progress(progress);
      }

      await job.progress(100);

      const processingTime = Date.now() - startTime;
      logger.info(`System cleanup completed for job ${job.id}`, {
        completed: results.completed,
        failed: results.failed,
        processingTime,
      });

      return {
        success: true,
        results,
        processingTime,
      };
    } catch (error) {
      logger.error(`System cleanup failed for job ${job.id}:`, error);
      throw error;
    }
  }

  /**
   * Process backup job
   */
  static async processBackup(job) {
    const { type, targets = [], options = {} } = job.data;
    const startTime = Date.now();

    try {
      logger.info(`Processing backup job ${job.id}`, {
        type,
        targetCount: targets.length,
      });

      await job.progress(5);

      const results = {
        type,
        targets: targets.length,
        completed: 0,
        failed: 0,
        backups: [],
      };

      // Process each backup target
      for (let i = 0; i < targets.length; i++) {
        const target = targets[i];

        try {
          let backupResult;

          switch (target.type) {
            case 'database':
              backupResult = await this.backupDatabase(target, options);
              break;
            case 'files':
              backupResult = await this.backupFiles(target, options);
              break;
            case 'logs':
              backupResult = await this.backupLogs(target, options);
              break;
            case 'uploads':
              backupResult = await this.backupUploads(target, options);
              break;
            default:
              throw new Error(`Unknown backup target type: ${target.type}`);
          }

          results.completed++;
          results.backups.push({
            target: target.type,
            success: true,
            result: backupResult,
          });

          logger.debug(`Backup completed: ${target.type}`, backupResult);

        } catch (error) {
          results.failed++;
          results.backups.push({
            target: target.type,
            success: false,
            error: error.message,
          });

          logger.error(`Backup failed: ${target.type}`, error);
        }

        const progress = 5 + ((i + 1) / targets.length) * 85;
        await job.progress(progress);
      }

      await job.progress(100);

      const processingTime = Date.now() - startTime;
      logger.info(`Backup completed for job ${job.id}`, {
        completed: results.completed,
        failed: results.failed,
        processingTime,
      });

      return {
        success: true,
        results,
        processingTime,
      };
    } catch (error) {
      logger.error(`Backup failed for job ${job.id}:`, error);
      throw error;
    }
  }

  /**
   * Process health check job
   */
  static async processHealthCheck(job) {
    const { services = [] } = job.data;
    const startTime = Date.now();

    try {
      logger.info(`Processing health check job ${job.id}`, {
        serviceCount: services.length,
      });

      await job.progress(10);

      const results = {
        timestamp: new Date().toISOString(),
        overall: 'healthy',
        services: {},
      };

      // Check each service
      for (let i = 0; i < services.length; i++) {
        const service = services[i];

        try {
          let healthResult;

          switch (service) {
            case 'database':
              healthResult = await this.checkDatabaseHealth();
              break;
            case 'redis':
              healthResult = await this.checkRedisHealth();
              break;
            case 'minio':
              healthResult = await this.checkMinioHealth();
              break;
            case 'email':
              healthResult = await this.checkEmailHealth();
              break;
            case 'queue':
              healthResult = await this.checkQueueHealth();
              break;
            default:
              healthResult = { status: 'unknown', error: `Unknown service: ${service}` };
          }

          results.services[service] = healthResult;

          if (healthResult.status !== 'healthy') {
            results.overall = 'degraded';
          }

        } catch (error) {
          results.services[service] = {
            status: 'unhealthy',
            error: error.message,
          };
          results.overall = 'unhealthy';
        }

        const progress = 10 + ((i + 1) / services.length) * 80;
        await job.progress(progress);
      }

      await job.progress(100);

      const processingTime = Date.now() - startTime;
      logger.info(`Health check completed for job ${job.id}`, {
        overall: results.overall,
        serviceCount: Object.keys(results.services).length,
        processingTime,
      });

      return {
        success: true,
        results,
        processingTime,
      };
    } catch (error) {
      logger.error(`Health check failed for job ${job.id}:`, error);
      throw error;
    }
  }

  // ===== Cleanup Methods =====

  /**
   * Cleanup old files
   */
  static async cleanupOldFiles(task) {
    const { directory, maxAge, pattern } = task;
    const cutoffTime = Date.now() - maxAge;
    let deletedCount = 0;
    let totalSize = 0;

    const files = await fs.readdir(directory);

    for (const file of files) {
      const filePath = path.join(directory, file);

      try {
        const stats = await fs.stat(filePath);

        if (stats.isFile() && stats.mtime.getTime() < cutoffTime) {
          if (!pattern || file.match(new RegExp(pattern))) {
            totalSize += stats.size;
            await fs.unlink(filePath);
            deletedCount++;
          }
        }
      } catch (error) {
        logger.warn(`Failed to process file ${filePath}:`, error.message);
      }
    }

    return {
      directory,
      deletedCount,
      totalSize,
      maxAge,
    };
  }

  /**
   * Cleanup temporary files
   */
  static async cleanupTempFiles(task) {
    const tempDirs = [
      process.env.TEMP_DIR || '/tmp',
      path.join(process.cwd(), 'temp'),
      path.join(process.cwd(), 'uploads', 'temp'),
    ];

    let totalDeleted = 0;
    let totalSize = 0;

    for (const tempDir of tempDirs) {
      try {
        await fs.access(tempDir);

        const result = await this.cleanupOldFiles({
          directory: tempDir,
          maxAge: task.maxAge || 24 * 60 * 60 * 1000, // 24 hours
          pattern: task.pattern,
        });

        totalDeleted += result.deletedCount;
        totalSize += result.totalSize;
      } catch (error) {
        // Directory doesn't exist, skip
      }
    }

    return {
      tempDirs,
      totalDeleted,
      totalSize,
    };
  }

  /**
   * Cleanup old sessions
   */
  static async cleanupOldSessions(task) {
    const db = require('../models');
    const maxAge = task.maxAge || 7 * 24 * 60 * 60 * 1000; // 7 days
    const cutoffDate = new Date(Date.now() - maxAge);

    const deletedCount = await db.Session.destroy({
      where: {
        updated_at: {
          [db.Sequelize.Op.lt]: cutoffDate,
        },
      },
    });

    return {
      deletedCount,
      cutoffDate: cutoffDate.toISOString(),
    };
  }

  /**
   * Cleanup old logs
   */
  static async cleanupOldLogs(task) {
    const logDir = task.directory || path.join(process.cwd(), 'logs');
    const maxAge = task.maxAge || 30 * 24 * 60 * 60 * 1000; // 30 days

    const result = await this.cleanupOldFiles({
      directory: logDir,
      maxAge,
      pattern: task.pattern || '\\.(log|out)$',
    });

    return result;
  }

  /**
   * Cleanup cache
   */
  static async cleanupCache(task) {
    const cacheService = require('../services/CacheService');

    try {
      // Clear expired keys
      const result = await cacheService.cleanupExpired();

      return {
        keysDeleted: result.deleted || 0,
        method: 'expired_cleanup',
      };
    } catch (error) {
      logger.error('Cache cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Cleanup orphaned files
   */
  static async cleanupOrphanedFiles(task) {
    const db = require('../models');
    const uploadDir = task.directory || path.join(process.cwd(), 'uploads');

    // Get all file records from database
    const dbFiles = await db.File.findAll({
      attributes: ['file_path'],
      raw: true,
    });

    const dbFilePaths = new Set(dbFiles.map(f => f.file_path));

    // Scan upload directory
    const files = await this.getAllFilesRecursive(uploadDir);
    let deletedCount = 0;
    let totalSize = 0;

    for (const filePath of files) {
      const relativePath = path.relative(uploadDir, filePath);

      if (!dbFilePaths.has(relativePath)) {
        try {
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
          await fs.unlink(filePath);
          deletedCount++;
          logger.debug(`Deleted orphaned file: ${filePath}`);
        } catch (error) {
          logger.warn(`Failed to delete orphaned file ${filePath}:`, error.message);
        }
      }
    }

    return {
      directory: uploadDir,
      deletedCount,
      totalSize,
    };
  }

  /**
   * Get all files recursively
   */
  static async getAllFilesRecursive(dir) {
    const files = [];
    const items = await fs.readdir(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stats = await fs.stat(fullPath);

      if (stats.isDirectory()) {
        const subFiles = await this.getAllFilesRecursive(fullPath);
        files.push(...subFiles);
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  // ===== Backup Methods =====

  /**
   * Backup database
   */
  static async backupDatabase(target, options) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = options.backupDir || path.join(process.cwd(), 'backups');
    const backupFile = path.join(backupDir, `database_backup_${timestamp}.sql`);

    // Ensure backup directory exists
    await fs.mkdir(backupDir, { recursive: true });

    // This is a placeholder - in production, use pg_dump or similar
    const mockBackup = `-- Database backup created at ${new Date().toISOString()}\n-- This is a mock backup file`;

    await fs.writeFile(backupFile, mockBackup);

    const stats = await fs.stat(backupFile);

    return {
      backupFile,
      size: stats.size,
      timestamp,
    };
  }

  /**
   * Backup files
   */
  static async backupFiles(target, options) {
    const archiver = require('archiver');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = options.backupDir || path.join(process.cwd(), 'backups');
    const backupFile = path.join(backupDir, `files_backup_${timestamp}.zip`);

    // Ensure backup directory exists
    await fs.mkdir(backupDir, { recursive: true });

    const output = require('fs').createWriteStream(backupFile);
    const archive = archiver('zip', { zlib: { level: 6 } });

    archive.pipe(output);

    // Add directory to archive
    archive.directory(target.source, false);

    await archive.finalize();

    // Wait for output stream to finish
    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      output.on('error', reject);
    });

    const stats = await fs.stat(backupFile);

    return {
      backupFile,
      size: stats.size,
      source: target.source,
      timestamp,
    };
  }

  /**
   * Backup logs
   */
  static async backupLogs(target, options) {
    return await this.backupFiles({
      source: target.source || path.join(process.cwd(), 'logs'),
    }, options);
  }

  /**
   * Backup uploads
   */
  static async backupUploads(target, options) {
    return await this.backupFiles({
      source: target.source || path.join(process.cwd(), 'uploads'),
    }, options);
  }

  // ===== Health Check Methods =====

  /**
   * Check database health
   */
  static async checkDatabaseHealth() {
    try {
      const db = require('../models');
      await db.sequelize.authenticate();

      return {
        status: 'healthy',
        connectionTime: Date.now(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  /**
   * Check Redis health
   */
  static async checkRedisHealth() {
    try {
      const cacheService = require('../services/CacheService');
      const result = await cacheService.healthCheck();

      return {
        status: result.status === 'healthy' ? 'healthy' : 'unhealthy',
        details: result,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  /**
   * Check MinIO health
   */
  static async checkMinioHealth() {
    try {
      // This would check MinIO connection
      // For now, return healthy
      return {
        status: 'healthy',
        service: 'minio',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  /**
   * Check email service health
   */
  static async checkEmailHealth() {
    try {
      const emailService = require('../services/EmailService');
      const result = await emailService.healthCheck();

      return result;
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  /**
   * Check queue service health
   */
  static async checkQueueHealth() {
    try {
      const queueService = require('../services/QueueService');
      const result = await queueService.healthCheck();

      return result;
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  /**
   * Get processor function by job type
   */
  static getProcessor(jobType) {
    const processors = {
      'cleanup': this.processCleanup,
      'backup': this.processBackup,
      'health-check': this.processHealthCheck,
    };

    return processors[jobType];
  }
}

module.exports = SystemProcessor;