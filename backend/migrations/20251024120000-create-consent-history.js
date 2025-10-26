/**
 * Migration: Create Consent History Table
 * Purpose: Track all consent changes over time for PDPA Section 15 compliance
 *
 * PDPA Thailand Requirements:
 * - Section 15: Records of consent collection
 * - Section 39: Audit trail requirements
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('consent_history', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_consent_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'user_consents',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Reference to the consent record'
      },
      profile_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'unified_user_profiles',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Unified profile for the data subject'
      },
      consent_item_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'consent_items',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Which consent item this relates to'
      },
      action: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Type of consent action: given, withdrawn, edited, renewed'
      },
      old_status: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Previous consent status (true/false)'
      },
      new_status: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'New consent status (true/false)'
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Reason for withdrawal or change'
      },
      legal_basis: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Legal basis for processing (PDPA Section 24-26)'
      },
      changed_by_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Admin user who made the change (if applicable)'
      },
      changed_by_role: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Role of the user who made the change'
      },
      signature_data_url: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Digital signature as data URL (for explicit consent)'
      },
      ip_address: {
        type: Sequelize.INET,
        allowNull: true,
        comment: 'IP address of the consent action'
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Browser/device information'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'When this consent change occurred'
      }
    });

    // Add indexes for efficient queries
    await queryInterface.addIndex('consent_history', ['user_consent_id'], {
      name: 'idx_consent_history_user_consent_id'
    });
    await queryInterface.addIndex('consent_history', ['profile_id'], {
      name: 'idx_consent_history_profile_id'
    });
    await queryInterface.addIndex('consent_history', ['consent_item_id'], {
      name: 'idx_consent_history_consent_item_id'
    });
    await queryInterface.addIndex('consent_history', ['action'], {
      name: 'idx_consent_history_action'
    });
    await queryInterface.addIndex('consent_history', ['created_at'], {
      name: 'idx_consent_history_created_at'
    });
    await queryInterface.addIndex('consent_history', ['profile_id', 'created_at'], {
      name: 'idx_consent_history_profile_created'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('consent_history');
  },
};
