'use strict';

/**
 * UserPreference Model
 * Stores user-specific preferences for form lists, dashboard, and other contexts
 * Version: v0.8.0-dev
 * Date: 2025-10-21
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserPreference extends Model {
    /**
     * Define associations
     * @param {Object} models - All Sequelize models
     */
    static associate(models) {
      // Association with User model
      this.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
    }

    /**
     * Convert model instance to JSON for API responses
     * Removes internal/sensitive fields
     * @returns {Object} Clean JSON representation
     */
    toJSON() {
      return {
        id: this.id,
        userId: this.userId,
        contextType: this.contextType,
        contextId: this.contextId,
        preferences: this.preferences,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
      };
    }

    /**
     * Get formatted preference value
     * Helper method to safely get preference values with defaults
     * @param {string} key - Preference key
     * @param {*} defaultValue - Default value if key not found
     * @returns {*} Preference value or default
     */
    getPreference(key, defaultValue = null) {
      return this.preferences && this.preferences[key] !== undefined
        ? this.preferences[key]
        : defaultValue;
    }

    /**
     * Set preference value
     * Helper method to update a single preference
     * @param {string} key - Preference key
     * @param {*} value - Preference value
     */
    setPreference(key, value) {
      if (!this.preferences) {
        this.preferences = {};
      }
      this.preferences[key] = value;
      this.changed('preferences', true); // Mark as changed for Sequelize
    }
  }

  // Initialize model with schema definition
  UserPreference.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Primary key (UUID)'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      comment: 'User ID who owns these preferences'
    },
    contextType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'context_type',
      comment: 'Type of preference context (form_list, global, dashboard, etc.)',
      validate: {
        isIn: {
          args: [['form_list', 'global', 'dashboard', 'form_builder']],
          msg: 'Context type must be one of: form_list, global, dashboard, form_builder'
        }
      }
    },
    contextId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'context_id',
      comment: 'Context identifier (formId for form_list, null for global)'
    },
    preferences: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      comment: 'User preference settings as JSONB',
      validate: {
        isValidJSON(value) {
          if (typeof value !== 'object' || Array.isArray(value)) {
            throw new Error('Preferences must be a JSON object');
          }
        }
      }
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
      comment: 'Timestamp when preference was created'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
      comment: 'Timestamp when preference was last updated'
    }
  }, {
    sequelize,
    modelName: 'UserPreference',
    tableName: 'user_preferences',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'context_type', 'context_id'],
        name: 'unique_user_context_preference'
      },
      {
        fields: ['user_id', 'context_type'],
        name: 'idx_user_prefs_lookup'
      },
      {
        fields: ['context_id'],
        name: 'idx_prefs_context_id'
      }
    ],
    comment: 'User preferences for form lists, dashboard, and other contexts'
  });

  return UserPreference;
};
