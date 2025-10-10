'use strict';

/**
 * Migration: Create field_data_backups Table
 *
 * Stores snapshots of field data before schema changes for safe rollback.
 * Implements automatic cleanup after 90-day retention period.
 *
 * Created: 2025-10-07
 * Sprint: 1 (Database Architecture - Field Migration System v0.8.0)
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('field_data_backups', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false,
        comment: 'Unique backup identifier'
      },
      field_id: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'Original field ID (may be deleted)'
      },
      form_id: {
        type: Sequelize.UUID,
        references: {
          model: 'forms',
          key: 'id'
        },
        onDelete: 'CASCADE',
        allowNull: false,
        comment: 'Reference to parent form (cascade delete)'
      },
      table_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'PostgreSQL dynamic table name'
      },
      column_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Column name that was backed up'
      },
      data_snapshot: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
        comment: 'Array of {id, value} objects representing all data'
      },
      backup_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'MANUAL',
        comment: 'Type: MANUAL, AUTO_DELETE, AUTO_MODIFY, AUTO_RENAME'
      },
      retention_until: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.literal("NOW() + INTERVAL '90 days'"),
        comment: 'Auto-delete after this date (default: 90 days)'
      },
      created_by: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL',
        allowNull: true,
        comment: 'User who created the backup'
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
        allowNull: false,
        
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
        allowNull: false,
        
      }
    });

    // Add indexes for performance
    await queryInterface.addIndex('field_data_backups', ['form_id'], {
      name: 'idx_field_data_backups_form_id'
    });

    await queryInterface.addIndex('field_data_backups', ['field_id'], {
      name: 'idx_field_data_backups_field_id'
    });

    await queryInterface.addIndex('field_data_backups', ['table_name'], {
      name: 'idx_field_data_backups_table_name'
    });

    await queryInterface.addIndex('field_data_backups', ['retention_until'], {
      name: 'idx_field_data_backups_retention'
    });

    await queryInterface.addIndex('field_data_backups', ['backup_type'], {
      name: 'idx_field_data_backups_type'
    });

    await queryInterface.addIndex('field_data_backups', ['createdAt'], {
      name: 'idx_field_data_backups_created_at'
    });

    // Add comment to table
    await queryInterface.sequelize.query(
      `COMMENT ON TABLE field_data_backups IS 'Stores field data snapshots for rollback with 90-day auto-cleanup'`
    );

    // Add constraint to ensure data_snapshot is an array
    await queryInterface.sequelize.query(`
      ALTER TABLE field_data_backups
      ADD CONSTRAINT check_data_snapshot_is_array
      CHECK (jsonb_typeof(data_snapshot) = 'array')
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('field_data_backups');
  }
};
