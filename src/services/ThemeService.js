/**
 * ThemeService - Service layer for theme operations and persistence
 *
 * Handles theme state management, localStorage persistence, and DOM manipulation
 * for the Q-Collector application theme system.
 *
 * @version 0.6.0
 * @since 2025-10-01
 */

import { themes, DEFAULT_THEME, isValidTheme, isThemeAvailable } from '../config/themes.js';

/**
 * LocalStorage key prefix for theme preferences
 * @constant {string}
 */
const STORAGE_KEY_PREFIX = 'qcollector_theme_preference';

/**
 * Get storage key for user-specific or global theme preference
 * @param {string|null} userId - User ID for per-user preferences, null for global
 * @returns {string} Storage key
 */
const getStorageKey = (userId = null) => {
  return userId ? `${STORAGE_KEY_PREFIX}_user_${userId}` : STORAGE_KEY_PREFIX;
};

/**
 * Default theme preference structure
 * v0.6.7: Changed default to dark mode (orange-neon in dark mode)
 * @constant {Object}
 */
const DEFAULT_PREFERENCE = {
  theme: DEFAULT_THEME, // 'glass' = orange-neon theme
  isDarkMode: true // v0.6.7: Default to dark mode
};

/**
 * ThemeService class
 * Provides methods for theme management and persistence
 */
class ThemeService {
  /**
   * Load theme preference from localStorage
   * @param {string|null} userId - User ID for per-user preferences, null for global
   * @returns {Object} Theme preference object {theme: string, isDarkMode: boolean}
   */
  static loadThemePreference(userId = null) {
    try {
      const storageKey = getStorageKey(userId);
      const stored = localStorage.getItem(storageKey);

      if (!stored) {
        // If no user-specific preference found, try loading global preference as fallback
        if (userId) {
          const globalStored = localStorage.getItem(getStorageKey(null));
          if (globalStored) {
            const parsed = JSON.parse(globalStored);
            const theme = (isValidTheme(parsed.theme) && isThemeAvailable(parsed.theme))
              ? parsed.theme
              : DEFAULT_THEME;
            const isDarkMode = typeof parsed.isDarkMode === 'boolean'
              ? parsed.isDarkMode
              : (typeof parsed.darkMode === 'boolean' ? parsed.darkMode : false);
            return { theme, isDarkMode };
          }
        }
        return { ...DEFAULT_PREFERENCE };
      }

      const parsed = JSON.parse(stored);

      // Validate parsed data - check if theme is valid AND available
      const theme = (isValidTheme(parsed.theme) && isThemeAvailable(parsed.theme))
        ? parsed.theme
        : DEFAULT_THEME;

      // Support both old 'darkMode' and new 'isDarkMode' naming
      const isDarkMode = typeof parsed.isDarkMode === 'boolean'
        ? parsed.isDarkMode
        : (typeof parsed.darkMode === 'boolean' ? parsed.darkMode : false);

      return { theme, isDarkMode };
    } catch (error) {
      // Silent fail - return defaults on any error
      return { ...DEFAULT_PREFERENCE };
    }
  }

  /**
   * Save theme preference to localStorage
   * @param {Object} preference - Theme preference object
   * @param {string} preference.theme - Theme identifier
   * @param {boolean} preference.isDarkMode - Dark mode enabled state
   * @param {string|null} userId - User ID for per-user preferences, null for global
   * @returns {boolean} True if save successful, false otherwise
   */
  static saveThemePreference(preference, userId = null) {
    try {
      // Validate input
      if (!preference || typeof preference !== 'object') {
        return false;
      }

      const { theme, isDarkMode } = preference;

      // Validate theme - must be valid AND available
      if (!isValidTheme(theme) || !isThemeAvailable(theme)) {
        return false;
      }

      // Validate isDarkMode
      if (typeof isDarkMode !== 'boolean') {
        return false;
      }

      // Save to localStorage with appropriate key
      const storageKey = getStorageKey(userId);
      const dataToSave = JSON.stringify({ theme, isDarkMode });
      localStorage.setItem(storageKey, dataToSave);

      return true;
    } catch (error) {
      // Silent fail - localStorage quota exceeded, disabled, etc.
      return false;
    }
  }

  /**
   * Apply theme to DOM
   * Sets data-theme attribute and dark class on document root
   * @param {string} theme - Theme identifier
   * @param {boolean} isDarkMode - Dark mode enabled state
   * @returns {boolean} True if applied successfully, false otherwise
   */
  static applyThemeToDOM(theme, isDarkMode) {
    try {
      const root = document.documentElement;

      if (!root) {
        return false;
      }

      // Validate theme - use default if invalid or unavailable
      const validTheme = (isValidTheme(theme) && isThemeAvailable(theme))
        ? theme
        : DEFAULT_THEME;

      // Set data-theme attribute
      root.setAttribute('data-theme', validTheme);

      // Toggle dark class
      if (isDarkMode) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }

      // Dynamically load theme-specific CSS if needed
      if (validTheme === 'liquid') {
        // Check if liquid theme CSS is already loaded
        if (!document.querySelector('link[href*="liquid-theme.css"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = '/src/styles/liquid-theme.css';
          document.head.appendChild(link);
        }
      } else if (validTheme === 'minimal') {
        // Check if minimal theme CSS is already loaded
        if (!document.querySelector('link[href*="minimal-theme.css"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = '/src/styles/minimal-theme.css';
          document.head.appendChild(link);
        }
      }

      return true;
    } catch (error) {
      // Silent fail
      return false;
    }
  }

  /**
   * Get available themes (only themes with available: true)
   * @returns {Array<Object>} Array of available theme configuration objects
   */
  static getAvailableThemes() {
    return Object.values(themes)
      .filter(theme => theme.available)
      .map(theme => ({
        id: theme.id,
        name: theme.name,
        description: theme.description,
        isDefault: theme.isDefault
      }));
  }

  /**
   * Reset theme to default
   * @param {string|null} userId - User ID for per-user preferences, null for global
   * @returns {Object} Default theme preference
   */
  static resetToDefault(userId = null) {
    try {
      const storageKey = getStorageKey(userId);
      localStorage.removeItem(storageKey);
      this.applyThemeToDOM(DEFAULT_PREFERENCE.theme, DEFAULT_PREFERENCE.isDarkMode);
      return { ...DEFAULT_PREFERENCE };
    } catch (error) {
      // Silent fail
      return { ...DEFAULT_PREFERENCE };
    }
  }

  /**
   * Check if localStorage is available
   * @returns {boolean} True if localStorage is accessible
   */
  static isStorageAvailable() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current theme from DOM
   * @returns {string|null} Current theme identifier or null
   */
  static getCurrentThemeFromDOM() {
    try {
      const root = document.documentElement;
      const theme = root.getAttribute('data-theme');
      return isValidTheme(theme) ? theme : null;
    } catch (error) {
      // Silent fail
      return null;
    }
  }

  /**
   * Get dark mode state from DOM
   * @returns {boolean} True if dark mode is enabled
   */
  static getDarkModeFromDOM() {
    try {
      const root = document.documentElement;
      return root.classList.contains('dark');
    } catch (error) {
      // Silent fail
      return false;
    }
  }
}

export default ThemeService;
