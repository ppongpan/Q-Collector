/**
 * Migration: Add version column to forms table
 * Fix: Model expects version column but database doesn't have it
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('forms', 'version', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Form version number for tracking changes',
    });

    // Add index for performance
    await queryInterface.addIndex('forms', ['version'], {
      name: 'idx_forms_version',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('forms', 'idx_forms_version');
    await queryInterface.removeColumn('forms', 'version');
  },
};
