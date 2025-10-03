/**
 * Fix Order Index Columns
 * Adds order_index column to fields and sub_forms tables
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

async function fixOrderIndex() {
  try {
    console.log('🔧 Fixing order_index columns...\n');

    // Add order_index to fields table
    console.log('1. Adding order_index to fields table...');
    await pool.query(`
      ALTER TABLE fields
      ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
    `);
    console.log('✅ Added order_index to fields');

    // Add order_index to sub_forms table
    console.log('2. Adding order_index to sub_forms table...');
    await pool.query(`
      ALTER TABLE sub_forms
      ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
    `);
    console.log('✅ Added order_index to sub_forms');

    // Update existing records to use order column value
    console.log('3. Updating existing field order_index values...');
    await pool.query(`
      UPDATE fields
      SET order_index = "order"
      WHERE order_index = 0 AND "order" IS NOT NULL;
    `);
    console.log('✅ Updated fields order_index');

    console.log('4. Updating existing sub_form order_index values...');
    await pool.query(`
      UPDATE sub_forms
      SET order_index = "order"
      WHERE order_index = 0 AND "order" IS NOT NULL;
    `);
    console.log('✅ Updated sub_forms order_index');

    console.log('\n✨ All order_index columns fixed successfully!');
  } catch (error) {
    console.error('❌ Error fixing order_index:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
fixOrderIndex().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
