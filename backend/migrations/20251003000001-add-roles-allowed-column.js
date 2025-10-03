/**
 * Migration: Add roles_allowed column and migrate data from visible_roles
 * Fix: Database schema mismatch - Model expects roles_allowed (JSONB) but table has visible_roles (TEXT[])
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    // Step 1: Add roles_allowed column (JSONB type)
    await queryInterface.addColumn('forms', 'roles_allowed', {
      type: DataTypes.JSONB,
      allowNull: true, // Allow NULL temporarily for migration
      comment: 'Array of roles that can access this form (JSONB format)',
    });

    // Step 2: Migrate data from visible_roles to roles_allowed
    await queryInterface.sequelize.query(`
      UPDATE forms
      SET roles_allowed =
        CASE
          WHEN visible_roles IS NOT NULL THEN
            to_jsonb(visible_roles)
          ELSE
            '["user"]'::jsonb
        END
      WHERE roles_allowed IS NULL;
    `);

    // Step 3: Set NOT NULL constraint on roles_allowed
    await queryInterface.changeColumn('forms', 'roles_allowed', {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: '["user"]',
      comment: 'Array of roles that can access this form (JSONB format)',
    });

    // Step 4: Drop old visible_roles column
    await queryInterface.removeColumn('forms', 'visible_roles');

    // Step 5: Add index for performance
    await queryInterface.addIndex('forms', {
      fields: ['roles_allowed'],
      using: 'GIN', // GIN index for JSONB contains queries
      name: 'idx_forms_roles_allowed',
    });
  },

  async down(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    // Remove index
    await queryInterface.removeIndex('forms', 'idx_forms_roles_allowed');

    // Re-add visible_roles column
    await queryInterface.addColumn('forms', 'visible_roles', {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      defaultValue: '{general_user}',
    });

    // Migrate data back from roles_allowed to visible_roles
    await queryInterface.sequelize.query(`
      UPDATE forms
      SET visible_roles =
        CASE
          WHEN roles_allowed IS NOT NULL THEN
            ARRAY(SELECT jsonb_array_elements_text(roles_allowed))
          ELSE
            ARRAY['general_user'::text]
        END
      WHERE visible_roles IS NULL;
    `);

    // Remove roles_allowed column
    await queryInterface.removeColumn('forms', 'roles_allowed');
  },
};
