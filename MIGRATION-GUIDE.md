# คู่มือ Migration: แปลชื่อฟอร์มและฟิลด์เดิมเป็นภาษาอังกฤษ

**เวอร์ชัน:** 0.7.3-dev  
**สถานะ:** ⚠️ ต้องใช้บน Linux Server (มี Argos Translate)

---

## 🎯 วัตถุประสงค์

แปลงชื่อฟอร์ม, ฟอร์มย่อย, และฟิลด์ที่เป็นภาษาไทย ให้เป็นภาษาอังกฤษที่มีความหมายตรงกัน

**ตัวอย่าง:**
- ก่อน: "แบบฟอร์มบันทึกข้อมูล" → table: `tbl_______abc123`
- หลัง: "แบบฟอร์มบันทึกข้อมูล" → table: `data_recording_form_abc123`

---

## 🚀 วิธีใช้งาน

### 1. Backup ฐานข้อมูล (สำคัญมาก!)
\`\`\`bash
pg_dump -U qcollector -d qcollector_db > backup.sql
\`\`\`

### 2. รัน Migration
\`\`\`bash
node backend/scripts/migrate-table-names-to-english.js
\`\`\`

### 3. ตรวจสอบผลลัพธ์
\`\`\`bash
# ดู report
cat migration-report-*.json

# ตรวจสอบฐานข้อมูล
docker exec -it qcollector_postgres psql -U qcollector -d qcollector_db
\dt
\`\`\`

---

**เวอร์ชัน:** 0.7.3-dev  
**Platform:** Linux Only
