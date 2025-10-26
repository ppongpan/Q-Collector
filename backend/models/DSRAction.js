/**
 * DSRAction Model
 * Tracks all actions taken on Data Subject Rights (DSR) requests
 *
 * Purpose: Complete audit trail for DSR request processing
 * PDPA Requirements: Section 30-38 (DSR Rights), Section 39 (Audit Trail)
 *
 * @version v0.8.2-dev
 * @date 2025-10-24
 */

module.exports = (sequelize, DataTypes) => {
  const DSRAction = sequelize.define('DSRAction', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    dsr_request_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'dsr_requests',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      comment: 'Reference to the DSR request'
    },
    action_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['created', 'assigned', 'in_progress', 'approved', 'rejected', 'completed', 'cancelled', 'comment_added', 'data_exported', 'data_deleted']]
      },
      comment: 'Type of action taken'
    },
    old_status: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Previous DSR request status'
    },
    new_status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'New DSR request status'
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
      comment: 'User who performed this action'
    },
    performed_by_username: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Username (cached for historical records)'
    },
    performed_by_role: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'User role at time of action'
    },
    performed_by_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'User email (cached for historical records)'
    },
    legal_basis: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Legal justification for action (PDPA Section 24-26)'
    },
    justification: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Business justification for approval/rejection'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional notes or comments'
    },
    attachments_json: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of attachment metadata (file paths, names, sizes)'
    },
    ip_address: {
      type: DataTypes.INET,
      allowNull: true,
      comment: 'IP address of the action'
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Browser/device information'
    },
    duration_seconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0
      },
      comment: 'Time taken to complete this action (for SLA tracking)'
    },
    // v0.8.7-dev: Enhanced workflow tracking fields
    actor_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Full name of the user (for audit trail)'
    },
    action_metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Additional metadata about the action'
    },
    pdpa_section: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Specific PDPA section reference (e.g., Section 30, 31, etc.)'
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when this action was completed'
    },
    is_automated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this action was automated (vs manual)'
    },
  }, {
    tableName: 'dsr_actions',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false, // No updates allowed (audit trail)
    indexes: [
      { fields: ['dsr_request_id'] },
      { fields: ['action_type'] },
      { fields: ['performed_by_user_id'] },
      { fields: ['new_status'] },
      { fields: ['created_at'] },
      { fields: ['dsr_request_id', 'created_at'] },
    ],
  });

  /**
   * Model Associations
   */
  DSRAction.associate = (models) => {
    // Belongs to DSRRequest
    DSRAction.belongsTo(models.DSRRequest, {
      foreignKey: 'dsr_request_id',
      as: 'dsrRequest',
      onDelete: 'CASCADE',
    });

    // Belongs to User (performer)
    DSRAction.belongsTo(models.User, {
      foreignKey: 'performed_by_user_id',
      as: 'performedBy',
      onDelete: 'SET NULL',
    });
  };

  /**
   * Static Methods
   */

  /**
   * Create action record with user context
   * @param {Object} data - Action data
   * @param {Object} user - Performing user object
   * @param {Object} options - Sequelize options (e.g., transaction)
   * @returns {Promise<DSRAction>}
   */
  DSRAction.createAction = async function(data, user, options = {}) {
    const actionData = {
      ...data,
      performed_by_user_id: user?.id,
      performed_by_username: user?.username,
      performed_by_email: user?.email,
      performed_by_role: user?.role,
    };

    return await DSRAction.create(actionData, options);
  };

  /**
   * Get complete action timeline for a DSR request
   * @param {string} dsrRequestId - DSR request ID
   * @returns {Promise<Array>}
   */
  DSRAction.getTimeline = async function(dsrRequestId) {
    return await DSRAction.findAll({
      where: { dsr_request_id: dsrRequestId },
      include: [
        {
          model: sequelize.models.User,
          as: 'performedBy',
          attributes: ['id', 'username', 'email', 'role']
        }
      ],
      order: [['created_at', 'ASC']]
    });
  };

  /**
   * Instance Methods
   */

  /**
   * Calculate elapsed time from previous action (for SLA reporting)
   * @returns {Promise<number|null>} Duration in seconds
   */
  DSRAction.prototype.getElapsedFromPrevious = async function() {
    const previousAction = await DSRAction.findOne({
      where: {
        dsr_request_id: this.dsr_request_id,
        created_at: {
          [sequelize.Sequelize.Op.lt]: this.created_at
        }
      },
      order: [['created_at', 'DESC']]
    });

    if (!previousAction) return null;

    const diff = new Date(this.created_at) - new Date(previousAction.created_at);
    return Math.floor(diff / 1000); // Return seconds
  };

  return DSRAction;
};
