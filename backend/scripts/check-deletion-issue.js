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

async function checkDeletionIssue() {
  try {
    console.log('\n=== 🔍 ตรวจสอบปัญหาการลบข้อมูล ===\n');

    // Check submissions table
    const [submissions] = await sequelize.query(`
      SELECT id, form_id, parent_id, submitted_at
      FROM submissions
      ORDER BY submitted_at DESC
    `);

    console.log('📋 ตาราง submissions:');
    console.log(`   จำนวนทั้งหมด: ${submissions.length} แถว`);

    const mainSubmissions = submissions.filter(s => s.parent_id === null);
    const subSubmissions = submissions.filter(s => s.parent_id !== null);

    console.log(`   - Main submissions: ${mainSubmissions.length}`);
    console.log(`   - Sub-form submissions: ${subSubmissions.length}`);

    if (submissions.length > 0) {
      console.log('\n   รายการล่าสุด:');
      submissions.slice(0, 5).forEach((s, i) => {
        const type = s.parent_id ? 'Sub' : 'Main';
        console.log(`   ${i + 1}. [${type}] ID: ${s.id.substring(0, 8)}..., parent: ${s.parent_id ? s.parent_id.substring(0, 8) + '...' : 'null'}`);
      });
    }

    // Check main form dynamic table
    const [mainFormRecords] = await sequelize.query(`
      SELECT id, username, submitted_at
      FROM first_form_b8f25df76413
      ORDER BY submitted_at DESC
    `);

    console.log('\n📋 ตาราง first_form_b8f25df76413 (Main Form):');
    console.log(`   จำนวนทั้งหมด: ${mainFormRecords.length} แถว`);

    if (mainFormRecords.length > 0) {
      console.log('   รายการล่าสุด:');
      mainFormRecords.slice(0, 5).forEach((r, i) => {
        console.log(`   ${i + 1}. ID: ${r.id.substring(0, 8)}..., User: ${r.username}`);
      });
    }

    // Check sub-form dynamic table
    const [subFormRecords] = await sequelize.query(`
      SELECT id, parent_id, username, submitted_at
      FROM call_records_333a357b0cb2
      ORDER BY submitted_at DESC
    `);

    console.log('\n📋 ตาราง call_records_333a357b0cb2 (Sub-form):');
    console.log(`   จำนวนทั้งหมด: ${subFormRecords.length} แถว`);

    if (subFormRecords.length > 0) {
      console.log('   รายการล่าสุด:');
      subFormRecords.slice(0, 5).forEach((r, i) => {
        console.log(`   ${i + 1}. ID: ${r.id.substring(0, 8)}..., Parent: ${r.parent_id.substring(0, 8)}...`);
      });
    }

    // Find orphaned records
    console.log('\n🔍 ตรวจหา Orphaned Records:');

    // Orphaned main form records (in dynamic table but not in submissions)
    const [orphanedMain] = await sequelize.query(`
      SELECT f.id
      FROM first_form_b8f25df76413 f
      LEFT JOIN submissions s ON s.id = f.id
      WHERE s.id IS NULL
    `);

    console.log(`   - Main form records ที่ไม่มีใน submissions: ${orphanedMain.length}`);
    if (orphanedMain.length > 0) {
      console.log('     IDs:');
      orphanedMain.slice(0, 5).forEach(r => {
        console.log(`     - ${r.id}`);
      });
    }

    // Orphaned sub-form records (in dynamic table but not in submissions)
    const [orphanedSub] = await sequelize.query(`
      SELECT s.id, s.parent_id
      FROM call_records_333a357b0cb2 s
      LEFT JOIN submissions sub ON sub.id = s.parent_id
      WHERE sub.id IS NULL
    `);

    console.log(`   - Sub-form records ที่ parent ไม่มีใน submissions: ${orphanedSub.length}`);
    if (orphanedSub.length > 0) {
      console.log('     Parent IDs:');
      orphanedSub.slice(0, 5).forEach(r => {
        console.log(`     - ${r.parent_id}`);
      });
    }

    await sequelize.close();
    console.log('\n✅ เสร็จสิ้น!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDeletionIssue();
