# Conditional Formatting System - Implementation Plan v0.7.40

**Feature**: จัดรูปแบบการแสดงผลตามเงื่อนไข (Conditional Formatting)
**Version**: 0.7.40-dev
**Date**: 2025-10-19

---

## 🎯 Overview

ระบบ Conditional Formatting ช่วยให้ผู้ใช้สามารถกำหนดเงื่อนไขการแสดงผลสีและรูปแบบของข้อมูลในฟิลด์ได้ เพื่อเน้นข้อมูลสำคัญและช่วยให้ monitor ข้อมูลได้ง่ายขึ้น

**ตัวอย่าง**:
- ถ้า `[สถานะการขาย] = "ปิดการขายได้"` → แสดงข้อความสีเขียว
- ถ้า `[ยอดขาย] > 100000` → แสดงข้อความสีทอง + พื้นหลังสีเหลืองอ่อน
- ถ้า `[ระดับความเร่งด่วน] = "สูง"` → แสดงพื้นหลังสีแดง + ข้อความสีขาว

---

## 📊 Scope Coverage

### **ที่ตั้งค่า (Configuration)**:
1. ✅ Main Form Fields (EnhancedFormBuilder.jsx)
2. ✅ Sub-Form Fields (EnhancedFormBuilder.jsx)

### **ที่แสดงผล (Display)**:
1. ✅ Main Form Detail View (SubmissionDetail.jsx)
2. ✅ Sub-Form Detail View (SubFormDetail.jsx)
3. ✅ Main Form Submission List (FormSubmissionList.jsx) - ในตาราง
4. ✅ Sub-Form Submission List - ในรายการ sub-form submissions

---

## 🗂️ Data Structure

### Field Model Extension

```javascript
{
  id: "field_123",
  title: "สถานะการขาย",
  type: "short_answer",
  // ... existing properties

  // ✅ NEW: Conditional Formatting
  conditionalFormatting: {
    enabled: true,
    rules: [
      {
        id: "rule_1",
        order: 1,                                    // Priority (lower = higher priority)
        condition: "[สถานะการขาย] = \"ปิดการขายได้\"", // Formula expression
        style: {
          textColor: "#22c55e",           // Hex color or null
          backgroundColor: null,           // Hex color or null
          fontWeight: "bold",             // "normal" | "bold" | "600" | "700"
          fontSize: null,                 // e.g., "16px" or null
          borderColor: null,              // Hex color or null
          borderWidth: null,              // e.g., "2px" or null
          borderStyle: null               // "solid" | "dashed" | "dotted" or null
        }
      },
      {
        id: "rule_2",
        order: 2,
        condition: "[สถานะการขาย] = \"ยกเลิก\"",
        style: {
          textColor: "#ffffff",
          backgroundColor: "#ef4444",
          fontWeight: "bold"
        }
      }
    ]
  }
}
```

### Backend Database Schema

**PostgreSQL** - `fields` table already has JSONB columns:

```sql
-- No migration needed! Just update field data
UPDATE fields
SET conditional_formatting = '{
  "enabled": true,
  "rules": [...]
}'::jsonb
WHERE id = 'field_123';
```

---

## 🎨 UI Components

### 1. Color Picker Component

**File**: `src/components/ui/color-picker.jsx`

```jsx
import React, { useState } from 'react';
import { GlassCard } from './glass-card';

export function ColorPicker({ value, onChange, label, allowClear = true }) {
  const [showPicker, setShowPicker] = useState(false);

  // Preset color palette
  const presetColors = [
    { name: 'Red', value: '#ef4444', bg: 'bg-red-500' },
    { name: 'Orange', value: '#f97316', bg: 'bg-orange-500' },
    { name: 'Amber', value: '#f59e0b', bg: 'bg-amber-500' },
    { name: 'Yellow', value: '#eab308', bg: 'bg-yellow-500' },
    { name: 'Lime', value: '#84cc16', bg: 'bg-lime-500' },
    { name: 'Green', value: '#22c55e', bg: 'bg-green-500' },
    { name: 'Emerald', value: '#10b981', bg: 'bg-emerald-500' },
    { name: 'Teal', value: '#14b8a6', bg: 'bg-teal-500' },
    { name: 'Cyan', value: '#06b6d4', bg: 'bg-cyan-500' },
    { name: 'Sky', value: '#0ea5e9', bg: 'bg-sky-500' },
    { name: 'Blue', value: '#3b82f6', bg: 'bg-blue-500' },
    { name: 'Indigo', value: '#6366f1', bg: 'bg-indigo-500' },
    { name: 'Violet', value: '#8b5cf6', bg: 'bg-violet-500' },
    { name: 'Purple', value: '#a855f7', bg: 'bg-purple-500' },
    { name: 'Fuchsia', value: '#d946ef', bg: 'bg-fuchsia-500' },
    { name: 'Pink', value: '#ec4899', bg: 'bg-pink-500' },
    { name: 'Rose', value: '#f43f5e', bg: 'bg-rose-500' },
    { name: 'Gray', value: '#6b7280', bg: 'bg-gray-500' },
    { name: 'Slate', value: '#64748b', bg: 'bg-slate-500' },
    { name: 'Zinc', value: '#71717a', bg: 'bg-zinc-500' },
    { name: 'Black', value: '#000000', bg: 'bg-black' },
    { name: 'White', value: '#ffffff', bg: 'bg-white' }
  ];

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium text-foreground/90">{label}</label>}

      <div className="flex items-center gap-2 flex-wrap">
        {/* Current Color Display */}
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 rounded border-2 border-border cursor-pointer hover:scale-110 transition"
            style={{ backgroundColor: value || '#ffffff' }}
            onClick={() => setShowPicker(!showPicker)}
            title="คลิกเพื่อเลือกสี"
          />
          <span className="text-xs font-mono text-muted-foreground">
            {value || 'ไม่กำหนด'}
          </span>
        </div>

        {/* Preset Colors Grid */}
        <div className="flex flex-wrap gap-1">
          {presetColors.map(color => (
            <button
              key={color.value}
              type="button"
              onClick={() => onChange(color.value)}
              className={`w-7 h-7 rounded border-2 ${
                value === color.value ? 'border-orange-500 scale-110' : 'border-white/30'
              } hover:scale-110 transition`}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>

        {/* HTML5 Color Picker */}
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded cursor-pointer border border-border"
          title="เลือกสีกำหนดเอง"
        />

        {/* Clear Button */}
        {allowClear && value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition"
          >
            ล้างสี
          </button>
        )}
      </div>
    </div>
  );
}
```

---

### 2. Formatting Rule Editor Component

**File**: `src/components/ui/formatting-rule-editor.jsx`

```jsx
import React, { useState } from 'react';
import { GlassCard, GlassCardContent } from './glass-card';
import { GlassTextarea, GlassSelect } from './glass-input';
import { GlassButton } from './glass-button';
import { ColorPicker } from './color-picker';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faEye, faCog } from '@fortawesome/free-solid-svg-icons';

export function FormattingRuleEditor({ rule, onUpdate, onDelete, index }) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateStyle = (key, value) => {
    onUpdate({
      ...rule,
      style: {
        ...rule.style,
        [key]: value
      }
    });
  };

  // Preview the style
  const getPreviewStyle = () => ({
    color: rule.style.textColor || undefined,
    backgroundColor: rule.style.backgroundColor || undefined,
    fontWeight: rule.style.fontWeight || undefined,
    fontSize: rule.style.fontSize || undefined,
    borderColor: rule.style.borderColor || undefined,
    borderWidth: rule.style.borderWidth || undefined,
    borderStyle: rule.style.borderStyle || 'solid'
  });

  return (
    <GlassCard className="p-4 border border-border/50">
      <GlassCardContent className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-orange-400">
            กฎที่ {index + 1}
          </h4>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs px-2 py-1 rounded hover:bg-muted/50 transition"
              title="ตั้งค่าขั้นสูง"
            >
              <FontAwesomeIcon icon={faCog} className="mr-1" />
              {showAdvanced ? 'ซ่อนตั้งค่าขั้นสูง' : 'ตั้งค่าขั้นสูง'}
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="text-xs px-2 py-1 rounded bg-destructive/20 hover:bg-destructive/30 text-destructive transition"
              title="ลบกฎนี้"
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </div>
        </div>

        {/* Condition Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/90">
            เงื่อนไข (Formula)
          </label>
          <GlassTextarea
            value={rule.condition || ''}
            onChange={(e) => onUpdate({ ...rule, condition: e.target.value })}
            placeholder='ตัวอย่าง: [สถานะ] = "ปิดการขายได้"'
            rows={2}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            💡 ใช้ไวยากรณ์เดียวกับเงื่อนไขการแสดงฟิลด์ (Visibility Conditions)
          </p>
        </div>

        {/* Basic Style Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Text Color */}
          <ColorPicker
            label="สีข้อความ"
            value={rule.style.textColor}
            onChange={(color) => updateStyle('textColor', color)}
          />

          {/* Background Color */}
          <ColorPicker
            label="สีพื้นหลัง"
            value={rule.style.backgroundColor}
            onChange={(color) => updateStyle('backgroundColor', color)}
          />
        </div>

        {/* Font Weight */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/90">
            น้ำหนักตัวอักษร
          </label>
          <GlassSelect
            value={rule.style.fontWeight || 'normal'}
            onChange={(e) => updateStyle('fontWeight', e.target.value)}
          >
            <option value="normal">ปกติ (Normal)</option>
            <option value="600">กลาง (Medium)</option>
            <option value="bold">หนา (Bold)</option>
            <option value="700">หนามาก (Extra Bold)</option>
          </GlassSelect>
        </div>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="space-y-4 pt-4 border-t border-border/30">
            <h5 className="text-sm font-semibold text-orange-300">ตั้งค่าขั้นสูง</h5>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Border Color */}
              <ColorPicker
                label="สีขอบ"
                value={rule.style.borderColor}
                onChange={(color) => updateStyle('borderColor', color)}
              />

              {/* Border Width */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/90">
                  ความหนาขอบ
                </label>
                <GlassSelect
                  value={rule.style.borderWidth || ''}
                  onChange={(e) => updateStyle('borderWidth', e.target.value || null)}
                >
                  <option value="">ไม่กำหนด</option>
                  <option value="1px">1px</option>
                  <option value="2px">2px (ค่าเริ่มต้น)</option>
                  <option value="3px">3px</option>
                  <option value="4px">4px</option>
                </GlassSelect>
              </div>
            </div>

            {/* Font Size */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/90">
                ขนาดตัวอักษร
              </label>
              <GlassSelect
                value={rule.style.fontSize || ''}
                onChange={(e) => updateStyle('fontSize', e.target.value || null)}
              >
                <option value="">ค่าเริ่มต้น</option>
                <option value="12px">12px (เล็ก)</option>
                <option value="14px">14px (ปกติ)</option>
                <option value="16px">16px (กลาง)</option>
                <option value="18px">18px (ใหญ่)</option>
                <option value="20px">20px (ใหญ่มาก)</option>
              </GlassSelect>
            </div>
          </div>
        )}

        {/* Preview */}
        <div className="space-y-2 pt-4 border-t border-border/30">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground/90">
            <FontAwesomeIcon icon={faEye} />
            <label>ตัวอย่างการแสดงผล</label>
          </div>
          <div
            className="px-4 py-3 rounded-md border-2 text-base font-medium transition"
            style={getPreviewStyle()}
          >
            ตัวอย่างข้อความ (Sample Text)
          </div>
        </div>
      </GlassCardContent>
    </GlassCard>
  );
}
```

---

## 🛠️ Implementation Steps

### Phase 1: Backend Preparation (No migration needed)

Field model already supports JSONB, just add to validation:

```javascript
// backend/models/Field.js
const Field = sequelize.define('Field', {
  // ... existing fields

  conditional_formatting: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null,
    validate: {
      isValidFormatting(value) {
        if (value === null) return;

        if (!value.enabled || !Array.isArray(value.rules)) {
          throw new Error('Invalid conditional formatting structure');
        }

        value.rules.forEach(rule => {
          if (!rule.id || !rule.condition || !rule.style) {
            throw new Error('Invalid formatting rule structure');
          }
        });
      }
    }
  }
});
```

---

### Phase 2: Form Builder UI

**File**: `src/components/EnhancedFormBuilder.jsx`

Add Conditional Formatting section after Visibility Conditions:

```jsx
{/* ✅ Conditional Formatting Section */}
<div className="space-y-3">
  <div className="flex items-center justify-between">
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={field.conditionalFormatting?.enabled || false}
        onChange={(e) => {
          const enabled = e.target.checked;
          updateField({
            conditionalFormatting: {
              enabled,
              rules: field.conditionalFormatting?.rules || []
            }
          });
        }}
        className="rounded"
      />
      <span className="text-sm font-medium text-foreground">
        Conditional Formatting (จัดรูปแบบตามเงื่อนไข)
      </span>
    </label>

    {field.conditionalFormatting?.enabled && (
      <span className="text-xs text-muted-foreground">
        {field.conditionalFormatting.rules?.length || 0} กฎ
      </span>
    )}
  </div>

  {field.conditionalFormatting?.enabled && (
    <div className="space-y-4 pl-6 animate-in slide-in-from-top-2 duration-300">
      {/* Formatting Rules List */}
      {(field.conditionalFormatting.rules || []).map((rule, index) => (
        <FormattingRuleEditor
          key={rule.id}
          rule={rule}
          index={index}
          onUpdate={(updatedRule) => {
            const newRules = [...(field.conditionalFormatting.rules || [])];
            newRules[index] = updatedRule;
            updateField({
              conditionalFormatting: {
                ...field.conditionalFormatting,
                rules: newRules
              }
            });
          }}
          onDelete={() => {
            const newRules = (field.conditionalFormatting.rules || []).filter((_, i) => i !== index);
            updateField({
              conditionalFormatting: {
                ...field.conditionalFormatting,
                rules: newRules
              }
            });
          }}
        />
      ))}

      {/* Add New Rule Button */}
      <GlassButton
        onClick={() => {
          const newRule = {
            id: `rule_${Date.now()}`,
            order: (field.conditionalFormatting.rules?.length || 0) + 1,
            condition: '',
            style: {
              textColor: null,
              backgroundColor: null,
              fontWeight: 'normal',
              fontSize: null,
              borderColor: null,
              borderWidth: null
            }
          };

          updateField({
            conditionalFormatting: {
              ...field.conditionalFormatting,
              rules: [...(field.conditionalFormatting.rules || []), newRule]
            }
          });
        }}
        className="w-full"
      >
        + เพิ่มกฎใหม่
      </GlassButton>
    </div>
  )}
</div>
```

---

### Phase 3: Display Logic (Utility Function)

**File**: `src/utils/conditionalFormattingEngine.js`

```javascript
import formulaEngine from './formulaEngine';

/**
 * Evaluate conditional formatting rules and return CSS style object
 * @param {Object} field - Field definition with conditionalFormatting
 * @param {*} value - Current field value
 * @param {Object} formData - All form data for formula evaluation
 * @param {Object} fieldMap - Map of field IDs to field objects
 * @returns {Object} CSS style object
 */
export function getConditionalStyle(field, value, formData, fieldMap) {
  // Return empty style if formatting not enabled
  if (!field.conditionalFormatting?.enabled) {
    return {};
  }

  const rules = field.conditionalFormatting.rules || [];

  // Sort rules by order (lower = higher priority)
  const sortedRules = [...rules].sort((a, b) => (a.order || 0) - (b.order || 0));

  // Evaluate rules in order and return first match
  for (const rule of sortedRules) {
    if (!rule.condition || !rule.condition.trim()) {
      continue;
    }

    try {
      // Prepare data for formula evaluation
      const evaluationData = {
        ...formData,
        [field.id]: value
      };

      // Evaluate condition
      const result = formulaEngine.evaluate(
        rule.condition,
        evaluationData,
        fieldMap
      );

      // If condition matches, return style
      if (result) {
        const style = {};

        if (rule.style.textColor) {
          style.color = rule.style.textColor;
        }

        if (rule.style.backgroundColor) {
          style.backgroundColor = rule.style.backgroundColor;
        }

        if (rule.style.fontWeight && rule.style.fontWeight !== 'normal') {
          style.fontWeight = rule.style.fontWeight;
        }

        if (rule.style.fontSize) {
          style.fontSize = rule.style.fontSize;
        }

        if (rule.style.borderColor) {
          style.borderColor = rule.style.borderColor;
          style.borderWidth = rule.style.borderWidth || '2px';
          style.borderStyle = rule.style.borderStyle || 'solid';
        } else if (rule.style.borderWidth) {
          style.borderWidth = rule.style.borderWidth;
          style.borderStyle = rule.style.borderStyle || 'solid';
        }

        console.log(`✅ [ConditionalFormatting] Rule matched for field "${field.title}":`, {
          condition: rule.condition,
          value,
          style
        });

        return style;
      }
    } catch (error) {
      console.warn(`⚠️ [ConditionalFormatting] Error evaluating rule for field "${field.title}":`, error);
    }
  }

  // No matching rule
  return {};
}

export default { getConditionalStyle };
```

---

### Phase 4: Apply in Detail Views

#### 4.1 SubmissionDetail.jsx (Main Form)

```javascript
import { getConditionalStyle } from '../utils/conditionalFormattingEngine';

// In renderFieldValue function:
const renderFieldValue = (field, value) => {
  const isEmpty = !value && value !== 0;

  // ✅ Hide empty fields
  if (isEmpty || value === '-' || value === 'ไม่มีข้อมูล') {
    return null;
  }

  // ✅ Get conditional formatting style
  const conditionalStyle = getConditionalStyle(field, value, submission.data, fieldMap);

  // ... existing field type handling

  // Standard field rendering
  return (
    <div key={field.id} className="space-y-2">
      <label className="block text-sm font-semibold text-orange-300/90">
        {field.title}{field.required && <span className="text-destructive ml-1">*</span>}
      </label>
      <div
        className="text-base font-medium px-3 py-2 rounded-md border"
        style={{
          ...conditionalStyle,
          // Merge with defaults (conditional styles take precedence)
          backgroundColor: conditionalStyle.backgroundColor || 'rgb(var(--background) / 0.3)',
          borderColor: conditionalStyle.borderColor || 'rgb(var(--border) / 0.2)'
        }}
      >
        {formattedValue || 'ไม่มีข้อมูล'}
      </div>
    </div>
  );
};
```

#### 4.2 SubFormDetail.jsx (Sub-Form)

Same implementation as SubmissionDetail.jsx

---

### Phase 5: Apply in Submission Lists

#### 5.1 FormSubmissionList.jsx (Main Form Table)

```jsx
// In table cell rendering
<td className="px-4 py-3">
  {(() => {
    const field = form.fields.find(f => f.id === column.fieldId);
    if (!field) return '-';

    const value = submission.data[column.fieldId];
    const conditionalStyle = getConditionalStyle(
      field,
      value,
      submission.data,
      fieldMap
    );

    return (
      <span
        className="px-2 py-1 rounded"
        style={conditionalStyle}
      >
        {formatCellValue(value, field)}
      </span>
    );
  })()}
</td>
```

#### 5.2 Sub-Form Submission List

Similar implementation in sub-form list rendering

---

## 📋 Testing Checklist

### Form Builder:
- [ ] สามารถเปิด/ปิด Conditional Formatting ได้
- [ ] สามารถเพิ่มกฎใหม่ได้
- [ ] สามารถแก้ไขเงื่อนไขได้ (Formula)
- [ ] สามารถเลือกสีข้อความได้
- [ ] สามารถเลือกสีพื้นหลังได้
- [ ] สามารถเลือกน้ำหนักตัวอักษรได้
- [ ] สามารถลบกฎได้
- [ ] Preview แสดงผลถูกต้อง
- [ ] บันทึกและโหลดข้อมูลถูกต้อง
- [ ] ใช้งานได้ทั้ง Main Form และ Sub-Form

### Display Views:
- [ ] แสดงผลถูกต้องใน Main Form Detail View
- [ ] แสดงผลถูกต้องใน Sub-Form Detail View
- [ ] แสดงผลถูกต้องใน Main Form Submission List
- [ ] แสดงผลถูกต้องใน Sub-Form Submission List
- [ ] หลายกฎทำงานได้ (ตามลำดับ priority)
- [ ] สูตรที่ผิดไม่ทำให้ระบบ crash

---

## 🎨 UI/UX Guidelines

### Color Palette:
- ใช้ Tailwind colors (Red, Orange, Green, Blue, etc.)
- รองรับ Hex colors (#RRGGBB)
- มี color picker ให้เลือก
- มี preset colors สำหรับเลือกเร็ว

### Preview:
- แสดง preview real-time ในขณะตั้งค่า
- ใช้ sample text ชัดเจน

### Performance:
- Cache formula compilation
- Evaluate only visible rows in lists
- Debounce style updates

---

## 📦 Deliverables

1. ✅ Color Picker Component
2. ✅ Formatting Rule Editor Component
3. ✅ Conditional Formatting Engine
4. ✅ Form Builder Integration (Main + Sub-Form)
5. ✅ Detail View Integration (Main + Sub-Form)
6. ✅ List View Integration (Main + Sub-Form)
7. ✅ Documentation
8. ✅ Testing

---

**Version**: 0.7.40-dev
**Estimated Completion**: 2-3 hours of focused development
**Priority**: Medium-High (UX Enhancement)

---

© 2025 Q-Collector Development Team
