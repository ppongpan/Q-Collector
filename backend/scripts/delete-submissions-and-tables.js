/**
 * Delete Specific Submissions and Unused Tables
 * - Delete submissions: b0ef8df1-7cd2-41af-9d71-b8aa16af7a0b, eb6dcbca-08c0-4486-ab70-904290c756f9
 * - Delete table: service_log_0fcb52ff33c6
 */

const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'qcollector_db',
    user: process.env.POSTGRES_USER || 'qcollector',
    password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
  });

  try {
    await client.connect();
    console.log('\n🔧 Starting deletion process...\n');

    // Submission IDs to delete
    const submissionIds = [
      'b0ef8df1-7cd2-41af-9d71-b8aa16af7a0b',
      'eb6dcbca-08c0-4486-ab70-904290c756f9'
    ];

    // Check submissions first
    console.log('📋 Checking submissions...');
    const checkQuery = `
      SELECT id, form_id, status, submitted_at
      FROM submissions
      WHERE id = ANY($1::uuid[])
    `;
    const checkResult = await client.query(checkQuery, [submissionIds]);

    console.log(`Found ${checkResult.rows.length} submissions:`);
    checkResult.rows.forEach(row => {
      console.log(`  - ${row.id} | form: ${row.form_id} | status: ${row.status}`);
    });

    if (checkResult.rows.length === 0) {
      console.log('❌ No submissions found to delete\n');
    } else {
      // Delete submission_data
      console.log('\n🗑️  Deleting submission_data...');
      const deleteDataResult = await client.query(
        'DELETE FROM submission_data WHERE submission_id = ANY($1::uuid[])',
        [submissionIds]
      );
      console.log(`✅ Deleted ${deleteDataResult.rowCount} submission_data records`);

      // Delete submissions
      console.log('🗑️  Deleting submissions...');
      const deleteSubResult = await client.query(
        'DELETE FROM submissions WHERE id = ANY($1::uuid[])',
        [submissionIds]
      );
      console.log(`✅ Deleted ${deleteSubResult.rowCount} submissions\n`);
    }

    // Delete unused table
    console.log('📋 Checking for table: service_log_0fcb52ff33c6...');
    const checkTableResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'service_log_0fcb52ff33c6'
      );
    `);

    if (checkTableResult.rows[0].exists) {
      // Check row count
      const countResult = await client.query('SELECT COUNT(*) as count FROM "service_log_0fcb52ff33c6"');
      console.log(`Table has ${countResult.rows[0].count} rows`);

      // Drop table
      console.log('🗑️  Deleting table service_log_0fcb52ff33c6...');
      await client.query('DROP TABLE IF EXISTS "service_log_0fcb52ff33c6" CASCADE');
      console.log('✅ Deleted table service_log_0fcb52ff33c6\n');
    } else {
      console.log('⚠️  Table does not exist\n');
    }

    // List remaining dynamic tables
    console.log('📋 Remaining dynamic tables:');
    const listResult = await client.query(`
      SELECT table_name, (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND columns.table_name = tables.table_name
      ) as column_count
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND (table_name LIKE 'form_%' OR table_name LIKE '%_data')
      AND table_name NOT IN ('submission_data', 'sub_forms')
      ORDER BY table_name
    `);

    listResult.rows.forEach(row => {
      console.log(`  - ${row.table_name} (${row.column_count} columns)`);
    });

    console.log('\n✅ Cleanup completed successfully!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
