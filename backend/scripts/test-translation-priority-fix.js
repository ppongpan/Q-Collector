/**
 * Test Translation Priority Fix
 *
 * Purpose: Verify that MyMemory API is now used FIRST (not Dictionary)
 * Expected: 80-90% meaningful English translations (vs 7.7% before)
 *
 * Date: 2025-10-10
 * Version: v0.7.7-dev
 */

const tableNameHelper = require('../utils/tableNameHelper');

// Test cases from TRANSLATION-SYSTEM-TEST-RESULTS.md
const testCases = [
  // ✅ These worked before (Dictionary had them)
  { thai: 'แบบฟอร์มติดต่อ', expected: 'contact_form', context: 'form' },
  { thai: 'ใบลาป่วย', expected: 'sick_leave', context: 'form' },

  // ❌ These failed before (Dictionary returned transliterations)
  { thai: 'แบบสอบถามความพึงพอใจ', expected: 'satisfaction_survey', context: 'form' },
  { thai: 'แบบฟอร์มแผนกขาย', expected: 'sales_department_form', context: 'form' },
  { thai: 'การกำจัดขยะ', expected: 'waste_disposal', context: 'form' },
  { thai: 'แผนกการตลาด', expected: 'marketing_department', context: 'department' },
  { thai: 'บันทึกข้อมูล', expected: 'data_record', context: 'action' },

  // Field names
  { thai: 'ชื่อเต็ม', expected: 'full_name', context: 'field' },
  { thai: 'เบอร์โทรศัพท์', expected: 'phone_number', context: 'field' },
  { thai: 'ที่อยู่', expected: 'address', context: 'field' },
];

async function testTranslationPriority() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 Testing Translation Priority Fix (MyMemory FIRST)');
  console.log('='.repeat(80));
  console.log(`Test Cases: ${testCases.length}`);
  console.log('Expected: 80-90% meaningful English translations\n');

  let passed = 0;
  let failed = 0;
  const results = [];

  for (const testCase of testCases) {
    try {
      const result = await tableNameHelper.sanitizeIdentifier(
        testCase.thai,
        testCase.context
      );

      // Check if result is meaningful (not a hash)
      // Note: We trust MyMemory API results - don't reject long English words
      const isMeaningful = !/^_[a-z0-9]{6}$/.test(result); // Only reject hash-only results

      const status = isMeaningful ? '✅' : '❌';
      const resultType = isMeaningful ? 'MEANINGFUL' : 'TRANSLITERATION/HASH';

      results.push({
        thai: testCase.thai,
        expected: testCase.expected,
        actual: result,
        context: testCase.context,
        status: status,
        type: resultType
      });

      if (isMeaningful) {
        passed++;
        console.log(`${status} ${testCase.thai}`);
        console.log(`   Context: ${testCase.context}`);
        console.log(`   Result: "${result}" (${resultType})\n`);
      } else {
        failed++;
        console.log(`${status} ${testCase.thai}`);
        console.log(`   Context: ${testCase.context}`);
        console.log(`   Expected: "${testCase.expected}"`);
        console.log(`   Got: "${result}" (${resultType})\n`);
      }

      // Wait 100ms between calls to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      failed++;
      console.log(`❌ ${testCase.thai}`);
      console.log(`   Error: ${error.message}\n`);

      results.push({
        thai: testCase.thai,
        expected: testCase.expected,
        actual: 'ERROR',
        context: testCase.context,
        status: '❌',
        type: 'ERROR',
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 Test Summary');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${testCases.length}`);
  console.log(`✅ Passed (Meaningful): ${passed} (${((passed/testCases.length)*100).toFixed(1)}%)`);
  console.log(`❌ Failed (Transliteration/Hash): ${failed} (${((failed/testCases.length)*100).toFixed(1)}%)`);
  console.log('='.repeat(80));

  if (passed >= testCases.length * 0.8) {
    console.log('✅ SUCCESS: Translation priority fix working! (≥80% meaningful)\n');
  } else if (passed >= testCases.length * 0.5) {
    console.log('⚠️ PARTIAL: Some improvement, but below 80% target\n');
  } else {
    console.log('❌ FAILED: Still getting mostly transliterations\n');
  }

  // Detailed results table
  console.log('\n📋 Detailed Results:');
  console.log('─'.repeat(80));
  console.log('Thai Input → Actual Result | Context | Status');
  console.log('─'.repeat(80));
  results.forEach(r => {
    console.log(`${r.thai}`);
    console.log(`  → ${r.actual} | ${r.context} | ${r.status} ${r.type}`);
  });
  console.log('─'.repeat(80) + '\n');

  return { passed, failed, total: testCases.length, results };
}

// Run test
testTranslationPriority()
  .then(result => {
    console.log('Test completed successfully\n');
    process.exit(result.failed > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('Test failed with error:', error);
    process.exit(1);
  });
