/**
 * Test MyMemory Translation Service
 * Thai → English translation test
 */

const MyMemoryTranslationService = require('../services/MyMemoryTranslationService');

const translationService = new MyMemoryTranslationService();

// Test cases
const testCases = [
  'สวัสดี',
  'แบบฟอร์มติดต่อ',
  'ใบลาป่วย',
  'แบบฟอร์มบันทึกข้อมูล',
  'ชื่อเต็ม',
  'เบอร์โทรศัพท์',
  'ที่อยู่',
  'อีเมล',
  'แบบฟอร์มการร้องเรียน',
  'ฟอร์มติดต่อลูกค้า'
];

async function testTranslations() {
  console.log('=== MyMemory Translation Service Test ===\n');

  // Test connection first
  console.log('Testing API connection...');
  const connected = await translationService.testConnection();
  if (!connected) {
    console.error('\n❌ Cannot connect to MyMemory API. Exiting.');
    process.exit(1);
  }

  console.log('\n=== Testing Thai → English Translations ===\n');

  for (const thaiText of testCases) {
    try {
      console.log(`Thai: "${thaiText}"`);

      const result = await translationService.translateToEnglish(thaiText);

      console.log(`English: "${result.translated}"`);
      console.log(`Slug: "${result.slug}"`);
      console.log(`Quality: ${result.quality} (match: ${result.match})`);
      console.log('---');

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ Error translating "${thaiText}":`, error.message);
      console.log('---');
    }
  }

  console.log('\n=== Test Complete ===');
}

// Run tests
testTranslations().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
