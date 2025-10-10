/**
 * Cleanup Orphaned Sub-Form Tables
 *
 * This script removes dynamic sub-form tables that no longer have matching sub_forms records.
 * This happens when sub-forms were deleted/recreated with new IDs during form updates.
 *
 * IMPORTANT: This script will DROP tables permanently. Always backup your database first!
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

async function cleanupOrphanedTables() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       Cleanup Orphaned Sub-Form Tables                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Get all sub-form tables from database
    const tablesResult = await pool.query(`
      SELECT tablename
      FROM pg_catalog.pg_tables
      WHERE schemaname = 'public'
        AND (tablename LIKE 'call_records_%'
             OR tablename LIKE 'save_edited_list_%'
             OR tablename ~ '^[a-z_]+_[a-z0-9]{12}$')
      ORDER BY tablename
    `);

    console.log(`📋 Found ${tablesResult.rows.length} sub-form tables in database:\n`);

    // Step 2: Get all sub-forms with table_name from sub_forms table
    const subFormsResult = await pool.query(`
      SELECT id, title, table_name
      FROM sub_forms
      WHERE table_name IS NOT NULL
      ORDER BY table_name
    `);

    console.log(`📋 Found ${subFormsResult.rows.length} sub-forms in sub_forms table:\n`);
    subFormsResult.rows.forEach(sf => {
      console.log(`   ✅ ${sf.table_name} (${sf.title})`);
    });
    console.log();

    // Step 3: Find orphaned tables
    const validTableNames = new Set(subFormsResult.rows.map(sf => sf.table_name));
    const orphanedTables = tablesResult.rows.filter(row => !validTableNames.has(row.tablename));

    if (orphanedTables.length === 0) {
      console.log('✅ No orphaned tables found. Database is clean!\n');
      return;
    }

    console.log(`⚠️  Found ${orphanedTables.length} orphaned tables:\n`);

    // Step 4: Check row counts and display details
    const tablesToDrop = [];
    for (const table of orphanedTables) {
      const countResult = await pool.query(`SELECT COUNT(*) as count FROM "${table.tablename}"`);
      const rowCount = parseInt(countResult.rows[0].count);
      console.log(`   ❌ ${table.tablename}: ${rowCount} rows`);
      tablesToDrop.push({ name: table.tablename, rowCount });
    }
    console.log();

    // Step 5: Confirm deletion
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    ⚠️  WARNING ⚠️');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('This will PERMANENTLY DELETE the following tables:\n');
    tablesToDrop.forEach(t => {
      console.log(`  - ${t.name} (${t.rowCount} rows)`);
    });
    console.log('\nThis action CANNOT be undone.\n');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question('Type "DELETE ORPHANED TABLES" to confirm, or anything else to cancel: ', resolve);
    });

    rl.close();

    if (answer.trim() !== 'DELETE ORPHANED TABLES') {
      console.log('\n❌ Cleanup cancelled. No changes were made.\n');
      return;
    }

    // Step 6: Drop orphaned tables
    console.log('\n🗑️  Dropping orphaned tables...\n');

    let droppedCount = 0;
    let failedCount = 0;

    for (const table of tablesToDrop) {
      try {
        await pool.query(`DROP TABLE IF EXISTS "${table.name}" CASCADE`);
        console.log(`   ✅ Dropped: ${table.name}`);
        droppedCount++;
      } catch (error) {
        console.log(`   ❌ Failed to drop ${table.name}: ${error.message}`);
        failedCount++;
      }
    }

    console.log(`\n✅ Cleanup complete!`);
    console.log(`   Dropped: ${droppedCount} tables`);
    if (failedCount > 0) {
      console.log(`   Failed: ${failedCount} tables`);
    }
    console.log();

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await pool.end();
  }
}

cleanupOrphanedTables().catch(console.error);
