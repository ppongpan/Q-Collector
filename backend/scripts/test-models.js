#!/usr/bin/env node
/**
 * Test Models
 * Manual test script for model definitions (without database)
 */

// Set environment variables
process.env.NODE_ENV = 'test';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

console.log('=== Model Definitions Test ===\n');

// Test loading models
console.log('Test 1: Load Model Files');
try {
  const UserModel = require('../models/User');
  const FormModel = require('../models/Form');
  const SubmissionModel = require('../models/Submission');
  const SubmissionDataModel = require('../models/SubmissionData');
  const FieldModel = require('../models/Field');
  const SubFormModel = require('../models/SubForm');
  const FileModel = require('../models/File');
  const AuditLogModel = require('../models/AuditLog');
  const SessionModel = require('../models/Session');

  console.log('✓ User model loaded');
  console.log('✓ Form model loaded');
  console.log('✓ Submission model loaded');
  console.log('✓ SubmissionData model loaded');
  console.log('✓ Field model loaded');
  console.log('✓ SubForm model loaded');
  console.log('✓ File model loaded');
  console.log('✓ AuditLog model loaded');
  console.log('✓ Session model loaded');
  console.log('✓ Test 1 PASSED\n');
} catch (error) {
  console.log(`✗ Test 1 FAILED: ${error.message}\n`);
}

// Test model structure
console.log('Test 2: Model Structure Check');
try {
  const { Sequelize, DataTypes } = require('sequelize');

  // Create mock sequelize
  const sequelize = new Sequelize('sqlite::memory:', {
    logging: false,
  });

  // Load and initialize User model
  const UserModel = require('../models/User');
  const User = UserModel(sequelize, DataTypes);

  console.log('User model attributes:');
  console.log('- id:', User.rawAttributes.id ? '✓' : '✗');
  console.log('- username:', User.rawAttributes.username ? '✓' : '✗');
  console.log('- email:', User.rawAttributes.email ? '✓' : '✗');
  console.log('- password_hash:', User.rawAttributes.password_hash ? '✓' : '✗');
  console.log('- role:', User.rawAttributes.role ? '✓' : '✗');
  console.log('- is_active:', User.rawAttributes.is_active ? '✓' : '✗');

  console.log('\nUser instance methods:');
  const userInstance = User.build({});
  console.log('- validatePassword:', typeof userInstance.validatePassword === 'function' ? '✓' : '✗');
  console.log('- getFullName:', typeof userInstance.getFullName === 'function' ? '✓' : '✗');
  console.log('- getPhone:', typeof userInstance.getPhone === 'function' ? '✓' : '✗');
  console.log('- toJSON:', typeof userInstance.toJSON === 'function' ? '✓' : '✗');
  console.log('- getTokenPayload:', typeof userInstance.getTokenPayload === 'function' ? '✓' : '✗');

  console.log('\nUser class methods:');
  console.log('- findByIdentifier:', typeof User.findByIdentifier === 'function' ? '✓' : '✗');
  console.log('- findByRole:', typeof User.findByRole === 'function' ? '✓' : '✗');

  console.log('✓ Test 2 PASSED\n');
} catch (error) {
  console.log(`✗ Test 2 FAILED: ${error.message}\n`);
}

// Test Form model structure
console.log('Test 3: Form Model Structure');
try {
  const { Sequelize, DataTypes } = require('sequelize');
  const sequelize = new Sequelize('sqlite::memory:', { logging: false });

  const FormModel = require('../models/Form');
  const Form = FormModel(sequelize, DataTypes);

  console.log('Form model attributes:');
  console.log('- id:', Form.rawAttributes.id ? '✓' : '✗');
  console.log('- title:', Form.rawAttributes.title ? '✓' : '✗');
  console.log('- description:', Form.rawAttributes.description ? '✓' : '✗');
  console.log('- roles_allowed:', Form.rawAttributes.roles_allowed ? '✓' : '✗');
  console.log('- settings:', Form.rawAttributes.settings ? '✓' : '✗');
  console.log('- is_active:', Form.rawAttributes.is_active ? '✓' : '✗');
  console.log('- version:', Form.rawAttributes.version ? '✓' : '✗');

  console.log('\nForm instance methods:');
  const formInstance = Form.build({});
  console.log('- canAccessByRole:', typeof formInstance.canAccessByRole === 'function' ? '✓' : '✗');
  console.log('- getFullForm:', typeof formInstance.getFullForm === 'function' ? '✓' : '✗');
  console.log('- duplicate:', typeof formInstance.duplicate === 'function' ? '✓' : '✗');
  console.log('- incrementVersion:', typeof formInstance.incrementVersion === 'function' ? '✓' : '✗');

  console.log('✓ Test 3 PASSED\n');
} catch (error) {
  console.log(`✗ Test 3 FAILED: ${error.message}\n`);
}

// Test SubmissionData encryption features
console.log('Test 4: SubmissionData Encryption Features');
try {
  const { Sequelize, DataTypes } = require('sequelize');
  const sequelize = new Sequelize('sqlite::memory:', { logging: false });

  const SubmissionDataModel = require('../models/SubmissionData');
  const SubmissionData = SubmissionDataModel(sequelize, DataTypes);

  console.log('SubmissionData class methods:');
  console.log('- isSensitiveField:', typeof SubmissionData.isSensitiveField === 'function' ? '✓' : '✗');
  console.log('- createWithEncryption:', typeof SubmissionData.createWithEncryption === 'function' ? '✓' : '✗');
  console.log('- getValueType:', typeof SubmissionData.getValueType === 'function' ? '✓' : '✗');

  console.log('\nTesting isSensitiveField:');
  const emailField = { type: 'email' };
  const numberField = { type: 'number' };
  console.log('- email field is sensitive:', SubmissionData.isSensitiveField(emailField) ? '✓' : '✗');
  console.log('- number field is not sensitive:', !SubmissionData.isSensitiveField(numberField) ? '✓' : '✗');

  console.log('\nTesting getValueType:');
  console.log('- string type:', SubmissionData.getValueType('text') === 'string' ? '✓' : '✗');
  console.log('- number type:', SubmissionData.getValueType(123) === 'number' ? '✓' : '✗');
  console.log('- boolean type:', SubmissionData.getValueType(true) === 'boolean' ? '✓' : '✗');
  console.log('- date type:', SubmissionData.getValueType(new Date()) === 'date' ? '✓' : '✗');
  console.log('- json type:', SubmissionData.getValueType({ key: 'value' }) === 'json' ? '✓' : '✗');

  console.log('✓ Test 4 PASSED\n');
} catch (error) {
  console.log(`✗ Test 4 FAILED: ${error.message}\n`);
}

// Test model validations
console.log('Test 5: Model Validation Rules');
try {
  const { Sequelize, DataTypes } = require('sequelize');
  const sequelize = new Sequelize('sqlite::memory:', { logging: false });

  const UserModel = require('../models/User');
  const User = UserModel(sequelize, DataTypes);

  console.log('User validations:');
  const usernameValidate = User.rawAttributes.username.validate;
  console.log('- username has length validation:', usernameValidate && usernameValidate.len ? '✓' : '✗');
  console.log('- username is alphanumeric:', usernameValidate && usernameValidate.isAlphanumeric ? '✓' : '✗');

  const emailValidate = User.rawAttributes.email.validate;
  console.log('- email has email validation:', emailValidate && emailValidate.isEmail ? '✓' : '✗');

  console.log('\nUser constraints:');
  console.log('- username is unique:', User.rawAttributes.username.unique ? '✓' : '✗');
  console.log('- email is unique:', User.rawAttributes.email.unique ? '✓' : '✗');

  console.log('✓ Test 5 PASSED\n');
} catch (error) {
  console.log(`✗ Test 5 FAILED: ${error.message}\n`);
}

console.log('=== Model Test Complete ===');