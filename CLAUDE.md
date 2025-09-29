# Q-Collector Frontend Framework v0.4

**Modern React Form Builder Framework with Advanced Features**

## Version Information

- **Version**: 0.4.0
- **Release Date**: 2025-09-30
- **Framework**: React 18 + ShadCN UI + Tailwind CSS + Framer Motion + @dnd-kit
- **Target**: Thai Business Forms & Data Collection

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

## Recent Updates (v0.4)

**Conditional Field Visibility System:**
- Formula engine with Google Sheets-compatible syntax
- Real-time field visibility evaluation based on form data
- Formula builder with field reference picker and validation
- Support for AND(), OR(), NOT(), IF(), CONTAINS(), ISBLANK() functions

**Advanced Telegram Notification System:**
- Dual-panel drag-and-drop field ordering interface
- Custom message prefix with real-time preview
- Checkbox-based notification enable/disable
- Enhanced drag animations with visual feedback (opacity, scale, shadows)
- Field ordering with automatic numbering

**Previous Features (v0.3):**
- Circular Animation Buttons with motion effects
- Enhanced Toast System with portal-based rendering
- Sub-Form Management with default empty templates
- Glass morphism UI with backdrop blur effects

## Future Development

**Backend Integration:** PostgreSQL + MinIO + Redis stack ready
**API Layer:** RESTful endpoints for forms, submissions, file uploads
**Enhanced Features:** Advanced validation, real-time collaboration, analytics dashboard

---

**Framework Status:** ✅ Production-ready v0.4 with conditional visibility and advanced telegram integration

**License:** Internal use - Q-Collector Form Builder Framework v0.4