/**
 * Migration: Create Fields Table
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('fields', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      form_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'forms',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      sub_form_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'sub_forms',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM(
          'short_answer',
          'paragraph',
          'email',
          'phone',
          'number',
          'url',
          'file_upload',
          'image_upload',
          'date',
          'time',
          'datetime',
          'multiple_choice',
          'rating',
          'slider',
          'lat_long',
          'province',
          'factory'
        ),
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      placeholder: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      required: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      order: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      options: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: '{}',
      },
      show_condition: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: '{"enabled": true}',
      },
      telegram_config: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: '{"enabled": false}',
      },
      validation_rules: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: '{}',
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
    await queryInterface.addIndex('fields', ['form_id']);
    await queryInterface.addIndex('fields', ['sub_form_id']);
    await queryInterface.addIndex('fields', ['order']);
    await queryInterface.addIndex('fields', ['type']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('fields');
  },
};