const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'qcollector_db',
  process.env.POSTGRES_USER || 'qcollector',
  process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    dialect: 'postgres',
    logging: false
  }
);

async function checkSubFormDataDisplay() {
  try {
    const parentSubmissionId = '7449f6e5-e1ee-4637-9de0-8c201cfb473d';
    const subFormId = '35459e44-fe14-457f-9b12-333a357b0cb2';

    console.log('\n=== Checking Sub-form Data Display ===');
    console.log(`Parent Submission: ${parentSubmissionId}`);
    console.log(`Sub-form ID: ${subFormId}`);

    // Get sub-form submissions from submissions table
    const [submissions] = await sequelize.query(`
      SELECT id, form_id, submitted_by, parent_id, status, submitted_at
      FROM submissions
      WHERE form_id = '${subFormId}' AND parent_id = '${parentSubmissionId}'
      ORDER BY submitted_at DESC
    `);

    console.log(`\n=== Found ${submissions.length} sub-form submissions in submissions table ===`);
    submissions.forEach(sub => {
      console.log(`ID: ${sub.id}, parent_id: ${sub.parent_id}, submitted_at: ${sub.submitted_at}`);
    });

    if (submissions.length > 0) {
      const submissionId = submissions[0].id;

      // Get submission data from submission_data table
      const [submissionData] = await sequelize.query(`
        SELECT sd.id, sd.field_id, sd.value_text, sd.value_encrypted, sd.is_encrypted, f.title as field_title, f.type as field_type
        FROM submission_data sd
        JOIN fields f ON f.id = sd.field_id
        WHERE sd.submission_id = '${submissionId}'
      `);

      console.log(`\n=== Submission Data (from submission_data table) ===`);
      console.log(`Submission ID: ${submissionId}`);
      submissionData.forEach(data => {
        const value = data.is_encrypted ? '[ENCRYPTED]' : data.value_text;
        console.log(`  ${data.field_title} (${data.field_type}): ${value}`);
      });

      // Get data from dynamic table
      const [dynamicData] = await sequelize.query(`
        SELECT *
        FROM call_records_333a357b0cb2
        WHERE parent_id = '${parentSubmissionId}'
        ORDER BY submitted_at DESC
      `);

      console.log(`\n=== Data from Dynamic Table (call_records_333a357b0cb2) ===`);
      console.log(`Found ${dynamicData.length} records`);
      dynamicData.forEach((record, index) => {
        console.log(`\nRecord ${index + 1}:`);
        Object.keys(record).forEach(key => {
          if (!['id', 'parent_id', 'form_id', 'sub_form_id', 'username', 'submission_number', 'order_index', 'submitted_at'].includes(key)) {
            console.log(`  ${key}: ${record[key]}`);
          }
        });
      });
    }

    await sequelize.close();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSubFormDataDisplay();
