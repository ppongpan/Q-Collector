/**
 * E2E Test: Form Creation with Sub-Forms
 *
 * Tests complete workflow of creating a main form with sub-forms
 * including all tooltip-based UI interactions
 *
 * UI Interaction Patterns:
 * 1. InlineEdit: Click text to edit (form title, field title)
 * 2. Field Expansion: Click top of collapsed field card to expand
 * 3. Toggle Icons (tooltip-based):
 *    - Required (red !): Click to make field required
 *    - Show in Table (blue table): Only clickable when required=true
 *    - Telegram (green chat): Enable telegram notification
 */

const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:5000/api/v1';

// Test credentials
const TEST_USER = {
  identifier: 'pongpanp',
  password: 'Gfvtmiu613'
};

/**
 * Login helper
 */
async function login(page) {
  await page.goto(BASE_URL);

  // Wait for login page
  await page.waitForSelector('input[type="text"]', { timeout: 10000 });

  // Enter credentials
  await page.fill('input[type="text"]', TEST_USER.identifier);
  await page.fill('input[type="password"]', TEST_USER.password);

  // Click login
  await page.click('button:has-text("เข้าสู่ระบบ")');

  // Check if 2FA is enabled
  const has2FA = await page.locator('text=/ยืนยันตัวตน 2FA|2FA Verification/i').isVisible({ timeout: 5000 }).catch(() => false);

  if (has2FA) {
    console.log('⚠️  2FA is enabled - Please enter OTP manually or disable 2FA for test user');
    console.log('⚠️  Test will wait 30 seconds for manual OTP entry...');

    // Wait for user to enter OTP manually (30 seconds)
    await page.waitForSelector('[data-testid="create-form-btn"], h1:has-text("จัดการฟอร์ม")', { timeout: 30000 });
  } else {
    // Wait for dashboard/form list (no 2FA)
    await page.waitForSelector('[data-testid="create-form-btn"], h1:has-text("จัดการฟอร์ม")', { timeout: 15000 });
  }
}

/**
 * Click InlineEdit element and type new value
 * @param {Page} page - Playwright page
 * @param {string} selector - CSS selector for InlineEdit component
 * @param {string} text - Text to type
 */
async function setInlineEditValue(page, selector, text) {
  // Click to activate edit mode
  await page.click(selector);

  // Wait for input to appear
  await page.waitForTimeout(300);

  // Clear and type new value
  await page.keyboard.press('Control+A');
  await page.keyboard.type(text);

  // Press Enter to save
  await page.keyboard.press('Enter');

  // Wait for save
  await page.waitForTimeout(500);
}

/**
 * Toggle field setting icon by tooltip text
 * @param {Page} page - Playwright page
 * @param {string} fieldCardSelector - Selector for field card
 * @param {string} tooltipText - Tooltip text to match (e.g., 'ทำให้เป็นฟิลด์จำเป็น')
 */
async function toggleFieldIcon(page, fieldCardSelector, tooltipText) {
  const button = await page.locator(`${fieldCardSelector} button[title*="${tooltipText}"]`);
  await button.click();
  await page.waitForTimeout(300);
}

/**
 * Expand collapsed field card
 * @param {Page} page - Playwright page
 * @param {string} fieldTitle - Field title to identify the card
 */
async function expandFieldCard(page, fieldTitle) {
  // Click on the field card header (anywhere except toggle buttons)
  const fieldCard = page.locator(`[data-testid="field-card"]:has-text("${fieldTitle}")`).first();
  await fieldCard.click({ position: { x: 100, y: 20 } }); // Click on upper-left area
  await page.waitForTimeout(500);
}

test.describe('Form Creation with Sub-Forms', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Complete Form Creation Flow with Sub-Forms', async ({ page }) => {
    // Step 1: Navigate to Form Builder
    console.log('📝 Step 1: Navigate to Form Builder');

    // Click "+" icon button (create form)
    const createButton = page.locator('[data-testid="create-form-btn"]');
    await createButton.click();

    // Wait for form builder to load
    await page.waitForSelector('h1:has-text("สร้างฟอร์มใหม่")', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Step 2: Set Main Form Title and Description
    console.log('📝 Step 2: Set Main Form Title');

    // Find and click InlineEdit for form title
    const formTitleSelector = 'h1:has-text("คลิกเพื่อระบุชื่อฟอร์ม"), h2:has-text("คลิกเพื่อระบุชื่อฟอร์ม")';
    await setInlineEditValue(
      page,
      formTitleSelector,
      'ฟอร์มทดสอบระบบ Sub-Form'
    );

    // Set form description
    console.log('📝 Step 3: Set Form Description');
    const formDescSelector = 'p:has-text("คลิกเพื่อเพิ่มคำอธิบายฟอร์ม")';
    await setInlineEditValue(
      page,
      formDescSelector,
      'ทดสอบการสร้างฟอร์มพร้อม Sub-Form และการตั้งค่าฟิลด์'
    );

    // Step 3: Add Main Form Fields
    console.log('📝 Step 4: Add Main Form Fields');

    // Click "Fields" tab to ensure we're on fields section
    await page.click('button:has-text("ฟิลด์"), button:has-text("Fields")');
    await page.waitForTimeout(1000);

    // Add Field 1: ชื่อ-นามสกุล (short_answer)
    console.log('  ➕ Adding field: ชื่อ-นามสกุล');

    // Click animated add button
    const addFieldButton = page.locator('button[data-testid="add-field-button"], button:has-text("เพิ่มฟิลด์")').first();
    await addFieldButton.click();
    await page.waitForTimeout(1000);

    // Select field type: short_answer
    const fieldTypeSelect = page.locator('select, [role="combobox"]').first();
    await fieldTypeSelect.click();
    await page.click('text="ข้อความสั้น"');
    await page.waitForTimeout(500);

    // Expand the field card
    await expandFieldCard(page, 'ชื่อฟิลด์ใหม่');

    // Set field title using GlassInput (when expanded)
    const fieldTitleInput = page.locator('input[data-testid="field-title-input"]').first();
    await fieldTitleInput.fill('ชื่อ-นามสกุล');
    await page.waitForTimeout(500);

    // Set placeholder
    const placeholderInput = page.locator('input:below(:text("Placeholder"))').first();
    if (await placeholderInput.isVisible()) {
      await placeholderInput.fill('กรอกชื่อและนามสกุลของคุณ');
    }

    // Collapse the field (click header again)
    await page.click('[data-testid="field-card"]:has-text("ชื่อ-นามสกุล") >> button');
    await page.waitForTimeout(500);

    // Toggle: Make Required
    await toggleFieldIcon(
      page,
      '[data-testid="field-card"]:has-text("ชื่อ-นามสกุล")',
      'ทำให้เป็นฟิลด์จำเป็น'
    );

    // Toggle: Show in Table (now enabled because required=true)
    await toggleFieldIcon(
      page,
      '[data-testid="field-card"]:has-text("ชื่อ-นามสกุล")',
      'แสดงในตาราง'
    );

    // Toggle: Telegram Notification
    await toggleFieldIcon(
      page,
      '[data-testid="field-card"]:has-text("ชื่อ-นามสกุล")',
      'เปิดแจ้งเตือน Telegram'
    );

    // Add Field 2: อีเมล (email)
    console.log('  ➕ Adding field: อีเมล');
    await addFieldButton.click();
    await page.waitForTimeout(1000);

    await fieldTypeSelect.click();
    await page.click('text="อีเมล"');
    await page.waitForTimeout(500);

    await expandFieldCard(page, 'ชื่อฟิลด์ใหม่');
    await page.locator('input[data-testid="field-title-input"]').nth(1).fill('อีเมล');
    await page.waitForTimeout(500);

    // Collapse and toggle settings
    await page.click('[data-testid="field-card"]:has-text("อีเมล") >> button');
    await toggleFieldIcon(
      page,
      '[data-testid="field-card"]:has-text("อีเมล")',
      'ทำให้เป็นฟิลด์จำเป็น'
    );
    await toggleFieldIcon(
      page,
      '[data-testid="field-card"]:has-text("อีเมล")',
      'แสดงในตาราง'
    );

    // Add Field 3: เบอร์โทร (phone)
    console.log('  ➕ Adding field: เบอร์โทร');
    await addFieldButton.click();
    await page.waitForTimeout(1000);

    await fieldTypeSelect.click();
    await page.click('text="เบอร์โทร"');
    await page.waitForTimeout(500);

    await expandFieldCard(page, 'ชื่อฟิลด์ใหม่');
    await page.locator('input[data-testid="field-title-input"]').nth(2).fill('เบอร์โทรศัพท์');
    await page.waitForTimeout(500);

    await page.click('[data-testid="field-card"]:has-text("เบอร์โทรศัพท์") >> button');
    await toggleFieldIcon(
      page,
      '[data-testid="field-card"]:has-text("เบอร์โทรศัพท์")',
      'ทำให้เป็นฟิลด์จำเป็น'
    );

    // Step 4: Add Sub-Forms
    console.log('📝 Step 5: Add Sub-Forms');

    // Switch to Subforms tab
    await page.click('button:has-text("ฟอร์มย่อย"), button:has-text("Subforms")');
    await page.waitForTimeout(1000);

    // Add SubForm 1
    console.log('  ➕ Adding SubForm 1: ข้อมูลที่อยู่');
    const addSubFormButton = page.locator('button:has-text("เพิ่มฟอร์มย่อย"), button[data-testid="add-subform-button"]').first();
    await addSubFormButton.click();
    await page.waitForTimeout(1000);

    // Set SubForm title
    const subFormTitleSelector = '[data-subform-id] >> text="คลิกเพื่อระบุชื่อฟอร์มย่อย"';
    await setInlineEditValue(page, subFormTitleSelector, 'ข้อมูลที่อยู่');

    // Set SubForm description
    const subFormDescSelector = '[data-subform-id] >> text="คลิกเพื่อเพิ่มคำอธิบายฟอร์มย่อย"';
    await setInlineEditValue(page, subFormDescSelector, 'กรอกข้อมูลที่อยู่สำหรับการติดต่อ');

    // Add fields to SubForm 1
    console.log('    ➕ Adding SubForm 1 fields');

    // Click add field button inside SubForm
    const subFormAddFieldBtn = page.locator('[data-subform-id] >> button:has-text("เพิ่มฟิลด์")').first();
    await subFormAddFieldBtn.click();
    await page.waitForTimeout(1000);

    // Add address field (paragraph)
    await page.locator('[data-subform-id] select').first().click();
    await page.click('text="ข้อความยาว"');
    await page.waitForTimeout(500);

    await expandFieldCard(page, 'ชื่อฟิลด์ใหม่');
    await page.locator('[data-subform-id] input[data-testid="field-title-input"]').first().fill('ที่อยู่');
    await page.waitForTimeout(500);

    // Add province field
    await subFormAddFieldBtn.click();
    await page.waitForTimeout(1000);

    await page.locator('[data-subform-id] select').nth(1).click();
    await page.click('text="จังหวัด"');
    await page.waitForTimeout(500);

    await expandFieldCard(page, 'ชื่อฟิลด์ใหม่');
    await page.locator('[data-subform-id] input[data-testid="field-title-input"]').nth(1).fill('จังหวัด');
    await page.waitForTimeout(500);

    // Add SubForm 2
    console.log('  ➕ Adding SubForm 2: เอกสารแนบ');
    await addSubFormButton.click();
    await page.waitForTimeout(1000);

    const subForm2TitleSelector = '[data-subform-id]:nth-of-type(2) >> text="คลิกเพื่อระบุชื่อฟอร์มย่อย"';
    await setInlineEditValue(page, subForm2TitleSelector, 'เอกสารแนบ');

    // Add file upload field to SubForm 2
    const subForm2AddFieldBtn = page.locator('[data-subform-id]:nth-of-type(2) >> button:has-text("เพิ่มฟิลด์")').first();
    await subForm2AddFieldBtn.click();
    await page.waitForTimeout(1000);

    await page.locator('[data-subform-id]:nth-of-type(2) select').first().click();
    await page.click('text="แนบไฟล์"');
    await page.waitForTimeout(500);

    await expandFieldCard(page, 'ชื่อฟิลด์ใหม่');
    await page.locator('[data-subform-id]:nth-of-type(2) input[data-testid="field-title-input"]').first().fill('ไฟล์เอกสาร');
    await page.waitForTimeout(500);

    // Step 5: Save Form
    console.log('📝 Step 6: Save Form');

    const saveButton = page.locator('button:has-text("บันทึกฟอร์ม"), button:has-text("Save")').first();
    await saveButton.click();

    // Wait for success toast/message
    await page.waitForSelector('text=/บันทึกสำเร็จ|Success|สำเร็จ/i', { timeout: 10000 });

    console.log('✅ Form saved successfully!');
    await page.waitForTimeout(2000);

    // Step 6: Verify Form in Database (via API)
    console.log('📝 Step 7: Verify Form in Database');

    // Get latest form from API
    const response = await page.request.get(`${API_URL}/forms`, {
      headers: {
        'Authorization': `Bearer ${await page.evaluate(() => localStorage.getItem('token'))}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const forms = await response.json();

    // Find our created form
    const createdForm = forms.data.forms.find(f => f.title === 'ฟอร์มทดสอบระบบ Sub-Form');
    expect(createdForm).toBeTruthy();

    console.log('✅ Form found in database:', {
      id: createdForm.id,
      title: createdForm.title,
      fieldsCount: createdForm.fields?.length || 0,
      subFormsCount: createdForm.subForms?.length || 0
    });

    // Verify field counts
    expect(createdForm.fields.length).toBeGreaterThanOrEqual(3); // At least 3 main fields
    expect(createdForm.subForms.length).toBeGreaterThanOrEqual(2); // At least 2 sub-forms

    // Verify field settings
    const nameField = createdForm.fields.find(f => f.title === 'ชื่อ-นามสกุล');
    expect(nameField).toBeTruthy();
    expect(nameField.required).toBe(true);
    expect(nameField.showInTable).toBe(true);
    expect(nameField.sendTelegram).toBe(true);

    // Verify sub-forms
    const addressSubForm = createdForm.subForms.find(sf => sf.title === 'ข้อมูลที่อยู่');
    expect(addressSubForm).toBeTruthy();
    expect(addressSubForm.fields.length).toBeGreaterThanOrEqual(2);

    const documentsSubForm = createdForm.subForms.find(sf => sf.title === 'เอกสารแนบ');
    expect(documentsSubForm).toBeTruthy();
    expect(documentsSubForm.fields.length).toBeGreaterThanOrEqual(1);

    console.log('✅ All verifications passed!');
    console.log('📊 Test Summary:', {
      mainFields: createdForm.fields.length,
      subForms: createdForm.subForms.length,
      totalSubFormFields: createdForm.subForms.reduce((sum, sf) => sum + sf.fields.length, 0)
    });
  });

  test('Sub-Form Management: Move, Duplicate, Delete', async ({ page }) => {
    // Navigate to form builder
    const createButton = page.locator('[data-testid="create-form-btn"]');
    await createButton.click();
    await page.waitForTimeout(2000);

    // Set form title
    await setInlineEditValue(
      page,
      'h1:has-text("คลิกเพื่อระบุชื่อฟอร์ม")',
      'ทดสอบ SubForm Management'
    );

    // Go to Subforms tab
    await page.click('button:has-text("ฟอร์มย่อย")');
    await page.waitForTimeout(1000);

    // Add 3 SubForms
    for (let i = 1; i <= 3; i++) {
      await page.click('button:has-text("เพิ่มฟอร์มย่อย")');
      await page.waitForTimeout(1000);

      const selector = `[data-subform-id]:nth-of-type(${i}) >> text="คลิกเพื่อระบุชื่อฟอร์มย่อย"`;
      await setInlineEditValue(page, selector, `SubForm ${i}`);
    }

    // Test: Duplicate SubForm 2
    console.log('📝 Testing: Duplicate SubForm');
    const subForm2 = page.locator('[data-subform-id]:has-text("SubForm 2")').first();
    await subForm2.locator('button[title*="ตัวเลือกเพิ่มเติม"]').click();
    await page.click('text="ทำสำเนา"');
    await page.waitForTimeout(1000);

    // Verify duplicated subform exists
    const duplicateExists = await page.locator('text="SubForm 2 (สำเนา)"').count() > 0;
    expect(duplicateExists).toBe(true);
    console.log('✅ SubForm duplicated successfully');

    // Test: Move SubForm Up
    console.log('📝 Testing: Move SubForm Up');
    const subForm3 = page.locator('[data-subform-id]:has-text("SubForm 3")').first();
    await subForm3.locator('button[title*="ตัวเลือกเพิ่มเติม"]').click();
    await page.click('text="ย้ายขึ้น"');
    await page.waitForTimeout(1000);
    console.log('✅ SubForm moved up');

    // Test: Delete SubForm
    console.log('📝 Testing: Delete SubForm');
    const deleteTarget = page.locator('[data-subform-id]:has-text("SubForm 1")').first();
    await deleteTarget.locator('button[title*="ตัวเลือกเพิ่มเติม"]').click();
    await page.click('text="ลบ"');
    await page.waitForTimeout(1000);

    // Verify deletion
    const subForm1Exists = await page.locator('text="SubForm 1"').count() > 0;
    expect(subForm1Exists).toBe(false);
    console.log('✅ SubForm deleted successfully');
  });

  test('Field Toggle Icons: Required → Table → Telegram', async ({ page }) => {
    // Navigate to form builder
    const createButton = page.locator('[data-testid="create-form-btn"]');
    await createButton.click();
    await page.waitForTimeout(2000);

    // Add a field
    await page.click('button:has-text("Fields")');
    await page.click('button:has-text("เพิ่มฟิลด์")');
    await page.waitForTimeout(1000);

    // Expand and set field name
    await expandFieldCard(page, 'ชื่อฟิลด์ใหม่');
    await page.locator('input[data-testid="field-title-input"]').fill('ทดสอบ Toggle');
    await page.waitForTimeout(500);

    // Collapse field
    await page.click('[data-testid="field-card"]:has-text("ทดสอบ Toggle") >> button');
    await page.waitForTimeout(500);

    // Test: Required toggle (should enable)
    console.log('📝 Testing: Required Toggle');
    const requiredBtn = page.locator('[data-testid="field-card"]:has-text("ทดสอบ Toggle") button[title*="ทำให้เป็นฟิลด์จำเป็น"]');
    await requiredBtn.click();
    await page.waitForTimeout(500);

    // Verify required is active (check for active styling)
    const requiredActive = await requiredBtn.locator('..').evaluate(el =>
      el.className.includes('bg-red-500')
    );
    expect(requiredActive).toBe(true);
    console.log('✅ Required toggle activated');

    // Test: Table toggle (should enable after required is true)
    console.log('📝 Testing: Table Toggle');
    const tableBtn = page.locator('[data-testid="field-card"]:has-text("ทดสอบ Toggle") button[title*="แสดงในตาราง"]');
    await tableBtn.click();
    await page.waitForTimeout(500);

    const tableActive = await tableBtn.locator('..').evaluate(el =>
      el.className.includes('bg-blue-500')
    );
    expect(tableActive).toBe(true);
    console.log('✅ Table toggle activated');

    // Test: Telegram toggle
    console.log('📝 Testing: Telegram Toggle');
    const telegramBtn = page.locator('[data-testid="field-card"]:has-text("ทดสอบ Toggle") button[title*="เปิดแจ้งเตือน Telegram"]');
    await telegramBtn.click();
    await page.waitForTimeout(500);

    const telegramActive = await telegramBtn.locator('..').evaluate(el =>
      el.className.includes('bg-green-500')
    );
    expect(telegramActive).toBe(true);
    console.log('✅ Telegram toggle activated');

    // Test: Unchecking required should uncheck dependent toggles
    console.log('📝 Testing: Uncheck Required (should cascade)');
    await requiredBtn.click();
    await page.waitForTimeout(500);

    // Verify all toggles are now inactive
    const allInactive = await page.locator('[data-testid="field-card"]:has-text("ทดสอบ Toggle")').evaluate(card => {
      const hasRedActive = card.querySelector('.bg-red-500');
      const hasBlueActive = card.querySelector('.bg-blue-500');
      const hasGreenActive = card.querySelector('.bg-green-500');
      return !hasRedActive && !hasBlueActive && !hasGreenActive;
    });
    expect(allInactive).toBe(true);
    console.log('✅ Cascade uncheck works correctly');
  });
});
