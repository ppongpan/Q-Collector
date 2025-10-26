/**
 * DSRRequest Model
 * Manages Data Subject Rights requests (access, rectification, erasure, portability)
 */

module.exports = (sequelize, DataTypes) => {
  const DSRRequest = sequelize.define('DSRRequest', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    profile_id: {
      type: DataTypes.UUID,
      allowNull: true, // Allow null for backward compatibility
      references: {
        model: 'unified_user_profiles',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    request_type: {
      type: DataTypes.ENUM(
        'access',
        'rectification',
        'erasure',
        'portability',
        'restriction',
        'objection'
      ),
      allowNull: false,
    },
    user_identifier: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    verification_method: {
      type: DataTypes.ENUM(
        'email_verification',
        'phone_verification',
        'id_card_verification',
        'manual_verification',
        'not_verified'
      ),
      allowNull: false,
      defaultValue: 'not_verified',
    },
    verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    request_details: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      validate: {
        isValidJSON(value) {
          if (typeof value !== 'object' || value === null) {
            throw new Error('request_details must be a valid JSON object');
          }
        },
      },
    },
    status: {
      type: DataTypes.ENUM(
        'pending',
        'in_progress',
        'completed',
        'rejected',
        'cancelled'
      ),
      allowNull: false,
      defaultValue: 'pending',
    },
    status_history: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      validate: {
        isArray(value) {
          if (!Array.isArray(value)) {
            throw new Error('status_history must be an array');
          }
        },
      },
    },
    processed_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    response_data: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
    response_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.INET,
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    deadline_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // v0.8.7-dev: Enhanced workflow tracking fields
    dsr_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
      comment: 'Unique DSR identifier: DSR-YYYYMMDD-XXXX',
    },
    // Review tracking
    reviewed_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
      comment: 'User who reviewed this DSR request',
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when DSR was reviewed',
    },
    review_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes from data controller review',
    },
    // Approval tracking
    approved_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
      comment: 'User who approved this DSR request',
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when DSR was approved',
    },
    approval_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes explaining approval decision',
    },
    // Rejection tracking
    rejected_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
      comment: 'User who rejected this DSR request',
    },
    rejected_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when DSR was rejected',
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Detailed reason for rejection (min 50 chars)',
    },
    // Execution tracking
    executed_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
      comment: 'User who executed this DSR request',
    },
    executed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when DSR actions were executed',
    },
    execution_details: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Details of execution actions taken',
    },
    // Notification tracking
    notification_sent_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when notification was sent to data subject',
    },
    // Form tracking
    affected_forms: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      defaultValue: [],
      comment: 'Array of form IDs affected by this DSR',
    },
    // Legal assessment
    legal_basis_assessment: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Data controller legal basis assessment under PDPA',
    },
    // Completion tracking
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when DSR was fully completed',
    },
  }, {
    tableName: 'dsr_requests',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['profile_id'] }, // Added for profile linking
      { fields: ['user_identifier'] },
      { fields: ['status'] },
      { fields: ['request_type'] },
      { fields: ['created_at'] },
      { fields: ['processed_by'] },
      { fields: ['deadline_date'] },
      { fields: ['verification_method'] },
      {
        fields: ['user_identifier', 'status'],
        name: 'dsr_requests_user_status_idx',
      },
    ],
    hooks: {
      /**
       * Before create: Set deadline date (30 days from now)
       */
      beforeCreate: async (request) => {
        if (!request.deadline_date) {
          const deadline = new Date();
          deadline.setDate(deadline.getDate() + 30);
          request.deadline_date = deadline;
        }

        // Initialize status history
        request.status_history = [{
          status: 'pending',
          timestamp: new Date(),
          note: 'Request created',
        }];
      },
    },
  });

  /**
   * Instance Methods
   */

  /**
   * Update status with history tracking
   * @param {string} newStatus - New status
   * @param {string|null} userId - User making the change
   * @param {string|null} note - Optional note
   * @returns {Promise<DSRRequest>}
   */
  DSRRequest.prototype.updateStatus = async function(newStatus, userId = null, note = null) {
    const oldStatus = this.status;
    this.status = newStatus;

    // Add to status history
    this.status_history.push({
      status: newStatus,
      timestamp: new Date(),
      changed_by: userId,
      note: note || `Status changed from ${oldStatus} to ${newStatus}`,
    });

    // Set processed_at and processed_by if completing
    if (newStatus === 'completed' || newStatus === 'rejected') {
      this.processed_at = new Date();
      this.processed_by = userId;
    }

    await this.save();
    return this;
  };

  /**
   * Verify user identity
   * @param {string} method - Verification method
   * @returns {Promise<DSRRequest>}
   */
  DSRRequest.prototype.verify = async function(method) {
    this.verification_method = method;
    this.verified_at = new Date();
    await this.save();
    return this;
  };

  /**
   * Check if request is overdue
   * @returns {boolean}
   */
  DSRRequest.prototype.isOverdue = function() {
    if (!this.deadline_date) return false;
    return new Date() > this.deadline_date && this.status !== 'completed';
  };

  /**
   * Get days until deadline
   * @returns {number|null}
   */
  DSRRequest.prototype.getDaysUntilDeadline = function() {
    if (!this.deadline_date) return null;
    const now = new Date();
    const diff = this.deadline_date - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  /**
   * Complete request with response data
   * @param {Object} responseData - Response data
   * @param {string} userId - Admin user ID
   * @param {string|null} notes - Optional notes
   * @returns {Promise<DSRRequest>}
   */
  DSRRequest.prototype.complete = async function(responseData, userId, notes = null) {
    this.response_data = responseData;
    this.response_notes = notes;
    await this.updateStatus('completed', userId, 'Request completed successfully');
    return this;
  };

  /**
   * Reject request
   * @param {string} reason - Rejection reason
   * @param {string} userId - Admin user ID
   * @returns {Promise<DSRRequest>}
   */
  DSRRequest.prototype.reject = async function(reason, userId) {
    this.response_notes = reason;
    await this.updateStatus('rejected', userId, `Request rejected: ${reason}`);
    return this;
  };

  /**
   * Get full request with related data
   * @returns {Promise<DSRRequest>}
   */
  DSRRequest.prototype.getFullRequest = async function() {
    return await DSRRequest.findByPk(this.id, {
      include: [
        {
          model: sequelize.models.User,
          as: 'processor',
          attributes: ['id', 'username', 'email', 'role'],
        },
      ],
    });
  };

  /**
   * Class Methods
   */

  /**
   * Find requests by user identifier
   * @param {string} identifier - Email, phone, or other identifier
   * @returns {Promise<DSRRequest[]>}
   */
  DSRRequest.findByUserIdentifier = async function(identifier) {
    return await DSRRequest.findAll({
      where: { user_identifier: identifier },
      order: [['created_at', 'DESC']],
    });
  };

  /**
   * Find pending requests
   * @returns {Promise<DSRRequest[]>}
   */
  DSRRequest.findPending = async function() {
    return await DSRRequest.findAll({
      where: { status: 'pending' },
      order: [['created_at', 'ASC']],
      include: [
        {
          model: sequelize.models.User,
          as: 'processor',
          attributes: ['id', 'username', 'email'],
        },
      ],
    });
  };

  /**
   * Find overdue requests
   * @returns {Promise<DSRRequest[]>}
   */
  DSRRequest.findOverdue = async function() {
    const { Op } = sequelize.Sequelize;

    return await DSRRequest.findAll({
      where: {
        deadline_date: { [Op.lt]: new Date() },
        status: { [Op.notIn]: ['completed', 'rejected', 'cancelled'] },
      },
      order: [['deadline_date', 'ASC']],
      include: [
        {
          model: sequelize.models.User,
          as: 'processor',
          attributes: ['id', 'username', 'email'],
        },
      ],
    });
  };

  /**
   * Get statistics by request type
   * @returns {Promise<Object>}
   */
  DSRRequest.getStatistics = async function() {
    const stats = await DSRRequest.findAll({
      attributes: [
        'request_type',
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['request_type', 'status'],
      raw: true,
    });

    const result = {
      total: 0,
      by_type: {},
      by_status: {
        pending: 0,
        in_progress: 0,
        completed: 0,
        rejected: 0,
        cancelled: 0,
      },
    };

    stats.forEach((stat) => {
      const count = parseInt(stat.count);
      result.total += count;

      if (!result.by_type[stat.request_type]) {
        result.by_type[stat.request_type] = 0;
      }
      result.by_type[stat.request_type] += count;

      result.by_status[stat.status] += count;
    });

    // Count overdue requests
    const { Op } = sequelize.Sequelize;
    const overdueCount = await DSRRequest.count({
      where: {
        deadline_date: { [Op.lt]: new Date() },
        status: { [Op.notIn]: ['completed', 'rejected', 'cancelled'] },
      },
    });
    result.overdue = overdueCount;

    return result;
  };

  /**
   * Model Associations
   */
  DSRRequest.associate = (models) => {
    // DSRRequest belongs to User (processor)
    DSRRequest.belongsTo(models.User, {
      foreignKey: 'processed_by',
      as: 'processor',
      onDelete: 'SET NULL',
    });

    // DSRRequest belongs to UnifiedUserProfile
    DSRRequest.belongsTo(models.UnifiedUserProfile, {
      foreignKey: 'profile_id',
      as: 'profile',
      onDelete: 'SET NULL',
    });
  };

  /**
   * Scopes for common queries
   */
  DSRRequest.addScope('pending', {
    where: { status: 'pending' },
  });

  DSRRequest.addScope('inProgress', {
    where: { status: 'in_progress' },
  });

  DSRRequest.addScope('completed', {
    where: { status: 'completed' },
  });

  DSRRequest.addScope('rejected', {
    where: { status: 'rejected' },
  });

  DSRRequest.addScope('verified', {
    where: {
      verification_method: {
        [sequelize.Sequelize.Op.ne]: 'not_verified',
      },
    },
  });

  DSRRequest.addScope('unverified', {
    where: { verification_method: 'not_verified' },
  });

  DSRRequest.addScope('recent', {
    order: [['created_at', 'DESC']],
    limit: 20,
  });

  /**
   * Override toJSON to convert snake_case to camelCase for frontend
   */
  DSRRequest.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());

    // Map snake_case to camelCase
    if (values.profile_id !== undefined) {
      values.profileId = values.profile_id;
      delete values.profile_id;
    }

    if (values.request_type !== undefined) {
      values.requestType = values.request_type;
      delete values.request_type;
    }

    if (values.user_identifier !== undefined) {
      values.userIdentifier = values.user_identifier;
      delete values.user_identifier;
    }

    if (values.verification_method !== undefined) {
      values.verificationMethod = values.verification_method;
      delete values.verification_method;
    }

    if (values.verified_at !== undefined) {
      values.verifiedAt = values.verified_at;
      delete values.verified_at;
    }

    if (values.request_details !== undefined) {
      values.requestDetails = values.request_details;
      delete values.request_details;
    }

    if (values.status_history !== undefined) {
      values.statusHistory = values.status_history;
      delete values.status_history;
    }

    if (values.processed_by !== undefined) {
      values.processedBy = values.processed_by;
      delete values.processed_by;
    }

    if (values.processed_at !== undefined) {
      values.processedAt = values.processed_at;
      delete values.processed_at;
    }

    if (values.response_data !== undefined) {
      values.responseData = values.response_data;
      delete values.response_data;
    }

    if (values.response_notes !== undefined) {
      values.responseNotes = values.response_notes;
      delete values.response_notes;
    }

    if (values.ip_address !== undefined) {
      values.ipAddress = values.ip_address;
      delete values.ip_address;
    }

    if (values.user_agent !== undefined) {
      values.userAgent = values.user_agent;
      delete values.user_agent;
    }

    if (values.deadline_date !== undefined) {
      values.deadlineDate = values.deadline_date;
      delete values.deadline_date;
    }

    if (values.created_at !== undefined) {
      values.createdAt = values.created_at;
      delete values.created_at;
    }

    if (values.updated_at !== undefined) {
      values.updatedAt = values.updated_at;
      delete values.updated_at;
    }

    // v0.8.7-dev: New workflow tracking fields
    if (values.dsr_number !== undefined) {
      values.dsrNumber = values.dsr_number;
      delete values.dsr_number;
    }

    if (values.reviewed_by !== undefined) {
      values.reviewedBy = values.reviewed_by;
      delete values.reviewed_by;
    }

    if (values.reviewed_at !== undefined) {
      values.reviewedAt = values.reviewed_at;
      delete values.reviewed_at;
    }

    if (values.review_notes !== undefined) {
      values.reviewNotes = values.review_notes;
      delete values.review_notes;
    }

    if (values.approved_by !== undefined) {
      values.approvedBy = values.approved_by;
      delete values.approved_by;
    }

    if (values.approved_at !== undefined) {
      values.approvedAt = values.approved_at;
      delete values.approved_at;
    }

    if (values.approval_notes !== undefined) {
      values.approvalNotes = values.approval_notes;
      delete values.approval_notes;
    }

    if (values.rejected_by !== undefined) {
      values.rejectedBy = values.rejected_by;
      delete values.rejected_by;
    }

    if (values.rejected_at !== undefined) {
      values.rejectedAt = values.rejected_at;
      delete values.rejected_at;
    }

    if (values.rejection_reason !== undefined) {
      values.rejectionReason = values.rejection_reason;
      delete values.rejection_reason;
    }

    if (values.executed_by !== undefined) {
      values.executedBy = values.executed_by;
      delete values.executed_by;
    }

    if (values.executed_at !== undefined) {
      values.executedAt = values.executed_at;
      delete values.executed_at;
    }

    if (values.execution_details !== undefined) {
      values.executionDetails = values.execution_details;
      delete values.execution_details;
    }

    if (values.notification_sent_at !== undefined) {
      values.notificationSentAt = values.notification_sent_at;
      delete values.notification_sent_at;
    }

    if (values.affected_forms !== undefined) {
      values.affectedForms = values.affected_forms;
      delete values.affected_forms;
    }

    if (values.legal_basis_assessment !== undefined) {
      values.legalBasisAssessment = values.legal_basis_assessment;
      delete values.legal_basis_assessment;
    }

    if (values.completed_at !== undefined) {
      values.completedAt = values.completed_at;
      delete values.completed_at;
    }

    return values;
  };

  return DSRRequest;
};
