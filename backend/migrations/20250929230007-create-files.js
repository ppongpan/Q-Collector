/**
 * Migration: Create Files Table
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('files', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      submission_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'submissions',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      field_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'fields',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      filename: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      original_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      mime_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      size: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      minio_path: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      minio_bucket: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: 'qcollector',
      },
      checksum: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      uploaded_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      uploaded_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes
    await queryInterface.addIndex('files', ['submission_id']);
    await queryInterface.addIndex('files', ['field_id']);
    await queryInterface.addIndex('files', ['uploaded_by']);
    await queryInterface.addIndex('files', ['mime_type']);
    await queryInterface.addIndex('files', ['uploaded_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('files');
  },
};