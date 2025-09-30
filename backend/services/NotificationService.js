/**
 * Notification Service
 * Real-time notification management for Q-Collector
 *
 * Features:
 * - Real-time push notifications via WebSocket
 * - Telegram bot notifications
 * - Email notifications (optional)
 * - In-app notification persistence
 * - Notification templates and personalization
 * - Delivery tracking and retry logic
 */

const logger = require('../utils/logger.util');
const { redisClient } = require('../config/redis.config');
const axios = require('axios');

class NotificationService {
  constructor() {
    this.webSocketService = null;
    this.notificationTemplates = new Map();
    this.deliveryQueue = [];
    this.retryQueue = [];
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 seconds

    // Initialize notification templates
    this.initializeTemplates();

    // Start delivery processor
    this.startDeliveryProcessor();
  }

  /**
   * Initialize the service with WebSocket service instance
   * @param {Object} webSocketService - WebSocket service instance
   */
  initialize(webSocketService) {
    this.webSocketService = webSocketService;
    logger.info('Notification service initialized with WebSocket integration');
  }

  /**
   * Initialize notification templates
   */
  initializeTemplates() {
    // System notifications
    this.registerTemplate('system.maintenance', {
      title: 'System Maintenance',
      body: 'System will be under maintenance from {startTime} to {endTime}',
      priority: 'high',
      channels: ['websocket', 'telegram'],
    });

    this.registerTemplate('system.backup', {
      title: 'System Backup',
      body: 'Scheduled system backup completed successfully',
      priority: 'low',
      channels: ['websocket'],
    });

    // Form notifications
    this.registerTemplate('form.created', {
      title: 'New Form Created',
      body: 'Form "{formTitle}" has been created by {creatorName}',
      priority: 'medium',
      channels: ['websocket', 'telegram'],
    });

    this.registerTemplate('form.updated', {
      title: 'Form Updated',
      body: 'Form "{formTitle}" has been updated by {updaterName}',
      priority: 'medium',
      channels: ['websocket'],
    });

    this.registerTemplate('form.deleted', {
      title: 'Form Deleted',
      body: 'Form "{formTitle}" has been deleted by {deleterName}',
      priority: 'high',
      channels: ['websocket', 'telegram'],
    });

    this.registerTemplate('form.published', {
      title: 'Form Published',
      body: 'Form "{formTitle}" is now published and available for submissions',
      priority: 'medium',
      channels: ['websocket', 'telegram'],
    });

    this.registerTemplate('form.archived', {
      title: 'Form Archived',
      body: 'Form "{formTitle}" has been archived by {archiverName}',
      priority: 'medium',
      channels: ['websocket'],
    });

    // Submission notifications
    this.registerTemplate('submission.created', {
      title: 'New Submission Received',
      body: 'New submission received for form "{formTitle}" from {submitterName}',
      priority: 'medium',
      channels: ['websocket', 'telegram'],
    });

    this.registerTemplate('submission.updated', {
      title: 'Submission Updated',
      body: 'Submission for form "{formTitle}" has been updated',
      priority: 'low',
      channels: ['websocket'],
    });

    this.registerTemplate('submission.approved', {
      title: 'Submission Approved',
      body: 'Your submission for form "{formTitle}" has been approved',
      priority: 'medium',
      channels: ['websocket', 'telegram'],
    });

    this.registerTemplate('submission.rejected', {
      title: 'Submission Rejected',
      body: 'Your submission for form "{formTitle}" has been rejected. Reason: {reason}',
      priority: 'high',
      channels: ['websocket', 'telegram'],
    });

    // User notifications
    this.registerTemplate('user.welcome', {
      title: 'Welcome to Q-Collector',
      body: 'Welcome {firstName}! Your account has been created successfully.',
      priority: 'medium',
      channels: ['websocket', 'telegram'],
    });

    this.registerTemplate('user.role_changed', {
      title: 'Role Updated',
      body: 'Your role has been updated to {newRole} by {updaterName}',
      priority: 'high',
      channels: ['websocket', 'telegram'],
    });

    this.registerTemplate('user.password_reset', {
      title: 'Password Reset Request',
      body: 'A password reset has been requested for your account. Use the link sent to your email.',
      priority: 'high',
      channels: ['websocket', 'telegram'],
    });

    // Collaboration notifications
    this.registerTemplate('collaboration.invited', {
      title: 'Collaboration Invitation',
      body: 'You have been invited to collaborate on form "{formTitle}" by {inviterName}',
      priority: 'medium',
      channels: ['websocket', 'telegram'],
    });

    this.registerTemplate('collaboration.joined', {
      title: 'User Joined Collaboration',
      body: '{userName} joined the collaboration for form "{formTitle}"',
      priority: 'low',
      channels: ['websocket'],
    });

    this.registerTemplate('collaboration.left', {
      title: 'User Left Collaboration',
      body: '{userName} left the collaboration for form "{formTitle}"',
      priority: 'low',
      channels: ['websocket'],
    });

    // Department notifications
    this.registerTemplate('department.announcement', {
      title: 'Department Announcement',
      body: '{announcement}',
      priority: 'medium',
      channels: ['websocket', 'telegram'],
    });

    logger.info(`Initialized ${this.notificationTemplates.size} notification templates`);
  }

  /**
   * Register a notification template
   * @param {string} key - Template key
   * @param {Object} template - Template configuration
   */
  registerTemplate(key, template) {
    this.notificationTemplates.set(key, {
      ...template,
      createdAt: new Date(),
    });
  }

  /**
   * Send notification
   * @param {Object} options - Notification options
   */
  async sendNotification(options) {
    const {
      templateKey,
      recipients,
      data = {},
      priority = 'medium',
      channels = ['websocket'],
      immediate = false,
      metadata = {},
    } = options;

    try {
      // Generate notification ID
      const notificationId = this.generateNotificationId();

      // Get template or use custom notification
      let template = null;
      if (templateKey) {
        template = this.notificationTemplates.get(templateKey);
        if (!template) {
          throw new Error(`Notification template '${templateKey}' not found`);
        }
      }

      // Build notification object
      const notification = {
        id: notificationId,
        templateKey,
        template,
        recipients: Array.isArray(recipients) ? recipients : [recipients],
        data,
        priority,
        channels: template?.channels || channels,
        immediate,
        metadata: {
          ...metadata,
          createdAt: new Date(),
          attempts: 0,
        },
      };

      // Process notification immediately or add to queue
      if (immediate) {
        await this.processNotification(notification);
      } else {
        this.deliveryQueue.push(notification);
      }

      // Store notification in database for persistence
      await this.storeNotification(notification);

      logger.debug(`Notification ${notificationId} queued for delivery`);
      return notificationId;

    } catch (error) {
      logger.error('Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Process a single notification
   * @param {Object} notification - Notification object
   */
  async processNotification(notification) {
    const { id, recipients, channels, template, data, priority } = notification;

    try {
      // Render notification content
      const content = await this.renderNotification(template, data);

      // Process each recipient
      for (const recipient of recipients) {
        const recipientData = await this.getRecipientData(recipient);
        if (!recipientData) {
          logger.warn(`Recipient ${recipient} not found`);
          continue;
        }

        // Send via each channel
        for (const channel of channels) {
          try {
            await this.sendViaChannel(channel, recipientData, content, notification);
          } catch (error) {
            logger.error(`Failed to send notification ${id} via ${channel} to ${recipient}:`, error);

            // Add to retry queue for failed deliveries
            this.addToRetryQueue(notification, recipient, channel, error);
          }
        }
      }

      // Mark as delivered
      await this.markAsDelivered(id);

    } catch (error) {
      logger.error(`Error processing notification ${id}:`, error);
      throw error;
    }
  }

  /**
   * Render notification content from template
   * @param {Object} template - Notification template
   * @param {Object} data - Template data
   */
  async renderNotification(template, data) {
    if (!template) {
      return {
        title: data.title || 'Notification',
        body: data.body || 'You have a new notification',
        priority: data.priority || 'medium',
      };
    }

    // Replace template variables
    const title = this.replaceTemplateVariables(template.title, data);
    const body = this.replaceTemplateVariables(template.body, data);

    return {
      title,
      body,
      priority: template.priority,
    };
  }

  /**
   * Replace template variables with actual data
   * @param {string} text - Template text
   * @param {Object} data - Data object
   */
  replaceTemplateVariables(text, data) {
    return text.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  /**
   * Get recipient data from database
   * @param {string|number} recipient - User ID or email
   */
  async getRecipientData(recipient) {
    try {
      const User = require('../models/User');

      let user;
      if (typeof recipient === 'string' && recipient.includes('@')) {
        // Email-based lookup
        user = await User.findOne({ where: { email: recipient } });
      } else {
        // ID-based lookup
        user = await User.findByPk(recipient);
      }

      if (!user) return null;

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        department: user.department,
        telegramUserId: user.telegramUserId,
        notificationPreferences: user.notificationPreferences || {},
      };
    } catch (error) {
      logger.error(`Error getting recipient data for ${recipient}:`, error);
      return null;
    }
  }

  /**
   * Send notification via specific channel
   * @param {string} channel - Delivery channel
   * @param {Object} recipient - Recipient data
   * @param {Object} content - Notification content
   * @param {Object} notification - Full notification object
   */
  async sendViaChannel(channel, recipient, content, notification) {
    switch (channel) {
      case 'websocket':
        await this.sendViaWebSocket(recipient, content, notification);
        break;
      case 'telegram':
        await this.sendViaTelegram(recipient, content, notification);
        break;
      case 'email':
        await this.sendViaEmail(recipient, content, notification);
        break;
      default:
        throw new Error(`Unknown notification channel: ${channel}`);
    }
  }

  /**
   * Send notification via WebSocket
   * @param {Object} recipient - Recipient data
   * @param {Object} content - Notification content
   * @param {Object} notification - Full notification object
   */
  async sendViaWebSocket(recipient, content, notification) {
    if (!this.webSocketService) {
      throw new Error('WebSocket service not initialized');
    }

    const wsData = {
      id: notification.id,
      type: 'notification',
      ...content,
      recipient: {
        id: recipient.id,
        username: recipient.username,
      },
      metadata: notification.metadata,
    };

    // Send to user's personal room
    this.webSocketService.sendToUser(recipient.id, 'notification:new', wsData);

    logger.debug(`WebSocket notification sent to user ${recipient.username}`);
  }

  /**
   * Send notification via Telegram
   * @param {Object} recipient - Recipient data
   * @param {Object} content - Notification content
   * @param {Object} notification - Full notification object
   */
  async sendViaTelegram(recipient, content, notification) {
    if (!recipient.telegramUserId) {
      throw new Error('Recipient has no Telegram user ID configured');
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      throw new Error('Telegram bot token not configured');
    }

    const message = `*${content.title}*\n\n${content.body}`;

    const telegramData = {
      chat_id: recipient.telegramUserId,
      text: message,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    };

    const response = await axios.post(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      telegramData,
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.data.ok) {
      throw new Error(`Telegram API error: ${response.data.description}`);
    }

    logger.debug(`Telegram notification sent to user ${recipient.username}`);
  }

  /**
   * Send notification via Email (placeholder for future implementation)
   * @param {Object} recipient - Recipient data
   * @param {Object} content - Notification content
   * @param {Object} notification - Full notification object
   */
  async sendViaEmail(recipient, content, notification) {
    // TODO: Implement email notification
    // This would integrate with services like SendGrid, AWS SES, or SMTP
    logger.info(`Email notification would be sent to ${recipient.email}: ${content.title}`);

    // For now, just log the email notification
    // In the future, implement actual email sending logic here
  }

  /**
   * Store notification in database for persistence
   * @param {Object} notification - Notification object
   */
  async storeNotification(notification) {
    try {
      // Store in Redis for fast access
      const key = `notification:${notification.id}`;
      const data = JSON.stringify({
        ...notification,
        storedAt: new Date(),
      });

      await redisClient.setEx(key, 86400 * 7, data); // Store for 7 days

      // TODO: Also store in PostgreSQL for long-term persistence
      // This would create a notifications table with proper indexing

    } catch (error) {
      logger.error('Error storing notification:', error);
    }
  }

  /**
   * Mark notification as delivered
   * @param {string} notificationId - Notification ID
   */
  async markAsDelivered(notificationId) {
    try {
      const key = `notification:${notificationId}`;
      const data = await redisClient.get(key);

      if (data) {
        const notification = JSON.parse(data);
        notification.deliveredAt = new Date();
        notification.status = 'delivered';

        await redisClient.setEx(key, 86400 * 7, JSON.stringify(notification));
      }
    } catch (error) {
      logger.error('Error marking notification as delivered:', error);
    }
  }

  /**
   * Add failed notification to retry queue
   * @param {Object} notification - Original notification
   * @param {string} recipient - Failed recipient
   * @param {string} channel - Failed channel
   * @param {Error} error - Error that caused failure
   */
  addToRetryQueue(notification, recipient, channel, error) {
    if (notification.metadata.attempts >= this.maxRetries) {
      logger.error(`Max retries exceeded for notification ${notification.id}`);
      return;
    }

    const retryItem = {
      ...notification,
      recipient,
      channel,
      error: error.message,
      retryAt: new Date(Date.now() + this.retryDelay * Math.pow(2, notification.metadata.attempts)),
      metadata: {
        ...notification.metadata,
        attempts: notification.metadata.attempts + 1,
      },
    };

    this.retryQueue.push(retryItem);
  }

  /**
   * Generate unique notification ID
   */
  generateNotificationId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `notif_${timestamp}_${random}`;
  }

  /**
   * Start the delivery processor
   */
  startDeliveryProcessor() {
    // Process delivery queue every 2 seconds
    setInterval(async () => {
      if (this.deliveryQueue.length > 0) {
        const notification = this.deliveryQueue.shift();
        try {
          await this.processNotification(notification);
        } catch (error) {
          logger.error('Error in delivery processor:', error);
        }
      }
    }, 2000);

    // Process retry queue every 10 seconds
    setInterval(async () => {
      const now = new Date();
      const readyRetries = this.retryQueue.filter(item => item.retryAt <= now);

      for (const retryItem of readyRetries) {
        this.retryQueue = this.retryQueue.filter(item => item !== retryItem);

        try {
          await this.processNotification(retryItem);
        } catch (error) {
          logger.error('Error in retry processor:', error);
          this.addToRetryQueue(retryItem, retryItem.recipient, retryItem.channel, error);
        }
      }
    }, 10000);

    logger.info('Notification delivery processor started');
  }

  /**
   * Send broadcast notification to multiple users
   * @param {Object} options - Broadcast options
   */
  async broadcastNotification(options) {
    const {
      templateKey,
      filter = {},
      data = {},
      priority = 'medium',
      channels = ['websocket'],
      metadata = {},
    } = options;

    try {
      // Get recipients based on filter
      const recipients = await this.getRecipientsFromFilter(filter);

      if (recipients.length === 0) {
        logger.warn('No recipients found for broadcast notification');
        return;
      }

      // Send notification to all recipients
      return await this.sendNotification({
        templateKey,
        recipients: recipients.map(r => r.id),
        data,
        priority,
        channels,
        metadata: {
          ...metadata,
          broadcast: true,
          recipientCount: recipients.length,
        },
      });

    } catch (error) {
      logger.error('Error sending broadcast notification:', error);
      throw error;
    }
  }

  /**
   * Get recipients based on filter criteria
   * @param {Object} filter - Filter criteria
   */
  async getRecipientsFromFilter(filter) {
    try {
      const User = require('../models/User');
      const where = {};

      // Filter by role
      if (filter.role) {
        where.role = filter.role;
      }

      // Filter by department
      if (filter.department) {
        where.department = filter.department;
      }

      // Filter by active status
      if (filter.isActive !== undefined) {
        where.isActive = filter.isActive;
      }

      // Filter by custom criteria
      if (filter.where) {
        Object.assign(where, filter.where);
      }

      const users = await User.findAll({
        where,
        attributes: ['id', 'username', 'email', 'firstName', 'lastName', 'role', 'department', 'telegramUserId'],
      });

      return users;
    } catch (error) {
      logger.error('Error getting recipients from filter:', error);
      return [];
    }
  }

  /**
   * Send system-wide announcement
   * @param {Object} options - Announcement options
   */
  async sendSystemAnnouncement(options) {
    const {
      title,
      body,
      priority = 'high',
      channels = ['websocket', 'telegram'],
      targetRoles = ['admin', 'department_manager', 'user'],
      metadata = {},
    } = options;

    return await this.broadcastNotification({
      templateKey: null,
      filter: {
        role: targetRoles,
        isActive: true,
      },
      data: {
        title,
        body,
        priority,
      },
      priority,
      channels,
      metadata: {
        ...metadata,
        type: 'system_announcement',
      },
    });
  }

  /**
   * Send department announcement
   * @param {Object} options - Department announcement options
   */
  async sendDepartmentAnnouncement(options) {
    const {
      department,
      announcement,
      priority = 'medium',
      channels = ['websocket', 'telegram'],
      metadata = {},
    } = options;

    return await this.broadcastNotification({
      templateKey: 'department.announcement',
      filter: {
        department,
        isActive: true,
      },
      data: {
        announcement,
      },
      priority,
      channels,
      metadata: {
        ...metadata,
        type: 'department_announcement',
        department,
      },
    });
  }

  /**
   * Get notification statistics
   */
  async getStats() {
    return {
      templates: this.notificationTemplates.size,
      queueSize: this.deliveryQueue.length,
      retryQueueSize: this.retryQueue.length,
      maxRetries: this.maxRetries,
      retryDelay: this.retryDelay,
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      logger.info('Shutting down Notification service...');

      // Process remaining notifications in queue
      while (this.deliveryQueue.length > 0) {
        const notification = this.deliveryQueue.shift();
        try {
          await this.processNotification(notification);
        } catch (error) {
          logger.error('Error processing notification during shutdown:', error);
        }
      }

      logger.info('Notification service shutdown completed');
    } catch (error) {
      logger.error('Error during Notification service shutdown:', error);
    }
  }
}

// Export singleton instance
const notificationService = new NotificationService();
module.exports = notificationService;