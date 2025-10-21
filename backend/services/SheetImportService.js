/**
 * SheetImportService
 * Service for importing data from Google Sheets into Q-Collector forms
 *
 * Part of Google Sheets Import System v0.8.0
 * Phase 2: Backend Services
 */

const GoogleSheetsService = require('./GoogleSheetsService');
const { SheetImportConfig, SheetImportHistory, Form, Field, Submission, SubmissionData } = require('../models');
const { sequelize } = require('../config/database.config');
const logger = require('../utils/logger.util');

class SheetImportService {
  /**
   * Preview import data before execution
   *
   * @param {string} userId - User ID
   * @param {string} configId - SheetImportConfig UUID
   * @returns {Promise<Object>} - Preview data with headers, preview rows, and total count
   *
   * @example
   * const preview = await SheetImportService.previewImport(userId, configId);
   * // Returns:
   * // {
   * //   headers: ['Name', 'Email', 'Phone'],
   * //   preview: [
   * //     { row_number: 2, data: { field_id_1: { value: 'John', field_title: 'Name' }, ... } },
   * //     ...
   * //   ],
   * //   total_rows: 100,
   * //   config: {...}
   * // }
   */
  async previewImport(userId, configId) {
    try {
      logger.info(`Previewing import for config ${configId} by user ${userId}`);

      // Load config with relationships
      const config = await SheetImportConfig.findByPk(configId, {
        include: [
          {
            model: Form,
            as: 'form',
            include: [
              {
                model: Field,
                as: 'fields',
                order: [['order', 'ASC']]
              }
            ]
          }
        ]
      });

      if (!config) {
        throw new Error(`Import configuration not found: ${configId}`);
      }

      // Verify user owns this config
      if (config.user_id !== userId) {
        throw new Error('Access denied: You do not own this import configuration');
      }

      // Fetch sheet data (first 11 rows: header + 10 data rows)
      logger.info(`Fetching preview data from sheet: ${config.sheet_url}`);
      const allRows = await GoogleSheetsService.fetchSheetDataPublic(
        config.sheet_url,
        config.sheet_name
      );

      if (allRows.length === 0) {
        throw new Error('No data found in the specified sheet');
      }

      // Extract headers and data rows
      const headers = allRows[0];
      const dataRows = allRows.slice(config.skip_header_row ? 1 : 0);

      // Get first 10 rows for preview
      const previewRows = dataRows.slice(0, 10);
      const totalRows = dataRows.length;

      // Apply field mapping to preview rows
      const mappedPreview = await this._mapRowsToFields(
        previewRows,
        config.field_mapping,
        config.form.fields,
        config.skip_header_row ? 2 : 1 // Row numbers start at 2 if header is skipped (1-indexed in sheets)
      );

      logger.info(`Preview generated: ${mappedPreview.length} rows mapped`);

      return {
        headers,
        preview: mappedPreview,
        total_rows: totalRows,
        config: {
          id: config.id,
          sheet_name: config.sheet_name,
          sheet_url: config.sheet_url,
          skip_header_row: config.skip_header_row,
          field_mapping: config.field_mapping,
          form_title: config.form.title
        }
      };

    } catch (error) {
      logger.error('Error previewing import:', error);
      throw new Error(`Failed to preview import: ${error.message}`);
    }
  }

  /**
   * Map sheet rows to form fields
   * @private
   * @param {Array<Array<string>>} rows - Sheet rows
   * @param {Object} fieldMapping - Column → Field ID mapping
   * @param {Array<Field>} formFields - Form fields
   * @param {number} startRowNumber - Starting row number for tracking
   * @returns {Array<Object>} - Mapped rows
   */
  async _mapRowsToFields(rows, fieldMapping, formFields, startRowNumber = 1) {
    const fieldMap = new Map(formFields.map(f => [f.id, f]));
    const mappedRows = [];

    rows.forEach((row, index) => {
      const rowNumber = startRowNumber + index;
      const mappedData = {};

      // Map each column to its field
      Object.entries(fieldMapping).forEach(([columnLetter, fieldId]) => {
        const field = fieldMap.get(fieldId);
        if (!field) {
          logger.warn(`Field ${fieldId} not found in form fields`);
          return;
        }

        // Convert column letter to index (A=0, B=1, etc.)
        const columnIndex = this._columnLetterToIndex(columnLetter);
        const value = row[columnIndex] || '';

        mappedData[fieldId] = {
          value,
          field_title: field.title,
          field_type: field.type,
          column_letter: columnLetter
        };
      });

      mappedRows.push({
        row_number: rowNumber,
        data: mappedData
      });
    });

    return mappedRows;
  }

  /**
   * Convert column letter to index (A=0, B=1, ..., Z=25, AA=26, etc.)
   * @private
   * @param {string} letter - Column letter (A, B, AA, etc.)
   * @returns {number} - Column index
   */
  _columnLetterToIndex(letter) {
    letter = letter.toUpperCase();
    let index = 0;

    for (let i = 0; i < letter.length; i++) {
      index *= 26;
      index += letter.charCodeAt(i) - 'A'.charCodeAt(0) + 1;
    }

    return index - 1; // Convert to 0-based index
  }

  /**
   * Validate submission data against form fields
   *
   * @param {string} formId - Form UUID
   * @param {Object} data - Submission data (field_id → value)
   * @returns {Promise<Object>} - { valid: boolean, errors: Array }
   *
   * @example
   * const result = await validateSubmissionData(formId, { field_id_1: 'test@example.com' });
   * // Returns: { valid: true, errors: [] }
   */
  async validateSubmissionData(formId, data) {
    try {
      // Get form with fields
      const form = await Form.findByPk(formId, {
        include: [
          {
            model: Field,
            as: 'fields'
          }
        ]
      });

      if (!form) {
        return {
          valid: false,
          errors: [{ field: 'form', message: `Form not found: ${formId}` }]
        };
      }

      const errors = [];
      const fieldMap = new Map(form.fields.map(f => [f.id, f]));

      // Validate each field
      form.fields.forEach(field => {
        const value = data[field.id];

        // Check required fields
        if (field.required && (value === null || value === undefined || value === '')) {
          errors.push({
            field: field.id,
            field_title: field.title,
            message: `Required field '${field.title}' is missing`
          });
          return;
        }

        // Skip validation if field is not required and empty
        if (!value && !field.required) {
          return;
        }

        // Type-specific validation
        const validation = field.validateValue(value);
        if (!validation.valid) {
          errors.push({
            field: field.id,
            field_title: field.title,
            message: `${field.title}: ${validation.error}`,
            value
          });
        }
      });

      return {
        valid: errors.length === 0,
        errors
      };

    } catch (error) {
      logger.error('Error validating submission data:', error);
      return {
        valid: false,
        errors: [{ field: 'system', message: error.message }]
      };
    }
  }

  /**
   * Execute import from Google Sheets
   *
   * @param {string} userId - User ID
   * @param {string} configId - SheetImportConfig UUID
   * @returns {Promise<Object>} - Import summary
   *
   * @example
   * const result = await executeImport(userId, configId);
   * // Returns:
   * // {
   * //   history_id: "uuid",
   * //   total_rows: 100,
   * //   success_rows: 95,
   * //   failed_rows: 5,
   * //   errors: [{row: 10, error: "Invalid email"}, ...]
   * // }
   */
  async executeImport(userId, configId) {
    const transaction = await sequelize.transaction();
    let history = null;

    try {
      logger.info(`Starting import execution for config ${configId} by user ${userId}`);

      // Load config with sub-form support
      const config = await SheetImportConfig.findByPk(configId, {
        include: [
          {
            model: Form,
            as: 'form',
            include: [
              {
                model: Field,
                as: 'fields'
              }
            ]
          },
          {
            model: sequelize.models.SubForm,
            as: 'subForm',
            required: false,
            include: [
              {
                model: Field,
                as: 'fields'
              }
            ]
          }
        ]
      });

      if (!config) {
        throw new Error(`Import configuration not found: ${configId}`);
      }

      // Verify user owns this config
      if (config.user_id !== userId) {
        throw new Error('Access denied: You do not own this import configuration');
      }

      // Verify form is active
      if (!config.form.is_active) {
        throw new Error(`Cannot import to inactive form: ${config.form.title}`);
      }

      // Create import history record
      history = await SheetImportHistory.create({
        config_id: configId,
        user_id: userId,
        form_id: config.form_id,
        status: 'running',
        started_at: new Date(),
        total_rows: 0,
        success_rows: 0,
        failed_rows: 0,
        skipped_rows: 0,
        errors: [],
        submission_ids: []
      }, { transaction });

      await transaction.commit();

      logger.info(`Import history created: ${history.id}`);

      // Fetch all sheet data
      logger.info(`Fetching all data from sheet: ${config.sheet_url}`);
      const allRows = await GoogleSheetsService.fetchSheetDataPublic(
        config.sheet_url,
        config.sheet_name
      );

      if (allRows.length === 0) {
        throw new Error('No data found in the specified sheet');
      }

      // Extract data rows (skip header if configured)
      const dataRows = allRows.slice(config.skip_header_row ? 1 : 0);
      const startRowNumber = config.skip_header_row ? 2 : 1;

      // Update total rows
      await history.update({
        total_rows: dataRows.length
      });

      logger.info(`Processing ${dataRows.length} rows for import`);

      // ✅ NEW: Determine if this is sub-form import
      const isSubFormImport = !!config.sub_form_id;
      const targetFields = isSubFormImport ? config.subForm.fields : config.form.fields;

      // ✅ NEW: Extract FK field IDs that should be excluded from subform data
      const fkFieldIds = new Set();
      if (isSubFormImport && config.foreign_key_mappings && config.foreign_key_mappings.length > 0) {
        config.foreign_key_mappings.forEach(fkMapping => {
          fkFieldIds.add(fkMapping.subFormFieldId);
        });
        logger.info(`FK fields to exclude from subform data: ${Array.from(fkFieldIds).join(', ')}`);
      }

      logger.info(`Import mode: ${isSubFormImport ? 'SUB-FORM' : 'MAIN FORM'}`);
      if (isSubFormImport) {
        logger.info(`Sub-form: ${config.subForm.title}, FK mappings: ${JSON.stringify(config.foreign_key_mappings)}`);
      }

      // Process each row
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNumber = startRowNumber + i;

        try {
          // Map row data to fields with transformation
          const mappedData = {};
          Object.entries(config.field_mapping).forEach(([columnLetter, fieldId]) => {
            const columnIndex = this._columnLetterToIndex(columnLetter);
            const rawValue = row[columnIndex] || '';

            // ✅ NEW: Skip FK fields for subform imports (used only for parent lookup)
            if (isSubFormImport && fkFieldIds.has(fieldId)) {
              logger.debug(`Row ${rowNumber}: Skipping FK field ${fieldId} from subform submission data`);
              return; // Don't add to mappedData
            }

            // Find field to get its type (from subForm or main form)
            const field = targetFields.find(f => f.id === fieldId);
            if (field && rawValue) {
              // ✅ FIX: Transform value based on field type BEFORE validation
              mappedData[fieldId] = this._transformValueForFieldType(rawValue, field.type);
            } else {
              mappedData[fieldId] = rawValue;
            }
          });

          // ✅ NEW: Handle foreign key resolution for sub-form imports
          let parentSubmissionId = null;
          if (isSubFormImport && config.foreign_key_mappings && config.foreign_key_mappings.length > 0) {
            logger.info(`🔗 Row ${rowNumber}: Attempting FK resolution for SUB-FORM import`);
            try {
              parentSubmissionId = await this._resolveParentSubmission(
                config.foreign_key_mappings,
                row,
                config.form_id
              );

              if (!parentSubmissionId) {
                const fkError = 'Cannot find parent submission for this sub-form row';
                history.addError(rowNumber, fkError);
                history.failed_rows++;
                logger.warn(`❌ Row ${rowNumber}: ${fkError}`);
                continue;
              }

              logger.info(`✅ Row ${rowNumber}: Resolved parent_id = ${parentSubmissionId}`);
            } catch (fkError) {
              history.addError(rowNumber, `FK resolution failed: ${fkError.message}`);
              history.failed_rows++;
              logger.error(`❌ Row ${rowNumber}: FK resolution error:`, fkError);
              continue;
            }
          } else if (isSubFormImport) {
            logger.error(`❌ Row ${rowNumber}: SUB-FORM import but NO foreign_key_mappings configured!`);
            history.addError(rowNumber, 'No foreign key mappings configured for sub-form import');
            history.failed_rows++;
            continue;
          } else {
            logger.debug(`Row ${rowNumber}: MAIN FORM import, no parent_id needed`);
          }

          // Validate data
          const validation = await this.validateSubmissionData(config.form_id, mappedData);

          if (!validation.valid) {
            // Log validation errors
            const errorMessage = validation.errors.map(e => e.message).join('; ');
            history.addError(rowNumber, errorMessage);
            history.failed_rows++;

            logger.warn(`Row ${rowNumber} validation failed: ${errorMessage}`);
            console.error(`📋 [DATA IMPORT] Row ${rowNumber} failed: ${errorMessage}`);
            continue;
          }

          // Create submission with parent_id if sub-form
          const submission = await this._createSubmission(
            config.form_id,
            userId,
            mappedData,
            targetFields,
            {
              import_source: 'google_sheets',
              import_config_id: configId,
              import_history_id: history.id,
              row_number: rowNumber,
              is_subform: isSubFormImport,
              subform_id: config.sub_form_id || null
            },
            {
              subFormId: config.sub_form_id,
              parentSubmissionId: parentSubmissionId
            }
          );

          // Track submission ID
          history.addSubmissionId(submission.id);
          history.success_rows++;

          logger.debug(`Row ${rowNumber} imported successfully: ${submission.id}${parentSubmissionId ? ` (parent: ${parentSubmissionId})` : ''}`);

        } catch (error) {
          // Log row error
          history.addError(rowNumber, error.message);
          history.failed_rows++;

          logger.error(`Error importing row ${rowNumber}:`, error);
        }
      }

      // Mark import as completed
      await history.markAsCompleted();

      // Update config statistics
      await config.recordImport({ transaction: null });

      logger.info(`Import completed: ${history.success_rows}/${history.total_rows} rows imported successfully`);

      return {
        history_id: history.id,
        total_rows: history.total_rows,
        success_rows: history.success_rows,
        failed_rows: history.failed_rows,
        skipped_rows: history.skipped_rows,
        errors: history.errors,
        submission_ids: history.submission_ids
      };

    } catch (error) {
      logger.error('Error executing import:', error);

      // Mark import as failed if history exists
      if (history) {
        await history.markAsFailed(error.message);
      }

      throw new Error(`Failed to execute import: ${error.message}`);
    }
  }

  /**
   * Create a submission with data
   * @private
   * @param {string} formId - Form UUID
   * @param {string} userId - User UUID
   * @param {Object} data - Field data (field_id → value)
   * @param {Array<Field>} formFields - Form fields
   * @param {Object} metadata - Additional metadata
   * @param {Object} options - Additional options
   * @param {string} options.subFormId - Sub-form ID (if creating sub-form submission)
   * @param {string} options.parentSubmissionId - Parent submission ID (for sub-form submissions)
   * @returns {Promise<Submission>}
   */
  async _createSubmission(formId, userId, data, formFields, metadata = {}, options = {}) {
    const transaction = await sequelize.transaction();

    try {
      // ✅ NEW: Support for sub-form submissions with parent_id
      const submissionData = {
        form_id: formId,
        submitted_by: userId,
        status: 'submitted',
        submitted_at: new Date(),
        metadata
      };

      // ✅ NEW: Add parent_id if this is a sub-form submission
      if (options.parentSubmissionId) {
        submissionData.parent_id = options.parentSubmissionId;
        logger.info(`✅ Creating SUB-FORM submission with parent_id: ${options.parentSubmissionId}`);
      } else {
        logger.info(`✅ Creating MAIN FORM submission (no parent_id)`);
      }

      // Create submission
      const submission = await Submission.create(submissionData, { transaction });

      // ⚠️ CRITICAL DEBUG: Log the actual submission data to verify parent_id
      logger.info(`📋 Submission created: id=${submission.id}, form_id=${submission.form_id}, parent_id=${submission.parent_id || 'NULL'}, is_subform=${!!submission.parent_id}`);

      // Create submission data for each field
      const fieldMap = new Map(formFields.map(f => [f.id, f]));

      for (const [fieldId, value] of Object.entries(data)) {
        const field = fieldMap.get(fieldId);
        if (!field) {
          logger.warn(`Field ${fieldId} not found, skipping`);
          continue;
        }

        // Skip empty non-required fields
        if (!value && !field.required) {
          continue;
        }

        await SubmissionData.create({
          submission_id: submission.id,
          field_id: fieldId,
          value: value
        }, { transaction });
      }

      await transaction.commit();

      return submission;

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Rollback import (delete all created submissions)
   *
   * @param {string} userId - User ID
   * @param {string} historyId - SheetImportHistory UUID
   * @returns {Promise<Object>} - { deleted_count: number }
   *
   * @example
   * const result = await rollbackImport(userId, historyId);
   * // Returns: { deleted_count: 95 }
   */
  async rollbackImport(userId, historyId) {
    const transaction = await sequelize.transaction();

    try {
      logger.info(`Starting rollback for import history ${historyId} by user ${userId}`);

      // Load history record
      const history = await SheetImportHistory.findByPk(historyId, {
        include: [
          {
            model: SheetImportConfig,
            as: 'config'
          }
        ]
      });

      if (!history) {
        throw new Error(`Import history not found: ${historyId}`);
      }

      // Verify user owns this import
      if (history.user_id !== userId) {
        throw new Error('Access denied: You do not own this import history');
      }

      // Check if rollback is allowed
      if (!history.canRollback()) {
        throw new Error(
          `Cannot rollback import with status '${history.status}'. ` +
          'Only completed imports can be rolled back.'
        );
      }

      // Get submission IDs
      const submissionIds = history.submission_ids || [];

      if (submissionIds.length === 0) {
        logger.warn('No submissions to rollback');
        return { deleted_count: 0 };
      }

      logger.info(`Rolling back ${submissionIds.length} submissions`);

      // Delete all submissions (cascade will delete submission_data and files)
      const deletedCount = await Submission.destroy({
        where: {
          id: submissionIds
        },
        transaction
      });

      // Update history status
      await history.markAsRolledBack({ transaction });

      await transaction.commit();

      logger.info(`Rollback completed: ${deletedCount} submissions deleted`);

      return {
        deleted_count: deletedCount,
        submission_ids: submissionIds
      };

    } catch (error) {
      await transaction.rollback();
      logger.error('Error rolling back import:', error);
      throw new Error(`Failed to rollback import: ${error.message}`);
    }
  }

  /**
   * Get import history for a configuration
   *
   * @param {string} configId - SheetImportConfig UUID
   * @param {number} limit - Max records to return
   * @returns {Promise<Array<SheetImportHistory>>}
   */
  async getImportHistory(configId, limit = 50) {
    try {
      return await SheetImportHistory.findByConfig(configId, limit);
    } catch (error) {
      logger.error('Error fetching import history:', error);
      throw new Error(`Failed to fetch import history: ${error.message}`);
    }
  }

  /**
   * Get import history by user
   *
   * @param {string} userId - User UUID
   * @param {number} limit - Max records to return
   * @returns {Promise<Array<SheetImportHistory>>}
   */
  async getUserImportHistory(userId, limit = 50) {
    try {
      return await SheetImportHistory.findByUser(userId, limit);
    } catch (error) {
      logger.error('Error fetching user import history:', error);
      throw new Error(`Failed to fetch user import history: ${error.message}`);
    }
  }

  /**
   * Get import statistics for a form
   *
   * @param {string} formId - Form UUID
   * @returns {Promise<Object>}
   */
  async getFormImportStatistics(formId) {
    try {
      return await SheetImportHistory.getFormStatistics(formId);
    } catch (error) {
      logger.error('Error fetching form import statistics:', error);
      throw new Error(`Failed to fetch form import statistics: ${error.message}`);
    }
  }

  /**
   * Create a new import configuration
   *
   * @param {string} userId - User UUID
   * @param {string} formId - Target form UUID
   * @param {string} sheetUrl - Google Sheets URL
   * @param {string} sheetName - Sheet name
   * @param {Object} fieldMapping - Column → Field ID mapping
   * @returns {Promise<SheetImportConfig>}
   */
  async createImportConfig(userId, formId, sheetUrl, sheetName, fieldMapping) {
    try {
      logger.info(`Creating import config for form ${formId} by user ${userId}`);

      // Extract Google Sheet ID
      const googleSheetId = GoogleSheetsService.extractSheetId(sheetUrl);

      if (!googleSheetId) {
        throw new Error('Invalid Google Sheets URL');
      }

      // Verify form exists
      const form = await Form.findByPk(formId);
      if (!form) {
        throw new Error(`Form not found: ${formId}`);
      }

      // Create config
      const config = await SheetImportConfig.create({
        user_id: userId,
        form_id: formId,
        sheet_url: sheetUrl,
        sheet_name: sheetName,
        google_sheet_id: googleSheetId,
        field_mapping: fieldMapping,
        skip_header_row: true, // Default: skip first row (headers)
        last_used_at: new Date()
      });

      logger.info(`Import config created: ${config.id}`);

      return config;

    } catch (error) {
      logger.error('Error creating import config:', error);
      throw new Error(`Failed to create import config: ${error.message}`);
    }
  }

  /**
   * Get user's import configurations
   *
   * @param {string} userId - User UUID
   * @param {number} limit - Max records to return
   * @returns {Promise<Array<SheetImportConfig>>}
   */
  async getUserConfigs(userId, limit = 50) {
    try {
      return await SheetImportConfig.findByUser(userId, limit);
    } catch (error) {
      logger.error('Error fetching user configs:', error);
      throw new Error(`Failed to fetch user configs: ${error.message}`);
    }
  }

  /**
   * Delete an import configuration
   *
   * @param {string} userId - User UUID
   * @param {string} configId - Config UUID
   * @returns {Promise<void>}
   */
  async deleteConfig(userId, configId) {
    try {
      logger.info(`Deleting import config ${configId} by user ${userId}`);

      const config = await SheetImportConfig.findByPk(configId);

      if (!config) {
        throw new Error(`Import configuration not found: ${configId}`);
      }

      // Verify user owns this config
      if (config.user_id !== userId) {
        throw new Error('Access denied: You do not own this import configuration');
      }

      await config.destroy();

      logger.info(`Import config deleted: ${configId}`);

    } catch (error) {
      logger.error('Error deleting config:', error);
      throw new Error(`Failed to delete config: ${error.message}`);
    }
  }

  /**
   * Transform value based on field type for Google Sheets import
   * Handles format conversion (date, time, phone, etc.)
   *
   * @param {any} value - Raw value from Google Sheets
   * @param {string} fieldType - Q-Collector field type
   * @returns {string} Transformed value
   */
  _transformValueForFieldType(value, fieldType) {
    if (!value) return '';

    const strValue = String(value).trim();

    switch (fieldType) {
      case 'date':
        // Convert various date formats to YYYY-MM-DD
        return this._transformDateValue(strValue);

      case 'time':
        // Convert various time formats to HH:mm or HH:mm:ss
        return this._transformTimeValue(strValue);

      case 'phone':
        // Clean phone number (remove spaces, dashes, parentheses)
        return this._transformPhoneValue(strValue);

      default:
        return strValue;
    }
  }

  /**
   * Transform date to YYYY-MM-DD format
   * Supports: DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY, ISO strings
   */
  _transformDateValue(value) {
    try {
      // Already in correct format
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
      }

      // Try DD/MM/YYYY or MM/DD/YYYY
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
        const parts = value.split('/');
        // Assume DD/MM/YYYY for Thai context
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
      }

      // Try DD-MM-YYYY
      if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(value)) {
        const parts = value.split('-');
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
      }

      // Try ISO date string
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }

      // Return as-is if can't transform
      return value;
    } catch (error) {
      return value;
    }
  }

  /**
   * Transform time to HH:mm or HH:mm:ss format
   */
  _transformTimeValue(value) {
    try {
      // Already in correct format
      if (/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/.test(value)) {
        return value;
      }

      // Try HH.mm format
      if (/^\d{1,2}\.\d{2}$/.test(value)) {
        const parts = value.split('.');
        const hour = parts[0].padStart(2, '0');
        const minute = parts[1];
        return `${hour}:${minute}`;
      }

      // Try H:mm or HH:mm without seconds
      if (/^\d{1,2}:\d{2}$/.test(value)) {
        const parts = value.split(':');
        const hour = parts[0].padStart(2, '0');
        const minute = parts[1];
        return `${hour}:${minute}`;
      }

      // Return as-is if can't transform
      return value;
    } catch (error) {
      return value;
    }
  }

  /**
   * Transform phone number (remove formatting)
   * From: 08x-xxx-xxxx, (08x) xxx-xxxx, etc.
   * To: 08xxxxxxxx
   */
  _transformPhoneValue(value) {
    // Remove all non-digit characters except +
    const cleaned = value.replace(/[^\d+]/g, '');
    return cleaned;
  }

  /**
   * Resolve parent submission ID from foreign key mappings
   * @private
   * @param {Array} foreignKeyMappings - Foreign key mapping configuration
   * @param {Array} row - Current sheet row data
   * @param {string} formId - Main form ID
   * @returns {Promise<string|null>} Parent submission ID
   *
   * Foreign key mapping structure:
   * [
   *   {
   *     subFormColumn: "A",          // Column in sub-form sheet
   *     subFormFieldId: "field-uuid",  // Field ID in sub-form
   *     mainFormFieldId: "field-uuid"  // Corresponding field ID in main form
   *   }
   * ]
   */
  async _resolveParentSubmission(foreignKeyMappings, row, formId) {
    try {
      // Build WHERE conditions for parent submission lookup
      const whereConditions = [];

      for (const fkMapping of foreignKeyMappings) {
        const { subFormColumn, subFormFieldId, mainFormFieldId } = fkMapping;

        // Get value from sheet row
        const columnIndex = this._columnLetterToIndex(subFormColumn);
        const lookupValue = row[columnIndex];

        if (!lookupValue) {
          logger.warn(`FK mapping: Column ${subFormColumn} has no value, skipping`);
          continue;
        }

        logger.debug(`FK lookup: ${subFormColumn} (${subFormFieldId}) → main form field ${mainFormFieldId} = "${lookupValue}"`);

        whereConditions.push({
          field_id: mainFormFieldId,
          value: lookupValue
        });
      }

      if (whereConditions.length === 0) {
        logger.warn('No valid FK conditions found');
        return null;
      }

      // Query submissions that match ALL foreign key conditions
      // We need to find a submission where ALL the specified fields match
      const submissions = await Submission.findAll({
        where: {
          form_id: formId,
          parent_id: null // Only match main form submissions
        },
        include: [
          {
            model: SubmissionData,
            as: 'submissionData',
            required: true,
            where: {
              [sequelize.Sequelize.Op.or]: whereConditions
            }
          }
        ]
      });

      // Filter submissions that match ALL conditions
      const matchingSubmission = submissions.find(submission => {
        const submissionDataMap = new Map(
          submission.submissionData.map(sd => [sd.field_id, sd.getDecryptedValue()])
        );

        // Check if ALL foreign key conditions are met
        return whereConditions.every(condition => {
          const actualValue = submissionDataMap.get(condition.field_id);
          return actualValue === condition.value;
        });
      });

      if (matchingSubmission) {
        logger.info(`✅ FK match found: submission ${matchingSubmission.id}`);
        return matchingSubmission.id;
      }

      logger.warn(`❌ No matching parent submission found for FK conditions: ${JSON.stringify(whereConditions)}`);
      return null;

    } catch (error) {
      logger.error('Error resolving parent submission:', error);
      throw new Error(`Failed to resolve parent submission: ${error.message}`);
    }
  }
}

// Export singleton instance
module.exports = new SheetImportService();
