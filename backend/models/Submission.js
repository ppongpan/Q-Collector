/**
 * Submission Model
 * Manages form submissions
 */

module.exports = (sequelize, DataTypes) => {
  const Submission = sequelize.define('Submission', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
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
    submitted_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    status: {
      type: DataTypes.ENUM('draft', 'submitted', 'approved', 'rejected', 'archived'),
      allowNull: false,
      defaultValue: 'submitted',
    },
    ip_address: {
      type: DataTypes.INET,
      allowNull: true,
      comment: 'IP address of submitter',
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Browser user agent',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      comment: 'Additional metadata (browser, location, etc.)',
    },
    submitted_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    parent_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'submissions',
        key: 'id',
      },
      onDelete: 'SET NULL', // ✅ FIX: Deleting child should NOT delete parent
      comment: 'Parent submission ID for sub-form submissions',
    },
  }, {
    tableName: 'submissions',
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ['form_id'] },
      { fields: ['submitted_by'] },
      { fields: ['status'] },
      { fields: ['submitted_at'] },
      { fields: ['createdAt'] },
      { fields: ['parent_id'] },
    ],
  });

  /**
   * Instance Methods
   */

  /**
   * Get submission with all data
   * @returns {Promise<Submission>}
   */
  Submission.prototype.getFullSubmission = async function() {
    return await Submission.findByPk(this.id, {
      include: [
        {
          model: sequelize.models.Form,
          as: 'form',
          include: [
            {
              model: sequelize.models.Field,
              as: 'fields',
            },
            {
              model: sequelize.models.SubForm,
              as: 'subForms',
              include: [
                {
                  model: sequelize.models.Field,
                  as: 'fields',
                },
              ],
            },
          ],
        },
        {
          model: sequelize.models.SubmissionData,
          as: 'submissionData',
          include: [
            {
              model: sequelize.models.Field,
              as: 'field',
            },
          ],
        },
        {
          model: sequelize.models.File,
          as: 'files',
        },
        {
          model: sequelize.models.User,
          as: 'submitter',
          attributes: ['id', 'username', 'email', 'role'],
        },
      ],
    });
  };

  /**
   * Update submission status
   * @param {string} newStatus - New status
   * @param {string} userId - User making the change
   * @returns {Promise<Submission>}
   */
  Submission.prototype.updateStatus = async function(newStatus, userId) {
    const oldStatus = this.status;
    this.status = newStatus;
    await this.save();

    // Create audit log
    await sequelize.models.AuditLog.create({
      user_id: userId,
      action: 'update',
      entity_type: 'submission',
      entity_id: this.id,
      old_value: { status: oldStatus },
      new_value: { status: newStatus },
    });

    return this;
  };

  /**
   * Get formatted submission data as key-value pairs
   * @returns {Promise<Object>}
   */
  Submission.prototype.getFormattedData = async function() {
    const submissionData = await sequelize.models.SubmissionData.findAll({
      where: { submission_id: this.id },
      include: [
        {
          model: sequelize.models.Field,
          as: 'field',
        },
      ],
    });

    const formatted = {};
    for (const data of submissionData) {
      formatted[data.field.title] = data.getDecryptedValue();
    }

    return formatted;
  };

  /**
   * Check if submission can be edited
   * @returns {boolean}
   */
  Submission.prototype.canEdit = function() {
    return this.status === 'draft' || this.status === 'submitted';
  };

  /**
   * Check if submission can be approved/rejected
   * @returns {boolean}
   */
  Submission.prototype.canReview = function() {
    return this.status === 'submitted';
  };

  /**
   * Class Methods
   */

  /**
   * Get submissions by status
   * @param {string} status - Submission status
   * @param {Object} options - Query options
   * @returns {Promise<Submission[]>}
   */
  Submission.findByStatus = async function(status, options = {}) {
    return await Submission.findAll({
      where: { status },
      include: [
        {
          model: sequelize.models.Form,
          as: 'form',
          attributes: ['id', 'title'],
        },
        {
          model: sequelize.models.User,
          as: 'submitter',
          attributes: ['id', 'username', 'email'],
        },
      ],
      order: [['submitted_at', 'DESC']],
      ...options,
    });
  };

  /**
   * Get submissions for a form with pagination
   * @param {string} formId - Form ID
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>}
   */
  Submission.findByFormPaginated = async function(formId, options = {}) {
    const { page = 1, limit = 20, status = null } = options;
    const offset = (page - 1) * limit;

    const where = { form_id: formId };
    if (status) {
      where.status = status;
    }

    const { count, rows } = await Submission.findAndCountAll({
      where,
      include: [
        {
          model: sequelize.models.User,
          as: 'submitter',
          attributes: ['id', 'username', 'email'],
        },
      ],
      order: [['submitted_at', 'DESC']],
      limit,
      offset,
    });

    return {
      submissions: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
        hasMore: page * limit < count,
      },
    };
  };

  /**
   * Get submission statistics for a form
   * @param {string} formId - Form ID
   * @returns {Promise<Object>}
   */
  Submission.getStatistics = async function(formId) {
    const stats = await Submission.findAll({
      where: { form_id: formId },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['status'],
      raw: true,
    });

    const result = {
      total: 0,
      draft: 0,
      submitted: 0,
      approved: 0,
      rejected: 0,
      archived: 0,
    };

    stats.forEach((stat) => {
      result[stat.status] = parseInt(stat.count);
      result.total += parseInt(stat.count);
    });

    return result;
  };

  /**
   * Model Associations
   */
  Submission.associate = (models) => {
    // Submission belongs to Form
    Submission.belongsTo(models.Form, {
      foreignKey: 'form_id',
      as: 'form',
      onDelete: 'CASCADE',
    });

    // Submission belongs to User (submitter)
    Submission.belongsTo(models.User, {
      foreignKey: 'submitted_by',
      as: 'submitter',
      onDelete: 'SET NULL',
    });

    // Submission has many SubmissionData
    Submission.hasMany(models.SubmissionData, {
      foreignKey: 'submission_id',
      as: 'submissionData',
      onDelete: 'CASCADE',
    });

    // Submission has many Files
    Submission.hasMany(models.File, {
      foreignKey: 'submission_id',
      as: 'files',
      onDelete: 'CASCADE',
    });

    // Self-referential association for sub-form submissions
    // Parent submission has many sub-submissions
    Submission.hasMany(models.Submission, {
      foreignKey: 'parent_id',
      as: 'subSubmissions',
      onDelete: 'CASCADE', // ✅ CORRECT: Deleting parent deletes children
    });

    // Sub-submission belongs to parent submission
    Submission.belongsTo(models.Submission, {
      foreignKey: 'parent_id',
      as: 'parentSubmission',
      onDelete: 'SET NULL', // ✅ FIX: Deleting child does NOT delete parent
    });
  };

  /**
   * Scopes for common queries
   */
  Submission.addScope('submitted', {
    where: { status: 'submitted' },
  });

  Submission.addScope('draft', {
    where: { status: 'draft' },
  });

  Submission.addScope('approved', {
    where: { status: 'approved' },
  });

  Submission.addScope('rejected', {
    where: { status: 'rejected' },
  });

  Submission.addScope('withForm', {
    include: [
      {
        model: sequelize.models.Form,
        as: 'form',
      },
    ],
  });

  Submission.addScope('withSubmitter', {
    include: [
      {
        model: sequelize.models.User,
        as: 'submitter',
        attributes: ['id', 'username', 'email', 'role'],
      },
    ],
  });

  Submission.addScope('recent', {
    order: [['submitted_at', 'DESC']],
    limit: 10,
  });

  return Submission;
};