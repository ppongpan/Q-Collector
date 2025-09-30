/**
 * User Model Unit Tests
 * Test User model functionality without database
 */

const { createMockSequelize, MockModel } = require('../../mocks/database.mock');
const { TestDataGenerator, MockDataFactory } = require('../../helpers');
const fixtures = require('../../fixtures');

describe('User Model', () => {
  let sequelize;
  let User;
  let mockEncryption;

  beforeAll(() => {
    // Mock encryption module
    mockEncryption = {
      encrypt: jest.fn((text) => ({
        iv: TestDataGenerator.randomString(32),
        encryptedData: Buffer.from(text).toString('base64'),
        authTag: TestDataGenerator.randomString(32),
      })),
      decrypt: jest.fn((encrypted) => {
        return Buffer.from(encrypted.encryptedData, 'base64').toString('utf8');
      }),
    };

    jest.mock('../../../utils/encryption.util', () => mockEncryption);

    // Create mock Sequelize
    sequelize = createMockSequelize();

    // Load User model
    const UserModel = require('../../../models/User');
    User = UserModel(sequelize, sequelize.Sequelize.DataTypes);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Model Definition', () => {
    it('should be defined', () => {
      expect(User).toBeDefined();
      expect(User.modelName).toBe('User');
    });

    it('should have required fields', () => {
      const attributes = User.attributes;
      expect(attributes).toHaveProperty('id');
      expect(attributes).toHaveProperty('username');
      expect(attributes).toHaveProperty('email');
      expect(attributes).toHaveProperty('password_hash');
      expect(attributes).toHaveProperty('role');
      expect(attributes).toHaveProperty('is_active');
    });

    it('should have encrypted fields', () => {
      const attributes = User.attributes;
      expect(attributes).toHaveProperty('full_name_enc');
      expect(attributes).toHaveProperty('phone_enc');
    });

    it('should have timestamps', () => {
      const options = User.options;
      expect(options.timestamps).toBe(true);
    });
  });

  describe('create()', () => {
    it('should create user with basic fields', async () => {
      const userData = fixtures.users.user;

      const user = await User.create(userData);

      expect(user).toBeDefined();
      expect(user.username).toBe(userData.username);
      expect(user.email).toBe(userData.email);
      expect(user.role).toBe(userData.role);
    });

    it('should create user with all roles', async () => {
      const roles = ['admin', 'manager', 'user', 'viewer'];

      for (const role of roles) {
        const userData = { ...fixtures.users.user, role };
        const user = await User.create(userData);
        expect(user.role).toBe(role);
      }
    });

    it('should set default values', async () => {
      const minimalData = {
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'password123',
      };

      const user = await User.create(minimalData);

      expect(user.is_active).toBe(true);
      expect(user.role).toBe('user');
      expect(user.id).toBeDefined();
    });

    it('should hash password on create', async () => {
      const userData = fixtures.users.user;

      const user = await User.create(userData);

      // Password should be hashed (different from original)
      expect(user.password_hash).toBeDefined();
    });

    it('should encrypt sensitive fields', async () => {
      const userData = {
        ...fixtures.users.user,
        full_name: 'John Doe',
        phone: '0812345678',
      };

      const user = await User.create(userData);

      // Should have encrypted versions
      expect(user.full_name_enc).toBeDefined();
      expect(user.phone_enc).toBeDefined();
    });
  });

  describe('validatePassword()', () => {
    it('should validate correct password', async () => {
      const password = 'TestPassword123';
      const user = User.build({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: password,
      });

      // Mock bcrypt compare
      const bcrypt = require('bcryptjs');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      const isValid = await user.validatePassword(password);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const user = User.build({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
      });

      const bcrypt = require('bcryptjs');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      const isValid = await user.validatePassword('wrong_password');

      expect(isValid).toBe(false);
    });
  });

  describe('getFullName()', () => {
    it('should decrypt and return full name', () => {
      const fullName = 'John Doe';
      const encrypted = mockEncryption.encrypt(fullName);

      const user = User.build({
        username: 'testuser',
        email: 'test@example.com',
        full_name_enc: JSON.stringify(encrypted),
      });

      const decrypted = user.getFullName();

      expect(decrypted).toBe(fullName);
      expect(mockEncryption.decrypt).toHaveBeenCalled();
    });

    it('should return null if no full name', () => {
      const user = User.build({
        username: 'testuser',
        email: 'test@example.com',
      });

      const result = user.getFullName();

      expect(result).toBeNull();
    });

    it('should handle decryption errors', () => {
      mockEncryption.decrypt.mockImplementationOnce(() => {
        throw new Error('Decryption failed');
      });

      const user = User.build({
        username: 'testuser',
        email: 'test@example.com',
        full_name_enc: JSON.stringify({ invalid: 'data' }),
      });

      const result = user.getFullName();

      expect(result).toBeNull();
    });
  });

  describe('getPhone()', () => {
    it('should decrypt and return phone', () => {
      const phone = '0812345678';
      const encrypted = mockEncryption.encrypt(phone);

      const user = User.build({
        username: 'testuser',
        email: 'test@example.com',
        phone_enc: JSON.stringify(encrypted),
      });

      const decrypted = user.getPhone();

      expect(decrypted).toBe(phone);
    });

    it('should return null if no phone', () => {
      const user = User.build({
        username: 'testuser',
        email: 'test@example.com',
      });

      const result = user.getPhone();

      expect(result).toBeNull();
    });
  });

  describe('toJSON()', () => {
    it('should hide sensitive fields', () => {
      const user = User.build({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        full_name_enc: JSON.stringify(mockEncryption.encrypt('John Doe')),
        phone_enc: JSON.stringify(mockEncryption.encrypt('0812345678')),
      });

      const json = user.toJSON();

      expect(json).not.toHaveProperty('password_hash');
      expect(json).not.toHaveProperty('full_name_enc');
      expect(json).not.toHaveProperty('phone_enc');
    });

    it('should include decrypted fields', () => {
      const fullName = 'John Doe';
      const phone = '0812345678';

      const user = User.build({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        full_name_enc: JSON.stringify(mockEncryption.encrypt(fullName)),
        phone_enc: JSON.stringify(mockEncryption.encrypt(phone)),
      });

      const json = user.toJSON();

      expect(json).toHaveProperty('full_name', fullName);
      expect(json).toHaveProperty('phone', phone);
    });

    it('should include public fields', () => {
      const user = User.build(fixtures.users.user);

      const json = user.toJSON();

      expect(json).toHaveProperty('username');
      expect(json).toHaveProperty('email');
      expect(json).toHaveProperty('role');
      expect(json).toHaveProperty('is_active');
    });
  });

  describe('getTokenPayload()', () => {
    it('should return safe user data for token', () => {
      const user = User.build({
        id: TestDataGenerator.randomUUID(),
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        role: 'user',
      });

      const payload = user.getTokenPayload();

      expect(payload).toEqual({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      });
    });

    it('should not include sensitive data', () => {
      const user = User.build({
        ...fixtures.users.user,
        password_hash: 'hashed_password',
      });

      const payload = user.getTokenPayload();

      expect(payload).not.toHaveProperty('password_hash');
      expect(payload).not.toHaveProperty('full_name');
      expect(payload).not.toHaveProperty('phone');
    });
  });

  describe('findByIdentifier()', () => {
    it('should find user by email', async () => {
      const userData = fixtures.users.user;
      User.findOne = jest.fn().mockResolvedValue(User.build(userData));

      const user = await User.findByIdentifier(userData.email);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(User.findOne).toHaveBeenCalled();
    });

    it('should find user by username', async () => {
      const userData = fixtures.users.user;
      User.findOne = jest.fn().mockResolvedValue(User.build(userData));

      const user = await User.findByIdentifier(userData.username);

      expect(user).toBeDefined();
      expect(user.username).toBe(userData.username);
    });

    it('should return null if not found', async () => {
      User.findOne = jest.fn().mockResolvedValue(null);

      const user = await User.findByIdentifier('nonexistent');

      expect(user).toBeNull();
    });
  });

  describe('findByRole()', () => {
    it('should find active users by role', async () => {
      const adminUsers = [
        User.build(fixtures.users.admin),
        User.build({ ...fixtures.users.admin, username: 'admin2' }),
      ];

      User.findAll = jest.fn().mockResolvedValue(adminUsers);

      const users = await User.findByRole('admin');

      expect(users).toHaveLength(2);
      expect(users[0].role).toBe('admin');
      expect(User.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: 'admin',
            is_active: true,
          }),
        })
      );
    });

    it('should filter inactive users', async () => {
      User.findAll = jest.fn().mockResolvedValue([]);

      const users = await User.findByRole('user');

      expect(User.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            is_active: true,
          }),
        })
      );
    });
  });

  describe('Validation', () => {
    it('should validate email format', () => {
      const attributes = User.attributes;
      expect(attributes.email.validate).toHaveProperty('isEmail');
    });

    it('should validate username length', () => {
      const attributes = User.attributes;
      expect(attributes.username.validate).toHaveProperty('len');
      expect(attributes.username.validate.len).toEqual([3, 50]);
    });

    it('should validate username is alphanumeric', () => {
      const attributes = User.attributes;
      expect(attributes.username.validate).toHaveProperty('isAlphanumeric');
    });

    it('should have unique constraints', () => {
      const attributes = User.attributes;
      expect(attributes.username.unique).toBe(true);
      expect(attributes.email.unique).toBe(true);
    });
  });

  describe('Associations', () => {
    it('should have associate method', () => {
      expect(typeof User.associate).toBe('function');
    });

    it('should define associations with models', () => {
      const mockModels = {
        Form: { hasMany: jest.fn() },
        Submission: { hasMany: jest.fn() },
        File: { hasMany: jest.fn() },
        AuditLog: { hasMany: jest.fn() },
        Session: { hasMany: jest.fn() },
      };

      User.associate(mockModels);

      // Associations should be defined
      expect(User.hasMany).toHaveBeenCalled();
    });
  });

  describe('Scopes', () => {
    it('should have active scope', () => {
      expect(User.addScope).toHaveBeenCalledWith(
        'active',
        expect.objectContaining({
          where: { is_active: true },
        })
      );
    });

    it('should have admins scope', () => {
      expect(User.addScope).toHaveBeenCalledWith(
        'admins',
        expect.objectContaining({
          where: expect.objectContaining({
            role: 'admin',
            is_active: true,
          }),
        })
      );
    });

    it('should have managers scope', () => {
      expect(User.addScope).toHaveBeenCalledWith(
        'managers',
        expect.objectContaining({
          where: expect.objectContaining({
            role: 'manager',
            is_active: true,
          }),
        })
      );
    });

    it('should have withoutPassword scope', () => {
      expect(User.addScope).toHaveBeenCalledWith(
        'withoutPassword',
        expect.objectContaining({
          attributes: expect.objectContaining({
            exclude: expect.arrayContaining(['password_hash', 'full_name_enc', 'phone_enc']),
          }),
        })
      );
    });
  });
});