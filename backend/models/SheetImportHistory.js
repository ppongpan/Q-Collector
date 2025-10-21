/**
 * SheetImportHistory Model
 * Tracks execution history of Google Sheets imports
 *
 * Part of Google Sheets Import System v0.8.0
 */

module.exports = (sequelize, DataTypes) => {
  const SheetImportHistory = sequelize.define('SheetImportHistory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    config_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'sheet_import_configs',
        key: 'id',
      },
      onDelete: 'CASCADE',
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
    form_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'forms',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    total_rows: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    success_rows: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    failed_rows: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    skipped_rows: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    errors: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of error objects',
      validate: {
        isValidErrors(value) {
          if (value !== null && !Array.isArray(value)) {
            throw new Error('errors must be an array or null');
          }
        },
      },
    },
    submission_ids: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of created submission UUIDs',
      validate: {
        isValidSubmissions(value) {
          if (value !== null && !Array.isArray(value)) {
            throw new Error('submission_ids must be an array or null');
          }
        },
      },
    },
    status: {
      type: DataTypes.ENUM(
        'pending',
        'running',
        'completed',
        'completed_with_errors',
        'failed',
        'rolled_back'
      ),
      defaultValue: 'pending',
      allowNull: false,
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'sheet_import_history',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['config_id'] },
      { fields: ['user_id'] },
      { fields: ['form_id'] },
      { fields: ['status'] },
      { fields: ['started_at'] },
      { fields: ['completed_at'] },
    ],
  });

  /**
   * Instance Methods
   */

  /**
   * Mark import as running
   */
  SheetImportHistory.prototype.markAsRunning = async function(options = {}) {
    this.status = 'running';
    await this.save(options);
    return this;
  };

  /**
   * Mark import as completed
   */
  SheetImportHistory.prototype.markAsCompleted = async function(options = {}) {
    this.status = this.failed_rows > 0 ? 'completed_with_errors' : 'completed';
    this.completed_at = new Date();
    await this.save(options);
    return this;
  };

  /**
   * Mark import as failed
   * @param {string} errorMessage - Error message
   */
  SheetImportHistory.prototype.markAsFailed = async function(errorMessage, options = {}) {
    this.status = 'failed';
    this.completed_at = new Date();

    // Add error to errors array
    if (!this.errors) this.errors = [];
    this.errors.push({
      timestamp: new Date().toISOString(),
      message: errorMessage,
      row: null,
    });

    await this.save(options);
    return this;
  };

  /**
   * Mark import as rolled back
   */
  SheetImportHistory.prototype.markAsRolledBack = async function(options = {}) {
    this.status = 'rolled_back';
    await this.save(options);
    return this;
  };

  /**
   * Add error for specific row
   * @param {number} rowNumber - Row number in sheet
   * @param {string} errorMessage - Error message
   */
  SheetImportHistory.prototype.addError = function(rowNumber, errorMessage) {
    if (!this.errors) this.errors = [];
    this.errors.push({
      row: rowNumber,
      message: errorMessage,
      timestamp: new Date().toISOString(),
    });
  };

  /**
   * Add submission ID to tracking array
   * @param {string} submissionId - UUID of created submission
   */
  SheetImportHistory.prototype.addSubmissionId = function(submissionId) {
    if (!this.submission_ids) this.submission_ids = [];
    this.submission_ids.push(submissionId);
  };

  /**
   * Calculate success rate
   * @returns {number} - Success rate as percentage (0-100)
   */
  SheetImportHistory.prototype.getSuccessRate = function() {
    if (this.total_rows === 0) return 0;
    return Math.round((this.success_rows / this.total_rows) * 100);
  };

  /**
   * Calculate execution time in seconds
   * @returns {number|null} - Execution time in seconds, or null if not completed
   */
  SheetImportHistory.prototype.getExecutionTime = function() {
    if (!this.completed_at) return null;

    const startTime = new Date(this.started_at).getTime();
    const endTime = new Date(this.completed_at).getTime();

    return Math.round((endTime - startTime) / 1000);
  };

  /**
   * Check if import can be rolled back
   * @returns {boolean}
   */
  SheetImportHistory.prototype.canRollback = function() {
    // Can rollback if completed successfully and has submission IDs
    return (
      (this.status === 'completed' || this.status === 'completed_with_errors') &&
      this.submission_ids &&
      this.submission_ids.length > 0
    );
  };

  /**
   * Check if import is in progress
   * @returns {boolean}
   */
  SheetImportHistory.prototype.isInProgress = function() {
    return this.status === 'pending' || this.status === 'running';
  };

  /**
   * Check if import was successful
   * @returns {boolean}
   */
  SheetImportHistory.prototype.isSuccessful = function() {
    return this.status === 'completed' || this.status === 'completed_with_errors';
  };

  /**
   * Get summary statistics
   * @returns {Object}
   */
  SheetImportHistory.prototype.getSummary = function() {
    return {
      total_rows: this.total_rows,
      success_rows: this.success_rows,
      failed_rows: this.failed_rows,
      skipped_rows: this.skipped_rows,
      success_rate: this.getSuccessRate(),
      execution_time: this.getExecutionTime(),
      error_count: this.errors ? this.errors.length : 0,
      submission_count: this.submission_ids ? this.submission_ids.length : 0,
      status: this.status,
      can_rollback: this.canRollback(),
    };
  };

  /**
   * Class Methods
   */

  /**
   * Find history by config
   * @param {string} configId - SheetImportConfig UUID
   * @param {number} limit - Max records to return
   * @returns {Promise<SheetImportHistory[]>}
   */
  SheetImportHistory.findByConfig = async function(configId, limit = 50) {
    return await SheetImportHistory.findAll({
      where: { config_id: configId },
      order: [['started_at', 'DESC']],
      limit,
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['id', 'username', 'email'],
        },
      ],
    });
  };

  /**
   * Find history by user
   * @param {string} userId - User UUID
   * @param {number} limit - Max records to return
   * @returns {Promise<SheetImportHistory[]>}
   */
  SheetImportHistory.findByUser = async function(userId, limit = 50) {
    return await SheetImportHistory.findAll({
      where: { user_id: userId },
      order: [['started_at', 'DESC']],
      limit,
      include: [
        {
          model: sequelize.models.SheetImportConfig,
          as: 'config',
          attributes: ['id', 'sheet_name', 'sheet_url'],
        },
        {
          model: sequelize.models.Form,
          as: 'form',
          attributes: ['id', 'title'],
        },
      ],
    });
  };

  /**
   * Find imports in progress
   * @returns {Promise<SheetImportHistory[]>}
   */
  SheetImportHistory.findInProgress = async function() {
    return await SheetImportHistory.findAll({
      where: {
        status: ['pending', 'running'],
      },
      order: [['started_at', 'ASC']],
    });
  };

  /**
   * Find failed imports in last 24 hours
   * @returns {Promise<SheetImportHistory[]>}
   */
  SheetImportHistory.findRecentFailed = async function() {
    const { Op } = sequelize.Sequelize;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return await SheetImportHistory.findAll({
      where: {
        status: 'failed',
        started_at: { [Op.gte]: twentyFourHoursAgo },
      },
      order: [['started_at', 'DESC']],
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['id', 'username', 'email'],
        },
        {
          model: sequelize.models.Form,
          as: 'form',
          attributes: ['id', 'title'],
        },
      ],
    });
  };

  /**
   * Get aggregate statistics for a form
   * @param {string} formId - Form UUID
   * @returns {Promise<Object>}
   */
  SheetImportHistory.getFormStatistics = async function(formId) {
    const results = await SheetImportHistory.findAll({
      where: { form_id: formId },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_imports'],
        [sequelize.fn('SUM', sequelize.col('total_rows')), 'total_rows_processed'],
        [sequelize.fn('SUM', sequelize.col('success_rows')), 'total_success_rows'],
        [sequelize.fn('SUM', sequelize.col('failed_rows')), 'total_failed_rows'],
        [sequelize.fn('AVG', sequelize.col('success_rows')), 'avg_success_rows'],
      ],
      raw: true,
    });

    return results[0] || {};
  };

  /**
   * Model Associations
   */
  SheetImportHistory.associate = (models) => {
    // History belongs to SheetImportConfig
    SheetImportHistory.belongsTo(models.SheetImportConfig, {
      foreignKey: 'config_id',
      as: 'config',
      onDelete: 'CASCADE',
    });

    // History belongs to User
    SheetImportHistory.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE',
    });

    // History belongs to Form
    SheetImportHistory.belongsTo(models.Form, {
      foreignKey: 'form_id',
      as: 'form',
      onDelete: 'CASCADE',
    });
  };

  /**
   * Scopes for common queries
   */
  SheetImportHistory.addScope('successful', {
    where: {
      status: ['completed', 'completed_with_errors'],
    },
  });

  SheetImportHistory.addScope('failed', {
    where: {
      status: 'failed',
    },
  });

  SheetImportHistory.addScope('inProgress', {
    where: {
      status: ['pending', 'running'],
    },
  });

  SheetImportHistory.addScope('recent', {
    where: {
      started_at: {
        [sequelize.Sequelize.Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    },
    order: [['started_at', 'DESC']],
  });

  SheetImportHistory.addScope('withRelations', {
    include: [
      {
        association: 'config',
        attributes: ['id', 'sheet_name', 'sheet_url'],
      },
      {
        association: 'user',
        attributes: ['id', 'username', 'email'],
      },
      {
        association: 'form',
        attributes: ['id', 'title'],
      },
    ],
  });

  /**
   * Override toJSON to add computed properties
   */
  SheetImportHistory.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());

    // Add computed properties
    values.success_rate = this.getSuccessRate();
    values.execution_time = this.getExecutionTime();
    values.can_rollback = this.canRollback();
    values.is_in_progress = this.isInProgress();
    values.is_successful = this.isSuccessful();
    values.summary = this.getSummary();

    return values;
  };

  return SheetImportHistory;
};
