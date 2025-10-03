/**
 * Recreate Forms Table
 * Restore forms table structure
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

async function recreateFormsTable() {
  try {
    console.log('🔧 Recreating forms table...\n');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS forms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        table_name VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        visible_roles TEXT[] DEFAULT ARRAY['general_user']::TEXT[],
        settings JSONB DEFAULT '{}'::jsonb,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Forms table created');

    // Create index on table_name
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_forms_table_name ON forms(table_name);
    `);

    console.log('✅ Index on table_name created');

    // Verify
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'forms'
      ORDER BY ordinal_position;
    `);

    console.log(`\n📋 Forms table structure (${result.rows.length} columns):`);
    result.rows.forEach(col => {
      console.log(`  - ${col.column_name.padEnd(20)} ${col.data_type}`);
    });

    console.log('\n✨ Forms table recreated successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

recreateFormsTable().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
