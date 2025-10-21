/**
 * Debug Script: Find correct selectors for Notification Tab
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  username: 'pongpanp',
  password: 'Gfvtmiu613'
};

/**
 * Helper function: Login to Q-Collector
 * Simple and reliable login flow
 */
async function login(page) {
  console.log('🔐 Starting login process...');

  await page.goto(BASE_URL);
  await page.waitForTimeout(2000);

  // Check if login form exists
  const loginFormExists = await page.locator('input[name="identifier"]').count() > 0;

  if (!loginFormExists) {
    console.log('✅ Already authenticated');
    return;
  }

  // Fill and submit login form
  console.log('📝 Filling login credentials...');
  await page.fill('input[name="identifier"]', TEST_USER.username);
  await page.fill('input[name="password"]', TEST_USER.password);

  console.log('🚀 Submitting login...');
  await page.click('button[type="submit"]');

  // Wait for forms page to actually load (not just URL change)
  await page.waitForTimeout(5000);

  console.log('✅ Login complete');
}

test('Debug: Find form list selectors', async ({ page }) => {
  // Navigate and login
  await login(page);

  console.log('✅ On forms page');

  // Wait for page to load
  await page.waitForTimeout(3000);

  // Find all possible form list selectors
  console.log('\n🔍 Checking possible selectors:');

  const selectors = [
    '.form-list-item',
    '.form-card',
    '[data-testid="form-card"]',
    '.glass-card',
    'article',
    '.form-item',
    '[role="article"]',
    'button:has-text("แก้ไข")',
  ];

  for (const selector of selectors) {
    const count = await page.locator(selector).count();
    console.log(`   ${selector}: ${count} elements`);

    if (count > 0) {
      const first = page.locator(selector).first();
      const text = await first.textContent();
      console.log(`      First element text (truncated): ${text?.substring(0, 100)}`);
    }
  }

  // Take screenshot
  await page.screenshot({ path: 'test-results/debug-forms-page.png', fullPage: true });
  console.log('\n📸 Screenshot saved to test-results/debug-forms-page.png');

  // Get page HTML structure for analysis
  const bodyHTML = await page.evaluate(() => {
    const body = document.querySelector('body');
    return body ? body.outerHTML.substring(0, 5000) : '';
  });

  console.log('\n📄 Body HTML structure (first 1000 chars):');
  console.log(bodyHTML.substring(0, 1000));

  console.log('\n✅ Debug test complete!');
});
