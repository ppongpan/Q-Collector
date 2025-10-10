/**
 * Clear All Test Data Script
 * Deletes ALL submissions and files for fresh testing
 *
 * WARNING: This script will DELETE ALL DATA including:
 * - All submissions (main form + sub-form)
 * - All files in MinIO
 * - All file records in database
 *
 * Forms will be preserved.
 *
 * Usage: node backend/scripts/clear-all-test-data.js
 */

const { Submission, File, sequelize } = require('../models');
const minioClient = require('../config/minio.config');
const logger = require('../utils/logger.util');

async function clearAllTestData() {
  try {
    console.log('\n🚨 WARNING: This will delete ALL submissions and files!');
    console.log('⏳ Starting in 3 seconds... Press Ctrl+C to cancel\n');

    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🔄 Starting data cleanup...\n');

    // Step 1: Get all files from database
    console.log('📂 Step 1: Fetching all files from database...');
    const allFiles = await File.findAll({
      attributes: ['id', 'minio_path', 'original_name', 'uploaded_by'],
      raw: true
    });
    console.log(`   Found ${allFiles.length} files in database`);

    // Step 2: Delete all files from MinIO
    console.log('\n🗑️  Step 2: Deleting files from MinIO...');
    let deletedFromMinIO = 0;
    let minioErrors = 0;

    for (const file of allFiles) {
      try {
        await minioClient.deleteFile(file.minio_path);
        deletedFromMinIO++;

        if (deletedFromMinIO % 10 === 0) {
          console.log(`   Deleted ${deletedFromMinIO}/${allFiles.length} files from MinIO...`);
        }
      } catch (error) {
        minioErrors++;
        console.error(`   ⚠️  Failed to delete ${file.minio_path}:`, error.message);
      }
    }
    console.log(`   ✅ Deleted ${deletedFromMinIO} files from MinIO`);
    if (minioErrors > 0) {
      console.log(`   ⚠️  ${minioErrors} files failed to delete (may not exist)`);
    }

    // Step 3: Delete all file records from database
    console.log('\n🗑️  Step 3: Deleting file records from database...');
    const deletedFileRecords = await File.destroy({
      where: {},
      truncate: true
    });
    console.log(`   ✅ Deleted ${deletedFileRecords} file records`);

    // Step 4: Get all dynamic table names for sub-forms
    console.log('\n📋 Step 4: Finding all dynamic tables...');
    const [dynamicTables] = await sequelize.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND (
          tablename ~ '^form_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_[0-9]+$'
          OR tablename ~ '^[a-z_]+_[0-9a-f]{6}$'
        )
      ORDER BY tablename;
    `);
    console.log(`   Found ${dynamicTables.length} dynamic tables`);

    // Step 5: Delete data from dynamic tables (sub-forms)
    console.log('\n🗑️  Step 5: Clearing sub-form data...');
    let clearedTables = 0;
    for (const table of dynamicTables) {
      try {
        const [result] = await sequelize.query(`
          DELETE FROM "${table.tablename}";
        `);
        clearedTables++;
        console.log(`   ✅ Cleared table: ${table.tablename}`);
      } catch (error) {
        console.error(`   ⚠️  Failed to clear ${table.tablename}:`, error.message);
      }
    }
    console.log(`   ✅ Cleared ${clearedTables} dynamic tables`);

    // Step 6: Delete all submissions from main submissions table
    console.log('\n🗑️  Step 6: Deleting all submissions...');
    const deletedSubmissions = await Submission.destroy({
      where: {},
      truncate: true,
      cascade: true
    });
    console.log(`   ✅ Deleted ${deletedSubmissions} submissions`);

    // Step 7: Reset sequences
    console.log('\n🔄 Step 7: Resetting sequences...');
    await sequelize.query(`
      SELECT setval(pg_get_serial_sequence('submissions', 'id'), 1, false);
    `);
    console.log('   ✅ Reset submission sequence');

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ CLEANUP COMPLETE!');
    console.log('='.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   • Files deleted from MinIO: ${deletedFromMinIO}`);
    console.log(`   • File records deleted: ${deletedFileRecords}`);
    console.log(`   • Dynamic tables cleared: ${clearedTables}`);
    console.log(`   • Submissions deleted: ${deletedSubmissions}`);
    console.log(`   • Forms: PRESERVED ✅`);
    console.log('='.repeat(60));
    console.log('\n🎯 Ready for fresh testing!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the script
clearAllTestData();
