# Q-Collector Development TODO

**Last Updated**: 2025-10-20 20:30:00 UTC+7
**Current Version**: v0.8.0-dev
**Current Task**: 🚀 Move Notification Rules to Form Settings (Per-Form Management)

---

## 🎯 ACTIVE: Move Notification Rules to Form Settings v0.8.0

**Priority**: ⭐ HIGH
**Status**: 📋 PLANNING
**Estimated Time**: 3-4 hours
**Start Date**: 2025-10-20

---

## 📊 Problem Analysis

### Current Implementation (Settings Page - Global View)

**Location**: `src/components/SettingsPage.jsx` → NotificationRulesPage

**Problems**:
1. ❌ Rules scattered across app (hard to find which form has which rules)
2. ❌ Must select form from dropdown when creating rule
3. ❌ Field reference difficult (can't see field list until form selected)
4. ❌ No visual connection between Form and its Notification Rules
5. ❌ Users must navigate to Settings → Security → Manage Rules (far from form context)

**Current Flow**:
```
Settings → ความปลอดภัย → จัดการกฎ → เลือกฟอร์ม → เลือกฟิลด์
```

---

### Proposed Implementation (Form Settings - Per-Form View)

**Location**: `src/components/EnhancedFormBuilder.jsx` → New Tab "การแจ้งเตือน"

**Benefits**:
1. ✅ Rules organized by form (see all rules for current form at once)
2. ✅ Auto-link to current form (no need to select form)
3. ✅ Field dropdown populated from current form's fields
4. ✅ Visual connection: Form Settings → Notification Rules
5. ✅ Easy access: Form Settings → Tab การแจ้งเตือน

**New Flow**:
```
Forms → Edit Form → Tab "การแจ้งเตือน" → Create/Edit Rules
```

---

## 🏗️ Architecture Design

### UI Component Structure

```
EnhancedFormBuilder.jsx
├── Tabs: [ข้อมูลฟอร์ม, ฟิลด์, Sub-Forms, การตั้งค่า, การแจ้งเตือน ⭐NEW]
│
└── Tab "การแจ้งเตือน" (Notification Rules Tab)
    ├── Header
    │   ├── Title: "กฎการแจ้งเตือนอัตโนมัติ"
    │   ├── Description: "จัดการการแจ้งเตือนไปยัง Telegram เมื่อมีการบันทึกข้อมูลในฟอร์มนี้"
    │   └── Button: "สร้างกฎใหม่" (Create New Rule)
    │
    ├── Rules List (NotificationRulesList component)
    │   ├── Filter: [All, Enabled, Disabled]
    │   ├── Search: ค้นหากฎ
    │   └── Table/Cards:
    │       ├── Rule Name
    │       ├── Trigger Type (field_update, scheduled)
    │       ├── Target Field (if field_update)
    │       ├── Status (Enabled/Disabled toggle)
    │       ├── Actions: [Edit, Test, Delete]
    │       └── Stats: (sent, failed, last sent)
    │
    └── Create/Edit Rule Modal (NotificationRuleForm component)
        ├── Section 1: Basic Info
        │   ├── Name (required)
        │   └── Description
        │
        ├── Section 2: Trigger
        │   ├── Type: [field_update, scheduled]
        │   ├── If field_update:
        │   │   ├── Target Field Dropdown ⭐ (auto-populated from form.fields + subForm.fields)
        │   │   └── Sub-form Selector (if target is in sub-form)
        │   └── If scheduled:
        │       └── Cron Expression
        │
        ├── Section 3: Condition
        │   ├── Formula Input (with field autocomplete)
        │   └── Field Reference Helper
        │       ├── Main Form Fields: [field_1], [field_2], ...
        │       └── Sub-form Fields: [subform_1.field_1], ...
        │
        ├── Section 4: Message Template
        │   ├── Template Editor (with placeholders)
        │   └── Placeholder Helper:
        │       ├── [form_title]
        │       ├── [user_name]
        │       ├── [submitted_at]
        │       ├── [field_name] (all fields from form)
        │       └── [submission_link]
        │
        ├── Section 5: Telegram Config
        │   ├── Bot Token
        │   ├── Group ID
        │   └── Test Connection Button
        │
        └── Section 6: Settings
            ├── Priority: [high, medium, low]
            ├── Send Once (checkbox)
            └── Enabled (checkbox)
```

---

## 📋 Implementation Plan

### Phase 1: Backend API Review (30 min) ✅ READY

**Current API**: `/api/v1/notifications/rules`

**Endpoints Already Support Form Filtering**:
```javascript
// List rules filtered by formId
GET /api/v1/notifications/rules?formId={formId}&page=1&limit=100

// Create rule with formId
POST /api/v1/notifications/rules
{
  "name": "...",
  "formId": "{formId}",  // ✅ Already supported
  "triggerType": "field_update",
  "targetFieldId": "{fieldId}",  // ✅ Already supported
  "subFormId": "{subFormId}",    // ✅ Already supported
  ...
}
```

**Backend Changes Needed**: ✅ **NONE** - API already supports per-form filtering

---

### Phase 2: Create Notification Components (90 min)

**File Structure**:
```
src/components/notifications/
├── NotificationRulesTab.jsx           ⭐ NEW (main tab content)
├── NotificationRulesList.jsx          ⭐ NEW (list view)
├── NotificationRuleForm.jsx           ⭐ NEW (create/edit modal)
├── NotificationRuleCard.jsx           ⭐ NEW (individual rule card)
├── FieldReferenceHelper.jsx           ⭐ NEW (formula field autocomplete)
└── MessageTemplateEditor.jsx          ⭐ NEW (template editor with placeholders)
```

**Tasks**:

#### 2.1 Create NotificationRulesTab.jsx (30 min)
```javascript
/**
 * Main tab content for notification rules in Form Settings
 * Shows list of rules for current form
 */
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faPlus } from '@fortawesome/free-solid-svg-icons';
import NotificationRulesList from './NotificationRulesList';
import NotificationRuleForm from './NotificationRuleForm';
import NotificationService from '../../services/NotificationService';

export default function NotificationRulesTab({ form }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  // Load rules for this form
  useEffect(() => {
    loadRules();
  }, [form.id]);

  const loadRules = async () => {
    try {
      setLoading(true);
      const response = await NotificationService.getRules(
        { formId: form.id },
        { page: 1, limit: 100 }
      );
      setRules(response.rules || []);
    } catch (error) {
      console.error('Error loading rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingRule(null);
    setShowForm(true);
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setShowForm(true);
  };

  const handleSave = async () => {
    await loadRules();
    setShowForm(false);
  };

  return (
    <div className="notification-rules-tab">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FontAwesomeIcon icon={faBell} className="text-orange-500" />
              กฎการแจ้งเตือนอัตโนมัติ
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              จัดการการแจ้งเตือนไปยัง Telegram เมื่อมีการบันทึกข้อมูลในฟอร์ม "{form.title}"
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="btn-primary flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faPlus} />
            สร้างกฎใหม่
          </button>
        </div>
      </div>

      {/* Rules List */}
      <NotificationRulesList
        rules={rules}
        loading={loading}
        onEdit={handleEdit}
        onDelete={loadRules}
        form={form}
      />

      {/* Create/Edit Modal */}
      {showForm && (
        <NotificationRuleForm
          rule={editingRule}
          form={form}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
```

#### 2.2 Create NotificationRulesList.jsx (20 min)
- List/Grid view of rules
- Enable/Disable toggle
- Edit/Delete actions
- Empty state display

#### 2.3 Create NotificationRuleForm.jsx (40 min)
- Modal form for create/edit
- Field dropdown auto-populated from `form.fields` and `form.subForms[].fields`
- Condition formula editor with field autocomplete
- Message template editor with placeholders
- Telegram config section
- Validation and error handling

---

### Phase 3: Integrate with EnhancedFormBuilder (45 min)

**File**: `src/components/EnhancedFormBuilder.jsx`

**Changes**:

#### 3.1 Add "การแจ้งเตือน" Tab (15 min)
```javascript
// Around line 140 (tabs section)
const tabs = [
  { id: 'info', label: 'ข้อมูลฟอร์ม', icon: faInfoCircle },
  { id: 'fields', label: 'ฟิลด์', icon: faList },
  { id: 'subforms', label: 'Sub-Forms', icon: faLayerGroup },
  { id: 'settings', label: 'การตั้งค่า', icon: faCog },
  { id: 'notifications', label: 'การแจ้งเตือน', icon: faBell }, // ⭐ NEW
];
```

#### 3.2 Add Tab Content (15 min)
```javascript
// Around line 2200 (render tabs)
{activeTab === 'notifications' && (
  <NotificationRulesTab form={form} />
)}
```

#### 3.3 Import Component (5 min)
```javascript
import NotificationRulesTab from './notifications/NotificationRulesTab';
```

#### 3.4 Add Badge Count (10 min)
Show number of active rules on tab label:
```javascript
{ id: 'notifications', label: 'การแจ้งเตือน', icon: faBell, count: activeRulesCount }
```

---

### Phase 4: Field Reference System (60 min)

**Challenge**: How to reference fields in formula and message template?

**Solution**: Create smart field reference system

#### 4.1 Create FieldReferenceHelper.jsx (30 min)

**Features**:
- Dropdown showing all fields from form
- Main form fields: `[fieldTitle]` or `[field_{id}]`
- Sub-form fields: `[subformTitle.fieldTitle]` or `[subform_{id}.field_{id}]`
- Click to insert into formula/template
- Search/filter fields

**Data Structure**:
```javascript
const fieldReferences = [
  // Main form fields
  {
    type: 'main',
    fieldId: 'field_abc',
    fieldTitle: 'ชื่อลูกค้า',
    reference: '[ชื่อลูกค้า]',
    alternativeReference: '[field_abc]'
  },
  {
    type: 'main',
    fieldId: 'field_def',
    fieldTitle: 'ยอดขาย',
    reference: '[ยอดขาย]',
    alternativeReference: '[field_def]'
  },
  // Sub-form fields
  {
    type: 'subform',
    subFormId: 'subform_xyz',
    subFormTitle: 'รายการสินค้า',
    fieldId: 'field_ghi',
    fieldTitle: 'ชื่อสินค้า',
    reference: '[รายการสินค้า.ชื่อสินค้า]',
    alternativeReference: '[subform_xyz.field_ghi]'
  }
];
```

#### 4.2 Create MessageTemplateEditor.jsx (30 min)

**Features**:
- Textarea with syntax highlighting for placeholders
- Placeholder dropdown
- Preview mode
- Common placeholders:
  - `[form_title]`
  - `[user_name]`
  - `[submitted_at]`
  - `[submission_link]`
  - `[field_name]` (from FieldReferenceHelper)

---

### Phase 5: Update Backend Template Processing (30 min)

**File**: `backend/services/NotificationExecutorService.js`

**Current**: Uses field IDs in template
**New**: Support field titles in template

**Tasks**:

#### 5.1 Enhance Template Variable Replacement
```javascript
// Current
message = message.replace('[field_abc]', fieldValue);

// New: Support both ID and title
message = message.replace('[ชื่อลูกค้า]', fieldValue);
message = message.replace('[field_abc]', fieldValue);
message = message.replace('[รายการสินค้า.ชื่อสินค้า]', subFormFieldValue);
```

#### 5.2 Create Field Lookup Map
```javascript
function buildFieldLookupMap(form, submission) {
  const map = {};

  // Main form fields
  form.fields.forEach(field => {
    const value = submission.data[field.id];
    map[`[${field.title}]`] = value;
    map[`[field_${field.id}]`] = value;
  });

  // Sub-form fields
  form.subForms.forEach(subForm => {
    subForm.fields.forEach(field => {
      const value = getSubFormFieldValue(submission, subForm.id, field.id);
      map[`[${subForm.title}.${field.title}]`] = value;
      map[`[subform_${subForm.id}.field_${field.id}]`] = value;
    });
  });

  return map;
}
```

---

### Phase 6: Keep Global View (Optional) (30 min)

**Decision**: Keep Settings → Notifications for global view?

**Options**:
1. ✅ **Keep Global View** (Recommended)
   - Settings → Notifications: View ALL rules across all forms
   - Form Settings → Notifications: View rules for THIS form
   - Use case: Admin wants to see all active rules at once

2. ❌ Remove Global View
   - Only access via Form Settings
   - Simpler, less duplication

**Recommendation**: Keep both
- Global view for admins (overview)
- Per-form view for form editors (focused)

**Implementation**:
- `SettingsPage.jsx` → NotificationRulesPage (no changes, keep as-is)
- `EnhancedFormBuilder.jsx` → NotificationRulesTab (new, filtered by formId)

---

### Phase 7: Navigation & Breadcrumbs (15 min)

**Update Breadcrumbs**:
```javascript
// When in Form Settings → Notifications tab
Forms → [Form Title] → การแจ้งเตือน
```

**Add Link from Global View**:
```javascript
// In SettingsPage NotificationRulesPage
// Add "View in Form" link next to each rule
<a href={`/forms/${rule.formId}/notifications`}>
  View in Form
</a>
```

---

### Phase 8: Testing (60 min)

**Test Scenarios**:

1. **Create Rule in Form Settings**
   - [ ] Open form in edit mode
   - [ ] Go to "การแจ้งเตือน" tab
   - [ ] Click "สร้างกฎใหม่"
   - [ ] Fill form (formId auto-filled)
   - [ ] Select target field from dropdown (shows main + sub-form fields)
   - [ ] Write condition formula (field autocomplete works)
   - [ ] Write message template (field placeholders work)
   - [ ] Save and verify rule created

2. **Field Reference**
   - [ ] Use field title: `[ชื่อลูกค้า]` → works
   - [ ] Use field ID: `[field_abc]` → works
   - [ ] Use sub-form field: `[รายการสินค้า.ชื่อสินค้า]` → works

3. **Edit Existing Rule**
   - [ ] Click edit on rule
   - [ ] Modal opens with current values
   - [ ] Modify and save
   - [ ] Changes reflected in list

4. **Rule Triggering**
   - [ ] Create submission in form
   - [ ] Verify notification sent to Telegram
   - [ ] Check message has correct field values
   - [ ] Check field title placeholders replaced

5. **Global View**
   - [ ] Go to Settings → Notifications
   - [ ] See all rules from all forms
   - [ ] Click "View in Form" link
   - [ ] Opens form settings notifications tab

6. **Empty State**
   - [ ] Form with no rules shows empty state
   - [ ] "Create your first rule" message

---

## 📦 Deliverables

### New Files:
- [ ] `src/components/notifications/NotificationRulesTab.jsx`
- [ ] `src/components/notifications/NotificationRulesList.jsx`
- [ ] `src/components/notifications/NotificationRuleForm.jsx`
- [ ] `src/components/notifications/NotificationRuleCard.jsx`
- [ ] `src/components/notifications/FieldReferenceHelper.jsx`
- [ ] `src/components/notifications/MessageTemplateEditor.jsx`

### Modified Files:
- [ ] `src/components/EnhancedFormBuilder.jsx` - Add "การแจ้งเตือน" tab
- [ ] `backend/services/NotificationExecutorService.js` - Support field title placeholders
- [ ] `backend/services/MessageTemplateService.js` - Enhanced template processing

### Documentation:
- [ ] Update CLAUDE.md with v0.8.0 notification system changes
- [ ] Update TELEGRAM-NOTIFICATION-SYSTEM-MANUAL.md with per-form setup
- [ ] Add field reference documentation

---

## ⏱️ Time Estimate

| Phase | Task | Time |
|-------|------|------|
| 1 | Backend API Review | 30 min |
| 2 | Create Notification Components | 90 min |
| 3 | Integrate with EnhancedFormBuilder | 45 min |
| 4 | Field Reference System | 60 min |
| 5 | Update Backend Template Processing | 30 min |
| 6 | Keep Global View | 30 min |
| 7 | Navigation & Breadcrumbs | 15 min |
| 8 | Testing | 60 min |
| **Total** | | **~6 hours** |

**Note**: Can be done in 2 sessions:
- Session 1 (3 hours): Phases 1-4 (UI components)
- Session 2 (3 hours): Phases 5-8 (Backend + Testing)

---

## 🎯 Success Criteria

1. ✅ "การแจ้งเตือน" tab visible in Form Settings
2. ✅ Rules list shows only rules for current form
3. ✅ Create rule auto-fills formId (no dropdown needed)
4. ✅ Field dropdown shows all main form + sub-form fields
5. ✅ Field reference works with field titles (not just IDs)
6. ✅ Formula autocomplete shows available fields
7. ✅ Message template placeholders replaced correctly
8. ✅ Global view still works (Settings → Notifications)
9. ✅ Breadcrumbs show correct path
10. ✅ Notifications triggered correctly when submission created/updated

---

## 📊 Technical Decisions

### Why Move to Form Settings?

**Benefits**:
1. **Context Awareness**: User is already thinking about this form, its fields, its data
2. **Reduced Friction**: No need to select form from dropdown
3. **Better Organization**: Rules grouped by form (easier to manage)
4. **Field Discovery**: Can see all available fields immediately
5. **Reduced Errors**: Auto-fill formId prevents mistakes

### Field Reference Strategy

**Option 1**: Use Field IDs only
- `[field_abc]` - Not user-friendly ❌

**Option 2**: Use Field Titles only
- `[ชื่อลูกค้า]` - User-friendly but what if title changes? ❌

**Option 3**: Support Both ✅ (CHOSEN)
- `[ชื่อลูกค้า]` - User-friendly for writing
- `[field_abc]` - Fallback if title changes
- Backend resolves both to field value

**Implementation**:
- Store in database: Keep using field IDs for reliability
- Display in UI: Show field titles for usability
- Template processing: Support both syntaxes

### Sub-form Field Reference

**Syntax**: `[SubFormTitle.FieldTitle]` or `[subform_id.field_id]`

**Examples**:
```javascript
// Thai
[รายการสินค้า.ชื่อสินค้า]
[รายการสินค้า.ราคา]

// With IDs (fallback)
[subform_xyz.field_abc]
```

---

## 🚧 Known Limitations

1. **Field Title Changes**: If field title changes, old templates using title-based references may break
   - Mitigation: Support ID-based fallback, show warning in UI

2. **Performance**: Loading all rules for large forms may be slow
   - Mitigation: Pagination, lazy loading

3. **Global View Sync**: Changes in form settings may not immediately reflect in global view
   - Mitigation: Refresh global view after save

---

## 🔗 Related Files

- `src/components/EnhancedFormBuilder.jsx` - Form settings UI
- `src/components/SettingsPage.jsx` - Global settings (keep for overview)
- `src/components/notifications/NotificationRulesPage.jsx` - Current global view
- `backend/services/NotificationExecutorService.js` - Notification execution
- `backend/services/MessageTemplateService.js` - Template processing
- `backend/api/routes/notification.routes.js` - API endpoints

---

## 📝 Migration Notes

**For Existing Rules**:
- ✅ No database migration needed
- ✅ Existing rules continue to work
- ✅ Can be edited via new UI
- ✅ Global view still accessible

**For Users**:
- New way to create rules (Form Settings)
- Old way still works (Settings → Notifications)
- Recommend using per-form view for new rules

---

## ✅ Checklist Before Starting

- [x] Read and understand current notification system
- [x] Review NotificationService API
- [x] Check EnhancedFormBuilder.jsx structure
- [x] Understand field structure in form object
- [ ] Backup current code
- [ ] Create feature branch: `feature/notification-per-form`
- [ ] Start with Phase 1

---

**Version**: v0.8.0-dev
**Priority**: ⭐ HIGH
**Status**: 📋 READY TO IMPLEMENT
**Last Updated**: 2025-10-20 20:30:00 UTC+7
**Estimated Completion**: 2025-10-20 (End of Day)

---

## 📌 Quick Start Commands

```bash
# 1. Create feature branch
git checkout -b feature/notification-per-form

# 2. Create notification components directory
mkdir -p src/components/notifications

# 3. Start development server (already running)
npm start

# 4. Backend server (already running on port 5000)
cd backend && npm start
```

---

## 🎯 Next Action

**START WITH**: Phase 2.1 - Create NotificationRulesTab.jsx
