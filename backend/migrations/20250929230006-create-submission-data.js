/**
 * Migration: Create Submission Data Table
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('submission_data', {
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
      value_text: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      value_encrypted: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      value_type: {
        type: Sequelize.ENUM('string', 'number', 'boolean', 'date', 'json', 'file'),
        allowNull: false,
        defaultValue: 'string',
      },
      is_encrypted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
    await queryInterface.addIndex('submission_data', ['submission_id']);
    await queryInterface.addIndex('submission_data', ['field_id']);
    await queryInterface.addIndex('submission_data', ['is_encrypted']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('submission_data');
  },
};