/**
 * Check Sub-Form Data
 *
 * This script checks data in sales_task_tracker_a71d473fd421
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

async function checkSubFormData() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║            Check Sub-Form Data                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const subFormTable = 'sales_task_tracker_a71d473fd421';
  const mainFormTable = 'ms_sales_tracking_system_q_con_service_c_c72bd400d0be';

  try {
    // Check sub-form table
    console.log(`📊 Checking table: ${subFormTable}\n`);

    const subFormData = await pool.query(`
      SELECT * FROM "${subFormTable}" ORDER BY submitted_at DESC;
    `);

    console.log(`Found ${subFormData.rows.length} records:\n`);

    for (const row of subFormData.rows) {
      console.log(`Record ID: ${row.id}`);
      console.log(`   Parent ID: ${row.parent_id}`);
      console.log(`   Username: ${row.username}`);
      console.log(`   Submitted: ${row.submitted_at}`);
      console.log(`   Data: ${JSON.stringify(row, null, 2)}\n`);
    }

    // Check main form table
    console.log(`\n📋 Checking table: ${mainFormTable}\n`);

    const mainFormData = await pool.query(`
      SELECT id, username, submitted_at FROM "${mainFormTable}" ORDER BY submitted_at DESC;
    `);

    console.log(`Found ${mainFormData.rows.length} records:\n`);

    for (const row of mainFormData.rows) {
      console.log(`   - ${row.id} | ${row.username} | ${row.submitted_at}`);
    }

    // Check if parent_id exists in main form table
    console.log(`\n🔍 Checking foreign key relationships...\n`);

    for (const subRow of subFormData.rows) {
      const parentExists = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM "${mainFormTable}" WHERE id = $1
        );
      `, [subRow.parent_id]);

      if (parentExists.rows[0].exists) {
        console.log(`   ✅ Sub-form ${subRow.id} has valid parent ${subRow.parent_id}`);
      } else {
        console.log(`   ❌ Sub-form ${subRow.id} has ORPHANED parent ${subRow.parent_id}`);
      }
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await pool.end();
  }
}

checkSubFormData().catch(console.error);
