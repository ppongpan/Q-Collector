/**
 * Check submission ID mismatch between submissions table and dynamic table
 */

const { Pool } = require('pg');
const { Submission } = require('../models');

async function checkIdMismatch() {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'qcollector_db',
    user: process.env.POSTGRES_USER || 'qcollector',
    password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
  });

  try {
    console.log('🔍 Checking ID mismatch between submissions table and dynamic table...\n');

    // Get main form submission from submissions table
    const submission = await Submission.findByPk('456e7c86-63e4-4b51-a823-81b471d31254');

    if (!submission) {
      console.log('❌ Submission 456e7c86... not found in submissions table\n');
    } else {
      console.log('✅ Found in submissions table:');
      console.log(`   ID: ${submission.id}`);
      console.log(`   Form ID: ${submission.form_id}`);
      console.log(`   Sub-form ID: ${submission.sub_form_id || 'NULL (main form)'}`);
      console.log(`   Parent ID: ${submission.parent_id || 'NULL (main form)'}`);
      console.log(`   Created: ${submission.createdAt}\n`);
    }

    // Check dynamic table
    const dynamicTableResult = await pool.query(`
      SELECT id, form_id, username, submitted_at, requester, operator, wanthiptibatingan
      FROM technical_service_appointment_form_b6d95c23b4fe
      WHERE id = $1
    `, ['456e7c86-63e4-4b51-a823-81b471d31254']);

    if (dynamicTableResult.rows.length === 0) {
      console.log('❌ ID 456e7c86... not found in dynamic table\n');
    } else {
      const row = dynamicTableResult.rows[0];
      console.log('✅ Found in dynamic table:');
      console.log(`   ID: ${row.id}`);
      console.log(`   Form ID: ${row.form_id}`);
      console.log(`   Username: ${row.username}`);
      console.log(`   Requester: ${row.requester}`);
      console.log(`   Created: ${row.submitted_at}\n`);
    }

    // Check what parent_id values exist in sub-form table
    const subFormResult = await pool.query(`
      SELECT id, parent_id, username, operator, submitted_at
      FROM formbanthuekkarthamngantamthiaidrabmobhmay_c3123fc21f79
      ORDER BY submitted_at DESC
    `);

    console.log(`📋 Sub-form submissions (${subFormResult.rows.length}):\n`);

    subFormResult.rows.forEach((row, i) => {
      const isCorrect = row.parent_id === '456e7c86-63e4-4b51-a823-81b471d31254';
      const marker = isCorrect ? '✅' : '❌';
      console.log(`${i + 1}. ${marker} ID: ${row.id}`);
      console.log(`   Parent ID: ${row.parent_id}`);
      console.log(`   Operator: ${row.operator}`);
      console.log(`   Created: ${row.submitted_at}`);

      if (!isCorrect) {
        console.log(`   ⚠️  Should be: 456e7c86-63e4-4b51-a823-81b471d31254`);
      }
      console.log('');
    });

    // Check if 486294c8... exists anywhere
    console.log('\n🔍 Checking where 486294c8... comes from:\n');

    const wrongSubmission = await Submission.findByPk('486294c8-aef8-40ff-b5c0-7a9cf76555e9');
    if (wrongSubmission) {
      console.log('Found 486294c8... in submissions table:');
      console.log(`   ID: ${wrongSubmission.id}`);
      console.log(`   Form ID: ${wrongSubmission.form_id}`);
      console.log(`   Sub-form ID: ${wrongSubmission.sub_form_id || 'NULL (main form)'}`);
      console.log(`   Parent ID: ${wrongSubmission.parent_id || 'NULL (main form)'}`);
      console.log(`   Created: ${wrongSubmission.createdAt}\n`);
    }

    const wrongDynamicResult = await pool.query(`
      SELECT id, form_id, username, submitted_at, requester
      FROM technical_service_appointment_form_b6d95c23b4fe
      WHERE id = $1
    `, ['486294c8-aef8-40ff-b5c0-7a9cf76555e9']);

    if (wrongDynamicResult.rows.length > 0) {
      const row = wrongDynamicResult.rows[0];
      console.log('Found 486294c8... in dynamic table:');
      console.log(`   ID: ${row.id}`);
      console.log(`   Requester: ${row.requester}`);
      console.log(`   Created: ${row.submitted_at}\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkIdMismatch();
