/**
 * Migration: Create Personal Data Fields Table
 * Purpose: Classify which form fields contain personal data for PDPA compliance
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('personal_data_fields', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      form_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'forms',
          key: 'id',
        },
        onDelete: 'CASCADE',
        comment: 'Form containing the field',
      },
      field_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'fields',
          key: 'id',
        },
        onDelete: 'CASCADE',
        comment: 'Field that contains personal data',
      },
      data_category: {
        type: Sequelize.ENUM(
          'email',
          'phone',
          'name',
          'id_card',
          'address',
          'date_of_birth',
          'financial',
          'health',
          'biometric',
          'location',
          'other'
        ),
        allowNull: false,
        comment: 'Category of personal data',
      },
      is_sensitive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this is sensitive personal data (PDPA special category)',
      },
      purpose: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Purpose of collecting this personal data',
      },
      legal_basis: {
        type: Sequelize.ENUM(
          'consent',
          'contract',
          'legal_obligation',
          'vital_interests',
          'public_task',
          'legitimate_interests'
        ),
        allowNull: false,
        defaultValue: 'consent',
        comment: 'Legal basis for processing (PDPA Article 6)',
      },
      retention_period: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'How long this data will be retained',
      },
      auto_detected: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this field was auto-detected as containing personal data',
      },
      detected_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When auto-detection occurred',
      },
      confirmed_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'SET NULL',
        comment: 'Admin who confirmed the classification',
      },
      confirmed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When classification was confirmed',
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
    await queryInterface.addIndex('personal_data_fields', ['form_id']);
    await queryInterface.addIndex('personal_data_fields', ['field_id']);
    await queryInterface.addIndex('personal_data_fields', ['data_category']);
    await queryInterface.addIndex('personal_data_fields', ['is_sensitive']);
    await queryInterface.addIndex('personal_data_fields', ['auto_detected']);

    // Unique constraint to prevent duplicate classifications
    await queryInterface.addIndex('personal_data_fields', ['form_id', 'field_id'], {
      unique: true,
      name: 'personal_data_fields_form_field_unique',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('personal_data_fields');
  },
};
