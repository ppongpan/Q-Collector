/**
 * Final Translation System Test - Comprehensive Testing
 *
 * Test Categories:
 * 1. Common business forms (10 tests)
 * 2. Field labels (10 tests)
 * 3. Department names (5 tests)
 * 4. Long phrases (3 tests)
 * 5. Edge cases (2 tests)
 *
 * Expected: 100% meaningful English names (no transliterations)
 * Priority: MyMemory API → Dictionary → Hash
 */

require('dotenv').config();
const { sanitizeIdentifier, generateTableName, generateColumnName } = require('../utils/tableNameHelper');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Check if result is transliteration
 */
function isTransliteration(thai, english) {
  // If English result is much longer than Thai input, it's likely transliteration
  if (english.replace(/_/g, '').length > thai.length * 1.5) {
    return true;
  }

  // Check for consecutive consonants (common in Thai transliteration)
  const consecutiveConsonants = /[bcdfghjklmnpqrstvwxyz]{4,}/i;
  if (consecutiveConsonants.test(english)) {
    return true;
  }

  // Check for typical Thai transliteration patterns
  const translitPatterns = [
    /kh[aeiou]/i,  // ข, ค -> kh
    /ph[aeiou]/i,  // พ, ผ -> ph
    /th[aeiou]/i,  // ท, ธ, ถ -> th
    /ng[aeiou]/i,  // ง -> ng
    /[aeiouy]{3,}/i // Multiple vowels
  ];

  let patternCount = 0;
  for (const pattern of translitPatterns) {
    if (pattern.test(english)) {
      patternCount++;
    }
  }

  // If has 2+ transliteration patterns, likely transliteration
  return patternCount >= 2;
}

/**
 * Rate translation quality
 */
function rateQuality(thai, english) {
  // Check if it's transliteration
  if (isTransliteration(thai, english)) {
    return { quality: 'fail', reason: 'Transliteration detected' };
  }

  // Check if it's just a hash
  if (english.startsWith('_') && english.length <= 8) {
    return { quality: 'fail', reason: 'Hash fallback' };
  }

  // Check if it's meaningful English
  const meaningfulWords = [
    'contact', 'form', 'questionnaire', 'satisfaction', 'leave', 'sick', 'complaint',
    'request', 'approval', 'department', 'sales', 'marketing', 'service', 'technical',
    'waste', 'disposal', 'accident', 'risk', 'management', 'prevention', 'customer',
    'feedback', 'survey', 'report', 'registration', 'application', 'name', 'full',
    'phone', 'number', 'email', 'address', 'date', 'time', 'comment', 'reason',
    'description', 'type', 'status', 'quantity', 'price', 'total', 'payment'
  ];

  const englishLower = english.toLowerCase();
  const hasMeaningfulWord = meaningfulWords.some(word => englishLower.includes(word));

  if (hasMeaningfulWord) {
    return { quality: 'excellent', reason: 'Meaningful English translation' };
  }

  // Check length ratio
  const ratio = english.replace(/_/g, '').length / thai.length;
  if (ratio < 0.8) {
    return { quality: 'good', reason: 'Concise English phrase' };
  }

  return { quality: 'fair', reason: 'Generic English result' };
}

/**
 * Run test with detailed output
 */
async function runTest(testName, thai, context, expected = null) {
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}Test: ${testName}${colors.reset}`);
  console.log(`Thai: "${colors.yellow}${thai}${colors.reset}"`);

  try {
    const startTime = Date.now();
    const result = await sanitizeIdentifier(thai, context, '', 50);
    const duration = Date.now() - startTime;

    // Rate quality
    const rating = rateQuality(thai, result);

    // Check if passed
    const passed = rating.quality === 'excellent' || rating.quality === 'good';
    const statusIcon = passed ? '✅' : '❌';
    const statusColor = passed ? colors.green : colors.red;

    console.log(`English: "${statusColor}${result}${colors.reset}"`);
    console.log(`Quality: ${statusColor}${rating.quality}${colors.reset} - ${rating.reason}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Context: ${context}`);

    // Check against expected result if provided
    if (expected) {
      const matchesExpected = result.includes(expected.toLowerCase().replace(/\s/g, '_'));
      if (matchesExpected) {
        console.log(`${colors.green}✓ Matches expected pattern: "${expected}"${colors.reset}`);
      } else {
        console.log(`${colors.yellow}⚠ Expected pattern not found: "${expected}"${colors.reset}`);
      }
    }

    return {
      testName,
      thai,
      english: result,
      quality: rating.quality,
      reason: rating.reason,
      passed,
      duration
    };

  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    return {
      testName,
      thai,
      english: 'ERROR',
      quality: 'fail',
      reason: error.message,
      passed: false,
      duration: 0
    };
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log(`${colors.bright}${colors.blue}`);
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Thai-English Translation System - Final Comprehensive    ║');
  console.log('║                      Testing Suite                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  const results = [];

  // ========================================
  // Category 1: Common Business Forms
  // ========================================
  console.log(`\n${colors.bright}${colors.blue}═══ Category 1: Common Business Forms (10 tests) ═══${colors.reset}`);

  results.push(await runTest(
    '1.1 Contact Form',
    'แบบฟอร์มติดต่อ',
    'form',
    'contact_form'
  ));

  results.push(await runTest(
    '1.2 Satisfaction Questionnaire',
    'แบบสอบถามความพึงพอใจ',
    'form',
    'satisfaction_questionnaire'
  ));

  results.push(await runTest(
    '1.3 Sick Leave Form',
    'ใบลาป่วย',
    'form',
    'sick_leave'
  ));

  results.push(await runTest(
    '1.4 Complaint Form',
    'แบบฟอร์มการร้องเรียน',
    'form',
    'complaint_form'
  ));

  results.push(await runTest(
    '1.5 Service Request',
    'แบบฟอร์มขอใช้บริการ',
    'form',
    'service_request'
  ));

  results.push(await runTest(
    '1.6 Registration Form',
    'แบบฟอร์มลงทะเบียน',
    'form',
    'registration_form'
  ));

  results.push(await runTest(
    '1.7 Feedback Form',
    'แบบฟอร์มแสดงความคิดเห็น',
    'form',
    'feedback_form'
  ));

  results.push(await runTest(
    '1.8 Application Form',
    'แบบฟอร์มสมัครงาน',
    'form',
    'application_form'
  ));

  results.push(await runTest(
    '1.9 Purchase Request',
    'แบบฟอร์มขอซื้อสินค้า',
    'form',
    'purchase_request'
  ));

  results.push(await runTest(
    '1.10 Meeting Report',
    'แบบฟอร์มรายงานการประชุม',
    'form',
    'meeting_report'
  ));

  // ========================================
  // Category 2: Field Labels
  // ========================================
  console.log(`\n${colors.bright}${colors.blue}═══ Category 2: Field Labels (10 tests) ═══${colors.reset}`);

  results.push(await runTest(
    '2.1 Full Name',
    'ชื่อเต็ม',
    'field',
    'full_name'
  ));

  results.push(await runTest(
    '2.2 Phone Number',
    'เบอร์โทรศัพท์',
    'field',
    'phone_number'
  ));

  results.push(await runTest(
    '2.3 Email Address',
    'อีเมล',
    'field',
    'email'
  ));

  results.push(await runTest(
    '2.4 Address',
    'ที่อยู่',
    'field',
    'address'
  ));

  results.push(await runTest(
    '2.5 Date of Birth',
    'วันเกิด',
    'field',
    'date_of_birth'
  ));

  results.push(await runTest(
    '2.6 Description',
    'รายละเอียด',
    'field',
    'description'
  ));

  results.push(await runTest(
    '2.7 Quantity',
    'จำนวน',
    'field',
    'quantity'
  ));

  results.push(await runTest(
    '2.8 Price',
    'ราคา',
    'field',
    'price'
  ));

  results.push(await runTest(
    '2.9 Comment',
    'ความคิดเห็น',
    'field',
    'comment'
  ));

  results.push(await runTest(
    '2.10 Reason',
    'เหตุผล',
    'field',
    'reason'
  ));

  // ========================================
  // Category 3: Department Names
  // ========================================
  console.log(`\n${colors.bright}${colors.blue}═══ Category 3: Department Names (5 tests) ═══${colors.reset}`);

  results.push(await runTest(
    '3.1 Sales Department',
    'แผนกขาย',
    'department',
    'sales_department'
  ));

  results.push(await runTest(
    '3.2 Marketing Department',
    'แผนกการตลาด',
    'department',
    'marketing_department'
  ));

  results.push(await runTest(
    '3.3 Technical Department',
    'แผนกเทคนิค',
    'department',
    'technical_department'
  ));

  results.push(await runTest(
    '3.4 Customer Service',
    'แผนกบริการลูกค้า',
    'department',
    'customer_service'
  ));

  results.push(await runTest(
    '3.5 Human Resources',
    'แผนกทรัพยากรบุคคล',
    'department',
    'human_resources'
  ));

  // ========================================
  // Category 4: Long Phrases (Slug Length Test)
  // ========================================
  console.log(`\n${colors.bright}${colors.blue}═══ Category 4: Long Phrases (3 tests) ═══${colors.reset}`);

  results.push(await runTest(
    '4.1 Long Business Form',
    'แบบฟอร์มบันทึกการจัดการความเสี่ยงและป้องกันอุบัติเหตุในองค์กร',
    'form',
    'risk_management'
  ));

  results.push(await runTest(
    '4.2 Long Field Label',
    'ข้อเสนอแนะเพื่อการปรับปรุงและพัฒนาคุณภาพการให้บริการ',
    'field',
    'service_improvement'
  ));

  results.push(await runTest(
    '4.3 Long Department Name',
    'ฝ่ายวางแผนกลยุทธ์และพัฒนาธุรกิจองค์กร',
    'department',
    'strategic_planning'
  ));

  // ========================================
  // Category 5: Edge Cases
  // ========================================
  console.log(`\n${colors.bright}${colors.blue}═══ Category 5: Edge Cases (2 tests) ═══${colors.reset}`);

  results.push(await runTest(
    '5.1 Mixed Thai-English',
    'Form ขอใช้บริการ IT Support',
    'form',
    'form_it_support'
  ));

  results.push(await runTest(
    '5.2 Very Short Thai',
    'ชื่อ',
    'field',
    'name'
  ));

  // ========================================
  // Summary Report
  // ========================================
  console.log(`\n${colors.bright}${colors.blue}`);
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                      Test Summary                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  const passRate = ((passedTests / totalTests) * 100).toFixed(1);

  // Quality breakdown
  const qualityBreakdown = {
    excellent: results.filter(r => r.quality === 'excellent').length,
    good: results.filter(r => r.quality === 'good').length,
    fair: results.filter(r => r.quality === 'fair').length,
    fail: results.filter(r => r.quality === 'fail').length
  };

  // Average duration
  const avgDuration = (results.reduce((sum, r) => sum + r.duration, 0) / totalTests).toFixed(0);

  console.log(`${colors.bright}Total Tests: ${totalTests}${colors.reset}`);
  console.log(`${colors.green}✅ Passed: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${failedTests}${colors.reset}`);
  console.log(`${colors.bright}Pass Rate: ${passRate}%${colors.reset}`);
  console.log('');
  console.log(`${colors.bright}Quality Breakdown:${colors.reset}`);
  console.log(`  ${colors.green}Excellent: ${qualityBreakdown.excellent}${colors.reset}`);
  console.log(`  ${colors.blue}Good: ${qualityBreakdown.good}${colors.reset}`);
  console.log(`  ${colors.yellow}Fair: ${qualityBreakdown.fair}${colors.reset}`);
  console.log(`  ${colors.red}Fail: ${qualityBreakdown.fail}${colors.reset}`);
  console.log('');
  console.log(`${colors.bright}Average Duration: ${avgDuration}ms${colors.reset}`);

  // Failed tests detail
  if (failedTests > 0) {
    console.log(`\n${colors.red}${colors.bright}Failed Tests:${colors.reset}`);
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ${colors.red}❌ ${r.testName}${colors.reset}`);
      console.log(`     Thai: "${r.thai}"`);
      console.log(`     English: "${r.english}"`);
      console.log(`     Reason: ${r.reason}`);
    });
  }

  // Final verdict
  console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`);
  if (passRate >= 90) {
    console.log(`${colors.green}${colors.bright}✅ TRANSLATION SYSTEM: EXCELLENT (${passRate}% pass rate)${colors.reset}`);
    console.log(`${colors.green}System is production-ready for Thai-English translation!${colors.reset}`);
  } else if (passRate >= 70) {
    console.log(`${colors.yellow}${colors.bright}⚠️ TRANSLATION SYSTEM: GOOD (${passRate}% pass rate)${colors.reset}`);
    console.log(`${colors.yellow}System works well but has room for improvement.${colors.reset}`);
  } else {
    console.log(`${colors.red}${colors.bright}❌ TRANSLATION SYSTEM: NEEDS IMPROVEMENT (${passRate}% pass rate)${colors.reset}`);
    console.log(`${colors.red}System requires tuning before production use.${colors.reset}`);
  }
  console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`);

  return results;
}

// Run tests
if (require.main === module) {
  runAllTests()
    .then(() => {
      console.log(`\n${colors.green}✅ All tests completed${colors.reset}\n`);
      process.exit(0);
    })
    .catch(error => {
      console.error(`\n${colors.red}❌ Test suite failed: ${error.message}${colors.reset}\n`);
      console.error(error);
      process.exit(1);
    });
}

module.exports = { runAllTests };
