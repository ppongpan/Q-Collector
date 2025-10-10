/**
 * Cleanup Orphaned Sub-Form Tables (Auto Mode)
 *
 * This script removes dynamic sub-form tables that no longer have matching sub_forms records.
 *
 * Usage:
 *   node cleanup-orphaned-subform-tables-auto.js --dry-run    # Preview only
 *   node cleanup-orphaned-subform-tables-auto.js --execute    # Actually delete tables
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

async function cleanupOrphanedTables(executeMode = false) {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       Cleanup Orphaned Sub-Form Tables                    ║');
  console.log(`║       Mode: ${executeMode ? 'EXECUTE (Delete)' : 'DRY-RUN (Preview)'.padEnd(41)}║`);
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Get all sub-form tables from database
    const tablesResult = await pool.query(`
      SELECT tablename
      FROM pg_catalog.pg_tables
      WHERE schemaname = 'public'
        AND (tablename LIKE 'call_records_%'
             OR tablename LIKE 'save_edited_list_%'
             OR tablename LIKE 'first_form_%'
             OR tablename ~ '^[a-z_]+_[a-z0-9]{12}$')
      ORDER BY tablename
    `);

    console.log(`📋 Found ${tablesResult.rows.length} potential sub-form tables in database\n`);

    // Step 2: Get all sub-forms with table_name from sub_forms table
    const subFormsResult = await pool.query(`
      SELECT id, title, table_name
      FROM sub_forms
      WHERE table_name IS NOT NULL
      ORDER BY table_name
    `);

    // Also get main form tables
    const mainFormsResult = await pool.query(`
      SELECT id, title, table_name
      FROM forms
      WHERE table_name IS NOT NULL
      ORDER BY table_name
    `);

    console.log(`📋 Valid tables in database:\n`);
    console.log(`   Sub-forms: ${subFormsResult.rows.length} tables`);
    subFormsResult.rows.forEach(sf => {
      console.log(`      ✅ ${sf.table_name} (${sf.title})`);
    });
    console.log(`\n   Main forms: ${mainFormsResult.rows.length} tables`);
    mainFormsResult.rows.forEach(mf => {
      console.log(`      ✅ ${mf.table_name} (${mf.title})`);
    });
    console.log();

    // Step 3: Find orphaned tables
    const validTableNames = new Set([
      ...subFormsResult.rows.map(sf => sf.table_name),
      ...mainFormsResult.rows.map(mf => mf.table_name)
    ]);
    const orphanedTables = tablesResult.rows.filter(row => !validTableNames.has(row.tablename));

    if (orphanedTables.length === 0) {
      console.log('✅ No orphaned tables found. Database is clean!\n');
      return { success: true, droppedCount: 0 };
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

    if (!executeMode) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('                    DRY-RUN MODE                           ');
      console.log('═══════════════════════════════════════════════════════════\n');
      console.log('No tables were deleted. To actually delete these tables, run:\n');
      console.log('  node cleanup-orphaned-subform-tables-auto.js --execute\n');
      return { success: true, droppedCount: 0, preview: tablesToDrop };
    }

    // Step 5: Execute deletion
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    EXECUTE MODE                           ');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('🗑️  Dropping orphaned tables...\n');

    let droppedCount = 0;
    let failedCount = 0;

    for (const table of tablesToDrop) {
      try {
        await pool.query(`DROP TABLE IF EXISTS "${table.name}" CASCADE`);
        console.log(`   ✅ Dropped: ${table.name} (${table.rowCount} rows)`);
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

    return { success: true, droppedCount, failedCount };

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    return { success: false, error: error.message };
  } finally {
    await pool.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const executeMode = args.includes('--execute');
const dryRunMode = args.includes('--dry-run') || args.length === 0;

if (!executeMode && !dryRunMode) {
  console.log('Usage:');
  console.log('  node cleanup-orphaned-subform-tables-auto.js --dry-run    # Preview only (default)');
  console.log('  node cleanup-orphaned-subform-tables-auto.js --execute    # Actually delete tables');
  process.exit(1);
}

cleanupOrphanedTables(executeMode).catch(console.error);
