/**
 * Consent Management Service
 *
 * Handles all PDPA consent-related API calls:
 * - Consent item CRUD operations
 * - User consent recording
 * - Consent withdrawal
 * - Consent history and statistics
 *
 * @version 0.9.0-dev
 */

import ApiClient from './ApiClient';
import { parseApiError } from '../utils/apiHelpers';

class ConsentService {
  /**
   * Get all consent items for a form
   * @param {string} formId - Form UUID
   * @returns {Promise<Array>} - Array of consent items
   */
  async getConsentItemsByForm(formId) {
    try {
      const response = await ApiClient.get(`/consents/forms/${formId}/items`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching consent items:', error);
      throw parseApiError(error);
    }
  }

  /**
   * Create a new consent item for a form
   * @param {string} formId - Form UUID
   * @param {Object} consentItem - Consent item data
   * @param {string} consentItem.titleTh - Thai title (required)
   * @param {string} consentItem.titleEn - English title (optional)
   * @param {string} consentItem.descriptionTh - Thai description (optional)
   * @param {string} consentItem.descriptionEn - English description (optional)
   * @param {string} consentItem.purpose - Purpose of data collection (required)
   * @param {string} consentItem.retentionPeriod - Data retention period (optional)
   * @param {boolean} consentItem.required - Is consent required (default: false)
   * @param {number} consentItem.order - Display order (default: 0)
   * @param {number} consentItem.version - Version number (default: 1)
   * @returns {Promise<Object>} - Created consent item
   */
  async createConsentItem(formId, consentItem) {
    try {
      const response = await ApiClient.post(`/consents/forms/${formId}/items`, consentItem);
      return response.data;
    } catch (error) {
      console.error('Error creating consent item:', error);
      throw parseApiError(error);
    }
  }

  /**
   * Update an existing consent item
   * @param {string} itemId - Consent item UUID
   * @param {Object} updates - Updated fields
   * @returns {Promise<Object>} - Updated consent item
   */
  async updateConsentItem(itemId, updates) {
    try {
      const response = await ApiClient.put(`/consents/items/${itemId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Error updating consent item:', error);
      throw parseApiError(error);
    }
  }

  /**
   * Delete (deactivate) a consent item
   * @param {string} itemId - Consent item UUID
   * @returns {Promise<Object>} - Success message
   */
  async deleteConsentItem(itemId) {
    try {
      const response = await ApiClient.delete(`/consents/items/${itemId}`);
      return response;
    } catch (error) {
      console.error('Error deleting consent item:', error);
      throw parseApiError(error);
    }
  }

  /**
   * Record user consent from form submission
   * @param {Object} consentData - Consent recording data
   * @param {string} consentData.submissionId - Submission UUID
   * @param {Array} consentData.consents - Array of consent responses
   * @param {string} consentData.userEmail - User email (optional)
   * @param {string} consentData.userPhone - User phone (optional)
   * @param {string} consentData.userFullName - User full name (optional)
   * @returns {Promise<Array>} - Array of recorded consents
   */
  async recordConsent(consentData) {
    try {
      console.log('🔍 ConsentService.recordConsent - Request data:', JSON.stringify(consentData, null, 2));
      const response = await ApiClient.post('/consents/record', consentData);
      return response.data || [];
    } catch (error) {
      console.error('❌ ConsentService.recordConsent - Error:', error);
      console.error('❌ ConsentService.recordConsent - Error response:', error.response?.data);
      throw parseApiError(error);
    }
  }

  /**
   * Get all consents for a submission
   * @param {string} submissionId - Submission UUID
   * @returns {Promise<Array>} - Array of user consents
   */
  async getConsentsBySubmission(submissionId) {
    try {
      const response = await ApiClient.get(`/consents/submission/${submissionId}`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching submission consents:', error);
      throw parseApiError(error);
    }
  }

  /**
   * Get all consents for a user (by email or phone)
   * @param {string} email - User email (optional)
   * @param {string} phone - User phone (optional)
   * @returns {Promise<Array>} - Array of user consents
   */
  async getConsentsByUser(email = null, phone = null) {
    try {
      const params = {};
      if (email) params.email = email;
      if (phone) params.phone = phone;

      const queryString = new URLSearchParams(params).toString();
      const response = await ApiClient.get(`/consents/user?${queryString}`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching user consents:', error);
      throw parseApiError(error);
    }
  }

  /**
   * Withdraw a consent
   * @param {string} consentId - User consent UUID
   * @param {string} reason - Withdrawal reason (optional)
   * @returns {Promise<Object>} - Updated consent
   */
  async withdrawConsent(consentId, reason = null) {
    try {
      const payload = { consentId };
      if (reason) payload.reason = reason;

      const response = await ApiClient.post('/consents/withdraw', payload);
      return response.data;
    } catch (error) {
      console.error('Error withdrawing consent:', error);
      throw parseApiError(error);
    }
  }

  /**
   * Get consent statistics (admin only)
   * @returns {Promise<Object>} - Consent statistics
   */
  async getConsentStatistics() {
    try {
      const response = await ApiClient.get('/consents/statistics');
      return response.data || {};
    } catch (error) {
      console.error('Error fetching consent statistics:', error);
      throw parseApiError(error);
    }
  }

  /**
   * Validate consent item data before submission
   * @param {Object} consentItem - Consent item to validate
   * @returns {Object} - Validation result { valid: boolean, errors: Array }
   */
  validateConsentItem(consentItem) {
    const errors = [];

    if (!consentItem.titleTh || consentItem.titleTh.trim() === '') {
      errors.push('Thai title is required');
    }

    if (!consentItem.purpose || consentItem.purpose.trim() === '') {
      errors.push('Purpose is required');
    }

    if (consentItem.order !== undefined && (typeof consentItem.order !== 'number' || consentItem.order < 0)) {
      errors.push('Order must be a non-negative number');
    }

    if (consentItem.version !== undefined && (typeof consentItem.version !== 'number' || consentItem.version < 1)) {
      errors.push('Version must be a positive number');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Format consent item for display
   * @param {Object} consentItem - Consent item from API
   * @param {string} language - Display language ('th' or 'en')
   * @returns {Object} - Formatted consent item
   */
  formatConsentItem(consentItem, language = 'th') {
    return {
      id: consentItem.id,
      title: language === 'en' && consentItem.titleEn ? consentItem.titleEn : consentItem.titleTh,
      description: language === 'en' && consentItem.descriptionEn ? consentItem.descriptionEn : consentItem.descriptionTh,
      purpose: consentItem.purpose,
      retentionPeriod: consentItem.retentionPeriod || 'Not specified',
      required: consentItem.required || false,
      order: consentItem.order || 0,
      version: consentItem.version || 1,
      isActive: consentItem.isActive !== false
    };
  }

  /**
   * Group consents by form for display
   * @param {Array} consents - Array of user consents
   * @returns {Object} - Consents grouped by form ID
   */
  groupConsentsByForm(consents) {
    return consents.reduce((grouped, consent) => {
      const formId = consent.formId || consent.form_id;
      if (!grouped[formId]) {
        grouped[formId] = {
          formId,
          formTitle: consent.formTitle || consent.form?.title || 'Unknown Form',
          consents: []
        };
      }
      grouped[formId].consents.push(consent);
      return grouped;
    }, {});
  }

  /**
   * Calculate consent statistics from array
   * @param {Array} consents - Array of user consents
   * @returns {Object} - Statistics summary
   */
  calculateConsentStats(consents) {
    const stats = {
      total: consents.length,
      given: 0,
      withdrawn: 0,
      required: 0,
      optional: 0,
      byPurpose: {}
    };

    consents.forEach(consent => {
      if (consent.consentGiven || consent.consent_given) {
        stats.given++;
      }

      if (consent.withdrawnAt || consent.withdrawn_at) {
        stats.withdrawn++;
      }

      if (consent.consentItem?.required || consent.consent_item?.required) {
        stats.required++;
      } else {
        stats.optional++;
      }

      const purpose = consent.consentItem?.purpose || consent.consent_item?.purpose || 'Unknown';
      stats.byPurpose[purpose] = (stats.byPurpose[purpose] || 0) + 1;
    });

    return stats;
  }
}

export default new ConsentService();
