/**
 * Test Setup
 * Global test configuration and environment setup
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
process.env.LOG_CONSOLE = 'false'; // Disable console logging in tests

// Set encryption key for testing (64 hex characters = 32 bytes)
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

// Set JWT secret for testing
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only';
process.env.JWT_EXPIRES_IN = '1h';

// Set other required environment variables
process.env.PORT = '3001'; // Use different port for tests
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'qcollector_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';
process.env.DB_POOL_MAX = '5';
process.env.DB_POOL_MIN = '1';

// Redis config
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// MinIO config
process.env.MINIO_ENDPOINT = 'localhost';
process.env.MINIO_PORT = '9000';
process.env.MINIO_ACCESS_KEY = 'minioadmin';
process.env.MINIO_SECRET_KEY = 'minioadmin';
process.env.MINIO_BUCKET = 'qcollector-test';

// Global test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise (optional)
global.console = {
  ...console,
  // Uncomment to suppress console output during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Add custom matchers if needed
expect.extend({
  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },

  toBeValidISO8601(received) {
    const date = new Date(received);
    const pass = !isNaN(date.getTime()) && date.toISOString() === received;

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid ISO8601 date`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid ISO8601 date`,
        pass: false,
      };
    }
  },
});

// Global beforeEach - runs before each test
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

// Global afterEach - runs after each test
afterEach(() => {
  // Cleanup if needed
});

// Global afterAll - runs once after all tests
afterAll(() => {
  // Final cleanup
});

console.log('Test environment setup complete');