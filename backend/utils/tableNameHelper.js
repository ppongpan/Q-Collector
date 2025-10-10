/**
 * Table Name Helper - Convert form names to valid PostgreSQL table names
 *
 * Features:
 * - Translate Thai to meaningful English using Dictionary + MyMemory API
 * - Sanitize form titles to valid table names
 * - Handle Thai characters, spaces, special characters
 * - Ensure unique table names with hash suffix
 * - Maximum 63 characters (PostgreSQL limit)
 *
 * Version: 0.7.7-dev (Context-Aware Translation + Quality Validation)
 * NEW in v0.7.7:
 * - Context hints passed to MyMemory API for better accuracy
 * - Quality validation (reject match < 0.5)
 * - Enhanced logging with quality metrics
 */

const logger = require('./logger.util');

// Initialize translation services (MyMemory first for consistency, Dictionary as smart fallback)
// Note: DictionaryTranslationService is a singleton
const dictionaryService = require('../services/DictionaryTranslationService');
const MyMemoryTranslationService = require('../services/MyMemoryTranslationService');
const myMemoryService = new MyMemoryTranslationService();

/**
 * Sanitize text to valid PostgreSQL identifier
 * Uses MyMemory API first for consistency, Dictionary as smart fallback
 *
 * Strategy:
 * 1. MyMemory API (high-quality translation, consistent with main forms)
 * 2. Dictionary (only if MyMemory fails AND result is actual translation, not transliteration)
 * 3. Unique hash fallback (if both fail or Dictionary returns transliteration)
 *
 * @param {string} text - Input text (form title or field label)
 * @param {string} context - Translation context ('form', 'field', 'general')
 * @param {string} prefix - Prefix to add (e.g., 'form_', 'field_')
 * @param {number} maxLength - Maximum length (default 63 for PostgreSQL)
 * @returns {Promise<string>} - Valid PostgreSQL identifier
 */
const sanitizeIdentifier = async (text, context = 'general', prefix = '', maxLength = 63) => {
  if (!text || typeof text !== 'string') {
    return prefix + 'unnamed';
  }

  let sanitized;

  // Check if text contains Thai characters
  const containsThai = /[\u0E00-\u0E7F]/.test(text);

  if (containsThai) {
    // ⚡ FIXED PRIORITY (v0.7.7): MyMemory FIRST (better coverage) → Dictionary (fallback) → Hash
    // Reason: Dictionary coverage only 7.7%, produces transliterations for 92.3% of terms

    // Step 1: Try MyMemory API FIRST (best quality, context-aware, 80-90% meaningful translations)
    // ✨ v0.7.7: Pass context hints for better translation accuracy
    try {
      const result = await myMemoryService.translateToEnglish(text, {
        context: context,  // ✨ 'form', 'field', 'department', 'action', 'general'
        minQuality: 0.5,   // ✨ Reject translations with match < 0.5
        rejectTransliteration: true  // ✨ Reject phonetic conversions
      });

      // ⚡ NEW FIX (v0.7.7.1): Reject "translated_field" as it's MyMemory's fallback value, not actual translation
      // This happens for very short Thai words like "ชื่อ" where API can't determine meaning
      if (result.slug === 'translated_field') {
        logger.warn(`⚠️ MyMemory returned fallback "translated_field" for "${text}", trying Dictionary`);
        throw new Error('MyMemory returned fallback value');
      }

      sanitized = result.slug; // Already in snake_case and PostgreSQL-safe
      logger.info(`✅ MyMemory translated "${text}" → "${sanitized}" (quality: ${result.quality}, match: ${result.match}, context: ${context})`);
    } catch (myMemoryError) {
      logger.warn(`⚠️ MyMemory translation failed for "${text}": ${myMemoryError.message}`);

      // Step 2: Try Dictionary as fallback (instant, no rate limit, but limited vocabulary)
      try {
        const dictionaryResult = dictionaryService.translate(text, context);
        if (dictionaryResult && dictionaryResult !== text) {
          const cleanResult = dictionaryResult
            .toLowerCase()
            .replace(/[^a-z0-9\s_-]/g, '')
            .replace(/[-\s]+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_+|_+$/g, '');

          // ⚡ IMPROVED (v0.7.7.1): Better transliteration detection
          // Whitelist common English words that might be flagged incorrectly
          const commonEnglishWords = [
            'name', 'title', 'form', 'email', 'phone', 'address', 'date', 'time',
            'age', 'gender', 'status', 'type', 'note', 'comment', 'description',
            'number', 'code', 'id', 'user', 'admin', 'contact', 'message', 'file',
            'image', 'location', 'province', 'district', 'post', 'zip'
          ];

          const isCommonWord = commonEnglishWords.some(word => cleanResult.includes(word));

          // Check if dictionary result is transliteration (basic detection)
          // BUT: Skip check if it's a common English word
          const isTranslit = !isCommonWord &&
                            /[aeioubptkdgmnlrwyhjfsv]{3,}/.test(cleanResult) &&
                            cleanResult.length > text.length * 0.8;

          if (!isTranslit) {
            sanitized = cleanResult;
            logger.info(`✅ Dictionary translated "${text}" → "${sanitized}" (fallback, trusted translation)`);
          } else {
            logger.warn(`⚠️ Dictionary returned transliteration for "${text}" → "${cleanResult}", rejected`);
          }
        }
      } catch (dictError) {
        logger.warn(`Dictionary translation failed for "${text}": ${dictError.message}`);
      }
    }

    // Step 3: Last resort - Use readable transliteration with short hash
    if (!sanitized) {
      const hash = Math.abs(hashString(text)).toString(36).substring(0, 6);
      sanitized = '_' + hash; // Just use short hash

      logger.warn(`⚠️ Using hash fallback for "${text}" → "${sanitized}"`);
    }
  } else {
    // Already in English or Latin characters
    sanitized = text
      .toLowerCase()
      .replace(/[^a-z0-9\s_-]/g, '')
      .replace(/[-\s]+/g, '_')  // Convert hyphens and spaces to underscores
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  // Add prefix if specified and not already present
  if (prefix && !sanitized.startsWith(prefix)) {
    sanitized = prefix + sanitized;
  }

  // Ensure starts with letter or underscore
  if (sanitized && !/^[a-z_]/.test(sanitized)) {
    sanitized = '_' + sanitized;
  }

  // Truncate to max length
  if (sanitized.length > maxLength) {
    // Keep the start and add a hash of the full name at the end
    const hash = Math.abs(hashString(text)).toString(36).substring(0, 8);
    const keepLength = maxLength - hash.length - 1;
    sanitized = sanitized.substring(0, keepLength) + '_' + hash;
  }

  return sanitized || prefix + 'unnamed';
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
 * Uses MyMemory API for Thai-English translation
 *
 * @param {string} formTitle - Form title (Thai or English)
 * @param {string} formId - Form ID (for uniqueness)
 * @returns {Promise<string>} - Valid table name with meaningful English name
 *
 * Examples:
 * - "แบบฟอร์มติดต่อ" -> "contact_form_abcdef"
 * - "ใบลา" -> "sick_leaves_abcdef"
 * - "แบบสอบถาม" -> "questionnaire_abcdef"
 */
const generateTableName = async (formTitle, formId = null) => {
  const tableName = await sanitizeIdentifier(formTitle, 'form', '', 50);

  // Add short form ID suffix for uniqueness if provided
  if (formId) {
    const shortId = formId.substring(formId.lastIndexOf('-') + 1);
    return tableName + '_' + shortId;
  }

  return tableName;
};

/**
 * Generate column name from field label
 * Uses MyMemory API for Thai-English translation
 *
 * @param {string} fieldLabel - Field label/title (Thai or English)
 * @param {string} fieldId - Field ID (not used - kept for backward compatibility)
 * @returns {Promise<string>} - Valid column name with meaningful English name
 *
 * Examples:
 * - "ชื่อเต็ม" -> "full_name"
 * - "อีเมล" -> "email"
 * - "เบอร์โทร" -> "phone_number"
 * - "ที่อยู่" -> "address"
 *
 * NEW BEHAVIOR (v0.7.5):
 * - Returns clean English translation without hash suffix
 * - Duplicate column names will be caught by DynamicTableService
 * - User will be notified to rename duplicate fields
 */
const generateColumnName = async (fieldLabel, fieldId = null) => {
  const columnName = await sanitizeIdentifier(fieldLabel, 'field', '', 50);

  // Return clean column name without hash suffix
  // Duplicates will be detected during ALTER TABLE ADD COLUMN
  return columnName || 'unnamed_field';
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
