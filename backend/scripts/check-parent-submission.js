/**
 * Check Parent Submission in Dynamic Table
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

async function checkParentSubmission() {
  const parentId = '934a88e6-5349-4068-ae6a-0ed99feb6222';
  const mainTable = 'ms_sales_tracking_system_q_con_service_c_c72bd400d0be';

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       Check Parent Submission in Dynamic Table            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Check in submissions table
    const subInSubmissions = await pool.query(`
      SELECT id, form_id, submitted_by, submitted_at, status
      FROM submissions
      WHERE id = $1;
    `, [parentId]);

    console.log(`📋 Submission in 'submissions' table:`);
    if (subInSubmissions.rows.length > 0) {
      console.log(`   ✅ Found: ${subInSubmissions.rows[0].id}`);
      console.log(`   Form ID: ${subInSubmissions.rows[0].form_id}`);
      console.log(`   Submitted: ${subInSubmissions.rows[0].submitted_at}\n`);
    } else {
      console.log(`   ❌ NOT FOUND\n`);
    }

    // Check in main form dynamic table
    const subInDynamic = await pool.query(`
      SELECT id, form_id, username, submitted_at
      FROM "${mainTable}"
      WHERE id = $1;
    `, [parentId]);

    console.log(`📊 Submission in '${mainTable}':`);
    if (subInDynamic.rows.length > 0) {
      console.log(`   ✅ Found: ${subInDynamic.rows[0].id}`);
      console.log(`   Username: ${subInDynamic.rows[0].username}`);
      console.log(`   Submitted: ${subInDynamic.rows[0].submitted_at}\n`);
    } else {
      console.log(`   ❌ NOT FOUND - This is the problem!\n`);
      console.log(`💡 Solution: Main form submission must be inserted into dynamic table first.\n`);
    }

    // Show all records in main table
    const allRecords = await pool.query(`
      SELECT id, username, submitted_at
      FROM "${mainTable}"
      ORDER BY submitted_at DESC
      LIMIT 5;
    `);

    console.log(`📄 All records in '${mainTable}' (latest 5):`);
    if (allRecords.rows.length > 0) {
      for (const row of allRecords.rows) {
        console.log(`   - ID: ${row.id}, User: ${row.username}, Date: ${row.submitted_at}`);
      }
    } else {
      console.log(`   ❌ Table is empty!`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkParentSubmission().catch(console.error);
