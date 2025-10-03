# Q-Collector E2E Test Results & Analysis

**Date:** 2025-10-03 (Updated 18:15)
**Test Framework:** Playwright
**Total Tests:** 7
**Passed:** 1 ✅
**Failed:** 6 ❌
**Status:** Login Issue Fixed, Form Builder Selector Issues Identified

---

## Test Results Summary

| # | Test Name | Status | Duration | Error |
|---|-----------|--------|----------|-------|
| 1 | Login & Authentication | ✅ **PASSED** | 6.9s | **Fixed: 2FA disabled properly** |
| 2 | Create New Form | ❌ FAILED | 15.1s | Cannot find create form button (looking for text, but it's "+" icon) |
| 3 | Add Fields to Form | ❌ FAILED | 14.7s | Selector issue (depends on Test 2 passing) |
| 4 | Submit Form Data | ❌ FAILED | 14.9s | Selector issue (depends on Test 2 passing) |
| 5 | View Submission List | ❌ FAILED | 14.5s | Selector issue (depends on Test 2 passing) |
| 6 | Edit Submission | ❌ FAILED | - | Selector issue (depends on Test 2 passing) |
| 7 | Sub-Form Creation & Submission | ❌ FAILED | - | Selector issue (depends on Test 2 passing) |

---

## Root Cause Analysis

### Primary Issue: Login Flow Stuck on 2FA Page

**Problem:**
After successful login API call (200 OK), frontend remains on "ยืนยันตัวตน 2FA" page instead of redirecting to home page.

**Evidence:**
1. ✅ Backend login API returns 200 OK
2. ✅ User exists in database (pongpanp)
3. ✅ 2FA disabled for user (`two_factor_enabled: false`, `two_factor_secret: null`)
4. ❌ Frontend still shows 2FA verification page
5. ❌ No URL redirect occurs after login

**Screenshot Analysis:**
- Shows "ยืนยันตัวตน 2FA" (2FA Verification) page
- Username displayed: "pongpanp"
- 24-hour trusted device checkbox visible
- Waiting for OTP input

---

## Technical Analysis

### Issue #1: Backend Still Sends `requires2FA: true`

**Hypothesis:**
Even though `two_factor_enabled: false` in database, backend login logic may still check for other conditions that trigger 2FA requirement.

**Backend Code to Check:**
- `backend/api/routes/auth.routes.js` - Login endpoint
- `backend/services/AuthService.js` - Login logic
- Condition that sets `requires2FA` in response

### Issue #2: Frontend Doesn't Handle Non-2FA Login Properly

**Code Analysis:**
```javascript
// AuthContext.jsx (line 96-97)
if (!response.requires2FA && response.user) {
  setUser(response.user);
}
```

**Problem:**
- If `requires2FA: true` is sent, `user` won't be set
- `isAuthenticated` depends on `!!user` (line 233)
- No redirect happens because `isAuthenticated` stays false

### Issue #3: LoginPage Navigation Logic

**Code Analysis:**
```javascript
// LoginPage.jsx (line 116-119)
if (loginResponse.requires2FA) {
  // Show 2FA form
} else if (loginResponse.user) {
  navigate('/', { replace: true });
}
```

**Problem:**
- If backend sends `requires2FA: true`, frontend shows 2FA form
- Even though user has 2FA disabled

---

## Identified Bugs

### Bug #1: Backend Login Response Structure
**Location:** `backend/services/AuthService.js` or `backend/api/routes/auth.routes.js`
**Issue:** Backend may not correctly check `two_factor_enabled` status before setting `requires2FA`
**Impact:** HIGH - Blocks all logins for users with 2FA disabled

### Bug #2: Frontend Cannot Skip 2FA Page
**Location:** `src/components/auth/LoginPage.jsx`
**Issue:** No fallback if `requires2FA` is incorrectly sent as true
**Impact:** HIGH - Users stuck on 2FA page even when 2FA is disabled

### Bug #3: Test Selector Mismatch
**Location:** `tests/e2e/form-system.spec.js`
**Issue:** Test uses generic selectors that may not match actual DOM structure
**Impact:** MEDIUM - Tests cannot verify UI elements correctly

---

## Fix Plan

### Priority 1: Backend Login Logic (CRITICAL)

**Task 1.1:** Investigate backend login response
```bash
# Check what backend actually returns
cd backend
node -e "const AuthService = require('./services/AuthService'); ..."
```

**Task 1.2:** Fix backend login logic
- Location: `backend/services/AuthService.js::login()`
- Ensure `requires2FA` is set based on `user.two_factor_enabled`
- Return `user` object when 2FA is disabled

**Expected Fix:**
```javascript
// AuthService.js
if (user.two_factor_enabled) {
  return { requires2FA: true, username: user.username };
} else {
  return {
    user: { id, username, email, role },
    token: jwtToken,
    requires2FA: false
  };
}
```

### Priority 2: Frontend Login Flow (HIGH)

**Task 2.1:** Add debug logging in LoginPage
- Log `loginResponse` to see exact structure
- Check `requires2FA` and `user` values

**Task 2.2:** Add fallback for incorrect 2FA flag
```javascript
// LoginPage.jsx
if (loginResponse.requires2FA && loginResponse.user?.two_factor_enabled === false) {
  // Backend error - 2FA disabled but requires2FA sent
  navigate('/', { replace: true });
}
```

### Priority 3: Test Suite Improvements (MEDIUM)

**Task 3.1:** Add data-testid attributes to LoginPage
- Add `data-testid="login-form"` to form
- Add `data-testid="2fa-form"` to 2FA section
- Add `data-testid="home-page"` to main app

**Task 3.2:** Update test selectors
- Use specific data-testid instead of generic selectors
- Add better error messages for debugging

**Task 3.3:** Add API response validation tests
- Test that login API returns correct structure
- Verify `requires2FA` matches `two_factor_enabled` status

### Priority 4: Database Schema Verification (LOW)

**Task 4.1:** Verify user 2FA status
```sql
SELECT username, two_factor_enabled, two_factor_secret
FROM users
WHERE username = 'pongpanp';
```

**Task 4.2:** Check for cached sessions
- Clear Redis cache for user sessions
- Restart backend to clear in-memory state

---

## Immediate Actions Required

1. **Investigate Backend Response:**
   - Add logging to `AuthService.login()` to see exact response
   - Verify `requires2FA` logic

2. **Quick Fix for Testing:**
   - Create test user with guaranteed no 2FA
   - Or modify backend to skip 2FA check in test environment

3. **Re-run Tests:**
   - After backend fix, re-run all 7 tests
   - Verify login works correctly

---

## Expected Outcomes After Fix

✅ Login redirects to home page (/)
✅ `isAuthenticated` becomes true
✅ User menu displays in navigation
✅ All 7 Playwright tests pass
✅ Form creation, submission, editing work correctly

---

## Next Steps

1. Fix backend login logic (1 hour)
2. Add frontend fallback (30 min)
3. Re-run E2E tests (10 min)
4. Document working test flow (15 min)
5. Create regression test for 2FA disabled users (30 min)

**Total Estimated Time:** 2.5 hours

---

## ✅ UPDATE (2025-10-03 18:15) - Login Issue FIXED!

### Issue #1: SOLVED ✅
**Problem:** Backend was returning `requires2FA: true` even though user had 2FA disabled

**Root Cause:** Backend server was caching user data with old 2FA status

**Solution Applied:**
1. ✅ Disabled 2FA properly in database (`twoFactorEnabled: false`)
2. ✅ Restarted backend server to reload user data
3. ✅ Verified login API now returns correct response:
   ```json
   {
     "success": true,
     "message": "Login successful",  // No requires2FA!
     "data": {
       "user": { "twoFactorEnabled": false },
       "tokens": { "accessToken": "...", "refreshToken": "..." }
     }
   }
   ```

**Test Results:**
- ✅ **Test 1 (Login) NOW PASSES!** - 6.9s (was 13.7s timeout)
- Login redirects to home page correctly
- No 2FA verification page shown
- User authenticated successfully

### Issue #2: NEW - Form Builder Selector Mismatch

**Problem:** Test 2-7 fail because test cannot find "Create Form" button

**Root Cause:** UI uses **"+" icon button** in navigation bar, but test looks for `button:has-text("สร้างฟอร์ม")`

**Evidence from Screenshot:**
- Form List page loads successfully
- Navigation bar shows: `+` | `👥` | `pongpanp` | `Q` logo
- The `+` button is the create form button
- No text button "สร้างฟอร์ม" exists on the page

**Fix Required:**
Update test selectors in `tests/e2e/form-system.spec.js`:
```javascript
// Current (WRONG):
await page.locator('button:has-text("สร้างฟอร์ม")').click();

// Should be (CORRECT):
await page.locator('button[aria-label*="สร้าง"], nav button').first().click();
// Or use the + icon specifically
await page.locator('nav img[alt*="+"]').click();
```

### Next Steps:

**Phase 1: Fix Test Selectors (30 min)**
- [ ] Update Test 2: Use correct create button selector (nav "+" button)
- [ ] Update Test 3-7: Verify selectors match actual UI elements
- [ ] Add data-testid attributes to key UI elements for reliable testing

**Phase 2: Re-run Tests (10 min)**
- [ ] Run all 7 tests again
- [ ] Verify all tests pass

**Phase 3: Document Working Flow (15 min)**
- [ ] Create test selector guide
- [ ] Document UI element locations
- [ ] Update test README

**Estimated Time Remaining:** 55 minutes

### Summary of Progress:

✅ **COMPLETED:**
- Login flow fixed (Test 1 passing)
- Backend 2FA issue resolved
- Root cause identified for remaining failures

🔄 **IN PROGRESS:**
- Test selector updates needed
- UI element mapping required

📋 **PENDING:**
- Test 2-7 selector fixes
- Full test suite validation
