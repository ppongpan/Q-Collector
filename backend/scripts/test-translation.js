/**
 * Test Translation Service
 * Tests Thai→English translation with dictionary, API, and fallback
 *
 * Usage: node backend/scripts/test-translation.js
 */

const TranslationService = require('../services/TranslationService');

// Test cases from real Q-Collector forms
const testCases = [
  // Form names
  'ฟอร์มบันทึกการร้องขอทีมบริการเทคนิค',
  'แบบฟอร์มติดต่อ',
  'ใบสมัครงาน',
  'รายการติดตาม',

  // Field names (common)
  'ชื่อเต็ม',
  'เบอร์โทรศัพท์',
  'อีเมล',
  'ที่อยู่',
  'วันเกิด',
  'จังหวัด',

  // Business terms
  'ข้อมูลลูกค้า',
  'รายละเอียดการติดต่อ',
  'ประสบการณ์ทำงาน',
  'การศึกษา',
  'ทักษะ',

  // Technical terms
  'ฐานข้อมูล',
  'ระบบ',
  'เทคนิคเซอร์วิส',

  // Mixed/Compound words
  'ฟอร์มบันทึกข้อมูลพนักงานใหม่',
  'แบบสำรวจความพึงพอใจ',
  'ใบเสนอราคาสินค้า',

  // Edge cases
  'ABC', // Already English
  'Test123', // Mixed
  '', // Empty
  'ฯลฯ', // Special chars
];

async function runTests() {
  console.log('\n🧪 Testing TranslationService with LibreTranslate');
  console.log('=' .repeat(80));

  let passed = 0;
  let failed = 0;
  const results = [];

  for (let i = 0; i < testCases.length; i++) {
    const thai = testCases[i];
    console.log(`\n[${i + 1}/${testCases.length}] Testing: "${thai}"`);

    try {
      const result = await TranslationService.translate(thai, { useAPI: true });

      console.log(`  ✅ Thai:       "${result.thai}"`);
      console.log(`  ✅ English:    "${result.english}"`);
      console.log(`  ✅ Source:     ${result.source}`);
      console.log(`  ✅ Confidence: ${result.confidence}`);

      results.push({
        thai: result.thai,
        english: result.english,
        source: result.source,
        confidence: result.confidence,
      });

      passed++;
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      failed++;
    }
  }

  // Statistics
  console.log('\n' + '='.repeat(80));
  console.log('📊 Translation Statistics:');
  console.log('=' .repeat(80));

  const stats = TranslationService.getStats();
  console.log(`  Total Translations: ${stats.totalTranslations}`);
  console.log(`  Dictionary Hits:    ${stats.dictionaryHits} (${Math.round(stats.dictionaryHits / testCases.length * 100)}%)`);
  console.log(`  Cache Hits:         ${stats.cacheHits}`);
  console.log(`  API Calls:          ${stats.apiCalls}`);
  console.log(`  API Success:        ${stats.apiSuccess} (${stats.apiSuccessRate}%)`);
  console.log(`  API Errors:         ${stats.apiErrors}`);
  console.log(`  Tests Passed:       ${passed}/${testCases.length}`);
  console.log(`  Tests Failed:       ${failed}/${testCases.length}`);

  // Summary table
  console.log('\n📋 Translation Results:');
  console.log('=' .repeat(80));
  console.log('| Thai                                     | English                           | Source          |');
  console.log('|' + '-'.repeat(78) + '|');

  results.forEach(r => {
    const thaiTrunc = r.thai.substring(0, 40).padEnd(40);
    const englishTrunc = r.english.substring(0, 33).padEnd(33);
    const source = r.source.padEnd(15);
    console.log(`| ${thaiTrunc} | ${englishTrunc} | ${source} |`);
  });

  console.log('=' .repeat(80));

  // Success criteria
  const dictionaryRate = stats.dictionaryHits / testCases.length;
  const apiSuccessRate = stats.apiCalls > 0 ? stats.apiSuccess / stats.apiCalls : 0;

  console.log('\n✅ Success Criteria:');
  console.log(`  Dictionary coverage: ${Math.round(dictionaryRate * 100)}% (target: >60%)`);
  console.log(`  API success rate:    ${Math.round(apiSuccessRate * 100)}% (target: >80%)`);

  if (dictionaryRate >= 0.6) {
    console.log('  ✅ Dictionary coverage: PASS');
  } else {
    console.log('  ⚠️  Dictionary coverage: LOW (add more terms)');
  }

  if (stats.apiCalls === 0) {
    console.log('  ℹ️  API not tested (LibreTranslate not running)');
  } else if (apiSuccessRate >= 0.8) {
    console.log('  ✅ API success rate: PASS');
  } else {
    console.log('  ⚠️  API success rate: LOW');
  }

  console.log('\n' + '='.repeat(80));
  console.log('🎉 Testing Complete!');
  console.log('=' .repeat(80) + '\n');
}

// Run tests
runTests().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
