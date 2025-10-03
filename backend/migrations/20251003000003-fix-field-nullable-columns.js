/**
 * Migration: Fix Field table nullable columns
 * Issue: show_condition and telegram_config should allow NULL
 * Fix: Change NOT NULL constraint to allow NULL, keep default values in app logic
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Change show_condition to allow NULL
    await queryInterface.changeColumn('fields', 'show_condition', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: 'Conditional visibility rules',
    });

    // Change telegram_config to allow NULL
    await queryInterface.changeColumn('fields', 'telegram_config', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: 'Telegram notification configuration',
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert show_condition to NOT NULL
    await queryInterface.changeColumn('fields', 'show_condition', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: { enabled: true },
      comment: 'Conditional visibility rules',
    });

    // Revert telegram_config to NOT NULL
    await queryInterface.changeColumn('fields', 'telegram_config', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: { enabled: false },
      comment: 'Telegram notification configuration',
    });
  },
};
