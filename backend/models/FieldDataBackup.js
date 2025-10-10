/**
 * FieldDataBackup Model
 * Stores snapshots of field data before schema changes for safe rollback
 *
 * Created: 2025-10-07
 * Sprint: 1 (Database Architecture - Field Migration System v0.8.0)
 */

module.exports = (sequelize, DataTypes) => {
  const FieldDataBackup = sequelize.define('FieldDataBackup', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    field_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Original field ID (may be deleted)',
    },
    form_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'forms',
        key: 'id',
      },
      onDelete: 'CASCADE',
      comment: 'Reference to parent form (cascade delete)',
    },
    table_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [1, 255],
      },
      comment: 'PostgreSQL dynamic table name',
    },
    column_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [1, 255],
      },
      comment: 'Column name that was backed up',
    },
    data_snapshot: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      validate: {
        isValidSnapshot(value) {
          if (!Array.isArray(value)) {
            throw new Error('data_snapshot must be an array');
          }
          // Each item should have id and value properties
          const invalidItems = value.filter(item =>
            typeof item !== 'object' ||
            !item.hasOwnProperty('id') ||
            !item.hasOwnProperty('value')
          );
          if (invalidItems.length > 0) {
            throw new Error('Each snapshot item must have id and value properties');
          }
        },
      },
      comment: 'Array of {id, value} objects representing all data',
    },
    backup_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'MANUAL',
      validate: {
        isIn: {
          args: [['MANUAL', 'AUTO_DELETE', 'AUTO_MODIFY', 'AUTO_RENAME', 'pre_delete', 'pre_type_change']],
          msg: 'Invalid backup type',
        },
      },
      comment: 'Type of backup (MANUAL, AUTO_DELETE, etc.)',
    },
    retention_until: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Auto-delete after this date (default: 90 days)',
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
      comment: 'User who created the backup',
    },
  }, {
    tableName: 'field_data_backups',
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ['form_id'] },
      { fields: ['field_id'] },
      { fields: ['table_name'] },
      { fields: ['retention_until'] },
      { fields: ['backup_type'] },
      { fields: ['createdAt'] },
    ],
    hooks: {
      /**
       * Set retention_until to 90 days from now if not provided
       */
      beforeCreate: (backup) => {
        if (!backup.retention_until) {
          const ninetyDaysFromNow = new Date();
          ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
          backup.retention_until = ninetyDaysFromNow;
        }
      },
    },
  });

  /**
   * Instance Methods
   */

  /**
   * Check if this backup has expired (past retention period)
   * @returns {boolean}
   */
  FieldDataBackup.prototype.isExpired = function() {
    if (!this.retention_until) {
      return false;
    }
    return new Date() > new Date(this.retention_until);
  };

  /**
   * Get the number of records in this backup
   * @returns {number}
   */
  FieldDataBackup.prototype.getRecordCount = function() {
    if (!this.data_snapshot || !Array.isArray(this.data_snapshot)) {
      return 0;
    }
    return this.data_snapshot.length;
  };

  /**
   * Get days remaining until expiration
   * @returns {number|null} Days remaining or null if no retention_until
   */
  FieldDataBackup.prototype.getDaysUntilExpiration = function() {
    if (!this.retention_until) {
      return null;
    }
    const now = new Date();
    const expirationDate = new Date(this.retention_until);
    const diffTime = expirationDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  /**
   * Restore data from this backup to a specified table
   * @param {Object} queryInterface - Sequelize query interface
   * @returns {Promise<Object>} Result object with success status and count
   */
  FieldDataBackup.prototype.restore = async function(queryInterface) {
    if (!this.data_snapshot || this.data_snapshot.length === 0) {
      return { success: false, message: 'No data to restore', count: 0 };
    }

    try {
      // Build CASE statement for bulk update
      const caseStatements = this.data_snapshot
        .map(item => `WHEN id = '${item.id}' THEN '${item.value}'`)
        .join('\n        ');

      const ids = this.data_snapshot.map(item => `'${item.id}'`).join(', ');

      const sql = `
        UPDATE "${this.table_name}"
        SET "${this.column_name}" = CASE
          ${caseStatements}
        END
        WHERE id IN (${ids});
      `;

      await queryInterface.sequelize.query(sql);

      return {
        success: true,
        message: `Restored ${this.data_snapshot.length} records`,
        count: this.data_snapshot.length,
      };
    } catch (error) {
      return {
        success: false,
        message: `Restore failed: ${error.message}`,
        count: 0,
      };
    }
  };

  /**
   * Get backup summary for display
   * @returns {Object}
   */
  FieldDataBackup.prototype.getSummary = function() {
    return {
      id: this.id,
      tableName: this.table_name,
      columnName: this.column_name,
      recordCount: this.getRecordCount(),
      backupType: this.backup_type,
      createdAt: this.createdAt,
      retentionUntil: this.retention_until,
      daysUntilExpiration: this.getDaysUntilExpiration(),
      isExpired: this.isExpired(),
    };
  };

  /**
   * Class Methods
   */

  /**
   * Delete all expired backups
   * @returns {Promise<number>} Number of backups deleted
   */
  FieldDataBackup.cleanupExpired = async function() {
    const now = new Date();
    const result = await FieldDataBackup.destroy({
      where: {
        retention_until: {
          [sequelize.Sequelize.Op.lt]: now,
        },
      },
    });
    return result;
  };

  /**
   * Find backups expiring soon (within specified days)
   * @param {number} days - Number of days threshold (default: 7)
   * @returns {Promise<FieldDataBackup[]>}
   */
  FieldDataBackup.findExpiringSoon = async function(days = 7) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return await FieldDataBackup.findAll({
      where: {
        retention_until: {
          [sequelize.Sequelize.Op.between]: [now, futureDate],
        },
      },
      order: [['retention_until', 'ASC']],
    });
  };

  /**
   * Find backups for a specific form
   * @param {string} formId - Form UUID
   * @returns {Promise<FieldDataBackup[]>}
   */
  FieldDataBackup.findByForm = async function(formId) {
    return await FieldDataBackup.findAll({
      where: { form_id: formId },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: sequelize.models.User,
          as: 'creator',
          attributes: ['id', 'username', 'email'],
        },
      ],
    });
  };

  /**
   * Find backups for a specific table and column
   * @param {string} tableName - Table name
   * @param {string} columnName - Column name
   * @returns {Promise<FieldDataBackup[]>}
   */
  FieldDataBackup.findByTableColumn = async function(tableName, columnName) {
    return await FieldDataBackup.findAll({
      where: {
        table_name: tableName,
        column_name: columnName,
      },
      order: [['createdAt', 'DESC']],
    });
  };

  /**
   * Get backup statistics for a form
   * @param {string} formId - Form UUID
   * @returns {Promise<Object>}
   */
  FieldDataBackup.getStatistics = async function(formId) {
    const backups = await FieldDataBackup.findAll({
      where: { form_id: formId },
      attributes: [
        'backup_type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.literal("jsonb_array_length(data_snapshot)")), 'total_records'],
      ],
      group: ['backup_type'],
      raw: true,
    });

    const stats = {
      total_backups: 0,
      total_records: 0,
      byType: {},
    };

    backups.forEach(({ backup_type, count, total_records }) => {
      const backupCount = parseInt(count, 10);
      const recordCount = parseInt(total_records, 10) || 0;

      stats.total_backups += backupCount;
      stats.total_records += recordCount;

      stats.byType[backup_type] = {
        count: backupCount,
        records: recordCount,
      };
    });

    return stats;
  };

  /**
   * Model Associations
   */
  FieldDataBackup.associate = (models) => {
    // FieldDataBackup belongs to Form
    FieldDataBackup.belongsTo(models.Form, {
      foreignKey: 'form_id',
      as: 'form',
      onDelete: 'CASCADE',
    });

    // FieldDataBackup belongs to User (creator)
    FieldDataBackup.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator',
      onDelete: 'SET NULL',
    });

    // FieldDataBackup has many FieldMigrations
    FieldDataBackup.hasMany(models.FieldMigration, {
      foreignKey: 'backup_id',
      as: 'migrations',
      onDelete: 'SET NULL',
    });
  };

  /**
   * Scopes for common queries
   */
  FieldDataBackup.addScope('expired', {
    where: {
      retention_until: {
        [sequelize.Sequelize.Op.lt]: new Date(),
      },
    },
  });

  FieldDataBackup.addScope('active', {
    where: {
      [sequelize.Sequelize.Op.or]: [
        { retention_until: null },
        {
          retention_until: {
            [sequelize.Sequelize.Op.gte]: new Date(),
          },
        },
      ],
    },
  });

  FieldDataBackup.addScope('recent', {
    where: {
      createdAt: {
        [sequelize.Sequelize.Op.gte]: sequelize.literal("NOW() - INTERVAL '30 days'"),
      },
    },
    order: [['createdAt', 'DESC']],
  });

  FieldDataBackup.addScope('withCreator', {
    include: [
      {
        model: sequelize.models.User,
        as: 'creator',
        attributes: ['id', 'username', 'email'],
      },
    ],
  });

  /**
   * Override toJSON to convert snake_case to camelCase for frontend
   */
  FieldDataBackup.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());

    // Map snake_case to camelCase
    if (values.field_id !== undefined) {
      values.fieldId = values.field_id;
      delete values.field_id;
    }
    if (values.form_id !== undefined) {
      values.formId = values.form_id;
      delete values.form_id;
    }
    if (values.table_name !== undefined) {
      values.tableName = values.table_name;
      delete values.table_name;
    }
    if (values.column_name !== undefined) {
      values.columnName = values.column_name;
      delete values.column_name;
    }
    if (values.data_snapshot !== undefined) {
      values.dataSnapshot = values.data_snapshot;
      delete values.data_snapshot;
    }
    if (values.backup_type !== undefined) {
      values.backupType = values.backup_type;
      delete values.backup_type;
    }
    if (values.retention_until !== undefined) {
      values.retentionUntil = values.retention_until;
      delete values.retention_until;
    }
    if (values.created_by !== undefined) {
      values.createdBy = values.created_by;
      delete values.created_by;
    }

    // Add computed properties
    values.recordCount = this.getRecordCount();
    values.isExpired = this.isExpired();
    values.daysUntilExpiration = this.getDaysUntilExpiration();

    return values;
  };

  return FieldDataBackup;
};
