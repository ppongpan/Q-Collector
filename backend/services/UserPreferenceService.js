'use strict';

/**
 * UserPreferenceService
 * Manages user-specific preferences with database persistence
 * Version: v0.8.0-dev
 * Date: 2025-10-21
 */

const { UserPreference, Submission } = require('../models');
const { Op } = require('sequelize');

class UserPreferenceService {
  /**
   * Get preferences for a user in a specific context
   * @param {string} userId - User UUID
   * @param {string} contextType - Context type (form_list, global, dashboard, form_builder)
   * @param {string|null} contextId - Context identifier (formId for form_list, null for global)
   * @returns {Promise<Object|null>} Preference object or null if not found
   */
  async getPreferences(userId, contextType, contextId = null) {
    try {
      console.log(`📥 [UserPreferenceService] Getting preferences for user ${userId}, context: ${contextType}/${contextId}`);

      const preference = await UserPreference.findOne({
        where: {
          userId,
          contextType,
          contextId: contextId || null
        }
      });

      if (preference) {
        console.log(`✅ [UserPreferenceService] Found preferences:`, preference.preferences);
        return preference.preferences;
      }

      console.log(`ℹ️ [UserPreferenceService] No preferences found, returning null`);
      return null;
    } catch (error) {
      console.error('❌ [UserPreferenceService] Error getting preferences:', error);
      throw error;
    }
  }

  /**
   * Save or update preferences for a user in a specific context
   * @param {string} userId - User UUID
   * @param {string} contextType - Context type
   * @param {string|null} contextId - Context identifier
   * @param {Object} preferences - Preference settings object
   * @returns {Promise<Object>} Updated preference object
   */
  async savePreferences(userId, contextType, contextId = null, preferences) {
    try {
      console.log(`💾 [UserPreferenceService] Saving preferences for user ${userId}, context: ${contextType}/${contextId}`);

      // Validate preferences is an object
      if (typeof preferences !== 'object' || Array.isArray(preferences)) {
        throw new Error('Preferences must be a JSON object');
      }

      // Use upsert to create or update
      const [preference, created] = await UserPreference.upsert({
        userId,
        contextType,
        contextId: contextId || null,
        preferences
      }, {
        returning: true
      });

      const action = created ? 'created' : 'updated';
      console.log(`✅ [UserPreferenceService] Preferences ${action} successfully`);

      return preference.preferences;
    } catch (error) {
      console.error('❌ [UserPreferenceService] Error saving preferences:', error);
      throw error;
    }
  }

  /**
   * Delete preferences for a user in a specific context (reset to defaults)
   * @param {string} userId - User UUID
   * @param {string} contextType - Context type
   * @param {string|null} contextId - Context identifier
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async deletePreferences(userId, contextType, contextId = null) {
    try {
      console.log(`🗑️ [UserPreferenceService] Deleting preferences for user ${userId}, context: ${contextType}/${contextId}`);

      const deleted = await UserPreference.destroy({
        where: {
          userId,
          contextType,
          contextId: contextId || null
        }
      });

      if (deleted > 0) {
        console.log(`✅ [UserPreferenceService] Preferences deleted successfully`);
        return true;
      }

      console.log(`ℹ️ [UserPreferenceService] No preferences found to delete`);
      return false;
    } catch (error) {
      console.error('❌ [UserPreferenceService] Error deleting preferences:', error);
      throw error;
    }
  }

  /**
   * Get smart defaults for form list view
   * Uses most recent submission date if available, otherwise current date
   * @param {string} userId - User UUID
   * @param {string} formId - Form UUID
   * @returns {Promise<Object>} Default preferences with metadata
   */
  async getFormListDefaults(userId, formId) {
    try {
      console.log(`🎯 [UserPreferenceService] Getting smart defaults for form ${formId}`);

      // Try to find most recent submission for this form
      const latestSubmission = await Submission.findOne({
        where: { formId },
        order: [['submittedAt', 'DESC']],
        attributes: ['submittedAt']
      });

      let month, year, source;

      if (latestSubmission) {
        // Use month/year from latest submission
        const date = new Date(latestSubmission.submittedAt);
        month = String(date.getMonth() + 1);
        year = String(date.getFullYear());
        source = 'latest_submission';
        console.log(`✅ [UserPreferenceService] Using latest submission date: ${latestSubmission.submittedAt} (${month}/${year})`);
      } else {
        // No submissions exist, use current month/year
        const now = new Date();
        month = String(now.getMonth() + 1);
        year = String(now.getFullYear());
        source = 'current_date';
        console.log(`ℹ️ [UserPreferenceService] No submissions found, using current date (${month}/${year})`);
      }

      return {
        defaults: {
          sortBy: '_auto_date',
          sortOrder: 'desc',
          selectedDateField: 'submittedAt',
          month,
          year,
          itemsPerPage: 20,
          hideEmptyRows: true
        },
        metadata: {
          source,
          latestSubmissionDate: latestSubmission?.submittedAt || null,
          formId,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ [UserPreferenceService] Error getting form list defaults:', error);
      throw error;
    }
  }

  /**
   * Get most recent submission date for a form
   * Helper method for smart defaults
   * @param {string} formId - Form UUID
   * @returns {Promise<Date|null>} Most recent submission date or null
   */
  async getMostRecentSubmissionDate(formId) {
    try {
      const submission = await Submission.findOne({
        where: { formId },
        order: [['submittedAt', 'DESC']],
        attributes: ['submittedAt']
      });

      return submission ? submission.submittedAt : null;
    } catch (error) {
      console.error('❌ [UserPreferenceService] Error getting most recent submission:', error);
      throw error;
    }
  }

  /**
   * Extract month and year from a date
   * Helper method for date manipulation
   * @param {Date} date - Date object
   * @returns {Object} Object with month (1-12) and year
   */
  extractMonthYear(date) {
    const d = new Date(date);
    return {
      month: String(d.getMonth() + 1),
      year: String(d.getFullYear())
    };
  }

  /**
   * Get all preferences for a user (all contexts)
   * Useful for debugging or user preference management
   * @param {string} userId - User UUID
   * @returns {Promise<Array>} Array of all user preferences
   */
  async getAllUserPreferences(userId) {
    try {
      console.log(`📋 [UserPreferenceService] Getting all preferences for user ${userId}`);

      const preferences = await UserPreference.findAll({
        where: { userId },
        order: [['contextType', 'ASC'], ['contextId', 'ASC']]
      });

      console.log(`✅ [UserPreferenceService] Found ${preferences.length} preference records`);
      return preferences;
    } catch (error) {
      console.error('❌ [UserPreferenceService] Error getting all user preferences:', error);
      throw error;
    }
  }

  /**
   * Bulk delete all preferences for a user
   * Useful when deleting a user account
   * @param {string} userId - User UUID
   * @returns {Promise<number>} Number of deleted records
   */
  async deleteAllUserPreferences(userId) {
    try {
      console.log(`🗑️ [UserPreferenceService] Deleting all preferences for user ${userId}`);

      const deleted = await UserPreference.destroy({
        where: { userId }
      });

      console.log(`✅ [UserPreferenceService] Deleted ${deleted} preference records`);
      return deleted;
    } catch (error) {
      console.error('❌ [UserPreferenceService] Error deleting all user preferences:', error);
      throw error;
    }
  }
}

module.exports = new UserPreferenceService();
