/**
 * Debug Test - Login Flow Investigation
 *
 * @version 0.7.2
 * @since 2025-10-04
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  identifier: 'pongpanp',
  password: 'Gfvtmiu613'
};

test.describe('Debug Login Flow', () => {

  test('DEBUG: Investigate login page structure', async ({ page }) => {
    console.log('🔍 Starting login page investigation...');

    // Navigate to login page
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    console.log(`📍 Current URL: ${page.url()}`);

    // Check if already logged in
    const userMenuVisible = await page.locator('[data-testid="user-menu"]')
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (userMenuVisible) {
      console.log('✅ Already logged in - user menu visible');
      return;
    }

    console.log('📋 Looking for login form elements...');

    // Try to find identifier input
    const identifierInput = page.locator('input[name="identifier"]');
    const identifierVisible = await identifierInput.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`  - input[name="identifier"]: ${identifierVisible ? '✅ Found' : '❌ Not found'}`);

    const textInput = page.locator('input[type="text"]').first();
    const textInputVisible = await textInput.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`  - input[type="text"]: ${textInputVisible ? '✅ Found' : '❌ Not found'}`);

    // Try to find password input
    const passwordInput = page.locator('input[name="password"]');
    const passwordVisible = await passwordInput.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`  - input[name="password"]: ${passwordVisible ? '✅ Found' : '❌ Not found'}`);

    const passwordTypeInput = page.locator('input[type="password"]');
    const passwordTypeVisible = await passwordTypeInput.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`  - input[type="password"]: ${passwordTypeVisible ? '✅ Found' : '❌ Not found'}`);

    // Try to find submit button
    const submitBtn = page.locator('button[type="submit"]');
    const submitVisible = await submitBtn.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`  - button[type="submit"]: ${submitVisible ? '✅ Found' : '❌ Not found'}`);

    // Take screenshot
    await page.screenshot({ path: 'test-results/debug-login-page.png', fullPage: true });
    console.log('📸 Screenshot saved to test-results/debug-login-page.png');

    // Get page HTML structure
    const bodyHTML = await page.locator('body').innerHTML();
    console.log('\n📄 Page HTML structure (first 500 chars):');
    console.log(bodyHTML.substring(0, 500));

    // Try to login if form exists
    if (identifierVisible || textInputVisible) {
      console.log('\n🔐 Attempting login...');

      const inputToUse = identifierVisible ? identifierInput : textInput;
      await inputToUse.fill(TEST_USER.identifier);
      console.log(`  ✓ Filled identifier: ${TEST_USER.identifier}`);

      const passwordToUse = passwordVisible ? passwordInput : passwordTypeInput;
      if (await passwordToUse.isVisible({ timeout: 1000 }).catch(() => false)) {
        await passwordToUse.fill(TEST_USER.password);
        console.log('  ✓ Filled password');
      }

      if (submitVisible) {
        console.log('  ⏳ Clicking submit button...');
        await submitBtn.click();

        // Wait a bit and check result
        await page.waitForTimeout(3000);

        const currentURL = page.url();
        console.log(`  📍 After submit URL: ${currentURL}`);

        const userMenuAfter = await page.locator('[data-testid="user-menu"]')
          .isVisible({ timeout: 2000 })
          .catch(() => false);

        if (userMenuAfter) {
          console.log('  ✅ Login successful - user menu now visible');
        } else {
          console.log('  ❌ Login may have failed - user menu not visible');

          // Check for error messages
          const errorMsg = await page.locator('text=/error|invalid|ผิดพลาด/i')
            .isVisible({ timeout: 1000 })
            .catch(() => false);

          if (errorMsg) {
            const errorText = await page.locator('text=/error|invalid|ผิดพลาด/i').textContent();
            console.log(`  ⚠️ Error message: ${errorText}`);
          }
        }

        // Take screenshot after login attempt
        await page.screenshot({ path: 'test-results/debug-after-login.png', fullPage: true });
        console.log('  📸 After-login screenshot saved');
      }
    }

    console.log('\n✅ Debug investigation complete');
  });

});
