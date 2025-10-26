/**
 * Migration: Create Unified User Profiles Table
 * Purpose: Match and group submissions by same user across forms
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('unified_user_profiles', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      primary_email: {
        type: Sequelize.STRING(255),
        allowNull: true,
        unique: true,
        comment: 'Primary email address for this user profile',
      },
      primary_phone: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Primary phone number for this user profile',
      },
      full_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'User full name',
      },
      linked_emails: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
        comment: 'Array of all email addresses linked to this profile',
      },
      linked_phones: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
        comment: 'Array of all phone numbers linked to this profile',
      },
      linked_names: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
        comment: 'Array of all name variations linked to this profile',
      },
      submission_ids: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
        comment: 'Array of submission IDs linked to this profile',
      },
      form_ids: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
        comment: 'Array of form IDs this user has submitted',
      },
      total_submissions: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total number of submissions from this user',
      },
      first_submission_date: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date of first submission',
      },
      last_submission_date: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date of most recent submission',
      },
      match_confidence: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 100.00,
        comment: 'Confidence score for profile matching (0-100)',
      },
      merged_from_ids: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
        comment: 'Array of profile IDs that were merged into this one',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes for efficient querying
    await queryInterface.addIndex('unified_user_profiles', ['primary_email']);
    await queryInterface.addIndex('unified_user_profiles', ['primary_phone']);
    await queryInterface.addIndex('unified_user_profiles', ['full_name']);
    await queryInterface.addIndex('unified_user_profiles', ['total_submissions']);
    await queryInterface.addIndex('unified_user_profiles', ['first_submission_date']);
    await queryInterface.addIndex('unified_user_profiles', ['last_submission_date']);

    // GIN index for JSONB array searching
    await queryInterface.sequelize.query(`
      CREATE INDEX unified_user_profiles_linked_emails_idx
      ON unified_user_profiles USING GIN (linked_emails);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX unified_user_profiles_linked_phones_idx
      ON unified_user_profiles USING GIN (linked_phones);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX unified_user_profiles_submission_ids_idx
      ON unified_user_profiles USING GIN (submission_ids);
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('unified_user_profiles');
  },
};
