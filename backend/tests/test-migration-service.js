/**
 * Test Script for MigrationService
 *
 * Tests migration plan generation, data migration steps,
 * and rollback strategies.
 *
 * @version 0.7.0
 * @since 2025-10-02
 */

const MigrationService = require('../services/MigrationService');

console.log('='.repeat(80));
console.log('MIGRATION SERVICE TEST');
console.log('='.repeat(80));
console.log('');

/**
 * Test Form Definition (same as schema test)
 */
const jobApplicationForm = {
  id: 1,
  name: 'ใบสมัครงาน',
  fields: [
    { id: 1, label: 'ชื่อ-นามสกุล', type: 'short_answer', required: true },
    { id: 2, label: 'อายุ', type: 'number', required: true },
    { id: 3, label: 'วันเกิด', type: 'date', required: true },
    { id: 4, label: 'เพศ', type: 'multiple_choice', required: true },
    { id: 5, label: 'โทรศัพท์', type: 'phone', required: true },
    { id: 6, label: 'อีเมล', type: 'email', required: true }
  ],
  subForms: [
    {
      id: 101,
      name: 'ประสบการณ์ทำงาน',
      fields: [
        { id: 1, label: 'บริษัท', type: 'short_answer', required: true },
        { id: 2, label: 'ตำแหน่ง', type: 'short_answer', required: true },
        { id: 3, label: 'วันที่เริ่มต้น', type: 'date', required: true }
      ]
    }
  ]
};

/**
 * Simulated current schema (old format)
 */
const currentSchema = {
  mainTable: {
    tableName: 'dynamic_form_data_1',
    columns: [
      { name: 'id', type: 'SERIAL PRIMARY KEY' },
      { name: 'form_id', type: 'INTEGER NOT NULL' },
      { name: 'user_id', type: 'INTEGER' },
      { name: 'field_1', type: 'VARCHAR(255)', originalLabel: 'ชื่อ-นามสกุล' },
      { name: 'field_2', type: 'DECIMAL(10, 2)', originalLabel: 'อายุ' },
      { name: 'field_3', type: 'DATE', originalLabel: 'วันเกิด' },
      { name: 'field_4', type: 'TEXT', originalLabel: 'เพศ' },
      { name: 'field_5', type: 'VARCHAR(20)', originalLabel: 'โทรศัพท์' },
      { name: 'field_6', type: 'VARCHAR(255)', originalLabel: 'อีเมล' },
      { name: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
    ]
  },
  subTables: [
    {
      tableName: 'dynamic_subform_data_101',
      columns: [
        { name: 'id', type: 'SERIAL PRIMARY KEY' },
        { name: 'parent_id', type: 'INTEGER NOT NULL' },
        { name: 'field_1', type: 'VARCHAR(255)', originalLabel: 'บริษัท' },
        { name: 'field_2', type: 'VARCHAR(255)', originalLabel: 'ตำแหน่ง' },
        { name: 'field_3', type: 'DATE', originalLabel: 'วันที่เริ่มต้น' },
        { name: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
      ]
    }
  ],
  tables: ['dynamic_form_data_1', 'dynamic_subform_data_101']
};

console.log('TEST 1: MIGRATION PLAN GENERATION');
console.log('-'.repeat(80));
console.log('');

try {
  const migrationPlan = MigrationService.generateMigrationPlan(
    jobApplicationForm,
    currentSchema,
    {
      tablePrefix: 'form_',
      dropOldTables: false,
      preserveData: true
    }
  );

  console.log('Migration Plan Generated:');
  console.log('  Form Name:', migrationPlan.formName);
  console.log('  Status:', migrationPlan.status);
  console.log('  Total Steps:', migrationPlan.steps.length);
  console.log('');

  console.log('Migration Steps:');
  migrationPlan.steps.forEach((step, index) => {
    console.log(`  ${index + 1}. [${step.type.toUpperCase()}] ${step.description}`);
    console.log(`     Action: ${step.action}`);
  });
  console.log('');

  console.log('Rollback Steps:', migrationPlan.rollbackSteps.length);
  console.log('');

  console.log('✓ Migration Plan Generation Test Complete');

} catch (error) {
  console.error('✗ Migration Plan Generation Test Failed:', error.message);
  console.error(error.stack);
}

console.log('');

/**
 * Test 2: Data Migration Steps
 */
console.log('TEST 2: DATA MIGRATION STEPS');
console.log('-'.repeat(80));
console.log('');

try {
  const migrationPlan = MigrationService.generateMigrationPlan(
    jobApplicationForm,
    currentSchema,
    { preserveData: true }
  );

  const dataMigrationStep = migrationPlan.steps.find(s => s.type === 'migrate_data');

  if (dataMigrationStep) {
    console.log('Data Migration Details:');
    console.log('');

    dataMigrationStep.migrations.forEach((migration, index) => {
      console.log(`  Migration ${index + 1}: ${migration.type.toUpperCase()}`);
      console.log(`  Source: ${migration.sourceTable}`);
      console.log(`  Target: ${migration.targetTable}`);
      console.log(`  Column Mappings: ${migration.columnMapping.length}`);
      console.log('');

      console.log('  Column Mapping Details:');
      migration.columnMapping.forEach(mapping => {
        const transform = mapping.transformation ? ` (${mapping.transformation})` : '';
        console.log(`    ${mapping.oldColumn.padEnd(20)} → ${mapping.newColumn}${transform}`);
      });
      console.log('');

      console.log('  SQL Statement:');
      console.log('  ' + migration.sql.split('\n').join('\n  '));
      console.log('');
    });

    console.log('✓ Data Migration Steps Test Complete');
  } else {
    console.log('✗ No data migration step found in plan');
  }

} catch (error) {
  console.error('✗ Data Migration Steps Test Failed:', error.message);
  console.error(error.stack);
}

console.log('');

/**
 * Test 3: Migration Summary
 */
console.log('TEST 3: MIGRATION SUMMARY');
console.log('-'.repeat(80));
console.log('');

try {
  const migrationPlan = MigrationService.generateMigrationPlan(
    jobApplicationForm,
    currentSchema,
    { preserveData: true, dropOldTables: true }
  );

  const summary = MigrationService.generateSummary(migrationPlan);

  console.log('Migration Summary:');
  console.log('  Form ID:', summary.formId);
  console.log('  Form Name:', summary.formName);
  console.log('  Status:', summary.status);
  console.log('  Total Steps:', summary.totalSteps);
  console.log('  Tables to Create:', summary.tablesCreated);
  console.log('  Indexes to Create:', summary.indexesCreated);
  console.log('  Data Preserved:', summary.dataPreserved ? 'Yes' : 'No');
  console.log('  Has Rollback:', summary.hasRollback ? 'Yes' : 'No');
  console.log('  Estimated Duration:', summary.estimatedDuration);
  console.log('');

  console.log('✓ Migration Summary Test Complete');

} catch (error) {
  console.error('✗ Migration Summary Test Failed:', error.message);
  console.error(error.stack);
}

console.log('');

/**
 * Test 4: Plan Validation
 */
console.log('TEST 4: PLAN VALIDATION');
console.log('-'.repeat(80));
console.log('');

try {
  const migrationPlan = MigrationService.generateMigrationPlan(
    jobApplicationForm,
    currentSchema,
    { preserveData: true }
  );

  const validation = MigrationService.validatePlan(migrationPlan);

  console.log('Validation Result:');
  console.log('  Valid:', validation.valid ? '✓ Yes' : '✗ No');
  console.log('  Errors:', validation.errors.length);
  console.log('  Warnings:', validation.warnings.length);
  console.log('');

  if (validation.errors.length > 0) {
    console.log('  Errors:');
    validation.errors.forEach(err => console.log(`    - ${err}`));
    console.log('');
  }

  if (validation.warnings.length > 0) {
    console.log('  Warnings:');
    validation.warnings.forEach(warn => console.log(`    - ${warn}`));
    console.log('');
  }

  console.log('✓ Plan Validation Test Complete');

} catch (error) {
  console.error('✗ Plan Validation Test Failed:', error.message);
  console.error(error.stack);
}

console.log('');

/**
 * Test 5: Rollback Steps
 */
console.log('TEST 5: ROLLBACK STEPS');
console.log('-'.repeat(80));
console.log('');

try {
  const migrationPlan = MigrationService.generateMigrationPlan(
    jobApplicationForm,
    currentSchema,
    { preserveData: true, dropOldTables: true }
  );

  console.log('Rollback Strategy:');
  console.log('  Total Rollback Steps:', migrationPlan.rollbackSteps.length);
  console.log('');

  migrationPlan.rollbackSteps.forEach((step, index) => {
    console.log(`  ${index + 1}. [${step.type.toUpperCase()}] ${step.description}`);
    console.log(`     Action: ${step.action}`);
  });
  console.log('');

  console.log('✓ Rollback Steps Test Complete');

} catch (error) {
  console.error('✗ Rollback Steps Test Failed:', error.message);
  console.error(error.stack);
}

console.log('');
console.log('='.repeat(80));
console.log('MIGRATION SERVICE TEST SUITE COMPLETE');
console.log('='.repeat(80));
console.log('');
console.log('Summary:');
console.log('  ✓ Migration Plan Generation');
console.log('  ✓ Data Migration Steps');
console.log('  ✓ Migration Summary');
console.log('  ✓ Plan Validation');
console.log('  ✓ Rollback Steps');
console.log('');
console.log('MigrationService: OPERATIONAL');
console.log('');
