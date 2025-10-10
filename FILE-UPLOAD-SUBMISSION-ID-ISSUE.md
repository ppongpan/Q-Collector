# File Upload submission_id Issue

**Date:** 2025-10-09
**Status:** MinIO bucket fixed, new database validation issue discovered

---

## Current Status

### ✅ Fixed: MinIO Bucket Issue
**Result:** File successfully uploads to MinIO!
```
File uploaded successfully: uploads/a243ac58-d0c9-4a08-9fb0-ebb8a29ac535/bc6c0332-940b-4b2e-9929-9adf34b7b644.jpg
```

### ❌ New Issue: Database Validation Error
**Error:**
```
File upload failed: notNull Violation: File.submission_id cannot be null
```

---

## Problem Analysis

### What's Happening

**Current Flow:**
1. User selects a file in form (before saving submission)
2. Frontend calls `fileServiceAPI.uploadFile()`
3. File uploads to MinIO successfully ✅
4. Backend tries to create record in `files` table
5. Database rejects: `submission_id` is required but NULL ❌

**Why This Fails:**
- `files` table schema requires `submission_id` (NOT NULL)
- Frontend is uploading files BEFORE the submission exists
- No `submission_id` available yet because form hasn't been submitted

### File Model Schema (Line 14-22):
```javascript
submission_id: {
  type: DataTypes.UUID,
  allowNull: false,  // ❌ Required field
  references: {
    model: 'submissions',
    key: 'id',
  },
  onDelete: 'CASCADE',
}
```

---

## Root Cause: Design Mismatch

### Old System (localStorage-based):
```javascript
// Files stored as base64 in localStorage
// Only "uploaded" when form is submitted
// No database records created until submission exists
{
  fieldId: {
    id: "temp_...",
    name: "image.jpg",
    data: "data:image/jpeg;base64,..."  // Base64 data
  }
}
```

### New System (MinIO-based):
```javascript
// Files uploaded to MinIO immediately
// Creates database record with submission_id
// But submission doesn't exist yet! ❌
POST /api/v1/files/upload
{
  file: <binary data>,
  submissionId: null,  // ❌ Not available yet
  fieldId: "uuid"
}
```

---

## Solution Options

### Option 1: Make submission_id Optional (Recommended ✅)

**Change:** Allow files to be uploaded without `submission_id`, link them later

**Implementation:**

**1. Update File Model** (`backend/models/File.js` line 14):
```javascript
submission_id: {
  type: DataTypes.UUID,
  allowNull: true,  // ✅ Allow null initially
  references: {
    model: 'submissions',
    key: 'id',
  },
  onDelete: 'CASCADE',
}
```

**2. Create Migration:**
```bash
npx sequelize-cli migration:generate --name make-submission-id-nullable-in-files
```

```javascript
// migrations/XXXXXX-make-submission-id-nullable-in-files.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('files', 'submission_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'submissions',
        key: 'id',
      },
      onDelete: 'CASCADE',
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('files', 'submission_id', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'submissions',
        key: 'id',
      },
      onDelete: 'CASCADE',
    });
  }
};
```

**3. Run Migration:**
```bash
cd backend
npx sequelize-cli db:migrate
```

**4. Update Frontend to Link Files on Submission:**
```javascript
// In FormView.jsx handleSubmit()
async function handleSubmit() {
  // ... create submission ...
  const submissionId = response.data.id;

  // Link uploaded files to submission
  for (const fieldId in uploadedFiles) {
    const fileIds = uploadedFiles[fieldId];
    await fileServiceAPI.linkFilesToSubmission(submissionId, fileIds);
  }
}
```

**Pros:**
- ✅ Allows immediate file upload (better UX)
- ✅ Files stored in MinIO safely
- ✅ Can link files later when submission is created
- ✅ Supports "draft" file uploads

**Cons:**
- ⚠️ Orphaned files possible if user never submits
- ⚠️ Need cleanup script for unlinked files

---

### Option 2: Store Files Temporarily, Upload on Submit

**Change:** Keep base64 in localStorage, only upload to MinIO when submitting

**Implementation:**

**1. Modify Frontend Upload Flow:**
```javascript
// In FormView.jsx handleFileChange()
async function handleFileChange(fieldId, files) {
  // Store files as base64 in state (like old system)
  const base64Files = await convertFilesToBase64(files);
  setFormData(prev => ({
    ...prev,
    [fieldId]: base64Files
  }));

  // DON'T upload to MinIO yet
}

// In FormView.jsx handleSubmit()
async function handleSubmit() {
  // 1. Create submission first
  const submission = await submissionService.createSubmission(formData);

  // 2. Upload all files with submission_id
  for (const fieldId in fileFields) {
    const files = formData[fieldId];
    const fileIds = await fileServiceAPI.uploadMultipleFiles(
      files,
      submission.id,  // ✅ Now we have submission_id
      fieldId
    );
    submission.data[fieldId] = fileIds;
  }

  // 3. Update submission with file IDs
  await submissionService.updateSubmission(submission.id, submission);
}
```

**Pros:**
- ✅ No database schema changes needed
- ✅ No orphaned files
- ✅ Submission atomic (all or nothing)

**Cons:**
- ❌ Large files stored in browser memory
- ❌ Slower submission process (upload during submit)
- ❌ Poor UX for large files
- ❌ Browser memory limits

---

### Option 3: Upload Files, Pass Temporary submission_id

**Change:** Create "pending" submission record first, then upload files

**Implementation:**

**1. Add Form State Management:**
```javascript
// When form opens, create pending submission
const pendingSubmissionId = await submissionService.createPendingSubmission(formId);

// Upload files with pending submission ID
await fileServiceAPI.uploadFile(file, pendingSubmissionId, fieldId);

// When form is submitted, finalize submission
await submissionService.finalizeSubmission(pendingSubmissionId, formData);
```

**Pros:**
- ✅ Files have submission_id from start
- ✅ Database constraints maintained
- ✅ Better file tracking

**Cons:**
- ❌ Many pending submissions if users don't submit
- ❌ Complex submission lifecycle
- ❌ Need cleanup for abandoned submissions

---

## Recommended Solution

**Use Option 1: Make submission_id Optional**

**Why:**
1. Simplest implementation
2. Better user experience (immediate upload)
3. Works with current frontend architecture
4. Easy to add file cleanup script later

**Steps to Implement:**
1. Update `File` model to make `submission_id` nullable
2. Create and run migration
3. Add backend endpoint to link files to submission
4. Update frontend to call link endpoint after submission creation
5. (Optional) Add cron job to clean up orphaned files

---

## Testing After Fix

**Test 1: File Upload Before Submission**
1. Open form
2. Select file
3. File uploads to MinIO ✅
4. No database error ✅

**Test 2: Form Submission with Files**
1. Upload files
2. Fill form
3. Click Submit
4. Files linked to submission ✅
5. View submission - files display ✅

**Test 3: Abandoned Upload Cleanup**
1. Upload file
2. Don't submit form
3. Wait 24 hours
4. Cron job deletes unlinked file ✅

---

## Impact Summary

**Before Fix:**
- ✅ MinIO bucket created
- ✅ Files upload to MinIO
- ❌ Database rejects (submission_id required)
- ❌ Cannot complete file upload

**After Option 1 Fix:**
- ✅ Files upload to MinIO
- ✅ Database accepts (submission_id nullable)
- ✅ Files linked on form submission
- ✅ Complete file upload workflow

---

## Related Files

- `backend/models/File.js` - File model with submission_id constraint
- `backend/services/FileService.js` - File upload logic
- `backend/api/routes/file.routes.js` - File upload endpoint
- `src/services/FileService.api.js` - Frontend file upload service
- `src/components/FormView.jsx` - Form file upload handling

---

## Next Steps

1. ✅ **MinIO bucket created** - Complete
2. 📋 **Decide on solution approach** - Option 1 recommended
3. 📋 **Update File model** - Make submission_id nullable
4. 📋 **Create migration** - Database schema change
5. 📋 **Test file upload** - Verify end-to-end flow

---

**Created:** 2025-10-09 23:22
**Status:** Awaiting decision on solution approach
