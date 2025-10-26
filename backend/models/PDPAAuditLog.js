/**
 * PDPAAuditLog Model
 * Comprehensive audit trail for all PDPA compliance events
 *
 * Purpose: Centralized logging for PDPA Thailand compliance
 * PDPA Requirements:
 * - Section 39: Controllers must maintain audit logs
 * - Section 41: Logs retained for 3+ years
 * - Section 77: Evidence for PDPC investigations
 *
 * @version v0.8.2-dev
 * @date 2025-10-24
 */

module.exports = (sequelize, DataTypes) => {
  const PDPAAuditLog = sequelize.define('PDPAAuditLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    event_category: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['dsr_request', 'consent_change', 'data_access', 'data_export', 'data_deletion', 'data_modification', 'security_event']]
      },
      comment: 'High-level category of the event'
    },
    event_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Specific event type (e.g., dsr_created, consent_withdrawn, profile_viewed)'
    },
    event_severity: {
      type: DataTypes.ENUM('info', 'warning', 'critical'),
      allowNull: false,
      defaultValue: 'info',
      comment: 'Severity level for alerting and compliance reporting'
    },
    profile_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'unified_user_profiles',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      comment: 'Data subject profile affected'
    },
    dsr_request_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'dsr_requests',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      comment: 'Related DSR request'
    },
    consent_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'user_consents',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      comment: 'Related consent record'
    },
    form_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'forms',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      comment: 'Related form'
    },
    submission_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'submissions',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      comment: 'Related submission'
    },
    performed_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      comment: 'User who performed the action'
    },
    performed_by_username: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Username (cached for historical records)'
    },
    performed_by_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Email (cached for historical records)'
    },
    performed_by_role: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'User role at time of event'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Human-readable description of the event'
    },
    details_json: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Additional structured details about the event'
    },
    old_value_json: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Previous value (for change tracking)'
    },
    new_value_json: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'New value (for change tracking)'
    },
    ip_address: {
      type: DataTypes.INET,
      allowNull: true,
      comment: 'IP address of the request'
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Browser/device information'
    },
    request_path: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'API endpoint path'
    },
    request_method: {
      type: DataTypes.STRING(10),
      allowNull: true,
      validate: {
        isIn: [['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']]
      },
      comment: 'HTTP method'
    },
    http_status_code: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 100,
        max: 599
      },
      comment: 'HTTP response status code'
    },
    requires_notification: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this event requires PDPC notification (Section 37)'
    },
    pdpa_article: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Relevant PDPA Thailand section (e.g., "Section 30", "Section 37")'
    },
  }, {
    tableName: 'pdpa_audit_log',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false, // No updates allowed (audit trail is immutable)
    indexes: [
      { fields: ['event_category'] },
      { fields: ['event_type'] },
      { fields: ['event_severity'] },
      { fields: ['profile_id'] },
      { fields: ['dsr_request_id'] },
      { fields: ['consent_id'] },
      { fields: ['performed_by_user_id'] },
      { fields: ['created_at'] },
      { fields: ['requires_notification'] },
      { fields: ['event_category', 'created_at'] },
      { fields: ['profile_id', 'created_at'] },
    ],
  });

  /**
   * Model Associations
   */
  PDPAAuditLog.associate = (models) => {
    // Belongs to UnifiedUserProfile
    PDPAAuditLog.belongsTo(models.UnifiedUserProfile, {
      foreignKey: 'profile_id',
      as: 'profile',
      onDelete: 'SET NULL',
    });

    // Belongs to DSRRequest
    PDPAAuditLog.belongsTo(models.DSRRequest, {
      foreignKey: 'dsr_request_id',
      as: 'dsrRequest',
      onDelete: 'SET NULL',
    });

    // Belongs to UserConsent
    PDPAAuditLog.belongsTo(models.UserConsent, {
      foreignKey: 'consent_id',
      as: 'consent',
      onDelete: 'SET NULL',
    });

    // Belongs to Form
    PDPAAuditLog.belongsTo(models.Form, {
      foreignKey: 'form_id',
      as: 'form',
      onDelete: 'SET NULL',
    });

    // Belongs to Submission
    PDPAAuditLog.belongsTo(models.Submission, {
      foreignKey: 'submission_id',
      as: 'submission',
      onDelete: 'SET NULL',
    });

    // Belongs to User (performer)
    PDPAAuditLog.belongsTo(models.User, {
      foreignKey: 'performed_by_user_id',
      as: 'performedBy',
      onDelete: 'SET NULL',
    });
  };

  /**
   * Static Methods
   */

  /**
   * Log a PDPA compliance event
   * @param {Object} eventData - Event details
   * @param {Object} user - Performing user (if applicable)
   * @param {Object} request - Express request object (if applicable)
   * @param {Object} options - Sequelize options (e.g., transaction)
   * @returns {Promise<PDPAAuditLog>}
   */
  PDPAAuditLog.logEvent = async function(eventData, user = null, request = null, options = {}) {
    const logData = {
      ...eventData,
      performed_by_user_id: user?.id,
      performed_by_username: user?.username,
      performed_by_email: user?.email,
      performed_by_role: user?.role,
      ip_address: request?.ip || request?.connection?.remoteAddress,
      user_agent: request?.get?.('user-agent'),
      request_path: request?.path,
      request_method: request?.method,
    };

    return await PDPAAuditLog.create(logData, options);
  };

  /**
   * Get audit trail for a specific profile
   * @param {string} profileId - Profile ID
   * @param {Object} filters - Additional filters (category, severity, dateRange)
   * @returns {Promise<Array>}
   */
  PDPAAuditLog.getProfileAuditTrail = async function(profileId, filters = {}) {
    const where = { profile_id: profileId };

    if (filters.category) {
      where.event_category = filters.category;
    }
    if (filters.severity) {
      where.event_severity = filters.severity;
    }
    if (filters.startDate || filters.endDate) {
      where.created_at = {};
      if (filters.startDate) {
        where.created_at[sequelize.Sequelize.Op.gte] = filters.startDate;
      }
      if (filters.endDate) {
        where.created_at[sequelize.Sequelize.Op.lte] = filters.endDate;
      }
    }

    return await PDPAAuditLog.findAll({
      where,
      include: [
        {
          model: sequelize.models.User,
          as: 'performedBy',
          attributes: ['id', 'username', 'email', 'role']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: filters.limit || 100
    });
  };

  /**
   * Get events requiring PDPC notification
   * @param {Object} filters - Date range filters
   * @returns {Promise<Array>}
   */
  PDPAAuditLog.getNotificationRequiredEvents = async function(filters = {}) {
    const where = {
      requires_notification: true,
      event_severity: 'critical'
    };

    if (filters.startDate) {
      where.created_at = {
        [sequelize.Sequelize.Op.gte]: filters.startDate
      };
    }

    return await PDPAAuditLog.findAll({
      where,
      include: [
        {
          model: sequelize.models.UnifiedUserProfile,
          as: 'profile',
          attributes: ['id', 'primary_email', 'primary_phone', 'full_name']
        }
      ],
      order: [['created_at', 'DESC']]
    });
  };

  return PDPAAuditLog;
};
