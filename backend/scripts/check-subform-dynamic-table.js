/**
 * Check sub-form dynamic table parent_id values
 */

const { Pool } = require('pg');

async function checkSubFormTable() {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'qcollector_db',
    user: process.env.POSTGRES_USER || 'qcollector',
    password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
  });

  try {
    console.log('🔍 Checking sub-form dynamic table...\n');

    // Query the sub-form table
    const result = await pool.query(`
      SELECT id, parent_id, username, created_at, updated_at
      FROM "work_completion_form_96dba9126619"
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log(`📋 Sub-form table "work_completion_form_96dba9126619" (${result.rows.length} rows):\n`);

    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}`);
      console.log(`   Parent ID: ${row.parent_id}`);
      console.log(`   Username: ${row.username}`);
      console.log(`   Created: ${row.created_at}`);
      console.log(`   Updated: ${row.updated_at}`);
      console.log('');
    });

    // Also check the submissions table for reference
    const submissionsResult = await pool.query(`
      SELECT id, form_id, sub_form_id, parent_id, status, submitted_at
      FROM submissions
      WHERE form_id = 'f406b4e1-baef-41a7-823b-b6d95c23b4fe'
      ORDER BY submitted_at DESC
      LIMIT 10
    `);

    console.log(`\n📝 Submissions table (${submissionsResult.rows.length} rows):\n`);

    submissionsResult.rows.forEach((row, index) => {
      const isMain = !row.sub_form_id;
      const marker = isMain ? '📄 MAIN' : '📎 SUB';
      console.log(`${index + 1}. ${marker} ${row.id}`);
      console.log(`   Form ID: ${row.form_id}`);
      console.log(`   Sub-form ID: ${row.sub_form_id || 'NULL'}`);
      console.log(`   Parent ID: ${row.parent_id || 'NULL'}`);
      console.log(`   Status: ${row.status}`);
      console.log(`   Submitted: ${row.submitted_at}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkSubFormTable();
