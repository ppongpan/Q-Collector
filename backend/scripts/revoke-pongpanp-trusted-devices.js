/**
 * Revoke All Trusted Devices for pongpanp
 *
 * This script removes all trusted devices for the pongpanp account
 * to force 2FA setup on next login
 */

const { User, sequelize } = require('../models');
const logger = require('../utils/logger.util');

async function revokeTrustedDevices() {
  try {
    console.log('🔍 Revoking trusted devices for pongpanp...\n');

    // Find user
    const user = await User.findOne({ where: { username: 'pongpanp' } });

    if (!user) {
      console.error('❌ User pongpanp not found!');
      process.exit(1);
    }

    // Find all trusted devices using raw SQL
    const [devices] = await sequelize.query(
      'SELECT * FROM trusted_devices WHERE user_id = :userId',
      {
        replacements: { userId: user.id }
      }
    );

    console.log(`📊 Found ${devices.length} trusted device(s)\n`);

    if (devices.length === 0) {
      console.log('✅ No trusted devices to revoke');
      process.exit(0);
    }

    // Show devices before deletion
    console.log('Trusted Devices:');
    console.log('─────────────────────────────────────');
    devices.forEach((device, index) => {
      console.log(`${index + 1}. Device: ${device.device_name || 'Unknown'}`);
      console.log(`   Fingerprint: ${device.device_fingerprint.substring(0, 12)}...`);
      console.log(`   Last used: ${device.last_used_at || 'Never'}`);
      console.log(`   Created: ${device.created_at}`);
      console.log('');
    });

    // Delete all devices using raw SQL
    const [result] = await sequelize.query(
      'DELETE FROM trusted_devices WHERE user_id = :userId',
      {
        replacements: { userId: user.id }
      }
    );

    const deletedCount = devices.length;

    console.log('─────────────────────────────────────');
    console.log(`✅ Revoked ${deletedCount} trusted device(s) successfully!\n`);
    console.log('📝 Next login will require 2FA setup\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error revoking devices:', error);
    logger.error('Error in revokeTrustedDevices:', error);
    process.exit(1);
  }
}

// Run the script
revokeTrustedDevices();
