/**
 * Database Cleanup Script (Direct SQL)
 *
 * Tasks:
 * 1. Delete all forms except My Form 2
 * 2. Delete all dynamic tables except my_form_2_ab877066fdc9
 *
 * @version 0.7.3-dev
 * @date 2025-10-06
 */

const { Client } = require('pg');
require('dotenv').config();

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
  const client = new Client({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'qcollector_db',
    user: process.env.POSTGRES_USER || 'qcollector',
    password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
  });

  try {
    await client.connect();
    console.log('\n🧹 Starting Database Cleanup...\n');

    // Step 1: Get all forms except My Form 2
    console.log('📋 Step 1: Finding forms to delete...');
    const formsQuery = `
      SELECT id, title
      FROM forms
      WHERE id != $1
      ORDER BY "createdAt";
    `;
    const formsResult = await client.query(formsQuery, [MY_FORM_2_ID]);

    console.log(`   Found ${formsResult.rows.length} forms to delete:`);
    formsResult.rows.forEach(form => {
      console.log(`   - ${form.title} (${form.id})`);
    });

    // Step 2: Find dynamic tables to delete
    console.log('\n📋 Step 2: Finding dynamic tables to delete...');
    const tablesQuery = `
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename NOT IN (${SYSTEM_TABLES.map((t, i) => `$${i + 1}`).join(', ')})
      AND tablename != 'my_form_2_ab877066fdc9'
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
    console.log(`   - ${formsResult.rows.length} forms (and all their data)`);
    console.log(`   - ${tablesResult.rows.length} dynamic tables`);
    console.log('   - Keep: My Form 2 and my_form_2_ab877066fdc9');
    console.log('\nTo proceed, run: node cleanup-database.js --confirm');

    // Check for --confirm flag
    if (!process.argv.includes('--confirm')) {
      console.log('\n❌ Aborted (no --confirm flag)');
      await client.end();
      process.exit(0);
    }

    // Step 4: Delete forms and cascading data
    console.log('\n🗑️  Step 3: Deleting forms...');
    await client.query('BEGIN');

    try {
      for (const form of formsResult.rows) {
        console.log(`   Deleting: ${form.title}...`);

        // Delete submission_data
        await client.query('DELETE FROM submission_data WHERE submission_id IN (SELECT id FROM submissions WHERE form_id = $1)', [form.id]);

        // Delete submissions
        await client.query('DELETE FROM submissions WHERE form_id = $1', [form.id]);

        // Delete fields
        await client.query('DELETE FROM fields WHERE form_id = $1', [form.id]);

        // Delete sub_forms
        await client.query('DELETE FROM sub_forms WHERE form_id = $1', [form.id]);

        // Delete the form
        await client.query('DELETE FROM forms WHERE id = $1', [form.id]);

        console.log(`   ✅ Deleted: ${form.title}`);
      }

      await client.query('COMMIT');
      console.log(`\n✅ Deleted ${formsResult.rows.length} forms successfully`);

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error deleting forms:', error.message);
      throw error;
    }

    // Step 5: Delete dynamic tables
    console.log('\n🗑️  Step 4: Deleting dynamic tables...');
    for (const row of tablesResult.rows) {
      try {
        await client.query(`DROP TABLE IF EXISTS "${row.tablename}" CASCADE;`);
        console.log(`   ✅ Deleted table: ${row.tablename}`);
      } catch (error) {
        console.error(`   ❌ Failed to delete ${row.tablename}:`, error.message);
      }
    }

    // Step 6: Verify remaining data
    console.log('\n📊 Step 5: Verifying cleanup...');
    const countForms = await client.query('SELECT COUNT(*) as count FROM forms');
    const countTables = await client.query(`
      SELECT COUNT(*) as count
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename NOT IN (${SYSTEM_TABLES.map((t, i) => `$${i + 1}`).join(', ')})
    `, SYSTEM_TABLES);

    console.log(`   Remaining forms: ${countForms.rows[0].count} (should be 1 or 2)`);
    console.log(`   Remaining dynamic tables: ${countTables.rows[0].count} (should be 1 or 2)`);

    // List remaining tables
    const finalTables = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename NOT IN (${SYSTEM_TABLES.map((t, i) => `$${i + 1}`).join(', ')})
      ORDER BY tablename;
    `, SYSTEM_TABLES);

    console.log('\n   Remaining dynamic tables:');
    finalTables.rows.forEach(row => {
      console.log(`   - ${row.tablename}`);
    });

    console.log('\n✅ Cleanup completed successfully!');
    console.log('\nSummary:');
    console.log(`   ✅ Deleted ${formsResult.rows.length} forms`);
    console.log(`   ✅ Deleted ${tablesResult.rows.length} dynamic tables`);
    console.log(`   ✅ Kept My Form 2 (${MY_FORM_2_ID})`);

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run cleanup
cleanup();
