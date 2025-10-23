/**
 * Form Model
 * Manages form definitions with JSONB configuration
 */

module.exports = (sequelize, DataTypes) => {
  const Form = sequelize.define('Form', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [1, 255],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    roles_allowed: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: ['general_user'],
      comment: 'Array of roles that can access this form',
      validate: {
        isValidRoles(value) {
          if (!Array.isArray(value)) {
            throw new Error('roles_allowed must be an array');
          }
          const validRoles = [
            'super_admin',
            'admin',
            'customer_service',
            'marketing',
            'sales',
            'technic',
            'accounting',
            'bd',
            'hr',
            'it',
            'maintenance',
            'operation',
            'production',
            'purchasing',
            'qc',
            'rnd',
            'warehouse',
            'general_user'
          ];
          const invalidRoles = value.filter(role => !validRoles.includes(role));
          if (invalidRoles.length > 0) {
            throw new Error(`Invalid roles: ${invalidRoles.join(', ')}`);
          }
        },
      },
    },
    settings: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      comment: 'Form settings including telegram, validation, etc.',
      validate: {
        isValidSettings(value) {
          if (typeof value !== 'object' || value === null) {
            throw new Error('settings must be an object');
          }
        },
      },
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    table_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'PostgreSQL dynamic table name (generated from form title with Thai→English translation)',
    },
  }, {
    tableName: 'forms',
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ['created_by'] },
      { fields: ['is_active'] },
      { fields: ['createdAt'] },
      { fields: ['title'] },
      { fields: ['table_name'] },
    ],
  });

  /**
   * Instance Methods
   */

  /**
   * Check if user role can access this form
   * @param {string} userRole - User role to check
   * @returns {boolean}
   */
  Form.prototype.canAccessByRole = function(userRole) {
    if (!this.roles_allowed || !Array.isArray(this.roles_allowed)) {
      return false;
    }
    // super_admin and admin have access to all forms
    if (userRole === 'super_admin' || userRole === 'admin') {
      return true;
    }
    return this.roles_allowed.includes(userRole);
  };

  /**
   * Get form with all related data
   * @returns {Promise<Object>}
   */
  Form.prototype.getFullForm = async function() {
    const form = await Form.findByPk(this.id, {
      include: [
        {
          model: sequelize.models.Field,
          as: 'fields',
          where: { sub_form_id: null },
          required: false,
          order: [['order', 'ASC']],
        },
        {
          model: sequelize.models.SubForm,
          as: 'subForms',
          include: [
            {
              model: sequelize.models.Field,
              as: 'fields',
              order: [['order', 'ASC']],
            },
          ],
          order: [['order', 'ASC']],
        },
        {
          model: sequelize.models.User,
          as: 'creator',
          attributes: ['id', 'username', 'email', 'role'],
        },
      ],
    });

    return form;
  };

  /**
   * Duplicate form with new title
   * @param {string} newTitle - Title for duplicated form
   * @param {string} userId - User ID creating the duplicate
   * @returns {Promise<Form>}
   */
  Form.prototype.duplicate = async function(newTitle, userId) {
    const transaction = await sequelize.transaction();

    try {
      // Create new form
      const newForm = await Form.create({
        title: newTitle,
        description: this.description,
        roles_allowed: this.roles_allowed,
        settings: this.settings,
        created_by: userId,
        is_active: false, // Start as inactive
        version: 1,
      }, { transaction });

      // Get all fields and sub-forms
      const fields = await sequelize.models.Field.findAll({
        where: {
          form_id: this.id,
          sub_form_id: null,
        },
      });

      const subForms = await sequelize.models.SubForm.findAll({
        where: { form_id: this.id },
        include: [{ model: sequelize.models.Field, as: 'fields' }],
      });

      // Copy fields
      for (const field of fields) {
        await sequelize.models.Field.create({
          form_id: newForm.id,
          type: field.type,
          title: field.title,
          placeholder: field.placeholder,
          required: field.required,
          order: field.order,
          options: field.options,
          show_condition: field.show_condition,
          telegram_config: field.telegram_config,
          validation_rules: field.validation_rules,
        }, { transaction });
      }

      // Copy sub-forms and their fields
      for (const subForm of subForms) {
        const newSubForm = await sequelize.models.SubForm.create({
          form_id: newForm.id,
          title: subForm.title,
          description: subForm.description,
          order: subForm.order,
        }, { transaction });

        for (const field of subForm.fields) {
          await sequelize.models.Field.create({
            form_id: newForm.id,
            sub_form_id: newSubForm.id,
            type: field.type,
            title: field.title,
            placeholder: field.placeholder,
            required: field.required,
            order: field.order,
            options: field.options,
            show_condition: field.show_condition,
            telegram_config: field.telegram_config,
            validation_rules: field.validation_rules,
          }, { transaction });
        }
      }

      await transaction.commit();
      return newForm;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  };

  /**
   * Increment version
   */
  Form.prototype.incrementVersion = async function(options = {}) {
    this.version += 1;
    await this.save(options);
    return this;
  };

  /**
   * Class Methods
   */

  /**
   * Find active forms accessible by role
   * @param {string} userRole - User role
   * @returns {Promise<Form[]>}
   */
  Form.findByRole = async function(userRole) {
    const { Op } = sequelize.Sequelize;

    return await Form.findAll({
      where: {
        is_active: true,
        [Op.or]: [
          { roles_allowed: { [Op.contains]: [userRole] } },
          userRole === 'admin' ? { roles_allowed: { [Op.not]: null } } : {},
        ],
      },
      order: [['createdAt', 'DESC']],
    });
  };

  /**
   * Get forms with submission counts
   * @returns {Promise<Form[]>}
   */
  Form.findWithSubmissionCounts = async function() {
    return await Form.findAll({
      attributes: {
        include: [
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM submissions
              WHERE submissions.form_id = "Form".id
            )`),
            'submissionCount',
          ],
        ],
      },
      order: [['createdAt', 'DESC']],
    });
  };

  /**
   * Model Associations
   */
  Form.associate = (models) => {
    // Form belongs to User (creator)
    Form.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator',
      onDelete: 'SET NULL',
    });

    // Form has many Fields
    Form.hasMany(models.Field, {
      foreignKey: 'form_id',
      as: 'fields',
      onDelete: 'CASCADE',
      // IMPORTANT: Use 'order' column, NOT 'order_index'
      order: [['order', 'ASC']]
    });

    // Form has many SubForms
    Form.hasMany(models.SubForm, {
      foreignKey: 'form_id',
      as: 'subForms',
      onDelete: 'CASCADE',
      // IMPORTANT: Use 'order' column, NOT 'order_index'
      order: [['order', 'ASC']]
    });

    // Form has many Submissions
    Form.hasMany(models.Submission, {
      foreignKey: 'form_id',
      as: 'submissions',
      onDelete: 'CASCADE',
    });

    // Form has many SheetImportConfigs
    Form.hasMany(models.SheetImportConfig, {
      foreignKey: 'form_id',
      as: 'sheetImportConfigs',
      onDelete: 'CASCADE',
    });

    // Form has many SheetImportHistory
    Form.hasMany(models.SheetImportHistory, {
      foreignKey: 'form_id',
      as: 'sheetImportHistory',
      onDelete: 'CASCADE',
    });

    // Form has many NotificationRules
    Form.hasMany(models.NotificationRule, {
      foreignKey: 'form_id',
      as: 'notificationRules',
      onDelete: 'CASCADE',
    });
  };

  /**
   * Scopes for common queries
   */
  Form.addScope('active', {
    where: { is_active: true },
  });

  Form.addScope('withCreator', {
    include: [
      {
        model: sequelize.models.User,
        as: 'creator',
        attributes: ['id', 'username', 'email', 'role'],
      },
    ],
  });

  Form.addScope('withFields', {
    include: [
      {
        model: sequelize.models.Field,
        as: 'fields',
        where: { sub_form_id: null },
        required: false,
      },
    ],
  });

  Form.addScope('full', {
    include: [
      {
        association: 'fields',
        where: { sub_form_id: null },
        required: false,
      },
      {
        association: 'subForms',
        include: [
          {
            association: 'fields',
          },
        ],
      },
      {
        association: 'creator',
        attributes: ['id', 'username', 'email', 'role'],
      },
    ],
  });

  /**
   * Override toJSON to ensure fields are properly serialized
   * This ensures Field.toJSON() is called for each field
   */
  Form.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());

    // Manually serialize fields array to ensure Field.toJSON() is called
    if (values.fields && Array.isArray(values.fields)) {
      values.fields = values.fields.map(field => {
        // If field is a Sequelize instance, call its toJSON()
        return field.toJSON ? field.toJSON() : field;
      });
    }

    // Manually serialize subForms and their fields
    if (values.subForms && Array.isArray(values.subForms)) {
      values.subForms = values.subForms.map(subForm => {
        const subFormData = subForm.toJSON ? subForm.toJSON() : subForm;

        // Serialize sub-form fields
        if (subFormData.fields && Array.isArray(subFormData.fields)) {
          subFormData.fields = subFormData.fields.map(field => {
            return field.toJSON ? field.toJSON() : field;
          });
        }

        return subFormData;
      });
    }

    // Extract telegram settings from settings.telegram for frontend compatibility
    if (values.settings && values.settings.telegram) {
      values.telegramSettings = values.settings.telegram;
    }

    return values;
  };

  return Form;
};