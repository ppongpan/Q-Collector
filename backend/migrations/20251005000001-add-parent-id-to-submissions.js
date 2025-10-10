/**
 * Migration: Add parent_id to Submissions Table
 * Purpose: Link sub-form submissions to parent main form submissions
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add parent_id column to submissions table
    await queryInterface.addColumn('submissions', 'parent_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'submissions',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'Parent submission ID for sub-form submissions',
    });

    // Add index for parent_id for faster lookups
    await queryInterface.addIndex('submissions', ['parent_id'], {
      name: 'idx_submissions_parent_id',
    });

    console.log('✅ Added parent_id column to submissions table');
  },

  async down(queryInterface, Sequelize) {
    // Remove index first
    await queryInterface.removeIndex('submissions', 'idx_submissions_parent_id');

    // Remove parent_id column
    await queryInterface.removeColumn('submissions', 'parent_id');

    console.log('❌ Removed parent_id column from submissions table');
  },
};
