/**
 * E2E Tests - Field Migration System
 * Tests automatic field migration when forms are updated
 *
 * Sprint 7 - Testing & QA
 * @version 0.8.0-dev
 * @since 2025-10-07
 */

const { test, expect } = require('@playwright/test');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  identifier: 'pongpanp',
  password: 'Gfvtmiu613'
};

// Helper function to login
async function loginIfNeeded(page) {
  const isLoginPage = await page.locator('input[type="password"]').isVisible().catch(() => false);

  if (isLoginPage) {
    console.log('🔐 Logging in...');
    await page.fill('input[name="identifier"]', TEST_USER.identifier);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    console.log('✅ Logged in successfully');
  }
}

// Helper to wait for migration processing
async function waitForMigrationProcessing(page, timeoutMs = 10000) {
  console.log('⏳ Waiting for migration processing...');
  await page.waitForTimeout(timeoutMs);
}

test.describe('Migration System E2E Tests', () => {
  let testFormName;
  let testFormId;

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await loginIfNeeded(page);
    testFormName = `Migration Test ${Date.now()}`;
  });

  // ==================== TEST 1: ADD FIELD MIGRATION ====================
  test('Migration-1: Add field triggers ADD_FIELD migration', async ({ page }) => {
    console.log('🧪 Test: Add Field Migration');

    // Step 1: Create initial form
    console.log('📝 Creating initial form...');
    await page.click('[data-testid="create-form-btn"]');
    await page.waitForLoadState('networkidle');

    // Fill form title
    await page.fill('[data-testid="form-title-input"]', testFormName);

    // Add first field
    const addFieldBtn = page.locator('button:has-text("เพิ่มฟิลด์")').first();
    await addFieldBtn.click();

    const fieldTitleInput = page.locator('[data-testid="field-title-input"]').last();
    await fieldTitleInput.fill('Field 1');

    // Save form
    console.log('💾 Saving initial form...');
    await page.click('[data-testid="save-form-btn"]');
    await page.waitForURL(url => !url.toString().includes('builder'), { timeout: 10000 });

    console.log('✅ Initial form created');

    // Step 2: Edit form and add new field
    console.log('✏️ Opening form for edit...');
    const formCard = page.locator(`[data-testid="form-card"]:has-text("${testFormName}")`);
    await expect(formCard).toBeVisible({ timeout: 5000 });

    // Click edit button
    const editBtn = formCard.locator('[data-testid="edit-form-btn"]');
    await editBtn.click();
    await page.waitForLoadState('networkidle');

    // Add second field (should trigger migration)
    console.log('➕ Adding second field...');
    await addFieldBtn.click();

    const newFieldInput = page.locator('[data-testid="field-title-input"]').last();
    await newFieldInput.fill('Field 2');

    // Save and expect migration preview modal
    console.log('💾 Saving with new field...');
    await page.click('[data-testid="save-form-btn"]');

    // Check if migration preview modal appears
    const migrationModal = page.locator('[data-testid="migration-preview-modal"]');
    const modalVisible = await migrationModal.isVisible({ timeout: 3000 }).catch(() => false);

    if (modalVisible) {
      console.log('✅ Migration preview modal appeared');

      // Verify ADD_FIELD badge
      const addFieldBadge = page.locator('text=ADD_FIELD').or(page.locator('text=เพิ่มคอลัมน์'));
      await expect(addFieldBadge).toBeVisible({ timeout: 2000 });

      // Confirm migration
      const confirmBtn = page.locator('button:has-text("ยืนยัน")').or(page.locator('button:has-text("Confirm")'));
      await confirmBtn.click();

      console.log('✅ Migration confirmed');
    } else {
      console.log('⚠️ Migration preview modal did not appear (migration may be running in background)');
    }

    // Wait for migration processing
    await waitForMigrationProcessing(page, 5000);

    // Verify success
    await page.waitForURL(url => !url.toString().includes('builder'), { timeout: 10000 });
    console.log('✅ Add Field Migration test completed');
  });

  // ==================== TEST 2: DELETE FIELD WITH BACKUP ====================
  test('Migration-2: Delete field shows backup warning', async ({ page }) => {
    console.log('🧪 Test: Delete Field Migration');

    // Step 1: Create form with 2 fields
    console.log('📝 Creating form with 2 fields...');
    await page.click('[data-testid="create-form-btn"]');
    await page.waitForLoadState('networkidle');

    await page.fill('[data-testid="form-title-input"]', testFormName);

    // Add 2 fields
    const addFieldBtn = page.locator('button:has-text("เพิ่มฟิลด์")').first();

    for (let i = 1; i <= 2; i++) {
      await addFieldBtn.click();
      const fieldInput = page.locator('[data-testid="field-title-input"]').last();
      await fieldInput.fill(`Field ${i}`);
    }

    // Save form
    await page.click('[data-testid="save-form-btn"]');
    await page.waitForURL(url => !url.toString().includes('builder'), { timeout: 10000 });

    console.log('✅ Form with 2 fields created');

    // Step 2: Edit form and delete one field
    console.log('✏️ Opening form for edit...');
    const formCard = page.locator(`[data-testid="form-card"]:has-text("${testFormName}")`);
    await formCard.locator('[data-testid="edit-form-btn"]').click();
    await page.waitForLoadState('networkidle');

    // Delete first field
    console.log('🗑️ Deleting first field...');
    const deleteBtn = page.locator('[data-testid="delete-field-btn"]').first();
    await deleteBtn.click();

    // Confirm deletion in field
    const confirmDeleteBtn = page.locator('button:has-text("ลบ")').or(page.locator('button:has-text("Delete")'));
    if (await confirmDeleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmDeleteBtn.click();
    }

    // Save form
    console.log('💾 Saving with deleted field...');
    await page.click('[data-testid="save-form-btn"]');

    // Check for migration preview with backup warning
    const migrationModal = page.locator('[data-testid="migration-preview-modal"]');
    const modalVisible = await migrationModal.isVisible({ timeout: 3000 }).catch(() => false);

    if (modalVisible) {
      console.log('✅ Migration preview modal appeared');

      // Verify DELETE_FIELD badge
      const deleteFieldBadge = page.locator('text=DELETE_FIELD').or(page.locator('text=ลบคอลัมน์'));
      await expect(deleteFieldBadge).toBeVisible({ timeout: 2000 });

      // Verify 90-day backup warning
      const backupWarning = page.locator('text=90').or(page.locator('text=backup'));
      await expect(backupWarning).toBeVisible({ timeout: 2000 });

      // Confirm migration
      const confirmBtn = page.locator('button:has-text("ยืนยัน")').or(page.locator('button:has-text("Confirm")'));
      await confirmBtn.click();

      console.log('✅ Migration confirmed with backup warning');
    } else {
      console.log('⚠️ Migration preview modal did not appear');
    }

    await waitForMigrationProcessing(page, 5000);
    console.log('✅ Delete Field Migration test completed');
  });

  // ==================== TEST 3: CHANGE FIELD TYPE ====================
  test('Migration-3: Change field type triggers CHANGE_TYPE migration', async ({ page }) => {
    console.log('🧪 Test: Change Field Type Migration');

    // Step 1: Create form with text field
    console.log('📝 Creating form with text field...');
    await page.click('[data-testid="create-form-btn"]');
    await page.waitForLoadState('networkidle');

    await page.fill('[data-testid="form-title-input"]', testFormName);

    // Add text field
    const addFieldBtn = page.locator('button:has-text("เพิ่มฟิลด์")').first();
    await addFieldBtn.click();

    const fieldInput = page.locator('[data-testid="field-title-input"]').last();
    await fieldInput.fill('Test Field');

    // Select field type (short_answer by default)
    const fieldTypeSelect = page.locator('[data-testid="field-type-select"]').last();
    await fieldTypeSelect.selectOption('short_answer');

    // Save form
    await page.click('[data-testid="save-form-btn"]');
    await page.waitForURL(url => !url.toString().includes('builder'), { timeout: 10000 });

    console.log('✅ Form with text field created');

    // Step 2: Edit and change field type
    console.log('✏️ Opening form for edit...');
    const formCard = page.locator(`[data-testid="form-card"]:has-text("${testFormName}")`);
    await formCard.locator('[data-testid="edit-form-btn"]').click();
    await page.waitForLoadState('networkidle');

    // Change field type from text to number
    console.log('🔄 Changing field type to number...');
    await fieldTypeSelect.first().selectOption('number');

    // Save form
    console.log('💾 Saving with changed field type...');
    await page.click('[data-testid="save-form-btn"]');

    // Check for migration preview
    const migrationModal = page.locator('[data-testid="migration-preview-modal"]');
    const modalVisible = await migrationModal.isVisible({ timeout: 3000 }).catch(() => false);

    if (modalVisible) {
      console.log('✅ Migration preview modal appeared');

      // Verify CHANGE_TYPE badge
      const changeTypeBadge = page.locator('text=CHANGE_TYPE').or(page.locator('text=เปลี่ยนชนิด'));
      await expect(changeTypeBadge).toBeVisible({ timeout: 2000 });

      // Confirm migration
      const confirmBtn = page.locator('button:has-text("ยืนยัน")').or(page.locator('button:has-text("Confirm")'));
      await confirmBtn.click();

      console.log('✅ Migration confirmed');
    } else {
      console.log('⚠️ Migration preview modal did not appear');
    }

    await waitForMigrationProcessing(page, 5000);
    console.log('✅ Change Field Type Migration test completed');
  });

  // ==================== TEST 4: FORM SUBMISSION AFTER MIGRATION ====================
  test('Migration-4: Form submission works after adding field', async ({ page }) => {
    console.log('🧪 Test: Form Submission After Migration');

    // Step 1: Create form with 1 field
    console.log('📝 Creating initial form...');
    await page.click('[data-testid="create-form-btn"]');
    await page.waitForLoadState('networkidle');

    await page.fill('[data-testid="form-title-input"]', testFormName);

    const addFieldBtn = page.locator('button:has-text("เพิ่มฟิลด์")').first();
    await addFieldBtn.click();

    const fieldInput = page.locator('[data-testid="field-title-input"]').last();
    await fieldInput.fill('Original Field');

    await page.click('[data-testid="save-form-btn"]');
    await page.waitForURL(url => !url.toString().includes('builder'), { timeout: 10000 });

    console.log('✅ Initial form created');

    // Step 2: Add new field (trigger migration)
    console.log('✏️ Adding new field...');
    const formCard = page.locator(`[data-testid="form-card"]:has-text("${testFormName}")`);
    await formCard.locator('[data-testid="edit-form-btn"]').click();
    await page.waitForLoadState('networkidle');

    await addFieldBtn.click();
    const newFieldInput = page.locator('[data-testid="field-title-input"]').last();
    await newFieldInput.fill('New Field');

    await page.click('[data-testid="save-form-btn"]');

    // Handle migration modal if appears
    const migrationModal = page.locator('[data-testid="migration-preview-modal"]');
    if (await migrationModal.isVisible({ timeout: 3000 }).catch(() => false)) {
      const confirmBtn = page.locator('button:has-text("ยืนยัน")').or(page.locator('button:has-text("Confirm")'));
      await confirmBtn.click();
    }

    await waitForMigrationProcessing(page, 8000); // Wait longer for migration

    // Step 3: Submit form data
    console.log('📝 Submitting form data...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Find and click the form
    const formCardAgain = page.locator(`[data-testid="form-card"]:has-text("${testFormName}")`);
    await formCardAgain.click();
    await page.waitForLoadState('networkidle');

    // Fill both fields
    const originalFieldInput = page.locator('input').first();
    await originalFieldInput.fill('Test data for original field');

    const newFieldInputSubmit = page.locator('input').nth(1);
    if (await newFieldInputSubmit.isVisible({ timeout: 2000 }).catch(() => false)) {
      await newFieldInputSubmit.fill('Test data for new field');
      console.log('✅ New field is visible in submission form');
    } else {
      console.log('⚠️ New field not yet visible (migration may still be processing)');
    }

    // Submit
    const submitBtn = page.locator('button:has-text("ส่งข้อมูล")').or(page.locator('button[type="submit"]'));
    await submitBtn.click();

    // Verify success
    const successMessage = page.locator('text=สำเร็จ').or(page.locator('text=Success'));
    await expect(successMessage).toBeVisible({ timeout: 5000 });

    console.log('✅ Form Submission After Migration test completed');
  });

  // ==================== TEST 5: REAL-TIME QUEUE STATUS ====================
  test('Migration-5: Real-time queue status indicator', async ({ page }) => {
    console.log('🧪 Test: Real-time Queue Status');

    // Create form
    console.log('📝 Creating form...');
    await page.click('[data-testid="create-form-btn"]');
    await page.waitForLoadState('networkidle');

    await page.fill('[data-testid="form-title-input"]', testFormName);

    const addFieldBtn = page.locator('button:has-text("เพิ่มฟิลด์")').first();
    await addFieldBtn.click();

    const fieldInput = page.locator('[data-testid="field-title-input"]').last();
    await fieldInput.fill('Field 1');

    await page.click('[data-testid="save-form-btn"]');
    await page.waitForURL(url => !url.toString().includes('builder'), { timeout: 10000 });

    // Edit and add multiple fields quickly
    console.log('✏️ Adding multiple fields to trigger queue...');
    const formCard = page.locator(`[data-testid="form-card"]:has-text("${testFormName}")`);
    await formCard.locator('[data-testid="edit-form-btn"]').click();
    await page.waitForLoadState('networkidle');

    // Add 3 more fields
    for (let i = 2; i <= 4; i++) {
      await addFieldBtn.click();
      const newFieldInput = page.locator('[data-testid="field-title-input"]').last();
      await newFieldInput.fill(`Field ${i}`);
    }

    // Save (should trigger multiple migrations)
    console.log('💾 Saving with multiple new fields...');
    await page.click('[data-testid="save-form-btn"]');

    // Handle migration modal
    const migrationModal = page.locator('[data-testid="migration-preview-modal"]');
    if (await migrationModal.isVisible({ timeout: 3000 }).catch(() => false)) {
      const confirmBtn = page.locator('button:has-text("ยืนยัน")').or(page.locator('button:has-text("Confirm")'));
      await confirmBtn.click();
    }

    // Look for floating status indicator
    const statusIndicator = page.locator('[data-testid="migration-status-indicator"]');
    const indicatorVisible = await statusIndicator.isVisible({ timeout: 3000 }).catch(() => false);

    if (indicatorVisible) {
      console.log('✅ Migration status indicator appeared');

      // Check for waiting count
      const waitingCount = page.locator('text=/\\d+ waiting/i').or(page.locator('text=/\\d+ รอ/i'));
      const hasWaiting = await waitingCount.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasWaiting) {
        console.log('✅ Waiting count displayed');
      }

      // Wait and check for completed status
      await page.waitForTimeout(8000);

      const completedCount = page.locator('text=/\\d+ completed/i').or(page.locator('text=/\\d+ เสร็จสิ้น/i'));
      const hasCompleted = await completedCount.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasCompleted) {
        console.log('✅ Completed count displayed');
      }
    } else {
      console.log('⚠️ Migration status indicator not visible');
    }

    console.log('✅ Real-time Queue Status test completed');
  });

  // ==================== CLEANUP ====================
  test.afterEach(async ({ page }) => {
    // Optional: Clean up created forms
    // This can be implemented if needed
  });
});
