/**
 * Validate Schema Consistency Script
 *
 * Detects schema drift between Form field definitions and actual database columns.
 * Identifies missing columns, orphaned columns, and type mismatches.
 *
 * Usage:
 *   node backend/scripts/validate-schema-consistency.js        # Report only
 *   node backend/scripts/validate-schema-consistency.js --fix  # Report + suggest fixes
 *
 * Features:
 * - Compares Field.column_name with actual table columns
 * - Detects missing columns (in Form but not in DB)
 * - Detects orphaned columns (in DB but not in Form)
 * - Detects type mismatches
 * - Generates actionable fix recommendations
 * - Summary statistics by form
 *
 * Created: 2025-10-07
 * Sprint: 6 (DevOps - Migration Maintenance Scripts)
 */

require('dotenv').config();
const { Pool } = require('pg');
const path = require('path');

// Initialize database connections
const sequelizePath = path.join(__dirname, '..', 'models');
const { Form, Field } = require(sequelizePath);

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

// System columns to exclude from validation
const SYSTEM_COLUMNS = ['id', 'created_at', 'updated_at', 'submission_id'];

// Parse command line arguments
const showFixes = process.argv.includes('--fix');

/**
 * Field type to PostgreSQL type mapping
 */
function fieldTypeToPostgres(fieldType) {
  const typeMap = {
    'short_answer': 'character varying',
    'paragraph': 'text',
    'email': 'character varying',
    'phone': 'character varying',
    'url': 'character varying',
    'number': 'numeric',
    'slider': 'integer',
    'rating': 'integer',
    'date': 'date',
    'time': 'time without time zone',
    'datetime': 'timestamp without time zone',
    'multiple_choice': 'character varying',
    'file_upload': 'text',
    'image_upload': 'text',
    'lat_long': 'jsonb',
    'province': 'character varying',
    'factory': 'character varying'
  };
  return typeMap[fieldType] || 'text';
}

/**
 * Main validation function
 */
async function validateSchemaConsistency() {
  console.log('\n========================================');
  console.log('Schema Consistency Validation');
  console.log('========================================\n');

  const client = await pool.connect();
  const allIssues = [];
  const stats = {
    formsChecked: 0,
    formsHealthy: 0,
    formsWithIssues: 0,
    missingColumns: 0,
    orphanedColumns: 0,
    typeMismatches: 0
  };

  try {
    // Get all forms with dynamic tables
    console.log('Scanning forms with dynamic tables...\n');
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

    console.log(`Found ${forms.length} forms to validate\n`);

    // Process each form
    for (const form of forms) {
      stats.formsChecked++;
      const tableName = form.table_name;
      const issues = [];

      console.log(`\nForm: ${form.title}`);
      console.log(`Table: ${tableName}`);
      console.log('-'.repeat(60));

      // Check if table exists
      const tableCheck = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      `, [tableName]);

      if (tableCheck.rows.length === 0) {
        issues.push({
          type: 'MISSING_TABLE',
          severity: 'CRITICAL',
          message: `Table "${tableName}" does not exist`,
          fix: `Create table with: CREATE TABLE "${tableName}" (id UUID PRIMARY KEY, created_at TIMESTAMP, updated_at TIMESTAMP)`
        });
        console.log('  [CRITICAL] Table does not exist!');
        stats.formsWithIssues++;
        allIssues.push({ form: form.title, issues });
        continue;
      }

      // Get actual columns from database
      const columnsQuery = await client.query(`
        SELECT column_name, data_type, character_maximum_length, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      const dbColumns = columnsQuery.rows
        .filter(col => !SYSTEM_COLUMNS.includes(col.column_name))
        .reduce((acc, col) => {
          acc[col.column_name] = {
            type: col.data_type,
            maxLength: col.character_maximum_length,
            nullable: col.is_nullable === 'YES'
          };
          return acc;
        }, {});

      const fieldDefinitions = form.fields || [];

      // Check 1: Missing columns (in Form but not in DB)
      for (const field of fieldDefinitions) {
        const columnName = field.column_name;
        if (!dbColumns[columnName]) {
          issues.push({
            type: 'MISSING_COLUMN',
            severity: 'HIGH',
            field: field.title,
            columnName: columnName,
            message: `Column "${columnName}" defined in form but missing in database`,
            fix: `ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${fieldTypeToPostgres(field.type)}`
          });
          stats.missingColumns++;
          console.log(`  [HIGH] Missing column: ${columnName} (field: "${field.title}")`);
        }
      }

      // Check 2: Orphaned columns (in DB but not in Form)
      const definedColumns = fieldDefinitions.map(f => f.column_name);
      for (const dbColumnName of Object.keys(dbColumns)) {
        if (!definedColumns.includes(dbColumnName)) {
          issues.push({
            type: 'ORPHANED_COLUMN',
            severity: 'MEDIUM',
            columnName: dbColumnName,
            message: `Column "${dbColumnName}" exists in database but has no field definition`,
            fix: `Consider removing: ALTER TABLE "${tableName}" DROP COLUMN "${dbColumnName}" (backup data first!)`
          });
          stats.orphanedColumns++;
          console.log(`  [MEDIUM] Orphaned column: ${dbColumnName}`);
        }
      }

      // Check 3: Type mismatches
      for (const field of fieldDefinitions) {
        const columnName = field.column_name;
        const dbColumn = dbColumns[columnName];

        if (dbColumn) {
          const expectedType = fieldTypeToPostgres(field.type);
          const actualType = dbColumn.type;

          // Normalize for comparison
          const normalizeType = (type) => type.toLowerCase().replace(/\(.*\)/, '').trim();

          if (normalizeType(expectedType) !== normalizeType(actualType)) {
            issues.push({
              type: 'TYPE_MISMATCH',
              severity: 'MEDIUM',
              field: field.title,
              columnName: columnName,
              expectedType: expectedType,
              actualType: actualType,
              message: `Type mismatch for "${columnName}": expected ${expectedType}, got ${actualType}`,
              fix: `ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" TYPE ${expectedType} USING "${columnName}"::${expectedType}`
            });
            stats.typeMismatches++;
            console.log(`  [MEDIUM] Type mismatch: ${columnName} (expected: ${expectedType}, got: ${actualType})`);
          }
        }
      }

      // Summary for this form
      if (issues.length === 0) {
        console.log('  [OK] Schema is consistent');
        stats.formsHealthy++;
      } else {
        console.log(`  Total issues: ${issues.length}`);
        stats.formsWithIssues++;
        allIssues.push({ form: form.title, tableName, formId: form.id, issues });
      }
    }

    // Print overall summary
    console.log('\n========================================');
    console.log('Validation Summary');
    console.log('========================================');
    console.log(`Forms checked:         ${stats.formsChecked}`);
    console.log(`Forms healthy:         ${stats.formsHealthy}`);
    console.log(`Forms with issues:     ${stats.formsWithIssues}`);
    console.log(`Missing columns:       ${stats.missingColumns}`);
    console.log(`Orphaned columns:      ${stats.orphanedColumns}`);
    console.log(`Type mismatches:       ${stats.typeMismatches}`);

    // Print fix recommendations
    if (showFixes && allIssues.length > 0) {
      console.log('\n========================================');
      console.log('Fix Recommendations');
      console.log('========================================\n');

      for (const { form, tableName, issues } of allIssues) {
        console.log(`Form: ${form} (${tableName})`);
        console.log('-'.repeat(60));

        issues.forEach((issue, idx) => {
          console.log(`${idx + 1}. [${issue.severity}] ${issue.message}`);
          if (issue.fix) {
            console.log(`   Fix: ${issue.fix}\n`);
          }
        });
        console.log('');
      }
    } else if (allIssues.length > 0) {
      console.log('\nRun with --fix flag to see fix recommendations');
    }

    // Exit code based on issues found
    if (stats.formsWithIssues > 0) {
      console.log('\nValidation completed with issues found.');
      process.exit(2); // Exit code 2 for warnings
    } else {
      console.log('\nAll schemas are consistent!');
      process.exit(0);
    }

  } catch (error) {
    console.error('\nError during validation:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Execute if run directly
if (require.main === module) {
  validateSchemaConsistency().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { validateSchemaConsistency };
