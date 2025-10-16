# Complete Deletion System Implementation - v0.7.29

## Overview
ระบบการลบข้อมูลที่สมบูรณ์ รวมถึงการลบไฟล์ใน MinIO, ข้อมูลใน PostgreSQL และการบันทึก audit log สำหรับการลบตาราง

---

## ✅ Task 1: Database Migration (COMPLETED)

**File:** `backend/migrations/20250116000000-create-table-deletion-logs.js`

สร้างตาราง `table_deletion_logs` สำหรับบันทึกการลบตารางฐานข้อมูล

**Run Migration:**
```bash
cd backend
npx sequelize-cli db:migrate
```

---

## ✅ Task 2: TableDeletionLog Model (COMPLETED)

**File:** `backend/models/TableDeletionLog.js`

Model พร้อม static methods:
- `logDeletion(data)` - บันทึกการลบตาราง
- `getFormDeletionHistory(formId)` - ประวัติการลบของฟอร์ม
- `getUserDeletionHistory(userId)` - ประวัติการลบของ user

---

## 🔧 Task 3: Update SubmissionService.deleteSubmission

**File:** `backend/services/SubmissionService.js`

**Current Issue:** ลบข้อมูลใน submissions table และ dynamic table แต่ไม่ลบไฟล์ใน MinIO

**Fix Required:**

```javascript
/**
 * Delete submission with complete cleanup (PostgreSQL + MinIO)
 * @param {string} submissionId - Submission ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
static async deleteSubmission(submissionId, userId) {
  const transaction = await sequelize.transaction();

  try {
    const submission = await Submission.findByPk(submissionId, {
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
      ],
    });

    if (!submission) {
      throw new ApiError(404, 'Submission not found', 'SUBMISSION_NOT_FOUND');
    }

    // Check permission
    const user = await User.findByPk(userId);
    const allowedRoles = ['super_admin', 'admin', 'moderator'];
    if (submission.submitted_by !== userId && !allowedRoles.includes(user.role)) {
      throw new ApiError(403, 'Not authorized to delete this submission', 'FORBIDDEN');
    }

    const isSubFormSubmission = submission.parent_id !== null;

    logger.info(`🗑️  Deleting submission ${submissionId}, isSubForm: ${isSubFormSubmission}`);

    // ✅ NEW: Delete all files from MinIO before deleting submission
    const { File } = require('../models');
    const FileService = require('./FileService');

    // Get all files associated with this submission
    const files = await File.findAll({
      where: { submission_id: submissionId }
    });

    logger.info(`🗑️  Found ${files.length} file(s) to delete from MinIO`);

    // Delete each file from MinIO
    for (const file of files) {
      try {
        await FileService.deleteFile(file.id, userId);
        logger.info(`✅ Deleted file ${file.id} (${file.original_name}) from MinIO`);
      } catch (error) {
        logger.error(`❌ Failed to delete file ${file.id} from MinIO:`, error);
        // Continue deletion even if some files fail
      }
    }

    if (isSubFormSubmission) {
      // === SUB-FORM SUBMISSION DELETION ===
      const { SubForm } = require('../models');
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

      // ✅ NEW: Delete files from child sub-form submissions before deleting sub-forms
      const childSubmissions = await Submission.findAll({
        where: { parent_id: submission.id },
        include: [{
          model: File,
          as: 'files'
        }]
      });

      for (const childSub of childSubmissions) {
        if (childSub.files && childSub.files.length > 0) {
          logger.info(`🗑️  Deleting ${childSub.files.length} file(s) from child submission ${childSub.id}`);
          for (const file of childSub.files) {
            try {
              await FileService.deleteFile(file.id, userId);
            } catch (error) {
              logger.error(`Failed to delete file ${file.id}:`, error);
            }
          }
        }
      }

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

      // Delete child submissions from submissions table
      const deletedChildren = await Submission.destroy({
        where: { parent_id: submission.id },
        transaction
      });
      logger.info(`✅ Deleted ${deletedChildren} child submissions from submissions table`);

      // Delete from main form dynamic table
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
        filesDeleted: files.length
      },
    });

    // Delete from submissions table (CASCADE will delete submission_data)
    await submission.destroy({ transaction });

    await transaction.commit();
    logger.info(`✅ Submission deleted completely: ${submissionId} (including ${files.length} files) by user ${userId}`);

    return true;
  } catch (error) {
    await transaction.rollback();
    logger.error('Submission deletion failed:', error);
    throw error;
  }
}
```

---

## 🔧 Task 4: Create FormService.deleteForm

**File:** `backend/services/FormService.js` (ADD new method)

```javascript
/**
 * Delete form with dynamic table cleanup and audit logging
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
          model: SubForm,
          as: 'subForms',
        },
      ],
    });

    if (!form) {
      throw new ApiError(404, 'Form not found', 'FORM_NOT_FOUND');
    }

    // Check permission - only admin and form creator can delete
    const user = await User.findByPk(userId);
    const allowedRoles = ['super_admin', 'admin'];
    if (form.created_by !== userId && !allowedRoles.includes(user.role)) {
      throw new ApiError(403, 'Not authorized to delete this form', 'FORBIDDEN');
    }

    logger.info(`🗑️  Deleting form ${formId} (${form.title})`);

    const { Pool } = require('pg');
    const { TableDeletionLog } = require('../models');
    const pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'qcollector_db',
      user: process.env.POSTGRES_USER || 'qcollector',
      password: process.env.POSTGRES_PASSWORD
    });

    // 1. Delete all sub-forms and their dynamic tables
    for (const subForm of form.subForms || []) {
      if (subForm.table_name) {
        try {
          // Get row count before deletion
          const countResult = await pool.query(`SELECT COUNT(*) as count FROM "${subForm.table_name}"`);
          const rowCount = parseInt(countResult.rows[0].count);

          // Delete table
          await pool.query(`DROP TABLE IF EXISTS "${subForm.table_name}" CASCADE`);
          logger.info(`✅ Deleted sub-form dynamic table: ${subForm.table_name}`);

          // Log table deletion
          await TableDeletionLog.logDeletion({
            tableName: subForm.table_name,
            tableType: 'sub_form',
            formId: form.id,
            formTitle: form.title,
            subFormId: subForm.id,
            subFormTitle: subForm.title,
            rowCount,
            deletedBy: userId,
            deletedByUsername: user.username,
            deletionReason: `Form deletion: ${form.title}`,
            metadata: {
              fieldCount: subForm.fields?.length || 0
            }
          });
        } catch (error) {
          logger.error(`Failed to delete sub-form table ${subForm.table_name}:`, error);
        }
      }
    }

    // 2. Delete main form dynamic table
    if (form.table_name) {
      try {
        // Get row count before deletion
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM "${form.table_name}"`);
        const rowCount = parseInt(countResult.rows[0].count);

        // Delete table
        await pool.query(`DROP TABLE IF EXISTS "${form.table_name}" CASCADE`);
        logger.info(`✅ Deleted main form dynamic table: ${form.table_name}`);

        // Log table deletion
        await TableDeletionLog.logDeletion({
          tableName: form.table_name,
          tableType: 'main_form',
          formId: form.id,
          formTitle: form.title,
          rowCount,
          deletedBy: userId,
          deletedByUsername: user.username,
          deletionReason: `Form deletion: ${form.title}`,
          metadata: {
            fieldCount: form.fields?.length || 0,
            subFormCount: form.subForms?.length || 0
          }
        });
      } catch (error) {
        logger.error(`Failed to delete main form table ${form.table_name}:`, error);
      }
    }

    await pool.end();

    // 3. Delete all submissions (CASCADE will handle submission_data, files reference)
    await Submission.destroy({
      where: { form_id: formId },
      transaction
    });

    // 4. Delete all fields (CASCADE will handle field options)
    await Field.destroy({
      where: { form_id: formId },
      transaction
    });

    // 5. Delete all sub-forms
    await SubForm.destroy({
      where: { form_id: formId },
      transaction
    });

    // 6. Create audit log
    await AuditLog.logAction({
      userId,
      action: 'delete',
      entityType: 'form',
      entityId: formId,
      oldValue: {
        title: form.title,
        tableName: form.table_name,
        subFormsCount: form.subForms?.length || 0
      },
    });

    // 7. Delete form
    await form.destroy({ transaction });

    await transaction.commit();
    logger.info(`✅ Form deleted completely: ${formId} (${form.title})`);

    return true;
  } catch (error) {
    await transaction.rollback();
    logger.error('Form deletion failed:', error);
    throw error;
  }
}
```

---

## 🔧 Task 5: Create SubFormService.deleteSubForm

**File:** `backend/services/SubFormService.js` (CREATE new file)

```javascript
/**
 * Sub-Form Service
 * Handles sub-form deletion with dynamic table cleanup
 */

const { SubForm, Form, Field, Submission, AuditLog, User, TableDeletionLog, sequelize } = require('../models');
const logger = require('../utils/logger.util');
const { ApiError } = require('../middleware/error.middleware');

class SubFormService {
  /**
   * Delete sub-form with dynamic table cleanup and audit logging
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
          },
        ],
      });

      if (!subForm) {
        throw new ApiError(404, 'Sub-form not found', 'SUBFORM_NOT_FOUND');
      }

      // Check permission - only admin and form creator can delete
      const user = await User.findByPk(userId);
      const allowedRoles = ['super_admin', 'admin'];
      if (subForm.form.created_by !== userId && !allowedRoles.includes(user.role)) {
        throw new ApiError(403, 'Not authorized to delete this sub-form', 'FORBIDDEN');
      }

      logger.info(`🗑️  Deleting sub-form ${subFormId} (${subForm.title})`);

      // Delete dynamic table
      if (subForm.table_name) {
        const { Pool } = require('pg');
        const pool = new Pool({
          host: process.env.POSTGRES_HOST || 'localhost',
          port: process.env.POSTGRES_PORT || 5432,
          database: process.env.POSTGRES_DB || 'qcollector_db',
          user: process.env.POSTGRES_USER || 'qcollector',
          password: process.env.POSTGRES_PASSWORD
        });

        try {
          // Get row count before deletion
          const countResult = await pool.query(`SELECT COUNT(*) as count FROM "${subForm.table_name}"`);
          const rowCount = parseInt(countResult.rows[0].count);

          // Delete table
          await pool.query(`DROP TABLE IF EXISTS "${subForm.table_name}" CASCADE`);
          logger.info(`✅ Deleted sub-form dynamic table: ${subForm.table_name}`);

          // Log table deletion
          await TableDeletionLog.logDeletion({
            tableName: subForm.table_name,
            tableType: 'sub_form',
            formId: subForm.form.id,
            formTitle: subForm.form.title,
            subFormId: subForm.id,
            subFormTitle: subForm.title,
            rowCount,
            deletedBy: userId,
            deletedByUsername: user.username,
            deletionReason: `Sub-form deletion: ${subForm.title}`,
            metadata: {
              parentForm: subForm.form.title
            }
          });
        } catch (error) {
          logger.error(`Failed to delete sub-form table ${subForm.table_name}:`, error);
        } finally {
          await pool.end();
        }
      }

      // Delete all submissions (CASCADE will handle submission_data)
      await Submission.destroy({
        where: { sub_form_id: subFormId },
        transaction
      });

      // Delete all fields
      await Field.destroy({
        where: { sub_form_id: subFormId },
        transaction
      });

      // Create audit log
      await AuditLog.logAction({
        userId,
        action: 'delete',
        entityType: 'subform',
        entityId: subFormId,
        oldValue: {
          title: subForm.title,
          tableName: subForm.table_name,
          parentForm: subForm.form.title
        },
      });

      // Delete sub-form
      await subForm.destroy({ transaction });

      await transaction.commit();
      logger.info(`✅ Sub-form deleted completely: ${subFormId} (${subForm.title})`);

      return true;
    } catch (error) {
      await transaction.rollback();
      logger.error('Sub-form deletion failed:', error);
      throw error;
    }
  }
}

module.exports = SubFormService;
```

---

## 🔧 Task 6: Add API Routes

**File:** `backend/api/routes/form.routes.js`

```javascript
// Add DELETE endpoint
router.delete(
  '/:formId',
  authenticate,
  authorize(['super_admin', 'admin']),
  [
    param('formId').isUUID().withMessage('Invalid form ID'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { formId } = req.params;

    await FormService.deleteForm(formId, req.userId);

    logger.info(`Form deleted: ${formId} by user ${req.userId}`);

    res.status(200).json({
      success: true,
      message: 'Form deleted successfully',
    });
  })
);
```

**File:** `backend/api/routes/subform.routes.js`

```javascript
// Add DELETE endpoint
router.delete(
  '/:subFormId',
  authenticate,
  authorize(['super_admin', 'admin']),
  [
    param('subFormId').isUUID().withMessage('Invalid sub-form ID'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { subFormId } = req.params;

    const SubFormService = require('../../services/SubFormService');
    await SubFormService.deleteSubForm(subFormId, req.userId);

    logger.info(`Sub-form deleted: ${subFormId} by user ${req.userId}`);

    res.status(200).json({
      success: true,
      message: 'Sub-form deleted successfully',
    });
  })
);
```

---

## 🔧 Task 7: Frontend Confirmation Dialogs

**File:** `src/components/MainFormApp.jsx` (ADD confirmation)

```javascript
const handleDeleteSubmission = async (submissionId) => {
  // ✅ Add confirmation dialog
  const confirmDelete = window.confirm(
    'คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้?\n\n' +
    '⚠️ การลบจะลบข้อมูลทั้งหมดรวมถึง:\n' +
    '  • ข้อมูลใน submissions table\n' +
    '  • ข้อมูลใน dynamic table\n' +
    '  • ไฟล์ทั้งหมดใน MinIO\n' +
    '  • ข้อมูลฟอร์มย่อยทั้งหมด (ถ้ามี)\n\n' +
    'การกระทำนี้ไม่สามารถย้อนกลับได้!'
  );

  if (!confirmDelete) {
    return; // User cancelled
  }

  try {
    await apiClient.deleteSubmission(submissionId);
    toast.success('ลบข้อมูลสำเร็จ');
    // Reload submissions list
    loadSubmissions();
  } catch (error) {
    console.error('Error deleting submission:', error);
    toast.error('ไม่สามารถลบข้อมูลได้: ' + (error.response?.data?.error?.message || error.message));
  }
};
```

---

## ✅ Summary of Changes

### ✅ Completed:
1. Created `table_deletion_logs` migration
2. Created `TableDeletionLog` model

### 🔧 To Implement:
3. Update `SubmissionService.deleteSubmission()` to delete files from MinIO
4. Create `FormService.deleteForm()` with dynamic table deletion + audit logging
5. Create `SubFormService.deleteSubForm()` with dynamic table deletion + audit logging
6. Add DELETE API routes for forms and sub-forms
7. Add confirmation dialogs in frontend

### 🎯 Benefits:
- ✅ ลบไฟล์ใน MinIO อัตโนมัติเมื่อลบ submission
- ✅ ลบตารางฐานข้อมูล dynamic tables เมื่อลบฟอร์ม/ฟอร์มย่อย
- ✅ บันทึก audit log ทุกครั้งที่มีการลบตาราง
- ✅ ป้องกันข้อมูลค้างใน MinIO และ PostgreSQL
- ✅ มี confirmation dialog ก่อนลบข้อมูลสำคัญ

---

## Testing Checklist

- [ ] Run migration: `npx sequelize-cli db:migrate`
- [ ] Test submission deletion (verify MinIO files deleted)
- [ ] Test form deletion (verify dynamic table dropped + logged)
- [ ] Test sub-form deletion (verify dynamic table dropped + logged)
- [ ] Verify `table_deletion_logs` records created
- [ ] Test confirmation dialogs in frontend
- [ ] Verify no orphaned files in MinIO
- [ ] Verify no orphaned tables in PostgreSQL

---

## Next Steps

1. Run migration to create `table_deletion_logs` table
2. Implement the service method updates (copy code from this document)
3. Add API routes for form/sub-form deletion
4. Add frontend confirmation dialogs
5. Test thoroughly with sample data

**Version:** v0.7.29
**Date:** 2025-01-16
**Status:** Implementation Guide Created ✅
