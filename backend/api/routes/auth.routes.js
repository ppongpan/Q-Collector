/**
 * Authentication Routes
 * Endpoints for user registration, login, token refresh, and profile management
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const AuthService = require('../../services/AuthService');
const {
  authenticate,
  authRateLimit,
  attachMetadata,
} = require('../../middleware/auth.middleware');
const { asyncHandler, ApiError } = require('../../middleware/error.middleware');
const logger = require('../../utils/logger.util');

const router = express.Router();

/**
 * Validation middleware helper
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', errors.array());
  }
  next();
}

/**
 * POST /api/v1/auth/register
 * Register a new user
 */
router.post(
  '/register',
  attachMetadata,
  authRateLimit(5, 60 * 60 * 1000), // 5 attempts per hour
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be 3-50 characters')
      .isAlphanumeric()
      .withMessage('Username must contain only letters and numbers'),
    body('email')
      .trim()
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and number'),
    body('full_name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Full name must be 1-255 characters'),
    body('phone')
      .optional()
      .trim()
      .matches(/^[0-9+\-\s()]+$/)
      .withMessage('Invalid phone number format'),
    body('role')
      .optional()
      .isIn(['user', 'manager'])
      .withMessage('Invalid role (only user/manager allowed for registration)'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { username, email, password, full_name, phone, role } = req.body;

    const result = await AuthService.register(
      { username, email, password, full_name, phone, role: role || 'user' },
      req.metadata
    );

    logger.info(`User registered successfully: ${username}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: result.user,
        tokens: result.tokens,
      },
    });
  })
);

/**
 * POST /api/v1/auth/login
 * User login
 */
router.post(
  '/login',
  attachMetadata,
  authRateLimit(10, 15 * 60 * 1000), // 10 attempts per 15 minutes
  [
    body('identifier')
      .trim()
      .notEmpty()
      .withMessage('Email or username is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { identifier, password } = req.body;

    const result = await AuthService.login(identifier, password, req.metadata);

    logger.info(`User logged in successfully: ${result.user.username}`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        tokens: result.tokens,
      },
    });
  })
);

/**
 * POST /api/v1/auth/refresh
 * Refresh access token
 */
router.post(
  '/refresh',
  attachMetadata,
  [
    body('refreshToken')
      .notEmpty()
      .withMessage('Refresh token is required'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    const tokens = await AuthService.refreshToken(refreshToken, req.metadata);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: { tokens },
    });
  })
);

/**
 * POST /api/v1/auth/logout
 * User logout
 */
router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    // Session ID is stored in the tokens object when login
    // We'll use the token to find and revoke the session
    const token = req.token;

    // Find session by token and revoke it
    const { Session } = require('../../models');
    const session = await Session.findByToken(token);

    if (session) {
      await AuthService.logout(session.id, req.userId);
    }

    logger.info(`User logged out: ${req.user.username}`);

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  })
);

/**
 * GET /api/v1/auth/me
 * Get current user profile
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await AuthService.getCurrentUser(req.userId);

    res.status(200).json({
      success: true,
      data: { user },
    });
  })
);

/**
 * PUT /api/v1/auth/profile
 * Update user profile
 */
router.put(
  '/profile',
  authenticate,
  [
    body('full_name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Full name must be 1-255 characters'),
    body('phone')
      .optional()
      .trim()
      .matches(/^[0-9+\-\s()]+$/)
      .withMessage('Invalid phone number format'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { full_name, phone } = req.body;

    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (phone !== undefined) updates.phone = phone;

    const user = await AuthService.updateProfile(req.userId, updates);

    logger.info(`Profile updated: ${req.user.username}`);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user },
    });
  })
);

/**
 * PUT /api/v1/auth/password
 * Change password
 */
router.put(
  '/password',
  authenticate,
  [
    body('oldPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and number'),
    body('confirmPassword')
      .notEmpty()
      .withMessage('Password confirmation is required')
      .custom((value, { req }) => value === req.body.newPassword)
      .withMessage('Passwords do not match'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    await AuthService.changePassword(req.userId, oldPassword, newPassword);

    logger.info(`Password changed: ${req.user.username}`);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please login again with new password.',
    });
  })
);

/**
 * GET /api/v1/auth/sessions
 * Get all active sessions for current user
 */
router.get(
  '/sessions',
  authenticate,
  asyncHandler(async (req, res) => {
    const sessions = await AuthService.getUserSessions(req.userId);

    res.status(200).json({
      success: true,
      data: { sessions },
    });
  })
);

/**
 * DELETE /api/v1/auth/sessions
 * Revoke all sessions for current user
 */
router.delete(
  '/sessions',
  authenticate,
  asyncHandler(async (req, res) => {
    const count = await AuthService.revokeAllSessions(req.userId);

    logger.info(`All sessions revoked for user: ${req.user.username}`);

    res.status(200).json({
      success: true,
      message: `${count} session(s) revoked successfully`,
      data: { count },
    });
  })
);

/**
 * GET /api/v1/auth/verify
 * Verify if current token is valid
 */
router.get(
  '/verify',
  authenticate,
  asyncHandler(async (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: {
        userId: req.userId,
        username: req.user.username,
        role: req.userRole,
      },
    });
  })
);

module.exports = router;