/**
 * Encryption Utility
 * Provides AES-256-GCM encryption/decryption for sensitive data
 */

const crypto = require('crypto');
const logger = require('./logger.util');

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// Validate encryption key on startup
if (!ENCRYPTION_KEY) {
  logger.error('ENCRYPTION_KEY environment variable is not set');
  throw new Error('ENCRYPTION_KEY must be set in environment variables');
}

if (ENCRYPTION_KEY.length !== 64) {
  logger.error('ENCRYPTION_KEY must be 64 characters (32 bytes hex)');
  throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
}

/**
 * Encrypt text using AES-256-GCM
 * @param {string} text - Plain text to encrypt
 * @returns {Object} { iv, encryptedData, authTag }
 */
function encrypt(text) {
  try {
    if (!text || typeof text !== 'string') {
      throw new Error('Text to encrypt must be a non-empty string');
    }

    // Generate random initialization vector
    const iv = crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      iv
    );

    // Encrypt data
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      encryptedData: encrypted,
      authTag: authTag.toString('hex'),
    };
  } catch (error) {
    logger.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt text using AES-256-GCM
 * @param {Object} encryptedObj - Object with { iv, encryptedData, authTag }
 * @returns {string} Decrypted plain text
 */
function decrypt(encryptedObj) {
  try {
    if (!encryptedObj || typeof encryptedObj !== 'object') {
      throw new Error('Invalid encrypted object');
    }

    const { iv, encryptedData, authTag } = encryptedObj;

    if (!iv || !encryptedData || !authTag) {
      throw new Error('Missing required encryption properties (iv, encryptedData, authTag)');
    }

    // Create decipher
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      Buffer.from(iv, 'hex')
    );

    // Set authentication tag
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    // Decrypt data
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logger.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash data using SHA-256 (one-way hash, cannot be decrypted)
 * @param {string} text - Text to hash
 * @returns {string} Hashed value
 */
function hash(text) {
  try {
    return crypto.createHash('sha256').update(text).digest('hex');
  } catch (error) {
    logger.error('Hashing failed:', error);
    throw new Error('Failed to hash data');
  }
}

/**
 * Generate random encryption key (for setup/testing)
 * @returns {string} 64-character hex string (32 bytes)
 */
function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify encryption key format
 * @param {string} key - Key to verify
 * @returns {boolean}
 */
function isValidEncryptionKey(key) {
  if (!key || typeof key !== 'string') {
    return false;
  }

  // Must be 64 hex characters
  return /^[0-9a-f]{64}$/i.test(key);
}

/**
 * Generate checksum for file integrity verification
 * @param {Buffer} data - File data buffer
 * @returns {string} MD5 checksum
 */
function generateChecksum(data) {
  try {
    return crypto.createHash('md5').update(data).digest('hex');
  } catch (error) {
    logger.error('Checksum generation failed:', error);
    throw new Error('Failed to generate checksum');
  }
}

/**
 * Verify checksum
 * @param {Buffer} data - File data buffer
 * @param {string} expectedChecksum - Expected checksum
 * @returns {boolean}
 */
function verifyChecksum(data, expectedChecksum) {
  try {
    const actualChecksum = generateChecksum(data);
    return actualChecksum === expectedChecksum;
  } catch (error) {
    logger.error('Checksum verification failed:', error);
    return false;
  }
}

/**
 * Test encryption/decryption functionality
 * @returns {boolean}
 */
function testEncryption() {
  try {
    const testData = 'Test encryption string';
    const encrypted = encrypt(testData);
    const decrypted = decrypt(encrypted);

    const success = decrypted === testData;

    if (success) {
      logger.info('Encryption test passed');
    } else {
      logger.error('Encryption test failed: decrypted data does not match original');
    }

    return success;
  } catch (error) {
    logger.error('Encryption test failed:', error);
    return false;
  }
}

module.exports = {
  encrypt,
  decrypt,
  hash,
  generateEncryptionKey,
  isValidEncryptionKey,
  generateChecksum,
  verifyChecksum,
  testEncryption,
};