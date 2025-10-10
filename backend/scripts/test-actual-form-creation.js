/**
 * Test Actual Form Creation Flow
 *
 * Purpose: Simulate real form creation to see where transliteration happens
 * Issue: User reported "form_aebbformbanthuekkhomul..." but tests show proper English
 *
 * Date: 2025-10-10
 * Version: v0.7.7-dev (Debug)
 */

const { sequelize } = require('../models');
const FormService = require('../services/FormService');
const tableNameHelper = require('../utils/tableNameHelper');

async function testActualFormCreation() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 Testing Actual Form Creation Flow');
  console.log('='.repeat(80));

  const problematicFormTitle = 'แบบฟอร์มบันทึกข้อมูลการจัดการความเสี่ยงและการป้องกันอุบัติเหตุในสถานประกอบการ';

  console.log(`\n📝 Form Title: ${problematicFormTitle}`);
  console.log(`   Length: ${problematicFormTitle.length} characters\n`);

  try {
    // Step 1: Check tableNameHelper.generateTableName() directly
    console.log('─'.repeat(80));
    console.log('Step 1: tableNameHelper.generateTableName()');
    console.log('─'.repeat(80));

    const tableName = await tableNameHelper.generateTableName(
      problematicFormTitle,
      'test-form-id-12345'
    );

    console.log(`✅ Generated Table Name: "${tableName}"`);
    console.log(`   Length: ${tableName.length} characters`);

    // Check if it's transliteration
    const hasThaiPhonetics = /ae|kh|ph|th|ng|aep|bant|khom|ying/.test(tableName);
    const hasLongConsonants = /[bcdfghjklmnpqrstvwxyz]{8,}/.test(tableName);

    console.log(`\n🔍 Analysis:`);
    console.log(`   Has Thai Phonetics: ${hasThaiPhonetics}`);
    console.log(`   Has Long Consonants (8+): ${hasLongConsonants}`);

    if (hasThaiPhonetics || hasLongConsonants) {
      console.log(`\n❌ ERROR: This is a TRANSLITERATION! Not proper English!`);
      console.log(`   Expected: "enterprise_accident_risk_management..."`);
      console.log(`   Got: "${tableName}"\n`);
    } else {
      console.log(`\n✅ SUCCESS: This is proper English translation!\n`);
    }

    // Step 2: Try creating a real form (without saving to DB)
    console.log('─'.repeat(80));
    console.log('Step 2: Simulating Full Form Creation (DRY RUN)');
    console.log('─'.repeat(80));

    const formData = {
      title: problematicFormTitle,
      description: 'Test form for translation debugging',
      fields: [
        {
          label: 'ชื่อเต็ม',
          type: 'short_answer',
          required: true,
          showInTable: true
        },
        {
          label: 'เบอร์โทรศัพท์',
          type: 'phone',
          required: true,
          showInTable: true
        }
      ]
    };

    console.log(`\n📋 Form Data:`);
    console.log(`   Title: ${formData.title}`);
    console.log(`   Fields: ${formData.fields.length} fields`);

    // Generate table name (same as FormService does)
    const tableNameFromService = await tableNameHelper.generateTableName(
      formData.title,
      null // No form ID yet
    );

    console.log(`\n✅ Table Name from Helper: "${tableNameFromService}"`);

    // Generate column names for fields
    console.log(`\n📊 Field Column Names:`);
    for (const field of formData.fields) {
      const columnName = await tableNameHelper.generateColumnName(field.label);
      console.log(`   "${field.label}" → "${columnName}"`);
    }

    console.log('\n✅ Dry run complete (no database changes made)\n');

  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    console.error(error.stack);
  }

  console.log('='.repeat(80));
  console.log('🏁 Test Complete');
  console.log('='.repeat(80) + '\n');

  // Exit without waiting for DB connections
  process.exit(0);
}

// Run test
testActualFormCreation()
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
