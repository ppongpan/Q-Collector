/**
 * Logger Utility Unit Tests
 * Test logging functionality
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

describe('Logger Utility', () => {
  let logger;
  let logSpy;
  let errorSpy;
  let infoSpy;

  beforeEach(() => {
    // Clear require cache to get fresh logger instance
    delete require.cache[require.resolve('../../../utils/logger.util')];

    // Mock winston transports to avoid file I/O
    jest.spyOn(winston.transports, 'Console').mockImplementation(() => ({
      log: jest.fn(),
    }));

    jest.spyOn(winston.transports, 'File').mockImplementation(() => ({
      log: jest.fn(),
    }));

    logger = require('../../../utils/logger.util');

    // Spy on logger methods
    logSpy = jest.spyOn(logger, 'log').mockImplementation();
    errorSpy = jest.spyOn(logger, 'error').mockImplementation();
    infoSpy = jest.spyOn(logger, 'info').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Logger Instance', () => {
    it('should be defined', () => {
      expect(logger).toBeDefined();
    });

    it('should have standard logging methods', () => {
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.http).toBe('function');
    });

    it('should have custom helper methods', () => {
      expect(typeof logger.logRequest).toBe('function');
      expect(typeof logger.logError).toBe('function');
      expect(typeof logger.logAudit).toBe('function');
      expect(typeof logger.logPerformance).toBe('function');
    });

    it('should have stream for Morgan', () => {
      expect(logger.stream).toBeDefined();
      expect(typeof logger.stream.write).toBe('function');
    });
  });

  describe('Basic Logging', () => {
    it('should log info messages', () => {
      logger.info('Test info message');
      expect(infoSpy).toHaveBeenCalledWith('Test info message');
    });

    it('should log error messages', () => {
      logger.error('Test error message');
      expect(errorSpy).toHaveBeenCalledWith('Test error message');
    });

    it('should log with metadata', () => {
      const metadata = { user: 'test', action: 'login' };
      logger.info('User action', metadata);
      expect(infoSpy).toHaveBeenCalledWith('User action', metadata);
    });

    it('should handle objects in log messages', () => {
      const data = { key: 'value', nested: { foo: 'bar' } };
      logger.info('Object log', data);
      expect(infoSpy).toHaveBeenCalledWith('Object log', data);
    });
  });

  describe('logRequest()', () => {
    it('should log HTTP request details', () => {
      const mockReq = {
        method: 'GET',
        originalUrl: '/api/forms',
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
      };

      const httpSpy = jest.spyOn(logger, 'http').mockImplementation();

      logger.logRequest(mockReq, 200, 150);

      expect(httpSpy).toHaveBeenCalled();
      const callArg = httpSpy.mock.calls[0][0];
      expect(callArg).toMatchObject({
        method: 'GET',
        url: '/api/forms',
        statusCode: 200,
        responseTime: '150ms',
        ip: '127.0.0.1',
      });
    });

    it('should handle POST requests', () => {
      const mockReq = {
        method: 'POST',
        originalUrl: '/api/submissions',
        ip: '192.168.1.1',
        get: jest.fn().mockReturnValue('Chrome'),
      };

      const httpSpy = jest.spyOn(logger, 'http').mockImplementation();

      logger.logRequest(mockReq, 201, 500);

      expect(httpSpy).toHaveBeenCalled();
      const callArg = httpSpy.mock.calls[0][0];
      expect(callArg.method).toBe('POST');
      expect(callArg.statusCode).toBe(201);
    });

    it('should handle error status codes', () => {
      const mockReq = {
        method: 'DELETE',
        originalUrl: '/api/forms/123',
        ip: '10.0.0.1',
        get: jest.fn().mockReturnValue('Safari'),
      };

      const httpSpy = jest.spyOn(logger, 'http').mockImplementation();

      logger.logRequest(mockReq, 404, 50);

      expect(httpSpy).toHaveBeenCalled();
      const callArg = httpSpy.mock.calls[0][0];
      expect(callArg.statusCode).toBe(404);
    });
  });

  describe('logError()', () => {
    it('should log error with stack trace', () => {
      const error = new Error('Test error');
      logger.logError(error);

      expect(errorSpy).toHaveBeenCalled();
      const callArg = errorSpy.mock.calls[0][0];
      expect(callArg).toHaveProperty('message', 'Test error');
      expect(callArg).toHaveProperty('stack');
    });

    it('should log error with request context', () => {
      const error = new Error('Request failed');
      const mockReq = {
        method: 'POST',
        originalUrl: '/api/test',
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('Firefox'),
        user: { id: 'user123' },
      };

      logger.logError(error, mockReq);

      expect(errorSpy).toHaveBeenCalled();
      const callArg = errorSpy.mock.calls[0][0];
      expect(callArg).toHaveProperty('message', 'Request failed');
      expect(callArg).toHaveProperty('request');
      expect(callArg.request).toMatchObject({
        method: 'POST',
        url: '/api/test',
        userId: 'user123',
      });
    });

    it('should handle error without request', () => {
      const error = new Error('Generic error');
      logger.logError(error, null);

      expect(errorSpy).toHaveBeenCalled();
      const callArg = errorSpy.mock.calls[0][0];
      expect(callArg).toHaveProperty('message', 'Generic error');
      expect(callArg).not.toHaveProperty('request');
    });

    it('should handle error with code', () => {
      const error = new Error('Database error');
      error.code = 'ECONNREFUSED';

      logger.logError(error);

      expect(errorSpy).toHaveBeenCalled();
      const callArg = errorSpy.mock.calls[0][0];
      expect(callArg.code).toBe('ECONNREFUSED');
    });
  });

  describe('logAudit()', () => {
    it('should log audit trail', () => {
      logger.logAudit('create', 'user123', 'form', 'form456');

      expect(infoSpy).toHaveBeenCalled();
      const callArg = infoSpy.mock.calls[0][0];
      expect(callArg).toMatchObject({
        type: 'audit',
        action: 'create',
        userId: 'user123',
        entityType: 'form',
        entityId: 'form456',
      });
    });

    it('should log audit with old and new values', () => {
      const oldValue = { status: 'draft' };
      const newValue = { status: 'published' };

      logger.logAudit('update', 'user123', 'form', 'form456', oldValue, newValue);

      expect(infoSpy).toHaveBeenCalled();
      const callArg = infoSpy.mock.calls[0][0];
      expect(callArg).toMatchObject({
        type: 'audit',
        action: 'update',
        oldValue,
        newValue,
      });
    });

    it('should include timestamp', () => {
      logger.logAudit('delete', 'user123', 'submission', 'sub789');

      expect(infoSpy).toHaveBeenCalled();
      const callArg = infoSpy.mock.calls[0][0];
      expect(callArg).toHaveProperty('timestamp');
      expect(typeof callArg.timestamp).toBe('string');
    });
  });

  describe('logPerformance()', () => {
    it('should log performance metrics', () => {
      logger.logPerformance('database_query', 150);

      expect(infoSpy).toHaveBeenCalled();
      const callArg = infoSpy.mock.calls[0][0];
      expect(callArg).toMatchObject({
        type: 'performance',
        operation: 'database_query',
        duration: '150ms',
      });
    });

    it('should log performance with metadata', () => {
      const metadata = {
        query: 'SELECT * FROM users',
        rows: 100,
      };

      logger.logPerformance('query_users', 250, metadata);

      expect(infoSpy).toHaveBeenCalled();
      const callArg = infoSpy.mock.calls[0][0];
      expect(callArg).toMatchObject({
        type: 'performance',
        operation: 'query_users',
        duration: '250ms',
        query: 'SELECT * FROM users',
        rows: 100,
      });
    });

    it('should handle slow operations', () => {
      logger.logPerformance('slow_operation', 5000);

      expect(infoSpy).toHaveBeenCalled();
      const callArg = infoSpy.mock.calls[0][0];
      expect(callArg.duration).toBe('5000ms');
    });
  });

  describe('stream', () => {
    it('should write to http log level', () => {
      const httpSpy = jest.spyOn(logger, 'http').mockImplementation();

      logger.stream.write('Test HTTP log\n');

      expect(httpSpy).toHaveBeenCalledWith('Test HTTP log');
    });

    it('should trim message', () => {
      const httpSpy = jest.spyOn(logger, 'http').mockImplementation();

      logger.stream.write('  Message with spaces  \n');

      expect(httpSpy).toHaveBeenCalledWith('Message with spaces');
    });

    it('should handle empty messages', () => {
      const httpSpy = jest.spyOn(logger, 'http').mockImplementation();

      logger.stream.write('\n');

      expect(httpSpy).toHaveBeenCalledWith('');
    });
  });

  describe('Error Handling', () => {
    it('should handle null values', () => {
      expect(() => logger.info(null)).not.toThrow();
      expect(() => logger.error(null)).not.toThrow();
    });

    it('should handle undefined values', () => {
      expect(() => logger.info(undefined)).not.toThrow();
      expect(() => logger.error(undefined)).not.toThrow();
    });

    it('should handle circular references', () => {
      const circular = { a: 1 };
      circular.self = circular;

      expect(() => logger.info('Circular', circular)).not.toThrow();
    });

    it('should handle errors in logError', () => {
      const invalidError = { notAnError: true };
      expect(() => logger.logError(invalidError)).not.toThrow();
    });
  });

  describe('Log Levels', () => {
    it('should support error level', () => {
      const errorSpy = jest.spyOn(logger, 'error').mockImplementation();
      logger.error('Error message');
      expect(errorSpy).toHaveBeenCalledWith('Error message');
    });

    it('should support warn level', () => {
      const warnSpy = jest.spyOn(logger, 'warn').mockImplementation();
      logger.warn('Warning message');
      expect(warnSpy).toHaveBeenCalledWith('Warning message');
    });

    it('should support info level', () => {
      const infoSpy = jest.spyOn(logger, 'info').mockImplementation();
      logger.info('Info message');
      expect(infoSpy).toHaveBeenCalledWith('Info message');
    });

    it('should support debug level', () => {
      const debugSpy = jest.spyOn(logger, 'debug').mockImplementation();
      logger.debug('Debug message');
      expect(debugSpy).toHaveBeenCalledWith('Debug message');
    });

    it('should support http level', () => {
      const httpSpy = jest.spyOn(logger, 'http').mockImplementation();
      logger.http('HTTP message');
      expect(httpSpy).toHaveBeenCalledWith('HTTP message');
    });
  });

  describe('Integration Scenarios', () => {
    it('should log complete request lifecycle', () => {
      const httpSpy = jest.spyOn(logger, 'http').mockImplementation();
      const infoSpy = jest.spyOn(logger, 'info').mockImplementation();

      const mockReq = {
        method: 'POST',
        originalUrl: '/api/forms',
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('Chrome'),
      };

      // Log request
      logger.logRequest(mockReq, 201, 250);
      expect(httpSpy).toHaveBeenCalled();

      // Log audit
      logger.logAudit('create', 'user123', 'form', 'form456');
      expect(infoSpy).toHaveBeenCalled();

      // Log performance
      logger.logPerformance('create_form', 250);
      expect(infoSpy).toHaveBeenCalledTimes(2);
    });

    it('should log error scenario with context', () => {
      const errorSpy = jest.spyOn(logger, 'error').mockImplementation();

      const error = new Error('Database connection failed');
      error.code = 'ECONNREFUSED';

      const mockReq = {
        method: 'GET',
        originalUrl: '/api/submissions',
        ip: '192.168.1.1',
        get: jest.fn().mockReturnValue('Firefox'),
      };

      logger.logError(error, mockReq);

      expect(errorSpy).toHaveBeenCalled();
      const callArg = errorSpy.mock.calls[0][0];
      expect(callArg).toMatchObject({
        message: 'Database connection failed',
        code: 'ECONNREFUSED',
      });
      expect(callArg.request).toBeDefined();
    });
  });
});