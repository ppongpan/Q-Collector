/**
 * WebSocket Integration Utility
 * Helper functions to integrate WebSocket events with existing API routes
 *
 * Features:
 * - Automatic event emission for API operations
 * - Event data standardization
 * - Error handling and logging
 * - Performance optimization
 */

const logger = require('./logger.util');

class WebSocketIntegration {
  constructor() {
    this.webSocketService = null;
    this.notificationService = null;
    this.realtimeEventHandlers = null;
    this.isInitialized = false;
  }

  /**
   * Initialize with services
   */
  initialize(webSocketService, notificationService, realtimeEventHandlers) {
    this.webSocketService = webSocketService;
    this.notificationService = notificationService;
    this.realtimeEventHandlers = realtimeEventHandlers;
    this.isInitialized = true;
    logger.info('WebSocket integration utility initialized');
  }

  /**
   * Check if services are available
   */
  isAvailable() {
    return this.isInitialized &&
           this.webSocketService &&
           this.notificationService &&
           this.realtimeEventHandlers;
  }

  /**
   * Emit form creation event
   */
  async emitFormCreated(formData, creatorData) {
    if (!this.isAvailable()) return;

    try {
      await this.realtimeEventHandlers.handleFormCreate(formData, creatorData);
    } catch (error) {
      logger.error('Error emitting form created event:', error);
    }
  }

  /**
   * Emit form update event
   */
  async emitFormUpdated(formId, updateData, updaterData, updateType = 'metadata') {
    if (!this.isAvailable()) return;

    try {
      await this.realtimeEventHandlers.handleFormUpdate({
        formId,
        updateType,
        changes: updateData,
        version: Date.now(), // Simple versioning
      }, updaterData);
    } catch (error) {
      logger.error('Error emitting form updated event:', error);
    }
  }

  /**
   * Emit form deletion event
   */
  async emitFormDeleted(formData, deleterData) {
    if (!this.isAvailable()) return;

    try {
      await this.realtimeEventHandlers.handleFormDelete(formData, deleterData);
    } catch (error) {
      logger.error('Error emitting form deleted event:', error);
    }
  }

  /**
   * Emit form publish status change
   */
  async emitFormPublishStatusChanged(formData, changerData, isPublished) {
    if (!this.isAvailable()) return;

    try {
      await this.realtimeEventHandlers.handleFormPublishStatusChange(formData, changerData, isPublished);
    } catch (error) {
      logger.error('Error emitting form publish status change event:', error);
    }
  }

  /**
   * Emit submission creation event
   */
  async emitSubmissionCreated(submissionData, submitterData) {
    if (!this.isAvailable()) return;

    try {
      await this.realtimeEventHandlers.handleSubmissionCreate(submissionData, submitterData);
    } catch (error) {
      logger.error('Error emitting submission created event:', error);
    }
  }

  /**
   * Emit submission update event
   */
  async emitSubmissionUpdated(submissionId, updateData, updaterData, updateType = 'data') {
    if (!this.isAvailable()) return;

    try {
      await this.realtimeEventHandlers.handleSubmissionUpdate({
        submissionId,
        updateType,
        changes: updateData,
      }, updaterData);
    } catch (error) {
      logger.error('Error emitting submission updated event:', error);
    }
  }

  /**
   * Emit user presence update
   */
  async emitUserPresenceUpdate(presenceData, userData) {
    if (!this.isAvailable()) return;

    try {
      await this.realtimeEventHandlers.handleUserPresenceUpdate(presenceData, userData);
    } catch (error) {
      logger.error('Error emitting user presence update:', error);
    }
  }

  /**
   * Send instant notification
   */
  async sendInstantNotification(options) {
    if (!this.isAvailable()) return;

    try {
      return await this.notificationService.sendNotification({
        ...options,
        immediate: true,
      });
    } catch (error) {
      logger.error('Error sending instant notification:', error);
      return null;
    }
  }

  /**
   * Broadcast to room
   */
  broadcastToRoom(room, event, data) {
    if (!this.isAvailable()) return;

    try {
      this.webSocketService.broadcastToRoom(room, event, data);
    } catch (error) {
      logger.error('Error broadcasting to room:', error);
    }
  }

  /**
   * Send to specific user
   */
  sendToUser(userId, event, data) {
    if (!this.isAvailable()) return;

    try {
      this.webSocketService.sendToUser(userId, event, data);
    } catch (error) {
      logger.error('Error sending to user:', error);
    }
  }

  /**
   * Broadcast to role
   */
  broadcastToRole(role, event, data) {
    if (!this.isAvailable()) return;

    try {
      this.webSocketService.broadcastToRole(role, event, data);
    } catch (error) {
      logger.error('Error broadcasting to role:', error);
    }
  }

  /**
   * Broadcast to department
   */
  broadcastToDepartment(department, event, data) {
    if (!this.isAvailable()) return;

    try {
      this.webSocketService.broadcastToDepartment(department, event, data);
    } catch (error) {
      logger.error('Error broadcasting to department:', error);
    }
  }

  /**
   * Express middleware to add WebSocket integration to request
   */
  middleware() {
    return (req, res, next) => {
      // Add WebSocket utilities to request object
      req.websocket = {
        emit: {
          formCreated: (formData) => this.emitFormCreated(formData, req.user),
          formUpdated: (formId, updateData, updateType) => this.emitFormUpdated(formId, updateData, req.user, updateType),
          formDeleted: (formData) => this.emitFormDeleted(formData, req.user),
          formPublishStatusChanged: (formData, isPublished) => this.emitFormPublishStatusChanged(formData, req.user, isPublished),
          submissionCreated: (submissionData) => this.emitSubmissionCreated(submissionData, req.user),
          submissionUpdated: (submissionId, updateData, updateType) => this.emitSubmissionUpdated(submissionId, updateData, req.user, updateType),
          userPresenceUpdate: (presenceData) => this.emitUserPresenceUpdate(presenceData, req.user),
        },
        notify: {
          instant: (options) => this.sendInstantNotification(options),
        },
        broadcast: {
          toRoom: (room, event, data) => this.broadcastToRoom(room, event, data),
          toUser: (userId, event, data) => this.sendToUser(userId, event, data),
          toRole: (role, event, data) => this.broadcastToRole(role, event, data),
          toDepartment: (department, event, data) => this.broadcastToDepartment(department, event, data),
        },
      };

      next();
    };
  }

  /**
   * Get collaboration status for a form
   */
  async getFormCollaborationStatus(formId) {
    if (!this.isAvailable()) return null;

    try {
      return await this.webSocketService.getFormCollaborators(formId);
    } catch (error) {
      logger.error('Error getting form collaboration status:', error);
      return null;
    }
  }

  /**
   * Get WebSocket statistics
   */
  getWebSocketStats() {
    if (!this.isAvailable()) return null;

    try {
      return this.webSocketService.getStats();
    } catch (error) {
      logger.error('Error getting WebSocket stats:', error);
      return null;
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats() {
    if (!this.isAvailable()) return null;

    try {
      return await this.notificationService.getStats();
    } catch (error) {
      logger.error('Error getting notification stats:', error);
      return null;
    }
  }
}

// Export singleton instance
const webSocketIntegration = new WebSocketIntegration();
module.exports = webSocketIntegration;