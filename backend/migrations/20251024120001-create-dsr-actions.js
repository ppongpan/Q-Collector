/**
 * Migration: Create DSR Actions Table
 * Purpose: Track all actions taken on Data Subject Rights (DSR) requests
 *
 * PDPA Thailand Requirements:
 * - Section 30-38: Data Subject Rights workflow tracking
 * - Section 39: Audit trail for DSR request processing
 * - Section 41: Record retention for 3 years minimum
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('dsr_actions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      dsr_request_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'dsr_requests',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Reference to the DSR request'
      },
      action_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Type of action: created, assigned, in_progress, approved, rejected, completed, cancelled'
      },
      old_status: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Previous DSR request status'
      },
      new_status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'New DSR request status'
      },
      performed_by_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who performed this action'
      },
      performed_by_username: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Username (cached for historical records)'
      },
      performed_by_role: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'User role at time of action'
      },
      performed_by_email: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'User email (cached for historical records)'
      },
      legal_basis: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Legal justification for action (PDPA Section 24-26)'
      },
      justification: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Business justification for approval/rejection'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional notes or comments'
      },
      attachments_json: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of attachment metadata (file paths, names, sizes)'
      },
      ip_address: {
        type: Sequelize.INET,
        allowNull: true,
        comment: 'IP address of the action'
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Browser/device information'
      },
      duration_seconds: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Time taken to complete this action (for SLA tracking)'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'When this action occurred'
      }
    });

    // Add indexes for efficient queries
    await queryInterface.addIndex('dsr_actions', ['dsr_request_id'], {
      name: 'idx_dsr_actions_request_id'
    });
    await queryInterface.addIndex('dsr_actions', ['action_type'], {
      name: 'idx_dsr_actions_action_type'
    });
    await queryInterface.addIndex('dsr_actions', ['performed_by_user_id'], {
      name: 'idx_dsr_actions_performed_by'
    });
    await queryInterface.addIndex('dsr_actions', ['new_status'], {
      name: 'idx_dsr_actions_new_status'
    });
    await queryInterface.addIndex('dsr_actions', ['created_at'], {
      name: 'idx_dsr_actions_created_at'
    });
    await queryInterface.addIndex('dsr_actions', ['dsr_request_id', 'created_at'], {
      name: 'idx_dsr_actions_request_created'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('dsr_actions');
  },
};
