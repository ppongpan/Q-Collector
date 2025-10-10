/**
 * Delete All Forms Script
 * Safely deletes all forms, sub-forms, and their dynamic tables
 *
 * PROTECTED TABLES (WILL NOT DELETE):
 * - System tables: forms, users, fields, submissions, audit_logs, etc.
 * - App tables: submission_data, system_settings, translation_cache
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

// Protected tables that should NEVER be deleted
const PROTECTED_TABLES = [
  // System tables (core database structure)
  'forms',
  'users',
  'sub_forms',
  'fields',
  'submissions',
  'audit_logs',
  'SequelizeMeta',
  'sessions',
  'telegram_notifications',
  'telegram_queue',
  'trusted_devices',

  // App tables (important data)
  'submission_data',
  'system_settings',
  'translation_cache'
];

async function confirmAction(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function deleteAllForms() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           Delete All Forms - Safety Check                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Get all forms
    const formsResult = await pool.query('SELECT id, title, table_name FROM forms ORDER BY "createdAt" DESC;');
    console.log(`📋 Forms to Delete: ${formsResult.rows.length}\n`);

    if (formsResult.rows.length === 0) {
      console.log('✅ No forms to delete!\n');
      await pool.end();
      return;
    }

    formsResult.rows.forEach((form, i) => {
      console.log(`${i+1}. ${form.title}`);
      console.log(`   Table: ${form.table_name || 'NULL'}`);
    });

    // Step 2: Get all sub-forms
    const subFormsResult = await pool.query('SELECT id, title, table_name FROM sub_forms;');
    console.log(`\n📋 Sub-Forms to Delete: ${subFormsResult.rows.length}\n`);

    subFormsResult.rows.forEach((sf, i) => {
      console.log(`${i+1}. ${sf.title}`);
      console.log(`   Table: ${sf.table_name || 'NULL'}`);
    });

    // Step 3: Get all dynamic tables
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const allTables = tablesResult.rows.map(r => r.table_name);
    const dynamicTables = allTables.filter(name => !PROTECTED_TABLES.includes(name));

    console.log(`\n📋 Dynamic Tables to Delete: ${dynamicTables.length}\n`);
    dynamicTables.forEach((table, i) => {
      console.log(`${i+1}. ${table}`);
    });

    // Step 4: Show protected tables (will NOT delete)
    console.log(`\n🛡️  Protected Tables (WILL NOT DELETE): ${PROTECTED_TABLES.length}\n`);
    PROTECTED_TABLES.forEach((table, i) => {
      const exists = allTables.includes(table);
      console.log(`${i+1}. ${table} ${exists ? '✅' : '❌'}`);
    });

    // Step 5: Confirm deletion
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                  ⚠️  WARNING                               ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log('This will DELETE:');
    console.log(`  - ${formsResult.rows.length} Forms`);
    console.log(`  - ${subFormsResult.rows.length} Sub-Forms`);
    console.log(`  - ${dynamicTables.length} Dynamic Tables`);
    console.log(`  - All related fields and submissions\n`);
    console.log('This will PRESERVE:');
    console.log(`  - ${PROTECTED_TABLES.length} System & App tables`);
    console.log(`  - User accounts`);
    console.log(`  - System settings\n`);

    const confirmed = await confirmAction('Are you sure you want to DELETE ALL FORMS? (yes/no): ');

    if (!confirmed) {
      console.log('\n❌ Deletion cancelled by user.\n');
      await pool.end();
      return;
    }

    console.log('\n🗑️  Starting deletion process...\n');

    // Step 6: Delete dynamic tables (CASCADE will handle foreign keys)
    console.log('1️⃣  Deleting dynamic tables...');
    let deletedTables = 0;

    for (const tableName of dynamicTables) {
      try {
        await pool.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE;`);
        console.log(`   ✅ Deleted: ${tableName}`);
        deletedTables++;
      } catch (error) {
        console.error(`   ❌ Failed to delete ${tableName}:`, error.message);
      }
    }

    // Step 7: Delete form records (CASCADE will delete fields, sub_forms)
    console.log('\n2️⃣  Deleting form records...');
    const deleteFormsResult = await pool.query('DELETE FROM forms RETURNING id;');
    console.log(`   ✅ Deleted ${deleteFormsResult.rowCount} form records`);

    // Step 8: Clear any orphaned records
    console.log('\n3️⃣  Cleaning up orphaned records...');

    const deleteFieldsResult = await pool.query('DELETE FROM fields WHERE form_id NOT IN (SELECT id FROM forms) RETURNING id;');
    console.log(`   ✅ Deleted ${deleteFieldsResult.rowCount} orphaned fields`);

    const deleteSubFormsResult = await pool.query('DELETE FROM sub_forms WHERE form_id NOT IN (SELECT id FROM forms) RETURNING id;');
    console.log(`   ✅ Deleted ${deleteSubFormsResult.rowCount} orphaned sub-forms`);

    const deleteSubmissionsResult = await pool.query('DELETE FROM submissions WHERE form_id NOT IN (SELECT id FROM forms) RETURNING id;');
    console.log(`   ✅ Deleted ${deleteSubmissionsResult.rowCount} orphaned submissions`);

    // Step 9: Summary
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ Deletion Complete                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`   Dynamic Tables Deleted: ${deletedTables}`);
    console.log(`   Form Records Deleted: ${deleteFormsResult.rowCount}`);
    console.log(`   Orphaned Fields Deleted: ${deleteFieldsResult.rowCount}`);
    console.log(`   Orphaned Sub-Forms Deleted: ${deleteSubFormsResult.rowCount}`);
    console.log(`   Orphaned Submissions Deleted: ${deleteSubmissionsResult.rowCount}\n`);

    console.log('✅ All forms have been successfully deleted!');
    console.log('✅ System tables are intact.');
    console.log('✅ User accounts are preserved.\n');

  } catch (error) {
    console.error('\n❌ Error during deletion:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
  } finally {
    await pool.end();
  }
}

// Run deletion
console.log('Checking forms to delete...\n');
deleteAllForms().catch(console.error);
