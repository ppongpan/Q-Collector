/**
 * User Test Fixtures
 * Sample user data for testing
 */

module.exports = {
  // Valid admin user
  admin: {
    username: 'adminuser',
    email: 'admin@qcollector.test',
    password_hash: 'Admin@123',
    full_name: 'Admin User',
    role: 'admin',
    phone: '0812345678',
    is_active: true,
  },

  // Valid manager user
  manager: {
    username: 'manageruser',
    email: 'manager@qcollector.test',
    password_hash: 'Manager@123',
    full_name: 'Manager User',
    role: 'manager',
    phone: '0823456789',
    is_active: true,
  },

  // Valid regular user
  user: {
    username: 'testuser',
    email: 'user@qcollector.test',
    password_hash: 'User@123',
    full_name: 'Test User',
    role: 'user',
    phone: '0834567890',
    is_active: true,
  },

  // Valid viewer user
  viewer: {
    username: 'vieweruser',
    email: 'viewer@qcollector.test',
    password_hash: 'Viewer@123',
    full_name: 'Viewer User',
    role: 'viewer',
    phone: '0845678901',
    is_active: true,
  },

  // Inactive user
  inactive: {
    username: 'inactiveuser',
    email: 'inactive@qcollector.test',
    password_hash: 'Inactive@123',
    full_name: 'Inactive User',
    role: 'user',
    phone: '0856789012',
    is_active: false,
  },

  // User without encrypted fields
  minimal: {
    username: 'minimaluser',
    email: 'minimal@qcollector.test',
    password_hash: 'Minimal@123',
    role: 'user',
    is_active: true,
  },

  // User with Thai name
  thai: {
    username: 'thaiuser',
    email: 'thai@qcollector.test',
    password_hash: 'Thai@123',
    full_name: 'ทดสอบ ระบบ',
    role: 'user',
    phone: '0867890123',
    is_active: true,
  },

  // Invalid users for validation testing
  invalid: {
    // Missing required fields
    noUsername: {
      email: 'nouser@qcollector.test',
      password_hash: 'Password@123',
      role: 'user',
    },
    noEmail: {
      username: 'noemail',
      password_hash: 'Password@123',
      role: 'user',
    },
    noPassword: {
      username: 'nopassword',
      email: 'nopass@qcollector.test',
      role: 'user',
    },
    // Invalid formats
    invalidEmail: {
      username: 'invalidemail',
      email: 'not-an-email',
      password_hash: 'Password@123',
      role: 'user',
    },
    invalidUsername: {
      username: 'a', // Too short
      email: 'short@qcollector.test',
      password_hash: 'Password@123',
      role: 'user',
    },
    invalidRole: {
      username: 'invalidrole',
      email: 'role@qcollector.test',
      password_hash: 'Password@123',
      role: 'superuser', // Invalid role
    },
  },
};