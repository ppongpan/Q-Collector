# Q-Collector UI Interaction Guide

**Version:** 0.7.2-dev
**Date:** 2025-10-05

Complete guide for understanding Q-Collector's tooltip-based UI interactions

---

## 📋 Table of Contents

1. [InlineEdit Pattern](#inlineedit-pattern)
2. [Field Card Interactions](#field-card-interactions)
3. [Toggle Icon System](#toggle-icon-system)
4. [Sub-Form Management](#sub-form-management)
5. [Field Type Selector](#field-type-selector)
6. [Testing Considerations](#testing-considerations)

---

## 1. InlineEdit Pattern

### 📍 Location: `src/components/EnhancedFormBuilder.jsx:116-200`

**Component:** `InlineEdit`

### Usage

InlineEdit is used for **click-to-edit** fields throughout the form builder:

#### Main Form
- **Form Title**: "คลิกเพื่อระบุชื่อฟอร์ม..." (Line 1587)
- **Form Description**: "คลิกเพื่อเพิ่มคำอธิบายฟอร์ม..." (Line 1595)

#### Sub-Form
- **SubForm Title**: "คลิกเพื่อระบุชื่อฟอร์มย่อย..." (Line 924)
- **SubForm Description**: "คลิกเพื่อเพิ่มคำอธิบายฟอร์มย่อย..." (Line 930)

### Behavior

```javascript
1. Click text → Edit mode activated
2. Input field appears with current value selected
3. Type new value
4. Press Enter → Save
5. Press Escape → Cancel
6. Click outside → Save automatically
```

### Properties

| Prop | Type | Description |
|------|------|-------------|
| `value` | string | Current value |
| `onChange` | function | Callback when value changes |
| `placeholder` | string | Placeholder text |
| `isTitle` | boolean | If true, renders as h1/h2 |
| `dataTestId` | string | Test ID for automation |

### Testing Example

```javascript
// Playwright example
await page.click('h1:has-text("คลิกเพื่อระบุชื่อฟอร์ม")');
await page.keyboard.type('ฟอร์มทดสอบ');
await page.keyboard.press('Enter');
```

---

## 2. Field Card Interactions

### 📍 Location: `src/components/EnhancedFormBuilder.jsx:300-700`

**Component:** `FieldBuilder`

### Two States: Collapsed vs Expanded

#### Collapsed State (Default)
- Shows **Field Preview Row** (src/components/ui/field-preview-row.jsx)
- Displays field icon, name, and preview input
- Shows **Toggle Icons** in top-right corner
- **Click anywhere on card** → Expand

#### Expanded State
- Shows **Full Field Configuration**
- Title input (GlassInput with `data-testid="field-title-input"`)
- Description textarea
- Placeholder input (for text-based fields)
- Conditional visibility settings
- Options configuration (for multiple_choice, etc.)

### Click Behavior

```
┌─────────────────────────────────────────────┐
│  [Icon] ชื่อฟิลด์            [🔴] [🔵] [🟢] │  ← Collapsed (click to expand)
│  [Preview Input...........................]  │
└─────────────────────────────────────────────┘

Click here ↑ (except icons) → Expand

┌─────────────────────────────────────────────┐
│  [Icon] ชื่อฟิลด์            [🔴] [🔵] [🟢] │  ← Header (click to collapse)
├─────────────────────────────────────────────┤
│  ชื่อฟิลด์: [Input]                         │
│  คำอธิบาย: [Textarea]                       │
│  Placeholder: [Input]                       │
│  ...more settings...                        │
└─────────────────────────────────────────────┘

Click header ↑ → Collapse
```

### Testing Example

```javascript
// Expand field card
const fieldCard = page.locator('[data-testid="field-card"]:has-text("ชื่อฟิลด์")');
await fieldCard.click({ position: { x: 100, y: 20 } }); // Click header

// Wait for expansion
await page.waitForTimeout(500);

// Edit field title (when expanded)
await page.fill('input[data-testid="field-title-input"]', 'ชื่อใหม่');
```

---

## 3. Toggle Icon System

### 📍 Location: `src/components/ui/field-toggle-buttons.jsx`

**Component:** `FieldToggleButtons`

### Three Toggle Icons (Tooltip-Based)

These icons appear in the **top-right corner** of collapsed field cards:

#### 1️⃣ Required Toggle (Red !)

**Icon:** `faExclamationTriangle`
**Color:** Red (#ef4444)
**Tooltip:**
- Off: "ทำให้เป็นฟิลด์จำเป็น"
- On: "ฟิลด์จำเป็น (คลิกเพื่อยกเลิก)"

**Behavior:**
- Click → Toggle `field.required`
- **Cascade Effect**: Unchecking also unchecks `showInTable` and `sendTelegram`

**Visual Indicator:**
- Active: Red background (`bg-red-500/20`) + red dot badge

**Code:** Lines 114-129

---

#### 2️⃣ Show in Table Toggle (Blue Table)

**Icon:** `faTable`
**Color:** Blue (#3b82f6)
**Tooltip:**
- Disabled: "ต้องเป็นฟิลด์จำเป็นก่อน"
- Max reached: "เกินจำนวนสูงสุด (5/5)"
- Off: "แสดงในตาราง"
- On: "แสดงในตาราง (คลิกเพื่อยกเลิก)"

**Behavior:**
- **Only clickable when `required=true`**
- **Maximum 5 fields** can show in table (`maxTableFields=5`)
- Click → Toggle `field.showInTable`

**Visual Indicator:**
- Active: Blue background (`bg-blue-500/20`) + blue dot badge
- Disabled: Gray background, cursor-not-allowed

**Dependencies:**
```javascript
// Cannot enable if:
if (!field.required) return; // Not required
if (tableFieldCount >= 5 && !field.showInTable) return; // Max reached
```

**Code:** Lines 132-160

---

#### 3️⃣ Telegram Notification Toggle (Green Chat)

**Icon:** `faComments`
**Color:** Green (#22c55e)
**Tooltip:**
- Off: "เปิดแจ้งเตือน Telegram"
- On: "แจ้งเตือน Telegram (คลิกเพื่อยกเลิก)"

**Behavior:**
- Click → Toggle `field.sendTelegram`
- **Only visible for Main Form fields** (`isSubForm=false`)

**Visual Indicator:**
- Active: Green background (`bg-green-500/20`) + green dot badge

**Code:** Lines 163-180

---

### Toggle Workflow Example

```
Step 1: New field (all off)
[⚪] [⚪] [⚪]

Step 2: Click Required
[🔴] [⚪] [⚪]  ← Table now clickable

Step 3: Click Table
[🔴] [🔵] [⚪]

Step 4: Click Telegram
[🔴] [🔵] [🟢]

Step 5: Click Required again (CASCADE)
[⚪] [⚪] [⚪]  ← All reset!
```

### Testing Example

```javascript
// Helper function
async function toggleFieldIcon(page, fieldSelector, tooltipText) {
  const button = await page.locator(`${fieldSelector} button[title*="${tooltipText}"]`);
  await button.click();
  await page.waitForTimeout(300);
}

// Usage
const fieldCard = '[data-testid="field-card"]:has-text("ชื่อ-นามสกุล")';

// Toggle required
await toggleFieldIcon(page, fieldCard, 'ทำให้เป็นฟิลด์จำเป็น');

// Toggle table (only works if required=true)
await toggleFieldIcon(page, fieldCard, 'แสดงในตาราง');

// Toggle telegram
await toggleFieldIcon(page, fieldCard, 'เปิดแจ้งเตือน Telegram');
```

---

## 4. Sub-Form Management

### 📍 Location: `src/components/EnhancedFormBuilder.jsx:704-1010`

**Component:** `SubFormBuilder`

### Sub-Form Card Structure

```
┌─────────────────────────────────────────────────────┐
│  [📚] ข้อมูลที่อยู่                   [⬇️] [⋮]     │  ← Header
│       3 ฟิลด์                                        │
├─────────────────────────────────────────────────────┤
│  ชื่อ: ข้อมูลที่อยู่                                │
│  คำอธิบาย: กรอกข้อมูลที่อยู่                       │
│                                                      │
│  [Tabs: ฟิลด์ | ตั้งค่า]                           │
│                                                      │
│  Field 1 ...                                        │
│  Field 2 ...                                        │
│  [+ เพิ่มฟิลด์]                                     │
└─────────────────────────────────────────────────────┘
```

### Actions Menu (⋮)

Click **three-dot menu** → Dropdown:

| Action | Icon | Function |
|--------|------|----------|
| ย้ายขึ้น | faArrowUp | `onMoveUp()` |
| ย้ายลง | faArrowDown | `onMoveDown()` |
| ทำสำเนา | faCopy | `onDuplicate()` |
| ลบ | faTrashAlt | `onRemove()` |

### Expand/Collapse

- **Collapse Icon (⬇️)**: Click to toggle
- State stored in `isExpanded`

### Drag & Drop

**Library:** `@dnd-kit/core` + `@dnd-kit/sortable`

**Features:**
- Drag handle: Entire SubForm card
- Reorder SubForms
- Reorder Fields within SubForm

### Testing Example

```javascript
// Add SubForm
await page.click('button:has-text("เพิ่มฟอร์มย่อย")');
await page.waitForTimeout(1000);

// Set SubForm title
await page.click('[data-subform-id] >> text="คลิกเพื่อระบุชื่อฟอร์มย่อย"');
await page.keyboard.type('ข้อมูลที่อยู่');
await page.keyboard.press('Enter');

// Open dropdown menu
await page.click('[data-subform-id] >> button[title*="ตัวเลือกเพิ่มเติม"]');

// Click duplicate
await page.click('text="ทำสำเนา"');

// Verify
const copyExists = await page.locator('text="ข้อมูลที่อยู่ (สำเนา)"').count() > 0;
expect(copyExists).toBe(true);
```

---

## 5. Field Type Selector

### 📍 Location: `src/components/ui/custom-select.jsx`

**Component:** `CustomSelect`

### 17 Field Types

| Thai Label | English | Icon | Color |
|------------|---------|------|-------|
| ข้อความสั้น | short_answer | faTextHeight | blue |
| ข้อความยาว | paragraph | faParagraph | indigo |
| อีเมล | email | faAt | green |
| เบอร์โทร | phone | faPhone | emerald |
| ตัวเลข | number | faNumbers | purple |
| ลิงก์ | url | faLink | cyan |
| แนบไฟล์ | file_upload | faFileAlt | orange |
| แนบรูป | image_upload | faImage | pink |
| วันที่ | date | faCalendarAlt | red |
| เวลา | time | faClock | amber |
| วันที่และเวลา | datetime | faCalendarDay | rose |
| ตัวเลือกหลายแบบ | multiple_choice | faListUl | teal |
| คะแนนดาว | rating | faStar | yellow |
| แถบเลื่อน | slider | faSliders | violet |
| พิกัด GPS | lat_long | faMapMarkerAlt | lime |
| จังหวัด | province | faGlobeAmericas | sky |
| โรงงาน | factory | faIndustry | stone |

### Usage

```javascript
// Select field type
await page.click('select[data-testid="field-type-select"]');
await page.click('text="อีเมล"'); // Select by Thai label
```

---

## 6. Testing Considerations

### Key Selectors

```javascript
// Form Title (InlineEdit)
'h1:has-text("คลิกเพื่อระบุชื่อฟอร์ม")'

// Form Description (InlineEdit)
'p:has-text("คลิกเพื่อเพิ่มคำอธิบายฟอร์ม")'

// Add Field Button
'button[data-testid="add-field-button"]'
'button:has-text("เพิ่มฟิลด์")'

// Field Card
'[data-testid="field-card"]'
'[data-testid="field-card"]:has-text("ชื่อฟิลด์")'

// Field Title Input (when expanded)
'input[data-testid="field-title-input"]'

// Toggle Icons (by tooltip)
'button[title*="ทำให้เป็นฟิลด์จำเป็น"]'
'button[title*="แสดงในตาราง"]'
'button[title*="เปิดแจ้งเตือน Telegram"]'

// SubForm
'[data-subform-id]'
'button:has-text("เพิ่มฟอร์มย่อย")'

// Save Button
'button:has-text("บันทึกฟอร์ม")'
```

### Wait Strategies

```javascript
// After adding field/subform
await page.waitForTimeout(1000);

// After clicking InlineEdit
await page.waitForTimeout(300);

// After toggling icon
await page.waitForTimeout(300);

// After saving form
await page.waitForSelector('text=/บันทึกสำเร็จ|Success/i', { timeout: 10000 });
```

### Common Pitfalls

❌ **Don't:**
```javascript
// Wrong: Clicking toggle when not visible
await page.click('button[title*="แสดงในตาราง"]'); // Fails if required=false
```

✅ **Do:**
```javascript
// Right: Check required first
await page.click('button[title*="ทำให้เป็นฟิลด์จำเป็น"]');
await page.waitForTimeout(300);
await page.click('button[title*="แสดงในตาราง"]'); // Now visible
```

---

## 🎯 Quick Reference Cheat Sheet

### Form Builder Actions

| Action | Selector/Method |
|--------|-----------------|
| Create new form | `button:has-text("สร้างฟอร์มใหม่")` |
| Set form title | `setInlineEditValue(page, 'h1:has-text("คลิก...")', 'ชื่อฟอร์ม')` |
| Add field | `button:has-text("เพิ่มฟิลด์")` |
| Expand field | `fieldCard.click({ position: { x: 100, y: 20 } })` |
| Toggle required | `toggleFieldIcon(page, fieldCard, 'ทำให้เป็นฟิลด์จำเป็น')` |
| Toggle table | `toggleFieldIcon(page, fieldCard, 'แสดงในตาราง')` |
| Toggle telegram | `toggleFieldIcon(page, fieldCard, 'เปิดแจ้งเตือน Telegram')` |
| Add SubForm | `button:has-text("เพิ่มฟอร์มย่อย")` |
| SubForm menu | `[data-subform-id] >> button[title*="ตัวเลือกเพิ่มเติม"]` |
| Save form | `button:has-text("บันทึกฟอร์ม")` |

### Helper Functions (Playwright)

```javascript
async function setInlineEditValue(page, selector, text) {
  await page.click(selector);
  await page.waitForTimeout(300);
  await page.keyboard.press('Control+A');
  await page.keyboard.type(text);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
}

async function toggleFieldIcon(page, fieldCardSelector, tooltipText) {
  const button = await page.locator(`${fieldCardSelector} button[title*="${tooltipText}"]`);
  await button.click();
  await page.waitForTimeout(300);
}

async function expandFieldCard(page, fieldTitle) {
  const fieldCard = page.locator(`[data-testid="field-card"]:has-text("${fieldTitle}")`).first();
  await fieldCard.click({ position: { x: 100, y: 20 } });
  await page.waitForTimeout(500);
}
```

---

## 📚 Related Documentation

- **CLAUDE.md** - Project overview and version history
- **tests/e2e/form-with-subform-creation.spec.js** - Complete E2E test examples
- **src/components/EnhancedFormBuilder.jsx** - Main form builder component
- **src/components/ui/field-toggle-buttons.jsx** - Toggle icon implementation

---

**Last Updated:** 2025-10-05
**Q-Collector Version:** 0.7.2-dev
