/**
 * Test Form Creation API Directly
 * Debug why form creation is failing in Playwright tests
 */

const axios = require('axios');

const API_URL = 'http://localhost:5000/api/v1';

async function testFormCreation() {
  console.log('🧪 Testing Form Creation API...\n');

  try {
    // Step 1: Login first
    console.log('🔐 Step 1: Logging in...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      identifier: 'testadmin',
      password: 'TestAdmin123!'
    });

    const accessToken = loginResponse.data.data?.tokens?.accessToken;
    console.log(`✅ Login successful, token: ${accessToken.substring(0, 30)}...\n`);

    // Step 2: Create form with proper structure
    console.log('📝 Step 2: Creating form...');
    const formData = {
      title: `API Test Form ${Date.now()}`,
      description: 'Test form created via API',
      fields: [
        {
          id: 'field1',
          type: 'short_answer',
          title: 'ชื่อ-นามสกุล',
          required: true
        },
        {
          id: 'field2',
          type: 'email',
          title: 'อีเมล',
          required: true
        },
        {
          id: 'field3',
          type: 'phone',
          title: 'เบอร์โทร',
          required: false
        }
      ]
    };

    console.log('📦 Request payload:');
    console.log(JSON.stringify(formData, null, 2));

    const formResponse = await axios.post(`${API_URL}/forms`, formData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('\n✅ Form Creation Success!');
    console.log('Status:', formResponse.status);
    console.log('\n📦 Response Data:');
    console.log(JSON.stringify(formResponse.data, null, 2));

    const formId = formResponse.data.form?.id || formResponse.data.data?.form?.id;
    const tableName = formResponse.data.form?.tableName || formResponse.data.data?.form?.tableName;

    console.log('\n✅ Form created successfully!');
    console.log(`  - Form ID: ${formId}`);
    console.log(`  - Table Name: ${tableName || 'N/A'}`);

    return true;

  } catch (error) {
    console.log('\n❌ Form Creation Failed!');
    console.log('Status:', error.response?.status || 'NO_RESPONSE');
    console.log('Error Data:', JSON.stringify(error.response?.data || error.message, null, 2));

    if (error.response?.data?.error) {
      console.log('\n🔍 Error Details:');
      console.log('- Code:', error.response.data.error.code);
      console.log('- Message:', error.response.data.error.message);
      if (error.response.data.error.details) {
        console.log('- Details:', JSON.stringify(error.response.data.error.details, null, 2));
      }
    }

    return false;
  }
}

// Run test
testFormCreation().then(success => {
  console.log('\n' + '='.repeat(60));
  if (success) {
    console.log('✅ TEST PASSED: Form creation working correctly!');
  } else {
    console.log('❌ TEST FAILED: Form creation has issues');
  }
  console.log('='.repeat(60));
  process.exit(success ? 0 : 1);
});
