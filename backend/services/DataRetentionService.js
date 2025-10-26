/**
 * DataRetentionService for Q-Collector PDPA Data Retention Management
 *
 * Manages automatic identification and deletion of data that has exceeded
 * its retention period as defined in consent items. Ensures PDPA compliance
 * by not keeping personal data longer than necessary.
 *
 * @version v0.8.2-dev
 * @date 2025-10-24
 *
 * Features:
 * - Automatic expired data detection
 * - Retention period parsing ("2 years", "6 months", "90 days")
 * - Soft delete with audit trail
 * - Dry-run mode for testing
 * - Admin notifications via Telegram
 * - Comprehensive retention reports
 * - Transaction-based deletions for data integrity
 */

const { Op } = require('sequelize');
const logger = require('../utils/logger.util');
const sequelize = require('../config/database.config');
const telegramService = require('./TelegramService');

class DataRetentionService {
  constructor() {
    this.models = null;
    this.initialized = false;
  }

  /**
   * Initialize service with models
   */
  async initialize() {
    if (this.initialized) return;

    try {
      this.models = require('../models');
      this.initialized = true;
      logger.info('DataRetentionService initialized');
    } catch (error) {
      logger.error('Failed to initialize DataRetentionService:', error);
      throw error;
    }
  }

  /**
   * Get all data that has exceeded its retention period
   *
   * @param {Object} options - Query options
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.limit - Items per page (default: 50)
   * @param {string} options.category - Filter by category: 'consents', 'submissions', 'all' (default: 'all')
   * @returns {Promise<Object>} Expired data grouped by category with pagination
   */
  async getExpiredData({ page = 1, limit = 50, category = 'all' } = {}) {
    await this.initialize();

    try {
      const offset = (page - 1) * limit;
      const result = {
        expiredData: [],
        total: 0,
        byCategory: {
          consents: 0,
          submissions: 0,
        },
        oldestExpiry: null,
        newestExpiry: null,
        page,
        limit,
        totalPages: 0,
      };

      // Get expired consents
      if (category === 'all' || category === 'consents') {
        const expiredConsents = await this.getExpiredConsents();
        result.byCategory.consents = expiredConsents.length;

        if (category === 'consents') {
          result.expiredData = expiredConsents.slice(offset, offset + limit);
          result.total = expiredConsents.length;
        }
      }

      // Get expired submissions
      if (category === 'all' || category === 'submissions') {
        const expiredSubmissions = await this.getExpiredSubmissions();
        result.byCategory.submissions = expiredSubmissions.length;

        if (category === 'submissions') {
          result.expiredData = expiredSubmissions.slice(offset, offset + limit);
          result.total = expiredSubmissions.length;
        }
      }

      // If category is 'all', combine both
      if (category === 'all') {
        const allExpired = [
          ...await this.getExpiredConsents(),
          ...await this.getExpiredSubmissions(),
        ];

        // Sort by expiry date
        allExpired.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

        result.total = allExpired.length;
        result.expiredData = allExpired.slice(offset, offset + limit);

        if (allExpired.length > 0) {
          result.oldestExpiry = allExpired[0].expiryDate;
          result.newestExpiry = allExpired[allExpired.length - 1].expiryDate;
        }
      }

      result.totalPages = Math.ceil(result.total / limit);

      logger.info(`Found ${result.total} expired data items (category: ${category})`);
      return result;

    } catch (error) {
      logger.error('Error getting expired data:', error);
      throw error;
    }
  }

  /**
   * Calculate expiry date from retention period and start date
   *
   * @param {string} retentionPeriod - Retention period string (e.g., "2 years", "6 months", "90 days")
   * @param {Date} startDate - Start date for calculation
   * @returns {Date|null} Expiry date or null if permanent
   */
  calculateRetentionExpiry(retentionPeriod, startDate) {
    if (!retentionPeriod || retentionPeriod.toLowerCase() === 'permanent') {
      return null;
    }

    const parsed = this._parseRetentionPeriod(retentionPeriod);
    if (!parsed) {
      logger.warn(`Invalid retention period format: ${retentionPeriod}`);
      return null;
    }

    const expiryDate = new Date(startDate);

    switch (parsed.unit) {
      case 'years':
        expiryDate.setFullYear(expiryDate.getFullYear() + parsed.value);
        break;
      case 'months':
        expiryDate.setMonth(expiryDate.getMonth() + parsed.value);
        break;
      case 'days':
        expiryDate.setDate(expiryDate.getDate() + parsed.value);
        break;
      default:
        logger.warn(`Unknown retention period unit: ${parsed.unit}`);
        return null;
    }

    return expiryDate;
  }

  /**
   * Get all consents that have exceeded their retention period
   *
   * @returns {Promise<Array>} Array of expired consent records with metadata
   */
  async getExpiredConsents() {
    await this.initialize();

    try {
      const { UserConsent, ConsentItem, Submission, Form, User } = this.models;

      // Find all consents with retention periods
      const consents = await UserConsent.findAll({
        include: [
          {
            model: ConsentItem,
            as: 'consentItem',
            where: {
              retention_period: {
                [Op.ne]: null,
                [Op.notLike]: '%permanent%',
              },
            },
            required: true,
          },
          {
            model: Submission,
            as: 'submission',
            attributes: ['id', 'submitted_at', 'status'],
            required: true,
          },
          {
            model: Form,
            as: 'form',
            attributes: ['id', 'title'],
            required: true,
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email'],
            required: false,
          },
        ],
      });

      // Filter expired consents
      const now = new Date();
      const expiredConsents = [];

      for (const consent of consents) {
        const expiryDate = this.calculateRetentionExpiry(
          consent.consentItem.retention_period,
          consent.consented_at
        );

        if (expiryDate && expiryDate < now) {
          expiredConsents.push({
            id: consent.id,
            type: 'consent',
            consentId: consent.id,
            submissionId: consent.submission_id,
            formId: consent.form_id,
            formTitle: consent.form.title,
            consentItemTitle: consent.consentItem.title_th,
            retentionPeriod: consent.consentItem.retention_period,
            consentedAt: consent.consented_at,
            expiryDate: expiryDate,
            daysOverdue: Math.floor((now - expiryDate) / (1000 * 60 * 60 * 24)),
            user: consent.user ? {
              id: consent.user.id,
              username: consent.user.username,
              email: consent.user.email,
            } : null,
          });
        }
      }

      logger.info(`Found ${expiredConsents.length} expired consents`);
      return expiredConsents;

    } catch (error) {
      logger.error('Error getting expired consents:', error);
      throw error;
    }
  }

  /**
   * Get all submissions where all consents have expired
   *
   * @returns {Promise<Array>} Array of expired submissions
   */
  async getExpiredSubmissions() {
    await this.initialize();

    try {
      const { Submission, UserConsent, ConsentItem, Form } = this.models;

      // Get all submissions with consents
      const submissions = await Submission.findAll({
        include: [
          {
            model: UserConsent,
            as: 'userConsents',
            include: [
              {
                model: ConsentItem,
                as: 'consentItem',
                attributes: ['id', 'title_th', 'retention_period'],
              },
            ],
            required: true,
          },
          {
            model: Form,
            as: 'form',
            attributes: ['id', 'title'],
          },
        ],
      });

      const now = new Date();
      const expiredSubmissions = [];

      for (const submission of submissions) {
        // Check if ALL consents for this submission have expired
        const consents = submission.userConsents;
        if (consents.length === 0) continue;

        let allExpired = true;
        let oldestExpiry = null;

        for (const consent of consents) {
          const retentionPeriod = consent.consentItem.retention_period;

          // If any consent is permanent, submission is not expired
          if (!retentionPeriod || retentionPeriod.toLowerCase() === 'permanent') {
            allExpired = false;
            break;
          }

          const expiryDate = this.calculateRetentionExpiry(
            retentionPeriod,
            consent.consented_at
          );

          // If any consent is not expired, submission is not expired
          if (!expiryDate || expiryDate >= now) {
            allExpired = false;
            break;
          }

          // Track oldest expiry date
          if (!oldestExpiry || expiryDate < oldestExpiry) {
            oldestExpiry = expiryDate;
          }
        }

        if (allExpired) {
          expiredSubmissions.push({
            id: submission.id,
            type: 'submission',
            submissionId: submission.id,
            formId: submission.form_id,
            formTitle: submission.form.title,
            submittedAt: submission.submitted_at,
            expiryDate: oldestExpiry,
            daysOverdue: Math.floor((now - oldestExpiry) / (1000 * 60 * 60 * 24)),
            consentsCount: consents.length,
            status: submission.status,
          });
        }
      }

      logger.info(`Found ${expiredSubmissions.length} expired submissions`);
      return expiredSubmissions;

    } catch (error) {
      logger.error('Error getting expired submissions:', error);
      throw error;
    }
  }

  /**
   * Delete expired data (soft delete with audit trail)
   *
   * @param {Object} options - Deletion options
   * @param {Array} options.dataIds - Array of data IDs to delete
   * @param {string} options.category - Category: 'consents', 'submissions', 'all'
   * @param {string} options.reason - Reason for deletion
   * @param {string} options.deletedBy - User ID of person initiating deletion
   * @param {boolean} options.hardDelete - If true, permanently delete (use with caution!)
   * @returns {Promise<Object>} Deletion result with counts and audit info
   */
  async deleteExpiredData({
    dataIds = [],
    category = 'all',
    reason = 'PDPA retention period expired',
    deletedBy = null,
    hardDelete = false,
  } = {}) {
    await this.initialize();

    const transaction = await sequelize.transaction();

    try {
      const result = {
        deleted: 0,
        failed: [],
        audit: [],
        category,
        deletionMethod: hardDelete ? 'hard' : 'soft',
      };

      // Delete consents
      if (category === 'all' || category === 'consents') {
        const consentResult = await this._deleteConsents(
          dataIds,
          reason,
          deletedBy,
          hardDelete,
          transaction
        );
        result.deleted += consentResult.deleted;
        result.failed.push(...consentResult.failed);
        result.audit.push(...consentResult.audit);
      }

      // Delete submissions
      if (category === 'all' || category === 'submissions') {
        const submissionResult = await this._deleteSubmissions(
          dataIds,
          reason,
          deletedBy,
          hardDelete,
          transaction
        );
        result.deleted += submissionResult.deleted;
        result.failed.push(...submissionResult.failed);
        result.audit.push(...submissionResult.audit);
      }

      await transaction.commit();

      logger.info(`Deleted ${result.deleted} expired data items (${result.deletionMethod} delete)`);
      return result;

    } catch (error) {
      await transaction.rollback();
      logger.error('Error deleting expired data:', error);
      throw error;
    }
  }

  /**
   * Schedule automatic deletion of expired data (cron job)
   *
   * @param {Object} options - Scheduling options
   * @param {string} options.category - Category to process: 'consents', 'submissions', 'all'
   * @param {boolean} options.dryRun - If true, report only (no actual deletion)
   * @param {string} options.deletedBy - User ID (system if automated)
   * @returns {Promise<Object>} Summary of scheduled deletion
   */
  async scheduleAutoDeletion({ category = 'all', dryRun = true, deletedBy = 'SYSTEM' } = {}) {
    await this.initialize();

    try {
      const startTime = Date.now();
      const summary = {
        dryRun,
        category,
        startedAt: new Date(),
        completedAt: null,
        duration: null,
        expired: {
          consents: [],
          submissions: [],
          total: 0,
        },
        deleted: {
          consents: 0,
          submissions: 0,
          total: 0,
        },
        errors: [],
      };

      // Get all expired data
      const expiredData = await this.getExpiredData({ category, limit: 1000 });

      summary.expired.total = expiredData.total;
      summary.expired.consents = expiredData.byCategory.consents;
      summary.expired.submissions = expiredData.byCategory.submissions;

      if (dryRun) {
        logger.info(`[DRY RUN] Would delete ${expiredData.total} expired items`);
        summary.message = 'Dry run completed - no data was deleted';
      } else {
        // Actually delete expired data
        const dataIds = expiredData.expiredData.map(item => item.id);

        try {
          const deleteResult = await this.deleteExpiredData({
            dataIds,
            category,
            reason: 'Automatic PDPA retention period cleanup',
            deletedBy,
            hardDelete: false, // Always soft delete for automated processes
          });

          summary.deleted.total = deleteResult.deleted;
          summary.message = `Successfully deleted ${deleteResult.deleted} expired items`;

          // Send notification to admins
          await this._notifyAdmins(summary);

        } catch (error) {
          summary.errors.push({
            message: error.message,
            stack: error.stack,
          });
          logger.error('Auto-deletion failed:', error);
        }
      }

      summary.completedAt = new Date();
      summary.duration = Date.now() - startTime;

      logger.info(`Auto-deletion ${dryRun ? '(dry run)' : ''} completed in ${summary.duration}ms`);
      return summary;

    } catch (error) {
      logger.error('Error in scheduled auto-deletion:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive retention compliance report
   *
   * @param {Object} options - Report options
   * @param {Date} options.startDate - Start date for report period
   * @param {Date} options.endDate - End date for report period
   * @returns {Promise<Object>} Retention compliance statistics
   */
  async getRetentionReport({ startDate = null, endDate = null } = {}) {
    await this.initialize();

    try {
      const { UserConsent, ConsentItem, Submission, Form } = this.models;

      const report = {
        generatedAt: new Date(),
        period: {
          startDate: startDate || new Date(0),
          endDate: endDate || new Date(),
        },
        summary: {
          totalConsents: 0,
          expiredConsents: 0,
          activeConsents: 0,
          totalSubmissions: 0,
          expiredSubmissions: 0,
          activeSubmissions: 0,
        },
        byRetentionPeriod: {},
        byForm: {},
        complianceRate: 0,
      };

      // Count total consents
      const whereClause = {};
      if (startDate) whereClause.consented_at = { [Op.gte]: startDate };
      if (endDate) whereClause.consented_at = { ...whereClause.consented_at, [Op.lte]: endDate };

      report.summary.totalConsents = await UserConsent.count({ where: whereClause });

      // Get expired data
      const expiredData = await this.getExpiredData({ category: 'all', limit: 10000 });
      report.summary.expiredConsents = expiredData.byCategory.consents;
      report.summary.expiredSubmissions = expiredData.byCategory.submissions;
      report.summary.activeConsents = report.summary.totalConsents - report.summary.expiredConsents;

      // Group by retention period
      const consentItems = await ConsentItem.findAll({
        attributes: [
          'retention_period',
          [sequelize.fn('COUNT', sequelize.col('userConsents.id')), 'count'],
        ],
        include: [
          {
            model: UserConsent,
            as: 'userConsents',
            attributes: [],
            required: false,
          },
        ],
        group: ['ConsentItem.id', 'ConsentItem.retention_period'],
        raw: false,
      });

      for (const item of consentItems) {
        const period = item.retention_period || 'permanent';
        if (!report.byRetentionPeriod[period]) {
          report.byRetentionPeriod[period] = 0;
        }
        report.byRetentionPeriod[period] += parseInt(item.dataValues.count || 0);
      }

      // Group by form
      const forms = await Form.findAll({
        attributes: ['id', 'title'],
        include: [
          {
            model: UserConsent,
            as: 'userConsents',
            attributes: [],
            required: false,
          },
        ],
      });

      for (const form of forms) {
        const formConsents = await UserConsent.count({ where: { form_id: form.id } });
        report.byForm[form.title] = {
          formId: form.id,
          totalConsents: formConsents,
        };
      }

      // Calculate compliance rate
      const totalData = report.summary.totalConsents;
      const expiredCount = report.summary.expiredConsents;
      report.complianceRate = totalData > 0
        ? ((totalData - expiredCount) / totalData * 100).toFixed(2)
        : 100;

      logger.info('Retention compliance report generated');
      return report;

    } catch (error) {
      logger.error('Error generating retention report:', error);
      throw error;
    }
  }

  /**
   * Helper: Parse retention period string
   *
   * @private
   * @param {string} retentionString - e.g., "2 years", "6 months", "90 days"
   * @returns {Object|null} { value: number, unit: string }
   */
  _parseRetentionPeriod(retentionString) {
    if (!retentionString) return null;

    const match = retentionString.match(/^(\d+)\s*(year|month|day)s?$/i);
    if (!match) return null;

    return {
      value: parseInt(match[1]),
      unit: match[2].toLowerCase() + 's', // Normalize to plural
    };
  }

  /**
   * Helper: Check if data is expired
   *
   * @private
   * @param {Date} startDate - Start date
   * @param {string} retentionPeriod - Retention period string
   * @returns {boolean} True if expired
   */
  _isExpired(startDate, retentionPeriod) {
    const expiryDate = this.calculateRetentionExpiry(retentionPeriod, startDate);
    if (!expiryDate) return false;

    return expiryDate < new Date();
  }

  /**
   * Helper: Delete consents
   *
   * @private
   */
  async _deleteConsents(dataIds, reason, deletedBy, hardDelete, transaction) {
    const { UserConsent, AuditLog } = this.models;
    const result = {
      deleted: 0,
      failed: [],
      audit: [],
    };

    try {
      const consents = await UserConsent.findAll({
        where: dataIds.length > 0 ? { id: { [Op.in]: dataIds } } : {},
        transaction,
      });

      for (const consent of consents) {
        try {
          if (hardDelete) {
            // Hard delete (permanent removal)
            await consent.destroy({ transaction });
          } else {
            // Soft delete (mark as deleted)
            await consent.update(
              {
                deleted_at: new Date(),
                deletion_reason: reason,
              },
              { transaction }
            );
          }

          // Create audit log
          const auditEntry = await this._createDeletionAudit(
            'consent',
            consent.id,
            reason,
            deletedBy,
            transaction
          );
          result.audit.push(auditEntry);
          result.deleted++;

        } catch (error) {
          logger.error(`Failed to delete consent ${consent.id}:`, error);
          result.failed.push({
            id: consent.id,
            error: error.message,
          });
        }
      }

    } catch (error) {
      logger.error('Error in _deleteConsents:', error);
      throw error;
    }

    return result;
  }

  /**
   * Helper: Delete submissions
   *
   * @private
   */
  async _deleteSubmissions(dataIds, reason, deletedBy, hardDelete, transaction) {
    const { Submission, AuditLog } = this.models;
    const result = {
      deleted: 0,
      failed: [],
      audit: [],
    };

    try {
      const submissions = await Submission.findAll({
        where: dataIds.length > 0 ? { id: { [Op.in]: dataIds } } : {},
        transaction,
      });

      for (const submission of submissions) {
        try {
          if (hardDelete) {
            // Hard delete (permanent removal)
            await submission.destroy({ transaction });
          } else {
            // Soft delete (update status)
            await submission.update(
              {
                status: 'archived',
                metadata: {
                  ...submission.metadata,
                  deleted_at: new Date(),
                  deletion_reason: reason,
                },
              },
              { transaction }
            );
          }

          // Create audit log
          const auditEntry = await this._createDeletionAudit(
            'submission',
            submission.id,
            reason,
            deletedBy,
            transaction
          );
          result.audit.push(auditEntry);
          result.deleted++;

        } catch (error) {
          logger.error(`Failed to delete submission ${submission.id}:`, error);
          result.failed.push({
            id: submission.id,
            error: error.message,
          });
        }
      }

    } catch (error) {
      logger.error('Error in _deleteSubmissions:', error);
      throw error;
    }

    return result;
  }

  /**
   * Helper: Create deletion audit trail
   *
   * @private
   */
  async _createDeletionAudit(category, entityId, reason, deletedBy, transaction) {
    const { AuditLog } = this.models;

    try {
      const auditEntry = await AuditLog.create(
        {
          user_id: deletedBy,
          action: 'delete',
          entity_type: category,
          entity_id: entityId,
          old_value: null,
          new_value: {
            deleted: true,
            reason,
            deleted_at: new Date(),
          },
          ip_address: null,
          user_agent: 'DataRetentionService',
          timestamp: new Date(),
        },
        { transaction }
      );

      logger.debug(`Created audit log for ${category} deletion: ${entityId}`);
      return auditEntry;

    } catch (error) {
      logger.error('Error creating deletion audit:', error);
      throw error;
    }
  }

  /**
   * Helper: Notify admins about scheduled deletions
   *
   * @private
   */
  async _notifyAdmins(summary) {
    try {
      const message = `
🗑️ <b>PDPA Data Retention Cleanup Report</b>

📅 Date: ${summary.startedAt.toLocaleString('th-TH')}
⏱️ Duration: ${summary.duration}ms

📊 <b>Expired Data Found:</b>
• Consents: ${summary.expired.consents}
• Submissions: ${summary.expired.submissions}
• Total: ${summary.expired.total}

${summary.dryRun ? '🔍 <b>DRY RUN MODE</b> - No data was deleted' : `✅ <b>Deleted:</b>
• Consents: ${summary.deleted.consents}
• Submissions: ${summary.deleted.submissions}
• Total: ${summary.deleted.total}`}

${summary.errors.length > 0 ? `❌ <b>Errors:</b> ${summary.errors.length}` : '✅ No errors'}

📋 Category: ${summary.category}
      `.trim();

      // Send to Telegram (if configured)
      if (telegramService.isInitialized && telegramService.groupId) {
        await telegramService.sendMessage(telegramService.groupId, message);
        logger.info('Admin notification sent via Telegram');
      } else {
        logger.info('Telegram not configured - skipping admin notification');
      }

    } catch (error) {
      logger.error('Error notifying admins:', error);
      // Don't throw - notification failure shouldn't stop the process
    }
  }
}

// Export singleton instance
const dataRetentionService = new DataRetentionService();
module.exports = dataRetentionService;
