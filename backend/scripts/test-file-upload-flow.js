/**
 * Test File Upload Flow
 * Verifies that file uploads work correctly in sub-form submissions
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

async function testFileUploadFlow() {
  try {
    console.log('🔍 Testing File Upload Flow...\n');

    // 1. Find the latest sub-form
    console.log('📋 Step 1: Finding latest sub-form...');
    const subFormQuery = `
      SELECT id, title, table_name, form_id
      FROM sub_forms
      ORDER BY id DESC
      LIMIT 1
    `;
    const subFormResult = await pool.query(subFormQuery);

    if (subFormResult.rows.length === 0) {
      console.log('⚠️  No sub-forms found in database');
      await pool.end();
      return;
    }

    const subForm = subFormResult.rows[0];
    console.log(`✅ Found sub-form: ${subForm.title}`);
    console.log(`   ID: ${subForm.id}`);
    console.log(`   Table: ${subForm.table_name}\n`);

    // 2. Find fields for this sub-form
    console.log('📋 Step 2: Finding fields...');
    const fieldsQuery = `
      SELECT id, title, type
      FROM fields
      WHERE sub_form_id = $1
      ORDER BY "order" ASC
    `;
    const fieldsResult = await pool.query(fieldsQuery, [subForm.id]);

    console.log(`✅ Found ${fieldsResult.rows.length} fields:\n`);
    fieldsResult.rows.forEach((field, i) => {
      const icon = field.type === 'image_upload' ? '🖼️ ' : field.type === 'file_upload' ? '📎 ' : '   ';
      console.log(`${icon}${i + 1}. ${field.title} (${field.type})`);
      console.log(`   ID: ${field.id}\n`);
    });

    // 3. Check data in dynamic table
    console.log(`📋 Step 3: Checking data in ${subForm.table_name}...\n`);
    const dataQuery = `SELECT * FROM "${subForm.table_name}" ORDER BY submitted_at DESC LIMIT 5`;
    const dataResult = await pool.query(dataQuery);

    if (dataResult.rows.length === 0) {
      console.log('⚠️  No data in sub-form table yet\n');
      console.log('💡 Next steps:');
      console.log('   1. Refresh your browser to load the updated SubFormView.jsx');
      console.log('   2. Create a new sub-form submission');
      console.log('   3. Select a file for the image/file upload field');
      console.log('   4. Save the submission');
      console.log('   5. Run this script again to verify the filename is saved\n');
      await pool.end();
      return;
    }

    console.log(`✅ Found ${dataResult.rows.length} submissions in dynamic table:\n`);

    // 4. Check each submission for file data
    dataResult.rows.forEach((row, i) => {
      console.log(`${'='.repeat(80)}`);
      console.log(`Submission ${i + 1}: ID ${row.id}`);
      console.log(`${'='.repeat(80)}`);
      console.log(`Submitted: ${row.submitted_at}`);
      console.log(`Username: ${row.username}`);
      console.log(`Parent ID: ${row.parent_id}`);
      console.log('');

      // Show all data columns
      const systemColumns = ['id', 'parent_id', 'main_form_subid', 'parent_id2', 'username', 'order', 'submitted_at', 'form_id'];
      const dataColumns = Object.keys(row).filter(key => !systemColumns.includes(key));

      console.log('Field Data:');
      dataColumns.forEach(columnName => {
        const value = row[columnName];
        const isFileColumn = columnName.includes('phap') || columnName.includes('image') || columnName.includes('file');
        const icon = isFileColumn ? '🖼️ ' : '   ';

        if (value === null) {
          console.log(`${icon}${columnName}: NULL ❌`);
        } else if (value === '') {
          console.log(`${icon}${columnName}: "" (empty string) ⚠️`);
        } else if (typeof value === 'string' && value.length > 0) {
          console.log(`${icon}${columnName}: "${value}" ✅`);
        } else {
          console.log(`${icon}${columnName}: ${JSON.stringify(value)}`);
        }
      });

      console.log('');
    });

    // 5. Summary
    console.log(`${'='.repeat(80)}`);
    console.log('📊 SUMMARY');
    console.log(`${'='.repeat(80)}\n`);

    const hasFileFields = fieldsResult.rows.some(f => f.type === 'image_upload' || f.type === 'file_upload');
    const latestRow = dataResult.rows[0];
    const dataColumns = Object.keys(latestRow).filter(key =>
      !['id', 'parent_id', 'main_form_subid', 'parent_id2', 'username', 'order', 'submitted_at', 'form_id'].includes(key)
    );
    const hasFileData = dataColumns.some(col => {
      const value = latestRow[col];
      const isFileColumn = col.includes('phap') || col.includes('image') || col.includes('file');
      return isFileColumn && value && value !== '';
    });

    if (hasFileFields) {
      console.log('✅ Sub-form has file upload fields');
      if (hasFileData) {
        console.log('✅ File data is being saved to database!');
        console.log('✅ File upload flow is working correctly!\n');
      } else {
        console.log('⚠️  File upload fields exist but no file data found');
        console.log('💡 This means:');
        console.log('   - Either no files have been uploaded yet');
        console.log('   - OR the frontend fix needs to be tested\n');
        console.log('🔧 Action Required:');
        console.log('   1. Refresh browser to load updated SubFormView.jsx');
        console.log('   2. Create new sub-form submission with file upload');
        console.log('   3. Verify filename appears in submission table\n');
      }
    } else {
      console.log('ℹ️  This sub-form has no file upload fields');
    }

    await pool.end();
    console.log('✅ Test complete');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

testFileUploadFlow();
