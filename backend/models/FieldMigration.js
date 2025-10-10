/**
 * FieldMigration Model
 *
 * Tracks all schema changes (field additions, deletions, modifications)
 * to dynamic tables with backup references and rollback capabilities.
 *
 * Created: 2025-10-07
 * Sprint: 1 (Database Architecture - Field Migration System v0.8.0)
 */

module.exports = (sequelize, DataTypes) => {
  const FieldMigration = sequelize.define('FieldMigration', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    field_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'fields',
        key: 'id',
      },
      onDelete: 'SET NULL',
      comment: 'Reference to field (null if field deleted)',
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
    migration_type: {
      type: DataTypes.ENUM(
        'ADD_COLUMN',
        'DROP_COLUMN',
        'MODIFY_COLUMN',
        'RENAME_COLUMN'
      ),
      allowNull: false,
      comment: 'Type of migration operation',
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
      allowNull: true,
      validate: {
        len: [0, 255],
      },
      comment: 'Column affected by migration',
    },
    old_value: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: 'Previous field configuration',
    },
    new_value: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: 'New field configuration',
    },
    backup_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'field_data_backups',
        key: 'id',
      },
      onDelete: 'SET NULL',
      comment: 'Reference to data backup',
    },
    executed_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
      comment: 'User who executed the migration',
    },
    executed_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
      comment: 'Timestamp of migration execution',
    },
    success: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      validate: {
        isBoolean(value) {
          if (typeof value !== 'boolean') {
            throw new Error('success must be a boolean');
          }
        },
      },
      comment: 'Whether migration executed successfully',
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      comment: 'Error details if migration failed',
    },
    rollback_sql: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      comment: 'SQL statement to rollback this migration',
    },
  }, {
    tableName: 'field_migrations',
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ['form_id'] },
      { fields: ['field_id'] },
      { fields: ['table_name'] },
      { fields: ['executed_at'] },
      { fields: ['success'] },
      { fields: ['migration_type'] },
    ],
  });

  /**
   * Instance Methods
   */

  /**
   * Check if this migration can be rolled back
   * @returns {boolean}
   */
  FieldMigration.prototype.canRollback = function() {
    // Can only rollback successful migrations
    if (!this.success) {
      return false;
    }

    // Can't rollback if no rollback SQL
    if (!this.rollback_sql) {
      return false;
    }

    // Can't rollback ADD_COLUMN if field still exists (would leave orphaned field)
    if (this.migration_type === 'ADD_COLUMN' && this.field_id !== null) {
      return false;
    }

    return true;
  };

  /**
   * Get the rollback SQL for this migration
   * @returns {string|null}
   */
  FieldMigration.prototype.getRollbackSQL = function() {
    if (!this.canRollback()) {
      return null;
    }
    return this.rollback_sql;
  };

  /**
   * Get migration summary for display
   * @returns {Object}
   */
  FieldMigration.prototype.getSummary = function() {
    return {
      id: this.id,
      type: this.migration_type,
      tableName: this.table_name,
      columnName: this.column_name,
      success: this.success,
      executedAt: this.executed_at,
      canRollback: this.canRollback(),
      hasBackup: !!this.backup_id,
    };
  };

  /**
   * Check if migration is recent (within 24 hours)
   * @returns {boolean}
   */
  FieldMigration.prototype.isRecent = function() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.executed_at >= oneDayAgo;
  };

  /**
   * Get user-friendly description of migration
   * @returns {string}
   */
  FieldMigration.prototype.getDescription = function() {
    const typeDescriptions = {
      ADD_COLUMN: 'Added column',
      DROP_COLUMN: 'Removed column',
      MODIFY_COLUMN: 'Modified column',
      RENAME_COLUMN: 'Renamed column',
    };

    const typeDesc = typeDescriptions[this.migration_type] || 'Unknown operation';
    const columnInfo = this.column_name ? ` "${this.column_name}"` : '';
    const tableInfo = ` in table "${this.table_name}"`;
    const statusInfo = this.success ? '' : ' (FAILED)';

    return `${typeDesc}${columnInfo}${tableInfo}${statusInfo}`;
  };

  /**
   * Class Methods
   */

  /**
   * Find all successful migrations for a form
   * @param {string} formId - Form UUID
   * @returns {Promise<FieldMigration[]>}
   */
  FieldMigration.findByForm = async function(formId) {
    return await FieldMigration.findAll({
      where: { form_id: formId },
      order: [['executed_at', 'DESC']],
      include: [
        {
          model: sequelize.models.User,
          as: 'executor',
          attributes: ['id', 'username', 'email'],
        },
        {
          model: sequelize.models.FieldDataBackup,
          as: 'backup',
          required: false,
        },
      ],
    });
  };

  /**
   * Find recent migrations (last 24 hours)
   * @returns {Promise<FieldMigration[]>}
   */
  FieldMigration.findRecent = async function() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return await FieldMigration.findAll({
      where: {
        executed_at: {
          [sequelize.Sequelize.Op.gte]: oneDayAgo,
        },
      },
      order: [['executed_at', 'DESC']],
    });
  };

  /**
   * Get migration statistics for a form
   * @param {string} formId - Form UUID
   * @returns {Promise<Object>}
   */
  FieldMigration.getStatistics = async function(formId) {
    const migrations = await FieldMigration.findAll({
      where: { form_id: formId },
      attributes: [
        'migration_type',
        'success',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['migration_type', 'success'],
      raw: true,
    });

    const stats = {
      total: 0,
      successful: 0,
      failed: 0,
      byType: {},
    };

    migrations.forEach(({ migration_type, success, count }) => {
      const num = parseInt(count, 10);
      stats.total += num;

      if (success) {
        stats.successful += num;
      } else {
        stats.failed += num;
      }

      if (!stats.byType[migration_type]) {
        stats.byType[migration_type] = { success: 0, failed: 0 };
      }

      if (success) {
        stats.byType[migration_type].success += num;
      } else {
        stats.byType[migration_type].failed += num;
      }
    });

    return stats;
  };

  /**
   * Model Associations
   */
  FieldMigration.associate = (models) => {
    // FieldMigration belongs to Field (nullable)
    FieldMigration.belongsTo(models.Field, {
      foreignKey: 'field_id',
      as: 'field',
      onDelete: 'SET NULL',
    });

    // FieldMigration belongs to Form
    FieldMigration.belongsTo(models.Form, {
      foreignKey: 'form_id',
      as: 'form',
      onDelete: 'CASCADE',
    });

    // FieldMigration belongs to FieldDataBackup (nullable)
    FieldMigration.belongsTo(models.FieldDataBackup, {
      foreignKey: 'backup_id',
      as: 'backup',
      onDelete: 'SET NULL',
    });

    // FieldMigration belongs to User (executor)
    FieldMigration.belongsTo(models.User, {
      foreignKey: 'executed_by',
      as: 'executor',
      onDelete: 'SET NULL',
    });
  };

  /**
   * Scopes for common queries
   */
  FieldMigration.addScope('successful', {
    where: { success: true },
  });

  FieldMigration.addScope('failed', {
    where: { success: false },
  });

  FieldMigration.addScope('recent', {
    where: {
      executed_at: {
        [sequelize.Sequelize.Op.gte]: sequelize.literal("NOW() - INTERVAL '24 hours'"),
      },
    },
    order: [['executed_at', 'DESC']],
  });

  FieldMigration.addScope('rollbackable', {
    where: {
      success: true,
      rollback_sql: {
        [sequelize.Sequelize.Op.ne]: null,
      },
    },
  });

  FieldMigration.addScope('withRelations', {
    include: [
      {
        model: sequelize.models.User,
        as: 'executor',
        attributes: ['id', 'username', 'email'],
      },
      {
        model: sequelize.models.Form,
        as: 'form',
        attributes: ['id', 'title', 'table_name'],
      },
      {
        model: sequelize.models.Field,
        as: 'field',
        required: false,
        attributes: ['id', 'title', 'type'],
      },
      {
        model: sequelize.models.FieldDataBackup,
        as: 'backup',
        required: false,
      },
    ],
  });

  return FieldMigration;
};
