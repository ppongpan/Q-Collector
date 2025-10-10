const { Form, Field, SubForm, Submission, SubmissionData } = require('../models');

async function diagnoseFieldToggleIssue() {
  console.log('\n🔍 DIAGNOSING FIELD TOGGLE AND DATA DISPLAY ISSUE\n');
  console.log('=' .repeat(80));

  // Find My Form 2
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

  if (!form) {
    console.log('❌ Form not found!');
    process.exit(1);
  }

  console.log(`\n📋 FORM: ${form.title} (ID: ${form.id})\n`);

  // Analyze main form fields
  const mainFields = form.fields.filter(f => !f.sub_form_id);
  const subFormFieldsInMainArray = form.fields.filter(f => f.sub_form_id);

  console.log('🔹 MAIN FORM FIELDS');
  console.log('-'.repeat(80));
  mainFields.forEach((field, idx) => {
    console.log(`\n  ${idx + 1}. ${field.title} (ID: ${field.id})`);
    console.log(`     Type: ${field.type}`);
    console.log(`     Required: ${field.required ? '✅ YES' : '❌ NO'}`);
    console.log(`     Show in Table: ${field.show_in_table ? '✅ YES' : '❌ NO'}`);
    console.log(`     Send Telegram: ${field.send_telegram ? '✅ YES' : '❌ NO'}`);
    console.log(`     Sub Form ID: ${field.sub_form_id || 'NULL (main form field)'}`);
  });

  if (subFormFieldsInMainArray.length > 0) {
    console.log(`\n  ⚠️  WARNING: Found ${subFormFieldsInMainArray.length} sub-form fields in main fields array!`);
  }

  // Analyze sub-forms
  if (form.subForms && form.subForms.length > 0) {
    console.log('\n\n🔹 SUB-FORMS');
    console.log('-'.repeat(80));

    form.subForms.forEach((subForm, subIdx) => {
      console.log(`\n  Sub-Form ${subIdx + 1}: ${subForm.title} (ID: ${subForm.id})`);
      console.log(`  Fields: ${subForm.fields.length}`);
      console.log();

      subForm.fields.forEach((field, fieldIdx) => {
        console.log(`    ${fieldIdx + 1}. ${field.title} (ID: ${field.id})`);
        console.log(`       Type: ${field.type}`);
        console.log(`       Required: ${field.required ? '✅ YES' : '❌ NO'}`);
        console.log(`       Show in Table: ${field.show_in_table ? '✅ YES' : '❌ NO'}`);
        console.log(`       Send Telegram: ${field.send_telegram ? '✅ YES' : '❌ NO'}`);
        console.log(`       Sub Form ID: ${field.sub_form_id || 'NULL (ERROR!)'}`);
        console.log();
      });
    });
  }

  // Check recent submissions
  console.log('\n🔹 RECENT SUBMISSIONS (Last 3)');
  console.log('-'.repeat(80));

  const submissions = await Submission.findAll({
    where: { form_id: formId },
    include: [{
      model: SubmissionData,
      as: 'submissionData',
      include: [{
        model: Field,
        as: 'field'
      }]
    }],
    order: [['submitted_at', 'DESC']],
    limit: 3
  });

  if (submissions.length === 0) {
    console.log('\n  ℹ️  No submissions found\n');
  } else {
    submissions.forEach((sub, idx) => {
      console.log(`\n  Submission ${idx + 1}:`);
      console.log(`  ID: ${sub.id}`);
      console.log(`  Submitted: ${sub.submitted_at}`);
      console.log(`  Data Records: ${sub.submissionData?.length || 0}`);

      if (sub.submissionData && sub.submissionData.length > 0) {
        console.log('  Fields:');
        sub.submissionData.forEach(sd => {
          const fieldTitle = sd.field?.title || 'Unknown Field';
          const fieldId = sd.field_id;
          const showInTable = sd.field?.show_in_table;
          console.log(`    - ${fieldTitle} (${fieldId})`);
          console.log(`      Value: ${sd.value}`);
          console.log(`      Show in Table: ${showInTable ? '✅ YES' : '❌ NO'}`);
        });
      } else {
        console.log('  ❌ NO DATA RECORDS!');
      }
    });
  }

  // Summary
  console.log('\n\n🔹 SUMMARY');
  console.log('='.repeat(80));
  console.log(`  Main Form Fields: ${mainFields.length}`);
  console.log(`  Main Form Fields with showInTable=true: ${mainFields.filter(f => f.show_in_table).length}`);
  console.log(`  Sub-Forms: ${form.subForms?.length || 0}`);

  if (form.subForms) {
    form.subForms.forEach(sf => {
      const fieldsWithShowInTable = sf.fields.filter(f => f.show_in_table).length;
      console.log(`  Sub-Form "${sf.title}" fields with showInTable=true: ${fieldsWithShowInTable}/${sf.fields.length}`);
    });
  }

  console.log(`  Recent Submissions: ${submissions.length}`);
  console.log(`  Submissions with Data: ${submissions.filter(s => s.submissionData && s.submissionData.length > 0).length}`);
  console.log(`  Submissions without Data: ${submissions.filter(s => !s.submissionData || s.submissionData.length === 0).length}`);

  // Potential Issues
  console.log('\n\n🔹 POTENTIAL ISSUES');
  console.log('='.repeat(80));

  const issues = [];

  // Check 1: Sub-form fields in main array
  if (subFormFieldsInMainArray.length > 0) {
    issues.push(`⚠️  Found ${subFormFieldsInMainArray.length} sub-form fields in main fields array (should be separate)`);
  }

  // Check 2: Submissions without data
  const emptySubmissions = submissions.filter(s => !s.submissionData || s.submissionData.length === 0).length;
  if (emptySubmissions > 0) {
    issues.push(`⚠️  ${emptySubmissions} submissions have NO data records (bug!)`);
  }

  // Check 3: No fields with showInTable=true
  const mainFieldsWithTable = mainFields.filter(f => f.show_in_table).length;
  if (mainFieldsWithTable === 0 && mainFields.length > 0) {
    issues.push(`⚠️  No main form fields have showInTable=true (submission list will be empty)`);
  }

  if (form.subForms) {
    form.subForms.forEach(sf => {
      const fieldsWithTable = sf.fields.filter(f => f.show_in_table).length;
      if (fieldsWithTable === 0 && sf.fields.length > 0) {
        issues.push(`⚠️  Sub-form "${sf.title}" has no fields with showInTable=true`);
      }
    });
  }

  if (issues.length === 0) {
    console.log('\n  ✅ No issues detected!');
  } else {
    console.log();
    issues.forEach(issue => console.log(`  ${issue}`));
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Diagnosis Complete\n');

  process.exit(0);
}

diagnoseFieldToggleIssue().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
