# Q-Collector Frontend Framework v0.2

**เอกสารต้นแบบ Frontend Framework สำหรับ Form Builder Application**

## Project Overview

React-based Form Builder Framework with ShadCN UI components, 17 field types, modern design system, and Thai business integration. Framework นี้เป็นต้นแบบสำหรับการพัฒนาระบบ form builder ที่สมบูรณ์.

## Version Information

- **Version**: 0.2.0
- **Release Date**: 2025-09-29
- **Framework**: React 18 + ShadCN UI + Tailwind CSS
- **Target**: Thai Business Forms & Data Collection

## Development Environment

```bash
# Installation & Development
npm install          # Install dependencies
npm run dev          # Start development server (Port 3000)
npm run build        # Build for production
npm run lint         # Lint code
npx playwright test  # Run tests

# Development URLs
http://localhost:3000  # Main development server
http://localhost:3001  # Alternative port
```

## Architecture Overview

### 🏗️ **Core Application Structure**

```
Q-Collector Frontend Framework
├── 📱 MainFormApp (Navigation Hub)
├── 🎨 Form Builder System
├── 📊 Data Management Layer
├── ⚙️ Settings & Configuration
└── 🔧 UI Component Library
```

### 📁 **File Structure**

```
src/
├── components/
│   ├── MainFormApp.jsx              # 🧭 Main navigation & routing
│   ├── EnhancedFormBuilder.jsx      # 🎨 Form creation interface
│   ├── FormView.jsx                 # 📝 Form filling interface
│   ├── FormSubmissionList.jsx       # 📊 Data table & management
│   ├── FormListApp.jsx              # 📋 Form list & overview
│   ├── SettingsPage.jsx             # ⚙️ App configuration
│   └── ui/                          # 🧩 UI Component Library
│       ├── glass-card.jsx           # Glass morphism cards
│       ├── glass-button.jsx         # Interactive buttons
│       ├── glass-input.jsx          # Form inputs
│       ├── enhanced-toast.jsx       # Notification system
│       ├── alert.jsx                # Alert components
│       └── field-validation.jsx     # Form validation
├── services/
│   ├── DataService.js               # 💾 LocalStorage management
│   └── SubmissionService.js         # 📤 Form submission logic
├── utils/
│   └── cn.js                        # 🎨 Class name utilities
├── index.css                        # 🎨 Global styles & theme
└── App.jsx                          # 🌐 Root application
```

## Design System Framework

### 🎨 **Theme Architecture**

**Color Palette:**
```css
Primary: #f97316 (Orange)    # Main brand color
Secondary: #0a0a0a (Black)   # Dark theme base
Background: Dynamic          # Light/Dark adaptive
Accent: Orange variants      # Interactive elements
```

**Typography Scale:**
```css
Form Titles: 20px (text-xl)     # Page headers
Field Labels: 14px (text-sm)    # Standard inputs
Table Data: 12px (text-[12px])  # Data tables
Descriptions: 14px/16px         # Helper text
```

**Layout System:**
```css
Container: max-w-3xl mx-auto    # 768px max width
Padding: px-4 sm:px-6 lg:px-8   # Responsive spacing
Grid: 8px base unit             # Consistent spacing
Touch Targets: min-h-[44px]     # Accessibility
```

### 🧩 **Component System**

#### **Glass Morphism Components**
```jsx
// Glass containers with backdrop blur
<GlassCard className="glass-container">
  <GlassCardContent>
    Content with glass effect
  </GlassCardContent>
</GlassCard>

// Interactive glass buttons
<GlassButton variant="primary">
  Action Button
</GlassButton>

// Glass form inputs
<GlassInput
  label="Field Label"
  placeholder="Enter value"
  hasValidationError={boolean}
/>
```

#### **Enhanced UI Components**
```jsx
// Advanced toast notifications
import { useEnhancedToast } from './ui/enhanced-toast';
const toast = useEnhancedToast();
toast.success("Success message", {
  title: "Title",
  duration: 5000,
  action: { label: "Action", onClick: handler }
});

// Validation alerts
<ValidationErrorAlert
  errors={validationErrors}
  fieldList={formFields}
  onDismiss={handleDismiss}
/>
```

## Field Type System (17 Types)

### 📝 **Text Input Fields**
1. **short_answer** - Single line text input
2. **paragraph** - Multi-line textarea
3. **email** - Email validation input
4. **phone** - Thai phone format (XXX-XXX-XXXX)
5. **number** - Numeric input with validation
6. **url** - URL validation input

### 📁 **File Upload Fields**
7. **file_upload** - General file upload
8. **image_upload** - Image-specific upload

### 📅 **Date/Time Fields**
9. **date** - Thai date picker (DD/MM/YYYY)
10. **time** - Time input (HH:MM)
11. **datetime** - Combined date/time input

### 🎯 **Selection Fields**
12. **multiple_choice** - Radio, checkbox, dropdown, buttons
13. **rating** - Star rating system (1-5 stars)
14. **slider** - Range slider input

### 🌍 **Location Fields**
15. **lat_long** - GPS coordinates with browser geolocation
16. **province** - 77 Thai provinces dropdown
17. **factory** - 4 factory locations (บางปะอิน, ระยอง, สระบุรี, สงขลา)

### 🏭 **Factory Field - ShadCN UI Implementation**

```jsx
// Modern factory selection with ShadCN styling
<div className="grid grid-cols-2 gap-3">
  {factories.map((factory) => (
    <button
      type="button"
      className={`
        inline-flex items-center justify-center
        whitespace-nowrap rounded-md text-sm font-medium
        transition-colors focus-visible:outline-none
        focus-visible:ring-2 focus-visible:ring-ring
        h-10 px-4 py-2 w-full min-h-[3rem]
        border-2
        ${isSelected
          ? 'bg-white text-orange-600 border-orange-600 shadow-lg'
          : 'border-input bg-background hover:bg-orange-50'
        }
      `}
    >
      <div className="flex items-center gap-2">
        {isSelected && <CheckIcon className="w-4 h-4 text-orange-600" />}
        <span className="font-medium">{factory}</span>
      </div>
    </button>
  ))}
</div>
```

## Page Layout Patterns

### 📋 **Form List Page (Reference Standard)**
```jsx
// Perfect responsive layout pattern
<div className="min-h-screen bg-gradient-to-br from-background">
  <div className="container-responsive px-4 sm:px-6 lg:px-8">
    <motion.div className="max-w-4xl mx-auto">
      <GlassCard className="glass-container">
        <div className="p-6">
          {/* 2x2 grid on desktop, single column on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {forms.map(form => (
              <FormCard key={form.id} form={form} />
            ))}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  </div>
</div>
```

### 📝 **Form View Page (Data Entry)**
```jsx
// Centered single-column layout
<div className="min-h-screen bg-gradient-to-br from-background">
  <div className="container-responsive px-4 sm:px-6 lg:px-8 py-2 sm:py-3">
    <div className="max-w-3xl mx-auto">
      {/* Form header outside container */}
      <motion.div className="mb-6">
        <h1 className="text-xl font-bold text-primary">{form.title}</h1>
        <p className="text-sm text-muted-foreground">{form.description}</p>
      </motion.div>

      {/* Form fields container */}
      <GlassCard className="glass-container">
        <div className="p-4">
          <div className="space-y-4 sm:space-y-6">
            {form.fields.map(field => renderField(field))}
          </div>
        </div>
      </GlassCard>
    </div>
  </div>
</div>
```

### 📊 **Data Table Pattern (Submission List)**
```jsx
// Responsive table with fixed 12px font
<div className="overflow-x-auto">
  <table className="w-full">
    <thead className="text-[12px] font-semibold text-muted-foreground">
      <tr>
        {displayFields.map(field => (
          <th key={field.id} className="p-2 text-center border-b">
            {field.title}
          </th>
        ))}
      </tr>
    </thead>
    <tbody className="text-[12px]">
      {submissions.map(submission => (
        <tr
          key={submission.id}
          className="hover:bg-gradient-to-r hover:from-orange-500/10
                     hover:to-orange-600/5 transition-all duration-200
                     hover:scale-[1.01] cursor-pointer"
        >
          {displayFields.map(field => (
            <td key={field.id} className="p-2 text-center border-b">
              {renderFieldValue(submission.data[field.id], field)}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

## State Management Architecture

### 🗃️ **Data Layer**

```javascript
// LocalStorage Service Pattern
class DataService {
  static getForm(id) { /* Get form by ID */ }
  static saveForm(form) { /* Save form data */ }
  static deleteForm(id) { /* Delete form */ }
  static getAllForms() { /* Get all forms */ }
  static getSubmission(id) { /* Get submission */ }
  static saveSubmission(submission) { /* Save submission */ }
  static getAllSubmissions(formId) { /* Get form submissions */ }
}

// Form State Management
const [formData, setFormData] = useState({});
const [fieldErrors, setFieldErrors] = useState({});
const [fieldTouched, setFieldTouched] = useState({});

// Optimized handlers with useCallback
const handleInputChange = useCallback((fieldId, value) => {
  setFormData(prev => ({ ...prev, [fieldId]: value }));
  // Validation logic
}, [dependencies]);
```

### 🔔 **Notification System**

```javascript
// Enhanced Toast Notifications
const toast = useEnhancedToast();

// Success notifications
toast.success("Form saved successfully", {
  title: "Success",
  duration: 5000,
  action: {
    label: "View Form",
    onClick: () => navigate('/forms')
  }
});

// Error notifications with details
toast.error("Validation failed", {
  title: "Form Error",
  duration: 8000,
  action: {
    label: "Fix Issues",
    onClick: () => scrollToFirstError()
  }
});

// Loading states
const loadingId = toast.loading("Saving form...", { persistent: true });
// Later: toast.dismiss(loadingId);
```

## Validation Framework

### ✅ **Field Validation Rules**

```javascript
const validateField = (field, value) => {
  // Empty value check
  if (field.required && isEmpty(value)) {
    return 'ฟิลด์นี้จำเป็นต้องกรอก';
  }

  // Type-specific validation
  switch (field.type) {
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ? '' : 'รูปแบบอีเมลไม่ถูกต้อง';

    case 'phone':
      const digits = value.replace(/\D/g, '');
      return digits.length === 10
        ? '' : 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (ต้องการ 10 หลัก)';

    case 'lat_long':
      return (value?.lat && value?.lng)
        ? '' : 'กรุณาเลือกตำแหน่งให้ครบถ้วน';
  }
};

// Form-level validation
const validateAllFields = () => {
  const errors = {};
  form.fields.forEach(field => {
    const error = validateField(field, formData[field.id]);
    if (error) errors[field.id] = error;
  });
  return Object.keys(errors).length === 0;
};
```

## Business Logic Integration

### 📤 **Form Submission Workflow**

```javascript
const handleSubmit = async () => {
  // 1. Validate all fields
  if (!validateAllFields()) {
    toast.error("Please fix validation errors");
    return;
  }

  // 2. Submit form data
  const result = await submissionService.submitForm(
    formId,
    formData,
    uploadedFiles
  );

  // 3. Handle result
  if (result.success) {
    toast.success("Form submitted successfully");
    // Trigger Telegram notification if configured
    await sendTelegramNotification(result.submission);
  } else {
    toast.error(result.message);
  }
};
```

### 📱 **Telegram Integration**

```javascript
// Telegram notification for form submissions
const sendTelegramNotification = async (submission) => {
  const settings = getAppSettings();
  if (settings.telegramEnabled) {
    const message = formatTelegramMessage(submission);
    await sendToTelegram(settings.botToken, settings.groupId, message);
  }
};
```

### 📋 **Document Numbering System**

```javascript
// Auto-generated document numbers
const generateDocumentNumber = (settings) => {
  const year = settings.useThaiYear
    ? new Date().getFullYear() + 543  // พ.ศ.
    : new Date().getFullYear();       // ค.ศ.

  const number = getNextSequenceNumber(year);

  return settings.yearFirst
    ? `${settings.prefix}-${year}/${number.toString().padStart(4, '0')}`
    : `${settings.prefix}-${number.toString().padStart(4, '0')}/${year}`;
};
```

## Performance & Optimization

### ⚡ **React Performance Patterns**

```javascript
// Memoized components for expensive operations
const FieldRenderer = React.memo(({ field, value, onChange }) => {
  return renderField(field, value, onChange);
});

// Optimized state updates
const handleInputChange = useCallback((fieldId, value) => {
  setFormData(prev => ({ ...prev, [fieldId]: value }));
}, []);

// Lazy loading for large forms
const LazyFormBuilder = lazy(() => import('./EnhancedFormBuilder'));
```

### 🎨 **Animation Performance**

```javascript
// 60fps animations with Framer Motion
const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      duration: 0.6
    }
  }
};

// Hardware-accelerated transforms
className="transform-gpu will-change-transform
           hover:scale-[1.02] transition-all duration-300"
```

## Accessibility Standards

### ♿ **WCAG 2.1 AA Compliance**

```jsx
// Proper ARIA labels and roles
<button
  type="button"
  aria-pressed={isSelected}
  aria-label={`Select ${factory} factory`}
  className="focus-visible:ring-2 focus-visible:ring-ring"
>
  {factory}
</button>

// Screen reader support
<div role="alert" aria-live="polite">
  {validationError}
</div>

// Keyboard navigation
<input
  onKeyDown={(e) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') handleCancel();
  }}
/>
```

## Mobile-First Responsive Design

### 📱 **Breakpoint Strategy**

```css
/* Mobile First Design */
.container-responsive {
  @apply px-4 py-2;           /* Mobile: 320px+ */
  @apply sm:px-6 sm:py-3;     /* Small: 576px+ */
  @apply lg:px-8;             /* Large: 1024px+ */
  @apply xl:px-12;            /* XL: 1280px+ */
  @apply 2xl:px-16;           /* 2XL: 1536px+ */
}

/* Grid System */
.form-grid {
  @apply grid grid-cols-1;    /* Mobile: single column */
  @apply md:grid-cols-2;      /* Desktop: 2 columns */
  @apply gap-3 md:gap-4;      /* Responsive gaps */
}
```

### 📐 **Touch Target Standards**

```css
/* Minimum 44px touch targets */
.touch-target {
  @apply min-h-[44px] min-w-[44px];
  @apply p-2 sm:p-3;
  @apply text-sm sm:text-base;
}
```

## Development Guidelines

### 🔧 **Adding New Field Types**

1. **Define Field Type**
```javascript
// Add to FIELD_TYPES array
const FIELD_TYPES = [
  // ... existing types
  {
    id: 'new_field_type',
    name: 'New Field Type',
    icon: 'icon-name',
    category: 'selection'
  }
];
```

2. **Create Field Renderer**
```javascript
// Add case in renderField function
case 'new_field_type':
  return (
    <div key={field.id} className="space-y-3">
      <label className="text-sm font-medium">
        {field.title}
        {field.required && <span className="text-destructive">*</span>}
      </label>
      {/* Field implementation */}
    </div>
  );
```

3. **Add Validation**
```javascript
// Add validation logic
case 'new_field_type':
  return validateNewFieldType(value);
```

### 🎨 **Component Development Standards**

```jsx
// Component template
import React from 'react';
import { cn } from '../../utils/cn';

const NewComponent = React.forwardRef(({
  className,
  children,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn(
      "base-styles",
      "responsive-styles",
      "state-styles",
      className
    )}
    {...props}
  >
    {children}
  </div>
));

NewComponent.displayName = "NewComponent";
export { NewComponent };
```

## Quality Assurance

### ✅ **Testing Strategy**

```javascript
// Component testing with React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';
import { FactoryField } from './FactoryField';

test('factory field selection works correctly', () => {
  render(<FactoryField value="" onChange={mockOnChange} />);

  fireEvent.click(screen.getByText('บางปะอิน'));
  expect(mockOnChange).toHaveBeenCalledWith('บางปะอิน');
});

// E2E testing with Playwright
test('complete form submission flow', async ({ page }) => {
  await page.goto('/forms/new');
  await page.fill('[data-testid="form-title"]', 'Test Form');
  await page.click('[data-testid="submit-button"]');
  await expect(page.locator('.toast-success')).toBeVisible();
});
```

### 🔍 **Code Quality Standards**

```javascript
// ESLint configuration
{
  "extends": [
    "react-app",
    "react-app/jest"
  ],
  "rules": {
    "react-hooks/exhaustive-deps": "warn",
    "no-unused-vars": "error",
    "prefer-const": "error"
  }
}

// Performance monitoring
const performanceMonitor = () => {
  const navigation = performance.getEntriesByType('navigation')[0];
  console.log('Page load time:', navigation.loadEventEnd - navigation.loadEventStart);
};
```

## Future Roadmap & Backend Integration

### 🗄️ **Planned Backend Architecture**

```yaml
# Docker Stack (Next Phase)
services:
  postgresql:
    image: postgres:15
    environment:
      POSTGRES_DB: q_collector
      POSTGRES_USER: app_user
      POSTGRES_PASSWORD: secure_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  minio:
    image: minio/minio:latest
    environment:
      MINIO_ROOT_USER: admin
      MINIO_ROOT_PASSWORD: admin_password
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
```

### 🔌 **API Integration Points**

```javascript
// API Service Layer (Planned)
class APIService {
  static async createForm(formData) {
    return await fetch('/api/forms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
  }

  static async uploadFile(file, fieldId) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fieldId', fieldId);

    return await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
  }

  static async submitForm(formId, data) {
    return await fetch(`/api/forms/${formId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }
}
```

---

## Version 0.2 Summary

**Framework Status**: ✅ Production-ready frontend framework with comprehensive design system, 17 field types, and modern ShadCN UI components.

**Key Achievements**:
- Complete form builder with drag-and-drop interface
- 17 field types including Thai-specific fields
- ShadCN UI component system with orange theme
- Responsive mobile-first design
- Glass morphism effects and animations
- Comprehensive validation system
- Enhanced notification system
- LocalStorage data persistence
- Telegram integration ready
- Accessibility compliance (WCAG 2.1 AA)

**Next Phase**: Backend development with PostgreSQL, MinIO, and Redis integration.

**Framework License**: Internal use - Q-Collector Form Builder Framework v0.2