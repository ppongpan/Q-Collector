// Test validation for Google Sheets import
require('dotenv').config({ path: '../.env' });
const { sequelize, Form, Field } = require('../models');
const SheetImportService = require('../services/SheetImportService');

async function testValidation() {
  try {
    console.log('🔍 Testing validation for form...\n');

    // Get the latest form
    const form = await Form.findOne({
      order: [['createdAt', 'DESC']],
      include: [{
        model: Field,
        as: 'fields'
      }]
    });

    if (!form) {
      console.log('❌ No forms found');
      return;
    }

    console.log(`📋 Form: ${form.title}`);
    console.log(`   ID: ${form.id}`);
    console.log(`   Fields: ${form.fields.length}\n`);

    // Create sample data (simulating a row from Google Sheets)
    const sampleData = {};

    // Fill with empty strings for all fields
    form.fields.forEach(field => {
      sampleData[field.id] = '';
    });

    console.log('Testing validation with empty data...\n');

    // Validate
    const validation = await SheetImportService.validateSubmissionData(form.id, sampleData);

    console.log(`Validation result: ${validation.valid ? '✅ PASSED' : '❌ FAILED'}`);

    if (!validation.valid) {
      console.log(`\nErrors (${validation.errors.length}):`);
      validation.errors.forEach((err, i) => {
        console.log(`  ${i + 1}. Field: ${err.field_title || err.field}`);
        console.log(`     Message: ${err.message}`);
        if (err.value !== undefined) {
          console.log(`     Value: "${err.value}"`);
        }
        console.log('');
      });
    }

    await sequelize.close();
    console.log('\n✅ Test complete');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testValidation();
