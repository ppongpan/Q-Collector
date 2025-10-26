# PDPA Forms & Data Tab Improvement Plan

**Version**: v0.8.5-dev
**Date**: 2025-10-24
**Status**: 📋 PLANNING
**Priority**: ⭐⭐⭐⭐⭐ HIGH

---

## 📋 USER REQUIREMENTS

### Current Problem:
ใน tab "ฟอร์ม & ข้อมูล" ของ Personal Data Management Dashboard มีข้อมูลแยกออกจากกัน:
- ฟอร์มและ submissions แสดงแยก
- Consent items อยู่ใน tab อื่น
- ไม่เห็นภาพรวมของข้อมูลทั้งหมดในฟอร์มแต่ละอัน

### Required Solution:
รวมข้อมูลทั้งหมดไว้ใน tab "ฟอร์ม & ข้อมูล" โดยแสดง:

1. **ชื่อฟอร์ม** (Form Title)
2. **รายการ Consent Items** ที่เกี่ยวข้องกับฟอร์มนั้น พร้อม:
   - สถานะความยินยอม (Given/Denied)
   - **ลายเซ็นดิจิทัล** (Signature Image)
   - ชื่อผู้ลงนาม (Full Name)
   - วันที่ลงนาม (Consented At)
   - IP Address
3. **รายการฟิลด์ PII** (Personal Data Fields) ที่บันทึกไว้ในฟอร์ม
4. จัดเรียงเป็น **card/กล่องต่อกัน** ถ้ามีหลายฟอร์ม

---

## 🎨 UI DESIGN MOCKUP

### Improved Forms & Data Tab Layout

```
┌────────────────────────────────────────────────────────────────┐
│ ฟอร์ม & ข้อมูล (3 ฟอร์ม) - การส่งทั้งหมด (5 ครั้ง)          │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ 📋 แบบฟอร์มทดสอบระบบ PDPA                                      │
│                                                                │
│ ส่งล่าสุด: 29 กันยายน 2568                                     │
│ จำนวนการส่ง: 2 ครั้ง                                           │
│                                                                │
│ ─────────────────────────────────────────────────────────────  │
│                                                                │
│ ✅ ความยินยอม (3 รายการ)                                       │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ ✅ ยินยอมให้เก็บข้อมูลส่วนบุคคลเพื่อการให้บริการ          │  │
│ │                                                          │  │
│ │ วัตถุประสงค์: การให้บริการและติดต่อลูกค้า                │  │
│ │ ระยะเวลาเก็บรักษา: 2 ปี                                  │  │
│ │                                                          │  │
│ │ 👤 ผู้ลงนาม: จอห์น สมิธ                                  │  │
│ │ 📅 ลงนามเมื่อ: 29 กันยายน 2568 เวลา 14:53 น.            │  │
│ │ 🌐 IP: 203.154.xxx.xxx                                   │  │
│ │                                                          │  │
│ │ ✍️ ลายเซ็นดิจิทัล:                                        │  │
│ │ ┌────────────────────────────────────────────┐          │  │
│ │ │  [Signature Image - Base64 PNG]             │          │  │
│ │ │                                              │          │  │
│ │ │  ~~John Smith~~                              │          │  │
│ │ │                                              │          │  │
│ │ └────────────────────────────────────────────┘          │  │
│ │ [🔍 ดูขนาดเต็ม]                                         │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ ✅ ยินยอมรับข่าวสารการตลาด                               │  │
│ │                                                          │  │
│ │ วัตถุประสงค์: ส่งข้อมูลโปรโมชั่นและข่าวสาร              │  │
│ │ ระยะเวลาเก็บรักษา: 3 ปี                                  │  │
│ │                                                          │  │
│ │ 👤 ผู้ลงนาม: จอห์น สมิธ                                  │  │
│ │ 📅 ลงนามเมื่อ: 29 กันยายน 2568 เวลา 14:53 น.            │  │
│ │ 🌐 IP: 203.154.xxx.xxx                                   │  │
│ │                                                          │  │
│ │ ✍️ ลายเซ็นดิจิทัล:                                        │  │
│ │ ┌────────────────────────────────────────────┐          │  │
│ │ │  [Signature Image]                          │          │  │
│ │ └────────────────────────────────────────────┘          │  │
│ │ [🔍 ดูขนาดเต็ม]                                         │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ ❌ ยินยอมให้ส่งข้อมูลต่อให้กับบริษัทคู่ค้า               │  │
│ │                                                          │  │
│ │ วัตถุประสงค์: การแบ่งปันข้อมูลกับพันธมิตร                │  │
│ │ ระยะเวลาเก็บรักษา: 5 ปี                                  │  │
│ │                                                          │  │
│ │ ⚠️ ไม่ยินยอม (Denied)                                    │  │
│ │ 📅 ตอบเมื่อ: 29 กันยายน 2568 เวลา 14:53 น.              │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ ─────────────────────────────────────────────────────────────  │
│                                                                │
│ 📊 ข้อมูลส่วนบุคคล (5 ฟิลด์)                                  │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ ฟิลด์            │ ประเภท        │ ค่า                 │  │
│ ├──────────────────────────────────────────────────────────┤  │
│ │ ชื่อ-นามสกุล     │ short_answer  │ จอห์น สมิธ          │  │
│ │ อีเมล           │ email         │ john@example.com    │  │
│ │ เบอร์โทร         │ phone         │ 091-291-1234        │  │
│ │ ที่อยู่          │ paragraph     │ 123 Main St, BKK    │  │
│ │ วันเกิด         │ date          │ 15/05/1990          │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ [ดูการส่งล่าสุด] [ดูการส่งทั้งหมด (2)]                        │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ 📋 Customer Feedback Survey                                    │
│                                                                │
│ ส่งล่าสุด: 15 กันยายน 2568                                     │
│ จำนวนการส่ง: 1 ครั้ง                                           │
│                                                                │
│ ─────────────────────────────────────────────────────────────  │
│                                                                │
│ ✅ ความยินยอม (2 รายการ)                                       │
│ ...                                                            │
│                                                                │
│ 📊 ข้อมูลส่วนบุคคล (3 ฟิลด์)                                  │
│ ...                                                            │
│                                                                │
│ [ดูการส่งล่าสุด]                                               │
└────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ TECHNICAL ARCHITECTURE

### Current Data Flow (v0.8.4):

```
getProfileDetail() → uniqueForms[] → ProfileDetailModal → Forms Tab
                   → consents[]    → ProfileDetailModal → Consents Tab (separate)
```

**Problem**: Consents และ Forms แยกกัน

### New Data Flow (v0.8.5):

```
getProfileDetail() → uniqueForms[] → (group consents by form_id)
                                   → (include signature_data)
                   ↓
ProfileDetailModal → Forms & Data Tab
                   → Display: Form + Consents + Signatures + PII
```

**Solution**: Group consents into uniqueForms

---

## 📦 IMPLEMENTATION PLAN - 3 PHASES

### **PHASE 1: Backend Enhancement (2-3 hours)**

#### Task 1.1: Group Consents by Form ID
**File**: `backend/services/UnifiedUserProfileService.js`

**Current Code** (lines 251-281):
```javascript
// ✅ v0.8.4: Group submissions by form to show unique forms
const formMap = new Map();
enrichedSubmissions.forEach(submission => {
  const formId = submission.form_id;
  if (!formMap.has(formId)) {
    formMap.set(formId, {
      formId,
      formTitle: submission.form?.title || 'ไม่ระบุชื่อฟอร์ม',
      formTableName: submission.form?.table_name,
      submissionCount: 0,
      submissions: [],
      latestSubmission: null,
      firstSubmission: null
    });
  }
  // ... rest of grouping logic
});
```

**New Code**:
```javascript
// ✅ v0.8.5: Group consents by form_id
const consentsByForm = new Map();
consents.forEach(consent => {
  const consentJson = consent.toJSON();
  const formId = consentJson.form_id;

  if (!consentsByForm.has(formId)) {
    consentsByForm.set(formId, []);
  }

  consentsByForm.get(formId).push({
    id: consentJson.id,
    consentItemId: consentJson.consent_item_id,
    consentItemTitle: consentJson.consentItem?.title_th || consentJson.consentItem?.title_en,
    consentItemDescription: consentJson.consentItem?.description,
    purpose: consentJson.consentItem?.purpose,
    retentionPeriod: consentJson.consentItem?.retention_period,
    consentGiven: consentJson.consent_given,

    // ✅ v0.8.5: Add signature data
    signatureData: consentJson.signature_data, // Base64 PNG
    fullName: consentJson.full_name,
    consentedAt: consentJson.consented_at,
    ipAddress: consentJson.ip_address,
    userAgent: consentJson.user_agent
  });
});

// ✅ v0.8.5: Group submissions by form WITH consents
const formMap = new Map();
enrichedSubmissions.forEach(submission => {
  const formId = submission.form_id;
  if (!formMap.has(formId)) {
    formMap.set(formId, {
      formId,
      formTitle: submission.form?.title || 'ไม่ระบุชื่อฟอร์ม',
      formTableName: submission.form?.table_name,
      submissionCount: 0,
      submissions: [],
      latestSubmission: null,
      firstSubmission: null,

      // ✅ v0.8.5: Add consents to each form
      consents: consentsByForm.get(formId) || []
    });
  }

  const formGroup = formMap.get(formId);
  formGroup.submissionCount++;
  formGroup.submissions.push(submission);

  // Track latest and first submissions
  const submittedAt = new Date(submission.submitted_at || submission.submittedAt);
  if (!formGroup.latestSubmission || submittedAt > new Date(formGroup.latestSubmission.submitted_at || formGroup.latestSubmission.submittedAt)) {
    formGroup.latestSubmission = submission;
  }
  if (!formGroup.firstSubmission || submittedAt < new Date(formGroup.firstSubmission.submitted_at || formGroup.firstSubmission.submittedAt)) {
    formGroup.firstSubmission = submission;
  }
});

const uniqueForms = Array.from(formMap.values());
```

**Changes Summary**:
1. Group consents by `form_id`
2. Include `signature_data`, `full_name`, `consented_at`, `ip_address` in consent objects
3. Attach consents array to each form in `uniqueForms`

**Success Criteria**:
- ✅ Each form in `uniqueForms` has `consents` array
- ✅ Consents include signature data (Base64 PNG)
- ✅ Consents include full name and timestamp
- ✅ Multiple submissions of same form share consent data

---

#### Task 1.2: Update _getConsentsForProfile to include Submission
**File**: `backend/services/UnifiedUserProfileService.js`

**Current Code** (lines 707-736):
```javascript
async _getConsentsForProfile(profile) {
  const where = { [Op.or]: [] };

  if (profile.linked_emails.length > 0) {
    const consents = await UserConsent.findAll({
      where: {
        submission_id: { [Op.in]: profile.submission_ids }
      },
      include: [
        {
          model: ConsentItem,
          as: 'consentItem',
          attributes: ['id', 'title_th', 'title_en', 'purpose', 'retention_period']
        },
        {
          model: Form,
          as: 'form',
          attributes: ['id', 'title']
        }
      ],
      order: [['consented_at', 'DESC']]
    });

    return consents;
  }

  return [];
}
```

**New Code**:
```javascript
async _getConsentsForProfile(profile) {
  const where = { [Op.or]: [] };

  if (profile.linked_emails.length > 0) {
    const consents = await UserConsent.findAll({
      where: {
        submission_id: { [Op.in]: profile.submission_ids }
      },
      include: [
        {
          model: ConsentItem,
          as: 'consentItem',
          attributes: ['id', 'title_th', 'title_en', 'description', 'purpose', 'retention_period']
        },
        {
          model: Form,
          as: 'form',
          attributes: ['id', 'title']
        },
        {
          model: Submission,
          as: 'submission',
          attributes: ['id', 'form_id'] // ✅ v0.8.5: Add submission to get form_id
        }
      ],
      order: [['consented_at', 'DESC']]
    });

    return consents;
  }

  return [];
}
```

**Changes Summary**:
1. Include `Submission` model to ensure `form_id` is accessible
2. Include `description` field from ConsentItem

---

### **PHASE 2: Frontend UI Enhancement (3-4 hours)**

#### Task 2.1: Create SignatureDisplay Component
**File**: `src/components/pdpa/SignatureDisplay.jsx` (NEW)

**Component Code**:
```jsx
/**
 * SignatureDisplay Component
 * Displays digital signature image with modal for full view
 *
 * @param {string} signatureData - Base64 encoded PNG signature
 * @param {string} fullName - Name of person who signed
 * @param {string} consentedAt - Timestamp of signature
 * @param {string} ipAddress - IP address when signed
 */
import React, { useState } from 'react';
import { Eye, X } from 'lucide-react';

const SignatureDisplay = ({ signatureData, fullName, consentedAt, ipAddress }) => {
  const [showModal, setShowModal] = useState(false);

  if (!signatureData) {
    return (
      <div className="text-xs text-gray-500 dark:text-gray-400 italic">
        ไม่มีลายเซ็นดิจิทัล
      </div>
    );
  }

  // Format signature data URL
  const signatureUrl = signatureData.startsWith('data:')
    ? signatureData
    : `data:image/png;base64,${signatureData}`;

  return (
    <>
      <div className="mt-2">
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          ✍️ ลายเซ็นดิจิทัล:
        </p>
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-900">
          <img
            src={signatureUrl}
            alt={`ลายเซ็นของ ${fullName}`}
            className="w-full h-20 object-contain"
          />
          <div className="mt-2 flex items-center justify-between">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              <p>👤 {fullName}</p>
              <p>📅 {new Date(consentedAt).toLocaleString('th-TH')}</p>
              {ipAddress && <p>🌐 IP: {ipAddress}</p>}
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
            >
              <Eye className="w-3 h-3" />
              ดูขนาดเต็ม
            </button>
          </div>
        </div>
      </div>

      {/* Full Size Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              ลายเซ็นดิจิทัล
            </h3>

            <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-gray-50 dark:bg-gray-900">
              <img
                src={signatureUrl}
                alt={`ลายเซ็นของ ${fullName}`}
                className="w-full h-auto max-h-96 object-contain"
              />
            </div>

            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-gray-900 dark:text-white font-medium mb-2">
                ข้อมูลการลงนาม:
              </p>
              <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <p>👤 ผู้ลงนาม: {fullName}</p>
                <p>📅 ลงนามเมื่อ: {new Date(consentedAt).toLocaleString('th-TH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}</p>
                {ipAddress && <p>🌐 IP Address: {ipAddress}</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SignatureDisplay;
```

**Features**:
- Display signature thumbnail (height: 80px)
- Click to view full size in modal
- Show metadata (name, date, IP)
- Support Base64 PNG format
- Dark mode compatible

---

#### Task 2.2: Update Forms & Data Tab UI
**File**: `src/components/pdpa/ProfileDetailModal.jsx`

**Current Section** (lines 434-610): Shows unique forms with PII preview

**New Enhanced Section**:
```jsx
{/* Forms & Data Tab - ✅ v0.8.5: Show unique forms with Consents + Signatures + PII */}
{activeTab === 'forms' && (
  <div className="space-y-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        ฟอร์ม ({profile.uniqueForms?.length || 0}) - การส่งทั้งหมด ({profile.submissions?.length || 0} ครั้ง)
      </h3>
    </div>

    {profile.uniqueForms && profile.uniqueForms.length > 0 ? (
      profile.uniqueForms.map((formGroup) => {
        const isExpanded = expandedFormIds.has(formGroup.formId);
        const latestSubmission = formGroup.latestSubmission;
        const hasConsents = formGroup.consents && formGroup.consents.length > 0;

        return (
          <div
            key={formGroup.formId}
            className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg"
          >
            {/* Form Header */}
            <div className="p-6 bg-gradient-to-r from-orange-50 to-white dark:from-orange-900/10 dark:to-gray-800">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    📋 {formGroup.formTitle}
                  </h4>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>
                      📅 ส่งล่าสุด: {latestSubmission?.submittedAt || latestSubmission?.submitted_at
                        ? new Date(latestSubmission.submittedAt || latestSubmission.submitted_at).toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : '-'}
                    </span>
                    <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 text-sm rounded-full font-medium">
                      📊 {formGroup.submissionCount} การส่ง
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* ✅ v0.8.5: Consent Items Section with Signatures */}
              {hasConsents && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <h5 className="text-base font-semibold text-gray-900 dark:text-white">
                      ✅ ความยินยอม ({formGroup.consents.length} รายการ)
                    </h5>
                  </div>

                  <div className="space-y-3">
                    {formGroup.consents.map((consent) => (
                      <div
                        key={consent.id}
                        className={`border-2 rounded-lg p-4 ${
                          consent.consentGiven
                            ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10'
                            : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10'
                        }`}
                      >
                        {/* Consent Header */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-shrink-0 mt-1">
                            {consent.consentGiven ? (
                              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                            ) : (
                              <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h6 className="font-medium text-gray-900 dark:text-white mb-1">
                              {consent.consentItemTitle}
                            </h6>
                            {consent.consentItemDescription && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {consent.consentItemDescription}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400">
                              <span>🎯 วัตถุประสงค์: {consent.purpose || '-'}</span>
                              <span>⏱️ ระยะเวลา: {consent.retentionPeriod || '-'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Consent Status */}
                        <div className="mb-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-4 text-sm">
                            <span className={`font-medium ${
                              consent.consentGiven
                                ? 'text-green-700 dark:text-green-300'
                                : 'text-red-700 dark:text-red-300'
                            }`}>
                              {consent.consentGiven ? '✅ ยินยอม (Given)' : '❌ ไม่ยินยอม (Denied)'}
                            </span>
                            <span className="text-gray-600 dark:text-gray-400">
                              📅 {new Date(consent.consentedAt).toLocaleString('th-TH', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>

                        {/* ✅ v0.8.5: Digital Signature Display */}
                        {consent.consentGiven && consent.signatureData && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <SignatureDisplay
                              signatureData={consent.signatureData}
                              fullName={consent.fullName}
                              consentedAt={consent.consentedAt}
                              ipAddress={consent.ipAddress}
                            />
                          </div>
                        )}

                        {/* No Signature Message */}
                        {consent.consentGiven && !consent.signatureData && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400 italic flex items-center gap-1">
                              <span>✍️</span>
                              <span>ไม่มีลายเซ็นดิจิทัล</span>
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PII Fields Section */}
              {latestSubmission?.piiFieldValues && latestSubmission.piiFieldValues.length > 0 && (
                <div className="mt-6 pt-6 border-t-2 border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-4">
                    <h5 className="text-base font-semibold text-gray-900 dark:text-white">
                      📊 ข้อมูลส่วนบุคคล ({latestSubmission.piiFieldCount} ฟิลด์)
                    </h5>
                    {latestSubmission.piiFieldValues.some(f => f.isEncrypted) && (
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] rounded-full font-medium">
                        🔒 Encrypted
                      </span>
                    )}
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-100 dark:bg-gray-800">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                            ฟิลด์
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                            ประเภท
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                            ค่า
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {latestSubmission.piiFieldValues.map((field, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">
                              {field.fieldTitle}
                              {field.isEncrypted && (
                                <span className="ml-1 text-green-600 dark:text-green-400" title="Encrypted">🔒</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">
                                {field.fieldType}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                              {field.value !== null && field.value !== undefined ? (
                                typeof field.value === 'object' ? (
                                  <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto">
                                    {JSON.stringify(field.value, null, 2)}
                                  </pre>
                                ) : (
                                  <span className="break-words">{String(field.value)}</span>
                                )
                              ) : (
                                <span className="text-gray-400 dark:text-gray-500 italic">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => handleViewSubmission(latestSubmission.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-md"
                >
                  <ExternalLink className="w-5 h-5" />
                  ดูการส่งล่าสุด
                </button>
                {formGroup.submissionCount > 1 && (
                  <button
                    onClick={() => handleToggleFormExpand(formGroup.formId)}
                    className="px-5 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-md"
                  >
                    <ChevronRight className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    {isExpanded ? 'ซ่อน' : 'ดู'}การส่งทั้งหมด ({formGroup.submissionCount})
                  </button>
                )}
              </div>
            </div>

            {/* Expanded Submissions List */}
            {isExpanded && formGroup.submissionCount > 1 && (
              <div className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <div className="p-6 space-y-3">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                    📋 การส่งทั้งหมด ({formGroup.submissionCount} ครั้ง):
                  </p>
                  {formGroup.submissions.map((submission, idx) => (
                    <div
                      key={submission.id}
                      className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-900 dark:text-white font-medium mb-1">
                            📝 ครั้งที่ {formGroup.submissionCount - idx}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            📅 {submission.submittedAt || submission.submitted_at
                              ? new Date(submission.submittedAt || submission.submitted_at).toLocaleString('th-TH', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : 'ไม่ทราบวันที่'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleViewSubmission(submission.id)}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 shadow"
                        >
                          <ExternalLink className="w-4 h-4" />
                          ดูรายละเอียด
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })
    ) : (
      <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          ไม่พบข้อมูลฟอร์ม
        </p>
      </div>
    )}
  </div>
)}
```

**Import SignatureDisplay**:
```jsx
import SignatureDisplay from './SignatureDisplay';
```

---

### **PHASE 3: Testing & Documentation (1 hour)**

#### Task 3.1: Manual Testing Checklist

**Test Scenarios**:

1. **Display Unique Forms**:
   - ✅ Each form appears only once
   - ✅ Form count matches unique forms (not submissions)
   - ✅ Latest submission date correct

2. **Consent Items Display**:
   - ✅ All consent items for form shown
   - ✅ Status (Given/Denied) displayed correctly
   - ✅ Purpose and retention period visible

3. **Digital Signature**:
   - ✅ Signature thumbnail displays (80px height)
   - ✅ Signature modal opens on click
   - ✅ Full size signature visible in modal
   - ✅ Metadata shown (name, date, IP)
   - ✅ Modal closes correctly

4. **PII Fields**:
   - ✅ All PII fields listed
   - ✅ Field types displayed
   - ✅ Values visible (with masking if applicable)
   - ✅ Encrypted fields marked with 🔒

5. **Multiple Forms**:
   - ✅ Each form card styled uniquely
   - ✅ Cards stacked vertically
   - ✅ Expand/collapse works for submissions list

6. **Edge Cases**:
   - ✅ Form with no consents
   - ✅ Consent without signature
   - ✅ Form with no PII fields
   - ✅ Empty profile (no forms)

---

#### Task 3.2: Update Documentation

**Files to Update**:
1. `CLAUDE.md` - Add v0.8.5 changelog
2. `PDPA_UI_LOCATION.md` - Update Forms & Data tab description
3. Create `SIGNATURE-DISPLAY-GUIDE.md` - Guide for signature display component

---

## 📊 SUCCESS CRITERIA

### Functional Requirements:
- ✅ Forms & Data tab shows unique forms (not duplicate submissions)
- ✅ Each form displays associated consent items
- ✅ Digital signatures displayed with thumbnail + modal
- ✅ PII fields shown in table format
- ✅ Multiple forms displayed as separate cards

### Technical Requirements:
- ✅ Backend groups consents by form_id
- ✅ Signature data (Base64 PNG) included in API response
- ✅ SignatureDisplay component reusable
- ✅ Dark mode support throughout
- ✅ Responsive design (mobile-friendly)

### User Experience Requirements:
- ✅ Clear visual hierarchy (Form → Consents → PII)
- ✅ Easy to scan and understand
- ✅ Signature verification metadata visible
- ✅ Fast loading (optimized queries)

---

## 📈 ESTIMATED TIME

**Total Duration**: 6-8 hours

**Breakdown**:
- Phase 1 (Backend): 2-3 hours
- Phase 2 (Frontend): 3-4 hours
- Phase 3 (Testing): 1 hour

**Priority**: HIGH - Improve PDPA compliance UX
**Version**: v0.8.5-dev
**Status**: Ready to implement

---

## 🚀 NEXT STEPS

1. ✅ Plan approved - Write to qtodo.md
2. ⏳ Implement Phase 1 (Backend)
3. ⏳ Implement Phase 2 (Frontend)
4. ⏳ Test all features
5. ⏳ Update documentation
6. ⏳ Deploy to production

---

**Last Updated**: 2025-10-24
**Author**: Claude AI Assistant
**Review Status**: Ready for Implementation
