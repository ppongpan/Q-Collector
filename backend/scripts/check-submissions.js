// Check submissions in database
require('dotenv').config({ path: '../.env' });
const { sequelize, Form, Submission } = require('../models');

async function checkSubmissions() {
  try {
    console.log('🔍 Checking forms and submissions...\n');

    // Get latest forms
    const forms = await Form.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'title', 'table_name', 'createdAt'],
      raw: true,
    });

    console.log(`Found ${forms.length} forms:\n`);

    for (const form of forms) {
      console.log(`📋 Form: ${form.title}`);
      console.log(`   ID: ${form.id}`);
      console.log(`   Table: ${form.table_name}`);
      console.log(`   Created: ${form.createdAt}`);

      // Count submissions
      const submissionCount = await Submission.count({
        where: { form_id: form.id }
      });

      console.log(`   Submissions: ${submissionCount}`);

      // Get recent submissions
      const recentSubmissions = await Submission.findAll({
        where: { form_id: form.id },
        order: [['createdAt', 'DESC']],
        limit: 3,
        attributes: ['id', 'status', 'createdAt'],
        raw: true,
      });

      if (recentSubmissions.length > 0) {
        console.log(`   Recent submissions:`);
        recentSubmissions.forEach(s => {
          console.log(`     - ${s.id} (${s.status}) at ${s.createdAt}`);
        });
      }

      console.log('');
    }

    await sequelize.close();
    console.log('✅ Check complete');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkSubmissions();
