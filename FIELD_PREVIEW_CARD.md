# FieldPreviewCard Component

A modern dark neon-style field preview component designed for Form Builder applications. Features consistent spacing, smooth hover animations, and responsive design.

## ✨ Features

- **Dark Neon Design**: Modern dark theme with orange (#ff7b00) accent color
- **Framer Motion Animations**: Smooth hover, focus, and tap animations
- **Responsive Layout**: Mobile-first design that works across all devices
- **Consistent Spacing**: 16px base grid system with proper vertical rhythm
- **Field Type Variants**: Color-coded icons based on field type
- **Accessibility**: WCAG compliant with keyboard navigation support
- **Interactive Preview**: Right-side area for live field previews

## 🚀 Usage

### Basic Implementation

```jsx
import FieldPreviewCard from './ui/field-preview-card';
import { faFont } from '@fortawesome/free-solid-svg-icons';

function MyFormBuilder() {
  return (
    <FieldPreviewCard
      icon={faFont}
      label="ชื่อ-นามสกุล"
      description="ช่องกรอกชื่อและนามสกุลของผู้ใช้งาน"
      fieldType="text"
      previewElement={
        <input
          type="text"
          placeholder="กรอกชื่อ-นามสกุล..."
          className="w-full px-4 py-3 bg-gray-800/60 border border-gray-600/40 rounded-xl text-sm text-white placeholder-gray-500"
          readOnly
        />
      }
      onEdit={() => handleEditField()}
      onDelete={() => handleDeleteField()}
    />
  );
}
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `icon` | `FontAwesome Icon` | ✅ | FontAwesome icon object for the field type |
| `label` | `string` | ✅ | Primary field label |
| `description` | `string` | ❌ | Optional field description |
| `previewElement` | `React.ReactNode` | ❌ | Interactive preview control |
| `onEdit` | `Function` | ❌ | Edit callback function |
| `onDelete` | `Function` | ❌ | Delete callback function |
| `fieldType` | `string` | ❌ | Field type for color variants (`text`, `rating`, `slider`, `upload`, `date`, `choice`) |
| `isActive` | `boolean` | ❌ | Whether this field is currently active/selected |
| `className` | `string` | ❌ | Additional CSS classes |

### Field Type Color Variants

The component automatically applies color-coded styling based on `fieldType`:

- **text**: Blue (`#3b82f6`)
- **rating**: Amber (`#f59e0b`)
- **slider**: Emerald (`#10b981`)
- **upload**: Violet (`#8b5cf6`)
- **date**: Pink (`#ec4899`)
- **choice**: Green (`#22c55e`)
- **default**: Gray (`#9ca3af`)

## 🎨 Design Specifications

### Colors

- **Background**: `#1a1a1a` (Dark gray)
- **Accent**: `#ff7b00` (Orange)
- **Border**: `rgba(64, 64, 64, 0.3)` (Gray with transparency)
- **Text**: `#ffffff` (White primary), `#9ca3af` (Gray secondary)

### Spacing

- **Card Padding**: `24px` (`p-6`)
- **Grid Gap**: `24px` (`gap-6`)
- **Icon Size**: `56px x 56px` (`w-14 h-14`)
- **Border Radius**: `16px` (`rounded-2xl`)

### Animations

- **Hover Scale**: `1.02x` scale with orange glow effect
- **Focus Ring**: Orange ring with `3px` width
- **Tap Scale**: `0.98x` scale for feedback
- **Duration**: `300ms` for main transitions, `200ms` for micro-interactions

## 📱 Responsive Behavior

### Desktop (1024px+)
- Full 3-column grid layout (icon | content | preview)
- Action buttons visible on hover
- Wider preview area (200-280px)

### Tablet (768px-1023px)
- Maintains grid layout with adjusted spacing
- Preview area adapts to available space
- Touch-friendly button sizing

### Mobile (320px-767px)
- Action buttons always visible
- Stack content when needed
- Minimum touch target size (44px)

## 🎯 Example Implementations

### Text Input Field
```jsx
<FieldPreviewCard
  icon={faFont}
  label="Email Address"
  description="User's email for communication"
  fieldType="text"
  previewElement={
    <input
      type="email"
      placeholder="example@domain.com"
      className="w-full px-4 py-3 bg-gray-800/60 border border-gray-600/40 rounded-xl text-sm text-white placeholder-gray-500"
      readOnly
    />
  }
/>
```

### Star Rating Field
```jsx
<FieldPreviewCard
  icon={faStar}
  label="Satisfaction Rating"
  description="Rate your satisfaction (1-5 stars)"
  fieldType="rating"
  previewElement={
    <div className="flex items-center justify-between">
      <div className="flex space-x-2">
        {[...Array(5)].map((_, i) => (
          <FontAwesomeIcon
            key={i}
            icon={faStar}
            className={`text-xl ${i < 4 ? 'text-yellow-400' : 'text-gray-600'}`}
          />
        ))}
      </div>
      <span className="text-sm text-yellow-400 font-medium">4/5</span>
    </div>
  }
/>
```

### Slider Field
```jsx
<FieldPreviewCard
  icon={faSliders}
  label="Priority Level"
  description="Set task priority (0-100)"
  fieldType="slider"
  previewElement={
    <div className="space-y-3">
      <input
        type="range"
        min="0"
        max="100"
        value="75"
        className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer"
        readOnly
      />
      <div className="text-center">
        <span className="text-lg font-bold text-emerald-400">75</span>
        <span className="text-sm text-gray-400 ml-1">/ 100</span>
      </div>
    </div>
  }
/>
```

## 🔧 Custom CSS Required

Add this CSS to your global styles for proper slider styling:

```css
.slider-thumb::-webkit-slider-thumb {
  appearance: none;
  height: 24px;
  width: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff7b00 0%, #ff9500 100%);
  border: 3px solid #1a1a1a;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(255, 123, 0, 0.4);
  transition: all 0.2s ease;
}

.slider-thumb::-webkit-slider-thumb:hover {
  transform: scale(1.15);
  box-shadow: 0 4px 16px rgba(255, 123, 0, 0.6);
}

.slider-thumb::-moz-range-thumb {
  height: 24px;
  width: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff7b00 0%, #ff9500 100%);
  border: 3px solid #1a1a1a;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(255, 123, 0, 0.4);
  transition: all 0.2s ease;
}
```

## 🚀 Demo Component

A complete demonstration is available in `src/components/FieldPreviewDemo.jsx` showcasing:

- Text fields (name, email, phone, URL)
- Interactive rating system
- Animated sliders
- Date pickers
- Multiple choice options
- File upload areas
- Image upload interfaces

## 🎨 Integration with Existing Design System

The component is designed to work seamlessly with your existing glass morphism design system:

- Uses consistent border radius and spacing
- Inherits dark theme variables
- Compatible with existing animation patterns
- Follows established color hierarchy
- Maintains accessibility standards

## ⚡ Performance Optimizations

- **Hardware acceleration**: Uses `transform` and `opacity` for animations
- **Minimal re-renders**: Optimized React component structure
- **Efficient animations**: Framer Motion with performance-first approach
- **Lazy loading**: Icons and images load on demand
- **Memory efficient**: Clean event handlers and proper cleanup

---

The FieldPreviewCard component provides a professional, modern interface that enhances the user experience of your Form Builder while maintaining consistency with your dark neon design theme.