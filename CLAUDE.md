# Q-Collector Application Framework

**Enterprise Form Builder & Data Collection System**

## Version: 0.7.2-dev (2025-10-05)

**Stack:** React 18 + Node.js/Express + PostgreSQL + Redis + MinIO
**Target:** Thai Business Forms & Data Collection
**Status:** 🟢 2FA Three-State Toggle Complete

## Core Features

✅ Form Builder (17 field types, drag-and-drop, conditional visibility)
✅ Full CRUD Operations (dual-write system, edit pages, validation)
✅ Navigation System (breadcrumbs, deep linking, URL parameters)
✅ Modern UI (ShadCN, glass morphism, animated buttons, toast system)
✅ Sub-Forms (nested forms, drag-drop ordering, dynamic tables)
✅ Telegram Integration (notifications, field ordering, custom templates)
✅ Thai Localization (province selector, phone/date formatting)
✅ User Management (RBAC, 8 roles, 2FA, trusted devices)
✅ Dynamic Tables (auto-creation, Thai translation, PowerBI ready)

## Quick Start

```bash
npm install && npm run dev
npm run build && npm run lint
```

## Architecture

**Components:** MainFormApp (routing) • EnhancedFormBuilder (form creator) • FormView (data entry) • FormSubmissionList (data management)

**Field Types (17):** short_answer, paragraph, email, phone, number, url, file_upload, image_upload, date, time, datetime, multiple_choice, rating, slider, lat_long, province, factory

**Design:** Orange primary (#f97316) • 8px grid • 44px touch targets • Glass morphism • Responsive (mobile-first)

## Latest Updates

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