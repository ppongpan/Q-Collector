'use strict';

/**
 * Migration: Add UNIQUE constraint to forms.title
 *
 * Purpose: Prevent duplicate form titles for clear formula references and PDPA profile clarity
 * Date: 2025-10-24
 * Version: v0.8.4-dev
 *
 * Prerequisites:
 * - Run cleanup script: node backend/scripts/fix-duplicate-form-titles.js
 * - Verify no duplicates: node backend/scripts/verify-unique-titles.js
 *
 * Changes:
 * - Add UNIQUE constraint on forms.title column
 * - Add index for improved query performance
 *
 * Rollback Safe: Yes (constraint can be dropped without data loss)
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Adding UNIQUE constraint to forms.title column...');

    try {
      // First, verify no duplicates exist
      const duplicates = await queryInterface.sequelize.query(`
        SELECT title, COUNT(*) as count
        FROM forms
        GROUP BY title
        HAVING COUNT(*) > 1
      `, { type: Sequelize.QueryTypes.SELECT });

      if (duplicates.length > 0) {
        console.error('❌ ERROR: Duplicate titles still exist in database:');
        duplicates.forEach(dup => {
          console.error(`   - "${dup.title}" → ${dup.count} forms`);
        });
        console.error('\n⚠️  Please run cleanup script first:');
        console.error('   → node backend/scripts/fix-duplicate-form-titles.js\n');
        throw new Error('Cannot add UNIQUE constraint: duplicate titles exist');
      }

      console.log('✅ Verified: No duplicate titles found');

      // Add UNIQUE constraint
      await queryInterface.addConstraint('forms', {
        fields: ['title'],
        type: 'unique',
        name: 'forms_title_unique'
      });

      console.log('✅ Added UNIQUE constraint: forms_title_unique');

      // Add index for query performance (if not already created by constraint)
      // PostgreSQL automatically creates an index for UNIQUE constraints,
      // but we'll ensure it exists explicitly
      const indexExists = await queryInterface.sequelize.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'forms'
        AND indexname = 'forms_title_idx'
      `, { type: Sequelize.QueryTypes.SELECT });

      if (indexExists.length === 0) {
        await queryInterface.addIndex('forms', ['title'], {
          name: 'forms_title_idx',
          unique: true
        });
        console.log('✅ Added index: forms_title_idx');
      } else {
        console.log('ℹ️  Index forms_title_idx already exists');
      }

      console.log('✅ Migration completed successfully');
      console.log('📝 Form titles are now enforced to be unique at database level');

    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Rolling back UNIQUE constraint from forms.title...');

    try {
      // Remove UNIQUE constraint
      await queryInterface.removeConstraint('forms', 'forms_title_unique');
      console.log('✅ Removed UNIQUE constraint: forms_title_unique');

      // Remove index if it exists
      const indexExists = await queryInterface.sequelize.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'forms'
        AND indexname = 'forms_title_idx'
      `, { type: Sequelize.QueryTypes.SELECT });

      if (indexExists.length > 0) {
        await queryInterface.removeIndex('forms', 'forms_title_idx');
        console.log('✅ Removed index: forms_title_idx');
      }

      console.log('✅ Rollback completed successfully');
      console.log('⚠️  Warning: Form titles can now be duplicated again');

    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }
};
