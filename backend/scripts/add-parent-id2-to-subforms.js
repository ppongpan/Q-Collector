/**
 * Add parent_id2 to Sub-form Tables
 *
 * This script adds a parent_id2 column to sub-form tables that stores
 * the dynamic table ID, while keeping parent_id for submissions table reference.
 *
 * Strategy:
 * 1. Add parent_id2 column to sub-form table
 * 2. Match submissions to dynamic table records by timestamp
 * 3. Update parent_id2 with the dynamic table ID
 * 4. Keep parent_id unchanged (FK to submissions table)
 */

const { Pool } = require('pg');
const { Submission, User } = require('../models');

async function addParentId2() {
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

    console.log('🔧 Adding parent_id2 to Sub-form Tables\n');
    console.log('=' .repeat(80) + '\n');

    const subFormTableName = 'formbanthuekkarthamngantamthiaidrabmobhmay_c3123fc21f79';

    // Step 1: Add parent_id2 column
    console.log(`📊 Step 1: Adding parent_id2 column to ${subFormTableName}...\n`);

    const addColumnQuery = `
      ALTER TABLE ${subFormTableName}
      ADD COLUMN IF NOT EXISTS parent_id2 UUID;
    `;

    await client.query(addColumnQuery);
    console.log(`✅ Added parent_id2 column\n`);

    // Step 2: Get main form submissions with usernames
    const submissions = await Submission.findAll({
      where: {
        form_id: 'f406b4e1-baef-41a7-823b-b6d95c23b4fe',
        sub_form_id: null
      },
      include: [{ model: User, as: 'submitter', attributes: ['username'] }],
      order: [['createdAt', 'ASC']]
    });

    console.log(`📄 Found ${submissions.length} main form submissions\n`);

    // Step 3: Get dynamic table records
    const dynamicQuery = `
      SELECT id, form_id, username, submitted_at, requester
      FROM technical_service_appointment_form_b6d95c23b4fe
      ORDER BY submitted_at ASC
    `;

    const dynamicResult = await client.query(dynamicQuery);
    console.log(`📊 Found ${dynamicResult.rows.length} records in dynamic table\n`);

    // Step 4: Create mapping between submission IDs and dynamic IDs
    const mapping = [];

    console.log('🔍 Matching submissions to dynamic table records...\n');

    for (const submission of submissions) {
      for (const dynamicRow of dynamicResult.rows) {
        const submissionTime = new Date(submission.createdAt).getTime();
        const dynamicTime = new Date(dynamicRow.submitted_at).getTime();
        const timeDiff = Math.abs(submissionTime - dynamicTime);
        const submissionUsername = submission.submitter?.username;

        // Match by timezone offset (7 hours) and username
        if (timeDiff < 8 * 60 * 60 * 1000 && submissionUsername === dynamicRow.username) {
          const timezoneDiff = submissionTime - dynamicTime;
          const hoursOffset = Math.round(timezoneDiff / (1000 * 60 * 60));

          if (Math.abs(hoursOffset - 7) < 0.1) {
            mapping.push({
              submissionId: submission.id,
              dynamicId: dynamicRow.id,
              requester: dynamicRow.requester,
              username: submissionUsername
            });

            console.log(`✅ Matched: ${submission.id.substring(0, 8)}... → ${dynamicRow.id.substring(0, 8)}...`);
            console.log(`   Requester: ${dynamicRow.requester}, Username: ${submissionUsername}\n`);
            break;
          }
        }
      }
    }

    if (mapping.length === 0) {
      console.log('⚠️  No matches found. Skipping parent_id2 updates.\n');
      await client.query('ROLLBACK');
      return;
    }

    console.log(`\n📋 Found ${mapping.length} matches. Updating parent_id2...\n`);

    // Step 5: Update parent_id2 in sub-form table
    let updatedCount = 0;

    for (const map of mapping) {
      const updateQuery = `
        UPDATE ${subFormTableName}
        SET parent_id2 = $1
        WHERE parent_id = $2
        RETURNING id, parent_id, parent_id2
      `;

      const updateResult = await client.query(updateQuery, [
        map.dynamicId,      // Set parent_id2 to dynamic table ID
        map.submissionId    // Where parent_id matches submission ID
      ]);

      if (updateResult.rows.length > 0) {
        updatedCount += updateResult.rows.length;
        console.log(`✅ Updated ${updateResult.rows.length} sub-form records:`);
        console.log(`   Submission ID (parent_id): ${map.submissionId.substring(0, 8)}...`);
        console.log(`   Dynamic ID (parent_id2): ${map.dynamicId.substring(0, 8)}...`);
        console.log(`   Requester: ${map.requester}\n`);

        updateResult.rows.forEach((row, i) => {
          console.log(`   ${i + 1}. Sub-form ID: ${row.id.substring(0, 8)}...`);
          console.log(`      parent_id:  ${row.parent_id.substring(0, 8)}... (submissions table)`);
          console.log(`      parent_id2: ${row.parent_id2.substring(0, 8)}... (dynamic table)\n`);
        });
      }
    }

    // Step 6: Show final summary
    console.log('\n' + '='.repeat(80));
    console.log('\n🎉 MIGRATION COMPLETE!\n');
    console.log('Summary:');
    console.log(`   - Added parent_id2 column to ${subFormTableName}`);
    console.log(`   - Matched ${mapping.length} main form submissions`);
    console.log(`   - Updated ${updatedCount} sub-form records`);
    console.log(`   - parent_id: References submissions table (FK constraint intact)`);
    console.log(`   - parent_id2: References dynamic table ID (for UI display)\n`);

    // Verify the update
    const verifyQuery = `
      SELECT
        id,
        parent_id,
        parent_id2,
        username,
        operator
      FROM ${subFormTableName}
      ORDER BY submitted_at DESC
      LIMIT 5
    `;

    const verifyResult = await client.query(verifyQuery);

    console.log('📋 Verification - Recent sub-form records:\n');
    verifyResult.rows.forEach((row, i) => {
      console.log(`${i + 1}. Sub-form ID: ${row.id.substring(0, 8)}...`);
      console.log(`   parent_id:  ${row.parent_id ? row.parent_id.substring(0, 8) + '...' : 'NULL'}`);
      console.log(`   parent_id2: ${row.parent_id2 ? row.parent_id2.substring(0, 8) + '...' : 'NULL'}`);
      console.log(`   Operator: ${row.operator}`);
      console.log(`   Username: ${row.username}\n`);
    });

    console.log('💾 Committing changes to database...\n');

    // ✅ COMMIT: Apply changes permanently
    await client.query('COMMIT');
    console.log('✅ Transaction committed successfully!\n');
    console.log('🎉 All changes have been applied to the database.\n');

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

addParentId2();
