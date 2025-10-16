# การวิเคราะห์ปัญหา Image Thumbnail ขยายเต็ม Container

## ปัญหาที่พบ
ภาพ thumbnail ยังคงขยายเต็มความกว้างของ container บน tablet และ PC แม้ว่าจะได้กำหนด `max-w` แล้ว

## รากเหง้าของปัญหา (Root Cause)

### ลำดับชั้น HTML Structure:
```
FileFieldDisplay (SubmissionDetail.jsx line 154)
  └─ <div className="space-y-2">              ← ไม่มีจำกัดขนาด
      └─ ImageThumbnail
          └─ Outer Container (line 194)
              └─ Image Container (line 201)    ← ที่กำหนด w-[calc()] และ max-w
                  └─ <img>
```

### จุดที่มีปัญหา:

1. **Parent Container (`space-y-2`)** - ไม่มี `max-width`
   - ตั้งอยู่ที่ `SubmissionDetail.jsx` line 154
   - เป็น `<div className="space-y-2">` ที่ห่อหุ้ม ImageThumbnail ทั้งหมด
   - ไม่มีการจำกัดขนาด → **ขยายเต็ม GlassCard container**

2. **ImageThumbnail Outer Container** - มี `w-full` บน line 200
   - ทำให้ขยายเต็ม parent container (space-y-2 div)
   - แม้จะมี `md:max-w-fit` แต่ก็ไม่ได้ผลเพราะ `w-full` มีแรงกว่า

3. **Image div** - มี size classes
   - `w-[calc(100vw-2rem)]` บน mobile = 100% ของ space-y-2
   - `sm:w-[390px]` บน desktop = ถูก override ด้วย parent

### ทำไมถึงเกิดปัญหา:

```
GlassCard (max-w-3xl = 768px)
  └─ p-4
      └─ space-y-3
          └─ FileFieldDisplay
              └─ space-y-2 (ไม่จำกัด = 768px-32px = 736px)
                  └─ ImageThumbnail (w-full md:max-w-fit)
                      └─ Outer Container (w-full md:max-w-fit)
                          └─ Image div (w-[calc()] sm:w-[390px])
                              └─ img (w-full h-full)
```

**ผลลัพธ์:** รูปภาพขยายเต็ม 736px แทนที่จะเป็น 390px

## วิธีแก้ที่ถูกต้อง

### ตัวเลือก 1: จำกัด space-y-2 container (แนะนำ)
```jsx
// SubmissionDetail.jsx line 809 (ในส่วน FileFieldDisplay)
<div className="space-y-2 w-full sm:max-w-fit">
  {files.map((file, index) => (
    <ImageThumbnail ... />
  ))}
</div>
```

### ตัวเลือก 2: ลบ w-full จาก ImageThumbnail
```jsx
// image-thumbnail.jsx line 194
<div className={cn(
  'group relative flex flex-col items-center md:flex-row md:items-start',
  'gap-2 md:gap-4',
  'p-2 md:p-3',
  'rounded-lg md:bg-muted/5',
  // ลบ 'w-full',  ← เอาออก
  'md:max-w-fit',
  className
)}>
```

### ตัวเลือก 3: ใช้ inline max-width
```jsx
// image-thumbnail.jsx Image div
<div className={cn(
  'relative overflow-hidden rounded-lg ...',
  'cursor-pointer flex-shrink-0',
  // เพิ่ม !w-[...] เพื่อ override
  adaptive ? '!w-[calc(100vw-2rem)] sm:!w-[390px]' : sizeClasses[size]
)}>
```

## สาเหตุที่ทดลองแก้ก่อนหน้านี้ไม่ได้ผล

1. **v0.7.29-v2:** เพิ่ม `max-w-[390px]` แต่ยังมี `w-full` อยู่
   - `w-full` = width: 100% (แรงกว่า max-width)
   - max-width ทำงานเฉพาะเมื่อ content > 390px แต่ parent บังคับให้เป็น 100%

2. **v0.7.29-v3:** เพิ่ม `md:max-w-fit` ที่ outer container
   - ยังมี `w-full` ที่บรรทัดเดียวกัน → conflict
   - `max-w-fit` ไม่สามารถชนะ `w-full` ได้

## วิธีทดสอบ

```bash
# 1. เปิด Developer Tools
# 2. ไปที่ Elements tab
# 3. หา div.space-y-2 ที่อยู่ใน FileFieldDisplay
# 4. ดู Computed styles:
#    - width: หาก > 390px = ยังมีปัญหา
#    - ควรเป็น: width: 390px (desktop), ~358px (mobile)
```

## สรุป

**ปัญหาหลัก:** Parent container (`<div className="space-y-2">`) ไม่จำกัดขนาด + `w-full` override max-width

**วิธีแก้:** เพิ่ม `sm:max-w-fit` ที่ `<div className="space-y-2">` หรือลบ `w-full` จาก ImageThumbnail outer container
