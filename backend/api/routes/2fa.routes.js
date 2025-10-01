/**
 * Two-Factor Authentication (2FA) Routes
 *
 * Endpoints for managing 2FA setup, verification, and administration
 *
 * All routes require authentication via JWT token
 * Rate limiting applied to prevent brute force attacks
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const twoFactorService = require('../../services/TwoFactorService');
const { authenticate } = require('../../middleware/auth.middleware');
const logger = require('../../utils/logger.util');

// Rate limiters for different endpoints
// TEMPORARY: Increased limits for testing - restore to production values before deploy
const setupLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute (was 1 hour)
  max: 1000, // (was 3)
  message: 'Too many 2FA setup attempts, please try again later'
});

const verifyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute (was 15 minutes)
  max: 1000, // (was 5)
  message: 'Too many verification attempts, please try again later'
});

const disableLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute (was 1 hour)
  max: 1000, // (was 3)
  message: 'Too many disable attempts, please try again later'
});

// Validation middleware
const validateToken = [
  body('token')
    .notEmpty()
    .withMessage('Token is required')
    .isLength({ min: 6, max: 8 })
    .withMessage('Token must be 6-8 characters')
];

/**
 * POST /api/v1/2fa/setup
 * Initialize 2FA setup - generates QR code and backup codes
 *
 * @access Private (requires authentication)
 * @returns {Object} QR code, manual entry key, and backup codes
 */
router.post('/setup',
  authenticate,
  setupLimiter,
  async (req, res, next) => {
    try {
      const { User } = require('../../models');

      // Get fresh user data from database
      const user = await User.findByPk(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if 2FA is already enabled (from database, not JWT)
      if (user.twoFactorEnabled) {
        return res.status(400).json({
          success: false,
          message: '2FA is already enabled for this account'
        });
      }

      // Generate secret and QR code
      const setupData = await twoFactorService.generateSecret(user);

      logger.info(`2FA setup initiated for user ${user.username}`, {
        userId: user.id
      });

      res.status(200).json({
        success: true,
        message: '2FA setup initiated successfully',
        data: {
          qrCode: setupData.qrCode,
          manualEntryKey: setupData.manualEntryKey,
          backupCodes: setupData.backupCodes
        }
      });
    } catch (error) {
      logger.error('2FA setup error:', error);
      next(error);
    }
  }
);

/**
 * POST /api/v1/2fa/enable
 * Enable 2FA with verification token
 *
 * @access Private (requires authentication)
 * @body {string} token - 6-digit TOTP token from authenticator app
 * @returns {Object} Success status
 */
router.post('/enable',
  authenticate,
  setupLimiter,
  validateToken,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { token } = req.body;
      const userId = req.user.id;

      // Enable 2FA
      await twoFactorService.enableTwoFactor(userId, token);

      logger.info(`2FA enabled successfully for user ${req.user.username}`, {
        userId: userId
      });

      res.status(200).json({
        success: true,
        message: '2FA enabled successfully'
      });
    } catch (error) {
      logger.error('2FA enable error:', error);

      if (error.statusCode === 400) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      next(error);
    }
  }
);

/**
 * POST /api/v1/2fa/disable
 * Disable 2FA (requires verification)
 *
 * @access Private (requires authentication)
 * @body {string} token - 6-digit TOTP token or backup code
 * @returns {Object} Success status
 */
router.post('/disable',
  authenticate,
  disableLimiter,
  validateToken,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { token } = req.body;
      const userId = req.user.id;

      // Disable 2FA
      await twoFactorService.disableTwoFactor(userId, token);

      logger.info(`2FA disabled for user ${req.user.username}`, {
        userId: userId
      });

      res.status(200).json({
        success: true,
        message: '2FA disabled successfully'
      });
    } catch (error) {
      logger.error('2FA disable error:', error);

      if (error.statusCode === 400 || error.statusCode === 404) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }

      next(error);
    }
  }
);

/**
 * POST /api/v1/2fa/verify
 * Verify 2FA token during login
 *
 * Note: This endpoint is deprecated in favor of /api/v1/auth/login/2fa
 * Kept for backward compatibility
 *
 * @access Public (uses tempToken for authentication)
 * @body {string} tempToken - Temporary token from initial login
 * @body {string} token - 6-digit TOTP token or backup code
 * @returns {Object} Full access token
 */
router.post('/verify',
  verifyLimiter,
  [
    body('tempToken').notEmpty().withMessage('Temporary token is required'),
    ...validateToken
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      // Redirect to auth login/2fa endpoint
      res.status(301).json({
        success: false,
        message: 'Please use /api/v1/auth/login/2fa instead',
        redirectTo: '/api/v1/auth/login/2fa'
      });
    } catch (error) {
      logger.error('2FA verify error:', error);
      next(error);
    }
  }
);

/**
 * GET /api/v1/2fa/status
 * Get 2FA status for current user
 *
 * @access Private (requires authentication)
 * @returns {Object} 2FA enabled status and backup codes info
 */
router.get('/status',
  authenticate,
  async (req, res, next) => {
    try {
      const userId = req.user.id;

      // Get 2FA status
      const status = await twoFactorService.getTwoFactorStatus(userId);

      res.status(200).json({
        success: true,
        data: status
      });
    } catch (error) {
      logger.error('2FA status error:', error);
      next(error);
    }
  }
);

/**
 * POST /api/v1/2fa/backup-codes
 * Regenerate backup codes (requires verification)
 *
 * @access Private (requires authentication)
 * @body {string} token - 6-digit TOTP token
 * @returns {Object} New backup codes
 */
router.post('/backup-codes',
  authenticate,
  setupLimiter,
  validateToken,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { token } = req.body;
      const userId = req.user.id;

      // Regenerate backup codes
      const newBackupCodes = await twoFactorService.regenerateBackupCodes(userId, token);

      logger.info(`Backup codes regenerated for user ${req.user.username}`, {
        userId: userId
      });

      res.status(200).json({
        success: true,
        message: 'Backup codes regenerated successfully',
        data: {
          backupCodes: newBackupCodes
        }
      });
    } catch (error) {
      logger.error('Backup codes regeneration error:', error);

      if (error.statusCode === 400) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      next(error);
    }
  }
);

module.exports = router;
