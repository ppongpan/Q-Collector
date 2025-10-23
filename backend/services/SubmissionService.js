/**
 * Submission Service
 * Handles form submissions with automatic field encryption and Redis caching
 */

const { Op } = require('sequelize');
const { Submission, SubmissionData, Form, Field, SubForm, User, AuditLog, sequelize } = require('../models');
const logger = require('../utils/logger.util');
const { ApiError } = require('../middleware/error.middleware');
const { Parser } = require('json2csv');
const cacheService = require('./CacheService');
const { KEYS, POLICIES, INVALIDATION_PATTERNS } = require('../config/cache.config');
const DynamicTableService = require('./DynamicTableService');
const { generateColumnName } = require('../utils/tableNameHelper');

class SubmissionService {
  /**
   * Create new submission
   * @param {string} formId - Form ID (can be Form.id or SubForm.id)
   * @param {string} userId - User ID submitting the form
   * @param {Object} data - Submission data
   * @param {Object} metadata - Request metadata (ip, userAgent)
   * @returns {Promise<Object>} Created submission
   */
  static async createSubmission(formId, userId, data, metadata = {}) {
    const transaction = await sequelize.transaction();

    try {
      // ✅ CRITICAL FIX: Extract subFormId, skipValidation, and visibleFieldIds from data
      const { fieldData, status = 'submitted', parentId = null, subFormId = null, skipValidation = false, visibleFieldIds = null } = data;

      logger.info('🔍 DEBUG Backend: Received data:', {
        hasFieldData: !!fieldData,
        status,
        parentId,
        subFormId,
        skipValidation,
        visibleFieldIds,
        visibleFieldIdsCount: visibleFieldIds ? visibleFieldIds.length : 0
      });

      // ✅ FIX: Try to find as Form first, then as SubForm
      let form = await Form.scope('full').findByPk(formId);
      let isSubForm = false;
      let actualFormId = formId;
      let actualSubFormId = subFormId; // Store the sub-form ID

      let subFormRecord = null; // Store SubForm for later use

      if (!form) {
        // Try finding as SubForm
        subFormRecord = await SubForm.findByPk(formId);

        if (subFormRecord) {
          // For SubForm, get the parent form for permission checking
          form = await Form.scope('full').findByPk(subFormRecord.form_id);
          isSubForm = true;
          actualFormId = formId; // SubForm.id for querying fields
          actualSubFormId = formId; // subFormId is the formId when creating directly
        }
      }

      if (!form) {
        throw new ApiError(404, 'Form not found', 'FORM_NOT_FOUND');
      }

      // Check if form is active
      if (!form.is_active && status !== 'draft') {
        throw new ApiError(403, 'Form is not active', 'FORM_INACTIVE');
      }

      // Check if user has access based on role and get username
      const user = await User.findByPk(userId);
      if (!form.canAccessByRole(user.role) && form.created_by !== userId) {
        throw new ApiError(403, 'Access denied to this form', 'FORBIDDEN');
      }
      const username = user.username;

      // ✅ FIX: Get fields for SubForm or Form
      // For sub-forms, query by sub_form_id; for forms, query by form_id
      const allFields = await Field.findAll({
        where: isSubForm ? { sub_form_id: actualFormId } : { form_id: actualFormId },
      });

      // Create field map for quick lookup
      const fieldMap = new Map();
      allFields.forEach((field) => {
        fieldMap.set(field.id, field);
      });

      // ✅ CRITICAL FIX: Skip validation if skipValidation flag is true (for Google Sheets imports)
      if (!skipValidation) {
        // Validate submission data
        const validationErrors = [];
        for (const [fieldId, value] of Object.entries(fieldData)) {
          const field = fieldMap.get(fieldId);

          if (!field) {
            continue; // Skip unknown fields
          }

          // ✅ CRITICAL FIX: Skip validation for hidden fields
          // If visibleFieldIds is provided and field is not in the list, it's hidden
          if (visibleFieldIds && !visibleFieldIds.includes(fieldId)) {
            logger.info(`⏭️ Skipping validation for hidden field: ${field.title} (${fieldId})`);
            continue;
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
      } else {
        logger.info('⚠️  Validation skipped for Google Sheets import');
      }

      // ✅ CRITICAL FIX: Always use parent form.id (satisfies FK constraint)
      // For sub-forms: form.id is the parent form
      // For main forms: form.id is the form itself

      // ✅ CRITICAL FIX: Detect sub-form by checking if actualSubFormId exists
      const isActuallySubForm = !!actualSubFormId;

      // ✅ CRITICAL FIX: Main form submissions MUST have parent_id = NULL
      // Only sub-form submissions should have parent_id set
      const finalParentId = isActuallySubForm ? parentId : null;

      logger.info(`📝 Creating submission record:`, {
        formId: form.id,
        subFormId: actualSubFormId,
        isSubForm: isActuallySubForm,
        parentId: finalParentId,
        requestedParentId: parentId
      });

      const submission = await Submission.create(
        {
          form_id: form.id, // ✅ Always parent form.id (FK to forms table)
          sub_form_id: actualSubFormId, // ✅ Store sub_form_id for sub-form submissions (can be null for main forms)
          submitted_by: userId,
          status,
          parent_id: finalParentId, // ✅ NULL for main forms, parentId for sub-forms
          ip_address: metadata.ipAddress,
          user_agent: metadata.userAgent,
          metadata: metadata.additionalData || {},
          submitted_at: new Date(),
        },
        { transaction }
      );

      logger.info(`✅ Submission created successfully: ${submission.id}`);

      // 🔍 DEBUG: Log fieldData received
      logger.info(`📝 Creating SubmissionData for ${Object.keys(fieldData).length} fields`);
      logger.debug(`Field IDs received: ${Object.keys(fieldData).join(', ')}`);
      logger.debug(`Field map has ${fieldMap.size} fields`);

      // Create submission data with encryption for sensitive fields
      let createdCount = 0;
      for (const [fieldId, value] of Object.entries(fieldData)) {
        const field = fieldMap.get(fieldId);

        if (!field) {
          logger.warn(`⚠️  Field ${fieldId} not found in fieldMap, skipping`);
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
        createdCount++;
      }

      logger.info(`✅ Created ${createdCount} SubmissionData records`);

      // ✅ Insert into dynamic table for BOTH main form AND sub-form submissions
      logger.info(`🔍 DEBUG: Checking dynamic table insertion - isSubForm=${isSubForm}, actualSubFormId=${actualSubFormId}, isActuallySubForm=${isActuallySubForm}`);

      if (isActuallySubForm) {
        logger.info(`🔍 DEBUG: Sub-form path detected`);

        // Sub-form submission: Insert into sub-form's dynamic table
        const { SubForm } = require('../models');
        const subForm = await SubForm.findByPk(actualSubFormId); // ✅ Use actualSubFormId instead of actualFormId

        logger.info(`🔍 DEBUG: SubForm lookup result:`, {
          found: !!subForm,
          id: subForm?.id,
          table_name: subForm?.table_name,
          title: subForm?.title
        });

        if (subForm && subForm.table_name) {
          try {
            const dynamicTableService = new DynamicTableService();

            // Prepare data for sub-form dynamic table
            const subFormData = {};

            logger.info(`🔍 DEBUG: Processing fieldData entries: ${Object.keys(fieldData).length} fields`);

            for (const [fieldId, value] of Object.entries(fieldData)) {
              const field = fieldMap.get(fieldId);

              logger.info(`🔍 DEBUG: Processing field ${fieldId}:`, {
                found: !!field,
                label: field?.label,
                title: field?.title,
                value: value
              });

              if (!field) {
                logger.warn(`⚠️ DEBUG: Field ${fieldId} not found in fieldMap`);
                continue;
              }

              const columnName = await generateColumnName(field.label || field.title, field.id);
              logger.info(`🔍 DEBUG: Generated columnName: ${columnName} for field ${field.title}`);

              // ✅ CRITICAL FIX: For file_upload and image_upload fields, store first file ID only
              let valueToStore = value;
              if (field.type === 'file_upload' || field.type === 'image_upload') {
                if (Array.isArray(value) && value.length > 0) {
                  valueToStore = value[0];
                  logger.info(`🔧 Converted file array [${value.join(', ')}] to single ID: ${valueToStore}`);
                }
              } else if (typeof value === 'object' && value !== null) {
                // For other fields with objects/arrays, serialize to JSON string
                valueToStore = JSON.stringify(value);
              }

              subFormData[columnName] = valueToStore;
            }

            logger.info(`🔍 DEBUG: Prepared subFormData:`, {
              keys: Object.keys(subFormData),
              data: subFormData
            });

            // ✅ CRITICAL FIX: Use parentId directly as main_form_subid
            // After ID sync fix (v0.7.0+), submissions.id === dynamic_table.id
            // No need to query dynamic table - they are always the same!
            const mainFormSubId = parentId;

            logger.info(`✅ Using parentId as main_form_subid (ID sync): ${mainFormSubId}`);

            logger.info(`🔍 DEBUG: Calling insertSubFormData with:`, {
              table_name: subForm.table_name,
              parentId,
              mainFormSubId,
              formId: form.id,
              subFormId: subForm.id,
              username,
              dataKeys: Object.keys(subFormData)
            });

            // Insert into sub-form dynamic table with parent_id and main_form_subid
            // ✅ UPDATED: Now includes mainFormSubId parameter
            const insertResult = await dynamicTableService.insertSubFormData(
              subForm.table_name,
              parentId, // Parent submission ID (from submissions table - FK)
              mainFormSubId, // Main form submission ID (from dynamic table - for display)
              username, // Username
              subFormData, // Field data
              0 // order (for sub-form submission ordering)
            );

            logger.info(`✅ Sub-form submission ${submission.id} stored in dynamic table ${subForm.table_name}`, {
              insertResult
            });
          } catch (dynamicTableError) {
            logger.error('❌ Failed to insert sub-form into dynamic table:', {
              error: dynamicTableError.message,
              stack: dynamicTableError.stack,
              subFormId: subForm.id,
              tableName: subForm.table_name
            });
            // Don't fail the entire submission if dynamic table insert fails
          }
        } else {
          logger.warn(`⚠️ DEBUG: SubForm not found or missing table_name - skipping dynamic table insertion`);
        }
      } else if (form.table_name) {
        // Main form submission: Insert into main form's dynamic table
        try {
          const dynamicTableService = new DynamicTableService();

          // Prepare data for main form dynamic table (ONLY main form fields)
          const mainFormData = {};

          for (const [fieldId, value] of Object.entries(fieldData)) {
            const field = fieldMap.get(fieldId);
            if (!field) continue;

            // ✅ Skip sub-form fields entirely
            if (field.sub_form_id) {
              continue; // Skip sub-form fields
            }

            const columnName = await generateColumnName(field.label || field.title, field.id);
            mainFormData[columnName] = value;
          }

          // Insert into main form dynamic table
          // ✅ CRITICAL FIX: Pass submission.id as first parameter
          await dynamicTableService.insertSubmission(
            submission.id, // ✅ Use submission.id from submissions table
            form.id,
            form.table_name,
            username, // Use username instead of userId
            mainFormData
          );

          logger.info(`✅ Main form submission ${submission.id} stored in dynamic table ${form.table_name}`);
        } catch (dynamicTableError) {
          logger.error('Failed to insert into dynamic table:', dynamicTableError);
          // Don't fail the entire submission if dynamic table insert fails
        }
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

      // ✅ Q-Collector v0.8.0: Trigger notification rules (async, non-blocking)
      try {
        const NotificationTriggerService = require('./NotificationTriggerService');
        // Fire and forget - don't wait for notifications
        NotificationTriggerService.onSubmissionCreated(submission).catch((err) => {
          logger.error('Notification trigger error (non-blocking):', err);
        });
      } catch (notifError) {
        // Never block submission creation due to notification errors
        logger.error('Failed to trigger notifications (non-blocking):', notifError);
      }

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

      // Check ownership or admin permission - Allow owner, super_admin, or admin
      const user = await User.findByPk(userId);
      const allowedRoles = ['super_admin', 'admin'];
      if (submission.submitted_by !== userId && !allowedRoles.includes(user.role)) {
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

      // ✅ Q-Collector v0.8.0: Trigger notification rules (async, non-blocking)
      try {
        const NotificationTriggerService = require('./NotificationTriggerService');
        // Fire and forget - don't wait for notifications
        NotificationTriggerService.onSubmissionUpdated(submission).catch((err) => {
          logger.error('Notification trigger error (non-blocking):', err);
        });
      } catch (notifError) {
        // Never block submission update due to notification errors
        logger.error('Failed to trigger notifications (non-blocking):', notifError);
      }

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

      // ✅ FIX: Handle sub-form submissions where submission.form is null
      let formTitle = null;
      let form = submission.form;

      if (!form) {
        // This is a sub-form submission, get title from SubForm
        const { SubForm } = require('../models');
        const subForm = await SubForm.findByPk(submission.form_id);
        if (subForm) {
          formTitle = subForm.title;
          // Get parent form for permission check
          form = await Form.findByPk(subForm.form_id);
        }
      } else {
        formTitle = form.title;
      }

      // Check access permission - Allow owner, super_admin, admin, or manager
      const user = await User.findByPk(userId);

      const isOwner = submission.submitted_by === userId;
      const allowedRoles = ['super_admin', 'admin'];
      const isPrivilegedUser = allowedRoles.includes(user.role);
      const isManager = form && user.role === 'manager' && form.canAccessByRole(user.role);

      if (!isOwner && !isPrivilegedUser && !isManager) {
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
        formTitle: formTitle,
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
   * @param {string} formId - Form ID (can be Form.id or SubForm.id)
   * @param {string} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Submissions with pagination
   */
  static async listSubmissions(formId, userId, filters = {}) {
    try {
      // Check if user has access to the form
      const user = await User.findByPk(userId);

      // ✅ FIX: Try to find as Form first, then as SubForm
      let form = await Form.findByPk(formId);
      let isSubForm = false;

      if (!form) {
        // Try finding as SubForm
        const { SubForm } = require('../models');
        const subForm = await SubForm.findByPk(formId);

        if (subForm) {
          // For SubForm, get the parent form for permission checking
          form = await Form.findByPk(subForm.form_id);
          isSubForm = true;
        }
      }

      if (!form) {
        throw new ApiError(404, 'Form not found', 'FORM_NOT_FOUND');
      }

      const isCreator = form.created_by === userId;
      const allowedRoles = ['super_admin', 'admin'];
      const isPrivilegedUser = allowedRoles.includes(user.role);
      const isManager = user.role === 'manager' && form.canAccessByRole(user.role);

      // ✅ CRITICAL FIX: For sub-forms, query by sub_form_id in submissions table
      // NOT by form_id (which is parent form ID)
      const where = isSubForm
        ? { sub_form_id: formId } // Sub-form submissions: query by sub_form_id
        : { form_id: formId, parent_id: null }; // Main form submissions: query by form_id AND parent_id IS NULL

      // Regular users can only see their own submissions
      if (!isPrivilegedUser && !isManager && !isCreator) {
        where.submitted_by = userId;
      }

      // Apply status filter
      if (filters.status) {
        where.status = filters.status;
      }

      // ✅ FIX: Filter by parent_id for sub-form submissions (optional filter)
      if (filters.parentId !== undefined) {
        where.parent_id = filters.parentId;
      }

      // ✅ FIX: Filter to show only main form submissions (parent_id IS NULL)
      if (filters.onlyMainForm === true) {
        where.parent_id = null;
      }

      // ✅ NEW v0.7.36: Server-side month/year filtering for performance optimization
      // Reduces client-side data loading from 750+ items to current page only
      // ✅ ENHANCED v0.7.36: Support custom date field selection (not just submitted_at)
      logger.info(`🔍 DEBUG: Checking date filter - month=${filters.month}, year=${filters.year}, dateField=${filters.dateField}`);

      if (filters.month !== undefined || filters.year !== undefined) {
        const dateConditions = [];

        // Determine which date field to filter on
        // Options: '_auto_date' (submittedAt), or custom field ID
        const dateField = filters.dateField || '_auto_date';

        if (dateField === '_auto_date') {
          // Default: Filter by submission date (submitted_at column)
          if (filters.month !== null && filters.month !== undefined) {
            dateConditions.push(
              sequelize.where(
                sequelize.fn('EXTRACT', sequelize.literal(`MONTH FROM "Submission"."submitted_at"`)),
                parseInt(filters.month)
              )
            );
          }

          if (filters.year !== null && filters.year !== undefined) {
            dateConditions.push(
              sequelize.where(
                sequelize.fn('EXTRACT', sequelize.literal(`YEAR FROM "Submission"."submitted_at"`)),
                parseInt(filters.year)
              )
            );
          }
        } else {
          // Custom field: Filter using subquery on submission_data table
          // Since EAV model stores data in submission_data, not in submissions.data column
          if (filters.month !== null && filters.month !== undefined) {
            dateConditions.push(
              sequelize.literal(`
                EXISTS (
                  SELECT 1 FROM submission_data sd
                  WHERE sd.submission_id = "Submission".id
                    AND sd.field_id = '${dateField}'
                    AND EXTRACT(MONTH FROM CAST(sd.value_text AS DATE)) = ${parseInt(filters.month)}
                )
              `)
            );
          }

          if (filters.year !== null && filters.year !== undefined) {
            dateConditions.push(
              sequelize.literal(`
                EXISTS (
                  SELECT 1 FROM submission_data sd
                  WHERE sd.submission_id = "Submission".id
                    AND sd.field_id = '${dateField}'
                    AND EXTRACT(YEAR FROM CAST(sd.value_text AS DATE)) = ${parseInt(filters.year)}
                )
              `)
            );
          }
        }

        if (dateConditions.length > 0) {
          where[Op.and] = where[Op.and] ? [...where[Op.and], ...dateConditions] : dateConditions;
        }

        logger.info(`📅 Date filter applied: field=${dateField}, month=${filters.month}, year=${filters.year}`);
      }

      // ✅ NEW v0.7.36: Server-side search filtering
      // Search in submission data (JSON field) using ILIKE for case-insensitive search
      if (filters.search && filters.search.trim()) {
        const searchTerm = filters.search.trim();

        // Search across multiple fields using Op.or
        const searchConditions = [
          // Search in JSON data field (cast to text for ILIKE)
          sequelize.where(
            sequelize.cast(sequelize.col('Submission.data'), 'text'),
            {
              [Op.iLike]: `%${searchTerm}%`
            }
          )
        ];

        // Also search in submitter username if available
        if (!where[Op.or]) {
          where[Op.or] = searchConditions;
        } else {
          where[Op.or] = [...where[Op.or], ...searchConditions];
        }

        logger.info(`🔍 Search filter applied: "${searchTerm}"`);
      }

      // Pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const offset = (page - 1) * limit;

      // ✅ NEW v0.7.36: Server-side dynamic sorting
      // Sort by submittedAt or custom field from submission_data (EAV model)
      const sortBy = filters.sortBy || 'submittedAt';
      const sortOrder = (filters.sortOrder || 'desc').toUpperCase();

      let orderClause = [];
      let sortInclude = null;

      if (sortBy === 'submittedAt') {
        // Sort by submitted_at column
        orderClause.push(['submitted_at', sortOrder]);
        logger.info(`📊 Sorting by submittedAt ${sortOrder}`);
      } else {
        // ✅ FIX v0.7.36: Sort by custom field using LEFT JOIN instead of subquery
        // This approach provides more reliable DISTINCT counting with Sequelize
        sortInclude = {
          model: SubmissionData,
          as: 'sortFieldData',
          attributes: [], // Don't fetch any data, only use for sorting
          where: { field_id: sortBy },
          required: false, // LEFT JOIN (not INNER JOIN)
          duplicating: false, // Don't duplicate parent rows
        };

        // Sort using the joined table's value_text column
        orderClause.push([
          { model: SubmissionData, as: 'sortFieldData' },
          'value_text',
          sortOrder
        ]);

        logger.info(`📊 Sorting by custom field ${sortBy} ${sortOrder} using LEFT JOIN`);
      }

      // ✅ CRITICAL FIX v0.7.36: Add subQuery: false to work with sequelize.literal()
      // distinct: true doesn't work well with EXISTS subqueries, causing "Submission->Submission" error
      // subQuery: false ensures COUNT is calculated correctly without breaking EXISTS clauses

      // Build include array for loading submission data
      const includeArray = [
        {
          model: User,
          as: 'submitter',
          attributes: ['id', 'username', 'email'],
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
      ];

      // Add sortInclude if sorting by custom field
      if (sortInclude) {
        includeArray.push(sortInclude);
      }

      // ✅ FIX v0.7.36: Use separate count and findAll to avoid "Submission->Submission" error
      // The `col` parameter causes Sequelize to generate incorrect SQL with nested table names
      // So we do count and findAll separately

      // Count total submissions (without pagination)
      const count = await Submission.count({
        where,
        distinct: true,
        // Don't include joins for counting - just count submissions
      });

      // Fetch paginated rows with all includes
      const rows = await Submission.findAll({
        where,
        include: includeArray,
        order: orderClause,
        limit,
        offset,
      });

      logger.info(`✅ Query complete: ${rows.length} submissions returned (total: ${count}, page: ${page}/${Math.ceil(count / limit)})`);

      // Decrypt submission data for each submission
      const submissions = await Promise.all(
        rows.map(async (s) => {
          const decryptedData = {};
          for (const data of s.submissionData || []) {
            decryptedData[data.field_id] = {
              fieldId: data.field_id,
              fieldTitle: data.field.title,
              fieldType: data.field.type,
              value: data.getDecryptedValue(),
            };
          }

          return {
            id: s.id,
            formId: s.form_id,
            status: s.status,
            submittedBy: s.submitter,
            submittedAt: s.submitted_at,
            data: decryptedData,
          };
        })
      );

      return {
        submissions,
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
    const transaction = await sequelize.transaction();

    try {
      const submission = await Submission.findByPk(submissionId);

      if (!submission) {
        throw new ApiError(404, 'Submission not found', 'SUBMISSION_NOT_FOUND');
      }

      // Check permission - Allow owner, super_admin, or admin
      const user = await User.findByPk(userId);
      const allowedRoles = ['super_admin', 'admin'];
      if (submission.submitted_by !== userId && !allowedRoles.includes(user.role)) {
        throw new ApiError(403, 'Not authorized to delete this submission', 'FORBIDDEN');
      }

      // ✅ NEW v0.7.29: Delete all files from MinIO before deleting submission
      const { File } = require('../models');
      const FileService = require('./FileService');

      const files = await File.findAll({
        where: { submission_id: submissionId }
      });

      logger.info(`🗑️  Found ${files.length} file(s) to delete from MinIO for submission ${submissionId}`);

      let filesDeleted = 0;
      for (const file of files) {
        try {
          await FileService.deleteFile(file.id, userId);
          filesDeleted++;
          logger.info(`✅ Deleted file ${file.id} (${file.original_name}) from MinIO`);
        } catch (error) {
          logger.error(`❌ Failed to delete file ${file.id} from MinIO:`, error.message);
          // Continue deletion even if some files fail
        }
      }

      // ✅ Check if this is a main form submission (has children) or sub-form submission
      const isSubFormSubmission = submission.parent_id !== null;

      logger.info(`🗑️  Deleting submission ${submissionId}, isSubForm: ${isSubFormSubmission}, filesDeleted: ${filesDeleted}`);

      if (isSubFormSubmission) {
        // === SUB-FORM SUBMISSION DELETION ===
        const { SubForm } = require('../models');
        // ✅ CRITICAL FIX: Use sub_form_id, not form_id (which is parent form ID)
        const subForm = await SubForm.findByPk(submission.sub_form_id);

        if (subForm && subForm.table_name) {
          // Delete from sub-form dynamic table
          const { Pool } = require('pg');
          const pool = new Pool({
            host: process.env.POSTGRES_HOST || 'localhost',
            port: process.env.POSTGRES_PORT || 5432,
            database: process.env.POSTGRES_DB || 'qcollector_db',
            user: process.env.POSTGRES_USER || 'qcollector',
            password: process.env.POSTGRES_PASSWORD
          });

          // ✅ CRITICAL FIX: Delete by id, not parent_id (parent_id is for main form submission)
          const result = await pool.query(`DELETE FROM "${subForm.table_name}" WHERE id = $1`, [submission.id]);
          await pool.end();
          logger.info(`✅ Deleted ${result.rowCount} row(s) from sub-form dynamic table ${subForm.table_name}`);
        }
      } else {
        // === MAIN FORM SUBMISSION DELETION ===
        const form = await Form.findByPk(submission.form_id);

        if (!form) {
          throw new ApiError(404, 'Form not found', 'FORM_NOT_FOUND');
        }

        // ✅ NEW v0.7.29: Delete files from child sub-form submissions first
        const childSubmissions = await Submission.findAll({
          where: { parent_id: submission.id }
        });

        let childFilesDeleted = 0;
        for (const childSub of childSubmissions) {
          const childFiles = await File.findAll({
            where: { submission_id: childSub.id }
          });

          for (const file of childFiles) {
            try {
              await FileService.deleteFile(file.id, userId);
              childFilesDeleted++;
              logger.info(`✅ Deleted child submission file ${file.id} (${file.original_name})`);
            } catch (error) {
              logger.error(`Failed to delete child file ${file.id}:`, error.message);
            }
          }
        }

        logger.info(`🗑️  Deleted ${childFilesDeleted} file(s) from ${childSubmissions.length} child submission(s)`);

        // 1. Delete all child sub-form submissions (cascade)
        const { SubForm } = require('../models');
        const subForms = await SubForm.findAll({
          where: { form_id: form.id }
        });

        const { Pool } = require('pg');
        const pool = new Pool({
          host: process.env.POSTGRES_HOST || 'localhost',
          port: process.env.POSTGRES_PORT || 5432,
          database: process.env.POSTGRES_DB || 'qcollector_db',
          user: process.env.POSTGRES_USER || 'qcollector',
          password: process.env.POSTGRES_PASSWORD
        });

        // Delete from all sub-form dynamic tables
        for (const subForm of subForms) {
          if (subForm.table_name) {
            try {
              const result = await pool.query(
                `DELETE FROM "${subForm.table_name}" WHERE parent_id = $1`,
                [submission.id]
              );
              logger.info(`✅ Deleted ${result.rowCount} sub-form entries from ${subForm.table_name}`);
            } catch (error) {
              logger.error(`Failed to delete from sub-form table ${subForm.table_name}:`, error);
            }
          }
        }

        // 2. Delete child submissions from submissions table (CASCADE will delete submission_data)
        const deletedChildren = await Submission.destroy({
          where: { parent_id: submission.id },
          transaction
        });
        logger.info(`✅ Deleted ${deletedChildren} child submissions from submissions table`);

        // 3. Delete from main form dynamic table
        if (form.table_name) {
          try {
            await pool.query(`DELETE FROM "${form.table_name}" WHERE id = $1`, [submission.id]);
            logger.info(`✅ Deleted main form submission from dynamic table ${form.table_name}`);
          } catch (error) {
            logger.error(`Failed to delete from main form table ${form.table_name}:`, error);
          }
        }

        await pool.end();
      }

      // Create audit log before deletion
      await AuditLog.logAction({
        userId,
        action: 'delete',
        entityType: 'submission',
        entityId: submissionId,
        oldValue: {
          formId: submission.form_id,
          status: submission.status,
          filesDeleted: isSubFormSubmission ? filesDeleted : (filesDeleted + (childFilesDeleted || 0))
        },
      });

      // Delete from submissions table (CASCADE will delete submission_data)
      await submission.destroy({ transaction });

      await transaction.commit();
      logger.info(`✅ Submission deleted: ${submissionId} by user ${userId}`);

      return true;
    } catch (error) {
      await transaction.rollback();
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
   * Get sub-form submissions by main form submission ID
   * Uses main_form_subid from sub-form dynamic table
   * @param {string} mainFormSubId - Main form submission ID from dynamic table
   * @param {string} subFormId - Sub-form ID
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Sub-form submissions
   */
  static async getSubFormSubmissionsByMainFormSubId(mainFormSubId, subFormId, userId) {
    try {
      // Get sub-form details with fields
      const subForm = await SubForm.findByPk(subFormId, {
        include: [
          {
            model: Field,
            as: 'fields',
            attributes: ['id', 'title', 'type']
          }
        ]
      });

      if (!subForm || !subForm.table_name) {
        logger.warn(`Sub-form ${subFormId} not found or missing table_name`);
        return [];
      }

      // Get sub-form submissions from dynamic table using main_form_subid
      const { Pool } = require('pg');
      const pool = new Pool({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        database: process.env.POSTGRES_DB || 'qcollector_db',
        user: process.env.POSTGRES_USER || 'qcollector',
        password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
      });

      try {
        const query = `
          SELECT *
          FROM "${subForm.table_name}"
          WHERE main_form_subid = $1
          ORDER BY "order" ASC, submitted_at ASC
        `;

        const result = await pool.query(query, [mainFormSubId]);

        logger.info(`Found ${result.rows.length} sub-form submissions for main_form_subid ${mainFormSubId}`);

        // ✅ CRITICAL FIX: Extract field data from row into data object
        // Map column names back to field IDs for frontend consumption
        // Use Promise.all for async operations inside map
        const submissions = await Promise.all(result.rows.map(async (row) => {
          // Base system columns
          const baseData = {
            id: row.id,
            parentId: row.parent_id,
            parent_id2: row.parent_id2,
            mainFormSubId: row.main_form_subid,
            username: row.username,
            order: row.order,
            submittedAt: row.submitted_at
          };

          // ✅ Extract field data by matching column names with field IDs
          const fieldData = {};

          // 🔍 DEBUG: Log all column names in the row
          logger.info(`🔍 DEBUG: Row columns: ${Object.keys(row).join(', ')}`);

          for (const field of subForm.fields || []) {
            // ✅ CRITICAL FIX: Use generateColumnName to get the actual translated column name
            // Column names are generated using MyMemory translation, not just field IDs
            const generatedColumnName = await generateColumnName(field.label || field.title, field.id);

            // Try multiple possible column name variations for backward compatibility
            const possibleColumnNames = [
              generatedColumnName, // ✅ Primary: Use the actual generated column name (with translation)
              field.id, // Fallback: Direct field ID as column name
              `${field.title}_${field.id}`.toLowerCase().replace(/[^a-z0-9_]/g, '_'), // Fallback: title_fieldId pattern
            ];

            let columnValue = undefined;
            for (const colName of possibleColumnNames) {
              if (row[colName] !== undefined) {
                columnValue = row[colName];
                logger.info(`✅ Found column "${colName}" for field "${field.title}" with value:`, columnValue);
                break;
              }
            }

            // Also try to find by checking if any column name ends with field.id
            if (columnValue === undefined) {
              const matchingColumn = Object.keys(row).find(key =>
                key.endsWith(`_${field.id}`) || key === field.id
              );
              if (matchingColumn) {
                columnValue = row[matchingColumn];
                logger.info(`✅ Found matching column ${matchingColumn} with value:`, columnValue);
              } else {
                logger.warn(`❌ NO MATCHING COLUMN FOUND for field ${field.id} (${field.title})`);
                logger.warn(`   Tried: ${possibleColumnNames.join(', ')}`);
                logger.warn(`   Available columns: ${Object.keys(row).filter(k => !['id', 'parent_id', 'main_form_subid', 'parent_id2', 'username', 'order', 'submitted_at'].includes(k)).join(', ')}`);
              }
            }

            // ✅ CRITICAL FIX: Convert object-format values to strings
            // PostgreSQL TEXT columns sometimes return as {0: 'M', 1: 'a', 2: 'g', ...}
            let processedValue = columnValue;
            if (columnValue && typeof columnValue === 'object' && !Array.isArray(columnValue)) {
              // Check if it's a numeric-keyed object (character array)
              const keys = Object.keys(columnValue);
              if (keys.length > 0 && keys.every(key => !isNaN(key))) {
                // Convert to string by joining character values in order
                processedValue = Object.values(columnValue).join('');
                logger.info(`🔧 Converted character array to string: "${processedValue}"`);
              }
            }

            // ✅ NEW: For file fields, fetch file name from files table
            if ((field.type === 'file_upload' || field.type === 'image_upload') && processedValue) {
              try {
                const { File } = require('../models');
                // processedValue could be a file ID (UUID)
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(processedValue);

                if (isUUID) {
                  const fileRecord = await File.findByPk(processedValue);
                  if (fileRecord) {
                    // Return file object with name instead of just ID
                    processedValue = {
                      id: fileRecord.id,
                      name: fileRecord.original_name || fileRecord.filename,
                      type: fileRecord.mime_type,
                      size: fileRecord.size
                    };
                    logger.info(`✅ Fetched file name for field ${field.title}: ${processedValue.name}`);
                  }
                }
              } catch (fileError) {
                logger.warn(`Failed to fetch file info for field ${field.id}:`, fileError.message);
              }
            }

            // ✅ CRITICAL FIX: Format field data structure to match frontend expectations
            // Frontend expects: {fieldId, fieldTitle, fieldType, value}
            fieldData[field.id] = {
              fieldId: field.id,
              fieldTitle: field.title,
              fieldType: field.type,
              value: processedValue
            };
          }

          logger.debug(`Sub-form submission ${row.id} field data:`, {
            fieldCount: Object.keys(fieldData).length,
            fields: Object.keys(fieldData)
          });

          return {
            ...baseData,
            data: fieldData // ✅ Structured field data keyed by field ID
          };
        }));

        return submissions;
      } finally {
        await pool.end();
      }
    } catch (error) {
      logger.error('Get sub-form submissions failed:', error);
      throw error;
    }
  }

  /**
   * Get sub-form submission detail from dynamic table
   * @param {string} subFormId - Sub-form ID
   * @param {string} submissionId - Submission ID (row ID in dynamic table)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Sub-form submission detail
   */
  static async getSubFormSubmissionDetail(subFormId, submissionId, userId) {
    try {
      // Get sub-form details with fields
      const subForm = await SubForm.findByPk(subFormId, {
        include: [
          {
            model: Field,
            as: 'fields',
            attributes: ['id', 'title', 'type']
          }
        ]
      });

      if (!subForm || !subForm.table_name) {
        throw new ApiError(404, 'Sub-form not found', 'SUBFORM_NOT_FOUND');
      }

      // Query dynamic table for specific submission
      const { Pool } = require('pg');
      const pool = new Pool({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        database: process.env.POSTGRES_DB || 'qcollector_db',
        user: process.env.POSTGRES_USER || 'qcollector',
        password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
      });

      try {
        const query = `
          SELECT *
          FROM "${subForm.table_name}"
          WHERE id = $1
        `;

        const result = await pool.query(query, [submissionId]);

        if (result.rows.length === 0) {
          throw new ApiError(404, 'Sub-form submission not found', 'SUBMISSION_NOT_FOUND');
        }

        const row = result.rows[0];

        logger.info(`🔍 getSubFormSubmissionDetail - Row columns:`, Object.keys(row));

        // Extract field data
        const fieldData = {};
        for (const field of subForm.fields || []) {
          // ✅ CRITICAL: Use generateColumnName like in list method
          const generatedColumnName = await generateColumnName(field.label || field.title, field.id);

          // Try multiple column name variations
          const possibleColumnNames = [
            generatedColumnName, // ✅ Primary: generated column name with translation
            field.id,
            `${field.title}_${field.id}`.toLowerCase().replace(/[^a-z0-9_]/g, '_')
          ];

          logger.info(`🔍 Looking for field "${field.title}" (${field.id}):`, {
            possibleNames: possibleColumnNames,
            availableColumns: Object.keys(row).filter(k => !['id', 'parent_id', 'main_form_subid', 'parent_id2', 'username', 'order', 'submitted_at', 'form_id'].includes(k))
          });

          let columnValue = undefined;
          for (const colName of possibleColumnNames) {
            if (row[colName] !== undefined) {
              columnValue = row[colName];
              logger.info(`✅ Found "${colName}" with value:`, columnValue);
              break;
            }
          }

          // Also try to find by checking if any column name ends with field.id
          if (columnValue === undefined) {
            const matchingColumn = Object.keys(row).find(key =>
              key.endsWith(`_${field.id}`) || key === field.id
            );
            if (matchingColumn) {
              columnValue = row[matchingColumn];
              logger.info(`✅ Found matching column "${matchingColumn}" with value:`, columnValue);
            } else {
              logger.warn(`❌ NO COLUMN FOUND for field "${field.title}" (${field.id})`);
            }
          }

          // ✅ CRITICAL FIX: Convert object-format values to strings
          // PostgreSQL TEXT columns sometimes return as {0: 'M', 1: 'a', 2: 'g', ...}
          let processedValue = columnValue;
          if (columnValue && typeof columnValue === 'object' && !Array.isArray(columnValue)) {
            // Check if it's a numeric-keyed object (character array)
            const keys = Object.keys(columnValue);
            if (keys.length > 0 && keys.every(key => !isNaN(key))) {
              // Convert to string by joining character values in order
              processedValue = Object.values(columnValue).join('');
              logger.info(`🔧 Converted character array to string: "${processedValue}"`);
            }
          }

          // ✅ NEW: For file fields, fetch file name from files table
          if ((field.type === 'file_upload' || field.type === 'image_upload') && processedValue) {
            try {
              const { File } = require('../models');
              // processedValue could be a file ID (UUID)
              const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(processedValue);

              if (isUUID) {
                const fileRecord = await File.findByPk(processedValue);
                if (fileRecord) {
                  // Return file object with name instead of just ID
                  processedValue = {
                    id: fileRecord.id,
                    name: fileRecord.original_name || fileRecord.filename,
                    type: fileRecord.mime_type,
                    size: fileRecord.size
                  };
                  logger.info(`✅ [getSubFormSubmissionDetail] Fetched file name: ${processedValue.name}`);
                }
              }
            } catch (fileError) {
              logger.warn(`Failed to fetch file info for field ${field.id}:`, fileError.message);
            }
          }

          fieldData[field.id] = {
            fieldId: field.id,
            fieldTitle: field.title,
            fieldType: field.type,
            value: processedValue
          };
        }

        return {
          id: row.id,
          parentId: row.parent_id,
          mainFormSubId: row.main_form_subid,
          username: row.username,
          order: row.order,
          submittedAt: row.submitted_at,
          data: fieldData
        };
      } finally {
        await pool.end();
      }
    } catch (error) {
      logger.error('Get sub-form submission detail failed:', error);
      throw error;
    }
  }

  /**
   * Update sub-form submission in dynamic table
   * @param {string} subFormId - Sub-form ID
   * @param {string} submissionId - Submission ID (row ID in dynamic table)
   * @param {string} userId - User ID
   * @param {Object} fieldData - Field data to update
   * @returns {Promise<Object>} Updated sub-form submission
   */
  static async updateSubFormSubmission(subFormId, submissionId, userId, fieldData) {
    try {
      // Get sub-form details with fields
      const subForm = await SubForm.findByPk(subFormId, {
        include: [
          {
            model: Field,
            as: 'fields',
            attributes: ['id', 'title', 'type']
          }
        ]
      });

      if (!subForm || !subForm.table_name) {
        throw new ApiError(404, 'Sub-form not found', 'SUBFORM_NOT_FOUND');
      }

      // Check permission
      const user = await User.findByPk(userId);
      const allowedRoles = ['super_admin', 'admin'];

      // Query dynamic table to check ownership
      const { Pool } = require('pg');
      const pool = new Pool({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        database: process.env.POSTGRES_DB || 'qcollector_db',
        user: process.env.POSTGRES_USER || 'qcollector',
        password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
      });

      try {
        // Check if submission exists
        const checkQuery = `SELECT username FROM "${subForm.table_name}" WHERE id = $1`;
        const checkResult = await pool.query(checkQuery, [submissionId]);

        if (checkResult.rows.length === 0) {
          throw new ApiError(404, 'Sub-form submission not found', 'SUBMISSION_NOT_FOUND');
        }

        const submissionUsername = checkResult.rows[0].username;

        // Check permission (allow owner or admin)
        if (submissionUsername !== user.username && !allowedRoles.includes(user.role)) {
          throw new ApiError(403, 'Not authorized to update this submission', 'FORBIDDEN');
        }

        // Prepare UPDATE statement
        const updateColumns = [];
        const updateValues = [];
        let paramIndex = 1;

        // Create field map for quick lookup
        const fieldMap = new Map();
        subForm.fields.forEach(field => {
          fieldMap.set(field.id, field);
        });

        logger.info(`🔍 updateSubFormSubmission - Processing ${Object.keys(fieldData).length} fields`);

        for (const [fieldId, value] of Object.entries(fieldData)) {
          const field = fieldMap.get(fieldId);

          if (!field) {
            logger.warn(`⚠️  Field ${fieldId} not found in sub-form, skipping`);
            continue;
          }

          // Generate column name using the same method as creation
          const columnName = await generateColumnName(field.title, field.id);

          // ✅ CRITICAL FIX: For file_upload and image_upload fields, store first file ID only
          // Arrays are serialized to JSON, but file IDs should be stored as single UUID strings
          let valueToStore = value;
          if (field.type === 'file_upload' || field.type === 'image_upload') {
            if (Array.isArray(value) && value.length > 0) {
              // Take the first file ID from the array
              valueToStore = value[0];
              logger.info(`🔧 Converted file array [${value.join(', ')}] to single ID: ${valueToStore}`);
            }
          } else if (typeof value === 'object' && value !== null) {
            // For other fields with objects/arrays, serialize to JSON string
            valueToStore = JSON.stringify(value);
          }

          logger.info(`✅ Updating column "${columnName}" for field "${field.title}" with value:`, valueToStore);

          updateColumns.push(`"${columnName}" = $${paramIndex}`);
          updateValues.push(valueToStore);
          paramIndex++;
        }

        if (updateColumns.length === 0) {
          logger.warn('No fields to update');
          return await this.getSubFormSubmissionDetail(subFormId, submissionId, userId);
        }

        // Add submissionId as last parameter for WHERE clause
        updateValues.push(submissionId);

        const updateQuery = `
          UPDATE "${subForm.table_name}"
          SET ${updateColumns.join(', ')}
          WHERE id = $${paramIndex}
        `;

        logger.info(`🔍 UPDATE query:`, {
          query: updateQuery,
          values: updateValues
        });

        const updateResult = await pool.query(updateQuery, updateValues);

        logger.info(`✅ Updated ${updateResult.rowCount} row(s) in dynamic table ${subForm.table_name}`);

        // Also update in submissions and submission_data tables for consistency
        const submission = await Submission.findByPk(submissionId);
        if (submission) {
          // Delete existing submission data
          await SubmissionData.destroy({
            where: { submission_id: submissionId }
          });

          // Create new submission data
          for (const [fieldId, value] of Object.entries(fieldData)) {
            const field = fieldMap.get(fieldId);
            if (!field) continue;

            await SubmissionData.createWithEncryption(
              submissionId,
              fieldId,
              value,
              field
            );
          }

          logger.info(`✅ Also updated submissions and submission_data tables`);
        }

        // Create audit log
        await AuditLog.logAction({
          userId,
          action: 'update',
          entityType: 'subform_submission',
          entityId: submissionId,
          newValue: { subFormId, fieldData }
        });

        logger.info(`✅ Sub-form submission updated: ${submissionId}`);

        // Return updated submission
        return await this.getSubFormSubmissionDetail(subFormId, submissionId, userId);
      } finally {
        await pool.end();
      }
    } catch (error) {
      logger.error('Update sub-form submission failed:', error);
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