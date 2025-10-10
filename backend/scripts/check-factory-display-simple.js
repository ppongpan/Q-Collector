const { sequelize } = require('../models');

/**
 * Simple Factory Field Display Check
 * Uses Sequelize connection to check sub-form data
 */

async function checkFactoryDisplay() {
  try {
    console.log('🔍 Checking Factory Field Display...\n');

    // Find all dynamic tables (including form and sub-form tables)
    // Sub-form tables typically have names like: sub_form_<formId>_<subFormId> or similar pattern
    const [tables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND (
          table_name LIKE 'form_%'
          OR table_name LIKE 'sub_form_%'
          OR table_name ~ '^[a-z_]+_[0-9a-f]{8}_[0-9a-f]{4}_'
        )
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('forms', 'fields', 'subForms')
      ORDER BY table_name;
    `);

    console.log(`✅ Found ${tables.length} sub-form tables\n`);

    for (const { table_name } of tables) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📋 Table: ${table_name}`);
      console.log(`${'='.repeat(80)}\n`);

      // Get column names
      const [columns] = await sequelize.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = '${table_name}'
          AND (
            column_name LIKE '%factory%'
            OR column_name LIKE '%affiliated%'
          )
        ORDER BY ordinal_position;
      `);

      if (columns.length === 0) {
        console.log('  ℹ️  No factory fields in this table\n');
        continue;
      }

      console.log('Factory Fields Found:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });

      // Get data from table
      console.log('\nData:');
      const [data] = await sequelize.query(`
        SELECT *
        FROM "${table_name}"
        ORDER BY submitted_at DESC
        LIMIT 5;
      `);

      if (data.length === 0) {
        console.log('  ℹ️  No data in table\n');
        continue;
      }

      data.forEach((row, index) => {
        console.log(`\n  Record ${index + 1}:`);
        console.log(`    ID: ${row.id}`);

        // Show factory field values
        columns.forEach(col => {
          const value = row[col.column_name];
          console.log(`\n    ${col.column_name}:`);
          console.log(`      Raw Value: "${value}"`);
          console.log(`      Type: ${typeof value}`);
          console.log(`      Length: ${value ? value.length : 0}`);

          // Check if it's JSON string format
          if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
            console.log(`      ⚠️  LOOKS LIKE JSON STRING!`);
            try {
              const parsed = JSON.parse(value);
              console.log(`      Parsed:`, parsed);
              console.log(`      ❌ PROBLEM: Data is in wrong format`);
            } catch (e) {
              console.log(`      ⚠️  Cannot parse as JSON`);
            }
          } else if (value && !value.startsWith('{')) {
            console.log(`      ✅ CORRECT: Plain text format`);
          }
        });

        console.log(`    Submitted: ${row.submitted_at}`);
      });

      console.log();
    }

    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log('\nWhat to look for:');
    console.log('  ✅ CORRECT: "โรงงานระยอง" (plain text)');
    console.log('  ❌ WRONG:   "{\\"โรงงานระยอง\\"}" (JSON string)');
    console.log('\nIf you see ❌ WRONG format:');
    console.log('  → Run: node backend/scripts/fix-factory-field-format.js');
    console.log('\nIf you see ✅ CORRECT format but not displaying in UI:');
    console.log('  → Check browser console logs');
    console.log('  → Open DevTools → Console');
    console.log('  → Look for logs from SubmissionDetail.jsx or SubFormDetail.jsx');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

checkFactoryDisplay();
