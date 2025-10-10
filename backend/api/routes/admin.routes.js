/**
 * Admin Routes
 * Super Admin only endpoints for user management
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate, requireSuperAdmin } = require('../../middleware/auth.middleware');
const { asyncHandler, ApiError } = require('../../middleware/error.middleware');
const { sequelize } = require('../../config/database.config');
const { QueryTypes } = require('sequelize');
const twoFactorService = require('../../services/TwoFactorService');
const trustedDeviceService = require('../../services/TrustedDeviceService');
const logger = require('../../utils/logger.util');

/**
 * POST /api/v1/admin/users
 * Create a new user (Super Admin only)
 */
router.post(
  '/users',
  authenticate,
  requireSuperAdmin,
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be 3-50 characters')
      .isAlphanumeric()
      .withMessage('Username must be alphanumeric'),
    body('email')
      .trim()
      .isEmail()
      .withMessage('Invalid email address')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('full_name')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Full name must be less than 255 characters'),
    body('role')
      .isIn(['super_admin', 'admin', 'moderator', 'customer_service', 'sales', 'marketing', 'technic', 'general_user'])
      .withMessage('Invalid role')
  ],
  asyncHandler(async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const validationErrors = errors.array();
      logger.error('User creation validation failed:', validationErrors);
      throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', validationErrors);
    }

    const { username, email, password, full_name, role } = req.body;

    // Check if username already exists
    const usernameCheck = await sequelize.query(
      'SELECT id FROM users WHERE username = $1',
      { bind: [username], type: QueryTypes.SELECT }
    );

    if (usernameCheck.length > 0) {
      throw new ApiError(409, 'Username already exists');
    }

    // Check if email already exists
    const emailCheck = await sequelize.query(
      'SELECT id FROM users WHERE email = $1',
      { bind: [email], type: QueryTypes.SELECT }
    );

    if (emailCheck.length > 0) {
      throw new ApiError(409, 'Email already exists');
    }

    // Create user with requires_2fa_setup flag using Sequelize model
    // The User model will automatically hash the password and encrypt sensitive fields
    const { User } = require('../../models');

    const user = await User.create({
      username,
      email,
      password_hash: password, // Will be hashed by beforeCreate hook
      full_name, // Will be encrypted by beforeCreate hook
      role,
      requires_2fa_setup: true,
      is_active: true
    });

    logger.info(`User ${username} created by ${req.user.username} (requires 2FA setup)`);

    // Clear user list cache to reflect the new user
    const cacheService = require('../../services/CacheService');
    await cacheService.deleteByTags(['user', 'list']);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        requires_2fa_setup: user.requires_2fa_setup,
        is_active: user.is_active,
        createdAt: user.createdAt
      }
    });
  })
);

/**
 * GET /api/v1/admin/users/2fa-status
 * Get 2FA status for all users (Super Admin only)
 */
router.get(
  '/users/2fa-status',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const query = `
      SELECT
        id,
        username,
        email,
        role,
        is_active,
        "twoFactorEnabled",
        "twoFactorEnabledAt",
        requires_2fa_setup
      FROM users
      WHERE is_active = true
      ORDER BY username ASC
    `;

    const users = await sequelize.query(query, {
      type: QueryTypes.SELECT
    });

    res.status(200).json({
      success: true,
      data: {
        users: users.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.username, // ใช้ username แทนเนื่องจากไม่มี fullname column
          role: user.role,
          is_active: user.is_active,
          twoFactorEnabled: user.twoFactorEnabled || false,
          twoFactorEnabledAt: user.twoFactorEnabledAt,
          requires_2fa_setup: user.requires_2fa_setup || false
        }))
      }
    });
  })
);

/**
 * POST /api/v1/admin/users/:userId/force-2fa
 * Force user to setup 2FA on next login (Super Admin only)
 * Sets requires_2fa_setup flag without enabling 2FA immediately
 */
router.post(
  '/users/:userId/force-2fa',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Check if user exists
    const userQuery = `
      SELECT id, username, "twoFactorEnabled"
      FROM users
      WHERE id = $1
    `;

    const users = await sequelize.query(userQuery, {
      bind: [userId],
      type: QueryTypes.SELECT
    });

    if (users.length === 0) {
      throw new ApiError(404, 'User not found');
    }

    const user = users[0];

    // Force 2FA setup on next login (toggle ON behavior)
    // Clear any existing 2FA config and set requires_2fa_setup flag
    const updateQuery = `
      UPDATE users
      SET "twoFactorEnabled" = false,
          "twoFactorSecret" = NULL,
          "twoFactorBackupCodes" = NULL,
          "twoFactorEnabledAt" = NULL,
          requires_2fa_setup = true
      WHERE id = $1
    `;

    await sequelize.query(updateQuery, {
      bind: [userId],
      type: QueryTypes.UPDATE
    });

    logger.info(`2FA setup required for user ${user.username} by ${req.user.username}`);

    res.status(200).json({
      success: true,
      message: '2FA setup required for user on next login',
      data: {
        userId,
        username: user.username
      }
    });
  })
);

/**
 * POST /api/v1/admin/users/:userId/reset-2fa
 * Reset 2FA for a user (Super Admin only)
 * - Removes 2FA secret and backup codes
 * - Revokes all trusted devices
 */
router.post(
  '/users/:userId/reset-2fa',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Check if user exists
    const userQuery = `
      SELECT id, username, "twoFactorEnabled"
      FROM users
      WHERE id = $1
    `;

    const users = await sequelize.query(userQuery, {
      bind: [userId],
      type: QueryTypes.SELECT
    });

    if (users.length === 0) {
      throw new ApiError(404, 'User not found');
    }

    const user = users[0];

    // Completely disable 2FA (toggle OFF behavior)
    // User can login with password only, no 2FA required
    const updateQuery = `
      UPDATE users
      SET "twoFactorEnabled" = false,
          "twoFactorSecret" = NULL,
          "twoFactorBackupCodes" = NULL,
          "twoFactorEnabledAt" = NULL,
          requires_2fa_setup = false
      WHERE id = $1
    `;

    await sequelize.query(updateQuery, {
      bind: [userId],
      type: QueryTypes.UPDATE
    });

    // Revoke all trusted devices
    try {
      await trustedDeviceService.revokeAllDevices(userId);
    } catch (error) {
      logger.error(`Error revoking trusted devices for user ${userId}:`, error);
    }

    logger.info(`2FA reset for user ${user.username} by ${req.user.username}`);

    res.status(200).json({
      success: true,
      message: '2FA reset successfully',
      data: {
        userId,
        username: user.username
      }
    });
  })
);

/**
 * DELETE /api/v1/admin/users/:userId
 * Delete a user (Super Admin only)
 * - Soft delete by setting is_active to false
 * - Revokes all trusted devices
 * - Cannot delete yourself
 */
router.delete(
  '/users/:userId',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Cannot delete yourself
    if (userId === req.user.id) {
      throw new ApiError(400, 'Cannot delete your own account');
    }

    // Check if user exists
    const { User } = require('../../models');
    const user = await User.findByPk(userId);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Check if user is already deleted (soft delete)
    if (!user.is_active) {
      // User already soft-deleted, just return success
      logger.info(`User ${user.username} already deleted (attempted by ${req.user.username})`);

      // Clear cache anyway to ensure frontend updates
      const cacheService = require('../../services/CacheService');
      await cacheService.deleteByTags(['user', 'list']);

      return res.status(200).json({
        success: true,
        message: 'User deleted successfully',
        data: {
          userId,
          username: user.username
        }
      });
    }

    // Soft delete - set is_active to false
    user.is_active = false;
    await user.save();

    // Revoke all trusted devices
    try {
      await trustedDeviceService.revokeAllDevices(userId);
    } catch (error) {
      logger.error(`Error revoking trusted devices for user ${userId}:`, error);
    }

    // Log audit action (using 'delete' action)
    const { AuditLog } = require('../../models');
    await AuditLog.logAction({
      userId: req.user.id,
      action: 'delete',
      entityType: 'user',
      entityId: userId,
      ipAddress: req.metadata?.ipAddress,
      userAgent: req.metadata?.userAgent,
      details: {
        action: 'soft_delete',
        deletedUser: user.username,
        deletedBy: req.user.username,
        is_active: false
      }
    });

    logger.info(`User ${user.username} deleted by ${req.user.username}`);

    // Clear user list cache to reflect the deletion
    const cacheService = require('../../services/CacheService');
    await cacheService.deleteByTags(['user', 'list']);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: {
        userId,
        username: user.username
      }
    });
  })
);

module.exports = router;
