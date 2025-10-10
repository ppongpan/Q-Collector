/**
 * Cleanup Unused Dynamic Tables
 *
 * This script finds and optionally deletes dynamic tables that are not
 * associated with any active forms in the system.
 */

require('dotenv').config();
const { Pool } = require('pg');
const readline = require('readline');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

// System tables that should NEVER be deleted
const PROTECTED_TABLES = [
  'users',
  'forms',
  'fields',
  'submissions',
  'submission_data',
  'sub_forms',
  'files',
  'audit_logs',
  'sessions',
  'notifications',
  'settings',
  'roles',
  'permissions',
  'SequelizeMeta',
  'SequelizeData',
  'telegram_notifications',
  'telegram_templates',
  'trusted_devices'
];

async function cleanupUnusedTables() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          Cleanup Unused Dynamic Tables                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Get all tables in the database
    console.log('📋 Step 1: Scanning all tables in database...\n');

    const allTables = await pool.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    console.log(`Found ${allTables.rows.length} tables in database\n`);

    // Step 2: Get table names from active forms and sub-forms
    console.log('📊 Step 2: Getting active form table names...\n');

    const activeForms = await pool.query(`
      SELECT id, title, table_name, is_active
      FROM forms
      WHERE is_active = true;
    `);

    const activeSubForms = await pool.query(`
      SELECT id, title, table_name
      FROM sub_forms;
    `);

    console.log(`Active Forms: ${activeForms.rows.length}`);
    for (const form of activeForms.rows) {
      console.log(`   - ${form.title}: ${form.table_name}`);
    }
    console.log('');

    console.log(`Active Sub-Forms: ${activeSubForms.rows.length}`);
    for (const subForm of activeSubForms.rows) {
      console.log(`   - ${subForm.title}: ${subForm.table_name}`);
    }
    console.log('');

    // Collect all protected table names
    const protectedTableSet = new Set([
      ...PROTECTED_TABLES.map(t => t.toLowerCase()),
      ...activeForms.rows.map(f => f.table_name).filter(Boolean),
      ...activeSubForms.rows.map(sf => sf.table_name).filter(Boolean)
    ]);

    console.log(`Protected tables count: ${protectedTableSet.size}\n`);

    // Step 3: Identify unused dynamic tables
    console.log('🔍 Step 3: Identifying unused dynamic tables...\n');

    const unusedTables = [];

    for (const table of allTables.rows) {
      const tableName = table.tablename.toLowerCase();

      // Skip if it's a protected table
      if (protectedTableSet.has(tableName)) {
        continue;
      }

      // Check if it looks like a dynamic table (contains underscore and UUID suffix)
      const isDynamicTable = /^[a-z_]+_[a-f0-9]{8,}$/.test(tableName);

      if (isDynamicTable) {
        // Get row count
        const countResult = await pool.query(`
          SELECT COUNT(*) as count FROM "${table.tablename}";
        `);

        unusedTables.push({
          name: table.tablename,
          rowCount: parseInt(countResult.rows[0].count)
        });
      }
    }

    if (unusedTables.length === 0) {
      console.log('✅ No unused dynamic tables found! Database is clean.\n');
      return;
    }

    console.log(`⚠️  Found ${unusedTables.length} unused dynamic tables:\n`);

    let totalRows = 0;
    for (const table of unusedTables) {
      console.log(`   - ${table.name} (${table.rowCount} rows)`);
      totalRows += table.rowCount;
    }
    console.log(`\n   Total rows in unused tables: ${totalRows}\n`);

    // Step 4: Ask for confirmation
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    ⚠️  WARNING ⚠️');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`This will DELETE ${unusedTables.length} tables and ${totalRows} rows permanently!\n`);
    console.log('This action CANNOT be undone.\n');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question('Type "DELETE" to confirm deletion, or anything else to cancel: ', resolve);
    });

    rl.close();

    if (answer.trim() !== 'DELETE') {
      console.log('\n❌ Deletion cancelled. No changes were made.\n');
      return;
    }

    // Step 5: Delete unused tables
    console.log('\n🗑️  Deleting unused tables...\n');

    let deletedCount = 0;
    let failedCount = 0;

    for (const table of unusedTables) {
      try {
        await pool.query(`DROP TABLE IF EXISTS "${table.name}" CASCADE;`);
        console.log(`   ✅ Deleted: ${table.name}`);
        deletedCount++;
      } catch (error) {
        console.log(`   ❌ Failed: ${table.name} - ${error.message}`);
        failedCount++;
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('                         SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`✅ Successfully deleted: ${deletedCount} tables`);
    console.log(`❌ Failed to delete: ${failedCount} tables`);
    console.log(`📊 Total rows deleted: ~${totalRows}\n`);

    if (deletedCount > 0) {
      console.log('✅ Database cleanup completed successfully!\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await pool.end();
  }
}

cleanupUnusedTables().catch(console.error);
