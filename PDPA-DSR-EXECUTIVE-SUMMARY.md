# PDPA DSR System Overhaul - Executive Summary

**Version**: v0.8.7-dev
**Date**: 2025-10-25
**Priority**: 🔥🔥🔥🔥🔥 CTO MANDATED - PRODUCTION CRITICAL
**Estimated Duration**: 30-40 hours (5-7 business days)

---

## Quick Overview

This plan implements a complete PDPA-compliant DSR (Data Subject Rights) system with full workflow automation, consent management integration, and comprehensive audit trails.

---

## 5 Major Requirements

### 1. UI Improvements (1-2 hours)
- Remove "ภาพรวม" tab (keep only Consents + DSR Requests)
- Simplify PII table (2 columns: "ฟิลด์", "ค่า")
- Simplify consent display (remove statistics and dates)

### 2. Fix Consent History Error (2-3 hours)
- Fix "View History" button error
- Display initial consent date as first entry
- Show DSR references in history timeline

### 3. Complete DSR Workflow (16-20 hours)
- **Submit**: Auto-generate DSR number (DSR-YYYYMMDD-XXXX)
- **Auto-populate**: All forms containing data subject's data
- **Review**: Data controller assesses legal basis
- **Approve/Reject**: Full decision workflow with notifications
- **Record Details**: Capture specific changes by right type (6 types)
- **Execute & Close**: Complete actions with audit trail

### 4. DSR-Consent Linkage (4-5 hours)
- Require approved DSR before editing consent
- Auto-populate DSR dropdown
- Backend validation
- Record DSR number in consent_history

### 5. Complete Audit Trail (6-8 hours)
- Log ALL actions (PDPA Article 39)
- New table: pdpa_audit_log
- Track: who, when, what, why, legal basis, DSR reference
- Export audit reports (CSV/JSON)

---

## 7 Sprint Breakdown

| Sprint | Duration | Focus | Complexity |
|--------|----------|-------|------------|
| 1 | 1-2h | UI Improvements | LOW |
| 2 | 2-3h | Fix Consent History | MEDIUM |
| 3 | 4-5h | Database Schema | HIGH |
| 4 | 5-6h | DSR Submission | HIGH |
| 5 | 6-8h | DSR Workflow | VERY HIGH |
| 6 | 4-5h | DSR-Consent Link | MEDIUM |
| 7 | 6-8h | Audit Trail & Testing | HIGH |

**Total**: 30-40 hours

---

## Database Changes

### New Columns (17 total)
- `dsr_requests`: 14 new columns (DSR number, workflow tracking)
- `dsr_actions`: 3 new columns (legal basis, details)
- `consent_history`: 3 new columns (DSR reference)

### New Table
- `pdpa_audit_log`: Complete audit trail (12 columns + indexes)

### New Indexes
- 12 indexes for performance and compliance

---

## Key Features

### DSR Number Generator
```
Format: DSR-YYYYMMDD-XXXX
Example: DSR-20251025-0001
```

### Form Auto-Population
```jsx
Multi-select checkbox list showing:
- Form title
- Submission count
- PII fields count
All forms auto-selected by default
```

### Right Type Details (6 Types)

**1. Rectification**:
```json
{ "changes": [{ "field": "email", "oldValue": "...", "newValue": "..." }] }
```

**2. Access**:
```json
{ "requestedData": { "view": true, "copy": true, "format": "JSON" } }
```

**3. Erasure**:
```json
{ "dataToDelete": { "forms": [...], "fields": [...] } }
```

**4. Portability**:
```json
{ "transferDetails": { "format": "JSON", "destination": "..." } }
```

**5. Restriction**:
```json
{ "restrictions": { "processingType": [...], "duration": "6 months" } }
```

**6. Objection**:
```json
{ "objections": { "processingTypes": [...], "stopImmediately": true } }
```

### Audit Log Structure
```json
{
  "eventType": "dsr_approved",
  "actorId": "user-uuid",
  "actorRole": "data_controller",
  "targetId": "dsr-uuid",
  "action": "approve",
  "reason": "...",
  "legalBasis": "PDPA Section 30",
  "dsrReference": "DSR-20251025-0001",
  "timestamp": "2025-10-25T10:30:00Z"
}
```

---

## Technical Implementation

### New Services (3)
1. **DSRActionService** (~300 lines)
   - reviewDSRRequest()
   - approveDSRRequest()
   - rejectDSRRequest()
   - executeDSRRequest()

2. **PDPAAuditService** (~400 lines)
   - logEvent()
   - logDSREvent()
   - logConsentEvent()
   - getAuditTrail()
   - getComplianceReport()

3. **DSR Number Generator** (~50 lines)
   - generateDSRNumber()

### New UI Components (3)
1. **DSRReviewModal.jsx** (~400 lines)
   - Complete review interface
   - Legal basis assessment
   - Approve/reject workflow

2. **AuditTrailViewer.jsx** (~300 lines)
   - Timeline view
   - Filtering and search
   - Export functionality

3. **Enhanced DSRRequestForm.jsx** (+200 lines)
   - Form auto-population
   - Multi-select checkboxes
   - Validation

### New API Endpoints (11)
- `GET /api/v1/personal-data/profiles/:profileId/forms`
- `PUT /api/v1/dsr/:id/review`
- `PUT /api/v1/dsr/:id/approve`
- `PUT /api/v1/dsr/:id/reject`
- `PUT /api/v1/dsr/:id/execute`
- `GET /api/v1/dsr/:id/detail`
- `GET /api/v1/dsr/profile/:profileId/approved`
- `GET /api/v1/audit/resource/:targetId`
- `GET /api/v1/audit/dsr/:dsrNumber`
- `GET /api/v1/audit/compliance-report`
- `PUT /api/v1/consents/:id` (enhanced with DSR validation)

---

## Success Metrics

### Functional
- ✅ All 5 requirements implemented
- ✅ 8-step DSR workflow complete
- ✅ DSR-consent linkage enforced
- ✅ Complete audit trail

### Technical
- ✅ 90%+ test coverage
- ✅ Zero data integrity issues
- ✅ API response < 500ms
- ✅ Mobile responsive

### Compliance
- ✅ PDPA Section 19 (Consent)
- ✅ PDPA Section 28-35 (DSR)
- ✅ PDPA Section 39 (Audit)
- ✅ 30-day tracking
- ✅ 6-year retention

---

## Risk Assessment

### Low Risk
- UI improvements (Sprint 1)
- Form auto-population (Sprint 4)

### Medium Risk
- Consent history fix (Sprint 2)
- DSR-consent linkage (Sprint 6)

### High Risk
- Database migrations (Sprint 3) - requires backup
- DSR workflow (Sprint 5) - complex state machine
- Audit logging (Sprint 7) - performance impact

### Mitigation
- Full database backup before migrations
- Feature flags for gradual rollout
- Performance testing with 1000+ records
- Rollback plan for each sprint

---

## Files to Create (8)

### Backend
1. `backend/utils/dsr-number-generator.js` (~50 lines)
2. `backend/services/DSRActionService.js` (~300 lines)
3. `backend/services/PDPAAuditService.js` (~400 lines)
4. `backend/api/routes/dsr.routes.js` (~200 lines)
5. `backend/api/routes/audit.routes.js` (~150 lines)

### Frontend
6. `src/components/pdpa/DSRReviewModal.jsx` (~400 lines)
7. `src/components/pdpa/AuditTrailViewer.jsx` (~300 lines)

### Migrations
8. `backend/migrations/20251025000002-enhance-dsr-requests-workflow.js`
9. `backend/migrations/20251025000003-enhance-dsr-actions.js`
10. `backend/migrations/20251025000004-add-dsr-to-consent-history.js`
11. `backend/migrations/20251025000005-create-pdpa-audit-log.js`

**Total New Code**: ~2,500 lines

---

## Files to Modify (12)

### Backend
1. `backend/models/DSRRequest.js` (+100 lines)
2. `backend/models/DSRAction.js` (+50 lines)
3. `backend/models/ConsentHistory.js` (+30 lines)
4. `backend/models/PDPAAuditLog.js` (NEW - 150 lines)
5. `backend/api/routes/personalData.routes.js` (+150 lines)
6. `backend/services/ConsentHistoryService.js` (+100 lines)

### Frontend
7. `src/components/pdpa/ProfileDetailModal.jsx` (-100 lines UI, +50 lines DSR)
8. `src/components/pdpa/ConsentEditModal.jsx` (+150 lines DSR validation)
9. `src/components/pdpa/ConsentHistoryTab.jsx` (+50 lines DSR display)
10. `src/components/pdpa/DSRRequestForm.jsx` (+200 lines auto-populate)
11. `src/services/PersonalDataService.js` (+100 lines)

### Documentation
12. `CLAUDE.md` (update to v0.8.7-dev)

**Total Modified Code**: ~1,000 lines

---

## Testing Strategy

### Unit Tests (30 tests)
- DSR number generator (5 tests)
- DSRActionService methods (10 tests)
- PDPAAuditService methods (10 tests)
- Form auto-population (5 tests)

### Integration Tests (20 tests)
- API endpoints (11 tests)
- Database migrations (4 tests)
- Service interactions (5 tests)

### E2E Tests (10 scenarios)
- Complete DSR workflow (1 test)
- Consent edit with DSR (1 test)
- Audit trail verification (1 test)
- Role-based access (1 test)
- Edge cases (6 tests)

**Total Tests**: 60
**Target Coverage**: 90%+

---

## Deployment Checklist

### Pre-Deployment
- [ ] Full database backup
- [ ] Test migrations on staging
- [ ] Review all code changes
- [ ] Run full test suite
- [ ] Performance testing
- [ ] Security audit

### Deployment
- [ ] Create feature branch
- [ ] Run migrations
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Verify all endpoints
- [ ] Smoke tests

### Post-Deployment
- [ ] Monitor error logs
- [ ] Check audit log creation
- [ ] Verify DSR workflow
- [ ] User acceptance testing
- [ ] Update documentation
- [ ] CTO approval

---

## Resources Required

### Development Team
- 1 Backend Developer (20-25 hours)
- 1 Frontend Developer (15-20 hours)
- 1 QA Engineer (10 hours)
- 1 Technical Writer (5 hours)

### Infrastructure
- Staging environment (Docker + PostgreSQL)
- Testing database (separate from dev)
- Performance testing tools

### Documentation
- Complete implementation plan (PDPA-DSR-SYSTEM-OVERHAUL-PLAN.md)
- Executive summary (this document)
- API documentation
- User guide

---

## Timeline (Optimistic vs Realistic)

### Optimistic (30 hours)
- Sprint 1: 1 hour
- Sprint 2: 2 hours
- Sprint 3: 4 hours
- Sprint 4: 5 hours
- Sprint 5: 6 hours
- Sprint 6: 4 hours
- Sprint 7: 6 hours
- Testing: 2 hours

### Realistic (40 hours)
- Sprint 1: 2 hours
- Sprint 2: 3 hours
- Sprint 3: 5 hours
- Sprint 4: 6 hours
- Sprint 5: 8 hours
- Sprint 6: 5 hours
- Sprint 7: 8 hours
- Testing: 3 hours

**Recommended Buffer**: +20% (48 hours total)

---

## Next Steps

### Immediate Actions
1. Present plan to CTO for approval
2. Schedule sprint kickoff meeting
3. Create feature branch
4. Setup testing environment
5. Backup production database

### Sprint 1 Start
1. Read ProfileDetailModal.jsx
2. Test current UI behavior
3. Create Sprint 1 checklist
4. Begin UI improvements

---

## Document References

- **Full Plan**: `PDPA-DSR-SYSTEM-OVERHAUL-PLAN.md` (4,200+ lines)
- **Current Status**: `qtodo.md`
- **System Overview**: `CLAUDE.md`
- **Security**: `SECURITY.md`

---

**Document Status**: ✅ COMPLETE AND READY FOR PRESENTATION
**Last Updated**: 2025-10-25 18:15:00 UTC+7
**Author**: Technical Documentation Writer for Q-Collector
