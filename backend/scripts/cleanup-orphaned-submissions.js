/**
 * Script to clean up orphaned submissions
 *
 * This script identifies and removes records from dynamic tables
 * that no longer exist in the submissions table (deleted from frontend)
 *
 * Usage: node backend/scripts/cleanup-orphaned-submissions.js
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

// Initialize database connection
const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'qcollector_db',
  process.env.POSTGRES_USER || 'qcollector',
  process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

const DYNAMIC_TABLE_NAME = 'technical_service_team_appointment_form_ab066a0f7688';

async function cleanupOrphanedSubmissions() {
  console.log('🔍 Starting cleanup for orphaned submissions...\n');

  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Step 1: Find the form_id for this dynamic table
    const [formResult] = await sequelize.query(
      `SELECT id, title FROM forms WHERE table_name = :tableName`,
      {
        replacements: { tableName: DYNAMIC_TABLE_NAME },
        type: Sequelize.QueryTypes.SELECT
      }
    );

    if (!formResult) {
      console.error(`❌ No form found with dynamic_table_name: ${DYNAMIC_TABLE_NAME}`);
      return;
    }

    console.log(`📋 Form found: "${formResult.title}" (ID: ${formResult.id})\n`);

    // Step 2: Get all submissions in the submissions table for this form
    const validSubmissions = await sequelize.query(
      `SELECT id, submitted_at, submitted_by FROM submissions WHERE form_id = :formId ORDER BY submitted_at DESC`,
      {
        replacements: { formId: formResult.id },
        type: Sequelize.QueryTypes.SELECT
      }
    );

    console.log(`✅ Found ${validSubmissions.length} valid submissions in submissions table\n`);

    // Step 3: Get all records in the dynamic table
    const dynamicRecords = await sequelize.query(
      `SELECT id FROM ${DYNAMIC_TABLE_NAME}`,
      {
        type: Sequelize.QueryTypes.SELECT
      }
    );

    console.log(`📊 Found ${dynamicRecords.length} records in ${DYNAMIC_TABLE_NAME} table\n`);

    // Step 4: Find orphaned records (exist in dynamic table but not in submissions)
    const validSubmissionIds = new Set(validSubmissions.map(s => s.id));
    const orphanedRecords = dynamicRecords.filter(record => !validSubmissionIds.has(record.id));

    if (orphanedRecords.length === 0) {
      console.log('✅ No orphaned records found. All data is consistent!\n');
      return;
    }

    console.log(`⚠️ Found ${orphanedRecords.length} orphaned records:\n`);

    orphanedRecords.forEach((record, index) => {
      console.log(`  ${index + 1}. ID: ${record.id}`);
    });

    console.log('\n🗑️ Deleting orphaned records from dynamic table...\n');

    // Step 5: Delete orphaned records
    const orphanedIds = orphanedRecords.map(r => r.id);

    await sequelize.query(
      `DELETE FROM ${DYNAMIC_TABLE_NAME} WHERE id = ANY(ARRAY[:ids]::uuid[])`,
      {
        replacements: { ids: orphanedIds },
        type: Sequelize.QueryTypes.DELETE
      }
    );

    console.log(`✅ Successfully deleted ${orphanedRecords.length} orphaned records\n`);

    // Step 6: Verify cleanup
    const [remainingCount] = await sequelize.query(
      `SELECT COUNT(*) as count FROM ${DYNAMIC_TABLE_NAME}`,
      {
        type: Sequelize.QueryTypes.SELECT
      }
    );

    console.log(`📊 Final count in ${DYNAMIC_TABLE_NAME}: ${remainingCount.count} records`);
    console.log(`📊 Submissions table count: ${validSubmissions.length} records\n`);

    if (parseInt(remainingCount.count) === validSubmissions.length) {
      console.log('✅ Cleanup complete! Both tables are now in sync.\n');
    } else {
      console.warn('⚠️ Warning: Counts still don\'t match. Manual review recommended.\n');
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the cleanup
cleanupOrphanedSubmissions()
  .then(() => {
    console.log('🎉 Cleanup script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Cleanup script failed:', error);
    process.exit(1);
  });
