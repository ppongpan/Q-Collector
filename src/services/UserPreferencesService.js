/**
 * UserPreferencesService
 * Manages user preferences for the Q-Collector application
 * Stores settings in localStorage per user and per form
 *
 * v0.7.38 - User Preferences System
 */

import { useAuth } from '../contexts/AuthContext';

class UserPreferencesService {
  constructor() {
    this.storagePrefix = 'qcollector_prefs_';
  }

  /**
   * Get storage key for a specific user and form
   * @param {string} userId - User ID
   * @param {string} formId - Form ID (optional, for form-specific preferences)
   * @returns {string} Storage key
   */
  getStorageKey(userId, formId = null) {
    if (formId) {
      return `${this.storagePrefix}${userId}_form_${formId}`;
    }
    return `${this.storagePrefix}${userId}_global`;
  }

  /**
   * Save form submission list preferences
   * @param {string} userId - User ID
   * @param {string} formId - Form ID
   * @param {Object} preferences - Preferences object
   * @param {string} preferences.sortBy - Sort field
   * @param {string} preferences.sortOrder - Sort order (ASC/DESC)
   * @param {string} preferences.selectedDateField - Selected date field for filtering
   * @param {string} preferences.month - Selected month filter
   * @param {string} preferences.year - Selected year filter
   * @param {number} preferences.itemsPerPage - Items per page
   */
  saveFormListPreferences(userId, formId, preferences) {
    try {
      const key = this.getStorageKey(userId, formId);
      const data = {
        sortBy: preferences.sortBy || 'submittedAt',
        sortOrder: preferences.sortOrder || 'DESC',
        selectedDateField: preferences.selectedDateField || 'submittedAt',
        month: preferences.month || 'all',
        year: preferences.year || 'all',
        itemsPerPage: preferences.itemsPerPage || 20,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(key, JSON.stringify(data));
      console.log('✅ [UserPreferences] Saved preferences for form:', formId, data);
      return true;
    } catch (error) {
      console.error('❌ [UserPreferences] Error saving preferences:', error);
      return false;
    }
  }

  /**
   * Load form submission list preferences
   * @param {string} userId - User ID
   * @param {string} formId - Form ID
   * @returns {Object|null} Preferences object or null if not found
   */
  loadFormListPreferences(userId, formId) {
    try {
      const key = this.getStorageKey(userId, formId);
      const data = localStorage.getItem(key);

      if (data) {
        const preferences = JSON.parse(data);
        console.log('✅ [UserPreferences] Loaded preferences for form:', formId, preferences);
        return preferences;
      }

      console.log('ℹ️ [UserPreferences] No saved preferences for form:', formId);
      return null;
    } catch (error) {
      console.error('❌ [UserPreferences] Error loading preferences:', error);
      return null;
    }
  }

  /**
   * Clear preferences for a specific form
   * @param {string} userId - User ID
   * @param {string} formId - Form ID
   */
  clearFormListPreferences(userId, formId) {
    try {
      const key = this.getStorageKey(userId, formId);
      localStorage.removeItem(key);
      console.log('✅ [UserPreferences] Cleared preferences for form:', formId);
      return true;
    } catch (error) {
      console.error('❌ [UserPreferences] Error clearing preferences:', error);
      return false;
    }
  }

  /**
   * Save global user preferences
   * @param {string} userId - User ID
   * @param {Object} preferences - Global preferences object
   */
  saveGlobalPreferences(userId, preferences) {
    try {
      const key = this.getStorageKey(userId);
      const data = {
        ...preferences,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(key, JSON.stringify(data));
      console.log('✅ [UserPreferences] Saved global preferences:', data);
      return true;
    } catch (error) {
      console.error('❌ [UserPreferences] Error saving global preferences:', error);
      return false;
    }
  }

  /**
   * Load global user preferences
   * @param {string} userId - User ID
   * @returns {Object|null} Global preferences or null
   */
  loadGlobalPreferences(userId) {
    try {
      const key = this.getStorageKey(userId);
      const data = localStorage.getItem(key);

      if (data) {
        const preferences = JSON.parse(data);
        console.log('✅ [UserPreferences] Loaded global preferences:', preferences);
        return preferences;
      }

      return null;
    } catch (error) {
      console.error('❌ [UserPreferences] Error loading global preferences:', error);
      return null;
    }
  }

  /**
   * Clear all preferences for a user
   * @param {string} userId - User ID
   */
  clearAllPreferences(userId) {
    try {
      const keysToRemove = [];

      // Find all keys for this user
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${this.storagePrefix}${userId}`)) {
          keysToRemove.push(key);
        }
      }

      // Remove all found keys
      keysToRemove.forEach(key => localStorage.removeItem(key));

      console.log(`✅ [UserPreferences] Cleared ${keysToRemove.length} preference entries for user:`, userId);
      return true;
    } catch (error) {
      console.error('❌ [UserPreferences] Error clearing all preferences:', error);
      return false;
    }
  }

  /**
   * Get default preferences for form submission list
   * @returns {Object} Default preferences
   */
  getDefaultFormListPreferences() {
    const now = new Date();
    return {
      sortBy: 'submittedAt',
      sortOrder: 'DESC',
      selectedDateField: 'submittedAt',
      month: String(now.getMonth() + 1), // Current month (1-12)
      year: String(now.getFullYear()),   // Current year
      itemsPerPage: 20
    };
  }
}

// Create singleton instance
const userPreferencesService = new UserPreferencesService();

export default userPreferencesService;
