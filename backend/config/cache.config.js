/**
 * Cache Configuration
 * Centralized configuration for cache policies, TTL settings, and memory management
 */

const logger = require('../utils/logger.util');

/**
 * Cache TTL configurations (in seconds)
 */
const TTL = {
  // Authentication & Session
  SESSION: parseInt(process.env.CACHE_TTL_SESSION || '3600', 10), // 1 hour
  USER_DATA: parseInt(process.env.CACHE_TTL_USER_DATA || '1800', 10), // 30 minutes
  USER_PERMISSIONS: parseInt(process.env.CACHE_TTL_USER_PERMISSIONS || '3600', 10), // 1 hour

  // Forms & Data
  FORM_METADATA: parseInt(process.env.CACHE_TTL_FORM_METADATA || '7200', 10), // 2 hours
  FORM_SUBMISSIONS: parseInt(process.env.CACHE_TTL_FORM_SUBMISSIONS || '1800', 10), // 30 minutes
  FORM_FIELDS: parseInt(process.env.CACHE_TTL_FORM_FIELDS || '3600', 10), // 1 hour

  // API Responses
  API_GET: parseInt(process.env.CACHE_TTL_API_GET || '300', 10), // 5 minutes
  API_LIST: parseInt(process.env.CACHE_TTL_API_LIST || '600', 10), // 10 minutes
  API_STATIC: parseInt(process.env.CACHE_TTL_API_STATIC || '86400', 10), // 24 hours

  // Database Queries
  DB_READ: parseInt(process.env.CACHE_TTL_DB_READ || '900', 10), // 15 minutes
  DB_AGGREGATE: parseInt(process.env.CACHE_TTL_DB_AGGREGATE || '1800', 10), // 30 minutes
  DB_LOOKUP: parseInt(process.env.CACHE_TTL_DB_LOOKUP || '3600', 10), // 1 hour

  // Temporary & Short-lived
  RATE_LIMIT: parseInt(process.env.CACHE_TTL_RATE_LIMIT || '3600', 10), // 1 hour
  OTP: parseInt(process.env.CACHE_TTL_OTP || '300', 10), // 5 minutes
  TEMPORARY: parseInt(process.env.CACHE_TTL_TEMPORARY || '60', 10), // 1 minute

  // Long-term
  STATIC_DATA: parseInt(process.env.CACHE_TTL_STATIC_DATA || '86400', 10), // 24 hours
  CONFIG: parseInt(process.env.CACHE_TTL_CONFIG || '43200', 10), // 12 hours
};

/**
 * Cache key patterns and namespaces
 */
const KEYS = {
  // Authentication & Session
  SESSION: (sessionId) => `session:${sessionId}`,
  USER: (userId) => `user:${userId}`,
  USER_PERMISSIONS: (userId) => `user:${userId}:permissions`,
  USER_SESSIONS: (userId) => `user:${userId}:sessions`,

  // Forms & Data
  FORM: (formId) => `form:${formId}`,
  FORM_METADATA: (formId) => `form:${formId}:metadata`,
  FORM_FIELDS: (formId) => `form:${formId}:fields`,
  FORM_SUBMISSIONS: (formId, page = 1, limit = 20) => `form:${formId}:submissions:${page}:${limit}`,
  FORM_SUBMISSION: (submissionId) => `submission:${submissionId}`,

  // API Responses
  API_RESPONSE: (method, path, params = '') => {
    const paramHash = params ? require('crypto').createHash('md5').update(JSON.stringify(params)).digest('hex') : '';
    return `api:${method}:${path}${paramHash ? `:${paramHash}` : ''}`;
  },

  // Database Queries
  DB_QUERY: (table, query) => {
    const queryHash = require('crypto').createHash('md5').update(JSON.stringify(query)).digest('hex');
    return `db:${table}:${queryHash}`;
  },

  // Rate Limiting
  RATE_LIMIT: (ip, endpoint) => `rate:${ip}:${endpoint}`,

  // File Operations
  FILE_METADATA: (fileId) => `file:${fileId}:metadata`,

  // System
  HEALTH_CHECK: () => 'system:health',
  CONFIG: (key) => `config:${key}`,
};

/**
 * Cache policies configuration
 */
const POLICIES = {
  // Session Management
  session: {
    ttl: TTL.SESSION,
    compress: false,
    tags: ['session'],
    invalidateOn: ['logout', 'password_change'],
  },

  // User Data
  userData: {
    ttl: TTL.USER_DATA,
    compress: true,
    tags: ['user'],
    invalidateOn: ['user_update', 'role_change'],
  },

  // Form Metadata
  formMetadata: {
    ttl: TTL.FORM_METADATA,
    compress: true,
    tags: ['form', 'metadata'],
    invalidateOn: ['form_update', 'form_delete'],
  },

  // Form Submissions
  formSubmissions: {
    ttl: TTL.FORM_SUBMISSIONS,
    compress: true,
    tags: ['form', 'submission'],
    invalidateOn: ['submission_create', 'submission_update', 'submission_delete'],
  },

  // API Responses (GET methods)
  apiGet: {
    ttl: TTL.API_GET,
    compress: true,
    tags: ['api', 'get'],
    invalidateOn: ['data_change'],
  },

  // API List responses
  apiList: {
    ttl: TTL.API_LIST,
    compress: true,
    tags: ['api', 'list'],
    invalidateOn: ['data_change', 'list_update'],
  },

  // Database queries
  dbQuery: {
    ttl: TTL.DB_READ,
    compress: true,
    tags: ['db'],
    invalidateOn: ['data_change'],
  },

  // Static data
  staticData: {
    ttl: TTL.STATIC_DATA,
    compress: true,
    tags: ['static'],
    invalidateOn: ['config_update'],
  },
};

/**
 * Cache invalidation patterns
 */
const INVALIDATION_PATTERNS = {
  // User-related invalidation
  userUpdate: (userId) => [
    KEYS.USER(userId),
    KEYS.USER_PERMISSIONS(userId),
    `user:${userId}:*`,
  ],

  // Form-related invalidation
  formUpdate: (formId) => [
    KEYS.FORM(formId),
    KEYS.FORM_METADATA(formId),
    KEYS.FORM_FIELDS(formId),
    `form:${formId}:*`,
  ],

  // Submission-related invalidation
  submissionChange: (formId, submissionId) => [
    KEYS.FORM_SUBMISSION(submissionId),
    `form:${formId}:submissions:*`,
    'api:GET:*/submissions*',
  ],

  // Authentication invalidation
  authChange: (userId) => [
    KEYS.USER_SESSIONS(userId),
    `session:*:${userId}`,
    KEYS.USER_PERMISSIONS(userId),
  ],

  // API invalidation patterns
  apiInvalidation: (resource) => [
    `api:GET:*/${resource}*`,
    `api:GET:*${resource}*`,
  ],
};

/**
 * Memory management configuration
 */
const MEMORY = {
  // Maximum memory usage (in MB)
  maxMemory: parseInt(process.env.REDIS_MAX_MEMORY || '256', 10),

  // Memory eviction policy
  evictionPolicy: process.env.REDIS_EVICTION_POLICY || 'allkeys-lru',

  // Warning threshold (percentage)
  warningThreshold: parseInt(process.env.REDIS_MEMORY_WARNING_THRESHOLD || '80', 10),

  // Critical threshold (percentage)
  criticalThreshold: parseInt(process.env.REDIS_MEMORY_CRITICAL_THRESHOLD || '90', 10),

  // Compression settings
  compressionThreshold: parseInt(process.env.CACHE_COMPRESSION_THRESHOLD || '1024', 10), // 1KB
  compressionLevel: parseInt(process.env.CACHE_COMPRESSION_LEVEL || '6', 10), // gzip level
};

/**
 * Cache warmup configuration
 */
const WARMUP = {
  enabled: process.env.CACHE_WARMUP_ENABLED === 'true',

  // Data to preload on startup
  preload: [
    'system:config',
    'static:provinces',
    'static:departments',
  ],

  // Warmup strategies
  strategies: {
    // Most accessed forms
    popularForms: {
      enabled: true,
      limit: 10,
      schedule: '0 */6 * * *', // Every 6 hours
    },

    // Active user data
    activeUsers: {
      enabled: true,
      limit: 50,
      schedule: '0 */4 * * *', // Every 4 hours
    },

    // Recent submissions
    recentSubmissions: {
      enabled: true,
      limit: 100,
      schedule: '0 */2 * * *', // Every 2 hours
    },
  },
};

/**
 * Performance monitoring configuration
 */
const MONITORING = {
  enabled: process.env.CACHE_MONITORING_ENABLED === 'true',

  // Metrics collection interval (ms)
  metricsInterval: parseInt(process.env.CACHE_METRICS_INTERVAL || '60000', 10), // 1 minute

  // Slow operation threshold (ms)
  slowThreshold: parseInt(process.env.CACHE_SLOW_THRESHOLD || '100', 10),

  // Enable detailed logging
  detailedLogging: process.env.CACHE_DETAILED_LOGGING === 'true',

  // Alert thresholds
  alerts: {
    highMemoryUsage: 80, // percentage
    lowHitRate: 60, // percentage
    highErrorRate: 5, // percentage
    slowOperations: 10, // count per minute
  },
};

/**
 * Environment-specific configurations
 */
const ENVIRONMENT_CONFIGS = {
  development: {
    defaultTTL: 300, // 5 minutes
    enableDetailedLogging: true,
    compressionThreshold: 2048, // 2KB
  },

  test: {
    defaultTTL: 60, // 1 minute
    enableDetailedLogging: false,
    compressionThreshold: 1024, // 1KB
  },

  production: {
    defaultTTL: 3600, // 1 hour
    enableDetailedLogging: false,
    compressionThreshold: 1024, // 1KB
  },
};

/**
 * Get configuration for current environment
 */
function getEnvironmentConfig() {
  const env = process.env.NODE_ENV || 'development';
  return ENVIRONMENT_CONFIGS[env] || ENVIRONMENT_CONFIGS.development;
}

/**
 * Validate cache configuration
 */
function validateConfig() {
  const warnings = [];
  const errors = [];

  // Check TTL values
  Object.entries(TTL).forEach(([key, value]) => {
    if (value < 60) {
      warnings.push(`TTL.${key} is very short (${value}s) - consider increasing for better performance`);
    }
    if (value > 86400) {
      warnings.push(`TTL.${key} is very long (${value}s) - consider decreasing to avoid stale data`);
    }
  });

  // Check memory configuration
  if (MEMORY.maxMemory < 64) {
    warnings.push(`Redis max memory is very low (${MEMORY.maxMemory}MB) - consider increasing`);
  }

  // Check compression threshold
  if (MEMORY.compressionThreshold < 512) {
    warnings.push('Compression threshold is very low - may impact performance');
  }

  // Log warnings and errors
  warnings.forEach(warning => logger.warn(`Cache config warning: ${warning}`));
  errors.forEach(error => logger.error(`Cache config error: ${error}`));

  return { warnings, errors };
}

// Validate configuration on load
validateConfig();

module.exports = {
  TTL,
  KEYS,
  POLICIES,
  INVALIDATION_PATTERNS,
  MEMORY,
  WARMUP,
  MONITORING,
  getEnvironmentConfig,
  validateConfig,
};