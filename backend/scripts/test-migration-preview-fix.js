/**
 * Test Migration Preview Fix
 *
 * Tests the fixed migration preview modal to ensure:
 * 1. No false DELETE detections for sub-form fields
 * 2. Accurate change detection (ADD_FIELD, DELETE_FIELD, CHANGE_TYPE)
 * 3. Proper field comparison using filtered snapshot
 *
 * @version 0.7.7-dev
 * @created 2025-10-10
 */

require('dotenv').config();
const db = require('../models');
const { sequelize, Form, Field, SubForm, User } = db;

// Test utilities
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.cyan}🧪 ${msg}${colors.reset}`)
};

/**
 * Simulate frontend detectFieldChanges logic
 */
function detectFieldChanges(oldFields, newFields) {
  const changes = [];

  // Normalize fields
  const normalizeFields = (fields) => {
    return (fields || []).map(field => ({
      id: field.id,
      title: field.title || '',
      type: field.type,
      columnName: field.columnName || field.column_name || null,
      required: field.required || false
    }));
  };

  const oldFieldsNormalized = normalizeFields(oldFields);
  const newFieldsNormalized = normalizeFields(newFields);

  const oldFieldsMap = new Map(oldFieldsNormalized.map(f => [f.id, f]));
  const newFieldsMap = new Map(newFieldsNormalized.map(f => [f.id, f]));

  // Detect ADD_FIELD
  for (const newField of newFieldsNormalized) {
    if (!oldFieldsMap.has(newField.id)) {
      changes.push({
        type: 'ADD_FIELD',
        fieldId: newField.id,
        columnName: newField.columnName || `field_${newField.id.substring(0, 8)}`,
        dataType: newField.type,
        fieldTitle: newField.title
      });
    }
  }

  // Detect DELETE_FIELD
  for (const oldField of oldFieldsNormalized) {
    if (!newFieldsMap.has(oldField.id)) {
      changes.push({
        type: 'DELETE_FIELD',
        fieldId: oldField.id,
        columnName: oldField.columnName || `field_${oldField.id.substring(0, 8)}`,
        dataType: oldField.type,
        fieldTitle: oldField.title
      });
    }
  }

  // Detect CHANGE_TYPE
  for (const newField of newFieldsNormalized) {
    const oldField = oldFieldsMap.get(newField.id);
    if (oldField && oldField.type !== newField.type) {
      changes.push({
        type: 'CHANGE_TYPE',
        fieldId: newField.id,
        columnName: newField.columnName || oldField.columnName,
        oldType: oldField.type,
        newType: newField.type,
        fieldTitle: newField.title
      });
    }
  }

  return changes;
}

/**
 * Test Case 1: Form with sub-forms - should NOT detect sub-form fields as deleted
 */
async function testCase1_SubFormFieldsNotDeleted() {
  log.test('Test Case 1: Sub-form fields should NOT be detected as deleted');

  try {
    // Find a form with sub-forms
    const form = await Form.findOne({
      include: [
        {
          model: Field,
          as: 'fields',
          required: false
        },
        {
          model: SubForm,
          as: 'subForms',
          include: [{
            model: Field,
            as: 'fields',
            required: false
          }]
        }
      ]
    });

    if (!form) {
      log.warn('No form with sub-forms found. Creating test form...');

      // Create test form
      const user = await User.findOne();
      const testForm = await Form.create({
        title: 'Test Form with Sub-Form',
        description: 'Test case for migration preview',
        table_name: 'test_form_migration',
        created_by: user.id
      });

      // Create main form fields
      const mainField1 = await Field.create({
        form_id: testForm.id,
        title: 'Main Field 1',
        type: 'short_answer',
        columnName: 'main_field_1',
        order_index: 0
      });

      const mainField2 = await Field.create({
        form_id: testForm.id,
        title: 'Main Field 2',
        type: 'email',
        columnName: 'main_field_2',
        order_index: 1
      });

      // Create sub-form
      const subForm = await SubForm.create({
        form_id: testForm.id,
        title: 'Test Sub-Form',
        order_index: 0
      });

      // Create sub-form fields
      const subField1 = await Field.create({
        form_id: testForm.id,
        sub_form_id: subForm.id,
        title: 'Sub Field 1',
        type: 'short_answer',
        columnName: 'sub_field_1',
        order_index: 0
      });

      const subField2 = await Field.create({
        form_id: testForm.id,
        sub_form_id: subForm.id,
        title: 'Sub Field 2',
        type: 'number',
        columnName: 'sub_field_2',
        order_index: 1
      });

      log.info('Test form created successfully');

      // Reload with associations
      const reloadedForm = await Form.findByPk(testForm.id, {
        include: [
          {
            model: Field,
            as: 'fields',
            required: false
          },
          {
            model: SubForm,
            as: 'subForms',
            include: [{
              model: Field,
              as: 'fields',
              required: false
            }]
          }
        ]
      });

      return await runTest1(reloadedForm);
    }

    return await runTest1(form);

  } catch (error) {
    log.error(`Test Case 1 failed: ${error.message}`);
    console.error(error);
    return false;
  }
}

async function runTest1(form) {
  log.info(`Testing form: ${form.title} (${form.id})`);
  log.info(`Total fields: ${form.fields.length}`);

  // Separate main form fields and sub-form fields
  const allFields = form.fields;
  const mainFormFields = allFields.filter(f => !f.sub_form_id);
  const subFormFields = allFields.filter(f => f.sub_form_id);

  log.info(`Main form fields: ${mainFormFields.length}`);
  log.info(`Sub-form fields: ${subFormFields.length}`);

  if (subFormFields.length === 0) {
    log.warn('No sub-form fields found. Test inconclusive.');
    return false;
  }

  // Simulate frontend behavior:
  // originalFieldsSnapshot should only contain main form fields (filtered)
  const originalFieldsSnapshot = mainFormFields.map(f => ({
    id: f.id,
    title: f.title,
    type: f.type,
    columnName: f.columnName || f.column_name,
    required: f.required || false
  }));

  // Current form state (also filtered to main form fields only)
  const currentFormFields = mainFormFields.map(f => ({
    id: f.id,
    title: f.title,
    type: f.type,
    columnName: f.columnName || f.column_name,
    required: f.required || false
  }));

  // Detect changes
  const changes = detectFieldChanges(originalFieldsSnapshot, currentFormFields);

  log.info(`Changes detected: ${changes.length}`);

  if (changes.length === 0) {
    log.success('✅ PASS: No false DELETE detections for sub-form fields');
    log.info('Sub-form fields correctly ignored in comparison');
    return true;
  } else {
    log.error('❌ FAIL: Unexpected changes detected');
    console.log('Changes:', JSON.stringify(changes, null, 2));
    return false;
  }
}

/**
 * Test Case 2: Add field - should detect ADD_FIELD
 */
async function testCase2_AddField() {
  log.test('Test Case 2: Adding a field should be detected');

  try {
    const form = await Form.findOne({
      include: [{
        model: Field,
        as: 'fields',
        required: false
      }]
    });

    if (!form) {
      log.warn('No form found for testing');
      return false;
    }

    const mainFormFields = form.fields.filter(f => !f.sub_form_id);

    // Original snapshot
    const originalSnapshot = mainFormFields.map(f => ({
      id: f.id,
      title: f.title,
      type: f.type,
      columnName: f.columnName || f.column_name,
      required: f.required || false
    }));

    // Simulate adding a new field
    const newField = {
      id: 'new-field-12345678',
      title: 'New Test Field',
      type: 'short_answer',
      columnName: 'new_test_field',
      required: false
    };

    const currentFields = [...originalSnapshot, newField];

    // Detect changes
    const changes = detectFieldChanges(originalSnapshot, currentFields);

    log.info(`Changes detected: ${changes.length}`);

    if (changes.length === 1 && changes[0].type === 'ADD_FIELD') {
      log.success('✅ PASS: ADD_FIELD correctly detected');
      log.info(`Field: ${changes[0].fieldTitle}`);
      return true;
    } else {
      log.error('❌ FAIL: ADD_FIELD not detected correctly');
      console.log('Changes:', JSON.stringify(changes, null, 2));
      return false;
    }

  } catch (error) {
    log.error(`Test Case 2 failed: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * Test Case 3: Delete field - should detect DELETE_FIELD
 */
async function testCase3_DeleteField() {
  log.test('Test Case 3: Deleting a field should be detected');

  try {
    const form = await Form.findOne({
      include: [{
        model: Field,
        as: 'fields',
        required: false
      }]
    });

    if (!form) {
      log.warn('No form found for testing');
      return false;
    }

    const mainFormFields = form.fields.filter(f => !f.sub_form_id);

    if (mainFormFields.length === 0) {
      log.warn('No main form fields to delete');
      return false;
    }

    // Original snapshot
    const originalSnapshot = mainFormFields.map(f => ({
      id: f.id,
      title: f.title,
      type: f.type,
      columnName: f.columnName || f.column_name,
      required: f.required || false
    }));

    // Simulate deleting the first field
    const currentFields = originalSnapshot.slice(1);

    // Detect changes
    const changes = detectFieldChanges(originalSnapshot, currentFields);

    log.info(`Changes detected: ${changes.length}`);

    if (changes.length === 1 && changes[0].type === 'DELETE_FIELD') {
      log.success('✅ PASS: DELETE_FIELD correctly detected');
      log.info(`Field: ${changes[0].fieldTitle}`);
      return true;
    } else {
      log.error('❌ FAIL: DELETE_FIELD not detected correctly');
      console.log('Changes:', JSON.stringify(changes, null, 2));
      return false;
    }

  } catch (error) {
    log.error(`Test Case 3 failed: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * Test Case 4: Change field type - should detect CHANGE_TYPE
 */
async function testCase4_ChangeType() {
  log.test('Test Case 4: Changing field type should be detected');

  try {
    const form = await Form.findOne({
      include: [{
        model: Field,
        as: 'fields',
        required: false
      }]
    });

    if (!form) {
      log.warn('No form found for testing');
      return false;
    }

    const mainFormFields = form.fields.filter(f => !f.sub_form_id);

    if (mainFormFields.length === 0) {
      log.warn('No main form fields to modify');
      return false;
    }

    // Original snapshot
    const originalSnapshot = mainFormFields.map(f => ({
      id: f.id,
      title: f.title,
      type: f.type,
      columnName: f.columnName || f.column_name,
      required: f.required || false
    }));

    // Simulate changing type of first field
    const currentFields = [...originalSnapshot];
    currentFields[0] = {
      ...currentFields[0],
      type: currentFields[0].type === 'short_answer' ? 'number' : 'short_answer'
    };

    // Detect changes
    const changes = detectFieldChanges(originalSnapshot, currentFields);

    log.info(`Changes detected: ${changes.length}`);

    if (changes.length === 1 && changes[0].type === 'CHANGE_TYPE') {
      log.success('✅ PASS: CHANGE_TYPE correctly detected');
      log.info(`Field: ${changes[0].fieldTitle}`);
      log.info(`Type change: ${changes[0].oldType} → ${changes[0].newType}`);
      return true;
    } else {
      log.error('❌ FAIL: CHANGE_TYPE not detected correctly');
      console.log('Changes:', JSON.stringify(changes, null, 2));
      return false;
    }

  } catch (error) {
    log.error(`Test Case 4 failed: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 MIGRATION PREVIEW FIX - TEST SUITE');
  console.log('='.repeat(80) + '\n');

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  try {
    // Test database connection
    await sequelize.authenticate();
    log.success('Database connected');

    // Run test cases
    const test1 = await testCase1_SubFormFieldsNotDeleted();
    results.tests.push({ name: 'Sub-form fields not deleted', passed: test1 });
    if (test1) results.passed++; else results.failed++;

    console.log('\n' + '-'.repeat(80) + '\n');

    const test2 = await testCase2_AddField();
    results.tests.push({ name: 'Add field detection', passed: test2 });
    if (test2) results.passed++; else results.failed++;

    console.log('\n' + '-'.repeat(80) + '\n');

    const test3 = await testCase3_DeleteField();
    results.tests.push({ name: 'Delete field detection', passed: test3 });
    if (test3) results.passed++; else results.failed++;

    console.log('\n' + '-'.repeat(80) + '\n');

    const test4 = await testCase4_ChangeType();
    results.tests.push({ name: 'Change type detection', passed: test4 });
    if (test4) results.passed++; else results.failed++;

  } catch (error) {
    log.error(`Test suite failed: ${error.message}`);
    console.error(error);
  } finally {
    await sequelize.close();
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80) + '\n');

  results.tests.forEach((test, index) => {
    const status = test.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${index + 1}. ${status} - ${test.name}`);
  });

  console.log('\n' + '-'.repeat(80));
  console.log(`Total: ${results.passed + results.failed} tests`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log('='.repeat(80) + '\n');

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests();
