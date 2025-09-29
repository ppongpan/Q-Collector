/**
 * Redis Configuration
 * Redis client setup for caching and session storage
 */

const redis = require('redis');
const logger = require('../utils/logger.util');

// Get Redis configuration from environment variables
const config = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),

  // Connection options
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis reconnection attempts exceeded');
        return new Error('Redis reconnection failed');
      }
      // Exponential backoff: 50ms, 100ms, 200ms, etc.
      return Math.min(retries * 50, 3000);
    },
    connectTimeout: 10000,
  },

  // Legacy mode for backward compatibility
  legacyMode: false,
};

// Create Redis client
const redisClient = redis.createClient({
  socket: {
    host: config.host,
    port: config.port,
    reconnectStrategy: config.socket.reconnectStrategy,
    connectTimeout: config.socket.connectTimeout,
  },
  password: config.password,
  database: config.db,
  legacyMode: config.legacyMode,
});

// Error handler
redisClient.on('error', (error) => {
  logger.error('Redis Client Error:', error);
});

// Connection handler
redisClient.on('connect', () => {
  logger.info('Redis client connecting...');
});

// Ready handler
redisClient.on('ready', () => {
  logger.info('Redis client ready');
});

// Reconnecting handler
redisClient.on('reconnecting', () => {
  logger.warn('Redis client reconnecting...');
});

// End handler
redisClient.on('end', () => {
  logger.info('Redis client connection closed');
});

/**
 * Connect to Redis
 */
async function connectRedis() {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      logger.info('Redis connection established successfully');
    }
    return true;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error.message);
    throw error;
  }
}

/**
 * Test Redis connection
 */
async function testRedisConnection() {
  try {
    // Ensure connection is established
    if (!redisClient.isOpen) {
      await connectRedis();
    }

    // Test with ping
    const result = await redisClient.ping();
    if (result === 'PONG') {
      logger.info('Redis connection test successful');
      return true;
    }
    throw new Error('Redis ping failed');
  } catch (error) {
    logger.error('Redis connection test failed:', error.message);
    throw error;
  }
}

/**
 * Close Redis connection
 */
async function closeRedisConnection() {
  try {
    if (redisClient.isOpen) {
      await redisClient.quit();
      logger.info('Redis connection closed gracefully');
    }
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
    // Force disconnect if graceful shutdown fails
    await redisClient.disconnect();
  }
}

/**
 * Cache helper functions
 */
const cache = {
  /**
   * Get value from cache
   */
  async get(key) {
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  },

  /**
   * Set value in cache with TTL
   */
  async set(key, value, ttl = parseInt(process.env.REDIS_CACHE_TTL || '3600', 10)) {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Delete value from cache
   */
  async del(key) {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Delete multiple keys matching a pattern
   */
  async delPattern(pattern) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return true;
    } catch (error) {
      logger.error(`Cache delete pattern error for ${pattern}:`, error);
      return false;
    }
  },

  /**
   * Check if key exists
   */
  async exists(key) {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Set TTL for a key
   */
  async expire(key, ttl) {
    try {
      await redisClient.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error(`Cache expire error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Increment a counter
   */
  async incr(key) {
    try {
      return await redisClient.incr(key);
    } catch (error) {
      logger.error(`Cache incr error for key ${key}:`, error);
      return null;
    }
  },

  /**
   * Decrement a counter
   */
  async decr(key) {
    try {
      return await redisClient.decr(key);
    } catch (error) {
      logger.error(`Cache decr error for key ${key}:`, error);
      return null;
    }
  },
};

// Export Redis client and utility functions
module.exports = {
  redisClient,
  connectRedis,
  testRedisConnection,
  closeRedisConnection,
  cache,
  config,
};