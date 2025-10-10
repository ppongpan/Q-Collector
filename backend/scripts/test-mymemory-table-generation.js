/**
 * Test Table Name Generation with MyMemory API
 * Verifies Thai → English translation integration
 */

const {
  generateTableName,
  generateColumnName,
  isValidTableName
} = require('../utils/tableNameHelper');

// Test cases
const testForms = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'แบบฟอร์มติดต่อ',
    fields: [
      { id: 'f1', label: 'ชื่อเต็ม', type: 'short_answer' },
      { id: 'f2', label: 'เบอร์โทรศัพท์', type: 'phone' },
      { id: 'f3', label: 'อีเมล', type: 'email' }
    ]
  },
  {
    id: '223e4567-e89b-12d3-a456-426614174001',
    title: 'ใบลาป่วย',
    fields: [
      { id: 'f1', label: 'ชื่อพนักงาน', type: 'short_answer' },
      { id: 'f2', label: 'วันที่ลา', type: 'date' },
      { id: 'f3', label: 'เหตุผล', type: 'paragraph' }
    ]
  },
  {
    id: '323e4567-e89b-12d3-a456-426614174002',
    title: 'แบบฟอร์มการร้องเรียน',
    fields: [
      { id: 'f1', label: 'ชื่อผู้ร้องเรียน', type: 'short_answer' },
      { id: 'f2', label: 'รายละเอียดปัญหา', type: 'paragraph' },
      { id: 'f3', label: 'ที่อยู่', type: 'paragraph' }
    ]
  }
];

async function testTableGeneration() {
  console.log('=== MyMemory API Table Name Generation Test ===\n');

  for (const form of testForms) {
    console.log(`\n📋 Form: "${form.title}"`);
    console.log(`   ID: ${form.id}`);

    try {
      // Generate table name
      const tableName = await generateTableName(form.title, form.id);
      console.log(`   Table: ${tableName}`);

      // Validate table name
      const isValid = isValidTableName(tableName);
      console.log(`   Valid: ${isValid ? '✅' : '❌'}`);

      if (!isValid) {
        console.error(`   ❌ INVALID TABLE NAME: ${tableName}`);
        continue;
      }

      // Generate column names for each field
      console.log(`   \n   Columns:`);
      for (const field of form.fields) {
        const columnName = await generateColumnName(field.label, field.id);
        console.log(`     - ${field.label} → ${columnName}`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }

    console.log('   ---');
  }

  console.log('\n=== Test Complete ===');
}

// Run tests
testTableGeneration().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
