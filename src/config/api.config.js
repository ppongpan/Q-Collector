/**
 * API Configuration
 * Central configuration for API client settings
 * @version 0.4.1
 */

const API_CONFIG = {
  // Base URL for all API requests
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1',

  // Request timeout in milliseconds (30 seconds)
  timeout: 30000,

  // Default headers for all requests
  headers: {
    'Content-Type': 'application/json',
  },

  // Include credentials (cookies) in cross-origin requests
  withCredentials: true,

  // Retry configuration
  retry: {
    maxRetries: 3,
    retryDelay: 1000, // ms
    retryableStatuses: [408, 429, 500, 502, 503, 504],
  },

  // Token configuration
  token: {
    storageKey: 'q-collector-auth-token',
    refreshStorageKey: 'q-collector-refresh-token',
    headerName: 'Authorization',
    headerPrefix: 'Bearer',
  },

  // API endpoints
  endpoints: {
    auth: {
      login: '/auth/login',
      register: '/auth/register',
      logout: '/auth/logout',
      refresh: '/auth/refresh',
      me: '/auth/me',
    },
    forms: {
      base: '/forms',
      byId: (id) => `/forms/${id}`,
      publish: (id) => `/forms/${id}/publish`,
      unpublish: (id) => `/forms/${id}/unpublish`,
    },
    submissions: {
      base: '/submissions',
      byId: (id) => `/submissions/${id}`,
      byForm: (formId) => `/submissions/form/${formId}`,
      export: (formId) => `/submissions/form/${formId}/export`,
    },
    files: {
      upload: '/files/upload',
      byId: (id) => `/files/${id}`,
      download: (id) => `/files/${id}/download`,
    },
  },
};

// Environment-specific overrides
if (process.env.REACT_APP_ENV === 'production') {
  API_CONFIG.timeout = 60000; // Increase timeout for production
  API_CONFIG.retry.maxRetries = 5;
}

// Export API endpoints separately for convenience
export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    me: '/auth/me',
  },
  forms: {
    list: '/forms',
    create: '/forms',
    get: (id) => `/forms/${id}`,
    update: (id) => `/forms/${id}`,
    delete: (id) => `/forms/${id}`,
  },
  submissions: {
    list: '/submissions',
    create: '/submissions',
    get: (id) => `/submissions/${id}`,
    byForm: (formId) => `/forms/${formId}/submissions`,
  },
  files: {
    upload: '/files/upload',
    get: (id) => `/files/${id}`,
    download: (id) => `/files/${id}/download`,
    delete: (id) => `/files/${id}`,
  },
};

export default API_CONFIG;