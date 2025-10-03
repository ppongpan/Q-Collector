# LibreTranslate Migration Guide

**ปรับเปลี่ยนฟอร์มที่สร้างไว้แล้วให้ใช้ระบบแปลแบบใหม่**

Version: 1.0.0
Date: 2025-10-02
Status: ✅ Ready for Use

---

## 📋 สารบัญ

1. [ภาพรวม](#ภาพรวม)
2. [ความแตกต่างระหว่างระบบเดิมและใหม่](#ความแตกต่างระหว่างระบบเดิมและใหม่)
3. [ขั้นตอนการ Migration](#ขั้นตอนการ-migration)
4. [การใช้งาน Scripts](#การใช้งาน-scripts)
5. [การ Rollback](#การ-rollback)
6. [FAQ](#faq)

---

## ภาพรวม

Migration นี้จะอัปเกรดระบบแปลภาษาจาก **Dictionary + Transliteration** เป็น **LibreTranslate API** เพื่อให้ได้ผลลัพธ์ที่แม่นยำกว่า

### สิ่งที่จะเปลี่ยนแปลง:

- ✅ **ชื่อตาราง (Table Names)** - แปลใหม่ด้วย LibreTranslate
- ✅ **ชื่อคอลัมน์ (Column Names)** - แปลใหม่ให้ตรงความหมาย
- ✅ **Foreign Key References** - อัปเดตอ้างอิงอัตโนมัติ
- ✅ **forms.table_name** - อัปเดตในฐานข้อมูล

### สิ่งที่ไม่เปลี่ยนแปลง:

- ❌ **ข้อมูล (Data)** - ข้อมูลทั้งหมดคงเดิม
- ❌ **โครงสร้างตาราง (Schema)** - ชนิดข้อมูล (data type) คงเดิม
- ❌ **Form IDs** - ID ของฟอร์มไม่เปลี่ยน

---

## ความแตกต่างระหว่างระบบเดิมและใหม่

### ระบบเดิม (Dictionary + Transliteration)

```javascript
"แบบสอบถามความพึงพอใจ"
↓
Dictionary: ไม่เจอ
↓
Transliteration: "form_s_o_b_th_a_m_kh_w_a_m_ph_ue_ng_ph_o_ai_ch"
```

**ปัญหา:**
- ❌ ไม่มีความหมาย (ถอดเสียง)
- ❌ ชื่อยาวเกินไป
- ❌ AI/PowerBI อ่านไม่เข้าใจ

---

### ระบบใหม่ (LibreTranslate API)

```javascript
"แบบสอบถามความพึงพอใจ"
↓
LibreTranslate API
↓
"satisfaction_survey"
```

**ข้อดี:**
- ✅ มีความหมายตรงตามต้นฉบับ
- ✅ ชื่อสั้นกระชับ
- ✅ AI/PowerBI เข้าใจได้ทันที
- ✅ SEO-friendly

---

## ขั้นตอนการ Migration

### Prerequisite

1. **เปิด LibreTranslate Service:**
   ```bash
   docker-compose up -d libretranslate
   ```

2. **ตรวจสอบว่า service รันอยู่:**
   ```bash
   curl http://localhost:5555/languages
   ```

3. **ตั้งค่า Environment Variables:**
   ```bash
   # .env
   LIBRETRANSLATE_URL=http://localhost:5555
   LIBRETRANSLATE_API_KEY=  # (ถ้ามี)
   ```

---

### ขั้นตอนที่ 1: ตรวจสอบฟอร์มที่มีอยู่

```bash
node backend/scripts/check-existing-forms.js
```

**ผลลัพธ์:**
- แสดงรายการฟอร์มทั้งหมด
- ตรวจสอบว่ามี table อยู่จริงหรือไม่
- ระบุฟอร์มที่ต้อง migrate

---

### ขั้นตอนที่ 2: ดู Preview (Dry-Run)

```bash
node backend/scripts/migrate-retranslate-forms.js --dry-run
```

**ผลลัพธ์:**
```
=================================================
📊 Migration Preview
=================================================

  Forms to migrate:   5
  Tables to rename:   3
  Columns to rename:  12

=================================================
✅ DRY-RUN COMPLETE (No changes applied)
=================================================
```

**ตัวอย่างการเปลี่ยนแปลง:**
```
[1] "แบบสอบถามความพึงพอใจ"
   Old table: form_s_o_b_th_a_m_kh_w_a_m_abc123
   New table: form_satisfaction_survey_abc123
   Source:    libretranslate (90% confidence)

   Columns:
     kh_w_a_m_kh_i_d_e_h_n → feedback
     ch_ue_o_ph_ue_ng_p_kh_r_ng → full_name
     email → email (no change)
```

---

### ขั้นตอนที่ 3: สำรองข้อมูล (Backup)

```bash
node backend/scripts/backup-database.js
```

**ผลลัพธ์:**
```
💾 Backup completed successfully!
   File size: 2.45 MB
   Output:    backups/backup-2025-10-02T12-34-56.json
```

---

### ขั้นตอนที่ 4: รัน Migration

```bash
node backend/scripts/migrate-retranslate-forms.js
```

**Process:**
1. สร้าง backup อัตโนมัติ (ถ้าไม่มี)
2. แปลชื่อฟอร์มใหม่ด้วย LibreTranslate
3. แปลชื่อฟิลด์ใหม่
4. แสดง preview และขอ confirmation
5. เปลี่ยนชื่อ tables และ columns
6. อัปเดต `forms.table_name`
7. ตรวจสอบความถูกต้อง

**Confirmation Prompt:**
```
Create database backup before migration? (y/N): y
💾 Backing up...

Apply these changes to the database? (y/N): y
🔄 Migrating...
```

---

### ขั้นตอนที่ 5: ตรวจสอบผลลัพธ์

```bash
node backend/scripts/check-existing-forms.js
```

**ตรวจสอบ:**
- ✅ Table names อัปเดตแล้ว
- ✅ Column names แปลใหม่แล้ว
- ✅ Data ครบถ้วน (จำนวน row เท่าเดิม)
- ✅ Foreign keys ทำงานปกติ

---

## การใช้งาน Scripts

### 1. check-existing-forms.js

**วัตถุประสงค์:** ตรวจสอบฟอร์มและตารางที่มีอยู่

**ใช้งาน:**
```bash
node backend/scripts/check-existing-forms.js
```

**Output:**
- รายการฟอร์มทั้งหมด
- ตารางที่เชื่อมโยงกับฟอร์ม
- ตาราง orphaned (ไม่มีฟอร์มอ้างอิง)
- ฟอร์มที่ต้อง retranslate

---

### 2. backup-database.js

**วัตถุประสงค์:** สำรองข้อมูลก่อน migrate

**ใช้งาน:**
```bash
# Backup ชื่อ default
node backend/scripts/backup-database.js

# Backup ชื่อกำหนดเอง
node backend/scripts/backup-database.js --output my-backup.json
```

**Output:**
- JSON file ใน `backups/`
- รวม forms, sub_forms, และ dynamic tables
- รวมโครงสร้างและข้อมูลทั้งหมด

---

### 3. migrate-retranslate-forms.js

**วัตถุประสงค์:** Migrate ฟอร์มเดิมให้ใช้ LibreTranslate

**ใช้งาน:**
```bash
# Dry-run (preview เท่านั้น)
node backend/scripts/migrate-retranslate-forms.js --dry-run

# Apply migration (มี backup prompt)
node backend/scripts/migrate-retranslate-forms.js

# Apply migration (skip backup prompt)
node backend/scripts/migrate-retranslate-forms.js --force
```

**Features:**
- ✅ Dry-run mode
- ✅ Auto backup
- ✅ Confirmation prompts
- ✅ Rollback on error
- ✅ Progress logging

---

### 4. rollback-migration.js

**วัตถุประสงค์:** คืนค่าฐานข้อมูลจาก backup

**ใช้งาน:**
```bash
node backend/scripts/rollback-migration.js backups/backup-2025-10-02T12-34-56.json
```

**Process:**
1. โหลด backup file
2. แสดงข้อมูล backup
3. ขอ confirmation
4. Restore forms และ sub_forms
5. Restore dynamic tables (recreate ถ้าไม่มี)
6. Restore ข้อมูลทั้งหมด

---

## การ Rollback

### เมื่อไหร่ควร Rollback?

- ❌ Migration ล้มเหลว
- ❌ ข้อมูลสูญหาย
- ❌ Column names ไม่ถูกต้อง
- ❌ Application พัง

### วิธี Rollback:

1. **หยุด Application:**
   ```bash
   # Stop backend
   pkill -f "node.*server.js"
   ```

2. **Rollback จาก Backup:**
   ```bash
   node backend/scripts/rollback-migration.js backups/backup-YYYY-MM-DDTHH-MM-SS.json
   ```

3. **ตรวจสอบผลลัพธ์:**
   ```bash
   node backend/scripts/check-existing-forms.js
   ```

4. **เริ่ม Application ใหม่:**
   ```bash
   npm run dev
   ```

---

## FAQ

### Q1: Migration ใช้เวลานานแค่ไหน?

**A:** ขึ้นอยู่กับจำนวนฟอร์มและฟิลด์
- 10 forms, 50 fields: ~2-3 นาที
- 100 forms, 500 fields: ~10-15 นาที
- LibreTranslate API: ~200ms/request

---

### Q2: Migration ทำงานขณะที่ user ใช้งานได้ไหม?

**A:** ❌ **ไม่แนะนำ**

**วิธีที่ปลอดภัย:**
1. แจ้ง downtime ล่วงหน้า
2. หยุด application
3. รัน migration
4. ตรวจสอบผลลัพธ์
5. เปิด application ใหม่

---

### Q3: ถ้า LibreTranslate ไม่พร้อมใช้งานจะเกิดอะไร?

**A:** Migration จะใช้ **Fallback System:**
1. LibreTranslate API (preferred)
2. Dictionary lookup
3. Transliteration (last resort)

**แนะนำ:** ตรวจสอบว่า LibreTranslate รันอยู่ก่อน migrate

---

### Q4: สามารถ migrate เฉพาะบางฟอร์มได้ไหม?

**A:** ปัจจุบันยังไม่ได้ทำ แต่สามารถแก้ script ได้:

```javascript
// ใน migrate-retranslate-forms.js
const forms = await sequelize.query(
  'SELECT * FROM forms WHERE id IN (:ids) ORDER BY created_at',
  {
    replacements: { ids: [1, 2, 3] }, // form IDs to migrate
    type: QueryTypes.SELECT
  }
);
```

---

### Q5: Migration มีผลกับ API หรือไม่?

**A:** ✅ **ไม่มีผล** - ตราบใดที่ API ใช้ `form_id` ไม่ใช่ `table_name` โดยตรง

**แต่ถ้าใช้ `table_name` ใน code:**
- Update query ให้ใช้ชื่อใหม่
- หรือ query ผ่าน `forms.table_name`

---

### Q6: PowerBI จะยังใช้ได้ไหม?

**A:** ต้อง **อัปเดต connection string**

**ก่อน:**
```
Server: localhost
Table: form_s_o_b_th_a_m_kh_w_a_m_abc123
```

**หลัง:**
```
Server: localhost
Table: form_satisfaction_survey_abc123
```

**วิธีหาชื่อใหม่:**
```bash
node backend/scripts/check-existing-forms.js
```

---

## 🔥 Best Practices

1. **Backup ก่อนเสมอ:**
   ```bash
   node backend/scripts/backup-database.js
   ```

2. **ทดสอบ Dry-Run ก่อน:**
   ```bash
   node backend/scripts/migrate-retranslate-forms.js --dry-run
   ```

3. **ทำใน Environment ทดสอบก่อน:**
   - Development → Staging → Production

4. **เก็บ Backup หลายชุด:**
   - ก่อน migrate
   - หลัง migrate สำเร็จ
   - เก็บไว้อย่างน้อย 30 วัน

5. **ตรวจสอบ LibreTranslate:**
   ```bash
   curl http://localhost:5555/translate \
     -d "q=ทดสอบ" \
     -d "source=th" \
     -d "target=en"
   ```

---

## 📞 Support

**ถ้าพบปัญหา:**
1. เช็ค logs: `backend/logs/app.log`
2. รัน: `node backend/scripts/check-existing-forms.js`
3. Rollback: `node backend/scripts/rollback-migration.js <backup-file>`

**Contact:**
- GitHub Issues: [Q-Collector Issues](https://github.com/your-org/q-collector/issues)
- Email: support@qcollector.local

---

**Version:** 1.0.0
**Last Updated:** 2025-10-02
**Status:** ✅ Production Ready
