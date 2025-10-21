/**
 * Check Submissions Issue - Debug Script
 * Check why submissions are not displaying
 */

const { Submission, SubmissionData, Form, Field } = require('../models');

async function checkSubmissions() {
  try {
    console.log('=== CHECKING SUBMISSIONS ===\n');

    // 1. Count total submissions
    const totalCount = await Submission.count();
    console.log(`📊 Total submissions in database: ${totalCount}`);

    // 2. Count submissions by form
    const forms = await Form.findAll({
      attributes: ['id', 'title', 'is_active'],
      include: [{
        model: Submission,
        as: 'submissions',
        attributes: ['id']
      }]
    });

    console.log('\n📋 Submissions per form:');
    forms.forEach(form => {
      console.log(`  - ${form.title}: ${form.submissions?.length || 0} submissions (Active: ${form.is_active})`);
    });

    // 3. Check latest 5 submissions with details
    console.log('\n📝 Latest 5 submissions:');
    const latest = await Submission.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']], // ✅ FIX: Use camelCase
      include: [
        {
          model: Form,
          as: 'form',
          attributes: ['id', 'title', 'is_active']
        },
        {
          model: SubmissionData,
          as: 'submissionData',
          include: [{
            model: Field,
            as: 'field',
            attributes: ['id', 'title', 'type']
          }]
        }
      ]
    });

    latest.forEach((submission, index) => {
      console.log(`\n${index + 1}. Submission ID: ${submission.id}`);
      console.log(`   Form: ${submission.form?.title || 'N/A'}`);
      console.log(`   Status: ${submission.status}`);
      console.log(`   Created: ${submission.createdAt}`); // ✅ FIX: Use camelCase
      console.log(`   Data entries: ${submission.submissionData?.length || 0}`);

      if (submission.submissionData && submission.submissionData.length > 0) {
        console.log(`   Sample data:`);
        submission.submissionData.slice(0, 3).forEach(data => {
          // ✅ CRITICAL FIX: Call getDecryptedValue() method instead of accessing .value property
          const value = data.getDecryptedValue();
          console.log(`     - ${data.field?.title}: ${value}`);
        });
      }
    });

    // 4. Check for issues
    console.log('\n⚠️  CHECKING FOR ISSUES:');

    // Check for submissions with no data
    const submissionsWithNoData = await Submission.findAll({
      include: [{
        model: SubmissionData,
        as: 'submissionData',
        required: false
      }]
    });

    const emptySubmissions = submissionsWithNoData.filter(s => !s.submissionData || s.submissionData.length === 0);
    console.log(`  - Submissions with no data: ${emptySubmissions.length}/${totalCount}`);

    // Check for submissions with inactive forms
    const submissionsInactiveForms = await Submission.findAll({
      include: [{
        model: Form,
        as: 'form',
        where: { is_active: false },
        required: true
      }]
    });
    console.log(`  - Submissions in inactive forms: ${submissionsInactiveForms.length}`);

    console.log('\n✅ Check complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

checkSubmissions();
