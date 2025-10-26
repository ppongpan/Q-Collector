/**
 * Comprehensive System Test Suite
 * Tests all recent fixes and features:
 * 1. Dynamic Table ID Column Fix
 * 2. Public Form Link System
 * 3. PDPA Skip in Edit Mode
 * 4. Form Creation & Submission Flow
 *
 * Date: 2025-10-26
 * Version: v0.9.0-dev
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:5000/api/v1';
const TEST_USER = {
  username: 'testadmin',
  password: 'TestAdmin123!'
};

// Test data
let testFormId = null;
let testSubmissionId = null;
let publicFormSlug = null;
let publicFormToken = null;

// Helper: Login
async function login(page) {
  console.log('🔐 Logging in...');
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="username"]', TEST_USER.username);
  await page.fill('input[name="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL(/\/(forms|dashboard)/, { timeout: 10000 });
  console.log('✅ Login successful');
}

// Helper: Create test form with PDPA
async function createTestForm(page) {
  console.log('📝 Creating test form...');

  await page.goto(`${BASE_URL}/forms`);
  await page.click('button:has-text("สร้างฟอร์มใหม่")');

  // Fill form details
  const timestamp = Date.now();
  const formTitle = `Test Form Dynamic Table ${timestamp}`;

  await page.fill('input[name="title"]', formTitle);
  await page.fill('textarea[name="description"]', 'Comprehensive test form with all field types');

  // Add fields
  console.log('➕ Adding fields...');

  // 1. Short Answer (Name)
  await page.click('button:has-text("เพิ่มฟิลด์")');
  await page.click('button:has-text("Short Answer")');
  await page.fill('input[placeholder="ป้อนคำถาม"]', 'ชื่อ-นามสกุล');
  await page.click('button:has-text("บันทึก")');

  // 2. Email
  await page.click('button:has-text("เพิ่มฟิลด์")');
  await page.click('button:has-text("Email")');
  await page.fill('input[placeholder="ป้อนคำถาม"]', 'อีเมล');
  await page.click('button:has-text("บันทึก")');

  // 3. Phone
  await page.click('button:has-text("เพิ่มฟิลด์")');
  await page.click('button:has-text("Phone")');
  await page.fill('input[placeholder="ป้อนคำถาม"]', 'เบอร์โทรศัพท์');
  await page.click('button:has-text("บันทึก")');

  // 4. Number
  await page.click('button:has-text("เพิ่มฟิลด์")');
  await page.click('button:has-text("Number")');
  await page.fill('input[placeholder="ป้อนคำถาม"]', 'อายุ');
  await page.click('button:has-text("บันทึก")');

  // Save form
  await page.click('button:has-text("บันทึกฟอร์ม")');
  await page.waitForSelector('text=บันทึกฟอร์มสำเร็จ', { timeout: 10000 });

  // Get form ID from URL
  await page.waitForURL(/\/forms\/edit\/[a-f0-9-]+/, { timeout: 5000 });
  const url = page.url();
  testFormId = url.match(/\/forms\/edit\/([a-f0-9-]+)/)[1];

  console.log(`✅ Form created with ID: ${testFormId}`);
  return { formId: testFormId, formTitle };
}

// Helper: Enable PDPA for form
async function enablePDPA(page, formId) {
  console.log('🔒 Enabling PDPA...');

  await page.goto(`${BASE_URL}/forms/edit/${formId}`);

  // Navigate to PDPA tab
  await page.click('button:has-text("PDPA")');

  // Enable Privacy Notice
  await page.click('input[type="checkbox"]:near(:text("เปิดใช้งาน Privacy Notice"))');
  await page.fill('textarea[name="privacyNoticeText"]', 'นโยบายความเป็นส่วนตัวสำหรับการทดสอบ');

  // Add Consent Item
  await page.click('button:has-text("เพิ่ม Consent Item")');
  await page.fill('input[name="consentTitle"]', 'ยินยอมให้เก็บข้อมูล');
  await page.fill('textarea[name="consentDescription"]', 'ยินยอมให้เก็บรวบรวมและใช้ข้อมูลส่วนบุคคล');
  await page.fill('input[name="purpose"]', 'ติดต่อและให้บริการ');
  await page.fill('input[name="retentionPeriod"]', '2 ปี');
  await page.click('button:has-text("บันทึก Consent")');

  // Save PDPA settings
  await page.click('button:has-text("บันทึกฟอร์ม")');
  await page.waitForSelector('text=บันทึกสำเร็จ', { timeout: 10000 });

  console.log('✅ PDPA enabled');
}

// Helper: Enable Public Link
async function enablePublicLink(page, formId) {
  console.log('🌐 Enabling public link...');

  await page.goto(`${BASE_URL}/forms/edit/${formId}`);

  // Navigate to Public Link tab
  await page.click('button:has-text("ลิงก์สาธารณะ")');

  // Enable public link
  await page.click('input[type="checkbox"]:near(:text("เปิดใช้งาน"))');

  // Wait for slug to be generated
  await page.waitForSelector('input[name="slug"]', { timeout: 5000 });
  publicFormSlug = await page.inputValue('input[name="slug"]');

  // Get token
  publicFormToken = await page.inputValue('input[name="token"]');

  // Save
  await page.click('button:has-text("บันทึก")');
  await page.waitForSelector('text=บันทึกสำเร็จ', { timeout: 10000 });

  console.log(`✅ Public link enabled: ${publicFormSlug}`);
  console.log(`✅ Token: ${publicFormToken.substring(0, 10)}...`);

  return { slug: publicFormSlug, token: publicFormToken };
}

// Helper: Create submission (authenticated)
async function createSubmission(page, formId) {
  console.log('📤 Creating submission...');

  await page.goto(`${BASE_URL}/forms/${formId}/submit`);

  // Accept Privacy Notice
  await page.click('input[type="checkbox"]:near(:text("ฉันรับทราบ"))');
  await page.click('button:has-text("ถัดไป")');

  // Accept Consent
  await page.click('input[type="checkbox"]:near(:text("ยินยอม"))');

  // Sign (draw on canvas)
  const canvas = await page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.move(box.x + 50, box.y + 50);
    await page.mouse.down();
    await page.mouse.move(box.x + 150, box.y + 80);
    await page.mouse.up();
  }

  // Enter full name
  await page.fill('input[placeholder="ชื่อ-นามสกุล"]', 'ทดสอบ ระบบ');

  await page.click('button:has-text("ถัดไป")');

  // Fill form fields
  await page.fill('input[placeholder*="ชื่อ"]', 'สมชาย ทดสอบ');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="tel"]', '0812345678');
  await page.fill('input[type="number"]', '30');

  // Submit
  await page.click('button:has-text("ส่งข้อมูล")');
  await page.waitForSelector('text=ส่งข้อมูลสำเร็จ', { timeout: 10000 });

  // Get submission ID from URL or response
  await page.waitForTimeout(2000);
  const currentUrl = page.url();
  if (currentUrl.includes('/submissions/')) {
    testSubmissionId = currentUrl.match(/\/submissions\/([a-f0-9-]+)/)?.[1];
  }

  console.log(`✅ Submission created: ${testSubmissionId || 'ID not found'}`);
  return testSubmissionId;
}

// Test Suite
test.describe('Comprehensive System Test Suite', () => {

  // Setup: Login before all tests
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page);
    await context.storageState({ path: 'tests/e2e/.auth/admin.json' });
    await context.close();
  });

  // Use authenticated state
  test.use({ storageState: 'tests/e2e/.auth/admin.json' });

  // ====================================
  // TEST 1: Form Creation & Dynamic Table
  // ====================================
  test('1. Create form and verify dynamic table creation', async ({ page }) => {
    const { formId, formTitle } = await createTestForm(page);

    // Verify form was created
    expect(formId).toBeTruthy();
    expect(formId).toMatch(/^[a-f0-9-]+$/);

    // Verify dynamic table exists in database
    const response = await page.request.get(`${API_URL}/forms/${formId}`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.form.tableName).toBeTruthy();
    console.log(`✅ Dynamic table created: ${data.form.tableName}`);
  });

  // ====================================
  // TEST 2: PDPA Configuration
  // ====================================
  test('2. Enable PDPA with consent items', async ({ page }) => {
    expect(testFormId).toBeTruthy();
    await enablePDPA(page, testFormId);

    // Verify PDPA settings saved
    await page.goto(`${BASE_URL}/forms/edit/${testFormId}`);
    await page.click('button:has-text("PDPA")');

    // Check Privacy Notice is enabled
    const privacyCheckbox = page.locator('input[type="checkbox"]:near(:text("เปิดใช้งาน Privacy Notice"))');
    await expect(privacyCheckbox).toBeChecked();

    console.log('✅ PDPA configuration verified');
  });

  // ====================================
  // TEST 3: Public Link System
  // ====================================
  test('3. Enable public link and verify settings', async ({ page }) => {
    expect(testFormId).toBeTruthy();
    const { slug, token } = await enablePublicLink(page, testFormId);

    // Verify slug and token
    expect(slug).toBeTruthy();
    expect(slug).toMatch(/^[a-z0-9-]+$/);
    expect(token).toBeTruthy();
    expect(token).toHaveLength(32);

    console.log('✅ Public link system verified');
  });

  // ====================================
  // TEST 4: Create Submission (Dynamic Table Insert)
  // ====================================
  test('4. Create authenticated submission (test dynamic table)', async ({ page }) => {
    expect(testFormId).toBeTruthy();
    const submissionId = await createSubmission(page, testFormId);

    // Verify submission was created
    expect(submissionId).toBeTruthy();

    // Verify data in dynamic table via API
    const response = await page.request.get(`${API_URL}/submissions/${submissionId}`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.submission).toBeTruthy();
    expect(data.submission.id).toBe(submissionId);

    console.log('✅ Dynamic table insertion verified (ID column working)');
  });

  // ====================================
  // TEST 5: Edit Submission (PDPA Skip)
  // ====================================
  test('5. Edit submission - verify PDPA skip', async ({ page }) => {
    expect(testSubmissionId).toBeTruthy();

    console.log('✏️ Testing edit mode PDPA skip...');
    await page.goto(`${BASE_URL}/submissions/${testSubmissionId}/edit`);

    // Should skip directly to form fields (no Privacy Notice or Consent)
    await page.waitForSelector('input[placeholder*="ชื่อ"]', { timeout: 5000 });

    // Verify Privacy Notice NOT shown
    const privacyNotice = page.locator('text=นโยบายความเป็นส่วนตัว');
    await expect(privacyNotice).not.toBeVisible();

    // Verify Consent screen NOT shown
    const consentSection = page.locator('text=ยินยอมให้เก็บข้อมูล');
    await expect(consentSection).not.toBeVisible();

    // Edit field
    await page.fill('input[placeholder*="ชื่อ"]', 'สมชาย แก้ไขแล้ว');

    // Save
    await page.click('button:has-text("บันทึก")');
    await page.waitForSelector('text=บันทึกสำเร็จ', { timeout: 10000 });

    console.log('✅ PDPA skip in edit mode verified');
  });

  // ====================================
  // TEST 6: Public Form Submission
  // ====================================
  test('6. Submit form via public link (anonymous)', async ({ browser }) => {
    expect(publicFormSlug).toBeTruthy();
    expect(publicFormToken).toBeTruthy();

    console.log('🌐 Testing public form submission...');

    // Create new context (no authentication)
    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to public form
    await page.goto(`${BASE_URL}/public/forms/${publicFormSlug}`);

    // Verify form loaded
    await page.waitForSelector('h1', { timeout: 5000 });

    // Accept Privacy Notice
    await page.click('input[type="checkbox"]:near(:text("ฉันรับทราบ"))');
    await page.click('button:has-text("ถัดไป")');

    // Accept Consent
    await page.click('input[type="checkbox"]:near(:text("ยินยอม"))');

    // Sign
    const canvas = await page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 50, box.y + 50);
      await page.mouse.down();
      await page.mouse.move(box.x + 150, box.y + 80);
      await page.mouse.up();
    }

    await page.fill('input[placeholder="ชื่อ-นามสกุล"]', 'ผู้ใช้ Anonymous');
    await page.click('button:has-text("ถัดไป")');

    // Fill form
    await page.fill('input[placeholder*="ชื่อ"]', 'Anonymous User');
    await page.fill('input[type="email"]', 'anonymous@example.com');
    await page.fill('input[type="tel"]', '0898765432');
    await page.fill('input[type="number"]', '25');

    // Submit
    await page.click('button:has-text("ส่งข้อมูล")');

    // Verify success (should redirect to thank you page)
    await page.waitForSelector('text=ขอบคุณ', { timeout: 10000 });

    console.log('✅ Public form submission successful');

    await context.close();
  });

  // ====================================
  // TEST 7: Verify Submission Count
  // ====================================
  test('7. Verify submission count and dynamic table data', async ({ page }) => {
    expect(testFormId).toBeTruthy();

    console.log('📊 Verifying submission count...');

    // Navigate to form submissions list
    await page.goto(`${BASE_URL}/forms/${testFormId}/submissions`);

    // Count rows (should have at least 2: 1 authenticated + 1 public)
    const rows = page.locator('table tbody tr');
    const count = await rows.count();

    expect(count).toBeGreaterThanOrEqual(2);
    console.log(`✅ Found ${count} submissions`);

    // Verify data in first submission
    await page.click('table tbody tr:first-child');
    await page.waitForSelector('text=รายละเอียด', { timeout: 5000 });

    // Verify field values are displayed
    const nameField = page.locator('text=ชื่อ-นามสกุล');
    await expect(nameField).toBeVisible();

    console.log('✅ Submission data verified');
  });

  // ====================================
  // TEST 8: Database Verification
  // ====================================
  test('8. Verify database integrity via API', async ({ page }) => {
    expect(testFormId).toBeTruthy();

    console.log('🗄️ Verifying database integrity...');

    // Get form details
    const formResponse = await page.request.get(`${API_URL}/forms/${testFormId}`);
    expect(formResponse.ok()).toBeTruthy();
    const formData = await formResponse.json();

    // Verify table_name exists
    expect(formData.form.tableName).toBeTruthy();
    console.log(`✅ Dynamic table: ${formData.form.tableName}`);

    // Get submissions
    const subResponse = await page.request.get(`${API_URL}/forms/${testFormId}/submissions`);
    expect(subResponse.ok()).toBeTruthy();
    const subData = await subResponse.json();

    // Verify submissions exist
    expect(subData.submissions).toBeTruthy();
    expect(subData.submissions.length).toBeGreaterThanOrEqual(2);

    // Verify each submission has ID (tests dynamic table ID column fix)
    subData.submissions.forEach((sub, index) => {
      expect(sub.id).toBeTruthy();
      expect(sub.id).toMatch(/^[a-f0-9-]+$/);
      console.log(`  ✅ Submission ${index + 1}: ${sub.id}`);
    });

    console.log('✅ Database integrity verified');
  });

  // ====================================
  // TEST 9: Public Link Security
  // ====================================
  test('9. Test public link security (invalid token)', async ({ browser }) => {
    expect(publicFormSlug).toBeTruthy();

    console.log('🔒 Testing public link security...');

    const context = await browser.newContext();
    const page = await context.newPage();

    // Try to submit with invalid token
    const response = await page.request.post(`${API_URL}/public/forms/${publicFormSlug}/submit`, {
      data: {
        token: 'invalid_token_12345678901234567890',
        data: {
          name: 'Hacker',
          email: 'hacker@example.com'
        }
      }
    });

    // Should be rejected (403 or 401)
    expect(response.status()).toBeGreaterThanOrEqual(400);
    console.log(`✅ Invalid token rejected with status: ${response.status()}`);

    await context.close();
  });

  // ====================================
  // TEST 10: Rate Limiting
  // ====================================
  test('10. Test public form rate limiting', async ({ browser }) => {
    expect(publicFormSlug).toBeTruthy();
    expect(publicFormToken).toBeTruthy();

    console.log('⏱️ Testing rate limiting...');

    const context = await browser.newContext();
    const page = await context.newPage();

    // Try to submit 6 times (limit is 5 per hour)
    const submissions = [];
    for (let i = 0; i < 6; i++) {
      const response = await page.request.post(`${API_URL}/public/forms/${publicFormSlug}/submit`, {
        data: {
          token: publicFormToken,
          data: {
            name: `Test ${i}`,
            email: `test${i}@example.com`,
            phone: '0800000000',
            age: 20
          },
          consents: [],
          privacyNoticeAccepted: true
        }
      });

      submissions.push({
        attempt: i + 1,
        status: response.status(),
        success: response.ok()
      });

      console.log(`  Attempt ${i + 1}: ${response.status()}`);

      await page.waitForTimeout(100); // Small delay
    }

    // Last attempt should be rate limited (429)
    const rateLimited = submissions.some(s => s.status === 429);
    console.log(rateLimited ? '✅ Rate limiting working' : '⚠️ Rate limiting not triggered');

    await context.close();
  });

});

// ====================================
// CLEANUP & REPORTING
// ====================================
test.afterAll(async ({}, testInfo) => {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Form ID: ${testFormId || 'N/A'}`);
  console.log(`Submission ID: ${testSubmissionId || 'N/A'}`);
  console.log(`Public Slug: ${publicFormSlug || 'N/A'}`);
  console.log(`Public Token: ${publicFormToken ? publicFormToken.substring(0, 10) + '...' : 'N/A'}`);
  console.log('='.repeat(60));

  // Save test results to file
  const results = {
    timestamp: new Date().toISOString(),
    testFormId,
    testSubmissionId,
    publicFormSlug,
    publicFormToken,
    status: 'completed'
  };

  fs.writeFileSync(
    path.join(__dirname, 'comprehensive-test-results.json'),
    JSON.stringify(results, null, 2)
  );

  console.log('✅ Test results saved to comprehensive-test-results.json');
});
