/**
 * Form Routes
 * Endpoints for form CRUD operations with RBAC
 */

const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const FormService = require('../../services/FormService');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { asyncHandler, ApiError } = require('../../middleware/error.middleware');
const logger = require('../../utils/logger.util');

const router = express.Router();

/**
 * Validation middleware helper
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Enhanced logging for debugging
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
 * Field type validation
 */
const validFieldTypes = [
  'short_answer',
  'paragraph',
  'email',
  'phone',
  'number',
  'url',
  'file_upload',
  'image_upload',
  'date',
  'time',
  'datetime',
  'multiple_choice',
  'rating',
  'slider',
  'lat_long',
  'province',
  'factory',
];

/**
 * GET /api/v1/forms
 * List all forms accessible by user
 */
router.get(
  '/',
  authenticate,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be boolean'),
    query('search')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Search query must not be empty'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
      search: req.query.search,
    };

    const result = await FormService.listForms(req.userId, filters);

    res.status(200).json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/v1/forms
 * Create new form
 */
router.post(
  '/',
  authenticate,
  authorize('super_admin', 'admin', 'moderator'),
  [
    body('title')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Title must be 1-255 characters'),
    body('description')
      .optional()
      .trim(),
    body('roles_allowed')
      .optional()
      .isArray()
      .withMessage('roles_allowed must be an array')
      .custom((value) => {
        const validRoles = ['super_admin', 'admin', 'moderator', 'customer_service', 'technic', 'sale', 'marketing', 'general_user'];
        return value.every((role) => validRoles.includes(role));
      })
      .withMessage('Invalid role in roles_allowed'),
    body('settings')
      .optional()
      .isObject()
      .withMessage('settings must be an object'),
    body('fields')
      .optional()
      .isArray()
      .withMessage('fields must be an array'),
    body('fields.*.type')
      .if(body('fields').exists())
      .isIn(validFieldTypes)
      .withMessage(`Field type must be one of: ${validFieldTypes.join(', ')}`),
    body('fields.*.title')
      .if(body('fields').exists())
      .trim()
      .notEmpty()
      .withMessage('Field title is required'),
    body('subForms')
      .optional()
      .isArray()
      .withMessage('subForms must be an array'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const formData = req.body;

    const form = await FormService.createForm(req.userId, formData);

    logger.info(`Form created: ${form.title} by ${req.user.username}`);

    res.status(201).json({
      success: true,
      message: 'Form created successfully',
      data: { form },
    });
  })
);

/**
 * GET /api/v1/forms/:id
 * Get form by ID
 */
router.get(
  '/:id',
  authenticate,
  [
    param('id')
      .isUUID()
      .withMessage('Invalid form ID'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const form = await FormService.getForm(req.params.id, req.userId);

    res.status(200).json({
      success: true,
      data: { form },
    });
  })
);

/**
 * PUT /api/v1/forms/:id
 * Update form
 */
router.put(
  '/:id',
  authenticate,
  authorize('super_admin', 'admin', 'moderator'),
  [
    param('id')
      .isUUID()
      .withMessage('Invalid form ID'),
    body('title')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Title must be 1-255 characters'),
    body('description')
      .optional()
      .trim(),
    body('roles_allowed')
      .optional()
      .isArray()
      .withMessage('roles_allowed must be an array'),
    body('settings')
      .optional()
      .isObject()
      .withMessage('settings must be an object'),
    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be boolean'),
    body('fields')
      .optional()
      .isArray()
      .withMessage('fields must be an array'),
    body('subForms')
      .optional()
      .isArray()
      .withMessage('subForms must be an array'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const updates = req.body;

    const form = await FormService.updateForm(req.params.id, req.userId, updates);

    logger.info(`Form updated: ${req.params.id} by ${req.user.username}`);

    res.status(200).json({
      success: true,
      message: 'Form updated successfully',
      data: { form },
    });
  })
);

/**
 * DELETE /api/v1/forms/:id
 * Delete form
 */
router.delete(
  '/:id',
  authenticate,
  authorize('super_admin', 'admin', 'moderator'),
  [
    param('id')
      .isUUID()
      .withMessage('Invalid form ID'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    await FormService.deleteForm(req.params.id, req.userId);

    logger.info(`Form deleted: ${req.params.id} by ${req.user.username}`);

    res.status(200).json({
      success: true,
      message: 'Form deleted successfully',
    });
  })
);

/**
 * POST /api/v1/forms/:id/duplicate
 * Duplicate form
 */
router.post(
  '/:id/duplicate',
  authenticate,
  authorize('super_admin', 'admin', 'moderator'),
  [
    param('id')
      .isUUID()
      .withMessage('Invalid form ID'),
    body('title')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Title must be 1-255 characters'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { title } = req.body;

    const form = await FormService.duplicateForm(req.params.id, req.userId, title);

    logger.info(`Form duplicated: ${req.params.id} -> ${form.id} by ${req.user.username}`);

    res.status(201).json({
      success: true,
      message: 'Form duplicated successfully',
      data: { form },
    });
  })
);

/**
 * PATCH /api/v1/forms/:id/toggle-status
 * Toggle form active status
 */
router.patch(
  '/:id/toggle-status',
  authenticate,
  authorize('super_admin', 'admin', 'moderator'),
  [
    param('id')
      .isUUID()
      .withMessage('Invalid form ID'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const form = await FormService.toggleFormStatus(req.params.id, req.userId);

    logger.info(`Form status toggled: ${req.params.id} by ${req.user.username}`);

    res.status(200).json({
      success: true,
      message: `Form ${form.is_active ? 'activated' : 'deactivated'} successfully`,
      data: { form },
    });
  })
);

module.exports = router;