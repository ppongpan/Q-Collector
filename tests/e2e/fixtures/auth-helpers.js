/**
 * Authentication Helper Functions
 * Reusable functions for auth-related E2E tests
 *
 * @version 0.7.0
 * @since 2025-10-02
 */

/**
 * Navigate to registration page
 * @param {Page} page - Playwright page object
 */
async function navigateToRegister(page) {
  await page.goto('/register');
  await page.waitForURL('**/register');
}

/**
 * Navigate to login page
 * @param {Page} page - Playwright page object
 */
async function navigateToLogin(page) {
  await page.goto('/login');
  await page.waitForURL('**/login');
}

/**
 * Fill registration form
 * @param {Page} page - Playwright page object
 * @param {Object} userData - User data to fill
 */
async function fillRegistrationForm(page, userData) {
  // Fill username
  await page.fill('input[name="username"]', userData.username);

  // Fill email
  await page.fill('input[name="email"]', userData.email);

  // Fill full name
  await page.fill('input[name="full_name"]', userData.full_name);

  // Fill password
  await page.fill('input[name="password"]', userData.password);

  // Fill confirm password
  await page.fill('input[name="confirmPassword"]', userData.password);

  // Select department (if provided)
  if (userData.department) {
    await page.selectOption('select[name="department"]', userData.department);
  }
}

/**
 * Submit registration form
 * @param {Page} page - Playwright page object
 */
async function submitRegistrationForm(page) {
  await page.click('button[type="submit"]');
}

/**
 * Register new user
 * @param {Page} page - Playwright page object
 * @param {Object} userData - User data
 * @returns {Promise<boolean>} Success status
 */
async function registerUser(page, userData) {
  await navigateToRegister(page);
  await fillRegistrationForm(page, userData);
  await submitRegistrationForm(page);

  // Wait for navigation to home page (successful registration)
  try {
    await page.waitForURL('**/', { timeout: 10000 });
    return true;
  } catch (error) {
    // Registration failed - check for error message
    return false;
  }
}

/**
 * Fill login form
 * @param {Page} page - Playwright page object
 * @param {string} identifier - Username or email
 * @param {string} password - Password
 */
async function fillLoginForm(page, identifier, password) {
  await page.fill('input[name="username"]', identifier);
  await page.fill('input[name="password"]', password);
}

/**
 * Submit login form
 * @param {Page} page - Playwright page object
 */
async function submitLoginForm(page) {
  await page.click('button[type="submit"]');
}

/**
 * Login user
 * @param {Page} page - Playwright page object
 * @param {string} identifier - Username or email
 * @param {string} password - Password
 * @returns {Promise<boolean>} Success status
 */
async function loginUser(page, identifier, password) {
  await navigateToLogin(page);
  await fillLoginForm(page, identifier, password);
  await submitLoginForm(page);

  // Wait for either home page or 2FA page
  try {
    await Promise.race([
      page.waitForURL('**/', { timeout: 10000 }),
      page.waitForSelector('[data-testid="2fa-verification"]', { timeout: 10000 })
    ]);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Logout user
 * @param {Page} page - Playwright page object
 */
async function logoutUser(page) {
  // Click user menu
  await page.click('[data-testid="user-menu-button"]');

  // Click logout
  await page.click('[data-testid="logout-button"]');

  // Wait for redirect to login
  await page.waitForURL('**/login');
}

/**
 * Check if user is authenticated
 * @param {Page} page - Playwright page object
 * @returns {Promise<boolean>} Authentication status
 */
async function isAuthenticated(page) {
  // Check for user menu presence
  const userMenu = await page.locator('[data-testid="user-menu-button"]').count();
  return userMenu > 0;
}

/**
 * Get current user from UI
 * @param {Page} page - Playwright page object
 * @returns {Promise<Object|null>} User object or null
 */
async function getCurrentUser(page) {
  if (!(await isAuthenticated(page))) {
    return null;
  }

  // Open user menu to see username
  await page.click('[data-testid="user-menu-button"]');

  // Get username text
  const username = await page.locator('[data-testid="user-menu-username"]').textContent();

  return {
    username: username?.trim() || null
  };
}

/**
 * Verify user role
 * @param {Page} page - Playwright page object
 * @param {string} expectedRole - Expected role
 * @returns {Promise<boolean>} Role verification status
 */
async function verifyUserRole(page, expectedRole) {
  // Navigate to settings or user management to see role
  // For now, check menu items that are role-specific
  const canCreateForms = await page.locator('[data-testid="create-form-button"]').count() > 0;
  const canManageUsers = await page.locator('[data-testid="user-management-link"]').count() > 0;

  // Role-based checks
  const rolePermissions = {
    super_admin: { canCreateForms: true, canManageUsers: true },
    admin: { canCreateForms: true, canManageUsers: true },
    
    customer_service: { canCreateForms: false, canManageUsers: false },
    sales: { canCreateForms: false, canManageUsers: false },
    marketing: { canCreateForms: false, canManageUsers: false },
    technic: { canCreateForms: false, canManageUsers: false },
    general_user: { canCreateForms: false, canManageUsers: false }
  };

  const expected = rolePermissions[expectedRole];
  if (!expected) return false;

  return canCreateForms === expected.canCreateForms &&
         canManageUsers === expected.canManageUsers;
}

/**
 * Wait for toast message
 * @param {Page} page - Playwright page object
 * @param {string} expectedText - Expected toast text (optional)
 * @returns {Promise<string>} Toast text
 */
async function waitForToast(page, expectedText = null) {
  const toast = await page.locator('[role="alert"], [data-testid="toast"]').first();
  await toast.waitFor({ state: 'visible', timeout: 5000 });

  const text = await toast.textContent();

  if (expectedText && !text.includes(expectedText)) {
    throw new Error(`Expected toast to contain "${expectedText}", but got "${text}"`);
  }

  return text;
}

/**
 * Wait for validation error
 * @param {Page} page - Playwright page object
 * @param {string} fieldName - Field name
 * @returns {Promise<string>} Error message
 */
async function getValidationError(page, fieldName) {
  const errorLocator = page.locator(`[data-testid="${fieldName}-error"]`);
  await errorLocator.waitFor({ state: 'visible', timeout: 5000 });
  return await errorLocator.textContent();
}

module.exports = {
  // Navigation
  navigateToRegister,
  navigateToLogin,

  // Registration
  fillRegistrationForm,
  submitRegistrationForm,
  registerUser,

  // Login
  fillLoginForm,
  submitLoginForm,
  loginUser,
  logoutUser,

  // Authentication state
  isAuthenticated,
  getCurrentUser,
  verifyUserRole,

  // UI helpers
  waitForToast,
  getValidationError
};
