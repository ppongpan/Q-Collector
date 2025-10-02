/**
 * Registration E2E Tests
 * Tests user registration flow for all roles
 *
 * @version 0.7.0
 * @since 2025-10-02
 */

const { test, expect } = require('@playwright/test');
const { generateTestUser, generateInvalidUserData, DEPARTMENTS } = require('../fixtures/test-users');
const {
  navigateToRegister,
  fillRegistrationForm,
  submitRegistrationForm,
  registerUser,
  isAuthenticated,
  getCurrentUser,
  waitForToast,
  getValidationError
} = require('../fixtures/auth-helpers');

test.describe('User Registration', () => {
  test.describe('Valid Registration', () => {
    test('should register a new user with valid data', async ({ page }) => {
      const userData = generateTestUser('general_user');

      await navigateToRegister(page);
      await fillRegistrationForm(page, userData);
      await submitRegistrationForm(page);

      // Should redirect to home page
      await page.waitForURL('**/');

      // Should be authenticated
      const authenticated = await isAuthenticated(page);
      expect(authenticated).toBeTruthy();

      // Should display correct username
      const currentUser = await getCurrentUser(page);
      expect(currentUser?.username).toBe(userData.username);
    });

    test('should register user with each department', async ({ page }) => {
      for (const dept of Object.values(DEPARTMENTS)) {
        const userData = generateTestUser(dept.role, `${dept.value}${Date.now()}`);

        await navigateToRegister(page);
        await fillRegistrationForm(page, userData);
        await submitRegistrationForm(page);

        // Should redirect to home page
        await page.waitForURL('**/');

        // Should be authenticated
        const authenticated = await isAuthenticated(page);
        expect(authenticated).toBeTruthy();

        // Logout for next test
        await page.goto('/login');
        await page.evaluate(() => localStorage.clear());
      }
    });
  });

  test.describe('Validation Errors', () => {
    test('should show error for short username', async ({ page }) => {
      const invalidData = generateInvalidUserData().shortUsername;

      await navigateToRegister(page);
      await fillRegistrationForm(page, invalidData);
      await submitRegistrationForm(page);

      // Should show validation error
      const error = await page.locator('text=*Username*3*').first();
      await expect(error).toBeVisible();
    });

    test('should show error for invalid email', async ({ page }) => {
      const invalidData = generateInvalidUserData().invalidEmail;

      await navigateToRegister(page);
      await fillRegistrationForm(page, invalidData);
      await submitRegistrationForm(page);

      // Should show validation error
      const error = await page.locator('text=*อีเมล*').first();
      await expect(error).toBeVisible();
    });

    test('should show error for weak password', async ({ page }) => {
      const invalidData = generateInvalidUserData().weakPassword;

      await navigateToRegister(page);
      await fillRegistrationForm(page, invalidData);
      await submitRegistrationForm(page);

      // Should show validation error
      const error = await page.locator('text=*รหัสผ่าน*8*').first();
      await expect(error).toBeVisible();
    });

    test('should show error for password missing uppercase', async ({ page }) => {
      const invalidData = generateInvalidUserData().noUppercase;

      await navigateToRegister(page);
      await fillRegistrationForm(page, invalidData);
      await submitRegistrationForm(page);

      // Should show validation error
      const error = await page.locator('text=*ตัวพิมพ์*').first();
      await expect(error).toBeVisible();
    });

    test('should show error for username with special characters', async ({ page }) => {
      const userData = generateTestUser('general_user');
      userData.username = `test_user_${Date.now()}`;

      await navigateToRegister(page);
      await fillRegistrationForm(page, userData);
      await submitRegistrationForm(page);

      // Should show validation error (either from frontend or backend)
      // Wait a bit for API response
      await page.waitForTimeout(2000);

      // Check if still on registration page (failed)
      const url = page.url();
      expect(url).toContain('register');
    });

    test('should show error for duplicate username', async ({ page }) => {
      const userData = generateTestUser('general_user');

      // Register first time
      const success = await registerUser(page, userData);
      expect(success).toBeTruthy();

      // Clear storage and try to register again with same username
      await page.evaluate(() => localStorage.clear());

      await navigateToRegister(page);
      await fillRegistrationForm(page, userData);
      await submitRegistrationForm(page);

      // Should show error
      await page.waitForTimeout(2000);
      const url = page.url();
      expect(url).toContain('register');
    });
  });

  test.describe('Form Interaction', () => {
    test('should show password strength indicator', async ({ page }) => {
      await navigateToRegister(page);

      const passwordInput = page.locator('input[name="password"]');

      // Weak password
      await passwordInput.fill('weak');
      await page.waitForTimeout(500);

      // Check for strength indicator (look for color or text)
      const strengthIndicator = page.locator('[data-testid="password-strength"], .password-strength');
      const count = await strengthIndicator.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should show password mismatch error', async ({ page }) => {
      const userData = generateTestUser('general_user');

      await navigateToRegister(page);

      // Fill form with mismatched passwords
      await page.fill('input[name="username"]', userData.username);
      await page.fill('input[name="email"]', userData.email);
      await page.fill('input[name="full_name"]', userData.full_name);
      await page.fill('input[name="password"]', userData.password);
      await page.fill('input[name="confirmPassword"]', 'DifferentPassword123');

      await submitRegistrationForm(page);

      // Should show mismatch error
      const error = await page.locator('text=*รหัสผ่าน*ตรง*').first();
      await expect(error).toBeVisible();
    });
  });
});
