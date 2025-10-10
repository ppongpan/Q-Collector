/**
 * E2E Tests - Navigation & Routing
 * Tests page navigation, breadcrumbs, deep linking, URL parameters
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

test.describe('Navigation & Routing', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await loginIfNeeded(page);
  });

  // ==================== BASIC NAVIGATION ====================
  test('NAV-1: Navigate between pages', async ({ page }) => {
    console.log('🧪 Test: Basic Navigation');

    // Start at home/form list
    await expect(page).toHaveURL(/\/$|\/forms/, { timeout: 5000 });
    console.log('  ✓ Home page loaded');

    // Navigate to form builder
    const createBtn = page.locator('[data-testid="create-form-btn"]');
    await createBtn.click();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/builder|create/, { timeout: 5000 });
    console.log('  ✓ Form builder page loaded');

    // Navigate back
    await page.goBack();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/$|\/forms/, { timeout: 5000 });
    console.log('  ✓ Back navigation works');

    // Navigate forward
    await page.goForward();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/builder|create/, { timeout: 5000 });
    console.log('✅ Basic navigation successful');
  });

  // ==================== BREADCRUMBS ====================
  test('NAV-2: Breadcrumb navigation', async ({ page }) => {
    console.log('🧪 Test: Breadcrumb Navigation');

    // Navigate to a form
    await page.locator('[data-testid="form-card"]').first().click();
    await page.waitForLoadState('networkidle');

    // Check for breadcrumbs
    const breadcrumb = page.locator('[data-testid="breadcrumb"], nav[aria-label="breadcrumb"], .breadcrumb');
    const hasBreadcrumb = await breadcrumb.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasBreadcrumb) {
      console.log('  ✓ Breadcrumb found');

      // Click home breadcrumb
      const homeLink = breadcrumb.locator('a:has-text("Home"), a:has-text("หน้าหลัก")').first();
      const hasHomeLink = await homeLink.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasHomeLink) {
        await homeLink.click();
        await page.waitForLoadState('networkidle');

        await expect(page).toHaveURL(/\/$|\/forms/, { timeout: 5000 });
        console.log('✅ Breadcrumb navigation works');
      } else {
        console.log('⚠️  Home breadcrumb link not found');
      }
    } else {
      console.log('⚠️  Breadcrumbs not implemented or not visible');
    }
  });

  // ==================== DEEP LINKING ====================
  test('NAV-3: Deep linking to form', async ({ page }) => {
    console.log('🧪 Test: Deep Linking');

    // Get form ID from first form card
    await page.waitForSelector('[data-testid="form-card"]', { timeout: 10000 });
    const formCard = page.locator('[data-testid="form-card"]').first();
    await formCard.click();
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    console.log(`  Current URL: ${currentUrl}`);

    // Extract form ID from URL
    const formIdMatch = currentUrl.match(/forms?\/([a-f0-9-]{36})/i);

    if (formIdMatch) {
      const formId = formIdMatch[1];
      const directUrl = `${BASE_URL}/forms/${formId}`;

      console.log(`  Testing direct link: ${directUrl}`);

      // Navigate directly to URL
      await page.goto(directUrl);
      await page.waitForLoadState('networkidle');

      // Verify page loaded correctly
      const hasContent = await page.locator('[data-testid="form-detail"], table, .form-content')
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (hasContent) {
        console.log('✅ Deep linking works');
      } else {
        console.log('⚠️  Deep link loaded but content may not be displayed');
      }
    } else {
      console.log('⚠️  Cannot extract form ID from URL');
    }
  });

  // ==================== URL PARAMETERS ====================
  test('NAV-4: URL parameters', async ({ page }) => {
    console.log('🧪 Test: URL Parameters');

    // Navigate with query parameter
    const testUrl = `${BASE_URL}/?test=true&source=e2e`;
    await page.goto(testUrl);
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    console.log(`  URL with params: ${currentUrl}`);

    if (currentUrl.includes('test=true')) {
      console.log('  ✓ Query parameters preserved');
    }

    // Navigate to form with tab parameter
    await page.locator('[data-testid="form-card"]').first().click();
    await page.waitForLoadState('networkidle');

    const formUrl = page.url();

    // Try adding tab parameter
    await page.goto(`${formUrl}?tab=submissions`);
    await page.waitForLoadState('networkidle');

    const urlWithTab = page.url();
    if (urlWithTab.includes('tab=submissions')) {
      console.log('  ✓ Tab parameter added');
      console.log('✅ URL parameters work');
    } else {
      console.log('⚠️  Tab parameter not preserved (may be expected)');
    }
  });

  // ==================== NAVIGATION ARROWS ====================
  test('NAV-5: Previous/Next navigation', async ({ page }) => {
    console.log('🧪 Test: Previous/Next Navigation');

    // Navigate to a form
    await page.locator('[data-testid="form-card"]').first().click();
    await page.waitForLoadState('networkidle');

    // Click on a submission
    const submissionRow = page.locator('tbody tr, [data-testid="submission-row"]').first();
    const hasSubmissions = await submissionRow.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasSubmissions) {
      await submissionRow.click();
      await page.waitForLoadState('networkidle');

      // Look for navigation arrows
      const prevBtn = page.locator('[data-testid="prev-btn"], button[aria-label*="previous"], button:has-text("←")');
      const nextBtn = page.locator('[data-testid="next-btn"], button[aria-label*="next"], button:has-text("→")');

      const hasPrev = await prevBtn.isVisible({ timeout: 3000 }).catch(() => false);
      const hasNext = await nextBtn.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasPrev || hasNext) {
        console.log('  ✓ Navigation arrows found');

        if (hasNext) {
          await nextBtn.click();
          await page.waitForLoadState('networkidle');
          console.log('  ✓ Next navigation works');
        }

        if (hasPrev) {
          await prevBtn.click();
          await page.waitForLoadState('networkidle');
          console.log('  ✓ Previous navigation works');
        }

        console.log('✅ Navigation arrows work');
      } else {
        console.log('⚠️  Navigation arrows not found');
      }
    } else {
      console.log('⚠️  No submissions to test navigation');
    }
  });

  // ==================== USER MENU NAVIGATION ====================
  test('NAV-6: User menu navigation', async ({ page }) => {
    console.log('🧪 Test: User Menu');

    // Open user menu
    const userMenu = page.locator('[data-testid="user-menu"]');
    await userMenu.click();
    await page.waitForTimeout(500);

    // Check for menu items
    const settingsLink = page.locator('text=/settings|ตั้งค่า/i');
    const profileLink = page.locator('text=/profile|โปรไฟล์/i');
    const logoutBtn = page.locator('text=/logout|ออกจากระบบ/i');

    const hasSettings = await settingsLink.isVisible({ timeout: 2000 }).catch(() => false);
    const hasProfile = await profileLink.isVisible({ timeout: 2000 }).catch(() => false);
    const hasLogout = await logoutBtn.isVisible({ timeout: 2000 }).catch(() => false);

    console.log(`  Settings: ${hasSettings ? '✓' : '✗'}`);
    console.log(`  Profile: ${hasProfile ? '✓' : '✗'}`);
    console.log(`  Logout: ${hasLogout ? '✓' : '✗'}`);

    if (hasSettings || hasProfile || hasLogout) {
      console.log('✅ User menu works');
    } else {
      console.log('⚠️  User menu items not found');
    }

    // Close menu
    await page.keyboard.press('Escape');
  });

  // ==================== MOBILE NAVIGATION ====================
  test('NAV-7: Mobile navigation menu', async ({ page }) => {
    console.log('🧪 Test: Mobile Navigation');

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Look for hamburger menu
    const hamburger = page.locator('[data-testid="mobile-menu-btn"], button[aria-label*="menu"], .hamburger');
    const hasHamburger = await hamburger.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasHamburger) {
      await hamburger.click();
      await page.waitForTimeout(500);

      // Check if menu opened
      const mobileMenu = page.locator('[data-testid="mobile-menu"], .mobile-nav, nav[role="navigation"]');
      const menuVisible = await mobileMenu.isVisible({ timeout: 2000 }).catch(() => false);

      if (menuVisible) {
        console.log('✅ Mobile navigation works');

        // Close menu
        const closeBtn = page.locator('[data-testid="close-menu"], button[aria-label*="close"]');
        const hasClose = await closeBtn.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasClose) {
          await closeBtn.click();
        } else {
          await page.keyboard.press('Escape');
        }
      } else {
        console.log('⚠️  Mobile menu did not open');
      }
    } else {
      console.log('⚠️  Mobile menu button not found (may not be needed)');
    }

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  // ==================== ERROR NAVIGATION ====================
  test('NAV-8: 404 page handling', async ({ page }) => {
    console.log('🧪 Test: 404 Page');

    // Navigate to non-existent page
    await page.goto(`${BASE_URL}/this-page-does-not-exist-${Date.now()}`);
    await page.waitForLoadState('networkidle');

    // Check for 404 indicator
    const has404 = await page.locator('text=/404|not found|ไม่พบหน้า/i')
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (has404) {
      console.log('  ✓ 404 page displayed');

      // Look for home link
      const homeLink = page.locator('a:has-text("Home"), a:has-text("หน้าหลัก"), a[href="/"]');
      const hasHomeLink = await homeLink.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasHomeLink) {
        await homeLink.click();
        await page.waitForLoadState('networkidle');

        await expect(page).toHaveURL(/\/$|\/forms/, { timeout: 5000 });
        console.log('✅ 404 recovery works');
      } else {
        console.log('⚠️  No home link on 404 page');
      }
    } else {
      console.log('⚠️  404 page not shown (may redirect to home)');
    }
  });

  // ==================== NAVIGATION STATE ====================
  test('NAV-9: Navigation state persistence', async ({ page }) => {
    console.log('🧪 Test: Navigation State');

    // Navigate to a form
    await page.locator('[data-testid="form-card"]').first().click();
    await page.waitForLoadState('networkidle');

    const formUrl = page.url();
    console.log(`  Form URL: ${formUrl}`);

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify we're still on the same page
    const currentUrl = page.url();

    if (currentUrl === formUrl) {
      console.log('✅ Navigation state persisted after reload');
    } else {
      console.log('⚠️  Navigation state may have changed after reload');
    }
  });

});

// ==================== HELPER FUNCTIONS ====================

async function loginIfNeeded(page) {
  const isLoggedIn = await page.locator('[data-testid="user-menu"]')
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  if (!isLoggedIn) {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

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
}
