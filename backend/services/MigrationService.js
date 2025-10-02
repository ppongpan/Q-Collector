/**
 * MigrationService - Database Schema Migration
 *
 * Handles migration from old schema to new Thai→English translated schema.
 * Provides safe migration with backup, validation, and rollback capabilities.
 *
 * @version 0.7.0
 * @since 2025-10-02
 */

const SchemaGenerator = require('./SchemaGenerator');
const SQLNameNormalizer = require('./SQLNameNormalizer');
const TranslationService = require('./TranslationService');

/**
 * Migration status types
 */
const MIGRATION_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  ROLLED_BACK: 'rolled_back'
};

class MigrationService {
  /**
   * Generate migration plan from form definition
   *
   * @param {Object} formDefinition - Form definition
   * @param {Object} currentSchema - Current database schema (optional)
   * @param {Object} options - Migration options
   * @returns {Object} Migration plan
   */
  static generateMigrationPlan(formDefinition, currentSchema = null, options = {}) {
    const {
      tablePrefix = 'form_',
      dropOldTables = false,
      preserveData = true
    } = options;

    // Generate new schema
    const newSchema = SchemaGenerator.generateSchema(formDefinition, {
      tablePrefix,
      includeMetadata: true,
      includeIndexes: true
    });

    const plan = {
      formId: formDefinition.id,
      formName: formDefinition.name,
      status: MIGRATION_STATUS.PENDING,
      createdAt: new Date().toISOString(),
      steps: [],
      newSchema,
      currentSchema,
      rollbackSteps: []
    };

    // Step 1: Backup existing data
    if (preserveData && currentSchema) {
      plan.steps.push({
        order: 1,
        type: 'backup',
        description: 'Backup existing data',
        action: 'CREATE_BACKUP',
        tables: currentSchema.tables || []
      });
    }

    // Step 2: Create new tables
    plan.steps.push({
      order: 2,
      type: 'create_tables',
      description: 'Create new schema tables',
      action: 'CREATE_NEW_TABLES',
      sql: [
        newSchema.mainTable.createStatement,
        ...newSchema.subTables.map(st => st.createStatement)
      ]
    });

    // Step 3: Create indexes
    plan.steps.push({
      order: 3,
      type: 'create_indexes',
      description: 'Create indexes for performance',
      action: 'CREATE_INDEXES',
      sql: newSchema.indexes
    });

    // Step 4: Migrate data (if preserving)
    if (preserveData && currentSchema) {
      plan.steps.push({
        order: 4,
        type: 'migrate_data',
        description: 'Migrate data from old schema to new',
        action: 'DATA_MIGRATION',
        migrations: this.generateDataMigrationSteps(currentSchema, newSchema)
      });
    }

    // Step 5: Verify migration
    plan.steps.push({
      order: 5,
      type: 'verify',
      description: 'Verify migration success',
      action: 'VERIFY_DATA',
      checks: [
        'row_counts_match',
        'data_integrity',
        'foreign_key_constraints'
      ]
    });

    // Step 6: Drop old tables (optional)
    if (dropOldTables && currentSchema) {
      plan.steps.push({
        order: 6,
        type: 'cleanup',
        description: 'Drop old schema tables',
        action: 'DROP_OLD_TABLES',
        sql: currentSchema.tables?.map(table =>
          SchemaGenerator.buildDropTableStatement(table, true)
        ) || []
      });
    }

    // Generate rollback steps
    plan.rollbackSteps = this.generateRollbackSteps(plan.steps);

    return plan;
  }

  /**
   * Generate data migration steps
   *
   * @param {Object} oldSchema - Old schema structure
   * @param {Object} newSchema - New schema structure
   * @returns {Array<Object>} Data migration steps
   */
  static generateDataMigrationSteps(oldSchema, newSchema) {
    const migrations = [];

    // Main table migration
    if (oldSchema.mainTable && newSchema.mainTable) {
      migrations.push({
        type: 'main_table',
        sourceTable: oldSchema.mainTable.tableName,
        targetTable: newSchema.mainTable.tableName,
        columnMapping: this.mapColumns(
          oldSchema.mainTable.columns,
          newSchema.mainTable.columns
        ),
        sql: this.generateInsertStatement(
          oldSchema.mainTable.tableName,
          newSchema.mainTable.tableName,
          this.mapColumns(
            oldSchema.mainTable.columns,
            newSchema.mainTable.columns
          )
        )
      });
    }

    // Sub-table migrations
    if (oldSchema.subTables && newSchema.subTables) {
      oldSchema.subTables.forEach((oldSubTable, index) => {
        const newSubTable = newSchema.subTables[index];
        if (newSubTable) {
          migrations.push({
            type: 'sub_table',
            sourceTable: oldSubTable.tableName,
            targetTable: newSubTable.tableName,
            columnMapping: this.mapColumns(
              oldSubTable.columns,
              newSubTable.columns
            ),
            sql: this.generateInsertStatement(
              oldSubTable.tableName,
              newSubTable.tableName,
              this.mapColumns(
                oldSubTable.columns,
                newSubTable.columns
              )
            )
          });
        }
      });
    }

    return migrations;
  }

  /**
   * Map columns from old schema to new schema
   *
   * @param {Array<Object>} oldColumns - Old schema columns
   * @param {Array<Object>} newColumns - New schema columns
   * @returns {Array<Object>} Column mappings
   */
  static mapColumns(oldColumns, newColumns) {
    const mappings = [];

    newColumns.forEach(newCol => {
      // Try to find matching old column
      let oldCol = null;

      // Match by original label
      if (newCol.originalLabel) {
        oldCol = oldColumns.find(oc =>
          oc.originalLabel === newCol.originalLabel ||
          oc.name === newCol.originalLabel
        );
      }

      // Match by name translation
      if (!oldCol && newCol.name) {
        oldCol = oldColumns.find(oc => {
          const translatedName = TranslationService.translate(oc.originalLabel || oc.name);
          return translatedName === newCol.name;
        });
      }

      // Match system columns
      if (!oldCol) {
        oldCol = oldColumns.find(oc => oc.name === newCol.name);
      }

      if (oldCol) {
        mappings.push({
          oldColumn: oldCol.name,
          newColumn: newCol.name,
          dataType: newCol.type,
          transformation: this.getDataTransformation(oldCol.type, newCol.type)
        });
      }
    });

    return mappings;
  }

  /**
   * Get data transformation function if types differ
   *
   * @param {string} oldType - Old data type
   * @param {string} newType - New data type
   * @returns {string|null} SQL transformation expression
   */
  static getDataTransformation(oldType, newType) {
    // If types are the same, no transformation needed
    if (oldType === newType) {
      return null;
    }

    // Add transformation logic for type conversions
    // Example: TEXT to INTEGER, DATE formatting, etc.
    const transformations = {
      'TEXT_to_INTEGER': '::INTEGER',
      'TEXT_to_DECIMAL': '::DECIMAL',
      'VARCHAR_to_TEXT': '::TEXT',
      'INTEGER_to_VARCHAR': '::VARCHAR'
    };

    const key = `${oldType.split('(')[0]}_to_${newType.split('(')[0]}`;
    return transformations[key] || null;
  }

  /**
   * Generate INSERT INTO SELECT statement for data migration
   *
   * @param {string} sourceTable - Source table name
   * @param {string} targetTable - Target table name
   * @param {Array<Object>} columnMappings - Column mappings
   * @returns {string} SQL INSERT statement
   */
  static generateInsertStatement(sourceTable, targetTable, columnMappings) {
    const targetColumns = columnMappings.map(m => m.newColumn);
    const sourceColumns = columnMappings.map(m => {
      const col = m.oldColumn;
      const transform = m.transformation;
      return transform ? `${col}${transform}` : col;
    });

    return `
INSERT INTO ${targetTable} (${targetColumns.join(', ')})
SELECT ${sourceColumns.join(', ')}
FROM ${sourceTable};
    `.trim();
  }

  /**
   * Generate rollback steps for migration plan
   *
   * @param {Array<Object>} steps - Migration steps
   * @returns {Array<Object>} Rollback steps
   */
  static generateRollbackSteps(steps) {
    const rollback = [];

    // Reverse order of steps
    const reversedSteps = [...steps].reverse();

    reversedSteps.forEach(step => {
      switch (step.type) {
        case 'create_tables':
          rollback.push({
            type: 'drop_tables',
            description: 'Drop newly created tables',
            action: 'DROP_NEW_TABLES',
            sql: step.sql.map(createStmt => {
              const tableName = this.extractTableName(createStmt);
              return SchemaGenerator.buildDropTableStatement(tableName, true);
            })
          });
          break;

        case 'create_indexes':
          rollback.push({
            type: 'drop_indexes',
            description: 'Drop newly created indexes',
            action: 'DROP_INDEXES',
            sql: step.sql.map(indexStmt => {
              const indexName = this.extractIndexName(indexStmt);
              return `DROP INDEX IF EXISTS ${indexName};`;
            })
          });
          break;

        case 'migrate_data':
          rollback.push({
            type: 'restore_backup',
            description: 'Restore data from backup',
            action: 'RESTORE_BACKUP'
          });
          break;

        case 'cleanup':
          rollback.push({
            type: 'restore_old_tables',
            description: 'Restore old tables from backup',
            action: 'RESTORE_OLD_SCHEMA'
          });
          break;
      }
    });

    return rollback;
  }

  /**
   * Extract table name from CREATE TABLE statement
   *
   * @param {string} createStmt - CREATE TABLE SQL statement
   * @returns {string} Table name
   */
  static extractTableName(createStmt) {
    const match = createStmt.match(/CREATE TABLE IF NOT EXISTS\s+(\w+)/i);
    return match ? match[1] : null;
  }

  /**
   * Extract index name from CREATE INDEX statement
   *
   * @param {string} indexStmt - CREATE INDEX SQL statement
   * @returns {string} Index name
   */
  static extractIndexName(indexStmt) {
    const match = indexStmt.match(/CREATE INDEX IF NOT EXISTS\s+(\w+)/i);
    return match ? match[1] : null;
  }

  /**
   * Generate migration summary
   *
   * @param {Object} plan - Migration plan
   * @returns {Object} Migration summary
   */
  static generateSummary(plan) {
    return {
      formId: plan.formId,
      formName: plan.formName,
      status: plan.status,
      totalSteps: plan.steps.length,
      tablesCreated: 1 + (plan.newSchema.subTables?.length || 0),
      indexesCreated: plan.newSchema.indexes?.length || 0,
      dataPreserved: plan.steps.some(s => s.type === 'migrate_data'),
      hasRollback: plan.rollbackSteps.length > 0,
      estimatedDuration: this.estimateMigrationDuration(plan)
    };
  }

  /**
   * Estimate migration duration based on plan complexity
   *
   * @param {Object} plan - Migration plan
   * @returns {string} Estimated duration
   */
  static estimateMigrationDuration(plan) {
    const stepCount = plan.steps.length;
    const tableCount = 1 + (plan.newSchema.subTables?.length || 0);

    // Simple estimation: 1 second per step + 2 seconds per table
    const seconds = stepCount + (tableCount * 2);

    if (seconds < 60) {
      return `~${seconds} seconds`;
    } else if (seconds < 3600) {
      return `~${Math.ceil(seconds / 60)} minutes`;
    } else {
      return `~${Math.ceil(seconds / 3600)} hours`;
    }
  }

  /**
   * Validate migration plan
   *
   * @param {Object} plan - Migration plan
   * @returns {Object} Validation result
   */
  static validatePlan(plan) {
    const errors = [];
    const warnings = [];

    // Check required fields
    if (!plan.newSchema) {
      errors.push('Missing new schema definition');
    }

    if (!plan.steps || plan.steps.length === 0) {
      errors.push('No migration steps defined');
    }

    // Check for data migration step if preserving data
    const hasBackup = plan.steps.some(s => s.type === 'backup');
    const hasMigration = plan.steps.some(s => s.type === 'migrate_data');

    if (hasBackup && !hasMigration) {
      warnings.push('Backup created but no data migration step found');
    }

    // Check for verification step
    const hasVerification = plan.steps.some(s => s.type === 'verify');
    if (!hasVerification) {
      warnings.push('No verification step - migration success cannot be confirmed');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get migration status enum
   *
   * @returns {Object} Migration status types
   */
  static getMigrationStatus() {
    return { ...MIGRATION_STATUS };
  }
}

module.exports = MigrationService;
