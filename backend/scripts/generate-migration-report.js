/**
 * Generate Migration Report Script
 *
 * Generates comprehensive analytics and reports on Field Migration System usage.
 * Creates both HTML and JSON reports with statistics, charts, and trends.
 *
 * Usage:
 *   node backend/scripts/generate-migration-report.js              # Generate report
 *   node backend/scripts/generate-migration-report.js --days=30    # Last 30 days
 *   node backend/scripts/generate-migration-report.js --help       # Show help
 *
 * Features:
 * - Migration statistics by type (ADD_COLUMN, DROP_COLUMN, etc.)
 * - Success/failure rates and trends
 * - Most active forms (by migration count)
 * - Backup storage usage analysis
 * - Timeline charts (last 30 days by default)
 * - Exports to HTML and JSON formats
 *
 * Output:
 *   reports/migration-report-YYYYMMDD-HHMMSS.html
 *   reports/migration-stats-YYYYMMDD-HHMMSS.json
 *
 * Created: 2025-10-07
 * Sprint: 6 (DevOps - Migration Maintenance Scripts)
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs').promises;

// Initialize database connections
const sequelizePath = path.join(__dirname, '..', 'models');
const { FieldMigration, FieldDataBackup, Form, sequelize } = require(sequelizePath);

// Parse command line arguments
const args = process.argv.slice(2);
const daysMatch = args.find(arg => arg.startsWith('--days='));
const daysBack = daysMatch ? parseInt(daysMatch.split('=')[1]) : 30;
const showHelp = args.includes('--help');

/**
 * Display help information
 */
function displayHelp() {
  console.log(`
Generate Migration Report Script
=================================

Purpose:
  Generate comprehensive analytics on Field Migration System usage

Usage:
  node backend/scripts/generate-migration-report.js              # Last 30 days
  node backend/scripts/generate-migration-report.js --days=7     # Last 7 days
  node backend/scripts/generate-migration-report.js --days=90    # Last 90 days
  node backend/scripts/generate-migration-report.js --help       # Show this help

Options:
  --days=N    Number of days to include in report (default: 30)
  --help      Display this help message

Output Files:
  reports/migration-report-YYYYMMDD-HHMMSS.html  # Human-readable HTML report
  reports/migration-stats-YYYYMMDD-HHMMSS.json   # Machine-readable JSON data

Report Contents:
  - Total migrations by type
  - Success/failure rates
  - Migration timeline (daily breakdown)
  - Most active forms
  - Backup storage usage
  - Performance metrics

Examples:
  node backend/scripts/generate-migration-report.js
  node backend/scripts/generate-migration-report.js --days=7
`);
  process.exit(0);
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
 * Format number with commas
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Calculate date range
 */
function getDateRange(daysBack) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  return { startDate, endDate };
}

/**
 * Get migration statistics
 */
async function getMigrationStats(startDate, endDate) {
  // Total migrations by type
  const byType = await FieldMigration.findAll({
    where: {
      executed_at: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      }
    },
    attributes: [
      'migration_type',
      'success',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['migration_type', 'success'],
    raw: true
  });

  // Total migrations
  const totalMigrations = await FieldMigration.count({
    where: {
      executed_at: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      }
    }
  });

  // Successful migrations
  const successfulMigrations = await FieldMigration.count({
    where: {
      success: true,
      executed_at: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      }
    }
  });

  // Failed migrations
  const failedMigrations = await FieldMigration.count({
    where: {
      success: false,
      executed_at: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      }
    }
  });

  // Organize by type
  const typeStats = {};
  byType.forEach(row => {
    if (!typeStats[row.migration_type]) {
      typeStats[row.migration_type] = { success: 0, failed: 0 };
    }
    if (row.success) {
      typeStats[row.migration_type].success += parseInt(row.count);
    } else {
      typeStats[row.migration_type].failed += parseInt(row.count);
    }
  });

  return {
    totalMigrations,
    successfulMigrations,
    failedMigrations,
    successRate: totalMigrations > 0 ? ((successfulMigrations / totalMigrations) * 100).toFixed(2) : 0,
    byType: typeStats
  };
}

/**
 * Get timeline data (daily breakdown)
 */
async function getTimelineData(startDate, endDate) {
  const migrations = await FieldMigration.findAll({
    where: {
      executed_at: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      }
    },
    attributes: [
      [sequelize.fn('DATE', sequelize.col('executed_at')), 'date'],
      'success',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: [sequelize.fn('DATE', sequelize.col('executed_at')), 'success'],
    order: [[sequelize.fn('DATE', sequelize.col('executed_at')), 'ASC']],
    raw: true
  });

  // Organize by date
  const timeline = {};
  migrations.forEach(row => {
    const date = row.date;
    if (!timeline[date]) {
      timeline[date] = { success: 0, failed: 0 };
    }
    if (row.success) {
      timeline[date].success += parseInt(row.count);
    } else {
      timeline[date].failed += parseInt(row.count);
    }
  });

  return timeline;
}

/**
 * Get most active forms
 */
async function getMostActiveForms(startDate, endDate, limit = 10) {
  const forms = await FieldMigration.findAll({
    where: {
      executed_at: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      }
    },
    attributes: [
      'form_id',
      [sequelize.fn('COUNT', sequelize.col('FieldMigration.id')), 'migration_count']
    ],
    include: [{
      model: Form,
      as: 'form',
      attributes: ['id', 'title', 'table_name']
    }],
    group: ['form_id', 'form.id', 'form.title', 'form.table_name'],
    order: [[sequelize.fn('COUNT', sequelize.col('FieldMigration.id')), 'DESC']],
    limit: limit,
    raw: true,
    nest: true
  });

  return forms.map(f => ({
    formId: f.form_id,
    formTitle: f.form ? f.form.title : 'Unknown',
    tableName: f.form ? f.form.table_name : 'Unknown',
    migrationCount: parseInt(f.migration_count)
  }));
}

/**
 * Get backup storage statistics
 */
async function getBackupStats(startDate, endDate) {
  const backups = await FieldDataBackup.findAll({
    where: {
      createdAt: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      }
    },
    attributes: ['id', 'data_snapshot', 'backup_type', 'retention_until']
  });

  let totalBackups = backups.length;
  let totalRecords = 0;
  let estimatedBytes = 0;
  let expiredBackups = 0;
  const now = new Date();

  const byType = {};

  backups.forEach(backup => {
    const recordCount = backup.data_snapshot ? backup.data_snapshot.length : 0;
    const size = JSON.stringify(backup.data_snapshot || []).length;

    totalRecords += recordCount;
    estimatedBytes += size;

    if (backup.retention_until && new Date(backup.retention_until) < now) {
      expiredBackups++;
    }

    const type = backup.backup_type || 'UNKNOWN';
    if (!byType[type]) {
      byType[type] = { count: 0, records: 0, bytes: 0 };
    }
    byType[type].count++;
    byType[type].records += recordCount;
    byType[type].bytes += size;
  });

  return {
    totalBackups,
    totalRecords,
    estimatedBytes,
    expiredBackups,
    activeBackups: totalBackups - expiredBackups,
    byType
  };
}

/**
 * Generate ASCII chart for timeline
 */
function generateAsciiChart(timeline, width = 60) {
  const dates = Object.keys(timeline).sort();
  if (dates.length === 0) return 'No data available';

  const maxCount = Math.max(...dates.map(d => timeline[d].success + timeline[d].failed));
  if (maxCount === 0) return 'No migrations recorded';

  let chart = '';
  dates.forEach(date => {
    const total = timeline[date].success + timeline[date].failed;
    const barLength = Math.round((total / maxCount) * width);
    const bar = '█'.repeat(barLength);
    chart += `${date.substring(5)}: ${bar} ${total}\n`;
  });

  return chart;
}

/**
 * Generate HTML report
 */
function generateHtmlReport(data) {
  const { period, migrations, timeline, activeForms, backups } = data;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Migration Report - ${period.startDate.toISOString().split('T')[0]} to ${period.endDate.toISOString().split('T')[0]}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        .header h1 {
            margin: 0 0 10px 0;
        }
        .header p {
            margin: 5px 0;
            opacity: 0.9;
        }
        .section {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section h2 {
            margin-top: 0;
            color: #333;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #667eea;
        }
        .stat-card .label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .stat-card .value {
            font-size: 28px;
            font-weight: bold;
            color: #333;
        }
        .stat-card .unit {
            font-size: 14px;
            color: #999;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        th, td {
            text-align: left;
            padding: 12px;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #667eea;
            color: white;
            font-weight: 600;
        }
        tr:hover {
            background-color: #f5f5f5;
        }
        .success { color: #28a745; font-weight: bold; }
        .failed { color: #dc3545; font-weight: bold; }
        .chart {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            font-family: monospace;
            overflow-x: auto;
            white-space: pre;
            line-height: 1.6;
        }
        .footer {
            text-align: center;
            color: #666;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Field Migration System Report</h1>
        <p><strong>Period:</strong> ${period.startDate.toISOString().split('T')[0]} to ${period.endDate.toISOString().split('T')[0]} (${period.days} days)</p>
        <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
    </div>

    <div class="section">
        <h2>📈 Migration Overview</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="label">Total Migrations</div>
                <div class="value">${formatNumber(migrations.totalMigrations)}</div>
            </div>
            <div class="stat-card">
                <div class="label">Successful</div>
                <div class="value success">${formatNumber(migrations.successfulMigrations)}</div>
            </div>
            <div class="stat-card">
                <div class="label">Failed</div>
                <div class="value failed">${formatNumber(migrations.failedMigrations)}</div>
            </div>
            <div class="stat-card">
                <div class="label">Success Rate</div>
                <div class="value">${migrations.successRate}<span class="unit">%</span></div>
            </div>
        </div>

        <h3>Migrations by Type</h3>
        <table>
            <thead>
                <tr>
                    <th>Migration Type</th>
                    <th>Successful</th>
                    <th>Failed</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(migrations.byType).map(([type, stats]) => `
                <tr>
                    <td><strong>${type}</strong></td>
                    <td class="success">${formatNumber(stats.success)}</td>
                    <td class="failed">${formatNumber(stats.failed)}</td>
                    <td>${formatNumber(stats.success + stats.failed)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>📅 Migration Timeline (Daily)</h2>
        <div class="chart">${generateAsciiChart(timeline)}</div>
    </div>

    <div class="section">
        <h2>🔥 Most Active Forms (Top ${activeForms.length})</h2>
        <table>
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>Form Title</th>
                    <th>Table Name</th>
                    <th>Migrations</th>
                </tr>
            </thead>
            <tbody>
                ${activeForms.map((form, idx) => `
                <tr>
                    <td><strong>#${idx + 1}</strong></td>
                    <td>${form.formTitle}</td>
                    <td><code>${form.tableName}</code></td>
                    <td><strong>${formatNumber(form.migrationCount)}</strong></td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>💾 Backup Storage Analysis</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="label">Total Backups</div>
                <div class="value">${formatNumber(backups.totalBackups)}</div>
            </div>
            <div class="stat-card">
                <div class="label">Active Backups</div>
                <div class="value success">${formatNumber(backups.activeBackups)}</div>
            </div>
            <div class="stat-card">
                <div class="label">Expired Backups</div>
                <div class="value failed">${formatNumber(backups.expiredBackups)}</div>
            </div>
            <div class="stat-card">
                <div class="label">Storage Used</div>
                <div class="value">${formatBytes(backups.estimatedBytes)}</div>
            </div>
        </div>

        <h3>Backups by Type</h3>
        <table>
            <thead>
                <tr>
                    <th>Backup Type</th>
                    <th>Count</th>
                    <th>Records</th>
                    <th>Storage</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(backups.byType).map(([type, stats]) => `
                <tr>
                    <td><strong>${type}</strong></td>
                    <td>${formatNumber(stats.count)}</td>
                    <td>${formatNumber(stats.records)}</td>
                    <td>${formatBytes(stats.bytes)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="footer">
        <p>Q-Collector Migration System v0.8.0 | Generated by generate-migration-report.js</p>
    </div>
</body>
</html>`;
}

/**
 * Main report generation function
 */
async function generateReport() {
  if (showHelp) {
    displayHelp();
  }

  console.log('\n========================================');
  console.log('Generate Migration Report');
  console.log('========================================\n');

  const { startDate, endDate } = getDateRange(daysBack);

  console.log(`Period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]} (${daysBack} days)\n`);

  try {
    // Gather all data
    console.log('Step 1: Collecting migration statistics...');
    const migrations = await getMigrationStats(startDate, endDate);
    console.log(`  Total migrations: ${migrations.totalMigrations}`);

    console.log('\nStep 2: Building timeline data...');
    const timeline = await getTimelineData(startDate, endDate);
    console.log(`  Timeline entries: ${Object.keys(timeline).length} days`);

    console.log('\nStep 3: Finding most active forms...');
    const activeForms = await getMostActiveForms(startDate, endDate);
    console.log(`  Active forms: ${activeForms.length}`);

    console.log('\nStep 4: Analyzing backup storage...');
    const backups = await getBackupStats(startDate, endDate);
    console.log(`  Total backups: ${backups.totalBackups}`);
    console.log(`  Storage used: ${formatBytes(backups.estimatedBytes)}`);

    // Prepare data
    const reportData = {
      period: {
        startDate,
        endDate,
        days: daysBack
      },
      migrations,
      timeline,
      activeForms,
      backups,
      generatedAt: new Date().toISOString()
    };

    // Create reports directory
    const reportDir = path.join(__dirname, '..', '..', 'reports');
    await fs.mkdir(reportDir, { recursive: true });

    // Generate timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);

    // Export HTML report
    console.log('\nStep 5: Generating HTML report...');
    const htmlContent = generateHtmlReport(reportData);
    const htmlPath = path.join(reportDir, `migration-report-${timestamp}.html`);
    await fs.writeFile(htmlPath, htmlContent, 'utf8');
    console.log(`  HTML report saved: ${htmlPath}`);

    // Export JSON report
    console.log('\nStep 6: Generating JSON report...');
    const jsonPath = path.join(reportDir, `migration-stats-${timestamp}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(reportData, null, 2), 'utf8');
    console.log(`  JSON report saved: ${jsonPath}`);

    // Print summary
    console.log('\n========================================');
    console.log('Report Summary');
    console.log('========================================');
    console.log(`Migrations analyzed:  ${migrations.totalMigrations}`);
    console.log(`Success rate:         ${migrations.successRate}%`);
    console.log(`Active forms:         ${activeForms.length}`);
    console.log(`Backups analyzed:     ${backups.totalBackups}`);
    console.log(`Storage usage:        ${formatBytes(backups.estimatedBytes)}`);
    console.log('\nReport files generated successfully!');
    console.log(`  HTML: ${htmlPath}`);
    console.log(`  JSON: ${jsonPath}`);

    process.exit(0);

  } catch (error) {
    console.error('\nError generating report:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Execute if run directly
if (require.main === module) {
  generateReport().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { generateReport };
