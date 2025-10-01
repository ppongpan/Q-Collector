/**
 * Authentication Routes
 * Endpoints for user registration, login, token refresh, and profile management
 *
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and session management
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const AuthService = require('../../services/AuthService');
const twoFactorService = require('../../services/TwoFactorService');
const trustedDeviceService = require('../../services/TrustedDeviceService');
const {
  authenticate,
  authRateLimit,
  attachMetadata,
} = require('../../middleware/auth.middleware');
const { asyncHandler, ApiError } = require('../../middleware/error.middleware');
const logger = require('../../utils/logger.util');
const cacheService = require('../../services/CacheService');

const router = express.Router();

/**
 * Validation middleware helper
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.error('Validation errors:', {
      url: req.url,
      body: req.body,
      errors: errors.array()
    });
    throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', errors.array());
  }
  next();
}

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account with email verification and role assignment
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *                 pattern: '^[a-zA-Z0-9_]+$'
 *                 description: Unique username (alphanumeric and underscore only)
 *                 example: "pongpanp"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Valid email address
 *                 example: "admin@example.com"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)'
 *                 description: Password with uppercase, lowercase, and number
 *                 example: "SecurePassword123"
 *               full_name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 description: User's full name
 *                 example: "Pongpan Peerawanichkul"
 *               phone:
 *                 type: string
 *                 pattern: '^[0-9+\-\s()]+$'
 *                 description: Phone number
 *                 example: "+66-81-234-5678"
 *               role:
 *                 type: string
 *                 enum: [customer_service, sales, marketing, technic, general_user]
 *                 description: User role (defaults to general_user)
 *                 example: "technic"
 *           example:
 *             username: "pongpanp"
 *             email: "admin@example.com"
 *             password: "SecurePassword123"
 *             full_name: "Pongpan Peerawanichkul"
 *             phone: "+66-81-234-5678"
 *             role: "technic"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User registered successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     tokens:
 *                       type: object
 *                       properties:
 *                         accessToken:
 *                           type: string
 *                           description: JWT access token
 *                         refreshToken:
 *                           type: string
 *                           description: JWT refresh token
 *                         expiresIn:
 *                           type: integer
 *                           description: Token expiration time in seconds
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: Username or email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "CONFLICT"
 *                 message: "Username or email already exists"
 *                 timestamp: "2025-09-30T12:00:00.000Z"
 *       429:
 *         description: Too many registration attempts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
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
      .isIn(['customer_service', 'sales', 'marketing', 'technic', 'general_user'])
      .withMessage('Invalid role (only customer_service, sales, marketing, technic, general_user allowed for registration)'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { username, email, password, full_name, phone, role } = req.body;

    const result = await AuthService.register(
      { username, email, password, full_name, phone, role: role || 'general_user' },
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
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user with username/email and password
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - password
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Username or email address
 *                 example: "pongpanp"
 *               password:
 *                 type: string
 *                 description: User password
 *                 example: "SecurePassword123"
 *           example:
 *             identifier: "pongpanp"
 *             password: "SecurePassword123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *             example:
 *               success: true
 *               message: "Login successful"
 *               data:
 *                 user:
 *                   id: "123e4567-e89b-12d3-a456-426614174000"
 *                   username: "pongpanp"
 *                   email: "admin@example.com"
 *                   firstName: "Pongpan"
 *                   lastName: "Peerawanichkul"
 *                   department: "Technic"
 *                   role: "Super Admin"
 *                   isActive: true
 *                 tokens:
 *                   accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                   refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                   expiresIn: 3600
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "INVALID_CREDENTIALS"
 *                 message: "Invalid username or password"
 *                 timestamp: "2025-09-30T12:00:00.000Z"
 *       429:
 *         description: Too many login attempts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/login',
  attachMetadata,
  authRateLimit(50, 15 * 60 * 1000), // 50 attempts per 15 minutes (relaxed for development)
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
    const { identifier, password, deviceFingerprint } = req.body;

    const { User } = require('../../models');

    // Find user first to check 2FA status
    const user = await User.findByIdentifier(identifier);

    if (!user) {
      throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new ApiError(403, 'Account is inactive', 'ACCOUNT_INACTIVE');
    }

    // Validate password
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Check if user has 2FA enabled
    if (user.twoFactorEnabled) {
      // Check if device is trusted (skip 2FA if trusted)
      if (deviceFingerprint) {
        const isTrusted = await trustedDeviceService.isDeviceTrusted(
          user.id,
          deviceFingerprint
        );

        if (isTrusted) {
          // Device is trusted - skip 2FA and login directly
          logger.info(`Trusted device login for user: ${user.username}`);
          const result = await AuthService.login(identifier, password, req.metadata);

          return res.status(200).json({
            success: true,
            message: 'Login successful (trusted device)',
            data: {
              user: result.user,
              tokens: result.tokens,
            },
          });
        }
      }
      // Generate temporary token (5 minutes expiry)
      const tempToken = jwt.sign(
        {
          userId: user.id,
          type: 'temp_2fa',
          username: user.username
        },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );

      // Cache temp token with user data
      await cacheService.set(
        `2fa:login:${tempToken}`,
        {
          userId: user.id,
          username: user.username,
          metadata: req.metadata
        },
        300 // 5 minutes
      );

      logger.info(`2FA required for user: ${user.username}`);

      return res.status(200).json({
        success: true,
        requires2FA: true,
        message: '2FA verification required',
        data: {
          tempToken,
          username: user.username
        }
      });
    }

    // No 2FA - proceed with normal login
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
 * POST /api/v1/auth/login/2fa
 * Complete 2FA login with verification code
 */
router.post(
  '/login/2fa',
  attachMetadata,
  authRateLimit(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  [
    body('tempToken')
      .notEmpty()
      .withMessage('Temporary token is required'),
    body('token')
      .notEmpty()
      .withMessage('2FA code is required'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { tempToken, token, trustDevice, deviceFingerprint, deviceInfo } = req.body;

    // Verify temp token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
      if (decoded.type !== 'temp_2fa') {
        throw new ApiError(401, 'Invalid temporary token');
      }
    } catch (error) {
      throw new ApiError(401, 'Temporary token expired or invalid');
    }

    // Get cached login data
    const loginData = await cacheService.get(`2fa:login:${tempToken}`);
    if (!loginData) {
      throw new ApiError(401, 'Login session expired. Please login again.');
    }

    // Get user
    const { User } = require('../../models');
    const user = await User.findByPk(decoded.userId);

    if (!user || !user.twoFactorEnabled) {
      throw new ApiError(400, '2FA is not enabled for this user');
    }

    // Verify 2FA token
    const verified = await twoFactorService.verifyToken(user, token);

    if (!verified) {
      throw new ApiError(401, 'Invalid 2FA code');
    }

    // Clear temp token from cache
    await cacheService.delete(`2fa:login:${tempToken}`);

    // Update last login time
    user.last_login_at = new Date();
    await user.save();

    // Trust device if requested
    if (trustDevice && deviceFingerprint) {
      await trustedDeviceService.trustDevice(user.id, deviceFingerprint, {
        deviceName: deviceInfo?.deviceName || 'Unknown Device',
        userAgent: deviceInfo?.userAgent || req.headers['user-agent'],
        ipAddress: loginData.metadata?.ipAddress || req.metadata?.ipAddress
      });
      logger.info(`Device trusted for user: ${user.username}`);
    }

    // Generate full access tokens
    const tokens = await AuthService.generateTokens(user, loginData.metadata || req.metadata);

    // Create audit log
    const { AuditLog } = require('../../models');
    await AuditLog.logAction({
      userId: user.id,
      action: 'login',
      entityType: 'session',
      ipAddress: loginData.metadata?.ipAddress || req.metadata?.ipAddress,
      userAgent: loginData.metadata?.userAgent || req.metadata?.userAgent,
    });

    logger.info(`User logged in successfully with 2FA: ${user.username}`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        tokens,
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

// ==========================================
// TWO-FACTOR AUTHENTICATION (2FA) ROUTES
// ==========================================

/**
 * GET /api/v1/2fa/status
 * Get 2FA status for current user
 */
router.get(
  '/2fa/status',
  authenticate,
  asyncHandler(async (req, res) => {
    const status = await twoFactorService.getStatus(req.userId);
    res.status(200).json({
      success: true,
      data: status,
    });
  })
);

/**
 * POST /api/v1/2fa/setup
 * Initialize 2FA setup - Get QR code and backup codes
 */
router.post(
  '/2fa/setup',
  authenticate,
  asyncHandler(async (req, res) => {
    const setupData = await twoFactorService.generateSetup(req.userId);
    res.status(200).json({
      success: true,
      message: 'สร้างข้อมูลการตั้งค่า 2FA สำเร็จ',
      data: setupData,
    });
  })
);

/**
 * POST /api/v1/2fa/enable
 * Enable 2FA with verification code
 */
router.post(
  '/2fa/enable',
  authenticate,
  authRateLimit,
  [
    body('token').notEmpty().withMessage('กรุณาใส่รหัสยืนยัน'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { token } = req.body;
    await twoFactorService.enable(req.userId, token);

    res.status(200).json({
      success: true,
      message: 'เปิดใช้งาน 2FA สำเร็จ',
    });
  })
);

/**
 * POST /api/v1/2fa/disable
 * Disable 2FA with verification code
 */
router.post(
  '/2fa/disable',
  authenticate,
  authRateLimit,
  [
    body('token').notEmpty().withMessage('กรุณาใส่รหัสยืนยัน'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { token } = req.body;
    await twoFactorService.disable(req.userId, token);

    res.status(200).json({
      success: true,
      message: 'ปิดใช้งาน 2FA สำเร็จ',
    });
  })
);

/**
 * POST /api/v1/2fa/backup-codes
 * Regenerate backup codes
 */
router.post(
  '/2fa/backup-codes',
  authenticate,
  authRateLimit,
  [
    body('token').notEmpty().withMessage('กรุณาใส่รหัสยืนยัน'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { token } = req.body;
    const backupCodes = await twoFactorService.regenerateBackupCodes(req.userId, token);

    res.status(200).json({
      success: true,
      message: 'สร้าง Backup Codes ใหม่สำเร็จ',
      data: { backupCodes },
    });
  })
);

/**
 * GET /api/v1/auth/trusted-devices
 * Get list of user's trusted devices
 */
router.get(
  '/trusted-devices',
  authenticate,
  asyncHandler(async (req, res) => {
    const devices = await trustedDeviceService.getUserDevices(req.userId);

    res.status(200).json({
      success: true,
      message: 'Trusted devices retrieved successfully',
      data: { devices },
    });
  })
);

/**
 * DELETE /api/v1/auth/trusted-devices/:id
 * Revoke a specific trusted device
 */
router.delete(
  '/trusted-devices/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await trustedDeviceService.revokeDevice(req.userId, id);

    logger.info(`Trusted device revoked: ${id} for user: ${req.userId}`);

    res.status(200).json({
      success: true,
      message: 'Trusted device revoked successfully',
    });
  })
);

/**
 * DELETE /api/v1/auth/trusted-devices
 * Revoke all trusted devices for the user
 */
router.delete(
  '/trusted-devices',
  authenticate,
  asyncHandler(async (req, res) => {
    const count = await trustedDeviceService.revokeAllDevices(req.userId);

    logger.info(`All trusted devices revoked (${count}) for user: ${req.userId}`);

    res.status(200).json({
      success: true,
      message: `${count} trusted device(s) revoked successfully`,
      data: { count },
    });
  })
);

/**
 * GET /api/v1/auth/trusted-devices/settings
 * Get trusted device duration settings (Super Admin only)
 */
router.get(
  '/trusted-devices/settings',
  authenticate,
  asyncHandler(async (req, res) => {
    // Check if user is Super Admin
    if (req.user.role !== 'super_admin') {
      throw new ApiError(403, 'Only Super Admin can access these settings');
    }

    const settings = await trustedDeviceService.getSettings();

    res.status(200).json({
      success: true,
      data: settings,
    });
  })
);

/**
 * PUT /api/v1/auth/trusted-devices/settings
 * Update trusted device duration settings (Super Admin only)
 */
router.put(
  '/trusted-devices/settings',
  authenticate,
  [
    body('duration')
      .notEmpty()
      .withMessage('Duration is required')
      .isInt({ min: 1, max: 720 })
      .withMessage('Duration must be between 1 and 720 hours'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    // Check if user is Super Admin
    if (req.user.role !== 'super_admin') {
      throw new ApiError(403, 'Only Super Admin can modify these settings');
    }

    const { duration } = req.body;

    const settings = await trustedDeviceService.updateSettings(duration);

    logger.info(`Trusted device duration updated to ${duration} hours by: ${req.user.username}`);

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: settings,
    });
  })
);

module.exports = router;