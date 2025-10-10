/**
 * Global Setup for E2E Tests
 * Performs login once and saves authentication state for all tests
 * This prevents rate limiting issues from parallel test execution
 *
 * @version 0.7.2
 * @since 2025-10-04
 */

const { chromium } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  identifier: 'pongpanp',
  password: 'Gfvtmiu613'
};

async function globalSetup() {
  console.log('🔧 Global Setup: Performing one-time login...');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to login page
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    console.log(`  📍 URL: ${page.url()}`);

    // Check if already at home page (logged in)
    const userMenuVisible = await page.locator('[data-testid="user-menu"]')
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (!userMenuVisible) {
      console.log('  🔐 Logging in...');

      // Fill login form
      const textInput = page.locator('input[type="text"]').first();
      await textInput.fill(TEST_USER.identifier);

      const passwordInput = page.locator('input[type="password"]');
      await passwordInput.fill(TEST_USER.password);

      // Submit
      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.click();

      // Wait for navigation
      await page.waitForURL(url => !url.toString().includes('login'), { timeout: 10000 });

      // Wait for user menu to appear
      await page.waitForSelector('[data-testid="user-menu"]', { timeout: 10000 });

      console.log('  ✅ Login successful');
    } else {
      console.log('  ✅ Already logged in');
    }

    // Save authentication state
    await context.storageState({ path: 'tests/e2e/.auth/user.json' });
    console.log('  💾 Authentication state saved');

  } catch (error) {
    console.error('  ❌ Global setup failed:', error.message);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }

  console.log('✅ Global Setup Complete\n');
}

module.exports = globalSetup;
