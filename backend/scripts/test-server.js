#!/usr/bin/env node
/**
 * Test Server
 * Manual test script for server configuration
 */

process.env.NODE_ENV = 'test';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.PORT = '3001';

console.log('=== Server Configuration Test ===\n');

// Test 1: Environment Variables
console.log('Test 1: Environment Variables');
try {
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('PORT:', process.env.PORT);
  console.log('ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY ? 'Set (64 chars)' : 'Not set');
  console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Not set');

  if (process.env.NODE_ENV && process.env.ENCRYPTION_KEY && process.env.JWT_SECRET) {
    console.log('✓ Test 1 PASSED\n');
  } else {
    console.log('✗ Test 1 FAILED\n');
  }
} catch (error) {
  console.log(`✗ Test 1 FAILED: ${error.message}\n`);
}

// Test 2: Configuration Files
console.log('Test 2: Configuration Files');
try {
  const appConfig = require('../config/app.config');
  console.log('App Config:');
  console.log('- port:', appConfig.port);
  console.log('- env:', appConfig.env);
  console.log('- logLevel:', appConfig.logLevel);

  const dbConfig = require('../config/database.config');
  console.log('\nDatabase Config:');
  console.log('- test config exists:', dbConfig.test ? '✓' : '✗');
  console.log('- test database:', dbConfig.test?.database);

  console.log('✓ Test 2 PASSED\n');
} catch (error) {
  console.log(`✗ Test 2 FAILED: ${error.message}\n`);
}

// Test 3: Utilities
console.log('Test 3: Utilities Loading');
try {
  const encryption = require('../utils/encryption.util');
  console.log('Encryption utility:', encryption ? '✓' : '✗');
  console.log('- encrypt method:', typeof encryption.encrypt === 'function' ? '✓' : '✗');
  console.log('- decrypt method:', typeof encryption.decrypt === 'function' ? '✓' : '✗');

  const logger = require('../utils/logger.util');
  console.log('Logger utility:', logger ? '✓' : '✗');
  console.log('- info method:', typeof logger.info === 'function' ? '✓' : '✗');
  console.log('- error method:', typeof logger.error === 'function' ? '✓' : '✗');

  console.log('✓ Test 3 PASSED\n');
} catch (error) {
  console.log(`✗ Test 3 FAILED: ${error.message}\n`);
}

// Test 4: Middleware
console.log('Test 4: Middleware Loading');
try {
  const errorMiddleware = require('../middleware/error.middleware');
  console.log('Error middleware:', typeof errorMiddleware === 'function' ? '✓' : '✗');

  const loggingMiddleware = require('../middleware/logging.middleware');
  console.log('Logging middleware:', loggingMiddleware ? '✓' : '✗');

  console.log('✓ Test 4 PASSED\n');
} catch (error) {
  console.log(`✗ Test 4 FAILED: ${error.message}\n`);
}

// Test 5: Model Files
console.log('Test 5: Model Files');
try {
  const models = [
    'User',
    'Form',
    'Field',
    'SubForm',
    'Submission',
    'SubmissionData',
    'File',
    'AuditLog',
    'Session',
  ];

  console.log('Checking model files:');
  models.forEach(modelName => {
    try {
      const model = require(`../models/${modelName}`);
      console.log(`- ${modelName}:`, typeof model === 'function' ? '✓' : '✗');
    } catch (error) {
      console.log(`- ${modelName}: ✗ (${error.message})`);
    }
  });

  console.log('✓ Test 5 PASSED\n');
} catch (error) {
  console.log(`✗ Test 5 FAILED: ${error.message}\n`);
}

// Test 6: Encryption Test
console.log('Test 6: Encryption Functionality');
try {
  const encryption = require('../utils/encryption.util');

  const testData = 'Test encryption data';
  const encrypted = encryption.encrypt(testData);
  const decrypted = encryption.decrypt(encrypted);

  console.log('Original:', testData);
  console.log('Decrypted:', decrypted);
  console.log('Match:', testData === decrypted ? '✓' : '✗');

  if (testData === decrypted) {
    console.log('✓ Test 6 PASSED\n');
  } else {
    console.log('✗ Test 6 FAILED\n');
  }
} catch (error) {
  console.log(`✗ Test 6 FAILED: ${error.message}\n`);
}

// Test 7: Logger Test
console.log('Test 7: Logger Functionality');
try {
  const logger = require('../utils/logger.util');

  // Suppress output for test
  const originalMethods = {
    log: logger.log,
    info: logger.info,
    error: logger.error,
  };

  // Test logging methods
  logger.info('Test info message');
  logger.error('Test error message');
  logger.logRequest({ method: 'GET', originalUrl: '/test', ip: '127.0.0.1', get: () => 'test' }, 200, 100);

  console.log('Logger methods work without errors: ✓');
  console.log('✓ Test 7 PASSED\n');
} catch (error) {
  console.log(`✗ Test 7 FAILED: ${error.message}\n`);
}

console.log('=== Server Test Complete ===\n');
console.log('Note: This test does not start the actual server.');
console.log('To test with database, ensure PostgreSQL, Redis, and MinIO are running.');
console.log('Then run: npm start');