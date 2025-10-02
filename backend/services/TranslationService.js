/**
 * TranslationService - Thai to English Translation for Database Schema
 *
 * 3-Tier Translation System:
 * 1. Dictionary Lookup (instant, free) - ~200 common terms
 * 2. Database Cache (fast, free) - previously translated phrases
 * 3. MyMemory Translation API (accurate, rate limited 1000/day)
 * 4. Fallback: Transliteration
 *
 * Provides translation functionality for converting Thai form names and field names
 * to English equivalents for use in PostgreSQL table and column names.
 *
 * @version 0.6.4
 * @since 2025-10-02
 */

const axios = require('axios');
const logger = require('../utils/logger.util');

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
  constructor() {
    // MyMemory API endpoint
    this.apiEndpoint = 'https://api.mymemory.translated.net/get';

    // API rate limit (free tier: 1000 requests/day)
    this.dailyLimit = 1000;

    // In-memory API usage tracking (will move to DB later)
    this.apiUsage = {
      date: new Date().toISOString().split('T')[0],
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
    };
  }

  /**
   * Main translation method with 3-tier system
   * Tier 1: Dictionary → Tier 2: Cache → Tier 3: API → Fallback: Transliteration
   *
   * @param {string} thaiText - Thai text to translate
   * @param {Object} options - Translation options
   * @param {boolean} options.useAPI - Allow API calls (default: true)
   * @param {boolean} options.lowercase - Convert result to lowercase (default: true)
   * @returns {Promise<object>} Translation result with source and confidence
   */
  async translate(thaiText, options = {}) {
    const {
      useAPI = true,
      lowercase = true
    } = options;

    try {
      if (!thaiText || typeof thaiText !== 'string') {
        throw new Error('Invalid input: thaiText must be a non-empty string');
      }

      const trimmed = thaiText.trim();

      if (trimmed.length === 0) {
        return {
          thai: '',
          english: '',
          source: 'empty',
          confidence: 1.0,
        };
      }

      logger.info(`Translating: "${trimmed}"`);

      // Check if already in English
      if (!this.containsThai(trimmed)) {
        const normalized = this.normalizeEnglish(trimmed, lowercase);
        return {
          thai: trimmed,
          english: normalized,
          source: 'already_english',
          confidence: 1.0,
        };
      }

      // Tier 1: Dictionary Lookup
      const dictionaryResult = this.lookupDictionary(trimmed, lowercase);
      if (dictionaryResult) {
        logger.info(`Dictionary hit: "${trimmed}" → "${dictionaryResult}"`);
        return {
          thai: trimmed,
          english: dictionaryResult,
          source: 'dictionary',
          confidence: 1.0,
        };
      }

      // Tier 2: Database Cache (TODO: implement after models)
      // const cacheResult = await this.lookupCache(trimmed);
      // if (cacheResult) {
      //   return cacheResult;
      // }

      // Tier 3: MyMemory Translation API
      if (useAPI) {
        const apiResult = await this.callMyMemoryAPI(trimmed);
        if (apiResult) {
          const cleaned = this.normalizeEnglish(apiResult.english, lowercase);
          logger.info(`API translation: "${trimmed}" → "${cleaned}"`);

          // TODO: Save to cache
          // await this.saveToCache(trimmed, cleaned, 'api', apiResult.confidence);

          return {
            thai: trimmed,
            english: cleaned,
            source: 'api',
            confidence: apiResult.confidence,
          };
        }
      }

      // Fallback: Transliteration
      const fallback = this.transliterate(trimmed);
      const normalized = this.normalizeEnglish(fallback, lowercase);

      logger.warn(`Fallback to transliteration: "${trimmed}" → "${normalized}"`);

      return {
        thai: trimmed,
        english: normalized,
        source: 'transliteration',
        confidence: 0.6,
      };

    } catch (error) {
      logger.error('Translation error:', error);

      // Always provide a fallback
      const fallback = this.transliterate(thaiText);
      const normalized = this.normalizeEnglish(fallback, lowercase);

      return {
        thai: thaiText,
        english: normalized,
        source: 'error_fallback',
        confidence: 0.3,
        error: error.message,
      };
    }
  }

  /**
   * Tier 1: Dictionary Lookup
   * @param {string} thaiText - Thai text to lookup
   * @param {boolean} lowercase - Convert to lowercase
   * @returns {string|null} English translation or null
   */
  lookupDictionary(thaiText, lowercase = true) {
    try {
      // Exact match
      const exactMatch = TRANSLATION_DICTIONARY[thaiText];
      if (exactMatch) {
        return lowercase ? exactMatch.toLowerCase() : exactMatch;
      }

      // Partial matches for compound words
      const partialTranslation = this.translatePartial(thaiText);
      if (partialTranslation) {
        return lowercase ? partialTranslation.toLowerCase() : partialTranslation;
      }

      return null;
    } catch (error) {
      logger.error('Dictionary lookup error:', error);
      return null;
    }
  }

  /**
   * Tier 2: Database Cache Lookup
   * TODO: Implement after creating Translation model
   */
  async lookupCache(thaiText) {
    // TODO: Implement
    return null;
  }

  /**
   * Tier 3: MyMemory Translation API
   * @param {string} thaiText - Thai text to translate
   * @returns {Promise<object|null>} API translation result or null
   */
  async callMyMemoryAPI(thaiText) {
    try {
      // Check API rate limit
      if (!this.checkAPILimit()) {
        logger.warn('API rate limit exceeded, skipping API call');
        return null;
      }

      // Call MyMemory API
      const response = await axios.get(this.apiEndpoint, {
        params: {
          q: thaiText,
          langpair: 'th|en',
        },
        timeout: 5000, // 5 second timeout
      });

      this.incrementAPIUsage('success');

      if (response.data && response.data.responseStatus === 200) {
        const translatedText = response.data.responseData.translatedText;
        const match = response.data.responseData.match || 0.7;

        return {
          english: translatedText,
          confidence: match,
        };
      }

      logger.warn('API returned non-200 status:', response.data);
      this.incrementAPIUsage('error');
      return null;

    } catch (error) {
      logger.error('MyMemory API error:', error.message);
      this.incrementAPIUsage('error');
      return null;
    }
  }

  /**
   * Check API rate limit
   * @returns {boolean} True if API call is allowed
   */
  checkAPILimit() {
    const today = new Date().toISOString().split('T')[0];

    // Reset counter if new day
    if (this.apiUsage.date !== today) {
      this.apiUsage = {
        date: today,
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
      };
    }

    return this.apiUsage.requestCount < this.dailyLimit;
  }

  /**
   * Increment API usage counter
   * @param {string} status - 'success' or 'error'
   */
  incrementAPIUsage(status = 'success') {
    this.apiUsage.requestCount++;

    if (status === 'success') {
      this.apiUsage.successCount++;
    } else {
      this.apiUsage.errorCount++;
    }

    logger.info(`API usage: ${this.apiUsage.requestCount}/${this.dailyLimit} (${status})`);

    // TODO: Save to database
  }

  /**
   * Get current API usage statistics
   * @returns {object} API usage stats
   */
  getAPIUsage() {
    return {
      ...this.apiUsage,
      remaining: this.dailyLimit - this.apiUsage.requestCount,
      percentUsed: ((this.apiUsage.requestCount / this.dailyLimit) * 100).toFixed(2),
    };
  }

  /**
   * Transliterate Thai text to romanized English
   *
   * @param {string} thaiText - Thai text to transliterate
   * @returns {string} Romanized text
   */
  transliterate(thaiText) {
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
  translatePartial(thaiText) {
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
  containsThai(text) {
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
  normalizeEnglish(text, lowercase = true) {
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
  addTranslation(thai, english) {
    if (thai && english && typeof thai === 'string' && typeof english === 'string') {
      TRANSLATION_DICTIONARY[thai.trim()] = english.trim();
    }
  }

  /**
   * Get all available translations
   *
   * @returns {Object} Copy of translation dictionary
   */
  getTranslations() {
    return { ...TRANSLATION_DICTIONARY };
  }

  /**
   * Batch translate multiple terms
   *
   * @param {Array<string>} terms - Array of Thai terms
   * @param {Object} options - Translation options
   * @returns {Promise<Array>} Array of translation results
   */
  async batchTranslate(terms, options = {}) {
    if (!Array.isArray(terms)) {
      return [];
    }

    const results = [];
    for (const term of terms) {
      const result = await this.translate(term, options);
      results.push(result);

      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }
}

// Export singleton instance
module.exports = new TranslationService();
