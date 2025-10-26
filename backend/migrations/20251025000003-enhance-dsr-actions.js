'use strict';

/**
 * Migration: Enhance DSR Actions for Workflow Tracking
 *
 * Adds enhanced tracking fields to dsr_actions table:
 * - Actor information (user, role, name)
 * - Detailed action types and metadata
 * - Legal compliance fields
 * - File attachment support
 *
 * @version v0.8.7-dev
 * @date 2025-10-25
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Add Actor tracking fields
      await queryInterface.addColumn('dsr_actions', 'actor_role', {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Role of the user who performed this action'
      }, { transaction });

      await queryInterface.addColumn('dsr_actions', 'actor_name', {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Full name of the user (for audit trail)'
      }, { transaction });

      // Add Enhanced action metadata
      await queryInterface.addColumn('dsr_actions', 'action_metadata', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Additional metadata about the action'
      }, { transaction });

      // Add PDPA section reference (legal_basis already exists)
      await queryInterface.addColumn('dsr_actions', 'pdpa_section', {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Specific PDPA section reference (e.g., Section 30, 31, etc.)'
      }, { transaction });

      // Note: attachments_json already exists in model, skip adding 'attachments'
      // Note: ip_address and user_agent already exist in model

      // Add Completion tracking
      await queryInterface.addColumn('dsr_actions', 'completed_at', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when this action was completed'
      }, { transaction });

      await queryInterface.addColumn('dsr_actions', 'is_automated', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this action was automated (vs manual)'
      }, { transaction });

      // Add Index for action type lookups
      await queryInterface.addIndex('dsr_actions', ['action_type'], {
        name: 'dsr_actions_action_type_idx',
        transaction
      });

      // Add Index for actor lookups (use existing performed_by_user_id column)
      await queryInterface.addIndex('dsr_actions', ['performed_by_user_id', 'created_at'], {
        name: 'dsr_actions_performed_by_user_created_idx',
        transaction
      });

      // Add Index for DSR request actions timeline
      await queryInterface.addIndex('dsr_actions', ['dsr_request_id', 'created_at'], {
        name: 'dsr_actions_request_timeline_idx',
        transaction
      });

      await transaction.commit();
      console.log('✅ Enhanced dsr_actions table with workflow tracking fields');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error enhancing dsr_actions:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Remove indexes
      await queryInterface.removeIndex('dsr_actions', 'dsr_actions_request_timeline_idx', { transaction });
      await queryInterface.removeIndex('dsr_actions', 'dsr_actions_performed_by_user_created_idx', { transaction });
      await queryInterface.removeIndex('dsr_actions', 'dsr_actions_action_type_idx', { transaction });

      // Remove columns (in reverse order, only ones we added)
      await queryInterface.removeColumn('dsr_actions', 'is_automated', { transaction });
      await queryInterface.removeColumn('dsr_actions', 'completed_at', { transaction });
      await queryInterface.removeColumn('dsr_actions', 'pdpa_section', { transaction });
      await queryInterface.removeColumn('dsr_actions', 'action_metadata', { transaction });
      await queryInterface.removeColumn('dsr_actions', 'actor_name', { transaction });
      await queryInterface.removeColumn('dsr_actions', 'actor_role', { transaction });

      await transaction.commit();
      console.log('✅ Reverted dsr_actions enhancements');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error reverting dsr_actions:', error);
      throw error;
    }
  }
};
