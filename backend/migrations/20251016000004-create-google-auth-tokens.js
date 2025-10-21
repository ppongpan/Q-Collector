/**
 * Migration: Create Google Auth Tokens Table
 *
 * Stores encrypted OAuth2 tokens for Google Sheets API access.
 * Part of Google Sheets Import System v0.8.0
 *
 * Security Features:
 * - AES-256 encryption for access_token and refresh_token
 * - One token per user (UNIQUE constraint on user_id)
 * - Token expiry tracking
 * - Google account identification (email, google_id)
 *
 * IMPORTANT: Tokens are encrypted using backend/utils/encryption.util.js
 * before storage and decrypted on retrieval.
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('google_auth_tokens', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'User who authorized Google Sheets access (one token per user)',
      },
      access_token: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Encrypted Google OAuth2 access token (AES-256)',
      },
      refresh_token: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Encrypted Google OAuth2 refresh token (AES-256)',
      },
      token_expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'When the access token expires (typically 1 hour from issue)',
      },
      google_email: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Google account email address',
      },
      google_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Google account ID (sub claim from ID token)',
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

    // Add index on user_id (already UNIQUE, but helps with lookups)
    await queryInterface.addIndex('google_auth_tokens', ['user_id'], {
      name: 'idx_google_auth_tokens_user',
      unique: true,
    });

    // Add index on token expiry for cleanup jobs
    await queryInterface.addIndex('google_auth_tokens', ['token_expires_at'], {
      name: 'idx_google_auth_tokens_expiry',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('google_auth_tokens');
  },
};
