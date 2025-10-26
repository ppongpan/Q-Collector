/**
 * Migration: Create DSR Requests Table
 * Purpose: Track Data Subject Rights requests (access, rectification, erasure, portability)
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('dsr_requests', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      request_type: {
        type: Sequelize.ENUM(
          'access',
          'rectification',
          'erasure',
          'portability',
          'restriction',
          'objection'
        ),
        allowNull: false,
        comment: 'Type of data subject right being exercised',
      },
      user_identifier: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Email, phone, or other identifier provided by requestor',
      },
      verification_method: {
        type: Sequelize.ENUM(
          'email_verification',
          'phone_verification',
          'id_card_verification',
          'manual_verification',
          'not_verified'
        ),
        allowNull: false,
        defaultValue: 'not_verified',
        comment: 'Method used to verify requestor identity',
      },
      verified_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When identity was verified',
      },
      request_details: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
        comment: 'Detailed request information (specific data requested, reason, etc.)',
      },
      status: {
        type: Sequelize.ENUM(
          'pending',
          'in_progress',
          'completed',
          'rejected',
          'cancelled'
        ),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Current status of the request',
      },
      status_history: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
        comment: 'Array of status changes with timestamps',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'When request was submitted',
      },
      processed_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'SET NULL',
        comment: 'Admin user who processed the request',
      },
      processed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When request was completed',
      },
      response_data: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: null,
        comment: 'Response data (e.g., exported data for access requests)',
      },
      response_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Internal notes about how request was handled',
      },
      ip_address: {
        type: Sequelize.INET,
        allowNull: true,
        comment: 'IP address of requestor',
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Browser user agent of requestor',
      },
      deadline_date: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Deadline for completing request (typically 30 days from creation)',
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes for efficient querying
    await queryInterface.addIndex('dsr_requests', ['user_identifier']);
    await queryInterface.addIndex('dsr_requests', ['status']);
    await queryInterface.addIndex('dsr_requests', ['request_type']);
    await queryInterface.addIndex('dsr_requests', ['created_at']);
    await queryInterface.addIndex('dsr_requests', ['processed_by']);
    await queryInterface.addIndex('dsr_requests', ['deadline_date']);
    await queryInterface.addIndex('dsr_requests', ['verification_method']);

    // Composite index for finding pending requests by user
    await queryInterface.addIndex('dsr_requests', ['user_identifier', 'status'], {
      name: 'dsr_requests_user_status_idx',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('dsr_requests');
  },
};
