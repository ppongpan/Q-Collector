/**
 * Google Sheets Import Routes v0.8.0-revised
 * API endpoints for creating forms from Google Sheets
 * All endpoints require Super Admin access
 */

const express = require('express');
const router = express.Router();
const GoogleSheetsService = require('../../services/GoogleSheetsService');
const SheetFormCreationService = require('../../services/SheetFormCreationService');
const { authenticate, requireSuperAdmin } = require('../../middleware/auth.middleware');
const { ApiError } = require('../../middleware/error.middleware');
const logger = require('../../utils/logger.util');

// All routes require authentication and Super Admin role
router.use(authenticate);
router.use(requireSuperAdmin);

/**
 * POST /api/v1/sheets/preview
 * Preview Google Sheet data + metadata
 *
 * Body:
 *   - sheet_url: Google Sheets URL
 *   - sheet_name: Sheet name (default: "Sheet1")
 *
 * Response:
 *   - headers: Array of column names
 *   - rows: All data rows
 *   - metadata: { sheetName, sheetId, rowCount, colCount }
 */
router.post('/preview', async (req, res, next) => {
  try {
    const { sheet_url, sheet_name = 'Sheet1' } = req.body;

    if (!sheet_url) {
      throw new ApiError(400, 'sheet_url is required', 'MISSING_SHEET_URL');
    }

    logger.info(`Previewing sheet: ${sheet_url} (${sheet_name}) by ${req.user.username}`);

    // Fetch sheet data
    const rows = await GoogleSheetsService.fetchSheetDataPublic(sheet_url, sheet_name);

    if (!rows || rows.length === 0) {
      throw new ApiError(404, 'Sheet is empty or not found', 'SHEET_EMPTY');
    }

    // Extract headers and data rows
    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Extract sheet ID from URL
    const sheetIdMatch = sheet_url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const sheetId = sheetIdMatch ? sheetIdMatch[1] : null;

    res.json({
      success: true,
      data: {
        headers,
        rows: dataRows,
        metadata: {
          sheetName: sheet_name,
          sheetId,
          rowCount: dataRows.length,
          colCount: headers.length
        }
      },
    });
  } catch (error) {
    logger.error('Sheet preview error:', error);
    next(error);
  }
});

/**
 * POST /api/v1/sheets/detect-field-types
 * Auto-detect field types from column names and sample data
 *
 * Body:
 *   - headers: Array of column names
 *   - sampleRows: Array of sample data rows (first 50)
 *
 * Response:
 *   - detectedTypes: Array of { columnName, detectedType: { type, confidence }, sampleValues }
 */
router.post('/detect-field-types', async (req, res, next) => {
  try {
    const { headers, sampleRows } = req.body;

    if (!headers || !Array.isArray(headers) || headers.length === 0) {
      throw new ApiError(400, 'headers must be a non-empty array', 'INVALID_HEADERS');
    }

    if (!sampleRows || !Array.isArray(sampleRows)) {
      throw new ApiError(400, 'sampleRows must be an array', 'INVALID_SAMPLE_ROWS');
    }

    logger.info(`Detecting field types for ${headers.length} columns by ${req.user.username}`);

    const detectedTypes = await SheetFormCreationService.detectFieldTypes(
      headers,
      sampleRows
    );

    res.json({
      success: true,
      data: { detectedTypes },
    });
  } catch (error) {
    logger.error('Field type detection error:', error);
    next(error);
  }
});

/**
 * POST /api/v1/sheets/create-form-from-sheet
 * Create new form from Google Sheet structure
 *
 * Body:
 *   - sheetData: { headers: [], rows: [], metadata: {} }
 *   - formConfig: {
 *       name: string,
 *       description: string,
 *       isSubForm: boolean,
 *       parentFormId: string (if sub-form),
 *       selectedColumns: Array of { columnName, fieldType, order, required, options, validation_rules },
 *       roles_allowed: Array of role strings,
 *       foreignKeyMappings: Array of { subFormFieldName, subFormFieldType, parentFieldId, parentFieldName, parentFieldType } (for sub-forms)
 *     }
 *
 * Response:
 *   - formId: Created form ID
 *   - subFormId: Created sub-form ID (if sub-form)
 *   - tableName: Created database table name
 *   - fieldsCreated: Number of fields created
 *   - dataImported: Number of rows imported
 */
router.post('/create-form-from-sheet', async (req, res, next) => {
  // Extend timeout to 10 minutes for large imports
  req.setTimeout(600000); // 10 minutes
  res.setTimeout(600000); // 10 minutes

  console.log(`📋 [API] create-form-from-sheet request received at ${new Date().toISOString()}`);

  try {
    const { sheetData, formConfig } = req.body;

    // Validation
    if (!sheetData || !sheetData.headers || !formConfig) {
      throw new ApiError(
        400,
        'Missing required fields: sheetData (with headers), formConfig',
        'MISSING_REQUIRED_FIELDS'
      );
    }

    if (!formConfig.name || !formConfig.selectedColumns || formConfig.selectedColumns.length === 0) {
      throw new ApiError(
        400,
        'formConfig must include name and non-empty selectedColumns',
        'INVALID_FORM_CONFIG'
      );
    }

    logger.info(
      `Creating form "${formConfig.name}" from sheet by ${req.user.username} (isSubForm: ${formConfig.isSubForm || false})`
    );

    // ✅ NEW: Log FK mappings for sub-forms
    if (formConfig.isSubForm && formConfig.foreignKeyMappings) {
      console.log(`🔗 [API] Foreign Key Mappings (${formConfig.foreignKeyMappings.length}):`,
        formConfig.foreignKeyMappings);
    }

    const result = await SheetFormCreationService.createFormFromSheet(
      req.userId,
      sheetData,
      formConfig
    );

    console.log(`📋 [API] create-form-from-sheet completed successfully at ${new Date().toISOString()}`);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(`📋 [API] create-form-from-sheet ERROR:`, error.message);
    logger.error('Form creation from sheet error:', error);
    next(error);
  }
});

module.exports = router;
