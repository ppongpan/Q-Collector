/**
 * FieldMigration Model Unit Tests
 * Tests for field migration tracking model
 *
 * Created: 2025-10-07
 * Sprint: 1 (Database Architecture - Field Migration System v0.8.0)
 */

const { sequelize } = require('../../../config/database.config');
const models = require('../../../models');
const { FieldMigration, FieldDataBackup, Form, Field, User } = models;

describe('FieldMigration Model', () => {
  let testForm;
  let testField;
  let testUser;
  let testBackup;

  beforeAll(async () => {
    // Ensure database connection is established
    await sequelize.authenticate();
  });

  beforeEach(async () => {
    // Create test data
    testUser = await User.create({
      username: `testuser${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password_hash: 'hashedpassword123',
      role: 'super_admin',
      is_active: true,
    });

    testForm = await Form.create({
      title: `Test Form ${Date.now()}`,
      description: 'Test form for field migration tests',
      roles_allowed: ['general_user'],
      settings: {},
      created_by: testUser.id,
      is_active: true,
      table_name: `test_form_${Date.now()}`,
    });

    testField = await Field.create({
      form_id: testForm.id,
      type: 'short_answer',
      title: 'Test Field',
      placeholder: 'Enter value',
      required: false,
      order: 1,
      options: {},
      validation_rules: {},
    });

    testBackup = await FieldDataBackup.create({
      field_id: testField.id,
      form_id: testForm.id,
      table_name: testForm.table_name,
      column_name: 'test_column',
      data_snapshot: [
        { id: 'row1', value: 'value1' },
        { id: 'row2', value: 'value2' },
      ],
      backup_type: 'pre_delete',
      created_by: testUser.id,
    });
  });

  afterEach(async () => {
    // Clean up test data
    await FieldMigration.destroy({ where: {} });
    await FieldDataBackup.destroy({ where: {} });
    await Field.destroy({ where: {} });
    await Form.destroy({ where: {} });
    await User.destroy({ where: {} });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Model Definition', () => {
    it('should be defined', () => {
      expect(FieldMigration).toBeDefined();
      expect(FieldMigration.name).toBe('FieldMigration');
    });

    it('should have all required columns', () => {
      const attributes = FieldMigration.rawAttributes;
      expect(attributes).toHaveProperty('id');
      expect(attributes).toHaveProperty('field_id');
      expect(attributes).toHaveProperty('form_id');
      expect(attributes).toHaveProperty('migration_type');
      expect(attributes).toHaveProperty('table_name');
      expect(attributes).toHaveProperty('column_name');
      expect(attributes).toHaveProperty('old_value');
      expect(attributes).toHaveProperty('new_value');
      expect(attributes).toHaveProperty('backup_id');
      expect(attributes).toHaveProperty('executed_by');
      expect(attributes).toHaveProperty('executed_at');
      expect(attributes).toHaveProperty('success');
      expect(attributes).toHaveProperty('error_message');
      expect(attributes).toHaveProperty('rollback_sql');
    });

    it('should have correct column types', () => {
      const attributes = FieldMigration.rawAttributes;
      expect(attributes.id.type.constructor.name).toBe('UUID');
      expect(attributes.migration_type.type.constructor.name).toContain('ENUM');
      expect(attributes.old_value.type.constructor.name).toBe('JSONB');
      expect(attributes.new_value.type.constructor.name).toBe('JSONB');
      expect(attributes.success.type.constructor.name).toBe('BOOLEAN');
    });
  });

  describe('create() - ADD_COLUMN Migration', () => {
    it('should create successful ADD_COLUMN migration', async () => {
      const migration = await FieldMigration.create({
        field_id: testField.id,
        form_id: testForm.id,
        migration_type: 'ADD_COLUMN',
        table_name: testForm.table_name,
        column_name: 'new_column',
        new_value: {
          type: 'VARCHAR(255)',
          nullable: true,
        },
        executed_by: testUser.id,
        success: true,
        rollback_sql: `ALTER TABLE "${testForm.table_name}" DROP COLUMN "new_column";`,
      });

      expect(migration).toBeDefined();
      expect(migration.id).toBeDefined();
      expect(migration.migration_type).toBe('ADD_COLUMN');
      expect(migration.success).toBe(true);
      expect(migration.column_name).toBe('new_column');
    });

    it('should create ADD_COLUMN migration with backup reference', async () => {
      const migration = await FieldMigration.create({
        field_id: testField.id,
        form_id: testForm.id,
        migration_type: 'ADD_COLUMN',
        table_name: testForm.table_name,
        column_name: 'new_column',
        backup_id: testBackup.id,
        executed_by: testUser.id,
        success: true,
        rollback_sql: 'ALTER TABLE test DROP COLUMN new_column;',
      });

      expect(migration.backup_id).toBe(testBackup.id);
    });
  });

  describe('create() - DROP_COLUMN Migration', () => {
    it('should create successful DROP_COLUMN migration with backup', async () => {
      const migration = await FieldMigration.create({
        field_id: testField.id,
        form_id: testForm.id,
        migration_type: 'DROP_COLUMN',
        table_name: testForm.table_name,
        column_name: 'old_column',
        old_value: {
          type: 'VARCHAR(255)',
          nullable: false,
          default: 'default_value',
        },
        backup_id: testBackup.id,
        executed_by: testUser.id,
        success: true,
        rollback_sql: `ALTER TABLE "${testForm.table_name}" ADD COLUMN "old_column" VARCHAR(255);`,
      });

      expect(migration).toBeDefined();
      expect(migration.migration_type).toBe('DROP_COLUMN');
      expect(migration.old_value).toBeDefined();
      expect(migration.old_value.type).toBe('VARCHAR(255)');
      expect(migration.backup_id).toBe(testBackup.id);
    });
  });

  describe('create() - MODIFY_COLUMN Migration', () => {
    it('should create MODIFY_COLUMN migration with old and new values', async () => {
      const migration = await FieldMigration.create({
        field_id: testField.id,
        form_id: testForm.id,
        migration_type: 'MODIFY_COLUMN',
        table_name: testForm.table_name,
        column_name: 'test_column',
        old_value: { type: 'VARCHAR(100)' },
        new_value: { type: 'TEXT' },
        executed_by: testUser.id,
        success: true,
        rollback_sql: `ALTER TABLE "${testForm.table_name}" ALTER COLUMN "test_column" TYPE VARCHAR(100);`,
      });

      expect(migration.old_value.type).toBe('VARCHAR(100)');
      expect(migration.new_value.type).toBe('TEXT');
    });
  });

  describe('create() - RENAME_COLUMN Migration', () => {
    it('should create successful RENAME_COLUMN migration', async () => {
      const migration = await FieldMigration.create({
        field_id: testField.id,
        form_id: testForm.id,
        migration_type: 'RENAME_COLUMN',
        table_name: testForm.table_name,
        column_name: 'new_name',
        old_value: { name: 'old_name' },
        executed_by: testUser.id,
        success: true,
        rollback_sql: `ALTER TABLE "${testForm.table_name}" RENAME COLUMN "new_name" TO "old_name";`,
      });

      expect(migration.migration_type).toBe('RENAME_COLUMN');
      expect(migration.old_value.name).toBe('old_name');
    });
  });

  describe('create() - Failed Migration', () => {
    it('should create failed migration with error message', async () => {
      const migration = await FieldMigration.create({
        field_id: testField.id,
        form_id: testForm.id,
        migration_type: 'ADD_COLUMN',
        table_name: testForm.table_name,
        column_name: 'failed_column',
        executed_by: testUser.id,
        success: false,
        error_message: 'Column already exists',
      });

      expect(migration.success).toBe(false);
      expect(migration.error_message).toBe('Column already exists');
      expect(migration.rollback_sql).toBeNull();
    });
  });

  describe('canRollback()', () => {
    it('should return true for successful migration with rollback SQL', async () => {
      const migration = await FieldMigration.create({
        field_id: null, // No field reference for rollbackable ADD_COLUMN
        form_id: testForm.id,
        migration_type: 'DROP_COLUMN', // Use DROP_COLUMN instead
        table_name: testForm.table_name,
        column_name: 'test_column',
        executed_by: testUser.id,
        success: true,
        rollback_sql: 'ALTER TABLE test ADD COLUMN test_column VARCHAR(255);',
      });

      expect(migration.canRollback()).toBe(true);
    });

    it('should return false for failed migration', async () => {
      const migration = await FieldMigration.create({
        field_id: testField.id,
        form_id: testForm.id,
        migration_type: 'ADD_COLUMN',
        table_name: testForm.table_name,
        executed_by: testUser.id,
        success: false,
        error_message: 'Migration failed',
      });

      expect(migration.canRollback()).toBe(false);
    });

    it('should return false for migration without rollback SQL', async () => {
      const migration = await FieldMigration.create({
        field_id: testField.id,
        form_id: testForm.id,
        migration_type: 'ADD_COLUMN',
        table_name: testForm.table_name,
        executed_by: testUser.id,
        success: true,
        rollback_sql: null,
      });

      expect(migration.canRollback()).toBe(false);
    });

    it('should return false for ADD_COLUMN with existing field', async () => {
      const migration = await FieldMigration.create({
        field_id: testField.id,
        form_id: testForm.id,
        migration_type: 'ADD_COLUMN',
        table_name: testForm.table_name,
        column_name: 'test_column',
        executed_by: testUser.id,
        success: true,
        rollback_sql: 'ALTER TABLE test DROP COLUMN test_column;',
      });

      expect(migration.canRollback()).toBe(false); // field_id is not null
    });
  });

  describe('getRollbackSQL()', () => {
    it('should return rollback SQL for rollbackable migration', async () => {
      const rollbackSQL = 'ALTER TABLE test DROP COLUMN test_column;';
      const migration = await FieldMigration.create({
        field_id: null, // No field reference
        form_id: testForm.id,
        migration_type: 'ADD_COLUMN',
        table_name: testForm.table_name,
        column_name: 'test_column',
        executed_by: testUser.id,
        success: true,
        rollback_sql: rollbackSQL,
      });

      expect(migration.getRollbackSQL()).toBe(rollbackSQL);
    });

    it('should return null for non-rollbackable migration', async () => {
      const migration = await FieldMigration.create({
        field_id: testField.id,
        form_id: testForm.id,
        migration_type: 'ADD_COLUMN',
        table_name: testForm.table_name,
        executed_by: testUser.id,
        success: false,
      });

      expect(migration.getRollbackSQL()).toBeNull();
    });
  });

  describe('getSummary()', () => {
    it('should return migration summary object', async () => {
      const migration = await FieldMigration.create({
        field_id: testField.id,
        form_id: testForm.id,
        migration_type: 'ADD_COLUMN',
        table_name: testForm.table_name,
        column_name: 'test_column',
        executed_by: testUser.id,
        success: true,
        rollback_sql: 'ALTER TABLE test DROP COLUMN test_column;',
      });

      const summary = migration.getSummary();

      expect(summary).toHaveProperty('id');
      expect(summary).toHaveProperty('type');
      expect(summary).toHaveProperty('tableName');
      expect(summary).toHaveProperty('columnName');
      expect(summary).toHaveProperty('success');
      expect(summary).toHaveProperty('executedAt');
      expect(summary).toHaveProperty('canRollback');
      expect(summary).toHaveProperty('hasBackup');
      expect(summary.type).toBe('ADD_COLUMN');
      expect(summary.success).toBe(true);
    });
  });

  describe('isRecent()', () => {
    it('should return true for migration created within 24 hours', async () => {
      const migration = await FieldMigration.create({
        field_id: testField.id,
        form_id: testForm.id,
        migration_type: 'ADD_COLUMN',
        table_name: testForm.table_name,
        executed_by: testUser.id,
        success: true,
      });

      expect(migration.isRecent()).toBe(true);
    });

    it('should return false for old migration', async () => {
      const migration = await FieldMigration.create({
        field_id: testField.id,
        form_id: testForm.id,
        migration_type: 'ADD_COLUMN',
        table_name: testForm.table_name,
        executed_by: testUser.id,
        success: true,
      });

      // Manually set old date
      migration.executed_at = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago

      expect(migration.isRecent()).toBe(false);
    });
  });

  describe('getDescription()', () => {
    it('should return description for ADD_COLUMN', async () => {
      const migration = await FieldMigration.create({
        field_id: testField.id,
        form_id: testForm.id,
        migration_type: 'ADD_COLUMN',
        table_name: testForm.table_name,
        column_name: 'test_column',
        executed_by: testUser.id,
        success: true,
      });

      const description = migration.getDescription();
      expect(description).toContain('Added column');
      expect(description).toContain('test_column');
      expect(description).toContain(testForm.table_name);
    });

    it('should include FAILED status for failed migration', async () => {
      const migration = await FieldMigration.create({
        field_id: testField.id,
        form_id: testForm.id,
        migration_type: 'DROP_COLUMN',
        table_name: testForm.table_name,
        column_name: 'test_column',
        executed_by: testUser.id,
        success: false,
        error_message: 'Column not found',
      });

      const description = migration.getDescription();
      expect(description).toContain('Removed column');
      expect(description).toContain('(FAILED)');
    });
  });

  describe('findByForm()', () => {
    it('should find all migrations for a form', async () => {
      await FieldMigration.create({
        field_id: testField.id,
        form_id: testForm.id,
        migration_type: 'ADD_COLUMN',
        table_name: testForm.table_name,
        executed_by: testUser.id,
        success: true,
      });

      await FieldMigration.create({
        field_id: testField.id,
        form_id: testForm.id,
        migration_type: 'DROP_COLUMN',
        table_name: testForm.table_name,
        executed_by: testUser.id,
        success: true,
      });

      const migrations = await FieldMigration.findByForm(testForm.id);

      expect(migrations).toHaveLength(2);
      expect(migrations[0].form_id).toBe(testForm.id);
    });

    it('should include executor relationship', async () => {
      await FieldMigration.create({
        field_id: testField.id,
        form_id: testForm.id,
        migration_type: 'ADD_COLUMN',
        table_name: testForm.table_name,
        executed_by: testUser.id,
        success: true,
      });

      const migrations = await FieldMigration.findByForm(testForm.id);

      expect(migrations[0].executor).toBeDefined();
      expect(migrations[0].executor.id).toBe(testUser.id);
    });
  });

  describe('findRecent()', () => {
    it('should find migrations from last 24 hours', async () => {
      await FieldMigration.create({
        field_id: testField.id,
        form_id: testForm.id,
        migration_type: 'ADD_COLUMN',
        table_name: testForm.table_name,
        executed_by: testUser.id,
        success: true,
      });

      const recentMigrations = await FieldMigration.findRecent();

      expect(recentMigrations.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getStatistics()', () => {
    it('should calculate migration statistics', async () => {
      await FieldMigration.create({
        form_id: testForm.id,
        migration_type: 'ADD_COLUMN',
        table_name: testForm.table_name,
        executed_by: testUser.id,
        success: true,
      });

      await FieldMigration.create({
        form_id: testForm.id,
        migration_type: 'ADD_COLUMN',
        table_name: testForm.table_name,
        executed_by: testUser.id,
        success: false,
        error_message: 'Failed',
      });

      await FieldMigration.create({
        form_id: testForm.id,
        migration_type: 'DROP_COLUMN',
        table_name: testForm.table_name,
        executed_by: testUser.id,
        success: true,
      });

      const stats = await FieldMigration.getStatistics(testForm.id);

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('successful');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('byType');
      expect(stats.total).toBe(3);
      expect(stats.successful).toBe(2);
      expect(stats.failed).toBe(1);
      expect(stats.byType.ADD_COLUMN).toBeDefined();
      expect(stats.byType.ADD_COLUMN.success).toBe(1);
      expect(stats.byType.ADD_COLUMN.failed).toBe(1);
    });
  });

  describe('Associations', () => {
    it('should load field association', async () => {
      const migration = await FieldMigration.create({
        field_id: testField.id,
        form_id: testForm.id,
        migration_type: 'ADD_COLUMN',
        table_name: testForm.table_name,
        executed_by: testUser.id,
        success: true,
      });

      await migration.reload({ include: ['field'] });

      expect(migration.field).toBeDefined();
      expect(migration.field.id).toBe(testField.id);
    });

    it('should load form association', async () => {
      const migration = await FieldMigration.create({
        field_id: testField.id,
        form_id: testForm.id,
        migration_type: 'ADD_COLUMN',
        table_name: testForm.table_name,
        executed_by: testUser.id,
        success: true,
      });

      await migration.reload({ include: ['form'] });

      expect(migration.form).toBeDefined();
      expect(migration.form.id).toBe(testForm.id);
    });

    it('should load backup association', async () => {
      const migration = await FieldMigration.create({
        field_id: testField.id,
        form_id: testForm.id,
        migration_type: 'DROP_COLUMN',
        table_name: testForm.table_name,
        backup_id: testBackup.id,
        executed_by: testUser.id,
        success: true,
      });

      await migration.reload({ include: ['backup'] });

      expect(migration.backup).toBeDefined();
      expect(migration.backup.id).toBe(testBackup.id);
    });

    it('should load executor association', async () => {
      const migration = await FieldMigration.create({
        field_id: testField.id,
        form_id: testForm.id,
        migration_type: 'ADD_COLUMN',
        table_name: testForm.table_name,
        executed_by: testUser.id,
        success: true,
      });

      await migration.reload({ include: ['executor'] });

      expect(migration.executor).toBeDefined();
      expect(migration.executor.id).toBe(testUser.id);
    });
  });

  describe('Scopes', () => {
    beforeEach(async () => {
      await FieldMigration.create({
        form_id: testForm.id,
        migration_type: 'ADD_COLUMN',
        table_name: testForm.table_name,
        executed_by: testUser.id,
        success: true,
        rollback_sql: 'ALTER TABLE test DROP COLUMN col;',
      });

      await FieldMigration.create({
        form_id: testForm.id,
        migration_type: 'DROP_COLUMN',
        table_name: testForm.table_name,
        executed_by: testUser.id,
        success: false,
      });
    });

    it('should have successful scope', async () => {
      const successful = await FieldMigration.scope('successful').findAll();
      expect(successful.length).toBeGreaterThanOrEqual(1);
      expect(successful.every(m => m.success === true)).toBe(true);
    });

    it('should have failed scope', async () => {
      const failed = await FieldMigration.scope('failed').findAll();
      expect(failed.length).toBeGreaterThanOrEqual(1);
      expect(failed.every(m => m.success === false)).toBe(true);
    });

    it('should have rollbackable scope', async () => {
      const rollbackable = await FieldMigration.scope('rollbackable').findAll();
      expect(rollbackable.every(m => m.success === true && m.rollback_sql !== null)).toBe(true);
    });
  });
});
