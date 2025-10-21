/**
 * SheetFormCreationService v0.8.0-revised
 * Creates NEW forms from Google Sheet structure
 *
 * Features:
 * - Auto-detect field types from column data
 * - Create main forms or sub-forms
 * - Generate dynamic PostgreSQL tables
 * - Import sheet data as Submission records
 */

const { Form, Field, SubForm, sequelize } = require('../models');
const logger = require('../utils/logger.util');
const { ApiError } = require('../middleware/error.middleware');
const DynamicTableService = require('./DynamicTableService');

class SheetFormCreationService {

  /**
   * Auto-detect field types from column data
   * Uses pattern matching + sample data analysis
   *
   * @param {Array<string>} headers - Column names
   * @param {Array<Array>} sampleRows - Sample data rows (first 50)
   * @returns {Promise<Array>} Detection results with confidence
   */
  async detectFieldTypes(headers, sampleRows) {
    const detectedTypes = [];

    for (let i = 0; i < headers.length; i++) {
      const columnName = headers[i];
      const columnData = sampleRows.map(row => row[i]).filter(val => val !== null && val !== undefined && val !== '');

      // Analyze column type
      const detection = this._analyzeColumnType(columnName, columnData);

      detectedTypes.push({
        columnName,
        detectedType: detection,
        sampleValues: columnData.slice(0, 3)
      });

      logger.debug(`Column "${columnName}": detected ${detection.type} (confidence: ${detection.confidence})`);
    }

    return detectedTypes;
  }

  /**
   * Analyze column type from name and sample data
   * Returns { type, confidence, options? }
   *
   * @param {string} columnName - Column name
   * @param {Array} columnData - Sample data
   * @returns {Object} { type: string, confidence: number, options?: array }
   */
  _analyzeColumnType(columnName, columnData) {
    if (!columnData || columnData.length === 0) {
      return { type: 'short_answer', confidence: 0.5 };
    }

    const name = columnName.toLowerCase();
    const sampleSize = columnData.length;

    // Email detection
    if (name.includes('email') || name.includes('อีเมล') || name.includes('e-mail')) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const matches = columnData.filter(v => emailPattern.test(String(v).trim()));
      const confidence = matches.length / sampleSize;

      if (confidence > 0.7) {
        return { type: 'email', confidence: Math.min(confidence, 0.95) };
      }
    }

    // Phone detection
    if (name.includes('phone') || name.includes('เบอร์') || name.includes('โทร') || name.includes('tel')) {
      const phonePattern = /^[0-9\s\-()]{9,15}$/;
      const matches = columnData.filter(v => phonePattern.test(String(v).replace(/[\s\-()]/g, '')));
      const confidence = matches.length / sampleSize;

      if (confidence > 0.7) {
        return { type: 'phone', confidence: Math.min(confidence, 0.9) };
      }
    }

    // Number detection
    if (name.includes('number') || name.includes('จำนวน') || name.includes('ราคา') ||
        name.includes('price') || name.includes('amount') || name.includes('qty')) {
      const numberPattern = /^-?\d+\.?\d*$/;
      const matches = columnData.filter(v => numberPattern.test(String(v).replace(/,/g, '')));
      const confidence = matches.length / sampleSize;

      if (confidence > 0.8) {
        return { type: 'number', confidence: Math.min(confidence, 0.95) };
      }
    }

    // Date detection
    if (name.includes('date') || name.includes('วันที่') || name.includes('วัน')) {
      const datePattern = /\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4}/;
      const matches = columnData.filter(v => {
        const str = String(v);
        return datePattern.test(str) || !isNaN(Date.parse(str));
      });
      const confidence = matches.length / sampleSize;

      if (confidence > 0.7) {
        return { type: 'date', confidence: Math.min(confidence, 0.9) };
      }
    }

    // Time detection
    if (name.includes('time') || name.includes('เวลา')) {
      const timePattern = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
      const matches = columnData.filter(v => timePattern.test(String(v)));
      const confidence = matches.length / sampleSize;

      if (confidence > 0.7) {
        return { type: 'time', confidence: Math.min(confidence, 0.9) };
      }
    }

    // URL detection
    if (name.includes('url') || name.includes('link') || name.includes('website') ||
        name.includes('เว็บ') || name.includes('ลิงก์')) {
      const urlPattern = /^(https?:\/\/|www\.)/i;
      const matches = columnData.filter(v => urlPattern.test(String(v)));
      const confidence = matches.length / sampleSize;

      if (confidence > 0.7) {
        return { type: 'url', confidence: Math.min(confidence, 0.95) };
      }
    }

    // Province detection (Thai provinces)
    if (name.includes('province') || name.includes('จังหวัด')) {
      const thaiProvinces = [
        'กรุงเทพมหานคร', 'กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น',
        'จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 'ชัยนาท', 'ชัยภูมิ', 'ชุมพร', 'เชียงราย',
        'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก', 'นครปฐม', 'นครพนม', 'นครราชสีมา'
        // ... (abbreviated for brevity)
      ];

      const matches = columnData.filter(v =>
        thaiProvinces.some(province => String(v).includes(province))
      );
      const confidence = matches.length / sampleSize;

      if (confidence > 0.6) {
        return { type: 'province', confidence: Math.min(confidence, 0.85) };
      }
    }

    // Multiple choice detection (low unique values)
    const uniqueValues = [...new Set(columnData.map(v => String(v)))];
    if (uniqueValues.length <= 10 && sampleSize > 10) {
      const confidence = 1 - (uniqueValues.length / 10); // Fewer unique = higher confidence
      return {
        type: 'multiple_choice',
        confidence: Math.max(0.7, confidence),
        options: uniqueValues
      };
    }

    // Check text length for paragraph vs short_answer
    const avgLength = columnData.reduce((sum, v) => sum + String(v).length, 0) / sampleSize;

    if (avgLength > 100) {
      return { type: 'paragraph', confidence: 0.7 };
    }

    // Default: short_answer (lowest confidence)
    return { type: 'short_answer', confidence: 0.5 };
  }

  /**
   * Create form from sheet data
   * Main entry point for form creation
   *
   * @param {string} userId - User ID creating the form
   * @param {Object} sheetData - { headers: [], rows: [] }
   * @param {Object} formConfig - Form configuration
   * @returns {Promise<Object>} { formId, tableName, fieldsCreated, dataImported }
   */
  async createFormFromSheet(userId, sheetData, formConfig) {
    const transaction = await sequelize.transaction();

    try {
      const {
        name,
        description,
        isSubForm,
        parentFormId,
        selectedColumns,
        roles_allowed = ['super_admin', 'admin'],
        foreignKeyMappings = [] // ✅ NEW: FK mappings for sub-forms
      } = formConfig;

      console.log(`📋 [SHEET IMPORT] START: Creating form "${name}"`);
      console.log(`📋 [SHEET IMPORT] Config:`, {
        isSubForm,
        columnsCount: selectedColumns.length,
        rowsCount: sheetData.rows?.length,
        fkMappingsCount: foreignKeyMappings.length
      });
      logger.info(`Creating form from sheet: "${name}", isSubForm: ${isSubForm}, columns: ${selectedColumns.length}, FK mappings: ${foreignKeyMappings.length}`);

      // Validate required fields
      if (!name || name.trim() === '') {
        throw new ApiError(400, 'Form name is required', 'FORM_NAME_REQUIRED');
      }

      if (selectedColumns.length === 0) {
        throw new ApiError(400, 'At least one column must be selected', 'NO_COLUMNS_SELECTED');
      }

      // ✅ CRITICAL FIX: For subform import, do NOT create Form record
      // Only create SubForm record and Fields
      let form = null;
      let subFormId = null;
      const createdFields = [];

      if (isSubForm && parentFormId) {
        // ========== SUBFORM IMPORT WORKFLOW ==========
        console.log(`📋 [SUBFORM IMPORT] Importing to existing form ${parentFormId}`);

        // STEP 1: Verify parent form exists
        const parentForm = await Form.findByPk(parentFormId);
        if (!parentForm) {
          throw new ApiError(404, `Parent form ${parentFormId} not found`, 'PARENT_FORM_NOT_FOUND');
        }

        console.log(`📋 [SUBFORM IMPORT] STEP 1: Parent form verified - ${parentForm.title}`);

        // STEP 2: Create SubForm record
        const subForm = await SubForm.create({
          form_id: parentFormId, // Link to parent
          title: name.trim(),
          description: description || '',
          order: 0 // Default order, user can change later
        }, { transaction });

        subFormId = subForm.id;
        console.log(`📋 [SUBFORM IMPORT] STEP 2: SubForm created - ${subForm.id}`);

        // STEP 3: Create Field records (linked to parent form + subform)
        for (let i = 0; i < selectedColumns.length; i++) {
          const col = selectedColumns[i];

          // Disable validation for problematic field types
          const shouldSkipValidation = ['date', 'time', 'phone'].includes(col.fieldType);
          const validationRules = shouldSkipValidation ? {} : (col.validation_rules || {});

          const field = await Field.create({
            form_id: parentFormId, // ✅ Reference parent form (NOT new form!)
            sub_form_id: subForm.id, // ✅ Link to subform
            type: col.fieldType,
            title: col.columnName,
            placeholder: col.placeholder || `กรอก${col.columnName}`,
            required: false,
            order: col.order !== undefined ? col.order : i,
            options: col.options || {},
            validation_rules: validationRules,
            show_in_table: i < 5
          }, { transaction });

          createdFields.push(field);
          logger.debug(`  Created subform field: ${field.title} (${field.type})`);
        }

        console.log(`📋 [SUBFORM IMPORT] STEP 3: Created ${createdFields.length} fields for subform`);
        logger.info(`✅ Created subform ${subForm.id} with ${createdFields.length} fields under parent ${parentFormId}`);

      } else {
        // ========== MAIN FORM IMPORT WORKFLOW ==========
        console.log(`📋 [MAIN FORM IMPORT] Creating new main form`);

        // STEP 1: Create Form record
        form = await Form.create({
          title: name.trim(),
          description: description || `นำเข้าจาก Google Sheets: ${name}`,
          roles_allowed,
          settings: {
            imported_from_sheets: true,
            import_date: new Date().toISOString(),
            sheet_metadata: sheetData.metadata || {}
          },
          created_by: userId,
          is_active: true,
          version: 1
        }, { transaction });

        console.log(`📋 [MAIN FORM IMPORT] STEP 1: Form created - ${form.id}`);
        logger.info(`✅ Created form record: ${form.id}`);

        // STEP 2: Create Field records
        for (let i = 0; i < selectedColumns.length; i++) {
          const col = selectedColumns[i];

          const shouldSkipValidation = ['date', 'time', 'phone'].includes(col.fieldType);
          const validationRules = shouldSkipValidation ? {} : (col.validation_rules || {});

          const field = await Field.create({
            form_id: form.id,
            sub_form_id: null, // Main form fields
            type: col.fieldType,
            title: col.columnName,
            placeholder: col.placeholder || `กรอก${col.columnName}`,
            required: false,
            order: col.order !== undefined ? col.order : i,
            options: col.options || {},
            validation_rules: validationRules,
            show_in_table: i < 5
          }, { transaction });

          createdFields.push(field);
          logger.debug(`  Created field: ${field.title} (${field.type})`);
        }

        console.log(`📋 [MAIN FORM IMPORT] STEP 2: Created ${createdFields.length} fields`);
        logger.info(`✅ Created ${createdFields.length} field records`);
      }

      await transaction.commit();
      console.log(`📋 [SHEET IMPORT] STEP 3 COMPLETE: Transaction committed successfully`);

      // STEP 4: Create dynamic PostgreSQL table (outside transaction)
      const dynamicTableService = new DynamicTableService();
      let tableName = null;

      try {
        if (isSubForm && subFormId) {
          // Create sub-form table
          const parentForm = await Form.findByPk(parentFormId);
          tableName = await dynamicTableService.createSubFormTable(
            {
              id: subFormId,
              title: name.trim(),
              fields: createdFields
            },
            parentForm.table_name,
            parentFormId
          );

          // Update SubForm with table_name
          await SubForm.update(
            { table_name: tableName },
            { where: { id: subFormId } }
          );

        } else {
          // Create main form table
          tableName = await dynamicTableService.createFormTable({
            id: form.id,
            title: form.title,
            fields: createdFields
          });

          // Update Form with table_name
          form.table_name = tableName;
          await form.save();
        }

        console.log(`📋 [SHEET IMPORT] STEP 4 COMPLETE: Dynamic table created - ${tableName}`);
        logger.info(`✅ Created dynamic table: ${tableName}`);

      } catch (tableError) {
        console.error(`📋 [SHEET IMPORT] STEP 4 ERROR:`, tableError.message);
        logger.error(`Failed to create dynamic table:`, tableError);
        // Don't fail the entire operation, table can be created later
      }

      // STEP 5: Import data as Submissions (if rows provided)
      let importedRows = 0;
      let importResult = { successCount: 0, failedCount: 0, errors: [] }; // ✅ NEW: Store full import result

      if (sheetData.rows && sheetData.rows.length > 0) {
        console.log(`📋 [SHEET IMPORT] STEP 5 START: Importing ${sheetData.rows.length} rows`);
        try {
          importResult = await this._importSheetDataAsSubmissions(
            isSubForm ? parentFormId : form.id,
            createdFields,
            sheetData.rows,
            selectedColumns,
            userId,
            isSubForm ? subFormId : null, // ✅ NEW: Pass subFormId
            foreignKeyMappings // ✅ NEW: Pass FK mappings
          );
          importedRows = importResult.successCount; // ✅ Extract successCount from result
          console.log(`📋 [SHEET IMPORT] STEP 5 COMPLETE: Imported ${importResult.successCount}/${sheetData.rows.length} rows (${importResult.failedCount} failed)`);
          logger.info(`✅ Imported ${importResult.successCount}/${sheetData.rows.length} rows as submissions`);

          // ✅ NEW: Log warnings if any rows failed
          if (importResult.failedCount > 0) {
            logger.warn(`⚠️  ${importResult.failedCount} rows failed during import`);
          }
        } catch (importError) {
          console.error(`📋 [SHEET IMPORT] STEP 5 ERROR:`, importError.message);
          logger.error(`Data import failed:`, importError);
          // Don't fail if import fails, form is already created
        }
      } else {
        console.log(`📋 [SHEET IMPORT] STEP 5 SKIPPED: No data rows to import`);
      }

      const result = {
        formId: isSubForm ? parentFormId : form.id,
        subFormId: isSubForm ? subFormId : null,
        tableName,
        fieldsCreated: createdFields.length,
        dataImported: importedRows,
        failedCount: importResult.failedCount, // ✅ NEW: Include failed count
        importErrors: importResult.errors, // ✅ NEW: Include error details
        isSubForm
      };

      console.log(`📋 [SHEET IMPORT] SUCCESS: Form creation complete`, result);
      return result;

    } catch (error) {
      await transaction.rollback();
      logger.error('Form creation from sheet failed:', error);
      throw error;
    }
  }

  /**
   * Import sheet rows as Submission records
   *
   * @param {string} formId - Form ID
   * @param {Array} fields - Field records
   * @param {Array} rows - Sheet data rows
   * @param {Array} selectedColumns - Column mappings
   * @param {string} userId - User ID
   * @param {string|null} subFormId - Sub-form ID (if sub-form)
   * @param {Array} foreignKeyMappings - FK mappings for sub-forms
   * @returns {Promise<number>} Number of successfully imported rows
   */
  async _importSheetDataAsSubmissions(formId, fields, rows, selectedColumns, userId, subFormId = null, foreignKeyMappings = []) {
    const SubmissionService = require('./SubmissionService');
    const { Submission, SubmissionData } = require('../models');
    let successCount = 0;
    const importErrors = []; // ✅ NEW: Collect failed row details

    console.log(`📋 [DATA IMPORT] Starting import of ${rows.length} rows for form ${formId}`);

    // ✅ NEW: Log FK mapping info if sub-form
    if (subFormId && foreignKeyMappings.length > 0) {
      console.log(`🔗 [DATA IMPORT] Sub-form detected with ${foreignKeyMappings.length} FK mappings`);
      console.log(`🔗 [DATA IMPORT] FK Mappings:`, foreignKeyMappings);
    }

    // ✅ DEBUG: Log selectedColumns structure (first item)
    if (selectedColumns.length > 0) {
      console.log(`📋 [DATA IMPORT DEBUG] selectedColumns[0]:`, JSON.stringify(selectedColumns[0]));
      console.log(`📋 [DATA IMPORT DEBUG] First row sample:`, rows[0]);
    }

    // Create column name → field ID mapping
    const columnToFieldMap = {};
    selectedColumns.forEach((col, index) => {
      if (fields[index]) {
        columnToFieldMap[col.columnName] = fields[index].id;
      }
    });

    // ✅ CRITICAL FIX: Pre-load ALL parent submissions for FK resolution
    // This prevents database query in loop which causes deadlock
    let parentSubmissionsMap = new Map();
    if (subFormId && foreignKeyMappings.length > 0) {
      console.log(`🔗 [DATA IMPORT] Pre-loading parent submissions for FK resolution...`);

      const mapping = foreignKeyMappings[0];
      if (mapping && mapping.parentFieldId) {
        try {
          // ✅ CRITICAL FIX v0.8.0.1: Query DYNAMIC TABLE instead of EAV table
          // Google Sheets import stores data in dynamic tables, NOT submission_data (EAV)
          // Find parent form table name
          const { Form } = require('../models');
          const parentForm = await Form.findByPk(formId);

          if (!parentForm || !parentForm.table_name) {
            console.error(`❌ [DATA IMPORT] Parent form ${formId} has no table_name`);
            throw new Error('Parent form table not found');
          }

          const parentTableName = parentForm.table_name;
          console.log(`🔗 [DATA IMPORT] Querying parent table: ${parentTableName}`);

          // Find parent field to get column name
          const { Field } = require('../models');
          const parentField = await Field.findByPk(mapping.parentFieldId);

          if (!parentField) {
            console.error(`❌ [DATA IMPORT] Parent field ${mapping.parentFieldId} not found`);
            throw new Error('Parent field not found');
          }

          // Get column name from dynamic table (may be renamed, e.g., "ID" → "id_field")
          const { generateColumnName } = require('../utils/tableNameHelper');
          const columnName = await generateColumnName(parentField.title);
          console.log(`🔗 [DATA IMPORT] FK column: "${parentField.title}" → "${columnName}"`);

          // Query dynamic table directly (NOT EAV table)
          // ✅ FIX: Main form tables don't have parent_id column, only subform tables do
          // ✅ FIX v0.8.0.2: Remove array destructuring - QueryTypes.SELECT returns array directly
          const parentRows = await sequelize.query(
            `SELECT id, ${columnName} FROM "${parentTableName}"`,
            { type: sequelize.QueryTypes.SELECT }
          );

          // Build Map: field value → submission ID
          if (Array.isArray(parentRows)) {
            parentRows.forEach(row => {
              const fkValue = row[columnName];
              if (fkValue !== null && fkValue !== undefined && fkValue !== '') {
                const key = String(fkValue).trim();
                parentSubmissionsMap.set(key, row.id);
              }
            });
          }

          console.log(`🔗 [DATA IMPORT] Loaded ${parentSubmissionsMap.size} parent submissions into memory`);
        } catch (preloadError) {
          console.error(`❌ [DATA IMPORT] Failed to pre-load parent submissions:`, preloadError.message);
          console.error(preloadError.stack);
          // Continue anyway, will create orphan submissions
        }
      }
    }

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];

      // Log progress every 10 rows
      if (rowIndex % 10 === 0) {
        console.log(`📋 [DATA IMPORT] Progress: ${rowIndex}/${rows.length} rows (${Math.round(rowIndex/rows.length*100)}%)`);
      }

      try {
        // Build submission data
        const submissionData = {};

        selectedColumns.forEach((col, colIndex) => {
          const fieldId = fields[colIndex]?.id;
          const field = fields[colIndex];

          // ✅ CRITICAL FIX: Use col.columnIndex (original sheet column index) instead of col.order
          // col.columnIndex is the ACTUAL column position in the Google Sheet
          // col.order is just the display order (may not match sheet position if user skipped columns)
          const sheetColumnIndex = col.columnIndex !== undefined ? col.columnIndex : colIndex;
          const value = row[sheetColumnIndex];

          // Debug log for first row
          if (rowIndex === 0 && colIndex < 3) {
            console.log(`📋 [DEBUG] colIndex=${colIndex}, col.columnIndex=${col.columnIndex}, sheetColumnIndex=${sheetColumnIndex}, value="${value}"`);
          }

          if (fieldId && value !== null && value !== undefined && value !== '') {
            // ✅ FIX: Transform data based on field type before validation
            const transformedValue = this._transformValueForFieldType(value, field.type);

            // Debug: Log transformation for date/time/phone fields
            if (['date', 'time', 'phone'].includes(field.type) && rowIndex < 3) {
              console.log(`🔄 Transform [${field.type}] "${value}" → "${transformedValue}"`);
            }

            submissionData[fieldId] = transformedValue;
          }
        });

        // Skip empty rows
        if (Object.keys(submissionData).length === 0) {
          continue;
        }

        // Create submission via SubmissionService
        // ✅ FIX: SubmissionService.createSubmission expects { fieldData, status?, parentId?, subFormId? }
        // ✅ NEW: Add skipValidation flag for Google Sheets import

        const submissionOptions = {
          fieldData: submissionData,
          status: 'submitted',
          skipValidation: true // ✅ CRITICAL: Skip validation for Google Sheets import
        };

        // ✅ NEW: For sub-forms, add subFormId and resolve parentId
        if (subFormId) {
          submissionOptions.subFormId = subFormId;

          // ✅ CRITICAL FIX: Use SHEET column index, not field index!
          if (foreignKeyMappings && foreignKeyMappings.length > 0 && parentSubmissionsMap.size > 0) {
            const mapping = foreignKeyMappings[0];
            const subFormColumnName = mapping.subFormFieldName;

            // Find the column configuration for FK field
            const fkColumn = selectedColumns.find(col => col.columnName === subFormColumnName);

            if (fkColumn) {
              // Use columnIndex from the column config (actual Google Sheets column index)
              const sheetColumnIndex = fkColumn.columnIndex !== undefined ? fkColumn.columnIndex : selectedColumns.indexOf(fkColumn);
              const subFormValue = row[sheetColumnIndex];

              if (subFormValue) {
                const trimmedValue = String(subFormValue).trim();
                const parentId = parentSubmissionsMap.get(trimmedValue);

                if (parentId) {
                  submissionOptions.parentId = parentId;
                  submissionOptions.main_form_subid = trimmedValue; // ✅ Store FK value for reference
                  if (rowIndex === 0) {
                    console.log(`🔗 [DATA IMPORT] FK Resolution: First row linked to parent ${parentId} (FK value: "${trimmedValue}")`);
                  }
                } else {
                  if (rowIndex < 5) {
                    console.warn(`⚠️  [DATA IMPORT] Row ${rowIndex + 1}: No parent found for value "${trimmedValue}"`);
                  }
                }
              }
            } else {
              console.warn(`⚠️  [DATA IMPORT] FK column "${subFormColumnName}" not found in selectedColumns`);
            }
          }
        }

        await SubmissionService.createSubmission(formId, userId, submissionOptions);
        successCount++;

      } catch (rowError) {
        console.warn(`📋 [DATA IMPORT] Row ${rowIndex + 1} failed:`, rowError.message);
        logger.warn(`Failed to import row ${rowIndex + 1}:`, rowError.message);

        // ✅ NEW: Collect error details for user feedback
        const errorDetails = {
          rowNumber: rowIndex + 1,
          rowData: row.slice(0, 5), // First 5 columns as sample
          error: rowError.message,
          fieldName: this._extractFieldNameFromError(rowError.message)
        };

        importErrors.push(errorDetails);
        // Continue with next row
      }
    }

    console.log(`📋 [DATA IMPORT] Complete: ${successCount}/${rows.length} rows imported successfully`);

    // ✅ NEW: Return detailed import results
    if (importErrors.length > 0) {
      console.warn(`⚠️  [DATA IMPORT] ${importErrors.length} rows failed to import`);
    }

    return {
      successCount,
      failedCount: importErrors.length,
      errors: importErrors.slice(0, 10) // Return max 10 errors to avoid large responses
    };
  }

  /**
   * Extract field name from error message
   * Helps identify which field caused the import error
   *
   * @param {string} errorMessage - Error message from database or validation
   * @returns {string|null} Field name or null if not identifiable
   */
  _extractFieldNameFromError(errorMessage) {
    // Look for "column <name>" pattern
    const columnMatch = errorMessage.match(/column ['""](\w+)['""]/i);
    if (columnMatch) {
      return columnMatch[1];
    }

    // Look for "character varying(N)" pattern - indicates phone field
    if (errorMessage.includes('character varying') && errorMessage.includes('too long')) {
      return 'phone (or other text field)';
    }

    // Look for "constraint" pattern
    const constraintMatch = errorMessage.match(/constraint ['""](\w+)['""]/i);
    if (constraintMatch) {
      return `constraint: ${constraintMatch[1]}`;
    }

    return 'unknown field';
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
   * Resolve parent submission ID using FK mappings
   * Searches for parent submission where parent field value matches subform field value
   *
   * @param {Array} foreignKeyMappings - FK mapping configuration
   *   Example: [
   *     {
   *       subFormFieldName: 'รหัสลูกค้า',
   *       subFormFieldType: 'short_answer',
   *       parentFieldId: 'uuid-of-parent-field',
   *       parentFieldName: 'Customer ID',
   *       parentFieldType: 'short_answer'
   *     }
   *   ]
   * @param {Array} row - Current sheet row data
   * @param {string} parentFormId - Parent form ID
   * @param {Object} columnToFieldMap - Mapping of column names to field IDs
   * @returns {Promise<string|null>} Parent submission ID or null if not found
   */
  async _resolveParentSubmission(foreignKeyMappings, row, parentFormId, columnToFieldMap) {
    const { Submission, SubmissionData } = require('../models');

    console.log(`🔗 [FK RESOLUTION] Starting with ${foreignKeyMappings.length} FK mappings`);
    console.log(`🔗 [FK RESOLUTION] Mappings:`, JSON.stringify(foreignKeyMappings, null, 2));

    // Use the first FK mapping (typically there's only one for subforms)
    const mapping = foreignKeyMappings[0];
    if (!mapping) {
      console.warn(`⚠️  [FK RESOLUTION] No FK mapping provided`);
      return null;
    }

    // Get the value from the subform row
    const subFormColumnName = mapping.subFormFieldName;

    console.log(`🔗 [FK RESOLUTION] Looking for column "${subFormColumnName}" in columnToFieldMap`);
    console.log(`🔗 [FK RESOLUTION] Available columns in map:`, Object.keys(columnToFieldMap));

    const subFormFieldId = columnToFieldMap[subFormColumnName];

    if (!subFormFieldId) {
      console.warn(`⚠️  [FK RESOLUTION] Could not find field ID for column "${subFormColumnName}"`);
      return null;
    }

    // Find the value in the row
    // The columnToFieldMap keys are in the same order as selectedColumns
    // which matches the order of fields we created
    const columnNames = Object.keys(columnToFieldMap);
    const columnIndex = columnNames.indexOf(subFormColumnName);

    if (columnIndex === -1) {
      console.warn(`⚠️  [FK RESOLUTION] Column "${subFormColumnName}" not found in column list`);
      return null;
    }

    const subFormValue = row[columnIndex];

    if (!subFormValue || subFormValue === null || subFormValue === undefined || subFormValue === '') {
      console.warn(`⚠️  [FK RESOLUTION] No value found in subform row at index ${columnIndex} for column "${subFormColumnName}"`);
      return null;
    }

    const trimmedValue = String(subFormValue).trim();
    console.log(`🔗 [FK RESOLUTION] Subform value for "${subFormColumnName}": "${trimmedValue}"`);
    console.log(`🔗 [FK RESOLUTION] Looking for parent where field ${mapping.parentFieldId} = "${trimmedValue}"`);

    // Search for parent submission
    try {
      const parentSubmission = await Submission.findOne({
        where: {
          form_id: parentFormId,
          parent_id: null // Parent submissions have no parent
        },
        include: [
          {
            model: SubmissionData,
            as: 'submissionData', // ✅ FIX: Use correct alias from Submission model
            where: {
              field_id: mapping.parentFieldId,
              value: trimmedValue
            },
            required: true
          }
        ]
      });

      if (parentSubmission) {
        console.log(`✅ [FK RESOLUTION] Found parent submission: ${parentSubmission.id}`);
        return parentSubmission.id;
      } else {
        console.warn(`⚠️  [FK RESOLUTION] No parent submission found with ${mapping.parentFieldName} = "${trimmedValue}"`);
        return null;
      }
    } catch (error) {
      console.error(`❌ [FK RESOLUTION] Database query error:`, error.message);
      throw error;
    }
  }
}

module.exports = new SheetFormCreationService();
