/**
 * Simple Login Test - No global setup
 * Tests the basic login flow to verify the token fix
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  username: 'pongpanp',
  password: 'Gfvtmiu613'
};

test.describe('Simple Login Test', () => {

  test.beforeEach(async ({ page, context }) => {
    // Clear all storage before test
    await context.clearCookies();
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Login should work without loop - Check API Request Headers', async ({ page }) => {
    console.log('\n🧪 Starting Simple Login Test');

    // Track API requests
    const apiRequests = [];
    page.on('request', request => {
      if (request.url().includes('/api/v1/')) {
        const authHeader = request.headers()['authorization'];
        apiRequests.push({
          url: request.url(),
          method: request.method(),
          hasAuth: !!authHeader,
          authHeader: authHeader ? authHeader.substring(0, 30) + '...' : null
        });
      }
    });

    // Track navigation
    const navigationLog = [];
    page.on('framenavigated', frame => {
      if (frame === page.mainFrame()) {
        navigationLog.push(frame.url());
        console.log(`📍 Navigate: ${frame.url()}`);
      }
    });

    // Go to login page
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Fill login form
    console.log('🔐 Filling login form...');
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);

    // Submit login
    console.log('✅ Submitting login...');
    await page.click('button[type="submit"]');

    // Wait for response
    await page.waitForTimeout(5000);

    // Log API requests
    console.log('\n📊 API Request Log:');
    apiRequests.forEach((req, i) => {
      const endpoint = req.url.replace('http://localhost:5000/api/v1', '');
      console.log(`  ${i + 1}. ${req.method} ${endpoint}`);
      console.log(`     hasAuth: ${req.hasAuth}, authHeader: ${req.authHeader}`);
    });

    // Log navigation
    console.log('\n📜 Navigation Log:');
    navigationLog.forEach((url, i) => {
      console.log(`  ${i + 1}. ${url}`);
    });

    // Count login page visits
    const loginPageVisits = navigationLog.filter(url => url.includes('/login')).length;
    console.log(`\n🔢 Login page visits: ${loginPageVisits}`);

    // Check if login request has NO auth header
    const loginRequest = apiRequests.find(req => req.url.includes('/auth/login'));
    if (loginRequest) {
      console.log(`\n✅ Login request found:`);
      console.log(`   hasAuth: ${loginRequest.hasAuth} (should be false)`);
      expect(loginRequest.hasAuth).toBe(false);
    } else {
      console.log('\n❌ Login request NOT found!');
    }

    // Check if we navigated away from login
    const currentUrl = page.url();
    console.log(`\n📍 Final URL: ${currentUrl}`);

    // Should not be stuck on login page (unless 2FA is required)
    if (currentUrl.includes('/login')) {
      console.log('⚠️ Still on login page - check for errors');

      // Check for error message
      const errorMsg = await page.locator('.text-red-500').textContent().catch(() => null);
      if (errorMsg) {
        console.log(`❌ Error: ${errorMsg}`);
      }
    }

    // Verify no excessive redirects
    expect(loginPageVisits).toBeLessThan(3);
  });
});
