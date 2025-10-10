const { Pool } = require('pg');
require('dotenv').config();

/**
 * Check Factory Field Display Issue
 *
 * Purpose: Verify that factory field data is correctly stored and retrieved from database
 * - Check dynamic table structure
 * - Check raw data in PostgreSQL
 * - Simulate API response format
 */

async function checkFactoryFieldDisplay() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });

  try {
    console.log('🔍 Checking Factory Field Display Issue...\n');

    // Step 1: Find sub-form tables with factory fields
    console.log('Step 1: Finding sub-form tables with factory fields...');
    const tablesQuery = `
      SELECT DISTINCT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (
          column_name LIKE '%factory%'
          OR column_name LIKE '%affiliated%'
        )
        AND table_name LIKE 'sub_form_%'
      ORDER BY table_name;
    `;

    const { rows: tables } = await pool.query(tablesQuery);
    console.log(`✅ Found ${tables.length} sub-form tables with factory fields:\n`);

    if (tables.length === 0) {
      console.log('ℹ️  No sub-form tables with factory fields found');
      return;
    }

    for (const { table_name, column_name } of tables) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📋 Table: ${table_name}`);
      console.log(`📝 Column: ${column_name}`);
      console.log(`${'='.repeat(80)}\n`);

      // Step 2: Check column data type
      const columnInfoQuery = `
        SELECT data_type, character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = '${table_name}'
          AND column_name = '${column_name}';
      `;

      const { rows: columnInfo } = await pool.query(columnInfoQuery);
      console.log('Column Info:', {
        dataType: columnInfo[0].data_type,
        maxLength: columnInfo[0].character_maximum_length
      });

      // Step 3: Get raw data from table
      console.log('\nStep 3: Raw Data from Database:');
      const dataQuery = `
        SELECT
          id,
          "${column_name}",
          submitted_at
        FROM "${table_name}"
        ORDER BY submitted_at DESC
        LIMIT 5;
      `;

      const { rows: data } = await pool.query(dataQuery);

      if (data.length === 0) {
        console.log('  ℹ️  No data in table\n');
        continue;
      }

      console.log(`  Found ${data.length} records:\n`);

      data.forEach((row, index) => {
        const factoryValue = row[column_name];
        console.log(`  Record ${index + 1}:`);
        console.log(`    ID: ${row.id}`);
        console.log(`    Factory Value:`, factoryValue);
        console.log(`    Value Type:`, typeof factoryValue);
        console.log(`    Is Array:`, Array.isArray(factoryValue));
        console.log(`    Value Length:`, factoryValue ? factoryValue.length : 0);
        console.log(`    Submitted At:`, row.submitted_at);

        // Check if value looks like JSON string
        if (typeof factoryValue === 'string' && (factoryValue.startsWith('{') || factoryValue.startsWith('['))) {
          console.log(`    ⚠️  ISSUE: Value looks like JSON string!`);
          console.log(`    Raw: "${factoryValue}"`);
          try {
            const parsed = JSON.parse(factoryValue);
            console.log(`    Parsed:`, parsed);
          } catch (e) {
            console.log(`    ❌ Cannot parse as JSON`);
          }
        } else {
          console.log(`    ✅ Value is plain text`);
        }
        console.log();
      });

      // Step 4: Simulate API response format
      console.log('Step 4: Simulating API Response Format:');
      console.log('  How backend SubmissionService formats this data...\n');

      // Get field definition from forms table
      const fieldQuery = `
        SELECT f.id, f.title, f.type, f.sub_form_id, sf.title as subform_title
        FROM fields f
        LEFT JOIN "subForms" sf ON f.sub_form_id = sf.id
        WHERE f.sub_form_id IS NOT NULL
          AND (f.title LIKE '%โรงงาน%' OR f.title LIKE '%factory%' OR f.type = 'factory')
        LIMIT 5;
      `;

      const { rows: fields } = await pool.query(fieldQuery);

      if (fields.length > 0) {
        console.log('  Found factory fields in forms:');
        fields.forEach((field, i) => {
          console.log(`    Field ${i + 1}:`);
          console.log(`      ID: ${field.id}`);
          console.log(`      Title: ${field.title}`);
          console.log(`      Type: ${field.type}`);
          console.log(`      Sub-Form: ${field.subform_title}`);
        });

        // Simulate how SubmissionService returns data
        console.log('\n  Simulated API Response:');
        const sampleData = data[0];
        const sampleField = fields[0];

        const apiResponse = {
          submission: {
            id: sampleData.id,
            data: {
              [sampleField.id]: {
                fieldId: sampleField.id,
                fieldTitle: sampleField.title,
                fieldType: sampleField.type,
                value: sampleData[column_name]  // ← The actual value from database
              }
            }
          }
        };

        console.log(JSON.stringify(apiResponse, null, 2));

        console.log('\n  Frontend should extract:');
        console.log(`    value = submission.data["${sampleField.id}"].value`);
        console.log(`    value = "${sampleData[column_name]}"`);
      }

      console.log();
    }

    console.log('\n' + '='.repeat(80));
    console.log('Summary:');
    console.log('='.repeat(80));
    console.log('\nIf factory values show as JSON strings like {"โรงงาน"}:');
    console.log('  ❌ Problem: Old data still in wrong format');
    console.log('  ✅ Solution: Run migration script (fix-factory-field-format.js)');
    console.log('\nIf factory values show as plain text like "โรงงานระยอง":');
    console.log('  ✅ Data is correct!');
    console.log('  🔍 Check frontend extraction logic in:');
    console.log('     - SubmissionDetail.jsx (line 747-756)');
    console.log('     - SubFormDetail.jsx (line 714-730)');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

checkFactoryFieldDisplay()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Check failed:', error.message);
    process.exit(1);
  });
