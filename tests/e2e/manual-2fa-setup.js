/**
 * Manual 2FA Setup Script
 * Opens browser in headed mode for manual login with 2FA
 * Saves authenticated session for E2E tests
 *
 * Usage: node tests/e2e/manual-2fa-setup.js
 */

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const AUTH_STATE_PATH = path.join(__dirname, '.auth', 'user.json');

async function manualLogin() {
  console.log('🔧 Manual 2FA Setup - Interactive Login');
  console.log('═'.repeat(60));
  console.log('');
  console.log('📋 Instructions:');
  console.log('  1. Browser will open to login page');
  console.log('  2. Enter username: pongpanp');
  console.log('  3. Enter password: Gfvtmiu613');
  console.log('  4. Enter 2FA OTP from your authenticator app');
  console.log('  5. ✅ IMPORTANT: Check "Trust this device" checkbox!');
  console.log('  6. Wait until you see the dashboard');
  console.log('  7. Press ENTER in this terminal when ready');
  console.log('');
  console.log('═'.repeat(60));
  console.log('');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to app (React Router will handle /login redirect)
    console.log('🌐 Opening app...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    console.log('');
    console.log('✋ WAITING FOR YOU TO COMPLETE LOGIN...');
    console.log('');
    console.log('Please:');
    console.log('  • Login with your credentials');
    console.log('  • Enter 2FA OTP code');
    console.log('  • ✅ Check "Trust this device" box');
    console.log('  • Wait for dashboard to load');
    console.log('');
    console.log('Press ENTER when you\'re logged in and see the dashboard...');

    // Wait for user to press Enter
    await new Promise(resolve => {
      process.stdin.once('data', () => {
        resolve();
      });
    });

    console.log('');
    console.log('🔍 Verifying login status...');

    // Check current URL
    const currentUrl = page.url();
    console.log(`  📍 Current URL: ${currentUrl}`);

    // Check if we're logged in by looking for user menu
    const userMenuSelectors = [
      '[data-testid="user-menu"]',
      '.user-menu',
      'button:has-text("pongpanp")',
      'button:has-text("Pongpan")',
      '[class*="user"]',
      '[class*="menu"]'
    ];

    let loggedIn = false;
    for (const selector of userMenuSelectors) {
      const isVisible = await page.locator(selector).isVisible().catch(() => false);
      if (isVisible) {
        console.log(`  ✅ Found user menu: ${selector}`);
        loggedIn = true;
        break;
      }
    }

    if (!loggedIn) {
      // Take screenshot for debugging
      await page.screenshot({ path: 'tests/e2e/.auth/debug-login-state.png' });
      console.log('');
      console.log('⚠️  WARNING: Could not detect logged-in state');
      console.log('  Screenshot saved to: tests/e2e/.auth/debug-login-state.png');
      console.log('');
      console.log('  Proceeding anyway... (cookies will be saved)');
    } else {
      console.log('  ✅ Login verified!');
    }

    // Save authentication state
    console.log('');
    console.log('💾 Saving authentication state...');

    // Ensure .auth directory exists
    const authDir = path.dirname(AUTH_STATE_PATH);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    await context.storageState({ path: AUTH_STATE_PATH });
    console.log(`  ✅ Saved to: ${AUTH_STATE_PATH}`);

    // Display cookies info
    const cookies = await context.cookies();
    const relevantCookies = cookies.filter(c =>
      c.name.includes('token') ||
      c.name.includes('auth') ||
      c.name.includes('session') ||
      c.name.includes('trusted')
    );

    console.log('');
    console.log('🍪 Saved Cookies:');
    relevantCookies.forEach(cookie => {
      console.log(`  • ${cookie.name}: ${cookie.value.substring(0, 30)}...`);
    });

    if (relevantCookies.length === 0) {
      console.log('  ⚠️  No auth-related cookies found!');
      console.log('  You may need to login again.');
    }

    console.log('');
    console.log('═'.repeat(60));
    console.log('✅ Setup Complete!');
    console.log('═'.repeat(60));
    console.log('');
    console.log('Next Steps:');
    console.log('  1. Close the browser window');
    console.log('  2. Run: npx playwright test tests/e2e/pdpa/dsr-management.spec.js');
    console.log('  3. Tests will use the saved authentication state');
    console.log('');
    console.log('Note: Trusted device token expires after 24 hours');
    console.log('      You\'ll need to run this script again after that.');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Error during setup:', error.message);
    console.error('');
    throw error;
  } finally {
    // Don't close immediately - let user review
    console.log('Press ENTER to close browser and exit...');
    await new Promise(resolve => {
      process.stdin.once('data', () => {
        resolve();
      });
    });

    await context.close();
    await browser.close();
  }
}

// Run the setup
manualLogin().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
