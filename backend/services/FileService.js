/**
 * File Service
 * Handles file uploads to MinIO with database tracking
 */

const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const { File, Submission, Field, User, AuditLog } = require('../models');
const minioClient = require('../config/minio.config');
const logger = require('../utils/logger.util');
const { ApiError } = require('../middleware/error.middleware');
const { generateChecksum } = require('../utils/encryption.util');
const imageProcessingService = require('./ImageProcessingService');

class FileService {
  /**
   * Upload file to MinIO and create database record
   * @param {Object} file - Multer file object
   * @param {string} userId - User ID
   * @param {Object} metadata - Additional file metadata
   * @returns {Promise<Object>} Created file record
   */
  static async uploadFile(file, userId, metadata = {}) {
    try {
      const { submissionId, fieldId } = metadata;

      // Validate submission and field
      // ✅ FIX: Allow file upload without submissionId (for new fields in edit mode)
      // Only validate submission if submissionId is provided AND it's not null
      if (submissionId && submissionId !== 'null' && submissionId !== null) {
        const submission = await Submission.findByPk(submissionId);

        // ✅ Only throw error if it's supposed to be a main form submission
        // Sub-form submissions are stored in dynamic tables, so we can't validate them here
        if (!submission) {
          logger.warn(`Submission ${submissionId} not found - might be a sub-form submission in dynamic table`);
          // Don't throw error - allow upload to continue
        } else {
          // Check ownership only if submission exists in main submissions table
          if (submission.submitted_by !== userId) {
            const user = await User.findByPk(userId);
            if (user.role !== 'admin') {
              throw new ApiError(403, 'Not authorized to upload to this submission', 'FORBIDDEN');
            }
          }
        }
      }

      if (fieldId) {
        const field = await Field.findByPk(fieldId);
        if (!field) {
          throw new ApiError(404, 'Field not found', 'FIELD_NOT_FOUND');
        }

        // Validate field type
        if (!['file_upload', 'image_upload'].includes(field.type)) {
          throw new ApiError(400, 'Field does not support file uploads', 'INVALID_FIELD_TYPE');
        }

        // Validate image type if image_upload field
        if (field.type === 'image_upload' && !file.mimetype.startsWith('image/')) {
          throw new ApiError(400, 'Only image files allowed for this field', 'INVALID_FILE_TYPE');
        }
      }

      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const uniqueFileName = `${uuidv4()}${fileExtension}`;
      const minioPath = `uploads/${userId}/${uniqueFileName}`;

      // Generate checksum
      const checksum = generateChecksum(file.buffer);

      // Upload to MinIO
      await minioClient.uploadFile(
        file.buffer,
        minioPath,
        file.mimetype,
        {
          'original-name': file.originalname,
          'uploaded-by': userId,
          'checksum': checksum,
        }
      );

      // Create database record
      // ✅ FIX: Only set submission_id if it exists in submissions table
      // For sub-form submissions, set to null (they're in dynamic tables)
      let validSubmissionId = null;
      if (submissionId && submissionId !== 'null') {
        const submission = await Submission.findByPk(submissionId);
        if (submission) {
          validSubmissionId = submissionId;
        } else {
          logger.info(`Submission ${submissionId} not in submissions table (sub-form) - setting submission_id to null`);
        }
      }

      // Generate image variants for Progressive Image Loading (v0.7.30)
      let blurPreview = null;
      let thumbnailPath = null;
      let fullPath = minioPath; // Default to original path

      if (file.mimetype.startsWith('image/') && imageProcessingService.isImage(file.originalname)) {
        try {
          logger.info(`📸 [Progressive Loading] Generating image variants for ${file.originalname}`);

          // Save buffer to temporary file for Sharp processing
          const tempFilePath = path.join(os.tmpdir(), uniqueFileName);
          await fs.writeFile(tempFilePath, file.buffer);

          // Generate variants
          const variants = await imageProcessingService.generateImageVariants(
            tempFilePath,
            uuidv4(), // Use a temporary ID, we'll use the real fileRecord.id later
            file.originalname
          );

          blurPreview = variants.blurPreview;
          thumbnailPath = variants.thumbnailPath;
          fullPath = variants.fullPath || minioPath;

          // Clean up temp file
          await fs.unlink(tempFilePath);

          logger.info(`✅ [Progressive Loading] Generated variants: blur=${Math.round(Buffer.from(blurPreview.split(',')[1], 'base64').length / 1024)}KB, thumbnail=${thumbnailPath}`);
        } catch (error) {
          logger.error(`❌ [Progressive Loading] Failed to generate variants: ${error.message}`);
          logger.error(`   Continuing with upload, variants will be null`);
          // Don't throw - continue with upload even if variant generation fails
        }
      }

      const fileRecord = await File.create({
        submission_id: validSubmissionId,
        field_id: fieldId,
        filename: uniqueFileName,
        original_name: file.originalname,
        mime_type: file.mimetype,
        size: file.size,
        minio_path: minioPath,
        minio_bucket: minioClient.config.bucket,
        checksum,
        uploaded_by: userId,
        uploaded_at: new Date(),
        // Progressive Image Loading fields (v0.7.30)
        blur_preview: blurPreview,
        thumbnail_path: thumbnailPath,
        full_path: fullPath,
      });

      // Create audit log
      await AuditLog.logAction({
        userId,
        action: 'create',
        entityType: 'file',
        entityId: fileRecord.id,
        newValue: {
          filename: uniqueFileName,
          size: file.size,
          mimeType: file.mimetype,
          hasImageVariants: blurPreview !== null,
        },
      });

      logger.info(`File uploaded: ${uniqueFileName} by user ${userId}${blurPreview ? ' (with image variants)' : ''}`);

      return fileRecord.toJSON();
    } catch (error) {
      logger.error('File upload failed:', error);
      throw error;
    }
  }

  /**
   * Get file metadata and presigned URL
   * @param {string} fileId - File ID
   * @param {string} userId - User ID
   * @param {number} expirySeconds - URL expiry time
   * @returns {Promise<Object>} File with presigned URL
   */
  static async getFile(fileId, userId, expirySeconds = 3600) {
    try {
      const file = await File.findByPk(fileId, {
        include: [
          {
            model: Submission,
            as: 'submission',
          },
          {
            model: Field,
            as: 'field',
          },
          {
            model: User,
            as: 'uploader',
            attributes: ['id', 'username', 'email'],
          },
        ],
      });

      if (!file) {
        throw new ApiError(404, 'File not found', 'FILE_NOT_FOUND');
      }

      // Check access permission
      const user = await User.findByPk(userId);
      const hasAccess =
        file.uploaded_by === userId ||
        (file.submission && file.submission.submitted_by === userId) ||
        user.role === 'admin' ||
        user.role === 'manager';

      if (!hasAccess) {
        throw new ApiError(403, 'Access denied to this file', 'FORBIDDEN');
      }

      // ✅ MOBILE FIX: Don't generate presignedUrl (uses localhost:9000)
      // Frontend now uses API stream endpoint instead (/api/v1/files/:id/stream)
      // This works with ngrok single-tunnel setup (port 3000 → React proxy → port 5000 → MinIO)

      return {
        ...file.toJSON(),
        // downloadUrl removed - frontend uses API endpoints
        // presignedUrl removed - frontend uses getFileStreamURL() helper
        expiresAt: new Date(Date.now() + expirySeconds * 1000),
      };
    } catch (error) {
      logger.error('Get file failed:', error);
      throw error;
    }
  }

  /**
   * Download file from MinIO
   * @param {string} fileId - File ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} File stream and metadata
   */
  static async downloadFile(fileId, userId) {
    try {
      const file = await File.findByPk(fileId, {
        include: [
          {
            model: Submission,
            as: 'submission',
          },
        ],
      });

      if (!file) {
        throw new ApiError(404, 'File not found', 'FILE_NOT_FOUND');
      }

      // Check access permission
      const user = await User.findByPk(userId);
      const hasAccess =
        file.uploaded_by === userId ||
        (file.submission && file.submission.submitted_by === userId) ||
        user.role === 'admin' ||
        user.role === 'manager';

      if (!hasAccess) {
        throw new ApiError(403, 'Access denied to this file', 'FORBIDDEN');
      }

      // Get file stream from MinIO
      const stream = await minioClient.downloadFile(file.minio_path);

      return {
        stream,
        filename: file.original_name,
        mimeType: file.mime_type,
        size: file.size,
      };
    } catch (error) {
      logger.error('File download failed:', error);
      throw error;
    }
  }

  /**
   * Delete file from MinIO and database
   * @param {string} fileId - File ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>}
   */
  static async deleteFile(fileId, userId) {
    try {
      const file = await File.findByPk(fileId);

      if (!file) {
        throw new ApiError(404, 'File not found', 'FILE_NOT_FOUND');
      }

      // Check permission
      const user = await User.findByPk(userId);
      if (file.uploaded_by !== userId && user.role !== 'admin') {
        throw new ApiError(403, 'Not authorized to delete this file', 'FORBIDDEN');
      }

      // Delete from MinIO
      await minioClient.deleteFile(file.minio_path);

      // Create audit log before deletion
      await AuditLog.logAction({
        userId,
        action: 'delete',
        entityType: 'file',
        entityId: fileId,
        oldValue: {
          filename: file.filename,
          size: file.size,
        },
      });

      // Delete from database
      await file.destroy();

      logger.info(`File deleted: ${fileId} by user ${userId}`);

      return true;
    } catch (error) {
      logger.error('File deletion failed:', error);
      throw error;
    }
  }

  /**
   * List files for a user
   * @param {string} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Files with pagination
   */
  static async listFiles(userId, filters = {}) {
    try {
      const user = await User.findByPk(userId);

      const where = {};

      // Regular users see only their files
      if (user.role !== 'admin' && user.role !== 'manager') {
        where.uploaded_by = userId;
      }

      // Apply filters
      if (filters.mimeType) {
        where.mime_type = filters.mimeType;
      }

      // ✅ NOTE: We don't filter by submission_id here because:
      // 1. Files uploaded during form creation have submission_id = NULL
      // 2. We need to include those files when editing the submission
      // 3. The sub-form filtering happens post-query based on field.sub_form_id
      // if (filters.submissionId) {
      //   where.submission_id = filters.submissionId;
      // }

      // Pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const offset = (page - 1) * limit;

      // Build includes with optional sub-form filtering
      const includes = [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'username', 'email'],
        },
        {
          model: Field,
          as: 'field',
          attributes: ['id', 'title', 'type', 'sub_form_id'],
          required: false  // LEFT JOIN - include files even without field
        },
      ];

      const { count, rows } = await File.findAndCountAll({
        where,
        include: includes,
        order: [['uploaded_at', 'DESC']],
        limit,
        offset,
      });

      // 🔍 DEBUG: Log query results
      logger.info(`📊 Query results: count=${count}, rows.length=${rows.length}`);
      logger.info(`📋 WHERE clause: ${JSON.stringify(where)}`);
      logger.info(`👤 User: ${userId}, Role: ${user.role}`);

      // ✅ CRITICAL FIX v0.7.29: Only return files that EXACTLY match the submission_id
      // DO NOT include files with submission_id = NULL even if they match field_id
      // Files with NULL submission_id are orphaned and should not appear in any submission
      let filteredFiles = rows;
      if (filters.submissionId) {
        logger.info(`🔍 [v0.7.29] Filtering files for submission ${filters.submissionId}:`);
        logger.info(`📊 Total files from query: ${rows.length}`);

        filteredFiles = rows.filter(file => {
          // ✅ FIX: Use dataValues to avoid Sequelize UUID serialization bug
          const fileData = file.dataValues || file;
          const fileId = fileData.id || file.id;
          const submissionId = fileData.submission_id || file.submission_id;
          const fieldId = fileData.field_id || file.field_id;

          // ✅ CRITICAL FIX: ONLY keep files where submission_id exactly matches
          // Reject ALL files with NULL submission_id (orphaned files)
          // Reject ALL files from other submissions (even if field_id matches)
          const matchesSubmission = submissionId === filters.submissionId;

          logger.info(`📄 File ${fileId ? fileId.substring(0, 8) : 'NO-ID'}: submission_id=${submissionId ? submissionId.substring(0, 8) : 'NULL'}, field_id=${fieldId ? fieldId.substring(0, 8) : 'NULL'}, matchesSubmission=${matchesSubmission}`);

          return matchesSubmission;
        });

        logger.info(`✅ [v0.7.29] Files after filtering: ${filteredFiles.length} (strict submission_id match only)`);
      }

      return {
        files: filteredFiles.map((f) => f.toJSON()),
        pagination: {
          total: filteredFiles.length,  // Use filtered count
          page,
          limit,
          totalPages: Math.ceil(filteredFiles.length / limit),
          hasMore: page * limit < filteredFiles.length,
        },
      };
    } catch (error) {
      logger.error('List files failed:', error);
      throw error;
    }
  }

  /**
   * Get file statistics
   * @param {string} userId - User ID (optional for admin)
   * @returns {Promise<Object>} File statistics
   */
  static async getFileStatistics(userId) {
    try {
      const user = await User.findByPk(userId);

      if (user.role === 'admin') {
        // Admin sees all statistics
        return await File.getStatistics();
      } else {
        // User sees only their statistics
        const totalSize = await File.getTotalSizeByUser(userId);
        const totalFiles = await File.count({
          where: { uploaded_by: userId },
        });

        return {
          totalFiles,
          totalSize,
          averageSize: totalFiles > 0 ? Math.floor(totalSize / totalFiles) : 0,
        };
      }
    } catch (error) {
      logger.error('Get file statistics failed:', error);
      throw error;
    }
  }

  /**
   * Validate file before upload
   * Enhanced with extension validation and filename sanitization (v0.8.2 Security Update)
   * @param {Object} file - File object
   * @param {Object} limits - Upload limits
   * @returns {Object} Validation result
   */
  static validateFile(file, limits = {}) {
    const maxSize = limits.maxSize || 10 * 1024 * 1024; // 10MB default
    const allowedTypes = limits.allowedTypes || [];
    const allowedExtensions = limits.allowedExtensions || [];

    // Check file size
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${Math.floor(maxSize / 1024 / 1024)}MB`,
      };
    }

    // Check mime type if restrictions exist
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: `File type ${file.mimetype} is not allowed`,
      };
    }

    // Enhanced: Validate file extension (v0.8.2)
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.length > 0 && !allowedExtensions.includes(fileExtension)) {
      return {
        valid: false,
        error: `File extension ${fileExtension} is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`,
      };
    }

    // Enhanced: Validate extension matches MIME type (v0.8.2)
    const mimeExtensionMap = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
    };

    const expectedExtensions = mimeExtensionMap[file.mimetype];
    if (expectedExtensions && !expectedExtensions.includes(fileExtension)) {
      return {
        valid: false,
        error: `File extension ${fileExtension} does not match MIME type ${file.mimetype}`,
      };
    }

    // Enhanced: Sanitize filename (v0.8.2)
    const sanitizedName = this.sanitizeFilename(file.originalname);
    if (sanitizedName !== file.originalname) {
      logger.warn(`Filename sanitized: "${file.originalname}" -> "${sanitizedName}"`);
    }

    return { valid: true, sanitizedName };
  }

  /**
   * Sanitize filename to prevent directory traversal and special character attacks
   * @param {string} filename - Original filename
   * @returns {string} Sanitized filename
   */
  static sanitizeFilename(filename) {
    // Remove path separators and null bytes
    let sanitized = filename.replace(/[\/\\]/g, '_').replace(/\0/g, '');

    // Remove potentially dangerous characters
    sanitized = sanitized.replace(/[<>:"|?*]/g, '_');

    // Remove leading/trailing dots and spaces
    sanitized = sanitized.trim().replace(/^\.+/, '').replace(/\.+$/, '');

    // Limit filename length (excluding extension)
    const ext = path.extname(sanitized);
    const nameWithoutExt = path.basename(sanitized, ext);
    const maxNameLength = 100;

    if (nameWithoutExt.length > maxNameLength) {
      sanitized = nameWithoutExt.substring(0, maxNameLength) + ext;
    }

    // If filename becomes empty after sanitization, use a default name
    if (!sanitized || sanitized === ext) {
      sanitized = `file_${Date.now()}${ext}`;
    }

    return sanitized;
  }
}

module.exports = FileService;