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
      await page.waitForURL('**/', { timeout: 10000 });

      // Should be authenticated - check for user menu button
      const userMenuButton = page.locator('[data-testid="user-menu-button"]');
      await expect(userMenuButton).toBeVisible({ timeout: 10000 });

      // Verify username is displayed (on large screens)
      const username = page.locator('[data-testid="user-menu-username"]');
      await expect(username).toBeVisible();
      await expect(username).toHaveText(userData.username);
    });

    test('should register user with different departments', async ({ page }) => {
      // Test a subset of departments to avoid timeout issues
      const departmentsToTest = [
        DEPARTMENTS.CUSTOMER_SERVICE,
        DEPARTMENTS.TECHNIC
      ];

      for (const dept of departmentsToTest) {
        // Create unique suffix without underscores
        const cleanSuffix = Date.now().toString();
        const userData = generateTestUser(dept.role, cleanSuffix);

        await navigateToRegister(page);
        await fillRegistrationForm(page, userData);
        await submitRegistrationForm(page);

        // Should redirect to home page
        await page.waitForURL('**/', { timeout: 15000 });

        // Should be authenticated - check for user menu button
        const userMenuButton = page.locator('[data-testid="user-menu-button"]');
        await expect(userMenuButton).toBeVisible({ timeout: 15000 });

        // Logout for next test
        await page.goto('/login');
        await page.evaluate(() => localStorage.clear());
        await page.waitForTimeout(1000);
      }
    });
  });

  test.describe('Validation Errors', () => {
    test('should show error for short username', async ({ page }) => {
      const invalidData = generateInvalidUserData().shortUsername;

      await navigateToRegister(page);
      await fillRegistrationForm(page, invalidData);
      await submitRegistrationForm(page);

      // Should show validation error - look for red error text
      const error = page.locator('.text-red-500', { hasText: '3' });
      await expect(error).toBeVisible({ timeout: 5000 });
    });

    test('should show error for invalid email', async ({ page }) => {
      const invalidData = generateInvalidUserData().invalidEmail;

      await navigateToRegister(page);
      await fillRegistrationForm(page, invalidData);

      // Check email field validity (browser HTML5 validation)
      const emailInput = page.locator('input[name="email"]');
      const isValid = await emailInput.evaluate((el) => el.validity.valid);
      expect(isValid).toBe(false);

      // Browser should block form submission
      await submitRegistrationForm(page);

      // Should still be on registration page
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('register');
    });

    test('should show error for weak password', async ({ page }) => {
      const invalidData = generateInvalidUserData().weakPassword;

      await navigateToRegister(page);
      await fillRegistrationForm(page, invalidData);
      await submitRegistrationForm(page);

      // Should show validation error
      const error = page.locator('.text-red-500', { hasText: '8' });
      await expect(error).toBeVisible({ timeout: 5000 });
    });

    test('should show error for password missing uppercase', async ({ page }) => {
      const invalidData = generateInvalidUserData().noUppercase;

      await navigateToRegister(page);
      await fillRegistrationForm(page, invalidData);
      await submitRegistrationForm(page);

      // Should show validation error
      const error = page.locator('.text-red-500', { hasText: 'ตัวพิมพ์' });
      await expect(error).toBeVisible({ timeout: 5000 });
    });

    test('should show error for username with special characters', async ({ page }) => {
      const invalidData = generateInvalidUserData().specialCharInUsername;

      await navigateToRegister(page);
      await fillRegistrationForm(page, invalidData);
      await submitRegistrationForm(page);

      // Should show validation error
      const error = page.locator('.text-red-500', { hasText: 'ตัวอักษร' });
      await expect(error).toBeVisible({ timeout: 5000 });
    });

    test('should show error for duplicate username', async ({ page }) => {
      const userData = generateTestUser('general_user');

      // Register first time
      await navigateToRegister(page);
      await fillRegistrationForm(page, userData);
      await submitRegistrationForm(page);
      await page.waitForURL('**/', { timeout: 10000 });

      // Logout and try to register again with same username
      await page.goto('/login');
      await page.evaluate(() => localStorage.clear());

      await navigateToRegister(page);
      await fillRegistrationForm(page, userData);
      await submitRegistrationForm(page);

      // Should stay on registration page or show error
      await page.waitForTimeout(3000);
      const url = page.url();
      expect(url).toContain('register');
    });
  });

  test.describe('Form Interaction', () => {
    test('should show password strength indicator', async ({ page }) => {
      await navigateToRegister(page);

      const passwordInput = page.locator('input[name="password"]');

      // Type a password
      await passwordInput.fill('TestPassword123');
      await page.waitForTimeout(500);

      // Check for strength indicator bars or text
      const strengthBars = page.locator('.h-1.flex-1.rounded-full');
      const count = await strengthBars.count();
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
      const error = page.locator('.text-red-500', { hasText: 'ตรงกัน' });
      await expect(error).toBeVisible({ timeout: 5000 });
    });
  });
});
