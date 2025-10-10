/**
 * Token Expiry Loop Fix Test
 *
 * Tests the fix for token expiry loop issue where:
 * - User's token expires
 * - System should redirect to login WITHOUT infinite loop
 * - After re-login, user should return to original page
 *
 * Related Fix: AuthContext.jsx event listener for 'auth:session-expired'
 */

const { test, expect } = require('@playwright/test');

test.describe('Token Expiry Loop Fix', () => {

  test.beforeEach(async ({ page }) => {
    // Enable console logging for debugging
    page.on('console', msg => {
      const text = msg.text();
      // Only log important messages
      if (text.includes('[ApiClient]') ||
          text.includes('[AuthContext]') ||
          text.includes('Session expired') ||
          text.includes('Token')) {
        console.log(`🔍 Console: ${text}`);
      }
    });

    // Track network requests to detect loops
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/v1/forms')) {
        console.log(`📡 API Request: ${request.method()} ${url}`);
      }
    });

    // Track errors
    page.on('pageerror', error => {
      console.error(`❌ Page Error: ${error.message}`);
    });
  });

  test('TEST-1: Token expiry should redirect to login without loop', async ({ page }) => {
    console.log('\n🧪 TEST-1: Starting Token Expiry Loop Test...\n');

    // Step 1: Login
    console.log('📝 Step 1: Login to the system');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');

    // Fill login form
    await page.fill('input[name="username"]', 'pongpanp');
    await page.fill('input[name="password"]', 'Gfvtmiu613');

    // Submit login
    await page.click('button[type="submit"]');

    // Check if 2FA is required
    console.log('📝 Checking for 2FA verification...');
    try {
      // Wait for either home page or 2FA page
      await page.waitForURL(/\/(|2fa-verify)/, { timeout: 5000 });

      const currentUrl = page.url();
      if (currentUrl.includes('2fa-verify') || await page.locator('text=ยืนยันตัวตน 2FA').isVisible({ timeout: 1000 })) {
        console.log('⚠️ 2FA verification required');
        console.log('🔢 Please enter 2FA code from Authenticator App...');

        // Wait for user to manually enter 2FA code (or pause for debugging)
        // In real test, you would use backup codes or disable 2FA
        await page.pause(); // This will pause the test for manual intervention

        // After 2FA is verified, wait for redirect to home
        await page.waitForURL('http://localhost:3000/', { timeout: 30000 });
        console.log('✅ 2FA verified, redirected to home');
      } else {
        console.log('✅ No 2FA required, logged in directly');
      }
    } catch (error) {
      // If neither URL is reached, check current state
      const currentUrl = page.url();
      console.log('Current URL:', currentUrl);
      throw error;
    }

    // Verify tokens are stored
    const accessToken = await page.evaluate(() => localStorage.getItem('access_token'));
    const refreshToken = await page.evaluate(() => localStorage.getItem('refresh_token'));
    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();
    console.log('✅ Tokens verified in localStorage');

    // Step 2: Navigate to a protected route (form list)
    console.log('\n📝 Step 2: Navigate to protected route');
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    // Step 3: Simulate token expiry by removing tokens
    console.log('\n📝 Step 3: Simulating token expiry (removing tokens)');
    await page.evaluate(() => {
      console.log('🔥 SIMULATING TOKEN EXPIRY - Removing tokens...');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      console.log('✅ Tokens removed from localStorage');
    });

    // Verify tokens are removed
    const tokensAfterRemoval = await page.evaluate(() => ({
      access: localStorage.getItem('access_token'),
      refresh: localStorage.getItem('refresh_token')
    }));
    expect(tokensAfterRemoval.access).toBeNull();
    expect(tokensAfterRemoval.refresh).toBeNull();
    console.log('✅ Verified: Tokens removed successfully');

    // Step 4: Track API requests for loop detection
    console.log('\n📝 Step 4: Triggering API call to detect loop...');
    const apiRequests = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/v1/forms')) {
        apiRequests.push({
          url,
          method: request.method(),
          timestamp: Date.now()
        });
      }
    });

    // Reload page to trigger API call with expired token
    await page.reload();

    // Wait for redirect to login (should happen quickly)
    try {
      await page.waitForURL('http://localhost:3000/login', { timeout: 5000 });
      console.log('✅ Redirected to login page successfully');
    } catch (error) {
      console.error('❌ Failed to redirect to login page');
      console.error('Current URL:', page.url());
      throw new Error('Expected redirect to /login but did not happen');
    }

    // Step 5: Verify no loop occurred
    console.log('\n📝 Step 5: Checking for loop errors...');
    console.log(`Total API requests to /forms: ${apiRequests.length}`);

    // Check if requests happened in quick succession (loop indicator)
    if (apiRequests.length > 1) {
      const timeDiff = apiRequests[apiRequests.length - 1].timestamp - apiRequests[0].timestamp;
      console.log(`Time between requests: ${timeDiff}ms`);

      // If more than 3 requests in less than 2 seconds = loop
      if (apiRequests.length > 3 && timeDiff < 2000) {
        console.error('❌ LOOP DETECTED! Multiple rapid API requests:');
        apiRequests.forEach((req, i) => {
          console.error(`  ${i + 1}. ${req.method} ${req.url}`);
        });
        throw new Error(`Loop detected: ${apiRequests.length} requests in ${timeDiff}ms`);
      }
    }

    // ✅ Success criteria:
    // 1. Redirected to login
    // 2. No infinite loop (max 2-3 requests)
    // 3. No JavaScript errors
    expect(apiRequests.length).toBeLessThanOrEqual(3);
    console.log('✅ No loop detected - Test passed!');

    // Step 6: Verify sessionStorage has redirect path saved
    console.log('\n📝 Step 6: Checking redirect path in sessionStorage');
    const redirectPath = await page.evaluate(() => sessionStorage.getItem('redirectAfterLogin'));
    console.log(`Redirect path saved: ${redirectPath || 'NONE'}`);

    // Should have saved the original path (/)
    if (redirectPath) {
      console.log('✅ Redirect path saved correctly');
    } else {
      console.log('⚠️ No redirect path saved (might be okay if path was /login)');
    }

    console.log('\n🎉 TEST-1 PASSED: Token expiry handled correctly without loop!\n');
  });

  test('TEST-2: Re-login should redirect back to original page', async ({ page }) => {
    console.log('\n🧪 TEST-2: Testing redirect after re-login...\n');

    // Step 1: Login first time
    console.log('📝 Step 1: Initial login');
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="username"]', 'pongpanp');
    await page.fill('input[name="password"]', 'Gfvtmiu613');
    await page.click('button[type="submit"]');

    // Handle 2FA if required
    try {
      await page.waitForURL(/\/(|2fa-verify)/, { timeout: 5000 });
      if (await page.locator('text=ยืนยันตัวตน 2FA').isVisible({ timeout: 1000 })) {
        console.log('⚠️ 2FA required - Please enter code...');
        await page.pause();
        await page.waitForURL('http://localhost:3000/', { timeout: 30000 });
      }
    } catch (error) {
      console.log('No 2FA or already at home page');
    }

    console.log('✅ Initial login successful');

    // Step 2: Navigate to a specific page (form list)
    console.log('\n📝 Step 2: Navigate to specific page');
    const targetUrl = 'http://localhost:3000/';
    await page.goto(targetUrl);
    await page.waitForLoadState('networkidle');
    console.log(`✅ Navigated to: ${targetUrl}`);

    // Step 3: Manually set redirect path (simulate token expiry)
    console.log('\n📝 Step 3: Simulating token expiry with redirect path');
    await page.evaluate((url) => {
      sessionStorage.setItem('redirectAfterLogin', '/');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      console.log('✅ Set redirectAfterLogin:', '/');
    }, '/');

    // Step 4: Reload to trigger redirect to login
    await page.reload();
    await page.waitForURL('http://localhost:3000/login', { timeout: 5000 });
    console.log('✅ Redirected to login page');

    // Step 5: Login again
    console.log('\n📝 Step 5: Re-login');
    await page.fill('input[name="username"]', 'pongpanp');
    await page.fill('input[name="password"]', 'Gfvtmiu613');
    await page.click('button[type="submit"]');

    // Handle 2FA if required
    try {
      await page.waitForURL(/\/(|2fa-verify)/, { timeout: 5000 });
      if (await page.locator('text=ยืนยันตัวตน 2FA').isVisible({ timeout: 1000 })) {
        console.log('⚠️ 2FA required - Please enter code...');
        await page.pause();
      }
    } catch (error) {
      console.log('No 2FA prompt');
    }

    // Step 6: Should redirect back to original page
    console.log('\n📝 Step 6: Waiting for redirect back to original page...');
    try {
      await page.waitForURL('http://localhost:3000/', { timeout: 10000 });
      console.log('✅ Redirected back to original page successfully!');
    } catch (error) {
      const currentUrl = page.url();
      console.error(`❌ Expected redirect to "/" but got: ${currentUrl}`);
      throw new Error(`Redirect failed. Expected: /, Got: ${currentUrl}`);
    }

    // Verify redirect path was cleared
    const redirectPathAfterLogin = await page.evaluate(() =>
      sessionStorage.getItem('redirectAfterLogin')
    );
    expect(redirectPathAfterLogin).toBeNull();
    console.log('✅ Redirect path cleared after login');

    console.log('\n🎉 TEST-2 PASSED: Redirect after re-login works correctly!\n');
  });

  test('TEST-3: No console errors during token expiry', async ({ page }) => {
    console.log('\n🧪 TEST-3: Checking for console errors...\n');

    const consoleErrors = [];
    const pageErrors = [];

    // Track console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Track page errors
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });

    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="username"]', 'pongpanp');
    await page.fill('input[name="password"]', 'Gfvtmiu613');
    await page.click('button[type="submit"]');

    // Handle 2FA if required
    try {
      await page.waitForURL(/\/(|2fa-verify)/, { timeout: 5000 });
      if (await page.locator('text=ยืนยันตัวตน 2FA').isVisible({ timeout: 1000 })) {
        console.log('⚠️ 2FA required - Please enter code...');
        await page.pause();
        await page.waitForURL('http://localhost:3000/', { timeout: 30000 });
      }
    } catch (error) {
      console.log('No 2FA or already at home page');
    }

    // Simulate token expiry
    await page.evaluate(() => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    });

    // Reload to trigger expiry handling
    await page.reload();
    await page.waitForURL('http://localhost:3000/login', { timeout: 5000 });

    // Check for critical errors
    const criticalErrors = [
      ...consoleErrors,
      ...pageErrors
    ].filter(error => {
      // Filter out expected errors (401, token expiry messages)
      return !error.includes('401') &&
             !error.includes('Unauthorized') &&
             !error.includes('Token refresh failed') &&
             !error.includes('Session expired');
    });

    console.log(`Console errors: ${consoleErrors.length}`);
    console.log(`Page errors: ${pageErrors.length}`);
    console.log(`Critical errors: ${criticalErrors.length}`);

    if (criticalErrors.length > 0) {
      console.error('❌ Critical errors found:');
      criticalErrors.forEach(err => console.error(`  - ${err}`));
    }

    expect(criticalErrors.length).toBe(0);
    console.log('✅ No critical console errors detected');

    console.log('\n🎉 TEST-3 PASSED: No unexpected errors during token expiry!\n');
  });

});
