/**
 * Delete All Submission Data
 *
 * This script deletes ALL data from:
 * - sales_task_tracker_a71d473fd421 (sub-form table)
 * - ms_sales_tracking_system_q_con_service_c_c72bd400d0be (main form table)
 * - submissions table
 * - submission_data table
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

const subFormTable = 'sales_task_tracker_a71d473fd421';
const mainFormTable = 'ms_sales_tracking_system_q_con_service_c_c72bd400d0be';
const mainFormId = '2930365a-1734-48ec-9b58-c72bd400d0be';

async function deleteAllSubmissionData() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║            Delete All Submission Data                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Count current data
    console.log('📊 Step 1: Counting current data...\n');

    const subFormCount = await pool.query(`SELECT COUNT(*) as count FROM "${subFormTable}"`);
    const mainFormCount = await pool.query(`SELECT COUNT(*) as count FROM "${mainFormTable}"`);

    const submissionsCount = await pool.query(`
      SELECT COUNT(*) as count FROM submissions WHERE form_id = $1
    `, [mainFormId]);

    const submissionDataCount = await pool.query(`
      SELECT COUNT(*) as count FROM submission_data
      WHERE submission_id IN (
        SELECT id FROM submissions WHERE form_id = $1
      )
    `, [mainFormId]);

    console.log(`Sub-form table (${subFormTable}): ${subFormCount.rows[0].count} records`);
    console.log(`Main form table (${mainFormTable}): ${mainFormCount.rows[0].count} records`);
    console.log(`Submissions table: ${submissionsCount.rows[0].count} records`);
    console.log(`Submission data table: ${submissionDataCount.rows[0].count} records\n`);

    const totalRecords = parseInt(subFormCount.rows[0].count) +
                        parseInt(mainFormCount.rows[0].count) +
                        parseInt(submissionsCount.rows[0].count) +
                        parseInt(submissionDataCount.rows[0].count);

    if (totalRecords === 0) {
      console.log('✅ No data to delete. All tables are already empty.\n');
      return;
    }

    // Step 2: Display data to be deleted
    console.log('📋 Step 2: Data to be deleted...\n');

    // Show main form data
    const mainFormData = await pool.query(`
      SELECT id, username, submitted_at FROM "${mainFormTable}" ORDER BY submitted_at DESC
    `);

    console.log('Main Form Records:\n');
    for (const row of mainFormData.rows) {
      console.log(`   - ID: ${row.id}`);
      console.log(`     Username: ${row.username}`);
      console.log(`     Submitted: ${row.submitted_at}\n`);
    }

    // Show sub-form data
    const subFormData = await pool.query(`
      SELECT id, parent_id, username, submitted_at FROM "${subFormTable}" ORDER BY submitted_at DESC
    `);

    console.log('Sub-Form Records:\n');
    for (const row of subFormData.rows) {
      console.log(`   - ID: ${row.id}`);
      console.log(`     Parent ID: ${row.parent_id}`);
      console.log(`     Username: ${row.username}`);
      console.log(`     Submitted: ${row.submitted_at}\n`);
    }

    // Step 3: Ask for confirmation
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    ⚠️  WARNING ⚠️');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`This will DELETE ALL data from these tables:\n`);
    console.log(`  1. ${subFormTable} (${subFormCount.rows[0].count} records)`);
    console.log(`  2. ${mainFormTable} (${mainFormCount.rows[0].count} records)`);
    console.log(`  3. submissions table (${submissionsCount.rows[0].count} records)`);
    console.log(`  4. submission_data table (${submissionDataCount.rows[0].count} records)\n`);
    console.log(`Total: ${totalRecords} records will be permanently deleted!\n`);
    console.log('This action CANNOT be undone.\n');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question('Type "DELETE ALL" to confirm deletion, or anything else to cancel: ', resolve);
    });

    rl.close();

    if (answer.trim() !== 'DELETE ALL') {
      console.log('\n❌ Deletion cancelled. No changes were made.\n');
      return;
    }

    // Step 4: Delete data
    console.log('\n🗑️  Deleting data...\n');

    // Delete in correct order to respect foreign keys

    // 1. Delete sub-form dynamic table data
    const deleteSubFormResult = await pool.query(`DELETE FROM "${subFormTable}" RETURNING id`);
    console.log(`   ✅ Deleted ${deleteSubFormResult.rows.length} records from ${subFormTable}`);

    // 2. Delete main form dynamic table data
    const deleteMainFormResult = await pool.query(`DELETE FROM "${mainFormTable}" RETURNING id`);
    console.log(`   ✅ Deleted ${deleteMainFormResult.rows.length} records from ${mainFormTable}`);

    // 3. Delete submission_data (should cascade when deleting submissions, but delete explicitly to be safe)
    const deleteSubmissionDataResult = await pool.query(`
      DELETE FROM submission_data
      WHERE submission_id IN (
        SELECT id FROM submissions WHERE form_id = $1
      )
      RETURNING id
    `, [mainFormId]);
    console.log(`   ✅ Deleted ${deleteSubmissionDataResult.rows.length} records from submission_data`);

    // 4. Delete submissions
    const deleteSubmissionsResult = await pool.query(`
      DELETE FROM submissions WHERE form_id = $1 RETURNING id
    `, [mainFormId]);
    console.log(`   ✅ Deleted ${deleteSubmissionsResult.rows.length} records from submissions`);

    // Step 5: Verify deletion
    console.log('\n📊 Verifying deletion...\n');

    const verifySubForm = await pool.query(`SELECT COUNT(*) as count FROM "${subFormTable}"`);
    const verifyMainForm = await pool.query(`SELECT COUNT(*) as count FROM "${mainFormTable}"`);
    const verifySubmissions = await pool.query(`
      SELECT COUNT(*) as count FROM submissions WHERE form_id = $1
    `, [mainFormId]);
    const verifySubmissionData = await pool.query(`
      SELECT COUNT(*) as count FROM submission_data
      WHERE submission_id IN (
        SELECT id FROM submissions WHERE form_id = $1
      )
    `, [mainFormId]);

    console.log(`Sub-form table: ${verifySubForm.rows[0].count} records (should be 0)`);
    console.log(`Main form table: ${verifyMainForm.rows[0].count} records (should be 0)`);
    console.log(`Submissions: ${verifySubmissions.rows[0].count} records (should be 0)`);
    console.log(`Submission data: ${verifySubmissionData.rows[0].count} records (should be 0)\n`);

    const allZero = verifySubForm.rows[0].count === '0' &&
                    verifyMainForm.rows[0].count === '0' &&
                    verifySubmissions.rows[0].count === '0' &&
                    verifySubmissionData.rows[0].count === '0';

    if (allZero) {
      console.log('✅ All data successfully deleted!\n');
      console.log('📝 Note: Form structure (form, sub-form, fields) is preserved.\n');
      console.log('   You can now submit fresh data without any old records.\n');
    } else {
      console.log('⚠️  Warning: Some records may remain. Please verify manually.\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await pool.end();
  }
}

deleteAllSubmissionData().catch(console.error);
