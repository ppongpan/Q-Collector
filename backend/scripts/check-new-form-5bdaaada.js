/**
 * Check New Form 5bdaaada-1685-4dc9-b2a0-e9b413fecd22
 * Diagnose validation error: "Invalid URL format"
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

async function checkForm() {
  try {
    const formId = '5bdaaada-1685-4dc9-b2a0-e9b413fecd22';
    console.log('🔍 Checking Form:', formId);
    console.log('');

    // 1. Get form details
    const formQuery = `
      SELECT id, title, table_name, is_active
      FROM forms
      WHERE id = $1
    `;
    const formResult = await pool.query(formQuery, [formId]);

    if (formResult.rows.length === 0) {
      console.log('❌ Form not found');
      await pool.end();
      return;
    }

    const form = formResult.rows[0];
    console.log('📋 Form Details:');
    console.log(`   Title: ${form.title}`);
    console.log(`   Table: ${form.table_name}`);
    console.log(`   Active: ${form.is_active}`);
    console.log('');

    // 2. Get all fields
    const fieldsQuery = `
      SELECT id, title, type, required, options
      FROM fields
      WHERE form_id = $1
      ORDER BY "order" ASC
    `;
    const fieldsResult = await pool.query(fieldsQuery, [formId]);

    console.log(`📋 Found ${fieldsResult.rows.length} Fields:`);
    console.log('');

    fieldsResult.rows.forEach((field, i) => {
      const requiredMark = field.required ? '🔴 REQUIRED' : '⚪ Optional';
      const icon = field.type === 'url' ? '🔗' :
                   field.type === 'email' ? '✉️' :
                   field.type === 'phone' ? '📞' :
                   field.type === 'image_upload' ? '🖼️' :
                   field.type === 'file_upload' ? '📎' : '   ';

      console.log(`${icon} ${i + 1}. ${field.title}`);
      console.log(`   Type: ${field.type}`);
      console.log(`   Required: ${requiredMark}`);
      console.log(`   Field ID: ${field.id}`);

      if (field.options) {
        console.log(`   Options: ${JSON.stringify(field.options, null, 2)}`);
      }

      console.log('');
    });

    // 3. Find URL fields specifically
    const urlFields = fieldsResult.rows.filter(f => f.type === 'url');

    if (urlFields.length > 0) {
      console.log('🔗 URL Field Analysis:');
      console.log('');

      urlFields.forEach(field => {
        console.log(`Field: ${field.title}`);
        console.log(`  - ID: ${field.id}`);
        console.log(`  - Required: ${field.required ? 'YES (❌ MUST PROVIDE VALID URL)' : 'NO (can be empty)'}`);
        console.log('');
        console.log('  ⚠️  If this field is REQUIRED, you MUST enter a valid URL like:');
        console.log('     ✅ https://example.com');
        console.log('     ✅ http://google.com');
        console.log('     ✅ https://www.facebook.com/page');
        console.log('');
        console.log('  ❌ Invalid formats that will cause 400 error:');
        console.log('     ❌ Empty string ""');
        console.log('     ❌ Just text "test"');
        console.log('     ❌ Invalid URL "not a url"');
        console.log('');
      });
    }

    // 4. Get sub-forms
    const subFormsQuery = `
      SELECT id, title, table_name
      FROM sub_forms
      WHERE form_id = $1
      ORDER BY id ASC
    `;
    const subFormsResult = await pool.query(subFormsQuery, [formId]);

    if (subFormsResult.rows.length > 0) {
      console.log('📦 Sub-Forms:');
      console.log('');

      for (const subForm of subFormsResult.rows) {
        console.log(`  - ${subForm.title}`);
        console.log(`    Table: ${subForm.table_name}`);
        console.log(`    ID: ${subForm.id}`);

        // Get sub-form fields
        const subFieldsQuery = `
          SELECT id, title, type, required
          FROM fields
          WHERE sub_form_id = $1
          ORDER BY "order" ASC
        `;
        const subFieldsResult = await pool.query(subFieldsQuery, [subForm.id]);

        console.log(`    Fields (${subFieldsResult.rows.length}):`);
        subFieldsResult.rows.forEach((field, i) => {
          const requiredMark = field.required ? '🔴' : '⚪';
          console.log(`      ${requiredMark} ${i + 1}. ${field.title} (${field.type})`);
        });

        console.log('');
      }
    }

    // 5. Solution
    console.log('═'.repeat(80));
    console.log('💡 SOLUTION TO FIX 400 ERROR');
    console.log('═'.repeat(80));
    console.log('');
    console.log('The error "Invalid URL format" means one of these:');
    console.log('');
    console.log('1. ✅ If the URL field is NOT REQUIRED (⚪ Optional):');
    console.log('   → Leave it completely empty (do not type anything)');
    console.log('   → OR enter a valid URL with http:// or https://');
    console.log('');
    console.log('2. ❌ If the URL field is REQUIRED (🔴 REQUIRED):');
    console.log('   → You MUST enter a valid URL');
    console.log('   → Format: https://example.com or http://example.com');
    console.log('   → Cannot be empty, cannot be plain text');
    console.log('');
    console.log('3. 🔧 Quick Fix Options:');
    console.log('   A. Enter a valid URL in the form submission');
    console.log('   B. OR go back to form builder and make the URL field optional');
    console.log('   C. OR delete the URL field if not needed');
    console.log('');

    await pool.end();
    console.log('✅ Analysis complete');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

checkForm();
