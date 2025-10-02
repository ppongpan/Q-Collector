/**
 * TranslationService - Thai to English Translation for Database Schema
 *
 * Provides translation functionality for converting Thai form names and field names
 * to English equivalents for use in PostgreSQL table and column names.
 *
 * @version 0.7.0
 * @since 2025-10-02
 */

/**
 * Common Thai→English Translation Dictionary
 * Used for translating common form and field terms
 */
const TRANSLATION_DICTIONARY = {
  // Form Names - Common Business Forms
  'ใบสมัครงาน': 'job_application',
  'ใบลา': 'leave_request',
  'ใบเบิก': 'requisition',
  'ใบสั่งซื้อ': 'purchase_order',
  'ใบเสนอราคา': 'quotation',
  'ใบแจ้งหนี้': 'invoice',
  'ใบเสร็จรับเงิน': 'receipt',
  'แบบฟอร์ม': 'form',
  'แบบสอบถาม': 'survey',
  'คำร้อง': 'petition',
  'รายงาน': 'report',

  // Personal Information
  'ชื่อ': 'first_name',
  'นามสกุล': 'last_name',
  'ชื่อเต็ม': 'full_name',
  'ชื่อ-นามสกุล': 'full_name',
  'อายุ': 'age',
  'วันเกิด': 'birth_date',
  'เพศ': 'gender',
  'สัญชาติ': 'nationality',
  'เชื้อชาติ': 'ethnicity',
  'ศาสนา': 'religion',
  'สถานภาพ': 'marital_status',
  'หมายเลขบัตรประชาชน': 'id_card_number',
  'เลขบัตรประชาชน': 'id_card_number',

  // Contact Information
  'ที่อยู่': 'address',
  'บ้านเลขที่': 'house_number',
  'หมู่': 'village_number',
  'ซอย': 'lane',
  'ถนน': 'road',
  'แขวง': 'sub_district',
  'ตำบล': 'sub_district',
  'เขต': 'district',
  'อำเภอ': 'district',
  'จังหวัด': 'province',
  'รหัสไปรษณีย์': 'postal_code',
  'โทรศัพท์': 'phone',
  'มือถือ': 'mobile',
  'อีเมล': 'email',
  'เว็บไซต์': 'website',

  // Date and Time
  'วันที่': 'date',
  'เวลา': 'time',
  'วันเวลา': 'datetime',
  'วันที่เริ่มต้น': 'start_date',
  'วันที่สิ้นสุด': 'end_date',
  'ระยะเวลา': 'duration',
  'ปี': 'year',
  'เดือน': 'month',
  'วัน': 'day',

  // Work/Job Related
  'ตำแหน่ง': 'position',
  'แผนก': 'department',
  'ฝ่าย': 'division',
  'บริษัท': 'company',
  'องค์กร': 'organization',
  'เงินเดือน': 'salary',
  'ค่าจ้าง': 'wage',
  'ประสบการณ์': 'experience',
  'ทักษะ': 'skills',
  'ความสามารถ': 'abilities',
  'การศึกษา': 'education',
  'วุฒิการศึกษา': 'education_level',
  'สถาบัน': 'institution',
  'มหาวิทยาลัย': 'university',
  'โรงเรียน': 'school',

  // Common Fields
  'รายละเอียด': 'description',
  'หมายเหตุ': 'remarks',
  'ข้อความ': 'message',
  'คำอธิบาย': 'explanation',
  'สถานะ': 'status',
  'ประเภท': 'type',
  'หมวดหมู่': 'category',
  'จำนวน': 'quantity',
  'ราคา': 'price',
  'ยอดรวม': 'total',
  'ผู้ติดต่อ': 'contact_person',
  'ผู้รับผิดชอบ': 'responsible_person',
  'ผู้อนุมัติ': 'approver',
  'ผู้ยื่นคำร้อง': 'requester',

  // Files and Media
  'ไฟล์': 'file',
  'เอกสาร': 'document',
  'รูปภาพ': 'image',
  'ภาพถ่าย': 'photo',
  'ไฟล์แนบ': 'attachment',
  'สำเนา': 'copy',

  // Location
  'สถานที่': 'location',
  'พิกัด': 'coordinates',
  'แผนที่': 'map',
  'ละติจูด': 'latitude',
  'ลองจิจูด': 'longitude',
  'โรงงาน': 'factory',
  'สาขา': 'branch',

  // Common Words
  'ใหม่': 'new',
  'เก่า': 'old',
  'ปัจจุบัน': 'current',
  'ก่อนหน้า': 'previous',
  'ถัดไป': 'next',
  'อื่นๆ': 'other',
  'เพิ่มเติม': 'additional',
  'หลัก': 'main',
  'ย่อย': 'sub',
  'รอง': 'secondary',
  'ชั่วคราว': 'temporary',
  'ถาวร': 'permanent'
};

/**
 * Thai to English Character Transliteration Map
 * Used for converting Thai characters to romanized equivalents
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
  // Vowels
  'ะ': 'a', 'ั': 'a', 'า': 'a', 'ำ': 'am',
  'ิ': 'i', 'ี': 'i', 'ึ': 'ue', 'ื': 'ue', 'ุ': 'u', 'ู': 'u',
  'เ': 'e', 'แ': 'ae', 'โ': 'o', 'ใ': 'ai', 'ไ': 'ai',
  'ๅ': '', 'ๆ': '2',
  'ฯ': '', 'ฺ': '',
  // Numbers
  '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4',
  '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9'
};

class TranslationService {
  /**
   * Translate Thai text to English
   * Uses dictionary lookup first, then falls back to transliteration
   *
   * @param {string} thaiText - Thai text to translate
   * @param {Object} options - Translation options
   * @param {boolean} options.preferDictionary - Prefer dictionary over transliteration (default: true)
   * @param {boolean} options.lowercase - Convert result to lowercase (default: true)
   * @returns {string} Translated/transliterated English text
   */
  static translate(thaiText, options = {}) {
    const {
      preferDictionary = true,
      lowercase = true
    } = options;

    if (!thaiText || typeof thaiText !== 'string') {
      return '';
    }

    const trimmed = thaiText.trim();

    // Empty string check
    if (trimmed.length === 0) {
      return '';
    }

    // Check if text is already in English (no Thai characters)
    if (!this.containsThai(trimmed)) {
      // Already English, just normalize
      return this.normalizeEnglish(trimmed, lowercase);
    }

    // Try dictionary lookup first
    if (preferDictionary) {
      const exactMatch = TRANSLATION_DICTIONARY[trimmed];
      if (exactMatch) {
        return lowercase ? exactMatch.toLowerCase() : exactMatch;
      }

      // Try partial matches for compound words
      const partialTranslation = this.translatePartial(trimmed);
      if (partialTranslation) {
        return lowercase ? partialTranslation.toLowerCase() : partialTranslation;
      }
    }

    // Fallback to transliteration
    const transliterated = this.transliterate(trimmed);
    return lowercase ? transliterated.toLowerCase() : transliterated;
  }

  /**
   * Transliterate Thai text to romanized English
   *
   * @param {string} thaiText - Thai text to transliterate
   * @returns {string} Romanized text
   */
  static transliterate(thaiText) {
    if (!thaiText || typeof thaiText !== 'string') {
      return '';
    }

    let result = '';

    for (let i = 0; i < thaiText.length; i++) {
      const char = thaiText[i];

      // Check if character is in transliteration map
      if (THAI_TO_ROMAN[char]) {
        result += THAI_TO_ROMAN[char];
      } else if (/[a-zA-Z0-9]/.test(char)) {
        // Keep English letters and numbers
        result += char;
      } else if (/[\s_-]/.test(char)) {
        // Keep spaces, underscores, hyphens
        result += char;
      }
      // Ignore other characters (punctuation, special chars)
    }

    return result;
  }

  /**
   * Translate partial matches for compound words
   * Example: "ใบสมัครงานใหม่" → "job_application_new"
   *
   * @param {string} thaiText - Thai text
   * @returns {string|null} Partial translation or null if none found
   */
  static translatePartial(thaiText) {
    const words = Object.keys(TRANSLATION_DICTIONARY)
      .sort((a, b) => b.length - a.length); // Sort by length descending

    let remaining = thaiText;
    const translatedParts = [];

    while (remaining.length > 0) {
      let found = false;

      for (const word of words) {
        if (remaining.startsWith(word)) {
          translatedParts.push(TRANSLATION_DICTIONARY[word]);
          remaining = remaining.substring(word.length);
          found = true;
          break;
        }
      }

      if (!found) {
        // No match found, transliterate the first character and continue
        const char = remaining[0];
        const romanized = THAI_TO_ROMAN[char] || '';
        if (romanized) {
          translatedParts.push(romanized);
        }
        remaining = remaining.substring(1);
      }
    }

    if (translatedParts.length > 0) {
      return translatedParts.join('_');
    }

    return null;
  }

  /**
   * Check if text contains Thai characters
   *
   * @param {string} text - Text to check
   * @returns {boolean} True if contains Thai characters
   */
  static containsThai(text) {
    if (!text || typeof text !== 'string') {
      return false;
    }

    // Thai Unicode range: \u0E00-\u0E7F
    return /[\u0E00-\u0E7F]/.test(text);
  }

  /**
   * Normalize English text (remove special chars, handle spaces)
   *
   * @param {string} text - English text
   * @param {boolean} lowercase - Convert to lowercase
   * @returns {string} Normalized text
   */
  static normalizeEnglish(text, lowercase = true) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    let normalized = text.trim();

    // Convert to lowercase if requested
    if (lowercase) {
      normalized = normalized.toLowerCase();
    }

    // Replace spaces with underscores
    normalized = normalized.replace(/\s+/g, '_');

    // Remove special characters except underscore and hyphen
    normalized = normalized.replace(/[^a-z0-9_-]/gi, '');

    // Replace multiple underscores with single
    normalized = normalized.replace(/_+/g, '_');

    // Remove leading/trailing underscores
    normalized = normalized.replace(/^_+|_+$/g, '');

    return normalized;
  }

  /**
   * Add custom translation to dictionary (runtime addition)
   *
   * @param {string} thai - Thai term
   * @param {string} english - English translation
   */
  static addTranslation(thai, english) {
    if (thai && english && typeof thai === 'string' && typeof english === 'string') {
      TRANSLATION_DICTIONARY[thai.trim()] = english.trim();
    }
  }

  /**
   * Get all available translations
   *
   * @returns {Object} Copy of translation dictionary
   */
  static getTranslations() {
    return { ...TRANSLATION_DICTIONARY };
  }

  /**
   * Batch translate multiple terms
   *
   * @param {Array<string>} terms - Array of Thai terms
   * @param {Object} options - Translation options
   * @returns {Array<string>} Array of translated terms
   */
  static batchTranslate(terms, options = {}) {
    if (!Array.isArray(terms)) {
      return [];
    }

    return terms.map(term => this.translate(term, options));
  }
}

module.exports = TranslationService;
