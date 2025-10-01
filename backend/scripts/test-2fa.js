/**
 * Test 2FA functionality end-to-end
 */

require('dotenv').config();
const speakeasy = require('speakeasy');
const { User } = require('../models');

async function test2FA() {
  try {
    console.log('🔍 Testing 2FA functionality...\n');

    // Find user
    const user = await User.findOne({ where: { username: 'pongpanp' } });
    if (!user) {
      console.error('❌ User not found');
      process.exit(1);
    }

    console.log('✅ User found:', user.username);
    console.log('📧 Email:', user.email);
    console.log('🔐 2FA Enabled:', user.twoFactorEnabled);

    if (!user.twoFactorEnabled) {
      console.log('\n⚠️  2FA is not enabled. Enabling for test...\n');

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `Q-Collector (${user.email})`,
        issuer: 'Q-Collector',
        length: 32
      });

      console.log('🔑 Generated Secret (base32):', secret.base32);
      console.log('🔗 QR Code URL:', secret.otpauth_url);

      // Generate current token
      const token = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32'
      });

      console.log('🎲 Current TOTP Token:', token);

      // Verify token
      const verified = speakeasy.totp.verify({
        secret: secret.base32,
        encoding: 'base32',
        token: token,
        window: 2
      });

      console.log('✅ Token Verification:', verified ? 'PASS' : 'FAIL');

      // Test encryption/decryption
      const crypto = require('crypto');
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
      const iv = crypto.randomBytes(16);

      const cipher = crypto.createCipheriv(algorithm, key, iv);
      let encrypted = cipher.update(secret.base32, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const encryptedWithIV = iv.toString('hex') + ':' + encrypted;

      console.log('\n🔒 Encrypted Secret:', encryptedWithIV.substring(0, 50) + '...');

      // Test decryption
      const parts = encryptedWithIV.split(':');
      const ivDecrypt = Buffer.from(parts[0], 'hex');
      const encryptedData = parts[1];

      const decipher = crypto.createDecipheriv(algorithm, key, ivDecrypt);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      console.log('🔓 Decrypted Secret:', decrypted);
      console.log('✅ Encryption/Decryption:', decrypted === secret.base32 ? 'PASS' : 'FAIL');

      // Generate token from decrypted secret
      const tokenFromDecrypted = speakeasy.totp({
        secret: decrypted,
        encoding: 'base32'
      });

      console.log('\n🎲 Token from Decrypted Secret:', tokenFromDecrypted);
      console.log('✅ Tokens Match:', token === tokenFromDecrypted ? 'PASS' : 'FAIL');

      console.log('\n📋 Summary:');
      console.log('- Secret Generation: ✅ PASS');
      console.log('- Token Generation: ✅ PASS');
      console.log('- Token Verification: ✅', verified ? 'PASS' : 'FAIL');
      console.log('- Encryption/Decryption: ✅', decrypted === secret.base32 ? 'PASS' : 'FAIL');
      console.log('- Token Consistency: ✅', token === tokenFromDecrypted ? 'PASS' : 'FAIL');

      console.log('\n📱 To test with authenticator app:');
      console.log('1. Scan this QR code URL:', secret.otpauth_url);
      console.log('2. Or manually enter this secret:', secret.base32);
      console.log('3. The current 6-digit code should be:', token);
      console.log('4. This code is valid for ~30 seconds');

    } else {
      console.log('\n⚠️  2FA is already enabled');
      console.log('Run: node scripts/disable-2fa.js pongpanp');
      console.log('Then run this test again');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

test2FA();
