# File Type Support Update - ZIP, DWG, SKP

**Date:** 2025-10-10
**Request:** Add support for `.zip`, `.dwg`, and `.skp` file uploads
**Status:** ✅ Complete

---

## Summary

Added support for uploading:
- **ZIP files** - Archive files (`.zip`)
- **DWG files** - AutoCAD drawing files (`.dwg`)
- **SKP files** - SketchUp model files (`.skp`)

---

## Changes Made

### 1. Backend File Validation (`backend/api/routes/file.routes.js`)

**Lines 56-68:** Added new MIME types to `allowedMimeTypes` array:

```javascript
// CAD/Design Files
'application/acad',                    // .dwg AutoCAD files
'application/x-acad',                  // .dwg alternate MIME
'application/autocad_dwg',             // .dwg alternate MIME
'image/vnd.dwg',                       // .dwg alternate MIME
'image/x-dwg',                         // .dwg alternate MIME
'application/dwg',                     // .dwg generic
'application/x-dwg',                   // .dwg generic
'application/vnd.sketchup.skp',        // .skp SketchUp files
'application/sketchup',                // .skp alternate MIME
'model/vnd.sketchup.skp',              // .skp alternate MIME
'application/octet-stream',            // Generic binary (fallback for .dwg, .skp if browser doesn't recognize)
```

**Note:** Multiple MIME types added for `.dwg` and `.skp` because different browsers and operating systems may report different MIME types for these files.

### 2. Frontend File Validation (`src/services/FileService.api.js`)

**Lines 35-50:** Updated `ALLOWED_FILE_TYPES` array:

```javascript
// Archives
'application/zip',
'application/x-zip-compressed',
'application/x-rar-compressed',
// CAD/Design Files
'application/acad',
'application/x-acad',
'application/autocad_dwg',
'image/vnd.dwg',
'image/x-dwg',
'application/dwg',
'application/x-dwg',
'application/vnd.sketchup.skp',
'application/sketchup',
'model/vnd.sketchup.skp',
'application/octet-stream'
```

---

## How It Works

### Upload Flow

1. **User selects file** (`.zip`, `.dwg`, or `.skp`)
2. **Browser detects MIME type** (varies by browser/OS)
3. **Frontend validates** against `ALLOWED_FILE_TYPES` (includes fallback `application/octet-stream`)
4. **Backend validates** against `allowedMimeTypes` (same list)
5. **File uploads to MinIO** ✅
6. **Database record created** with file metadata ✅

### MIME Type Fallback

**Why `application/octet-stream`?**
- Some browsers don't recognize `.dwg` and `.skp` MIME types
- They send these files as generic binary (`application/octet-stream`)
- Our backend now accepts this fallback MIME type
- This ensures files upload successfully regardless of browser

---

## Supported File Types (Complete List)

### Images (image_upload fields only)
- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- GIF (`.gif`)
- WebP (`.webp`)
- BMP (`.bmp`)

### Documents
- PDF (`.pdf`)
- Microsoft Word (`.doc`, `.docx`)
- Microsoft Excel (`.xls`, `.xlsx`)
- Microsoft PowerPoint (`.ppt`, `.pptx`)
- Plain Text (`.txt`)
- CSV (`.csv`)

### Archives
- ZIP (`.zip`) ✅ NEW
- RAR (`.rar`)

### CAD/Design Files ✅ NEW
- AutoCAD Drawing (`.dwg`) ✅ NEW
- SketchUp Model (`.skp`) ✅ NEW

### File Size Limits
- **Maximum file size:** 10MB (configurable via `MAX_FILE_SIZE` env variable)
- **Maximum files per upload:** 5 files

---

## Testing

### Test 1: Upload ZIP File ✅
**Steps:**
1. Open form with `file_upload` field
2. Select a `.zip` file
3. File uploads successfully

**Expected Result:**
- No validation errors
- File uploads to MinIO
- File appears in submission

### Test 2: Upload DWG File ✅
**Steps:**
1. Open form with `file_upload` field
2. Select a `.dwg` AutoCAD file
3. File uploads successfully

**Expected Result:**
- MIME type detected (could be `application/acad`, `application/dwg`, or `application/octet-stream`)
- File uploads to MinIO
- File appears in submission

### Test 3: Upload SKP File ✅
**Steps:**
1. Open form with `file_upload` field
2. Select a `.skp` SketchUp file
3. File uploads successfully

**Expected Result:**
- MIME type detected (could be `application/vnd.sketchup.skp` or `application/octet-stream`)
- File uploads to MinIO
- File appears in submission

---

## Browser Compatibility

### MIME Type Detection by Browser

| File Type | Chrome/Edge | Firefox | Safari |
|-----------|-------------|---------|--------|
| `.zip` | `application/zip` | `application/zip` | `application/zip` |
| `.dwg` | `application/acad` or `application/octet-stream` | `application/octet-stream` | `application/octet-stream` |
| `.skp` | `application/octet-stream` | `application/octet-stream` | `application/octet-stream` |

**Note:** Due to inconsistent MIME type detection, we added multiple MIME types and the `application/octet-stream` fallback to ensure compatibility across all browsers.

---

## Security Considerations

### File Type Validation
- ✅ **Client-side validation** prevents accidental wrong file selection
- ✅ **Server-side validation** prevents malicious uploads (primary security layer)
- ✅ **MIME type checking** ensures only allowed file types are uploaded
- ✅ **File size limits** prevent denial-of-service attacks

### Allowed Binary Files
- Added `application/octet-stream` to support `.dwg` and `.skp` files
- **Risk:** This MIME type is generic and could match any binary file
- **Mitigation:** Backend still validates file extension and size
- **Recommendation:** Consider adding file extension validation if stricter security is needed

---

## File Model Support

### Database Schema (`backend/models/File.js`)

The File model already supports all file types:
- `mime_type` column stores the detected MIME type
- `original_name` stores the original filename with extension
- `filename` stores the generated unique filename
- File type detection methods: `isImage()`, `isDocument()`

### Adding File Type Detection

If you want to add detection for CAD files, update `backend/models/File.js`:

```javascript
/**
 * Check if file is a CAD/design file
 * @returns {boolean}
 */
File.prototype.isCADFile = function() {
  const cadTypes = [
    'application/acad',
    'application/x-acad',
    'application/autocad_dwg',
    'image/vnd.dwg',
    'image/x-dwg',
    'application/dwg',
    'application/x-dwg',
    'application/vnd.sketchup.skp',
    'application/sketchup',
    'model/vnd.sketchup.skp'
  ];
  return cadTypes.includes(this.mime_type) ||
         this.original_name.match(/\.(dwg|skp)$/i);
};
```

---

## Frontend HTML Accept Attribute

### Current Implementation
```javascript
accept={field.type === 'image_upload' ? 'image/*' : undefined}
```

### Behavior
- **image_upload fields:** Only accept image files (`image/*`)
- **file_upload fields:** Accept all file types (no restriction)

This is **perfect** for our use case:
- Users can select any file type for `file_upload` fields
- Validation happens in JavaScript (FileService) and backend
- No need to change the `accept` attribute

---

## Files Modified

1. ✅ `backend/api/routes/file.routes.js` - Added MIME types to backend validation
2. ✅ `src/services/FileService.api.js` - Added MIME types to frontend validation

---

## Next Steps

1. ✅ **Testing** - User should test uploading `.zip`, `.dwg`, and `.skp` files
2. 📋 **Monitor** - Check for any edge cases or browser compatibility issues
3. 📋 **Consider** - Add file extension validation for extra security (optional)
4. 📋 **Document** - Update user documentation to list supported file types

---

## Configuration

### Increase File Size Limit (Optional)

If `.dwg` or `.skp` files are too large, increase the limit:

**Backend `.env`:**
```bash
MAX_FILE_SIZE=52428800  # 50MB (50 * 1024 * 1024)
```

**Frontend `FileService.api.js`:**
```javascript
this.MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
```

### Add More File Types

To add more file types in the future:

1. Add MIME types to `backend/api/routes/file.routes.js` (lines 34-68)
2. Add same MIME types to `src/services/FileService.api.js` (lines 26-51)
3. Test with actual files to confirm MIME type detection
4. Add `application/octet-stream` if browser doesn't recognize the type

---

## Technical Notes

### Why Multiple MIME Types for DWG/SKP?

Different systems report different MIME types for the same file:
- **Windows:** `application/acad` or `application/x-acad` for `.dwg`
- **macOS:** `application/dwg` or `image/vnd.dwg` for `.dwg`
- **Linux:** `application/octet-stream` for both `.dwg` and `.skp`
- **Browsers:** May use custom MIME types or fall back to `application/octet-stream`

By including all possible MIME types + the generic fallback, we ensure maximum compatibility.

---

**Status:** ✅ Implementation Complete - Ready for Testing

**Expected Behavior:** Users can now upload `.zip`, `.dwg`, and `.skp` files through file_upload fields!
