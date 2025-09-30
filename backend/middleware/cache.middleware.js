/**
 * Cache Middleware
 * Handles API response caching, cache headers management, and conditional caching
 */

const cacheService = require('../services/CacheService');
const { KEYS, POLICIES, TTL } = require('../config/cache.config');
const logger = require('../utils/logger.util');

/**
 * Create cache key from request
 * @param {Object} req - Express request object
 * @param {Object} options - Cache options
 * @returns {string} Cache key
 */
function createCacheKey(req, options = {}) {
  const { method, path, query, params, user } = req;

  // Include user ID for user-specific caching
  const userId = options.includeUser && user ? user.id : '';

  // Create parameter string
  const paramString = JSON.stringify({
    query: query || {},
    params: params || {},
    userId,
  });

  // Generate cache key
  return KEYS.API_RESPONSE(method, path, paramString);
}

/**
 * Get cache policy for request
 * @param {Object} req - Express request object
 * @param {Object} options - Override options
 * @returns {Object} Cache policy
 */
function getCachePolicy(req, options = {}) {
  const { method, path } = req;

  // Default policy based on method
  let defaultPolicy;

  switch (method) {
    case 'GET':
      if (path.includes('/list') || path.includes('/search')) {
        defaultPolicy = POLICIES.apiList;
      } else {
        defaultPolicy = POLICIES.apiGet;
      }
      break;
    default:
      // Don't cache non-GET requests by default
      return null;
  }

  // Merge with custom options
  return {
    ...defaultPolicy,
    ...options,
  };
}

/**
 * Check if request should be cached
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {boolean} Whether to cache
 */
function shouldCache(req, res) {
  const { method } = req;

  // Only cache GET requests by default
  if (method !== 'GET') {
    return false;
  }

  // Don't cache if response has errors
  if (res.statusCode >= 400) {
    return false;
  }

  // Don't cache if no-cache header is present
  if (req.headers['cache-control'] === 'no-cache') {
    return false;
  }

  // Don't cache if response is too large (>10MB)
  const contentLength = res.get('Content-Length');
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
    return false;
  }

  return true;
}

/**
 * Set cache headers
 * @param {Object} res - Express response object
 * @param {Object} policy - Cache policy
 * @param {boolean} isFromCache - Whether response is from cache
 */
function setCacheHeaders(res, policy, isFromCache = false) {
  const maxAge = policy.ttl;

  // Set cache-control headers
  res.set('Cache-Control', `public, max-age=${maxAge}`);
  res.set('Expires', new Date(Date.now() + maxAge * 1000).toUTCString());

  // Add custom headers
  res.set('X-Cache', isFromCache ? 'HIT' : 'MISS');
  res.set('X-Cache-TTL', maxAge.toString());

  if (isFromCache) {
    res.set('X-Cache-Key', 'cached');
  }
}

/**
 * Main cache middleware
 * @param {Object} options - Cache configuration options
 * @returns {Function} Express middleware
 */
function cacheMiddleware(options = {}) {
  return async (req, res, next) => {
    try {
      // Skip caching for non-GET requests unless explicitly enabled
      if (req.method !== 'GET' && !options.cacheAllMethods) {
        return next();
      }

      // Get cache policy
      const policy = getCachePolicy(req, options);
      if (!policy) {
        return next();
      }

      // Create cache key
      const cacheKey = createCacheKey(req, options);

      // Try to get from cache
      const cachedResponse = await cacheService.get(cacheKey);

      if (cachedResponse) {
        // Cache hit - return cached response
        setCacheHeaders(res, policy, true);

        // Set content type if available
        if (cachedResponse.contentType) {
          res.set('Content-Type', cachedResponse.contentType);
        }

        logger.debug(`Cache hit for ${req.method} ${req.path}`);
        return res.status(cachedResponse.statusCode || 200).json(cachedResponse.data);
      }

      // Cache miss - continue to route handler
      logger.debug(`Cache miss for ${req.method} ${req.path}`);

      // Override res.json to capture response
      const originalJson = res.json.bind(res);

      res.json = function(data) {
        // Check if we should cache this response
        if (shouldCache(req, res)) {
          // Prepare data for caching
          const responseData = {
            data,
            statusCode: res.statusCode,
            contentType: res.get('Content-Type'),
            timestamp: new Date().toISOString(),
          };

          // Cache the response asynchronously
          cacheService.set(cacheKey, responseData, policy.ttl, {
            compress: policy.compress,
            tags: policy.tags,
          }).catch(error => {
            logger.error(`Failed to cache response for ${req.method} ${req.path}:`, error);
          });

          // Set cache headers
          setCacheHeaders(res, policy, false);
        }

        // Send original response
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      // Continue without caching on error
      next();
    }
  };
}

/**
 * Cache invalidation middleware
 * Invalidates cache on data changes
 * @param {Array|Function} patterns - Invalidation patterns or function to generate them
 * @returns {Function} Express middleware
 */
function invalidateCacheMiddleware(patterns) {
  return async (req, res, next) => {
    // Execute original route handler first
    const originalJson = res.json.bind(res);

    res.json = async function(data) {
      // Only invalidate on successful responses
      if (res.statusCode < 400) {
        try {
          let invalidationPatterns;

          if (typeof patterns === 'function') {
            invalidationPatterns = patterns(req, res, data);
          } else {
            invalidationPatterns = patterns;
          }

          // Invalidate cache patterns
          if (Array.isArray(invalidationPatterns)) {
            for (const pattern of invalidationPatterns) {
              await cacheService.deletePattern(pattern);
            }
            logger.debug(`Invalidated cache patterns: ${invalidationPatterns.join(', ')}`);
          }
        } catch (error) {
          logger.error('Cache invalidation error:', error);
        }
      }

      // Send original response
      return originalJson(data);
    };

    next();
  };
}

/**
 * Conditional cache middleware
 * Caches based on custom conditions
 * @param {Function} condition - Function that returns true if should cache
 * @param {Object} options - Cache options
 * @returns {Function} Express middleware
 */
function conditionalCacheMiddleware(condition, options = {}) {
  return async (req, res, next) => {
    if (await condition(req, res)) {
      return cacheMiddleware(options)(req, res, next);
    }
    next();
  };
}

/**
 * Cache warming middleware
 * Preloads cache with popular data
 * @param {Object} warmupConfig - Warmup configuration
 * @returns {Function} Express middleware
 */
function cacheWarmupMiddleware(warmupConfig) {
  return async (req, res, next) => {
    // This runs after the response is sent
    res.on('finish', async () => {
      try {
        if (warmupConfig.enabled && res.statusCode < 400) {
          // Track popular endpoints
          const endpoint = `${req.method}:${req.path}`;
          await cacheService.increment(`popular:${endpoint}`, 1, TTL.TEMPORARY);
        }
      } catch (error) {
        logger.error('Cache warmup tracking error:', error);
      }
    });

    next();
  };
}

/**
 * Cache bypass middleware
 * Allows bypassing cache with special headers
 * @returns {Function} Express middleware
 */
function cacheBypassMiddleware() {
  return (req, res, next) => {
    // Check for cache bypass headers
    const bypassCache = req.headers['x-cache-bypass'] === 'true' ||
                       req.headers['cache-control'] === 'no-cache' ||
                       req.query._nocache === 'true';

    if (bypassCache) {
      // Mark request to skip cache
      req.skipCache = true;
      res.set('X-Cache-Bypass', 'true');
    }

    next();
  };
}

/**
 * Rate limiting with cache
 * @param {Object} options - Rate limiting options
 * @returns {Function} Express middleware
 */
function rateLimitCacheMiddleware(options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // requests per window
    keyGenerator = (req) => req.ip,
  } = options;

  return async (req, res, next) => {
    try {
      const key = KEYS.RATE_LIMIT(keyGenerator(req), req.path);
      const windowStart = Date.now() - windowMs;

      // Get current count
      const current = await cacheService.get(key) || { count: 0, resetTime: Date.now() + windowMs };

      // Reset if window expired
      if (Date.now() > current.resetTime) {
        current.count = 0;
        current.resetTime = Date.now() + windowMs;
      }

      // Increment count
      current.count++;

      // Set rate limit headers
      res.set('X-RateLimit-Limit', max.toString());
      res.set('X-RateLimit-Remaining', Math.max(0, max - current.count).toString());
      res.set('X-RateLimit-Reset', new Date(current.resetTime).toISOString());

      // Check if limit exceeded
      if (current.count > max) {
        res.set('Retry-After', Math.ceil((current.resetTime - Date.now()) / 1000).toString());
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests',
            retryAfter: current.resetTime,
          },
        });
      }

      // Update cache
      await cacheService.set(key, current, Math.ceil(windowMs / 1000));

      next();
    } catch (error) {
      logger.error('Rate limit cache error:', error);
      // Continue without rate limiting on error
      next();
    }
  };
}

module.exports = {
  cacheMiddleware,
  invalidateCacheMiddleware,
  conditionalCacheMiddleware,
  cacheWarmupMiddleware,
  cacheBypassMiddleware,
  rateLimitCacheMiddleware,
  createCacheKey,
  getCachePolicy,
  shouldCache,
  setCacheHeaders,
};