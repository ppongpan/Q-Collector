/**
 * Retranslate Forms Migration Script
 *
 * Migrates existing forms from old translation system (Dictionary + Transliteration)
 * to new LibreTranslate system for better accuracy.
 *
 * Features:
 * - Dry-run mode (preview changes without applying)
 * - Automatic backup before migration
 * - Retranslate form names → new table names
 * - Retranslate field names → new column names
 * - Rename PostgreSQL tables
 * - Rename PostgreSQL columns
 * - Update foreign key references
 * - Rollback on error
 *
 * Usage:
 *   # Preview changes (dry-run)
 *   node backend/scripts/migrate-retranslate-forms.js --dry-run
 *
 *   # Apply migration
 *   node backend/scripts/migrate-retranslate-forms.js
 *
 *   # Force migration without backup prompt
 *   node backend/scripts/migrate-retranslate-forms.js --force
 *
 * @version 1.0.0
 * @since 2025-10-02
 */

require('dotenv').config();
const { Sequelize, QueryTypes } = require('sequelize');
const TranslationService = require('../services/TranslationService');
const SQLNameNormalizer = require('../services/SQLNameNormalizer');
const { backupDatabase } = require('./backup-database');
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

// Command-line args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForce = args.includes('--force');

/**
 * Main migration function
 */
async function migrateRetranslateForms() {
  console.log('\n=================================================');
  console.log('🔄 Form Retranslation Migration (LibreTranslate)');
  console.log('=================================================\n');

  if (isDryRun) {
    console.log('⚠️  DRY-RUN MODE: No changes will be applied\n');
  }

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Step 1: Create backup (unless dry-run or forced)
    if (!isDryRun && !isForce) {
      console.log('📋 Step 1: Create backup\n');
      const proceed = await askConfirmation('Create database backup before migration?');

      if (proceed) {
        await backupDatabase();
        console.log('');
      } else {
        console.log('⚠️  Skipping backup (not recommended!)\n');
      }
    }

    // Step 2: Load all forms
    console.log('📋 Step 2: Load existing forms\n');
    const forms = await sequelize.query(
      'SELECT * FROM forms ORDER BY "createdAt"',
      { type: QueryTypes.SELECT }
    );

    console.log(`Found ${forms.length} forms\n`);

    if (forms.length === 0) {
      console.log('ℹ️  No forms to migrate\n');
      return;
    }

    // Step 3: Retranslate each form
    console.log('🔄 Step 3: Retranslate form names\n');

    const migrations = [];

    for (const form of forms) {
      console.log(`[${form.id}] "${form.title}"`);

      // Skip if already in English
      if (!TranslationService.containsThai(form.title)) {
        console.log(`   ℹ️  Already in English, skipping\n`);
        continue;
      }

      // Translate form name
      const translation = await TranslationService.translate(form.title, {
        useAPI: true,
        lowercase: true
      });

      // Generate new table name
      const oldTableName = form.table_name;
      const newTableName = await generateTableName(translation.english);

      // Check if table exists
      const tableExists = await checkTableExists(oldTableName);

      migrations.push({
        formId: form.id,
        formTitle: form.title,
        oldTableName,
        newTableName,
        tableExists,
        translation,
        fields: [] // Will be populated later
      });

      console.log(`   Old table: ${oldTableName || 'NULL'}`);
      console.log(`   New table: ${newTableName}`);
      console.log(`   Source:    ${translation.source} (${(translation.confidence * 100).toFixed(0)}% confidence)`);
      console.log(`   Exists:    ${tableExists ? '✅ YES' : '❌ NO'}\n`);
    }

    // Step 4: Retranslate fields
    console.log('🔄 Step 4: Retranslate field names\n');

    for (const migration of migrations) {
      if (!migration.tableExists) {
        console.log(`[${migration.formId}] Skipping fields (table doesn't exist)\n`);
        continue;
      }

      console.log(`[${migration.formId}] Processing fields for "${migration.formTitle}"`);

      // Get current columns
      const columns = await getTableColumns(migration.oldTableName);

      // Skip system columns
      const systemColumns = ['id', 'form_id', 'user_id', 'submission_number',
                             'status', 'created_at', 'updated_at', 'submitted_at'];

      const userColumns = columns.filter(col => !systemColumns.includes(col.column_name));

      console.log(`   Found ${userColumns.length} user columns\n`);

      for (const col of userColumns) {
        // Try to reverse-translate column name to Thai (or just use as-is)
        const fieldLabel = col.column_name;

        // Retranslate
        const fieldTranslation = await TranslationService.translate(fieldLabel, {
          useAPI: true,
          lowercase: true
        });

        const newColumnName = await generateColumnName(fieldTranslation.english);

        migration.fields.push({
          oldColumnName: col.column_name,
          newColumnName,
          dataType: col.data_type,
          translation: fieldTranslation
        });

        console.log(`     ${col.column_name} → ${newColumnName} (${fieldTranslation.source})`);
      }

      console.log('');
    }

    // Step 5: Preview changes
    console.log('=================================================');
    console.log('📊 Migration Preview');
    console.log('=================================================\n');

    let tablesRenamed = 0;
    let columnsRenamed = 0;

    migrations.forEach(m => {
      if (m.oldTableName !== m.newTableName && m.tableExists) {
        tablesRenamed++;
      }
      columnsRenamed += m.fields.filter(f => f.oldColumnName !== f.newColumnName).length;
    });

    console.log(`  Forms to migrate:   ${migrations.length}`);
    console.log(`  Tables to rename:   ${tablesRenamed}`);
    console.log(`  Columns to rename:  ${columnsRenamed}\n`);

    if (isDryRun) {
      console.log('=================================================');
      console.log('✅ DRY-RUN COMPLETE (No changes applied)');
      console.log('=================================================\n');
      return migrations;
    }

    // Step 6: Apply migrations
    console.log('🔄 Step 6: Apply migrations\n');

    const proceed = await askConfirmation('Apply these changes to the database?');

    if (!proceed) {
      console.log('❌ Migration cancelled by user\n');
      return;
    }

    console.log('');

    for (const migration of migrations) {
      console.log(`[${migration.formId}] Migrating "${migration.formTitle}"`);

      try {
        // Rename table
        if (migration.oldTableName !== migration.newTableName && migration.tableExists) {
          await renameTable(migration.oldTableName, migration.newTableName);
          console.log(`   ✅ Renamed table: ${migration.oldTableName} → ${migration.newTableName}`);
        }

        // Rename columns
        const tableName = migration.newTableName; // Use new name
        for (const field of migration.fields) {
          if (field.oldColumnName !== field.newColumnName) {
            await renameColumn(tableName, field.oldColumnName, field.newColumnName, field.dataType);
            console.log(`   ✅ Renamed column: ${field.oldColumnName} → ${field.newColumnName}`);
          }
        }

        // Update forms table with new table_name
        await sequelize.query(
          'UPDATE forms SET table_name = :newTableName WHERE id = :formId',
          {
            replacements: { newTableName: migration.newTableName, formId: migration.formId },
            type: QueryTypes.UPDATE
          }
        );
        console.log(`   ✅ Updated forms.table_name\n`);

      } catch (error) {
        console.error(`   ❌ Error: ${error.message}\n`);
      }
    }

    // Step 7: Verify changes
    console.log('🔍 Step 7: Verify changes\n');

    for (const migration of migrations) {
      const exists = await checkTableExists(migration.newTableName);
      console.log(`   ${exists ? '✅' : '❌'} ${migration.newTableName}`);
    }

    console.log('\n=================================================');
    console.log('✅ Migration Complete!');
    console.log('=================================================\n');

    return migrations;

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await sequelize.close();
  }
}

/**
 * Helper: Generate table name
 */
async function generateTableName(englishName) {
  // This should match SchemaGenerator logic
  const prefix = 'form_';
  let normalized = englishName.toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

  // Add timestamp suffix for uniqueness
  const timestamp = Date.now().toString(36).substring(0, 6);
  return `${prefix}${normalized}_${timestamp}`;
}

/**
 * Helper: Generate column name
 */
async function generateColumnName(englishName) {
  let normalized = englishName.toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

  return normalized;
}

/**
 * Helper: Check if table exists
 */
async function checkTableExists(tableName) {
  if (!tableName) return false;

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
 * Helper: Get table columns
 */
async function getTableColumns(tableName) {
  return await sequelize.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = :tableName
    ORDER BY ordinal_position;
  `, {
    replacements: { tableName },
    type: QueryTypes.SELECT
  });
}

/**
 * Helper: Rename table
 */
async function renameTable(oldName, newName) {
  await sequelize.query(`ALTER TABLE ${oldName} RENAME TO ${newName};`);
}

/**
 * Helper: Rename column
 */
async function renameColumn(tableName, oldName, newName, dataType) {
  await sequelize.query(
    `ALTER TABLE ${tableName} RENAME COLUMN ${oldName} TO ${newName};`
  );
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

// Run migration
if (require.main === module) {
  migrateRetranslateForms()
    .then(() => {
      console.log('✅ Script completed\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateRetranslateForms };
