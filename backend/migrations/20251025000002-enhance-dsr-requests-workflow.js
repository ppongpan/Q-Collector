'use strict';

/**
 * Migration: Enhance DSR Requests for Complete Workflow
 *
 * Adds workflow tracking fields to dsr_requests table:
 * - DSR number generation (DSR-YYYYMMDD-XXXX)
 * - Review tracking (reviewer, date, notes)
 * - Approval/Rejection tracking
 * - Execution tracking
 * - Form references and legal basis
 *
 * @version v0.8.7-dev
 * @date 2025-10-25
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Add DSR Number (unique identifier)
      await queryInterface.addColumn('dsr_requests', 'dsr_number', {
        type: Sequelize.STRING(50),
        allowNull: true, // Will be populated by trigger/service
        unique: true,
        comment: 'Unique DSR identifier: DSR-YYYYMMDD-XXXX'
      }, { transaction });

      // Add Review tracking fields
      await queryInterface.addColumn('dsr_requests', 'reviewed_by', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who reviewed this DSR request'
      }, { transaction });

      await queryInterface.addColumn('dsr_requests', 'reviewed_at', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when DSR was reviewed'
      }, { transaction });

      await queryInterface.addColumn('dsr_requests', 'review_notes', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Notes from data controller review'
      }, { transaction });

      // Add Approval tracking fields
      await queryInterface.addColumn('dsr_requests', 'approved_by', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who approved this DSR request'
      }, { transaction });

      await queryInterface.addColumn('dsr_requests', 'approved_at', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when DSR was approved'
      }, { transaction });

      await queryInterface.addColumn('dsr_requests', 'approval_notes', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Notes explaining approval decision'
      }, { transaction });

      // Add Rejection tracking fields
      await queryInterface.addColumn('dsr_requests', 'rejected_by', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who rejected this DSR request'
      }, { transaction });

      await queryInterface.addColumn('dsr_requests', 'rejected_at', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when DSR was rejected'
      }, { transaction });

      await queryInterface.addColumn('dsr_requests', 'rejection_reason', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Detailed reason for rejection (min 50 chars)'
      }, { transaction });

      // Add Execution tracking fields
      await queryInterface.addColumn('dsr_requests', 'executed_by', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who executed this DSR request'
      }, { transaction });

      await queryInterface.addColumn('dsr_requests', 'executed_at', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when DSR actions were executed'
      }, { transaction });

      await queryInterface.addColumn('dsr_requests', 'execution_details', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Details of execution actions taken'
      }, { transaction });

      // Add Notification tracking
      await queryInterface.addColumn('dsr_requests', 'notification_sent_at', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when notification was sent to data subject'
      }, { transaction });

      // Add Form tracking
      await queryInterface.addColumn('dsr_requests', 'affected_forms', {
        type: Sequelize.ARRAY(Sequelize.TEXT),
        allowNull: true,
        defaultValue: [],
        comment: 'Array of form IDs affected by this DSR'
      }, { transaction });

      // Add Legal assessment
      await queryInterface.addColumn('dsr_requests', 'legal_basis_assessment', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Data controller legal basis assessment under PDPA'
      }, { transaction });

      // Add Completion date
      await queryInterface.addColumn('dsr_requests', 'completed_at', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when DSR was fully completed'
      }, { transaction });

      // Add Index for DSR number lookups
      await queryInterface.addIndex('dsr_requests', ['dsr_number'], {
        name: 'dsr_requests_dsr_number_idx',
        transaction
      });

      // Add Index for workflow status tracking
      await queryInterface.addIndex('dsr_requests', ['status', 'created_at'], {
        name: 'dsr_requests_status_created_idx',
        transaction
      });

      // Add Index for profile DSR lookups
      await queryInterface.addIndex('dsr_requests', ['profile_id', 'status'], {
        name: 'dsr_requests_profile_status_idx',
        transaction
      });

      await transaction.commit();
      console.log('✅ Enhanced dsr_requests table with workflow fields');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error enhancing dsr_requests:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Remove indexes
      await queryInterface.removeIndex('dsr_requests', 'dsr_requests_profile_status_idx', { transaction });
      await queryInterface.removeIndex('dsr_requests', 'dsr_requests_status_created_idx', { transaction });
      await queryInterface.removeIndex('dsr_requests', 'dsr_requests_dsr_number_idx', { transaction });

      // Remove columns (in reverse order)
      await queryInterface.removeColumn('dsr_requests', 'completed_at', { transaction });
      await queryInterface.removeColumn('dsr_requests', 'legal_basis_assessment', { transaction });
      await queryInterface.removeColumn('dsr_requests', 'affected_forms', { transaction });
      await queryInterface.removeColumn('dsr_requests', 'notification_sent_at', { transaction });
      await queryInterface.removeColumn('dsr_requests', 'execution_details', { transaction });
      await queryInterface.removeColumn('dsr_requests', 'executed_at', { transaction });
      await queryInterface.removeColumn('dsr_requests', 'executed_by', { transaction });
      await queryInterface.removeColumn('dsr_requests', 'rejection_reason', { transaction });
      await queryInterface.removeColumn('dsr_requests', 'rejected_at', { transaction });
      await queryInterface.removeColumn('dsr_requests', 'rejected_by', { transaction });
      await queryInterface.removeColumn('dsr_requests', 'approval_notes', { transaction });
      await queryInterface.removeColumn('dsr_requests', 'approved_at', { transaction });
      await queryInterface.removeColumn('dsr_requests', 'approved_by', { transaction });
      await queryInterface.removeColumn('dsr_requests', 'review_notes', { transaction });
      await queryInterface.removeColumn('dsr_requests', 'reviewed_at', { transaction });
      await queryInterface.removeColumn('dsr_requests', 'reviewed_by', { transaction });
      await queryInterface.removeColumn('dsr_requests', 'dsr_number', { transaction });

      await transaction.commit();
      console.log('✅ Reverted dsr_requests enhancements');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error reverting dsr_requests:', error);
      throw error;
    }
  }
};
