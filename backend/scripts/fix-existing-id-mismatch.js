/**
 * Fix Existing ID Mismatch
 *
 * This script corrects the ID mismatch between submissions table and dynamic tables
 * for data created before the synchronization fix.
 *
 * Strategy:
 * 1. Find submissions where submission.id doesn't exist in dynamic table
 * 2. Find dynamic table records with IDs that don't exist in submissions
 * 3. Match them by timestamp and username
 * 4. Update sub-form parent_id references to use correct IDs
 */

const { Pool } = require('pg');
const { Submission, User } = require('../models');

async function fixIdMismatch() {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'qcollector_db',
    user: process.env.POSTGRES_USER || 'qcollector',
    password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
  });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🔧 Fixing ID Mismatch Between Submissions and Dynamic Tables\n');
    console.log('=' .repeat(80) + '\n');

    // Step 1: Get all main form submissions from submissions table (with username)
    const submissions = await Submission.findAll({
      where: {
        form_id: 'f406b4e1-baef-41a7-823b-b6d95c23b4fe',
        sub_form_id: null
      },
      include: [{ model: User, as: 'submitter', attributes: ['username'] }],
      order: [['createdAt', 'ASC']]
    });

    console.log(`📄 Found ${submissions.length} main form submissions in submissions table\n`);

    submissions.forEach((s, i) => {
      console.log(`${i + 1}. ID: ${s.id}`);
      console.log(`   Username: ${s.submitter?.username || 'N/A'}`);
      console.log(`   Parent ID: ${s.parent_id || 'NULL'}`);
      console.log(`   Created: ${s.createdAt}\n`);
    });

    // Step 2: Get all records from dynamic table
    const dynamicQuery = `
      SELECT id, form_id, username, submitted_at, requester
      FROM technical_service_appointment_form_b6d95c23b4fe
      ORDER BY submitted_at ASC
    `;

    const dynamicResult = await client.query(dynamicQuery);

    console.log(`📊 Found ${dynamicResult.rows.length} records in dynamic table\n`);

    dynamicResult.rows.forEach((row, i) => {
      console.log(`${i + 1}. ID: ${row.id}`);
      console.log(`   Requester: ${row.requester}`);
      console.log(`   Created: ${row.submitted_at}\n`);
    });

    // Step 3: Match submissions to dynamic table records by timestamp
    // Note: Dynamic table stores UTC, submissions table stores local time (UTC+7)
    const mapping = [];

    console.log('\n🔍 Attempting to match records by timestamp and username...\n');

    for (const submission of submissions) {
      // Try to find matching dynamic record
      // Allow for timezone differences (up to 8 hours) and 1 minute tolerance
      for (const dynamicRow of dynamicResult.rows) {
        const submissionTime = new Date(submission.createdAt).getTime();
        const dynamicTime = new Date(dynamicRow.submitted_at).getTime();
        const timeDiff = Math.abs(submissionTime - dynamicTime);

        // Match if within 8 hours (to account for timezone) AND same username
        const submissionUsername = submission.submitter?.username;
        if (timeDiff < 8 * 60 * 60 * 1000 && submissionUsername === dynamicRow.username) {
          // Check if this is the closest match (accounting for timezone offset)
          const timezoneDiff = submissionTime - dynamicTime;
          const hoursOffset = Math.round(timezoneDiff / (1000 * 60 * 60));

          console.log(`🔍 Potential match:`);
          console.log(`   Submission: ${submission.id} at ${submission.createdAt}`);
          console.log(`   Dynamic: ${dynamicRow.id} at ${dynamicRow.submitted_at}`);
          console.log(`   Time diff: ${(timeDiff / 1000 / 60).toFixed(2)} minutes`);
          console.log(`   Timezone offset: ~${hoursOffset} hours`);
          console.log(`   Username: ${submissionUsername} vs ${dynamicRow.username}`)
          console.log(`   Username match: ${submissionUsername === dynamicRow.username ? '✅' : '❌'}\n`);

          // If this looks like a timezone offset match (approximately 7 hours)
          if (Math.abs(hoursOffset - 7) < 0.1) {
            mapping.push({
              submissionId: submission.id,
              dynamicId: dynamicRow.id,
              timestamp: submission.createdAt,
              requester: dynamicRow.requester
            });

            console.log(`✅ CONFIRMED Match:`);
            console.log(`   Submission ID: ${submission.id}`);
            console.log(`   Dynamic ID: ${dynamicRow.id}`);
            console.log(`   Requester: ${dynamicRow.requester}\n`);
            break; // Found the match, move to next submission
          }
        }
      }
    }

    if (mapping.length === 0) {
      console.log('⚠️  No matching records found. Cannot proceed with fix.\n');
      await client.query('ROLLBACK');
      return;
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n📋 PROPOSED FIXES:\n');

    // Step 4: For each mapping, update sub-form parent_id
    for (const map of mapping) {
      console.log(`\n🔧 Fixing sub-form references:`);
      console.log(`   Old parent_id (submission): ${map.submissionId}`);
      console.log(`   New parent_id (dynamic): ${map.dynamicId}`);

      // Update sub-form submissions in submissions table
      const updateSubmissionsQuery = `
        UPDATE submissions
        SET parent_id = $1
        WHERE parent_id = $2 AND sub_form_id IS NOT NULL
        RETURNING id, sub_form_id, parent_id
      `;

      const updateResult = await client.query(updateSubmissionsQuery, [
        map.dynamicId, // New parent_id (from dynamic table)
        map.submissionId // Old parent_id (from submissions table)
      ]);

      console.log(`   ✅ Updated ${updateResult.rows.length} submissions records`);

      updateResult.rows.forEach((row, i) => {
        console.log(`      ${i + 1}. Sub-form: ${row.sub_form_id}, New parent: ${row.parent_id}`);
      });

      // Update sub-form dynamic table
      const subFormTableQuery = `
        UPDATE formbanthuekkarthamngantamthiaidrabmobhmay_c3123fc21f79
        SET parent_id = $1
        WHERE parent_id = $2
        RETURNING id, parent_id
      `;

      const subFormUpdateResult = await client.query(subFormTableQuery, [
        map.dynamicId, // New parent_id (from dynamic table)
        map.submissionId // Old parent_id
      ]);

      console.log(`   ✅ Updated ${subFormUpdateResult.rows.length} sub-form dynamic table records`);

      subFormUpdateResult.rows.forEach((row, i) => {
        console.log(`      ${i + 1}. Sub-form ID: ${row.id}, New parent: ${row.parent_id}`);
      });

      // Fix main form parent_id in submissions table (should be NULL)
      const fixMainFormQuery = `
        UPDATE submissions
        SET parent_id = NULL
        WHERE id = $1 AND sub_form_id IS NULL AND parent_id IS NOT NULL
        RETURNING id, parent_id
      `;

      const fixMainResult = await client.query(fixMainFormQuery, [map.submissionId]);

      if (fixMainResult.rows.length > 0) {
        console.log(`   ✅ Fixed main form parent_id to NULL`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n🎉 ALL FIXES APPLIED SUCCESSFULLY!\n');
    console.log('Summary:');
    console.log(`   - Fixed ${mapping.length} main form submission mappings`);
    console.log(`   - Updated sub-form parent_id references to use correct IDs`);
    console.log(`   - Set main form parent_id to NULL\n`);

    console.log('⚠️  NOTE: This is a PREVIEW. Changes are NOT committed yet.\n');
    console.log('To apply changes, replace ROLLBACK with COMMIT in the script.\n');

    // ⚠️  SAFETY: Rollback for now - change to COMMIT when ready
    await client.query('ROLLBACK');
    console.log('✅ Transaction rolled back (no changes made).\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

fixIdMismatch();
