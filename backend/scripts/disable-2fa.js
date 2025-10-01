/**
 * Script to disable 2FA for a user
 * Usage: node disable-2fa.js <username>
 */

require('dotenv').config();
const { User } = require('../models');

async function disable2FA(username) {
  try {
    const user = await User.findOne({ where: { username } });

    if (!user) {
      console.error(`❌ User '${username}' not found`);
      process.exit(1);
    }

    if (!user.twoFactorEnabled) {
      console.log(`ℹ️  2FA is already disabled for user '${username}'`);
      process.exit(0);
    }

    await User.update({
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: null,
      twoFactorEnabledAt: null
    }, {
      where: { username }
    });

    console.log(`✅ 2FA disabled successfully for user '${username}'`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error disabling 2FA:', error);
    process.exit(1);
  }
}

const username = process.argv[2];
if (!username) {
  console.error('Usage: node disable-2fa.js <username>');
  process.exit(1);
}

disable2FA(username);
