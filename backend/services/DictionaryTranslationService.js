/**
 * Dictionary-Based Thai-to-English Translation Service
 *
 * Translates Thai text to English using comprehensive dictionary
 * Replaces Argos Translate for Windows/WSL2 compatibility
 *
 * @version 0.7.3-dev
 * @date 2025-10-05
 */

const path = require('path');
const fs = require('fs');

class DictionaryTranslationService {
  constructor() {
    // Load dictionary from JSON file
    const dictionaryPath = path.join(__dirname, '../dictionaries/thai-english-forms.json');
    this.dictionary = JSON.parse(fs.readFileSync(dictionaryPath, 'utf8'));

    // Cache for performance
    this.translationCache = new Map();

    // Initialize category priority for context-aware translation
    this.categoryPriority = {
      form: ['formTypes', 'actions', 'general'],
      field: ['commonFields', 'workRelated', 'customer', 'product', 'general'],
      action: ['actions', 'approval', 'general'],
      department: ['departments', 'workRelated', 'general'],
      general: Object.keys(this.dictionary.categories)
    };
  }

  /**
   * Main translation method
   * @param {string} thaiText - Thai text to translate
   * @param {string} context - Context hint (form, field, action, department, general)
   * @returns {string} English translation
   */
  translate(thaiText, context = 'general') {
    if (!thaiText || typeof thaiText !== 'string') {
      return '';
    }

    // Trim whitespace
    thaiText = thaiText.trim();

    // Check cache first
    const cacheKey = `${context}:${thaiText}`;
    if (this.translationCache.has(cacheKey)) {
      return this.translationCache.get(cacheKey);
    }

    let result = '';

    // Step 1: Check for exact match in compound words
    result = this.checkCompoundWords(thaiText);
    if (result) {
      this.translationCache.set(cacheKey, result);
      return result;
    }

    // Step 2: Check for exact match in all categories (with context priority)
    result = this.exactMatch(thaiText, context);
    if (result) {
      this.translationCache.set(cacheKey, result);
      return result;
    }

    // Step 3: Try removing prefixes and search again
    result = this.translateWithPrefixRemoval(thaiText, context);
    if (result) {
      this.translationCache.set(cacheKey, result);
      return result;
    }

    // Step 4: Word-by-word translation
    result = this.wordByWordTranslation(thaiText, context);
    if (result) {
      this.translationCache.set(cacheKey, result);
      return result;
    }

    // Step 5: Fallback to transliteration
    result = this.transliterate(thaiText);
    this.translationCache.set(cacheKey, result);
    return result;
  }

  /**
   * Check compound words dictionary
   */
  checkCompoundWords(thaiText) {
    const compounds = this.dictionary.specialRules.compounds;
    if (compounds && compounds[thaiText]) {
      return compounds[thaiText];
    }
    return null;
  }

  /**
   * Exact match lookup with context priority
   */
  exactMatch(thaiText, context) {
    const categories = this.categoryPriority[context] || this.categoryPriority.general;

    for (const categoryName of categories) {
      const category = this.dictionary.categories[categoryName];
      if (category && category[thaiText]) {
        return category[thaiText];
      }
    }

    return null;
  }

  /**
   * Try translation after removing Thai prefixes
   */
  translateWithPrefixRemoval(thaiText, context) {
    const prefixes = this.dictionary.specialRules.prefixes;

    for (const [prefix, replacement] of Object.entries(prefixes)) {
      if (thaiText.startsWith(prefix)) {
        const withoutPrefix = thaiText.substring(prefix.length);
        const translated = this.exactMatch(withoutPrefix, context);

        if (translated) {
          // Apply prefix replacement rule
          if (replacement === '') {
            return translated; // Just remove prefix
          } else {
            return replacement + translated; // Add replacement prefix
          }
        }
      }
    }

    return null;
  }

  /**
   * Word-by-word translation (split by space)
   */
  wordByWordTranslation(thaiText, context) {
    // Thai doesn't use spaces, so this is for mixed Thai-English text
    const words = thaiText.split(/\s+/);

    if (words.length > 1) {
      const translatedWords = words.map(word => {
        return this.exactMatch(word, context) || this.transliterate(word);
      });

      return translatedWords.join('_');
    }

    return null;
  }

  /**
   * Transliterate Thai to English (fallback)
   * Simple character-by-character transliteration
   */
  transliterate(thaiText) {
    const thaiToEnglish = {
      'ก': 'k', 'ข': 'kh', 'ค': 'kh', 'ง': 'ng',
      'จ': 'j', 'ฉ': 'ch', 'ช': 'ch', 'ซ': 's', 'ฌ': 'ch', 'ญ': 'y',
      'ฎ': 'd', 'ฏ': 't', 'ฐ': 'th', 'ฑ': 'th', 'ฒ': 'th', 'ณ': 'n',
      'ด': 'd', 'ต': 't', 'ถ': 'th', 'ท': 'th', 'ธ': 'th', 'น': 'n',
      'บ': 'b', 'ป': 'p', 'ผ': 'ph', 'ฝ': 'f', 'พ': 'ph', 'ฟ': 'f', 'ภ': 'ph', 'ม': 'm',
      'ย': 'y', 'ร': 'r', 'ล': 'l', 'ว': 'w',
      'ศ': 's', 'ษ': 's', 'ส': 's', 'ห': 'h', 'ฬ': 'l', 'อ': 'o', 'ฮ': 'h',
      'ะ': 'a', 'ั': 'a', 'า': 'a', 'ำ': 'am',
      'ิ': 'i', 'ี': 'i', 'ึ': 'ue', 'ื': 'ue', 'ุ': 'u', 'ู': 'u',
      'เ': 'e', 'แ': 'ae', 'โ': 'o', 'ใ': 'ai', 'ไ': 'ai',
      'ๅ': '', '่': '', '้': '', '๊': '', '๋': '', '์': '', 'ํ': '',
      '฿': 'baht', '๏': '', 'ๆ': '', '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4',
      '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9'
    };

    let result = '';
    for (const char of thaiText) {
      if (thaiToEnglish[char]) {
        result += thaiToEnglish[char];
      } else if (/[a-zA-Z0-9_\-]/.test(char)) {
        result += char; // Keep English chars, numbers, underscore, dash
      } else if (char === ' ') {
        result += '_';
      }
      // Skip other characters
    }

    return result || 'unknown';
  }

  /**
   * Convert to snake_case
   */
  toSnakeCase(text) {
    return text
      .toLowerCase()
      .replace(/\s+/g, '_')           // Replace spaces with underscore
      .replace(/[^\w_]/g, '')         // Remove special characters
      .replace(/_+/g, '_')            // Replace multiple underscores with single
      .replace(/^_|_$/g, '');         // Remove leading/trailing underscores
  }

  /**
   * Sanitize for PostgreSQL identifier
   */
  sanitizeForPostgres(name) {
    // PostgreSQL identifier rules:
    // - Start with letter or underscore
    // - Only letters, digits, underscores
    // - Max 63 characters

    let sanitized = name
      .replace(/[^a-zA-Z0-9_]/g, '_')  // Replace invalid chars with underscore
      .replace(/^[0-9]/, '_$&')         // Prefix number with underscore
      .replace(/_+/g, '_')              // Collapse multiple underscores
      .toLowerCase();

    // Ensure max length
    if (sanitized.length > 63) {
      sanitized = sanitized.substring(0, 63);
    }

    // Ensure starts with letter or underscore
    if (!/^[a-z_]/.test(sanitized)) {
      sanitized = '_' + sanitized;
    }

    return sanitized;
  }

  /**
   * Generate table name from Thai form name
   * @param {string} formName - Thai form name
   * @returns {string} English table name (snake_case)
   */
  generateTableName(formName) {
    const translated = this.translate(formName, 'form');
    const snakeCase = this.toSnakeCase(translated);
    const sanitized = this.sanitizeForPostgres(snakeCase);

    // Ensure it doesn't end with just an ID (keep it descriptive)
    return sanitized;
  }

  /**
   * Generate column name from Thai field name
   * @param {string} fieldName - Thai field name
   * @returns {string} English column name (snake_case)
   */
  generateColumnName(fieldName) {
    const translated = this.translate(fieldName, 'field');
    const snakeCase = this.toSnakeCase(translated);
    const sanitized = this.sanitizeForPostgres(snakeCase);

    return sanitized;
  }

  /**
   * Batch translate multiple texts
   * @param {string[]} texts - Array of Thai texts
   * @param {string} context - Context hint
   * @returns {Object} Map of original text to translation
   */
  batchTranslate(texts, context = 'general') {
    const results = {};
    for (const text of texts) {
      results[text] = this.translate(text, context);
    }
    return results;
  }

  /**
   * Clear translation cache
   */
  clearCache() {
    this.translationCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.translationCache.size,
      entries: Array.from(this.translationCache.keys())
    };
  }
}

// Singleton instance
let instance = null;

/**
 * Get singleton instance
 */
function getInstance() {
  if (!instance) {
    instance = new DictionaryTranslationService();
  }
  return instance;
}

module.exports = getInstance();
module.exports.DictionaryTranslationService = DictionaryTranslationService;
