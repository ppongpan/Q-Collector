'use strict';

/**
 * Migration: Create field_migrations Table
 *
 * Tracks all schema changes (field additions, deletions, modifications)
 * to dynamic tables with backup references and rollback capabilities.
 *
 * Created: 2025-10-07
 * Sprint: 1 (Database Architecture - Field Migration System v0.8.0)
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('field_migrations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false,
        comment: 'Unique migration identifier'
      },
      field_id: {
        type: Sequelize.UUID,
        references: {
          model: 'fields',
          key: 'id'
        },
        onDelete: 'SET NULL',
        allowNull: true,
        comment: 'Reference to field (null if field deleted)'
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
      migration_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Type: ADD_COLUMN, DROP_COLUMN, MODIFY_COLUMN, RENAME_COLUMN'
      },
      table_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'PostgreSQL dynamic table name (e.g., contact_form_123)'
      },
      column_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Column affected by migration (null for table-level operations)'
      },
      old_value: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: null,
        comment: 'Previous field configuration (for MODIFY/DROP operations)'
      },
      new_value: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: null,
        comment: 'New field configuration (for ADD/MODIFY operations)'
      },
      backup_id: {
        type: Sequelize.UUID,
        references: {
          model: 'field_data_backups',
          key: 'id'
        },
        onDelete: 'SET NULL',
        allowNull: true,
        comment: 'Reference to data backup (for rollback)'
      },
      executed_by: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL',
        allowNull: true,
        comment: 'User who executed the migration'
      },
      executed_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
        allowNull: false,
        comment: 'Timestamp of migration execution'
      },
      success: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        comment: 'Whether migration executed successfully'
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: 'Error details if migration failed'
      },
      rollback_sql: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: 'SQL statement to rollback this migration'
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
    await queryInterface.addIndex('field_migrations', ['form_id'], {
      name: 'idx_field_migrations_form_id'
    });

    await queryInterface.addIndex('field_migrations', ['field_id'], {
      name: 'idx_field_migrations_field_id'
    });

    await queryInterface.addIndex('field_migrations', ['table_name'], {
      name: 'idx_field_migrations_table_name'
    });

    await queryInterface.addIndex('field_migrations', ['executed_at'], {
      name: 'idx_field_migrations_executed_at'
    });

    await queryInterface.addIndex('field_migrations', ['success'], {
      name: 'idx_field_migrations_success'
    });

    await queryInterface.addIndex('field_migrations', ['migration_type'], {
      name: 'idx_field_migrations_type'
    });

    // Add comment to table
    await queryInterface.sequelize.query(
      `COMMENT ON TABLE field_migrations IS 'Tracks all schema changes to dynamic tables with backup and rollback support'`
    );
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('field_migrations');
  }
};
