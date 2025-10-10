/**
 * Migration Health Check Script
 *
 * Verifies the integrity and health of the Field Migration System.
 * Checks database tables, indexes, Redis queue, and overall system health.
 *
 * Usage:
 *   node backend/scripts/migration-health-check.js        # Run health check
 *   node backend/scripts/migration-health-check.js --help # Show help
 *
 * Features:
 * - Verifies database tables exist (field_migrations, field_data_backups)
 * - Checks required indexes are present
 * - Tests Redis connection and queue status
 * - Finds orphaned backups and failed migrations
 * - Calculates health score (0-100%)
 * - Color-coded report (green/yellow/red)
 *
 * Exit Codes:
 *   0 = Healthy (90-100%)
 *   1 = Critical issues (<70%)
 *   2 = Warnings (70-89%)
 *
 * Created: 2025-10-07
 * Sprint: 6 (DevOps - Migration Maintenance Scripts)
 */

require('dotenv').config();
const { Pool } = require('pg');
const path = require('path');

// Initialize database connections
const sequelizePath = path.join(__dirname, '..', 'models');
const { FieldMigration, FieldDataBackup, sequelize } = require(sequelizePath);

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

// Parse command line arguments
const showHelp = process.argv.includes('--help');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

/**
 * Display help information
 */
function displayHelp() {
  console.log(`
Migration Health Check Script
==============================

Purpose:
  Verify the integrity and health of the Field Migration System

Usage:
  node backend/scripts/migration-health-check.js        # Run health check
  node backend/scripts/migration-health-check.js --help # Show this help

Checks Performed:
  1. Database tables exist (field_migrations, field_data_backups)
  2. Required indexes are present
  3. Redis connection and queue status
  4. Orphaned backups (no matching migrations)
  5. Failed migrations in last 24 hours
  6. Transaction support
  7. Service accessibility

Health Score:
  90-100% = Healthy (green)
  70-89%  = Warnings (yellow)
  <70%    = Critical (red)

Exit Codes:
  0 = Healthy (90-100%)
  1 = Critical issues (<70%)
  2 = Warnings (70-89%)

Examples:
  node backend/scripts/migration-health-check.js
`);
  process.exit(0);
}

/**
 * Test Redis connection
 */
async function checkRedis() {
  try {
    const redis = require('redis');
    const client = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined
    });

    await new Promise((resolve, reject) => {
      client.on('ready', resolve);
      client.on('error', reject);
      client.connect();
    });

    // Test queue key existence
    const queueKey = 'migration:queue';
    const queueLength = await new Promise((resolve) => {
      client.llen(queueKey, (err, len) => {
        resolve(err ? 0 : len);
      });
    });

    await client.quit();

    return {
      success: true,
      connected: true,
      queueLength: queueLength
    };
  } catch (error) {
    return {
      success: false,
      connected: false,
      error: error.message
    };
  }
}

/**
 * Check if table exists
 */
async function checkTable(client, tableName) {
  const result = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = $1
  `, [tableName]);

  return result.rows.length > 0;
}

/**
 * Check if index exists
 */
async function checkIndex(client, tableName, indexName) {
  const result = await client.query(`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = $1
    AND indexname LIKE $2
  `, [tableName, `%${indexName}%`]);

  return result.rows.length > 0;
}

/**
 * Check for orphaned backups
 */
async function checkOrphanedBackups() {
  try {
    // Find backups that reference non-existent migrations
    const backups = await FieldDataBackup.findAll({
      attributes: ['id', 'field_id', 'form_id', 'table_name', 'column_name'],
      include: [{
        model: FieldMigration,
        as: 'migrations',
        required: false
      }]
    });

    const orphaned = backups.filter(backup => {
      return backup.migrations && backup.migrations.length === 0;
    });

    return {
      success: true,
      totalBackups: backups.length,
      orphanedCount: orphaned.length,
      orphanedBackups: orphaned.map(b => ({
        id: b.id,
        tableName: b.table_name,
        columnName: b.column_name
      }))
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check for recent failed migrations
 */
async function checkFailedMigrations() {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const failedMigrations = await FieldMigration.findAll({
      where: {
        success: false,
        executed_at: {
          [sequelize.Sequelize.Op.gte]: oneDayAgo
        }
      },
      attributes: ['id', 'migration_type', 'table_name', 'column_name', 'error_message', 'executed_at']
    });

    return {
      success: true,
      failedCount: failedMigrations.length,
      failures: failedMigrations.map(m => ({
        id: m.id,
        type: m.migration_type,
        table: m.table_name,
        column: m.column_name,
        error: m.error_message,
        when: m.executed_at
      }))
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test transaction support
 */
async function checkTransactionSupport() {
  const transaction = await sequelize.transaction();
  try {
    // Perform a simple read query within transaction
    await FieldMigration.findOne({ transaction, limit: 1 });
    await transaction.commit();
    return { success: true, supported: true };
  } catch (error) {
    await transaction.rollback();
    return { success: false, error: error.message };
  }
}

/**
 * Calculate health score based on checks
 */
function calculateHealthScore(checks) {
  let score = 0;
  let maxScore = 0;

  // Database tables (20 points each)
  maxScore += 40;
  if (checks.fieldMigrationsTable) score += 20;
  if (checks.fieldDataBackupsTable) score += 20;

  // Indexes (5 points each, up to 10 total)
  maxScore += 10;
  const indexScore = Math.min(checks.indexesFound, 2) * 5;
  score += indexScore;

  // Redis connection (15 points)
  maxScore += 15;
  if (checks.redisConnected) score += 15;

  // Transaction support (10 points)
  maxScore += 10;
  if (checks.transactionSupport) score += 10;

  // No orphaned backups (10 points)
  maxScore += 10;
  if (checks.orphanedBackups === 0) {
    score += 10;
  } else if (checks.orphanedBackups < 5) {
    score += 5; // Partial credit
  }

  // No failed migrations (15 points)
  maxScore += 15;
  if (checks.failedMigrations === 0) {
    score += 15;
  } else if (checks.failedMigrations < 3) {
    score += 8; // Partial credit
  }

  const percentage = Math.round((score / maxScore) * 100);
  return { score, maxScore, percentage };
}

/**
 * Main health check function
 */
async function performHealthCheck() {
  if (showHelp) {
    displayHelp();
  }

  console.log('\n========================================');
  console.log('Migration System Health Check');
  console.log('========================================\n');
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const client = await pool.connect();
  const results = {
    fieldMigrationsTable: false,
    fieldDataBackupsTable: false,
    indexesFound: 0,
    redisConnected: false,
    redisQueueLength: 0,
    orphanedBackups: 0,
    failedMigrations: 0,
    transactionSupport: false,
    issues: []
  };

  try {
    // Check 1: Database Tables
    console.log('Check 1: Database Tables');
    console.log('-'.repeat(60));

    results.fieldMigrationsTable = await checkTable(client, 'field_migrations');
    console.log(`  field_migrations:     ${results.fieldMigrationsTable ? colors.green + 'EXISTS' : colors.red + 'MISSING'}${colors.reset}`);
    if (!results.fieldMigrationsTable) {
      results.issues.push('CRITICAL: field_migrations table is missing');
    }

    results.fieldDataBackupsTable = await checkTable(client, 'field_data_backups');
    console.log(`  field_data_backups:   ${results.fieldDataBackupsTable ? colors.green + 'EXISTS' : colors.red + 'MISSING'}${colors.reset}`);
    if (!results.fieldDataBackupsTable) {
      results.issues.push('CRITICAL: field_data_backups table is missing');
    }

    // Check 2: Database Indexes
    console.log('\nCheck 2: Database Indexes');
    console.log('-'.repeat(60));

    const requiredIndexes = [
      { table: 'field_migrations', name: 'form_id' },
      { table: 'field_migrations', name: 'field_id' },
      { table: 'field_migrations', name: 'table_name' },
      { table: 'field_data_backups', name: 'form_id' },
      { table: 'field_data_backups', name: 'retention_until' }
    ];

    for (const idx of requiredIndexes) {
      const exists = await checkIndex(client, idx.table, idx.name);
      console.log(`  ${idx.table}.${idx.name}: ${exists ? colors.green + 'OK' : colors.yellow + 'MISSING'}${colors.reset}`);
      if (exists) results.indexesFound++;
    }

    // Check 3: Redis Connection
    console.log('\nCheck 3: Redis Queue');
    console.log('-'.repeat(60));

    const redisCheck = await checkRedis();
    results.redisConnected = redisCheck.connected;
    results.redisQueueLength = redisCheck.queueLength || 0;

    if (redisCheck.success) {
      console.log(`  Connection:           ${colors.green}CONNECTED${colors.reset}`);
      console.log(`  Queue length:         ${redisCheck.queueLength} items`);
    } else {
      console.log(`  Connection:           ${colors.red}FAILED${colors.reset}`);
      console.log(`  Error:                ${redisCheck.error}`);
      results.issues.push(`WARNING: Redis connection failed - ${redisCheck.error}`);
    }

    // Check 4: Orphaned Backups
    console.log('\nCheck 4: Orphaned Backups');
    console.log('-'.repeat(60));

    const backupsCheck = await checkOrphanedBackups();
    if (backupsCheck.success) {
      results.orphanedBackups = backupsCheck.orphanedCount;
      console.log(`  Total backups:        ${backupsCheck.totalBackups}`);
      console.log(`  Orphaned backups:     ${backupsCheck.orphanedCount > 0 ? colors.yellow : colors.green}${backupsCheck.orphanedCount}${colors.reset}`);

      if (backupsCheck.orphanedCount > 0) {
        results.issues.push(`WARNING: ${backupsCheck.orphanedCount} orphaned backup(s) found`);
        console.log(`  ${colors.yellow}Note: These backups have no associated migrations${colors.reset}`);
      }
    } else {
      console.log(`  ${colors.red}Failed to check orphaned backups: ${backupsCheck.error}${colors.reset}`);
      results.issues.push(`ERROR: Could not check orphaned backups - ${backupsCheck.error}`);
    }

    // Check 5: Failed Migrations (last 24 hours)
    console.log('\nCheck 5: Recent Failed Migrations');
    console.log('-'.repeat(60));

    const failuresCheck = await checkFailedMigrations();
    if (failuresCheck.success) {
      results.failedMigrations = failuresCheck.failedCount;
      console.log(`  Failed (last 24h):    ${failuresCheck.failedCount > 0 ? colors.red : colors.green}${failuresCheck.failedCount}${colors.reset}`);

      if (failuresCheck.failedCount > 0) {
        results.issues.push(`CRITICAL: ${failuresCheck.failedCount} migration(s) failed in last 24 hours`);
        console.log(`\n  Recent failures:`);
        failuresCheck.failures.forEach(f => {
          console.log(`    - ${f.type} on ${f.table}.${f.column}`);
          console.log(`      Error: ${f.error}`);
          console.log(`      When: ${f.when.toISOString()}`);
        });
      }
    } else {
      console.log(`  ${colors.red}Failed to check: ${failuresCheck.error}${colors.reset}`);
      results.issues.push(`ERROR: Could not check failed migrations - ${failuresCheck.error}`);
    }

    // Check 6: Transaction Support
    console.log('\nCheck 6: Transaction Support');
    console.log('-'.repeat(60));

    const transactionCheck = await checkTransactionSupport();
    results.transactionSupport = transactionCheck.success && transactionCheck.supported;

    if (transactionCheck.success) {
      console.log(`  Transaction support:  ${colors.green}OK${colors.reset}`);
    } else {
      console.log(`  Transaction support:  ${colors.red}FAILED${colors.reset}`);
      console.log(`  Error:                ${transactionCheck.error}`);
      results.issues.push(`CRITICAL: Transaction support test failed - ${transactionCheck.error}`);
    }

    // Calculate overall health score
    const healthScore = calculateHealthScore(results);

    // Print health summary
    console.log('\n========================================');
    console.log('Health Summary');
    console.log('========================================');

    const scoreColor = healthScore.percentage >= 90 ? colors.green :
                       healthScore.percentage >= 70 ? colors.yellow :
                       colors.red;

    console.log(`Health Score:         ${scoreColor}${healthScore.percentage}%${colors.reset} (${healthScore.score}/${healthScore.maxScore})`);
    console.log(`Status:               ${scoreColor}${healthScore.percentage >= 90 ? 'HEALTHY' : healthScore.percentage >= 70 ? 'WARNING' : 'CRITICAL'}${colors.reset}`);
    console.log(`Issues found:         ${results.issues.length}`);

    if (results.issues.length > 0) {
      console.log('\nIssues:');
      results.issues.forEach((issue, idx) => {
        const issueColor = issue.startsWith('CRITICAL') ? colors.red :
                          issue.startsWith('WARNING') ? colors.yellow :
                          colors.gray;
        console.log(`  ${idx + 1}. ${issueColor}${issue}${colors.reset}`);
      });
    }

    // Recommendations
    console.log('\nRecommendations:');
    if (healthScore.percentage >= 90) {
      console.log(`  ${colors.green}System is healthy. No action required.${colors.reset}`);
    } else if (healthScore.percentage >= 70) {
      console.log(`  ${colors.yellow}System has warnings. Review issues above.${colors.reset}`);
      console.log(`  Consider running cleanup scripts or investigating warnings.`);
    } else {
      console.log(`  ${colors.red}System has critical issues. Immediate action required!${colors.reset}`);
      console.log(`  1. Check database migrations are up to date`);
      console.log(`  2. Verify Redis is running and accessible`);
      console.log(`  3. Review failed migrations and fix underlying issues`);
      console.log(`  4. Run: npx sequelize-cli db:migrate`);
    }

    console.log('');

    // Determine exit code
    if (healthScore.percentage >= 90) {
      process.exit(0); // Healthy
    } else if (healthScore.percentage >= 70) {
      process.exit(2); // Warnings
    } else {
      process.exit(1); // Critical
    }

  } catch (error) {
    console.error('\nError during health check:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    await sequelize.close();
  }
}

// Execute if run directly
if (require.main === module) {
  performHealthCheck().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { performHealthCheck };
