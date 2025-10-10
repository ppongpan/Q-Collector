/**
 * Jest Configuration
 * Testing framework configuration for Q-Collector Backend
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Root directory
  rootDir: './',

  // Test match patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js',
  ],

  // Coverage directory
  coverageDirectory: 'coverage',

  // Collect coverage from
  collectCoverageFrom: [
    'utils/**/*.js',
    'models/**/*.js',
    'services/**/*.js',
    'middleware/**/*.js',
    'api/**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/tests/**',
    '!**/migrations/**',
    '!**/seeders/**',
    '!models/index.js', // Exclude Sequelize index
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
    './utils/': {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90,
    },
    './models/': {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Test timeout (10 seconds)
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles (useful for debugging)
  detectOpenHandles: false,

  // Max workers (parallel test execution)
  maxWorkers: '50%',

  // Transform files (if needed for ES6)
  transform: {},

  // Module paths
  modulePaths: ['<rootDir>'],

  // Global setup/teardown
  // globalSetup: '<rootDir>/tests/globalSetup.js',
  // globalTeardown: '<rootDir>/tests/globalTeardown.js',
};