const { Pool } = require('pg');
require('dotenv').config();

/**
 * Migration Script: Fix Factory Field Format
 *
 * Purpose: Convert factory field values from JSON format to plain text
 * Before:  {"โรงงานระยอง"}
 * After:   โรงงานระยอง
 *
 * Safe to run multiple times - only updates records matching pattern
 */

async function fixFactoryFieldFormat() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });

  try {
    console.log('🔍 Scanning for tables with factory fields...\n');

    // Find all columns that might be factory fields
    const columnsQuery = `
      SELECT DISTINCT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (
          column_name LIKE '%factory%'
          OR column_name LIKE '%affiliated%'
          OR column_name = 'factory_affiliated'
        )
        AND table_name NOT LIKE 'sequelize%'
      ORDER BY table_name;
    `;

    const { rows: columns } = await pool.query(columnsQuery);
    console.log(`✅ Found ${columns.length} columns to check:\n`);

    if (columns.length === 0) {
      console.log('ℹ️  No factory fields found in database');
      return;
    }

    let totalFixed = 0;
    let totalTables = 0;

    for (const { table_name, column_name } of columns) {
      console.log(`📋 Checking ${table_name}.${column_name}...`);

      // First, count how many records need fixing
      const countQuery = `
        SELECT COUNT(*) as count
        FROM "${table_name}"
        WHERE "${column_name}" ~ '^\\{"[^"]+"\\}$';
      `;

      const { rows: countResult } = await pool.query(countQuery);
      const needsFixing = parseInt(countResult[0].count);

      if (needsFixing === 0) {
        console.log(`   ℹ️  No records need fixing in ${table_name}.${column_name}`);
        console.log();
        continue;
      }

      console.log(`   🔧 Found ${needsFixing} records to fix...`);

      // Update records with JSON format to plain text
      // Pattern: {"value"} → value
      const updateQuery = `
        UPDATE "${table_name}"
        SET "${column_name}" = regexp_replace(
          "${column_name}",
          '^\\{"([^"]+)"\\}$',
          '\\1'
        )
        WHERE "${column_name}" ~ '^\\{"[^"]+"\\}$'
        RETURNING id, "${column_name}" as new_value;
      `;

      const { rows: updated, rowCount } = await pool.query(updateQuery);

      if (rowCount > 0) {
        console.log(`   ✅ Fixed ${rowCount} records in ${table_name}.${column_name}`);
        console.log(`   Example: "${updated[0].new_value}"`);
        totalFixed += rowCount;
        totalTables++;
      }
      console.log();
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎉 Migration Complete!`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📊 Statistics:`);
    console.log(`   - Tables processed: ${totalTables}`);
    console.log(`   - Records fixed: ${totalFixed}`);
    console.log(`\n✅ All factory fields now use plain text format`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nStack trace:', error.stack);
    throw error;
  } finally {
    await pool.end();
  }
}

// Main execution
console.log(`
${'='.repeat(60)}
Factory Field Format Migration
${'='.repeat(60)}
Purpose: Convert {"value"} → value for factory fields
Safe to run multiple times
${'='.repeat(60)}
`);

fixFactoryFieldFormat()
  .then(() => {
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  });
