/**
 * Test Form Submission E2E
 * Simulates form creation and submission to test for validation errors
 */

const axios = require('axios');

const API_URL = 'http://localhost:5000/api/v1';
const TEST_USER = {
  identifier: 'pongpanp',
  password: 'Gfvtmiu613'
};

let authToken = null;
let userId = null;

async function login() {
  console.log('🔐 Logging in...');
  try {
    const response = await axios.post(`${API_URL}/auth/login`, TEST_USER);
    console.log('   Response structure:', JSON.stringify(response.data, null, 2));

    // Handle both possible response structures
    if (response.data.data) {
      authToken = response.data.data.accessToken || response.data.data.tokens?.accessToken;
      userId = response.data.data.user?.id || response.data.data.userId;
    } else {
      authToken = response.data.accessToken || response.data.tokens?.accessToken;
      userId = response.data.user?.id || response.data.userId;
    }

    console.log(`✅ Login successful! User ID: ${userId}`);
    if (authToken) {
      console.log(`   Token: ${authToken.substring(0, 20)}...`);
    } else {
      console.error('   ⚠️  Warning: No access token received!');
    }
    return !!authToken;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function createTestForm() {
  console.log('\n📝 Creating test form...');
  try {
    const formData = {
      title: 'Test Form - E2E Submission',
      description: 'Form created for testing submission validation',
      roles_allowed: ['general_user', 'admin'],
      is_active: true, // Activate form immediately
      settings: {
        allow_multiple: true,
        require_login: true
      },
      fields: [
        {
          type: 'short_answer',
          title: 'ชื่อเต็ม',
          required: true,
          order: 0,
          settings: {}
        },
        {
          type: 'email',
          title: 'อีเมล',
          required: true,
          order: 1,
          settings: {}
        },
        {
          type: 'phone',
          title: 'เบอร์โทรศัพท์',
          required: false,
          order: 2,
          settings: {}
        }
      ]
    };

    const response = await axios.post(
      `${API_URL}/forms`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const form = response.data.data.form;
    console.log(`✅ Form created successfully!`);
    console.log(`   Form ID: ${form.id}`);
    console.log(`   Title: ${form.title}`);
    console.log(`   Table: ${form.table_name}`);
    console.log(`   Fields: ${form.fields.length}`);
    return form;
  } catch (error) {
    console.error('❌ Form creation failed:');
    if (error.response?.data) {
      console.error('   Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   Error:', error.message);
    }
    return null;
  }
}

async function submitToForm(formId) {
  console.log(`\n📤 Submitting data to form ${formId}...`);
  try {
    const submissionData = {
      fieldData: {
        'field_0': 'ทดสอบ นามสกุล',
        'field_1': 'test@example.com',
        'field_2': '0812345678'
      },
      status: 'submitted'
    };

    console.log('   Submission data:', JSON.stringify(submissionData, null, 2));

    const response = await axios.post(
      `${API_URL}/forms/${formId}/submissions`,
      submissionData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const submission = response.data.data.submission;
    console.log(`✅ Submission successful!`);
    console.log(`   Submission ID: ${submission.id}`);
    console.log(`   Status: ${submission.status}`);
    console.log(`   Submission Number: ${submission.submission_number}`);
    return submission;
  } catch (error) {
    console.error('❌ Submission failed:');
    console.error(`   Status: ${error.response?.status || 'Unknown'}`);
    if (error.response?.data) {
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   Error:', error.message);
    }
    return null;
  }
}

async function runTest() {
  console.log('═'.repeat(80));
  console.log('Q-COLLECTOR E2E FORM SUBMISSION TEST');
  console.log('═'.repeat(80));

  // Step 1: Login
  const loggedIn = await login();
  if (!loggedIn) {
    console.error('\n❌ Test failed at login step');
    process.exit(1);
  }

  // Step 2: Create form
  const form = await createTestForm();
  if (!form) {
    console.error('\n❌ Test failed at form creation step');
    process.exit(1);
  }

  // Step 3: Submit to form
  const submission = await submitToForm(form.id);
  if (!submission) {
    console.error('\n❌ Test failed at submission step');
    console.error('\n⚠️  This is the 400 validation error we were investigating!');
    console.error('    Check backend logs for detailed error information.');
    process.exit(1);
  }

  // Success
  console.log('\n═'.repeat(80));
  console.log('✅ ALL TESTS PASSED!');
  console.log('═'.repeat(80));
  console.log('Form creation and submission work correctly.');
  console.log('No validation errors detected.');
  console.log('═'.repeat(80));
}

// Run the test
runTest().catch((error) => {
  console.error('\n❌ Test failed with exception:', error.message);
  process.exit(1);
});
