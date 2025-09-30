/**
 * Manual API Test Script
 * Test all implemented endpoints with demo users
 *
 * Run with: node backend/tests/manual/test-api.js
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api/v1';
const TEST_USER = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'TestPass123',
  full_name: 'Test User',
};

let authToken = '';
let refreshToken = '';
let userId = '';
let formId = '';
let submissionId = '';
let fileId = '';

// Helper function for API calls
async function apiCall(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {},
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (data) {
      if (method === 'get') {
        config.params = data;
      } else {
        config.data = data;
      }
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status,
    };
  }
}

// Test functions
async function testHealthCheck() {
  console.log('\n=== Testing Health Check ===');
  const result = await apiCall('get', '/../health');
  console.log('Health:', result.success ? 'OK' : 'FAIL');
  if (!result.success) console.error('Error:', result.error);
  return result.success;
}

async function testRegistration() {
  console.log('\n=== Testing User Registration ===');
  const result = await apiCall('post', '/auth/register', TEST_USER);

  if (result.success) {
    authToken = result.data.data.tokens.accessToken;
    refreshToken = result.data.data.tokens.refreshToken;
    userId = result.data.data.user.id;
    console.log('Registration: SUCCESS');
    console.log('User ID:', userId);
  } else {
    console.log('Registration: FAILED');
    console.error('Error:', result.error);
  }

  return result.success;
}

async function testLogin() {
  console.log('\n=== Testing User Login ===');
  const result = await apiCall('post', '/auth/login', {
    identifier: TEST_USER.email,
    password: TEST_USER.password,
  });

  if (result.success) {
    authToken = result.data.data.tokens.accessToken;
    console.log('Login: SUCCESS');
  } else {
    console.log('Login: FAILED');
    console.error('Error:', result.error);
  }

  return result.success;
}

async function testGetCurrentUser() {
  console.log('\n=== Testing Get Current User ===');
  const result = await apiCall('get', '/auth/me', null, authToken);

  if (result.success) {
    console.log('Get User: SUCCESS');
    console.log('User:', result.data.data.user.username);
  } else {
    console.log('Get User: FAILED');
    console.error('Error:', result.error);
  }

  return result.success;
}

async function testCreateForm() {
  console.log('\n=== Testing Create Form ===');
  const formData = {
    title: 'Test Survey Form',
    description: 'A test form for API testing',
    roles_allowed: ['user', 'manager'],
    fields: [
      {
        type: 'short_answer',
        title: 'Name',
        placeholder: 'Enter your name',
        required: true,
        order: 0,
      },
      {
        type: 'email',
        title: 'Email',
        placeholder: 'Enter your email',
        required: true,
        order: 1,
      },
      {
        type: 'multiple_choice',
        title: 'Favorite Color',
        options: {
          choices: ['Red', 'Blue', 'Green'],
        },
        required: false,
        order: 2,
      },
    ],
  };

  const result = await apiCall('post', '/forms', formData, authToken);

  if (result.success) {
    formId = result.data.data.form.id;
    console.log('Create Form: SUCCESS');
    console.log('Form ID:', formId);
  } else {
    console.log('Create Form: FAILED');
    console.error('Error:', result.error);
  }

  return result.success;
}

async function testListForms() {
  console.log('\n=== Testing List Forms ===');
  const result = await apiCall('get', '/forms', { limit: 10 }, authToken);

  if (result.success) {
    console.log('List Forms: SUCCESS');
    console.log('Total Forms:', result.data.data.pagination.total);
  } else {
    console.log('List Forms: FAILED');
    console.error('Error:', result.error);
  }

  return result.success;
}

async function testGetForm() {
  console.log('\n=== Testing Get Form ===');
  const result = await apiCall('get', `/forms/${formId}`, null, authToken);

  if (result.success) {
    console.log('Get Form: SUCCESS');
    console.log('Form Title:', result.data.data.form.title);
    console.log('Fields:', result.data.data.form.fields.length);
  } else {
    console.log('Get Form: FAILED');
    console.error('Error:', result.error);
  }

  return result.success;
}

async function testCreateSubmission() {
  console.log('\n=== Testing Create Submission ===');

  // First, get form to get field IDs
  const formResult = await apiCall('get', `/forms/${formId}`, null, authToken);
  if (!formResult.success) {
    console.log('Cannot get form fields');
    return false;
  }

  const fields = formResult.data.data.form.fields;
  const fieldData = {};

  // Fill in test data for each field
  fields.forEach((field) => {
    if (field.type === 'short_answer') {
      fieldData[field.id] = 'John Doe';
    } else if (field.type === 'email') {
      fieldData[field.id] = 'john@example.com';
    } else if (field.type === 'multiple_choice') {
      fieldData[field.id] = 'Blue';
    }
  });

  const submissionData = {
    fieldData,
    status: 'submitted',
  };

  const result = await apiCall('post', `/forms/${formId}/submissions`, submissionData, authToken);

  if (result.success) {
    submissionId = result.data.data.submission.id;
    console.log('Create Submission: SUCCESS');
    console.log('Submission ID:', submissionId);
  } else {
    console.log('Create Submission: FAILED');
    console.error('Error:', result.error);
  }

  return result.success;
}

async function testListSubmissions() {
  console.log('\n=== Testing List Submissions ===');
  const result = await apiCall('get', `/forms/${formId}/submissions`, null, authToken);

  if (result.success) {
    console.log('List Submissions: SUCCESS');
    console.log('Total Submissions:', result.data.data.pagination.total);
  } else {
    console.log('List Submissions: FAILED');
    console.error('Error:', result.error);
  }

  return result.success;
}

async function testGetSubmission() {
  console.log('\n=== Testing Get Submission ===');
  const result = await apiCall('get', `/submissions/${submissionId}`, null, authToken);

  if (result.success) {
    console.log('Get Submission: SUCCESS');
    console.log('Status:', result.data.data.submission.status);
    console.log('Data fields:', Object.keys(result.data.data.submission.data).length);
  } else {
    console.log('Get Submission: FAILED');
    console.error('Error:', result.error);
  }

  return result.success;
}

async function testTokenRefresh() {
  console.log('\n=== Testing Token Refresh ===');
  const result = await apiCall('post', '/auth/refresh', { refreshToken });

  if (result.success) {
    authToken = result.data.data.tokens.accessToken;
    console.log('Token Refresh: SUCCESS');
  } else {
    console.log('Token Refresh: FAILED');
    console.error('Error:', result.error);
  }

  return result.success;
}

async function testLogout() {
  console.log('\n=== Testing User Logout ===');
  const result = await apiCall('post', '/auth/logout', null, authToken);

  if (result.success) {
    console.log('Logout: SUCCESS');
  } else {
    console.log('Logout: FAILED');
    console.error('Error:', result.error);
  }

  return result.success;
}

// Run all tests
async function runTests() {
  console.log('='.repeat(50));
  console.log('Q-COLLECTOR API MANUAL TESTS');
  console.log('='.repeat(50));
  console.log(`Testing API at: ${API_BASE_URL}`);

  const results = [];

  // Run tests in sequence
  results.push(await testHealthCheck());
  results.push(await testRegistration());
  results.push(await testGetCurrentUser());
  results.push(await testCreateForm());
  results.push(await testListForms());
  results.push(await testGetForm());
  results.push(await testCreateSubmission());
  results.push(await testListSubmissions());
  results.push(await testGetSubmission());
  results.push(await testTokenRefresh());
  results.push(await testLogout());

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('TEST SUMMARY');
  console.log('='.repeat(50));
  const passed = results.filter(r => r).length;
  const failed = results.filter(r => !r).length;
  console.log(`Passed: ${passed}/${results.length}`);
  console.log(`Failed: ${failed}/${results.length}`);
  console.log('='.repeat(50));
}

// Run the tests
runTests().catch((error) => {
  console.error('Test execution failed:', error);
  process.exit(1);
});