/**
 * Sub-Form Submission Routes
 * Endpoints for sub-form submission management
 */

const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const SubmissionService = require('../../services/SubmissionService');
const { authenticate, authorize, attachMetadata } = require('../../middleware/auth.middleware');
const { asyncHandler, ApiError } = require('../../middleware/error.middleware');
const logger = require('../../utils/logger.util');

const router = express.Router();

/**
 * Validation middleware helper
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(e => `${e.param}: ${e.msg}`).join(', ');
    logger.error('Validation failed:', {
      url: req.originalUrl,
      method: req.method,
      params: req.params,
      body: req.body,
      errors: errors.array()
    });
    throw new ApiError(400, `ข้อมูลที่ส่งมาไม่ถูกต้อง: ${errorDetails}`, 'VALIDATION_ERROR', errors.array());
  }
  next();
}

/**
 * POST /api/v1/subforms/:subFormId/submissions
 * Create a sub-form submission
 */
router.post(
  '/:subFormId/submissions',
  authenticate,
  attachMetadata,
  [
    param('subFormId')
      .isUUID()
      .withMessage('Invalid sub-form ID'),
    body('parentId')
      .isUUID()
      .withMessage('Parent submission ID is required'),
    body('data')
      .isObject()
      .withMessage('Data must be an object'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    // ✅ DEBUG: Log incoming request details
    logger.info('📥 Sub-form submission request:', {
      subFormId: req.params.subFormId,
      parentId: req.body.parentId,
      dataType: typeof req.body.data,
      dataIsArray: Array.isArray(req.body.data),
      dataKeys: req.body.data ? Object.keys(req.body.data) : null,
      userId: req.userId,
      body: req.body
    });

    const { subFormId } = req.params;
    const { parentId, data } = req.body;

    // Get sub-form details
    const { SubForm } = require('../../models');
    const subForm = await SubForm.findByPk(subFormId);

    if (!subForm) {
      throw new ApiError(404, 'Sub-form not found', 'SUBFORM_NOT_FOUND');
    }

    // ✅ CRITICAL FIX: Pass subFormId to createSubmission
    // createSubmission will detect it's a sub-form and insert into sub-form table
    const submission = await SubmissionService.createSubmission(
      subFormId, // ✅ Pass subFormId so createSubmission can detect it's a sub-form
      req.userId,
      {
        fieldData: data,
        parentId, // Link to parent submission
        subFormId, // Store sub-form ID for reference
        status: 'submitted'
      },
      req.metadata
    );

    logger.info(`Sub-form submission created: ${submission.id} for sub-form ${subFormId}, parent: ${parentId}`);

    res.status(201).json({
      success: true,
      message: 'Sub-form submission created successfully',
      data: { submission },
    });
  })
);

/**
 * GET /api/v1/subforms/:subFormId/submissions
 * List submissions for a sub-form
 */
router.get(
  '/:subFormId/submissions',
  authenticate,
  [
    param('subFormId')
      .isUUID()
      .withMessage('Invalid sub-form ID'),
    query('parentId')
      .optional()
      .isUUID()
      .withMessage('Invalid parent ID'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { subFormId } = req.params;

    // ✅ FIX: Query using SubForm.id to get only sub-form submissions
    const { SubForm } = require('../../models');
    const subForm = await SubForm.findByPk(subFormId);

    if (!subForm) {
      throw new ApiError(404, 'Sub-form not found', 'SUBFORM_NOT_FOUND');
    }

    const filters = {
      parentId: req.query.parentId, // Filter by parent submission
      page: req.query.page,
      limit: req.query.limit,
    };

    // ✅ Use SubForm.id to list ONLY sub-form submissions
    const result = await SubmissionService.listSubmissions(subFormId, req.userId, filters);

    res.status(200).json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/v1/subforms/:subFormId/submissions/:submissionId
 * Get sub-form submission details from dynamic table
 */
router.get(
  '/:subFormId/submissions/:submissionId',
  authenticate,
  [
    param('subFormId')
      .isUUID()
      .withMessage('Invalid sub-form ID'),
    param('submissionId')
      .isUUID()
      .withMessage('Invalid submission ID'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { subFormId, submissionId } = req.params;

    // ✅ Use new method that queries dynamic table directly
    const submission = await SubmissionService.getSubFormSubmissionDetail(
      subFormId,
      submissionId,
      req.userId
    );

    res.status(200).json({
      success: true,
      data: { submission },
    });
  })
);

/**
 * PUT /api/v1/subforms/:subFormId/submissions/:submissionId
 * Update sub-form submission in dynamic table
 */
router.put(
  '/:subFormId/submissions/:submissionId',
  authenticate,
  [
    param('subFormId')
      .isUUID()
      .withMessage('Invalid sub-form ID'),
    param('submissionId')
      .isUUID()
      .withMessage('Invalid submission ID'),
    body('data')
      .optional()
      .isObject()
      .withMessage('Data must be an object'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { subFormId, submissionId } = req.params;
    const { data } = req.body;

    // ✅ Use new method that updates dynamic table directly
    const submission = await SubmissionService.updateSubFormSubmission(
      subFormId,
      submissionId,
      req.userId,
      data
    );

    logger.info(`Sub-form submission updated: ${submissionId}`);

    res.status(200).json({
      success: true,
      message: 'Sub-form submission updated successfully',
      data: { submission },
    });
  })
);

/**
 * DELETE /api/v1/subforms/:subFormId/submissions/:submissionId
 * Delete sub-form submission
 */
router.delete(
  '/:subFormId/submissions/:submissionId',
  authenticate,
  [
    param('subFormId')
      .isUUID()
      .withMessage('Invalid sub-form ID'),
    param('submissionId')
      .isUUID()
      .withMessage('Invalid submission ID'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { submissionId } = req.params;

    await SubmissionService.deleteSubmission(submissionId, req.userId);

    logger.info(`Sub-form submission deleted: ${submissionId}`);

    res.status(200).json({
      success: true,
      message: 'Sub-form submission deleted successfully',
    });
  })
);

module.exports = router;
