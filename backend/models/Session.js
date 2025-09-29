/**
 * Session Model
 * Manages user sessions with JWT tokens
 */

module.exports = (sequelize, DataTypes) => {
  const Session = sequelize.define('Session', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'JWT access token',
    },
    refresh_token: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'JWT refresh token',
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Token expiration time',
    },
    ip_address: {
      type: DataTypes.INET,
      allowNull: true,
      comment: 'IP address when session created',
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Browser user agent',
    },
    last_used_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Last time this session was used',
    },
  }, {
    tableName: 'sessions',
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['token'], unique: true },
      { fields: ['expires_at'] },
      { fields: ['last_used_at'] },
    ],
  });

  /**
   * Instance Methods
   */

  /**
   * Check if session is expired
   * @returns {boolean}
   */
  Session.prototype.isExpired = function() {
    return new Date() > this.expires_at;
  };

  /**
   * Check if session is active
   * @returns {boolean}
   */
  Session.prototype.isActive = function() {
    return !this.isExpired();
  };

  /**
   * Update last used timestamp
   * @returns {Promise<Session>}
   */
  Session.prototype.updateLastUsed = async function() {
    this.last_used_at = new Date();
    await this.save();
    return this;
  };

  /**
   * Revoke session
   * @returns {Promise<void>}
   */
  Session.prototype.revoke = async function() {
    await this.destroy();
  };

  /**
   * Get time until expiration in seconds
   * @returns {number}
   */
  Session.prototype.getTimeUntilExpiry = function() {
    const now = new Date();
    const expiry = new Date(this.expires_at);
    return Math.max(0, Math.floor((expiry - now) / 1000));
  };

  /**
   * Get session age in seconds
   * @returns {number}
   */
  Session.prototype.getAge = function() {
    const now = new Date();
    const created = new Date(this.createdAt);
    return Math.floor((now - created) / 1000);
  };

  /**
   * Get browser info from user agent
   * @returns {Object}
   */
  Session.prototype.getBrowserInfo = function() {
    if (!this.user_agent) {
      return { browser: 'Unknown', os: 'Unknown' };
    }

    const ua = this.user_agent;
    let browser = 'Unknown';
    let os = 'Unknown';

    // Detect browser
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';
    else if (ua.includes('MSIE') || ua.includes('Trident')) browser = 'Internet Explorer';

    // Detect OS
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS')) os = 'iOS';

    return { browser, os };
  };

  /**
   * Class Methods
   */

  /**
   * Create new session
   * @param {Object} data - Session data
   * @returns {Promise<Session>}
   */
  Session.createSession = async function(data) {
    const {
      userId,
      token,
      refreshToken,
      expiresAt,
      ipAddress = null,
      userAgent = null,
    } = data;

    return await Session.create({
      user_id: userId,
      token,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      ip_address: ipAddress,
      user_agent: userAgent,
      last_used_at: new Date(),
    });
  };

  /**
   * Find session by token
   * @param {string} token - Access token
   * @returns {Promise<Session|null>}
   */
  Session.findByToken = async function(token) {
    return await Session.findOne({
      where: { token },
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'role', 'is_active'],
        },
      ],
    });
  };

  /**
   * Find session by refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Session|null>}
   */
  Session.findByRefreshToken = async function(refreshToken) {
    return await Session.findOne({
      where: { refresh_token: refreshToken },
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'role', 'is_active'],
        },
      ],
    });
  };

  /**
   * Get all active sessions for a user
   * @param {string} userId - User ID
   * @returns {Promise<Session[]>}
   */
  Session.findActiveByUser = async function(userId) {
    return await Session.findAll({
      where: {
        user_id: userId,
        expires_at: {
          [sequelize.Sequelize.Op.gt]: new Date(),
        },
      },
      order: [['last_used_at', 'DESC']],
    });
  };

  /**
   * Revoke all sessions for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>}
   */
  Session.revokeAllByUser = async function(userId) {
    return await Session.destroy({
      where: { user_id: userId },
    });
  };

  /**
   * Revoke all sessions except current
   * @param {string} userId - User ID
   * @param {string} currentSessionId - Current session ID
   * @returns {Promise<number>}
   */
  Session.revokeAllExceptCurrent = async function(userId, currentSessionId) {
    return await Session.destroy({
      where: {
        user_id: userId,
        id: {
          [sequelize.Sequelize.Op.ne]: currentSessionId,
        },
      },
    });
  };

  /**
   * Clean expired sessions
   * @returns {Promise<number>}
   */
  Session.cleanExpiredSessions = async function() {
    return await Session.destroy({
      where: {
        expires_at: {
          [sequelize.Sequelize.Op.lt]: new Date(),
        },
      },
    });
  };

  /**
   * Clean inactive sessions (not used for more than X days)
   * @param {number} daysInactive - Number of days of inactivity
   * @returns {Promise<number>}
   */
  Session.cleanInactiveSessions = async function(daysInactive = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

    return await Session.destroy({
      where: {
        last_used_at: {
          [sequelize.Sequelize.Op.lt]: cutoffDate,
        },
      },
    });
  };

  /**
   * Get session statistics
   * @returns {Promise<Object>}
   */
  Session.getStatistics = async function() {
    const total = await Session.count();
    const active = await Session.count({
      where: {
        expires_at: {
          [sequelize.Sequelize.Op.gt]: new Date(),
        },
      },
    });
    const expired = total - active;

    return {
      total,
      active,
      expired,
    };
  };

  /**
   * Model Associations
   */
  Session.associate = (models) => {
    // Session belongs to User
    Session.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE',
    });
  };

  /**
   * Scopes for common queries
   */
  Session.addScope('active', {
    where: {
      expires_at: {
        [sequelize.Sequelize.Op.gt]: new Date(),
      },
    },
  });

  Session.addScope('expired', {
    where: {
      expires_at: {
        [sequelize.Sequelize.Op.lte]: new Date(),
      },
    },
  });

  Session.addScope('recent', {
    order: [['last_used_at', 'DESC']],
    limit: 20,
  });

  Session.addScope('withUser', {
    include: [
      {
        model: sequelize.models.User,
        as: 'user',
        attributes: ['id', 'username', 'email', 'role'],
      },
    ],
  });

  return Session;
};