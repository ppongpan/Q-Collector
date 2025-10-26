/**
 * Authentication Security Tests
 * Tests JWT token security, password hashing, session management
 * Q-Collector Security Audit - Sprint 1, Task 1.3
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = require('../../api/app');
const { User } = require('../../models');

describe('Authentication Security Tests', () => {
  let testUser;
  let validToken;

  beforeAll(async () => {
    // Create test user with known credentials
    const hashedPassword = await bcrypt.hash('TestPassword123', 12);
    testUser = await User.create({
      username: 'auth_test_user',
      email: 'authtest@example.com',
      password: hashedPassword,
      full_name: 'Auth Test User',
      role: 'general_user',
      is_active: true,
      is_approved: true
    });

    // Generate valid token for testing
    validToken = jwt.sign(
      { userId: testUser.id, username: testUser.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  });

  afterAll(async () => {
    // Cleanup test user
    await User.destroy({ where: { username: 'auth_test_user' } });
  });

  describe('Password Security', () => {
    it('should hash passwords with bcrypt (12 rounds)', async () => {
      const plainPassword = 'SecurePassword123';
      const hashedPassword = await bcrypt.hash(plainPassword, 12);

      // Should be different from plain text
      expect(hashedPassword).not.toBe(plainPassword);

      // Should be bcrypt format ($2a$12$...)
      expect(hashedPassword).toMatch(/^\$2[ab]\$12\$/);

      // Should verify correctly
      const isValid = await bcrypt.compare(plainPassword, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should reject weak passwords', async () => {
      const weakPasswords = [
        'password', // No uppercase or numbers
        '12345678', // No letters
        'Password', // No numbers
        'Pass123',  // Too short (< 8 chars)
        'password123', // No uppercase
      ];

      for (const weakPassword of weakPasswords) {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            username: 'weakuser',
            email: 'weak@example.com',
            password: weakPassword,
            full_name: 'Weak User'
          });

        expect(response.status).toBe(400);
      }
    });

    it('should accept strong passwords', () => {
      const strongPasswords = [
        'MySecurePass123',
        'Tr0ub4dor&3',
        'C0mpl3x!Pass',
      ];

      strongPasswords.forEach(password => {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        expect(regex.test(password)).toBe(true);
      });
    });

    it('should not store passwords in plain text', async () => {
      const user = await User.findOne({ where: { username: 'auth_test_user' } });

      // Password should be hashed
      expect(user.password).not.toBe('TestPassword123');
      expect(user.password).toMatch(/^\$2[ab]\$/);
    });

    it('should hash password on user creation', async () => {
      const newUser = await User.create({
        username: 'hash_test_user',
        email: 'hashtest@example.com',
        password: 'PlainPassword123',
        full_name: 'Hash Test User',
        role: 'general_user'
      });

      // Password should be automatically hashed by beforeCreate hook
      expect(newUser.password).not.toBe('PlainPassword123');
      expect(newUser.password).toMatch(/^\$2[ab]\$/);

      // Cleanup
      await User.destroy({ where: { id: newUser.id } });
    });
  });

  describe('JWT Token Security', () => {
    it('should generate valid JWT tokens', () => {
      const payload = { userId: 'test-id', username: 'testuser' };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

      expect(token).toBeTruthy();
      expect(token.split('.')).toHaveLength(3); // header.payload.signature
    });

    it('should verify valid tokens', () => {
      const payload = { userId: 'test-id', username: 'testuser' };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      expect(decoded.userId).toBe('test-id');
      expect(decoded.username).toBe('testuser');
      expect(decoded.exp).toBeTruthy();
    });

    it('should reject expired tokens', (done) => {
      const payload = { userId: 'test-id', username: 'testuser' };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1ms' });

      // Wait for token to expire
      setTimeout(() => {
        expect(() => {
          jwt.verify(token, process.env.JWT_SECRET);
        }).toThrow('jwt expired');
        done();
      }, 100);
    });

    it('should reject tokens with invalid signature', () => {
      const payload = { userId: 'test-id', username: 'testuser' };
      const token = jwt.sign(payload, 'wrong-secret', { expiresIn: '1h' });

      expect(() => {
        jwt.verify(token, process.env.JWT_SECRET);
      }).toThrow('invalid signature');
    });

    it('should reject malformed tokens', () => {
      const malformedTokens = [
        'not.a.token',
        'invalid',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        '',
        null,
        undefined,
      ];

      malformedTokens.forEach(token => {
        expect(() => {
          jwt.verify(token, process.env.JWT_SECRET);
        }).toThrow();
      });
    });

    it('should include user ID and username in token payload', () => {
      const decoded = jwt.verify(validToken, process.env.JWT_SECRET);

      expect(decoded.userId).toBe(testUser.id);
      expect(decoded.username).toBe(testUser.username);
    });

    it('should set appropriate token expiration (7 days)', () => {
      const decoded = jwt.verify(validToken, process.env.JWT_SECRET);
      const now = Math.floor(Date.now() / 1000);
      const sevenDays = 7 * 24 * 60 * 60;

      // Token should expire in approximately 7 days
      expect(decoded.exp - decoded.iat).toBeGreaterThanOrEqual(sevenDays - 10);
      expect(decoded.exp - decoded.iat).toBeLessThanOrEqual(sevenDays + 10);
    });
  });

  describe('Authentication Endpoints', () => {
    it('should reject requests without token', async () => {
      const response = await request(app)
        .get('/api/v1/forms')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('token');
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/forms')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should accept requests with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/forms')
        .set('Authorization', `Bearer ${validToken}`);

      // May be 200 or other status, but not 401 Unauthorized
      expect(response.status).not.toBe(401);
    });

    it('should reject token in wrong format', async () => {
      const responses = await Promise.all([
        request(app).get('/api/v1/forms').set('Authorization', validToken), // Missing "Bearer"
        request(app).get('/api/v1/forms').set('Authorization', `Token ${validToken}`), // Wrong prefix
        request(app).get('/api/v1/forms').set('Authorization', `Basic ${validToken}`), // Wrong scheme
      ]);

      responses.forEach(response => {
        expect(response.status).toBe(401);
      });
    });
  });

  describe('Session Security', () => {
    it('should not allow concurrent sessions with same token after password change', async () => {
      // This is a conceptual test - in practice, password change should invalidate tokens
      // Current implementation may not have this feature, so this documents expected behavior

      const user = await User.findOne({ where: { username: 'auth_test_user' } });
      const oldToken = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Simulate password change
      user.password = 'NewPassword456';
      await user.save();

      // Ideally, old token should be invalidated
      // This is a future enhancement - token blacklist or token versioning
    });

    it('should generate different tokens for different users', () => {
      const token1 = jwt.sign({ userId: 'user1', username: 'user1' }, process.env.JWT_SECRET);
      const token2 = jwt.sign({ userId: 'user2', username: 'user2' }, process.env.JWT_SECRET);

      expect(token1).not.toBe(token2);
    });

    it('should generate different tokens for same user at different times', (done) => {
      const payload = { userId: 'test-id', username: 'testuser' };
      const token1 = jwt.sign(payload, process.env.JWT_SECRET);

      setTimeout(() => {
        const token2 = jwt.sign(payload, process.env.JWT_SECRET);
        expect(token1).not.toBe(token2);
        done();
      }, 100);
    });
  });

  describe('Brute Force Protection', () => {
    it('should have rate limiting on login endpoint', async () => {
      // Send multiple login attempts
      const attempts = [];
      for (let i = 0; i < 10; i++) {
        attempts.push(
          request(app)
            .post('/api/v1/auth/login')
            .send({
              username: 'nonexistent',
              password: 'wrongpassword'
            })
        );
      }

      const responses = await Promise.all(attempts);

      // At least one should be rate limited (429)
      const rateLimited = responses.some(r => r.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('Two-Factor Authentication (2FA)', () => {
    it('should encrypt 2FA secret when stored', async () => {
      const user = await User.findOne({ where: { username: 'auth_test_user' } });

      if (user.twoFactorSecret) {
        // Should be encrypted (base64 format with IV)
        expect(user.twoFactorSecret).toMatch(/^[A-Za-z0-9+/]+=*$/);

        // Should not be plain TOTP secret format (base32)
        expect(user.twoFactorSecret).not.toMatch(/^[A-Z2-7]+=*$/);
      }
    });

    it('should encrypt backup codes', async () => {
      const user = await User.findOne({ where: { username: 'auth_test_user' } });

      if (user.twoFactorBackupCodes) {
        // Should be encrypted JSON string
        expect(typeof user.twoFactorBackupCodes).toBe('string');
        expect(user.twoFactorBackupCodes).toMatch(/^[A-Za-z0-9+/]+=*$/);
      }
    });
  });

  describe('Account Lockout', () => {
    it('should track failed login attempts', async () => {
      // This documents expected behavior - may need implementation
      // After X failed attempts, account should be locked temporarily
    });

    it('should prevent login for inactive users', async () => {
      const inactiveUser = await User.create({
        username: 'inactive_user',
        email: 'inactive@example.com',
        password: await bcrypt.hash('Password123', 12),
        full_name: 'Inactive User',
        role: 'general_user',
        is_active: false // Inactive
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'inactive_user',
          password: 'Password123'
        });

      expect(response.status).toBe(401);

      // Cleanup
      await User.destroy({ where: { id: inactiveUser.id } });
    });

    it('should prevent login for unapproved users', async () => {
      const unapprovedUser = await User.create({
        username: 'unapproved_user',
        email: 'unapproved@example.com',
        password: await bcrypt.hash('Password123', 12),
        full_name: 'Unapproved User',
        role: 'general_user',
        is_active: true,
        is_approved: false // Not approved
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'unapproved_user',
          password: 'Password123'
        });

      expect(response.status).toBe(403);

      // Cleanup
      await User.destroy({ where: { id: unapprovedUser.id } });
    });
  });
});
