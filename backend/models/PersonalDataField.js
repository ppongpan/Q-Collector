/**
 * PersonalDataField Model
 * Manages classification of form fields containing personal data for PDPA compliance
 */

module.exports = (sequelize, DataTypes) => {
  const PersonalDataField = sequelize.define('PersonalDataField', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    form_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'forms',
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
    data_category: {
      type: DataTypes.ENUM(
        'email',
        'phone',
        'name',
        'id_card',
        'address',
        'date_of_birth',
        'financial',
        'health',
        'biometric',
        'location',
        'other'
      ),
      allowNull: false,
    },
    is_sensitive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    purpose: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    legal_basis: {
      type: DataTypes.ENUM(
        'consent',
        'contract',
        'legal_obligation',
        'vital_interests',
        'public_task',
        'legitimate_interests'
      ),
      allowNull: false,
      defaultValue: 'consent',
    },
    retention_period: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    auto_detected: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    detected_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    confirmed_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    confirmed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'personal_data_fields',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['form_id'] },
      { fields: ['field_id'] },
      { fields: ['data_category'] },
      { fields: ['is_sensitive'] },
      { fields: ['auto_detected'] },
      {
        unique: true,
        fields: ['form_id', 'field_id'],
        name: 'personal_data_fields_form_field_unique',
      },
    ],
  });

  /**
   * Instance Methods
   */

  /**
   * Confirm classification by admin
   * @param {string} userId - Admin user ID
   * @returns {Promise<PersonalDataField>}
   */
  PersonalDataField.prototype.confirm = async function(userId) {
    this.confirmed_by = userId;
    this.confirmed_at = new Date();
    await this.save();
    return this;
  };

  /**
   * Check if classification is confirmed
   * @returns {boolean}
   */
  PersonalDataField.prototype.isConfirmed = function() {
    return this.confirmed_at !== null && this.confirmed_by !== null;
  };

  /**
   * Mark as sensitive data
   * @returns {Promise<PersonalDataField>}
   */
  PersonalDataField.prototype.markAsSensitive = async function() {
    this.is_sensitive = true;
    await this.save();
    return this;
  };

  /**
   * Get full classification with related data
   * @returns {Promise<PersonalDataField>}
   */
  PersonalDataField.prototype.getFullClassification = async function() {
    return await PersonalDataField.findByPk(this.id, {
      include: [
        {
          model: sequelize.models.Form,
          as: 'form',
          attributes: ['id', 'title'],
        },
        {
          model: sequelize.models.Field,
          as: 'field',
        },
        {
          model: sequelize.models.User,
          as: 'confirmedByUser',
          attributes: ['id', 'username', 'email'],
        },
      ],
    });
  };

  /**
   * Class Methods
   */

  /**
   * Auto-detect personal data fields in a form
   * @param {string} formId - Form ID
   * @returns {Promise<PersonalDataField[]>}
   */
  PersonalDataField.autoDetect = async function(formId) {
    const Field = sequelize.models.Field;

    // Get all fields for the form
    const fields = await Field.findAll({
      where: { form_id: formId },
    });

    const detections = [];

    for (const field of fields) {
      let category = null;
      let isSensitive = false;

      // Auto-detect based on field type
      switch (field.type) {
        case 'email':
          category = 'email';
          break;
        case 'phone':
          category = 'phone';
          break;
        case 'lat_long':
          category = 'location';
          break;
      }

      // Auto-detect based on field title (Thai and English)
      const titleLower = field.title.toLowerCase();
      if (!category) {
        if (titleLower.includes('email') || titleLower.includes('อีเมล')) {
          category = 'email';
        } else if (titleLower.includes('phone') || titleLower.includes('เบอร์') ||
                   titleLower.includes('โทร') || titleLower.includes('มือถือ')) {
          category = 'phone';
        } else if (titleLower.includes('name') || titleLower.includes('ชื่อ')) {
          category = 'name';
        } else if (titleLower.includes('id card') || titleLower.includes('บัตรประชาชน')) {
          category = 'id_card';
          isSensitive = true;
        } else if (titleLower.includes('address') || titleLower.includes('ที่อยู่')) {
          category = 'address';
        } else if (titleLower.includes('birth') || titleLower.includes('เกิด')) {
          category = 'date_of_birth';
        } else if (titleLower.includes('health') || titleLower.includes('สุขภาพ')) {
          category = 'health';
          isSensitive = true;
        }
      }

      // Create classification if detected
      if (category) {
        const existing = await PersonalDataField.findOne({
          where: { form_id: formId, field_id: field.id },
        });

        if (!existing) {
          const classification = await PersonalDataField.create({
            form_id: formId,
            field_id: field.id,
            data_category: category,
            is_sensitive: isSensitive,
            purpose: 'Auto-detected - Please confirm and update purpose',
            legal_basis: 'consent',
            auto_detected: true,
            detected_at: new Date(),
          });

          detections.push(classification);
        }
      }
    }

    return detections;
  };

  /**
   * Find all personal data fields for a form
   * @param {string} formId - Form ID
   * @returns {Promise<PersonalDataField[]>}
   */
  PersonalDataField.findByForm = async function(formId) {
    return await PersonalDataField.findAll({
      where: { form_id: formId },
      include: [
        {
          model: sequelize.models.Field,
          as: 'field',
        },
        {
          model: sequelize.models.User,
          as: 'confirmedByUser',
          attributes: ['id', 'username', 'email'],
        },
      ],
      order: [['created_at', 'DESC']],
    });
  };

  /**
   * Find sensitive data fields
   * @param {string|null} formId - Optional form ID filter
   * @returns {Promise<PersonalDataField[]>}
   */
  PersonalDataField.findSensitive = async function(formId = null) {
    const where = { is_sensitive: true };
    if (formId) {
      where.form_id = formId;
    }

    return await PersonalDataField.findAll({
      where,
      include: [
        {
          model: sequelize.models.Form,
          as: 'form',
          attributes: ['id', 'title'],
        },
        {
          model: sequelize.models.Field,
          as: 'field',
        },
      ],
      order: [['created_at', 'DESC']],
    });
  };

  /**
   * Find unconfirmed classifications
   * @param {string|null} formId - Optional form ID filter
   * @returns {Promise<PersonalDataField[]>}
   */
  PersonalDataField.findUnconfirmed = async function(formId = null) {
    const where = { confirmed_at: null };
    if (formId) {
      where.form_id = formId;
    }

    return await PersonalDataField.findAll({
      where,
      include: [
        {
          model: sequelize.models.Form,
          as: 'form',
          attributes: ['id', 'title'],
        },
        {
          model: sequelize.models.Field,
          as: 'field',
        },
      ],
      order: [['detected_at', 'DESC']],
    });
  };

  /**
   * Model Associations
   */
  PersonalDataField.associate = (models) => {
    // PersonalDataField belongs to Form
    PersonalDataField.belongsTo(models.Form, {
      foreignKey: 'form_id',
      as: 'form',
      onDelete: 'CASCADE',
    });

    // PersonalDataField belongs to Field
    PersonalDataField.belongsTo(models.Field, {
      foreignKey: 'field_id',
      as: 'field',
      onDelete: 'CASCADE',
    });

    // PersonalDataField belongs to User (confirmed_by)
    PersonalDataField.belongsTo(models.User, {
      foreignKey: 'confirmed_by',
      as: 'confirmedByUser',
      onDelete: 'SET NULL',
    });
  };

  /**
   * Scopes for common queries
   */
  PersonalDataField.addScope('sensitive', {
    where: { is_sensitive: true },
  });

  PersonalDataField.addScope('confirmed', {
    where: {
      confirmed_at: { [sequelize.Sequelize.Op.ne]: null },
    },
  });

  PersonalDataField.addScope('unconfirmed', {
    where: { confirmed_at: null },
  });

  PersonalDataField.addScope('autoDetected', {
    where: { auto_detected: true },
  });

  /**
   * Override toJSON to convert snake_case to camelCase for frontend
   */
  PersonalDataField.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());

    // Map snake_case to camelCase
    if (values.form_id !== undefined) {
      values.formId = values.form_id;
      delete values.form_id;
    }

    if (values.field_id !== undefined) {
      values.fieldId = values.field_id;
      delete values.field_id;
    }

    if (values.data_category !== undefined) {
      values.dataCategory = values.data_category;
      delete values.data_category;
    }

    if (values.is_sensitive !== undefined) {
      values.isSensitive = values.is_sensitive;
      delete values.is_sensitive;
    }

    if (values.legal_basis !== undefined) {
      values.legalBasis = values.legal_basis;
      delete values.legal_basis;
    }

    if (values.retention_period !== undefined) {
      values.retentionPeriod = values.retention_period;
      delete values.retention_period;
    }

    if (values.auto_detected !== undefined) {
      values.autoDetected = values.auto_detected;
      delete values.auto_detected;
    }

    if (values.detected_at !== undefined) {
      values.detectedAt = values.detected_at;
      delete values.detected_at;
    }

    if (values.confirmed_by !== undefined) {
      values.confirmedBy = values.confirmed_by;
      delete values.confirmed_by;
    }

    if (values.confirmed_at !== undefined) {
      values.confirmedAt = values.confirmed_at;
      delete values.confirmed_at;
    }

    if (values.created_at !== undefined) {
      values.createdAt = values.created_at;
      delete values.created_at;
    }

    if (values.updated_at !== undefined) {
      values.updatedAt = values.updated_at;
      delete values.updated_at;
    }

    return values;
  };

  return PersonalDataField;
};
