# Q-Collector Application Framework

**Enterprise Form Builder & Data Collection System**

## Version Information

- **Version**: 0.5.2
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

**Application Status:** ✅ Production-ready v0.5.2 - Complete Full-Stack Enterprise System

**License:** Internal use - Q-Collector Enterprise Form Builder v0.5.2
- BOT TOKEN FOR TELEGRAM TESTING 7794493324:AAHlxtpYenok1kwyo88ns5R4rivWWXcqmE0   AND GROUP ID = -4847325737  record in .env
- สร้าง Super Admin Account  โดยใช้ User Name : pongpanp  ชื่อ : Pongpan Peerawanichkul  email: pongpanp@qcon.co.th  Department : Technic  Role : Super Admin