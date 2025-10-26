/**
 * Migration: Add soft delete fields to user_consents table
 *
 * Adds deleted_at and deletion_reason columns to support PDPA data retention
 * soft delete functionality.
 *
 * @date 2025-10-24
 * @version v0.8.2-dev
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('user_consents', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp when consent was soft-deleted due to retention period expiry',
    });

    await queryInterface.addColumn('user_consents', 'deletion_reason', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Reason for soft deletion (e.g., "PDPA retention period expired")',
    });

    // Add index for querying non-deleted consents
    await queryInterface.addIndex('user_consents', ['deleted_at'], {
      name: 'user_consents_deleted_at_idx',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('user_consents', 'user_consents_deleted_at_idx');
    await queryInterface.removeColumn('user_consents', 'deletion_reason');
    await queryInterface.removeColumn('user_consents', 'deleted_at');
  },
};
