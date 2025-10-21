/**
 * NotificationService
 * Frontend service for Notification Rules API
 * Q-Collector v0.8.0 Advanced Telegram Notification System
 */

import apiClient from './ApiClient';

const BASE_PATH = '/notifications';

class NotificationService {
  /**
   * Get all notification rules with filtering
   * @param {Object} filters - Filter options
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>}
   */
  async getRules(filters = {}, pagination = {}) {
    try {
      const params = {
        ...filters,
        ...pagination,
      };

      const response = await apiClient.get(`${BASE_PATH}/rules`, { params });
      return response; // apiClient.get() already returns response.data
    } catch (error) {
      console.error('[NotificationService] Error getting rules:', error);
      throw error;
    }
  }

  /**
   * Get a single notification rule by ID
   * @param {string} ruleId - Rule ID
   * @returns {Promise<Object>}
   */
  async getRule(ruleId) {
    try {
      const response = await apiClient.get(`${BASE_PATH}/rules/${ruleId}`);
      return response; // apiClient.get() already returns response.data
    } catch (error) {
      console.error('[NotificationService] Error getting rule:', error);
      throw error;
    }
  }

  /**
   * Create a new notification rule
   * @param {Object} ruleData - Rule data
   * @returns {Promise<Object>}
   */
  async createRule(ruleData) {
    try {
      const response = await apiClient.post(`${BASE_PATH}/rules`, ruleData);
      return response; // apiClient.post() already returns response.data
    } catch (error) {
      console.error('[NotificationService] Error creating rule:', error);
      throw error;
    }
  }

  /**
   * Update an existing notification rule
   * @param {string} ruleId - Rule ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>}
   */
  async updateRule(ruleId, updates) {
    try {
      const response = await apiClient.patch(`${BASE_PATH}/rules/${ruleId}`, updates);
      return response; // apiClient.patch() already returns response.data
    } catch (error) {
      console.error('[NotificationService] Error updating rule:', error);
      throw error;
    }
  }

  /**
   * Delete a notification rule
   * @param {string} ruleId - Rule ID
   * @returns {Promise<Object>}
   */
  async deleteRule(ruleId) {
    try {
      const response = await apiClient.delete(`${BASE_PATH}/rules/${ruleId}`);
      return response; // apiClient.delete() already returns response.data
    } catch (error) {
      console.error('[NotificationService] Error deleting rule:', error);
      throw error;
    }
  }

  /**
   * Test a notification rule
   * @param {string} ruleId - Rule ID
   * @param {Object} testData - Test data (optional)
   * @returns {Promise<Object>}
   */
  async testRule(ruleId, testData = {}) {
    try {
      const response = await apiClient.post(`${BASE_PATH}/rules/${ruleId}/test`, testData);
      return response; // apiClient.post() already returns response.data
    } catch (error) {
      console.error('[NotificationService] Error testing rule:', error);
      throw error;
    }
  }

  /**
   * Get rule statistics
   * @param {string} ruleId - Rule ID
   * @returns {Promise<Object>}
   */
  async getRuleStats(ruleId) {
    try {
      const response = await apiClient.get(`${BASE_PATH}/rules/${ruleId}/stats`);
      return response; // apiClient.get() already returns response.data
    } catch (error) {
      console.error('[NotificationService] Error getting rule stats:', error);
      throw error;
    }
  }

  /**
   * Get notification history
   * @param {Object} filters - Filter options
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>}
   */
  async getHistory(filters = {}, pagination = {}) {
    try {
      const params = {
        ...filters,
        ...pagination,
      };

      const response = await apiClient.get(`${BASE_PATH}/history`, { params });
      return response; // apiClient.get() already returns response.data
    } catch (error) {
      console.error('[NotificationService] Error getting history:', error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   * @returns {Promise<Object>}
   */
  async getQueueStats() {
    try {
      const response = await apiClient.get(`${BASE_PATH}/queue/stats`);
      return response; // apiClient.get() already returns response.data
    } catch (error) {
      console.error('[NotificationService] Error getting queue stats:', error);
      throw error;
    }
  }

  /**
   * Get queue jobs
   * @param {string} type - Job type (waiting, active, failed)
   * @param {number} start - Start index
   * @param {number} end - End index
   * @returns {Promise<Object>}
   */
  async getQueueJobs(type = 'waiting', start = 0, end = 10) {
    try {
      const response = await apiClient.get(`${BASE_PATH}/queue/jobs`, {
        params: { type, start, end },
      });
      return response; // apiClient.get() already returns response.data
    } catch (error) {
      console.error('[NotificationService] Error getting queue jobs:', error);
      throw error;
    }
  }

  /**
   * Get job status
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>}
   */
  async getJobStatus(jobId) {
    try {
      const response = await apiClient.get(`${BASE_PATH}/queue/jobs/${jobId}`);
      return response; // apiClient.get() already returns response.data
    } catch (error) {
      console.error('[NotificationService] Error getting job status:', error);
      throw error;
    }
  }

  /**
   * Clean old jobs
   * @param {string} type - Job type (completed, failed)
   * @param {number} olderThanDays - Days threshold
   * @returns {Promise<Object>}
   */
  async cleanJobs(type, olderThanDays) {
    try {
      const response = await apiClient.post(`${BASE_PATH}/queue/clean`, {
        type,
        olderThanDays,
      });
      return response; // apiClient.post() already returns response.data
    } catch (error) {
      console.error('[NotificationService] Error cleaning jobs:', error);
      throw error;
    }
  }
}

export default new NotificationService();
