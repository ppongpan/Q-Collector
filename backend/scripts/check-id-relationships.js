/**
 * Check ID Relationships
 *
 * Investigates the relationship between:
 * - submissions table IDs
 * - Dynamic table IDs
 * - Sub-form main_form_subid values
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

async function checkRelationships() {
  console.log('🔍 CHECKING ID RELATIONSHIPS');
  console.log('=' .repeat(80));
  console.log();

  try {
    // 1. Check submissions table
    console.log('📋 SUBMISSIONS TABLE');
    console.log('-'.repeat(80));
    const subs = await pool.query(`
      SELECT id, form_id, "createdAt"
      FROM submissions
      WHERE id IN ($1, $2)
      ORDER BY "createdAt"
    `, ['002a48b0-9020-468a-bf68-345b4863ce85', 'd9dc2a82-3973-4134-99a7-cae58ac57bfd']);

    console.log(`Found ${subs.rows.length} submissions:`);
    console.log();
    subs.rows.forEach((r, i) => {
      console.log(`Submission ${i + 1}:`);
      console.log(`  ID: ${r.id}`);
      console.log(`  form_id: ${r.form_id}`);
      console.log(`  createdAt: ${r.createdAt}`);
      console.log();
    });

    // 2. Check main form dynamic table - ALL RECORDS
    console.log('=' .repeat(80));
    console.log('📋 MAIN FORM DYNAMIC TABLE (ALL RECORDS)');
    console.log('-'.repeat(80));
    const mainForm = await pool.query(`
      SELECT id, username, submitted_at
      FROM formsngkhomulkhayngankhnadklang_elk_6555e6871094
      ORDER BY submitted_at
    `);

    console.log(`Found ${mainForm.rows.length} records in dynamic table:`);
    console.log();
    mainForm.rows.forEach((r, i) => {
      console.log(`Record ${i + 1}:`);
      console.log(`  ID: ${r.id}`);
      console.log(`  username: ${r.username}`);
      console.log(`  submitted_at: ${r.submitted_at}`);

      // Check if this ID matches our known IDs
      if (r.id === '002a48b0-9020-468a-bf68-345b4863ce85') {
        console.log(`  ⚠️  This is parent_id from sub-form table!`);
      }
      if (r.id === 'd9dc2a82-3973-4134-99a7-cae58ac57bfd') {
        console.log(`  ✅ This is the NEW submission`);
      }
      if (r.id === 'e5d08fa0-8dea-45f3-81fe-6d4a4d005a26') {
        console.log(`  ✅ This is main_form_subid from sub-form table!`);
      }

      console.log();
    });

    // 3. Check sub-form table
    console.log('=' .repeat(80));
    console.log('📋 SUB-FORM TABLE');
    console.log('-'.repeat(80));
    const subForm = await pool.query(`
      SELECT id, parent_id, main_form_subid, username, submitted_at
      FROM formbanthuekkartidtamkhay_c54e7f746636
      ORDER BY submitted_at
    `);

    console.log(`Found ${subForm.rows.length} sub-form submissions:`);
    console.log();
    subForm.rows.forEach((r, i) => {
      console.log(`Sub-form Record ${i + 1}:`);
      console.log(`  ID: ${r.id}`);
      console.log(`  parent_id: ${r.parent_id}`);
      console.log(`  main_form_subid: ${r.main_form_subid}`);
      console.log(`  username: ${r.username}`);
      console.log(`  submitted_at: ${r.submitted_at}`);
      console.log();
    });

    // 4. Analysis
    console.log('=' .repeat(80));
    console.log('📊 ANALYSIS');
    console.log('-'.repeat(80));
    console.log();

    // Check if e5d08fa0 exists in main form dynamic table
    const hasE5d08fa0 = mainForm.rows.some(r => r.id === 'e5d08fa0-8dea-45f3-81fe-6d4a4d005a26');
    console.log(`1. Does main_form_subid (e5d08fa0...) exist in dynamic table? ${hasE5d08fa0 ? '✅ YES' : '❌ NO'}`);

    // Check if 002a48b0 exists in main form dynamic table
    const has002a48b0 = mainForm.rows.some(r => r.id === '002a48b0-9020-468a-bf68-345b4863ce85');
    console.log(`2. Does parent_id (002a48b0...) exist in dynamic table? ${has002a48b0 ? '✅ YES' : '❌ NO'}`);

    // Check if d9dc2a82 exists in main form dynamic table
    const hasD9dc2a82 = mainForm.rows.some(r => r.id === 'd9dc2a82-3973-4134-99a7-cae58ac57bfd');
    console.log(`3. Does new submission (d9dc2a82...) exist in dynamic table? ${hasD9dc2a82 ? '✅ YES' : '❌ NO'}`);

    console.log();
    console.log('🎯 CONCLUSION:');
    console.log();

    if (hasE5d08fa0) {
      console.log('✅ The main_form_subid (e5d08fa0...) EXISTS in the dynamic table.');
      console.log('   Frontend should use this ID to query sub-forms.');
    } else {
      console.log('❌ The main_form_subid (e5d08fa0...) does NOT exist in the dynamic table.');
      console.log('   This indicates a data inconsistency issue.');
    }

    console.log();
    console.log('💡 RECOMMENDATION:');
    console.log();
    console.log('The frontend should:');
    console.log('1. Use the ID from the dynamic table (submissionData.data.id)');
    console.log('2. Query sub-forms with: /submissions/{dynamicTableId}/sub-forms/{subFormId}');
    console.log(`3. For the viewing submission, the correct ID to use is: ${hasE5d08fa0 ? 'e5d08fa0...' : has002a48b0 ? '002a48b0...' : 'UNKNOWN'}`);
    console.log();

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

checkRelationships();
