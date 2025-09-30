/**
 * Form Service - Form Management with API Integration
 *
 * Features:
 * - API-first approach with localStorage fallback
 * - Offline support with sync queue
 * - CRUD operations for forms
 * - Role-based access control integration
 * - Cache management
 */

import ApiClient from './ApiClient';
import { API_ENDPOINTS } from '../config/api.config';
import { parseApiError } from '../utils/apiHelpers';

class FormService {
  constructor() {
    this.STORAGE_KEYS = {
      FORMS_CACHE: 'qcollector_forms_cache',
      SYNC_QUEUE: 'qcollector_form_sync_queue',
      LAST_SYNC: 'qcollector_last_sync'
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
   * Get forms from cache
   * @returns {Object} Cached forms
   */
  getFormsCache() {
    try {
      const cache = localStorage.getItem(this.STORAGE_KEYS.FORMS_CACHE);
      return cache ? JSON.parse(cache) : {};
    } catch (error) {
      console.error('Error reading forms cache:', error);
      return {};
    }
  }

  /**
   * Update forms cache
   * @param {Object} forms - Forms to cache
   */
  updateFormsCache(forms) {
    try {
      localStorage.setItem(this.STORAGE_KEYS.FORMS_CACHE, JSON.stringify(forms));
      localStorage.setItem(this.STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    } catch (error) {
      console.error('Error updating forms cache:', error);
    }
  }

  /**
   * Update single form in cache
   * @param {Object} form - Form to cache
   */
  updateFormInCache(form) {
    const cache = this.getFormsCache();
    cache[form.id] = form;
    this.updateFormsCache(cache);
  }

  /**
   * Remove form from cache
   * @param {string} formId - Form ID
   */
  removeFormFromCache(formId) {
    const cache = this.getFormsCache();
    delete cache[formId];
    this.updateFormsCache(cache);
  }

  // ========== SYNC QUEUE MANAGEMENT ==========

  /**
   * Add operation to sync queue (for offline mode)
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

    console.log(`Processing ${queue.length} queued operations...`);

    const processedIds = [];

    for (const operation of queue) {
      try {
        switch (operation.type) {
          case 'create':
            await this.createForm(operation.data, true); // Skip queue on retry
            break;
          case 'update':
            await this.updateForm(operation.formId, operation.data, true);
            break;
          case 'delete':
            await this.deleteForm(operation.formId, true);
            break;
        }
        processedIds.push(operation.timestamp);
      } catch (error) {
        console.error('Error processing queued operation:', error);
        // Keep failed operations in queue
      }
    }

    // Remove processed operations
    const newQueue = queue.filter(op => !processedIds.includes(op.timestamp));
    localStorage.setItem(this.STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(newQueue));

    console.log(`Sync complete. ${processedIds.length} operations synced, ${newQueue.length} remaining.`);
  }

  // ========== FORM CRUD OPERATIONS ==========

  /**
   * Get all forms as object (DataService compatibility)
   * @returns {Promise<Object>} Forms indexed by ID
   */
  async getAllFormsObject() {
    try {
      if (this.isOnline) {
        const response = await ApiClient.get(API_ENDPOINTS.forms.list);

        // Convert array to object
        const formsMap = {};
        response.forms.forEach(form => {
          formsMap[form.id] = form;
        });
        this.updateFormsCache(formsMap);

        return formsMap;
      } else {
        return this.getFormsCache();
      }
    } catch (error) {
      console.warn('API call failed, using cache:', error);
      return this.getFormsCache();
    }
  }

  /**
   * Get all forms
   * @returns {Promise<Array>} Array of forms
   */
  async getAllForms() {
    try {
      if (this.isOnline) {
        const response = await ApiClient.get(API_ENDPOINTS.forms.list);

        // Update cache with API data
        const formsMap = {};
        response.forms.forEach(form => {
          formsMap[form.id] = form;
        });
        this.updateFormsCache(formsMap);

        return response.forms;
      } else {
        // Offline: return from cache
        const cache = this.getFormsCache();
        return Object.values(cache).sort((a, b) =>
          new Date(b.updatedAt) - new Date(a.updatedAt)
        );
      }
    } catch (error) {
      console.warn('API call failed, using cache:', error);
      // Fallback to cache on error
      const cache = this.getFormsCache();
      return Object.values(cache).sort((a, b) =>
        new Date(b.updatedAt) - new Date(a.updatedAt)
      );
    }
  }

  /**
   * Get forms as sorted array (DataService compatibility alias)
   * @returns {Promise<Array>} Array of forms sorted by updatedAt
   */
  async getFormsArray() {
    return this.getAllForms();
  }

  /**
   * Get form by ID
   * @param {string} formId - Form ID
   * @returns {Promise<Object>} Form data
   */
  async getForm(formId) {
    try {
      if (this.isOnline) {
        const response = await ApiClient.get(API_ENDPOINTS.forms.get(formId));

        // Update cache
        this.updateFormInCache(response.form);

        return response.form;
      } else {
        // Offline: return from cache
        const cache = this.getFormsCache();
        const form = cache[formId];
        if (!form) {
          throw new Error('ไม่พบฟอร์มในโหมดออฟไลน์');
        }
        return form;
      }
    } catch (error) {
      // Fallback to cache
      const cache = this.getFormsCache();
      const form = cache[formId];
      if (form) {
        return form;
      }
      throw new Error(parseApiError(error));
    }
  }

  /**
   * Create new form
   * @param {Object} formData - Form data
   * @param {boolean} skipQueue - Skip adding to queue (used during sync)
   * @returns {Promise<Object>} Created form
   */
  async createForm(formData, skipQueue = false) {
    try {
      if (this.isOnline) {
        const response = await ApiClient.post(API_ENDPOINTS.forms.create, formData);

        // Update cache
        this.updateFormInCache(response.form);

        return response.form;
      } else {
        // Offline: save to cache and queue for sync
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const form = {
          ...formData,
          id: tempId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          _pendingSync: true
        };

        this.updateFormInCache(form);

        if (!skipQueue) {
          this.addToSyncQueue({
            type: 'create',
            data: formData
          });
        }

        return form;
      }
    } catch (error) {
      const message = parseApiError(error);
      throw new Error(message);
    }
  }

  /**
   * Update existing form
   * @param {string} formId - Form ID
   * @param {Object} updates - Form updates
   * @param {boolean} skipQueue - Skip adding to queue
   * @returns {Promise<Object>} Updated form
   */
  async updateForm(formId, updates, skipQueue = false) {
    try {
      if (this.isOnline) {
        const response = await ApiClient.put(API_ENDPOINTS.forms.update(formId), updates);

        // Update cache
        this.updateFormInCache(response.form);

        return response.form;
      } else {
        // Offline: update cache and queue for sync
        const cache = this.getFormsCache();
        const existingForm = cache[formId];

        if (!existingForm) {
          throw new Error('ไม่พบฟอร์มที่ต้องการแก้ไข');
        }

        const updatedForm = {
          ...existingForm,
          ...updates,
          updatedAt: new Date().toISOString(),
          _pendingSync: true
        };

        this.updateFormInCache(updatedForm);

        if (!skipQueue) {
          this.addToSyncQueue({
            type: 'update',
            formId,
            data: updates
          });
        }

        return updatedForm;
      }
    } catch (error) {
      const message = parseApiError(error);
      throw new Error(message);
    }
  }

  /**
   * Delete form
   * @param {string} formId - Form ID
   * @param {boolean} skipQueue - Skip adding to queue
   * @returns {Promise<boolean>} Success status
   */
  async deleteForm(formId, skipQueue = false) {
    try {
      if (this.isOnline) {
        await ApiClient.delete(API_ENDPOINTS.forms.delete(formId));

        // Remove from cache
        this.removeFormFromCache(formId);

        return true;
      } else {
        // Offline: remove from cache and queue for sync
        this.removeFormFromCache(formId);

        if (!skipQueue) {
          this.addToSyncQueue({
            type: 'delete',
            formId
          });
        }

        return true;
      }
    } catch (error) {
      const message = parseApiError(error);
      throw new Error(message);
    }
  }

  // ========== UTILITY METHODS ==========

  /**
   * Check if form has pending sync
   * @param {string} formId - Form ID
   * @returns {boolean}
   */
  hasPendingSync(formId) {
    const cache = this.getFormsCache();
    const form = cache[formId];
    return form?._pendingSync === true;
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
    await this.getAllForms(); // Refresh cache
  }

  /**
   * Clear cache
   */
  clearCache() {
    localStorage.removeItem(this.STORAGE_KEYS.FORMS_CACHE);
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
    const cache = this.getFormsCache();
    const queue = this.getSyncQueue();

    return {
      totalForms: Object.keys(cache).length,
      pendingSyncs: queue.length,
      lastSync: localStorage.getItem(this.STORAGE_KEYS.LAST_SYNC),
      cacheSize: JSON.stringify(cache).length
    };
  }
}

// Create singleton instance
const formService = new FormService();
export default formService;