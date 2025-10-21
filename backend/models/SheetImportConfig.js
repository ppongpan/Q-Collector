/**
 * SheetImportConfig Model
 * Manages Google Sheets import configurations with field mapping
 *
 * Part of Google Sheets Import System v0.8.0
 */

module.exports = (sequelize, DataTypes) => {
  const SheetImportConfig = sequelize.define('SheetImportConfig', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
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
    sub_form_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'sub_forms',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    sheet_url: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: true,
        isUrl: true,
      },
    },
    sheet_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255],
      },
    },
    google_sheet_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    field_mapping: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      comment: 'Column → Field mapping',
      validate: {
        isValidMapping(value) {
          if (typeof value !== 'object' || value === null) {
            throw new Error('field_mapping must be an object');
          }
        },
      },
    },
    skip_header_row: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    auto_create_fields: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    last_import_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    total_imports: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    // ✅ NEW: Foreign key mappings for sub-forms (v0.8.0)
    foreign_key_mappings: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Foreign key relationships between sub-form and parent form fields',
      validate: {
        isValidMappings(value) {
          if (value !== null && !Array.isArray(value)) {
            throw new Error('foreign_key_mappings must be an array');
          }
        },
      },
    },
  }, {
    tableName: 'sheet_import_configs',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['form_id'] },
      { fields: ['sub_form_id'] },
      { fields: ['last_import_at'] },
    ],
  });

  /**
   * Instance Methods
   */

  /**
   * Extract Google Sheet ID from URL
   * @returns {string|null}
   */
  SheetImportConfig.prototype.extractSheetId = function() {
    if (!this.sheet_url) return null;

    // Extract from URL patterns:
    // https://docs.google.com/spreadsheets/d/{ID}/edit...
    // https://docs.google.com/spreadsheets/d/{ID}
    const match = this.sheet_url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  /**
   * Validate field mapping against form fields
   * @param {Array} formFields - Array of field objects from the form
   * @returns {Object} - { valid: boolean, errors: string[] }
   */
  SheetImportConfig.prototype.validateFieldMapping = function(formFields) {
    const errors = [];
    const fieldIds = formFields.map(f => f.id);

    // Check that all mapped field IDs exist in the form
    Object.values(this.field_mapping).forEach(fieldId => {
      if (!fieldIds.includes(fieldId)) {
        errors.push(`Field ID ${fieldId} not found in form`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  };

  /**
   * Get column letters from field mapping
   * @returns {Array<string>}
   */
  SheetImportConfig.prototype.getColumnLetters = function() {
    return Object.keys(this.field_mapping);
  };

  /**
   * Get mapped field IDs
   * @returns {Array<string>}
   */
  SheetImportConfig.prototype.getMappedFieldIds = function() {
    return Object.values(this.field_mapping);
  };

  /**
   * Update import statistics
   * @param {Object} options - Transaction options
   */
  SheetImportConfig.prototype.recordImport = async function(options = {}) {
    this.last_import_at = new Date();
    this.total_imports += 1;
    await this.save(options);
    return this;
  };

  /**
   * Check if configuration is stale (not used in 90 days)
   * @returns {boolean}
   */
  SheetImportConfig.prototype.isStale = function() {
    if (!this.last_import_at) return true;

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    return this.last_import_at < ninetyDaysAgo;
  };

  /**
   * Get full configuration with related data
   * @returns {Promise<Object>}
   */
  SheetImportConfig.prototype.getFullConfig = async function() {
    return await SheetImportConfig.findByPk(this.id, {
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'role'],
        },
        {
          model: sequelize.models.Form,
          as: 'form',
          attributes: ['id', 'title', 'is_active'],
        },
        {
          model: sequelize.models.SubForm,
          as: 'subForm',
          attributes: ['id', 'title'],
          required: false,
        },
        {
          model: sequelize.models.SheetImportHistory,
          as: 'importHistory',
          limit: 10,
          order: [['started_at', 'DESC']],
        },
      ],
    });
  };

  /**
   * Class Methods
   */

  /**
   * Find configs by user
   * @param {string} userId - User UUID
   * @returns {Promise<SheetImportConfig[]>}
   */
  SheetImportConfig.findByUser = async function(userId) {
    return await SheetImportConfig.findAll({
      where: { user_id: userId },
      order: [['last_import_at', 'DESC NULLS LAST'], ['created_at', 'DESC']],
      include: [
        {
          model: sequelize.models.Form,
          as: 'form',
          attributes: ['id', 'title'],
        },
      ],
    });
  };

  /**
   * Find configs by form
   * @param {string} formId - Form UUID
   * @returns {Promise<SheetImportConfig[]>}
   */
  SheetImportConfig.findByForm = async function(formId) {
    return await SheetImportConfig.findAll({
      where: { form_id: formId },
      order: [['created_at', 'DESC']],
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['id', 'username', 'email'],
        },
      ],
    });
  };

  /**
   * Find stale configurations (not used in 90+ days)
   * @returns {Promise<SheetImportConfig[]>}
   */
  SheetImportConfig.findStale = async function() {
    const { Op } = sequelize.Sequelize;
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    return await SheetImportConfig.findAll({
      where: {
        [Op.or]: [
          { last_import_at: { [Op.lt]: ninetyDaysAgo } },
          { last_import_at: null },
        ],
      },
      order: [['created_at', 'ASC']],
    });
  };

  /**
   * Model Associations
   */
  SheetImportConfig.associate = (models) => {
    // Config belongs to User
    SheetImportConfig.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE',
    });

    // Config belongs to Form
    SheetImportConfig.belongsTo(models.Form, {
      foreignKey: 'form_id',
      as: 'form',
      onDelete: 'CASCADE',
    });

    // Config belongs to SubForm (nullable)
    SheetImportConfig.belongsTo(models.SubForm, {
      foreignKey: 'sub_form_id',
      as: 'subForm',
      onDelete: 'SET NULL',
    });

    // Config has many Import History records
    SheetImportConfig.hasMany(models.SheetImportHistory, {
      foreignKey: 'config_id',
      as: 'importHistory',
      onDelete: 'CASCADE',
    });
  };

  /**
   * Scopes for common queries
   */
  SheetImportConfig.addScope('recent', {
    where: {
      last_import_at: {
        [sequelize.Sequelize.Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    },
    order: [['last_import_at', 'DESC']],
  });

  SheetImportConfig.addScope('withRelations', {
    include: [
      {
        association: 'user',
        attributes: ['id', 'username', 'email'],
      },
      {
        association: 'form',
        attributes: ['id', 'title', 'is_active'],
      },
      {
        association: 'subForm',
        attributes: ['id', 'title'],
        required: false,
      },
    ],
  });

  /**
   * Override toJSON to format output
   */
  SheetImportConfig.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());

    // Add computed properties
    values.extractedSheetId = this.extractSheetId();
    values.isStale = this.isStale();
    values.columnLetters = this.getColumnLetters();
    values.mappedFieldCount = this.getMappedFieldIds().length;

    return values;
  };

  return SheetImportConfig;
};
