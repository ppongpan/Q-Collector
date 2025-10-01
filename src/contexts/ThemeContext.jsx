/**
 * ThemeContext - React Context for Theme State Management
 *
 * Provides theme state and dark mode management for Q-Collector application.
 * Supports multiple themes (glass, minimal) with localStorage persistence.
 *
 * @version 0.6.0
 * @since 2025-10-01
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import ThemeService from '../services/ThemeService.js';
import { DEFAULT_THEME } from '../config/themes.js';

/**
 * Theme Context
 * @type {React.Context}
 */
const ThemeContext = createContext(undefined);

/**
 * Custom hook to access theme context
 * @returns {Object} Theme context value
 * @throws {Error} If used outside ThemeProvider
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

/**
 * ThemeProvider Component
 * Manages theme state and provides theme context to children
 *
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} ThemeProvider component
 */
const ThemeProvider = ({ children }) => {
  // State management
  const [theme, setThemeState] = useState(DEFAULT_THEME);
  const [isDarkMode, setIsDarkModeState] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Initialize theme from localStorage on mount
   */
  useEffect(() => {
    const initializeTheme = () => {
      try {
        // Check if localStorage is available
        if (!ThemeService.isStorageAvailable()) {
          setIsLoading(false);
          return;
        }

        // Load saved preference
        const preference = ThemeService.loadThemePreference();

        // Update state
        setThemeState(preference.theme);
        setIsDarkModeState(preference.isDarkMode);

        // Apply to DOM
        ThemeService.applyThemeToDOM(preference.theme, preference.isDarkMode);

        setIsLoading(false);
      } catch (error) {
        // Silent fail - use defaults
        setIsLoading(false);
      }
    };

    initializeTheme();
  }, []);

  /**
   * Set theme and persist to localStorage
   * @param {string} newTheme - Theme identifier
   */
  const setTheme = React.useCallback((newTheme) => {
    try {
      // Update state
      setThemeState(newTheme);

      // Save to localStorage
      ThemeService.saveThemePreference({
        theme: newTheme,
        isDarkMode
      });

      // Apply to DOM
      ThemeService.applyThemeToDOM(newTheme, isDarkMode);
    } catch (error) {
      // Silent fail - theme will still work in current session
    }
  }, [isDarkMode]);

  /**
   * Set dark mode and persist to localStorage
   * @param {boolean} darkMode - Dark mode enabled state
   */
  const setIsDarkMode = React.useCallback((darkMode) => {
    try {
      // Update state
      setIsDarkModeState(darkMode);

      // Save to localStorage
      ThemeService.saveThemePreference({
        theme,
        isDarkMode: darkMode
      });

      // Apply to DOM
      ThemeService.applyThemeToDOM(theme, darkMode);
    } catch (error) {
      // Silent fail - dark mode will still work in current session
    }
  }, [theme]);

  /**
   * Toggle dark mode
   */
  const toggleDarkMode = React.useCallback(() => {
    setIsDarkModeState(prev => {
      const newDarkMode = !prev;
      try {
        // Save to localStorage
        ThemeService.saveThemePreference({
          theme,
          isDarkMode: newDarkMode
        });

        // Apply to DOM
        ThemeService.applyThemeToDOM(theme, newDarkMode);
      } catch (error) {
        // Silent fail
      }
      return newDarkMode;
    });
  }, [theme]);

  /**
   * Memoized context value to prevent unnecessary re-renders
   */
  const contextValue = useMemo(
    () => ({
      theme,
      setTheme,
      isDarkMode,
      setIsDarkMode,
      toggleDarkMode,
      isLoading
    }),
    [theme, setTheme, isDarkMode, setIsDarkMode, toggleDarkMode, isLoading]
  );

  // Show loading state to prevent flash of unstyled content (FOUC)
  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired
};

// Export ThemeProvider as both named and default
export { ThemeProvider };
export default ThemeProvider;
