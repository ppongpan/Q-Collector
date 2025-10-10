/**
 * Delete ALL Forms and Dynamic Tables
 *
 * ⚠️ DANGER: This deletes EVERYTHING
 * - All forms
 * - All submissions
 * - All dynamic tables
 *
 * @version 0.7.7-dev
 * @date 2025-10-09
 */

const { Client } = require('pg');
require('dotenv').config();

// System tables to NEVER delete
const SYSTEM_TABLES = [
  'users', 'forms', 'sub_forms', 'fields', 'submissions', 'submission_data',
  'sessions', 'system_settings', 'api_keys', 'audit_logs', 'notifications',
  'telegram_logs', 'SequelizeMeta', 'translation_cache', 'api_usage',
  'field_migrations', 'field_data_backups', 'files', 'trusted_devices',
  'pg_stat_statements', 'spatial_ref_sys'
];

async function deleteAllForms() {
  const client = new Client({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'qcollector_db',
    user: process.env.POSTGRES_USER || 'qcollector',
    password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
  });

  try {
    await client.connect();
    console.log('\n🧹 Starting Complete Database Cleanup...\n');

    // Step 1: Get ALL forms
    console.log('📋 Step 1: Finding ALL forms to delete...');
    const formsQuery = `
      SELECT id, title, table_name
      FROM forms
      ORDER BY "createdAt";
    `;
    const formsResult = await client.query(formsQuery);

    console.log(`   Found ${formsResult.rows.length} forms to delete:`);
    formsResult.rows.forEach(form => {
      console.log(`   - ${form.title} (${form.id}) -> ${form.table_name || 'no table'}`);
    });

    // Step 2: Find ALL dynamic tables
    console.log('\n📋 Step 2: Finding ALL dynamic tables to delete...');
    const tablesQuery = `
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename NOT IN (${SYSTEM_TABLES.map((_, i) => `$${i + 1}`).join(', ')})
      ORDER BY tablename;
    `;
    const tablesResult = await client.query(tablesQuery, SYSTEM_TABLES);

    console.log(`   Found ${tablesResult.rows.length} dynamic tables to delete:`);
    tablesResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.tablename}`);
    });

    // Step 3: Show summary
    console.log('\n⚠️  DANGER ZONE ⚠️');
    console.log('This will permanently delete:');
    console.log(`   - ${formsResult.rows.length} forms (ALL FORMS)`);
    console.log(`   - ${tablesResult.rows.length} dynamic tables (ALL DYNAMIC TABLES)`);
    console.log('   - All submissions, fields, sub-forms');
    console.log('\nTo proceed, run: node delete-all-forms.js --confirm');

    // Check for --confirm flag
    if (!process.argv.includes('--confirm')) {
      console.log('\n❌ Aborted (no --confirm flag)');
      await client.end();
      process.exit(0);
    }

    // Step 4: Delete ALL forms and cascading data
    console.log('\n🗑️  Step 3: Deleting ALL forms...');
    await client.query('BEGIN');

    try {
      const deleteSubmissionData = await client.query('DELETE FROM submission_data');
      console.log(`   ✅ Deleted ${deleteSubmissionData.rowCount} submission_data records`);

      const deleteSubmissions = await client.query('DELETE FROM submissions');
      console.log(`   ✅ Deleted ${deleteSubmissions.rowCount} submissions`);

      const deleteFields = await client.query('DELETE FROM fields');
      console.log(`   ✅ Deleted ${deleteFields.rowCount} fields`);

      const deleteSubForms = await client.query('DELETE FROM sub_forms');
      console.log(`   ✅ Deleted ${deleteSubForms.rowCount} sub-forms`);

      const deleteBackups = await client.query('DELETE FROM field_data_backups');
      console.log(`   ✅ Deleted ${deleteBackups.rowCount} field data backups`);

      const deleteMigrations = await client.query('DELETE FROM field_migrations');
      console.log(`   ✅ Deleted ${deleteMigrations.rowCount} field migrations`);

      const deleteForms = await client.query('DELETE FROM forms');
      console.log(`   ✅ Deleted ${deleteForms.rowCount} forms`);

      await client.query('COMMIT');
      console.log(`\n✅ Deleted ALL forms and related data successfully`);

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error deleting forms:', error.message);
      throw error;
    }

    // Step 5: Delete ALL dynamic tables
    console.log('\n🗑️  Step 4: Deleting ALL dynamic tables...');
    let deletedCount = 0;
    for (const row of tablesResult.rows) {
      try {
        await client.query(`DROP TABLE IF EXISTS "${row.tablename}" CASCADE;`);
        console.log(`   ✅ Deleted table: ${row.tablename}`);
        deletedCount++;
      } catch (error) {
        console.error(`   ❌ Failed to delete ${row.tablename}:`, error.message);
      }
    }

    // Step 6: Verify cleanup
    console.log('\n📊 Step 5: Verifying cleanup...');
    const countForms = await client.query('SELECT COUNT(*) as count FROM forms');
    const countSubmissions = await client.query('SELECT COUNT(*) as count FROM submissions');
    const countFields = await client.query('SELECT COUNT(*) as count FROM fields');
    const countSubForms = await client.query('SELECT COUNT(*) as count FROM sub_forms');
    const countTables = await client.query(`
      SELECT COUNT(*) as count
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename NOT IN (${SYSTEM_TABLES.map((_, i) => `$${i + 1}`).join(', ')})
    `, SYSTEM_TABLES);

    console.log(`   Forms: ${countForms.rows[0].count} (should be 0)`);
    console.log(`   Submissions: ${countSubmissions.rows[0].count} (should be 0)`);
    console.log(`   Fields: ${countFields.rows[0].count} (should be 0)`);
    console.log(`   Sub-forms: ${countSubForms.rows[0].count} (should be 0)`);
    console.log(`   Dynamic tables: ${countTables.rows[0].count} (should be 0)`);

    const finalTables = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename NOT IN (${SYSTEM_TABLES.map((_, i) => `$${i + 1}`).join(', ')})
      ORDER BY tablename;
    `, SYSTEM_TABLES);

    if (finalTables.rows.length > 0) {
      console.log('\n⚠️  WARNING: Some dynamic tables still exist:');
      finalTables.rows.forEach(row => {
        console.log(`   - ${row.tablename}`);
      });
    } else {
      console.log('\n✅ All dynamic tables removed successfully!');
    }

    console.log('\n✅ Complete cleanup finished!');
    console.log('\nSummary:');
    console.log(`   ✅ Deleted ${formsResult.rows.length} forms`);
    console.log(`   ✅ Deleted ${deletedCount} dynamic tables`);
    console.log(`   ✅ Database is now clean and ready for testing`);

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

deleteAllForms();
