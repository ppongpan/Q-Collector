/**
 * Update Test User Role Script
 * Updates pongpanp user to super_admin for E2E testing
 *
 * @version 0.7.2
 * @since 2025-10-04
 */

const { User } = require('../models');
const logger = require('../utils/logger.util');

async function updateTestUserRole() {
  try {
    console.log('🔧 Updating test user role...\n');

    // Find user
    const user = await User.findOne({
      where: { username: 'pongpanp' }
    });

    if (!user) {
      console.log('❌ User "pongpanp" not found');
      process.exit(1);
    }

    console.log('📋 Current user info:');
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log('');

    // Update to super_admin if not already
    if (user.role === 'super_admin') {
      console.log('✅ User is already super_admin');
    } else {
      const oldRole = user.role;
      user.role = 'super_admin';
      await user.save();
      console.log(`✅ User role updated: ${oldRole} → super_admin`);
    }

    console.log('\n🎉 Test user ready for E2E testing!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error updating user role:', error.message);
    logger.error('Update test user role failed:', error);
    process.exit(1);
  }
}

// Run the script
updateTestUserRole();
