const { Submission, SubmissionData, Field } = require('../models');

async function checkAllSubmissions() {
  const submissions = await Submission.findAll({
    where: { form_id: '573e1f37-4cc4-4f3c-b303-ab877066fdc9' },
    include: [{
      model: SubmissionData,
      as: 'submissionData',
      include: [{
        model: Field,
        as: 'field'
      }]
    }],
    order: [['submitted_at', 'DESC']],
    limit: 10
  });

  console.log('Found', submissions.length, 'submissions\n');

  submissions.forEach((sub, idx) => {
    console.log(`Submission ${idx + 1}:`);
    console.log('  ID:', sub.id);
    console.log('  Submitted:', sub.submitted_at);
    console.log('  Data count:', sub.submissionData?.length || 0);

    if (sub.submissionData && sub.submissionData.length > 0) {
      sub.submissionData.forEach(sd => {
        console.log(`    - Field: ${sd.field?.title || 'Unknown'} (ID: ${sd.field_id})`);
        console.log(`      Value: ${sd.value}`);
      });
    }
    console.log('---');
  });

  process.exit(0);
}

checkAllSubmissions().catch(err => {
  console.error(err);
  process.exit(1);
});
