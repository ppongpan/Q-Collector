# PDPA Data Retention Period & UI Improvements

**Version:** v0.8.6-dev
**Date:** 2025-10-25
**Priority:** ⭐⭐⭐⭐ HIGH - PDPA Compliance Enhancement
**Estimated Time:** 8-10 hours (1-2 days)

---

## 🎯 User Requirements Summary

### 1. Data Retention Period Configuration (ระยะเวลาจัดเก็บข้อมูล)
**Current Problem:**
- Retention period configured per consent item (ทุกรายการ consent)
- Inconsistent across different consent items in same form

**Required Solution:**
- ✅ Configure once per form (ตั้งค่า 1 ครั้งต่อ 1 ฟอร์ม)
- ✅ Dropdown selector: 1 year, 2 years, 3 years, ..., 20 years
- ✅ Apply retention period to ALL consent items in that form
- ✅ Apply retention period to ALL submissions from that form

### 2. Calculate Data to be Deleted (คำนวณข้อมูลที่ถึงเวลาลบ)
**Current Problem:**
- Calculation may be incorrect
- Not properly displayed in PDPA Dashboard

**Required Solution:**
- ✅ Calculate: `NOW() > (submission.submitted_at + form.data_retention_years)`
- ✅ Count submissions that exceeded retention period
- ✅ Display correctly in dashboard stats: "🗑️ To Delete" card
- ✅ Group by form and show which forms have expired data

### 3. Last Activity Display (แสดงกิจกรรมล่าสุด)
**Current Problem:**
- Shows relative time only: "เมื่อวาน", "2 สัปดาห์ที่แล้ว"
- Hard to know exact date

**Required Solution:**
- ✅ Show actual date: "2025-10-23"
- ✅ Add small relative time text: "(2 วันที่แล้ว)"
- ✅ Format: "YYYY-MM-DD (relative time)"

### 4. Merge Consent Tab into Forms Tab (รวม tab)
**Current Problem:**
- Separate tabs: "Forms" and "Consents"
- Duplicate information
- User must switch tabs to see related data

**Required Solution:**
- ✅ Merge "Consents" tab content into "Forms and Data" tab
- ✅ Each form card shows its consent items with editing capability
- ✅ Show consent history inline with form
- ✅ Rename tab to "Consents" (or "Forms & Consents")

---

## 🗄️ Database Schema Changes

### Migration 1: Add data_retention_years to forms table

**File:** `backend/migrations/20251025000001-add-data-retention-years-to-forms.js`

```javascript
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('forms', 'data_retention_years', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 2, // Default 2 years retention
      comment: 'Data retention period in years (1-20) for PDPA compliance'
    });

    // Add check constraint
    await queryInterface.sequelize.query(`
      ALTER TABLE forms
      ADD CONSTRAINT forms_data_retention_years_check
      CHECK (data_retention_years >= 1 AND data_retention_years <= 20)
    `);

    // Add index for querying forms by retention
    await queryInterface.addIndex('forms', ['data_retention_years'], {
      name: 'forms_data_retention_years_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE forms DROP CONSTRAINT IF EXISTS forms_data_retention_years_check
    `);
    await queryInterface.removeIndex('forms', 'forms_data_retention_years_idx');
    await queryInterface.removeColumn('forms', 'data_retention_years');
  }
};
```

**Run Migration:**
```bash
cd backend
npx sequelize-cli db:migrate
```

---

## 📦 Implementation Plan - 4 Phases

### PHASE 1: Database & Backend (3 hours)

#### Task 1.1: Database Migration (30 min)
**File:** `backend/migrations/20251025000001-add-data-retention-years-to-forms.js`

**Steps:**
1. Create migration file (as shown above)
2. Run migration: `npx sequelize-cli db:migrate`
3. Verify column exists:
   ```sql
   \d forms;
   SELECT data_retention_years FROM forms LIMIT 5;
   ```

**Success Criteria:**
- ✅ Column `data_retention_years` exists
- ✅ Default value is 2
- ✅ CHECK constraint enforces 1-20 range

---

#### Task 1.2: Update Form Model (15 min)
**File:** `backend/models/Form.js`

**Add Field:**
```javascript
data_retention_years: {
  type: DataTypes.INTEGER,
  allowNull: false,
  defaultValue: 2,
  validate: {
    min: 1,
    max: 20,
    isInt: true
  },
  comment: 'Data retention period in years for PDPA compliance'
}
```

**Success Criteria:**
- ✅ Model includes data_retention_years
- ✅ Validation enforces 1-20 range
- ✅ Default value is 2

---

#### Task 1.3: Update FormService (45 min)
**File:** `backend/services/FormService.js`

**Changes:**

**1. createForm() - Accept data_retention_years:**
```javascript
async createForm({
  title,
  description,
  roles_allowed,
  settings,
  created_by,
  data_retention_years = 2  // NEW: Default 2 years
}) {
  // Validate retention years
  if (data_retention_years < 1 || data_retention_years > 20) {
    throw new ApiError(400, 'ระยะเวลาจัดเก็บข้อมูลต้องอยู่ระหว่าง 1-20 ปี');
  }

  const form = await Form.create({
    title,
    description,
    roles_allowed,
    settings,
    created_by,
    data_retention_years,  // NEW
    // ...
  });

  return form;
}
```

**2. updateForm() - Allow updating retention years:**
```javascript
async updateForm(formId, updates) {
  const { data_retention_years } = updates;

  if (data_retention_years !== undefined) {
    if (data_retention_years < 1 || data_retention_years > 20) {
      throw new ApiError(400, 'ระยะเวลาจัดเก็บข้อมูลต้องอยู่ระหว่าง 1-20 ปี');
    }
  }

  await form.update({
    ...updates,
    data_retention_years
  });

  return form;
}
```

**Success Criteria:**
- ✅ Can create form with retention period
- ✅ Can update retention period
- ✅ Validation enforces 1-20 range
- ✅ Returns retention_years in API response

---

#### Task 1.4: Calculate Expired Submissions (1 hour)
**File:** `backend/services/UnifiedUserProfileService.js`

**New Method:**
```javascript
/**
 * Get submissions that exceeded retention period
 * @returns {Promise<Array>} List of submissions to be deleted
 */
static async getExpiredSubmissions() {
  const { Submission, Form } = require('../models');

  const submissions = await Sequelize.query(`
    SELECT
      s.id as submission_id,
      s.form_id,
      s.submitted_at,
      f.title as form_title,
      f.data_retention_years,
      (s.submitted_at + (f.data_retention_years || '2 years')::interval) as expiry_date,
      NOW() as current_date,
      (NOW() > (s.submitted_at + (f.data_retention_years || '2 years')::interval)) as is_expired
    FROM submissions s
    INNER JOIN forms f ON s.form_id = f.id
    WHERE NOW() > (s.submitted_at + (f.data_retention_years || '2 years')::interval)
    ORDER BY s.submitted_at ASC
  `, {
    type: Sequelize.QueryTypes.SELECT
  });

  return submissions;
}

/**
 * Count expired submissions by form
 * @returns {Promise<Object>} { total, byForm: [...] }
 */
static async countExpiredSubmissions() {
  const expired = await this.getExpiredSubmissions();

  const byForm = expired.reduce((acc, sub) => {
    if (!acc[sub.form_id]) {
      acc[sub.form_id] = {
        form_id: sub.form_id,
        form_title: sub.form_title,
        retention_years: sub.data_retention_years,
        count: 0,
        oldest_submission: sub.submitted_at,
        newest_submission: sub.submitted_at
      };
    }

    acc[sub.form_id].count++;
    if (new Date(sub.submitted_at) < new Date(acc[sub.form_id].oldest_submission)) {
      acc[sub.form_id].oldest_submission = sub.submitted_at;
    }
    if (new Date(sub.submitted_at) > new Date(acc[sub.form_id].newest_submission)) {
      acc[sub.form_id].newest_submission = sub.submitted_at;
    }

    return acc;
  }, {});

  return {
    total: expired.length,
    byForm: Object.values(byForm)
  };
}
```

**Success Criteria:**
- ✅ SQL query correctly calculates expiry
- ✅ Returns list of expired submissions
- ✅ Groups by form
- ✅ Counts total expired

---

#### Task 1.5: Update Dashboard Stats (30 min)
**File:** `backend/services/UnifiedUserProfileService.js`

**Update getDashboardStats():**
```javascript
static async getDashboardStats() {
  const stats = {
    total_data_subjects: await UnifiedUserProfile.count(),
    total_consents_given: await UserConsent.count({ where: { status: 'given' } }),
    pending_dsr_requests: await DSRRequest.count({
      where: { status: { [Op.in]: ['pending', 'in_progress'] } }
    }),

    // NEW: Calculate data to be deleted
    data_to_delete: await this.countExpiredSubmissions()
  };

  return stats;
}
```

**API Response:**
```json
{
  "total_data_subjects": 8234,
  "total_consents_given": 12450,
  "pending_dsr_requests": 23,
  "data_to_delete": {
    "total": 156,
    "byForm": [
      {
        "form_id": "uuid-1",
        "form_title": "Customer Survey 2020",
        "retention_years": 2,
        "count": 89,
        "oldest_submission": "2020-01-15",
        "newest_submission": "2020-12-30"
      },
      {
        "form_id": "uuid-2",
        "form_title": "Product Feedback 2021",
        "retention_years": 3,
        "count": 67,
        "oldest_submission": "2021-03-10",
        "newest_submission": "2021-11-25"
      }
    ]
  }
}
```

**Success Criteria:**
- ✅ Dashboard stats include expired data count
- ✅ Grouped by form
- ✅ Calculations correct

---

### PHASE 2: Form Builder UI (2 hours)

#### Task 2.1: Add Retention Period Dropdown (1.5 hours)
**File:** `src/components/EnhancedFormBuilder.jsx`

**Add to Form Settings Section:**
```jsx
// State
const [dataRetentionYears, setDataRetentionYears] = useState(2);

// Generate options 1-20 years
const retentionOptions = Array.from({ length: 20 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1} ปี`
}));

// In the form settings UI (after form title/description):
<div className="space-y-2">
  <label className="block text-sm font-medium text-gray-700">
    ระยะเวลาจัดเก็บข้อมูล (Data Retention Period)
    <span className="text-red-500 ml-1">*</span>
  </label>

  <select
    value={dataRetentionYears}
    onChange={(e) => setDataRetentionYears(parseInt(e.target.value))}
    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
  >
    {retentionOptions.map(opt => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>

  <p className="text-xs text-gray-500 mt-1">
    ข้อมูลจะถูกเก็บไว้ตามระยะเวลาที่กำหนด ตาม PDPA
    <br />
    หลังจากนั้นระบบจะแจ้งเตือนให้ลบข้อมูล
  </p>
</div>
```

**Update handleSave():**
```javascript
const handleSave = async () => {
  const formData = {
    title: formTitle,
    description: formDescription,
    roles_allowed: rolesAllowed,
    settings: formSettings,
    data_retention_years: dataRetentionYears,  // NEW
    // ...
  };

  if (isEditMode) {
    await FormService.updateForm(formId, formData);
  } else {
    await FormService.createForm(formData);
  }
};
```

**Load Existing Value:**
```javascript
useEffect(() => {
  if (isEditMode && form) {
    setFormTitle(form.title);
    setFormDescription(form.description);
    setDataRetentionYears(form.data_retention_years || 2);  // NEW
    // ...
  }
}, [form, isEditMode]);
```

**Success Criteria:**
- ✅ Dropdown shows 1-20 years
- ✅ Default value is 2 years
- ✅ Saves to database on form create/update
- ✅ Loads existing value when editing form

---

#### Task 2.2: Display Retention in Form Settings (30 min)
**File:** `src/components/MainFormApp.jsx` or form list view

**Show in Form Card:**
```jsx
<div className="text-xs text-gray-500 mt-2">
  📅 จัดเก็บข้อมูล: {form.data_retention_years} ปี
</div>
```

**Success Criteria:**
- ✅ Retention period visible in form list
- ✅ Clear icon/label

---

### PHASE 3: Dashboard UI Improvements (2.5 hours)

#### Task 3.1: Update Last Activity Column (1 hour)
**File:** `src/components/pdpa/PersonalDataDashboard.jsx`

**Current Display:**
```jsx
// OLD: Relative time only
<td>{formatRelativeTime(profile.last_submission_date)}</td>
// Output: "2 สัปดาห์ที่แล้ว"
```

**New Display:**
```jsx
// NEW: Date + relative time
const formatLastActivity = (date) => {
  if (!date) return 'ไม่มีข้อมูล';

  const d = new Date(date);
  const formattedDate = d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const relativeTime = formatRelativeTime(date);

  return (
    <div className="flex flex-col">
      <span className="font-medium">{formattedDate}</span>
      <span className="text-xs text-gray-500">({relativeTime})</span>
    </div>
  );
};

// In table cell:
<td className="px-6 py-4 whitespace-nowrap">
  {formatLastActivity(profile.last_submission_date)}
</td>
```

**Helper Function:**
```javascript
const formatRelativeTime = (date) => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'วันนี้';
  if (diffDays === 1) return 'เมื่อวาน';
  if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} สัปดาห์ที่แล้ว`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} เดือนที่แล้ว`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years} ปีที่แล้ว`;
};
```

**Success Criteria:**
- ✅ Shows date in first line (bold)
- ✅ Shows relative time in second line (gray, small)
- ✅ Format: "2025-10-23" / "(2 วันที่แล้ว)"

---

#### Task 3.2: Update "To Delete" Card (1 hour)
**File:** `src/components/pdpa/PersonalDataDashboard.jsx`

**Update Stats Card:**
```jsx
<div className="bg-white rounded-lg shadow p-6">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-gray-600">
        🗑️ ข้อมูลที่ถึงเวลาลบ
      </p>
      <p className="text-3xl font-bold text-red-600 mt-2">
        {stats.data_to_delete?.total || 0}
      </p>

      {/* NEW: Show breakdown by form */}
      {stats.data_to_delete?.byForm?.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-gray-500 font-semibold">
            รายละเอียดตามฟอร์ม:
          </p>
          {stats.data_to_delete.byForm.slice(0, 3).map(form => (
            <div key={form.form_id} className="text-xs">
              <span className="font-medium">{form.form_title}</span>
              <span className="text-red-600 ml-2">{form.count} รายการ</span>
              <span className="text-gray-500 ml-2">
                (เก็บ {form.retention_years} ปี)
              </span>
            </div>
          ))}

          {stats.data_to_delete.byForm.length > 3 && (
            <button
              onClick={() => setShowExpiredModal(true)}
              className="text-xs text-orange-600 hover:underline"
            >
              ดูทั้งหมด {stats.data_to_delete.byForm.length} ฟอร์ม →
            </button>
          )}
        </div>
      )}
    </div>

    <div className="text-4xl">🗑️</div>
  </div>

  <div className="mt-4">
    <button
      onClick={() => setShowExpiredModal(true)}
      className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
    >
      จัดการข้อมูลที่หมดอายุ
    </button>
  </div>
</div>
```

**Success Criteria:**
- ✅ Shows total count
- ✅ Shows breakdown by form (top 3)
- ✅ Shows retention period per form
- ✅ Link to view all expired data

---

#### Task 3.3: Create Expired Data Modal (30 min)
**File:** `src/components/pdpa/ExpiredDataModal.jsx` (NEW)

**Component:**
```jsx
import React from 'react';
import { X } from 'lucide-react';

const ExpiredDataModal = ({ isOpen, onClose, expiredData }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            🗑️ ข้อมูลที่ถึงเวลาลบ ({expiredData.total} รายการ)
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-4">
            {expiredData.byForm.map(form => (
              <div key={form.form_id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {form.form_title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      ระยะเวลาจัดเก็บ: {form.retention_years} ปี
                    </p>
                    <p className="text-sm text-gray-500">
                      ช่วงเวลา: {new Date(form.oldest_submission).toLocaleDateString('th-TH')} - {new Date(form.newest_submission).toLocaleDateString('th-TH')}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-600">
                      {form.count}
                    </div>
                    <div className="text-xs text-gray-500">รายการ</div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 text-sm">
                    ดูรายการทั้งหมด
                  </button>
                  <button className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm">
                    ลบข้อมูล
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              ⚠️ ข้อมูลที่หมดอายุควรได้รับการตรวจสอบและลบตาม PDPA
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpiredDataModal;
```

**Success Criteria:**
- ✅ Modal shows all forms with expired data
- ✅ Shows count per form
- ✅ Shows retention period
- ✅ Shows date range

---

### PHASE 4: Merge Consents Tab (3 hours)

#### Task 4.1: Redesign ProfileDetailModal (2 hours)
**File:** `src/components/pdpa/ProfileDetailModal.jsx`

**Current Tab Structure:**
```jsx
// OLD: Separate tabs
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">ภาพรวม</TabsTrigger>
    <TabsTrigger value="forms">ฟอร์มและข้อมูล</TabsTrigger>
    <TabsTrigger value="consents">ความยินยอม</TabsTrigger>
    <TabsTrigger value="dsr">คำขอใช้สิทธิ์</TabsTrigger>
  </TabsList>
  ...
</Tabs>
```

**New Tab Structure:**
```jsx
// NEW: Merged consents into forms tab, renamed to "Consents"
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">ภาพรวม</TabsTrigger>
    <TabsTrigger value="consents">Consents</TabsTrigger>  {/* RENAMED & MERGED */}
    <TabsTrigger value="dsr">คำขอใช้สิทธิ์</TabsTrigger>
  </TabsList>

  <TabsContent value="overview">
    {/* Overview content */}
  </TabsContent>

  <TabsContent value="consents">
    {/* MERGED: Forms + Consents + History */}
    <ConsentsTab profile={profile} />
  </TabsContent>

  <TabsContent value="dsr">
    {/* DSR content */}
  </TabsContent>
</Tabs>
```

---

#### Task 4.2: Create New ConsentsTab Component (1 hour)
**File:** `src/components/pdpa/ConsentsTab.jsx` (NEW)

**Component Structure:**
```jsx
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Edit, History } from 'lucide-react';
import ConsentEditModal from './ConsentEditModal';
import ConsentHistoryModal from './ConsentHistoryModal';

const ConsentsTab = ({ profile }) => {
  const [expandedForms, setExpandedForms] = useState(new Set());
  const [editingConsent, setEditingConsent] = useState(null);
  const [viewingHistory, setViewingHistory] = useState(null);

  const toggleForm = (formId) => {
    const newExpanded = new Set(expandedForms);
    if (newExpanded.has(formId)) {
      newExpanded.delete(formId);
    } else {
      newExpanded.add(formId);
    }
    setExpandedForms(newExpanded);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          📋 ฟอร์มและความยินยอม ({profile.forms?.length || 0} ฟอร์ม)
        </h3>
      </div>

      {/* List of Forms with Consents */}
      {profile.forms?.map(form => (
        <div key={form.form_id} className="border rounded-lg overflow-hidden">
          {/* Form Header - Always Visible */}
          <div
            className="bg-gray-50 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100"
            onClick={() => toggleForm(form.form_id)}
          >
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">{form.form_title}</h4>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                <span>📅 ส่งเมื่อ: {new Date(form.submitted_at).toLocaleDateString('th-TH')}</span>
                <span>📋 Consent: {form.consents?.length || 0} รายการ</span>
                <span>🗂️ PII Fields: {form.pii_fields?.length || 0} ฟิลด์</span>
                <span>📅 เก็บข้อมูล: {form.data_retention_years} ปี</span>
              </div>
            </div>

            <button className="p-2 hover:bg-gray-200 rounded-lg">
              {expandedForms.has(form.form_id) ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Expanded Content - Consents + PII Fields */}
          {expandedForms.has(form.form_id) && (
            <div className="p-4 bg-white">
              {/* Consent Items Section */}
              <div className="mb-6">
                <h5 className="font-semibold text-gray-700 mb-3">
                  ✅ ความยินยอม ({form.consents?.length || 0} รายการ)
                </h5>

                {form.consents?.length > 0 ? (
                  <div className="space-y-3">
                    {form.consents.map(consent => (
                      <div
                        key={consent.id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-2xl ${
                                consent.status === 'given' ? '✅' : '❌'
                              }`}>
                                {consent.status === 'given' ? '✅' : '❌'}
                              </span>
                              <div>
                                <h6 className="font-semibold">
                                  {consent.consent_item.title_th}
                                </h6>
                                <p className="text-sm text-gray-500 mt-1">
                                  {consent.consent_item.description_th}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">สถานะ:</span>
                                <span className={`ml-2 font-medium ${
                                  consent.status === 'given'
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }`}>
                                  {consent.status === 'given' ? 'ให้ความยินยอม' : 'ไม่ยินยอม'}
                                </span>
                              </div>

                              <div>
                                <span className="text-gray-600">วันที่ให้ความยินยอม:</span>
                                <span className="ml-2">
                                  {new Date(consent.consent_given_at).toLocaleDateString('th-TH')}
                                </span>
                              </div>

                              {consent.consent_item.purpose && (
                                <div className="col-span-2">
                                  <span className="text-gray-600">วัตถุประสงค์:</span>
                                  <span className="ml-2">{consent.consent_item.purpose}</span>
                                </div>
                              )}
                            </div>

                            {consent.signature_data_url && (
                              <div className="mt-3">
                                <button className="text-sm text-orange-600 hover:underline">
                                  📝 ดูลายเซ็น
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingConsent(consent)}
                              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                              title="แก้ไขความยินยอม"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setViewingHistory(consent)}
                              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                              title="ดูประวัติการแก้ไข"
                            >
                              <History className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">ไม่มีรายการความยินยอม</p>
                )}
              </div>

              {/* PII Fields Section */}
              <div>
                <h5 className="font-semibold text-gray-700 mb-3">
                  🔐 ข้อมูลส่วนบุคคล ({form.pii_fields?.length || 0} ฟิลด์)
                </h5>

                {form.pii_fields?.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {form.pii_fields.map(field => (
                      <div key={field.field_id} className="border border-gray-200 rounded-lg p-3">
                        <div className="text-sm">
                          <span className="text-gray-600 font-medium">
                            {field.field_title}:
                          </span>
                          <span className="ml-2 text-gray-900">
                            {field.value || '-'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          หมวดหมู่: {field.category}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">ไม่มีข้อมูลส่วนบุคคล</p>
                )}
              </div>

              {/* Form Actions */}
              <div className="mt-6 flex gap-2">
                <button className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 text-sm">
                  📄 ดูรายละเอียดการส่งฟอร์ม
                </button>
                <button className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm">
                  📥 Export ข้อมูล
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Modals */}
      {editingConsent && (
        <ConsentEditModal
          consent={editingConsent}
          onClose={() => setEditingConsent(null)}
          onSave={() => {
            setEditingConsent(null);
            // Refresh data
          }}
        />
      )}

      {viewingHistory && (
        <ConsentHistoryModal
          consent={viewingHistory}
          onClose={() => setViewingHistory(null)}
        />
      )}
    </div>
  );
};

export default ConsentsTab;
```

**Success Criteria:**
- ✅ Shows all forms with their consents
- ✅ Expandable/collapsible form cards
- ✅ Edit consent inline with Edit button
- ✅ View consent history inline with History button
- ✅ Shows PII fields for each form
- ✅ Shows retention period per form

---

## 📝 API Updates

### Update Form Routes
**File:** `backend/api/routes/form.routes.js`

**Accept data_retention_years in Create/Update:**
```javascript
router.post(
  '/',
  authenticate,
  authorize('super_admin', 'admin', 'form_creator'),
  [
    body('title').trim().notEmpty(),
    body('description').optional().trim(),
    body('roles_allowed').isArray(),
    body('settings').optional().isObject(),
    body('data_retention_years').optional().isInt({ min: 1, max: 20 })  // NEW
  ],
  async (req, res) => {
    const { title, description, roles_allowed, settings, data_retention_years } = req.body;

    const form = await FormService.createForm({
      title,
      description,
      roles_allowed,
      settings,
      data_retention_years: data_retention_years || 2,  // Default 2 years
      created_by: req.user.id
    });

    res.json({ success: true, form });
  }
);

router.put(
  '/:id',
  authenticate,
  authorize('super_admin', 'admin'),
  [
    body('data_retention_years').optional().isInt({ min: 1, max: 20 })  // NEW
  ],
  async (req, res) => {
    // Allow updating retention years
  }
);
```

---

## 🧪 Testing Plan

### Unit Tests

**Test: Form Model Validation**
```javascript
describe('Form Model - Data Retention', () => {
  it('should accept data_retention_years between 1-20', async () => {
    const form = await Form.create({
      title: 'Test Form',
      data_retention_years: 5
    });
    expect(form.data_retention_years).toBe(5);
  });

  it('should reject data_retention_years < 1', async () => {
    await expect(
      Form.create({ title: 'Test', data_retention_years: 0 })
    ).rejects.toThrow();
  });

  it('should reject data_retention_years > 20', async () => {
    await expect(
      Form.create({ title: 'Test', data_retention_years: 21 })
    ).rejects.toThrow();
  });

  it('should default to 2 years if not specified', async () => {
    const form = await Form.create({ title: 'Test' });
    expect(form.data_retention_years).toBe(2);
  });
});
```

**Test: Calculate Expired Submissions**
```javascript
describe('UnifiedUserProfileService - Expired Data', () => {
  it('should correctly calculate expired submissions', async () => {
    // Create form with 2-year retention
    const form = await Form.create({
      title: 'Old Form',
      data_retention_years: 2
    });

    // Create submission 3 years ago (expired)
    const expiredDate = new Date();
    expiredDate.setFullYear(expiredDate.getFullYear() - 3);

    await Submission.create({
      form_id: form.id,
      submitted_at: expiredDate
    });

    // Create submission 1 year ago (not expired)
    const recentDate = new Date();
    recentDate.setFullYear(recentDate.getFullYear() - 1);

    await Submission.create({
      form_id: form.id,
      submitted_at: recentDate
    });

    const expired = await UnifiedUserProfileService.getExpiredSubmissions();

    expect(expired.length).toBe(1);
    expect(expired[0].form_id).toBe(form.id);
  });
});
```

### Integration Tests

**Test: Dashboard Stats**
```javascript
it('should return correct expired data stats', async () => {
  const response = await request(app)
    .get('/api/v1/personal-data/dashboard-stats')
    .set('Authorization', `Bearer ${adminToken}`);

  expect(response.body.data_to_delete).toBeDefined();
  expect(response.body.data_to_delete.total).toBeGreaterThanOrEqual(0);
  expect(response.body.data_to_delete.byForm).toBeInstanceOf(Array);
});
```

### E2E Tests

**Test: Form Creation with Retention**
```javascript
test('should create form with retention period', async ({ page }) => {
  await page.goto('/forms/new');

  await page.fill('input[name="title"]', 'Test Retention Form');

  // Select retention period
  await page.selectOption('select[name="data_retention_years"]', '5');

  await page.click('button[type="submit"]');

  // Verify form created
  await expect(page.locator('text=สร้างฟอร์มสำเร็จ')).toBeVisible();

  // Verify retention period saved
  const form = await getFormFromDB('Test Retention Form');
  expect(form.data_retention_years).toBe(5);
});
```

---

## 📋 Implementation Checklist

### Phase 1: Database & Backend ✅
- [ ] Create migration for data_retention_years
- [ ] Update Form model
- [ ] Update FormService.createForm()
- [ ] Update FormService.updateForm()
- [ ] Implement getExpiredSubmissions()
- [ ] Implement countExpiredSubmissions()
- [ ] Update getDashboardStats()
- [ ] Test all backend changes

### Phase 2: Form Builder UI ✅
- [ ] Add retention dropdown to EnhancedFormBuilder
- [ ] Update handleSave() to include retention_years
- [ ] Load retention_years when editing
- [ ] Display retention in form list
- [ ] Test form creation with retention
- [ ] Test form update with retention

### Phase 3: Dashboard UI ✅
- [ ] Update Last Activity column format
- [ ] Update "To Delete" stats card
- [ ] Create ExpiredDataModal component
- [ ] Test dashboard stats display
- [ ] Test expired data modal

### Phase 4: Merge Consents Tab ✅
- [ ] Create new ConsentsTab component
- [ ] Remove old separate Consents tab
- [ ] Rename tab to "Consents"
- [ ] Integrate consent editing
- [ ] Integrate consent history
- [ ] Test merged tab functionality

### Testing ✅
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Write E2E tests
- [ ] Manual testing on dev

### Documentation ✅
- [ ] Update API documentation
- [ ] Update user guide
- [ ] Update CLAUDE.md

---

## 🎯 Success Criteria

**All requirements met:**
1. ✅ Data retention configured per form (1-20 years dropdown)
2. ✅ Expired submissions calculated correctly
3. ✅ Dashboard shows expired data count with breakdown
4. ✅ Last activity shows date + relative time
5. ✅ Consents tab merged with Forms tab
6. ✅ Consent editing and history accessible inline
7. ✅ All tests passing
8. ✅ Documentation updated

**Estimated Total Time:** 8-10 hours

---

**Implementation Date:** 2025-10-25
**Version:** v0.8.6-dev
**Status:** 📋 PLAN READY - AWAITING APPROVAL
