'use strict';

/**
 * Migration: Add profile_id to dsr_requests table
 *
 * Purpose: Link DSR requests to UnifiedUserProfile for better tracking
 * Date: 2025-10-24
 * Version: v0.8.3-dev
 *
 * Changes:
 * - Add profile_id column (UUID, nullable, foreign key to unified_user_profiles)
 * - Add index for faster queries
 *
 * Why nullable: Backward compatibility with existing DSR records
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Adding profile_id column to dsr_requests table...');

    // Add profile_id column
    await queryInterface.addColumn('dsr_requests', 'profile_id', {
      type: Sequelize.UUID,
      allowNull: true, // Allow null for backward compatibility with existing records
      references: {
        model: 'unified_user_profiles',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    console.log('✅ Added profile_id column');

    // Add index for faster queries
    await queryInterface.addIndex('dsr_requests', ['profile_id'], {
      name: 'dsr_requests_profile_id_idx'
    });

    console.log('✅ Added index on profile_id');
    console.log('✅ Migration completed successfully');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Rolling back profile_id column from dsr_requests table...');

    // Remove index first
    await queryInterface.removeIndex('dsr_requests', 'dsr_requests_profile_id_idx');
    console.log('✅ Removed index');

    // Remove column
    await queryInterface.removeColumn('dsr_requests', 'profile_id');
    console.log('✅ Removed profile_id column');
    console.log('✅ Rollback completed successfully');
  }
};
