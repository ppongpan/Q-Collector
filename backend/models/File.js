/**
 * File Model
 * Manages file uploads with MinIO storage references
 */

module.exports = (sequelize, DataTypes) => {
  const File = sequelize.define('File', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    submission_id: {
      type: DataTypes.UUID,
      allowNull: true,  // Allow null for files uploaded before submission creation
      references: {
        model: 'submissions',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    field_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'fields',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    filename: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Generated unique filename',
    },
    original_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Original filename from upload',
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    size: {
      type: DataTypes.BIGINT,
      allowNull: false,
      validate: {
        min: 0,
      },
      comment: 'File size in bytes',
    },
    minio_path: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Full path in MinIO bucket',
    },
    minio_bucket: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'qcollector',
    },
    checksum: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: 'MD5 or SHA256 checksum',
    },
    uploaded_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    uploaded_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    // Progressive Image Loading columns (v0.7.30)
    blur_preview: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Base64 data URL for blur preview (20x20px, inline, no HTTP request)',
    },
    thumbnail_path: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'MinIO path to thumbnail image (400px width, 50-100KB)',
    },
    full_path: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'MinIO path to full resolution image',
    },
  }, {
    tableName: 'files',
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ['submission_id'] },
      { fields: ['field_id'] },
      { fields: ['uploaded_by'] },
      { fields: ['mime_type'] },
      { fields: ['uploaded_at'] },
    ],
  });

  /**
   * Instance Methods
   */

  /**
   * Get file size in human-readable format
   * @returns {string}
   */
  File.prototype.getHumanSize = function() {
    const bytes = this.size;
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  /**
   * Check if file is an image
   * @returns {boolean}
   */
  File.prototype.isImage = function() {
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    return imageTypes.includes(this.mime_type);
  };

  /**
   * Check if file is a document
   * @returns {boolean}
   */
  File.prototype.isDocument = function() {
    const docTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    return docTypes.includes(this.mime_type);
  };

  /**
   * Get file extension from original name
   * @returns {string}
   */
  File.prototype.getExtension = function() {
    const parts = this.original_name.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
  };

  /**
   * Get MinIO download URL
   * @param {number} expirySeconds - URL expiry time (default: 1 hour)
   * @returns {string}
   */
  File.prototype.getDownloadUrl = function(expirySeconds = 3600) {
    // This would be implemented with MinIO client
    // For now, return a placeholder
    return `/api/v1/files/${this.id}/download`;
  };

  /**
   * Convert to JSON with additional metadata
   * ✅ Returns camelCase properties for frontend compatibility
   * @returns {Object}
   */
  File.prototype.toJSON = function() {
    const values = { ...this.get() };

    // Convert snake_case database fields to camelCase for frontend
    const camelCaseValues = {
      id: values.id,
      submissionId: values.submission_id,
      fieldId: values.field_id,
      filename: values.filename,
      originalName: values.original_name,  // ✅ Convert snake_case to camelCase
      mimeType: values.mime_type,          // ✅ Convert snake_case to camelCase
      size: values.size,
      minioPath: values.minio_path,
      minioBucket: values.minio_bucket,
      checksum: values.checksum,
      uploadedBy: values.uploaded_by,
      uploadedAt: values.uploaded_at,
      createdAt: values.createdAt,
      updatedAt: values.updatedAt,
      // Progressive Image Loading fields (v0.7.30)
      blurPreview: values.blur_preview,
      thumbnailPath: values.thumbnail_path,
      fullPath: values.full_path,
      // Additional metadata
      humanSize: this.getHumanSize(),
      isImage: this.isImage(),
      isDocument: this.isDocument(),
      extension: this.getExtension(),
      downloadUrl: this.getDownloadUrl()
    };

    return camelCaseValues;
  };

  /**
   * Class Methods
   */

  /**
   * Find files by submission
   * @param {string} submissionId - Submission ID
   * @returns {Promise<File[]>}
   */
  File.findBySubmission = async function(submissionId) {
    return await File.findAll({
      where: { submission_id: submissionId },
      include: [
        {
          model: sequelize.models.Field,
          as: 'field',
          attributes: ['id', 'title', 'type'],
        },
        {
          model: sequelize.models.User,
          as: 'uploader',
          attributes: ['id', 'username', 'email'],
        },
      ],
      order: [['uploaded_at', 'DESC']],
    });
  };

  /**
   * Find files by field
   * @param {string} fieldId - Field ID
   * @returns {Promise<File[]>}
   */
  File.findByField = async function(fieldId) {
    return await File.findAll({
      where: { field_id: fieldId },
      order: [['uploaded_at', 'DESC']],
    });
  };

  /**
   * Get total storage used by user
   * @param {string} userId - User ID
   * @returns {Promise<number>}
   */
  File.getTotalSizeByUser = async function(userId) {
    const result = await File.findOne({
      where: { uploaded_by: userId },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('size')), 'totalSize'],
      ],
      raw: true,
    });

    return parseInt(result.totalSize || 0);
  };

  /**
   * Get files by mime type
   * @param {string} mimeType - MIME type
   * @param {Object} options - Query options
   * @returns {Promise<File[]>}
   */
  File.findByMimeType = async function(mimeType, options = {}) {
    return await File.findAll({
      where: { mime_type: mimeType },
      order: [['uploaded_at', 'DESC']],
      ...options,
    });
  };

  /**
   * Get storage statistics
   * @returns {Promise<Object>}
   */
  File.getStatistics = async function() {
    const stats = await File.findOne({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalFiles'],
        [sequelize.fn('SUM', sequelize.col('size')), 'totalSize'],
        [sequelize.fn('AVG', sequelize.col('size')), 'averageSize'],
      ],
      raw: true,
    });

    return {
      totalFiles: parseInt(stats.totalFiles || 0),
      totalSize: parseInt(stats.totalSize || 0),
      averageSize: parseInt(stats.averageSize || 0),
    };
  };

  /**
   * Model Associations
   */
  File.associate = (models) => {
    // File belongs to Submission
    File.belongsTo(models.Submission, {
      foreignKey: 'submission_id',
      as: 'submission',
      onDelete: 'CASCADE',
    });

    // File belongs to Field
    File.belongsTo(models.Field, {
      foreignKey: 'field_id',
      as: 'field',
      onDelete: 'CASCADE',
    });

    // File belongs to User (uploader)
    File.belongsTo(models.User, {
      foreignKey: 'uploaded_by',
      as: 'uploader',
      onDelete: 'SET NULL',
    });
  };

  /**
   * Scopes for common queries
   */
  File.addScope('images', {
    where: {
      mime_type: {
        [sequelize.Sequelize.Op.like]: 'image/%',
      },
    },
  });

  File.addScope('documents', {
    where: {
      mime_type: {
        [sequelize.Sequelize.Op.in]: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
      },
    },
  });

  File.addScope('recent', {
    order: [['uploaded_at', 'DESC']],
    limit: 20,
  });

  return File;
};