/**
 * ConsentHistory Model
 * Tracks all consent changes over time for PDPA Section 15 & 39 compliance
 *
 * Purpose: Maintain complete audit trail of consent given/withdrawn/edited
 * Retention: Permanent (required for legal compliance)
 *
 * @version v0.8.2-dev
 * @date 2025-10-24
 */

module.exports = (sequelize, DataTypes) => {
  const ConsentHistory = sequelize.define('ConsentHistory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    user_consent_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'user_consents',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      comment: 'Reference to the consent record'
    },
    profile_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'unified_user_profiles',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      comment: 'Unified profile for the data subject'
    },
    consent_item_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'consent_items',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      comment: 'Which consent item this relates to'
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['given', 'withdrawn', 'edited', 'renewed', 'expired']]
      },
      comment: 'Type of consent action'
    },
    old_status: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Previous consent status (true/false)'
    },
    new_status: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'New consent status (true/false)'
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Reason for withdrawal or change'
    },
    legal_basis: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Legal basis for processing (PDPA Section 24-26)'
    },
    changed_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      comment: 'Admin user who made the change (if applicable)'
    },
    changed_by_role: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Role of the user who made the change'
    },
    signature_data_url: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Digital signature as data URL (for explicit consent)'
    },
    ip_address: {
      type: DataTypes.INET,
      allowNull: true,
      comment: 'IP address of the consent action'
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Browser/device information'
    },
    // v0.8.7-dev: DSR Request linkage for audit trail
    dsr_request_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'dsr_requests',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      comment: 'DSR request that authorized this consent change'
    },
    dsr_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'DSR number reference (e.g., DSR-20251025-0001)'
    },
    requires_dsr: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this change required an approved DSR'
    },
    change_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        isIn: [['initial_consent', 'withdrawal', 'renewal', 'rectification']]
      },
      comment: 'Type of change: initial_consent, withdrawal, renewal, rectification'
    },
  }, {
    tableName: 'consent_history',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false, // No updates allowed (audit trail)
    indexes: [
      { fields: ['user_consent_id'] },
      { fields: ['profile_id'] },
      { fields: ['consent_item_id'] },
      { fields: ['action'] },
      { fields: ['created_at'] },
      { fields: ['profile_id', 'created_at'] },
    ],
  });

  /**
   * Model Associations
   */
  ConsentHistory.associate = (models) => {
    // Belongs to UserConsent
    ConsentHistory.belongsTo(models.UserConsent, {
      foreignKey: 'user_consent_id',
      as: 'userConsent',
      onDelete: 'CASCADE',
    });

    // Belongs to UnifiedUserProfile
    ConsentHistory.belongsTo(models.UnifiedUserProfile, {
      foreignKey: 'profile_id',
      as: 'profile',
      onDelete: 'SET NULL',
    });

    // Belongs to ConsentItem
    ConsentHistory.belongsTo(models.ConsentItem, {
      foreignKey: 'consent_item_id',
      as: 'consentItem',
      onDelete: 'SET NULL',
    });

    // Belongs to User (admin who made the change)
    ConsentHistory.belongsTo(models.User, {
      foreignKey: 'changed_by_user_id',
      as: 'changedBy',
      onDelete: 'SET NULL',
    });

    // v0.8.7-dev: Belongs to DSRRequest (if change was authorized by DSR)
    ConsentHistory.belongsTo(models.DSRRequest, {
      foreignKey: 'dsr_request_id',
      as: 'dsrRequest',
      onDelete: 'SET NULL',
    });
  };

  /**
   * Instance Methods
   */

  /**
   * Get formatted consent history entry for display
   * @returns {Object}
   */
  ConsentHistory.prototype.getFormattedHistory = function() {
    return {
      id: this.id,
      action: this.action,
      oldStatus: this.old_status,
      newStatus: this.new_status,
      reason: this.reason,
      changedBy: this.changedBy ? {
        id: this.changedBy.id,
        username: this.changedBy.username,
        role: this.changed_by_role
      } : null,
      timestamp: this.created_at,
      hasSignature: !!this.signature_data_url
    };
  };

  return ConsentHistory;
};
