/**
 * Database Backup Script
 *
 * Creates a complete backup of forms, sub_forms, and dynamic tables
 * before running the retranslation migration.
 *
 * Usage:
 *   node backend/scripts/backup-database.js
 *   node backend/scripts/backup-database.js --output custom-backup.json
 *
 * @version 1.0.0
 * @since 2025-10-02
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

// Database connection
const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'qcollector_db',
  process.env.POSTGRES_USER || 'qcollector',
  process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  }
);

/**
 * Main backup function
 */
async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const defaultFilename = `backup-${timestamp}.json`;

  // Check for custom output filename
  const args = process.argv.slice(2);
  const outputIndex = args.indexOf('--output');
  const filename = outputIndex >= 0 && args[outputIndex + 1]
    ? args[outputIndex + 1]
    : defaultFilename;

  const backupDir = path.join(__dirname, '../../backups');
  const outputPath = path.join(backupDir, filename);

  console.log('\n=================================================');
  console.log('💾 Database Backup Script');
  console.log('=================================================\n');

  try {
    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log(`✅ Created backup directory: ${backupDir}\n`);
    }

    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    const backup = {
      timestamp: new Date().toISOString(),
      database: process.env.POSTGRES_DB || 'qcollector_db',
      version: '0.7.0',
      forms: [],
      subForms: [],
      dynamicTables: [],
      metadata: {}
    };

    // Backup forms table
    console.log('📋 Backing up forms table...');
    const [forms] = await sequelize.query('SELECT * FROM forms ORDER BY created_at');
    backup.forms = forms;
    console.log(`   ✅ Backed up ${forms.length} forms\n`);

    // Backup sub_forms table
    console.log('📋 Backing up sub_forms table...');
    const [subForms] = await sequelize.query('SELECT * FROM sub_forms ORDER BY created_at');
    backup.subForms = subForms;
    console.log(`   ✅ Backed up ${subForms.length} sub-forms\n`);

    // Backup dynamic tables (form_* tables)
    console.log('📊 Backing up dynamic tables...');
    const [dynamicTables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'form_%'
      ORDER BY table_name;
    `);

    for (const table of dynamicTables) {
      const tableName = table.table_name;

      try {
        // Get table structure
        const [columns] = await sequelize.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = '${tableName}'
          ORDER BY ordinal_position;
        `);

        // Get table data
        const [data] = await sequelize.query(`SELECT * FROM ${tableName}`);

        backup.dynamicTables.push({
          tableName,
          columns,
          data,
          rowCount: data.length
        });

        console.log(`   ✅ ${tableName} (${data.length} rows)`);
      } catch (error) {
        console.log(`   ⚠️  ${tableName} (error: ${error.message})`);
      }
    }

    // Metadata
    backup.metadata = {
      totalForms: forms.length,
      totalSubForms: subForms.length,
      totalDynamicTables: backup.dynamicTables.length,
      totalRows: backup.dynamicTables.reduce((sum, t) => sum + t.rowCount, 0),
      backupDate: new Date().toISOString(),
      backupBy: 'backup-database.js',
      postgresVersion: await getPostgresVersion()
    };

    // Write backup file
    console.log(`\n💾 Writing backup to: ${outputPath}`);
    fs.writeFileSync(outputPath, JSON.stringify(backup, null, 2));

    const stats = fs.statSync(outputPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`✅ Backup completed successfully!`);
    console.log(`   File size: ${fileSizeMB} MB\n`);

    // Summary
    console.log('=================================================');
    console.log('📊 Backup Summary');
    console.log('=================================================\n');
    console.log(`  Forms:          ${backup.metadata.totalForms}`);
    console.log(`  Sub-Forms:      ${backup.metadata.totalSubForms}`);
    console.log(`  Dynamic Tables: ${backup.metadata.totalDynamicTables}`);
    console.log(`  Total Rows:     ${backup.metadata.totalRows}`);
    console.log(`  File Size:      ${fileSizeMB} MB`);
    console.log(`  Output:         ${outputPath}\n`);
    console.log('=================================================\n');

    return outputPath;

  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await sequelize.close();
  }
}

/**
 * Get PostgreSQL version
 */
async function getPostgresVersion() {
  try {
    const [result] = await sequelize.query('SELECT version();');
    return result[0].version;
  } catch {
    return 'Unknown';
  }
}

// Run backup
if (require.main === module) {
  backupDatabase()
    .then((outputPath) => {
      console.log(`✅ Backup saved to: ${outputPath}\n`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Backup failed:', error);
      process.exit(1);
    });
}

module.exports = { backupDatabase };
