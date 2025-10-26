/**
 * UserConsent Model
 * Manages user consent records with digital signatures for PDPA compliance
 *
 * @version v0.8.2-dev
 * @date 2025-10-23
 */

module.exports = (sequelize, DataTypes) => {
  const UserConsent = sequelize.define('UserConsent', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: 'Primary key (UUID)'
    },

    // Foreign Keys
    submission_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'submissions',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      comment: 'Link to submission - CASCADE DELETE ensures cleanup'
    },
    form_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'forms',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
      comment: 'Link to form'
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      comment: 'Link to user (nullable for anonymous submissions)'
    },
    consent_item_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'consent_items',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
      comment: 'Link to consent item definition'
    },

    // Consent Data
    consent_given: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether consent was given (true) or denied (false)'
    },

    // Identity Verification (NEW for v0.8.2)
    signature_data: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Base64 encoded signature image (PNG format)'
    },
    full_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Full name for identity verification'
    },

    // Metadata for Legal Proof
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IP address of user when consent given (IPv4 or IPv6)'
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Browser user agent string'
    },
    consented_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Timestamp when consent was given'
    },

    // Privacy Notice Tracking
    privacy_notice_accepted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether privacy notice was accepted'
    },
    privacy_notice_version: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Version of privacy notice accepted (e.g., "1.0", "2.1")'
    },
  }, {
    tableName: 'user_consents',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: 'Stores user consent records with digital signatures for PDPA compliance'
  });

  /**
   * Instance Methods
   */

  /**
   * Check if consent is valid (given)
   * @returns {boolean}
   */
  UserConsent.prototype.isValid = function() {
    return this.consent_given === true;
  };

  /**
   * Check if consent has digital signature
   * @returns {boolean}
   */
  UserConsent.prototype.hasSignature = function() {
    return !!this.signature_data && !!this.full_name;
  };

  /**
   * Get consent details with related data
   * @returns {Promise<UserConsent>}
   */
  UserConsent.prototype.getFullConsent = async function() {
    return await UserConsent.findByPk(this.id, {
      include: [
        {
          model: sequelize.models.ConsentItem,
          as: 'consentItem',
        },
        {
          model: sequelize.models.Submission,
          as: 'submission',
        },
        {
          model: sequelize.models.Form,
          as: 'form',
        },
        {
          model: sequelize.models.User,
          as: 'user',
        },
      ],
    });
  };

  /**
   * Class Methods
   */

  /**
   * Find all consents for a submission
   * @param {string} submissionId - Submission ID
   * @returns {Promise<UserConsent[]>}
   */
  UserConsent.findBySubmission = async function(submissionId) {
    return await UserConsent.findAll({
      where: { submission_id: submissionId },
      include: [
        {
          model: sequelize.models.ConsentItem,
          as: 'consentItem',
        },
      ],
      order: [['consented_at', 'DESC']],
    });
  };

  /**
   * Find all consents for a user
   * @param {string} userId - User ID
   * @returns {Promise<UserConsent[]>}
   */
  UserConsent.findByUser = async function(userId) {
    return await UserConsent.findAll({
      where: { user_id: userId },
      include: [
        {
          model: sequelize.models.ConsentItem,
          as: 'consentItem',
        },
        {
          model: sequelize.models.Form,
          as: 'form',
          attributes: ['id', 'title'],
        },
      ],
      order: [['consented_at', 'DESC']],
    });
  };

  /**
   * Get consent statistics by form
   * @param {string} formId - Form ID
   * @returns {Promise<Object>}
   */
  UserConsent.getStatsByForm = async function(formId) {
    const stats = await UserConsent.findAll({
      where: { form_id: formId },
      attributes: [
        'consent_given',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['consent_given'],
      raw: true,
    });

    const result = {
      total: 0,
      given: 0,
      denied: 0,
      withSignature: 0,
    };

    stats.forEach((stat) => {
      const count = parseInt(stat.count);
      result.total += count;
      if (stat.consent_given) {
        result.given += count;
      } else {
        result.denied += count;
      }
    });

    // Count consents with signatures
    const signatureCount = await UserConsent.count({
      where: {
        form_id: formId,
        signature_data: { [sequelize.Sequelize.Op.ne]: null },
      },
    });
    result.withSignature = signatureCount;

    return result;
  };

  /**
   * Find consents with signatures
   * @param {string} formId - Form ID (optional)
   * @returns {Promise<UserConsent[]>}
   */
  UserConsent.findWithSignatures = async function(formId = null) {
    const where = {
      signature_data: { [sequelize.Sequelize.Op.ne]: null },
    };

    if (formId) {
      where.form_id = formId;
    }

    return await UserConsent.findAll({
      where,
      include: [
        {
          model: sequelize.models.ConsentItem,
          as: 'consentItem',
        },
        {
          model: sequelize.models.Submission,
          as: 'submission',
        },
      ],
      order: [['consented_at', 'DESC']],
    });
  };

  /**
   * Model Associations
   */
  UserConsent.associate = (models) => {
    // UserConsent belongs to Submission (CASCADE DELETE)
    UserConsent.belongsTo(models.Submission, {
      foreignKey: 'submission_id',
      as: 'submission',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    // UserConsent belongs to ConsentItem (RESTRICT DELETE)
    UserConsent.belongsTo(models.ConsentItem, {
      foreignKey: 'consent_item_id',
      as: 'consentItem',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    });

    // UserConsent belongs to Form (RESTRICT DELETE)
    UserConsent.belongsTo(models.Form, {
      foreignKey: 'form_id',
      as: 'form',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    });

    // UserConsent belongs to User (SET NULL on delete - optional)
    UserConsent.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  };

  /**
   * Scopes for common queries
   */
  UserConsent.addScope('given', {
    where: { consent_given: true },
  });

  UserConsent.addScope('denied', {
    where: { consent_given: false },
  });

  UserConsent.addScope('withSignature', {
    where: {
      signature_data: { [sequelize.Sequelize.Op.ne]: null },
    },
  });

  UserConsent.addScope('recent', {
    order: [['consented_at', 'DESC']],
    limit: 20,
  });

  /**
   * Override toJSON to convert snake_case to camelCase for frontend
   */
  UserConsent.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());

    // Map snake_case to camelCase for all fields
    const fieldMappings = {
      submission_id: 'submissionId',
      form_id: 'formId',
      user_id: 'userId',
      consent_item_id: 'consentItemId',
      consent_given: 'consentGiven',
      signature_data: 'signatureData',
      full_name: 'fullName',
      ip_address: 'ipAddress',
      user_agent: 'userAgent',
      consented_at: 'consentedAt',
      privacy_notice_accepted: 'privacyNoticeAccepted',
      privacy_notice_version: 'privacyNoticeVersion',
      created_at: 'createdAt',
      updated_at: 'updatedAt',
    };

    Object.keys(fieldMappings).forEach(snakeCase => {
      if (values[snakeCase] !== undefined) {
        values[fieldMappings[snakeCase]] = values[snakeCase];
        delete values[snakeCase];
      }
    });

    // ✅ v0.8.3: Handle form association - extract form title for frontend display
    if (values.form && values.form.title) {
      values.formTitle = values.form.title;
    }

    return values;
  };

  return UserConsent;
};
