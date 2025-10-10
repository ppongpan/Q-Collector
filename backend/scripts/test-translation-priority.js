/**
 * Test Translation Priority
 * Test the new v0.7.6 translation system with MyMemory priority
 *
 * Expected Behavior:
 * 1. MyMemory API tried first (consistent with main forms)
 * 2. Dictionary used as fallback ONLY if MyMemory fails AND result is not transliteration
 * 3. Unique hash fallback if both fail
 */

const { generateTableName, generateColumnName } = require('../utils/tableNameHelper');

async function testTranslationPriority() {
  console.log('\n🧪 === TRANSLATION PRIORITY TEST (v0.7.6) ===\n');

  const testCases = [
    // Common words (should use MyMemory or Dictionary actual translation)
    { thai: 'ชื่อ', expected: 'name', type: 'Common word' },
    { thai: 'อีเมล', expected: 'email', type: 'Common word' },
    { thai: 'เบอร์โทร', expected: 'phone', type: 'Common word' },
    { thai: 'ที่อยู่', expected: 'address', type: 'Common word' },

    // Sub-form names from user's actual data
    { thai: 'รายการติดตามขาย', expected: 'tracked_items|sales_tracking', type: 'Sub-form name' },
    { thai: 'บันทึกการเข้างาน', expected: 'work_log|entry_log', type: 'Sub-form name' },

    // Complex phrases
    { thai: 'วันที่นัดหมาย', expected: 'appointment_date', type: 'Complex phrase' },
    { thai: 'ผู้ขอใช้บริการ', expected: 'service_requester', type: 'Complex phrase' },
  ];

  console.log('Testing column name generation (field labels):\n');

  for (const testCase of testCases) {
    try {
      const result = await generateColumnName(testCase.thai);

      // Check if result matches expected (flexible matching)
      const isExpected = testCase.expected.split('|').some(exp => result.includes(exp));

      // Check if result is transliteration (bad)
      const isTransliteration = /[aeiou]{2,}|[^aeiou]{3,}/i.test(result) && result.length > 10;

      let status = '✅';
      let method = 'Unknown';

      if (isExpected) {
        status = '✅';
        method = 'Translation (Good)';
      } else if (isTransliteration) {
        status = '⚠️';
        method = 'Transliteration (Should use MyMemory)';
      } else if (result.includes('_') && result.split('_').length > 1) {
        const lastPart = result.split('_').pop();
        if (/^[a-z0-9]{6}$/.test(lastPart)) {
          status = '⚠️';
          method = 'Hash Fallback (MyMemory API might be rate limited)';
        }
      }

      console.log(`${status} "${testCase.thai}"`);
      console.log(`   Result: ${result}`);
      console.log(`   Type: ${testCase.type}`);
      console.log(`   Method: ${method}`);
      console.log('');

    } catch (error) {
      console.error(`❌ "${testCase.thai}"`);
      console.error(`   Error: ${error.message}`);
      console.log('');
    }
  }

  console.log('='.repeat(80));
  console.log('\nTesting table name generation (form/sub-form titles):\n');

  const formTestCases = [
    { thai: 'แบบฟอร์มติดต่อ', formId: 'test-123', expected: 'contact_form' },
    { thai: 'บันทึกการเข้างาน', formId: 'test-456', expected: 'work_log|entry_log' },
  ];

  for (const testCase of formTestCases) {
    try {
      const result = await generateTableName(testCase.thai, testCase.formId);
      const baseName = result.replace(/_test.*$/, ''); // Remove form ID suffix

      const isExpected = testCase.expected.split('|').some(exp => baseName.includes(exp));
      const isTransliteration = /[aeiou]{2,}|[^aeiou]{3,}/i.test(baseName) && baseName.length > 10;

      let status = '✅';
      let method = 'Unknown';

      if (isExpected) {
        status = '✅';
        method = 'Translation (Good)';
      } else if (isTransliteration) {
        status = '⚠️';
        method = 'Transliteration (Should use MyMemory)';
      }

      console.log(`${status} "${testCase.thai}"`);
      console.log(`   Result: ${result}`);
      console.log(`   Base Name: ${baseName}`);
      console.log(`   Method: ${method}`);
      console.log('');

    } catch (error) {
      console.error(`❌ "${testCase.thai}"`);
      console.error(`   Error: ${error.message}`);
      console.log('');
    }
  }

  console.log('='.repeat(80));
  console.log('\n📊 SUMMARY:\n');
  console.log('✅ = MyMemory API or Dictionary actual translation (GOOD)');
  console.log('⚠️  = Transliteration or Hash Fallback (MyMemory might be rate limited)');
  console.log('\nIf you see many ⚠️  results, it means:');
  console.log('1. MyMemory API is rate limited (429 error)');
  console.log('2. Dictionary is returning transliteration instead of translation');
  console.log('3. Both services failed → hash fallback is being used');
  console.log('\n');
}

testTranslationPriority()
  .then(() => {
    console.log('✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  });
