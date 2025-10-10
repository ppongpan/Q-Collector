/**
 * Delete All Submissions and Sub-Form Data
 *
 * Purpose:
 * - Clean slate for testing the main_form_subid fix
 * - Deletes all submissions from submissions table
 * - Deletes all data from sub-form dynamic tables
 * - Keeps forms intact (only deletes submission data)
 *
 * Usage:
 *   node backend/scripts/delete-all-submissions-and-subforms.js
 *   node backend/scripts/delete-all-submissions-and-subforms.js --dry-run  # Preview only
 */

const { Pool } = require('pg');
const { Submission, Form } = require('../models');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

const isDryRun = process.argv.includes('--dry-run');

async function findAllDynamicTables() {
  console.log('🔍 Finding all dynamic tables (main forms + sub-forms)...\n');

  const query = `
    SELECT table_name, table_type
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND (
        table_name LIKE 'form_%'
        OR table_name LIKE 'sub_form_%'
        OR table_name LIKE '%_subform_%'
        OR table_name LIKE 'service_log_%'
      )
      AND table_name NOT IN ('forms', 'fields', 'submissions', 'users', 'files')
    ORDER BY
      CASE
        WHEN table_name LIKE 'sub_form_%' OR table_name LIKE '%_subform_%' OR table_name LIKE 'service_log_%' THEN 1
        ELSE 2
      END,
      table_name;
  `;

  const result = await pool.query(query);
  return result.rows.map(row => ({
    name: row.table_name,
    isSubForm: row.table_name.includes('sub_form_') ||
               row.table_name.includes('_subform_') ||
               row.table_name.includes('service_log_')
  }));
}

async function getRowCount(tableName) {
  try {
    const result = await pool.query(`SELECT COUNT(*) FROM "${tableName}"`);
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error(`   ❌ Error counting rows in ${tableName}:`, error.message);
    return 0;
  }
}

async function deleteTableData(tableName, isSubForm) {
  try {
    const beforeCount = await getRowCount(tableName);

    if (beforeCount === 0) {
      console.log(`   ⏭️  ${tableName} is already empty`);
      return { before: 0, after: 0, deleted: 0 };
    }

    console.log(`   📊 ${tableName} has ${beforeCount} rows`);

    if (isDryRun) {
      console.log(`   [DRY RUN] Would delete ${beforeCount} rows`);
      return { before: beforeCount, after: beforeCount, deleted: 0 };
    }

    // Delete all rows
    await pool.query(`DELETE FROM "${tableName}"`);

    const afterCount = await getRowCount(tableName);
    const deleted = beforeCount - afterCount;

    console.log(`   ✅ Deleted ${deleted} rows from ${tableName}`);
    return { before: beforeCount, after: afterCount, deleted };

  } catch (error) {
    console.error(`   ❌ Error deleting from ${tableName}:`, error.message);
    return { before: 0, after: 0, deleted: 0, error: error.message };
  }
}

async function deleteSubmissionsTable() {
  console.log('\n📊 Deleting from submissions table...');

  try {
    const beforeCount = await pool.query('SELECT COUNT(*) FROM submissions');
    const count = parseInt(beforeCount.rows[0].count);

    if (count === 0) {
      console.log('   ⏭️  Submissions table is already empty');
      return { before: 0, after: 0, deleted: 0 };
    }

    console.log(`   📊 Found ${count} submissions`);

    if (isDryRun) {
      console.log(`   [DRY RUN] Would delete ${count} submissions`);
      return { before: count, after: count, deleted: 0 };
    }

    // Delete all submissions (CASCADE will handle related data)
    await pool.query('DELETE FROM submissions');

    const afterCount = await pool.query('SELECT COUNT(*) FROM submissions');
    const after = parseInt(afterCount.rows[0].count);
    const deleted = count - after;

    console.log(`   ✅ Deleted ${deleted} submissions`);
    return { before: count, after, deleted };

  } catch (error) {
    console.error('   ❌ Error deleting submissions:', error.message);
    return { before: 0, after: 0, deleted: 0, error: error.message };
  }
}

async function deleteFilesTable() {
  console.log('\n📊 Deleting from files table...');

  try {
    const beforeCount = await pool.query('SELECT COUNT(*) FROM files');
    const count = parseInt(beforeCount.rows[0].count);

    if (count === 0) {
      console.log('   ⏭️  Files table is already empty');
      return { before: 0, after: 0, deleted: 0 };
    }

    console.log(`   📊 Found ${count} file records`);

    if (isDryRun) {
      console.log(`   [DRY RUN] Would delete ${count} file records`);
      return { before: count, after: count, deleted: 0 };
    }

    // Delete all file records
    await pool.query('DELETE FROM files');

    const afterCount = await pool.query('SELECT COUNT(*) FROM files');
    const after = parseInt(afterCount.rows[0].count);
    const deleted = count - after;

    console.log(`   ✅ Deleted ${deleted} file records`);
    return { before: count, after, deleted };

  } catch (error) {
    console.error('   ❌ Error deleting files:', error.message);
    return { before: 0, after: 0, deleted: 0, error: error.message };
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║   Delete All Submissions and Sub-Form Data                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  } else {
    console.log('⚠️  WARNING: This will delete ALL submission data!\n');
  }

  try {
    // Find all dynamic tables
    const tables = await findAllDynamicTables();

    if (tables.length === 0) {
      console.log('✅ No dynamic tables found');
    } else {
      console.log(`📊 Found ${tables.length} dynamic tables:`);

      const subFormTables = tables.filter(t => t.isSubForm);
      const mainFormTables = tables.filter(t => !t.isSubForm);

      console.log(`   📊 Main form tables: ${mainFormTables.length}`);
      console.log(`   📊 Sub-form tables: ${subFormTables.length}\n`);

      // Step 1: Delete sub-form data first
      console.log('🗑️  Step 1: Deleting sub-form data...\n');

      let subFormStats = {
        total: 0,
        deleted: 0,
        errors: 0
      };

      for (const table of subFormTables) {
        const result = await deleteTableData(table.name, true);
        subFormStats.total += result.before;
        subFormStats.deleted += result.deleted;
        if (result.error) subFormStats.errors++;
      }

      // Step 2: Delete main form data
      console.log('\n🗑️  Step 2: Deleting main form data...\n');

      let mainFormStats = {
        total: 0,
        deleted: 0,
        errors: 0
      };

      for (const table of mainFormTables) {
        const result = await deleteTableData(table.name, false);
        mainFormStats.total += result.before;
        mainFormStats.deleted += result.deleted;
        if (result.error) mainFormStats.errors++;
      }

      // Step 3: Delete from submissions table
      const submissionStats = await deleteSubmissionsTable();

      // Step 4: Delete from files table
      const filesStats = await deleteFilesTable();

      // Print summary
      console.log('\n╔════════════════════════════════════════════════════════════════╗');
      console.log('║   Summary                                                      ║');
      console.log('╚════════════════════════════════════════════════════════════════╝\n');

      console.log('📊 Sub-Form Tables:');
      console.log(`   Total tables:    ${subFormTables.length}`);
      console.log(`   Total rows:      ${subFormStats.total}`);
      console.log(`   Deleted:         ${subFormStats.deleted}`);
      console.log(`   Errors:          ${subFormStats.errors}\n`);

      console.log('📊 Main Form Tables:');
      console.log(`   Total tables:    ${mainFormTables.length}`);
      console.log(`   Total rows:      ${mainFormStats.total}`);
      console.log(`   Deleted:         ${mainFormStats.deleted}`);
      console.log(`   Errors:          ${mainFormStats.errors}\n`);

      console.log('📊 Submissions Table:');
      console.log(`   Total rows:      ${submissionStats.before}`);
      console.log(`   Deleted:         ${submissionStats.deleted}\n`);

      console.log('📊 Files Table:');
      console.log(`   Total rows:      ${filesStats.before}`);
      console.log(`   Deleted:         ${filesStats.deleted}\n`);

      const totalDeleted = subFormStats.deleted + mainFormStats.deleted + submissionStats.deleted + filesStats.deleted;
      console.log(`🎯 Total rows deleted: ${totalDeleted}`);

      if (isDryRun && totalDeleted > 0) {
        console.log('\n💡 Run without --dry-run to apply these deletions');
      } else if (totalDeleted > 0) {
        console.log('\n✅ All data deleted successfully!');
        console.log('📋 Forms are intact - you can create new submissions');
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
