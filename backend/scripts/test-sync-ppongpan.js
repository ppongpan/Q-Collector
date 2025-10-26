/**
 * Test Auto-Sync for Ppongpan's Encrypted Submission
 * Manually trigger sync for submission ID: 13c44c76-ebf3-4ff3-a8f9-81d84f4ef29f
 *
 * Run: node backend/scripts/test-sync-ppongpan.js
 *
 * Expected result:
 * - Profile created with email: ppongpan@hotmail.com
 * - Phone: 0987123409
 * - Full name: พงษ์พันธุ์ พีรวณิชกุล
 *
 * @version v0.8.5-dev
 * @date 2025-10-25
 */

const { sequelize } = require('../config/database.config');
const UnifiedUserProfileService = require('../services/UnifiedUserProfileService');

async function testSyncPpongpan() {
  console.log('🧪 Testing auto-sync for ppongpan submission...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    const submissionId = '13c44c76-ebf3-4ff3-a8f9-81d84f4ef29f';

    console.log(`🔄 Syncing submission: ${submissionId}\n`);

    // Call the sync method
    const result = await UnifiedUserProfileService.syncSubmission(submissionId);

    console.log('\n📋 SYNC RESULT:');
    console.log('================');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ SUCCESS! Profile synced');

      // Verify the profile was created
      const [profiles] = await sequelize.query(`
        SELECT
          id,
          primary_email,
          primary_phone,
          full_name,
          jsonb_array_length(submission_ids) as submission_count
        FROM unified_user_profiles
        WHERE LOWER(primary_email) = LOWER('ppongpan@hotmail.com')
           OR primary_phone = '0987123409'
      `);

      if (profiles.length > 0) {
        console.log('\n👤 PROFILE DETAILS:');
        console.log('==================');
        const p = profiles[0];
        console.log(`Profile ID: ${p.id}`);
        console.log(`Email: ${p.primary_email}`);
        console.log(`Phone: ${p.primary_phone}`);
        console.log(`Name: ${p.full_name}`);
        console.log(`Submissions: ${p.submission_count}`);
      } else {
        console.log('\n❌ ERROR: Profile not found after sync!');
      }
    } else {
      console.log('\n❌ SYNC FAILED:', result.error);
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

testSyncPpongpan();
