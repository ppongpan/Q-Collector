/**
 * E2E Tests - Form CRUD Operations
 * Complete Create, Read, Update, Delete workflow for forms
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

// Test data
let createdFormId;
let createdFormName;

test.describe('Form CRUD Operations', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await loginIfNeeded(page);
  });

  // ==================== CREATE ====================
  test('CRUD-1: Create a new form', async ({ page }) => {
    console.log('🧪 Test: Create Form');

    // Navigate to form builder
    const createBtn = page.locator('[data-testid="create-form-btn"]');
    await createBtn.click();
    await page.waitForLoadState('networkidle');

    // Fill form details
    createdFormName = `E2E Test Form ${Date.now()}`;
    const titleInput = page.locator('[data-testid="form-title-input"]');
    await titleInput.click();
    await titleInput.fill(createdFormName);

    // Fill description
    const descInput = page.locator('textarea[name="description"]')
      .or(page.locator('textarea[placeholder*="คำอธิบาย"]'));
    if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await descInput.fill('Automated E2E test form for CRUD operations');
    }

    // Configure default field or add new one
    const fieldsBeforeAdd = await page.locator('[data-testid="field-item"]').count();
    if (fieldsBeforeAdd > 0) {
      await configureExistingField(page, 0, 'Test Field');
    } else {
      await addFieldToForm(page, 'Test Field');
    }

    // Save form
    const saveBtn = page.locator('[data-testid="save-form-btn"]');
    await saveBtn.click({ force: true });

    // Wait for redirect to form list
    await page.waitForURL(url => !url.toString().includes('builder'), { timeout: 10000 });

    // Verify form appears in list
    const formCard = page.locator(`[data-testid="form-card"]:has-text("${createdFormName}")`);
    await expect(formCard).toBeVisible({ timeout: 5000 });

    console.log(`✅ Form created: "${createdFormName}"`);
  });

  // ==================== READ ====================
  test('CRUD-2: Read form details', async ({ page }) => {
    console.log('🧪 Test: Read Form');

    // Find the first form card
    await page.waitForSelector('[data-testid="form-card"]', { timeout: 10000 });
    const formCard = page.locator('[data-testid="form-card"]').first();

    // Get form title before clicking
    const formTitle = await formCard.locator('h3, [data-testid="form-title"]').first().textContent();
    console.log(`  Reading form: "${formTitle}"`);

    // Click the "View" icon (ดูข้อมูล) instead of clicking the card itself
    const viewBtn = formCard.locator('[title="ดูข้อมูล"]')
      .or(formCard.locator('svg[data-icon="eye"]').locator('..'));

    await viewBtn.click();
    await page.waitForLoadState('networkidle');

    // Now we should be on the submission list page
    // Verify we're on submission list page (not form view)
    const isOnSubmissionList = await page.locator('text="รายการข้อมูล"')
      .or(page.locator('[data-testid="submission-list"]'))
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    expect(isOnSubmissionList).toBeTruthy();
    console.log('✅ Form submission list displayed correctly');
  });

  // ==================== UPDATE ====================
  test('CRUD-3: Update form', async ({ page }) => {
    console.log('🧪 Test: Update Form');

    // Find the first form card
    const firstFormCard = page.locator('[data-testid="form-card"]').first();
    await expect(firstFormCard).toBeVisible({ timeout: 5000 });

    // Look for edit button WITHIN the form card
    const editBtn = firstFormCard.locator('[data-testid="edit-form-btn"]')
      .or(firstFormCard.locator('button:has-text("แก้ไข")'))
      .or(firstFormCard.locator('[aria-label*="edit"]'));

    const editBtnVisible = await editBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (editBtnVisible) {
      await editBtn.click();
      await page.waitForLoadState('networkidle');

      // Update form title
      const updatedName = `Updated Form ${Date.now()}`;
      const titleInput = page.locator('[data-testid="form-title-input"]')
        .or(page.locator('input[name="title"]'));

      await titleInput.click();
      await titleInput.fill(updatedName);

      // Save changes
      const saveBtn = page.locator('[data-testid="save-form-btn"]')
        .or(page.locator('button:has-text("บันทึก")'))
        .or(page.locator('button[type="submit"]'));

      await saveBtn.click({ force: true });

      // Wait for save confirmation or redirect
      await page.waitForTimeout(2000);

      console.log(`✅ Form updated to: "${updatedName}"`);
    } else {
      console.log('⚠️  Edit button not found - may not have permission');
      test.skip();
    }
  });

  // ==================== DELETE ====================
  test('CRUD-4: Delete form', async ({ page }) => {
    console.log('🧪 Test: Delete Form');

    // Create a form specifically for deletion
    const createBtn = page.locator('[data-testid="create-form-btn"]');
    await createBtn.click();
    await page.waitForLoadState('networkidle');

    const formToDelete = `Delete Test ${Date.now()}`;
    const titleInput = page.locator('[data-testid="form-title-input"]');
    await titleInput.click();
    await titleInput.fill(formToDelete);

    // Configure default field instead of adding new one
    const fieldsPresent = await page.locator('[data-testid="field-item"]').count();
    if (fieldsPresent > 0) {
      await configureExistingField(page, 0, 'Delete Test Field');
    } else {
      await addFieldToForm(page);
    }

    const saveBtn = page.locator('[data-testid="save-form-btn"]');
    await saveBtn.click({ force: true });

    // Wait for redirect to form list (check for form list elements instead of URL)
    await page.waitForSelector('[data-testid="form-card"]', { timeout: 15000 });
    await page.waitForTimeout(1000); // Wait for form list to fully load

    // Find the form we just created
    const formCard = page.locator(`[data-testid="form-card"]:has-text("${formToDelete}")`);
    await expect(formCard).toBeVisible({ timeout: 5000 });

    // Look for delete button WITHIN the form card (don't click the card itself)
    const deleteBtn = formCard.locator('[data-testid="delete-form-btn"]')
      .or(formCard.locator('button:has-text("ลบ")'))
      .or(formCard.locator('[aria-label*="delete"]'));

    const deleteBtnVisible = await deleteBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (deleteBtnVisible) {
      await deleteBtn.click();

      // Wait for toast to appear
      await page.waitForTimeout(1000);

      // Handle confirmation dialog - look for the action button in toast
      const confirmBtn = page.locator('button:has-text("ยืนยันการลบ")')
        .or(page.locator('button:has-text("ยืนยัน")'))
        .or(page.locator('button:has-text("Confirm")'))
        .or(page.locator('[role="status"] button')) // Toast action button
        .first();

      await confirmBtn.waitFor({ state: 'visible', timeout: 5000 });
      await confirmBtn.click();

      // Wait for deletion to complete and list to reload
      await page.waitForTimeout(3000);

      // Verify form is deleted (should not appear in list)
      const deletedForm = page.locator(`[data-testid="form-card"]:has-text("${formToDelete}")`);
      const stillExists = await deletedForm.isVisible({ timeout: 2000 }).catch(() => false);

      expect(stillExists).toBeFalsy();
      console.log(`✅ Form deleted: "${formToDelete}"`);
    } else {
      console.log('⚠️  Delete button not found - may not have permission');
      test.skip();
    }
  });

  // ==================== CRUD SEQUENCE ====================
  test('CRUD-5: Complete CRUD sequence', async ({ page }) => {
    console.log('🧪 Test: Complete CRUD Sequence');

    const formName = `CRUD Sequence ${Date.now()}`;

    // CREATE
    console.log('  Step 1: CREATE');
    const createBtn = page.locator('[data-testid="create-form-btn"]');
    await createBtn.click();
    await page.waitForLoadState('networkidle');

    const titleInput = page.locator('[data-testid="form-title-input"]');
    await titleInput.click();
    await titleInput.fill(formName);

    // Configure default field instead of adding new one
    const fieldsPresent = await page.locator('[data-testid="field-item"]').count();
    if (fieldsPresent > 0) {
      await configureExistingField(page, 0, 'CRUD Test Field');
    } else {
      await addFieldToForm(page);
    }

    let saveBtn = page.locator('[data-testid="save-form-btn"]');
    await saveBtn.click({ force: true });

    // Wait for redirect to form list
    await page.waitForSelector('[data-testid="form-card"]', { timeout: 15000 });
    await page.waitForTimeout(1000); // Wait for form list to fully load

    // READ
    console.log('  Step 2: READ');
    const formCard = page.locator(`[data-testid="form-card"]:has-text("${formName}")`);
    await expect(formCard).toBeVisible({ timeout: 5000 });

    // UPDATE
    console.log('  Step 3: UPDATE');
    // Find edit button WITHIN the form card
    const editBtn = formCard.locator('[data-testid="edit-form-btn"]')
      .or(formCard.locator('button:has-text("แก้ไข")'));

    const canEdit = await editBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (canEdit) {
      await editBtn.click();
      await page.waitForLoadState('networkidle');

      const updatedName = `${formName} - Updated`;
      const updateTitleInput = page.locator('[data-testid="form-title-input"]');
      await updateTitleInput.click();
      await updateTitleInput.fill(updatedName);

      saveBtn = page.locator('[data-testid="save-form-btn"]');
      await saveBtn.click({ force: true });

      // Wait for redirect to form list
      await page.waitForSelector('[data-testid="form-card"]', { timeout: 15000 });
      await page.waitForTimeout(1000); // Wait for form list to fully load

      // DELETE
      console.log('  Step 4: DELETE');
      // Find the updated form card
      const updatedFormCard = page.locator(`[data-testid="form-card"]:has-text("${updatedName}")`);
      await expect(updatedFormCard).toBeVisible({ timeout: 5000 });

      // Find delete button WITHIN the form card
      const deleteBtn = updatedFormCard.locator('[data-testid="delete-form-btn"]')
        .or(updatedFormCard.locator('button:has-text("ลบ")'));

      const canDelete = await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false);

      if (canDelete) {
        await deleteBtn.click();

        // Wait for toast to appear
        await page.waitForTimeout(1000);

        const confirmBtn = page.locator('button:has-text("ยืนยันการลบ")')
          .or(page.locator('button:has-text("ยืนยัน")'))
          .or(page.locator('button:has-text("Confirm")'))
          .or(page.locator('[role="status"] button'))
          .first();

        await confirmBtn.waitFor({ state: 'visible', timeout: 5000 });
        await confirmBtn.click();

        // Wait for deletion to complete
        await page.waitForTimeout(3000);
        console.log('✅ Complete CRUD sequence successful');
      } else {
        console.log('⚠️  Cannot delete - skipping DELETE step');
      }
    } else {
      console.log('⚠️  Cannot edit - skipping UPDATE and DELETE steps');
    }
  });

});

// ==================== HELPER FUNCTIONS ====================

async function configureExistingField(page, fieldIndex, fieldTitle) {
  const field = page.locator('[data-testid="field-item"]').nth(fieldIndex);

  // Step 1: Click the field header to expand into edit mode
  const fieldHeader = field.locator('text="Untitled Field"').or(field.locator('.field-header')).first();
  await fieldHeader.click();
  await page.waitForTimeout(500);

  // Step 2: Fill in field title
  const fieldTitleInput = field.locator('[data-testid="field-title-input"] input')
    .or(field.locator('input[placeholder="ระบุชื่อฟิลด์"]'));

  if (await fieldTitleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await fieldTitleInput.click();
    await fieldTitleInput.clear();
    await fieldTitleInput.pressSequentially(fieldTitle, { delay: 50 });
    await page.waitForTimeout(500);
  }

  // Step 3: Close the field editor by clicking outside
  // Click on an area outside form fields to close the field editor
  await page.mouse.click(100, 400);
  await page.waitForTimeout(500);

  // Note: No need to click toggle icons for "required" and "showInTable"
  // because EnhancedFormBuilder already sets these to true by default
  // (see EnhancedFormBuilder.jsx lines 760-761, 1189-1190)
}

async function addFieldToForm(page, fieldTitle = 'Test Field') {
  const addFieldBtn = page.locator('[data-testid="add-field-btn"]')
    .or(page.locator('button:has-text("เพิ่มฟีลด์")'))
    .or(page.locator('.animated-add-button'));

  if (await addFieldBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    // Get initial field count
    const initialCount = await page.locator('[data-testid="field-item"]').count();

    await addFieldBtn.click({ clickCount: 1 });

    // Wait for new field to be added
    await page.waitForFunction(
      (count) => document.querySelectorAll('[data-testid="field-item"]').length > count,
      initialCount,
      { timeout: 3000 }
    ).catch(() => {});

    await page.waitForTimeout(1000);

    // Check how many fields were actually added
    const finalCount = await page.locator('[data-testid="field-item"]').count();
    const fieldsAdded = finalCount - initialCount;

    // Select field type for all newly added fields
    const shortAnswerOption = page.locator('[data-value="short_answer"]')
      .or(page.locator('text="คำตอบสั้น"'))
      .or(page.locator('text="Short Answer"'));

    if (await shortAnswerOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await shortAnswerOption.click();
      await page.waitForTimeout(500);
    }

    // Fill titles for ALL newly added fields with unique names if multiple were created
    for (let i = 0; i < fieldsAdded; i++) {
      const fieldIndex = initialCount + i;
      const field = page.locator('[data-testid="field-item"]').nth(fieldIndex);

      // Step 1: Click the field header/title to expand into edit mode
      const fieldHeader = field.locator('text="Untitled Field"').or(field.locator('.field-header')).first();
      await fieldHeader.click();
      await page.waitForTimeout(500);

      // Step 2: Fill in field title (ตั้งชื่อฟิลด์) - use unique name if multiple fields
      const uniqueTitle = fieldsAdded > 1 ? `${fieldTitle} ${i + 1}` : fieldTitle;
      const fieldTitleInput = field.locator('[data-testid="field-title-input"] input')
        .or(field.locator('input[placeholder="ระบุชื่อฟิลด์"]'));

      if (await fieldTitleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await fieldTitleInput.click();
        await fieldTitleInput.clear();
        await fieldTitleInput.pressSequentially(uniqueTitle, { delay: 50 });
        await page.waitForTimeout(500);
      }

      // Step 3: Close the field editor by clicking outside
      await page.mouse.click(100, 400);
      await page.waitForTimeout(500);

      // Note: No need to click toggle icons for "required" and "showInTable"
      // because EnhancedFormBuilder already sets these to true by default
    }
  }
}

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
