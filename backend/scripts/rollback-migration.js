/**
 * Rollback Migration Script
 *
 * Restores database from backup file created by backup-database.js
 * Reverts all changes made by migrate-retranslate-forms.js
 *
 * Usage:
 *   node backend/scripts/rollback-migration.js <backup-file>
 *   node backend/scripts/rollback-migration.js backups/backup-2025-10-02T12-00-00.json
 *
 * @version 1.0.0
 * @since 2025-10-02
 */

require('dotenv').config();
const { Sequelize, QueryTypes } = require('sequelize');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

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
 * Main rollback function
 */
async function rollbackMigration(backupFilePath) {
  console.log('\n=================================================');
  console.log('⏪ Migration Rollback Script');
  console.log('=================================================\n');

  try {
    // Validate backup file
    if (!backupFilePath) {
      throw new Error('Backup file path required. Usage: node rollback-migration.js <backup-file>');
    }

    const fullPath = path.resolve(backupFilePath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Backup file not found: ${fullPath}`);
    }

    console.log(`📂 Loading backup: ${fullPath}\n`);

    // Load backup
    const backupData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

    console.log('📊 Backup Information:');
    console.log(`  Date:       ${backupData.timestamp}`);
    console.log(`  Database:   ${backupData.database}`);
    console.log(`  Forms:      ${backupData.metadata.totalForms}`);
    console.log(`  Sub-Forms:  ${backupData.metadata.totalSubForms}`);
    console.log(`  Tables:     ${backupData.metadata.totalDynamicTables}\n`);

    // Confirm rollback
    const proceed = await askConfirmation('⚠️  This will OVERWRITE current database. Continue?');

    if (!proceed) {
      console.log('❌ Rollback cancelled\n');
      return;
    }

    await sequelize.authenticate();
    console.log('\n✅ Database connection established\n');

    // Step 1: Restore forms table
    console.log('🔄 Step 1: Restore forms table\n');

    for (const form of backupData.forms) {
      await sequelize.query(`
        UPDATE forms
        SET
          title = :title,
          table_name = :table_name,
          description = :description,
          updated_at = :updated_at
        WHERE id = :id
      `, {
        replacements: {
          id: form.id,
          title: form.title,
          table_name: form.table_name,
          description: form.description,
          updated_at: form.updated_at
        },
        type: QueryTypes.UPDATE
      });

      console.log(`   ✅ Restored form: ${form.title} (table: ${form.table_name})`);
    }

    console.log('');

    // Step 2: Restore sub_forms table
    console.log('🔄 Step 2: Restore sub_forms table\n');

    for (const subForm of backupData.subForms) {
      await sequelize.query(`
        UPDATE sub_forms
        SET
          title = :title,
          table_name = :table_name,
          updated_at = :updated_at
        WHERE id = :id
      `, {
        replacements: {
          id: subForm.id,
          title: subForm.title,
          table_name: subForm.table_name,
          updated_at: subForm.updated_at
        },
        type: QueryTypes.UPDATE
      });

      console.log(`   ✅ Restored sub-form: ${subForm.title} (table: ${subForm.table_name})`);
    }

    console.log('');

    // Step 3: Restore dynamic tables
    console.log('🔄 Step 3: Restore dynamic tables\n');

    for (const tableBackup of backupData.dynamicTables) {
      const tableName = tableBackup.tableName;

      console.log(`   Processing: ${tableName}`);

      try {
        // Check if table exists
        const tableExists = await checkTableExists(tableName);

        if (!tableExists) {
          console.log(`      ℹ️  Table doesn't exist, will recreate`);

          // Recreate table from backup structure
          const columnDefs = tableBackup.columns.map(col => {
            let def = `${col.column_name} ${col.data_type}`;
            if (col.is_nullable === 'NO') def += ' NOT NULL';
            if (col.column_default) def += ` DEFAULT ${col.column_default}`;
            return def;
          }).join(', ');

          await sequelize.query(`CREATE TABLE ${tableName} (${columnDefs});`);
          console.log(`      ✅ Created table`);
        }

        // Restore data (truncate and insert)
        await sequelize.query(`TRUNCATE TABLE ${tableName} CASCADE;`);

        if (tableBackup.data.length > 0) {
          const columns = Object.keys(tableBackup.data[0]);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

          for (const row of tableBackup.data) {
            const values = columns.map(col => row[col]);
            await sequelize.query(
              `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
              { bind: values }
            );
          }

          console.log(`      ✅ Restored ${tableBackup.data.length} rows`);
        } else {
          console.log(`      ℹ️  No data to restore`);
        }

      } catch (error) {
        console.log(`      ❌ Error: ${error.message}`);
      }
    }

    console.log('\n=================================================');
    console.log('✅ Rollback Complete!');
    console.log('=================================================\n');

    console.log('📊 Summary:');
    console.log(`  Forms restored:      ${backupData.forms.length}`);
    console.log(`  Sub-forms restored:  ${backupData.subForms.length}`);
    console.log(`  Tables restored:     ${backupData.dynamicTables.length}\n`);

  } catch (error) {
    console.error('❌ Rollback failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await sequelize.close();
  }
}

/**
 * Helper: Check if table exists
 */
async function checkTableExists(tableName) {
  const [result] = await sequelize.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = :tableName
    ) as exists;
  `, {
    replacements: { tableName },
    type: QueryTypes.SELECT
  });

  return result.exists;
}

/**
 * Helper: Ask user confirmation
 */
function askConfirmation(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(`${question} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

// Run rollback
if (require.main === module) {
  const backupFile = process.argv[2];

  if (!backupFile) {
    console.error('\n❌ Error: Backup file required');
    console.error('Usage: node rollback-migration.js <backup-file>');
    console.error('Example: node rollback-migration.js backups/backup-2025-10-02T12-00-00.json\n');
    process.exit(1);
  }

  rollbackMigration(backupFile)
    .then(() => {
      console.log('✅ Rollback completed\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Rollback failed:', error);
      process.exit(1);
    });
}

module.exports = { rollbackMigration };
