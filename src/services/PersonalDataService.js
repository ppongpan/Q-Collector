/**
 * PersonalDataService - Frontend API Client for Personal Data Management Dashboard
 *
 * Provides methods to interact with the Q-Collector Personal Data Management
 * API endpoints for PDPA compliance.
 *
 * @version v0.8.2-dev
 * @date 2025-10-24
 */

import ApiClient from './ApiClient';
import logger from '../utils/logger';

class PersonalDataService {
  constructor() {
    this.baseUrl = '/personal-data';
  }

  /**
   * Get dashboard statistics
   *
   * @returns {Promise<Object>} Dashboard statistics including data subjects,
   *                             consents, DSR requests, and data retention metrics
   */
  async getDashboardStats() {
    try {
      const response = await ApiClient.get(`${this.baseUrl}/dashboard-stats`);

      if (response.success) {
        logger.debug('Dashboard stats retrieved successfully:', response.data);
        return response.data;
      }

      throw new Error('Failed to retrieve dashboard stats');
    } catch (error) {
      logger.error('Error getting dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Get list of unified user profiles with pagination
   *
   * @param {Object} options - Query options
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.limit - Items per page (default: 20, max: 100)
   * @param {string} options.search - Search by email, phone, or name (optional)
   * @param {string} options.sortBy - Sort field (default: 'last_submission_date')
   * @param {string} options.sortOrder - Sort order 'ASC' or 'DESC' (default: 'DESC')
   * @returns {Promise<Object>} { profiles, total, totalPages, page, limit }
   */
  async getProfiles({ page = 1, limit = 20, search = '', sortBy = 'last_submission_date', sortOrder = 'DESC' } = {}) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder
      });

      if (search && search.trim()) {
        params.append('search', search.trim());
      }

      const response = await ApiClient.get(`${this.baseUrl}/profiles?${params.toString()}`);

      if (response.success) {
        logger.debug(`Retrieved ${response.data.profiles.length} profiles (page ${page})`);
        return response.data;
      }

      throw new Error('Failed to retrieve profiles');
    } catch (error) {
      logger.error('Error getting profiles:', error);
      throw error;
    }
  }

  /**
   * Get detailed profile information
   *
   * @param {string} profileId - UUID of the profile
   * @returns {Promise<Object>} Comprehensive profile object with submissions,
   *                             consents, personal data fields, DSR requests, and statistics
   */
  async getProfileDetail(profileId) {
    try {
      if (!profileId) {
        throw new Error('Profile ID is required');
      }

      const response = await ApiClient.get(`${this.baseUrl}/profiles/${profileId}`);

      if (response.success) {
        logger.debug(`Retrieved profile detail for ${profileId}`);
        return response.data;
      }

      throw new Error('Failed to retrieve profile detail');
    } catch (error) {
      logger.error(`Error getting profile detail for ${profileId}:`, error);
      throw error;
    }
  }

  /**
   * Export user data in specified format (GDPR/PDPA Right to Data Portability)
   *
   * @param {string} profileId - UUID of the profile
   * @param {string} format - Export format ('json' or 'csv')
   * @returns {Promise<Object>} Exported data ready for download
   */
  async exportUserData(profileId, format = 'json') {
    try {
      if (!profileId) {
        throw new Error('Profile ID is required');
      }

      const response = await ApiClient.get(`${this.baseUrl}/profiles/${profileId}/export?format=${format}`);

      if (response.success) {
        logger.info(`Exported data for profile ${profileId} in ${format} format`);
        return response.data;
      }

      throw new Error('Failed to export user data');
    } catch (error) {
      logger.error(`Error exporting user data for ${profileId}:`, error);
      throw error;
    }
  }

  /**
   * Download exported user data as a file
   *
   * @param {string} profileId - UUID of the profile
   * @param {string} format - Export format ('json' or 'csv')
   * @param {string} filename - Optional custom filename
   */
  async downloadUserData(profileId, format = 'json', filename = null) {
    try {
      const exportData = await this.exportUserData(profileId, format);

      const defaultFilename = filename || `user-data-${profileId}-${new Date().toISOString().split('T')[0]}.${format}`;

      // Create blob and download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: format === 'json' ? 'application/json' : 'text/csv'
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = defaultFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      logger.info(`Downloaded user data: ${defaultFilename}`);
    } catch (error) {
      logger.error('Error downloading user data:', error);
      throw error;
    }
  }

  /**
   * Find potential duplicate profiles
   *
   * @param {Object} options - Search options
   * @param {number} options.minConfidence - Minimum confidence score 0-100 (default: 70)
   * @returns {Promise<Array>} Array of duplicate groups with confidence scores
   */
  async getPotentialDuplicates({ minConfidence = 70 } = {}) {
    try {
      const response = await ApiClient.get(`${this.baseUrl}/duplicates?minConfidence=${minConfidence}`);

      if (response.success) {
        logger.debug(`Found ${response.data.length} potential duplicate groups`);
        return response.data;
      }

      throw new Error('Failed to retrieve potential duplicates');
    } catch (error) {
      logger.error('Error getting potential duplicates:', error);
      throw error;
    }
  }

  /**
   * Merge duplicate profiles into primary profile
   *
   * @param {string} primaryId - UUID of the primary profile to keep
   * @param {string[]} duplicateIds - Array of duplicate profile UUIDs to merge
   * @returns {Promise<Object>} Updated primary profile
   */
  async mergeProfiles(primaryId, duplicateIds) {
    try {
      if (!primaryId) {
        throw new Error('Primary profile ID is required');
      }

      if (!Array.isArray(duplicateIds) || duplicateIds.length === 0) {
        throw new Error('At least one duplicate profile ID is required');
      }

      const response = await ApiClient.post(`${this.baseUrl}/profiles/${primaryId}/merge`, {
        duplicateIds
      });

      if (response.success) {
        logger.info(`Merged ${duplicateIds.length} profiles into ${primaryId}`);
        return response.data;
      }

      throw new Error('Failed to merge profiles');
    } catch (error) {
      logger.error(`Error merging profiles into ${primaryId}:`, error);
      throw error;
    }
  }

  // ============================================================================
  // DATA RETENTION METHODS
  // ============================================================================

  /**
   * Get list of expired data that should be deleted
   *
   * @param {Object} options - Query options
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.limit - Items per page (default: 50, max: 100)
   * @param {string} options.category - Filter by category: 'consents', 'submissions', 'all' (default: 'all')
   * @returns {Promise<Object>} Expired data with pagination and category breakdown
   */
  async getExpiredData({ page = 1, limit = 50, category = 'all' } = {}) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        category
      });

      const response = await ApiClient.get(`${this.baseUrl}/retention/expired?${params.toString()}`);

      if (response.success) {
        logger.debug(`Retrieved ${response.data.total} expired items (category: ${category})`);
        return response.data;
      }

      throw new Error('Failed to retrieve expired data');
    } catch (error) {
      logger.error('Error getting expired data:', error);
      throw error;
    }
  }

  /**
   * Delete expired data (soft delete by default)
   *
   * @param {Object} options - Deletion options
   * @param {string[]} options.dataIds - Array of data IDs to delete (max 100)
   * @param {string} options.category - Category: 'consents', 'submissions', or 'all'
   * @param {string} options.reason - Reason for deletion (5-500 characters)
   * @param {boolean} options.hardDelete - Whether to hard delete (default: false)
   * @returns {Promise<Object>} { deleted: number, failed: Array }
   */
  async deleteExpiredData({ dataIds, category, reason, hardDelete = false }) {
    try {
      if (!Array.isArray(dataIds) || dataIds.length === 0) {
        throw new Error('At least one data ID is required');
      }

      if (dataIds.length > 100) {
        throw new Error('Cannot delete more than 100 items at once');
      }

      if (!category || !['consents', 'submissions', 'all'].includes(category)) {
        throw new Error('Invalid category. Must be "consents", "submissions", or "all"');
      }

      if (!reason || reason.trim().length < 5 || reason.trim().length > 500) {
        throw new Error('Reason must be 5-500 characters');
      }

      const response = await ApiClient.post(`${this.baseUrl}/retention/delete`, {
        dataIds,
        category,
        reason: reason.trim(),
        hardDelete
      });

      if (response.success) {
        logger.info(`Deleted ${response.deleted} items (${hardDelete ? 'hard' : 'soft'} delete)`);
        return response;
      }

      throw new Error('Failed to delete expired data');
    } catch (error) {
      logger.error('Error deleting expired data:', error);
      throw error;
    }
  }

  /**
   * Get data retention compliance report
   *
   * @param {Object} options - Report options
   * @param {string} options.startDate - Start date (ISO 8601 format, optional)
   * @param {string} options.endDate - End date (ISO 8601 format, optional)
   * @returns {Promise<Object>} Comprehensive retention report
   */
  async getRetentionReport({ startDate = null, endDate = null } = {}) {
    try {
      const params = new URLSearchParams();

      if (startDate) {
        params.append('startDate', startDate);
      }

      if (endDate) {
        params.append('endDate', endDate);
      }

      const queryString = params.toString();
      const url = `${this.baseUrl}/retention/report${queryString ? `?${queryString}` : ''}`;

      const response = await ApiClient.get(url);

      if (response.success) {
        logger.debug('Retrieved retention report');
        return response.data;
      }

      throw new Error('Failed to retrieve retention report');
    } catch (error) {
      logger.error('Error getting retention report:', error);
      throw error;
    }
  }

  /**
   * Schedule automated data retention cleanup
   *
   * @param {Object} options - Schedule options
   * @param {string} options.category - Category to clean: 'consents', 'submissions', or 'all'
   * @param {boolean} options.dryRun - Whether to run in dry-run mode (default: true)
   * @returns {Promise<Object>} { summary, expired, deleted, errors }
   */
  async scheduleAutoDeletion({ category = 'all', dryRun = true } = {}) {
    try {
      if (!['consents', 'submissions', 'all'].includes(category)) {
        throw new Error('Invalid category. Must be "consents", "submissions", or "all"');
      }

      const response = await ApiClient.post(`${this.baseUrl}/retention/schedule`, {
        category,
        dryRun
      });

      if (response.success) {
        if (dryRun) {
          logger.info(`Dry-run completed: ${response.data.summary.expired} expired, 0 deleted`);
        } else {
          logger.info(`Auto-deletion completed: ${response.data.summary.deleted} items deleted`);
        }
        return response.data;
      }

      throw new Error('Failed to schedule auto-deletion');
    } catch (error) {
      logger.error('Error scheduling auto-deletion:', error);
      throw error;
    }
  }

  // ============================================================================
  // CONSENT MANAGEMENT METHODS
  // ============================================================================

  /**
   * Update user consent
   *
   * @param {string} consentId - UUID of the consent record
   * @param {Object} updateData - Consent update data
   * @param {boolean} updateData.consent_given - New consent status
   * @param {string} updateData.reason - Reason for change (10-500 chars)
   * @param {string} [updateData.legal_basis] - Legal basis (optional)
   * @param {string} [updateData.signature_data_url] - Digital signature (optional)
   * @returns {Promise<Object>} Updated consent record
   */
  async updateConsent(consentId, updateData) {
    try {
      if (!consentId) {
        throw new Error('Consent ID is required');
      }

      if (typeof updateData.consent_given !== 'boolean') {
        throw new Error('consent_given must be a boolean');
      }

      if (!updateData.reason || updateData.reason.trim().length < 10) {
        throw new Error('Reason must be at least 10 characters');
      }

      const response = await ApiClient.put(`/consents/${consentId}`, {
        consent_given: updateData.consent_given,
        reason: updateData.reason.trim(),
        legal_basis: updateData.legal_basis?.trim() || null,
        signature_data_url: updateData.signature_data_url || null
      });

      if (response.success) {
        logger.info(`Consent updated successfully: ${consentId}`);
        return response.data;
      }

      throw new Error(response.error || 'Failed to update consent');
    } catch (error) {
      logger.error(`Error updating consent ${consentId}:`, error);
      throw error;
    }
  }

  /**
   * Get consent change history
   *
   * @param {string} consentId - UUID of the consent record
   * @param {Object} filters - Filter options
   * @param {string} [filters.action] - Filter by action type (given, withdrawn, edited, renewed, expired)
   * @param {number} [filters.page=1] - Page number
   * @param {number} [filters.limit=20] - Items per page
   * @returns {Promise<Object>} { data: Array, pagination: Object }
   */
  async getConsentHistory(consentId, filters = {}) {
    try {
      if (!consentId) {
        throw new Error('Consent ID is required');
      }

      const params = new URLSearchParams();

      if (filters.action) {
        params.append('action', filters.action);
      }

      if (filters.page) {
        params.append('page', filters.page.toString());
      }

      if (filters.limit) {
        params.append('limit', filters.limit.toString());
      }

      const queryString = params.toString();
      const url = `/consents/${consentId}/history${queryString ? `?${queryString}` : ''}`;

      const response = await ApiClient.get(url);

      if (response.success) {
        logger.debug(`Retrieved consent history for ${consentId}: ${response.data?.length || 0} records`);
        return {
          data: response.data || [],
          pagination: response.pagination || { total: 0, page: 1, limit: 20, totalPages: 0 }
        };
      }

      throw new Error(response.error || 'Failed to retrieve consent history');
    } catch (error) {
      logger.error(`Error getting consent history for ${consentId}:`, error);
      throw error;
    }
  }

  /**
   * Withdraw user consent (convenience method)
   *
   * @param {string} consentId - UUID of the consent record
   * @param {Object} data - Withdrawal data
   * @param {string} data.reason - Reason for withdrawal (10-500 chars)
   * @param {string} data.signature_data_url - Digital signature (required)
   * @returns {Promise<Object>} Updated consent record
   */
  async withdrawConsent(consentId, data) {
    try {
      if (!consentId) {
        throw new Error('Consent ID is required');
      }

      if (!data.reason || data.reason.trim().length < 10) {
        throw new Error('Reason must be at least 10 characters');
      }

      if (!data.signature_data_url) {
        throw new Error('Digital signature is required for consent withdrawal');
      }

      const response = await ApiClient.post(`/consents/${consentId}/withdraw`, {
        reason: data.reason.trim(),
        signature_data_url: data.signature_data_url
      });

      if (response.success) {
        logger.info(`Consent withdrawn successfully: ${consentId}`);
        return response.data;
      }

      throw new Error(response.error || 'Failed to withdraw consent');
    } catch (error) {
      logger.error(`Error withdrawing consent ${consentId}:`, error);
      throw error;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Format retention period for display
   *
   * @param {string} retentionPeriod - Retention period string (e.g., "2 years", "6 months")
   * @returns {string} Formatted retention period
   */
  formatRetentionPeriod(retentionPeriod) {
    if (!retentionPeriod) return 'ไม่ระบุ';
    if (retentionPeriod.toLowerCase() === 'permanent') return 'ถาวร';
    return retentionPeriod;
  }

  /**
   * Calculate days until expiry
   *
   * @param {string} expiryDate - ISO 8601 expiry date
   * @returns {number} Days until expiry (negative if overdue)
   */
  calculateDaysUntilExpiry(expiryDate) {
    if (!expiryDate) return null;

    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffMs = expiry - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  /**
   * Check if data is overdue for deletion
   *
   * @param {string} expiryDate - ISO 8601 expiry date
   * @returns {boolean} True if overdue
   */
  isOverdue(expiryDate) {
    const daysUntilExpiry = this.calculateDaysUntilExpiry(expiryDate);
    return daysUntilExpiry !== null && daysUntilExpiry < 0;
  }

  /**
   * Get severity level for overdue data
   *
   * @param {number} daysOverdue - Number of days overdue (positive number)
   * @returns {string} Severity level: 'low', 'medium', 'high', 'critical'
   */
  getOverdueSeverity(daysOverdue) {
    if (daysOverdue <= 7) return 'low';
    if (daysOverdue <= 30) return 'medium';
    if (daysOverdue <= 90) return 'high';
    return 'critical';
  }

  // ============================================================================
  // DSR (DATA SUBJECT RIGHTS) REQUEST METHODS
  // ============================================================================

  /**
   * Create a new DSR request for a profile
   *
   * @param {string} profileId - UUID of the profile
   * @param {Object} requestData - DSR request data
   * @param {string} requestData.requestType - Type of request (access|rectification|erasure|portability|restriction|objection)
   * @param {string} requestData.userIdentifier - Email or phone to identify user
   * @param {Object} requestData.requestDetails - Additional request details
   * @returns {Promise<Object>} Created DSR request
   */
  async createDSRRequest(profileId, requestData) {
    try {
      const response = await ApiClient.post(
        `${this.baseUrl}/profiles/${profileId}/dsr-requests`,
        requestData
      );

      if (response.success) {
        logger.debug('DSR request created successfully:', response.data);
        return response.data;
      }

      throw new Error(response.error || 'Failed to create DSR request');
    } catch (error) {
      logger.error('Error creating DSR request:', error);
      throw error;
    }
  }

  /**
   * Get all DSR requests for a specific profile
   *
   * @param {string} profileId - UUID of the profile
   * @param {Object} filters - Optional filters
   * @param {string} filters.status - Filter by status
   * @param {string} filters.requestType - Filter by request type
   * @returns {Promise<Array>} List of DSR requests
   */
  async getProfileDSRRequests(profileId, filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.requestType) queryParams.append('requestType', filters.requestType);

      const queryString = queryParams.toString();
      const url = `${this.baseUrl}/profiles/${profileId}/dsr-requests${queryString ? `?${queryString}` : ''}`;

      const response = await ApiClient.get(url);

      if (response.success) {
        logger.debug(`Retrieved ${response.data.length} DSR requests for profile ${profileId}`);
        return response.data;
      }

      throw new Error(response.error || 'Failed to retrieve DSR requests');
    } catch (error) {
      logger.error('Error getting profile DSR requests:', error);
      throw error;
    }
  }

  /**
   * Get all DSR requests with pagination and filters
   *
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   * @param {string} options.status - Filter by status
   * @param {string} options.requestType - Filter by request type
   * @param {boolean} options.overdue - Filter overdue requests only
   * @returns {Promise<Object>} { requests, total, totalPages, page, limit }
   */
  async getAllDSRRequests(options = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (options.page) queryParams.append('page', options.page);
      if (options.limit) queryParams.append('limit', options.limit);
      if (options.status) queryParams.append('status', options.status);
      if (options.requestType) queryParams.append('requestType', options.requestType);
      if (options.overdue !== undefined) queryParams.append('overdue', options.overdue);

      const response = await ApiClient.get(`${this.baseUrl}/dsr-requests?${queryParams.toString()}`);

      if (response.success) {
        logger.debug('DSR requests retrieved successfully:', response.data);
        return response.data;
      }

      throw new Error('Failed to retrieve DSR requests');
    } catch (error) {
      logger.error('Error getting all DSR requests:', error);
      throw error;
    }
  }

  /**
   * Get a specific DSR request by ID
   *
   * @param {string} requestId - UUID of the DSR request
   * @returns {Promise<Object>} DSR request details
   */
  async getDSRRequest(requestId) {
    try {
      const response = await ApiClient.get(`${this.baseUrl}/dsr-requests/${requestId}`);

      if (response.success) {
        logger.debug('DSR request retrieved successfully:', response.data);
        return response.data;
      }

      throw new Error('Failed to retrieve DSR request');
    } catch (error) {
      logger.error('Error getting DSR request:', error);
      throw error;
    }
  }

  /**
   * Update DSR request status
   *
   * @param {string} requestId - UUID of the DSR request
   * @param {Object} statusData - Status update data
   * @param {string} statusData.status - New status (in_progress|completed|rejected|cancelled)
   * @param {string} statusData.note - Note about the status change
   * @param {Object} statusData.responseData - Response data (for completed requests)
   * @param {string} statusData.responseNotes - Additional notes
   * @returns {Promise<Object>} Updated DSR request
   */
  async updateDSRRequestStatus(requestId, statusData) {
    try {
      const response = await ApiClient.put(
        `${this.baseUrl}/dsr-requests/${requestId}/status`,
        statusData
      );

      if (response.success) {
        logger.debug('DSR request status updated successfully:', response.data);
        return response.data;
      }

      throw new Error(response.error || 'Failed to update DSR request status');
    } catch (error) {
      logger.error('Error updating DSR request status:', error);
      throw error;
    }
  }

  /**
   * Get DSR request statistics
   *
   * @returns {Promise<Object>} DSR statistics
   */
  async getDSRStatistics() {
    try {
      const response = await ApiClient.get(`${this.baseUrl}/dsr-requests/stats`);

      if (response.success) {
        logger.debug('DSR statistics retrieved successfully:', response.data);
        return response.data;
      }

      throw new Error('Failed to retrieve DSR statistics');
    } catch (error) {
      logger.error('Error getting DSR statistics:', error);
      throw error;
    }
  }

  /**
   * Get action history for a DSR request
   *
   * @param {string} requestId - UUID of the DSR request
   * @returns {Promise<Array>} Array of actions in chronological order
   */
  async getDSRActionHistory(requestId) {
    try {
      if (!requestId) {
        throw new Error('Request ID is required');
      }

      const response = await ApiClient.get(`${this.baseUrl}/dsr-requests/${requestId}/actions`);

      if (response.success) {
        logger.debug(`Retrieved ${response.data?.length || 0} actions for DSR request ${requestId}`);
        return response.data || [];
      }

      throw new Error('Failed to retrieve DSR action history');
    } catch (error) {
      logger.error(`Error getting DSR action history for ${requestId}:`, error);
      throw error;
    }
  }

  /**
   * Add a comment to a DSR request
   *
   * @param {string} requestId - UUID of the DSR request
   * @param {string} comment - Comment text
   * @returns {Promise<Object>} Created action record
   */
  async addDSRComment(requestId, comment) {
    try {
      if (!requestId) {
        throw new Error('Request ID is required');
      }

      if (!comment || comment.trim().length < 1) {
        throw new Error('Comment cannot be empty');
      }

      const response = await ApiClient.post(`${this.baseUrl}/dsr-requests/${requestId}/comments`, {
        comment: comment.trim()
      });

      if (response.success) {
        logger.info(`Added comment to DSR request ${requestId}`);
        return response.data;
      }

      throw new Error('Failed to add comment');
    } catch (error) {
      logger.error(`Error adding comment to DSR request ${requestId}:`, error);
      throw error;
    }
  }

  /**
   * Update DSR request status (alias for updateDSRRequestStatus for backward compatibility)
   *
   * @param {string} requestId - UUID of the DSR request
   * @param {Object} statusData - Status update data
   * @returns {Promise<Object>} Updated DSR request
   */
  async updateDSRStatus(requestId, statusData) {
    return this.updateDSRRequestStatus(requestId, statusData);
  }

  // ============================================================================
  // DSR WORKFLOW MANAGEMENT (v0.8.7-dev)
  // ============================================================================

  /**
   * Get DSR action history
   * @param {string} requestId - DSR request UUID
   * @returns {Promise<Array>} Array of DSR actions
   */
  async getDSRActionHistory(requestId) {
    try {
      const response = await ApiClient.get(`/api/v1/dsr-workflow/${requestId}/actions`);

      if (response.success) {
        logger.debug(`Retrieved ${response.data.length} actions for DSR ${requestId}`);
        return response.data;
      }

      throw new Error('Failed to retrieve DSR action history');
    } catch (error) {
      logger.error(`Error getting DSR action history for ${requestId}:`, error);
      throw error;
    }
  }

  /**
   * Mark DSR request as under review
   * @param {string} requestId - DSR request UUID
   * @param {Object} data - Review data
   * @param {string} data.notes - Review notes (optional)
   * @returns {Promise<Object>} Updated DSR request
   */
  async reviewDSRRequest(requestId, data) {
    try {
      const response = await ApiClient.put(`/api/v1/dsr-workflow/${requestId}/review`, data);

      if (response.success) {
        logger.info(`DSR request ${requestId} marked for review`);
        return response.data;
      }

      throw new Error(response.message || 'Failed to review DSR request');
    } catch (error) {
      logger.error(`Error reviewing DSR request ${requestId}:`, error);
      throw error;
    }
  }

  /**
   * Approve DSR request
   * @param {string} requestId - DSR request UUID
   * @param {Object} data - Approval data
   * @param {string} data.notes - Approval notes (required, min 20 chars)
   * @param {string} data.legalBasis - Legal basis (required)
   * @returns {Promise<Object>} Updated DSR request
   */
  async approveDSRRequest(requestId, data) {
    try {
      const response = await ApiClient.put(`/api/v1/dsr-workflow/${requestId}/approve`, data);

      if (response.success) {
        logger.info(`DSR request ${requestId} approved`);
        return response.data;
      }

      throw new Error(response.message || 'Failed to approve DSR request');
    } catch (error) {
      logger.error(`Error approving DSR request ${requestId}:`, error);
      throw error;
    }
  }

  /**
   * Reject DSR request
   * @param {string} requestId - DSR request UUID
   * @param {Object} data - Rejection data
   * @param {string} data.reason - Rejection reason (required, min 50 chars)
   * @param {string} data.legalBasis - Legal basis (required)
   * @returns {Promise<Object>} Updated DSR request
   */
  async rejectDSRRequest(requestId, data) {
    try {
      const response = await ApiClient.put(`/api/v1/dsr-workflow/${requestId}/reject`, data);

      if (response.success) {
        logger.info(`DSR request ${requestId} rejected`);
        return response.data;
      }

      throw new Error(response.message || 'Failed to reject DSR request');
    } catch (error) {
      logger.error(`Error rejecting DSR request ${requestId}:`, error);
      throw error;
    }
  }

  /**
   * Execute approved DSR request
   * @param {string} requestId - DSR request UUID
   * @param {Object} data - Execution data
   * @param {Object} data.executionDetails - Execution details (required)
   * @param {string} data.notes - Execution notes (optional)
   * @returns {Promise<Object>} Updated DSR request
   */
  async executeDSRRequest(requestId, data) {
    try {
      const response = await ApiClient.put(`/api/v1/dsr-workflow/${requestId}/execute`, data);

      if (response.success) {
        logger.info(`DSR request ${requestId} executed and completed`);
        return response.data;
      }

      throw new Error(response.message || 'Failed to execute DSR request');
    } catch (error) {
      logger.error(`Error executing DSR request ${requestId}:`, error);
      throw error;
    }
  }

  // ============================================================================
  // FORM SELECTION FOR DSR
  // ============================================================================

  /**
   * Get list of forms for a profile (for DSR submission)
   * v0.8.7-dev: Used in DSR request form to show which forms the data subject has submitted
   *
   * @param {string} profileId - UUID of the profile
   * @returns {Promise<Array>} Array of forms with submission counts
   *
   * Response format:
   * [
   *   {
   *     formId: "uuid",
   *     formTitle: "ฟอร์มทดสอบ",
   *     submissionCount: 3,
   *     lastSubmissionDate: "2025-10-24T10:30:00Z",
   *     hasConsents: true,
   *     hasPII: true
   *   }
   * ]
   */
  async getProfileForms(profileId) {
    try {
      const response = await ApiClient.get(`${this.baseUrl}/profiles/${profileId}/forms`);

      if (response.success) {
        logger.debug(`Retrieved ${response.data.length} forms for profile ${profileId}`);
        return response.data;
      }

      throw new Error('Failed to retrieve profile forms');
    } catch (error) {
      logger.error(`Error getting forms for profile ${profileId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export default new PersonalDataService();
