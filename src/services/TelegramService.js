/**
 * TelegramService.js - Telegram Notification Service for Q-Collector
 *
 * Features:
 * - Send formatted form submission notifications to Telegram
 * - Custom field ordering and prefix messages
 * - Comprehensive error handling and retry logic
 * - Message formatting with Thai language support
 * - Rate limiting and API error management
 * - Secure bot token handling
 */

class TelegramService {
  constructor() {
    this.TELEGRAM_API_BASE = 'https://api.telegram.org/bot';
    this.MAX_MESSAGE_LENGTH = 4096; // Telegram message limit
    this.RETRY_ATTEMPTS = 3;
    this.RETRY_DELAY_MS = 1000; // 1 second base delay
    this.RATE_LIMIT_DELAY_MS = 1000; // 1 second between requests

    this.lastRequestTime = 0;

    // Field type to Thai display name mapping
    this.FIELD_TYPE_NAMES = {
      'short_answer': 'คำตอบสั้น',
      'paragraph': 'คำตอบยาว',
      'email': 'อีเมล',
      'phone': 'เบอร์โทรศัพท์',
      'number': 'ตัวเลข',
      'url': 'ลิงก์',
      'file_upload': 'ไฟล์แนบ',
      'image_upload': 'รูปภาพ',
      'date': 'วันที่',
      'time': 'เวลา',
      'datetime': 'วันที่และเวลา',
      'multiple_choice': 'ตัวเลือก',
      'rating': 'คะแนน',
      'slider': 'แถบเลื่อน',
      'lat_long': 'พิกัด GPS',
      'province': 'จังหวัด',
      'factory': 'โรงงาน'
    };
  }

  // ========== MAIN NOTIFICATION METHODS ==========

  /**
   * Send form submission notification to Telegram
   * @param {Object} form - Form configuration
   * @param {Object} submission - Submission data
   * @param {Object} telegramSettings - Telegram bot settings
   * @returns {Promise<Object>} Send result
   */
  async sendFormSubmissionNotification(form, submission, telegramSettings) {
    try {
      // Validate telegram settings
      const validationResult = this.validateTelegramSettings(telegramSettings);
      if (!validationResult.isValid) {
        throw new Error(`Invalid telegram settings: ${validationResult.error}`);
      }

      // Build message from telegram-enabled fields
      const message = this.buildTelegramMessage(form, submission);

      if (!message.trim()) {
        console.log('No telegram-enabled fields found, skipping notification');
        return { success: true, skipped: true, reason: 'No telegram fields configured' };
      }

      // Send message with retry logic
      const result = await this.sendMessageWithRetry(
        telegramSettings.botToken,
        telegramSettings.groupId,
        message
      );

      // Log successful notification
      console.log('Telegram notification sent successfully:', {
        formId: form.id,
        submissionId: submission.id,
        messageLength: message.length,
        chatId: telegramSettings.groupId
      });

      return {
        success: true,
        messageId: result.message_id,
        messageLength: message.length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Telegram notification failed:', {
        error: error.message,
        formId: form?.id,
        submissionId: submission?.id,
        chatId: telegramSettings?.groupId
      });

      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test telegram configuration by sending a test message
   * @param {Object} telegramSettings - Telegram settings to test
   * @returns {Promise<Object>} Test result
   */
  async testTelegramConfiguration(telegramSettings) {
    try {
      const validationResult = this.validateTelegramSettings(telegramSettings);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: validationResult.error
        };
      }

      const testMessage = `✅ *การทดสอบการแจ้งเตือน Telegram*\n\n` +
        `🔧 Q-Collector Form Builder\n` +
        `📱 Bot Token: ใช้งานได้\n` +
        `💬 Chat ID: ${telegramSettings.groupId}\n` +
        `⏰ ${new Date().toLocaleString('th-TH')}\n\n` +
        `การตั้งค่า Telegram ของคุณทำงานถูกต้อง!`;

      const result = await this.sendMessageWithRetry(
        telegramSettings.botToken,
        telegramSettings.groupId,
        testMessage
      );

      return {
        success: true,
        messageId: result.message_id,
        message: 'Test message sent successfully'
      };

    } catch (error) {
      return {
        success: false,
        error: `Test failed: ${error.message}`
      };
    }
  }

  // ========== MESSAGE BUILDING ==========

  /**
   * Build formatted telegram message from form submission
   * @param {Object} form - Form configuration
   * @param {Object} submission - Submission data
   * @returns {string} Formatted message
   */
  buildTelegramMessage(form, submission) {
    // Get telegram-enabled fields sorted by telegramOrder
    const telegramFields = this.getTelegramEnabledFields(form);

    if (telegramFields.length === 0) {
      return '';
    }

    let message = '';

    // Build message from ordered fields
    telegramFields.forEach((field, index) => {
      const value = submission.data[field.id];

      // Skip empty values
      if (this.isEmptyValue(value)) {
        return;
      }

      // Add custom prefix if specified
      if (field.telegramPrefix && field.telegramPrefix.trim()) {
        if (index > 0) message += '\n'; // Add spacing between sections
        message += `${field.telegramPrefix.trim()}\n`;
      }

      // Add field name and value
      const fieldName = field.title || this.FIELD_TYPE_NAMES[field.type] || 'ข้อมูล';
      const formattedValue = this.formatValueForTelegram(value, field.type);

      message += `*${fieldName}:* ${formattedValue}\n`;
    });

    // Add form metadata
    if (message.trim()) {
      const formTitle = form.title || 'ฟอร์มใหม่';
      const timestamp = new Date(submission.submittedAt).toLocaleString('th-TH');

      // Add document number if available
      let header = `📋 *${formTitle}*\n`;
      if (submission.data.documentNumber) {
        header += `📄 เลขที่เอกสาร: ${submission.data.documentNumber}\n`;
      }
      header += `\n`;

      // Add footer
      const footer = `\n⏰ ${timestamp}`;

      message = header + message + footer;
    }

    // Truncate if too long
    if (message.length > this.MAX_MESSAGE_LENGTH) {
      const truncated = message.substring(0, this.MAX_MESSAGE_LENGTH - 50);
      message = truncated + '\n\n... (ข้อความถูกตัดเนื่องจากยาวเกินไป)';
    }

    return message;
  }

  /**
   * Get telegram-enabled fields sorted by telegram order
   * @param {Object} form - Form configuration
   * @returns {Array} Sorted telegram fields
   */
  getTelegramEnabledFields(form) {
    return form.fields
      .filter(field => field.sendTelegram === true)
      .sort((a, b) => {
        // Sort by telegramOrder, then by field creation order
        const orderA = a.telegramOrder || 0;
        const orderB = b.telegramOrder || 0;

        if (orderA !== orderB) {
          return orderA - orderB;
        }

        // If same order, maintain original field order
        return 0;
      });
  }

  /**
   * Format field value for telegram display
   * @param {*} value - Field value
   * @param {string} fieldType - Field type
   * @returns {string} Formatted value
   */
  formatValueForTelegram(value, fieldType) {
    if (this.isEmptyValue(value)) {
      return '-';
    }

    try {
      switch (fieldType) {
        case 'date':
          const date = new Date(value);
          if (isNaN(date.getTime())) return 'วันที่ไม่ถูกต้อง';
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;

        case 'time':
          return value.toString();

        case 'datetime':
          const datetime = new Date(value);
          if (isNaN(datetime.getTime())) return 'วันที่เวลาไม่ถูกต้อง';
          return datetime.toLocaleString('th-TH');

        case 'phone':
          // Format phone number as XXX-XXX-XXXX
          const digits = value.toString().replace(/\D/g, '');
          if (digits.length === 10) {
            return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
          }
          return value.toString();

        case 'lat_long':
          if (typeof value === 'object' && value.lat && value.lng) {
            return `${value.lat}, ${value.lng}`;
          }
          return value.toString();

        case 'multiple_choice':
          if (Array.isArray(value)) {
            return value.join(', ');
          }
          return value.toString();

        case 'rating':
          const rating = parseInt(value);
          if (!isNaN(rating)) {
            const stars = '⭐'.repeat(Math.max(0, Math.min(5, rating)));
            return `${rating}/5 ${stars}`;
          }
          return value.toString();

        case 'slider':
          return `${value}`;

        case 'file_upload':
        case 'image_upload':
          if (typeof value === 'object') {
            return value.fileName || value.name || 'ไฟล์ที่แนบ';
          }
          return 'ไฟล์ที่แนบ';

        case 'number':
          const num = parseFloat(value);
          if (!isNaN(num)) {
            return num.toLocaleString('th-TH');
          }
          return value.toString();

        case 'email':
        case 'url':
        case 'short_answer':
        case 'paragraph':
        case 'province':
        case 'factory':
        default:
          return value.toString();
      }
    } catch (error) {
      console.error('Error formatting value for telegram:', error);
      return value.toString();
    }
  }

  // ========== API COMMUNICATION ==========

  /**
   * Send message to Telegram with retry logic
   * @param {string} botToken - Bot token
   * @param {string} chatId - Chat ID
   * @param {string} message - Message text
   * @returns {Promise<Object>} API response
   */
  async sendMessageWithRetry(botToken, chatId, message) {
    let lastError;

    for (let attempt = 1; attempt <= this.RETRY_ATTEMPTS; attempt++) {
      try {
        // Rate limiting
        await this.enforceRateLimit();

        const result = await this.sendTelegramMessage(botToken, chatId, message);
        return result;

      } catch (error) {
        lastError = error;

        // Don't retry on authentication errors
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          throw new Error('Invalid bot token or insufficient permissions');
        }

        // Don't retry on chat not found errors
        if (error.message.includes('400') || error.message.includes('chat not found')) {
          throw new Error('Invalid chat ID or bot not added to group');
        }

        // Log retry attempt
        if (attempt < this.RETRY_ATTEMPTS) {
          console.log(`Telegram send attempt ${attempt} failed, retrying in ${this.RETRY_DELAY_MS * attempt}ms:`, error.message);
          await this.sleep(this.RETRY_DELAY_MS * attempt);
        }
      }
    }

    throw new Error(`Failed to send telegram message after ${this.RETRY_ATTEMPTS} attempts: ${lastError.message}`);
  }

  /**
   * Send message to Telegram API
   * @param {string} botToken - Bot token
   * @param {string} chatId - Chat ID
   * @param {string} message - Message text
   * @returns {Promise<Object>} API response
   */
  async sendTelegramMessage(botToken, chatId, message) {
    const url = `${this.TELEGRAM_API_BASE}${botToken}/sendMessage`;

    const payload = {
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    if (!response.ok) {
      const errorMessage = responseData.description || `HTTP ${response.status}`;
      throw new Error(`Telegram API error: ${errorMessage}`);
    }

    if (!responseData.ok) {
      throw new Error(`Telegram API error: ${responseData.description}`);
    }

    return responseData.result;
  }

  // ========== VALIDATION AND UTILITIES ==========

  /**
   * Validate telegram settings
   * @param {Object} settings - Telegram settings
   * @returns {Object} Validation result
   */
  validateTelegramSettings(settings) {
    if (!settings) {
      return { isValid: false, error: 'Telegram settings not provided' };
    }

    if (!settings.enabled) {
      return { isValid: false, error: 'Telegram notifications not enabled' };
    }

    if (!settings.botToken || typeof settings.botToken !== 'string') {
      return { isValid: false, error: 'Bot token is required' };
    }

    if (!settings.groupId || typeof settings.groupId !== 'string') {
      return { isValid: false, error: 'Group ID is required' };
    }

    // Basic bot token format validation
    if (!settings.botToken.includes(':')) {
      return { isValid: false, error: 'Invalid bot token format' };
    }

    // Basic chat ID validation (should be numeric or start with @)
    if (!settings.groupId.match(/^-?\d+$/) && !settings.groupId.startsWith('@')) {
      return { isValid: false, error: 'Invalid chat ID format' };
    }

    return { isValid: true };
  }

  /**
   * Check if value is empty
   * @param {*} value - Value to check
   * @returns {boolean} Is empty
   */
  isEmptyValue(value) {
    return value === null ||
           value === undefined ||
           value === '' ||
           (Array.isArray(value) && value.length === 0) ||
           (typeof value === 'object' && Object.keys(value).length === 0);
  }

  /**
   * Enforce rate limiting between API calls
   * @returns {Promise<void>}
   */
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY_MS) {
      const waitTime = this.RATE_LIMIT_DELAY_MS - timeSinceLastRequest;
      await this.sleep(waitTime);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ========== SETTINGS MANAGEMENT ==========

  /**
   * Get default telegram settings
   * @returns {Object} Default settings
   */
  getDefaultSettings() {
    return {
      enabled: false,
      botToken: '',
      groupId: '',
      enableTestMessages: true,
      notifyOnError: true,
      messageFormat: 'standard'
    };
  }

  /**
   * Merge settings with defaults
   * @param {Object} settings - User settings
   * @returns {Object} Complete settings
   */
  mergeWithDefaults(settings) {
    return {
      ...this.getDefaultSettings(),
      ...settings
    };
  }

  // ========== ERROR HANDLING ==========

  /**
   * Get user-friendly error message
   * @param {Error} error - Error object
   * @returns {string} User-friendly message
   */
  getUserFriendlyErrorMessage(error) {
    const message = error.message.toLowerCase();

    if (message.includes('unauthorized') || message.includes('401')) {
      return 'Bot token ไม่ถูกต้อง หรือ Bot ไม่มีสิทธิ์ในการส่งข้อความ';
    }

    if (message.includes('chat not found') || message.includes('400')) {
      return 'ไม่พบ Group/Chat หรือ Bot ยังไม่ได้เพิ่มเข้า Group';
    }

    if (message.includes('network') || message.includes('fetch')) {
      return 'เกิดปัญหาในการเชื่อมต่อเครือข่าย กรุณาลองใหม่อีกครั้ง';
    }

    if (message.includes('rate limit') || message.includes('429')) {
      return 'ส่งข้อความเร็วเกินไป กรุณารอสักครู่แล้วลองใหม่';
    }

    if (message.includes('message too long')) {
      return 'ข้อความยาวเกินไป กรุณาลดจำนวนฟิลด์ที่แจ้งเตือน';
    }

    return `เกิดข้อผิดพลาด: ${error.message}`;
  }

  // ========== LOGGING AND DEBUGGING ==========

  /**
   * Log telegram activity for debugging
   * @param {string} level - Log level (info, warn, error)
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      service: 'TelegramService',
      message,
      ...data
    };

    console[level]('TelegramService:', logEntry);
  }
}

// Create singleton instance
const telegramService = new TelegramService();
export default telegramService;

// Export class for testing
export { TelegramService };