/**
 * Reset Super Admin 2FA
 *
 * Reset 2FA for super admin user pongpanp
 * This will allow the user to login and set up 2FA again
 *
 * @version 0.7.3-dev
 * @date 2025-10-06
 */

const { Client } = require('pg');
require('dotenv').config();

const USERNAME = 'pongpanp';

async function resetSuperAdmin2FA() {
  const client = new Client({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'qcollector_db',
    user: process.env.POSTGRES_USER || 'qcollector',
    password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
  });

  try {
    await client.connect();
    console.log('\n🔐 Resetting Super Admin 2FA...\n');

    // Step 1: Check if user exists
    console.log('📋 Step 1: Finding user...');
    const userQuery = `
      SELECT id, username, email, role, "twoFactorEnabled", requires_2fa_setup
      FROM users
      WHERE username = $1;
    `;
    const userResult = await client.query(userQuery, [USERNAME]);

    if (userResult.rows.length === 0) {
      console.log(`   ❌ User "${USERNAME}" not found!`);
      await client.end();
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log(`   ✅ Found user: ${user.username}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Role: ${user.role}`);
    console.log(`   - 2FA Enabled: ${user.twoFactorEnabled}`);
    console.log(`   - Requires 2FA Setup: ${user.requires_2fa_setup}`);

    // Step 2: Show what will be changed
    console.log('\n📝 Step 2: Planned changes:');
    console.log('   - Set twoFactorEnabled = false');
    console.log('   - Set twoFactorSecret = NULL');
    console.log('   - Set requires_2fa_setup = false');
    console.log('   - User can login with password only');
    console.log('   - User can set up 2FA again from settings');

    // Step 3: Confirm
    console.log('\n⚠️  CONFIRMATION REQUIRED ⚠️');
    console.log(`This will reset 2FA for user: ${user.username} (${user.email})`);
    console.log('\nTo proceed, run: node reset-super-admin-2fa.js --confirm');

    if (!process.argv.includes('--confirm')) {
      console.log('\n❌ Aborted (no --confirm flag)');
      await client.end();
      process.exit(0);
    }

    // Step 4: Reset 2FA
    console.log('\n🔄 Step 3: Resetting 2FA...');
    await client.query('BEGIN');

    try {
      const updateQuery = `
        UPDATE users
        SET
          "twoFactorEnabled" = false,
          "twoFactorSecret" = NULL,
          requires_2fa_setup = false,
          "updatedAt" = NOW()
        WHERE id = $1
        RETURNING id, username, email, "twoFactorEnabled", requires_2fa_setup;
      `;

      const updateResult = await client.query(updateQuery, [user.id]);
      const updatedUser = updateResult.rows[0];

      await client.query('COMMIT');

      console.log('   ✅ 2FA reset successfully!');
      console.log('\n   Updated user status:');
      console.log(`   - Username: ${updatedUser.username}`);
      console.log(`   - Email: ${updatedUser.email}`);
      console.log(`   - 2FA Enabled: ${updatedUser.twoFactorEnabled}`);
      console.log(`   - Requires 2FA Setup: ${updatedUser.requires_2fa_setup}`);

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error resetting 2FA:', error.message);
      throw error;
    }

    // Step 5: Delete trusted devices (optional)
    console.log('\n🔄 Step 4: Checking trusted devices...');
    try {
      const devicesQuery = `
        SELECT COUNT(*) as count
        FROM trusted_devices
        WHERE user_id = $1;
      `;
      const devicesResult = await client.query(devicesQuery, [user.id]);
      const deviceCount = parseInt(devicesResult.rows[0].count);

      if (deviceCount > 0) {
        console.log(`   Found ${deviceCount} trusted device(s)`);
        console.log('   Deleting trusted devices...');

        await client.query('DELETE FROM trusted_devices WHERE user_id = $1', [user.id]);
        console.log('   ✅ Trusted devices deleted');
      } else {
        console.log('   ✓  No trusted devices found');
      }
    } catch (error) {
      if (error.message.includes('does not exist')) {
        console.log('   ✓  trusted_devices table does not exist (skipped)');
      } else {
        throw error;
      }
    }

    console.log('\n✅ Reset completed successfully!');
    console.log('\nNext steps:');
    console.log(`   1. User "${USERNAME}" can now login with password only`);
    console.log('   2. User can set up 2FA again from Settings > Two-Factor Authentication');
    console.log('   3. Or admin can force 2FA setup from User Management');

  } catch (error) {
    console.error('\n❌ Reset failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run reset
resetSuperAdmin2FA();
