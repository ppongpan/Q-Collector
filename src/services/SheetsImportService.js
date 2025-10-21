/**
 * Google Sheets Import Service
 * Frontend service for interacting with Google Sheets Import API
 *
 * Part of Google Sheets Import System v0.8.0
 * Phase 4: Frontend Service Client
 */

import apiClient from './ApiClient';

class SheetsImportService {
  /**
   * Preview Google Sheet data
   * Fetches headers, first 5 rows, and field type detections
   *
   * @param {string} sheetUrl - Google Sheets URL
   * @param {string} sheetName - Sheet name (default: "Sheet1")
   * @returns {Promise<Object>} - { headers, sample_rows, total_rows, field_detections }
   */
  async fetchSheetPreview(sheetUrl, sheetName = 'Sheet1') {
    try {
      const response = await apiClient.post('/sheets/preview', {
        sheet_url: sheetUrl,
        sheet_name: sheetName
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching sheet preview:', error);
      throw new Error(
        error.response?.data?.error?.message ||
        'Failed to preview Google Sheet. Please check the URL and try again.'
      );
    }
  }

  /**
   * Create import configuration
   *
   * @param {Object} config - Import configuration
   * @param {string} config.form_id - Target form ID
   * @param {string} config.sheet_url - Google Sheets URL
   * @param {string} config.sheet_name - Sheet name
   * @param {Object} config.field_mapping - Column → Field ID mapping
   * @returns {Promise<Object>} - Created configuration
   */
  async createImportConfig(config) {
    try {
      const response = await apiClient.post('/sheets/configs', config);
      return response.data;
    } catch (error) {
      console.error('Error creating import config:', error);
      throw new Error(
        error.response?.data?.error?.message ||
        'Failed to create import configuration.'
      );
    }
  }

  /**
   * Get user's import configurations
   *
   * @param {number} limit - Max number of configs to return
   * @returns {Promise<Array>} - Array of configurations
   */
  async getImportConfigs(limit = 50) {
    try {
      const response = await apiClient.get('/sheets/configs', {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching import configs:', error);
      throw new Error('Failed to fetch import configurations.');
    }
  }

  /**
   * Execute import from configuration
   *
   * @param {string} configId - Configuration ID
   * @returns {Promise<Object>} - Import result with statistics
   */
  async executeImport(configId) {
    try {
      const response = await apiClient.post(`/sheets/configs/${configId}/execute`);
      return response.data;
    } catch (error) {
      console.error('Error executing import:', error);
      throw new Error(
        error.response?.data?.error?.message ||
        'Failed to execute import. Please try again.'
      );
    }
  }

  /**
   * Get import history
   *
   * @param {number} limit - Max number of records to return
   * @returns {Promise<Array>} - Array of import history records
   */
  async getImportHistory(limit = 50) {
    try {
      const response = await apiClient.get('/sheets/history', {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching import history:', error);
      throw new Error('Failed to fetch import history.');
    }
  }

  /**
   * Rollback an import (delete all submissions created)
   *
   * @param {string} historyId - Import history ID
   * @returns {Promise<Object>} - { deleted_count }
   */
  async rollbackImport(historyId) {
    try {
      const response = await apiClient.post(`/sheets/history/${historyId}/rollback`);
      return response.data;
    } catch (error) {
      console.error('Error rolling back import:', error);
      throw new Error(
        error.response?.data?.error?.message ||
        'Failed to rollback import. Please try again.'
      );
    }
  }

  /**
   * Delete an import configuration
   *
   * @param {string} configId - Configuration ID
   * @returns {Promise<void>}
   */
  async deleteConfig(configId) {
    try {
      await apiClient.delete(`/sheets/configs/${configId}`);
    } catch (error) {
      console.error('Error deleting config:', error);
      throw new Error('Failed to delete configuration.');
    }
  }

  /**
   * Detect field changes between sheet columns and form fields
   * Helper method for UI to determine which columns map to which fields
   *
   * @param {Array<string>} sheetHeaders - Column names from sheet
   * @param {Array<Object>} formFields - Form fields
   * @returns {Array<Object>} - Suggested mappings
   */
  detectFieldChanges(sheetHeaders, formFields) {
    const mappings = [];

    sheetHeaders.forEach((header, index) => {
      // Try to find matching field by title (case-insensitive)
      const matchingField = formFields.find(field =>
        field.title.toLowerCase() === header.toLowerCase()
      );

      mappings.push({
        column_name: header,
        column_index: index,
        column_letter: this._indexToColumnLetter(index),
        suggested_field: matchingField || null,
        field_id: matchingField?.id || null,
        field_type: matchingField?.type || 'short_answer'
      });
    });

    return mappings;
  }

  /**
   * Convert column index to letter (0 → A, 1 → B, 25 → Z, 26 → AA, etc.)
   * @private
   * @param {number} index - Column index (0-based)
   * @returns {string} - Column letter
   */
  _indexToColumnLetter(index) {
    let letter = '';
    let temp = index + 1;

    while (temp > 0) {
      const remainder = (temp - 1) % 26;
      letter = String.fromCharCode(65 + remainder) + letter;
      temp = Math.floor((temp - 1) / 26);
    }

    return letter;
  }

  /**
   * Validate sheet URL format
   *
   * @param {string} url - URL to validate
   * @returns {boolean}
   */
  isValidSheetUrl(url) {
    const pattern = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9-_]+/;
    return pattern.test(url);
  }

  /**
   * Extract sheet ID from URL
   *
   * @param {string} url - Google Sheets URL
   * @returns {string|null} - Sheet ID or null
   */
  extractSheetId(url) {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  }
}

// Export singleton instance
export default new SheetsImportService();
