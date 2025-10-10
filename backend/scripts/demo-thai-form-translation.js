/**
 * Demo: Thai Form Translation (No Database Required)
 * Shows how MyMemory API translates Thai form/field names
 */

const {
  generateTableName,
  generateColumnName,
  isValidTableName
} = require('../utils/tableNameHelper');

// Demo form scenarios
const demoForms = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'แบบฟอร์มสมัครสมาชิก',
    description: 'Form for user registration',
    fields: [
      { id: 'f1', label: 'ชื่อ-นามสกุล', type: 'short_answer' },
      { id: 'f2', label: 'อีเมล', type: 'email' },
      { id: 'f3', label: 'รหัสผ่าน', type: 'short_answer' },
      { id: 'f4', label: 'เบอร์โทรศัพท์', type: 'phone' },
      { id: 'f5', label: 'วันเกิด', type: 'date' }
    ]
  },
  {
    id: '223e4567-e89b-12d3-a456-426614174001',
    title: 'แบบฟอร์มการสั่งซื้อสินค้า',
    description: 'Product order form',
    fields: [
      { id: 'f1', label: 'ชื่อลูกค้า', type: 'short_answer' },
      { id: 'f2', label: 'ที่อยู่จัดส่ง', type: 'paragraph' },
      { id: 'f3', label: 'หมายเลขโทรศัพท์', type: 'phone' },
      { id: 'f4', label: 'รายการสินค้า', type: 'paragraph' },
      { id: 'f5', label: 'ยอดเงิน', type: 'number' }
    ]
  },
  {
    id: '323e4567-e89b-12d3-a456-426614174002',
    title: 'แบบประเมินความพึงพอใจ',
    description: 'Customer satisfaction survey',
    fields: [
      { id: 'f1', label: 'คะแนนความพอใจ', type: 'rating' },
      { id: 'f2', label: 'ข้อเสนอแนะ', type: 'paragraph' },
      { id: 'f3', label: 'ชื่อผู้ประเมิน', type: 'short_answer' },
      { id: 'f4', label: 'วันที่ประเมิน', type: 'date' }
    ]
  }
];

async function demoTranslation() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     MyMemory API Translation Demo (No Database)          ║');
  console.log('║     Thai → English Real-Time Translation                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  let totalApiCalls = 0;
  const startTime = Date.now();

  for (let i = 0; i < demoForms.length; i++) {
    const form = demoForms[i];

    console.log(`\n${'='.repeat(70)}`);
    console.log(`📋 Form ${i + 1}/${demoForms.length}`);
    console.log(`${'='.repeat(70)}\n`);

    console.log(`🇹🇭 Thai Title: "${form.title}"`);
    console.log(`📝 Description: ${form.description}\n`);

    // Translate table name
    console.log('🔄 Translating form title...');
    const tableName = await generateTableName(form.title, form.id);
    totalApiCalls++;

    const isValid = isValidTableName(tableName);
    console.log(`📊 Table Name: ${tableName}`);
    console.log(`✅ Valid: ${isValid ? 'YES' : 'NO'}`);

    if (!isValid) {
      console.log('❌ ERROR: Invalid table name generated!');
      continue;
    }

    // Show SQL CREATE TABLE statement
    console.log(`\n💾 SQL Statement (Preview):\n`);
    console.log(`CREATE TABLE ${tableName} (`);
    console.log(`    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),`);
    console.log(`    form_id UUID NOT NULL,`);
    console.log(`    user_id UUID,`);
    console.log(`    submission_number INTEGER,`);
    console.log(`    status VARCHAR(50) DEFAULT 'submitted',`);

    // Translate field names
    console.log(`\n📝 Fields (${form.fields.length} total):\n`);

    for (const field of form.fields) {
      console.log(`   🇹🇭 "${field.label}"`);

      const columnName = await generateColumnName(field.label, field.id);
      totalApiCalls++;

      // Determine SQL type
      const sqlType = {
        'short_answer': 'VARCHAR(255)',
        'paragraph': 'TEXT',
        'email': 'VARCHAR(255)',
        'phone': 'VARCHAR(20)',
        'number': 'NUMERIC',
        'date': 'DATE',
        'rating': 'INTEGER'
      }[field.type] || 'TEXT';

      console.log(`   🇬🇧 ${columnName} ${sqlType}`);
      console.log(`      ↳ ${field.type} field\n`);

      // Add to SQL statement
      console.log(`    ${columnName} ${sqlType},`);

      // Delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    console.log(`    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,`);
    console.log(`    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,`);
    console.log(`    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    console.log(`);\n`);

    console.log(`📈 API Calls for this form: ${1 + form.fields.length}`);
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log(`\n${'='.repeat(70)}`);
  console.log('📊 Translation Summary');
  console.log(`${'='.repeat(70)}\n`);

  console.log(`✅ Forms Processed: ${demoForms.length}`);
  console.log(`✅ Total Fields: ${demoForms.reduce((sum, f) => sum + f.fields.length, 0)}`);
  console.log(`📞 Total API Calls: ${totalApiCalls}`);
  console.log(`⏱️  Total Time: ${duration} seconds`);
  console.log(`⚡ Average per call: ${(duration / totalApiCalls).toFixed(2)}s`);

  console.log(`\n💡 MyMemory API Usage:`);
  console.log(`   - Characters used: ~${totalApiCalls * 20} (estimate)`);
  console.log(`   - Daily limit (anonymous): 5,000 chars`);
  console.log(`   - Daily limit (with email): 50,000 chars`);
  console.log(`   - Remaining today: ~${5000 - (totalApiCalls * 20)} chars (anonymous)\n`);

  console.log(`✅ Demo Complete!\n`);
  console.log(`📝 Next Steps:`);
  console.log(`   1. Start PostgreSQL database`);
  console.log(`   2. Run: node scripts/test-create-thai-form.js`);
  console.log(`   3. Verify tables in database`);
  console.log(`   4. Create forms via frontend UI\n`);
}

// Run demo
console.log('Starting demo...\n');
demoTranslation().catch(error => {
  console.error('❌ Demo failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
