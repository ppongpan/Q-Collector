/**
 * Check Sub-form Table Data
 * Verify if data is being inserted into sub-form dynamic tables
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

async function checkSubFormTableData() {
  const client = await pool.connect();

  try {
    const tableName = 'service_entry_65f3237b33a9';

    console.log(`\n🔍 Checking table: ${tableName}\n`);

    // Check if table exists
    const existsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = $1
      );
    `;
    const existsResult = await client.query(existsQuery, [tableName]);

    if (!existsResult.rows[0].exists) {
      console.log(`❌ Table ${tableName} does not exist!`);
      return;
    }

    console.log(`✅ Table ${tableName} exists`);

    // Get table structure
    const structureQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = $1
      ORDER BY ordinal_position;
    `;
    const structureResult = await client.query(structureQuery, [tableName]);

    console.log(`\n📋 Table structure (${structureResult.rows.length} columns):`);
    structureResult.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });

    // Count rows
    const countQuery = `SELECT COUNT(*) as count FROM "${tableName}";`;
    const countResult = await client.query(countQuery);
    const rowCount = parseInt(countResult.rows[0].count);

    console.log(`\n📊 Row count: ${rowCount}`);

    // Get all rows
    if (rowCount > 0) {
      const dataQuery = `SELECT * FROM "${tableName}" ORDER BY submitted_at DESC LIMIT 10;`;
      const dataResult = await client.query(dataQuery);

      console.log(`\n📦 Data (latest ${dataResult.rows.length} rows):`);
      dataResult.rows.forEach((row, index) => {
        console.log(`\n   Row ${index + 1}:`);
        console.log(JSON.stringify(row, null, 2));
      });
    } else {
      console.log(`\n⚠️  No data found in table!`);
    }

    // Check related submissions
    console.log(`\n🔗 Checking submissions table for sub-form submissions...`);
    const submissionsQuery = `
      SELECT id, form_id, parent_id, sub_form_id, status, submitted_at
      FROM submissions
      WHERE sub_form_id = (
        SELECT id FROM sub_forms WHERE table_name = $1
      )
      ORDER BY submitted_at DESC
      LIMIT 5;
    `;
    const submissionsResult = await client.query(submissionsQuery, [tableName]);

    if (submissionsResult.rows.length > 0) {
      console.log(`\n   Found ${submissionsResult.rows.length} sub-form submissions:`);
      submissionsResult.rows.forEach((sub, index) => {
        console.log(`\n   Submission ${index + 1}:`);
        console.log(`      ID: ${sub.id}`);
        console.log(`      Form ID: ${sub.form_id}`);
        console.log(`      Parent ID: ${sub.parent_id}`);
        console.log(`      SubForm ID: ${sub.sub_form_id}`);
        console.log(`      Status: ${sub.status}`);
        console.log(`      Submitted: ${sub.submitted_at}`);
      });
    } else {
      console.log(`   ❌ No submissions found in submissions table!`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSubFormTableData()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error.message);
    process.exit(1);
  });
