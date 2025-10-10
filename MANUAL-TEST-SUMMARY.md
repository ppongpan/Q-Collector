# 📋 Manual Testing Guide - Quick Start

**สำหรับการทดสอบ Q-Collector v0.7.2-dev**
**วันที่:** 2025-10-05

---

## 🎯 เป้าหมาย

ทดสอบระบบการสร้างฟอร์มพร้อม Sub-Form ให้แน่ใจว่า:
1. สร้างฟอร์มหลักได้สำเร็จ (3 ฟิลด์)
2. Toggle Icons ทำงานถูกต้อง (Required → Table → Telegram)
3. สร้าง Sub-Form 2 อันได้ (ข้อมูลที่อยู่ 3 ฟิลด์, เอกสารแนบ 2 ฟิลด์)
4. บันทึกและตรวจสอบ Database ถูกต้อง

---

## ⚙️ ขั้นตอนเตรียมการ (5 นาที)

### 1. ตรวจสอบ Services

```bash
# ตรวจสอบ Backend
netstat -ano | findstr :5000
# ควรเห็น: TCP 0.0.0.0:5000 ... LISTENING

# ตรวจสอบ Frontend
netstat -ano | findstr :3000
# ควรเห็น: TCP 0.0.0.0:3000 ... LISTENING

# ตรวจสอบ Docker
docker ps
# ควรเห็น: qcollector_postgres, qcollector_redis, qcollector_minio (3 containers)
```

**ผลลัพธ์:**
- ✅ Backend (5000): ________________
- ✅ Frontend (3000): ________________
- ✅ PostgreSQL: ________________
- ✅ Redis: ________________
- ✅ MinIO: ________________

---

### 2. เตรียม Login

**URL:** http://localhost:3000

**Credentials:**
- Username: `pongpanp`
- Password: `Gfvtmiu613`
- 2FA OTP: เตรียม Authenticator App ไว้

---

## 🧪 ขั้นตอนทดสอบ (20-30 นาที)

### 📍 Part 1: Login & Navigate (2 นาที)

1. เปิด http://localhost:3000
2. กรอก Username: `pongpanp`
3. กรอก Password: `Gfvtmiu613`
4. คลิก "เข้าสู่ระบบ"
5. **กรอก OTP 6 หลัก** จาก Authenticator App
6. รอเข้าหน้า "จัดการฟอร์ม"
7. คลิกปุ่ม **+** (มุมขวาบน)
8. เห็นหน้า "สร้างฟอร์มใหม่"

**✅ Checkpoint:** เห็น heading "สร้างฟอร์มใหม่" และมีฟิลด์ default 1 ฟิลด์

---

### 📍 Part 2: ตั้งค่าฟอร์มหลัก (5 นาที)

#### 2.1 ตั้งชื่อฟอร์ม

1. คลิกที่ข้อความ **"คลิกเพื่อระบุชื่อฟอร์ม..."**
2. พิมพ์: `ฟอร์มทดสอบระบบ Sub-Form`
3. กด **Enter**

#### 2.2 ตั้งคำอธิบาย

1. คลิกที่ข้อความ **"คลิกเพื่อเพิ่มคำอธิบายฟอร์ม..."**
2. พิมพ์: `ทดสอบการสร้างฟอร์มพร้อม Sub-Form และการตั้งค่าฟิลด์`
3. กด **Enter**

**✅ Checkpoint:** เห็นชื่อและคำอธิบายฟอร์มที่ตั้งไว้

---

### 📍 Part 3: จัดการฟิลด์ (8 นาที)

#### 3.1 แก้ไขฟิลด์ Default

1. คลิกที่การ์ด **"Untitled Field"** (ตรงกลางการ์ด ไม่ใช่ icon)
2. การ์ดขยาย → เห็น input "ชื่อฟิลด์"
3. เปลี่ยนเป็น: `ชื่อ-นามสกุล`
4. input "Placeholder" → พิมพ์: `กรอกชื่อและนามสกุลของคุณ`
5. คลิก header ของการ์ดอีกครั้ง → การ์ดย่อ

#### 3.2 Toggle Icons - ฟิลด์ "ชื่อ-นามสกุล"

**สำคัญ:** icons อยู่ตรงมุมขวาบนของการ์ด (ตอนย่อ)

1. **Required (🔴):**
   - Hover เหนือ icon แรก → tooltip: "ทำให้เป็นฟิลด์จำเป็น"
   - คลิก → icon เปลี่ยนเป็น **สีแดง** พร้อม dot badge

2. **Show in Table (🔵):**
   - Hover เหนือ icon ที่สอง → tooltip: "แสดงในตาราง"
   - คลิก → icon เปลี่ยนเป็น **สีน้ำเงิน** พร้อม dot badge

3. **Telegram (🟢):**
   - Hover เหนือ icon ที่สาม → tooltip: "เปิดแจ้งเตือน Telegram"
   - คลิก → icon เปลี่ยนเป็น **สีเขียว** พร้อม dot badge

**✅ Checkpoint:** เห็น 3 icons เปลี่ยนสีเป็น 🔴🔵🟢

---

#### 3.3 เพิ่มฟิลด์ที่ 2: อีเมล

1. scroll ลงล่าง → คลิก **"เพิ่มฟิลด์ใหม่"**
2. คลิก dropdown เลือกประเภทฟิลด์
3. เลือก **"อีเมล"**
4. ขยายการ์ด → ตั้งชื่อ: `อีเมล`
5. Placeholder: `example@domain.com`
6. ย่อการ์ด
7. Toggle: 🔴 Required ✅, 🔵 Table ✅

**✅ Checkpoint:** ฟิลด์ "อีเมล" มี 2 toggle สีแดงและน้ำเงิน

---

#### 3.4 เพิ่มฟิลด์ที่ 3: เบอร์โทรศัพท์

1. คลิก **"เพิ่มฟิลด์ใหม่"**
2. เลือกประเภท: **"เบอร์โทร"**
3. ขยายการ์ด → ตั้งชื่อ: `เบอร์โทรศัพท์`
4. Placeholder: `08X-XXX-XXXX`
5. ย่อการ์ด
6. Toggle: 🔴 Required ✅

**✅ Checkpoint:** มีฟิลด์ทั้งหมด 3 ฟิลด์

---

### 📍 Part 4: สร้าง Sub-Forms (10 นาที)

#### 4.1 เปลี่ยนไป Tab ฟอร์มย่อย

1. ดูที่ด้านบน → เห็นปุ่ม **`(1)`** และ **`(0)`**
2. Hover `(1)` → tooltip: "ฟอร์มหลัก"
3. Hover `(0)` → tooltip: "ฟอร์มย่อย"
4. คลิก **`(0)`**
5. เห็นปุ่ม **"เพิ่มฟอร์มย่อย"**

---

#### 4.2 Sub-Form 1: ข้อมูลที่อยู่

**สร้าง Sub-Form:**
1. คลิก **"เพิ่มฟอร์มย่อย"**
2. เห็นการ์ดเส้นประ พร้อม icon 📚
3. คลิก "คลิกเพื่อระบุชื่อฟอร์มย่อย" → พิมพ์: `ข้อมูลที่อยู่` → Enter
4. คลิก "คลิกเพื่อเพิ่มคำอธิบาย..." → พิมพ์: `กรอกข้อมูลที่อยู่สำหรับการติดต่อ` → Enter

**เพิ่มฟิลด์ใน Sub-Form:**

**ฟิลด์ 1: ที่อยู่**
1. คลิก **"เพิ่มฟิลด์"** (ภายใน sub-form card)
2. เลือกประเภท: **"ข้อความยาว"**
3. ขยาย → ชื่อ: `ที่อยู่`
4. Placeholder: `เลขที่ ถนน ตำบล อำเภอ`

**ฟิลด์ 2: จังหวัด**
1. คลิก **"เพิ่มฟิลด์"**
2. เลือกประเภท: **"จังหวัด"**
3. ขยาย → ชื่อ: `จังหวัด`

**ฟิลด์ 3: รหัสไปรษณีย์**
1. คลิก **"เพิ่มฟิลด์"**
2. เลือกประเภท: **"ตัวเลข"**
3. ขยาย → ชื่อ: `รหัสไปรษณีย์`
4. Placeholder: `10000`

**✅ Checkpoint:** Sub-Form "ข้อมูลที่อยู่" มี 3 ฟิลด์

---

#### 4.3 Sub-Form 2: เอกสารแนบ

**สร้าง Sub-Form:**
1. คลิก **"เพิ่มฟอร์มย่อย"** อีกครั้ง
2. ชื่อ: `เอกสารแนบ`
3. คำอธิบาย: `แนบเอกสารประกอบ`

**เพิ่มฟิลด์:**

**ฟิลด์ 1: ไฟล์เอกสาร**
1. คลิก **"เพิ่มฟิลด์"**
2. เลือกประเภท: **"แนบไฟล์"**
3. ชื่อ: `ไฟล์เอกสาร`

**ฟิลด์ 2: รูปภาพประกอบ**
1. คลิก **"เพิ่มฟิลด์"**
2. เลือกประเภท: **"แนบรูป"**
3. ชื่อ: `รูปภาพประกอบ`

**✅ Checkpoint:** มี Sub-Form 2 อัน (ข้อมูลที่อยู่ 3 ฟิลด์, เอกสารแนบ 2 ฟิลด์)

---

### 📍 Part 5: บันทึกและตรวจสอบ (5 นาที)

#### 5.1 บันทึกฟอร์ม

1. scroll ขึ้นบน
2. มุมขวาบน → เห็น **icon pulsing สีส้ม** (กำลัง animate)
3. Hover → tooltip: "บันทึกฟอร์ม"
4. **คลิก icon**
5. รอ 2-3 วินาที
6. เห็น **toast notification** สีเขียว: "บันทึกสำเร็จ" หรือ "Success"
7. กลับไปหน้า "จัดการฟอร์ม"

**✅ Checkpoint:** เห็นฟอร์มใหม่ "ฟอร์มทดสอบระบบ Sub-Form" ในรายการ

---

#### 5.2 ตรวจสอบ Database

**เปิด PostgreSQL:**
```bash
psql -h localhost -p 5432 -U qcollector_dev -d qcollector_dev
# Password: qcollector_dev_2025
```

**1. หา Form ID:**
```sql
SELECT id, title, is_active
FROM forms
WHERE title = 'ฟอร์มทดสอบระบบ Sub-Form'
ORDER BY created_at DESC
LIMIT 1;
```

คัดลอก **id** (UUID) ไว้ใช้ในคำสั่งถัดไป

**2. นับฟิลด์หลัก:**
```sql
SELECT COUNT(*) as main_fields
FROM fields
WHERE form_id = 'YOUR_FORM_ID_HERE'
  AND sub_form_id IS NULL;
```
**Expected:** `3`

**3. นับ Sub-Forms:**
```sql
SELECT COUNT(*) as sub_forms
FROM sub_forms
WHERE form_id = 'YOUR_FORM_ID_HERE';
```
**Expected:** `2`

**4. ตรวจสอบฟิลด์แต่ละ Sub-Form:**
```sql
SELECT
  sf.title as subform_name,
  COUNT(f.id) as field_count
FROM sub_forms sf
LEFT JOIN fields f ON f.sub_form_id = sf.id
WHERE sf.form_id = 'YOUR_FORM_ID_HERE'
GROUP BY sf.id, sf.title;
```
**Expected:**
- `ข้อมูลที่อยู่` → 3 fields
- `เอกสารแนบ` → 2 fields

**5. ตรวจสอบ Field Settings:**
```sql
SELECT
  title,
  required,
  show_in_table,
  send_telegram
FROM fields
WHERE form_id = 'YOUR_FORM_ID_HERE'
  AND sub_form_id IS NULL
ORDER BY "order";
```
**Expected:**
| title | required | show_in_table | send_telegram |
|-------|----------|---------------|---------------|
| ชื่อ-นามสกุล | t | t | t |
| อีเมล | t | t | f |
| เบอร์โทรศัพท์ | t | f | f |

**6. ตรวจสอบ Dynamic Tables:**
```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'form_%'
ORDER BY tablename DESC
LIMIT 5;
```
**Expected:** เห็น 3 tables
- `form_XXXXX` (main)
- `form_XXXXX_subform_XXXXX` (ข้อมูลที่อยู่)
- `form_XXXXX_subform_XXXXX` (เอกสารแนบ)

---

## ✅ ผลการทดสอบ

### สรุป

| ส่วน | ผลลัพธ์ | หมายเหตุ |
|------|---------|----------|
| 1. Login & Navigate | ⬜ ✅ ⬜ ❌ | ___________ |
| 2. ตั้งค่าฟอร์มหลัก | ⬜ ✅ ⬜ ❌ | ___________ |
| 3. จัดการฟิลด์ | ⬜ ✅ ⬜ ❌ | ___________ |
| 4. สร้าง Sub-Forms | ⬜ ✅ ⬜ ❌ | ___________ |
| 5. บันทึกและตรวจสอบ | ⬜ ✅ ⬜ ❌ | ___________ |

### Database Verification Results

| Query | Expected | Actual | Status |
|-------|----------|--------|--------|
| Main Fields | 3 | _____ | ⬜ ✅ ⬜ ❌ |
| Sub-Forms | 2 | _____ | ⬜ ✅ ⬜ ❌ |
| Sub-Form 1 Fields | 3 | _____ | ⬜ ✅ ⬜ ❌ |
| Sub-Form 2 Fields | 2 | _____ | ⬜ ✅ ⬜ ❌ |
| Dynamic Tables | 3 | _____ | ⬜ ✅ ⬜ ❌ |

### ปัญหาที่พบ (ถ้ามี)

1. _______________________________________________________________
2. _______________________________________________________________
3. _______________________________________________________________

---

## 📸 Screenshots Checklist

⬜ login-success.png
⬜ form-builder-initial.png
⬜ form-title-set.png
⬜ field-toggles-active.png
⬜ three-fields-added.png
⬜ subform-1-complete.png
⬜ subform-2-complete.png
⬜ form-saved-success.png
⬜ database-verification.png

---

## 📞 Support

**ปัญหา?** ดูที่:
- `docs/UI-INTERACTION-GUIDE.md` - คู่มือ UI interactions
- `docs/TESTING-SUBFORM-GUIDE.md` - คู่มือทดสอบแบบละเอียด
- `docs/MANUAL-TEST-CHECKLIST.md` - Checklist แบบเต็ม

**Form ID สำหรับ Query:**
```
_______________________________________________________
```

---

**ผู้ทดสอบ:** _________________
**วันที่:** _________________
**เวลาทดสอบ:** _________ นาที
**ผลรวม:** ⬜ **PASS** ⬜ **FAIL**
