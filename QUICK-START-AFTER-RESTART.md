# ⚡ Quick Start After Restart

**สิ่งที่ต้องทำทันที** (5 นาที)

---

## 1️⃣ Start Servers

```bash
# Terminal 1: Backend
cd C:\Users\Pongpan\Documents\24Sep25\backend
npm start
# รอจนเห็น: "Server running on port: 5000"

# Terminal 2: Frontend
cd C:\Users\Pongpan\Documents\24Sep25
npm start
# รอจนเห็น: "Compiled successfully!"
```

---

## 2️⃣ Test ว่าระบบทำงาน

```bash
# เปิด browser: http://localhost:3000
# Login: admin account
# ดู console ว่ามี error หรือไม่
```

---

## 3️⃣ ตรวจสอบ PDPA Tab "ฟอร์ม & ข้อมูล"

1. ไปที่: **Privacy & PDPA Management**
2. คลิก profile ใดก็ได้
3. ไปที่ Tab: **"ฟอร์ม & ข้อมูล"**
4. ถ้ายังไม่มีข้อมูล → อ่าน `RESTART-INSTRUCTIONS.md`

---

## 4️⃣ ไฟล์สำคัญ

**วันนี้ทำอะไรไปแล้ว**:
- ✅ Data Retention System (เสร็จสมบูรณ์)
- ✅ Route ordering bug fix (เสร็จสมบูรณ์)
- ⏳ PDPA Tab fix (ยังไม่เสร็จ - ต้องทำต่อ)

**ไฟล์ที่ต้องดู**:
- `RESTART-INSTRUCTIONS.md` → คำแนะนำละเอียด
- `qtodo.md` → Session log และ pending tasks
- `CLAUDE.md` → Project documentation

---

## 5️⃣ Next Task

**Priority**: Fix PDPA Tab "ฟอร์ม & ข้อมูล"

**Steps**:
1. เปิด DevTools (F12)
2. ไปที่ PDPA Dashboard
3. คลิก profile
4. ดู tab "ฟอร์ม & ข้อมูล"
5. ตรวจสอบ console errors
6. ตรวจสอบ Network API calls

**Expected**: ควรแสดงรายการฟอร์มพร้อม PII fields

**If Not Working**: อ่าน Debug Steps ใน `RESTART-INSTRUCTIONS.md`

---

**Good Luck! 🚀**
