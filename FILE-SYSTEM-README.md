# ระบบการจัดการไฟล์ Q-Collector Framework

## ภาพรวมระบบ

ระบบการจัดการไฟล์ที่พัฒนาขึ้นสำหรับ Q-Collector Framework รองรับการอัปโหลด บันทึก และแสดงผลไฟล์จริงใน localStorage สำหรับการทดสอบและ development

## คุณสมบัติหลัก

### 🗃️ **FileService.js - Core Storage Engine**
- **Base64 Storage**: บันทึกไฟล์เป็น Base64 ใน localStorage
- **Image Compression**: บีบอัดรูปภาพอัตโนมัติ (ความคมชัด 80%, ขนาดสูงสุด 1920x1080)
- **File Validation**: ตรวจสอบขนาดไฟล์ (สูงสุด 10MB)
- **Multiple File Support**: รองรับไฟล์หลายไฟล์พร้อมกัน
- **Storage Statistics**: ติดตามการใช้งาน storage

### 📁 **การจัดการไฟล์**
```javascript
// บันทึกไฟล์
const result = await FileService.saveFile(file, fieldId, submissionId, onProgress);

// ดึงไฟล์
const fileData = FileService.getFile(fileId);

// ลบไฟล์
const success = FileService.deleteFile(fileId);

// ดาวน์โหลดไฟล์
FileService.downloadFile(fileId);
```

### 🎨 **UI Components**

#### **ImageThumbnail Component**
- **Responsive Design**: PC 150x150px, Mobile 100x100px
- **Modal View**: คลิกเพื่อดูรูปเต็มขนาด
- **Hover Effects**: แสดงปุ่ม zoom และ download
- **Error Handling**: จัดการรูปที่โหลดไม่ได้

#### **FilePreview Component**
- **File Icons**: แสดงไอคอนตามประเภทไฟล์
- **Download on Click**: คลิกเพื่อดาวน์โหลดโดยตรง
- **File Info Display**: แสดงชื่อ ขนาด วันที่อัปโหลด

#### **FileGallery Component**
- **Grid Layout**: แสดงไฟล์ในรูปแบบ grid responsive
- **Mixed Content**: รองรับทั้งรูปภาพและไฟล์ทั่วไป
- **Pagination**: จำกัดจำนวนการแสดงผลและแสดงจำนวนที่เหลือ

## การติดตั้งและใช้งาน

### 1. **FormView.jsx - การอัปโหลด**
```jsx
// Import FileService
import FileService from '../services/FileService.js';

// Handle file upload with progress
const handleFileChange = async (fieldId, files) => {
  const results = await FileService.saveMultipleFiles(
    Array.from(files),
    fieldId,
    submissionId,
    (progress) => setFileUploadProgress(prev => ({ ...prev, [fieldId]: progress }))
  );

  // Process results...
};
```

### 2. **SubmissionDetail.jsx - การแสดงผล**
```jsx
// Import components
import { FileGallery } from './ui/image-thumbnail';

// Render files
const files = fileIds.map(id => FileService.getFile(id)).filter(Boolean);

return (
  <FileGallery
    files={files}
    maxDisplay={8}
    size="md"
    showFileNames={true}
  />
);
```

## โครงสร้างข้อมูลไฟล์

### **File Object Structure**
```javascript
{
  id: "submission_field_timestamp_random",
  name: "example.jpg",
  type: "image/jpeg",
  size: 204800,           // ขนาดไฟล์ดั้งเดิม
  originalSize: 204800,   // ขนาดเดิม
  compressedSize: 102400, // ขนาดหลังบีบอัด
  data: "data:image/jpeg;base64,/9j/4AAQ...", // Base64 data
  fieldId: "field_123",
  submissionId: "sub_456",
  uploadedAt: "2025-09-29T03:00:00.000Z",
  isImage: true
}
```

### **localStorage Structure**
```javascript
// Key: 'q_collector_files'
{
  "file_id_1": { /* file object */ },
  "file_id_2": { /* file object */ },
  // ...
}
```

## การจัดการประสิทธิภาพ

### **Image Compression Settings**
```javascript
static IMAGE_COMPRESSION_QUALITY = 0.8;  // 80% quality
static IMAGE_MAX_WIDTH = 1920;           // Max width
static IMAGE_MAX_HEIGHT = 1080;          // Max height
```

### **Storage Limits**
```javascript
static MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
// localStorage limit ~10MB total (browser dependent)
```

### **Memory Management**
- **Lazy Loading**: รูปภาพโหลดเมื่อต้องการใช้
- **URL Cleanup**: ปลดปล่อย object URLs หลังใช้งาน
- **Compression**: บีบอัดรูปภาพอัตโนมัติ

## การใช้งานใน Development

### **Upload Flow**
1. ผู้ใช้เลือกไฟล์ในฟอร์ม
2. `handleFileChange` ใน FormView.jsx ทำงาน
3. FileService.saveMultipleFiles() บันทึกไฟล์
4. แสดง progress bar ขณะอัปโหลด
5. อัปเดต form state และแสดงรายการไฟล์

### **Display Flow**
1. ดึง file IDs จาก submission data
2. FileService.getFile() ดึงข้อมูลไฟล์จาก localStorage
3. FileGallery component แสดงผล
4. ImageThumbnail สำหรับรูปภาพ
5. FilePreview สำหรับไฟล์ทั่วไป

## การทดสอบ

### **Manual Testing**
1. เปิด http://localhost:3001
2. สร้างฟอร์มใหม่ที่มี field file_upload หรือ image_upload
3. ทดสอบอัปโหลดไฟล์ต่างๆ:
   - รูปภาพ (JPEG, PNG, GIF)
   - ไฟล์เอกสาร (PDF, DOC, TXT)
   - ไฟล์ขนาดใหญ่ (ทดสอบ limit)
4. ตรวจสอบการแสดงผลใน submission detail
5. ทดสอบการดาวน์โหลดและลบไฟล์

### **Automated Testing**
```bash
# Run file system tests
node test-file-system.js
```

## Storage Statistics

### **ตรวจสอบการใช้งาน Storage**
```javascript
const stats = FileService.getStorageStats();
console.log({
  fileCount: stats.fileCount,
  totalSize: stats.totalSize,
  storageUsedPercent: stats.storageUsedPercent
});
```

### **Cleanup Old Files**
```javascript
// ลบไฟล์เก่าเกิน 30 วัน
const deletedCount = FileService.cleanupOldFiles(30);
```

## ข้อจำกัดและข้อควรรู้

### **localStorage Limitations**
- ขนาดจำกัดประมาณ 5-10MB (ขึ้นอยู่กับ browser)
- ข้อมูลหายเมื่อล้าง browser data
- ไม่เหมาะสำหรับ production ที่ต้องการความถาวร

### **Performance Considerations**
- การบีบอัดรูปภาพใช้เวลาสำหรับไฟล์ขนาดใหญ่
- localStorage I/O อาจช้าเมื่อมีข้อมูลมาก
- ควรจำกัดจำนวนไฟล์ต่อ submission

### **Browser Compatibility**
- รองรับ modern browsers ที่มี localStorage
- ต้องการ Canvas API สำหรับ image compression
- ต้องการ FileReader API สำหรับ file processing

## Migration Path สำหรับ Production

เมื่อพร้อมสำหรับ production สามารถเปลี่ยนจาก localStorage เป็น:

### **Backend Integration**
```javascript
// Replace FileService methods with API calls
static async saveFile(file, fieldId, submissionId, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fieldId', fieldId);
  formData.append('submissionId', submissionId);

  return await fetch('/api/upload', {
    method: 'POST',
    body: formData
  });
}
```

### **Cloud Storage**
- AWS S3 / MinIO สำหรับเก็บไฟล์
- PostgreSQL สำหรับ metadata
- CDN สำหรับ delivery

## สรุป

ระบบการจัดการไฟล์นี้ให้ foundation ที่สมบูรณ์สำหรับการทดสอบและพัฒนา Q-Collector Framework โดยมีคุณสมบัติครบถ้วน:

✅ **Upload & Storage**: อัปโหลดและบันทึกไฟล์จริง
✅ **Image Processing**: บีบอัดและ resize รูปภาพ
✅ **UI Components**: Component สำหรับแสดงผลไฟล์
✅ **Download System**: ระบบดาวน์โหลดไฟล์
✅ **Progress Tracking**: แสดง progress ขณะอัปโหลด
✅ **Responsive Design**: รองรับทุกขนาดหน้าจอ
✅ **Error Handling**: จัดการ error อย่างครบถ้วน

พร้อมสำหรับการใช้งานใน development และขยายต่อไป production!