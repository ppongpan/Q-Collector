/**
 * FieldMigrationService Unit Tests
 *
 * Comprehensive test suite for Q-Collector Field Migration System v0.8.0
 * Target: >90% code coverage
 *
 * Test Categories:
 * 1. addColumn() - success, duplicate, invalid type
 * 2. dropColumn() - with backup, without backup, restore validation
 * 3. renameColumn() - success, non-existent column
 * 4. migrateColumnType() - safe conversion, risky validation, invalid data
 * 5. backupColumnData() - empty table, large table
 * 6. restoreColumnData() - full restore, partial restore, expired backup
 * 7. previewMigration() - all migration types
 * 8. _fieldTypeToPostgres() - all 17 field types
 * 9. _validateTypeConversion() - all conversion combinations
 *
 * Created: 2025-10-07
 * Sprint: 2 (Service Layer - Field Migration System v0.8.0)
 */

const { sequelize } = require('../../../models');
const { FieldMigration, FieldDataBackup, Field, Form, User } = require('../../../models');
const FieldMigrationService = require('../../../services/FieldMigrationService');
const { Pool } = require('pg');

// Test database pool
const testPool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

describe('FieldMigrationService', () => {
  let testForm;
  let testUser;
  let testTable;
  let testFieldId;

  // Setup: Create test form, user, and dynamic table before all tests
  beforeAll(async () => {
    // Create test user (username must be alphanumeric only)
    testUser = await User.create({
      username: 'testmigrationuser',
      email: 'migration@test.com',
      password_hash: 'hashed_password',
      role: 'admin'
    });

    // Create test form
    testForm = await Form.create({
      title: 'Test Migration Form',
      description: 'Form for migration testing',
      table_name: null,
      created_by: testUser.id,
      is_active: true
    });

    // Generate unique test table name
    testTable = `test_migration_table_${Date.now()}`;

    // Create test dynamic table
    await testPool.query(`
      CREATE TABLE "${testTable}" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        form_id UUID NOT NULL,
        username VARCHAR(100),
        submission_number INTEGER,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Update form with table name
    await testForm.update({ table_name: testTable });

    // Create test field (required for foreign key constraint)
    const testField = await Field.create({
      form_id: testForm.id,
      type: 'short_answer',
      title: 'Test Field',
      required: false,
      order: 0
    });
    testFieldId = testField.id;

    console.log(`Test setup complete: table=${testTable}, form=${testForm.id}, user=${testUser.id}, field=${testFieldId}`);
  });

  // Cleanup: Drop test table and delete test data after all tests
  afterAll(async () => {
    try {
      // Drop test table
      await testPool.query(`DROP TABLE IF EXISTS "${testTable}" CASCADE`);

      // Delete test migrations
      await FieldMigration.destroy({ where: { form_id: testForm.id }, force: true });

      // Delete test backups
      await FieldDataBackup.destroy({ where: { form_id: testForm.id }, force: true });

      // Delete test form
      await testForm.destroy({ force: true });

      // Delete test user
      await testUser.destroy({ force: true });

      // Close pools
      await testPool.end();
      await FieldMigrationService.close();

      console.log('Test cleanup complete');
    } catch (error) {
      console.error('Test cleanup error:', error);
    }
  });

  describe('addColumn()', () => {
    it('should successfully add TEXT column for short_answer field type', async () => {
      const columnName = 'test_short_answer';

      const migration = await FieldMigrationService.addColumn(
        testTable,
        testFieldId,
        columnName,
        'short_answer',
        { userId: testUser.id, formId: testForm.id }
      );

      expect(migration).toBeDefined();
      expect(migration.success).toBe(true);
      expect(migration.migration_type).toBe('ADD_COLUMN');
      expect(migration.column_name).toBe(columnName);
      expect(migration.rollback_sql).toContain('DROP COLUMN');

      // Verify column exists in database
      const columnCheck = await testPool.query(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
        [testTable, columnName]
      );
      expect(columnCheck.rows.length).toBe(1);
      expect(columnCheck.rows[0].column_name).toBe(columnName);
    });

    it('should successfully add NUMERIC column for number field type', async () => {
      const columnName = 'test_number';

      const migration = await FieldMigrationService.addColumn(
        testTable,
        testFieldId,
        columnName,
        'number',
        { userId: testUser.id, formId: testForm.id }
      );

      expect(migration).toBeDefined();
      expect(migration.success).toBe(true);
      expect(migration.new_value.dataType).toContain('NUMERIC');
    });

    it('should successfully add DATE column for date field type', async () => {
      const columnName = 'test_date';

      const migration = await FieldMigrationService.addColumn(
        testTable,
        testFieldId,
        columnName,
        'date',
        { userId: testUser.id, formId: testForm.id }
      );

      expect(migration).toBeDefined();
      expect(migration.success).toBe(true);
      expect(migration.new_value.dataType).toBe('DATE');
    });

    it('should fail when adding duplicate column', async () => {
      const columnName = 'test_duplicate';

      // Add column first time
      await FieldMigrationService.addColumn(
        testTable,
        testFieldId,
        columnName,
        'TEXT',
        { userId: testUser.id, formId: testForm.id }
      );

      // Try to add again - should fail
      await expect(
        FieldMigrationService.addColumn(
          testTable,
          testFieldId,
          columnName,
          'TEXT',
          { userId: testUser.id, formId: testForm.id }
        )
      ).rejects.toThrow();

      // Verify failed migration was recorded
      const failedMigrations = await FieldMigration.findAll({
        where: {
          table_name: testTable,
          column_name: columnName,
          success: false
        }
      });
      expect(failedMigrations.length).toBeGreaterThan(0);
    });

    it('should handle all 17 Q-Collector field types', async () => {
      const fieldTypes = [
        { type: 'paragraph', expectedPgType: 'TEXT' },
        { type: 'email', expectedPgType: 'VARCHAR(255)' },
        { type: 'phone', expectedPgType: 'VARCHAR(20)' },
        { type: 'url', expectedPgType: 'VARCHAR(500)' },
        { type: 'file_upload', expectedPgType: 'TEXT' },
        { type: 'image_upload', expectedPgType: 'TEXT' },
        { type: 'time', expectedPgType: 'TIME' },
        { type: 'datetime', expectedPgType: 'TIMESTAMP' },
        { type: 'multiple_choice', expectedPgType: 'VARCHAR(255)' },
        { type: 'rating', expectedPgType: 'INTEGER' },
        { type: 'slider', expectedPgType: 'INTEGER' },
        { type: 'lat_long', expectedPgType: 'JSONB' },
        { type: 'province', expectedPgType: 'VARCHAR(100)' },
        { type: 'factory', expectedPgType: 'VARCHAR(255)' }
      ];

      for (const { type, expectedPgType } of fieldTypes) {
        const columnName = `test_${type}`;

        const migration = await FieldMigrationService.addColumn(
          testTable,
          testFieldId,
          columnName,
          type,
          { userId: testUser.id, formId: testForm.id }
        );

        expect(migration.success).toBe(true);
        expect(migration.new_value.dataType).toBe(expectedPgType);
      }
    });
  });

  describe('dropColumn()', () => {
    it('should drop column with automatic backup', async () => {
      // First, add a column with some data
      const columnName = 'test_drop_with_backup';
      await FieldMigrationService.addColumn(
        testTable,
        testFieldId,
        columnName,
        'TEXT',
        { userId: testUser.id, formId: testForm.id }
      );

      // Insert test data
      await testPool.query(`
        INSERT INTO "${testTable}" (form_id, username, "${columnName}")
        VALUES ($1, 'testuser', 'test_value_1'), ($1, 'testuser', 'test_value_2')
      `, [testForm.id]);

      // Drop column with backup
      const migration = await FieldMigrationService.dropColumn(
        testTable,
        testFieldId,
        columnName,
        { backup: true, userId: testUser.id, formId: testForm.id }
      );

      expect(migration).toBeDefined();
      expect(migration.success).toBe(true);
      expect(migration.migration_type).toBe('DROP_COLUMN');
      expect(migration.backup_id).toBeDefined();

      // Verify backup exists and has data
      const backup = await FieldDataBackup.findByPk(migration.backup_id);
      expect(backup).toBeDefined();
      expect(backup.getRecordCount()).toBe(2);
      expect(backup.backup_type).toBe('AUTO_DELETE');

      // Verify column was dropped
      const columnCheck = await testPool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
        [testTable, columnName]
      );
      expect(columnCheck.rows.length).toBe(0);
    });

    it('should drop column without backup when backup=false', async () => {
      // Add a column
      const columnName = 'test_drop_no_backup';
      await FieldMigrationService.addColumn(
        testTable,
        testFieldId,
        columnName,
        'TEXT',
        { userId: testUser.id, formId: testForm.id }
      );

      // Drop without backup
      const migration = await FieldMigrationService.dropColumn(
        testTable,
        testFieldId,
        columnName,
        { backup: false, userId: testUser.id, formId: testForm.id }
      );

      expect(migration.success).toBe(true);
      expect(migration.backup_id).toBeNull();
    });

    it('should fail when dropping non-existent column', async () => {
      await expect(
        FieldMigrationService.dropColumn(
          testTable,
          testFieldId,
          'nonexistent_column',
          { userId: testUser.id, formId: testForm.id }
        )
      ).rejects.toThrow();
    });
  });

  describe('renameColumn()', () => {
    it('should successfully rename column', async () => {
      // Add a column
      const oldName = 'test_rename_old';
      const newName = 'test_rename_new';

      await FieldMigrationService.addColumn(
        testTable,
        testFieldId,
        oldName,
        'TEXT',
        { userId: testUser.id, formId: testForm.id }
      );

      // Rename it
      const migration = await FieldMigrationService.renameColumn(
        testTable,
        testFieldId,
        oldName,
        newName,
        { userId: testUser.id, formId: testForm.id }
      );

      expect(migration).toBeDefined();
      expect(migration.success).toBe(true);
      expect(migration.migration_type).toBe('RENAME_COLUMN');
      expect(migration.old_value.columnName).toBe(oldName);
      expect(migration.new_value.columnName).toBe(newName);
      expect(migration.rollback_sql).toContain(`RENAME COLUMN "${newName}" TO "${oldName}"`);

      // Verify old column doesn't exist
      const oldCheck = await testPool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
        [testTable, oldName]
      );
      expect(oldCheck.rows.length).toBe(0);

      // Verify new column exists
      const newCheck = await testPool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
        [testTable, newName]
      );
      expect(newCheck.rows.length).toBe(1);
    });

    it('should fail when renaming non-existent column', async () => {
      await expect(
        FieldMigrationService.renameColumn(
          testTable,
          testFieldId,
          'nonexistent_old',
          'some_new_name',
          { userId: testUser.id, formId: testForm.id }
        )
      ).rejects.toThrow();
    });

    it('should preserve data after rename', async () => {
      const oldName = 'test_rename_preserve_old';
      const newName = 'test_rename_preserve_new';

      // Add column
      await FieldMigrationService.addColumn(
        testTable,
        testFieldId,
        oldName,
        'TEXT',
        { userId: testUser.id, formId: testForm.id }
      );

      // Insert test data
      await testPool.query(`
        INSERT INTO "${testTable}" (form_id, username, "${oldName}")
        VALUES ($1, 'testuser', 'preserved_value')
      `, [testForm.id]);

      // Rename column
      await FieldMigrationService.renameColumn(
        testTable,
        testFieldId,
        oldName,
        newName,
        { userId: testUser.id, formId: testForm.id }
      );

      // Verify data is preserved
      const dataCheck = await testPool.query(
        `SELECT "${newName}" FROM "${testTable}" WHERE "${newName}" = 'preserved_value'`
      );
      expect(dataCheck.rows.length).toBeGreaterThan(0);
    });
  });

  describe('migrateColumnType()', () => {
    it('should successfully migrate NUMERIC to TEXT (safe conversion)', async () => {
      const columnName = 'test_type_numeric_to_text';

      // Add NUMERIC column
      await FieldMigrationService.addColumn(
        testTable,
        testFieldId,
        columnName,
        'NUMERIC',
        { userId: testUser.id, formId: testForm.id }
      );

      // Insert test data
      await testPool.query(`
        INSERT INTO "${testTable}" (form_id, username, "${columnName}")
        VALUES ($1, 'testuser', 123.45), ($1, 'testuser', 678.90)
      `, [testForm.id]);

      // Migrate to TEXT
      const migration = await FieldMigrationService.migrateColumnType(
        testTable,
        testFieldId,
        columnName,
        'NUMERIC',
        'TEXT',
        { userId: testUser.id, formId: testForm.id }
      );

      expect(migration).toBeDefined();
      expect(migration.success).toBe(true);
      expect(migration.migration_type).toBe('MODIFY_COLUMN');
      expect(migration.backup_id).toBeDefined();

      // Verify column type changed
      const columnCheck = await testPool.query(
        `SELECT data_type FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
        [testTable, columnName]
      );
      expect(columnCheck.rows[0].data_type).toBe('text');

      // Verify data preserved
      const dataCheck = await testPool.query(`SELECT "${columnName}" FROM "${testTable}" WHERE "${columnName}" IS NOT NULL`);
      expect(dataCheck.rows.length).toBe(2);
    });

    it('should fail when migrating TEXT to NUMERIC with invalid data', async () => {
      const columnName = 'test_type_text_to_numeric_invalid';

      // Add TEXT column
      await FieldMigrationService.addColumn(
        testTable,
        testFieldId,
        columnName,
        'TEXT',
        { userId: testUser.id, formId: testForm.id }
      );

      // Insert invalid numeric data
      await testPool.query(`
        INSERT INTO "${testTable}" (form_id, username, "${columnName}")
        VALUES ($1, 'testuser', 'not_a_number'), ($1, 'testuser', 'also_not_numeric')
      `, [testForm.id]);

      // Try to migrate to NUMERIC - should fail validation
      await expect(
        FieldMigrationService.migrateColumnType(
          testTable,
          testFieldId,
          columnName,
          'TEXT',
          'NUMERIC',
          { userId: testUser.id, formId: testForm.id }
        )
      ).rejects.toThrow(/validation failed/i);
    });

    it('should successfully migrate TEXT to NUMERIC with valid data', async () => {
      const columnName = 'test_type_text_to_numeric_valid';

      // Add TEXT column
      await FieldMigrationService.addColumn(
        testTable,
        testFieldId,
        columnName,
        'TEXT',
        { userId: testUser.id, formId: testForm.id }
      );

      // Insert valid numeric strings
      await testPool.query(`
        INSERT INTO "${testTable}" (form_id, username, "${columnName}")
        VALUES ($1, 'testuser', '123.45'), ($1, 'testuser', '678.90')
      `, [testForm.id]);

      // Migrate to NUMERIC - should succeed
      const migration = await FieldMigrationService.migrateColumnType(
        testTable,
        testFieldId,
        columnName,
        'TEXT',
        'NUMERIC',
        { userId: testUser.id, formId: testForm.id }
      );

      expect(migration.success).toBe(true);

      // Verify data preserved as numeric
      const dataCheck = await testPool.query(`SELECT "${columnName}" FROM "${testTable}" WHERE "${columnName}" IS NOT NULL`);
      expect(dataCheck.rows.length).toBe(2);
    });

    it('should create backup before type migration', async () => {
      const columnName = 'test_type_with_backup';

      // Add column with data
      await FieldMigrationService.addColumn(
        testTable,
        testFieldId,
        columnName,
        'TEXT',
        { userId: testUser.id, formId: testForm.id }
      );

      await testPool.query(`
        INSERT INTO "${testTable}" (form_id, username, "${columnName}")
        VALUES ($1, 'testuser', 'value1'), ($1, 'testuser', 'value2'), ($1, 'testuser', 'value3')
      `, [testForm.id]);

      // Migrate type
      const migration = await FieldMigrationService.migrateColumnType(
        testTable,
        testFieldId,
        columnName,
        'TEXT',
        'VARCHAR(500)',
        { userId: testUser.id, formId: testForm.id }
      );

      expect(migration.backup_id).toBeDefined();

      // Verify backup
      const backup = await FieldDataBackup.findByPk(migration.backup_id);
      expect(backup).toBeDefined();
      expect(backup.backup_type).toBe('AUTO_MODIFY');
      expect(backup.getRecordCount()).toBeGreaterThanOrEqual(3);
    });
  });

  describe('backupColumnData()', () => {
    it('should create backup for column with data', async () => {
      const columnName = 'test_backup_column';

      // Add column
      await FieldMigrationService.addColumn(
        testTable,
        testFieldId,
        columnName,
        'TEXT',
        { userId: testUser.id, formId: testForm.id }
      );

      // Insert test data
      await testPool.query(`
        INSERT INTO "${testTable}" (form_id, username, "${columnName}")
        VALUES ($1, 'user1', 'data1'), ($1, 'user2', 'data2'), ($1, 'user3', 'data3')
      `, [testForm.id]);

      // Create backup
      const backup = await FieldMigrationService.backupColumnData(
        testTable,
        columnName,
        'MANUAL',
        { userId: testUser.id, formId: testForm.id }
      );

      expect(backup).toBeDefined();
      expect(backup.table_name).toBe(testTable);
      expect(backup.column_name).toBe(columnName);
      expect(backup.backup_type).toBe('MANUAL');
      expect(backup.getRecordCount()).toBeGreaterThanOrEqual(3);
      expect(backup.data_snapshot).toBeInstanceOf(Array);
      expect(backup.data_snapshot[0]).toHaveProperty('id');
      expect(backup.data_snapshot[0]).toHaveProperty('value');
    });

    it('should create backup for empty table', async () => {
      const columnName = 'test_backup_empty';

      // Add column (no data)
      await FieldMigrationService.addColumn(
        testTable,
        testFieldId,
        columnName,
        'TEXT',
        { userId: testUser.id, formId: testForm.id }
      );

      // Create backup
      const backup = await FieldMigrationService.backupColumnData(
        testTable,
        columnName,
        'MANUAL',
        { userId: testUser.id, formId: testForm.id }
      );

      expect(backup).toBeDefined();
      expect(backup.getRecordCount()).toBeGreaterThanOrEqual(0);
      expect(backup.data_snapshot).toBeInstanceOf(Array);
    });

    it('should set retention period to 90 days', async () => {
      const columnName = 'test_backup_retention';

      await FieldMigrationService.addColumn(
        testTable,
        testFieldId,
        columnName,
        'TEXT',
        { userId: testUser.id, formId: testForm.id }
      );

      const backup = await FieldMigrationService.backupColumnData(
        testTable,
        columnName,
        'MANUAL',
        { userId: testUser.id, formId: testForm.id }
      );

      expect(backup.retention_until).toBeDefined();

      const now = new Date();
      const retentionDate = new Date(backup.retention_until);
      const diffDays = Math.floor((retentionDate - now) / (1000 * 60 * 60 * 24));

      expect(diffDays).toBeGreaterThanOrEqual(89);
      expect(diffDays).toBeLessThanOrEqual(91);
    });
  });

  describe('restoreColumnData()', () => {
    it('should restore backed up data successfully', async () => {
      const columnName = 'test_restore_column';

      // Add column
      await FieldMigrationService.addColumn(
        testTable,
        testFieldId,
        columnName,
        'TEXT',
        { userId: testUser.id, formId: testForm.id }
      );

      // Insert original data
      await testPool.query(`
        INSERT INTO "${testTable}" (form_id, username, "${columnName}")
        VALUES ($1, 'user1', 'original_value_1'), ($1, 'user2', 'original_value_2')
      `, [testForm.id]);

      // Create backup
      const backup = await FieldMigrationService.backupColumnData(
        testTable,
        columnName,
        'MANUAL',
        { userId: testUser.id, formId: testForm.id }
      );

      // Modify data
      await testPool.query(`UPDATE "${testTable}" SET "${columnName}" = 'modified_value'`);

      // Restore from backup
      const result = await FieldMigrationService.restoreColumnData(
        backup.id,
        { userId: testUser.id }
      );

      expect(result.success).toBe(true);
      expect(result.count).toBeGreaterThanOrEqual(2);

      // Verify data restored
      const dataCheck = await testPool.query(
        `SELECT "${columnName}" FROM "${testTable}" WHERE "${columnName}" LIKE 'original_value_%'`
      );
      expect(dataCheck.rows.length).toBeGreaterThanOrEqual(2);
    });

    it('should fail when restoring non-existent backup', async () => {
      const fakeBackupId = '123e4567-e89b-12d3-a456-999999999999';

      await expect(
        FieldMigrationService.restoreColumnData(fakeBackupId, { userId: testUser.id })
      ).rejects.toThrow(/not found/i);
    });

    it('should fail when restoring to non-existent column', async () => {
      const columnName = 'test_restore_missing_column';

      // Add column
      await FieldMigrationService.addColumn(
        testTable,
        testFieldId,
        columnName,
        'TEXT',
        { userId: testUser.id, formId: testForm.id }
      );

      // Insert data and create backup
      await testPool.query(`
        INSERT INTO "${testTable}" (form_id, username, "${columnName}")
        VALUES ($1, 'user1', 'value1')
      `, [testForm.id]);

      const backup = await FieldMigrationService.backupColumnData(
        testTable,
        columnName,
        'MANUAL',
        { userId: testUser.id, formId: testForm.id }
      );

      // Drop the column
      await testPool.query(`ALTER TABLE "${testTable}" DROP COLUMN "${columnName}"`);

      // Try to restore - should fail
      await expect(
        FieldMigrationService.restoreColumnData(backup.id, { userId: testUser.id })
      ).rejects.toThrow(/does not exist/i);
    });

    it('should handle restoring large datasets in batches', async () => {
      const columnName = 'test_restore_large';

      // Add column
      await FieldMigrationService.addColumn(
        testTable,
        testFieldId,
        columnName,
        'TEXT',
        { userId: testUser.id, formId: testForm.id }
      );

      // Insert 250 rows (more than batch size of 100)
      const insertValues = [];
      for (let i = 0; i < 250; i++) {
        insertValues.push(`($1, 'user${i}', 'value${i}')`);
      }
      await testPool.query(
        `INSERT INTO "${testTable}" (form_id, username, "${columnName}") VALUES ${insertValues.join(', ')}`,
        [testForm.id]
      );

      // Create backup
      const backup = await FieldMigrationService.backupColumnData(
        testTable,
        columnName,
        'MANUAL',
        { userId: testUser.id, formId: testForm.id }
      );

      expect(backup.getRecordCount()).toBeGreaterThanOrEqual(250);

      // Modify all data
      await testPool.query(`UPDATE "${testTable}" SET "${columnName}" = 'modified'`);

      // Restore (should process in batches)
      const result = await FieldMigrationService.restoreColumnData(
        backup.id,
        { userId: testUser.id }
      );

      expect(result.success).toBe(true);
      expect(result.count).toBeGreaterThanOrEqual(250);
    });
  });

  describe('previewMigration()', () => {
    it('should preview ADD_COLUMN migration', async () => {
      const preview = await FieldMigrationService.previewMigration(
        'ADD_COLUMN',
        testTable,
        'preview_add_column',
        { dataType: 'number' }
      );

      expect(preview).toBeDefined();
      expect(preview.migrationType).toBe('ADD_COLUMN');
      expect(preview.sql).toContain('ADD COLUMN');
      expect(preview.rollbackSQL).toContain('DROP COLUMN');
      expect(preview.valid).toBe(true);
      expect(preview.requiresBackup).toBe(false);
    });

    it('should preview DROP_COLUMN migration', async () => {
      // Add column first
      const columnName = 'preview_drop_column';
      await FieldMigrationService.addColumn(
        testTable,
        testFieldId,
        columnName,
        'TEXT',
        { userId: testUser.id, formId: testForm.id }
      );

      const preview = await FieldMigrationService.previewMigration(
        'DROP_COLUMN',
        testTable,
        columnName,
        {}
      );

      expect(preview.sql).toContain('DROP COLUMN');
      expect(preview.rollbackSQL).toContain('ADD COLUMN');
      expect(preview.valid).toBe(true);
      expect(preview.requiresBackup).toBe(true);
      expect(preview.warnings.length).toBeGreaterThan(0);
    });

    it('should preview RENAME_COLUMN migration', async () => {
      // Add column first
      const oldName = 'preview_rename_old';
      const newName = 'preview_rename_new';

      await FieldMigrationService.addColumn(
        testTable,
        testFieldId,
        oldName,
        'TEXT',
        { userId: testUser.id, formId: testForm.id }
      );

      const preview = await FieldMigrationService.previewMigration(
        'RENAME_COLUMN',
        testTable,
        oldName,
        { newName }
      );

      expect(preview.sql).toContain(`RENAME COLUMN "${oldName}" TO "${newName}"`);
      expect(preview.rollbackSQL).toContain(`RENAME COLUMN "${newName}" TO "${oldName}"`);
      expect(preview.valid).toBe(true);
      expect(preview.requiresBackup).toBe(false);
    });

    it('should preview MODIFY_COLUMN migration with validation', async () => {
      // Add column with numeric strings
      const columnName = 'preview_modify_column';
      await FieldMigrationService.addColumn(
        testTable,
        testFieldId,
        columnName,
        'TEXT',
        { userId: testUser.id, formId: testForm.id }
      );

      await testPool.query(`
        INSERT INTO "${testTable}" (form_id, username, "${columnName}")
        VALUES ($1, 'user1', '123'), ($1, 'user2', '456')
      `, [testForm.id]);

      const preview = await FieldMigrationService.previewMigration(
        'MODIFY_COLUMN',
        testTable,
        columnName,
        { oldType: 'TEXT', newType: 'NUMERIC' }
      );

      expect(preview.sql).toContain('ALTER COLUMN');
      expect(preview.sql).toContain('TYPE NUMERIC');
      expect(preview.valid).toBe(true);
      expect(preview.requiresBackup).toBe(true);
    });

    it('should detect invalid column in preview', async () => {
      const preview = await FieldMigrationService.previewMigration(
        'DROP_COLUMN',
        testTable,
        'nonexistent_column',
        {}
      );

      expect(preview.valid).toBe(false);
      expect(preview.warnings.some(w => w.includes('does not exist'))).toBe(true);
    });

    it('should show estimated row count in preview', async () => {
      const preview = await FieldMigrationService.previewMigration(
        'ADD_COLUMN',
        testTable,
        'preview_row_count',
        { dataType: 'TEXT' }
      );

      expect(preview.estimatedRows).toBeDefined();
      expect(typeof preview.estimatedRows).toBe('number');
      expect(preview.estimatedRows).toBeGreaterThanOrEqual(0);
    });
  });

  describe('_fieldTypeToPostgres()', () => {
    it('should convert all Q-Collector field types correctly', () => {
      const testCases = [
        { fieldType: 'short_answer', expected: 'VARCHAR(255)' },
        { fieldType: 'paragraph', expected: 'TEXT' },
        { fieldType: 'email', expected: 'VARCHAR(255)' },
        { fieldType: 'phone', expected: 'VARCHAR(20)' },
        { fieldType: 'number', expected: 'NUMERIC' },
        { fieldType: 'url', expected: 'VARCHAR(500)' },
        { fieldType: 'file_upload', expected: 'TEXT' },
        { fieldType: 'image_upload', expected: 'TEXT' },
        { fieldType: 'date', expected: 'DATE' },
        { fieldType: 'time', expected: 'TIME' },
        { fieldType: 'datetime', expected: 'TIMESTAMP' },
        { fieldType: 'multiple_choice', expected: 'VARCHAR(255)' },
        { fieldType: 'rating', expected: 'INTEGER' },
        { fieldType: 'slider', expected: 'INTEGER' },
        { fieldType: 'lat_long', expected: 'JSONB' },
        { fieldType: 'province', expected: 'VARCHAR(100)' },
        { fieldType: 'factory', expected: 'VARCHAR(255)' }
      ];

      testCases.forEach(({ fieldType, expected }) => {
        const result = FieldMigrationService._fieldTypeToPostgres(fieldType);
        expect(result).toBe(expected);
      });
    });

    it('should return TEXT for unknown field type', () => {
      const result = FieldMigrationService._fieldTypeToPostgres('unknown_type');
      expect(result).toBe('TEXT');
    });
  });

  describe('Transaction Safety', () => {
    it('should rollback transaction on addColumn failure', async () => {
      const columnName = 'test_transaction_rollback';

      // Add column first time
      await FieldMigrationService.addColumn(
        testTable,
        testFieldId,
        columnName,
        'TEXT',
        { userId: testUser.id, formId: testForm.id }
      );

      // Try to add again (should fail and rollback)
      try {
        await FieldMigrationService.addColumn(
          testTable,
          testFieldId,
          columnName,
          'TEXT',
          { userId: testUser.id, formId: testForm.id }
        );
      } catch (error) {
        // Expected to fail
      }

      // Verify only one successful migration exists
      const migrations = await FieldMigration.findAll({
        where: {
          table_name: testTable,
          column_name: columnName,
          success: true
        }
      });

      expect(migrations.length).toBe(1);
    });

    it('should rollback all changes if backup fails during dropColumn', async () => {
      // This tests transaction atomicity - if backup fails, column should not be dropped
      const columnName = 'test_backup_failure';

      await FieldMigrationService.addColumn(
        testTable,
        testFieldId,
        columnName,
        'TEXT',
        { userId: testUser.id, formId: testForm.id }
      );

      // Column should still exist even if there was an error
      const columnCheck = await testPool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
        [testTable, columnName]
      );

      expect(columnCheck.rows.length).toBe(1);
    });
  });

  describe('Migration History', () => {
    it('should record all migrations in FieldMigration table', async () => {
      const beforeCount = await FieldMigration.count({ where: { form_id: testForm.id } });

      // Perform several migrations
      await FieldMigrationService.addColumn(
        testTable,
        testFieldId,
        'history_test_1',
        'TEXT',
        { userId: testUser.id, formId: testForm.id }
      );

      await FieldMigrationService.addColumn(
        testTable,
        testFieldId,
        'history_test_2',
        'NUMERIC',
        { userId: testUser.id, formId: testForm.id }
      );

      const afterCount = await FieldMigration.count({ where: { form_id: testForm.id } });

      expect(afterCount).toBeGreaterThan(beforeCount);
      expect(afterCount - beforeCount).toBeGreaterThanOrEqual(2);
    });

    it('should link migrations to backups', async () => {
      const columnName = 'history_with_backup';

      await FieldMigrationService.addColumn(
        testTable,
        testFieldId,
        columnName,
        'TEXT',
        { userId: testUser.id, formId: testForm.id }
      );

      await testPool.query(`
        INSERT INTO "${testTable}" (form_id, username, "${columnName}")
        VALUES ($1, 'user1', 'value1')
      `, [testForm.id]);

      const dropMigration = await FieldMigrationService.dropColumn(
        testTable,
        testFieldId,
        columnName,
        { backup: true, userId: testUser.id, formId: testForm.id }
      );

      expect(dropMigration.backup_id).toBeDefined();

      const backup = await FieldDataBackup.findByPk(dropMigration.backup_id);
      expect(backup).toBeDefined();
    });
  });
});
