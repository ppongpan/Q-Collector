# Migration Execution Plan - Retranslate Existing Forms

**แผนการ Migrate ฟอร์มเดิมทั้งหมดให้ใช้ระบบแปลใหม่**

Date: 2025-10-02
Status: 🚀 Ready to Execute

---

## 📋 Pre-Migration Checklist

### ขั้นตอนที่ 1: เตรียมความพร้อม

- [ ] **1.1 เปิด Docker Desktop**
  ```
  เปิด Docker Desktop application
  รอจนกว่า Docker จะพร้อมใช้งาน (สัญลักษณ์เป็นสีเขียว)
  ```

- [ ] **1.2 เริ่ม Services ที่จำเป็น**
  ```bash
  # เปิด Terminal ที่ root project
  cd C:\Users\Pongpan\Documents\24Sep25

  # เริ่ม PostgreSQL, LibreTranslate, และ services อื่นๆ
  docker-compose up -d postgres libretranslate

  # รอประมาณ 30 วินาที ให้ services เริ่มต้น
  timeout /t 30 /nobreak
  ```

- [ ] **1.3 ตรวจสอบว่า Services พร้อมใช้งาน**
  ```bash
  # ตรวจสอบ PostgreSQL
  docker-compose ps postgres

  # ตรวจสอบ LibreTranslate
  curl http://localhost:5555/languages

  # ควรได้ผลลัพธ์ list ของภาษาที่รองรับ
  ```

- [ ] **1.4 ตรวจสอบฟอร์มที่มีอยู่**
  ```bash
  node backend/scripts/check-existing-forms.js
  ```

---

## 📊 Step 1: ตรวจสอบฟอร์มปัจจุบัน

```bash
node backend/scripts/check-existing-forms.js
```

**คาดหวังผลลัพธ์:**
```
=================================================
📊 Existing Forms and Tables Analysis
=================================================

Found X forms in database

#   | Form Title              | Current Table Name          | Created At
──────────────────────────────────────────────────────────────────────
1   | แบบฟอร์มติดต่อ         | form_contact_abc123         | 2025-10-01
2   | แบบสอบถาม...           | form_s_o_b_th_a_m_...       | 2025-10-01

📈 Statistics:
  Total Forms:           X
  With Table Name:       X
  Without Table Name:    0

🔄 Translation Readiness:
  Forms with Thai Names:     X (need retranslation)
  Forms with English Names:  0 (already OK)
```

**บันทึกผลลัพธ์:** จำนวนฟอร์มที่ต้อง migrate = ______

---

## 💾 Step 2: สำรองข้อมูล (BACKUP)

```bash
node backend/scripts/backup-database.js
```

**คาดหวังผลลัพธ์:**
```
=================================================
💾 Database Backup Script
=================================================

✅ Created backup directory: backups

✅ Database connection established

📋 Backing up forms table...
   ✅ Backed up X forms

📋 Backing up sub_forms table...
   ✅ Backed up X sub-forms

📊 Backing up dynamic tables...
   ✅ form_contact_abc123 (5 rows)
   ✅ form_survey_def456 (12 rows)

💾 Writing backup to: backups/backup-2025-10-02T12-34-56.json
✅ Backup completed successfully!
   File size: 2.45 MB

=================================================
📊 Backup Summary
=================================================

  Forms:          X
  Sub-Forms:      X
  Dynamic Tables: X
  Total Rows:     X
  File Size:      X.XX MB
  Output:         backups/backup-2025-10-02T12-34-56.json
```

**บันทึก Backup File:** `backups/backup-YYYY-MM-DDTHH-MM-SS.json`

---

## 🔍 Step 3: Dry-Run (ดูตัวอย่างการเปลี่ยนแปลง)

```bash
node backend/scripts/migrate-retranslate-forms.js --dry-run
```

**คาดหวังผลลัพธ์:**
```
=================================================
🔄 Form Retranslation Migration (LibreTranslate)
=================================================

⚠️  DRY-RUN MODE: No changes will be applied

✅ Database connection established

📋 Step 2: Load existing forms

Found X forms

🔄 Step 3: Retranslate form names

[1] "แบบฟอร์มติดต่อ"
   Old table: form_contact_abc123
   New table: form_contact_form_xyz789
   Source:    dictionary (100% confidence)
   Exists:    ✅ YES

[2] "แบบสอบถามความพึงพอใจ"
   Old table: form_s_o_b_th_a_m_kh_w_a_m_ph_ue_ng_ph_o_ai_ch
   New table: form_satisfaction_survey_def456
   Source:    libretranslate (90% confidence)
   Exists:    ✅ YES

🔄 Step 4: Retranslate field names

[1] Processing fields for "แบบฟอร์มติดต่อ"
   Found X user columns

     ch_ue_o → full_name (dictionary)
     e_b_o_r_th_o_r → phone_number (dictionary)
     email → email (already_english)

[2] Processing fields for "แบบสอบถามความพึงพอใจ"
   Found X user columns

     kh_w_a_m_kh_i_d_e_h_n → feedback (libretranslate)
     r_a_kh_a_e_n → rating (dictionary)

=================================================
📊 Migration Preview
=================================================

  Forms to migrate:   X
  Tables to rename:   X
  Columns to rename:  X

=================================================
✅ DRY-RUN COMPLETE (No changes applied)
=================================================
```

**ตรวจสอบ:**
- [ ] การแปลชื่อฟอร์มถูกต้อง?
- [ ] การแปลชื่อฟิลด์ถูกต้อง?
- [ ] จำนวน tables/columns ตรงกับที่คาดหวัง?

**ถ้าไม่ถูกต้อง:** หยุดตรงนี้ และแก้ไข dictionary ก่อน

---

## ⚡ Step 4: Execute Migration (รัน Migration จริง)

```bash
node backend/scripts/migrate-retranslate-forms.js
```

**Interactive Prompts:**

### Prompt 1: Create Backup?
```
Create database backup before migration? (y/N): y
```
**ตอบ:** `y` (แนะนำให้ backup อีกครั้ง)

### Prompt 2: Apply Changes?
```
Apply these changes to the database? (y/N): y
```
**ตอบ:** `y` (เริ่ม migration)

**คาดหวังผลลัพธ์:**
```
=================================================
🔄 Form Retranslation Migration (LibreTranslate)
=================================================

✅ Database connection established

📋 Step 1: Create backup

💾 Backing up...
✅ Backup completed: backups/backup-2025-10-02T12-45-00.json

📋 Step 2: Load existing forms

Found X forms

🔄 Step 3: Retranslate form names

[1] "แบบฟอร์มติดต่อ"
   Old table: form_contact_abc123
   New table: form_contact_form_xyz789
   Source:    dictionary (100% confidence)

[2] "แบบสอบถามความพึงพอใจ"
   Old table: form_s_o_b_th_a_m_...
   New table: form_satisfaction_survey_def456
   Source:    libretranslate (90% confidence)

🔄 Step 4: Retranslate field names

[1] Processing fields for "แบบฟอร์มติดต่อ"
     ch_ue_o → full_name (dictionary)
     e_b_o_r_th_o_r → phone_number (dictionary)

[2] Processing fields for "แบบสอบถามความพึงพอใจ"
     kh_w_a_m_kh_i_d_e_h_n → feedback (libretranslate)
     r_a_kh_a_e_n → rating (dictionary)

=================================================
📊 Migration Preview
=================================================

  Forms to migrate:   X
  Tables to rename:   X
  Columns to rename:  X

Apply these changes to the database? (y/N): y

🔄 Step 6: Apply migrations

[1] Migrating "แบบฟอร์มติดต่อ"
   ✅ Renamed table: form_contact_abc123 → form_contact_form_xyz789
   ✅ Renamed column: ch_ue_o → full_name
   ✅ Renamed column: e_b_o_r_th_o_r → phone_number
   ✅ Updated forms.table_name

[2] Migrating "แบบสอบถามความพึงพอใจ"
   ✅ Renamed table: form_s_o_b_th_a_m_... → form_satisfaction_survey_def456
   ✅ Renamed column: kh_w_a_m_kh_i_d_e_h_n → feedback
   ✅ Renamed column: r_a_kh_a_e_n → rating
   ✅ Updated forms.table_name

🔍 Step 7: Verify changes

   ✅ form_contact_form_xyz789
   ✅ form_satisfaction_survey_def456

=================================================
✅ Migration Complete!
=================================================
```

**ระยะเวลาโดยประมาณ:**
- 10 forms: ~2-3 นาที
- 50 forms: ~10-15 นาที

---

## ✅ Step 5: ตรวจสอบผลลัพธ์

```bash
node backend/scripts/check-existing-forms.js
```

**ตรวจสอบ:**
- [ ] Table names แปลเป็นภาษาอังกฤษที่อ่านเข้าใจได้แล้ว?
- [ ] Column names แปลถูกต้องแล้ว?
- [ ] จำนวน rows ยังครบถ้วน?
- [ ] Foreign keys ยังทำงานปกติ?

**ตัวอย่างผลลัพธ์ที่ถูกต้อง:**
```
#   | Form Title              | Current Table Name               | Created At
──────────────────────────────────────────────────────────────────────────
1   | แบบฟอร์มติดต่อ         | form_contact_form_xyz789         | 2025-10-01
2   | แบบสอบถามความพึงพอใจ   | form_satisfaction_survey_def456  | 2025-10-01
```

---

## 🔙 Step 6: Rollback (ถ้าจำเป็น)

**ถ้าพบปัญหา:**

```bash
# ใช้ backup file ล่าสุด
node backend/scripts/rollback-migration.js backups/backup-2025-10-02T12-45-00.json
```

**Interactive Prompt:**
```
⚠️  This will OVERWRITE current database. Continue? (y/N): y
```

**คาดหวังผลลัพธ์:**
```
=================================================
⏪ Migration Rollback Script
=================================================

📂 Loading backup: backups/backup-2025-10-02T12-45-00.json

📊 Backup Information:
  Date:       2025-10-02T12:45:00
  Database:   qcollector_db
  Forms:      X
  Sub-Forms:  X
  Tables:     X

⚠️  This will OVERWRITE current database. Continue? (y/N): y

✅ Database connection established

🔄 Step 1: Restore forms table
   ✅ Restored form: แบบฟอร์มติดต่อ (table: form_contact_abc123)
   ✅ Restored form: แบบสอบถามความพึงพอใจ (table: form_s_o_b_th_a_m_...)

🔄 Step 2: Restore sub_forms table
   ✅ Restored sub-form: ...

🔄 Step 3: Restore dynamic tables
   Processing: form_contact_abc123
      ✅ Created table
      ✅ Restored X rows

   Processing: form_s_o_b_th_a_m_...
      ✅ Created table
      ✅ Restored X rows

=================================================
✅ Rollback Complete!
=================================================

📊 Summary:
  Forms restored:      X
  Sub-forms restored:  X
  Tables restored:     X
```

---

## 📝 Post-Migration Tasks

### 1. อัปเดต PowerBI Connections

**ก่อน:**
```
Server: localhost
Table: form_s_o_b_th_a_m_kh_w_a_m_ph_ue_ng_ph_o_ai_ch
```

**หลัง:**
```
Server: localhost
Table: form_satisfaction_survey_def456
```

### 2. อัปเดต API Queries (ถ้ามี hardcoded table names)

**ก่อน:**
```sql
SELECT * FROM form_contact_abc123 WHERE ...
```

**หลัง:**
```sql
SELECT * FROM form_contact_form_xyz789 WHERE ...
```

**แนะนำ:** ใช้ `forms.table_name` แทนการ hardcode

### 3. แจ้งทีม

- [ ] แจ้งทีม Dev ว่า table names เปลี่ยน
- [ ] แจ้งทีม Data Analyst อัปเดต PowerBI
- [ ] แจ้งทีม QA ทดสอบฟีเจอร์ทั้งหมด

---

## 🆘 Troubleshooting

### ปัญหา: LibreTranslate connection refused

**วิธีแก้:**
```bash
# ตรวจสอบ LibreTranslate
docker-compose ps libretranslate

# รีสตาร์ท service
docker-compose restart libretranslate

# รอ 30 วินาที
timeout /t 30 /nobreak

# ทดสอบ
curl http://localhost:5555/languages
```

### ปัญหา: PostgreSQL connection refused

**วิธีแก้:**
```bash
# ตรวจสอบ PostgreSQL
docker-compose ps postgres

# รีสตาร์ท service
docker-compose restart postgres

# รอ 30 วินาที
timeout /t 30 /nobreak
```

### ปัญหา: Migration ล้มเหลวครึ่งทาง

**วิธีแก้:**
```bash
# Rollback ทันที
node backend/scripts/rollback-migration.js <backup-file>

# ตรวจสอบ log
cat backend/logs/app.log

# แก้ไขปัญหา แล้ว migrate ใหม่
```

---

## ✅ Success Criteria

- [ ] ✅ Backup สำเร็จ (มี backup file)
- [ ] ✅ Dry-run แสดงผลถูกต้อง
- [ ] ✅ Migration เสร็จสมบูรณ์ ไม่มี error
- [ ] ✅ Table names เป็นภาษาอังกฤษ อ่านเข้าใจได้
- [ ] ✅ Column names เป็นภาษาอังกฤษ อ่านเข้าใจได้
- [ ] ✅ จำนวน rows ครบถ้วน
- [ ] ✅ Foreign keys ทำงานปกติ
- [ ] ✅ Application ทำงานปกติ

---

## 📞 Support

**ถ้าพบปัญหา:**
1. หยุดทันที
2. Rollback ด้วย backup file
3. เก็บ log และ screenshot
4. ติดต่อทีม Dev

---

**Version:** 1.0.0
**Date:** 2025-10-02
**Status:** 🚀 Ready to Execute
