/**
 * Frontend Sanitization Utility
 * Uses DOMPurify to sanitize HTML before rendering
 *
 * Protects against XSS attacks when rendering user-generated content
 */

import DOMPurify from 'dompurify';

/**
 * Default DOMPurify configuration
 * Conservative approach - strip potentially dangerous elements
 */
const defaultConfig = {
  // Allowed tags
  ALLOWED_TAGS: [
    'b', 'i', 'em', 'strong', 'u', 's', 'strike',
    'ul', 'ol', 'li',
    'p', 'br', 'hr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'a',
    'blockquote', 'q',
    'code', 'pre',
    'span', 'div'
  ],

  // Allowed attributes
  ALLOWED_ATTR: [
    'href', 'title', 'target', 'rel',
    'class', 'id'
  ],

  // Allow data attributes (optional, be careful)
  ALLOW_DATA_ATTR: false,

  // Forbid tags that can execute scripts
  FORBID_TAGS: [
    'script', 'iframe', 'embed', 'object',
    'style', 'link', 'meta', 'base'
  ],

  // Forbid attributes that can execute scripts
  FORBID_ATTR: [
    'onerror', 'onload', 'onclick', 'onmouseover',
    'onfocus', 'onblur', 'onchange', 'oninput',
    'onsubmit', 'onreset', 'onkeydown', 'onkeyup',
    'onkeypress', 'onmousedown', 'onmouseup'
  ],

  // Keep content of removed elements
  KEEP_CONTENT: true,

  // Return entire DOM
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,

  // Sanitize in place
  IN_PLACE: false,

  // Force body
  FORCE_BODY: false,

  // Safe for jQuery
  SAFE_FOR_JQUERY: true,

  // Safe for templates
  SAFE_FOR_TEMPLATES: false,

  // Whole document
  WHOLE_DOCUMENT: false,
};

/**
 * Strict configuration - no HTML allowed
 * Strips all HTML tags and returns plain text
 */
const strictConfig = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
};

/**
 * Sanitize HTML string
 * @param {string} dirty - Dirty HTML string
 * @param {Object} config - DOMPurify configuration (optional)
 * @returns {string} Clean HTML string
 */
export function sanitizeHtml(dirty, config = defaultConfig) {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  // Trim whitespace
  const trimmed = dirty.trim();

  if (!trimmed) {
    return '';
  }

  // Sanitize with DOMPurify
  const clean = DOMPurify.sanitize(trimmed, config);

  // Log if content was modified (development only)
  if (process.env.NODE_ENV === 'development' && clean !== trimmed) {
    console.warn('[Sanitize] Content was sanitized (potential XSS):', {
      original: trimmed.substring(0, 100),
      sanitized: clean.substring(0, 100),
    });
  }

  return clean;
}

/**
 * Sanitize to plain text (strip all HTML)
 * @param {string} dirty - Dirty HTML string
 * @returns {string} Plain text string
 */
export function sanitizeToPlainText(dirty) {
  return sanitizeHtml(dirty, strictConfig);
}

/**
 * Check if string contains potentially dangerous content
 * @param {string} str - String to check
 * @returns {boolean} True if potentially dangerous
 */
export function containsDangerousContent(str) {
  if (!str || typeof str !== 'string') {
    return false;
  }

  // Check for common XSS patterns
  const dangerousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers (onclick, onerror, etc.)
    /<embed[^>]*>/gi,
    /<object[^>]*>/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi,
  ];

  return dangerousPatterns.some(pattern => pattern.test(str));
}

/**
 * Sanitize object recursively
 * Useful for sanitizing form data before submission
 * @param {Object} obj - Object to sanitize
 * @param {Object} config - DOMPurify configuration (optional)
 * @returns {Object} Sanitized object
 */
export function sanitizeObject(obj, config = defaultConfig) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, config));
  }

  // Handle objects
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Sanitize string values
        if (typeof obj[key] === 'string') {
          sanitized[key] = sanitizeHtml(obj[key], config);
        }
        // Recursively sanitize nested objects/arrays
        else if (typeof obj[key] === 'object') {
          sanitized[key] = sanitizeObject(obj[key], config);
        }
        // Keep other types as-is
        else {
          sanitized[key] = obj[key];
        }
      }
    }
    return sanitized;
  }

  // Handle strings
  if (typeof obj === 'string') {
    return sanitizeHtml(obj, config);
  }

  // Return other types as-is
  return obj;
}

/**
 * Hook for sanitizing before rendering (React)
 * Use with dangerouslySetInnerHTML
 *
 * @example
 * <div dangerouslySetInnerHTML={createMarkup(userContent)} />
 */
export function createMarkup(html, config = defaultConfig) {
  return {
    __html: sanitizeHtml(html, config)
  };
}

/**
 * Export configurations for custom usage
 */
export { defaultConfig, strictConfig };

/**
 * Default export
 */
export default {
  sanitizeHtml,
  sanitizeToPlainText,
  sanitizeObject,
  containsDangerousContent,
  createMarkup,
  defaultConfig,
  strictConfig,
};
