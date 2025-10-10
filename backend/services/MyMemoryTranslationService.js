/**
 * MyMemory Translation Service
 * Free translation API with Thai support (1,000 requests/day)
 *
 * @version 1.1.0 (v0.7.7-dev)
 * @created 2025-10-06
 * @updated 2025-10-10
 *
 * NEW in v1.1.0:
 * - Context hints for better translation quality
 * - Enhanced quality validation
 * - Transliteration detection
 * - Detailed quality metrics logging
 */

const axios = require('axios');

class MyMemoryTranslationService {
  constructor() {
    this.baseURL = 'https://api.mymemory.translated.net/get';
    this.timeout = 5000; // ⚡ Reduced to 5 seconds (was 10)
    this.maxRetries = 1; // ⚡ Reduced to 1 attempt (was 3) - faster failure
    this.retryDelay = 500; // ⚡ Reduced to 0.5 seconds (was 1)
    this.rateLimitCooldown = 60000; // 1 minute cooldown after rate limit
    this.isRateLimited = false;
    this.rateLimitUntil = null;

    // Redis cache
    try {
      const CacheService = require('./CacheService');
      this.cache = CacheService;
    } catch {
      this.cache = null;
    }
  }

  /**
   * Translate Thai text to English
   * ⚡ v1.1.0 NOW WITH: Context hints + Quality validation + Transliteration detection
   * @param {string} thaiText - Thai text to translate
   * @param {Object} options - Translation options
   * @param {string} options.context - Context hint ('form', 'field', 'department', 'action', 'general')
   * @param {number} options.minQuality - Minimum quality threshold (0.0-1.0, default 0.5)
   * @param {boolean} options.rejectTransliteration - Reject pure transliteration (default false)
   * @returns {Promise<Object>} Translation result
   */
  async translateToEnglish(thaiText, options = {}) {
    if (!thaiText || typeof thaiText !== 'string') {
      throw new Error('Invalid Thai text provided');
    }

    const trimmedText = thaiText.trim();
    if (trimmedText.length === 0) {
      throw new Error('Empty text cannot be translated');
    }

    // ✨ NEW: Extract context for better translations
    const context = options.context || 'general';
    const minQuality = options.minQuality !== undefined ? options.minQuality : 0.5;
    const rejectTransliteration = options.rejectTransliteration || false;

    // ⚡ Check rate limit status
    if (this.isRateLimited && this.rateLimitUntil && Date.now() < this.rateLimitUntil) {
      const waitSeconds = Math.ceil((this.rateLimitUntil - Date.now()) / 1000);
      throw new Error(`Rate limited. Please wait ${waitSeconds} seconds`);
    }

    // ⚡ Try Redis cache first (7-day TTL) - include context in key
    if (this.cache) {
      const cacheKey = `translation:th-en:${context}:${trimmedText}`;
      try {
        const cached = await this.cache.get(cacheKey);
        if (cached) {
          console.log(`✅ Translation cache HIT: "${trimmedText}" (context: ${context})`);
          return JSON.parse(cached);
        }
      } catch (cacheError) {
        // Ignore cache errors
      }
    }

    try {
      // ✨ NEW: Pass context hint to API
      const response = await this._makeRequest(trimmedText, 'th', 'en', context);

      if (response.responseStatus !== 200) {
        throw new Error(`Translation failed: ${response.responseDetails || 'Unknown error'}`);
      }

      let translatedText = response.responseData.translatedText;
      const matchScore = response.responseData.match || 0;
      const quality = this._getQualityLevel(matchScore);

      // ✨ NEW: Remove context hints from translation
      translatedText = this._stripContextHint(translatedText, context);

      // ✨ NEW: Quality validation
      if (matchScore < minQuality) {
        console.warn(`⚠️ Low quality translation for "${thaiText}": match=${matchScore} < ${minQuality}`);
        throw new Error(`Translation quality too low: ${matchScore} < ${minQuality}`);
      }

      // ✨ NEW: Transliteration detection
      if (rejectTransliteration && this._isTransliteration(thaiText, translatedText)) {
        console.warn(`⚠️ Detected transliteration for "${thaiText}" → "${translatedText}"`);
        throw new Error(`Translation rejected: appears to be transliteration`);
      }

      const englishSlug = this._toSlug(translatedText, options);

      const result = {
        original: thaiText,
        translated: translatedText,
        slug: englishSlug,
        source: 'th',
        target: 'en',
        match: matchScore,
        quality: quality,
        context: context // ✨ NEW: Include context in result
      };

      // ⚡ Cache successful translation (7 days = 604800 seconds) - include context
      if (this.cache) {
        const cacheKey = `translation:th-en:${context}:${trimmedText}`;
        try {
          await this.cache.set(cacheKey, JSON.stringify(result), 604800);
        } catch (cacheError) {
          // Ignore cache errors
        }
      }

      // ✨ NEW: Enhanced logging with quality metrics
      this._logUsage(thaiText, translatedText, quality, matchScore, context).catch(() => {
        // Silently ignore logging errors
      });

      return result;
    } catch (error) {
      console.error('MyMemory translation error:', error.message);
      throw error;
    }
  }

  /**
   * Log translation usage for monitoring
   * ✨ v1.1.0: Enhanced with quality metrics and context tracking
   * @private
   */
  async _logUsage(thaiText, englishText, quality, matchScore, context) {
    try {
      const fs = require('fs');
      const path = require('path');
      const logsDir = path.join(__dirname, '../logs');
      const usageLogFile = path.join(logsDir, 'translation-usage.json');

      // Ensure logs directory exists
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      // Load existing usage
      let usage = {
        totalCalls: 0,
        totalCharacters: 0,
        dailyUsage: {},
        qualityStats: { // ✨ NEW: Quality statistics
          excellent: 0,
          good: 0,
          fair: 0,
          machine: 0
        },
        contextStats: {}, // ✨ NEW: Context usage tracking
        translations: []
      };

      if (fs.existsSync(usageLogFile)) {
        try {
          const data = fs.readFileSync(usageLogFile, 'utf8');
          usage = JSON.parse(data);
          // Ensure new fields exist in loaded data
          usage.qualityStats = usage.qualityStats || { excellent: 0, good: 0, fair: 0, machine: 0 };
          usage.contextStats = usage.contextStats || {};
        } catch (error) {
          // Ignore parse errors
        }
      }

      const today = new Date().toISOString().split('T')[0];
      const charCount = thaiText.length;

      // Update totals
      usage.totalCalls++;
      usage.totalCharacters += charCount;

      // ✨ NEW: Update quality statistics
      if (usage.qualityStats[quality]) {
        usage.qualityStats[quality]++;
      }

      // ✨ NEW: Update context statistics
      if (!usage.contextStats[context]) {
        usage.contextStats[context] = 0;
      }
      usage.contextStats[context]++;

      // Update daily usage
      if (!usage.dailyUsage[today]) {
        usage.dailyUsage[today] = {
          calls: 0,
          characters: 0,
          qualityBreakdown: { excellent: 0, good: 0, fair: 0, machine: 0 } // ✨ NEW
        };
      }
      usage.dailyUsage[today].calls++;
      usage.dailyUsage[today].characters += charCount;
      // ✨ NEW: Track quality per day
      if (usage.dailyUsage[today].qualityBreakdown[quality]) {
        usage.dailyUsage[today].qualityBreakdown[quality]++;
      }

      // Add translation record (keep last 100) - ✨ NEW: Include match score and context
      usage.translations.unshift({
        timestamp: new Date().toISOString(),
        thai: thaiText,
        english: englishText,
        quality: quality,
        matchScore: matchScore, // ✨ NEW
        context: context, // ✨ NEW
        characters: charCount
      });

      if (usage.translations.length > 100) {
        usage.translations = usage.translations.slice(0, 100);
      }

      // Save usage
      fs.writeFileSync(usageLogFile, JSON.stringify(usage, null, 2), 'utf8');
    } catch (error) {
      // Silently ignore logging errors
    }
  }

  /**
   * Make HTTP request to MyMemory API with retry logic
   * ⚡ v1.1.0 NOW WITH: Context hints + Rate limit detection
   * @private
   */
  async _makeRequest(text, sourceLang, targetLang, context = 'general', attempt = 1) {
    try {
      // ✨ NEW: Build context-aware query
      // Note: Context hints improve translation accuracy by providing semantic context
      // The hint is sent to MyMemory but should be removed from final translation
      const contextHints = {
        form: 'form',
        field: 'field name',
        department: 'department',
        action: 'action verb',
        general: ''
      };

      const hint = contextHints[context] || '';
      const queryText = hint ? `${text} (${hint})` : text;

      const response = await axios.get(this.baseURL, {
        params: {
          q: queryText, // ✨ NEW: Context-enhanced query
          langpair: `${sourceLang}|${targetLang}`
        },
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Q-Collector/1.1.0' // ✨ NEW: Updated version
        }
      });

      // ⚡ Reset rate limit flag on success
      if (this.isRateLimited) {
        this.isRateLimited = false;
        this.rateLimitUntil = null;
        console.log('✅ MyMemory API rate limit lifted');
      }

      return response.data;
    } catch (error) {
      // ⚡ Detect rate limit (429 Too Many Requests)
      if (error.response && error.response.status === 429) {
        this.isRateLimited = true;
        this.rateLimitUntil = Date.now() + this.rateLimitCooldown;
        console.warn(`⚠️ MyMemory API rate limited. Cooldown for ${this.rateLimitCooldown / 1000}s`);
        throw new Error(`MyMemory API request failed: Request failed with status code 429`);
      }

      // ⚡ Retry logic (only 1 retry now)
      if (attempt < this.maxRetries) {
        console.warn(`MyMemory request failed (attempt ${attempt}/${this.maxRetries}), retrying...`);
        await this._sleep(this.retryDelay * attempt);
        return this._makeRequest(text, sourceLang, targetLang, context, attempt + 1);
      }

      throw new Error(`MyMemory API request failed: ${error.message}`);
    }
  }

  /**
   * Convert translated text to PostgreSQL-safe slug
   * ⚡ v1.1.1 FIX: Increased maxLength from 40 to 50 for longer English phrases
   * @private
   */
  _toSlug(text, options = {}) {
    let slug = text.toLowerCase();

    // Remove special characters
    slug = slug.replace(/[^a-z0-9\s_-]/g, '');

    // Replace spaces and hyphens with underscores
    slug = slug.replace(/[-\s]+/g, '_');

    // Remove consecutive underscores
    slug = slug.replace(/_+/g, '_');

    // Remove leading/trailing underscores
    slug = slug.replace(/^_+|_+$/g, '');

    // Limit length (PostgreSQL identifier max is 63 chars)
    // ⚡ FIXED v1.1.1: Increased from 40 to 50 to preserve more meaningful English words
    // Reason: Long Thai phrases translate to long English phrases (e.g., "enterprise_accident_risk_management_and_prevention_information")
    // 50 chars allows full words, tableNameHelper adds hash suffix to ensure uniqueness
    const maxLength = options.maxLength || 50;
    if (slug.length > maxLength) {
      slug = slug.substring(0, maxLength);
    }

    // Ensure it starts with a letter or underscore
    if (slug && !/^[a-z_]/.test(slug)) {
      slug = '_' + slug;
    }

    return slug || 'translated_field';
  }

  /**
   * Get quality level based on match score
   * @private
   */
  _getQualityLevel(match) {
    if (match >= 0.9) return 'excellent';
    if (match >= 0.7) return 'good';
    if (match >= 0.5) return 'fair';
    return 'machine';
  }

  /**
   * Strip context hints from translated text
   * ✨ NEW in v1.1.0
   * @private
   */
  _stripContextHint(translatedText, context) {
    // Remove context hints that may have been added by MyMemory
    const contextPatterns = {
      form: /\s*\((?:form|document|form document)\)\s*/gi,
      field: /\s*\((?:field|field name|data field)\)\s*/gi,
      department: /\s*\((?:department|department section)\)\s*/gi,
      action: /\s*\((?:action|action verb|action operation)\)\s*/gi,
      general: /\s*\(general\)\s*/gi
    };

    let cleaned = translatedText;

    // Apply all patterns (not just context-specific)
    // because MyMemory might add unexpected variations
    Object.values(contextPatterns).forEach(pattern => {
      cleaned = cleaned.replace(pattern, ' ');
    });

    // Clean up extra spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
  }

  /**
   * Detect if translation is just transliteration (phonetic conversion)
   * ✨ NEW in v1.1.0
   * @private
   */
  _isTransliteration(thaiText, englishText) {
    // Remove special characters for comparison
    const cleanThai = thaiText.replace(/[^ก-๙]/g, '').toLowerCase();
    const cleanEnglish = englishText.replace(/[^a-z]/g, '').toLowerCase();

    // If English is very short (< 3 chars), hard to determine
    if (cleanEnglish.length < 3) {
      return false;
    }

    // Common transliteration patterns (Thai phonetic to English)
    // Check if English text contains sequential Thai consonant sounds
    const transliterationPatterns = [
      /^(kh|th|ph|ng|ch)/, // Thai consonants: ข ท ผ ง ช
      /(at|it|ut|et|ot)$/, // Thai vowel endings: อัด อิด อุด เอด โอด
      /^(ban|rai|form|kar)/, // Common transliterated starts
      /(thuk|kayn|ngan|lak)$/ // Common transliterated ends
    ];

    // If English matches multiple transliteration patterns, likely transliteration
    let patternMatches = 0;
    for (const pattern of transliterationPatterns) {
      if (pattern.test(cleanEnglish)) {
        patternMatches++;
      }
    }

    // Check length ratio - transliteration tends to be similar length
    const lengthRatio = cleanEnglish.length / cleanThai.length;
    const isSimilarLength = lengthRatio > 0.5 && lengthRatio < 2.0;

    // Decision: If has 2+ transliteration patterns AND similar length, likely transliteration
    const isLikelyTransliteration = patternMatches >= 2 && isSimilarLength;

    if (isLikelyTransliteration) {
      console.log(`🔍 Transliteration detected: "${thaiText}" → "${englishText}" (patterns: ${patternMatches}, ratio: ${lengthRatio.toFixed(2)})`);
    }

    return isLikelyTransliteration;
  }

  /**
   * Sleep utility for retry logic
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test connection to MyMemory API
   */
  async testConnection() {
    try {
      const result = await this.translateToEnglish('สวัสดี');
      console.log('✅ MyMemory API connection successful');
      console.log('Test translation:', result);
      return true;
    } catch (error) {
      console.error('❌ MyMemory API connection failed:', error.message);
      return false;
    }
  }
}

module.exports = MyMemoryTranslationService;
