/**
 * Trusted Device Service
 * Manages trusted devices for 2FA skip functionality
 *
 * Features:
 * - Store trusted devices with 24-hour expiration
 * - Check if device is trusted
 * - Cleanup expired devices
 * - Revoke trust for specific devices
 */

const { sequelize } = require('../config/database.config');
const { QueryTypes } = require('sequelize');
const crypto = require('crypto');
const logger = require('../utils/logger.util');

class TrustedDeviceService {
  /**
   * Check if a device is trusted for a user
   * @param {number} userId - User ID
   * @param {string} deviceFingerprint - Device fingerprint
   * @returns {Promise<boolean>}
   */
  async isDeviceTrusted(userId, deviceFingerprint) {
    try {
      const query = `
        SELECT id, expires_at
        FROM trusted_devices
        WHERE user_id = $1
          AND device_fingerprint = $2
          AND expires_at > NOW()
      `;

      const result = await sequelize.query(query, {
        bind: [userId, deviceFingerprint],
        type: QueryTypes.SELECT
      });

      if (result.length > 0) {
        // Update last_used_at
        await this.updateLastUsed(result[0].id);
        logger.info(`Device ${deviceFingerprint.substring(0, 8)}... is trusted for user ${userId}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error checking trusted device:', error);
      return false;
    }
  }

  /**
   * Trust a device for a user (configurable duration)
   * @param {number} userId - User ID
   * @param {string} deviceFingerprint - Device fingerprint
   * @param {Object} deviceInfo - Additional device information
   * @returns {Promise<Object>}
   */
  async trustDevice(userId, deviceFingerprint, deviceInfo = {}) {
    try {
      // Get duration from settings
      const duration = await this.getDuration();

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + duration);

      const query = `
        INSERT INTO trusted_devices (
          user_id,
          device_fingerprint,
          device_name,
          user_agent,
          ip_address,
          expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id, device_fingerprint)
        DO UPDATE SET
          expires_at = $6,
          last_used_at = NOW(),
          user_agent = $4,
          ip_address = $5,
          updated_at = NOW()
        RETURNING *
      `;

      const values = [
        userId,
        deviceFingerprint,
        deviceInfo.deviceName || null,
        deviceInfo.userAgent || null,
        deviceInfo.ipAddress || null,
        expiresAt
      ];

      const result = await sequelize.query(query, {
        bind: values,
        type: QueryTypes.INSERT
      });

      logger.info(`Device ${deviceFingerprint.substring(0, 8)}... trusted for user ${userId} until ${expiresAt}`);

      return {
        success: true,
        device: result[0][0],
        expiresAt
      };
    } catch (error) {
      logger.error('Error trusting device:', error);
      throw error;
    }
  }

  /**
   * Update last used time for a trusted device
   * @param {number} deviceId - Trusted device ID
   */
  async updateLastUsed(deviceId) {
    try {
      const query = `
        UPDATE trusted_devices
        SET last_used_at = NOW(), updated_at = NOW()
        WHERE id = $1
      `;

      await sequelize.query(query, {
        bind: [deviceId],
        type: QueryTypes.UPDATE
      });
    } catch (error) {
      logger.error('Error updating last used:', error);
    }
  }

  /**
   * Revoke trust for a specific device
   * @param {number} userId - User ID
   * @param {string} deviceFingerprint - Device fingerprint
   * @returns {Promise<boolean>}
   */
  async revokeDevice(userId, deviceFingerprint) {
    try {
      const query = `
        DELETE FROM trusted_devices
        WHERE user_id = $1 AND device_fingerprint = $2
      `;

      const result = await sequelize.query(query, {
        bind: [userId, deviceFingerprint],
        type: QueryTypes.DELETE
      });

      logger.info(`Revoked trust for device ${deviceFingerprint.substring(0, 8)}... for user ${userId}`);

      return true;
    } catch (error) {
      logger.error('Error revoking device:', error);
      throw error;
    }
  }

  /**
   * Revoke all trusted devices for a user
   * @param {number} userId - User ID
   * @returns {Promise<number>} Number of devices revoked
   */
  async revokeAllDevices(userId) {
    try {
      const query = `
        DELETE FROM trusted_devices
        WHERE user_id = $1
      `;

      await sequelize.query(query, {
        bind: [userId],
        type: QueryTypes.DELETE
      });

      // Get count before delete
      const countQuery = `
        SELECT COUNT(*) as count
        FROM trusted_devices
        WHERE user_id = $1
      `;

      const countResult = await sequelize.query(countQuery, {
        bind: [userId],
        type: QueryTypes.SELECT
      });

      const count = countResult[0]?.count || 0;

      logger.info(`Revoked all ${count} trusted devices for user ${userId}`);

      return count;
    } catch (error) {
      logger.error('Error revoking all devices:', error);
      throw error;
    }
  }

  /**
   * Get all trusted devices for a user
   * @param {number} userId - User ID
   * @returns {Promise<Array>}
   */
  async getUserDevices(userId) {
    try {
      const query = `
        SELECT
          id,
          device_fingerprint,
          device_name,
          user_agent,
          ip_address,
          trusted_at,
          expires_at,
          last_used_at,
          CASE
            WHEN expires_at > NOW() THEN true
            ELSE false
          END as is_active
        FROM trusted_devices
        WHERE user_id = $1
        ORDER BY last_used_at DESC
      `;

      const result = await sequelize.query(query, {
        bind: [userId],
        type: QueryTypes.SELECT
      });

      return result;
    } catch (error) {
      logger.error('Error getting user devices:', error);
      throw error;
    }
  }

  /**
   * Cleanup expired trusted devices (devices that have been expired for 30+ days)
   * @returns {Promise<number>} Number of devices cleaned up
   */
  async cleanupExpiredDevices() {
    try {
      // Delete devices that have been expired for 30+ days
      const query = `
        DELETE FROM trusted_devices
        WHERE expires_at < NOW() - INTERVAL '30 days'
      `;

      const result = await sequelize.query(query, {
        type: QueryTypes.DELETE
      });

      const count = result[1] || 0;

      if (count > 0) {
        logger.info(`Cleaned up ${count} trusted devices that expired 30+ days ago`);
      }

      return count;
    } catch (error) {
      logger.error('Error cleaning up old expired devices:', error);
      throw error;
    }
  }

  /**
   * Generate a simple hash for device fingerprint (for logging/display)
   * @param {string} fingerprint - Device fingerprint
   * @returns {string}
   */
  hashFingerprint(fingerprint) {
    return crypto
      .createHash('sha256')
      .update(fingerprint)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Get trusted device duration settings
   * @returns {Promise<Object>}
   */
  async getSettings() {
    try {
      const query = `
        SELECT setting_value
        FROM system_settings
        WHERE setting_key = 'trusted_device_duration'
      `;

      const result = await sequelize.query(query, {
        type: QueryTypes.SELECT
      });

      if (result.length > 0) {
        return {
          duration: parseInt(result[0].setting_value)
        };
      }

      // Return default if not set
      return { duration: 24 };
    } catch (error) {
      logger.error('Error getting trusted device settings:', error);
      // Return default on error
      return { duration: 24 };
    }
  }

  /**
   * Update trusted device duration settings
   * @param {number} duration - Duration in hours
   * @returns {Promise<Object>}
   */
  async updateSettings(duration) {
    try {
      const query = `
        INSERT INTO system_settings (setting_key, setting_value, updated_at)
        VALUES ('trusted_device_duration', $1, NOW())
        ON CONFLICT (setting_key)
        DO UPDATE SET
          setting_value = $1,
          updated_at = NOW()
        RETURNING *
      `;

      await sequelize.query(query, {
        bind: [duration.toString()],
        type: QueryTypes.INSERT
      });

      logger.info(`Trusted device duration updated to ${duration} hours`);

      return { duration };
    } catch (error) {
      logger.error('Error updating trusted device settings:', error);
      throw error;
    }
  }

  /**
   * Get duration from settings (used when trusting device)
   * @returns {Promise<number>} Duration in hours
   */
  async getDuration() {
    const settings = await this.getSettings();
    return settings.duration || 24;
  }
}

// Export singleton
module.exports = new TrustedDeviceService();
