# Q-Collector Frontend Framework v0.3

**Modern React Form Builder Framework with Advanced UI Components**

## Version Information

- **Version**: 0.3.0
- **Release Date**: 2025-01-21
- **Framework**: React 18 + ShadCN UI + Tailwind CSS + Framer Motion
- **Target**: Thai Business Forms & Data Collection

## Core Features

✅ **Complete Form Builder System** - Drag-and-drop interface with 17 field types
✅ **Modern UI Components** - ShadCN UI with glass morphism effects
✅ **Circular Animation Buttons** - Beautiful motion effects with AnimatedAddButton
✅ **Advanced Toast System** - Portal-based notifications outside containers
✅ **Sub-Form Management** - Default empty sub-forms with dynamic field addition
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

## Recent Updates (v0.3)

**Circular Animation Buttons:** All add buttons now use AnimatedAddButton with motion effects
**Enhanced Toast System:** Portal-based rendering outside containers for persistent notifications
**Sub-Form Improvements:** Default empty sub-form always visible, becomes real when fields added
**UI Refinements:** Form list tags show "ALL" when all roles selected, larger icons without neon effects
**Motion Effects:** Pulsing glow, rotating rings, sparkle effects, hover ripples

## Future Development

**Backend Integration:** PostgreSQL + MinIO + Redis stack ready
**API Layer:** RESTful endpoints for forms, submissions, file uploads
**Enhanced Features:** Advanced validation, real-time collaboration, analytics dashboard

---

**Framework Status:** ✅ Production-ready v0.3 with advanced UI components and animation system

**License:** Internal use - Q-Collector Form Builder Framework v0.3