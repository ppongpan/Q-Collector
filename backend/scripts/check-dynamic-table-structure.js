/**
 * Check dynamic table structure and recent submissions
 */

const { Pool } = require('pg');

async function checkDynamicTable() {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'qcollector_db',
    user: process.env.POSTGRES_USER || 'qcollector',
    password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
  });

  try {
    console.log('🔍 Checking dynamic table structure and data...\n');

    // Get all records from main form dynamic table
    const query = `
      SELECT id, form_id, username, submitted_at, requester
      FROM technical_service_appointment_form_b6d95c23b4fe
      ORDER BY submitted_at DESC
      LIMIT 10
    `;

    const result = await pool.query(query);

    console.log(`📊 Main Form Dynamic Table (${result.rows.length} records):\n`);

    result.rows.forEach((row, i) => {
      console.log(`${i + 1}. ID: ${row.id}`);
      console.log(`   Form ID: ${row.form_id}`);
      console.log(`   Username: ${row.username}`);
      console.log(`   Requester: ${row.requester}`);
      console.log(`   Submitted: ${row.submitted_at}\n`);
    });

    // Now check submissions table for the same IDs
    console.log('\n🔍 Checking if these IDs exist in submissions table:\n');

    for (const row of result.rows.slice(0, 5)) {
      const submissionQuery = `
        SELECT id, form_id, parent_id, sub_form_id, submitted_at
        FROM submissions
        WHERE id = $1
      `;

      const submissionResult = await pool.query(submissionQuery, [row.id]);

      if (submissionResult.rows.length > 0) {
        console.log(`✅ ID ${row.id.substring(0, 8)}... FOUND in submissions table`);
        const sub = submissionResult.rows[0];
        console.log(`   Parent ID: ${sub.parent_id || 'NULL'}`);
        console.log(`   Sub-form ID: ${sub.sub_form_id || 'NULL (main form)'}\n`);
      } else {
        console.log(`❌ ID ${row.id.substring(0, 8)}... NOT FOUND in submissions table\n`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkDynamicTable();
