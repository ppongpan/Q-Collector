/**
 * Migration: Create Consent Items Table
 * Purpose: Store consent items that can be added to forms
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('consent_items', {
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
        onDelete: 'CASCADE',
        comment: 'Form this consent item belongs to',
      },
      title_th: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'Consent item title in Thai',
      },
      title_en: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Consent item title in English',
      },
      description_th: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Detailed description in Thai',
      },
      description_en: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Detailed description in English',
      },
      purpose: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Purpose of data collection (PDPA requirement)',
      },
      retention_period: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'How long data will be retained (e.g., "2 years", "Until user requests deletion")',
      },
      required: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether consent is required to submit form',
      },
      order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Display order in form',
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Version number for consent tracking',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this consent item is currently active',
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
    await queryInterface.addIndex('consent_items', ['form_id']);
    await queryInterface.addIndex('consent_items', ['is_active']);
    await queryInterface.addIndex('consent_items', ['order']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('consent_items');
  },
};
