/**
 * API Gateway Middleware for Q-Collector v0.9.0-dev
 * Centralized API request handling and security enforcement
 *
 * Features:
 * - Centralized request routing
 * - Security header enforcement
 * - Request/response logging
 * - API versioning
 * - Request validation
 * - Rate limiting integration
 * - Authentication flow
 * - Error handling
 *
 * Implementation: Phase 1, Task 1.2 of Security Hardening Plan
 * Date: 2025-10-26
 */

const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

/**
 * API Gateway Configuration
 */
const API_CONFIG = {
  version: 'v1',
  basePath: '/api',
  supportedVersions: ['v1'],
  securityHeaders: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-API-Version': 'v1',
    'X-Powered-By': 'Q-Collector API'
  },
  cors: {
    allowedOrigins: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ],
    allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400 // 24 hours
  }
};

/**
 * Request Logger Middleware
 * Logs all incoming API requests with metadata
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log request details
  const requestLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: req.user?.id || 'anonymous',
    requestId: req.id || generateRequestId()
  };

  // Attach request ID to request object
  req.requestId = requestLog.requestId;

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(JSON.stringify({
      ...requestLog,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length') || 0
    }));

    // Log slow requests (> 1 second)
    if (duration > 1000) {
      console.warn(`⚠️ Slow API request detected: ${req.method} ${req.path} took ${duration}ms`);
    }

    // Log errors
    if (res.statusCode >= 500) {
      console.error(`❌ API error: ${req.method} ${req.path} returned ${res.statusCode}`);
    }
  });

  next();
};

/**
 * Security Headers Middleware
 * Adds security headers to all API responses
 */
const securityHeaders = (req, res, next) => {
  // Add all security headers
  Object.entries(API_CONFIG.securityHeaders).forEach(([header, value]) => {
    res.setHeader(header, value);
  });

  // Add custom headers
  res.setHeader('X-Request-ID', req.requestId || generateRequestId());
  res.setHeader('X-Response-Time', Date.now());

  next();
};

/**
 * CORS Middleware (Custom implementation)
 * Handles Cross-Origin Resource Sharing with strict validation
 */
const corsMiddleware = (req, res, next) => {
  const origin = req.get('origin');

  // Check if origin is allowed
  const isAllowedOrigin = API_CONFIG.cors.allowedOrigins.includes(origin) ||
                          API_CONFIG.cors.allowedOrigins.includes('*');

  if (isAllowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', API_CONFIG.cors.credentials);
    res.setHeader('Access-Control-Allow-Methods', API_CONFIG.cors.allowedMethods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', API_CONFIG.cors.allowedHeaders.join(', '));
    res.setHeader('Access-Control-Max-Age', API_CONFIG.cors.maxAge);
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
};

/**
 * API Versioning Middleware
 * Validates API version and routes to correct handler
 */
const apiVersioning = (req, res, next) => {
  // Extract version from path (e.g., /api/v1/users -> v1)
  const pathParts = req.path.split('/');
  const version = pathParts[2]; // /api/v1/...

  // Validate version
  if (!API_CONFIG.supportedVersions.includes(version)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'UNSUPPORTED_API_VERSION',
        message: `API version '${version}' is not supported. Supported versions: ${API_CONFIG.supportedVersions.join(', ')}`,
        supportedVersions: API_CONFIG.supportedVersions
      }
    });
  }

  // Attach version to request
  req.apiVersion = version;

  next();
};

/**
 * Request Validation Middleware
 * Validates request structure and content
 */
const requestValidation = (req, res, next) => {
  // Check Content-Type for POST/PUT/PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('content-type');

    if (!contentType || !contentType.includes('application/json')) {
      return res.status(415).json({
        success: false,
        error: {
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: 'Content-Type must be application/json',
          expected: 'application/json',
          received: contentType || 'none'
        }
      });
    }

    // Check if body is empty
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMPTY_REQUEST_BODY',
          message: 'Request body cannot be empty'
        }
      });
    }
  }

  next();
};

/**
 * Rate Limiting Configuration
 * Different limits for different endpoints
 */
const rateLimiters = {
  // General API rate limit: 100 requests per 15 minutes
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for authenticated super_admin users
      return req.user?.role === 'super_admin';
    }
  }),

  // Auth endpoints: 5 requests per 15 minutes (login, register)
  auth: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
      success: false,
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts, please try again later.',
        retryAfter: '15 minutes'
      }
    },
    standardHeaders: true,
    legacyHeaders: false
  }),

  // Public form submissions: 5 per hour per IP
  publicForm: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: {
      success: false,
      error: {
        code: 'PUBLIC_FORM_RATE_LIMIT_EXCEEDED',
        message: 'Too many form submissions, please try again later.',
        retryAfter: '1 hour'
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip for authenticated users
      return !!req.user;
    }
  })
};

/**
 * Error Handler Middleware
 * Centralized error handling for all API endpoints
 */
const errorHandler = (err, req, res, next) => {
  // Log error
  console.error('API Gateway Error:', {
    requestId: req.requestId,
    path: req.path,
    method: req.method,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // Default error response
  let statusCode = err.statusCode || 500;
  let errorResponse = {
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred',
      requestId: req.requestId
    }
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorResponse.error.code = 'VALIDATION_ERROR';
    errorResponse.error.details = err.details;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    errorResponse.error.code = 'UNAUTHORIZED';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    errorResponse.error.code = 'FORBIDDEN';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    errorResponse.error.code = 'NOT_FOUND';
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Health Check Endpoint
 * Returns API gateway status
 */
const healthCheck = (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      version: API_CONFIG.version,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    }
  });
};

/**
 * API Documentation Endpoint
 * Returns API gateway configuration
 */
const apiDocs = (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      name: 'Q-Collector API Gateway',
      version: API_CONFIG.version,
      supportedVersions: API_CONFIG.supportedVersions,
      basePath: API_CONFIG.basePath,
      endpoints: {
        health: `${API_CONFIG.basePath}/health`,
        docs: `${API_CONFIG.basePath}/${API_CONFIG.version}/docs`,
        auth: `${API_CONFIG.basePath}/${API_CONFIG.version}/auth`,
        forms: `${API_CONFIG.basePath}/${API_CONFIG.version}/forms`,
        submissions: `${API_CONFIG.basePath}/${API_CONFIG.version}/submissions`,
        users: `${API_CONFIG.basePath}/${API_CONFIG.version}/users`,
        public: `${API_CONFIG.basePath}/${API_CONFIG.version}/public`
      },
      rateLimits: {
        general: '100 requests per 15 minutes',
        auth: '5 requests per 15 minutes',
        publicForm: '5 submissions per hour'
      },
      cors: {
        allowedOrigins: API_CONFIG.cors.allowedOrigins,
        allowedMethods: API_CONFIG.cors.allowedMethods
      }
    }
  });
};

/**
 * Helper function to generate unique request ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Export middleware functions
 */
module.exports = {
  // Core middleware
  requestLogger,
  securityHeaders,
  corsMiddleware,
  apiVersioning,
  requestValidation,
  errorHandler,

  // Rate limiters
  rateLimiters,

  // Utility endpoints
  healthCheck,
  apiDocs,

  // Configuration
  API_CONFIG
};
