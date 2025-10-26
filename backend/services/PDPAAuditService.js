/**
 * PDPAAuditService
 * Centralized logging service for PDPA Thailand compliance
 *
 * Purpose: Log and track all PDPA-related events for audit trail
 * PDPA Requirements:
 * - Section 39: Controllers must maintain audit logs
 * - Section 41: Logs retained for 3+ years minimum
 * - Section 77: Evidence for PDPC investigations
 *
 * @version v0.8.2-dev
 * @date 2025-10-24
 */

const { PDPAAuditLog } = require('../models');
const logger = require('../utils/logger.util');
const { Op } = require('sequelize');

class PDPAAuditService {
  /**
   * Log a PDPA compliance event
   *
   * @param {Object} eventData - Event details
   * @param {string} eventData.event_category - Category: dsr_request, consent_change, data_access, data_export, data_deletion
   * @param {string} eventData.event_type - Specific event type (e.g., dsr_created, consent_withdrawn)
   * @param {string} eventData.event_severity - Severity: info, warning, critical
   * @param {string} eventData.description - Human-readable description
   * @param {string} [eventData.profile_id] - Data subject profile ID
   * @param {string} [eventData.dsr_request_id] - Related DSR request ID
   * @param {string} [eventData.consent_id] - Related consent ID
   * @param {string} [eventData.form_id] - Related form ID
   * @param {string} [eventData.submission_id] - Related submission ID
   * @param {Object} [eventData.details_json] - Additional structured details
   * @param {Object} [eventData.old_value_json] - Previous value (for changes)
   * @param {Object} [eventData.new_value_json] - New value (for changes)
   * @param {boolean} [eventData.requires_notification] - Whether PDPC notification required
   * @param {string} [eventData.pdpa_article] - Relevant PDPA section (e.g., "Section 30")
   * @param {Object} [user] - Performing user object
   * @param {Object} [request] - Express request object
   * @param {Object} [options] - Sequelize options (e.g., transaction)
   * @returns {Promise<PDPAAuditLog>}
   */
  static async logEvent(eventData, user = null, request = null, options = {}) {
    try {
      const logData = {
        event_category: eventData.event_category,
        event_type: eventData.event_type,
        event_severity: eventData.event_severity || 'info',
        description: eventData.description,
        profile_id: eventData.profile_id,
        dsr_request_id: eventData.dsr_request_id,
        consent_id: eventData.consent_id,
        form_id: eventData.form_id,
        submission_id: eventData.submission_id,
        details_json: eventData.details_json || {},
        old_value_json: eventData.old_value_json,
        new_value_json: eventData.new_value_json,
        requires_notification: eventData.requires_notification || false,
        pdpa_article: eventData.pdpa_article,
        performed_by_user_id: user?.id,
        performed_by_username: user?.username,
        performed_by_email: user?.email,
        performed_by_role: user?.role,
        ip_address: request?.ip || request?.connection?.remoteAddress,
        user_agent: request?.get?.('user-agent'),
        request_path: request?.path,
        request_method: request?.method,
        http_status_code: eventData.http_status_code,
      };

      const auditLog = await PDPAAuditLog.create(logData, options);

      // Log critical events to application logger
      if (eventData.event_severity === 'critical') {
        logger.warn(`[PDPA CRITICAL] ${eventData.event_type}: ${eventData.description}`, {
          profileId: eventData.profile_id,
          performedBy: user?.username,
          requiresNotification: eventData.requires_notification
        });
      }

      return auditLog;
    } catch (error) {
      logger.error('Error logging PDPA audit event:', error);
      throw error;
    }
  }

  /**
   * Get audit trail for a specific profile
   *
   * @param {string} profileId - Profile ID
   * @param {Object} filters - Filter options
   * @param {string} [filters.category] - Filter by event category
   * @param {string} [filters.severity] - Filter by event severity
   * @param {Date} [filters.startDate] - Start date for date range
   * @param {Date} [filters.endDate] - End date for date range
   * @param {number} [filters.page=1] - Page number
   * @param {number} [filters.limit=50] - Items per page
   * @returns {Promise<Object>} Paginated audit log with total count
   */
  static async getProfileAuditTrail(profileId, filters = {}) {
    try {
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 50;
      const offset = (page - 1) * limit;

      const where = { profile_id: profileId };

      // Apply filters
      if (filters.category) {
        where.event_category = filters.category;
      }
      if (filters.severity) {
        where.event_severity = filters.severity;
      }
      if (filters.startDate || filters.endDate) {
        where.created_at = {};
        if (filters.startDate) {
          where.created_at[Op.gte] = new Date(filters.startDate);
        }
        if (filters.endDate) {
          where.created_at[Op.lte] = new Date(filters.endDate);
        }
      }

      const { count, rows } = await PDPAAuditLog.findAndCountAll({
        where,
        include: [
          {
            model: require('../models').User,
            as: 'performedBy',
            attributes: ['id', 'username', 'email', 'role']
          }
        ],
        order: [['created_at', 'DESC']],
        limit,
        offset
      });

      logger.info(`Retrieved audit trail for profile ${profileId}: ${count} total events`);

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
      logger.error(`Error getting profile audit trail for ${profileId}:`, error);
      throw error;
    }
  }

  /**
   * Get audit trail for a DSR request
   *
   * @param {string} dsrRequestId - DSR request ID
   * @returns {Promise<Array>} Array of audit log entries
   */
  static async getDSRAuditTrail(dsrRequestId) {
    try {
      const logs = await PDPAAuditLog.findAll({
        where: {
          dsr_request_id: dsrRequestId,
          event_category: 'dsr_request'
        },
        include: [
          {
            model: require('../models').User,
            as: 'performedBy',
            attributes: ['id', 'username', 'email', 'role']
          }
        ],
        order: [['created_at', 'ASC']]
      });

      logger.info(`Retrieved DSR audit trail for ${dsrRequestId}: ${logs.length} events`);
      return logs;
    } catch (error) {
      logger.error(`Error getting DSR audit trail for ${dsrRequestId}:`, error);
      throw error;
    }
  }

  /**
   * Get consent change history for a consent record
   *
   * @param {string} consentId - Consent ID
   * @returns {Promise<Array>} Array of consent change events
   */
  static async getConsentAuditTrail(consentId) {
    try {
      const logs = await PDPAAuditLog.findAll({
        where: {
          consent_id: consentId,
          event_category: 'consent_change'
        },
        include: [
          {
            model: require('../models').User,
            as: 'performedBy',
            attributes: ['id', 'username', 'email', 'role']
          }
        ],
        order: [['created_at', 'ASC']]
      });

      logger.info(`Retrieved consent audit trail for ${consentId}: ${logs.length} events`);
      return logs;
    } catch (error) {
      logger.error(`Error getting consent audit trail for ${consentId}:`, error);
      throw error;
    }
  }

  /**
   * Generate PDPA compliance report
   *
   * @param {Object} filters - Date range and filters
   * @param {Date} filters.startDate - Report start date
   * @param {Date} filters.endDate - Report end date
   * @returns {Promise<Object>} Compliance statistics
   */
  static async generateComplianceReport(filters = {}) {
    try {
      const startDate = filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
      const endDate = filters.endDate || new Date();

      const where = {
        created_at: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      };

      // Get all events in date range
      const allEvents = await PDPAAuditLog.findAll({
        where,
        attributes: ['event_category', 'event_severity', 'requires_notification'],
        raw: true
      });

      // Calculate statistics
      const stats = {
        dateRange: {
          start: startDate,
          end: endDate
        },
        totalEvents: allEvents.length,
        byCategory: {},
        bySeverity: {
          info: 0,
          warning: 0,
          critical: 0
        },
        dsrRequests: {
          total: 0,
          requiresNotification: 0
        },
        consentChanges: {
          total: 0,
          withdrawals: 0
        },
        dataAccess: {
          total: 0
        },
        dataExport: {
          total: 0
        },
        dataDeletion: {
          total: 0,
          requiresNotification: 0
        },
        criticalEvents: 0,
        pdpcNotificationRequired: 0
      };

      // Process events
      allEvents.forEach(event => {
        // Count by category
        stats.byCategory[event.event_category] = (stats.byCategory[event.event_category] || 0) + 1;

        // Count by severity
        stats.bySeverity[event.event_severity]++;

        // Track critical events
        if (event.event_severity === 'critical') {
          stats.criticalEvents++;
        }

        // Track PDPC notifications
        if (event.requires_notification) {
          stats.pdpcNotificationRequired++;
        }

        // Category-specific stats
        switch (event.event_category) {
          case 'dsr_request':
            stats.dsrRequests.total++;
            if (event.requires_notification) stats.dsrRequests.requiresNotification++;
            break;
          case 'consent_change':
            stats.consentChanges.total++;
            break;
          case 'data_access':
            stats.dataAccess.total++;
            break;
          case 'data_export':
            stats.dataExport.total++;
            break;
          case 'data_deletion':
            stats.dataDeletion.total++;
            if (event.requires_notification) stats.dataDeletion.requiresNotification++;
            break;
        }
      });

      logger.info(`Generated PDPA compliance report: ${stats.totalEvents} events from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      return stats;
    } catch (error) {
      logger.error('Error generating compliance report:', error);
      throw error;
    }
  }

  /**
   * Get events requiring PDPC notification (Section 37)
   *
   * @param {Date} [since] - Get events since this date
   * @returns {Promise<Array>} Array of critical events requiring notification
   */
  static async getNotificationRequiredEvents(since = null) {
    try {
      const where = {
        requires_notification: true,
        event_severity: 'critical'
      };

      if (since) {
        where.created_at = {
          [Op.gte]: since
        };
      }

      const events = await PDPAAuditLog.findAll({
        where,
        include: [
          {
            model: require('../models').UnifiedUserProfile,
            as: 'profile',
            attributes: ['id', 'primary_email', 'primary_phone', 'full_name']
          },
          {
            model: require('../models').User,
            as: 'performedBy',
            attributes: ['id', 'username', 'email', 'role']
          }
        ],
        order: [['created_at', 'DESC']]
      });

      if (events.length > 0) {
        logger.warn(`Found ${events.length} events requiring PDPC notification`);
      }

      return events;
    } catch (error) {
      logger.error('Error getting notification-required events:', error);
      throw error;
    }
  }

  /**
   * Search audit logs with advanced filters
   *
   * @param {Object} filters - Search filters
   * @param {string} [filters.eventType] - Specific event type
   * @param {string} [filters.performedBy] - Filter by user ID
   * @param {string} [filters.profileId] - Filter by profile ID
   * @param {string} [filters.searchText] - Search in description
   * @param {Date} [filters.startDate] - Start date
   * @param {Date} [filters.endDate] - End date
   * @param {number} [filters.page=1] - Page number
   * @param {number} [filters.limit=50] - Items per page
   * @returns {Promise<Object>} Paginated results
   */
  static async searchAuditLogs(filters = {}) {
    try {
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 50;
      const offset = (page - 1) * limit;

      const where = {};

      if (filters.eventType) where.event_type = filters.eventType;
      if (filters.performedBy) where.performed_by_user_id = filters.performedBy;
      if (filters.profileId) where.profile_id = filters.profileId;

      if (filters.searchText) {
        where.description = {
          [Op.iLike]: `%${filters.searchText}%`
        };
      }

      if (filters.startDate || filters.endDate) {
        where.created_at = {};
        if (filters.startDate) where.created_at[Op.gte] = new Date(filters.startDate);
        if (filters.endDate) where.created_at[Op.lte] = new Date(filters.endDate);
      }

      const { count, rows } = await PDPAAuditLog.findAndCountAll({
        where,
        include: [
          {
            model: require('../models').User,
            as: 'performedBy',
            attributes: ['id', 'username', 'email', 'role']
          }
        ],
        order: [['created_at', 'DESC']],
        limit,
        offset
      });

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
      logger.error('Error searching audit logs:', error);
      throw error;
    }
  }
}

module.exports = PDPAAuditService;
