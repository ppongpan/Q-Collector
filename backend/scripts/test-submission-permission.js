/**
 * Test Super Admin Submission Permission
 *
 * Tests if super_admin can submit to all forms
 */

const { sequelize, User, Form } = require('../models');

async function testSubmissionPermission() {
  try {
    console.log('🔍 Testing Super Admin Submission Permission...\n');

    // Find super admin user
    const superAdmin = await User.findOne({
      where: { role: 'super_admin' }
    });

    if (!superAdmin) {
      console.error('❌ No super_admin user found in database');
      process.exit(1);
    }

    console.log('✅ Found super_admin user:');
    console.log('   - ID:', superAdmin.id);
    console.log('   - Username:', superAdmin.username);
    console.log('   - Role:', superAdmin.role);
    console.log('');

    // Get all active forms
    const forms = await Form.findAll({
      where: { is_active: true },
      limit: 5
    });

    console.log(`📋 Testing ${forms.length} active forms...\n`);

    for (const form of forms) {
      console.log(`Form: "${form.title}" (ID: ${form.id})`);
      console.log(`  - roles_allowed:`, form.roles_allowed);
      console.log(`  - created_by:`, form.created_by);

      // Test canAccessByRole
      const canAccess = form.canAccessByRole(superAdmin.role);
      console.log(`  - canAccessByRole('super_admin'):`, canAccess);

      // Test permission logic
      const isCreator = form.created_by === superAdmin.id;
      const hasPermission = canAccess || isCreator;

      console.log(`  - Is creator:`, isCreator);
      console.log(`  - Final permission:`, hasPermission ? '✅ ALLOWED' : '❌ DENIED');
      console.log('');

      if (!hasPermission) {
        console.error(`❌ PERMISSION ERROR: super_admin cannot submit to form "${form.title}"`);
        console.error(`   This should not happen! super_admin should have access to all forms.`);
      }
    }

    console.log('\n✅ Permission test completed');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run test
testSubmissionPermission()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
