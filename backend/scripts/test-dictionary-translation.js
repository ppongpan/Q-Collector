/**
 * Test Script for DictionaryTranslationService
 *
 * Tests all translation features:
 * - Simple word translation
 * - Form name translation
 * - Field name translation
 * - Compound words
 * - Prefix/suffix handling
 * - Transliteration fallback
 * - Table/column name generation
 *
 * @version 0.7.3-dev
 * @date 2025-10-05
 */

const dictionaryService = require('../services/DictionaryTranslationService');

console.log('=========================================');
console.log('Dictionary Translation Service Tests');
console.log('=========================================\n');

// Test Results Tracker
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * Test helper function
 */
function test(description, thaiText, context, expected) {
  const actual = dictionaryService.translate(thaiText, context);
  const passed = actual === expected;

  results.tests.push({
    description,
    thaiText,
    context,
    expected,
    actual,
    passed
  });

  if (passed) {
    results.passed++;
    console.log(`✅ PASS: ${description}`);
    console.log(`   Input: "${thaiText}" (${context})`);
    console.log(`   Result: "${actual}"\n`);
  } else {
    results.failed++;
    console.log(`❌ FAIL: ${description}`);
    console.log(`   Input: "${thaiText}" (${context})`);
    console.log(`   Expected: "${expected}"`);
    console.log(`   Got: "${actual}"\n`);
  }
}

/**
 * Test table/column name generation
 */
function testNameGeneration(description, thaiText, method, expected) {
  const actual = method === 'table'
    ? dictionaryService.generateTableName(thaiText)
    : dictionaryService.generateColumnName(thaiText);

  const passed = actual === expected;

  results.tests.push({
    description,
    thaiText,
    method,
    expected,
    actual,
    passed
  });

  if (passed) {
    results.passed++;
    console.log(`✅ PASS: ${description}`);
    console.log(`   Input: "${thaiText}" (${method})`);
    console.log(`   Result: "${actual}"\n`);
  } else {
    results.failed++;
    console.log(`❌ FAIL: ${description}`);
    console.log(`   Input: "${thaiText}" (${method})`);
    console.log(`   Expected: "${expected}"`);
    console.log(`   Got: "${actual}"\n`);
  }
}

console.log('TEST CATEGORY 1: Simple Field Translations');
console.log('-------------------------------------------\n');

test('Common field: ชื่อ', 'ชื่อ', 'field', 'name');
test('Common field: อีเมล', 'อีเมล', 'field', 'email');
test('Common field: เบอร์โทร', 'เบอร์โทร', 'field', 'phone');
test('Common field: ที่อยู่', 'ที่อยู่', 'field', 'address');
test('Common field: วันเกิด', 'วันเกิด', 'field', 'birthday');

console.log('\nTEST CATEGORY 2: Form Type Translations');
console.log('-------------------------------------------\n');

test('Form type: แบบฟอร์ม', 'แบบฟอร์ม', 'form', 'form');
test('Form type: แบบสอบถาม', 'แบบสอบถาม', 'form', 'questionnaire');
test('Form type: แบบประเมิน', 'แบบประเมิน', 'form', 'evaluation');
test('Form type: ใบสมัคร', 'ใบสมัคร', 'form', 'application');
test('Form type: ใบลา', 'ใบลา', 'form', 'leave_request');

console.log('\nTEST CATEGORY 3: Action Translations');
console.log('-------------------------------------------\n');

test('Action: บันทึก', 'บันทึก', 'action', 'record');
test('Action: ลงทะเบียน', 'ลงทะเบียน', 'action', 'registration');
test('Action: สมัคร', 'สมัคร', 'action', 'apply');
test('Action: ขอ', 'ขอ', 'action', 'request');
test('Action: อนุมัติ', 'อนุมัติ', 'action', 'approve');

console.log('\nTEST CATEGORY 4: Compound Word Translations');
console.log('-------------------------------------------\n');

test('Compound: แบบฟอร์มบันทึก', 'แบบฟอร์มบันทึก', 'form', 'record_form');
test('Compound: ใบลาป่วย', 'ใบลาป่วย', 'form', 'sick_leave_form');
test('Compound: ใบลากิจ', 'ใบลากิจ', 'form', 'personal_leave_form');

console.log('\nTEST CATEGORY 5: Work-Related Translations');
console.log('-------------------------------------------\n');

test('Work: บริษัท', 'บริษัท', 'field', 'company');
test('Work: ตำแหน่ง', 'ตำแหน่ง', 'field', 'position');
test('Work: แผนก', 'แผนก', 'department', 'department');
test('Work: พนักงาน', 'พนักงาน', 'field', 'employee');

console.log('\nTEST CATEGORY 6: Customer & Product Translations');
console.log('-------------------------------------------\n');

test('Customer: ลูกค้า', 'ลูกค้า', 'field', 'customer');
test('Product: สินค้า', 'สินค้า', 'field', 'product');
test('Product: ราคา', 'ราคา', 'field', 'price');
test('Order: คำสั่งซื้อ', 'คำสั่งซื้อ', 'field', 'order');

console.log('\nTEST CATEGORY 7: Status & Priority Translations');
console.log('-------------------------------------------\n');

test('Status: สถานะ', 'สถานะ', 'field', 'status');
test('Status: รอดำเนินการ', 'รอดำเนินการ', 'field', 'pending');
test('Status: สำเร็จ', 'สำเร็จ', 'field', 'completed');
test('Priority: ด่วน', 'ด่วน', 'field', 'high');

console.log('\nTEST CATEGORY 8: Complex Form Names');
console.log('-------------------------------------------\n');

// These will test word-by-word translation
console.log('Complex form name: แบบฟอร์มบันทึกข้อมูล');
const result1 = dictionaryService.translate('แบบฟอร์มบันทึกข้อมูล', 'form');
console.log(`Result: "${result1}"\n`);

console.log('Complex form name: แบบสอบถามความพึงพอใจลูกค้า');
const result2 = dictionaryService.translate('แบบสอบถามความพึงพอใจลูกค้า', 'form');
console.log(`Result: "${result2}"\n`);

console.log('Complex form name: ใบขอความช่วยเหลือทีมเทคนิค');
const result3 = dictionaryService.translate('ใบขอความช่วยเหลือทีมเทคนิค', 'form');
console.log(`Result: "${result3}"\n`);

console.log('\nTEST CATEGORY 9: Table Name Generation');
console.log('-------------------------------------------\n');

testNameGeneration(
  'Table name: แบบฟอร์มบันทึกข้อมูล',
  'แบบฟอร์มบันทึกข้อมูล',
  'table',
  'record_form'
);

testNameGeneration(
  'Table name: แบบสอบถาม',
  'แบบสอบถาม',
  'table',
  'questionnaire'
);

testNameGeneration(
  'Table name: ใบลาป่วย',
  'ใบลาป่วย',
  'table',
  'sick_leave_form'
);

console.log('\nTEST CATEGORY 10: Column Name Generation');
console.log('-------------------------------------------\n');

testNameGeneration('Column name: ชื่อ', 'ชื่อ', 'column', 'name');
testNameGeneration('Column name: ชื่อเต็ม', 'ชื่อเต็ม', 'column', 'full_name');
testNameGeneration('Column name: อีเมล', 'อีเมล', 'column', 'email');
testNameGeneration('Column name: เบอร์โทรศัพท์', 'เบอร์โทรศัพท์', 'column', 'phone');

console.log('\nTEST CATEGORY 11: Prefix Handling');
console.log('-------------------------------------------\n');

console.log('Prefix test: การบันทึก (prefix: การ)');
const prefixTest1 = dictionaryService.translate('การบันทึก', 'action');
console.log(`Result: "${prefixTest1}"\n`);

console.log('Prefix test: ผู้ใช้งาน (prefix: ผู้)');
const prefixTest2 = dictionaryService.translate('ผู้ใช้งาน', 'field');
console.log(`Result: "${prefixTest2}"\n`);

console.log('\nTEST CATEGORY 12: Transliteration Fallback');
console.log('-------------------------------------------\n');

console.log('Unknown word (should transliterate): กระจอกขจิต');
const translit1 = dictionaryService.translate('กระจอกขจิต', 'general');
console.log(`Result: "${translit1}"\n`);

console.log('\nTEST CATEGORY 13: PostgreSQL Sanitization');
console.log('-------------------------------------------\n');

console.log('Test special characters removal:');
const sanitizeTest1 = dictionaryService.sanitizeForPostgres('test@#$%name');
console.log(`Input: "test@#$%name"`);
console.log(`Output: "${sanitizeTest1}"\n`);

console.log('Test max length (63 chars):');
const longName = 'a'.repeat(100);
const sanitizeTest2 = dictionaryService.sanitizeForPostgres(longName);
console.log(`Input: 100 "a" characters`);
console.log(`Output length: ${sanitizeTest2.length} chars\n`);

console.log('Test starts with number:');
const sanitizeTest3 = dictionaryService.sanitizeForPostgres('123table');
console.log(`Input: "123table"`);
console.log(`Output: "${sanitizeTest3}"\n`);

console.log('\n=========================================');
console.log('Test Summary');
console.log('=========================================\n');

console.log(`Total Tests: ${results.tests.length}`);
console.log(`✅ Passed: ${results.passed}`);
console.log(`❌ Failed: ${results.failed}`);
console.log(`Success Rate: ${((results.passed / results.tests.length) * 100).toFixed(2)}%\n`);

if (results.failed > 0) {
  console.log('Failed Tests:');
  console.log('-------------------------------------------\n');
  results.tests
    .filter(t => !t.passed)
    .forEach(t => {
      console.log(`❌ ${t.description}`);
      console.log(`   Expected: "${t.expected}"`);
      console.log(`   Got: "${t.actual}"\n`);
    });
}

console.log('\nTEST CATEGORY 14: Cache Performance');
console.log('-------------------------------------------\n');

console.log('Testing cache performance...');
const startTime = Date.now();

// Translate same text 1000 times (should use cache)
for (let i = 0; i < 1000; i++) {
  dictionaryService.translate('ชื่อ', 'field');
}

const endTime = Date.now();
const stats = dictionaryService.getCacheStats();

console.log(`1000 translations completed in ${endTime - startTime}ms`);
console.log(`Cache size: ${stats.size} entries`);
console.log(`Average time per translation: ${(endTime - startTime) / 1000}ms\n`);

console.log('=========================================');
console.log('Tests Complete!');
console.log('=========================================\n');

// Exit with appropriate code
process.exit(results.failed > 0 ? 1 : 0);
