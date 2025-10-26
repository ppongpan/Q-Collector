# PDPA UI Location Guide

## Form Builder Navigation Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Q-Collector - Form Builder                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Main] [Sub Forms] [Notifications] [Settings] ← Tab Navigation
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Settings Tab Content Order

When you click on **[Settings]** tab, you will see sections in this order:

```
Settings Tab
├─ 1. ตั้งค่าฟอร์ม (Form Settings Header)
│
├─ 2. การควบคุมสิทธิ์ผู้ใช้ (User Role Access Control)
│   └─ Badge buttons for role selection
│
├─ 3. รูปแบบวันที่ (Date Format Settings)
│   └─ Christian/Buddhist year format
│
├─ 4. Enhanced Telegram Notification Settings
│   └─ Bot token, group ID, field selection
│
├─ 5. 🆕 Privacy Notice Settings ← NEW!
│   ├─ Enable/Disable toggle
│   ├─ Mode selector (Disabled/Custom/Link)
│   ├─ Custom text (Thai/English) OR Link URL
│   └─ Require acknowledgment checkbox
│
├─ 6. 🆕 Consent Management ← NEW!
│   ├─ Enable/Disable toggle
│   ├─ Consent items list (drag-and-drop)
│   ├─ Add consent item button
│   └─ Statistics summary
│
└─ 7. การจัดรูปแบบตามเงื่อนไข (Conditional Formatting)
    └─ Formatting rules
```

---

## Visual Layout of PDPA Sections

### Section 5: Privacy Notice Settings

```
┌──────────────────────────────────────────────────────────────┐
│  🛡️  Privacy Notice                                          │
│     กำหนดข้อความแจ้งเตือนเกี่ยวกับความเป็นส่วนตัวของข้อมูล  │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ☑ เปิดใช้งาน Privacy Notice                                │
│                                                               │
│  รูปแบบการแสดงผล:                                            │
│  [Dropdown: Disabled/Custom Text/External Link]              │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ข้อความกำหนดเอง / ลิงก์ภายนอก                      │    │
│  │                                                       │    │
│  │  [Input fields based on selected mode]               │    │
│  │                                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ☑ บังคับให้ผู้ใช้ยอมรับก่อนกรอกฟอร์ม                       │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ตัวอย่างการแสดงผล:                                │    │
│  │  [Preview of privacy notice]                         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Section 6: Consent Management

```
┌──────────────────────────────────────────────────────────────┐
│  ✓  Consent Management                                       │
│     จัดการรายการความยินยอมในการเก็บและใช้ข้อมูลส่วนบุคคล    │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ☑ เปิดใช้งาน Consent Management                            │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ⋮⋮ ✓ การรับข่าวสารทางอีเมล [จำเป็น]     [−] [▼]  │    │
│  │     วัตถุประสงค์: การตลาดและโฆษณา                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ⋮⋮ ○ การวิเคราะห์พฤติกรรม          [−] [▼]        │    │
│  │     วัตถุประสงค์: การวิเคราะห์ข้อมูล                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  [+ เพิ่มรายการความยินยอม]                                  │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  จำนวนรายการทั้งหมด: 2                              │    │
│  │  จำเป็น: 1  /  เลือกได้: 1                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Consent Item Card (Expanded)

When you click the expand button [▼]:

```
┌───────────────────────────────────────────────────────────────┐
│  ⋮⋮ ✓ การรับข่าวสารทางอีเมล [จำเป็น]        [−] [▲]         │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  ชื่อ (ไทย) *                                         │    │
│  │  [การรับข่าวสารทางอีเมล.........................]    │    │
│  │                                                        │    │
│  │  Title (English)                                       │    │
│  │  [Email Newsletter Subscription................]      │    │
│  │                                                        │    │
│  │  คำอธิบาย (ไทย)                                       │    │
│  │  [เราจะส่งข่าวสาร โปรโมชั่น และอัปเดตล่าสุด...]     │    │
│  │  [ผ่านทางอีเมลของคุณ.........................]      │    │
│  │  [.........................................]          │    │
│  │                                                        │    │
│  │  Description (English)                                 │    │
│  │  [We will send you newsletters, promotions,...]       │    │
│  │  [and latest updates via your email........]          │    │
│  │  [.........................................]          │    │
│  │                                                        │    │
│  │  วัตถุประสงค์ *                                       │    │
│  │  [Dropdown: Marketing/Analytics/etc.....]             │    │
│  │                                                        │    │
│  │  ระยะเวลาเก็บข้อมูล                                   │    │
│  │  [2 ปี...................................]            │    │
│  │                                                        │    │
│  │  ☑ ความยินยอมจำเป็น          Version: [1]            │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
└───────────────────────────────────────────────────────────────┘
```

**Legend**:
- `⋮⋮` = Drag handle (for reordering)
- `✓` = Required consent (green)
- `○` = Optional consent (gray)
- `[−]` = Delete button
- `[▼]` = Expand button
- `[▲]` = Collapse button

---

## Icons Used

| Component | Icon | Color | Library |
|-----------|------|-------|---------|
| Privacy Notice Settings | 🛡️ Shield | Blue | FontAwesome `faShieldAlt` |
| Consent Management | ✓ Clipboard | Green | FontAwesome `faClipboardCheck` |
| Required Consent | ✓ Check Circle | Green | FontAwesome `faCheckCircle` |
| Optional Consent | ○ Circle | Gray | FontAwesome `faCircle` |
| Drag Handle | ⋮⋮ Grip Vertical | Gray | FontAwesome `faGripVertical` |
| Delete | 🗑️ Trash | Red on hover | FontAwesome `faTrashAlt` |
| Expand | ▼ Chevron Down | Gray | FontAwesome `faChevronDown` |
| Collapse | ▲ Chevron Up | Gray | FontAwesome `faChevronUp` |
| Add | + Plus | Primary | FontAwesome `faPlus` |
| Loading | ⟳ Spinner | Primary | FontAwesome `faSpinner` |

---

## Color Scheme

| Element | Color | CSS Class |
|---------|-------|-----------|
| Privacy Notice Badge | Blue gradient | `from-blue-500/20 to-blue-600/20` |
| Consent Management Badge | Green gradient | `from-green-500/20 to-green-600/20` |
| Required Tag | Green | `bg-green-500/10 text-green-600` |
| Optional Tag | Gray | `text-muted-foreground` |
| Card Background | Glass morphism | `GlassCard` component |
| Primary Buttons | Orange gradient | `bg-primary` |

---

## Responsive Behavior

### Desktop (≥768px)
- Full width cards with side-by-side layout for some fields
- Drag-and-drop with mouse
- Hover effects on all interactive elements

### Mobile (<768px)
- Single column layout
- Touch-friendly drag-and-drop
- Larger touch targets (44px minimum)
- Collapsible sections to save space

---

## Animation & Transitions

| Interaction | Animation | Duration |
|-------------|-----------|----------|
| Section expand | Slide in from top | 300ms |
| Card expand | Slide in from top | 300ms |
| Drag start | Opacity 0.5 | Instant |
| Hover | Scale 1.02 | 200ms |
| Save success | Toast notification | 3s |
| Loading | Spinner rotation | Infinite |

---

## Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Navigate between fields |
| Enter | Toggle checkboxes, submit forms |
| Space | Drag-and-drop (with screen reader) |
| Escape | Cancel operations |
| Arrow keys | Navigate in dropdowns |

---

## Screen Reader Support

All components include:
- Proper ARIA labels
- Role attributes
- Alt text for icons
- Keyboard-accessible controls
- Focus indicators

---

## Where to Find in Code

| Component | File Path | Line Range |
|-----------|-----------|------------|
| Privacy Notice Settings | `src/components/pdpa/PrivacyNoticeSettings.jsx` | 1-262 |
| Consent Management Tab | `src/components/pdpa/ConsentManagementTab.jsx` | 1-370 |
| Consent Item Card | `src/components/pdpa/ConsentItemCard.jsx` | 1-247 |
| Integration (EnhancedFormBuilder) | `src/components/EnhancedFormBuilder.jsx` | 3106-3116 |

---

## Testing Access

1. Open Form Builder: `http://localhost:3000/forms/edit/:formId`
2. Click **[Settings]** tab (4th tab)
3. Scroll down past Telegram settings
4. You will see:
   - **Privacy Notice Settings** section
   - **Consent Management** section
5. Toggle enables and start configuring

**Note**: Consent items require the form to be saved first (backend needs formId).
