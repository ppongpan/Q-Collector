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
const DynamicTableService = require('./DynamicTableService');

// Initialize DynamicTableService
const dynamicTableService = new DynamicTableService();

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
        roles_allowed = ['general_user'],
        settings = {},
        fields = [],
        subForms = [],
        sub_forms = [], // Accept snake_case from API
        is_active = true, // Default to true (matches model default)
      } = formData;

      // Use sub_forms if provided (from frontend), otherwise use subForms
      const subFormsArray = sub_forms.length > 0 ? sub_forms : subForms;

      logger.info(`Creating form: ${title}, subForms: ${subFormsArray.length}`);

      // Validate roles
      const validRoles = ['super_admin', 'admin', 'moderator', 'customer_service', 'technic', 'sale', 'marketing', 'general_user'];
      if (!Array.isArray(roles_allowed) || roles_allowed.some(r => !validRoles.includes(r))) {
        throw new ApiError(400, 'Invalid roles specified', 'INVALID_ROLES');
      }

      // ✅ NEW: Validate no duplicate field names in main form
      if (fields && fields.length > 0) {
        const fieldTitles = fields.map(f => f.title?.trim().toLowerCase()).filter(Boolean);
        const duplicates = fieldTitles.filter((title, index) => fieldTitles.indexOf(title) !== index);
        if (duplicates.length > 0) {
          throw new ApiError(400, `Duplicate field names found in main form: ${[...new Set(duplicates)].join(', ')}`, 'DUPLICATE_FIELD_NAMES');
        }
      }

      // ✅ NEW: Validate no duplicate field names in each sub-form
      if (subFormsArray && subFormsArray.length > 0) {
        for (let i = 0; i < subFormsArray.length; i++) {
          const subFormFields = subFormsArray[i].fields || [];
          if (subFormFields.length > 0) {
            const fieldTitles = subFormFields.map(f => f.title?.trim().toLowerCase()).filter(Boolean);
            const duplicates = fieldTitles.filter((title, index) => fieldTitles.indexOf(title) !== index);
            if (duplicates.length > 0) {
              throw new ApiError(400, `Duplicate field names found in sub-form "${subFormsArray[i].title}": ${[...new Set(duplicates)].join(', ')}`, 'DUPLICATE_FIELD_NAMES');
            }
          }
        }
      }

      // Create form
      const form = await Form.create(
        {
          title,
          description,
          roles_allowed,
          settings,
          created_by: userId,
          is_active, // Use value from formData, defaults to true
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
              show_in_table: fields[i].showInTable || false,
              send_telegram: fields[i].sendTelegram || false,
              telegram_order: fields[i].telegramOrder || 0,
              telegram_prefix: fields[i].telegramPrefix || null,
            },
            { transaction }
          );
        }
      }

      // Create sub-forms with their fields
      if (subFormsArray && subFormsArray.length > 0) {
        logger.info(`Creating ${subFormsArray.length} sub-forms`);
        for (let i = 0; i < subFormsArray.length; i++) {
          const subFormData = subFormsArray[i];
          logger.info(`  SubForm ${i + 1}: ${subFormData.title}, fields: ${subFormData.fields?.length || 0}`);

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
                  form_id: form.id, // ✅ FIX: Use main form.id (must exist in forms table)
                  sub_form_id: subForm.id, // Link to sub-form
                  type: subFormData.fields[j].type,
                  title: subFormData.fields[j].title,
                  placeholder: subFormData.fields[j].placeholder,
                  required: subFormData.fields[j].required || false,
                  order: subFormData.fields[j].order !== undefined ? subFormData.fields[j].order : j,
                  options: subFormData.fields[j].options || {},
                  show_condition: subFormData.fields[j].show_condition || null,
                  telegram_config: subFormData.fields[j].telegram_config || null,
                  validation_rules: subFormData.fields[j].validation_rules || {},
                  show_in_table: subFormData.fields[j].showInTable || false,
                  send_telegram: subFormData.fields[j].sendTelegram || false,
                  telegram_order: subFormData.fields[j].telegramOrder || 0,
                  telegram_prefix: subFormData.fields[j].telegramPrefix || null,
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

      // ✅ CRITICAL FIX: Query form again AFTER transaction commit to get all fields
      // This ensures sub-form fields are properly populated with sub_form_id
      const formWithFields = await Form.findByPk(form.id, {
        include: [
          {
            association: 'fields',
            separate: true,
            order: [['order', 'ASC']]
          },
          {
            association: 'subForms',
            separate: true,
            order: [['order', 'ASC']],
            include: [{
              association: 'fields',
              separate: true,
              order: [['order', 'ASC']]
            }]
          }
        ]
      });

      // ⚠️ CRITICAL FIX: Filter to ONLY main form fields (sub_form_id IS NULL)
      // The 'fields' association includes ALL fields, including sub-form fields
      // We must filter to only main form fields for the dynamic table
      const mainFormFields = (formWithFields.fields || []).filter(field => field.sub_form_id === null || field.sub_form_id === undefined);

      logger.info(`Main form has ${mainFormFields.length} main fields (filtered from ${formWithFields.fields?.length || 0} total fields)`);

      // Create dynamic PostgreSQL table for this form
      try {
        // Add timeout to prevent hanging on translation API
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Table creation timeout after 30s')), 30000)
        );

        const tablePromise = dynamicTableService.createFormTable({
          id: formWithFields.id,
          title: formWithFields.title,
          fields: mainFormFields
        });

        const tableName = await Promise.race([tablePromise, timeoutPromise]);
        logger.info(`Dynamic table created: ${tableName} for form ${form.id}`);

        // Create sub-form tables if sub-forms exist
        if (formWithFields.subForms && formWithFields.subForms.length > 0) {
          for (const subForm of formWithFields.subForms) {
            try {
              // ✅ Query sub-form fields directly to ensure they're loaded
              const subFormFields = await Field.findAll({
                where: { sub_form_id: subForm.id },
                order: [['order', 'ASC']]
              });

              logger.info(`Sub-form ${subForm.id} has ${subFormFields.length} fields`);

              const subFormTableName = await dynamicTableService.createSubFormTable(
                {
                  id: subForm.id,
                  title: subForm.title,
                  fields: subFormFields
                },
                tableName,
                formWithFields.id
              );
              logger.info(`Sub-form table created: ${subFormTableName} for sub-form ${subForm.id}`);

              // ⚠️ CRITICAL FIX: Save table_name back to SubForm
              const dbSubForm = await SubForm.findByPk(subForm.id);
              if (dbSubForm) {
                dbSubForm.table_name = subFormTableName;
                await dbSubForm.save();
                logger.info(`Saved table_name to SubForm: ${subFormTableName}`);
              }
            } catch (subTableError) {
              logger.error(`Failed to create sub-form table for ${subForm.id}:`, subTableError);
              // Continue with other sub-forms even if one fails
            }
          }
        }
      } catch (tableError) {
        logger.error(`Failed to create dynamic table for form ${form.id}:`, {
          error: tableError.message,
          stack: tableError.stack,
          formTitle: formWithFields.title
        });
        // ⚠️ IMPORTANT: Don't fail the entire form creation if table creation fails
        // Reasons:
        // 1. Translation API might be slow/unavailable
        // 2. Database might be temporarily unavailable
        // 3. Table can be created later manually via sync script
        // The form metadata is already saved, only the dynamic table failed
      }

      // Return form with all related data
      return formWithFields;
    } catch (error) {
      await transaction.rollback();
      logger.error('Form creation failed:', error);
      throw error;
    }
  }

  /**
   * Detect field changes between old and new field arrays
   *
   * @param {Array} oldFields - Previous fields
   * @param {Array} newFields - Updated fields
   * @param {string} tableName - Dynamic table name
   * @param {string} formId - Form UUID
   * @returns {Array} Array of change objects for migration queue
   */
  static async detectFieldChanges(oldFields, newFields, tableName, formId) {
    const changes = [];

    logger.info(`Detecting field changes for table "${tableName}": ${oldFields.length} old fields, ${newFields.length} new fields`);

    // Helper to ensure field has column_name and data_type
    const ensureFieldProperties = async (field) => {
      if (!field) return null;

      // If field is a Sequelize instance, call toJSON() to get virtual properties
      const fieldData = field.toJSON ? field.toJSON() : field;

      // Ensure column_name exists
      if (!fieldData.column_name || typeof fieldData.column_name !== 'string') {
        const { generateColumnName } = require('../utils/tableNameHelper');
        fieldData.column_name = await generateColumnName(fieldData.title, fieldData.id);
      }

      // Ensure data_type exists
      if (!fieldData.data_type) {
        fieldData.data_type = fieldData.type;
      }

      return fieldData;
    };

    // Create maps for efficient lookup (with property normalization)
    const normalizedOldFields = await Promise.all(
      oldFields.map(f => ensureFieldProperties(f))
    );
    const oldFieldMap = new Map(
      normalizedOldFields
        .filter(f => f && f.id)
        .map(f => [f.id, f])
    );

    // ✅ FIXED: Process ALL new fields, not just those with IDs
    // Fields without IDs are new additions
    const newFieldsWithIds = [];
    const newFieldsWithoutIds = [];

    for (const field of newFields) {
      const normalizedField = await ensureFieldProperties(field);
      if (normalizedField) {
        if (normalizedField.id) {
          newFieldsWithIds.push(normalizedField);
        } else {
          newFieldsWithoutIds.push(normalizedField);
        }
      }
    }

    const newFieldMap = new Map(newFieldsWithIds.map(f => [f.id, f]));

    // Detect additions - NEW FIELDS WITHOUT IDs
    for (const newField of newFieldsWithoutIds) {
      changes.push({
        type: 'ADD_FIELD',
        fieldId: null, // No ID yet - will be created by Field.create()
        tableName,
        formId,
        columnName: newField.column_name,
        dataType: newField.data_type
      });
      logger.info(`ADD_FIELD detected (new): ${newField.column_name} (${newField.data_type})`);
    }

    // Detect additions - FIELDS WITH IDs that weren't in old fields (restored from backup, etc.)
    for (const [newFieldId, newField] of newFieldMap) {
      if (!oldFieldMap.has(newFieldId)) {
        changes.push({
          type: 'ADD_FIELD',
          fieldId: newField.id,
          tableName,
          formId,
          columnName: newField.column_name,
          dataType: newField.data_type
        });
        logger.info(`ADD_FIELD detected (restored): ${newField.column_name} (${newField.data_type})`);
      }
    }

    // Detect deletions (fields in oldFields but not in newFields)
    for (const [oldFieldId, oldField] of oldFieldMap) {
      if (!newFieldMap.has(oldFieldId)) {
        changes.push({
          type: 'DELETE_FIELD',
          fieldId: oldField.id,
          tableName,
          formId,
          columnName: oldField.column_name
        });
        logger.info(`DELETE_FIELD detected: ${oldField.column_name}`);
      }
    }

    // Detect modifications (same id, different properties)
    for (const [fieldId, oldField] of oldFieldMap) {
      const newField = newFieldMap.get(fieldId);
      if (!newField) continue; // Field deleted, already handled

      // Detect column renames
      if (oldField.column_name !== newField.column_name) {
        changes.push({
          type: 'RENAME_FIELD',
          fieldId: fieldId,
          tableName,
          formId,
          oldColumnName: oldField.column_name,
          newColumnName: newField.column_name
        });
        logger.info(`RENAME_FIELD detected: ${oldField.column_name} -> ${newField.column_name}`);
      }

      // Detect type changes (only if column name is the same or after rename)
      if (oldField.data_type !== newField.data_type) {
        changes.push({
          type: 'CHANGE_TYPE',
          fieldId: fieldId,
          tableName,
          formId,
          columnName: newField.column_name, // Use new column name
          oldType: oldField.data_type,
          newType: newField.data_type
        });
        logger.info(`CHANGE_TYPE detected: ${newField.column_name} (${oldField.data_type} -> ${newField.data_type})`);
      }
    }

    logger.info(`Field change detection complete: ${changes.length} changes detected`);

    return changes;
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
      // ✅ Log incoming updates to debug sub-forms and settings
      logger.info(`updateForm called for ${formId}:`, {
        hasSubForms: updates.subForms !== undefined,
        hasSubFormsSnake: updates.sub_forms !== undefined,
        subFormsLength: updates.subForms?.length,
        subFormsSnakeLength: updates.sub_forms?.length,
        hasTelegramSettings: updates.telegram_settings !== undefined,
        hasRolesAllowed: updates.roles_allowed !== undefined,
        telegramSettings: updates.telegram_settings,
        rolesAllowed: updates.roles_allowed,
      });

      // ✅ NEW: Load existing form with ALL fields and sub-forms BEFORE making changes
      // This is critical for change detection
      const oldForm = await Form.findByPk(formId, {
        include: [
          {
            model: Field,
            as: 'fields',
            separate: true,
            order: [['order', 'ASC']]
          },
          {
            model: SubForm,
            as: 'subForms',
            separate: true,
            order: [['order', 'ASC']],
            include: [{
              model: Field,
              as: 'fields',
              separate: true,
              order: [['order', 'ASC']]
            }]
          }
        ]
      });

      const form = oldForm; // Rename for consistency with existing code

      if (!form) {
        throw new ApiError(404, 'Form not found', 'FORM_NOT_FOUND');
      }

      // Check permission - only creator, admin, or super_admin can update
      const user = await User.findByPk(userId);
      if (form.created_by !== userId && user.role !== 'admin' && user.role !== 'super_admin') {
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
      if (updates.roles_allowed !== undefined) {
        logger.info(`Setting roles_allowed from ${JSON.stringify(form.roles_allowed)} to ${JSON.stringify(updates.roles_allowed)}`);
        form.roles_allowed = updates.roles_allowed;
      }

      // Handle settings update
      if (updates.settings !== undefined) {
        form.settings = updates.settings;
      }

      // Handle telegram_settings - merge into settings.telegram
      if (updates.telegram_settings !== undefined) {
        form.settings = {
          ...form.settings,
          telegram: updates.telegram_settings
        };
      }

      if (updates.is_active !== undefined) form.is_active = updates.is_active;

      logger.info(`Before save - roles_allowed: ${JSON.stringify(form.roles_allowed)}`);
      await form.save({ transaction });
      logger.info(`After save - roles_allowed: ${JSON.stringify(form.roles_allowed)}`);

      // Handle field updates if provided
      // ✅ FIXED: UPDATE strategy instead of DELETE+CREATE to preserve field IDs
      // This enables proper RENAME_FIELD and CHANGE_TYPE migration detection
      if (updates.fields !== undefined) {
        // Get existing main fields
        const existingFields = await Field.findAll({
          where: { form_id: formId, sub_form_id: null },
          transaction,
        });

        const existingFieldIds = new Set(existingFields.map(f => f.id));
        const updatedFieldIds = new Set();

        // Update or create fields
        for (let i = 0; i < updates.fields.length; i++) {
          const fieldData = updates.fields[i];

          // If field has ID and exists, UPDATE it
          if (fieldData.id && existingFieldIds.has(fieldData.id)) {
            const field = existingFields.find(f => f.id === fieldData.id);

            // Update all properties
            field.type = fieldData.type;
            field.title = fieldData.title;
            field.placeholder = fieldData.placeholder;
            field.required = fieldData.required || false;
            field.order = fieldData.order !== undefined ? fieldData.order : i;
            field.options = fieldData.options || {};
            field.show_condition = fieldData.show_condition || null;
            field.telegram_config = fieldData.telegram_config || null;
            field.validation_rules = fieldData.validation_rules || {};
            field.show_in_table = fieldData.showInTable || false;
            field.send_telegram = fieldData.sendTelegram || false;
            field.telegram_order = fieldData.telegramOrder || 0;
            field.telegram_prefix = fieldData.telegramPrefix || null;

            await field.save({ transaction });
            updatedFieldIds.add(field.id);

            logger.info(`  Updated field ${field.id}: ${field.title} (type: ${field.type})`);
          } else {
            // Create new field
            const newField = await Field.create(
              {
                form_id: formId,
                type: fieldData.type,
                title: fieldData.title,
                placeholder: fieldData.placeholder,
                required: fieldData.required || false,
                order: fieldData.order !== undefined ? fieldData.order : i,
                options: fieldData.options || {},
                show_condition: fieldData.show_condition || null,
                telegram_config: fieldData.telegram_config || null,
                validation_rules: fieldData.validation_rules || {},
                show_in_table: fieldData.showInTable || false,
                send_telegram: fieldData.sendTelegram || false,
                telegram_order: fieldData.telegramOrder || 0,
                telegram_prefix: fieldData.telegramPrefix || null,
              },
              { transaction }
            );
            updatedFieldIds.add(newField.id);

            logger.info(`  Created field ${newField.id}: ${newField.title} (type: ${newField.type})`);
          }
        }

        // Delete fields that are no longer in the updated list
        const fieldsToDelete = existingFields.filter(f => !updatedFieldIds.has(f.id));
        for (const field of fieldsToDelete) {
          await field.destroy({ transaction });
          logger.info(`  Deleted field ${field.id}: ${field.title}`);
        }
      }

      // Handle sub-form updates if provided
      // Support both snake_case (sub_forms) and camelCase (subForms)
      const subFormsArray = updates.sub_forms !== undefined ? updates.sub_forms : updates.subForms;

      if (subFormsArray !== undefined) {
        logger.info(`Updating sub-forms for form ${formId}: ${subFormsArray.length} sub-forms`);

        // ✅ CRITICAL FIX: UPDATE instead of DELETE+CREATE to preserve IDs and table_name
        // Get existing sub-forms
        const existingSubForms = await SubForm.findAll({
          where: { form_id: formId },
          transaction,
        });

        // Track which sub-forms to keep
        const existingSubFormIds = new Set(existingSubForms.map(sf => sf.id));
        const updatedSubFormIds = new Set();

        // Update or create sub-forms
        for (let i = 0; i < subFormsArray.length; i++) {
          const subFormData = subFormsArray[i];
          let subForm;

          // If sub-form has ID and exists, UPDATE it
          if (subFormData.id && existingSubFormIds.has(subFormData.id)) {
            subForm = existingSubForms.find(sf => sf.id === subFormData.id);
            subForm.title = subFormData.title;
            subForm.description = subFormData.description;
            subForm.order = subFormData.order !== undefined ? subFormData.order : i;
            await subForm.save({ transaction });
            updatedSubFormIds.add(subForm.id);
            logger.info(`  Updated sub-form ${subForm.id}: ${subForm.title}`);
          } else {
            // Create new sub-form
            subForm = await SubForm.create(
              {
                form_id: formId,
                title: subFormData.title,
                description: subFormData.description,
                order: subFormData.order !== undefined ? subFormData.order : i,
              },
              { transaction }
            );
            updatedSubFormIds.add(subForm.id);
            logger.info(`  Created sub-form ${subForm.id}: ${subForm.title}`);
          }

          // ✅ FIXED: UPDATE strategy for sub-form fields to preserve field IDs
          const existingSubFormFields = await Field.findAll({
            where: { form_id: formId, sub_form_id: subForm.id },
            transaction,
          });

          const existingSubFieldIds = new Set(existingSubFormFields.map(f => f.id));
          const updatedSubFieldIds = new Set();

          if (subFormData.fields && subFormData.fields.length > 0) {
            for (let j = 0; j < subFormData.fields.length; j++) {
              const fieldData = subFormData.fields[j];

              // If field has ID and exists, UPDATE it
              if (fieldData.id && existingSubFieldIds.has(fieldData.id)) {
                const field = existingSubFormFields.find(f => f.id === fieldData.id);

                // Update all properties
                field.type = fieldData.type;
                field.title = fieldData.title;
                field.placeholder = fieldData.placeholder;
                field.required = fieldData.required || false;
                field.order = fieldData.order !== undefined ? fieldData.order : j;
                field.options = fieldData.options || {};
                field.show_condition = fieldData.show_condition || null;
                field.telegram_config = fieldData.telegram_config || null;
                field.validation_rules = fieldData.validation_rules || {};
                field.show_in_table = fieldData.showInTable || false;
                field.send_telegram = fieldData.sendTelegram || false;
                field.telegram_order = fieldData.telegramOrder || 0;
                field.telegram_prefix = fieldData.telegramPrefix || null;

                await field.save({ transaction });
                updatedSubFieldIds.add(field.id);

                logger.info(`    Updated sub-form field ${field.id}: ${field.title} (type: ${field.type})`);
              } else {
                // Create new field
                const newField = await Field.create(
                  {
                    form_id: formId,
                    sub_form_id: subForm.id,
                    type: fieldData.type,
                    title: fieldData.title,
                    placeholder: fieldData.placeholder,
                    required: fieldData.required || false,
                    order: fieldData.order !== undefined ? fieldData.order : j,
                    options: fieldData.options || {},
                    show_condition: fieldData.show_condition || null,
                    telegram_config: fieldData.telegram_config || null,
                    validation_rules: fieldData.validation_rules || {},
                    show_in_table: fieldData.showInTable || false,
                    send_telegram: fieldData.sendTelegram || false,
                    telegram_order: fieldData.telegramOrder || 0,
                    telegram_prefix: fieldData.telegramPrefix || null,
                  },
                  { transaction }
                );
                updatedSubFieldIds.add(newField.id);

                logger.info(`    Created sub-form field ${newField.id}: ${newField.title} (type: ${newField.type})`);
              }
            }
          }

          // Delete sub-form fields that are no longer in the updated list
          const subFieldsToDelete = existingSubFormFields.filter(f => !updatedSubFieldIds.has(f.id));
          for (const field of subFieldsToDelete) {
            await field.destroy({ transaction });
            logger.info(`    Deleted sub-form field ${field.id}: ${field.title}`);
          }
        }

        // Delete sub-forms that are no longer in the update
        const subFormsToDelete = existingSubForms.filter(sf => !updatedSubFormIds.has(sf.id));
        for (const subForm of subFormsToDelete) {
          logger.info(`  Deleting sub-form ${subForm.id}: ${subForm.title}`);
          await SubForm.destroy({
            where: { id: subForm.id },
            transaction,
          });
        }
      }

      // Increment version within the same transaction
      await form.incrementVersion({ transaction });

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

      // ✅ NEW: Queue migrations for field changes (non-blocking)
      // This replaces the old direct ALTER TABLE approach
      if (updates.fields !== undefined || subFormsArray !== undefined) {
        try {
          const MigrationQueue = require('./MigrationQueue');
          const formWithFields = await this.getForm(formId, userId);

          // ✅ Detect and queue main form field changes
          if (updates.fields !== undefined && form.table_name) {
            const oldMainFields = (oldForm.fields || []).filter(f => !f.sub_form_id);
            const newMainFields = (formWithFields.fields || []).filter(f => !f.sub_form_id);

            logger.info(`Detecting main form field changes: ${oldMainFields.length} old -> ${newMainFields.length} new`);

            const mainFormChanges = await this.detectFieldChanges(
              oldMainFields,
              newMainFields,
              form.table_name,
              formId
            );

            // Queue migrations for main form
            for (const change of mainFormChanges) {
              await MigrationQueue.add({
                ...change,
                userId
              });
              logger.info(`Queued main form migration: ${change.type} for ${change.columnName || change.oldColumnName}`);
            }
          }

          // ✅ Detect and queue sub-form field changes
          if (subFormsArray !== undefined) {
            for (const subFormUpdate of subFormsArray) {
              const oldSubForm = (oldForm.subForms || []).find(sf => sf.id === subFormUpdate.id);
              const newSubForm = (formWithFields.subForms || []).find(sf => sf.id === subFormUpdate.id);

              // Only process if sub-form exists in both old and new, and has a table
              if (oldSubForm && newSubForm && newSubForm.table_name) {
                logger.info(`Detecting sub-form field changes for "${newSubForm.title}": ${oldSubForm.fields?.length || 0} old -> ${newSubForm.fields?.length || 0} new`);

                const subFormChanges = await this.detectFieldChanges(
                  oldSubForm.fields || [],
                  newSubForm.fields || [],
                  newSubForm.table_name,
                  formId
                );

                // Queue migrations for sub-form
                for (const change of subFormChanges) {
                  await MigrationQueue.add({
                    ...change,
                    userId,
                    isSubForm: true,
                    subFormId: newSubForm.id
                  });
                  logger.info(`Queued sub-form migration: ${change.type} for ${change.columnName || change.oldColumnName} (sub-form: ${newSubForm.title})`);
                }
              }
            }
          }

          logger.info('All field migrations queued successfully');

        } catch (migrationQueueError) {
          // ✅ CRITICAL: Don't fail form update if migration queuing fails
          // Log error and optionally send notification, but continue
          logger.error('Failed to queue migrations (form update succeeded):', migrationQueueError);

          // Optional: Send Telegram notification for critical errors
          try {
            const TelegramService = require('./TelegramService');
            if (TelegramService && typeof TelegramService.sendAlert === 'function') {
              await TelegramService.sendAlert({
                title: '⚠️ Migration Queue Error',
                formId,
                error: migrationQueueError.message,
                note: 'Form update succeeded, but field migrations could not be queued'
              });
            }
          } catch (notificationError) {
            logger.warn('Failed to send Telegram notification:', notificationError.message);
          }
        }
      }

      // ✅ Handle table creation for new forms (tables that don't exist yet)
      if (!form.table_name && updates.fields !== undefined) {
        try {
          const formWithFields = await this.getForm(formId, userId);
          const mainFormFields = (formWithFields.fields || []).filter(f => !f.sub_form_id);

          const tableName = await dynamicTableService.createFormTable({
            id: formWithFields.id,
            title: formWithFields.title,
            fields: mainFormFields
          });
          logger.info(`Dynamic table created for new form: ${tableName}`);
        } catch (tableCreationError) {
          logger.error('Failed to create dynamic table for new form:', tableCreationError);
        }
      }

      // ✅ DEADLOCK FIX: Handle sub-form table creation (for new sub-forms without tables)
      // Use updatedSubFormIds set to avoid unnecessary queries
      if (subFormsArray !== undefined) {
        try {
          const formWithFields = await this.getForm(formId, userId);
          const mainTableName = form.table_name;

          if (mainTableName) {
            for (const subForm of formWithFields.subForms || []) {
              // ⚡ DEADLOCK FIX: Check table_name directly from query result, don't fetch again
              if (!subForm.table_name) {
                // Create new sub-form table (outside transaction)
                const subFormTableName = await dynamicTableService.createSubFormTable(
                  {
                    id: subForm.id,
                    title: subForm.title,
                    fields: subForm.fields || []
                  },
                  mainTableName,
                  formId
                );
                logger.info(`Sub-form table created: ${subFormTableName} for sub-form ${subForm.id}`);

                // ⚡ DEADLOCK FIX: Use direct UPDATE query instead of Sequelize save()
                // This avoids SELECT lock issues
                await sequelize.query(
                  'UPDATE sub_forms SET table_name = :tableName WHERE id = :subFormId',
                  {
                    replacements: { tableName: subFormTableName, subFormId: subForm.id },
                    type: sequelize.QueryTypes.UPDATE
                  }
                );
                logger.info(`Saved table_name to SubForm: ${subFormTableName}`);
              }
            }
          }
        } catch (subFormTableError) {
          logger.error('Failed to create sub-form tables:', subFormTableError);
        }
      }

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
    const transaction = await sequelize.transaction();

    try {
      const form = await Form.findByPk(formId, {
        include: [
          {
            association: 'subForms',
            attributes: ['id', 'table_name']
          }
        ]
      });

      if (!form) {
        throw new ApiError(404, 'Form not found', 'FORM_NOT_FOUND');
      }

      // Check permission - only creator or admin can delete
      const user = await User.findByPk(userId);
      if (form.created_by !== userId && user.role !== 'admin' && user.role !== 'super_admin') {
        throw new ApiError(403, 'Not authorized to delete this form', 'FORBIDDEN');
      }

      // Get table names before deletion
      const mainTableName = form.table_name;
      const subFormTableNames = form.subForms?.map(sf => sf.table_name).filter(Boolean) || [];

      logger.info(`Deleting form ${formId}: main table=${mainTableName}, sub-form tables=${subFormTableNames.length}`);

      // Create audit log before deletion
      await AuditLog.logAction({
        userId,
        action: 'delete',
        entityType: 'form',
        entityId: formId,
        oldValue: {
          title: form.title,
          table_name: mainTableName,
          subFormTables: subFormTableNames
        },
      });

      // Delete dynamic tables first (before CASCADE deletes the records)
      if (mainTableName) {
        try {
          await dynamicTableService.dropFormTable(mainTableName);
          logger.info(`Dropped main table: ${mainTableName}`);
        } catch (error) {
          logger.error(`Failed to drop main table ${mainTableName}:`, error.message);
          // Continue anyway - table might not exist
        }
      }

      // Delete sub-form tables
      for (const tableName of subFormTableNames) {
        try {
          await dynamicTableService.dropFormTable(tableName);
          logger.info(`Dropped sub-form table: ${tableName}`);
        } catch (error) {
          logger.error(`Failed to drop sub-form table ${tableName}:`, error.message);
          // Continue anyway
        }
      }

      // Explicitly delete sub-forms (in case CASCADE is not configured)
      if (form.subForms && form.subForms.length > 0) {
        await SubForm.destroy({
          where: { form_id: formId },
          transaction
        });
        logger.info(`Deleted ${form.subForms.length} sub-form records`);
      }

      // Delete fields (in case CASCADE is not configured)
      await Field.destroy({
        where: { form_id: formId },
        transaction
      });
      logger.info(`Deleted field records for form ${formId}`);

      // Delete form record (CASCADE will delete submissions)
      await form.destroy({ transaction });

      await transaction.commit();

      logger.info(`Form deleted completely: ${formId} by user ${userId}`);

      return true;
    } catch (error) {
      await transaction.rollback();
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
      const form = await Form.findByPk(formId, {
        include: [
          {
            association: 'fields',
            separate: true,
            order: [['order', 'ASC']]
          },
          {
            association: 'subForms',
            separate: true,
            order: [['order', 'ASC']],
            include: [{
              association: 'fields',
              separate: true,
              order: [['order', 'ASC']]
            }]
          }
        ]
      });

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