/**
 * ConsentItem Model
 * Manages consent items that can be added to forms for PDPA compliance
 */

module.exports = (sequelize, DataTypes) => {
  const ConsentItem = sequelize.define('ConsentItem', {
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
    title_th: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        len: [1, 500],
      },
    },
    title_en: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        len: [0, 500],
      },
    },
    description_th: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    description_en: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    purpose: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    retention_period: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    required: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
      },
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  }, {
    tableName: 'consent_items',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['form_id'] },
      { fields: ['is_active'] },
      { fields: ['order'] },
    ],
  });

  /**
   * Instance Methods
   */

  /**
   * Increment version number
   */
  ConsentItem.prototype.incrementVersion = async function(options = {}) {
    this.version += 1;
    await this.save(options);
    return this;
  };

  /**
   * Deactivate consent item
   */
  ConsentItem.prototype.deactivate = async function(options = {}) {
    this.is_active = false;
    await this.save(options);
    return this;
  };

  /**
   * Activate consent item
   */
  ConsentItem.prototype.activate = async function(options = {}) {
    this.is_active = true;
    await this.save(options);
    return this;
  };

  /**
   * Get consent statistics
   * @returns {Promise<Object>}
   */
  ConsentItem.prototype.getConsentStats = async function() {
    const UserConsent = sequelize.models.UserConsent;

    const stats = await UserConsent.findAll({
      where: { consent_item_id: this.id },
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
      withdrawn: 0,
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

    // Count withdrawn consents
    const withdrawnCount = await UserConsent.count({
      where: {
        consent_item_id: this.id,
        withdrawn_at: { [sequelize.Sequelize.Op.ne]: null },
      },
    });
    result.withdrawn = withdrawnCount;

    return result;
  };

  /**
   * Class Methods
   */

  /**
   * Get active consent items for a form
   * @param {string} formId - Form ID
   * @returns {Promise<ConsentItem[]>}
   */
  ConsentItem.findActiveByForm = async function(formId) {
    return await ConsentItem.findAll({
      where: {
        form_id: formId,
        is_active: true,
      },
      order: [['order', 'ASC']],
    });
  };

  /**
   * Get all active consent items for a form
   * @param {string} formId - Form ID
   * @returns {Promise<ConsentItem[]>}
   */
  ConsentItem.findAllByForm = async function(formId) {
    return await ConsentItem.findAll({
      where: {
        form_id: formId,
        is_active: true  // ✅ Filter only active items
      },
      order: [['order', 'ASC']],
    });
  };

  /**
   * Model Associations
   */
  ConsentItem.associate = (models) => {
    // ConsentItem belongs to Form
    ConsentItem.belongsTo(models.Form, {
      foreignKey: 'form_id',
      as: 'form',
      onDelete: 'CASCADE',
    });

    // ConsentItem has many UserConsents
    ConsentItem.hasMany(models.UserConsent, {
      foreignKey: 'consent_item_id',
      as: 'userConsents',
      onDelete: 'RESTRICT',
    });
  };

  /**
   * Scopes for common queries
   */
  ConsentItem.addScope('active', {
    where: { is_active: true },
  });

  ConsentItem.addScope('inactive', {
    where: { is_active: false },
  });

  ConsentItem.addScope('required', {
    where: { required: true },
  });

  ConsentItem.addScope('ordered', {
    order: [['order', 'ASC']],
  });

  /**
   * Override toJSON to convert snake_case to camelCase for frontend
   */
  ConsentItem.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());

    // Map snake_case to camelCase
    if (values.form_id !== undefined) {
      values.formId = values.form_id;
      delete values.form_id;
    }

    if (values.title_th !== undefined) {
      values.titleTh = values.title_th;
      delete values.title_th;
    }

    if (values.title_en !== undefined) {
      values.titleEn = values.title_en;
      delete values.title_en;
    }

    if (values.description_th !== undefined) {
      values.descriptionTh = values.description_th;
      delete values.description_th;
    }

    if (values.description_en !== undefined) {
      values.descriptionEn = values.description_en;
      delete values.description_en;
    }

    if (values.retention_period !== undefined) {
      values.retentionPeriod = values.retention_period;
      delete values.retention_period;
    }

    if (values.is_active !== undefined) {
      values.isActive = values.is_active;
      delete values.is_active;
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

  return ConsentItem;
};
