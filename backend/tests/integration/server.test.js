/**
 * Server Integration Tests
 * Test server startup and configuration
 */

describe('Server Integration', () => {
  let server;

  afterEach(() => {
    if (server && server.close) {
      server.close();
    }
  });

  describe('Server Initialization', () => {
    it('should load environment variables', () => {
      expect(process.env.NODE_ENV).toBe('test');
      expect(process.env.ENCRYPTION_KEY).toBeDefined();
      expect(process.env.JWT_SECRET).toBeDefined();
    });

    it('should have required configurations', () => {
      expect(process.env.DB_HOST).toBeDefined();
      expect(process.env.REDIS_HOST).toBeDefined();
      expect(process.env.MINIO_ENDPOINT).toBeDefined();
    });

    it('should validate encryption key format', () => {
      const key = process.env.ENCRYPTION_KEY;
      expect(key).toMatch(/^[0-9a-f]{64}$/i);
    });

    it('should set test port', () => {
      expect(process.env.PORT).toBe('3001');
    });
  });

  describe('App Configuration', () => {
    it('should load app config', () => {
      const appConfig = require('../../config/app.config');
      expect(appConfig).toBeDefined();
      expect(appConfig).toHaveProperty('port');
      expect(appConfig).toHaveProperty('env');
    });

    it('should load database config', () => {
      const dbConfig = require('../../config/database.config');
      expect(dbConfig).toBeDefined();
      expect(dbConfig).toHaveProperty('development');
      expect(dbConfig).toHaveProperty('test');
      expect(dbConfig).toHaveProperty('production');
    });

    it('should use test database config', () => {
      const dbConfig = require('../../config/database.config');
      expect(dbConfig.test).toBeDefined();
      expect(dbConfig.test.database).toContain('test');
    });
  });

  describe('Middleware Loading', () => {
    it('should load error middleware', () => {
      const errorMiddleware = require('../../middleware/error.middleware');
      expect(errorMiddleware).toBeDefined();
      expect(typeof errorMiddleware).toBe('function');
    });

    it('should load logging middleware', () => {
      const loggingMiddleware = require('../../middleware/logging.middleware');
      expect(loggingMiddleware).toBeDefined();
    });
  });

  describe('Utilities', () => {
    it('should load encryption utility', () => {
      const encryption = require('../../utils/encryption.util');
      expect(encryption).toBeDefined();
      expect(encryption.encrypt).toBeDefined();
      expect(encryption.decrypt).toBeDefined();
    });

    it('should load logger utility', () => {
      const logger = require('../../utils/logger.util');
      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.error).toBeDefined();
    });

    it('should pass encryption test', () => {
      const encryption = require('../../utils/encryption.util');
      const result = encryption.testEncryption();
      expect(result).toBe(true);
    });
  });

  describe('Models Loading', () => {
    it('should load models index', () => {
      // Models require database connection, so we just test the file exists
      expect(() => require('../../models/index')).not.toThrow();
    });

    it('should have User model', () => {
      const UserModel = require('../../models/User');
      expect(UserModel).toBeDefined();
      expect(typeof UserModel).toBe('function');
    });

    it('should have Form model', () => {
      const FormModel = require('../../models/Form');
      expect(FormModel).toBeDefined();
      expect(typeof FormModel).toBe('function');
    });

    it('should have Submission model', () => {
      const SubmissionModel = require('../../models/Submission');
      expect(SubmissionModel).toBeDefined();
      expect(typeof SubmissionModel).toBe('function');
    });

    it('should have SubmissionData model', () => {
      const SubmissionDataModel = require('../../models/SubmissionData');
      expect(SubmissionDataModel).toBeDefined();
      expect(typeof SubmissionDataModel).toBe('function');
    });
  });
});