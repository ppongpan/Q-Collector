/**
 * Migration: Create Forms Table
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('forms', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      roles_allowed: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: '["user"]',
      },
      settings: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: '{}',
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      version: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        allowNull: false,
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
    await queryInterface.addIndex('forms', ['created_by']);
    await queryInterface.addIndex('forms', ['is_active']);
    await queryInterface.addIndex('forms', ['createdAt']);
    await queryInterface.addIndex('forms', ['title']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('forms');
  },
};