# FileService Migration Guide
## From LocalStorage to MinIO API

**Version:** 0.7.2-dev
**Date:** 2025-10-04
**Status:** 🟢 Migration Guide Available

---

## Overview

This guide helps you migrate from the old `FileService.js` (localStorage-based) to the new `FileService.api.js` (MinIO-based).

### Why Migrate?

- ✅ **Scalability**: No more 10MB localStorage limit
- ✅ **Performance**: Faster file uploads/downloads
- ✅ **Security**: Files stored in MinIO with access control
- ✅ **Reliability**: No browser storage clearing issues
- ✅ **Features**: Presigned URLs, metadata tracking, audit logs

### Timeline

- **v0.7.2**: FileService.js deprecated (warnings added)
- **v0.8.0**: FileService.js will be removed

---

## Quick Migration

### Old Code (FileService.js)

```javascript
import FileService from '../services/FileService.js';

// Upload file
const result = await FileService.saveFile(file, fieldId, submissionId, onProgress);
if (result.success) {
  const fileId = result.fileInfo.id;
}

// Get file
const fileData = FileService.getFile(fileId);
const base64Data = fileData.data;

// Get submission files
const files = FileService.getSubmissionFiles(submissionId);

// Delete file
FileService.deleteFile(fileId);
```

### New Code (FileService.api.js)

```javascript
import fileServiceAPI from '../services/FileService.api.js';

// Upload file
const result = await fileServiceAPI.uploadFile(file, submissionId, fieldId, onProgress);
if (result.success) {
  const fileId = result.file.id;
  const presignedUrl = result.file.presignedUrl; // NEW: Direct download URL
}

// Get file with URL
const file = await fileServiceAPI.getFileWithUrl(fileId);
const presignedUrl = file.presignedUrl;

// Get submission files
const files = await fileServiceAPI.getSubmissionFiles(submissionId);

// Delete file
await fileServiceAPI.deleteFile(fileId);
```

---

## API Reference

### FileService.api.js Methods

#### `uploadFile(file, submissionId, fieldId, onProgress)`

Upload single file to MinIO.

**Parameters:**
- `file` (File) - File object from input
- `submissionId` (string|null) - Submission ID (optional)
- `fieldId` (string|null) - Field ID (optional)
- `onProgress` (Function|null) - Progress callback (0-100)

**Returns:** `Promise<Object>`
```javascript
{
  success: true,
  file: {
    id: "uuid",
    filename: "unique-filename.jpg",
    originalName: "photo.jpg",
    mimeType: "image/jpeg",
    size: 123456,
    presignedUrl: "https://minio.../...",
    uploadedAt: "2025-10-04T..."
  }
}
```

**Example:**
```javascript
const result = await fileServiceAPI.uploadFile(
  file,
  submissionId,
  fieldId,
  (progress) => console.log(`${progress}%`)
);
```

---

#### `uploadMultipleFiles(files, submissionId, fieldId, onProgress)`

Upload multiple files.

**Parameters:**
- `files` (FileList|Array) - Files to upload
- `submissionId` (string|null) - Submission ID
- `fieldId` (string|null) - Field ID
- `onProgress` (Function|null) - Progress callback

**Returns:** `Promise<Array>`

**Example:**
```javascript
const results = await fileServiceAPI.uploadMultipleFiles(
  fileList,
  submissionId,
  fieldId,
  (progress) => setUploadProgress(progress)
);
```

---

#### `getFileWithUrl(fileId, expirySeconds)`

Get file metadata with presigned download URL.

**Parameters:**
- `fileId` (string) - File ID
- `expirySeconds` (number) - URL expiry time (default: 3600)

**Returns:** `Promise<Object>`

**Example:**
```javascript
const file = await fileServiceAPI.getFileWithUrl(fileId, 7200); // 2 hours
const downloadUrl = file.presignedUrl;
```

---

#### `downloadFile(fileId)`

Download file as Blob (for direct download).

**Parameters:**
- `fileId` (string) - File ID

**Returns:** `Promise<Blob>`

**Example:**
```javascript
const blob = await fileServiceAPI.downloadFile(fileId);
const url = URL.createObjectURL(blob);
window.open(url);
```

---

#### `getSubmissionFiles(submissionId)`

Get all files for a submission.

**Parameters:**
- `submissionId` (string) - Submission ID

**Returns:** `Promise<Array>`

**Example:**
```javascript
const files = await fileServiceAPI.getSubmissionFiles(submissionId);
files.forEach(file => {
  console.log(file.originalName, file.size);
});
```

---

#### `deleteFile(fileId)`

Delete file from MinIO and database.

**Parameters:**
- `fileId` (string) - File ID

**Returns:** `Promise<boolean>`

**Example:**
```javascript
await fileServiceAPI.deleteFile(fileId);
```

---

## Component Migration Examples

### Example 1: Image Upload Field

**Before (FileService.js):**
```javascript
const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  const result = await FileService.saveFile(file, fieldId, submissionId, setProgress);

  if (result.success) {
    setFieldValue(fieldId, result.fileInfo.id);
    // Display image from base64
    const fileData = FileService.getFile(result.fileInfo.id);
    setImageSrc(`data:${fileData.type};base64,${fileData.data}`);
  }
};
```

**After (FileService.api.js):**
```javascript
const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  const result = await fileServiceAPI.uploadFile(file, submissionId, fieldId, setProgress);

  if (result.success) {
    setFieldValue(fieldId, result.file.id);
    // Display image from presigned URL
    setImageSrc(result.file.presignedUrl);
  }
};
```

---

### Example 2: File Download

**Before (FileService.js):**
```javascript
const downloadFile = (fileId) => {
  const fileData = FileService.getFile(fileId);
  const link = document.createElement('a');
  link.href = `data:${fileData.type};base64,${fileData.data}`;
  link.download = fileData.name;
  link.click();
};
```

**After (FileService.api.js):**
```javascript
const downloadFile = async (fileId) => {
  const file = await fileServiceAPI.getFileWithUrl(fileId);
  const link = document.createElement('a');
  link.href = file.presignedUrl;
  link.download = file.originalName;
  link.click();
};
```

---

### Example 3: Display Image Thumbnail

**Before (FileService.js):**
```javascript
const displayThumbnail = (fileId) => {
  const fileData = FileService.getFile(fileId);
  if (fileData && fileData.isImage) {
    return <img src={`data:${fileData.type};base64,${fileData.data}`} />;
  }
};
```

**After (FileService.api.js):**
```javascript
const displayThumbnail = async (fileId) => {
  const file = await fileServiceAPI.getFileWithUrl(fileId);
  if (file && fileServiceAPI.isImage(file.mimeType)) {
    return <img src={file.presignedUrl} />;
  }
};
```

---

## Components to Migrate

**Total:** 6 components

1. ✅ `FormView.jsx` - Form submission with file upload
2. ✅ `SubmissionDetail.jsx` - Display uploaded files
3. ✅ `SubFormEditPage.jsx` - Edit sub-form files
4. ✅ `SubFormDetail.jsx` - View sub-form files
5. ✅ `image-thumbnail.jsx` - Display image previews
6. ✅ `file-display.jsx` - Display file information

---

## Backend API Endpoints

### Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/files/upload` | POST | Upload single file |
| `/api/v1/files/upload-multiple` | POST | Upload multiple files |
| `/api/v1/files/:id` | GET | Get file metadata + presigned URL |
| `/api/v1/files/:id/download` | GET | Download file directly |
| `/api/v1/files/:id` | DELETE | Delete file |
| `/api/v1/files` | GET | List files (with filters) |
| `/api/v1/files/stats/summary` | GET | Get file statistics |

### Example: Upload via API

```javascript
const formData = new FormData();
formData.append('file', file);
formData.append('submissionId', submissionId);
formData.append('fieldId', fieldId);

const response = await apiClient.post('/api/v1/files/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

console.log(response.data.file); // { id, filename, presignedUrl, ... }
```

---

## Migration Checklist

### Pre-Migration
- [ ] Read this guide thoroughly
- [ ] Understand API differences
- [ ] Check backend MinIO configuration
- [ ] Test backend endpoints

### During Migration
- [ ] Update imports: `FileService.js` → `FileService.api.js`
- [ ] Change method calls (see API Reference)
- [ ] Update file display logic (base64 → presigned URLs)
- [ ] Add error handling for async operations
- [ ] Update loading states

### Post-Migration
- [ ] Test file upload functionality
- [ ] Test file download functionality
- [ ] Test file deletion
- [ ] Verify image display
- [ ] Check file metadata accuracy
- [ ] Monitor for console warnings

---

## Common Issues & Solutions

### Issue 1: CORS Errors

**Problem:** CORS error when accessing presigned URLs

**Solution:** Backend MinIO config already handles CORS. Check network tab for actual error.

---

### Issue 2: URL Expiry

**Problem:** Presigned URL expired

**Solution:** Increase expiry time or regenerate URL
```javascript
const file = await fileServiceAPI.getFileWithUrl(fileId, 7200); // 2 hours
```

---

### Issue 3: File Size Limit

**Problem:** File too large (>10MB)

**Solution:** Backend supports up to 10MB. For larger files, contact admin to increase `MAX_FILE_SIZE` env var.

---

## Testing Guide

### Manual Testing Steps

1. **Upload Test**
   - Select file from input
   - Monitor progress indicator
   - Verify success message
   - Check file appears in list

2. **Display Test**
   - View uploaded file
   - Verify thumbnail displays correctly
   - Check file metadata (name, size, type)

3. **Download Test**
   - Click download button
   - Verify file downloads with correct name
   - Check file integrity

4. **Delete Test**
   - Click delete button
   - Verify confirmation dialog
   - Check file removed from list
   - Verify file removed from MinIO

---

## Performance Considerations

### LocalStorage vs MinIO

| Aspect | LocalStorage | MinIO API |
|--------|--------------|-----------|
| Max file size | ~10MB total | 10MB per file (configurable) |
| Storage capacity | ~10MB browser | Unlimited |
| Speed (upload) | Fast (local) | Network dependent |
| Speed (display) | Instant | Fast (cached URLs) |
| Reliability | Browser clear = lost | Persistent |
| Scalability | Limited | Unlimited |

### Optimization Tips

1. **Cache presigned URLs**: Use 1-hour expiry for frequently accessed files
2. **Lazy load images**: Only fetch URLs when images scroll into view
3. **Batch operations**: Use `uploadMultipleFiles()` for multiple uploads
4. **Progress feedback**: Always show upload progress for better UX

---

## Support & Resources

### Documentation
- Backend FileService: `backend/services/FileService.js`
- Frontend API Service: `src/services/FileService.api.js`
- API Routes: `backend/api/routes/file.routes.js`

### Need Help?
- Check console warnings for migration hints
- Review deprecated FileService.js for old implementation
- See example components in this guide

---

## Changelog

### v0.7.2-dev (2025-10-04)
- ✅ Created FileService.api.js (MinIO-based)
- ✅ Added deprecation warnings to FileService.js
- ✅ Created migration guide
- 📋 Ready to start component migrations

### Future (v0.8.0)
- ❌ Remove FileService.js completely
- ✅ All components use FileService.api.js
- ✅ 100% MinIO storage

---

**Last Updated:** 2025-10-04
**Status:** 🟢 Ready for Migration
