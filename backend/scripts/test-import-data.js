// Test validation with actual Google Sheets data
require('dotenv').config({ path: '../.env' });
const { sequelize, Form, Field, SheetImportConfig } = require('../models');
const GoogleSheetsService = require('../services/GoogleSheetsService');
const SheetImportService = require('../services/SheetImportService');

async function testImportData() {
  try {
    console.log('🔍 Testing Google Sheets import validation...\n');

    // Get the latest form
    const form = await Form.findOne({
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Field,
          as: 'fields',
          order: [['order', 'ASC']]
        }
      ]
    });

    if (!form) {
      console.log('❌ No forms found');
      return;
    }

    console.log(`📋 Form: ${form.title}`);
    console.log(`📋 Form ID: ${form.id}`);
    console.log(`📋 Fields: ${form.fields.length}\n`);

    // Show all fields
    console.log('📝 Form Fields:');
    form.fields.forEach((field, i) => {
      console.log(`   ${i + 1}. ${field.title} (${field.type}) ${field.required ? '⚠️ REQUIRED' : ''}`);
    });

    // Create sample data (simulating a row from Google Sheets with realistic values)
    console.log(`\n📝 Creating sample data with realistic values...\n`);
    const sampleData = {};

    form.fields.forEach(field => {
      let value = '';

      // Provide realistic sample data based on field type
      switch (field.type) {
        case 'date':
          value = '2024-01-15';
          break;
        case 'time':
          value = '14:30';
          break;
        case 'phone':
          value = '081-234-5678'; // Thai phone format with dashes
          break;
        case 'email':
          value = 'test@example.com';
          break;
        case 'number':
          value = '100';
          break;
        case 'province':
          value = 'กรุงเทพมหานคร';
          break;
        case 'multiple_choice':
          // Use first choice if available
          if (field.options && field.options.choices && field.options.choices.length > 0) {
            value = field.options.choices[0];
          } else {
            value = 'Option 1';
          }
          break;
        default:
          value = 'Sample data';
          break;
      }

      sampleData[field.id] = value;
      console.log(`   ${field.title}: "${value}" (${field.type})`);
    });

    // Validate the data
    console.log(`\n🔍 Validating sample data...`);
    const validation = await SheetImportService.validateSubmissionData(
      form.id,
      sampleData
    );

    console.log(`\n${validation.valid ? '✅ VALIDATION PASSED' : '❌ VALIDATION FAILED'}`);

    if (!validation.valid) {
      console.log(`\n📋 Validation errors: ${validation.errors.length}\n`);

      validation.errors.forEach((err, i) => {
        console.log(`❌ Error ${i + 1}:`);
        console.log(`   Field ID: ${err.field}`);
        console.log(`   Field Title: ${err.field_title}`);
        console.log(`   Message: ${err.message}`);
        if (err.value !== undefined) {
          console.log(`   Value: "${err.value}"`);
        }

        // Show field details
        const field = form.fields.find(f => f.id === err.field);
        if (field) {
          console.log(`   Field Type: ${field.type}`);
          console.log(`   Required: ${field.required}`);
          if (field.validation_rules && Object.keys(field.validation_rules).length > 0) {
            console.log(`   Validation Rules: ${JSON.stringify(field.validation_rules)}`);
          }
          if (field.options && Object.keys(field.options).length > 0) {
            console.log(`   Field Options: ${JSON.stringify(field.options)}`);
          }
        }
        console.log('');
      });

      // Now test with empty data (what Google Sheets might have)
      console.log('\n📝 Testing with EMPTY data (like Google Sheets might have)...\n');
      const emptyData = {};
      form.fields.forEach(field => {
        emptyData[field.id] = '';
      });

      const emptyValidation = await SheetImportService.validateSubmissionData(
        form.id,
        emptyData
      );

      console.log(`${emptyValidation.valid ? '✅ EMPTY VALIDATION PASSED' : '❌ EMPTY VALIDATION FAILED'}`);

      if (!emptyValidation.valid) {
        console.log(`\n📋 Empty validation errors: ${emptyValidation.errors.length}\n`);

        emptyValidation.errors.forEach((err, i) => {
          console.log(`❌ Error ${i + 1}:`);
          console.log(`   Field: ${err.field_title}`);
          console.log(`   Message: ${err.message}`);
          console.log('');
        });
      }
    } else {
      console.log('\n✅ All fields validated successfully!');
    }

    await sequelize.close();
    console.log('\n✅ Test complete');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await sequelize.close();
    process.exit(1);
  }
}

testImportData();
