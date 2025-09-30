/**
 * Form Test Fixtures
 * Sample form data for testing
 */

module.exports = {
  // Basic form
  basic: {
    title: 'Basic Test Form',
    description: 'A simple test form',
    roles_allowed: ['user'],
    settings: {},
    is_active: true,
    version: 1,
  },

  // Form with all roles
  allRoles: {
    title: 'All Roles Form',
    description: 'Form accessible by all roles',
    roles_allowed: ['admin', 'manager', 'user', 'viewer'],
    settings: {},
    is_active: true,
    version: 1,
  },

  // Form with Telegram settings
  withTelegram: {
    title: 'Telegram Enabled Form',
    description: 'Form with Telegram notifications',
    roles_allowed: ['user', 'manager'],
    settings: {
      telegram: {
        enabled: true,
        botToken: 'test_bot_token',
        chatId: 'test_chat_id',
        notifyOnSubmit: true,
      },
    },
    is_active: true,
    version: 1,
  },

  // Form with validation settings
  withValidation: {
    title: 'Validation Form',
    description: 'Form with strict validation',
    roles_allowed: ['user'],
    settings: {
      validation: {
        strict: true,
        allowDuplicates: false,
        requireAllFields: true,
      },
    },
    is_active: true,
    version: 1,
  },

  // Complex form with multiple settings
  complex: {
    title: 'Complex Test Form',
    description: 'Form with multiple configuration options',
    roles_allowed: ['admin', 'manager'],
    settings: {
      telegram: {
        enabled: true,
        botToken: 'complex_bot_token',
        chatId: 'complex_chat_id',
      },
      validation: {
        strict: true,
        allowDuplicates: false,
      },
      submissions: {
        allowEdit: true,
        requireApproval: true,
        maxSubmissions: 100,
      },
      display: {
        theme: 'dark',
        showProgress: true,
      },
    },
    is_active: true,
    version: 2,
  },

  // Inactive form
  inactive: {
    title: 'Inactive Form',
    description: 'This form is inactive',
    roles_allowed: ['user'],
    settings: {},
    is_active: false,
    version: 1,
  },

  // Manager only form
  managerOnly: {
    title: 'Manager Only Form',
    description: 'Only managers can access',
    roles_allowed: ['manager'],
    settings: {},
    is_active: true,
    version: 1,
  },

  // Admin only form
  adminOnly: {
    title: 'Admin Only Form',
    description: 'Only admins can access',
    roles_allowed: ['admin'],
    settings: {},
    is_active: true,
    version: 1,
  },

  // Invalid forms for validation testing
  invalid: {
    // Missing required title
    noTitle: {
      description: 'Form without title',
      roles_allowed: ['user'],
      settings: {},
    },
    // Empty title
    emptyTitle: {
      title: '',
      description: 'Form with empty title',
      roles_allowed: ['user'],
      settings: {},
    },
    // Invalid roles
    invalidRoles: {
      title: 'Invalid Roles Form',
      description: 'Form with invalid roles',
      roles_allowed: ['superuser', 'guest'], // Invalid roles
      settings: {},
    },
    // Roles not an array
    rolesNotArray: {
      title: 'Non-Array Roles',
      description: 'Roles should be an array',
      roles_allowed: 'user', // Should be array
      settings: {},
    },
    // Settings not an object
    settingsNotObject: {
      title: 'Invalid Settings',
      description: 'Settings should be an object',
      roles_allowed: ['user'],
      settings: 'invalid', // Should be object
    },
  },
};