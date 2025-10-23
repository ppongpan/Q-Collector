'use strict';

/**
 * Migration: Create user_preferences table
 * Purpose: Store user-specific preferences for form lists, dashboard, etc.
 * Version: v0.8.0-dev
 * Date: 2025-10-21
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create user_preferences table
    await queryInterface.createTable('user_preferences', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        comment: 'Primary key (UUID)'
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'User who owns these preferences'
      },
      context_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Type of preference context: form_list, global, dashboard, etc.'
      },
      context_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Context identifier: formId for form_list, null for global preferences'
      },
      preferences: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
        comment: 'User preference settings stored as JSON (flexible schema)'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Timestamp when preference was created'
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Timestamp when preference was last updated'
      }
    }, {
      comment: 'User preferences for form lists, dashboard settings, and other context-specific configurations'
    });

    // Create unique index to ensure one preference per user per context
    await queryInterface.addIndex('user_preferences',
      ['user_id', 'context_type', 'context_id'],
      {
        unique: true,
        name: 'unique_user_context_preference',
        comment: 'Ensure one preference record per user per context'
      }
    );

    // Create lookup index for fast queries
    await queryInterface.addIndex('user_preferences',
      ['user_id', 'context_type'],
      {
        name: 'idx_user_prefs_lookup',
        comment: 'Fast lookup index for user preferences by context type'
      }
    );

    // Create index on context_id for filtering
    await queryInterface.addIndex('user_preferences',
      ['context_id'],
      {
        name: 'idx_prefs_context_id',
        comment: 'Index on context_id for filtering preferences by form/dashboard'
      }
    );

    console.log('✅ user_preferences table created successfully');
  },

  async down(queryInterface, Sequelize) {
    // Drop indexes first
    await queryInterface.removeIndex('user_preferences', 'idx_prefs_context_id');
    await queryInterface.removeIndex('user_preferences', 'idx_user_prefs_lookup');
    await queryInterface.removeIndex('user_preferences', 'unique_user_context_preference');

    // Drop table
    await queryInterface.dropTable('user_preferences');

    console.log('✅ user_preferences table dropped successfully');
  }
};
