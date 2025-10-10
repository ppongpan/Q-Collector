const { sequelize } = require('../models');

/**
 * Fix Factory Field Format - Using Sequelize
 * Convert: {"โรงงานระยอง"} → โรงงานระยอง
 */

async function fixFactoryFieldFormat() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('Factory Field Format Migration (Sequelize)');
    console.log('='.repeat(80));
    console.log('Purpose: Convert {"value"} → value for factory fields');
    console.log('Safe to run multiple times');
    console.log('='.repeat(80) + '\n');

    console.log('🔍 Scanning for tables with factory fields...\n');

    // Find all tables with factory fields
    const [tables] = await sequelize.query(`
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
    `);

    console.log(`✅ Found ${tables.length} columns to check:\n`);

    if (tables.length === 0) {
      console.log('ℹ️  No factory fields found in database');
      return;
    }

    let totalFixed = 0;
    let totalTables = 0;

    for (const { table_name, column_name } of tables) {
      console.log(`📋 Checking ${table_name}.${column_name}...`);

      // Count records that need fixing
      const [countResult] = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM "${table_name}"
        WHERE "${column_name}" ~ '^\\{"[^"]+"\\}$';
      `);

      const needsFixing = parseInt(countResult[0].count);

      if (needsFixing === 0) {
        console.log(`   ℹ️  No records need fixing in ${table_name}.${column_name}`);
        console.log();
        continue;
      }

      console.log(`   🔧 Found ${needsFixing} records to fix...`);

      // Update records: Convert {"value"} → value
      const [updatedRecords] = await sequelize.query(`
        UPDATE "${table_name}"
        SET "${column_name}" = regexp_replace(
          "${column_name}",
          '^\\{"([^"]+)"\\}$',
          '\\1'
        )
        WHERE "${column_name}" ~ '^\\{"[^"]+"\\}$'
        RETURNING id, "${column_name}" as new_value;
      `);

      const rowCount = updatedRecords.length;

      if (rowCount > 0) {
        console.log(`   ✅ Fixed ${rowCount} records in ${table_name}.${column_name}`);
        console.log(`   Example: "${updatedRecords[0].new_value}"`);
        totalFixed += rowCount;
        totalTables++;
      }
      console.log();
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎉 Migration Complete!');
    console.log('='.repeat(80));
    console.log(`📊 Statistics:`);
    console.log(`   - Tables processed: ${totalTables}`);
    console.log(`   - Records fixed: ${totalFixed}`);
    console.log(`\n✅ All factory fields now use plain text format`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nStack trace:', error.stack);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run migration
console.log('\nStarting Factory Field Format Migration...\n');

fixFactoryFieldFormat()
  .then(() => {
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  });
