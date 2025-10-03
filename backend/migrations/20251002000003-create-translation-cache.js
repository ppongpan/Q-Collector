/**
 * Migration: Create Translation Cache Table
 *
 * Stores translated Thai→English phrases for fast lookup
 * Part of 3-tier translation system (Dictionary → Cache → API)
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('translation_cache', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      thai_text: {
        type: Sequelize.TEXT,
        allowNull: false,
        unique: true,
      },
      english_text: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      source: {
        type: Sequelize.ENUM('dictionary', 'api', 'manual'),
        defaultValue: 'api',
        allowNull: false,
        comment: 'Source of translation: dictionary, api (MyMemory), or manual',
      },
      confidence: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true,
        comment: 'Confidence score 0.00-1.00',
      },
      used_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Number of times this translation was used',
      },
      last_used_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last time this translation was retrieved',
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
    await queryInterface.addIndex('translation_cache', ['thai_text']);
    await queryInterface.addIndex('translation_cache', ['source']);
    await queryInterface.addIndex('translation_cache', ['last_used_at']);
    await queryInterface.addIndex('translation_cache', ['used_count']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('translation_cache');
  },
};
