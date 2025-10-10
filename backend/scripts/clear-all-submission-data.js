const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'qcollector_db',
  process.env.POSTGRES_USER || 'qcollector',
  process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    dialect: 'postgres',
    logging: console.log
  }
);

async function clearAllSubmissionData() {
  try {
    console.log('\n=== 🗑️  กำลังลบข้อมูล Submission ทั้งหมด ===\n');

    await sequelize.query('BEGIN');

    // 1. Delete all data from dynamic tables
    console.log('📋 ขั้นตอนที่ 1: ลบข้อมูลจากตาราง Dynamic Tables');

    // Get all dynamic table names
    const [tables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('forms', 'fields', 'sub_forms', 'submissions', 'submission_data', 'users', 'audit_logs', 'sessions', 'SequelizeMeta')
      ORDER BY table_name
    `);

    console.log(`   พบ ${tables.length} ตารางที่เป็น dynamic tables`);

    for (const table of tables) {
      try {
        const [result] = await sequelize.query(`DELETE FROM "${table.table_name}"`);
        console.log(`   ✅ ลบข้อมูลจาก ${table.table_name}`);
      } catch (error) {
        console.error(`   ❌ Error deleting from ${table.table_name}:`, error.message);
      }
    }

    // 2. Delete all submission_data
    console.log('\n📋 ขั้นตอนที่ 2: ลบข้อมูลจาก submission_data');
    await sequelize.query('DELETE FROM submission_data');
    console.log(`   ✅ ลบข้อมูลเรียบร้อย`);

    // 3. Delete all submissions
    console.log('\n📋 ขั้นตอนที่ 3: ลบข้อมูลจาก submissions');
    await sequelize.query('DELETE FROM submissions');
    console.log(`   ✅ ลบข้อมูลเรียบร้อย`);

    await sequelize.query('COMMIT');

    // 4. Verify deletion
    console.log('\n📊 ตรวจสอบผลลัพธ์:');

    const [submissionsCount] = await sequelize.query('SELECT COUNT(*) as count FROM submissions');
    const [submissionDataCount] = await sequelize.query('SELECT COUNT(*) as count FROM submission_data');

    console.log(`   - submissions table: ${submissionsCount[0].count} แถว`);
    console.log(`   - submission_data table: ${submissionDataCount[0].count} แถว`);

    for (const table of tables.slice(0, 5)) {
      const [count] = await sequelize.query(`SELECT COUNT(*) as count FROM "${table.table_name}"`);
      console.log(`   - ${table.table_name}: ${count[0].count} แถว`);
    }

    if (tables.length > 5) {
      console.log(`   ... และอีก ${tables.length - 5} ตารางอื่นๆ`);
    }

    console.log('\n✅ ลบข้อมูลเรียบร้อยแล้ว!');
    console.log('📝 หมายเหตุ: โครงสร้างตารางยังคงอยู่ ลบเฉพาะข้อมูลเท่านั้น');

  } catch (error) {
    await sequelize.query('ROLLBACK');
    console.error('\n❌ เกิดข้อผิดพลาด:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the script
clearAllSubmissionData()
  .then(() => {
    console.log('\n🎉 สำเร็จ!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 ล้มเหลว:', error.message);
    process.exit(1);
  });
