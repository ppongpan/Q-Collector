/**
 * Migration: Create notification_rules table
 *
 * Creates the notification_rules table for Q-Collector Advanced Telegram Notification System v0.8.0
 * This table stores rules for automated Telegram notifications triggered by field updates or scheduled events.
 *
 * Features:
 * - Supports field_update and scheduled trigger types
 * - Formula-based conditions using FormulaEngine (Google AppSheet-compatible)
 * - Configurable message templates with {field} placeholders
 * - Optional bot_token and group_id overrides for per-rule customization
 * - Priority levels (high, medium, low) for notification ordering
 * - Send-once option to prevent duplicate notifications
 *
 * Part of Q-Collector v0.8.0 Advanced Notification System
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🚀 [Migration] Creating notification_rules table...');

    await queryInterface.createTable('notification_rules', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
        comment: 'Unique identifier for notification rule',
      },
      form_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'forms',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Form this rule applies to (null for global rules)',
      },
      sub_form_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'sub_forms',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Sub-form this rule applies to (null for main form rules)',
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Human-readable name for this rule',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Detailed description of what this rule does',
      },
      trigger_type: {
        type: Sequelize.ENUM('field_update', 'scheduled'),
        allowNull: false,
        comment: 'Type of trigger: field_update (on submission) or scheduled (cron-based)',
      },
      schedule: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Cron expression for scheduled triggers (e.g., "0 9 * * *" for daily at 9am)',
      },
      condition_formula: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Formula to evaluate (FormulaEngine syntax, e.g., "[field] = value AND [other_field] > 100")',
      },
      target_field_id: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'For field_update triggers, which field to watch (null = watch all fields)',
      },
      bot_token: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Override default Telegram bot token (encrypted, optional)',
      },
      group_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Override default Telegram group ID (optional)',
      },
      message_template: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Message template with {field} placeholders (e.g., "New submission: {customer_name} - {status}")',
      },
      is_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this rule is active',
      },
      send_once: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'For trigger-based rules, send notification only once per submission',
      },
      priority: {
        type: Sequelize.ENUM('high', 'medium', 'low'),
        allowNull: false,
        defaultValue: 'medium',
        comment: 'Priority level for notification queue processing',
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        comment: 'User who created this rule',
      },
      updated_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        comment: 'User who last updated this rule',
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

    console.log('✅ notification_rules table created');

    // Create indexes for performance
    console.log('📊 [Migration] Creating indexes for notification_rules...');

    await queryInterface.addIndex('notification_rules', ['form_id'], {
      name: 'idx_notification_rules_form_id',
    });
    console.log('✅ Index created: idx_notification_rules_form_id');

    await queryInterface.addIndex('notification_rules', ['sub_form_id'], {
      name: 'idx_notification_rules_sub_form_id',
    });
    console.log('✅ Index created: idx_notification_rules_sub_form_id');

    await queryInterface.addIndex('notification_rules', ['trigger_type'], {
      name: 'idx_notification_rules_trigger_type',
    });
    console.log('✅ Index created: idx_notification_rules_trigger_type');

    await queryInterface.addIndex('notification_rules', ['is_enabled'], {
      name: 'idx_notification_rules_is_enabled',
    });
    console.log('✅ Index created: idx_notification_rules_is_enabled');

    await queryInterface.addIndex('notification_rules', ['target_field_id'], {
      name: 'idx_notification_rules_target_field_id',
    });
    console.log('✅ Index created: idx_notification_rules_target_field_id');

    await queryInterface.addIndex('notification_rules', ['priority'], {
      name: 'idx_notification_rules_priority',
    });
    console.log('✅ Index created: idx_notification_rules_priority');

    // Composite index for common queries
    await queryInterface.addIndex('notification_rules', ['form_id', 'trigger_type', 'is_enabled'], {
      name: 'idx_notification_rules_form_trigger_enabled',
    });
    console.log('✅ Index created: idx_notification_rules_form_trigger_enabled (composite)');

    console.log('🎉 [Migration] notification_rules table and indexes created successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Create NotificationRule model with associations and methods');
    console.log('2. Create notification_history table for tracking sent notifications');
    console.log('3. Implement NotificationService for processing rules');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('⏪ [Migration] Rolling back notification_rules table...');

    // Drop indexes first
    await queryInterface.removeIndex('notification_rules', 'idx_notification_rules_form_trigger_enabled');
    console.log('✅ Removed index: idx_notification_rules_form_trigger_enabled');

    await queryInterface.removeIndex('notification_rules', 'idx_notification_rules_priority');
    console.log('✅ Removed index: idx_notification_rules_priority');

    await queryInterface.removeIndex('notification_rules', 'idx_notification_rules_target_field_id');
    console.log('✅ Removed index: idx_notification_rules_target_field_id');

    await queryInterface.removeIndex('notification_rules', 'idx_notification_rules_is_enabled');
    console.log('✅ Removed index: idx_notification_rules_is_enabled');

    await queryInterface.removeIndex('notification_rules', 'idx_notification_rules_trigger_type');
    console.log('✅ Removed index: idx_notification_rules_trigger_type');

    await queryInterface.removeIndex('notification_rules', 'idx_notification_rules_sub_form_id');
    console.log('✅ Removed index: idx_notification_rules_sub_form_id');

    await queryInterface.removeIndex('notification_rules', 'idx_notification_rules_form_id');
    console.log('✅ Removed index: idx_notification_rules_form_id');

    // Drop table
    await queryInterface.dropTable('notification_rules');
    console.log('✅ Dropped table: notification_rules');

    console.log('🎉 [Migration] Rollback completed!');
  }
};
