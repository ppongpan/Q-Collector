/**
 * Check Field sub_form_id Assignment
 * Verify which fields are missing sub_form_id
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

async function checkFieldSubFormId() {
  const client = await pool.connect();

  try {
    const subFormId = '26c5ab3e-e16b-41a7-85c6-65f3237b33a9';

    console.log(`\n🔍 Checking fields for sub-form: ${subFormId}\n`);

    // Get all fields that belong to this sub-form's parent form
    const fieldsQuery = `
      SELECT
        f.id,
        f.form_id,
        f.sub_form_id,
        f.title,
        f.type,
        f."order",
        sf.id as subform_check,
        sf.table_name
      FROM fields f
      LEFT JOIN sub_forms sf ON f.sub_form_id = sf.id
      WHERE f.form_id = (
        SELECT form_id FROM sub_forms WHERE id = $1
      )
      ORDER BY f."order";
    `;

    const result = await client.query(fieldsQuery, [subFormId]);

    console.log(`📋 Found ${result.rows.length} fields:\n`);

    result.rows.forEach((field, index) => {
      const hasSubFormId = field.sub_form_id === subFormId;
      const icon = hasSubFormId ? '✅' : '❌';

      console.log(`${icon} Field ${index + 1}:`);
      console.log(`   Title: ${field.title}`);
      console.log(`   Type: ${field.type}`);
      console.log(`   Form ID: ${field.form_id}`);
      console.log(`   Sub-form ID: ${field.sub_form_id || 'NULL'}`);
      console.log(`   Belongs to sub-form: ${hasSubFormId ? 'YES' : 'NO'}`);
      console.log(`   Table: ${field.table_name || 'N/A'}`);
      console.log('');
    });

    // Check table columns
    const tableName = 'service_entry_65f3237b33a9';

    console.log(`\n📊 Table structure for: ${tableName}\n`);

    const columnsQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = $1
      ORDER BY ordinal_position;
    `;

    const columnsResult = await client.query(columnsQuery, [tableName]);

    console.log(`Columns (${columnsResult.rows.length} total):`);
    columnsResult.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

checkFieldSubFormId()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error.message);
    process.exit(1);
  });
