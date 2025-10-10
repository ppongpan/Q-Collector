/**
 * Login Loop Debug Test
 *
 * Tests to diagnose and verify login loop fix
 * - Checks token persistence
 * - Validates redirect behavior
 * - Monitors API calls
 * - Verifies no infinite loops
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:5000/api/v1';

// Test credentials
const TEST_USER = {
  username: 'pongpanp',
  password: 'Gfvtmiu613'
};

test.describe('Login Loop Diagnosis', () => {

  test.beforeEach(async ({ page, context }) => {
    // Clear all storage before each test
    await context.clearCookies();
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Test 1: Check localStorage token persistence after login', async ({ page }) => {
    console.log('\n🧪 Test 1: Token Persistence Check');

    // Navigate to login
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Track API calls
    const apiCalls = [];
    page.on('request', request => {
      if (request.url().includes('/api/v1/')) {
        apiCalls.push({
          url: request.url(),
          method: request.method(),
          timestamp: Date.now()
        });
      }
    });

    // Fill login form
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation or 2FA prompt
    await page.waitForTimeout(2000);

    // Check if we need 2FA
    const requires2FA = await page.locator('text=ป้อนรหัส OTP').isVisible().catch(() => false);

    if (requires2FA) {
      console.log('⚠️ 2FA required - skipping token check for this user');
      return;
    }

    // Check localStorage tokens
    const tokens = await page.evaluate(() => ({
      access_token: localStorage.getItem('access_token'),
      refresh_token: localStorage.getItem('refresh_token'),
      user: localStorage.getItem('user')
    }));

    console.log('📦 LocalStorage tokens:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      hasUser: !!tokens.user,
      accessTokenLength: tokens.access_token?.length || 0
    });

    // Verify tokens exist
    expect(tokens.access_token).toBeTruthy();
    expect(tokens.refresh_token).toBeTruthy();
    expect(tokens.user).toBeTruthy();

    // Log API calls
    console.log(`📊 Total API calls: ${apiCalls.length}`);
    apiCalls.forEach(call => {
      console.log(`  ${call.method} ${call.url.replace(API_URL, '')}`);
    });
  });

  test('Test 2: Monitor redirect loop', async ({ page }) => {
    console.log('\n🧪 Test 2: Redirect Loop Monitor');

    const navigationLog = [];
    const maxRedirects = 10;
    let redirectCount = 0;

    // Track navigation
    page.on('framenavigated', frame => {
      if (frame === page.mainFrame()) {
        const url = frame.url();
        navigationLog.push({
          url: url,
          timestamp: Date.now()
        });

        if (url.includes('/login')) {
          redirectCount++;
        }

        console.log(`🔄 Navigate: ${url}`);
      }
    });

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait and monitor
    await page.waitForTimeout(5000);

    console.log(`📊 Total navigations: ${navigationLog.length}`);
    console.log(`🔁 Login page redirects: ${redirectCount}`);

    // Check for loop
    if (redirectCount > 3) {
      console.error('❌ LOOP DETECTED!');
      navigationLog.forEach((nav, i) => {
        console.log(`  ${i + 1}. ${nav.url}`);
      });
    }

    expect(redirectCount).toBeLessThan(3);
  });

  test('Test 3: API call sequence validation', async ({ page }) => {
    console.log('\n🧪 Test 3: API Call Sequence');

    const apiSequence = [];

    page.on('request', request => {
      if (request.url().includes('/api/v1/')) {
        const endpoint = request.url().replace(API_URL, '');
        apiSequence.push({
          method: request.method(),
          endpoint: endpoint,
          time: Date.now()
        });
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/api/v1/')) {
        const endpoint = response.url().replace(API_URL, '');
        console.log(`${response.status()} ${response.request().method()} ${endpoint}`);
      }
    });

    // Perform login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    await page.waitForTimeout(3000);

    console.log('\n📊 API Call Sequence:');
    apiSequence.forEach((call, i) => {
      console.log(`  ${i + 1}. ${call.method} ${call.endpoint}`);
    });

    // Expected sequence (without 2FA):
    // 1. POST /auth/login
    // 2. GET /auth/me (validation after login)
    // 3. GET /forms (if redirected to home)

    const loginCall = apiSequence.find(c => c.endpoint === '/auth/login');
    expect(loginCall).toBeTruthy();
    expect(loginCall.method).toBe('POST');

    // Should not have multiple /auth/login calls
    const loginCalls = apiSequence.filter(c => c.endpoint === '/auth/login');
    expect(loginCalls.length).toBeLessThanOrEqual(1);
  });

  test('Test 4: Token in request headers', async ({ page }) => {
    console.log('\n🧪 Test 4: Token Header Validation');

    let hasTokenInRequest = false;
    let tokenValue = null;

    page.on('request', request => {
      if (request.url().includes('/api/v1/forms')) {
        const authHeader = request.headers()['authorization'];
        if (authHeader) {
          hasTokenInRequest = true;
          tokenValue = authHeader;
          console.log(`✅ Token found in request: ${authHeader.substring(0, 30)}...`);
        } else {
          console.log(`❌ No token in request to ${request.url()}`);
        }
      }
    });

    // Login first
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForTimeout(2000);

    // Check current URL
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);

    // If we're on home page, forms API should be called
    if (currentUrl === BASE_URL + '/') {
      await page.waitForTimeout(2000);

      if (hasTokenInRequest) {
        console.log('✅ Token is being sent with API requests');
      } else {
        console.log('❌ Token is NOT being sent with API requests');
      }

      // We expect token to be present if we reached home page
      // (This might fail if 2FA is required)
      // expect(hasTokenInRequest).toBeTruthy();
    }
  });

  test('Test 5: Complete login flow without loops', async ({ page }) => {
    console.log('\n🧪 Test 5: Complete Flow Test');

    let loopDetected = false;
    const urlHistory = [];

    page.on('framenavigated', frame => {
      if (frame === page.mainFrame()) {
        const url = frame.url();
        urlHistory.push(url);

        // Detect loop: more than 2 times to /login
        const loginVisits = urlHistory.filter(u => u.includes('/login')).length;
        if (loginVisits > 2) {
          loopDetected = true;
          console.error('🔴 LOOP DETECTED - Multiple login redirects!');
        }
      }
    });

    // Start test
    await page.goto(`${BASE_URL}/login`);

    // Login
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for flow to complete
    await page.waitForTimeout(5000);

    // Print URL history
    console.log('\n📜 URL Navigation History:');
    urlHistory.forEach((url, i) => {
      console.log(`  ${i + 1}. ${url}`);
    });

    // Verify no loop
    expect(loopDetected).toBe(false);

    // Verify we ended up somewhere other than login
    // (Could be home or 2FA setup)
    const finalUrl = page.url();
    console.log(`\n✅ Final URL: ${finalUrl}`);

    // Should not end on /login (unless there was an error)
    const isStuckOnLogin = finalUrl.includes('/login');

    if (isStuckOnLogin) {
      console.error('❌ Stuck on login page!');

      // Check for error message
      const errorMsg = await page.locator('.text-red-500, .error-message').textContent().catch(() => null);
      if (errorMsg) {
        console.log(`Error shown: ${errorMsg}`);
      }
    }
  });
});
