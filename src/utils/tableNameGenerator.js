/**
 * Table Name Generator Utility
 *
 * Generates PostgreSQL table names from Thai form names
 * Frontend implementation matching backend TranslationService & SQLNameNormalizer
 *
 * @version 0.7.0
 * @since 2025-10-02
 */

/**
 * Common Thai→English Translation Dictionary
 * Subset of backend TranslationService for frontend use
 */
const TRANSLATION_DICTIONARY = {
  // Form Names
  'ใบสมัครงาน': 'job_application',
  'ใบลา': 'leave_request',
  'ใบเบิก': 'requisition',
  'ใบสั่งซื้อ': 'purchase_order',
  'แบบฟอร์ม': 'form',
  'แบบสอบถาม': 'survey',

  // Personal Info
  'ชื่อ': 'first_name',
  'นามสกุล': 'last_name',
  'ชื่อเต็ม': 'full_name',
  'ชื่อ-นามสกุล': 'full_name',
  'อายุ': 'age',
  'วันเกิด': 'birth_date',
  'เพศ': 'gender',

  // Contact
  'ที่อยู่': 'address',
  'โทรศัพท์': 'phone',
  'อีเมล': 'email',

  // Work
  'ประสบการณ์': 'experience',
  'ประสบการณ์ทำงาน': 'work_experience',
  'การศึกษา': 'education',
  'ตำแหน่ง': 'position',
  'บริษัท': 'company',
  'แผนก': 'department',
  'เงินเดือน': 'salary',

  // Date/Time
  'วันที่': 'date',
  'เวลา': 'time',
  'วันเวลา': 'datetime',
  'วันที่เริ่มต้น': 'start_date',
  'วันที่สิ้นสุด': 'end_date'
};

/**
 * Thai to Roman Character Map (simplified)
 */
const THAI_TO_ROMAN = {
  'ก': 'k', 'ข': 'kh', 'ฃ': 'kh', 'ค': 'kh', 'ฅ': 'kh', 'ฆ': 'kh',
  'ง': 'ng',
  'จ': 'ch', 'ฉ': 'ch', 'ช': 'ch', 'ซ': 's', 'ฌ': 'ch',
  'ญ': 'y', 'ย': 'y',
  'ฎ': 'd', 'ฏ': 't', 'ฐ': 'th', 'ฑ': 'th', 'ฒ': 'th', 'ณ': 'n',
  'ด': 'd', 'ต': 't', 'ถ': 'th', 'ท': 'th', 'ธ': 'th',
  'น': 'n',
  'บ': 'b', 'ป': 'p', 'ผ': 'ph', 'ฝ': 'f', 'พ': 'ph', 'ฟ': 'f', 'ภ': 'ph',
  'ม': 'm',
  'ร': 'r', 'ล': 'l', 'ว': 'w',
  'ศ': 's', 'ษ': 's', 'ส': 's', 'ห': 'h', 'ฬ': 'l', 'อ': 'o', 'ฮ': 'h',
  'ะ': 'a', 'ั': 'a', 'า': 'a', 'ำ': 'am',
  'ิ': 'i', 'ี': 'i', 'ึ': 'ue', 'ื': 'ue', 'ุ': 'u', 'ู': 'u',
  'เ': 'e', 'แ': 'ae', 'โ': 'o', 'ใ': 'ai', 'ไ': 'ai',
  '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4',
  '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9'
};

/**
 * Check if text contains Thai characters
 *
 * @param {string} text - Text to check
 * @returns {boolean} True if contains Thai
 */
export function containsThai(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }
  return /[\u0E00-\u0E7F]/.test(text);
}

/**
 * Translate Thai text to English
 *
 * @param {string} thaiText - Thai text
 * @returns {string} English text
 */
export function translateToEnglish(thaiText) {
  if (!thaiText || typeof thaiText !== 'string') {
    return '';
  }

  const trimmed = thaiText.trim();

  // Already English
  if (!containsThai(trimmed)) {
    return normalizeEnglish(trimmed);
  }

  // Dictionary lookup
  if (TRANSLATION_DICTIONARY[trimmed]) {
    return TRANSLATION_DICTIONARY[trimmed];
  }

  // Transliterate
  return transliterate(trimmed);
}

/**
 * Transliterate Thai to Roman characters
 *
 * @param {string} thaiText - Thai text
 * @returns {string} Romanized text
 */
function transliterate(thaiText) {
  let result = '';

  for (let i = 0; i < thaiText.length; i++) {
    const char = thaiText[i];

    if (THAI_TO_ROMAN[char]) {
      result += THAI_TO_ROMAN[char];
    } else if (/[a-zA-Z0-9]/.test(char)) {
      result += char;
    } else if (/[\s_-]/.test(char)) {
      result += char;
    }
  }

  return result;
}

/**
 * Normalize English text for SQL identifiers
 *
 * @param {string} text - English text
 * @returns {string} Normalized text
 */
function normalizeEnglish(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let normalized = text.trim().toLowerCase();
  normalized = normalized.replace(/\s+/g, '_');
  normalized = normalized.replace(/[^a-z0-9_-]/gi, '');
  normalized = normalized.replace(/_+/g, '_');
  normalized = normalized.replace(/^_+|_+$/g, '');

  return normalized;
}

/**
 * Generate table name from form name
 *
 * @param {string} formName - Form name (Thai or English)
 * @param {string} prefix - Table prefix (default: 'form_')
 * @returns {string} PostgreSQL table name
 */
export function generateTableName(formName, prefix = 'form_') {
  if (!formName) {
    return prefix + 'unnamed';
  }

  let translated = translateToEnglish(formName);

  // Ensure valid format
  if (translated.length > 50) {
    translated = translated.substring(0, 50);
  }

  return prefix + translated;
}

/**
 * Generate table names for form and subforms
 *
 * @param {Object} form - Form object with title and subForms
 * @returns {Object} Table names { mainTable, subTables: [{title, tableName}] }
 */
export function generateFormTableNames(form) {
  if (!form) {
    return { mainTable: 'form_unnamed', subTables: [] };
  }

  const mainTable = generateTableName(form.title || form.name, 'form_');

  const subTables = [];
  if (form.subForms && Array.isArray(form.subForms)) {
    form.subForms.forEach(subForm => {
      if (subForm.title) {
        subTables.push({
          title: subForm.title,
          tableName: generateTableName(subForm.title, 'form_')
        });
      }
    });
  }

  return {
    mainTable,
    subTables
  };
}

/**
 * Get display name for table (with form name in parentheses)
 *
 * @param {string} formName - Original form name
 * @param {string} tableName - Generated table name
 * @returns {string} Display name
 */
export function getTableDisplayName(formName, tableName) {
  if (!formName) {
    return tableName;
  }

  return `${tableName} (${formName})`;
}

export default {
  containsThai,
  translateToEnglish,
  generateTableName,
  generateFormTableNames,
  getTableDisplayName
};
