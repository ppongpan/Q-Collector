/**
 * SQLNameNormalizer - PostgreSQL Identifier Normalization
 *
 * Converts Thai form/field names to valid PostgreSQL table/column names.
 * Ensures compliance with PostgreSQL naming rules and handles reserved words.
 *
 * @version 0.7.0
 * @since 2025-10-02
 */

const TranslationService = require('./TranslationService');

/**
 * PostgreSQL Reserved Words (Common subset)
 * Full list: https://www.postgresql.org/docs/current/sql-keywords-appendix.html
 */
const POSTGRES_RESERVED_WORDS = new Set([
  'all', 'analyse', 'analyze', 'and', 'any', 'array', 'as', 'asc', 'asymmetric',
  'both', 'case', 'cast', 'check', 'collate', 'column', 'constraint', 'create',
  'current_catalog', 'current_date', 'current_role', 'current_time', 'current_timestamp',
  'current_user', 'default', 'deferrable', 'desc', 'distinct', 'do', 'else', 'end',
  'except', 'false', 'fetch', 'for', 'foreign', 'from', 'grant', 'group', 'having',
  'in', 'initially', 'intersect', 'into', 'lateral', 'leading', 'limit', 'localtime',
  'localtimestamp', 'not', 'null', 'offset', 'on', 'only', 'or', 'order', 'placing',
  'primary', 'references', 'returning', 'select', 'session_user', 'some', 'symmetric',
  'table', 'then', 'to', 'trailing', 'true', 'union', 'unique', 'user', 'using',
  'variadic', 'when', 'where', 'window', 'with', 'authorization', 'between', 'binary',
  'cross', 'current_schema', 'freeze', 'full', 'ilike', 'inner', 'is', 'isnull',
  'join', 'left', 'like', 'natural', 'notnull', 'outer', 'overlaps', 'right', 'similar',
  'verbose', 'index', 'sequence', 'view', 'function', 'trigger', 'type', 'database',
  'schema', 'role', 'user', 'admin', 'name', 'value', 'key', 'data', 'text'
]);

/**
 * Common column suffixes to avoid conflicts
 */
const COMMON_SUFFIXES = {
  ID: '_id',
  NAME: '_name',
  DATE: '_date',
  TIME: '_time',
  TIMESTAMP: '_timestamp',
  STATUS: '_status',
  TYPE: '_type',
  VALUE: '_value',
  DATA: '_data',
  TEXT: '_text',
  NUMBER: '_number'
};

class SQLNameNormalizer {
  /**
   * PostgreSQL identifier constraints
   */
  static MAX_IDENTIFIER_LENGTH = 63;
  static MIN_IDENTIFIER_LENGTH = 1;

  /**
   * Normalize a name to valid PostgreSQL identifier
   * 🔄 ASYNC: Now uses LibreTranslate API for accurate translation
   *
   * @param {string} name - Original name (Thai or English)
   * @param {Object} options - Normalization options
   * @param {string} options.type - Type of identifier ('table' or 'column')
   * @param {string} options.prefix - Optional prefix to add
   * @param {string} options.suffix - Optional suffix to add
   * @param {boolean} options.avoidReserved - Avoid reserved words (default: true)
   * @returns {Promise<string>} Normalized PostgreSQL identifier
   */
  static async normalize(name, options = {}) {
    const {
      type = 'column',
      prefix = '',
      suffix = '',
      avoidReserved = true
    } = options;

    if (!name || typeof name !== 'string') {
      throw new Error('Name must be a non-empty string');
    }

    let normalized = name.trim();

    // Step 1: Translate Thai to English (NOW ASYNC with LibreTranslate)
    if (TranslationService.containsThai(normalized)) {
      const translation = await TranslationService.translate(normalized, {
        useAPI: true,
        lowercase: true
      });
      normalized = translation.english;
    } else {
      // Already English, normalize it
      normalized = TranslationService.normalizeEnglish(normalized, true);
    }

    // Step 2: Apply prefix and suffix
    if (prefix) {
      normalized = `${prefix}_${normalized}`;
    }
    if (suffix) {
      normalized = `${normalized}_${suffix}`;
    }

    // Step 3: Ensure valid PostgreSQL identifier format
    normalized = this.ensureValidFormat(normalized);

    // Step 4: Handle reserved words
    if (avoidReserved && this.isReservedWord(normalized)) {
      normalized = this.handleReservedWord(normalized, type);
    }

    // Step 5: Enforce length constraints
    normalized = this.enforceLength(normalized);

    // Step 6: Final validation
    if (!this.isValidIdentifier(normalized)) {
      throw new Error(`Failed to create valid identifier from: ${name}`);
    }

    return normalized;
  }

  /**
   * Ensure valid PostgreSQL identifier format
   * - Must start with letter or underscore
   * - Can contain letters, digits, underscores
   * - Lowercase only
   *
   * @param {string} name - Name to format
   * @returns {string} Formatted name
   */
  static ensureValidFormat(name) {
    let formatted = name.toLowerCase();

    // Remove any remaining invalid characters
    formatted = formatted.replace(/[^a-z0-9_]/g, '');

    // Ensure starts with letter or underscore
    if (formatted.length > 0 && /^[0-9]/.test(formatted)) {
      formatted = '_' + formatted;
    }

    // Remove multiple consecutive underscores
    formatted = formatted.replace(/_+/g, '_');

    // Remove leading/trailing underscores
    formatted = formatted.replace(/^_+|_+$/g, '');

    // If empty after cleanup, use default
    if (formatted.length === 0) {
      formatted = 'col_' + Date.now();
    }

    return formatted;
  }

  /**
   * Check if name is a PostgreSQL reserved word
   *
   * @param {string} name - Name to check
   * @returns {boolean} True if reserved word
   */
  static isReservedWord(name) {
    return POSTGRES_RESERVED_WORDS.has(name.toLowerCase());
  }

  /**
   * Handle reserved word by adding appropriate suffix
   *
   * @param {string} name - Reserved word
   * @param {string} type - Identifier type ('table' or 'column')
   * @returns {string} Modified name
   */
  static handleReservedWord(name, type) {
    if (type === 'table') {
      return `${name}_table`;
    } else {
      return `${name}_col`;
    }
  }

  /**
   * Enforce PostgreSQL identifier length constraints
   * Max: 63 characters
   *
   * @param {string} name - Name to enforce
   * @returns {string} Length-compliant name
   */
  static enforceLength(name) {
    if (name.length > this.MAX_IDENTIFIER_LENGTH) {
      // Truncate and add hash to ensure uniqueness
      const hash = this.generateHash(name).substring(0, 8);
      const maxBaseLength = this.MAX_IDENTIFIER_LENGTH - hash.length - 1;
      return name.substring(0, maxBaseLength) + '_' + hash;
    }

    return name;
  }

  /**
   * Generate simple hash for uniqueness
   *
   * @param {string} str - String to hash
   * @returns {string} Hash string (hex)
   */
  static generateHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Validate PostgreSQL identifier
   *
   * @param {string} name - Name to validate
   * @returns {boolean} True if valid
   */
  static isValidIdentifier(name) {
    if (!name || typeof name !== 'string') {
      return false;
    }

    // Check length
    if (name.length < this.MIN_IDENTIFIER_LENGTH || name.length > this.MAX_IDENTIFIER_LENGTH) {
      return false;
    }

    // Must start with letter or underscore
    if (!/^[a-z_]/.test(name)) {
      return false;
    }

    // Must contain only letters, digits, underscores
    if (!/^[a-z0-9_]+$/.test(name)) {
      return false;
    }

    return true;
  }

  /**
   * Generate table name from form name
   * 🔄 ASYNC: Now uses LibreTranslate API
   *
   * @param {string} formName - Form name (Thai or English)
   * @param {Object} options - Options
   * @param {string} options.prefix - Optional prefix (e.g., 'form_')
   * @returns {Promise<string>} Valid PostgreSQL table name
   */
  static async generateTableName(formName, options = {}) {
    const { prefix = '' } = options;

    return await this.normalize(formName, {
      type: 'table',
      prefix,
      avoidReserved: true
    });
  }

  /**
   * Generate column name from field label
   * 🔄 ASYNC: Now uses LibreTranslate API
   *
   * @param {string} fieldLabel - Field label (Thai or English)
   * @param {Object} options - Options
   * @param {string} options.prefix - Optional prefix
   * @param {string} options.suffix - Optional suffix
   * @returns {Promise<string>} Valid PostgreSQL column name
   */
  static async generateColumnName(fieldLabel, options = {}) {
    const { prefix = '', suffix = '' } = options;

    return await this.normalize(fieldLabel, {
      type: 'column',
      prefix,
      suffix,
      avoidReserved: true
    });
  }

  /**
   * Ensure unique name within a set
   *
   * @param {string} name - Base name
   * @param {Set<string>} existingNames - Set of existing names
   * @param {number} maxAttempts - Maximum attempts to find unique name
   * @returns {string} Unique name
   */
  static ensureUnique(name, existingNames, maxAttempts = 100) {
    if (!existingNames.has(name)) {
      return name;
    }

    // Try adding numeric suffixes
    for (let i = 1; i <= maxAttempts; i++) {
      const candidate = `${name}_${i}`;

      // Ensure length compliance
      const truncated = this.enforceLength(candidate);

      if (!existingNames.has(truncated)) {
        return truncated;
      }
    }

    // If still not unique, use hash
    const hash = this.generateHash(name + Date.now());
    const maxBaseLength = this.MAX_IDENTIFIER_LENGTH - hash.length - 1;
    return name.substring(0, maxBaseLength) + '_' + hash;
  }

  /**
   * Batch normalize names with uniqueness guarantee
   * 🔄 ASYNC: Now uses LibreTranslate API
   *
   * @param {Array<string>} names - Array of names to normalize
   * @param {Object} options - Normalization options
   * @returns {Promise<Array<{original: string, normalized: string}>>} Array of mappings
   */
  static async batchNormalize(names, options = {}) {
    if (!Array.isArray(names)) {
      return [];
    }

    const result = [];
    const existingNames = new Set();

    for (const name of names) {
      try {
        const normalized = await this.normalize(name, options);
        const unique = this.ensureUnique(normalized, existingNames);

        existingNames.add(unique);
        result.push({
          original: name,
          normalized: unique
        });
      } catch (error) {
        // Skip invalid names
        console.error(`Failed to normalize "${name}":`, error.message);
      }
    }

    return result;
  }

  /**
   * Get PostgreSQL reserved words set
   *
   * @returns {Set<string>} Set of reserved words
   */
  static getReservedWords() {
    return new Set(POSTGRES_RESERVED_WORDS);
  }
}

module.exports = SQLNameNormalizer;
