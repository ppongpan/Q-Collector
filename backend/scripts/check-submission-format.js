const { Sequelize } = require('sequelize');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'qcollector_db',
  process.env.POSTGRES_USER || 'qcollector',
  process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  }
);

async function checkSubmissionFormat() {
  try {
    // Get a recent submission with data
    const [submissions] = await sequelize.query(`
      SELECT s.id, s.form_id, f.title, s.data
      FROM submissions s
      JOIN forms f ON s.form_id = f.id
      WHERE s.data IS NOT NULL
      ORDER BY s."createdAt" DESC
      LIMIT 1
    `);

    if (submissions.length === 0) {
      console.log('❌ No submissions found with data');
      return;
    }

    const submission = submissions[0];
    console.log('\n📋 Submission Format Check');
    console.log('═'.repeat(80));
    console.log(`Form: ${submission.title}`);
    console.log(`Submission ID: ${submission.id}`);
    console.log(`Form ID: ${submission.form_id}`);
    console.log('\n📦 Data Structure:');
    console.log(JSON.stringify(submission.data, null, 2));

    // Check if there's submission_data
    const [submissionData] = await sequelize.query(`
      SELECT field_id, value
      FROM submission_data
      WHERE submission_id = '${submission.id}'
      LIMIT 5
    `);

    if (submissionData.length > 0) {
      console.log('\n📊 Submission Data (Old Format):');
      submissionData.forEach((sd, index) => {
        console.log(`${index + 1}. Field ID: ${sd.field_id}`);
        console.log(`   Value: ${JSON.stringify(sd.value)}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkSubmissionFormat();
