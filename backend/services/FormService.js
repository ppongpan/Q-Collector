/**
 * Form Service
 * Handles form CRUD operations with fields and sub-forms with Redis caching
 */

const { Op } = require('sequelize');
const { Form, Field, SubForm, User, AuditLog, sequelize } = require('../models');
const logger = require('../utils/logger.util');
const { ApiError } = require('../middleware/error.middleware');
const cacheService = require('./CacheService');
const { KEYS, POLICIES, INVALIDATION_PATTERNS } = require('../config/cache.config');

class FormService {
  /**
   * Create new form with fields and sub-forms
   * @param {string} userId - User ID creating the form
   * @param {Object} formData - Form data with fields and sub-forms
   * @returns {Promise<Object>} Created form
   */
  static async createForm(userId, formData) {
    const transaction = await sequelize.transaction();

    try {
      const {
        title,
        description,
        roles_allowed = ['user'],
        settings = {},
        fields = [],
        subForms = [],
      } = formData;

      // Validate roles
      const validRoles = ['admin', 'manager', 'user', 'viewer'];
      if (!Array.isArray(roles_allowed) || roles_allowed.some(r => !validRoles.includes(r))) {
        throw new ApiError(400, 'Invalid roles specified', 'INVALID_ROLES');
      }

      // Create form
      const form = await Form.create(
        {
          title,
          description,
          roles_allowed,
          settings,
          created_by: userId,
          is_active: false, // Start as inactive
          version: 1,
        },
        { transaction }
      );

      // Create main form fields
      if (fields && fields.length > 0) {
        for (let i = 0; i < fields.length; i++) {
          await Field.create(
            {
              form_id: form.id,
              type: fields[i].type,
              title: fields[i].title,
              placeholder: fields[i].placeholder,
              required: fields[i].required || false,
              order: fields[i].order !== undefined ? fields[i].order : i,
              options: fields[i].options || {},
              show_condition: fields[i].show_condition || null,
              telegram_config: fields[i].telegram_config || null,
              validation_rules: fields[i].validation_rules || {},
            },
            { transaction }
          );
        }
      }

      // Create sub-forms with their fields
      if (subForms && subForms.length > 0) {
        for (let i = 0; i < subForms.length; i++) {
          const subFormData = subForms[i];

          const subForm = await SubForm.create(
            {
              form_id: form.id,
              title: subFormData.title,
              description: subFormData.description,
              order: subFormData.order !== undefined ? subFormData.order : i,
            },
            { transaction }
          );

          // Create sub-form fields
          if (subFormData.fields && subFormData.fields.length > 0) {
            for (let j = 0; j < subFormData.fields.length; j++) {
              await Field.create(
                {
                  form_id: form.id,
                  sub_form_id: subForm.id,
                  type: subFormData.fields[j].type,
                  title: subFormData.fields[j].title,
                  placeholder: subFormData.fields[j].placeholder,
                  required: subFormData.fields[j].required || false,
                  order: subFormData.fields[j].order !== undefined ? subFormData.fields[j].order : j,
                  options: subFormData.fields[j].options || {},
                  show_condition: subFormData.fields[j].show_condition || null,
                  telegram_config: subFormData.fields[j].telegram_config || null,
                  validation_rules: subFormData.fields[j].validation_rules || {},
                },
                { transaction }
              );
            }
          }
        }
      }

      await transaction.commit();

      // Create audit log
      await AuditLog.logAction({
        userId,
        action: 'create',
        entityType: 'form',
        entityId: form.id,
        newValue: { title, roles_allowed },
      });

      logger.info(`Form created: ${title} by user ${userId}`);

      // Return form with all related data
      return await this.getForm(form.id, userId);
    } catch (error) {
      await transaction.rollback();
      logger.error('Form creation failed:', error);
      throw error;
    }
  }

  /**
   * Update form
   * @param {string} formId - Form ID
   * @param {string} userId - User ID making the update
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated form
   */
  static async updateForm(formId, userId, updates) {
    const transaction = await sequelize.transaction();

    try {
      const form = await Form.findByPk(formId);

      if (!form) {
        throw new ApiError(404, 'Form not found', 'FORM_NOT_FOUND');
      }

      // Check permission - only creator or admin can update
      const user = await User.findByPk(userId);
      if (form.created_by !== userId && user.role !== 'admin') {
        throw new ApiError(403, 'Not authorized to update this form', 'FORBIDDEN');
      }

      const oldValue = {
        title: form.title,
        description: form.description,
        roles_allowed: form.roles_allowed,
        settings: form.settings,
        is_active: form.is_active,
      };

      // Update basic fields
      if (updates.title !== undefined) form.title = updates.title;
      if (updates.description !== undefined) form.description = updates.description;
      if (updates.roles_allowed !== undefined) form.roles_allowed = updates.roles_allowed;
      if (updates.settings !== undefined) form.settings = updates.settings;
      if (updates.is_active !== undefined) form.is_active = updates.is_active;

      await form.save({ transaction });

      // Handle field updates if provided
      if (updates.fields !== undefined) {
        // Delete existing main fields
        await Field.destroy({
          where: { form_id: formId, sub_form_id: null },
          transaction,
        });

        // Create new fields
        for (let i = 0; i < updates.fields.length; i++) {
          await Field.create(
            {
              form_id: formId,
              ...updates.fields[i],
              order: updates.fields[i].order !== undefined ? updates.fields[i].order : i,
            },
            { transaction }
          );
        }
      }

      // Handle sub-form updates if provided
      if (updates.subForms !== undefined) {
        // Delete existing sub-forms and their fields
        await SubForm.destroy({
          where: { form_id: formId },
          transaction,
        });

        // Create new sub-forms
        for (let i = 0; i < updates.subForms.length; i++) {
          const subFormData = updates.subForms[i];

          const subForm = await SubForm.create(
            {
              form_id: formId,
              title: subFormData.title,
              description: subFormData.description,
              order: subFormData.order !== undefined ? subFormData.order : i,
            },
            { transaction }
          );

          // Create sub-form fields
          if (subFormData.fields && subFormData.fields.length > 0) {
            for (let j = 0; j < subFormData.fields.length; j++) {
              await Field.create(
                {
                  form_id: formId,
                  sub_form_id: subForm.id,
                  ...subFormData.fields[j],
                  order: subFormData.fields[j].order !== undefined ? subFormData.fields[j].order : j,
                },
                { transaction }
              );
            }
          }
        }
      }

      // Increment version
      await form.incrementVersion();

      await transaction.commit();

      // Create audit log
      await AuditLog.logAction({
        userId,
        action: 'update',
        entityType: 'form',
        entityId: formId,
        oldValue,
        newValue: updates,
      });

      logger.info(`Form updated: ${formId} by user ${userId}`);

      return await this.getForm(formId, userId);
    } catch (error) {
      await transaction.rollback();
      logger.error('Form update failed:', error);
      throw error;
    }
  }

  /**
   * Delete form
   * @param {string} formId - Form ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>}
   */
  static async deleteForm(formId, userId) {
    try {
      const form = await Form.findByPk(formId);

      if (!form) {
        throw new ApiError(404, 'Form not found', 'FORM_NOT_FOUND');
      }

      // Check permission - only creator or admin can delete
      const user = await User.findByPk(userId);
      if (form.created_by !== userId && user.role !== 'admin') {
        throw new ApiError(403, 'Not authorized to delete this form', 'FORBIDDEN');
      }

      // Create audit log before deletion
      await AuditLog.logAction({
        userId,
        action: 'delete',
        entityType: 'form',
        entityId: formId,
        oldValue: { title: form.title },
      });

      await form.destroy();

      logger.info(`Form deleted: ${formId} by user ${userId}`);

      return true;
    } catch (error) {
      logger.error('Form deletion failed:', error);
      throw error;
    }
  }

  /**
   * Get form by ID with all related data
   * @param {string} formId - Form ID
   * @param {string} userId - User ID requesting the form
   * @returns {Promise<Object>} Form with fields and sub-forms
   */
  static async getForm(formId, userId) {
    try {
      const form = await Form.scope('full').findByPk(formId);

      if (!form) {
        throw new ApiError(404, 'Form not found', 'FORM_NOT_FOUND');
      }

      // Check if user has access based on role
      const user = await User.findByPk(userId);
      if (!form.canAccessByRole(user.role) && form.created_by !== userId) {
        throw new ApiError(403, 'Access denied to this form', 'FORBIDDEN');
      }

      return form.toJSON();
    } catch (error) {
      logger.error('Get form failed:', error);
      throw error;
    }
  }

  /**
   * List forms accessible by user
   * @param {string} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Array of forms
   */
  static async listForms(userId, filters = {}) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
      }

      const where = {};

      // Admin can see all forms
      if (user.role !== 'admin') {
        // Users see forms they can access based on role or forms they created
        where[Op.or] = [
          { roles_allowed: { [Op.contains]: [user.role] } },
          { created_by: userId },
        ];
      }

      // Apply filters
      if (filters.is_active !== undefined) {
        where.is_active = filters.is_active;
      }

      if (filters.search) {
        where[Op.or] = [
          { title: { [Op.iLike]: `%${filters.search}%` } },
          { description: { [Op.iLike]: `%${filters.search}%` } },
        ];
      }

      // Pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const offset = (page - 1) * limit;

      const { count, rows } = await Form.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username', 'email', 'role'],
          },
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      });

      return {
        forms: rows.map(form => form.toJSON()),
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
          hasMore: page * limit < count,
        },
      };
    } catch (error) {
      logger.error('List forms failed:', error);
      throw error;
    }
  }

  /**
   * Duplicate form
   * @param {string} formId - Form ID to duplicate
   * @param {string} userId - User ID
   * @param {string} newTitle - Title for duplicated form
   * @returns {Promise<Object>} Duplicated form
   */
  static async duplicateForm(formId, userId, newTitle) {
    try {
      const form = await Form.findByPk(formId);

      if (!form) {
        throw new ApiError(404, 'Form not found', 'FORM_NOT_FOUND');
      }

      // Check if user has access to the form
      const user = await User.findByPk(userId);
      if (!form.canAccessByRole(user.role) && form.created_by !== userId) {
        throw new ApiError(403, 'Access denied to this form', 'FORBIDDEN');
      }

      // Use form's duplicate method
      const duplicatedForm = await form.duplicate(newTitle || `${form.title} (Copy)`, userId);

      // Create audit log
      await AuditLog.logAction({
        userId,
        action: 'create',
        entityType: 'form',
        entityId: duplicatedForm.id,
        newValue: {
          duplicated_from: formId,
          title: duplicatedForm.title,
        },
      });

      logger.info(`Form duplicated: ${formId} -> ${duplicatedForm.id} by user ${userId}`);

      return await this.getForm(duplicatedForm.id, userId);
    } catch (error) {
      logger.error('Form duplication failed:', error);
      throw error;
    }
  }

  /**
   * Toggle form active status
   * @param {string} formId - Form ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated form
   */
  static async toggleFormStatus(formId, userId) {
    try {
      const form = await Form.findByPk(formId);

      if (!form) {
        throw new ApiError(404, 'Form not found', 'FORM_NOT_FOUND');
      }

      // Check permission
      const user = await User.findByPk(userId);
      if (form.created_by !== userId && user.role !== 'admin') {
        throw new ApiError(403, 'Not authorized to modify this form', 'FORBIDDEN');
      }

      const oldStatus = form.is_active;
      form.is_active = !form.is_active;
      await form.save();

      // Create audit log
      await AuditLog.logAction({
        userId,
        action: 'update',
        entityType: 'form',
        entityId: formId,
        oldValue: { is_active: oldStatus },
        newValue: { is_active: form.is_active },
      });

      logger.info(`Form status toggled: ${formId} -> ${form.is_active ? 'active' : 'inactive'}`);

      return form.toJSON();
    } catch (error) {
      logger.error('Form status toggle failed:', error);
      throw error;
    }
  }
}

module.exports = FormService;