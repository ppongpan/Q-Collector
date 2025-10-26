/**
 * User Preference Routes
 * Endpoints for managing user-specific preferences
 * Version: v0.8.0-dev
 * Date: 2025-10-21
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const UserPreferenceService = require('../../services/UserPreferenceService');
const { authenticate, optionalAuth } = require('../../middleware/auth.middleware');
const { asyncHandler, ApiError } = require('../../middleware/error.middleware');
const logger = require('../../utils/logger.util');

const router = express.Router();

/**
 * Validation middleware helper
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.error('Validation failed:', {
      url: req.originalUrl,
      method: req.method,
      params: req.params,
      body: req.body,
      errors: errors.array()
    });
    throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', errors.array());
  }
  next();
}

/**
 * Valid context types
 */
const validContextTypes = ['form_list', 'global', 'dashboard', 'form_builder'];

/**
 * GET /api/v1/preferences/:contextType/:contextId?
 * Get user preferences for a specific context
 *
 * @access Public (optional authentication)
 */
router.get(
  '/:contextType/:contextId?',
  optionalAuth,
  [
    param('contextType')
      .isIn(validContextTypes)
      .withMessage(`Context type must be one of: ${validContextTypes.join(', ')}`),
    param('contextId')
      .optional()
      .isString()
      .withMessage('Context ID must be a string'),
    validate
  ],
  asyncHandler(async (req, res) => {
    const { contextType, contextId } = req.params;

    // If not authenticated, return empty preferences
    if (!req.user) {
      logger.info(`Anonymous user requesting preferences for ${contextType}/${contextId || 'null'}`);
      return res.json({
        success: true,
        data: null,
        message: 'No preferences found (not authenticated)'
      });
    }

    const userId = req.user.id;
    logger.info(`Getting preferences for user ${userId}, context: ${contextType}/${contextId || 'null'}`);

    const preferences = await UserPreferenceService.getPreferences(
      userId,
      contextType,
      contextId || null
    );

    res.json({
      success: true,
      data: preferences,
      message: preferences ? 'Preferences retrieved successfully' : 'No preferences found'
    });
  })
);

/**
 * GET /api/v1/preferences/defaults/form-list/:formId
 * Get smart defaults for form list view
 * Uses most recent submission date if available, otherwise current date
 *
 * @access Public (optional authentication)
 */
router.get(
  '/defaults/form-list/:formId',
  optionalAuth,
  [
    param('formId')
      .isUUID()
      .withMessage('Form ID must be a valid UUID'),
    validate
  ],
  asyncHandler(async (req, res) => {
    const { formId } = req.params;

    // Use anonymous userId if not authenticated
    const userId = req.user ? req.user.id : null;

    logger.info(`Getting smart defaults for form ${formId}, user ${userId || 'anonymous'}`);

    const result = await UserPreferenceService.getFormListDefaults(userId, formId);

    res.json({
      success: true,
      data: result.defaults,
      metadata: result.metadata,
      message: 'Smart defaults retrieved successfully'
    });
  })
);

/**
 * PUT /api/v1/preferences/:contextType/:contextId?
 * Save or update user preferences for a specific context
 *
 * @access Public (optional authentication)
 */
router.put(
  '/:contextType/:contextId?',
  optionalAuth,
  [
    param('contextType')
      .isIn(validContextTypes)
      .withMessage(`Context type must be one of: ${validContextTypes.join(', ')}`),
    param('contextId')
      .optional()
      .isString()
      .withMessage('Context ID must be a string'),
    body('preferences')
      .isObject()
      .withMessage('Preferences must be a JSON object'),
    validate
  ],
  asyncHandler(async (req, res) => {
    const { contextType, contextId } = req.params;
    const { preferences } = req.body;

    // If not authenticated, return success without saving
    if (!req.user) {
      logger.info(`Anonymous user attempted to save preferences for ${contextType}/${contextId || 'null'} (skipped)`);
      return res.json({
        success: true,
        data: null,
        message: 'Preferences not saved (not authenticated)'
      });
    }

    const userId = req.user.id;

    logger.info(`Saving preferences for user ${userId}, context: ${contextType}/${contextId || 'null'}`);

    const savedPreferences = await UserPreferenceService.savePreferences(
      userId,
      contextType,
      contextId || null,
      preferences
    );

    res.json({
      success: true,
      data: savedPreferences,
      message: 'Preferences saved successfully'
    });
  })
);

/**
 * DELETE /api/v1/preferences/:contextType/:contextId?
 * Delete user preferences for a specific context (reset to defaults)
 *
 * @access Public (optional authentication)
 */
router.delete(
  '/:contextType/:contextId?',
  optionalAuth,
  [
    param('contextType')
      .isIn(validContextTypes)
      .withMessage(`Context type must be one of: ${validContextTypes.join(', ')}`),
    param('contextId')
      .optional()
      .isString()
      .withMessage('Context ID must be a string'),
    validate
  ],
  asyncHandler(async (req, res) => {
    const { contextType, contextId } = req.params;

    // If not authenticated, return success without deleting
    if (!req.user) {
      logger.info(`Anonymous user attempted to delete preferences for ${contextType}/${contextId || 'null'} (skipped)`);
      return res.json({
        success: true,
        data: { deleted: false },
        message: 'No preferences to delete (not authenticated)'
      });
    }

    const userId = req.user.id;

    logger.info(`Deleting preferences for user ${userId}, context: ${contextType}/${contextId || 'null'}`);

    const deleted = await UserPreferenceService.deletePreferences(
      userId,
      contextType,
      contextId || null
    );

    res.json({
      success: true,
      data: { deleted },
      message: deleted ? 'Preferences deleted successfully' : 'No preferences found to delete'
    });
  })
);

/**
 * GET /api/v1/preferences/user/all
 * Get all preferences for the authenticated user (all contexts)
 * Useful for debugging or user preference management
 *
 * @access Private (authenticated users only)
 */
router.get(
  '/user/all',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    logger.info(`Getting all preferences for user ${userId}`);

    const preferences = await UserPreferenceService.getAllUserPreferences(userId);

    res.json({
      success: true,
      data: preferences,
      count: preferences.length,
      message: 'All user preferences retrieved successfully'
    });
  })
);

/**
 * DELETE /api/v1/preferences/user/all
 * Delete all preferences for the authenticated user
 * Useful when user wants to reset all settings
 *
 * @access Private (authenticated users only)
 */
router.delete(
  '/user/all',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    logger.info(`Deleting all preferences for user ${userId}`);

    const deletedCount = await UserPreferenceService.deleteAllUserPreferences(userId);

    res.json({
      success: true,
      data: { deletedCount },
      message: `${deletedCount} preference record(s) deleted successfully`
    });
  })
);

module.exports = router;
