/**
 * Test Profile Detail API Response
 * Check if uniqueForms and PII data are returned correctly
 *
 * Usage: node backend/scripts/test-profile-detail-api.js
 */

const { UnifiedUserProfile, PersonalDataField } = require('../models');
const UnifiedUserProfileService = require('../services/UnifiedUserProfileService');
const logger = require('../utils/logger.util');

async function testProfileDetailAPI() {
  try {
    console.log('\n🔍 Testing Profile Detail API Response...\n');

    // 1. Get first profile
    const profile = await UnifiedUserProfile.findOne({
      order: [['last_submission_date', 'DESC']]
    });

    if (!profile) {
      console.log('❌ No profiles found in database');
      process.exit(1);
    }

    console.log(`✅ Found profile: ${profile.id}`);
    console.log(`   Email: ${profile.primary_email}`);
    console.log(`   Name: ${profile.full_name}`);
    console.log(`   Submissions: ${profile.total_submissions}`);

    // 2. Get profile detail
    console.log('\n📡 Fetching profile detail...');
    const profileDetail = await UnifiedUserProfileService.getProfileDetail(profile.id);

    // 3. Check uniqueForms
    console.log('\n📊 Checking uniqueForms:');
    console.log(`   Total unique forms: ${profileDetail.uniqueForms?.length || 0}`);

    if (profileDetail.uniqueForms && profileDetail.uniqueForms.length > 0) {
      profileDetail.uniqueForms.forEach((form, index) => {
        console.log(`\n   Form #${index + 1}: ${form.formTitle}`);
        console.log(`      Form ID: ${form.formId}`);
        console.log(`      Submission Count: ${form.submissionCount}`);
        console.log(`      Latest Submission: ${form.latestSubmission?.submitted_at || 'N/A'}`);

        // Check PII fields
        const latestSub = form.latestSubmission;
        if (latestSub) {
          console.log(`      PII Field Count: ${latestSub.piiFieldCount || 0}`);
          if (latestSub.piiFieldValues && latestSub.piiFieldValues.length > 0) {
            console.log(`      PII Fields:`);
            latestSub.piiFieldValues.forEach(pii => {
              console.log(`         - ${pii.fieldTitle} (${pii.category}): ${pii.value || 'N/A'}`);
            });
          } else {
            console.log(`      ⚠️  No PII field values found`);
          }
        }

        // Check consent items
        console.log(`      Consent Items: ${form.consentItems?.length || 0}`);
        if (form.consentItems && form.consentItems.length > 0) {
          form.consentItems.forEach(ci => {
            console.log(`         - ${ci.consentItemTitle}: ${ci.timesGiven}/${ci.timesTotal}`);
          });
        }
      });
    } else {
      console.log('   ❌ No unique forms found');
    }

    // 4. Check if PII fields are classified in database
    console.log('\n🔍 Checking PII fields classification in database...');
    const piiFields = await PersonalDataField.findAll({
      limit: 10
    });

    console.log(`   Total PII fields classified: ${piiFields.length}`);
    if (piiFields.length === 0) {
      console.log('   ⚠️  WARNING: No PII fields classified in database!');
      console.log('   This means the "ฟอร์ม & ข้อมูล" tab will be empty.');
      console.log('   You need to classify PII fields first.');
    } else {
      console.log('   Sample PII fields:');
      piiFields.slice(0, 5).forEach(pii => {
        console.log(`      - Form: ${pii.form_id}, Field: ${pii.field_id}, Category: ${pii.category}`);
      });
    }

    // 5. Summary
    console.log('\n📋 Summary:');
    console.log(`   ✅ Profile Detail API Response: Working`);
    console.log(`   ${profileDetail.uniqueForms?.length > 0 ? '✅' : '❌'} uniqueForms: ${profileDetail.uniqueForms?.length || 0}`);
    console.log(`   ${piiFields.length > 0 ? '✅' : '⚠️'} PII Fields Classified: ${piiFields.length}`);

    if (piiFields.length === 0) {
      console.log('\n⚠️  SOLUTION: Run PII classification script first');
      console.log('   The backend is working correctly, but no PII fields are classified.');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testProfileDetailAPI();
