# E2E Test Suite - Q-Collector

**Version:** 0.7.2
**Last Updated:** 2025-10-04

## Overview

Comprehensive E2E (End-to-End) test suite using Playwright to test complete user workflows in the Q-Collector application.

## Test Files

### 1. **form-crud.spec.js** - Form CRUD Operations
Complete Create, Read, Update, Delete workflow for forms.

**Tests:**
- ✅ `CRUD-1`: Create a new form
- ✅ `CRUD-2`: Read form details
- ✅ `CRUD-3`: Update form
- ✅ `CRUD-4`: Delete form
- ✅ `CRUD-5`: Complete CRUD sequence

**Coverage:** Form creation, editing, viewing, deletion

---

### 2. **submission-workflow.spec.js** - Submission Workflow
Complete workflow from form creation to submission management.

**Tests:**
- ✅ `SUBMIT-0`: Setup - Create test form
- ✅ `SUBMIT-1`: Create new submission
- ✅ `SUBMIT-2`: View submission details
- ✅ `SUBMIT-3`: Edit submission
- ✅ `SUBMIT-4`: Delete submission
- ✅ `SUBMIT-5`: Complete submission workflow
- ✅ `SUBMIT-6`: Validation - Required fields

**Coverage:** Submission CRUD, validation, workflow testing

---

### 3. **navigation.spec.js** - Navigation & Routing
Tests page navigation, breadcrumbs, deep linking, URL parameters.

**Tests:**
- ✅ `NAV-1`: Navigate between pages
- ✅ `NAV-2`: Breadcrumb navigation
- ✅ `NAV-3`: Deep linking to form
- ✅ `NAV-4`: URL parameters
- ✅ `NAV-5`: Previous/Next navigation
- ✅ `NAV-6`: User menu navigation
- ✅ `NAV-7`: Mobile navigation menu
- ✅ `NAV-8`: 404 page handling
- ✅ `NAV-9`: Navigation state persistence

**Coverage:** Routing, breadcrumbs, navigation arrows, mobile menu, error pages

---

### 4. **authentication.spec.js** - Authentication & Authorization
Tests login, logout, session management, permissions.

**Tests:**
- ✅ `AUTH-1`: Successful login
- ✅ `AUTH-2`: Failed login with invalid credentials
- ✅ `AUTH-3`: Logout
- ✅ `AUTH-4`: Session persistence
- ✅ `AUTH-5`: Protected routes redirect to login
- ✅ `AUTH-6`: Password field security
- ✅ `AUTH-7`: Remember me functionality
- ✅ `AUTH-8`: Role-based permissions
- ✅ `AUTH-9`: Session timeout handling

**Coverage:** Authentication, authorization, session management, security

---

### 5. **form-system.spec.js** - Form System Integration
Original comprehensive test file covering form builder, submissions, and sub-forms.

**Tests:**
- ✅ Test 1: Login & Authentication
- ✅ Test 2: Create New Form
- ✅ Test 3: Add Fields to Form
- ✅ Test 4: Submit Form Data
- ✅ Test 5: View Submission List
- ✅ Test 6: Edit Submission
- ✅ Test 7: Sub-Form Creation & Submission

**Coverage:** End-to-end form system features

---

## Quick Start

### Prerequisites

```bash
npm install @playwright/test
npx playwright install
```

### Run All Tests

```bash
npx playwright test
```

### Run Specific Test File

```bash
npx playwright test form-crud.spec.js
npx playwright test submission-workflow.spec.js
npx playwright test navigation.spec.js
npx playwright test authentication.spec.js
```

### Run in UI Mode (Recommended for Development)

```bash
npx playwright test --ui
```

### Run in Headed Mode (See Browser)

```bash
npx playwright test --headed
```

### Run Specific Test

```bash
npx playwright test -g "CRUD-1"
npx playwright test -g "Create new submission"
```

---

## Configuration

### Playwright Config (`playwright.config.js`)

```javascript
{
  testDir: './tests/e2e',
  timeout: 30000,
  baseURL: 'http://localhost:3000',

  webServer: [
    { command: 'npm run dev', port: 3000 },           // Frontend
    { command: 'cd backend && npm start', port: 5000 } // Backend
  ]
}
```

### Test User Credentials

All tests use the following test user:
```javascript
const TEST_USER = {
  identifier: 'pongpanp',
  password: 'Gfvtmiu613'
};
```

**⚠️ Important:** Ensure this user exists in your test database.

---

## Test Structure

### Standard Test Pattern

```javascript
test('TEST-ID: Description', async ({ page }) => {
  console.log('🧪 Test: Description');

  // Setup
  await loginIfNeeded(page);

  // Test actions
  await page.locator('[data-testid="..."]').click();

  // Assertions
  await expect(page.locator('...')).toBeVisible({ timeout: 5000 });

  console.log('✅ Test passed');
});
```

### Helper Functions

Each test file includes:
- `loginIfNeeded(page)` - Ensures user is logged in before test

---

## Test Data Attributes

For reliable test selectors, use `data-testid` attributes:

```jsx
// Good
<button data-testid="create-form-btn">Create</button>

// Avoid
<button className="btn-primary">Create</button>
```

**Key Test IDs:**
- `create-form-btn` - Create form button
- `save-form-btn` - Save form button
- `form-card` - Form card in list
- `form-title-input` - Form title input
- `add-submission-btn` - Add submission button
- `user-menu` - User menu dropdown
- `edit-btn`, `delete-btn` - Action buttons

---

## Reports

### HTML Report

```bash
npx playwright show-report
```

### JSON Report

Results saved to: `test-results/results.json`

### Screenshots & Videos

- Screenshots: On failure only
- Videos: On failure only
- Saved to: `test-results/`

---

## Debugging

### Debug Specific Test

```bash
npx playwright test form-crud.spec.js --debug
```

### Playwright Inspector

```bash
PWDEBUG=1 npx playwright test
```

### View Trace

```bash
npx playwright show-trace trace.zip
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npx playwright test

- name: Upload test results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

---

## Best Practices

### 1. **Use Test IDs**
```javascript
// ✅ Good
await page.locator('[data-testid="create-form-btn"]').click();

// ❌ Avoid
await page.locator('.btn.btn-primary.create-button').click();
```

### 2. **Wait for State**
```javascript
// ✅ Good
await page.waitForLoadState('networkidle');
await expect(element).toBeVisible({ timeout: 5000 });

// ❌ Avoid
await page.waitForTimeout(3000);
```

### 3. **Independent Tests**
Each test should be able to run independently without relying on other tests' state.

### 4. **Cleanup**
Create test data with unique identifiers (timestamps) to avoid conflicts.

### 5. **Error Handling**
```javascript
const visible = await element.isVisible({ timeout: 3000 }).catch(() => false);
if (visible) {
  // Proceed
} else {
  console.log('⚠️ Element not found');
  test.skip();
}
```

---

## Troubleshooting

### Test Fails: "Element not found"
1. Check if `data-testid` exists in component
2. Increase timeout: `{ timeout: 10000 }`
3. Check element is actually visible (not hidden by CSS)

### Test Fails: "Timeout waiting for network idle"
1. Check backend is running (port 5000)
2. Check frontend is running (port 3000)
3. Increase navigation timeout in config

### Test Fails: "Login failed"
1. Verify test user exists in database
2. Check credentials in test file
3. Check authentication flow in app

### Flaky Tests
1. Add explicit waits: `await page.waitForLoadState('networkidle')`
2. Use `await expect().toBeVisible()` instead of direct assertions
3. Avoid fixed timeouts, use conditional waits

---

## Future Enhancements

### Planned Test Additions

- [ ] **File Upload Tests** - Test file upload with MinIO
- [ ] **Permission Tests** - Test different user roles
- [ ] **Error Handling Tests** - Test API errors, validation
- [ ] **Performance Tests** - Measure page load times
- [ ] **Visual Regression Tests** - Screenshot comparison
- [ ] **API Integration Tests** - Direct API testing

### Tools to Consider

- **Percy/Chromatic** - Visual regression testing
- **Lighthouse CI** - Performance testing
- **Pa11y** - Accessibility testing

---

## Support

For issues or questions:
1. Check Playwright docs: https://playwright.dev
2. Review test logs and screenshots in `test-results/`
3. Run tests in UI mode for debugging: `npx playwright test --ui`

---

**Last Updated:** 2025-10-04
**Maintained by:** Q-Collector Development Team
