/**
 * NotificationRule Model
 * Manages automated notification rules for Telegram integration
 *
 * Q-Collector Advanced Telegram Notification System v0.8.0
 */

const { validateCronExpression } = require('../utils/cronValidator.util');

module.exports = (sequelize, DataTypes) => {
  const NotificationRule = sequelize.define('NotificationRule', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    form_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'forms',
        key: 'id',
      },
      onDelete: 'CASCADE',
      comment: 'Form this rule applies to (null for global rules)',
    },
    sub_form_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'sub_forms',
        key: 'id',
      },
      onDelete: 'CASCADE',
      comment: 'Sub-form this rule applies to (null for main form rules)',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [1, 255],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    trigger_type: {
      type: DataTypes.ENUM('field_update', 'scheduled'),
      allowNull: false,
      comment: 'Type of trigger: field_update (on submission) or scheduled (cron-based)',
    },
    schedule: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Cron expression for scheduled triggers',
      validate: {
        isValidCron(value) {
          if (this.trigger_type === 'scheduled') {
            if (!value) {
              throw new Error('Schedule is required for scheduled trigger type');
            }
            if (!validateCronExpression(value)) {
              throw new Error('Invalid cron expression format');
            }
          }
        },
      },
    },
    condition_formula: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Formula to evaluate using FormulaEngine (e.g., "[field] = value")',
    },
    target_field_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'For field_update triggers, which field to watch (null = watch all)',
    },
    bot_token: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Override default Telegram bot token (optional)',
    },
    group_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Override default Telegram group ID (optional)',
    },
    message_template: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Message template with {field} placeholders',
    },
    is_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    send_once: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Send notification only once per submission',
    },
    priority: {
      type: DataTypes.ENUM('high', 'medium', 'low'),
      allowNull: false,
      defaultValue: 'medium',
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    updated_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
  }, {
    tableName: 'notification_rules',
    timestamps: true,
    underscored: true, // Use snake_case for created_at, updated_at
    indexes: [
      { fields: ['form_id'] },
      { fields: ['sub_form_id'] },
      { fields: ['trigger_type'] },
      { fields: ['is_enabled'] },
      { fields: ['target_field_id'] },
      { fields: ['priority'] },
      { fields: ['form_id', 'trigger_type', 'is_enabled'] }, // Composite for common queries
    ],
    hooks: {
      /**
       * Validate formula syntax before creating rule
       */
      beforeCreate: async (rule) => {
        // Validate formula syntax
        await rule.validateFormulaSyntax();

        // Validate trigger_type specific requirements
        if (rule.trigger_type === 'scheduled' && !rule.schedule) {
          throw new Error('Schedule is required for scheduled trigger type');
        }
      },

      /**
       * Validate formula syntax before updating rule
       */
      beforeUpdate: async (rule) => {
        if (rule.changed('condition_formula')) {
          await rule.validateFormulaSyntax();
        }

        if (rule.changed('trigger_type') && rule.trigger_type === 'scheduled' && !rule.schedule) {
          throw new Error('Schedule is required for scheduled trigger type');
        }
      },

      /**
       * Clear related notification history when rule is disabled
       */
      afterUpdate: async (rule) => {
        if (rule.changed('is_enabled') && !rule.is_enabled) {
          // Optionally clear pending notifications
          const NotificationHistory = sequelize.models.NotificationHistory;
          if (NotificationHistory) {
            await NotificationHistory.update(
              { status: 'skipped', error_message: 'Rule disabled by user' },
              {
                where: {
                  notification_rule_id: rule.id,
                  status: 'pending',
                },
              }
            );
          }
        }
      },
    },
  });

  /**
   * Instance Methods
   */

  /**
   * Validate formula syntax
   * Basic validation: checks for field references, balanced brackets, and common syntax
   * @returns {Promise<boolean>}
   * @throws {Error} If formula is invalid
   */
  NotificationRule.prototype.validateFormulaSyntax = async function() {
    const formula = this.condition_formula;

    if (!formula || typeof formula !== 'string') {
      throw new Error('Formula must be a non-empty string');
    }

    // Check for balanced brackets
    const openBrackets = (formula.match(/\[/g) || []).length;
    const closeBrackets = (formula.match(/]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      throw new Error('Unbalanced field reference brackets');
    }

    // Check for balanced parentheses
    const openParens = (formula.match(/\(/g) || []).length;
    const closeParens = (formula.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      throw new Error('Unbalanced parentheses');
    }

    // Check for balanced quotes
    const quotes = (formula.match(/"/g) || []).length;
    if (quotes % 2 !== 0) {
      throw new Error('Unbalanced string quotes');
    }

    // Basic syntax validation passed
    return true;
  };

  /**
   * Evaluate condition against submission data
   * NOTE: This is a placeholder implementation. In production, this should use
   * a proper formula engine (e.g., import from frontend or create backend version)
   * @param {Object} submissionData - Key-value pairs of field data
   * @returns {Promise<Object>} { result: boolean, details: Object, error: string }
   */
  NotificationRule.prototype.evaluateCondition = async function(submissionData) {
    try {
      // Simple placeholder evaluation for basic formulas like [field] = "value"
      const formula = this.condition_formula;

      // Extract field reference and expected value using regex
      // Pattern: [fieldName] = "value" or [fieldName] = value
      const simpleMatch = formula.match(/\[([^\]]+)\]\s*=\s*"([^"]*)"/);

      if (simpleMatch) {
        const fieldName = simpleMatch[1];
        const expectedValue = simpleMatch[2];
        const actualValue = submissionData[fieldName];

        const result = String(actualValue) === expectedValue;

        return {
          result,
          details: {
            formula: this.condition_formula,
            data: submissionData,
            evaluated: result,
            fieldName,
            expectedValue,
            actualValue
          },
          error: null,
        };
      }

      // If formula doesn't match simple pattern, return true (will be properly implemented with FormulaEngine)
      console.warn(`Complex formula evaluation not yet implemented: ${formula}`);
      return {
        result: true,
        details: { formula: this.condition_formula, data: submissionData, evaluated: 'not_implemented' },
        error: 'Complex formula evaluation requires FormulaEngine implementation',
      };
    } catch (error) {
      return {
        result: false,
        details: { formula: this.condition_formula, data: submissionData },
        error: error.message,
      };
    }
  };

  /**
   * Format message template by replacing {field} placeholders
   * @param {Object} submissionData - Key-value pairs of field data
   * @returns {string} Formatted message
   */
  NotificationRule.prototype.formatMessage = function(submissionData) {
    let message = this.message_template;

    // Replace {field} placeholders with actual values
    Object.keys(submissionData).forEach((fieldName) => {
      const placeholder = `{${fieldName}}`;
      const value = submissionData[fieldName];

      // Handle different value types
      let displayValue = '';
      if (value === null || value === undefined) {
        displayValue = '(ไม่มีข้อมูล)';
      } else if (typeof value === 'object') {
        displayValue = JSON.stringify(value);
      } else {
        displayValue = String(value);
      }

      message = message.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), displayValue);
    });

    return message;
  };

  /**
   * Check if notification can be sent for this submission
   * @param {string} submissionId - Submission ID
   * @returns {Promise<boolean>}
   */
  NotificationRule.prototype.canSendNotification = async function(submissionId) {
    if (!this.is_enabled) {
      return false;
    }

    if (!this.send_once) {
      return true;
    }

    // Check if already sent for this submission
    const NotificationHistory = sequelize.models.NotificationHistory;
    const existingNotification = await NotificationHistory.findOne({
      where: {
        notification_rule_id: this.id,
        submission_id: submissionId,
        status: 'sent',
      },
    });

    return !existingNotification;
  };

  /**
   * Get notification configuration (bot_token, group_id)
   * Falls back to default settings if not specified
   * @returns {Object} { botToken, groupId }
   */
  NotificationRule.prototype.getNotificationConfig = function() {
    return {
      botToken: this.bot_token || process.env.TELEGRAM_BOT_TOKEN,
      groupId: this.group_id || process.env.TELEGRAM_GROUP_ID,
    };
  };

  /**
   * Class Methods
   */

  /**
   * Find active rules for a specific trigger type and form
   * @param {string} triggerType - 'field_update' or 'scheduled'
   * @param {string} formId - Form ID (optional)
   * @param {string} fieldId - Field ID to filter by target_field_id (optional)
   * @returns {Promise<NotificationRule[]>}
   */
  NotificationRule.findActiveRules = async function(triggerType, formId = null, fieldId = null) {
    const { Op } = sequelize.Sequelize;

    const where = {
      trigger_type: triggerType,
      is_enabled: true,
    };

    if (formId) {
      where.form_id = formId;
    }

    if (fieldId) {
      where[Op.or] = [
        { target_field_id: fieldId },
        { target_field_id: null }, // Include rules that watch all fields
      ];
    }

    return await NotificationRule.findAll({
      where,
      order: [
        ['priority', 'DESC'], // high > medium > low
        ['createdAt', 'ASC'],
      ],
      include: [
        {
          model: sequelize.models.Form,
          as: 'form',
          attributes: ['id', 'title'],
        },
        {
          model: sequelize.models.SubForm,
          as: 'subForm',
          attributes: ['id', 'title'],
        },
        {
          model: sequelize.models.User,
          as: 'creator',
          attributes: ['id', 'username', 'email'],
        },
      ],
    });
  };

  /**
   * Find all active scheduled rules for cron processing
   * @returns {Promise<NotificationRule[]>}
   */
  NotificationRule.findScheduledRules = async function() {
    return await NotificationRule.findAll({
      where: {
        trigger_type: 'scheduled',
        is_enabled: true,
      },
      order: [
        ['priority', 'DESC'],
        ['createdAt', 'ASC'],
      ],
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
   * Get rule statistics
   * @param {string} ruleId - Rule ID
   * @returns {Promise<Object>}
   */
  NotificationRule.getStatistics = async function(ruleId) {
    const NotificationHistory = sequelize.models.NotificationHistory;

    const stats = await NotificationHistory.findAll({
      where: { notification_rule_id: ruleId },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['status'],
      raw: true,
    });

    const result = {
      total: 0,
      pending: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      successRate: 0,
    };

    stats.forEach((stat) => {
      result[stat.status] = parseInt(stat.count);
      result.total += parseInt(stat.count);
    });

    if (result.total > 0) {
      result.successRate = ((result.sent / result.total) * 100).toFixed(2);
    }

    return result;
  };

  /**
   * Model Associations
   */
  NotificationRule.associate = (models) => {
    // NotificationRule belongs to Form (optional)
    NotificationRule.belongsTo(models.Form, {
      foreignKey: 'form_id',
      as: 'form',
      onDelete: 'CASCADE',
    });

    // NotificationRule belongs to SubForm (optional)
    NotificationRule.belongsTo(models.SubForm, {
      foreignKey: 'sub_form_id',
      as: 'subForm',
      onDelete: 'CASCADE',
    });

    // NotificationRule belongs to User (creator)
    NotificationRule.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator',
      onDelete: 'SET NULL',
    });

    // NotificationRule belongs to User (updater)
    NotificationRule.belongsTo(models.User, {
      foreignKey: 'updated_by',
      as: 'updater',
      onDelete: 'SET NULL',
    });

    // NotificationRule has many NotificationHistory
    NotificationRule.hasMany(models.NotificationHistory, {
      foreignKey: 'notification_rule_id',
      as: 'history',
      onDelete: 'CASCADE',
    });
  };

  /**
   * Scopes for common queries
   */
  NotificationRule.addScope('active', {
    where: { is_enabled: true },
  });

  NotificationRule.addScope('fieldUpdate', {
    where: { trigger_type: 'field_update' },
  });

  NotificationRule.addScope('scheduled', {
    where: { trigger_type: 'scheduled' },
  });

  NotificationRule.addScope('highPriority', {
    where: { priority: 'high' },
  });

  NotificationRule.addScope('withForm', {
    include: [
      {
        model: sequelize.models.Form,
        as: 'form',
        attributes: ['id', 'title'],
      },
    ],
  });

  NotificationRule.addScope('withCreator', {
    include: [
      {
        model: sequelize.models.User,
        as: 'creator',
        attributes: ['id', 'username', 'email'],
      },
    ],
  });

  /**
   * Override toJSON to format output
   */
  NotificationRule.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());

    // Add computed properties
    if (values.bot_token) {
      values.hasCustomBotToken = true;
      delete values.bot_token; // Don't expose token in API responses
    }

    return values;
  };

  return NotificationRule;
};
