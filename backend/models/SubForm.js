/**
 * SubForm Model
 * Manages sub-forms (nested forms within main forms)
 */

module.exports = (sequelize, DataTypes) => {
  const SubForm = sequelize.define('SubForm', {
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
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    table_name: {
      type: DataTypes.STRING(63),
      allowNull: true,
      comment: 'PostgreSQL table name for this sub-form',
    },
  }, {
    tableName: 'sub_forms',
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ['form_id'] },
      { fields: ['order'] },
    ],
  });

  /**
   * Instance Methods
   */

  /**
   * Get sub-form with all fields
   * @returns {Promise<SubForm>}
   */
  SubForm.prototype.getWithFields = async function() {
    return await SubForm.findByPk(this.id, {
      include: [
        {
          model: sequelize.models.Field,
          as: 'fields',
          order: [['order', 'ASC']],
        },
      ],
    });
  };

  /**
   * Model Associations
   */
  SubForm.associate = (models) => {
    // SubForm belongs to Form
    SubForm.belongsTo(models.Form, {
      foreignKey: 'form_id',
      as: 'form',
      onDelete: 'CASCADE',
    });

    // SubForm has many Fields
    SubForm.hasMany(models.Field, {
      foreignKey: 'sub_form_id',
      as: 'fields',
      onDelete: 'CASCADE',
    });
  };

  /**
   * Scopes for common queries
   */
  SubForm.addScope('ordered', {
    order: [['order', 'ASC']],
  });

  SubForm.addScope('withFields', {
    include: [
      {
        model: sequelize.models.Field,
        as: 'fields',
        order: [['order', 'ASC']],
      },
    ],
  });

  return SubForm;
};