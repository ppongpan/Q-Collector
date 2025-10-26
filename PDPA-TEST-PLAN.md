# PDPA System Test Plan v0.8.3-dev
**Date**: 2025-10-24
**Sprint**: Sprint 5 - Testing & QA Phase
**Status**: Ready for Execution

---

## Test Summary

This document outlines the comprehensive testing plan for the PDPA system fixes implemented in v0.8.3-dev. All fixes were completed in PHASE 1 and PHASE 2 as documented in PDPA-FIX-PLAN.md.

---

## Fixes Implemented

### ✅ PHASE 1: Critical Database Fix
- **Migration**: `20251024120000-add-profile-id-to-dsr-requests.js`
- **Model Update**: DSRRequest.js - Added profile_id field and association
- **API Update**: personalData.routes.js - Save profile_id when creating DSR requests

### ✅ PHASE 2: Frontend Display Fixes
1. **Form List Display** - ProfileDetailModal.jsx (lines 426-443)
   - Fixed form name: `submission.form?.title` with optional chaining
   - Fixed date display: Handle both camelCase and snake_case with Thai formatting

2. **Submission Detail Navigation** - ProfileDetailModal.jsx (lines 148-156, 520-527)
   - Added navigation handler with sessionStorage context
   - Added "ดูรายละเอียดการส่งฟอร์ม" button

3. **Back Button** - SubmissionDetail.jsx (lines 442-462, 2041-2058)
   - Added useNavigate hook
   - Added handleBackToProfile() with sessionStorage check
   - Added conditional back button in header

4. **Consent Form Names** - Multiple files:
   - Backend: UserConsent.js toJSON (lines 381-384) - Extract formTitle from form.title
   - Frontend: ProfileDetailModal.jsx (lines 554-562) - Display form name with orange styling

---

## Test Cases

### TEST 1: Database Migration - DSR Profile ID

**Objective**: Verify that DSR requests can be created and linked to profiles

**Prerequisites**:
- Migration `20251024120000-add-profile-id-to-dsr-requests.js` has been run
- Backend server is running with updated DSRRequest model

**Test Steps**:
1. Open PDPA dashboard at `/pdpa`
2. Select any user profile
3. Navigate to "DSR Requests" tab
4. Click "สร้างคำขอใหม่" button
5. Fill in DSR request form:
   - Request Type: Select "access" (สิทธิขอเข้าถึงข้อมูล)
   - Email/Phone: Enter test identifier
   - Details: Enter test description
6. Submit the form

**Expected Results**:
- ✅ DSR request is created successfully
- ✅ Request appears in the DSR Requests list
- ✅ No HTTP 500 errors in browser console
- ✅ Backend logs show profile_id is saved correctly
- ✅ Database `dsr_requests` table contains new record with valid `profile_id`

**SQL Verification**:
```sql
SELECT id, profile_id, user_identifier, request_type, status
FROM dsr_requests
ORDER BY created_at DESC
LIMIT 5;
```

**Pass Criteria**:
- profile_id column exists and is populated (not NULL)
- Request is linked to correct UnifiedUserProfile
- No errors in console or logs

---

### TEST 2: Form List Display

**Objective**: Verify that form names and submission dates display correctly

**Prerequisites**:
- User profile with at least 3 submitted forms
- Backend server running with ProfileDetailModal updates

**Test Steps**:
1. Open PDPA dashboard at `/pdpa`
2. Select a profile with multiple submissions
3. Click "Forms & Data" tab
4. Observe the form list

**Expected Results**:
- ✅ Each form card shows correct form name (not "ไม่ระบุชื่อฟอร์ม")
- ✅ Each form card shows valid Thai date format (not "Invalid Date")
- ✅ Date format: "25 ตุลาคม 2568 14:30" (Thai Buddhist year)
- ✅ If form name is missing, shows "ไม่ระบุชื่อฟอร์ม" as fallback
- ✅ If date is missing, shows "ไม่ทราบวันที่" as fallback

**Test Data**:
- Profile with forms that have titles
- Profile with submissions from different dates
- Edge case: Profile with form that has no title

**Pass Criteria**:
- All form names display correctly
- All dates are formatted properly in Thai
- No "undefined" or "null" text visible
- Fallback messages work when data is missing

---

### TEST 3: Submission Detail Navigation

**Objective**: Verify that users can navigate from profile to submission detail and back

**Prerequisites**:
- User profile with submitted forms
- SubmissionDetail.jsx and ProfileDetailModal.jsx updates deployed

**Test Steps**:
1. Open PDPA dashboard at `/pdpa`
2. Select any user profile
3. Go to "Forms & Data" tab
4. Locate a form submission card
5. Click "ดูรายละเอียดการส่งฟอร์ม" button
6. Verify submission detail page loads
7. Verify "กลับไปโปรไฟล์" button appears in header
8. Click the back button

**Expected Results**:
- ✅ Blue button is visible on each form card
- ✅ Button has ExternalLink icon
- ✅ Button text: "ดูรายละเอียดการส่งฟอร์ม"
- ✅ Clicking button navigates to `/submissions/{id}`
- ✅ Submission detail page loads with correct data
- ✅ Orange "กลับไปโปรไฟล์" button appears in header
- ✅ Button has left arrow icon
- ✅ Clicking back button returns to profile modal
- ✅ Profile modal opens to correct tab ("Forms & Data")
- ✅ Modal shows correct profile

**sessionStorage Verification**:
1. Before clicking navigation button, open DevTools Console
2. After clicking, check: `sessionStorage.getItem('returnToProfile')`
3. Should return the profile UUID
4. Check: `sessionStorage.getItem('returnTab')`
5. Should return `'forms'`
6. After clicking back button, both values should be cleared

**Pass Criteria**:
- Navigation works smoothly without page reload
- Context is preserved (returns to correct profile and tab)
- sessionStorage is properly managed (set and cleared)
- No console errors

---

### TEST 4: Back Button - Profile Context

**Objective**: Verify back button only shows when navigating from profile

**Prerequisites**:
- SubmissionDetail.jsx back button implementation

**Test Steps**:

**Scenario A: Navigation FROM Profile**
1. Open `/pdpa`
2. Select profile → Forms & Data tab
3. Click "ดูรายละเอียดการส่งฟอร์ม"
4. Check if back button appears

**Expected**: ✅ "กลับไปโปรไฟล์" button IS visible

**Scenario B: Direct Navigation**
1. Clear sessionStorage: `sessionStorage.clear()`
2. Navigate directly to `/submissions/{id}` via URL
3. Check if back button appears

**Expected**: ✅ "กลับไปโปรไฟล์" button is NOT visible

**Scenario C: Navigation from Form List**
1. Navigate to `/forms` (main form list page)
2. Click on any submission
3. Check if back button appears

**Expected**: ✅ "กลับไปโปรไฟล์" button is NOT visible (no profile context)

**Pass Criteria**:
- Back button only appears when `hasProfileReturnContext` is true
- Button behavior is context-aware
- No unnecessary buttons cluttering the interface

---

### TEST 5: Consent Form Names Display

**Objective**: Verify that each consent shows which form it belongs to

**Prerequisites**:
- User profile with consent records from multiple forms
- Backend: UserConsent.js toJSON update deployed
- Frontend: ProfileDetailModal.jsx consent display update deployed

**Test Steps**:
1. Open PDPA dashboard at `/pdpa`
2. Select a profile with multiple consents
3. Navigate to "Consents" tab (ความยินยอม)
4. Observe each consent card

**Expected Results**:
- ✅ Each consent card shows form name at the top
- ✅ Form name format: "📋 ฟอร์ม: {form_title}"
- ✅ Form name color: Orange (`text-orange-600 dark:text-orange-400`)
- ✅ Form name has bottom border separator
- ✅ If form name is missing, section is hidden (not showing "undefined")
- ✅ Consent item title appears below form name
- ✅ Visual hierarchy is clear (form name → consent title → description)

**Test Data**:
```
Example consent card structure:
┌─────────────────────────────────────┐
│ 📋 ฟอร์ม: แบบสอบถามความพึงพอใจ      │ ← Orange, small font
│─────────────────────────────────────│
│ การใช้ข้อมูลเพื่อการวิจัย            │ ← White/Dark, medium font
│ เราจะใช้ข้อมูลของคุณเพื่อ...        │ ← Gray, small font
│                                     │
│ วัตถุประสงค์: วิจัย                 │
│ ระยะเวลาเก็บ: 2 ปี                  │
└─────────────────────────────────────┘
```

**Backend Verification**:
1. Open DevTools Network tab
2. Find request to `/api/v1/personal-data/profiles/{id}`
3. Check response JSON
4. Verify each consent has `formTitle` field:
```json
{
  "consents": [
    {
      "id": "...",
      "formTitle": "แบบสอบถามความพึงพอใจ",
      "consentItemTitle": "การใช้ข้อมูลเพื่อการวิจัย",
      ...
    }
  ]
}
```

**Pass Criteria**:
- All consents display form names correctly
- Orange styling is applied
- Visual separation is clear
- No undefined/null values visible
- Backend toJSON properly extracts formTitle from form.title

---

## Integration Tests

### INT-1: End-to-End Profile Navigation Flow

**Objective**: Test complete user journey through profile system

**Flow**:
1. Open `/pdpa` → Select profile
2. View "Forms & Data" tab → Click "ดูรายละเอียดการส่งฟอร์ม"
3. View submission detail → Click "กลับไปโปรไฟล์"
4. Back at profile → Switch to "Consents" tab
5. Verify form names display → Click "Edit" on a consent
6. Edit consent → Save → Verify updated
7. Switch to "DSR Requests" tab
8. Create new DSR request → Verify created with profile_id

**Pass Criteria**:
- Entire flow completes without errors
- All data displays correctly at each step
- Navigation works smoothly
- sessionStorage is managed correctly
- Database updates persist

---

### INT-2: Multi-Form Profile Testing

**Objective**: Test profile with many submissions from different forms

**Test Profile Requirements**:
- 5+ submitted forms
- 10+ consent records from different forms
- 3+ DSR requests

**Verification Points**:
1. **Forms & Data Tab**:
   - All form names load correctly
   - All dates format correctly
   - Navigation buttons work for all forms

2. **Consents Tab**:
   - All form names appear
   - Grouped visually by form (optional future enhancement)
   - Edit/History works for all consents

3. **DSR Tab**:
   - All requests display
   - Status badges correct
   - Can create new request with profile link

**Pass Criteria**:
- System handles large datasets smoothly
- No performance degradation
- UI remains responsive
- All data accurate

---

## Regression Tests

### REG-1: Existing PDPA Features Still Work

**Features to Verify**:
- ✅ User consent management (create, edit, delete)
- ✅ Consent history tracking
- ✅ Privacy notice acceptance
- ✅ Data masking (phone/email reveal)
- ✅ DSR request processing workflow
- ✅ Profile search and filtering
- ✅ Dashboard statistics
- ✅ Personal data field detection

**Pass Criteria**: No existing features are broken by new changes

---

### REG-2: Navigation Flow Unchanged for Non-Profile Routes

**Scenarios**:
1. Navigate from `/forms` to submission detail
2. Navigate from `/submissions` list to detail
3. Use browser back button
4. Direct URL access to submission detail

**Pass Criteria**:
- Existing navigation still works
- No unwanted back buttons appear
- onBack prop still works where used

---

## Browser Compatibility Testing

### Browsers to Test:
- ✅ Chrome/Edge (Chromium) - Latest version
- ✅ Firefox - Latest version
- ✅ Safari - Latest version (Mac/iOS)

### Features to Verify per Browser:
1. sessionStorage API works correctly
2. Optional chaining (`?.`) syntax supported
3. Date formatting with `toLocaleDateString('th-TH')` works
4. CSS styling (orange colors, borders, spacing)
5. Responsive layout on mobile

**Pass Criteria**: All features work consistently across browsers

---

## Mobile Testing

### Devices to Test:
- iOS Safari (iPhone)
- Android Chrome
- Responsive mode in DevTools (375px, 768px, 1024px)

### Mobile-Specific Checks:
1. Form list cards are readable on small screens
2. "ดูรายละเอียดการส่งฟอร์ม" button is tappable (44px+ touch target)
3. Back button appears and works on mobile
4. Consent form names don't overflow
5. Date format readable on narrow screens

**Pass Criteria**: All features fully functional on mobile devices

---

## Performance Testing

### Metrics to Monitor:
1. **Page Load Time**: Profile modal should open < 500ms
2. **Navigation Speed**: Click to submission detail < 300ms
3. **Back Button**: Return to profile < 200ms
4. **Consent List Rendering**: 50+ consents should render < 1s
5. **Memory Usage**: No memory leaks when navigating back and forth

**Tools**:
- Chrome DevTools Performance tab
- React DevTools Profiler
- Network tab for API response times

**Pass Criteria**:
- No noticeable lag or delay
- Smooth animations
- No console warnings about performance

---

## Security Testing

### Security Checks:

#### SEC-1: sessionStorage Security
- ✅ No sensitive data stored in sessionStorage (only profile ID and tab name)
- ✅ sessionStorage cleared after use
- ✅ No XSS vulnerability through profile ID

#### SEC-2: Profile ID Validation
- ✅ Backend validates UUID format for profile_id
- ✅ Cannot inject malicious SQL through profile_id
- ✅ Authorization check: User can only access own profiles (or admin)

#### SEC-3: DSR Request Authorization
- ✅ Profile_id FK constraint enforced in database
- ✅ Cannot create DSR for another user's profile
- ✅ Cannot modify profile_id after DSR creation

**Pass Criteria**: No security vulnerabilities found

---

## Database Testing

### DB-1: Migration Rollback Test

**Steps**:
1. Note current database state
2. Run migration down: `npm run migrate:down`
3. Verify `profile_id` column is removed
4. Verify index is removed
5. Run migration up: `npm run migrate:up`
6. Verify column and index are restored

**SQL Checks**:
```sql
-- Check column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'dsr_requests'
AND column_name = 'profile_id';

-- Check index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'dsr_requests'
AND indexname = 'dsr_requests_profile_id_idx';

-- Check foreign key constraint
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'dsr_requests'
AND constraint_name LIKE '%profile_id%';
```

**Pass Criteria**:
- Migration up/down both succeed
- Database structure is correct after each operation
- No orphaned data

---

### DB-2: Data Integrity Test

**Scenarios**:

1. **Orphaned Records**: Delete UnifiedUserProfile → DSR profile_id should become NULL
2. **Cascading Updates**: Update profile ID → DSR records update (if ON UPDATE CASCADE)
3. **Constraint Violation**: Try to create DSR with invalid profile_id → Should fail

**SQL Tests**:
```sql
-- Test SET NULL on delete
BEGIN;
DELETE FROM unified_user_profiles WHERE id = '{test_profile_id}';
SELECT profile_id FROM dsr_requests WHERE id = '{test_dsr_id}';
-- Should be NULL
ROLLBACK;

-- Test invalid profile_id
INSERT INTO dsr_requests (profile_id, request_type, user_identifier, status)
VALUES ('00000000-0000-0000-0000-000000000000', 'access', 'test@test.com', 'pending');
-- Should fail with FK constraint error
```

**Pass Criteria**:
- FK constraints enforced correctly
- No data corruption
- Referential integrity maintained

---

## Error Handling Testing

### ERR-1: API Errors

**Test Scenarios**:
1. Backend server down → Show error message
2. 404 Not Found → Show "profile not found"
3. 500 Internal Server Error → Show "server error"
4. Network timeout → Show retry option

**Expected**:
- Graceful error messages displayed
- No white screens or crashes
- User can recover without page refresh

---

### ERR-2: Missing Data

**Test Scenarios**:
1. Profile with no submissions → Show "ไม่พบข้อมูล"
2. Profile with no consents → Show "ไม่พบข้อมูล Consent"
3. Form with no title → Show "ไม่ระบุชื่อฟอร์ม"
4. Submission with no date → Show "ไม่ทราบวันที่"
5. Consent with no form → Hide form name section

**Pass Criteria**:
- Fallback messages display correctly
- No undefined/null/NaN visible
- Layout remains intact

---

## Test Execution Checklist

### Pre-Testing Setup
- [ ] Backend server running on port 5000
- [ ] Frontend server running on port 3000
- [ ] PostgreSQL database accessible
- [ ] Migration `20251024120000-add-profile-id-to-dsr-requests.js` executed
- [ ] Test data seeded (profiles, forms, submissions, consents, DSR requests)
- [ ] DevTools open in browser
- [ ] Console cleared before each test

### Test Execution Order
1. [ ] TEST 1: Database Migration - DSR Profile ID
2. [ ] TEST 2: Form List Display
3. [ ] TEST 3: Submission Detail Navigation
4. [ ] TEST 4: Back Button - Profile Context
5. [ ] TEST 5: Consent Form Names Display
6. [ ] INT-1: End-to-End Profile Navigation Flow
7. [ ] INT-2: Multi-Form Profile Testing
8. [ ] REG-1: Existing PDPA Features Still Work
9. [ ] REG-2: Navigation Flow Unchanged
10. [ ] Browser Compatibility (Chrome, Firefox, Safari)
11. [ ] Mobile Testing (iOS, Android, Responsive)
12. [ ] Performance Testing
13. [ ] Security Testing (SEC-1, SEC-2, SEC-3)
14. [ ] Database Testing (DB-1, DB-2)
15. [ ] Error Handling Testing (ERR-1, ERR-2)

### Post-Testing
- [ ] Document all bugs found
- [ ] Prioritize bug fixes
- [ ] Re-test failed cases after fixes
- [ ] Update CLAUDE.md with test results
- [ ] Mark Sprint 5 as complete

---

## Bug Reporting Template

When bugs are found, use this template:

```markdown
### BUG-{NUMBER}: {Short Description}

**Severity**: Critical / High / Medium / Low
**Test Case**: {Test case ID}
**Environment**: {Browser/OS/Device}

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected Result**:
{What should happen}

**Actual Result**:
{What actually happened}

**Screenshots/Logs**:
{Attach screenshots or error logs}

**Workaround** (if any):
{Temporary solution}

**Fix Required**:
{Suggested fix or affected files}
```

---

## Success Criteria

All fixes are considered successfully implemented when:

✅ **All 5 main test cases pass** (TEST 1-5)
✅ **Both integration tests pass** (INT-1, INT-2)
✅ **No regressions found** (REG-1, REG-2)
✅ **Cross-browser compatibility confirmed**
✅ **Mobile functionality verified**
✅ **Performance metrics met**
✅ **No security vulnerabilities found**
✅ **Database integrity maintained**
✅ **Error handling graceful**
✅ **No console errors during normal operation**
✅ **User experience is smooth and intuitive**

---

## Notes for Testers

1. **Test Data**: Use existing test profiles or create new ones with seed scripts
2. **Console Monitoring**: Keep DevTools console open to catch JavaScript errors
3. **Network Tab**: Monitor API requests to verify data structures
4. **Database Access**: Use pgAdmin or psql to verify database changes
5. **Documentation**: Take screenshots of bugs for easier reproduction
6. **Edge Cases**: Always test with missing data, special characters, and large datasets

---

## Test Results Summary

_To be filled in after test execution_

| Test Case | Status | Date Tested | Tester | Notes |
|-----------|--------|-------------|--------|-------|
| TEST 1    | ⏳     |             |        |       |
| TEST 2    | ⏳     |             |        |       |
| TEST 3    | ⏳     |             |        |       |
| TEST 4    | ⏳     |             |        |       |
| TEST 5    | ⏳     |             |        |       |
| INT-1     | ⏳     |             |        |       |
| INT-2     | ⏳     |             |        |       |
| REG-1     | ⏳     |             |        |       |
| REG-2     | ⏳     |             |        |       |

**Legend**: ⏳ Pending | ✅ Pass | ❌ Fail | ⚠️ Pass with Issues

---

**Document Version**: 1.0
**Last Updated**: 2025-10-24
**Status**: Ready for Execution ✅
