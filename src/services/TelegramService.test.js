/**
 * TelegramService.test.js - Unit Tests for Telegram Notification Service
 *
 * Test coverage:
 * - Message formatting and field ordering
 * - Settings validation
 * - Error handling
 * - Field value formatting
 * - Message building logic
 */

import { TelegramService } from './TelegramService.js';

// Mock fetch for testing
global.fetch = jest.fn();

describe('TelegramService', () => {
  let telegramService;

  beforeEach(() => {
    telegramService = new TelegramService();
    fetch.mockClear();
  });

  describe('Settings Validation', () => {
    test('should validate correct telegram settings', () => {
      const settings = {
        enabled: true,
        botToken: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
        groupId: '-1001234567890'
      };

      const result = telegramService.validateTelegramSettings(settings);
      expect(result.isValid).toBe(true);
    });

    test('should reject invalid bot token', () => {
      const settings = {
        enabled: true,
        botToken: 'invalid-token',
        groupId: '-1001234567890'
      };

      const result = telegramService.validateTelegramSettings(settings);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid bot token format');
    });

    test('should reject invalid group ID', () => {
      const settings = {
        enabled: true,
        botToken: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
        groupId: 'invalid-group-id'
      };

      const result = telegramService.validateTelegramSettings(settings);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid chat ID format');
    });
  });

  describe('Field Ordering and Filtering', () => {
    test('should get telegram-enabled fields sorted by order', () => {
      const form = {
        fields: [
          {
            id: 'field1',
            title: 'Field 1',
            sendTelegram: true,
            telegramOrder: 3
          },
          {
            id: 'field2',
            title: 'Field 2',
            sendTelegram: false,
            telegramOrder: 1
          },
          {
            id: 'field3',
            title: 'Field 3',
            sendTelegram: true,
            telegramOrder: 1
          },
          {
            id: 'field4',
            title: 'Field 4',
            sendTelegram: true,
            telegramOrder: 2
          }
        ]
      };

      const telegramFields = telegramService.getTelegramEnabledFields(form);

      expect(telegramFields).toHaveLength(3);
      expect(telegramFields[0].id).toBe('field3'); // order 1
      expect(telegramFields[1].id).toBe('field4'); // order 2
      expect(telegramFields[2].id).toBe('field1'); // order 3
    });

    test('should handle fields with no telegram order', () => {
      const form = {
        fields: [
          {
            id: 'field1',
            title: 'Field 1',
            sendTelegram: true
            // No telegramOrder property
          },
          {
            id: 'field2',
            title: 'Field 2',
            sendTelegram: true,
            telegramOrder: 1
          }
        ]
      };

      const telegramFields = telegramService.getTelegramEnabledFields(form);

      expect(telegramFields).toHaveLength(2);
      expect(telegramFields[0].id).toBe('field1'); // order 0 (default)
      expect(telegramFields[1].id).toBe('field2'); // order 1
    });
  });

  describe('Value Formatting', () => {
    test('should format phone numbers correctly', () => {
      const result = telegramService.formatValueForTelegram('0812345678', 'phone');
      expect(result).toBe('081-234-5678');
    });

    test('should format dates correctly', () => {
      const result = telegramService.formatValueForTelegram('2023-09-29', 'date');
      expect(result).toBe('29/09/2023');
    });

    test('should format ratings with stars', () => {
      const result = telegramService.formatValueForTelegram(4, 'rating');
      expect(result).toBe('4/5 ⭐⭐⭐⭐');
    });

    test('should format lat/lng coordinates', () => {
      const value = { lat: 13.7563, lng: 100.5018 };
      const result = telegramService.formatValueForTelegram(value, 'lat_long');
      expect(result).toBe('13.7563, 100.5018');
    });

    test('should format multiple choice arrays', () => {
      const value = ['Option 1', 'Option 2', 'Option 3'];
      const result = telegramService.formatValueForTelegram(value, 'multiple_choice');
      expect(result).toBe('Option 1, Option 2, Option 3');
    });

    test('should handle empty values', () => {
      expect(telegramService.formatValueForTelegram('', 'short_answer')).toBe('-');
      expect(telegramService.formatValueForTelegram(null, 'short_answer')).toBe('-');
      expect(telegramService.formatValueForTelegram(undefined, 'short_answer')).toBe('-');
      expect(telegramService.formatValueForTelegram([], 'multiple_choice')).toBe('-');
    });
  });

  describe('Message Building', () => {
    test('should build complete telegram message with custom prefixes', () => {
      const form = {
        title: 'Test Form',
        fields: [
          {
            id: 'name',
            title: 'ชื่อ',
            sendTelegram: true,
            telegramPrefix: '📝 ข้อมูลลูกค้าใหม่',
            telegramOrder: 1
          },
          {
            id: 'phone',
            title: 'เบอร์โทร',
            sendTelegram: true,
            telegramPrefix: '📱 ข้อมูลติดต่อ',
            telegramOrder: 2
          },
          {
            id: 'email',
            title: 'อีเมล',
            sendTelegram: false, // Should be excluded
            telegramOrder: 3
          }
        ]
      };

      const submission = {
        id: 'sub-123',
        data: {
          name: 'John Doe',
          phone: '0812345678',
          email: 'john@example.com'
        },
        submittedAt: '2023-09-29T10:30:00.000Z'
      };

      const message = telegramService.buildTelegramMessage(form, submission);

      expect(message).toContain('📋 *Test Form*');
      expect(message).toContain('📝 ข้อมูลลูกค้าใหม่');
      expect(message).toContain('*ชื่อ:* John Doe');
      expect(message).toContain('📱 ข้อมูลติดต่อ');
      expect(message).toContain('*เบอร์โทร:* 081-234-5678');
      expect(message).not.toContain('อีเมล'); // Should be excluded
      expect(message).toContain('⏰'); // Timestamp
    });

    test('should return empty string when no telegram fields', () => {
      const form = {
        title: 'Test Form',
        fields: [
          {
            id: 'name',
            title: 'ชื่อ',
            sendTelegram: false
          }
        ]
      };

      const submission = {
        data: { name: 'John Doe' },
        submittedAt: '2023-09-29T10:30:00.000Z'
      };

      const message = telegramService.buildTelegramMessage(form, submission);
      expect(message).toBe('');
    });

    test('should skip empty values in message', () => {
      const form = {
        title: 'Test Form',
        fields: [
          {
            id: 'name',
            title: 'ชื่อ',
            sendTelegram: true,
            telegramOrder: 1
          },
          {
            id: 'phone',
            title: 'เบอร์โทร',
            sendTelegram: true,
            telegramOrder: 2
          }
        ]
      };

      const submission = {
        data: {
          name: 'John Doe',
          phone: '' // Empty value should be skipped
        },
        submittedAt: '2023-09-29T10:30:00.000Z'
      };

      const message = telegramService.buildTelegramMessage(form, submission);

      expect(message).toContain('*ชื่อ:* John Doe');
      expect(message).not.toContain('เบอร์โทร'); // Should be skipped
    });

    test('should include document number when available', () => {
      const form = {
        title: 'Test Form',
        fields: [
          {
            id: 'name',
            title: 'ชื่อ',
            sendTelegram: true,
            telegramOrder: 1
          }
        ]
      };

      const submission = {
        data: {
          name: 'John Doe',
          documentNumber: 'DOC-2023-001'
        },
        submittedAt: '2023-09-29T10:30:00.000Z'
      };

      const message = telegramService.buildTelegramMessage(form, submission);

      expect(message).toContain('📄 เลขที่เอกสาร: DOC-2023-001');
    });
  });

  describe('Error Handling', () => {
    test('should return user-friendly error for unauthorized', () => {
      const error = new Error('401 Unauthorized');
      const message = telegramService.getUserFriendlyErrorMessage(error);
      expect(message).toContain('Bot token ไม่ถูกต้อง');
    });

    test('should return user-friendly error for chat not found', () => {
      const error = new Error('400 Bad Request: chat not found');
      const message = telegramService.getUserFriendlyErrorMessage(error);
      expect(message).toContain('ไม่พบ Group/Chat');
    });

    test('should return user-friendly error for network issues', () => {
      const error = new Error('Network request failed');
      const message = telegramService.getUserFriendlyErrorMessage(error);
      expect(message).toContain('ปัญหาในการเชื่อมต่อเครือข่าย');
    });

    test('should return user-friendly error for rate limiting', () => {
      const error = new Error('429 Too Many Requests');
      const message = telegramService.getUserFriendlyErrorMessage(error);
      expect(message).toContain('ส่งข้อความเร็วเกินไป');
    });
  });

  describe('Message Length Handling', () => {
    test('should truncate very long messages', () => {
      const form = {
        title: 'Test Form',
        fields: [
          {
            id: 'long_text',
            title: 'Long Text',
            sendTelegram: true,
            telegramOrder: 1
          }
        ]
      };

      const longText = 'A'.repeat(5000); // Very long text
      const submission = {
        data: { long_text: longText },
        submittedAt: '2023-09-29T10:30:00.000Z'
      };

      const message = telegramService.buildTelegramMessage(form, submission);

      expect(message.length).toBeLessThanOrEqual(telegramService.MAX_MESSAGE_LENGTH);
      expect(message).toContain('ข้อความถูกตัดเนื่องจากยาวเกินไป');
    });
  });

  describe('API Communication', () => {
    test('should send message successfully', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          ok: true,
          result: {
            message_id: 123,
            date: 1632904200
          }
        })
      };

      fetch.mockResolvedValueOnce(mockResponse);

      const result = await telegramService.sendTelegramMessage(
        '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
        '-1001234567890',
        'Test message'
      );

      expect(fetch).toHaveBeenCalledWith(
        'https://api.telegram.org/bot123456789:ABCdefGHIjklMNOpqrsTUVwxyz/sendMessage',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: '-1001234567890',
            text: 'Test message',
            parse_mode: 'Markdown',
            disable_web_page_preview: true
          })
        })
      );

      expect(result.message_id).toBe(123);
    });

    test('should handle API errors', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          ok: false,
          description: 'Unauthorized'
        })
      };

      fetch.mockResolvedValueOnce(mockResponse);

      await expect(
        telegramService.sendTelegramMessage(
          'invalid-token',
          '-1001234567890',
          'Test message'
        )
      ).rejects.toThrow('Telegram API error: Unauthorized');
    });
  });

  describe('Utility Functions', () => {
    test('should correctly identify empty values', () => {
      expect(telegramService.isEmptyValue(null)).toBe(true);
      expect(telegramService.isEmptyValue(undefined)).toBe(true);
      expect(telegramService.isEmptyValue('')).toBe(true);
      expect(telegramService.isEmptyValue([])).toBe(true);
      expect(telegramService.isEmptyValue({})).toBe(true);
      expect(telegramService.isEmptyValue('text')).toBe(false);
      expect(telegramService.isEmptyValue(0)).toBe(false);
      expect(telegramService.isEmptyValue(['item'])).toBe(false);
      expect(telegramService.isEmptyValue({ key: 'value' })).toBe(false);
    });

    test('should provide default settings', () => {
      const defaults = telegramService.getDefaultSettings();
      expect(defaults).toEqual({
        enabled: false,
        botToken: '',
        groupId: '',
        enableTestMessages: true,
        notifyOnError: true,
        messageFormat: 'standard'
      });
    });
  });
});

// Integration test example
describe('TelegramService Integration', () => {
  let telegramService;

  beforeEach(() => {
    telegramService = new TelegramService();
  });

  test('should handle complete form submission workflow', async () => {
    const form = {
      id: 'test-form',
      title: 'แบบฟอร์มทดสอบ',
      fields: [
        {
          id: 'name',
          title: 'ชื่อ-สกุล',
          type: 'short_answer',
          sendTelegram: true,
          telegramPrefix: '👤 ข้อมูลผู้ใช้งาน',
          telegramOrder: 1
        },
        {
          id: 'phone',
          title: 'เบอร์โทรศัพท์',
          type: 'phone',
          sendTelegram: true,
          telegramPrefix: '📞 ข้อมูลการติดต่อ',
          telegramOrder: 2
        }
      ]
    };

    const submission = {
      id: 'sub-test-123',
      formId: 'test-form',
      data: {
        name: 'นาย ทดสอบ ระบบ',
        phone: '0987654321',
        documentNumber: 'TEST-2023-001'
      },
      submittedAt: '2023-09-29T15:30:00.000Z'
    };

    const telegramSettings = {
      enabled: true,
      botToken: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
      groupId: '-1001234567890'
    };

    // Mock successful API response
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        ok: true,
        result: { message_id: 456 }
      })
    };
    fetch.mockResolvedValueOnce(mockResponse);

    const result = await telegramService.sendFormSubmissionNotification(
      form,
      submission,
      telegramSettings
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toBe(456);
    expect(fetch).toHaveBeenCalledTimes(1);

    // Verify the message content
    const callArgs = fetch.mock.calls[0];
    const requestBody = JSON.parse(callArgs[1].body);
    const message = requestBody.text;

    expect(message).toContain('แบบฟอร์มทดสอบ');
    expect(message).toContain('👤 ข้อมูลผู้ใช้งาน');
    expect(message).toContain('นาย ทดสอบ ระบบ');
    expect(message).toContain('📞 ข้อมูลการติดต่อ');
    expect(message).toContain('098-765-4321');
    expect(message).toContain('TEST-2023-001');
  });
});