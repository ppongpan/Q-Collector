const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'qcollector_db',
  process.env.POSTGRES_USER || 'qcollector',
  process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    dialect: 'postgres',
    logging: false
  }
);

async function verifySubFormBehavior() {
  try {
    console.log('\n=== ตรวจสอบพฤติกรรมการบันทึกข้อมูล Sub-form ===\n');

    // 1. Check main form table
    const [mainFormRecords] = await sequelize.query(`
      SELECT id, username, submitted_at
      FROM first_form_b8f25df76413
      ORDER BY submitted_at DESC
      LIMIT 5
    `);

    console.log('📋 ตาราง Main Form (first_form_b8f25df76413):');
    console.log(`   จำนวนแถว: ${mainFormRecords.length}`);
    mainFormRecords.forEach((record, index) => {
      console.log(`   ${index + 1}. ID: ${record.id}, Username: ${record.username}, เวลา: ${record.submitted_at}`);
    });

    // 2. Check sub-form table
    const [subFormRecords] = await sequelize.query(`
      SELECT id, parent_id, username, submitted_at
      FROM call_records_333a357b0cb2
      ORDER BY submitted_at DESC
      LIMIT 10
    `);

    console.log('\n📋 ตาราง Sub-form (call_records_333a357b0cb2):');
    console.log(`   จำนวนแถว: ${subFormRecords.length}`);
    subFormRecords.forEach((record, index) => {
      console.log(`   ${index + 1}. ID: ${record.id}, Parent: ${record.parent_id}, Username: ${record.username}, เวลา: ${record.submitted_at}`);
    });

    // 3. Verify parent_id references
    console.log('\n🔗 ตรวจสอบการอ้างอิง (Foreign Key):');
    if (subFormRecords.length > 0) {
      const parentId = subFormRecords[0].parent_id;

      // Check if parent exists in submissions table
      const [parentSubmission] = await sequelize.query(`
        SELECT id, form_id, submitted_at
        FROM submissions
        WHERE id = '${parentId}'
      `);

      if (parentSubmission.length > 0) {
        console.log(`   ✅ parent_id ${parentId} อ้างอิงไปที่ submissions table`);
        console.log(`      Form ID: ${parentSubmission[0].form_id}`);
        console.log(`      เวลา: ${parentSubmission[0].submitted_at}`);
      } else {
        console.log(`   ❌ parent_id ${parentId} ไม่พบใน submissions table`);
      }

      // Check if parent exists in main form dynamic table
      const [parentInMainTable] = await sequelize.query(`
        SELECT id, username, submitted_at
        FROM first_form_b8f25df76413
        WHERE id = '${parentId}'
      `);

      if (parentInMainTable.length > 0) {
        console.log(`   ❌ parent_id ${parentId} อ้างอิงไปที่ main form table (ผิด!)`);
      } else {
        console.log(`   ✅ parent_id ไม่อ้างอิงไปที่ main form table (ถูกต้อง!)`);
      }
    }

    // 4. Summary
    console.log('\n📊 สรุป:');
    console.log(`   - Main form table มี ${mainFormRecords.length} แถว (แต่ละแถว = 1 main submission)`);
    console.log(`   - Sub-form table มี ${subFormRecords.length} แถว (แต่ละแถว = 1 sub-form entry)`);
    console.log(`   - เมื่อเพิ่ม sub-form entry ใหม่ → เพิ่มแถวใน sub-form table เท่านั้น`);
    console.log(`   - Main form table จะไม่เปลี่ยนแปลง`);

    await sequelize.close();
    console.log('\n✅ เสร็จสิ้น!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verifySubFormBehavior();
