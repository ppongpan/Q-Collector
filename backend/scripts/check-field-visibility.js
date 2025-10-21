/**
 * Check SubForm Field Visibility Settings
 * Helps debug why fields are still showing when they should be hidden
 */

const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Load models
const { Field, SubForm, Form } = require('../models');

async function checkFieldVisibility() {
  try {
    console.log('🔍 Checking SubForm Field Visibility Settings...\n');

    // Query all SubForm fields with their show_condition
    const fields = await Field.findAll({
      where: {
        sub_form_id: { [require('sequelize').Op.ne]: null }
      },
      include: [
        {
          model: SubForm,
          as: 'subForm',
          include: [
            {
              model: Form,
              as: 'form'
            }
          ]
        }
      ],
      order: [['order', 'ASC']],
      raw: false
    });

    console.log(`Found ${fields.length} SubForm fields\n`);

    // Group by form and subform
    const grouped = {};
    fields.forEach(field => {
      const formKey = field.form_title || 'Unknown Form';
      const subFormKey = field.subform_title || 'Unknown SubForm';

      if (!grouped[formKey]) {
        grouped[formKey] = {};
      }
      if (!grouped[formKey][subFormKey]) {
        grouped[formKey][subFormKey] = [];
      }
      grouped[formKey][subFormKey].push(field);
    });

    // Display results
    Object.entries(grouped).forEach(([formTitle, subForms]) => {
      console.log(`📋 Form: ${formTitle}`);
      Object.entries(subForms).forEach(([subFormTitle, fields]) => {
        console.log(`  📦 SubForm: ${subFormTitle}`);
        fields.forEach(field => {
          const visibility = field.show_condition
            ? (field.show_condition.enabled === false
                ? '🔴 HIDDEN'
                : '✅ VISIBLE')
            : '✅ VISIBLE (default)';

          console.log(`    - ${field.title} (${field.type}): ${visibility}`);
          if (field.show_condition && field.show_condition.enabled === false) {
            console.log(`      Formula: ${field.show_condition.formula || 'none (always hidden)'}`);
            console.log(`      Raw: ${JSON.stringify(field.show_condition)}`);
          }
        });
      });
      console.log('');
    });

    // Check specifically for 'ID' fields
    console.log('\n🔍 Focusing on "ID" fields:');
    const idFields = fields.filter(f => f.title.toLowerCase().includes('id'));
    if (idFields.length === 0) {
      console.log('  No fields with "ID" in title found');
    } else {
      idFields.forEach(field => {
        console.log(`\n  Field: ${field.title}`);
        console.log(`  Form: ${field.form_title}`);
        console.log(`  SubForm: ${field.subform_title}`);
        console.log(`  Type: ${field.type}`);
        console.log(`  show_condition:`, JSON.stringify(field.show_condition, null, 2));
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

checkFieldVisibility();
