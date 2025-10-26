/**
 * Test Helper Functions
 * Reusable utilities for Playwright E2E tests
 */

const { expect } = require('@playwright/test');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:5000/api/v1';

/**
 * Login helper
 * @param {Page} page - Playwright page object
 * @param {Object} credentials - User credentials
 */
async function login(page, credentials = { username: 'testadmin', password: 'TestAdmin123!' }) {
  console.log(`🔐 Logging in as ${credentials.username}...`);

  await page.goto(`${BASE_URL}/login`);

  // Wait for login form
  await page.waitForSelector('input[name="username"]', { timeout: 10000 });

  // Fill credentials
  await page.fill('input[name="username"]', credentials.username);
  await page.fill('input[name="password"]', credentials.password);

  // Submit
  await page.click('button[type="submit"]');

  // Wait for redirect
  await page.waitForURL(/\/(forms|dashboard|submissions)/, { timeout: 15000 });

  console.log('✅ Login successful');
  return true;
}

/**
 * Logout helper
 * @param {Page} page - Playwright page object
 */
async function logout(page) {
  console.log('🚪 Logging out...');

  // Click user menu
  await page.click('[data-testid="user-menu"], button:has-text("testadmin")');

  // Click logout
  await page.click('button:has-text("ออกจากระบบ")');

  // Wait for redirect to login
  await page.waitForURL(/\/login/, { timeout: 5000 });

  console.log('✅ Logout successful');
}

/**
 * Create form helper
 * @param {Page} page - Playwright page object
 * @param {Object} formData - Form configuration
 * @returns {Object} - Created form details
 */
async function createForm(page, formData = {}) {
  const {
    title = `Test Form ${Date.now()}`,
    description = 'Test form description',
    fields = []
  } = formData;

  console.log(`📝 Creating form: ${title}`);

  await page.goto(`${BASE_URL}/forms`);
  await page.click('button:has-text("สร้างฟอร์มใหม่")');

  // Fill basic details
  await page.fill('input[name="title"]', title);
  await page.fill('textarea[name="description"]', description);

  // Add fields if provided
  for (const field of fields) {
    await addField(page, field);
  }

  // Save form
  await page.click('button:has-text("บันทึกฟอร์ม")');
  await page.waitForSelector('text=บันทึกฟอร์มสำเร็จ', { timeout: 10000 });

  // Get form ID from URL
  await page.waitForURL(/\/forms\/edit\/[a-f0-9-]+/, { timeout: 5000 });
  const url = page.url();
  const formId = url.match(/\/forms\/edit\/([a-f0-9-]+)/)[1];

  console.log(`✅ Form created: ${formId}`);

  return { formId, title, description };
}

/**
 * Add field to form
 * @param {Page} page - Playwright page object
 * @param {Object} fieldData - Field configuration
 */
async function addField(page, fieldData) {
  const {
    type = 'short_answer',
    label = 'Test Field',
    required = false
  } = fieldData;

  console.log(`  ➕ Adding field: ${label} (${type})`);

  await page.click('button:has-text("เพิ่มฟิลด์")');

  // Select field type
  const typeMapping = {
    short_answer: 'Short Answer',
    paragraph: 'Paragraph',
    email: 'Email',
    phone: 'Phone',
    number: 'Number',
    date: 'Date',
    multiple_choice: 'Multiple Choice'
  };

  await page.click(`button:has-text("${typeMapping[type] || 'Short Answer'}")`);

  // Fill label
  await page.fill('input[placeholder="ป้อนคำถาม"]', label);

  // Set required
  if (required) {
    await page.click('input[type="checkbox"]:near(:text("Required"))');
  }

  // Save field
  await page.click('button:has-text("บันทึก")');
  await page.waitForTimeout(500);
}

/**
 * Enable PDPA for form
 * @param {Page} page - Playwright page object
 * @param {string} formId - Form ID
 * @param {Object} pdpaConfig - PDPA configuration
 */
async function enablePDPA(page, formId, pdpaConfig = {}) {
  const {
    privacyNotice = 'นโยบายความเป็นส่วนตัวทดสอบ',
    consentItems = [{
      title: 'ยินยอมให้เก็บข้อมูล',
      description: 'ยินยอมให้เก็บรวบรวมและใช้ข้อมูลส่วนบุคคล',
      purpose: 'ติดต่อและให้บริการ',
      retentionPeriod: '2 ปี'
    }]
  } = pdpaConfig;

  console.log('🔒 Enabling PDPA...');

  await page.goto(`${BASE_URL}/forms/edit/${formId}`);
  await page.click('button:has-text("PDPA")');

  // Enable Privacy Notice
  const privacyCheckbox = page.locator('input[type="checkbox"]:near(:text("Privacy Notice"))').first();
  const isChecked = await privacyCheckbox.isChecked();
  if (!isChecked) {
    await privacyCheckbox.click();
  }

  await page.fill('textarea[name="privacyNoticeText"]', privacyNotice);

  // Add consent items
  for (const item of consentItems) {
    await page.click('button:has-text("เพิ่ม Consent Item")');
    await page.fill('input[name="consentTitle"]', item.title);
    await page.fill('textarea[name="consentDescription"]', item.description);
    await page.fill('input[name="purpose"]', item.purpose);
    await page.fill('input[name="retentionPeriod"]', item.retentionPeriod);
    await page.click('button:has-text("บันทึก Consent")');
    await page.waitForTimeout(500);
  }

  // Save
  await page.click('button:has-text("บันทึกฟอร์ม")');
  await page.waitForSelector('text=บันทึกสำเร็จ', { timeout: 10000 });

  console.log('✅ PDPA enabled');
}

/**
 * Enable public link for form
 * @param {Page} page - Playwright page object
 * @param {string} formId - Form ID
 * @returns {Object} - Public link details
 */
async function enablePublicLink(page, formId) {
  console.log('🌐 Enabling public link...');

  await page.goto(`${BASE_URL}/forms/edit/${formId}`);
  await page.click('button:has-text("ลิงก์สาธารณะ")');

  // Enable toggle
  const toggle = page.locator('input[type="checkbox"]:near(:text("เปิดใช้งาน"))').first();
  const isChecked = await toggle.isChecked();
  if (!isChecked) {
    await toggle.click();
  }

  // Wait for generation
  await page.waitForTimeout(2000);

  // Get slug and token
  const slug = await page.inputValue('input[name="slug"]');
  const token = await page.inputValue('input[name="token"]');

  // Save
  await page.click('button:has-text("บันทึก")');
  await page.waitForSelector('text=บันทึกสำเร็จ', { timeout: 10000 });

  console.log(`✅ Public link: ${BASE_URL}/public/forms/${slug}`);

  return { slug, token, url: `${BASE_URL}/public/forms/${slug}` };
}

/**
 * Submit form (authenticated)
 * @param {Page} page - Playwright page object
 * @param {string} formId - Form ID
 * @param {Object} data - Form data
 * @param {Object} options - Submission options
 * @returns {string} - Submission ID
 */
async function submitForm(page, formId, data = {}, options = {}) {
  const { skipPDPA = false, signatureData = null } = options;

  console.log('📤 Submitting form...');

  await page.goto(`${BASE_URL}/forms/${formId}/submit`);

  // Handle PDPA flow
  if (!skipPDPA) {
    // Privacy Notice
    await page.waitForSelector('input[type="checkbox"]:near(:text("ฉันรับทราบ"))', { timeout: 5000 });
    await page.click('input[type="checkbox"]:near(:text("ฉันรับทราบ"))');
    await page.click('button:has-text("ถัดไป")');

    // Consent
    await page.click('input[type="checkbox"]:near(:text("ยินยอม"))');

    // Signature
    if (signatureData) {
      // Use provided signature
    } else {
      // Draw default signature
      const canvas = await page.locator('canvas').first();
      const box = await canvas.boundingBox();
      if (box) {
        await page.mouse.move(box.x + 50, box.y + 50);
        await page.mouse.down();
        await page.mouse.move(box.x + 150, box.y + 80);
        await page.mouse.up();
      }
    }

    await page.fill('input[placeholder="ชื่อ-นามสกุล"]', data.fullName || 'ทดสอบ ระบบ');
    await page.click('button:has-text("ถัดไป")');
  }

  // Fill form fields
  for (const [key, value] of Object.entries(data)) {
    if (key === 'fullName') continue; // Already used in signature

    const input = page.locator(`input[name="${key}"], textarea[name="${key}"]`).first();
    const isVisible = await input.isVisible().catch(() => false);

    if (isVisible) {
      await input.fill(String(value));
    }
  }

  // Submit
  await page.click('button:has-text("ส่งข้อมูล")');
  await page.waitForSelector('text=ส่งข้อมูลสำเร็จ', { timeout: 10000 });

  // Extract submission ID
  await page.waitForTimeout(2000);
  const url = page.url();
  const submissionId = url.match(/\/submissions\/([a-f0-9-]+)/)?.[1];

  console.log(`✅ Submission created: ${submissionId}`);

  return submissionId;
}

/**
 * Take screenshot with timestamp
 * @param {Page} page - Playwright page object
 * @param {string} name - Screenshot name
 */
async function screenshot(page, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `screenshot-${name}-${timestamp}.png`;
  await page.screenshot({ path: `tests/e2e/screenshots/${filename}`, fullPage: true });
  console.log(`📸 Screenshot saved: ${filename}`);
}

/**
 * Wait for API response
 * @param {Page} page - Playwright page object
 * @param {string} url - URL pattern to wait for
 * @param {number} timeout - Timeout in ms
 */
async function waitForAPI(page, url, timeout = 10000) {
  return page.waitForResponse(
    response => response.url().includes(url) && response.status() === 200,
    { timeout }
  );
}

/**
 * Check if element exists
 * @param {Page} page - Playwright page object
 * @param {string} selector - Element selector
 * @returns {boolean}
 */
async function elementExists(page, selector) {
  try {
    await page.waitForSelector(selector, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Verify toast message
 * @param {Page} page - Playwright page object
 * @param {string} message - Expected message
 */
async function verifyToast(page, message) {
  await page.waitForSelector(`text=${message}`, { timeout: 5000 });
  console.log(`✅ Toast verified: ${message}`);
}

/**
 * Clean up test data
 * @param {Object} request - Playwright request context
 * @param {Array} formIds - Form IDs to delete
 */
async function cleanupForms(request, formIds) {
  console.log('🧹 Cleaning up test data...');

  for (const formId of formIds) {
    try {
      await request.delete(`${API_URL}/forms/${formId}`);
      console.log(`  ✅ Deleted form: ${formId}`);
    } catch (error) {
      console.log(`  ⚠️ Could not delete form: ${formId}`);
    }
  }
}

module.exports = {
  BASE_URL,
  API_URL,
  login,
  logout,
  createForm,
  addField,
  enablePDPA,
  enablePublicLink,
  submitForm,
  screenshot,
  waitForAPI,
  elementExists,
  verifyToast,
  cleanupForms
};
