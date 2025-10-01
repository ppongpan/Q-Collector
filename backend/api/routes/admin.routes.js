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
        "twoFactorEnabled",
        "twoFactorEnabledAt"
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
          twoFactorEnabled: user.twoFactorEnabled || false,
          twoFactorEnabledAt: user.twoFactorEnabledAt
        }))
      }
    });
  })
);

/**
 * POST /api/v1/admin/users/:userId/force-2fa
 * Force enable 2FA for a user (Super Admin only)
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

    if (user.twoFactorEnabled) {
      throw new ApiError(400, '2FA is already enabled for this user');
    }

    // Force enable 2FA (user will be prompted to set it up on next login)
    const updateQuery = `
      UPDATE users
      SET "twoFactorEnabled" = true,
          "twoFactorEnabledAt" = NOW(),
          updated_at = NOW()
      WHERE id = $1
    `;

    await sequelize.query(updateQuery, {
      bind: [userId],
      type: QueryTypes.UPDATE
    });

    logger.info(`2FA force-enabled for user ${user.username} by ${req.user.username}`);

    res.status(200).json({
      success: true,
      message: '2FA force-enabled successfully',
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

    if (!user.twoFactorEnabled) {
      throw new ApiError(400, '2FA is not enabled for this user');
    }

    // Reset 2FA
    const updateQuery = `
      UPDATE users
      SET "twoFactorEnabled" = false,
          "twoFactorSecret" = NULL,
          "twoFactorBackupCodes" = NULL,
          "twoFactorEnabledAt" = NULL,
          updated_at = NOW()
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

module.exports = router;
