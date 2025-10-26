/**
 * Authentication Middleware
 * JWT token verification and role-based access control
 */

const AuthService = require('../services/AuthService');
const { ApiError } = require('./error.middleware');
const logger = require('../utils/logger.util');

/**
 * Extract token from Authorization header
 * @param {Object} req - Express request object
 * @returns {string|null} Token or null
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  // Check for Bearer token format
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check for token without Bearer prefix
  return authHeader;
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 * @throws {ApiError} If token is missing or invalid
 */
async function authenticate(req, res, next) {
  try {
    // Extract token from header
    const token = extractToken(req);

    if (!token) {
      throw new ApiError(401, 'Authentication token required', 'TOKEN_REQUIRED');
    }

    // Verify token
    const decoded = await AuthService.verifyToken(token);

    // Get user from token payload
    const user = await AuthService.getCurrentUser(decoded.id);

    // Attach user and token info to request
    req.user = user;
    req.userId = user.id;
    req.userRole = user.role;
    req.token = token;

    // Log authentication (optional, can be disabled for performance)
    if (process.env.LOG_AUTH === 'true') {
      logger.debug(`Authenticated request: ${req.method} ${req.path} by ${user.username} (${user.role})`);
    }

    next();
  } catch (error) {
    // Convert non-ApiError errors to ApiError
    if (!(error instanceof ApiError)) {
      logger.error('Authentication error:', error);
      next(new ApiError(401, 'Authentication failed', 'AUTH_FAILED'));
    } else {
      next(error);
    }
  }
}

/**
 * Authorization middleware factory
 * Creates middleware that checks if user has required role(s)
 * @param {...string} allowedRoles - Roles that are allowed access
 * @returns {Function} Express middleware function
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user || !req.userRole) {
        throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
      }

      // Admin and Super Admin have access to everything
      if (req.userRole === 'admin' || req.userRole === 'super_admin') {
        return next();
      }

      // Check if user role is in allowed roles
      if (!allowedRoles.includes(req.userRole)) {
        logger.warn(
          `Authorization failed: ${req.user.username} (${req.userRole}) ` +
          `attempted to access ${req.method} ${req.path} ` +
          `(requires: ${allowedRoles.join(', ')})`
        );
        throw new ApiError(
          403,
          'Insufficient permissions',
          'FORBIDDEN',
          { requiredRoles: allowedRoles, userRole: req.userRole }
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Optional authentication middleware
 * Attaches user to request if token is present and valid
 * Does not throw error if token is missing or invalid
 */
async function optionalAuth(req, res, next) {
  try {
    // Extract token from header
    const token = extractToken(req);

    if (!token) {
      // No token provided, continue without authentication
      return next();
    }

    // Try to verify token
    try {
      const decoded = await AuthService.verifyToken(token);
      const user = await AuthService.getCurrentUser(decoded.id);

      // Attach user info to request
      req.user = user;
      req.userId = user.id;
      req.userRole = user.role;
      req.token = token;

      logger.debug(`Optional auth: authenticated as ${user.username}`);
    } catch (error) {
      // Invalid token, but continue without authentication
      logger.debug('Optional auth: token verification failed, continuing as guest');
    }

    next();
  } catch (error) {
    // Don't fail on errors in optional auth
    logger.debug('Optional auth error:', error.message);
    next();
  }
}

/**
 * Check if user owns the resource
 * Used for endpoints where users can only access their own data
 * @param {string} userIdParam - Name of the route/query/body parameter containing user ID
 * @param {string} source - Where to look for user ID ('params', 'query', 'body')
 * @returns {Function} Express middleware function
 */
function checkOwnership(userIdParam = 'userId', source = 'params') {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
      }

      // Admin can access all resources
      if (req.userRole === 'admin') {
        return next();
      }

      // Get resource user ID from request
      const resourceUserId = req[source][userIdParam];

      // Check if user owns the resource
      if (resourceUserId !== req.userId) {
        logger.warn(
          `Ownership check failed: ${req.user.username} attempted to access ` +
          `resource belonging to ${resourceUserId}`
        );
        throw new ApiError(403, 'Access denied to this resource', 'FORBIDDEN');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * DEPRECATED: Legacy rate limiting removed in v0.8.2
 * Now using Redis-based rate limiting from rateLimit.middleware.js
 * See: backend/middleware/rateLimit.middleware.js (authRateLimiter)
 */

/**
 * Check if user account is active
 */
function requireActiveAccount(req, res, next) {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }

    if (!req.user.is_active) {
      throw new ApiError(403, 'Account is inactive', 'ACCOUNT_INACTIVE');
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Require Super Admin role
 * Only allows super_admin to access the endpoint
 */
function requireSuperAdmin(req, res, next) {
  try {
    if (!req.user || !req.userRole) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }

    if (req.userRole !== 'super_admin') {
      logger.warn(
        `Super Admin access denied: ${req.user.username} (${req.userRole}) ` +
        `attempted to access ${req.method} ${req.path}`
      );
      throw new ApiError(403, 'Super Admin access required', 'SUPER_ADMIN_REQUIRED');
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Check if user requires 2FA setup
 * Block access to protected routes if user needs to setup 2FA
 * Allows access to: /auth/*, /2fa/setup-required, /2fa/enable-required
 */
function requireCompletedSetup(req, res, next) {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }

    // Skip check for 2FA setup routes
    const allowedPaths = [
      '/api/v1/auth/logout',
      '/api/v1/2fa/setup-required',
      '/api/v1/2fa/enable-required'
    ];

    if (allowedPaths.includes(req.path)) {
      return next();
    }

    // Check if user requires 2FA setup
    if (req.user.requires_2fa_setup === true) {
      logger.warn(
        `2FA setup required: ${req.user.username} attempted to access ${req.method} ${req.path}`
      );
      throw new ApiError(
        403,
        'Please complete 2FA setup before accessing the system',
        'TWO_FACTOR_SETUP_REQUIRED',
        { requires_2fa_setup: true }
      );
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Attach request metadata (IP, user agent) to req
 * Properly extracts real client IP even when behind proxies
 */
function attachMetadata(req, res, next) {
  // Extract real IP address (handle proxy scenarios)
  let ipAddress = req.ip;

  // Check x-forwarded-for header (used by proxies, load balancers, React dev proxy)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one (original client)
    ipAddress = forwardedFor.split(',')[0].trim();
  } else if (!ipAddress || ipAddress === '::1' || ipAddress === '127.0.0.1') {
    // Fallback to connection remote address if req.ip is localhost
    ipAddress = req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
  }

  // Convert IPv6 localhost to IPv4 for consistency
  if (ipAddress === '::1') {
    ipAddress = '127.0.0.1';
  }

  req.metadata = {
    ipAddress,
    userAgent: req.get('user-agent'),
  };
  next();
}

/**
 * DEPRECATED: Cleanup removed with legacy rate limiting in v0.8.2
 * Redis-based rate limiting handles cleanup automatically
 */

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  checkOwnership,
  // authRateLimit removed in v0.8.2 - use authRateLimiter from rateLimit.middleware.js
  requireActiveAccount,
  requireSuperAdmin,
  requireCompletedSetup,
  attachMetadata,
  extractToken,
};