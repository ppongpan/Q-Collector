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
      login: '/api/auth/login',
      register: '/api/auth/register',
      logout: '/api/auth/logout',
      refresh: '/api/auth/refresh',
      me: '/api/auth/me',
    },
    forms: {
      base: '/api/forms',
      byId: (id) => `/api/forms/${id}`,
      publish: (id) => `/api/forms/${id}/publish`,
      unpublish: (id) => `/api/forms/${id}/unpublish`,
    },
    submissions: {
      base: '/api/submissions',
      byId: (id) => `/api/submissions/${id}`,
      byForm: (formId) => `/api/submissions/form/${formId}`,
      export: (formId) => `/api/submissions/form/${formId}/export`,
    },
    files: {
      upload: '/api/files/upload',
      byId: (id) => `/api/files/${id}`,
      download: (id) => `/api/files/${id}/download`,
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
    login: '/api/v1/auth/login',
    register: '/api/v1/auth/register',
    logout: '/api/v1/auth/logout',
    refresh: '/api/v1/auth/refresh',
    me: '/api/v1/auth/me',
  },
  forms: {
    list: '/api/v1/forms',
    create: '/api/v1/forms',
    get: (id) => `/api/v1/forms/${id}`,
    update: (id) => `/api/v1/forms/${id}`,
    delete: (id) => `/api/v1/forms/${id}`,
  },
  submissions: {
    list: '/api/v1/submissions',
    create: '/api/v1/submissions',
    get: (id) => `/api/v1/submissions/${id}`,
    byForm: (formId) => `/api/v1/forms/${formId}/submissions`,
  },
  files: {
    upload: '/api/v1/files/upload',
    get: (id) => `/api/v1/files/${id}`,
    download: (id) => `/api/v1/files/${id}/download`,
    delete: (id) => `/api/v1/files/${id}`,
  },
};

export default API_CONFIG;