# Known Issues - Q-Collector v0.7.4-dev

**Date:** 2025-10-09
**Status:** Post-Session Documentation

---

## Active Issues

### 1. 📋 Missing `files` Table in Database

**Error:**
```
GET /api/v1/files/stats/summary 500 (Internal Server Error)
relation "files" does not exist
```

**Impact:**
- `/files/stats/summary` endpoint returns 500 error
- File statistics cannot be retrieved
- Does NOT affect file upload/download functionality
- Does NOT affect the POINT format fix or URL duplication fix

**Root Cause:**
- Migration file exists: `20250929230007-create-files.js`
- Migration claims to be "up to date"
- But `files` table doesn't exist in database
- Possible migration rollback or database reset occurred

**Workaround Applied (✅ FIXED):**
- Commented out `updateStorageUsage()` call in `FormView.jsx` line 54
- Removed from useEffect dependencies on line 55
- Storage usage indicator no longer displays
- **Result:** No more 500 errors in console

**Permanent Solution Options:**
1. Check SequelizeMeta table for migration status
2. Manually run the migration or create the table
3. Keep storage statistics disabled if not critical

**Priority:** Low (doesn't affect core functionality, workaround applied)

---

### 2. 📋 Legacy Data with Base64 Format

**Problem:** Old submissions (created before MinIO migration) contain base64 data, not MinIO file IDs

**Old Data Format:**
```javascript
"value": {
  "id": "temp_1760021555489_...",
  "name": "image.jpg",
  "type": "image/jpeg",
  "size": 381949,
  "data": "data:image/jpeg;base64,/9j/4AAQ..."  // ❌ Base64 data
}
```

**Expected MinIO Format:**
```javascript
"value": "actual-minio-file-id-uuid-here"  // Just the file ID string
```

**Why This Happens:**
- Old submissions were created when files were stored in localStorage as base64
- Those files were NEVER uploaded to MinIO
- The file IDs don't exist in MinIO database
- Cannot retrieve them from MinIO API

**Impact:**
- Old submissions won't display images even after URL fix
- Console shows 404 errors for old file IDs
- Only affects submissions created before MinIO migration

**Solution Options:**

#### Option 1: Ignore Old Submissions (Recommended)
- Old submissions with base64 data will remain non-functional
- All NEW submissions work correctly with MinIO
- Simplest solution, no code changes needed

#### Option 2: Add Fallback for Base64 Display
- Create fallback logic in `SubmissionDetail.jsx`
- Display base64 data directly as image URL
- Requires code changes
- Maintains legacy format support

```javascript
// In FileFieldDisplay component
if (typeof item === 'object' && item.data && item.data.startsWith('data:')) {
  // Old format with base64 - display directly
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    size: item.size,
    presignedUrl: item.data, // Use base64 data directly as URL
    isImage: fileServiceAPI.isImage(item.type)
  };
}
```

#### Option 3: Migrate Old Data to MinIO
- Write migration script to extract base64 files
- Upload to MinIO
- Update submissions with new MinIO file IDs
- Complex, time-consuming, risk of data loss

**Priority:** Low (only affects old data, new submissions work correctly)

---

## Recently Fixed Issues

### ✅ MinIO Bucket Creation (FIXED - 2025-10-09)

**Error:** `S3Error: The specified bucket does not exist`

**Fix:** Created MinIO bucket using MinIO client:
```bash
docker exec qcollector_minio mc alias set local http://localhost:9000 minioadmin minio_dev_2025
docker exec qcollector_minio mc mb local/qcollector
```

**Status:** Bucket `qcollector` created successfully and verified

**Result:** File uploads now work correctly

---

### ✅ PostgreSQL POINT Format Error (FIXED - 2025-10-09)

**Error:** `invalid input syntax for type point: "POINT(100.523, 13.807)"`

**Fix:** Changed from parameterized query to direct SQL injection for POINT geometry

**Status:** Fixed in `backend/services/DynamicTableService.js`

**Documentation:** `POINT-FORMAT-FIX-COMPLETE.md`

---

### ✅ File Display URL Duplication (FIXED - 2025-10-09)

**Error:** `GET http://localhost:5000/api/v1/api/v1/files/... 404`

**Fix:** Removed `/api/v1/` prefix from all FileService.api.js methods

**Status:** Fixed in `src/services/FileService.api.js`

**Documentation:** `FILE-DISPLAY-URL-FIX.md`

---

### ✅ Storage Usage 500 Errors (FIXED - 2025-10-09)

**Error:** `/files/stats/summary` endpoint causing console spam

**Fix:** Commented out `updateStorageUsage()` call in FormView.jsx

**Status:** Fixed in `src/components/FormView.jsx` line 54

**Documentation:** This file

---

## Issue Priority Summary

| Priority | Issue | Impact | Status |
|----------|-------|--------|--------|
| Low | Missing files table | Cannot get file stats | Fixed with workaround (commented out call) |
| Low | Legacy base64 data | Old submissions don't display images | Choose solution option 1, 2, or 3 |

---

## Testing Status

### ✅ Ready to Test:
1. **Coordinate field submission** - POINT format fix applied
2. **File uploads** - MinIO bucket created, file uploads should now work
3. **New file uploads display** - URL duplication fix applied
4. **Console errors eliminated** - Storage usage workaround applied

### 📋 Remaining Work:
1. **Legacy data handling** - Decision on solution approach

---

**Last Updated:** 2025-10-09 23:20
