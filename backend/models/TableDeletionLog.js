/**
 * TableDeletionLog Model
 * Tracks all dynamic table deletions for audit purposes
 * Version: v0.7.29
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TableDeletionLog = sequelize.define('TableDeletionLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    tableName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'table_name',
      comment: 'Name of the deleted table'
    },
    tableType: {
      type: DataTypes.ENUM('main_form', 'sub_form'),
      allowNull: false,
      field: 'table_type',
      comment: 'Type of table deleted'
    },
    formId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'form_id',
      comment: 'Reference to form that owned this table'
    },
    formTitle: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'form_title',
      comment: 'Title of the form for reference'
    },
    subFormId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'sub_form_id',
      comment: 'Reference to sub-form if applicable'
    },
    subFormTitle: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'sub_form_title',
      comment: 'Title of the sub-form for reference'
    },
    rowCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      field: 'row_count',
      comment: 'Number of rows in table before deletion'
    },
    deletedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'deleted_by',
      comment: 'User who deleted the table'
    },
    deletedByUsername: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'deleted_by_username',
      comment: 'Username for reference'
    },
    deletionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'deletion_reason',
      comment: 'Optional reason for deletion'
    },
    backupCreated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      field: 'backup_created',
      comment: 'Whether backup was created before deletion'
    },
    backupPath: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'backup_path',
      comment: 'Path to backup file if created'
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'deleted_at',
      comment: 'Timestamp of deletion'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional metadata (field count, file count, etc.)'
    }
  }, {
    tableName: 'table_deletion_logs',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['table_name'] },
      { fields: ['deleted_by'] },
      { fields: ['deleted_at'] },
      { fields: ['form_id'] },
      { fields: ['sub_form_id'] }
    ]
  });

  /**
   * Define associations
   */
  TableDeletionLog.associate = (models) => {
    TableDeletionLog.belongsTo(models.User, {
      foreignKey: 'deletedBy',
      as: 'deleter'
    });
  };

  /**
   * Static method to log table deletion
   * @param {Object} data - Deletion data
   * @returns {Promise<TableDeletionLog>}
   */
  TableDeletionLog.logDeletion = async function(data) {
    const {
      tableName,
      tableType,
      formId,
      formTitle,
      subFormId,
      subFormTitle,
      rowCount,
      deletedBy,
      deletedByUsername,
      deletionReason,
      backupCreated,
      backupPath,
      metadata
    } = data;

    return await this.create({
      tableName,
      tableType,
      formId,
      formTitle,
      subFormId,
      subFormTitle,
      rowCount: rowCount || 0,
      deletedBy,
      deletedByUsername,
      deletionReason,
      backupCreated: backupCreated || false,
      backupPath,
      metadata,
      deletedAt: new Date()
    });
  };

  /**
   * Get deletion history for a form
   * @param {string} formId - Form ID
   * @returns {Promise<Array>}
   */
  TableDeletionLog.getFormDeletionHistory = async function(formId) {
    return await this.findAll({
      where: { formId },
      include: [{
        model: sequelize.models.User,
        as: 'deleter',
        attributes: ['id', 'username', 'email']
      }],
      order: [['deletedAt', 'DESC']]
    });
  };

  /**
   * Get deletion history by user
   * @param {string} userId - User ID
   * @returns {Promise<Array>}
   */
  TableDeletionLog.getUserDeletionHistory = async function(userId) {
    return await this.findAll({
      where: { deletedBy: userId },
      order: [['deletedAt', 'DESC']],
      limit: 100
    });
  };

  return TableDeletionLog;
};
