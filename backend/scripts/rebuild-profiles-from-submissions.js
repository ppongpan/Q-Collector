/**
 * Rebuild Unified User Profiles from Actual Submission Data
 * Deletes old profiles with incorrect emails and creates new ones from actual submissions
 *
 * Run: node backend/scripts/rebuild-profiles-from-submissions.js
 *
 * @version v0.8.5-dev
 * @date 2025-10-25
 */

const { sequelize } = require('../config/database.config');

async function rebuildProfiles() {
  console.log('🔄 Rebuilding unified_user_profiles from actual submission data...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Step 1: Delete all existing profiles (they have wrong emails)
    console.log('🗑️  Step 1: Deleting old profiles with incorrect emails...');
    const [deleteResult] = await sequelize.query('DELETE FROM unified_user_profiles');
    console.log(`   Deleted ${deleteResult.rowCount} profiles\n`);

    // Step 2: Get all unique emails from submissions
    console.log('📊 Step 2: Creating profiles from actual submission emails...\n');

    const [emails] = await sequelize.query(`
      SELECT DISTINCT LOWER(sd.value_text) as email
      FROM submissions s
      INNER JOIN submission_data sd ON s.id = sd.submission_id
      INNER JOIN fields f ON sd.field_id = f.id
      WHERE f.type = 'email' AND sd.value_text IS NOT NULL AND sd.value_text != ''
    `);

    console.log(`Found ${emails.length} unique email addresses\n`);

    for (const emailRow of emails) {
      const email = emailRow.email;

      // Get all submission_ids for this email
      const [submissions] = await sequelize.query(`
        SELECT DISTINCT s.id, s.form_id, s.submitted_at
        FROM submissions s
        INNER JOIN submission_data sd ON s.id = sd.submission_id
        INNER JOIN fields f ON sd.field_id = f.id
        WHERE f.type = 'email' AND LOWER(sd.value_text) = '${email}'
        ORDER BY s.submitted_at
      `);

      const submissionIds = submissions.map(s => s.id);
      const formIds = [...new Set(submissions.map(s => s.form_id))]; // unique form_ids

      // Try to find full name from first submission
      const [nameData] = await sequelize.query(`
        SELECT sd.value_text as name
        FROM submission_data sd
        INNER JOIN fields f ON sd.field_id = f.id
        WHERE sd.submission_id = '${submissions[0].id}'
          AND f.type = 'short_answer'
          AND (f.title LIKE '%ชื่อ%' OR f.title LIKE '%name%')
        LIMIT 1
      `);

      const fullName = nameData.length > 0 ? nameData[0].name : 'ไม่ระบุชื่อ';

      // Get all phone numbers from these submissions
      const phoneList = [];
      for (const sub of submissions) {
        const [phoneData] = await sequelize.query(`
          SELECT DISTINCT sd.value_text as phone
          FROM submission_data sd
          INNER JOIN fields f ON sd.field_id = f.id
          WHERE sd.submission_id = '${sub.id}'
            AND f.type = 'phone'
            AND sd.value_text IS NOT NULL
            AND sd.value_text != ''
        `);
        phoneData.forEach(p => {
          if (!phoneList.includes(p.phone)) {
            phoneList.push(p.phone);
          }
        });
      }

      const primaryPhone = phoneList.length > 0 ? phoneList[0] : null;

      // Convert dates to ISO string format for PostgreSQL
      const firstSubmissionDate = new Date(submissions[0].submitted_at).toISOString();
      const lastSubmissionDate = new Date(submissions[submissions.length - 1].submitted_at).toISOString();

      // Create profile (with phone data)
      await sequelize.query(`
        INSERT INTO unified_user_profiles (
          id,
          primary_email,
          primary_phone,
          full_name,
          submission_ids,
          form_ids,
          linked_emails,
          linked_phones,
          linked_names,
          total_submissions,
          first_submission_date,
          last_submission_date,
          match_confidence,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          '${email}',
          ${primaryPhone ? `'${primaryPhone}'` : 'NULL'},
          '${fullName}',
          '${JSON.stringify(submissionIds)}'::jsonb,
          '${JSON.stringify(formIds)}'::jsonb,
          '${JSON.stringify([email])}'::jsonb,
          '${JSON.stringify(phoneList)}'::jsonb,
          '${JSON.stringify([fullName])}'::jsonb,
          ${submissions.length},
          '${firstSubmissionDate}',
          '${lastSubmissionDate}',
          1.0,
          NOW(),
          NOW()
        )
      `);

      console.log(`✅ Created profile for ${email}: ${fullName}`);
      console.log(`   - ${formIds.length} forms, ${submissions.length} submissions`);
    }

    console.log(`\n✅ Successfully created ${emails.length} profiles from emails!\n`);

    // Step 3: Create profiles for phone numbers (only if no email exists)
    console.log('📱 Step 3: Creating profiles from phone numbers (no email)...\n');

    const [phones] = await sequelize.query(`
      SELECT DISTINCT sd.value_text as phone
      FROM submissions s
      INNER JOIN submission_data sd ON s.id = sd.submission_id
      INNER JOIN fields f ON sd.field_id = f.id
      WHERE f.type = 'phone' AND sd.value_text IS NOT NULL AND sd.value_text != ''
    `);

    console.log(`Found ${phones.length} unique phone numbers\n`);

    let phoneProfileCount = 0;

    for (const phoneRow of phones) {
      const phone = phoneRow.phone;

      // Get submissions for this phone
      const [submissions] = await sequelize.query(`
        SELECT DISTINCT s.id, s.form_id, s.submitted_at
        FROM submissions s
        INNER JOIN submission_data sd ON s.id = sd.submission_id
        INNER JOIN fields f ON sd.field_id = f.id
        WHERE f.type = 'phone' AND sd.value_text = '${phone}'
        ORDER BY s.submitted_at
      `);

      // Check if any of these submissions have email fields
      // If they do, skip (already created profile from email)
      let hasEmail = false;
      for (const sub of submissions) {
        const [emailCheck] = await sequelize.query(`
          SELECT COUNT(*) as count
          FROM submission_data sd
          INNER JOIN fields f ON sd.field_id = f.id
          WHERE sd.submission_id = '${sub.id}'
            AND f.type = 'email'
            AND sd.value_text IS NOT NULL
            AND sd.value_text != ''
        `);
        if (emailCheck[0].count > 0) {
          hasEmail = true;
          break;
        }
      }

      if (hasEmail) {
        console.log(`⏭️  Skipping ${phone} (already has profile with email)`);
        continue;
      }

      const submissionIds = submissions.map(s => s.id);
      const formIds = [...new Set(submissions.map(s => s.form_id))];

      // Try to find full name from first submission
      const [nameData] = await sequelize.query(`
        SELECT sd.value_text as name
        FROM submission_data sd
        INNER JOIN fields f ON sd.field_id = f.id
        WHERE sd.submission_id = '${submissions[0].id}'
          AND f.type = 'short_answer'
          AND (f.title LIKE '%ชื่อ%' OR f.title LIKE '%name%')
        LIMIT 1
      `);

      const fullName = nameData.length > 0 ? nameData[0].name : 'ไม่ระบุชื่อ';

      const firstSubmissionDate = new Date(submissions[0].submitted_at).toISOString();
      const lastSubmissionDate = new Date(submissions[submissions.length - 1].submitted_at).toISOString();

      // Create profile (with phone as primary, no email)
      await sequelize.query(`
        INSERT INTO unified_user_profiles (
          id,
          primary_phone,
          full_name,
          submission_ids,
          form_ids,
          linked_emails,
          linked_phones,
          linked_names,
          total_submissions,
          first_submission_date,
          last_submission_date,
          match_confidence,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          '${phone}',
          '${fullName}',
          '${JSON.stringify(submissionIds)}'::jsonb,
          '${JSON.stringify(formIds)}'::jsonb,
          '[]'::jsonb,
          '${JSON.stringify([phone])}'::jsonb,
          '${JSON.stringify([fullName])}'::jsonb,
          ${submissions.length},
          '${firstSubmissionDate}',
          '${lastSubmissionDate}',
          1.0,
          NOW(),
          NOW()
        )
      `);

      console.log(`✅ Created profile for ${phone}: ${fullName}`);
      console.log(`   - ${formIds.length} forms, ${submissions.length} submissions`);
      phoneProfileCount++;
    }

    console.log(`\n✅ Successfully created ${phoneProfileCount} profiles from phone numbers!\n`);

    // Verify
    const [verifyResult] = await sequelize.query(`
      SELECT
        primary_email,
        primary_phone,
        full_name,
        jsonb_array_length(form_ids) as form_count,
        jsonb_array_length(submission_ids) as submission_count
      FROM unified_user_profiles
      ORDER BY created_at
    `);

    console.log('Profile Summary:');
    console.log('===============\n');
    verifyResult.forEach(p => {
      console.log(`👤 ${p.primary_email || p.primary_phone}`);
      console.log(`   Name: ${p.full_name}`);
      console.log(`   Forms: ${p.form_count} ฟอร์ม`);
      console.log(`   Submissions: ${p.submission_count} submissions`);
      console.log('');
    });

    await sequelize.close();
    console.log('✅ Rebuild completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

rebuildProfiles();
