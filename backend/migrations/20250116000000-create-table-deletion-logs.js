/**
 * Migration: Create table_deletion_logs table
 * Purpose: Track all dynamic table deletions for audit purposes
 * Version: v0.7.29
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('table_deletion_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      table_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Name of the deleted table'
      },
      table_type: {
        type: Sequelize.ENUM('main_form', 'sub_form'),
        allowNull: false,
        comment: 'Type of table deleted'
      },
      form_id: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'Reference to form that owned this table'
      },
      form_title: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Title of the form for reference'
      },
      sub_form_id: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'Reference to sub-form if applicable'
      },
      sub_form_title: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Title of the sub-form for reference'
      },
      row_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Number of rows in table before deletion'
      },
      deleted_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL',
        comment: 'User who deleted the table'
      },
      deleted_by_username: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Username for reference'
      },
      deletion_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Optional reason for deletion'
      },
      backup_created: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Whether backup was created before deletion'
      },
      backup_path: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Path to backup file if created'
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'Timestamp of deletion'
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional metadata (field count, file count, etc.)'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for efficient querying
    await queryInterface.addIndex('table_deletion_logs', ['table_name'], {
      name: 'idx_table_deletion_logs_table_name'
    });

    await queryInterface.addIndex('table_deletion_logs', ['deleted_by'], {
      name: 'idx_table_deletion_logs_deleted_by'
    });

    await queryInterface.addIndex('table_deletion_logs', ['deleted_at'], {
      name: 'idx_table_deletion_logs_deleted_at'
    });

    await queryInterface.addIndex('table_deletion_logs', ['form_id'], {
      name: 'idx_table_deletion_logs_form_id'
    });

    await queryInterface.addIndex('table_deletion_logs', ['sub_form_id'], {
      name: 'idx_table_deletion_logs_sub_form_id'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('table_deletion_logs');
  }
};
