/**
 * Check current 2FA status in database
 */

require('dotenv').config();
const { User } = require('../models');

async function check2FAStatus() {
  try {
    const user = await User.findOne({
      where: { username: 'pongpanp' },
      attributes: [
        'id',
        'username',
        'email',
        'twoFactorEnabled',
        'twoFactorSecret',
        'twoFactorEnabledAt',
        'twoFactorBackupCodes'
      ]
    });

    if (!user) {
      console.error('❌ User not found');
      process.exit(1);
    }

    console.log('📊 Current 2FA Status:\n');
    console.log('User:', user.username);
    console.log('Email:', user.email);
    console.log('2FA Enabled:', user.twoFactorEnabled);
    console.log('Has Secret:', user.twoFactorSecret ? 'Yes' : 'No');
    console.log('Enabled At:', user.twoFactorEnabledAt || 'N/A');
    console.log('Has Backup Codes:', user.twoFactorBackupCodes ? 'Yes' : 'No');

    if (user.twoFactorSecret) {
      console.log('\nSecret (first 20 chars):', user.twoFactorSecret.substring(0, 20) + '...');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

check2FAStatus();
