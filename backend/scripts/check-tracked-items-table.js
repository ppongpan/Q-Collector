/**
 * Check tracked_items_for_sale table structure
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

async function checkTable() {
  const client = await pool.connect();

  try {
    const tableName = 'tracked_items_for_sale_1d005727e18e';
    const subFormId = '42990b15-f2da-4a2c-bd52-1d005727e18e';

    console.log(`\n🔍 Checking table: ${tableName}\n`);

    // 1. Check table structure
    const structureQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = $1
      ORDER BY ordinal_position;
    `;
    const structureResult = await client.query(structureQuery, [tableName]);

    console.log(`📋 Table structure (${structureResult.rows.length} columns):`);
    structureResult.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });

    // 2. Check sub-form fields
    console.log(`\n📝 Sub-form fields from database:`);
    const fieldsQuery = `
      SELECT id, title, type, "order", sub_form_id
      FROM fields
      WHERE sub_form_id = $1
      ORDER BY "order";
    `;
    const fieldsResult = await client.query(fieldsQuery, [subFormId]);

    console.log(`   Found ${fieldsResult.rows.length} fields:`);
    fieldsResult.rows.forEach((field, index) => {
      console.log(`   ${index + 1}. ${field.title} (${field.type})`);
    });

    // 3. Count rows
    const countQuery = `SELECT COUNT(*) as count FROM "${tableName}";`;
    const countResult = await client.query(countQuery);
    console.log(`\n📊 Row count: ${countResult.rows[0].count}`);

    // 4. Check if data exists
    if (parseInt(countResult.rows[0].count) > 0) {
      const dataQuery = `SELECT * FROM "${tableName}" LIMIT 5;`;
      const dataResult = await client.query(dataQuery);

      console.log(`\n📦 Sample data (${dataResult.rows.length} rows):`);
      dataResult.rows.forEach((row, index) => {
        console.log(`\n   Row ${index + 1}:`);
        console.log(JSON.stringify(row, null, 2));
      });
    }

    // 5. Check submissions table
    console.log(`\n🔗 Checking submissions table:`);
    const submissionsQuery = `
      SELECT id, form_id, sub_form_id, parent_id, status, submitted_at
      FROM submissions
      WHERE sub_form_id = $1
      ORDER BY submitted_at DESC
      LIMIT 5;
    `;
    const submissionsResult = await client.query(submissionsQuery, [subFormId]);

    console.log(`   Found ${submissionsResult.rows.length} sub-form submissions:`);
    submissionsResult.rows.forEach((sub, index) => {
      console.log(`\n   Submission ${index + 1}:`);
      console.log(`      ID: ${sub.id}`);
      console.log(`      Form ID: ${sub.form_id}`);
      console.log(`      Sub-form ID: ${sub.sub_form_id}`);
      console.log(`      Parent ID: ${sub.parent_id}`);
      console.log(`      Status: ${sub.status}`);
    });

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTable()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error.message);
    process.exit(1);
  });
