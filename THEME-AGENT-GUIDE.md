# คู่มือพัฒนา UI Theme สำหรับ Q-Collector v0.6.0

<div class="glass-card">

## 📋 ภาพรวม

คู่มือฉบับนี้ให้คำแนะนำโดยละเอียดสำหรับ AI agents (Claude Code subagents) ในการพัฒนาระบบ Theme สำหรับ Q-Collector โดยเริ่มจาก **Minimal Theme พื้นฐาน** (ใช้ ShadCN UI) ก่อน แล้วจึงพัฒนาไปสู่ **Glass Morphism Theme** ที่มี effects สวยงามในภายหลัง

</div>

---

## 🎯 วัตถุประสงค์โครงการ (ปรับใหม่)

<div class="glass-highlight">

**Primary Objective**: สร้าง UI ที่เรียบง่าย สวยงาม และใช้งานได้จริงก่อน แล้วค่อยพัฒนาเป็น advanced theme

**Development Phases**:
1. **Phase 1 (v0.6.0)**: Minimal Theme - ShadCN UI พื้นฐาน, clean, fast
2. **Phase 2 (v0.7.0)**: Glass Morphism Theme - Advanced effects, animations, blur

</div>

**Key Requirements (Phase 1 - Minimal Theme)**:
- ✅ ใช้ ShadCN UI components พื้นฐาน
- ✅ Clean และ simple design
- ✅ Performance สูง (fast rendering)
- ✅ Responsive design
- ✅ WCAG AA accessibility compliance
- ✅ ไม่มี complex animations
- ✅ ไม่มี blur effects
- ✅ ไม่มี glassmorphism

---

## 🚀 แผนพัฒนาแบบใหม่

<div class="page-panel glass-card">

### Version 0.6.0: Minimal Theme Foundation (Current)

<div class="notification glass-notif">

**Timeline**: 3-4 สัปดาห์
**Focus**: ShadCN UI พื้นฐาน + Minimal Design
**Status**: 🚀 Ready to Start

</div>

**จุดเน้น**:
- ✅ สร้าง UI foundation ที่แข็งแรง
- ✅ Component architecture ที่ขยายได้
- ✅ Basic theme system (เตรียมสำหรับ multiple themes)
- ✅ Clean code และ documentation
- ✅ Performance optimization

**ไม่รวม**:
- ❌ Glass morphism effects
- ❌ Complex animations
- ❌ Blur effects
- ❌ Advanced motion effects

---

### Version 0.7.0: Glass Morphism Theme (Future)

**Timeline**: 2-3 สัปดาห์ (หลังจาก v0.6.0 เสร็จ)
**Focus**: Advanced UI Effects + Animations
**Status**: 📋 Planned

**จุดเน้น**:
- ✅ เพิ่ม glass morphism effects
- ✅ Backdrop blur และ transparency
- ✅ Advanced animations (Framer Motion)
- ✅ Motion effects
- ✅ Gradient และ glow effects

</div>

---

## 🎨 Phase 1: Minimal Theme Development (v0.6.0)

<div class="glass-container">

### Design Principles (Minimal Theme)

<div class="minimal-card">

1. **Simplicity First**
   - ใช้สีพื้นฐาน (solid colors)
   - ไม่มี transparency
   - ขอบชัดเจน (solid borders)
   - เงาเล็กน้อย (subtle shadows)

2. **Performance Priority**
   - CSS transitions แทน JS animations
   - ไม่ใช้ backdrop-filter
   - Minimal repaints/reflows
   - Fast rendering

3. **ShadCN UI Based**
   - ใช้ ShadCN components ตามที่มี
   - ปรับ styling ผ่าน Tailwind classes
   - Maintain ShadCN API consistency

4. **Accessibility First**
   - WCAG AA compliance
   - High contrast ratios
   - Clear focus indicators
   - Keyboard navigation

</div>

---

### Color System (Minimal Theme)

<div class="glass-card">

```css
/* Minimal Theme - Light Mode */
:root {
  /* Base Colors */
  --background: 0 0% 98%;           /* #fafafa - Light gray */
  --foreground: 0 0% 5%;             /* #0d0d0d - Near black */

  /* Card Colors */
  --card: 0 0% 100%;                 /* #ffffff - Pure white */
  --card-foreground: 0 0% 5%;        /* #0d0d0d */

  /* Primary Colors (Orange - Same as before) */
  --primary: 24 95% 55%;             /* #f97316 - Orange */
  --primary-foreground: 0 0% 100%;   /* #ffffff - White */

  /* Secondary Colors */
  --secondary: 0 0% 90%;             /* #e6e6e6 - Light gray */
  --secondary-foreground: 0 0% 5%;   /* #0d0d0d */

  /* Borders */
  --border: 0 0% 88%;                /* #e0e0e0 - Medium gray */
  --input: 0 0% 96%;                 /* #f5f5f5 - Light gray */

  /* Shadows (Subtle) */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 2px 4px 0 rgb(0 0 0 / 0.08);
  --shadow-lg: 0 4px 8px 0 rgb(0 0 0 / 0.12);

  /* States */
  --muted: 0 0% 94%;
  --muted-foreground: 0 0% 40%;
  --accent: 24 95% 55%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
}

/* Minimal Theme - Dark Mode */
:root.dark {
  --background: 0 0% 8%;             /* #141414 - Dark gray */
  --foreground: 0 0% 95%;            /* #f2f2f2 - Light gray */
  --card: 0 0% 12%;                  /* #1f1f1f - Dark card */
  --card-foreground: 0 0% 95%;       /* #f2f2f2 */
  --border: 0 0% 20%;                /* #333333 - Dark border */
  --input: 0 0% 16%;                 /* #292929 */
}
```

</div>

---

### Typography System (เหมือนเดิม)

```css
/* Font Families */
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
--font-mono: "Cascadia Code", "Fira Code", monospace;

/* Font Sizes */
--font-size-xs: 0.75rem;    /* 12px */
--font-size-sm: 0.875rem;   /* 14px */
--font-size-base: 1rem;     /* 16px */
--font-size-lg: 1.125rem;   /* 18px */
--font-size-xl: 1.25rem;    /* 20px */
--font-size-2xl: 1.5rem;    /* 24px */
--font-size-3xl: 1.875rem;  /* 30px */

/* Font Weights */
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;

/* Line Heights */
--line-height-tight: 1.25;
--line-height-normal: 1.5;
--line-height-relaxed: 1.75;
```

---

### Spacing System (8px grid)

```css
/* Spacing Scale (8px grid system) */
--spacing-0: 0;
--spacing-1: 0.25rem;  /* 4px */
--spacing-2: 0.5rem;   /* 8px */
--spacing-3: 0.75rem;  /* 12px */
--spacing-4: 1rem;     /* 16px */
--spacing-5: 1.25rem;  /* 20px */
--spacing-6: 1.5rem;   /* 24px */
--spacing-8: 2rem;     /* 32px */
--spacing-10: 2.5rem;  /* 40px */
--spacing-12: 3rem;    /* 48px */
--spacing-16: 4rem;    /* 64px */

/* Border Radius */
--radius-sm: 0.375rem;  /* 6px */
--radius-md: 0.5rem;    /* 8px */
--radius-lg: 0.75rem;   /* 12px */
--radius-xl: 1rem;      /* 16px */
```

</div>

---

## 🧩 Component Development Guide

<div class="glass-container">

### สร้าง Core Components (ShadCN UI Based)

<div class="glass-card">

#### 1. MinimalCard Component

**File**: `src/components/ui/minimal-card.jsx`

```jsx
// Minimal Card - Based on ShadCN UI Card
import * as React from "react"
import { cn } from "@/lib/utils"

const MinimalCard = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      // Base styles
      "rounded-lg border bg-card text-card-foreground",
      // Shadow
      "shadow-sm",
      // Transitions
      "transition-shadow duration-200",
      // Hover
      "hover:shadow-md",
      className
    )}
    {...props}
  />
))
MinimalCard.displayName = "MinimalCard"

const MinimalCardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
MinimalCardHeader.displayName = "MinimalCardHeader"

const MinimalCardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
MinimalCardTitle.displayName = "MinimalCardTitle"

const MinimalCardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
MinimalCardDescription.displayName = "MinimalCardDescription"

const MinimalCardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
MinimalCardContent.displayName = "MinimalCardContent"

const MinimalCardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
MinimalCardFooter.displayName = "MinimalCardFooter"

export {
  MinimalCard,
  MinimalCardHeader,
  MinimalCardFooter,
  MinimalCardTitle,
  MinimalCardDescription,
  MinimalCardContent,
}
```

**Key Points**:
- ✅ ใช้ ShadCN pattern (`React.forwardRef`)
- ✅ ใช้ `cn()` utility สำหรับ class merging
- ✅ Simple transitions (200ms)
- ✅ Subtle shadows
- ✅ ไม่มี blur หรือ transparency

---

#### 2. MinimalButton Component

**File**: `src/components/ui/minimal-button.jsx`

```jsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Base styles
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        xs: "h-8 px-3 text-xs",
        sm: "h-9 px-4",
        default: "h-10 px-5",
        lg: "h-11 px-6",
        xl: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const MinimalButton = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
MinimalButton.displayName = "MinimalButton"

export { MinimalButton, buttonVariants }
```

**Key Points**:
- ✅ ใช้ `class-variance-authority` (CVA) สำหรับ variants
- ✅ 5 variants: default, secondary, outline, ghost, destructive
- ✅ 6 sizes: xs, sm, default, lg, xl, icon
- ✅ Simple color transitions
- ✅ Focus ring สำหรับ accessibility

---

#### 3. MinimalInput Component

**File**: `src/components/ui/minimal-input.jsx`

```jsx
import * as React from "react"
import { cn } from "@/lib/utils"

const MinimalInput = React.forwardRef(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles
          "flex h-10 w-full rounded-md border border-input",
          "bg-input px-3 py-2 text-sm",
          // Focus
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Transitions
          "transition-colors duration-200",
          // Placeholder
          "placeholder:text-muted-foreground",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
MinimalInput.displayName = "MinimalInput"

export { MinimalInput }
```

---

#### 4. MinimalSelect Component

**File**: `src/components/ui/minimal-select.jsx`

```jsx
import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const MinimalSelect = SelectPrimitive.Root

const MinimalSelectTrigger = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-input px-3 py-2 text-sm",
        "focus:outline-none focus:ring-2 focus:ring-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-colors duration-200",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
)
MinimalSelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const MinimalSelectContent = React.forwardRef(
  ({ className, children, position = "popper", ...props }, ref) => (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          "relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-card text-card-foreground shadow-md",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        {...props}
      >
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
)
MinimalSelectContent.displayName = SelectPrimitive.Content.displayName

const MinimalSelectItem = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none",
        "focus:bg-accent focus:text-accent-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
)
MinimalSelectItem.displayName = SelectPrimitive.Item.displayName

export {
  MinimalSelect,
  MinimalSelectTrigger,
  MinimalSelectContent,
  MinimalSelectItem,
}
```

---

### Component List สำหรับ Phase 1

<div class="notification glass-notif">

**Priority Order**: สร้างตามลำดับความสำคัญ

</div>

#### Week 1: Core Components (6 hours)
1. ✅ **MinimalCard** - Base container
2. ✅ **MinimalButton** - Primary action
3. ✅ **MinimalInput** - Text input
4. ✅ **MinimalSelect** - Dropdown selection
5. ✅ **MinimalCheckbox** - Boolean input
6. ✅ **MinimalLabel** - Form labels

#### Week 2: Form & Navigation (8 hours)
7. ✅ **MinimalTextarea** - Multi-line input
8. ✅ **MinimalRadio** - Radio buttons
9. ✅ **MinimalSwitch** - Toggle switch
10. ✅ **MinimalToast** - Notifications
11. ✅ **MinimalAlert** - Alerts/messages
12. ✅ **MinimalBadge** - Status badges

#### Week 3: Data Display (8 hours)
13. ✅ **MinimalTable** - Data tables
14. ✅ **MinimalDialog** - Modals
15. ✅ **MinimalDropdown** - Dropdown menus
16. ✅ **MinimalTooltip** - Tooltips
17. ✅ **MinimalAvatar** - User avatars
18. ✅ **MinimalProgress** - Progress bars

#### Week 4: Specialized (6 hours)
19. ✅ **MinimalTabs** - Tab navigation
20. ✅ **MinimalAccordion** - Collapsible sections
21. ✅ **MinimalSeparator** - Visual dividers
22. ✅ **MinimalLoading** - Loading states

</div>

</div>

---

## 🔧 Implementation Guidelines

<div class="glass-card">

### DO's ✅

1. **ใช้ ShadCN UI patterns**
   - React.forwardRef สำหรับ ref forwarding
   - Radix UI primitives สำหรับ accessibility
   - class-variance-authority (CVA) สำหรับ variants

2. **Tailwind CSS utilities**
   - ใช้ Tailwind classes แทน custom CSS
   - ใช้ design tokens (colors, spacing)
   - ใช้ `cn()` utility สำหรับ class merging

3. **Simple transitions**
   - transition-colors duration-200
   - transition-shadow duration-200
   - transition-transform duration-200

4. **Accessibility**
   - focus-visible:ring-2 สำหรับ focus indicators
   - ARIA labels ที่จำเป็น
   - Keyboard navigation support

### DON'Ts ❌

1. **ไม่ใช้ glass effects**
   - ❌ backdrop-filter
   - ❌ backdrop-blur
   - ❌ rgba transparency (ยกเว้น shadows)

2. **ไม่ใช้ complex animations**
   - ❌ Framer Motion (เว้นไว้สำหรับ Phase 2)
   - ❌ CSS keyframe animations
   - ❌ Spring animations

3. **ไม่ใช้ custom CSS files**
   - ❌ สร้าง .css files แยก
   - ✅ ใช้ Tailwind classes เท่านั้น

4. **ไม่ทำ over-engineering**
   - ❌ Complex state management
   - ❌ Unnecessary abstractions
   - ✅ Keep it simple

</div>

---

## 📝 Code Quality Standards

<div class="glass-highlight">

### Code Review Checklist

**Component Structure**:
- [ ] ใช้ React.forwardRef
- [ ] Export ทั้ง component และ variants
- [ ] Props มี TypeScript types (ถ้ามี)
- [ ] displayName ถูกตั้งค่า

**Styling**:
- [ ] ใช้ Tailwind classes only
- [ ] ใช้ `cn()` utility
- [ ] Responsive design (sm, md, lg, xl)
- [ ] Dark mode support

**Accessibility**:
- [ ] ARIA labels ครบ
- [ ] Keyboard navigation working
- [ ] Focus indicators visible
- [ ] Screen reader compatible

**Performance**:
- [ ] ไม่มี unnecessary re-renders
- [ ] Memoization ที่จำเป็น
- [ ] Lazy loading ที่เหมาะสม

</div>

---

## 🧪 Testing Strategy

<div class="glass-card">

### Manual Testing Checklist

**Visual Testing**:
- [ ] Component แสดงผลถูกต้อง
- [ ] Responsive ทุก breakpoints
- [ ] Dark mode ทำงาน
- [ ] Hover states ถูกต้อง

**Functional Testing**:
- [ ] onClick handlers ทำงาน
- [ ] Form inputs บันทึกค่า
- [ ] Validation ทำงาน
- [ ] Error states แสดงผล

**Accessibility Testing**:
- [ ] Tab navigation ทำงาน
- [ ] Screen reader อ่านได้
- [ ] Contrast ratios ผ่าน WCAG AA
- [ ] Focus indicators visible

**Performance Testing**:
- [ ] Render time < 100ms
- [ ] No layout shifts
- [ ] Smooth transitions (60fps)

</div>

---

## 📚 Documentation Requirements

<div class="notification glass-notif">

**ทุก component ต้องมี documentation**

</div>

### Component Documentation Template

```markdown
# MinimalCard

## Description
Simple card component with border and subtle shadow.

## Usage

\`\`\`jsx
import {
  MinimalCard,
  MinimalCardHeader,
  MinimalCardTitle,
  MinimalCardContent,
} from "@/components/ui/minimal-card"

function Example() {
  return (
    <MinimalCard>
      <MinimalCardHeader>
        <MinimalCardTitle>Card Title</MinimalCardTitle>
      </MinimalCardHeader>
      <MinimalCardContent>
        <p>Card content goes here.</p>
      </MinimalCardContent>
    </MinimalCard>
  )
}
\`\`\`

## Props

### MinimalCard
- `className` (string, optional): Additional CSS classes
- `...props`: All div props

## Variants
- Default: White background with border

## Accessibility
- Uses semantic HTML (`<div>`)
- Supports all ARIA attributes

## Examples
[Link to Storybook or live examples]
```

---

## 🎯 Success Criteria (Phase 1)

<div class="page-panel glass-card">

### Technical Metrics

**Code Quality**:
- [ ] ESLint: 0 errors, 0 warnings
- [ ] Components: 20+ created
- [ ] Coverage: 80%+ (if tests exist)
- [ ] Bundle size: < 500KB (components only)

**Performance**:
- [ ] First Paint: < 1s
- [ ] Component render: < 100ms
- [ ] Transitions: 60fps
- [ ] No layout shifts (CLS = 0)

**Accessibility**:
- [ ] WCAG AA: 100% compliance
- [ ] Keyboard navigation: Full support
- [ ] Screen reader: Compatible
- [ ] Contrast ratios: Pass all

**Functionality**:
- [ ] All core pages working
- [ ] Forms functional
- [ ] Data display correct
- [ ] Navigation working
- [ ] Responsive design complete

</div>

---

## 📅 Timeline Summary (Phase 1 Only)

<div class="glass-card">

### Total Time: ~30 hours

**Week 1: Core Components (8h)**
- Day 1-2: Card, Button, Input (6h)
- Day 3: Select, Checkbox, Label (2h)

**Week 2: Forms & Feedback (8h)**
- Day 1: Textarea, Radio, Switch (3h)
- Day 2: Toast, Alert, Badge (3h)
- Day 3: Testing & fixes (2h)

**Week 3: Data Display (8h)**
- Day 1: Table, Dialog (4h)
- Day 2: Dropdown, Tooltip, Avatar (3h)
- Day 3: Progress, testing (1h)

**Week 4: Integration & Polish (6h)**
- Day 1: Tabs, Accordion, Separator (3h)
- Day 2: Loading states (1h)
- Day 3: Final testing (1h)
- Day 4: Documentation (1h)

</div>

---

## 🚀 Next Steps (After Phase 1)

<div class="glass-highlight">

**Phase 2: Glass Morphism Theme (v0.7.0)**

เมื่อ Minimal Theme เสร็จสมบูรณ์และทดสอบแล้ว จะเริ่ม:
1. สร้าง Theme Toggle System
2. พัฒนา Glass Components
3. เพิ่ม Framer Motion animations
4. เพิ่ม Backdrop blur effects
5. เพิ่ม Advanced motion effects

</div>

---

**Version**: 1.0.0-revised
**Created**: 2025-10-01
**Updated**: 2025-10-01
**For**: Q-Collector v0.6.0 - Minimal Theme Development
**Status**: 📝 Ready for Implementation

