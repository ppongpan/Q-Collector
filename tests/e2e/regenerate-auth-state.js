/**
 * Regenerate Auth State for E2E Tests
 * Q-Collector v0.8.2-dev
 *
 * @description Creates a fresh authentication state file with 2FA-enabled user
 * @date 2025-10-24
 */

const { chromium } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  username: 'pongpanp',
  password: 'Gfvtmiu613'
};

async function regenerateAuthState() {
  console.log('🔄 Regenerating auth state for E2E tests...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Navigate to login page
    console.log('📍 Step 1: Navigating to login page...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Step 2: Fill login credentials
    console.log('🔐 Step 2: Entering credentials...');
    await page.fill('input[type="text"], input[name="username"]', TEST_USER.username);
    await page.fill('input[type="password"], input[name="password"]', TEST_USER.password);

    // Step 3: Submit login
    console.log('➡️  Step 3: Submitting login...');
    await page.click('button[type="submit"]');

    // Wait for response
    await page.waitForTimeout(2000);

    // Step 4: Check if 2FA is required
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);

    if (currentUrl.includes('2fa-verify') || currentUrl.includes('2fa-setup')) {
      console.log('🔢 2FA verification required');

      // Check if this is setup or verify
      if (currentUrl.includes('2fa-setup')) {
        console.log('⚠️  User requires 2FA setup (first time)');
        console.log('❌ Cannot auto-complete setup - QR code scanning required');
        console.log('');
        console.log('MANUAL STEPS REQUIRED:');
        console.log('1. Scan the QR code with your authenticator app');
        console.log('2. Enter the 6-digit code below');
        console.log('3. The script will save the auth state');
        console.log('');

        // Wait for manual completion
        console.log('⏳ Waiting for you to complete 2FA setup...');
        console.log('   Browser will stay open. Complete setup manually, then wait.');

        // Wait for redirect to home page (indicates setup complete)
        await page.waitForURL(/\/(dashboard|forms|home|\/)$/, { timeout: 300000 }); // 5 min timeout

      } else {
        // 2FA verify page - need TOTP code
        console.log('⏳ Waiting for manual 2FA verification...');
        console.log('   Please enter the 6-digit code from your authenticator app');
        console.log('   Browser will stay open until you complete verification');

        // Wait for redirect
        await page.waitForURL(/\/(dashboard|forms|home|\/)$/, { timeout: 300000 });
      }

      console.log('✅ 2FA completed');
    }

    // Step 5: Verify we're logged in
    console.log('📍 Step 5: Verifying login success...');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const finalUrl = page.url();
    console.log(`   Final URL: ${finalUrl}`);

    // Check for user menu with more specific selector
    const userMenuVisible = await page.locator('button:has-text("pongpanp")').isVisible({ timeout: 15000 }).catch(() => false);

    if (!userMenuVisible) {
      await page.screenshot({ path: 'tests/e2e/.auth/failed-login.png' });
      throw new Error('User menu not found. Login may have failed. See screenshot: tests/e2e/.auth/failed-login.png');
    }

    console.log('✅ Login verified - user menu found');

    // Step 6: Save authentication state
    console.log('💾 Step 6: Saving authentication state...');
    await context.storageState({ path: 'tests/e2e/.auth/user.json' });
    console.log('✅ Auth state saved to: tests/e2e/.auth/user.json');

    // Take success screenshot
    await page.screenshot({ path: 'tests/e2e/.auth/success-state.png' });
    console.log('📸 Success screenshot saved');

    console.log('\n✨ Auth state regeneration complete!');
    console.log('   You can now run E2E tests with: npx playwright test');

  } catch (error) {
    console.error('\n❌ Failed to regenerate auth state:', error.message);
    await page.screenshot({ path: 'tests/e2e/.auth/error-state.png' });
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the script
regenerateAuthState().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
