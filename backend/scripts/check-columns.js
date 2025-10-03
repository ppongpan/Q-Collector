/**
 * Check Database Columns
 * Verify that order_index columns exist
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

async function checkColumns() {
  try {
    console.log('🔍 Checking database columns...\n');

    // Check fields table
    console.log('1. Checking fields table columns:');
    const fieldsColumns = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'fields'
      ORDER BY ordinal_position;
    `);
    console.log('Fields columns:', fieldsColumns.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));

    const hasFieldsOrderIndex = fieldsColumns.rows.some(r => r.column_name === 'order_index');
    console.log(hasFieldsOrderIndex ? '✅ order_index exists in fields' : '❌ order_index missing in fields');

    // Check sub_forms table
    console.log('\n2. Checking sub_forms table columns:');
    const subFormsColumns = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'sub_forms'
      ORDER BY ordinal_position;
    `);
    console.log('SubForms columns:', subFormsColumns.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));

    const hasSubFormsOrderIndex = subFormsColumns.rows.some(r => r.column_name === 'order_index');
    console.log(hasSubFormsOrderIndex ? '✅ order_index exists in sub_forms' : '❌ order_index missing in sub_forms');

    console.log('\n✨ Column check complete!');
  } catch (error) {
    console.error('❌ Error checking columns:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
checkColumns().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
