/**
 * Authentication Service
 *
 * Handles all authentication-related API calls:
 * - Login
 * - Register
 * - Logout
 * - Token refresh
 * - Get current user
 * - Update profile
 */

import ApiClient from './ApiClient';
import { API_ENDPOINTS } from '../config/api.config';
import * as tokenManager from '../utils/tokenManager';
import { parseApiError } from '../utils/apiHelpers';

class AuthService {
  /**
   * Login with username/email and password
   * @param {string} identifier - Username or email
   * @param {string} password - User password
   * @param {string} deviceFingerprint - Optional device fingerprint for trusted device feature
   * @returns {Promise<Object>} - User data and tokens
   */
  async login(identifier, password, deviceFingerprint = null) {
    try {
      const payload = {
        identifier,
        password
      };

      if (deviceFingerprint) {
        payload.deviceFingerprint = deviceFingerprint;
      }

      const response = await ApiClient.post(API_ENDPOINTS.auth.login, payload);

      // Check if 2FA is required
      if (response.data?.requires2FA) {
        return {
          requires2FA: true,
          tempToken: response.data.data.tempToken,
          username: response.data.data.username
        };
      }

      // Store tokens and user data
      const { data } = response;
      if (data?.tokens?.accessToken) {
        tokenManager.setAccessToken(data.tokens.accessToken);
      }
      if (data?.tokens?.refreshToken) {
        tokenManager.setRefreshToken(data.tokens.refreshToken);
      }
      if (data?.user) {
        tokenManager.setUser(data.user);
      }

      return {
        user: data?.user,
        data: data
      };
    } catch (error) {
      const message = parseApiError(error);
      throw new Error(message);
    }
  }

  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @param {string} userData.email - User email
   * @param {string} userData.password - User password
   * @param {string} userData.name - User name
   * @param {string} userData.role - User role (from REGISTRATION_ROLES only)
   * @returns {Promise<Object>} - User data and tokens
   */
  async register(userData) {
    try {
      const response = await ApiClient.post(API_ENDPOINTS.auth.register, userData);

      // Response structure: { success: true, data: { user, tokens } }
      const { data } = response;

      // Store tokens and user data
      if (data?.tokens?.accessToken) {
        tokenManager.setAccessToken(data.tokens.accessToken);
      }
      if (data?.tokens?.refreshToken) {
        tokenManager.setRefreshToken(data.tokens.refreshToken);
      }
      if (data?.user) {
        tokenManager.setUser(data.user);
      }

      return {
        user: data?.user,
        tokens: data?.tokens,
        data: data
      };
    } catch (error) {
      const message = parseApiError(error);
      throw new Error(message);
    }
  }

  /**
   * Logout current user
   * @returns {Promise<void>}
   */
  async logout() {
    try {
      // Call logout endpoint to invalidate token on server
      await ApiClient.post(API_ENDPOINTS.auth.logout);
    } catch (error) {
      console.warn('Logout API call failed:', error);
      // Continue with local logout even if API fails
    } finally {
      // Always clear local tokens
      tokenManager.clearTokens();
    }
  }

  /**
   * Refresh access token using refresh token
   * @returns {Promise<string>} - New access token
   */
  async refreshToken() {
    try {
      const refreshToken = tokenManager.getRefreshToken();
      if (!refreshToken) {
        throw new Error('ไม่พบ refresh token');
      }

      const response = await ApiClient.post(API_ENDPOINTS.auth.refresh, {
        refreshToken
      });

      // Store new access token
      if (response.accessToken) {
        tokenManager.setAccessToken(response.accessToken);
      }

      // Update user data if provided
      if (response.user) {
        tokenManager.setUser(response.user);
      }

      return response.accessToken;
    } catch (error) {
      // Clear tokens on refresh failure
      tokenManager.clearTokens();
      const message = parseApiError(error);
      throw new Error(message);
    }
  }

  /**
   * Get current user data from API
   * @returns {Promise<Object>} - User data
   */
  async getCurrentUser() {
    try {
      const response = await ApiClient.get(API_ENDPOINTS.auth.me);

      // Update stored user data
      if (response.user) {
        tokenManager.setUser(response.user);
      }

      return response.user;
    } catch (error) {
      const message = parseApiError(error);
      throw new Error(message);
    }
  }

  /**
   * Update user profile
   * @param {Object} updates - Profile updates
   * @returns {Promise<Object>} - Updated user data
   */
  async updateProfile(updates) {
    try {
      const response = await ApiClient.put(API_ENDPOINTS.auth.me, updates);

      // Update stored user data
      if (response.user) {
        tokenManager.setUser(response.user);
      }

      return response.user;
    } catch (error) {
      const message = parseApiError(error);
      throw new Error(message);
    }
  }

  /**
   * Change password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>}
   */
  async changePassword(currentPassword, newPassword) {
    try {
      const response = await ApiClient.post(`${API_ENDPOINTS.auth.me}/change-password`, {
        currentPassword,
        newPassword
      });

      return response;
    } catch (error) {
      const message = parseApiError(error);
      throw new Error(message);
    }
  }

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return tokenManager.isAuthenticated();
  }

  /**
   * Get current user from localStorage (no API call)
   * @returns {Object|null}
   */
  getStoredUser() {
    return tokenManager.getUser();
  }

  /**
   * Get current user role
   * @returns {string|null}
   */
  getUserRole() {
    return tokenManager.getUserRole();
  }

  /**
   * Get current user ID
   * @returns {string|null}
   */
  getUserId() {
    return tokenManager.getUserId();
  }

  /**
   * Check if token needs refresh
   * @returns {boolean}
   */
  shouldRefresh() {
    return tokenManager.shouldRefreshToken();
  }

  /**
   * Verify email (for future email verification feature)
   * @param {string} token - Verification token
   * @returns {Promise<Object>}
   */
  async verifyEmail(token) {
    try {
      const response = await ApiClient.post('/api/auth/verify-email', { token });
      return response;
    } catch (error) {
      const message = parseApiError(error);
      throw new Error(message);
    }
  }

  /**
   * Request password reset (for future password reset feature)
   * @param {string} email - User email
   * @returns {Promise<Object>}
   */
  async requestPasswordReset(email) {
    try {
      const response = await ApiClient.post('/api/auth/forgot-password', { email });
      return response;
    } catch (error) {
      const message = parseApiError(error);
      throw new Error(message);
    }
  }

  /**
   * Reset password with token (for future password reset feature)
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<Object>}
   */
  async resetPassword(token, newPassword) {
    try {
      const response = await ApiClient.post('/api/auth/reset-password', {
        token,
        newPassword
      });
      return response;
    } catch (error) {
      const message = parseApiError(error);
      throw new Error(message);
    }
  }

  /**
   * Get auth headers for manual API calls
   * @returns {Object}
   */
  getAuthHeaders() {
    return tokenManager.getAuthHeaders();
  }

  /**
   * Debug: Get token information
   * @returns {Object}
   */
  getTokenInfo() {
    return tokenManager.getTokenInfo();
  }
}

// Export singleton instance
export default new AuthService();