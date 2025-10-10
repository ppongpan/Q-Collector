/**
 * Cleanup Old Backups Script
 *
 * Deletes field data backups that have expired (retention_until < NOW()).
 * Helps maintain database size by removing old backup snapshots.
 *
 * Usage:
 *   node backend/scripts/cleanup-old-backups.js           # Execute cleanup
 *   node backend/scripts/cleanup-old-backups.js --dry-run # Preview only
 *
 * Features:
 * - Queries FieldDataBackup with expired retention dates
 * - Calculates estimated space savings
 * - Deletes in batches for large volumes
 * - Transaction safety
 * - Dry-run mode support
 * - Before/after statistics
 *
 * Cron Setup:
 *   # Run daily at 2 AM
 *   0 2 * * * cd /path/to/qcollector && node backend/scripts/cleanup-old-backups.js >> /var/log/backup-cleanup.log 2>&1
 *
 * Created: 2025-10-07
 * Sprint: 6 (DevOps - Migration Maintenance Scripts)
 */

require('dotenv').config();
const path = require('path');

// Initialize database connections
const sequelizePath = path.join(__dirname, '..', 'models');
const { FieldDataBackup, sequelize } = require(sequelizePath);

// Parse command line arguments
const isDryRun = process.argv.includes('--dry-run');
const BATCH_SIZE = 100; // Delete in batches to avoid long locks

/**
 * Estimate backup size in bytes
 */
function estimateBackupSize(backup) {
  // Rough estimate: JSON.stringify size of data_snapshot
  const snapshotSize = JSON.stringify(backup.data_snapshot || []).length;
  return snapshotSize;
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Main cleanup function
 */
async function cleanupOldBackups() {
  console.log('\n========================================');
  console.log('Cleanup Old Field Data Backups');
  console.log('========================================\n');

  if (isDryRun) {
    console.log('[DRY-RUN MODE] No deletions will be performed\n');
  }

  const stats = {
    totalBackups: 0,
    expiredBackups: 0,
    deletedBackups: 0,
    totalRecords: 0,
    estimatedBytes: 0,
    errors: []
  };

  try {
    // Step 1: Get current backup statistics
    console.log('Step 1: Analyzing backup database...');
    stats.totalBackups = await FieldDataBackup.count();
    console.log(`Total backups in database: ${stats.totalBackups}\n`);

    // Step 2: Find expired backups
    console.log('Step 2: Finding expired backups...');
    const now = new Date();
    const expiredBackups = await FieldDataBackup.findAll({
      where: {
        retention_until: {
          [sequelize.Sequelize.Op.lt]: now
        }
      },
      include: [{
        model: require(sequelizePath).Form,
        as: 'form',
        attributes: ['id', 'title']
      }],
      order: [['createdAt', 'ASC']] // Delete oldest first
    });

    stats.expiredBackups = expiredBackups.length;
    console.log(`Expired backups found: ${stats.expiredBackups}`);

    if (stats.expiredBackups === 0) {
      console.log('\nNo expired backups to clean up.');
      console.log('All backups are within retention period.');
      process.exit(0);
    }

    // Step 3: Calculate space savings
    console.log('\nStep 3: Calculating estimated space savings...');
    console.log('-'.repeat(60));

    for (const backup of expiredBackups) {
      const recordCount = backup.getRecordCount();
      const estimatedSize = estimateBackupSize(backup);

      stats.totalRecords += recordCount;
      stats.estimatedBytes += estimatedSize;

      const daysExpired = Math.floor((now - new Date(backup.retention_until)) / (1000 * 60 * 60 * 24));
      const formTitle = backup.form ? backup.form.title : 'Unknown Form';

      console.log(`Backup: ${backup.id.substring(0, 8)}...`);
      console.log(`  Form: ${formTitle}`);
      console.log(`  Column: ${backup.column_name}`);
      console.log(`  Records: ${recordCount}`);
      console.log(`  Size: ${formatBytes(estimatedSize)}`);
      console.log(`  Expired: ${daysExpired} days ago`);
      console.log('');
    }

    console.log('Summary:');
    console.log(`  Total expired backups: ${stats.expiredBackups}`);
    console.log(`  Total records to clear: ${stats.totalRecords}`);
    console.log(`  Estimated space savings: ${formatBytes(stats.estimatedBytes)}`);

    // Step 4: Delete backups
    if (!isDryRun) {
      console.log('\nStep 4: Deleting expired backups...');

      const transaction = await sequelize.transaction();

      try {
        // Delete in batches
        const totalBatches = Math.ceil(expiredBackups.length / BATCH_SIZE);

        for (let i = 0; i < expiredBackups.length; i += BATCH_SIZE) {
          const batch = expiredBackups.slice(i, i + BATCH_SIZE);
          const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

          console.log(`  Processing batch ${batchNumber}/${totalBatches} (${batch.length} backups)...`);

          const backupIds = batch.map(b => b.id);

          const deletedCount = await FieldDataBackup.destroy({
            where: {
              id: {
                [sequelize.Sequelize.Op.in]: backupIds
              }
            },
            transaction
          });

          stats.deletedBackups += deletedCount;
          console.log(`  Deleted: ${deletedCount} backups`);
        }

        await transaction.commit();
        console.log('\nAll expired backups deleted successfully!');

      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } else {
      console.log('\n[DRY-RUN] Skipping deletion step');
      stats.deletedBackups = stats.expiredBackups; // For reporting
    }

    // Step 5: Final summary
    console.log('\n========================================');
    console.log('Cleanup Summary');
    console.log('========================================');
    console.log(`Total backups (before): ${stats.totalBackups}`);
    console.log(`Expired backups found:  ${stats.expiredBackups}`);
    console.log(`Backups deleted:        ${stats.deletedBackups}`);
    console.log(`Records cleared:        ${stats.totalRecords}`);
    console.log(`Space saved (est):      ${formatBytes(stats.estimatedBytes)}`);
    console.log(`Remaining backups:      ${stats.totalBackups - stats.deletedBackups}`);

    if (isDryRun) {
      console.log('\n[DRY-RUN] Run without --dry-run to perform actual cleanup');
    } else {
      console.log('\nCleanup completed successfully!');
      console.log(`Next run: Consider scheduling via cron for automated maintenance`);
    }

    process.exit(0);

  } catch (error) {
    console.error('\nError during cleanup:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  cleanupOldBackups().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { cleanupOldBackups };
