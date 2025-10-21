/**
 * Test Script for Notification API Endpoints
 * Q-Collector v0.8.0 - Phase 7 Testing
 *
 * Prerequisites:
 * - Backend server running on http://localhost:5000
 * - Valid user credentials (username: pongpanp, password: Gfvtmiu613)
 * - Database with notification_rules and notification_history tables
 *
 * Usage:
 *   node backend/test-notification-api.js
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api/v1';
let authToken = null;
let testRuleId = null;

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
};

/**
 * Test 1: Authentication
 */
async function testAuth() {
  console.log('\n📝 Test 1: Authentication');
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      identifier: 'pongpanp',
      password: 'Gfvtmiu613',
    });

    authToken = response.data.token;
    log.success(`Authenticated as ${response.data.user.username}`);
    log.info(`Role: ${response.data.user.role}`);
    return true;
  } catch (error) {
    log.error(`Authentication failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

/**
 * Test 2: List Notification Rules
 */
async function testListRules() {
  console.log('\n📝 Test 2: List Notification Rules');
  try {
    const response = await axios.get(`${API_BASE}/notifications/rules`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { page: 1, limit: 10 },
    });

    log.success(`Found ${response.data.total} rules`);
    if (response.data.rules.length > 0) {
      testRuleId = response.data.rules[0].id;
      log.info(`Using test rule ID: ${testRuleId}`);
    }
    return true;
  } catch (error) {
    log.error(`List rules failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

/**
 * Test 3: Create Notification Rule
 */
async function testCreateRule() {
  console.log('\n📝 Test 3: Create Notification Rule');
  try {
    const response = await axios.post(
      `${API_BASE}/notifications/rules`,
      {
        name: 'Test Rule - API Test',
        description: 'Created by test script',
        triggerType: 'field_update',
        conditionFormula: '[สถานะ] = "ทดสอบ"',
        messageTemplate: '🧪 Test notification: {สถานะ}',
        isEnabled: false,
        sendOnce: true,
        priority: 'medium',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    testRuleId = response.data.rule.id;
    log.success(`Rule created: ${testRuleId}`);
    log.info(`Name: ${response.data.rule.name}`);
    return true;
  } catch (error) {
    log.error(`Create rule failed: ${error.response?.data?.error?.message || error.message}`);
    if (error.response?.data?.error?.details) {
      console.log('Validation errors:', error.response.data.error.details);
    }
    return false;
  }
}

/**
 * Test 4: Get Notification Rule
 */
async function testGetRule() {
  console.log('\n📝 Test 4: Get Notification Rule');
  if (!testRuleId) {
    log.warn('No test rule ID, skipping');
    return true;
  }

  try {
    const response = await axios.get(`${API_BASE}/notifications/rules/${testRuleId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    log.success(`Retrieved rule: ${response.data.rule.name}`);
    log.info(`Trigger type: ${response.data.rule.trigger_type}`);
    log.info(`Enabled: ${response.data.rule.is_enabled}`);
    return true;
  } catch (error) {
    log.error(`Get rule failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

/**
 * Test 5: Update Notification Rule
 */
async function testUpdateRule() {
  console.log('\n📝 Test 5: Update Notification Rule');
  if (!testRuleId) {
    log.warn('No test rule ID, skipping');
    return true;
  }

  try {
    const response = await axios.patch(
      `${API_BASE}/notifications/rules/${testRuleId}`,
      {
        description: 'Updated by test script',
        priority: 'high',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    log.success(`Rule updated: ${response.data.rule.name}`);
    log.info(`New priority: ${response.data.rule.priority}`);
    return true;
  } catch (error) {
    log.error(`Update rule failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

/**
 * Test 6: Test Notification Rule
 */
async function testTestRule() {
  console.log('\n📝 Test 6: Test Notification Rule (Dry Run)');
  if (!testRuleId) {
    log.warn('No test rule ID, skipping');
    return true;
  }

  try {
    const response = await axios.post(
      `${API_BASE}/notifications/rules/${testRuleId}/test`,
      {
        testData: {
          สถานะ: 'ทดสอบ',
          ชื่อลูกค้า: 'Test Customer',
          ยอดขาย: 99999,
        },
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    log.success(`Test completed`);
    log.info(`Condition met: ${response.data.result.conditionMet}`);
    log.info(`Would send: ${response.data.result.wouldSend}`);
    return true;
  } catch (error) {
    log.error(`Test rule failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

/**
 * Test 7: Get Rule Statistics
 */
async function testGetStats() {
  console.log('\n📝 Test 7: Get Rule Statistics');
  if (!testRuleId) {
    log.warn('No test rule ID, skipping');
    return true;
  }

  try {
    const response = await axios.get(`${API_BASE}/notifications/rules/${testRuleId}/stats`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    log.success(`Retrieved statistics`);
    log.info(`Total sent: ${response.data.stats.sent}`);
    log.info(`Total failed: ${response.data.stats.failed}`);
    log.info(`Success rate: ${response.data.stats.successRate}%`);
    return true;
  } catch (error) {
    log.error(`Get stats failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

/**
 * Test 8: Get Notification History
 */
async function testGetHistory() {
  console.log('\n📝 Test 8: Get Notification History');
  try {
    const response = await axios.get(`${API_BASE}/notifications/history`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { page: 1, limit: 5 },
    });

    log.success(`Found ${response.data.total} history records`);
    return true;
  } catch (error) {
    log.error(`Get history failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

/**
 * Test 9: Get Queue Statistics
 */
async function testGetQueueStats() {
  console.log('\n📝 Test 9: Get Queue Statistics');
  try {
    const response = await axios.get(`${API_BASE}/notifications/queue/stats`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    log.success(`Retrieved queue statistics`);
    log.info(`Waiting: ${response.data.stats.waiting}`);
    log.info(`Active: ${response.data.stats.active}`);
    log.info(`Completed: ${response.data.stats.completed}`);
    log.info(`Failed: ${response.data.stats.failed}`);
    return true;
  } catch (error) {
    log.error(`Get queue stats failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

/**
 * Test 10: Delete Notification Rule
 */
async function testDeleteRule() {
  console.log('\n📝 Test 10: Delete Notification Rule');
  if (!testRuleId) {
    log.warn('No test rule ID, skipping');
    return true;
  }

  try {
    const response = await axios.delete(`${API_BASE}/notifications/rules/${testRuleId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    log.success(`Rule deleted successfully`);
    return true;
  } catch (error) {
    log.error(`Delete rule failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🧪 Testing Notification API Endpoints');
  console.log('=====================================\n');

  const results = {
    passed: 0,
    failed: 0,
  };

  const tests = [
    { name: 'Authentication', fn: testAuth },
    { name: 'List Rules', fn: testListRules },
    { name: 'Create Rule', fn: testCreateRule },
    { name: 'Get Rule', fn: testGetRule },
    { name: 'Update Rule', fn: testUpdateRule },
    { name: 'Test Rule', fn: testTestRule },
    { name: 'Get Stats', fn: testGetStats },
    { name: 'Get History', fn: testGetHistory },
    { name: 'Get Queue Stats', fn: testGetQueueStats },
    { name: 'Delete Rule', fn: testDeleteRule },
  ];

  for (const test of tests) {
    const success = await test.fn();
    if (success) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  console.log('\n=====================================');
  console.log('📊 Test Summary');
  console.log('=====================================');
  log.success(`Passed: ${results.passed}/${tests.length}`);
  if (results.failed > 0) {
    log.error(`Failed: ${results.failed}/${tests.length}`);
  }
  console.log('');

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
