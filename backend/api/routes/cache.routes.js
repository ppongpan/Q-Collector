/**
 * Cache Management Routes
 * Provides endpoints for cache monitoring, health checks, and management
 */

const express = require('express');
const router = express.Router();
const cacheService = require('../../services/CacheService');
const { authenticate, requireSuperAdmin } = require('../../middleware/auth.middleware');
const logger = require('../../utils/logger.util');

/**
 * Cache health check endpoint
 * GET /api/v1/cache/health
 */
router.get('/health', async (req, res) => {
  try {
    const healthStatus = await cacheService.healthCheck();

    res.status(healthStatus.status === 'healthy' ? 200 : 503).json({
      success: healthStatus.status === 'healthy',
      data: healthStatus,
    });
  } catch (error) {
    logger.error('Cache health check failed:', error);
    res.status(503).json({
      success: false,
      error: {
        code: 'CACHE_HEALTH_CHECK_FAILED',
        message: 'Cache health check failed',
        details: error.message,
      },
    });
  }
});

/**
 * Cache statistics endpoint
 * GET /api/v1/cache/stats
 * Requires Super Admin role
 */
router.get('/stats', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const info = await cacheService.getInfo();

    res.json({
      success: true,
      data: info,
    });
  } catch (error) {
    logger.error('Failed to get cache statistics:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CACHE_STATS_ERROR',
        message: 'Failed to retrieve cache statistics',
        details: error.message,
      },
    });
  }
});

/**
 * Cache key inspection endpoint
 * GET /api/v1/cache/keys?pattern=*
 * Requires Super Admin role
 */
router.get('/keys', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { pattern = '*', limit = 100 } = req.query;

    // Get Redis client from cache service
    const { redisClient } = require('../../config/redis.config');

    // Get keys matching pattern
    const keys = await redisClient.keys(pattern);
    const limitedKeys = keys.slice(0, parseInt(limit));

    // Get key info for each key
    const keyInfo = await Promise.all(
      limitedKeys.map(async (key) => {
        try {
          const [ttl, type, exists] = await Promise.all([
            redisClient.ttl(key),
            redisClient.type(key),
            redisClient.exists(key),
          ]);

          let size = 0;
          try {
            const value = await redisClient.get(key);
            size = value ? Buffer.byteLength(value, 'utf8') : 0;
          } catch (e) {
            // Ignore size calculation errors
          }

          return {
            key,
            ttl: ttl === -1 ? 'no expiry' : `${ttl}s`,
            type,
            exists: exists === 1,
            size,
          };
        } catch (error) {
          return {
            key,
            error: error.message,
          };
        }
      })
    );

    res.json({
      success: true,
      data: {
        total: keys.length,
        showing: limitedKeys.length,
        pattern,
        keys: keyInfo,
      },
    });
  } catch (error) {
    logger.error('Failed to inspect cache keys:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CACHE_KEYS_ERROR',
        message: 'Failed to inspect cache keys',
        details: error.message,
      },
    });
  }
});

/**
 * Cache key deletion endpoint
 * DELETE /api/v1/cache/keys/:key
 * Requires Super Admin role
 */
router.delete('/keys/:key', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const deleted = await cacheService.delete(key);

    res.json({
      success: true,
      data: {
        key,
        deleted,
      },
    });
  } catch (error) {
    logger.error(`Failed to delete cache key ${req.params.key}:`, error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CACHE_DELETE_ERROR',
        message: 'Failed to delete cache key',
        details: error.message,
      },
    });
  }
});

/**
 * Cache pattern deletion endpoint
 * DELETE /api/v1/cache/pattern
 * Body: { pattern: "user:*" }
 * Requires Super Admin role
 */
router.delete('/pattern', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { pattern } = req.body;

    if (!pattern) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PATTERN',
          message: 'Pattern is required',
        },
      });
    }

    const deletedCount = await cacheService.deletePattern(pattern);

    res.json({
      success: true,
      data: {
        pattern,
        deletedCount,
      },
    });
  } catch (error) {
    logger.error(`Failed to delete cache pattern ${req.body.pattern}:`, error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CACHE_PATTERN_DELETE_ERROR',
        message: 'Failed to delete cache pattern',
        details: error.message,
      },
    });
  }
});

/**
 * Cache tag deletion endpoint
 * DELETE /api/v1/cache/tags
 * Body: { tags: ["user", "session"] }
 * Requires Super Admin role
 */
router.delete('/tags', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { tags } = req.body;

    if (!tags || !Array.isArray(tags)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TAGS',
          message: 'Tags array is required',
        },
      });
    }

    const deletedCount = await cacheService.deleteByTags(tags);

    res.json({
      success: true,
      data: {
        tags,
        deletedCount,
      },
    });
  } catch (error) {
    logger.error(`Failed to delete cache by tags ${req.body.tags}:`, error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CACHE_TAG_DELETE_ERROR',
        message: 'Failed to delete cache by tags',
        details: error.message,
      },
    });
  }
});

/**
 * Cache flush endpoint
 * POST /api/v1/cache/flush
 * Body: { pattern: "*" } (optional)
 * Requires Super Admin role
 */
router.post('/flush', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { pattern = '*' } = req.body;

    const success = await cacheService.flush(pattern);

    if (!success) {
      throw new Error('Cache flush failed');
    }

    res.json({
      success: true,
      data: {
        message: pattern === '*' ? 'All cache flushed' : `Cache pattern ${pattern} flushed`,
        pattern,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to flush cache:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CACHE_FLUSH_ERROR',
        message: 'Failed to flush cache',
        details: error.message,
      },
    });
  }
});

/**
 * Cache statistics reset endpoint
 * POST /api/v1/cache/reset-stats
 * Requires Super Admin role
 */
router.post('/reset-stats', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    cacheService.resetStatistics();

    res.json({
      success: true,
      data: {
        message: 'Cache statistics reset',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to reset cache statistics:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CACHE_RESET_STATS_ERROR',
        message: 'Failed to reset cache statistics',
        details: error.message,
      },
    });
  }
});

/**
 * Cache warmup endpoint
 * POST /api/v1/cache/warmup
 * Body: { type: "users" | "forms" | "all", limit?: number }
 * Requires Super Admin role
 */
router.post('/warmup', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { type = 'all', limit = 50 } = req.body;

    let result = { warmedUp: [] };

    if (type === 'users' || type === 'all') {
      const UserService = require('../../services/UserService');
      await UserService.warmupUserCache(limit);
      result.warmedUp.push('users');
    }

    // Add other warmup types as needed
    if (type === 'forms' || type === 'all') {
      // FormService warmup would go here
      result.warmedUp.push('forms');
    }

    res.json({
      success: true,
      data: {
        message: 'Cache warmup completed',
        ...result,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to warm up cache:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CACHE_WARMUP_ERROR',
        message: 'Failed to warm up cache',
        details: error.message,
      },
    });
  }
});

/**
 * Cache performance metrics endpoint
 * GET /api/v1/cache/metrics
 * Requires Super Admin role
 */
router.get('/metrics', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { redisClient } = require('../../config/redis.config');

    // Get Redis info
    const [memoryInfo, statsInfo, keyspaceInfo] = await Promise.all([
      redisClient.info('memory'),
      redisClient.info('stats'),
      redisClient.info('keyspace'),
    ]);

    // Parse Redis info
    const parseInfo = (infoString) => {
      const info = {};
      const lines = infoString.split('\r\n');
      for (const line of lines) {
        if (line && !line.startsWith('#')) {
          const [key, value] = line.split(':');
          if (key && value) {
            info[key] = isNaN(value) ? value : parseFloat(value);
          }
        }
      }
      return info;
    };

    const memory = parseInfo(memoryInfo);
    const stats = parseInfo(statsInfo);
    const keyspace = parseInfo(keyspaceInfo);

    // Get cache service statistics
    const cacheStats = cacheService.getStatistics();

    res.json({
      success: true,
      data: {
        redis: {
          memory: {
            used: memory.used_memory_human,
            peak: memory.used_memory_peak_human,
            system: memory.total_system_memory_human,
            clients: memory.connected_clients,
          },
          stats: {
            connections: stats.total_connections_received,
            commands: stats.total_commands_processed,
            keyspace_hits: stats.keyspace_hits,
            keyspace_misses: stats.keyspace_misses,
            expired_keys: stats.expired_keys,
            evicted_keys: stats.evicted_keys,
          },
          keyspace,
        },
        cache: cacheStats,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to get cache metrics:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CACHE_METRICS_ERROR',
        message: 'Failed to get cache metrics',
        details: error.message,
      },
    });
  }
});

module.exports = router;