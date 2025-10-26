/**
 * Test Login API Directly
 * Quick script to test login endpoint and see actual response
 */

const axios = require('axios');

const API_URL = 'http://localhost:5000/api/v1';

async function testLogin() {
  console.log('🔐 Testing Login API...\n');

  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      identifier: 'testadmin',
      password: 'TestAdmin123!'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Login Success!');
    console.log('Status:', response.status);
    console.log('\n📦 Full Response Data:');
    console.log(JSON.stringify(response.data, null, 2));

    console.log('\n🔍 Token Structure:');
    console.log('- Has success:', !!response.data.success);
    console.log('- Has data:', !!response.data.data);
    console.log('- Has tokens:', !!response.data.data?.tokens);
    console.log('- AccessToken:', response.data.data?.tokens?.accessToken ?
      response.data.data.tokens.accessToken.substring(0, 30) + '...' : 'MISSING');
    console.log('- RefreshToken:', response.data.data?.tokens?.refreshToken ?
      response.data.data.tokens.refreshToken.substring(0, 30) + '...' : 'MISSING');

    console.log('\n✅ Response format correct!');
    return true;

  } catch (error) {
    console.log('❌ Login Failed!');
    console.log('Status:', error.response?.status || 'NO_RESPONSE');
    console.log('Error Data:', JSON.stringify(error.response?.data || error.message, null, 2));

    if (error.response?.data) {
      console.log('\n🔍 Error Details:');
      console.log('- Code:', error.response.data.error?.code);
      console.log('- Message:', error.response.data.error?.message);
      console.log('- Errors:', error.response.data.error?.errors);
    }

    return false;
  }
}

// Run test
testLogin().then(success => {
  process.exit(success ? 0 : 1);
});
