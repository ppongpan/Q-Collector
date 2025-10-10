/**
 * File Service - API-based File Management with MinIO
 *
 * ✅ NEW VERSION - Uses backend MinIO API
 *
 * Features:
 * - Upload files to MinIO via backend API
 * - Download files with presigned URLs
 * - Progress tracking for uploads
 * - File type validation
 * - Size limit checks
 * - Metadata caching (not file content)
 *
 * Migration from old FileService:
 * - saveFile() → uploadFile()
 * - getFile() → getFileWithUrl()
 * - deleteFile() → deleteFile() (same name, different implementation)
 */

import apiClient from './ApiClient';

class FileServiceAPI {
  constructor() {
    this.MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    this.ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    this.ALLOWED_FILE_TYPES = [
      ...this.ALLOWED_IMAGE_TYPES,
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
      // Archives
      'application/zip',
      'application/x-zip-compressed',
      'application/x-rar-compressed',
      // CAD/Design Files
      'application/acad',
      'application/x-acad',
      'application/autocad_dwg',
      'image/vnd.dwg',
      'image/x-dwg',
      'application/dwg',
      'application/x-dwg',
      'application/vnd.sketchup.skp',
      'application/sketchup',
      'model/vnd.sketchup.skp',
      'application/octet-stream'
    ];

    // Metadata cache (lightweight - no file content)
    this.CACHE_KEY = 'qcollector_file_metadata_cache';
  }

  // ========== FILE VALIDATION ==========

  /**
   * Validate file before upload
   * @param {File} file - File object
   * @param {string} fieldType - Field type (file_upload or image_upload)
   * @returns {Object} Validation result
   */
  validateFile(file, fieldType = 'file_upload') {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `ไฟล์ใหญ่เกินไป ขนาดสูงสุด ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`
      };
    }

    // Check file type
    if (fieldType === 'image_upload') {
      if (!this.ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return {
          valid: false,
          error: 'ชนิดไฟล์ไม่ถูกต้อง กรุณาอัพโหลดไฟล์รูปภาพเท่านั้น'
        };
      }
    } else {
      if (!this.ALLOWED_FILE_TYPES.includes(file.type)) {
        return {
          valid: false,
          error: `ชนิดไฟล์ ${file.type} ไม่ได้รับอนุญาต`
        };
      }
    }

    return { valid: true };
  }

  // ========== UPLOAD OPERATIONS ==========

  /**
   * Upload single file to MinIO via API
   * @param {File} file - File object
   * @param {string} submissionId - Submission ID (optional)
   * @param {string} fieldId - Field ID (optional)
   * @param {Function} onProgress - Progress callback (0-100)
   * @returns {Promise<Object>} Upload result with file metadata
   */
  async uploadFile(file, submissionId = null, fieldId = null, onProgress = null) {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      if (onProgress) onProgress(10);

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      if (submissionId) formData.append('submissionId', submissionId);
      if (fieldId) formData.append('fieldId', fieldId);

      if (onProgress) onProgress(20);

      // Upload to backend
      const response = await apiClient.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = 20 + Math.round((progressEvent.loaded * 70) / progressEvent.total);
            onProgress(percentCompleted);
          }
        }
      });

      if (onProgress) onProgress(95);

      // Cache metadata
      if (response.data?.file) {
        this.cacheFileMetadata(response.data.file.id, response.data.file);
      }

      if (onProgress) onProgress(100);

      return {
        success: true,
        file: response.data.file
      };

    } catch (error) {
      console.error('Error uploading file:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message || 'เกิดข้อผิดพลาดในการอัพโหลดไฟล์'
      };
    }
  }

  /**
   * Upload multiple files
   * @param {FileList|Array} files - Files to upload
   * @param {string} submissionId - Submission ID
   * @param {string} fieldId - Field ID
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Array>} Upload results
   */
  async uploadMultipleFiles(files, submissionId = null, fieldId = null, onProgress = null) {
    const results = [];
    const totalFiles = files.length;

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      const fileProgress = (progress) => {
        if (onProgress) {
          const totalProgress = ((i * 100) + progress) / totalFiles;
          onProgress(totalProgress);
        }
      };

      const result = await this.uploadFile(file, submissionId, fieldId, fileProgress);
      results.push(result);
    }

    return results;
  }

  // ========== DOWNLOAD/RETRIEVE OPERATIONS ==========

  /**
   * Get file metadata and presigned URL
   * @param {string} fileId - File ID
   * @param {number} expirySeconds - URL expiry time (default 3600)
   * @returns {Promise<Object>} File metadata with presigned URL
   */
  async getFileWithUrl(fileId, expirySeconds = 3600) {
    try {
      const response = await apiClient.get(`/files/${fileId}`, {
        params: { expiry: expirySeconds }
      });

      // Cache metadata
      if (response.data?.file) {
        this.cacheFileMetadata(fileId, response.data.file);
      }

      return response.data.file;
    } catch (error) {
      console.error('Error getting file:', error);
      throw error;
    }
  }

  /**
   * Download file directly
   * @param {string} fileId - File ID
   * @returns {Promise<Blob>} File blob
   */
  async downloadFile(fileId) {
    try {
      const response = await apiClient.get(`/files/${fileId}/download`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  /**
   * Get file metadata from cache
   * @param {string} fileId - File ID
   * @returns {Object|null} Cached metadata
   */
  getFileCached(fileId) {
    try {
      const cache = this.getMetadataCache();
      return cache[fileId] || null;
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  }

  // ========== DELETE OPERATIONS ==========

  /**
   * Delete file
   * @param {string} fileId - File ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(fileId) {
    try {
      await apiClient.delete(`/files/${fileId}`);

      // Remove from cache
      this.removeCachedMetadata(fileId);

      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  // ========== LIST/QUERY OPERATIONS ==========

  /**
   * List files with filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Paginated file list
   */
  async listFiles(filters = {}) {
    try {
      const response = await apiClient.get('/files', {
        params: filters
      });
      return response.data;
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  /**
   * Get files by submission ID
   * @param {string} submissionId - Submission ID
   * @returns {Promise<Array>} File list
   */
  async getSubmissionFiles(submissionId) {
    try {
      const response = await this.listFiles({ submissionId, limit: 100 });
      return response.files || [];
    } catch (error) {
      console.error('Error getting submission files:', error);
      return [];
    }
  }

  /**
   * Get file statistics
   * @returns {Promise<Object>} File statistics
   */
  async getFileStatistics() {
    try {
      const response = await apiClient.get('/files/stats/summary');
      return response.data.statistics;
    } catch (error) {
      console.error('Error getting statistics:', error);
      throw error;
    }
  }

  // ========== METADATA CACHE MANAGEMENT ==========

  /**
   * Get metadata cache
   * @private
   * @returns {Object} Cached metadata
   */
  getMetadataCache() {
    try {
      const cache = localStorage.getItem(this.CACHE_KEY);
      return cache ? JSON.parse(cache) : {};
    } catch (error) {
      console.error('Error reading metadata cache:', error);
      return {};
    }
  }

  /**
   * Cache file metadata
   * @private
   * @param {string} fileId - File ID
   * @param {Object} metadata - File metadata
   */
  cacheFileMetadata(fileId, metadata) {
    try {
      const cache = this.getMetadataCache();
      cache[fileId] = {
        ...metadata,
        cachedAt: new Date().toISOString()
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Error caching metadata:', error);
    }
  }

  /**
   * Remove cached metadata
   * @private
   * @param {string} fileId - File ID
   */
  removeCachedMetadata(fileId) {
    try {
      const cache = this.getMetadataCache();
      delete cache[fileId];
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Error removing cached metadata:', error);
    }
  }

  /**
   * Clear all cached metadata
   */
  clearCache() {
    try {
      localStorage.removeItem(this.CACHE_KEY);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  // ========== UTILITY METHODS ==========

  /**
   * Format file size to human readable
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Check if file is image
   * @param {string} mimeType - File MIME type
   * @returns {boolean} Is image
   */
  isImage(mimeType) {
    return this.ALLOWED_IMAGE_TYPES.includes(mimeType);
  }

  /**
   * Get file extension
   * @param {string} filename - File name
   * @returns {string} File extension
   */
  getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
  }
}

// Create singleton instance
const fileServiceAPI = new FileServiceAPI();
export default fileServiceAPI;

// Export class for testing
export { FileServiceAPI };
