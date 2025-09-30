/**
 * Encryption Utility Unit Tests
 * Test encryption/decryption functionality
 */

describe('Encryption Utility', () => {
  let encryption;

  beforeAll(() => {
    // Ensure ENCRYPTION_KEY is set
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    encryption = require('../../../utils/encryption.util');
  });

  describe('encrypt()', () => {
    it('should encrypt plain text', () => {
      const plainText = 'Hello World';
      const encrypted = encryption.encrypt(plainText);

      expect(encrypted).toBeDefined();
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('encryptedData');
      expect(encrypted).toHaveProperty('authTag');
    });

    it('should produce different IV for same text', () => {
      const plainText = 'Test String';
      const encrypted1 = encryption.encrypt(plainText);
      const encrypted2 = encryption.encrypt(plainText);

      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.encryptedData).not.toBe(encrypted2.encryptedData);
    });

    it('should handle special characters', () => {
      const specialText = 'ทดสอบ!@#$%^&*()_+-={}[]|\\:";\'<>?,./';
      const encrypted = encryption.encrypt(specialText);

      expect(encrypted).toBeDefined();
      expect(encrypted.iv.length).toBe(32);
    });

    it('should handle long text', () => {
      const longText = 'A'.repeat(10000);
      const encrypted = encryption.encrypt(longText);

      expect(encrypted).toBeDefined();
      expect(encrypted.encryptedData.length).toBeGreaterThan(0);
    });

    it('should throw error for non-string input', () => {
      expect(() => encryption.encrypt(null)).toThrow();
      expect(() => encryption.encrypt(undefined)).toThrow();
      expect(() => encryption.encrypt(123)).toThrow();
      expect(() => encryption.encrypt({})).toThrow();
    });

    it('should throw error for empty string', () => {
      expect(() => encryption.encrypt('')).toThrow();
    });

    it('should return valid hex strings', () => {
      const plainText = 'Test';
      const encrypted = encryption.encrypt(plainText);

      expect(/^[0-9a-f]+$/i.test(encrypted.iv)).toBe(true);
      expect(/^[0-9a-f]+$/i.test(encrypted.encryptedData)).toBe(true);
      expect(/^[0-9a-f]+$/i.test(encrypted.authTag)).toBe(true);
    });

    it('should return consistent structure', () => {
      const texts = ['Short', 'Medium length text', 'Very long text with many characters'];

      texts.forEach(text => {
        const encrypted = encryption.encrypt(text);
        expect(encrypted.iv.length).toBe(32); // 16 bytes in hex
        expect(encrypted.authTag.length).toBe(32); // 16 bytes in hex
        expect(encrypted.encryptedData.length).toBeGreaterThan(0);
      });
    });
  });

  describe('decrypt()', () => {
    it('should decrypt encrypted text', () => {
      const plainText = 'Secret Message';
      const encrypted = encryption.encrypt(plainText);
      const decrypted = encryption.decrypt(encrypted);

      expect(decrypted).toBe(plainText);
    });

    it('should handle various text types', () => {
      const testCases = [
        'Simple text',
        'Text with spaces',
        'ข้อความภาษาไทย',
        '123456789',
        'special@#$%chars',
        'Line1\nLine2\nLine3',
      ];

      testCases.forEach(text => {
        const encrypted = encryption.encrypt(text);
        const decrypted = encryption.decrypt(encrypted);
        expect(decrypted).toBe(text);
      });
    });

    it('should throw error for invalid encrypted object', () => {
      expect(() => encryption.decrypt(null)).toThrow();
      expect(() => encryption.decrypt(undefined)).toThrow();
      expect(() => encryption.decrypt('string')).toThrow();
      expect(() => encryption.decrypt(123)).toThrow();
    });

    it('should throw error for missing properties', () => {
      expect(() => encryption.decrypt({ iv: 'abc' })).toThrow();
      expect(() => encryption.decrypt({ encryptedData: 'abc' })).toThrow();
      expect(() => encryption.decrypt({ authTag: 'abc' })).toThrow();
      expect(() => encryption.decrypt({ iv: 'abc', encryptedData: 'def' })).toThrow();
    });

    it('should throw error for tampered data', () => {
      const plainText = 'Original Message';
      const encrypted = encryption.encrypt(plainText);

      // Tamper with encrypted data
      const tampered = {
        ...encrypted,
        encryptedData: encrypted.encryptedData.substring(0, encrypted.encryptedData.length - 2) + 'ff',
      };

      expect(() => encryption.decrypt(tampered)).toThrow();
    });

    it('should throw error for tampered auth tag', () => {
      const plainText = 'Test Message';
      const encrypted = encryption.encrypt(plainText);

      // Tamper with auth tag
      const tampered = {
        ...encrypted,
        authTag: '0'.repeat(32),
      };

      expect(() => encryption.decrypt(tampered)).toThrow();
    });

    it('should handle round-trip encryption', () => {
      const original = 'Round trip test';
      const encrypted1 = encryption.encrypt(original);
      const decrypted1 = encryption.decrypt(encrypted1);
      const encrypted2 = encryption.encrypt(decrypted1);
      const decrypted2 = encryption.decrypt(encrypted2);

      expect(decrypted1).toBe(original);
      expect(decrypted2).toBe(original);
    });
  });

  describe('hash()', () => {
    it('should hash text', () => {
      const text = 'Password123';
      const hashed = encryption.hash(text);

      expect(hashed).toBeDefined();
      expect(typeof hashed).toBe('string');
      expect(hashed.length).toBe(64); // SHA-256 produces 64 hex characters
    });

    it('should produce consistent hash for same input', () => {
      const text = 'Test123';
      const hash1 = encryption.hash(text);
      const hash2 = encryption.hash(text);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different input', () => {
      const hash1 = encryption.hash('text1');
      const hash2 = encryption.hash('text2');

      expect(hash1).not.toBe(hash2);
    });

    it('should be case sensitive', () => {
      const hash1 = encryption.hash('Test');
      const hash2 = encryption.hash('test');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hashed = encryption.hash('');
      expect(hashed).toBeDefined();
      expect(hashed.length).toBe(64);
    });

    it('should be irreversible', () => {
      const original = 'Secret';
      const hashed = encryption.hash(original);

      // Hash should not contain original text
      expect(hashed.includes(original)).toBe(false);
      expect(hashed.toLowerCase().includes(original.toLowerCase())).toBe(false);
    });
  });

  describe('generateEncryptionKey()', () => {
    it('should generate valid encryption key', () => {
      const key = encryption.generateEncryptionKey();

      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(key.length).toBe(64);
      expect(/^[0-9a-f]{64}$/i.test(key)).toBe(true);
    });

    it('should generate unique keys', () => {
      const key1 = encryption.generateEncryptionKey();
      const key2 = encryption.generateEncryptionKey();
      const key3 = encryption.generateEncryptionKey();

      expect(key1).not.toBe(key2);
      expect(key2).not.toBe(key3);
      expect(key1).not.toBe(key3);
    });

    it('should generate multiple unique keys', () => {
      const keys = new Set();
      for (let i = 0; i < 100; i++) {
        keys.add(encryption.generateEncryptionKey());
      }

      expect(keys.size).toBe(100);
    });
  });

  describe('isValidEncryptionKey()', () => {
    it('should validate correct key format', () => {
      const validKey = encryption.generateEncryptionKey();
      expect(encryption.isValidEncryptionKey(validKey)).toBe(true);
    });

    it('should reject invalid key formats', () => {
      expect(encryption.isValidEncryptionKey(null)).toBe(false);
      expect(encryption.isValidEncryptionKey(undefined)).toBe(false);
      expect(encryption.isValidEncryptionKey('')).toBe(false);
      expect(encryption.isValidEncryptionKey('short')).toBe(false);
      expect(encryption.isValidEncryptionKey('x'.repeat(64))).toBe(false); // Not hex
      expect(encryption.isValidEncryptionKey('0123456789abcdef')).toBe(false); // Too short
      expect(encryption.isValidEncryptionKey('0'.repeat(63))).toBe(false); // Wrong length
      expect(encryption.isValidEncryptionKey('0'.repeat(65))).toBe(false); // Wrong length
    });

    it('should accept uppercase hex', () => {
      const upperKey = 'ABCDEF0123456789' + 'ABCDEF0123456789' + 'ABCDEF0123456789' + 'ABCDEF0123456789';
      expect(encryption.isValidEncryptionKey(upperKey)).toBe(true);
    });

    it('should accept mixed case hex', () => {
      const mixedKey = 'AbCdEf0123456789' + 'aBcDeF0123456789' + 'AbCdEf0123456789' + 'aBcDeF0123456789';
      expect(encryption.isValidEncryptionKey(mixedKey)).toBe(true);
    });
  });

  describe('generateChecksum()', () => {
    it('should generate checksum for buffer', () => {
      const data = Buffer.from('Test data');
      const checksum = encryption.generateChecksum(data);

      expect(checksum).toBeDefined();
      expect(typeof checksum).toBe('string');
      expect(checksum.length).toBe(32); // MD5 produces 32 hex characters
    });

    it('should produce consistent checksum', () => {
      const data = Buffer.from('Same data');
      const checksum1 = encryption.generateChecksum(data);
      const checksum2 = encryption.generateChecksum(data);

      expect(checksum1).toBe(checksum2);
    });

    it('should produce different checksums for different data', () => {
      const data1 = Buffer.from('Data 1');
      const data2 = Buffer.from('Data 2');

      const checksum1 = encryption.generateChecksum(data1);
      const checksum2 = encryption.generateChecksum(data2);

      expect(checksum1).not.toBe(checksum2);
    });

    it('should handle empty buffer', () => {
      const data = Buffer.from('');
      const checksum = encryption.generateChecksum(data);

      expect(checksum).toBeDefined();
      expect(checksum.length).toBe(32);
    });
  });

  describe('verifyChecksum()', () => {
    it('should verify correct checksum', () => {
      const data = Buffer.from('Test data');
      const checksum = encryption.generateChecksum(data);

      expect(encryption.verifyChecksum(data, checksum)).toBe(true);
    });

    it('should reject incorrect checksum', () => {
      const data = Buffer.from('Test data');
      const wrongChecksum = 'a'.repeat(32);

      expect(encryption.verifyChecksum(data, wrongChecksum)).toBe(false);
    });

    it('should detect data tampering', () => {
      const data = Buffer.from('Original data');
      const checksum = encryption.generateChecksum(data);

      const tamperedData = Buffer.from('Tampered data');
      expect(encryption.verifyChecksum(tamperedData, checksum)).toBe(false);
    });
  });

  describe('testEncryption()', () => {
    it('should pass encryption test', () => {
      const result = encryption.testEncryption();
      expect(result).toBe(true);
    });

    it('should return boolean', () => {
      const result = encryption.testEncryption();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete encryption workflow', () => {
      const original = 'Sensitive Data';

      // Encrypt
      const encrypted = encryption.encrypt(original);
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('encryptedData');
      expect(encrypted).toHaveProperty('authTag');

      // Decrypt
      const decrypted = encryption.decrypt(encrypted);
      expect(decrypted).toBe(original);

      // Hash for comparison
      const hash1 = encryption.hash(original);
      const hash2 = encryption.hash(decrypted);
      expect(hash1).toBe(hash2);
    });

    it('should handle JSON serialization', () => {
      const plainText = 'Test Data';
      const encrypted = encryption.encrypt(plainText);

      // Simulate storing in database (JSON stringify/parse)
      const jsonString = JSON.stringify(encrypted);
      const parsed = JSON.parse(jsonString);

      const decrypted = encryption.decrypt(parsed);
      expect(decrypted).toBe(plainText);
    });

    it('should handle multiple encryption/decryption cycles', () => {
      let text = 'Original Text';

      for (let i = 0; i < 10; i++) {
        const encrypted = encryption.encrypt(text);
        const decrypted = encryption.decrypt(encrypted);
        expect(decrypted).toBe(text);
        text = decrypted; // Use decrypted for next iteration
      }
    });
  });
});