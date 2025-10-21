/**
 * Quick script to check Follow Up form status
 */

const { Form, SubForm, Submission, sequelize } = require('../models');

async function checkFollowUpForm() {
  try {
    console.log('🔍 Checking Follow Up form status...\n');

    // Find forms with "Follow" in title
    const forms = await Form.findAll({
      where: {
        title: {
          [sequelize.Sequelize.Op.like]: '%Follow%'
        }
      },
      include: [
        {
          model: SubForm,
          as: 'subForms',
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    console.log(`Found ${forms.length} forms with "Follow" in title:\n`);

    for (const form of forms) {
      console.log(`📋 Form: ${form.title}`);
      console.log(`   ID: ${form.id}`);
      console.log(`   Table: ${form.table_name || 'NOT SET'}`);
      console.log(`   Created: ${form.createdAt}`);
      console.log(`   Subforms: ${form.subForms?.length || 0}`);

      // Count submissions
      const submissionCount = await Submission.count({
        where: { form_id: form.id }
      });
      console.log(`   Submissions: ${submissionCount}`);

      if (form.subForms && form.subForms.length > 0) {
        for (const sf of form.subForms) {
          console.log(`     └─ SubForm: ${sf.title} (ID: ${sf.id})`);
        }
      }
      console.log('');
    }

    // Check submissions for Follow Up form
    const followUpSubmissions = await Submission.findAll({
      include: [
        {
          model: Form,
          as: 'form',
          where: {
            title: {
              [sequelize.Sequelize.Op.like]: '%Follow%'
            }
          }
        }
      ],
      limit: 10,
      order: [['submitted_at', 'DESC']]
    });

    console.log(`\n📊 Recent submissions for Follow Up forms: ${followUpSubmissions.length}`);
    for (const sub of followUpSubmissions) {
      const parentInfo = sub.parent_id ? `parent_id: ${sub.parent_id.substring(0, 8)}...` : 'parent_id: NULL';
      console.log(`  - ${sub.form.title} | ${parentInfo} | ${sub.submitted_at}`);
    }

    await sequelize.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkFollowUpForm();
