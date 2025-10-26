/**
 * List All Unified User Profiles
 * Shows all data owners in the system
 *
 * Run: node backend/scripts/list-all-profiles.js
 *
 * @version v0.8.5-dev
 * @date 2025-10-25
 */

const { sequelize } = require('../config/database.config');

async function listAllProfiles() {
  console.log('📋 Listing all unified user profiles...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    const [profiles] = await sequelize.query(`
      SELECT
        id,
        primary_email,
        primary_phone,
        full_name,
        jsonb_array_length(submission_ids) as submission_count,
        jsonb_array_length(form_ids) as form_count,
        created_at
      FROM unified_user_profiles
      ORDER BY created_at DESC
    `);

    console.log(`📊 มีเจ้าของข้อมูลทั้งหมด: ${profiles.length} คน\n`);
    console.log('รายละเอียดทั้งหมด:');
    console.log('='.repeat(80) + '\n');

    profiles.forEach((p, idx) => {
      console.log(`${idx + 1}. ${p.primary_email || p.primary_phone}`);
      console.log(`   ชื่อ: ${p.full_name}`);
      if (p.primary_email && p.primary_phone) {
        console.log(`   โทร: ${p.primary_phone}`);
      }
      console.log(`   ฟอร์ม: ${p.form_count} ฟอร์ม`);
      console.log(`   Submissions: ${p.submission_count}`);
      console.log(`   สร้างเมื่อ: ${new Date(p.created_at).toLocaleString('th-TH')}`);
      console.log('');
    });

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

listAllProfiles();
