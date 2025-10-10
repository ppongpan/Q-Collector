/**
 * User Management Routes
 * Endpoints for user CRUD operations (Super Admin only)
 *
 * @swagger
 * tags:
 *   name: Users
 *   description: User management operations (Super Admin only)
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const UserService = require('../../services/UserService');
const {
  authenticate,
  requireSuperAdmin,
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
 * GET /api/v1/users
 * List all users (Super Admin only)
 */
router.get(
  '/',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, search, role } = req.query;

    const result = await UserService.listUsers({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      role,
    });

    logger.info(`User list fetched by ${req.user.username}`, {
      count: result.users.length,
      total: result.total,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/v1/users/:id
 * Get single user details (Super Admin only)
 */
router.get(
  '/:id',
  authenticate,
  requireSuperAdmin,
  [param('id').isUUID().withMessage('Invalid user ID')],
  validate,
  asyncHandler(async (req, res) => {
    const user = await UserService.getUserById(req.params.id);

    if (!user) {
      throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
    }

    logger.info(`User details fetched by ${req.user.username}`, {
      userId: req.params.id,
    });

    res.status(200).json({
      success: true,
      data: { user },
    });
  })
);

/**
 * PUT /api/v1/users/:id
 * Update user information (Super Admin only)
 */
router.put(
  '/:id',
  authenticate,
  requireSuperAdmin,
  [
    param('id').isUUID().withMessage('Invalid user ID'),
    body('username')
      .optional()
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be 3-50 characters'),
    body('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail(),
    body('full_name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Full name must be 1-100 characters'),
    body('role')
      .optional()
      .isIn([
        'super_admin',
        'admin',
        'moderator',
        'customer_service',
        'sales',
        'marketing',
        'technic',
        'general_user',
      ])
      .withMessage('Invalid role'),
    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be boolean'),
    body('special_forms')
      .optional()
      .isString()
      .withMessage('special_forms must be a string'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { username, email, full_name, role, is_active, special_forms } = req.body;

    // Parse special_forms from comma-separated string to array
    let specialFormsArray = [];
    if (special_forms !== undefined) {
      if (special_forms.trim() === '') {
        specialFormsArray = [];
      } else {
        specialFormsArray = special_forms
          .split(',')
          .map((form) => form.trim())
          .filter((form) => form.length > 0);
      }
    }

    const updatedUser = await UserService.updateUser(req.params.id, {
      username,
      email,
      full_name,
      role,
      is_active,
      special_forms: special_forms !== undefined ? specialFormsArray : undefined,
    });

    logger.info(`User updated by ${req.user.username}`, {
      userId: req.params.id,
      changes: req.body,
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user: updatedUser },
    });
  })
);

/**
 * POST /api/v1/users/:id/reset-password
 * Reset user password (Super Admin only)
 */
router.post(
  '/:id/reset-password',
  authenticate,
  requireSuperAdmin,
  [
    param('id').isUUID().withMessage('Invalid user ID'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and number'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { newPassword } = req.body;

    await UserService.resetPassword(req.params.id, newPassword);

    logger.info(`Password reset by ${req.user.username}`, {
      userId: req.params.id,
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  })
);

/**
 * DELETE /api/v1/users/:id
 * Delete user (Super Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  requireSuperAdmin,
  [param('id').isUUID().withMessage('Invalid user ID')],
  validate,
  asyncHandler(async (req, res) => {
    const userId = req.params.id;

    // Prevent deleting yourself
    if (userId === req.user.id) {
      throw new ApiError(400, 'Cannot delete your own account', 'CANNOT_DELETE_SELF');
    }

    const user = await UserService.getUserById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
    }

    await UserService.deleteUser(userId);

    logger.info(`User deleted by ${req.user.username}`, {
      deletedUserId: userId,
      deletedUsername: user.username,
    });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  })
);

module.exports = router;