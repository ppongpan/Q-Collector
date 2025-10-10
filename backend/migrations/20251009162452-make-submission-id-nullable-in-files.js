'use strict';

/**
 * Migration: Make submission_id nullable in files table
 *
 * This allows files to be uploaded before a submission is created,
 * then linked to the submission later when the form is submitted.
 */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('files', 'submission_id', {
      type: Sequelize.UUID,
      allowNull: true,  // Allow null for files uploaded before submission creation
      references: {
        model: 'submissions',
        key: 'id',
      },
      onDelete: 'CASCADE',
    });
  },

  async down (queryInterface, Sequelize) {
    // Revert: Make submission_id NOT NULL again
    await queryInterface.changeColumn('files', 'submission_id', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'submissions',
        key: 'id',
      },
      onDelete: 'CASCADE',
    });
  }
};
