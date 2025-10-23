/**
 * Telegram API Routes
 * Enhanced Telegram bot integration and management endpoints
 */

const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const telegramService = require('../../services/TelegramService');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const logger = require('../../utils/logger.util');

/**
 * @swagger
 * tags:
 *   name: Telegram
 *   description: Telegram bot integration and management API
 */

/**
 * @swagger
 * /telegram/webhook:
 *   post:
 *     summary: Telegram webhook endpoint
 *     tags: [Telegram]
 *     description: Receives updates from Telegram bot
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Telegram update object
 *     responses:
 *       200:
 *         description: Update processed successfully
 *       400:
 *         description: Invalid update format
 */
router.post('/webhook', async (req, res) => {
  try {
    const update = req.body;

    // Validate webhook secret if configured
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (webhookSecret) {
      const receivedSecret = req.headers['x-telegram-bot-api-secret-token'];
      if (receivedSecret !== webhookSecret) {
        return res.status(401).json({
          success: false,
          error: 'Invalid webhook secret'
        });
      }
    }

    // Process the update
    await telegramService.handleUpdate(update);

    res.json({ success: true });

  } catch (error) {
    logger.error('Telegram webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Webhook processing failed'
    });
  }
});

/**
 * @swagger
 * /telegram/status:
 *   get:
 *     summary: Get Telegram service status
 *     tags: [Telegram]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Telegram service status
 */
router.get('/status',
  authenticate,
  authorize('admin', 'super_admin'),
  async (req, res) => {
    try {
      const status = telegramService.getStatus();

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      logger.error('Failed to get Telegram service status:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TELEGRAM_STATUS_ERROR',
          message: 'Failed to retrieve Telegram service status',
          details: error.message
        }
      });
    }
  }
);

/**
 * @swagger
 * /telegram/send:
 *   post:
 *     summary: Send message via Telegram bot
 *     tags: [Telegram]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - chatId
 *               - message
 *             properties:
 *               chatId:
 *                 type: string
 *                 description: Telegram chat ID
 *               message:
 *                 type: string
 *                 description: Message text
 *               parseMode:
 *                 type: string
 *                 enum: [HTML, Markdown]
 *                 default: HTML
 *               replyMarkup:
 *                 type: object
 *                 description: Inline keyboard markup
 *     responses:
 *       200:
 *         description: Message sent successfully
 */
router.post('/send',
  authenticate,
  authorize('admin', 'super_admin'),
  [
    body('chatId').notEmpty().withMessage('Chat ID is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('parseMode').optional().isIn(['HTML', 'Markdown']),
    body('replyMarkup').optional().isObject()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid message parameters',
            details: errors.array()
          }
        });
      }

      const { chatId, message, parseMode, replyMarkup } = req.body;

      const result = await telegramService.sendMessage(chatId, message, {
        parseMode,
        replyMarkup
      });

      logger.info(`Telegram message sent via API by ${req.user.username}`, {
        chatId,
        messageLength: message.length,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Failed to send Telegram message via API:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TELEGRAM_SEND_ERROR',
          message: 'Failed to send Telegram message',
          details: error.message
        }
      });
    }
  }
);

/**
 * @swagger
 * /telegram/broadcast:
 *   post:
 *     summary: Send broadcast message to multiple users
 *     tags: [Telegram]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 description: Broadcast message
 *               recipients:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of user IDs or chat IDs
 *               filter:
 *                 type: object
 *                 description: User filter criteria
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 default: medium
 *     responses:
 *       200:
 *         description: Broadcast sent successfully
 */
router.post('/broadcast',
  authenticate,
  authorize('admin', 'super_admin'),
  [
    body('message').notEmpty().withMessage('Message is required'),
    body('recipients').optional().isArray(),
    body('filter').optional().isObject(),
    body('priority').optional().isIn(['low', 'medium', 'high'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid broadcast parameters',
            details: errors.array()
          }
        });
      }

      const { message, recipients, filter, priority = 'medium' } = req.body;

      let targetRecipients = recipients;

      // If no specific recipients, use filter to find users
      if (!targetRecipients && filter) {
        const User = require('../../models/User');
        const users = await User.findAll({
          where: {
            ...filter,
            telegramUserId: { [require('sequelize').Op.ne]: null }
          },
          attributes: ['telegramUserId']
        });
        targetRecipients = users.map(u => u.telegramUserId);
      }

      if (!targetRecipients || targetRecipients.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_RECIPIENTS',
            message: 'No recipients found for broadcast'
          }
        });
      }

      // Send broadcast
      const results = await Promise.allSettled(
        targetRecipients.map(chatId =>
          telegramService.sendMessage(chatId, message, {
            disableNotification: priority === 'low'
          })
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      logger.info(`Telegram broadcast sent by ${req.user.username}`, {
        messageLength: message.length,
        recipients: targetRecipients.length,
        successful,
        failed,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: {
          total: targetRecipients.length,
          successful,
          failed,
          message: 'Broadcast processed'
        }
      });
    } catch (error) {
      logger.error('Failed to send Telegram broadcast:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TELEGRAM_BROADCAST_ERROR',
          message: 'Failed to send Telegram broadcast',
          details: error.message
        }
      });
    }
  }
);

/**
 * @swagger
 * /telegram/commands:
 *   get:
 *     summary: Get available bot commands
 *     tags: [Telegram]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available commands
 */
router.get('/commands',
  authenticate,
  authorize('admin', 'super_admin'),
  async (req, res) => {
    try {
      const commands = Array.from(telegramService.commands.values());

      res.json({
        success: true,
        data: {
          commands,
          count: commands.length
        }
      });
    } catch (error) {
      logger.error('Failed to get Telegram commands:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TELEGRAM_COMMANDS_ERROR',
          message: 'Failed to retrieve Telegram commands',
          details: error.message
        }
      });
    }
  }
);

/**
 * @swagger
 * /telegram/webhook/set:
 *   post:
 *     summary: Set Telegram webhook URL
 *     tags: [Telegram]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: Webhook URL
 *               secretToken:
 *                 type: string
 *                 description: Secret token for webhook security
 *     responses:
 *       200:
 *         description: Webhook set successfully
 */
router.post('/webhook/set',
  authenticate,
  authorize('super_admin'),
  [
    body('url').isURL().withMessage('Valid webhook URL is required'),
    body('secretToken').optional().isLength({ min: 1, max: 256 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid webhook parameters',
            details: errors.array()
          }
        });
      }

      const { url, secretToken } = req.body;

      await telegramService.setWebhook(url, secretToken);

      logger.info(`Telegram webhook set by ${req.user.username}`, {
        url,
        hasSecretToken: !!secretToken,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: {
          message: 'Webhook set successfully',
          url
        }
      });
    } catch (error) {
      logger.error('Failed to set Telegram webhook:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TELEGRAM_WEBHOOK_ERROR',
          message: 'Failed to set Telegram webhook',
          details: error.message
        }
      });
    }
  }
);

/**
 * @swagger
 * /telegram/users/link:
 *   post:
 *     summary: Link user account with Telegram
 *     tags: [Telegram]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - telegramUserId
 *             properties:
 *               telegramUserId:
 *                 type: string
 *                 description: Telegram user ID
 *               telegramUsername:
 *                 type: string
 *                 description: Telegram username
 *     responses:
 *       200:
 *         description: Account linked successfully
 */
router.post('/users/link',
  authenticate,
  [
    body('telegramUserId').notEmpty().withMessage('Telegram user ID is required'),
    body('telegramUsername').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid link parameters',
            details: errors.array()
          }
        });
      }

      const { telegramUserId, telegramUsername } = req.body;
      const userId = req.user.id;

      // Check if Telegram ID is already linked to another user
      const User = require('../../models/User');
      const existingUser = await User.findOne({
        where: { telegramUserId: telegramUserId.toString() }
      });

      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'TELEGRAM_ALREADY_LINKED',
            message: 'This Telegram account is already linked to another user'
          }
        });
      }

      // Update user with Telegram information
      await User.update(
        {
          telegramUserId: telegramUserId.toString(),
          telegramUsername: telegramUsername || null
        },
        { where: { id: userId } }
      );

      logger.info(`User linked Telegram account`, {
        userId,
        telegramUserId,
        telegramUsername,
        username: req.user.username
      });

      res.json({
        success: true,
        data: {
          message: 'Telegram account linked successfully',
          telegramUserId,
          telegramUsername
        }
      });
    } catch (error) {
      logger.error('Failed to link Telegram account:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TELEGRAM_LINK_ERROR',
          message: 'Failed to link Telegram account',
          details: error.message
        }
      });
    }
  }
);

/**
 * @swagger
 * /telegram/users/unlink:
 *   post:
 *     summary: Unlink user account from Telegram
 *     tags: [Telegram]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account unlinked successfully
 */
router.post('/users/unlink',
  authenticate,
  async (req, res) => {
    try {
      const userId = req.user.id;

      // Remove Telegram information from user
      const User = require('../../models/User');
      await User.update(
        {
          telegramUserId: null,
          telegramUsername: null
        },
        { where: { id: userId } }
      );

      logger.info(`User unlinked Telegram account`, {
        userId,
        username: req.user.username
      });

      res.json({
        success: true,
        data: {
          message: 'Telegram account unlinked successfully'
        }
      });
    } catch (error) {
      logger.error('Failed to unlink Telegram account:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TELEGRAM_UNLINK_ERROR',
          message: 'Failed to unlink Telegram account',
          details: error.message
        }
      });
    }
  }
);

/**
 * @swagger
 * /telegram/notifications/send:
 *   post:
 *     summary: Send notification via Telegram
 *     tags: [Telegram]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipients
 *               - templateKey
 *             properties:
 *               recipients:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of user IDs
 *               templateKey:
 *                 type: string
 *                 description: Notification template key
 *               data:
 *                 type: object
 *                 description: Template data
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 default: medium
 *               includeButtons:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Notification sent successfully
 */
router.post('/notifications/send',
  authenticate,
  authorize('admin', 'super_admin'),
  [
    body('recipients').isArray({ min: 1 }).withMessage('At least one recipient is required'),
    body('templateKey').notEmpty().withMessage('Template key is required'),
    body('data').optional().isObject(),
    body('priority').optional().isIn(['low', 'medium', 'high']),
    body('includeButtons').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid notification parameters',
            details: errors.array()
          }
        });
      }

      const {
        recipients,
        templateKey,
        data = {},
        priority = 'medium',
        includeButtons = false
      } = req.body;

      await telegramService.sendEnhancedNotification({
        recipients,
        templateKey,
        data,
        priority,
        includeButtons
      });

      logger.info(`Telegram notification sent via API by ${req.user.username}`, {
        templateKey,
        recipients: recipients.length,
        priority,
        includeButtons,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: {
          message: 'Notification sent successfully',
          recipients: recipients.length,
          templateKey
        }
      });
    } catch (error) {
      logger.error('Failed to send Telegram notification:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TELEGRAM_NOTIFICATION_ERROR',
          message: 'Failed to send Telegram notification',
          details: error.message
        }
      });
    }
  }
);

/**
 * @swagger
 * /telegram/bot/info:
 *   get:
 *     summary: Get bot information
 *     tags: [Telegram]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bot information retrieved successfully
 */
router.get('/bot/info',
  authenticate,
  authorize('admin', 'super_admin'),
  async (req, res) => {
    try {
      const botInfo = await telegramService.getBotInfo();

      res.json({
        success: true,
        data: botInfo
      });
    } catch (error) {
      logger.error('Failed to get bot info:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TELEGRAM_BOT_INFO_ERROR',
          message: 'Failed to retrieve bot information',
          details: error.message
        }
      });
    }
  }
);

module.exports = router;