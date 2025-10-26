# PDPA DSR System Overhaul - Complete Implementation Plan

**Version**: v0.8.7-dev
**Date**: 2025-10-25
**Author**: Technical Documentation Writer
**Priority**: 🔥🔥🔥🔥🔥 PRODUCTION CRITICAL - CTO MANDATED
**Estimated Duration**: 5-7 sprints (30-40 hours total)

---

## 📋 Executive Summary

This plan addresses comprehensive requirements for overhauling the Q-Collector PDPA DSR (Data Subject Rights) system to achieve full PDPA Thailand compliance. The implementation covers 5 major parts:

1. **UI Improvements** - Simplify ProfileDetailModal tabs and displays
2. **Consent History Fix** - Fix "View History" button error
3. **Complete DSR Workflow** - 8-step workflow with auto-form population
4. **DSR-Consent Linkage** - Require approved DSR before consent edits
5. **Complete Audit Trail** - PDPA Article 39 compliance

---

## 🎯 User Requirements Analysis (CTO-Mandated)

### PART 1: UI Improvements (ProfileDetailModal)

**Current Issues**:
- 3 tabs: "ภาพรวม", "Consents", "DSR Requests"
- PII fields table has 3 columns: "ฟิลด์", "ประเภท", "ค่า"
- Consent display shows: title, purpose, retention, statistics (X/Y times), latest date

**Required Changes**:
1. ❌ **Remove "ภาพรวม" tab** completely
2. ✅ **Simplify PII table** to 2 columns: "ฟิลด์", "ค่า" (remove "ประเภท")
3. ✅ **Simplify consent display** - show only:
   - หัวข้อความยินยอม (Consent title)
   - วัตถุประสงค์ (Purpose)
   - ระยะเวลาเก็บ (Retention period)
   - Remove statistics and latest date

**Impact**: Low complexity, high user satisfaction
**Estimated Time**: 1-2 hours

---

### PART 2: Fix Consent History Error

**Current Issue**:
- Clicking "View History" button causes error
- ConsentHistoryTab component expects `userConsentId` prop
- Backend API `/api/v1/personal-data/consent-history/:consentId` exists

**Required Fix**:
1. Identify exact error message and cause
2. Fix prop mismatch in ProfileDetailModal
3. Ensure backend returns correct data structure
4. Display history correctly with:
   - First entry: "วันที่ให้ความยินยอม" (initial consent date)
   - Subsequent entries: changes with date, reason, DSR reference

**Impact**: Medium complexity, critical functionality
**Estimated Time**: 2-3 hours

---

### PART 3: Complete DSR Workflow System

**Current System**:
- Basic DSR request creation exists
- DSRRequest model has status: pending, in_progress, completed, rejected, cancelled
- No review, approve/reject, or execute workflow steps

**Required Implementation**:

#### 3.1 DSR Request Submission
- ✅ Generate DSR number automatically (format: DSR-YYYYMMDD-XXXX)
- ✅ Auto-populate "ระบุฟอร์มเฉพาะ" field with ALL forms containing data subject's data
- ✅ If multiple forms, display as multi-select checkbox list
- ✅ Field validation and user-friendly error messages

#### 3.2 DSR Review Process
- ✅ Data controller reviews legal basis for data processing
- ✅ UI panel showing:
  - DSR details (type, reason, requested forms)
  - Data subject information (all linked profiles)
  - Forms and PII fields affected
  - Legal basis assessment form
- ✅ Determine if request can be fulfilled under PDPA law

#### 3.3 Approve/Reject Decision
- ✅ **If Rejected**:
  - Log rejection date (`rejected_at`)
  - Record reason for rejection (`rejection_reason`)
  - Log date of notification to data subject (`notification_sent_at`)
  - Generate rejection notice template
- ✅ **If Approved**:
  - Log approval date (`approved_at`)
  - Record DSR number
  - Log detailed information about rights exercised
  - Assign to executor role

#### 3.4 Record Details by Right Type

**Right to Rectification**:
```json
{
  "rightType": "rectification",
  "changes": [
    {
      "field": "email",
      "oldValue": "old@example.com",
      "newValue": "new@example.com",
      "reason": "User requested correction"
    }
  ]
}
```

**Right to Access**:
```json
{
  "rightType": "access",
  "requestedData": {
    "view": true,
    "copy": true,
    "format": "JSON",
    "specificForms": ["form-id-1", "form-id-2"]
  }
}
```

**Right to Erasure**:
```json
{
  "rightType": "erasure",
  "dataToDelete": {
    "forms": ["form-id-1"],
    "fields": ["email", "phone"],
    "retainForLegal": false
  }
}
```

**Right to Data Portability**:
```json
{
  "rightType": "portability",
  "transferDetails": {
    "format": "JSON",
    "destination": "user@example.com",
    "includeAttachments": true
  }
}
```

**Right to Restriction**:
```json
{
  "rightType": "restriction",
  "restrictions": {
    "processingType": ["marketing", "analytics"],
    "duration": "6 months",
    "reason": "Contesting accuracy"
  }
}
```

**Right to Object**:
```json
{
  "rightType": "objection",
  "objections": {
    "processingTypes": ["direct_marketing"],
    "grounds": "Personal situation",
    "stopImmediately": true
  }
}
```

#### 3.5 Execute & Close
- ✅ Execute actions based on DSR type
- ✅ Generate completion report
- ✅ Notify data subject
- ✅ Close DSR with full audit trail

**Impact**: High complexity, critical for PDPA compliance
**Estimated Time**: 16-20 hours

---

### PART 4: Link DSR to Consent Changes

**Requirement**: Must have approved DSR before editing consent

**Implementation**:
1. ✅ Check for approved DSRs when editing consent
2. ✅ If no approved DSR exists, show warning modal:
   - "การแก้ไขความยินยอมต้องมีคำขอใช้สิทธิ์ที่ได้รับอนุมัติแล้ว"
   - "คุณต้องการสร้างคำขอใช้สิทธิ์ประเภท 'Right to Rectification' หรือไม่?"
   - [สร้างคำขอ DSR] [ยกเลิก]
3. ✅ Auto-populate DSR dropdown with available approved DSRs
4. ✅ Record DSR number in consent history
5. ✅ Backend validation: reject consent edit if no approved DSR

**Database Changes**:
```sql
ALTER TABLE consent_history ADD COLUMN dsr_request_id UUID REFERENCES dsr_requests(id);
CREATE INDEX idx_consent_history_dsr ON consent_history(dsr_request_id);
```

**Impact**: Medium complexity, critical for compliance
**Estimated Time**: 4-5 hours

---

### PART 5: Complete Audit Trail (PDPA Article 39)

**Requirement**: All actions must be logged

**Audit Log Structure**:
```json
{
  "id": "uuid",
  "eventType": "consent_edited | dsr_created | dsr_approved | data_exported",
  "actorId": "user-uuid",
  "actorRole": "data_controller | admin | system",
  "targetId": "resource-uuid",
  "targetType": "consent | dsr_request | submission",
  "action": "create | update | delete | approve | reject",
  "changes": {
    "before": { },
    "after": { }
  },
  "reason": "User-provided justification",
  "legalBasis": "Section 19 - Right to withdraw consent",
  "dsrReference": "DSR-20251025-0001",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2025-10-25T10:30:00Z"
}
```

**Events to Log**:
1. DSR Request: created, reviewed, approved, rejected, executed, completed
2. Consent: given, withdrawn, edited, renewed, expired
3. Data Access: viewed, exported, downloaded
4. Data Modification: rectified, deleted, restricted
5. System: retention_executed, backup_created, audit_accessed

**Impact**: High complexity, mandatory for compliance
**Estimated Time**: 6-8 hours

---

## 🏗️ Sprint Planning (7 Sprints)

### Sprint 1: UI Improvements (ProfileDetailModal)
**Duration**: 1-2 hours
**Priority**: 🔥 HIGH (Quick win for user satisfaction)

#### Tasks

**Task 1.1: Remove "ภาพรวม" tab (20 min)**
- File: `src/components/pdpa/ProfileDetailModal.jsx`
- Lines: 260-298 (tab button), 304-421 (tab content)
- Remove tab button (line 262-271)
- Remove tab content (lines 304-421)
- Update activeTab default to 'forms' (line 47)

**Task 1.2: Simplify PII fields table (15 min)**
- File: `src/components/pdpa/ProfileDetailModal.jsx`
- Lines: 478-523 (PII table)
- Remove "ประเภท" column header (line 484-486)
- Remove "ประเภท" data cell (lines 501-505)
- Update grid layout: `grid-cols-3` → `grid-cols-2`

**Task 1.3: Simplify consent item display (25 min)**
- File: `src/components/pdpa/ProfileDetailModal.jsx`
- Lines: 528-723 (consent items section)
- Remove statistics display (lines 572-580)
- Remove latest date display (lines 579-590)
- Keep only: title, description, purpose, retention period
- Remove `timesGiven`, `timesTotal`, `latestConsentDate` from data structure

**Acceptance Criteria**:
- ✅ Only 2 tabs visible: "Consents", "DSR Requests"
- ✅ PII table shows only 2 columns
- ✅ Consent display simplified (no stats, no dates)
- ✅ No errors in console
- ✅ Mobile responsive still working

---

### Sprint 2: Fix Consent History Error
**Duration**: 2-3 hours
**Priority**: 🔥🔥 CRITICAL (Blocking functionality)

#### Tasks

**Task 2.1: Diagnose error cause (30 min)**
- Open Chrome DevTools → Console
- Click "View History" button on consent item
- Capture exact error message and stack trace
- Inspect ConsentHistoryTab props
- Check PersonalDataService.getConsentHistory() API call
- Verify backend endpoint `/api/v1/personal-data/consent-history/:consentId`

**Task 2.2: Fix prop mismatch (30 min)**
- File: `src/components/pdpa/ProfileDetailModal.jsx`
- Issue: Lines 714-716 pass `userConsentId` prop
- Solution: ConsentHistoryTab expects either:
  - `userConsentId` (for specific consent record)
  - OR `consentId` (for consent item ID)
- Fix prop passing to match ConsentHistoryTab.jsx line 32

**Task 2.3: Verify backend API response (20 min)**
- File: `backend/services/UnifiedUserProfileService.js`
- Method: `getConsentHistory()`
- Check response format matches frontend expectations
- Ensure `consent_id` → `consentId` conversion (toJSON)
- Test API directly: `curl http://localhost:5000/api/v1/personal-data/consent-history/{id}`

**Task 2.4: Enhance history display (40 min)**
- File: `src/components/pdpa/ConsentHistoryTab.jsx`
- Add "วันที่ให้ความยินยอม" as first entry (initial consent)
- Format subsequent entries with DSR reference
- Example:
  ```
  ✅ วันที่ให้ความยินยอม
     23 ต.ค. 2568 14:30

  ✏️ แก้ไขความยินยอม
     24 ต.ค. 2568 10:15
     เหตุผล: ขอเปลี่ยนแปลงขอบเขตการใช้ข้อมูล
     DSR: DSR-20251024-0001
  ```

**Task 2.5: Test all consent history scenarios (20 min)**
- New consent (no history) - should show initial consent only
- Edited consent - should show edit history with reason
- Consent with DSR link - should show DSR reference
- Multiple edits - should show timeline correctly

**Acceptance Criteria**:
- ✅ "View History" button works without errors
- ✅ History displays with correct data
- ✅ Initial consent date shown as first entry
- ✅ DSR references displayed when available
- ✅ Timeline sorted correctly (newest first)
- ✅ Loading states working
- ✅ Error handling graceful

---

### Sprint 3: Database Schema for DSR Workflow
**Duration**: 4-5 hours
**Priority**: 🔥🔥🔥 CRITICAL (Foundation for workflow)

#### Tasks

**Task 3.1: Design enhanced dsr_requests table (30 min)**

```sql
-- Migration: 20251025000002-enhance-dsr-requests-workflow.js

ALTER TABLE dsr_requests ADD COLUMN IF NOT EXISTS dsr_number VARCHAR(50) UNIQUE;
ALTER TABLE dsr_requests ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);
ALTER TABLE dsr_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
ALTER TABLE dsr_requests ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE dsr_requests ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);
ALTER TABLE dsr_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE dsr_requests ADD COLUMN IF NOT EXISTS approval_notes TEXT;
ALTER TABLE dsr_requests ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES users(id);
ALTER TABLE dsr_requests ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;
ALTER TABLE dsr_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE dsr_requests ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP;
ALTER TABLE dsr_requests ADD COLUMN IF NOT EXISTS executed_by UUID REFERENCES users(id);
ALTER TABLE dsr_requests ADD COLUMN IF NOT EXISTS executed_at TIMESTAMP;
ALTER TABLE dsr_requests ADD COLUMN IF NOT EXISTS execution_details JSONB;
ALTER TABLE dsr_requests ADD COLUMN IF NOT EXISTS specific_forms JSONB;
ALTER TABLE dsr_requests ADD COLUMN IF NOT EXISTS affected_forms TEXT[];
ALTER TABLE dsr_requests ADD COLUMN IF NOT EXISTS legal_basis_assessment TEXT;

-- Add workflow states
ALTER TYPE dsr_status ADD VALUE IF NOT EXISTS 'under_review';
ALTER TYPE dsr_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE dsr_status ADD VALUE IF NOT EXISTS 'executing';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dsr_dsr_number ON dsr_requests(dsr_number);
CREATE INDEX IF NOT EXISTS idx_dsr_reviewed_by ON dsr_requests(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_dsr_approved_by ON dsr_requests(approved_by);
CREATE INDEX IF NOT EXISTS idx_dsr_specific_forms ON dsr_requests USING GIN(specific_forms);
```

**Task 3.2: Enhance dsr_actions table (30 min)**

```sql
-- Migration: 20251025000003-enhance-dsr-actions.js

ALTER TABLE dsr_actions ADD COLUMN IF NOT EXISTS dsr_number VARCHAR(50);
ALTER TABLE dsr_actions ADD COLUMN IF NOT EXISTS legal_basis TEXT;
ALTER TABLE dsr_actions ADD COLUMN IF NOT EXISTS right_type_details JSONB;

-- Right type details structure examples:
-- rectification: { changes: [ { field, oldValue, newValue, reason } ] }
-- access: { requestedData: { view, copy, format, specificForms } }
-- erasure: { dataToDelete: { forms, fields, retainForLegal } }
-- portability: { transferDetails: { format, destination, includeAttachments } }
-- restriction: { restrictions: { processingType, duration, reason } }
-- objection: { objections: { processingTypes, grounds, stopImmediately } }
```

**Task 3.3: Enhance consent_history table (30 min)**

```sql
-- Migration: 20251025000004-add-dsr-to-consent-history.js

ALTER TABLE consent_history ADD COLUMN IF NOT EXISTS dsr_request_id UUID REFERENCES dsr_requests(id);
ALTER TABLE consent_history ADD COLUMN IF NOT EXISTS requires_dsr BOOLEAN DEFAULT false;
ALTER TABLE consent_history ADD COLUMN IF NOT EXISTS dsr_validation_status VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_consent_history_dsr ON consent_history(dsr_request_id);
```

**Task 3.4: Create pdpa_audit_log table (1 hour)**

```sql
-- Migration: 20251025000005-create-pdpa-audit-log.js

CREATE TABLE IF NOT EXISTS pdpa_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL, -- consent_edited, dsr_created, data_exported, etc.
  actor_id UUID REFERENCES users(id),
  actor_role VARCHAR(50), -- data_controller, admin, system
  actor_name VARCHAR(255),
  target_id UUID, -- Resource ID (consent, dsr, submission)
  target_type VARCHAR(50), -- consent, dsr_request, submission, profile
  action VARCHAR(50), -- create, update, delete, approve, reject, execute
  changes JSONB, -- { before: {}, after: {} }
  reason TEXT,
  legal_basis TEXT, -- PDPA section reference
  dsr_reference VARCHAR(50), -- DSR-YYYYMMDD-XXXX
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Indexes
  INDEX idx_audit_event_type (event_type),
  INDEX idx_audit_actor (actor_id),
  INDEX idx_audit_target (target_id, target_type),
  INDEX idx_audit_dsr_ref (dsr_reference),
  INDEX idx_audit_created_at (created_at),
  INDEX idx_audit_metadata USING GIN(metadata)
);

-- Partition by month for performance (future optimization)
-- CREATE TABLE pdpa_audit_log_2025_10 PARTITION OF pdpa_audit_log
-- FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
```

**Task 3.5: Update Sequelize models (1 hour)**
- File: `backend/models/DSRRequest.js`
  - Add new fields to model definition
  - Add validation rules
  - Update toJSON() method for camelCase conversion
  - Add instance methods: review(), approve(), reject(), execute()

- File: `backend/models/DSRAction.js`
  - Add new fields
  - Update validation

- File: `backend/models/ConsentHistory.js`
  - Add dsr_request_id field
  - Add association to DSRRequest

- File: `backend/models/PDPAAuditLog.js` (NEW)
  - Create new model
  - Define schema with all fields
  - Add class methods for common queries
  - Add scopes for filtering by event type

**Task 3.6: Test migrations (30 min)**
- Run migrations on development database
- Verify all columns added correctly
- Check indexes created
- Test rollback functionality
- Verify foreign key constraints

**Acceptance Criteria**:
- ✅ All migrations run successfully
- ✅ No data loss
- ✅ All indexes created
- ✅ Models updated and sync correctly
- ✅ Rollback tested and working
- ✅ Schema documented in CLAUDE.md

---

### Sprint 4: DSR Submission & Form Auto-Population
**Duration**: 5-6 hours
**Priority**: 🔥🔥🔥 CRITICAL (User-facing feature)

#### Tasks

**Task 4.1: Create DSR number generator (30 min)**
- File: `backend/utils/dsr-number-generator.js` (NEW)

```javascript
/**
 * Generate unique DSR number
 * Format: DSR-YYYYMMDD-XXXX
 * Example: DSR-20251025-0001
 */
const { DSRRequest } = require('../models');

async function generateDSRNumber() {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD

  // Find highest sequence number for today
  const prefix = `DSR-${dateStr}-`;
  const latestDSR = await DSRRequest.findOne({
    where: {
      dsr_number: { [Op.like]: `${prefix}%` }
    },
    order: [['dsr_number', 'DESC']]
  });

  let sequence = 1;
  if (latestDSR && latestDSR.dsr_number) {
    const lastSeq = parseInt(latestDSR.dsr_number.split('-')[2], 10);
    sequence = lastSeq + 1;
  }

  const dsrNumber = `${prefix}${sequence.toString().padStart(4, '0')}`;
  return dsrNumber;
}

module.exports = { generateDSRNumber };
```

**Task 4.2: Create getFormsForProfile API endpoint (1 hour)**
- File: `backend/api/routes/personalData.routes.js`
- Add endpoint: `GET /api/v1/personal-data/profiles/:profileId/forms`

```javascript
/**
 * GET /api/v1/personal-data/profiles/:profileId/forms
 * Get all forms that contain data for a specific profile
 */
router.get('/profiles/:profileId/forms', async (req, res) => {
  try {
    const { profileId } = req.params;

    // Get profile with all form IDs
    const profile = await UnifiedUserProfile.findByPk(profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get all forms that this profile has submitted
    const forms = await Form.findAll({
      where: {
        id: { [Op.in]: profile.form_ids }
      },
      attributes: ['id', 'title', 'table_name', 'created_at'],
      include: [
        {
          model: PersonalDataField,
          as: 'personalDataFields',
          attributes: ['id', 'field_id', 'data_category', 'is_sensitive'],
          include: [
            {
              model: Field,
              as: 'field',
              attributes: ['id', 'title', 'type']
            }
          ]
        }
      ],
      order: [['title', 'ASC']]
    });

    // Enrich with submission count and PII field count
    const enrichedForms = forms.map(form => {
      const submissionCount = profile.submission_ids.filter(subId =>
        // Count submissions for this form (would need to query submissions table)
        true // Placeholder
      ).length;

      return {
        id: form.id,
        title: form.title,
        tableName: form.table_name,
        submissionCount,
        piiFieldCount: form.personalDataFields?.length || 0,
        piiFields: form.personalDataFields?.map(pdf => ({
          fieldId: pdf.field_id,
          fieldTitle: pdf.field?.title,
          fieldType: pdf.field?.type,
          dataCategory: pdf.data_category,
          isSensitive: pdf.is_sensitive
        })) || []
      };
    });

    res.json({
      profileId,
      totalForms: enrichedForms.length,
      forms: enrichedForms
    });

  } catch (error) {
    logger.error('Error getting forms for profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Task 4.3: Update DSRRequestForm component (2 hours)**
- File: `src/components/pdpa/DSRRequestForm.jsx`
- Lines: 259-279 (specificForms input field)

**Changes**:
1. Add state for available forms
2. Fetch forms on component mount using `profileId`
3. Replace text input with multi-select checkbox list
4. Auto-populate all forms by default (user can uncheck)
5. Show form details: title, submission count, PII fields count
6. Add "Select All" / "Deselect All" buttons

```jsx
// Add state
const [availableForms, setAvailableForms] = useState([]);
const [selectedForms, setSelectedForms] = useState([]);
const [loadingForms, setLoadingForms] = useState(true);

// Fetch forms on mount
useEffect(() => {
  const fetchForms = async () => {
    try {
      setLoadingForms(true);
      const response = await PersonalDataService.getProfileForms(profileId);
      setAvailableForms(response.forms);
      // Auto-select all forms by default
      setSelectedForms(response.forms.map(f => f.id));
    } catch (error) {
      logger.error('Failed to fetch forms:', error);
      toast.error('ไม่สามารถโหลดรายการฟอร์มได้');
    } finally {
      setLoadingForms(false);
    }
  };

  if (profileId) {
    fetchForms();
  }
}, [profileId]);

// Handle form selection
const handleToggleForm = (formId) => {
  setSelectedForms(prev =>
    prev.includes(formId)
      ? prev.filter(id => id !== formId)
      : [...prev, formId]
  );
};

// Render multi-select
<div className="space-y-2">
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
    ระบุฟอร์มเฉพาะ (เลือกฟอร์มที่ต้องการดำเนินการ)
  </label>

  <div className="flex gap-2 mb-2">
    <button
      type="button"
      onClick={() => setSelectedForms(availableForms.map(f => f.id))}
      className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
    >
      เลือกทั้งหมด
    </button>
    <button
      type="button"
      onClick={() => setSelectedForms([])}
      className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
    >
      ยกเลิกทั้งหมด
    </button>
  </div>

  {loadingForms ? (
    <div className="text-sm text-gray-500">กำลังโหลดฟอร์ม...</div>
  ) : availableForms.length === 0 ? (
    <div className="text-sm text-gray-500">ไม่พบฟอร์มที่เกี่ยวข้อง</div>
  ) : (
    <div className="max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg">
      {availableForms.map(form => (
        <label
          key={form.id}
          className="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-0"
        >
          <input
            type="checkbox"
            checked={selectedForms.includes(form.id)}
            onChange={() => handleToggleForm(form.id)}
            className="mt-1 h-4 w-4 text-orange-600 rounded focus:ring-orange-500"
          />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {form.title}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {form.submissionCount} การส่ง • {form.piiFieldCount} ฟิลด์ PII
            </div>
          </div>
        </label>
      ))}
    </div>
  )}

  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
    {selectedForms.length} ฟอร์มถูกเลือก จากทั้งหมด {availableForms.length} ฟอร์ม
  </p>
</div>
```

**Task 4.4: Add PersonalDataService.getProfileForms() (20 min)**
- File: `src/services/PersonalDataService.js`

```javascript
/**
 * Get all forms containing data for a profile
 * @param {string} profileId - Profile UUID
 * @returns {Promise<Object>} Forms data
 */
async getProfileForms(profileId) {
  try {
    const response = await apiClient.get(`/personal-data/profiles/${profileId}/forms`);
    return response.data;
  } catch (error) {
    logger.error('Error getting profile forms:', error);
    throw error;
  }
}
```

**Task 4.5: Update DSR creation API to include DSR number (30 min)**
- File: `backend/api/routes/personalData.routes.js`
- Endpoint: `POST /api/v1/personal-data/dsr-requests`

```javascript
// In createDSRRequest handler
const { generateDSRNumber } = require('../../utils/dsr-number-generator');

// Generate DSR number
const dsrNumber = await generateDSRNumber();

// Store affected forms
const affectedForms = requestDetails.specificForms || [];

const dsrRequest = await DSRRequest.create({
  profile_id: profileId,
  dsr_number: dsrNumber, // Add DSR number
  request_type: requestType,
  user_identifier: userIdentifier,
  request_details: requestDetails,
  affected_forms: affectedForms, // Add affected forms array
  status: 'pending',
  ip_address: req.ip,
  user_agent: req.get('user-agent')
});
```

**Task 4.6: Test form auto-population (30 min)**
- Open DSRRequestForm for a profile with multiple forms
- Verify all forms are auto-selected
- Test select all / deselect all buttons
- Verify form details display correctly
- Test submission with selected forms

**Acceptance Criteria**:
- ✅ DSR number generated correctly (DSR-YYYYMMDD-XXXX)
- ✅ All forms auto-populated in multi-select
- ✅ Form details displayed (title, submission count, PII count)
- ✅ Select all / deselect all working
- ✅ API endpoint returns correct data
- ✅ DSR created with affected_forms array
- ✅ Mobile responsive
- ✅ No performance issues with many forms

---

### Sprint 5: DSR Review & Approval Workflow
**Duration**: 6-8 hours
**Priority**: 🔥🔥🔥 CRITICAL (Core workflow)

#### Tasks

**Task 5.1: Create DSR Review Modal UI (2 hours)**
- File: `src/components/pdpa/DSRReviewModal.jsx` (NEW - 400+ lines)

**Component Structure**:
```jsx
const DSRReviewModal = ({ dsrRequest, onClose, onReviewComplete }) => {
  const [reviewData, setReviewData] = useState({
    legalBasisAssessment: '',
    canFulfill: null, // true = approve, false = reject
    reviewNotes: '',
    approvalNotes: '',
    rejectionReason: '',
    notificationMethod: 'email'
  });

  // Sections:
  // 1. DSR Request Summary
  // 2. Data Subject Information
  // 3. Affected Forms & PII Fields
  // 4. Legal Basis Assessment
  // 5. Decision (Approve/Reject)
  // 6. Review Notes & Actions

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Modal content */}
    </div>
  );
};
```

**Features**:
1. **DSR Request Summary Section**:
   - DSR Number (large, prominent)
   - Request Type with icon
   - Status badge
   - Reason/details from requester
   - Requested date & deadline (30-day countdown)

2. **Data Subject Information Section**:
   - Primary email/phone
   - Linked identifiers
   - Total submissions
   - Total forms
   - First/last submission dates

3. **Affected Forms & PII Fields Section**:
   - Table of selected forms
   - For each form: title, submission count, PII fields list
   - Visual indicators for sensitive fields
   - Estimated data volume

4. **Legal Basis Assessment Section**:
   - Textarea for data controller's legal assessment
   - PDPA section references dropdown
   - Predefined templates for common scenarios
   - Risk assessment checklist

5. **Decision Section**:
   - Radio buttons: Approve / Reject
   - If Approve:
     - Approval notes textarea
     - Assign to executor dropdown
     - Estimated completion date picker
   - If Reject:
     - Rejection reason textarea (required, min 50 chars)
     - Notification date picker
     - Generate rejection notice template

6. **Action Buttons**:
   - [บันทึกการตรวจสอบ] (Save review, status: under_review)
   - [อนุมัติคำขอ] (Approve, status: approved)
   - [ปฏิเสธคำขอ] (Reject, status: rejected)
   - [ยกเลิก] (Cancel)

**Task 5.2: Create DSRActionService (1.5 hours)**
- File: `backend/services/DSRActionService.js` (NEW - 300+ lines)

```javascript
class DSRActionService {
  /**
   * Review DSR request
   * @param {string} dsrRequestId - DSR request UUID
   * @param {string} reviewerId - User UUID
   * @param {Object} reviewData - Review data
   */
  async reviewDSRRequest(dsrRequestId, reviewerId, reviewData) {
    const transaction = await sequelize.transaction();

    try {
      const dsrRequest = await DSRRequest.findByPk(dsrRequestId, { transaction });
      if (!dsrRequest) {
        throw new Error('DSR request not found');
      }

      // Update DSR request
      dsrRequest.status = 'under_review';
      dsrRequest.reviewed_by = reviewerId;
      dsrRequest.reviewed_at = new Date();
      dsrRequest.review_notes = reviewData.reviewNotes;
      dsrRequest.legal_basis_assessment = reviewData.legalBasisAssessment;
      await dsrRequest.save({ transaction });

      // Create DSR action log
      await DSRAction.create({
        dsr_request_id: dsrRequestId,
        action: 'reviewed',
        actor_id: reviewerId,
        action_data: reviewData,
        notes: reviewData.reviewNotes
      }, { transaction });

      // Create PDPA audit log
      await PDPAAuditLog.create({
        event_type: 'dsr_reviewed',
        actor_id: reviewerId,
        target_id: dsrRequestId,
        target_type: 'dsr_request',
        action: 'review',
        reason: reviewData.reviewNotes,
        legal_basis: reviewData.legalBasisAssessment,
        dsr_reference: dsrRequest.dsr_number
      }, { transaction });

      await transaction.commit();

      logger.info(`DSR ${dsrRequest.dsr_number} reviewed by user ${reviewerId}`);
      return dsrRequest;

    } catch (error) {
      await transaction.rollback();
      logger.error('Error reviewing DSR request:', error);
      throw error;
    }
  }

  /**
   * Approve DSR request
   */
  async approveDSRRequest(dsrRequestId, approverId, approvalData) {
    // Similar structure to reviewDSRRequest
    // Set status: 'approved'
    // Set approved_by, approved_at, approval_notes
    // Create action log and audit log
  }

  /**
   * Reject DSR request
   */
  async rejectDSRRequest(dsrRequestId, rejecterId, rejectionData) {
    // Similar structure
    // Set status: 'rejected'
    // Set rejected_by, rejected_at, rejection_reason
    // Set notification_sent_at
    // Generate rejection notice
    // Create action log and audit log
  }

  /**
   * Execute DSR request
   */
  async executeDSRRequest(dsrRequestId, executorId, executionData) {
    // Set status: 'executing' → 'completed'
    // Perform actual data operations based on request type
    // Log all actions in execution_details
    // Create completion report
  }

  /**
   * Get DSR request with full details
   */
  async getDSRRequestDetail(dsrRequestId) {
    // Fetch DSR request with all associations
    // Include profile, forms, actions, audit logs
    // Return comprehensive object
  }
}

module.exports = new DSRActionService();
```

**Task 5.3: Create API routes for DSR workflow (1 hour)**
- File: `backend/api/routes/dsr.routes.js` (NEW)

```javascript
const router = require('express').Router();
const DSRActionService = require('../../services/DSRActionService');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

/**
 * PUT /api/v1/dsr/:id/review
 * Review DSR request
 * Roles: data_controller, admin
 */
router.put('/:id/review',
  authenticate,
  authorize(['data_controller', 'admin']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const reviewData = req.body;

      const dsrRequest = await DSRActionService.reviewDSRRequest(
        id,
        req.user.id,
        reviewData
      );

      res.json(dsrRequest);
    } catch (error) {
      logger.error('Error reviewing DSR:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * PUT /api/v1/dsr/:id/approve
 * Approve DSR request
 * Roles: data_controller, admin
 */
router.put('/:id/approve',
  authenticate,
  authorize(['data_controller', 'admin']),
  async (req, res) => {
    // Implementation
  }
);

/**
 * PUT /api/v1/dsr/:id/reject
 * Reject DSR request
 * Roles: data_controller, admin
 */
router.put('/:id/reject',
  authenticate,
  authorize(['data_controller', 'admin']),
  async (req, res) => {
    // Implementation
  }
);

/**
 * PUT /api/v1/dsr/:id/execute
 * Execute approved DSR request
 * Roles: data_controller, admin, dsr_executor
 */
router.put('/:id/execute',
  authenticate,
  authorize(['data_controller', 'admin', 'dsr_executor']),
  async (req, res) => {
    // Implementation
  }
);

/**
 * GET /api/v1/dsr/:id/detail
 * Get comprehensive DSR request details
 */
router.get('/:id/detail',
  authenticate,
  authorize(['data_controller', 'admin']),
  async (req, res) => {
    // Implementation
  }
);

module.exports = router;
```

**Task 5.4: Add DSR review UI to ProfileDetailModal (1 hour)**
- File: `src/components/pdpa/ProfileDetailModal.jsx`
- Lines: 982-1065 (DSR Requests tab)

**Changes**:
1. Add "Review" button for pending DSRs (data_controller role only)
2. Show detailed status for each DSR:
   - Pending: [Review] button
   - Under Review: "กำลังตรวจสอบโดย {reviewer}"
   - Approved: "อนุมัติโดย {approver} เมื่อ {date}"
   - Rejected: "ปฏิเสธโดย {rejecter} - {reason}"
3. Show deadline countdown
4. Color-coded status badges
5. Open DSRReviewModal on Review button click

**Task 5.5: Test DSR workflow (1.5 hours)**
- Create test DSR requests for all 6 types
- Test review process with legal basis assessment
- Test approve workflow with executor assignment
- Test reject workflow with rejection notice
- Verify audit logs created correctly
- Test role-based access control
- Test deadline tracking

**Acceptance Criteria**:
- ✅ Review modal displays all information correctly
- ✅ Legal basis assessment captured
- ✅ Approve workflow updates status and creates logs
- ✅ Reject workflow generates rejection notice
- ✅ Role-based access working (only data_controller can review)
- ✅ Audit trail complete for all actions
- ✅ Deadline countdown accurate
- ✅ Mobile responsive
- ✅ No errors in workflow state transitions

---

### Sprint 6: DSR-Consent Linkage
**Duration**: 4-5 hours
**Priority**: 🔥🔥 HIGH (Compliance requirement)

#### Tasks

**Task 6.1: Add DSR requirement to ConsentEditModal (1 hour)**
- File: `src/components/pdpa/ConsentEditModal.jsx`

**Changes**:
1. Add state for available approved DSRs
2. Fetch approved DSRs for this profile on mount
3. Add DSR dropdown/radio selection (required field)
4. If no approved DSRs exist, show warning modal:

```jsx
// Warning Modal JSX
<div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-700 rounded-lg p-4 mb-4">
  <div className="flex items-start gap-3">
    <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
    <div>
      <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
        ต้องมีคำขอใช้สิทธิ์ที่ได้รับอนุมัติก่อน
      </h3>
      <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
        การแก้ไขความยินยอมต้องมีคำขอใช้สิทธิ์ (DSR) ที่ได้รับอนุมัติแล้ว
        ตามมาตรา 19 พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล
      </p>
      <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-4">
        คุณต้องการสร้างคำขอใช้สิทธิ์ประเภท "Right to Rectification" หรือไม่?
      </p>
      <div className="flex gap-3">
        <button
          onClick={handleCreateDSRForConsent}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg"
        >
          สร้างคำขอ DSR
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg"
        >
          ยกเลิก
        </button>
      </div>
    </div>
  </div>
</div>
```

5. Add DSR selection field:

```jsx
{/* DSR Selection (required) */}
{approvedDSRs.length > 0 && (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
      เลือกคำขอใช้สิทธิ์ (DSR) *
      <span className="text-xs text-gray-500 ml-2">
        (ต้องมีคำขอที่ได้รับอนุมัติแล้ว)
      </span>
    </label>

    <div className="space-y-2">
      {approvedDSRs.map(dsr => (
        <label
          key={dsr.id}
          className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
            selectedDSR === dsr.id
              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-orange-300'
          }`}
        >
          <input
            type="radio"
            name="dsr_selection"
            value={dsr.id}
            checked={selectedDSR === dsr.id}
            onChange={() => setSelectedDSR(dsr.id)}
            className="mt-1 h-4 w-4 text-orange-600"
          />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {dsr.dsrNumber} - {getDSRTypeName(dsr.requestType)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              อนุมัติเมื่อ: {formatDate(dsr.approvedAt)}
            </div>
            {dsr.approvalNotes && (
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 italic">
                หมายเหตุ: {dsr.approvalNotes}
              </div>
            )}
          </div>
        </label>
      ))}
    </div>
  </div>
)}
```

**Task 6.2: Backend validation for DSR requirement (45 min)**
- File: `backend/services/ConsentHistoryService.js`

```javascript
async updateConsent(consentId, updateData, userId) {
  // Validate DSR requirement
  const { dsr_request_id, consent_given, reason } = updateData;

  if (!dsr_request_id) {
    throw new Error('DSR request is required for consent modifications (PDPA Section 19)');
  }

  // Verify DSR is approved
  const dsrRequest = await DSRRequest.findByPk(dsr_request_id);
  if (!dsrRequest) {
    throw new Error('DSR request not found');
  }

  if (dsrRequest.status !== 'approved') {
    throw new Error('Only approved DSR requests can be used for consent modifications');
  }

  // Verify DSR is for the correct profile
  const consent = await UserConsent.findByPk(consentId);
  // ... verify profile matching logic

  // Proceed with consent update
  // ...
}
```

**Task 6.3: Update consent_history to include DSR reference (30 min)**
- Already done in Sprint 3 migration
- Update ConsentHistoryService to save dsr_request_id
- Update ConsentHistoryTab to display DSR reference

**Task 6.4: Add API endpoint to get approved DSRs for profile (30 min)**
- File: `backend/api/routes/dsr.routes.js`

```javascript
/**
 * GET /api/v1/dsr/profile/:profileId/approved
 * Get all approved DSR requests for a profile
 */
router.get('/profile/:profileId/approved',
  authenticate,
  async (req, res) => {
    try {
      const { profileId } = req.params;

      // Get profile identifiers
      const profile = await UnifiedUserProfile.findByPk(profileId);
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      // Get approved DSRs matching profile identifiers
      const approvedDSRs = await DSRRequest.findAll({
        where: {
          user_identifier: {
            [Op.in]: [...profile.linked_emails, ...profile.linked_phones]
          },
          status: 'approved'
        },
        order: [['approved_at', 'DESC']],
        attributes: [
          'id',
          'dsr_number',
          'request_type',
          'approved_at',
          'approval_notes',
          'approved_by'
        ]
      });

      res.json(approvedDSRs);

    } catch (error) {
      logger.error('Error getting approved DSRs:', error);
      res.status(500).json({ error: error.message });
    }
  }
);
```

**Task 6.5: Add PersonalDataService.getApprovedDSRs() (15 min)**
- File: `src/services/PersonalDataService.js`

```javascript
/**
 * Get approved DSR requests for a profile
 * @param {string} profileId - Profile UUID
 * @returns {Promise<Array>} Approved DSRs
 */
async getApprovedDSRs(profileId) {
  try {
    const response = await apiClient.get(`/dsr/profile/${profileId}/approved`);
    return response.data;
  } catch (error) {
    logger.error('Error getting approved DSRs:', error);
    throw error;
  }
}
```

**Task 6.6: Test DSR-consent linkage (1 hour)**
- Test editing consent without approved DSR - should show warning
- Test creating DSR from consent edit modal
- Test editing consent with approved DSR - should work
- Test DSR reference displayed in consent history
- Test backend validation rejecting edits without DSR
- Verify audit logs include DSR reference

**Acceptance Criteria**:
- ✅ Cannot edit consent without approved DSR
- ✅ Warning modal displays correctly
- ✅ Can create DSR directly from consent edit
- ✅ DSR dropdown shows only approved DSRs
- ✅ DSR reference saved in consent_history
- ✅ DSR reference displayed in history timeline
- ✅ Backend validation working
- ✅ Audit logs complete with DSR references
- ✅ Mobile responsive

---

### Sprint 7: Complete Audit Trail & Testing
**Duration**: 6-8 hours
**Priority**: 🔥🔥🔥 CRITICAL (Compliance requirement)

#### Tasks

**Task 7.1: Create PDPAAuditService (2 hours)**
- File: `backend/services/PDPAAuditService.js` (NEW - 400+ lines)

```javascript
class PDPAAuditService {
  /**
   * Log PDPA compliance event
   * @param {Object} eventData - Event data
   */
  async logEvent(eventData) {
    try {
      const {
        eventType,
        actorId,
        actorRole,
        targetId,
        targetType,
        action,
        changes,
        reason,
        legalBasis,
        dsrReference,
        ipAddress,
        userAgent,
        metadata
      } = eventData;

      // Get actor name
      let actorName = 'System';
      if (actorId) {
        const actor = await User.findByPk(actorId, {
          attributes: ['username', 'email']
        });
        actorName = actor ? actor.username : 'Unknown User';
      }

      // Create audit log entry
      const auditLog = await PDPAAuditLog.create({
        event_type: eventType,
        actor_id: actorId,
        actor_role: actorRole || 'system',
        actor_name: actorName,
        target_id: targetId,
        target_type: targetType,
        action,
        changes,
        reason,
        legal_basis: legalBasis,
        dsr_reference: dsrReference,
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata
      });

      logger.audit(`[${eventType}] ${actorName} ${action} ${targetType} ${targetId}`, {
        dsrReference,
        legalBasis
      });

      return auditLog;

    } catch (error) {
      logger.error('Error logging PDPA audit event:', error);
      // Don't throw - we don't want audit logging to break main operations
      return null;
    }
  }

  /**
   * Log DSR event
   */
  async logDSREvent(dsrId, action, actorId, metadata = {}) {
    const dsr = await DSRRequest.findByPk(dsrId);
    if (!dsr) return null;

    return this.logEvent({
      eventType: `dsr_${action}`,
      actorId,
      targetId: dsrId,
      targetType: 'dsr_request',
      action,
      dsrReference: dsr.dsr_number,
      legalBasis: `PDPA Section ${this._getDSRLegalSection(dsr.request_type)}`,
      metadata: {
        requestType: dsr.request_type,
        status: dsr.status,
        ...metadata
      }
    });
  }

  /**
   * Log consent event
   */
  async logConsentEvent(consentId, action, actorId, changes = {}, dsrId = null) {
    const consent = await UserConsent.findByPk(consentId);
    if (!consent) return null;

    let dsrReference = null;
    if (dsrId) {
      const dsr = await DSRRequest.findByPk(dsrId);
      dsrReference = dsr?.dsr_number;
    }

    return this.logEvent({
      eventType: `consent_${action}`,
      actorId,
      targetId: consentId,
      targetType: 'consent',
      action,
      changes,
      dsrReference,
      legalBasis: 'PDPA Section 19 - Consent & Withdrawal',
      metadata: {
        consentGiven: consent.consent_given,
        consentItemId: consent.consent_item_id
      }
    });
  }

  /**
   * Log data access event
   */
  async logDataAccessEvent(actorId, accessType, targetId, targetType, metadata = {}) {
    return this.logEvent({
      eventType: 'data_accessed',
      actorId,
      targetId,
      targetType,
      action: accessType, // 'view', 'export', 'download'
      legalBasis: 'PDPA Section 30 - Right to Access',
      metadata
    });
  }

  /**
   * Log data modification event
   */
  async logDataModificationEvent(actorId, modificationType, targetId, targetType, changes, dsrId) {
    const dsr = await DSRRequest.findByPk(dsrId);

    return this.logEvent({
      eventType: 'data_modified',
      actorId,
      targetId,
      targetType,
      action: modificationType, // 'rectified', 'deleted', 'restricted'
      changes,
      dsrReference: dsr?.dsr_number,
      legalBasis: `PDPA Section ${this._getModificationLegalSection(modificationType)}`,
      metadata: {
        dsrRequestId: dsrId
      }
    });
  }

  /**
   * Get audit trail for a resource
   */
  async getAuditTrail(targetId, targetType, options = {}) {
    const { limit = 50, offset = 0, eventType = null } = options;

    const where = { target_id: targetId };
    if (targetType) where.target_type = targetType;
    if (eventType) where.event_type = eventType;

    const { count, rows } = await PDPAAuditLog.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    return {
      total: count,
      logs: rows.map(log => log.toJSON()),
      pagination: {
        limit,
        offset,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Get audit logs for DSR reference
   */
  async getAuditLogsByDSR(dsrReference) {
    const logs = await PDPAAuditLog.findAll({
      where: { dsr_reference: dsrReference },
      order: [['created_at', 'ASC']]
    });

    return logs.map(log => log.toJSON());
  }

  /**
   * Get compliance report (Article 39)
   */
  async getComplianceReport(startDate, endDate) {
    const logs = await PDPAAuditLog.findAll({
      where: {
        created_at: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        'event_type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['event_type'],
      raw: true
    });

    // Aggregate statistics
    const report = {
      reportPeriod: { startDate, endDate },
      totalEvents: logs.reduce((sum, log) => sum + parseInt(log.count), 0),
      eventsByType: {},
      complianceScore: 0 // Calculate based on response times, etc.
    };

    logs.forEach(log => {
      report.eventsByType[log.event_type] = parseInt(log.count);
    });

    return report;
  }

  // Private helper methods
  _getDSRLegalSection(requestType) {
    const sections = {
      'access': '30 - Right to Access',
      'rectification': '35 - Right to Rectification',
      'erasure': '33 - Right to Erasure',
      'portability': '31 - Right to Data Portability',
      'restriction': '34 - Right to Restriction',
      'objection': '32 - Right to Object'
    };
    return sections[requestType] || '28 - Data Subject Rights';
  }

  _getModificationLegalSection(modificationType) {
    const sections = {
      'rectified': '35 - Right to Rectification',
      'deleted': '33 - Right to Erasure',
      'restricted': '34 - Right to Restriction',
      'transferred': '31 - Right to Data Portability'
    };
    return sections[modificationType] || '35';
  }
}

module.exports = new PDPAAuditService();
```

**Task 7.2: Integrate PDPAAuditService into all workflows (1.5 hours)**

**Files to update**:
1. `DSRActionService.js` - Log all DSR workflow actions
2. `ConsentHistoryService.js` - Log consent changes
3. `UnifiedUserProfileService.js` - Log data access/export
4. `SubmissionService.js` - Log data modifications

**Example integration** (DSRActionService):
```javascript
const PDPAAuditService = require('./PDPAAuditService');

async reviewDSRRequest(dsrRequestId, reviewerId, reviewData) {
  // ... existing code

  // Add audit logging
  await PDPAAuditService.logDSREvent(
    dsrRequestId,
    'reviewed',
    reviewerId,
    {
      reviewNotes: reviewData.reviewNotes,
      legalBasisAssessment: reviewData.legalBasisAssessment
    }
  );

  return dsrRequest;
}
```

**Task 7.3: Create API endpoint for audit trail viewing (30 min)**
- File: `backend/api/routes/audit.routes.js` (NEW)

```javascript
const router = require('express').Router();
const PDPAAuditService = require('../../services/PDPAAuditService');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

/**
 * GET /api/v1/audit/resource/:targetId
 * Get audit trail for a specific resource
 * Roles: data_controller, admin, auditor
 */
router.get('/resource/:targetId',
  authenticate,
  authorize(['data_controller', 'admin', 'auditor']),
  async (req, res) => {
    try {
      const { targetId } = req.params;
      const { targetType, eventType, limit, offset } = req.query;

      const auditTrail = await PDPAAuditService.getAuditTrail(targetId, targetType, {
        eventType,
        limit: parseInt(limit, 10) || 50,
        offset: parseInt(offset, 10) || 0
      });

      res.json(auditTrail);

    } catch (error) {
      logger.error('Error fetching audit trail:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/v1/audit/dsr/:dsrNumber
 * Get all audit logs for a DSR
 */
router.get('/dsr/:dsrNumber',
  authenticate,
  authorize(['data_controller', 'admin', 'auditor']),
  async (req, res) => {
    try {
      const { dsrNumber } = req.params;
      const logs = await PDPAAuditService.getAuditLogsByDSR(dsrNumber);
      res.json(logs);
    } catch (error) {
      logger.error('Error fetching DSR audit logs:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/v1/audit/compliance-report
 * Get PDPA compliance report (Article 39)
 */
router.get('/compliance-report',
  authenticate,
  authorize(['data_controller', 'admin', 'auditor']),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const report = await PDPAAuditService.getComplianceReport(
        new Date(startDate),
        new Date(endDate)
      );

      res.json(report);

    } catch (error) {
      logger.error('Error generating compliance report:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
```

**Task 7.4: Create Audit Trail UI component (1.5 hours)**
- File: `src/components/pdpa/AuditTrailViewer.jsx` (NEW)

**Features**:
1. Timeline view of all events
2. Filter by event type
3. Filter by actor
4. Search by DSR number
5. Export audit logs (CSV/JSON)
6. Pagination

**Task 7.5: E2E Testing (2 hours)**

**Test Scenarios**:
1. **Complete DSR Workflow**:
   - Create DSR request → Review → Approve → Execute → Complete
   - Verify all audit logs created
   - Check DSR number generation
   - Verify form auto-population

2. **Consent Edit with DSR**:
   - Try edit without DSR (should fail)
   - Create DSR for rectification
   - Approve DSR
   - Edit consent with DSR reference
   - Verify consent history shows DSR

3. **Audit Trail Verification**:
   - View audit trail for consent
   - View audit trail for DSR
   - Export audit logs
   - Verify all required fields populated

4. **Role-Based Access**:
   - Test as data_controller (full access)
   - Test as admin (full access)
   - Test as auditor (read-only)
   - Test as regular user (no access)

5. **Edge Cases**:
   - DSR with no forms selected
   - DSR for non-existent profile
   - Consent edit for expired DSR
   - Multiple concurrent DSR approvals

**Task 7.6: Documentation (1 hour)**

**Create/Update**:
1. **PDPA-DSR-WORKFLOW.md** - Complete workflow guide
2. **PDPA-AUDIT-TRAIL.md** - Audit logging specification
3. **CLAUDE.md** - Update with v0.8.7-dev changes
4. **API-PDPA.md** - API endpoint documentation

**Acceptance Criteria**:
- ✅ All events logged correctly
- ✅ Audit trail complete and accurate
- ✅ PDPA Article 39 compliance achieved
- ✅ Export functionality working
- ✅ Role-based access enforced
- ✅ 90%+ test coverage
- ✅ Documentation complete
- ✅ No performance issues
- ✅ Zero data integrity bugs

---

## 📊 Database Schema Changes Summary

### New Columns (dsr_requests)
```sql
dsr_number VARCHAR(50) UNIQUE
reviewed_by UUID
reviewed_at TIMESTAMP
review_notes TEXT
approved_by UUID
approved_at TIMESTAMP
approval_notes TEXT
rejected_by UUID
rejected_at TIMESTAMP
rejection_reason TEXT
notification_sent_at TIMESTAMP
executed_by UUID
executed_at TIMESTAMP
execution_details JSONB
specific_forms JSONB
affected_forms TEXT[]
legal_basis_assessment TEXT
```

### New Columns (dsr_actions)
```sql
dsr_number VARCHAR(50)
legal_basis TEXT
right_type_details JSONB
```

### New Columns (consent_history)
```sql
dsr_request_id UUID REFERENCES dsr_requests(id)
requires_dsr BOOLEAN DEFAULT false
dsr_validation_status VARCHAR(50)
```

### New Table (pdpa_audit_log)
```sql
id UUID PRIMARY KEY
event_type VARCHAR(100)
actor_id UUID
actor_role VARCHAR(50)
actor_name VARCHAR(255)
target_id UUID
target_type VARCHAR(50)
action VARCHAR(50)
changes JSONB
reason TEXT
legal_basis TEXT
dsr_reference VARCHAR(50)
ip_address INET
user_agent TEXT
metadata JSONB
created_at TIMESTAMP
```

**Total New Indexes**: 12
**Total New Migrations**: 4
**Database Impact**: Medium (new columns, 1 new table)

---

## 🎯 Success Metrics

### Functional Requirements
- ✅ All 5 parts implemented
- ✅ UI simplified (removed tab, simplified tables)
- ✅ Consent history working without errors
- ✅ Complete 8-step DSR workflow
- ✅ DSR-consent linkage enforced
- ✅ Complete audit trail (Article 39)

### Technical Requirements
- ✅ 90%+ test coverage (E2E + unit)
- ✅ Zero data integrity issues
- ✅ API response times < 500ms
- ✅ Mobile responsive (all breakpoints)
- ✅ No console errors
- ✅ WCAG AA accessibility compliance

### Compliance Requirements
- ✅ PDPA Thailand Section 19 (Consent withdrawal)
- ✅ PDPA Thailand Section 28-35 (Data subject rights)
- ✅ PDPA Thailand Section 39 (Record keeping)
- ✅ 30-day DSR response tracking
- ✅ Legal basis documentation
- ✅ Complete audit trail for 6 years

### User Satisfaction
- ✅ CTO approval on UI improvements
- ✅ Data controller workflow validated
- ✅ Zero critical bugs after 1 week production
- ✅ User training completed
- ✅ Documentation approved

---

## 📅 Timeline Summary

| Sprint | Duration | Priority | Tasks | Status |
|--------|----------|----------|-------|--------|
| Sprint 1 | 1-2h | 🔥 HIGH | UI Improvements | NOT STARTED |
| Sprint 2 | 2-3h | 🔥🔥 CRITICAL | Fix Consent History | NOT STARTED |
| Sprint 3 | 4-5h | 🔥🔥🔥 CRITICAL | Database Schema | NOT STARTED |
| Sprint 4 | 5-6h | 🔥🔥🔥 CRITICAL | DSR Submission | NOT STARTED |
| Sprint 5 | 6-8h | 🔥🔥🔥 CRITICAL | DSR Workflow | NOT STARTED |
| Sprint 6 | 4-5h | 🔥🔥 HIGH | DSR-Consent Link | NOT STARTED |
| Sprint 7 | 6-8h | 🔥🔥🔥 CRITICAL | Audit Trail | NOT STARTED |
| **TOTAL** | **30-40h** | | **50+ tasks** | **0% Complete** |

**Estimated Start**: TBD (After current sprint completes)
**Estimated Completion**: 5-7 business days
**Target Version**: v0.8.7-dev

---

## 🚀 Next Steps

### Immediate Actions (Before Sprint 1)
1. ✅ Present this plan to CTO for approval
2. ✅ Schedule sprint kickoff meeting
3. ✅ Create git feature branch: `feature/pdpa-dsr-system-overhaul`
4. ✅ Setup testing environment
5. ✅ Backup production database

### Sprint 1 Preparation
1. Read ProfileDetailModal.jsx completely
2. Understand tab structure and state management
3. Test current UI behavior
4. Create Sprint 1 checklist
5. Set up screen recording for testing

### Communication Plan
- Daily standup: 9:00 AM (15 minutes)
- Sprint review: End of each sprint
- CTO demo: After Sprint 2, 5, 7
- Documentation updates: Real-time in CLAUDE.md

---

## 📝 Notes & Considerations

### Technical Debt
- Existing consent history API may need refactoring
- DSRRequest model has many fields - consider breaking into related tables
- Audit log table will grow large - implement partitioning strategy
- Consider caching approved DSRs for performance

### Security Considerations
- Audit logs are immutable (no UPDATE or DELETE allowed)
- DSR approval requires 2FA verification
- Sensitive data in audit logs should be masked
- Role-based access strictly enforced

### Performance Optimization
- Index all foreign keys
- Paginate audit trail queries
- Cache DSR workflow states
- Use database transactions for consistency

### Future Enhancements (v0.9.0+)
- Email notifications for DSR workflow
- Automated DSR execution for simple requests
- Dashboard for DSR analytics
- Integration with external DPO systems
- Multi-language support for audit reports

---

## ✅ Acceptance Criteria (Overall)

### UI/UX
- [x] Plan created and documented
- [ ] "ภาพรวม" tab removed
- [ ] PII table shows 2 columns only
- [ ] Consent display simplified
- [ ] "View History" button working
- [ ] DSR form auto-populates forms
- [ ] DSR review modal functional
- [ ] Mobile responsive (all screens)

### Backend/API
- [ ] All migrations run successfully
- [ ] DSR number generator working
- [ ] All API endpoints implemented
- [ ] PDPAAuditService logging all events
- [ ] Role-based access enforced
- [ ] 90%+ test coverage

### Compliance
- [ ] PDPA Article 39 compliant
- [ ] All 8 data subject rights supported
- [ ] Complete audit trail
- [ ] Legal basis documented
- [ ] 30-day deadline tracking
- [ ] DSR-consent linkage enforced

### Documentation
- [ ] CLAUDE.md updated
- [ ] API documentation complete
- [ ] User guide created
- [ ] Developer guide updated
- [ ] Database schema documented

---

**Plan Version**: 1.0
**Plan Status**: ✅ COMPLETE AND READY FOR IMPLEMENTATION
**Last Updated**: 2025-10-25 18:00:00 UTC+7
**Author**: Technical Documentation Writer for Q-Collector PDPA System

---

## 🔗 Related Documents

- **Current Implementation**: `qtodo.md`
- **System Overview**: `CLAUDE.md`
- **Security Assessment**: `SECURITY.md`
- **PDPA Requirements**: `PDPA-COMPLIANCE-PLAN.md`
- **Database Schema**: `backend/migrations/` directory
- **API Specs**: `backend/api/docs/`

---

**END OF IMPLEMENTATION PLAN**
