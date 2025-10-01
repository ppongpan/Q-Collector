# Q-Collector Minimal Theme Implementation Plan

<div class="glass-card">

## 🎨 Mission: Create Minimal Theme Option for Q-Collector v0.5.4

**Goal**: พัฒนา UI theme แบบ minimal และ clean เป็นตัวเลือกเพิ่มจาก glass morphism ปัจจุบัน โดยคงฟังก์ชันการทำงาน 100% และความสม่ำเสมอทั่วทุกหน้า

**Approach**: Theme Toggle System (Recommended) ✅

</div>

---

## 📊 Strategic Decision: Theme Toggle vs Separate Frontend

<div class="glass-card">

### Option 1: Theme Toggle System (✅ RECOMMENDED)

<div class="glass-highlight">

**Advantages**:

- ✅ Single codebase - บำรุงรักษาง่ายกว่า
- ✅ สลับ theme ทันทีโดยไม่ต้อง reload
- ✅ บันทึกความชอบของผู้ใช้ (localStorage/backend)
- ✅ Data/logic layer เดียวกัน
- ✅ ใช้ component base ร่วมกันพร้อม theme variants
- ✅ เหมาะสำหรับการเพิ่ม theme ในอนาคต
- ✅ ลด code duplication
- ✅ Testing และ bug fixes ง่ายกว่า

</div>

**Implementation**:

```javascript
// Theme Context
const ThemeContext = {
  current: 'glass' | 'minimal',
  toggle: () => switchTheme(),
  components: {
    glass: GlassCard,
    minimal: MinimalCard,
  },
};
```

### Option 2: Separate Frontend (❌ NOT RECOMMENDED)

**Disadvantages**:

- ❌ Code duplication (บำรุงรักษา 2 เท่า)
- ❌ แก้ bug ต้องทำ 2 ครั้ง
- ❌ Feature updates ต้อง implement ซ้ำ
- ❌ Testing complexity เพิ่มขึ้นเป็นสองเท่า
- ❌ Deployment ซับซ้อนขึ้น
- ❌ ความเสี่ยงที่จะไม่สอดคล้องกันสูง
- ❌ ใช้ storage/bandwidth มากขึ้น

**Verdict**: **Theme Toggle System** เหมาะสมกว่าสำหรับกรณีนี้

</div>

---

## 🎯 Phase 0: Analysis & Design System

<div class="glass-container">

### 0.1 Current System Analysis ✅

<div class="notification glass-notif">

**Agent**: Manual Analysis
**Priority**: CRITICAL
**Time**: 2 hours

</div>

#### Current UI Components (48 components identified)

<div class="minimal-card">

```
Glass Morphism Components:
- glass-card.jsx (base container)
- glass-button.jsx (actions)
- glass-input.jsx (form fields)
- animated-glass-*.jsx (enhanced versions)
- glass-nav.jsx (navigation)
- glass-tooltip.jsx (tooltips)
- glass-loading.jsx (loading states)

Form Components:
- field-*.jsx (15 field-related components)
- form-builder components
- submission components

UI Primitives:
- button.jsx, alert.jsx, badge.jsx
- dropdown-menu.jsx, tooltip.jsx
- slider.jsx, progress.jsx
- avatar.jsx, separator.jsx
```

</div>

#### Current Design System

<div class="glass-card">

```css
Glass Morphism Features:
- backdrop-blur-md (24px blur)
- rgba backgrounds with transparency
- border: 1px solid with opacity
- box-shadow: 0 8px 32px rgba(0,0,0,0.12)
- gradient effects
- animation: glass-in

Colors (HSL):
- Primary: 24 95% 45% (Orange)
- Background: 0 0% 100% (White)
- Foreground: 222.2 84% 2% (Dark)
- Border: 214.3 31.8% 85% (Light Gray)
```

</div>

**Success Criteria**:

- ✅ All 48 UI components documented
- ✅ Current theme system mapped
- ✅ Design tokens extracted
- ✅ Component dependencies identified

</div>

---

### 0.2 Minimal Theme Design Specification

<div class="glass-card">

**Agent**: Manual Design
**Priority**: CRITICAL
**Time**: 3 hours

#### Minimal Theme Principles

<div class="app-grid">

1. **Simplicity**: ไม่ใช้ blur, transparency, animations
2. **Performance**: Render เร็วขึ้น, CSS น้อยลง
3. **Clarity**: Contrast สูง, ขอบชัดเจน
4. **Accessibility**: ปฏิบัติตาม WCAG AAA ที่เป็นไปได้
5. **Consistency**: Spacing, typography, colors เป็นหนึ่งเดียว

</div>

#### Design Specifications

##### Color System (Minimal)

<div class="glass-highlight">

```css
:root[data-theme='minimal'] {
  /* Base Colors - Higher Contrast */
  --background: 0 0% 98%; /* Light gray background */
  --foreground: 0 0% 5%; /* Near black text */
  --card: 0 0% 100%; /* Pure white cards */
  --card-foreground: 0 0% 5%; /* Near black on cards */

  /* Primary (Orange) - Same as glass theme */
  --primary: 24 95% 45%;
  --primary-foreground: 0 0% 100%;

  /* Borders - Solid, visible */
  --border: 0 0% 85%; /* Medium gray border */
  --input: 0 0% 95%; /* Light gray input bg */

  /* Shadows - Subtle, flat */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 2px 4px 0 rgb(0 0 0 / 0.08);
  --shadow-none: none;
}

:root[data-theme='minimal'].dark {
  --background: 0 0% 8%;
  --foreground: 0 0% 95%;
  --card: 0 0% 12%;
  --card-foreground: 0 0% 95%;
  --border: 0 0% 25%;
}
```

</div>

##### Component Styles (Minimal)

```css
/* Card - Flat, bordered */
.minimal-card {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  /* NO blur, NO transparency, NO animations */
}

/* Button - Solid, clear */
.minimal-button {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  font-weight: 500;
  /* NO gradients, NO glow effects */
}

/* Input - Simple, functional */
.minimal-input {
  background: hsl(var(--input));
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  padding: 8px 12px;
  /* NO glass effects */
}
```

##### Typography Scale (Same as glass)

```css
--font-size-xs: 0.75rem; /* 12px */
--font-size-sm: 0.875rem; /* 14px */
--font-size-base: 1rem; /* 16px */
--font-size-lg: 1.125rem; /* 18px */
--font-size-xl: 1.25rem; /* 20px */
--font-size-2xl: 1.5rem; /* 24px */
```

##### Spacing System (8px grid - Same)

```css
--spacing-1: 0.25rem; /* 4px */
--spacing-2: 0.5rem; /* 8px */
--spacing-3: 0.75rem; /* 12px */
--spacing-4: 1rem; /* 16px */
--spacing-6: 1.5rem; /* 24px */
--spacing-8: 2rem; /* 32px */
```

**Success Criteria**:

- ✅ Complete minimal theme CSS written
- ✅ Design tokens defined
- ✅ Component variants designed
- ✅ Dark mode variants ready
- ✅ Accessibility compliance verified (WCAG AA minimum)

</div>

---

## 🏗️ Phase 1: Theme Infrastructure

<div class="page-panel glass-card">

### 1.1 Theme Context & Provider

<div class="notification glass-notif">

**Agent**: `general-purpose`
**Priority**: CRITICAL
**Time**: 3 hours

</div>

#### Tasks

**1.1.1 Create Theme Context**

- [ ] สร้าง `src/contexts/ThemeContext.jsx`
  ```javascript
  const ThemeContext = {
    theme: 'glass' | 'minimal',
    setTheme: (theme) => {},
    isDarkMode: boolean,
    toggleDarkMode: () => {},
    components: {
      /* theme-specific components */
    },
  };
  ```
- [ ] Implement localStorage persistence
- [ ] เพิ่ม theme detection (system preference)
- [ ] เพิ่ม theme transition effects

**1.1.2 Create Theme Service**

- [ ] สร้าง `src/services/ThemeService.js`
  - saveThemePreference(userId, theme)
  - loadThemePreference(userId)
  - applyThemeToDOM(theme)
  - getAvailableThemes()

**1.1.3 Create Theme Configuration**

- [ ] สร้าง `src/config/themes.js`
  ```javascript
  export const themes = {
    glass: {
      name: 'Glass Morphism',
      description: 'Modern glass effects with blur and transparency',
      components: {
        /* glass components */
      },
      css: 'glass-theme.css',
    },
    minimal: {
      name: 'Minimal',
      description: 'Clean, fast, and simple design',
      components: {
        /* minimal components */
      },
      css: 'minimal-theme.css',
    },
  };
  ```

**Success Criteria**:

- ✅ Theme context working
- ✅ Theme persistence in localStorage
- ✅ Theme switching instant (no reload)
- ✅ Dark mode support for both themes

**Testing**:

```bash
# Test theme switching
1. Login → Settings → Change theme to Minimal
2. Verify all pages update instantly
3. Reload → Verify theme persists
4. Toggle dark mode → Verify both themes support it
```

</div>

---

### 1.2 Minimal Theme CSS

<div class="glass-card">

**Agent**: `theme-system`
**Priority**: CRITICAL
**Time**: 4 hours

#### Tasks

**1.2.1 Create Minimal Theme Stylesheet**

- [ ] สร้าง `src/styles/minimal-theme.css`
  - Import base CSS variables
  - Override glass morphism styles
  - Define minimal component styles
  - Add dark mode variants

**1.2.2 Create Theme-Specific Variables**

- [ ] อัพเดท `src/index.css`

  ```css
  /* Add theme attribute selector */
  [data-theme='minimal'] {
    /* Minimal theme variables */
  }

  [data-theme='glass'] {
    /* Glass theme variables */
  }
  ```

**1.2.3 Create Component Style Overrides**

- [ ] Minimal card styles (flat, bordered)
- [ ] Minimal button styles (solid, no glow)
- [ ] Minimal input styles (simple borders)
- [ ] Minimal navigation styles
- [ ] Minimal modal/dialog styles
- [ ] Minimal loading states

**Success Criteria**:

- ✅ Minimal theme CSS complete
- ✅ ไม่มี forced inline styles
- ✅ Styles ทั้งหมดอยู่ใน CSS files
- ✅ Theme switching อัพเดท styles ทั้งหมด
- ✅ ไม่มี flash of unstyled content (FOUC)

</div>

---

## 🧩 Phase 2: Minimal UI Components

<div class="glass-container">

### 2.1 Core Minimal Components (ShadCN UI Based)

<div class="glass-card">

**Agent**: `component-upgrade`
**Priority**: HIGH
**Time**: 6 hours

#### Tasks

**2.1.1 Create Minimal Card Component**

- [ ] สร้าง `src/components/ui/minimal/minimal-card.jsx`

  ```jsx
  // Based on ShadCN UI Card
  import { Card } from '../card';

  export function MinimalCard({ children, ...props }) {
    return (
      <Card
        className="minimal-card border shadow-sm hover:shadow-md transition-shadow"
        {...props}
      >
        {children}
      </Card>
    );
  }
  ```

- [ ] MinimalCardHeader
- [ ] MinimalCardTitle
- [ ] MinimalCardDescription
- [ ] MinimalCardContent
- [ ] MinimalCardFooter

**2.1.2 Create Minimal Button Component**

- [ ] สร้าง `src/components/ui/minimal/minimal-button.jsx`
- [ ] Variants: default, primary, secondary, outline, ghost, destructive
- [ ] Sizes: xs, sm, md, lg, xl

**2.1.3 Create Minimal Input Components**

- [ ] สร้าง `src/components/ui/minimal/minimal-input.jsx`
- [ ] MinimalTextarea
- [ ] MinimalSelect
- [ ] MinimalCheckbox
- [ ] MinimalRadio
- [ ] MinimalSwitch

**2.1.4 Create Minimal Form Components**

- [ ] MinimalLabel
- [ ] MinimalFormField
- [ ] MinimalFormMessage
- [ ] MinimalFormDescription

**Success Criteria**:

- ✅ สร้าง core components ทั้งหมด
- ✅ รักษาความเข้ากันได้กับ ShadCN UI
- ✅ Styling สม่ำเสมอทั่วทุก components
- ✅ Props API ตรงกับ glass components
- ✅ TypeScript types (ถ้ามี)

</div>

---

### 2.2 Specialized Minimal Components

<div class="glass-card">

**Agent**: `component-upgrade`
**Priority**: HIGH
**Time**: 8 hours

#### Tasks

**2.2.1 Form Builder Components (Minimal)**

- [ ] MinimalFieldCard (แทน glass-card ใน fields)
- [ ] MinimalFieldOptions (clean dropdown)
- [ ] MinimalFieldPreview (simple card)
- [ ] MinimalDragHandle (subtle icon)

**2.2.2 Data Display Components (Minimal)**

- [ ] MinimalTable (clean table with hover)
- [ ] MinimalBadge (flat badges)
- [ ] MinimalAvatar (simple circle)
- [ ] MinimalTooltip (flat tooltip)

**2.2.3 Navigation Components (Minimal)**

- [ ] MinimalNav (flat navbar)
- [ ] MinimalMenu (simple dropdown)
- [ ] MinimalBreadcrumb (clean breadcrumb)
- [ ] MinimalPagination (simple pagination)

**2.2.4 Feedback Components (Minimal)**

- [ ] MinimalToast (flat notifications)
- [ ] MinimalAlert (bordered alerts)
- [ ] MinimalModal (simple modal)
- [ ] MinimalLoading (simple spinner)

**Success Criteria**:

- ✅ สร้าง specialized components 20+ ตัว
- ✅ ตรงตาม minimal theme design ทั้งหมด
- ✅ Feature parity กับ glass components
- ✅ Performance optimized (ไม่มี heavy animations)

</div>

</div>

---

## 🔄 Phase 3: Component Integration

<div class="glass-container">

### 3.1 Create Theme Component Mapper

<div class="glass-card">

**Agent**: `general-purpose`
**Priority**: HIGH
**Time**: 4 hours

#### Tasks

**3.1.1 Create Component Mapper Utility**

- [ ] สร้าง `src/utils/themeComponents.js`

  ```javascript
  import * as GlassComponents from '../components/ui/glass';
  import * as MinimalComponents from '../components/ui/minimal';

  export const getThemedComponents = (theme) => {
    return theme === 'minimal' ? MinimalComponents : GlassComponents;
  };

  // Usage in components:
  const { Card, Button, Input } = useThemedComponents();
  ```

**3.1.2 Create Theme Hook**

- [ ] สร้าง `src/hooks/useThemedComponents.js`
  ```javascript
  export const useThemedComponents = () => {
    const { theme } = useTheme();
    return useMemo(() => getThemedComponents(theme), [theme]);
  };
  ```

**3.1.3 Create Theme-Aware Wrapper HOC**

- [ ] สร้าง `src/hoc/withTheme.jsx`
  ```javascript
  export const withTheme = (Component) => {
    return (props) => {
      const components = useThemedComponents();
      return <Component {...props} components={components} />;
    };
  };
  ```

**Success Criteria**:

- ✅ Component mapper ทำงาน
- ✅ Theme hook ใช้งานได้
- ✅ HOC wrap components ถูกต้อง
- ✅ ไม่มี prop type errors

</div>

---

### 3.2 Update Core Application Components

<div class="glass-card">

**Agent**: `component-upgrade` + `general-purpose`
**Priority**: HIGH
**Time**: 12 hours

#### Tasks

**3.2.1 Update Form Builder**

- [ ] อัพเดท `EnhancedFormBuilder.jsx`
  - แทน GlassCard ด้วย themed Card
  - แทน GlassButton ด้วย themed Button
  - แทน GlassInput ด้วย themed Input
  - อัพเดท drag-and-drop styling
  - อัพเดท field cards
  - อัพเดท field settings panels

**3.2.2 Update Form View**

- [ ] อัพเดท `FormView.jsx`
  - แทน glass components ด้วย themed
  - อัพเดท field rendering
  - อัพเดท validation error display
  - อัพเดท file upload UI
  - อัพเดท progress indicators

**3.2.3 Update Submission List**

- [ ] อัพเดท `FormSubmissionList.jsx`
  - แทน glass components
  - อัพเดท table styling
  - อัพเดท action buttons
  - อัพเดท filters

**3.2.4 Update Detail Views**

- [ ] อัพเดท `SubmissionDetail.jsx`

  - แทน glass components
  - อัพเดท field value display
  - อัพเดท navigation arrows
  - อัพเดท floating action button

- [ ] อัพเดท `SubFormDetail.jsx`
  - Same updates as SubmissionDetail

**3.2.5 Update Settings Page**

- [ ] อัพเดท `SettingsPage.jsx`
  - เพิ่ม theme selector component
  - แทน glass components
  - อัพเดท settings panels
  - เพิ่ม theme preview

**3.2.6 Update Authentication Pages**

- [ ] อัพเดท `LoginPage.jsx`

  - แทน glass components
  - อัพเดท form styling
  - อัพเดท logo display

- [ ] อัพเดท `TwoFactorVerification.jsx`
  - แทน glass components
  - อัพเดท 6-digit input
  - อัพเดท trust device checkbox

**3.2.7 Update User Management**

- [ ] อัพเดท `UserManagement.jsx`
  - แทน glass components
  - อัพเดท user table
  - อัพเดท action buttons
  - อัพเดท 2FA management UI

**Success Criteria**:

- ✅ ทุกหน้ารองรับ both themes
- ✅ Theme switching ทำงานทุกหน้า
- ✅ ไม่มี visual glitches ตอนสลับ
- ✅ Functionality ทั้งหมดคงอยู่
- ✅ ไม่มี console errors

</div>

</div>

---

## ⚙️ Phase 4: Theme Settings UI

<div class="glass-card">

### 4.1 Theme Selector Component

**Agent**: `component-upgrade`
**Priority**: MEDIUM
**Time**: 3 hours

#### Tasks

**4.1.1 Create Theme Selector**

- [ ] สร้าง `src/components/settings/ThemeSelector.jsx`

**4.1.2 Create Theme Preview Component**

- [ ] Mini preview แสดง theme appearance
- [ ] Live preview window
- [ ] Sample components (button, card, input)

**4.1.3 Add Theme to Settings Page**

- [ ] เพิ่ม theme selector ไปที่ SettingsPage
- [ ] ตำแหน่ง: หลัง Storage Settings
- [ ] มองเห็นได้สำหรับ users ทุกคน
- [ ] บันทึก preference ไปยัง backend (ถ้า logged in)

**Success Criteria**:

- ✅ Theme selector มองเห็นใน Settings
- ✅ Preview แม่นยำสำหรับ both themes
- ✅ Instant switching ทำงาน
- ✅ Dark mode toggle ทำงาน
- ✅ Preference บันทึกและโหลด

</div>

---

## 🎨 Phase 5: Polish & Refinement

<div class="glass-container">

### 5.1 Animation & Transitions (Minimal)

<div class="glass-card">

**Agent**: `motion-effects`
**Priority**: LOW
**Time**: 3 hours

#### Tasks

**5.1.1 Add Minimal Theme Animations**

- [ ] Simple fade transitions (200ms)
- [ ] Subtle hover effects (scale: 1.02)
- [ ] Loading spinner (simple rotation)
- [ ] Page transitions (fade only)
- [ ] NO: Complex animations, blur effects, spring effects

**5.1.2 Optimize Animation Performance**

- [ ] ใช้ CSS transitions แทน JS
- [ ] ใช้ transform/opacity สำหรับ animations
- [ ] ปิด animations บน low-end devices
- [ ] ลด animation duration (เร็วขึ้น)

**Success Criteria**:

- ✅ Animations subtle และ fast
- ✅ ไม่มี janky animations
- ✅ รักษา 60fps
- ✅ Accessible (respects prefers-reduced-motion)

</div>

---

### 5.2 Accessibility Improvements

<div class="glass-card">

**Agent**: `component-upgrade`
**Priority**: HIGH
**Time**: 4 hours

#### Tasks

**5.2.1 Contrast Checks**

- [ ] Run WCAG contrast checker บน text ทั้งหมด
- [ ] ตรวจสอบ 4.5:1 ratio สำหรับ normal text
- [ ] ตรวจสอบ 3:1 ratio สำหรับ large text
- [ ] แก้ไข contrasts ที่ไม่ผ่าน

**5.2.2 Keyboard Navigation**

- [ ] Test tab order บนทุกหน้า
- [ ] ตรวจสอบ interactive elements ทั้งหมด focusable
- [ ] เพิ่ม visible focus indicators
- [ ] Test กับ screen reader

**5.2.3 ARIA Labels**

- [ ] เพิ่ม aria-labels ไปที่ icon buttons
- [ ] เพิ่ม role attributes ไปที่ custom components
- [ ] เพิ่ม live regions สำหรับ dynamic content
- [ ] Test กับ NVDA/JAWS

**Success Criteria**:

- ✅ WCAG AA compliance (minimum)
- ✅ WCAG AAA compliance (where possible)
- ✅ Keyboard navigation ทำงาน
- ✅ Screen reader compatible

</div>

</div>

---

## 🧪 Phase 6: Testing & Quality Assurance

<div class="glass-card">

### 6.1 Theme Switching Tests

**Agent**: `general-purpose`
**Priority**: HIGH
**Time**: 4 hours

#### Test Cases

**6.1.1 Functional Tests**

- [ ] Switch from Glass to Minimal (all pages)
- [ ] Switch from Minimal to Glass (all pages)
- [ ] Toggle dark mode in Glass theme
- [ ] Toggle dark mode in Minimal theme
- [ ] Save preference and reload
- [ ] Login/logout preserves theme
- [ ] Multiple browser tabs sync theme

**6.1.2 Visual Regression Tests**

- [ ] Screenshot all pages in Glass theme
- [ ] Screenshot all pages in Minimal theme
- [ ] Compare layouts (should match)
- [ ] Check responsive breakpoints
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)

**6.1.3 Performance Tests**

- [ ] Measure theme switch time (<100ms)
- [ ] Check CSS bundle size increase
- [ ] Test memory usage
- [ ] Test on low-end device

**Success Criteria**:

- ✅ All functional tests ผ่าน
- ✅ ไม่มี visual regressions
- ✅ Performance ยอมรับได้
- ✅ ทำงานบน browsers ที่รองรับทั้งหมด

</div>

---

## 📝 Phase 7: Documentation

<div class="glass-card">

### 7.1 Developer Documentation

**Agent**: `general-purpose`
**Priority**: MEDIUM
**Time**: 3 hours

#### Tasks

**7.1.1 Create Theme Development Guide**

- [ ] สร้าง `docs/THEME-DEVELOPMENT.md`
  - Theme architecture overview
  - วิธีเพิ่ม themes ใหม่
  - Component theming guidelines
  - CSS variable naming conventions
  - Testing checklist

**7.1.2 Update Component Documentation**

- [ ] Document theme prop สำหรับ each component
- [ ] เพิ่ม examples สำหรับ both themes
- [ ] Document theme context usage
- [ ] เพิ่ม troubleshooting section

**7.1.3 Update CLAUDE.md**

- [ ] เพิ่ม Theme System section
- [ ] Document available themes
- [ ] เพิ่ม theme switching instructions
- [ ] อัพเดท version เป็น 0.6.0

**Success Criteria**:

- ✅ Documentation สมบูรณ์
- ✅ Examples ชัดเจนและทำงาน
- ✅ ง่ายสำหรับ developers ในการเข้าใจ

</div>

---

## 🚀 Phase 8: Deployment

<div class="glass-card">

### 8.1 Final Testing

**Agent**: Manual Testing
**Priority**: CRITICAL
**Time**: 4 hours

#### Tasks

**8.1.1 End-to-End Testing**

- [ ] Complete user journey in Glass theme
- [ ] Complete user journey in Minimal theme
- [ ] Switch themes mid-workflow
- [ ] Test all form builder features
- [ ] Test all data entry features
- [ ] Test all reporting features

**8.1.2 Load Testing**

- [ ] Test กับ 100+ forms
- [ ] Test กับ 1000+ submissions
- [ ] Check theme switching performance under load
- [ ] Monitor memory usage

**8.1.3 Security Review**

- [ ] Check for XSS in theme settings
- [ ] Verify localStorage security
- [ ] Test theme injection attempts
- [ ] Verify no sensitive data in theme config

**Success Criteria**:

- ✅ All E2E tests ผ่าน
- ✅ Performance ยอมรับได้ under load
- ✅ ไม่มี security vulnerabilities
- ✅ พร้อมสำหรับ production

</div>

---

## 📊 Success Metrics

<div class="glass-highlight">

### Functional Metrics

- ✅ 100% feature parity between themes
- ✅ Theme switching < 100ms
- ✅ Zero visual glitches
- ✅ All components themed consistently

### Performance Metrics

- ✅ CSS bundle size increase < 50KB
- ✅ Theme switch ไม่ทำให้เกิด layout reflow
- ✅ Minimal theme render เร็วขึ้น 10-20% (เป้าหมาย)
- ✅ รักษา 60fps during transitions

### Quality Metrics

- ✅ WCAG AA compliance สำหรับ both themes
- ✅ ทำงานบน browsers ที่รองรับทั้งหมด
- ✅ Zero console errors in production
- ✅ User satisfaction > 90%

</div>

---

## 🛠️ Agent Allocation Strategy

<div class="page-panel glass-card">

### Primary Agents

**1. theme-system** (Theme Architecture)

- Phase 1.2: Minimal theme CSS
- Phase 5.1: Animation optimization
- Hours: 7

**2. component-upgrade** (UI Components)

- Phase 2.1: Core minimal components (6h)
- Phase 2.2: Specialized components (8h)
- Phase 3.2: Update application components (12h)
- Phase 4.1: Theme selector (3h)
- Phase 5.2: Accessibility improvements (4h)
- Hours: 33

**3. general-purpose** (Integration & Testing)

- Phase 1.1: Theme infrastructure (3h)
- Phase 3.1: Component mapper (4h)
- Phase 6.1: Testing (4h)
- Phase 7: Documentation (5h)
- Phase 8: Deployment (6h)
- Hours: 22

**4. motion-effects** (Animations)

- Phase 5.1: Minimal animations (3h)
- Hours: 3

### Parallel Execution Strategy

**Week 1: Foundation (Sequential)**

- Day 1-2: Phase 0 (Analysis & Design) - Manual
- Day 3: Phase 1.1 (Theme Infrastructure) - general-purpose
- Day 4: Phase 1.2 (Minimal CSS) - theme-system
- Day 5: Phase 2.1 (Core Components) - component-upgrade

**Week 2: Components (Parallel)**

- Day 1-3: Phase 2.2 (Specialized Components) - component-upgrade
- Day 4-5: Phase 3.1 (Component Mapper) - general-purpose

**Week 3: Integration (Parallel)**

- Day 1-5: Phase 3.2 (Update All Pages) - component-upgrade + general-purpose

**Week 4: Polish & Release (Mixed)**

- Day 1: Phase 4.1 (Theme Selector) - component-upgrade
- Day 2: Phase 5 (Polish) - motion-effects + component-upgrade
- Day 3-4: Phase 6 (Testing) - general-purpose + manual
- Day 5: Phase 7-8 (Docs & Deploy) - general-purpose

</div>

---

## 📅 Timeline Estimate

<div class="glass-card">

### Total Time: 65-75 hours

**Week 1: Foundation (15 hours)**

- Analysis & Design: 5 hours
- Theme Infrastructure: 3 hours
- Minimal CSS: 4 hours
- Core Components: 6 hours

**Week 2: Components (16 hours)**

- Specialized Components: 8 hours
- Component Mapper: 4 hours
- Testing: 4 hours

**Week 3: Integration (24 hours)**

- Update Form Builder: 4 hours
- Update Form View: 4 hours
- Update Submission Lists: 4 hours
- Update Detail Views: 4 hours
- Update Settings: 2 hours
- Update Auth Pages: 3 hours
- Update User Management: 3 hours

**Week 4: Polish & Release (20 hours)**

- Theme Selector: 3 hours
- Animations: 3 hours
- Accessibility: 4 hours
- Testing: 4 hours
- Documentation: 5 hours
- Deployment: 2 hours

</div>

---

<div class="notification glass-notif">

## 🎉 Current Status: Ready to Begin

**Phase 0 Complete**: Analysis & Design Specification ✅
**Next Action**: Phase 1.1 - Create Theme Infrastructure

**Ready to proceed?** ✅ YES

</div>

---

**Version**: 0.6.0-planning
**Created**: 2025-10-01
**Status**: 📝 Planning Complete - Ready for Implementation
**Priority**: THEME SYSTEM DEVELOPMENT

📖 ตัวอย่างการใช้จริง

Scenario 1: เริ่มงานวันใหม่

# Morning - Planning

เปิด qtodo.md
→ วันนี้ Week 1, Day 2
→ Tasks: สร้าง MinimalButton, MinimalInput

# Start Coding

เปิด THEME-AGENT-GUIDE.md
→ Section: MinimalButton Component
→ Copy code template
→ เขียนโค้ด

# Testing

กลับไป THEME-AGENT-GUIDE.md
→ Section: Testing Strategy
→ Run checklist

# Update Progress

กลับไป qtodo.md
→ ติ๊ก [✅] MinimalButton
→ ติ๊ก [✅] MinimalInput

Scenario 2: Code Review

# Reviewer เปิด THEME-AGENT-GUIDE.md

→ เช็ค Code Quality Standards
→ ดู DO's and DON'Ts
→ ตรวจสอบตาม checklist

# Update progress ใน qtodo.md

→ บันทึกว่า review เสร็จแล้ว

Scenario 3: Weekly Report

# เปิด qtodo.md

→ ดู timeline: Week 1 เสร็จแล้ว 6/6 tasks
→ Week 2 กำลังทำ 3/8 tasks
→ Summary progress: 35% complete

---

🎨 Structure Comparison

qtodo.md Structure:

📋 qtodo.md
├── Mission & Goals
├── Phase 0: Analysis ✅
├── Phase 1: Infrastructure
│ ├── 1.1 Theme Context (3h)
│ ├── 1.2 CSS (4h)
├── Phase 2: Components
│ ├── 2.1 Core (6h)
│ ├── 2.2 Specialized (8h)
├── Timeline (65-75h total)
└── Progress Status

THEME-AGENT-GUIDE.md Structure:

💻 THEME-AGENT-GUIDE.md
├── Design Principles
├── Color System
├── Typography & Spacing
├── Component Examples
│ ├── MinimalCard (code)
│ ├── MinimalButton (code)
│ ├── MinimalInput (code)
├── DO's and DON'Ts
├── Testing Checklist
└── Documentation Template

---

🚀 สรุป: Best Practice

ใช้ทั้งสองเอกสารร่วมกัน:

| เอกสาร               | เมื่อใช้           | ใช้บ่อยแค่ไหน      |
| -------------------- | ------------------ | ------------------ |
| qtodo.md             | Planning, tracking | ทุกวัน (เช้า-เย็น) |
| THEME-AGENT-GUIDE.md | Coding, reviewing  | ขณะเขียนโค้ด       |

Quick Reference:

- ❓ "ต้องทำอะไรต่อ?" → เปิด qtodo.md
- ❓ "เขียน component ยังไง?" → เปิด THEME-AGENT-GUIDE.md
- ❓ "เสร็จไปกี่ % แล้ว?" → เปิด qtodo.md
- ❓ "Color code อะไรเหรอ?" → เปิด THEME-AGENT-GUIDE.md
