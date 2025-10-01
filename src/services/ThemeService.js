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
 * LocalStorage key for theme preferences
 * @constant {string}
 */
const STORAGE_KEY = 'qcollector_theme_preference';

/**
 * Default theme preference structure
 * @constant {Object}
 */
const DEFAULT_PREFERENCE = {
  theme: DEFAULT_THEME,
  isDarkMode: false
};

/**
 * ThemeService class
 * Provides methods for theme management and persistence
 */
class ThemeService {
  /**
   * Load theme preference from localStorage
   * @returns {Object} Theme preference object {theme: string, isDarkMode: boolean}
   */
  static loadThemePreference() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (!stored) {
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
   * @returns {boolean} True if save successful, false otherwise
   */
  static saveThemePreference(preference) {
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

      // Save to localStorage
      const dataToSave = JSON.stringify({ theme, isDarkMode });
      localStorage.setItem(STORAGE_KEY, dataToSave);

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
   * @returns {Object} Default theme preference
   */
  static resetToDefault() {
    try {
      localStorage.removeItem(STORAGE_KEY);
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
