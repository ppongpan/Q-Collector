/**
 * UserPreferencesService
 * Manages user preferences for the Q-Collector application
 * Version: v0.8.0-dev - Database-backed with localStorage fallback
 *
 * Features:
 * - Database-first storage (PostgreSQL via API)
 * - localStorage fallback for offline/error scenarios
 * - Automatic migration from localStorage to database
 * - Smart defaults (uses latest submission date)
 * - Cross-device synchronization
 */

import axios from 'axios';

class UserPreferencesService {
  constructor() {
    this.storagePrefix = 'qcollector_prefs_';
    this.apiBaseUrl = '/api/v1/preferences';
    this.migrationKey = 'qcollector_prefs_migrated_';
  }

  /**
   * Get storage key for localStorage fallback
   * @param {string} userId - User ID
   * @param {string} contextType - Context type (form_list, global, etc.)
   * @param {string|null} contextId - Context ID (formId for form_list)
   * @returns {string} Storage key
   */
  getStorageKey(userId, contextType, contextId = null) {
    if (contextId) {
      return `${this.storagePrefix}${userId}_${contextType}_${contextId}`;
    }
    return `${this.storagePrefix}${userId}_${contextType}`;
  }

  /**
   * Get migration tracking key
   * @param {string} userId - User ID
   * @param {string} contextType - Context type
   * @param {string|null} contextId - Context ID
   * @returns {string} Migration key
   */
  getMigrationKey(userId, contextType, contextId = null) {
    if (contextId) {
      return `${this.migrationKey}${userId}_${contextType}_${contextId}`;
    }
    return `${this.migrationKey}${userId}_${contextType}`;
  }

  /**
   * Check if localStorage data has been migrated to database
   * @param {string} userId - User ID
   * @param {string} contextType - Context type
   * @param {string|null} contextId - Context ID
   * @returns {boolean} True if migrated
   */
  isMigrated(userId, contextType, contextId = null) {
    const key = this.getMigrationKey(userId, contextType, contextId);
    return localStorage.getItem(key) === 'true';
  }

  /**
   * Mark localStorage data as migrated
   * @param {string} userId - User ID
   * @param {string} contextType - Context type
   * @param {string|null} contextId - Context ID
   */
  markAsMigrated(userId, contextType, contextId = null) {
    const key = this.getMigrationKey(userId, contextType, contextId);
    localStorage.setItem(key, 'true');
  }

  /**
   * Migrate localStorage data to database
   * @param {string} userId - User ID
   * @param {string} contextType - Context type
   * @param {string|null} contextId - Context ID
   * @returns {Promise<boolean>} True if migration successful
   */
  async migrateToDatabase(userId, contextType, contextId = null) {
    try {
      // Check if already migrated
      if (this.isMigrated(userId, contextType, contextId)) {
        console.log('ℹ️ [UserPreferences] Already migrated, skipping');
        return false;
      }

      // Load from localStorage
      const key = this.getStorageKey(userId, contextType, contextId);
      const data = localStorage.getItem(key);

      if (!data) {
        console.log('ℹ️ [UserPreferences] No localStorage data to migrate');
        this.markAsMigrated(userId, contextType, contextId);
        return false;
      }

      const preferences = JSON.parse(data);
      console.log('📦 [UserPreferences] Migrating localStorage data to database:', preferences);

      // Save to database
      await this.saveToDatabase(userId, contextType, contextId, preferences);

      // Mark as migrated
      this.markAsMigrated(userId, contextType, contextId);

      console.log('✅ [UserPreferences] Migration successful');
      return true;
    } catch (error) {
      console.error('❌ [UserPreferences] Migration failed:', error);
      return false;
    }
  }

  /**
   * Save preferences to database via API
   * @param {string} userId - User ID
   * @param {string} contextType - Context type
   * @param {string|null} contextId - Context ID
   * @param {Object} preferences - Preferences object
   * @returns {Promise<Object>} Saved preferences
   */
  async saveToDatabase(userId, contextType, contextId = null, preferences) {
    try {
      const url = contextId
        ? `${this.apiBaseUrl}/${contextType}/${contextId}`
        : `${this.apiBaseUrl}/${contextType}`;

      const response = await axios.put(url, { preferences });

      if (response.data && response.data.success) {
        console.log('✅ [UserPreferences] Saved to database:', response.data.data);
        return response.data.data;
      }

      throw new Error('Invalid response from server');
    } catch (error) {
      console.error('❌ [UserPreferences] Database save failed:', error);
      throw error;
    }
  }

  /**
   * Load preferences from database via API
   * @param {string} userId - User ID
   * @param {string} contextType - Context type
   * @param {string|null} contextId - Context ID
   * @returns {Promise<Object|null>} Preferences object or null
   */
  async loadFromDatabase(userId, contextType, contextId = null) {
    try {
      const url = contextId
        ? `${this.apiBaseUrl}/${contextType}/${contextId}`
        : `${this.apiBaseUrl}/${contextType}`;

      const response = await axios.get(url);

      if (response.data && response.data.success && response.data.data) {
        console.log('✅ [UserPreferences] Loaded from database:', response.data.data);
        return response.data.data;
      }

      console.log('ℹ️ [UserPreferences] No database preferences found');
      return null;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('ℹ️ [UserPreferences] No database preferences found (404)');
        return null;
      }
      console.error('❌ [UserPreferences] Database load failed:', error);
      throw error;
    }
  }

  /**
   * Get smart defaults for form list
   * Uses latest submission date instead of current date
   * @param {string} userId - User ID
   * @param {string} formId - Form ID
   * @returns {Promise<Object>} Default preferences with metadata
   */
  async getFormListSmartDefaults(userId, formId) {
    try {
      const url = `${this.apiBaseUrl}/defaults/form-list/${formId}`;
      const response = await axios.get(url);

      if (response.data && response.data.success) {
        console.log('✅ [UserPreferences] Smart defaults received:', response.data.data);
        console.log('📊 [UserPreferences] Defaults source:', response.data.metadata.source);
        return response.data.data;
      }

      throw new Error('Invalid response from server');
    } catch (error) {
      console.error('❌ [UserPreferences] Smart defaults fetch failed, using current date:', error);
      // Fallback to current date
      const now = new Date();
      return {
        sortBy: '_auto_date',
        sortOrder: 'desc',
        selectedDateField: 'submittedAt',
        month: String(now.getMonth() + 1),
        year: String(now.getFullYear()),
        itemsPerPage: 20,
        hideEmptyRows: true
      };
    }
  }

  /**
   * Save to localStorage fallback
   * @param {string} userId - User ID
   * @param {string} contextType - Context type
   * @param {string|null} contextId - Context ID
   * @param {Object} preferences - Preferences object
   */
  saveToLocalStorage(userId, contextType, contextId = null, preferences) {
    try {
      const key = this.getStorageKey(userId, contextType, contextId);
      const data = {
        ...preferences,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(key, JSON.stringify(data));
      console.log('✅ [UserPreferences] Saved to localStorage fallback:', data);
    } catch (error) {
      console.error('❌ [UserPreferences] localStorage save failed:', error);
    }
  }

  /**
   * Load from localStorage fallback
   * @param {string} userId - User ID
   * @param {string} contextType - Context type
   * @param {string|null} contextId - Context ID
   * @returns {Object|null} Preferences or null
   */
  loadFromLocalStorage(userId, contextType, contextId = null) {
    try {
      const key = this.getStorageKey(userId, contextType, contextId);
      const data = localStorage.getItem(key);

      if (data) {
        const preferences = JSON.parse(data);
        console.log('✅ [UserPreferences] Loaded from localStorage fallback:', preferences);
        return preferences;
      }

      return null;
    } catch (error) {
      console.error('❌ [UserPreferences] localStorage load failed:', error);
      return null;
    }
  }

  /**
   * Save form submission list preferences
   * Database-first with localStorage fallback and automatic migration
   * @param {string} userId - User ID
   * @param {string} formId - Form ID
   * @param {Object} preferences - Preferences object
   * @returns {Promise<boolean>} True if successful
   */
  async saveFormListPreferences(userId, formId, preferences) {
    try {
      // Attempt database save first
      try {
        await this.saveToDatabase(userId, 'form_list', formId, preferences);
        // Also save to localStorage for offline access
        this.saveToLocalStorage(userId, 'form_list', formId, preferences);
        return true;
      } catch (dbError) {
        // Database failed, use localStorage fallback
        console.warn('⚠️ [UserPreferences] Database save failed, using localStorage fallback');
        this.saveToLocalStorage(userId, 'form_list', formId, preferences);
        return true;
      }
    } catch (error) {
      console.error('❌ [UserPreferences] Save failed completely:', error);
      return false;
    }
  }

  /**
   * Load form submission list preferences
   * Database-first with localStorage fallback and automatic migration
   * @param {string} userId - User ID
   * @param {string} formId - Form ID
   * @returns {Promise<Object|null>} Preferences object or null
   */
  async loadFormListPreferences(userId, formId) {
    try {
      // Try to migrate localStorage data first
      await this.migrateToDatabase(userId, 'form_list', formId);

      // Attempt database load first
      try {
        const dbPrefs = await this.loadFromDatabase(userId, 'form_list', formId);
        if (dbPrefs) {
          // Also sync to localStorage for offline access
          this.saveToLocalStorage(userId, 'form_list', formId, dbPrefs);
          return dbPrefs;
        }

        // No database preferences, return null (will trigger smart defaults)
        return null;
      } catch (dbError) {
        // Database failed, try localStorage fallback
        console.warn('⚠️ [UserPreferences] Database load failed, using localStorage fallback');
        return this.loadFromLocalStorage(userId, 'form_list', formId);
      }
    } catch (error) {
      console.error('❌ [UserPreferences] Load failed completely:', error);
      return null;
    }
  }

  /**
   * Clear preferences for a specific form
   * @param {string} userId - User ID
   * @param {string} formId - Form ID
   * @returns {Promise<boolean>} True if successful
   */
  async clearFormListPreferences(userId, formId) {
    try {
      // Clear from database
      try {
        const url = `${this.apiBaseUrl}/form_list/${formId}`;
        await axios.delete(url);
      } catch (dbError) {
        console.warn('⚠️ [UserPreferences] Database clear failed');
      }

      // Clear from localStorage
      const key = this.getStorageKey(userId, 'form_list', formId);
      localStorage.removeItem(key);

      // Clear migration flag
      const migrationKey = this.getMigrationKey(userId, 'form_list', formId);
      localStorage.removeItem(migrationKey);

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
   * @returns {Promise<boolean>} True if successful
   */
  async saveGlobalPreferences(userId, preferences) {
    try {
      // Attempt database save first
      try {
        await this.saveToDatabase(userId, 'global', null, preferences);
        this.saveToLocalStorage(userId, 'global', null, preferences);
        return true;
      } catch (dbError) {
        console.warn('⚠️ [UserPreferences] Database save failed, using localStorage fallback');
        this.saveToLocalStorage(userId, 'global', null, preferences);
        return true;
      }
    } catch (error) {
      console.error('❌ [UserPreferences] Save failed completely:', error);
      return false;
    }
  }

  /**
   * Load global user preferences
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Global preferences or null
   */
  async loadGlobalPreferences(userId) {
    try {
      // Try to migrate localStorage data first
      await this.migrateToDatabase(userId, 'global', null);

      // Attempt database load first
      try {
        const dbPrefs = await this.loadFromDatabase(userId, 'global', null);
        if (dbPrefs) {
          this.saveToLocalStorage(userId, 'global', null, dbPrefs);
          return dbPrefs;
        }
        return null;
      } catch (dbError) {
        console.warn('⚠️ [UserPreferences] Database load failed, using localStorage fallback');
        return this.loadFromLocalStorage(userId, 'global', null);
      }
    } catch (error) {
      console.error('❌ [UserPreferences] Load failed completely:', error);
      return null;
    }
  }

  /**
   * Clear all preferences for a user
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if successful
   */
  async clearAllPreferences(userId) {
    try {
      // Clear from database
      try {
        const url = `${this.apiBaseUrl}/user/all`;
        await axios.delete(url);
      } catch (dbError) {
        console.warn('⚠️ [UserPreferences] Database clear failed');
      }

      // Clear from localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith(`${this.storagePrefix}${userId}`) || key.startsWith(`${this.migrationKey}${userId}`))) {
          keysToRemove.push(key);
        }
      }
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
   * Uses current date as fallback (smart defaults should be fetched separately)
   * @returns {Object} Default preferences
   */
  getDefaultFormListPreferences() {
    const now = new Date();
    return {
      sortBy: '_auto_date',
      sortOrder: 'desc',
      selectedDateField: 'submittedAt',
      month: String(now.getMonth() + 1),
      year: String(now.getFullYear()),
      itemsPerPage: 20,
      hideEmptyRows: true
    };
  }
}

// Create singleton instance
const userPreferencesService = new UserPreferencesService();

export default userPreferencesService;
