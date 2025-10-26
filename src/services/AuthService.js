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

import axios from 'axios';
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

      console.log('AuthService - API response:', JSON.stringify(response, null, 2));

      // Check if 2FA setup is required (admin forced enable)
      if (response.requires2FASetup) {
        return {
          requires2FASetup: true,
          tempToken: response.data?.tempToken,
          username: response.data?.username,
          data: response
        };
      }

      // Check if 2FA verification is required
      if (response.requires2FA) {
        return {
          requires2FA: true,
          tempToken: response.data?.tempToken,
          username: response.data?.username,
          data: response
        };
      }

      // Store tokens and user data
      const { data } = response;
      console.log('🔑 AuthService - Storing tokens:', {
        hasAccessToken: !!data?.tokens?.accessToken,
        hasRefreshToken: !!data?.tokens?.refreshToken,
        hasUser: !!data?.user,
        accessTokenPreview: data?.tokens?.accessToken ? data.tokens.accessToken.substring(0, 20) + '...' : 'NONE'
      });

      if (data?.tokens?.accessToken) {
        tokenManager.setAccessToken(data.tokens.accessToken);
        console.log('✅ AuthService - Access token saved to localStorage');
      }
      if (data?.tokens?.refreshToken) {
        tokenManager.setRefreshToken(data.tokens.refreshToken);
        console.log('✅ AuthService - Refresh token saved to localStorage');
      }
      if (data?.user) {
        tokenManager.setUser(data.user);
        console.log('✅ AuthService - User saved to localStorage:', data.user.username);
      }

      // ✅ FIX v0.7.9-dev: Verify tokens were actually saved (use correct storage key!)
      const verifyAccessToken = tokenManager.getAccessToken();
      console.log('🔍 AuthService - Verification check:', {
        tokenInLocalStorage: verifyAccessToken ? verifyAccessToken.substring(0, 20) + '...' : 'NONE',
        matchesNewToken: verifyAccessToken === data?.tokens?.accessToken
      });

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

      console.log('🔍 AuthService.register - RAW response from ApiClient:', JSON.stringify(response, null, 2));

      // Response structure:
      // { success: true, data: { user, tokens } } - Normal registration
      // OR { success: true, data: { user, requires_2fa_setup: true, tempToken } } - 2FA setup required
      const { data } = response;

      console.log('🔍 AuthService.register - Extracted data:', JSON.stringify(data, null, 2));
      console.log('🔍 AuthService.register - requires_2fa_setup check:', {
        'data?.requires_2fa_setup': data?.requires_2fa_setup,
        'typeof': typeof data?.requires_2fa_setup,
        'strict equality': data?.requires_2fa_setup === true
      });

      // Check if user requires 2FA setup
      if (data?.requires_2fa_setup === true) {
        // Don't store tokens or user data - user must complete 2FA setup first
        console.log('✅ AuthService.register - User requires 2FA setup, not storing tokens');
        const returnValue = {
          user: data?.user,
          data: data // Contains: requires_2fa_setup, tempToken, user
        };
        console.log('🔍 AuthService.register - Returning:', JSON.stringify(returnValue, null, 2));
        return returnValue;
      }

      // Normal registration - Store tokens and user data
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
   *
   * ✅ FIX v0.7.9-dev: Check token exists before calling API
   * - Prevents 401 errors when tokens already cleared by refresh failure
   * - Cleaner console output for better UX
   */
  async logout() {
    try {
      // ✅ FIX: Only call API if we have a valid token
      const token = tokenManager.getAccessToken();
      if (token) {
        // Call logout endpoint to invalidate token on server
        await ApiClient.post(API_ENDPOINTS.auth.logout);
      } else {
        console.info('Logout: No token to invalidate (already cleared)');
      }
    } catch (error) {
      // ✅ FIX: Don't warn on 401 - expected if token already cleared
      if (error.response?.status !== 401) {
        console.warn('Logout API call failed:', error);
      }
      // Continue with local logout even if API fails
    } finally {
      // Always clear local tokens (safe to call even if already cleared)
      tokenManager.clearTokens();
    }
  }

  /**
   * Refresh access token using refresh token
   * ✅ UNIFIED FIX: Use axios directly to avoid ApiClient interceptor loop
   * @returns {Promise<string>} - New access token
   */
  async refreshToken() {
    try {
      // ✅ v0.8.2: Enhanced debug - check localStorage directly
      const refreshToken = tokenManager.getRefreshToken();
      const directCheck = localStorage.getItem('q-collector-refresh-token');

      console.log('🔄 AuthService.refreshToken - Debug:', {
        hasRefreshToken: !!refreshToken,
        hasDirectCheck: !!directCheck,
        refreshTokenPreview: refreshToken ? refreshToken.substring(0, 30) + '...' : 'NONE',
        directCheckPreview: directCheck ? directCheck.substring(0, 30) + '...' : 'NONE',
        endpoint: API_ENDPOINTS.auth.refresh,
        localStorageKeys: Object.keys(localStorage)
      });

      if (!refreshToken) {
        console.error('❌ AuthService.refreshToken - Refresh token missing!', {
          directCheck: !!directCheck,
          allKeys: Object.keys(localStorage)
        });
        throw new Error('ไม่พบ refresh token');
      }

      // ✅ FIX: Use axios directly to bypass ApiClient interceptor
      // This prevents infinite loop when refresh endpoint returns 401
      const response = await axios.post(
        `/api/v1${API_ENDPOINTS.auth.refresh}`,
        { refreshToken },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          withCredentials: true
        }
      );

      console.log('✅ AuthService.refreshToken - Success:', {
        hasNewAccessToken: !!response.data?.data?.tokens?.accessToken,
        hasNewRefreshToken: !!response.data?.data?.tokens?.refreshToken,
        hasUser: !!response.data?.data?.user,
        responseKeys: Object.keys(response),
        dataKeys: response.data ? Object.keys(response.data) : [],
        nestedDataKeys: response.data?.data ? Object.keys(response.data.data) : []
      });

      // ✅ FIX v0.8.2: Correct path to access tokens (response.data.data.tokens)
      // Backend returns: { success: true, data: { tokens: { ... } } }
      // Store new access token
      if (response.data?.data?.tokens?.accessToken) {
        tokenManager.setAccessToken(response.data.data.tokens.accessToken);
        console.log('✅ AuthService.refreshToken - Access token saved to localStorage');
      } else {
        console.error('❌ AuthService.refreshToken - No access token in response:', response);
      }

      // Store new refresh token if provided
      if (response.data?.data?.tokens?.refreshToken) {
        tokenManager.setRefreshToken(response.data.data.tokens.refreshToken);
        console.log('✅ AuthService.refreshToken - Refresh token updated in localStorage');
      }

      // Update user data if provided (may not be in refresh response)
      if (response.data?.data?.user) {
        tokenManager.setUser(response.data.data.user);
        console.log('✅ AuthService.refreshToken - User data updated in localStorage');
      }

      return response.data.data.tokens.accessToken;
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