/**
 * Sanitization Middleware
 * Protects against XSS attacks by sanitizing user input
 *
 * Uses sanitize-html to clean potentially dangerous HTML/JavaScript
 * from request body, params, and query strings
 */

const sanitizeHtml = require('sanitize-html');
const logger = require('../utils/logger.util');

/**
 * Default sanitization options
 * Conservative whitelist approach - only allow safe tags
 */
const defaultOptions = {
  allowedTags: [
    // Text formatting
    'b', 'i', 'em', 'strong', 'u', 's', 'strike',
    // Lists
    'ul', 'ol', 'li',
    // Paragraphs and breaks
    'p', 'br', 'hr',
    // Headings (limited)
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // Tables
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    // Links (with restrictions)
    'a',
    // Quotes
    'blockquote', 'q',
    // Code
    'code', 'pre',
    // Other
    'span', 'div'
  ],
  allowedAttributes: {
    'a': ['href', 'title', 'target'],
    'span': ['class'],
    'div': ['class'],
    'code': ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: {
    'a': ['http', 'https', 'mailto', 'tel']
  },
  // Prevent self-XSS
  selfClosing: ['br', 'hr'],
  // Remove disallowed tags entirely (don't just strip them)
  allowedIframeHostnames: [], // No iframes allowed
  allowProtocolRelative: false,
  // Enforce HTTPS for external links (optional)
  transformTags: {
    'a': (tagName, attribs) => {
      return {
        tagName: 'a',
        attribs: {
          ...attribs,
          // Force external links to open in new tab
          target: attribs.href && !attribs.href.startsWith('/') ? '_blank' : attribs.target,
          // Add rel="noopener noreferrer" for security
          rel: attribs.href && !attribs.href.startsWith('/') ? 'noopener noreferrer' : attribs.rel,
        },
      };
    },
  },
};

/**
 * Strict sanitization options (no HTML allowed)
 * Used for fields that should never contain HTML
 */
const strictOptions = {
  allowedTags: [],
  allowedAttributes: {},
  textFilter: (text) => {
    // Remove all HTML entities
    return text.replace(/&[^;]+;/g, '');
  },
};

/**
 * Sanitize a single value
 * @param {*} value - Value to sanitize
 * @param {Object} options - Sanitization options
 * @returns {*} Sanitized value
 */
function sanitizeValue(value, options = defaultOptions) {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return value;
  }

  // Handle strings
  if (typeof value === 'string') {
    // Trim whitespace first
    const trimmed = value.trim();

    // If empty after trim, return empty string
    if (!trimmed) {
      return '';
    }

    // Sanitize HTML
    const sanitized = sanitizeHtml(trimmed, options);

    // Log if sanitization removed content (potential attack)
    if (sanitized !== trimmed && process.env.LOG_SANITIZATION === 'true') {
      logger.warn('Content sanitized (potential XSS attempt)', {
        original: trimmed.substring(0, 100),
        sanitized: sanitized.substring(0, 100),
      });
    }

    return sanitized;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item, options));
  }

  // Handle objects
  if (typeof value === 'object') {
    const sanitized = {};
    for (const key in value) {
      if (value.hasOwnProperty(key)) {
        sanitized[key] = sanitizeValue(value[key], options);
      }
    }
    return sanitized;
  }

  // Return other types as-is (numbers, booleans, etc.)
  return value;
}

/**
 * Middleware: Sanitize request body
 * @param {Object} options - Sanitization options
 * @returns {Function} Express middleware
 */
function sanitizeBody(options = defaultOptions) {
  return (req, res, next) => {
    if (req.body && Object.keys(req.body).length > 0) {
      req.body = sanitizeValue(req.body, options);

      // Add sanitization flag for logging
      req.sanitized = req.sanitized || {};
      req.sanitized.body = true;
    }
    next();
  };
}

/**
 * Middleware: Sanitize URL parameters
 * @param {Object} options - Sanitization options
 * @returns {Function} Express middleware
 */
function sanitizeParams(options = strictOptions) {
  return (req, res, next) => {
    if (req.params && Object.keys(req.params).length > 0) {
      req.params = sanitizeValue(req.params, options);

      // Add sanitization flag for logging
      req.sanitized = req.sanitized || {};
      req.sanitized.params = true;
    }
    next();
  };
}

/**
 * Middleware: Sanitize query strings
 * @param {Object} options - Sanitization options
 * @returns {Function} Express middleware
 */
function sanitizeQuery(options = strictOptions) {
  return (req, res, next) => {
    if (req.query && Object.keys(req.query).length > 0) {
      req.query = sanitizeValue(req.query, options);

      // Add sanitization flag for logging
      req.sanitized = req.sanitized || {};
      req.sanitized.query = true;
    }
    next();
  };
}

/**
 * Middleware: Sanitize all inputs (body, params, query)
 * Convenience function to apply all sanitization at once
 * @param {Object} bodyOptions - Options for body sanitization
 * @param {Object} paramsOptions - Options for params sanitization
 * @param {Object} queryOptions - Options for query sanitization
 * @returns {Function} Express middleware
 */
function sanitizeAll(bodyOptions = defaultOptions, paramsOptions = strictOptions, queryOptions = strictOptions) {
  return (req, res, next) => {
    // Sanitize body
    if (req.body && Object.keys(req.body).length > 0) {
      req.body = sanitizeValue(req.body, bodyOptions);
    }

    // Sanitize params
    if (req.params && Object.keys(req.params).length > 0) {
      req.params = sanitizeValue(req.params, paramsOptions);
    }

    // Sanitize query
    if (req.query && Object.keys(req.query).length > 0) {
      req.query = sanitizeValue(req.query, queryOptions);
    }

    // Add sanitization flag
    req.sanitized = {
      body: !!req.body,
      params: !!req.params,
      query: !!req.query,
    };

    next();
  };
}

/**
 * Export sanitization functions and options
 */
module.exports = {
  sanitizeBody,
  sanitizeParams,
  sanitizeQuery,
  sanitizeAll,
  sanitizeValue,
  defaultOptions,
  strictOptions,
};
