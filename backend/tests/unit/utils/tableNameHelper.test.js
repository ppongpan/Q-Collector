/**
 * Tests for Table Name Helper
 */

const {
  sanitizeIdentifier,
  generateTableName,
  generateColumnName,
  getPostgreSQLType,
  isValidTableName,
  thaiToRoman
} = require('../../../utils/tableNameHelper');

describe('Table Name Helper', () => {
  describe('thaiToRoman', () => {
    test('should convert Thai to Roman characters', () => {
      expect(thaiToRoman('สวัสดี')).toBe('sawasdi');
      expect(thaiToRoman('แบบฟอร์ม')).toBe('aebfoorm');
      expect(thaiToRoman('ใบสมัคร')).toBe('aismaekhr');
    });

    test('should preserve English characters', () => {
      expect(thaiToRoman('Form123')).toBe('Form123');
    });
  });

  describe('sanitizeIdentifier', () => {
    test('should convert to lowercase', () => {
      expect(sanitizeIdentifier('MyForm')).toBe('myform');
    });

    test('should replace spaces with underscores', () => {
      expect(sanitizeIdentifier('My Form Name')).toBe('my_form_name');
    });

    test('should remove special characters', () => {
      expect(sanitizeIdentifier('Form@#$%')).toBe('form');
    });

    test('should handle Thai text', () => {
      const result = sanitizeIdentifier('แบบฟอร์มทดสอบ');
      expect(result).toBe('aebfoormrthsob');
    });

    test('should add prefix', () => {
      expect(sanitizeIdentifier('test', 'form_')).toBe('form_test');
    });

    test('should truncate long names', () => {
      const longName = 'a'.repeat(70);
      const result = sanitizeIdentifier(longName, 'form_', 50);
      expect(result.length).toBeLessThanOrEqual(50);
    });

    test('should ensure starts with letter', () => {
      const result = sanitizeIdentifier('123form');
      expect(result).toMatch(/^[a-z]/);
    });
  });

  describe('generateTableName', () => {
    test('should generate valid table name from form title', () => {
      const tableName = generateTableName('Contact Form');
      expect(tableName).toMatch(/^form_contact_form/);
      expect(isValidTableName(tableName)).toBe(true);
    });

    test('should include form ID for uniqueness', () => {
      const formId = 'form-1234567890-abcdef';
      const tableName = generateTableName('Test Form', formId);
      expect(tableName).toContain('abcdef');
    });

    test('should handle Thai form titles', () => {
      const tableName = generateTableName('แบบฟอร์มติดต่อ');
      expect(isValidTableName(tableName)).toBe(true);
      expect(tableName).toMatch(/^form_/);
    });
  });

  describe('generateColumnName', () => {
    test('should generate valid column name from field label', () => {
      const columnName = generateColumnName('Full Name');
      expect(columnName).toBe('full_name');
      expect(columnName.length).toBeLessThanOrEqual(63);
    });

    test('should include field ID for uniqueness', () => {
      const fieldId = 'field-1234567890-xyz';
      const columnName = generateColumnName('Email Address', fieldId);
      expect(columnName).toContain('xyz');
    });

    test('should handle Thai field labels', () => {
      const columnName = generateColumnName('ชื่อเต็ม');
      expect(columnName).toBe('chuuetem');
    });
  });

  describe('getPostgreSQLType', () => {
    test('should return correct PostgreSQL types', () => {
      expect(getPostgreSQLType('short_answer')).toBe('VARCHAR(255)');
      expect(getPostgreSQLType('paragraph')).toBe('TEXT');
      expect(getPostgreSQLType('number')).toBe('NUMERIC');
      expect(getPostgreSQLType('date')).toBe('DATE');
      expect(getPostgreSQLType('email')).toBe('VARCHAR(255)');
    });

    test('should return TEXT for unknown types', () => {
      expect(getPostgreSQLType('unknown_type')).toBe('TEXT');
    });
  });

  describe('isValidTableName', () => {
    test('should validate correct table names', () => {
      expect(isValidTableName('form_contact')).toBe(true);
      expect(isValidTableName('form_test_123')).toBe(true);
      expect(isValidTableName('_internal_table')).toBe(true);
    });

    test('should reject invalid table names', () => {
      expect(isValidTableName('123invalid')).toBe(false); // starts with number
      expect(isValidTableName('form-name')).toBe(false); // contains hyphen
      expect(isValidTableName('a'.repeat(64))).toBe(false); // too long
    });
  });
});
