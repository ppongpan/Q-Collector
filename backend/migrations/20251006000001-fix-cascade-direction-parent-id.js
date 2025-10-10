'use strict';

/**
 * Migration: Fix CASCADE direction for parent_id
 *
 * PROBLEM: onDelete: 'CASCADE' on parent_id causes deleting child to delete parent
 * FIX: Change to onDelete: 'SET NULL' so deleting child doesn't affect parent
 *
 * Correct behavior:
 * - Delete parent → Delete children (CASCADE on hasMany) ✅
 * - Delete child → Set parent_id to NULL (SET NULL on belongsTo) ✅
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('🔧 Fixing CASCADE direction for submissions.parent_id...');

      // Drop existing foreign key constraint
      await queryInterface.sequelize.query(
        `ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_parent_id_fkey;`,
        { transaction }
      );

      console.log('✅ Dropped old foreign key constraint');

      // Add new foreign key with correct CASCADE direction
      await queryInterface.sequelize.query(
        `ALTER TABLE submissions
         ADD CONSTRAINT submissions_parent_id_fkey
         FOREIGN KEY (parent_id)
         REFERENCES submissions(id)
         ON DELETE SET NULL;`,
        { transaction }
      );

      console.log('✅ Added new foreign key with SET NULL on delete');
      console.log('📝 Correct behavior:');
      console.log('   - Delete parent → Deletes children (CASCADE)');
      console.log('   - Delete child → Sets parent_id to NULL (not deleting parent)');

      await transaction.commit();
      console.log('✅ Migration completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('🔙 Reverting CASCADE direction fix...');

      // Drop new constraint
      await queryInterface.sequelize.query(
        `ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_parent_id_fkey;`,
        { transaction }
      );

      // Restore old constraint (CASCADE)
      await queryInterface.sequelize.query(
        `ALTER TABLE submissions
         ADD CONSTRAINT submissions_parent_id_fkey
         FOREIGN KEY (parent_id)
         REFERENCES submissions(id)
         ON DELETE CASCADE;`,
        { transaction }
      );

      await transaction.commit();
      console.log('✅ Rollback completed');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};
