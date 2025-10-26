/**
 * Secret Rotation Service for Q-Collector v0.9.0-dev
 * Manages JWT secret rotation and versioning
 *
 * Features:
 * - Automatic JWT secret rotation
 * - Secret versioning
 * - Graceful transition period
 * - Audit logging
 * - Manual rotation support
 *
 * Implementation: Phase 2, Task 2.1 of Security Hardening Plan
 * Date: 2025-10-26
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');
const logger = require('../utils/logger.util');

/**
 * Secret Rotation Configuration
 */
const ROTATION_CONFIG = {
  // Rotate secrets every 90 days
  rotationIntervalDays: parseInt(process.env.JWT_SECRET_ROTATION_DAYS) || 90,

  // Grace period for old secrets (7 days)
  gracePeriodDays: parseInt(process.env.JWT_SECRET_GRACE_PERIOD_DAYS) || 7,

  // Secret storage path
  secretsPath: path.join(__dirname, '..', 'config', 'secrets'),

  // Database table for secret audit
  auditTable: 'jwt_secret_rotation_audit',

  // Secret length (bytes)
  secretLength: 64 // 512 bits
};

class SecretRotationService {
  constructor() {
    this.currentSecrets = null;
    this.rotationTimer = null;
    this.pool = null;
  }

  /**
   * Initialize the secret rotation service
   */
  async initialize() {
    try {
      logger.info('Initializing Secret Rotation Service...');

      // Initialize database connection
      this.pool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
      });

      // Create secrets directory if not exists
      await this.ensureSecretsDirectory();

      // Create audit table if not exists
      await this.createAuditTable();

      // Load current secrets
      await this.loadSecrets();

      // Check if rotation is needed
      await this.checkAndRotate();

      // Schedule automatic rotation checks (daily)
      this.scheduleRotationCheck();

      logger.info('Secret Rotation Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Secret Rotation Service:', error);
      throw error;
    }
  }

  /**
   * Ensure secrets directory exists
   */
  async ensureSecretsDirectory() {
    try {
      await fs.mkdir(ROTATION_CONFIG.secretsPath, { recursive: true });
      logger.debug('Secrets directory verified');
    } catch (error) {
      logger.error('Failed to create secrets directory:', error);
      throw error;
    }
  }

  /**
   * Create audit table for secret rotation tracking
   */
  async createAuditTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${ROTATION_CONFIG.auditTable} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        secret_version VARCHAR(50) NOT NULL,
        secret_hash VARCHAR(128) NOT NULL,
        rotation_reason VARCHAR(100) NOT NULL,
        rotated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        rotated_by VARCHAR(100),
        expires_at TIMESTAMP NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        metadata JSONB
      );

      CREATE INDEX IF NOT EXISTS idx_${ROTATION_CONFIG.auditTable}_version
        ON ${ROTATION_CONFIG.auditTable}(secret_version);

      CREATE INDEX IF NOT EXISTS idx_${ROTATION_CONFIG.auditTable}_active
        ON ${ROTATION_CONFIG.auditTable}(is_active);

      CREATE INDEX IF NOT EXISTS idx_${ROTATION_CONFIG.auditTable}_expires
        ON ${ROTATION_CONFIG.auditTable}(expires_at);
    `;

    try {
      await this.pool.query(createTableSQL);
      logger.debug('Secret rotation audit table verified');
    } catch (error) {
      logger.error('Failed to create audit table:', error);
      throw error;
    }
  }

  /**
   * Load current secrets from storage
   */
  async loadSecrets() {
    try {
      const secretsFile = path.join(ROTATION_CONFIG.secretsPath, 'secrets.json');

      // Check if secrets file exists
      try {
        const data = await fs.readFile(secretsFile, 'utf8');
        this.currentSecrets = JSON.parse(data);
        logger.info(`Loaded ${this.currentSecrets.secrets.length} JWT secrets`);
      } catch (error) {
        if (error.code === 'ENOENT') {
          // No secrets file, create initial secrets
          logger.warn('No secrets file found, creating initial secrets');
          await this.createInitialSecrets();
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error('Failed to load secrets:', error);
      throw error;
    }
  }

  /**
   * Create initial secrets
   */
  async createInitialSecrets() {
    const currentSecret = {
      version: 'v1',
      secret: this.generateSecret(),
      createdAt: new Date().toISOString(),
      expiresAt: this.calculateExpiryDate(ROTATION_CONFIG.rotationIntervalDays),
      isActive: true
    };

    this.currentSecrets = {
      secrets: [currentSecret],
      lastRotation: new Date().toISOString()
    };

    await this.saveSecrets();

    // Log to audit table
    await this.logRotation(currentSecret, 'INITIAL_SETUP', 'system');

    logger.info('Initial JWT secrets created successfully');
  }

  /**
   * Generate a cryptographically secure secret
   */
  generateSecret() {
    return crypto.randomBytes(ROTATION_CONFIG.secretLength).toString('base64url');
  }

  /**
   * Calculate expiry date
   */
  calculateExpiryDate(days) {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);
    return expiry.toISOString();
  }

  /**
   * Save secrets to storage
   */
  async saveSecrets() {
    try {
      const secretsFile = path.join(ROTATION_CONFIG.secretsPath, 'secrets.json');
      await fs.writeFile(secretsFile, JSON.stringify(this.currentSecrets, null, 2), 'utf8');

      // Set file permissions (read/write for owner only)
      await fs.chmod(secretsFile, 0o600);

      logger.debug('Secrets saved to storage');
    } catch (error) {
      logger.error('Failed to save secrets:', error);
      throw error;
    }
  }

  /**
   * Check if rotation is needed and rotate if necessary
   */
  async checkAndRotate() {
    try {
      const activeSecret = this.currentSecrets.secrets.find(s => s.isActive);

      if (!activeSecret) {
        logger.warn('No active secret found, performing emergency rotation');
        await this.rotateSecrets('EMERGENCY_ROTATION');
        return;
      }

      const expiryDate = new Date(activeSecret.expiresAt);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry <= 0) {
        logger.warn('JWT secret has expired, performing immediate rotation');
        await this.rotateSecrets('EXPIRED');
      } else if (daysUntilExpiry <= 7) {
        logger.warn(`JWT secret expires in ${daysUntilExpiry} days, consider rotating soon`);
      } else {
        logger.info(`JWT secret valid for ${daysUntilExpiry} more days`);
      }
    } catch (error) {
      logger.error('Failed to check rotation status:', error);
    }
  }

  /**
   * Rotate JWT secrets
   */
  async rotateSecrets(reason = 'SCHEDULED_ROTATION', rotatedBy = 'system') {
    try {
      logger.info(`Starting JWT secret rotation: ${reason}`);

      // Generate new secret
      const newSecret = {
        version: this.generateVersion(),
        secret: this.generateSecret(),
        createdAt: new Date().toISOString(),
        expiresAt: this.calculateExpiryDate(ROTATION_CONFIG.rotationIntervalDays),
        isActive: true
      };

      // Mark current active secret as transitioning
      const oldSecret = this.currentSecrets.secrets.find(s => s.isActive);
      if (oldSecret) {
        oldSecret.isActive = false;
        oldSecret.gracePeriodEndsAt = this.calculateExpiryDate(ROTATION_CONFIG.gracePeriodDays);
      }

      // Add new secret
      this.currentSecrets.secrets.push(newSecret);

      // Remove secrets past grace period
      this.currentSecrets.secrets = this.currentSecrets.secrets.filter(s => {
        if (s.gracePeriodEndsAt) {
          return new Date(s.gracePeriodEndsAt) > new Date();
        }
        return true;
      });

      // Update last rotation time
      this.currentSecrets.lastRotation = new Date().toISOString();

      // Save secrets
      await this.saveSecrets();

      // Log rotation to audit table
      await this.logRotation(newSecret, reason, rotatedBy);

      logger.info(`JWT secret rotated successfully. New version: ${newSecret.version}`);

      // Return new secret for immediate use
      return newSecret;
    } catch (error) {
      logger.error('Failed to rotate secrets:', error);
      throw error;
    }
  }

  /**
   * Generate version string
   */
  generateVersion() {
    const count = this.currentSecrets.secrets.length + 1;
    const timestamp = Date.now().toString(36);
    return `v${count}-${timestamp}`;
  }

  /**
   * Log rotation to audit table
   */
  async logRotation(secret, reason, rotatedBy) {
    const secretHash = crypto.createHash('sha512').update(secret.secret).digest('hex');

    const query = `
      INSERT INTO ${ROTATION_CONFIG.auditTable}
        (secret_version, secret_hash, rotation_reason, rotated_by, expires_at, is_active, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    const values = [
      secret.version,
      secretHash,
      reason,
      rotatedBy,
      secret.expiresAt,
      secret.isActive,
      JSON.stringify({
        createdAt: secret.createdAt,
        rotationInterval: ROTATION_CONFIG.rotationIntervalDays,
        gracePeriod: ROTATION_CONFIG.gracePeriodDays
      })
    ];

    try {
      await this.pool.query(query, values);
      logger.debug(`Secret rotation logged: ${secret.version}`);
    } catch (error) {
      logger.error('Failed to log rotation:', error);
      // Don't throw - rotation should succeed even if logging fails
    }
  }

  /**
   * Get current active secret
   */
  getActiveSecret() {
    const activeSecret = this.currentSecrets?.secrets.find(s => s.isActive);
    if (!activeSecret) {
      logger.error('No active JWT secret found!');
      throw new Error('No active JWT secret available');
    }
    return activeSecret.secret;
  }

  /**
   * Get all valid secrets (active + grace period)
   */
  getValidSecrets() {
    if (!this.currentSecrets) {
      return [];
    }

    const now = new Date();
    return this.currentSecrets.secrets
      .filter(s => {
        if (s.isActive) return true;
        if (s.gracePeriodEndsAt && new Date(s.gracePeriodEndsAt) > now) return true;
        return false;
      })
      .map(s => s.secret);
  }

  /**
   * Verify if a secret is valid
   */
  isSecretValid(secret) {
    const validSecrets = this.getValidSecrets();
    return validSecrets.includes(secret);
  }

  /**
   * Get rotation status
   */
  async getRotationStatus() {
    const activeSecret = this.currentSecrets?.secrets.find(s => s.isActive);

    if (!activeSecret) {
      return {
        status: 'ERROR',
        message: 'No active secret found'
      };
    }

    const expiryDate = new Date(activeSecret.expiresAt);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

    return {
      status: daysUntilExpiry > 0 ? 'HEALTHY' : 'EXPIRED',
      activeVersion: activeSecret.version,
      createdAt: activeSecret.createdAt,
      expiresAt: activeSecret.expiresAt,
      daysUntilExpiry,
      totalSecrets: this.currentSecrets.secrets.length,
      lastRotation: this.currentSecrets.lastRotation
    };
  }

  /**
   * Schedule automatic rotation checks (daily)
   */
  scheduleRotationCheck() {
    // Clear existing timer
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }

    // Check every 24 hours
    const checkInterval = 24 * 60 * 60 * 1000; // 24 hours

    this.rotationTimer = setInterval(async () => {
      logger.info('Running scheduled rotation check');
      await this.checkAndRotate();
    }, checkInterval);

    logger.info('Scheduled rotation check every 24 hours');
  }

  /**
   * Force manual rotation
   */
  async forceRotation(rotatedBy = 'manual') {
    logger.warn(`Manual secret rotation triggered by: ${rotatedBy}`);
    return await this.rotateSecrets('MANUAL_ROTATION', rotatedBy);
  }

  /**
   * Get rotation history
   */
  async getRotationHistory(limit = 10) {
    const query = `
      SELECT
        secret_version,
        rotation_reason,
        rotated_at,
        rotated_by,
        expires_at,
        is_active
      FROM ${ROTATION_CONFIG.auditTable}
      ORDER BY rotated_at DESC
      LIMIT $1
    `;

    try {
      const result = await this.pool.query(query, [limit]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get rotation history:', error);
      return [];
    }
  }

  /**
   * Cleanup - close database connection
   */
  async cleanup() {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }
    if (this.pool) {
      await this.pool.end();
    }
    logger.info('Secret Rotation Service cleaned up');
  }
}

// Export singleton instance
const secretRotationService = new SecretRotationService();

module.exports = secretRotationService;
