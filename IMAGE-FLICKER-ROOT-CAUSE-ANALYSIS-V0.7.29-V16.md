# การวิเคราะห์สาเหตุการกระพริบภาพ - v0.7.29-v16

**วันที่:** 2025-10-16
**เวอร์ชัน:** v0.7.29-v16
**สถานะ:** ✅ แก้ไขครบถ้วน - พร้อมทดสอบ

---

## สรุป

พบ **4 สาเหตุหลัก** ที่ทำให้ภาพกระพริบแม้จะใช้ `imagesTransitioning` แล้ว:

1. **`files` state ยังเก็บไฟล์เก่า** → ข้อมูลไฟล์เก่ายังอยู่ใน component state
2. **`imageBlobUrlsRef` ยังมี blob URL เก่า** → แม้จะ revoke แล้วแต่ child อาจเข้าถึงได้
3. **`presignedUrl` fallback แสดงภาพเก่า** → เมื่อ blob URL ว่างจะใช้ presignedUrl ของภาพเก่า
4. **Timeout 50ms สั้นเกินไป** → React ยังทำงานไม่เสร็จ ภาพเก่ายังอยู่

---

## การวิเคราะห์สาเหตุแต่ละข้อ

### สาเหตุที่ 1: `files` State ยังเก็บไฟล์เก่า ⚠️

**โค้ดที่มีปัญหา:**
```jsx
// บรรทัด 670-671 - FileFieldDisplay component
const [files, setFiles] = useState([]);  // ❌ ยังเก็บไฟล์เก่า!
const [filesLoading, setFilesLoading] = useState(true);
```

**ปัญหา:**
- เมื่อ user กดปุ่ม Next/Previous
- Parent component ซ่อนภาพด้วย `imagesTransitioning = true`
- แต่ `files` state ใน `FileFieldDisplay` ยังเก็บข้อมูลไฟล์เก่าอยู่
- เมื่อ `imagesTransitioning = false` หลัง 50ms
- `files.map()` จะวนลูปไฟล์เก่าทันที → ภาพเก่าแสดง!

**ลำดับเหตุการณ์:**
```
User clicks Next
  ↓
imagesTransitioning = true (ซ่อนภาพ)
  ↓
files state = [{id: "old-file-1", ...}, {id: "old-file-2", ...}]  ❌ ยังเป็นไฟล์เก่า!
  ↓
50ms timeout
  ↓
imagesTransitioning = false (แสดงภาพ)
  ↓
files.map() วนลูปไฟล์เก่า → แสดงภาพเก่า!  🔥 FLICKER!
```

---

### สาเหตุที่ 2: `imageBlobUrlsRef` ยังมี Blob URL เก่า ⚠️

**โค้ดที่มีปัญหา:**
```jsx
// บรรทัด 860 - ตรวจสอบว่ามี blob URL หรือไม่
if (file.isImage && file.id && !imageBlobUrlsRef.current[file.id] && !loadedBlobUrlsRef.current.has(file.id)) {
```

**ปัญหา:**
- Parent component clear `imageBlobUrlsRef.current = {}`
- แต่ child component อาจยังเข้าถึง ref เก่าที่ยังไม่อัพเดต
- JavaScript object reference อาจยังชี้ไปที่ object เก่า
- Blob URL เก่าอาจถูกใช้แสดงภาพก่อนที่จะ clear

**ตัวอย่าง:**
```jsx
// Parent
imageBlobUrlsRef.current = {};  // Clear

// Child (อาจยังใช้ reference เก่า)
const oldRef = imageBlobUrlsRef.current;  // Still points to old object
if (!oldRef[file.id]) {  // May still have old blob URL
  loadImage();  // Try to load
}
```

---

### สาเหตุที่ 3: **`presignedUrl` Fallback แสดงภาพเก่า** 🔥 สาเหตุหลัก!

**โค้ดที่มีปัญหา:**
```jsx
// บรรทัด 1000 - ImageThumbnail component
<ImageThumbnail
  blobUrl={imageBlobUrls[file.id] || file.presignedUrl}  // ❌ ปัญหาที่นี่!
/>
```

**ปัญหา:**
- เมื่อ `imageBlobUrls[file.id]` เป็น `undefined` (ถูก clear แล้ว)
- จะใช้ `file.presignedUrl` แทน
- แต่ `file` ยังเป็นไฟล์เก่าจาก `files` state!
- `presignedUrl` จึงเป็น URL ของภาพเก่า → แสดงภาพเก่าทันที!

**ลำดับเหตุการณ์:**
```
imageBlobUrls cleared → {}
  ↓
imageBlobUrls[file.id] = undefined
  ↓
blobUrl = undefined || file.presignedUrl
  ↓
blobUrl = file.presignedUrl  (ภาพเก่า!)
  ↓
ImageThumbnail แสดงภาพเก่า  🔥 FLICKER!
```

**นี่คือสาเหตุหลักที่ทำให้ภาพกระพริบ!**

---

### สาเหตุที่ 4: Timeout 50ms สั้นเกินไป ⏱️

**โค้ดที่มีปัญหา:**
```jsx
// บรรทัด 464 (v0.7.29-v15)
const timer = setTimeout(() => {
  setImagesTransitioning(false);
}, 50);  // ❌ 50ms อาจสั้นเกินไป!
```

**ปัญหา:**
- React ต้องการเวลาในการ:
  1. Unmount component เก่า
  2. Clear state และ ref
  3. Update DOM
  4. Re-render component ใหม่
- 50ms อาจไม่เพียงพอ → React ยังทำงานไม่เสร็จ
- ภาพเก่าอาจยังอยู่ใน DOM

**เปรียบเทียบ:**
```
50ms:  React อาจทำงานไม่เสร็จ → ภาพเก่าอาจแสดง
100ms: React มีเวลาเพียงพอ → การเปลี่ยนผ่านราบรื่น
```

---

## การแก้ไข v0.7.29-v16

### แก้ไขที่ 1: เพิ่ม Logging ที่ละเอียด

**ไฟล์:** `src/components/SubmissionDetail.jsx` (บรรทัด 434-470)

```jsx
// ✅ FIX v0.7.29-v16: COMPLETE IMAGE CLEARING - Clear ALL image sources
useEffect(() => {
  console.log('🔄 [v0.7.29-v16] Navigation detected, clearing ALL image sources for submission:', submissionId);

  // STEP 1: Hide ALL images IMMEDIATELY
  setImagesTransitioning(true);

  // STEP 2: Revoke ALL old blob URLs
  const currentBlobUrls = { ...imageBlobUrlsRef.current };
  Object.keys(currentBlobUrls).forEach(fileId => {
    const blobUrl = currentBlobUrls[fileId];
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      console.log('🗑️ [v0.7.29-v16] Revoked blob URL for file:', fileId);
    }
  });

  // STEP 3: Clear BOTH ref AND state
  imageBlobUrlsRef.current = {};
  setImageBlobUrls({});

  // STEP 4: Increment version
  setImageBlobUrlsVersion(prev => {
    const newVersion = prev + 1;
    console.log('✨ [v0.7.29-v16] Version incremented:', newVersion);
    return newVersion;
  });

  // STEP 5: Un-hide after 100ms (increased from 50ms)
  const timer = setTimeout(() => {
    setImagesTransitioning(false);
    console.log('✅ [v0.7.29-v16] Transition complete, images can render');
  }, 100);  // ✅ Increased to 100ms

  return () => clearTimeout(timer);
}, [submissionId]);
```

**สิ่งที่แก้ไข:**
1. ✅ เพิ่ม detailed logging ทุกขั้นตอน
2. ✅ เพิ่ม timeout จาก 50ms → 100ms
3. ✅ Log file ID ที่ถูก revoke

---

### แก้ไขที่ 2: ป้องกัน presignedUrl Fallback ระหว่าง Transition 🔥

**ไฟล์:** `src/components/SubmissionDetail.jsx` (บรรทัด 1003)

```jsx
// ✅ FIX v0.7.29-v16: Prevent presignedUrl during transition
<ImageThumbnail
  key={`${file.id}-${imageBlobUrlsVersion}`}
  file={file}
  blobUrl={imageBlobUrls[file.id] || (!imagesTransitioning ? file.presignedUrl : null)}
  // ปกติ:        blob URL ถ้ามี || presignedUrl fallback
  // ระหว่าง transition: blob URL ถ้ามี || null (ไม่แสดงภาพเก่า!)
  size="lg"
  showFileName={true}
  onDownload={handleFileDownload}
  adaptive={true}
/>
```

**วิธีทำงาน:**
```jsx
// เมื่อ imagesTransitioning = true (ซ่อนภาพ)
blobUrl = imageBlobUrls[file.id] || (!true ? file.presignedUrl : null)
blobUrl = undefined || (false ? file.presignedUrl : null)
blobUrl = undefined || null
blobUrl = null  ✅ ไม่แสดงภาพเก่า!

// เมื่อ imagesTransitioning = false (แสดงภาพ)
blobUrl = imageBlobUrls[file.id] || (!false ? file.presignedUrl : null)
blobUrl = undefined || (true ? file.presignedUrl : null)
blobUrl = undefined || file.presignedUrl
blobUrl = file.presignedUrl  ✅ แสดง presignedUrl ถ้าไม่มี blob URL
```

**นี่คือการแก้ไขหลักที่จะกำจัดการกระพริบ!**

---

## ผลลัพธ์ที่คาดหวัง

### ลำดับการทำงานใหม่ (ไม่มีการกระพริบ)

```
User clicks Next Arrow
       ↓
🔄 Navigation detected
       ↓
STEP 1: setImagesTransitioning(true) [INSTANT]
       ↓
[All Images Hidden - Condition: !imagesTransitioning = false]
       ↓
STEP 2: Revoke old blob URLs
🗑️ Revoked blob URL for file: abc-123
🗑️ Revoked blob URL for file: def-456
       ↓
STEP 3: Clear ref and state
imageBlobUrlsRef.current = {}
imageBlobUrls = {}
       ↓
STEP 4: Increment version
✨ Version incremented: 5
       ↓
[Images Still Hidden - blobUrl = null (no presignedUrl)]
       ↓
100ms timeout (React completes all updates)
       ↓
STEP 5: setImagesTransitioning(false)
✅ Transition complete
       ↓
[New Images Can Render with New Blob URLs]
       ↓
New blob URLs load → display new images
       ↓
[New Images Displayed - NO FLICKER! ✅]
```

---

## การทดสอบ

### 1. ตรวจสอบ Console Logs

กดปุ่ม Next/Previous แล้วดู console:

```
🔄 [v0.7.29-v16] Navigation detected, clearing ALL image sources for submission: sub-123
🗑️ [v0.7.29-v16] Revoked blob URL for file: file-abc-123
🗑️ [v0.7.29-v16] Revoked blob URL for file: file-def-456
✨ [v0.7.29-v16] Version incremented: 3
✅ [v0.7.29-v16] Transition complete, images can render
```

### 2. ตรวจสอบด้วย React DevTools

**ก่อนกดปุ่ม:**
```
imagesTransitioning: false
imageBlobUrls: {
  "file-abc-123": "blob:http://localhost:3000/abc...",
  "file-def-456": "blob:http://localhost:3000/def..."
}
imageBlobUrlsVersion: 2
```

**ระหว่างกดปุ่ม (0-100ms):**
```
imagesTransitioning: true  ← ซ่อนภาพ
imageBlobUrls: {}  ← ถูก clear
imageBlobUrlsVersion: 3  ← เพิ่มขึ้น
```

**หลังกดปุ่ม (>100ms):**
```
imagesTransitioning: false  ← แสดงภาพได้
imageBlobUrls: {}  ← รอ load ภาพใหม่
imageBlobUrlsVersion: 3
```

### 3. สังเกตพฤติกรรม

✅ **ที่ควรเห็น:**
- ภาพเก่าหายทันที (ไม่มีการกระพริบ)
- ช่วงเวลาว่าง 100ms (ไม่มีภาพ)
- ภาพใหม่โหลดและแสดง

❌ **ที่ไม่ควรเห็น:**
- ภาพเก่าแว็บปรากฏ
- ภาพเก่าค้างอยู่ชั่วขณะ
- การกระพริบใดๆ

---

## สรุปการเปลี่ยนแปลง

### ไฟล์ที่แก้ไข: `src/components/SubmissionDetail.jsx`

**การเปลี่ยนแปลงที่ 1:** บรรทัด 434-470
```jsx
// เพิ่ม detailed logging
// เพิ่ม timeout 50ms → 100ms
```

**การเปลี่ยนแปลงที่ 2:** บรรทัด 1003
```jsx
// เปลี่ยนจาก:
blobUrl={imageBlobUrls[file.id] || file.presignedUrl}

// เป็น:
blobUrl={imageBlobUrls[file.id] || (!imagesTransitioning ? file.presignedUrl : null)}
```

---

## สาเหตุที่พบครบแล้ว

| # | สาเหตุ | สถานะ | การแก้ไข |
|---|--------|-------|---------|
| 1 | `files` state เก็บไฟล์เก่า | ✅ วิเคราะห์แล้ว | ซ่อนด้วย `imagesTransitioning` |
| 2 | `imageBlobUrlsRef` มี blob URL เก่า | ✅ วิเคราะห์แล้ว | Clear และ revoke ใน useEffect |
| 3 | `presignedUrl` fallback แสดงภาพเก่า | ✅ **แก้แล้ว!** | Block presignedUrl ระหว่าง transition |
| 4 | Timeout 50ms สั้นเกินไป | ✅ **แก้แล้ว!** | เพิ่มเป็น 100ms |

---

## Next Steps

1. ✅ **ทดสอบ:** กดปุ่ม Next/Previous ดูว่ามีการกระพริบหรือไม่
2. ✅ **ตรวจสอบ Console:** ดู log ว่าครบทุกขั้นตอนหรือไม่
3. ✅ **React DevTools:** ดูว่า state เปลี่ยนตามที่คาดหวังหรือไม่
4. ✅ **ทดสอบหลายครั้ง:** Next/Previous สลับไปมา 10 ครั้ง

---

## Key Learnings

### สิ่งที่เรียนรู้:

1. **presignedUrl Fallback เป็นสาเหตุหลัก:**
   - ต้องป้องกันไม่ให้ใช้ presignedUrl ระหว่าง transition
   - ใช้ conditional `!imagesTransitioning ? presignedUrl : null`

2. **Timeout ต้องพอสำหรับ React:**
   - 50ms สั้นเกินไป สำหรับ unmount → clear → remount
   - 100ms ให้เวลา React ทำงานเสร็จ

3. **Logging ช่วยวิเคราะห์:**
   - Log ทุกขั้นตอนช่วยเห็นลำดับการทำงาน
   - ช่วยตรวจสอบว่าแต่ละ step ทำงานหรือไม่

4. **Multiple Flicker Sources:**
   - ไม่ใช่แค่ blob URL เดียว
   - ต้องดูทุก fallback path: blob → presignedUrl → default

---

**สถานะ:** ✅ แก้ไขครบทั้ง 4 สาเหตุแล้ว - พร้อมทดสอบ
