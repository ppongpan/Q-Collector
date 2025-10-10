# FieldMigrationService - Usage Examples

**Complete code examples for integrating FieldMigrationService into Q-Collector**

---

## Table of Contents

1. [Basic Usage](#basic-usage)
2. [Integration with FormService](#integration-with-formservice)
3. [API Endpoint Examples](#api-endpoint-examples)
4. [Frontend Integration](#frontend-integration)
5. [Error Handling Patterns](#error-handling-patterns)
6. [Advanced Scenarios](#advanced-scenarios)

---

## Basic Usage

### Example 1: Add Column When User Creates New Field

```javascript
const FieldMigrationService = require('../services/FieldMigrationService');

// User adds "Email" field to contact form
async function addEmailFieldToForm(formId, fieldData) {
  try {
    // 1. Create field record in database
    const field = await Field.create({
      form_id: formId,
      type: 'email',
      title: 'Email Address',
      required: true,
      order: 5
    });

    // 2. Get form table name
    const form = await Form.findByPk(formId);

    // 3. Add column to dynamic table
    const migration = await FieldMigrationService.addColumn(
      form.table_name,
      field.id,
      'email_xyz123',  // Generated column name
      'email',         // Q-Collector field type
      {
        userId: req.user.id,
        formId: formId
      }
    );

    console.log(`✅ Column added: ${migration.column_name}`);
    return { field, migration };

  } catch (error) {
    console.error('❌ Failed to add field:', error.message);
    throw error;
  }
}
```

### Example 2: Delete Field with Backup

```javascript
async function deleteFieldFromForm(fieldId, userId) {
  try {
    // 1. Get field and form information
    const field = await Field.findByPk(fieldId, {
      include: [{ model: Form, as: 'form' }]
    });

    if (!field) {
      throw new Error('Field not found');
    }

    const tableName = field.form.table_name;
    const columnName = field.column_name; // Assuming stored in field

    // 2. Drop column with automatic backup
    const migration = await FieldMigrationService.dropColumn(
      tableName,
      fieldId,
      columnName,
      {
        backup: true,  // Always backup before deletion!
        userId: userId,
        formId: field.form_id
      }
    );

    console.log(`✅ Column dropped with backup: ${migration.backup_id}`);

    // 3. Delete field record
    await field.destroy();

    return {
      message: 'Field deleted successfully',
      migration: migration,
      backupId: migration.backup_id,
      retentionDays: 90
    };

  } catch (error) {
    console.error('❌ Failed to delete field:', error.message);
    throw error;
  }
}
```

### Example 3: Change Field Type with Validation

```javascript
async function changeFieldType(fieldId, newType, userId) {
  try {
    // 1. Get field information
    const field = await Field.findByPk(fieldId, {
      include: [{ model: Form, as: 'form' }]
    });

    const oldType = field.type;
    const columnName = field.column_name;
    const tableName = field.form.table_name;

    // 2. Preview migration first
    const preview = await FieldMigrationService.previewMigration(
      'MODIFY_COLUMN',
      tableName,
      columnName,
      {
        oldType: oldType,
        newType: newType
      }
    );

    // 3. Check if migration is safe
    if (!preview.valid) {
      return {
        success: false,
        message: 'Type conversion failed validation',
        warnings: preview.warnings,
        preview: preview
      };
    }

    // 4. Execute migration
    const migration = await FieldMigrationService.migrateColumnType(
      tableName,
      fieldId,
      columnName,
      oldType,
      newType,
      {
        userId: userId,
        formId: field.form_id
      }
    );

    // 5. Update field record
    await field.update({ type: newType });

    return {
      success: true,
      message: 'Field type changed successfully',
      migration: migration,
      backupId: migration.backup_id
    };

  } catch (error) {
    console.error('❌ Type migration failed:', error.message);
    return {
      success: false,
      message: error.message
    };
  }
}
```

---

## Integration with FormService

### FormService.updateForm() - Automatic Migration

```javascript
// backend/services/FormService.js

const FieldMigrationService = require('./FieldMigrationService');

class FormService {
  /**
   * Update form and automatically migrate table schema
   */
  async updateForm(formId, formData, userId) {
    const transaction = await sequelize.transaction();

    try {
      const form = await Form.findByPk(formId, {
        include: [{ model: Field, as: 'fields' }],
        transaction
      });

      if (!form) {
        throw new Error('Form not found');
      }

      const tableName = form.table_name;
      const oldFields = form.fields;
      const newFields = formData.fields || [];

      // Track migrations
      const migrations = {
        added: [],
        deleted: [],
        renamed: [],
        typeChanged: []
      };

      // 1. Detect new fields (ADD_COLUMN)
      const newFieldIds = new Set(newFields.map(f => f.id).filter(id => id));
      const oldFieldIds = new Set(oldFields.map(f => f.id));

      for (const newField of newFields) {
        if (!newField.id || !oldFieldIds.has(newField.id)) {
          // New field - add column
          const columnName = await generateColumnName(newField.title);

          const migration = await FieldMigrationService.addColumn(
            tableName,
            newField.tempId || null,
            columnName,
            newField.type,
            { userId, formId, transaction }
          );

          migrations.added.push({
            fieldTitle: newField.title,
            columnName: columnName,
            migrationId: migration.id
          });
        }
      }

      // 2. Detect deleted fields (DROP_COLUMN)
      for (const oldField of oldFields) {
        if (!newFieldIds.has(oldField.id)) {
          // Field deleted - drop column with backup
          const migration = await FieldMigrationService.dropColumn(
            tableName,
            oldField.id,
            oldField.column_name,
            { backup: true, userId, formId, transaction }
          );

          migrations.deleted.push({
            fieldTitle: oldField.title,
            columnName: oldField.column_name,
            migrationId: migration.id,
            backupId: migration.backup_id
          });
        }
      }

      // 3. Detect type changes (MODIFY_COLUMN)
      for (const newField of newFields) {
        if (newField.id) {
          const oldField = oldFields.find(f => f.id === newField.id);
          if (oldField && oldField.type !== newField.type) {
            // Type changed - migrate with validation
            const migration = await FieldMigrationService.migrateColumnType(
              tableName,
              oldField.id,
              oldField.column_name,
              oldField.type,
              newField.type,
              { userId, formId, transaction }
            );

            migrations.typeChanged.push({
              fieldTitle: oldField.title,
              columnName: oldField.column_name,
              oldType: oldField.type,
              newType: newField.type,
              migrationId: migration.id,
              backupId: migration.backup_id
            });
          }
        }
      }

      // 4. Update form record
      await form.update(formData, { transaction });

      await transaction.commit();

      return {
        form,
        migrations,
        summary: {
          added: migrations.added.length,
          deleted: migrations.deleted.length,
          typeChanged: migrations.typeChanged.length
        }
      };

    } catch (error) {
      await transaction.rollback();
      console.error('Form update failed:', error);
      throw error;
    }
  }
}

module.exports = new FormService();
```

---

## API Endpoint Examples

### POST /api/forms/:id/fields/preview-migration

```javascript
// backend/api/routes/form.routes.js

const express = require('express');
const router = express.Router();
const FieldMigrationService = require('../../services/FieldMigrationService');
const { authenticate } = require('../../middleware/auth.middleware');

/**
 * Preview field migration without executing
 */
router.post('/forms/:id/fields/preview-migration',
  authenticate,
  async (req, res) => {
    try {
      const { formId } = req.params;
      const { migrationType, columnName, params } = req.body;

      // Get form and table name
      const form = await Form.findByPk(formId);
      if (!form) {
        return res.status(404).json({ error: 'Form not found' });
      }

      // Generate preview
      const preview = await FieldMigrationService.previewMigration(
        migrationType,
        form.table_name,
        columnName,
        params
      );

      res.json({
        success: true,
        preview: preview
      });

    } catch (error) {
      console.error('Preview failed:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * Get migration history for form
 */
router.get('/forms/:id/migrations',
  authenticate,
  async (req, res) => {
    try {
      const { formId } = req.params;

      const migrations = await FieldMigration.findAll({
        where: { form_id: formId },
        include: [
          {
            model: User,
            as: 'executor',
            attributes: ['id', 'username', 'email']
          },
          {
            model: FieldDataBackup,
            as: 'backup',
            required: false
          }
        ],
        order: [['executed_at', 'DESC']],
        limit: 100
      });

      res.json({
        success: true,
        migrations: migrations.map(m => m.toJSON()),
        count: migrations.length
      });

    } catch (error) {
      console.error('Failed to get migration history:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * Restore deleted field data from backup
 */
router.post('/forms/:id/backups/:backupId/restore',
  authenticate,
  async (req, res) => {
    try {
      const { backupId } = req.params;
      const userId = req.user.id;

      // Check user has permission (admin only)
      if (!['super_admin', 'admin'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Only admins can restore backups'
        });
      }

      // Restore data
      const result = await FieldMigrationService.restoreColumnData(
        backupId,
        { userId }
      );

      res.json({
        success: true,
        result: result,
        message: `Restored ${result.count} records`
      });

    } catch (error) {
      console.error('Restore failed:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

module.exports = router;
```

---

## Frontend Integration

### React Component - Field Type Change with Preview

```javascript
// src/components/FieldTypeChanger.jsx

import React, { useState } from 'react';
import { apiClient } from '../services/ApiClient';

export function FieldTypeChanger({ field, formId, onSuccess }) {
  const [newType, setNewType] = useState(field.type);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  // Preview type change
  const handlePreview = async () => {
    setLoading(true);
    try {
      const response = await apiClient.post(
        `/forms/${formId}/fields/preview-migration`,
        {
          migrationType: 'MODIFY_COLUMN',
          columnName: field.columnName,
          params: {
            oldType: field.type,
            newType: newType
          }
        }
      );

      setPreview(response.data.preview);
    } catch (error) {
      console.error('Preview failed:', error);
      alert('Failed to preview migration');
    } finally {
      setLoading(false);
    }
  };

  // Execute type change
  const handleConfirm = async () => {
    setLoading(true);
    try {
      const response = await apiClient.patch(
        `/forms/${formId}/fields/${field.id}`,
        {
          type: newType
        }
      );

      alert('Field type changed successfully!');
      onSuccess(response.data);
    } catch (error) {
      console.error('Type change failed:', error);
      alert(`Failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="field-type-changer">
      <h3>Change Field Type: {field.title}</h3>

      <div className="type-selector">
        <label>Current Type: {field.type}</label>
        <select value={newType} onChange={(e) => setNewType(e.target.value)}>
          <option value="short_answer">Short Answer</option>
          <option value="paragraph">Paragraph</option>
          <option value="email">Email</option>
          <option value="number">Number</option>
          <option value="date">Date</option>
          {/* ... more options */}
        </select>
      </div>

      <button onClick={handlePreview} disabled={loading || newType === field.type}>
        {loading ? 'Previewing...' : 'Preview Change'}
      </button>

      {preview && (
        <div className="preview-results">
          <h4>Migration Preview</h4>

          <div className={`status ${preview.valid ? 'valid' : 'invalid'}`}>
            {preview.valid ? '✅ Safe to proceed' : '❌ Cannot proceed'}
          </div>

          <div className="details">
            <p><strong>SQL:</strong> <code>{preview.sql}</code></p>
            <p><strong>Affected Rows:</strong> {preview.estimatedRows}</p>
            <p><strong>Requires Backup:</strong> {preview.requiresBackup ? 'Yes' : 'No'}</p>
          </div>

          {preview.warnings.length > 0 && (
            <div className="warnings">
              <h5>⚠️ Warnings:</h5>
              <ul>
                {preview.warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {preview.valid && (
            <button onClick={handleConfirm} disabled={loading}>
              Confirm Change
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

### React Component - Migration History Viewer

```javascript
// src/components/MigrationHistory.jsx

import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/ApiClient';

export function MigrationHistory({ formId }) {
  const [migrations, setMigrations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMigrations();
  }, [formId]);

  const loadMigrations = async () => {
    try {
      const response = await apiClient.get(`/forms/${formId}/migrations`);
      setMigrations(response.data.migrations);
    } catch (error) {
      console.error('Failed to load migrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (backupId) => {
    if (!confirm('Restore data from this backup? This will overwrite current data.')) {
      return;
    }

    try {
      const response = await apiClient.post(
        `/forms/${formId}/backups/${backupId}/restore`
      );

      alert(`✅ ${response.data.message}`);
      loadMigrations(); // Reload to show restore migration
    } catch (error) {
      console.error('Restore failed:', error);
      alert(`❌ ${error.response?.data?.error || error.message}`);
    }
  };

  if (loading) return <div>Loading migration history...</div>;

  return (
    <div className="migration-history">
      <h3>Migration History ({migrations.length})</h3>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Column</th>
            <th>Status</th>
            <th>User</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {migrations.map(migration => (
            <tr key={migration.id} className={migration.success ? 'success' : 'failed'}>
              <td>{new Date(migration.executedAt).toLocaleString()}</td>
              <td>
                <span className={`badge ${migration.migrationType.toLowerCase()}`}>
                  {migration.migrationType}
                </span>
              </td>
              <td><code>{migration.columnName}</code></td>
              <td>
                {migration.success ? '✅ Success' : '❌ Failed'}
                {migration.errorMessage && (
                  <div className="error-detail">{migration.errorMessage}</div>
                )}
              </td>
              <td>{migration.executor?.username || 'System'}</td>
              <td>
                {migration.backupId && (
                  <button
                    onClick={() => handleRestore(migration.backupId)}
                    className="btn-restore"
                  >
                    🔄 Restore
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Error Handling Patterns

### Pattern 1: Graceful Degradation

```javascript
async function safeFieldUpdate(fieldId, updates, userId) {
  try {
    // Try to update with migration
    return await updateFieldWithMigration(fieldId, updates, userId);
  } catch (migrationError) {
    console.error('Migration failed, trying without schema change:', migrationError);

    // Fallback: Update field record only, skip schema change
    const field = await Field.findByPk(fieldId);
    await field.update({
      title: updates.title,
      placeholder: updates.placeholder,
      required: updates.required
      // Skip 'type' change if migration failed
    });

    return {
      field,
      warning: 'Field updated but table schema not changed',
      error: migrationError.message
    };
  }
}
```

### Pattern 2: Retry with Exponential Backoff

```javascript
async function addColumnWithRetry(tableName, fieldId, columnName, dataType, options, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await FieldMigrationService.addColumn(
        tableName,
        fieldId,
        columnName,
        dataType,
        options
      );
    } catch (error) {
      lastError = error;

      // Don't retry on validation errors
      if (error.message.includes('already exists')) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
```

### Pattern 3: Validation Before Execution

```javascript
async function validateThenMigrate(fieldId, newType, userId) {
  const field = await Field.findByPk(fieldId, {
    include: [{ model: Form, as: 'form' }]
  });

  // Step 1: Preview migration
  const preview = await FieldMigrationService.previewMigration(
    'MODIFY_COLUMN',
    field.form.table_name,
    field.column_name,
    { oldType: field.type, newType }
  );

  // Step 2: Check validation
  if (!preview.valid) {
    throw new Error(`Migration validation failed: ${preview.warnings.join(', ')}`);
  }

  // Step 3: Check for risky conversions
  const riskyWarnings = preview.warnings.filter(w =>
    w.includes('truncated') || w.includes('data loss')
  );

  if (riskyWarnings.length > 0) {
    // Require explicit confirmation for risky migrations
    console.warn('⚠️ Risky migration detected:', riskyWarnings);
    // Frontend should show confirmation dialog here
  }

  // Step 4: Execute migration
  return await FieldMigrationService.migrateColumnType(
    field.form.table_name,
    fieldId,
    field.column_name,
    field.type,
    newType,
    { userId, formId: field.form_id }
  );
}
```

---

## Advanced Scenarios

### Scenario 1: Bulk Field Operations

```javascript
async function bulkAddFields(formId, fieldsToAdd, userId) {
  const form = await Form.findByPk(formId);
  const results = {
    successful: [],
    failed: []
  };

  for (const fieldData of fieldsToAdd) {
    try {
      // Create field
      const field = await Field.create({
        form_id: formId,
        ...fieldData
      });

      // Add column
      const columnName = await generateColumnName(fieldData.title);
      const migration = await FieldMigrationService.addColumn(
        form.table_name,
        field.id,
        columnName,
        fieldData.type,
        { userId, formId }
      );

      results.successful.push({
        field,
        migration,
        columnName
      });

    } catch (error) {
      results.failed.push({
        fieldData,
        error: error.message
      });
    }
  }

  return results;
}
```

### Scenario 2: Form Duplication with Schema

```javascript
async function duplicateFormWithSchema(sourceFormId, newFormData, userId) {
  const transaction = await sequelize.transaction();

  try {
    // 1. Get source form and fields
    const sourceForm = await Form.findByPk(sourceFormId, {
      include: [{ model: Field, as: 'fields' }],
      transaction
    });

    // 2. Create new form
    const newForm = await Form.create({
      ...newFormData,
      created_by: userId
    }, { transaction });

    // 3. Create dynamic table for new form
    const newTableName = await generateTableName(newForm.title, newForm.id);
    await newForm.update({ table_name: newTableName }, { transaction });

    // Create base table structure
    await pool.query(`
      CREATE TABLE "${newTableName}" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
        username VARCHAR(100),
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Duplicate fields and add columns
    for (const sourceField of sourceForm.fields) {
      // Create new field
      const newField = await Field.create({
        form_id: newForm.id,
        type: sourceField.type,
        title: sourceField.title,
        placeholder: sourceField.placeholder,
        required: sourceField.required,
        order: sourceField.order,
        options: sourceField.options
      }, { transaction });

      // Add column to new table
      const columnName = await generateColumnName(newField.title);
      await FieldMigrationService.addColumn(
        newTableName,
        newField.id,
        columnName,
        newField.type,
        { userId, formId: newForm.id, transaction }
      );
    }

    await transaction.commit();

    return {
      form: newForm,
      fieldsCount: sourceForm.fields.length
    };

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

### Scenario 3: Scheduled Migration Execution

```javascript
const cron = require('node-cron');

// Execute pending migrations every night at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('🕐 Running scheduled migrations...');

  try {
    // Get pending migrations from queue
    const pendingMigrations = await MigrationQueue.findAll({
      where: { status: 'pending' }
    });

    for (const pending of pendingMigrations) {
      try {
        const { migrationType, params } = pending;

        let migration;
        switch (migrationType) {
          case 'ADD_COLUMN':
            migration = await FieldMigrationService.addColumn(
              params.tableName,
              params.fieldId,
              params.columnName,
              params.dataType,
              params.options
            );
            break;

          case 'DROP_COLUMN':
            migration = await FieldMigrationService.dropColumn(
              params.tableName,
              params.fieldId,
              params.columnName,
              params.options
            );
            break;

          // ... other cases
        }

        // Mark as completed
        await pending.update({
          status: 'completed',
          migration_id: migration.id
        });

        console.log(`✅ Completed migration ${pending.id}`);

      } catch (error) {
        // Mark as failed
        await pending.update({
          status: 'failed',
          error_message: error.message
        });

        console.error(`❌ Failed migration ${pending.id}:`, error);
      }
    }

    console.log('✅ Scheduled migrations complete');

  } catch (error) {
    console.error('❌ Scheduled migration error:', error);
  }
});
```

---

## Best Practices

### 1. Always Preview Before Destructive Operations

```javascript
// ❌ Bad: Direct execution without preview
await FieldMigrationService.dropColumn(tableName, fieldId, columnName);

// ✅ Good: Preview first, then decide
const preview = await FieldMigrationService.previewMigration(
  'DROP_COLUMN',
  tableName,
  columnName,
  {}
);

if (preview.requiresBackup) {
  // Show warning to user
  const confirmed = await confirmDeletion(preview);
  if (confirmed) {
    await FieldMigrationService.dropColumn(tableName, fieldId, columnName, {
      backup: true
    });
  }
}
```

### 2. Use Transactions for Related Operations

```javascript
// ✅ Good: All-or-nothing update
const transaction = await sequelize.transaction();

try {
  // Update field
  await field.update({ type: newType }, { transaction });

  // Migrate column
  await FieldMigrationService.migrateColumnType(
    tableName,
    fieldId,
    columnName,
    oldType,
    newType,
    { transaction }
  );

  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  throw error;
}
```

### 3. Log All Migration Events

```javascript
const logger = require('../utils/logger.util');

try {
  logger.info(`Starting migration: ADD_COLUMN ${columnName} to ${tableName}`);

  const migration = await FieldMigrationService.addColumn(...);

  logger.info(`Migration successful: ${migration.id}`, {
    columnName,
    tableName,
    userId,
    duration: Date.now() - startTime
  });

} catch (error) {
  logger.error(`Migration failed: ${error.message}`, {
    columnName,
    tableName,
    error: error.stack
  });
}
```

---

## Testing Integration

```javascript
// tests/integration/field-migration.test.js

describe('Field Migration Integration', () => {
  it('should add field and column in single transaction', async () => {
    const form = await createTestForm();

    // Add field with migration
    const result = await FormService.addFieldToForm(form.id, {
      type: 'email',
      title: 'Email Address',
      required: true
    });

    // Verify field created
    expect(result.field).toBeDefined();
    expect(result.field.type).toBe('email');

    // Verify column added
    const columns = await getTableColumns(form.table_name);
    expect(columns).toContain(result.columnName);

    // Verify migration recorded
    const migration = await FieldMigration.findOne({
      where: { field_id: result.field.id }
    });
    expect(migration.success).toBe(true);
  });
});
```

---

**Complete documentation for FieldMigrationService integration**
**Version: v0.8.0-sprint2**
**Date: 2025-10-07**
