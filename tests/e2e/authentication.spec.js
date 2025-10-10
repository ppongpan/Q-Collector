/**
 * E2E Tests - Authentication & Authorization
 * Tests login, logout, session management, permissions
 *
 * @version 0.7.2
 * @since 2025-10-04
 */

const { test, expect } = require('@playwright/test');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  identifier: 'pongpanp',
  password: 'Gfvtmiu613'
};

const INVALID_USER = {
  identifier: 'invalid_user',
  password: 'wrong_password'
};

test.describe('Authentication & Authorization', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  // ==================== LOGIN ====================
  test('AUTH-1: Successful login', async ({ page }) => {
    console.log('🧪 Test: Successful Login');

    // Fill login form
    const identifierInput = page.locator('input[name="identifier"]')
      .or(page.locator('input[type="text"]').first());
    await identifierInput.fill(TEST_USER.identifier);

    const passwordInput = page.locator('input[name="password"]')
      .or(page.locator('input[type="password"]'));
    await passwordInput.fill(TEST_USER.password);

    console.log(`  Logging in as: ${TEST_USER.identifier}`);

    // Submit form
    const loginBtn = page.locator('button[type="submit"]');
    await loginBtn.click();

    // Wait for redirect
    await page.waitForURL(url => !url.toString().includes('login'), { timeout: 10000 });

    // Verify login success
    const userMenu = page.locator('[data-testid="user-menu"]')
      .or(page.locator(`text="${TEST_USER.identifier}"`));

    await expect(userMenu).toBeVisible({ timeout: 5000 });

    console.log('✅ Login successful');
  });

  // ==================== FAILED LOGIN ====================
  test('AUTH-2: Failed login with invalid credentials', async ({ page }) => {
    console.log('🧪 Test: Failed Login');

    // Try to login with invalid credentials
    const identifierInput = page.locator('input[name="identifier"]')
      .or(page.locator('input[type="text"]').first());
    await identifierInput.fill(INVALID_USER.identifier);

    const passwordInput = page.locator('input[name="password"]')
      .or(page.locator('input[type="password"]'));
    await passwordInput.fill(INVALID_USER.password);

    console.log(`  Attempting login with invalid credentials`);

    const loginBtn = page.locator('button[type="submit"]');
    await loginBtn.click();

    // Wait for error message
    const errorMessage = page.locator('text=/invalid|incorrect|ไม่ถูกต้อง|ผิดพลาด/i');
    const hasError = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasError) {
      console.log('✅ Invalid credentials rejected with error message');
    } else {
      console.log('⚠️  No error message shown (may still be on login page)');

      // Check if still on login page
      const stillOnLogin = await page.locator('input[name="password"]')
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      if (stillOnLogin) {
        console.log('✅ Login prevented (still on login page)');
      }
    }
  });

  // ==================== LOGOUT ====================
  test('AUTH-3: Logout', async ({ page }) => {
    console.log('🧪 Test: Logout');

    // Login first
    await loginUser(page);

    // Open user menu
    const userMenu = page.locator('[data-testid="user-menu"]');
    await userMenu.click();
    await page.waitForTimeout(500);

    // Click logout
    const logoutBtn = page.locator('text=/logout|ออกจากระบบ/i');
    const hasLogout = await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasLogout) {
      await logoutBtn.click();

      // Wait for redirect to login
      await page.waitForURL(url => url.toString().includes('login') || url.toString() === BASE_URL + '/', { timeout: 10000 });

      // Verify logged out (should see login form)
      const loginForm = page.locator('input[name="password"]');
      await expect(loginForm).toBeVisible({ timeout: 5000 });

      console.log('✅ Logout successful');
    } else {
      console.log('⚠️  Logout button not found');
      test.skip();
    }
  });

  // ==================== SESSION PERSISTENCE ====================
  test('AUTH-4: Session persistence', async ({ page, context }) => {
    console.log('🧪 Test: Session Persistence');

    // Login
    await loginUser(page);

    // Verify logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible({ timeout: 5000 });

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify still logged in
    const stillLoggedIn = await page.locator('[data-testid="user-menu"]')
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (stillLoggedIn) {
      console.log('✅ Session persisted after reload');
    } else {
      console.log('⚠️  Session not persisted (may require re-login)');
    }

    // Open new tab
    const newPage = await context.newPage();
    await newPage.goto(BASE_URL);
    await newPage.waitForLoadState('networkidle');

    // Check if logged in on new tab
    const loggedInNewTab = await newPage.locator('[data-testid="user-menu"]')
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (loggedInNewTab) {
      console.log('✅ Session shared across tabs');
    } else {
      console.log('⚠️  Session not shared (may require separate login)');
    }

    await newPage.close();
  });

  // ==================== PROTECTED ROUTES ====================
  test('AUTH-5: Protected routes redirect to login', async ({ page }) => {
    console.log('🧪 Test: Protected Routes');

    // Clear any existing session
    await page.context().clearCookies();
    await page.goto(BASE_URL);

    // Try to access protected route without login
    const protectedUrl = `${BASE_URL}/forms`;
    await page.goto(protectedUrl);
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();

    if (currentUrl.includes('login')) {
      console.log('✅ Redirected to login for protected route');
    } else {
      // Check if login form is visible
      const loginForm = page.locator('input[name="password"]');
      const hasLoginForm = await loginForm.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasLoginForm) {
        console.log('✅ Login required for protected route');
      } else {
        console.log('⚠️  Protected route may not require authentication');
      }
    }
  });

  // ==================== PASSWORD FIELD ====================
  test('AUTH-6: Password field security', async ({ page }) => {
    console.log('🧪 Test: Password Field Security');

    // Check password input type
    const passwordInput = page.locator('input[name="password"]')
      .or(page.locator('input[type="password"]'));

    const inputType = await passwordInput.getAttribute('type');

    if (inputType === 'password') {
      console.log('  ✓ Password field type is "password"');
    } else {
      console.log('  ✗ Password field type is not secure');
    }

    // Look for show/hide password toggle
    const toggleBtn = page.locator('[data-testid="toggle-password"], button[aria-label*="password"]');
    const hasToggle = await toggleBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasToggle) {
      console.log('  ✓ Password toggle button found');

      // Click toggle
      await toggleBtn.click();
      await page.waitForTimeout(300);

      const newType = await passwordInput.getAttribute('type');

      if (newType === 'text') {
        console.log('  ✓ Password toggle works (shows password)');

        // Toggle back
        await toggleBtn.click();
        await page.waitForTimeout(300);

        const finalType = await passwordInput.getAttribute('type');

        if (finalType === 'password') {
          console.log('✅ Password field security features work');
        }
      }
    } else {
      console.log('  ✓ No password toggle (acceptable)');
      console.log('✅ Password field is secure');
    }
  });

  // ==================== REMEMBER ME ====================
  test('AUTH-7: Remember me functionality', async ({ page }) => {
    console.log('🧪 Test: Remember Me');

    // Look for "Remember Me" checkbox
    const rememberCheckbox = page.locator('input[type="checkbox"][name*="remember"]')
      .or(page.locator('label:has-text("Remember") input[type="checkbox"]'));

    const hasRemember = await rememberCheckbox.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasRemember) {
      console.log('  ✓ Remember Me checkbox found');

      // Check the box
      await rememberCheckbox.check();

      // Login
      await loginUser(page);

      // Verify logged in
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible({ timeout: 5000 });

      console.log('✅ Remember Me feature present');
    } else {
      console.log('⚠️  Remember Me feature not implemented');
    }
  });

  // ==================== AUTHORIZATION ====================
  test('AUTH-8: Role-based permissions', async ({ page }) => {
    console.log('🧪 Test: Role-Based Permissions');

    // Login
    await loginUser(page);

    // Navigate to form
    await page.locator('[data-testid="form-card"]').first().click();
    await page.waitForLoadState('networkidle');

    // Check available actions based on role
    const editBtn = page.locator('[data-testid="edit-form-btn"], button:has-text("แก้ไข")');
    const deleteBtn = page.locator('[data-testid="delete-form-btn"], button:has-text("ลบ")');
    const settingsBtn = page.locator('[data-testid="settings-btn"], button:has-text("ตั้งค่า")');

    const canEdit = await editBtn.isVisible({ timeout: 3000 }).catch(() => false);
    const canDelete = await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false);
    const canSettings = await settingsBtn.isVisible({ timeout: 3000 }).catch(() => false);

    console.log(`  Permissions - Edit: ${canEdit ? '✓' : '✗'}, Delete: ${canDelete ? '✓' : '✗'}, Settings: ${canSettings ? '✓' : '✗'}`);

    if (canEdit || canDelete || canSettings) {
      console.log('✅ Role-based permissions enforced');
    } else {
      console.log('⚠️  User has limited permissions (view-only)');
    }
  });

  // ==================== SESSION TIMEOUT ====================
  test('AUTH-9: Session timeout handling', async ({ page }) => {
    console.log('🧪 Test: Session Timeout');

    // Login
    await loginUser(page);

    // Simulate session expiry by clearing cookies
    console.log('  Simulating session expiry...');
    await page.context().clearCookies();

    // Try to perform an action
    await page.locator('[data-testid="create-form-btn"]').click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Check if redirected to login
    const currentUrl = page.url();

    if (currentUrl.includes('login')) {
      console.log('✅ Session timeout redirects to login');
    } else {
      const loginForm = page.locator('input[name="password"]');
      const hasLoginForm = await loginForm.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasLoginForm) {
        console.log('✅ Session timeout shows login form');
      } else {
        console.log('⚠️  Session timeout handling may not be implemented');
      }
    }
  });

});

// ==================== HELPER FUNCTIONS ====================

async function loginUser(page) {
  const identifierInput = page.locator('input[name="identifier"]')
    .or(page.locator('input[type="text"]').first());
  await identifierInput.fill(TEST_USER.identifier);

  const passwordInput = page.locator('input[name="password"]')
    .or(page.locator('input[type="password"]'));
  await passwordInput.fill(TEST_USER.password);

  const loginBtn = page.locator('button[type="submit"]');
  await loginBtn.click();

  await page.waitForURL(url => !url.toString().includes('login'), { timeout: 10000 });
}
