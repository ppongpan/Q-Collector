/**
 * Delete all data from q_con_service_center_caa4f7c76a95 table
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

async function deleteTableData() {
  const client = await pool.connect();

  try {
    const tableName = 'q_con_service_center_caa4f7c76a95';

    console.log(`\n🗑️  Deleting data from table: ${tableName}\n`);

    // 1. Check if table exists
    const checkQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = $1
      );
    `;
    const checkResult = await client.query(checkQuery, [tableName]);

    if (!checkResult.rows[0].exists) {
      console.log(`❌ Table ${tableName} does not exist`);
      return;
    }

    console.log(`✅ Table ${tableName} exists`);

    // 2. Count rows before deletion
    const countBefore = await client.query(`SELECT COUNT(*) FROM "${tableName}"`);
    console.log(`📊 Rows before deletion: ${countBefore.rows[0].count}`);

    if (countBefore.rows[0].count === '0') {
      console.log(`ℹ️  Table is already empty`);
      return;
    }

    // 3. Delete all data
    const deleteResult = await client.query(`DELETE FROM "${tableName}"`);
    console.log(`✅ Deleted ${deleteResult.rowCount} rows from ${tableName}`);

    // 4. Count rows after deletion to verify
    const countAfter = await client.query(`SELECT COUNT(*) FROM "${tableName}"`);
    console.log(`📊 Rows after deletion: ${countAfter.rows[0].count}`);

    console.log(`\n✅ Data deletion completed successfully\n`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

deleteTableData()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
