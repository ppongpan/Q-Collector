# Q-Collector Application Framework

**Enterprise Form Builder & Data Collection System**

## Version Information

- **Version**: 0.6.3
- **Release Date**: 2025-10-02
- **Framework**: React 18 + Node.js/Express + PostgreSQL + Redis + MinIO
- **Target**: Thai Business Forms & Data Collection
- **Architecture**: Full-Stack Enterprise Application

## Core Features

✅ **Complete Form Builder System** - Drag-and-drop interface with 17 field types
✅ **Modern UI Components** - ShadCN UI with glass morphism effects
✅ **Edit Functionality** - Full CRUD operations for main forms and sub-forms with dual-write
✅ **Breadcrumb Navigation** - Dynamic breadcrumb trail across all pages with deep linking
✅ **Circular Animation Buttons** - Beautiful motion effects with AnimatedAddButton
✅ **Advanced Toast System** - Portal-based notifications outside containers
✅ **Sub-Form Management** - Default empty sub-forms with dynamic field addition
✅ **Conditional Field Visibility** - Formula-based field show/hide with AppSheet-compatible syntax
✅ **Advanced Telegram Notifications** - Dual-panel field ordering with drag-and-drop
✅ **Responsive Design** - Mobile-first with container-responsive patterns
✅ **Thai Localization** - Province selector, phone formatting, date formats
✅ **Deep Linking Support** - URL parameters for direct navigation to any page

## Quick Start

```bash
npm install && npm run dev    # Install & start development
npm run build && npm run lint # Build & validate code
```

## Architecture

**Main Components:**
- 📱 **MainFormApp** - Navigation & routing
- 🎨 **EnhancedFormBuilder** - Form creation with drag-and-drop
- 📝 **FormView** - Data entry interface
- 📊 **FormSubmissionList** - Data management
- 🧩 **UI Components** - Glass morphism, animated buttons, enhanced toasts

## Field Types (17 Types)

**Text & Input:** short_answer, paragraph, email, phone, number, url
**Files:** file_upload, image_upload
**Date/Time:** date, time, datetime
**Selection:** multiple_choice, rating, slider
**Location:** lat_long, province, factory

## Design System

**Colors:** Orange primary (#f97316), black secondary, adaptive backgrounds
**Layout:** max-w-3xl containers, 8px grid system, 44px touch targets
**Typography:** xl headers, sm labels, 12px table data

## Key Components

### AnimatedAddButton
```jsx
<AnimatedAddButton
  onClick={handleAdd}
  tooltip="Add New Item"
  size="default"  // small, default, large
/>
```
**Features:** Circular design, pulsing glow, rotating rings, sparkle effects, hover ripples

### Enhanced Toast System
```jsx
const toast = useEnhancedToast();
toast.success("Success!", { title: "Done", duration: 5000 });
toast.error("Error!", { action: { label: "Retry", onClick: retry } });
```
**Features:** Portal-based rendering, outside container constraints, auto-dismiss, action buttons

### Glass Morphism
```jsx
<GlassCard className="glass-container">
  <GlassCardContent>Content</GlassCardContent>
</GlassCard>
```
**Features:** Backdrop blur, glass effects, responsive design

## Sub-Form Management

**Default Empty Sub-Form:** Always shows empty sub-form template when entering sub-form tab
**Dynamic Addition:** Becomes real sub-form when fields are added
**Conditional Remove:** Default empty sub-form cannot be deleted

## Data Management

**LocalStorage Service:** Form data persistence
**Validation System:** Real-time field validation with Thai language support
**Export System:** Data table with 12px font, hover effects
**Telegram Integration:** Ready for notification bot integration

## Performance Features

**React Optimization:** Memoized components, useCallback handlers, lazy loading
**Animation Performance:** 60fps Framer Motion, hardware acceleration
**Mobile-First Design:** Responsive breakpoints, touch targets (44px min)
**Accessibility:** WCAG 2.1 AA compliance, ARIA labels, keyboard navigation

## Version History

### v0.6.3 (2025-10-02) - Advanced Navigation & Edit Functionality

**Major Updates:**
- ✅ **Edit Pages System** - Complete edit functionality for main forms and sub-forms
- ✅ **Breadcrumb Navigation** - Comprehensive breadcrumb system across all pages
- ✅ **Deep Linking** - URL parameter support for direct navigation
- ✅ **Form Builder Navigation** - Enhanced navigation flows with browser support
- ✅ **Mobile Optimization** - Responsive edit pages and navigation

**Edit Pages Implementation:**
- **MainFormEditPage** - Full-featured editing for main form submissions
  - Load existing submission data with pre-filled fields
  - Dual-write system (old tables + dynamic tables)
  - Complete validation and error handling
  - File upload support with preview
  - Permission-based access (admin/moderator/owner)
  - Theme-aware design (glass/minimal)
  - Mobile-responsive layout

- **SubFormEditPage** - Multi-entry editing for sub-forms
  - Edit multiple sub-form entries
  - Drag-and-drop reordering with @dnd-kit
  - Array-based data management
  - Order index preservation
  - Theme support
  - Mobile touch gestures

- **Edit Button Integration**
  - Edit buttons in SubmissionDetail and SubFormDetail
  - Responsive design (text on desktop, icon on mobile)
  - Smooth navigation: Detail → Edit → Save → Back to Detail
  - Permission checking before showing edit option

**Breadcrumb Navigation System:**
- **Auto-Generated Breadcrumbs** - Dynamic breadcrumb based on navigation context
  - Form List: "Home"
  - Form Builder: "Home > Create Form" / "Home > Edit Form"
  - Submission List: "Home > [Form Name]"
  - Submission Detail: "Home > [Form Name] > Submission #123456"
  - Main Form Edit: "Home > [Form Name] > Submission #123456 > Edit"
  - Sub-Form Detail: "Home > [Form Name] > Submission #123456 > [Sub-Form Name]"
  - Sub-Form Edit: "Home > [Form Name] > Submission #123456 > [Sub-Form Name] > Edit"
  - Settings: "Home > Settings"
  - User Management: "Home > User Management"

- **UX Features**
  - Clickable navigation trail for quick access
  - Smart truncation for long form names (max 20 chars)
  - Ellipsis display for deep paths (maxItems: 3)
  - Home icon for quick return
  - Smooth Framer Motion animations
  - Theme-aware styling (glass/minimal)
  - Mobile responsive with adaptive font sizes

**Deep Linking & URL Parameters:**
- **Multiple URL Patterns Supported:**
  - `?mode=builder` - Create new form
  - `?mode=builder&form=xyz` - Edit existing form
  - `?form=xyz&view=submissions` - View submission list
  - `?form=xyz&view=detail&submission=abc` - View submission detail
  - `?form=xyz&mode=edit&submission=abc` - Edit submission
  - `?form=xyz&mode=create` - Create new submission
  - `?form=xyz&view=subform&submission=abc&subform=def&subsub=ghi` - Sub-form detail

- **Navigation Features**
  - Auto-navigation based on URL parameters
  - URL cleanup after navigation
  - Browser back/forward button support
  - Deep linking from external sources
  - State preservation during navigation

**Form Builder Navigation Enhancements:**
- Tested and fixed navigation flows:
  - Form creation: Form List → Builder → Save → List
  - Form editing: List → Builder (edit mode) → Save → List
  - Back button behavior verified
  - State cleanup confirmed
  - Draft saving functional
  - Field reordering doesn't break navigation
  - Sub-form creation within builder tested

**Technical Implementation:**

*Edit Pages:*
- `src/components/pages/MainFormEditPage.jsx` - Main form edit component (701 lines)
- `src/components/pages/SubFormEditPage.jsx` - Sub-form edit component (497 lines)
- Integrated with DataService for dual-write
- Form validation with error messages
- File upload handling with preview
- Permission-based access control

*Breadcrumb System:*
- `src/components/ui/breadcrumb.jsx` - Breadcrumb component (232 lines)
  - ResponsiveBreadcrumb component
  - BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage
  - BreadcrumbSeparator, BreadcrumbEllipsis
  - Theme variants (glass/minimal)
- `src/contexts/BreadcrumbContext.jsx` - Breadcrumb state management (317 lines)
  - BreadcrumbProvider and useBreadcrumb hook
  - Auto-generation based on navigation
  - Custom label support
  - Truncation logic

*Navigation Updates:*
- `src/components/MainFormApp.jsx` - Enhanced with:
  - Breadcrumb integration (lines 799-817)
  - Edit page routes (main-form-edit, subform-edit)
  - URL parameter handling (lines 62-99)
  - Navigation state management
  - Form title tracking for breadcrumbs

*Detail View Updates:*
- `src/components/SubmissionDetail.jsx` - Added Edit button
- `src/components/SubFormDetail.jsx` - Added Edit button
- Responsive button design (text + icon on desktop, icon only on mobile)

**Benefits:**
- **Improved UX** - Clear navigation with visual breadcrumb trail
- **Edit Functionality** - Full CRUD operations on submissions
- **Deep Linking** - Share direct links to specific views
- **Mobile Optimized** - Touch-friendly edit pages and navigation
- **Theme Consistency** - All new features support both themes
- **Browser Friendly** - Back/forward buttons work correctly

**Navigation Flow Examples:**
```
1. Edit Flow:
   Submission List → Detail → Click Edit → Edit Page → Save → Back to Detail

2. Breadcrumb Navigation:
   Click "Form Name" in breadcrumb → Jump to Submission List
   Click "Home" → Return to Form List

3. Deep Link:
   Share URL: /?form=abc&mode=edit&submission=def
   Recipient opens link → Directly to edit page
```

**Success Metrics:**
- ✅ 100% feature parity for editing
- ✅ Breadcrumbs on all pages
- ✅ All URL patterns working
- ✅ Mobile responsive (320px+)
- ✅ Theme support verified
- ✅ No console errors
- ✅ Build successful

---

### v0.6.2 (2025-10-02) - Dynamic Tables Phase 2 & Theme System Complete

**Major Updates:**
- ✅ **Dynamic Tables Phase 2** - Sub-form table support with parent-child relationships
- ✅ **Frontend Integration** - Dual-write system for backward compatibility
- ✅ **Minimal Theme Complete** - Clean design without blur effects
- ✅ **Liquid Glass Theme** - iOS 26 design system verified (implemented as "glass" theme)
- ✅ **Theme Selector UI** - Beautiful theme switcher in Settings
- ✅ **Comprehensive Testing** - 9 new integration tests for sub-form tables

**Dynamic Tables Phase 1 Features:**
- **Auto Table Creation** - Creates table when form is created
- **Auto Column Addition** - Adds columns when fields are added to form
- **Thai Translation** - 100+ word dictionary for accurate translations
- **Compound Word Support** - Handles multi-word Thai phrases correctly
- **PostgreSQL Types** - Maps field types to appropriate PostgreSQL data types
- **Performance Indexes** - Auto-creates indexes for form_id, user_id, submitted_at

**Dynamic Tables Phase 2 - Sub-Form Tables:**
- **Separate Tables for Sub-Forms** - Each sub-form gets its own PostgreSQL table
- **Parent-Child Relationships** - Foreign key `parent_id` references main table
- **Order Preservation** - `order_index` column maintains entry sequence
- **Cascade Deletion** - ON DELETE CASCADE for referential integrity
- **Migration Support** - Added `table_name` column to `sub_forms` table
- **Dual-Write System** - Writes to both old (submissions) and new (dynamic) tables
- **Graceful Degradation** - Sub-form failures don't block main form submissions

**Sub-Form Table Structure:**
```sql
CREATE TABLE {sub_form_table_name} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES {main_table}(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  sub_form_id UUID NOT NULL REFERENCES sub_forms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  submission_number INTEGER,
  order_index INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'submitted',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Dynamic columns based on sub-form fields
);
```

**Translation Examples:**
- "แบบฟอร์มติดต่อ" → `form_contact_abc123`
- "ชื่อเต็ม" → `full_name_field1`
- "เบอร์โทรศัพท์" → `phone_abc123`
- "อีเมล" → `email_def456`
- "รายการสินค้า" → `order_items_sub001` (sub-form)

**Benefits:**
- **PowerBI Direct Connection** - Connect directly to PostgreSQL
- **AI-Friendly** - Column names are meaningful and understandable
- **Better Performance** - No JSON parsing needed for queries
- **Data Analysis** - Easy to create SQL queries and reports
- **One-to-Many Support** - Natural handling of sub-form data relationships

**Theme System Complete:**
- **Minimal Theme** - Clean ShadCN UI design without blur/transparency
- **Liquid Glass Theme** - iOS 26 design with backdrop blur (existing "glass" theme)
- **Theme Selector** - Beautiful UI with theme previews and icons
- **Theme Persistence** - localStorage + React Context pattern
- **Theme Service** - Centralized theme management with DOM manipulation
- **Three Themes Available:** glass (Liquid Glass), minimal (Clean), liquid (Future)

**Technical Implementation:**

*Dynamic Tables:*
- `backend/services/DynamicTableService.js` - Added 3 methods for sub-form tables:
  - `createSubFormTable()` - Create sub-form table with foreign keys
  - `insertSubFormData()` - Insert data into sub-form table
  - `getSubFormData()` - Retrieve sub-form data by parent_id
- `backend/services/FormService.js` - Enhanced for sub-form table creation/updates
- `backend/services/SubmissionService.js` - Dual-write integration (lines 121-183)
- `backend/models/SubForm.js` - Added `table_name` field
- `backend/migrations/20251002000002-add-table-name-to-subforms.js` - New migration
- `backend/utils/thaiTranslator.js` - Thai-English translation dictionary
- `backend/utils/tableNameHelper.js` - Table/column name generation utilities

*Theme System:*
- `src/contexts/ThemeContext.jsx` - React Context for theme state
- `src/services/ThemeService.js` - localStorage & DOM manipulation
- `src/config/themes.js` - Theme configuration (glass, minimal, liquid)
- `src/styles/minimal-theme.css` - Complete Minimal theme (723 lines)
- `src/components/ui/minimal-*.jsx` - All minimal UI components
- `src/components/settings/ThemeSelector.jsx` - Theme switcher UI
- Integrated in `src/components/SettingsPage.jsx` (line 281)

**Testing:**
- **9 New Integration Tests** for sub-form tables:
  - Sub-form table creation with correct structure
  - Parent-child foreign key relationships
  - Order preservation with order_index
  - Multiple entries per parent
  - Cascade deletion on parent delete
  - Data retrieval by parent_id
  - Column validation and data types
- **Fixed UUID validation** - Corrected 5 invalid test UUIDs to valid hex format
- Tests in `backend/tests/integration/DynamicTableService.test.js`

**Documentation:**
- Updated `DYNAMIC-TABLES-GUIDE.md` with Phase 2 implementation
- Phase 1 & 2 marked as ✅ Implemented
- Added sub-form table examples and best practices

### v0.6.1 (2025-10-02) - UI/UX Enhancements & Logo Update

**Major Updates:**
- ✅ **Detail View Navigation Improvements** - Enhanced hover effects and glowing buttons
- ✅ **PowerBI Connection Info Update** - Direct PostgreSQL connection details with copy buttons
- ✅ **Mobile Layout Fixes** - Centered form cards on mobile devices
- ✅ **Login Page Branding** - Updated logo to SHARE_POTENTIALS.png

**UI/UX Enhancements:**
- **Navigation Arrow Improvements** - Glowing hover effects with radial shadow
- **Border Radius Precision** - 24px curved borders matching container
- **Mobile Arrow Visibility** - Visible arrows with opacity hints on mobile/tablet
- **Gradient Effects** - Enhanced gradient overlays for medium screens

**PowerBI Integration:**
- **PostgreSQL Connection Display** - Server (localhost:5432), Database, Table names
- **Copy-to-Clipboard** - Easy copying of connection details
- **Sub-Form Tables** - Display sub-form table names if they exist
- **Removed Global Settings** - Cleaned up unnecessary PowerBI info from Settings page

**Components Updated:**
- `src/components/SubmissionDetail.jsx` - Enhanced navigation arrows
- `src/components/SubFormDetail.jsx` - Enhanced navigation arrows
- `src/components/EnhancedFormBuilder.jsx` - PowerBI connection info
- `src/components/SettingsPage.jsx` - Removed PowerBI section
- `src/components/auth/LoginPage.jsx` - Updated logo
- `src/components/FormListApp.jsx` - Mobile layout
- `src/index.css` - Mobile responsive fixes

### v0.5.4 (2025-10-01) - User 2FA Management & Trusted Device Settings

**Major Updates:**
- ✅ **User 2FA Management for Super Admin** - Complete control over user 2FA settings
- ✅ **Trusted Device Duration Settings** - Configurable skip 2FA duration
- ✅ **Data Cleanup Tools** - User consistency maintenance scripts
- ✅ **Admin API Endpoints** - Super Admin-only routes for user management

**User 2FA Management Features:**
- **Super Admin Only Access** - Restricted to super_admin role
- **View All Users' 2FA Status** - Complete overview with statistics
- **Force Enable 2FA** - Require users to setup 2FA on next login
- **Reset 2FA** - Remove secret, backup codes, and trusted devices
- **Search & Filter** - Find users by name/email, filter by 2FA status
- **Stats Dashboard** - Total users, enabled/disabled counts

**Trusted Device Settings:**
- **Duration Configuration** - Set trust duration from 1-720 hours
- **Default 24 Hours** - Reasonable security/convenience balance
- **Super Admin Only** - Protected settings for security policy
- **Validation** - Range checking and error handling
- **API Endpoints:** GET/PUT `/api/v1/auth/trusted-device-settings`

**Admin API Endpoints:**
- `GET /api/v1/admin/users/2fa-status` - List all users with 2FA status
- `POST /api/v1/admin/users/:userId/force-2fa` - Force enable 2FA
- `POST /api/v1/admin/users/:userId/reset-2fa` - Reset user's 2FA completely

**New Components:**
- `src/components/admin/User2FAManagement.jsx` - 2FA management interface
- `src/components/settings/TrustedDeviceDuration.jsx` - Duration settings
- `backend/api/routes/admin.routes.js` - Admin-only endpoints

**Utility Scripts:**
- `backend/scripts/check-users.js` - User data analysis
- `backend/scripts/cleanup-unused-users-auto.js` - Remove inactive users
- `backend/scripts/create-technicuser.js` - Create technic user account
- `backend/scripts/check-2fa-status.js` - 2FA status checker
- `backend/scripts/disable-2fa.js` - Disable 2FA for user
- `backend/scripts/test-2fa.js` - Test 2FA functionality

**Documentation:**
- `USER-2FA-MANAGEMENT-FEATURE.md` - Complete feature documentation
- `TRUSTED-DEVICE-DURATION-FEATURE.md` - Duration settings guide
- `TRUSTED-DEVICE-IMPLEMENTATION.md` - Updated to 90% complete

**Components Updated:**
- `src/components/UserManagement.jsx` - Integrated 2FA management
- `src/components/SettingsPage.jsx` - Added duration settings
- `backend/api/routes/index.js` - Mounted admin routes

### v0.5.3 (2025-10-01) - Direct Form Link & Navigation Improvements

**Major Updates:**
- ✅ **Direct Form Link Feature** - Copy shareable link to form submission list
- ✅ **URL Parameter Navigation** - Deep linking to specific forms
- ✅ **Role-Based Menu Visibility** - Admin controls properly scoped
- ✅ **Enhanced Form Cards** - Link icon for easy sharing

**Form Link Features:**
- **Link Icon:** Blue link icon in form cards
- **Copy to Clipboard:** One-click copy direct link to submission list
- **URL Format:** `/?form={formId}&view=submissions`
- **Auto Navigation:** Opens directly to submission list when logged in
- **Toast Notifications:** Success/error feedback on copy

**Navigation Enhancements:**
- Fixed navigation menu visibility for Super Admin, Admin, Moderator
- Proper role checking with `canCreateOrEditForms()`
- URL parameter handling in MainFormApp
- Clean URL after navigation

**Components Updated:**
- `src/components/FormListApp.jsx` - Added link icon and copy function
- `src/components/MainFormApp.jsx` - URL parameter handling

### v0.5.2 (2025-10-01) - Enhanced User Menu & Profile Display

**Major Updates:**
- ✅ **Redesigned User Menu Dropdown** - Modern, compact design with glass morphism
- ✅ **Role-Based Username Colors** - Visual role identification without labels
- ✅ **Responsive User Menu** - Optimized for mobile, tablet, and desktop
- ✅ **Improved User Profile Display** - Username-first approach with role colors

**User Menu Enhancements:**
- **Fixed positioning:** Menu appears below navigation bar at `top-[60px]`
- **Compact design:** `w-[200px]` mobile, `w-[220px]` desktop
- **Centered username:** Role-colored username with user icon at top
- **Clean menu items:** Settings and Logout with gradient backgrounds
- **Responsive font sizes:** Scales from mobile to desktop seamlessly
- **Role color system:**
  - Super Admin: Purple (`text-purple-400`)
  - Admin: Red (`text-red-400`)
  - Moderator: Blue (`text-blue-400`)
  - Customer Service: Green (`text-green-400`)
  - Sales: Orange (`text-orange-400`)
  - Marketing: Pink (`text-pink-400`)
  - Technic: Cyan (`text-cyan-400`)

**Top Menu Display:**
- Username shown in role color (instead of email)
- Removed role label for cleaner appearance
- Avatar with green status indicator

**Components Updated:**
- `src/components/ui/user-menu.jsx` - Complete redesign
- `src/contexts/AuthContext.jsx` - Username priority over email

### v0.5.1 (2025-09-30) - Previous/Next Navigation in Detail Views

**Major Updates:**
- ✅ **Responsive Navigation System** - Previous/Next navigation for browsing submissions
- ✅ **Detail View Navigation** - Main form and sub-form detail view navigation
- ✅ **Touch Gesture Support** - Swipe left/right on mobile devices
- ✅ **Adaptive UI Design** - Different behaviors for large/medium/mobile screens

**Navigation Features:**
- **Large Screens (≥1024px)**: Arrow buttons outside form box with glass morphism styling
- **Medium Screens (768px-1023px)**: Hidden arrows, visible on hover with gradient effects
- **Mobile Screens (<768px)**: Swipe gestures (50px minimum distance)
- **Smart Navigation**: Automatically determines if previous/next submissions exist
- **Seamless UX**: Smooth transitions with Framer Motion animations

**Implementation Details:**
- Touch event handlers: onTouchStart, onTouchMove, onTouchEnd
- Navigation props: onNavigatePrevious, onNavigateNext, hasPrevious, hasNext
- Responsive classes: `hidden lg:flex`, `lg:hidden`, `hidden md:block`
- Components updated: SubmissionDetail.jsx, SubFormDetail.jsx, MainFormApp.jsx

### v0.5.0 (2025-09-30) - Complete Backend Integration & Documentation

**Major Updates:**
- ✅ **Complete Backend System** - Node.js/Express API with PostgreSQL database
- ✅ **Real-Time Communication** - WebSocket integration with Socket.IO
- ✅ **Advanced Caching** - Redis-based caching layer for performance
- ✅ **File Storage** - MinIO object storage for file uploads
- ✅ **User Management** - Complete RBAC system with 8 roles
- ✅ **Two-Factor Authentication** - Enhanced security with 2FA
- ✅ **Background Processing** - Bull queue for async tasks
- ✅ **Email Integration** - Notification system with templates
- ✅ **Analytics System** - Comprehensive data analytics and reporting
- ✅ **Complete Documentation** - Full application documentation in qcollector.md

**Telegram Integration Enhanced:**
- Message prefix with placeholder support ([FormName], [DateTime])
- Field ordering via drag-and-drop interface
- Real Telegram API testing capability
- Custom message formatting and templates
- Backward compatibility with old settings format

**UI/UX Refinements:**
- Compact field card design with reduced padding
- Auto-scroll to new fields and expanded settings
- Optimized spacing and visual density
- Enhanced toast notification system

### v0.4.1 (2025-09-30) - UI/UX Improvements

**UI/UX Improvements & Auto-Scroll Enhancement:**
- Telegram notification toggle always visible
- Removed conditional visibility options from field settings menu
- Toggle buttons repositioned to field title row
- Reduced field card padding for compact appearance
- Thinner borders (0.5px) for cleaner look
- Auto-scroll to new fields when added
- Auto-scroll to expanded field settings
- Drag handle positioning improvements
- Optimized spacing for better visual density

### v0.4.0 (2025-09-29) - Advanced Features

**Conditional Field Visibility System:**
- Formula engine with AppSheet-compatible syntax
- Support for AND, OR, comparison operators
- Dynamic field show/hide based on form data

**Advanced Telegram Notification System:**
- Dual-panel drag-and-drop field ordering
- Field selection and ordering interface
- Automatic numbering and custom prefixes

### v0.3.0 (2025-09-28) - UI Component Library

**Component Library Enhancements:**
- Circular Animation Buttons with motion effects
- Enhanced Toast System with portal-based rendering
- Sub-Form Management with default empty templates
- Glass morphism UI with backdrop blur effects

### v0.2.0 (2025-09-27) - Frontend Framework

**Complete Frontend Framework:**
- ShadCN UI integration
- Form builder with 17 field types
- Drag-and-drop field management
- LocalStorage data persistence

---

**Application Status:** ✅ Production-ready v0.6.3 - Advanced Navigation, Edit Functionality & Breadcrumb System

**License:** Internal use - Q-Collector Enterprise Form Builder v0.6.3

**Configuration Notes:**
- Telegram Bot Token และ Group ID ตั้งค่าใน .env (ไม่เปิดเผยใน repository)
- Super Admin Account: สร้างผ่าน script หรือ seed data
- Claude Code Process: ตรวจสอบ process ก่อน restart servers