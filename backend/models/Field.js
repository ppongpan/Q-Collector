/**
 * Field Model
 * Manages form fields with validation rules
 */

module.exports = (sequelize, DataTypes) => {
  const Field = sequelize.define('Field', {
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
    sub_form_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'sub_forms',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    type: {
      type: DataTypes.ENUM(
        'short_answer',
        'paragraph',
        'email',
        'phone',
        'number',
        'url',
        'file_upload',
        'image_upload',
        'date',
        'time',
        'datetime',
        'multiple_choice',
        'rating',
        'slider',
        'lat_long',
        'province',
        'factory'
      ),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [1, 255],
      },
    },
    placeholder: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    required: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    options: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      comment: 'Field-specific options (choices, min/max, etc.)',
    },
    show_condition: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: 'Conditional visibility rules',
    },
    telegram_config: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: 'Telegram notification configuration',
    },
    validation_rules: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      comment: 'Custom validation rules',
    },
    show_in_table: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'show_in_table',
      comment: 'Display this field in submission table',
    },
    send_telegram: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'send_telegram',
      comment: 'Send this field value in Telegram notifications',
    },
    telegram_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'telegram_order',
      comment: 'Order of this field in Telegram notifications',
    },
    telegram_prefix: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
      field: 'telegram_prefix',
      comment: 'Custom prefix for this field in Telegram notifications',
    },
  }, {
    tableName: 'fields',
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ['form_id'] },
      { fields: ['sub_form_id'] },
      { fields: ['order'] },
      { fields: ['type'] },
    ],
  });

  /**
   * Instance Methods
   */

  /**
   * Validate field value based on type and rules
   * @param {any} value - Value to validate
   * @returns {Object} { valid: boolean, error: string|null }
   */
  Field.prototype.validateValue = function(value) {
    // Required field check
    if (this.required && (value === null || value === undefined || value === '')) {
      return { valid: false, error: 'This field is required' };
    }

    // Skip validation if not required and empty
    if (!value && !this.required) {
      return { valid: true, error: null };
    }

    // Type-specific validation
    switch (this.type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return { valid: false, error: 'Invalid email format' };
        }
        break;

      case 'phone':
        const phoneRegex = /^[0-9]{9,10}$/;
        if (!phoneRegex.test(value.replace(/[\s-]/g, ''))) {
          return { valid: false, error: 'Invalid phone number' };
        }
        break;

      case 'url':
        try {
          new URL(value);
        } catch {
          return { valid: false, error: 'Invalid URL format' };
        }
        break;

      case 'number':
        if (isNaN(Number(value))) {
          return { valid: false, error: 'Must be a valid number' };
        }
        if (this.validation_rules.min !== undefined && Number(value) < this.validation_rules.min) {
          return { valid: false, error: `Must be at least ${this.validation_rules.min}` };
        }
        if (this.validation_rules.max !== undefined && Number(value) > this.validation_rules.max) {
          return { valid: false, error: `Must be at most ${this.validation_rules.max}` };
        }
        break;

      case 'date':
      case 'time':
      case 'datetime':
        if (isNaN(Date.parse(value))) {
          return { valid: false, error: 'Invalid date/time format' };
        }
        break;

      case 'multiple_choice':
        if (this.options.choices && !this.options.choices.includes(value)) {
          return { valid: false, error: 'Invalid choice' };
        }
        break;

      case 'rating':
        const rating = Number(value);
        const max = this.options.max || 5;
        if (rating < 1 || rating > max) {
          return { valid: false, error: `Rating must be between 1 and ${max}` };
        }
        break;

      case 'slider':
        const sliderValue = Number(value);
        const min = this.options.min || 0;
        const maxSlider = this.options.max || 100;
        if (sliderValue < min || sliderValue > maxSlider) {
          return { valid: false, error: `Value must be between ${min} and ${maxSlider}` };
        }
        break;
    }

    // Custom validation rules
    if (this.validation_rules.pattern) {
      const regex = new RegExp(this.validation_rules.pattern);
      if (!regex.test(value)) {
        return {
          valid: false,
          error: this.validation_rules.patternMessage || 'Invalid format',
        };
      }
    }

    return { valid: true, error: null };
  };

  /**
   * Check if field should be visible based on conditions
   * @param {Object} formData - Current form data
   * @returns {boolean}
   */
  Field.prototype.isVisible = function(formData) {
    if (!this.show_condition || !this.show_condition.enabled) {
      return true;
    }

    const condition = this.show_condition;
    if (!condition.field_id || !condition.operator || condition.value === undefined) {
      return true;
    }

    const dependentValue = formData[condition.field_id];

    switch (condition.operator) {
      case 'equals':
        return dependentValue === condition.value;
      case 'not_equals':
        return dependentValue !== condition.value;
      case 'contains':
        return String(dependentValue).includes(String(condition.value));
      case 'greater_than':
        return Number(dependentValue) > Number(condition.value);
      case 'less_than':
        return Number(dependentValue) < Number(condition.value);
      default:
        return true;
    }
  };

  /**
   * Check if telegram notification is enabled
   * @returns {boolean}
   */
  Field.prototype.hasTelegramNotification = function() {
    return this.telegram_config && this.telegram_config.enabled === true;
  };

  /**
   * Override toJSON to convert snake_case to camelCase for frontend
   */
  Field.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());

    // Map snake_case to camelCase
    if (values.show_in_table !== undefined) {
      values.showInTable = values.show_in_table;
      delete values.show_in_table;
    }

    if (values.send_telegram !== undefined) {
      values.sendTelegram = values.send_telegram;
      delete values.send_telegram;
    }

    if (values.telegram_order !== undefined) {
      values.telegramOrder = values.telegram_order;
      delete values.telegram_order;
    }

    if (values.telegram_prefix !== undefined) {
      values.telegramPrefix = values.telegram_prefix;
      delete values.telegram_prefix;
    }

    return values;
  };

  /**
   * Model Associations
   */
  Field.associate = (models) => {
    // Field belongs to Form
    Field.belongsTo(models.Form, {
      foreignKey: 'form_id',
      as: 'form',
      onDelete: 'CASCADE',
    });

    // Field belongs to SubForm (optional)
    Field.belongsTo(models.SubForm, {
      foreignKey: 'sub_form_id',
      as: 'subForm',
      onDelete: 'CASCADE',
    });

    // Field has many SubmissionData
    Field.hasMany(models.SubmissionData, {
      foreignKey: 'field_id',
      as: 'submissionData',
      onDelete: 'CASCADE',
    });

    // Field has many Files
    Field.hasMany(models.File, {
      foreignKey: 'field_id',
      as: 'files',
      onDelete: 'CASCADE',
    });
  };

  /**
   * Scopes for common queries
   */
  Field.addScope('ordered', {
    order: [['order', 'ASC']],
  });

  Field.addScope('required', {
    where: { required: true },
  });

  Field.addScope('withTelegram', {
    where: sequelize.literal("telegram_config->>'enabled' = 'true'"),
  });

  return Field;
};