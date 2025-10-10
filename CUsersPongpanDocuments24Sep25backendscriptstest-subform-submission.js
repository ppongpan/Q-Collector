/**
 * Test Sub-Form Submission
 */
require('dotenv').config();
const SubmissionService = require('../services/SubmissionService');
const { SubForm } = require('../models');

const SUB_FORM_ID = '35459e44-fe14-457f-9b12-333a357b0cb2';
const PARENT_SUBMISSION_ID = '53baf3f9-2249-4914-92ee-9e80db2c3029';
const USER_ID = 'cc72d54e-f4d1-4b87-9e3f-25d91706a319';

async function test() {
  console.log('Testing sub-form submission...\n');

  try {
    const subForm = await SubForm.findByPk(SUB_FORM_ID, { include: ['fields'] });
    console.log(`Sub-form: ${subForm.title}, Table: ${subForm.table_name}`);

    const testData = {};
    subForm.fields.forEach(f => { testData[f.id] = `Test ${f.title}`; });

    console.log('Creating submission...');
    const submission = await SubmissionService.createSubmission(
      SUB_FORM_ID,
      USER_ID,
      { fieldData: testData, parentId: PARENT_SUBMISSION_ID, status: 'submitted' },
      { ipAddress: '127.0.0.1', userAgent: 'Test' }
    );

    console.log(`✅ Submission created: ${submission.id}\n`);

    const { Pool } = require('pg');
    const pool = new Pool({
      host: 'localhost',
      database: 'qcollector_db',
      user: 'qcollector',
      password: 'qcollector_dev_2025'
    });

    const result = await pool.query(\`SELECT * FROM "\${subForm.table_name}"\`);
    console.log(\`Table has \${result.rows.length} rows\`);
    if (result.rows.length > 0) console.log(JSON.stringify(result.rows[result.rows.length - 1], null, 2));
    await pool.end();

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

test();
