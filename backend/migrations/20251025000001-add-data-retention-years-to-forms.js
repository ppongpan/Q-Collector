/**
 * Migration: Add data_retention_years to forms table
 * For PDPA compliance - single retention period per form
 *
 * @version v0.8.5-dev
 * @date 2025-10-25
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add data_retention_years column to forms table
    await queryInterface.addColumn('forms', 'data_retention_years', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 2,
      comment: 'Data retention period in years (1-20) for PDPA compliance'
    });

    // Add check constraint for valid range (1-20 years)
    await queryInterface.sequelize.query(`
      ALTER TABLE forms
      ADD CONSTRAINT forms_data_retention_years_check
      CHECK (data_retention_years >= 1 AND data_retention_years <= 20)
    `);

    // Add index for faster queries when filtering by retention period
    await queryInterface.addIndex('forms', ['data_retention_years'], {
      name: 'forms_data_retention_years_idx'
    });

    console.log('✅ Added data_retention_years column to forms table');
    console.log('   - Default: 2 years');
    console.log('   - Range: 1-20 years');
    console.log('   - Check constraint added');
    console.log('   - Index created');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove index first
    await queryInterface.removeIndex('forms', 'forms_data_retention_years_idx');

    // Remove check constraint
    await queryInterface.sequelize.query(`
      ALTER TABLE forms
      DROP CONSTRAINT IF EXISTS forms_data_retention_years_check
    `);

    // Remove column
    await queryInterface.removeColumn('forms', 'data_retention_years');

    console.log('✅ Removed data_retention_years column from forms table');
  }
};
