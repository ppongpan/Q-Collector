/**
 * Submission Service
 * Handles form submissions with automatic field encryption and Redis caching
 */

const { Op } = require('sequelize');
const { Submission, SubmissionData, Form, Field, User, AuditLog, sequelize } = require('../models');
const logger = require('../utils/logger.util');
const { ApiError } = require('../middleware/error.middleware');
const { Parser } = require('json2csv');
const cacheService = require('./CacheService');
const { KEYS, POLICIES, INVALIDATION_PATTERNS } = require('../config/cache.config');

class SubmissionService {
  /**
   * Create new submission
   * @param {string} formId - Form ID
   * @param {string} userId - User ID submitting the form
   * @param {Object} data - Submission data
   * @param {Object} metadata - Request metadata (ip, userAgent)
   * @returns {Promise<Object>} Created submission
   */
  static async createSubmission(formId, userId, data, metadata = {}) {
    const transaction = await sequelize.transaction();

    try {
      const { fieldData, status = 'submitted' } = data;

      // Get form with all fields
      const form = await Form.scope('full').findByPk(formId);

      if (!form) {
        throw new ApiError(404, 'Form not found', 'FORM_NOT_FOUND');
      }

      // Check if form is active
      if (!form.is_active && status !== 'draft') {
        throw new ApiError(403, 'Form is not active', 'FORM_INACTIVE');
      }

      // Check if user has access based on role
      const user = await User.findByPk(userId);
      if (!form.canAccessByRole(user.role) && form.created_by !== userId) {
        throw new ApiError(403, 'Access denied to this form', 'FORBIDDEN');
      }

      // Get all form fields (main + sub-form fields)
      const allFields = await Field.findAll({
        where: { form_id: formId },
      });

      // Create field map for quick lookup
      const fieldMap = new Map();
      allFields.forEach((field) => {
        fieldMap.set(field.id, field);
      });

      // Validate submission data
      const validationErrors = [];
      for (const [fieldId, value] of Object.entries(fieldData)) {
        const field = fieldMap.get(fieldId);

        if (!field) {
          continue; // Skip unknown fields
        }

        // Validate field value
        const validation = field.validateValue(value);
        if (!validation.valid) {
          validationErrors.push({
            field: field.title,
            fieldId,
            error: validation.error,
          });
        }
      }

      if (validationErrors.length > 0) {
        throw new ApiError(
          400,
          'Validation failed',
          'VALIDATION_ERROR',
          validationErrors
        );
      }

      // Create submission
      const submission = await Submission.create(
        {
          form_id: formId,
          submitted_by: userId,
          status,
          ip_address: metadata.ipAddress,
          user_agent: metadata.userAgent,
          metadata: metadata.additionalData || {},
          submitted_at: new Date(),
        },
        { transaction }
      );

      // Create submission data with encryption for sensitive fields
      for (const [fieldId, value] of Object.entries(fieldData)) {
        const field = fieldMap.get(fieldId);

        if (!field) {
          continue; // Skip unknown fields
        }

        // Use the model's createWithEncryption method
        await SubmissionData.createWithEncryption(
          submission.id,
          fieldId,
          value,
          field,
          { transaction }
        );
      }

      await transaction.commit();

      // Create audit log
      await AuditLog.logAction({
        userId,
        action: 'create',
        entityType: 'submission',
        entityId: submission.id,
        newValue: { formId, status },
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });

      logger.info(`Submission created: ${submission.id} for form ${formId} by user ${userId}`);

      // Return submission with decrypted data
      return await this.getSubmission(submission.id, userId);
    } catch (error) {
      await transaction.rollback();
      logger.error('Submission creation failed:', error);
      throw error;
    }
  }

  /**
   * Update submission (only drafts can be updated)
   * @param {string} submissionId - Submission ID
   * @param {string} userId - User ID
   * @param {Object} data - Updated submission data
   * @returns {Promise<Object>} Updated submission
   */
  static async updateSubmission(submissionId, userId, data) {
    const transaction = await sequelize.transaction();

    try {
      const submission = await Submission.findByPk(submissionId);

      if (!submission) {
        throw new ApiError(404, 'Submission not found', 'SUBMISSION_NOT_FOUND');
      }

      // Check ownership or admin permission
      const user = await User.findByPk(userId);
      if (submission.submitted_by !== userId && user.role !== 'admin') {
        throw new ApiError(403, 'Not authorized to update this submission', 'FORBIDDEN');
      }

      // Only allow updates for drafts and submitted status
      if (!submission.canEdit()) {
        throw new ApiError(
          403,
          'Cannot update submission with this status',
          'INVALID_STATUS'
        );
      }

      const { fieldData, status } = data;

      // Update submission status if provided
      if (status !== undefined) {
        submission.status = status;
        await submission.save({ transaction });
      }

      // Update field data if provided
      if (fieldData) {
        // Get all form fields
        const form = await Form.scope('full').findByPk(submission.form_id);
        const allFields = await Field.findAll({
          where: { form_id: submission.form_id },
        });

        const fieldMap = new Map();
        allFields.forEach((field) => {
          fieldMap.set(field.id, field);
        });

        // Delete existing submission data
        await SubmissionData.destroy({
          where: { submission_id: submissionId },
          transaction,
        });

        // Create new submission data
        for (const [fieldId, value] of Object.entries(fieldData)) {
          const field = fieldMap.get(fieldId);

          if (!field) {
            continue;
          }

          await SubmissionData.createWithEncryption(
            submissionId,
            fieldId,
            value,
            field,
            { transaction }
          );
        }
      }

      await transaction.commit();

      // Create audit log
      await AuditLog.logAction({
        userId,
        action: 'update',
        entityType: 'submission',
        entityId: submissionId,
        newValue: data,
      });

      logger.info(`Submission updated: ${submissionId} by user ${userId}`);

      return await this.getSubmission(submissionId, userId);
    } catch (error) {
      await transaction.rollback();
      logger.error('Submission update failed:', error);
      throw error;
    }
  }

  /**
   * Get submission with decrypted data
   * @param {string} submissionId - Submission ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Submission with decrypted data
   */
  static async getSubmission(submissionId, userId) {
    try {
      const submission = await Submission.findByPk(submissionId, {
        include: [
          {
            model: Form,
            as: 'form',
            attributes: ['id', 'title', 'description'],
          },
          {
            model: SubmissionData,
            as: 'submissionData',
            include: [
              {
                model: Field,
                as: 'field',
              },
            ],
          },
          {
            model: User,
            as: 'submitter',
            attributes: ['id', 'username', 'email'],
          },
        ],
      });

      if (!submission) {
        throw new ApiError(404, 'Submission not found', 'SUBMISSION_NOT_FOUND');
      }

      // Check access permission
      const user = await User.findByPk(userId);
      const form = await Form.findByPk(submission.form_id);

      const isOwner = submission.submitted_by === userId;
      const isAdmin = user.role === 'admin';
      const isManager = user.role === 'manager' && form.canAccessByRole(user.role);

      if (!isOwner && !isAdmin && !isManager) {
        throw new ApiError(403, 'Access denied to this submission', 'FORBIDDEN');
      }

      // Decrypt submission data
      const decryptedData = {};
      for (const data of submission.submissionData) {
        decryptedData[data.field_id] = {
          fieldId: data.field_id,
          fieldTitle: data.field.title,
          fieldType: data.field.type,
          value: data.getDecryptedValue(),
        };
      }

      return {
        id: submission.id,
        formId: submission.form_id,
        formTitle: submission.form.title,
        status: submission.status,
        submittedBy: submission.submitter,
        submittedAt: submission.submitted_at,
        ipAddress: submission.ip_address,
        data: decryptedData,
      };
    } catch (error) {
      logger.error('Get submission failed:', error);
      throw error;
    }
  }

  /**
   * List submissions for a form
   * @param {string} formId - Form ID
   * @param {string} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Submissions with pagination
   */
  static async listSubmissions(formId, userId, filters = {}) {
    try {
      // Check if user has access to the form
      const user = await User.findByPk(userId);
      const form = await Form.findByPk(formId);

      if (!form) {
        throw new ApiError(404, 'Form not found', 'FORM_NOT_FOUND');
      }

      const isCreator = form.created_by === userId;
      const isAdmin = user.role === 'admin';
      const isManager = user.role === 'manager' && form.canAccessByRole(user.role);

      const where = { form_id: formId };

      // Regular users can only see their own submissions
      if (!isAdmin && !isManager && !isCreator) {
        where.submitted_by = userId;
      }

      // Apply status filter
      if (filters.status) {
        where.status = filters.status;
      }

      // Pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const offset = (page - 1) * limit;

      const { count, rows } = await Submission.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'submitter',
            attributes: ['id', 'username', 'email'],
          },
        ],
        order: [['submitted_at', 'DESC']],
        limit,
        offset,
      });

      return {
        submissions: rows.map((s) => ({
          id: s.id,
          status: s.status,
          submittedBy: s.submitter,
          submittedAt: s.submitted_at,
        })),
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
          hasMore: page * limit < count,
        },
      };
    } catch (error) {
      logger.error('List submissions failed:', error);
      throw error;
    }
  }

  /**
   * Delete submission
   * @param {string} submissionId - Submission ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>}
   */
  static async deleteSubmission(submissionId, userId) {
    try {
      const submission = await Submission.findByPk(submissionId);

      if (!submission) {
        throw new ApiError(404, 'Submission not found', 'SUBMISSION_NOT_FOUND');
      }

      // Check permission
      const user = await User.findByPk(userId);
      if (submission.submitted_by !== userId && user.role !== 'admin') {
        throw new ApiError(403, 'Not authorized to delete this submission', 'FORBIDDEN');
      }

      // Create audit log before deletion
      await AuditLog.logAction({
        userId,
        action: 'delete',
        entityType: 'submission',
        entityId: submissionId,
        oldValue: { formId: submission.form_id, status: submission.status },
      });

      await submission.destroy();

      logger.info(`Submission deleted: ${submissionId} by user ${userId}`);

      return true;
    } catch (error) {
      logger.error('Submission deletion failed:', error);
      throw error;
    }
  }

  /**
   * Export submissions to CSV or JSON
   * @param {string} formId - Form ID
   * @param {string} userId - User ID
   * @param {string} format - Export format ('csv' or 'json')
   * @returns {Promise<string|Object>} Exported data
   */
  static async exportSubmissions(formId, userId, format = 'csv') {
    try {
      // Check permissions
      const user = await User.findByPk(userId);
      const form = await Form.findByPk(formId);

      if (!form) {
        throw new ApiError(404, 'Form not found', 'FORM_NOT_FOUND');
      }

      const isCreator = form.created_by === userId;
      const isAdmin = user.role === 'admin';
      const isManager = user.role === 'manager';

      if (!isAdmin && !isManager && !isCreator) {
        throw new ApiError(403, 'Not authorized to export submissions', 'FORBIDDEN');
      }

      // Get all submissions with data
      const submissions = await Submission.findAll({
        where: { form_id: formId },
        include: [
          {
            model: SubmissionData,
            as: 'submissionData',
            include: [
              {
                model: Field,
                as: 'field',
              },
            ],
          },
          {
            model: User,
            as: 'submitter',
            attributes: ['id', 'username', 'email'],
          },
        ],
        order: [['submitted_at', 'DESC']],
      });

      // Get all fields for consistent column order
      const fields = await Field.findAll({
        where: { form_id: formId },
        order: [['order', 'ASC']],
      });

      // Format data for export
      const exportData = [];

      for (const submission of submissions) {
        const row = {
          submission_id: submission.id,
          status: submission.status,
          submitted_by: submission.submitter ? submission.submitter.username : 'Unknown',
          submitted_at: submission.submitted_at,
        };

        // Add field data in order
        const dataMap = new Map();
        for (const data of submission.submissionData) {
          dataMap.set(data.field_id, data.getDecryptedValue());
        }

        for (const field of fields) {
          row[field.title] = dataMap.get(field.id) || '';
        }

        exportData.push(row);
      }

      // Export based on format
      if (format === 'json') {
        return {
          form: {
            id: form.id,
            title: form.title,
          },
          exportedAt: new Date().toISOString(),
          totalSubmissions: exportData.length,
          submissions: exportData,
        };
      } else if (format === 'csv') {
        const parser = new Parser();
        return parser.parse(exportData);
      } else {
        throw new ApiError(400, 'Invalid export format', 'INVALID_FORMAT');
      }
    } catch (error) {
      logger.error('Export submissions failed:', error);
      throw error;
    }
  }

  /**
   * Update submission status (approve/reject)
   * @param {string} submissionId - Submission ID
   * @param {string} userId - User ID
   * @param {string} newStatus - New status
   * @returns {Promise<Object>} Updated submission
   */
  static async updateSubmissionStatus(submissionId, userId, newStatus) {
    try {
      const submission = await Submission.findByPk(submissionId);

      if (!submission) {
        throw new ApiError(404, 'Submission not found', 'SUBMISSION_NOT_FOUND');
      }

      // Check permission - only admin/manager can change status
      const user = await User.findByPk(userId);
      if (user.role !== 'admin' && user.role !== 'manager') {
        throw new ApiError(403, 'Not authorized to change submission status', 'FORBIDDEN');
      }

      // Validate status
      const validStatuses = ['submitted', 'approved', 'rejected', 'archived'];
      if (!validStatuses.includes(newStatus)) {
        throw new ApiError(400, 'Invalid status', 'INVALID_STATUS');
      }

      await submission.updateStatus(newStatus, userId);

      logger.info(`Submission status updated: ${submissionId} -> ${newStatus} by ${user.username}`);

      return await this.getSubmission(submissionId, userId);
    } catch (error) {
      logger.error('Update submission status failed:', error);
      throw error;
    }
  }
}

module.exports = SubmissionService;