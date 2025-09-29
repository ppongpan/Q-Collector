/**
 * Number Formatting Utility for Q-Collector Frontend Framework
 * Provides consistent number formatting across the application
 * Supports Thai number format with comma separators (1,234,567)
 */

/**
 * Format a number for display with comma separators
 * @param {string|number} value - The number value to format
 * @param {Object} options - Formatting options
 * @param {number} options.decimals - Number of decimal places to show
 * @param {boolean} options.preserveDecimals - Whether to preserve original decimal places
 * @returns {string} Formatted number string
 */
export const formatNumberDisplay = (value, options = {}) => {
  // Handle null, undefined, empty string
  if (value === null || value === undefined || value === '') {
    return '';
  }

  // Convert to string and clean up
  const stringValue = String(value).trim();

  // Handle empty or invalid strings
  if (stringValue === '' || stringValue === 'null' || stringValue === 'undefined') {
    return '';
  }

  // Remove existing commas and spaces for processing
  const cleanValue = stringValue.replace(/[,\s]/g, '');

  // Check if it's a valid number
  if (isNaN(cleanValue) || cleanValue === '') {
    return stringValue; // Return original if not a valid number
  }

  const number = parseFloat(cleanValue);

  // Handle special cases
  if (!isFinite(number)) {
    return stringValue;
  }

  const { decimals, preserveDecimals = true } = options;

  // Format the number
  if (typeof decimals === 'number') {
    // Use specified decimal places
    return number.toLocaleString('th-TH', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  } else if (preserveDecimals) {
    // Preserve original decimal places
    const decimalPlaces = (cleanValue.split('.')[1] || '').length;
    return number.toLocaleString('th-TH', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces
    });
  } else {
    // Use default formatting
    return number.toLocaleString('th-TH');
  }
};

/**
 * Remove formatting from a number string for storage/calculation
 * @param {string} formattedValue - The formatted number string
 * @returns {string} Clean number string without formatting
 */
export const parseNumberInput = (formattedValue) => {
  if (!formattedValue) return '';

  // Remove commas and spaces, keep decimal point and negative sign
  return String(formattedValue).replace(/[,\s]/g, '');
};

/**
 * Format number input on change (live formatting)
 * @param {string} inputValue - Current input value
 * @param {string} previousValue - Previous formatted value
 * @returns {Object} Object with formatted value and cursor position
 */
export const formatNumberInput = (inputValue, previousValue = '') => {
  if (!inputValue) {
    return { formattedValue: '', cursorPosition: 0 };
  }

  // Get cursor position before formatting
  const cursorPosition = inputValue.length;

  // Remove formatting to get clean number
  const cleanValue = parseNumberInput(inputValue);

  // Check if it's a valid number in progress
  if (cleanValue === '' || cleanValue === '-') {
    return { formattedValue: cleanValue, cursorPosition };
  }

  // Check for valid number pattern (including partial numbers like "1.", "-1", etc.)
  const numberPattern = /^-?\d*\.?\d*$/;
  if (!numberPattern.test(cleanValue)) {
    // Invalid input, return previous value
    return { formattedValue: previousValue, cursorPosition: previousValue.length };
  }

  // Format if it's a complete number
  if (cleanValue && !isNaN(cleanValue) && cleanValue !== '-' && !cleanValue.endsWith('.')) {
    const formatted = formatNumberDisplay(cleanValue);

    // Calculate new cursor position after formatting
    const commasAdded = (formatted.match(/,/g) || []).length;
    const previousCommas = (previousValue.match(/,/g) || []).length;
    const commasDiff = commasAdded - previousCommas;

    return {
      formattedValue: formatted,
      cursorPosition: Math.min(cursorPosition + commasDiff, formatted.length)
    };
  }

  // Return clean value for partial numbers
  return { formattedValue: cleanValue, cursorPosition };
};

/**
 * Check if a value represents a valid number
 * @param {any} value - Value to check
 * @returns {boolean} True if valid number
 */
export const isValidNumber = (value) => {
  if (value === null || value === undefined || value === '') return false;

  const cleanValue = parseNumberInput(String(value));
  return !isNaN(cleanValue) && cleanValue !== '' && isFinite(parseFloat(cleanValue));
};

/**
 * Format number for different contexts
 * @param {any} value - Value to format
 * @param {string} context - Context: 'display', 'table', 'input'
 * @param {Object} fieldOptions - Field-specific options
 * @returns {string} Formatted value
 */
export const formatNumberByContext = (value, context = 'display', fieldOptions = {}) => {
  if (!isValidNumber(value)) {
    return context === 'table' ? '-' : (value || '');
  }

  const options = {};

  switch (context) {
    case 'table':
      // Compact format for tables
      options.preserveDecimals = false;
      break;
    case 'display':
      // Full format for detail views
      options.preserveDecimals = true;
      break;
    case 'input':
      // Live formatting for inputs
      options.preserveDecimals = true;
      break;
  }

  // Apply field-specific options
  if (fieldOptions.decimals !== undefined) {
    options.decimals = fieldOptions.decimals;
  }

  return formatNumberDisplay(value, options);
};

/**
 * Examples of usage:
 *
 * // Basic formatting
 * formatNumberDisplay(1234567) // "1,234,567"
 * formatNumberDisplay(1234.56) // "1,234.56"
 * formatNumberDisplay(-9876543) // "-9,876,543"
 *
 * // With options
 * formatNumberDisplay(1234.5678, { decimals: 2 }) // "1,234.57"
 * formatNumberDisplay(1234, { decimals: 2 }) // "1,234.00"
 *
 * // Parse back to clean number
 * parseNumberInput("1,234,567") // "1234567"
 * parseNumberInput("1,234.56") // "1234.56"
 *
 * // Context-based formatting
 * formatNumberByContext(1234567, 'table') // "1,234,567"
 * formatNumberByContext(1234567, 'display') // "1,234,567"
 * formatNumberByContext(1234.5678, 'display') // "1,234.5678"
 */