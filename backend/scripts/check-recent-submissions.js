/**
 * Check Recent Submissions and Profile Status
 * Shows latest submissions and verifies if they have unified_user_profiles
 *
 * Run: node backend/scripts/check-recent-submissions.js
 *
 * @version v0.8.5-dev
 * @date 2025-10-25
 */

const { sequelize } = require('../config/database.config');

async function checkRecentSubmissions() {
  console.log('🔍 Checking recent submissions and profile status...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Get total submission count
    const [countResult] = await sequelize.query(`
      SELECT COUNT(*) as total FROM submissions
    `);
    console.log(`📊 Total submissions in database: ${countResult[0].total}\n`);

    // Get all submissions ordered by creation date
    const [submissions] = await sequelize.query(`
      SELECT
        s.id,
        s.form_id,
        s.submitted_at,
        s."createdAt",
        f.title as form_title
      FROM submissions s
      INNER JOIN forms f ON s.form_id = f.id
      ORDER BY s."createdAt" DESC
      LIMIT 30
    `);

    console.log(`📋 Showing latest ${submissions.length} submissions:\n`);

    const missingProfiles = [];

    for (let i = 0; i < submissions.length; i++) {
      const sub = submissions[i];
      console.log(`${i + 1}. Submission ID: ${sub.id.substring(0, 8)}...`);
      console.log(`   Form: ${sub.form_title}`);
      console.log(`   Submitted: ${new Date(sub.submitted_at || sub.createdAt).toLocaleString('th-TH')}`);

      // Get email
      const [emails] = await sequelize.query(`
        SELECT sd.value_text as email
        FROM submission_data sd
        INNER JOIN fields f ON sd.field_id = f.id
        WHERE sd.submission_id = '${sub.id}'
          AND f.type = 'email'
          AND sd.value_text IS NOT NULL
          AND sd.value_text != ''
        LIMIT 1
      `);

      // Get phone
      const [phones] = await sequelize.query(`
        SELECT sd.value_text as phone
        FROM submission_data sd
        INNER JOIN fields f ON sd.field_id = f.id
        WHERE sd.submission_id = '${sub.id}'
          AND f.type = 'phone'
          AND sd.value_text IS NOT NULL
          AND sd.value_text != ''
        LIMIT 1
      `);

      let hasProfile = false;
      let identifier = null;

      if (emails.length > 0 || phones.length > 0) {
        if (emails.length > 0) {
          console.log(`   📧 Email: ${emails[0].email}`);
          identifier = emails[0].email;
        }
        if (phones.length > 0) {
          console.log(`   📱 Phone: ${phones[0].phone}`);
          if (!identifier) identifier = phones[0].phone;
        }

        // Check if profile exists
        const [profile] = await sequelize.query(`
          SELECT id, primary_email, primary_phone
          FROM unified_user_profiles
          WHERE LOWER(primary_email) = LOWER('${emails.length > 0 ? emails[0].email : 'none'}')
             OR primary_phone = '${phones.length > 0 ? phones[0].phone : 'none'}'
        `);

        if (profile.length > 0) {
          console.log(`   ✅ มี Profile: ${profile[0].id.substring(0, 8)}...`);
          hasProfile = true;
        } else {
          console.log(`   ❌ ไม่มี Profile!`);
          missingProfiles.push({
            submissionId: sub.id,
            formTitle: sub.form_title,
            email: emails.length > 0 ? emails[0].email : null,
            phone: phones.length > 0 ? phones[0].phone : null,
            submittedAt: sub.submitted_at || sub.createdAt
          });
        }
      } else {
        console.log(`   ⚠️  ไม่มี email/phone (ข้ามได้)`);
      }
      console.log('');
    }

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log('===========');
    console.log(`Total submissions checked: ${submissions.length}`);
    console.log(`Submissions with missing profiles: ${missingProfiles.length}`);
    console.log('');

    if (missingProfiles.length > 0) {
      console.log('❌ SUBMISSIONS ที่ยังไม่มี PROFILE:\n');
      missingProfiles.forEach((m, idx) => {
        console.log(`${idx + 1}. Submission: ${m.submissionId.substring(0, 8)}...`);
        console.log(`   Form: ${m.formTitle}`);
        if (m.email) console.log(`   Email: ${m.email}`);
        if (m.phone) console.log(`   Phone: ${m.phone}`);
        console.log(`   Date: ${new Date(m.submittedAt).toLocaleString('th-TH')}`);
        console.log('');
      });

      console.log('⚠️  ACTION REQUIRED: Run rebuild script to create missing profiles');
      console.log('   Command: node backend/scripts/rebuild-profiles-from-submissions.js');
    } else {
      console.log('✅ All submissions with email/phone have profiles!');
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

checkRecentSubmissions();
