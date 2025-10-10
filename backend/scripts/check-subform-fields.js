/**
 * Check Sub-form Fields
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

async function checkSubFormFields() {
  const client = await pool.connect();

  try {
    const tableName = 'service_entry_65f3237b33a9';

    // Find sub-form by table name
    const subFormQuery = `
      SELECT id, form_id, title, table_name
      FROM sub_forms
      WHERE table_name = $1;
    `;
    const subFormResult = await client.query(subFormQuery, [tableName]);

    if (subFormResult.rows.length === 0) {
      console.log(`❌ No sub-form found with table_name: ${tableName}`);
      return;
    }

    const subForm = subFormResult.rows[0];
    console.log(`\n✅ Sub-form found:`);
    console.log(`   ID: ${subForm.id}`);
    console.log(`   Form ID: ${subForm.form_id}`);
    console.log(`   Title: ${subForm.title}`);
    console.log(`   Table: ${subForm.table_name}`);

    // Get fields for this sub-form
    const fieldsQuery = `
      SELECT id, form_id, title, type, "order"
      FROM fields
      WHERE form_id = $1
      ORDER BY "order";
    `;
    const fieldsResult = await client.query(fieldsQuery, [subForm.form_id]);

    console.log(`\n📋 Fields (${fieldsResult.rows.length} total):`);
    fieldsResult.rows.forEach((field, index) => {
      console.log(`   ${index + 1}. ${field.title} (${field.type}) - Form ID: ${field.form_id}`);
    });

    // Check which fields belong to this specific sub-form
    // Note: We need to check if there's a sub_form_id column
    const hasSubFormIdQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'fields'
        AND column_name = 'sub_form_id'
      );
    `;
    const hasSubFormIdResult = await client.query(hasSubFormIdQuery);

    if (hasSubFormIdResult.rows[0].exists) {
      console.log(`\n🔍 Checking fields with sub_form_id = ${subForm.id}:`);
      const subFormFieldsQuery = `
        SELECT id, form_id, sub_form_id, title, type, "order"
        FROM fields
        WHERE sub_form_id = $1
        ORDER BY "order";
      `;
      const subFormFieldsResult = await client.query(subFormFieldsQuery, [subForm.id]);

      if (subFormFieldsResult.rows.length > 0) {
        console.log(`   Found ${subFormFieldsResult.rows.length} fields:`);
        subFormFieldsResult.rows.forEach((field, index) => {
          console.log(`   ${index + 1}. ${field.title} (${field.type})`);
        });
      } else {
        console.log(`   ❌ No fields found with sub_form_id = ${subForm.id}`);
      }
    } else {
      console.log(`\n⚠️  Column 'sub_form_id' does not exist in 'fields' table!`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSubFormFields()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error.message);
    process.exit(1);
  });
