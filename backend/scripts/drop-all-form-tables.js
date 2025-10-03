/**
 * Drop All Dynamic Form Tables
 * Removes all tables starting with 'form_' prefix
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

async function dropAllFormTables() {
  try {
    console.log('🗑️  Dropping all dynamic form tables...\n');

    // Get all tables starting with 'form_'
    const result = await pool.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename LIKE 'form_%'
      ORDER BY tablename;
    `);

    console.log(`Found ${result.rows.length} form tables:\n`);

    result.rows.forEach((row, idx) => {
      console.log(`  ${idx + 1}. ${row.tablename}`);
    });

    if (result.rows.length === 0) {
      console.log('\n✅ No form tables to drop.');
      return;
    }

    console.log('\n⚠️  WARNING: This will delete all data in these tables!');
    console.log('Proceeding in 3 seconds...\n');

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Drop each table
    for (const row of result.rows) {
      try {
        await pool.query(`DROP TABLE IF EXISTS "${row.tablename}" CASCADE;`);
        console.log(`✅ Dropped: ${row.tablename}`);
      } catch (error) {
        console.error(`❌ Failed to drop ${row.tablename}:`, error.message);
      }
    }

    console.log(`\n✨ Dropped ${result.rows.length} form tables successfully!`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
dropAllFormTables().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
