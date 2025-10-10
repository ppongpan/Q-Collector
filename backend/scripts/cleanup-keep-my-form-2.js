/**
 * Comprehensive Cleanup Script
 *
 * Tasks:
 * 1. Delete all forms except My Form 2 (ID: 573e1f37-4cc4-4f3c-b303-ab877066fdc9)
 * 2. Delete all associated data (fields, submissions, submission_data)
 * 3. Delete all dynamic tables except my_form_2_ab877066fdc9
 *
 * @version 0.7.3-dev
 * @date 2025-10-06
 */

const { sequelize } = require('../config/database.config');
const Form = require('../models/Form');
const Field = require('../models/Field');
const Submission = require('../models/Submission');
const SubmissionData = require('../models/SubmissionData');
const SubForm = require('../models/SubForm');

// My Form 2 ID (must keep this)
const MY_FORM_2_ID = '573e1f37-4cc4-4f3c-b303-ab877066fdc9';

// System tables to never delete
const SYSTEM_TABLES = [
  'users', 'forms', 'sub_forms', 'fields', 'submissions', 'submission_data',
  'sessions', 'system_settings', 'api_keys', 'audit_logs', 'notifications',
  'telegram_logs', 'SequelizeMeta', 'translation_cache', 'api_usage',
  'pg_stat_statements'
];

async function cleanup() {
  try {
    console.log('\n🧹 Starting Comprehensive Cleanup...\n');

    // Step 1: Get all forms except My Form 2
    console.log('📋 Step 1: Finding forms to delete...');
    const formsToDelete = await Form.findAll({
      where: {
        id: {
          [sequelize.Sequelize.Op.ne]: MY_FORM_2_ID
        }
      },
      attributes: ['id', 'title', 'is_subform']
    });

    console.log(`   Found ${formsToDelete.length} forms to delete:`);
    formsToDelete.forEach(form => {
      console.log(`   - ${form.title} (${form.id}) ${form.is_subform ? '[SUB-FORM]' : ''}`);
    });

    if (formsToDelete.length === 0) {
      console.log('   ✅ No forms to delete (only My Form 2 exists)');
    }

    // Step 2: Find dynamic tables to delete
    console.log('\n📋 Step 2: Finding dynamic tables to delete...');
    const [dynamicTables] = await sequelize.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename NOT IN (${SYSTEM_TABLES.map(t => `'${t}'`).join(', ')})
      AND tablename != 'my_form_2_ab877066fdc9'
      ORDER BY tablename;
    `);

    console.log(`   Found ${dynamicTables.length} dynamic tables to delete:`);
    dynamicTables.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.tablename}`);
    });

    if (dynamicTables.length === 0) {
      console.log('   ✅ No dynamic tables to delete');
    }

    // Step 3: Confirm deletion
    console.log('\n⚠️  DANGER ZONE ⚠️');
    console.log('This will permanently delete:');
    console.log(`   - ${formsToDelete.length} forms (and all their data)`);
    console.log(`   - ${dynamicTables.length} dynamic tables`);
    console.log('   - Keep: My Form 2 and my_form_2_ab877066fdc9');
    console.log('\nTo proceed, run: node cleanup-keep-my-form-2.js --confirm');

    // Check for --confirm flag
    if (!process.argv.includes('--confirm')) {
      console.log('\n❌ Aborted (no --confirm flag)');
      process.exit(0);
    }

    // Step 4: Delete forms (cascade will delete fields, submissions, submission_data)
    console.log('\n🗑️  Step 3: Deleting forms...');
    const transaction = await sequelize.transaction();

    try {
      for (const form of formsToDelete) {
        console.log(`   Deleting: ${form.title}...`);

        // Delete fields first (cascade to submission_data)
        await Field.destroy({
          where: { form_id: form.id },
          transaction
        });

        // Delete submissions (cascade to submission_data)
        await Submission.destroy({
          where: { form_id: form.id },
          transaction
        });

        // Delete sub-forms
        await SubForm.destroy({
          where: { parent_form_id: form.id },
          transaction
        });

        // Delete the form
        await form.destroy({ transaction });

        console.log(`   ✅ Deleted: ${form.title}`);
      }

      await transaction.commit();
      console.log(`\n✅ Deleted ${formsToDelete.length} forms successfully`);

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error deleting forms:', error.message);
      throw error;
    }

    // Step 5: Delete dynamic tables
    console.log('\n🗑️  Step 4: Deleting dynamic tables...');
    for (const row of dynamicTables) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS "${row.tablename}" CASCADE;`);
        console.log(`   ✅ Deleted table: ${row.tablename}`);
      } catch (error) {
        console.error(`   ❌ Failed to delete ${row.tablename}:`, error.message);
      }
    }

    // Step 6: Verify remaining data
    console.log('\n📊 Step 5: Verifying cleanup...');
    const [remainingForms] = await sequelize.query('SELECT COUNT(*) as count FROM forms');
    const [remainingTables] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename NOT IN (${SYSTEM_TABLES.map(t => `'${t}'`).join(', ')})
    `);

    console.log(`   Remaining forms: ${remainingForms[0].count} (should be 1 or 2)`);
    console.log(`   Remaining dynamic tables: ${remainingTables[0].count} (should be 1 or 2)`);

    // List remaining tables
    const [finalTables] = await sequelize.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename NOT IN (${SYSTEM_TABLES.map(t => `'${t}'`).join(', ')})
      ORDER BY tablename;
    `);

    console.log('\n   Remaining dynamic tables:');
    finalTables.forEach(row => {
      console.log(`   - ${row.tablename}`);
    });

    console.log('\n✅ Cleanup completed successfully!');
    console.log('\nSummary:');
    console.log(`   ✅ Deleted ${formsToDelete.length} forms`);
    console.log(`   ✅ Deleted ${dynamicTables.length} dynamic tables`);
    console.log(`   ✅ Kept My Form 2 (${MY_FORM_2_ID})`);
    console.log(`   ✅ Kept my_form_2_ab877066fdc9 table`);

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run cleanup
cleanup();
