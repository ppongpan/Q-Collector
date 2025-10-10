/**
 * Delete Orphaned Submissions
 *
 * This script deletes submissions that don't have a valid form or
 * don't have records in their dynamic tables.
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

const orphanedIds = [
  'da845581-8b4a-4945-9632-8d8ddfc8f753',
  'eec768ac-be73-4a8d-bf7e-6a8448c33d78',
  'f951a3d8-06ab-45f6-814d-dfc1dfee7a1d',
  'fb249566-d323-42b4-961e-15538d3584d4',
  '7f975b81-02c7-4c76-867c-7ac9b90ae6a2',
  'ddfb6cf2-0a73-48e6-890c-ea9ab3570dbe',
  'c8a4901e-aa36-45ec-8201-312d1457300c',
  '7241cfd0-6842-4b8d-850e-144a23c66722'
];

async function deleteOrphanedSubmissions() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║            Delete Orphaned Submissions                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Count orphaned submissions before deletion
    const beforeCount = await pool.query(`
      SELECT COUNT(*) as count FROM submissions WHERE id = ANY($1);
    `, [orphanedIds]);

    console.log(`📊 Found ${beforeCount.rows[0].count} orphaned submissions to delete\n`);

    if (beforeCount.rows[0].count === 0) {
      console.log('✅ No orphaned submissions found. Database is clean!\n');
      return;
    }

    // Step 2: Also delete related submission_data (although it should cascade)
    const submissionDataCount = await pool.query(`
      SELECT COUNT(*) as count FROM submission_data WHERE submission_id = ANY($1);
    `, [orphanedIds]);

    console.log(`📦 Found ${submissionDataCount.rows[0].count} related submission_data records\n`);

    // Step 3: Delete submissions (this will cascade to submission_data)
    console.log('🗑️  Deleting orphaned submissions...\n');

    const deleteResult = await pool.query(`
      DELETE FROM submissions WHERE id = ANY($1) RETURNING id;
    `, [orphanedIds]);

    console.log(`✅ Deleted ${deleteResult.rows.length} submissions:\n`);
    for (const row of deleteResult.rows) {
      console.log(`   - ${row.id.substring(0, 8)}...`);
    }
    console.log('');

    // Step 4: Verify deletion
    const afterCount = await pool.query(`
      SELECT COUNT(*) as count FROM submissions WHERE id = ANY($1);
    `, [orphanedIds]);

    console.log(`📊 Verification: ${afterCount.rows[0].count} remaining (should be 0)\n`);

    if (afterCount.rows[0].count === 0) {
      console.log('✅ All orphaned submissions successfully deleted!\n');
    } else {
      console.log(`⚠️  Warning: ${afterCount.rows[0].count} submissions could not be deleted\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await pool.end();
  }
}

deleteOrphanedSubmissions().catch(console.error);
