/**
 * API Client
 * Axios-based HTTP client with interceptors, retry logic, and error handling
 * @version 0.4.1
 */

import axios from 'axios';
import API_CONFIG from '../config/api.config';
import { parseApiError } from '../utils/apiHelpers';

class ApiClient {
  constructor() {
    // Create axios instance with base configuration
    this.client = axios.create({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      headers: API_CONFIG.headers,
      withCredentials: API_CONFIG.withCredentials,
    });

    // Track retry attempts
    this.retryCount = new Map();

    // Setup interceptors
    this.setupRequestInterceptor();
    this.setupResponseInterceptor();
  }

  /**
   * Request Interceptor
   * Adds authentication token and logs requests in development
   * CRITICAL FIX: Excludes public endpoints (login, register, refresh) from token header
   */
  setupRequestInterceptor() {
    this.client.interceptors.request.use(
      (config) => {
        // Public endpoints that should NOT have Authorization header
        const publicEndpoints = [
          '/auth/login',
          '/auth/register',
          '/auth/refresh'
        ];

        // Check if this is a public endpoint
        const isPublicEndpoint = publicEndpoints.some(endpoint =>
          config.url?.includes(endpoint)
        );

        // Only add token for protected endpoints (NOT for login/register/refresh)
        if (!isPublicEndpoint) {
          // IMPORTANT: Always read token from localStorage (not cached)
          // This ensures we use the latest token after login
          // ✅ FIX: Use consistent storage key from config
          const token = localStorage.getItem(API_CONFIG.token.storageKey);
          if (token) {
            config.headers[API_CONFIG.token.headerName] =
              `${API_CONFIG.token.headerPrefix} ${token}`;
          }
        }

        // Log requests in development mode
        if (process.env.REACT_APP_ENV === 'development') {
          const hasAuthHeader = !!config.headers[API_CONFIG.token.headerName];
          // ✅ FIX: Use consistent storage key from config
          const token = localStorage.getItem(API_CONFIG.token.storageKey);

          // SPECIAL DEBUG LOG FOR LOGIN
          if (config.url?.includes('/auth/login')) {
            console.log('🔐 LOGIN REQUEST DEBUG:', {
              url: config.url,
              isPublic: isPublicEndpoint,
              hasToken: hasAuthHeader,
              authHeader: config.headers[API_CONFIG.token.headerName] || 'NONE',
              data: config.data
            });
          }

          // SPECIAL DEBUG LOG FOR GET /forms - Track exact token being used
          if (config.url?.includes('/forms') && config.method === 'get') {
            console.log('📋 GET /forms REQUEST DEBUG:', {
              url: config.url,
              hasToken: hasAuthHeader,
              tokenInLocalStorage: token ? `${token.substring(0, 20)}...` : 'NONE',
              tokenInHeader: config.headers[API_CONFIG.token.headerName] ?
                config.headers[API_CONFIG.token.headerName].substring(0, 30) + '...' : 'NONE',
              allLocalStorageKeys: Object.keys(localStorage),
              userInLocalStorage: !!localStorage.getItem('user')
            });
          }

          console.log('[API Request]', {
            method: config.method?.toUpperCase(),
            url: config.url,
            baseURL: config.baseURL,
            isPublic: isPublicEndpoint,
            hasToken: hasAuthHeader,
            data: config.data,
            params: config.params,
          });
        }

        return config;
      },
      (error) => {
        if (process.env.REACT_APP_ENV === 'development') {
          console.error('[API Request Error]', error);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Response Interceptor
   * Handles errors, token refresh, and retry logic
   */
  setupResponseInterceptor() {
    // Circuit breaker for refresh token failures
    let refreshFailureCount = 0;
    const MAX_REFRESH_FAILURES = 3;
    let isRefreshing = false;
    let failedQueue = [];

    const processQueue = (error, token = null) => {
      failedQueue.forEach((prom) => {
        if (error) {
          prom.reject(error);
        } else {
          prom.resolve(token);
        }
      });

      failedQueue = [];
    };

    this.client.interceptors.response.use(
      (response) => {
        // Log successful responses in development
        if (process.env.REACT_APP_ENV === 'development') {
          // SPECIAL DEBUG LOG FOR LOGIN RESPONSE
          if (response.config.url?.includes('/auth/login')) {
            console.log('✅ LOGIN RESPONSE DEBUG:', {
              status: response.status,
              hasUser: !!response.data?.user,
              hasToken: !!response.data?.token,
              hasTokens: !!response.data?.tokens,
              requires2FA: response.data?.requires2FA,
              requires2FASetup: response.data?.requires2FASetup,
              data: response.data
            });
          }

          console.log('[API Response]', {
            status: response.status,
            url: response.config.url,
            data: response.data,
          });
        }

        // Clear retry count on success
        const requestId = this.getRequestId(response.config);
        this.retryCount.delete(requestId);

        // Reset refresh failure count on any successful request
        refreshFailureCount = 0;

        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Log errors in development
        if (process.env.REACT_APP_ENV === 'development') {
          console.error('[API Response Error]', {
            status: error.response?.status,
            url: originalRequest?.url,
            message: error.message,
            data: error.response?.data,
          });
        }

        // Circuit breaker: Stop if too many refresh failures
        if (refreshFailureCount >= MAX_REFRESH_FAILURES) {
          console.info('[ApiClient] Session expired - triggering logout');

          // ✅ FIX: Save current URL before logout
          const currentPath = window.location.pathname + window.location.search;
          if (currentPath !== '/login' && currentPath !== '/register') {
            sessionStorage.setItem('redirectAfterLogin', currentPath);
            console.log('[ApiClient] Saved redirect path:', currentPath);
          }

          // Clear auth data
          this.clearAuth();

          // ✅ FIX: Dispatch custom event for AuthContext to handle logout
          // This prevents hard reload and allows React Router to handle navigation
          window.dispatchEvent(new CustomEvent('auth:session-expired'));

          return Promise.reject(new Error('Session expired. Please login again.'));
        }

        // Handle 401 Unauthorized - Token expired
        if (error.response?.status === 401 && !originalRequest._retry) {
          // Don't retry refresh endpoint itself
          if (originalRequest.url?.includes('/auth/refresh')) {
            refreshFailureCount++;

            // ✅ FIX: Save current URL before logout
            const currentPath = window.location.pathname + window.location.search;
            if (currentPath !== '/login' && currentPath !== '/register') {
              sessionStorage.setItem('redirectAfterLogin', currentPath);
              console.log('[ApiClient] Saved redirect path (refresh failed):', currentPath);
            }

            this.clearAuth();

            // ✅ FIX: Dispatch custom event instead of hard redirect
            window.dispatchEvent(new CustomEvent('auth:session-expired'));

            return Promise.reject(error);
          }

          // If already refreshing, queue this request
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers[API_CONFIG.token.headerName] =
                  `${API_CONFIG.token.headerPrefix} ${token}`;
                return this.client(originalRequest);
              })
              .catch((err) => {
                return Promise.reject(err);
              });
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            // Attempt to refresh token
            const newToken = await this.refreshToken();

            if (newToken) {
              // Reset failure count on success
              refreshFailureCount = 0;

              // Update token in storage
              this.setToken(newToken);

              // Process queued requests
              processQueue(null, newToken);

              // Retry original request with new token
              originalRequest.headers[API_CONFIG.token.headerName] =
                `${API_CONFIG.token.headerPrefix} ${newToken}`;

              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Increment failure count
            refreshFailureCount++;

            // Process queued requests with error
            processQueue(refreshError, null);

            // ✅ FIX: Save current URL before logout
            const currentPath = window.location.pathname + window.location.search;
            if (currentPath !== '/login' && currentPath !== '/register') {
              sessionStorage.setItem('redirectAfterLogin', currentPath);
              console.log('[ApiClient] Saved redirect path (refresh error):', currentPath);
            }

            // Clear auth and dispatch logout event
            console.info('[ApiClient] Session expired - clearing auth');
            this.clearAuth();

            // ✅ FIX: Dispatch custom event instead of hard redirect
            window.dispatchEvent(new CustomEvent('auth:session-expired'));

            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        }

        // Handle retryable errors
        if (this.shouldRetry(error, originalRequest)) {
          const requestId = this.getRequestId(originalRequest);
          const currentRetry = this.retryCount.get(requestId) || 0;

          if (currentRetry < API_CONFIG.retry.maxRetries) {
            // Increment retry count
            this.retryCount.set(requestId, currentRetry + 1);

            // Calculate exponential backoff delay
            const delay = API_CONFIG.retry.retryDelay * Math.pow(2, currentRetry);

            // Wait before retrying
            await this.delay(delay);

            // Retry request
            return this.client(originalRequest);
          }
        }

        // Transform error to user-friendly format
        const transformedError = this.transformError(error);
        return Promise.reject(transformedError);
      }
    );
  }

  /**
   * Get authentication token from storage
   */
  getToken() {
    // ✅ FIX: Use consistent storage key from config
    return localStorage.getItem(API_CONFIG.token.storageKey);
  }

  /**
   * Set authentication token in storage
   */
  setToken(token) {
    // ✅ FIX: Use consistent storage key from config
    localStorage.setItem(API_CONFIG.token.storageKey, token);
  }

  /**
   * Get refresh token from storage
   */
  getRefreshToken() {
    // ✅ FIX: Use consistent storage key from config
    return localStorage.getItem(API_CONFIG.token.refreshStorageKey);
  }

  /**
   * Set refresh token in storage
   */
  setRefreshToken(token) {
    localStorage.setItem(API_CONFIG.token.refreshStorageKey, token);
  }

  /**
   * Clear authentication tokens
   */
  clearAuth() {
    localStorage.removeItem(API_CONFIG.token.storageKey);
    localStorage.removeItem(API_CONFIG.token.refreshStorageKey);
  }

  /**
   * Refresh authentication token
   * ✅ CRITICAL FIX: Enhanced with proper error handling and logging
   */
  async refreshToken() {
    const refreshToken = this.getRefreshToken();

    console.log('🔄 [Token Refresh] Starting token refresh...', {
      hasRefreshToken: !!refreshToken,
      refreshTokenPreview: refreshToken ? `${refreshToken.substring(0, 20)}...` : 'NONE',
      endpoint: `${API_CONFIG.baseURL}${API_CONFIG.endpoints.auth.refresh}`
    });

    if (!refreshToken) {
      console.error('❌ [Token Refresh] No refresh token available');
      throw new Error('No refresh token available');
    }

    try {
      // ✅ FIX: Use axios directly (NOT this.client) to avoid circular interceptor calls
      // This is correct - we don't want the request interceptor to add expired token
      const response = await axios.post(
        `${API_CONFIG.baseURL}${API_CONFIG.endpoints.auth.refresh}`,
        { refreshToken },
        {
          withCredentials: API_CONFIG.withCredentials,
          timeout: 10000 // 10 second timeout for refresh
        }
      );

      console.log('✅ [Token Refresh] Response received:', {
        status: response.status,
        hasData: !!response.data,
        hasTokens: !!response.data?.tokens,
        hasAccessToken: !!response.data?.tokens?.accessToken,
        hasRefreshToken: !!response.data?.tokens?.refreshToken,
        dataKeys: Object.keys(response.data || {}),
        tokensKeys: response.data?.tokens ? Object.keys(response.data.tokens) : []
      });

      // ✅ FIX v0.7.9-dev: Correct path to tokens (response.data.tokens, not response.data directly)
      const tokens = response.data?.tokens;
      if (!tokens || !tokens.accessToken) {
        console.error('❌ [Token Refresh] No tokens in response:', {
          responseData: response.data,
          hasData: !!response.data,
          hasTokens: !!response.data?.tokens
        });
        throw new Error('No access token returned from refresh endpoint');
      }

      // Update refresh token if provided
      if (tokens.refreshToken) {
        console.log('🔄 [Token Refresh] Updating refresh token in localStorage');
        this.setRefreshToken(tokens.refreshToken);
      }

      console.log('✅ [Token Refresh] Success! New access token obtained');
      return tokens.accessToken;
    } catch (error) {
      // ✅ FIX: Detailed error logging for debugging
      console.error('❌ [Token Refresh] Failed:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        isTimeout: error.code === 'ECONNABORTED',
        isNetworkError: !error.response
      });

      // ✅ FIX: Preserve original error information
      const refreshError = new Error(
        error.response?.data?.message ||
        error.message ||
        'Token refresh failed'
      );
      refreshError.originalError = error;
      refreshError.status = error.response?.status;
      throw refreshError;
    }
  }

  /**
   * Check if request should be retried
   */
  shouldRetry(error, config) {
    // Don't retry if request was cancelled
    if (axios.isCancel(error)) {
      return false;
    }

    // Don't retry if already reached max retries
    const requestId = this.getRequestId(config);
    const currentRetry = this.retryCount.get(requestId) || 0;
    if (currentRetry >= API_CONFIG.retry.maxRetries) {
      return false;
    }

    // Retry on network errors
    if (!error.response) {
      return true;
    }

    // Retry on specific status codes
    return API_CONFIG.retry.retryableStatuses.includes(error.response.status);
  }

  /**
   * Generate unique request ID for retry tracking
   */
  getRequestId(config) {
    return `${config.method}-${config.url}`;
  }

  /**
   * Delay helper for retry logic
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Transform axios error to user-friendly format
   */
  transformError(error) {
    return {
      message: parseApiError(error),
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      isNetworkError: !error.response,
      isTimeout: error.code === 'ECONNABORTED',
      isCancelled: axios.isCancel(error),
      originalError: error,
    };
  }

  /**
   * GET request
   */
  async get(url, config = {}) {
    const response = await this.client.get(url, config);
    return response.data;
  }

  /**
   * POST request
   */
  async post(url, data = {}, config = {}) {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  /**
   * PUT request
   */
  async put(url, data = {}, config = {}) {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  /**
   * PATCH request
   */
  async patch(url, data = {}, config = {}) {
    const response = await this.client.patch(url, data, config);
    return response.data;
  }

  /**
   * DELETE request
   */
  async delete(url, config = {}) {
    const response = await this.client.delete(url, config);
    return response.data;
  }

  /**
   * File upload with progress tracking
   */
  async upload(url, formData, onProgress = null) {
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };

    // Add progress callback if provided
    if (onProgress) {
      config.onUploadProgress = (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      };
    }

    const response = await this.client.post(url, formData, config);
    return response.data;
  }

  /**
   * Download file
   */
  async download(url, filename) {
    const response = await this.client.get(url, {
      responseType: 'blob',
    });

    // Create download link
    const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);

    return response.data;
  }

  /**
   * Cancel token source for request cancellation
   */
  createCancelToken() {
    return axios.CancelToken.source();
  }

  /**
   * Check if error is cancel error
   */
  isCancel(error) {
    return axios.isCancel(error);
  }

  // ===================================
  // Two-Factor Authentication Methods
  // ===================================

  /**
   * Initialize 2FA setup - Get QR code and backup codes
   * @returns {Promise} Setup data with QR code and backup codes
   */
  async setup2FA() {
    return this.post('/2fa/setup');
  }

  /**
   * Enable 2FA with verification code
   * @param {string} code - 6-digit TOTP code from authenticator app
   * @returns {Promise} Success response
   */
  async enable2FA(code) {
    return this.post('/2fa/enable', { token: code });
  }

  /**
   * Disable 2FA with verification code
   * @param {string} code - 6-digit TOTP code or backup code
   * @returns {Promise} Success response
   */
  async disable2FA(code) {
    return this.post('/2fa/disable', { token: code });
  }

  /**
   * Verify 2FA code during login
   * @param {string} tempToken - Temporary token from initial login
   * @param {string} code - 6-digit TOTP code or backup code
   * @returns {Promise} Login response with user and tokens
   */
  async verify2FA(tempToken, code) {
    return this.post('/auth/login/2fa', { tempToken, token: code });
  }

  /**
   * Get 2FA status for current user
   * @returns {Promise} 2FA status data
   */
  async get2FAStatus() {
    return this.get('/2fa/status');
  }

  /**
   * Regenerate backup codes
   * @param {string} code - 6-digit TOTP code for verification
   * @returns {Promise} New backup codes
   */
  async regenerateBackupCodes(code) {
    return this.post('/2fa/backup-codes', { token: code });
  }

  // ===================================
  // Form Methods
  // ===================================

  /**
   * Create new form
   * @param {Object} formData - Form data (title, description, fields, etc.)
   * @returns {Promise} Created form with UUID
   */
  async createForm(formData) {
    return this.post('/forms', formData);
  }

  /**
   * Update existing form
   * @param {string} formId - Form UUID
   * @param {Object} formData - Updated form data
   * @returns {Promise} Updated form
   */
  async updateForm(formId, formData) {
    return this.put(`/forms/${formId}`, formData);
  }

  /**
   * Get form by ID
   * @param {string} formId - Form UUID
   * @returns {Promise} Form data
   */
  async getForm(formId) {
    return this.get(`/forms/${formId}`);
  }

  /**
   * List all forms
   * @param {Object} filters - Filter options (page, limit, search, etc.)
   * @returns {Promise} List of forms with pagination
   */
  async listForms(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.get(`/forms?${params.toString()}`);
  }

  /**
   * Delete form
   * @param {string} formId - Form UUID
   * @returns {Promise} Success response
   */
  async deleteForm(formId) {
    return this.delete(`/forms/${formId}`);
  }

  /**
   * Duplicate form
   * @param {string} formId - Form UUID to duplicate
   * @returns {Promise} New duplicated form
   */
  async duplicateForm(formId) {
    return this.post(`/forms/${formId}/duplicate`);
  }

  // ===================================
  // Submission Methods
  // ===================================

  /**
   * Create new submission
   * @param {string} formId - Form ID
   * @param {Object} fieldData - Form field data
   * @param {Object} metadata - Additional metadata (optional)
   * @returns {Promise} Created submission
   */
  async createSubmission(formId, fieldData, metadata = {}) {
    return this.post(`/forms/${formId}/submissions`, {
      fieldData,
      status: 'submitted',
      metadata
    });
  }

  /**
   * Get submission by ID
   * @param {string} submissionId - Submission ID
   * @returns {Promise} Submission data
   */
  async getSubmission(submissionId) {
    return this.get(`/submissions/${submissionId}`);
  }

  /**
   * List submissions for a form
   * @param {string} formId - Form ID
   * @param {Object} filters - Filter options (page, limit, status)
   * @returns {Promise} List of submissions with pagination
   */
  async listSubmissions(formId, filters = {}) {
    const params = new URLSearchParams(filters);
    return this.get(`/forms/${formId}/submissions?${params.toString()}`);
  }

  /**
   * Update existing submission
   * @param {string} submissionId - Submission ID
   * @param {Object} fieldData - Updated field data
   * @returns {Promise} Updated submission
   */
  async updateSubmission(submissionId, fieldData) {
    return this.put(`/submissions/${submissionId}`, { fieldData });
  }

  /**
   * Delete submission
   * @param {string} submissionId - Submission ID
   * @returns {Promise} Success response
   */
  async deleteSubmission(submissionId) {
    return this.delete(`/submissions/${submissionId}`);
  }

  /**
   * Export submissions
   * @param {string} formId - Form ID
   * @param {string} format - Export format (csv or json)
   * @returns {Promise} Exported data
   */
  async exportSubmissions(formId, format = 'csv') {
    return this.get(`/forms/${formId}/submissions/export?format=${format}`);
  }
}

// Create and export singleton instance
const apiClient = new ApiClient();

export default apiClient;