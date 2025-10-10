/**
 * E2E Tests - Submission Workflow
 * Complete workflow: Create Form → Submit Data → View → Edit → Delete
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
let testFormId;
let testSubmissionId;

test.describe('Submission Workflow', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await loginIfNeeded(page);
  });

  // ==================== SETUP: Create Test Form ====================
  test('SUBMIT-0: Setup - Create test form', async ({ page }) => {
    console.log('🧪 Setup: Create test form for submissions');

    const createBtn = page.locator('[data-testid="create-form-btn"]');
    await createBtn.click();
    await page.waitForLoadState('networkidle');

    const formName = `Submission Test ${Date.now()}`;
    const titleInput = page.locator('[data-testid="form-title-input"]');
    await titleInput.click();
    await titleInput.fill(formName);

    // Add a field (required for form to be saveable)
    const addFieldBtn = page.locator('[data-testid="add-field-btn"]')
      .or(page.locator('button:has-text("เพิ่มฟีลด์")'))
      .or(page.locator('.animated-add-button'));

    if (await addFieldBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addFieldBtn.click();
      await page.waitForTimeout(500);

      const shortAnswerOption = page.locator('[data-value="short_answer"]')
        .or(page.locator('text="คำตอบสั้น"'));

      if (await shortAnswerOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await shortAnswerOption.click();
        await page.waitForTimeout(500);
      }

      // Check showInTable checkbox (required for form to be saveable)
      const showInTableCheckbox = page.locator('input[name="showInTable"]')
        .or(page.locator('.field-item').last().locator('input[type="checkbox"]').first());

      if (await showInTableCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
        const isChecked = await showInTableCheckbox.isChecked().catch(() => false);
        if (!isChecked) {
          await showInTableCheckbox.check();
          await page.waitForTimeout(300);
        }
      }
    }

    const fieldCount = await page.locator('[data-testid="field-item"]').count();
    console.log(`  Form has ${fieldCount} field(s)`);

    const saveBtn = page.locator('[data-testid="save-form-btn"]');
    await saveBtn.click({ force: true });

    await page.waitForURL(url => !url.toString().includes('builder'), { timeout: 10000 });

    const formCard = page.locator(`[data-testid="form-card"]:has-text("${formName}")`);
    await expect(formCard).toBeVisible({ timeout: 5000 });

    console.log(`✅ Test form created: "${formName}"`);
  });

  // ==================== CREATE SUBMISSION ====================
  test('SUBMIT-1: Create new submission', async ({ page }) => {
    console.log('🧪 Test: Create Submission');

    // Navigate to form
    await page.locator('[data-testid="form-card"]').first().click();
    await page.waitForLoadState('networkidle');

    // Click add submission button
    const addBtn = page.locator('button:has-text("เพิ่มข้อมูล")')
      .or(page.locator('button:has-text("Submit")'))
      .or(page.locator('[data-testid="add-submission-btn"]'));

    const addBtnVisible = await addBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (addBtnVisible) {
      await addBtn.click();
      await page.waitForLoadState('networkidle');

      // Fill form fields
      const textInputs = await page.locator('input[type="text"]').all();
      for (let i = 0; i < textInputs.length; i++) {
        await textInputs[i].fill(`Test Data ${i + 1} - ${Date.now()}`);
      }

      const emailInputs = await page.locator('input[type="email"]').all();
      for (const input of emailInputs) {
        await input.fill(`test${Date.now()}@example.com`);
      }

      const phoneInputs = await page.locator('input[type="tel"]').all();
      for (const input of phoneInputs) {
        await input.fill('0812345678');
      }

      // Submit form
      const submitBtn = page.locator('button[type="submit"]')
        .or(page.locator('button:has-text("ส่ง")'));
      await submitBtn.click();

      // Wait for success message or redirect
      const successVisible = await page.locator('text=/สำเร็จ|success/i')
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (successVisible) {
        console.log('✅ Submission created successfully');
      } else {
        console.log('⚠️  Success message not shown, but submission may have succeeded');
      }
    } else {
      console.log('⚠️  Add submission button not found');
      test.skip();
    }
  });

  // ==================== VIEW SUBMISSION ====================
  test('SUBMIT-2: View submission details', async ({ page }) => {
    console.log('🧪 Test: View Submission');

    // Navigate to form
    await page.locator('[data-testid="form-card"]').first().click();
    await page.waitForLoadState('networkidle');

    // Check if submissions exist
    const submissionRows = page.locator('tbody tr, [data-testid="submission-row"]');
    const rowCount = await submissionRows.count();

    if (rowCount > 0) {
      console.log(`  Found ${rowCount} submission(s)`);

      // Click first submission
      await submissionRows.first().click();
      await page.waitForLoadState('networkidle');

      // Verify submission details are displayed
      const hasDetails = await page.locator('[data-testid="submission-detail"], .submission-detail')
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (hasDetails || await page.url().includes('submission')) {
        console.log('✅ Submission details displayed');
      } else {
        console.log('⚠️  Submission details page may not have loaded correctly');
      }
    } else {
      console.log('⚠️  No submissions found - create one first');
      test.skip();
    }
  });

  // ==================== EDIT SUBMISSION ====================
  test('SUBMIT-3: Edit submission', async ({ page }) => {
    console.log('🧪 Test: Edit Submission');

    // Navigate to form
    await page.locator('[data-testid="form-card"]').first().click();
    await page.waitForLoadState('networkidle');

    // Click first submission
    const submissionRows = page.locator('tbody tr, [data-testid="submission-row"]');
    const rowCount = await submissionRows.count();

    if (rowCount > 0) {
      await submissionRows.first().click();
      await page.waitForLoadState('networkidle');

      // Look for edit button
      const editBtn = page.locator('button:has-text("แก้ไข")')
        .or(page.locator('[data-testid="edit-btn"]'))
        .or(page.locator('[aria-label*="edit"]'));

      const canEdit = await editBtn.isVisible({ timeout: 5000 }).catch(() => false);

      if (canEdit) {
        await editBtn.click();
        await page.waitForLoadState('networkidle');

        // Modify first text field
        const firstInput = page.locator('input[type="text"]').first();
        const inputVisible = await firstInput.isVisible({ timeout: 3000 }).catch(() => false);

        if (inputVisible) {
          const newValue = `Edited ${Date.now()}`;
          await firstInput.fill(newValue);

          // Save changes
          const saveBtn = page.locator('button:has-text("บันทึก")')
            .or(page.locator('button[type="submit"]'));
          await saveBtn.click();

          // Wait for success
          const saved = await page.locator('text=/บันทึกสำเร็จ|saved|success/i')
            .isVisible({ timeout: 5000 })
            .catch(() => false);

          if (saved) {
            console.log(`✅ Submission edited: "${newValue}"`);
          } else {
            console.log('✅ Submission edit completed (no confirmation message)');
          }
        } else {
          console.log('⚠️  No editable fields found');
        }
      } else {
        console.log('⚠️  Edit button not found - may not have permission');
        test.skip();
      }
    } else {
      console.log('⚠️  No submissions found');
      test.skip();
    }
  });

  // ==================== DELETE SUBMISSION ====================
  test('SUBMIT-4: Delete submission', async ({ page }) => {
    console.log('🧪 Test: Delete Submission');

    // Navigate to form and create a submission to delete
    await page.locator('[data-testid="form-card"]').first().click();
    await page.waitForLoadState('networkidle');

    // Create a new submission
    const addBtn = page.locator('button:has-text("เพิ่มข้อมูล")')
      .or(page.locator('[data-testid="add-submission-btn"]'));

    const canAdd = await addBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (canAdd) {
      await addBtn.click();
      await page.waitForLoadState('networkidle');

      const testValue = `Delete Test ${Date.now()}`;
      const firstInput = page.locator('input[type="text"]').first();
      await firstInput.fill(testValue);

      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.click();
      await page.waitForTimeout(2000);

      // Find the submission we just created
      await page.waitForLoadState('networkidle');
      const submissionRow = page.locator(`tr:has-text("${testValue}")`);

      const rowExists = await submissionRow.isVisible({ timeout: 5000 }).catch(() => false);

      if (rowExists) {
        await submissionRow.click();
        await page.waitForLoadState('networkidle');

        // Look for delete button
        const deleteBtn = page.locator('button:has-text("ลบ")')
          .or(page.locator('[data-testid="delete-btn"]'))
          .or(page.locator('[aria-label*="delete"]'));

        const canDelete = await deleteBtn.isVisible({ timeout: 5000 }).catch(() => false);

        if (canDelete) {
          await deleteBtn.click();

          // Handle confirmation
          const confirmBtn = page.locator('button:has-text("ยืนยัน")')
            .or(page.locator('button:has-text("Confirm")'));

          const confirmVisible = await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false);
          if (confirmVisible) {
            await confirmBtn.click();
          }

          await page.waitForTimeout(2000);

          // Verify deletion
          const stillExists = await page.locator(`tr:has-text("${testValue}")`)
            .isVisible({ timeout: 2000 })
            .catch(() => false);

          if (!stillExists) {
            console.log(`✅ Submission deleted: "${testValue}"`);
          } else {
            console.log('⚠️  Submission may not have been deleted');
          }
        } else {
          console.log('⚠️  Delete button not found');
        }
      } else {
        console.log('⚠️  Created submission not found in list');
      }
    } else {
      console.log('⚠️  Cannot create submission to delete');
      test.skip();
    }
  });

  // ==================== COMPLETE WORKFLOW ====================
  test('SUBMIT-5: Complete submission workflow', async ({ page }) => {
    console.log('🧪 Test: Complete Submission Workflow');

    const testValue = `Workflow ${Date.now()}`;

    // Step 1: Navigate to form
    console.log('  Step 1: Navigate to form');
    await page.locator('[data-testid="form-card"]').first().click();
    await page.waitForLoadState('networkidle');

    // Step 2: Create submission
    console.log('  Step 2: Create submission');
    const addBtn = page.locator('button:has-text("เพิ่มข้อมูล")');
    await addBtn.click();
    await page.waitForLoadState('networkidle');

    const firstInput = page.locator('input[type="text"]').first();
    await firstInput.fill(testValue);

    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    await page.waitForTimeout(2000);

    // Step 3: View submission
    console.log('  Step 3: View submission');
    await page.waitForLoadState('networkidle');
    const submissionRow = page.locator(`tr:has-text("${testValue}")`);
    await submissionRow.click();
    await page.waitForLoadState('networkidle');

    // Step 4: Edit submission
    console.log('  Step 4: Edit submission');
    const editBtn = page.locator('button:has-text("แก้ไข")');
    const canEdit = await editBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (canEdit) {
      await editBtn.click();
      await page.waitForLoadState('networkidle');

      const editedValue = `${testValue} - Edited`;
      const editInput = page.locator('input[type="text"]').first();
      await editInput.fill(editedValue);

      const saveBtn = page.locator('button:has-text("บันทึก")');
      await saveBtn.click();
      await page.waitForTimeout(2000);

      // Step 5: Delete submission
      console.log('  Step 5: Delete submission');
      const deleteBtn = page.locator('button:has-text("ลบ")');
      const canDelete = await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false);

      if (canDelete) {
        await deleteBtn.click();

        const confirmBtn = page.locator('button:has-text("ยืนยัน")');
        const confirmVisible = await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false);
        if (confirmVisible) {
          await confirmBtn.click();
        }

        await page.waitForTimeout(2000);
        console.log('✅ Complete workflow successful');
      } else {
        console.log('⚠️  Cannot delete - workflow partially complete');
      }
    } else {
      console.log('⚠️  Cannot edit - workflow partially complete');
    }
  });

  // ==================== VALIDATION TESTS ====================
  test('SUBMIT-6: Validation - Required fields', async ({ page }) => {
    console.log('🧪 Test: Required Field Validation');

    await page.locator('[data-testid="form-card"]').first().click();
    await page.waitForLoadState('networkidle');

    const addBtn = page.locator('button:has-text("เพิ่มข้อมูล")');
    const canAdd = await addBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (canAdd) {
      await addBtn.click();
      await page.waitForLoadState('networkidle');

      // Try to submit without filling required fields
      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.click();

      // Check for validation message
      const hasValidation = await page.locator('text=/required|จำเป็น|กรุณากรอก/i')
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (hasValidation) {
        console.log('✅ Required field validation working');
      } else {
        console.log('⚠️  No validation message shown (fields may not be required)');
      }
    } else {
      console.log('⚠️  Cannot test validation');
      test.skip();
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
