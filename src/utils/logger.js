/**
 * Simple Logger Utility for Frontend
 * Wraps console methods with consistent formatting
 */

const isDevelopment = process.env.NODE_ENV === 'development';

const logger = {
  debug: (...args) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  info: (...args) => {
    if (isDevelopment) {
      console.info('[INFO]', ...args);
    }
  },

  warn: (...args) => {
    console.warn('[WARN]', ...args);
  },

  error: (...args) => {
    console.error('[ERROR]', ...args);
  }
};

export default logger;
