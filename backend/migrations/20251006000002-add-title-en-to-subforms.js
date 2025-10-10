/**
 * Migration: Add title_en column to sub_forms table
 *
 * Adds English title column to store translated sub-form names
 *
 * @version 0.7.3-dev
 * @date 2025-10-06
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('sub_forms', 'title_en', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'English translation of sub-form title',
      after: 'title'
    });

    console.log('✅ Added title_en column to sub_forms table');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('sub_forms', 'title_en');
    console.log('✅ Removed title_en column from sub_forms table');
  }
};
