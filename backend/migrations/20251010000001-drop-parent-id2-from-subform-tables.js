'use strict';

/**
 * Migration: Drop parent_id2 Column from All Sub-Form Dynamic Tables
 *
 * Background:
 * - parent_id2 column was created but never used (all values are NULL)
 * - Only parent_id (FK) and main_form_subid (display/query) are needed
 *
 * This migration:
 * 1. Finds all sub-form dynamic tables (pattern: sub_form_* or *_subform_*)
 * 2. Drops parent_id2 column if it exists
 * 3. Logs all changes for audit trail
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('🔍 Finding all sub-form dynamic tables...');

      // Query to find all tables with parent_id2 column
      const [tables] = await queryInterface.sequelize.query(`
        SELECT DISTINCT table_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_name = 'parent_id2'
          AND (
            table_name LIKE 'sub_form_%'
            OR table_name LIKE '%_subform_%'
            OR table_name LIKE 'service_log_%'
          )
        ORDER BY table_name;
      `, { transaction });

      if (tables.length === 0) {
        console.log('✅ No tables found with parent_id2 column. Migration complete.');
        await transaction.commit();
        return;
      }

      console.log(`📊 Found ${tables.length} tables with parent_id2 column:`);
      tables.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.table_name}`);
      });

      // Drop parent_id2 from each table
      let successCount = 0;
      let errorCount = 0;

      for (const row of tables) {
        const tableName = row.table_name;
        try {
          console.log(`🗑️  Dropping parent_id2 from ${tableName}...`);

          await queryInterface.sequelize.query(
            `ALTER TABLE "${tableName}" DROP COLUMN IF EXISTS parent_id2;`,
            { transaction }
          );

          successCount++;
          console.log(`   ✅ Successfully dropped parent_id2 from ${tableName}`);
        } catch (error) {
          errorCount++;
          console.error(`   ❌ Failed to drop parent_id2 from ${tableName}:`, error.message);
          // Continue with other tables instead of throwing
        }
      }

      console.log('\n📊 Migration Summary:');
      console.log(`   ✅ Success: ${successCount} tables`);
      console.log(`   ❌ Errors: ${errorCount} tables`);
      console.log(`   📊 Total: ${tables.length} tables`);

      await transaction.commit();
      console.log('✅ Migration completed successfully!');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('⚠️  Reverting migration: Re-adding parent_id2 column...');

      // Find all sub-form tables (even those without parent_id2)
      const [tables] = await queryInterface.sequelize.query(`
        SELECT DISTINCT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND (
            table_name LIKE 'sub_form_%'
            OR table_name LIKE '%_subform_%'
            OR table_name LIKE 'service_log_%'
          )
        ORDER BY table_name;
      `, { transaction });

      console.log(`📊 Found ${tables.length} sub-form tables to restore parent_id2 column:`);

      let successCount = 0;
      let errorCount = 0;

      for (const row of tables) {
        const tableName = row.table_name;
        try {
          console.log(`🔄 Adding parent_id2 to ${tableName}...`);

          // Check if column already exists
          const [columns] = await queryInterface.sequelize.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = '${tableName}'
              AND column_name = 'parent_id2';
          `, { transaction });

          if (columns.length > 0) {
            console.log(`   ⏭️  parent_id2 already exists in ${tableName}, skipping`);
            continue;
          }

          await queryInterface.sequelize.query(
            `ALTER TABLE "${tableName}" ADD COLUMN parent_id2 UUID;`,
            { transaction }
          );

          successCount++;
          console.log(`   ✅ Successfully added parent_id2 to ${tableName}`);
        } catch (error) {
          errorCount++;
          console.error(`   ❌ Failed to add parent_id2 to ${tableName}:`, error.message);
        }
      }

      console.log('\n📊 Rollback Summary:');
      console.log(`   ✅ Success: ${successCount} tables`);
      console.log(`   ❌ Errors: ${errorCount} tables`);
      console.log(`   📊 Total: ${tables.length} tables`);

      await transaction.commit();
      console.log('✅ Rollback completed successfully!');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};
