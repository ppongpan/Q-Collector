/**
 * TranslationService - Thai to English Translation for Database Schema
 *
 * 3-Tier Translation System:
 * 1. Dictionary Lookup (instant, free) - ~250 common terms
 * 2. Database Cache (fast, free) - previously translated phrases
 * 3. LibreTranslate API (self-hosted, unlimited) - accurate neural translation
 * 4. Fallback: Transliteration
 *
 * Provides translation functionality for converting Thai form names and field names
 * to English equivalents for use in PostgreSQL table and column names.
 *
 * @version 0.6.5
 * @since 2025-10-02
 */

const axios = require('axios');
const logger = require('../utils/logger.util');

/**
 * Comprehensive Thai→English Translation Dictionary
 * Merged from multiple sources for complete coverage
 * Used for translating common form and field terms
 */
const TRANSLATION_DICTIONARY = {
  // Form-related terms (merged)
  'ฟอร์ม': 'form',
  'แบบฟอร์ม': 'form',
  'บันทึก': 'record',
  'การบันทึก': 'recording',
  'รายการ': 'list',
  'ข้อมูล': 'information',
  'รายละเอียด': 'detail',
  'คำขอ': 'request',
  'การร้องขอ': 'request',
  'คำร้อง': 'request',
  'ใบ': 'form',
  'เอกสาร': 'document',
  'แบบ': 'form',
  'การสมัคร': 'registration',
  'สมัคร': 'register',
  'ลงทะเบียน': 'register',
  'การลงทะเบียน': 'registration',
  'ติดตาม': 'follow_up',
  'การติดตาม': 'follow_up',
  'รายการติดตาม': 'follow_up_list',
  'สำรวจ': 'survey',
  'แบบสำรวจ': 'survey',
  'ประเมิน': 'evaluation',
  'การประเมิน': 'evaluation',
  'แบบประเมิน': 'evaluation_form',
  'ใบสมัครงาน': 'job_application',
  'ใบลา': 'leave_request',
  'ใบเบิก': 'requisition',
  'ใบสั่งซื้อ': 'purchase_order',
  'ใบเสนอราคา': 'quotation',
  'ใบแจ้งหนี้': 'invoice',
  'ใบเสร็จรับเงิน': 'receipt',
  'ใบเสร็จ': 'receipt',
  'รายงาน': 'report',

  // Personal Information (merged)
  'ชื่อ': 'name',
  'นามสกุล': 'surname',
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
  'อาชีพ': 'occupation',

  // Contact Information (merged)
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
  'เบอร์': 'number',
  'เบอร์โทร': 'phone',
  'เบอร์โทรศัพท์': 'phone_number',
  'หมายเลข': 'number',
  'รหัส': 'code',
  'เลขที่': 'number',
  'อีเมล': 'email',
  'อีเมล์': 'email',
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
  'สำนักงาน': 'office',
  'คลัง': 'warehouse',
  'ไซต์': 'site',
  'พื้นที่': 'area',
  'เขต': 'zone',
  'เมือง': 'city',
  'ประเทศ': 'country',

  // Business terms (merged)
  'ลูกค้า': 'customer',
  'ข้อมูลลูกค้า': 'customer_information',
  'พนักงาน': 'employee',
  'บุคลากร': 'personnel',
  'ทีม': 'team',
  'สินค้า': 'product',
  'ผลิตภัณฑ์': 'product',
  'บริการ': 'service',
  'การบริการ': 'service',
  'คำสั่งซื้อ': 'order',
  'ใบสั่งซื้อ': 'purchase_order',
  'ยอดเงิน': 'amount',
  'หน่วย': 'unit',
  'โครงการ': 'project',
  'งาน': 'work',
  'ภารกิจ': 'task',
  'กิจกรรม': 'activity',
  'การประชุม': 'meeting',
  'นัดหมาย': 'appointment',
  'สัญญา': 'contract',
  'การชำระเงิน': 'payment',
  'ชำระ': 'pay',

  // Action verbs
  'สร้าง': 'create',
  'การสร้าง': 'creation',
  'แก้ไข': 'edit',
  'การแก้ไข': 'editing',
  'ลบ': 'delete',
  'การลบ': 'deletion',
  'ส่ง': 'send',
  'การส่ง': 'sending',
  'บันทึก': 'save',
  'การบันทึก': 'saving',
  'ยืนยัน': 'confirm',
  'การยืนยัน': 'confirmation',
  'อนุมัติ': 'approve',
  'การอนุมัติ': 'approval',
  'ตรวจสอบ': 'check',
  'การตรวจสอบ': 'checking',
  'ค้นหา': 'search',
  'การค้นหา': 'searching',
  'แจ้ง': 'notify',
  'การแจ้ง': 'notification',
  'การรายงาน': 'reporting',
  'ติดต่อ': 'contact',
  'การติดต่อ': 'contact',
  'เพิ่ม': 'add',
  'อัพเดท': 'update',
  'ปรับปรุง': 'update',

  // Technical terms
  'ระบบ': 'system',
  'เทคนิค': 'technic',
  'เทคนิคเซอร์วิส': 'technic_service',
  'เทคโนโลยี': 'technology',
  'คอมพิวเตอร์': 'computer',
  'ซอฟต์แวร์': 'software',
  'ฮาร์ดแวร์': 'hardware',
  'เครือข่าย': 'network',
  'ฐานข้อมูล': 'database',
  'แอปพลิเคชัน': 'application',
  'แอป': 'app',
  'เว็บ': 'web',
  'อินเทอร์เน็ต': 'internet',
  'ออนไลน์': 'online',
  'ออฟไลน์': 'offline',

  // Departments
  'งานขาย': 'sales',
  'ขาย': 'sales',
  'การตลาด': 'marketing',
  'บัญชี': 'accounting',
  'การเงิน': 'finance',
  'ทรัพยากรบุคคล': 'human_resources',
  'HR': 'hr',
  'ผลิต': 'production',
  'คลังสินค้า': 'warehouse',
  'โลจิสติกส์': 'logistics',
  'ซ่อมบำรุง': 'maintenance',
  'ดูแลระบบ': 'admin',
  'ฝ่ายบริการลูกค้า': 'customer_service',
  'บริการลูกค้า': 'customer_service',
  'ดูแลลูกค้า': 'customer_care',

  // Status & state
  'สถานะการทำงาน': 'work_status',
  'ใช้งาน': 'active',
  'ไม่ใช้งาน': 'inactive',
  'รอดำเนินการ': 'pending',
  'กำลังดำเนินการ': 'in_progress',
  'เสร็จสิ้น': 'completed',
  'สำเร็จ': 'success',
  'ล้มเหลว': 'failed',
  'ยกเลิก': 'cancelled',
  'พร้อม': 'ready',
  'ไม่พร้อม': 'not_ready',
  'แก้ปัญหา': 'troubleshoot',
  'ปัญหา': 'issue',
  'เรื่องร้องเรียน': 'complaint',
  'ร้องเรียน': 'complaint',
  'ข้อเสนอแนะ': 'suggestion',
  'คำติชม': 'feedback',

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
    // Optional Translation API endpoint (currently not used - using Dictionary)
    this.apiEndpoint = process.env.TRANSLATION_API_URL || null;
    this.apiKey = process.env.TRANSLATION_API_KEY || '';

    // Statistics tracking
    this.stats = {
      date: new Date().toISOString().split('T')[0],
      dictionaryHits: 0,
      cacheHits: 0,
      apiCalls: 0,
      apiSuccess: 0,
      apiErrors: 0,
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
        this.stats.dictionaryHits++;
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
      //   this.stats.cacheHits++;
      //   return cacheResult;
      // }

      // Tier 3: External Translation API (Argos Translate)
      if (useAPI && this.apiEndpoint) {
        const apiResult = await this.callTranslationAPI(trimmed);
        if (apiResult) {
          const cleaned = this.normalizeEnglish(apiResult.english, lowercase);
          logger.info(`Argos API: "${trimmed}" → "${cleaned}"`);
          return {
            thai: trimmed,
            english: cleaned,
            source: 'argos-api',
            confidence: 0.95,
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
   * Tier 3: Argos Translation API
   * @param {string} thaiText - Thai text to translate
   * @returns {Promise<object|null>} Translation result or null
   */
  async callTranslationAPI(thaiText) {
    try {
      this.stats.apiCalls++;

      const requestBody = {
        q: thaiText,
        source: 'th',
        target: 'en',
      };

      // Add API key if configured
      if (this.apiKey) {
        requestBody.api_key = this.apiKey;
      }

      // Call Translation API
      const response = await axios.post(`${this.apiEndpoint}/translate`, requestBody, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      });

      if (response.data && response.data.translatedText) {
        this.stats.apiSuccess++;
        const translatedText = response.data.translatedText;

        logger.info(`Translation API success: "${thaiText}" → "${translatedText}"`);

        return {
          english: translatedText,
        };
      }

      logger.warn('Translation API returned unexpected response:', response.data);
      this.stats.apiErrors++;
      return null;

    } catch (error) {
      this.stats.apiErrors++;

      if (error.code === 'ECONNREFUSED') {
        logger.error('Translation API not available. Check: ' + this.apiEndpoint);
      } else {
        logger.error('Translation API error:', error.message);
      }

      return null;
    }
  }

  /**
   * Get translation statistics
   * @returns {object} Current stats
   */
  getStats() {
    return {
      ...this.stats,
      totalTranslations: this.stats.dictionaryHits + this.stats.cacheHits + this.stats.apiSuccess,
      apiSuccessRate: this.stats.apiCalls > 0
        ? Math.round((this.stats.apiSuccess / this.stats.apiCalls) * 100)
        : 0,
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
