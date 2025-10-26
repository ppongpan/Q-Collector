/**
 * ConsentHistoryService
 * Manages consent change tracking and history for PDPA compliance
 *
 * Purpose: Maintain complete audit trail of consent given/withdrawn/edited
 * PDPA Requirements:
 * - Section 15: Records of consent collection
 * - Section 19: Right to withdraw consent
 * - Section 39: Audit trail requirements
 *
 * @version v0.8.2-dev
 * @date 2025-10-24
 */

const { ConsentHistory, UserConsent, ConsentItem, UnifiedUserProfile, User } = require('../models');
const logger = require('../utils/logger.util');
const { Op } = require('sequelize');
const PDPAAuditService = require('./PDPAAuditService');

class ConsentHistoryService {
  /**
   * Record a consent change event
   *
   * @param {Object} data - Consent change data
   * @param {string} data.user_consent_id - User consent record ID
   * @param {string} [data.profile_id] - Profile ID (optional)
   * @param {string} [data.consent_item_id] - Consent item ID (optional)
   * @param {string} data.action - Action: given, withdrawn, edited, renewed, expired
   * @param {string} [data.old_status] - Previous consent status
   * @param {string} [data.new_status] - New consent status
   * @param {string} [data.reason] - Reason for change
   * @param {string} [data.legal_basis] - Legal basis (PDPA Section 24-26)
   * @param {string} [data.signature_data_url] - Digital signature
   * @param {Object} [user] - User who made the change (if admin)
   * @param {Object} [request] - Express request object
   * @param {Object} [options] - Sequelize options (e.g., transaction)
   * @returns {Promise<ConsentHistory>}
   */
  static async recordConsentChange(data, user = null, request = null, options = {}) {
    try {
      const historyData = {
        user_consent_id: data.user_consent_id,
        profile_id: data.profile_id,
        consent_item_id: data.consent_item_id,
        action: data.action,
        old_status: data.old_status,
        new_status: data.new_status,
        reason: data.reason,
        legal_basis: data.legal_basis,
        signature_data_url: data.signature_data_url,
        changed_by_user_id: user?.id,
        changed_by_role: user?.role,
        ip_address: request?.ip || request?.connection?.remoteAddress,
        user_agent: request?.get?.('user-agent')
      };

      const history = await ConsentHistory.create(historyData, options);

      // Also log to PDPA audit log
      await PDPAAuditService.logEvent({
        event_category: 'consent_change',
        event_type: `consent_${data.action}`,
        event_severity: data.action === 'withdrawn' ? 'warning' : 'info',
        description: `Consent ${data.action}: ${data.reason || 'No reason provided'}`,
        profile_id: data.profile_id,
        consent_id: data.user_consent_id,
        old_value_json: data.old_status ? { status: data.old_status } : null,
        new_value_json: data.new_status ? { status: data.new_status } : null,
        pdpa_article: 'Section 15, 19'
      }, user, request, options);

      logger.info(`Recorded consent ${data.action} for consent ${data.user_consent_id}`);
      return history;
    } catch (error) {
      logger.error('Error recording consent change:', error);
      throw error;
    }
  }

  /**
   * Get consent history for a specific consent record
   *
   * @param {string} userConsentId - User consent ID
   * @param {Object} filters - Filter options
   * @param {string} [filters.action] - Filter by action type
   * @param {number} [filters.page=1] - Page number
   * @param {number} [filters.limit=20] - Items per page
   * @returns {Promise<Object>} Paginated consent history
   */
  static async getConsentHistory(userConsentId, filters = {}) {
    try {
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const offset = (page - 1) * limit;

      const where = { user_consent_id: userConsentId };

      if (filters.action) {
        where.action = filters.action;
      }

      const { count, rows } = await ConsentHistory.findAndCountAll({
        where,
        include: [
          {
            model: ConsentItem,
            as: 'consentItem',
            attributes: ['id', 'title_th', 'title_en', 'purpose', 'retention_period']
          },
          {
            model: User,
            as: 'changedBy',
            attributes: ['id', 'username', 'email', 'role']
          }
        ],
        order: [['created_at', 'DESC']],
        limit,
        offset
      });

      logger.info(`Retrieved consent history for ${userConsentId}: ${count} total changes`);

      return {
        data: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      logger.error(`Error getting consent history for ${userConsentId}:`, error);
      throw error;
    }
  }

  /**
   * Get consent timeline for a profile (all consent changes)
   *
   * @param {string} profileId - Profile ID
   * @param {Object} filters - Filter options
   * @param {Date} [filters.startDate] - Start date
   * @param {Date} [filters.endDate] - End date
   * @param {number} [filters.limit=50] - Max items to return
   * @returns {Promise<Array>} Consent change timeline
   */
  static async getConsentTimeline(profileId, filters = {}) {
    try {
      const where = { profile_id: profileId };

      if (filters.startDate || filters.endDate) {
        where.created_at = {};
        if (filters.startDate) {
          where.created_at[Op.gte] = new Date(filters.startDate);
        }
        if (filters.endDate) {
          where.created_at[Op.lte] = new Date(filters.endDate);
        }
      }

      const timeline = await ConsentHistory.findAll({
        where,
        include: [
          {
            model: UserConsent,
            as: 'userConsent',
            attributes: ['id', 'consent_given', 'consent_text', 'ip_address']
          },
          {
            model: ConsentItem,
            as: 'consentItem',
            attributes: ['id', 'title_th', 'title_en', 'purpose']
          },
          {
            model: User,
            as: 'changedBy',
            attributes: ['id', 'username', 'role']
          }
        ],
        order: [['created_at', 'ASC']],
        limit: filters.limit || 50
      });

      logger.info(`Retrieved consent timeline for profile ${profileId}: ${timeline.length} events`);
      return timeline;
    } catch (error) {
      logger.error(`Error getting consent timeline for ${profileId}:`, error);
      throw error;
    }
  }

  /**
   * Compare two consent versions (before/after)
   *
   * @param {string} historyId1 - First history record ID
   * @param {string} historyId2 - Second history record ID
   * @returns {Promise<Object>} Comparison result
   */
  static async compareConsentVersions(historyId1, historyId2) {
    try {
      const [version1, version2] = await Promise.all([
        ConsentHistory.findByPk(historyId1, {
          include: [
            {
              model: UserConsent,
              as: 'userConsent',
              attributes: ['id', 'consent_given', 'consent_text']
            },
            {
              model: ConsentItem,
              as: 'consentItem',
              attributes: ['title_th', 'purpose']
            }
          ]
        }),
        ConsentHistory.findByPk(historyId2, {
          include: [
            {
              model: UserConsent,
              as: 'userConsent',
              attributes: ['id', 'consent_given', 'consent_text']
            },
            {
              model: ConsentItem,
              as: 'consentItem',
              attributes: ['title_th', 'purpose']
            }
          ]
        })
      ]);

      if (!version1 || !version2) {
        throw new Error('One or both consent history records not found');
      }

      const comparison = {
        version1: {
          id: version1.id,
          action: version1.action,
          status: version1.new_status,
          timestamp: version1.created_at,
          reason: version1.reason
        },
        version2: {
          id: version2.id,
          action: version2.action,
          status: version2.new_status,
          timestamp: version2.created_at,
          reason: version2.reason
        },
        changes: {
          statusChanged: version1.new_status !== version2.new_status,
          actionChanged: version1.action !== version2.action,
          timeDifference: Math.abs(new Date(version2.created_at) - new Date(version1.created_at)) / 1000 // seconds
        }
      };

      logger.info(`Compared consent versions ${historyId1} and ${historyId2}`);
      return comparison;
    } catch (error) {
      logger.error('Error comparing consent versions:', error);
      throw error;
    }
  }

  /**
   * Get all withdrawals for a profile
   *
   * @param {string} profileId - Profile ID
   * @param {Object} filters - Filter options
   * @param {Date} [filters.since] - Get withdrawals since this date
   * @returns {Promise<Array>} Consent withdrawals
   */
  static async getWithdrawals(profileId, filters = {}) {
    try {
      const where = {
        profile_id: profileId,
        action: 'withdrawn'
      };

      if (filters.since) {
        where.created_at = {
          [Op.gte]: new Date(filters.since)
        };
      }

      const withdrawals = await ConsentHistory.findAll({
        where,
        include: [
          {
            model: ConsentItem,
            as: 'consentItem',
            attributes: ['id', 'title_th', 'title_en', 'purpose']
          },
          {
            model: UserConsent,
            as: 'userConsent',
            attributes: ['id', 'consent_text']
          }
        ],
        order: [['created_at', 'DESC']]
      });

      logger.info(`Found ${withdrawals.length} consent withdrawals for profile ${profileId}`);
      return withdrawals;
    } catch (error) {
      logger.error(`Error getting withdrawals for ${profileId}:`, error);
      throw error;
    }
  }

  /**
   * Get consent renewal history
   *
   * @param {string} profileId - Profile ID
   * @returns {Promise<Array>} Consent renewals
   */
  static async getRenewals(profileId) {
    try {
      const renewals = await ConsentHistory.findAll({
        where: {
          profile_id: profileId,
          action: 'renewed'
        },
        include: [
          {
            model: ConsentItem,
            as: 'consentItem',
            attributes: ['id', 'title_th', 'retention_period']
          },
          {
            model: UserConsent,
            as: 'userConsent',
            attributes: ['id', 'consent_given']
          }
        ],
        order: [['created_at', 'DESC']]
      });

      logger.info(`Found ${renewals.length} consent renewals for profile ${profileId}`);
      return renewals;
    } catch (error) {
      logger.error(`Error getting renewals for ${profileId}:`, error);
      throw error;
    }
  }

  /**
   * Get statistics for consent changes
   *
   * @param {Object} filters - Filter options
   * @param {Date} [filters.startDate] - Start date
   * @param {Date} [filters.endDate] - End date
   * @returns {Promise<Object>} Consent statistics
   */
  static async getConsentStatistics(filters = {}) {
    try {
      const where = {};

      if (filters.startDate || filters.endDate) {
        where.created_at = {};
        if (filters.startDate) where.created_at[Op.gte] = new Date(filters.startDate);
        if (filters.endDate) where.created_at[Op.lte] = new Date(filters.endDate);
      }

      const allChanges = await ConsentHistory.findAll({
        where,
        attributes: ['action'],
        raw: true
      });

      const stats = {
        total: allChanges.length,
        byAction: {
          given: 0,
          withdrawn: 0,
          edited: 0,
          renewed: 0,
          expired: 0
        }
      };

      allChanges.forEach(change => {
        stats.byAction[change.action]++;
      });

      // Calculate withdrawal rate
      const totalGiven = stats.byAction.given + stats.byAction.renewed;
      stats.withdrawalRate = totalGiven > 0
        ? ((stats.byAction.withdrawn / totalGiven) * 100).toFixed(2) + '%'
        : '0%';

      logger.info(`Generated consent statistics: ${stats.total} total changes`);
      return stats;
    } catch (error) {
      logger.error('Error getting consent statistics:', error);
      throw error;
    }
  }

  /**
   * Check if consent was recently withdrawn (within last N days)
   *
   * @param {string} userConsentId - User consent ID
   * @param {number} [days=30] - Number of days to check
   * @returns {Promise<boolean>} True if recently withdrawn
   */
  static async wasRecentlyWithdrawn(userConsentId, days = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const withdrawal = await ConsentHistory.findOne({
        where: {
          user_consent_id: userConsentId,
          action: 'withdrawn',
          created_at: {
            [Op.gte]: cutoffDate
          }
        }
      });

      return !!withdrawal;
    } catch (error) {
      logger.error(`Error checking recent withdrawal for ${userConsentId}:`, error);
      throw error;
    }
  }
}

module.exports = ConsentHistoryService;
