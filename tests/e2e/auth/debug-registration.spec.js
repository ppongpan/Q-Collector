/**
 * Debug Registration Test
 * Simple test to debug registration form issues
 */

const { test, expect } = require('@playwright/test');

test('debug registration form elements', async ({ page }) => {
  // Navigate to registration page
  await page.goto('/register');
  await page.waitForURL('**/register');

  console.log('=== Page loaded ===');
  console.log('URL:', page.url());

  // Check if all form fields exist
  const username = await page.locator('input[name="username"]');
  const email = await page.locator('input[name="email"]');
  const fullName = await page.locator('input[name="full_name"]');
  const password = await page.locator('input[name="password"]');
  const confirmPassword = await page.locator('input[name="confirmPassword"]');
  const department = await page.locator('select[name="department"]');
  const submit = await page.locator('button[type="submit"]');

  console.log('=== Form Elements ===');
  console.log('Username field exists:', await username.count());
  console.log('Email field exists:', await email.count());
  console.log('Full name field exists:', await fullName.count());
  console.log('Password field exists:', await password.count());
  console.log('Confirm password field exists:', await confirmPassword.count());
  console.log('Department field exists:', await department.count());
  console.log('Submit button exists:', await submit.count());

  // Try to fill the form
  console.log('=== Filling Form ===');

  const testData = {
    username: 'testuser123',
    email: 'testuser123@test.com',
    full_name: 'Test User',
    password: 'TestPassword123',
    department: 'others'
  };

  await username.fill(testData.username);
  console.log('Username filled');

  await email.fill(testData.email);
  console.log('Email filled');

  await fullName.fill(testData.full_name);
  console.log('Full name filled');

  await password.fill(testData.password);
  console.log('Password filled');

  await confirmPassword.fill(testData.password);
  console.log('Confirm password filled');

  await department.selectOption(testData.department);
  console.log('Department selected');

  // Wait a moment
  await page.waitForTimeout(1000);

  // Take screenshot before submit
  await page.screenshot({ path: 'test-results/before-submit.png' });
  console.log('Screenshot taken');

  // Click submit
  console.log('=== Clicking Submit ===');
  await submit.click();
  console.log('Submit clicked');

  // Wait a moment
  await page.waitForTimeout(3000);

  // Take screenshot after submit
  await page.screenshot({ path: 'test-results/after-submit.png' });
  console.log('URL after submit:', page.url());

  // Check for error messages
  const errorMessages = await page.locator('.text-red-500').allTextContents();
  console.log('Error messages:', errorMessages);

  // Check if still on registration page
  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);

  if (currentUrl.includes('register')) {
    console.log('Still on registration page - check for errors');
  } else {
    console.log('Redirected successfully!');
  }
});
