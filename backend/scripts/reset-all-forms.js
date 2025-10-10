/**
 * Reset All Forms
 *
 * This script completely removes the form, sub-form, fields, and dynamic tables
 * to allow fresh start from frontend
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

const FORM_ID = '2930365a-1734-48ec-9b58-c72bd400d0be';
const MAIN_TABLE = 'ms_sales_tracking_system_q_con_service_c_c72bd400d0be';
const SUBFORM_ID = 'a3b5824a-d954-4f4e-9eae-a71d473fd421';
const SUBFORM_TABLE = 'sales_task_tracker_a71d473fd421';

async function resetAllForms() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║            Reset All Forms - Complete Cleanup              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Get current form info
    console.log('📋 Step 1: Checking current form data...\n');

    const form = await pool.query(`
      SELECT id, title, table_name FROM forms WHERE id = $1
    `, [FORM_ID]);

    if (form.rows.length === 0) {
      console.log('✅ No form found. Database is already clean.\n');
      return;
    }

    console.log(`Form: "${form.rows[0].title}"`);
    console.log(`   ID: ${form.rows[0].id}`);
    console.log(`   Table: ${form.rows[0].table_name}\n`);

    // Get sub-form info
    const subForm = await pool.query(`
      SELECT id, title, table_name FROM sub_forms WHERE id = $1
    `, [SUBFORM_ID]);

    if (subForm.rows.length > 0) {
      console.log(`Sub-Form: "${subForm.rows[0].title}"`);
      console.log(`   ID: ${subForm.rows[0].id}`);
      console.log(`   Table: ${subForm.rows[0].table_name}\n`);
    }

    // Count fields
    const fieldsCount = await pool.query(`
      SELECT COUNT(*) as count FROM fields WHERE form_id = $1
    `, [FORM_ID]);

    console.log(`Fields: ${fieldsCount.rows[0].count}\n`);

    // Check submissions
    const submissionsCount = await pool.query(`
      SELECT COUNT(*) as count FROM submissions WHERE form_id = $1
    `, [FORM_ID]);

    console.log(`Submissions: ${submissionsCount.rows[0].count}\n`);

    // Step 2: Display what will be deleted
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    ⚠️  WARNING ⚠️');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('This will PERMANENTLY DELETE:\n');
    console.log(`  1. Form: "${form.rows[0].title}"`);
    console.log(`  2. Sub-Form: "${subForm.rows[0]?.title || 'N/A'}"`);
    console.log(`  3. ${fieldsCount.rows[0].count} fields`);
    console.log(`  4. ${submissionsCount.rows[0].count} submissions`);
    console.log(`  5. Dynamic table: ${MAIN_TABLE}`);
    console.log(`  6. Dynamic table: ${SUBFORM_TABLE}\n`);
    console.log('After deletion, you can create a NEW form from the frontend.\n');
    console.log('This action CANNOT be undone.\n');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question('Type "RESET ALL" to confirm deletion, or anything else to cancel: ', resolve);
    });

    rl.close();

    if (answer.trim() !== 'RESET ALL') {
      console.log('\n❌ Reset cancelled. No changes were made.\n');
      return;
    }

    // Step 3: Delete in correct order
    console.log('\n🗑️  Deleting data...\n');

    // 1. Drop dynamic tables first
    console.log('   Dropping dynamic tables...');

    try {
      await pool.query(`DROP TABLE IF EXISTS "${SUBFORM_TABLE}" CASCADE`);
      console.log(`   ✅ Dropped table: ${SUBFORM_TABLE}`);
    } catch (error) {
      console.log(`   ⚠️  Error dropping ${SUBFORM_TABLE}: ${error.message}`);
    }

    try {
      await pool.query(`DROP TABLE IF EXISTS "${MAIN_TABLE}" CASCADE`);
      console.log(`   ✅ Dropped table: ${MAIN_TABLE}`);
    } catch (error) {
      console.log(`   ⚠️  Error dropping ${MAIN_TABLE}: ${error.message}`);
    }

    // 2. Delete submission_data
    const deleteSubmissionData = await pool.query(`
      DELETE FROM submission_data
      WHERE submission_id IN (
        SELECT id FROM submissions WHERE form_id = $1
      )
      RETURNING id
    `, [FORM_ID]);
    console.log(`   ✅ Deleted ${deleteSubmissionData.rows.length} submission_data records`);

    // 3. Delete submissions
    const deleteSubmissions = await pool.query(`
      DELETE FROM submissions WHERE form_id = $1 RETURNING id
    `, [FORM_ID]);
    console.log(`   ✅ Deleted ${deleteSubmissions.rows.length} submissions`);

    // 4. Delete fields
    const deleteFields = await pool.query(`
      DELETE FROM fields WHERE form_id = $1 RETURNING id
    `, [FORM_ID]);
    console.log(`   ✅ Deleted ${deleteFields.rows.length} fields`);

    // 5. Delete sub-forms
    const deleteSubForms = await pool.query(`
      DELETE FROM sub_forms WHERE form_id = $1 RETURNING id
    `, [FORM_ID]);
    console.log(`   ✅ Deleted ${deleteSubForms.rows.length} sub-forms`);

    // 6. Delete form
    const deleteForm = await pool.query(`
      DELETE FROM forms WHERE id = $1 RETURNING id
    `, [FORM_ID]);
    console.log(`   ✅ Deleted form: ${form.rows[0].title}`);

    // Step 4: Verify deletion
    console.log('\n📊 Verifying deletion...\n');

    const verifyForms = await pool.query(`SELECT COUNT(*) as count FROM forms WHERE id = $1`, [FORM_ID]);
    const verifySubForms = await pool.query(`SELECT COUNT(*) as count FROM sub_forms WHERE form_id = $1`, [FORM_ID]);
    const verifyFields = await pool.query(`SELECT COUNT(*) as count FROM fields WHERE form_id = $1`, [FORM_ID]);
    const verifySubmissions = await pool.query(`SELECT COUNT(*) as count FROM submissions WHERE form_id = $1`, [FORM_ID]);

    console.log(`Forms: ${verifyForms.rows[0].count} (should be 0)`);
    console.log(`Sub-forms: ${verifySubForms.rows[0].count} (should be 0)`);
    console.log(`Fields: ${verifyFields.rows[0].count} (should be 0)`);
    console.log(`Submissions: ${verifySubmissions.rows[0].count} (should be 0)\n`);

    // Check if tables exist
    const mainTableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      )
    `, [MAIN_TABLE]);

    const subTableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      )
    `, [SUBFORM_TABLE]);

    console.log(`Main table exists: ${mainTableExists.rows[0].exists} (should be false)`);
    console.log(`Sub-form table exists: ${subTableExists.rows[0].exists} (should be false)\n`);

    const allClean = verifyForms.rows[0].count === '0' &&
                     verifySubForms.rows[0].count === '0' &&
                     verifyFields.rows[0].count === '0' &&
                     verifySubmissions.rows[0].count === '0' &&
                     !mainTableExists.rows[0].exists &&
                     !subTableExists.rows[0].exists;

    if (allClean) {
      console.log('✅ Complete reset successful!\n');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('                         NEXT STEPS                         ');
      console.log('═══════════════════════════════════════════════════════════\n');
      console.log('1. Go to the frontend (http://localhost:3000)');
      console.log('2. Create a NEW form using the form builder');
      console.log('3. The system will automatically create new dynamic tables');
      console.log('4. Test submission and data storage\n');
      console.log('Database is now clean and ready for fresh forms!\n');
    } else {
      console.log('⚠️  Warning: Some data may remain. Please check manually.\n');
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

resetAllForms().catch(console.error);
