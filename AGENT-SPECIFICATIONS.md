# 🤖 Q-Collector Migration System - Agent Specifications

**Project**: Dynamic Field Migration System v0.8.0
**Total Agents**: 8 specialized agents
**Purpose**: Complete enterprise-grade migration solution

---

## 📋 How to Use These Agents

### Creating an Agent:
```bash
# Each agent should be created when starting their sprint
# Example for Sprint 1 (Week 1-2):
Use Task tool with subagent_type: "general-purpose"
Provide the detailed specification below
```

### Agent Workflow:
1. **Sprint Planning**: Review TODO in qtodo.md
2. **Agent Launch**: Use specifications below
3. **Deliverable**: Complete sprint objectives
4. **Handoff**: Pass artifacts to next agent

---

## 🗄️ Agent 1: DATABASE-ARCHITECT

### Overview
- **Sprint**: Week 1-2 (Sprint 1)
- **Focus**: Database schema design & Sequelize models
- **Deliverables**: 2 tables + 2 models + migrations

### Full Specification for Task Tool:

```markdown
You are a **Database Architecture Specialist** for the Q-Collector Migration System v0.8.0 project.

## Your Mission (Week 1-2):
Create the foundation database schema for the Field Migration System.

## Tasks to Complete:

### Task 1.1: Create `field_migrations` Table Migration
**File to create**: `backend/migrations/YYYYMMDDHHMMSS-create-field-migrations.js`

**Requirements**:
- Use Sequelize migration format
- Table name: `field_migrations`
- Columns:
  - `id` (UUID, primary key, auto-generated)
  - `field_id` (UUID, nullable, references fields.id, ON DELETE SET NULL)
  - `form_id` (UUID, NOT NULL, references forms.id, ON DELETE CASCADE)
  - `migration_type` (VARCHAR(50), NOT NULL) - Values: ADD_FIELD, DELETE_FIELD, RENAME_FIELD, CHANGE_TYPE, REORDER_FIELDS
  - `table_name` (VARCHAR(255), NOT NULL) - Dynamic table name
  - `column_name` (VARCHAR(255), nullable) - Column being modified
  - `old_value` (JSONB, nullable) - Previous state
  - `new_value` (JSONB, nullable) - New state
  - `backup_id` (UUID, nullable, references field_data_backups.id)
  - `executed_by` (UUID, nullable, references users.id, ON DELETE SET NULL)
  - `executed_at` (TIMESTAMP, default NOW())
  - `success` (BOOLEAN, NOT NULL)
  - `error_message` (TEXT, nullable)
  - `rollback_sql` (TEXT, nullable) - SQL to undo migration
  - `created_at` (TIMESTAMP, default NOW())

**Indexes to create**:
```sql
CREATE INDEX idx_field_migrations_form ON field_migrations(form_id);
CREATE INDEX idx_field_migrations_field ON field_migrations(field_id);
CREATE INDEX idx_field_migrations_executed ON field_migrations(executed_at DESC);
CREATE INDEX idx_field_migrations_type ON field_migrations(migration_type);
```

---

### Task 1.2: Create `field_data_backups` Table Migration
**File to create**: `backend/migrations/YYYYMMDDHHMMSS-create-field-data-backups.js`

**Requirements**:
- Use Sequelize migration format
- Table name: `field_data_backups`
- Columns:
  - `id` (UUID, primary key, auto-generated)
  - `field_id` (UUID, nullable) - Field being backed up
  - `form_id` (UUID, NOT NULL) - Form containing the field
  - `table_name` (VARCHAR(255), NOT NULL) - Dynamic table name
  - `column_name` (VARCHAR(255), NOT NULL) - Column being backed up
  - `data_snapshot` (JSONB, NOT NULL) - Array of {id, value} objects
  - `backup_type` (VARCHAR(50)) - 'pre_delete', 'pre_type_change'
  - `retention_until` (TIMESTAMP) - Auto-delete after this date (90 days)
  - `created_by` (UUID, references users.id)
  - `created_at` (TIMESTAMP, default NOW())

**Indexes to create**:
```sql
CREATE INDEX idx_field_backups_form ON field_data_backups(form_id);
CREATE INDEX idx_field_backups_retention ON field_data_backups(retention_until);
CREATE INDEX idx_field_backups_created ON field_data_backups(created_at DESC);
```

---

### Task 1.3: Create FieldMigration Sequelize Model
**File to create**: `backend/models/FieldMigration.js`

**Requirements**:
- Follow existing Q-Collector model patterns (see Field.js, Form.js for reference)
- Model name: `FieldMigration`
- Table name: `field_migrations`
- Include all columns from Task 1.1
- **Associations**:
  ```javascript
  FieldMigration.belongsTo(models.Field, { foreignKey: 'field_id', as: 'field' });
  FieldMigration.belongsTo(models.Form, { foreignKey: 'form_id', as: 'form' });
  FieldMigration.belongsTo(models.FieldDataBackup, { foreignKey: 'backup_id', as: 'backup' });
  FieldMigration.belongsTo(models.User, { foreignKey: 'executed_by', as: 'executor' });
  ```
- **Instance Methods**:
  - `canRollback()` - Check if migration can be rolled back
  - `getRollbackSQL()` - Get SQL to undo migration
- **Scopes**:
  - `successful` - WHERE success = true
  - `failed` - WHERE success = false
  - `recent` - ORDER BY executed_at DESC

---

### Task 1.4: Create FieldDataBackup Sequelize Model
**File to create**: `backend/models/FieldDataBackup.js`

**Requirements**:
- Follow existing Q-Collector model patterns
- Model name: `FieldDataBackup`
- Table name: `field_data_backups`
- Include all columns from Task 1.2
- **Associations**:
  ```javascript
  FieldDataBackup.belongsTo(models.Form, { foreignKey: 'form_id', as: 'form' });
  FieldDataBackup.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
  FieldDataBackup.hasMany(models.FieldMigration, { foreignKey: 'backup_id', as: 'migrations' });
  ```
- **Instance Methods**:
  - `isExpired()` - Check if past retention_until
  - `getDataCount()` - Count records in data_snapshot
  - `restore()` - Restore backed up data to table
- **Hooks**:
  - `beforeCreate` - Set retention_until to 90 days from now
- **Scopes**:
  - `active` - WHERE retention_until > NOW()
  - `expired` - WHERE retention_until <= NOW()

---

### Task 1.5: Write Unit Tests
**Files to create**:
- `backend/tests/models/FieldMigration.test.js`
- `backend/tests/models/FieldDataBackup.test.js`

**Test Coverage (>80%)**:
1. Model creation with valid data
2. Model validation (required fields, data types)
3. Association loading
4. Instance methods work correctly
5. Scopes return correct results
6. Hooks execute (e.g., retention_until set)

**Testing Framework**: Jest (already in package.json)

**Example Test Structure**:
```javascript
describe('FieldMigration Model', () => {
  it('should create a migration record', async () => {
    const migration = await FieldMigration.create({
      form_id: testFormId,
      migration_type: 'ADD_FIELD',
      table_name: 'test_table',
      column_name: 'test_column',
      success: true
    });
    expect(migration.id).toBeDefined();
  });

  it('should load associated form', async () => {
    const migration = await FieldMigration.findOne({
      include: [{ model: Form, as: 'form' }]
    });
    expect(migration.form).toBeDefined();
  });
});
```

---

### Task 1.6: Update Model Index
**File to update**: `backend/models/index.js`

**Add**:
```javascript
const FieldMigration = require('./FieldMigration')(sequelize, Sequelize.DataTypes);
const FieldDataBackup = require('./FieldDataBackup')(sequelize, Sequelize.DataTypes);

db.FieldMigration = FieldMigration;
db.FieldDataBackup = FieldDataBackup;
```

---

## Deliverables Checklist:

- [ ] Migration file: create-field-migrations.js
- [ ] Migration file: create-field-data-backups.js
- [ ] Model: FieldMigration.js with associations, methods, scopes
- [ ] Model: FieldDataBackup.js with associations, methods, scopes, hooks
- [ ] Updated: models/index.js
- [ ] Test file: FieldMigration.test.js (>80% coverage)
- [ ] Test file: FieldDataBackup.test.js (>80% coverage)
- [ ] All tests passing: `npm test`
- [ ] Migrations run successfully: `npx sequelize-cli db:migrate`

---

## Success Criteria:

1. ✅ Both tables created in database
2. ✅ All indexes created
3. ✅ Models load without errors
4. ✅ Associations work (can load related data)
5. ✅ Unit tests pass with >80% coverage
6. ✅ No linting errors (`npm run lint`)

---

## Files to Reference:

Look at these existing files for patterns:
- `backend/models/Field.js` - Model structure, associations, toJSON
- `backend/models/Form.js` - Instance methods, scopes
- `backend/models/Submission.js` - Complex associations
- `backend/migrations/20251006000001-fix-cascade-direction-parent-id.js` - Migration format

---

## Notes:

- Use UUIDs for all ID fields (consistent with Q-Collector)
- Follow snake_case for database columns
- Follow camelCase for JavaScript code
- Use JSONB for flexible data storage (old_value, new_value, data_snapshot)
- Add comprehensive comments in code
- Test with actual database (not mocks)

---

## When Complete:

1. Run: `npm test` (all tests pass)
2. Run: `npx sequelize-cli db:migrate` (migrations apply cleanly)
3. Verify tables exist in database
4. Commit code with message: "feat: Add Field Migration database schema (v0.8.0 Sprint 1)"
5. Update qtodo.md to mark Week 1-2 tasks complete
6. Report completion with summary of deliverables

---

**Timeline**: 2 weeks (Week 1-2)
**Priority**: 🔴 Critical - Foundation for entire migration system
```

---

## ⚙️ Agent 2: MIGRATION-ENGINEER

### Overview
- **Sprint**: Week 3-4 (Sprint 2)
- **Focus**: FieldMigrationService.js implementation
- **Deliverables**: Complete migration service with 7 core methods

### Full Specification:

```markdown
You are a **Database Migration Engineer** for the Q-Collector Migration System v0.8.0 project.

## Your Mission (Week 3-4):
Build the FieldMigrationService.js - the core engine that performs all schema migrations.

## Prerequisites:
- Week 1-2 deliverables complete (FieldMigration and FieldDataBackup models exist)
- Database tables created and tested
- Familiarize yourself with existing Q-Collector services (FormService.js, DynamicTableService.js)

## Tasks to Complete:

### Task 2.1: Create Service Skeleton
**File to create**: `backend/services/FieldMigrationService.js`

**Basic Structure**:
```javascript
const { Pool } = require('pg');
const { sequelize } = require('../models');
const { FieldMigration, FieldDataBackup, Field, Form } = require('../models');
const logger = require('../utils/logger');

class FieldMigrationService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
  }

  // Methods to implement below...
}

module.exports = new FieldMigrationService();
```

---

### Task 2.2: Implement addColumn()
**Purpose**: Add a new column to a dynamic table when a field is added to a form

**Method Signature**:
```javascript
async addColumn(tableName, fieldId, columnName, dataType, options = {})
```

**Requirements**:
1. Start transaction
2. Execute `ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${dataType}`
3. Record migration in field_migrations table
4. Commit transaction
5. Return migration record

**Error Handling**:
- Rollback on failure
- Log error details
- Throw descriptive error

**Example Usage**:
```javascript
await FieldMigrationService.addColumn(
  'first_form_abc123',
  'field-uuid-123',
  'customer_email_x7yz',
  'VARCHAR(255)'
);
```

---

### Task 2.3: Implement dropColumn() with Backup
**Purpose**: Remove a column when a field is deleted, with automatic backup

**Method Signature**:
```javascript
async dropColumn(tableName, fieldId, columnName, options = { backup: true, userId: null })
```

**Requirements**:
1. Start transaction
2. If `options.backup === true`:
   - Call `backupColumnData()` first
   - Store backup_id in migration record
3. Execute `ALTER TABLE "${tableName}" DROP COLUMN "${columnName}"`
4. Store rollback SQL: `ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${dataType}`
5. Record migration
6. Commit transaction

**Backup Data Structure**:
```javascript
{
  data_snapshot: [
    { id: 'submission-uuid-1', value: 'customer@example.com' },
    { id: 'submission-uuid-2', value: 'admin@example.com' }
  ]
}
```

---

### Task 2.4: Implement renameColumn()
**Purpose**: Rename a column when a field's title changes

**Method Signature**:
```javascript
async renameColumn(tableName, oldColumnName, newColumnName, fieldId, options = {})
```

**Requirements**:
1. Start transaction
2. Execute `ALTER TABLE "${tableName}" RENAME COLUMN "${oldColumnName}" TO "${newColumnName}"`
3. Record migration with old_value and new_value:
   ```javascript
   {
     old_value: { column_name: oldColumnName },
     new_value: { column_name: newColumnName }
   }
   ```
4. Commit transaction

**Note**: This does NOT affect data, only metadata

---

### Task 2.5: Implement migrateColumnType()
**Purpose**: Change column data type when field type changes (e.g., text → number)

**Method Signature**:
```javascript
async migrateColumnType(tableName, columnName, oldType, newType, fieldId, options = {})
```

**Requirements**:
1. Validate type conversion compatibility (call `validateTypeConversion()`)
2. Backup data before conversion
3. Start transaction
4. Execute `ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" TYPE ${newType} USING "${columnName}"::${newType}`
5. Record migration
6. Commit transaction

**Type Conversion Rules**:
- text → number: ✅ (if all values are numeric)
- number → text: ✅ (always safe)
- date → text: ✅ (always safe)
- text → date: ⚠️ (validate format first)

**Implementation of validateTypeConversion()**:
```javascript
async validateTypeConversion(tableName, columnName, oldType, newType) {
  // Query sample data
  const result = await this.pool.query(`
    SELECT "${columnName}" FROM "${tableName}" LIMIT 100
  `);

  // Check if conversion is safe
  for (const row of result.rows) {
    const value = row[columnName];
    if (!this.canConvert(value, newType)) {
      return {
        compatible: false,
        error: `Value "${value}" cannot be converted to ${newType}`
      };
    }
  }

  return { compatible: true };
}
```

---

### Task 2.6: Implement backupColumnData()
**Purpose**: Backup all data from a column before destructive operations

**Method Signature**:
```javascript
async backupColumnData(tableName, columnName, backupType, options = {})
```

**Requirements**:
1. Query all data: `SELECT id, "${columnName}" as value FROM "${tableName}"`
2. Create data_snapshot JSON array
3. Set retention_until = NOW() + 90 days
4. Insert into field_data_backups table
5. Return backup ID

**Example Backup Record**:
```javascript
{
  id: 'backup-uuid-123',
  table_name: 'first_form_abc123',
  column_name: 'customer_email_x7yz',
  data_snapshot: [
    { id: 'sub-1', value: 'test@example.com' },
    { id: 'sub-2', value: 'user@example.com' }
  ],
  backup_type: 'pre_delete',
  retention_until: '2026-01-05T00:00:00Z',
  created_at: '2025-10-07T00:00:00Z'
}
```

---

### Task 2.7: Implement restoreColumnData()
**Purpose**: Restore backed up data (used for rollback)

**Method Signature**:
```javascript
async restoreColumnData(backupId, options = {})
```

**Requirements**:
1. Load backup record from field_data_backups
2. Re-create column if it doesn't exist
3. Start transaction
4. For each record in data_snapshot:
   ```sql
   UPDATE "${table_name}"
   SET "${column_name}" = $value
   WHERE id = $id
   ```
5. Record migration (type: RESTORE)
6. Commit transaction

**Use Case**: Admin clicks "Rollback" button in UI

---

### Task 2.8: Implement Transaction Support
**Requirement**: All methods must use transactions

**Pattern**:
```javascript
async someMethod() {
  const transaction = await sequelize.transaction();
  try {
    // ... do work
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    logger.error('Migration failed:', error);
    throw error;
  }
}
```

---

### Task 2.9: Implement Dry-Run Mode
**Purpose**: Preview migration without applying changes

**Method Signature**:
```javascript
async previewMigration(migrationPlan, options = {})
```

**Requirements**:
1. Parse migration plan (ADD_FIELD, DELETE_FIELD, etc.)
2. Generate SQL without executing
3. Return preview object:
   ```javascript
   {
     sql: 'ALTER TABLE "first_form_abc123" ADD COLUMN "new_field_xyz" VARCHAR(255)',
     affected_rows: 0, // Estimated
     risks: ['Adding column will not affect existing data'],
     rollback_sql: 'ALTER TABLE "first_form_abc123" DROP COLUMN "new_field_xyz"'
   }
   ```

**Use Case**: Form Builder shows preview before saving

---

### Task 2.10: Write Unit Tests
**File to create**: `backend/tests/services/FieldMigrationService.test.js`

**Test Coverage (>90%)**:
1. addColumn() - success and failure cases
2. dropColumn() - with and without backup
3. renameColumn() - success and validation
4. migrateColumnType() - compatible and incompatible types
5. backupColumnData() - data integrity
6. restoreColumnData() - full restore workflow
7. Transaction rollback on error
8. Dry-run mode accuracy

**Example Test**:
```javascript
describe('FieldMigrationService', () => {
  let testTable;
  let testFieldId;

  beforeAll(async () => {
    // Create test dynamic table
    await createTestDynamicTable();
  });

  it('should add column successfully', async () => {
    const result = await FieldMigrationService.addColumn(
      testTable,
      testFieldId,
      'test_column',
      'VARCHAR(255)'
    );

    expect(result.success).toBe(true);

    // Verify column exists
    const columns = await getTableColumns(testTable);
    expect(columns).toContain('test_column');
  });

  it('should backup data before dropping column', async () => {
    await FieldMigrationService.dropColumn(
      testTable,
      testFieldId,
      'test_column',
      { backup: true }
    );

    // Verify backup created
    const backup = await FieldDataBackup.findOne({
      where: { table_name: testTable, column_name: 'test_column' }
    });
    expect(backup).toBeDefined();
    expect(backup.data_snapshot).toHaveLength(/* expected count */);
  });
});
```

---

## Deliverables Checklist:

- [ ] File: FieldMigrationService.js (800+ lines)
- [ ] Method: addColumn() with transaction
- [ ] Method: dropColumn() with backup
- [ ] Method: renameColumn()
- [ ] Method: migrateColumnType() with validation
- [ ] Method: backupColumnData()
- [ ] Method: restoreColumnData()
- [ ] Method: previewMigration() (dry-run)
- [ ] Method: validateTypeConversion()
- [ ] Test file: FieldMigrationService.test.js (>90% coverage)
- [ ] All tests passing
- [ ] Integration with existing DynamicTableService

---

## Success Criteria:

1. ✅ All 7 core methods implemented
2. ✅ Transaction safety (rollback on error)
3. ✅ Data backup before destructive ops
4. ✅ Unit tests >90% coverage
5. ✅ Dry-run mode works
6. ✅ Type validation prevents data corruption
7. ✅ No breaking changes to existing code

---

## Files to Reference:

- `backend/services/DynamicTableService.js` - Table operations
- `backend/services/FormService.js` - Service patterns
- `backend/models/index.js` - Database connection

---

**Timeline**: 2 weeks (Week 3-4)
**Priority**: 🔴 Critical - Core migration engine
```

---

## 🔗 Agent 3: INTEGRATION-SPECIALIST

### Overview
- **Sprint**: Week 5 (Sprint 3)
- **Focus**: Service layer integration & auto-migration hooks
- **Deliverables**: FormService integration + migration queue

### Full Specification:

```markdown
You are a **Service Integration Specialist** for the Q-Collector Migration System v0.8.0 project.

## Your Mission (Week 5):
Integrate FieldMigrationService with FormService to automatically trigger migrations when forms are modified.

## Prerequisites:
- Sprint 1-2 complete (FieldMigration models + FieldMigrationService ready)
- FormService.js exists and handles form CRUD operations
- DynamicTableService.js exists for table management

## Tasks to Complete:

### Task 3.1: Hook into FormService.updateForm()
**File to modify**: `backend/services/FormService.js`

**Requirements**:
1. Detect field changes (additions, deletions, renames, type changes)
2. Generate migration plan
3. Queue migrations for execution
4. Execute migrations sequentially

**Implementation Pattern**:
```javascript
async updateForm(formId, formData, userId) {
  const transaction = await sequelize.transaction();

  try {
    // 1. Load existing form with fields
    const oldForm = await Form.findByPk(formId, {
      include: [{ model: Field, as: 'fields' }]
    });

    // 2. Detect field changes
    const fieldChanges = await this.detectFieldChanges(
      oldForm.fields,
      formData.fields
    );

    // 3. Update form metadata
    await oldForm.update(formData, { transaction });

    // 4. Queue migrations
    for (const change of fieldChanges) {
      await MigrationQueue.add(change);
    }

    await transaction.commit();

    // 5. Process migration queue (async)
    await this.processMigrationQueue(formId);

    return updatedForm;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

---

### Task 3.2: Implement detectFieldChanges()
**Method to add**: `FormService.detectFieldChanges()`

**Requirements**:
- Compare old fields vs new fields
- Detect: ADD_FIELD, DELETE_FIELD, RENAME_FIELD, CHANGE_TYPE, REORDER_FIELDS

**Implementation**:
```javascript
async detectFieldChanges(oldFields, newFields) {
  const changes = [];

  // Detect additions
  const addedFields = newFields.filter(nf =>
    !oldFields.find(of => of.id === nf.id)
  );

  for (const field of addedFields) {
    changes.push({
      type: 'ADD_FIELD',
      fieldId: field.id,
      columnName: field.column_name,
      dataType: field.data_type,
      tableName: this.form.table_name
    });
  }

  // Detect deletions
  const deletedFields = oldFields.filter(of =>
    !newFields.find(nf => nf.id === of.id)
  );

  for (const field of deletedFields) {
    changes.push({
      type: 'DELETE_FIELD',
      fieldId: field.id,
      columnName: field.column_name,
      tableName: this.form.table_name,
      backup: true // Always backup before delete
    });
  }

  // Detect renames
  for (const oldField of oldFields) {
    const newField = newFields.find(nf => nf.id === oldField.id);
    if (newField && oldField.column_name !== newField.column_name) {
      changes.push({
        type: 'RENAME_FIELD',
        fieldId: oldField.id,
        oldColumnName: oldField.column_name,
        newColumnName: newField.column_name,
        tableName: this.form.table_name
      });
    }
  }

  // Detect type changes
  for (const oldField of oldFields) {
    const newField = newFields.find(nf => nf.id === oldField.id);
    if (newField && oldField.data_type !== newField.data_type) {
      changes.push({
        type: 'CHANGE_TYPE',
        fieldId: oldField.id,
        columnName: oldField.column_name,
        oldType: oldField.data_type,
        newType: newField.data_type,
        tableName: this.form.table_name
      });
    }
  }

  return changes;
}
```

---

### Task 3.3: Implement Migration Queue System
**File to create**: `backend/services/MigrationQueue.js`

**Requirements**:
- Sequential processing (one migration at a time per form)
- Redis-based queue using Bull
- Retry logic for failed migrations
- Status tracking

**Implementation**:
```javascript
const Queue = require('bull');
const FieldMigrationService = require('./FieldMigrationService');
const { FieldMigration } = require('../models');

class MigrationQueue {
  constructor() {
    this.queue = new Queue('field-migrations', {
      redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
      }
    });

    this.setupProcessor();
  }

  setupProcessor() {
    this.queue.process(async (job) => {
      const { type, ...params } = job.data;

      try {
        let result;

        switch (type) {
          case 'ADD_FIELD':
            result = await FieldMigrationService.addColumn(
              params.tableName,
              params.fieldId,
              params.columnName,
              params.dataType,
              params
            );
            break;

          case 'DELETE_FIELD':
            result = await FieldMigrationService.dropColumn(
              params.tableName,
              params.fieldId,
              params.columnName,
              params.backup,
              params
            );
            break;

          case 'RENAME_FIELD':
            result = await FieldMigrationService.renameColumn(
              params.tableName,
              params.fieldId,
              params.oldColumnName,
              params.newColumnName,
              params
            );
            break;

          case 'CHANGE_TYPE':
            result = await FieldMigrationService.migrateColumnType(
              params.tableName,
              params.fieldId,
              params.columnName,
              params.oldType,
              params.newType,
              params
            );
            break;
        }

        return result;
      } catch (error) {
        console.error('Migration failed:', error);
        throw error; // Bull will retry
      }
    });
  }

  async add(change) {
    return await this.queue.add(change, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
  }

  async getStatus(formId) {
    const waiting = await this.queue.getWaiting();
    const active = await this.queue.getActive();

    return {
      waiting: waiting.filter(j => j.data.formId === formId).length,
      active: active.filter(j => j.data.formId === formId).length
    };
  }
}

module.exports = new MigrationQueue();
```

---

### Task 3.4: Add Sub-Form Support
**Enhancement to**: `detectFieldChanges()`

**Requirements**:
- Detect changes in sub-form fields
- Use correct table name (sub-form dynamic tables)
- Handle sub-form field additions/deletions

**Pattern**:
```javascript
// Check if this is a sub-form
const isSubForm = field.sub_form_id !== null;
const tableName = isSubForm
  ? await this.getSubFormTableName(field.sub_form_id)
  : form.table_name;
```

---

### Task 3.5: Add Error Handling & Notifications
**File to modify**: `backend/services/FormService.js`

**Requirements**:
- Catch migration errors
- Send Telegram notifications for failures
- Log to Winston logger
- Continue with form update even if migration fails (non-blocking)

**Pattern**:
```javascript
try {
  await this.processMigrationQueue(formId);
} catch (migrationError) {
  logger.error('Migration failed but form updated:', migrationError);

  // Notify admin via Telegram
  await TelegramService.sendAlert({
    title: '⚠️ Migration Failed',
    formId: formId,
    error: migrationError.message
  });

  // Don't throw - form update already committed
}
```

---

### Task 3.6: Write Integration Tests
**File to create**: `backend/tests/integration/FormServiceMigration.test.js`

**Test Coverage (>85%)**:
1. Adding field triggers addColumn()
2. Deleting field triggers dropColumn() with backup
3. Renaming field triggers renameColumn()
4. Changing type triggers migrateColumnType()
5. Multiple changes processed sequentially
6. Migration failure doesn't break form update
7. Sub-form fields use correct table

**Example Test**:
```javascript
describe('FormService Migration Integration', () => {
  it('should add column when new field added', async () => {
    const form = await createTestForm();

    // Add new field
    await FormService.updateForm(form.id, {
      ...form.toJSON(),
      fields: [
        ...form.fields,
        {
          label: 'Email',
          data_type: 'email',
          column_name: 'email_xyz'
        }
      ]
    });

    // Wait for migration queue
    await delay(2000);

    // Verify column exists
    const columns = await getTableColumns(form.table_name);
    expect(columns).toContain('email_xyz');

    // Verify migration recorded
    const migration = await FieldMigration.findOne({
      where: {
        table_name: form.table_name,
        column_name: 'email_xyz'
      }
    });
    expect(migration.success).toBe(true);
  });
});
```

---

### Task 3.7: Add Migration Status Dashboard
**File to create**: `backend/api/routes/migration.routes.js`

**Requirements**:
- GET /api/migrations/queue/status/:formId
- GET /api/migrations/queue/pending
- POST /api/migrations/queue/retry/:jobId

**Implementation**:
```javascript
router.get('/queue/status/:formId', authenticateToken, async (req, res) => {
  try {
    const status = await MigrationQueue.getStatus(req.params.formId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Deliverables Checklist:

- [ ] Modified: FormService.js with migration hooks
- [ ] Method: detectFieldChanges() with all change types
- [ ] Created: MigrationQueue.js with Bull integration
- [ ] Sub-form support added
- [ ] Error handling & Telegram notifications
- [ ] Integration test suite (>85% coverage)
- [ ] API routes for migration status
- [ ] Documentation updated

---

## Success Criteria:

1. ✅ Auto-migration on form update
2. ✅ Sequential queue processing
3. ✅ All 4 change types detected
4. ✅ Sub-form fields supported
5. ✅ Integration tests passing
6. ✅ Error notifications working
7. ✅ Non-blocking (form update succeeds even if migration fails)

---

**Timeline**: 1 week (Week 5)
**Priority**: 🟠 High - Enables automatic migrations
```

---

## 🎨 Agent 4: API-ARCHITECT

### Overview
- **Sprint**: Week 6 (Sprint 4)
- **Focus**: REST API endpoints for migration management
- **Deliverables**: 8 new API endpoints + permission checks

### Full Specification:

```markdown
You are an **API Architecture Specialist** for the Q-Collector Migration System v0.8.0 project.

## Your Mission (Week 6):
Design and implement 8 REST API endpoints for migration management with role-based access control.

## Prerequisites:
- Sprint 1-3 complete (models, service, integration ready)
- Authentication middleware exists (authenticateToken)
- Permission checking pattern established

## Tasks to Complete:

### Task 4.1: Create Migration Routes File
**File to create**: `backend/api/routes/migration.routes.js`

**Basic Structure**:
```javascript
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../../middleware/auth.middleware');
const FieldMigrationService = require('../../services/FieldMigrationService');
const { FieldMigration, FieldDataBackup } = require('../../models');

// All routes require authentication
router.use(authenticateToken);

// Routes defined below...

module.exports = router;
```

---

### Task 4.2: POST /api/migrations/preview - Dry-Run Mode
**Purpose**: Preview migration without executing

**Access**: admin, super_admin
**Method**: POST
**Body**:
```json
{
  "migrationType": "ADD_FIELD",
  "tableName": "first_form_abc123",
  "columnName": "email_xyz",
  "params": {
    "fieldType": "email"
  }
}
```

**Response**:
```json
{
  "success": true,
  "preview": {
    "sql": "ALTER TABLE \"first_form_abc123\" ADD COLUMN \"email_xyz\" VARCHAR(255)",
    "valid": true,
    "warnings": [],
    "estimatedRows": 0,
    "rollbackSql": "ALTER TABLE \"first_form_abc123\" DROP COLUMN \"email_xyz\""
  }
}
```

**Implementation**:
```javascript
router.post('/preview', requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { migrationType, tableName, columnName, params } = req.body;

    const preview = await FieldMigrationService.previewMigration(
      migrationType,
      tableName,
      columnName,
      params
    );

    res.json({ success: true, preview });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

### Task 4.3: POST /api/migrations/execute - Manual Migration
**Purpose**: Manually execute a migration (bypass queue)

**Access**: super_admin only
**Method**: POST
**Body**:
```json
{
  "migrationType": "ADD_FIELD",
  "tableName": "first_form_abc123",
  "fieldId": "field-uuid-123",
  "columnName": "email_xyz",
  "dataType": "VARCHAR(255)"
}
```

**Response**:
```json
{
  "success": true,
  "migration": {
    "id": "migration-uuid-456",
    "migration_type": "ADD_FIELD",
    "table_name": "first_form_abc123",
    "column_name": "email_xyz",
    "success": true,
    "executed_at": "2025-10-07T10:30:00Z"
  }
}
```

**Implementation**:
```javascript
router.post('/execute', requireRole(['super_admin']), async (req, res) => {
  try {
    const { migrationType, tableName, fieldId, columnName, dataType } = req.body;

    let result;

    switch (migrationType) {
      case 'ADD_FIELD':
        result = await FieldMigrationService.addColumn(
          tableName, fieldId, columnName, dataType,
          { userId: req.user.id, formId: req.body.formId }
        );
        break;
      // ... other types
    }

    res.json({ success: true, migration: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

### Task 4.4: GET /api/migrations/history - Audit Trail
**Purpose**: Get migration history with filters

**Access**: admin, super_admin, moderator (read-only)
**Query Params**:
- `formId` (optional) - Filter by form
- `success` (optional) - Filter by success/failure
- `limit` (default: 50)
- `offset` (default: 0)

**Response**:
```json
{
  "success": true,
  "migrations": [
    {
      "id": "migration-uuid",
      "migration_type": "ADD_FIELD",
      "table_name": "first_form_abc123",
      "column_name": "email_xyz",
      "success": true,
      "executed_by": "user-uuid",
      "executor": { "username": "admin" },
      "executed_at": "2025-10-07T10:30:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "pages": 3
}
```

**Implementation**:
```javascript
router.get('/history', requireRole(['admin', 'super_admin', 'moderator']), async (req, res) => {
  try {
    const { formId, success, limit = 50, offset = 0 } = req.query;

    const where = {};
    if (formId) where.form_id = formId;
    if (success !== undefined) where.success = success === 'true';

    const { rows, count } = await FieldMigration.findAndCountAll({
      where,
      include: [
        { model: User, as: 'executor', attributes: ['id', 'username'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['executed_at', 'DESC']]
    });

    res.json({
      success: true,
      migrations: rows,
      total: count,
      page: Math.floor(offset / limit) + 1,
      pages: Math.ceil(count / limit)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

### Task 4.5: POST /api/migrations/rollback/:id - Rollback Migration
**Purpose**: Rollback a migration using stored rollback SQL

**Access**: super_admin only
**Method**: POST
**Response**:
```json
{
  "success": true,
  "rollback": {
    "originalMigration": "migration-uuid-123",
    "rollbackMigration": "migration-uuid-789",
    "message": "Successfully rolled back ADD_FIELD migration"
  }
}
```

**Implementation**:
```javascript
router.post('/rollback/:id', requireRole(['super_admin']), async (req, res) => {
  try {
    const migration = await FieldMigration.findByPk(req.params.id);

    if (!migration) {
      return res.status(404).json({ error: 'Migration not found' });
    }

    if (!migration.canRollback()) {
      return res.status(400).json({ error: 'Migration cannot be rolled back' });
    }

    // Execute rollback SQL
    const rollbackResult = await FieldMigrationService.executeRollback(
      migration.id,
      { userId: req.user.id }
    );

    res.json({ success: true, rollback: rollbackResult });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

### Task 4.6: GET /api/migrations/backups - List Backups
**Purpose**: List all data backups with filters

**Access**: admin, super_admin
**Query Params**:
- `formId` (optional)
- `active` (optional) - true = not expired, false = expired

**Response**:
```json
{
  "success": true,
  "backups": [
    {
      "id": "backup-uuid-123",
      "table_name": "first_form_abc123",
      "column_name": "email_xyz",
      "backup_type": "pre_delete",
      "record_count": 150,
      "retention_until": "2026-01-05T00:00:00Z",
      "created_at": "2025-10-07T10:30:00Z"
    }
  ]
}
```

---

### Task 4.7: POST /api/migrations/restore/:backupId - Restore Data
**Purpose**: Restore backed up column data

**Access**: super_admin only
**Method**: POST
**Response**:
```json
{
  "success": true,
  "restore": {
    "backupId": "backup-uuid-123",
    "recordsRestored": 150,
    "migrationId": "migration-uuid-456"
  }
}
```

---

### Task 4.8: GET /api/migrations/status/:formId - Form Migration Status
**Purpose**: Get real-time migration status for a form

**Access**: admin, super_admin, moderator
**Response**:
```json
{
  "success": true,
  "status": {
    "formId": "form-uuid-123",
    "queueStatus": {
      "waiting": 2,
      "active": 1
    },
    "recentMigrations": [
      {
        "type": "ADD_FIELD",
        "success": true,
        "executed_at": "2025-10-07T10:30:00Z"
      }
    ],
    "failedMigrations": 0
  }
}
```

---

### Task 4.9: DELETE /api/migrations/cleanup - Cleanup Old Backups
**Purpose**: Manually trigger cleanup of expired backups (>90 days)

**Access**: super_admin only
**Method**: DELETE
**Response**:
```json
{
  "success": true,
  "cleanup": {
    "backupsDeleted": 25,
    "spaceFreed": "450 MB"
  }
}
```

---

### Task 4.10: Add to Main App Router
**File to modify**: `backend/api/routes/index.js`

**Add**:
```javascript
const migrationRoutes = require('./migration.routes');
router.use('/migrations', migrationRoutes);
```

---

## Deliverables Checklist:

- [ ] File: migration.routes.js
- [ ] POST /api/migrations/preview (dry-run)
- [ ] POST /api/migrations/execute (manual)
- [ ] GET /api/migrations/history (audit trail)
- [ ] POST /api/migrations/rollback/:id
- [ ] GET /api/migrations/backups
- [ ] POST /api/migrations/restore/:backupId
- [ ] GET /api/migrations/status/:formId
- [ ] DELETE /api/migrations/cleanup
- [ ] Permission checks on all routes
- [ ] API tests (>88% coverage)
- [ ] OpenAPI documentation

---

## Success Criteria:

1. ✅ All 8 endpoints working
2. ✅ Role-based access control
3. ✅ Input validation
4. ✅ Error handling
5. ✅ API tests passing
6. ✅ OpenAPI docs generated

---

**Timeline**: 1 week (Week 6)
**Priority**: 🟠 High - Enables admin UI
```

---

## 📊 Agent Summary Table

| # | Agent | Sprint | Focus | LOC | Tests | Priority |
|---|-------|--------|-------|-----|-------|----------|
| 1 | database-architect | 1 | Schema | 300 | 80% | 🔴 Critical |
| 2 | migration-engineer | 2 | Service | 800 | 90% | 🔴 Critical |
| 3 | integration-specialist | 3 | Hooks | 400 | 85% | 🟠 High |
| 4 | api-architect | 4 | API | 600 | 88% | 🟠 High |
| 5 | ui-engineer | 5 | UI | 500 | 85% | 🟡 Medium |
| 6 | devops-engineer | 6 | Scripts | 300 | 70% | 🟡 Medium |
| 7 | qa-specialist | 7 | QA | 1000 | 95% | 🟠 High |
| 8 | documentation-writer | 8 | Docs | 200 | N/A | 🟢 Low |

**Total Lines of Code**: ~4,100 lines
**Average Test Coverage**: 86%

---

## 🎯 Next Steps

1. Review this specification document
2. Confirm sprint schedule
3. Create feature branch: `git checkout -b feature/migration-system`
4. Launch Agent 1 (database-architect) for Sprint 1
5. Weekly check-ins with CTO

---

**STATUS**: ✅ All Specifications Complete (Agents 1-8)
**Progress**: Sprint 1-2 Complete (20%)
**Current**: Ready for Sprint 3 (integration-specialist)

**Note**: Agents 5-8 detailed specifications are in `AGENT-SPECIFICATIONS-PART2.md`
