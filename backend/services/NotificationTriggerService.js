/**
 * NotificationTriggerService
 *
 * Hooks into submission lifecycle to trigger notifications
 * Integrates with SubmissionService for field_update triggers
 *
 * Features:
 * - Hook into submission create/update
 * - Find matching notification rules
 * - Evaluate conditions in real-time
 * - Queue notification jobs asynchronously
 * - Support for main form and sub-form submissions
 *
 * Q-Collector v0.8.0 Advanced Telegram Notification System
 * Created: 2025-10-20
 * Phase: 5 (Integration with SubmissionService)
 */

const { NotificationRule, Submission, SubmissionData, Field } = require('../models');
const NotificationQueue = require('./NotificationQueue');
const NotificationExecutorService = require('./NotificationExecutorService');
const logger = require('../utils/logger.util');

class NotificationTriggerService {
  /**
   * Process notification triggers after submission is created
   * @param {Object} submission - Submission object
   * @returns {Promise<Object>} Processing result
   */
  async onSubmissionCreated(submission) {
    try {
      logger.info(`[NotificationTriggerService] Processing triggers for new submission ${submission.id}`);

      const result = await this.processFieldUpdateTriggers(submission.form_id, submission.id);

      logger.info(`[NotificationTriggerService] Processed ${result.total} rules, queued ${result.queued} notifications`);

      return result;
    } catch (error) {
      logger.error('[NotificationTriggerService] Error processing submission created:', error);
      // Don't throw - notifications should not block submission creation
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Process notification triggers after submission is updated
   * @param {Object} submission - Submission object
   * @param {Object} previousData - Previous submission data (optional)
   * @returns {Promise<Object>} Processing result
   */
  async onSubmissionUpdated(submission, previousData = null) {
    try {
      logger.info(`[NotificationTriggerService] Processing triggers for updated submission ${submission.id}`);

      const result = await this.processFieldUpdateTriggers(submission.form_id, submission.id);

      logger.info(`[NotificationTriggerService] Processed ${result.total} rules, queued ${result.queued} notifications`);

      return result;
    } catch (error) {
      logger.error('[NotificationTriggerService] Error processing submission updated:', error);
      // Don't throw - notifications should not block submission updates
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Process notification triggers for sub-form submission
   * @param {Object} subFormSubmission - Sub-form submission data
   * @returns {Promise<Object>} Processing result
   */
  async onSubFormSubmissionCreated(subFormSubmission) {
    try {
      logger.info(`[NotificationTriggerService] Processing triggers for sub-form submission`);

      // TODO: Implement sub-form notification triggers
      // For now, return success (will be implemented in Phase 6)

      return {
        success: true,
        total: 0,
        queued: 0,
        skipped: 0,
        note: 'Sub-form triggers not yet implemented',
      };
    } catch (error) {
      logger.error('[NotificationTriggerService] Error processing sub-form submission:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Process field_update notification triggers for a submission
   * @param {string} formId - Form ID
   * @param {string} submissionId - Submission ID
   * @returns {Promise<Object>} Processing result
   */
  async processFieldUpdateTriggers(formId, submissionId) {
    try {
      // Find active field_update rules for this form
      const rules = await NotificationRule.findAll({
        where: {
          form_id: formId,
          trigger_type: 'field_update',
          is_enabled: true,
        },
        order: [
          ['priority', 'DESC'], // high > medium > low
          ['created_at', 'ASC'],
        ],
      });

      if (rules.length === 0) {
        logger.debug(`[NotificationTriggerService] No active field_update rules found for form ${formId}`);
        return {
          success: true,
          total: 0,
          queued: 0,
          skipped: 0,
        };
      }

      logger.info(`[NotificationTriggerService] Found ${rules.length} active field_update rules`);

      // Get submission data
      const submission = await Submission.findByPk(submissionId, {
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

      // Build submission data map
      const submissionDataMap = this._buildSubmissionDataMap(submission);

      // Process each rule
      let queued = 0;
      let skipped = 0;

      for (const rule of rules) {
        try {
          // Check if notification should be sent (send_once logic)
          const shouldSend = await NotificationExecutorService.shouldSendNotification(rule, submissionId);

          if (!shouldSend) {
            logger.debug(`[NotificationTriggerService] Rule ${rule.id} skipped: already sent (send_once)`);
            skipped++;
            continue;
          }

          // Evaluate condition
          const conditionResult = await NotificationExecutorService.evaluateCondition(rule, submissionDataMap);

          if (!conditionResult.result) {
            logger.debug(`[NotificationTriggerService] Rule ${rule.id} skipped: condition not met`);
            skipped++;
            continue;
          }

          // Queue notification job
          await this.queueNotificationJob(rule.id, submissionId, rule.priority);
          queued++;

          logger.info(`[NotificationTriggerService] Queued notification for rule ${rule.id} (${rule.name})`);
        } catch (error) {
          logger.error(`[NotificationTriggerService] Error processing rule ${rule.id}:`, error);
          // Continue with other rules even if one fails
        }
      }

      return {
        success: true,
        total: rules.length,
        queued,
        skipped,
      };
    } catch (error) {
      logger.error('[NotificationTriggerService] Error processing field update triggers:', error);
      throw error;
    }
  }

  /**
   * Queue notification job for async processing
   * @param {string} ruleId - Notification rule ID
   * @param {string} submissionId - Submission ID
   * @param {string} priority - Priority level (high, medium, low)
   * @returns {Promise<Object>} Job object
   */
  async queueNotificationJob(ruleId, submissionId, priority = 'medium') {
    try {
      const job = await NotificationQueue.addImmediateNotification(ruleId, submissionId, priority);

      logger.info(`[NotificationTriggerService] Notification job queued: ${job.id}`);

      return job;
    } catch (error) {
      logger.error('[NotificationTriggerService] Error queueing notification job:', error);
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
   * Get active notification rules for a form
   * @param {string} formId - Form ID
   * @param {string} triggerType - Trigger type filter (optional)
   * @returns {Promise<Array>} Active rules
   */
  async getActiveRulesForForm(formId, triggerType = null) {
    try {
      const where = {
        form_id: formId,
        is_enabled: true,
      };

      if (triggerType) {
        where.trigger_type = triggerType;
      }

      const rules = await NotificationRule.findAll({
        where,
        order: [
          ['priority', 'DESC'],
          ['created_at', 'ASC'],
        ],
      });

      return rules;
    } catch (error) {
      logger.error('[NotificationTriggerService] Error getting active rules:', error);
      throw error;
    }
  }

  /**
   * Test notification triggers for a submission (dry run)
   * @param {string} submissionId - Submission ID
   * @returns {Promise<Object>} Test result
   */
  async testTriggersForSubmission(submissionId) {
    try {
      const submission = await Submission.findByPk(submissionId, {
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

      // Get active rules
      const rules = await this.getActiveRulesForForm(submission.form_id, 'field_update');

      // Build submission data map
      const submissionDataMap = this._buildSubmissionDataMap(submission);

      // Evaluate each rule
      const results = [];

      for (const rule of rules) {
        const conditionResult = await NotificationExecutorService.evaluateCondition(rule, submissionDataMap);
        const message = NotificationExecutorService.renderMessageTemplate(rule.message_template, submissionDataMap);
        const shouldSend = await NotificationExecutorService.shouldSendNotification(rule, submissionId);

        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          priority: rule.priority,
          conditionMet: conditionResult.result,
          conditionDetails: conditionResult.details,
          message,
          wouldSend: conditionResult.result && shouldSend,
          sendOnce: rule.send_once,
          alreadySent: !shouldSend,
        });
      }

      return {
        submissionId,
        formId: submission.form_id,
        totalRules: rules.length,
        results,
        note: 'This is a dry run - no notifications were sent',
      };
    } catch (error) {
      logger.error('[NotificationTriggerService] Error testing triggers:', error);
      throw error;
    }
  }
}

module.exports = new NotificationTriggerService();
