# วิธีแก้ไข Browser Extension Error

## ปัญหา
```
content.js:10 Uncaught Error: Extension context invalidated.
```

## สาเหตุ
- Browser Extension (เช่น Chrome extension) ถูก reload หรือปิดไป
- แต่ content script ยังทำงานอยู่ในหน้าเว็บ
- **ไม่ใช่ปัญหาของ Q-Collector แอปพลิเคชัน**

## วิธีแก้ไข

### วิธีที่ 1: ปิด Extensions ที่ไม่จำเป็น (แนะนำ)

1. เปิด Chrome Extensions Manager:
   - กด `chrome://extensions/` ในแถบ address bar
   - หรือกด `⋮` (3 จุด) → More tools → Extensions

2. ปิด extensions ที่ไม่จำเป็น:
   - คลิกปุ่ม toggle ให้เป็นสีเทา (ปิด)
   - หรือลบออกเลย (กด "Remove")

3. Refresh หน้าเว็บ:
   - กด `Ctrl + Shift + R` (Windows/Linux)
   - กด `Cmd + Shift + R` (Mac)

### วิธีที่ 2: Reload Extensions

1. เปิด `chrome://extensions/`
2. เปิด "Developer mode" (มุมบนขวา)
3. คลิกปุ่ม "Reload" ที่ extension ที่มีปัญหา
4. Refresh หน้าเว็บ

### วิธีที่ 3: ใช้ Incognito Mode

1. กด `Ctrl + Shift + N` (Windows/Linux)
2. กด `Cmd + Shift + N` (Mac)
3. เปิด `http://localhost:3000`
4. Extensions จะไม่ทำงานใน Incognito Mode (ยกเว้นที่อนุญาตไว้)

### วิธีที่ 4: ใช้ Browser อื่น

- Firefox Developer Edition
- Microsoft Edge
- Brave Browser

## ยืนยันว่าไม่ใช่ปัญหาของ Q-Collector

จาก console log:
```javascript
✅ [API Response] {status: 200, url: '/forms/...'}
✅ [API Response] {status: 200, url: '/subforms/.../submissions/...'}
✅ Extracted value for image_upload: null
✅ Extracted value for province: กาญจนบุรี
✅ Extracted value for factory: โรงงานระยอง
✅ Extracted value for rating: 5
✅ Extracted value for email: poasdf@asdf.com
```

**แอปพลิเคชันทำงานปกติ 100%**

## Extensions ที่มักทำให้เกิดปัญหา

- Google Translate
- Grammarly
- AdBlock/uBlock Origin
- Password Managers
- Screenshot tools
- Developer tools extensions

## ถ้ายังแก้ไม่ได้

1. ปิด Chrome ทั้งหมด
2. เปิดใหม่
3. เปิดแค่ tab เดียว (`localhost:3000`)
4. ถ้ายังเกิด ให้ใช้ Incognito Mode

---

**สรุป:** Error นี้ไม่กระทบการทำงานของ Q-Collector เลย แต่ถ้ารบกวนให้ปิด extensions ที่ไม่จำเป็น
