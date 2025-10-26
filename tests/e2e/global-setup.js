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

      // Wait for navigation away from login page
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      console.log(`  📍 After login URL: ${page.url()}`);

      // Take screenshot for debugging
      await page.screenshot({ path: 'tests/e2e/.auth/after-login.png' });

      // Try to find user menu with different strategies
      const userMenuSelectors = [
        '[data-testid="user-menu"]',
        '.user-menu',
        'button:has-text("admin")',
        'button:has-text("Admin")',
        '[class*="user-menu"]',
        '[class*="UserMenu"]'
      ];

      let userMenuFound = false;
      for (const selector of userMenuSelectors) {
        const isVisible = await page.locator(selector).isVisible().catch(() => false);
        console.log(`  🔍 Selector "${selector}": ${isVisible ? '✅ FOUND' : '❌ not found'}`);
        if (isVisible) {
          userMenuFound = true;
          break;
        }
      }

      if (!userMenuFound) {
        // Print page title and some content for debugging
        const title = await page.title();
        console.log(`  📄 Page title: ${title}`);

        // Check if we're still on login page
        const isLoginPage = page.url().includes('login');
        console.log(`  🔐 Still on login page: ${isLoginPage}`);

        if (isLoginPage) {
          // Check for error messages
          const errorMsg = await page.locator('text=/error|fail|invalid|incorrect/i').textContent().catch(() => 'none');
          console.log(`  ⚠️  Error message: ${errorMsg}`);
        }

        throw new Error('User menu not found after login. See screenshot at tests/e2e/.auth/after-login.png');
      }

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
