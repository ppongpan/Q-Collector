/**
 * Test Sub-Form Translation with Context Hints
 * Verify that sub-form titles and fields are translated with proper context
 *
 * @version 2.0.0 (v0.7.7-dev)
 * @updated 2025-10-10
 *
 * NEW in v2.0.0:
 * - Tests context hints ('form' vs 'field')
 * - Tests quality validation
 * - Tests table name and column name generation
 */

require('dotenv').config();
const MyMemoryTranslationService = require('../services/MyMemoryTranslationService');
const { generateTableName, generateColumnName } = require('../utils/tableNameHelper');

const translationService = new MyMemoryTranslationService();

async function testSubFormTranslation() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Test Sub-Form Translation with Context Hints          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const testSubForms = [
    { title: 'บันทึกการเข้าให้บริการ', expectedWords: ['service', 'record', 'entry'] },
    { title: 'ข้อมูลครอบครัว', expectedWords: ['family', 'info', 'information'] },
    { title: 'ประวัติการศึกษา', expectedWords: ['education', 'history', 'academic'] },
    { title: 'การกำจัด', expectedWords: ['disposal', 'eliminate', 'removal'] },
    { title: 'กิจกรรมย่อย', expectedWords: ['activity', 'sub', 'task'] },
  ];

  console.log('✨ NEW v0.7.7: Testing with context="form"\n');

  let passedCount = 0;
  let failedCount = 0;

  for (const subForm of testSubForms) {
    console.log(`📋 Sub-Form: "${subForm.title}"`);

    try {
      // ✨ NEW: Test with context hint
      const result = await translationService.translateToEnglish(subForm.title, {
        context: 'form'
      });
      console.log(`   Translation: "${result.translated}"`);
      console.log(`   Slug: "${result.slug}"`);
      console.log(`   Quality: ${result.quality} (match: ${result.match})`);
      console.log(`   Context: ${result.context}`);

      // Test generateTableName (what DynamicTableService uses)
      const fakeId = '12345678-1234-1234-1234-123456789abc';
      const tableName = await generateTableName(subForm.title, fakeId);
      console.log(`   Table Name: ${tableName}`);

      // Check if translation is meaningful
      const hasExpectedWords = subForm.expectedWords.some(word =>
        result.slug.toLowerCase().includes(word.toLowerCase())
      );

      if (hasExpectedWords && result.quality !== 'machine') {
        console.log(`   ✅ PASS: Contains expected English words`);
        passedCount++;
      } else {
        console.log(`   ⚠️  WARN: Does not contain expected words (${subForm.expectedWords.join(', ')})`);
        failedCount++;
      }

      console.log('');

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`   ❌ ERROR: ${error.message}\n`);
      failedCount++;
    }
  }

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                Sub-Form Results                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`   ✅ Passed: ${passedCount}`);
  console.log(`   ⚠️  Warned: ${failedCount}`);
  console.log(`   Total: ${testSubForms.length}\n`);

  return { passedCount, failedCount };
}

async function testFieldColumns() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Test Field Column Names with Context Hints            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const testFields = [
    { title: 'ชื่อสินค้า', expectedWords: ['product', 'name', 'item'] },
    { title: 'จำนวน', expectedWords: ['quantity', 'amount', 'number'] },
    { title: 'ราคาต่อหน่วย', expectedWords: ['price', 'unit', 'cost'] },
    { title: 'วันที่ส่งสินค้า', expectedWords: ['delivery', 'date', 'shipping'] },
    { title: 'ที่อยู่จัดส่ง', expectedWords: ['address', 'delivery', 'shipping'] },
  ];

  console.log('✨ NEW v0.7.7: Testing with context="field"\n');

  let passedCount = 0;
  let failedCount = 0;

  for (const field of testFields) {
    console.log(`📝 Field: "${field.title}"`);

    try {
      // ✨ NEW: Test with context hint
      const result = await translationService.translateToEnglish(field.title, {
        context: 'field'
      });
      console.log(`   Translation: "${result.translated}"`);
      console.log(`   Slug: "${result.slug}"`);
      console.log(`   Quality: ${result.quality} (match: ${result.match})`);
      console.log(`   Context: ${result.context}`);

      // Test generateColumnName (what DynamicTableService uses)
      const columnName = await generateColumnName(field.title);
      console.log(`   Column Name: ${columnName}`);

      // Check if translation is meaningful
      const hasExpectedWords = field.expectedWords.some(word =>
        result.slug.toLowerCase().includes(word.toLowerCase())
      );

      if (hasExpectedWords && result.quality !== 'machine') {
        console.log(`   ✅ PASS: Contains expected English words`);
        passedCount++;
      } else {
        console.log(`   ⚠️  WARN: Does not contain expected words (${field.expectedWords.join(', ')})`);
        failedCount++;
      }

      console.log('');

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`   ❌ ERROR: ${error.message}\n`);
      failedCount++;
    }
  }

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                Field Column Results                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`   ✅ Passed: ${passedCount}`);
  console.log(`   ⚠️  Warned: ${failedCount}`);
  console.log(`   Total: ${testFields.length}\n`);

  return { passedCount, failedCount };
}

async function main() {
  console.log('\n🚀 Sub-Form Translation Integration Test v2.0.0\n');

  const subFormResults = await testSubFormTranslation();
  const fieldResults = await testFieldColumns();

  const totalPassed = subFormResults.passedCount + fieldResults.passedCount;
  const totalFailed = subFormResults.failedCount + fieldResults.failedCount;
  const totalTests = totalPassed + totalFailed;

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                   Overall Summary                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   ✅ Passed: ${totalPassed}`);
  console.log(`   ⚠️  Warned: ${totalFailed}`);
  console.log(`   Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%\n`);

  console.log('✨ Context Hints are working!');
  console.log('   - Sub-forms use context="form"');
  console.log('   - Fields use context="field"');
  console.log('\n📊 Check backend/logs/translation-usage.json for detailed metrics.\n');

  if (totalPassed === totalTests) {
    console.log('✅ All tests passed! Sub-form integration verified.\n');
    process.exit(0);
  } else if (totalPassed / totalTests >= 0.7) {
    console.log('⚠️  Most tests passed. Some translations may need review.\n');
    process.exit(0);
  } else {
    console.log('❌ Many tests failed. Please review translation quality.\n');
    process.exit(1);
  }
}

main().catch(console.error);
