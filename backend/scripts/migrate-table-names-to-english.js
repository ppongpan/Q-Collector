/**
 * Migrate Thai Table/Column Names to English
 *
 * Uses DictionaryTranslationService to rename existing tables and columns
 * from Thai to meaningful English identifiers.
 *
 * @version 0.7.3-dev
 * @date 2025-10-06
 *
 * Usage:
 *   node backend/scripts/migrate-table-names-to-english.js          # Dry-run mode (preview only)
 *   node backend/scripts/migrate-table-names-to-english.js --execute # Execute migration
 *
 * Prerequisites:
 * - Database backup recommended before execution
 * - Dictionary translation system (Windows/WSL2 compatible)
 */

require('dotenv').config();
const { Pool } = require('pg');
const dictionaryService = require('../services/DictionaryTranslationService');
const { generateTableName, generateColumnName } = require('../utils/tableNameHelper');

// Database connection
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

// Migration report
const report = {
  timestamp: new Date().toISOString(),
  mode: 'DRY-RUN',
  tables: {
    total: 0,
    renamed: 0,
    skipped: 0,
    errors: 0
  },
  columns: {
    total: 0,
    renamed: 0,
    skipped: 0,
    errors: 0
  },
  operations: [],
  errors: []
};

/**
 * Check if text contains Thai characters
 */
function containsThai(text) {
  return /[\u0E00-\u0E7F]/.test(text);
}

/**
 * Get all forms with their table names
 */
async function getAllForms() {
  const query = `
    SELECT id, title, table_name, "createdAt"
    FROM forms
    ORDER BY "createdAt" ASC;
  `;
  const result = await pool.query(query);
  return result.rows;
}

/**
 * Get all sub-forms with their table names
 */
async function getAllSubForms() {
  const query = `
    SELECT id, title, table_name, form_id, "createdAt"
    FROM sub_forms
    ORDER BY "createdAt" ASC;
  `;
  const result = await pool.query(query);
  return result.rows;
}

/**
 * Get table columns (excluding system columns)
 */
async function getTableColumns(tableName) {
  const query = `
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = $1
    AND column_name NOT IN (
      'id', 'form_id', 'user_id', 'submission_number',
      'status', 'submitted_at', 'created_at', 'updated_at',
      'parent_id', 'sub_form_id', 'order_index'
    )
    ORDER BY ordinal_position;
  `;
  const result = await pool.query(query, [tableName]);
  return result.rows;
}

/**
 * Generate ALTER TABLE statement for renaming table
 */
function generateRenameTableSQL(oldName, newName) {
  return `ALTER TABLE ${oldName} RENAME TO ${newName};`;
}

/**
 * Generate ALTER TABLE statement for renaming column
 */
function generateRenameColumnSQL(tableName, oldColumn, newColumn) {
  return `ALTER TABLE ${tableName} RENAME COLUMN ${oldColumn} TO ${newColumn};`;
}

/**
 * Generate UPDATE statement for forms table
 */
function generateUpdateFormSQL(formId, newTableName) {
  return `UPDATE forms SET table_name = '${newTableName}' WHERE id = '${formId}';`;
}

/**
 * Generate UPDATE statement for sub_forms table
 */
function generateUpdateSubFormSQL(subFormId, newTableName) {
  return `UPDATE sub_forms SET table_name = '${newTableName}' WHERE id = '${subFormId}';`;
}

/**
 * Process a single form table migration
 */
async function processForms(dryRun = true) {
  console.log('\n📋 Processing Forms...\n');

  const forms = await getAllForms();
  report.tables.total += forms.length;

  for (const form of forms) {
    const { id, title, table_name } = form;

    // Skip if table_name is null or already English
    if (!table_name) {
      console.log(`⏭️  Skip: "${title}" (no table_name)`);
      report.tables.skipped++;
      continue;
    }

    if (!containsThai(table_name)) {
      console.log(`⏭️  Skip: "${title}" (already English: ${table_name})`);
      report.tables.skipped++;
      continue;
    }

    try {
      // Generate new English table name
      const newTableName = generateTableName(title, id);

      console.log(`🔄 Rename: ${table_name} → ${newTableName}`);

      // Record operation
      const operation = {
        type: 'RENAME_TABLE',
        entity: 'form',
        formId: id,
        formTitle: title,
        oldName: table_name,
        newName: newTableName,
        sql: [
          generateRenameTableSQL(table_name, newTableName),
          generateUpdateFormSQL(id, newTableName)
        ]
      };

      // Process columns
      const columns = await getTableColumns(table_name);
      report.columns.total += columns.length;

      for (const col of columns) {
        const { column_name } = col;

        if (containsThai(column_name)) {
          // Generate new English column name
          const newColumnName = generateColumnName(column_name);

          console.log(`  📝 Column: ${column_name} → ${newColumnName}`);

          operation.sql.push(
            generateRenameColumnSQL(newTableName, column_name, newColumnName)
          );
          report.columns.renamed++;
        } else {
          report.columns.skipped++;
        }
      }

      report.operations.push(operation);
      report.tables.renamed++;

      // Execute if not dry-run
      if (!dryRun) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          for (const sql of operation.sql) {
            await client.query(sql);
          }

          await client.query('COMMIT');
          console.log(`  ✅ Executed successfully`);
        } catch (error) {
          await client.query('ROLLBACK');
          console.error(`  ❌ Error: ${error.message}`);
          report.errors.push({
            type: 'form',
            id,
            error: error.message
          });
          report.tables.errors++;
        } finally {
          client.release();
        }
      }

    } catch (error) {
      console.error(`❌ Error processing form "${title}": ${error.message}`);
      report.errors.push({
        type: 'form',
        id,
        error: error.message
      });
      report.tables.errors++;
    }
  }
}

/**
 * Process sub-forms table migration
 */
async function processSubForms(dryRun = true) {
  console.log('\n📋 Processing Sub-Forms...\n');

  const subForms = await getAllSubForms();
  report.tables.total += subForms.length;

  for (const subForm of subForms) {
    const { id, title, table_name } = subForm;

    // Skip if table_name is null or already English
    if (!table_name) {
      console.log(`⏭️  Skip: "${title}" (no table_name)`);
      report.tables.skipped++;
      continue;
    }

    if (!containsThai(table_name)) {
      console.log(`⏭️  Skip: "${title}" (already English: ${table_name})`);
      report.tables.skipped++;
      continue;
    }

    try {
      // Generate new English table name
      const newTableName = generateTableName(title, id);

      console.log(`🔄 Rename: ${table_name} → ${newTableName}`);

      // Record operation
      const operation = {
        type: 'RENAME_TABLE',
        entity: 'sub_form',
        subFormId: id,
        subFormTitle: title,
        oldName: table_name,
        newName: newTableName,
        sql: [
          generateRenameTableSQL(table_name, newTableName),
          generateUpdateSubFormSQL(id, newTableName)
        ]
      };

      // Process columns
      const columns = await getTableColumns(table_name);
      report.columns.total += columns.length;

      for (const col of columns) {
        const { column_name } = col;

        if (containsThai(column_name)) {
          // Generate new English column name
          const newColumnName = generateColumnName(column_name);

          console.log(`  📝 Column: ${column_name} → ${newColumnName}`);

          operation.sql.push(
            generateRenameColumnSQL(newTableName, column_name, newColumnName)
          );
          report.columns.renamed++;
        } else {
          report.columns.skipped++;
        }
      }

      report.operations.push(operation);
      report.tables.renamed++;

      // Execute if not dry-run
      if (!dryRun) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          for (const sql of operation.sql) {
            await client.query(sql);
          }

          await client.query('COMMIT');
          console.log(`  ✅ Executed successfully`);
        } catch (error) {
          await client.query('ROLLBACK');
          console.error(`  ❌ Error: ${error.message}`);
          report.errors.push({
            type: 'sub_form',
            id,
            error: error.message
          });
          report.tables.errors++;
        } finally {
          client.release();
        }
      }

    } catch (error) {
      console.error(`❌ Error processing sub-form "${title}": ${error.message}`);
      report.errors.push({
        type: 'sub_form',
        id,
        error: error.message
      });
      report.tables.errors++;
    }
  }
}

/**
 * Generate migration SQL file
 */
function generateMigrationFile() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const filename = `migration-${timestamp}.sql`;
  const fs = require('fs');

  let sql = `-- Thai to English Table/Column Migration\n`;
  sql += `-- Generated: ${report.timestamp}\n`;
  sql += `-- Total Operations: ${report.operations.length}\n\n`;
  sql += `BEGIN;\n\n`;

  for (const op of report.operations) {
    sql += `-- ${op.type}: ${op.entity}\n`;
    sql += `-- Old: ${op.oldName} → New: ${op.newName}\n`;
    for (const statement of op.sql) {
      sql += `${statement}\n`;
    }
    sql += `\n`;
  }

  sql += `COMMIT;\n`;

  fs.writeFileSync(`backend/scripts/${filename}`, sql);
  console.log(`\n📝 Migration SQL saved to: backend/scripts/${filename}`);
}

/**
 * Print migration report
 */
function printReport() {
  console.log('\n=========================================');
  console.log('📊 MIGRATION REPORT');
  console.log('=========================================\n');

  console.log(`Mode: ${report.mode}`);
  console.log(`Timestamp: ${report.timestamp}\n`);

  console.log('Tables:');
  console.log(`  Total: ${report.tables.total}`);
  console.log(`  Renamed: ${report.tables.renamed}`);
  console.log(`  Skipped: ${report.tables.skipped}`);
  console.log(`  Errors: ${report.tables.errors}\n`);

  console.log('Columns:');
  console.log(`  Total: ${report.columns.total}`);
  console.log(`  Renamed: ${report.columns.renamed}`);
  console.log(`  Skipped: ${report.columns.skipped}`);
  console.log(`  Errors: ${report.columns.errors}\n`);

  console.log(`Total Operations: ${report.operations.length}\n`);

  if (report.errors.length > 0) {
    console.log('❌ Errors:');
    for (const err of report.errors) {
      console.log(`  - ${err.type} (${err.id}): ${err.error}`);
    }
    console.log('');
  }

  console.log('=========================================\n');
}

/**
 * Main migration function
 */
async function migrate() {
  // Check for --execute flag
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--execute');

  report.mode = dryRun ? 'DRY-RUN' : 'EXECUTE';

  console.log('=========================================');
  console.log('🔄 Thai → English Table/Column Migration');
  console.log('=========================================\n');

  console.log(`Mode: ${report.mode}`);
  if (dryRun) {
    console.log('⚠️  DRY-RUN MODE: No changes will be made');
    console.log('   Run with --execute to apply changes\n');
  } else {
    console.log('⚠️  EXECUTE MODE: Changes will be applied!');
    console.log('   Make sure you have a database backup!\n');
  }

  try {
    // Process forms
    await processForms(dryRun);

    // Process sub-forms
    await processSubForms(dryRun);

    // Generate migration SQL file (for dry-run)
    if (dryRun && report.operations.length > 0) {
      generateMigrationFile();
    }

    // Print report
    printReport();

    if (dryRun && report.operations.length > 0) {
      console.log('✅ Dry-run complete! Review the migration file and run with --execute to apply changes.\n');
    } else if (!dryRun) {
      console.log('✅ Migration complete!\n');
    } else {
      console.log('ℹ️  No Thai table/column names found. Nothing to migrate.\n');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
migrate();
