/**
 * UnifiedUserProfile Model
 * Manages matching and grouping of submissions by same user across forms
 */

module.exports = (sequelize, DataTypes) => {
  const UnifiedUserProfile = sequelize.define('UnifiedUserProfile', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    primary_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    primary_phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    full_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    linked_emails: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      validate: {
        isArray(value) {
          if (!Array.isArray(value)) {
            throw new Error('linked_emails must be an array');
          }
        },
      },
    },
    linked_phones: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      validate: {
        isArray(value) {
          if (!Array.isArray(value)) {
            throw new Error('linked_phones must be an array');
          }
        },
      },
    },
    linked_names: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      validate: {
        isArray(value) {
          if (!Array.isArray(value)) {
            throw new Error('linked_names must be an array');
          }
        },
      },
    },
    submission_ids: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      validate: {
        isArray(value) {
          if (!Array.isArray(value)) {
            throw new Error('submission_ids must be an array');
          }
        },
      },
    },
    form_ids: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      validate: {
        isArray(value) {
          if (!Array.isArray(value)) {
            throw new Error('form_ids must be an array');
          }
        },
      },
    },
    total_submissions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    first_submission_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_submission_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    match_confidence: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 100.00,
      validate: {
        min: 0,
        max: 100,
      },
    },
    merged_from_ids: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      validate: {
        isArray(value) {
          if (!Array.isArray(value)) {
            throw new Error('merged_from_ids must be an array');
          }
        },
      },
    },
  }, {
    tableName: 'unified_user_profiles',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['primary_email'] },
      { fields: ['primary_phone'] },
      { fields: ['full_name'] },
      { fields: ['total_submissions'] },
      { fields: ['first_submission_date'] },
      { fields: ['last_submission_date'] },
    ],
  });

  /**
   * Instance Methods
   */

  /**
   * Add submission to profile
   * @param {Object} submission - Submission object
   * @param {string} email - User email from submission
   * @param {string} phone - User phone from submission
   * @param {string} name - User name from submission
   * @returns {Promise<UnifiedUserProfile>}
   */
  UnifiedUserProfile.prototype.addSubmission = async function(submission, email = null, phone = null, name = null) {
    // Add submission ID
    if (!this.submission_ids.includes(submission.id)) {
      this.submission_ids.push(submission.id);
    }

    // Add form ID
    if (!this.form_ids.includes(submission.form_id)) {
      this.form_ids.push(submission.form_id);
    }

    // Add email if provided
    if (email && !this.linked_emails.includes(email)) {
      this.linked_emails.push(email);
      if (!this.primary_email) {
        this.primary_email = email;
      }
    }

    // Add phone if provided
    if (phone && !this.linked_phones.includes(phone)) {
      this.linked_phones.push(phone);
      if (!this.primary_phone) {
        this.primary_phone = phone;
      }
    }

    // Add name if provided
    if (name && !this.linked_names.includes(name)) {
      this.linked_names.push(name);
      if (!this.full_name) {
        this.full_name = name;
      }
    }

    // Update submission dates
    const submissionDate = submission.submitted_at || submission.created_at;
    if (!this.first_submission_date || submissionDate < this.first_submission_date) {
      this.first_submission_date = submissionDate;
    }
    if (!this.last_submission_date || submissionDate > this.last_submission_date) {
      this.last_submission_date = submissionDate;
    }

    // Update total submissions
    this.total_submissions = this.submission_ids.length;

    await this.save();
    return this;
  };

  /**
   * Merge another profile into this one
   * @param {UnifiedUserProfile} otherProfile - Profile to merge
   * @returns {Promise<UnifiedUserProfile>}
   */
  UnifiedUserProfile.prototype.mergeWith = async function(otherProfile) {
    const transaction = await sequelize.transaction();

    try {
      // Merge emails
      otherProfile.linked_emails.forEach(email => {
        if (!this.linked_emails.includes(email)) {
          this.linked_emails.push(email);
        }
      });

      // Merge phones
      otherProfile.linked_phones.forEach(phone => {
        if (!this.linked_phones.includes(phone)) {
          this.linked_phones.push(phone);
        }
      });

      // Merge names
      otherProfile.linked_names.forEach(name => {
        if (!this.linked_names.includes(name)) {
          this.linked_names.push(name);
        }
      });

      // Merge submission IDs
      otherProfile.submission_ids.forEach(id => {
        if (!this.submission_ids.includes(id)) {
          this.submission_ids.push(id);
        }
      });

      // Merge form IDs
      otherProfile.form_ids.forEach(id => {
        if (!this.form_ids.includes(id)) {
          this.form_ids.push(id);
        }
      });

      // Update dates
      if (otherProfile.first_submission_date &&
          (!this.first_submission_date || otherProfile.first_submission_date < this.first_submission_date)) {
        this.first_submission_date = otherProfile.first_submission_date;
      }
      if (otherProfile.last_submission_date &&
          (!this.last_submission_date || otherProfile.last_submission_date > this.last_submission_date)) {
        this.last_submission_date = otherProfile.last_submission_date;
      }

      // Track merge
      if (!this.merged_from_ids.includes(otherProfile.id)) {
        this.merged_from_ids.push(otherProfile.id);
      }

      // Update total submissions
      this.total_submissions = this.submission_ids.length;

      // Reduce confidence score slightly for merged profiles
      this.match_confidence = Math.max(50, this.match_confidence - 5);

      await this.save({ transaction });

      // Delete the merged profile
      await otherProfile.destroy({ transaction });

      await transaction.commit();
      return this;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  };

  /**
   * Get all submissions for this profile
   * @returns {Promise<Submission[]>}
   */
  UnifiedUserProfile.prototype.getSubmissions = async function() {
    const Submission = sequelize.models.Submission;

    return await Submission.findAll({
      where: {
        id: { [sequelize.Sequelize.Op.in]: this.submission_ids },
      },
      include: [
        {
          model: sequelize.models.Form,
          as: 'form',
          attributes: ['id', 'title'],
        },
      ],
      order: [['submitted_at', 'DESC']],
    });
  };

  /**
   * Get all consents for this profile
   * @returns {Promise<UserConsent[]>}
   */
  UnifiedUserProfile.prototype.getConsents = async function() {
    const UserConsent = sequelize.models.UserConsent;
    const { Op } = sequelize.Sequelize;

    const where = {
      [Op.or]: [],
    };

    if (this.linked_emails.length > 0) {
      where[Op.or].push({ user_email: { [Op.in]: this.linked_emails } });
    }

    if (this.linked_phones.length > 0) {
      where[Op.or].push({ user_phone: { [Op.in]: this.linked_phones } });
    }

    if (where[Op.or].length === 0) {
      return [];
    }

    return await UserConsent.findAll({
      where,
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
      order: [['consent_timestamp', 'DESC']],
    });
  };

  /**
   * Class Methods
   */

  /**
   * Find or create profile by email
   * @param {string} email - User email
   * @returns {Promise<UnifiedUserProfile>}
   */
  UnifiedUserProfile.findOrCreateByEmail = async function(email) {
    const { Op } = sequelize.Sequelize;

    let profile = await UnifiedUserProfile.findOne({
      where: {
        [Op.or]: [
          { primary_email: email },
          sequelize.where(
            sequelize.cast(sequelize.col('linked_emails'), 'text'),
            { [Op.like]: `%"${email}"%` }
          ),
        ],
      },
    });

    if (!profile) {
      profile = await UnifiedUserProfile.create({
        primary_email: email,
        linked_emails: [email],
      });
    }

    return profile;
  };

  /**
   * Find or create profile by phone
   * @param {string} phone - User phone
   * @returns {Promise<UnifiedUserProfile>}
   */
  UnifiedUserProfile.findOrCreateByPhone = async function(phone) {
    const { Op } = sequelize.Sequelize;

    let profile = await UnifiedUserProfile.findOne({
      where: {
        [Op.or]: [
          { primary_phone: phone },
          sequelize.where(
            sequelize.cast(sequelize.col('linked_phones'), 'text'),
            { [Op.like]: `%"${phone}"%` }
          ),
        ],
      },
    });

    if (!profile) {
      profile = await UnifiedUserProfile.create({
        primary_phone: phone,
        linked_phones: [phone],
      });
    }

    return profile;
  };

  /**
   * Find potential duplicate profiles
   * @param {number} minSubmissions - Minimum submissions to consider
   * @returns {Promise<Array>}
   */
  UnifiedUserProfile.findPotentialDuplicates = async function(minSubmissions = 2) {
    const { Op } = sequelize.Sequelize;

    // Find profiles with same email or phone
    const profiles = await UnifiedUserProfile.findAll({
      where: {
        total_submissions: { [Op.gte]: minSubmissions },
      },
      order: [['total_submissions', 'DESC']],
    });

    const duplicates = [];

    for (let i = 0; i < profiles.length; i++) {
      for (let j = i + 1; j < profiles.length; j++) {
        const profile1 = profiles[i];
        const profile2 = profiles[j];

        // Check for matching emails
        const emailMatch = profile1.linked_emails.some(email =>
          profile2.linked_emails.includes(email)
        );

        // Check for matching phones
        const phoneMatch = profile1.linked_phones.some(phone =>
          profile2.linked_phones.includes(phone)
        );

        if (emailMatch || phoneMatch) {
          duplicates.push({
            profile1: profile1.toJSON(),
            profile2: profile2.toJSON(),
            matchType: emailMatch && phoneMatch ? 'both' : (emailMatch ? 'email' : 'phone'),
          });
        }
      }
    }

    return duplicates;
  };

  /**
   * Model Associations
   */
  UnifiedUserProfile.associate = (models) => {
    // No direct foreign key associations
    // This model uses JSONB arrays to store related IDs
  };

  /**
   * Scopes for common queries
   */
  UnifiedUserProfile.addScope('active', {
    where: {
      total_submissions: { [sequelize.Sequelize.Op.gt]: 0 },
    },
  });

  UnifiedUserProfile.addScope('recent', {
    order: [['last_submission_date', 'DESC']],
  });

  UnifiedUserProfile.addScope('frequent', {
    where: {
      total_submissions: { [sequelize.Sequelize.Op.gte]: 5 },
    },
    order: [['total_submissions', 'DESC']],
  });

  /**
   * Override toJSON to convert snake_case to camelCase for frontend
   */
  UnifiedUserProfile.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());

    // Map snake_case to camelCase
    if (values.primary_email !== undefined) {
      values.primaryEmail = values.primary_email;
      delete values.primary_email;
    }

    if (values.primary_phone !== undefined) {
      values.primaryPhone = values.primary_phone;
      delete values.primary_phone;
    }

    if (values.full_name !== undefined) {
      values.fullName = values.full_name;
      delete values.full_name;
    }

    if (values.linked_emails !== undefined) {
      values.linkedEmails = values.linked_emails;
      delete values.linked_emails;
    }

    if (values.linked_phones !== undefined) {
      values.linkedPhones = values.linked_phones;
      delete values.linked_phones;
    }

    if (values.linked_names !== undefined) {
      values.linkedNames = values.linked_names;
      delete values.linked_names;
    }

    if (values.submission_ids !== undefined) {
      values.submissionIds = values.submission_ids;
      delete values.submission_ids;
    }

    if (values.form_ids !== undefined) {
      values.formIds = values.form_ids;
      delete values.form_ids;
    }

    if (values.total_submissions !== undefined) {
      values.totalSubmissions = values.total_submissions;
      delete values.total_submissions;
    }

    if (values.first_submission_date !== undefined) {
      values.firstSubmissionDate = values.first_submission_date;
      delete values.first_submission_date;
    }

    if (values.last_submission_date !== undefined) {
      values.lastSubmissionDate = values.last_submission_date;
      delete values.last_submission_date;
    }

    if (values.match_confidence !== undefined) {
      values.matchConfidence = values.match_confidence;
      delete values.match_confidence;
    }

    if (values.merged_from_ids !== undefined) {
      values.mergedFromIds = values.merged_from_ids;
      delete values.merged_from_ids;
    }

    if (values.created_at !== undefined) {
      values.createdAt = values.created_at;
      delete values.created_at;
    }

    if (values.updated_at !== undefined) {
      values.updatedAt = values.updated_at;
      delete values.updated_at;
    }

    return values;
  };

  return UnifiedUserProfile;
};
