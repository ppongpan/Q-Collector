/**
 * Test Helper Functions
 * Common utilities for testing
 */

const crypto = require('crypto');

/**
 * Generate random test data
 */
const TestDataGenerator = {
  /**
   * Generate random string
   * @param {number} length - String length
   * @returns {string}
   */
  randomString(length = 10) {
    return crypto.randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  },

  /**
   * Generate random email
   * @returns {string}
   */
  randomEmail() {
    return `test${this.randomString(8)}@example.com`;
  },

  /**
   * Generate random username
   * @returns {string}
   */
  randomUsername() {
    return `user${this.randomString(8)}`;
  },

  /**
   * Generate random phone number (Thai format)
   * @returns {string}
   */
  randomPhone() {
    return `08${Math.floor(Math.random() * 90000000 + 10000000)}`;
  },

  /**
   * Generate random UUID v4
   * @returns {string}
   */
  randomUUID() {
    return crypto.randomUUID();
  },

  /**
   * Generate random integer
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number}
   */
  randomInt(min = 0, max = 100) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * Generate random boolean
   * @returns {boolean}
   */
  randomBoolean() {
    return Math.random() >= 0.5;
  },

  /**
   * Generate random date
   * @param {number} daysAgo - Days before today (default: random 0-365)
   * @returns {Date}
   */
  randomDate(daysAgo = null) {
    const days = daysAgo !== null ? daysAgo : this.randomInt(0, 365);
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  },
};

/**
 * Mock data generators for models
 */
const MockDataFactory = {
  /**
   * Create mock user data
   * @param {Object} overrides - Override default values
   * @returns {Object}
   */
  user(overrides = {}) {
    return {
      username: TestDataGenerator.randomUsername(),
      email: TestDataGenerator.randomEmail(),
      password_hash: 'password123', // Will be hashed by model
      full_name: 'Test User',
      role: 'user',
      phone: TestDataGenerator.randomPhone(),
      is_active: true,
      ...overrides,
    };
  },

  /**
   * Create mock form data
   * @param {Object} overrides - Override default values
   * @returns {Object}
   */
  form(overrides = {}) {
    return {
      title: `Test Form ${TestDataGenerator.randomString(6)}`,
      description: 'Test form description',
      roles_allowed: ['user'],
      settings: {
        telegram: { enabled: false },
        validation: { strict: false },
      },
      is_active: true,
      version: 1,
      ...overrides,
    };
  },

  /**
   * Create mock field data
   * @param {Object} overrides - Override default values
   * @returns {Object}
   */
  field(overrides = {}) {
    return {
      type: 'short_answer',
      title: `Test Field ${TestDataGenerator.randomString(6)}`,
      placeholder: 'Enter text',
      required: false,
      order: 0,
      options: {},
      show_condition: null,
      telegram_config: null,
      validation_rules: {},
      ...overrides,
    };
  },

  /**
   * Create mock submission data
   * @param {Object} overrides - Override default values
   * @returns {Object}
   */
  submission(overrides = {}) {
    return {
      status: 'submitted',
      ip_address: '127.0.0.1',
      user_agent: 'Mozilla/5.0 Test Browser',
      metadata: {},
      submitted_at: new Date(),
      ...overrides,
    };
  },

  /**
   * Create mock submission data entry
   * @param {Object} overrides - Override default values
   * @returns {Object}
   */
  submissionData(overrides = {}) {
    return {
      value_text: 'Test value',
      value_type: 'string',
      is_encrypted: false,
      ...overrides,
    };
  },
};

/**
 * Assertion helpers
 */
const AssertionHelpers = {
  /**
   * Assert encrypted object structure
   * @param {Object} encrypted - Encrypted object
   */
  assertEncryptedStructure(encrypted) {
    expect(encrypted).toBeDefined();
    expect(encrypted).toHaveProperty('iv');
    expect(encrypted).toHaveProperty('encryptedData');
    expect(encrypted).toHaveProperty('authTag');
    expect(typeof encrypted.iv).toBe('string');
    expect(typeof encrypted.encryptedData).toBe('string');
    expect(typeof encrypted.authTag).toBe('string');
    expect(encrypted.iv.length).toBe(32); // 16 bytes in hex
    expect(encrypted.authTag.length).toBe(32); // 16 bytes in hex
  },

  /**
   * Assert model has required fields
   * @param {Object} model - Model instance
   * @param {string[]} fields - Required field names
   */
  assertHasFields(model, fields) {
    fields.forEach(field => {
      expect(model).toHaveProperty(field);
    });
  },

  /**
   * Assert valid timestamp
   * @param {any} value - Value to check
   */
  assertValidTimestamp(value) {
    expect(value).toBeDefined();
    expect(value instanceof Date || typeof value === 'string').toBe(true);
    const date = new Date(value);
    expect(date.toString()).not.toBe('Invalid Date');
  },

  /**
   * Assert UUID format
   * @param {string} value - UUID to check
   */
  assertValidUUID(value) {
    expect(value).toBeValidUUID();
  },

  /**
   * Assert array contains items
   * @param {Array} array - Array to check
   * @param {number} minLength - Minimum length (default: 1)
   */
  assertArrayNotEmpty(array, minLength = 1) {
    expect(Array.isArray(array)).toBe(true);
    expect(array.length).toBeGreaterThanOrEqual(minLength);
  },
};

/**
 * Wait for a condition to be true
 * @param {Function} condition - Function that returns boolean
 * @param {number} timeout - Timeout in milliseconds
 * @param {number} interval - Check interval in milliseconds
 * @returns {Promise<void>}
 */
async function waitFor(condition, timeout = 5000, interval = 100) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('Timeout waiting for condition');
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Cleanup helper for tests
 */
class TestCleanup {
  constructor() {
    this.cleanupFunctions = [];
  }

  /**
   * Add cleanup function
   * @param {Function} fn - Cleanup function
   */
  add(fn) {
    this.cleanupFunctions.push(fn);
  }

  /**
   * Run all cleanup functions
   */
  async run() {
    for (const fn of this.cleanupFunctions.reverse()) {
      try {
        await fn();
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }
    this.cleanupFunctions = [];
  }
}

module.exports = {
  TestDataGenerator,
  MockDataFactory,
  AssertionHelpers,
  waitFor,
  sleep,
  TestCleanup,
};