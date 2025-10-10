/**
 * Drop submission_number column from all dynamic tables
 *
 * This script removes the unnecessary submission_number column that was
 * previously created in dynamic tables
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

async function dropSubmissionNumberColumn() {
  const client = await pool.connect();

  try {
    console.log('🔍 Finding all tables with submission_number column...\n');

    // Find all tables with submission_number column
    const query = `
      SELECT DISTINCT table_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'submission_number'
        AND table_name NOT IN ('forms', 'users', 'sub_forms', 'fields', 'submissions', 'sessions', 'audit_logs', 'trusted_devices', 'system_settings', 'translation_cache', 'field_migrations', 'field_data_backups')
      ORDER BY table_name;
    `;

    const result = await client.query(query);
    const tables = result.rows;

    console.log(`Found ${tables.length} table(s) with submission_number column:\n`);

    if (tables.length === 0) {
      console.log('✅ No tables found with submission_number column. All clean!');
      return;
    }

    // Display tables
    tables.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.table_name}`);
    });

    console.log('\n📝 Starting to drop submission_number column from all tables...\n');

    let successCount = 0;
    let failCount = 0;

    // Drop column from each table
    for (const row of tables) {
      const tableName = row.table_name;

      try {
        await client.query(`ALTER TABLE "${tableName}" DROP COLUMN IF EXISTS submission_number;`);
        console.log(`  ✅ Dropped submission_number from: ${tableName}`);
        successCount++;
      } catch (error) {
        console.error(`  ❌ Failed to drop from ${tableName}:`, error.message);
        failCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully dropped: ${successCount} table(s)`);
    if (failCount > 0) {
      console.log(`❌ Failed: ${failCount} table(s)`);
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
dropSubmissionNumberColumn()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  });
