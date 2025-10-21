/**
 * Migration: Create Sheet Import History Table
 *
 * Tracks execution history of Google Sheets imports with detailed statistics.
 * Part of Google Sheets Import System v0.8.0
 *
 * Features:
 * - Tracks import execution (pending, running, completed, failed, rolled_back)
 * - Stores row counts (total, success, failed, skipped)
 * - JSONB errors array for detailed error tracking
 * - JSONB submission_ids array for rollback capability
 * - Execution timing (started_at, completed_at)
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sheet_import_history', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      config_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'sheet_import_configs',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Reference to import configuration used',
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'User who initiated this import',
      },
      form_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'forms',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Target form for this import execution',
      },
      total_rows: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total number of rows in the sheet (excluding header if skipped)',
      },
      success_rows: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of rows successfully imported',
      },
      failed_rows: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of rows that failed validation or import',
      },
      skipped_rows: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of rows skipped (empty or duplicate)',
      },
      errors: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of error objects with row number and error message',
      },
      submission_ids: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of created submission UUIDs for rollback capability',
      },
      status: {
        type: Sequelize.ENUM(
          'pending',
          'running',
          'completed',
          'completed_with_errors',
          'failed',
          'rolled_back'
        ),
        defaultValue: 'pending',
        allowNull: false,
        comment: 'Current status of import execution',
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'When the import started',
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the import finished (success or failure)',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes for performance
    await queryInterface.addIndex('sheet_import_history', ['config_id'], {
      name: 'idx_sheet_import_history_config',
    });

    await queryInterface.addIndex('sheet_import_history', ['user_id'], {
      name: 'idx_sheet_import_history_user',
    });

    await queryInterface.addIndex('sheet_import_history', ['form_id'], {
      name: 'idx_sheet_import_history_form',
    });

    await queryInterface.addIndex('sheet_import_history', ['status'], {
      name: 'idx_sheet_import_history_status',
    });

    await queryInterface.addIndex('sheet_import_history', ['started_at'], {
      name: 'idx_sheet_import_history_started',
    });

    await queryInterface.addIndex('sheet_import_history', ['completed_at'], {
      name: 'idx_sheet_import_history_completed',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('sheet_import_history');
  },
};
