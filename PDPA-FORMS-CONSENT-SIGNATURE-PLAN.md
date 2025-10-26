# PDPA Forms & Consent Display Enhancement Plan
**Version**: v0.8.5-dev
**Date**: 2025-10-24
**Priority**: ⭐⭐⭐⭐⭐ CRITICAL
**Estimated Duration**: 2-3 days (16-24 hours)

---

## 🎯 USER REQUIREMENTS

ผู้ใช้ต้องการให้หน้า Personal Data Management Dashboard แสดง:

1. ✅ **รายการฟอร์มที่เจ้าของข้อมูลให้ consent** - มีอยู่แล้วใน `uniqueForms`
2. ❌ **Consent items ในแต่ละฟอร์ม** (เช่น ยินยอมให้เก็บข้อมูล, ยินยอมรับข่าวสาร) - **ยังขาด**
3. ✅ **รายการฟิลด์ PII ในฟอร์ม** - มีอยู่แล้วใน `piiFieldValues` table
4. ❌ **ลายเซ็นดิจิทัลที่บันทึกไว้** - **ยังขาด**

---

## 📊 CURRENT STATUS ANALYSIS

### ✅ สิ่งที่มีอยู่แล้ว (Completed):

#### 1. ProfileDetailModal.jsx - Forms Tab (lines 434-610)
```jsx
{activeTab === 'forms' && (
  <div className="space-y-4">
    {profile.uniqueForms.map((formGroup) => (
      <div key={formGroup.formId}>
        {/* ✅ Form Header */}
        <h4>{formGroup.formTitle}</h4>
        <span>{formGroup.submissionCount} การส่ง</span>

        {/* ✅ PII Fields Table (lines 488-535) */}
        <table>
          <thead>
            <tr>
              <th>ฟิลด์</th>
              <th>ประเภท</th>
              <th>ค่า</th>
            </tr>
          </thead>
          <tbody>
            {latestSubmission.piiFieldValues.map((field) => (
              <tr key={field.fieldId}>
                <td>{field.fieldTitle}</td>
                <td>{field.fieldType}</td>
                <td>{field.value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ✅ Action Buttons */}
        <button onClick={() => handleViewSubmission(latestSubmission.id)}>
          ดูการส่งล่าสุด
        </button>
      </div>
    ))}
  </div>
)}
```

#### 2. UnifiedUserProfileService.js - getProfileDetail() (lines 198-315)
```javascript
async getProfileDetail(profileId) {
  // ✅ Get submissions with PII data
  const enrichedSubmissions = await Promise.all(
    submissions.map(async (s) => {
      const piiData = await this._getPIIDataForSubmission(s.id, s.form_id);
      return {
        ...submissionJson,
        piiFieldValues: piiData, // ✅ PII fields with values
        piiFieldCount: piiData.length
      };
    })
  );

  // ✅ Group by form
  const formMap = new Map();
  enrichedSubmissions.forEach(submission => {
    // ... grouping logic
  });

  const uniqueForms = Array.from(formMap.values());

  return {
    ...profile.toJSON(),
    submissions: enrichedSubmissions,
    uniqueForms, // ✅ Grouped forms
    consents: consents.map(c => c.toJSON()), // ✅ Consents exist
    personalDataFields,
    dsrRequests
  };
}
```

### ❌ สิ่งที่ยังขาด (Missing):

1. **Consent Items ใน Forms Tab** - Forms tab ยังไม่แสดง consent items ที่ user ให้ไว้ในฟอร์มนั้น
2. **Digital Signature Display** - ไม่แสดงรูปลายเซ็น (signature_data_url)
3. **Consent Metadata** - ไม่แสดง IP, User-Agent, Timestamp

---

## 🔧 IMPLEMENTATION PLAN

### SPRINT 1: Backend Enhancement (Day 1 - 8 hours)

#### Task 1.1: Enhance getProfileDetail() to include consent items per form (3 hours)

**File**: `backend/services/UnifiedUserProfileService.js`

**Current Code** (line 252-282):
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
  // ... rest of code
});
```

**Enhanced Code** (NEW):
```javascript
// ✅ v0.8.5: Group submissions by form WITH consent items
const formMap = new Map();

for (const submission of enrichedSubmissions) {
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
      consentItems: [], // ✅ NEW: Consent items for this form
      signatures: [] // ✅ NEW: Digital signatures
    });
  }

  const formGroup = formMap.get(formId);
  formGroup.submissionCount++;
  formGroup.submissions.push(submission);

  // Track latest and first submissions
  const submittedAt = new Date(submission.submitted_at || submission.submittedAt);
  if (!formGroup.latestSubmission || submittedAt > new Date(formGroup.latestSubmission.submitted_at)) {
    formGroup.latestSubmission = submission;
  }
  if (!formGroup.firstSubmission || submittedAt < new Date(formGroup.firstSubmission.submitted_at)) {
    formGroup.firstSubmission = submission;
  }

  // ✅ NEW: Add consent items from this submission
  const submissionConsents = await UserConsent.findAll({
    where: { submission_id: submission.id },
    include: [
      {
        model: ConsentItem,
        as: 'consentItem',
        attributes: ['id', 'title_th', 'title_en', 'description', 'purpose', 'retention_period']
      }
    ]
  });

  submissionConsents.forEach(consent => {
    // Check if this consent item already exists in formGroup
    const existingIndex = formGroup.consentItems.findIndex(
      ci => ci.consentItemId === consent.consent_item_id
    );

    const consentData = {
      consentItemId: consent.consent_item_id,
      consentItemTitle: consent.consentItem?.title_th || consent.consentItem?.title_en || 'ไม่ระบุ',
      consentItemDescription: consent.consentItem?.description,
      purpose: consent.consentItem?.purpose,
      retentionPeriod: consent.consentItem?.retention_period,
      consentGiven: consent.consent_given,
      consentedAt: consent.consented_at,
      submissionId: submission.id,
      // ✅ Signature data
      hasSignature: !!consent.signature_data_url,
      signatureDataUrl: consent.signature_data_url,
      fullName: consent.full_name,
      ipAddress: consent.ip_address,
      userAgent: consent.user_agent
    };

    if (existingIndex === -1) {
      // First time seeing this consent item
      formGroup.consentItems.push({
        ...consentData,
        timesGiven: consent.consent_given ? 1 : 0,
        timesTotal: 1,
        latestConsentDate: consent.consented_at,
        allConsents: [consentData] // Track all instances
      });
    } else {
      // Update existing consent item stats
      const existing = formGroup.consentItems[existingIndex];
      existing.timesTotal++;
      if (consent.consent_given) existing.timesGiven++;
      existing.allConsents.push(consentData);

      // Update latest consent date
      if (new Date(consent.consented_at) > new Date(existing.latestConsentDate)) {
        existing.latestConsentDate = consent.consented_at;
        existing.consentGiven = consent.consent_given; // Use latest status
      }
    }
  });

  // ✅ NEW: Track signatures (unique by submission)
  if (formGroup.latestSubmission.id === submission.id) {
    const latestSignature = submissionConsents.find(c => !!c.signature_data_url);
    if (latestSignature) {
      formGroup.signatures.push({
        submissionId: submission.id,
        signatureDataUrl: latestSignature.signature_data_url,
        fullName: latestSignature.full_name,
        consentedAt: latestSignature.consented_at,
        ipAddress: latestSignature.ip_address,
        userAgent: latestSignature.user_agent
      });
    }
  }
}

const uniqueForms = Array.from(formMap.values());
```

**Subtasks**:
- [ ] Update `UnifiedUserProfileService.js` - `getProfileDetail()` method
- [ ] Add consent items query with ConsentItem include
- [ ] Group consents by consent_item_id
- [ ] Calculate consent statistics (timesGiven/timesTotal)
- [ ] Extract signature data from UserConsent
- [ ] Test with sample data (form with 2+ submissions, 3+ consent items)

---

#### Task 1.2: Update _getConsentsForProfile() to include signature data (2 hours)

**File**: `backend/services/UnifiedUserProfileService.js`

**Current Code** (line 707-735):
```javascript
async _getConsentsForProfile(profile) {
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
      }
    ],
    order: [['consented_at', 'DESC']]
  });

  return consents;
}
```

**Enhanced Code**:
```javascript
async _getConsentsForProfile(profile) {
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
      }
    ],
    attributes: [
      'id',
      'submission_id',
      'consent_item_id',
      'consent_given',
      'consented_at',
      'signature_data_url', // ✅ NEW
      'full_name', // ✅ NEW
      'ip_address', // ✅ NEW
      'user_agent', // ✅ NEW
      'privacy_notice_accepted',
      'privacy_notice_version'
    ],
    order: [['consented_at', 'DESC']]
  });

  // ✅ Enrich consents with metadata
  return consents.map(consent => {
    const consentJson = consent.toJSON();
    return {
      ...consentJson,
      hasSignature: !!consent.signature_data_url,
      metadata: {
        ipAddress: consent.ip_address,
        userAgent: consent.user_agent,
        consentedAt: consent.consented_at,
        fullName: consent.full_name
      }
    };
  });
}
```

**Subtasks**:
- [ ] Update `_getConsentsForProfile()` to include signature fields
- [ ] Add metadata object to consent response
- [ ] Test consent retrieval with signature data

---

#### Task 1.3: Add ConsentItem description to backend response (1 hour)

**File**: `backend/services/UnifiedUserProfileService.js`

**Fix**: Line 721 already includes `description` in attributes, but verify it's working:

```javascript
attributes: ['id', 'title_th', 'title_en', 'description', 'purpose', 'retention_period']
```

**Verification**:
- [ ] Check ConsentItem model has `description` field
- [ ] Verify API response includes `consentItem.description`
- [ ] Test with sample consent item

---

#### Task 1.4: Test backend changes (2 hours)

**Test Cases**:
1. [ ] Profile with 1 form, 1 submission, 2 consent items
2. [ ] Profile with 1 form, 3 submissions, 2 consent items (test grouping)
3. [ ] Profile with 2 forms, each with different consent items
4. [ ] Profile with signature data (verify signature_data_url returned)
5. [ ] Profile without signature (verify graceful handling)
6. [ ] Console.log uniqueForms structure to verify consentItems array
7. [ ] Verify consentItems.timesGiven/timesTotal calculation

---

### SPRINT 2: Frontend Enhancement - Forms Tab (Day 2 - 8 hours)

#### Task 2.1: Display Consent Items in Forms Tab (3 hours)

**File**: `src/components/pdpa/ProfileDetailModal.jsx`

**Location**: Inside Forms Tab, after PII Fields Table (after line 535)

**New Code**:
```jsx
{/* ✅ v0.8.5: Consent Items Section */}
{formGroup.consentItems && formGroup.consentItems.length > 0 && (
  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
      <span>✅ ความยินยอม ({formGroup.consentItems.length} รายการ)</span>
    </p>

    <div className="space-y-2">
      {formGroup.consentItems.map((consentItem, idx) => (
        <div
          key={consentItem.consentItemId}
          className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {consentItem.consentGiven ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                )}
                <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                  {consentItem.consentItemTitle}
                </h5>
              </div>

              {consentItem.consentItemDescription && (
                <p className="text-xs text-gray-600 dark:text-gray-400 ml-6 mb-2">
                  {consentItem.consentItemDescription}
                </p>
              )}

              <div className="ml-6 text-xs text-gray-500 dark:text-gray-500 space-y-1">
                {consentItem.purpose && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">วัตถุประสงค์:</span>
                    <span>{consentItem.purpose}</span>
                  </div>
                )}
                {consentItem.retentionPeriod && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">ระยะเวลาเก็บ:</span>
                    <span>{consentItem.retentionPeriod}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="font-medium">ให้ความยินยอม:</span>
                  <span>
                    {consentItem.timesGiven} / {consentItem.timesTotal} ครั้ง
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">ครั้งล่าสุด:</span>
                  <span>
                    {new Date(consentItem.latestConsentDate).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Show signature if exists */}
            {consentItem.hasSignature && (
              <button
                onClick={() => setExpandedSignature(consentItem.consentItemId)}
                className="ml-2 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                ✍️ ดูลายเซ็น
              </button>
            )}
          </div>

          {/* Expandable Signature Section */}
          {expandedSignature === consentItem.consentItemId && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                ลายเซ็นดิจิทัล:
              </p>

              {consentItem.allConsents
                .filter(c => c.hasSignature)
                .map((consent, sigIdx) => (
                  <div
                    key={sigIdx}
                    className="bg-gray-50 dark:bg-gray-800/50 rounded p-2 mb-2"
                  >
                    {/* Signature Image */}
                    <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded p-2 mb-2">
                      <img
                        src={consent.signatureDataUrl}
                        alt="Digital Signature"
                        className="max-w-full h-auto"
                        style={{ maxHeight: '100px' }}
                      />
                    </div>

                    {/* Signature Metadata */}
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">ชื่อ:</span>
                        <span>{consent.fullName || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">วันที่:</span>
                        <span>
                          {new Date(consent.consentedAt).toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </span>
                      </div>
                      {consent.ipAddress && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">IP Address:</span>
                          <span className="font-mono">{consent.ipAddress}</span>
                        </div>
                      )}
                      {consent.userAgent && (
                        <div className="flex items-start gap-2">
                          <span className="font-medium">User-Agent:</span>
                          <span className="text-[10px] break-all">{consent.userAgent}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
)}
```

**State Management**:
```jsx
const [expandedSignature, setExpandedSignature] = useState(null);
```

**Subtasks**:
- [ ] Add consent items section after PII fields table
- [ ] Map through `formGroup.consentItems` array
- [ ] Display consent item title, description, purpose, retention period
- [ ] Show consent statistics (timesGiven/timesTotal)
- [ ] Add "ดูลายเซ็น" button with state toggle
- [ ] Display signature image when expanded
- [ ] Show signature metadata (name, date, IP, user-agent)
- [ ] Test with different consent states (given/denied)

---

#### Task 2.2: Enhance Consents Tab with Signature Display (3 hours)

**File**: `src/components/pdpa/ProfileDetailModal.jsx`

**Location**: Consents Tab (lines 612-698)

**Current Code** (line 670-678):
```jsx
<div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
  <div className="flex justify-between">
    <span>วัตถุประสงค์: {consent.purpose || '-'}</span>
    <span>ระยะเวลาเก็บ: {consent.retentionPeriod || '-'}</span>
  </div>
  <div className="mt-1">
    ให้ความยินยอมเมื่อ: {new Date(consent.consentedAt).toLocaleDateString('th-TH')}
  </div>
</div>
```

**Enhanced Code**:
```jsx
<div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
  <div className="flex justify-between">
    <span>วัตถุประสงค์: {consent.purpose || '-'}</span>
    <span>ระยะเวลาเก็บ: {consent.retentionPeriod || '-'}</span>
  </div>
  <div className="mt-1 flex items-center justify-between">
    <span>
      ให้ความยินยอมเมื่อ: {new Date(consent.consentedAt).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}
    </span>

    {/* ✅ v0.8.5: Show signature indicator */}
    {consent.hasSignature && (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setExpandedConsentSignature(
            expandedConsentSignature === consent.id ? null : consent.id
          );
        }}
        className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        title="ดูลายเซ็นดิจิทัล"
      >
        <Edit2 className="w-3 h-3" />
        <span>ลายเซ็น</span>
      </button>
    )}
  </div>

  {/* ✅ v0.8.5: Expandable Signature Display */}
  {expandedConsentSignature === consent.id && consent.hasSignature && (
    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
        ลายเซ็นดิจิทัล:
      </p>

      <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
        {/* Signature Image */}
        <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded p-2 mb-3">
          <img
            src={consent.signatureDataUrl || consent.signature_data_url}
            alt="Digital Signature"
            className="max-w-full h-auto cursor-pointer"
            style={{ maxHeight: '120px' }}
            onClick={() => {
              // Open in modal for full view
              window.open(consent.signatureDataUrl || consent.signature_data_url, '_blank');
            }}
          />
        </div>

        {/* Signature Metadata */}
        <div className="space-y-2">
          {consent.metadata?.fullName && (
            <div className="flex items-center gap-2">
              <User className="w-3 h-3 text-gray-400" />
              <span className="font-medium">ชื่อผู้ลงนาม:</span>
              <span>{consent.metadata.fullName}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Calendar className="w-3 h-3 text-gray-400" />
            <span className="font-medium">วันที่-เวลา:</span>
            <span>
              {new Date(consent.metadata?.consentedAt || consent.consentedAt).toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </span>
          </div>

          {consent.metadata?.ipAddress && (
            <div className="flex items-center gap-2">
              <Globe className="w-3 h-3 text-gray-400" />
              <span className="font-medium">IP Address:</span>
              <span className="font-mono text-[10px]">{consent.metadata.ipAddress}</span>
            </div>
          )}

          {consent.metadata?.userAgent && (
            <div className="flex items-start gap-2">
              <Monitor className="w-3 h-3 text-gray-400 mt-0.5" />
              <span className="font-medium">User-Agent:</span>
              <span className="text-[10px] break-all text-gray-500 dark:text-gray-500">
                {consent.metadata.userAgent}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )}
</div>
```

**New Imports**:
```jsx
import { User, Calendar, Globe, Monitor } from 'lucide-react';
```

**State**:
```jsx
const [expandedConsentSignature, setExpandedConsentSignature] = useState(null);
```

**Subtasks**:
- [ ] Add signature button to consent metadata section
- [ ] Add expandedConsentSignature state
- [ ] Display signature image when expanded
- [ ] Show signature metadata (name, date/time, IP, user-agent)
- [ ] Add click to open full signature in new tab
- [ ] Test with consent that has signature
- [ ] Test with consent without signature (graceful handling)

---

#### Task 2.3: Create SignatureDisplayModal Component (2 hours)

**File**: `src/components/pdpa/SignatureDisplayModal.jsx` (NEW)

**Purpose**: Reusable modal for viewing full signature with metadata

```jsx
/**
 * SignatureDisplayModal
 *
 * Reusable modal component for displaying digital signatures with metadata
 *
 * @param {boolean} isOpen - Modal visibility
 * @param {function} onClose - Close handler
 * @param {object} signatureData - Signature data object
 * @param {string} signatureData.signatureDataUrl - Base64 signature image
 * @param {string} signatureData.fullName - Signer's name
 * @param {string} signatureData.consentedAt - Timestamp
 * @param {string} signatureData.ipAddress - IP address
 * @param {string} signatureData.userAgent - User-Agent string
 */

import React from 'react';
import { X, User, Calendar, Globe, Monitor, Download } from 'lucide-react';

const SignatureDisplayModal = ({ isOpen, onClose, signatureData }) => {
  if (!isOpen || !signatureData) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = signatureData.signatureDataUrl;
    link.download = `signature_${signatureData.fullName}_${new Date(signatureData.consentedAt).getTime()}.png`;
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            ลายเซ็นดิจิทัล
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Signature Image */}
          <div className="bg-gray-50 dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-lg p-6 mb-6">
            <img
              src={signatureData.signatureDataUrl}
              alt="Digital Signature"
              className="max-w-full h-auto mx-auto"
              style={{ maxHeight: '300px' }}
            />
          </div>

          {/* Metadata */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              ข้อมูลการลงนาม:
            </h4>

            {signatureData.fullName && (
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-gray-600 dark:text-gray-400">ชื่อผู้ลงนาม</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {signatureData.fullName}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-gray-600 dark:text-gray-400">วันที่-เวลาลงนาม</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(signatureData.consentedAt).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </p>
              </div>
            </div>

            {signatureData.ipAddress && (
              <div className="flex items-start gap-3">
                <Globe className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-gray-600 dark:text-gray-400">IP Address</p>
                  <p className="text-sm font-mono text-gray-900 dark:text-white">
                    {signatureData.ipAddress}
                  </p>
                </div>
              </div>
            )}

            {signatureData.userAgent && (
              <div className="flex items-start gap-3">
                <Monitor className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-gray-600 dark:text-gray-400">User-Agent</p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 break-all font-mono bg-gray-100 dark:bg-gray-900 p-2 rounded">
                    {signatureData.userAgent}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            ลายเซ็นนี้มีผลทางกฎหมายตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              ดาวน์โหลด
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignatureDisplayModal;
```

**Subtasks**:
- [ ] Create SignatureDisplayModal component
- [ ] Add signature image display with max-height
- [ ] Display all metadata fields
- [ ] Add download button (convert base64 to downloadable PNG)
- [ ] Add responsive design
- [ ] Test with sample signature data
- [ ] Import and use in ProfileDetailModal

---

### SPRINT 3: Testing & Documentation (Day 3 - 4 hours)

#### Task 3.1: Integration Testing (2 hours)

**Test Scenarios**:
1. [ ] **Forms Tab - No Consents**: Form without consent items (should show "ไม่มีความยินยอม")
2. [ ] **Forms Tab - With Consents**: Form with 2+ consent items (should display all)
3. [ ] **Forms Tab - With Signature**: Form with signature (should show "ดูลายเซ็น" button)
4. [ ] **Forms Tab - Multiple Submissions**: Form with 3 submissions, same consent items (should show timesGiven/timesTotal)
5. [ ] **Consents Tab - Signature Display**: Click signature button → should expand signature section
6. [ ] **Signature Image Loading**: Verify base64 images load correctly
7. [ ] **Signature Metadata**: Verify IP, User-Agent, timestamp display
8. [ ] **SignatureDisplayModal**: Open modal → download signature → verify PNG file
9. [ ] **Mobile Responsive**: Test on mobile viewport (signature should be readable)
10. [ ] **Dark Mode**: Verify signature display works in dark mode

**Backend API Testing**:
```bash
# Test getProfileDetail API
curl http://localhost:5000/api/v1/personal-data/profiles/{profileId} \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected response structure:
{
  "uniqueForms": [
    {
      "formId": "uuid",
      "formTitle": "ฟอร์มทดสอบ",
      "consentItems": [
        {
          "consentItemId": 1,
          "consentItemTitle": "ยินยอมให้เก็บข้อมูล",
          "consentItemDescription": "เพื่อติดต่อและให้บริการ",
          "purpose": "ติดต่อและให้บริการ",
          "retentionPeriod": "2 ปี",
          "consentGiven": true,
          "timesGiven": 2,
          "timesTotal": 3,
          "latestConsentDate": "2025-10-24T10:30:00Z",
          "allConsents": [
            {
              "hasSignature": true,
              "signatureDataUrl": "data:image/png;base64,...",
              "fullName": "John Doe",
              "consentedAt": "2025-10-24T10:30:00Z",
              "ipAddress": "192.168.1.100",
              "userAgent": "Mozilla/5.0..."
            }
          ]
        }
      ]
    }
  ]
}
```

---

#### Task 3.2: Documentation (2 hours)

**Files to Update**:

1. **CLAUDE.md** - Add v0.8.5 features
```markdown
## Latest Update - PDPA Forms & Consent Display Enhancement (v0.8.5-dev)

### Features Added
**Date**: 2025-10-24

1. **Consent Items in Forms Tab**
   - Display all consent items for each form
   - Show consent statistics (times given/total)
   - Show consent purpose and retention period

2. **Digital Signature Display**
   - View signature images in Forms tab
   - View signature images in Consents tab
   - SignatureDisplayModal component for full view
   - Download signature as PNG

3. **Consent Metadata**
   - IP Address
   - User-Agent
   - Full name
   - Timestamp with seconds precision

### Files Modified
- `backend/services/UnifiedUserProfileService.js` - Enhanced getProfileDetail()
- `src/components/pdpa/ProfileDetailModal.jsx` - Added consent items & signature display
- `src/components/pdpa/SignatureDisplayModal.jsx` - NEW component

### Testing
- ✅ Forms with consent items display correctly
- ✅ Signature images load from base64
- ✅ Consent statistics calculated correctly
- ✅ Metadata displays properly
```

2. **API_DOCUMENTATION.md** - Update endpoint documentation
```markdown
### GET /api/v1/personal-data/profiles/:id

Response includes:
- `uniqueForms[].consentItems[]` - Consent items for each form
- `uniqueForms[].consentItems[].allConsents[]` - All consent instances with signatures
- `consents[].hasSignature` - Boolean flag
- `consents[].signatureDataUrl` - Base64 signature image
- `consents[].metadata` - IP, user-agent, timestamp, name
```

3. **COMPONENT_GUIDE.md** - Add SignatureDisplayModal documentation
```markdown
## SignatureDisplayModal

Reusable modal for displaying digital signatures with full metadata.

**Props**:
- `isOpen` (boolean) - Modal visibility
- `onClose` (function) - Close handler
- `signatureData` (object) - Signature data with metadata

**Usage**:
```jsx
<SignatureDisplayModal
  isOpen={showSignature}
  onClose={() => setShowSignature(false)}
  signatureData={{
    signatureDataUrl: 'data:image/png;base64,...',
    fullName: 'John Doe',
    consentedAt: '2025-10-24T10:30:00Z',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0...'
  }}
/>
```
```

---

## 📊 SUCCESS CRITERIA

### Functional Requirements
- [ ] Forms tab displays all consent items for each form
- [ ] Consent statistics (times given/total) calculated correctly
- [ ] Digital signatures display in both Forms and Consents tabs
- [ ] Signature metadata (IP, user-agent, timestamp, name) visible
- [ ] SignatureDisplayModal opens and displays full signature
- [ ] Download signature works and produces valid PNG file
- [ ] Mobile responsive design works for signature display
- [ ] Dark mode works correctly for all new components

### Performance
- [ ] Signature images load within 500ms
- [ ] No layout shifts when expanding signatures
- [ ] Profile detail loads within 2 seconds with 10+ consents

### UX
- [ ] Clear visual distinction between given/denied consents
- [ ] Signature images are readable and not pixelated
- [ ] Metadata is displayed in user-friendly format (Thai locale)
- [ ] Expand/collapse signature sections work smoothly
- [ ] Download button provides clear feedback

---

## 🚀 IMPLEMENTATION TIMELINE

| Day | Sprint | Tasks | Hours |
|-----|--------|-------|-------|
| 1 | Backend | Task 1.1-1.4 | 8h |
| 2 | Frontend | Task 2.1-2.3 | 8h |
| 3 | Testing & Docs | Task 3.1-3.2 | 4h |
| **Total** | | | **20h** |

---

## 📌 NEXT STEPS

1. **Immediate**: Start Task 1.1 - Enhance getProfileDetail()
2. **After Backend**: Test with Postman to verify consentItems structure
3. **Frontend**: Implement Forms tab consent items display
4. **Final**: Create SignatureDisplayModal and test download

---

**Status**: ✅ PLAN READY - READY TO IMPLEMENT
**Priority**: ⭐⭐⭐⭐⭐ CRITICAL
**Version**: v0.8.5-dev
**Date**: 2025-10-24
