/**
 * Add table_name column to forms table
 * This stores the dynamically created table name for each form
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('forms', 'table_name', {
      type: Sequelize.STRING(63),
      allowNull: true,
      comment: 'Dynamic table name for form submissions'
    });

    // Add index for faster lookups
    await queryInterface.addIndex('forms', ['table_name'], {
      name: 'idx_forms_table_name'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('forms', 'idx_forms_table_name');
    await queryInterface.removeColumn('forms', 'table_name');
  }
};
