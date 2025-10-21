/**
 * GoogleAuthToken Model
 * Manages encrypted OAuth2 tokens for Google Sheets API access
 *
 * Part of Google Sheets Import System v0.8.0
 *
 * Security:
 * - Uses AES-256 encryption for token storage
 * - Automatic token refresh when expired
 * - One token per user (unique constraint)
 */

const { encrypt, decrypt } = require('../utils/encryption.util');

module.exports = (sequelize, DataTypes) => {
  const GoogleAuthToken = sequelize.define('GoogleAuthToken', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    access_token: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Encrypted access token',
    },
    refresh_token: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Encrypted refresh token',
    },
    token_expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'When access token expires',
    },
    google_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    google_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  }, {
    tableName: 'google_auth_tokens',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'], unique: true },
      { fields: ['token_expires_at'] },
    ],
    hooks: {
      /**
       * Encrypt tokens before creating
       */
      beforeCreate: async (token) => {
        if (token.access_token && !token.access_token.startsWith('{')) {
          token.access_token = JSON.stringify(encrypt(token.access_token));
        }
        if (token.refresh_token && !token.refresh_token.startsWith('{')) {
          token.refresh_token = JSON.stringify(encrypt(token.refresh_token));
        }
      },

      /**
       * Encrypt tokens before updating
       */
      beforeUpdate: async (token) => {
        if (token.changed('access_token') && !token.access_token.startsWith('{')) {
          token.access_token = JSON.stringify(encrypt(token.access_token));
        }
        if (token.changed('refresh_token') && !token.refresh_token.startsWith('{')) {
          token.refresh_token = JSON.stringify(encrypt(token.refresh_token));
        }
      },
    },
  });

  /**
   * Instance Methods
   */

  /**
   * Get decrypted access token
   * @returns {string}
   */
  GoogleAuthToken.prototype.getAccessToken = function() {
    if (!this.access_token) return null;
    try {
      const encryptedData = JSON.parse(this.access_token);
      return decrypt(encryptedData);
    } catch (error) {
      console.error('Error decrypting access token:', error);
      return null;
    }
  };

  /**
   * Get decrypted refresh token
   * @returns {string}
   */
  GoogleAuthToken.prototype.getRefreshToken = function() {
    if (!this.refresh_token) return null;
    try {
      const encryptedData = JSON.parse(this.refresh_token);
      return decrypt(encryptedData);
    } catch (error) {
      console.error('Error decrypting refresh token:', error);
      return null;
    }
  };

  /**
   * Set access token (will be encrypted automatically by hook)
   * @param {string} token - Plain text access token
   */
  GoogleAuthToken.prototype.setAccessToken = function(token) {
    this.access_token = token;
  };

  /**
   * Set refresh token (will be encrypted automatically by hook)
   * @param {string} token - Plain text refresh token
   */
  GoogleAuthToken.prototype.setRefreshToken = function(token) {
    this.refresh_token = token;
  };

  /**
   * Check if access token is expired
   * @returns {boolean}
   */
  GoogleAuthToken.prototype.isExpired = function() {
    if (!this.token_expires_at) return true;

    // Add 5 minute buffer before actual expiry
    const expiryWithBuffer = new Date(this.token_expires_at);
    expiryWithBuffer.setMinutes(expiryWithBuffer.getMinutes() - 5);

    return new Date() >= expiryWithBuffer;
  };

  /**
   * Check if token will expire soon (within 10 minutes)
   * @returns {boolean}
   */
  GoogleAuthToken.prototype.willExpireSoon = function() {
    if (!this.token_expires_at) return true;

    const tenMinutesFromNow = new Date();
    tenMinutesFromNow.setMinutes(tenMinutesFromNow.getMinutes() + 10);

    return new Date(this.token_expires_at) <= tenMinutesFromNow;
  };

  /**
   * Update with new tokens
   * @param {Object} tokenData - Token data from Google OAuth
   * @param {string} tokenData.access_token - New access token
   * @param {string} tokenData.refresh_token - New refresh token (optional)
   * @param {number} tokenData.expires_in - Seconds until expiry
   */
  GoogleAuthToken.prototype.updateTokens = async function(tokenData, options = {}) {
    // Set new access token
    this.setAccessToken(tokenData.access_token);

    // Update refresh token if provided
    if (tokenData.refresh_token) {
      this.setRefreshToken(tokenData.refresh_token);
    }

    // Calculate expiry time (expires_in is in seconds)
    const expiresIn = tokenData.expires_in || 3600; // Default 1 hour
    this.token_expires_at = new Date(Date.now() + expiresIn * 1000);

    await this.save(options);
    return this;
  };

  /**
   * Revoke tokens (delete record)
   */
  GoogleAuthToken.prototype.revoke = async function(options = {}) {
    await this.destroy(options);
  };

  /**
   * Get time until expiry in minutes
   * @returns {number|null} - Minutes until expiry, or null if expired
   */
  GoogleAuthToken.prototype.getMinutesUntilExpiry = function() {
    if (!this.token_expires_at) return null;

    const now = new Date();
    const expiry = new Date(this.token_expires_at);

    if (expiry <= now) return null; // Already expired

    return Math.round((expiry.getTime() - now.getTime()) / (1000 * 60));
  };

  /**
   * Get safe token data for API responses
   * @returns {Object}
   */
  GoogleAuthToken.prototype.getSafeData = function() {
    return {
      id: this.id,
      user_id: this.user_id,
      google_email: this.google_email,
      google_id: this.google_id,
      token_expires_at: this.token_expires_at,
      is_expired: this.isExpired(),
      will_expire_soon: this.willExpireSoon(),
      minutes_until_expiry: this.getMinutesUntilExpiry(),
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  };

  /**
   * Class Methods
   */

  /**
   * Find token by user
   * @param {string} userId - User UUID
   * @returns {Promise<GoogleAuthToken|null>}
   */
  GoogleAuthToken.findByUser = async function(userId) {
    return await GoogleAuthToken.findOne({
      where: { user_id: userId },
    });
  };

  /**
   * Create or update token for user
   * @param {string} userId - User UUID
   * @param {Object} tokenData - Token data from Google OAuth
   * @param {Object} userInfo - Google user info (email, id)
   * @returns {Promise<GoogleAuthToken>}
   */
  GoogleAuthToken.createOrUpdateForUser = async function(userId, tokenData, userInfo = {}) {
    const existingToken = await GoogleAuthToken.findByUser(userId);

    // Calculate expiry time
    const expiresIn = tokenData.expires_in || 3600;
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    if (existingToken) {
      // Update existing token
      existingToken.setAccessToken(tokenData.access_token);
      if (tokenData.refresh_token) {
        existingToken.setRefreshToken(tokenData.refresh_token);
      }
      existingToken.token_expires_at = tokenExpiresAt;

      // Update Google user info if provided
      if (userInfo.email) existingToken.google_email = userInfo.email;
      if (userInfo.id) existingToken.google_id = userInfo.id;

      await existingToken.save();
      return existingToken;
    } else {
      // Create new token
      return await GoogleAuthToken.create({
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: tokenExpiresAt,
        google_email: userInfo.email || null,
        google_id: userInfo.id || null,
      });
    }
  };

  /**
   * Find expired tokens
   * @returns {Promise<GoogleAuthToken[]>}
   */
  GoogleAuthToken.findExpired = async function() {
    const { Op } = sequelize.Sequelize;

    return await GoogleAuthToken.findAll({
      where: {
        token_expires_at: { [Op.lt]: new Date() },
      },
    });
  };

  /**
   * Find tokens expiring soon (within 10 minutes)
   * @returns {Promise<GoogleAuthToken[]>}
   */
  GoogleAuthToken.findExpiringSoon = async function() {
    const { Op } = sequelize.Sequelize;
    const tenMinutesFromNow = new Date();
    tenMinutesFromNow.setMinutes(tenMinutesFromNow.getMinutes() + 10);

    return await GoogleAuthToken.findAll({
      where: {
        token_expires_at: {
          [Op.lte]: tenMinutesFromNow,
          [Op.gt]: new Date(),
        },
      },
    });
  };

  /**
   * Cleanup expired tokens older than 7 days
   * @returns {Promise<number>} - Number of deleted records
   */
  GoogleAuthToken.cleanupExpired = async function() {
    const { Op } = sequelize.Sequelize;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const result = await GoogleAuthToken.destroy({
      where: {
        token_expires_at: { [Op.lt]: sevenDaysAgo },
      },
    });

    return result;
  };

  /**
   * Model Associations
   */
  GoogleAuthToken.associate = (models) => {
    // Token belongs to User (one-to-one)
    GoogleAuthToken.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE',
    });
  };

  /**
   * Scopes for common queries
   */
  GoogleAuthToken.addScope('expired', {
    where: {
      token_expires_at: {
        [sequelize.Sequelize.Op.lt]: new Date(),
      },
    },
  });

  GoogleAuthToken.addScope('active', {
    where: {
      token_expires_at: {
        [sequelize.Sequelize.Op.gt]: new Date(),
      },
    },
  });

  GoogleAuthToken.addScope('withUser', {
    include: [
      {
        association: 'user',
        attributes: ['id', 'username', 'email', 'role'],
      },
    ],
  });

  /**
   * Override toJSON to hide encrypted tokens
   */
  GoogleAuthToken.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());

    // Remove encrypted tokens from JSON output
    delete values.access_token;
    delete values.refresh_token;

    // Add safe computed properties
    values.is_expired = this.isExpired();
    values.will_expire_soon = this.willExpireSoon();
    values.minutes_until_expiry = this.getMinutesUntilExpiry();

    return values;
  };

  return GoogleAuthToken;
};
