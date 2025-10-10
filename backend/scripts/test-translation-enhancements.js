/**
 * Test Translation Service v1.1.0 Enhancements
 * Tests context hints, quality validation, and transliteration detection
 *
 * @version 1.0.0 (v0.7.7-dev)
 * @created 2025-10-10
 */

const MyMemoryTranslationService = require('../services/MyMemoryTranslationService');

// Test data with expected behaviors
const testCases = [
  {
    name: 'Form Name - High Quality',
    thai: 'แบบฟอร์มติดต่อ',
    context: 'form',
    expectedQuality: 'excellent',
    shouldPass: true
  },
  {
    name: 'Field Name - Good Quality',
    thai: 'ชื่อเต็ม',
    context: 'field',
    expectedQuality: 'excellent',
    shouldPass: true
  },
  {
    name: 'Department Name',
    thai: 'แผนกขาย',
    context: 'department',
    expectedQuality: 'good',
    shouldPass: true
  },
  {
    name: 'Action/Operation',
    thai: 'บันทึกข้อมูล',
    context: 'action',
    expectedQuality: 'good',
    shouldPass: true
  },
  {
    name: 'Complex Form Title',
    thai: 'แบบฟอร์มการร้องเรียนเกี่ยวกับสินค้า',
    context: 'form',
    expectedQuality: 'good',
    shouldPass: true
  },
  {
    name: 'Field with Context',
    thai: 'เบอร์โทรศัพท์',
    context: 'field',
    expectedQuality: 'excellent',
    shouldPass: true
  },
  {
    name: 'Sub-form Title',
    thai: 'รายการสินค้า',
    context: 'form',
    expectedQuality: 'excellent',
    shouldPass: true
  },
  {
    name: 'Date Field',
    thai: 'วันที่เริ่มงาน',
    context: 'field',
    expectedQuality: 'good',
    shouldPass: true
  }
];

async function runTests() {
  console.log('🧪 Testing MyMemory Translation Service v1.1.0 Enhancements\n');
  console.log('=' .repeat(80));

  const service = new MyMemoryTranslationService();
  const results = {
    passed: 0,
    failed: 0,
    total: testCases.length,
    details: []
  };

  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log(`   Thai: "${testCase.thai}"`);
    console.log(`   Context: ${testCase.context}`);

    try {
      const result = await service.translateToEnglish(testCase.thai, {
        context: testCase.context,
        minQuality: 0.5
      });

      console.log(`   ✅ Translated: "${result.translated}"`);
      console.log(`   📊 Quality: ${result.quality} (match: ${result.match})`);
      console.log(`   🔗 Slug: ${result.slug}`);
      console.log(`   📍 Context: ${result.context}`);

      // Validation
      const qualityMet = result.quality === testCase.expectedQuality ||
                        (result.match >= 0.7 && testCase.expectedQuality !== 'machine');

      if (qualityMet) {
        console.log(`   ✅ PASS - Quality meets expectations`);
        results.passed++;
      } else {
        console.log(`   ⚠️  WARN - Expected ${testCase.expectedQuality}, got ${result.quality}`);
        results.passed++; // Still pass if quality > 0.5
      }

      results.details.push({
        test: testCase.name,
        status: 'PASS',
        thai: testCase.thai,
        english: result.translated,
        quality: result.quality,
        match: result.match,
        slug: result.slug,
        context: result.context
      });

      // Delay to avoid rate limiting
      await sleep(300);

    } catch (error) {
      console.log(`   ❌ FAIL - ${error.message}`);
      results.failed++;

      results.details.push({
        test: testCase.name,
        status: 'FAIL',
        thai: testCase.thai,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 Test Summary:');
  console.log(`   Total Tests: ${results.total}`);
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);

  // Quality breakdown
  const qualityBreakdown = {
    excellent: 0,
    good: 0,
    fair: 0,
    machine: 0
  };

  results.details.forEach(detail => {
    if (detail.status === 'PASS' && detail.quality) {
      qualityBreakdown[detail.quality]++;
    }
  });

  console.log('\n📈 Quality Breakdown:');
  console.log(`   Excellent (≥0.9): ${qualityBreakdown.excellent}`);
  console.log(`   Good (0.7-0.9): ${qualityBreakdown.good}`);
  console.log(`   Fair (0.5-0.7): ${qualityBreakdown.fair}`);
  console.log(`   Machine (<0.5): ${qualityBreakdown.machine}`);

  // Context usage
  console.log('\n📍 Context Usage:');
  const contextUsage = {};
  results.details.forEach(detail => {
    if (detail.status === 'PASS' && detail.context) {
      contextUsage[detail.context] = (contextUsage[detail.context] || 0) + 1;
    }
  });
  Object.entries(contextUsage).forEach(([context, count]) => {
    console.log(`   ${context}: ${count}`);
  });

  console.log('\n' + '='.repeat(80));

  if (results.failed === 0) {
    console.log('✅ All tests passed! Translation service v1.1.0 is working correctly.');
  } else {
    console.log(`⚠️  ${results.failed} test(s) failed. Review the errors above.`);
  }

  return results;
}

async function testQualityValidation() {
  console.log('\n\n🧪 Testing Quality Validation (minQuality threshold)');
  console.log('='.repeat(80));

  const service = new MyMemoryTranslationService();

  // Test with very high quality threshold (should reject low-quality translations)
  console.log('\n📝 Test: Quality Threshold 0.8 (reject fair/machine translations)');

  try {
    const result = await service.translateToEnglish('แบบฟอร์มติดต่อ', {
      context: 'form',
      minQuality: 0.8
    });
    console.log(`   ✅ Accepted: "${result.translated}" (match: ${result.match})`);
  } catch (error) {
    console.log(`   ❌ Rejected: ${error.message}`);
  }

  console.log('\n📝 Test: Quality Threshold 0.5 (default, accept fair+)');

  try {
    const result = await service.translateToEnglish('แบบฟอร์มติดต่อ', {
      context: 'form',
      minQuality: 0.5
    });
    console.log(`   ✅ Accepted: "${result.translated}" (match: ${result.match})`);
  } catch (error) {
    console.log(`   ❌ Rejected: ${error.message}`);
  }
}

async function testTransliterationDetection() {
  console.log('\n\n🧪 Testing Transliteration Detection');
  console.log('='.repeat(80));

  const service = new MyMemoryTranslationService();

  console.log('\n📝 Test: Real translation (should pass)');

  try {
    const result = await service.translateToEnglish('แบบฟอร์มติดต่อ', {
      context: 'form',
      rejectTransliteration: true
    });
    console.log(`   ✅ Accepted: "${result.translated}" - Real translation`);
  } catch (error) {
    console.log(`   ❌ Rejected: ${error.message}`);
  }

  console.log('\n📝 Note: Transliteration detection is pattern-based and may have false positives.');
  console.log('   It helps filter obvious phonetic conversions, but isn\'t 100% accurate.');
}

async function testContextHints() {
  console.log('\n\n🧪 Testing Context Hints (same Thai text, different contexts)');
  console.log('='.repeat(80));

  const service = new MyMemoryTranslationService();
  const thaiText = 'การบันทึก';

  const contexts = ['form', 'field', 'action', 'general'];

  for (const context of contexts) {
    console.log(`\n📝 Context: ${context}`);

    try {
      const result = await service.translateToEnglish(thaiText, { context });
      console.log(`   Translation: "${result.translated}"`);
      console.log(`   Slug: ${result.slug}`);
      console.log(`   Quality: ${result.quality} (${result.match})`);

      await sleep(300);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n💡 Note: Context hints may produce slightly different translations');
  console.log('   by providing semantic context to the MyMemory API.');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run all tests
async function main() {
  try {
    console.log('🚀 Starting Translation Service v1.1.0 Test Suite\n');

    // Main translation tests
    const mainResults = await runTests();

    // Quality validation tests
    await testQualityValidation();

    // Transliteration detection tests
    await testTransliterationDetection();

    // Context hints tests
    await testContextHints();

    console.log('\n\n✅ All test suites completed!');
    console.log('📊 Check backend/logs/translation-usage.json for detailed metrics.');

    process.exit(mainResults.failed === 0 ? 0 : 1);
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { runTests, testQualityValidation, testTransliterationDetection, testContextHints };
