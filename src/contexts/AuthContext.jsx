/**
 * Authentication Context
 *
 * Provides global authentication state and RBAC permissions
 * - User state management
 * - Login/logout actions
 * - Token refresh logic
 * - Role-based access control
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AuthService from '../services/AuthService';
import * as tokenManager from '../utils/tokenManager'; // ✅ FIX v0.7.9-dev: Import for token expiry check
import {
  hasPermission,
  canAccessForm,
  canDeleteForm,
  getUserRole as getRoleFromUser,
  isAdminRole
} from '../config/roles.config';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (AuthService.isAuthenticated()) {
          const storedUser = AuthService.getStoredUser();

          // ✅ FIX: Set user immediately from localStorage to prevent logout on refresh
          // This prevents the flash of login screen during token validation
          if (storedUser) {
            setUser(storedUser);
          }

          // Validate token with backend in the background (non-blocking)
          try {
            // Try to fetch current user to validate token
            const validUser = await AuthService.getCurrentUser();
            // Update user with fresh data from backend
            if (validUser) {
              setUser(validUser);
            }
          } catch (error) {
            // ⚠️ Only clear session if token is definitely invalid
            // Network errors or temporary backend issues should NOT logout the user

            if (error.response?.status === 401 || error.response?.status === 403) {
              // Token is invalid (401) or forbidden (403) - try to refresh
              console.info('Token validation failed - attempting refresh');

              try {
                await AuthService.refreshToken();
                const updatedUser = await AuthService.getCurrentUser();
                setUser(updatedUser);
                console.info('Token refreshed successfully');
              } catch (refreshError) {
                // Only logout if refresh also fails
                console.info('Token refresh failed - session expired');
                AuthService.clearTokens();
                setUser(null);
              }
            } else {
              // Network error or server error - keep user logged in
              console.warn('Token validation failed (network/server error) - keeping session:', error.message);
              // Keep the stored user - don't logout on network errors
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Only clear tokens if there's a critical error
        if (error.response?.status === 401 || error.response?.status === 403) {
          AuthService.clearTokens();
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Auto-refresh token before expiration
  // ✅ FIX v0.7.9-dev: Add retry logic with exponential backoff
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      if (AuthService.shouldRefresh()) {
        const maxRetries = 3;
        let retryCount = 0;
        let refreshSuccess = false;

        // Retry loop with exponential backoff
        while (retryCount < maxRetries && !refreshSuccess) {
          try {
            await AuthService.refreshToken();
            const updatedUser = AuthService.getStoredUser();
            setUser(updatedUser);
            refreshSuccess = true;
            console.info(`✅ Token refreshed successfully (attempt ${retryCount + 1})`);
          } catch (error) {
            retryCount++;
            console.warn(`⚠️ Token refresh attempt ${retryCount}/${maxRetries} failed:`, error.message);

            // Only logout if:
            // 1. All retries exhausted AND
            // 2. Token is actually expired (not just network error)
            if (retryCount >= maxRetries) {
              const token = tokenManager.getAccessToken();
              const isExpired = !token || tokenManager.isTokenExpired(token);

              if (isExpired) {
                console.error('❌ Token expired after all retry attempts - logging out');
                await logout();
              } else {
                console.warn('⚠️ Token still valid despite refresh failures - will retry next interval');
              }
            } else {
              // Wait before retry (exponential backoff: 2s, 4s, 8s)
              const backoffDelay = Math.pow(2, retryCount) * 1000;
              console.info(`⏳ Waiting ${backoffDelay}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, backoffDelay));
            }
          }
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [user]);

  // ✅ FIX: Listen for session expiry events from ApiClient
  useEffect(() => {
    const handleSessionExpired = () => {
      console.info('[AuthContext] Session expired event received - logging out');
      // Clear user state and tokens
      setUser(null);
      // ✅ v0.8.2 FIX: Use correct localStorage keys (same as tokenManager.js)
      localStorage.removeItem('q-collector-auth-token');
      localStorage.removeItem('q-collector-refresh-token');
      localStorage.removeItem('user');
      console.log('🗑️ Tokens cleared with correct keys');
      // Note: No need to navigate here - React Router will handle redirect via PrivateRoute
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);

    return () => {
      window.removeEventListener('auth:session-expired', handleSessionExpired);
    };
  }, []);

  /**
   * Login with username/email and password
   */
  const login = useCallback(async (identifier, password, deviceFingerprint = null) => {
    setIsAuthenticating(true);
    try {
      const response = await AuthService.login(identifier, password, deviceFingerprint);
      // Only set user if not requiring 2FA or 2FA setup
      if (!response.requires2FA && !response.requires2FASetup && response.user) {
        setUser(response.user);
      }
      return response;
    } catch (error) {
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  /**
   * Register new user
   */
  const register = useCallback(async (userData) => {
    setIsAuthenticating(true);
    try {
      const response = await AuthService.register(userData);

      // Only set user if 2FA setup is not required
      if (response.data?.requires_2fa_setup !== true) {
        setUser(response.user);
      }

      return response;
    } catch (error) {
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  /**
   * Logout current user
   */
  const logout = useCallback(async () => {
    try {
      await AuthService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  }, []);

  /**
   * Update user profile
   */
  const updateProfile = useCallback(async (updates) => {
    try {
      const updatedUser = await AuthService.updateProfile(updates);
      setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      throw error;
    }
  }, []);

  /**
   * Change password
   */
  const changePassword = useCallback(async (currentPassword, newPassword) => {
    try {
      await AuthService.changePassword(currentPassword, newPassword);
    } catch (error) {
      throw error;
    }
  }, []);

  /**
   * Refresh current user data from API
   */
  const refreshUser = useCallback(async () => {
    try {
      const updatedUser = await AuthService.getCurrentUser();
      setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Refresh user error:', error);
      throw error;
    }
  }, []);

  // Permission checking functions

  /**
   * Check if user has a specific permission
   */
  const checkPermission = useCallback((permission) => {
    if (!user || !user.role) return false;
    return hasPermission(user.role, permission);
  }, [user]);

  /**
   * Check if user can access a form based on tags
   */
  const checkFormAccess = useCallback((formTags = [], formOwnerId = null) => {
    if (!user || !user.role) return false;
    return canAccessForm(user.role, formTags, formOwnerId, user.id);
  }, [user]);

  /**
   * Check if user can delete a form
   */
  const checkDeleteForm = useCallback((formOwnerId) => {
    if (!user || !user.role) return false;
    return canDeleteForm(user.role, formOwnerId, user.id);
  }, [user]);

  /**
   * Check if current user is admin role
   */
  const isAdmin = useCallback(() => {
    if (!user || !user.role) return false;
    return isAdminRole(user.role);
  }, [user]);

  /**
   * Get list of forms user can access (filter by tags)
   */
  const filterAccessibleForms = useCallback((forms) => {
    if (!user || !user.role) return [];

    // Admin roles can access all forms
    if (isAdmin()) return forms;

    // Filter forms by tag access
    return forms.filter(form => checkFormAccess(form.tags, form.createdBy));
  }, [user, checkFormAccess, isAdmin]);

  /**
   * Manually set user (for 2FA completion)
   */
  const setUserData = useCallback((userData) => {
    setUser(userData);
  }, []);

  const value = {
    // State
    user,
    isLoading,
    isAuthenticating,
    isAuthenticated: !!user,

    // Actions
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    refreshUser,
    setUser: setUserData,

    // Permission checks
    checkPermission,
    checkFormAccess,
    checkDeleteForm,
    isAdmin,
    filterAccessibleForms,

    // Convenience getters
    userId: user?.id || null,
    userRole: user?.role || null,
    userEmail: user?.email || null,
    userName: user?.username || user?.name || 'ผู้ใช้งาน'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;