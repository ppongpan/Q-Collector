/**
 * Debug Field Name Translation
 *
 * Test case: User reports "ชื่อ" field is translated to "translated_field" instead of "name"
 */

require('dotenv').config();
const { generateColumnName } = require('../utils/tableNameHelper');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

async function testFieldTranslation() {
  console.log(`${colors.bright}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}Debug: Field Name Translation${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  // Test cases
  const testCases = [
    { thai: 'ชื่อ', expected: 'name', description: 'Short field (name)' },
    { thai: 'ชื่อเต็ม', expected: 'full_name', description: 'Full name' },
    { thai: 'เบอร์โทร', expected: 'phone_number', description: 'Phone number' },
    { thai: 'อีเมล', expected: 'email', description: 'Email' },
    { thai: 'ที่อยู่', expected: 'address', description: 'Address' }
  ];

  for (const testCase of testCases) {
    console.log(`${colors.bright}Test: ${testCase.description}${colors.reset}`);
    console.log(`Thai: "${colors.yellow}${testCase.thai}${colors.reset}"`);
    console.log(`Expected: "${colors.green}${testCase.expected}${colors.reset}"`);

    try {
      const startTime = Date.now();
      const result = await generateColumnName(testCase.thai, 'dummy-field-id');
      const duration = Date.now() - startTime;

      const matches = result === testCase.expected || result.includes(testCase.expected);
      const statusColor = matches ? colors.green : colors.red;
      const statusIcon = matches ? '✅' : '❌';

      console.log(`${statusIcon} Result: "${statusColor}${result}${colors.reset}"`);
      console.log(`Duration: ${duration}ms`);

      if (!matches) {
        console.log(`${colors.red}⚠️ MISMATCH! Expected contains "${testCase.expected}" but got "${result}"${colors.reset}`);
      }

    } catch (error) {
      console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
      console.log(`Stack: ${error.stack}`);
    }

    console.log(''); // Empty line between tests
  }

  // Special test: Empty string
  console.log(`${colors.bright}Test: Empty field label${colors.reset}`);
  try {
    const result = await generateColumnName('', 'dummy-field-id');
    console.log(`Result: "${colors.yellow}${result}${colors.reset}"`);
    console.log(`Expected: Should be "unnamed_field" or similar fallback`);
  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
  }

  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
}

// Run test
if (require.main === module) {
  testFieldTranslation()
    .then(() => {
      console.log(`\n${colors.green}✅ Test completed${colors.reset}\n`);
      process.exit(0);
    })
    .catch(error => {
      console.error(`\n${colors.red}❌ Test failed: ${error.message}${colors.reset}\n`);
      console.error(error);
      process.exit(1);
    });
}
