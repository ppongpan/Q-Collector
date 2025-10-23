/**
 * Test Users Fixture
 * Provides test user data for all roles
 *
 * @version 0.7.0
 * @since 2025-10-02
 */

/**
 * Available roles in the system
 */
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  
  CUSTOMER_SERVICE: 'customer_service',
  SALES: 'sales',
  MARKETING: 'marketing',
  TECHNIC: 'technic',
  GENERAL_USER: 'general_user'
};

/**
 * Department to role mapping (for self-registration)
 */
const DEPARTMENTS = {
  CUSTOMER_SERVICE: { value: 'customer_service', label: 'Customer Service', role: 'customer_service' },
  SALES: { value: 'sales', label: 'Sales', role: 'sales' },
  MARKETING: { value: 'marketing', label: 'Marketing', role: 'marketing' },
  TECHNIC: { value: 'technic', label: 'Technic', role: 'technic' },
  OTHERS: { value: 'others', label: 'Others', role: 'general_user' }
};

/**
 * Generate unique test user data
 * @param {string} role - User role
 * @param {string} suffix - Unique suffix (usually timestamp)
 * @returns {Object} User data object
 */
function generateTestUser(role, suffix = Date.now()) {
  // Remove underscores from role for username (alphanumeric only)
  const cleanRole = role.replace(/_/g, '');
  const username = `test${cleanRole}${suffix}`;

  return {
    username,
    email: `${username}@test.com`,
    password: 'TestPassword123',
    full_name: `Test ${role.replace('_', ' ').toUpperCase()} User`,
    role,
    department: mapRoleToDepartment(role)
  };
}

/**
 * Map role to department value
 * @param {string} role - User role
 * @returns {string} Department value
 */
function mapRoleToDepartment(role) {
  switch (role) {
    case ROLES.CUSTOMER_SERVICE:
      return DEPARTMENTS.CUSTOMER_SERVICE.value;
    case ROLES.SALES:
      return DEPARTMENTS.SALES.value;
    case ROLES.MARKETING:
      return DEPARTMENTS.MARKETING.value;
    case ROLES.TECHNIC:
      return DEPARTMENTS.TECHNIC.value;
    case ROLES.GENERAL_USER:
    default:
      return DEPARTMENTS.OTHERS.value;
  }
}

/**
 * Generate test users for all self-registration roles
 * @param {string} suffix - Unique suffix
 * @returns {Object} Object with users for each role
 */
function generateAllTestUsers(suffix = Date.now()) {
  return {
    customerService: generateTestUser(ROLES.CUSTOMER_SERVICE, `cs${suffix}`),
    sales: generateTestUser(ROLES.SALES, `sales${suffix}`),
    marketing: generateTestUser(ROLES.MARKETING, `mkt${suffix}`),
    technic: generateTestUser(ROLES.TECHNIC, `tech${suffix}`),
    generalUser: generateTestUser(ROLES.GENERAL_USER, `user${suffix}`)
  };
}

/**
 * Pre-defined test user for super admin
 * (Should be created via backend script, not self-registration)
 */
const SUPER_ADMIN_USER = {
  username: 'pongpanp',
  email: 'admin@example.com',
  password: 'Gfvtmiu613'
};

/**
 * Generate invalid user data for validation testing
 * @returns {Object} Various invalid user data scenarios
 */
function generateInvalidUserData() {
  const timestamp = Date.now();

  return {
    shortUsername: {
      username: 'ab',  // Too short
      email: `test${timestamp}@test.com`,
      password: 'TestPassword123',
      full_name: 'Test User',
      error: 'Username must be 3-50 characters'
    },
    invalidEmail: {
      username: `testuser${timestamp}`,
      email: 'notanemail',  // Invalid email
      password: 'TestPassword123',
      full_name: 'Test User',
      error: 'Valid email is required'
    },
    weakPassword: {
      username: `testuser${timestamp}`,
      email: `test${timestamp}@test.com`,
      password: 'weak',  // Too short, no uppercase, no number
      full_name: 'Test User',
      error: 'Password must be at least 8 characters'
    },
    noUppercase: {
      username: `testuser${timestamp}`,
      email: `test${timestamp}@test.com`,
      password: 'testpassword123',  // No uppercase
      full_name: 'Test User',
      error: 'Password must contain uppercase, lowercase, and number'
    },
    noLowercase: {
      username: `testuser${timestamp}`,
      email: `test${timestamp}@test.com`,
      password: 'TESTPASSWORD123',  // No lowercase
      full_name: 'Test User',
      error: 'Password must contain uppercase, lowercase, and number'
    },
    noNumber: {
      username: `testuser${timestamp}`,
      email: `test${timestamp}@test.com`,
      password: 'TestPassword',  // No number
      full_name: 'Test User',
      error: 'Password must contain uppercase, lowercase, and number'
    },
    specialCharInUsername: {
      username: `test@user${timestamp}`,  // Has special char (@)
      email: `test${timestamp}@test.com`,
      password: 'TestPassword123',
      full_name: 'Test User',
      error: 'Username must contain only letters and numbers'
    }
  };
}

module.exports = {
  ROLES,
  DEPARTMENTS,
  SUPER_ADMIN_USER,
  generateTestUser,
  generateAllTestUsers,
  generateInvalidUserData,
  mapRoleToDepartment
};
