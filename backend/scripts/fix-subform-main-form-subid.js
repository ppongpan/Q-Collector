/**
 * Fix Sub-Form main_form_subid Values
 *
 * Problem:
 * - Some sub-form submissions have incorrect main_form_subid values
 * - This happened due to buggy query logic that used "OR form_id = $2 ORDER BY submitted_at DESC"
 * - Result: Sub-forms appear under wrong parent submissions
 *
 * Solution:
 * - For each sub-form submission, verify main_form_subid matches parent_id
 * - After ID sync fix (v0.7.0+), parent_id should equal main_form_subid
 * - Update any mismatches to use parent_id as the correct value
 *
 * Usage:
 *   node backend/scripts/fix-subform-main-form-subid.js
 *   node backend/scripts/fix-subform-main-form-subid.js --dry-run  # Preview changes only
 */

const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

// Parse command line arguments
const isDryRun = process.argv.includes('--dry-run');

async function findSubFormTables() {
  console.log('🔍 Finding all sub-form dynamic tables...\n');

  const query = `
    SELECT DISTINCT t.table_name
    FROM information_schema.tables t
    JOIN information_schema.columns c ON c.table_name = t.table_name
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.column_name = 'parent_id'
      AND c.table_schema = 'public'
      AND (
        t.table_name LIKE 'sub_form_%'
        OR t.table_name LIKE '%_subform_%'
        OR t.table_name LIKE 'service_log_%'
      )
    ORDER BY t.table_name;
  `;

  const result = await pool.query(query);
  return result.rows.map(row => row.table_name);
}

async function analyzeTable(tableName) {
  console.log(`\n📊 Analyzing ${tableName}...`);

  // Check if table has main_form_subid column
  const columnCheck = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
      AND column_name = 'main_form_subid';
  `, [tableName]);

  if (columnCheck.rows.length === 0) {
    console.log(`   ⏭️  Table ${tableName} doesn't have main_form_subid column, skipping`);
    return { total: 0, mismatches: 0, fixed: 0, errors: 0 };
  }

  // Get all rows with parent_id and main_form_subid
  const dataQuery = await pool.query(`
    SELECT id, parent_id, main_form_subid
    FROM "${tableName}"
    WHERE parent_id IS NOT NULL
    ORDER BY submitted_at;
  `);

  const rows = dataQuery.rows;
  const total = rows.length;
  let mismatches = 0;
  let fixed = 0;
  let errors = 0;

  console.log(`   📊 Total rows: ${total}`);

  if (total === 0) {
    console.log(`   ℹ️  No data to process`);
    return { total: 0, mismatches: 0, fixed: 0, errors: 0 };
  }

  // Check for mismatches
  const mismatchRows = rows.filter(row => row.parent_id !== row.main_form_subid);
  mismatches = mismatchRows.length;

  if (mismatches === 0) {
    console.log(`   ✅ All rows have correct main_form_subid values`);
    return { total, mismatches: 0, fixed: 0, errors: 0 };
  }

  console.log(`   ⚠️  Found ${mismatches} rows with incorrect main_form_subid:`);

  for (const row of mismatchRows) {
    console.log(`      Row ID: ${row.id}`);
    console.log(`         parent_id:      ${row.parent_id} ✅ (correct)`);
    console.log(`         main_form_subid: ${row.main_form_subid} ❌ (wrong)`);

    if (isDryRun) {
      console.log(`         [DRY RUN] Would update to: ${row.parent_id}`);
      fixed++;
    } else {
      try {
        // Update main_form_subid to match parent_id
        await pool.query(`
          UPDATE "${tableName}"
          SET main_form_subid = parent_id
          WHERE id = $1;
        `, [row.id]);

        console.log(`         ✅ Updated main_form_subid to ${row.parent_id}`);
        fixed++;
      } catch (error) {
        console.error(`         ❌ Failed to update: ${error.message}`);
        errors++;
      }
    }
  }

  return { total, mismatches, fixed, errors };
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║   Fix Sub-Form main_form_subid Values                         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  try {
    // Find all sub-form tables
    const tables = await findSubFormTables();

    if (tables.length === 0) {
      console.log('✅ No sub-form tables found');
      return;
    }

    console.log(`📊 Found ${tables.length} sub-form tables:`);
    tables.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table}`);
    });

    // Analyze and fix each table
    let totalStats = {
      total: 0,
      mismatches: 0,
      fixed: 0,
      errors: 0
    };

    for (const table of tables) {
      const stats = await analyzeTable(table);
      totalStats.total += stats.total;
      totalStats.mismatches += stats.mismatches;
      totalStats.fixed += stats.fixed;
      totalStats.errors += stats.errors;
    }

    // Print summary
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║   Summary                                                      ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    console.log(`📊 Tables processed:       ${tables.length}`);
    console.log(`📊 Total rows:             ${totalStats.total}`);
    console.log(`⚠️  Mismatches found:       ${totalStats.mismatches}`);
    console.log(`✅ Fixed:                  ${totalStats.fixed}`);
    console.log(`❌ Errors:                 ${totalStats.errors}`);

    if (isDryRun && totalStats.mismatches > 0) {
      console.log('\n💡 Run without --dry-run to apply these fixes');
    } else if (totalStats.fixed > 0) {
      console.log('\n✅ All fixes applied successfully!');
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
