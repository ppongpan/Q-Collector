'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add show_in_table column
    await queryInterface.addColumn('fields', 'show_in_table', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Display this field in submission table'
    });

    // Add send_telegram column
    await queryInterface.addColumn('fields', 'send_telegram', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Send this field value in Telegram notifications'
    });

    // Add telegram_order column for ordering fields in Telegram message
    await queryInterface.addColumn('fields', 'telegram_order', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Order of this field in Telegram notifications'
    });

    // Add telegram_prefix column for custom prefix in Telegram message
    await queryInterface.addColumn('fields', 'telegram_prefix', {
      type: Sequelize.STRING(100),
      allowNull: true,
      defaultValue: null,
      comment: 'Custom prefix for this field in Telegram notifications'
    });

    console.log('✅ Added show_in_table, send_telegram, telegram_order, telegram_prefix columns to fields table');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('fields', 'show_in_table');
    await queryInterface.removeColumn('fields', 'send_telegram');
    await queryInterface.removeColumn('fields', 'telegram_order');
    await queryInterface.removeColumn('fields', 'telegram_prefix');

    console.log('✅ Removed show_in_table, send_telegram, telegram_order, telegram_prefix columns from fields table');
  }
};
