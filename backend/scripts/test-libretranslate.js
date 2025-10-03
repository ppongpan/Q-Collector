/**
 * LibreTranslate Translation Testing Script
 *
 * Tests the TranslationService with 20 Thai terms to verify:
 * - Dictionary lookup (Tier 1)
 * - LibreTranslate API calls (Tier 3)
 * - Fallback transliteration
 * - Statistics tracking
 *
 * Usage: node backend/scripts/test-libretranslate.js
 *
 * @version 1.0.0
 * @since 2025-10-02
 */

require('dotenv').config();
const TranslationService = require('../services/TranslationService');

// 20 Thai terms for testing (mix of dictionary words and new terms)
const testTerms = [
  // Dictionary words (should hit Tier 1)
  'ชื่อเต็ม',                    // full_name (dictionary)
  'วันเกิด',                     // birth_date (dictionary)
  'เบอร์โทรศัพท์',               // phone_number (dictionary)
  'ที่อยู่',                      // address (dictionary)
  'อีเมล',                       // email (dictionary)

  // Compound words (partial dictionary + transliteration)
  'ฟอร์มบันทึกการติดต่อ',        // contact recording form
  'รายการสินค้า',                // product list
  'ข้อมูลลูกค้า',                // customer information

  // New terms (should use LibreTranslate API - Tier 3)
  'แบบสอบถามความพึงพอใจ',        // satisfaction survey
  'ใบรับรองการทำงาน',            // work certificate
  'รายงานการประชุมประจำเดือน',   // monthly meeting report
  'แผนการตลาดประจำปี',           // annual marketing plan
  'คำขอลาพักร้อน',               // vacation leave request
  'ประเมินผลการทำงาน',           // performance evaluation

  // Complex terms
  'ระบบจัดการคลังสินค้า',        // warehouse management system
  'การวิเคราะห์ข้อมูลขายประจำวัน', // daily sales data analysis
  'ใบสั่งซื้ออุปกรณ์สำนักงาน',   // office equipment purchase order
  'บันทึกการเบิกวัสดุก่อสร้าง',  // construction material requisition record

  // Edge cases
  'ABC123',                      // Already English
  'สถานะการดำเนินงาน',           // operation status
];

/**
 * Main test function
 */
async function testTranslation() {
  console.log('\n=================================================');
  console.log('🧪 LibreTranslate Translation Testing Script');
  console.log('=================================================\n');

  console.log(`📝 Testing ${testTerms.length} Thai terms...\n`);
  console.log('Endpoint:', process.env.LIBRETRANSLATE_URL || 'http://localhost:5555');
  console.log('---\n');

  const results = [];

  // Test each term
  for (let i = 0; i < testTerms.length; i++) {
    const term = testTerms[i];

    console.log(`\n[${i + 1}/${testTerms.length}] Testing: "${term}"`);
    console.log('─'.repeat(60));

    try {
      const result = await TranslationService.translate(term, {
        useAPI: true,
        lowercase: true,
      });

      results.push({
        index: i + 1,
        thai: term,
        ...result,
      });

      // Display result
      console.log(`✅ Thai:       ${result.thai}`);
      console.log(`   English:    ${result.english}`);
      console.log(`   Source:     ${result.source}`);
      console.log(`   Confidence: ${(result.confidence * 100).toFixed(0)}%`);

      if (result.error) {
        console.log(`   ⚠️  Error:     ${result.error}`);
      }

      // Color-code by source
      const emoji = getSourceEmoji(result.source);
      console.log(`   ${emoji} ${getSourceDescription(result.source)}`);

    } catch (error) {
      console.error(`❌ Error translating "${term}":`, error.message);
      results.push({
        index: i + 1,
        thai: term,
        english: '',
        source: 'error',
        confidence: 0,
        error: error.message,
      });
    }

    // Small delay between API calls
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Summary
  console.log('\n\n=================================================');
  console.log('📊 TRANSLATION SUMMARY');
  console.log('=================================================\n');

  const stats = TranslationService.getStats();

  console.log('Translation Statistics:');
  console.log(`  📚 Dictionary Hits:    ${stats.dictionaryHits} (${percentage(stats.dictionaryHits, testTerms.length)})`);
  console.log(`  💾 Cache Hits:         ${stats.cacheHits} (${percentage(stats.cacheHits, testTerms.length)})`);
  console.log(`  🌐 API Calls:          ${stats.apiCalls} (${percentage(stats.apiCalls, testTerms.length)})`);
  console.log(`  ✅ API Success:        ${stats.apiSuccess} (${percentage(stats.apiSuccess, stats.apiCalls)})`);
  console.log(`  ❌ API Errors:         ${stats.apiErrors} (${percentage(stats.apiErrors, stats.apiCalls)})`);
  console.log(`  📈 Total Translations: ${stats.totalTranslations}`);
  console.log(`  🎯 API Success Rate:   ${stats.apiSuccessRate}%\n`);

  // Results table
  console.log('Results Table:');
  console.log('─'.repeat(100));
  console.log(formatRow(['#', 'Thai', 'English', 'Source', 'Conf']));
  console.log('─'.repeat(100));

  results.forEach(r => {
    console.log(formatRow([
      r.index.toString(),
      truncate(r.thai, 25),
      truncate(r.english, 30),
      r.source,
      `${(r.confidence * 100).toFixed(0)}%`,
    ]));
  });

  console.log('─'.repeat(100));

  // Recommendations
  console.log('\n📌 Recommendations:\n');

  if (stats.apiErrors > 0) {
    console.log('⚠️  LibreTranslate API had errors. Check if:');
    console.log('   - LibreTranslate is running: docker-compose ps');
    console.log('   - Port is correct: ' + (process.env.LIBRETRANSLATE_URL || 'http://localhost:5555'));
    console.log('   - Run: docker-compose up -d libretranslate\n');
  }

  if (stats.dictionaryHits / testTerms.length > 0.5) {
    console.log('✅ Dictionary coverage is good (>50%). API usage will be low.\n');
  } else {
    console.log('💡 Consider adding more terms to dictionary for better performance.\n');
  }

  if (stats.apiSuccessRate === 100 && stats.apiCalls > 0) {
    console.log('🎉 LibreTranslate API is working perfectly!\n');
  }

  console.log('=================================================\n');
}

/**
 * Helper: Get emoji for translation source
 */
function getSourceEmoji(source) {
  const emojis = {
    'dictionary': '📚',
    'cache': '💾',
    'libretranslate': '🌐',
    'transliteration': '🔤',
    'already_english': '🔤',
    'error_fallback': '⚠️',
    'empty': '∅',
  };
  return emojis[source] || '❓';
}

/**
 * Helper: Get description for translation source
 */
function getSourceDescription(source) {
  const descriptions = {
    'dictionary': 'From built-in dictionary (instant, free)',
    'cache': 'From database cache (fast, free)',
    'libretranslate': 'From LibreTranslate API (accurate, self-hosted)',
    'transliteration': 'Fallback transliteration (phonetic)',
    'already_english': 'Already in English',
    'error_fallback': 'Error occurred, used fallback',
    'empty': 'Empty input',
  };
  return descriptions[source] || 'Unknown source';
}

/**
 * Helper: Calculate percentage
 */
function percentage(value, total) {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

/**
 * Helper: Format table row
 */
function formatRow(columns) {
  return columns
    .map((col, i) => {
      const widths = [3, 27, 32, 18, 6];
      return col.padEnd(widths[i]);
    })
    .join(' | ');
}

/**
 * Helper: Truncate text
 */
function truncate(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// Run test
if (require.main === module) {
  testTranslation()
    .then(() => {
      console.log('✅ Test completed successfully\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testTranslation };
