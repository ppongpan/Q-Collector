/**
 * Public Link Integration Test Script
 *
 * This script tests the frontend-backend integration for Public Link functionality
 * Run in browser console after logging in as admin
 *
 * Usage:
 * 1. Open browser console on http://localhost:3000
 * 2. Copy and paste this entire script
 * 3. Run: await testPublicLinkIntegration('your-form-uuid-here')
 */

async function testPublicLinkIntegration(formId) {
  console.log('🧪 Starting Public Link Integration Tests...\n');

  // Import ApiClient
  const apiClient = (await import('/src/services/ApiClient.js')).default;

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  /**
   * Test helper
   */
  function recordTest(name, passed, message) {
    results.tests.push({ name, passed, message });
    if (passed) {
      results.passed++;
      console.log(`✅ ${name}: ${message}`);
    } else {
      results.failed++;
      console.error(`❌ ${name}: ${message}`);
    }
  }

  try {
    // Test 1: Update Public Link Settings
    console.log('\n📝 Test 1: Update Public Link Settings');
    try {
      const testSettings = {
        enabled: true,
        slug: 'test-form-' + Date.now(),
        token: 'test-token-' + Math.random().toString(36).substring(7),
        expiresAt: null,
        maxSubmissions: null,
        banner: null
      };

      const response = await apiClient.updatePublicLink(formId, testSettings);

      if (response.success && response.data.form) {
        recordTest(
          'Update Public Link',
          true,
          `Settings updated successfully. Slug: ${testSettings.slug}`
        );
      } else {
        recordTest(
          'Update Public Link',
          false,
          'Response missing expected fields'
        );
      }
    } catch (error) {
      recordTest(
        'Update Public Link',
        false,
        `API Error: ${error.message || error}`
      );
    }

    // Test 2: Enable Public Link
    console.log('\n📝 Test 2: Enable Public Link');
    try {
      const response = await apiClient.enablePublicLink(formId, {
        slug: 'enabled-test-' + Date.now()
      });

      if (response.success) {
        recordTest(
          'Enable Public Link',
          true,
          'Public link enabled successfully'
        );
      } else {
        recordTest(
          'Enable Public Link',
          false,
          'Response success flag is false'
        );
      }
    } catch (error) {
      recordTest(
        'Enable Public Link',
        false,
        `API Error: ${error.message || error}`
      );
    }

    // Test 3: Regenerate Token
    console.log('\n📝 Test 3: Regenerate Token');
    try {
      const response = await apiClient.regeneratePublicToken(formId);

      if (response.success && response.data.form) {
        recordTest(
          'Regenerate Token',
          true,
          'Token regenerated successfully'
        );
      } else {
        recordTest(
          'Regenerate Token',
          false,
          'Response missing expected fields'
        );
      }
    } catch (error) {
      recordTest(
        'Regenerate Token',
        false,
        `API Error: ${error.message || error}`
      );
    }

    // Test 4: Disable Public Link
    console.log('\n📝 Test 4: Disable Public Link');
    try {
      const response = await apiClient.disablePublicLink(formId);

      if (response.success) {
        recordTest(
          'Disable Public Link',
          true,
          'Public link disabled successfully'
        );
      } else {
        recordTest(
          'Disable Public Link',
          false,
          'Response success flag is false'
        );
      }
    } catch (error) {
      recordTest(
        'Disable Public Link',
        false,
        `API Error: ${error.message || error}`
      );
    }

  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Total:  ${results.tests.length}`);
  console.log('='.repeat(60));

  // Print detailed results
  console.log('\n📋 Detailed Results:');
  results.tests.forEach((test, index) => {
    console.log(`${index + 1}. ${test.passed ? '✅' : '❌'} ${test.name}: ${test.message}`);
  });

  return results;
}

// Instructions
console.log(`
🧪 Public Link Integration Test Script Loaded!

Usage:
  await testPublicLinkIntegration('your-form-uuid-here')

Example:
  await testPublicLinkIntegration('a1b2c3d4-e5f6-7890-abcd-ef1234567890')

Note: You must be logged in as admin/super_admin to run these tests.
`);

// Export for use
window.testPublicLinkIntegration = testPublicLinkIntegration;
