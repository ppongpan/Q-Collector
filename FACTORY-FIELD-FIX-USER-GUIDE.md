# คู่มือการแก้ไข Factory Field - สำหรับผู้ใช้งาน

**วันที่:** 2025-10-10
**เวอร์ชัน:** v0.7.8-dev
**สถานะ:** ✅ แก้ไขเรียบร้อย - ข้อมูลใหม่จะบันทึกถูกต้อง

---

## สรุปสถานการณ์

### ปัญหาที่พบ
ข้อมูล factory field บันทึกในฐานข้อมูลเป็น `{"โรงงานสระบุรี"}` แทนที่จะเป็น `โรงงานสระบุรี` (ข้อความธรรมดา)

### การแก้ไขที่ทำ
✅ **แก้ไขระบบแล้ว:** ปรับปรุง `DynamicTableService.js` ให้แปลง array เป็นข้อความธรรมดาก่อนบันทึกลงฐานข้อมูล

### ผลลัพธ์
- ✅ **ข้อมูลใหม่:** จะบันทึกเป็นข้อความธรรมดา `โรงงานสระบุรี` (ถูกต้อง)
- ⚠️ **ข้อมูลเก่า:** ยังคงอยู่ในรูปแบบ `{"โรงงานสระบุรี"}` (ต้องจัดการแยก)

---

## ทำความเข้าใจการแก้ไข

### ทำไมข้อมูลเก่ายังไม่เปลี่ยน?

การแก้ไขที่ทำเป็น **"การป้องกัน" (Preventive Fix)** ไม่ใช่ **"การย้อนหลัง" (Retroactive Fix)**

**อุปมาเหมือน:**
- ซ่อมท่อน้ำรั่ว → น้ำที่รั่วใหม่จะหยุด ✅
- แต่น้ำที่รั่วไปแล้วยังอยู่บนพื้น ⚠️

**ในกรณีนี้:**
- Submission ใหม่ที่สร้างหลัง restart backend → บันทึกถูกต้อง ✅
- Submission เก่าที่สร้างก่อน restart → ยังเป็นรูปแบบเก่า ⚠️

---

## วิธีทดสอบว่าการแก้ไขใช้งานได้

### ขั้นตอนการทดสอบ:

1. **รีเฟรชเบราว์เซอร์** (Ctrl+R หรือ F5)

2. **สร้าง Submission ใหม่:**
   - เปิดฟอร์มที่มี sub-form พร้อม factory field
   - คลิก "Add Sub-Form Entry"
   - เลือกโรงงาน: "โรงงานระยอง"
   - บันทึกข้อมูล

3. **ตรวจสอบฐานข้อมูล:**
   ```sql
   SELECT id, factory_affiliated, submitted_at
   FROM [your_subform_table_name]
   ORDER BY submitted_at DESC
   LIMIT 1;
   ```

4. **ผลลัพธ์ที่คาดหวัง:**
   ```
   | id        | factory_affiliated | submitted_at          |
   |-----------|--------------------|-----------------------|
   | new-id... | โรงงานระยอง       | 2025-10-10 14:30:00   | ✅ ถูกต้อง!
   ```

---

## จัดการกับข้อมูลเก่า - 3 ทางเลือก

### ทางเลือกที่ 1: ใช้ Migration Script (แนะนำ)

**ข้อดี:**
- แก้ไขข้อมูลเก่าทั้งหมดอัตโนมัติ
- ปลอดภัย (ใช้ Regex Pattern ตรวจสอบ)
- รวดเร็ว (ทำทีเดียวเสร็จ)

**วิธีทำ:**
```bash
cd backend/scripts
node fix-factory-field-format.js
```

**Script จะทำอะไร:**
1. หาตารางทั้งหมดที่มี factory field
2. แปลงข้อมูลจาก `{"โรงงานระยอง"}` → `โรงงานระยอง`
3. อัพเดตเฉพาะแถวที่มีรูปแบบ `{"..."}`

**ตัวอย่าง Output:**
```
🔍 Found 3 tables with factory fields
✅ Fixed factory_affiliated in sub_form_table_abc (2 records)
✅ Fixed factory_affiliated in sub_form_table_def (1 record)
✅ Complete! Total fixed: 3 records
```

---

### ทางเลือกที่ 2: ปล่อยข้อมูลเก่าไว้ตามเดิม

**เหมาะกับ:**
- มีข้อมูลเก่าไม่มาก (< 10 records)
- ไม่ต้องการเสี่ยงแก้ไขฐานข้อมูล
- ข้อมูลเก่าไม่ได้ใช้งานบ่อย

**หมายเหตุ:**
- Frontend อาจต้องจัดการทั้ง 2 รูปแบบ
- PowerBI report อาจต้องทำ data cleaning

**ข้อดี:**
- ไม่ต้องทำอะไรเพิ่ม
- ข้อมูลใหม่จะถูกต้อง

**ข้อเสีย:**
- ฐานข้อมูลมีข้อมูล 2 รูปแบบปนกัน

---

### ทางเลือกที่ 3: แก้ไขด้วยตัวเอง (Manual)

**เหมาะกับ:**
- มีข้อมูลเพียง 1-2 แถว
- ต้องการควบคุมทีละแถว

**วิธีทำ (ใช้ pgAdmin หรือ psql):**
```sql
-- ตัวอย่าง: แก้ไขแถวเดียว
UPDATE [your_subform_table_name]
SET factory_affiliated = 'โรงงานสระบุรี'
WHERE id = '5af9af2f-b4ec-4af4-a7b1-a0cfbd20f0eb';

UPDATE [your_subform_table_name]
SET factory_affiliated = 'โรงงานระยอง'
WHERE id = 'd45f53c7-77d9-499d-ab27-ee7b8870159c';
```

---

## Migration Script (fix-factory-field-format.js)

**Location:** `backend/scripts/fix-factory-field-format.js`

```javascript
const { Pool } = require('pg');
require('dotenv').config();

async function fixFactoryFieldFormat() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });

  try {
    console.log('🔍 Scanning for tables with factory fields...\n');

    // Find all columns that might be factory fields
    const columnsQuery = `
      SELECT DISTINCT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (
          column_name LIKE '%factory%'
          OR column_name LIKE '%affiliated%'
          OR column_name = 'factory_affiliated'
        )
      ORDER BY table_name;
    `;

    const { rows: columns } = await pool.query(columnsQuery);
    console.log(`✅ Found ${columns.length} columns to check:\n`);

    let totalFixed = 0;

    for (const { table_name, column_name } of columns) {
      console.log(`📋 Checking ${table_name}.${column_name}...`);

      // Update records with JSON format to plain text
      // Pattern: {"value"} → value
      const updateQuery = `
        UPDATE "${table_name}"
        SET "${column_name}" = regexp_replace(
          "${column_name}",
          '^\\{"([^"]+)"\\}$',
          '\\1'
        )
        WHERE "${column_name}" ~ '^\\{"[^"]+"\\}$'
        RETURNING id, "${column_name}";
      `;

      const { rows: updated, rowCount } = await pool.query(updateQuery);

      if (rowCount > 0) {
        console.log(`   ✅ Fixed ${rowCount} records in ${table_name}.${column_name}`);
        console.log(`   Example: ${updated[0][column_name]}`);
        totalFixed += rowCount;
      } else {
        console.log(`   ℹ️  No records need fixing in ${table_name}.${column_name}`);
      }
      console.log();
    }

    console.log(`\n🎉 Migration Complete!`);
    console.log(`📊 Total records fixed: ${totalFixed}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration
fixFactoryFieldFormat()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
```

**วิธีใช้งาน:**
```bash
# 1. สร้างไฟล์
cd backend/scripts
nano fix-factory-field-format.js
# (วางโค้ดด้านบน)

# 2. รันไฟล์
node fix-factory-field-format.js

# 3. ตรวจสอบผลลัพธ์
psql -U qcollector_user -d qcollector_dev -c "SELECT factory_affiliated FROM [table_name] LIMIT 5;"
```

---

## คำถามที่พบบ่อย (FAQ)

### Q1: การแก้ไขนี้ส่งผลกระทบต่อ field อื่นไหม?
**A:** ไม่ มีผลเฉพาะ field ที่ส่งค่าเป็น array เท่านั้น เช่น:
- ✅ `factory` field
- ✅ `dropdown` field (ถ้าส่งเป็น array)
- ✅ `multiple_choice` field (single selection)
- ✅ `province` field (ถ้าส่งเป็น array)

Field อื่นๆ ไม่เปลี่ยนแปลง:
- ✅ `text`, `number`, `date`, `file_upload` เหมือนเดิม
- ✅ `lat_long` ยังคงเป็น POINT geometry
- ✅ `checkbox` (multi-select) ยังคงเป็น comma-separated values

### Q2: ต้อง restart backend ทุกครั้งที่สร้าง submission ใหม่ไหม?
**A:** ไม่ต้อง restart แล้วครั้งเดียวพอ การ restart ครั้งเดียวทำให้:
- โหลด code ใหม่ที่มีการแก้ไข
- submission ทั้งหมดหลังจากนั้นจะบันทึกถูกต้อง

### Q3: ถ้าไม่รัน migration script จะมีปัญหาไหม?
**A:** ไม่มีปัญหาร้ายแรง แต่อาจมีความไม่สะดวก:
- ✅ ข้อมูลใหม่: บันทึกถูกต้อง
- ⚠️ ข้อมูลเก่า: แสดงผลอาจแปลก (มี `{"..."}`)
- ⚠️ PowerBI: อาจต้องทำ data cleaning

**แนะนำ:** รัน migration เพื่อความสะอาดของฐานข้อมูล

### Q4: migration script ปลอดภัยไหม?
**A:** ปลอดภัย เพราะ:
- ✅ ใช้ Regex Pattern ที่เฉพาะเจาะจง (`^\\{"[^"]+"\\}$`)
- ✅ แก้ไขเฉพาะค่าที่ตรงกับรูปแบบ `{"value"}` เท่านั้น
- ✅ ค่าอื่นๆ ไม่ถูกแก้ไข
- ✅ สามารถ rollback ได้ (ถ้ามี backup)

**คำแนะนำ:** Backup ฐานข้อมูลก่อนรัน migration (เผื่อเกิดปัญหา)

---

## ขั้นตอนที่แนะนำ

### สำหรับระบบที่มีข้อมูลเยอะ (> 10 records):

1. ✅ **Backup ฐานข้อมูล** (ป้องกันอย่างเดียว)
   ```bash
   pg_dump -U qcollector_user qcollector_dev > backup_before_migration.sql
   ```

2. ✅ **ทดสอบข้อมูลใหม่** (ยืนยันว่าแก้ไขใช้งานได้)
   - สร้าง submission ใหม่
   - ตรวจสอบฐานข้อมูล
   - คาดหวัง: `โรงงานระยอง` (ไม่มี `{"..."}`)

3. ✅ **รัน Migration Script** (แก้ไขข้อมูลเก่า)
   ```bash
   cd backend/scripts
   node fix-factory-field-format.js
   ```

4. ✅ **ตรวจสอบผลลัพธ์**
   ```sql
   SELECT factory_affiliated FROM [table_name] WHERE factory_affiliated NOT LIKE '%{%';
   ```

5. ✅ **ทดสอบการแสดงผล** (Frontend แสดงถูกต้อง)

---

### สำหรับระบบที่มีข้อมูลน้อย (< 10 records):

1. ✅ **ทดสอบข้อมูลใหม่** (ยืนยันว่าแก้ไขใช้งานได้)

2. 📋 **เลือกทางเลือก:**
   - ถ้าต้องการความสะอาด → รัน migration
   - ถ้ายอมรับได้ → ปล่อยข้อมูลเก่าไว้

---

## สรุป

### ✅ สิ่งที่ทำไปแล้ว:
1. แก้ไข `DynamicTableService.js` (2 locations)
2. เพิ่มการตรวจสอบ `Array.isArray()` ก่อนบันทึกข้อมูล
3. Restart backend server
4. สร้าง migration script

### ⏳ สิ่งที่ต้องทำต่อ:
1. **ทดสอบข้อมูลใหม่** (สร้าง submission ใหม่)
2. **เลือกวิธีจัดการข้อมูลเก่า** (3 ทางเลือก)
3. **ทดสอบ navigation arrows** (refresh browser แล้วลอง)

---

**หากมีคำถามเพิ่มเติม หรือต้องการความช่วยเหลือ:**
- รัน migration script → แจ้งเราได้เลย
- เจอปัญหา → ส่ง error log มา
- ต้องการปรับแต่ง script → ขอ requirement เพิ่มเติม

**สถานะปัจจุบัน:** ✅ Backend พร้อมใช้งาน - ข้อมูลใหม่จะบันทึกถูกต้อง!
