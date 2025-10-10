/**
 * Debug Test - Login Flow v2 - Detailed Investigation
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  identifier: 'pongpanp',
  password: 'Gfvtmiu613'
};

test.describe('Debug Login Flow V2', () => {

  test('DEBUG-V2: Track login flow step by step', async ({ page }) => {
    console.log('🔍 Starting detailed login investigation...');

    // Enable console logging from the page
    page.on('console', msg => console.log(`  [PAGE LOG] ${msg.text()}`));
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log(`  [API] ${response.status()} ${response.url()}`);
      }
    });

    // Navigate to base URL
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    console.log(`📍 Initial URL: ${page.url()}`);

    // Try login
    console.log('\n🔐 Attempting login...');

    const textInput = page.locator('input[type="text"]').first();
    await textInput.fill(TEST_USER.identifier);
    console.log('  ✓ Filled identifier');

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(TEST_USER.password);
    console.log('  ✓ Filled password');

    const submitBtn = page.locator('button[type="submit"]');
    console.log('  ⏳ Clicking submit...');

    // Listen for navigation
    const navigationPromise = page.waitForNavigation({ timeout: 15000 }).catch(e => {
      console.log('  ⚠️ Navigation timeout:', e.message);
      return null;
    });

    await submitBtn.click();
    console.log('  ✓ Submit clicked');

    // Wait for navigation
    await navigationPromise;

    // Wait a bit for React to render
    await page.waitForTimeout(2000);

    console.log(`📍 After submit URL: ${page.url()}`);

    // Check for user menu with multiple selectors
    const selectors = [
      '[data-testid="user-menu"]',
      '[data-testid="user-menu-button"]',
      '[data-testid="user-menu-username"]',
      'text="pongpanp"'
    ];

    for (const selector of selectors) {
      const visible = await page.locator(selector).isVisible({ timeout: 2000 }).catch(() => false);
      console.log(`  ${visible ? '✅' : '❌'} ${selector}: ${visible ? 'visible' : 'not visible'}`);
    }

    // Take final screenshot
    await page.screenshot({ path: 'test-results/debug-login-v2.png', fullPage: true });
    console.log('\n📸 Screenshot saved');

    console.log('\n✅ Debug complete');
  });

});
