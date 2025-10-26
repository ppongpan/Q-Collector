/**
 * Check All Data Owners - Find Missing Profiles
 * Compares submissions with unified_user_profiles to find missing data
 *
 * Run: node backend/scripts/check-all-data-owners.js
 *
 * @version v0.8.5-dev
 * @date 2025-10-25
 */

const { sequelize } = require('../config/database.config');

async function checkAllDataOwners() {
  console.log('🔍 Checking all data owners...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Step 1: Get ALL unique emails from submissions
    console.log('📊 Step 1: Checking ALL emails in submissions...\n');
    const [emails] = await sequelize.query(`
      SELECT
        LOWER(sd.value_text) as email,
        COUNT(DISTINCT s.id) as submission_count,
        COUNT(DISTINCT s.form_id) as form_count,
        MIN(s.submitted_at) as first_submission,
        MAX(s.submitted_at) as last_submission
      FROM submissions s
      INNER JOIN submission_data sd ON s.id = sd.submission_id
      INNER JOIN fields f ON sd.field_id = f.id
      WHERE f.type = 'email' AND sd.value_text IS NOT NULL AND sd.value_text != ''
      GROUP BY LOWER(sd.value_text)
      ORDER BY submission_count DESC
    `);

    console.log(`Found ${emails.length} unique email addresses in submissions:\n`);
    emails.forEach((e, idx) => {
      console.log(`${idx + 1}. ${e.email}`);
      console.log(`   Submissions: ${e.submission_count}, Forms: ${e.form_count}`);
      console.log(`   First: ${new Date(e.first_submission).toLocaleDateString('th-TH')}`);
      console.log(`   Last: ${new Date(e.last_submission).toLocaleDateString('th-TH')}`);
      console.log('');
    });

    // Step 2: Get ALL phones from submissions
    console.log('📱 Step 2: Checking ALL phones in submissions...\n');
    const [phones] = await sequelize.query(`
      SELECT
        sd.value_text as phone,
        COUNT(DISTINCT s.id) as submission_count,
        COUNT(DISTINCT s.form_id) as form_count
      FROM submissions s
      INNER JOIN submission_data sd ON s.id = sd.submission_id
      INNER JOIN fields f ON sd.field_id = f.id
      WHERE f.type = 'phone' AND sd.value_text IS NOT NULL AND sd.value_text != ''
      GROUP BY sd.value_text
      ORDER BY submission_count DESC
    `);

    console.log(`Found ${phones.length} unique phone numbers in submissions:\n`);
    phones.forEach((p, idx) => {
      console.log(`${idx + 1}. ${p.phone}`);
      console.log(`   Submissions: ${p.submission_count}, Forms: ${p.form_count}`);
      console.log('');
    });

    // Step 3: Get ALL profiles in unified_user_profiles
    console.log('👤 Step 3: Checking ALL profiles in unified_user_profiles...\n');
    const [profiles] = await sequelize.query(`
      SELECT
        primary_email,
        primary_phone,
        full_name,
        jsonb_array_length(form_ids) as form_count,
        jsonb_array_length(submission_ids) as submission_count,
        created_at
      FROM unified_user_profiles
      ORDER BY created_at DESC
    `);

    console.log(`Found ${profiles.length} profiles in unified_user_profiles:\n`);
    profiles.forEach((p, idx) => {
      console.log(`${idx + 1}. ${p.primary_email || p.primary_phone}`);
      console.log(`   Name: ${p.full_name}`);
      console.log(`   Forms: ${p.form_count}, Submissions: ${p.submission_count}`);
      console.log(`   Created: ${new Date(p.created_at).toLocaleString('th-TH')}`);
      console.log('');
    });

    // Step 4: Find MISSING emails (in submissions but NOT in profiles)
    console.log('⚠️  Step 4: Finding MISSING data owners...\n');
    const [missingEmails] = await sequelize.query(`
      SELECT DISTINCT LOWER(sd.value_text) as email
      FROM submissions s
      INNER JOIN submission_data sd ON s.id = sd.submission_id
      INNER JOIN fields f ON sd.field_id = f.id
      WHERE f.type = 'email'
        AND sd.value_text IS NOT NULL
        AND sd.value_text != ''
        AND LOWER(sd.value_text) NOT IN (
          SELECT LOWER(primary_email) FROM unified_user_profiles WHERE primary_email IS NOT NULL
        )
    `);

    if (missingEmails.length > 0) {
      console.log(`❌ MISSING ${missingEmails.length} email addresses:\n`);
      missingEmails.forEach((m, idx) => {
        console.log(`${idx + 1}. ${m.email}`);
      });
      console.log('');
    } else {
      console.log('✅ All emails are in unified_user_profiles\n');
    }

    // Step 5: Find MISSING phones (in submissions but NOT in profiles)
    const [missingPhones] = await sequelize.query(`
      SELECT DISTINCT sd.value_text as phone
      FROM submissions s
      INNER JOIN submission_data sd ON s.id = sd.submission_id
      INNER JOIN fields f ON sd.field_id = f.id
      WHERE f.type = 'phone'
        AND sd.value_text IS NOT NULL
        AND sd.value_text != ''
        AND sd.value_text NOT IN (
          SELECT primary_phone FROM unified_user_profiles WHERE primary_phone IS NOT NULL
        )
    `);

    if (missingPhones.length > 0) {
      console.log(`❌ MISSING ${missingPhones.length} phone numbers:\n`);
      missingPhones.forEach((m, idx) => {
        console.log(`${idx + 1}. ${m.phone}`);
      });
      console.log('');
    } else {
      console.log('✅ All phones are in unified_user_profiles\n');
    }

    // Summary
    console.log('📊 SUMMARY:');
    console.log('===========');
    console.log(`Unique emails in submissions: ${emails.length}`);
    console.log(`Unique phones in submissions: ${phones.length}`);
    console.log(`Total unique data owners expected: ${emails.length + phones.length}`);
    console.log(`Profiles in unified_user_profiles: ${profiles.length}`);
    console.log(`Missing emails: ${missingEmails.length}`);
    console.log(`Missing phones: ${missingPhones.length}`);
    console.log('');

    if (missingEmails.length > 0 || missingPhones.length > 0) {
      console.log('⚠️  ACTION REQUIRED: Run rebuild script to sync all data');
      console.log('   Command: node backend/scripts/rebuild-profiles-from-submissions.js');
    } else {
      console.log('✅ All data owners are synced!');
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

checkAllDataOwners();
