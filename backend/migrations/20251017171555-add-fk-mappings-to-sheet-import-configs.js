'use strict';

/**
 * Migration: Add foreign_key_mappings column to sheet_import_configs table
 * v0.8.0 - Google Sheets Sub-Form Import Fix
 * Date: 2025-10-17
 *
 * Purpose: Store foreign key relationships between sub-form and parent form fields
 *
 * Example data structure:
 * [
 *   {
 *     "subFormFieldName": "รหัสลูกค้า",
 *     "subFormFieldType": "number",
 *     "parentFieldId": "uuid-of-parent-field",
 *     "parentFieldName": "ID",
 *     "parentFieldType": "number"
 *   }
 * ]
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('sheet_import_configs', 'foreign_key_mappings', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Foreign key relationships between sub-form and parent form fields',
      defaultValue: []
    });

    console.log('✅ Added foreign_key_mappings column to sheet_import_configs table');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('sheet_import_configs', 'foreign_key_mappings');

    console.log('❌ Removed foreign_key_mappings column from sheet_import_configs table');
  }
};
