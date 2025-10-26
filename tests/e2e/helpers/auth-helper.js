/**
 * Authentication Helper for E2E Tests
 * Q-Collector v0.8.2-dev
 *
 * @description Helper functions for authentication in E2E tests
 */

/**
 * Login to the application
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} username - Username
 * @param {string} password - Password
 */
async function login(page, username = 'admin', password = 'admin123') {
  await page.goto('/login');

  // Wait for login form
  await page.waitForSelector('input[type="text"], input[name="username"]', { timeout: 10000 });

  // Fill in credentials
  await page.fill('input[type="text"], input[name="username"]', username);
  await page.fill('input[type="password"], input[name="password"]', password);

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for navigation to complete
  await page.waitForURL(/\/(dashboard|forms|home)/, { timeout: 30000 });

  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to Personal Data Dashboard
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
async function navigateToPersonalDataDashboard(page) {
  // Click on user menu (support both admin and pongpanp)
  await page.click('[data-testid="user-menu"], .user-menu, button:has-text("admin"), button:has-text("pongpanp")');

  // Wait for menu to open
  await page.waitForTimeout(500);

  // Click on "จัดการข้อมูลส่วนบุคคล" menu item
  const pdpaMenuItemSelectors = [
    'text=จัดการข้อมูลส่วนบุคคล',
    '[data-testid="pdpa-menu-item"]',
    'a:has-text("จัดการข้อมูลส่วนบุคคล")',
    'button:has-text("จัดการข้อมูลส่วนบุคคล")'
  ];

  for (const selector of pdpaMenuItemSelectors) {
    try {
      await page.click(selector, { timeout: 2000 });
      break;
    } catch (e) {
      continue;
    }
  }

  // Wait for dashboard to load
  await page.waitForLoadState('networkidle');

  // Verify we're on the dashboard
  await page.waitForSelector('text=Personal Data Management Dashboard', { timeout: 10000 });
}

/**
 * Logout from the application
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
async function logout(page) {
  // Click user menu
  await page.click('[data-testid="user-menu"], .user-menu, button:has-text("admin")');

  // Wait for menu
  await page.waitForTimeout(500);

  // Click logout
  const logoutSelectors = [
    'text=ออกจากระบบ',
    '[data-testid="logout-button"]',
    'button:has-text("Logout")'
  ];

  for (const selector of logoutSelectors) {
    try {
      await page.click(selector, { timeout: 2000 });
      break;
    } catch (e) {
      continue;
    }
  }

  // Wait for redirect to login
  await page.waitForURL('**/login', { timeout: 10000 });
}

module.exports = {
  login,
  navigateToPersonalDataDashboard,
  logout
};
