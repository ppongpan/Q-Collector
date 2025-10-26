# PDPA DSR System - Quick Reference Guide

**Version**: v0.8.7-dev
**For**: Developers implementing the PDPA DSR system
**Last Updated**: 2025-10-25

---

## 📚 Document Structure

This quick reference helps you navigate the comprehensive implementation plan.

### Main Documents (Read in Order)

1. **PDPA-DSR-EXECUTIVE-SUMMARY.md** (15 min read)
   - High-level overview
   - 5 major requirements
   - Sprint breakdown
   - Success metrics

2. **PDPA-DSR-SYSTEM-OVERHAUL-PLAN.md** (60-90 min read)
   - Complete implementation details
   - All code examples
   - Database schema designs
   - API specifications
   - Testing strategies

3. **qtodo.md** (Current tasks)
   - Integration with existing work
   - Sprint status tracking

---

## 🎯 5 Requirements at a Glance

### 1. UI Improvements (1-2h)
```
Remove: "ภาพรวม" tab
Simplify: PII table (2 columns)
Simplify: Consent display (no stats)
```

### 2. Fix Consent History (2-3h)
```
Fix: "View History" button error
Display: Initial consent + DSR references
```

### 3. DSR Workflow (16-20h)
```
Generate: DSR-YYYYMMDD-XXXX
Auto-populate: All forms with data
Workflow: Submit → Review → Approve → Execute → Close
```

### 4. DSR-Consent Link (4-5h)
```
Require: Approved DSR for consent edits
Validate: Backend + Frontend
Record: DSR reference in history
```

### 5. Audit Trail (6-8h)
```
Log: All actions (who, when, what, why)
Store: pdpa_audit_log table
Export: CSV/JSON reports
```

---

## 🗂️ File Organization

### Backend Files to Create (5)
```
backend/utils/dsr-number-generator.js          (~50 lines)
backend/services/DSRActionService.js           (~300 lines)
backend/services/PDPAAuditService.js           (~400 lines)
backend/api/routes/dsr.routes.js               (~200 lines)
backend/api/routes/audit.routes.js             (~150 lines)
```

### Frontend Files to Create (2)
```
src/components/pdpa/DSRReviewModal.jsx         (~400 lines)
src/components/pdpa/AuditTrailViewer.jsx       (~300 lines)
```

### Database Migrations (4)
```
20251025000002-enhance-dsr-requests-workflow.js
20251025000003-enhance-dsr-actions.js
20251025000004-add-dsr-to-consent-history.js
20251025000005-create-pdpa-audit-log.js
```

### Backend Files to Modify (6)
```
backend/models/DSRRequest.js                   (+100 lines)
backend/models/DSRAction.js                    (+50 lines)
backend/models/ConsentHistory.js               (+30 lines)
backend/api/routes/personalData.routes.js      (+150 lines)
backend/services/ConsentHistoryService.js      (+100 lines)
backend/services/UnifiedUserProfileService.js  (+50 lines)
```

### Frontend Files to Modify (5)
```
src/components/pdpa/ProfileDetailModal.jsx     (-100 +50 lines)
src/components/pdpa/ConsentEditModal.jsx       (+150 lines)
src/components/pdpa/ConsentHistoryTab.jsx      (+50 lines)
src/components/pdpa/DSRRequestForm.jsx         (+200 lines)
src/services/PersonalDataService.js            (+100 lines)
```

---

## 📊 Database Schema Quick Reference

### New Columns (dsr_requests)
```sql
-- Workflow tracking
dsr_number VARCHAR(50) UNIQUE
reviewed_by UUID, reviewed_at TIMESTAMP, review_notes TEXT
approved_by UUID, approved_at TIMESTAMP, approval_notes TEXT
rejected_by UUID, rejected_at TIMESTAMP, rejection_reason TEXT
executed_by UUID, executed_at TIMESTAMP, execution_details JSONB
notification_sent_at TIMESTAMP

-- Form tracking
specific_forms JSONB
affected_forms TEXT[]
legal_basis_assessment TEXT
```

### New Table (pdpa_audit_log)
```sql
id UUID PRIMARY KEY
event_type VARCHAR(100)          -- dsr_created, consent_edited, etc.
actor_id UUID, actor_role VARCHAR(50), actor_name VARCHAR(255)
target_id UUID, target_type VARCHAR(50)
action VARCHAR(50)               -- create, update, delete, approve, etc.
changes JSONB                    -- { before: {}, after: {} }
reason TEXT
legal_basis TEXT                 -- PDPA Section reference
dsr_reference VARCHAR(50)        -- DSR-YYYYMMDD-XXXX
ip_address INET, user_agent TEXT
metadata JSONB
created_at TIMESTAMP
```

---

## 🔌 API Endpoints Quick Reference

### DSR Workflow
```javascript
POST   /api/v1/personal-data/dsr-requests           // Create DSR
GET    /api/v1/dsr/:id/detail                       // Get full details
PUT    /api/v1/dsr/:id/review                       // Review DSR
PUT    /api/v1/dsr/:id/approve                      // Approve DSR
PUT    /api/v1/dsr/:id/reject                       // Reject DSR
PUT    /api/v1/dsr/:id/execute                      // Execute DSR
GET    /api/v1/dsr/profile/:profileId/approved     // Get approved DSRs
```

### Form Auto-Population
```javascript
GET    /api/v1/personal-data/profiles/:profileId/forms  // Get all forms
```

### Audit Trail
```javascript
GET    /api/v1/audit/resource/:targetId            // Get audit trail
GET    /api/v1/audit/dsr/:dsrNumber                // Get DSR audit logs
GET    /api/v1/audit/compliance-report             // Compliance report
```

### Consent Management (Enhanced)
```javascript
PUT    /api/v1/consents/:id                        // Update consent (requires DSR)
GET    /api/v1/personal-data/consent-history/:id  // Get history
```

---

## 🧩 Key Code Patterns

### DSR Number Generation
```javascript
// Format: DSR-YYYYMMDD-XXXX
// Example: DSR-20251025-0001

const { generateDSRNumber } = require('../utils/dsr-number-generator');

const dsrNumber = await generateDSRNumber();
// Returns: "DSR-20251025-0001"
```

### Audit Logging Pattern
```javascript
const PDPAAuditService = require('./PDPAAuditService');

await PDPAAuditService.logEvent({
  eventType: 'dsr_approved',
  actorId: userId,
  targetId: dsrId,
  targetType: 'dsr_request',
  action: 'approve',
  reason: 'Legal basis assessment completed',
  legalBasis: 'PDPA Section 30 - Right to Access',
  dsrReference: 'DSR-20251025-0001',
  ipAddress: req.ip,
  userAgent: req.get('user-agent')
});
```

### Form Auto-Population Pattern
```javascript
// Fetch forms for profile
const response = await PersonalDataService.getProfileForms(profileId);

// Display as multi-select checkboxes
response.forms.map(form => ({
  id: form.id,
  title: form.title,
  submissionCount: form.submissionCount,
  piiFieldCount: form.piiFieldCount
}))

// Auto-select all by default
setSelectedForms(response.forms.map(f => f.id));
```

### DSR Validation Pattern
```javascript
// Check for approved DSR before consent edit
const approvedDSRs = await PersonalDataService.getApprovedDSRs(profileId);

if (approvedDSRs.length === 0) {
  // Show warning modal
  return (
    <WarningModal
      message="ต้องมีคำขอใช้สิทธิ์ที่ได้รับอนุมัติก่อน"
      onCreateDSR={handleCreateDSRForConsent}
    />
  );
}

// Allow selection from approved DSRs
<DSRDropdown options={approvedDSRs} />
```

---

## 🧪 Testing Quick Reference

### Unit Tests (30 tests)
```javascript
// DSR Number Generator (5 tests)
describe('DSR Number Generator', () => {
  it('should generate DSR number in correct format')
  it('should increment sequence number correctly')
  it('should reset sequence on new day')
  it('should handle concurrent requests')
  it('should pad sequence with leading zeros')
})

// DSRActionService (10 tests)
describe('DSRActionService', () => {
  it('should review DSR request')
  it('should approve DSR request')
  it('should reject DSR request')
  it('should execute DSR request')
  // ... 6 more
})

// PDPAAuditService (10 tests)
describe('PDPAAuditService', () => {
  it('should log DSR event')
  it('should log consent event')
  it('should get audit trail')
  it('should generate compliance report')
  // ... 6 more
})
```

### Integration Tests (20 tests)
```javascript
// API Endpoints (11 tests)
describe('DSR Workflow API', () => {
  it('POST /dsr/:id/review - should review DSR')
  it('PUT /dsr/:id/approve - should approve DSR')
  // ... 9 more
})

// Database Migrations (4 tests)
describe('Database Migrations', () => {
  it('should add columns to dsr_requests')
  it('should create pdpa_audit_log table')
  // ... 2 more
})
```

### E2E Tests (10 scenarios)
```javascript
describe('PDPA DSR System E2E', () => {
  it('should complete full DSR workflow')
  it('should edit consent with DSR')
  it('should log audit trail correctly')
  it('should enforce role-based access')
  // ... 6 more
})
```

---

## 📋 Sprint Checklist

### Sprint 1: UI Improvements ✅
- [ ] Remove "ภาพรวม" tab
- [ ] Simplify PII table (2 columns)
- [ ] Simplify consent display
- [ ] Test on mobile and desktop
- [ ] No console errors

### Sprint 2: Fix Consent History ✅
- [ ] Diagnose error
- [ ] Fix prop mismatch
- [ ] Verify API response
- [ ] Enhance display with DSR refs
- [ ] Test all scenarios

### Sprint 3: Database Schema ✅
- [ ] Backup database
- [ ] Run migrations
- [ ] Update models
- [ ] Test rollback
- [ ] Verify indexes

### Sprint 4: DSR Submission ✅
- [ ] DSR number generator
- [ ] Form auto-populate API
- [ ] Update DSRRequestForm UI
- [ ] Test multi-select
- [ ] Mobile responsive

### Sprint 5: DSR Workflow ✅
- [ ] DSRReviewModal UI
- [ ] DSRActionService
- [ ] API routes
- [ ] ProfileDetailModal integration
- [ ] Test all 6 right types

### Sprint 6: DSR-Consent Link ✅
- [ ] ConsentEditModal validation
- [ ] Backend validation
- [ ] Approved DSRs API
- [ ] Test linkage
- [ ] Audit logs correct

### Sprint 7: Audit Trail & Testing ✅
- [ ] PDPAAuditService
- [ ] Integrate all workflows
- [ ] AuditTrailViewer UI
- [ ] 60 tests passing
- [ ] Documentation complete

---

## 🚨 Common Pitfalls & Solutions

### Pitfall 1: Field Name Mismatch
**Problem**: camelCase vs snake_case in API
**Solution**: Always use toJSON() method for model responses
```javascript
// ❌ Wrong
dsrRequest.profile_id

// ✅ Correct
dsrRequest.toJSON().profileId
```

### Pitfall 2: Missing DSR Validation
**Problem**: Consent edited without approved DSR
**Solution**: Add backend validation in ConsentHistoryService
```javascript
if (!dsr_request_id) {
  throw new Error('DSR request required for consent modifications');
}
```

### Pitfall 3: Audit Log Performance
**Problem**: Slow queries on large audit tables
**Solution**: Add indexes + pagination
```sql
CREATE INDEX idx_audit_created_at ON pdpa_audit_log(created_at);
CREATE INDEX idx_audit_dsr_ref ON pdpa_audit_log(dsr_reference);
```

### Pitfall 4: Transaction Rollback Issues
**Problem**: Audit log created but main transaction fails
**Solution**: Use same transaction for all operations
```javascript
const transaction = await sequelize.transaction();
try {
  await dsrRequest.save({ transaction });
  await PDPAAuditService.logEvent({ ... }, transaction);
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  throw error;
}
```

---

## 🔧 Debugging Tips

### Enable Debug Logging
```javascript
// Add to backend/.env
LOG_LEVEL=debug
DEBUG=pdpa:*

// In code
const logger = require('./utils/logger.util');
logger.debug('DSR workflow state:', { dsrId, status });
```

### Inspect Database State
```sql
-- Check DSR workflow state
SELECT dsr_number, status, reviewed_at, approved_at
FROM dsr_requests
WHERE id = 'uuid';

-- Check audit log
SELECT event_type, actor_name, action, created_at
FROM pdpa_audit_log
WHERE dsr_reference = 'DSR-20251025-0001'
ORDER BY created_at DESC;

-- Check consent history with DSR
SELECT uc.*, ch.dsr_request_id, dr.dsr_number
FROM user_consents uc
LEFT JOIN consent_history ch ON ch.consent_id = uc.id
LEFT JOIN dsr_requests dr ON dr.id = ch.dsr_request_id
WHERE uc.id = 'uuid';
```

### Frontend Debugging
```javascript
// Add breakpoints in Chrome DevTools
debugger;

// Log component state
console.log('[DSRRequestForm] State:', {
  selectedForms,
  availableForms,
  formData
});

// Check API responses
console.log('[PersonalDataService] Response:', response);
```

---

## 📞 Need Help?

### Documentation References
- Full Plan: `PDPA-DSR-SYSTEM-OVERHAUL-PLAN.md` (lines 1-4200)
- Executive Summary: `PDPA-DSR-EXECUTIVE-SUMMARY.md`
- Current Tasks: `qtodo.md`
- System Overview: `CLAUDE.md`

### Code Examples Location
- DSR Number Generator: Full Plan lines 450-500
- Form Auto-Population: Full Plan lines 650-850
- Audit Logging: Full Plan lines 2100-2500
- DSR Workflow: Full Plan lines 1200-1600

### Testing Examples
- Unit Tests: Full Plan lines 3800-3900
- E2E Tests: Full Plan lines 3900-4000

---

**Quick Reference Version**: 1.0
**Status**: ✅ COMPLETE
**Last Updated**: 2025-10-25 18:30:00 UTC+7
