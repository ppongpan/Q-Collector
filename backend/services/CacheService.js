/**
 * Enhanced Cache Service
 * Comprehensive Redis caching system with compression, statistics, and advanced features
 */

const zlib = require('zlib');
const { promisify } = require('util');
const { redisClient, cache } = require('../config/redis.config');
const logger = require('../utils/logger.util');

// Promisify compression functions
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

class CacheService {
  constructor() {
    this.compressionThreshold = parseInt(process.env.CACHE_COMPRESSION_THRESHOLD || '1024', 10); // 1KB
    this.defaultTTL = parseInt(process.env.REDIS_CACHE_TTL || '3600', 10); // 1 hour
    this.statistics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    };
  }

  /**
   * Get value from cache with decompression support
   * @param {string} key - Cache key
   * @param {Object} options - Options { decompress: boolean }
   * @returns {Promise<any>} Cached value or null
   */
  async get(key, options = {}) {
    try {
      const startTime = Date.now();
      const rawValue = await redisClient.get(key);

      if (!rawValue) {
        this.statistics.misses++;
        logger.debug(`Cache miss for key: ${key}`);
        return null;
      }

      let value;
      const metadata = JSON.parse(rawValue);

      // Check if data is compressed
      if (metadata.compressed && options.decompress !== false) {
        const decompressed = await gunzip(Buffer.from(metadata.data, 'base64'));
        value = JSON.parse(decompressed.toString());
      } else {
        value = metadata.data;
      }

      this.statistics.hits++;
      const duration = Date.now() - startTime;

      logger.debug(`Cache hit for key: ${key} (${duration}ms)`);

      return value;
    } catch (error) {
      this.statistics.errors++;
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with compression support
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number|Object} ttl - TTL in seconds or options object
   * @param {Object} options - Options { compress: boolean, tags: string[] }
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = this.defaultTTL, options = {}) {
    try {
      const startTime = Date.now();

      // Handle options parameter
      if (typeof ttl === 'object') {
        options = ttl;
        ttl = options.ttl || this.defaultTTL;
      }

      const serialized = JSON.stringify(value);
      const dataSize = Buffer.byteLength(serialized);

      let finalData = value;
      let compressed = false;

      // Compress if data size exceeds threshold
      if (options.compress !== false && dataSize > this.compressionThreshold) {
        const compressedBuffer = await gzip(serialized);
        finalData = compressedBuffer.toString('base64');
        compressed = true;

        logger.debug(`Compressed cache data: ${dataSize} -> ${compressedBuffer.length} bytes`);
      }

      // Create metadata wrapper
      const metadata = {
        data: finalData,
        compressed,
        createdAt: new Date().toISOString(),
        size: dataSize,
        tags: options.tags || [],
      };

      await redisClient.setEx(key, ttl, JSON.stringify(metadata));

      // Set tags for cache invalidation
      if (options.tags && options.tags.length > 0) {
        await this.setTags(key, options.tags, ttl);
      }

      this.statistics.sets++;
      const duration = Date.now() - startTime;

      logger.debug(`Cache set for key: ${key} (${duration}ms, ${compressed ? 'compressed' : 'uncompressed'})`);

      return true;
    } catch (error) {
      this.statistics.errors++;
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async delete(key) {
    try {
      const result = await redisClient.del(key);

      // Clean up tags
      await this.cleanupTags(key);

      this.statistics.deletes++;
      logger.debug(`Cache delete for key: ${key}`);

      return result > 0;
    } catch (error) {
      this.statistics.errors++;
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   * @param {string} pattern - Key pattern (e.g., 'user:*')
   * @returns {Promise<number>} Number of keys deleted
   */
  async deletePattern(pattern) {
    try {
      const keys = await redisClient.keys(pattern);

      if (keys.length === 0) {
        return 0;
      }

      // Delete in batches for better performance
      const batchSize = 100;
      let deletedCount = 0;

      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        const result = await redisClient.del(batch);
        deletedCount += result;

        // Clean up tags for batch
        await Promise.all(batch.map(key => this.cleanupTags(key)));
      }

      this.statistics.deletes += deletedCount;
      logger.info(`Cache pattern delete: ${pattern} (${deletedCount} keys)`);

      return deletedCount;
    } catch (error) {
      this.statistics.errors++;
      logger.error(`Cache pattern delete error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Delete cache entries by tags
   * @param {string|string[]} tags - Tag or array of tags
   * @returns {Promise<number>} Number of keys deleted
   */
  async deleteByTags(tags) {
    try {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      const keys = new Set();

      // Get all keys for each tag
      for (const tag of tagArray) {
        const tagKeys = await redisClient.sMembers(`tag:${tag}`);
        tagKeys.forEach(key => keys.add(key));
      }

      if (keys.size === 0) {
        return 0;
      }

      // Delete keys
      const keyArray = Array.from(keys);
      const result = await redisClient.del(keyArray);

      // Clean up tag sets
      await Promise.all(
        tagArray.map(tag => redisClient.del(`tag:${tag}`))
      );

      this.statistics.deletes += result;
      logger.info(`Cache tag delete: ${tagArray.join(', ')} (${result} keys)`);

      return result;
    } catch (error) {
      this.statistics.errors++;
      logger.error(`Cache tag delete error:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Existence status
   */
  async exists(key) {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      this.statistics.errors++;
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set TTL for existing key
   * @param {string} key - Cache key
   * @param {number} ttl - TTL in seconds
   * @returns {Promise<boolean>} Success status
   */
  async expire(key, ttl) {
    try {
      const result = await redisClient.expire(key, ttl);
      return result === 1;
    } catch (error) {
      this.statistics.errors++;
      logger.error(`Cache expire error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get TTL for a key
   * @param {string} key - Cache key
   * @returns {Promise<number>} TTL in seconds (-1 if no expiry, -2 if key doesn't exist)
   */
  async getTTL(key) {
    try {
      return await redisClient.ttl(key);
    } catch (error) {
      this.statistics.errors++;
      logger.error(`Cache TTL error for key ${key}:`, error);
      return -2;
    }
  }

  /**
   * Increment a counter
   * @param {string} key - Counter key
   * @param {number} value - Increment value (default: 1)
   * @param {number} ttl - TTL for new keys
   * @returns {Promise<number>} New value
   */
  async increment(key, value = 1, ttl = this.defaultTTL) {
    try {
      const newValue = await redisClient.incrBy(key, value);

      // Set TTL if it's a new key
      if (newValue === value) {
        await redisClient.expire(key, ttl);
      }

      return newValue;
    } catch (error) {
      this.statistics.errors++;
      logger.error(`Cache increment error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Decrement a counter
   * @param {string} key - Counter key
   * @param {number} value - Decrement value (default: 1)
   * @returns {Promise<number>} New value
   */
  async decrement(key, value = 1) {
    try {
      return await redisClient.decrBy(key, value);
    } catch (error) {
      this.statistics.errors++;
      logger.error(`Cache decrement error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Get multiple keys at once
   * @param {string[]} keys - Array of cache keys
   * @param {Object} options - Options for decompression
   * @returns {Promise<Object>} Key-value pairs
   */
  async getMultiple(keys, options = {}) {
    try {
      const startTime = Date.now();
      const values = await redisClient.mGet(keys);
      const result = {};

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const rawValue = values[i];

        if (rawValue) {
          try {
            const metadata = JSON.parse(rawValue);

            if (metadata.compressed && options.decompress !== false) {
              const decompressed = await gunzip(Buffer.from(metadata.data, 'base64'));
              result[key] = JSON.parse(decompressed.toString());
            } else {
              result[key] = metadata.data;
            }

            this.statistics.hits++;
          } catch (parseError) {
            logger.error(`Parse error for key ${key}:`, parseError);
            this.statistics.errors++;
          }
        } else {
          this.statistics.misses++;
        }
      }

      const duration = Date.now() - startTime;
      logger.debug(`Cache multi-get: ${keys.length} keys (${duration}ms)`);

      return result;
    } catch (error) {
      this.statistics.errors++;
      logger.error('Cache multi-get error:', error);
      return {};
    }
  }

  /**
   * Set multiple key-value pairs
   * @param {Object} data - Key-value pairs to set
   * @param {number} ttl - TTL for all keys
   * @param {Object} options - Options for compression
   * @returns {Promise<boolean>} Success status
   */
  async setMultiple(data, ttl = this.defaultTTL, options = {}) {
    try {
      const pipeline = redisClient.multi();
      const keys = Object.keys(data);

      for (const key of keys) {
        const value = data[key];
        const serialized = JSON.stringify(value);
        const dataSize = Buffer.byteLength(serialized);

        let finalData = value;
        let compressed = false;

        // Compress if needed
        if (options.compress !== false && dataSize > this.compressionThreshold) {
          const compressedBuffer = await gzip(serialized);
          finalData = compressedBuffer.toString('base64');
          compressed = true;
        }

        const metadata = {
          data: finalData,
          compressed,
          createdAt: new Date().toISOString(),
          size: dataSize,
          tags: options.tags || [],
        };

        pipeline.setEx(key, ttl, JSON.stringify(metadata));
      }

      await pipeline.exec();
      this.statistics.sets += keys.length;

      logger.debug(`Cache multi-set: ${keys.length} keys`);

      return true;
    } catch (error) {
      this.statistics.errors++;
      logger.error('Cache multi-set error:', error);
      return false;
    }
  }

  /**
   * Flush all cache data
   * @param {string} pattern - Optional pattern to flush (default: all)
   * @returns {Promise<boolean>} Success status
   */
  async flush(pattern = '*') {
    try {
      if (pattern === '*') {
        await redisClient.flushDb();
        logger.info('Cache completely flushed');
      } else {
        const deletedCount = await this.deletePattern(pattern);
        logger.info(`Cache pattern flushed: ${pattern} (${deletedCount} keys)`);
      }

      return true;
    } catch (error) {
      this.statistics.errors++;
      logger.error('Cache flush error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStatistics() {
    const total = this.statistics.hits + this.statistics.misses;
    const hitRate = total > 0 ? (this.statistics.hits / total * 100).toFixed(2) : 0;

    return {
      ...this.statistics,
      hitRate: `${hitRate}%`,
      total,
    };
  }

  /**
   * Reset statistics
   */
  resetStatistics() {
    this.statistics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    };
  }

  /**
   * Get cache info
   * @returns {Promise<Object>} Cache information
   */
  async getInfo() {
    try {
      const info = await redisClient.info('memory');
      const keyspace = await redisClient.info('keyspace');
      const stats = this.getStatistics();

      return {
        statistics: stats,
        memory: this.parseRedisInfo(info),
        keyspace: this.parseRedisInfo(keyspace),
        connected: redisClient.isOpen,
        config: {
          defaultTTL: this.defaultTTL,
          compressionThreshold: this.compressionThreshold,
        },
      };
    } catch (error) {
      logger.error('Cache info error:', error);
      return {
        statistics: this.getStatistics(),
        error: error.message,
        connected: false,
      };
    }
  }

  /**
   * Health check for cache
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const startTime = Date.now();

      // Test basic operations
      const testKey = 'health:check';
      const testValue = { timestamp: Date.now() };

      await this.set(testKey, testValue, 10);
      const retrieved = await this.get(testKey);
      await this.delete(testKey);

      const duration = Date.now() - startTime;

      const isHealthy = retrieved && retrieved.timestamp === testValue.timestamp;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        responseTime: duration,
        connected: redisClient.isOpen,
        statistics: this.getStatistics(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Cache health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        connected: false,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Set tags for a cache key
   * @private
   */
  async setTags(key, tags, ttl) {
    try {
      const pipeline = redisClient.multi();

      for (const tag of tags) {
        pipeline.sAdd(`tag:${tag}`, key);
        pipeline.expire(`tag:${tag}`, ttl + 300); // Tag lives longer than data
      }

      await pipeline.exec();
    } catch (error) {
      logger.error(`Error setting tags for key ${key}:`, error);
    }
  }

  /**
   * Clean up tags for a deleted key
   * @private
   */
  async cleanupTags(key) {
    try {
      // This is a simplified cleanup - in production, you might want to track
      // which tags a key belongs to for more efficient cleanup
      const tagKeys = await redisClient.keys('tag:*');

      if (tagKeys.length > 0) {
        const pipeline = redisClient.multi();

        for (const tagKey of tagKeys) {
          pipeline.sRem(tagKey, key);
        }

        await pipeline.exec();
      }
    } catch (error) {
      logger.error(`Error cleaning up tags for key ${key}:`, error);
    }
  }

  /**
   * Parse Redis info string
   * @private
   */
  parseRedisInfo(infoString) {
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
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;