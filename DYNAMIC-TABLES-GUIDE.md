# Dynamic Tables System - Q-Collector

## 📊 ระบบ Dynamic Tables สำหรับแต่ละฟอร์ม

**Version**: 1.0.0
**Date**: 2025-10-02
**For**: Q-Collector v0.6.0+

---

## 🎯 ภาพรวม

ระบบ Dynamic Tables จะสร้างตาราง PostgreSQL แยกสำหรับแต่ละฟอร์ม โดย:
- ✅ **ชื่อตาราง** (Table Name) จะแปลจากชื่อฟอร์มเป็นภาษาอังกฤษที่มีความหมาย
- ✅ **ชื่อคอลัมน์** (Column Name) จะแปลจากชื่อฟิลด์เป็นภาษาอังกฤษที่มีความหมาย
- ✅ **ชนิดข้อมูล** (Data Type) จะกำหนดตามประเภทของฟิลด์
- ✅ **Power BI** เชื่อมต่อได้ง่ายโดยไม่ต้อง parse JSON

---

## 🔄 ตัวอย่างการแปลชื่อ

### ชื่อฟอร์ม (Form Title)

| ภาษาไทย | Table Name | PowerBI Display |
|---------|------------|-----------------|
| แบบฟอร์มติดต่อ | `form_contact_abc123` | form_contact_abc123 |
| ใบลา | `form_leave_form_def456` | form_leave_form_def456 |
| แบบสอบถาม | `form_survey_ghi789` | form_survey_ghi789 |
| ใบสมัครงาน | `form_application_jkl012` | form_application_jkl012 |
| แบบประเมินพนักงาน | `form_evaluation_mno345` | form_evaluation_mno345 |

### ชื่อฟิลด์ (Field Label)

| ภาษาไทย | Column Name | PostgreSQL Type |
|---------|-------------|-----------------|
| ชื่อเต็ม | `full_name_abc123` | VARCHAR(255) |
| อีเมล | `email_def456` | VARCHAR(255) |
| เบอร์โทร | `phone_number_ghi789` | VARCHAR(20) |
| ที่อยู่ | `address_jkl012` | TEXT |
| วันเกิด | `birth_date_mno345` | DATE |
| แผนก | `department_pqr678` | VARCHAR(255) |
| เงินเดือน | `salary_stu901` | NUMERIC |
| หมายเหตุ | `note_vwx234` | TEXT |

---

## 🏗️ โครงสร้างตาราง

### ตัวอย่างตาราง: `form_contact_abc123`

```sql
CREATE TABLE form_contact_abc123 (
  -- System columns (auto-generated)
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  submission_number INTEGER,
  status VARCHAR(50) DEFAULT 'submitted',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Dynamic columns (based on form fields)
  full_name_abc123 VARCHAR(255),
  email_def456 VARCHAR(255),
  phone_number_ghi789 VARCHAR(20),
  message_jkl012 TEXT
);

-- Indexes
CREATE INDEX idx_form_contact_abc123_form_id ON form_contact_abc123(form_id);
CREATE INDEX idx_form_contact_abc123_user_id ON form_contact_abc123(user_id);
CREATE INDEX idx_form_contact_abc123_submitted_at ON form_contact_abc123(submitted_at);
```

---

## 🎨 การทำงาน

### 1. เมื่อสร้างฟอร์มใหม่

```javascript
// User creates form: "แบบฟอร์มติดต่อ"
const form = {
  id: 'form-1234567890-abc123',
  title: 'แบบฟอร์มติดต่อ',
  fields: [
    { id: 'field-1', label: 'ชื่อเต็ม', type: 'short_answer' },
    { id: 'field-2', label: 'อีเมล', type: 'email' },
    { id: 'field-3', label: 'เบอร์โทร', type: 'phone' },
    { id: 'field-4', label: 'ข้อความ', type: 'paragraph' }
  ]
};

// System automatically:
// 1. Translates form title: "แบบฟอร์มติดต่อ" -> "form_contact"
// 2. Generates table name: "form_contact_abc123"
// 3. Creates table with columns:
//    - full_name_field1 VARCHAR(255)
//    - email_field2 VARCHAR(255)
//    - phone_number_field3 VARCHAR(20)
//    - message_field4 TEXT
```

### 2. เมื่อเพิ่ม/แก้ไขฟิลด์

```javascript
// User adds new field: "ที่อยู่"
// System automatically:
// 1. Translates: "ที่อยู่" -> "address"
// 2. Adds column: ALTER TABLE form_contact_abc123 ADD COLUMN address_field5 TEXT;
```

### 3. เมื่อส่งฟอร์ม

```javascript
// User submits data
const submissionData = {
  'full_name_field1': 'สมชาย ใจดี',
  'email_field2': 'somchai@example.com',
  'phone_number_field3': '0812345678',
  'message_field4': 'ติดต่อสอบถามข้อมูล'
};

// System inserts into form_contact_abc123 table
INSERT INTO form_contact_abc123 (
  form_id, user_id,
  full_name_field1, email_field2, phone_number_field3, message_field4
) VALUES (
  'form-1234567890-abc123', 'user-123',
  'สมชาย ใจดี', 'somchai@example.com', '0812345678', 'ติดต่อสอบถามข้อมูล'
);
```

---

## 📖 คลังคำศัพท์ Thai-English Dictionary

ระบบมีคลังคำศัพท์มากกว่า **100 คำ** สำหรับแปลคำไทยที่ใช้บ่อย:

### ข้อมูลส่วนบุคคล
- ชื่อ → name
- นามสกุล → surname
- ชื่อเต็ม → full_name
- เพศ → gender
- อายุ → age
- วันเกิด → birth_date

### ข้อมูลติดต่อ
- อีเมล → email
- โทรศัพท์ → phone
- มือถือ → mobile
- ที่อยู่ → address
- จังหวัด → province
- รหัสไปรษณีย์ → postal_code

### งาน/การศึกษา
- บริษัท → company
- แผนก → department
- ตำแหน่ง → position
- อาชีพ → occupation
- เงินเดือน → salary
- การศึกษา → education

### เอกสาร
- เลขบัตรประชาชน → national_id
- หนังสือเดินทาง → passport
- ใบขับขี่ → driving_license

### ฟอร์ม
- แบบฟอร์ม → form
- ใบสมัคร → application
- แบบสอบถาม → survey
- แบบประเมิน → evaluation
- ใบลา → leave_form
- ใบอนุมัติ → approval_form

[ดูคำศัพท์ทั้งหมดที่ `backend/utils/thaiTranslator.js`]

---

## 🔧 การใช้งาน API

### สร้างตารางสำหรับฟอร์ม

```javascript
const DynamicTableService = require('./services/DynamicTableService');
const service = new DynamicTableService();

// Create table when form is created
const form = {
  id: 'form-123',
  title: 'แบบฟอร์มติดต่อ',
  fields: [
    { id: 'field-1', label: 'ชื่อเต็ม', type: 'short_answer' },
    { id: 'field-2', label: 'อีเมล', type: 'email' }
  ]
};

const tableName = await service.createFormTable(form);
// Returns: "form_contact_abc123"
```

### Insert Submission

```javascript
await service.insertSubmission(
  formId,
  tableName,
  userId,
  {
    full_name_field1: 'สมชาย ใจดี',
    email_field2: 'somchai@example.com'
  }
);
```

### Query Submissions

```javascript
const submissions = await service.getSubmissions(tableName, {
  userId: 'user-123',
  startDate: '2025-01-01',
  limit: 10
});
```

---

## 📊 Power BI Connection

### เชื่อมต่อโดยตรง

```
Server: localhost:5432
Database: qcollector_dev_2025
Username: qcollector
Password: qcollector_dev_2025

Tables: form_contact_abc123, form_leave_def456, form_survey_ghi789, ...
```

### ตัวอย่าง Power Query (M)

```m
let
    Source = PostgreSQL.Database("localhost:5432", "qcollector_dev_2025"),

    // Select contact form submissions
    ContactFormTable = Source{[Schema="public", Item="form_contact_abc123"]}[Data],

    // Rename columns for better display
    RenamedColumns = Table.RenameColumns(ContactFormTable, {
        {"full_name_field1", "Full Name"},
        {"email_field2", "Email"},
        {"phone_number_field3", "Phone"},
        {"submitted_at", "Submitted Date"}
    })
in
    RenamedColumns
```

---

## ⚙️ การตั้งค่า

### 1. Run Migration

```bash
cd backend
npm run migrate
```

Migration จะเพิ่ม column `table_name` ใน `forms` table

### 2. เพิ่มคำแปลใหม่ (Optional)

```javascript
const { addTranslation } = require('./utils/thaiTranslator');

// Add custom translations
addTranslation('คำไทย', 'english_word');
addTranslation('แผนกขาย', 'sales_department');
```

### 3. Test Translation

```bash
cd backend
npm test -- thaiTranslator.test.js
```

---

## 🎯 ข้อดี

### ✅ สำหรับ Developer
- Query ตรงไปตรงมา (SELECT * FROM form_contact WHERE...)
- ไม่ต้อง parse JSON
- Index ทำงานได้เต็มที่
- Performance ดีกว่า EAV pattern

### ✅ สำหรับ Power BI
- เชื่อมต่อได้ทันที
- Columns แสดงชัดเจน
- ไม่ต้องเขียน complex M query
- Refresh เร็ว

### ✅ สำหรับ ผู้ใช้
- ชื่อตาราง/คอลัมน์มีความหมาย
- ง่ายต่อการเข้าใจ
- ง่ายต่อการเขียน SQL query เอง

---

## ⚠️ ข้อควรระวัง

### 1. การแก้ไขฟิลด์
- **เพิ่มฟิลด์ใหม่**: ระบบจะ ADD COLUMN อัตโนมัติ ✅
- **ลบฟิลด์**: ระบบ**ไม่ลบ** column อัตโนมัติ (เก็บข้อมูลเก่า) ⚠️
- **เปลี่ยนชื่อฟิลด์**: จะสร้าง column ใหม่ (ข้อมูลเก่ายังอยู่) ⚠️

### 2. การลบฟอร์ม
- เมื่อลบฟอร์ม ตารางจะถูกลบด้วย (CASCADE DELETE)
- **แนะนำ**: ทำ Backup ก่อนลบฟอร์ม

### 3. ขนาด Database
- แต่ละฟอร์มจะมี 1 table
- ถ้ามีฟอร์มเยอะ (>1000) อาจมี table เยอะ
- ใช้ `information_schema` เพื่อจัดการ

---

## 🔍 Troubleshooting

### ตารางไม่ถูกสร้าง

```sql
-- Check if table exists
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'form_%';

-- Check table_name in forms
SELECT id, title, table_name FROM forms;
```

### ชื่อคอลัมน์ไม่ถูกต้อง

```javascript
// Test translation
const { translateFieldLabel } = require('./utils/thaiTranslator');
console.log(translateFieldLabel('ชื่อฟิลด์ของคุณ'));
```

### เพิ่มคำแปลใหม่

```javascript
// Add to backend/utils/thaiTranslator.js
const thaiEnglishDict = {
  // ... existing ...
  'คำใหม่': 'new_word',
};
```

---

## 📚 ไฟล์ที่เกี่ยวข้อง

```
backend/
├── utils/
│   ├── thaiTranslator.js          # Thai-English dictionary & translator
│   └── tableNameHelper.js         # Table/column name generator
├── services/
│   └── DynamicTableService.js     # Create & manage dynamic tables
├── migrations/
│   └── 20251002000001-add-table-name-to-forms.js
└── tests/
    └── unit/utils/
        ├── thaiTranslator.test.js
        └── tableNameHelper.test.js
```

---

## 🚀 Roadmap

### Phase 1 (Current)
- ✅ Thai-English translation with dictionary
- ✅ Auto table creation
- ✅ Auto column creation
- ✅ Basic CRUD operations

### Phase 2 (Planned)
- 🔄 AI-powered translation (Google Translate API)
- 🔄 Custom translation per form
- 🔄 Migration wizard for existing data
- 🔄 View/Materialized View option

### Phase 3 (Future)
- 🔮 Multi-language support (EN, TH, CN)
- 🔮 Auto-optimize queries
- 🔮 Smart indexing based on usage

---

## 📞 ติดต่อ

ถ้ามีคำถามหรือต้องการเพิ่มคำแปลใหม่:
- เปิด Issue ที่ GitHub
- แก้ไข `backend/utils/thaiTranslator.js` โดยตรง

---

**Created**: 2025-10-02
**Version**: 1.0.0
**Author**: Q-Collector Development Team
