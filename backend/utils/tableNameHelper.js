/**
 * Table Name Helper - Convert form names to valid PostgreSQL table names
 *
 * Features:
 * - Translate Thai to meaningful English using dictionary
 * - Sanitize form titles to valid table names
 * - Handle Thai characters, spaces, special characters
 * - Ensure unique table names
 * - Maximum 63 characters (PostgreSQL limit)
 */

const {
  translateFormTitle,
  translateFieldLabel
} = require('./thaiTranslator');

/**
 * Sanitize text to valid PostgreSQL identifier
 * Now uses intelligent Thai translation instead of simple romanization
 *
 * @param {string} text - Input text (form title or field label)
 * @param {string} prefix - Prefix to add (e.g., 'form_', 'field_')
 * @param {number} maxLength - Maximum length (default 63 for PostgreSQL)
 * @param {boolean} isFormTitle - True if this is a form title (for translation context)
 * @returns {string} - Valid PostgreSQL identifier
 */
const sanitizeIdentifier = (text, prefix = '', maxLength = 63, isFormTitle = false) => {
  if (!text || typeof text !== 'string') {
    return prefix + 'unnamed';
  }

  // Use intelligent translation for Thai text
  let sanitized;
  if (isFormTitle) {
    sanitized = translateFormTitle(text);
  } else {
    sanitized = translateFieldLabel(text);
  }

  // Add prefix if specified and not already present
  if (prefix && !sanitized.startsWith(prefix)) {
    sanitized = prefix + sanitized;
  }

  // Convert to lowercase
  sanitized = sanitized.toLowerCase();

  // Replace any remaining invalid characters with underscore
  sanitized = sanitized.replace(/[^a-z0-9_]/g, '_');

  // Remove consecutive underscores
  sanitized = sanitized.replace(/_+/g, '_');

  // Remove leading/trailing underscores
  sanitized = sanitized.replace(/^_+|_+$/g, '');

  // Ensure it starts with a letter (PostgreSQL requirement)
  if (!/^[a-z]/.test(sanitized)) {
    sanitized = 'tbl_' + sanitized;
  }

  // Truncate to max length
  if (sanitized.length > maxLength) {
    // Keep the start and add a hash of the full name at the end
    const hash = Math.abs(hashString(text)).toString(36).substring(0, 8);
    const keepLength = maxLength - hash.length - 1;
    sanitized = sanitized.substring(0, keepLength) + '_' + hash;
  }

  return sanitized;
};

/**
 * Simple string hash function
 */
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
};

/**
 * Generate table name from form title
 * Now uses intelligent Thai-to-English translation
 *
 * @param {string} formTitle - Form title (Thai or English)
 * @param {string} formId - Form ID (for uniqueness)
 * @returns {string} - Valid table name with meaningful English name
 *
 * Examples:
 * - "แบบฟอร์มติดต่อ" -> "form_contact_abcdef"
 * - "ใบลา" -> "form_leave_abcdef"
 * - "แบบสอบถาม" -> "form_survey_abcdef"
 */
const generateTableName = (formTitle, formId = null) => {
  const tableName = sanitizeIdentifier(formTitle, '', 50, true); // isFormTitle = true

  // Add short form ID suffix for uniqueness if provided
  if (formId) {
    const shortId = formId.substring(formId.lastIndexOf('-') + 1);
    return tableName + '_' + shortId;
  }

  return tableName;
};

/**
 * Generate column name from field label
 * Now uses intelligent Thai-to-English translation
 *
 * @param {string} fieldLabel - Field label/title (Thai or English)
 * @param {string} fieldId - Field ID (for uniqueness)
 * @returns {string} - Valid column name with meaningful English name
 *
 * Examples:
 * - "ชื่อเต็ม" -> "full_name_abc123"
 * - "อีเมล" -> "email_abc123"
 * - "เบอร์โทร" -> "phone_number_abc123"
 * - "ที่อยู่" -> "address_abc123"
 */
const generateColumnName = (fieldLabel, fieldId = null) => {
  const columnName = sanitizeIdentifier(fieldLabel, '', 50, false); // isFormTitle = false

  // Add short field ID suffix for uniqueness if provided
  if (fieldId) {
    const shortId = fieldId.substring(fieldId.lastIndexOf('-') + 1).substring(0, 6);
    return columnName + '_' + shortId;
  }

  return columnName;
};

/**
 * Get PostgreSQL data type for field type
 * @param {string} fieldType - Field type from form builder
 * @returns {string} - PostgreSQL data type
 */
const getPostgreSQLType = (fieldType) => {
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
    'dropdown': 'VARCHAR(255)',
    'checkbox': 'TEXT', // Store as comma-separated or JSON array

    // File types
    'file_upload': 'TEXT', // Store file path
    'image_upload': 'TEXT', // Store image path

    // Location types
    'lat_long': 'POINT', // PostgreSQL geometry type
    'province': 'VARCHAR(100)',
    'factory': 'VARCHAR(255)',

    // Default
    'default': 'TEXT'
  };

  return typeMap[fieldType] || typeMap['default'];
};

/**
 * Validate table name
 * @param {string} tableName - Table name to validate
 * @returns {boolean} - True if valid
 */
const isValidTableName = (tableName) => {
  // PostgreSQL identifier rules:
  // - Start with letter or underscore
  // - Contain only letters, numbers, underscores
  // - Max 63 characters
  const regex = /^[a-z_][a-z0-9_]{0,62}$/;
  return regex.test(tableName);
};

module.exports = {
  sanitizeIdentifier,
  generateTableName,
  generateColumnName,
  getPostgreSQLType,
  isValidTableName
};
