/**
 * GoogleSheetsService
 * Service for fetching data from Google Sheets using Google Sheets API v4
 *
 * Part of Google Sheets Import System v0.8.0
 * Phase 2: Backend Services
 */

const { google } = require('googleapis');
const logger = require('../utils/logger.util');

class GoogleSheetsService {
  constructor() {
    this.sheets = null;
    this.apiKey = process.env.GOOGLE_API_KEY;

    if (!this.apiKey) {
      logger.warn('GOOGLE_API_KEY not set - Google Sheets functionality will be limited');
    }
  }

  /**
   * Initialize Google Sheets API client
   * @private
   */
  _initSheetsClient() {
    if (!this.sheets) {
      if (!this.apiKey) {
        throw new Error('GOOGLE_API_KEY environment variable is not set');
      }

      this.sheets = google.sheets({
        version: 'v4',
        auth: this.apiKey
      });

      logger.info('Google Sheets API client initialized');
    }

    return this.sheets;
  }

  /**
   * Extract Google Sheet ID from URL
   *
   * @param {string} url - Google Sheets URL
   * @returns {string} - Sheet ID
   * @throws {Error} - If URL is invalid
   *
   * @example
   * extractSheetId('https://docs.google.com/spreadsheets/d/ABC123/edit')
   * // Returns: 'ABC123'
   */
  extractSheetId(url) {
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL: URL must be a non-empty string');
    }

    // Support formats:
    // 1. /spreadsheets/d/{ID}/edit...
    // 2. /spreadsheets/d/{ID}
    const pattern = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const match = url.match(pattern);

    if (!match || !match[1]) {
      throw new Error(
        'Invalid Google Sheets URL format. ' +
        'Expected format: https://docs.google.com/spreadsheets/d/{ID}/...'
      );
    }

    const sheetId = match[1];
    logger.debug(`Extracted sheet ID: ${sheetId}`);

    return sheetId;
  }

  /**
   * Fetch data from a PUBLIC Google Sheet
   *
   * @param {string} sheetUrl - Google Sheets URL
   * @param {string} sheetName - Name of the sheet/tab (default: 'Sheet1')
   * @returns {Promise<Array<Array<string>>>} - 2D array of sheet data [[headers], [row1], [row2], ...]
   * @throws {Error} - If sheet is not accessible or API error occurs
   *
   * @example
   * const data = await fetchSheetDataPublic('https://docs.google.com/...', 'Sheet1');
   * // Returns: [['Name', 'Email'], ['John', 'john@example.com'], ...]
   */
  async fetchSheetDataPublic(sheetUrl, sheetName = 'Sheet1') {
    try {
      // Extract sheet ID from URL
      const sheetId = this.extractSheetId(sheetUrl);

      // Initialize client
      const sheets = this._initSheetsClient();

      // Define range to fetch (all columns A to ZZ)
      const range = `${sheetName}!A1:ZZ`;

      logger.info(`Fetching data from sheet: ${sheetId}, range: ${range}`);

      // Fetch data using Google Sheets API v4
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
        valueRenderOption: 'FORMATTED_VALUE', // Get formatted values (dates, numbers as strings)
        dateTimeRenderOption: 'FORMATTED_STRING' // Get dates as formatted strings
      });

      const rows = response.data.values || [];

      if (rows.length === 0) {
        logger.warn(`No data found in sheet: ${sheetId}`);
        return [];
      }

      logger.info(`Successfully fetched ${rows.length} rows from Google Sheet`);

      return rows;

    } catch (error) {
      // Handle specific API errors
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.error?.message || error.message;

        if (status === 403) {
          throw new Error(
            'Access denied: Sheet is not public or API key is invalid. ' +
            'Make sure the sheet is shared with "Anyone with the link".'
          );
        } else if (status === 404) {
          throw new Error(
            'Sheet not found: The spreadsheet or tab name does not exist. ' +
            'Check the URL and sheet name.'
          );
        } else if (status === 400) {
          throw new Error(`Invalid request: ${message}`);
        } else {
          throw new Error(`Google Sheets API error (${status}): ${message}`);
        }
      }

      // Generic error handling
      logger.error('Error fetching Google Sheet data:', error);
      throw new Error(`Failed to fetch Google Sheet data: ${error.message}`);
    }
  }

  /**
   * Detect field types from sheet data by analyzing column patterns
   *
   * @param {Array<string>} headers - Column headers
   * @param {Array<Array<string>>} sampleRows - Sample data rows (first 10 recommended)
   * @returns {Array<Object>} - Array of detected field types
   *
   * @example
   * const headers = ['Name', 'Email', 'Phone'];
   * const rows = [['John', 'john@test.com', '0812345678'], ...];
   * const types = detectFieldTypes(headers, rows);
   * // Returns:
   * // [
   * //   { column_name: 'Name', column_index: 0, detected_type: 'short_answer', confidence: 1.0, sample_values: [...] },
   * //   { column_name: 'Email', column_index: 1, detected_type: 'email', confidence: 0.95, sample_values: [...] },
   * //   { column_name: 'Phone', column_index: 2, detected_type: 'phone', confidence: 0.90, sample_values: [...] }
   * // ]
   */
  detectFieldTypes(headers, sampleRows) {
    if (!headers || !Array.isArray(headers)) {
      throw new Error('Invalid headers: must be an array');
    }

    if (!sampleRows || !Array.isArray(sampleRows)) {
      throw new Error('Invalid sampleRows: must be an array');
    }

    logger.info(`Detecting field types for ${headers.length} columns from ${sampleRows.length} sample rows`);

    const results = [];

    // Process each column
    headers.forEach((header, columnIndex) => {
      // Extract column values from sample rows
      const columnValues = sampleRows
        .map(row => row[columnIndex])
        .filter(value => value !== undefined && value !== null && value !== '');

      // Skip empty columns
      if (columnValues.length === 0) {
        results.push({
          column_name: header,
          column_index: columnIndex,
          detected_type: 'short_answer',
          confidence: 0,
          sample_values: [],
          reason: 'No data in column'
        });
        return;
      }

      // Detect type based on patterns
      const detection = this._detectColumnType(columnValues);

      results.push({
        column_name: header,
        column_index: columnIndex,
        detected_type: detection.type,
        confidence: detection.confidence,
        sample_values: columnValues.slice(0, 3), // First 3 samples
        reason: detection.reason
      });
    });

    logger.info(`Field type detection complete: ${results.length} columns analyzed`);

    return results;
  }

  /**
   * Detect data type for a single column
   * @private
   * @param {Array<string>} values - Column values
   * @returns {Object} - { type, confidence, reason }
   */
  _detectColumnType(values) {
    const total = values.length;
    let matchCounts = {
      email: 0,
      phone: 0,
      number: 0,
      date: 0,
      url: 0
    };

    // Count pattern matches
    values.forEach(value => {
      const str = String(value).trim();

      // Email pattern: contains @ and domain
      if (this._isEmail(str)) {
        matchCounts.email++;
      }

      // Thai phone pattern: 0XXXXXXXXX (10 digits starting with 0)
      if (this._isThaiPhone(str)) {
        matchCounts.phone++;
      }

      // Number pattern: valid number
      if (this._isNumber(str)) {
        matchCounts.number++;
      }

      // Date pattern: DD/MM/YYYY or YYYY-MM-DD
      if (this._isDate(str)) {
        matchCounts.date++;
      }

      // URL pattern: starts with http/https
      if (this._isUrl(str)) {
        matchCounts.url++;
      }
    });

    // Calculate confidence percentages
    const confidences = {
      email: matchCounts.email / total,
      phone: matchCounts.phone / total,
      number: matchCounts.number / total,
      date: matchCounts.date / total,
      url: matchCounts.url / total
    };

    // Determine best match (threshold: 0.8 = 80%)
    const threshold = 0.8;

    // Priority order: email > phone > url > date > number
    if (confidences.email >= threshold) {
      return {
        type: 'email',
        confidence: confidences.email,
        reason: `${Math.round(confidences.email * 100)}% email pattern match`
      };
    }

    if (confidences.phone >= threshold) {
      return {
        type: 'phone',
        confidence: confidences.phone,
        reason: `${Math.round(confidences.phone * 100)}% Thai phone pattern match`
      };
    }

    if (confidences.url >= threshold) {
      return {
        type: 'url',
        confidence: confidences.url,
        reason: `${Math.round(confidences.url * 100)}% URL pattern match`
      };
    }

    if (confidences.date >= threshold) {
      return {
        type: 'date',
        confidence: confidences.date,
        reason: `${Math.round(confidences.date * 100)}% date pattern match`
      };
    }

    // For numbers, use higher threshold (0.9 = 90%)
    if (confidences.number >= 0.9) {
      return {
        type: 'number',
        confidence: confidences.number,
        reason: `${Math.round(confidences.number * 100)}% number pattern match`
      };
    }

    // Default to short_answer (text)
    return {
      type: 'short_answer',
      confidence: 1.0,
      reason: 'Default text field (no strong pattern detected)'
    };
  }

  /**
   * Pattern matching helper methods
   * @private
   */

  _isEmail(str) {
    // Simple email pattern: xxx@xxx.xxx
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(str);
  }

  _isThaiPhone(str) {
    // Thai phone: 0XXXXXXXXX (10 digits starting with 0)
    const phonePattern = /^0\d{9}$/;
    return phonePattern.test(str.replace(/[\s\-]/g, '')); // Allow spaces and dashes
  }

  _isNumber(str) {
    // Valid number (integer or decimal)
    const num = parseFloat(str);
    return !isNaN(num) && isFinite(num);
  }

  _isDate(str) {
    // DD/MM/YYYY or YYYY-MM-DD
    const datePatterns = [
      /^\d{1,2}\/\d{1,2}\/\d{4}$/, // DD/MM/YYYY or D/M/YYYY
      /^\d{4}-\d{1,2}-\d{1,2}$/    // YYYY-MM-DD or YYYY-M-D
    ];

    return datePatterns.some(pattern => pattern.test(str));
  }

  _isUrl(str) {
    // Starts with http:// or https://
    return /^https?:\/\//i.test(str);
  }

  /**
   * Validate that a Google Sheet is accessible
   *
   * @param {string} sheetUrl - Google Sheets URL
   * @param {string} sheetName - Name of the sheet/tab
   * @returns {Promise<Object>} - { accessible: boolean, rowCount: number, error: string }
   */
  async validateSheetAccess(sheetUrl, sheetName = 'Sheet1') {
    try {
      const data = await this.fetchSheetDataPublic(sheetUrl, sheetName);

      return {
        accessible: true,
        rowCount: data.length,
        error: null
      };

    } catch (error) {
      return {
        accessible: false,
        rowCount: 0,
        error: error.message
      };
    }
  }

  /**
   * Get sheet metadata (title, tabs, etc.)
   *
   * @param {string} sheetUrl - Google Sheets URL
   * @returns {Promise<Object>} - Sheet metadata
   */
  async getSheetMetadata(sheetUrl) {
    try {
      const sheetId = this.extractSheetId(sheetUrl);
      const sheets = this._initSheetsClient();

      const response = await sheets.spreadsheets.get({
        spreadsheetId: sheetId,
        fields: 'properties,sheets.properties'
      });

      const metadata = {
        title: response.data.properties.title,
        locale: response.data.properties.locale,
        timeZone: response.data.properties.timeZone,
        sheets: response.data.sheets.map(sheet => ({
          title: sheet.properties.title,
          sheetId: sheet.properties.sheetId,
          index: sheet.properties.index,
          rowCount: sheet.properties.gridProperties.rowCount,
          columnCount: sheet.properties.gridProperties.columnCount
        }))
      };

      logger.info(`Retrieved metadata for sheet: ${metadata.title}`);

      return metadata;

    } catch (error) {
      logger.error('Error fetching sheet metadata:', error);
      throw new Error(`Failed to fetch sheet metadata: ${error.message}`);
    }
  }
}

// Export singleton instance
module.exports = new GoogleSheetsService();
