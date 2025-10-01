# Q-Collector Application Framework

**Enterprise Form Builder & Data Collection System**

## Version Information

- **Version**: 0.5.4
- **Release Date**: 2025-10-01
- **Framework**: React 18 + Node.js/Express + PostgreSQL + Redis + MinIO
- **Target**: Thai Business Forms & Data Collection
- **Architecture**: Full-Stack Enterprise Application

## Core Features

✅ **Complete Form Builder System** - Drag-and-drop interface with 17 field types
✅ **Modern UI Components** - ShadCN UI with glass morphism effects
✅ **Circular Animation Buttons** - Beautiful motion effects with AnimatedAddButton
✅ **Advanced Toast System** - Portal-based notifications outside containers
✅ **Sub-Form Management** - Default empty sub-forms with dynamic field addition
✅ **Conditional Field Visibility** - Formula-based field show/hide with AppSheet-compatible syntax
✅ **Advanced Telegram Notifications** - Dual-panel field ordering with drag-and-drop
✅ **Responsive Design** - Mobile-first with container-responsive patterns
✅ **Thai Localization** - Province selector, phone formatting, date formats

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

**Application Status:** ✅ Production-ready v0.5.4 - Complete Full-Stack Enterprise System

**License:** Internal use - Q-Collector Enterprise Form Builder v0.5.4

**Configuration Notes:**
- Telegram Bot Token และ Group ID ตั้งค่าใน .env (ไม่เปิดเผยใน repository)
- Super Admin Account: สร้างผ่าน script หรือ seed data
- Claude Code Process: ตรวจสอบ process ก่อน restart servers