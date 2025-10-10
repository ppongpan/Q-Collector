# LocalStorage to API Migration Priority Matrix

**Generated:** 2025-10-03
**Total Files:** 21 files with localStorage/dataService usage
**Total Matches:** 122 occurrences

---

## 🔴 CRITICAL Priority - Form CRUD Operations (Must Fix First)

These files handle form creation, editing, and deletion. LocalStorage usage here causes data loss and inconsistency.

### 1. FormSubmissionList.jsx (4 matches) 🔴 HIGH PRIORITY
**Current State:** Uses dataService for form/submission retrieval
**Issues:**
- Line 46: `dataService.getForm(formId)` - Should use API
- Line 69: `dataService.getSubmissionsByFormId(formId)` - Should use API
- Line 166: `dataService.deleteSubmission(submissionId)` - Should use API

**Migration Plan:**
- Replace `dataService.getForm()` with `apiClient.getForm()`
- Replace `dataService.getSubmissionsByFormId()` with `apiClient.listSubmissions()`
- Replace `dataService.deleteSubmission()` with `apiClient.deleteSubmission()`

**API Endpoints:**
- GET `/api/v1/forms/:id`
- GET `/api/v1/forms/:formId/submissions`
- DELETE `/api/v1/submissions/:id`

---

### 2. FormView.jsx (2 matches) 🔴 CRITICAL
**Current State:** Uses dataService for form loading and submission creation
**Issues:**
- Imports dataService
- Likely uses it for form submission

**Migration Plan:**
- Check if using `dataService.createSubmission()`
- Replace with `submissionService.createSubmission()`
- Verify file upload handling

**API Endpoints:**
- GET `/api/v1/forms/:id`
- POST `/api/v1/forms/:formId/submissions`

---

### 3. SubmissionDetail.jsx (4 matches) 🔴 HIGH PRIORITY
**Current State:** Uses dataService for submission data
**Issues:**
- Imports dataService
- Loads submission data from localStorage
- Edit/delete operations may use localStorage

**Migration Plan:**
- Replace `dataService.getSubmission()` with `apiClient.getSubmission()`
- Verify edit navigation uses API
- Verify delete uses API

**API Endpoints:**
- GET `/api/v1/submissions/:id`
- PUT `/api/v1/forms/:formId/submissions/:id`
- DELETE `/api/v1/submissions/:id`

---

### 4. SubFormDetail.jsx (3 matches) 🟠 HIGH PRIORITY
**Current State:** Uses dataService for sub-form data
**Issues:**
- Imports dataService
- Sub-form data loading from localStorage

**Migration Plan:**
- Replace with API calls for sub-form data
- Check sub-form edit/delete operations

**API Endpoints:**
- GET `/api/v1/subforms/:id`
- GET `/api/v1/forms/:formId/subforms`

---

### 5. SubFormView.jsx (5 matches) 🟠 HIGH PRIORITY
**Current State:** Uses dataService
**Issues:**
- Sub-form rendering may use localStorage

**Migration Plan:**
- Verify sub-form data source
- Replace with API if needed

---

### 6. SubFormEditPage.jsx (5 matches) ⚠️ NEEDS REVIEW
**Current State:** Unknown if using API or localStorage
**Issues:**
- 5 dataService calls detected
- Need verification

**Migration Plan:**
- Audit file thoroughly
- Check if already using API
- Replace any localStorage calls

---

### 7. MainFormApp.jsx (5 matches) 🟡 MEDIUM PRIORITY
**Current State:** May use dataService for navigation state
**Issues:**
- 5 occurrences detected
- Need to check if form CRUD or just UI state

**Migration Plan:**
- Audit each usage
- Keep UI state in localStorage (acceptable)
- Move data operations to API

---

## 🟡 MEDIUM Priority - Settings & User Components

These files handle user preferences and settings. Some localStorage usage is acceptable (theme, UI state).

### 8. ThemeService.js (6 matches) ✅ ACCEPTABLE
**Current State:** Uses localStorage for theme preference
**Decision:** Keep as-is (UI preference, not critical data)
**Usage:**
- Theme selection (glass/minimal/liquid)
- Per-user theme preferences

**No Migration Needed** - This is appropriate use of localStorage

---

### 9. FontContext.jsx (4 matches) ✅ ACCEPTABLE
**Current State:** Uses localStorage for font preferences
**Decision:** Keep as-is (UI preference)

**No Migration Needed** - This is appropriate use of localStorage

---

### 10. StorageContext.jsx (2 matches) ✅ ACCEPTABLE
**Current State:** Generic storage wrapper
**Decision:** Review usage, may be acceptable for UI state

---

## 🟢 LOW Priority - Infrastructure Files

These are backend services or test files. Some need updates, others are deprecated.

### 11. DataService.js (20 matches) 🔴 DEPRECATE
**Current State:** Core localStorage service
**Decision:** Gradually deprecate, add warnings

**Migration Plan:**
- Add deprecation warnings to all methods
- Log usage for tracking
- Point developers to API alternatives
- Eventually delete file

**Timeline:**
- Phase 1: Add warnings (immediate)
- Phase 2: Remove from all components (2-3 weeks)
- Phase 3: Delete file (after all migrations)

---

### 12. FormService.js (11 matches) 🔴 DEPRECATE
**Current State:** Uses localStorage for form operations
**Decision:** Already have API version, deprecate localStorage version

---

### 13. SubmissionService.js (9 matches) 🔴 DEPRECATE
**Current State:** Old localStorage-based service
**Decision:** Already migrated to API in SubmissionService.js

---

### 14. SubmissionService.new.js (11 matches) 🔴 DEPRECATE
**Current State:** Transition file
**Decision:** Merge with SubmissionService.js, remove localStorage

---

### 15. FileService.js (6 matches) ⚠️ REVIEW NEEDED
**Current State:** Uses localStorage
**Decision:** Should use API for file uploads

**Migration Plan:**
- Check if uses localStorage for file metadata
- Migrate to API-based file handling
- Use MinIO/S3 for storage

---

### 16. FileService.new.js (4 matches) ⚠️ REVIEW NEEDED
**Current State:** Transition file
**Decision:** Review and merge

---

## 🟣 SPECIAL Cases - Authentication & Tokens

### 17. ApiClient.js (6 matches) ✅ ACCEPTABLE (with conditions)
**Current State:** Uses localStorage for tokens
**Decision:** Acceptable for now, consider httpOnly cookies later

**Current Implementation:**
- Stores access tokens
- Stores refresh tokens
- Auto-refresh mechanism

**Future Enhancement:**
- Migrate to httpOnly cookies for security
- Keep token in memory only
- Use secure backend session

**Priority:** Low (current implementation is standard practice)

---

### 18. tokenManager.js (12 matches) ✅ ACCEPTABLE
**Current State:** Manages authentication tokens
**Decision:** Keep as-is (standard practice)

**Usage:**
- Token storage
- Token refresh
- Session management

**No Immediate Migration Needed**

---

## 📊 Migration Statistics

**Total Files Requiring Migration:** 21 files
**Critical Priority:** 7 files (Form CRUD operations)
**Medium Priority:** 3 files (Settings, partial UI state)
**Low Priority (Deprecation):** 6 files (Old services)
**Acceptable (No Change):** 5 files (Theme, Font, Tokens)

**Estimated Effort:**
- Critical Priority: 2-3 days
- Medium Priority: 1 day
- Low Priority (Deprecation): 1 day
- **Total:** 4-5 days of work

---

## 🎯 Recommended Migration Order

### Week 1: Critical Components (Form CRUD)
1. ✅ MainFormEditPage.jsx (Already fixed 2025-10-03)
2. ⏳ FormSubmissionList.jsx (Next)
3. ⏳ FormView.jsx
4. ⏳ SubmissionDetail.jsx
5. ⏳ SubFormDetail.jsx
6. ⏳ SubFormView.jsx
7. ⏳ SubFormEditPage.jsx

### Week 2: Medium Priority & Service Deprecation
1. MainFormApp.jsx (audit and selective migration)
2. Add deprecation warnings to DataService.js
3. Add deprecation warnings to FormService.js
4. Add deprecation warnings to SubmissionService.js
5. FileService.js migration

### Week 3: Cleanup & Testing
1. Remove DataService.js completely
2. Remove old FormService.js
3. Merge SubmissionService.new.js
4. Run full E2E tests
5. Production deployment

---

## 🚨 Breaking Changes Checklist

**Before Each Migration:**
- [ ] Read current implementation
- [ ] Identify data format differences
- [ ] Create data transformation layer if needed
- [ ] Add comprehensive error handling
- [ ] Add loading states
- [ ] Test with real data
- [ ] Check for regressions

**After Each Migration:**
- [ ] Remove old imports
- [ ] Update tests
- [ ] Document changes
- [ ] Update qtodo.md

---

## 📝 API Endpoint Reference

### Forms
- `GET /api/v1/forms` - List all forms
- `GET /api/v1/forms/:id` - Get form by ID
- `POST /api/v1/forms` - Create form
- `PUT /api/v1/forms/:id` - Update form
- `DELETE /api/v1/forms/:id` - Delete form

### Submissions
- `GET /api/v1/forms/:formId/submissions` - List submissions
- `GET /api/v1/submissions/:id` - Get submission
- `POST /api/v1/forms/:formId/submissions` - Create submission
- `PUT /api/v1/forms/:formId/submissions/:id` - Update submission
- `DELETE /api/v1/submissions/:id` - Delete submission

### Sub-Forms
- `GET /api/v1/forms/:formId/subforms` - List sub-forms
- `GET /api/v1/subforms/:id` - Get sub-form
- `POST /api/v1/forms/:formId/subforms` - Create sub-form
- `PUT /api/v1/subforms/:id` - Update sub-form
- `DELETE /api/v1/subforms/:id` - Delete sub-form

---

## ✅ Success Criteria

**Migration Complete When:**
1. Zero dataService calls in components
2. All form/submission CRUD uses API
3. All tests passing
4. No console errors
5. User flows unbroken
6. DataService.js deleted
7. Documentation updated

**Performance Metrics:**
- API response time < 500ms (95th percentile)
- No UI lag on data operations
- Loading states visible for operations > 300ms
- Error recovery without data loss
