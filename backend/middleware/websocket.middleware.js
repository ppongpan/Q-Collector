/**
 * WebSocket Middleware
 * Authentication, authorization, and security middleware for WebSocket connections
 *
 * Features:
 * - JWT authentication for socket connections
 * - Role-based access control
 * - Rate limiting and spam protection
 * - Event validation and sanitization
 * - Connection monitoring and logging
 * - Security headers and CORS handling
 */

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger.util');
const { redisClient } = require('../config/redis.config');

/**
 * Authentication middleware for WebSocket connections
 * Validates JWT tokens and attaches user data to socket
 */
const authenticateSocket = async (socket, next) => {
  try {
    // Extract token from auth or headers
    const token = socket.handshake.auth?.token ||
                  socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
                  socket.handshake.query?.token;

    if (!token) {
      logger.warn(`WebSocket connection rejected - no token provided from IP: ${socket.handshake.address}`);
      return next(new Error('Authentication token required'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if token is blacklisted (for logout/revoked tokens)
    const isBlacklisted = await checkTokenBlacklist(token);
    if (isBlacklisted) {
      logger.warn(`WebSocket connection rejected - blacklisted token for user: ${decoded.userId}`);
      return next(new Error('Token has been revoked'));
    }

    // Get user data from database
    const User = require('../models/User');
    const user = await User.findByPk(decoded.userId, {
      attributes: ['id', 'username', 'email', 'firstName', 'lastName', 'role', 'department', 'isActive']
    });

    if (!user) {
      logger.warn(`WebSocket connection rejected - user not found: ${decoded.userId}`);
      return next(new Error('User not found'));
    }

    if (!user.isActive) {
      logger.warn(`WebSocket connection rejected - inactive user: ${user.username}`);
      return next(new Error('User account is inactive'));
    }

    // Attach user data to socket
    socket.userId = user.id;
    socket.userData = user;
    socket.token = token;

    // Log successful authentication
    logger.info(`WebSocket authenticated: ${user.username} (${user.id}) from IP: ${socket.handshake.address}`);

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      logger.warn(`WebSocket authentication failed - invalid token: ${error.message}`);
      return next(new Error('Invalid authentication token'));
    }

    if (error.name === 'TokenExpiredError') {
      logger.warn(`WebSocket authentication failed - expired token`);
      return next(new Error('Authentication token has expired'));
    }

    logger.error('WebSocket authentication error:', error);
    return next(new Error('Authentication failed'));
  }
};

/**
 * Rate limiting middleware for WebSocket events
 * Prevents spam and abuse of real-time features
 */
const rateLimitSocket = (options = {}) => {
  const {
    maxEvents = 50,        // Maximum events per window
    windowMs = 60000,      // Window duration in milliseconds (1 minute)
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = (socket) => socket.id,
  } = options;

  const rateLimitStore = new Map();

  return (socket, next) => {
    const key = keyGenerator(socket);
    const now = Date.now();

    // Clean up expired entries
    if (rateLimitStore.size > 1000) {
      for (const [k, data] of rateLimitStore.entries()) {
        if (now > data.resetTime) {
          rateLimitStore.delete(k);
        }
      }
    }

    // Get or create rate limit data
    let rateLimitData = rateLimitStore.get(key);
    if (!rateLimitData || now > rateLimitData.resetTime) {
      rateLimitData = {
        count: 0,
        resetTime: now + windowMs,
        firstHit: now,
      };
      rateLimitStore.set(key, rateLimitData);
    }

    // Check if limit exceeded
    if (rateLimitData.count >= maxEvents) {
      const retryAfter = Math.ceil((rateLimitData.resetTime - now) / 1000);

      logger.warn(`WebSocket rate limit exceeded for ${socket.userData?.username || socket.id} - ${rateLimitData.count} events in window`);

      socket.emit('rate_limit_exceeded', {
        message: 'Rate limit exceeded',
        retryAfter,
        limit: maxEvents,
        windowMs,
      });

      return; // Don't call next() to prevent further processing
    }

    // Increment counter
    rateLimitData.count++;

    // Attach rate limit middleware to socket for event-specific limits
    socket.rateLimitCheck = (eventMaxEvents = maxEvents, eventWindowMs = windowMs) => {
      const eventKey = `${key}:event`;
      const eventNow = Date.now();

      let eventRateLimitData = rateLimitStore.get(eventKey);
      if (!eventRateLimitData || eventNow > eventRateLimitData.resetTime) {
        eventRateLimitData = {
          count: 0,
          resetTime: eventNow + eventWindowMs,
        };
        rateLimitStore.set(eventKey, eventRateLimitData);
      }

      if (eventRateLimitData.count >= eventMaxEvents) {
        return false;
      }

      eventRateLimitData.count++;
      return true;
    };

    next();
  };
};

/**
 * Authorization middleware for WebSocket events
 * Checks if user has permission to perform specific actions
 */
const authorizeSocketEvent = (requiredPermissions = []) => {
  return (socket, eventData, next) => {
    const { userData } = socket;

    try {
      // Super admin has all permissions
      if (userData.role === 'super_admin') {
        return next();
      }

      // Check role-based permissions
      for (const permission of requiredPermissions) {
        if (!hasPermission(userData, permission, eventData)) {
          logger.warn(`WebSocket authorization failed: ${userData.username} lacks permission: ${permission}`);
          socket.emit('authorization_error', {
            message: 'Insufficient permissions',
            requiredPermission: permission,
          });
          return; // Don't call next()
        }
      }

      next();
    } catch (error) {
      logger.error('WebSocket authorization error:', error);
      socket.emit('authorization_error', {
        message: 'Authorization check failed',
      });
    }
  };
};

/**
 * Event validation middleware
 * Validates and sanitizes WebSocket event data
 */
const validateSocketEvent = (schema) => {
  return (socket, eventData, next) => {
    try {
      const { error, value } = schema.validate(eventData);

      if (error) {
        logger.warn(`WebSocket event validation failed for ${socket.userData?.username}: ${error.message}`);
        socket.emit('validation_error', {
          message: 'Invalid event data',
          details: error.details,
        });
        return;
      }

      // Replace eventData with validated/sanitized value
      next(value);
    } catch (error) {
      logger.error('WebSocket event validation error:', error);
      socket.emit('validation_error', {
        message: 'Event validation failed',
      });
    }
  };
};

/**
 * Connection monitoring middleware
 * Tracks connection metrics and suspicious activity
 */
const monitorConnection = (socket, next) => {
  const { userData } = socket;
  const connectionData = {
    userId: userData.id,
    username: userData.username,
    ip: socket.handshake.address,
    userAgent: socket.handshake.headers['user-agent'],
    connectedAt: new Date(),
    events: {
      total: 0,
      byType: {},
    },
  };

  // Store connection data
  socket.connectionData = connectionData;

  // Track events
  const originalEmit = socket.emit;
  socket.emit = function(...args) {
    const eventName = args[0];
    connectionData.events.total++;
    connectionData.events.byType[eventName] = (connectionData.events.byType[eventName] || 0) + 1;
    return originalEmit.apply(socket, args);
  };

  // Log connection
  logger.info(`WebSocket connection established: ${userData.username} from ${connectionData.ip}`);

  // Store connection metrics in Redis
  storeConnectionMetrics(connectionData);

  next();
};

/**
 * Security headers middleware for WebSocket
 * Adds security-related information to socket context
 */
const securityHeaders = (socket, next) => {
  // Add security context
  socket.security = {
    ip: socket.handshake.address,
    userAgent: socket.handshake.headers['user-agent'],
    origin: socket.handshake.headers.origin,
    referer: socket.handshake.headers.referer,
    connectedAt: new Date(),
  };

  // Validate origin if configured
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];
  if (allowedOrigins.length > 0 && !allowedOrigins.includes('*')) {
    const origin = socket.handshake.headers.origin;
    if (origin && !allowedOrigins.includes(origin)) {
      logger.warn(`WebSocket connection rejected - invalid origin: ${origin}`);
      return next(new Error('Invalid origin'));
    }
  }

  next();
};

/**
 * Error handling middleware for WebSocket
 * Centralized error handling and logging
 */
const errorHandler = (socket) => {
  socket.on('error', (error) => {
    logger.error(`WebSocket error for user ${socket.userData?.username || 'unknown'}:`, error);

    // Send error response to client
    socket.emit('error_response', {
      message: 'An error occurred',
      timestamp: new Date(),
    });
  });

  socket.on('disconnect', (reason) => {
    const { userData, connectionData } = socket;

    logger.info(`WebSocket disconnected: ${userData?.username} - reason: ${reason}`);

    // Log connection metrics
    if (connectionData) {
      const duration = new Date() - connectionData.connectedAt;
      logger.debug(`Connection duration: ${duration}ms, Events: ${connectionData.events.total}`);
    }
  });
};

/**
 * Helper function to check if token is blacklisted
 */
async function checkTokenBlacklist(token) {
  try {
    const key = `blacklist:token:${token}`;
    const result = await redisClient.exists(key);
    return result === 1;
  } catch (error) {
    logger.error('Error checking token blacklist:', error);
    return false;
  }
}

/**
 * Helper function to check user permissions
 */
function hasPermission(userData, permission, eventData = {}) {
  const { role, department, id: userId } = userData;

  switch (permission) {
    case 'form:read':
      return true; // All authenticated users can read forms

    case 'form:create':
      return ['super_admin', 'admin', 'department_manager'].includes(role);

    case 'form:edit':
      if (['super_admin', 'admin'].includes(role)) return true;
      if (role === 'department_manager' && eventData.formDepartment === department) return true;
      if (eventData.formCreatedBy === userId) return true;
      return false;

    case 'form:delete':
      if (['super_admin', 'admin'].includes(role)) return true;
      if (eventData.formCreatedBy === userId) return true;
      return false;

    case 'submission:read':
      if (['super_admin', 'admin'].includes(role)) return true;
      if (role === 'department_manager' && eventData.submissionDepartment === department) return true;
      if (eventData.submissionCreatedBy === userId) return true;
      return false;

    case 'submission:create':
      return true; // All authenticated users can create submissions

    case 'submission:edit':
      if (['super_admin', 'admin'].includes(role)) return true;
      if (eventData.submissionCreatedBy === userId) return true;
      return false;

    case 'user:manage':
      return ['super_admin', 'admin'].includes(role);

    case 'department:manage':
      if (['super_admin', 'admin'].includes(role)) return true;
      if (role === 'department_manager' && eventData.targetDepartment === department) return true;
      return false;

    default:
      return false;
  }
}

/**
 * Helper function to store connection metrics
 */
async function storeConnectionMetrics(connectionData) {
  try {
    const key = `websocket:metrics:${connectionData.userId}:${Date.now()}`;
    const data = JSON.stringify(connectionData);

    // Store for 24 hours
    await redisClient.setEx(key, 86400, data);

    // Also update daily aggregates
    const dateKey = `websocket:daily:${new Date().toISOString().split('T')[0]}`;
    await redisClient.incr(dateKey);
    await redisClient.expire(dateKey, 86400 * 30); // Keep for 30 days
  } catch (error) {
    logger.error('Error storing connection metrics:', error);
  }
}

/**
 * Create event-specific middleware chain
 */
const createEventMiddleware = (permissions = [], validationSchema = null, rateLimitOptions = {}) => {
  const middlewares = [];

  // Add rate limiting if specified
  if (Object.keys(rateLimitOptions).length > 0) {
    middlewares.push((socket, eventData, next) => {
      if (!socket.rateLimitCheck(rateLimitOptions.maxEvents, rateLimitOptions.windowMs)) {
        socket.emit('rate_limit_exceeded', {
          message: 'Event rate limit exceeded',
          event: rateLimitOptions.eventName || 'unknown',
        });
        return;
      }
      next();
    });
  }

  // Add authorization
  if (permissions.length > 0) {
    middlewares.push(authorizeSocketEvent(permissions));
  }

  // Add validation
  if (validationSchema) {
    middlewares.push(validateSocketEvent(validationSchema));
  }

  return middlewares;
};

module.exports = {
  authenticateSocket,
  rateLimitSocket,
  authorizeSocketEvent,
  validateSocketEvent,
  monitorConnection,
  securityHeaders,
  errorHandler,
  createEventMiddleware,
};