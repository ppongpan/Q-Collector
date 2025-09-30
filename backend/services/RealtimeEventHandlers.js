/**
 * Real-time Event Handlers
 * Centralized event handlers for WebSocket real-time features
 *
 * Features:
 * - Form collaboration events
 * - Submission real-time updates
 * - User activity tracking
 * - System-wide notifications
 * - Analytics and monitoring events
 */

const logger = require('../utils/logger.util');
const Joi = require('joi');

class RealtimeEventHandlers {
  constructor() {
    this.webSocketService = null;
    this.notificationService = null;
    this.eventValidators = this.initializeValidators();
  }

  /**
   * Initialize the handlers with required services
   * @param {Object} webSocketService - WebSocket service instance
   * @param {Object} notificationService - Notification service instance
   */
  initialize(webSocketService, notificationService) {
    this.webSocketService = webSocketService;
    this.notificationService = notificationService;
    logger.info('Real-time event handlers initialized');
  }

  /**
   * Initialize Joi validators for event data
   */
  initializeValidators() {
    return {
      formCreate: Joi.object({
        title: Joi.string().required().min(1).max(255),
        description: Joi.string().allow('').max(1000),
        department: Joi.string().required(),
        isPublic: Joi.boolean().default(false),
        settings: Joi.object().default({}),
      }),

      formUpdate: Joi.object({
        formId: Joi.string().required(),
        updateType: Joi.string().valid('metadata', 'settings', 'structure', 'field').required(),
        changes: Joi.object().required(),
        version: Joi.number().optional(),
      }),

      formFieldUpdate: Joi.object({
        formId: Joi.string().required(),
        fieldId: Joi.string().required(),
        changes: Joi.object().required(),
        position: Joi.object({
          x: Joi.number(),
          y: Joi.number(),
        }).optional(),
      }),

      formStructureUpdate: Joi.object({
        formId: Joi.string().required(),
        structureChanges: Joi.object({
          added: Joi.array().items(Joi.object()).default([]),
          removed: Joi.array().items(Joi.string()).default([]),
          modified: Joi.array().items(Joi.object()).default([]),
          reordered: Joi.array().items(Joi.object()).default([]),
        }).required(),
        version: Joi.number().required(),
      }),

      submissionCreate: Joi.object({
        formId: Joi.string().required(),
        data: Joi.object().required(),
        status: Joi.string().valid('draft', 'submitted', 'reviewed', 'approved', 'rejected').default('submitted'),
      }),

      submissionUpdate: Joi.object({
        submissionId: Joi.string().required(),
        changes: Joi.object().required(),
        updateType: Joi.string().valid('data', 'status', 'metadata').required(),
      }),

      userPresence: Joi.object({
        status: Joi.string().valid('online', 'away', 'busy', 'offline').required(),
        currentForm: Joi.string().allow(null).optional(),
        activity: Joi.string().optional(),
      }),

      userTyping: Joi.object({
        formId: Joi.string().required(),
        fieldId: Joi.string().allow(null).optional(),
        isTyping: Joi.boolean().required(),
      }),

      systemMessage: Joi.object({
        type: Joi.string().valid('announcement', 'maintenance', 'alert', 'info').required(),
        message: Joi.string().required().min(1).max(1000),
        priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
        targetRoles: Joi.array().items(Joi.string()).optional(),
        targetDepartments: Joi.array().items(Joi.string()).optional(),
      }),
    };
  }

  /**
   * Handle form creation events
   */
  async handleFormCreate(formData, creatorData) {
    try {
      const { error, value } = this.eventValidators.formCreate.validate(formData);
      if (error) {
        throw new Error(`Invalid form data: ${error.message}`);
      }

      const eventData = {
        ...value,
        createdBy: creatorData.id,
        createdAt: new Date(),
      };

      // Broadcast to department members
      if (value.department) {
        this.webSocketService.broadcastToDepartment(value.department, 'form:created', {
          form: eventData,
          creator: {
            id: creatorData.id,
            username: creatorData.username,
            firstName: creatorData.firstName,
            lastName: creatorData.lastName,
          },
          timestamp: new Date(),
        });
      }

      // Broadcast to administrators
      this.webSocketService.broadcastToRole('admin', 'form:created', {
        form: eventData,
        creator: creatorData,
        timestamp: new Date(),
      });

      // Send notification
      await this.notificationService.sendNotification({
        templateKey: 'form.created',
        recipients: await this.getFormNotificationRecipients(value.department, 'form:create'),
        data: {
          formTitle: value.title,
          creatorName: `${creatorData.firstName} ${creatorData.lastName}`,
        },
        priority: 'medium',
        channels: ['websocket', 'telegram'],
      });

      logger.info(`Form created event handled: ${value.title} by ${creatorData.username}`);

    } catch (error) {
      logger.error('Error handling form create event:', error);
      throw error;
    }
  }

  /**
   * Handle form update events
   */
  async handleFormUpdate(updateData, updaterData) {
    try {
      const { error, value } = this.eventValidators.formUpdate.validate(updateData);
      if (error) {
        throw new Error(`Invalid form update data: ${error.message}`);
      }

      // Get form details for broadcasting
      const Form = require('../models/Form');
      const form = await Form.findByPk(value.formId);
      if (!form) {
        throw new Error('Form not found');
      }

      const eventData = {
        ...value,
        updatedBy: updaterData.id,
        updatedAt: new Date(),
        formTitle: form.title,
      };

      // Broadcast to form collaborators
      this.webSocketService.broadcastToRoom(`form:${value.formId}`, 'form:updated', {
        update: eventData,
        updater: {
          id: updaterData.id,
          username: updaterData.username,
          firstName: updaterData.firstName,
          lastName: updaterData.lastName,
        },
        timestamp: new Date(),
      });

      // Send notification for significant updates
      if (['structure', 'settings'].includes(value.updateType)) {
        await this.notificationService.sendNotification({
          templateKey: 'form.updated',
          recipients: await this.getFormCollaborators(value.formId),
          data: {
            formTitle: form.title,
            updaterName: `${updaterData.firstName} ${updaterData.lastName}`,
            updateType: value.updateType,
          },
          priority: 'low',
          channels: ['websocket'],
        });
      }

      logger.debug(`Form update event handled: ${form.title} - ${value.updateType}`);

    } catch (error) {
      logger.error('Error handling form update event:', error);
      throw error;
    }
  }

  /**
   * Handle form field update events
   */
  async handleFormFieldUpdate(updateData, updaterData) {
    try {
      const { error, value } = this.eventValidators.formFieldUpdate.validate(updateData);
      if (error) {
        throw new Error(`Invalid form field update data: ${error.message}`);
      }

      const eventData = {
        ...value,
        updatedBy: updaterData.id,
        updatedAt: new Date(),
      };

      // Broadcast to form collaborators only (no notifications for field-level changes)
      this.webSocketService.broadcastToRoom(`form:${value.formId}`, 'form:field:updated', {
        fieldUpdate: eventData,
        updater: {
          id: updaterData.id,
          username: updaterData.username,
        },
        timestamp: new Date(),
      });

      logger.debug(`Form field update event handled: ${value.formId}/${value.fieldId}`);

    } catch (error) {
      logger.error('Error handling form field update event:', error);
      throw error;
    }
  }

  /**
   * Handle form structure update events
   */
  async handleFormStructureUpdate(updateData, updaterData) {
    try {
      const { error, value } = this.eventValidators.formStructureUpdate.validate(updateData);
      if (error) {
        throw new Error(`Invalid form structure update data: ${error.message}`);
      }

      const eventData = {
        ...value,
        updatedBy: updaterData.id,
        updatedAt: new Date(),
      };

      // Broadcast to form collaborators
      this.webSocketService.broadcastToRoom(`form:${value.formId}`, 'form:structure:updated', {
        structureUpdate: eventData,
        updater: {
          id: updaterData.id,
          username: updaterData.username,
          firstName: updaterData.firstName,
          lastName: updaterData.lastName,
        },
        timestamp: new Date(),
      });

      logger.debug(`Form structure update event handled: ${value.formId} version ${value.version}`);

    } catch (error) {
      logger.error('Error handling form structure update event:', error);
      throw error;
    }
  }

  /**
   * Handle submission creation events
   */
  async handleSubmissionCreate(submissionData, submitterData) {
    try {
      const { error, value } = this.eventValidators.submissionCreate.validate(submissionData);
      if (error) {
        throw new Error(`Invalid submission data: ${error.message}`);
      }

      // Get form details
      const Form = require('../models/Form');
      const form = await Form.findByPk(value.formId);
      if (!form) {
        throw new Error('Form not found');
      }

      const eventData = {
        ...value,
        submittedBy: submitterData.id,
        submittedAt: new Date(),
        formTitle: form.title,
      };

      // Broadcast to form watchers
      this.webSocketService.broadcastToRoom(`form:${value.formId}`, 'submission:created', {
        submission: eventData,
        submitter: {
          id: submitterData.id,
          username: submitterData.username,
          firstName: submitterData.firstName,
          lastName: submitterData.lastName,
        },
        timestamp: new Date(),
      });

      // Broadcast to administrators and department managers
      this.webSocketService.broadcastToRole('admin', 'submission:new', eventData);
      if (form.department) {
        this.webSocketService.broadcastToDepartment(form.department, 'submission:new', eventData);
      }

      // Send notification
      await this.notificationService.sendNotification({
        templateKey: 'submission.created',
        recipients: await this.getSubmissionNotificationRecipients(form),
        data: {
          formTitle: form.title,
          submitterName: `${submitterData.firstName} ${submitterData.lastName}`,
        },
        priority: 'medium',
        channels: ['websocket', 'telegram'],
      });

      logger.info(`Submission created event handled: ${form.title} by ${submitterData.username}`);

    } catch (error) {
      logger.error('Error handling submission create event:', error);
      throw error;
    }
  }

  /**
   * Handle submission update events
   */
  async handleSubmissionUpdate(updateData, updaterData) {
    try {
      const { error, value } = this.eventValidators.submissionUpdate.validate(updateData);
      if (error) {
        throw new Error(`Invalid submission update data: ${error.message}`);
      }

      // Get submission details
      const Submission = require('../models/Submission');
      const submission = await Submission.findByPk(value.submissionId, {
        include: ['Form', 'User']
      });

      if (!submission) {
        throw new Error('Submission not found');
      }

      const eventData = {
        ...value,
        updatedBy: updaterData.id,
        updatedAt: new Date(),
        formTitle: submission.Form.title,
        originalSubmitter: submission.User,
      };

      // Broadcast to form watchers
      this.webSocketService.broadcastToRoom(`form:${submission.formId}`, 'submission:updated', {
        submissionUpdate: eventData,
        updater: {
          id: updaterData.id,
          username: updaterData.username,
        },
        timestamp: new Date(),
      });

      // Send notification for status changes
      if (value.updateType === 'status') {
        const templateKey = value.changes.status === 'approved' ? 'submission.approved' :
                          value.changes.status === 'rejected' ? 'submission.rejected' : null;

        if (templateKey) {
          await this.notificationService.sendNotification({
            templateKey,
            recipients: [submission.createdBy],
            data: {
              formTitle: submission.Form.title,
              reason: value.changes.reason || '',
            },
            priority: 'high',
            channels: ['websocket', 'telegram'],
          });
        }
      }

      logger.debug(`Submission update event handled: ${value.submissionId} - ${value.updateType}`);

    } catch (error) {
      logger.error('Error handling submission update event:', error);
      throw error;
    }
  }

  /**
   * Handle user presence update events
   */
  async handleUserPresenceUpdate(presenceData, userData) {
    try {
      const { error, value } = this.eventValidators.userPresence.validate(presenceData);
      if (error) {
        throw new Error(`Invalid presence data: ${error.message}`);
      }

      const eventData = {
        userId: userData.id,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        ...value,
        updatedAt: new Date(),
      };

      // Broadcast to department members
      if (userData.department) {
        this.webSocketService.broadcastToDepartment(userData.department, 'user:presence:updated', eventData);
      }

      // Broadcast to current form collaborators
      if (value.currentForm) {
        this.webSocketService.broadcastToRoom(`form:${value.currentForm}`, 'user:presence:updated', eventData);
      }

      logger.debug(`User presence updated: ${userData.username} - ${value.status}`);

    } catch (error) {
      logger.error('Error handling user presence update:', error);
      throw error;
    }
  }

  /**
   * Handle user typing events
   */
  async handleUserTyping(typingData, userData) {
    try {
      const { error, value } = this.eventValidators.userTyping.validate(typingData);
      if (error) {
        throw new Error(`Invalid typing data: ${error.message}`);
      }

      const eventData = {
        ...value,
        user: {
          id: userData.id,
          username: userData.username,
          firstName: userData.firstName,
          lastName: userData.lastName,
        },
        timestamp: new Date(),
      };

      // Broadcast to form collaborators only
      this.webSocketService.broadcastToRoom(`form:${value.formId}`, 'user:typing', eventData);

    } catch (error) {
      logger.error('Error handling user typing event:', error);
      throw error;
    }
  }

  /**
   * Handle system message broadcasts
   */
  async handleSystemMessage(messageData, senderData) {
    try {
      const { error, value } = this.eventValidators.systemMessage.validate(messageData);
      if (error) {
        throw new Error(`Invalid system message data: ${error.message}`);
      }

      const eventData = {
        ...value,
        sender: {
          id: senderData.id,
          username: senderData.username,
          role: senderData.role,
        },
        timestamp: new Date(),
      };

      // Broadcast based on targets
      if (value.targetRoles && value.targetRoles.length > 0) {
        for (const role of value.targetRoles) {
          this.webSocketService.broadcastToRole(role, 'system:message', eventData);
        }
      }

      if (value.targetDepartments && value.targetDepartments.length > 0) {
        for (const department of value.targetDepartments) {
          this.webSocketService.broadcastToDepartment(department, 'system:message', eventData);
        }
      }

      // If no specific targets, broadcast to all users based on priority
      if (!value.targetRoles && !value.targetDepartments) {
        if (['high', 'critical'].includes(value.priority)) {
          // High priority messages go to all roles
          this.webSocketService.broadcastToRole('admin', 'system:message', eventData);
          this.webSocketService.broadcastToRole('department_manager', 'system:message', eventData);
          this.webSocketService.broadcastToRole('user', 'system:message', eventData);
        } else {
          // Medium/low priority messages go to admin only
          this.webSocketService.broadcastToRole('admin', 'system:message', eventData);
        }
      }

      // Send system announcement notification
      await this.notificationService.sendSystemAnnouncement({
        title: `System ${value.type.charAt(0).toUpperCase() + value.type.slice(1)}`,
        body: value.message,
        priority: value.priority,
        targetRoles: value.targetRoles,
        metadata: {
          sender: senderData.username,
          messageType: value.type,
        },
      });

      logger.info(`System message broadcast: ${value.type} - ${value.priority} priority`);

    } catch (error) {
      logger.error('Error handling system message:', error);
      throw error;
    }
  }

  /**
   * Handle form deletion events
   */
  async handleFormDelete(formData, deleterData) {
    try {
      const eventData = {
        formId: formData.id,
        formTitle: formData.title,
        deletedBy: deleterData.id,
        deletedAt: new Date(),
      };

      // Broadcast to department members
      if (formData.department) {
        this.webSocketService.broadcastToDepartment(formData.department, 'form:deleted', eventData);
      }

      // Broadcast to administrators
      this.webSocketService.broadcastToRole('admin', 'form:deleted', eventData);

      // Send notification
      await this.notificationService.sendNotification({
        templateKey: 'form.deleted',
        recipients: await this.getFormNotificationRecipients(formData.department, 'form:delete'),
        data: {
          formTitle: formData.title,
          deleterName: `${deleterData.firstName} ${deleterData.lastName}`,
        },
        priority: 'high',
        channels: ['websocket', 'telegram'],
      });

      logger.info(`Form deleted event handled: ${formData.title} by ${deleterData.username}`);

    } catch (error) {
      logger.error('Error handling form delete event:', error);
      throw error;
    }
  }

  /**
   * Handle form publish/unpublish events
   */
  async handleFormPublishStatusChange(formData, changerData, isPublished) {
    try {
      const eventData = {
        formId: formData.id,
        formTitle: formData.title,
        isPublished,
        changedBy: changerData.id,
        changedAt: new Date(),
      };

      // Broadcast to department members
      if (formData.department) {
        this.webSocketService.broadcastToDepartment(formData.department, 'form:publish:status:changed', eventData);
      }

      // Send notification for publish events
      if (isPublished) {
        await this.notificationService.sendNotification({
          templateKey: 'form.published',
          recipients: await this.getFormNotificationRecipients(formData.department, 'form:view'),
          data: {
            formTitle: formData.title,
          },
          priority: 'medium',
          channels: ['websocket', 'telegram'],
        });
      }

      logger.info(`Form publish status changed: ${formData.title} - ${isPublished ? 'published' : 'unpublished'}`);

    } catch (error) {
      logger.error('Error handling form publish status change:', error);
      throw error;
    }
  }

  /**
   * Get recipients for form notifications
   */
  async getFormNotificationRecipients(department, permission) {
    try {
      const User = require('../models/User');
      const recipients = [];

      // Always include admins
      const admins = await User.findAll({
        where: { role: 'admin', isActive: true },
        attributes: ['id']
      });
      recipients.push(...admins.map(admin => admin.id));

      // Include department managers for the specific department
      if (department) {
        const deptManagers = await User.findAll({
          where: {
            role: 'department_manager',
            department,
            isActive: true
          },
          attributes: ['id']
        });
        recipients.push(...deptManagers.map(manager => manager.id));

        // For view permissions, include all department users
        if (permission === 'form:view') {
          const deptUsers = await User.findAll({
            where: {
              department,
              isActive: true
            },
            attributes: ['id']
          });
          recipients.push(...deptUsers.map(user => user.id));
        }
      }

      return [...new Set(recipients)]; // Remove duplicates
    } catch (error) {
      logger.error('Error getting form notification recipients:', error);
      return [];
    }
  }

  /**
   * Get recipients for submission notifications
   */
  async getSubmissionNotificationRecipients(form) {
    try {
      const User = require('../models/User');
      const recipients = [];

      // Include form creator
      if (form.createdBy) {
        recipients.push(form.createdBy);
      }

      // Include admins
      const admins = await User.findAll({
        where: { role: 'admin', isActive: true },
        attributes: ['id']
      });
      recipients.push(...admins.map(admin => admin.id));

      // Include department managers
      if (form.department) {
        const deptManagers = await User.findAll({
          where: {
            role: 'department_manager',
            department: form.department,
            isActive: true
          },
          attributes: ['id']
        });
        recipients.push(...deptManagers.map(manager => manager.id));
      }

      return [...new Set(recipients)]; // Remove duplicates
    } catch (error) {
      logger.error('Error getting submission notification recipients:', error);
      return [];
    }
  }

  /**
   * Get form collaborators
   */
  async getFormCollaborators(formId) {
    try {
      if (!this.webSocketService) return [];

      const collaborators = await this.webSocketService.getFormCollaborators(formId);
      return collaborators.map(collaborator => collaborator.id);
    } catch (error) {
      logger.error('Error getting form collaborators:', error);
      return [];
    }
  }
}

// Export singleton instance
const realtimeEventHandlers = new RealtimeEventHandlers();
module.exports = realtimeEventHandlers;