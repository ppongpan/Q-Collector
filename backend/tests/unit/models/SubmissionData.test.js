/**
 * SubmissionData Model Unit Tests
 * Test SubmissionData model with encryption functionality
 */

const { createMockSequelize } = require('../../mocks/database.mock');
const { TestDataGenerator } = require('../../helpers');

describe('SubmissionData Model', () => {
  let sequelize;
  let SubmissionData;
  let mockEncryption;

  beforeAll(() => {
    mockEncryption = {
      encrypt: jest.fn((text) => ({
        iv: TestDataGenerator.randomString(32),
        encryptedData: Buffer.from(text).toString('base64'),
        authTag: TestDataGenerator.randomString(32),
      })),
      decrypt: jest.fn((encrypted) => {
        return Buffer.from(encrypted.encryptedData, 'base64').toString('utf8');
      }),
    };

    jest.mock('../../../utils/encryption.util', () => mockEncryption);

    sequelize = createMockSequelize();
    const SubmissionDataModel = require('../../../models/SubmissionData');
    SubmissionData = SubmissionDataModel(sequelize, sequelize.Sequelize.DataTypes);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Model Definition', () => {
    it('should be defined', () => {
      expect(SubmissionData).toBeDefined();
      expect(SubmissionData.modelName).toBe('SubmissionData');
    });

    it('should have required fields', () => {
      const attributes = SubmissionData.attributes;
      expect(attributes).toHaveProperty('id');
      expect(attributes).toHaveProperty('submission_id');
      expect(attributes).toHaveProperty('field_id');
      expect(attributes).toHaveProperty('value_text');
      expect(attributes).toHaveProperty('value_encrypted');
      expect(attributes).toHaveProperty('value_type');
      expect(attributes).toHaveProperty('is_encrypted');
    });
  });

  describe('getDecryptedValue()', () => {
    it('should decrypt encrypted value', () => {
      const plainValue = 'Secret Data';
      const encrypted = mockEncryption.encrypt(plainValue);

      const data = SubmissionData.build({
        value_encrypted: JSON.stringify(encrypted),
        value_type: 'string',
        is_encrypted: true,
      });

      const decrypted = data.getDecryptedValue();

      expect(decrypted).toBe(plainValue);
      expect(mockEncryption.decrypt).toHaveBeenCalled();
    });

    it('should return plain text value if not encrypted', () => {
      const plainValue = 'Plain Data';

      const data = SubmissionData.build({
        value_text: plainValue,
        value_type: 'string',
        is_encrypted: false,
      });

      const value = data.getDecryptedValue();

      expect(value).toBe(plainValue);
    });

    it('should handle decryption errors', () => {
      mockEncryption.decrypt.mockImplementationOnce(() => {
        throw new Error('Decryption failed');
      });

      const data = SubmissionData.build({
        value_encrypted: JSON.stringify({ invalid: 'data' }),
        value_type: 'string',
        is_encrypted: true,
      });

      const value = data.getDecryptedValue();

      expect(value).toBeNull();
    });
  });

  describe('parseValue()', () => {
    it('should parse string value', () => {
      const data = SubmissionData.build({ value_type: 'string' });
      expect(data.parseValue('test')).toBe('test');
    });

    it('should parse number value', () => {
      const data = SubmissionData.build({ value_type: 'number' });
      expect(data.parseValue('123')).toBe(123);
      expect(data.parseValue('45.67')).toBe(45.67);
    });

    it('should parse boolean value', () => {
      const data = SubmissionData.build({ value_type: 'boolean' });
      expect(data.parseValue('true')).toBe(true);
      expect(data.parseValue('false')).toBe(false);
      expect(data.parseValue(true)).toBe(true);
    });

    it('should parse date value', () => {
      const data = SubmissionData.build({ value_type: 'date' });
      const dateString = '2025-09-30';
      const parsed = data.parseValue(dateString);
      expect(parsed instanceof Date).toBe(true);
    });

    it('should parse JSON value', () => {
      const data = SubmissionData.build({ value_type: 'json' });
      const json = JSON.stringify({ key: 'value' });
      const parsed = data.parseValue(json);
      expect(parsed).toEqual({ key: 'value' });
    });

    it('should handle null values', () => {
      const data = SubmissionData.build({ value_type: 'string' });
      expect(data.parseValue(null)).toBeNull();
      expect(data.parseValue(undefined)).toBeNull();
    });

    it('should handle invalid JSON gracefully', () => {
      const data = SubmissionData.build({ value_type: 'json' });
      const invalid = '{invalid json}';
      expect(data.parseValue(invalid)).toBe(invalid);
    });
  });

  describe('setValue()', () => {
    it('should set plain text value', () => {
      const data = SubmissionData.build({});
      data.setValue('Test Value', false);

      expect(data.value_text).toBe('Test Value');
      expect(data.is_encrypted).toBe(false);
    });

    it('should mark value for encryption', () => {
      const data = SubmissionData.build({});
      data.setValue('Sensitive Value', true);

      expect(data.shouldEncrypt).toBe(true);
      expect(data.value_text).toBe('Sensitive Value');
    });

    it('should convert objects to JSON', () => {
      const data = SubmissionData.build({});
      const obj = { key: 'value', nested: { foo: 'bar' } };
      data.setValue(obj, false);

      expect(data.value_text).toBe(JSON.stringify(obj));
    });

    it('should convert numbers to string', () => {
      const data = SubmissionData.build({});
      data.setValue(12345, false);

      expect(data.value_text).toBe('12345');
    });
  });

  describe('isSensitiveField()', () => {
    it('should identify sensitive field types', () => {
      const sensitiveTypes = ['email', 'phone', 'short_answer', 'paragraph'];

      sensitiveTypes.forEach(type => {
        const field = { type };
        expect(SubmissionData.isSensitiveField(field)).toBe(true);
      });
    });

    it('should identify non-sensitive field types', () => {
      const nonSensitiveTypes = ['number', 'date', 'multiple_choice', 'rating'];

      nonSensitiveTypes.forEach(type => {
        const field = { type };
        expect(SubmissionData.isSensitiveField(field)).toBe(false);
      });
    });
  });

  describe('createWithEncryption()', () => {
    it('should create with encryption for sensitive fields', async () => {
      const submissionId = TestDataGenerator.randomUUID();
      const fieldId = TestDataGenerator.randomUUID();
      const value = 'sensitive@email.com';
      const field = { type: 'email' };

      SubmissionData.build = jest.fn().mockReturnValue({
        setValue: jest.fn(),
        save: jest.fn().mockResolvedValue({}),
      });

      await SubmissionData.createWithEncryption(submissionId, fieldId, value, field);

      expect(SubmissionData.build).toHaveBeenCalledWith(
        expect.objectContaining({
          submission_id: submissionId,
          field_id: fieldId,
        })
      );
    });

    it('should create without encryption for non-sensitive fields', async () => {
      const submissionId = TestDataGenerator.randomUUID();
      const fieldId = TestDataGenerator.randomUUID();
      const value = '5';
      const field = { type: 'rating' };

      SubmissionData.build = jest.fn().mockReturnValue({
        setValue: jest.fn(),
        save: jest.fn().mockResolvedValue({}),
      });

      await SubmissionData.createWithEncryption(submissionId, fieldId, value, field);

      expect(SubmissionData.build).toHaveBeenCalled();
    });
  });

  describe('getValueType()', () => {
    it('should detect number type', () => {
      expect(SubmissionData.getValueType(123)).toBe('number');
      expect(SubmissionData.getValueType(45.67)).toBe('number');
    });

    it('should detect boolean type', () => {
      expect(SubmissionData.getValueType(true)).toBe('boolean');
      expect(SubmissionData.getValueType(false)).toBe('boolean');
    });

    it('should detect date type', () => {
      expect(SubmissionData.getValueType(new Date())).toBe('date');
    });

    it('should detect JSON type for objects', () => {
      expect(SubmissionData.getValueType({ key: 'value' })).toBe('json');
      expect(SubmissionData.getValueType([1, 2, 3])).toBe('json');
    });

    it('should default to string type', () => {
      expect(SubmissionData.getValueType('text')).toBe('string');
    });
  });

  describe('Associations', () => {
    it('should define associations', () => {
      const mockModels = {
        Submission: {},
        Field: {},
      };

      SubmissionData.associate(mockModels);

      expect(SubmissionData.belongsTo).toHaveBeenCalledTimes(2);
    });
  });

  describe('Scopes', () => {
    it('should have encrypted scope', () => {
      expect(SubmissionData.addScope).toHaveBeenCalledWith(
        'encrypted',
        expect.objectContaining({
          where: { is_encrypted: true },
        })
      );
    });

    it('should have withField scope', () => {
      expect(SubmissionData.addScope).toHaveBeenCalledWith(
        'withField',
        expect.objectContaining({
          include: expect.any(Array),
        })
      );
    });
  });
});