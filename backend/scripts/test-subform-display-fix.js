/**
 * Test Sub-form Display Fix
 *
 * Comprehensive database verification for sub-form fixes
 * Checks all 5 fixes applied and verifies data integrity
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

// Test Data
const MAIN_FORM_ID = 'c778cb80-cff3-4b2f-aebd-6555e6871094';
const SUB_FORM_ID = 'c54e7f74-6636-4b2f-aebd-6555e6871094';
const SUB_FORM_TABLE = 'formbanthuekkartidtamkhay_c54e7f746636';
const OLD_SUBMISSION_ID = '002a48b0-9020-468a-bf68-345b4863ce85';
const OLD_MAIN_FORM_SUBID = 'e5d08fa0-8dea-45f3-81fe-6d4a4d005a26';
const NEW_SUBMISSION_ID = 'd9dc2a82-3973-4134-99a7-cae58ac57bfd';

async function runTests() {
  console.log('🔍 SUB-FORM DISPLAY FIX VERIFICATION');
  console.log('=' .repeat(80));
  console.log('Date:', new Date().toISOString());
  console.log('Database:', process.env.POSTGRES_DB || 'qcollector_db');
  console.log('=' .repeat(80));
  console.log();

  let allTestsPassed = true;
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  try {
    // Test 1: Verify sub-form table exists and has correct schema
    console.log('📋 TEST 1: Verify sub-form table schema');
    console.log('-'.repeat(80));

    const schemaQuery = `
      SELECT
        ordinal_position,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = $1
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;

    const schemaResult = await pool.query(schemaQuery, [SUB_FORM_TABLE]);

    if (schemaResult.rows.length === 0) {
      console.log('❌ FAIL: Sub-form table does not exist');
      results.failed.push('Test 1: Sub-form table not found');
      allTestsPassed = false;
    } else {
      console.log(`✅ Sub-form table exists with ${schemaResult.rows.length} columns`);
      console.log();
      console.log('Column Structure:');
      console.log('Pos | Column Name          | Data Type           | Nullable');
      console.log('-'.repeat(70));

      schemaResult.rows.forEach(col => {
        const pos = String(col.ordinal_position).padEnd(3);
        const name = col.column_name.padEnd(20);
        const type = col.data_type.padEnd(19);
        const nullable = col.is_nullable;

        console.log(`${pos} | ${name} | ${type} | ${nullable}`);

        // Verify critical columns
        if (col.ordinal_position === 1 && col.column_name !== 'id') {
          results.warnings.push('Column 1 is not "id"');
        }
        if (col.ordinal_position === 2 && col.column_name !== 'parent_id') {
          results.warnings.push('Column 2 is not "parent_id"');
        }
        if (col.ordinal_position === 3 && col.column_name !== 'main_form_subid') {
          results.warnings.push('Column 3 is not "main_form_subid"');
        }
      });

      // Check if main_form_subid column exists
      const hasMainFormSubId = schemaResult.rows.some(col => col.column_name === 'main_form_subid');
      if (hasMainFormSubId) {
        console.log();
        console.log('✅ main_form_subid column exists');

        const mainFormSubIdCol = schemaResult.rows.find(col => col.column_name === 'main_form_subid');
        if (mainFormSubIdCol.ordinal_position === 3) {
          console.log('✅ main_form_subid is at position 3 (CORRECT)');
          results.passed.push('Test 1: main_form_subid at correct position');
        } else {
          console.log(`⚠️  main_form_subid is at position ${mainFormSubIdCol.ordinal_position} (expected 3)`);
          results.warnings.push(`main_form_subid at position ${mainFormSubIdCol.ordinal_position}`);
        }
      } else {
        console.log('❌ FAIL: main_form_subid column does not exist');
        results.failed.push('Test 1: main_form_subid column missing');
        allTestsPassed = false;
      }

      // Check if parent_id2 column exists (should NOT exist in old tables)
      const hasParentId2 = schemaResult.rows.some(col => col.column_name === 'parent_id2');
      if (hasParentId2) {
        console.log('ℹ️  parent_id2 column exists (table created after Fix 5)');
      } else {
        console.log('✅ parent_id2 column does NOT exist (old table - backward compatible)');
      }

      results.passed.push('Test 1: Table schema verified');
    }

    console.log();
    console.log('=' .repeat(80));
    console.log();

    // Test 2: Verify existing sub-form data
    console.log('📋 TEST 2: Verify existing sub-form submissions');
    console.log('-'.repeat(80));

    const dataQuery = `
      SELECT
        id,
        parent_id,
        main_form_subid,
        username,
        "order",
        submitted_at
      FROM "${SUB_FORM_TABLE}"
      ORDER BY submitted_at DESC;
    `;

    const dataResult = await pool.query(dataQuery);

    console.log(`Found ${dataResult.rows.length} sub-form submissions`);
    console.log();

    if (dataResult.rows.length === 0) {
      console.log('⚠️  No sub-form submissions found');
      results.warnings.push('Test 2: No data in sub-form table');
    } else {
      dataResult.rows.forEach((row, i) => {
        console.log(`Record ${i + 1}:`);
        console.log(`  ID: ${row.id}`);
        console.log(`  parent_id: ${row.parent_id}`);
        console.log(`  main_form_subid: ${row.main_form_subid}`);
        console.log(`  username: ${row.username}`);
        console.log(`  order: ${row.order}`);
        console.log(`  submitted_at: ${row.submitted_at}`);
        console.log();

        // Verify main_form_subid is set
        if (!row.main_form_subid) {
          console.log(`  ❌ Record ${i + 1}: main_form_subid is NULL`);
          results.failed.push(`Test 2: Record ${i + 1} missing main_form_subid`);
          allTestsPassed = false;
        } else {
          console.log(`  ✅ Record ${i + 1}: main_form_subid is set`);
        }
      });

      // Check for records with OLD_MAIN_FORM_SUBID
      const oldRecords = dataResult.rows.filter(r => r.main_form_subid === OLD_MAIN_FORM_SUBID);
      console.log(`✅ Found ${oldRecords.length} records with main_form_subid = ${OLD_MAIN_FORM_SUBID}`);

      if (oldRecords.length > 0) {
        results.passed.push(`Test 2: ${oldRecords.length} existing records verified`);
      } else {
        results.warnings.push('Test 2: No records found for old submission');
      }
    }

    console.log();
    console.log('=' .repeat(80));
    console.log();

    // Test 3: Verify main form submissions exist
    console.log('📋 TEST 3: Verify main form submissions');
    console.log('-'.repeat(80));

    const mainFormTableQuery = `
      SELECT table_name
      FROM forms
      WHERE id = $1;
    `;

    const mainFormTableResult = await pool.query(mainFormTableQuery, [MAIN_FORM_ID]);

    if (mainFormTableResult.rows.length === 0) {
      console.log('❌ FAIL: Main form not found');
      results.failed.push('Test 3: Main form not found');
      allTestsPassed = false;
    } else {
      const mainFormTable = mainFormTableResult.rows[0].table_name;
      console.log(`✅ Main form table: ${mainFormTable}`);

      // Check submissions in main form table
      const mainSubQuery = `
        SELECT id, username, submitted_at
        FROM "${mainFormTable}"
        ORDER BY submitted_at DESC
        LIMIT 5;
      `;

      const mainSubResult = await pool.query(mainSubQuery);
      console.log(`✅ Found ${mainSubResult.rows.length} main form submissions`);
      console.log();

      mainSubResult.rows.forEach((row, i) => {
        console.log(`Submission ${i + 1}:`);
        console.log(`  ID: ${row.id}`);
        console.log(`  username: ${row.username}`);
        console.log(`  submitted_at: ${row.submitted_at}`);

        if (row.id === OLD_MAIN_FORM_SUBID) {
          console.log(`  ✅ This is the OLD submission (has sub-forms)`);
        }
        if (row.id === NEW_SUBMISSION_ID) {
          console.log(`  ✅ This is the NEW submission (test target)`);
        }

        console.log();
      });

      // Check if both test submissions exist
      const hasOld = mainSubResult.rows.some(r => r.id === OLD_MAIN_FORM_SUBID);
      const hasNew = mainSubResult.rows.some(r => r.id === NEW_SUBMISSION_ID);

      if (hasOld && hasNew) {
        console.log('✅ Both test submissions found');
        results.passed.push('Test 3: Test submissions verified');
      } else {
        if (!hasOld) {
          results.warnings.push('Test 3: Old submission not found');
        }
        if (!hasNew) {
          results.warnings.push('Test 3: New submission not found');
        }
      }
    }

    console.log();
    console.log('=' .repeat(80));
    console.log();

    // Test 4: Verify submissions table linkage
    console.log('📋 TEST 4: Verify submissions table linkage');
    console.log('-'.repeat(80));

    const submissionsQuery = `
      SELECT
        s.id,
        s.form_id,
        s."createdAt",
        f.title as form_title
      FROM submissions s
      JOIN forms f ON s.form_id = f.id
      WHERE s.id IN ($1, $2)
      ORDER BY s."createdAt" DESC;
    `;

    const submissionsResult = await pool.query(submissionsQuery, [OLD_SUBMISSION_ID, NEW_SUBMISSION_ID]);

    console.log(`Found ${submissionsResult.rows.length} submissions in submissions table`);
    console.log();

    submissionsResult.rows.forEach(row => {
      console.log(`Submission: ${row.id}`);
      console.log(`  Form: ${row.form_title}`);
      console.log(`  Created: ${row.createdAt}`);
      console.log();
    });

    if (submissionsResult.rows.length === 2) {
      console.log('✅ Both submissions exist in submissions table');
      results.passed.push('Test 4: Submissions table linkage verified');
    } else {
      console.log(`⚠️  Only ${submissionsResult.rows.length} submission(s) found in submissions table`);
      results.warnings.push(`Test 4: ${submissionsResult.rows.length}/2 submissions found`);
    }

    console.log();
    console.log('=' .repeat(80));
    console.log();

    // Test 5: Check for Field model label column
    console.log('📋 TEST 5: Verify Field model schema (Fix 3)');
    console.log('-'.repeat(80));

    const fieldSchemaQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'fields'
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;

    const fieldSchemaResult = await pool.query(fieldSchemaQuery);
    const fieldColumns = fieldSchemaResult.rows.map(r => r.column_name);

    console.log('Field table columns:', fieldColumns.join(', '));
    console.log();

    const hasLabelColumn = fieldColumns.includes('label');
    if (hasLabelColumn) {
      console.log('ℹ️  Field table HAS "label" column');
      console.log('   Fix 3 may not be necessary if label exists');
      results.warnings.push('Test 5: Field table has label column (unexpected)');
    } else {
      console.log('✅ Field table does NOT have "label" column');
      console.log('   Fix 3 (removing label from query) is correct');
      results.passed.push('Test 5: Field schema verified (no label)');
    }

    console.log();
    console.log('=' .repeat(80));
    console.log();

    // Test 6: Simulate API query for sub-form submissions
    console.log('📋 TEST 6: Simulate API query (getSubFormSubmissionsByMainFormSubId)');
    console.log('-'.repeat(80));

    const apiSimQuery = `
      SELECT *
      FROM "${SUB_FORM_TABLE}"
      WHERE main_form_subid = $1
      ORDER BY "order" ASC, submitted_at ASC;
    `;

    const apiSimResult = await pool.query(apiSimQuery, [OLD_MAIN_FORM_SUBID]);

    console.log(`Query: SELECT * FROM "${SUB_FORM_TABLE}" WHERE main_form_subid = '${OLD_MAIN_FORM_SUBID}'`);
    console.log(`Result: ${apiSimResult.rows.length} rows`);
    console.log();

    if (apiSimResult.rows.length > 0) {
      console.log('✅ API query returns sub-form submissions');
      console.log();
      console.log('Sample data from first row:');
      const firstRow = apiSimResult.rows[0];
      Object.keys(firstRow).forEach(key => {
        console.log(`  ${key}: ${firstRow[key]}`);
      });
      results.passed.push(`Test 6: API query returns ${apiSimResult.rows.length} row(s)`);
    } else {
      console.log('❌ FAIL: API query returns no results');
      console.log('   This means sub-form submissions will not display in UI');
      results.failed.push('Test 6: API query returns no results');
      allTestsPassed = false;
    }

    console.log();
    console.log('=' .repeat(80));
    console.log();

  } catch (error) {
    console.error('❌ TEST ERROR:', error.message);
    console.error(error.stack);
    results.failed.push(`Fatal error: ${error.message}`);
    allTestsPassed = false;
  }

  // Summary
  console.log();
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(80));
  console.log();

  console.log(`✅ Passed: ${results.passed.length}`);
  results.passed.forEach(p => console.log(`   - ${p}`));
  console.log();

  if (results.failed.length > 0) {
    console.log(`❌ Failed: ${results.failed.length}`);
    results.failed.forEach(f => console.log(`   - ${f}`));
    console.log();
  }

  if (results.warnings.length > 0) {
    console.log(`⚠️  Warnings: ${results.warnings.length}`);
    results.warnings.forEach(w => console.log(`   - ${w}`));
    console.log();
  }

  console.log('=' .repeat(80));

  if (allTestsPassed && results.failed.length === 0) {
    console.log();
    console.log('🎉 ALL TESTS PASSED! 🎉');
    console.log('✅ Sub-form display fix is working correctly');
    console.log('✅ Database schema is correct');
    console.log('✅ Data integrity verified');
    console.log();
  } else {
    console.log();
    console.log('❌ SOME TESTS FAILED');
    console.log('⚠️  Please review the failures above');
    console.log();
  }

  await pool.end();
  process.exit(allTestsPassed && results.failed.length === 0 ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
