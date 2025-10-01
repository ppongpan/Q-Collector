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
          setUser(storedUser);

          // Check if token needs refresh
          if (AuthService.shouldRefresh()) {
            try {
              await AuthService.refreshToken();
              const updatedUser = AuthService.getStoredUser();
              setUser(updatedUser);
            } catch (error) {
              console.error('Token refresh failed:', error);
              setUser(null);
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Auto-refresh token before expiration
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      if (AuthService.shouldRefresh()) {
        try {
          await AuthService.refreshToken();
          const updatedUser = AuthService.getStoredUser();
          setUser(updatedUser);
        } catch (error) {
          console.error('Auto token refresh failed:', error);
          // Logout on refresh failure
          await logout();
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [user]);

  /**
   * Login with username/email and password
   */
  const login = useCallback(async (identifier, password) => {
    setIsAuthenticating(true);
    try {
      const response = await AuthService.login(identifier, password);
      setUser(response.user);
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
      setUser(response.user);
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