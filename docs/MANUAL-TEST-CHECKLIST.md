# Q-Collector Manual Testing Checklist

**Version:** 0.7.2-dev
**Date:** 2025-10-05
**Tester:** _________________
**Test Date:** _________________

---

## 🎯 Test Objective

ทดสอบระบบการสร้างฟอร์มพร้อม Sub-Form แบบครบวงจร ตรวจสอบ:
- การสร้างฟอร์มหลัก (Main Form)
- การเพิ่มฟิลด์ 17 ประเภท
- Toggle Icons (Required, Table, Telegram)
- การสร้าง Sub-Forms
- การบันทึกและตรวจสอบ Database

---

## 🔧 Pre-Test Setup

### ✅ Checklist: Services Running

| Service | Port | Status | Notes |
|---------|------|--------|-------|
| Backend | 5000 | ⬜ Running | http://localhost:5000 |
| Frontend | 3000 | ⬜ Running | http://localhost:3000 |
| PostgreSQL | 5432 | ⬜ Running | docker ps |
| Redis | 6379 | ⬜ Running | docker ps |
| MinIO | 9000 | ⬜ Running | docker ps |

**Command to check:**
```bash
# Backend
netstat -ano | findstr :5000

# Frontend
netstat -ano | findstr :3000

# Docker
docker ps
```

### ✅ Login Credentials

| Field | Value |
|-------|-------|
| Username | `pongpanp` |
| Password | `Gfvtmiu613` |
| 2FA | ⬜ OTP from Authenticator App |

---

## 📝 Test Case 1: Create Main Form with Fields

### Step 1.1: Login

**URL:** http://localhost:3000

| Action | Expected Result | Status | Notes |
|--------|----------------|--------|-------|
| Open URL | Login page appears | ⬜ Pass ⬜ Fail | |
| Enter username `pongpanp` | Input filled | ⬜ Pass ⬜ Fail | |
| Enter password | Input filled (masked) | ⬜ Pass ⬜ Fail | |
| Click "เข้าสู่ระบบ" | 2FA page appears | ⬜ Pass ⬜ Fail | |
| Enter 6-digit OTP | OTP filled | ⬜ Pass ⬜ Fail | |
| Auto-verify | Form list page loads | ⬜ Pass ⬜ Fail | |

**Screenshot:** ⬜ Taken (login-success.png)

---

### Step 1.2: Navigate to Form Builder

**Page:** Form List (จัดการฟอร์ม)

| Action | Expected Result | Status | Notes |
|--------|----------------|--------|-------|
| See heading "จัดการฟอร์ม" | h1 visible | ⬜ Pass ⬜ Fail | |
| Find `+` icon (top-right) | Icon visible | ⬜ Pass ⬜ Fail | |
| Hover `+` icon | Tooltip "สร้างฟอร์มใหม่" | ⬜ Pass ⬜ Fail | |
| Click `+` icon | Form builder opens | ⬜ Pass ⬜ Fail | |
| See heading "สร้างฟอร์มใหม่" | h1 visible | ⬜ Pass ⬜ Fail | |
| See default field | "Untitled Field" exists | ⬜ Pass ⬜ Fail | |

**Screenshot:** ⬜ Taken (form-builder-initial.png)

---

### Step 1.3: Set Main Form Title & Description

**Location:** Form Builder Page

#### Form Title

| Action | Expected Result | Status | Notes |
|--------|----------------|--------|-------|
| See text "คลิกเพื่อระบุชื่อฟอร์ม..." | h1 visible (gray) | ⬜ Pass ⬜ Fail | |
| Click on title text | Input field appears | ⬜ Pass ⬜ Fail | |
| Type: `ฟอร์มทดสอบระบบ Sub-Form` | Text updates | ⬜ Pass ⬜ Fail | |
| Press Enter | Title saved, input closes | ⬜ Pass ⬜ Fail | |
| Verify title | Shows: `ฟอร์มทดสอบระบบ Sub-Form` | ⬜ Pass ⬜ Fail | |

#### Form Description

| Action | Expected Result | Status | Notes |
|--------|----------------|--------|-------|
| See text "คลิกเพื่อเพิ่มคำอธิบายฟอร์ม..." | p visible (gray) | ⬜ Pass ⬜ Fail | |
| Click on description text | Input field appears | ⬜ Pass ⬜ Fail | |
| Type: `ทดสอบการสร้างฟอร์มพร้อม Sub-Form และการตั้งค่าฟิลด์` | Text updates | ⬜ Pass ⬜ Fail | |
| Press Enter | Description saved | ⬜ Pass ⬜ Fail | |

**Screenshot:** ⬜ Taken (form-title-set.png)

---

### Step 1.4: Manage Default Field

**Default Field:** "Untitled Field" (short_answer)

| Action | Expected Result | Status | Notes |
|--------|----------------|--------|-------|
| See "Untitled Field" card | Card visible (collapsed) | ⬜ Pass ⬜ Fail | |
| Click on card (not icons) | Card expands | ⬜ Pass ⬜ Fail | |
| See "ชื่อฟิลด์" input | Input visible with value | ⬜ Pass ⬜ Fail | |
| Change to: `ชื่อ-นามสกุล` | Input updates | ⬜ Pass ⬜ Fail | |
| See "Placeholder" input | Input visible | ⬜ Pass ⬜ Fail | |
| Type: `กรอกชื่อและนามสกุลของคุณ` | Input updates | ⬜ Pass ⬜ Fail | |
| Click card header | Card collapses | ⬜ Pass ⬜ Fail | |
| Verify title shows "ชื่อ-นามสกุล" | Title updated | ⬜ Pass ⬜ Fail | |

**Screenshot:** ⬜ Taken (field-edited.png)

---

### Step 1.5: Toggle Field Icons

**Field:** ชื่อ-นามสกุล (collapsed state)

#### Toggle Required (Red !)

| Action | Expected Result | Status | Notes |
|--------|----------------|--------|-------|
| See 🔴 icon (top-right of card) | Icon visible (gray) | ⬜ Pass ⬜ Fail | |
| Hover 🔴 icon | Tooltip: "ทำให้เป็นฟิลด์จำเป็น" | ⬜ Pass ⬜ Fail | |
| Click 🔴 icon | Icon turns red with dot badge | ⬜ Pass ⬜ Fail | |
| Verify state | Red background active | ⬜ Pass ⬜ Fail | |

#### Toggle Show in Table (Blue Table)

| Action | Expected Result | Status | Notes |
|--------|----------------|--------|-------|
| See 🔵 icon | Icon appears (after required=true) | ⬜ Pass ⬜ Fail | |
| Hover 🔵 icon | Tooltip: "แสดงในตาราง" | ⬜ Pass ⬜ Fail | |
| Click 🔵 icon | Icon turns blue with dot badge | ⬜ Pass ⬜ Fail | |
| Verify state | Blue background active | ⬜ Pass ⬜ Fail | |

#### Toggle Telegram (Green Chat)

| Action | Expected Result | Status | Notes |
|--------|----------------|--------|-------|
| See 🟢 icon | Icon visible | ⬜ Pass ⬜ Fail | |
| Hover 🟢 icon | Tooltip: "เปิดแจ้งเตือน Telegram" | ⬜ Pass ⬜ Fail | |
| Click 🟢 icon | Icon turns green with dot badge | ⬜ Pass ⬜ Fail | |
| Verify state | Green background active | ⬜ Pass ⬜ Fail | |

**Screenshot:** ⬜ Taken (field-toggles-active.png)

---

### Step 1.6: Add More Fields

#### Field 2: อีเมล

| Action | Expected Result | Status | Notes |
|--------|----------------|--------|-------|
| Find "เพิ่มฟิลด์ใหม่" button | Button visible (bottom) | ⬜ Pass ⬜ Fail | |
| Click "เพิ่มฟิลด์ใหม่" | New field appears | ⬜ Pass ⬜ Fail | |
| See field type selector | Dropdown/select visible | ⬜ Pass ⬜ Fail | |
| Click selector | Options appear | ⬜ Pass ⬜ Fail | |
| Select "อีเมล" | Field type changes | ⬜ Pass ⬜ Fail | |
| Expand field card | Card expands | ⬜ Pass ⬜ Fail | |
| Set title: `อีเมล` | Title updated | ⬜ Pass ⬜ Fail | |
| Set placeholder: `example@domain.com` | Placeholder set | ⬜ Pass ⬜ Fail | |
| Collapse card | Card collapses | ⬜ Pass ⬜ Fail | |
| Toggle: Required ✅ | Red icon active | ⬜ Pass ⬜ Fail | |
| Toggle: Table ✅ | Blue icon active | ⬜ Pass ⬜ Fail | |

**Screenshot:** ⬜ Taken (field-email-added.png)

#### Field 3: เบอร์โทรศัพท์

| Action | Expected Result | Status | Notes |
|--------|----------------|--------|-------|
| Click "เพิ่มฟิลด์ใหม่" | New field appears | ⬜ Pass ⬜ Fail | |
| Select type: "เบอร์โทร" | Field type set | ⬜ Pass ⬜ Fail | |
| Expand & set title: `เบอร์โทรศัพท์` | Title set | ⬜ Pass ⬜ Fail | |
| Set placeholder: `08X-XXX-XXXX` | Placeholder set | ⬜ Pass ⬜ Fail | |
| Collapse card | Card collapses | ⬜ Pass ⬜ Fail | |
| Toggle: Required ✅ | Red icon active | ⬜ Pass ⬜ Fail | |

**Screenshot:** ⬜ Taken (three-fields-added.png)

---

## 📝 Test Case 2: Add Sub-Forms

### Step 2.1: Switch to Sub-Forms Tab

| Action | Expected Result | Status | Notes |
|--------|----------------|--------|-------|
| See tabs: `(1)` and `(0)` | Tabs visible at top | ⬜ Pass ⬜ Fail | |
| Hover `(1)` button | Tooltip: "ฟอร์มหลัก" | ⬜ Pass ⬜ Fail | |
| Hover `(0)` button | Tooltip: "ฟอร์มย่อย" | ⬜ Pass ⬜ Fail | |
| Click `(0)` button | Sub-forms tab opens | ⬜ Pass ⬜ Fail | |
| See "เพิ่มฟอร์มย่อย" button | Button visible | ⬜ Pass ⬜ Fail | |

**Screenshot:** ⬜ Taken (subform-tab.png)

---

### Step 2.2: Add Sub-Form 1 - ข้อมูลที่อยู่

#### Create Sub-Form

| Action | Expected Result | Status | Notes |
|--------|----------------|--------|-------|
| Click "เพิ่มฟอร์มย่อย" | New sub-form card appears | ⬜ Pass ⬜ Fail | |
| See dashed border card | Card visible with icon 📚 | ⬜ Pass ⬜ Fail | |
| See "คลิกเพื่อระบุชื่อฟอร์มย่อย" | Title placeholder visible | ⬜ Pass ⬜ Fail | |
| Click title | Input appears | ⬜ Pass ⬜ Fail | |
| Type: `ข้อมูลที่อยู่` | Title updates | ⬜ Pass ⬜ Fail | |
| Press Enter | Title saved | ⬜ Pass ⬜ Fail | |
| Click description | Input appears | ⬜ Pass ⬜ Fail | |
| Type: `กรอกข้อมูลที่อยู่สำหรับการติดต่อ` | Description updates | ⬜ Pass ⬜ Fail | |
| Press Enter | Description saved | ⬜ Pass ⬜ Fail | |

**Screenshot:** ⬜ Taken (subform-1-created.png)

#### Add Fields to Sub-Form 1

**Field 1: ที่อยู่ (paragraph)**

| Action | Expected Result | Status | Notes |
|--------|----------------|--------|-------|
| Click "เพิ่มฟิลด์" (inside sub-form) | New field appears | ⬜ Pass ⬜ Fail | |
| Select type: "ข้อความยาว" | Field type set | ⬜ Pass ⬜ Fail | |
| Expand & set title: `ที่อยู่` | Title set | ⬜ Pass ⬜ Fail | |
| Set placeholder: `เลขที่ ถนน ตำบล อำเภอ` | Placeholder set | ⬜ Pass ⬜ Fail | |
| Collapse field | Field collapses | ⬜ Pass ⬜ Fail | |

**Field 2: จังหวัด (province)**

| Action | Expected Result | Status | Notes |
|--------|----------------|--------|-------|
| Click "เพิ่มฟิลด์" | New field appears | ⬜ Pass ⬜ Fail | |
| Select type: "จังหวัด" | Field type set | ⬜ Pass ⬜ Fail | |
| Expand & set title: `จังหวัด` | Title set | ⬜ Pass ⬜ Fail | |
| Collapse field | Field collapses | ⬜ Pass ⬜ Fail | |

**Field 3: รหัสไปรษณีย์ (number)**

| Action | Expected Result | Status | Notes |
|--------|----------------|--------|-------|
| Click "เพิ่มฟิลด์" | New field appears | ⬜ Pass ⬜ Fail | |
| Select type: "ตัวเลข" | Field type set | ⬜ Pass ⬜ Fail | |
| Expand & set title: `รหัสไปรษณีย์` | Title set | ⬜ Pass ⬜ Fail | |
| Set placeholder: `10000` | Placeholder set | ⬜ Pass ⬜ Fail | |
| Collapse field | Field collapses | ⬜ Pass ⬜ Fail | |

**Screenshot:** ⬜ Taken (subform-1-fields.png)

---

### Step 2.3: Add Sub-Form 2 - เอกสารแนบ

#### Create Sub-Form

| Action | Expected Result | Status | Notes |
|--------|----------------|--------|-------|
| Click "เพิ่มฟอร์มย่อย" | New sub-form appears | ⬜ Pass ⬜ Fail | |
| Set title: `เอกสารแนบ` | Title updated | ⬜ Pass ⬜ Fail | |
| Set description: `แนบเอกสารประกอบ` | Description updated | ⬜ Pass ⬜ Fail | |

#### Add Fields to Sub-Form 2

**Field 1: ไฟล์เอกสาร (file_upload)**

| Action | Expected Result | Status | Notes |
|--------|----------------|--------|-------|
| Click "เพิ่มฟิลด์" | New field appears | ⬜ Pass ⬜ Fail | |
| Select type: "แนบไฟล์" | Field type set | ⬜ Pass ⬜ Fail | |
| Set title: `ไฟล์เอกสาร` | Title set | ⬜ Pass ⬜ Fail | |
| Collapse field | Field collapses | ⬜ Pass ⬜ Fail | |

**Field 2: รูปภาพประกอบ (image_upload)**

| Action | Expected Result | Status | Notes |
|--------|----------------|--------|-------|
| Click "เพิ่มฟิลด์" | New field appears | ⬜ Pass ⬜ Fail | |
| Select type: "แนบรูป" | Field type set | ⬜ Pass ⬜ Fail | |
| Set title: `รูปภาพประกอบ` | Title set | ⬜ Pass ⬜ Fail | |
| Collapse field | Field collapses | ⬜ Pass ⬜ Fail | |

**Screenshot:** ⬜ Taken (subform-2-complete.png)

---

## 📝 Test Case 3: Save Form & Verify

### Step 3.1: Save Form

| Action | Expected Result | Status | Notes |
|--------|----------------|--------|-------|
| Scroll to top | Save button visible | ⬜ Pass ⬜ Fail | |
| See pulsing save icon (top-right) | Icon animating (orange glow) | ⬜ Pass ⬜ Fail | |
| Hover save icon | Tooltip: "บันทึกฟอร์ม" | ⬜ Pass ⬜ Fail | |
| Click save icon | Loading indicator appears | ⬜ Pass ⬜ Fail | |
| Wait for response | Toast notification appears | ⬜ Pass ⬜ Fail | |
| See success message | Text: "บันทึกสำเร็จ" or "Success" | ⬜ Pass ⬜ Fail | |
| Verify redirect | Back to form list | ⬜ Pass ⬜ Fail | |

**Screenshot:** ⬜ Taken (form-saved-success.png)

**Error Occurred?** ⬜ Yes ⬜ No

**Error Details:** _________________________________________________

---

### Step 3.2: Verify in Form List

| Action | Expected Result | Status | Notes |
|--------|----------------|--------|-------|
| See form list page | Page loads | ⬜ Pass ⬜ Fail | |
| Find created form | Card visible | ⬜ Pass ⬜ Fail | |
| Verify title | "ฟอร์มทดสอบระบบ Sub-Form" | ⬜ Pass ⬜ Fail | |
| Verify description | Description matches | ⬜ Pass ⬜ Fail | |
| See submission count | Shows "0" | ⬜ Pass ⬜ Fail | |
| See date | Today's date | ⬜ Pass ⬜ Fail | |

**Screenshot:** ⬜ Taken (form-in-list.png)

---

### Step 3.3: Verify in Database

**Open PostgreSQL Client:**

```bash
psql -h localhost -p 5432 -U qcollector_dev -d qcollector_dev
```

**Password:** `qcollector_dev_2025`

#### Query 1: Check Form

```sql
SELECT id, title, description, created_at, is_active
FROM forms
WHERE title = 'ฟอร์มทดสอบระบบ Sub-Form'
ORDER BY created_at DESC
LIMIT 1;
```

| Column | Expected Value | Actual Value | Status |
|--------|---------------|--------------|--------|
| id | UUID format | _____________ | ⬜ Pass ⬜ Fail |
| title | ฟอร์มทดสอบระบบ Sub-Form | _____________ | ⬜ Pass ⬜ Fail |
| is_active | true | _____________ | ⬜ Pass ⬜ Fail |

**Form ID:** _________________________________________________

#### Query 2: Count Main Fields

```sql
SELECT COUNT(*) as main_fields
FROM fields
WHERE form_id = 'YOUR_FORM_ID'
  AND sub_form_id IS NULL;
```

| Metric | Expected | Actual | Status |
|--------|----------|--------|--------|
| main_fields | 3 | _____ | ⬜ Pass ⬜ Fail |

#### Query 3: Count Sub-Forms

```sql
SELECT COUNT(*) as sub_forms
FROM sub_forms
WHERE form_id = 'YOUR_FORM_ID';
```

| Metric | Expected | Actual | Status |
|--------|----------|--------|--------|
| sub_forms | 2 | _____ | ⬜ Pass ⬜ Fail |

#### Query 4: Check Sub-Form Fields

```sql
SELECT
  sf.title as subform_name,
  COUNT(f.id) as field_count
FROM sub_forms sf
LEFT JOIN fields f ON f.sub_form_id = sf.id
WHERE sf.form_id = 'YOUR_FORM_ID'
GROUP BY sf.id, sf.title
ORDER BY sf."order";
```

| Sub-Form | Expected Fields | Actual | Status |
|----------|----------------|--------|--------|
| ข้อมูลที่อยู่ | 3 | _____ | ⬜ Pass ⬜ Fail |
| เอกสารแนบ | 2 | _____ | ⬜ Pass ⬜ Fail |

#### Query 5: Verify Field Settings

```sql
SELECT
  title,
  type,
  required,
  show_in_table,
  send_telegram
FROM fields
WHERE form_id = 'YOUR_FORM_ID'
  AND sub_form_id IS NULL
ORDER BY "order";
```

| Field | Required | Show in Table | Send Telegram | Status |
|-------|----------|---------------|---------------|--------|
| ชื่อ-นามสกุล | true | true | true | ⬜ Pass ⬜ Fail |
| อีเมล | true | true | false | ⬜ Pass ⬜ Fail |
| เบอร์โทรศัพท์ | true | false | false | ⬜ Pass ⬜ Fail |

#### Query 6: Check Dynamic Tables

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'form_%'
ORDER BY tablename DESC
LIMIT 5;
```

**Expected:** 3 tables
- `form_XXXXX` (main form)
- `form_XXXXX_subform_XXXXX` (ข้อมูลที่อยู่)
- `form_XXXXX_subform_XXXXX` (เอกสารแนบ)

**Tables Found:** _________________________________________________

---

## 📝 Test Case 4: Sub-Form Management

### Step 4.1: Edit Form

| Action | Expected Result | Status | Notes |
|--------|----------------|--------|-------|
| Click form card | Options appear | ⬜ Pass ⬜ Fail | |
| Click "แก้ไข" icon | Form builder opens | ⬜ Pass ⬜ Fail | |
| See form title | Loads correctly | ⬜ Pass ⬜ Fail | |
| Go to Sub-Forms tab `(2)` | Tab shows 2 sub-forms | ⬜ Pass ⬜ Fail | |

### Step 4.2: Duplicate Sub-Form

| Action | Expected Result | Status | Notes |
|--------|----------------|--------|-------|
| Find "ข้อมูลที่อยู่" sub-form | Card visible | ⬜ Pass ⬜ Fail | |
| Click ⋮ menu | Dropdown opens | ⬜ Pass ⬜ Fail | |
| Click "ทำสำเนา" | New sub-form appears | ⬜ Pass ⬜ Fail | |
| Verify title | "ข้อมูลที่อยู่ (สำเนา)" | ⬜ Pass ⬜ Fail | |
| Verify fields | Same 3 fields | ⬜ Pass ⬜ Fail | |

**Screenshot:** ⬜ Taken (subform-duplicated.png)

### Step 4.3: Move Sub-Form Up

| Action | Expected Result | Status | Notes |
|--------|----------------|--------|-------|
| Find bottom sub-form | Last in order | ⬜ Pass ⬜ Fail | |
| Click ⋮ menu | Dropdown opens | ⬜ Pass ⬜ Fail | |
| Click "ย้ายขึ้น" | Sub-form moves up | ⬜ Pass ⬜ Fail | |
| Verify order | Position changed | ⬜ Pass ⬜ Fail | |

### Step 4.4: Delete Sub-Form

| Action | Expected Result | Status | Notes |
|--------|----------------|--------|-------|
| Find duplicated sub-form | Card visible | ⬜ Pass ⬜ Fail | |
| Click ⋮ menu | Dropdown opens | ⬜ Pass ⬜ Fail | |
| Click "ลบ" | Confirmation may appear | ⬜ Pass ⬜ Fail | |
| Confirm deletion | Sub-form removed | ⬜ Pass ⬜ Fail | |
| Verify count | Back to 2 sub-forms | ⬜ Pass ⬜ Fail | |

**Screenshot:** ⬜ Taken (subform-deleted.png)

---

## 📊 Test Summary

### Overall Results

| Test Case | Total Steps | Passed | Failed | Pass Rate |
|-----------|-------------|--------|--------|-----------|
| TC1: Main Form | _____ | _____ | _____ | _____% |
| TC2: Sub-Forms | _____ | _____ | _____ | _____% |
| TC3: Save & Verify | _____ | _____ | _____ | _____% |
| TC4: Management | _____ | _____ | _____ | _____% |
| **TOTAL** | **_____** | **_____** | **_____** | **_____%** |

### Critical Issues Found

| # | Issue Description | Severity | Screenshot | Status |
|---|------------------|----------|------------|--------|
| 1 | | ⬜ Critical ⬜ Major ⬜ Minor | | ⬜ Open ⬜ Fixed |
| 2 | | ⬜ Critical ⬜ Major ⬜ Minor | | ⬜ Open ⬜ Fixed |
| 3 | | ⬜ Critical ⬜ Major ⬜ Minor | | ⬜ Open ⬜ Fixed |

### Notes & Observations

```
_______________________________________________________________

_______________________________________________________________

_______________________________________________________________

_______________________________________________________________
```

---

## ✅ Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Tester | _____________ | _____________ | _____________ |
| Reviewer | _____________ | _____________ | _____________ |

**Test Status:** ⬜ PASS ⬜ FAIL ⬜ BLOCKED

**Ready for Production:** ⬜ YES ⬜ NO

---

**Document Version:** 1.0
**Last Updated:** 2025-10-05
**Q-Collector Version:** 0.7.2-dev
