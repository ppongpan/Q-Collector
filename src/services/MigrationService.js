/**
 * Migration Service
 * Q-Collector Migration System v0.8.0 - Sprint 5: Frontend Integration
 *
 * Frontend API wrapper for field migration operations
 * Provides field change detection and API methods for migration preview, execution, history, and queue status
 *
 * @version 0.8.0
 * @created 2025-10-07
 */

import apiClient from './ApiClient';

/**
 * Field type to PostgreSQL type mapping
 * Maps Q-Collector field types to database column types
 */
const FIELD_TYPE_TO_DB_TYPE = {
  short_answer: 'TEXT',
  paragraph: 'TEXT',
  email: 'TEXT',
  phone: 'TEXT',
  number: 'NUMERIC',
  url: 'TEXT',
  file_upload: 'TEXT',
  image_upload: 'TEXT',
  date: 'DATE',
  time: 'TIME',
  datetime: 'TIMESTAMP',
  multiple_choice: 'TEXT',
  rating: 'INTEGER',
  slider: 'NUMERIC',
  lat_long: 'TEXT',
  province: 'TEXT',
  factory: 'TEXT'
};

/**
 * Migration Service Class
 * Handles all migration-related operations
 */
class MigrationService {
  /**
   * Detect field changes between old and new field arrays
   *
   * @param {Array} oldFields - Original fields from database
   * @param {Array} newFields - Updated fields from form builder
   * @returns {Array} Array of change objects with type, fieldId, and details
   *
   * @example
   * const changes = MigrationService.detectFieldChanges(oldFields, newFields);
   * // Returns: [
   * //   { type: 'ADD_FIELD', fieldId: '...', columnName: 'email', dataType: 'email', fieldTitle: 'อีเมล' },
   * //   { type: 'DELETE_FIELD', fieldId: '...', columnName: 'old_field', fieldTitle: 'Old Field' },
   * //   { type: 'CHANGE_TYPE', fieldId: '...', columnName: 'age', oldType: 'short_answer', newType: 'number' }
   * // ]
   */
  static detectFieldChanges(oldFields, newFields) {
    const changes = [];

    // Normalize fields to ensure we have ID and type
    const normalizeFields = (fields) => {
      return (fields || []).map(field => ({
        id: field.id,
        title: field.title || '',
        type: field.type,
        columnName: field.columnName || field.column_name || null,
        required: field.required || false
      }));
    };

    const oldFieldsNormalized = normalizeFields(oldFields);
    const newFieldsNormalized = normalizeFields(newFields);

    // Create maps for quick lookup
    const oldFieldsMap = new Map(oldFieldsNormalized.map(f => [f.id, f]));
    const newFieldsMap = new Map(newFieldsNormalized.map(f => [f.id, f]));

    // 1. Detect ADD_FIELD (fields in new but not in old)
    for (const newField of newFieldsNormalized) {
      if (!oldFieldsMap.has(newField.id)) {
        changes.push({
          type: 'ADD_FIELD',
          fieldId: newField.id,
          columnName: newField.columnName || `field_${newField.id.substring(0, 8)}`,
          dataType: newField.type,
          fieldTitle: newField.title,
          required: newField.required
        });
      }
    }

    // 2. Detect DELETE_FIELD (fields in old but not in new)
    for (const oldField of oldFieldsNormalized) {
      if (!newFieldsMap.has(oldField.id)) {
        changes.push({
          type: 'DELETE_FIELD',
          fieldId: oldField.id,
          columnName: oldField.columnName || `field_${oldField.id.substring(0, 8)}`,
          dataType: oldField.type,
          fieldTitle: oldField.title
        });
      }
    }

    // 3. Detect CHANGE_TYPE (same field ID but different type)
    for (const newField of newFieldsNormalized) {
      const oldField = oldFieldsMap.get(newField.id);

      if (oldField && oldField.type !== newField.type) {
        changes.push({
          type: 'CHANGE_TYPE',
          fieldId: newField.id,
          columnName: newField.columnName || oldField.columnName || `field_${newField.id.substring(0, 8)}`,
          oldType: oldField.type,
          newType: newField.type,
          oldDataType: FIELD_TYPE_TO_DB_TYPE[oldField.type] || 'TEXT',
          newDataType: FIELD_TYPE_TO_DB_TYPE[newField.type] || 'TEXT',
          fieldTitle: newField.title
        });
      }
    }

    return changes;
  }

  /**
   * Preview migration without executing (dry-run)
   *
   * @param {string} formId - Form UUID
   * @param {Array} changes - Array of change objects from detectFieldChanges()
   * @returns {Promise<Object>} Preview result with SQL, warnings, and validation
   *
   * @example
   * const preview = await MigrationService.previewMigration(formId, changes);
   * console.log(preview.data.summary.totalChanges); // 3
   */
  static async previewMigration(formId, changes) {
    if (!formId || !changes || changes.length === 0) {
      throw new Error('formId and non-empty changes array are required');
    }

    const response = await apiClient.post('/migrations/preview', {
      formId,
      changes
    });

    return response;
  }

  /**
   * Execute migration by queuing changes
   *
   * @param {string} formId - Form UUID
   * @param {Array} changes - Array of change objects from detectFieldChanges()
   * @returns {Promise<Object>} Execution result with queued job IDs
   *
   * @example
   * const result = await MigrationService.executeMigration(formId, changes);
   * console.log(result.data.queuedJobs); // [{ jobId: '...', type: 'ADD_FIELD', status: 'queued' }]
   */
  static async executeMigration(formId, changes) {
    if (!formId || !changes || changes.length === 0) {
      throw new Error('formId and non-empty changes array are required');
    }

    const response = await apiClient.post('/migrations/execute', {
      formId,
      changes
    });

    return response;
  }

  /**
   * Get migration history for a form
   *
   * @param {string} formId - Form UUID
   * @param {Object} options - Query options (limit, offset, status)
   * @returns {Promise<Object>} Migration history with pagination
   *
   * @example
   * const history = await MigrationService.getHistory(formId, { limit: 20, status: 'success' });
   */
  static async getHistory(formId, options = {}) {
    const { limit = 50, offset = 0, status = 'all' } = options;

    const response = await apiClient.get(`/migrations/history/${formId}`, {
      params: { limit, offset, status }
    });

    return response;
  }

  /**
   * Get migration queue status (global or form-specific)
   *
   * @param {string} formId - Form UUID (optional, if null returns global status)
   * @returns {Promise<Object>} Queue status with counts (waiting, active, completed, failed)
   *
   * @example
   * const status = await MigrationService.getQueueStatus(formId);
   * console.log(status.data.queue); // { waiting: 5, active: 1, completed: 100, failed: 2 }
   */
  static async getQueueStatus(formId = null) {
    const params = formId ? { formId } : {};

    const response = await apiClient.get('/migrations/queue/status', {
      params
    });

    return response;
  }

  /**
   * Get backups for a form
   *
   * @param {string} formId - Form UUID
   * @param {Object} options - Query options (limit, offset, includeExpired)
   * @returns {Promise<Object>} Backups list with pagination
   *
   * @example
   * const backups = await MigrationService.getBackups(formId);
   */
  static async getBackups(formId, options = {}) {
    const { limit = 50, offset = 0, includeExpired = false } = options;

    const response = await apiClient.get(`/migrations/backups/${formId}`, {
      params: { limit, offset, includeExpired }
    });

    return response;
  }

  /**
   * Rollback a migration (super_admin only)
   *
   * @param {string} migrationId - Migration UUID
   * @returns {Promise<Object>} Rollback result
   *
   * @example
   * const result = await MigrationService.rollbackMigration(migrationId);
   */
  static async rollbackMigration(migrationId) {
    const response = await apiClient.post(`/migrations/rollback/${migrationId}`);

    return response;
  }

  /**
   * Restore data from backup (super_admin only)
   *
   * @param {string} backupId - Backup UUID
   * @returns {Promise<Object>} Restore result with restored row count
   *
   * @example
   * const result = await MigrationService.restoreBackup(backupId);
   * console.log(result.data.restoredRows); // 100
   */
  static async restoreBackup(backupId) {
    const response = await apiClient.post(`/migrations/restore/${backupId}`);

    return response;
  }

  /**
   * Cleanup old backups (super_admin only)
   *
   * @param {Object} options - Cleanup options (days, dryRun)
   * @returns {Promise<Object>} Cleanup result with deleted count
   *
   * @example
   * const result = await MigrationService.cleanupBackups({ days: 90, dryRun: true });
   */
  static async cleanupBackups(options = {}) {
    const { days = 90, dryRun = false } = options;

    const response = await apiClient.delete('/migrations/cleanup', {
      params: { days, dryRun }
    });

    return response;
  }
}

export default MigrationService;
