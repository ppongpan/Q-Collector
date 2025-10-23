/**
 * Migration Routes
 * Q-Collector Migration System v0.8.0 - Sprint 4: API Layer
 *
 * REST API endpoints for field migration operations with role-based access control
 * Provides preview, execution, history, rollback, backup, restore, and status capabilities
 *
 * Permissions:
 * - super_admin: Full access to all operations
 * - admin: Can preview, execute, view history, view backups, check status
 *
 * Created: 2025-10-07
 * Sprint: 4 (API Layer - Field Migration System v0.8.0)
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { authenticate, authorize, requireSuperAdmin } = require('../../middleware/auth.middleware');
const { asyncHandler, ApiError } = require('../../middleware/error.middleware');
const FieldMigrationService = require('../../services/FieldMigrationService');
const MigrationQueue = require('../../services/MigrationQueue');
const { FieldMigration, FieldDataBackup, Form } = require('../../models');
const logger = require('../../utils/logger.util');

/**
 * Apply authentication to all routes
 */
router.use(authenticate);

/**
 * Helper: Validate UUID format
 */
const isValidUUID = (value) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

/**
 * Helper: Validate migration change structure
 */
const validateMigrationChanges = (changes) => {
  if (!Array.isArray(changes)) {
    return { valid: false, error: 'Changes must be an array' };
  }

  if (changes.length === 0) {
    return { valid: false, error: 'Changes array cannot be empty' };
  }

  const validTypes = ['ADD_FIELD', 'DELETE_FIELD', 'RENAME_FIELD', 'CHANGE_TYPE'];

  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];

    if (!change.type || !validTypes.includes(change.type)) {
      return { valid: false, error: `Invalid migration type at index ${i}: ${change.type}` };
    }

    if (!change.fieldId || !isValidUUID(change.fieldId)) {
      return { valid: false, error: `Invalid fieldId at index ${i}` };
    }

    // Type-specific validation
    switch (change.type) {
      case 'ADD_FIELD':
        if (!change.columnName || !change.dataType) {
          return { valid: false, error: `ADD_FIELD requires columnName and dataType at index ${i}` };
        }
        break;

      case 'DELETE_FIELD':
        if (!change.columnName) {
          return { valid: false, error: `DELETE_FIELD requires columnName at index ${i}` };
        }
        break;

      case 'RENAME_FIELD':
        if (!change.oldColumnName || !change.newColumnName) {
          return { valid: false, error: `RENAME_FIELD requires oldColumnName and newColumnName at index ${i}` };
        }
        break;

      case 'CHANGE_TYPE':
        if (!change.columnName || !change.oldType || !change.newType) {
          return { valid: false, error: `CHANGE_TYPE requires columnName, oldType, and newType at index ${i}` };
        }
        break;
    }
  }

  return { valid: true };
};

/**
 * POST /api/v1/migrations/preview
 * Preview migration without executing (dry-run)
 *
 * Request Body:
 * {
 *   "formId": "uuid",
 *   "changes": [
 *     {
 *       "type": "ADD_FIELD",
 *       "fieldId": "uuid",
 *       "columnName": "email",
 *       "dataType": "email"
 *     }
 *   ]
 * }
 *
 * Response: 200 OK
 * {
 *   "success": true,
 *   "data": {
 *     "preview": [
 *       {
 *         "change": {...},
 *         "sql": "ALTER TABLE ...",
 *         "rollbackSQL": "...",
 *         "valid": true,
 *         "warnings": [],
 *         "requiresBackup": false
 *       }
 *     ],
 *     "summary": {
 *       "totalChanges": 1,
 *       "validChanges": 1,
 *       "invalidChanges": 0,
 *       "requiresBackup": false
 *     }
 *   }
 * }
 *
 * Permission: super_admin, admin
 */
router.post(
  '/preview',
  authorize('super_admin', 'admin'),
  [
    body('formId')
      .trim()
      .notEmpty()
      .withMessage('formId is required')
      .custom(isValidUUID)
      .withMessage('formId must be a valid UUID'),
    body('changes')
      .isArray({ min: 1 })
      .withMessage('changes must be a non-empty array')
  ],
  asyncHandler(async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', errors.array());
    }

    const { formId, changes } = req.body;

    // Validate changes structure
    const changeValidation = validateMigrationChanges(changes);
    if (!changeValidation.valid) {
      throw new ApiError(400, changeValidation.error, 'INVALID_CHANGES');
    }

    // Verify form exists
    const form = await Form.findByPk(formId);
    if (!form) {
      throw new ApiError(404, 'Form not found', 'FORM_NOT_FOUND');
    }

    const tableName = form.table_name;
    if (!tableName) {
      throw new ApiError(400, 'Form has no associated table', 'NO_TABLE');
    }

    logger.info(`Previewing ${changes.length} migration(s) for form ${formId} by ${req.user.username}`);

    // Preview each change
    const previews = [];
    let validCount = 0;
    let invalidCount = 0;
    let requiresBackup = false;

    for (const change of changes) {
      try {
        let preview;

        switch (change.type) {
          case 'ADD_FIELD':
            preview = await FieldMigrationService.previewMigration(
              'ADD_COLUMN',
              tableName,
              change.columnName,
              { dataType: change.dataType }
            );
            break;

          case 'DELETE_FIELD':
            preview = await FieldMigrationService.previewMigration(
              'DROP_COLUMN',
              tableName,
              change.columnName,
              {}
            );
            break;

          case 'RENAME_FIELD':
            preview = await FieldMigrationService.previewMigration(
              'RENAME_COLUMN',
              tableName,
              change.oldColumnName,
              { newName: change.newColumnName }
            );
            break;

          case 'CHANGE_TYPE':
            preview = await FieldMigrationService.previewMigration(
              'MODIFY_COLUMN',
              tableName,
              change.columnName,
              { oldType: change.oldType, newType: change.newType }
            );
            break;
        }

        if (preview.valid) {
          validCount++;
        } else {
          invalidCount++;
        }

        if (preview.requiresBackup) {
          requiresBackup = true;
        }

        previews.push({
          change,
          ...preview
        });

      } catch (error) {
        logger.error(`Preview failed for change:`, error);
        invalidCount++;
        previews.push({
          change,
          valid: false,
          warnings: [error.message],
          sql: null,
          rollbackSQL: null
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        formId,
        tableName,
        preview: previews,
        summary: {
          totalChanges: changes.length,
          validChanges: validCount,
          invalidChanges: invalidCount,
          requiresBackup
        }
      }
    });
  })
);

/**
 * POST /api/v1/migrations/execute
 * Manually trigger migration execution
 *
 * Request Body:
 * {
 *   "formId": "uuid",
 *   "changes": [...]
 * }
 *
 * Response: 201 Created
 * {
 *   "success": true,
 *   "data": {
 *     "queuedJobs": [
 *       {
 *         "jobId": "form_123_field_456_1234567890",
 *         "type": "ADD_FIELD",
 *         "status": "queued"
 *       }
 *     ],
 *     "message": "3 migration(s) queued for execution"
 *   }
 * }
 *
 * Permission: super_admin, admin
 */
router.post(
  '/execute',
  authorize('super_admin', 'admin'),
  [
    body('formId')
      .trim()
      .notEmpty()
      .withMessage('formId is required')
      .custom(isValidUUID)
      .withMessage('formId must be a valid UUID'),
    body('changes')
      .isArray({ min: 1 })
      .withMessage('changes must be a non-empty array')
  ],
  asyncHandler(async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', errors.array());
    }

    const { formId, changes } = req.body;
    const userId = req.user.id;

    // Validate changes structure
    const changeValidation = validateMigrationChanges(changes);
    if (!changeValidation.valid) {
      throw new ApiError(400, changeValidation.error, 'INVALID_CHANGES');
    }

    // Verify form exists
    const form = await Form.findByPk(formId);
    if (!form) {
      throw new ApiError(404, 'Form not found', 'FORM_NOT_FOUND');
    }

    const tableName = form.table_name;
    if (!tableName) {
      throw new ApiError(400, 'Form has no associated table', 'NO_TABLE');
    }

    logger.info(`Executing ${changes.length} migration(s) for form ${formId} by ${req.user.username}`);

    // Queue each change for execution
    const queuedJobs = [];

    for (const change of changes) {
      try {
        // Prepare migration job data
        const jobData = {
          type: change.type,
          tableName,
          fieldId: change.fieldId,
          formId,
          userId,
          ...change
        };

        // Add to migration queue
        const job = await MigrationQueue.add(jobData);

        queuedJobs.push({
          jobId: job.id,
          type: change.type,
          fieldId: change.fieldId,
          columnName: change.columnName || change.newColumnName || change.oldColumnName,
          status: 'queued',
          queuePosition: await job.queue.getWaitingCount()
        });

        logger.info(`Queued migration job ${job.id} for ${change.type}`);

      } catch (error) {
        logger.error(`Failed to queue migration for change:`, error);
        throw new ApiError(500, `Failed to queue migration: ${error.message}`, 'QUEUE_ERROR');
      }
    }

    res.status(201).json({
      success: true,
      data: {
        formId,
        tableName,
        queuedJobs,
        message: `${queuedJobs.length} migration(s) queued for execution`
      }
    });
  })
);

/**
 * GET /api/v1/migrations/history/:formId
 * Get migration history for a form
 *
 * Query Parameters:
 * - limit: Number of records to return (default: 50, max: 500)
 * - offset: Number of records to skip (default: 0)
 * - status: Filter by success status (all, success, failed)
 *
 * Response: 200 OK
 * {
 *   "success": true,
 *   "data": {
 *     "migrations": [...],
 *     "total": 10,
 *     "limit": 50,
 *     "offset": 0
 *   }
 * }
 *
 * Permission: super_admin, admin
 */
router.get(
  '/history/:formId',
  authorize('super_admin', 'admin'),
  [
    param('formId')
      .trim()
      .notEmpty()
      .withMessage('formId is required')
      .custom(isValidUUID)
      .withMessage('formId must be a valid UUID'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 500 })
      .withMessage('limit must be between 1 and 500')
      .toInt(),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('offset must be a positive integer')
      .toInt(),
    query('status')
      .optional()
      .isIn(['all', 'success', 'failed'])
      .withMessage('status must be all, success, or failed')
  ],
  asyncHandler(async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', errors.array());
    }

    const { formId } = req.params;
    const limit = req.query.limit || 50;
    const offset = req.query.offset || 0;
    const status = req.query.status || 'all';

    // Verify form exists
    const form = await Form.findByPk(formId);
    if (!form) {
      throw new ApiError(404, 'Form not found', 'FORM_NOT_FOUND');
    }

    logger.info(`Fetching migration history for form ${formId} (limit: ${limit}, offset: ${offset}, status: ${status})`);

    // Build query conditions
    const whereConditions = { form_id: formId };

    if (status === 'success') {
      whereConditions.success = true;
    } else if (status === 'failed') {
      whereConditions.success = false;
    }

    // Fetch migrations with associations
    const { count, rows: migrations } = await FieldMigration.findAndCountAll({
      where: whereConditions,
      limit,
      offset,
      order: [['executed_at', 'DESC']],
      include: [
        {
          model: require('../../models').User,
          as: 'executor',
          attributes: ['id', 'username', 'email']
        },
        {
          model: require('../../models').FieldDataBackup,
          as: 'backup',
          required: false,
          attributes: ['id', 'backup_type', 'retention_until', 'createdAt']
        }
      ]
    });

    // Transform migrations for response
    const transformedMigrations = migrations.map(migration => ({
      id: migration.id,
      type: migration.migration_type,
      tableName: migration.table_name,
      columnName: migration.column_name,
      oldValue: migration.old_value,
      newValue: migration.new_value,
      success: migration.success,
      errorMessage: migration.error_message,
      executedAt: migration.executed_at,
      executedBy: migration.executor ? {
        id: migration.executor.id,
        username: migration.executor.username
      } : null,
      backup: migration.backup ? {
        id: migration.backup.id,
        type: migration.backup.backup_type,
        retentionUntil: migration.backup.retention_until
      } : null,
      canRollback: migration.canRollback(),
      description: migration.getDescription()
    }));

    res.status(200).json({
      success: true,
      data: {
        formId,
        migrations: transformedMigrations,
        total: count,
        limit,
        offset,
        hasMore: offset + limit < count
      }
    });
  })
);

/**
 * POST /api/v1/migrations/rollback/:migrationId
 * Rollback a completed migration
 *
 * Response: 200 OK
 * {
 *   "success": true,
 *   "data": {
 *     "migrationId": "uuid",
 *     "rollbackMigrationId": "uuid",
 *     "message": "Migration rolled back successfully"
 *   }
 * }
 *
 * Permission: super_admin only
 */
router.post(
  '/rollback/:migrationId',
  requireSuperAdmin,
  [
    param('migrationId')
      .trim()
      .notEmpty()
      .withMessage('migrationId is required')
      .custom(isValidUUID)
      .withMessage('migrationId must be a valid UUID')
  ],
  asyncHandler(async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', errors.array());
    }

    const { migrationId } = req.params;
    const userId = req.user.id;

    logger.info(`Rolling back migration ${migrationId} by ${req.user.username}`);

    // Load migration record
    const migration = await FieldMigration.findByPk(migrationId);

    if (!migration) {
      throw new ApiError(404, 'Migration not found', 'MIGRATION_NOT_FOUND');
    }

    // Check if migration can be rolled back
    if (!migration.canRollback()) {
      const reasons = [];
      if (!migration.success) reasons.push('Migration was not successful');
      if (!migration.rollback_sql) reasons.push('No rollback SQL available');
      if (migration.migration_type === 'ADD_COLUMN' && migration.field_id !== null) {
        reasons.push('Cannot rollback ADD_COLUMN while field still exists');
      }

      throw new ApiError(400, `Cannot rollback migration: ${reasons.join(', ')}`, 'ROLLBACK_NOT_ALLOWED');
    }

    try {
      // Execute rollback SQL using native PostgreSQL connection
      const { Pool } = require('pg');
      const pool = new Pool({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        database: process.env.POSTGRES_DB || 'qcollector_db',
        user: process.env.POSTGRES_USER || 'qcollector',
        password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
      });

      const client = await pool.connect();

      try {
        await client.query(migration.rollback_sql);
        logger.info(`Executed rollback SQL: ${migration.rollback_sql}`);
      } finally {
        client.release();
        await pool.end();
      }

      // Record rollback as a new migration
      const rollbackMigration = await FieldMigration.create({
        field_id: migration.field_id,
        form_id: migration.form_id,
        migration_type: migration.migration_type,
        table_name: migration.table_name,
        column_name: migration.column_name,
        old_value: migration.new_value, // Reversed
        new_value: migration.old_value, // Reversed
        backup_id: migration.backup_id,
        executed_by: userId,
        success: true,
        error_message: null,
        rollback_sql: null // Rollback of rollback not supported
      });

      logger.info(`Rollback successful, created migration record ${rollbackMigration.id}`);

      res.status(200).json({
        success: true,
        data: {
          migrationId,
          rollbackMigrationId: rollbackMigration.id,
          message: 'Migration rolled back successfully',
          description: migration.getDescription()
        }
      });

    } catch (error) {
      logger.error(`Rollback failed for migration ${migrationId}:`, error);

      // Record failed rollback attempt
      await FieldMigration.create({
        field_id: migration.field_id,
        form_id: migration.form_id,
        migration_type: migration.migration_type,
        table_name: migration.table_name,
        column_name: migration.column_name,
        old_value: migration.new_value,
        new_value: migration.old_value,
        backup_id: migration.backup_id,
        executed_by: userId,
        success: false,
        error_message: error.message,
        rollback_sql: null
      });

      throw new ApiError(500, `Rollback failed: ${error.message}`, 'ROLLBACK_FAILED');
    }
  })
);

/**
 * GET /api/v1/migrations/backups/:formId
 * List backups for a form
 *
 * Query Parameters:
 * - limit: Number of records to return (default: 50, max: 500)
 * - offset: Number of records to skip (default: 0)
 * - includeExpired: Include expired backups (default: false)
 *
 * Response: 200 OK
 * {
 *   "success": true,
 *   "data": {
 *     "backups": [...],
 *     "total": 5
 *   }
 * }
 *
 * Permission: super_admin, admin
 */
router.get(
  '/backups/:formId',
  authorize('super_admin', 'admin'),
  [
    param('formId')
      .trim()
      .notEmpty()
      .withMessage('formId is required')
      .custom(isValidUUID)
      .withMessage('formId must be a valid UUID'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 500 })
      .withMessage('limit must be between 1 and 500')
      .toInt(),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('offset must be a positive integer')
      .toInt(),
    query('includeExpired')
      .optional()
      .isBoolean()
      .withMessage('includeExpired must be a boolean')
      .toBoolean()
  ],
  asyncHandler(async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', errors.array());
    }

    const { formId } = req.params;
    const limit = req.query.limit || 50;
    const offset = req.query.offset || 0;
    const includeExpired = req.query.includeExpired || false;

    // Verify form exists
    const form = await Form.findByPk(formId);
    if (!form) {
      throw new ApiError(404, 'Form not found', 'FORM_NOT_FOUND');
    }

    logger.info(`Fetching backups for form ${formId} (includeExpired: ${includeExpired})`);

    // Build query conditions
    const whereConditions = { form_id: formId };

    if (!includeExpired) {
      whereConditions.retention_until = {
        [require('sequelize').Op.or]: [
          { [require('sequelize').Op.gte]: new Date() },
          { [require('sequelize').Op.is]: null }
        ]
      };
    }

    // Fetch backups with associations
    const { count, rows: backups } = await FieldDataBackup.findAndCountAll({
      where: whereConditions,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: require('../../models').User,
          as: 'creator',
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    // Transform backups for response (toJSON() already handles camelCase conversion)
    const transformedBackups = backups.map(backup => {
      const json = backup.toJSON();
      return {
        ...json,
        createdBy: backup.creator ? {
          id: backup.creator.id,
          username: backup.creator.username
        } : null
      };
    });

    res.status(200).json({
      success: true,
      data: {
        formId,
        backups: transformedBackups,
        total: count,
        limit,
        offset,
        hasMore: offset + limit < count
      }
    });
  })
);

/**
 * POST /api/v1/migrations/restore/:backupId
 * Restore data from backup
 *
 * Response: 200 OK
 * {
 *   "success": true,
 *   "data": {
 *     "backupId": "uuid",
 *     "restoredRows": 100,
 *     "tableName": "...",
 *     "columnName": "...",
 *     "message": "Restored 100 records"
 *   }
 * }
 *
 * Permission: super_admin only
 */
router.post(
  '/restore/:backupId',
  requireSuperAdmin,
  [
    param('backupId')
      .trim()
      .notEmpty()
      .withMessage('backupId is required')
      .custom(isValidUUID)
      .withMessage('backupId must be a valid UUID')
  ],
  asyncHandler(async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', errors.array());
    }

    const { backupId } = req.params;
    const userId = req.user.id;

    logger.info(`Restoring backup ${backupId} by ${req.user.username}`);

    // Load backup record
    const backup = await FieldDataBackup.findByPk(backupId);

    if (!backup) {
      throw new ApiError(404, 'Backup not found', 'BACKUP_NOT_FOUND');
    }

    // Check if backup is expired
    if (backup.isExpired()) {
      throw new ApiError(400, 'Backup has expired and cannot be restored', 'BACKUP_EXPIRED', {
        retentionUntil: backup.retention_until,
        expiredDaysAgo: Math.abs(backup.getDaysUntilExpiration())
      });
    }

    try {
      // Restore backup using FieldMigrationService
      const result = await FieldMigrationService.restoreColumnData(backupId, { userId });

      logger.info(`Restore successful: ${result.count} records restored from backup ${backupId}`);

      res.status(200).json({
        success: true,
        data: {
          backupId,
          restoredRows: result.count,
          tableName: result.tableName,
          columnName: result.columnName,
          message: result.message
        }
      });

    } catch (error) {
      logger.error(`Restore failed for backup ${backupId}:`, error);
      throw new ApiError(500, `Restore failed: ${error.message}`, 'RESTORE_FAILED');
    }
  })
);

/**
 * GET /api/v1/migrations/queue/status
 * Get global queue status
 *
 * Query Parameters:
 * - formId: Filter by specific form (optional)
 *
 * Response: 200 OK
 * {
 *   "success": true,
 *   "data": {
 *     "queue": {
 *       "waiting": 5,
 *       "active": 1,
 *       "completed": 100,
 *       "failed": 2,
 *       "delayed": 0
 *     },
 *     "formId": "uuid" // if filtered
 *   }
 * }
 *
 * Permission: super_admin, admin
 */
router.get(
  '/queue/status',
  authorize('super_admin', 'admin'),
  [
    query('formId')
      .optional()
      .trim()
      .custom(isValidUUID)
      .withMessage('formId must be a valid UUID')
  ],
  asyncHandler(async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', errors.array());
    }

    const { formId } = req.query;

    logger.info(`Fetching queue status${formId ? ` for form ${formId}` : ' (global)'}`);

    if (formId) {
      // Verify form exists
      const form = await Form.findByPk(formId);
      if (!form) {
        throw new ApiError(404, 'Form not found', 'FORM_NOT_FOUND');
      }

      // Get form-specific queue status
      const status = await MigrationQueue.getStatus(formId);

      res.status(200).json({
        success: true,
        data: {
          formId,
          queue: status
        }
      });
    } else {
      // Get global queue metrics
      const metrics = await MigrationQueue.getMetrics();

      res.status(200).json({
        success: true,
        data: {
          queue: metrics
        }
      });
    }
  })
);

/**
 * DELETE /api/v1/migrations/cleanup
 * Cleanup old backups
 *
 * Query Parameters:
 * - days: Delete backups older than X days (default: 90, min: 30, max: 365)
 * - dryRun: Preview cleanup without executing (default: false)
 *
 * Response: 200 OK
 * {
 *   "success": true,
 *   "data": {
 *     "deletedCount": 5,
 *     "message": "Deleted 5 expired backups older than 90 days"
 *   }
 * }
 *
 * Permission: super_admin only
 */
router.delete(
  '/cleanup',
  requireSuperAdmin,
  [
    query('days')
      .optional()
      .isInt({ min: 30, max: 365 })
      .withMessage('days must be between 30 and 365')
      .toInt(),
    query('dryRun')
      .optional()
      .isBoolean()
      .withMessage('dryRun must be a boolean')
      .toBoolean()
  ],
  asyncHandler(async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', errors.array());
    }

    const days = req.query.days || 90;
    const dryRun = req.query.dryRun || false;

    logger.info(`Cleanup backups older than ${days} days (dryRun: ${dryRun}) by ${req.user.username}`);

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    try {
      if (dryRun) {
        // Preview: Count backups that would be deleted
        const count = await FieldDataBackup.count({
          where: {
            retention_until: {
              [require('sequelize').Op.lt]: cutoffDate
            }
          }
        });

        // Find sample backups for preview
        const samples = await FieldDataBackup.findAll({
          where: {
            retention_until: {
              [require('sequelize').Op.lt]: cutoffDate
            }
          },
          limit: 5,
          order: [['retention_until', 'ASC']],
          attributes: ['id', 'table_name', 'column_name', 'retention_until', 'backup_type']
        });

        res.status(200).json({
          success: true,
          data: {
            dryRun: true,
            wouldDeleteCount: count,
            cutoffDate,
            days,
            samples: samples.map(s => ({
              id: s.id,
              tableName: s.table_name,
              columnName: s.column_name,
              retentionUntil: s.retention_until,
              backupType: s.backup_type
            })),
            message: `Would delete ${count} backups older than ${days} days`
          }
        });
      } else {
        // Execute: Delete expired backups
        const deletedCount = await FieldDataBackup.destroy({
          where: {
            retention_until: {
              [require('sequelize').Op.lt]: cutoffDate
            }
          }
        });

        logger.info(`Deleted ${deletedCount} expired backups older than ${days} days`);

        res.status(200).json({
          success: true,
          data: {
            deletedCount,
            cutoffDate,
            days,
            message: `Deleted ${deletedCount} expired backups older than ${days} days`
          }
        });
      }
    } catch (error) {
      logger.error(`Cleanup failed:`, error);
      throw new ApiError(500, `Cleanup failed: ${error.message}`, 'CLEANUP_FAILED');
    }
  })
);

module.exports = router;
