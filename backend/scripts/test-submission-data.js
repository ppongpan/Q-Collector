const axios = require('axios');

const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

async function testAPI() {
  try {
    // Login first
    const loginRes = await apiClient.post('/auth/login', {
      identifier: 'pongpanp',
      password: 'Gfvtmiu613'
    });

    const token = loginRes.data.token;
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    // Get submissions
    const subRes = await apiClient.get('/forms/573e1f37-4cc4-4f3c-b303-ab877066fdc9/submissions');

    console.log('Submissions count:', subRes.data.submissions?.length || 0);
    if (subRes.data.submissions && subRes.data.submissions.length > 0) {
      const firstSub = subRes.data.submissions[0];
      console.log('\nFirst submission:');
      console.log('  ID:', firstSub.id);
      console.log('  submittedAt:', firstSub.submittedAt);
      console.log('  data keys:', Object.keys(firstSub.data || {}));
      console.log('  data:', JSON.stringify(firstSub.data, null, 2));
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
    process.exit(1);
  }
}

testAPI();
