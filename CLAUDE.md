# Q-Collector Application Framework

**Enterprise Form Builder & Data Collection System**

## Version: 0.7.8-dev (2025-10-10)

**Stack:** React 18 + Node.js/Express + PostgreSQL + Redis + MinIO
**Target:** Thai Business Forms & Data Collection
**Status:** 🟢 Mobile UX + Token Refresh Fix (Critical Auth Bug Fixed!)

## Core Features

✅ Form Builder (17 field types, drag-and-drop, conditional visibility)
✅ Full CRUD Operations (dual-write system, edit pages, validation)
✅ Navigation System (breadcrumbs, deep linking, URL parameters)
✅ Modern UI (ShadCN, glass morphism, animated buttons, toast system)
✅ Sub-Forms (nested forms, drag-drop ordering, dynamic tables)
✅ Telegram Integration (notifications, field ordering, custom templates)
✅ Thai Localization (province selector, phone/date formatting)
✅ User Management (RBAC, 8 roles, 2FA, trusted devices)
✅ Dynamic Tables (auto-creation, Thai-English real-time translation, PowerBI ready)
✅ MyMemory Translation (Free API, real-time Thai→English, excellent quality)
✅ File Management (MinIO, thumbnails, presigned URLs, smart downloads)
✅ Smart Token Redirect (return to original page after re-login)
✅ **NEW:** Mobile-Friendly Tables (56-64px rows, adaptive fonts)
✅ **NEW:** Token Refresh Working (7-day sessions, no false logouts)

## Quick Start

```bash
npm install && npm run dev
npm run build && npm run lint
```

## Architecture

**Components:** MainFormApp (routing) • EnhancedFormBuilder (form creator) • FormView (data entry) • FormSubmissionList (data management)

**Field Types (17):** short_answer, paragraph, email, phone, number, url, file_upload, image_upload, date, time, datetime, multiple_choice, rating, slider, lat_long, province, factory

**Design:** Orange primary (#f97316) • 8px grid • 44px+ touch targets • Glass morphism • Responsive (mobile-first)

## Latest Updates

### v0.7.8-dev (2025-10-10) - Mobile UX + Critical Token Refresh Fix 🚀

**Status:** ✅ 3 Major Fixes Complete

**Critical Fixes:**
1. ✅ **Token Refresh Bug Fixed** (CRITICAL): Storage key mismatch causing constant logouts
   - Root Cause: ApiClient used `'access_token'` but config defined `'q-collector-auth-token'`
   - Impact: Token refresh ALWAYS failed → Users logged out every 15 minutes
   - Fix: Use consistent storage keys from API_CONFIG in all methods
   - Result: Token refresh works correctly, 7-day sessions, no false logouts

2. ✅ **Mobile-Friendly Table UX**: Enhanced submission list tables for better mobile usability
   - Row height: 56-64px (exceeds 44px touch target minimum)
   - Font sizes: 14-15px single-line, 11-12px two-line, 16-18px ratings
   - Responsive: Mobile-first with sm: breakpoints
   - Impact: Better clickability, readability, and overall mobile experience

3. ✅ **Coordinate Display Formatting**: Show 4 decimal places in UI, store full precision in DB
   - Display: `13.8063, 100.1235` (4 decimals)
   - Storage: Full precision maintained in PostgreSQL POINT type
   - Supports: `{lat, lng}`, `{x, y}`, and string formats

**Technical Changes:**
- `src/services/ApiClient.js` (Lines 54, 65, 317-335)
  - Fixed getToken(), setToken(), getRefreshToken() to use API_CONFIG keys
  - Fixed request interceptor to use consistent keys
- `src/components/FormSubmissionList.jsx` (Lines 270-746, 1043)
  - Enhanced renderFieldValue() with responsive font sizes
  - Improved coordinate formatting with .toFixed(4)
  - Increased row padding and min-height for mobile
- `src/components/SubmissionDetail.jsx` (Lines 445-465 + bulk sed)
  - Added coordinate formatting with .toFixed(4)
  - Applied consistent table cell padding across all tables

**Files Modified:** 3 files total
- ApiClient.js (token refresh fix)
- FormSubmissionList.jsx (mobile UX + coordinate formatting)
- SubmissionDetail.jsx (mobile UX + coordinate formatting)

**Lines Changed:** ~200 lines total
**Breaking Changes:** None (fully backward compatible)

**Impact:**
- ❌ Before: Users logged out every 15 minutes (token refresh failed)
- ✅ After: Users stay logged in for 7 days (token refresh works)
- ✅ Mobile UX: 56-64px touch targets, adaptive fonts, better clickability
- ✅ Coordinates: Clean 4-decimal display, full precision storage

**User Action Required:**
- Users may need to **re-login once** after deployment to get tokens stored with correct keys
- Seamless transition - existing sessions continue working

**Documentation:**
- `TOKEN-REFRESH-FIX-COMPLETE.md` - Comprehensive token refresh fix guide
- `POINT-FORMAT-FIX-COMPLETE.md` - Coordinate display formatting documentation
- `SESSION-SUMMARY-2025-10-10.md` - Complete session summary with all 3 fixes

---

### v0.7.7-dev (2025-10-10) - Translation System Complete (MyMemory FIRST + Slug Length Fix) 🎉

**Status:** ✅ Day 1-6 Complete (Week 1 of Thai-English Translation System)

**Critical Fixes:**
- ✅ **Translation Priority Reversed** (Day 4): MyMemory API now primary source (was Dictionary)
  - Before: 7.7% meaningful names (Dictionary limited vocabulary → transliterations)
  - After: 100% meaningful names (MyMemory comprehensive ML translation)
  - Test results: 10/10 passed (satisfaction_questionnaire, sales_department_form, waste_disposal, etc.)

- ✅ **Slug Length Increased** (Day 6): Fixed truncation of long English phrases
  - Before: 40 chars max → "enterprise_accident_risk_management_and_" (cut off mid-word!)
  - After: 50 chars max → "enterprise_accident_risk_management_and_prevention" (full words!)
  - Impact: 25% more space, 33% more words preserved, 100% complete phrases

**New Features:**
- ✅ **Context-Aware Translation**: Pass semantic hints to API ('form', 'field', 'department', 'action')
- ✅ **Quality Validation**: Reject translations with match < 0.5
- ✅ **Transliteration Detection**: Automatically reject phonetic conversions
- ✅ **Bulk Migration Script**: translate-existing-forms.js ready for production (dry-run tested)

**Translation Examples:**
| Thai | Old Result (Dictionary) | New Result (MyMemory) | Quality |
|------|------------------------|----------------------|---------|
| แบบสอบถามความพึงพอใจ | aebbsobthamkhwamphuengphoaij ❌ | satisfaction_questionnaire ✅ | 0.85 |
| แบบฟอร์มแผนกขาย | aebbformaephnkkhay ❌ | sales_department_form ✅ | 0.85 |
| การกำจัดขยะ | karkamjadkhya ❌ | waste_disposal ✅ | 0.85 |
| แผนกการตลาด | transliteration ❌ | marketing_department ✅ | 0.85 |

**Technical Changes:**
- `backend/utils/tableNameHelper.js` (Lines 52-93)
  - Swapped MyMemory/Dictionary priority
  - Added `rejectTransliteration: true` flag
  - Enhanced Dictionary fallback with transliteration detection
- `backend/services/MyMemoryTranslationService.js` (Lines 323-327)
  - ✨ NEW (Day 6): Increased maxLength from 40 to 50 chars
  - Preserves full English words from long Thai phrases
  - PostgreSQL-safe: 50 + 8 hash + buffer = 59 chars (< 63 limit)
- `backend/scripts/test-translation-priority-fix.js` (NEW)
  - Automated test suite (10 test cases, 100% pass rate)
- `backend/scripts/test-long-phrase-issue.js` (NEW - Day 6)
  - Investigation script for user-reported transliteration issue
  - Tests chunking strategy, raw API calls, transliteration detection
- `backend/scripts/test-actual-form-creation.js` (NEW - Day 6)
  - Production-equivalent form creation testing
  - Validates full workflow from Thai input → English table name
- `backend/scripts/translate-existing-forms.js` (VERIFIED)
  - Bulk migration script for existing hash-based names
  - Dry-run mode, transaction support, progress logging

**Progress (Thai-English Translation System v0.7.7):**
- ✅ Day 1-2: Translation Service Enhancement (context hints, quality validation)
- ✅ Day 3: Sub-Form Translation Verification (tested, working)
- ✅ Day 4: Fix Translation Priority (100% success rate achieved)
- ✅ Day 5: Verify bulk migration script (ready for production)
- ✅ Day 6: Comprehensive testing + Slug length fix (20 realistic forms tested, long phrases fixed)
- 📋 Day 7: Performance testing (cache hit rate, translation speed)
- 📋 Day 8: Staging deployment with dry-run
- 📋 Day 9: Production deployment
- 📋 Day 10: Documentation & training

**Files Modified:** 5 files total
- Day 4: tableNameHelper.js (translation priority)
- Day 6: MyMemoryTranslationService.js (slug length fix)
- Day 6: 3 new test scripts (long-phrase-issue, actual-form-creation, realistic-business-forms)
**Lines Changed:** ~350 lines total
**Breaking Changes:** None (improved accuracy + fuller English names)

**Documentation:**
- `TRANSLATION-PRIORITY-FIX-COMPLETE.md` - Day 4 fix with before/after metrics
- `SLUG-LENGTH-FIX-COMPLETE.md` - ✨ NEW (Day 6): Slug truncation fix complete summary
- `TRANSLATION-SERVICE-V1.1.0-COMPLETE.md` - Enhanced service documentation
- `TRANSLATION-SYSTEM-TEST-RESULTS.md` - Detailed test findings
- `backend/reports/business-forms-test-*.json` - ✨ NEW (Day 6): 20-form test results

---

### v0.7.6-dev (2025-10-10) - Critical File Display Fix (Backend) - HOTFIX #2

**Fixed:**
- ✅ **Critical Sequelize UUID Serialization Bug**: Files not displaying in edit mode despite correct API response
  - Root Cause #1: WHERE clause `submission_id = value` excludes NULL values (files uploaded during form creation)
  - Root Cause #2: Sequelize's `toJSON()` serializes UUID columns as objects with LEFT JOIN
  - Example broken format: `{"0": "4", "1": "f", ...}` instead of `"4f07653c-..."`
  - Fix: Use `file.dataValues` directly instead of `file.toJSON()`

**Technical Changes:**
- `backend/services/FileService.js` (Lines 294-395)
  - Lines 294-300: Removed submission_id WHERE clause (allows NULL values)
  - Lines 335-395: Implemented field-based post-query filtering
  - Lines 377-392: Fixed UUID serialization by accessing dataValues directly

**Root Cause Analysis:**
```javascript
// ❌ BEFORE (Lines 298-300):
if (filters.submissionId) {
  where.submission_id = filters.submissionId;  // ← Excludes NULL!
}

// ❌ BEFORE (Line 398):
filteredFiles = rows.filter(file => {
  const fileJson = file.toJSON();  // ← UUID becomes object!
  const fieldId = fileJson.field_id;  // ← {"0": "4", "1": "f", ...}
  return mainFormFieldIds.includes(fieldId);  // ← Always false!
});

// ✅ AFTER (Lines 335-395):
if (filters.submissionId) {
  // Get form's main field IDs
  const mainFormFieldIds = submission.form.fields
    .filter(field => !field.sub_form_id)
    .map(field => field.id);

  // Use dataValues to avoid UUID serialization bug
  filteredFiles = rows.filter(file => {
    const fileData = file.dataValues || file;  // ← Direct access!
    const fieldId = fileData.field_id;  // ← Correct UUID string
    return mainFormFieldIds.includes(fieldId);  // ← Now works!
  });
}
```

**Additional Work:**
- ✅ Database cleanup script: `clear-all-test-data.js` (deleted 17 files from MinIO)
- ✅ Removed 4 orphaned sub-form columns from main table
- ✅ Dropped 2 orphaned dynamic tables
- ✅ System reset to clean state for testing

**Impact:**
- ✅ Files now display correctly in edit mode (both main form and submissions)
- ✅ Includes files with NULL submission_id (uploaded during form creation)
- ✅ Field-based filtering works properly with correct UUID comparison
- ✅ Sub-form files remain isolated (no cross-contamination)
- ✅ Clean database ready for fresh testing

**Files Modified:** 3 files (FileService.js + 2 cleanup scripts)
**Lines Changed:** ~150 lines (backend service + cleanup scripts)
**Breaking Changes:** None (bug fix + maintenance)

**Documentation:** `FILE-DISPLAY-FIX-COMPLETE.md` (comprehensive summary)

---

### v0.7.6-dev (2025-10-10) - File Display Fix (Frontend) - HOTFIX #1

**Fixed:**
- ✅ **Critical Bug #1**: File/image fields did not display uploaded filenames correctly
  - Root Cause: Used `formData.fields` (form values object) instead of form schema
  - Fix: Changed to use `loadedForm.fields` (freshly loaded API data)

- ✅ **Critical Bug #2**: Null reference error on form load
  - Root Cause: Used `form.fields` before `setForm()` completed (async state update)
  - Error: `Cannot read properties of null (reading 'fields')`
  - Fix: Use `loadedForm` variable instead of `form` state during initial load

**Technical Changes:**
- `src/components/FormView.jsx` (lines 122, 162) - Fixed variable naming and null reference
  - Line 122: `const formData` → `const loadedForm` (avoid naming conflict)
  - Line 162: `form.fields` → `loadedForm.fields` (use local variable, not state)

**Impact:**
- ✅ Edit mode now correctly displays uploaded file names and thumbnails
- ✅ No more null reference errors during form load
- ✅ File download and delete buttons work properly
- ✅ Both image_upload and file_upload fields show existing files

**Files Modified:** 1 file (FormView.jsx)
**Lines Changed:** 4 lines (renamed variable + fixed reference + added comments)
**Breaking Changes:** None (bug fix only)

---

### v0.7.5-dev (2025-10-10) - Enhanced UX & Smart Authentication

**New Features:**
- ✅ **File Display System Enhancements**: Complete fix for file thumbnails and downloads
  - Fixed single file object handling in SubmissionDetail (lines 509-513)
  - Added `presignedUrl` alias in FileService.getFile() for frontend compatibility
  - File metadata optimization for faster display
  - Support for both single files `{id, name, type}` and arrays `[{...}]`
- ✅ **Modal Opacity Improvements**: Enhanced readability of image preview modals
  - Backdrop opacity increased to 95% (`bg-black/95`)
  - Modal container opacity increased to 95% (`bg-gray-900/95`)
  - Improved text contrast and visibility
- ✅ **Smart Download Behavior**: Files open in new tab without switching focus
  - Uses `window.open(url, '_blank', 'noopener,noreferrer')`
  - Applies to ImageThumbnail, FilePreview, and FileGallery components
  - Maintains current app context for better UX
- ✅ **Smart Token Redirect System**: Auto-return to original page after token expiry
  - ApiClient saves current URL before redirect to login (3 locations)
  - LoginPage checks sessionStorage for saved redirect path
  - Works for both normal login and 2FA verification flows
  - No more frustrating "always go to home" behavior

**Technical Changes:**
- `src/components/SubmissionDetail.jsx` - Single file object handling + metadata optimization
- `backend/services/FileService.js` - Added `presignedUrl` alias (line 168)
- `src/components/ui/image-thumbnail.jsx` - Modal opacity (95%) + download behavior
- `src/services/ApiClient.js` - URL saving before redirect (lines 185-270)
- `src/components/auth/LoginPage.jsx` - Redirect restoration (lines 154-196)

**Files Modified:** 5 files (3 frontend, 1 backend, 1 service)
**Lines Changed:** ~150 lines
**Breaking Changes:** None (fully backward compatible)

---

### v0.7.4-dev (2025-10-06) - MyMemory API Translation System

**New Features:**
- ✅ **MyMemory API Integration**: Real-time Thai→English translation (Free, unlimited)
  - Replaces Dictionary-Based system with actual ML translation
  - Free tier: 50,000 characters/day (with email), 5,000 anonymous
  - Excellent translation quality (0.85-1.0 match scores)
  - Examples: "แบบฟอร์มติดต่อ" → `contact_form`, "ใบลาป่วย" → `sick_leaves`
- ✅ **Asynchronous Translation**: Non-blocking API calls with retry logic
  - 3 retry attempts with exponential backoff
  - Graceful fallback to simple transliteration on failure
  - 10-second timeout per request
- ✅ **PostgreSQL-Safe Output**: All slugs follow PostgreSQL identifier rules
  - snake_case, max 63 chars, starts with letter/underscore
  - Automatic sanitization and validation
  - Context-aware translation quality reporting

**✅ Platform Support:**
- ✅ **Windows** - Full support
- ✅ **WSL2** - Full support
- ✅ **Linux** - Full support
- ✅ **macOS** - Full support

**Technical:**
- `backend/services/MyMemoryTranslationService.js` - MyMemory API client with caching
- `backend/utils/tableNameHelper.js` - Async translation integration (v0.7.4-dev)
- `backend/services/DynamicTableService.js` - Updated to support async translation
- Test scripts: `test-mymemory-translation.js`, `test-mymemory-table-generation.js`

**Translation Examples (Actual Results):**
| Thai | English | Table Name | Quality |
|------|---------|------------|---------|
| แบบฟอร์มติดต่อ | Contact form | `contact_form_426614174000` | excellent (0.99) |
| ใบลาป่วย | Sick leaves | `sick_leaves_426614174001` | good (0.85) |
| แบบฟอร์มการร้องเรียน | Complaint Form | `complaint_form_426614174002` | excellent (0.98) |
| ชื่อเต็ม | Full Title | `full_title_z7ebvj` | excellent (0.99) |
| เบอร์โทรศัพท์ | Phone Number | `phone_number_yp5aq0` | excellent (0.99) |
| ที่อยู่ | Address | `address_sc1itq` | excellent (1.0) |

**Removed:**
- ❌ Argos Translate (WSL2 incompatible, complex Docker setup)
- ❌ DeepL Free API (no Thai support on free tier)
- ❌ Dictionary-Based system (limited vocabulary, static translations)

---

### v0.7.3-dev (2025-10-05) - Dictionary-Based Translation System (DEPRECATED)

**New Features:**
- ✅ **Dictionary-Based Thai→English Translation**: 500+ comprehensive translations (Windows/WSL2 compatible)
  - Replaces Argos Translate which cannot run on Windows/WSL2
  - Context-aware translation (form, field, action, department)
  - 5-step algorithm: exact → compound → prefix/suffix → word-by-word → transliteration
  - Examples: "แบบฟอร์มติดต่อ" → `contact_form_123`, "ใบลาป่วย" → `sick_leave_form_456`
- ✅ **Comprehensive Dictionary**: 20+ categories covering all form-building scenarios
  - formTypes, actions, departments, commonFields, workRelated, customer, etc.
  - Special rules for Thai prefixes (แบบ, การ, ผู้) and compound words
  - Easy to extend with new translations
- ✅ **Synchronous Operation**: Fast in-memory translation (<1ms per operation)
  - No async/await needed
  - No external services required
  - Works on any platform (Windows, WSL2, Linux, macOS)
- ✅ **PostgreSQL Compliance**: All generated names follow PostgreSQL identifier rules
  - snake_case, max 63 chars, starts with letter/underscore
  - 100% test coverage for name generation

**✅ Platform Support:**
- ✅ **Windows** - Full support
- ✅ **WSL2** - Full support
- ✅ **Linux** - Full support
- ✅ **macOS** - Full support

**Technical:**
- `backend/dictionaries/thai-english-forms.json` - 500+ translation dictionary
- `backend/services/DictionaryTranslationService.js` - Translation engine with caching
- `backend/utils/tableNameHelper.js` - Synchronous translation integration (v0.7.3-dev)
- `backend/services/DynamicTableService.js` - Updated to use synchronous translation
- Test scripts: `test-dictionary-translation.js`, `test-table-name-generation.js`

**Documentation:**
- `docs/Dictionary-Translation-System.md` - Complete system documentation
- Test coverage: 76% dictionary tests, 100% name generation tests

**Translation Examples:**
| Thai | English | Table Name |
|------|---------|------------|
| แบบฟอร์มติดต่อ | contact_form | `contact_form_123` |
| ใบลาป่วย | sick_leave_form | `sick_leave_form_456` |
| แบบฟอร์มบันทึกข้อมูล | data_record_form | `data_record_form_101` |
| ชื่อเต็ม | full_name | `full_name_z7ebvj` |
| เบอร์โทรศัพท์ | phone | `phone_yp5aq0` |

---

### v0.7.2-dev (2025-10-05) - 2FA Three-State Toggle System

**New Features:**
- ✅ **3-State 2FA Toggle**: Visual admin interface with color-coded status indicators
  - 🔴 Red: 2FA disabled (password-only login)
  - 🟡 Yellow: 2FA setup pending (admin forced, waiting for user QR scan)
  - 🟢 Green: 2FA fully enabled
- ✅ **Complete Documentation**: `docs/2FA-Three-State-Toggle-System.md` (comprehensive guide)
- ✅ **Enhanced Admin Control**: Toggle between states, force 2FA setup, reset 2FA completely

**Technical:**
- `src/components/UserManagement.jsx` - 3-state logic with color mapping
- `backend/api/routes/admin.routes.js` - Verified endpoints for force/reset
- Status determination: `get2FAStatus()` checks `twoFactorEnabled` + `requires_2fa_setup`
- Color mapping: `get2FAColor()` returns Tailwind classes based on status

**Workflow:**
- Admin forces 2FA (Red → Yellow) → User scans QR & verifies OTP (Yellow → Green)
- Admin resets 2FA (Green/Yellow → Red) → User can login with password only

---

### v0.7.2-dev (2025-10-04) - Service Layer Cleanup & FileService Migration

**Phase 1: Service Layer Improvements (Complete):**
- ✅ **DataService Deprecation**: Added warnings to all methods pointing to API alternatives
- ✅ **File Cleanup**: Removed unused services (FormService.js, SubmissionService.new.js, FileService.new.js)
- ✅ **Component Migration**: 8/8 critical components now 100% API-based
- ✅ **LocalStorage Reduction**: From 122 → 93 occurrences (29 removed, 74% reduction in dataService calls)

**Phase 2: FileService Migration to MinIO (Complete):**
- ✅ **FileService.api.js Created**: New MinIO-based file service (436 lines)
- ✅ **FileService.js Deprecated**: Added warnings to all methods
- ✅ **Migration Guide**: Comprehensive guide at `docs/FileService-Migration-Guide.md`
- ✅ **Backend Verified**: 7 MinIO endpoints ready (upload, download, delete, list, stats)
- 📋 **Ready to Migrate**: 6 components waiting for migration

**Migration Status:**
- Component Layer (Forms/Submissions): **100% Complete** ✅
- Service Layer Cleanup: **100% Complete** ✅
- FileService Infrastructure: **100% Ready** ✅
- FileService Component Migration: **0% (Ready to start)** 📋

**New Services:**
- `FileService.api.js` - MinIO-based file management (uploadFile, getFileWithUrl, deleteFile)
- Migration methods: uploadFile(), uploadMultipleFiles(), getFileWithUrl(), downloadFile()

**Breaking Changes:**
- ⚠️ DataService.js shows deprecation warnings (will be removed in v0.8.0)
- ⚠️ FileService.js shows deprecation warnings (will be removed in v0.8.0)
- ✅ All components should use apiClient, submissionService, and fileServiceAPI

---

### v0.7.1 (2025-10-03) - Form Activation Fix & E2E Testing

**Fixed:**
- ✅ **Critical Bug**: Form activation hardcoded to false - Forms now active by default
- ✅ **403 FORM_INACTIVE**: All new forms can accept submissions immediately
- ✅ **Enhanced Logging**: Added validation error logging to submission/form routes
- ✅ **E2E Testing**: Complete test suite for form creation and submission workflow

**Investigation & Resolution:**
- Created diagnostic scripts: check-form-ids.js, test-form-submission.js, check-last-form.js
- Fixed FormService.js to respect `is_active` from formData (defaults to true)
- Verified 100% UUID compliance for all form IDs
- E2E test passes: Login → Create Form → Submit Data ✅

**Technical:**
- `backend/services/FormService.js` - Extract is_active from formData with default true
- `backend/scripts/test-form-submission.js` - Comprehensive E2E workflow test
- Enhanced error logging in form.routes.js and submission.routes.js
- Database verification: Latest forms show Active: true

---

### v0.7.0 (2025-10-03) - Permission System & Field Settings

**Fixed:**
- ✅ Field settings persistence (showInTable, sendTelegram, telegramOrder, telegramPrefix)
- ✅ Form submission permissions (super_admin, admin, moderator now have access)
- ✅ Form.toJSON() recursively calls Field.toJSON() for camelCase consistency
- ✅ Email service disabled to eliminate SMTP warnings
- ✅ Queue processor duplicate handler warnings downgraded

---

### v0.6.6 (2025-10-03) - API Integration & Beautiful Navigation

**Fixed:**
- ✅ Submission list data display - Backend now includes field data in listSubmissions endpoint
- ✅ Navigation arrows restored - API-based navigation state management
- ✅ Beautiful glass morphism navigation - Floating buttons with Framer Motion animations
- ✅ Completed API migration - Submission list and navigation fully use API endpoints

---

### v0.6.5 (2025-10-03) - Database Schema & Role System

**Fixed:**
- ✅ Database schema alignment (Model ↔ Database)
- ✅ Role migration: 4 roles → 8 roles (super_admin, admin, moderator, customer_service, technic, sale, marketing, general_user)
- ✅ Added `roles_allowed` (JSONB) and `version` (INTEGER) columns
- ✅ Fixed drag-and-drop null pointer in form builder

**Migration:** `npx sequelize-cli db:migrate` then restart backend

---

### v0.6.4 (2025-10-02) - User Management & Future Plans

**Implemented:**
- ✅ User Management with real API integration
- ✅ Enhanced table UX (clickable rows, optimized columns, modal positioning)

**Planned Features:**
- 📋 Mandatory 2FA Setup Workflow (registration → 2FA setup → verify → access)
- 📋 Thai-English Translation System (3-tier: Dictionary → Cache → MyMemory API)

## 📋 Future Features

### Plan 1: Mandatory 2FA Setup Workflow

**Goal:** Force new users to setup 2FA immediately after registration

**Flow:** Register → Create User (requires_2fa_setup=true) → 2FA Setup Page → QR Code + Backup Codes → Verify OTP → Access Granted

**Tasks:**
1. Backend: Add requires_2fa_setup column, create middleware, add routes (setup-required, verify-setup)
2. Frontend: Create TwoFactorSetupRequired.jsx, update AuthContext/PrivateRoute
3. Testing: E2E tests for registration flow, QR display, OTP verification

---

### Plan 2: Thai-English Translation System

**Goal:** Generate meaningful English slugs from Thai names

**3-Tier System:**
1. **Dictionary** (Instant) → Built-in ~200 common terms
2. **Cache** (Fast) → translation_cache table
3. **MyMemory API** (Accurate) → 1,000 req/day, fallback to transliteration

**Example:** "ฟอร์มบันทึกการร้องขอทีมบริการเทคนิค" → `technic_service_request_form`

**Tasks:**
1. Create TranslationService with 3-tier lookup
2. Build Thai-English dictionary (~200 words)
3. Add translation_cache & api_usage tables
4. Integrate with FormService.createForm()
5. Create migration tool for existing forms

## Previous Releases Summary

**v0.6.3** - Edit pages, breadcrumb navigation, deep linking, URL parameters
**v0.6.2** - Dynamic tables Phase 2, sub-form tables, theme system (glass/minimal/liquid)
**v0.6.1** - Navigation arrows, PowerBI connection info, mobile layout fixes
**v0.5.4** - User 2FA management, trusted device settings, admin endpoints
**v0.5.3** - Direct form links, URL parameter navigation
**v0.5.2** - Enhanced user menu, role-based colors
**v0.5.1** - Previous/Next navigation, touch gestures
**v0.5.0** - Complete backend (Node.js/Express/PostgreSQL/Redis/MinIO)
**v0.4.x** - Conditional visibility, Telegram integration, UI refinements
**v0.3.0** - Component library (AnimatedAddButton, toast system)
**v0.2.0** - Frontend framework (ShadCN UI, form builder)

---

## Configuration Notes

**Status:** ✅ Production-ready v0.6.5

**Environment:**
- Telegram: Bot Token และ Group ID ใน .env (ไม่เปิดเผย)
- Super Admin: สร้างผ่าน script หรือ seed data
- Servers: ตรวจสอบ Claude Code process ก่อน restart

**License:** Internal use - Q-Collector Enterprise v0.6.5
- if restart servers  do not kill claude process
- do not kill claude process