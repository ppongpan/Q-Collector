/**
 * Sub-Form Service
 * Handles sub-form operations including deletion
 * Version: v0.7.29
 */

const { SubForm, Form, Field, Submission, File, User, AuditLog, TableDeletionLog, sequelize } = require('../models');
const logger = require('../utils/logger.util');
const { ApiError } = require('../middleware/error.middleware');
const DynamicTableService = require('./DynamicTableService');
const FileService = require('./FileService');

const dynamicTableService = new DynamicTableService();

class SubFormService {
  /**
   * Delete sub-form and its dynamic table
   * @param {string} subFormId - Sub-form ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>}
   */
  static async deleteSubForm(subFormId, userId) {
    const transaction = await sequelize.transaction();

    try {
      const subForm = await SubForm.findByPk(subFormId, {
        include: [
          {
            model: Form,
            as: 'form',
            attributes: ['id', 'title', 'created_by']
          }
        ]
      });

      if (!subForm) {
        throw new ApiError(404, 'Sub-form not found', 'SUBFORM_NOT_FOUND');
      }

      // Check permission - only form creator or admin can delete
      const user = await User.findByPk(userId);
      if (subForm.form.created_by !== userId && user.role !== 'admin' && user.role !== 'super_admin') {
        throw new ApiError(403, 'Not authorized to delete this sub-form', 'FORBIDDEN');
      }

      // ✅ NEW v0.7.29: Delete all files from MinIO for all sub-form submissions
      const submissions = await Submission.findAll({
        where: { sub_form_id: subFormId }
      });

      let totalFilesDeleted = 0;
      for (const submission of submissions) {
        const files = await File.findAll({
          where: { submission_id: submission.id }
        });

        for (const file of files) {
          try {
            await FileService.deleteFile(file.id, userId);
            totalFilesDeleted++;
            logger.info(`✅ Deleted file ${file.id} (${file.original_name}) from MinIO`);
          } catch (error) {
            logger.error(`Failed to delete file ${file.id}:`, error.message);
          }
        }
      }

      logger.info(`🗑️  Deleted ${totalFilesDeleted} file(s) from ${submissions.length} sub-form submission(s)`);

      // Get table name and metadata before deletion
      const tableName = subForm.table_name;

      logger.info(`Deleting sub-form ${subFormId}: table=${tableName}, submissions=${submissions.length}, files=${totalFilesDeleted}`);

      // ✅ NEW v0.7.29: Log table deletion if table exists
      if (tableName) {
        try {
          // Get row count before deletion
          const { Pool } = require('pg');
          const pool = new Pool({
            host: process.env.POSTGRES_HOST || 'localhost',
            port: process.env.POSTGRES_PORT || 5432,
            database: process.env.POSTGRES_DB || 'qcollector_db',
            user: process.env.POSTGRES_USER || 'qcollector',
            password: process.env.POSTGRES_PASSWORD
          });

          const countResult = await pool.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
          const rowCount = parseInt(countResult.rows[0].count) || 0;

          await pool.end();

          // Drop the table
          await dynamicTableService.dropFormTable(tableName);
          logger.info(`✅ Dropped sub-form table: ${tableName}`);

          // Log table deletion
          await TableDeletionLog.logDeletion({
            tableName,
            tableType: 'sub_form',
            formId: subForm.form_id,
            formTitle: subForm.form.title,
            subFormId: subFormId,
            subFormTitle: subForm.title,
            rowCount,
            deletedBy: userId,
            deletedByUsername: user.username,
            deletionReason: 'Sub-form deletion',
            backupCreated: false,
            metadata: {
              totalSubmissions: submissions.length,
              totalFiles: totalFilesDeleted
            }
          });
        } catch (error) {
          logger.error(`Failed to drop sub-form table ${tableName}:`, error.message);
          // Continue anyway - table might not exist
        }
      }

      // Create audit log before deletion
      await AuditLog.logAction({
        userId,
        action: 'delete',
        entityType: 'subform',
        entityId: subFormId,
        oldValue: {
          title: subForm.title,
          formId: subForm.form_id,
          tableName,
          totalFiles: totalFilesDeleted,
          totalSubmissions: submissions.length
        },
      });

      // Delete fields (in case CASCADE is not configured)
      await Field.destroy({
        where: { sub_form_id: subFormId },
        transaction
      });
      logger.info(`Deleted fields for sub-form ${subFormId}`);

      // Delete sub-form record (CASCADE will delete submissions)
      await subForm.destroy({ transaction });

      await transaction.commit();

      logger.info(`✅ Sub-form deleted completely: ${subFormId} by user ${userId}`);

      return true;
    } catch (error) {
      await transaction.rollback();
      logger.error('Sub-form deletion failed:', error);
      throw error;
    }
  }
}

module.exports = SubFormService;
