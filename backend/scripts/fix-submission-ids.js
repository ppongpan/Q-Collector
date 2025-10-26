/**
 * Fix submission_ids for unified_user_profiles
 * Run: node backend/scripts/fix-submission-ids.js
 */

const { sequelize } = require('../config/database.config');

async function fixSubmissionIds() {
  console.log('🔧 Fixing submission_ids for unified_user_profiles...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Update submission_ids for all profiles
    console.log('📊 Step 1: Updating submission_ids...');

    const [result] = await sequelize.query(`
      UPDATE unified_user_profiles
      SET submission_ids = subquery.ids
      FROM (
        SELECT
          up.id as profile_id,
          COALESCE(
            json_agg(DISTINCT s.id ORDER BY s.id),
            '[]'::json
          )::jsonb as ids
        FROM unified_user_profiles up
        LEFT JOIN submissions s ON s.id IN (
          SELECT DISTINCT s2.id
          FROM submissions s2
          INNER JOIN submission_data sd ON s2.id = sd.submission_id
          INNER JOIN fields f ON sd.field_id = f.id
          WHERE
            (f.type = 'email' AND LOWER(sd.value_text) = LOWER(up.primary_email))
            OR (f.type = 'phone' AND sd.value_text = up.primary_phone)
        )
        GROUP BY up.id
      ) AS subquery
      WHERE unified_user_profiles.id = subquery.profile_id
    `);

    console.log(`   ✅ Updated ${result[1]} profiles\n`);

    // Verify results
    console.log('📊 Step 2: Verifying results...\n');

    const [profiles] = await sequelize.query(`
      SELECT
        primary_email,
        primary_phone,
        full_name,
        jsonb_array_length(submission_ids) as submission_count,
        total_submissions
      FROM unified_user_profiles
      WHERE primary_email LIKE '%example.com%'
      ORDER BY primary_email
    `);

    console.log('Profile Details:');
    console.log('================\n');

    profiles.forEach(p => {
      console.log(`📧 ${p.primary_email}`);
      console.log(`   Name: ${p.full_name}`);
      console.log(`   Phone: ${p.primary_phone}`);
      console.log(`   Submission IDs count: ${p.submission_count}`);
      console.log(`   Total submissions: ${p.total_submissions}`);
      console.log('');
    });

    await sequelize.close();
    console.log('✅ Done!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

fixSubmissionIds();
