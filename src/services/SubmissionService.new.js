/**
 * Submission Service - Submission Management with API Integration
 *
 * Features:
 * - API-first approach with localStorage fallback
 * - Offline support with sync queue
 * - CRUD operations for submissions
 * - PII encryption support (backend handles encryption)
 * - Status management
 * - Cache management
 */

import ApiClient from './ApiClient';
import { API_ENDPOINTS } from '../config/api.config';
import { parseApiError } from '../utils/apiHelpers';

class SubmissionService {
  constructor() {
    this.STORAGE_KEYS = {
      SUBMISSIONS_CACHE: 'qcollector_submissions_cache',
      SYNC_QUEUE: 'qcollector_submission_sync_queue',
      LAST_SYNC: 'qcollector_submissions_last_sync'
    };
    this.isOnline = navigator.onLine;
    this.initializeOnlineDetection();
  }

  // ========== ONLINE/OFFLINE DETECTION ==========

  initializeOnlineDetection() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // ========== CACHE MANAGEMENT ==========

  /**
   * Get submissions from cache
   * @returns {Object} Cached submissions
   */
  getSubmissionsCache() {
    try {
      const cache = localStorage.getItem(this.STORAGE_KEYS.SUBMISSIONS_CACHE);
      return cache ? JSON.parse(cache) : {};
    } catch (error) {
      console.error('Error reading submissions cache:', error);
      return {};
    }
  }

  /**
   * Update submissions cache
   * @param {Object} submissions - Submissions to cache
   */
  updateSubmissionsCache(submissions) {
    try {
      localStorage.setItem(this.STORAGE_KEYS.SUBMISSIONS_CACHE, JSON.stringify(submissions));
      localStorage.setItem(this.STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    } catch (error) {
      console.error('Error updating submissions cache:', error);
    }
  }

  /**
   * Update single submission in cache
   * @param {Object} submission - Submission to cache
   */
  updateSubmissionInCache(submission) {
    const cache = this.getSubmissionsCache();
    cache[submission.id] = submission;
    this.updateSubmissionsCache(cache);
  }

  /**
   * Remove submission from cache
   * @param {string} submissionId - Submission ID
   */
  removeSubmissionFromCache(submissionId) {
    const cache = this.getSubmissionsCache();
    delete cache[submissionId];
    this.updateSubmissionsCache(cache);
  }

  // ========== SYNC QUEUE MANAGEMENT ==========

  /**
   * Add operation to sync queue
   * @param {Object} operation - Operation details
   */
  addToSyncQueue(operation) {
    try {
      const queue = this.getSyncQueue();
      queue.push({
        ...operation,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem(this.STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
    } catch (error) {
      console.error('Error adding to sync queue:', error);
    }
  }

  /**
   * Get sync queue
   * @returns {Array} Queue of pending operations
   */
  getSyncQueue() {
    try {
      const queue = localStorage.getItem(this.STORAGE_KEYS.SYNC_QUEUE);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Error reading sync queue:', error);
      return [];
    }
  }

  /**
   * Process sync queue when back online
   */
  async processSyncQueue() {
    const queue = this.getSyncQueue();
    if (queue.length === 0) return;

    console.log(`Processing ${queue.length} queued submission operations...`);

    const processedIds = [];

    for (const operation of queue) {
      try {
        switch (operation.type) {
          case 'create':
            await this.saveSubmission(operation.formId, operation.data, true);
            break;
          case 'update':
            await this.updateSubmission(operation.submissionId, operation.data, true);
            break;
          case 'delete':
            await this.deleteSubmission(operation.submissionId, true);
            break;
        }
        processedIds.push(operation.timestamp);
      } catch (error) {
        console.error('Error processing queued operation:', error);
      }
    }

    // Remove processed operations
    const newQueue = queue.filter(op => !processedIds.includes(op.timestamp));
    localStorage.setItem(this.STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(newQueue));

    console.log(`Sync complete. ${processedIds.length} operations synced, ${newQueue.length} remaining.`);
  }

  // ========== SUBMISSION CRUD OPERATIONS ==========

  /**
   * Save new submission
   * @param {string} formId - Form ID
   * @param {Object} data - Submission data
   * @param {boolean} skipQueue - Skip adding to queue
   * @returns {Promise<Object>} Created submission
   */
  async saveSubmission(formId, data, skipQueue = false) {
    try {
      if (this.isOnline) {
        const response = await ApiClient.post(API_ENDPOINTS.submissions.create, {
          formId,
          data,
          status: 'submitted'
        });

        // Update cache
        this.updateSubmissionInCache(response.submission);

        return response.submission;
      } else {
        // Offline: save to cache and queue
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const submission = {
          id: tempId,
          formId,
          data,
          status: 'draft',
          submittedAt: new Date().toISOString(),
          _pendingSync: true
        };

        this.updateSubmissionInCache(submission);

        if (!skipQueue) {
          this.addToSyncQueue({
            type: 'create',
            formId,
            data
          });
        }

        return submission;
      }
    } catch (error) {
      const message = parseApiError(error);
      throw new Error(message);
    }
  }

  /**
   * Get all submissions (optionally filtered by form ID)
   * @param {string} formId - Optional form ID filter
   * @returns {Promise<Array>} Array of submissions
   */
  async getSubmissions(formId = null) {
    try {
      if (this.isOnline) {
        const endpoint = formId
          ? API_ENDPOINTS.submissions.byForm(formId)
          : API_ENDPOINTS.submissions.list;

        const response = await ApiClient.get(endpoint);

        // Update cache
        const submissionsMap = {};
        response.submissions.forEach(submission => {
          submissionsMap[submission.id] = submission;
        });

        // Merge with existing cache (keep other form submissions)
        if (formId) {
          const cache = this.getSubmissionsCache();
          Object.values(cache).forEach(sub => {
            if (sub.formId !== formId) {
              submissionsMap[sub.id] = sub;
            }
          });
        }

        this.updateSubmissionsCache(submissionsMap);

        return response.submissions;
      } else {
        // Offline: return from cache
        const cache = this.getSubmissionsCache();
        let submissions = Object.values(cache);

        if (formId) {
          submissions = submissions.filter(sub => sub.formId === formId);
        }

        return submissions.sort((a, b) =>
          new Date(b.submittedAt) - new Date(a.submittedAt)
        );
      }
    } catch (error) {
      console.warn('API call failed, using cache:', error);
      // Fallback to cache
      const cache = this.getSubmissionsCache();
      let submissions = Object.values(cache);

      if (formId) {
        submissions = submissions.filter(sub => sub.formId === formId);
      }

      return submissions.sort((a, b) =>
        new Date(b.submittedAt) - new Date(a.submittedAt)
      );
    }
  }

  /**
   * Get submission by ID
   * @param {string} submissionId - Submission ID
   * @returns {Promise<Object>} Submission data
   */
  async getSubmission(submissionId) {
    try {
      if (this.isOnline) {
        const response = await ApiClient.get(API_ENDPOINTS.submissions.get(submissionId));

        // Update cache
        this.updateSubmissionInCache(response.submission);

        return response.submission;
      } else {
        // Offline: return from cache
        const cache = this.getSubmissionsCache();
        const submission = cache[submissionId];
        if (!submission) {
          throw new Error('ไม่พบข้อมูลในโหมดออฟไลน์');
        }
        return submission;
      }
    } catch (error) {
      // Fallback to cache
      const cache = this.getSubmissionsCache();
      const submission = cache[submissionId];
      if (submission) {
        return submission;
      }
      throw new Error(parseApiError(error));
    }
  }

  /**
   * Update submission
   * @param {string} submissionId - Submission ID
   * @param {Object} data - Updated data
   * @param {boolean} skipQueue - Skip adding to queue
   * @returns {Promise<Object>} Updated submission
   */
  async updateSubmission(submissionId, data, skipQueue = false) {
    try {
      if (this.isOnline) {
        const response = await ApiClient.put(
          `${API_ENDPOINTS.submissions.list}/${submissionId}`,
          { data }
        );

        // Update cache
        this.updateSubmissionInCache(response.submission);

        return response.submission;
      } else {
        // Offline: update cache and queue
        const cache = this.getSubmissionsCache();
        const existingSubmission = cache[submissionId];

        if (!existingSubmission) {
          throw new Error('ไม่พบข้อมูลที่ต้องการแก้ไข');
        }

        const updatedSubmission = {
          ...existingSubmission,
          data,
          updatedAt: new Date().toISOString(),
          _pendingSync: true
        };

        this.updateSubmissionInCache(updatedSubmission);

        if (!skipQueue) {
          this.addToSyncQueue({
            type: 'update',
            submissionId,
            data
          });
        }

        return updatedSubmission;
      }
    } catch (error) {
      const message = parseApiError(error);
      throw new Error(message);
    }
  }

  /**
   * Delete submission
   * @param {string} submissionId - Submission ID
   * @param {boolean} skipQueue - Skip adding to queue
   * @returns {Promise<boolean>} Success status
   */
  async deleteSubmission(submissionId, skipQueue = false) {
    try {
      if (this.isOnline) {
        await ApiClient.delete(`${API_ENDPOINTS.submissions.list}/${submissionId}`);

        // Remove from cache
        this.removeSubmissionFromCache(submissionId);

        return true;
      } else {
        // Offline: remove from cache and queue
        this.removeSubmissionFromCache(submissionId);

        if (!skipQueue) {
          this.addToSyncQueue({
            type: 'delete',
            submissionId
          });
        }

        return true;
      }
    } catch (error) {
      const message = parseApiError(error);
      throw new Error(message);
    }
  }

  /**
   * Update submission status
   * @param {string} submissionId - Submission ID
   * @param {string} status - New status (draft, submitted, approved, rejected)
   * @returns {Promise<Object>} Updated submission
   */
  async updateSubmissionStatus(submissionId, status) {
    try {
      if (!this.isOnline) {
        throw new Error('ไม่สามารถเปลี่ยนสถานะในโหมดออฟไลน์');
      }

      const response = await ApiClient.patch(
        `${API_ENDPOINTS.submissions.list}/${submissionId}/status`,
        { status }
      );

      // Update cache
      this.updateSubmissionInCache(response.submission);

      return response.submission;
    } catch (error) {
      const message = parseApiError(error);
      throw new Error(message);
    }
  }

  // ========== UTILITY METHODS ==========

  /**
   * Check if submission has pending sync
   * @param {string} submissionId - Submission ID
   * @returns {boolean}
   */
  hasPendingSync(submissionId) {
    const cache = this.getSubmissionsCache();
    const submission = cache[submissionId];
    return submission?._pendingSync === true;
  }

  /**
   * Get sync status
   * @returns {Object} Sync status info
   */
  getSyncStatus() {
    const queue = this.getSyncQueue();
    const lastSync = localStorage.getItem(this.STORAGE_KEYS.LAST_SYNC);

    return {
      isOnline: this.isOnline,
      pendingOperations: queue.length,
      lastSync: lastSync ? new Date(lastSync) : null,
      hasPendingChanges: queue.length > 0
    };
  }

  /**
   * Force sync now
   * @returns {Promise<void>}
   */
  async forceSync() {
    if (!this.isOnline) {
      throw new Error('ไม่สามารถซิงค์ได้ในโหมดออฟไลน์');
    }

    await this.processSyncQueue();
  }

  /**
   * Clear cache
   */
  clearCache() {
    localStorage.removeItem(this.STORAGE_KEYS.SUBMISSIONS_CACHE);
    localStorage.removeItem(this.STORAGE_KEYS.LAST_SYNC);
  }

  /**
   * Clear sync queue
   */
  clearSyncQueue() {
    localStorage.removeItem(this.STORAGE_KEYS.SYNC_QUEUE);
  }

  /**
   * Get statistics
   * @returns {Object} Usage statistics
   */
  getStatistics() {
    const cache = this.getSubmissionsCache();
    const queue = this.getSyncQueue();

    return {
      totalSubmissions: Object.keys(cache).length,
      pendingSyncs: queue.length,
      lastSync: localStorage.getItem(this.STORAGE_KEYS.LAST_SYNC),
      cacheSize: JSON.stringify(cache).length
    };
  }

  /**
   * Export submissions data
   * @param {string} formId - Optional form ID filter
   * @returns {Array} Submissions data for export
   */
  async exportSubmissions(formId = null) {
    const submissions = await this.getSubmissions(formId);
    return submissions.map(sub => ({
      id: sub.id,
      formId: sub.formId,
      data: sub.data,
      status: sub.status,
      submittedAt: sub.submittedAt,
      updatedAt: sub.updatedAt
    }));
  }
}

// Create singleton instance
const submissionService = new SubmissionService();
export default submissionService;