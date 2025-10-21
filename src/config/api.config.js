/**
 * API Configuration
 * Central configuration for API client settings
 * @version 0.4.1
 */

// ✅ PWA Support: Auto-detect if running as standalone app
const isPWA = window.matchMedia('(display-mode: standalone)').matches;
const isNgrok = window.location.hostname.includes('ngrok');

// Determine API base URL
const getBaseURL = () => {
  // If REACT_APP_API_URL is set, use it
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // If running on ngrok (PWA or browser), use same origin + /api/v1
  if (isNgrok) {
    return `${window.location.origin}/api/v1`;
  }

  // If PWA mode, use current origin (same as ngrok URL)
  if (isPWA) {
    return `${window.location.origin}/api/v1`;
  }

  // Default: relative path for React proxy to work
  return '/api/v1';
};

// Debug logging
console.log('🔧 API Config:', {
  isPWA,
  isNgrok,
  hostname: window.location.hostname,
  origin: window.location.origin,
  baseURL: getBaseURL()
});

const API_CONFIG = {
  // Base URL for all API requests
  baseURL: getBaseURL(),

  // Request timeout in milliseconds (10 minutes for large imports)
  // ✅ FIX: Increased from 30s to 10 minutes to support Google Sheets import with large datasets
  timeout: 600000,

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
      stream: (id) => `/files/${id}/stream`, // ✅ Stream for thumbnails/preview (inline)
      download: (id) => `/files/${id}/download`, // Download as attachment
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
    stream: (id) => `/files/${id}/stream`, // ✅ Stream for thumbnails/preview (inline)
    download: (id) => `/files/${id}/download`,
    delete: (id) => `/files/${id}`,
  },
};

/**
 * Get file stream URL for thumbnails/preview
 * ✅ MOBILE-FRIENDLY: Works with ngrok proxy, no localhost:9000 URLs
 * @param {string} fileId - File UUID
 * @returns {string} Full URL to stream endpoint
 */
export const getFileStreamURL = (fileId) => {
  if (!fileId) return null;
  const baseURL = API_CONFIG.baseURL;
  return `${baseURL}/files/${fileId}/stream`;
};

export default API_CONFIG;