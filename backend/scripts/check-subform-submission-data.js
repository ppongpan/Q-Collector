/**
 * Check Sub-Form Submission Data
 * Diagnose why sub-form submissions aren't appearing in list
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

async function checkData() {
  try {
    console.log('🔍 Checking Sub-Form Submission Data\n');
    console.log('═'.repeat(80));

    // 1. Check the new form's main submission
    const formId = '5bdaaada-1685-4dc9-b2a0-e9b413fecd22';
    const mainFormSubId = 'cb44a22a-1dc4-446f-b707-e99a92cb2084';

    console.log('\n📋 Form Details:');
    const formQuery = `SELECT id, title, table_name FROM forms WHERE id = $1`;
    const formResult = await pool.query(formQuery, [formId]);

    if (formResult.rows.length > 0) {
      const form = formResult.rows[0];
      console.log(`   Title: ${form.title}`);
      console.log(`   Table: ${form.table_name}`);
      console.log('');

      // 2. Check main form submission in dynamic table
      console.log('📊 Main Form Dynamic Table Data:');
      try {
        const mainTableQuery = `SELECT * FROM "${form.table_name}" WHERE id = $1`;
        const mainTableResult = await pool.query(mainTableQuery, [mainFormSubId]);

        if (mainTableResult.rows.length > 0) {
          console.log(`   ✅ Found main submission in dynamic table`);
          console.log(`   ID: ${mainTableResult.rows[0].id}`);
          console.log(`   Username: ${mainTableResult.rows[0].username}`);
          console.log(`   Submitted At: ${mainTableResult.rows[0].submitted_at}`);
        } else {
          console.log(`   ❌ Main submission NOT FOUND in dynamic table`);
          console.log(`   Looking for ID: ${mainFormSubId}`);
        }
      } catch (error) {
        console.log(`   ❌ Error querying main table: ${error.message}`);
      }
      console.log('');
    }

    // 3. Check sub-form details
    const subFormId = '70cbcad1-0caa-495c-832e-9d519c8a7ffb';
    console.log('📦 Sub-Form Details:');
    const subFormQuery = `SELECT id, title, table_name, form_id FROM sub_forms WHERE id = $1`;
    const subFormResult = await pool.query(subFormQuery, [subFormId]);

    if (subFormResult.rows.length === 0) {
      console.log('   ❌ Sub-form not found');
      await pool.end();
      return;
    }

    const subForm = subFormResult.rows[0];
    console.log(`   Title: ${subForm.title}`);
    console.log(`   Table: ${subForm.table_name}`);
    console.log(`   Parent Form ID: ${subForm.form_id}`);
    console.log('');

    // 4. Check sub-form submissions in submissions table
    console.log('📋 Submissions Table (sub_forms):');
    const submissionsQuery = `
      SELECT id, sub_form_id, parent_id, status, submitted_at, submitted_by
      FROM submissions
      WHERE sub_form_id = $1
      ORDER BY submitted_at DESC
    `;
    const submissionsResult = await pool.query(submissionsQuery, [subFormId]);

    console.log(`   Found ${submissionsResult.rows.length} submission(s) in submissions table`);
    submissionsResult.rows.forEach((row, i) => {
      console.log(`   ${i + 1}. ID: ${row.id}`);
      console.log(`      Parent ID: ${row.parent_id}`);
      console.log(`      Status: ${row.status}`);
      console.log(`      Submitted At: ${row.submitted_at}`);
      console.log('');
    });

    // 5. Check sub-form dynamic table
    console.log('📊 Sub-Form Dynamic Table Data:');
    try {
      const dynamicTableQuery = `SELECT * FROM "${subForm.table_name}" ORDER BY submitted_at DESC`;
      const dynamicTableResult = await pool.query(dynamicTableQuery);

      console.log(`   Found ${dynamicTableResult.rows.length} row(s) in dynamic table "${subForm.table_name}"`);
      console.log('');

      if (dynamicTableResult.rows.length > 0) {
        console.log('   Column Names:');
        console.log(`   ${Object.keys(dynamicTableResult.rows[0]).join(', ')}`);
        console.log('');

        dynamicTableResult.rows.forEach((row, i) => {
          console.log(`   Row ${i + 1}:`);
          console.log(`      id: ${row.id}`);
          console.log(`      parent_id: ${row.parent_id}`);
          console.log(`      main_form_subid: ${row.main_form_subid}`);
          console.log(`      username: ${row.username}`);
          console.log(`      submitted_at: ${row.submitted_at}`);

          // Show field data
          const systemColumns = ['id', 'parent_id', 'main_form_subid', 'parent_id2', 'username', 'order', 'submitted_at', 'form_id'];
          const fieldColumns = Object.keys(row).filter(k => !systemColumns.includes(k));
          console.log(`      Field Data: ${JSON.stringify(fieldColumns.reduce((obj, key) => ({...obj, [key]: row[key]}), {}))}`);
          console.log('');
        });
      }

      // 6. Check what main_form_subid values exist
      console.log('🔍 Analyzing main_form_subid values:');
      console.log(`   Expected: ${mainFormSubId}`);

      if (dynamicTableResult.rows.length > 0) {
        const uniqueMainFormSubIds = [...new Set(dynamicTableResult.rows.map(r => r.main_form_subid))];
        console.log(`   Found: ${uniqueMainFormSubIds.join(', ')}`);

        if (!uniqueMainFormSubIds.includes(mainFormSubId)) {
          console.log(`   ❌ MISMATCH: Expected main_form_subid not found in table!`);
          console.log(`   This is why the query returns 0 results.`);
        } else {
          console.log(`   ✅ Match found`);
        }
      }

    } catch (error) {
      console.log(`   ❌ Error querying dynamic table: ${error.message}`);
    }

    console.log('');
    console.log('═'.repeat(80));
    console.log('💡 DIAGNOSIS:');
    console.log('═'.repeat(80));
    console.log('');
    console.log('The query uses: WHERE main_form_subid = $1');
    console.log(`Looking for: ${mainFormSubId}`);
    console.log('');
    console.log('If the dynamic table has different main_form_subid values,');
    console.log('the query will return 0 results even though data exists.');
    console.log('');
    console.log('Check the "main_form_subid" values above to see if they match.');
    console.log('');

    await pool.end();

  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

checkData();
