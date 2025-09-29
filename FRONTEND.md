# Q-Collector Frontend Architecture Documentation v0.4

**Comprehensive Technical Documentation for Frontend System**

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Core Components](#core-components)
5. [UI Component Library](#ui-component-library)
6. [State Management](#state-management)
7. [Services Layer](#services-layer)
8. [Utilities & Helpers](#utilities--helpers)
9. [Feature Implementations](#feature-implementations)
10. [Design System](#design-system)
11. [Performance Optimizations](#performance-optimizations)
12. [Development Guidelines](#development-guidelines)

---

## System Overview

Q-Collector is a modern, production-ready React form builder framework designed for Thai business forms and data collection. The system provides a complete drag-and-drop interface for creating dynamic forms with 17 field types, conditional logic, and integrated Telegram notifications.

### Key Capabilities

- **Dynamic Form Builder**: Create forms with drag-and-drop interface
- **17 Field Types**: Comprehensive input types for various data collection needs
- **Conditional Visibility**: Formula-based field show/hide logic (AppSheet-compatible)
- **Sub-Forms**: Nested form structures with independent field management
- **Telegram Integration**: Custom notification system with field ordering
- **Real-time Validation**: Thai language support with immediate feedback
- **File Management**: Upload, preview, and manage files/images
- **Data Export**: LocalStorage-based persistence with export capabilities
- **Responsive Design**: Mobile-first with touch-optimized interactions

---

## Technology Stack

### Core Framework
```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-scripts": "^5.0.1"
}
```

### UI & Styling
```json
{
  "tailwindcss": "^3.3.0",
  "framer-motion": "^12.23.21",
  "@fortawesome/react-fontawesome": "^3.0.2",
  "@fortawesome/free-solid-svg-icons": "^7.0.1",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "tailwind-merge": "^3.3.1"
}
```

### Radix UI Components
```json
{
  "@radix-ui/react-avatar": "^1.1.10",
  "@radix-ui/react-dropdown-menu": "^2.1.16",
  "@radix-ui/react-hover-card": "^1.1.15",
  "@radix-ui/react-progress": "^1.1.7",
  "@radix-ui/react-separator": "^1.1.7",
  "@radix-ui/react-slider": "^1.3.6",
  "@radix-ui/react-switch": "^1.2.6",
  "@radix-ui/react-tooltip": "^1.2.8"
}
```

### Drag & Drop
```json
{
  "@dnd-kit/core": "^6.3.1",
  "@dnd-kit/sortable": "^10.0.0",
  "@dnd-kit/utilities": "^3.2.2"
}
```

---

## Project Structure

```
src/
├── components/              # Main application components
│   ├── MainFormApp.jsx     # Main app router and navigation
│   ├── FormListApp.jsx     # Form list management
│   ├── EnhancedFormBuilder.jsx  # Form builder with drag-and-drop
│   ├── FormView.jsx        # Form filling interface
│   ├── FormSubmissionList.jsx  # Submission management
│   ├── SubFormView.jsx     # Sub-form display
│   ├── SubmissionDetail.jsx # View submission details
│   ├── SettingsPage.jsx    # App settings
│   └── ui/                 # Reusable UI components
│       ├── glass-card.jsx
│       ├── glass-input.jsx
│       ├── glass-button.jsx
│       ├── animated-add-button.jsx
│       ├── enhanced-toast.jsx
│       ├── telegram-notification-settings.jsx
│       ├── formula-builder.jsx
│       ├── field-options-menu.jsx
│       ├── field-preview-card.jsx
│       ├── unified-field-row.jsx
│       ├── multi-choice-buttons.jsx
│       ├── enhanced-slider.jsx
│       ├── file-display.jsx
│       ├── thai-phone-input.jsx
│       ├── thai-date-input.jsx
│       └── ... (50+ UI components)
│
├── services/               # Business logic and API layer
│   ├── DataService.js      # LocalStorage CRUD operations
│   ├── FileService.js      # File upload and management
│   ├── SubmissionService.js # Form submission handling
│   └── TelegramService.js  # Telegram bot integration
│
├── utils/                  # Helper functions
│   ├── cn.js              # Class name utility
│   ├── formulaEngine.js   # Formula evaluation engine
│   ├── phoneFormatter.js  # Thai phone formatting
│   └── numberFormatter.js # Number formatting
│
├── hooks/                  # Custom React hooks
│   ├── useConditionalVisibility.js  # Field visibility logic
│   └── useAnimations.js   # Animation utilities
│
├── contexts/              # React Context providers
│   ├── ThemeContext.js    # Dark/light mode
│   └── FontContext.jsx    # Font management
│
├── lib/                   # Third-party integrations
│   ├── utils.js          # Utility functions
│   └── animations.js     # Animation configurations
│
├── App.js                 # Application entry point
├── index.js              # React DOM render
└── index.css             # Global styles and Tailwind imports
```

---

## Core Components

### 1. MainFormApp.jsx

**Purpose**: Main application router and navigation system

**Key Features**:
- Tab-based navigation (Forms, Builder, Submissions, Settings)
- Glass morphism navigation bar
- Page transitions with Framer Motion
- Responsive layout management

**State Management**:
```javascript
const [currentPage, setCurrentPage] = useState('forms');
const [selectedForm, setSelectedForm] = useState(null);
const [selectedSubmission, setSelectedSubmission] = useState(null);
```

**Navigation Flow**:
```
Forms List → Form Builder → Form View → Submission List → Submission Detail
```

---

### 2. EnhancedFormBuilder.jsx

**Purpose**: Complete form creation and editing interface

**Key Features**:
- Drag-and-drop field management
- 17 field types with full customization
- Sub-form creation and management
- Field conditional visibility with formulas
- Telegram notification settings
- Role-based access control
- Form settings and metadata

**State Structure**:
```javascript
{
  id: string,
  title: string,
  description: string,
  roles: string[],
  fields: [
    {
      id: string,
      type: string,
      title: string,
      required: boolean,
      placeholder: string,
      options: object,
      showCondition: {
        enabled: boolean,
        formula: string
      },
      telegram: {
        enabled: boolean,
        order: number
      }
    }
  ],
  subForms: [
    {
      id: string,
      title: string,
      fields: []
    }
  ],
  settings: {
    telegram: {
      enabled: boolean,
      botToken: string,
      groupId: string,
      messagePrefix: string,
      selectedFields: []
    }
  }
}
```

**Field Types**:
1. **Text Inputs**: short_answer, paragraph, email, phone, number, url
2. **File Uploads**: file_upload, image_upload
3. **Date/Time**: date, time, datetime
4. **Selection**: multiple_choice, rating, slider
5. **Location**: lat_long, province, factory

---

### 3. FormView.jsx

**Purpose**: Form filling and submission interface

**Key Features**:
- Real-time field validation
- Conditional field visibility evaluation
- File upload with preview
- Thai-specific input formatting (phone, date)
- Sub-form data collection
- Progress tracking
- Auto-save drafts

**Validation System**:
```javascript
const validateField = (field, value) => {
  if (field.required && !value) {
    return { valid: false, message: 'กรุณากรอกข้อมูล' };
  }

  // Type-specific validation
  switch (field.type) {
    case 'email':
      return validateEmail(value);
    case 'phone':
      return validateThaiPhone(value);
    case 'number':
      return validateNumber(value, field.options);
    // ... more validations
  }

  return { valid: true };
};
```

---

### 4. FormSubmissionList.jsx

**Purpose**: View and manage form submissions

**Key Features**:
- Paginated submission list
- Search and filter capabilities
- Bulk operations (export, delete)
- Status indicators
- Date range filtering
- Role-based access control

**Table Structure**:
```javascript
columns: [
  { key: 'submittedAt', label: 'วันที่ส่ง', sortable: true },
  { key: 'submittedBy', label: 'ผู้ส่ง', sortable: true },
  { key: 'status', label: 'สถานะ', filterable: true },
  { key: 'actions', label: 'จัดการ', actions: ['view', 'edit', 'delete'] }
]
```

---

## UI Component Library

### Glass Morphism Components

#### GlassCard
```jsx
<GlassCard className="glass-container">
  <GlassCardHeader>
    <GlassCardTitle>Title</GlassCardTitle>
    <GlassCardDescription>Description</GlassCardDescription>
  </GlassCardHeader>
  <GlassCardContent>
    {children}
  </GlassCardContent>
</GlassCard>
```

**Styling**:
- Backdrop blur: 12px
- Background: rgba(17, 24, 39, 0.7) dark mode
- Border: 1px solid rgba(255, 255, 255, 0.1)
- Shadow: 0 8px 32px rgba(0, 0, 0, 0.37)

#### GlassInput
```jsx
<GlassInput
  type="text"
  placeholder="Enter text"
  value={value}
  onChange={onChange}
  className="custom-class"
/>
```

**Features**:
- Auto-focus management
- Thai language support
- Error state styling
- Icon integration

#### GlassButton
```jsx
<GlassButton
  variant="default" // default, primary, danger, ghost
  size="default"    // sm, default, lg
  onClick={handleClick}
>
  Button Text
</GlassButton>
```

---

### Animated Components

#### AnimatedAddButton
```jsx
<AnimatedAddButton
  onClick={handleAdd}
  tooltip="Add New Item"
  size="default"     // small, default, large
  disabled={false}
/>
```

**Animation Effects**:
- Pulsing glow effect (2s loop)
- Rotating rings (3s rotation)
- Sparkle particles on hover
- Ripple effect on click
- Scale transform on press

**CSS Custom Properties**:
```css
--glow-color: #f97316;
--ring-color: rgba(249, 115, 22, 0.3);
--sparkle-duration: 1.5s;
```

---

### Enhanced Toast System

#### useEnhancedToast Hook
```jsx
const toast = useEnhancedToast();

// Success toast
toast.success("Operation successful!", {
  title: "Success",
  description: "Your data has been saved",
  duration: 5000
});

// Error toast
toast.error("Operation failed!", {
  title: "Error",
  description: "Please try again",
  action: {
    label: "Retry",
    onClick: handleRetry
  }
});

// Warning toast
toast.warning("Please note", {
  title: "Warning",
  description: "This action cannot be undone"
});

// Info toast
toast.info("Information", {
  title: "Info",
  description: "System maintenance scheduled"
});
```

**Features**:
- Portal-based rendering (outside DOM constraints)
- Auto-dismiss with configurable duration
- Action buttons
- Stack management (max 5 toasts)
- Animation: slide-in from top-right
- Position: fixed top-right
- Z-index: 9999

---

### Telegram Notification Settings

#### TelegramNotificationSettings Component
```jsx
<TelegramNotificationSettings
  form={form}
  onUpdate={handleUpdate}
  availableFields={fields}
  className="custom-class"
/>
```

**Features**:
- Checkbox enable/disable toggle
- Bot token and group ID inputs
- Custom message prefix
- Dual-panel drag-and-drop field ordering
- Real-time message preview
- Test notification button

**Drag & Drop System**:
```javascript
// Left Panel: Available Fields (telegram-enabled but not selected)
// Right Panel: Selected Fields (will be sent in notification)

// Drag operations:
1. Available → Selected: Add to notification
2. Selected → Available: Remove from notification
3. Selected → Selected: Reorder fields
```

**Animation Features**:
- Original position: opacity 50% when dragging
- Dragged element: scale 105%, shadow-2xl, ring-2
- Drop zones: highlighted borders
- Smooth transitions: spring physics (stiffness: 400, damping: 25)

---

### Field Components

#### UnifiedFieldRow
**Purpose**: Consistent field display across all field types

**Props**:
```javascript
{
  field: object,          // Field configuration
  value: any,            // Current value
  onChange: function,    // Change handler
  error: string,         // Validation error
  disabled: boolean,     // Disabled state
  className: string      // Custom classes
}
```

#### MultiChoiceButtons
**Purpose**: Radio button or checkbox groups with visual feedback

**Features**:
- Single or multiple selection
- Icon support
- Color customization
- Hover effects
- Selected state animation

#### EnhancedSlider
**Purpose**: Range slider with visual feedback

**Features**:
- Min/max range
- Step increments
- Current value display
- Color-coded track
- Touch-optimized handles

#### FileDisplay
**Purpose**: File upload with preview and management

**Features**:
- Drag-and-drop upload
- Preview for images
- File type icons
- Size validation
- Delete confirmation
- Base64 encoding for storage

---

## State Management

### Local State Pattern

Each component manages its own state using React hooks:

```javascript
// Form Builder State
const [form, setForm] = useState(initialForm);
const [activeTab, setActiveTab] = useState('fields');
const [selectedField, setSelectedField] = useState(null);

// Update patterns
const updateField = useCallback((fieldId, updates) => {
  setForm(prev => ({
    ...prev,
    fields: prev.fields.map(f =>
      f.id === fieldId ? { ...f, ...updates } : f
    )
  }));
}, []);
```

### Context Providers

#### ThemeContext
```javascript
const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark');

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
```

#### FontContext
```javascript
const FontProvider = ({ children }) => {
  const [fontSize, setFontSize] = useState('medium');

  return (
    <FontContext.Provider value={{ fontSize, setFontSize }}>
      {children}
    </FontContext.Provider>
  );
};
```

---

## Services Layer

### DataService.js

**Purpose**: LocalStorage CRUD operations for forms and submissions

**Methods**:
```javascript
class DataService {
  // Forms
  static getAllForms(): Form[]
  static getFormById(id: string): Form
  static saveForm(form: Form): void
  static deleteForm(id: string): void
  static exportForms(): string
  static importForms(data: string): void

  // Submissions
  static getAllSubmissions(formId: string): Submission[]
  static getSubmissionById(id: string): Submission
  static saveSubmission(submission: Submission): void
  static deleteSubmission(id: string): void
  static exportSubmissions(formId: string): string
}
```

**Storage Keys**:
```javascript
{
  'qcollector_forms': [...],        // All forms
  'qcollector_submissions': [...],  // All submissions
  'qcollector_settings': {...}      // App settings
}
```

---

### FileService.js

**Purpose**: File upload and Base64 encoding

**Methods**:
```javascript
class FileService {
  static uploadFile(file: File): Promise<string>
  static validateFile(file: File, options: object): boolean
  static getFilePreview(file: File): Promise<string>
  static deleteFile(fileId: string): void
}
```

**File Validation**:
```javascript
{
  maxSize: 10485760,  // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  allowedExtensions: ['.jpg', '.png', '.pdf']
}
```

---

### SubmissionService.js

**Purpose**: Form submission handling and validation

**Methods**:
```javascript
class SubmissionService {
  static submitForm(formId: string, data: object): Promise<void>
  static validateSubmission(form: Form, data: object): ValidationResult
  static sendTelegramNotification(form: Form, data: object): Promise<void>
  static calculateProgress(form: Form, data: object): number
}
```

---

### TelegramService.js

**Purpose**: Telegram Bot API integration

**Methods**:
```javascript
class TelegramService {
  static async sendMessage(botToken: string, chatId: string, message: string)
  static async testConnection(botToken: string, chatId: string)
  static formatNotification(form: Form, submission: object): string
}
```

**Message Format**:
```
[Custom Prefix] [DateTime]

Field1 Name: Field1 Value
Field2 Name: Field2 Value
Field3 Name: Field3 Value
...
```

---

## Utilities & Helpers

### cn.js - Class Name Utility

```javascript
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
```

**Usage**:
```javascript
<div className={cn(
  'base-class',
  isActive && 'active-class',
  'conditional-class'
)} />
```

---

### formulaEngine.js - Formula Evaluation

**Purpose**: AppSheet-compatible formula engine for conditional visibility

**Supported Functions**:
```javascript
// Logical Functions
AND(condition1, condition2, ...)
OR(condition1, condition2, ...)
NOT(condition)
IF(condition, trueValue, falseValue)

// Comparison Operators
=, <>, <, >, <=, >=

// Text Functions
CONTAINS(text, substring)
ISBLANK(value)
ISNOTBLANK(value)

// Field References
[FieldName]
```

**Example Formulas**:
```javascript
// Show field if Status is "Complete" AND Amount > 100
AND([Status] = "Complete", [Amount] > 100)

// Show field if Priority is "High" and Comments is not blank
IF([Priority] = "High", NOT(ISBLANK([Comments])), TRUE)

// Show field if Description contains "urgent"
CONTAINS([Description], "urgent")
```

**Implementation**:
```javascript
class FormulaEngine {
  static evaluate(formula: string, formData: object): boolean
  static validateFormula(formula: string): ValidationResult
  static getFieldReferences(formula: string): string[]
  static getAvailableFunctions(): string[]
}
```

---

### phoneFormatter.js - Thai Phone Formatting

```javascript
export const formatThaiPhone = (phone) => {
  // Remove non-digits
  const cleaned = phone.replace(/\D/g, '');

  // Format: 0XX-XXX-XXXX
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return `${cleaned.slice(0,3)}-${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
  }

  return phone;
};

export const validateThaiPhone = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  return /^0[0-9]{9}$/.test(cleaned);
};
```

---

## Feature Implementations

### Conditional Field Visibility

**Implementation Flow**:

1. **Field Configuration** (field-options-menu.jsx):
```javascript
// Show checkbox in field settings
<input
  type="checkbox"
  checked={field.showCondition?.enabled ?? true}
  onChange={(e) => {
    updateField(field.id, {
      showCondition: {
        enabled: e.target.checked,
        formula: field.showCondition?.formula || ''
      }
    });
  }}
/>

// If unchecked, show formula builder
{!field.showCondition?.enabled && (
  <FormulaBuilder
    formula={field.showCondition?.formula}
    availableFields={getAllFields()}
    onChange={(newFormula) => {
      updateField(field.id, {
        showCondition: {
          enabled: false,
          formula: newFormula
        }
      });
    }}
  />
)}
```

2. **Runtime Evaluation** (FormView.jsx):
```javascript
const useConditionalVisibility = (form, formData) => {
  const [visibleFields, setVisibleFields] = useState([]);

  useEffect(() => {
    const newVisibleFields = form.fields.filter(field => {
      // Always show if condition is enabled (default)
      if (field.showCondition?.enabled !== false) {
        return true;
      }

      // Evaluate formula
      try {
        return formulaEngine.evaluate(
          field.showCondition.formula,
          formData
        );
      } catch (error) {
        console.error('Formula error:', error);
        return false; // Hide on error
      }
    });

    setVisibleFields(newVisibleFields);
  }, [form, formData]);

  return visibleFields;
};
```

3. **Validation Skip** (FormView.jsx):
```javascript
const validateForm = () => {
  const errors = {};

  form.fields.forEach(field => {
    // Skip validation for hidden fields
    if (!visibleFields.includes(field.id)) {
      return;
    }

    const validation = validateField(field, formData[field.id]);
    if (!validation.valid) {
      errors[field.id] = validation.message;
    }
  });

  return errors;
};
```

---

### Drag-and-Drop Field Ordering

**Implementation** (telegram-notification-settings.jsx):

```javascript
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const TelegramNotificationSettings = ({ form, onUpdate, availableFields }) => {
  const [activeId, setActiveId] = useState(null);
  const [selectedFields, setSelectedFields] = useState([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Handle reordering within selected panel
    if (activeData.panelType === 'selected' && overData.panelType === 'selected') {
      const oldIndex = activeData.index;
      const newIndex = overData.index;

      if (oldIndex !== newIndex) {
        const newOrder = arrayMove(selectedFields, oldIndex, newIndex);
        setSelectedFields(newOrder);
        onUpdate({
          ...form,
          settings: {
            ...form.settings,
            telegram: {
              ...form.settings.telegram,
              selectedFields: newOrder
            }
          }
        });
      }
    }

    setActiveId(null);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={({ active }) => setActiveId(active.id)}
      onDragEnd={handleDragEnd}
    >
      {/* Available Fields Panel */}
      <SortableContext
        items={availableFields.map(f => `available-${f.id}`)}
        strategy={verticalListSortingStrategy}
      >
        {availableFields.map((field, index) => (
          <DraggableFieldTag
            key={field.id}
            field={field}
            panelType="available"
            index={index}
          />
        ))}
      </SortableContext>

      {/* Selected Fields Panel */}
      <SortableContext
        items={selectedFields.map(f => `selected-${f.id}`)}
        strategy={verticalListSortingStrategy}
      >
        {selectedFields.map((field, index) => (
          <DraggableFieldTag
            key={field.id}
            field={field}
            panelType="selected"
            index={index}
            isSelected={true}
          />
        ))}
      </SortableContext>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeId && (
          <FieldTag field={draggedField} isDragging={true} />
        )}
      </DragOverlay>
    </DndContext>
  );
};

// Draggable Field Tag Component
const DraggableFieldTag = ({ field, panelType, index, isSelected }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: `${panelType}-${field.id}`,
    data: { field, panelType, index }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,  // Original position semi-transparent
    zIndex: isDragging ? 1000 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'field-tag',
        isDragging && 'scale-105 shadow-2xl shadow-orange-500/50 ring-2 ring-orange-500/30'
      )}
      {...attributes}
      {...listeners}
    >
      {/* Field content */}
    </div>
  );
};
```

---

## Design System

### Color Palette

```javascript
const colors = {
  // Primary - Orange
  primary: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',  // Main orange
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
  },

  // Dark Mode Backgrounds
  dark: {
    bg: '#0a0a0a',
    card: 'rgba(17, 24, 39, 0.7)',
    hover: 'rgba(31, 41, 55, 0.8)',
    border: 'rgba(255, 255, 255, 0.1)',
  },

  // Glass Effects
  glass: {
    bg: 'rgba(17, 24, 39, 0.7)',
    border: 'rgba(255, 255, 255, 0.1)',
    shadow: 'rgba(0, 0, 0, 0.37)',
  }
};
```

### Typography Scale

```javascript
const typography = {
  // Headers
  h1: 'text-3xl font-bold',      // 30px
  h2: 'text-2xl font-bold',      // 24px
  h3: 'text-xl font-semibold',   // 20px
  h4: 'text-lg font-semibold',   // 18px

  // Body
  body: 'text-base',             // 16px
  small: 'text-sm',              // 14px
  tiny: 'text-xs',               // 12px

  // Special
  label: 'text-sm font-medium',
  caption: 'text-xs text-gray-400',
};
```

### Spacing System (8px Grid)

```javascript
const spacing = {
  0: '0px',
  1: '8px',
  2: '16px',
  3: '24px',
  4: '32px',
  5: '40px',
  6: '48px',
  8: '64px',
  10: '80px',
};
```

### Layout Constraints

```javascript
const layout = {
  maxWidth: 'max-w-3xl',        // 768px - Form containers
  minTouchTarget: '44px',       // Minimum tap target
  borderRadius: 'rounded-lg',   // 8px
  borderRadiusLarge: 'rounded-xl', // 12px
};
```

---

## Performance Optimizations

### React Optimizations

1. **Component Memoization**:
```javascript
const FieldRow = React.memo(({ field, value, onChange }) => {
  // Component logic
}, (prevProps, nextProps) => {
  return prevProps.value === nextProps.value &&
         prevProps.field.id === nextProps.field.id;
});
```

2. **useCallback for Event Handlers**:
```javascript
const handleFieldChange = useCallback((fieldId, value) => {
  setFormData(prev => ({
    ...prev,
    [fieldId]: value
  }));
}, []);
```

3. **useMemo for Expensive Calculations**:
```javascript
const sortedFields = useMemo(() => {
  return fields.sort((a, b) => a.order - b.order);
}, [fields]);
```

4. **Lazy Loading**:
```javascript
const FormBuilder = lazy(() => import('./EnhancedFormBuilder'));
const FormView = lazy(() => import('./FormView'));
```

### Animation Performance

1. **Hardware Acceleration**:
```css
.animated-element {
  transform: translateZ(0);
  will-change: transform, opacity;
  backface-visibility: hidden;
}
```

2. **Framer Motion Optimization**:
```javascript
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{
    type: 'spring',
    stiffness: 400,
    damping: 25,
    mass: 0.5
  }}
  style={{
    transform: 'translateZ(0)',
    willChange: 'transform, opacity'
  }}
>
  {children}
</motion.div>
```

3. **Reduce Motion Support**:
```javascript
const shouldReduceMotion = useReducedMotion();

<motion.div
  animate={shouldReduceMotion ? {} : { scale: [1, 1.05, 1] }}
>
  {children}
</motion.div>
```

### Bundle Size Optimization

1. **Tree Shaking**:
```javascript
// Good - Named imports
import { useState, useEffect } from 'react';
import { faUser, faEdit } from '@fortawesome/free-solid-svg-icons';

// Bad - Default imports
import * as React from 'react';
import * as icons from '@fortawesome/free-solid-svg-icons';
```

2. **Code Splitting**:
```javascript
// Route-based splitting
const routes = [
  { path: '/builder', component: lazy(() => import('./FormBuilder')) },
  { path: '/view', component: lazy(() => import('./FormView')) },
];
```

---

## Development Guidelines

### Component Creation Pattern

```javascript
import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { GlassCard } from './ui/glass-card';

/**
 * ComponentName - Brief description
 *
 * @param {object} props - Component props
 * @param {string} props.title - Title text
 * @param {function} props.onAction - Action handler
 * @returns {JSX.Element}
 */
const ComponentName = ({ title, onAction, className }) => {
  // State
  const [localState, setLocalState] = useState(null);

  // Memoized values
  const computedValue = useMemo(() => {
    return expensiveComputation(localState);
  }, [localState]);

  // Callbacks
  const handleClick = useCallback(() => {
    onAction(localState);
  }, [onAction, localState]);

  // Render
  return (
    <GlassCard className={cn('component-base-class', className)}>
      <h2>{title}</h2>
      <button onClick={handleClick}>Action</button>
    </GlassCard>
  );
};

export default React.memo(ComponentName);
```

### Styling Conventions

1. **Tailwind First**:
```jsx
<div className="flex items-center gap-4 p-4 rounded-lg bg-gray-800">
  {children}
</div>
```

2. **Dynamic Classes with cn()**:
```jsx
<div className={cn(
  'base-class',
  isActive && 'active-class',
  variant === 'primary' && 'primary-variant'
)}>
  {children}
</div>
```

3. **Avoid Inline Styles** (except for dynamic transforms):
```jsx
// Good
<div style={{ transform: CSS.Transform.toString(transform) }}>

// Bad
<div style={{ color: 'red', padding: '16px' }}>
```

### State Management Pattern

```javascript
// 1. Local state for component-specific data
const [isOpen, setIsOpen] = useState(false);

// 2. Lift state up for shared data
const ParentComponent = () => {
  const [sharedData, setSharedData] = useState({});

  return (
    <>
      <ChildA data={sharedData} onUpdate={setSharedData} />
      <ChildB data={sharedData} onUpdate={setSharedData} />
    </>
  );
};

// 3. Context for deeply nested data
const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark');
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
```

### Error Handling

```javascript
const ComponentWithErrorBoundary = () => {
  const [error, setError] = useState(null);

  const handleAction = async () => {
    try {
      const result = await riskyOperation();
      // Success handling
    } catch (err) {
      setError(err.message);
      console.error('Operation failed:', err);
      toast.error(err.message);
    }
  };

  if (error) {
    return <ErrorDisplay message={error} onRetry={() => setError(null)} />;
  }

  return <NormalComponent onAction={handleAction} />;
};
```

### Accessibility

```javascript
// 1. Semantic HTML
<button onClick={handleClick}>Click Me</button>
// Not: <div onClick={handleClick}>Click Me</div>

// 2. ARIA labels
<button aria-label="Close dialog" onClick={onClose}>
  <XIcon />
</button>

// 3. Keyboard navigation
<div
  tabIndex={0}
  role="button"
  onKeyPress={(e) => e.key === 'Enter' && handleClick()}
  onClick={handleClick}
>
  Clickable Div
</div>

// 4. Focus management
const inputRef = useRef();
useEffect(() => {
  inputRef.current?.focus();
}, []);
```

---

## Testing Strategy

### Unit Testing Pattern

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('renders with title', () => {
    render(<ComponentName title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('calls onAction when clicked', () => {
    const mockAction = jest.fn();
    render(<ComponentName onAction={mockAction} />);

    fireEvent.click(screen.getByRole('button'));
    expect(mockAction).toHaveBeenCalled();
  });
});
```

### Integration Testing

```javascript
describe('Form Submission Flow', () => {
  it('submits form with valid data', async () => {
    const { getByLabelText, getByText } = render(<FormView form={mockForm} />);

    // Fill form
    fireEvent.change(getByLabelText('Name'), { target: { value: 'John' } });
    fireEvent.change(getByLabelText('Email'), { target: { value: 'john@test.com' } });

    // Submit
    fireEvent.click(getByText('Submit'));

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Submission successful')).toBeInTheDocument();
    });
  });
});
```

---

## Build and Deployment

### Development
```bash
npm run dev          # Start dev server on localhost:3000
npm run build        # Create production build
npm run test         # Run test suite
npm run lint         # Lint code
```

### Production Build Checklist

- [ ] All tests passing
- [ ] No console errors or warnings
- [ ] Lighthouse score > 90
- [ ] Bundle size < 500KB (gzipped)
- [ ] Images optimized
- [ ] Lazy loading implemented
- [ ] Service worker configured
- [ ] Environment variables set
- [ ] Error tracking enabled
- [ ] Analytics integrated

### Environment Variables

```bash
# .env.production
REACT_APP_API_URL=https://api.production.com
REACT_APP_TELEGRAM_BOT_TOKEN=your_bot_token
REACT_APP_VERSION=0.4.0
```

---

## Version History

### v0.4.0 (2025-09-30)
- ✅ Conditional field visibility with formula engine
- ✅ Advanced Telegram notification system with drag-and-drop
- ✅ Enhanced drag animations with visual feedback
- ✅ Checkbox-based telegram enable/disable
- ✅ Custom message prefix configuration

### v0.3.0 (2025-01-21)
- ✅ Circular animation buttons
- ✅ Enhanced toast system with portal rendering
- ✅ Sub-form management improvements
- ✅ Glass morphism UI refinements

### v0.2.0 (2025-01-15)
- ✅ Complete form builder system
- ✅ 17 field types
- ✅ Thai localization
- ✅ File upload system
- ✅ Basic telegram integration

### v0.1.0 (2024-12-20)
- ✅ Initial release
- ✅ Basic form creation
- ✅ LocalStorage persistence

---

## Support and Resources

**Documentation**: See CLAUDE.md for quick reference
**Development Guide**: This document (FRONTEND.md)
**Backend Guide**: BACKEND.md (to be created)
**API Documentation**: API.md (to be created)

**Tech Stack References**:
- React: https://react.dev
- Tailwind CSS: https://tailwindcss.com
- Framer Motion: https://www.framer.com/motion
- @dnd-kit: https://dndkit.com
- Radix UI: https://www.radix-ui.com

---

**Document Version**: 1.0
**Last Updated**: 2025-09-30
**Maintained By**: Q-Collector Development Team
**License**: Internal Use Only