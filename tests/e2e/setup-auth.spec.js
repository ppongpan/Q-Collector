/**
 * Authentication Setup for Tests
 * Generates authenticated session state for Playwright tests
 */

const { test: setup } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

setup('authenticate as admin', async ({ page }) => {
  console.log('🔐 Setting up authentication...');

  // Ensure .auth directory exists
  const authDir = path.join(__dirname, '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Navigate to login
  await page.goto(`${BASE_URL}/login`);

  // Wait for login form
  await page.waitForSelector('input[name="username"]', { timeout: 10000 });

  // Fill credentials
  await page.fill('input[name="username"]', 'testadmin');
  await page.fill('input[name="password"]', 'TestAdmin123!');

  console.log('📝 Submitting login form...');

  // Click login and wait for navigation
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForLoadState('networkidle')
  ]);

  // Wait a bit for tokens to be stored
  await page.waitForTimeout(2000);

  // Check if login was successful by looking for either:
  // 1. Redirect to forms/dashboard
  // 2. Or check if error message appears
  const currentUrl = page.url();
  console.log(`Current URL: ${currentUrl}`);

  if (currentUrl.includes('/login')) {
    // Still on login page - check for error
    const errorText = await page.textContent('body');
    console.log('❌ Login failed - still on login page');
    console.log('Error message:', errorText.includes('ไม่พบ') ? 'ไม่พบ refresh token' : 'Unknown error');

    // Take screenshot for debugging
    await page.screenshot({ path: path.join(authDir, 'login-failed.png') });

    throw new Error('Login failed - check if backend is running and credentials are correct');
  }

  // Wait for redirect to dashboard or forms (more flexible)
  try {
    await page.waitForURL(/\/(forms|dashboard|submissions|home)/, { timeout: 10000 });
  } catch (e) {
    console.log('⚠️ Did not redirect to expected page, but continuing...');
  }

  console.log('✅ Authentication successful');

  // Save authentication state
  await page.context().storageState({ path: path.join(authDir, 'admin.json') });

  console.log('✅ Auth state saved to .auth/admin.json');
});
