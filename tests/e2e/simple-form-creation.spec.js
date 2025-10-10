/**
 * E2E Test: Simple Form Creation (Manual Testing Helper)
 *
 * Simplified test to verify basic form creation flow
 * Works with manual 2FA OTP entry
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:5000/api/v1';

const TEST_USER = {
  identifier: 'pongpanp',
  password: 'Gfvtmiu613'
};

/**
 * Login helper with 2FA support
 */
async function login(page) {
  await page.goto(BASE_URL);
  await page.waitForSelector('input[type="text"]', { timeout: 10000 });

  await page.fill('input[type="text"]', TEST_USER.identifier);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button:has-text("เข้าสู่ระบบ")');

  const has2FA = await page.locator('text=/ยืนยันตัวตน 2FA/i').isVisible({ timeout: 5000 }).catch(() => false);

  if (has2FA) {
    console.log('⚠️  2FA enabled - waiting 30 seconds for manual OTP...');
    await page.waitForSelector('[data-testid="create-form-btn"], h1:has-text("จัดการฟอร์ม")', { timeout: 30000 });
  } else {
    await page.waitForSelector('[data-testid="create-form-btn"], h1:has-text("จัดการฟอร์ม")', { timeout: 15000 });
  }
}

test.describe('Simple Form Creation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Create Simple Form - Manual Inspection', async ({ page }) => {
    console.log('📝 Step 1: Click create form button');
    await page.locator('[data-testid="create-form-btn"]').click();
    await page.waitForSelector('h1:has-text("สร้างฟอร์มใหม่")', { timeout: 10000 });
    await page.waitForTimeout(2000);

    console.log('📝 Step 2: Take screenshot of initial state');
    await page.screenshot({ path: 'test-results/form-builder-initial.png', fullPage: true });

    console.log('📝 Step 3: Find and click form title');
    const formTitle = await page.locator('h1:has-text("คลิกเพื่อระบุชื่อฟอร์ม")').first();
    const isTitleVisible = await formTitle.isVisible();
    console.log('  Form title element visible:', isTitleVisible);

    if (isTitleVisible) {
      await formTitle.click();
      await page.waitForTimeout(500);
      await page.keyboard.type('ฟอร์มทดสอบง่ายๆ');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      console.log('  ✅ Form title set');
    }

    console.log('📝 Step 4: Find save button');
    const saveButton = await page.locator('[data-testid="save-form-btn"]').first();
    const isSaveVisible = await saveButton.isVisible();
    console.log('  Save button visible:', isSaveVisible);

    if (isSaveVisible) {
      await page.screenshot({ path: 'test-results/form-builder-before-save.png', fullPage: true });
      await saveButton.click();
      console.log('  ✅ Clicked save button');

      // Wait for success or error
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-results/form-builder-after-save.png', fullPage: true });
    }

    // Wait for user to inspect
    console.log('📝 Waiting 5 seconds for inspection...');
    await page.waitForTimeout(5000);
  });

  test('Inspect Page Structure', async ({ page }) => {
    console.log('📝 Opening form builder');
    await page.locator('[data-testid="create-form-btn"]').click();
    await page.waitForTimeout(3000);

    console.log('📝 Taking full page screenshot');
    await page.screenshot({ path: 'test-results/page-structure.png', fullPage: true });

    // Find all buttons
    const buttons = await page.locator('button').all();
    console.log(`📝 Found ${buttons.length} buttons:`);
    for (let i = 0; i < Math.min(buttons.length, 20); i++) {
      const text = await buttons[i].textContent().catch(() => '');
      const title = await buttons[i].getAttribute('title').catch(() => '');
      if (text || title) {
        console.log(`  [${i}] text="${text.trim()}" title="${title}"`);
      }
    }

    // Find all headings
    const headings = await page.locator('h1, h2, h3').all();
    console.log(`\n📝 Found ${headings.length} headings:`);
    for (const heading of headings.slice(0, 10)) {
      const text = await heading.textContent();
      console.log(`  - "${text.trim()}"`);
    }

    // Wait for inspection
    console.log('\n📝 Pausing for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
  });
});
