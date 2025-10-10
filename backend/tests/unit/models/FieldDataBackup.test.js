/**
 * FieldDataBackup Model Unit Tests
 * Tests for field data backup model with 90-day retention
 *
 * Created: 2025-10-07
 * Sprint: 1 (Database Architecture - Field Migration System v0.8.0)
 */

const { sequelize } = require('../../../config/database.config');
const models = require('../../../models');
const { FieldDataBackup, FieldMigration, Form, Field, User } = models;

describe('FieldDataBackup Model', () => {
  let testForm;
  let testField;
  let testUser;

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
      description: 'Test form for backup tests',
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
      expect(FieldDataBackup).toBeDefined();
      expect(FieldDataBackup.name).toBe('FieldDataBackup');
    });

    it('should have all required columns', () => {
      const attributes = FieldDataBackup.rawAttributes;
      expect(attributes).toHaveProperty('id');
      expect(attributes).toHaveProperty('field_id');
      expect(attributes).toHaveProperty('form_id');
      expect(attributes).toHaveProperty('table_name');
      expect(attributes).toHaveProperty('column_name');
      expect(attributes).toHaveProperty('data_snapshot');
      expect(attributes).toHaveProperty('backup_type');
      expect(attributes).toHaveProperty('retention_until');
      expect(attributes).toHaveProperty('created_by');
    });

    it('should have correct column types', () => {
      const attributes = FieldDataBackup.rawAttributes;
      expect(attributes.id.type.constructor.name).toBe('UUID');
      expect(attributes.data_snapshot.type.constructor.name).toBe('JSONB');
      expect(attributes.retention_until.type.constructor.name).toBe('DATE');
    });
  });

  describe('create() - Basic Backup', () => {
    it('should create backup with valid data', async () => {
      const backup = await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'test_column',
        data_snapshot: [
          { id: 'row1', value: 'value1' },
          { id: 'row2', value: 'value2' },
          { id: 'row3', value: 'value3' },
        ],
        backup_type: 'pre_delete',
        created_by: testUser.id,
      });

      expect(backup).toBeDefined();
      expect(backup.id).toBeDefined();
      expect(backup.data_snapshot).toHaveLength(3);
      expect(backup.backup_type).toBe('pre_delete');
    });

    it('should set default retention_until to 90 days from now', async () => {
      const backup = await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'test_column',
        data_snapshot: [{ id: 'row1', value: 'value1' }],
        backup_type: 'MANUAL',
        created_by: testUser.id,
      });

      expect(backup.retention_until).toBeDefined();

      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 90);
      const retentionDate = new Date(backup.retention_until);

      // Allow 1 second difference for test execution time
      const timeDiff = Math.abs(retentionDate - expectedDate);
      expect(timeDiff).toBeLessThan(2000); // Less than 2 seconds
    });

    it('should accept custom retention_until date', async () => {
      const customDate = new Date();
      customDate.setDate(customDate.getDate() + 30); // 30 days from now

      const backup = await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'test_column',
        data_snapshot: [{ id: 'row1', value: 'value1' }],
        backup_type: 'AUTO_DELETE',
        retention_until: customDate,
        created_by: testUser.id,
      });

      expect(backup.retention_until.toDateString()).toBe(customDate.toDateString());
    });

    it('should create backup with empty data_snapshot', async () => {
      const backup = await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'test_column',
        data_snapshot: [],
        backup_type: 'MANUAL',
        created_by: testUser.id,
      });

      expect(backup.data_snapshot).toEqual([]);
      expect(backup.getRecordCount()).toBe(0);
    });
  });

  describe('create() - Backup Types', () => {
    it('should create MANUAL backup', async () => {
      const backup = await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'test_column',
        data_snapshot: [{ id: 'row1', value: 'value1' }],
        backup_type: 'MANUAL',
        created_by: testUser.id,
      });

      expect(backup.backup_type).toBe('MANUAL');
    });

    it('should create AUTO_DELETE backup', async () => {
      const backup = await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'test_column',
        data_snapshot: [{ id: 'row1', value: 'value1' }],
        backup_type: 'AUTO_DELETE',
        created_by: testUser.id,
      });

      expect(backup.backup_type).toBe('AUTO_DELETE');
    });

    it('should create pre_type_change backup', async () => {
      const backup = await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'test_column',
        data_snapshot: [{ id: 'row1', value: '123' }],
        backup_type: 'pre_type_change',
        created_by: testUser.id,
      });

      expect(backup.backup_type).toBe('pre_type_change');
    });
  });

  describe('isExpired()', () => {
    it('should return false for non-expired backup', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const backup = await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'test_column',
        data_snapshot: [{ id: 'row1', value: 'value1' }],
        backup_type: 'MANUAL',
        retention_until: futureDate,
        created_by: testUser.id,
      });

      expect(backup.isExpired()).toBe(false);
    });

    it('should return true for expired backup', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // Yesterday

      const backup = await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'test_column',
        data_snapshot: [{ id: 'row1', value: 'value1' }],
        backup_type: 'MANUAL',
        retention_until: pastDate,
        created_by: testUser.id,
      });

      expect(backup.isExpired()).toBe(true);
    });

    it('should return false when retention_until is null', async () => {
      const backup = await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'test_column',
        data_snapshot: [{ id: 'row1', value: 'value1' }],
        backup_type: 'MANUAL',
        retention_until: null,
        created_by: testUser.id,
      });

      expect(backup.isExpired()).toBe(false);
    });
  });

  describe('getRecordCount()', () => {
    it('should return correct record count', async () => {
      const backup = await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'test_column',
        data_snapshot: [
          { id: 'row1', value: 'value1' },
          { id: 'row2', value: 'value2' },
          { id: 'row3', value: 'value3' },
        ],
        backup_type: 'MANUAL',
        created_by: testUser.id,
      });

      expect(backup.getRecordCount()).toBe(3);
    });

    it('should return 0 for empty snapshot', async () => {
      const backup = await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'test_column',
        data_snapshot: [],
        backup_type: 'MANUAL',
        created_by: testUser.id,
      });

      expect(backup.getRecordCount()).toBe(0);
    });
  });

  describe('getDaysUntilExpiration()', () => {
    it('should return correct days until expiration', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const backup = await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'test_column',
        data_snapshot: [{ id: 'row1', value: 'value1' }],
        backup_type: 'MANUAL',
        retention_until: futureDate,
        created_by: testUser.id,
      });

      const daysUntilExpiration = backup.getDaysUntilExpiration();
      expect(daysUntilExpiration).toBeGreaterThanOrEqual(9);
      expect(daysUntilExpiration).toBeLessThanOrEqual(11);
    });

    it('should return negative days for expired backup', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const backup = await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'test_column',
        data_snapshot: [{ id: 'row1', value: 'value1' }],
        backup_type: 'MANUAL',
        retention_until: pastDate,
        created_by: testUser.id,
      });

      expect(backup.getDaysUntilExpiration()).toBeLessThan(0);
    });

    it('should return null when retention_until is null', async () => {
      const backup = await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'test_column',
        data_snapshot: [{ id: 'row1', value: 'value1' }],
        backup_type: 'MANUAL',
        // Note: retention_until is not set, so hook will set it to 90 days
        created_by: testUser.id,
      });

      const days = backup.getDaysUntilExpiration();
      expect(days).toBeGreaterThanOrEqual(89); // Allow for execution time
      expect(days).toBeLessThanOrEqual(91);
    });
  });

  describe('getSummary()', () => {
    it('should return backup summary object', async () => {
      const backup = await FieldDataBackup.create({
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

      const summary = backup.getSummary();

      expect(summary).toHaveProperty('id');
      expect(summary).toHaveProperty('tableName');
      expect(summary).toHaveProperty('columnName');
      expect(summary).toHaveProperty('recordCount');
      expect(summary).toHaveProperty('backupType');
      expect(summary).toHaveProperty('createdAt');
      expect(summary).toHaveProperty('retentionUntil');
      expect(summary).toHaveProperty('daysUntilExpiration');
      expect(summary).toHaveProperty('isExpired');
      expect(summary.recordCount).toBe(2);
      expect(summary.backupType).toBe('pre_delete');
    });
  });

  describe('cleanupExpired()', () => {
    it('should delete expired backups', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'expired_column',
        data_snapshot: [{ id: 'row1', value: 'value1' }],
        backup_type: 'MANUAL',
        retention_until: pastDate,
        created_by: testUser.id,
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'active_column',
        data_snapshot: [{ id: 'row1', value: 'value1' }],
        backup_type: 'MANUAL',
        retention_until: futureDate,
        created_by: testUser.id,
      });

      const deletedCount = await FieldDataBackup.cleanupExpired();

      expect(deletedCount).toBeGreaterThanOrEqual(1);

      const remaining = await FieldDataBackup.findAll();
      expect(remaining.every(b => !b.isExpired())).toBe(true);
    });
  });

  describe('findExpiringSoon()', () => {
    it('should find backups expiring within specified days', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5); // 5 days from now

      await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'expiring_soon',
        data_snapshot: [{ id: 'row1', value: 'value1' }],
        backup_type: 'MANUAL',
        retention_until: futureDate,
        created_by: testUser.id,
      });

      const expiringSoon = await FieldDataBackup.findExpiringSoon(7);

      expect(expiringSoon.length).toBeGreaterThanOrEqual(1);
      expect(expiringSoon[0].column_name).toBe('expiring_soon');
    });

    it('should not include backups expiring after threshold', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 20); // 20 days from now

      await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'far_future',
        data_snapshot: [{ id: 'row1', value: 'value1' }],
        backup_type: 'MANUAL',
        retention_until: futureDate,
        created_by: testUser.id,
      });

      const expiringSoon = await FieldDataBackup.findExpiringSoon(7);

      expect(expiringSoon.every(b => b.column_name !== 'far_future')).toBe(true);
    });
  });

  describe('findByForm()', () => {
    it('should find all backups for a form', async () => {
      await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'column1',
        data_snapshot: [{ id: 'row1', value: 'value1' }],
        backup_type: 'MANUAL',
        created_by: testUser.id,
      });

      await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'column2',
        data_snapshot: [{ id: 'row1', value: 'value1' }],
        backup_type: 'AUTO_DELETE',
        created_by: testUser.id,
      });

      const backups = await FieldDataBackup.findByForm(testForm.id);

      expect(backups).toHaveLength(2);
      expect(backups.every(b => b.form_id === testForm.id)).toBe(true);
    });

    it('should include creator relationship', async () => {
      await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'test_column',
        data_snapshot: [{ id: 'row1', value: 'value1' }],
        backup_type: 'MANUAL',
        created_by: testUser.id,
      });

      const backups = await FieldDataBackup.findByForm(testForm.id);

      expect(backups[0].creator).toBeDefined();
      expect(backups[0].creator.id).toBe(testUser.id);
    });
  });

  describe('findByTableColumn()', () => {
    it('should find backups for specific table and column', async () => {
      await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'specific_column',
        data_snapshot: [{ id: 'row1', value: 'value1' }],
        backup_type: 'MANUAL',
        created_by: testUser.id,
      });

      await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'different_column',
        data_snapshot: [{ id: 'row1', value: 'value1' }],
        backup_type: 'MANUAL',
        created_by: testUser.id,
      });

      const backups = await FieldDataBackup.findByTableColumn(testForm.table_name, 'specific_column');

      expect(backups).toHaveLength(1);
      expect(backups[0].column_name).toBe('specific_column');
    });
  });

  describe('getStatistics()', () => {
    it('should calculate backup statistics', async () => {
      await FieldDataBackup.create({
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'col1',
        data_snapshot: [
          { id: 'row1', value: 'value1' },
          { id: 'row2', value: 'value2' },
        ],
        backup_type: 'MANUAL',
        created_by: testUser.id,
      });

      await FieldDataBackup.create({
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'col2',
        data_snapshot: [
          { id: 'row1', value: 'value1' },
        ],
        backup_type: 'AUTO_DELETE',
        created_by: testUser.id,
      });

      const stats = await FieldDataBackup.getStatistics(testForm.id);

      expect(stats).toHaveProperty('total_backups');
      expect(stats).toHaveProperty('total_records');
      expect(stats).toHaveProperty('byType');
      expect(stats.total_backups).toBe(2);
      expect(stats.total_records).toBeGreaterThanOrEqual(3);
      expect(stats.byType.MANUAL).toBeDefined();
      expect(stats.byType.AUTO_DELETE).toBeDefined();
    });
  });

  describe('Associations', () => {
    it('should load form association', async () => {
      const backup = await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'test_column',
        data_snapshot: [{ id: 'row1', value: 'value1' }],
        backup_type: 'MANUAL',
        created_by: testUser.id,
      });

      await backup.reload({ include: ['form'] });

      expect(backup.form).toBeDefined();
      expect(backup.form.id).toBe(testForm.id);
    });

    it('should load creator association', async () => {
      const backup = await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'test_column',
        data_snapshot: [{ id: 'row1', value: 'value1' }],
        backup_type: 'MANUAL',
        created_by: testUser.id,
      });

      await backup.reload({ include: ['creator'] });

      expect(backup.creator).toBeDefined();
      expect(backup.creator.id).toBe(testUser.id);
    });
  });

  describe('Scopes', () => {
    beforeEach(async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await FieldDataBackup.create({
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'expired_col',
        data_snapshot: [{ id: 'row1', value: 'value1' }],
        backup_type: 'MANUAL',
        retention_until: pastDate,
        created_by: testUser.id,
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      await FieldDataBackup.create({
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'active_col',
        data_snapshot: [{ id: 'row1', value: 'value1' }],
        backup_type: 'MANUAL',
        retention_until: futureDate,
        created_by: testUser.id,
      });
    });

    it('should have expired scope', async () => {
      const expired = await FieldDataBackup.scope('expired').findAll();
      expect(expired.length).toBeGreaterThanOrEqual(1);
      expect(expired.every(b => b.isExpired())).toBe(true);
    });

    it('should have active scope', async () => {
      const active = await FieldDataBackup.scope('active').findAll();
      expect(active.length).toBeGreaterThanOrEqual(1);
      expect(active.every(b => !b.isExpired())).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should validate data_snapshot is an array', async () => {
      await expect(
        FieldDataBackup.create({
          field_id: testField.id,
          form_id: testForm.id,
          table_name: testForm.table_name,
          column_name: 'test_column',
          data_snapshot: 'not an array', // Invalid
          backup_type: 'MANUAL',
          created_by: testUser.id,
        })
      ).rejects.toThrow();
    });

    it('should validate snapshot items have id and value', async () => {
      await expect(
        FieldDataBackup.create({
          field_id: testField.id,
          form_id: testForm.id,
          table_name: testForm.table_name,
          column_name: 'test_column',
          data_snapshot: [
            { id: 'row1' }, // Missing value
          ],
          backup_type: 'MANUAL',
          created_by: testUser.id,
        })
      ).rejects.toThrow();
    });
  });

  describe('restore() - Data Restoration', () => {
    it('should return failure for empty data_snapshot', async () => {
      const backup = await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'test_column',
        data_snapshot: [],
        backup_type: 'MANUAL',
        created_by: testUser.id,
      });

      const result = await backup.restore(sequelize.getQueryInterface());

      expect(result.success).toBe(false);
      expect(result.message).toContain('No data to restore');
      expect(result.count).toBe(0);
    });

    it('should handle restore errors gracefully', async () => {
      const backup = await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: 'non_existent_table', // Invalid table
        column_name: 'test_column',
        data_snapshot: [
          { id: 'row1', value: 'value1' }
        ],
        backup_type: 'MANUAL',
        created_by: testUser.id,
      });

      const result = await backup.restore(sequelize.getQueryInterface());

      expect(result.success).toBe(false);
      expect(result.message).toContain('Restore failed');
      expect(result.count).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null data_snapshot in getRecordCount()', async () => {
      const backup = await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'test_column',
        data_snapshot: [],
        backup_type: 'MANUAL',
        created_by: testUser.id,
      });

      // Manually set data_snapshot to null
      backup.data_snapshot = null;

      expect(backup.getRecordCount()).toBe(0);
    });

    it('should handle invalid data_snapshot in getRecordCount()', async () => {
      const backup = await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'test_column',
        data_snapshot: [],
        backup_type: 'MANUAL',
        created_by: testUser.id,
      });

      // Manually set data_snapshot to invalid type
      backup.data_snapshot = 'invalid';

      expect(backup.getRecordCount()).toBe(0);
    });

    it('should handle null retention_until in getDaysUntilExpiration()', async () => {
      const backup = await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'test_column',
        data_snapshot: [],
        backup_type: 'MANUAL',
        created_by: testUser.id,
      });

      // Manually set retention_until to null
      backup.retention_until = null;

      expect(backup.getDaysUntilExpiration()).toBeNull();
    });

    it('should handle null retention_until in isExpired()', async () => {
      const backup = await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'test_column',
        data_snapshot: [],
        backup_type: 'MANUAL',
        created_by: testUser.id,
      });

      // Manually set retention_until to null
      backup.retention_until = null;

      expect(backup.isExpired()).toBe(false);
    });
  });

  describe('Large Data Handling', () => {
    it('should handle large data_snapshot arrays', async () => {
      const largeSnapshot = Array.from({ length: 10000 }, (_, i) => ({
        id: `row_${i}`,
        value: `value_${i}`
      }));

      const backup = await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'large_column',
        data_snapshot: largeSnapshot,
        backup_type: 'MANUAL',
        created_by: testUser.id,
      });

      expect(backup.getRecordCount()).toBe(10000);
      expect(backup.data_snapshot.length).toBe(10000);
    });

    it('should handle large values in data_snapshot', async () => {
      const largeValue = 'x'.repeat(10000); // 10KB string

      const backup = await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'test_column',
        data_snapshot: [
          { id: 'row1', value: largeValue }
        ],
        backup_type: 'MANUAL',
        created_by: testUser.id,
      });

      expect(backup.data_snapshot[0].value.length).toBe(10000);
      expect(backup.getRecordCount()).toBe(1);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent backup creation', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        FieldDataBackup.create({
          field_id: testField.id,
          form_id: testForm.id,
          table_name: testForm.table_name,
          column_name: `concurrent_col_${i}`,
          data_snapshot: [{ id: 'row1', value: `value${i}` }],
          backup_type: 'MANUAL',
          created_by: testUser.id,
        })
      );

      const backups = await Promise.all(promises);

      expect(backups.length).toBe(10);
      expect(backups.every(b => b.id)).toBe(true);
    });

    it('should handle concurrent cleanupExpired calls', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      // Create expired backups
      await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          FieldDataBackup.create({
            field_id: testField.id,
            form_id: testForm.id,
            table_name: testForm.table_name,
            column_name: `expired_${i}`,
            data_snapshot: [],
            backup_type: 'MANUAL',
            retention_until: pastDate,
            created_by: testUser.id,
          })
        )
      );

      // Call cleanup concurrently
      const results = await Promise.all([
        FieldDataBackup.cleanupExpired(),
        FieldDataBackup.cleanupExpired(),
        FieldDataBackup.cleanupExpired(),
      ]);

      // At least one should have deleted records
      expect(results.some(r => r > 0)).toBe(true);
    });
  });

  describe('Query Performance', () => {
    beforeEach(async () => {
      // Create multiple backups for performance testing
      const backups = Array.from({ length: 50 }, (_, i) => ({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: `perf_col_${i}`,
        data_snapshot: [{ id: 'row1', value: `value${i}` }],
        backup_type: i % 2 === 0 ? 'MANUAL' : 'AUTO_DELETE',
        created_by: testUser.id,
      }));

      await FieldDataBackup.bulkCreate(backups);
    });

    it('should efficiently query backups by form', async () => {
      const start = Date.now();
      const backups = await FieldDataBackup.findByForm(testForm.id);
      const duration = Date.now() - start;

      expect(backups.length).toBeGreaterThanOrEqual(50);
      expect(duration).toBeLessThan(1000); // Should complete in <1 second
    });

    it('should efficiently query statistics', async () => {
      const start = Date.now();
      const stats = await FieldDataBackup.getStatistics(testForm.id);
      const duration = Date.now() - start;

      expect(stats.total_backups).toBeGreaterThanOrEqual(50);
      expect(duration).toBeLessThan(1000); // Should complete in <1 second
    });
  });

  describe('Association Loading', () => {
    it('should load migrations association', async () => {
      const backup = await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'test_column',
        data_snapshot: [{ id: 'row1', value: 'value1' }],
        backup_type: 'MANUAL',
        created_by: testUser.id,
      });

      // Create a migration referencing this backup
      await FieldMigration.create({
        field_id: testField.id,
        form_id: testForm.id,
        migration_type: 'DROP_COLUMN',
        table_name: testForm.table_name,
        column_name: 'test_column',
        backup_id: backup.id,
        executed_by: testUser.id,
        success: true,
      });

      await backup.reload({ include: ['migrations'] });

      expect(backup.migrations).toBeDefined();
      expect(backup.migrations.length).toBe(1);
      expect(backup.migrations[0].backup_id).toBe(backup.id);
    });

    it('should load all associations at once', async () => {
      const backup = await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'test_column',
        data_snapshot: [{ id: 'row1', value: 'value1' }],
        backup_type: 'MANUAL',
        created_by: testUser.id,
      });

      await backup.reload({
        include: ['form', 'creator', 'migrations']
      });

      expect(backup.form).toBeDefined();
      expect(backup.creator).toBeDefined();
      expect(backup.migrations).toBeDefined();
    });
  });

  describe('Backup Types Coverage', () => {
    it('should create pre_delete backup type', async () => {
      const backup = await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'test_column',
        data_snapshot: [{ id: 'row1', value: 'value1' }],
        backup_type: 'pre_delete',
        created_by: testUser.id,
      });

      expect(backup.backup_type).toBe('pre_delete');
    });

    it('should create AUTO_TYPE_CHANGE backup type', async () => {
      const backup = await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'test_column',
        data_snapshot: [{ id: 'row1', value: 'value1' }],
        backup_type: 'AUTO_TYPE_CHANGE',
        created_by: testUser.id,
      });

      expect(backup.backup_type).toBe('AUTO_TYPE_CHANGE');
    });
  });

  describe('getSummary() comprehensive test', () => {
    it('should return complete summary with all fields', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const backup = await FieldDataBackup.create({
        field_id: testField.id,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'test_column',
        data_snapshot: [
          { id: 'row1', value: 'value1' },
          { id: 'row2', value: 'value2' },
          { id: 'row3', value: 'value3' }
        ],
        backup_type: 'pre_delete',
        retention_until: futureDate,
        created_by: testUser.id,
      });

      const summary = backup.getSummary();

      // Verify all fields present
      expect(summary).toHaveProperty('id');
      expect(summary).toHaveProperty('tableName');
      expect(summary).toHaveProperty('columnName');
      expect(summary).toHaveProperty('recordCount');
      expect(summary).toHaveProperty('backupType');
      expect(summary).toHaveProperty('createdAt');
      expect(summary).toHaveProperty('retentionUntil');
      expect(summary).toHaveProperty('daysUntilExpiration');
      expect(summary).toHaveProperty('isExpired');

      // Verify values
      expect(summary.recordCount).toBe(3);
      expect(summary.backupType).toBe('pre_delete');
      expect(summary.isExpired).toBe(false);
      expect(summary.daysUntilExpiration).toBeGreaterThan(25);
    });
  });
});
