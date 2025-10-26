'use strict';

/**
 * Migration: Create user_consents table
 *
 * Purpose: Store user consent records linked to form submissions
 * for PDPA compliance with digital signature verification
 *
 * Features:
 * - Links consents to submissions (CASCADE DELETE)
 * - Stores digital signature (base64)
 * - Records identity verification (full name)
 * - Captures metadata for legal proof (IP, user-agent, timestamp)
 * - Tracks privacy notice acceptance and version
 *
 * @version v0.8.2-dev
 * @date 2025-10-23
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_consents', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
        comment: 'Primary key (UUID)'
      },

      // Foreign Keys
      submission_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'submissions',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Link to submission - CASCADE DELETE ensures cleanup'
      },
      form_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'forms',
          key: 'id'
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Link to form'
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        comment: 'Link to user (nullable for anonymous submissions)'
      },
      consent_item_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'consent_items',
          key: 'id'
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Link to consent item definition'
      },

      // Consent Data
      consent_given: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether consent was given (true) or denied (false)'
      },

      // Identity Verification
      signature_data: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Base64 encoded signature image (PNG format)'
      },
      full_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Full name for identity verification'
      },

      // Metadata for Legal Proof
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'IP address of user when consent given (IPv4 or IPv6)'
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Browser user agent string'
      },
      consented_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'Timestamp when consent was given'
      },

      // Privacy Notice Tracking
      privacy_notice_accepted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether privacy notice was accepted'
      },
      privacy_notice_version: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Version of privacy notice accepted (e.g., "1.0", "2.1")'
      },

      // Timestamps
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'Record creation timestamp'
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'Record last update timestamp'
      }
    }, {
      comment: 'Stores user consent records with digital signatures for PDPA compliance'
    });

    // Create indexes for performance
    await queryInterface.addIndex('user_consents', ['submission_id'], {
      name: 'idx_user_consents_submission',
      comment: 'Index for querying consents by submission'
    });

    await queryInterface.addIndex('user_consents', ['user_id'], {
      name: 'idx_user_consents_user',
      comment: 'Index for querying consents by user'
    });

    await queryInterface.addIndex('user_consents', ['form_id'], {
      name: 'idx_user_consents_form',
      comment: 'Index for querying consents by form'
    });

    await queryInterface.addIndex('user_consents', ['consent_item_id'], {
      name: 'idx_user_consents_consent_item',
      comment: 'Index for querying specific consent items'
    });

    await queryInterface.addIndex('user_consents', ['consented_at'], {
      name: 'idx_user_consents_consented_at',
      comment: 'Index for date-based queries and audit trails'
    });

    // Composite index for common query pattern
    await queryInterface.addIndex('user_consents', ['submission_id', 'consent_item_id'], {
      name: 'idx_user_consents_submission_item',
      unique: true,
      comment: 'Unique constraint: one consent record per submission per consent item'
    });

    console.log('✅ Created user_consents table with indexes');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes first
    await queryInterface.removeIndex('user_consents', 'idx_user_consents_submission');
    await queryInterface.removeIndex('user_consents', 'idx_user_consents_user');
    await queryInterface.removeIndex('user_consents', 'idx_user_consents_form');
    await queryInterface.removeIndex('user_consents', 'idx_user_consents_consent_item');
    await queryInterface.removeIndex('user_consents', 'idx_user_consents_consented_at');
    await queryInterface.removeIndex('user_consents', 'idx_user_consents_submission_item');

    // Drop table
    await queryInterface.dropTable('user_consents');

    console.log('✅ Dropped user_consents table and indexes');
  }
};
