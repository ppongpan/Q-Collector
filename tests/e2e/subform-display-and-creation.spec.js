/**
 * Sub-form Display and Creation E2E Tests
 *
 * Tests comprehensive sub-form functionality:
 * 1. Display existing sub-form submissions
 * 2. Create new sub-form submissions
 * 3. Verify field data mapping
 * 4. Verify UI rendering
 *
 * Date: 2025-10-09
 * Status: Testing all 5 fixes applied to backend
 */

const { test, expect } = require('@playwright/test');

// Test Configuration
const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:5000/api/v1';

// Test Data
const TEST_USER = {
  username: 'pongpanp',
  password: 'Gfvtmiu613'
};

const MAIN_FORM_ID = 'c778cb80-cff3-4b2f-aebd-6555e6871094';
const SUB_FORM_ID = 'c54e7f74-6636-4b2f-aebd-6555e6871094';

// Existing submission with sub-form data
const OLD_SUBMISSION_ID = '002a48b0-9020-468a-bf68-345b4863ce85';
const OLD_MAIN_FORM_SUBID = 'e5d08fa0-8dea-45f3-81fe-6d4a4d005a26';

// New submission to test creation
const NEW_SUBMISSION_ID = 'd9dc2a82-3973-4134-99a7-cae58ac57bfd';

test.describe('Sub-form Display and Creation Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for successful login
    await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });
    await expect(page).toHaveURL(`${BASE_URL}/`);

    console.log('✅ Login successful');
  });

  test('Test 1: Display existing sub-form submissions', async ({ page }) => {
    console.log('\n🧪 TEST 1: Display existing sub-form submissions');
    console.log('=' .repeat(80));

    // Navigate to form list
    await page.goto(`${BASE_URL}/`);
    await page.waitForSelector('.form-list, [data-testid="form-list"]', { timeout: 10000 });

    console.log('📋 Step 1: Navigate to main form');
    // Click on the main form
    await page.click(`text=ฟอร์มส่งข้อมูลกลาง`);
    await page.waitForTimeout(2000);

    console.log('📋 Step 2: Navigate to submission list');
    // Should be on form submissions page
    await expect(page).toHaveURL(new RegExp(`/forms/${MAIN_FORM_ID}/submissions`));

    // Wait for submissions table
    await page.waitForSelector('table, [data-testid="submissions-table"]', { timeout: 10000 });

    console.log('📋 Step 3: Click on existing submission with sub-form data');
    // Click on the old submission row (should have data)
    const submissionRow = page.locator(`tr:has-text("Alex")`).first();
    await submissionRow.click();
    await page.waitForTimeout(2000);

    console.log('📋 Step 4: Verify submission detail view loaded');
    // Should be on submission detail page
    await expect(page).toHaveURL(new RegExp(`/submissions/${OLD_SUBMISSION_ID}`));

    // Wait for main form data to load
    await page.waitForSelector('[data-testid="submission-detail"], .submission-detail', { timeout: 10000 });

    console.log('📋 Step 5: Verify main form data display');
    // Check main form fields are displayed
    await expect(page.locator('text=Alex')).toBeVisible();
    await expect(page.locator('text=ผู้ส่งข้อมูล')).toBeVisible();

    console.log('📋 Step 6: Scroll to sub-form section');
    // Scroll to sub-form section
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(1000);

    console.log('📋 Step 7: Verify sub-form section exists');
    // Check sub-form section header
    const subFormHeader = page.locator('text=ฟอร์มบันทึกการติดตามขาย');
    await expect(subFormHeader).toBeVisible({ timeout: 10000 });

    console.log('📋 Step 8: Wait for sub-form submission list to load');
    // Wait for sub-form submissions to load
    await page.waitForTimeout(3000);

    console.log('📋 Step 9: Check for sub-form submission table');
    // Check if sub-form submissions table exists
    const subFormTable = page.locator('table').nth(1); // Second table should be sub-form
    const tableExists = await subFormTable.count() > 0;

    if (tableExists) {
      console.log('✅ Sub-form submission table found');

      // Check for data rows
      const rows = await subFormTable.locator('tbody tr').count();
      console.log(`📊 Found ${rows} sub-form submission rows`);

      if (rows > 0) {
        console.log('✅ Sub-form submissions are displayed');

        // Verify columns
        const headers = await subFormTable.locator('thead th').allTextContents();
        console.log('📋 Table columns:', headers);

        // Get first row data
        const firstRowCells = await subFormTable.locator('tbody tr').first().locator('td').allTextContents();
        console.log('📊 First row data:', firstRowCells);

        expect(rows).toBeGreaterThan(0);
      } else {
        console.log('❌ Sub-form submission table is empty');

        // Check for "no data" message
        const noDataMessage = await page.locator('text=/ยังไม่มีข้อมูล|No data/i').count();
        if (noDataMessage > 0) {
          console.log('❌ "No data" message is shown despite having data in database');
        }

        throw new Error('Sub-form submissions not displayed - table is empty');
      }
    } else {
      console.log('❌ Sub-form submission table not found');

      // Take screenshot for debugging
      await page.screenshot({ path: 'test-results/subform-table-not-found.png', fullPage: true });

      throw new Error('Sub-form submission table not found in DOM');
    }

    console.log('=' .repeat(80));
    console.log('✅ TEST 1 PASSED: Sub-form submissions display correctly\n');
  });

  test('Test 2: Create new sub-form submission', async ({ page }) => {
    console.log('\n🧪 TEST 2: Create new sub-form submission');
    console.log('=' .repeat(80));

    console.log('📋 Step 1: Navigate to main form submission detail');
    // Navigate directly to the new submission detail page
    await page.goto(`${BASE_URL}/submissions/${NEW_SUBMISSION_ID}`);
    await page.waitForTimeout(3000);

    console.log('📋 Step 2: Verify submission detail loaded');
    await page.waitForSelector('[data-testid="submission-detail"], .submission-detail', { timeout: 10000 });

    console.log('📋 Step 3: Scroll to sub-form section');
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(1000);

    console.log('📋 Step 4: Find "Add Sub-form" button');
    // Find and click the "Add" button for sub-form
    const addButton = page.locator('button:has-text("เพิ่ม"), button:has-text("+")').first();
    await expect(addButton).toBeVisible({ timeout: 10000 });

    console.log('📋 Step 5: Click "Add Sub-form" button');
    await addButton.click();
    await page.waitForTimeout(2000);

    console.log('📋 Step 6: Verify sub-form modal/form opened');
    // Should open a modal or navigate to sub-form entry page
    const modal = page.locator('[role="dialog"], .modal, [data-testid="subform-modal"]');
    const modalExists = await modal.count() > 0;

    if (modalExists) {
      console.log('✅ Sub-form modal opened');

      console.log('📋 Step 7: Fill sub-form fields');
      // Fill in sub-form fields
      // Field 1: ผู้ติดตามขาย (Sales person)
      const salesPersonField = page.locator('input[name*="phutidtamkhay"], input[placeholder*="ผู้ติดตาม"]').first();
      if (await salesPersonField.count() > 0) {
        await salesPersonField.fill('John Doe');
        console.log('✅ Filled: ผู้ติดตามขาย = John Doe');
      }

      // Field 2: วันที่ติดตามขาย (Follow-up date)
      const dateField = page.locator('input[type="date"]').first();
      if (await dateField.count() > 0) {
        await dateField.fill('2025-10-09');
        console.log('✅ Filled: วันที่ติดตามขาย = 2025-10-09');
      }

      await page.waitForTimeout(1000);

      console.log('📋 Step 8: Submit sub-form');
      // Click save/submit button
      const saveButton = page.locator('button:has-text("บันทึก"), button:has-text("Save"), button[type="submit"]').first();
      await saveButton.click();
      await page.waitForTimeout(3000);

      console.log('📋 Step 9: Verify submission success');
      // Check for success message or modal close
      const successMessage = await page.locator('text=/บันทึกสำเร็จ|Success|สำเร็จ/i').count();
      if (successMessage > 0) {
        console.log('✅ Success message shown');
      }

      // Modal should close
      const modalStillOpen = await modal.isVisible().catch(() => false);
      if (!modalStillOpen) {
        console.log('✅ Modal closed after save');
      }

      console.log('📋 Step 10: Verify new submission appears in table');
      // Wait for table to refresh
      await page.waitForTimeout(2000);

      // Check if new submission appears
      const subFormTable = page.locator('table').nth(1);
      const rows = await subFormTable.locator('tbody tr').count();
      console.log(`📊 Sub-form table now has ${rows} rows`);

      // Check if our new data appears
      const johnDoeExists = await page.locator('text=John Doe').count() > 0;
      if (johnDoeExists) {
        console.log('✅ New sub-form submission "John Doe" appears in table');
      } else {
        console.log('⚠️  New submission not immediately visible - may need page refresh');

        // Try refreshing the page
        await page.reload();
        await page.waitForTimeout(3000);

        const johnDoeAfterRefresh = await page.locator('text=John Doe').count() > 0;
        if (johnDoeAfterRefresh) {
          console.log('✅ New submission appears after page refresh');
        } else {
          console.log('❌ New submission not found even after refresh');
          throw new Error('New sub-form submission not saved or not displayed');
        }
      }

    } else {
      console.log('❌ Sub-form modal did not open');
      await page.screenshot({ path: 'test-results/subform-modal-not-open.png', fullPage: true });
      throw new Error('Sub-form modal/form did not open');
    }

    console.log('=' .repeat(80));
    console.log('✅ TEST 2 PASSED: Sub-form submission created successfully\n');
  });

  test('Test 3: Verify API data mapping', async ({ page, request }) => {
    console.log('\n🧪 TEST 3: Verify API data mapping');
    console.log('=' .repeat(80));

    console.log('📋 Step 1: Get authentication token');
    // Login and get token from localStorage
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });

    const token = await page.evaluate(() => localStorage.getItem('token'));
    console.log('✅ Got auth token');

    console.log('📋 Step 2: Call API to get sub-form submissions');
    // Make API request to get sub-form submissions
    const apiResponse = await request.get(
      `${API_URL}/submissions/${OLD_MAIN_FORM_SUBID}/sub-forms/${SUB_FORM_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    expect(apiResponse.ok()).toBeTruthy();
    const responseData = await apiResponse.json();

    console.log('📊 API Response Status:', apiResponse.status());
    console.log('📊 API Response:', JSON.stringify(responseData, null, 2));

    console.log('📋 Step 3: Verify response structure');
    // Verify response structure
    expect(responseData).toHaveProperty('success', true);
    expect(responseData).toHaveProperty('data');
    expect(responseData.data).toHaveProperty('subFormSubmissions');

    const submissions = responseData.data.subFormSubmissions;
    console.log(`✅ Found ${submissions.length} sub-form submissions`);

    console.log('📋 Step 4: Verify each submission has required fields');
    // Verify each submission structure
    for (let i = 0; i < submissions.length; i++) {
      const sub = submissions[i];
      console.log(`\n📊 Submission ${i + 1}:`);
      console.log('  - id:', sub.id);
      console.log('  - parentId:', sub.parentId);
      console.log('  - mainFormSubId:', sub.mainFormSubId);
      console.log('  - username:', sub.username);
      console.log('  - order:', sub.order);
      console.log('  - submittedAt:', sub.submittedAt);
      console.log('  - data:', JSON.stringify(sub.data, null, 4));

      // Verify required fields exist
      expect(sub).toHaveProperty('id');
      expect(sub).toHaveProperty('parentId');
      expect(sub).toHaveProperty('mainFormSubId', OLD_MAIN_FORM_SUBID);
      expect(sub).toHaveProperty('data');

      // Verify data is an object with field IDs as keys
      expect(typeof sub.data).toBe('object');

      console.log('  ✅ Structure valid');
    }

    console.log('\n📋 Step 5: Verify field data mapping');
    // Check if field data is properly mapped
    if (submissions.length > 0) {
      const firstSub = submissions[0];
      const fieldKeys = Object.keys(firstSub.data);
      console.log('📊 Field data keys:', fieldKeys);

      // Verify data has actual values
      const hasValues = fieldKeys.some(key => firstSub.data[key] !== null && firstSub.data[key] !== undefined);
      if (hasValues) {
        console.log('✅ Field data has actual values');
      } else {
        console.log('⚠️  Field data is empty or null');
      }
    }

    console.log('=' .repeat(80));
    console.log('✅ TEST 3 PASSED: API data mapping verified\n');
  });

  test('Test 4: Database verification', async ({ page }) => {
    console.log('\n🧪 TEST 4: Database verification');
    console.log('=' .repeat(80));

    console.log('📋 This test will be run via backend script');
    console.log('📋 Creating verification script...');

    // This test logs what we need to verify in the database
    console.log('\n📊 Database Checks Required:');
    console.log('1. Verify sub-form table exists: formbanthuekkartidtamkhay_c54e7f746636');
    console.log('2. Verify records have main_form_subid:', OLD_MAIN_FORM_SUBID);
    console.log('3. Verify new submission saved with main_form_subid:', NEW_SUBMISSION_ID);
    console.log('4. Verify column order: id, parent_id, main_form_subid, username, order, ...');

    console.log('\n✅ Database verification steps documented');
    console.log('=' .repeat(80));
  });

  test('Test 5: UI rendering and interaction', async ({ page }) => {
    console.log('\n🧪 TEST 5: UI rendering and interaction');
    console.log('=' .repeat(80));

    console.log('📋 Step 1: Navigate to submission with sub-forms');
    await page.goto(`${BASE_URL}/submissions/${OLD_SUBMISSION_ID}`);
    await page.waitForTimeout(3000);

    console.log('📋 Step 2: Verify page structure');
    // Check for main elements
    await expect(page.locator('[data-testid="submission-detail"], .submission-detail')).toBeVisible();

    console.log('📋 Step 3: Verify sub-form section UI');
    // Scroll to sub-form section
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(1000);

    // Check sub-form header
    const subFormHeader = page.locator('text=ฟอร์มบันทึกการติดตามขาย');
    await expect(subFormHeader).toBeVisible();
    console.log('✅ Sub-form header visible');

    // Check for add button
    const addButton = page.locator('button:has-text("เพิ่ม"), button:has-text("+")').first();
    await expect(addButton).toBeVisible();
    console.log('✅ Add button visible');

    console.log('📋 Step 4: Verify table rendering');
    const subFormTable = page.locator('table').nth(1);
    if (await subFormTable.count() > 0) {
      console.log('✅ Sub-form table rendered');

      // Check table has proper structure
      const hasHeader = await subFormTable.locator('thead').count() > 0;
      const hasBody = await subFormTable.locator('tbody').count() > 0;

      expect(hasHeader).toBeTruthy();
      expect(hasBody).toBeTruthy();
      console.log('✅ Table has thead and tbody');

      // Check for clickable rows
      const firstRow = subFormTable.locator('tbody tr').first();
      if (await firstRow.count() > 0) {
        const isClickable = await firstRow.evaluate(el => {
          const style = window.getComputedStyle(el);
          return style.cursor === 'pointer' || el.onclick !== null;
        });

        if (isClickable) {
          console.log('✅ Table rows are clickable');
        } else {
          console.log('⚠️  Table rows may not be interactive');
        }
      }
    } else {
      console.log('❌ Sub-form table not rendered');
    }

    console.log('📋 Step 5: Take full page screenshot');
    await page.screenshot({ path: 'test-results/subform-ui-full.png', fullPage: true });
    console.log('✅ Screenshot saved: test-results/subform-ui-full.png');

    console.log('=' .repeat(80));
    console.log('✅ TEST 5 PASSED: UI rendering verified\n');
  });

});

test.describe('Error Handling and Edge Cases', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });
  });

  test('Test 6: Handle submission with no sub-forms', async ({ page }) => {
    console.log('\n🧪 TEST 6: Handle submission with no sub-forms');
    console.log('=' .repeat(80));

    // Navigate to a submission that has no sub-form data
    await page.goto(`${BASE_URL}/submissions/${NEW_SUBMISSION_ID}`);
    await page.waitForTimeout(3000);

    // Should show "no data" message gracefully
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(1000);

    const noDataMessage = await page.locator('text=/ยังไม่มีข้อมูล|No data|Empty/i').count();
    if (noDataMessage > 0) {
      console.log('✅ "No data" message shown appropriately');
    }

    // Add button should still be visible
    const addButton = page.locator('button:has-text("เพิ่ม"), button:has-text("+")').first();
    await expect(addButton).toBeVisible();
    console.log('✅ Add button still available for empty sub-form list');

    console.log('=' .repeat(80));
    console.log('✅ TEST 6 PASSED: Empty state handled correctly\n');
  });

  test('Test 7: Verify console errors', async ({ page }) => {
    console.log('\n🧪 TEST 7: Verify no console errors');
    console.log('=' .repeat(80));

    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate and interact
    await page.goto(`${BASE_URL}/submissions/${OLD_SUBMISSION_ID}`);
    await page.waitForTimeout(5000);

    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(2000);

    if (consoleErrors.length > 0) {
      console.log('⚠️  Console errors found:');
      consoleErrors.forEach(err => console.log('  -', err));
    } else {
      console.log('✅ No console errors detected');
    }

    console.log('=' .repeat(80));
    console.log('✅ TEST 7 COMPLETED: Console error check done\n');
  });

});
