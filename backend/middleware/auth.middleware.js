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

      // Admin has access to everything
      if (req.userRole === 'admin') {
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
 * Rate limiting middleware for authentication endpoints
 * Prevents brute force attacks
 */
const authRateLimits = new Map();

function authRateLimit(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  return (req, res, next) => {
    const identifier = req.body.email || req.body.username || req.ip;
    const now = Date.now();
    const key = `auth:${identifier}`;

    // Get or initialize rate limit data
    const rateData = authRateLimits.get(key) || { count: 0, resetTime: now + windowMs };

    // Reset if window has passed
    if (now > rateData.resetTime) {
      rateData.count = 0;
      rateData.resetTime = now + windowMs;
    }

    // Increment attempt counter
    rateData.count += 1;
    authRateLimits.set(key, rateData);

    // Check if limit exceeded
    if (rateData.count > maxAttempts) {
      const retryAfter = Math.ceil((rateData.resetTime - now) / 1000);
      logger.warn(`Rate limit exceeded for ${identifier}`);

      res.set('Retry-After', retryAfter);
      return next(
        new ApiError(
          429,
          `Too many authentication attempts. Please try again in ${retryAfter} seconds.`,
          'RATE_LIMIT_EXCEEDED',
          { retryAfter }
        )
      );
    }

    next();
  };
}

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
 * Attach request metadata (IP, user agent) to req
 */
function attachMetadata(req, res, next) {
  req.metadata = {
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
  };
  next();
}

/**
 * Clean up expired rate limit entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of authRateLimits.entries()) {
    if (now > data.resetTime) {
      authRateLimits.delete(key);
    }
  }
}, 60 * 60 * 1000); // Clean every hour

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  checkOwnership,
  authRateLimit,
  requireActiveAccount,
  attachMetadata,
  extractToken,
};