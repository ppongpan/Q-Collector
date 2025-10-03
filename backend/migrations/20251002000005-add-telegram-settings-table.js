'use strict';

/**
 * Migration: Add telegram_settings table
 * Stores global Telegram configuration for Super Admin
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('telegram_settings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      bot_token: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Telegram Bot Token',
      },
      group_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Telegram Group/Channel ID',
      },
      enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Enable/Disable Telegram notifications globally',
      },
      updated_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'SET NULL',
        comment: 'Super Admin who last updated settings',
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

    // Create index
    await queryInterface.addIndex('telegram_settings', ['enabled']);

    // Insert default settings from environment variables
    await queryInterface.sequelize.query(`
      INSERT INTO telegram_settings (id, bot_token, group_id, enabled, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        '${process.env.TELEGRAM_BOT_TOKEN || ''}',
        '${process.env.TELEGRAM_GROUP_ID || ''}',
        ${process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_GROUP_ID ? 'true' : 'false'},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT DO NOTHING;
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('telegram_settings');
  },
};
