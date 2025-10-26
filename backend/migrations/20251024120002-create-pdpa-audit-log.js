/**
 * Migration: Create PDPA Audit Log Table
 * Purpose: Comprehensive audit trail for all PDPA compliance events
 *
 * PDPA Thailand Requirements:
 * - Section 39: Controllers must maintain audit logs
 * - Section 41: Logs must be retained for 3+ years
 * - Section 77: Evidence for PDPC investigations
 *
 * Log Categories:
 * - dsr_request: Data Subject Rights requests
 * - consent_change: Consent given/withdrawn/modified
 * - data_access: Profile/submission views
 * - data_export: Data portability exports
 * - data_deletion: Data erasure operations
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pdpa_audit_log', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      event_category: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Category: dsr_request, consent_change, data_access, data_export, data_deletion'
      },
      event_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Specific event: dsr_created, consent_withdrawn, profile_viewed, etc.'
      },
      event_severity: {
        type: Sequelize.ENUM('info', 'warning', 'critical'),
        allowNull: false,
        defaultValue: 'info',
        comment: 'Severity level for alerting and compliance reporting'
      },
      profile_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'unified_user_profiles',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Data subject profile affected'
      },
      dsr_request_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'dsr_requests',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Related DSR request'
      },
      consent_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'user_consents',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Related consent record'
      },
      form_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'forms',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Related form'
      },
      submission_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'submissions',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Related submission'
      },
      performed_by_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who performed the action'
      },
      performed_by_username: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Username (cached for historical records)'
      },
      performed_by_email: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Email (cached for historical records)'
      },
      performed_by_role: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'User role at time of event'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Human-readable description of the event'
      },
      details_json: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Additional structured details about the event'
      },
      old_value_json: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Previous value (for change tracking)'
      },
      new_value_json: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'New value (for change tracking)'
      },
      ip_address: {
        type: Sequelize.INET,
        allowNull: true,
        comment: 'IP address of the request'
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Browser/device information'
      },
      request_path: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'API endpoint path'
      },
      request_method: {
        type: Sequelize.STRING(10),
        allowNull: true,
        comment: 'HTTP method: GET, POST, PUT, DELETE'
      },
      http_status_code: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'HTTP response status code'
      },
      requires_notification: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this event requires PDPC notification (Section 37)'
      },
      pdpa_article: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Relevant PDPA Thailand section (e.g., "Section 30", "Section 37")'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'When this event occurred'
      }
    });

    // Add comprehensive indexes for efficient queries
    await queryInterface.addIndex('pdpa_audit_log', ['event_category'], {
      name: 'idx_pdpa_audit_event_category'
    });
    await queryInterface.addIndex('pdpa_audit_log', ['event_type'], {
      name: 'idx_pdpa_audit_event_type'
    });
    await queryInterface.addIndex('pdpa_audit_log', ['event_severity'], {
      name: 'idx_pdpa_audit_event_severity'
    });
    await queryInterface.addIndex('pdpa_audit_log', ['profile_id'], {
      name: 'idx_pdpa_audit_profile_id'
    });
    await queryInterface.addIndex('pdpa_audit_log', ['dsr_request_id'], {
      name: 'idx_pdpa_audit_dsr_request_id'
    });
    await queryInterface.addIndex('pdpa_audit_log', ['consent_id'], {
      name: 'idx_pdpa_audit_consent_id'
    });
    await queryInterface.addIndex('pdpa_audit_log', ['performed_by_user_id'], {
      name: 'idx_pdpa_audit_performed_by'
    });
    await queryInterface.addIndex('pdpa_audit_log', ['created_at'], {
      name: 'idx_pdpa_audit_created_at'
    });
    await queryInterface.addIndex('pdpa_audit_log', ['requires_notification'], {
      name: 'idx_pdpa_audit_requires_notification'
    });
    await queryInterface.addIndex('pdpa_audit_log', ['event_category', 'created_at'], {
      name: 'idx_pdpa_audit_category_created'
    });
    await queryInterface.addIndex('pdpa_audit_log', ['profile_id', 'created_at'], {
      name: 'idx_pdpa_audit_profile_created'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('pdpa_audit_log');
  },
};
