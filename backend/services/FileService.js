/**
 * File Service
 * Handles file uploads to MinIO with database tracking
 */

const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { File, Submission, Field, User, AuditLog } = require('../models');
const minioClient = require('../config/minio.config');
const logger = require('../utils/logger.util');
const { ApiError } = require('../middleware/error.middleware');
const { generateChecksum } = require('../utils/encryption.util');

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
      if (submissionId) {
        const submission = await Submission.findByPk(submissionId);
        if (!submission) {
          throw new ApiError(404, 'Submission not found', 'SUBMISSION_NOT_FOUND');
        }

        // Check ownership
        if (submission.submitted_by !== userId) {
          const user = await User.findByPk(userId);
          if (user.role !== 'admin') {
            throw new ApiError(403, 'Not authorized to upload to this submission', 'FORBIDDEN');
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
      const fileRecord = await File.create({
        submission_id: submissionId,
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
        },
      });

      logger.info(`File uploaded: ${uniqueFileName} by user ${userId}`);

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

      // Generate presigned URL
      const downloadUrl = await minioClient.getPresignedUrl(
        file.minio_path,
        expirySeconds
      );

      return {
        ...file.toJSON(),
        downloadUrl,
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

      if (filters.submissionId) {
        where.submission_id = filters.submissionId;
      }

      // Pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const offset = (page - 1) * limit;

      const { count, rows } = await File.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'uploader',
            attributes: ['id', 'username', 'email'],
          },
          {
            model: Field,
            as: 'field',
            attributes: ['id', 'title', 'type'],
          },
        ],
        order: [['uploaded_at', 'DESC']],
        limit,
        offset,
      });

      return {
        files: rows.map((f) => f.toJSON()),
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
          hasMore: page * limit < count,
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
   * @param {Object} file - File object
   * @param {Object} limits - Upload limits
   * @returns {Object} Validation result
   */
  static validateFile(file, limits = {}) {
    const maxSize = limits.maxSize || 10 * 1024 * 1024; // 10MB default
    const allowedTypes = limits.allowedTypes || [];

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

    return { valid: true };
  }
}

module.exports = FileService;