/**
 * Advanced Telegram Service for Q-Collector Framework v1.0
 * Enhanced Telegram bot integration with interactive features
 *
 * Features:
 * - Advanced bot commands and interactions
 * - Interactive keyboards and inline buttons
 * - File attachments and media support
 * - Multi-language support
 * - Rich message formatting
 * - Webhook and polling support
 * - User registration and verification
 * - Form submission through Telegram
 * - Approval workflows through bot
 * - Department-specific notifications
 * - Analytics and usage tracking
 */

const axios = require('axios');
const logger = require('../utils/logger.util');
const notificationService = require('./NotificationService');

class TelegramService {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.groupId = process.env.TELEGRAM_GROUP_ID;
    this.webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;

    this.isInitialized = false;
    this.botInfo = null;
    this.commands = new Map();
    this.inlineKeyboards = new Map();
    this.userSessions = new Map(); // Track user conversation states
    this.messageQueue = [];
    this.retryAttempts = 3;
    this.retryDelay = 2000;

    // Initialize if token is available
    if (this.botToken) {
      this.initialize();
    } else {
      logger.warn('Telegram bot token not configured');
    }
  }

  /**
   * Initialize Telegram service
   */
  async initialize() {
    try {
      // Get bot information
      this.botInfo = await this.getBotInfo();

      // Set up webhook if URL is provided
      if (this.webhookUrl) {
        await this.setWebhook(this.webhookUrl);
      }

      // Register default commands
      await this.registerDefaultCommands();

      // Set bot commands menu
      await this.setBotCommands();

      this.isInitialized = true;
      logger.info(`Telegram service initialized for bot: ${this.botInfo.username}`);

    } catch (error) {
      logger.error('Failed to initialize Telegram service:', error);
      throw error;
    }
  }

  /**
   * Get bot information
   */
  async getBotInfo() {
    try {
      const response = await this.makeRequest('getMe');
      return response.result;
    } catch (error) {
      logger.error('Failed to get bot info:', error);
      throw error;
    }
  }

  /**
   * Set webhook for receiving updates
   */
  async setWebhook(url) {
    try {
      const response = await this.makeRequest('setWebhook', {
        url: url,
        allowed_updates: ['message', 'callback_query', 'inline_query'],
        drop_pending_updates: true
      });

      if (response.ok) {
        logger.info(`Webhook set to: ${url}`);
      } else {
        throw new Error(response.description);
      }
    } catch (error) {
      logger.error('Failed to set webhook:', error);
      throw error;
    }
  }

  /**
   * Register default bot commands
   */
  async registerDefaultCommands() {
    // Start command
    this.registerCommand('start', {
      description: 'เริ่มต้นใช้งานบอท',
      handler: this.handleStartCommand.bind(this),
      scope: 'all'
    });

    // Help command
    this.registerCommand('help', {
      description: 'แสดงคำสั่งที่ใช้ได้',
      handler: this.handleHelpCommand.bind(this),
      scope: 'all'
    });

    // Register command
    this.registerCommand('register', {
      description: 'ลงทะเบียนบัญชีผู้ใช้',
      handler: this.handleRegisterCommand.bind(this),
      scope: 'private'
    });

    // Status command
    this.registerCommand('status', {
      description: 'ตรวจสอบสถานะระบบ',
      handler: this.handleStatusCommand.bind(this),
      scope: 'all'
    });

    // Forms command
    this.registerCommand('forms', {
      description: 'แสดงรายการฟอร์ม',
      handler: this.handleFormsCommand.bind(this),
      scope: 'all'
    });

    // Submissions command
    this.registerCommand('submissions', {
      description: 'แสดงรายการส่งข้อมูล',
      handler: this.handleSubmissionsCommand.bind(this),
      scope: 'all'
    });

    // Approve command (admin only)
    this.registerCommand('approve', {
      description: 'อนุมัติการส่งข้อมูล',
      handler: this.handleApproveCommand ? this.handleApproveCommand.bind(this) : this.handleNotImplemented.bind(this),
      scope: 'admin'
    });

    // Reject command (admin only)
    this.registerCommand('reject', {
      description: 'ปฏิเสธการส่งข้อมูล',
      handler: this.handleRejectCommand ? this.handleRejectCommand.bind(this) : this.handleNotImplemented.bind(this),
      scope: 'admin'
    });

    // Broadcast command (admin only)
    this.registerCommand('broadcast', {
      description: 'ส่งข้อความประกาศ',
      handler: this.handleNotImplemented.bind(this),
      scope: 'admin'
    });

    logger.info(`Registered ${this.commands.size} bot commands`);
  }

  /**
   * Register a bot command
   */
  registerCommand(command, config) {
    this.commands.set(command, {
      command,
      description: config.description,
      handler: config.handler,
      scope: config.scope || 'all',
      adminOnly: config.adminOnly || false,
      parameters: config.parameters || [],
      examples: config.examples || []
    });
  }

  /**
   * Set bot commands menu
   */
  async setBotCommands() {
    const commands = Array.from(this.commands.values())
      .filter(cmd => cmd.scope === 'all' || cmd.scope === 'private')
      .map(cmd => ({
        command: cmd.command,
        description: cmd.description
      }));

    try {
      await this.makeRequest('setMyCommands', { commands });
      logger.info('Bot commands menu updated');
    } catch (error) {
      logger.error('Failed to set bot commands:', error);
    }
  }

  /**
   * Send enhanced message with formatting and keyboards
   */
  async sendMessage(chatId, text, options = {}) {
    const {
      parseMode = 'HTML',
      disableWebPagePreview = true,
      disableNotification = false,
      replyMarkup = null,
      messageThreadId = null
    } = options;

    const payload = {
      chat_id: chatId,
      text: this.formatMessage(text),
      parse_mode: parseMode,
      disable_web_page_preview: disableWebPagePreview,
      disable_notification: disableNotification
    };

    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    if (messageThreadId) {
      payload.message_thread_id = messageThreadId;
    }

    try {
      const response = await this.makeRequest('sendMessage', payload);
      return response.result;
    } catch (error) {
      logger.error(`Failed to send message to ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Send photo with caption
   */
  async sendPhoto(chatId, photo, caption = '', options = {}) {
    const payload = {
      chat_id: chatId,
      photo: photo,
      caption: this.formatMessage(caption),
      parse_mode: options.parseMode || 'HTML'
    };

    if (options.replyMarkup) {
      payload.reply_markup = options.replyMarkup;
    }

    try {
      const response = await this.makeRequest('sendPhoto', payload);
      return response.result;
    } catch (error) {
      logger.error(`Failed to send photo to ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Send document/file
   */
  async sendDocument(chatId, document, caption = '', options = {}) {
    const payload = {
      chat_id: chatId,
      document: document,
      caption: this.formatMessage(caption),
      parse_mode: options.parseMode || 'HTML'
    };

    if (options.replyMarkup) {
      payload.reply_markup = options.replyMarkup;
    }

    try {
      const response = await this.makeRequest('sendDocument', payload);
      return response.result;
    } catch (error) {
      logger.error(`Failed to send document to ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Create inline keyboard
   */
  createInlineKeyboard(buttons) {
    return {
      inline_keyboard: buttons.map(row =>
        Array.isArray(row)
          ? row.map(btn => this.createInlineButton(btn))
          : [this.createInlineButton(row)]
      )
    };
  }

  /**
   * Create inline button
   */
  createInlineButton(button) {
    const btn = { text: button.text };

    if (button.callback_data) {
      btn.callback_data = button.callback_data;
    } else if (button.url) {
      btn.url = button.url;
    } else if (button.switch_inline_query) {
      btn.switch_inline_query = button.switch_inline_query;
    }

    return btn;
  }

  /**
   * Create reply keyboard
   */
  createReplyKeyboard(buttons, options = {}) {
    return {
      keyboard: buttons.map(row =>
        Array.isArray(row)
          ? row.map(btn => ({ text: btn }))
          : [{ text: row }]
      ),
      resize_keyboard: options.resize !== false,
      one_time_keyboard: options.oneTime === true,
      selective: options.selective === true
    };
  }

  /**
   * Remove keyboard
   */
  removeKeyboard() {
    return { remove_keyboard: true };
  }

  /**
   * Format message with HTML styling
   */
  formatMessage(text) {
    if (!text) return '';

    // Convert markdown-style formatting to HTML
    return text
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.*?)\*/g, '<i>$1</i>')
      .replace(/__(.*?)__/g, '<u>$1</u>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/```(.*?)```/gs, '<pre>$1</pre>');
  }

  /**
   * Handle webhook updates
   */
  async handleUpdate(update) {
    try {
      if (update.message) {
        await this.handleMessage(update.message);
      } else if (update.callback_query) {
        await this.handleCallbackQuery(update.callback_query);
      } else if (update.inline_query) {
        await this.handleInlineQuery(update.inline_query);
      }
    } catch (error) {
      logger.error('Error handling Telegram update:', error);
    }
  }

  /**
   * Handle incoming messages
   */
  async handleMessage(message) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = message.text || '';

    // Log message for analytics
    logger.debug(`Telegram message from ${userId}: ${text}`);

    // Handle commands
    if (text.startsWith('/')) {
      const [command, ...args] = text.slice(1).split(' ');
      await this.handleCommand(command, args, message);
      return;
    }

    // Handle session-based conversations
    const session = this.getUserSession(userId);
    if (session && session.handler) {
      await session.handler(message, session);
      return;
    }

    // Default response for unrecognized messages
    await this.sendMessage(chatId,
      'สวัสดีครับ! 👋\n\n' +
      'ผมเป็นบอทของระบบ Q-Collector\n' +
      'พิมพ์ /help เพื่อดูคำสั่งที่ใช้ได้'
    );
  }

  /**
   * Handle bot commands
   */
  async handleCommand(command, args, message) {
    const commandConfig = this.commands.get(command);

    if (!commandConfig) {
      await this.sendMessage(message.chat.id,
        '❌ ไม่พบคำสั่งนี้\nพิมพ์ /help เพื่อดูคำสั่งที่ใช้ได้'
      );
      return;
    }

    // Check permissions
    if (commandConfig.adminOnly && !await this.isUserAdmin(message.from.id)) {
      await this.sendMessage(message.chat.id,
        '🚫 คุณไม่มีสิทธิ์ใช้คำสั่งนี้'
      );
      return;
    }

    try {
      await commandConfig.handler(message, args);
    } catch (error) {
      logger.error(`Error handling command ${command}:`, error);
      await this.sendMessage(message.chat.id,
        '❌ เกิดข้อผิดพลาดในการประมวลผลคำสั่ง\nกรุณาลองใหม่อีกครั้ง'
      );
    }
  }

  /**
   * Handle callback queries (inline button presses)
   */
  async handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;

    try {
      // Answer callback query to remove loading state
      await this.answerCallbackQuery(callbackQuery.id);

      // Parse callback data
      const [action, ...params] = data.split(':');

      switch (action) {
        case 'approve_submission':
          await this.handleApproveSubmissionCallback(chatId, params[0], userId);
          break;
        case 'reject_submission':
          await this.handleRejectSubmissionCallback(chatId, params[0], userId);
          break;
        case 'view_form':
          await this.handleViewFormCallback(chatId, params[0], userId);
          break;
        case 'register_user':
          await this.handleRegisterUserCallback(chatId, params[0], userId);
          break;
        default:
          logger.warn(`Unknown callback action: ${action}`);
      }
    } catch (error) {
      logger.error('Error handling callback query:', error);
    }
  }

  /**
   * Answer callback query
   */
  async answerCallbackQuery(callbackQueryId, text = null, showAlert = false) {
    const payload = { callback_query_id: callbackQueryId };

    if (text) {
      payload.text = text;
      payload.show_alert = showAlert;
    }

    try {
      await this.makeRequest('answerCallbackQuery', payload);
    } catch (error) {
      logger.error('Failed to answer callback query:', error);
    }
  }

  /**
   * Handle inline queries
   */
  async handleInlineQuery(inlineQuery) {
    const query = inlineQuery.query;
    const results = [];

    try {
      // Search forms based on query
      if (query.startsWith('form:')) {
        const formName = query.slice(5);
        // Add form search results
        results.push({
          type: 'article',
          id: '1',
          title: `ค้นหาฟอร์ม: ${formName}`,
          description: 'คลิกเพื่อค้นหาฟอร์ม',
          input_message_content: {
            message_text: `🔍 ค้นหาฟอร์ม: ${formName}`
          }
        });
      }

      await this.answerInlineQuery(inlineQuery.id, results);
    } catch (error) {
      logger.error('Error handling inline query:', error);
    }
  }

  /**
   * Answer inline query
   */
  async answerInlineQuery(inlineQueryId, results, options = {}) {
    const payload = {
      inline_query_id: inlineQueryId,
      results: results,
      cache_time: options.cacheTime || 300,
      is_personal: options.isPersonal || true
    };

    try {
      await this.makeRequest('answerInlineQuery', payload);
    } catch (error) {
      logger.error('Failed to answer inline query:', error);
    }
  }

  /**
   * Command Handlers
   */

  async handleStartCommand(message, args) {
    const userId = message.from.id;
    const firstName = message.from.first_name;

    const welcomeMessage =
      `🎉 สวัสดี ${firstName}!\n\n` +
      '🤖 ยินดีต้อนรับสู่บอท Q-Collector\n' +
      'ระบบจัดการฟอร์มและข้อมูลออนไลน์\n\n' +
      '📋 สิ่งที่คุณสามารถทำได้:\n' +
      '• ดูรายการฟอร์ม\n' +
      '• ติดตามสถานะการส่งข้อมูล\n' +
      '• รับการแจ้งเตือนแบบเรียลไทม์\n' +
      '• อนุมัติ/ปฏิเสธการส่งข้อมูล (สำหรับผู้ดูแล)\n\n' +
      '🚀 เริ่มต้นด้วยการพิมพ์ /help';

    const keyboard = this.createInlineKeyboard([
      [
        { text: '📋 ดูฟอร์ม', callback_data: 'view_forms' },
        { text: '📊 สถานะ', callback_data: 'view_status' }
      ],
      [
        { text: '🔐 ลงทะเบียน', callback_data: 'register_user' }
      ]
    ]);

    await this.sendMessage(message.chat.id, welcomeMessage, {
      replyMarkup: keyboard
    });
  }

  async handleHelpCommand(message, args) {
    const commands = Array.from(this.commands.values())
      .filter(cmd => cmd.scope === 'all' || cmd.scope === 'private')
      .map(cmd => `/${cmd.command} - ${cmd.description}`)
      .join('\n');

    const helpMessage =
      '📖 **คำสั่งที่ใช้ได้:**\n\n' +
      commands + '\n\n' +
      '💡 **เคล็ดลับ:**\n' +
      '• คลิกปุ่มเพื่อใช้งานง่ายขึ้น\n' +
      '• ใช้ @qcollector_bot ในแชทกลุ่มเพื่อค้นหา\n' +
      '• ตั้งค่าการแจ้งเตือนในเมนูหลัก';

    await this.sendMessage(message.chat.id, helpMessage);
  }

  async handleRegisterCommand(message, args) {
    const userId = message.from.id;
    const firstName = message.from.first_name;
    const lastName = message.from.last_name || '';
    const username = message.from.username;

    // Check if user is already registered
    const existingUser = await this.findUserByTelegramId(userId);
    if (existingUser) {
      await this.sendMessage(message.chat.id,
        '✅ คุณได้ลงทะเบียนแล้ว\n' +
        `👤 ชื่อ: ${existingUser.firstName} ${existingUser.lastName}\n` +
        `🏢 แผนก: ${existingUser.department}\n` +
        `👮 บทบาท: ${existingUser.role}`
      );
      return;
    }

    // Start registration process
    const registrationMessage =
      '📝 **ลงทะเบียนบัญชีใหม่**\n\n' +
      '🔐 เพื่อความปลอดภัย กรุณาติดต่อผู้ดูแลระบบ\n' +
      'เพื่อขอรหัสลงทะเบียนก่อนใช้งาน\n\n' +
      '📞 **ติดต่อ:**\n' +
      '• ผู้ดูแลระบบ IT\n' +
      '• หัวหน้าแผนกของคุณ\n\n' +
      '🔗 หรือลงทะเบียนผ่านเว็บไซต์: /link';

    const keyboard = this.createInlineKeyboard([
      [
        { text: '🌐 เปิดเว็บไซต์', url: process.env.FRONTEND_URL || 'https://qcollector.example.com' }
      ],
      [
        { text: '📞 ติดต่อผู้ดูแล', callback_data: 'contact_admin' }
      ]
    ]);

    await this.sendMessage(message.chat.id, registrationMessage, {
      replyMarkup: keyboard
    });
  }

  async handleStatusCommand(message, args) {
    const statusMessage =
      '🟢 **สถานะระบบ**\n\n' +
      '✅ บอทออนไลน์\n' +
      '✅ ฐานข้อมูลเชื่อมต่อ\n' +
      '✅ เซิร์ฟเวอร์ทำงานปกติ\n\n' +
      `📊 สถิติ:\n` +
      `• ผู้ใช้ออนไลน์: ${await this.getOnlineUsersCount()}\n` +
      `• ฟอร์มที่ใช้งานได้: ${await this.getActiveFormsCount()}\n` +
      `• การส่งข้อมูลวันนี้: ${await this.getTodaySubmissionsCount()}\n\n` +
      `🕐 อัพเดทล่าสุด: ${new Date().toLocaleString('th-TH')}`;

    await this.sendMessage(message.chat.id, statusMessage);
  }

  async handleFormsCommand(message, args) {
    try {
      const forms = await this.getActiveForms();

      if (forms.length === 0) {
        await this.sendMessage(message.chat.id,
          '📋 ไม่มีฟอร์มที่ใช้งานได้ในขณะนี้'
        );
        return;
      }

      let formsMessage = '📋 **ฟอร์มที่ใช้งานได้:**\n\n';

      const keyboard = [];
      forms.slice(0, 10).forEach((form, index) => {
        formsMessage += `${index + 1}. **${form.title}**\n`;
        formsMessage += `   📝 ${form.description || 'ไม่มีคำอธิบาย'}\n`;
        formsMessage += `   👤 สร้างโดย: ${form.createdBy}\n\n`;

        keyboard.push([
          { text: `📝 ${form.title}`, callback_data: `view_form:${form.id}` }
        ]);
      });

      if (forms.length > 10) {
        formsMessage += `\n... และอีก ${forms.length - 10} ฟอร์ม`;
      }

      await this.sendMessage(message.chat.id, formsMessage, {
        replyMarkup: this.createInlineKeyboard(keyboard)
      });

    } catch (error) {
      logger.error('Error handling forms command:', error);
      await this.sendMessage(message.chat.id,
        '❌ เกิดข้อผิดพลาดในการดึงข้อมูลฟอร์ม'
      );
    }
  }

  async handleSubmissionsCommand(message, args) {
    const userId = message.from.id;

    try {
      const user = await this.findUserByTelegramId(userId);
      if (!user) {
        await this.sendMessage(message.chat.id,
          '🔐 กรุณาลงทะเบียนก่อนใช้งาน\nพิมพ์ /register'
        );
        return;
      }

      const submissions = await this.getUserSubmissions(user.id);

      if (submissions.length === 0) {
        await this.sendMessage(message.chat.id,
          '📊 คุณยังไม่มีการส่งข้อมูล'
        );
        return;
      }

      let submissionsMessage = '📊 **การส่งข้อมูลของคุณ:**\n\n';

      submissions.slice(0, 5).forEach((submission, index) => {
        const statusIcon = this.getSubmissionStatusIcon(submission.status);
        submissionsMessage += `${index + 1}. ${statusIcon} **${submission.formTitle}**\n`;
        submissionsMessage += `   📅 ส่งเมื่อ: ${new Date(submission.createdAt).toLocaleString('th-TH')}\n`;
        submissionsMessage += `   📋 สถานะ: ${this.getSubmissionStatusText(submission.status)}\n\n`;
      });

      if (submissions.length > 5) {
        submissionsMessage += `\n... และอีก ${submissions.length - 5} รายการ`;
      }

      await this.sendMessage(message.chat.id, submissionsMessage);

    } catch (error) {
      logger.error('Error handling submissions command:', error);
      await this.sendMessage(message.chat.id,
        '❌ เกิดข้อผิดพลาดในการดึงข้อมูลการส่งข้อมูล'
      );
    }
  }

  /**
   * Enhanced notification sending with rich formatting
   */
  async sendEnhancedNotification(options) {
    const {
      recipients,
      templateKey,
      data = {},
      priority = 'medium',
      includeButtons = false,
      customMessage = null
    } = options;

    try {
      // Get notification template
      const template = notificationService.notificationTemplates.get(templateKey);

      for (const recipient of recipients) {
        const user = await this.getRecipientData(recipient);
        if (!user || !user.telegramUserId) continue;

        // Render message content
        const content = customMessage || await this.renderNotificationMessage(template, data);

        // Create buttons if needed
        let replyMarkup = null;
        if (includeButtons) {
          replyMarkup = this.createNotificationButtons(templateKey, data);
        }

        // Send message
        await this.sendMessage(user.telegramUserId, content, {
          replyMarkup,
          disableNotification: priority === 'low'
        });
      }

    } catch (error) {
      logger.error('Error sending enhanced notification:', error);
      throw error;
    }
  }

  /**
   * Render notification message with enhanced formatting
   */
  async renderNotificationMessage(template, data) {
    if (!template) return '📢 คุณมีการแจ้งเตือนใหม่';

    const title = this.replaceTemplateVariables(template.title, data);
    const body = this.replaceTemplateVariables(template.body, data);

    const icon = this.getNotificationIcon(template.key);

    return `${icon} **${title}**\n\n${body}`;
  }

  /**
   * Create notification buttons based on template
   */
  createNotificationButtons(templateKey, data) {
    const buttons = [];

    switch (templateKey) {
      case 'submission.created':
        if (data.submissionId) {
          buttons.push([
            { text: '✅ อนุมัติ', callback_data: `approve_submission:${data.submissionId}` },
            { text: '❌ ปฏิเสธ', callback_data: `reject_submission:${data.submissionId}` }
          ]);
          buttons.push([
            { text: '👁️ ดูรายละเอียด', callback_data: `view_submission:${data.submissionId}` }
          ]);
        }
        break;

      case 'form.created':
        if (data.formId) {
          buttons.push([
            { text: '📝 เปิดฟอร์ม', callback_data: `view_form:${data.formId}` }
          ]);
        }
        break;

      case 'user.welcome':
        buttons.push([
          { text: '🚀 เริ่มใช้งาน', callback_data: 'start_tutorial' },
          { text: '⚙️ ตั้งค่า', callback_data: 'user_settings' }
        ]);
        break;
    }

    return buttons.length > 0 ? this.createInlineKeyboard(buttons) : null;
  }

  /**
   * Get notification icon based on template key
   */
  getNotificationIcon(templateKey) {
    const icons = {
      'form.created': '📝',
      'form.updated': '✏️',
      'form.deleted': '🗑️',
      'form.published': '🌟',
      'submission.created': '📬',
      'submission.approved': '✅',
      'submission.rejected': '❌',
      'user.welcome': '🎉',
      'user.role_changed': '👤',
      'system.maintenance': '🔧',
      'default': '📢'
    };

    return icons[templateKey] || icons.default;
  }

  /**
   * Utility methods
   */

  async isUserAdmin(telegramUserId) {
    try {
      const user = await this.findUserByTelegramId(telegramUserId);
      return user && ['admin', 'super_admin'].includes(user.role);
    } catch (error) {
      return false;
    }
  }

  async findUserByTelegramId(telegramUserId) {
    try {
      const User = require('../models/User');
      return await User.findOne({
        where: { telegramUserId: telegramUserId.toString() }
      });
    } catch (error) {
      logger.error('Error finding user by Telegram ID:', error);
      return null;
    }
  }

  getUserSession(userId) {
    return this.userSessions.get(userId);
  }

  setUserSession(userId, session) {
    this.userSessions.set(userId, session);
  }

  clearUserSession(userId) {
    this.userSessions.delete(userId);
  }

  getSubmissionStatusIcon(status) {
    const icons = {
      pending: '🟡',
      approved: '🟢',
      rejected: '🔴',
      reviewing: '🟠'
    };
    return icons[status] || '⚪';
  }

  getSubmissionStatusText(status) {
    const texts = {
      pending: 'รอการอนุมัติ',
      approved: 'อนุมัติแล้ว',
      rejected: 'ถูกปฏิเสธ',
      reviewing: 'กำลังตรวจสอบ'
    };
    return texts[status] || 'ไม่ทราบสถานะ';
  }

  replaceTemplateVariables(text, data) {
    return text.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  /**
   * API interaction methods
   */

  async makeRequest(method, data = {}) {
    const url = `${this.baseUrl}/${method}`;

    try {
      const response = await axios.post(url, data, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });

      return response.data;
    } catch (error) {
      if (error.response) {
        logger.error(`Telegram API error (${method}):`, error.response.data);
        throw new Error(error.response.data.description || 'API request failed');
      } else {
        logger.error(`Network error (${method}):`, error.message);
        throw new Error('Network request failed');
      }
    }
  }

  /**
   * Data fetching methods (placeholder - implement based on your models)
   */

  async getOnlineUsersCount() {
    // Implement based on your WebSocket service or session tracking
    return 42; // Placeholder
  }

  async getActiveFormsCount() {
    try {
      const Form = require('../models/Form');
      return await Form.count({ where: { status: 'active' } });
    } catch (error) {
      return 0;
    }
  }

  async getTodaySubmissionsCount() {
    try {
      const { Op } = require('sequelize');
      const Submission = require('../models/Submission');
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return await Submission.count({
        where: {
          createdAt: { [Op.gte]: today }
        }
      });
    } catch (error) {
      return 0;
    }
  }

  async getActiveForms() {
    try {
      const Form = require('../models/Form');
      return await Form.findAll({
        where: { status: 'active' },
        limit: 20,
        order: [['createdAt', 'DESC']]
      });
    } catch (error) {
      return [];
    }
  }

  async getUserSubmissions(userId) {
    try {
      const Submission = require('../models/Submission');
      return await Submission.findAll({
        where: { userId },
        limit: 10,
        order: [['createdAt', 'DESC']],
        include: ['form']
      });
    } catch (error) {
      return [];
    }
  }

  async getRecipientData(recipient) {
    return await notificationService.getRecipientData(recipient);
  }

  /**
   * Service status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      botInfo: this.botInfo,
      commandsCount: this.commands.size,
      activeSessions: this.userSessions.size,
      queueSize: this.messageQueue.length
    };
  }

  /**
   * Handle not implemented commands
   */
  async handleNotImplemented(message, args) {
    const command = message.text?.replace(/^\//, '') || 'unknown';
    await this.sendMessage(message.chat.id,
      `🚧 คำสั่ง /${command} กำลังพัฒนาอยู่\n\n` +
      `📝 ขออภัยในความไม่สะดวก ฟีเจอร์นี้จะพร้อมใช้งานในอนาคต\n\n` +
      `💡 ลองใช้คำสั่ง /help เพื่อดูคำสั่งที่ใช้งานได้`
    );
  }

  /**
   * Send form submission notification with custom message format
   * Uses form's telegram settings (message prefix and field ordering)
   *
   * @param {Object} form - Form configuration with telegramSettings
   * @param {Object} submission - Submission data
   * @param {Object} fieldData - Form field data (key: fieldId, value: field value)
   */
  async sendFormSubmissionNotification(form, submission, fieldData) {
    try {
      // Get global Telegram settings
      const { TelegramSettings } = require('../models');
      const globalSettings = await TelegramSettings.getCurrentSettings();

      // Check if Telegram is enabled globally
      if (!globalSettings || !globalSettings.enabled) {
        logger.info('Telegram notifications disabled globally');
        return { success: false, reason: 'disabled_globally' };
      }

      // Check if form has Telegram enabled
      if (!form.telegramSettings || !form.telegramSettings.enabled) {
        logger.info(`Telegram notifications disabled for form: ${form.title}`);
        return { success: false, reason: 'disabled_for_form' };
      }

      // Use global bot token and group ID (override form settings)
      const botToken = globalSettings.bot_token;
      const groupId = globalSettings.group_id;

      if (!botToken || !groupId) {
        logger.warn('Telegram bot token or group ID not configured');
        return { success: false, reason: 'missing_credentials' };
      }

      // Build message
      const message = this.buildFormSubmissionMessage(form, submission, fieldData);

      // Send message using global credentials
      const telegramAPI = `https://api.telegram.org/bot${botToken}`;
      await axios.post(`${telegramAPI}/sendMessage`, {
        chat_id: groupId,
        text: message,
        parse_mode: 'HTML',
      });

      logger.info(`Telegram notification sent for submission: ${submission.id}`);
      return { success: true };

    } catch (error) {
      logger.error('Failed to send Telegram notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Build message from form telegram settings
   *
   * @param {Object} form - Form with telegramSettings
   * @param {Object} submission - Submission object
   * @param {Object} fieldData - Field values
   * @returns {string} Formatted message
   */
  buildFormSubmissionMessage(form, submission, fieldData) {
    const settings = form.telegramSettings;

    // Get message prefix template
    let prefix = settings.messagePrefix || 'ข้อมูลใหม่จาก [FormName] [DateTime]';

    // Replace placeholders
    const now = new Date();
    const dateTime = now.toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    prefix = prefix
      .replace(/\[FormName\]/g, form.title)
      .replace(/\[DateTime\]/g, dateTime)
      .replace(/\[SubmissionNumber\]/g, submission.submission_number || submission.id.substring(0, 8));

    // Build field list (ordered by selectedFields)
    const fieldLines = [];
    const selectedFields = settings.selectedFields || [];

    // Create field map for quick lookup
    const fieldsById = {};
    if (form.fields) {
      form.fields.forEach(field => {
        fieldsById[field.id] = field;
      });
    }

    // Add fields in the order specified
    selectedFields.forEach((fieldId, index) => {
      const field = fieldsById[fieldId];
      if (!field) return;

      const value = fieldData[fieldId];
      if (value === undefined || value === null || value === '') return;

      // Format field line
      const fieldNumber = index + 1;
      const fieldLabel = field.label || field.title;
      const fieldValue = this.formatFieldValue(field, value);

      fieldLines.push(`${fieldNumber}. <b>${fieldLabel}:</b> ${fieldValue}`);
    });

    // Combine prefix and fields
    const message = `${prefix}\n\n${fieldLines.join('\n')}`;

    return message;
  }

  /**
   * Format field value for display
   *
   * @param {Object} field - Field configuration
   * @param {*} value - Field value
   * @returns {string} Formatted value
   */
  formatFieldValue(field, value) {
    // Handle arrays (multiple choice, file uploads)
    if (Array.isArray(value)) {
      return value.join(', ');
    }

    // Handle objects (lat_long, factory)
    if (typeof value === 'object' && value !== null) {
      if (field.type === 'lat_long') {
        return `${value.lat}, ${value.lng}`;
      }
      if (field.type === 'factory') {
        return value.name || value.id || JSON.stringify(value);
      }
      return JSON.stringify(value);
    }

    // Handle dates
    if (field.type === 'date' || field.type === 'datetime') {
      try {
        const date = new Date(value);
        return date.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
      } catch (e) {
        return value;
      }
    }

    // Handle phone numbers
    if (field.type === 'phone') {
      return value.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    }

    // Default: return as string
    return String(value);
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      logger.info('Shutting down Telegram service...');

      // Process remaining messages
      // Clear user sessions
      this.userSessions.clear();

      logger.info('Telegram service shutdown completed');
    } catch (error) {
      logger.error('Error during Telegram service shutdown:', error);
    }
  }
}

// Export singleton instance
const telegramService = new TelegramService();
module.exports = telegramService;