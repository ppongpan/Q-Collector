/**
 * DSR Workflow Routes
 * API endpoints for DSR request workflow management (review, approve, reject, execute)
 *
 * Workflow States:
 * pending → under_review → approved/rejected → executed → completed
 *
 * Security:
 * - All operations: super_admin, admin
 * - Approval/Rejection: Requires reason and legal basis
 * - All actions logged in dsr_actions and pdpa_audit_log
 *
 * @version v0.8.7-dev
 * @date 2025-10-25
 */

const express = require('express');
const router = express.Router();
const { param, body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { DSRRequest, DSRAction, sequelize } = require('../../models');
const logger = require('../../utils/logger.util');

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.error('Validation errors in DSR workflow routes:', errors.array());
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// ============================================================================
// DSR WORKFLOW ROUTES
// ============================================================================

/**
 * PUT /api/v1/dsr-workflow/:requestId/review
 * Mark DSR request as under review
 *
 * @access super_admin, admin
 * @param {string} requestId - UUID of the DSR request
 * @body {string} notes - Review notes (optional)
 * @returns {Object} Updated DSR request
 */
router.put(
  '/:requestId/review',
  authenticate,
  authorize('super_admin', 'admin'),
  [
    param('requestId')
      .isUUID()
      .withMessage('Request ID must be a valid UUID'),
    body('notes')
      .optional()
      .isString()
      .withMessage('Notes must be a string')
  ],
  validate,
  async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
      const { requestId } = req.params;
      const { notes } = req.body;

      // Get DSR request
      const dsrRequest = await DSRRequest.findByPk(requestId, { transaction });
      if (!dsrRequest) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: 'DSR request not found'
        });
      }

      // Check current status
      if (dsrRequest.status !== 'pending') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: `Cannot review DSR request with status: ${dsrRequest.status}`
        });
      }

      // Update to under_review
      dsrRequest.status = 'in_progress';
      dsrRequest.reviewed_by = req.user.id;
      dsrRequest.reviewed_at = new Date();
      dsrRequest.review_notes = notes || null;

      await dsrRequest.save({ transaction });

      // Create action record
      await DSRAction.create({
        dsr_request_id: requestId,
        action_type: 'in_progress',
        old_status: 'pending',
        new_status: 'in_progress',
        performed_by_user_id: req.user.id,
        performed_by_username: req.user.username,
        performed_by_role: req.user.role,
        performed_by_email: req.user.email,
        actor_name: req.user.full_name || req.user.username,
        notes: notes || 'DSR request marked for review',
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        pdpa_section: 'Section 30-38',
        is_automated: false
      }, { transaction });

      await transaction.commit();

      logger.info(
        `DSR request ${requestId} marked for review by ${req.user.username}`
      );

      res.json({
        success: true,
        data: dsrRequest,
        message: 'DSR request marked for review successfully'
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error reviewing DSR request:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to review DSR request'
      });
    }
  }
);

/**
 * PUT /api/v1/dsr-workflow/:requestId/approve
 * Approve DSR request
 *
 * @access super_admin, admin
 * @param {string} requestId - UUID of the DSR request
 * @body {string} notes - Approval notes/reason (required, min 20 chars)
 * @body {string} legalBasis - Legal basis for approval (required)
 * @returns {Object} Updated DSR request
 */
router.put(
  '/:requestId/approve',
  authenticate,
  authorize('super_admin', 'admin'),
  [
    param('requestId')
      .isUUID()
      .withMessage('Request ID must be a valid UUID'),
    body('notes')
      .trim()
      .isLength({ min: 20 })
      .withMessage('Approval notes must be at least 20 characters'),
    body('legalBasis')
      .trim()
      .notEmpty()
      .withMessage('Legal basis is required')
  ],
  validate,
  async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
      const { requestId } = req.params;
      const { notes, legalBasis } = req.body;

      // Get DSR request
      const dsrRequest = await DSRRequest.findByPk(requestId, { transaction });
      if (!dsrRequest) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: 'DSR request not found'
        });
      }

      // Check current status
      if (dsrRequest.status === 'completed' || dsrRequest.status === 'rejected') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: `Cannot approve DSR request with status: ${dsrRequest.status}`
        });
      }

      const oldStatus = dsrRequest.status;

      // Update to approved
      dsrRequest.status = 'approved';
      dsrRequest.approved_by = req.user.id;
      dsrRequest.approved_at = new Date();
      dsrRequest.approval_notes = notes;
      dsrRequest.legal_basis_assessment = legalBasis;

      await dsrRequest.save({ transaction });

      // Create action record
      await DSRAction.create({
        dsr_request_id: requestId,
        action_type: 'approved',
        old_status: oldStatus,
        new_status: 'approved',
        performed_by_user_id: req.user.id,
        performed_by_username: req.user.username,
        performed_by_role: req.user.role,
        performed_by_email: req.user.email,
        actor_name: req.user.full_name || req.user.username,
        notes: notes,
        legal_basis: legalBasis,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        pdpa_section: 'Section 30-38',
        is_automated: false
      }, { transaction });

      await transaction.commit();

      logger.info(
        `DSR request ${requestId} (${dsrRequest.dsr_number}) approved by ${req.user.username}`
      );

      res.json({
        success: true,
        data: dsrRequest,
        message: 'DSR request approved successfully'
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error approving DSR request:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to approve DSR request'
      });
    }
  }
);

/**
 * PUT /api/v1/dsr-workflow/:requestId/reject
 * Reject DSR request
 *
 * @access super_admin, admin
 * @param {string} requestId - UUID of the DSR request
 * @body {string} reason - Detailed rejection reason (required, min 50 chars)
 * @body {string} legalBasis - Legal basis for rejection (required)
 * @returns {Object} Updated DSR request
 */
router.put(
  '/:requestId/reject',
  authenticate,
  authorize('super_admin', 'admin'),
  [
    param('requestId')
      .isUUID()
      .withMessage('Request ID must be a valid UUID'),
    body('reason')
      .trim()
      .isLength({ min: 50 })
      .withMessage('Rejection reason must be at least 50 characters'),
    body('legalBasis')
      .trim()
      .notEmpty()
      .withMessage('Legal basis is required')
  ],
  validate,
  async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
      const { requestId } = req.params;
      const { reason, legalBasis } = req.body;

      // Get DSR request
      const dsrRequest = await DSRRequest.findByPk(requestId, { transaction });
      if (!dsrRequest) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: 'DSR request not found'
        });
      }

      // Check current status
      if (dsrRequest.status === 'completed' || dsrRequest.status === 'rejected') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: `Cannot reject DSR request with status: ${dsrRequest.status}`
        });
      }

      const oldStatus = dsrRequest.status;

      // Update to rejected
      dsrRequest.status = 'rejected';
      dsrRequest.rejected_by = req.user.id;
      dsrRequest.rejected_at = new Date();
      dsrRequest.rejection_reason = reason;
      dsrRequest.legal_basis_assessment = legalBasis;
      dsrRequest.completed_at = new Date(); // Mark as completed (rejected)

      await dsrRequest.save({ transaction });

      // Create action record
      await DSRAction.create({
        dsr_request_id: requestId,
        action_type: 'rejected',
        old_status: oldStatus,
        new_status: 'rejected',
        performed_by_user_id: req.user.id,
        performed_by_username: req.user.username,
        performed_by_role: req.user.role,
        performed_by_email: req.user.email,
        actor_name: req.user.full_name || req.user.username,
        justification: reason,
        legal_basis: legalBasis,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        pdpa_section: 'Section 30-38',
        is_automated: false
      }, { transaction });

      await transaction.commit();

      logger.info(
        `DSR request ${requestId} (${dsrRequest.dsr_number}) rejected by ${req.user.username}`
      );

      res.json({
        success: true,
        data: dsrRequest,
        message: 'DSR request rejected successfully'
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error rejecting DSR request:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to reject DSR request'
      });
    }
  }
);

/**
 * PUT /api/v1/dsr-workflow/:requestId/execute
 * Execute approved DSR request
 *
 * @access super_admin, admin
 * @param {string} requestId - UUID of the DSR request
 * @body {Object} executionDetails - Details of actions taken (required)
 * @body {string} notes - Execution notes (optional)
 * @returns {Object} Updated DSR request
 */
router.put(
  '/:requestId/execute',
  authenticate,
  authorize('super_admin', 'admin'),
  [
    param('requestId')
      .isUUID()
      .withMessage('Request ID must be a valid UUID'),
    body('executionDetails')
      .isObject()
      .withMessage('Execution details must be an object'),
    body('notes')
      .optional()
      .isString()
      .withMessage('Notes must be a string')
  ],
  validate,
  async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
      const { requestId } = req.params;
      const { executionDetails, notes } = req.body;

      // Get DSR request
      const dsrRequest = await DSRRequest.findByPk(requestId, { transaction });
      if (!dsrRequest) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: 'DSR request not found'
        });
      }

      // Check current status (must be approved)
      if (dsrRequest.status !== 'approved') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: `Cannot execute DSR request with status: ${dsrRequest.status}. Must be approved first.`
        });
      }

      // Update execution details
      dsrRequest.executed_by = req.user.id;
      dsrRequest.executed_at = new Date();
      dsrRequest.execution_details = executionDetails;
      dsrRequest.status = 'completed';
      dsrRequest.completed_at = new Date();

      await dsrRequest.save({ transaction });

      // Create action record
      await DSRAction.create({
        dsr_request_id: requestId,
        action_type: 'completed',
        old_status: 'approved',
        new_status: 'completed',
        performed_by_user_id: req.user.id,
        performed_by_username: req.user.username,
        performed_by_role: req.user.role,
        performed_by_email: req.user.email,
        actor_name: req.user.full_name || req.user.username,
        notes: notes || 'DSR request executed and completed',
        action_metadata: executionDetails,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        pdpa_section: 'Section 30-38',
        completed_at: new Date(),
        is_automated: false
      }, { transaction });

      await transaction.commit();

      logger.info(
        `DSR request ${requestId} (${dsrRequest.dsr_number}) executed and completed by ${req.user.username}`
      );

      res.json({
        success: true,
        data: dsrRequest,
        message: 'DSR request executed and completed successfully'
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error executing DSR request:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to execute DSR request'
      });
    }
  }
);

/**
 * GET /api/v1/dsr-workflow/:requestId/actions
 * Get action history for a DSR request
 *
 * @access super_admin, admin
 * @param {string} requestId - UUID of the DSR request
 * @returns {Array} Array of actions
 */
router.get(
  '/:requestId/actions',
  authenticate,
  authorize('super_admin', 'admin'),
  [
    param('requestId')
      .isUUID()
      .withMessage('Request ID must be a valid UUID')
  ],
  validate,
  async (req, res) => {
    try {
      const { requestId } = req.params;

      // Get all actions for this request
      const actions = await DSRAction.findAll({
        where: { dsr_request_id: requestId },
        order: [['created_at', 'ASC']]
      });

      logger.info(
        `Retrieved ${actions.length} actions for DSR request ${requestId}`
      );

      res.json({
        success: true,
        data: actions,
        count: actions.length
      });
    } catch (error) {
      logger.error('Error fetching DSR actions:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve DSR actions'
      });
    }
  }
);

module.exports = router;
