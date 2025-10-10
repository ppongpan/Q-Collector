# Database Schema Migration System - Executive Summary

**Date:** 2025-10-07
**Status:** Design Complete - Ready for Implementation
**Priority:** High - Critical Gap in Current System

---

## Problem Statement

The Q-Collector dynamic table system has **critical gaps** when form fields are added, deleted, or modified:

❌ **Add Field** → Column NOT added to dynamic table → PowerBI cannot see new data
❌ **Delete Field** → Column remains in table → GDPR compliance issue
❌ **Rename Field** → Column name unchanged → PowerBI reports break
❌ **Change Type** → No validation → Data corruption risk

### Real-World Impact

**Example:** Government agency using Q-Collector for citizen feedback
- Week 1: 100 submissions with 3 fields
- Week 2: Added "Phone Number" field → PowerBI dashboard shows no phone numbers
- Week 3: Renamed "Comment" to "Feedback" → PowerBI reports broken
- Week 4: Deleted "Email" for privacy → Data still in database (GDPR violation)

---

## Proposed Solution

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│          FIELD MIGRATION SYSTEM ARCHITECTURE                 │
└─────────────────────────────────────────────────────────────┘

ADMIN MAKES CHANGE
       ↓
FIELD MIGRATION SERVICE
       ↓
┌─────────────┬─────────────┬─────────────┐
│  Validate   │   Backup    │   Execute   │
│   Change    │    Data     │ Schema DDL  │
└─────────────┴─────────────┴─────────────┘
       ↓
┌─────────────────────────────────────────┐
│  TRANSACTION (All or Nothing)           │
│  1. Update fields table                 │
│  2. ALTER dynamic table                 │
│  3. Log to field_migrations             │
│  4. Create backup (if destructive)      │
└─────────────────────────────────────────┘
       ↓
✅ SUCCESS → Audit log created
❌ FAILURE → Rollback all changes
```

### Key Features

✅ **5 Migration Types:** Add, Delete, Rename, Change Type, Reorder
✅ **Data Backup:** Auto-backup before destructive operations (90-day retention)
✅ **Rollback Support:** Undo migrations with one click
✅ **Type Validation:** Prevent incompatible type conversions
✅ **Audit Trail:** Complete history of all schema changes
✅ **Transaction Safety:** All-or-nothing atomicity

---

## Database Changes

### New Tables

**1. field_migrations** (Migration Audit Log)
- Tracks every schema change
- Stores old/new values for rollback
- Links to data backups
- Includes rollback instructions

**2. field_data_backups** (Data Backup Storage)
- Stores column data before deletion
- 90-day retention policy
- JSONB array of {id, value} pairs
- Enables data restoration

---

## API Endpoints

```
POST   /api/field-migrations/add-field           # Add new field
DELETE /api/field-migrations/delete-field/:id    # Delete field (with backup)
PUT    /api/field-migrations/rename-field/:id    # Rename field & column
PUT    /api/field-migrations/change-type/:id     # Change field type (validated)
PUT    /api/field-migrations/reorder-fields      # Reorder fields (no schema change)
POST   /api/field-migrations/rollback/:id        # Rollback migration
GET    /api/field-migrations/form/:formId        # Get migration history
POST   /api/field-migrations/restore-backup/:id  # Restore from backup
```

---

## Service Layer

### FieldMigrationService.js (New)

**Core Methods:**
- `addField(formId, fieldData, userId)` - Add field + column
- `deleteField(fieldId, userId, confirm)` - Backup + delete
- `renameField(fieldId, newTitle, userId)` - Rename column
- `changeFieldType(fieldId, newType, userId)` - Validate + convert
- `reorderFields(formId, fieldOrders, userId)` - Update order
- `rollbackMigration(migrationId, userId)` - Undo change

**Helper Methods:**
- `backupColumnData()` - Create data backup
- `validateTypeConversion()` - Check data compatibility
- `restoreColumnData()` - Restore from backup
- `getTableColumns()` - Inspect table structure

---

## Frontend Changes

### 1. FieldMigrationManager.jsx (New Component)
- Display migration history
- One-click rollback UI
- Restore backup UI
- Color-coded migration types

### 2. EnhancedFormBuilder.jsx (Enhanced)
- Warning dialogs for destructive operations
- Confirmation checkboxes
- Migration status indicators
- Inline field renaming

### Example User Experience:

```
[Admin clicks "Delete Field" button]

⚠️ WARNING: Deleting this field will:

1. Remove the field from all future submissions
2. Delete the column from the dynamic database table
3. Archive existing submission data (recoverable for 90 days)

Field: "User Email"
Type: email

This action can be rolled back within 90 days.

☑ I understand this will delete data
[ Confirm Delete ]  [ Cancel ]

[Admin confirms]

✅ Field deleted successfully
   - Backup ID: backup_abc123
   - Restore deadline: 2026-01-05
   - [Restore Data] button available for 90 days
```

---

## Migration Scripts

### 1. sync-existing-dynamic-tables.js
**Purpose:** Backfill missing columns for existing forms
**Usage:** `node backend/scripts/sync-existing-dynamic-tables.js`

Scans all forms → Compares fields vs columns → Adds missing columns

### 2. cleanup-orphaned-columns.js
**Purpose:** Remove columns from deleted fields
**Usage:**
- Dry-run: `node backend/scripts/cleanup-orphaned-columns.js`
- Execute: `node backend/scripts/cleanup-orphaned-columns.js --execute`

Finds orphaned columns → Backup data → Drop columns

---

## Implementation Roadmap

### 8-Week Plan

**Week 1:** Database migrations + models (field_migrations, field_data_backups)
**Week 2-3:** Service layer (FieldMigrationService.js, 80% test coverage)
**Week 4:** API endpoints + integration tests
**Week 5:** Frontend UI (manager + builder enhancements)
**Week 6:** Migration scripts + documentation
**Week 7:** Testing & QA (unit, integration, E2E)
**Week 8:** Deployment + training

---

## Testing Strategy

### Unit Tests (80% Coverage Target)
- FieldMigrationService methods
- Transaction rollback scenarios
- Type conversion validation
- Backup/restore logic

### Integration Tests
- Full API endpoint flows
- Permission checking
- Error handling
- Migration logging

### E2E Tests (Playwright)
- Add field workflow
- Delete field with confirmation
- Rename field inline editing
- View migration history
- Rollback migration UI

---

## Safety Mechanisms

### 1. Confirmation Requirements
- Field deletion requires explicit `confirmDataLoss=true`
- Type changes show data compatibility warning
- Rollbacks require admin confirmation

### 2. Data Backup
- Auto-backup before DELETE_FIELD
- Auto-backup before CHANGE_TYPE
- 90-day retention with expiration warnings

### 3. Transaction Safety
- All changes in single transaction
- Rollback on ANY failure
- No partial commits

### 4. Validation
- Field data validation before creation
- Type conversion compatibility check
- Column name conflict detection

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Data loss on field deletion | Automatic backup with 90-day retention |
| Type conversion fails | Dry-run validation before applying |
| Schema drift (fields vs columns) | Sync script detects and fixes mismatches |
| Accidental rollback | Admin-only permission, confirmation required |
| Backup storage overflow | Auto-cleanup of expired backups |

---

## Success Metrics

After implementation, we will measure:
- ✅ Zero schema drift incidents (fields match columns)
- ✅ 100% of field changes tracked in audit log
- ✅ < 1% migration failures (target: 99% success rate)
- ✅ Zero data loss incidents (backup system working)
- ✅ < 5 seconds average migration time

---

## Next Steps

1. **Review Specification** - Stakeholder review of full spec document
2. **Approve Implementation** - Get green light to proceed
3. **Sprint Planning** - Assign developers to 8-week roadmap
4. **Week 1 Kickoff** - Start with database migrations

---

## Documentation

📄 **Full Specification:** `docs/Database-Schema-Migration-Specification.md` (8000+ lines)

Includes:
- Detailed architecture diagrams
- Complete code samples
- Database schema definitions
- API endpoint specifications
- Frontend component code
- Testing strategy
- Implementation checklist

---

## Questions & Answers

**Q: Can we rollback any migration?**
A: DELETE_FIELD, RENAME_FIELD, and CHANGE_TYPE can be rolled back within 90 days. ADD_FIELD can be manually reversed. REORDER_FIELDS has no schema impact.

**Q: What happens to old submissions when a field is deleted?**
A: Data is backed up for 90 days in `field_data_backups` table. After 90 days, data is permanently deleted.

**Q: Can we change a text field to a number field?**
A: Yes, but ONLY if all existing data can be converted. The system validates all values first and rejects if any are incompatible.

**Q: Will this slow down form submissions?**
A: No. Migrations are admin operations, not user-facing. Submission flow is unchanged.

**Q: What if a migration fails halfway through?**
A: Impossible. All changes happen in a single PostgreSQL transaction. If ANY step fails, ALL changes are rolled back.

---

**Status:** 🟢 Ready for Implementation
**Estimated Effort:** 8 weeks (1 full-time developer)
**ROI:** Eliminates schema drift bugs, enables GDPR compliance, improves PowerBI data quality

---

**Contact:** Database Architecture Team
**Date:** 2025-10-07
