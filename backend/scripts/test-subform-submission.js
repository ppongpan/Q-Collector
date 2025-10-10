/**
 * Test Sub-Form Submission via API
 */

require('dotenv').config();
const axios = require('axios');

const API_URL = 'http://localhost:5000/api/v1';
const USERNAME = 'pongpanp';
const PASSWORD = 'Gfvtmiu613';

let accessToken = null;

async function login() {
  console.log('🔐 Logging in...\n');

  const response = await axios.post(`${API_URL}/auth/login`, {
    identifier: USERNAME,
    password: PASSWORD
  });

  accessToken = response.data.data.tokens.accessToken;
  console.log(`✅ Logged in as ${response.data.data.user.username}\n`);
  return response.data.data.user.id;
}

async function testSubFormSubmission() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       Test Sub-Form Submission via API                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Login first
    await login();

    // Get main form
    const mainFormId = '2930365a-1734-48ec-9b58-c72bd400d0be';
    const subFormId = 'a3b5824a-d954-4f4e-9eae-a71d473fd421';

    console.log(`📋 Main Form ID: ${mainFormId}`);
    console.log(`📋 Sub-Form ID: ${subFormId}\n`);

    // Get latest main form submission
    const submissionsResponse = await axios.get(
      `${API_URL}/forms/${mainFormId}/submissions`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    if (submissionsResponse.data.data.submissions.length === 0) {
      console.log('❌ No main form submissions found. Please submit main form first.\n');
      return;
    }

    const parentSubmission = submissionsResponse.data.data.submissions[0];
    console.log(`📝 Using parent submission: ${parentSubmission.id}\n`);

    // Submit sub-form data
    const subFormData = {
      parentId: parentSubmission.id,
      data: {
        '45567732-60fc-4dec-8898-ef509147f6c5': 'ทดสอบผู้ติดตาม API',
        'bfcd354e-4002-4b8b-844c-875573975996': '2025-10-07',
        'f7b2bc3d-e398-41a2-8687-b54381a9c405': 'โทรศัพท์',
        '88fe5b16-a74a-4652-980c-f6c03b0c9d54': 'กำลังติดตาม',
        '50e8e3e9-5f60-49a5-bf2c-b2b54d2b1e74': 'ทดสอบผ่าน API'
      }
    };

    console.log('📤 Submitting sub-form data...\n');
    console.log(`Endpoint: POST ${API_URL}/subforms/${subFormId}/submissions`);
    console.log(`Data: ${JSON.stringify(subFormData, null, 2)}\n`);

    const subFormResponse = await axios.post(
      `${API_URL}/subforms/${subFormId}/submissions`,
      subFormData,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    console.log('✅ Sub-form submission successful!\n');
    console.log(`Submission ID: ${subFormResponse.data.data.submission.id}\n`);

    // Verify data in database
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Checking database...\n');

    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'qcollector_db',
      user: process.env.POSTGRES_USER || 'qcollector',
      password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
    });

    const result = await pool.query(`
      SELECT COUNT(*) as count
      FROM sales_task_tracker_a71d473fd421
      WHERE parent_id = $1;
    `, [parentSubmission.id]);

    console.log(`📊 Records in sales_task_tracker_a71d473fd421 with parent_id=${parentSubmission.id}: ${result.rows[0].count}\n`);

    if (result.rows[0].count > 0) {
      const data = await pool.query(`
        SELECT *
        FROM sales_task_tracker_a71d473fd421
        WHERE parent_id = $1
        ORDER BY submitted_at DESC
        LIMIT 1;
      `, [parentSubmission.id]);

      console.log('✅ Latest record:');
      console.log(JSON.stringify(data.rows[0], null, 2));
    } else {
      console.log('❌ No records found in dynamic table!');
    }

    await pool.end();

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSubFormSubmission().catch(console.error);
