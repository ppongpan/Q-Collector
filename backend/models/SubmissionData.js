/**
 * SubmissionData Model
 * Stores submission field values with encryption support
 */

const { encrypt, decrypt } = require('../utils/encryption.util');

module.exports = (sequelize, DataTypes) => {
  const SubmissionData = sequelize.define('SubmissionData', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    submission_id: {
      type: DataTypes.UUID,
      allowNull: false,
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
    value_text: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Plain text value for non-sensitive data',
    },
    value_encrypted: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Encrypted value for sensitive data',
    },
    value_type: {
      type: DataTypes.ENUM('string', 'number', 'boolean', 'date', 'json', 'file'),
      allowNull: false,
      defaultValue: 'string',
    },
    is_encrypted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  }, {
    tableName: 'submission_data',
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ['submission_id'] },
      { fields: ['field_id'] },
      { fields: ['is_encrypted'] },
    ],
    hooks: {
      /**
       * Encrypt sensitive fields before saving
       */
      beforeCreate: async (submissionData) => {
        if (submissionData.value_text && submissionData.shouldEncrypt) {
          const encryptedData = encrypt(submissionData.value_text);
          submissionData.value_encrypted = JSON.stringify(encryptedData);
          submissionData.value_text = null;
          submissionData.is_encrypted = true;
        }
      },

      /**
       * Re-encrypt if value changes
       */
      beforeUpdate: async (submissionData) => {
        if (submissionData.changed('value_text') && submissionData.shouldEncrypt) {
          const encryptedData = encrypt(submissionData.value_text);
          submissionData.value_encrypted = JSON.stringify(encryptedData);
          submissionData.value_text = null;
          submissionData.is_encrypted = true;
        }
      },
    },
  });

  /**
   * Instance Methods
   */

  /**
   * Get decrypted value
   * @returns {any}
   */
  SubmissionData.prototype.getDecryptedValue = function() {
    if (this.is_encrypted && this.value_encrypted) {
      try {
        const encryptedData = JSON.parse(this.value_encrypted);
        const decrypted = decrypt(encryptedData);
        return this.parseValue(decrypted);
      } catch (error) {
        console.error('Error decrypting value:', error);
        return null;
      }
    }

    return this.parseValue(this.value_text);
  };

  /**
   * Parse value based on type
   * @param {string} value - Raw value
   * @returns {any}
   */
  SubmissionData.prototype.parseValue = function(value) {
    if (value === null || value === undefined) {
      return null;
    }

    switch (this.value_type) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value === 'true' || value === true;
      case 'date':
        return new Date(value);
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  };

  /**
   * Set value with automatic encryption
   * @param {any} value - Value to set
   * @param {boolean} encrypt - Whether to encrypt
   */
  SubmissionData.prototype.setValue = function(value, shouldEncrypt = false) {
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

    if (shouldEncrypt) {
      this.shouldEncrypt = true;
      this.value_text = stringValue;
    } else {
      this.value_text = stringValue;
      this.is_encrypted = false;
    }
  };

  /**
   * Check if field should be encrypted based on field type
   * @param {Object} field - Field model instance
   * @returns {boolean}
   */
  SubmissionData.isSensitiveField = function(field) {
    const sensitiveTypes = ['email', 'phone', 'short_answer', 'paragraph'];
    return sensitiveTypes.includes(field.type);
  };

  /**
   * Create submission data with automatic encryption
   * @param {string} submissionId - Submission ID
   * @param {string} fieldId - Field ID
   * @param {any} value - Field value
   * @param {Object} field - Field model instance
   * @param {Object} options - Sequelize options (e.g., transaction)
   * @returns {Promise<SubmissionData>}
   */
  SubmissionData.createWithEncryption = async function(submissionId, fieldId, value, field, options = {}) {
    const shouldEncrypt = SubmissionData.isSensitiveField(field);
    const valueType = SubmissionData.getValueType(value);

    const submissionData = SubmissionData.build({
      submission_id: submissionId,
      field_id: fieldId,
      value_type: valueType,
    });

    submissionData.setValue(value, shouldEncrypt);
    await submissionData.save(options);

    return submissionData;
  };

  /**
   * Determine value type from value
   * @param {any} value - Value to check
   * @returns {string}
   */
  SubmissionData.getValueType = function(value) {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'date';
    if (typeof value === 'object') return 'json';
    return 'string';
  };

  /**
   * Model Associations
   */
  SubmissionData.associate = (models) => {
    // SubmissionData belongs to Submission
    SubmissionData.belongsTo(models.Submission, {
      foreignKey: 'submission_id',
      as: 'submission',
      onDelete: 'CASCADE',
    });

    // SubmissionData belongs to Field
    SubmissionData.belongsTo(models.Field, {
      foreignKey: 'field_id',
      as: 'field',
      onDelete: 'CASCADE',
    });
  };

  /**
   * Scopes for common queries
   */
  SubmissionData.addScope('encrypted', {
    where: { is_encrypted: true },
  });

  SubmissionData.addScope('withField', {
    include: [
      {
        model: sequelize.models.Field,
        as: 'field',
      },
    ],
  });

  return SubmissionData;
};