import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Enhanced Theme Toggle Component with Orange Accent Styling
 * Features smooth transitions, professional dark theme focus, and orange highlights
 */
export const ThemeToggle = ({ className = "", showLabel = true }) => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={toggleTheme}
        className="theme-toggle-button group relative flex items-center justify-center w-10 h-10 rounded-lg"
        title={isDark ? 'สลับไปโหมดสว่าง' : 'สลับไปโหมดมืด'}
        aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      >
        {/* Background glow effect on hover */}
        <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-20 transition-opacity duration-300 bg-primary"></div>

        {/* Icon container */}
        <div className="relative z-10 flex items-center justify-center">
          {isDark ? (
            // Sun icon for light mode switch
            <svg
              className="w-5 h-5 transition-all duration-300 group-hover:text-primary group-hover:scale-110 group-hover:rotate-45"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          ) : (
            // Moon icon for dark mode switch
            <svg
              className="w-5 h-5 transition-all duration-300 group-hover:text-primary group-hover:scale-110 group-hover:rotate-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          )}
        </div>

        {/* Subtle indicator dot */}
        <div className={`absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
          isDark ? 'bg-orange-400' : 'bg-blue-400'
        }`}></div>
      </button>

      {showLabel && (
        <span className="text-sm text-muted-foreground font-medium transition-colors duration-300 group-hover:text-primary">
          {isDark ? 'มืด' : 'สว่าง'}
        </span>
      )}
    </div>
  );
};

/**
 * Minimal Theme Toggle (icon only)
 */
export const ThemeToggleMinimal = ({ className = "" }) => {
  return <ThemeToggle className={className} showLabel={false} />;
};

/**
 * Theme Status Indicator (read-only)
 */
export const ThemeIndicator = ({ className = "" }) => {
  const { isDark } = useTheme();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-orange-400' : 'bg-blue-400'}`}></div>
      <span className="text-sm text-muted-foreground">
        {isDark ? 'Dark Mode' : 'Light Mode'}
      </span>
    </div>
  );
};

export default ThemeToggle;