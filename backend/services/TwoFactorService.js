/**
 * Two-Factor Authentication Service
 * TOTP (Time-based One-Time Password) implementation with QR code generation
 *
 * Features:
 * - TOTP generation and verification
 * - QR code generation for authenticator apps
 * - Backup codes generation
 * - Recovery mechanisms
 * - Security logging
 */

const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { User } = require('../models');
const { ApiError } = require('../middleware/error.middleware');
const logger = require('../utils/logger.util');
const cacheService = require('./CacheService');

class TwoFactorService {
  constructor() {
    this.APP_NAME = 'Q-Collector';
    this.BACKUP_CODES_COUNT = 10;
    this.RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
    this.MAX_ATTEMPTS = 5;
  }

  /**
   * Generate 2FA secret for user
   * @param {Object} user - User object
   * @returns {Object} Secret and QR code data
   */
  async generateSecret(user) {
    try {
      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `${this.APP_NAME} (${user.email})`,
        issuer: this.APP_NAME,
        length: 32
      });

      // Generate QR code data URL
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Store temporary secret (not yet enabled)
      await this.storeTempSecret(user.id, {
        secret: secret.base32,
        backupCodes: backupCodes
      });

      logger.info(`2FA secret generated for user ${user.username}`, {
        userId: user.id,
        email: user.email
      });

      return {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        manualEntryKey: secret.base32,
        backupCodes: backupCodes
      };
    } catch (error) {
      logger.error('Failed to generate 2FA secret:', error);
      throw new ApiError(500, 'Failed to generate 2FA secret');
    }
  }

  /**
   * Verify and enable 2FA for user
   * @param {string} userId - User ID
   * @param {string} token - TOTP token from user
   * @returns {boolean} Success status
   */
  async enableTwoFactor(userId, token) {
    try {
      // Get temporary secret
      const tempData = await this.getTempSecret(userId);
      if (!tempData) {
        throw new ApiError(400, '2FA setup not initiated');
      }

      // Verify token
      const verified = speakeasy.totp.verify({
        secret: tempData.secret,
        encoding: 'base32',
        token: token,
        window: 2 // Allow 2 time steps tolerance
      });

      if (!verified) {
        throw new ApiError(400, 'Invalid verification code');
      }

      // Enable 2FA for user
      await User.update({
        twoFactorSecret: this.encryptSecret(tempData.secret),
        twoFactorEnabled: true,
        twoFactorBackupCodes: JSON.stringify(tempData.backupCodes.map(code => ({
          code: this.hashBackupCode(code),
          used: false
        }))),
        twoFactorEnabledAt: new Date()
      }, {
        where: { id: userId }
      });

      // Clear temporary secret
      await this.clearTempSecret(userId);

      logger.info(`2FA enabled for user ID: ${userId}`);

      return true;
    } catch (error) {
      logger.error('Failed to enable 2FA:', error);
      throw error;
    }
  }

  /**
   * Verify 2FA token
   * @param {Object} user - User object
   * @param {string} token - TOTP token or backup code
   * @returns {boolean} Verification result
   */
  async verifyToken(user, token) {
    try {
      // Check rate limiting
      await this.checkRateLimit(user.id);

      if (!user.twoFactorEnabled || !user.twoFactorSecret) {
        throw new ApiError(400, '2FA is not enabled for this user');
      }

      // Try TOTP verification first
      const secret = this.decryptSecret(user.twoFactorSecret);
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 2
      });

      if (verified) {
        await this.clearRateLimit(user.id);
        logger.info(`2FA TOTP verification successful for user ${user.username}`);
        return true;
      }

      // Try backup code verification
      const backupCodeVerified = await this.verifyBackupCode(user, token);
      if (backupCodeVerified) {
        await this.clearRateLimit(user.id);
        logger.info(`2FA backup code verification successful for user ${user.username}`);
        return true;
      }

      // Record failed attempt
      await this.recordFailedAttempt(user.id);

      logger.warn(`2FA verification failed for user ${user.username}`, {
        userId: user.id,
        token: token.substring(0, 2) + '*'.repeat(token.length - 2)
      });

      return false;
    } catch (error) {
      logger.error('2FA verification error:', error);
      throw error;
    }
  }

  /**
   * Disable 2FA for user
   * @param {string} userId - User ID
   * @param {string} token - Verification token
   * @returns {boolean} Success status
   */
  async disableTwoFactor(userId, token) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      // Verify current token before disabling
      const verified = await this.verifyToken(user, token);
      if (!verified) {
        throw new ApiError(400, 'Invalid verification code');
      }

      // Disable 2FA
      await User.update({
        twoFactorSecret: null,
        twoFactorEnabled: false,
        twoFactorBackupCodes: null,
        twoFactorEnabledAt: null
      }, {
        where: { id: userId }
      });

      // Clear any temporary data
      await this.clearTempSecret(userId);
      await this.clearRateLimit(userId);

      logger.info(`2FA disabled for user ID: ${userId}`);

      return true;
    } catch (error) {
      logger.error('Failed to disable 2FA:', error);
      throw error;
    }
  }

  /**
   * Generate new backup codes
   * @param {string} userId - User ID
   * @param {string} token - Verification token
   * @returns {Array} New backup codes
   */
  async regenerateBackupCodes(userId, token) {
    try {
      const user = await User.findByPk(userId);
      if (!user || !user.twoFactorEnabled) {
        throw new ApiError(400, '2FA is not enabled');
      }

      // Verify current token
      const verified = await this.verifyToken(user, token);
      if (!verified) {
        throw new ApiError(400, 'Invalid verification code');
      }

      // Generate new backup codes
      const newBackupCodes = this.generateBackupCodes();

      // Update user with new backup codes
      await User.update({
        twoFactorBackupCodes: JSON.stringify(newBackupCodes.map(code => ({
          code: this.hashBackupCode(code),
          used: false
        })))
      }, {
        where: { id: userId }
      });

      logger.info(`Backup codes regenerated for user ID: ${userId}`);

      return newBackupCodes;
    } catch (error) {
      logger.error('Failed to regenerate backup codes:', error);
      throw error;
    }
  }

  /**
   * Get 2FA status for user
   * @param {string} userId - User ID
   * @returns {Object} 2FA status information
   */
  async getTwoFactorStatus(userId) {
    try {
      const user = await User.findByPk(userId, {
        attributes: ['id', 'twoFactorEnabled', 'twoFactorEnabledAt', 'twoFactorBackupCodes']
      });

      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      const backupCodes = user.twoFactorBackupCodes
        ? JSON.parse(user.twoFactorBackupCodes)
        : [];

      return {
        enabled: user.twoFactorEnabled || false,
        enabledAt: user.twoFactorEnabledAt,
        backupCodesRemaining: backupCodes.filter(code => !code.used).length,
        totalBackupCodes: backupCodes.length
      };
    } catch (error) {
      logger.error('Failed to get 2FA status:', error);
      throw error;
    }
  }

  // Private helper methods

  generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
      // Generate 8-character alphanumeric code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  encryptSecret(secret) {
    const algorithm = 'aes-256-cbc';
    // Derive a proper 32-byte key from the encryption key
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
    // Generate random initialization vector
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Prepend IV to encrypted data (separated by :)
    return iv.toString('hex') + ':' + encrypted;
  }

  decryptSecret(encryptedSecret) {
    const algorithm = 'aes-256-cbc';
    // Derive the same 32-byte key
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);

    // Extract IV and encrypted data
    const parts = encryptedSecret.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  hashBackupCode(code) {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  async verifyBackupCode(user, code) {
    try {
      if (!user.twoFactorBackupCodes) {
        return false;
      }

      const backupCodes = JSON.parse(user.twoFactorBackupCodes);
      const hashedCode = this.hashBackupCode(code.toUpperCase());

      const codeIndex = backupCodes.findIndex(
        backupCode => backupCode.code === hashedCode && !backupCode.used
      );

      if (codeIndex === -1) {
        return false;
      }

      // Mark backup code as used
      backupCodes[codeIndex].used = true;

      await User.update({
        twoFactorBackupCodes: JSON.stringify(backupCodes)
      }, {
        where: { id: user.id }
      });

      return true;
    } catch (error) {
      logger.error('Failed to verify backup code:', error);
      return false;
    }
  }

  async storeTempSecret(userId, data) {
    const key = `2fa:temp:${userId}`;
    await cacheService.set(key, data, 1800); // 30 minutes expiry
  }

  async getTempSecret(userId) {
    const key = `2fa:temp:${userId}`;
    return await cacheService.get(key);
  }

  async clearTempSecret(userId) {
    const key = `2fa:temp:${userId}`;
    await cacheService.delete(key);
  }

  async checkRateLimit(userId) {
    const key = `2fa:attempts:${userId}`;
    const attempts = await cacheService.get(key) || 0;

    if (attempts >= this.MAX_ATTEMPTS) {
      throw new ApiError(429, 'Too many 2FA verification attempts. Please try again later.');
    }
  }

  async recordFailedAttempt(userId) {
    const key = `2fa:attempts:${userId}`;
    const attempts = await cacheService.get(key) || 0;
    await cacheService.set(key, attempts + 1, this.RATE_LIMIT_WINDOW / 1000);
  }

  async clearRateLimit(userId) {
    const key = `2fa:attempts:${userId}`;
    await cacheService.delete(key);
  }
}

module.exports = new TwoFactorService();