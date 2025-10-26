/**
 * DSRActionService
 * Manages DSR request workflow actions and SLA tracking
 *
 * Purpose: Track all actions taken on DSR requests for audit and workflow management
 * PDPA Requirements:
 * - Section 30-38: DSR rights processing workflow
 * - Section 39: Audit trail for compliance
 * - Section 77: Evidence for PDPC investigations
 *
 * @version v0.8.2-dev
 * @date 2025-10-24
 */

const { DSRAction, DSRRequest, User } = require('../models');
const logger = require('../utils/logger.util');
const { Op } = require('sequelize');
const PDPAAuditService = require('./PDPAAuditService');

class DSRActionService {
  /**
   * Record a DSR action
   *
   * @param {Object} data - Action data
   * @param {string} data.dsr_request_id - DSR request ID
   * @param {string} data.action_type - Action type (created, assigned, in_progress, approved, rejected, completed, cancelled, comment_added, data_exported, data_deleted)
   * @param {string} data.old_status - Previous DSR status
   * @param {string} data.new_status - New DSR status
   * @param {string} [data.legal_basis] - Legal justification
   * @param {string} [data.justification] - Business justification
   * @param {string} [data.notes] - Additional notes
   * @param {Array} [data.attachments_json] - Attachment metadata
   * @param {number} [data.duration_seconds] - Time taken for action
   * @param {Object} user - Performing user
   * @param {Object} request - Express request object
   * @param {Object} [options] - Sequelize options (e.g., transaction)
   * @returns {Promise<DSRAction>}
   */
  static async recordAction(data, user, request = null, options = {}) {
    try {
      const actionData = {
        dsr_request_id: data.dsr_request_id,
        action_type: data.action_type,
        old_status: data.old_status,
        new_status: data.new_status,
        performed_by_user_id: user?.id,
        performed_by_username: user?.username,
        performed_by_email: user?.email,
        performed_by_role: user?.role,
        legal_basis: data.legal_basis,
        justification: data.justification,
        notes: data.notes,
        attachments_json: data.attachments_json || [],
        duration_seconds: data.duration_seconds,
        ip_address: request?.ip || request?.connection?.remoteAddress,
        user_agent: request?.get?.('user-agent')
      };

      const action = await DSRAction.create(actionData, options);

      // Also log to PDPA audit log
      await PDPAAuditService.logEvent({
        event_category: 'dsr_request',
        event_type: `dsr_${data.action_type}`,
        event_severity: data.action_type === 'rejected' ? 'warning' : 'info',
        description: `DSR ${data.action_type}: ${data.notes || data.justification || 'No notes'}`,
        dsr_request_id: data.dsr_request_id,
        old_value_json: data.old_status ? { status: data.old_status } : null,
        new_value_json: data.new_status ? { status: data.new_status } : null,
        pdpa_article: 'Section 30-38'
      }, user, request, options);

      logger.info(`Recorded DSR action ${data.action_type} for request ${data.dsr_request_id}`);
      return action;
    } catch (error) {
      logger.error('Error recording DSR action:', error);
      throw error;
    }
  }

  /**
   * Get action timeline for a DSR request
   *
   * @param {string} dsrRequestId - DSR request ID
   * @returns {Promise<Array>} Array of actions in chronological order
   */
  static async getActionTimeline(dsrRequestId) {
    try {
      const actions = await DSRAction.findAll({
        where: { dsr_request_id: dsrRequestId },
        include: [{
          model: User,
          as: 'performedBy',
          attributes: ['id', 'username', 'email', 'role']
        }],
        order: [['created_at', 'ASC']]
      });

      logger.debug(`Retrieved ${actions.length} actions for DSR request ${dsrRequestId}`);
      return actions;
    } catch (error) {
      logger.error(`Error getting action timeline for ${dsrRequestId}:`, error);
      throw error;
    }
  }

  /**
   * Update DSR request status with action tracking
   *
   * @param {string} dsrRequestId - DSR request ID
   * @param {Object} updateData - Update data
   * @param {string} updateData.status - New status (in_progress, completed, rejected, cancelled)
   * @param {string} [updateData.notes] - Notes about status change
   * @param {string} [updateData.justification] - Justification for approval/rejection
   * @param {string} [updateData.legal_basis] - Legal basis
   * @param {Object} [updateData.response_data] - Response data for completed requests
   * @param {string} [updateData.response_notes] - Additional response notes
   * @param {Object} user - Performing user
   * @param {Object} request - Express request object
   * @param {Object} [options] - Sequelize options
   * @returns {Promise<DSRRequest>}
   */
  static async updateRequestStatus(dsrRequestId, updateData, user, request = null, options = {}) {
    try {
      // Get DSR request
      const dsrRequest = await DSRRequest.findByPk(dsrRequestId, options);
      if (!dsrRequest) {
        throw new Error('DSR request not found');
      }

      const oldStatus = dsrRequest.status;
      const newStatus = updateData.status;

      // Validate status transition
      const validTransitions = {
        pending: ['in_progress', 'completed', 'rejected', 'cancelled'],
        in_progress: ['completed', 'rejected', 'cancelled'],
        completed: [], // Cannot change from completed
        rejected: [],  // Cannot change from rejected
        cancelled: []  // Cannot change from cancelled
      };

      if (!validTransitions[oldStatus]?.includes(newStatus)) {
        throw new Error(`Invalid status transition from ${oldStatus} to ${newStatus}`);
      }

      // Record action
      await this.recordAction({
        dsr_request_id: dsrRequestId,
        action_type: newStatus,
        old_status: oldStatus,
        new_status: newStatus,
        notes: updateData.notes,
        justification: updateData.justification,
        legal_basis: updateData.legal_basis
      }, user, request, options);

      // Update DSR request
      const updateFields = {
        status: newStatus,
        processed_by: user?.id
      };

      if (newStatus === 'completed') {
        updateFields.processed_at = new Date();
        updateFields.response_data = updateData.response_data || null;
        updateFields.response_notes = updateData.response_notes || null;
      }

      if (newStatus === 'rejected') {
        updateFields.processed_at = new Date();
        updateFields.response_notes = updateData.justification || updateData.notes;
      }

      await dsrRequest.update(updateFields, options);

      logger.info(`Updated DSR request ${dsrRequestId} status: ${oldStatus} → ${newStatus}`);
      return dsrRequest;
    } catch (error) {
      logger.error(`Error updating DSR request status for ${dsrRequestId}:`, error);
      throw error;
    }
  }

  /**
   * Add comment to DSR request
   *
   * @param {string} dsrRequestId - DSR request ID
   * @param {string} comment - Comment text
   * @param {Object} user - Commenting user
   * @param {Object} request - Express request object
   * @param {Object} [options] - Sequelize options
   * @returns {Promise<DSRAction>}
   */
  static async addComment(dsrRequestId, comment, user, request = null, options = {}) {
    try {
      // Get DSR request to get current status
      const dsrRequest = await DSRRequest.findByPk(dsrRequestId, options);
      if (!dsrRequest) {
        throw new Error('DSR request not found');
      }

      const action = await this.recordAction({
        dsr_request_id: dsrRequestId,
        action_type: 'comment_added',
        old_status: dsrRequest.status,
        new_status: dsrRequest.status,
        notes: comment
      }, user, request, options);

      logger.info(`Added comment to DSR request ${dsrRequestId}`);
      return action;
    } catch (error) {
      logger.error(`Error adding comment to ${dsrRequestId}:`, error);
      throw error;
    }
  }

  /**
   * Get SLA metrics for DSR requests
   *
   * @param {Object} filters - Filter options
   * @param {string} [filters.request_type] - Filter by request type
   * @param {string} [filters.status] - Filter by status
   * @param {Date} [filters.start_date] - Start date
   * @param {Date} [filters.end_date] - End date
   * @returns {Promise<Object>} SLA statistics
   */
  static async getSLAMetrics(filters = {}) {
    try {
      const where = {};

      if (filters.request_type) {
        where.request_type = filters.request_type;
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.start_date || filters.end_date) {
        where.created_at = {};
        if (filters.start_date) where.created_at[Op.gte] = new Date(filters.start_date);
        if (filters.end_date) where.created_at[Op.lte] = new Date(filters.end_date);
      }

      // Get all DSR requests matching filters
      const requests = await DSRRequest.findAll({
        where,
        attributes: ['id', 'status', 'created_at', 'processed_at', 'deadline_date'],
        raw: true
      });

      const metrics = {
        total: requests.length,
        byStatus: {
          pending: 0,
          in_progress: 0,
          completed: 0,
          rejected: 0,
          cancelled: 0
        },
        avgProcessingTime: 0,
        onTime: 0,
        overdue: 0,
        overduePercentage: 0
      };

      let totalProcessingTime = 0;
      let processedCount = 0;

      requests.forEach(req => {
        // Count by status
        metrics.byStatus[req.status]++;

        // Calculate processing time for completed/rejected requests
        if (req.processed_at) {
          const processingTime = new Date(req.processed_at) - new Date(req.created_at);
          totalProcessingTime += processingTime;
          processedCount++;

          // Check if completed on time
          if (req.deadline_date) {
            const deadline = new Date(req.deadline_date);
            const processedAt = new Date(req.processed_at);
            if (processedAt <= deadline) {
              metrics.onTime++;
            } else {
              metrics.overdue++;
            }
          }
        }
      });

      // Calculate average processing time in hours
      if (processedCount > 0) {
        metrics.avgProcessingTime = Math.round((totalProcessingTime / processedCount) / (1000 * 60 * 60));
      }

      // Calculate overdue percentage
      const totalWithDeadline = metrics.onTime + metrics.overdue;
      if (totalWithDeadline > 0) {
        metrics.overduePercentage = ((metrics.overdue / totalWithDeadline) * 100).toFixed(2);
      }

      logger.info(`Generated SLA metrics: ${metrics.total} requests, ${metrics.avgProcessingTime}h avg`);
      return metrics;
    } catch (error) {
      logger.error('Error getting SLA metrics:', error);
      throw error;
    }
  }

  /**
   * Get action statistics for reporting
   *
   * @param {Object} filters - Filter options
   * @param {Date} [filters.start_date] - Start date
   * @param {Date} [filters.end_date] - End date
   * @returns {Promise<Object>} Action statistics
   */
  static async getActionStatistics(filters = {}) {
    try {
      const where = {};

      if (filters.start_date || filters.end_date) {
        where.created_at = {};
        if (filters.start_date) where.created_at[Op.gte] = new Date(filters.start_date);
        if (filters.end_date) where.created_at[Op.lte] = new Date(filters.end_date);
      }

      const actions = await DSRAction.findAll({
        where,
        attributes: ['action_type', 'duration_seconds'],
        raw: true
      });

      const stats = {
        total: actions.length,
        byActionType: {
          created: 0,
          assigned: 0,
          in_progress: 0,
          approved: 0,
          rejected: 0,
          completed: 0,
          cancelled: 0,
          comment_added: 0,
          data_exported: 0,
          data_deleted: 0
        },
        avgDuration: 0
      };

      let totalDuration = 0;
      let durationCount = 0;

      actions.forEach(action => {
        stats.byActionType[action.action_type]++;

        if (action.duration_seconds) {
          totalDuration += action.duration_seconds;
          durationCount++;
        }
      });

      // Calculate average duration in minutes
      if (durationCount > 0) {
        stats.avgDuration = Math.round((totalDuration / durationCount) / 60);
      }

      logger.info(`Generated action statistics: ${stats.total} total actions`);
      return stats;
    } catch (error) {
      logger.error('Error getting action statistics:', error);
      throw error;
    }
  }

  /**
   * Get pending actions (DSR requests requiring action)
   *
   * @param {string} userId - User ID (for assignment filtering)
   * @returns {Promise<Array>} Array of DSR requests requiring action
   */
  static async getPendingActions(userId = null) {
    try {
      const where = {
        status: {
          [Op.in]: ['pending', 'in_progress']
        }
      };

      if (userId) {
        where.processed_by = userId;
      }

      const requests = await DSRRequest.findAll({
        where,
        include: [{
          model: User,
          as: 'processedByUser',
          attributes: ['id', 'username', 'email', 'role']
        }],
        order: [['deadline_date', 'ASC'], ['created_at', 'ASC']]
      });

      logger.debug(`Found ${requests.length} pending DSR requests${userId ? ` for user ${userId}` : ''}`);
      return requests;
    } catch (error) {
      logger.error('Error getting pending actions:', error);
      throw error;
    }
  }
}

module.exports = DSRActionService;
