/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse, brute-force attacks, and DDoS
 * Q-Collector Security Enhancement - Sprint 1, Task 1.2
 *
 * Uses Redis for distributed rate limiting across multiple servers
 * Falls back to in-memory storage if Redis is unavailable
 */

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default;
const redis = require('redis');
const logger = require('../utils/logger.util');

// Environment check - disable rate limiting in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Create Redis client for rate limiting
 * Falls back to in-memory if Redis connection fails
 */
let redisClient = null;
let useRedis = false;

const initializeRedis = async () => {
  if (process.env.REDIS_URL && !redisClient) {
    try {
      redisClient = redis.createClient({
        url: process.env.REDIS_URL,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              logger.error('Redis connection failed after 3 retries. Using in-memory rate limiting.');
              return new Error('Max retries reached');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      redisClient.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        useRedis = false;
      });

      redisClient.on('connect', () => {
        logger.info('Redis connected successfully for rate limiting');
        useRedis = true;
      });

      await redisClient.connect();
    } catch (error) {
      logger.warn('Failed to connect to Redis for rate limiting. Using in-memory storage.', error);
      useRedis = false;
    }
  }
};

// Initialize Redis connection
initializeRedis();

/**
 * Standard rate limit handler
 * Sends consistent error response for rate limit violations
 */
const standardHandler = (req, res) => {
  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    userId: req.userId || 'anonymous',
    path: req.path,
    method: req.method
  });

  res.status(429).json({
    success: false,
    error: 'Too many requests',
    message: 'คุณทำการร้องขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่',
    retryAfter: res.getHeader('Retry-After')
  });
};

/**
 * Skip rate limiting for successful requests from trusted users
 * Only count failed attempts for authentication endpoints
 */
const skipSuccessfulRequests = (req, res) => {
  // Skip successful requests (2xx status codes)
  return res.statusCode < 400;
};

/**
 * Create rate limiter configuration
 * @param {Object} options - Rate limiter options
 * @returns {Object} Rate limiter middleware
 */
const createRateLimiter = (options) => {
  const config = {
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes default
    max: options.max || 100,
    message: options.message || 'Too many requests',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: standardHandler,
    skip: options.skip || (() => false),
    keyGenerator: options.keyGenerator || ((req) => req.ip), // Default: IP-based
    ...options
  };

  // Use Redis store if available, otherwise use default in-memory store
  if (useRedis && redisClient) {
    config.store = new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
      prefix: options.prefix || 'rl:',
    });
  } else {
    logger.warn(`Rate limiter "${options.prefix || 'default'}" using in-memory store (not suitable for production with multiple servers)`);
  }

  return rateLimit(config);
};

/**
 * Global rate limiter - applies to all requests
 * 100 requests per 15 minutes per IP (DISABLED in development mode)
 */
const globalRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later',
  prefix: 'rl:global:',
  skip: (req) => isDevelopment, // Skip in development mode
});

/**
 * Authentication rate limiter - prevents brute-force attacks
 * 5 requests per 15 minutes per IP
 * Only counts failed login attempts
 */
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many login attempts, please try again later',
  prefix: 'rl:auth:',
  skipSuccessfulRequests: true, // Only count failed attempts
});

/**
 * Strict authentication rate limiter for password reset
 * 3 requests per hour per IP
 */
const strictAuthRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many password reset attempts, please try again later',
  prefix: 'rl:auth:strict:',
});

/**
 * Form operations rate limiter
 * 30 requests per 15 minutes per user (DISABLED in development mode)
 */
const formRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: 'Too many form operations, please slow down',
  prefix: 'rl:form:',
  keyGenerator: (req) => req.userId || req.ip, // User-based if authenticated
  skip: (req) => isDevelopment, // Skip in development mode
});

/**
 * File upload rate limiter
 * 10 uploads per hour per user
 */
const fileUploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many file uploads, please try again later',
  prefix: 'rl:file:',
  keyGenerator: (req) => req.userId || req.ip,
});

/**
 * Search/Export rate limiter
 * 20 requests per 15 minutes per user
 */
const searchRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: 'Too many search requests, please slow down',
  prefix: 'rl:search:',
  keyGenerator: (req) => req.userId || req.ip,
});

/**
 * API endpoint rate limiter
 * 60 requests per minute per user (DISABLED in development mode)
 */
const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: 'Too many API requests, please slow down',
  prefix: 'rl:api:',
  keyGenerator: (req) => req.userId || req.ip,
  skip: (req) => isDevelopment, // Skip in development mode
});

/**
 * Submission creation rate limiter
 * 20 submissions per 15 minutes per user (DISABLED in development mode)
 */
const submissionRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: 'Too many form submissions, please slow down',
  prefix: 'rl:submission:',
  keyGenerator: (req) => req.userId || req.ip,
  skip: (req) => isDevelopment, // Skip in development mode
});

/**
 * Admin operations rate limiter (more lenient)
 * 100 requests per 15 minutes per admin user
 */
const adminRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many admin operations, please slow down',
  prefix: 'rl:admin:',
  keyGenerator: (req) => req.userId || req.ip,
});

/**
 * Public form submission rate limiter (v0.9.0-dev)
 * Stricter limits for anonymous public submissions to prevent spam
 *
 * Rate: 5 submissions per hour per IP address
 * Bypass: Authenticated users (req.userId present)
 *
 * Security Features:
 * - IP-based tracking (uses metadata.ipAddress with proxy support)
 * - Stricter than authenticated submissions (5 vs 20)
 * - Prevents spam attacks on public forms
 * - Always active (no development mode skip)
 */
const publicFormRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 submissions per hour per IP (strict)
  message: 'Too many submissions from this IP address. Please try again in an hour.',
  prefix: 'rl:public:',
  keyGenerator: (req) => {
    // Use IP from metadata (with proxy support) or fallback to req.ip
    return req.metadata?.ipAddress || req.ip;
  },
  skip: (req) => {
    // Skip rate limiting if user is authenticated
    // Authenticated users use the normal submissionRateLimiter (20/15min)
    return req.userId != null;
  },
});

/**
 * Custom rate limiter factory
 * Creates a rate limiter with custom configuration
 *
 * @param {number} max - Maximum requests
 * @param {number} windowMs - Time window in milliseconds
 * @param {string} prefix - Redis key prefix
 * @returns {Function} Rate limiter middleware
 */
const createCustomRateLimiter = (max, windowMs, prefix) => {
  return createRateLimiter({
    windowMs,
    max,
    prefix: `rl:custom:${prefix}:`,
    keyGenerator: (req) => req.userId || req.ip,
  });
};

/**
 * Cleanup function to close Redis connection gracefully
 */
const cleanup = async () => {
  if (redisClient && useRedis) {
    try {
      await redisClient.quit();
      logger.info('Redis client for rate limiting closed successfully');
    } catch (error) {
      logger.error('Error closing Redis client:', error);
    }
  }
};

// Export all rate limiters and utilities
module.exports = {
  // Pre-configured rate limiters
  globalRateLimiter,
  authRateLimiter,
  strictAuthRateLimiter,
  formRateLimiter,
  fileUploadRateLimiter,
  searchRateLimiter,
  apiRateLimiter,
  submissionRateLimiter,
  adminRateLimiter,
  publicFormRateLimiter, // v0.9.0: Public form submission rate limiter (5/hour per IP)

  // Utilities
  createCustomRateLimiter,
  cleanup,

  // Access to Redis client (for testing/debugging)
  getRedisClient: () => redisClient,
  isUsingRedis: () => useRedis,
};
