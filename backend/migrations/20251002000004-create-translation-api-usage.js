/**
 * Migration: Create Translation API Usage Table
 *
 * Tracks MyMemory API usage for rate limiting and analytics
 * Daily limit: 1,000 requests
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('translation_api_usage', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        unique: true,
        comment: 'Date in YYYY-MM-DD format',
      },
      request_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Total API requests made this day',
      },
      success_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Successful API responses',
      },
      error_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Failed API requests',
      },
      cache_hit_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Times cache was used instead of API',
      },
      dictionary_hit_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Times dictionary was used instead of API',
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
    await queryInterface.addIndex('translation_api_usage', ['date']);
    await queryInterface.addIndex('translation_api_usage', ['created_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('translation_api_usage');
  },
};
