/**
 * AuditLog Model
 * Records all user actions for audit trail
 */

module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
      comment: 'User who performed the action',
    },
    action: {
      type: DataTypes.ENUM('create', 'read', 'update', 'delete', 'login', 'logout'),
      allowNull: false,
    },
    entity_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Type of entity (form, submission, user, etc.)',
    },
    entity_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID of the affected entity',
    },
    old_value: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Previous value before change',
    },
    new_value: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'New value after change',
    },
    ip_address: {
      type: DataTypes.INET,
      allowNull: true,
      comment: 'IP address of the user',
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Browser user agent',
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'audit_logs',
    timestamps: false, // Using custom timestamp field
    underscored: false,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['entity_type'] },
      { fields: ['entity_id'] },
      { fields: ['timestamp'] },
      { fields: ['action'] },
      { fields: ['user_id', 'timestamp'] },
      { fields: ['entity_type', 'entity_id'] },
    ],
  });

  /**
   * Instance Methods
   */

  /**
   * Get human-readable description of audit log
   * @returns {string}
   */
  AuditLog.prototype.getDescription = function() {
    const actionDescriptions = {
      create: 'created',
      read: 'viewed',
      update: 'updated',
      delete: 'deleted',
      login: 'logged in',
      logout: 'logged out',
    };

    const action = actionDescriptions[this.action] || this.action;

    if (this.action === 'login' || this.action === 'logout') {
      return `User ${action}`;
    }

    return `User ${action} ${this.entity_type}${this.entity_id ? ` (${this.entity_id})` : ''}`;
  };

  /**
   * Get changes between old and new values
   * @returns {Object}
   */
  AuditLog.prototype.getChanges = function() {
    if (!this.old_value || !this.new_value) {
      return {};
    }

    const changes = {};
    const allKeys = new Set([
      ...Object.keys(this.old_value),
      ...Object.keys(this.new_value),
    ]);

    allKeys.forEach((key) => {
      const oldVal = this.old_value[key];
      const newVal = this.new_value[key];

      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes[key] = {
          from: oldVal,
          to: newVal,
        };
      }
    });

    return changes;
  };

  /**
   * Class Methods
   */

  /**
   * Log an action
   * @param {Object} data - Audit log data
   * @returns {Promise<AuditLog>}
   */
  AuditLog.logAction = async function(data) {
    const {
      userId,
      action,
      entityType,
      entityId = null,
      oldValue = null,
      newValue = null,
      ipAddress = null,
      userAgent = null,
    } = data;

    return await AuditLog.create({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_value: oldValue,
      new_value: newValue,
      ip_address: ipAddress,
      user_agent: userAgent,
      timestamp: new Date(),
    });
  };

  /**
   * Get audit trail for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<AuditLog[]>}
   */
  AuditLog.findByUser = async function(userId, options = {}) {
    const { limit = 100, offset = 0, action = null } = options;

    const where = { user_id: userId };
    if (action) {
      where.action = action;
    }

    return await AuditLog.findAll({
      where,
      order: [['timestamp', 'DESC']],
      limit,
      offset,
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'role'],
        },
      ],
    });
  };

  /**
   * Get audit trail for an entity
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @param {Object} options - Query options
   * @returns {Promise<AuditLog[]>}
   */
  AuditLog.findByEntity = async function(entityType, entityId, options = {}) {
    const { limit = 100, offset = 0 } = options;

    return await AuditLog.findAll({
      where: {
        entity_type: entityType,
        entity_id: entityId,
      },
      order: [['timestamp', 'DESC']],
      limit,
      offset,
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'role'],
        },
      ],
    });
  };

  /**
   * Get recent activity
   * @param {Object} options - Query options
   * @returns {Promise<AuditLog[]>}
   */
  AuditLog.getRecentActivity = async function(options = {}) {
    const { limit = 50, entityType = null, action = null } = options;

    const where = {};
    if (entityType) where.entity_type = entityType;
    if (action) where.action = action;

    return await AuditLog.findAll({
      where,
      order: [['timestamp', 'DESC']],
      limit,
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'role'],
        },
      ],
    });
  };

  /**
   * Get audit statistics
   * @param {Object} options - Query options
   * @returns {Promise<Object>}
   */
  AuditLog.getStatistics = async function(options = {}) {
    const { startDate = null, endDate = null } = options;

    const where = {};
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp[sequelize.Sequelize.Op.gte] = startDate;
      if (endDate) where.timestamp[sequelize.Sequelize.Op.lte] = endDate;
    }

    const stats = await AuditLog.findAll({
      where,
      attributes: [
        'action',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['action'],
      raw: true,
    });

    const result = {
      total: 0,
      byAction: {},
    };

    stats.forEach((stat) => {
      const count = parseInt(stat.count);
      result.byAction[stat.action] = count;
      result.total += count;
    });

    return result;
  };

  /**
   * Clean old audit logs
   * @param {number} daysToKeep - Number of days to keep logs
   * @returns {Promise<number>}
   */
  AuditLog.cleanOldLogs = async function(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const deleted = await AuditLog.destroy({
      where: {
        timestamp: {
          [sequelize.Sequelize.Op.lt]: cutoffDate,
        },
      },
    });

    return deleted;
  };

  /**
   * Model Associations
   */
  AuditLog.associate = (models) => {
    // AuditLog belongs to User
    AuditLog.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'SET NULL',
    });
  };

  /**
   * Scopes for common queries
   */
  AuditLog.addScope('recent', {
    order: [['timestamp', 'DESC']],
    limit: 50,
  });

  AuditLog.addScope('today', {
    where: {
      timestamp: {
        [sequelize.Sequelize.Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    },
    order: [['timestamp', 'DESC']],
  });

  AuditLog.addScope('logins', {
    where: { action: 'login' },
    order: [['timestamp', 'DESC']],
  });

  return AuditLog;
};