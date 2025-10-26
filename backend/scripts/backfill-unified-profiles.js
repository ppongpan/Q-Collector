/**
 * Backfill Script: Populate unified_user_profiles from existing submissions
 *
 * This script analyzes existing submissions and creates unified user profiles
 * by grouping submissions with matching email/phone numbers.
 *
 * Run: node backend/scripts/backfill-unified-profiles.js
 */

const { sequelize, Sequelize } = require('../config/database.config');
const { v4: uuidv4 } = require('uuid');

async function backfillUnifiedProfiles() {
  console.log('🚀 Starting unified_user_profiles backfill process...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Step 1: Extract all email and phone data from submissions
    console.log('📊 Step 1: Extracting email and phone data from submissions...');

    const [submissionData] = await sequelize.query(`
      SELECT
        s.id as submission_id,
        s.form_id,
        s.submitted_by as user_id,
        s.submitted_at,
        s.ip_address,
        MAX(CASE WHEN f.type = 'email' THEN sd.value_text END) as email,
        MAX(CASE WHEN f.type = 'phone' THEN sd.value_text END) as phone,
        MAX(CASE WHEN f.type = 'short_answer' AND LOWER(f.title) LIKE '%ชื่อ%' THEN sd.value_text END) as name_field,
        MAX(CASE WHEN f.type = 'short_answer' AND LOWER(f.title) LIKE '%name%' THEN sd.value_text END) as name_field_en
      FROM submissions s
      LEFT JOIN submission_data sd ON s.id = sd.submission_id
      LEFT JOIN fields f ON sd.field_id = f.id
      GROUP BY s.id, s.form_id, s.submitted_by, s.submitted_at, s.ip_address
      HAVING
        MAX(CASE WHEN f.type = 'email' THEN sd.value_text END) IS NOT NULL
        OR MAX(CASE WHEN f.type = 'phone' THEN sd.value_text END) IS NOT NULL
      ORDER BY s.submitted_at ASC
    `);

    console.log(`   Found ${submissionData.length} submissions with email/phone data\n`);

    if (submissionData.length === 0) {
      console.log('⚠️  No submissions found with email or phone fields');
      console.log('   The dashboard will be empty until new submissions are created');
      await sequelize.close();
      return;
    }

    // Step 2: Group submissions by email/phone
    console.log('📊 Step 2: Grouping submissions by email/phone...');

    const profilesMap = new Map();

    submissionData.forEach(row => {
      const email = row.email?.trim().toLowerCase();
      const phone = row.phone?.trim();
      const name = row.name_field || row.name_field_en;

      // Create a key based on email or phone
      let profileKey = email || phone;

      if (!profileKey) return; // Skip if no email or phone

      if (!profilesMap.has(profileKey)) {
        profilesMap.set(profileKey, {
          emails: new Set(),
          phones: new Set(),
          names: new Set(),
          submissionIds: [],
          firstSubmission: row.submitted_at,
          lastSubmission: row.submitted_at,
          userId: row.user_id
        });
      }

      const profile = profilesMap.get(profileKey);

      if (email) profile.emails.add(email);
      if (phone) profile.phones.add(phone);
      if (name) profile.names.add(name);
      profile.submissionIds.push(row.submission_id);

      // Update date ranges
      if (new Date(row.submitted_at) < new Date(profile.firstSubmission)) {
        profile.firstSubmission = row.submitted_at;
      }
      if (new Date(row.submitted_at) > new Date(profile.lastSubmission)) {
        profile.lastSubmission = row.submitted_at;
      }
    });

    console.log(`   Created ${profilesMap.size} unique profiles\n`);

    // Step 3: Insert unified_user_profiles
    console.log('📊 Step 3: Inserting unified_user_profiles...');

    const transaction = await sequelize.transaction();
    let insertedCount = 0;
    let errorCount = 0;

    try {
      for (const [key, data] of profilesMap.entries()) {
        const emailsArray = Array.from(data.emails);
        const phonesArray = Array.from(data.phones);
        const namesArray = Array.from(data.names);

        try {
          await sequelize.query(`
            INSERT INTO unified_user_profiles (
              id,
              user_id,
              primary_email,
              primary_phone,
              full_name,
              linked_emails,
              linked_phones,
              linked_names,
              submission_ids,
              total_submissions,
              first_submission_date,
              last_submission_date,
              match_confidence,
              created_at,
              updated_at
            ) VALUES (
              :id,
              :userId,
              :primaryEmail,
              :primaryPhone,
              :fullName,
              :linkedEmails::jsonb,
              :linkedPhones::jsonb,
              :linkedNames::jsonb,
              :submissionIds::jsonb,
              :totalSubmissions,
              :firstSubmissionDate,
              :lastSubmissionDate,
              :matchConfidence,
              NOW(),
              NOW()
            )
          `, {
            replacements: {
              id: uuidv4(),
              userId: data.userId,
              primaryEmail: emailsArray[0] || null,
              primaryPhone: phonesArray[0] || null,
              fullName: namesArray[0] || null,
              linkedEmails: JSON.stringify(emailsArray),
              linkedPhones: JSON.stringify(phonesArray),
              linkedNames: JSON.stringify(namesArray),
              submissionIds: JSON.stringify(data.submissionIds),
              totalSubmissions: data.submissionIds.length,
              firstSubmissionDate: data.firstSubmission,
              lastSubmissionDate: data.lastSubmission,
              matchConfidence: 100 // High confidence for exact matches
            },
            transaction
          });

          insertedCount++;
        } catch (error) {
          console.error(`   ❌ Error inserting profile for ${key}:`, error.message);
          errorCount++;
        }
      }

      await transaction.commit();
      console.log(`   ✅ Inserted ${insertedCount} unified profiles`);

      if (errorCount > 0) {
        console.log(`   ⚠️  ${errorCount} profiles failed to insert`);
      }

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    // Step 4: Verify results
    console.log('\n📊 Step 4: Verifying results...');

    const [countResult] = await sequelize.query(
      'SELECT COUNT(*) as count FROM unified_user_profiles'
    );

    console.log(`   Total unified_user_profiles: ${countResult[0].count}`);

    // Show sample profiles
    const [sampleProfiles] = await sequelize.query(`
      SELECT
        primary_email,
        primary_phone,
        full_name,
        total_submissions,
        first_submission_date,
        last_submission_date
      FROM unified_user_profiles
      ORDER BY total_submissions DESC
      LIMIT 5
    `);

    console.log('\n📋 Top 5 profiles by submission count:');
    sampleProfiles.forEach((profile, index) => {
      console.log(`   ${index + 1}. ${profile.full_name || 'No name'}`);
      console.log(`      Email: ${profile.primary_email || 'N/A'}`);
      console.log(`      Phone: ${profile.primary_phone || 'N/A'}`);
      console.log(`      Submissions: ${profile.total_submissions}`);
      console.log(`      Period: ${new Date(profile.first_submission_date).toLocaleDateString()} - ${new Date(profile.last_submission_date).toLocaleDateString()}`);
      console.log('');
    });

    console.log('✅ Backfill process completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Refresh the Personal Data Management Dashboard');
    console.log('   2. Verify that profiles and stats are now displayed');
    console.log('   3. Check the "รายการเจ้าของข้อมูล" (Data Owners) section');
    console.log('   4. Review Recent Activity metrics\n');

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Backfill process failed:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

// Run backfill
backfillUnifiedProfiles();
