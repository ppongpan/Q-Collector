/**
 * Submission Routes
 * Endpoints for form submission management with encryption
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
 * POST /api/v1/forms/:formId/submissions
 * Submit a form
 */
router.post(
  '/:formId/submissions',
  authenticate,
  attachMetadata,
  [
    param('formId')
      .isUUID()
      .withMessage('Invalid form ID'),
    body('fieldData')
      .isObject()
      .withMessage('fieldData must be an object'),
    body('status')
      .optional()
      .isIn(['draft', 'submitted'])
      .withMessage('Status must be draft or submitted'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { formId } = req.params;
    const data = req.body;

    const submission = await SubmissionService.createSubmission(
      formId,
      req.userId,
      data,
      req.metadata
    );

    logger.info(`Submission created: ${submission.id} for form ${formId}`);

    res.status(201).json({
      success: true,
      message: 'Submission created successfully',
      data: { submission },
    });
  })
);

/**
 * GET /api/v1/forms/:formId/submissions
 * List submissions for a form
 */
router.get(
  '/:formId/submissions',
  authenticate,
  [
    param('formId')
      .isUUID()
      .withMessage('Invalid form ID'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 10000 }) // ✅ v0.7.45: Allow up to 10,000 for navigation (loads all filtered submissions)
      .withMessage('Limit must be between 1 and 10000'),
    query('status')
      .optional()
      .isIn(['draft', 'submitted', 'approved', 'rejected', 'archived'])
      .withMessage('Invalid status'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { formId } = req.params;
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
      onlyMainForm: true, // ✅ FIX: Only show main form submissions (parent_id IS NULL)
      month: req.query.month ? parseInt(req.query.month) : undefined,
      year: req.query.year ? parseInt(req.query.year) : undefined,
      dateField: req.query.dateField,
      search: req.query.search,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    };

    const result = await SubmissionService.listSubmissions(formId, req.userId, filters);

    res.status(200).json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/v1/submissions/:id
 * Get submission details
 */
router.get(
  '/:id',
  authenticate,
  [
    param('id')
      .isUUID()
      .withMessage('Invalid submission ID'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const submission = await SubmissionService.getSubmission(req.params.id, req.userId);

    res.status(200).json({
      success: true,
      data: { submission },
    });
  })
);

/**
 * PUT /api/v1/submissions/:id
 * Update submission (draft only)
 */
router.put(
  '/:id',
  authenticate,
  [
    param('id')
      .isUUID()
      .withMessage('Invalid submission ID'),
    body('fieldData')
      .optional()
      .isObject()
      .withMessage('fieldData must be an object'),
    body('status')
      .optional()
      .isIn(['draft', 'submitted'])
      .withMessage('Status must be draft or submitted'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const data = req.body;

    const submission = await SubmissionService.updateSubmission(
      req.params.id,
      req.userId,
      data
    );

    logger.info(`Submission updated: ${req.params.id}`);

    res.status(200).json({
      success: true,
      message: 'Submission updated successfully',
      data: { submission },
    });
  })
);

/**
 * DELETE /api/v1/submissions/:id
 * Delete submission
 */
router.delete(
  '/:id',
  authenticate,
  [
    param('id')
      .isUUID()
      .withMessage('Invalid submission ID'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    await SubmissionService.deleteSubmission(req.params.id, req.userId);

    logger.info(`Submission deleted: ${req.params.id}`);

    res.status(200).json({
      success: true,
      message: 'Submission deleted successfully',
    });
  })
);

/**
 * GET /api/v1/forms/:formId/submissions/export
 * Export submissions
 */
router.get(
  '/:formId/submissions/export',
  authenticate,
  authorize('admin', 'manager'),
  [
    param('formId')
      .isUUID()
      .withMessage('Invalid form ID'),
    query('format')
      .optional()
      .isIn(['csv', 'json'])
      .withMessage('Format must be csv or json'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { formId } = req.params;
    const format = req.query.format || 'csv';

    const data = await SubmissionService.exportSubmissions(formId, req.userId, format);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="submissions-${formId}.csv"`);
      res.send(data);
    } else {
      res.status(200).json({
        success: true,
        data,
      });
    }

    logger.info(`Submissions exported: form ${formId} as ${format}`);
  })
);

/**
 * PATCH /api/v1/submissions/:id/status
 * Update submission status (approve/reject)
 */
router.patch(
  '/:id/status',
  authenticate,
  authorize('admin', 'manager'),
  [
    param('id')
      .isUUID()
      .withMessage('Invalid submission ID'),
    body('status')
      .isIn(['submitted', 'approved', 'rejected', 'archived'])
      .withMessage('Invalid status'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { status } = req.body;

    const submission = await SubmissionService.updateSubmissionStatus(
      req.params.id,
      req.userId,
      status
    );

    logger.info(`Submission status updated: ${req.params.id} -> ${status}`);

    res.status(200).json({
      success: true,
      message: 'Submission status updated successfully',
      data: { submission },
    });
  })
);

/**
 * GET /api/v1/submissions/:mainFormSubId/sub-forms/:subFormId
 * Get sub-form submissions by main form submission ID (from dynamic table)
 * Uses main_form_subid column to correctly link sub-forms to parent main form
 */
router.get(
  '/:mainFormSubId/sub-forms/:subFormId',
  authenticate,
  [
    param('mainFormSubId')
      .isUUID()
      .withMessage('Invalid main form submission ID'),
    param('subFormId')
      .isUUID()
      .withMessage('Invalid sub-form ID'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { mainFormSubId, subFormId } = req.params;

    const subFormSubmissions = await SubmissionService.getSubFormSubmissionsByMainFormSubId(
      mainFormSubId,
      subFormId,
      req.userId
    );

    logger.info(`Retrieved ${subFormSubmissions.length} sub-form submissions for main form ${mainFormSubId}`);

    res.status(200).json({
      success: true,
      data: { subFormSubmissions },
    });
  })
);

module.exports = router;