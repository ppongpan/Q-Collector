/**
 * Q-Collector File Job Processor
 * Handles file processing jobs in background queue
 */

const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const logger = require('../utils/logger.util');

class FileProcessor {
  /**
   * Process image file (resize, optimize, generate thumbnails)
   */
  static async processImageFile(job) {
    const { filePath, outputDir, options = {} } = job.data;
    const startTime = Date.now();

    try {
      logger.info(`Processing image file job ${job.id}`, {
        filePath,
        outputDir,
      });

      await job.progress(10);

      // Validate input file
      await this.validateFile(filePath);

      await job.progress(20);

      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true });

      await job.progress(30);

      // Get image metadata
      const metadata = await sharp(filePath).metadata();
      logger.debug(`Image metadata:`, metadata);

      await job.progress(40);

      const results = {};

      // Generate thumbnails
      if (options.generateThumbnails !== false) {
        const thumbnailSizes = options.thumbnailSizes || [
          { name: 'small', width: 150, height: 150 },
          { name: 'medium', width: 300, height: 300 },
          { name: 'large', width: 600, height: 600 },
        ];

        for (let i = 0; i < thumbnailSizes.length; i++) {
          const size = thumbnailSizes[i];
          const thumbnailPath = path.join(
            outputDir,
            `thumbnail_${size.name}_${path.basename(filePath)}`
          );

          await sharp(filePath)
            .resize(size.width, size.height, {
              fit: 'inside',
              withoutEnlargement: true,
            })
            .jpeg({ quality: 85 })
            .toFile(thumbnailPath);

          results[`thumbnail_${size.name}`] = thumbnailPath;

          const progress = 40 + ((i + 1) / thumbnailSizes.length) * 30;
          await job.progress(progress);
        }
      }

      // Optimize original image
      if (options.optimizeOriginal !== false) {
        const optimizedPath = path.join(
          outputDir,
          `optimized_${path.basename(filePath)}`
        );

        await sharp(filePath)
          .jpeg({ quality: options.quality || 85 })
          .toFile(optimizedPath);

        results.optimized = optimizedPath;
        await job.progress(80);
      }

      // Generate WebP version
      if (options.generateWebP !== false) {
        const webpPath = path.join(
          outputDir,
          `${path.parse(filePath).name}.webp`
        );

        await sharp(filePath)
          .webp({ quality: options.webpQuality || 80 })
          .toFile(webpPath);

        results.webp = webpPath;
        await job.progress(90);
      }

      await job.progress(100);

      const processingTime = Date.now() - startTime;
      logger.info(`Image processing completed for job ${job.id}`, {
        processingTime,
        results: Object.keys(results),
      });

      return {
        success: true,
        originalFile: filePath,
        metadata,
        results,
        processingTime,
      };
    } catch (error) {
      logger.error(`Image processing failed for job ${job.id}:`, error);
      throw error;
    }
  }

  /**
   * Process file cleanup job
   */
  static async processFileCleanup(job) {
    const { files, olderThan } = job.data;
    const startTime = Date.now();

    try {
      logger.info(`Processing file cleanup job ${job.id}`, {
        fileCount: files.length,
        olderThan,
      });

      await job.progress(10);

      const results = {
        total: files.length,
        deleted: 0,
        failed: 0,
        errors: [],
      };

      const cutoffDate = new Date(Date.now() - olderThan);

      for (let i = 0; i < files.length; i++) {
        const filePath = files[i];

        try {
          // Check if file exists and get stats
          const stats = await fs.stat(filePath);

          // Check if file is older than cutoff
          if (stats.mtime < cutoffDate) {
            await fs.unlink(filePath);
            results.deleted++;
            logger.debug(`Deleted old file: ${filePath}`);
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            file: filePath,
            error: error.message,
          });
          logger.warn(`Failed to delete file ${filePath}:`, error.message);
        }

        const progress = 10 + ((i + 1) / files.length) * 80;
        await job.progress(progress);
      }

      await job.progress(100);

      const processingTime = Date.now() - startTime;
      logger.info(`File cleanup completed for job ${job.id}`, {
        ...results,
        processingTime,
      });

      return {
        success: true,
        ...results,
        processingTime,
      };
    } catch (error) {
      logger.error(`File cleanup failed for job ${job.id}:`, error);
      throw error;
    }
  }

  /**
   * Process file compression job
   */
  static async processFileCompression(job) {
    const { inputFiles, outputDir, compressionLevel = 6 } = job.data;
    const startTime = Date.now();

    try {
      const archiver = require('archiver');
      const stream = require('stream');

      logger.info(`Processing file compression job ${job.id}`, {
        fileCount: inputFiles.length,
        outputDir,
      });

      await job.progress(10);

      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true });

      await job.progress(20);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const zipPath = path.join(outputDir, `archive_${timestamp}.zip`);

      // Create write stream
      const output = require('fs').createWriteStream(zipPath);
      const archive = archiver('zip', {
        zlib: { level: compressionLevel },
      });

      // Setup progress tracking
      let processedFiles = 0;

      // Pipe archive data to the file
      archive.pipe(output);

      // Add files to archive
      for (const inputFile of inputFiles) {
        try {
          const fileName = path.basename(inputFile);
          archive.file(inputFile, { name: fileName });
          processedFiles++;

          const progress = 20 + (processedFiles / inputFiles.length) * 60;
          await job.progress(progress);
        } catch (error) {
          logger.warn(`Failed to add file to archive: ${inputFile}`, error);
        }
      }

      await job.progress(85);

      // Finalize the archive
      await archive.finalize();

      // Wait for output stream to finish
      await new Promise((resolve, reject) => {
        output.on('close', resolve);
        output.on('error', reject);
      });

      await job.progress(95);

      // Get final archive stats
      const stats = await fs.stat(zipPath);

      await job.progress(100);

      const processingTime = Date.now() - startTime;
      logger.info(`File compression completed for job ${job.id}`, {
        archivePath: zipPath,
        archiveSize: stats.size,
        filesCompressed: processedFiles,
        processingTime,
      });

      return {
        success: true,
        archivePath: zipPath,
        archiveSize: stats.size,
        filesCompressed: processedFiles,
        totalFiles: inputFiles.length,
        processingTime,
      };
    } catch (error) {
      logger.error(`File compression failed for job ${job.id}:`, error);
      throw error;
    }
  }

  /**
   * Process virus scan job
   */
  static async processVirusScan(job) {
    const { filePath, scanOptions = {} } = job.data;
    const startTime = Date.now();

    try {
      logger.info(`Processing virus scan job ${job.id}`, {
        filePath,
      });

      await job.progress(10);

      // Validate file exists
      await this.validateFile(filePath);

      await job.progress(30);

      // Simulate virus scan (replace with actual antivirus integration)
      const result = await this.performVirusScan(filePath, scanOptions);

      await job.progress(80);

      // Log results
      if (result.infected) {
        logger.warn(`Virus detected in file ${filePath}:`, result);
      } else {
        logger.info(`File ${filePath} is clean`);
      }

      await job.progress(100);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        filePath,
        scanResult: result,
        processingTime,
      };
    } catch (error) {
      logger.error(`Virus scan failed for job ${job.id}:`, error);
      throw error;
    }
  }

  /**
   * Perform virus scan (placeholder - integrate with actual antivirus)
   */
  static async performVirusScan(filePath, options) {
    // This is a placeholder implementation
    // In a real implementation, integrate with ClamAV, Windows Defender, or other antivirus

    const stats = await fs.stat(filePath);

    // Simulate scan delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simple checks (replace with actual antivirus integration)
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif'];
    const ext = path.extname(filePath).toLowerCase();

    return {
      infected: false, // Would be determined by actual antivirus
      threats: [], // Would contain threat names if any
      scanTime: Date.now(),
      fileSize: stats.size,
      suspicious: suspiciousExtensions.includes(ext),
      engine: 'placeholder-scanner',
      version: '1.0.0',
    };
  }

  /**
   * Validate file exists and is readable
   */
  static async validateFile(filePath) {
    try {
      await fs.access(filePath, fs.constants.R_OK);
      const stats = await fs.stat(filePath);

      if (!stats.isFile()) {
        throw new Error(`Path is not a file: ${filePath}`);
      }

      return stats;
    } catch (error) {
      throw new Error(`File validation failed: ${error.message}`);
    }
  }

  /**
   * Get processor function by job type
   */
  static getProcessor(jobType) {
    const processors = {
      'image-process': this.processImageFile,
      'cleanup': this.processFileCleanup,
      'compress': this.processFileCompression,
      'virus-scan': this.processVirusScan,
    };

    return processors[jobType];
  }
}

module.exports = FileProcessor;