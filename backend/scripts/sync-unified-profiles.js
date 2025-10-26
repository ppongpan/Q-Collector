/**
 * Sync Unified User Profiles Script
 * Updates form_ids and submission_ids for all profiles
 * Run: node backend/scripts/sync-unified-profiles.js
 *
 * @version v0.8.5-dev
 * @date 2025-10-25
 */

const { sequelize } = require('../config/database.config');

async function syncUnifiedProfiles() {
  console.log('🔄 Syncing unified_user_profiles...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Step 1: Update submission_ids
    console.log('📊 Step 1: Updating submission_ids...');
    const [result1] = await sequelize.query(`
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
    console.log(`   ✅ Updated ${result1[1]} profiles\n`);

    // Step 2: Update form_ids
    console.log('📊 Step 2: Updating form_ids...');
    const [result2] = await sequelize.query(`
      UPDATE unified_user_profiles
      SET form_ids = subquery.ids
      FROM (
        SELECT
          up.id as profile_id,
          COALESCE(
            jsonb_agg(DISTINCT s.form_id),
            '[]'::jsonb
          ) as ids
        FROM unified_user_profiles up
        LEFT JOIN submissions s ON s.id = ANY(
          SELECT jsonb_array_elements_text(up.submission_ids)::uuid
        )
        GROUP BY up.id
      ) AS subquery
      WHERE unified_user_profiles.id = subquery.profile_id
    `);
    console.log(`   ✅ Updated ${result2[1]} profiles\n`);

    // Verify results
    console.log('📊 Step 3: Verifying results...\n');
    const [profiles] = await sequelize.query(`
      SELECT
        primary_email,
        full_name,
        jsonb_array_length(form_ids) as form_count,
        jsonb_array_length(submission_ids) as submission_count,
        total_submissions
      FROM unified_user_profiles
      ORDER BY primary_email
    `);

    console.log('Profile Summary:');
    console.log('===============\n');
    profiles.forEach(p => {
      console.log(`📧 ${p.primary_email}`);
      console.log(`   Name: ${p.full_name}`);
      console.log(`   Forms: ${p.form_count} ฟอร์ม`);
      console.log(`   Submissions: ${p.submission_count} submissions`);
      console.log('');
    });

    await sequelize.close();
    console.log('✅ Sync completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

syncUnifiedProfiles();
