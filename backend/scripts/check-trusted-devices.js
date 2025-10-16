/**
 * Check Trusted Devices in Database
 *
 * This script displays all trusted devices in the database
 */

const { User, sequelize } = require('../models');
const logger = require('../utils/logger.util');

async function checkTrustedDevices() {
  try {
    console.log('🔍 Checking trusted devices in database...\n');

    // Get all trusted devices with user information
    const [devices] = await sequelize.query(`
      SELECT
        td.id,
        td.user_id,
        u.username,
        u.email,
        td.device_fingerprint,
        td.device_name,
        td.last_used_at,
        td.created_at,
        td.expires_at
      FROM trusted_devices td
      JOIN users u ON td.user_id = u.id
      ORDER BY td.created_at DESC
    `);

    console.log(`📊 Total trusted devices: ${devices.length}\n`);

    if (devices.length === 0) {
      console.log('✅ No trusted devices found in database');
      console.log('📝 All users will need to verify 2FA on next login\n');
      process.exit(0);
    }

    // Group by user
    const devicesByUser = {};
    devices.forEach(device => {
      const username = device.username;
      if (!devicesByUser[username]) {
        devicesByUser[username] = [];
      }
      devicesByUser[username].push(device);
    });

    // Display grouped by user
    console.log('Trusted Devices by User:');
    console.log('═══════════════════════════════════════════════════════════════\n');

    Object.keys(devicesByUser).forEach(username => {
      const userDevices = devicesByUser[username];
      console.log(`👤 ${username} (${userDevices[0].email})`);
      console.log(`   Total devices: ${userDevices.length}`);
      console.log('   ───────────────────────────────────────────────────────────');

      userDevices.forEach((device, index) => {
        console.log(`   ${index + 1}. Device: ${device.device_name || 'Unknown'}`);
        console.log(`      Fingerprint: ${device.device_fingerprint.substring(0, 16)}...`);
        console.log(`      Last used:   ${device.last_used_at || 'Never'}`);
        console.log(`      Created:     ${device.created_at}`);
        console.log(`      Expires:     ${device.expires_at || 'Never'}`);
        console.log('');
      });
    });

    console.log('═══════════════════════════════════════════════════════════════\n');

    // Check for pongpanp specifically
    const pongpanpDevices = devicesByUser['pongpanp'];
    if (pongpanpDevices && pongpanpDevices.length > 0) {
      console.log('⚠️  WARNING: pongpanp still has trusted devices!');
      console.log(`   This will skip 2FA setup on next login.`);
      console.log(`   Run revoke-pongpanp-trusted-devices.js to remove them.\n`);
    } else {
      console.log('✅ pongpanp has NO trusted devices');
      console.log('   Will be required to setup 2FA on next login\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking devices:', error);
    logger.error('Error in checkTrustedDevices:', error);
    process.exit(1);
  }
}

// Run the script
checkTrustedDevices();
