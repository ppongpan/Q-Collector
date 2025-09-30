#!/usr/bin/env node
/**
 * Verify System
 * Complete system verification script
 */

const path = require('path');
const fs = require('fs');

// Set environment
process.env.NODE_ENV = 'test';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

console.log('='.repeat(60));
console.log('Q-COLLECTOR BACKEND SYSTEM VERIFICATION');
console.log('='.repeat(60));
console.log();

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`✓ ${name}`);
    return true;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
    return false;
  }
}

function testFile(name, filepath) {
  totalTests++;
  if (fs.existsSync(filepath)) {
    passedTests++;
    console.log(`✓ ${name}`);
    return true;
  } else {
    console.log(`✗ ${name} (not found: ${filepath})`);
    return false;
  }
}

// 1. File Structure
console.log('\n1. File Structure');
console.log('-'.repeat(60));

testFile('Package.json', path.join(__dirname, '../package.json'));
testFile('Jest config', path.join(__dirname, '../jest.config.js'));
testFile('.env.example', path.join(__dirname, '../.env.example'));
testFile('Server file', path.join(__dirname, '../api/server.js'));
testFile('App file', path.join(__dirname, '../api/app.js'));

// 2. Configuration Files
console.log('\n2. Configuration Files');
console.log('-'.repeat(60));

test('App config loads', () => {
  const config = require('../config/app.config');
  if (!config || !config.port) throw new Error('Invalid config');
});

test('Database config loads', () => {
  const config = require('../config/database.config');
  if (!config || !config.test) throw new Error('Invalid config');
});

test('Redis config loads', () => {
  const config = require('../config/redis.config');
  if (!config) throw new Error('Invalid config');
});

test('MinIO config loads', () => {
  const config = require('../config/minio.config');
  if (!config) throw new Error('Invalid config');
});

// 3. Utilities
console.log('\n3. Utilities');
console.log('-'.repeat(60));

test('Encryption utility', () => {
  const encryption = require('../utils/encryption.util');
  if (!encryption.encrypt || !encryption.decrypt) throw new Error('Missing methods');

  const text = 'test';
  const encrypted = encryption.encrypt(text);
  const decrypted = encryption.decrypt(encrypted);
  if (text !== decrypted) throw new Error('Encryption failed');
});

test('Logger utility', () => {
  const logger = require('../utils/logger.util');
  if (!logger.info || !logger.error) throw new Error('Missing methods');
});

// 4. Models
console.log('\n4. Models');
console.log('-'.repeat(60));

const models = ['User', 'Form', 'Field', 'SubForm', 'Submission', 'SubmissionData', 'File', 'AuditLog', 'Session'];

models.forEach(modelName => {
  test(`${modelName} model`, () => {
    const model = require(`../models/${modelName}`);
    if (typeof model !== 'function') throw new Error('Invalid model export');
  });
});

// 5. Middleware
console.log('\n5. Middleware');
console.log('-'.repeat(60));

test('Error middleware', () => {
  const middleware = require('../middleware/error.middleware');
  if (typeof middleware !== 'function') throw new Error('Invalid middleware');
});

test('Logging middleware', () => {
  const middleware = require('../middleware/logging.middleware');
  if (!middleware) throw new Error('Invalid middleware');
});

// 6. Test Infrastructure
console.log('\n6. Test Infrastructure');
console.log('-'.repeat(60));

testFile('Test setup', path.join(__dirname, '../tests/setup.js'));
testFile('Test helpers', path.join(__dirname, '../tests/helpers.js'));
testFile('Database mock', path.join(__dirname, '../tests/mocks/database.mock.js'));
testFile('Redis mock', path.join(__dirname, '../tests/mocks/redis.mock.js'));
testFile('MinIO mock', path.join(__dirname, '../tests/mocks/minio.mock.js'));

// 7. Test Fixtures
console.log('\n7. Test Fixtures');
console.log('-'.repeat(60));

testFile('Users fixture', path.join(__dirname, '../tests/fixtures/users.fixture.js'));
testFile('Forms fixture', path.join(__dirname, '../tests/fixtures/forms.fixture.js'));
testFile('Fields fixture', path.join(__dirname, '../tests/fixtures/fields.fixture.js'));
testFile('Submissions fixture', path.join(__dirname, '../tests/fixtures/submissions.fixture.js'));

// 8. Unit Tests
console.log('\n8. Unit Tests');
console.log('-'.repeat(60));

testFile('Encryption tests', path.join(__dirname, '../tests/unit/utils/encryption.test.js'));
testFile('Logger tests', path.join(__dirname, '../tests/unit/utils/logger.test.js'));
testFile('User model tests', path.join(__dirname, '../tests/unit/models/User.test.js'));
testFile('Form model tests', path.join(__dirname, '../tests/unit/models/Form.test.js'));
testFile('Submission model tests', path.join(__dirname, '../tests/unit/models/Submission.test.js'));
testFile('SubmissionData model tests', path.join(__dirname, '../tests/unit/models/SubmissionData.test.js'));

// 9. Integration Tests
console.log('\n9. Integration Tests');
console.log('-'.repeat(60));

testFile('Server integration tests', path.join(__dirname, '../tests/integration/server.test.js'));
testFile('Database integration tests', path.join(__dirname, '../tests/integration/database.test.js'));
testFile('Models integration tests', path.join(__dirname, '../tests/integration/models.test.js'));

// 10. Manual Test Scripts
console.log('\n10. Manual Test Scripts');
console.log('-'.repeat(60));

testFile('Test encryption script', path.join(__dirname, 'test-encryption.js'));
testFile('Test models script', path.join(__dirname, 'test-models.js'));
testFile('Test server script', path.join(__dirname, 'test-server.js'));

// Summary
console.log();
console.log('='.repeat(60));
console.log('VERIFICATION SUMMARY');
console.log('='.repeat(60));
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passedTests} (${Math.round(passedTests/totalTests * 100)}%)`);
console.log(`Failed: ${totalTests - passedTests}`);
console.log();

if (passedTests === totalTests) {
  console.log('✓ ALL TESTS PASSED - System is ready!');
  console.log();
  console.log('Next steps:');
  console.log('1. Run unit tests: npm test');
  console.log('2. Run manual tests: node scripts/test-encryption.js');
  console.log('3. Check coverage: npm test -- --coverage');
  console.log('4. Start services: docker-compose up -d');
  console.log('5. Start server: npm start');
} else {
  console.log('✗ SOME TESTS FAILED - Please review errors above');
  process.exit(1);
}

console.log();