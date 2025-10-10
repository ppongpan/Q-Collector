# งานที่ต้องทำต่อ - Q-Collector v0.7.2

**Last Updated:** 2025-10-04
**Current Phase:** Phase 8.12 - Complete LocalStorage Elimination

---

## 🎯 **สถานะปัจจุบัน**

**Phase ที่เสร็จแล้ว:**
- ✅ Phase 1: Service Layer Cleanup
- ✅ Phase 2: FileService Migration Infrastructure
- ✅ Phase 3: E2E Test Suite

**Phase ที่กำลังทำ:**
- 📋 **Phase 4: Component Migration** (พร้อมเริ่มต่อ)

---

## 📋 **งานที่ต้องทำ (Priority Order)**

### 1. 🔴 **CRITICAL - File Upload Component Migration**

**Objective:** Migrate 6 components จาก FileService.js (localStorage) → FileService.api.js (MinIO)

**Components ที่ต้อง migrate:**

#### 1.1 FormView.jsx
- **ปัญหา:** ใช้ FileService.saveFile() (localStorage)
- **แก้ไข:** ใช้ fileServiceAPI.uploadFile() (MinIO)
- **Impact:** High - Form submission with file upload
- **Estimated Time:** 1-2 hours

#### 1.2 SubmissionDetail.jsx
- **ปัญหา:** ใช้ FileService.getFile() (localStorage)
- **แก้ไข:** ใช้ fileServiceAPI.getFileWithUrl() (MinIO)
- **Impact:** High - View uploaded files
- **Estimated Time:** 1 hour

#### 1.3 SubFormEditPage.jsx
- **ปัญหา:** ใช้ FileService for sub-form files
- **แก้ไข:** ใช้ fileServiceAPI methods
- **Impact:** Medium - Sub-form file handling
- **Estimated Time:** 1-2 hours

#### 1.4 SubFormDetail.jsx
- **ปัญหา:** ใช้ FileService.getFile()
- **แก้ไข:** ใช้ fileServiceAPI.getFileWithUrl()
- **Impact:** Medium - View sub-form files
- **Estimated Time:** 1 hour

#### 1.5 image-thumbnail.jsx
- **ปัญหา:** Display images from localStorage (base64)
- **แก้ไข:** Display from presigned URLs
- **Impact:** Medium - Image display
- **Estimated Time:** 30 min

#### 1.6 file-display.jsx
- **ปัญหา:** Display file info from localStorage
- **แก้ไข:** Display from API metadata
- **Impact:** Medium - File metadata display
- **Estimated Time:** 30 min

**Total Estimated Time:** 6-8 hours

**Resources Available:**
- ✅ FileService.api.js (ready to use)
- ✅ Migration guide: `docs/FileService-Migration-Guide.md`
- ✅ Backend MinIO endpoints (tested)
- ✅ E2E tests (safety net)

---

### 2. 🟠 **HIGH - Run E2E Tests**

**Objective:** Verify app functionality after Phase 3 completion

**Tasks:**

#### 2.1 Run Full Test Suite
```bash
npx playwright test
```
- [ ] Form CRUD tests (5 tests)
- [ ] Submission workflow tests (7 tests)
- [ ] Navigation tests (9 tests)
- [ ] Authentication tests (9 tests)

#### 2.2 Fix Any Failing Tests
- [ ] Identify failures
- [ ] Debug issues
- [ ] Fix components
- [ ] Re-run tests

#### 2.3 Generate Test Report
```bash
npx playwright show-report
```
- [ ] Review HTML report
- [ ] Document results
- [ ] Update TESTING-SUMMARY.md

**Estimated Time:** 2-3 hours

---

### 3. 🟡 **MEDIUM - DataService Final Cleanup**

**Objective:** Complete removal of dataService usage

**Current Status:**
- 10 dataService calls remaining (down from 39)
- All in already-migrated components (likely console.warn only)

**Tasks:**

#### 3.1 Re-run Scanner
```bash
node backend/scripts/scan-localstorage-usage.js
```

#### 3.2 Verify Remaining Calls
- [ ] Check if deprecation warnings only
- [ ] Identify actual usage vs warnings
- [ ] Remove any remaining usage

#### 3.3 Remove DataService Import
- [ ] From all components
- [ ] Verify no breakage

**Estimated Time:** 1-2 hours

---

### 4. 🟢 **LOW - Documentation & Cleanup**

**Tasks:**

#### 4.1 Update CLAUDE.md
- [ ] Add v0.7.2 release notes
- [ ] Document FileService migration
- [ ] Update test suite info

#### 4.2 Update qtodo.md
- [ ] Mark Phase 4 complete (after migration)
- [ ] Update status to "Phase 5 Ready"
- [ ] Document lessons learned

#### 4.3 Update README Files
- [ ] Main README.md
- [ ] Backend README
- [ ] Test README

#### 4.4 Clean Up Deprecated Files
After all components migrated:
- [ ] Delete FileService.js (localStorage version)
- [ ] Delete DataService.js (if no longer needed)
- [ ] Update imports across codebase

**Estimated Time:** 2-3 hours

---

## 🚀 **Recommended Execution Order**

### Week 1 (Current)
**Day 1 (Today - 2025-10-04):**
- [x] ✅ Create E2E test suite (35+ tests)
- [x] ✅ Update documentation (TESTING-SUMMARY.md, README.md)
- [x] ✅ Run full E2E test suite (identified 3 critical issues)
- [x] ✅ Fix rate limiting (global auth setup)
- [x] ✅ Fix user menu test ID
- [ ] 📋 Fix form field showInTable validation (final issue)

**Day 2:**
- [ ] Start component migration
- [ ] Migrate FormView.jsx (#1.1)
- [ ] Migrate SubmissionDetail.jsx (#1.2)
- [ ] Test migrations

**Day 3:**
- [ ] Migrate SubFormEditPage.jsx (#1.3)
- [ ] Migrate SubFormDetail.jsx (#1.4)
- [ ] Test migrations

**Day 4:**
- [ ] Migrate image-thumbnail.jsx (#1.5)
- [ ] Migrate file-display.jsx (#1.6)
- [ ] Test all migrations

**Day 5:**
- [ ] DataService final cleanup (#3)
- [ ] Re-run all E2E tests
- [ ] Fix any regressions

### Week 2
**Day 1-2:**
- [ ] Documentation updates (#4)
- [ ] Clean up deprecated files
- [ ] Final testing

**Day 3:**
- [ ] Release v0.7.2
- [ ] Deploy to production
- [ ] Monitor for issues

---

## 📊 **Progress Tracking**

### Overall Progress: Phase 8.12
- ✅ Phase 0: Delete Confirmation UX Fix (Complete)
- ✅ Phase 1: Service Layer Cleanup (Complete)
- ✅ Phase 2: FileService Migration Infrastructure (Complete)
- ✅ Phase 3: E2E Test Suite (Complete)
- 📋 **Phase 4: Component Migration (Next - 6 components)**
- 📋 Phase 5: DataService Final Cleanup
- 📋 Phase 6: Documentation & Release

**Completion:** 50% (3/6 phases complete)
**Estimated Time to Complete:** 2 weeks

---

## ⚠️ **Important Notes**

### Before Starting Component Migration:

1. **Run E2E Tests First**
   - Establish baseline
   - Ensure app works before changes
   - Document current state

2. **Migration Pattern**
   ```javascript
   // OLD (FileService.js - localStorage)
   const result = await FileService.saveFile(file, fieldId, submissionId);
   const fileData = FileService.getFile(fileId);

   // NEW (FileService.api.js - MinIO)
   const result = await fileServiceAPI.uploadFile(file, submissionId, fieldId);
   const fileData = await fileServiceAPI.getFileWithUrl(fileId);
   ```

3. **Test Each Migration**
   - Run E2E tests after each component
   - Manual testing for file uploads
   - Verify file display works

4. **Keep Deprecation Warnings**
   - Don't remove until all components migrated
   - Helps identify missed usages
   - Remove in Phase 5

---

## 🎯 **Success Criteria**

**Phase 4 Complete When:**
- ✅ All 6 components migrated to FileService.api.js
- ✅ All E2E tests passing
- ✅ File upload/download works correctly
- ✅ No localStorage used for files
- ✅ Images display from presigned URLs

**Phase 5 Complete When:**
- ✅ 0 dataService calls remaining
- ✅ DataService.js deleted
- ✅ All imports updated

**Phase 6 Complete When:**
- ✅ All documentation updated
- ✅ Deprecated files removed
- ✅ v0.7.2 released
- ✅ Production deployment successful

---

## 📞 **Support Resources**

- **Migration Guide:** `docs/FileService-Migration-Guide.md`
- **Test Suite:** `tests/e2e/README.md`
- **Testing Summary:** `TESTING-SUMMARY.md`
- **API Documentation:** Backend Swagger at `/api/v1/docs`

---

**Next Step:** Run E2E tests to establish baseline, then start component migration!
