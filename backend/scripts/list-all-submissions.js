/**
 * List all submissions for the form
 */

const { Submission, Form, SubForm } = require('../models');

async function listSubmissions() {
  try {
    const submissions = await Submission.findAll({
      where: { form_id: 'f406b4e1-baef-41a7-823b-b6d95c23b4fe' },
      include: [
        { model: Form, as: 'form', attributes: ['title'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    console.log(`Found ${submissions.length} submissions:\n`);

    submissions.forEach((s, i) => {
      const type = s.sub_form_id ? '📎 SUB-FORM' : '📄 MAIN FORM';
      console.log(`${i + 1}. ${type}`);
      console.log(`   ID: ${s.id}`);
      console.log(`   Form: ${s.form.title}`);
      if (s.sub_form_id) {
        console.log(`   Sub-form ID: ${s.sub_form_id}`);
      }
      console.log(`   Parent ID: ${s.parent_id || 'NULL'}`);
      console.log(`   Status: ${s.status}`);
      console.log(`   Created: ${s.createdAt}\n`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

listSubmissions();
