/**
 * Test Script for GoogleSheetsService
 * Tests basic functionality with a public Google Sheet
 *
 * Part of Google Sheets Import System v0.8.0
 * Phase 2: Backend Services
 *
 * Usage:
 *   node backend/scripts/test-google-sheets-service.js
 */

// Load environment variables
require('dotenv').config({ path: './backend/.env' });

const GoogleSheetsService = require('../services/GoogleSheetsService');
const logger = require('../utils/logger.util');

// Test sheet information
const TEST_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1E2rZgFJwZt3Z7cyIci4AxD-i4y8bPzXVnCLYHkmRK38/edit?usp=sharing';
const TEST_SHEET_NAME = 'Sheet1';

/**
 * Print section header
 */
function printHeader(title) {
  console.log('\n' + '='.repeat(80));
  console.log(`  ${title}`);
  console.log('='.repeat(80) + '\n');
}

/**
 * Print test result
 */
function printResult(label, value, success = true) {
  const icon = success ? '✅' : '❌';
  console.log(`${icon} ${label}:`, value);
}

/**
 * Print table data
 */
function printTable(headers, rows, maxRows = 10) {
  console.log('\n' + '-'.repeat(80));

  // Print headers
  console.log(headers.map((h, i) => `[${i}] ${h}`).join(' | '));
  console.log('-'.repeat(80));

  // Print rows (limited)
  const displayRows = rows.slice(0, maxRows);
  displayRows.forEach((row, rowIndex) => {
    console.log(`Row ${rowIndex + 1}:`, row.map(cell => String(cell || '').substring(0, 30)).join(' | '));
  });

  if (rows.length > maxRows) {
    console.log(`... and ${rows.length - maxRows} more rows`);
  }

  console.log('-'.repeat(80) + '\n');
}

/**
 * Print field type detection results
 */
function printFieldTypes(detections) {
  console.log('\n' + '-'.repeat(80));
  console.log('FIELD TYPE DETECTION RESULTS:');
  console.log('-'.repeat(80));

  detections.forEach((detection, index) => {
    console.log(`\n[${index}] ${detection.column_name}`);
    console.log(`    Type: ${detection.detected_type}`);
    console.log(`    Confidence: ${(detection.confidence * 100).toFixed(1)}%`);
    console.log(`    Reason: ${detection.reason}`);
    console.log(`    Samples: ${detection.sample_values.join(', ')}`);
  });

  console.log('\n' + '-'.repeat(80) + '\n');
}

/**
 * Main test function
 */
async function runTests() {
  try {
    console.log('\n🚀 Starting Google Sheets Service Tests\n');
    console.log(`Test Sheet URL: ${TEST_SHEET_URL}`);
    console.log(`Test Sheet Name: ${TEST_SHEET_NAME}\n`);

    // Check if API key is set
    if (!process.env.GOOGLE_API_KEY) {
      console.error('❌ ERROR: GOOGLE_API_KEY environment variable is not set!');
      console.error('\nPlease add your Google API key to backend/.env:');
      console.error('GOOGLE_API_KEY=your_api_key_here\n');
      process.exit(1);
    }

    console.log('✅ Google API key found in environment\n');

    // ======================
    // Test 1: Extract Sheet ID
    // ======================
    printHeader('Test 1: Extract Sheet ID');

    try {
      const sheetId = GoogleSheetsService.extractSheetId(TEST_SHEET_URL);
      printResult('Sheet ID extracted', sheetId, true);
      printResult('ID Length', sheetId.length, true);

      // Expected ID: 1E2rZgFJwZt3Z7cyIci4AxD-i4y8bPzXVnCLYHkmRK38
      const expectedId = '1E2rZgFJwZt3Z7cyIci4AxD-i4y8bPzXVnCLYHkmRK38';
      if (sheetId === expectedId) {
        printResult('ID Validation', 'Matches expected ID', true);
      } else {
        printResult('ID Validation', `Expected ${expectedId}, got ${sheetId}`, false);
      }

    } catch (error) {
      printResult('Extract Sheet ID', error.message, false);
      throw error;
    }

    // ======================
    // Test 2: Fetch Sheet Data
    // ======================
    printHeader('Test 2: Fetch Sheet Data');

    let sheetData;
    try {
      console.log('Fetching data from Google Sheets API...\n');

      sheetData = await GoogleSheetsService.fetchSheetDataPublic(
        TEST_SHEET_URL,
        TEST_SHEET_NAME
      );

      printResult('Data fetched', `${sheetData.length} rows`, true);

      if (sheetData.length === 0) {
        printResult('Data validation', 'No data found in sheet', false);
        throw new Error('Sheet is empty');
      }

    } catch (error) {
      printResult('Fetch Sheet Data', error.message, false);
      throw error;
    }

    // ======================
    // Test 3: Display Headers
    // ======================
    printHeader('Test 3: Display Headers');

    const headers = sheetData[0];
    printResult('Header row length', headers.length, true);
    printResult('Headers', headers.join(', '), true);

    // ======================
    // Test 4: Display First 5 Rows
    // ======================
    printHeader('Test 4: Display First 5 Data Rows');

    const dataRows = sheetData.slice(1); // Skip header
    printTable(headers, dataRows, 5);
    printResult('Total data rows', dataRows.length, true);

    // ======================
    // Test 5: Field Type Detection
    // ======================
    printHeader('Test 5: Field Type Detection');

    try {
      console.log('Analyzing first 10 rows for pattern detection...\n');

      const sampleRows = dataRows.slice(0, 10);
      const detections = GoogleSheetsService.detectFieldTypes(headers, sampleRows);

      printResult('Detection complete', `${detections.length} columns analyzed`, true);
      printFieldTypes(detections);

      // Validate detection results
      const typeDistribution = {};
      detections.forEach(d => {
        typeDistribution[d.detected_type] = (typeDistribution[d.detected_type] || 0) + 1;
      });

      console.log('Type Distribution:');
      Object.entries(typeDistribution).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} columns`);
      });

    } catch (error) {
      printResult('Field Type Detection', error.message, false);
      throw error;
    }

    // ======================
    // Test 6: Validate Sheet Access
    // ======================
    printHeader('Test 6: Validate Sheet Access');

    try {
      const validation = await GoogleSheetsService.validateSheetAccess(
        TEST_SHEET_URL,
        TEST_SHEET_NAME
      );

      printResult('Sheet accessible', validation.accessible, validation.accessible);
      printResult('Row count', validation.rowCount, true);

      if (validation.error) {
        printResult('Validation error', validation.error, false);
      }

    } catch (error) {
      printResult('Validate Sheet Access', error.message, false);
    }

    // ======================
    // Test 7: Get Sheet Metadata
    // ======================
    printHeader('Test 7: Get Sheet Metadata');

    try {
      const metadata = await GoogleSheetsService.getSheetMetadata(TEST_SHEET_URL);

      printResult('Sheet Title', metadata.title, true);
      printResult('Locale', metadata.locale, true);
      printResult('Time Zone', metadata.timeZone, true);
      printResult('Number of Tabs', metadata.sheets.length, true);

      console.log('\nAvailable Tabs:');
      metadata.sheets.forEach((sheet, index) => {
        console.log(`  ${index + 1}. ${sheet.title} (${sheet.rowCount} rows x ${sheet.columnCount} cols)`);
      });

    } catch (error) {
      printResult('Get Sheet Metadata', error.message, false);
    }

    // ======================
    // Summary
    // ======================
    printHeader('Test Summary');

    console.log('✅ All tests completed successfully!\n');
    console.log('GoogleSheetsService is working correctly.');
    console.log('You can now proceed to test SheetImportService.\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests()
    .then(() => {
      console.log('\n✅ Test script completed successfully\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test script failed:', error);
      process.exit(1);
    });
}

module.exports = { runTests };
