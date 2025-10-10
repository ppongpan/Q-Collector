/**
 * Check Forms in Database
 * Lists all forms and their status
 */

const { Form, Field, SubForm } = require('../models');

async function checkForms() {
  try {
    console.log('🔍 Checking forms in database...\n');

    // Get all forms
    const forms = await Form.findAll({
      include: [
        {
          model: Field,
          as: 'fields',
          attributes: ['id', 'title', 'type', 'sub_form_id', 'order'],
          required: false
        },
        {
          model: SubForm,
          as: 'subForms',
          attributes: ['id', 'title', 'table_name'],
          required: false
        }
      ],
      order: [
        ['createdAt', 'DESC'],
        [{ model: Field, as: 'fields' }, 'order', 'ASC']
      ]
    });

    console.log(`Found ${forms.length} forms in database:\n`);

    forms.forEach((form, index) => {
      console.log(`${index + 1}. ${form.title}`);
      console.log(`   ID: ${form.id}`);
      console.log(`   Table: ${form.table_name || 'NOT SET'}`);
      console.log(`   Active: ${form.is_active ? '✅' : '❌'}`);
      console.log(`   Fields: ${form.fields?.length || 0}`);
      console.log(`   Sub-forms: ${form.subForms?.length || 0}`);
      console.log(`   Created: ${form.createdAt}\n`);
    });

    // Check if forms are active
    const inactiveForms = forms.filter(f => !f.is_active);
    if (inactiveForms.length > 0) {
      console.log('⚠️  Found inactive forms:', inactiveForms.length);
      console.log('   These forms will not show on frontend until activated.\n');

      inactiveForms.forEach(f => {
        console.log(`   - ${f.title} (ID: ${f.id})`);
      });
    }

    const activeForms = forms.filter(f => f.is_active);
    console.log(`\n📊 Summary:`);
    console.log(`   Total forms: ${forms.length}`);
    console.log(`   Active: ${activeForms.length}`);
    console.log(`   Inactive: ${inactiveForms.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkForms();
