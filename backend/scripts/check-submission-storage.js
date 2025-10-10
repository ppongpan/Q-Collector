/**
 * Check Submission Storage
 * Verify where submission data is stored
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

async function checkSubmissionStorage() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           Check Submission Storage                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Find the form with sales tracking
    const forms = await pool.query(`
      SELECT id, title, table_name, is_active
      FROM forms
      WHERE title LIKE '%sales%' OR title LIKE '%ขาย%' OR title LIKE '%ติดตาม%'
      ORDER BY "createdAt" DESC;
    `);

    if (forms.rows.length === 0) {
      console.log('❌ No sales tracking forms found\n');
      return;
    }

    console.log(`📋 Found ${forms.rows.length} related forms:\n`);

    for (const form of forms.rows) {
      console.log(`Form: "${form.title}"`);
      console.log(`  ID: ${form.id}`);
      console.log(`  Table: ${form.table_name || 'NULL'}`);
      console.log(`  Active: ${form.is_active}\n`);

      // Check submissions table
      const submissions = await pool.query(`
        SELECT id, status, submitted_at
        FROM submissions
        WHERE form_id = $1
        ORDER BY submitted_at DESC
        LIMIT 5;
      `, [form.id]);

      console.log(`  📄 Submissions in 'submissions' table: ${submissions.rows.length}`);
      if (submissions.rows.length > 0) {
        for (const sub of submissions.rows) {
          console.log(`     - ID: ${sub.id}, Status: ${sub.status}, Date: ${sub.submitted_at}`);
        }
      }

      // Check submission_data table
      try {
        const submissionData = await pool.query(`
          SELECT sd.id, sd.submission_id, sd.field_id, sd.data_enc
          FROM submission_data sd
          JOIN submissions s ON s.id = sd.submission_id
          WHERE s.form_id = $1
          LIMIT 5;
        `, [form.id]);

        console.log(`  📝 Records in 'submission_data' table: ${submissionData.rows.length}`);
        if (submissionData.rows.length > 0) {
          console.log(`     ⚠️  OLD SYSTEM - Data stored in submission_data (deprecated)`);
        }
      } catch (error) {
        console.log(`  📝 submission_data table check: ${error.message.substring(0, 50)}`);
      }

      // Check dynamic table if exists
      if (form.table_name) {
        try {
          const dynamicData = await pool.query(`
            SELECT COUNT(*) as count
            FROM "${form.table_name}";
          `);
          console.log(`  🗃️  Records in dynamic table '${form.table_name}': ${dynamicData.rows[0].count}`);

          if (dynamicData.rows[0].count > 0) {
            const sampleData = await pool.query(`
              SELECT *
              FROM "${form.table_name}"
              LIMIT 2;
            `);
            console.log(`     Sample columns: ${Object.keys(sampleData.rows[0]).join(', ')}`);
          }
        } catch (error) {
          console.log(`  ❌ Error accessing table '${form.table_name}': ${error.message}`);
        }
      }

      console.log('');
    }

    // Summary
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    Analysis                                ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('Data Storage Locations:');
    console.log('  1. submissions table - Main submission records');
    console.log('  2. submission_data table - Field values (OLD SYSTEM)');
    console.log('  3. Dynamic tables (form_xxx) - Field values (NEW SYSTEM)\n');

    console.log('Expected Behavior (v0.7.5):');
    console.log('  ✅ Main form submissions → Dynamic table (form_xxx)');
    console.log('  ✅ Sub-form submissions → Dynamic table (subform_xxx)');
    console.log('  ⚠️  submission_data table should be EMPTY (deprecated)\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await pool.end();
  }
}

checkSubmissionStorage().catch(console.error);
