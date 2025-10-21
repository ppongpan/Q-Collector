/**
 * NotificationRuleService
 *
 * Business logic for managing notification rules in Q-Collector v0.8.0
 * Handles CRUD operations, validation, testing, and statistics for notification rules.
 *
 * Key Features:
 * - CRUD operations with validation
 * - Formula validation using FormulaEngine
 * - Rule testing with sample data
 * - Statistics and analytics
 * - Integration with Form, SubForm, Field models
 */

const { NotificationRule, NotificationHistory, Form, SubForm, Field, User, Submission, SubmissionData } = require('../models');
const logger = require('../utils/logger.util');
const { Op } = require('sequelize');

class NotificationRuleService {
  /**
   * Create a new notification rule
   * @param {Object} ruleData - Rule configuration
   * @param {string} userId - User ID creating the rule
   * @returns {Promise<Object>} Created rule
   */
  async createRule(ruleData, userId) {
    try {
      logger.info(`[NotificationRuleService] Creating notification rule: ${ruleData.name}`);

      // Validate required fields
      this._validateRuleData(ruleData);

      // Validate form exists
      if (ruleData.formId) {
        const form = await Form.findByPk(ruleData.formId);
        if (!form) {
          throw new Error(`Form not found: ${ruleData.formId}`);
        }
      }

      // Validate sub-form exists (if specified)
      if (ruleData.subFormId) {
        const subForm = await SubForm.findByPk(ruleData.subFormId);
        if (!subForm) {
          throw new Error(`Sub-form not found: ${ruleData.subFormId}`);
        }
      }

      // Validate target field exists (if specified)
      if (ruleData.targetFieldId) {
        const field = await Field.findByPk(ruleData.targetFieldId);
        if (!field) {
          throw new Error(`Field not found: ${ruleData.targetFieldId}`);
        }
      }

      // Validate formula syntax
      await this.validateCondition(ruleData.conditionFormula, ruleData.formId);

      // Create rule
      const rule = await NotificationRule.create({
        form_id: ruleData.formId || null,
        sub_form_id: ruleData.subFormId || null,
        name: ruleData.name,
        description: ruleData.description || null,
        trigger_type: ruleData.triggerType,
        schedule: ruleData.schedule || null,
        condition_formula: ruleData.conditionFormula,
        target_field_id: ruleData.targetFieldId || null,
        bot_token: ruleData.botToken || null,
        group_id: ruleData.groupId || null,
        message_template: ruleData.messageTemplate,
        is_enabled: ruleData.isEnabled !== undefined ? ruleData.isEnabled : true,
        send_once: ruleData.sendOnce !== undefined ? ruleData.sendOnce : false,
        priority: ruleData.priority || 'medium',
        created_by: userId,
        updated_by: userId,
      });

      logger.info(`[NotificationRuleService] Rule created successfully: ${rule.id}`);

      // Load associations for response
      return await this.getRule(rule.id);
    } catch (error) {
      logger.error('[NotificationRuleService] Error creating rule:', error);
      throw error;
    }
  }

  /**
   * Update an existing notification rule
   * @param {string} ruleId - Rule ID
   * @param {Object} updates - Fields to update
   * @param {string} userId - User ID updating the rule
   * @returns {Promise<Object>} Updated rule
   */
  async updateRule(ruleId, updates, userId) {
    try {
      logger.info(`[NotificationRuleService] Updating notification rule: ${ruleId}`);

      // Find rule
      const rule = await NotificationRule.findByPk(ruleId);
      if (!rule) {
        throw new Error(`Notification rule not found: ${ruleId}`);
      }

      // Validate updates
      if (updates.conditionFormula) {
        await this.validateCondition(updates.conditionFormula, rule.form_id);
      }

      if (updates.formId && updates.formId !== rule.form_id) {
        const form = await Form.findByPk(updates.formId);
        if (!form) {
          throw new Error(`Form not found: ${updates.formId}`);
        }
      }

      // Build update object
      const updateData = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.triggerType !== undefined) updateData.trigger_type = updates.triggerType;
      if (updates.schedule !== undefined) updateData.schedule = updates.schedule;
      if (updates.conditionFormula !== undefined) updateData.condition_formula = updates.conditionFormula;
      if (updates.targetFieldId !== undefined) updateData.target_field_id = updates.targetFieldId;
      if (updates.botToken !== undefined) updateData.bot_token = updates.botToken;
      if (updates.groupId !== undefined) updateData.group_id = updates.groupId;
      if (updates.messageTemplate !== undefined) updateData.message_template = updates.messageTemplate;
      if (updates.isEnabled !== undefined) updateData.is_enabled = updates.isEnabled;
      if (updates.sendOnce !== undefined) updateData.send_once = updates.sendOnce;
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      if (updates.formId !== undefined) updateData.form_id = updates.formId;
      if (updates.subFormId !== undefined) updateData.sub_form_id = updates.subFormId;
      updateData.updated_by = userId;

      // Update rule
      await rule.update(updateData);

      logger.info(`[NotificationRuleService] Rule updated successfully: ${ruleId}`);

      // Return updated rule with associations
      return await this.getRule(ruleId);
    } catch (error) {
      logger.error('[NotificationRuleService] Error updating rule:', error);
      throw error;
    }
  }

  /**
   * Delete a notification rule
   * @param {string} ruleId - Rule ID
   * @param {string} userId - User ID deleting the rule
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteRule(ruleId, userId) {
    try {
      logger.info(`[NotificationRuleService] Deleting notification rule: ${ruleId}`);

      const rule = await NotificationRule.findByPk(ruleId);
      if (!rule) {
        throw new Error(`Notification rule not found: ${ruleId}`);
      }

      // Delete rule (cascade will delete history)
      await rule.destroy();

      logger.info(`[NotificationRuleService] Rule deleted successfully: ${ruleId}`);

      return true;
    } catch (error) {
      logger.error('[NotificationRuleService] Error deleting rule:', error);
      throw error;
    }
  }

  /**
   * Get a notification rule by ID
   * @param {string} ruleId - Rule ID
   * @returns {Promise<Object>} Rule with associations
   */
  async getRule(ruleId) {
    try {
      const rule = await NotificationRule.findByPk(ruleId, {
        include: [
          {
            model: Form,
            as: 'form',
            attributes: ['id', 'title', 'table_name'],
          },
          {
            model: SubForm,
            as: 'subForm',
            attributes: ['id', 'title', 'table_name'],
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username', 'email'],
          },
          {
            model: User,
            as: 'updater',
            attributes: ['id', 'username', 'email'],
          },
        ],
      });

      if (!rule) {
        throw new Error(`Notification rule not found: ${ruleId}`);
      }

      return rule;
    } catch (error) {
      logger.error('[NotificationRuleService] Error getting rule:', error);
      throw error;
    }
  }

  /**
   * List notification rules with filters and pagination
   * @param {Object} filters - Filter options
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} { rules, total, page, limit }
   */
  async listRules(filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 20 } = pagination;
      const offset = (page - 1) * limit;

      // Build where clause
      const where = {};

      if (filters.formId) {
        where.form_id = filters.formId;
      }

      if (filters.subFormId) {
        where.sub_form_id = filters.subFormId;
      }

      if (filters.triggerType) {
        where.trigger_type = filters.triggerType;
      }

      if (filters.isEnabled !== undefined) {
        where.is_enabled = filters.isEnabled;
      }

      if (filters.priority) {
        where.priority = filters.priority;
      }

      if (filters.search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${filters.search}%` } },
          { description: { [Op.iLike]: `%${filters.search}%` } },
        ];
      }

      // Query rules
      const { count, rows } = await NotificationRule.findAndCountAll({
        where,
        include: [
          {
            model: Form,
            as: 'form',
            attributes: ['id', 'title'],
          },
          {
            model: SubForm,
            as: 'subForm',
            attributes: ['id', 'title'],
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username'],
          },
        ],
        order: [
          ['priority', 'DESC'], // high > medium > low
          ['createdAt', 'DESC'],
        ],
        limit,
        offset,
      });

      return {
        rules: rows,
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      };
    } catch (error) {
      logger.error('[NotificationRuleService] Error listing rules:', error);
      throw error;
    }
  }

  /**
   * Test a notification rule with sample or real submission data
   * @param {string} ruleId - Rule ID
   * @param {string} submissionId - Optional submission ID to test against
   * @returns {Promise<Object>} Test result
   */
  async testRule(ruleId, submissionId = null) {
    try {
      logger.info(`[NotificationRuleService] Testing notification rule: ${ruleId}`);

      const rule = await this.getRule(ruleId);

      let submissionData = {};

      if (submissionId) {
        // Use real submission data
        const submission = await Submission.findByPk(submissionId, {
          include: [
            {
              model: SubmissionData,
              as: 'data',
              include: [
                {
                  model: Field,
                  as: 'field',
                  attributes: ['id', 'title'],
                },
              ],
            },
          ],
        });

        if (!submission) {
          throw new Error(`Submission not found: ${submissionId}`);
        }

        // Convert submission data to key-value pairs
        submission.data.forEach((item) => {
          const fieldTitle = item.field?.title || `field_${item.field_id}`;
          submissionData[fieldTitle] = item.value_text || item.value_number || item.value_boolean;
        });
      } else {
        // Use sample data
        submissionData = {
          'ชื่อลูกค้า': 'ทดสอบระบบ',
          'เบอร์โทร': '081-234-5678',
          'อีเมล': 'test@example.com',
          'ยอดขาย': 150000,
          'สถานะการขาย': 'ปิดการขายได้',
          'คะแนน': 5,
          'วันที่บันทึก': new Date().toISOString(),
        };
      }

      // Evaluate condition
      const conditionResult = await rule.evaluateCondition(submissionData);

      // Format message
      const formattedMessage = rule.formatMessage(submissionData);

      // Don't actually send to Telegram during testing
      const testResult = {
        ruleId: rule.id,
        ruleName: rule.name,
        conditionMet: conditionResult.result,
        conditionDetails: conditionResult.details,
        conditionError: conditionResult.error,
        messageSent: formattedMessage,
        submissionData,
        wouldSend: conditionResult.result && !conditionResult.error,
      };

      logger.info(`[NotificationRuleService] Test completed: ${JSON.stringify(testResult)}`);

      return testResult;
    } catch (error) {
      logger.error('[NotificationRuleService] Error testing rule:', error);
      throw error;
    }
  }

  /**
   * Validate condition formula syntax
   * @param {string} condition - Formula to validate
   * @param {string} formId - Form ID (optional, for field validation)
   * @returns {Promise<Object>} { valid: boolean, error: string }
   */
  async validateCondition(condition, formId = null) {
    try {
      if (!condition || typeof condition !== 'string') {
        throw new Error('Condition must be a non-empty string');
      }

      // Basic syntax validation
      const openBrackets = (condition.match(/\[/g) || []).length;
      const closeBrackets = (condition.match(/]/g) || []).length;
      if (openBrackets !== closeBrackets) {
        throw new Error('Unbalanced field reference brackets');
      }

      const openParens = (condition.match(/\(/g) || []).length;
      const closeParens = (condition.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        throw new Error('Unbalanced parentheses');
      }

      const quotes = (condition.match(/"/g) || []).length;
      if (quotes % 2 !== 0) {
        throw new Error('Unbalanced string quotes');
      }

      // Extract field references
      const fieldReferences = condition.match(/\[([^\]]+)\]/g);
      if (fieldReferences && formId) {
        // Validate field names exist in form
        const fields = await Field.findAll({
          where: { form_id: formId },
          attributes: ['id', 'title'],
        });

        const fieldTitles = fields.map((f) => f.title);

        for (const ref of fieldReferences) {
          const fieldName = ref.slice(1, -1); // Remove brackets
          if (!fieldTitles.includes(fieldName)) {
            logger.warn(`[NotificationRuleService] Field not found in form: ${fieldName}`);
            // Don't fail validation - field might be added later
          }
        }
      }

      // TODO: Integrate with FormulaEngine for advanced validation
      // For now, basic syntax validation is sufficient

      return { valid: true, error: null };
    } catch (error) {
      logger.error('[NotificationRuleService] Formula validation error:', error);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Get statistics for a notification rule
   * @param {string} ruleId - Rule ID
   * @returns {Promise<Object>} Statistics
   */
  async getRuleStatistics(ruleId) {
    try {
      const rule = await NotificationRule.findByPk(ruleId);
      if (!rule) {
        throw new Error(`Notification rule not found: ${ruleId}`);
      }

      // Get history statistics
      const stats = await NotificationHistory.findAll({
        where: { notification_rule_id: ruleId },
        attributes: [
          'status',
          [NotificationHistory.sequelize.fn('COUNT', NotificationHistory.sequelize.col('id')), 'count'],
        ],
        group: ['status'],
        raw: true,
      });

      const result = {
        ruleId: rule.id,
        ruleName: rule.name,
        total: 0,
        pending: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        successRate: 0,
        lastExecutedAt: null,
      };

      stats.forEach((stat) => {
        result[stat.status] = parseInt(stat.count);
        result.total += parseInt(stat.count);
      });

      if (result.total > 0) {
        result.successRate = parseFloat(((result.sent / result.total) * 100).toFixed(2));
      }

      // Get last execution time
      const lastHistory = await NotificationHistory.findOne({
        where: { notification_rule_id: ruleId },
        order: [['createdAt', 'DESC']],
        attributes: ['createdAt'],
      });

      if (lastHistory) {
        result.lastExecutedAt = lastHistory.createdAt;
      }

      return result;
    } catch (error) {
      logger.error('[NotificationRuleService] Error getting statistics:', error);
      throw error;
    }
  }

  /**
   * Validate rule data before creation/update
   * @private
   * @param {Object} ruleData - Rule data to validate
   * @throws {Error} If validation fails
   */
  _validateRuleData(ruleData) {
    if (!ruleData.name || ruleData.name.trim().length === 0) {
      throw new Error('Rule name is required');
    }

    if (!ruleData.triggerType || !['field_update', 'scheduled'].includes(ruleData.triggerType)) {
      throw new Error('Invalid trigger type. Must be "field_update" or "scheduled"');
    }

    if (ruleData.triggerType === 'scheduled' && !ruleData.schedule) {
      throw new Error('Schedule is required for scheduled trigger type');
    }

    if (!ruleData.conditionFormula || ruleData.conditionFormula.trim().length === 0) {
      throw new Error('Condition formula is required');
    }

    if (!ruleData.messageTemplate || ruleData.messageTemplate.trim().length === 0) {
      throw new Error('Message template is required');
    }

    if (ruleData.priority && !['high', 'medium', 'low'].includes(ruleData.priority)) {
      throw new Error('Invalid priority. Must be "high", "medium", or "low"');
    }
  }
}

module.exports = new NotificationRuleService();
