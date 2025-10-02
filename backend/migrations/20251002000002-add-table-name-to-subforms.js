'use strict';

/**
 * Migration: Add table_name column to sub_forms table
 * For Dynamic Tables system - stores PostgreSQL table name for each sub-form
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('sub_forms', 'table_name', {
      type: Sequelize.STRING(63), // PostgreSQL identifier max length
      allowNull: true,
      comment: 'PostgreSQL table name for this sub-form'
    });

    // Add index for faster lookups
    await queryInterface.addIndex('sub_forms', ['table_name'], {
      name: 'idx_sub_forms_table_name'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove index first
    await queryInterface.removeIndex('sub_forms', 'idx_sub_forms_table_name');

    // Remove column
    await queryInterface.removeColumn('sub_forms', 'table_name');
  }
};
