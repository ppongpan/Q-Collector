# Conditional Formatting System - REDESIGNED v0.7.40

**Feature**: จัดรูปแบบการแสดงผลตามเงื่อนไข (Conditional Formatting)
**Version**: 0.7.40-dev
**Date**: 2025-10-19
**Design Change**: ✅ MOVED FROM per-field settings TO form-level settings

---

## 🎯 Design Rationale

### ❌ Original Design (Per-Field Configuration)
- Configuration at each field in Form Builder
- Complex UI repeated for every field
- Difficult to manage when only few fields need formatting
- Scattered configuration across many field settings

### ✅ NEW Design (Form-Level Configuration)
- **Central Configuration**: ตั้งค่าที่หน้า Form Settings เพียงที่เดียว
- **Simple UI**: UI กระชับ จัดการง่าย
- **Practical**: เหมาะกับการใช้งานจริง เพราะมีเพียงไม่กี่ฟิลด์ที่ต้องการ formatting
- **Main + Sub-Form Support**: สามารถตั้งค่าฟิลด์จาก Main Form และ Sub-Form ได้ในที่เดียวกัน

---

## 📊 Scope Coverage

### **Configuration Location**:
✅ **Form Settings Page** - ตั้งค่าทุกอย่างในที่เดียว
  - Tab: "การจัดรูปแบบข้อมูล (Conditional Formatting)"
  - สามารถเลือกฟิลด์จาก Main Form
  - สามารถเลือกฟิลด์จาก Sub-Forms
  - จัดการกฎทั้งหมดในหน้าเดียว

### **Display Locations** (Same as before):
1. ✅ Main Form Detail View (SubmissionDetail.jsx)
2. ✅ Sub-Form Detail View (SubFormDetail.jsx)
3. ✅ Main Form Submission List (FormSubmissionList.jsx)
4. ✅ Sub-Form Submission Lists

---

## 🗂️ Data Structure

### Form Model - Settings JSONB Column

**Storage**: `forms.settings` JSONB column (already exists, no migration needed!)

```javascript
// Form.settings structure
{
  telegram: { ... },  // existing telegram settings

  // ✅ NEW: Conditional Formatting Rules
  conditionalFormatting: {
    enabled: true,
    rules: [
      {
        id: "rule_1",
        order: 1,                                    // Priority (lower = higher priority)
        fieldId: "field_abc123",                     // Main form field ID
        fieldSource: "main",                          // "main" | "subform"
        subFormId: null,                              // Sub-form ID (if fieldSource === "subform")
        fieldTitle: "สถานะการขาย",                    // Field display name (for UI)
        condition: "[สถานะการขาย] = \"ปิดการขายได้\"", // Formula expression
        style: {
          textColor: "#22c55e",                       // Green text
          backgroundColor: null,
          fontWeight: "bold",
          fontSize: null,
          borderColor: null,
          borderWidth: null
        }
      },
      {
        id: "rule_2",
        order: 2,
        fieldId: "field_def456",                     // Another main form field
        fieldSource: "main",
        subFormId: null,
        fieldTitle: "ยอดขาย",
        condition: "[ยอดขาย] > 100000",
        style: {
          textColor: "#fbbf24",                       // Amber text
          backgroundColor: "#fef3c7",                 // Light amber background
          fontWeight: "bold"
        }
      },
      {
        id: "rule_3",
        order: 3,
        fieldId: "field_sub789",                     // Sub-form field
        fieldSource: "subform",
        subFormId: "subform_xyz",
        fieldTitle: "สถานะงาน (ซ่อมบำรุง)",           // Include subform context
        condition: "[สถานะงาน] = \"เสร็จสิ้น\"",
        style: {
          textColor: "#ffffff",
          backgroundColor: "#22c55e",
          fontWeight: "bold"
        }
      }
    ]
  }
}
```

### Why This Structure Works:

1. **No Database Migration**: Uses existing `forms.settings` JSONB column
2. **Centralized**: All formatting rules in one place
3. **Field Reference**: Each rule references specific field by ID
4. **Source Tracking**: Knows if field is from main form or sub-form
5. **Display Name**: Stores fieldTitle for UI display (easier than looking up)
6. **Formula-Based**: Uses same formula engine as visibility conditions

---

## 🎨 UI Design - Form Settings Tab

### Location: EnhancedFormBuilder.jsx

Add new tab after "ตั้งค่าการแจ้งเตือน Telegram":

```jsx
{/* Tab Navigation */}
<div className="flex gap-2 mb-6 border-b border-border/30">
  <button onClick={() => setActiveTab('fields')}>
    ฟิลด์ของฟอร์ม
  </button>
  <button onClick={() => setActiveTab('telegram')}>
    ตั้งค่า Telegram
  </button>
  <button onClick={() => setActiveTab('formatting')}>
    การจัดรูปแบบข้อมูล (Conditional Formatting) {/* ✅ NEW TAB */}
  </button>
</div>
```

### Form Settings Conditional Formatting Tab UI:

```
┌──────────────────────────────────────────────────────────────┐
│  การจัดรูปแบบข้อมูลตามเงื่อนไข (Conditional Formatting)       │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  [✓] เปิดใช้งาน Conditional Formatting                        │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  กฎที่ 1                                    [⚙️] [🗑️]  │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │  ฟิลด์:     [สถานะการขาย ▼]  (Main Form)              │  │
│  │  เงื่อนไข:  [สถานะการขาย] = "ปิดการขายได้"            │  │
│  │  สีข้อความ:  [⬛ Green #22c55e] [🎨 Color Picker]      │  │
│  │  สีพื้นหลัง: [⬜ ไม่กำหนด]                              │  │
│  │  น้ำหนัก:     [Bold ▼]                                │  │
│  │  ตัวอย่าง:   [ปิดการขายได้] ← Bold green text        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  กฎที่ 2                                    [⚙️] [🗑️]  │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │  ฟิลด์:     [สถานะงาน ▼]  (Sub-Form: ซ่อมบำรุง)       │  │
│  │  เงื่อนไข:  [สถานะงาน] = "เสร็จสิ้น"                  │  │
│  │  สีข้อความ:  [⬜ White #ffffff]                        │  │
│  │  สีพื้นหลัง: [⬛ Green #22c55e]                        │  │
│  │  น้ำหนัก:     [Bold ▼]                                │  │
│  │  ตัวอย่าง:   [เสร็จสิ้น] ← White text on green       │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
│  [+ เพิ่มกฎใหม่]                                              │
│                                                                │
│  [💾 บันทึกการตั้งค่า]                                        │
└──────────────────────────────────────────────────────────────┘
```

---

## 🛠️ UI Components

### 1. Field Selector Dropdown

**Displays all available fields from Main Form + Sub-Forms:**

```jsx
<GlassSelect
  value={rule.fieldId}
  onChange={(e) => updateRuleField(ruleIndex, e.target.value)}
>
  <optgroup label="Main Form">
    <option value="field_1">ชื่อ-นามสกุล</option>
    <option value="field_2">สถานะการขาย</option>
    <option value="field_3">ยอดขาย</option>
  </optgroup>

  <optgroup label="Sub-Form: ซ่อมบำรุง">
    <option value="field_sub_1" data-subform="subform_1">
      สถานะงาน
    </option>
    <option value="field_sub_2" data-subform="subform_1">
      วันที่เสร็จสิ้น
    </option>
  </optgroup>

  <optgroup label="Sub-Form: การติดตาม">
    <option value="field_sub_3" data-subform="subform_2">
      สถานะติดตาม
    </option>
  </optgroup>
</GlassSelect>
```

**Data Preparation:**

```javascript
// Prepare field options from form structure
const getFieldOptions = () => {
  const options = [];

  // Main form fields
  options.push({
    group: "Main Form",
    fields: form.fields.map(f => ({
      id: f.id,
      title: f.title,
      source: "main",
      subFormId: null
    }))
  });

  // Sub-form fields
  form.subForms?.forEach(subForm => {
    options.push({
      group: `Sub-Form: ${subForm.title}`,
      fields: subForm.fields.map(f => ({
        id: f.id,
        title: f.title,
        source: "subform",
        subFormId: subForm.id
      }))
    });
  });

  return options;
};
```

---

### 2. Color Picker Component

**File**: `src/components/ui/color-picker.jsx`

**Features**:
- 22 preset Tailwind colors
- HTML5 color input for custom colors
- Clear button
- Current color display with hex code

**UI Design**:

```
┌────────────────────────────────────────────┐
│  สีข้อความ                                  │
│                                             │
│  [Current: ■ #22c55e]  [Clear]             │
│                                             │
│  Preset Colors:                             │
│  [■][■][■][■][■][■][■][■][■][■]           │
│  [■][■][■][■][■][■][■][■][■][■]           │
│  [■][■]                                     │
│                                             │
│  Custom: [🎨 Color Picker]                 │
└────────────────────────────────────────────┘
```

*(Implementation code same as original CONDITIONAL-FORMATTING-PLAN.md lines 100-190)*

---

### 3. Formatting Rule Card

**File**: `src/components/ui/formatting-rule-card.jsx`

**Simplified version without collapsible advanced options**:

```jsx
export function FormattingRuleCard({
  rule,
  index,
  fieldOptions,
  onUpdate,
  onDelete
}) {
  return (
    <GlassCard className="p-4 border border-border/50">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-orange-400">
            กฎที่ {index + 1}
          </h4>
          <button onClick={onDelete} className="text-destructive">
            <FontAwesomeIcon icon={faTrash} />
          </button>
        </div>

        {/* Field Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">ฟิลด์</label>
          <GlassSelect value={rule.fieldId} onChange={...}>
            {fieldOptions.map(group => (
              <optgroup key={group.group} label={group.group}>
                {group.fields.map(field => (
                  <option key={field.id} value={field.id}>
                    {field.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </GlassSelect>
          <p className="text-xs text-muted-foreground">
            {rule.fieldSource === 'main'
              ? '📄 Main Form'
              : `📋 Sub-Form: ${getSubFormTitle(rule.subFormId)}`}
          </p>
        </div>

        {/* Condition Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">เงื่อนไข</label>
          <GlassTextarea
            value={rule.condition}
            onChange={...}
            placeholder='[สถานะ] = "ปิดการขายได้"'
            rows={2}
          />
        </div>

        {/* Style Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ColorPicker
            label="สีข้อความ"
            value={rule.style.textColor}
            onChange={...}
          />
          <ColorPicker
            label="สีพื้นหลัง"
            value={rule.style.backgroundColor}
            onChange={...}
          />
        </div>

        {/* Font Weight */}
        <div className="space-y-2">
          <label className="text-sm font-medium">น้ำหนักตัวอักษร</label>
          <GlassSelect value={rule.style.fontWeight} onChange={...}>
            <option value="normal">ปกติ</option>
            <option value="600">กลาง</option>
            <option value="bold">หนา</option>
          </GlassSelect>
        </div>

        {/* Preview */}
        <div className="space-y-2 pt-2 border-t border-border/30">
          <label className="text-sm font-medium">ตัวอย่าง</label>
          <div
            className="px-4 py-3 rounded-md border-2"
            style={{
              color: rule.style.textColor || undefined,
              backgroundColor: rule.style.backgroundColor || undefined,
              fontWeight: rule.style.fontWeight || undefined
            }}
          >
            ตัวอย่างข้อความ
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
```

---

## 📋 Implementation Plan

### Phase 1: Backend (No Changes Needed!)

✅ Form model already has `settings` JSONB column
✅ No migration required
✅ Just update validation to accept conditionalFormatting structure

**File**: `backend/models/Form.js`

```javascript
settings: {
  type: DataTypes.JSONB,
  allowNull: false,
  defaultValue: {},
  validate: {
    isValidSettings(value) {
      // ... existing validation

      // ✅ NEW: Validate conditional formatting
      if (value.conditionalFormatting) {
        const cf = value.conditionalFormatting;
        if (typeof cf.enabled !== 'boolean') {
          throw new Error('conditionalFormatting.enabled must be boolean');
        }
        if (cf.rules && !Array.isArray(cf.rules)) {
          throw new Error('conditionalFormatting.rules must be array');
        }
      }
    }
  }
}
```

---

### Phase 2: Color Picker Component

**File**: `src/components/ui/color-picker.jsx`

- Create reusable color picker with preset colors
- Support clear functionality
- Display hex codes

*(Same implementation as CONDITIONAL-FORMATTING-PLAN.md lines 100-190)*

---

### Phase 3: Formatting Rule Card Component

**File**: `src/components/ui/formatting-rule-card.jsx`

- Field selector (Main + Sub-Forms)
- Condition input
- Color pickers (text + background)
- Font weight selector
- Live preview

---

### Phase 4: Form Settings Tab

**File**: `src/components/EnhancedFormBuilder.jsx`

**Add new tab**:

```jsx
const [activeTab, setActiveTab] = useState('fields'); // 'fields' | 'telegram' | 'formatting'

// In render:
{activeTab === 'formatting' && (
  <ConditionalFormattingSettings
    form={formData}
    onUpdate={(newSettings) => {
      setFormData({
        ...formData,
        settings: {
          ...formData.settings,
          conditionalFormatting: newSettings
        }
      });
    }}
  />
)}
```

**Create ConditionalFormattingSettings component**:

```jsx
function ConditionalFormattingSettings({ form, onUpdate }) {
  const [enabled, setEnabled] = useState(
    form.settings?.conditionalFormatting?.enabled || false
  );
  const [rules, setRules] = useState(
    form.settings?.conditionalFormatting?.rules || []
  );

  // Prepare field options
  const fieldOptions = useMemo(() => {
    const options = [];

    // Main form fields
    options.push({
      group: "Main Form",
      fields: form.fields.map(f => ({
        id: f.id,
        title: f.title,
        source: "main",
        subFormId: null
      }))
    });

    // Sub-form fields
    form.subForms?.forEach(subForm => {
      options.push({
        group: `Sub-Form: ${subForm.title}`,
        fields: subForm.fields.map(f => ({
          id: f.id,
          title: f.title,
          source: "subform",
          subFormId: subForm.id
        }))
      });
    });

    return options;
  }, [form.fields, form.subForms]);

  const addRule = () => {
    const newRule = {
      id: `rule_${Date.now()}`,
      order: rules.length + 1,
      fieldId: '',
      fieldSource: 'main',
      subFormId: null,
      fieldTitle: '',
      condition: '',
      style: {
        textColor: null,
        backgroundColor: null,
        fontWeight: 'normal'
      }
    };
    setRules([...rules, newRule]);
  };

  const updateRule = (index, updates) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], ...updates };
    setRules(newRules);
    onUpdate({ enabled, rules: newRules });
  };

  const deleteRule = (index) => {
    const newRules = rules.filter((_, i) => i !== index);
    setRules(newRules);
    onUpdate({ enabled, rules: newRules });
  };

  return (
    <div className="space-y-6">
      {/* Enable Toggle */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            setEnabled(e.target.checked);
            onUpdate({ enabled: e.target.checked, rules });
          }}
        />
        <label className="text-base font-medium">
          เปิดใช้งาน Conditional Formatting
        </label>
      </div>

      {enabled && (
        <>
          {/* Rules List */}
          <div className="space-y-4">
            {rules.map((rule, index) => (
              <FormattingRuleCard
                key={rule.id}
                rule={rule}
                index={index}
                fieldOptions={fieldOptions}
                onUpdate={(updates) => updateRule(index, updates)}
                onDelete={() => deleteRule(index)}
              />
            ))}
          </div>

          {/* Add Rule Button */}
          <GlassButton onClick={addRule} className="w-full">
            + เพิ่มกฎใหม่
          </GlassButton>
        </>
      )}
    </div>
  );
}
```

---

### Phase 5: Conditional Formatting Engine

**File**: `src/utils/conditionalFormattingEngine.js`

```javascript
import formulaEngine from './formulaEngine';

/**
 * Get conditional formatting style for a field value
 * @param {Object} formSettings - Form settings object
 * @param {String} fieldId - Field ID to check
 * @param {*} value - Current field value
 * @param {Object} formData - All form data for formula evaluation
 * @param {Object} fieldMap - Map of field IDs to field objects
 * @returns {Object} CSS style object
 */
export function getConditionalStyle(formSettings, fieldId, value, formData, fieldMap) {
  // Check if conditional formatting is enabled
  if (!formSettings?.conditionalFormatting?.enabled) {
    return {};
  }

  const rules = formSettings.conditionalFormatting.rules || [];

  // Find rules for this specific field
  const fieldRules = rules
    .filter(rule => rule.fieldId === fieldId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // Evaluate rules in order and return first match
  for (const rule of fieldRules) {
    if (!rule.condition || !rule.condition.trim()) {
      continue;
    }

    try {
      // Prepare data for formula evaluation
      const evaluationData = {
        ...formData,
        [fieldId]: value
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

        console.log(`✅ [ConditionalFormatting] Rule matched for field ${fieldId}:`, {
          condition: rule.condition,
          value,
          style
        });

        return style;
      }
    } catch (error) {
      console.warn(`⚠️ [ConditionalFormatting] Error evaluating rule for field ${fieldId}:`, error);
    }
  }

  return {};
}

export default { getConditionalStyle };
```

---

### Phase 6: Apply in Display Views

#### 6.1 SubmissionDetail.jsx (Main Form)

```javascript
import { getConditionalStyle } from '../utils/conditionalFormattingEngine';

// In component:
const renderFieldValue = (field, value) => {
  // ... existing code

  // ✅ Get conditional formatting style
  const conditionalStyle = getConditionalStyle(
    form.settings,        // Form settings
    field.id,             // Field ID
    value,                // Field value
    submission.data,      // All form data
    fieldMap              // Field map
  );

  return (
    <div key={field.id} className="space-y-2">
      <label>{field.title}</label>
      <div
        className="px-3 py-2 rounded-md border"
        style={{
          ...conditionalStyle,  // Apply conditional formatting
          backgroundColor: conditionalStyle.backgroundColor || 'rgb(var(--background) / 0.3)',
          borderColor: conditionalStyle.borderColor || 'rgb(var(--border) / 0.2)'
        }}
      >
        {formattedValue}
      </div>
    </div>
  );
};
```

#### 6.2 SubFormDetail.jsx (Sub-Form)

**Same implementation** - but need to pass parent form settings:

```javascript
// In SubFormDetail component props:
const SubFormDetail = ({ submission, subForm, parentForm }) => {
  // Use parentForm.settings for conditional formatting
  const conditionalStyle = getConditionalStyle(
    parentForm.settings,  // Parent form settings!
    field.id,
    value,
    submission.data,
    fieldMap
  );

  // ... rest same as SubmissionDetail
};
```

#### 6.3 FormSubmissionList.jsx (Table Cells)

```javascript
<td className="px-4 py-3">
  {(() => {
    const field = form.fields.find(f => f.id === column.fieldId);
    if (!field) return '-';

    const value = submission.data[column.fieldId];
    const conditionalStyle = getConditionalStyle(
      form.settings,
      field.id,
      value,
      submission.data,
      fieldMap
    );

    return (
      <span
        className="px-2 py-1 rounded inline-block"
        style={conditionalStyle}
      >
        {formatCellValue(value, field)}
      </span>
    );
  })()}
</td>
```

---

## 📋 Testing Checklist

### Form Settings UI:
- [ ] สามารถเปิด/ปิด Conditional Formatting ได้
- [ ] Field dropdown แสดงฟิลด์ทั้ง Main Form และ Sub-Forms
- [ ] สามารถเพิ่มกฎใหม่ได้
- [ ] สามารถแก้ไขเงื่อนไขได้
- [ ] Color picker ทำงานถูกต้อง (preset + custom)
- [ ] สามารถลบกฎได้
- [ ] Preview แสดงผลถูกต้อง
- [ ] บันทึกและโหลดข้อมูลถูกต้อง

### Display Views:
- [ ] แสดงผลถูกต้องใน Main Form Detail View
- [ ] แสดงผลถูกต้องใน Sub-Form Detail View
- [ ] แสดงผลถูกต้องใน Main Form Submission List
- [ ] แสดงผลถูกต้องใน Sub-Form Submission List
- [ ] หลายกฎสำหรับฟิลด์เดียวกันทำงานได้ (ตามลำดับ priority)
- [ ] สูตรที่ผิดไม่ทำให้ระบบ crash

### Edge Cases:
- [ ] ฟิลด์ที่ถูกลบแล้ว (field deleted) ไม่ทำให้ระบบ crash
- [ ] Sub-form ที่ถูกลบแล้ว (subform deleted) ไม่ทำให้ระบบ crash
- [ ] กฎที่ไม่มี fieldId ถูก ignore
- [ ] เงื่อนไขว่าง (empty condition) ถูก skip

---

## 🎨 UI/UX Benefits of New Design

### ✅ Advantages:

1. **Centralized Management**
   - จัดการทุกกฎในที่เดียว
   - ง่ายต่อการดู overview ของ formatting ทั้งหมด
   - ไม่ต้องเปิดแก้ไขฟิลด์ทีละฟิลด์

2. **Better Field Selection**
   - เห็นฟิลด์ทั้งหมด (Main + Sub-Forms) ในที่เดียว
   - Grouped dropdown แยกตาม Main/Sub-Form ชัดเจน
   - ระบุ context ของฟิลด์ได้ดี

3. **Cleaner Form Builder**
   - Field settings ไม่ซับซ้อน
   - Form Builder โหลดเร็วขึ้น
   - UI กระชับ เหมาะกับจำนวนกฎที่ไม่เยอะ

4. **Easier to Review**
   - เห็นกฎทั้งหมดในหน้าเดียว
   - เปรียบเทียบกฎต่างๆ ได้ง่าย
   - ตรวจสอบความซ้ำซ้อนได้ง่าย

---

## 📦 Deliverables

### Components:
1. ✅ `src/components/ui/color-picker.jsx` - Color picker with presets
2. ✅ `src/components/ui/formatting-rule-card.jsx` - Rule editor card
3. ✅ `src/components/ConditionalFormattingSettings.jsx` - Settings tab component

### Utilities:
4. ✅ `src/utils/conditionalFormattingEngine.js` - Style evaluation engine

### Integration:
5. ✅ EnhancedFormBuilder.jsx - Add formatting settings tab
6. ✅ SubmissionDetail.jsx - Apply formatting in main form detail
7. ✅ SubFormDetail.jsx - Apply formatting in sub-form detail
8. ✅ FormSubmissionList.jsx - Apply formatting in table cells

### Backend:
9. ✅ Form model validation - Validate conditionalFormatting structure

### Documentation:
10. ✅ This document - Complete redesign specification
11. ✅ qtodo.md - Implementation task breakdown

---

## ⏱️ Estimated Effort

**Total**: 3-4 hours

- Phase 1 (Backend): 15 min
- Phase 2 (Color Picker): 30 min
- Phase 3 (Rule Card): 45 min
- Phase 4 (Settings Tab): 60 min
- Phase 5 (Engine): 30 min
- Phase 6 (Display Views): 45 min
- Testing: 30 min

---

## 🎯 Success Criteria

1. ✅ User can configure formatting rules in Form Settings
2. ✅ Rules apply to both Main Form and Sub-Form fields
3. ✅ Formatting displays correctly in all views
4. ✅ No performance degradation
5. ✅ Easy to use and understand
6. ✅ No database migration required

---

**Version**: 0.7.40-dev (Redesigned)
**Date**: 2025-10-19
**Status**: ✅ Ready for Implementation

© 2025 Q-Collector Development Team
