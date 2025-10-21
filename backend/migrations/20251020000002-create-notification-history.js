/**
 * Migration: Create notification_history table
 *
 * Creates the notification_history table for Q-Collector Advanced Telegram Notification System v0.8.0
 * This table tracks all notification attempts, including condition evaluation results,
 * sent messages, and Telegram API responses.
 *
 * Features:
 * - Tracks condition evaluation results (met/not met)
 * - Stores actual message sent and Telegram API response
 * - Status tracking (pending, sent, failed, skipped)
 * - Error logging for failed notifications
 * - Duplicate detection via composite unique index (for send_once rules)
 * - Reporting and analytics support
 *
 * Part of Q-Collector v0.8.0 Advanced Notification System
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🚀 [Migration] Creating notification_history table...');

    await queryInterface.createTable('notification_history', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
        comment: 'Unique identifier for history record',
      },
      notification_rule_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'notification_rules',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Reference to notification rule that triggered this notification',
      },
      submission_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'submissions',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Submission that triggered this notification (null for scheduled notifications)',
      },
      sub_submission_id: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'Sub-form submission ID if notification was triggered by sub-form data',
      },
      condition_met: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        comment: 'Whether the condition formula evaluated to true',
      },
      condition_result: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Full formula evaluation result including intermediate values and errors',
      },
      message_sent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Actual message text sent to Telegram (after placeholder replacement)',
      },
      telegram_response: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Complete Telegram API response (message_id, chat, date, etc.)',
      },
      status: {
        type: Sequelize.ENUM('pending', 'sent', 'failed', 'skipped'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Notification status: pending (queued), sent (successful), failed (error), skipped (condition not met or already sent)',
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error details if notification failed',
      },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When notification was successfully sent (null if pending/failed)',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    console.log('✅ notification_history table created');

    // Create indexes for performance and reporting
    console.log('📊 [Migration] Creating indexes for notification_history...');

    await queryInterface.addIndex('notification_history', ['notification_rule_id'], {
      name: 'idx_notification_history_rule_id',
    });
    console.log('✅ Index created: idx_notification_history_rule_id');

    await queryInterface.addIndex('notification_history', ['submission_id'], {
      name: 'idx_notification_history_submission_id',
    });
    console.log('✅ Index created: idx_notification_history_submission_id');

    await queryInterface.addIndex('notification_history', ['status'], {
      name: 'idx_notification_history_status',
    });
    console.log('✅ Index created: idx_notification_history_status');

    await queryInterface.addIndex('notification_history', ['sent_at'], {
      name: 'idx_notification_history_sent_at',
    });
    console.log('✅ Index created: idx_notification_history_sent_at');

    await queryInterface.addIndex('notification_history', ['created_at'], {
      name: 'idx_notification_history_created_at',
    });
    console.log('✅ Index created: idx_notification_history_created_at');

    // Composite index for duplicate detection (send_once rules)
    await queryInterface.addIndex('notification_history', ['notification_rule_id', 'submission_id'], {
      name: 'idx_notification_history_rule_submission',
      unique: false, // Not unique because multiple attempts may occur (retries)
    });
    console.log('✅ Index created: idx_notification_history_rule_submission (composite)');

    // Composite index for status reporting
    await queryInterface.addIndex('notification_history', ['notification_rule_id', 'status', 'sent_at'], {
      name: 'idx_notification_history_rule_status_sent',
    });
    console.log('✅ Index created: idx_notification_history_rule_status_sent (composite)');

    // Composite index for condition analysis
    await queryInterface.addIndex('notification_history', ['notification_rule_id', 'condition_met'], {
      name: 'idx_notification_history_rule_condition',
    });
    console.log('✅ Index created: idx_notification_history_rule_condition (composite)');

    console.log('🎉 [Migration] notification_history table and indexes created successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Create NotificationHistory model with associations and methods');
    console.log('2. Implement NotificationService for processing rules and creating history records');
    console.log('3. Add reporting endpoints for notification analytics');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('⏪ [Migration] Rolling back notification_history table...');

    // Drop indexes first
    await queryInterface.removeIndex('notification_history', 'idx_notification_history_rule_condition');
    console.log('✅ Removed index: idx_notification_history_rule_condition');

    await queryInterface.removeIndex('notification_history', 'idx_notification_history_rule_status_sent');
    console.log('✅ Removed index: idx_notification_history_rule_status_sent');

    await queryInterface.removeIndex('notification_history', 'idx_notification_history_rule_submission');
    console.log('✅ Removed index: idx_notification_history_rule_submission');

    await queryInterface.removeIndex('notification_history', 'idx_notification_history_created_at');
    console.log('✅ Removed index: idx_notification_history_created_at');

    await queryInterface.removeIndex('notification_history', 'idx_notification_history_sent_at');
    console.log('✅ Removed index: idx_notification_history_sent_at');

    await queryInterface.removeIndex('notification_history', 'idx_notification_history_status');
    console.log('✅ Removed index: idx_notification_history_status');

    await queryInterface.removeIndex('notification_history', 'idx_notification_history_submission_id');
    console.log('✅ Removed index: idx_notification_history_submission_id');

    await queryInterface.removeIndex('notification_history', 'idx_notification_history_rule_id');
    console.log('✅ Removed index: idx_notification_history_rule_id');

    // Drop table
    await queryInterface.dropTable('notification_history');
    console.log('✅ Dropped table: notification_history');

    console.log('🎉 [Migration] Rollback completed!');
  }
};
