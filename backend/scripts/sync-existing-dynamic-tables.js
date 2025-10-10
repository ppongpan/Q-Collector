/**
 * Sync Existing Dynamic Tables Script
 *
 * Backfills migration records for dynamic tables created before v0.8.0.
 * Scans all form_submissions_* tables, compares with Form field definitions,
 * and creates ADD_COLUMN migration records for existing columns.
 *
 * Usage:
 *   node backend/scripts/sync-existing-dynamic-tables.js           # Execute sync
 *   node backend/scripts/sync-existing-dynamic-tables.js --dry-run # Preview only
 *
 * Features:
 * - Scans all dynamic tables (form_submissions_*)
 * - Detects existing columns vs. field definitions
 * - Creates historical migration records
 * - Reports discrepancies (missing/extra columns)
 * - Dry-run mode support
 *
 * Created: 2025-10-07
 * Sprint: 6 (DevOps - Migration Maintenance Scripts)
 */

require('dotenv').config();
const { Pool } = require('pg');
const path = require('path');

// Initialize database connections
const sequelizePath = path.join(__dirname, '..', 'models');
const { Form, Field, FieldMigration } = require(sequelizePath);

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

// System columns to exclude from sync
const SYSTEM_COLUMNS = ['id', 'created_at', 'updated_at', 'submission_id'];

// Parse command line arguments
const isDryRun = process.argv.includes('--dry-run');

/**
 * Main sync function
 */
async function syncExistingDynamicTables() {
  console.log('\n========================================');
  console.log('Sync Existing Dynamic Tables');
  console.log('========================================\n');

  if (isDryRun) {
    console.log('[DRY-RUN MODE] No changes will be made\n');
  }

  const client = await pool.connect();
  const stats = {
    tablesScanned: 0,
    columnsFound: 0,
    migrationsCreated: 0,
    missingColumns: 0,
    extraColumns: 0,
    errors: []
  };

  try {
    // Step 1: Get all forms with dynamic tables
    console.log('Step 1: Finding forms with dynamic tables...');
    const forms = await Form.findAll({
      where: {
        table_name: { [require('sequelize').Op.ne]: null }
      },
      include: [{
        model: Field,
        as: 'fields',
        required: false
      }]
    });

    console.log(`Found ${forms.length} forms with dynamic tables\n`);

    // Step 2: Process each form's table
    for (const form of forms) {
      stats.tablesScanned++;
      const tableName = form.table_name;

      console.log(`\nProcessing: ${form.title} (${tableName})`);
      console.log('-'.repeat(60));

      // Check if table exists
      const tableCheck = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      `, [tableName]);

      if (tableCheck.rows.length === 0) {
        console.log(`  Warning: Table "${tableName}" does not exist in database`);
        stats.errors.push({ form: form.title, error: 'Table not found' });
        continue;
      }

      // Get actual columns from database
      const columnsQuery = await client.query(`
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      const dbColumns = columnsQuery.rows
        .filter(col => !SYSTEM_COLUMNS.includes(col.column_name))
        .map(col => ({
          name: col.column_name,
          type: col.data_type,
          maxLength: col.character_maximum_length
        }));

      stats.columnsFound += dbColumns.length;
      console.log(`  Database columns: ${dbColumns.length}`);

      // Get field definitions from Form
      const fieldDefinitions = form.fields || [];
      console.log(`  Field definitions: ${fieldDefinitions.length}`);

      // Step 3: Match columns to fields and create migrations
      for (const dbColumn of dbColumns) {
        const matchingField = fieldDefinitions.find(
          field => field.column_name === dbColumn.name
        );

        if (matchingField) {
          // Check if migration already exists
          const existingMigration = await FieldMigration.findOne({
            where: {
              form_id: form.id,
              field_id: matchingField.id,
              migration_type: 'ADD_COLUMN',
              column_name: dbColumn.name
            }
          });

          if (!existingMigration) {
            console.log(`  + Creating migration for: ${dbColumn.name} (${dbColumn.type})`);

            if (!isDryRun) {
              await FieldMigration.create({
                field_id: matchingField.id,
                form_id: form.id,
                migration_type: 'ADD_COLUMN',
                table_name: tableName,
                column_name: dbColumn.name,
                old_value: null,
                new_value: {
                  columnName: dbColumn.name,
                  dataType: dbColumn.type,
                  backfilled: true
                },
                backup_id: null,
                executed_by: null, // System backfill
                success: true,
                error_message: null,
                rollback_sql: `ALTER TABLE "${tableName}" DROP COLUMN "${dbColumn.name}"`
              });
              stats.migrationsCreated++;
            } else {
              stats.migrationsCreated++;
            }
          } else {
            console.log(`  - Migration exists: ${dbColumn.name}`);
          }
        } else {
          // Column in DB but no matching field definition
          console.log(`  ! Extra column (no field definition): ${dbColumn.name}`);
          stats.extraColumns++;
        }
      }

      // Step 4: Check for fields without columns (missing in DB)
      for (const field of fieldDefinitions) {
        const columnExists = dbColumns.find(col => col.name === field.column_name);
        if (!columnExists) {
          console.log(`  ! Missing column (field exists): ${field.column_name}`);
          stats.missingColumns++;
        }
      }
    }

    // Step 5: Print summary
    console.log('\n========================================');
    console.log('Sync Summary');
    console.log('========================================');
    console.log(`Tables scanned:        ${stats.tablesScanned}`);
    console.log(`Columns found:         ${stats.columnsFound}`);
    console.log(`Migrations created:    ${stats.migrationsCreated}`);
    console.log(`Missing columns:       ${stats.missingColumns}`);
    console.log(`Extra columns:         ${stats.extraColumns}`);
    console.log(`Errors:                ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\nErrors:');
      stats.errors.forEach(err => {
        console.log(`  - ${err.form}: ${err.error}`);
      });
    }

    if (isDryRun) {
      console.log('\n[DRY-RUN] No changes were made. Run without --dry-run to execute.');
    } else {
      console.log('\nSync completed successfully!');
    }

    process.exit(0);

  } catch (error) {
    console.error('\nError during sync:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Execute if run directly
if (require.main === module) {
  syncExistingDynamicTables().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { syncExistingDynamicTables };
