const { Form, Field, SubForm } = require('../models');

async function checkMyForm2Fields() {
  const formId = '573e1f37-4cc4-4f3c-b303-ab877066fdc9';

  const form = await Form.findByPk(formId, {
    include: [
      {
        model: Field,
        as: 'fields',
        order: [['order', 'ASC']]
      },
      {
        model: SubForm,
        as: 'subForms',
        include: [{
          model: Field,
          as: 'fields',
          order: [['order', 'ASC']]
        }]
      }
    ]
  });

  console.log('\n================================================================================');
  console.log(`Form: ${form.title} (ID: ${form.id})`);
  console.log('================================================================================\n');

  // Main form fields
  const mainFields = form.fields.filter(f => !f.sub_form_id);
  console.log(`📋 MAIN FORM FIELDS (${mainFields.length})`);
  console.log('──────────────────────────────────────────────────────────────────────\n');

  if (mainFields.length === 0) {
    console.log('  ❌ NO MAIN FORM FIELDS!\n');
  } else {
    mainFields.forEach((field, idx) => {
      console.log(`  Field ${idx + 1}: ${field.title}`);
      console.log(`  Type: ${field.type}`);
      console.log(`  Required: ${field.required ? '✅ YES' : '❌ NO'}`);
      console.log(`  Show in Table: ${field.show_in_table ? '✅ YES' : '❌ NO'}`);
      console.log();
    });
  }

  // Sub-form fields
  if (form.subForms && form.subForms.length > 0) {
    console.log(`\n📦 SUB-FORMS (${form.subForms.length})`);
    console.log('──────────────────────────────────────────────────────────────────────\n');

    form.subForms.forEach((subForm, idx) => {
      console.log(`  Sub-Form ${idx + 1}: ${subForm.title}`);
      console.log(`  Fields: ${subForm.fields.length}`);

      subForm.fields.forEach((field, fieldIdx) => {
        console.log(`    ${fieldIdx + 1}. ${field.title} (${field.type})`);
      });
      console.log();
    });
  }

  console.log('================================================================================');
  console.log('🔍 DIAGNOSIS:');
  console.log(`  Main form fields: ${mainFields.length}`);
  console.log(`  Sub-forms: ${form.subForms?.length || 0}`);
  console.log(`  Total fields in form: ${form.fields.length}`);

  if (mainFields.length === 0) {
    console.log('\n❌ PROBLEM FOUND: This form has NO main form fields!');
    console.log('   All fields belong to sub-forms.');
    console.log('   When submitting the main form, there is no field data to save.');
  }

  console.log('================================================================================\n');

  process.exit(0);
}

checkMyForm2Fields().catch(err => {
  console.error(err);
  process.exit(1);
});
