/**
 * Verify table_deletion_logs table was created successfully
 */

const { Client } = require('pg');
require('dotenv').config();

async function verifyTable() {
  const client = new Client({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'qcollector_db',
    user: process.env.POSTGRES_USER || 'qcollector',
    password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'table_deletion_logs'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ Table table_deletion_logs does not exist!\n');
      return;
    }

    console.log('✅ Table table_deletion_logs exists\n');

    // Get column information
    const columns = await client.query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'table_deletion_logs'
      ORDER BY ordinal_position;
    `);

    console.log('📋 Table Structure:');
    console.log('─'.repeat(80));
    console.log('Column Name'.padEnd(30), 'Type'.padEnd(20), 'Nullable'.padEnd(10), 'Default');
    console.log('─'.repeat(80));

    columns.rows.forEach(col => {
      console.log(
        col.column_name.padEnd(30),
        col.data_type.padEnd(20),
        col.is_nullable.padEnd(10),
        (col.column_default || '').substring(0, 30)
      );
    });
    console.log('─'.repeat(80));
    console.log(`Total columns: ${columns.rows.length}\n`);

    // Get indexes
    const indexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'table_deletion_logs'
      ORDER BY indexname;
    `);

    console.log('📑 Indexes:');
    console.log('─'.repeat(80));
    indexes.rows.forEach(idx => {
      console.log(`  • ${idx.indexname}`);
    });
    console.log('─'.repeat(80));
    console.log(`Total indexes: ${indexes.rows.length}\n`);

    // Check row count
    const count = await client.query('SELECT COUNT(*) as count FROM table_deletion_logs');
    console.log(`📊 Current row count: ${count.rows[0].count}\n`);

    console.log('✅ Table verification complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await client.end();
  }
}

verifyTable();
