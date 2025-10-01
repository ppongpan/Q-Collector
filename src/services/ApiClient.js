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
   */
  setupRequestInterceptor() {
    this.client.interceptors.request.use(
      (config) => {
        // Add authentication token if available
        const token = this.getToken();
        if (token) {
          config.headers[API_CONFIG.token.headerName] =
            `${API_CONFIG.token.headerPrefix} ${token}`;
        }

        // Log requests in development mode
        if (process.env.REACT_APP_ENV === 'development') {
          console.log('[API Request]', {
            method: config.method?.toUpperCase(),
            url: config.url,
            baseURL: config.baseURL,
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
    this.client.interceptors.response.use(
      (response) => {
        // Log successful responses in development
        if (process.env.REACT_APP_ENV === 'development') {
          console.log('[API Response]', {
            status: response.status,
            url: response.config.url,
            data: response.data,
          });
        }

        // Clear retry count on success
        const requestId = this.getRequestId(response.config);
        this.retryCount.delete(requestId);

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

        // Handle 401 Unauthorized - Token expired
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Attempt to refresh token
            const newToken = await this.refreshToken();

            if (newToken) {
              // Update token in storage
              this.setToken(newToken);

              // Retry original request with new token
              originalRequest.headers[API_CONFIG.token.headerName] =
                `${API_CONFIG.token.headerPrefix} ${newToken}`;

              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, clear auth and redirect to login
            this.clearAuth();
            window.location.href = '/login';
            return Promise.reject(refreshError);
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
    return localStorage.getItem('access_token');
  }

  /**
   * Set authentication token in storage
   */
  setToken(token) {
    localStorage.setItem('access_token', token);
  }

  /**
   * Get refresh token from storage
   */
  getRefreshToken() {
    return localStorage.getItem('refresh_token');
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
   */
  async refreshToken() {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post(
        `${API_CONFIG.baseURL}${API_CONFIG.endpoints.auth.refresh}`,
        { refreshToken },
        { withCredentials: API_CONFIG.withCredentials }
      );

      const { token, refreshToken: newRefreshToken } = response.data;

      if (newRefreshToken) {
        this.setRefreshToken(newRefreshToken);
      }

      return token;
    } catch (error) {
      throw new Error('Token refresh failed');
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
}

// Create and export singleton instance
const apiClient = new ApiClient();

export default apiClient;