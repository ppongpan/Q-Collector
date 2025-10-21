/**
 * NotificationHistory Model
 * Tracks notification attempts and results
 *
 * Q-Collector Advanced Telegram Notification System v0.8.0
 */

module.exports = (sequelize, DataTypes) => {
  const NotificationHistory = sequelize.define('NotificationHistory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    notification_rule_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'notification_rules',
        key: 'id',
      },
      onDelete: 'CASCADE',
      comment: 'Reference to notification rule',
    },
    submission_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'submissions',
        key: 'id',
      },
      onDelete: 'CASCADE',
      comment: 'Submission that triggered notification (null for scheduled)',
    },
    sub_submission_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Sub-form submission ID if applicable',
    },
    condition_met: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      comment: 'Whether condition formula evaluated to true',
    },
    condition_result: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Full formula evaluation result',
    },
    message_sent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Actual message sent to Telegram',
    },
    telegram_response: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Telegram API response',
    },
    status: {
      type: DataTypes.ENUM('pending', 'sent', 'failed', 'skipped'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Notification status',
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error details if failed',
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When notification was sent',
    },
  }, {
    tableName: 'notification_history',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false, // No updated_at column
    indexes: [
      { fields: ['notification_rule_id'] },
      { fields: ['submission_id'] },
      { fields: ['status'] },
      { fields: ['sent_at'] },
      { fields: ['created_at'] },
      { fields: ['notification_rule_id', 'submission_id'] }, // For duplicate detection
      { fields: ['notification_rule_id', 'status', 'sent_at'] }, // For reporting
      { fields: ['notification_rule_id', 'condition_met'] }, // For condition analysis
    ],
  });

  /**
   * Instance Methods
   */

  /**
   * Mark notification as sent
   * @param {Object} telegramResponse - Response from Telegram API
   * @returns {Promise<NotificationHistory>}
   */
  NotificationHistory.prototype.markAsSent = async function(telegramResponse) {
    this.status = 'sent';
    this.telegram_response = telegramResponse;
    this.sent_at = new Date();
    await this.save();
    return this;
  };

  /**
   * Mark notification as failed
   * @param {string} errorMessage - Error message
   * @returns {Promise<NotificationHistory>}
   */
  NotificationHistory.prototype.markAsFailed = async function(errorMessage) {
    this.status = 'failed';
    this.error_message = errorMessage;
    await this.save();
    return this;
  };

  /**
   * Mark notification as skipped
   * @param {string} reason - Reason for skipping
   * @returns {Promise<NotificationHistory>}
   */
  NotificationHistory.prototype.markAsSkipped = async function(reason) {
    this.status = 'skipped';
    this.error_message = reason;
    await this.save();
    return this;
  };

  /**
   * Get formatted history entry for display
   * @returns {Object}
   */
  NotificationHistory.prototype.getFormattedEntry = function() {
    return {
      id: this.id,
      status: this.status,
      conditionMet: this.condition_met,
      messageSent: this.message_sent,
      sentAt: this.sent_at,
      error: this.error_message,
      createdAt: this.createdAt,
    };
  };

  /**
   * Class Methods
   */

  /**
   * Check if notification has been sent for a submission
   * @param {string} ruleId - Notification rule ID
   * @param {string} submissionId - Submission ID
   * @returns {Promise<boolean>}
   */
  NotificationHistory.hasBeenSent = async function(ruleId, submissionId) {
    const existing = await NotificationHistory.findOne({
      where: {
        notification_rule_id: ruleId,
        submission_id: submissionId,
        status: 'sent',
      },
    });

    return !!existing;
  };

  /**
   * Get recent history for a rule
   * @param {string} ruleId - Notification rule ID
   * @param {number} limit - Number of records to return
   * @returns {Promise<NotificationHistory[]>}
   */
  NotificationHistory.getRecentHistory = async function(ruleId, limit = 50) {
    return await NotificationHistory.findAll({
      where: {
        notification_rule_id: ruleId,
      },
      order: [['createdAt', 'DESC']],
      limit,
      include: [
        {
          model: sequelize.models.Submission,
          as: 'submission',
          attributes: ['id', 'submitted_at'],
        },
        {
          model: sequelize.models.NotificationRule,
          as: 'notificationRule',
          attributes: ['id', 'name', 'trigger_type'],
        },
      ],
    });
  };

  /**
   * Get failure rate for a rule
   * @param {string} ruleId - Notification rule ID
   * @param {number} days - Number of days to analyze (default: 30)
   * @returns {Promise<Object>} { total, sent, failed, failureRate }
   */
  NotificationHistory.getFailureRate = async function(ruleId, days = 30) {
    const { Op } = sequelize.Sequelize;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await NotificationHistory.findAll({
      where: {
        notification_rule_id: ruleId,
        created_at: {
          [Op.gte]: startDate,
        },
      },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['status'],
      raw: true,
    });

    const result = {
      total: 0,
      pending: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      failureRate: 0,
      period: `${days} days`,
    };

    stats.forEach((stat) => {
      result[stat.status] = parseInt(stat.count);
      result.total += parseInt(stat.count);
    });

    if (result.total > 0) {
      result.failureRate = ((result.failed / result.total) * 100).toFixed(2);
    }

    return result;
  };

  /**
   * Get notification statistics by date range
   * @param {string} ruleId - Notification rule ID (optional)
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>}
   */
  NotificationHistory.getStatsByDateRange = async function(ruleId = null, startDate, endDate) {
    const { Op } = sequelize.Sequelize;

    const where = {
      createdAt: {
        [Op.between]: [startDate, endDate],
      },
    };

    if (ruleId) {
      where.notification_rule_id = ruleId;
    }

    const stats = await NotificationHistory.findAll({
      where,
      attributes: [
        'status',
        'condition_met',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
      ],
      group: ['status', 'condition_met', sequelize.fn('DATE', sequelize.col('created_at'))],
      order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
      raw: true,
    });

    return stats;
  };

  /**
   * Create notification history entry
   * @param {Object} data - Notification data
   * @returns {Promise<NotificationHistory>}
   */
  NotificationHistory.createEntry = async function(data) {
    return await NotificationHistory.create({
      notification_rule_id: data.ruleId,
      submission_id: data.submissionId || null,
      sub_submission_id: data.subSubmissionId || null,
      condition_met: data.conditionMet,
      condition_result: data.conditionResult || null,
      message_sent: data.messageSent || null,
      telegram_response: data.telegramResponse || null,
      status: data.status || 'pending',
      error_message: data.errorMessage || null,
      sent_at: data.sentAt || null,
    });
  };

  /**
   * Clean old history records
   * @param {number} days - Keep records from last X days
   * @returns {Promise<number>} Number of deleted records
   */
  NotificationHistory.cleanOldRecords = async function(days = 90) {
    const { Op } = sequelize.Sequelize;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const deletedCount = await NotificationHistory.destroy({
      where: {
        createdAt: {
          [Op.lt]: cutoffDate,
        },
        status: {
          [Op.in]: ['sent', 'skipped'], // Keep failed records longer for debugging
        },
      },
    });

    return deletedCount;
  };

  /**
   * Model Associations
   */
  NotificationHistory.associate = (models) => {
    // NotificationHistory belongs to NotificationRule
    NotificationHistory.belongsTo(models.NotificationRule, {
      foreignKey: 'notification_rule_id',
      as: 'notificationRule',
      onDelete: 'CASCADE',
    });

    // NotificationHistory belongs to Submission (optional)
    NotificationHistory.belongsTo(models.Submission, {
      foreignKey: 'submission_id',
      as: 'submission',
      onDelete: 'CASCADE',
    });
  };

  /**
   * Scopes for common queries
   */
  NotificationHistory.addScope('sent', {
    where: { status: 'sent' },
  });

  NotificationHistory.addScope('failed', {
    where: { status: 'failed' },
  });

  NotificationHistory.addScope('pending', {
    where: { status: 'pending' },
  });

  NotificationHistory.addScope('recent', {
    order: [['createdAt', 'DESC']],
    limit: 100,
  });

  NotificationHistory.addScope('withRule', {
    include: [
      {
        model: sequelize.models.NotificationRule,
        as: 'notificationRule',
        attributes: ['id', 'name', 'trigger_type', 'priority'],
      },
    ],
  });

  NotificationHistory.addScope('withSubmission', {
    include: [
      {
        model: sequelize.models.Submission,
        as: 'submission',
        attributes: ['id', 'submitted_at', 'status'],
      },
    ],
  });

  NotificationHistory.addScope('conditionMet', {
    where: { condition_met: true },
  });

  NotificationHistory.addScope('conditionNotMet', {
    where: { condition_met: false },
  });

  /**
   * Override toJSON to format output
   */
  NotificationHistory.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());

    // Add human-readable status
    const statusMap = {
      pending: 'รอดำเนินการ',
      sent: 'ส่งแล้ว',
      failed: 'ล้มเหลว',
      skipped: 'ข้าม',
    };
    values.statusThai = statusMap[values.status] || values.status;

    // Format dates
    if (values.sent_at) {
      values.sentAtFormatted = new Date(values.sent_at).toLocaleString('th-TH');
    }
    if (values.createdAt) {
      values.createdAtFormatted = new Date(values.createdAt).toLocaleString('th-TH');
    }

    return values;
  };

  return NotificationHistory;
};
