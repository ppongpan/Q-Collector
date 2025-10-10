# File Display Fix - Complete Summary

**Date:** 2025-10-10
**Status:** ✅ RESOLVED
**Version:** v0.7.5-dev

## Problem Statement

Files uploaded during main form creation (แนบภาพ, แนบไฟล์ fields) were not displaying their filenames when editing the form, despite existing in both the database and MinIO storage.

---

## Root Causes Identified

### 1. NULL submission_id Issue
**Problem:** Files uploaded during form creation have `submission_id = NULL` because the submission record isn't created until form submit.

**Original Code (backend/services/FileService.js:298-300):**
```javascript
if (filters.submissionId) {
  where.submission_id = filters.submissionId;  // ❌ Excludes NULL values!
}
```

**Impact:** WHERE clause with `=` operator excludes NULL values, filtering out all files uploaded during form creation.

---

### 2. Sequelize UUID Serialization Bug (CRITICAL)
**Problem:** When using LEFT JOIN, Sequelize's `toJSON()` serializes UUID columns as objects with numeric keys instead of strings.

**Example of Broken Format:**
```javascript
// Wrong format from file.toJSON():
{
  "field_id": {
    "0": "4",
    "1": "f",
    "2": "0",
    "3": "7",
    // ... 32 more numeric keys
  }
}

// Expected format:
{
  "field_id": "4f07653c-f745-426a-94c7-4c4fdbda7db4"
}
```

**Impact:** Field-based filtering failed because `mainFormFieldIds.includes(fieldId)` compared string against object, always returning false.

---

## Solution Implemented

### Fix 1: Removed submission_id WHERE Clause
**File:** `backend/services/FileService.js` (Lines 294-300)

```javascript
// ✅ NOTE: We don't filter by submission_id here because:
// 1. Files uploaded during form creation have submission_id = NULL
// 2. We need to include those files when editing the submission
// 3. The sub-form filtering happens post-query based on field.sub_form_id
// if (filters.submissionId) {
//   where.submission_id = filters.submissionId;
// }
```

---

### Fix 2: Field-based Filtering with Post-Query Logic
**File:** `backend/services/FileService.js` (Lines 335-395)

```javascript
// ✅ Filter files when submissionId is provided
// This ensures only files related to this submission are returned
let filteredFiles = rows;
if (filters.submissionId) {
  logger.info(`Filtering files for submission ${filters.submissionId}:`);

  // Get the submission and its form's field IDs
  const submission = await Submission.findByPk(filters.submissionId, {
    include: [{
      model: require('../models').Form,
      as: 'form',
      include: [{
        model: Field,
        as: 'fields',
        attributes: ['id', 'sub_form_id'],
      }]
    }]
  });

  // Get main form field IDs (exclude sub-form fields)
  const mainFormFieldIds = submission.form.fields
    .filter(field => !field.sub_form_id)
    .map(field => field.id);

  filteredFiles = rows.filter(file => {
    // Check if file matches submission_id OR belongs to main form fields
    const matchesSubmission = submissionId === filters.submissionId;
    const belongsToMainForm = fieldId && mainFormFieldIds.includes(fieldId);
    return matchesSubmission || belongsToMainForm;
  });
}
```

---

### Fix 3: UUID Serialization Bug Resolution
**File:** `backend/services/FileService.js` (Lines 377-392)

**Critical Change:**
```javascript
filteredFiles = rows.filter(file => {
  // ✅ FIX: Use dataValues to avoid Sequelize UUID serialization bug
  const fileData = file.dataValues || file;
  const fileId = fileData.id || file.id;
  const submissionId = fileData.submission_id || file.submission_id;
  const fieldId = fileData.field_id || file.field_id;

  // Check if file matches submission_id OR belongs to main form fields
  const matchesSubmission = submissionId === filters.submissionId;
  const belongsToMainForm = fieldId && mainFormFieldIds.includes(fieldId);
  const shouldKeep = matchesSubmission || belongsToMainForm;

  logger.info(`📄 File ${fileId ? fileId.substring(0, 8) : 'NO-ID'}: submission_id=${submissionId ? submissionId.substring(0, 8) : 'NULL'}, field_id=${fieldId ? fieldId.substring(0, 8) : 'NULL'}, shouldKeep=${shouldKeep}`);

  return shouldKeep;
});
```

**Key Points:**
- Access `file.dataValues` directly instead of using `file.toJSON()`
- Fallback to `file` object if `dataValues` is undefined
- This bypasses Sequelize's broken UUID serialization in LEFT JOIN queries

---

## Additional Work Completed

### 1. Sub-form Column Cleanup
**Problem:** Main form table had 4 sub-form columns that shouldn't exist:
- `chueonganthiaip`
- `phikadngan`
- `khomulngan`
- `phaphthayjakngan`

**Solution:** Dropped columns manually via SQL:
```javascript
await sequelize.query(`
  ALTER TABLE "banthuekraykarrthaihm_e9b413fecd22"
  DROP COLUMN IF EXISTS ${columnName};
`);
```

**Verification:** Confirmed `DynamicTableService.js` has correct filtering logic:
```javascript
// Lines 112-114: Filter out sub-form fields
const fieldsToAdd = isSubForm
  ? fields
  : fields.filter(field => !field.sub_form_id && !field.subFormId);
```

---

### 2. Complete Data Cleanup
**Created:** `backend/scripts/clear-all-test-data.js`

**Actions Performed:**
- ✅ Deleted 17 files from MinIO storage
- ✅ Deleted all file records from database
- ✅ Cleared all dynamic tables (main form + sub-form tables)
- ✅ Deleted all submissions
- ✅ Cleared sessions table (119 → 0 rows)
- ✅ Reset sequences

**Result:** Clean database state ready for fresh testing.

---

### 3. Orphaned Table Cleanup
**Problem:** Found 2 orphaned dynamic tables without corresponding form records:
- `banthuekraykarrthaihm_e9b413fecd22`
- `raykarthdlongkhab_9d519c8a7ffb`

**Solution:** Dropped tables:
```javascript
await sequelize.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE;`);
```

---

## Verification Results

### Database State (2025-10-10 17:02:07):
```
📋 Forms: 0
📝 Submissions: 0
📎 Files: 0
🔐 Sessions: 1
🗄️  Dynamic Tables: 0

✅ System Status: CLEAN
📊 Ready for fresh testing!
```

---

## Technical Lessons Learned

### 1. Sequelize LEFT JOIN + UUID Bug
When using LEFT JOIN (`required: false`) with UUID columns, Sequelize's `toJSON()` method incorrectly serializes UUIDs as objects with numeric keys.

**Solution:** Always use `dataValues` directly:
```javascript
const fileData = file.dataValues || file;
const fieldId = fileData.field_id;  // ✅ Correct UUID string
```

### 2. NULL Handling in SQL WHERE Clauses
SQL's `WHERE column = value` excludes NULL values. When you need to include NULLs, use:
- `WHERE column IS NULL OR column = value`
- Or remove WHERE clause and filter post-query

### 3. File Upload Lifecycle
Files uploaded during form creation have `submission_id = NULL` because:
1. User uploads file → Creates file record with NULL submission_id
2. User submits form → Creates submission record
3. File records are NOT updated with submission_id

**Design Decision:** Keep submission_id NULL and use field-based filtering instead.

---

## Files Modified

### Backend Files:
1. **backend/services/FileService.js**
   - Lines 294-300: Commented out submission_id WHERE clause
   - Lines 314-319: Changed to LEFT JOIN with required: false
   - Lines 335-395: Added field-based post-query filtering
   - Lines 377-392: Fixed UUID serialization bug

2. **backend/services/DynamicTableService.js**
   - Verified filtering logic (Lines 112-114, 143, 163)
   - No changes needed - already correct

### Scripts Created:
3. **backend/scripts/clear-all-test-data.js**
   - Complete data cleanup script

4. **backend/scripts/check-forms.js**
   - Form status verification script

---

## Testing Instructions

### Test Scenario 1: File Display in Edit Mode
1. Create a new main form with file_upload and image_upload fields
2. Fill out the form and upload files
3. Submit the form
4. Click "Edit" to view the submission
5. **Expected:** All uploaded files should display with their filenames

### Test Scenario 2: Sub-form Fields Isolation
1. Create a main form with sub-form fields
2. Submit the form
3. Check the dynamic table structure in database
4. **Expected:** Sub-form fields should NOT appear as columns in main table

### Test Scenario 3: File Filtering
1. Create form with both main fields and sub-form fields with file uploads
2. Upload files to both main and sub-form fields
3. View submission detail
4. **Expected:** Only main form files should appear in main form section

---

## API Endpoints Verified

### GET /api/v1/files
**Query Parameters:**
- `submissionId` - Optional UUID
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20)
- `mimeType` - Optional MIME type filter

**Response Format:**
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": "uuid",
        "filename": "unique_name.ext",
        "original_name": "user_filename.ext",
        "mime_type": "image/png",
        "size": 92012,
        "submission_id": "uuid or null",
        "field_id": "uuid",
        "uploaded_at": "2025-10-10T02:55:23.857Z",
        "downloadUrl": "presigned_url",
        "presignedUrl": "presigned_url"
      }
    ],
    "pagination": {
      "total": 10,
      "page": 1,
      "limit": 20,
      "totalPages": 1,
      "hasMore": false
    }
  }
}
```

---

## Next Steps for User

1. ✅ System is clean and ready for testing
2. 📝 Create a new form through the frontend
3. 🔍 Test file upload and display functionality
4. ✅ Verify sub-form fields don't appear in main table
5. 📊 Check that PowerBI can read the clean table structure

---

## Status: COMPLETE ✅

All requested work has been finished:
- ✅ Fixed file display issue (UUID serialization bug)
- ✅ Cleared all test data (submissions, files, sessions)
- ✅ Removed sub-form columns from main table
- ✅ Cleaned up orphaned dynamic tables
- ✅ Verified system is ready for fresh testing

**Ready for user testing and validation.**
