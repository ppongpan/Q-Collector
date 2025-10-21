/**
 * NotificationExecutorService
 *
 * Executes notification rules and sends Telegram notifications
 * Q-Collector v0.8.0 Advanced Telegram Notification System
 *
 * Key Features:
 * - Formula evaluation using FormulaEngine
 * - Message template rendering with field placeholders
 * - Telegram API integration
 * - Notification history tracking
 * - Duplicate prevention (send_once)
 * - Error handling and retry logic
 */

const { NotificationRule, NotificationHistory, Submission, SubmissionData, Field, Form } = require('../models');
const telegramService = require('./TelegramService');
const formulaEngine = require('../utils/formulaEngine');
const logger = require('../utils/logger.util');

class NotificationExecutorService {
  constructor() {
    this.telegramService = telegramService; // Use singleton instance
  }

  /**
   * Execute a notification rule for a specific submission
   * @param {string|Object} ruleIdOrRule - Rule ID or Rule object
   * @param {string} submissionId - Submission ID
   * @returns {Promise<Object>} Execution result
   */
  async executeRule(ruleIdOrRule, submissionId) {
    let rule;
    let submission;
    let historyEntry;

    try {
      logger.info(`[NotificationExecutorService] Executing rule for submission ${submissionId}`);

      // Get rule
      if (typeof ruleIdOrRule === 'string') {
        rule = await NotificationRule.findByPk(ruleIdOrRule, {
          include: [
            { model: Form, as: 'form', attributes: ['id', 'title'] },
          ],
        });
        if (!rule) {
          throw new Error(`Notification rule not found: ${ruleIdOrRule}`);
        }
      } else {
        rule = ruleIdOrRule;
      }

      // Check if rule is enabled
      if (!rule.is_enabled) {
        logger.info(`[NotificationExecutorService] Rule ${rule.id} is disabled, skipping`);
        return {
          success: false,
          skipped: true,
          reason: 'Rule is disabled',
        };
      }

      // Check if notification should be sent (send_once logic)
      const shouldSend = await this.shouldSendNotification(rule, submissionId);
      if (!shouldSend) {
        logger.info(`[NotificationExecutorService] Notification already sent for rule ${rule.id} and submission ${submissionId}`);
        return {
          success: false,
          skipped: true,
          reason: 'Notification already sent (send_once)',
        };
      }

      // Get submission data
      submission = await Submission.findByPk(submissionId, {
        include: [
          {
            model: SubmissionData,
            as: 'data',
            include: [
              {
                model: Field,
                as: 'field',
                attributes: ['id', 'title', 'field_type'],
              },
            ],
          },
        ],
      });

      if (!submission) {
        throw new Error(`Submission not found: ${submissionId}`);
      }

      // Convert submission data to key-value pairs for formula evaluation
      const submissionDataMap = this._buildSubmissionDataMap(submission);

      // Evaluate condition
      const conditionResult = await this.evaluateCondition(rule, submissionDataMap);

      // Create history entry
      historyEntry = await NotificationHistory.create({
        notification_rule_id: rule.id,
        submission_id: submissionId,
        sub_submission_id: null,
        condition_met: conditionResult.result,
        condition_result: conditionResult.details,
        status: 'pending',
      });

      // If condition not met, mark as skipped and return
      if (!conditionResult.result) {
        await historyEntry.markAsSkipped('Condition not met');
        logger.info(`[NotificationExecutorService] Condition not met for rule ${rule.id}`);
        return {
          success: false,
          skipped: true,
          reason: 'Condition not met',
          conditionResult,
        };
      }

      // Render message template
      const message = this.renderMessageTemplate(rule.message_template, submissionDataMap);

      // Update history with message
      historyEntry.message_sent = message;
      await historyEntry.save();

      // Send to Telegram
      const telegramResult = await this.sendToTelegram(
        rule.bot_token || process.env.TELEGRAM_BOT_TOKEN,
        rule.group_id || process.env.TELEGRAM_GROUP_ID,
        message
      );

      // Mark as sent
      await historyEntry.markAsSent(telegramResult);

      logger.info(`[NotificationExecutorService] Notification sent successfully for rule ${rule.id}`);

      return {
        success: true,
        skipped: false,
        message,
        telegramResult,
        conditionResult,
        historyId: historyEntry.id,
      };
    } catch (error) {
      logger.error('[NotificationExecutorService] Error executing rule:', error);

      // Mark as failed if history entry exists
      if (historyEntry) {
        await historyEntry.markAsFailed(error.message);
      }

      return {
        success: false,
        skipped: false,
        error: error.message,
      };
    }
  }

  /**
   * Evaluate condition formula against submission data
   * @param {Object} rule - Notification rule
   * @param {Object} submissionData - Submission data as key-value pairs
   * @returns {Promise<Object>} { result: boolean, details: Object, error: string }
   */
  async evaluateCondition(rule, submissionData) {
    try {
      const formula = rule.condition_formula;

      // Use FormulaEngine to evaluate
      const result = formulaEngine.evaluate(formula, submissionData, {});

      return {
        result: Boolean(result),
        details: {
          formula,
          data: submissionData,
          evaluated: result,
        },
        error: null,
      };
    } catch (error) {
      logger.error('[NotificationExecutorService] Condition evaluation error:', error);
      return {
        result: false,
        details: {
          formula: rule.condition_formula,
          data: submissionData,
        },
        error: error.message,
      };
    }
  }

  /**
   * Render message template by replacing {field} placeholders
   * @param {string} template - Message template
   * @param {Object} submissionData - Submission data as key-value pairs
   * @returns {string} Rendered message
   */
  renderMessageTemplate(template, submissionData) {
    let message = template;

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

      // Replace all occurrences (global replace)
      message = message.split(placeholder).join(displayValue);
    });

    return message;
  }

  /**
   * Send message to Telegram
   * @param {string} botToken - Telegram bot token
   * @param {string} groupId - Telegram group/chat ID
   * @param {string} message - Message to send
   * @returns {Promise<Object>} Telegram API response
   */
  async sendToTelegram(botToken, groupId, message) {
    try {
      // Use TelegramService to send message
      const telegramService = this.telegramService;

      // If custom bot token is provided, create temporary service instance
      if (botToken && botToken !== process.env.TELEGRAM_BOT_TOKEN) {
        // For now, use the default service (enhancement: support multiple bot tokens)
        logger.warn('[NotificationExecutorService] Custom bot tokens not yet fully supported, using default');
      }

      // Send message
      const response = await telegramService.sendMessage(groupId, message, {
        parse_mode: 'Markdown',
      });

      return response;
    } catch (error) {
      logger.error('[NotificationExecutorService] Telegram send error:', error);
      throw error;
    }
  }

  /**
   * Check if notification should be sent (considering send_once)
   * @param {Object} rule - Notification rule
   * @param {string} submissionId - Submission ID
   * @returns {Promise<boolean>}
   */
  async shouldSendNotification(rule, submissionId) {
    if (!rule.send_once) {
      return true; // Always send if send_once is false
    }

    // Check if already sent
    const existingNotification = await NotificationHistory.findOne({
      where: {
        notification_rule_id: rule.id,
        submission_id: submissionId,
        status: 'sent',
      },
    });

    return !existingNotification;
  }

  /**
   * Record notification history
   * @param {Object} data - History data
   * @returns {Promise<Object>} Created history entry
   */
  async recordHistory(data) {
    try {
      const history = await NotificationHistory.create({
        notification_rule_id: data.ruleId,
        submission_id: data.submissionId || null,
        sub_submission_id: data.subSubmissionId || null,
        condition_met: data.conditionMet,
        condition_result: data.conditionResult || null,
        message_sent: data.messageSent || null,
        telegram_response: data.telegramResponse || null,
        status: data.status || 'pending',
        error_message: data.errorMessage || null,
        sent_at: data.sentAt || null,
      });

      return history;
    } catch (error) {
      logger.error('[NotificationExecutorService] Error recording history:', error);
      throw error;
    }
  }

  /**
   * Build submission data map from submission object
   * @private
   * @param {Object} submission - Submission with included data
   * @returns {Object} Key-value map of field names to values
   */
  _buildSubmissionDataMap(submission) {
    const dataMap = {};

    // Add submission-level fields
    dataMap['วันที่บันทึกข้อมูล'] = submission.submitted_at;
    dataMap['submittedAt'] = submission.submitted_at;

    // Add field data
    if (submission.data && Array.isArray(submission.data)) {
      submission.data.forEach((item) => {
        const fieldTitle = item.field?.title || `field_${item.field_id}`;

        // Get value based on field type
        let value = null;
        if (item.value_text !== null) {
          value = item.value_text;
        } else if (item.value_number !== null) {
          value = item.value_number;
        } else if (item.value_boolean !== null) {
          value = item.value_boolean;
        } else if (item.value_date !== null) {
          value = item.value_date;
        }

        dataMap[fieldTitle] = value;
      });
    }

    return dataMap;
  }

  /**
   * Execute multiple rules for a submission (batch processing)
   * @param {Array<string>} ruleIds - Array of rule IDs
   * @param {string} submissionId - Submission ID
   * @returns {Promise<Array<Object>>} Array of execution results
   */
  async executeRules(ruleIds, submissionId) {
    const results = [];

    for (const ruleId of ruleIds) {
      try {
        const result = await this.executeRule(ruleId, submissionId);
        results.push({
          ruleId,
          ...result,
        });
      } catch (error) {
        logger.error(`[NotificationExecutorService] Error executing rule ${ruleId}:`, error);
        results.push({
          ruleId,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Test notification execution (dry run)
   * @param {string} ruleId - Rule ID
   * @param {Object} testData - Test data
   * @returns {Promise<Object>} Test result
   */
  async testNotification(ruleId, testData = {}) {
    try {
      const rule = await NotificationRule.findByPk(ruleId);
      if (!rule) {
        throw new Error(`Notification rule not found: ${ruleId}`);
      }

      // Use test data or sample data
      const submissionData = Object.keys(testData).length > 0 ? testData : {
        'ชื่อลูกค้า': 'ทดสอบระบบ',
        'เบอร์โทร': '081-234-5678',
        'ยอดขาย': 150000,
        'สถานะการขาย': 'ปิดการขายได้',
        'วันที่บันทึกข้อมูล': new Date().toISOString(),
      };

      // Evaluate condition
      const conditionResult = await this.evaluateCondition(rule, submissionData);

      // Render message
      const message = this.renderMessageTemplate(rule.message_template, submissionData);

      return {
        success: true,
        ruleId: rule.id,
        ruleName: rule.name,
        conditionMet: conditionResult.result,
        conditionDetails: conditionResult.details,
        message,
        testData: submissionData,
        wouldSend: conditionResult.result,
        note: 'This is a test execution - no notification was sent',
      };
    } catch (error) {
      logger.error('[NotificationExecutorService] Test notification error:', error);
      throw error;
    }
  }
}

module.exports = new NotificationExecutorService();
