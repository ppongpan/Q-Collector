/**
 * User Management Service
 * Handles user CRUD operations for Super Admin with Redis caching
 */

const { Op } = require('sequelize');
const { User, AuditLog } = require('../models');
const logger = require('../utils/logger.util');
const { ApiError } = require('../middleware/error.middleware');
const bcrypt = require('bcryptjs');
const cacheService = require('./CacheService');
const { KEYS, POLICIES, INVALIDATION_PATTERNS } = require('../config/cache.config');

class UserService {
  /**
   * List all users with pagination and filtering with caching
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Users list with pagination
   */
  static async listUsers(options = {}) {
    try {
      const { page = 1, limit = 50, search, role } = options;
      const offset = (page - 1) * limit;

      // Create cache key based on options
      const cacheKey = KEYS.DB_QUERY('users', {
        page,
        limit,
        search,
        role,
      });

      // Try to get from cache first
      let result = await cacheService.get(cacheKey);

      if (!result) {
        // Cache miss - query database
        const where = {};

        // Search filter (username, email, or full_name)
        if (search) {
          where[Op.or] = [
            { username: { [Op.iLike]: `%${search}%` } },
            { email: { [Op.iLike]: `%${search}%` } },
            { full_name: { [Op.iLike]: `%${search}%` } },
          ];
        }

        // Role filter
        if (role) {
          where.role = role;
        }

        // Query users
        const { rows: users, count: total } = await User.findAndCountAll({
          where,
          limit,
          offset,
          order: [['createdAt', 'DESC']],
          attributes: {
            exclude: ['password_hash'], // Never expose password hash
          },
        });

        result = {
          users: users.map((user) => user.toJSON()),
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        };

        // Cache the result
        await cacheService.set(
          cacheKey,
          result,
          POLICIES.dbQuery.ttl,
          {
            tags: ['user', 'list'],
            compress: POLICIES.dbQuery.compress,
          }
        );
      }

      return result;
    } catch (error) {
      logger.error('Failed to list users:', error);
      throw error;
    }
  }

  /**
   * Get user by ID with caching
   * @param {string} userId - User UUID
   * @returns {Promise<Object>} User object
   */
  static async getUserById(userId) {
    try {
      // Try to get from cache first
      const cacheKey = KEYS.USER(userId);
      let userData = await cacheService.get(cacheKey);

      if (!userData) {
        // Cache miss - query database
        const user = await User.findByPk(userId, {
          attributes: {
            exclude: ['password_hash'],
          },
        });

        if (!user) {
          return null;
        }

        userData = user.toJSON();

        // Cache the user data
        await cacheService.set(
          cacheKey,
          userData,
          POLICIES.userData.ttl,
          {
            tags: POLICIES.userData.tags,
            compress: POLICIES.userData.compress,
          }
        );
      }

      return userData;
    } catch (error) {
      logger.error(`Failed to get user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update user information with cache invalidation
   * @param {string} userId - User UUID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated user object
   */
  static async updateUser(userId, updates) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
      }

      // Check for duplicate username/email if changing
      if (updates.username || updates.email) {
        const duplicateWhere = {
          id: { [Op.ne]: userId },
          [Op.or]: [],
        };

        if (updates.username) {
          duplicateWhere[Op.or].push({ username: updates.username });
        }
        if (updates.email) {
          duplicateWhere[Op.or].push({ email: updates.email });
        }

        const duplicate = await User.findOne({ where: duplicateWhere });
        if (duplicate) {
          if (duplicate.username === updates.username) {
            throw new ApiError(409, 'Username already taken', 'DUPLICATE_USERNAME');
          }
          if (duplicate.email === updates.email) {
            throw new ApiError(409, 'Email already registered', 'DUPLICATE_EMAIL');
          }
        }
      }

      // Update user fields
      const allowedUpdates = ['username', 'email', 'full_name', 'role', 'is_active', 'special_forms'];
      const oldValues = {};

      for (const field of allowedUpdates) {
        if (updates[field] !== undefined) {
          oldValues[field] = user[field];
          user[field] = updates[field];
        }
      }

      await user.save();

      // Invalidate user-related cache
      await this.invalidateUserCache(userId);

      // Create audit log
      await AuditLog.logAction({
        userId,
        action: 'update',
        entityType: 'user',
        entityId: userId,
        details: {
          oldValues,
          newValues: updates,
        },
      });

      logger.info(`User ${userId} updated`, { updates });

      return user.toJSON();
    } catch (error) {
      logger.error(`Failed to update user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Reset user password (Super Admin override) with cache invalidation
   * @param {string} userId - User UUID
   * @param {string} newPassword - New password (plain text)
   * @returns {Promise<void>}
   */
  static async resetPassword(userId, newPassword) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      user.password_hash = hashedPassword;
      await user.save();

      // Invalidate user-related cache
      await this.invalidateUserCache(userId);

      // Also invalidate auth cache (sessions, permissions)
      await this.invalidateAuthCache(userId);

      // Create audit log
      await AuditLog.logAction({
        userId,
        action: 'reset_password',
        entityType: 'user',
        entityId: userId,
        details: {
          message: 'Password reset by Super Admin',
        },
      });

      logger.info(`Password reset for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to reset password for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete user (optional - not implemented in frontend yet) with cache invalidation
   * @param {string} userId - User UUID
   * @returns {Promise<void>}
   */
  static async deleteUser(userId) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
      }

      // Create audit log before deletion
      await AuditLog.logAction({
        userId,
        action: 'delete',
        entityType: 'user',
        entityId: userId,
        details: {
          username: user.username,
          email: user.email,
        },
      });

      await user.destroy();

      // Invalidate all user-related cache
      await this.invalidateUserCache(userId);
      await this.invalidateAuthCache(userId);

      // Invalidate user list cache
      await cacheService.deleteByTags(['user', 'list']);

      logger.info(`User ${userId} deleted`);
    } catch (error) {
      logger.error(`Failed to delete user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate user-related cache
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  static async invalidateUserCache(userId) {
    try {
      const patterns = INVALIDATION_PATTERNS.userUpdate(userId);

      for (const pattern of patterns) {
        if (pattern.includes('*')) {
          await cacheService.deletePattern(pattern);
        } else {
          await cacheService.delete(pattern);
        }
      }

      // Also invalidate user list cache
      await cacheService.deleteByTags(['user', 'list']);

      logger.debug(`Invalidated user cache for user: ${userId}`);
    } catch (error) {
      logger.error(`Failed to invalidate user cache for ${userId}:`, error);
    }
  }

  /**
   * Invalidate authentication-related cache
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  static async invalidateAuthCache(userId) {
    try {
      const patterns = INVALIDATION_PATTERNS.authChange(userId);

      for (const pattern of patterns) {
        if (pattern.includes('*')) {
          await cacheService.deletePattern(pattern);
        } else {
          await cacheService.delete(pattern);
        }
      }

      logger.debug(`Invalidated auth cache for user: ${userId}`);
    } catch (error) {
      logger.error(`Failed to invalidate auth cache for ${userId}:`, error);
    }
  }

  /**
   * Warm up user cache with frequently accessed users
   * @param {number} limit - Number of users to warm up
   * @returns {Promise<void>}
   */
  static async warmupUserCache(limit = 50) {
    try {
      // Get most recently active users
      const users = await User.findAll({
        limit,
        order: [['last_login_at', 'DESC']],
        attributes: {
          exclude: ['password_hash'],
        },
      });

      // Cache each user
      const promises = users.map(async (user) => {
        const userData = user.toJSON();
        const cacheKey = KEYS.USER(user.id);

        await cacheService.set(
          cacheKey,
          userData,
          POLICIES.userData.ttl,
          {
            tags: POLICIES.userData.tags,
            compress: POLICIES.userData.compress,
          }
        );
      });

      await Promise.all(promises);

      logger.info(`Warmed up cache for ${users.length} users`);
    } catch (error) {
      logger.error('Failed to warm up user cache:', error);
    }
  }

  /**
   * Get user statistics with caching
   * @returns {Promise<Object>} User statistics
   */
  static async getUserStatistics() {
    try {
      const cacheKey = 'stats:users';
      let stats = await cacheService.get(cacheKey);

      if (!stats) {
        // Calculate statistics
        const [total, active, byRole] = await Promise.all([
          User.count(),
          User.count({ where: { is_active: true } }),
          User.findAll({
            attributes: [
              'role',
              [User.sequelize.fn('COUNT', User.sequelize.col('id')), 'count'],
            ],
            group: ['role'],
            raw: true,
          }),
        ]);

        stats = {
          total,
          active,
          inactive: total - active,
          byRole: byRole.reduce((acc, item) => {
            acc[item.role] = parseInt(item.count);
            return acc;
          }, {}),
          lastUpdated: new Date().toISOString(),
        };

        // Cache for 10 minutes
        await cacheService.set(cacheKey, stats, 600, { tags: ['stats', 'user'] });
      }

      return stats;
    } catch (error) {
      logger.error('Failed to get user statistics:', error);
      throw error;
    }
  }

  /**
   * Search users with advanced caching
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Search results
   */
  static async searchUsers(query, options = {}) {
    try {
      const { limit = 20, includeInactive = false } = options;

      // Create cache key
      const cacheKey = KEYS.DB_QUERY('user_search', {
        query,
        limit,
        includeInactive,
      });

      let results = await cacheService.get(cacheKey);

      if (!results) {
        const where = {
          [Op.or]: [
            { username: { [Op.iLike]: `%${query}%` } },
            { email: { [Op.iLike]: `%${query}%` } },
            { full_name: { [Op.iLike]: `%${query}%` } },
          ],
        };

        if (!includeInactive) {
          where.is_active = true;
        }

        const users = await User.findAll({
          where,
          limit,
          order: [['full_name', 'ASC']],
          attributes: {
            exclude: ['password_hash'],
          },
        });

        results = users.map(user => user.toJSON());

        // Cache search results for 5 minutes
        await cacheService.set(cacheKey, results, 300, {
          tags: ['user', 'search'],
          compress: true,
        });
      }

      return results;
    } catch (error) {
      logger.error('Failed to search users:', error);
      throw error;
    }
  }
}

module.exports = UserService;