'use strict';

/**
 * Migration: Add DSR Reference to Consent History
 *
 * Links consent history changes to DSR requests for audit trail:
 * - DSR request ID reference
 * - DSR number for easy lookup
 * - Validation requirement flag
 *
 * This enables tracking which DSR approval allowed a consent change.
 *
 * @version v0.8.7-dev
 * @date 2025-10-25
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Add DSR Request reference
      await queryInterface.addColumn('consent_history', 'dsr_request_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'dsr_requests',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'DSR request that authorized this consent change'
      }, { transaction });

      // Add DSR Number for easy reference
      await queryInterface.addColumn('consent_history', 'dsr_number', {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'DSR number reference (e.g., DSR-20251025-0001)'
      }, { transaction });

      // Add validation requirement flag
      await queryInterface.addColumn('consent_history', 'requires_dsr', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this change required an approved DSR'
      }, { transaction });

      // Add change type for better categorization
      await queryInterface.addColumn('consent_history', 'change_type', {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Type of change: initial_consent, withdrawal, renewal, rectification'
      }, { transaction });

      // Add Index for DSR lookups in consent history
      await queryInterface.addIndex('consent_history', ['dsr_request_id'], {
        name: 'consent_history_dsr_request_idx',
        transaction
      });

      // Add Index for DSR number lookups
      await queryInterface.addIndex('consent_history', ['dsr_number'], {
        name: 'consent_history_dsr_number_idx',
        transaction
      });

      // Add Index for user consent history timeline
      await queryInterface.addIndex('consent_history', ['user_consent_id', 'created_at'], {
        name: 'consent_history_user_consent_timeline_idx',
        transaction
      });

      // Add Index for change type filtering
      await queryInterface.addIndex('consent_history', ['change_type', 'created_at'], {
        name: 'consent_history_change_type_idx',
        transaction
      });

      await transaction.commit();
      console.log('✅ Added DSR reference fields to consent_history table');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error adding DSR reference to consent_history:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Remove indexes
      await queryInterface.removeIndex('consent_history', 'consent_history_change_type_idx', { transaction });
      await queryInterface.removeIndex('consent_history', 'consent_history_user_consent_timeline_idx', { transaction });
      await queryInterface.removeIndex('consent_history', 'consent_history_dsr_number_idx', { transaction });
      await queryInterface.removeIndex('consent_history', 'consent_history_dsr_request_idx', { transaction });

      // Remove columns (in reverse order)
      await queryInterface.removeColumn('consent_history', 'change_type', { transaction });
      await queryInterface.removeColumn('consent_history', 'requires_dsr', { transaction });
      await queryInterface.removeColumn('consent_history', 'dsr_number', { transaction });
      await queryInterface.removeColumn('consent_history', 'dsr_request_id', { transaction });

      await transaction.commit();
      console.log('✅ Reverted DSR reference from consent_history');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error reverting consent_history:', error);
      throw error;
    }
  }
};
