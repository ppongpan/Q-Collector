/**
 * Verify ID Synchronization Fix
 *
 * Tests that:
 * 1. Submissions table ID matches dynamic table ID
 * 2. Main form submissions have parent_id = NULL
 * 3. Sub-form submissions can correctly reference parent ID
 */

const { Pool } = require('pg');
const { Submission, Form } = require('../models');

async function verifyIdSync() {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'qcollector_db',
    user: process.env.POSTGRES_USER || 'qcollector',
    password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
  });

  try {
    console.log('🔍 Verifying ID Synchronization Fix...\n');
    console.log('=' .repeat(80));

    // Get the most recent main form submission
    const mainFormSubmission = await Submission.findOne({
      where: {
        sub_form_id: null,
        form_id: 'f406b4e1-baef-41a7-823b-b6d95c23b4fe'
      },
      order: [['createdAt', 'DESC']],
      include: [{ model: Form, as: 'form', attributes: ['title', 'table_name'] }]
    });

    if (!mainFormSubmission) {
      console.log('❌ No main form submissions found for testing\n');
      console.log('💡 Please create a new form submission to test the fix.\n');
      return;
    }

    console.log('\n📄 MAIN FORM SUBMISSION (Submissions Table):');
    console.log(`   ID: ${mainFormSubmission.id}`);
    console.log(`   Form: ${mainFormSubmission.form.title}`);
    console.log(`   Table: ${mainFormSubmission.form.table_name}`);
    console.log(`   Parent ID: ${mainFormSubmission.parent_id || 'NULL ✅'}`);
    console.log(`   Created: ${mainFormSubmission.createdAt}`);

    // Test 1: Check parent_id is NULL for main form
    const test1Pass = mainFormSubmission.parent_id === null;
    console.log(`\n✓ Test 1: Main form has parent_id = NULL: ${test1Pass ? '✅ PASS' : '❌ FAIL'}`);

    // Test 2: Check if ID exists in dynamic table
    const tableName = mainFormSubmission.form.table_name;
    const dynamicTableQuery = `
      SELECT id, form_id, username, submitted_at
      FROM ${tableName}
      WHERE id = $1
    `;

    const dynamicResult = await pool.query(dynamicTableQuery, [mainFormSubmission.id]);

    console.log(`\n📊 DYNAMIC TABLE (${tableName}):`);

    if (dynamicResult.rows.length === 0) {
      console.log(`   ❌ ID ${mainFormSubmission.id} NOT FOUND in dynamic table`);
      console.log(`   🔴 Test 2: FAILED - ID mismatch detected!\n`);
      return;
    }

    const dynamicRow = dynamicResult.rows[0];
    console.log(`   ID: ${dynamicRow.id}`);
    console.log(`   Form ID: ${dynamicRow.form_id}`);
    console.log(`   Username: ${dynamicRow.username}`);
    console.log(`   Created: ${dynamicRow.submitted_at}`);

    // Test 2: Verify IDs match
    const test2Pass = dynamicRow.id === mainFormSubmission.id;
    console.log(`\n✓ Test 2: IDs match (submissions === dynamic): ${test2Pass ? '✅ PASS' : '❌ FAIL'}`);

    // Test 3: Check if sub-form submissions reference correct parent_id
    const subFormSubmissions = await Submission.findAll({
      where: {
        parent_id: mainFormSubmission.id
      },
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    console.log(`\n📎 SUB-FORM SUBMISSIONS (${subFormSubmissions.length} found):`);

    if (subFormSubmissions.length === 0) {
      console.log(`   ℹ️  No sub-form submissions found for this parent`);
      console.log(`   💡 This is normal if you haven't added sub-forms yet\n`);
    } else {
      subFormSubmissions.forEach((sub, i) => {
        const isCorrect = sub.parent_id === mainFormSubmission.id;
        console.log(`\n   ${i + 1}. ${isCorrect ? '✅' : '❌'} ID: ${sub.id}`);
        console.log(`      Sub-form ID: ${sub.sub_form_id}`);
        console.log(`      Parent ID: ${sub.parent_id}`);
        console.log(`      Created: ${sub.createdAt}`);
      });

      const test3Pass = subFormSubmissions.every(s => s.parent_id === mainFormSubmission.id);
      console.log(`\n✓ Test 3: All sub-forms reference correct parent: ${test3Pass ? '✅ PASS' : '❌ FAIL'}`);
    }

    // Test 4: Check sub-form dynamic table for correct parent_id
    const subFormTableQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE '%c3123fc21f79%'
    `;

    const subFormTableResult = await pool.query(subFormTableQuery);

    if (subFormTableResult.rows.length > 0) {
      const subFormTableName = subFormTableResult.rows[0].table_name;

      const subFormDataQuery = `
        SELECT id, parent_id, username, submitted_at
        FROM ${subFormTableName}
        WHERE parent_id = $1
        ORDER BY submitted_at DESC
      `;

      const subFormDataResult = await pool.query(subFormDataQuery, [mainFormSubmission.id]);

      console.log(`\n📋 SUB-FORM DYNAMIC TABLE (${subFormTableName}):`);
      console.log(`   Found ${subFormDataResult.rows.length} records with parent_id = ${mainFormSubmission.id}`);

      if (subFormDataResult.rows.length > 0) {
        subFormDataResult.rows.forEach((row, i) => {
          const isCorrect = row.parent_id === mainFormSubmission.id;
          console.log(`\n   ${i + 1}. ${isCorrect ? '✅' : '❌'} ID: ${row.id}`);
          console.log(`      Parent ID: ${row.parent_id}`);
          console.log(`      Created: ${row.submitted_at}`);
        });

        const test4Pass = subFormDataResult.rows.every(r => r.parent_id === mainFormSubmission.id);
        console.log(`\n✓ Test 4: Sub-form dynamic table has correct parent_ids: ${test4Pass ? '✅ PASS' : '❌ FAIL'}`);
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 VERIFICATION SUMMARY:');
    console.log(`   Test 1 (Main form parent_id = NULL): ${test1Pass ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Test 2 (ID synchronization): ${test2Pass ? '✅ PASS' : '❌ FAIL'}`);

    if (test1Pass && test2Pass) {
      console.log('\n🎉 ID SYNCHRONIZATION FIX VERIFIED SUCCESSFULLY!\n');
      console.log('✅ Submissions table ID matches dynamic table ID');
      console.log('✅ Main form submissions have parent_id = NULL');
      console.log('✅ System is ready for sub-form parent_id references\n');
    } else {
      console.log('\n⚠️  ISSUES DETECTED - Please review the failed tests above\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

verifyIdSync();
