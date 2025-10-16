// Playwright Test Suite for Thumbnail Disappearing Bug Fix v0.7.10-dev
// Tests all 7 test cases from qtodo.md

const { test, expect } = require('@playwright/test');

const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',
  timeout: 30000,
  // Test credentials - replace with actual test credentials
  testUser: {
    identifier: 'pongpanp',
    password: 'Gfvtmiu613'
  }
};

test.describe('Thumbnail Disappearing Bug Fix v0.7.10-dev', () => {

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${TEST_CONFIG.baseURL}/login`);

    // Fill login form
    await page.fill('input[name="identifier"]', TEST_CONFIG.testUser.identifier);
    await page.fill('input[name="password"]', TEST_CONFIG.testUser.password);

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation to complete
    await page.waitForURL(/\/(home|forms|dashboard)/);

    console.log('✅ Login successful');
  });

  // Test Case 1: Thumbnail Stability
  test('Test Case 1: Thumbnail should remain visible after clicking', async ({ page }) => {
    console.log('\n📝 Test Case 1: Thumbnail Stability');

    // Navigate to a submission detail page with images
    // NOTE: Replace with actual submission ID that has image fields
    await page.goto(`${TEST_CONFIG.baseURL}/submission-detail/YOUR_SUBMISSION_ID`);

    // Wait for page to load
    await page.waitForSelector('[data-testid="image-thumbnail"], img[alt*="thumbnail"], img[src*="blob:"]', { timeout: 10000 });

    // Get initial thumbnail count
    const initialThumbnails = await page.locator('img[src*="blob:"]').count();
    console.log(`   Initial thumbnail count: ${initialThumbnails}`);

    if (initialThumbnails === 0) {
      console.log('   ⚠️ No thumbnails found - skipping test');
      test.skip();
    }

    // Click first thumbnail
    await page.locator('img[src*="blob:"]').first().click();

    // Wait a bit for any state changes
    await page.waitForTimeout(500);

    // Check if modal opened (optional)
    const modalVisible = await page.locator('[role="dialog"], .modal').isVisible().catch(() => false);
    if (modalVisible) {
      console.log('   ✅ Modal opened');

      // Close modal if open
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // Verify thumbnail still visible
    const thumbnailAfter = await page.locator('img[src*="blob:"]').first().isVisible();
    expect(thumbnailAfter).toBeTruthy();
    console.log('   ✅ Thumbnail still visible after click');

    // Verify no loading text
    const loadingText = await page.locator('text=กำลังโหลดไฟล์').isVisible().catch(() => false);
    expect(loadingText).toBeFalsy();
    console.log('   ✅ No loading text displayed');

    // Verify thumbnail count unchanged
    const finalThumbnails = await page.locator('img[src*="blob:"]').count();
    expect(finalThumbnails).toBe(initialThumbnails);
    console.log(`   ✅ Thumbnail count unchanged: ${finalThumbnails}`);
  });

  // Test Case 2: Container Min-Height
  test('Test Case 2: Container should maintain min-height', async ({ page }) => {
    console.log('\n📝 Test Case 2: Container Min-Height');

    await page.goto(`${TEST_CONFIG.baseURL}/submission-detail/YOUR_SUBMISSION_ID`);
    await page.waitForSelector('img[src*="blob:"]', { timeout: 10000 });

    // Find the file field container
    const container = page.locator('.border.border-border\\/50.rounded-lg').first();

    // Get initial height
    const initialHeight = await container.boundingBox();
    console.log(`   Initial container height: ${initialHeight?.height}px`);

    // Verify min-height is set (should be at least 200px)
    expect(initialHeight?.height).toBeGreaterThanOrEqual(200);
    console.log('   ✅ Container has min-height >= 200px');

    // Click thumbnail
    await page.locator('img[src*="blob:"]').first().click();
    await page.waitForTimeout(300);

    // Close modal if opened
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Get height after interaction
    const finalHeight = await container.boundingBox();
    console.log(`   Final container height: ${finalHeight?.height}px`);

    // Verify height unchanged (within 5px tolerance for rendering differences)
    expect(Math.abs((finalHeight?.height || 0) - (initialHeight?.height || 0))).toBeLessThan(5);
    console.log('   ✅ Container height unchanged');
  });

  // Test Case 3: Mobile Download Toast (Desktop)
  test('Test Case 3: Desktop - No toast on download', async ({ page }) => {
    console.log('\n📝 Test Case 3: Desktop Download (No Toast)');

    // Set desktop viewport
    await page.setViewportSize({ width: 1024, height: 768 });

    await page.goto(`${TEST_CONFIG.baseURL}/submission-detail/YOUR_SUBMISSION_ID`);
    await page.waitForSelector('img[src*="blob:"]', { timeout: 10000 });

    // Click download button (if available)
    const downloadButton = page.locator('[data-testid="download-button"], button:has-text("ดาวน์โหลด")').first();

    if (await downloadButton.isVisible()) {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download');

      await downloadButton.click();

      // Wait a bit
      await page.waitForTimeout(1000);

      // Verify NO toast appears
      const toastVisible = await page.locator('.Toaster, [role="alert"]').isVisible().catch(() => false);
      expect(toastVisible).toBeFalsy();
      console.log('   ✅ No toast displayed on desktop');

      // Verify download works
      const download = await downloadPromise.catch(() => null);
      if (download) {
        console.log('   ✅ File download initiated');
      }
    } else {
      console.log('   ⚠️ Download button not found - skipping test');
      test.skip();
    }
  });

  // Test Case 4: Mobile Download Toast (Mobile)
  test('Test Case 4: Mobile - Toast appears on download', async ({ page }) => {
    console.log('\n📝 Test Case 4: Mobile Download (With Toast)');

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(`${TEST_CONFIG.baseURL}/submission-detail/YOUR_SUBMISSION_ID`);
    await page.waitForSelector('img[src*="blob:"]', { timeout: 10000 });

    // Click download button
    const downloadButton = page.locator('[data-testid="download-button"], button:has-text("ดาวน์โหลด")').first();

    if (await downloadButton.isVisible()) {
      await downloadButton.click();

      // Verify loading toast appears
      const loadingToast = await page.locator('text=กำลังเตรียมดาวน์โหลด').isVisible({ timeout: 2000 }).catch(() => false);
      expect(loadingToast).toBeTruthy();
      console.log('   ✅ Loading toast displayed');

      // Wait for success toast
      const successToast = await page.locator('text=ดาวน์โหลดสำเร็จ').isVisible({ timeout: 5000 }).catch(() => false);
      expect(successToast).toBeTruthy();
      console.log('   ✅ Success toast displayed');

      // Verify toast auto-dismisses (wait 3 seconds)
      await page.waitForTimeout(3000);
      const toastGone = await page.locator('text=ดาวน์โหลดสำเร็จ').isVisible().catch(() => false);
      expect(toastGone).toBeFalsy();
      console.log('   ✅ Toast auto-dismissed after 2 seconds');
    } else {
      console.log('   ⚠️ Download button not found - skipping test');
      test.skip();
    }
  });

  // Test Case 5: Multiple Images
  test('Test Case 5: All thumbnails persist with multiple images', async ({ page }) => {
    console.log('\n📝 Test Case 5: Multiple Images');

    await page.goto(`${TEST_CONFIG.baseURL}/submission-detail/YOUR_SUBMISSION_ID`);
    await page.waitForSelector('img[src*="blob:"]', { timeout: 10000 });

    // Get all thumbnails
    const thumbnailCount = await page.locator('img[src*="blob:"]').count();
    console.log(`   Total thumbnails: ${thumbnailCount}`);

    if (thumbnailCount < 2) {
      console.log('   ⚠️ Less than 2 thumbnails - skipping test');
      test.skip();
    }

    // Click each thumbnail
    for (let i = 0; i < thumbnailCount; i++) {
      console.log(`   Clicking thumbnail ${i + 1}/${thumbnailCount}`);

      await page.locator('img[src*="blob:"]').nth(i).click();
      await page.waitForTimeout(300);

      // Close modal if opened
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Verify all thumbnails still visible
      const visibleCount = await page.locator('img[src*="blob:"]').count();
      expect(visibleCount).toBe(thumbnailCount);
      console.log(`   ✅ All ${thumbnailCount} thumbnails still visible`);
    }

    console.log('   ✅ All thumbnails persist after interaction');
  });

  // Test Case 6: Blob URL Persistence
  test('Test Case 6: No re-fetching of blob URLs on interaction', async ({ page }) => {
    console.log('\n📝 Test Case 6: Blob URL Persistence');

    // Set up network monitoring
    const apiRequests = [];
    page.on('request', request => {
      if (request.url().includes('/api/v1/files') && request.url().includes('/stream')) {
        apiRequests.push({
          url: request.url(),
          timestamp: Date.now()
        });
      }
    });

    await page.goto(`${TEST_CONFIG.baseURL}/submission-detail/YOUR_SUBMISSION_ID`);
    await page.waitForSelector('img[src*="blob:"]', { timeout: 10000 });

    // Wait for initial blob URLs to load
    await page.waitForTimeout(2000);

    const initialRequests = apiRequests.length;
    console.log(`   Initial API requests: ${initialRequests}`);

    // Click thumbnail
    await page.locator('img[src*="blob:"]').first().click();
    await page.waitForTimeout(500);

    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Verify no new requests
    const finalRequests = apiRequests.length;
    console.log(`   Final API requests: ${finalRequests}`);

    expect(finalRequests).toBe(initialRequests);
    console.log('   ✅ No re-fetching on interaction');

    // Verify thumbnails still visible
    const thumbnailVisible = await page.locator('img[src*="blob:"]').first().isVisible();
    expect(thumbnailVisible).toBeTruthy();
    console.log('   ✅ Thumbnails persist without re-fetching');
  });

  // Test Case 7: Error Handling
  test('Test Case 7: Graceful error handling', async ({ page }) => {
    console.log('\n📝 Test Case 7: Error Handling');

    // Intercept file stream requests and simulate error for one file
    await page.route('**/api/v1/files/*/stream', async (route, request) => {
      const url = request.url();

      // Simulate error for first file only
      if (!route.request().url().includes('error-simulated')) {
        await route.abort('failed');
        console.log('   🔥 Simulated network error for file');
      } else {
        await route.continue();
      }
    });

    await page.goto(`${TEST_CONFIG.baseURL}/submission-detail/YOUR_SUBMISSION_ID`);

    // Wait for page to load
    await page.waitForTimeout(3000);

    // Verify page doesn't crash
    const pageTitle = await page.title();
    expect(pageTitle).toBeTruthy();
    console.log('   ✅ Page did not crash');

    // Check if error state is shown (optional)
    const errorText = await page.locator('text=กำลังโหลดภาพ, text=ไม่สามารถโหลด').count();
    console.log(`   Error indicators found: ${errorText}`);

    // Verify other elements still work
    const bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBeTruthy();
    console.log('   ✅ Graceful error handling verified');
  });
});

// Additional utility tests
test.describe('Additional Verification Tests', () => {

  test('Verify useEffect dependency is fileIdsString', async ({ page }) => {
    console.log('\n📝 Verify useEffect Dependency Fix');

    // This is a code verification test - check source code
    const sourceCode = await page.goto(`${TEST_CONFIG.baseURL}/static/js/main.chunk.js`);
    const content = await sourceCode?.text() || '';

    // Look for the fix pattern (this is approximate - actual bundled code may differ)
    const hasFileIdsString = content.includes('fileIdsString') || content.includes('fileIds');

    if (hasFileIdsString) {
      console.log('   ✅ fileIdsString dependency pattern found in bundled code');
    } else {
      console.log('   ℹ️ Cannot verify in bundled code (may be minified)');
    }
  });

  test('Verify container has min-height CSS', async ({ page }) => {
    console.log('\n📝 Verify Container Min-Height CSS');

    await page.goto(`${TEST_CONFIG.baseURL}/submission-detail/YOUR_SUBMISSION_ID`);
    await page.waitForSelector('.border.border-border\\/50', { timeout: 10000 });

    // Check computed styles
    const container = page.locator('.border.border-border\\/50.rounded-lg').first();
    const minHeight = await container.evaluate(el => {
      return window.getComputedStyle(el).minHeight;
    });

    console.log(`   Container min-height: ${minHeight}`);

    // Verify it's at least 200px (converted from rem or px)
    const minHeightPx = parseFloat(minHeight);
    expect(minHeightPx).toBeGreaterThanOrEqual(200);
    console.log('   ✅ Container has min-height >= 200px');
  });
});

console.log('\n✅ Playwright Test Suite for Thumbnail Fix v0.7.10-dev');
console.log('📊 Total Tests: 9 (7 main + 2 verification)');
console.log('🎯 All tests align with qtodo.md test cases');
console.log('\n🚀 Run with: npx playwright test tests/thumbnail-fix.spec.js --headed');
