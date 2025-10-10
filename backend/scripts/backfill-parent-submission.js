/**
 * Backfill Parent Submission to Dynamic Table
 *
 * This script inserts the missing parent submission into the main form dynamic table
 * so that sub-form submissions can reference it via foreign key.
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

async function backfillParentSubmission() {
  const parentId = '934a88e6-5349-4068-ae6a-0ed99feb6222';
  const mainTable = 'ms_sales_tracking_system_q_con_service_c_c72bd400d0be';

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       Backfill Parent Submission to Dynamic Table         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Get submission details from submissions table
    const submission = await pool.query(`
      SELECT id, form_id, submitted_by, submitted_at
      FROM submissions
      WHERE id = $1;
    `, [parentId]);

    if (submission.rows.length === 0) {
      console.log('❌ Parent submission not found in submissions table\n');
      return;
    }

    const sub = submission.rows[0];
    console.log(`📋 Found submission in 'submissions' table:`);
    console.log(`   ID: ${sub.id}`);
    console.log(`   Form ID: ${sub.form_id}`);
    console.log(`   Submitted By: ${sub.submitted_by}`);
    console.log(`   Submitted At: ${sub.submitted_at}\n`);

    // Get user info
    const user = await pool.query(`
      SELECT username FROM users WHERE id = $1;
    `, [sub.submitted_by]);

    const username = user.rows[0]?.username || 'unknown';
    console.log(`👤 Username: ${username}\n`);

    // Get submission data from submission_data table
    const submissionDataRows = await pool.query(`
      SELECT sd.field_id, sd.value_text, f.title, f.type
      FROM submission_data sd
      JOIN fields f ON sd.field_id = f.id
      WHERE sd.submission_id = $1 AND f.sub_form_id IS NULL
      ORDER BY f."order";
    `, [parentId]);

    console.log(`📝 Found ${submissionDataRows.rows.length} submission data entries\n`);

    // Build submission data map
    const submissionData = {};
    for (const row of submissionDataRows.rows) {
      submissionData[row.field_id] = row.value_text;
    }

    console.log(`📊 Submission data has ${Object.keys(submissionData).length} entries\n`);

    // Build insert query
    const columns = ['"id"', '"form_id"', '"username"', '"submitted_at"'];
    const values = [sub.id, sub.form_id, username, sub.submitted_at];
    const placeholders = ['$1', '$2', '$3', '$4'];
    let paramIndex = 5;

    // Map field IDs to column names (using simplified column name generation)
    const { generateColumnName } = require('../utils/tableNameHelper');

    for (const row of submissionDataRows.rows) {
      const fieldValue = row.value_text;
      const columnName = await generateColumnName(row.title, row.field_id);
      columns.push(`"${columnName}"`);
      values.push(fieldValue);
      placeholders.push(`$${paramIndex}`);
      paramIndex++;
      console.log(`   ✅ ${row.title}: ${JSON.stringify(fieldValue).substring(0, 50)}`);
    }

    console.log(`\n📤 Inserting into table: ${mainTable}`);
    console.log(`   Columns: ${columns.length}`);
    console.log(`   Values: ${values.length}\n`);

    const insertQuery = `
      INSERT INTO "${mainTable}" (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      ON CONFLICT (id) DO NOTHING
      RETURNING id;
    `;

    const result = await pool.query(insertQuery, values);

    if (result.rows.length > 0) {
      console.log('✅ Successfully backfilled parent submission!\n');
      console.log(`   Inserted ID: ${result.rows[0].id}\n`);
    } else {
      console.log('ℹ️  Record already exists (ON CONFLICT triggered)\n');
    }

    // Verify insertion
    const verify = await pool.query(`
      SELECT id, username, submitted_at
      FROM "${mainTable}"
      WHERE id = $1;
    `, [parentId]);

    if (verify.rows.length > 0) {
      console.log('✅ VERIFICATION PASSED');
      console.log(`   Record exists in ${mainTable}`);
      console.log(`   ID: ${verify.rows[0].id}`);
      console.log(`   Username: ${verify.rows[0].username}`);
      console.log(`   Submitted: ${verify.rows[0].submitted_at}\n`);
      console.log('🎉 Sub-form submissions can now reference this parent!\n');
    } else {
      console.log('❌ VERIFICATION FAILED - Record not found after insert\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
  } finally {
    await pool.end();
  }
}

backfillParentSubmission().catch(console.error);
