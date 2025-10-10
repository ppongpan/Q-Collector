# Database Schema Migration Specification
## Q-Collector Dynamic Table Evolution System

**Version:** 1.0.0
**Date:** 2025-10-07
**Author:** Database Architecture Team
**Status:** Design Specification - Ready for Implementation

---

## Executive Summary

This document specifies a comprehensive schema migration system for Q-Collector's dynamic table architecture. The system will handle field addition, deletion, renaming, type changes, and reordering while maintaining data integrity, backward compatibility, and audit trails.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Current System Analysis](#2-current-system-analysis)
3. [Proposed Solution Architecture](#3-proposed-solution-architecture)
4. [Database Schema Changes](#4-database-schema-changes)
5. [Service Layer Changes](#5-service-layer-changes)
6. [API Endpoint Changes](#6-api-endpoint-changes)
7. [Frontend Changes](#7-frontend-changes)
8. [Migration Scripts](#8-migration-scripts)
9. [Testing Strategy](#9-testing-strategy)
10. [Implementation Roadmap](#10-implementation-roadmap)

---

## 1. Problem Statement

### 1.1 Current Limitations

The Q-Collector dynamic table system currently has **critical gaps** in handling form schema changes:

#### 1.1.1 Field Addition
- **What happens:** New field is added to form → Stored in `fields` table
- **Gap:** Column is NOT automatically added to dynamic table
- **Impact:** New submissions store data in `submission_data` but dynamic table remains unchanged
- **Result:** PowerBI/direct SQL queries cannot access new field data

#### 1.1.2 Field Deletion
- **What happens:** Field is deleted from `fields` table (CASCADE deletes `submission_data`)
- **Gap:** Column remains in dynamic table as "orphaned column"
- **Impact:** Old data remains queryable but field definition is lost
- **Result:** Confusion about which columns are still "active"

#### 1.1.3 Field Renaming
- **What happens:** Field title changes in `fields` table
- **Gap:** Column name in dynamic table remains unchanged
- **Impact:** Mismatch between field label and column name
- **Result:** Developer confusion, broken PowerBI reports

#### 1.1.4 Field Type Change
- **What happens:** Field type changes (e.g., text → number)
- **Gap:** Column type in dynamic table remains unchanged
- **Impact:** Data validation inconsistency, potential data corruption
- **Result:** SQL queries may fail or return incorrect results

#### 1.1.5 Field Reordering
- **What happens:** Field order changes in `fields.order`
- **Gap:** No impact on dynamic table structure
- **Impact:** Minor - only affects frontend display order
- **Result:** No technical issue, but inconsistent UX

### 1.2 Real-World Scenario

**Example: A government agency using Q-Collector for citizen feedback**

1. **Week 1:** Form created with fields: Name, Email, Comment
   - Dynamic table: `citizen_feedback_123` with columns: `name`, `email`, `comment`
   - 100 submissions received

2. **Week 2:** Agency adds "Phone Number" field
   - Field added to `fields` table
   - **Problem:** Dynamic table still has only 3 columns
   - New submissions store phone in `submission_data` but NOT in dynamic table
   - PowerBI dashboard cannot display phone numbers

3. **Week 3:** Agency renames "Comment" to "Feedback Details"
   - Field title updated in `fields` table
   - **Problem:** Dynamic table column still named `comment`
   - PowerBI reports break because they reference "Feedback Details"

4. **Week 4:** Agency deletes "Email" field (privacy concerns)
   - Field deleted from `fields` table
   - **Problem:** `email` column remains in dynamic table with old data
   - GDPR compliance issue - data not actually deleted

### 1.3 Business Impact

- **Data Accessibility:** PowerBI users cannot access new fields
- **Compliance Risk:** Deleted fields remain in database
- **Maintenance Burden:** Manual SQL scripts needed for each change
- **User Confusion:** Field names don't match column names
- **Data Integrity:** Type mismatches cause validation failures

---

## 2. Current System Analysis

### 2.1 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Q-Collector Data Flow                     │
└─────────────────────────────────────────────────────────────┘

FORM CREATION:
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│   User   │────▶│   Form   │────▶│  Fields  │────▶│ Dynamic  │
│  Creates │     │   Table  │     │   Table  │     │  Table   │
│   Form   │     │          │     │          │     │ (CREATE) │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                           │
                                        Columns: name, email, comment

SUBMISSION:
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│   User   │────▶│  Submission  │────▶│ Dynamic Table│
│ Submits  │     │    + Data    │     │   (INSERT)   │
│   Data   │     │   (Dual Write)│    │              │
└──────────┘     └──────────────┘     └──────────────┘
                       │                      │
                       ▼                      ▼
              ┌────────────────┐    ┌────────────────┐
              │ submission_data│    │citizen_feedback│
              │   (JSONB blob) │    │   (Columns)    │
              └────────────────┘    └────────────────┘

FIELD CHANGE (CURRENT - BROKEN):
┌──────────┐     ┌──────────┐     ┌──────────┐
│   Admin  │────▶│  Update  │  ✗  │ Dynamic  │
│  Adds    │     │  Fields  │     │  Table   │
│  Field   │     │  Table   │     │(No Change)│
└──────────┘     └──────────┘     └──────────┘
                                          │
                               ❌ Column NOT added
```

### 2.2 Current Code Behavior

#### 2.2.1 DynamicTableService.js - Line 56-79

```javascript
if (existsResult.rows[0].exists) {
  console.log(`Table ${tableName} already exists. Updating columns...`);
  await this.updateFormTableColumns(form, tableName, client);
} else {
  // CREATE TABLE...
  await this.addFormFieldColumns(form.fields || [], tableName, client);
}
```

**Analysis:**
- ✅ **Good:** Calls `updateFormTableColumns()` if table exists
- ⚠️ **Problem:** `updateFormTableColumns()` only ADDS columns, never REMOVES or RENAMES
- ⚠️ **Problem:** Called only during form update, not field-specific changes

#### 2.2.2 DynamicTableService.js - Line 143-179

```javascript
async updateFormTableColumns(form, tableName, client) {
  // Get existing columns
  const existingColumns = await client.query(columnsQuery, [tableName]);
  const existingColumnNames = new Set(existingColumns.rows.map(r => r.column_name));

  // Add new columns for new fields
  const newFields = [];
  for (const field of mainFormFields) {
    const columnName = await generateColumnName(field.label || field.title, field.id);
    if (!existingColumnNames.has(columnName)) {
      newFields.push(field);
    }
  }

  if (newFields.length > 0) {
    await this.addFormFieldColumns(newFields, tableName, client);
  }

  // Note: We don't automatically drop columns for removed fields
  // This preserves historical data. Admin can manually drop if needed.
}
```

**Analysis:**
- ✅ **Good:** Adds new columns for new fields
- ❌ **Missing:** No handling for field deletion
- ❌ **Missing:** No handling for field renaming
- ❌ **Missing:** No handling for type changes
- ⚠️ **By Design:** Preserves historical data (good for audit, bad for GDPR)

#### 2.2.3 FormService.js - Line 239-300 (updateForm)

```javascript
static async updateForm(formId, userId, updates) {
  const transaction = await sequelize.transaction();

  // Update basic fields
  if (updates.title !== undefined) form.title = updates.title;
  if (updates.description !== undefined) form.description = updates.description;

  // ... (no dynamic table update logic)

  await form.save({ transaction });
}
```

**Analysis:**
- ❌ **Missing:** No dynamic table schema migration on field changes
- ❌ **Missing:** No field comparison (old vs new) to detect changes
- ❌ **Missing:** No transaction rollback if dynamic table update fails

### 2.3 Storage Dual-Write System

```
┌─────────────────────────────────────────────────────────────┐
│              DUAL-WRITE ARCHITECTURE (Current)               │
└─────────────────────────────────────────────────────────────┘

Submission Data Storage:

1. SEQUELIZE ORM STORAGE (Always)
   ┌─────────────────┐
   │  submissions    │  (Metadata)
   │  - id           │
   │  - form_id      │
   │  - submitted_by │
   │  - status       │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │ submission_data │  (Field Values)
   │  - id           │
   │  - submission_id│
   │  - field_id     │
   │  - value_text   │  ← Encrypted for sensitive fields
   │  - is_encrypted │
   └─────────────────┘

2. DYNAMIC TABLE STORAGE (Best Effort)
   ┌──────────────────────┐
   │ citizen_feedback_123 │  (PowerBI/Direct Query)
   │  - id                │
   │  - form_id           │
   │  - username          │
   │  - name              │  ← Column per field
   │  - email             │
   │  - comment           │
   │  - submitted_at      │
   └──────────────────────┘

REDUNDANCY BENEFITS:
✅ submission_data: Complete, encrypted, normalized
✅ dynamic_table: Fast, queryable, PowerBI-ready
✅ If dynamic table fails: submission_data still intact

REDUNDANCY PROBLEMS:
❌ Schema drift when fields change
❌ Duplicate data (storage overhead)
❌ Sync issues if one write fails
```

### 2.4 Critical Findings

#### Finding 1: No Atomic Schema Changes
- Field changes committed to `fields` table via transaction
- Dynamic table changes attempted AFTER transaction commit
- **Risk:** If dynamic table update fails, `fields` table is already changed
- **Result:** Permanent desynchronization

#### Finding 2: Silent Failures
- `SubmissionService.js:268` catches dynamic table errors but doesn't fail
- Logger warning: `Failed to insert into dynamic table`
- **Impact:** Users don't know data isn't reaching PowerBI

#### Finding 3: No Rollback Mechanism
- Once a field is deleted, no way to restore column
- No backup of data before column drop
- **Risk:** Accidental data loss

#### Finding 4: Column Name Translation Issues
- `tableNameHelper.js` uses MyMemory API (async, can fail)
- If translation fails, falls back to transliteration
- **Problem:** Same field title might generate different column names over time

---

## 3. Proposed Solution Architecture

### 3.1 System Overview

```
┌─────────────────────────────────────────────────────────────┐
│          FIELD MIGRATION SYSTEM ARCHITECTURE                 │
└─────────────────────────────────────────────────────────────┘

COMPONENTS:

1. FieldMigrationService (New)
   ├─ Orchestrates all schema changes
   ├─ Validates changes before execution
   ├─ Manages transactions across ORM and raw SQL
   └─ Creates audit trail in field_migrations table

2. Migration Types (Enum)
   ├─ ADD_FIELD      → ALTER TABLE ADD COLUMN
   ├─ DELETE_FIELD   → Backup + ALTER TABLE DROP COLUMN
   ├─ RENAME_FIELD   → ALTER TABLE RENAME COLUMN
   ├─ CHANGE_TYPE    → Validate + ALTER TABLE ALTER COLUMN
   └─ REORDER_FIELDS → Update fields.order (no schema change)

3. Safety Mechanisms
   ├─ Dry-Run Mode (preview changes without applying)
   ├─ Data Backup (before destructive operations)
   ├─ Rollback Support (transaction + backup restoration)
   └─ Validation (check data compatibility before type change)

4. Audit Trail
   └─ field_migrations table (who, when, what, why)
```

### 3.2 Migration Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                   FIELD CHANGE WORKFLOW                      │
└─────────────────────────────────────────────────────────────┘

ADD FIELD:
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Admin   │───▶│  Validate│───▶│   Add    │───▶│   Add    │
│  Adds    │    │   Field  │    │  Field   │    │  Column  │
│  Field   │    │   Data   │    │  to DB   │    │ to Table │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                      │                │                │
                      ▼                ▼                ▼
                  Validation      Transaction       Raw SQL
                  - Title unique  - Field insert    - ALTER TABLE ADD
                  - Type valid    - Commit          - CREATE INDEX
                                                    - Log migration

DELETE FIELD:
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Admin   │───▶│  Confirm │───▶│  Backup  │───▶│  Delete  │
│ Deletes  │    │  Deletion│    │   Data   │    │  Column  │
│  Field   │    │          │    │          │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                      │                │                │
                      ▼                ▼                ▼
                  Warning         Backup Table     Transaction
                  - Data loss     - Copy to        - Delete field
                  - Confirm UI    field_data_      - DROP COLUMN
                                 backup_{id}       - Log migration

RENAME FIELD:
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Admin   │───▶│  Validate│───▶│  Rename  │───▶│  Rename  │
│ Renames  │    │ New Name │    │  Field   │    │  Column  │
│  Field   │    │          │    │          │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                      │                │                │
                      ▼                ▼                ▼
                  Check Unique    Transaction       Raw SQL
                  - No conflict   - Update title    - ALTER TABLE RENAME
                  - Valid name    - Commit          - Log migration

CHANGE TYPE:
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Admin   │───▶│  Validate│───▶│  Convert │───▶│  Alter   │
│ Changes  │    │   Data   │    │   Data   │    │  Column  │
│   Type   │    │          │    │          │    │   Type   │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                      │                │                │
                      ▼                ▼                ▼
                  Data Check      Conversion        Raw SQL
                  - Compatible?   - CAST values     - ALTER TABLE ALTER
                  - Dry-run       - Validate        - USING expression
                                 - Rollback if fail - Log migration
```

### 3.3 Transaction Safety Model

```
┌─────────────────────────────────────────────────────────────┐
│               ATOMIC MIGRATION TRANSACTION                   │
└─────────────────────────────────────────────────────────────┘

BEGIN TRANSACTION
│
├─ 1. Validate Change (Pre-flight checks)
│  ├─ Check permissions (user role)
│  ├─ Validate field data (type, name, options)
│  ├─ Check dynamic table exists
│  └─ Verify no naming conflicts
│
├─ 2. Create Backup (If destructive)
│  ├─ Copy column data to backup table
│  ├─ Store backup metadata in field_data_backups
│  └─ Log backup ID in migration record
│
├─ 3. Execute ORM Changes (Sequelize)
│  ├─ Update/Insert/Delete in fields table
│  ├─ Update related records (show_conditions, etc.)
│  └─ Increment form.version
│
├─ 4. Execute Schema Changes (Raw SQL)
│  ├─ ALTER TABLE statement
│  ├─ CREATE/DROP INDEX if needed
│  └─ Verify schema change success
│
├─ 5. Create Audit Log
│  ├─ Insert into field_migrations table
│  ├─ Record old_value and new_value
│  └─ Store user_id and timestamp
│
└─ COMMIT (All or Nothing)
   ├─ Success: All changes applied atomically
   └─ Failure: ROLLBACK all changes
      └─ Restore from backup if needed
```

---

## 4. Database Schema Changes

### 4.1 New Table: field_migrations

**Purpose:** Track all field schema changes for audit and rollback

```sql
CREATE TABLE field_migrations (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  field_id UUID NOT NULL,  -- May be NULL if field was deleted
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,

  -- Migration Details
  migration_type VARCHAR(50) NOT NULL,  -- Enum: ADD_FIELD, DELETE_FIELD, etc.
  table_name VARCHAR(255) NOT NULL,     -- Dynamic table affected
  column_name VARCHAR(255),             -- Column affected (before rename)
  new_column_name VARCHAR(255),         -- Column name after rename

  -- Data Changes
  old_value JSONB,  -- Field definition before change
  new_value JSONB,  -- Field definition after change

  -- Metadata
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Rollback Support
  backup_id UUID,  -- References field_data_backups.id
  can_rollback BOOLEAN DEFAULT false,
  rollback_instructions TEXT,

  -- Status
  status VARCHAR(50) DEFAULT 'completed',  -- Enum: pending, completed, failed, rolled_back
  error_message TEXT,

  -- Indexing
  CONSTRAINT fk_field_migrations_form FOREIGN KEY (form_id)
    REFERENCES forms(id) ON DELETE CASCADE,
  INDEX idx_field_migrations_field_id (field_id),
  INDEX idx_field_migrations_form_id (form_id),
  INDEX idx_field_migrations_type (migration_type),
  INDEX idx_field_migrations_executed_at (executed_at)
);
```

**Sample Data:**

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "field_id": "field_abc123",
  "form_id": "form_xyz789",
  "migration_type": "RENAME_FIELD",
  "table_name": "citizen_feedback_123",
  "column_name": "comment",
  "new_column_name": "feedback_details",
  "old_value": {
    "title": "Comment",
    "type": "paragraph",
    "required": false
  },
  "new_value": {
    "title": "Feedback Details",
    "type": "paragraph",
    "required": false
  },
  "executed_by": "user_admin_001",
  "executed_at": "2025-10-07T14:30:00Z",
  "backup_id": null,
  "can_rollback": true,
  "rollback_instructions": "ALTER TABLE citizen_feedback_123 RENAME COLUMN feedback_details TO comment; UPDATE fields SET title='Comment' WHERE id='field_abc123';",
  "status": "completed"
}
```

### 4.2 New Table: field_data_backups

**Purpose:** Store column data before destructive operations

```sql
CREATE TABLE field_data_backups (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  field_id UUID NOT NULL,
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  migration_id UUID REFERENCES field_migrations(id) ON DELETE CASCADE,

  -- Backup Details
  table_name VARCHAR(255) NOT NULL,
  column_name VARCHAR(255) NOT NULL,
  data_type VARCHAR(100) NOT NULL,

  -- Backup Data
  backup_data JSONB NOT NULL,  -- Array of {id, value} pairs
  row_count INTEGER NOT NULL,

  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,  -- Auto-delete after 90 days

  -- Status
  is_restored BOOLEAN DEFAULT false,
  restored_at TIMESTAMP,

  -- Indexing
  INDEX idx_field_data_backups_field_id (field_id),
  INDEX idx_field_data_backups_form_id (form_id),
  INDEX idx_field_data_backups_created_at (created_at),
  INDEX idx_field_data_backups_expires_at (expires_at)
);
```

**Sample Data:**

```json
{
  "id": "backup_001",
  "field_id": "field_abc123",
  "form_id": "form_xyz789",
  "migration_id": "migration_001",
  "table_name": "citizen_feedback_123",
  "column_name": "email",
  "data_type": "VARCHAR(255)",
  "backup_data": [
    {"id": "sub_001", "value": "john@example.com"},
    {"id": "sub_002", "value": "jane@example.com"},
    {"id": "sub_003", "value": "bob@example.com"}
  ],
  "row_count": 3,
  "created_by": "user_admin_001",
  "created_at": "2025-10-07T14:30:00Z",
  "expires_at": "2026-01-05T14:30:00Z",
  "is_restored": false
}
```

### 4.3 Migration: Create field_migrations Table

**File:** `backend/migrations/20251007000001-create-field-migrations.js`

```javascript
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('field_migrations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      field_id: {
        type: Sequelize.UUID,
        allowNull: true,  // NULL if field was deleted
        comment: 'Field ID (may be NULL if field was deleted)',
      },
      form_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'forms',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      migration_type: {
        type: Sequelize.ENUM(
          'ADD_FIELD',
          'DELETE_FIELD',
          'RENAME_FIELD',
          'CHANGE_TYPE',
          'REORDER_FIELDS'
        ),
        allowNull: false,
      },
      table_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      column_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      new_column_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      old_value: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      new_value: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      executed_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      executed_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      backup_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      can_rollback: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      rollback_instructions: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'failed', 'rolled_back'),
        defaultValue: 'completed',
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create indexes
    await queryInterface.addIndex('field_migrations', ['field_id'], {
      name: 'idx_field_migrations_field_id',
    });
    await queryInterface.addIndex('field_migrations', ['form_id'], {
      name: 'idx_field_migrations_form_id',
    });
    await queryInterface.addIndex('field_migrations', ['migration_type'], {
      name: 'idx_field_migrations_type',
    });
    await queryInterface.addIndex('field_migrations', ['executed_at'], {
      name: 'idx_field_migrations_executed_at',
    });

    console.log('✅ Created field_migrations table with indexes');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('field_migrations');
    console.log('✅ Dropped field_migrations table');
  }
};
```

### 4.4 Migration: Create field_data_backups Table

**File:** `backend/migrations/20251007000002-create-field-data-backups.js`

```javascript
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('field_data_backups', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      field_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      form_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'forms',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      migration_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'field_migrations',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      table_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      column_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      data_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      backup_data: {
        type: Sequelize.JSONB,
        allowNull: false,
        comment: 'Array of {id, value} pairs',
      },
      row_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Auto-delete after 90 days',
      },
      is_restored: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      restored_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create indexes
    await queryInterface.addIndex('field_data_backups', ['field_id'], {
      name: 'idx_field_data_backups_field_id',
    });
    await queryInterface.addIndex('field_data_backups', ['form_id'], {
      name: 'idx_field_data_backups_form_id',
    });
    await queryInterface.addIndex('field_data_backups', ['created_at'], {
      name: 'idx_field_data_backups_created_at',
    });
    await queryInterface.addIndex('field_data_backups', ['expires_at'], {
      name: 'idx_field_data_backups_expires_at',
    });

    console.log('✅ Created field_data_backups table with indexes');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('field_data_backups');
    console.log('✅ Dropped field_data_backups table');
  }
};
```

---

## 5. Service Layer Changes

### 5.1 New Service: FieldMigrationService.js

**Location:** `backend/services/FieldMigrationService.js`

**Purpose:** Orchestrate all field schema migrations with transaction safety

**Key Methods:**

```javascript
class FieldMigrationService {
  /**
   * Add new field to form and dynamic table
   * @param {string} formId - Form ID
   * @param {Object} fieldData - Field definition
   * @param {string} userId - User executing migration
   * @returns {Promise<Object>} Created field with migration log
   */
  async addField(formId, fieldData, userId) {
    const transaction = await sequelize.transaction();

    try {
      // 1. Validate field data
      await this.validateFieldData(fieldData);

      // 2. Get form and dynamic table info
      const form = await Form.findByPk(formId);
      if (!form || !form.table_name) {
        throw new ApiError(404, 'Form or dynamic table not found');
      }

      // 3. Create field in fields table
      const field = await Field.create({
        form_id: formId,
        ...fieldData
      }, { transaction });

      // 4. Add column to dynamic table
      const columnName = await generateColumnName(field.title, field.id);
      const dataType = getPostgreSQLType(field.type);

      await this.addColumnToTable(
        form.table_name,
        columnName,
        dataType,
        transaction
      );

      // 5. Create migration log
      await this.logMigration({
        migration_type: 'ADD_FIELD',
        field_id: field.id,
        form_id: formId,
        table_name: form.table_name,
        column_name: columnName,
        new_value: field.toJSON(),
        executed_by: userId,
      }, transaction);

      await transaction.commit();
      return field;

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Delete field from form and dynamic table
   * CRITICAL: Creates backup before deletion
   * @param {string} fieldId - Field ID
   * @param {string} userId - User executing migration
   * @param {boolean} confirmDataLoss - User must confirm data loss
   * @returns {Promise<Object>} Migration log with backup ID
   */
  async deleteField(fieldId, userId, confirmDataLoss = false) {
    if (!confirmDataLoss) {
      throw new ApiError(400,
        'You must confirm data loss before deleting a field. ' +
        'This operation cannot be undone. ' +
        'Pass confirmDataLoss=true to proceed.',
        'CONFIRM_REQUIRED'
      );
    }

    const transaction = await sequelize.transaction();

    try {
      // 1. Get field and form
      const field = await Field.findByPk(fieldId);
      if (!field) {
        throw new ApiError(404, 'Field not found');
      }

      const form = await Form.findByPk(field.form_id);
      if (!form || !form.table_name) {
        throw new ApiError(404, 'Form or dynamic table not found');
      }

      const columnName = await generateColumnName(field.title, field.id);

      // 2. Backup column data
      const backupId = await this.backupColumnData(
        form.table_name,
        columnName,
        field.id,
        form.id,
        userId,
        transaction
      );

      // 3. Drop column from dynamic table
      await this.dropColumnFromTable(
        form.table_name,
        columnName,
        transaction
      );

      // 4. Delete field from fields table (CASCADE deletes submission_data)
      const oldValue = field.toJSON();
      await field.destroy({ transaction });

      // 5. Create migration log
      const migration = await this.logMigration({
        migration_type: 'DELETE_FIELD',
        field_id: fieldId,
        form_id: form.id,
        table_name: form.table_name,
        column_name: columnName,
        old_value: oldValue,
        backup_id: backupId,
        can_rollback: true,
        rollback_instructions: this.generateRestoreInstructions(
          form.table_name,
          columnName,
          backupId,
          oldValue
        ),
        executed_by: userId,
      }, transaction);

      await transaction.commit();

      return {
        message: 'Field deleted successfully',
        backup_id: backupId,
        migration_id: migration.id,
        can_restore: true,
        restore_deadline: migration.backup?.expires_at,
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Rename field title and column name
   * @param {string} fieldId - Field ID
   * @param {string} newTitle - New field title
   * @param {string} userId - User executing migration
   * @returns {Promise<Object>} Updated field with migration log
   */
  async renameField(fieldId, newTitle, userId) {
    const transaction = await sequelize.transaction();

    try {
      // 1. Get field and form
      const field = await Field.findByPk(fieldId);
      if (!field) {
        throw new ApiError(404, 'Field not found');
      }

      const form = await Form.findByPk(field.form_id);
      if (!form || !form.table_name) {
        throw new ApiError(404, 'Form or dynamic table not found');
      }

      const oldTitle = field.title;
      const oldColumnName = await generateColumnName(oldTitle, field.id);
      const newColumnName = await generateColumnName(newTitle, field.id);

      // 2. Check for column name conflicts
      const existingColumns = await this.getTableColumns(form.table_name);
      if (existingColumns.includes(newColumnName)) {
        throw new ApiError(400,
          `Column "${newColumnName}" already exists in table. ` +
          `Please choose a different field name.`,
          'DUPLICATE_COLUMN_NAME'
        );
      }

      // 3. Rename column in dynamic table
      await this.renameColumnInTable(
        form.table_name,
        oldColumnName,
        newColumnName,
        transaction
      );

      // 4. Update field title
      const oldValue = field.toJSON();
      field.title = newTitle;
      await field.save({ transaction });

      // 5. Create migration log
      await this.logMigration({
        migration_type: 'RENAME_FIELD',
        field_id: fieldId,
        form_id: form.id,
        table_name: form.table_name,
        column_name: oldColumnName,
        new_column_name: newColumnName,
        old_value: oldValue,
        new_value: field.toJSON(),
        can_rollback: true,
        rollback_instructions: this.generateRenameRollbackInstructions(
          form.table_name,
          newColumnName,
          oldColumnName,
          fieldId,
          oldTitle
        ),
        executed_by: userId,
      }, transaction);

      await transaction.commit();
      return field;

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Change field type (e.g., text → number)
   * CRITICAL: Validates data compatibility before conversion
   * @param {string} fieldId - Field ID
   * @param {string} newType - New field type
   * @param {string} userId - User executing migration
   * @returns {Promise<Object>} Updated field with migration log
   */
  async changeFieldType(fieldId, newType, userId) {
    const transaction = await sequelize.transaction();

    try {
      // 1. Get field and form
      const field = await Field.findByPk(fieldId);
      if (!field) {
        throw new ApiError(404, 'Field not found');
      }

      const form = await Form.findByPk(field.form_id);
      if (!form || !form.table_name) {
        throw new ApiError(404, 'Form or dynamic table not found');
      }

      const oldType = field.type;
      const columnName = await generateColumnName(field.title, field.id);
      const oldDataType = getPostgreSQLType(oldType);
      const newDataType = getPostgreSQLType(newType);

      // 2. Validate type conversion compatibility
      const validation = await this.validateTypeConversion(
        form.table_name,
        columnName,
        oldDataType,
        newDataType
      );

      if (!validation.compatible) {
        throw new ApiError(400,
          `Cannot convert field type: ${validation.error}. ` +
          `${validation.incompatible_count} rows have incompatible data.`,
          'TYPE_CONVERSION_FAILED',
          { incompatible_rows: validation.incompatible_rows }
        );
      }

      // 3. Backup data before conversion
      const backupId = await this.backupColumnData(
        form.table_name,
        columnName,
        field.id,
        form.id,
        userId,
        transaction
      );

      // 4. Alter column type in dynamic table
      await this.alterColumnType(
        form.table_name,
        columnName,
        oldDataType,
        newDataType,
        validation.using_expression,
        transaction
      );

      // 5. Update field type
      const oldValue = field.toJSON();
      field.type = newType;
      await field.save({ transaction });

      // 6. Create migration log
      await this.logMigration({
        migration_type: 'CHANGE_TYPE',
        field_id: fieldId,
        form_id: form.id,
        table_name: form.table_name,
        column_name: columnName,
        old_value: { ...oldValue, data_type: oldDataType },
        new_value: { ...field.toJSON(), data_type: newDataType },
        backup_id: backupId,
        can_rollback: true,
        rollback_instructions: this.generateTypeChangeRollbackInstructions(
          form.table_name,
          columnName,
          newDataType,
          oldDataType,
          backupId
        ),
        executed_by: userId,
      }, transaction);

      await transaction.commit();
      return field;

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Reorder fields (no schema change, only update order column)
   * @param {string} formId - Form ID
   * @param {Array<{id, order}>} fieldOrders - Array of field IDs with new orders
   * @param {string} userId - User executing migration
   * @returns {Promise<Array>} Updated fields
   */
  async reorderFields(formId, fieldOrders, userId) {
    const transaction = await sequelize.transaction();

    try {
      const updates = [];

      for (const { id, order } of fieldOrders) {
        const field = await Field.findByPk(id);
        if (field && field.form_id === formId) {
          field.order = order;
          await field.save({ transaction });
          updates.push(field);
        }
      }

      // Log migration (no schema change)
      await this.logMigration({
        migration_type: 'REORDER_FIELDS',
        form_id: formId,
        new_value: { field_orders: fieldOrders },
        can_rollback: false,
        executed_by: userId,
      }, transaction);

      await transaction.commit();
      return updates;

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Rollback a migration
   * @param {string} migrationId - Migration ID to rollback
   * @param {string} userId - User executing rollback
   * @returns {Promise<Object>} Rollback result
   */
  async rollbackMigration(migrationId, userId) {
    const transaction = await sequelize.transaction();

    try {
      const migration = await FieldMigration.findByPk(migrationId, {
        include: [{ model: FieldDataBackup, as: 'backup' }]
      });

      if (!migration) {
        throw new ApiError(404, 'Migration not found');
      }

      if (!migration.can_rollback) {
        throw new ApiError(400, 'This migration cannot be rolled back');
      }

      if (migration.status === 'rolled_back') {
        throw new ApiError(400, 'Migration already rolled back');
      }

      // Execute rollback based on migration type
      switch (migration.migration_type) {
        case 'DELETE_FIELD':
          await this.rollbackDeleteField(migration, transaction);
          break;
        case 'RENAME_FIELD':
          await this.rollbackRenameField(migration, transaction);
          break;
        case 'CHANGE_TYPE':
          await this.rollbackChangeType(migration, transaction);
          break;
        default:
          throw new ApiError(400, 'Rollback not supported for this migration type');
      }

      // Update migration status
      migration.status = 'rolled_back';
      await migration.save({ transaction });

      await transaction.commit();

      return {
        message: 'Migration rolled back successfully',
        migration_id: migrationId,
        migration_type: migration.migration_type,
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Add column to dynamic table
   */
  async addColumnToTable(tableName, columnName, dataType, transaction) {
    const pool = this.getPool();
    const client = await pool.connect();

    try {
      const query = `
        ALTER TABLE "${tableName}"
        ADD COLUMN IF NOT EXISTS "${columnName}" ${dataType};
      `;
      await client.query(query);
      logger.info(`Added column ${columnName} to ${tableName}`);
    } finally {
      client.release();
    }
  }

  /**
   * Drop column from dynamic table
   */
  async dropColumnFromTable(tableName, columnName, transaction) {
    const pool = this.getPool();
    const client = await pool.connect();

    try {
      const query = `
        ALTER TABLE "${tableName}"
        DROP COLUMN IF EXISTS "${columnName}";
      `;
      await client.query(query);
      logger.info(`Dropped column ${columnName} from ${tableName}`);
    } finally {
      client.release();
    }
  }

  /**
   * Rename column in dynamic table
   */
  async renameColumnInTable(tableName, oldName, newName, transaction) {
    const pool = this.getPool();
    const client = await pool.connect();

    try {
      const query = `
        ALTER TABLE "${tableName}"
        RENAME COLUMN "${oldName}" TO "${newName}";
      `;
      await client.query(query);
      logger.info(`Renamed column ${oldName} to ${newName} in ${tableName}`);
    } finally {
      client.release();
    }
  }

  /**
   * Alter column type in dynamic table
   */
  async alterColumnType(tableName, columnName, oldType, newType, usingExpression, transaction) {
    const pool = this.getPool();
    const client = await pool.connect();

    try {
      const query = `
        ALTER TABLE "${tableName}"
        ALTER COLUMN "${columnName}" TYPE ${newType}
        ${usingExpression ? `USING ${usingExpression}` : ''};
      `;
      await client.query(query);
      logger.info(`Altered column ${columnName} type from ${oldType} to ${newType} in ${tableName}`);
    } finally {
      client.release();
    }
  }

  /**
   * Backup column data before destructive operation
   */
  async backupColumnData(tableName, columnName, fieldId, formId, userId, transaction) {
    const pool = this.getPool();
    const client = await pool.connect();

    try {
      // Get column data type
      const typeQuery = `
        SELECT data_type
        FROM information_schema.columns
        WHERE table_name = $1 AND column_name = $2;
      `;
      const typeResult = await client.query(typeQuery, [tableName, columnName]);
      const dataType = typeResult.rows[0]?.data_type || 'TEXT';

      // Get all data from column
      const dataQuery = `
        SELECT id, "${columnName}" as value
        FROM "${tableName}"
        WHERE "${columnName}" IS NOT NULL;
      `;
      const dataResult = await client.query(dataQuery);

      // Create backup record
      const backup = await FieldDataBackup.create({
        field_id: fieldId,
        form_id: formId,
        table_name: tableName,
        column_name: columnName,
        data_type: dataType,
        backup_data: dataResult.rows,
        row_count: dataResult.rows.length,
        created_by: userId,
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      }, { transaction });

      logger.info(`Backed up ${dataResult.rows.length} rows from ${tableName}.${columnName}`);
      return backup.id;

    } finally {
      client.release();
    }
  }

  /**
   * Validate field data before creation
   */
  async validateFieldData(fieldData) {
    const validTypes = [
      'short_answer', 'paragraph', 'email', 'phone', 'number', 'url',
      'file_upload', 'image_upload', 'date', 'time', 'datetime',
      'multiple_choice', 'rating', 'slider', 'lat_long', 'province', 'factory'
    ];

    if (!fieldData.type || !validTypes.includes(fieldData.type)) {
      throw new ApiError(400, `Invalid field type: ${fieldData.type}`);
    }

    if (!fieldData.title || fieldData.title.trim().length === 0) {
      throw new ApiError(400, 'Field title is required');
    }

    if (fieldData.title.length > 255) {
      throw new ApiError(400, 'Field title must be 255 characters or less');
    }
  }

  /**
   * Validate type conversion compatibility
   */
  async validateTypeConversion(tableName, columnName, oldType, newType) {
    const pool = this.getPool();
    const client = await pool.connect();

    try {
      // Attempt to cast all values to new type
      const query = `
        SELECT
          id,
          "${columnName}" as original_value,
          CASE
            WHEN "${columnName}" IS NULL THEN NULL
            ELSE TRY_CAST("${columnName}" AS ${newType})
          END as converted_value
        FROM "${tableName}"
        WHERE "${columnName}" IS NOT NULL;
      `;

      const result = await client.query(query);

      const incompatibleRows = result.rows.filter(row =>
        row.original_value !== null && row.converted_value === null
      );

      if (incompatibleRows.length > 0) {
        return {
          compatible: false,
          error: 'Some values cannot be converted to new type',
          incompatible_count: incompatibleRows.length,
          incompatible_rows: incompatibleRows.slice(0, 10), // First 10 examples
        };
      }

      // Determine USING expression for conversion
      let usingExpression = null;
      if (oldType.includes('VARCHAR') && newType === 'INTEGER') {
        usingExpression = `"${columnName}"::INTEGER`;
      } else if (oldType.includes('VARCHAR') && newType === 'NUMERIC') {
        usingExpression = `"${columnName}"::NUMERIC`;
      }

      return {
        compatible: true,
        using_expression: usingExpression,
      };

    } catch (error) {
      return {
        compatible: false,
        error: error.message,
        incompatible_count: null,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get table columns
   */
  async getTableColumns(tableName) {
    const pool = this.getPool();
    const client = await pool.connect();

    try {
      const query = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = $1;
      `;
      const result = await client.query(query, [tableName]);
      return result.rows.map(r => r.column_name);
    } finally {
      client.release();
    }
  }

  /**
   * Log migration to field_migrations table
   */
  async logMigration(data, transaction) {
    return await FieldMigration.create(data, { transaction });
  }

  /**
   * Generate rollback instructions for field restoration
   */
  generateRestoreInstructions(tableName, columnName, backupId, fieldData) {
    return `
-- Restore deleted field
-- 1. Re-create column
ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${getPostgreSQLType(fieldData.type)};

-- 2. Restore data from backup
-- Run: FieldMigrationService.restoreColumnData('${backupId}')

-- 3. Re-create field in fields table
INSERT INTO fields (id, form_id, type, title, ...) VALUES (...);
    `.trim();
  }

  /**
   * Generate rollback instructions for field rename
   */
  generateRenameRollbackInstructions(tableName, currentName, originalName, fieldId, originalTitle) {
    return `
-- Rollback field rename
-- 1. Rename column back
ALTER TABLE "${tableName}" RENAME COLUMN "${currentName}" TO "${originalName}";

-- 2. Update field title
UPDATE fields SET title = '${originalTitle}' WHERE id = '${fieldId}';
    `.trim();
  }

  /**
   * Generate rollback instructions for type change
   */
  generateTypeChangeRollbackInstructions(tableName, columnName, currentType, originalType, backupId) {
    return `
-- Rollback type change
-- 1. Restore data from backup
-- Run: FieldMigrationService.restoreColumnData('${backupId}')

-- 2. Alter column type back
ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" TYPE ${originalType};
    `.trim();
  }

  /**
   * Restore column data from backup
   */
  async restoreColumnData(backupId) {
    const transaction = await sequelize.transaction();

    try {
      const backup = await FieldDataBackup.findByPk(backupId);
      if (!backup) {
        throw new ApiError(404, 'Backup not found');
      }

      if (backup.is_restored) {
        throw new ApiError(400, 'Backup already restored');
      }

      const pool = this.getPool();
      const client = await pool.connect();

      try {
        // Restore each row
        for (const row of backup.backup_data) {
          const query = `
            UPDATE "${backup.table_name}"
            SET "${backup.column_name}" = $1
            WHERE id = $2;
          `;
          await client.query(query, [row.value, row.id]);
        }

        // Mark backup as restored
        backup.is_restored = true;
        backup.restored_at = new Date();
        await backup.save({ transaction });

        await transaction.commit();

        logger.info(`Restored ${backup.row_count} rows from backup ${backupId}`);
        return { restored_count: backup.row_count };

      } finally {
        client.release();
      }

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get PostgreSQL connection pool
   */
  getPool() {
    const { Pool } = require('pg');
    return new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'qcollector_db',
      user: process.env.POSTGRES_USER || 'qcollector',
      password: process.env.POSTGRES_PASSWORD,
    });
  }
}

module.exports = FieldMigrationService;
```

---

## 6. API Endpoint Changes

### 6.1 New Endpoints: Field Migration Routes

**File:** `backend/api/routes/field-migration.routes.js`

```javascript
const express = require('express');
const router = express.Router();
const FieldMigrationService = require('../../services/FieldMigrationService');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/auth.middleware');

const migrationService = new FieldMigrationService();

/**
 * @route   POST /api/field-migrations/add-field
 * @desc    Add new field to form and dynamic table
 * @access  Admin, Form Creator
 */
router.post('/add-field', authenticate, async (req, res, next) => {
  try {
    const { formId, fieldData } = req.body;

    // Check permission (form creator, admin, or super_admin)
    const form = await Form.findByPk(formId);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const isCreator = form.created_by === req.user.id;
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role);

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to modify this form' });
    }

    const field = await migrationService.addField(formId, fieldData, req.user.id);

    res.status(201).json({
      message: 'Field added successfully',
      field,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/field-migrations/delete-field/:fieldId
 * @desc    Delete field from form and dynamic table (with backup)
 * @access  Admin, Form Creator
 */
router.delete('/delete-field/:fieldId', authenticate, async (req, res, next) => {
  try {
    const { fieldId } = req.params;
    const { confirmDataLoss } = req.body;

    // Check permission
    const field = await Field.findByPk(fieldId);
    if (!field) {
      return res.status(404).json({ error: 'Field not found' });
    }

    const form = await Form.findByPk(field.form_id);
    const isCreator = form.created_by === req.user.id;
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role);

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to modify this form' });
    }

    const result = await migrationService.deleteField(
      fieldId,
      req.user.id,
      confirmDataLoss
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/field-migrations/rename-field/:fieldId
 * @desc    Rename field title and column name
 * @access  Admin, Form Creator
 */
router.put('/rename-field/:fieldId', authenticate, async (req, res, next) => {
  try {
    const { fieldId } = req.params;
    const { newTitle } = req.body;

    if (!newTitle || newTitle.trim().length === 0) {
      return res.status(400).json({ error: 'New title is required' });
    }

    // Check permission
    const field = await Field.findByPk(fieldId);
    if (!field) {
      return res.status(404).json({ error: 'Field not found' });
    }

    const form = await Form.findByPk(field.form_id);
    const isCreator = form.created_by === req.user.id;
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role);

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to modify this form' });
    }

    const updatedField = await migrationService.renameField(
      fieldId,
      newTitle,
      req.user.id
    );

    res.json({
      message: 'Field renamed successfully',
      field: updatedField,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/field-migrations/change-type/:fieldId
 * @desc    Change field type (with data validation)
 * @access  Admin, Form Creator
 */
router.put('/change-type/:fieldId', authenticate, async (req, res, next) => {
  try {
    const { fieldId } = req.params;
    const { newType } = req.body;

    if (!newType) {
      return res.status(400).json({ error: 'New type is required' });
    }

    // Check permission
    const field = await Field.findByPk(fieldId);
    if (!field) {
      return res.status(404).json({ error: 'Field not found' });
    }

    const form = await Form.findByPk(field.form_id);
    const isCreator = form.created_by === req.user.id;
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role);

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to modify this form' });
    }

    const updatedField = await migrationService.changeFieldType(
      fieldId,
      newType,
      req.user.id
    );

    res.json({
      message: 'Field type changed successfully',
      field: updatedField,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/field-migrations/reorder-fields
 * @desc    Reorder fields (no schema change)
 * @access  Admin, Form Creator
 */
router.put('/reorder-fields', authenticate, async (req, res, next) => {
  try {
    const { formId, fieldOrders } = req.body;

    if (!Array.isArray(fieldOrders)) {
      return res.status(400).json({ error: 'fieldOrders must be an array' });
    }

    // Check permission
    const form = await Form.findByPk(formId);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const isCreator = form.created_by === req.user.id;
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role);

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to modify this form' });
    }

    const updatedFields = await migrationService.reorderFields(
      formId,
      fieldOrders,
      req.user.id
    );

    res.json({
      message: 'Fields reordered successfully',
      fields: updatedFields,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/field-migrations/rollback/:migrationId
 * @desc    Rollback a field migration
 * @access  Admin only
 */
router.post('/rollback/:migrationId', authenticate, authorize(['admin', 'super_admin']), async (req, res, next) => {
  try {
    const { migrationId } = req.params;

    const result = await migrationService.rollbackMigration(
      migrationId,
      req.user.id
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/field-migrations/form/:formId
 * @desc    Get migration history for a form
 * @access  Admin, Form Creator
 */
router.get('/form/:formId', authenticate, async (req, res, next) => {
  try {
    const { formId } = req.params;

    const form = await Form.findByPk(formId);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const isCreator = form.created_by === req.user.id;
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role);

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to view migration history' });
    }

    const migrations = await FieldMigration.findAll({
      where: { form_id: formId },
      include: [
        { model: User, as: 'executor', attributes: ['id', 'username', 'role'] },
        { model: FieldDataBackup, as: 'backup' },
      ],
      order: [['executed_at', 'DESC']],
    });

    res.json({ migrations });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/field-migrations/restore-backup/:backupId
 * @desc    Restore column data from backup
 * @access  Admin only
 */
router.post('/restore-backup/:backupId', authenticate, authorize(['admin', 'super_admin']), async (req, res, next) => {
  try {
    const { backupId } = req.params;

    const result = await migrationService.restoreColumnData(backupId);

    res.json({
      message: 'Data restored successfully',
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

### 6.2 Update Main Routes Index

**File:** `backend/api/routes/index.js` (Add new route)

```javascript
const fieldMigrationRoutes = require('./field-migration.routes');

// ... existing routes ...

app.use('/api/field-migrations', fieldMigrationRoutes);
```

---

## 7. Frontend Changes

### 7.1 New Component: FieldMigrationManager.jsx

**Location:** `src/components/admin/FieldMigrationManager.jsx`

**Purpose:** Admin UI for managing field migrations

```jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '@/services/ApiClient';
import { toast } from 'react-hot-toast';

const FieldMigrationManager = () => {
  const { formId } = useParams();
  const [migrations, setMigrations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMigrations();
  }, [formId]);

  const fetchMigrations = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/field-migrations/form/${formId}`);
      setMigrations(response.migrations);
    } catch (error) {
      toast.error('Failed to load migration history');
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (migrationId) => {
    if (!confirm('Are you sure you want to rollback this migration? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.post(`/field-migrations/rollback/${migrationId}`);
      toast.success('Migration rolled back successfully');
      fetchMigrations();
    } catch (error) {
      toast.error(`Rollback failed: ${error.message}`);
    }
  };

  const handleRestoreBackup = async (backupId) => {
    if (!confirm('Are you sure you want to restore data from this backup?')) {
      return;
    }

    try {
      const response = await apiClient.post(`/field-migrations/restore-backup/${backupId}`);
      toast.success(`Restored ${response.restored_count} rows successfully`);
    } catch (error) {
      toast.error(`Restore failed: ${error.message}`);
    }
  };

  const getMigrationTypeColor = (type) => {
    const colors = {
      'ADD_FIELD': 'bg-green-100 text-green-800',
      'DELETE_FIELD': 'bg-red-100 text-red-800',
      'RENAME_FIELD': 'bg-blue-100 text-blue-800',
      'CHANGE_TYPE': 'bg-yellow-100 text-yellow-800',
      'REORDER_FIELDS': 'bg-gray-100 text-gray-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading migration history...</div>;
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Field Migration History</h2>

      {migrations.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No migrations found for this form
        </div>
      ) : (
        <div className="space-y-4">
          {migrations.map((migration) => (
            <div
              key={migration.id}
              className="border rounded-lg p-4 bg-white shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getMigrationTypeColor(migration.migration_type)}`}>
                      {migration.migration_type.replace('_', ' ')}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(migration.executed_at).toLocaleString()}
                    </span>
                  </div>

                  {migration.column_name && (
                    <div className="text-sm mb-2">
                      <span className="font-medium">Column:</span>{' '}
                      <code className="bg-gray-100 px-2 py-1 rounded">
                        {migration.column_name}
                      </code>
                      {migration.new_column_name && (
                        <>
                          {' → '}
                          <code className="bg-gray-100 px-2 py-1 rounded">
                            {migration.new_column_name}
                          </code>
                        </>
                      )}
                    </div>
                  )}

                  {migration.executor && (
                    <div className="text-sm text-gray-600">
                      Executed by: {migration.executor.username}
                    </div>
                  )}

                  {migration.error_message && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      <strong>Error:</strong> {migration.error_message}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {migration.can_rollback && migration.status !== 'rolled_back' && (
                    <button
                      onClick={() => handleRollback(migration.id)}
                      className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
                    >
                      Rollback
                    </button>
                  )}

                  {migration.backup && !migration.backup.is_restored && (
                    <button
                      onClick={() => handleRestoreBackup(migration.backup.id)}
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                    >
                      Restore Backup
                    </button>
                  )}
                </div>
              </div>

              {migration.rollback_instructions && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                    Show rollback instructions
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                    {migration.rollback_instructions}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FieldMigrationManager;
```

### 7.2 Update EnhancedFormBuilder.jsx

**Add field management UI with migration warnings**

```jsx
// Inside EnhancedFormBuilder.jsx

const handleDeleteField = async (fieldIndex) => {
  const field = fields[fieldIndex];

  // Check if this is an existing field (has ID) or a new unsaved field
  if (field.id) {
    // Existing field - show migration warning
    const confirmMessage = `
      ⚠️ WARNING: Deleting this field will:

      1. Remove the field from all future submissions
      2. Delete the column from the dynamic database table
      3. Archive existing submission data (recoverable for 90 days)

      Field: "${field.title}"
      Type: ${field.type}

      This action can be rolled back within 90 days.

      Are you absolutely sure you want to delete this field?
    `;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      await apiClient.delete(`/field-migrations/delete-field/${field.id}`, {
        data: { confirmDataLoss: true }
      });

      toast.success(`Field "${field.title}" deleted. Data backed up for 90 days.`);

      // Remove from local state
      const updatedFields = fields.filter((_, i) => i !== fieldIndex);
      setFields(updatedFields);

    } catch (error) {
      toast.error(`Failed to delete field: ${error.message}`);
    }
  } else {
    // New unsaved field - just remove from state
    const updatedFields = fields.filter((_, i) => i !== fieldIndex);
    setFields(updatedFields);
    toast.success('Field removed');
  }
};

const handleRenameField = async (fieldId, newTitle) => {
  try {
    await apiClient.put(`/field-migrations/rename-field/${fieldId}`, {
      newTitle
    });

    toast.success('Field renamed successfully');

    // Update local state
    const updatedFields = fields.map(f =>
      f.id === fieldId ? { ...f, title: newTitle } : f
    );
    setFields(updatedFields);

  } catch (error) {
    toast.error(`Failed to rename field: ${error.message}`);
  }
};

const handleChangeFieldType = async (fieldId, newType) => {
  const confirmMessage = `
    ⚠️ WARNING: Changing field type may cause data loss or corruption.

    The system will validate that existing data can be converted to the new type.
    If any submissions have incompatible data, the change will be rejected.

    Are you sure you want to change this field type?
  `;

  if (!confirm(confirmMessage)) {
    return;
  }

  try {
    await apiClient.put(`/field-migrations/change-type/${fieldId}`, {
      newType
    });

    toast.success('Field type changed successfully');

    // Update local state
    const updatedFields = fields.map(f =>
      f.id === fieldId ? { ...f, type: newType } : f
    );
    setFields(updatedFields);

  } catch (error) {
    if (error.code === 'TYPE_CONVERSION_FAILED') {
      toast.error(
        `Cannot convert field type: ${error.data.incompatible_count} submissions have incompatible data. ` +
        `Please fix the data first.`
      );
    } else {
      toast.error(`Failed to change field type: ${error.message}`);
    }
  }
};
```

---

## 8. Migration Scripts

### 8.1 Backfill Script: Sync Existing Forms

**File:** `backend/scripts/sync-existing-dynamic-tables.js`

**Purpose:** Sync existing forms with their dynamic tables (add missing columns)

```javascript
/**
 * Sync Existing Dynamic Tables Script
 *
 * For all existing forms with dynamic tables:
 * 1. Compare fields table with dynamic table columns
 * 2. Add missing columns (fields added without migration)
 * 3. Log all changes to field_migrations table
 *
 * Usage: node backend/scripts/sync-existing-dynamic-tables.js
 */

const { Form, Field } = require('../models');
const DynamicTableService = require('../services/DynamicTableService');
const FieldMigrationService = require('../services/FieldMigrationService');
const logger = require('../utils/logger.util');

const dynamicTableService = new DynamicTableService();
const migrationService = new FieldMigrationService();

async function syncAllForms() {
  try {
    console.log('🔄 Starting dynamic table synchronization...\n');

    // Get all forms with dynamic tables
    const forms = await Form.findAll({
      where: {
        table_name: { [Op.ne]: null }
      },
      include: [{ model: Field, as: 'fields' }]
    });

    console.log(`Found ${forms.length} forms with dynamic tables\n`);

    let totalAdded = 0;
    let totalErrors = 0;

    for (const form of forms) {
      console.log(`📋 Processing form: ${form.title} (${form.id})`);
      console.log(`   Dynamic table: ${form.table_name}`);

      try {
        // Get existing columns in dynamic table
        const existingColumns = await migrationService.getTableColumns(form.table_name);

        // Get all fields that should have columns
        const mainFormFields = form.fields.filter(f => !f.sub_form_id);

        console.log(`   Expected fields: ${mainFormFields.length}`);
        console.log(`   Existing columns: ${existingColumns.length}`);

        // Find missing columns
        const missingFields = [];
        for (const field of mainFormFields) {
          const columnName = await generateColumnName(field.title, field.id);
          if (!existingColumns.includes(columnName)) {
            missingFields.push({ field, columnName });
          }
        }

        if (missingFields.length > 0) {
          console.log(`   ⚠️  Missing ${missingFields.length} columns:`);

          for (const { field, columnName } of missingFields) {
            console.log(`      - Adding column: ${columnName} (${field.type})`);

            try {
              const dataType = getPostgreSQLType(field.type);
              await migrationService.addColumnToTable(
                form.table_name,
                columnName,
                dataType,
                null // No transaction for backfill
              );

              // Log as ADD_FIELD migration
              await migrationService.logMigration({
                migration_type: 'ADD_FIELD',
                field_id: field.id,
                form_id: form.id,
                table_name: form.table_name,
                column_name: columnName,
                new_value: field.toJSON(),
                executed_by: null, // System migration
                status: 'completed',
              }, null);

              console.log(`      ✅ Added: ${columnName}`);
              totalAdded++;

            } catch (error) {
              console.error(`      ❌ Failed to add ${columnName}: ${error.message}`);
              totalErrors++;
            }
          }
        } else {
          console.log(`   ✅ All columns in sync`);
        }

        console.log('');

      } catch (error) {
        console.error(`   ❌ Error processing form ${form.id}: ${error.message}\n`);
        totalErrors++;
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Synchronization Summary:');
    console.log(`   Forms processed: ${forms.length}`);
    console.log(`   Columns added: ${totalAdded}`);
    console.log(`   Errors: ${totalErrors}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (totalErrors === 0) {
      console.log('✅ All forms synchronized successfully!\n');
    } else {
      console.log('⚠️  Some errors occurred. Check logs above.\n');
    }

  } catch (error) {
    console.error('❌ Synchronization failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the script
syncAllForms();
```

### 8.2 Cleanup Script: Remove Orphaned Columns

**File:** `backend/scripts/cleanup-orphaned-columns.js`

**Purpose:** Find and optionally remove columns that don't have corresponding fields

```javascript
/**
 * Cleanup Orphaned Columns Script
 *
 * For all forms with dynamic tables:
 * 1. Find columns that don't have corresponding fields
 * 2. Report orphaned columns (deleted fields)
 * 3. Optionally backup and drop orphaned columns
 *
 * Usage:
 *   Dry-run:  node backend/scripts/cleanup-orphaned-columns.js
 *   Execute:  node backend/scripts/cleanup-orphaned-columns.js --execute
 */

const { Form, Field } = require('../models');
const FieldMigrationService = require('../services/FieldMigrationService');
const logger = require('../utils/logger.util');

const migrationService = new FieldMigrationService();
const executeMode = process.argv.includes('--execute');

async function cleanupOrphanedColumns() {
  try {
    console.log('🔍 Scanning for orphaned columns...\n');
    if (!executeMode) {
      console.log('ℹ️  DRY-RUN MODE: No changes will be made\n');
      console.log('   To execute cleanup, run with --execute flag\n');
    }

    const forms = await Form.findAll({
      where: { table_name: { [Op.ne]: null } },
      include: [{ model: Field, as: 'fields' }]
    });

    let totalOrphaned = 0;
    let totalCleaned = 0;
    const orphanedByForm = [];

    for (const form of forms) {
      const existingColumns = await migrationService.getTableColumns(form.table_name);
      const mainFormFields = form.fields.filter(f => !f.sub_form_id);

      // System columns (always present)
      const systemColumns = ['id', 'form_id', 'username', 'submission_number', 'submitted_at'];

      // Expected columns (from current fields)
      const expectedColumns = [];
      for (const field of mainFormFields) {
        const columnName = await generateColumnName(field.title, field.id);
        expectedColumns.push(columnName);
      }

      // Find orphaned columns
      const orphanedColumns = existingColumns.filter(col =>
        !systemColumns.includes(col) && !expectedColumns.includes(col)
      );

      if (orphanedColumns.length > 0) {
        console.log(`📋 Form: ${form.title} (${form.id})`);
        console.log(`   Table: ${form.table_name}`);
        console.log(`   Orphaned columns: ${orphanedColumns.length}`);

        totalOrphaned += orphanedColumns.length;

        for (const columnName of orphanedColumns) {
          console.log(`   - ${columnName}`);

          if (executeMode) {
            try {
              // Backup column data
              const backupId = await migrationService.backupColumnData(
                form.table_name,
                columnName,
                null, // No field_id (orphaned)
                form.id,
                null, // System cleanup
                null // No transaction
              );

              // Drop column
              await migrationService.dropColumnFromTable(
                form.table_name,
                columnName,
                null
              );

              // Log cleanup migration
              await migrationService.logMigration({
                migration_type: 'DELETE_FIELD',
                field_id: null,
                form_id: form.id,
                table_name: form.table_name,
                column_name: columnName,
                backup_id: backupId,
                can_rollback: true,
                executed_by: null,
                status: 'completed',
              }, null);

              console.log(`     ✅ Cleaned (backed up to ${backupId})`);
              totalCleaned++;

            } catch (error) {
              console.error(`     ❌ Failed to clean: ${error.message}`);
            }
          }
        }

        orphanedByForm.push({
          form: form.title,
          table: form.table_name,
          orphaned_count: orphanedColumns.length,
          orphaned_columns: orphanedColumns,
        });

        console.log('');
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Cleanup Summary:');
    console.log(`   Forms scanned: ${forms.length}`);
    console.log(`   Orphaned columns found: ${totalOrphaned}`);
    if (executeMode) {
      console.log(`   Columns cleaned: ${totalCleaned}`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (!executeMode && totalOrphaned > 0) {
      console.log('ℹ️  To execute cleanup, run:');
      console.log('   node backend/scripts/cleanup-orphaned-columns.js --execute\n');
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

cleanupOrphanedColumns();
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

**File:** `backend/tests/unit/services/FieldMigrationService.test.js`

```javascript
const FieldMigrationService = require('../../../services/FieldMigrationService');
const { Form, Field, FieldMigration } = require('../../../models');

describe('FieldMigrationService', () => {
  let service;
  let testForm;
  let testUser;

  beforeEach(async () => {
    service = new FieldMigrationService();

    // Create test form with dynamic table
    testForm = await Form.create({
      title: 'Test Form',
      table_name: 'test_form_123',
      created_by: testUser.id,
    });
  });

  describe('addField', () => {
    it('should add field and column to dynamic table', async () => {
      const fieldData = {
        type: 'short_answer',
        title: 'Test Field',
        required: true,
      };

      const field = await service.addField(testForm.id, fieldData, testUser.id);

      expect(field).toBeDefined();
      expect(field.title).toBe('Test Field');

      // Check column was added
      const columns = await service.getTableColumns(testForm.table_name);
      expect(columns).toContain('test_field');

      // Check migration log
      const migration = await FieldMigration.findOne({
        where: { field_id: field.id, migration_type: 'ADD_FIELD' }
      });
      expect(migration).toBeDefined();
    });

    it('should reject invalid field data', async () => {
      const invalidData = {
        type: 'invalid_type',
        title: '',
      };

      await expect(
        service.addField(testForm.id, invalidData, testUser.id)
      ).rejects.toThrow('Invalid field type');
    });
  });

  describe('deleteField', () => {
    it('should backup data before deleting field', async () => {
      const field = await Field.create({
        form_id: testForm.id,
        type: 'email',
        title: 'User Email',
      });

      // Insert test data
      await insertTestSubmissions(testForm, field);

      const result = await service.deleteField(field.id, testUser.id, true);

      expect(result.backup_id).toBeDefined();
      expect(result.can_restore).toBe(true);

      // Check field was deleted
      const deletedField = await Field.findByPk(field.id);
      expect(deletedField).toBeNull();

      // Check column was dropped
      const columns = await service.getTableColumns(testForm.table_name);
      expect(columns).not.toContain('user_email');
    });

    it('should require confirmation before deleting', async () => {
      const field = await Field.create({
        form_id: testForm.id,
        type: 'text',
        title: 'Test',
      });

      await expect(
        service.deleteField(field.id, testUser.id, false)
      ).rejects.toThrow('CONFIRM_REQUIRED');
    });
  });

  describe('renameField', () => {
    it('should rename field and column', async () => {
      const field = await Field.create({
        form_id: testForm.id,
        type: 'text',
        title: 'Old Name',
      });

      const updated = await service.renameField(field.id, 'New Name', testUser.id);

      expect(updated.title).toBe('New Name');

      // Check column was renamed
      const columns = await service.getTableColumns(testForm.table_name);
      expect(columns).toContain('new_name');
      expect(columns).not.toContain('old_name');
    });

    it('should reject duplicate column names', async () => {
      await Field.create({
        form_id: testForm.id,
        type: 'text',
        title: 'Existing Field',
      });

      const field2 = await Field.create({
        form_id: testForm.id,
        type: 'text',
        title: 'Another Field',
      });

      await expect(
        service.renameField(field2.id, 'Existing Field', testUser.id)
      ).rejects.toThrow('DUPLICATE_COLUMN_NAME');
    });
  });

  describe('changeFieldType', () => {
    it('should change compatible field types', async () => {
      const field = await Field.create({
        form_id: testForm.id,
        type: 'short_answer',
        title: 'Age',
      });

      // Insert numeric text data
      await insertNumericTextData(testForm, field);

      const updated = await service.changeFieldType(field.id, 'number', testUser.id);

      expect(updated.type).toBe('number');

      // Check column type was changed
      const columns = await getColumnDataTypes(testForm.table_name);
      expect(columns.age).toBe('NUMERIC');
    });

    it('should reject incompatible data conversions', async () => {
      const field = await Field.create({
        form_id: testForm.id,
        type: 'short_answer',
        title: 'Comments',
      });

      // Insert non-numeric text data
      await insertTextData(testForm, field, ['Hello', 'World', 'Test']);

      await expect(
        service.changeFieldType(field.id, 'number', testUser.id)
      ).rejects.toThrow('TYPE_CONVERSION_FAILED');
    });
  });

  describe('rollbackMigration', () => {
    it('should rollback field deletion', async () => {
      const field = await Field.create({
        form_id: testForm.id,
        type: 'email',
        title: 'User Email',
      });

      const deleteResult = await service.deleteField(field.id, testUser.id, true);

      // Rollback
      const rollbackResult = await service.rollbackMigration(
        deleteResult.migration_id,
        testUser.id
      );

      expect(rollbackResult.migration_type).toBe('DELETE_FIELD');

      // Check field was restored
      const restoredField = await Field.findByPk(field.id);
      expect(restoredField).toBeDefined();
    });
  });
});
```

### 9.2 Integration Tests

**File:** `backend/tests/integration/field-migration.test.js`

```javascript
const request = require('supertest');
const app = require('../../api/app');
const { Form, Field, User } = require('../../models');

describe('Field Migration API Integration Tests', () => {
  let authToken;
  let testForm;
  let adminUser;

  beforeAll(async () => {
    // Create admin user and get auth token
    adminUser = await User.create({
      username: 'testadmin',
      email: 'admin@test.com',
      password: 'password',
      role: 'admin',
    });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testadmin', password: 'password' });

    authToken = loginResponse.body.token;

    // Create test form
    testForm = await Form.create({
      title: 'Integration Test Form',
      table_name: 'integration_test_form_123',
      created_by: adminUser.id,
    });
  });

  describe('POST /api/field-migrations/add-field', () => {
    it('should add field and return success', async () => {
      const response = await request(app)
        .post('/api/field-migrations/add-field')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          formId: testForm.id,
          fieldData: {
            type: 'email',
            title: 'User Email',
            required: true,
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.field).toBeDefined();
      expect(response.body.field.title).toBe('User Email');
    });

    it('should reject unauthorized users', async () => {
      const response = await request(app)
        .post('/api/field-migrations/add-field')
        .send({
          formId: testForm.id,
          fieldData: { type: 'text', title: 'Test' },
        });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/field-migrations/delete-field/:fieldId', () => {
    it('should delete field with confirmation', async () => {
      const field = await Field.create({
        form_id: testForm.id,
        type: 'text',
        title: 'Temporary Field',
      });

      const response = await request(app)
        .delete(`/api/field-migrations/delete-field/${field.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ confirmDataLoss: true });

      expect(response.status).toBe(200);
      expect(response.body.backup_id).toBeDefined();
    });

    it('should reject deletion without confirmation', async () => {
      const field = await Field.create({
        form_id: testForm.id,
        type: 'text',
        title: 'Test Field',
      });

      const response = await request(app)
        .delete(`/api/field-migrations/delete-field/${field.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ confirmDataLoss: false });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('confirm');
    });
  });

  describe('PUT /api/field-migrations/rename-field/:fieldId', () => {
    it('should rename field successfully', async () => {
      const field = await Field.create({
        form_id: testForm.id,
        type: 'text',
        title: 'Old Title',
      });

      const response = await request(app)
        .put(`/api/field-migrations/rename-field/${field.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ newTitle: 'New Title' });

      expect(response.status).toBe(200);
      expect(response.body.field.title).toBe('New Title');
    });
  });

  describe('GET /api/field-migrations/form/:formId', () => {
    it('should return migration history', async () => {
      const response = await request(app)
        .get(`/api/field-migrations/form/${testForm.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.migrations).toBeDefined();
      expect(Array.isArray(response.body.migrations)).toBe(true);
    });
  });
});
```

### 9.3 E2E Tests

**File:** `tests/e2e/field-migration.spec.js`

```javascript
const { test, expect } = require('@playwright/test');

test.describe('Field Migration E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('[name="username"]', 'admin');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/forms');
  });

  test('should add field to existing form', async ({ page }) => {
    // Navigate to form editor
    await page.goto('/forms/edit/test-form-id');

    // Click "Add Field" button
    await page.click('[data-testid="add-field-button"]');

    // Fill field details
    await page.selectOption('[name="fieldType"]', 'email');
    await page.fill('[name="fieldTitle"]', 'User Email');
    await page.check('[name="fieldRequired"]');

    // Save field
    await page.click('[data-testid="save-field-button"]');

    // Wait for success toast
    await expect(page.locator('.toast-success')).toContainText('Field added successfully');

    // Verify field appears in list
    await expect(page.locator('[data-field-title="User Email"]')).toBeVisible();
  });

  test('should delete field with confirmation', async ({ page }) => {
    await page.goto('/forms/edit/test-form-id');

    // Click delete button on field
    await page.click('[data-field-id="field-123"] [data-testid="delete-field-button"]');

    // Confirm deletion in dialog
    await expect(page.locator('.confirmation-dialog')).toBeVisible();
    await expect(page.locator('.confirmation-dialog')).toContainText('WARNING');

    await page.check('[name="confirmDataLoss"]');
    await page.click('[data-testid="confirm-delete-button"]');

    // Wait for success
    await expect(page.locator('.toast-success')).toContainText('Field deleted');

    // Verify field removed from list
    await expect(page.locator('[data-field-id="field-123"]')).not.toBeVisible();
  });

  test('should rename field and update column name', async ({ page }) => {
    await page.goto('/forms/edit/test-form-id');

    // Double-click field title to edit
    await page.dblclick('[data-field-id="field-456"] .field-title');

    // Edit title
    await page.fill('[data-field-id="field-456"] .field-title-input', 'New Field Name');
    await page.keyboard.press('Enter');

    // Wait for success
    await expect(page.locator('.toast-success')).toContainText('Field renamed successfully');

    // Verify new name displayed
    await expect(page.locator('[data-field-id="field-456"] .field-title')).toContainText('New Field Name');
  });

  test('should view migration history', async ({ page }) => {
    await page.goto('/forms/edit/test-form-id/migrations');

    // Verify migration history page loads
    await expect(page.locator('h2')).toContainText('Field Migration History');

    // Verify migration entries displayed
    await expect(page.locator('.migration-entry')).toHaveCount(3);

    // Expand rollback instructions
    await page.click('.migration-entry:first-child summary');
    await expect(page.locator('.migration-entry:first-child pre')).toContainText('ALTER TABLE');
  });

  test('should rollback field deletion', async ({ page }) => {
    await page.goto('/forms/edit/test-form-id/migrations');

    // Find recent DELETE_FIELD migration
    const migrationEntry = page.locator('.migration-entry:has-text("DELETE_FIELD")').first();

    // Click rollback button
    await migrationEntry.locator('[data-testid="rollback-button"]').click();

    // Confirm rollback
    await page.click('[data-testid="confirm-rollback-button"]');

    // Wait for success
    await expect(page.locator('.toast-success')).toContainText('Migration rolled back successfully');

    // Verify field restored in form
    await page.goto('/forms/edit/test-form-id');
    await expect(page.locator('[data-field-title="Restored Field"]')).toBeVisible();
  });
});
```

---

## 10. Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Create database migrations (`field_migrations`, `field_data_backups`)
- [ ] Run migrations on development environment
- [ ] Create Sequelize models for new tables
- [ ] Write unit tests for model associations

### Phase 2: Service Layer (Week 2-3)
- [ ] Implement `FieldMigrationService.addField()`
- [ ] Implement `FieldMigrationService.deleteField()` with backup
- [ ] Implement `FieldMigrationService.renameField()`
- [ ] Implement `FieldMigrationService.changeFieldType()` with validation
- [ ] Implement `FieldMigrationService.reorderFields()`
- [ ] Implement `FieldMigrationService.rollbackMigration()`
- [ ] Write unit tests for each method (80% coverage target)

### Phase 3: API Layer (Week 4)
- [ ] Create `/api/field-migrations` routes
- [ ] Add authentication and authorization middleware
- [ ] Implement POST `/add-field` endpoint
- [ ] Implement DELETE `/delete-field/:id` endpoint
- [ ] Implement PUT `/rename-field/:id` endpoint
- [ ] Implement PUT `/change-type/:id` endpoint
- [ ] Implement GET `/form/:formId` (migration history) endpoint
- [ ] Implement POST `/rollback/:migrationId` endpoint
- [ ] Write integration tests for all endpoints

### Phase 4: Frontend UI (Week 5)
- [ ] Create `FieldMigrationManager.jsx` component
- [ ] Update `EnhancedFormBuilder.jsx` with migration warnings
- [ ] Add confirmation dialogs for destructive operations
- [ ] Display migration history in form editor
- [ ] Add rollback UI for admins
- [ ] Write E2E tests for field management workflows

### Phase 5: Migration Scripts (Week 6)
- [ ] Create `sync-existing-dynamic-tables.js` script
- [ ] Create `cleanup-orphaned-columns.js` script
- [ ] Test scripts on development data
- [ ] Document script usage in README

### Phase 6: Testing & QA (Week 7)
- [ ] Run full unit test suite (target: 80% coverage)
- [ ] Run integration test suite
- [ ] Run E2E test suite
- [ ] Manual testing of all migration types
- [ ] Performance testing with large forms (1000+ submissions)
- [ ] Security audit of migration permissions

### Phase 7: Deployment (Week 8)
- [ ] Run `sync-existing-dynamic-tables.js` on staging
- [ ] Verify all existing forms synchronized
- [ ] Deploy to production
- [ ] Monitor migration logs for errors
- [ ] Train admin users on new features
- [ ] Document rollback procedures for emergencies

---

## Appendix A: Migration Type Reference

| Migration Type | Description | Schema Change | Data Loss Risk | Rollback |
|----------------|-------------|---------------|----------------|----------|
| `ADD_FIELD` | Add new field to form | ALTER TABLE ADD COLUMN | None | Easy (drop column) |
| `DELETE_FIELD` | Remove field from form | ALTER TABLE DROP COLUMN | High (backed up) | Medium (restore backup) |
| `RENAME_FIELD` | Change field title | ALTER TABLE RENAME COLUMN | None | Easy (rename back) |
| `CHANGE_TYPE` | Change field data type | ALTER TABLE ALTER COLUMN | Medium (validated) | Medium (restore backup) |
| `REORDER_FIELDS` | Change field display order | No schema change | None | Easy (reorder back) |

---

## Appendix B: PostgreSQL Data Type Mapping

| Field Type | PostgreSQL Type | Notes |
|------------|----------------|-------|
| short_answer | VARCHAR(255) | Max 255 chars |
| paragraph | TEXT | Unlimited length |
| email | VARCHAR(255) | With validation |
| phone | VARCHAR(20) | Thai phone format (10 digits) |
| number | NUMERIC | Arbitrary precision |
| url | VARCHAR(500) | Max 500 chars |
| date | DATE | Date only (no time) |
| time | TIME | Time only (no date) |
| datetime | TIMESTAMP | Date + time |
| multiple_choice | VARCHAR(255) | Single selection |
| rating | INTEGER | 1-5 or 1-10 scale |
| slider | INTEGER | Min-max range |
| lat_long | POINT | PostgreSQL geometry type |
| province | VARCHAR(100) | Thai province names |
| factory | VARCHAR(255) | Factory/location reference |
| file_upload | TEXT | File path or MinIO URL |
| image_upload | TEXT | Image path or MinIO URL |

---

## Appendix C: Error Codes

| Error Code | Description | HTTP Status | User Action |
|------------|-------------|-------------|-------------|
| `CONFIRM_REQUIRED` | User must confirm data loss | 400 | Set `confirmDataLoss=true` |
| `DUPLICATE_COLUMN_NAME` | Column name already exists | 400 | Choose different field name |
| `TYPE_CONVERSION_FAILED` | Data incompatible with new type | 400 | Fix incompatible data first |
| `FORM_NOT_FOUND` | Form or dynamic table not found | 404 | Check form ID |
| `FIELD_NOT_FOUND` | Field not found | 404 | Check field ID |
| `MIGRATION_NOT_FOUND` | Migration record not found | 404 | Check migration ID |
| `CANNOT_ROLLBACK` | Migration cannot be rolled back | 400 | Manual intervention required |
| `BACKUP_NOT_FOUND` | Data backup not found or expired | 404 | Backup expired (90 days) |

---

## Appendix D: Best Practices

### For Developers
1. **Always use FieldMigrationService** - Never manually alter dynamic tables
2. **Test type conversions** - Run dry-run validation before changing types
3. **Document migrations** - Add clear comments in migration logs
4. **Monitor backup storage** - Clean up expired backups (90 days)

### For Admins
1. **Confirm before deleting** - Field deletion is irreversible after 90 days
2. **Rename instead of delete+add** - Preserves historical data
3. **Check migration history** - Review logs before making changes
4. **Test on staging first** - Never test migrations on production

### For System Administrators
1. **Regular backups** - Backup `field_migrations` and `field_data_backups` tables
2. **Monitor disk usage** - Backups can consume significant space
3. **Cleanup expired backups** - Run cleanup script monthly
4. **Audit permissions** - Only admins should rollback migrations

---

## Document Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-10-07 | DB Architecture Team | Initial specification |

---

**END OF SPECIFICATION**
