/**
 * Migration: Create Sheet Import Configs Table
 *
 * Stores Google Sheets import configuration including URL, sheet name, and field mapping.
 * Part of Google Sheets Import System v0.8.0
 *
 * Features:
 * - Stores sheet URL and sheet name
 * - JSONB field_mapping for flexible column → field mapping
 * - Support for both main forms and sub-forms
 * - Tracks import statistics (last_import_at, total_imports)
 * - Auto-create fields option for dynamic form building
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sheet_import_configs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
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
        comment: 'User who created this import configuration',
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
        comment: 'Target form for data import',
      },
      sub_form_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'sub_forms',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        comment: 'Optional target sub-form for data import',
      },
      sheet_url: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'Full Google Sheets URL',
      },
      sheet_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Sheet name/tab name within the spreadsheet',
      },
      google_sheet_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Extracted Google Sheet ID from URL',
      },
      field_mapping: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
        comment: 'Column → Field mapping. Format: {"A": "field_id_1", "B": "field_id_2"}',
      },
      skip_header_row: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Whether to skip the first row (header)',
      },
      auto_create_fields: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Automatically create fields from sheet columns if they do not exist',
      },
      last_import_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp of last successful import',
      },
      total_imports: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Total number of imports executed with this configuration',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes for performance
    await queryInterface.addIndex('sheet_import_configs', ['user_id'], {
      name: 'idx_sheet_import_configs_user',
    });

    await queryInterface.addIndex('sheet_import_configs', ['form_id'], {
      name: 'idx_sheet_import_configs_form',
    });

    await queryInterface.addIndex('sheet_import_configs', ['sub_form_id'], {
      name: 'idx_sheet_import_configs_sub_form',
    });

    await queryInterface.addIndex('sheet_import_configs', ['last_import_at'], {
      name: 'idx_sheet_import_configs_last_import',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('sheet_import_configs');
  },
};
