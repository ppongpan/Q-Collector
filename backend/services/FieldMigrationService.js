/**
 * FieldMigrationService
 *
 * Core migration execution engine for Q-Collector Field Migration System v0.8.0
 * Manages safe ALTER TABLE operations on dynamic tables with transaction safety,
 * data backups, and rollback capabilities.
 *
 * Features:
 * - Transaction-safe schema migrations
 * - Automatic data backups before destructive operations
 * - Type conversion validation
 * - Rollback SQL generation
 * - Preview mode (dry-run)
 *
 * Created: 2025-10-07
 * Sprint: 2 (Service Layer - Field Migration System v0.8.0)
 */

const { Pool } = require('pg');
const { sequelize } = require('../models');
const { FieldMigration, FieldDataBackup, Field, Form } = require('../models');
const logger = require('../utils/logger.util');

class FieldMigrationService {
  constructor() {
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'qcollector_db',
      user: process.env.POSTGRES_USER || 'qcollector',
      password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
    });
  }

  /**
   * Add column to dynamic table
   *
   * @param {string} tableName - Target table name
   * @param {string} fieldId - Field UUID
   * @param {string} columnName - Column name to add
   * @param {string} dataType - PostgreSQL data type or Q-Collector field type
   * @param {Object} options - Additional options
   * @param {string} options.userId - User executing migration
   * @param {string} options.formId - Form ID
   * @returns {Promise<Object>} Migration record
   */
  async addColumn(tableName, fieldId, columnName, dataType, options = {}) {
    const { userId = null, formId = null } = options;
    const transaction = await sequelize.transaction();
    const client = await this.pool.connect();

    try {
      // Convert field type to PostgreSQL type if needed
      const pgType = this._isQCollectorFieldType(dataType)
        ? this._fieldTypeToPostgres(dataType)
        : dataType;

      logger.info(`Adding column "${columnName}" (${pgType}) to table "${tableName}"`);

      // Execute ALTER TABLE ADD COLUMN
      const addColumnSQL = `ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${pgType}`;
      await client.query(addColumnSQL);

      // Generate rollback SQL
      const rollbackSQL = `ALTER TABLE "${tableName}" DROP COLUMN "${columnName}"`;

      // Record successful migration
      const migration = await FieldMigration.create({
        field_id: fieldId,
        form_id: formId,
        migration_type: 'ADD_COLUMN',
        table_name: tableName,
        column_name: columnName,
        old_value: null,
        new_value: { columnName, dataType: pgType },
        backup_id: null,
        executed_by: userId,
        success: true,
        error_message: null,
        rollback_sql: rollbackSQL
      }, { transaction });

      await transaction.commit();

      logger.info(`Successfully added column "${columnName}" to "${tableName}" (migration ${migration.id})`);

      return migration;

    } catch (error) {
      await transaction.rollback();
      logger.error(`Failed to add column "${columnName}" to "${tableName}": ${error.message}`);

      // Record failed migration
      try {
        await FieldMigration.create({
          field_id: fieldId,
          form_id: formId,
          migration_type: 'ADD_COLUMN',
          table_name: tableName,
          column_name: columnName,
          old_value: null,
          new_value: { columnName, dataType },
          backup_id: null,
          executed_by: userId,
          success: false,
          error_message: error.message,
          rollback_sql: null
        });
      } catch (recordError) {
        logger.error(`Failed to record migration failure: ${recordError.message}`);
      }

      throw new Error(`Failed to add column "${columnName}" to table "${tableName}": ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Drop column from dynamic table with optional backup
   *
   * @param {string} tableName - Target table name
   * @param {string} fieldId - Field UUID
   * @param {string} columnName - Column name to drop
   * @param {Object} options - Additional options
   * @param {boolean} options.backup - Create backup before dropping (default: true)
   * @param {string} options.userId - User executing migration
   * @param {string} options.formId - Form ID
   * @returns {Promise<Object>} Migration record
   */
  async dropColumn(tableName, fieldId, columnName, options = {}) {
    const { backup = true, userId = null, formId = null } = options;
    const transaction = await sequelize.transaction();
    const client = await this.pool.connect();
    let backupId = null;

    try {
      logger.info(`Dropping column "${columnName}" from table "${tableName}" (backup: ${backup})`);

      // Backup data if requested
      if (backup) {
        logger.info(`Backing up data for column "${columnName}" before drop`);
        const backupRecord = await this.backupColumnData(
          tableName,
          columnName,
          'AUTO_DELETE',
          { userId, formId, transaction }
        );
        backupId = backupRecord.id;
        logger.info(`Created backup ${backupId} with ${backupRecord.getRecordCount()} records`);
      }

      // Get column data type for rollback SQL
      const columnInfoQuery = `
        SELECT data_type, character_maximum_length, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = $2
      `;
      const columnInfo = await client.query(columnInfoQuery, [tableName, columnName]);

      let columnDataType = 'TEXT';
      if (columnInfo.rows.length > 0) {
        const col = columnInfo.rows[0];
        columnDataType = col.data_type;
        if (col.character_maximum_length) {
          columnDataType += `(${col.character_maximum_length})`;
        }
      }

      // Execute DROP COLUMN
      const dropColumnSQL = `ALTER TABLE "${tableName}" DROP COLUMN "${columnName}"`;
      await client.query(dropColumnSQL);

      // Generate rollback SQL
      const rollbackSQL = `ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${columnDataType}`;

      // Record successful migration
      const migration = await FieldMigration.create({
        field_id: fieldId,
        form_id: formId,
        migration_type: 'DROP_COLUMN',
        table_name: tableName,
        column_name: columnName,
        old_value: { columnName, dataType: columnDataType },
        new_value: null,
        backup_id: backupId,
        executed_by: userId,
        success: true,
        error_message: null,
        rollback_sql: rollbackSQL
      }, { transaction });

      await transaction.commit();

      logger.info(`Successfully dropped column "${columnName}" from "${tableName}" (migration ${migration.id})`);

      return migration;

    } catch (error) {
      await transaction.rollback();
      logger.error(`Failed to drop column "${columnName}" from "${tableName}": ${error.message}`);

      // Record failed migration
      try {
        await FieldMigration.create({
          field_id: fieldId,
          form_id: formId,
          migration_type: 'DROP_COLUMN',
          table_name: tableName,
          column_name: columnName,
          old_value: { columnName },
          new_value: null,
          backup_id: backupId,
          executed_by: userId,
          success: false,
          error_message: error.message,
          rollback_sql: null
        });
      } catch (recordError) {
        logger.error(`Failed to record migration failure: ${recordError.message}`);
      }

      throw new Error(`Failed to drop column "${columnName}" from table "${tableName}": ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Rename column in dynamic table
   *
   * @param {string} tableName - Target table name
   * @param {string} fieldId - Field UUID
   * @param {string} oldName - Current column name
   * @param {string} newName - New column name
   * @param {Object} options - Additional options
   * @param {string} options.userId - User executing migration
   * @param {string} options.formId - Form ID
   * @returns {Promise<Object>} Migration record
   */
  async renameColumn(tableName, fieldId, oldName, newName, options = {}) {
    const { userId = null, formId = null } = options;
    const transaction = await sequelize.transaction();
    const client = await this.pool.connect();

    try {
      logger.info(`Renaming column "${oldName}" to "${newName}" in table "${tableName}"`);

      // Execute RENAME COLUMN
      const renameColumnSQL = `ALTER TABLE "${tableName}" RENAME COLUMN "${oldName}" TO "${newName}"`;
      await client.query(renameColumnSQL);

      // Generate rollback SQL
      const rollbackSQL = `ALTER TABLE "${tableName}" RENAME COLUMN "${newName}" TO "${oldName}"`;

      // Record successful migration
      const migration = await FieldMigration.create({
        field_id: fieldId,
        form_id: formId,
        migration_type: 'RENAME_COLUMN',
        table_name: tableName,
        column_name: newName, // Store new name as current column
        old_value: { columnName: oldName },
        new_value: { columnName: newName },
        backup_id: null,
        executed_by: userId,
        success: true,
        error_message: null,
        rollback_sql: rollbackSQL
      }, { transaction });

      await transaction.commit();

      logger.info(`Successfully renamed column "${oldName}" to "${newName}" in "${tableName}" (migration ${migration.id})`);

      return migration;

    } catch (error) {
      await transaction.rollback();
      logger.error(`Failed to rename column "${oldName}" to "${newName}" in "${tableName}": ${error.message}`);

      // Record failed migration
      try {
        await FieldMigration.create({
          field_id: fieldId,
          form_id: formId,
          migration_type: 'RENAME_COLUMN',
          table_name: tableName,
          column_name: oldName,
          old_value: { columnName: oldName },
          new_value: { columnName: newName },
          backup_id: null,
          executed_by: userId,
          success: false,
          error_message: error.message,
          rollback_sql: null
        });
      } catch (recordError) {
        logger.error(`Failed to record migration failure: ${recordError.message}`);
      }

      throw new Error(`Failed to rename column "${oldName}" to "${newName}" in table "${tableName}": ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Migrate column type with validation and backup
   *
   * @param {string} tableName - Target table name
   * @param {string} fieldId - Field UUID
   * @param {string} columnName - Column name
   * @param {string} oldType - Current data type
   * @param {string} newType - Target data type
   * @param {Object} options - Additional options
   * @param {string} options.userId - User executing migration
   * @param {string} options.formId - Form ID
   * @returns {Promise<Object>} Migration record
   */
  async migrateColumnType(tableName, fieldId, columnName, oldType, newType, options = {}) {
    const { userId = null, formId = null } = options;
    const transaction = await sequelize.transaction();
    const client = await this.pool.connect();
    let backupId = null;

    try {
      logger.info(`Migrating column "${columnName}" from ${oldType} to ${newType} in table "${tableName}"`);

      // Convert Q-Collector field types to PostgreSQL types
      const pgOldType = this._isQCollectorFieldType(oldType)
        ? this._fieldTypeToPostgres(oldType)
        : oldType;
      const pgNewType = this._isQCollectorFieldType(newType)
        ? this._fieldTypeToPostgres(newType)
        : newType;

      // Validate type conversion is safe
      const validation = await this._validateTypeConversion(tableName, columnName, pgOldType, pgNewType, client);

      if (!validation.valid) {
        throw new Error(`Type conversion validation failed: ${validation.reason}. Invalid rows: ${validation.invalidCount}`);
      }

      if (validation.warnings.length > 0) {
        logger.warn(`Type conversion warnings for "${columnName}": ${validation.warnings.join(', ')}`);
      }

      // Backup data before type change
      logger.info(`Backing up data for column "${columnName}" before type change`);
      const backupRecord = await this.backupColumnData(
        tableName,
        columnName,
        'AUTO_MODIFY',
        { userId, formId, transaction }
      );
      backupId = backupRecord.id;
      logger.info(`Created backup ${backupId} with ${backupRecord.getRecordCount()} records`);

      // Execute ALTER COLUMN TYPE with USING clause for safe conversion
      const alterTypeSQL = `ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" TYPE ${pgNewType} USING "${columnName}"::${pgNewType}`;
      await client.query(alterTypeSQL);

      // Generate rollback SQL
      const rollbackSQL = `ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" TYPE ${pgOldType} USING "${columnName}"::${pgOldType}`;

      // Record successful migration
      const migration = await FieldMigration.create({
        field_id: fieldId,
        form_id: formId,
        migration_type: 'MODIFY_COLUMN',
        table_name: tableName,
        column_name: columnName,
        old_value: { columnName, dataType: pgOldType },
        new_value: { columnName, dataType: pgNewType },
        backup_id: backupId,
        executed_by: userId,
        success: true,
        error_message: null,
        rollback_sql: rollbackSQL
      }, { transaction });

      await transaction.commit();

      logger.info(`Successfully migrated column "${columnName}" to ${pgNewType} in "${tableName}" (migration ${migration.id})`);

      return migration;

    } catch (error) {
      await transaction.rollback();
      logger.error(`Failed to migrate column "${columnName}" type in "${tableName}": ${error.message}`);

      // Record failed migration
      try {
        await FieldMigration.create({
          field_id: fieldId,
          form_id: formId,
          migration_type: 'MODIFY_COLUMN',
          table_name: tableName,
          column_name: columnName,
          old_value: { columnName, dataType: oldType },
          new_value: { columnName, dataType: newType },
          backup_id: backupId,
          executed_by: userId,
          success: false,
          error_message: error.message,
          rollback_sql: null
        });
      } catch (recordError) {
        logger.error(`Failed to record migration failure: ${recordError.message}`);
      }

      throw new Error(`Failed to migrate column "${columnName}" type in table "${tableName}": ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Backup column data before destructive operation
   *
   * @param {string} tableName - Target table name
   * @param {string} columnName - Column name to backup
   * @param {string} backupType - Backup type (AUTO_DELETE, AUTO_MODIFY, MANUAL)
   * @param {Object} options - Additional options
   * @param {string} options.userId - User creating backup
   * @param {string} options.formId - Form ID
   * @param {Object} options.transaction - Sequelize transaction (optional)
   * @returns {Promise<Object>} FieldDataBackup record
   */
  async backupColumnData(tableName, columnName, backupType = 'MANUAL', options = {}) {
    const { userId = null, formId = null, transaction = null } = options;
    const client = await this.pool.connect();

    try {
      logger.info(`Creating backup for column "${columnName}" in table "${tableName}" (type: ${backupType})`);

      // Query all data from the column
      const dataQuery = `SELECT id, "${columnName}" as value FROM "${tableName}" ORDER BY id`;
      const result = await client.query(dataQuery);

      // Build data snapshot array
      const dataSnapshot = result.rows.map(row => ({
        id: row.id,
        value: row.value
      }));

      logger.info(`Captured ${dataSnapshot.length} records for backup`);

      // Calculate retention_until (90 days from now, handled by model hook)
      const retentionUntil = new Date();
      retentionUntil.setDate(retentionUntil.getDate() + 90);

      // Create backup record
      const backup = await FieldDataBackup.create({
        field_id: null, // Will be set by caller if available
        form_id: formId,
        table_name: tableName,
        column_name: columnName,
        data_snapshot: dataSnapshot,
        backup_type: backupType,
        retention_until: retentionUntil,
        created_by: userId
      }, { transaction });

      logger.info(`Created backup ${backup.id} (expires: ${retentionUntil.toISOString()})`);

      return backup;

    } catch (error) {
      logger.error(`Failed to backup column "${columnName}" in "${tableName}": ${error.message}`);
      throw new Error(`Failed to backup column data: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Restore backed up data to table
   *
   * @param {string} backupId - Backup record UUID
   * @param {Object} options - Additional options
   * @param {string} options.userId - User executing restore
   * @returns {Promise<Object>} Result object with count of restored records
   */
  async restoreColumnData(backupId, options = {}) {
    const { userId = null } = options;
    const transaction = await sequelize.transaction();
    const client = await this.pool.connect();

    try {
      logger.info(`Restoring data from backup ${backupId}`);

      // Load backup record
      const backup = await FieldDataBackup.findByPk(backupId);

      if (!backup) {
        throw new Error(`Backup ${backupId} not found`);
      }

      if (backup.isExpired()) {
        throw new Error(`Backup ${backupId} has expired (retention period ended)`);
      }

      const { table_name: tableName, column_name: columnName, data_snapshot: dataSnapshot } = backup;

      if (!dataSnapshot || dataSnapshot.length === 0) {
        logger.warn(`Backup ${backupId} has no data to restore`);
        return { success: true, message: 'No data to restore', count: 0 };
      }

      logger.info(`Restoring ${dataSnapshot.length} records to "${tableName}"."${columnName}"`);

      // Verify table and column exist
      const columnCheckQuery = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = $2
      `;
      const columnCheck = await client.query(columnCheckQuery, [tableName, columnName]);

      if (columnCheck.rows.length === 0) {
        throw new Error(`Column "${columnName}" does not exist in table "${tableName}". Please recreate the column first.`);
      }

      // Restore data in batches (100 rows per batch for performance)
      const batchSize = 100;
      let restoredCount = 0;

      for (let i = 0; i < dataSnapshot.length; i += batchSize) {
        const batch = dataSnapshot.slice(i, i + batchSize);

        // Build CASE statement for batch update
        const cases = batch.map(row => {
          // Escape single quotes in value
          const escapedValue = row.value !== null && row.value !== undefined
            ? String(row.value).replace(/'/g, "''")
            : null;

          if (escapedValue === null) {
            return `WHEN id = '${row.id}' THEN NULL`;
          }
          return `WHEN id = '${row.id}' THEN '${escapedValue}'`;
        }).join('\n          ');

        const ids = batch.map(row => `'${row.id}'`).join(', ');

        const updateSQL = `
          UPDATE "${tableName}"
          SET "${columnName}" = CASE
            ${cases}
          END
          WHERE id IN (${ids})
        `;

        const result = await client.query(updateSQL);
        restoredCount += result.rowCount;
      }

      // Record restore as new migration
      await FieldMigration.create({
        field_id: backup.field_id,
        form_id: backup.form_id,
        migration_type: 'MODIFY_COLUMN', // Restore is a type of modification
        table_name: tableName,
        column_name: columnName,
        old_value: null,
        new_value: { action: 'RESTORE_DATA', backupId },
        backup_id: backupId,
        executed_by: userId,
        success: true,
        error_message: null,
        rollback_sql: null
      }, { transaction });

      await transaction.commit();

      logger.info(`Successfully restored ${restoredCount} records from backup ${backupId}`);

      return {
        success: true,
        message: `Restored ${restoredCount} records`,
        count: restoredCount,
        tableName,
        columnName
      };

    } catch (error) {
      await transaction.rollback();
      logger.error(`Failed to restore backup ${backupId}: ${error.message}`);
      throw new Error(`Failed to restore backup: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Preview migration without executing (dry-run)
   *
   * @param {string} migrationType - Migration type (ADD_COLUMN, DROP_COLUMN, etc.)
   * @param {string} tableName - Target table name
   * @param {string} columnName - Column name
   * @param {Object} params - Migration parameters
   * @returns {Promise<Object>} Preview object with SQL, validation, and warnings
   */
  async previewMigration(migrationType, tableName, columnName, params = {}) {
    const client = await this.pool.connect();

    try {
      logger.info(`Previewing ${migrationType} for column "${columnName}" in table "${tableName}"`);

      const preview = {
        migrationType,
        tableName,
        columnName,
        sql: '',
        rollbackSQL: '',
        valid: true,
        warnings: [],
        estimatedRows: 0,
        requiresBackup: false,
        backupSize: 0
      };

      // Get row count for the table
      const countQuery = `SELECT COUNT(*) as count FROM "${tableName}"`;
      const countResult = await client.query(countQuery);
      preview.estimatedRows = parseInt(countResult.rows[0].count, 10);

      switch (migrationType) {
        case 'ADD_COLUMN': {
          const { dataType } = params;
          const pgType = this._isQCollectorFieldType(dataType)
            ? this._fieldTypeToPostgres(dataType)
            : dataType;

          preview.sql = `ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${pgType}`;
          preview.rollbackSQL = `ALTER TABLE "${tableName}" DROP COLUMN "${columnName}"`;
          preview.requiresBackup = false;

          // Check if column already exists
          const columnCheck = await client.query(
            `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
            [tableName, columnName]
          );

          if (columnCheck.rows.length > 0) {
            preview.valid = false;
            preview.warnings.push(`Column "${columnName}" already exists`);
          }
          break;
        }

        case 'DROP_COLUMN': {
          preview.sql = `ALTER TABLE "${tableName}" DROP COLUMN "${columnName}"`;
          preview.requiresBackup = true;
          preview.backupSize = preview.estimatedRows;

          // Get column data type for rollback
          const columnInfo = await client.query(
            `SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
            [tableName, columnName]
          );

          if (columnInfo.rows.length === 0) {
            preview.valid = false;
            preview.warnings.push(`Column "${columnName}" does not exist`);
          } else {
            const dataType = columnInfo.rows[0].data_type;
            preview.rollbackSQL = `ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${dataType}`;
            preview.warnings.push('This operation will permanently delete column data unless backup is enabled');
          }
          break;
        }

        case 'RENAME_COLUMN': {
          const { newName } = params;
          preview.sql = `ALTER TABLE "${tableName}" RENAME COLUMN "${columnName}" TO "${newName}"`;
          preview.rollbackSQL = `ALTER TABLE "${tableName}" RENAME COLUMN "${newName}" TO "${columnName}"`;
          preview.requiresBackup = false;

          // Check if old column exists
          const oldColumnCheck = await client.query(
            `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
            [tableName, columnName]
          );

          if (oldColumnCheck.rows.length === 0) {
            preview.valid = false;
            preview.warnings.push(`Column "${columnName}" does not exist`);
          }

          // Check if new column name already exists
          const newColumnCheck = await client.query(
            `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
            [tableName, newName]
          );

          if (newColumnCheck.rows.length > 0) {
            preview.valid = false;
            preview.warnings.push(`Column "${newName}" already exists`);
          }
          break;
        }

        case 'MODIFY_COLUMN': {
          const { oldType, newType } = params;
          const pgOldType = this._isQCollectorFieldType(oldType)
            ? this._fieldTypeToPostgres(oldType)
            : oldType;
          const pgNewType = this._isQCollectorFieldType(newType)
            ? this._fieldTypeToPostgres(newType)
            : newType;

          preview.sql = `ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" TYPE ${pgNewType} USING "${columnName}"::${pgNewType}`;
          preview.rollbackSQL = `ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" TYPE ${pgOldType} USING "${columnName}"::${pgOldType}`;
          preview.requiresBackup = true;
          preview.backupSize = preview.estimatedRows;

          // Validate type conversion
          const validation = await this._validateTypeConversion(tableName, columnName, pgOldType, pgNewType, client);
          preview.valid = validation.valid;
          preview.warnings = validation.warnings;

          if (!validation.valid) {
            preview.warnings.push(`Type conversion failed: ${validation.reason}`);
            preview.warnings.push(`Invalid rows: ${validation.invalidCount}`);
          }
          break;
        }

        default:
          preview.valid = false;
          preview.warnings.push(`Unknown migration type: ${migrationType}`);
      }

      logger.info(`Preview complete: valid=${preview.valid}, warnings=${preview.warnings.length}`);

      return preview;

    } catch (error) {
      logger.error(`Failed to preview migration: ${error.message}`);
      throw new Error(`Failed to preview migration: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Helper: Check if type is Q-Collector field type
   * @private
   */
  _isQCollectorFieldType(type) {
    const fieldTypes = [
      'short_answer', 'paragraph', 'email', 'phone', 'number', 'url',
      'file_upload', 'image_upload', 'date', 'time', 'datetime',
      'multiple_choice', 'rating', 'slider', 'lat_long', 'province', 'factory'
    ];
    return fieldTypes.includes(type);
  }

  /**
   * Helper: Convert Q-Collector field type to PostgreSQL type
   * @private
   */
  _fieldTypeToPostgres(fieldType) {
    const typeMap = {
      // Text types
      'short_answer': 'VARCHAR(255)',
      'paragraph': 'TEXT',
      'email': 'VARCHAR(255)',
      'phone': 'VARCHAR(20)',
      'url': 'VARCHAR(500)',

      // Number types
      'number': 'NUMERIC',
      'slider': 'INTEGER',
      'rating': 'INTEGER',

      // Date/Time types
      'date': 'DATE',
      'time': 'TIME',
      'datetime': 'TIMESTAMP',

      // Selection types
      'multiple_choice': 'VARCHAR(255)',

      // File types (store MinIO paths)
      'file_upload': 'TEXT',
      'image_upload': 'TEXT',

      // Location types
      'lat_long': 'JSONB', // Store as {lat: number, lng: number}
      'province': 'VARCHAR(100)',
      'factory': 'VARCHAR(255)'
    };

    return typeMap[fieldType] || 'TEXT';
  }

  /**
   * Helper: Validate type conversion is safe
   * @private
   */
  async _validateTypeConversion(tableName, columnName, oldType, newType, client) {
    const validation = {
      valid: true,
      warnings: [],
      reason: '',
      invalidCount: 0,
      invalidRows: []
    };

    try {
      // Normalize types for comparison
      const normalizeType = (type) => {
        return type
          .toUpperCase()
          .replace(/\(.*\)/, '') // Remove length specifiers
          .trim();
      };

      const normalizedOldType = normalizeType(oldType);
      const normalizedNewType = normalizeType(newType);

      // Safe conversions (always allowed)
      const safeConversions = [
        ['NUMERIC', 'TEXT'],
        ['INTEGER', 'TEXT'],
        ['DATE', 'TEXT'],
        ['TIME', 'TEXT'],
        ['TIMESTAMP', 'TEXT'],
        ['VARCHAR', 'TEXT'],
        ['INTEGER', 'NUMERIC'],
        ['VARCHAR', 'VARCHAR'], // Length changes
      ];

      const isSafeConversion = safeConversions.some(([from, to]) =>
        normalizedOldType.includes(from) && normalizedNewType.includes(to)
      );

      if (isSafeConversion) {
        validation.warnings.push('Safe conversion - data will be preserved');
        return validation;
      }

      // Risky conversions - need validation

      // TEXT/VARCHAR to NUMERIC
      if ((normalizedOldType.includes('TEXT') || normalizedOldType.includes('VARCHAR')) &&
          (normalizedNewType.includes('NUMERIC') || normalizedNewType.includes('INTEGER'))) {

        const checkQuery = `
          SELECT COUNT(*) as invalid_count
          FROM "${tableName}"
          WHERE "${columnName}" IS NOT NULL
            AND "${columnName}"::text !~ '^[0-9]*\\.?[0-9]+$'
        `;

        const result = await client.query(checkQuery);
        const invalidCount = parseInt(result.rows[0].invalid_count, 10);

        if (invalidCount > 0) {
          validation.valid = false;
          validation.invalidCount = invalidCount;
          validation.reason = `${invalidCount} row(s) contain non-numeric values`;
          validation.warnings.push('Some values cannot be converted to number');
        } else {
          validation.warnings.push('All values are numeric - conversion safe');
        }

        return validation;
      }

      // TEXT/VARCHAR to DATE
      if ((normalizedOldType.includes('TEXT') || normalizedOldType.includes('VARCHAR')) &&
          normalizedNewType.includes('DATE')) {

        const checkQuery = `
          SELECT COUNT(*) as invalid_count
          FROM "${tableName}"
          WHERE "${columnName}" IS NOT NULL
            AND "${columnName}"::text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
        `;

        const result = await client.query(checkQuery);
        const invalidCount = parseInt(result.rows[0].invalid_count, 10);

        if (invalidCount > 0) {
          validation.valid = false;
          validation.invalidCount = invalidCount;
          validation.reason = `${invalidCount} row(s) are not in valid date format (YYYY-MM-DD)`;
          validation.warnings.push('Some values cannot be converted to date');
        } else {
          validation.warnings.push('All values are in valid date format - conversion safe');
        }

        return validation;
      }

      // NUMERIC to INTEGER (check for decimal values)
      if (normalizedOldType.includes('NUMERIC') && normalizedNewType.includes('INTEGER')) {
        const checkQuery = `
          SELECT COUNT(*) as decimal_count
          FROM "${tableName}"
          WHERE "${columnName}" IS NOT NULL
            AND "${columnName}"::numeric != FLOOR("${columnName}"::numeric)
        `;

        const result = await client.query(checkQuery);
        const decimalCount = parseInt(result.rows[0].decimal_count, 10);

        if (decimalCount > 0) {
          validation.warnings.push(`${decimalCount} row(s) have decimal values that will be truncated`);
        } else {
          validation.warnings.push('All values are whole numbers - conversion safe');
        }

        return validation;
      }

      // Default: allow conversion with warning
      validation.warnings.push(`Type conversion from ${oldType} to ${newType} may cause data loss - please verify`);

    } catch (error) {
      validation.valid = false;
      validation.reason = `Validation query failed: ${error.message}`;
      validation.warnings.push('Could not validate type conversion');
    }

    return validation;
  }

  /**
   * Close database connection pool
   */
  async close() {
    await this.pool.end();
  }
}

module.exports = new FieldMigrationService();
