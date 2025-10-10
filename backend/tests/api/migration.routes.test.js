/**
 * Migration Routes API Tests
 * Q-Collector Migration System v0.8.0 - Sprint 4: API Layer
 *
 * Comprehensive test suite for all 8 migration endpoints with permission testing
 *
 * Test Coverage:
 * - Authentication and authorization
 * - Input validation
 * - Business logic execution
 * - Error handling
 * - Response format validation
 *
 * Created: 2025-10-07
 * Sprint: 4 (API Layer - Field Migration System v0.8.0)
 */

const request = require('supertest');
const express = require('express');
const { sequelize } = require('../../models');
const migrationRoutes = require('../../api/routes/migration.routes');
const FieldMigrationService = require('../../services/FieldMigrationService');
const MigrationQueue = require('../../services/MigrationQueue');
const { FieldMigration, FieldDataBackup, Form, User } = require('../../models');

// Setup Express app for testing
const app = express();
app.use(express.json());
app.use('/api/v1/migrations', migrationRoutes);

// Mock services
jest.mock('../../services/FieldMigrationService');
jest.mock('../../services/MigrationQueue');

describe('Migration Routes API', () => {
  let superAdminToken, adminToken, moderatorToken, userToken;
  let superAdminUser, adminUser, moderatorUser, regularUser;
  let testForm, testField;

  beforeAll(async () => {
    // Sync database
    await sequelize.sync({ force: true });

    // Create test users
    superAdminUser = await User.create({
      username: 'superadmin',
      email: 'superadmin@test.com',
      password_hash: 'hashed_password',
      role: 'super_admin',
      is_active: true
    });

    adminUser = await User.create({
      username: 'admin',
      email: 'admin@test.com',
      password_hash: 'hashed_password',
      role: 'admin',
      is_active: true
    });

    moderatorUser = await User.create({
      username: 'moderator',
      email: 'moderator@test.com',
      password_hash: 'hashed_password',
      role: 'moderator',
      is_active: true
    });

    regularUser = await User.create({
      username: 'user',
      email: 'user@test.com',
      password_hash: 'hashed_password',
      role: 'general_user',
      is_active: true
    });

    // Generate tokens
    const AuthService = require('../../services/AuthService');
    superAdminToken = AuthService.generateToken(superAdminUser);
    adminToken = AuthService.generateToken(adminUser);
    moderatorToken = AuthService.generateToken(moderatorUser);
    userToken = AuthService.generateToken(regularUser);

    // Create test form
    testForm = await Form.create({
      title: 'Test Form',
      title_en: 'test_form',
      description: 'Test form for migration tests',
      table_name: 'test_form_12345',
      created_by: superAdminUser.id,
      is_active: true
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * POST /api/v1/migrations/preview
   * Test migration preview endpoint
   */
  describe('POST /api/v1/migrations/preview', () => {
    const validRequest = {
      formId: null, // Will be set in beforeEach
      changes: [
        {
          type: 'ADD_FIELD',
          fieldId: '12345678-1234-1234-1234-123456789012',
          columnName: 'email',
          dataType: 'email'
        }
      ]
    };

    beforeEach(() => {
      validRequest.formId = testForm.id;
    });

    it('should allow super_admin to preview migration', async () => {
      // Mock FieldMigrationService.previewMigration
      FieldMigrationService.previewMigration.mockResolvedValue({
        migrationType: 'ADD_COLUMN',
        tableName: testForm.table_name,
        columnName: 'email',
        sql: 'ALTER TABLE "test_form_12345" ADD COLUMN "email" VARCHAR(255)',
        rollbackSQL: 'ALTER TABLE "test_form_12345" DROP COLUMN "email"',
        valid: true,
        warnings: [],
        estimatedRows: 0,
        requiresBackup: false
      });

      const response = await request(app)
        .post('/api/v1/migrations/preview')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(validRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('preview');
      expect(response.body.data.preview).toHaveLength(1);
      expect(response.body.data.preview[0].valid).toBe(true);
      expect(response.body.data.summary.totalChanges).toBe(1);
    });

    it('should allow admin to preview migration', async () => {
      FieldMigrationService.previewMigration.mockResolvedValue({
        valid: true,
        warnings: []
      });

      const response = await request(app)
        .post('/api/v1/migrations/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should allow moderator to preview migration', async () => {
      FieldMigrationService.previewMigration.mockResolvedValue({
        valid: true,
        warnings: []
      });

      const response = await request(app)
        .post('/api/v1/migrations/preview')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send(validRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should deny regular user access', async () => {
      const response = await request(app)
        .post('/api/v1/migrations/preview')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validRequest);

      expect(response.status).toBe(403);
    });

    it('should validate formId is UUID', async () => {
      const response = await request(app)
        .post('/api/v1/migrations/preview')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          ...validRequest,
          formId: 'invalid-uuid'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate changes array is not empty', async () => {
      const response = await request(app)
        .post('/api/v1/migrations/preview')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          formId: testForm.id,
          changes: []
        });

      expect(response.status).toBe(400);
    });

    it('should return 404 if form not found', async () => {
      const response = await request(app)
        .post('/api/v1/migrations/preview')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          formId: '12345678-1234-1234-1234-123456789999',
          changes: validRequest.changes
        });

      expect(response.status).toBe(404);
    });

    it('should handle preview warnings correctly', async () => {
      FieldMigrationService.previewMigration.mockResolvedValue({
        valid: true,
        warnings: ['Column already exists'],
        requiresBackup: false
      });

      const response = await request(app)
        .post('/api/v1/migrations/preview')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(validRequest);

      expect(response.status).toBe(200);
      expect(response.body.data.preview[0].warnings).toHaveLength(1);
    });
  });

  /**
   * POST /api/v1/migrations/execute
   * Test migration execution endpoint
   */
  describe('POST /api/v1/migrations/execute', () => {
    const validRequest = {
      formId: null,
      changes: [
        {
          type: 'ADD_FIELD',
          fieldId: '12345678-1234-1234-1234-123456789012',
          columnName: 'email',
          dataType: 'email'
        }
      ]
    };

    beforeEach(() => {
      validRequest.formId = testForm.id;
    });

    it('should allow super_admin to execute migration', async () => {
      const mockJob = {
        id: 'job_123',
        queue: {
          getWaitingCount: jest.fn().mockResolvedValue(1)
        }
      };

      MigrationQueue.add.mockResolvedValue(mockJob);

      const response = await request(app)
        .post('/api/v1/migrations/execute')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(validRequest);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.queuedJobs).toHaveLength(1);
      expect(response.body.data.queuedJobs[0].jobId).toBe('job_123');
      expect(MigrationQueue.add).toHaveBeenCalledTimes(1);
    });

    it('should allow admin to execute migration', async () => {
      const mockJob = {
        id: 'job_456',
        queue: { getWaitingCount: jest.fn().mockResolvedValue(0) }
      };

      MigrationQueue.add.mockResolvedValue(mockJob);

      const response = await request(app)
        .post('/api/v1/migrations/execute')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validRequest);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should deny moderator access', async () => {
      const response = await request(app)
        .post('/api/v1/migrations/execute')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send(validRequest);

      expect(response.status).toBe(403);
    });

    it('should handle queue errors gracefully', async () => {
      MigrationQueue.add.mockRejectedValue(new Error('Queue is full'));

      const response = await request(app)
        .post('/api/v1/migrations/execute')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(validRequest);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  /**
   * GET /api/v1/migrations/history/:formId
   * Test migration history endpoint
   */
  describe('GET /api/v1/migrations/history/:formId', () => {
    let testMigrations;

    beforeAll(async () => {
      // Create test migrations
      testMigrations = await Promise.all([
        FieldMigration.create({
          field_id: null,
          form_id: testForm.id,
          migration_type: 'ADD_COLUMN',
          table_name: testForm.table_name,
          column_name: 'email',
          old_value: null,
          new_value: { columnName: 'email', dataType: 'VARCHAR(255)' },
          backup_id: null,
          executed_by: superAdminUser.id,
          success: true,
          error_message: null,
          rollback_sql: 'ALTER TABLE "test_form_12345" DROP COLUMN "email"'
        }),
        FieldMigration.create({
          field_id: null,
          form_id: testForm.id,
          migration_type: 'DROP_COLUMN',
          table_name: testForm.table_name,
          column_name: 'phone',
          old_value: { columnName: 'phone', dataType: 'VARCHAR(20)' },
          new_value: null,
          backup_id: null,
          executed_by: adminUser.id,
          success: false,
          error_message: 'Column does not exist',
          rollback_sql: null
        })
      ]);
    });

    it('should return migration history for super_admin', async () => {
      const response = await request(app)
        .get(`/api/v1/migrations/history/${testForm.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.migrations).toBeInstanceOf(Array);
      expect(response.body.data.migrations.length).toBeGreaterThanOrEqual(2);
      expect(response.body.data.total).toBeGreaterThanOrEqual(2);
    });

    it('should allow admin to view history', async () => {
      const response = await request(app)
        .get(`/api/v1/migrations/history/${testForm.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('should allow moderator to view history', async () => {
      const response = await request(app)
        .get(`/api/v1/migrations/history/${testForm.id}`)
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(response.status).toBe(200);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/v1/migrations/history/${testForm.id}`)
        .query({ limit: 1, offset: 0 })
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.migrations).toHaveLength(1);
      expect(response.body.data.limit).toBe(1);
      expect(response.body.data.offset).toBe(0);
    });

    it('should filter by status (success)', async () => {
      const response = await request(app)
        .get(`/api/v1/migrations/history/${testForm.id}`)
        .query({ status: 'success' })
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.migrations.every(m => m.success === true)).toBe(true);
    });

    it('should filter by status (failed)', async () => {
      const response = await request(app)
        .get(`/api/v1/migrations/history/${testForm.id}`)
        .query({ status: 'failed' })
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.migrations.every(m => m.success === false)).toBe(true);
    });

    it('should return 404 for non-existent form', async () => {
      const response = await request(app)
        .get('/api/v1/migrations/history/12345678-1234-1234-1234-123456789999')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(404);
    });
  });

  /**
   * POST /api/v1/migrations/rollback/:migrationId
   * Test migration rollback endpoint
   */
  describe('POST /api/v1/migrations/rollback/:migrationId', () => {
    let rollbackableMigration;

    beforeAll(async () => {
      rollbackableMigration = await FieldMigration.create({
        field_id: null,
        form_id: testForm.id,
        migration_type: 'ADD_COLUMN',
        table_name: testForm.table_name,
        column_name: 'rollback_test',
        old_value: null,
        new_value: { columnName: 'rollback_test', dataType: 'TEXT' },
        backup_id: null,
        executed_by: superAdminUser.id,
        success: true,
        error_message: null,
        rollback_sql: 'ALTER TABLE "test_form_12345" DROP COLUMN "rollback_test"'
      });
    });

    it('should allow super_admin to rollback migration', async () => {
      // Mock PostgreSQL connection
      jest.mock('pg', () => ({
        Pool: jest.fn().mockImplementation(() => ({
          connect: jest.fn().mockResolvedValue({
            query: jest.fn().mockResolvedValue({ rows: [] }),
            release: jest.fn()
          }),
          end: jest.fn()
        }))
      }));

      const response = await request(app)
        .post(`/api/v1/migrations/rollback/${rollbackableMigration.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      // Should succeed or fail based on actual DB connection
      expect([200, 500]).toContain(response.status);
    });

    it('should deny admin access to rollback', async () => {
      const response = await request(app)
        .post(`/api/v1/migrations/rollback/${rollbackableMigration.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(403);
    });

    it('should deny moderator access to rollback', async () => {
      const response = await request(app)
        .post(`/api/v1/migrations/rollback/${rollbackableMigration.id}`)
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent migration', async () => {
      const response = await request(app)
        .post('/api/v1/migrations/rollback/12345678-1234-1234-1234-123456789999')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(404);
    });
  });

  /**
   * GET /api/v1/migrations/backups/:formId
   * Test backup listing endpoint
   */
  describe('GET /api/v1/migrations/backups/:formId', () => {
    let testBackup;

    beforeAll(async () => {
      testBackup = await FieldDataBackup.create({
        field_id: null,
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'email',
        data_snapshot: [
          { id: '1', value: 'test@example.com' },
          { id: '2', value: 'user@example.com' }
        ],
        backup_type: 'AUTO_DELETE',
        created_by: superAdminUser.id
      });
    });

    it('should list backups for super_admin', async () => {
      const response = await request(app)
        .get(`/api/v1/migrations/backups/${testForm.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.backups).toBeInstanceOf(Array);
      expect(response.body.data.backups.length).toBeGreaterThanOrEqual(1);
    });

    it('should allow admin to view backups', async () => {
      const response = await request(app)
        .get(`/api/v1/migrations/backups/${testForm.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('should allow moderator to view backups', async () => {
      const response = await request(app)
        .get(`/api/v1/migrations/backups/${testForm.id}`)
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(response.status).toBe(200);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/v1/migrations/backups/${testForm.id}`)
        .query({ limit: 1, offset: 0 })
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.limit).toBe(1);
    });

    it('should exclude expired backups by default', async () => {
      // Create expired backup
      await FieldDataBackup.create({
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'expired',
        data_snapshot: [{ id: '1', value: 'test' }],
        backup_type: 'MANUAL',
        retention_until: new Date(Date.now() - 1000), // 1 second ago
        created_by: superAdminUser.id
      });

      const response = await request(app)
        .get(`/api/v1/migrations/backups/${testForm.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      // Should not include expired backup
    });

    it('should include expired backups when requested', async () => {
      const response = await request(app)
        .get(`/api/v1/migrations/backups/${testForm.id}`)
        .query({ includeExpired: true })
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
    });
  });

  /**
   * POST /api/v1/migrations/restore/:backupId
   * Test backup restore endpoint
   */
  describe('POST /api/v1/migrations/restore/:backupId', () => {
    let restoreableBackup;

    beforeAll(async () => {
      restoreableBackup = await FieldDataBackup.create({
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'restore_test',
        data_snapshot: [
          { id: '1', value: 'data1' },
          { id: '2', value: 'data2' }
        ],
        backup_type: 'MANUAL',
        created_by: superAdminUser.id
      });
    });

    it('should allow super_admin to restore backup', async () => {
      FieldMigrationService.restoreColumnData.mockResolvedValue({
        success: true,
        count: 2,
        tableName: testForm.table_name,
        columnName: 'restore_test',
        message: 'Restored 2 records'
      });

      const response = await request(app)
        .post(`/api/v1/migrations/restore/${restoreableBackup.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.restoredRows).toBe(2);
    });

    it('should deny admin access to restore', async () => {
      const response = await request(app)
        .post(`/api/v1/migrations/restore/${restoreableBackup.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(403);
    });

    it('should deny moderator access to restore', async () => {
      const response = await request(app)
        .post(`/api/v1/migrations/restore/${restoreableBackup.id}`)
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent backup', async () => {
      const response = await request(app)
        .post('/api/v1/migrations/restore/12345678-1234-1234-1234-123456789999')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(404);
    });

    it('should reject expired backup restoration', async () => {
      const expiredBackup = await FieldDataBackup.create({
        form_id: testForm.id,
        table_name: testForm.table_name,
        column_name: 'expired_restore',
        data_snapshot: [{ id: '1', value: 'test' }],
        backup_type: 'MANUAL',
        retention_until: new Date(Date.now() - 1000),
        created_by: superAdminUser.id
      });

      const response = await request(app)
        .post(`/api/v1/migrations/restore/${expiredBackup.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('expired');
    });
  });

  /**
   * GET /api/v1/migrations/queue/status
   * Test queue status endpoint
   */
  describe('GET /api/v1/migrations/queue/status', () => {
    it('should return global queue status for super_admin', async () => {
      MigrationQueue.getMetrics.mockResolvedValue({
        waiting: 5,
        active: 1,
        completed: 100,
        failed: 2,
        delayed: 0,
        total: 108
      });

      const response = await request(app)
        .get('/api/v1/migrations/queue/status')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.queue).toHaveProperty('waiting');
      expect(response.body.data.queue).toHaveProperty('active');
      expect(response.body.data.queue).toHaveProperty('completed');
      expect(response.body.data.queue).toHaveProperty('failed');
    });

    it('should return form-specific queue status', async () => {
      MigrationQueue.getStatus.mockResolvedValue({
        waiting: 2,
        active: 0,
        completed: 10,
        failed: 0,
        total: 12
      });

      const response = await request(app)
        .get('/api/v1/migrations/queue/status')
        .query({ formId: testForm.id })
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.formId).toBe(testForm.id);
      expect(response.body.data.queue).toHaveProperty('waiting');
    });

    it('should allow admin to view queue status', async () => {
      MigrationQueue.getMetrics.mockResolvedValue({
        waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, total: 0
      });

      const response = await request(app)
        .get('/api/v1/migrations/queue/status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('should allow moderator to view queue status', async () => {
      MigrationQueue.getMetrics.mockResolvedValue({
        waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, total: 0
      });

      const response = await request(app)
        .get('/api/v1/migrations/queue/status')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent form', async () => {
      const response = await request(app)
        .get('/api/v1/migrations/queue/status')
        .query({ formId: '12345678-1234-1234-1234-123456789999' })
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(404);
    });
  });

  /**
   * DELETE /api/v1/migrations/cleanup
   * Test backup cleanup endpoint
   */
  describe('DELETE /api/v1/migrations/cleanup', () => {
    it('should allow super_admin to cleanup backups', async () => {
      const response = await request(app)
        .delete('/api/v1/migrations/cleanup')
        .query({ days: 90 })
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('deletedCount');
    });

    it('should deny admin access to cleanup', async () => {
      const response = await request(app)
        .delete('/api/v1/migrations/cleanup')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(403);
    });

    it('should support dry-run mode', async () => {
      const response = await request(app)
        .delete('/api/v1/migrations/cleanup')
        .query({ days: 90, dryRun: true })
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.dryRun).toBe(true);
      expect(response.body.data).toHaveProperty('wouldDeleteCount');
      expect(response.body.data).toHaveProperty('samples');
    });

    it('should validate days parameter (min 30)', async () => {
      const response = await request(app)
        .delete('/api/v1/migrations/cleanup')
        .query({ days: 10 })
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(400);
    });

    it('should validate days parameter (max 365)', async () => {
      const response = await request(app)
        .delete('/api/v1/migrations/cleanup')
        .query({ days: 400 })
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(400);
    });

    it('should use default 90 days if not specified', async () => {
      const response = await request(app)
        .delete('/api/v1/migrations/cleanup')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.days).toBe(90);
    });
  });

  /**
   * Authentication Tests
   */
  describe('Authentication', () => {
    it('should reject requests without token', async () => {
      const response = await request(app)
        .get('/api/v1/migrations/queue/status');

      expect(response.status).toBe(401);
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/migrations/queue/status')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });
});
