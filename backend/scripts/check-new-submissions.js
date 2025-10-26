/**
 * Check New PDPA Demo Submissions
 * Find and verify if new submissions have profiles created
 *
 * Run: node backend/scripts/check-new-submissions.js
 *
 * @version v0.8.5-dev
 * @date 2025-10-25
 */

const { sequelize } = require('../config/database.config');

async function checkNewSubmissions() {
  console.log('🔍 Checking new PDPA Demo submissions...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Find PDPA Demo forms
    const [forms] = await sequelize.query(`
      SELECT id, title, "createdAt"
      FROM forms
      WHERE title LIKE '%PDPA - Demo%'
      ORDER BY "createdAt" DESC
      LIMIT 5
    `);

    console.log('📋 PDPA Demo forms found:\n');
    forms.forEach((f, idx) => {
      console.log(`${idx + 1}. ${f.title}`);
      console.log(`   ID: ${f.id}`);
      console.log(`   Created: ${new Date(f.createdAt).toLocaleString('th-TH')}`);
      console.log('');
    });

    if (forms.length === 0) {
      console.log('❌ No PDPA Demo forms found');
      await sequelize.close();
      process.exit(0);
    }

    // Get the latest form
    const targetForm = forms[0];
    console.log(`🎯 Checking latest form: ${targetForm.title}\n`);

    // Get latest submissions for this form
    const [submissions] = await sequelize.query(`
      SELECT
        s.id,
        s.form_id,
        s.submitted_at,
        s."createdAt"
      FROM submissions s
      WHERE s.form_id = '${targetForm.id}'
      ORDER BY s."createdAt" DESC
      LIMIT 10
    `);

    console.log(`📝 Found ${submissions.length} submissions for this form:\n`);

    const missingProfiles = [];

    for (const sub of submissions) {
      console.log(`Submission ID: ${sub.id}`);
      console.log(`  Submitted: ${new Date(sub.submitted_at || sub.createdAt).toLocaleString('th-TH')}`);

      // Get email from this submission
      const [emails] = await sequelize.query(`
        SELECT sd.value_text as email
        FROM submission_data sd
        INNER JOIN fields f ON sd.field_id = f.id
        WHERE sd.submission_id = '${sub.id}'
          AND f.type = 'email'
          AND sd.value_text IS NOT NULL
          AND sd.value_text != ''
      `);

      // Get phone from this submission
      const [phones] = await sequelize.query(`
        SELECT sd.value_text as phone
        FROM submission_data sd
        INNER JOIN fields f ON sd.field_id = f.id
        WHERE sd.submission_id = '${sub.id}'
          AND f.type = 'phone'
          AND sd.value_text IS NOT NULL
          AND sd.value_text != ''
      `);

      let hasProfile = false;

      if (emails.length > 0) {
        console.log(`  📧 Email: ${emails[0].email}`);

        // Check if profile exists
        const [profile] = await sequelize.query(`
          SELECT id, primary_email, primary_phone
          FROM unified_user_profiles
          WHERE LOWER(primary_email) = LOWER('${emails[0].email}')
        `);

        if (profile.length > 0) {
          console.log(`  ✅ Profile exists: ${profile[0].id}`);
          hasProfile = true;
        } else {
          console.log(`  ❌ Profile NOT found for this email!`);
          missingProfiles.push({
            submissionId: sub.id,
            email: emails[0].email,
            phone: phones.length > 0 ? phones[0].phone : null
          });
        }
      } else if (phones.length > 0) {
        console.log(`  📱 Phone: ${phones[0].phone}`);

        // Check if profile exists
        const [profile] = await sequelize.query(`
          SELECT id, primary_email, primary_phone
          FROM unified_user_profiles
          WHERE primary_phone = '${phones[0].phone}'
        `);

        if (profile.length > 0) {
          console.log(`  ✅ Profile exists: ${profile[0].id}`);
          hasProfile = true;
        } else {
          console.log(`  ❌ Profile NOT found for this phone!`);
          missingProfiles.push({
            submissionId: sub.id,
            email: null,
            phone: phones[0].phone
          });
        }
      } else {
        console.log(`  ⚠️  No email or phone in this submission`);
      }

      console.log('');
    }

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log('===========');
    console.log(`Total submissions checked: ${submissions.length}`);
    console.log(`Missing profiles: ${missingProfiles.length}`);
    console.log('');

    if (missingProfiles.length > 0) {
      console.log('❌ MISSING PROFILES:\n');
      missingProfiles.forEach((m, idx) => {
        console.log(`${idx + 1}. Submission: ${m.submissionId}`);
        if (m.email) console.log(`   Email: ${m.email}`);
        if (m.phone) console.log(`   Phone: ${m.phone}`);
        console.log('');
      });

      console.log('⚠️  ACTION REQUIRED: Run rebuild script to create missing profiles');
      console.log('   Command: node backend/scripts/rebuild-profiles-from-submissions.js');
    } else {
      console.log('✅ All submissions have profiles!');
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

checkNewSubmissions();
