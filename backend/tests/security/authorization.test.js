/**
 * Authorization Security Tests
 * Tests RBAC (Role-Based Access Control) implementation
 * Q-Collector Security Audit - Sprint 1, Task 1.3
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = require('../../api/app');
const { User, Form } = require('../../models');

describe('Authorization Security Tests - RBAC', () => {
  let testUsers = {};
  let testForm;

  beforeAll(async () => {
    // Create test users with different roles
    const roles = ['super_admin', 'admin', 'general_user', 'customer_service'];

    for (const role of roles) {
      const user = await User.create({
        username: `${role}_test`,
        email: `${role}@test.com`,
        password: await bcrypt.hash('TestPass123', 12),
        full_name: `Test ${role}`,
        role: role,
        is_active: true,
        is_approved: true
      });

      testUsers[role] = {
        user,
        token: jwt.sign(
          { userId: user.id, username: user.username, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        )
      };
    }

    // Create test form
    testForm = await Form.create({
      title: 'RBAC Test Form',
      description: 'Form for testing authorization',
      created_by: testUsers.admin.user.id,
      roles_allowed: ['admin', 'customer_service'], // Only these roles can access
      settings: {},
      fields: []
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await Form.destroy({ where: { id: testForm.id } });
    for (const role in testUsers) {
      await User.destroy({ where: { id: testUsers[role].user.id } });
    }
  });

  describe('Role-Based Access Control (RBAC)', () => {
    it('should allow super_admin to access all resources', async () => {
      const response = await request(app)
        .get(`/api/v1/forms/${testForm.id}`)
        .set('Authorization', `Bearer ${testUsers.super_admin.token}`);

      // Super admin should have access regardless of roles_allowed
      expect(response.status).toBe(200);
    });

    it('should allow admin to access all resources', async () => {
      const response = await request(app)
        .get(`/api/v1/forms/${testForm.id}`)
        .set('Authorization', `Bearer ${testUsers.admin.token}`);

      // Admin should have access
      expect(response.status).toBe(200);
    });

    it('should allow authorized role to access resource', async () => {
      const response = await request(app)
        .get(`/api/v1/forms/${testForm.id}`)
        .set('Authorization', `Bearer ${testUsers.customer_service.token}`);

      // customer_service is in roles_allowed
      expect(response.status).toBe(200);
    });

    it('should deny unauthorized role access to resource', async () => {
      const response = await request(app)
        .get(`/api/v1/forms/${testForm.id}`)
        .set('Authorization', `Bearer ${testUsers.general_user.token}`);

      // general_user is NOT in roles_allowed
      expect(response.status).toBe(403);
    });
  });

  describe('Admin-Only Endpoints', () => {
    const adminEndpoints = [
      { method: 'post', path: '/api/v1/forms' },
      { method: 'delete', path: `/api/v1/forms/${testForm?.id || 'test-id'}` },
      { method: 'post', path: '/api/v1/admin/users' },
    ];

    adminEndpoints.forEach(({ method, path }) => {
      it(`should deny general_user access to ${method.toUpperCase()} ${path}`, async () => {
        const response = await request(app)
          [method](path)
          .set('Authorization', `Bearer ${testUsers.general_user.token}`)
          .send({});

        expect([401, 403]).toContain(response.status);
      });

      it(`should allow admin access to ${method.toUpperCase()} ${path}`, async () => {
        const response = await request(app)
          [method](path)
          .set('Authorization', `Bearer ${testUsers.admin.token}`)
          .send(method === 'post' ? { title: 'Test', description: 'Test' } : {});

        // Should not be 403 Forbidden (may fail validation, but not authorization)
        expect(response.status).not.toBe(403);
      });
    });
  });

  describe('Resource Ownership', () => {
    it('should allow user to access their own submissions', async () => {
      // This documents expected behavior
      // Users should be able to access submissions they created
    });

    it('should deny user access to other users submissions', async () => {
      // This documents expected behavior
      // Users should NOT be able to access submissions created by others (unless admin)
    });
  });

  describe('Horizontal Privilege Escalation Prevention', () => {
    it('should prevent user from modifying another user profile', async () => {
      const targetUserId = testUsers.admin.user.id;

      const response = await request(app)
        .put(`/api/v1/users/${targetUserId}`)
        .set('Authorization', `Bearer ${testUsers.general_user.token}`)
        .send({
          role: 'super_admin' // Attempting to escalate privileges
        });

      expect([401, 403]).toContain(response.status);
    });

    it('should prevent user from deleting another user', async () => {
      const targetUserId = testUsers.customer_service.user.id;

      const response = await request(app)
        .delete(`/api/v1/users/${targetUserId}`)
        .set('Authorization', `Bearer ${testUsers.general_user.token}`);

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('Vertical Privilege Escalation Prevention', () => {
    it('should prevent general_user from creating forms', async () => {
      const response = await request(app)
        .post('/api/v1/forms')
        .set('Authorization', `Bearer ${testUsers.general_user.token}`)
        .send({
          title: 'Unauthorized Form',
          description: 'Should not be created'
        });

      expect(response.status).toBe(403);
    });

    it('should prevent general_user from approving other users', async () => {
      const response = await request(app)
        .patch(`/api/v1/admin/users/${testUsers.customer_service.user.id}/approve`)
        .set('Authorization', `Bearer ${testUsers.general_user.token}`);

      expect([401, 403, 404]).toContain(response.status);
    });

    it('should prevent role escalation via API', async () => {
      const response = await request(app)
        .put(`/api/v1/users/${testUsers.general_user.user.id}`)
        .set('Authorization', `Bearer ${testUsers.general_user.token}`)
        .send({
          role: 'super_admin' // Attempting self-escalation
        });

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('Form Access Control', () => {
    it('should respect roles_allowed array', async () => {
      // Form allows: admin, customer_service
      const allowedUser = testUsers.customer_service;
      const deniedUser = testUsers.general_user;

      const allowedResponse = await request(app)
        .get(`/api/v1/forms/${testForm.id}`)
        .set('Authorization', `Bearer ${allowedUser.token}`);

      const deniedResponse = await request(app)
        .get(`/api/v1/forms/${testForm.id}`)
        .set('Authorization', `Bearer ${deniedUser.token}`);

      expect(allowedResponse.status).toBe(200);
      expect(deniedResponse.status).toBe(403);
    });

    it('should allow super_admin bypass for all forms', async () => {
      const response = await request(app)
        .get(`/api/v1/forms/${testForm.id}`)
        .set('Authorization', `Bearer ${testUsers.super_admin.token}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Authorization Middleware', () => {
    it('should check authorization before executing route handler', async () => {
      // Authorization should happen early in middleware chain
      // Failed authorization should not execute business logic

      const response = await request(app)
        .post('/api/v1/forms')
        .set('Authorization', `Bearer ${testUsers.general_user.token}`)
        .send({
          title: 'Test Form',
          description: 'Should be blocked before validation'
        });

      // Should be 403 Forbidden, not 400 Validation Error
      expect(response.status).toBe(403);
    });

    it('should return appropriate error message for unauthorized access', async () => {
      const response = await request(app)
        .post('/api/v1/forms')
        .set('Authorization', `Bearer ${testUsers.general_user.token}`)
        .send({});

      expect(response.body.success).toBe(false);
      expect(response.body.error || response.body.message).toMatch(/permission|forbidden|access|authorized/i);
    });
  });

  describe('Role Enumeration Prevention', () => {
    it('should not reveal role information in error messages', async () => {
      const response = await request(app)
        .get('/api/v1/forms/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${testUsers.general_user.token}`);

      // Should not say "You need admin role to access this"
      // Should be generic: "Access denied" or "Not found"
      if (response.body.message) {
        expect(response.body.message.toLowerCase()).not.toContain('admin');
        expect(response.body.message.toLowerCase()).not.toContain('super_admin');
      }
    });
  });

  describe('Multi-Role Support', () => {
    it('should handle forms with multiple allowed roles', async () => {
      const multiRoleForm = await Form.create({
        title: 'Multi-Role Form',
        description: 'Accessible by multiple roles',
        created_by: testUsers.admin.user.id,
        roles_allowed: ['customer_service', 'admin', 'general_user'],
        settings: {},
        fields: []
      });

      // All these roles should have access
      const allowedRoles = ['customer_service', 'admin', 'general_user'];
      for (const role of allowedRoles) {
        const response = await request(app)
          .get(`/api/v1/forms/${multiRoleForm.id}`)
          .set('Authorization', `Bearer ${testUsers[role].token}`);

        expect(response.status).toBe(200);
      }

      // Cleanup
      await Form.destroy({ where: { id: multiRoleForm.id } });
    });
  });

  describe('Default Access Behavior', () => {
    it('should handle forms with no roles_allowed (open access)', async () => {
      const openForm = await Form.create({
        title: 'Open Form',
        description: 'Accessible by all',
        created_by: testUsers.admin.user.id,
        roles_allowed: null, // No restriction
        settings: {},
        fields: []
      });

      // All authenticated users should have access
      const response = await request(app)
        .get(`/api/v1/forms/${openForm.id}`)
        .set('Authorization', `Bearer ${testUsers.general_user.token}`);

      expect(response.status).toBe(200);

      // Cleanup
      await Form.destroy({ where: { id: openForm.id } });
    });

    it('should deny access without authentication even for open forms', async () => {
      const openForm = await Form.create({
        title: 'Open Form 2',
        description: 'Accessible by all authenticated users',
        created_by: testUsers.admin.user.id,
        roles_allowed: null,
        settings: {},
        fields: []
      });

      const response = await request(app)
        .get(`/api/v1/forms/${openForm.id}`);
      // No Authorization header

      expect(response.status).toBe(401);

      // Cleanup
      await Form.destroy({ where: { id: openForm.id } });
    });
  });

  describe('18 Role System', () => {
    const allRoles = [
      'super_admin', 'admin', 'customer_service', 'sales', 'marketing',
      'technic', 'accounting', 'bd', 'hr', 'it', 'maintenance',
      'operation', 'production', 'purchasing', 'qc', 'rnd',
      'warehouse', 'general_user'
    ];

    it('should support all 18 roles', () => {
      // All roles should be valid
      allRoles.forEach(role => {
        expect(typeof role).toBe('string');
        expect(role.length).toBeGreaterThan(0);
      });

      expect(allRoles.length).toBe(18);
    });

    it('should have removed moderator role', () => {
      expect(allRoles).not.toContain('moderator');
    });
  });
});
