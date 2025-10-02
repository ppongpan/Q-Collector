/**
 * Test User Login without 2FA
 *
 * Tests that users without 2FA enabled can login successfully
 *
 * @version 0.7.0
 * @since 2025-10-02
 */

const axios = require('axios');

const API_URL = 'http://localhost:5000/api/v1';

console.log('='.repeat(80));
console.log('TEST USER LOGIN WITHOUT 2FA');
console.log('='.repeat(80));
console.log('');

/**
 * Test 1: Register new user
 */
async function testRegister() {
  console.log('TEST 1: REGISTER NEW USER');
  console.log('-'.repeat(80));
  console.log('');

  const timestamp = Date.now();
  const userData = {
    username: `testuser${timestamp}`,  // No underscore - backend requires alphanumeric
    email: `testuser${timestamp}@example.com`,
    password: 'TestPassword123',
    full_name: 'Test User',
    role: 'general_user'
  };

  console.log('Registering user:', {
    username: userData.username,
    email: userData.email,
    role: userData.role
  });

  try {
    const response = await axios.post(`${API_URL}/auth/register`, userData);

    console.log('✓ Registration successful');
    console.log('Response structure:', {
      success: response.data.success,
      hasUser: !!response.data.data?.user,
      hasTokens: !!response.data.data?.tokens,
      userId: response.data.data?.user?.id,
      username: response.data.data?.user?.username,
      role: response.data.data?.user?.role
    });
    console.log('');

    return {
      username: userData.username,
      password: userData.password,
      userId: response.data.data?.user?.id
    };
  } catch (error) {
    console.error('✗ Registration failed');
    console.error('Error:', error.response?.data || error.message);
    if (error.response?.data?.error?.details) {
      console.error('Validation details:', JSON.stringify(error.response.data.error.details, null, 2));
    }
    console.error('');
    throw error;
  }
}

/**
 * Test 2: Login without 2FA
 */
async function testLogin(credentials) {
  console.log('TEST 2: LOGIN WITHOUT 2FA');
  console.log('-'.repeat(80));
  console.log('');

  console.log('Logging in:', { username: credentials.username });

  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      identifier: credentials.username,
      password: credentials.password
    });

    console.log('✓ Login successful');
    console.log('Response structure:', {
      success: response.data.success,
      requires2FA: response.data.requires2FA || false,
      hasUser: !!response.data.data?.user,
      hasTokens: !!response.data.data?.tokens,
      username: response.data.data?.user?.username,
      twoFactorEnabled: response.data.data?.user?.twoFactorEnabled
    });
    console.log('');

    if (response.data.requires2FA) {
      console.log('✗ UNEXPECTED: 2FA required for new user');
      return false;
    }

    if (!response.data.data?.user) {
      console.log('✗ UNEXPECTED: No user data in response');
      return false;
    }

    if (!response.data.data?.tokens) {
      console.log('✗ UNEXPECTED: No tokens in response');
      return false;
    }

    console.log('✓ All checks passed - user can login without 2FA');
    return true;
  } catch (error) {
    console.error('✗ Login failed');
    console.error('Error:', error.response?.data || error.message);
    console.error('');
    return false;
  }
}

/**
 * Test 3: Check user 2FA status via admin endpoint
 */
async function checkUserStatus(userId, adminToken) {
  console.log('TEST 3: CHECK USER 2FA STATUS');
  console.log('-'.repeat(80));
  console.log('');

  try {
    const response = await axios.get(`${API_URL}/admin/users/2fa-status`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const user = response.data.data?.users?.find(u => u.id === userId);

    if (user) {
      console.log('✓ User found in database');
      console.log('User details:', {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
        isActive: user.isActive
      });
      console.log('');
      return user;
    } else {
      console.log('✗ User not found in database');
      return null;
    }
  } catch (error) {
    console.log('Note: Admin endpoint not accessible (requires super admin)');
    console.log('Skipping status check');
    console.log('');
    return null;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    // Test 1: Register
    const credentials = await testRegister();

    // Test 2: Login
    const loginSuccess = await testLogin(credentials);

    // Summary
    console.log('='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));
    console.log('');
    console.log('Registration:', '✓ PASSED');
    console.log('Login without 2FA:', loginSuccess ? '✓ PASSED' : '✗ FAILED');
    console.log('');

    if (loginSuccess) {
      console.log('✓ ALL TESTS PASSED');
      console.log('');
      console.log('Conclusion:');
      console.log('- New users can register successfully');
      console.log('- Users without 2FA enabled can login normally');
      console.log('- Response structure is correct');
      console.log('');
    } else {
      console.log('✗ SOME TESTS FAILED');
      console.log('');
      console.log('Please check:');
      console.log('- Backend response structure');
      console.log('- User model 2FA defaults');
      console.log('- Login endpoint logic');
      console.log('');
    }

    process.exit(loginSuccess ? 0 : 1);
  } catch (error) {
    console.error('');
    console.error('='.repeat(80));
    console.error('TEST SUITE FAILED');
    console.error('='.repeat(80));
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    process.exit(1);
  }
}

// Check if backend is running
async function checkBackend() {
  try {
    await axios.get(`${API_URL}/health`);
    return true;
  } catch (error) {
    console.error('✗ Backend is not running at', API_URL);
    console.error('Please start the backend server first:');
    console.error('  cd backend && npm start');
    console.error('');
    return false;
  }
}

// Main
(async () => {
  const backendRunning = await checkBackend();
  if (!backendRunning) {
    process.exit(1);
  }

  await runTests();
})();
