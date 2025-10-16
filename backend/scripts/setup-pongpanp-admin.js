/**
 * Setup pongpanp Account as Super Admin
 *
 * This script:
 * 1. Updates pongpanp to super_admin role
 * 2. Enables requires_2fa_setup flag
 * 3. Shows current status before and after
 */

const { User } = require('../models');
const logger = require('../utils/logger.util');

async function setupPongpanpAdmin() {
  try {
    console.log('🔍 Setting up pongpanp as Super Admin...\n');

    // Find user
    const user = await User.findOne({ where: { username: 'pongpanp' } });

    if (!user) {
      console.error('❌ User pongpanp not found!');
      process.exit(1);
    }

    // Show current status
    console.log('📊 BEFORE UPDATE:');
    console.log('─────────────────────────────────────');
    console.log(`Username:          ${user.username}`);
    console.log(`Email:             ${user.email}`);
    console.log(`Role:              ${user.role}`);
    console.log(`Active:            ${user.is_active}`);
    console.log(`2FA Enabled:       ${user.twoFactorEnabled}`);
    console.log(`Requires 2FA Setup: ${user.requires_2fa_setup}`);
    console.log('─────────────────────────────────────\n');

    // Update user
    user.role = 'super_admin';
    user.requires_2fa_setup = true;
    user.is_active = true;
    user.twoFactorEnabled = false; // Reset 2FA to force fresh setup
    user.twoFactorSecret = null;

    await user.save();

    // Show updated status
    const updatedUser = await User.findByPk(user.id);
    console.log('✅ UPDATE SUCCESSFUL!');
    console.log('─────────────────────────────────────');
    console.log(`Username:          ${updatedUser.username}`);
    console.log(`Email:             ${updatedUser.email}`);
    console.log(`Role:              ${updatedUser.role} ⭐`);
    console.log(`Active:            ${updatedUser.is_active}`);
    console.log(`2FA Enabled:       ${updatedUser.twoFactorEnabled}`);
    console.log(`Requires 2FA Setup: ${updatedUser.requires_2fa_setup} ✓`);
    console.log('─────────────────────────────────────\n');

    console.log('🎉 SUCCESS! pongpanp is now a Super Admin with mandatory 2FA setup');
    console.log('\n📝 Next steps:');
    console.log('1. Login at http://localhost:3000/login');
    console.log('2. You will be redirected to /2fa-setup');
    console.log('3. Scan QR code with Google Authenticator');
    console.log('4. Enter verification code to complete setup\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up account:', error);
    logger.error('Error in setupPongpanpAdmin:', error);
    process.exit(1);
  }
}

// Run the script
setupPongpanpAdmin();
