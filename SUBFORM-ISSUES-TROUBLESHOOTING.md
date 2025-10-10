# Sub-Form Display Issues - Troubleshooting Guide

**วันที่:** 2025-10-10
**สถานะ:** 🔍 กำลังแก้ไข

---

## ปัญหาที่รายงาน

1. **Navigation arrows ไม่ทำงาน** - ไม่สามารถเลื่อนซ้าย-ขวาระหว่าง sub-form submissions
2. **ข้อมูลใหม่ไม่แสดงใน list** - หลังบันทึก sub-form submission ใหม่ แล้วกลับมาดู ไม่เห็นในตาราง

---

## การวินิจฉัย

### ปัญหาที่ 1: Navigation Arrows

**สาเหตุที่เป็นไปได้:**

#### A. Browser Cache ยังเป็น JavaScript เก่า
- Frontend ยังไม่ได้โหลด code ใหม่
- ต้องทำ Hard Refresh

**วิธีแก้:**
```
Windows: Ctrl + Shift + R
Mac: Cmd + Shift + R
หรือ F5 หลายครั้ง
```

#### B. API ไม่ส่งข้อมูล submissions
- Endpoint: `/submissions/${submissionId}/sub-forms/${subFormId}`
- อาจ return count: 0

**ตรวจสอบ Console Log:**
```javascript
🔍 Loading sub-form submissions for navigation: {...}
✅ Sub-form submissions loaded: {count: 2, ...}  // ← ต้องเห็น count > 0
```

**ถ้า count: 0:**
- ตรวจสอบ `currentSubmissionId` ถูกต้องหรือไม่
- ตรวจสอบ `currentSubFormId` ถูกต้องหรือไม่

#### C. Navigation State ไม่ถูกคำนวณ
**ตรวจสอบ Console Log:**
```javascript
🎯 renderSubFormDetail navigation state: {
  allSubSubmissionsCount: 2,    // ← ต้อง > 0
  currentIndex: 0,               // ← ต้อง >= 0
  hasPrevious: false,
  hasNext: true                  // ← ต้องเป็น true ถ้ามีข้อมูลถัดไป
}
```

**ถ้า allSubSubmissionsCount: 0:**
- API ไม่ส่งข้อมูล
- หรือ useEffect ไม่ถูก trigger

---

### ปัญหาที่ 2: ข้อมูลใหม่ไม่แสดงใน List

**สาเหตุที่เป็นไปได้:**

#### A. ข้อมูลบันทึกแล้ว แต่ไม่ refresh list
- หลังบันทึก กลับไปหน้า detail
- แต่ list ยังเป็น cache เก่า

**วิธีแก้:**
```javascript
// ใน SubmissionDetail.jsx ต้องมี useEffect ที่ reload data
useEffect(() => {
  loadSubmissionData();
}, [formId, submissionId]);
```

#### B. ข้อมูลบันทึกผิด parent_id
- `parent_submission_id` ไม่ตรงกับ submission ที่เปิดดู
- ทำให้ query ไม่เจอ

**ตรวจสอบฐานข้อมูล:**
```sql
SELECT id, parent_submission_id, factory_affiliated
FROM service_log_0fcb52ff33c6
ORDER BY submitted_at DESC
LIMIT 5;
```

**ควรเห็น:**
- `parent_submission_id` เหมือนกันทั้งหมด
- เป็น ID ของ main submission

#### C. API ไม่ส่งข้อมูลใหม่กลับมา
- Cache ที่ frontend
- หรือ backend query ผิด

---

## วิธีแก้ไขทีละขั้นตอน

### Step 1: Hard Refresh Browser

```bash
# Windows/Linux
Ctrl + Shift + R

# Mac
Cmd + Shift + R

# หรือ
1. เปิด DevTools (F12)
2. Right-click ที่ปุ่ม refresh
3. เลือก "Empty Cache and Hard Reload"
```

### Step 2: ตรวจสอบ Console Logs

เปิด DevTools → Console Tab

**ควรเห็น Log เหล่านี้:**

1. **เมื่อเข้าหน้า Sub-Form Detail:**
```javascript
🔍 Loading sub-form submissions for navigation: {
  currentSubFormId: "39adffab-...",
  currentSubmissionId: "eb6dcbca-..."
}

✅ Sub-form submissions loaded: {
  count: 3,  // ← จำนวนที่มีจริง
  submissions: [...]
}

🎯 renderSubFormDetail navigation state: {
  allSubSubmissionsCount: 3,
  currentIndex: 0,
  hasPrevious: false,
  hasNext: true
}
```

2. **เมื่อเข้าหน้า Submission Detail:**
```javascript
✅ Loaded X sub-form submissions for [SubForm Title]: {
  subFormId: "...",
  mainFormSubId: "...",
  count: 3,
  sampleData: {
    factory_affiliated: "โรงงานระยอง"  // ← plain text
  }
}
```

### Step 3: ตรวจสอบ Network Tab

DevTools → Network → XHR

**หา Request:**
1. `/submissions/{submissionId}/sub-forms/{subFormId}`
2. `/subforms/{subFormId}/submissions/{subSubmissionId}`

**ดู Response:**
- มี submissions array หรือไม่?
- count ตรงกับจำนวนจริงหรือไม่?
- factory_affiliated เป็น plain text หรือไม่?

### Step 4: ตรวจสอบฐานข้อมูล

```sql
-- หา sub-form table
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name LIKE '%factory%';

-- ตรวจสอบข้อมูล
SELECT
  id,
  parent_submission_id,
  factory_affiliated,
  submitted_at
FROM service_log_0fcb52ff33c6
ORDER BY submitted_at DESC;
```

**ควรเห็น:**
- `parent_submission_id` เหมือนกันทุก record (ของ sub-form เดียวกัน)
- `factory_affiliated` เป็น plain text (ไม่มี `{\"...\"}}`)
- มีข้อมูลตามจำนวนที่บันทึกไป

---

## การแก้ไขเฉพาะจุด

### ปัญหา: Navigation Arrows ไม่แสดง

**เช็ค 1: ข้อมูลโหลดหรือไม่?**
```javascript
// ใน Console ต้องเห็น:
allSubSubmissionsCount: 3  // > 0
```

**ถ้า = 0:**
- API ไม่ส่งข้อมูล → ตรวจสอบ backend
- หรือ useEffect ไม่ทำงาน → ตรวจสอบ dependencies

**เช็ค 2: currentIndex ถูกหรือไม่?**
```javascript
currentIndex: 0  // >= 0 (ถ้า -1 แสดงว่าไม่เจอ)
```

**ถ้า = -1:**
- `currentSubSubmissionId` ไม่ตรงกับ ID ใน array
- ตรวจสอบว่า ID เป็น string หรือ object

**เช็ค 3: hasPrevious/hasNext คำนวณถูกหรือไม่?**
```javascript
// Record 1/3:
hasPrevious: false  // ถูก (ไม่มีก่อนหน้า)
hasNext: true       // ถูก (มีถัดไป)

// Record 2/3:
hasPrevious: true   // ถูก
hasNext: true       // ถูก

// Record 3/3:
hasPrevious: true   // ถูก
hasNext: false      // ถูก (ไม่มีถัดไป)
```

---

### ปัญหา: ข้อมูลใหม่ไม่แสดงใน List

**สาเหตุ:** SubmissionDetail component ไม่ reload data หลังกลับจากหน้า Sub-Form View

**วิธีแก้:**

#### Option 1: เพิ่ม Reload เมื่อกลับมา

แก้ไข `SubmissionDetail.jsx`:

```javascript
useEffect(() => {
  loadSubmissionData();
}, [formId, submissionId]);

// เพิ่ม: Reload เมื่อ window focus
useEffect(() => {
  const handleFocus = () => {
    console.log('🔄 Window focused - reloading data');
    loadSubmissionData();
  };

  window.addEventListener('focus', handleFocus);
  return () => window.removeEventListener('focus', handleFocus);
}, [formId, submissionId]);
```

#### Option 2: ใช้ Callback เมื่อบันทึกเสร็จ

แก้ไข `SubFormView.jsx`:

```javascript
const handleSave = async () => {
  // ... save logic ...

  // หลังบันทึกเสร็จ
  if (onSave) {
    onSave({
      refreshParent: true,  // ← บอกให้ parent reload
      newSubmissionId: result.id
    });
  }
};
```

แก้ไข `MainFormApp.jsx`:

```javascript
const renderSubFormView = () => (
  <SubFormView
    formId={currentFormId}
    submissionId={currentSubmissionId}
    subFormId={currentSubFormId}
    onSave={(result) => {
      // Force reload by re-navigating
      handleNavigate('submission-detail', currentFormId, false, currentSubmissionId);

      // ถ้าต้องการไปดู sub-form ที่สร้างใหม่
      if (result.newSubmissionId) {
        setTimeout(() => {
          handleNavigate('subform-detail', currentFormId, false,
            currentSubmissionId, currentSubFormId, result.newSubmissionId);
        }, 100);
      }
    }}
    onCancel={() => handleNavigate('submission-detail', currentFormId, false, currentSubmissionId)}
  />
);
```

---

## Testing Checklist

### Test 1: Navigation Arrows

- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] เข้าหน้า sub-form detail (submission 1)
- [ ] เช็ค console: `allSubSubmissionsCount > 0`
- [ ] เช็ค console: `hasNext: true`
- [ ] เช็ค UI: เห็นลูกศรขวา
- [ ] คลิกลูกศรขวา
- [ ] ไปที่ submission 2 (URL เปลี่ยน)
- [ ] เช็ค console: `hasPrevious: true`
- [ ] เช็ค UI: เห็นลูกศรซ้าย

### Test 2: ข้อมูลใหม่แสดงใน List

- [ ] เข้าหน้า submission detail
- [ ] คลิก "เพิ่ม Sub-Form Entry"
- [ ] กรอกข้อมูล (รวม factory field)
- [ ] บันทึก
- [ ] กลับไปหน้า submission detail
- [ ] เช็ค: เห็นข้อมูลใหม่ในตาราง sub-form
- [ ] คลิกดูข้อมูลใหม่
- [ ] เช็ค: factory field แสดงถูกต้อง

---

## คำถามสำหรับผู้ใช้

กรุณาตอบคำถามเหล่านี้เพื่อช่วยวินิจฉัย:

### Navigation Issues:

1. **คุณทำ Hard Refresh แล้วหรือยัง?** (Ctrl+Shift+R)
   - [ ] ยังไม่ได้ทำ
   - [ ] ทำแล้ว แต่ยังไม่ทำงาน

2. **เมื่อคลิกลูกศร มีอะไรเกิดขึ้น?**
   - [ ] ไม่มีอะไรเกิดขึ้นเลย
   - [ ] มี error ใน console
   - [ ] URL เปลี่ยน แต่หน้าไม่เปลี่ยน
   - [ ] อื่นๆ: ________________

3. **Console log แสดงอะไร?**
   - Screenshot หรือ copy log มาให้ดู

### List Display Issues:

4. **หลังบันทึก sub-form ใหม่ คุณทำอะไร?**
   - [ ] กดปุ่ม Back กลับไปหน้า detail
   - [ ] กด Browser back button
   - [ ] คลิก breadcrumb
   - [ ] Refresh หน้า

5. **ถ้าคุณ refresh หน้า submission detail ใหม่ (F5) ข้อมูลปรากฏหรือไม่?**
   - [ ] ปรากฏ (แสดงว่าข้อมูลบันทึกแล้ว แต่ไม่ auto-refresh)
   - [ ] ยังไม่ปรากฏ (แสดงว่าข้อมูลอาจไม่ได้บันทึก หรือ query ผิด)

6. **Database มีข้อมูลหรือไม่?**
   - รัน query ด้านบนและส่ง screenshot มา

---

## ขั้นตอนถัดไป

เมื่อได้รับคำตอบจากผู้ใช้:

### ถ้า Navigation ยังไม่ทำงาน:
1. เช็ค console log ว่า API ส่งข้อมูลมาหรือไม่
2. เช็ค Network tab ว่า request สำเร็จหรือไม่
3. แก้ไข useEffect dependencies
4. เพิ่ม force reload mechanism

### ถ้าข้อมูลไม่แสดงใน List:
1. เพิ่ม window focus listener
2. ใช้ callback เมื่อบันทึกเสร็จ
3. Force reload parent component
4. เช็ค parent_submission_id ในฐานข้อมูล

---

**กรุณาส่งข้อมูลต่อไปนี้:**
1. ✅ คำตอบจาก checklist ข้างบน
2. ✅ Screenshot console logs
3. ✅ Screenshot Network tab (XHR requests)
4. ✅ ผลลัพธ์จาก SQL query

**จากนั้นเราจะแก้ไขให้เฉพาะจุดครับ!** 🎯
