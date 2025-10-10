# Q-Collector Migration System - Admin User Guide

**Version:** 0.8.0
**Date:** October 7, 2025
**Target Audience:** System Administrators, Form Managers

---

## Table of Contents

1. [Overview](#overview)
2. [Understanding the Migration System](#understanding-the-migration-system)
3. [Automatic Migrations](#automatic-migrations)
4. [Migration Preview Modal](#migration-preview-modal)
5. [Migration Status Indicators](#migration-status-indicators)
6. [Viewing Migration History](#viewing-migration-history)
7. [Understanding Migration Types](#understanding-migration-types)
8. [Rolling Back Migrations](#rolling-back-migrations)
9. [Backup Management](#backup-management)
10. [Queue Monitoring](#queue-monitoring)
11. [Best Practices](#best-practices)
12. [Troubleshooting](#troubleshooting)
13. [FAQ](#faq)

---

## Overview

### What is the Migration System?

Q-Collector Migration System v0.8.0 เป็นระบบจัดการการเปลี่ยนแปลงโครงสร้างฐานข้อมูลอัตโนมัติ (Database Schema Migration) ที่ช่วยให้คุณสามารถแก้ไขฟอร์มได้อย่างปลอดภัยโดยไม่เสียข้อมูล

### Key Benefits

- **ปลอดภัย**: สำรองข้อมูลอัตโนมัติก่อนทำการลบหรือเปลี่ยนแปลง
- **ย้อนกลับได้**: สามารถ Rollback การเปลี่ยนแปลงได้ทุกครั้ง
- **โปร่งใส**: บันทึกประวัติทุกการเปลี่ยนแปลงพร้อมข้อมูลผู้ทำ
- **อัตโนมัติ**: ทำงานโดยอัตโนมัติเมื่อคุณบันทึกฟอร์ม

### Who Can Use This?

| Role | Permissions |
|------|-------------|
| **super_admin** | Full access (preview, execute, rollback, restore, cleanup) |
| **admin** | Can preview and execute migrations |
| **moderator** | Read-only access (preview, view history, view backups) |
| **Other roles** | No access to migration features |

---

## Understanding the Migration System

### How It Works

```
1. คุณแก้ไขฟอร์มในหน้า Form Builder
   ↓
2. กด "Save Form"
   ↓
3. ระบบแสดง Migration Preview Modal
   ↓
4. คุณตรวจสอบและยืนยัน
   ↓
5. ระบบทำงาน Migration อัตโนมัติ
   ↓
6. ฐานข้อมูลได้รับการอัปเดต
```

### What Triggers a Migration?

การเปลี่ยนแปลงต่อไปนี้จะทำให้เกิด Migration:

1. **เพิ่ม Field ใหม่** → ADD_FIELD
2. **ลบ Field เดิม** → DELETE_FIELD
3. **เปลี่ยนชื่อ Field** → RENAME_FIELD
4. **เปลี่ยนประเภท Field** (เช่น text → number) → CHANGE_TYPE

### System Architecture

```
┌─────────────────┐
│  Form Builder   │ ← คุณแก้ไขฟอร์มที่นี่
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Migration Queue │ ← รอคิวการทำงาน
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ PostgreSQL DB   │ ← ฐานข้อมูลได้รับการอัปเดต
└─────────────────┘
```

---

## Automatic Migrations

### When Saving a Form

เมื่อคุณกด **"Save Form"** หลังจากแก้ไข Field ระบบจะ:

1. **ตรวจจับการเปลี่ยนแปลง** - เปรียบเทียบ Field เก่ากับใหม่
2. **สร้าง Migration Plan** - วางแผนการเปลี่ยนแปลงที่จำเป็น
3. **แสดง Preview Modal** - ให้คุณตรวจสอบก่อนดำเนินการ
4. **รอการยืนยัน** - กด "Proceed" เพื่อดำเนินการต่อ

### Screenshot: Form Builder Auto-Detection

```
[Screenshot Description: Form Builder page showing 3 fields:
- Email (email type) - Existing
- Phone (phone type) - Existing
- Address (short_answer) - NEW (highlighted in green)

"Save Form" button at bottom with badge showing "1 change detected"]
```

### What Happens Behind the Scenes?

```javascript
// ระบบตรวจจับว่า Field ใดถูกเพิ่ม/ลบ/แก้ไข
Old Fields: [email, phone]
New Fields: [email, phone, address]

// สร้าง Migration
Migration Type: ADD_FIELD
Field: address
Column Name: address_xyz123
Data Type: VARCHAR(255)
```

---

## Migration Preview Modal

### Overview

Migration Preview Modal จะปรากฏทุกครั้งที่มีการเปลี่ยนแปลง Field เพื่อให้คุณตรวจสอบก่อนดำเนินการ

### Screenshot: Migration Preview Modal

```
[Screenshot Description: Modal dialog with:

Title: "Migration Preview - 3 Changes Detected"

Table showing:
┌─────────┬─────────────┬──────────────┬────────────┬──────────┐
│ Status  │ Type        │ Field        │ Details    │ Backup   │
├─────────┼─────────────┼──────────────┼────────────┼──────────┤
│ ✅ Valid│ ADD_FIELD   │ address      │ VARCHAR... │ No       │
│ ⚠️ Warn │ DELETE_FIELD│ old_notes    │ TEXT       │ Yes (90d)│
│ ✅ Valid│ RENAME_FIELD│ fullname     │ name→...   │ No       │
└─────────┴─────────────┴──────────────┴────────────┴──────────┘

Summary:
- Total Changes: 3
- Valid Changes: 3
- Invalid Changes: 0
- Requires Backup: Yes (1 field)

Buttons: [Cancel] [Proceed with Migration]
]
```

### Understanding the Modal

#### Status Column

| Icon | Meaning | Description |
|------|---------|-------------|
| ✅ Valid | ผ่านการตรวจสอบ | สามารถทำ Migration ได้ |
| ⚠️ Warning | มีคำเตือน | สามารถทำได้แต่ควรระวัง |
| ❌ Invalid | ไม่ผ่านการตรวจสอบ | ไม่สามารถทำ Migration ได้ |

#### Type Column

- **ADD_FIELD** - เพิ่ม Field ใหม่
- **DELETE_FIELD** - ลบ Field เดิม (มี Backup อัตโนมัติ)
- **RENAME_FIELD** - เปลี่ยนชื่อ Field
- **CHANGE_TYPE** - เปลี่ยนประเภทข้อมูล (มี Backup อัตโนมัติ)

#### Backup Column

- **No** - ไม่มี Backup (ปลอดภัยอยู่แล้ว)
- **Yes (90d)** - มี Backup เก็บไว้ 90 วัน

### Common Warnings

#### 1. Column Already Exists

```
⚠️ Warning: Column "email" already exists
→ แก้ไข: เปลี่ยนชื่อ Field หรือลบ Field เก่าก่อน
```

#### 2. Data Type Conversion Risk

```
⚠️ Warning: Converting TEXT to NUMBER may fail if data contains non-numeric values
→ แก้ไข: ตรวจสอบข้อมูลก่อนเปลี่ยนแปลง
```

#### 3. Destructive Operation

```
⚠️ Warning: DELETE_FIELD will permanently remove data unless backup is enabled
→ ข้อมูล: Backup จะถูกสร้างอัตโนมัติ เก็บไว้ 90 วัน
```

### Action Buttons

- **Cancel** - ยกเลิกการบันทึก กลับไปแก้ไขฟอร์มต่อ
- **Proceed with Migration** - ดำเนินการ Migration (ส่งเข้า Queue)

---

## Migration Status Indicators

### Badge Colors

ในหน้า Form List คุณจะเห็น Badge แสดงสถานะ Migration:

| Badge | Meaning | Description |
|-------|---------|-------------|
| 🟢 **Migrated** | สำเร็จ | Migration ทำงานสำเร็จแล้ว |
| 🟡 **Pending** | รอดำเนินการ | อยู่ใน Queue รอการประมวลผล |
| 🔴 **Failed** | ล้มเหลว | Migration ล้มเหลว ต้องแก้ไข |
| 🔵 **No Changes** | ไม่มีการเปลี่ยนแปลง | ไม่มี Migration ที่ต้องทำ |

### Screenshot: Form List with Migration Badges

```
[Screenshot Description: Form list table:

┌──────────────────┬─────────────┬────────────┬──────────────┐
│ Form Name        │ Status      │ Migration  │ Last Updated │
├──────────────────┼─────────────┼────────────┼──────────────┤
│ Contact Form     │ Active      │ 🟢 Migrated│ 2 hours ago  │
│ Survey Form      │ Active      │ 🟡 Pending │ 5 mins ago   │
│ Registration     │ Inactive    │ 🔴 Failed  │ 1 day ago    │
│ Feedback Form    │ Active      │ 🔵 None    │ 3 days ago   │
└──────────────────┴─────────────┴────────────┴──────────────┘
]
```

### How to Check Migration Status

1. ไปที่ **Form List** page
2. ดูคอลัมน์ **Migration**
3. คลิกที่ Badge เพื่อดูรายละเอียด

---

## Viewing Migration History

### Accessing Migration History

**วิธีที่ 1: จากหน้า Form Detail**

1. เปิดฟอร์มที่ต้องการดู
2. คลิกแท็บ **"Migration History"**
3. ดูรายการ Migration ทั้งหมด

**วิธีที่ 2: จาก API Endpoint**

```bash
GET /api/v1/migrations/history/{formId}?limit=50&offset=0&status=all
```

### Screenshot: Migration History Page

```
[Screenshot Description: Migration History table:

Title: "Migration History - Contact Form"
Filters: [All] [Success] [Failed] | Search: [___]

┌──────────────┬────────────┬──────────────┬─────────┬─────────┬──────────┐
│ Date/Time    │ Type       │ Field        │ User    │ Status  │ Actions  │
├──────────────┼────────────┼──────────────┼─────────┼─────────┼──────────┤
│ Oct 7, 10:30 │ ADD_FIELD  │ address      │ admin   │ ✅ Success│ [View]  │
│ Oct 7, 10:25 │ DELETE_FIELD│ old_notes   │ admin   │ ✅ Success│ [Rollback]│
│ Oct 6, 15:20 │ RENAME_FIELD│ fullname    │ admin   │ ✅ Success│ [View]  │
│ Oct 5, 09:10 │ CHANGE_TYPE│ age         │ john    │ ❌ Failed │ [Details]│
└──────────────┴────────────┴──────────────┴─────────┴─────────┴──────────┘

Pagination: [<< Previous] Page 1 of 3 [Next >>]
]
```

### Understanding History Records

#### Each Record Shows:

1. **Date/Time** - เวลาที่ทำ Migration
2. **Type** - ประเภท Migration (ADD/DELETE/RENAME/CHANGE)
3. **Field** - Field ที่ถูกเปลี่ยนแปลง
4. **User** - ผู้ที่ทำการเปลี่ยนแปลง
5. **Status** - สถานะความสำเร็จ
6. **Actions** - ปุ่มดำเนินการ (View, Rollback, Details)

#### Viewing Details

คลิก **[View]** เพื่อดู:
- SQL statement ที่ถูกใช้
- Rollback SQL (ถ้ามี)
- Old value และ New value
- Backup reference (ถ้ามี)

---

## Understanding Migration Types

### 1. ADD_FIELD (เพิ่ม Field ใหม่)

**เมื่อไหร่ที่เกิด:**
เมื่อคุณเพิ่ม Field ใหม่ในฟอร์ม

**ตัวอย่าง:**
```
Before: [name, email]
After:  [name, email, phone]  ← เพิ่ม phone

Migration: ADD_FIELD
Column: phone_abc123
Type: VARCHAR(20)
```

**SQL Generated:**
```sql
ALTER TABLE "contact_form_123" ADD COLUMN "phone_abc123" VARCHAR(20);
```

**Rollback SQL:**
```sql
ALTER TABLE "contact_form_123" DROP COLUMN "phone_abc123";
```

**Backup Required:** ❌ No

**Risks:** ต่ำ - ไม่มีความเสี่ยงต่อข้อมูล

---

### 2. DELETE_FIELD (ลบ Field เดิม)

**เมื่อไหร่ที่เกิด:**
เมื่อคุณลบ Field ออกจากฟอร์ม

**ตัวอย่าง:**
```
Before: [name, email, old_notes]
After:  [name, email]  ← ลบ old_notes

Migration: DELETE_FIELD
Column: old_notes_xyz789
```

**SQL Generated:**
```sql
ALTER TABLE "contact_form_123" DROP COLUMN "old_notes_xyz789";
```

**Rollback SQL:**
```sql
ALTER TABLE "contact_form_123" ADD COLUMN "old_notes_xyz789" TEXT;
```

**Backup Required:** ✅ Yes (Automatic)
- สำรองข้อมูลในคอลัมน์ทั้งหมดก่อนลบ
- เก็บไว้ 90 วัน
- สามารถ Restore ได้ภายในระยะเวลานี้

**Risks:** สูง - จะลบข้อมูลถาวร (แต่มี Backup)

**⚠️ Warning:** ตรวจสอบให้แน่ใจว่าคุณไม่ต้องการข้อมูลในคอลัมน์นี้แล้ว

---

### 3. RENAME_FIELD (เปลี่ยนชื่อ Field)

**เมื่อไหร่ที่เกิด:**
เมื่อคุณเปลี่ยนชื่อ Field (label) แต่ Field ID เดิม

**ตัวอย่าง:**
```
Before: Full Name (column: full_name_abc123)
After:  Complete Name (column: complete_name_abc123)

Migration: RENAME_FIELD
Old Name: full_name_abc123
New Name: complete_name_abc123
```

**SQL Generated:**
```sql
ALTER TABLE "contact_form_123"
RENAME COLUMN "full_name_abc123" TO "complete_name_abc123";
```

**Rollback SQL:**
```sql
ALTER TABLE "contact_form_123"
RENAME COLUMN "complete_name_abc123" TO "full_name_abc123";
```

**Backup Required:** ❌ No

**Risks:** ต่ำมาก - ไม่มีการเปลี่ยนแปลงข้อมูล

---

### 4. CHANGE_TYPE (เปลี่ยนประเภท Field)

**เมื่อไหร่ที่เกิด:**
เมื่อคุณเปลี่ยนประเภท Field (เช่น text → number)

**ตัวอย่าง:**
```
Before: Age (field type: short_answer, DB type: VARCHAR)
After:  Age (field type: number, DB type: INTEGER)

Migration: CHANGE_TYPE
Column: age_xyz456
Old Type: VARCHAR(255)
New Type: INTEGER
```

**SQL Generated:**
```sql
ALTER TABLE "contact_form_123"
ALTER COLUMN "age_xyz456" TYPE INTEGER
USING "age_xyz456"::INTEGER;
```

**Rollback SQL:**
```sql
ALTER TABLE "contact_form_123"
ALTER COLUMN "age_xyz456" TYPE VARCHAR(255)
USING "age_xyz456"::VARCHAR(255);
```

**Backup Required:** ✅ Yes (Automatic)
- สำรองข้อมูลก่อนเปลี่ยน Type
- ตรวจสอบความเข้ากันได้ของข้อมูล
- เก็บไว้ 90 วัน

**Risks:** ปานกลาง - อาจล้มเหลวถ้าข้อมูลไม่สามารถแปลงได้

**⚠️ Common Conversion Issues:**

| From → To | Risk | Example Issue |
|-----------|------|---------------|
| TEXT → NUMBER | สูง | "abc" ไม่สามารถแปลงเป็นตัวเลข |
| TEXT → DATE | สูง | "hello" ไม่ใช่รูปแบบวันที่ |
| NUMBER → TEXT | ต่ำ | ปลอดภัย ทุกตัวเลขแปลงเป็น Text ได้ |
| DATE → TEXT | ต่ำ | ปลอดภัย วันที่แปลงเป็น Text ได้ |
| INTEGER → TEXT | ต่ำ | ปลอดภัย |
| VARCHAR → TEXT | ต่ำมาก | เพิ่มขนาดเท่านั้น |

---

## Rolling Back Migrations

### When to Rollback?

**Rollback เมื่อ:**
- Migration ทำให้เกิดปัญหาในระบบ
- คุณลบ Field ผิด
- คุณเปลี่ยน Type ผิด และต้องการข้อมูลเดิมกลับมา

**ไม่สามารถ Rollback เมื่อ:**
- Migration ล้มเหลว (success = false)
- ไม่มี Rollback SQL
- ADD_FIELD ที่ Field ยังคงอยู่ (ต้องลบ Field ก่อน)

### How to Rollback

**ขั้นตอนที่ 1: ตรวจสอบว่า Rollback ได้หรือไม่**

1. ไปที่ **Migration History**
2. หา Migration ที่ต้องการ Rollback
3. ดูคอลัมน์ **Actions**
4. ถ้ามีปุ่ม **[Rollback]** แสดงว่า Rollback ได้

**ขั้นตอนที่ 2: ดำเนินการ Rollback**

1. คลิก **[Rollback]**
2. ระบบจะแสดง Confirmation dialog
3. อ่านรายละเอียดให้ครบถ้วน
4. คลิก **"Confirm Rollback"**

**ขั้นตอนที่ 3: ตรวจสอบผลลัพธ์**

1. รอระบบประมวลผล (ประมาณ 5-10 วินาที)
2. ดู Migration History จะมีรายการใหม่ (Rollback record)
3. ตรวจสอบข้อมูลในฟอร์มว่ากลับมาปกติหรือไม่

### Screenshot: Rollback Confirmation Dialog

```
[Screenshot Description: Modal dialog:

Title: "⚠️ Confirm Rollback"

Content:
"Are you sure you want to rollback this migration?

Migration Details:
- Type: DELETE_FIELD
- Field: old_notes
- Column: old_notes_xyz789
- Executed: Oct 7, 2025 10:25 AM
- Executed By: admin

This will:
✅ Re-create the column in the database
✅ Create a new migration record (rollback)
❌ Cannot be undone (no rollback of rollback)

Do you want to proceed?"

Buttons: [Cancel] [Confirm Rollback]
]
```

### Rollback Limitations

**⚠️ Important Notes:**

1. **Rollback ของ Rollback ไม่ได้**
   ถ้าคุณ Rollback แล้วไม่ชอบใจ จะต้องทำ Migration ใหม่

2. **ADD_FIELD Rollback**
   ต้องลบ Field ออกจากฟอร์มก่อนจึงจะ Rollback ได้

3. **Data Loss Risk**
   ถ้าคุณ Rollback ADD_FIELD จะลบข้อมูลที่เพิ่มหลัง Migration

4. **Backup Restore vs Rollback**
   - **Rollback** = ย้อน Schema กลับ (structure)
   - **Restore** = เอาข้อมูลกลับมา (data)

---

## Backup Management

### Automatic Backups

ระบบจะสร้าง Backup อัตโนมัติสำหรับ:

| Migration Type | Backup? | Reason |
|----------------|---------|--------|
| ADD_FIELD | ❌ No | ไม่มีความเสี่ยงต่อข้อมูล |
| DELETE_FIELD | ✅ Yes | ป้องกันการสูญเสียข้อมูล |
| RENAME_FIELD | ❌ No | ไม่มีการเปลี่ยนแปลงข้อมูล |
| CHANGE_TYPE | ✅ Yes | ป้องกันการแปลงข้อมูลผิดพลาด |

### Backup Retention Policy

- **Default Retention:** 90 days
- **Minimum Retention:** 30 days
- **Maximum Retention:** 365 days
- **Auto-Cleanup:** ทุกวันที่ 1 ของเดือน (ลบ Backup ที่หมดอายุ)

### Viewing Backups

**Via Web UI:**

1. ไปที่ **Form Detail** page
2. คลิกแท็บ **"Backups"**
3. ดูรายการ Backup ทั้งหมด

**Screenshot: Backup List**

```
[Screenshot Description: Backup list table:

Title: "Backups - Contact Form"
Filters: [Active] [Expired] [All] | Sort: [Newest First ▼]

┌──────────────┬────────────┬──────────┬────────┬─────────────┬─────────┐
│ Date Created │ Field      │ Type     │ Records│ Expires In  │ Actions │
├──────────────┼────────────┼──────────┼────────┼─────────────┼─────────┤
│ Oct 7, 10:25 │ old_notes  │ AUTO_DEL │ 150    │ 89 days     │ [Restore]│
│ Oct 6, 15:20 │ age        │ AUTO_MOD │ 200    │ 88 days     │ [Restore]│
│ Oct 1, 09:00 │ legacy_col │ MANUAL   │ 50     │ 83 days     │ [Restore]│
└──────────────┴────────────┴──────────┴────────┴─────────────┴─────────┘
]
```

### Backup Types

| Type | Description | When Created |
|------|-------------|--------------|
| **AUTO_DELETE** | สำรองก่อนลบ Field | DELETE_FIELD migration |
| **AUTO_MODIFY** | สำรองก่อนเปลี่ยน Type | CHANGE_TYPE migration |
| **AUTO_RENAME** | สำรองก่อนเปลี่ยนชื่อ | RENAME_FIELD (if enabled) |
| **MANUAL** | สำรองด้วยตนเอง | Admin manually creates backup |

### Restoring from Backup

**⚠️ Prerequisites:**
- ต้องมีสิทธิ์ super_admin
- Backup ต้องไม่หมดอายุ
- Column ต้องมีอยู่ในฐานข้อมูล (ถ้าถูกลบต้องสร้างใหม่ก่อน)

**ขั้นตอน:**

1. ไปที่ **Backups** tab
2. หา Backup ที่ต้องการ
3. คลิก **[Restore]**
4. ยืนยันการ Restore
5. รอจนระบบเสร็จสิ้น (อาจใช้เวลา 1-5 นาทีขึ้นอยู่กับจำนวนข้อมูล)

**Screenshot: Restore Confirmation**

```
[Screenshot Description: Modal dialog:

Title: "Restore Backup"

Content:
"Restore data from backup?

Backup Details:
- Field: old_notes
- Column: old_notes_xyz789
- Records: 150 rows
- Created: Oct 7, 2025 10:25 AM
- Expires: Jan 5, 2026 (89 days remaining)

This will:
✅ Restore all 150 records to the column
✅ Overwrite current data in the column
⚠️ This cannot be undone

Estimated time: ~30 seconds"

Buttons: [Cancel] [Restore Now]
]
```

---

## Queue Monitoring

### Understanding the Migration Queue

Q-Collector ใช้ **Bull Queue** (Redis-based) สำหรับประมวลผล Migration แบบ asynchronous

**Why Queue?**
- ป้องกัน Migration ทับซ้อนกัน
- ทำงานทีละอันเพื่อความปลอดภัย
- สามารถ Retry ได้ถ้าล้มเหลว
- ไม่ block การใช้งานระบบ

### Queue Status Dashboard

**Access:** `/admin/migrations/queue` (super_admin, admin, moderator)

**Screenshot: Queue Dashboard**

```
[Screenshot Description: Queue monitoring dashboard:

Title: "Migration Queue Status"
Last Updated: Oct 7, 2025 10:35 AM [Auto-refresh: ON]

┌────────────────────────────────────────┐
│ Queue Metrics (Last 24 Hours)         │
├────────────────────────────────────────┤
│ ⏳ Waiting:    5 jobs                  │
│ ⚙️ Active:     1 job (currently running)│
│ ✅ Completed: 100 jobs                 │
│ ❌ Failed:     2 jobs                  │
│ ⏰ Delayed:    0 jobs                  │
└────────────────────────────────────────┘

Recent Jobs:
┌──────────────┬───────────┬────────────┬─────────┬──────────┐
│ Job ID       │ Form      │ Type       │ Status  │ Started  │
├──────────────┼───────────┼────────────┼─────────┼──────────┤
│ job_12345... │ Contact   │ ADD_FIELD  │ ⚙️ Active│ 10:35 AM│
│ job_12344... │ Survey    │ DELETE_... │ ⏳ Wait │ -        │
│ job_12343... │ Feedback  │ RENAME_... │ ⏳ Wait │ -        │
└──────────────┴───────────┴────────────┴─────────┴──────────┘
]
```

### Queue Health Indicators

| Indicator | Healthy | Warning | Critical |
|-----------|---------|---------|----------|
| **Waiting Jobs** | < 10 | 10-50 | > 50 |
| **Failed Jobs** | 0-2 | 3-10 | > 10 |
| **Processing Time** | < 30s | 30s-2m | > 2m |

### Troubleshooting Queue Issues

#### Issue 1: Jobs Stuck in Waiting

**Symptoms:**
Waiting jobs ไม่ลดลง มีจำนวนสะสมมากขึ้น

**Possible Causes:**
- Queue processor ไม่ทำงาน
- Redis connection ปัญหา
- Database connection timeout

**Solutions:**
```bash
# 1. Check Redis connection
redis-cli ping

# 2. Check queue processor
pm2 list | grep queue-processor

# 3. Restart queue processor
pm2 restart queue-processor

# 4. Check logs
pm2 logs queue-processor --lines 100
```

#### Issue 2: High Failure Rate

**Symptoms:**
Failed jobs เยอะ (> 10%)

**Possible Causes:**
- Schema validation errors
- Database permission issues
- Invalid migration data

**Solutions:**
1. ดู Failed job details ใน Queue Dashboard
2. อ่าน error message
3. แก้ไขปัญหาตามที่ระบุ
4. Retry failed jobs

---

## Best Practices

### Before Making Changes

✅ **DO:**

1. **สำรองข้อมูล Form ก่อนแก้ไข**
   Export form JSON หรือ Backup database

2. **ทดสอบใน Staging ก่อน**
   ถ้าเป็นการเปลี่ยนแปลงใหญ่ ทดสอบใน Staging environment ก่อน

3. **ตรวจสอบข้อมูลก่อนเปลี่ยน Type**
   Query ดูข้อมูลก่อน CHANGE_TYPE migration
   ```sql
   SELECT DISTINCT column_name FROM table_name WHERE column_name IS NOT NULL;
   ```

4. **อ่าน Preview Modal อย่างละเอียด**
   ตรวจสอบ warnings และ backup requirements

5. **แจ้งทีมงานก่อนทำ Migration ใหญ่**
   ประสานงานกับทีมถ้ามีผลกระทบต่อการใช้งาน

❌ **DON'T:**

1. **อย่าลบ Field หลายอันพร้อมกัน**
   ทำทีละ Field เพื่อความปลอดภัย

2. **อย่า Rollback ถ้าไม่จำเป็น**
   Rollback อาจสร้างปัญหาเพิ่ม

3. **อย่าเพิกเฉย Warnings**
   อ่านและเข้าใจ warnings ทุกข้อ

4. **อย่าเปลี่ยน Type โดยไม่ตรวจสอบข้อมูล**
   อาจทำให้ Migration ล้มเหลว

5. **อย่าลบ Backup ด้วยตนเอง**
   ปล่อยให้ระบบจัดการ Backup retention

### During Migration

✅ **DO:**

1. **รอให้ Migration เสร็จก่อนแก้ไขต่อ**
   อย่าเปิดหลาย tabs แก้ไข Form พร้อมกัน

2. **ตรวจสอบสถานะใน Queue Dashboard**
   ดูว่า Migration เข้า Queue และทำงานสำเร็จหรือไม่

3. **จดบันทึก Migration สำคัญ**
   เก็บ log ของการเปลี่ยนแปลงสำคัญ

❌ **DON'T:**

1. **อย่าปิด Browser ระหว่าง Migration**
   รอจนกว่า Migration จะเข้า Queue

2. **อย่า Refresh หน้าบ่อยๆ**
   ใช้ Auto-refresh ของระบบ

### After Migration

✅ **DO:**

1. **ตรวจสอบข้อมูลหลัง Migration**
   ลองกรอกฟอร์มทดสอบ

2. **ตรวจสอบ Migration History**
   ยืนยันว่า Migration success

3. **แจ้งทีมเมื่อเสร็จสิ้น**
   แจ้งผู้ใช้งานถ้ามีการเปลี่ยนแปลงที่เห็นได้ชัด

❌ **DON'T:**

1. **อย่าลืมตรวจสอบผลลัพธ์**
   อย่าคิดว่า Migration สำเร็จเสมอ

2. **อย่าลบ Backup ทันที**
   เก็บ Backup ไว้อย่างน้อย 7-14 วัน

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Migration Failed - Column Already Exists

**Error Message:**
```
❌ Failed: Column "email" already exists
```

**Cause:**
Field ที่คุณเพิ่มมี column name ซ้ำกับที่มีอยู่แล้ว

**Solution:**
1. ตรวจสอบ Field ที่มีอยู่ในฟอร์ม
2. ลบ Field เก่าก่อน (ถ้าไม่ใช้)
3. หรือเปลี่ยนชื่อ Field ใหม่

---

#### Issue 2: Type Conversion Failed

**Error Message:**
```
❌ Failed: Invalid input syntax for type integer: "abc"
```

**Cause:**
ข้อมูลในคอลัมน์ไม่สามารถแปลงเป็น Type ใหม่ได้

**Solution:**
1. Query ดูข้อมูลที่มีปัญหา:
   ```sql
   SELECT id, column_name FROM table_name
   WHERE column_name !~ '^[0-9]+$';
   ```
2. แก้ไขข้อมูลที่ไม่ถูกต้อง
3. ลอง Migration อีกครั้ง

---

#### Issue 3: Migration Stuck in Queue

**Symptoms:**
Migration อยู่ใน Waiting status นานเกิน 10 นาที

**Possible Causes:**
- Queue processor ไม่ทำงาน
- Redis ล่ม
- Database connection timeout

**Solution:**
```bash
# 1. Check queue processor status
pm2 status queue-processor

# 2. Check Redis
redis-cli ping

# 3. Restart queue processor
pm2 restart queue-processor

# 4. Check database connection
psql -h localhost -U qcollector -d qcollector_db -c "SELECT 1;"

# 5. If still stuck, contact super_admin to manually process
```

---

#### Issue 4: Cannot Rollback Migration

**Error Message:**
```
❌ Cannot rollback: Field still exists in form
```

**Cause:**
ไม่สามารถ Rollback ADD_FIELD ได้ถ้า Field ยังคงอยู่ในฟอร์ม

**Solution:**
1. ลบ Field ออกจากฟอร์มก่อน
2. Save form (จะสร้าง DELETE_FIELD migration)
3. จากนั้น Rollback ADD_FIELD migration เดิม

---

#### Issue 5: Backup Expired - Cannot Restore

**Error Message:**
```
❌ Backup has expired (retention period ended 30 days ago)
```

**Cause:**
Backup หมดอายุ (เกิน 90 วัน) และถูกลบไปแล้ว

**Solution:**
1. ตรวจสอบ Database backup ระดับ Server
2. Restore จาก PostgreSQL backup ถ้ามี
3. ถ้าไม่มี Backup แล้ว ข้อมูลสูญหายถาวร

**Prevention:**
- เก็บ Database backup ทุกวัน
- ตั้ง retention policy ให้นานขึ้นถ้าจำเป็น

---

### Getting Help

**ถ้าคุณต้องการความช่วยเหลือ:**

1. **Check Documentation**
   อ่านคู่มือนี้ และ Troubleshooting Guide

2. **Check Logs**
   ดู Migration History และ Queue logs

3. **Contact Super Admin**
   ถ้าปัญหาซับซ้อน ติดต่อ super_admin

4. **Create Support Ticket**
   แจ้งปัญหาผ่านระบบ Support

---

## FAQ

### Q1: Migration ใช้เวลานานแค่ไหน?

**A:** ขึ้นอยู่กับจำนวนข้อมูล:
- **< 1,000 rows:** 5-10 seconds
- **1,000-10,000 rows:** 10-30 seconds
- **10,000-100,000 rows:** 30-120 seconds
- **> 100,000 rows:** 2-5 minutes

**Performance Target:** < 100ms per migration (ตามที่ระบบออกแบบ)

---

### Q2: สามารถ Undo Migration ได้หรือไม่?

**A:** ได้ โดยใช้ **Rollback** (super_admin เท่านั้น)
- Rollback จะสร้าง Migration record ใหม่
- ข้อมูลจะกลับมาถ้ามี Backup
- ไม่สามารถ Rollback ของ Rollback ได้

---

### Q3: Backup เก็บไว้นานแค่ไหน?

**A:** **90 days** (default retention policy)
- สามารถเปลี่ยนได้ (30-365 วัน)
- Backup ที่หมดอายุจะถูกลบอัตโนมัติทุกวันที่ 1 ของเดือน
- สามารถขยายเวลาได้ถ้าจำเป็น (ติดต่อ super_admin)

---

### Q4: ถ้า Migration ล้มเหลวจะเกิดอะไรขึ้น?

**A:** ระบบจะ:
1. **Rollback transaction อัตโนมัติ** - ข้อมูลไม่เสียหาย
2. **บันทึก error log** - ดูได้ใน Migration History
3. **แจ้งเตือน admin** - ผ่าน Notification
4. **สามารถ Retry ได้** - แก้ไขปัญหาแล้ว Retry

---

### Q5: สามารถทำ Migration หลายฟอร์มพร้อมกันได้หรือไม่?

**A:** ได้ แต่แนะนำทีละฟอร์ม
- ระบบรองรับ concurrent migrations
- แต่ทำทีละฟอร์มจะปลอดภัยกว่า
- ถ้าทำพร้อมกัน ดูสถานะที่ Queue Dashboard

---

### Q6: Field Type ไหนบ้างที่สามารถแปลงกันได้?

**A:** ตารางการแปลง Type:

| From → To | Safe? | Notes |
|-----------|-------|-------|
| TEXT → NUMBER | ⚠️ | ต้องเช็คข้อมูลก่อน |
| NUMBER → TEXT | ✅ | ปลอดภัย |
| TEXT → DATE | ⚠️ | ต้องเป็นรูปแบบ YYYY-MM-DD |
| DATE → TEXT | ✅ | ปลอดภัย |
| VARCHAR → TEXT | ✅ | ปลอดภัย (เพิ่มขนาด) |
| TEXT → VARCHAR | ⚠️ | อาจตัดข้อความถ้ายาวเกิน |

---

### Q7: สามารถ Export Migration History ได้หรือไม่?

**A:** ได้ (ผ่าน API)
```bash
# Export as JSON
GET /api/v1/migrations/history/{formId}?limit=1000

# Export as CSV (coming in v0.8.1)
```

---

### Q8: ถ้าต้องการยกเลิก Migration ที่อยู่ใน Queue จะทำอย่างไร?

**A:** ไม่สามารถยกเลิกได้ถ้าเข้า Queue แล้ว
- แต่ถ้ายังอยู่ที่ Preview Modal ยังกด Cancel ได้
- ถ้าเข้า Queue แล้วต้องรอให้เสร็จ แล้ว Rollback ภายหลัง
- super_admin สามารถ Remove job จาก Queue ได้ (advanced)

---

### Q9: Migration System ปลอดภัยแค่ไหน?

**A:** มาตรการความปลอดภัย:
- ✅ Transaction-safe (Rollback ถ้าล้มเหลว)
- ✅ Automatic backups (ก่อนการเปลี่ยนแปลง)
- ✅ Type validation (ตรวจสอบก่อนแปลง)
- ✅ Permission-based (super_admin, admin only)
- ✅ Audit trail (บันทึกทุกการเปลี่ยนแปลง)
- ✅ Queue-based (ไม่ทับซ้อนกัน)

---

### Q10: สามารถ Preview Migration โดยไม่ Execute ได้หรือไม่?

**A:** ได้ โดยใช้ **Preview Mode**
- กด "Preview" แทน "Proceed" ใน Modal
- หรือใช้ API endpoint `/api/v1/migrations/preview`
- Preview จะแสดง SQL และ Validation โดยไม่ Execute จริง

---

## Additional Resources

### Documentation Links

- [Developer Guide](../developer-guides/migration-system-developer-guide.md) - สำหรับ Developer
- [Troubleshooting Guide](../troubleshooting/migration-system-troubleshooting.md) - แก้ปัญหาเชิงลึก
- [API Documentation](../api/migration-api-spec.yaml) - OpenAPI specification
- [Upgrade Guide](../migration-guides/v0.7-to-v0.8-upgrade-guide.md) - อัปเกรดจาก v0.7

### Video Tutorials (Coming Soon)

- How to use Migration Preview Modal
- How to rollback a migration
- How to restore from backup
- How to monitor queue status

### Support Contacts

- **Technical Support:** support@qcollector.com
- **Super Admin:** admin@qcollector.com
- **Documentation:** docs@qcollector.com

---

**Last Updated:** October 7, 2025
**Document Version:** 1.0.0
**System Version:** Q-Collector v0.8.0
