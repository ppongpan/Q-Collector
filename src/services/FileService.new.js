/**
 * File Service - File Management with MinIO Integration
 *
 * Features:
 * - API-first approach (MinIO via backend)
 * - No more localStorage for file storage
 * - Progress tracking for uploads
 * - File type validation
 * - Size limit checks
 * - Presigned URL support for downloads
 * - Offline file metadata cache (not file content)
 */

import ApiClient from './ApiClient';
import { API_ENDPOINTS } from '../config/api.config';
import { parseApiError, formatFileSize } from '../utils/apiHelpers';

class FileService {
  constructor() {
    this.STORAGE_KEYS = {
      FILE_METADATA_CACHE: 'qcollector_file_metadata_cache'
    };

    this.DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    this.ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    this.ALLOWED_FILE_TYPES = [
      ...this.ALLOWED_IMAGE_TYPES,
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv'
    ];
  }

  // ========== FILE METADATA CACHE ==========

  /**
   * Get file metadata from cache
   * @returns {Object} Cached file metadata
   */
  getFileMetadataCache() {
    try {
      const cache = localStorage.getItem(this.STORAGE_KEYS.FILE_METADATA_CACHE);
      return cache ? JSON.parse(cache) : {};
    } catch (error) {
      console.error('Error reading file metadata cache:', error);
      return {};
    }
  }

  /**
   * Update file metadata cache
   * @param {string} fileId - File ID
   * @param {Object} metadata - File metadata
   */
  updateFileMetadataCache(fileId, metadata) {
    try {
      const cache = this.getFileMetadataCache();
      cache[fileId] = {
        ...metadata,
        cachedAt: new Date().toISOString()
      };
      localStorage.setItem(this.STORAGE_KEYS.FILE_METADATA_CACHE, JSON.stringify(cache));
    } catch (error) {
      console.error('Error updating file metadata cache:', error);
    }
  }

  /**
   * Remove file metadata from cache
   * @param {string} fileId - File ID
   */
  removeFileMetadataFromCache(fileId) {
    try {
      const cache = this.getFileMetadataCache();
      delete cache[fileId];
      localStorage.setItem(this.STORAGE_KEYS.FILE_METADATA_CACHE, JSON.stringify(cache));
    } catch (error) {
      console.error('Error removing file metadata from cache:', error);
    }
  }

  // ========== FILE VALIDATION ==========

  /**
   * Validate file before upload
   * @param {File} file - File to validate
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  validateFile(file, options = {}) {
    const maxSize = options.maxFileSize || this.DEFAULT_MAX_FILE_SIZE;
    const allowedTypes = options.allowedTypes || this.ALLOWED_FILE_TYPES;
    const isImage = options.isImage || false;

    const errors = [];

    // Check file size
    if (file.size > maxSize) {
      errors.push(`ไฟล์ใหญ่เกินไป (${formatFileSize(file.size)} > ${formatFileSize(maxSize)})`);
    }

    // Check file type
    if (isImage) {
      if (!this.ALLOWED_IMAGE_TYPES.includes(file.type)) {
        errors.push(`ไฟล์ต้องเป็นรูปภาพเท่านั้น (jpeg, png, gif, webp)`);
      }
    } else {
      if (!allowedTypes.includes(file.type) && !allowedTypes.includes('*/*')) {
        errors.push(`ไฟล์ประเภทนี้ไม่รองรับ (${file.type})`);
      }
    }

    // Check file name
    if (!file.name || file.name.length > 255) {
      errors.push('ชื่อไฟล์ไม่ถูกต้อง');
    }

    return {
      isValid: errors.length === 0,
      errors,
      file: {
        name: file.name,
        size: file.size,
        type: file.type
      }
    };
  }

  // ========== FILE UPLOAD ==========

  /**
   * Upload file to MinIO (via backend API)
   * @param {File} file - File to upload
   * @param {Object} options - Upload options
   * @param {Function} onProgress - Progress callback (percent)
   * @returns {Promise<Object>} Upload result with file ID and URL
   */
  async uploadFile(file, options = {}, onProgress = null) {
    // Validate file first
    const validation = this.validateFile(file, options);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);

      if (options.fieldId) {
        formData.append('fieldId', options.fieldId);
      }
      if (options.formId) {
        formData.append('formId', options.formId);
      }
      if (options.submissionId) {
        formData.append('submissionId', options.submissionId);
      }

      // Upload with progress tracking
      const response = await ApiClient.upload(
        API_ENDPOINTS.files.upload,
        formData,
        onProgress
      );

      // Cache metadata
      this.updateFileMetadataCache(response.file.id, {
        id: response.file.id,
        name: file.name,
        size: file.size,
        type: file.type,
        url: response.file.url,
        uploadedAt: new Date().toISOString()
      });

      return response.file;
    } catch (error) {
      const message = parseApiError(error);
      throw new Error(message);
    }
  }

  /**
   * Upload multiple files
   * @param {FileList|Array} files - Files to upload
   * @param {Object} options - Upload options
   * @param {Function} onProgress - Overall progress callback
   * @returns {Promise<Array>} Array of upload results
   */
  async uploadFiles(files, options = {}, onProgress = null) {
    const fileArray = Array.from(files);
    const results = [];
    let completedCount = 0;

    for (const file of fileArray) {
      try {
        const result = await this.uploadFile(file, options, (percent) => {
          // Calculate overall progress
          const fileProgress = percent / fileArray.length;
          const totalProgress = ((completedCount / fileArray.length) * 100) + fileProgress;

          if (onProgress) {
            onProgress(Math.round(totalProgress));
          }
        });

        results.push({ success: true, file: result });
        completedCount++;
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          fileName: file.name
        });
      }
    }

    return results;
  }

  // ========== FILE DOWNLOAD ==========

  /**
   * Get file download URL (presigned URL from MinIO)
   * @param {string} fileId - File ID
   * @returns {Promise<string>} Download URL
   */
  async getFileUrl(fileId) {
    try {
      // Check cache first
      const cache = this.getFileMetadataCache();
      const cached = cache[fileId];

      if (cached && cached.url) {
        // Check if URL is still valid (presigned URLs expire)
        // For now, always fetch fresh URL from API
      }

      const response = await ApiClient.get(API_ENDPOINTS.files.get(fileId));

      // Update cache
      this.updateFileMetadataCache(fileId, {
        id: fileId,
        url: response.url,
        ...response.metadata
      });

      return response.url;
    } catch (error) {
      // Try cache as fallback
      const cache = this.getFileMetadataCache();
      const cached = cache[fileId];

      if (cached && cached.url) {
        console.warn('Using cached file URL (may be expired)');
        return cached.url;
      }

      const message = parseApiError(error);
      throw new Error(message);
    }
  }

  /**
   * Download file
   * @param {string} fileId - File ID
   * @param {string} fileName - File name for download
   * @returns {Promise<void>}
   */
  async downloadFile(fileId, fileName) {
    try {
      const url = await this.getFileUrl(fileId);

      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'download';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      const message = parseApiError(error);
      throw new Error(message);
    }
  }

  // ========== FILE DELETION ==========

  /**
   * Delete file from MinIO
   * @param {string} fileId - File ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(fileId) {
    try {
      await ApiClient.delete(API_ENDPOINTS.files.delete(fileId));

      // Remove from cache
      this.removeFileMetadataFromCache(fileId);

      return true;
    } catch (error) {
      const message = parseApiError(error);
      throw new Error(message);
    }
  }

  /**
   * Delete multiple files
   * @param {Array<string>} fileIds - Array of file IDs
   * @returns {Promise<Array>} Array of deletion results
   */
  async deleteFiles(fileIds) {
    const results = [];

    for (const fileId of fileIds) {
      try {
        await this.deleteFile(fileId);
        results.push({ success: true, fileId });
      } catch (error) {
        results.push({
          success: false,
          fileId,
          error: error.message
        });
      }
    }

    return results;
  }

  // ========== STORAGE INFO ==========

  /**
   * Get storage usage information
   * NOTE: This now returns server-side storage usage, not localStorage
   * @returns {Promise<Object>} Storage usage info
   */
  async getStorageUsage() {
    try {
      const response = await ApiClient.get('/api/storage/usage');

      return {
        totalFiles: response.totalFiles || 0,
        totalSizeBytes: response.totalSizeBytes || 0,
        totalSizeMB: (response.totalSizeBytes / (1024 * 1024)).toFixed(2),
        maxStorageMB: response.maxStorageMB || 100,
        availableSpaceMB: response.availableSpaceMB || 0,
        isNearLimit: response.usagePercent > 80
      };
    } catch (error) {
      console.error('Error fetching storage usage:', error);

      // Return mock data if offline
      return {
        totalFiles: 0,
        totalSizeBytes: 0,
        totalSizeMB: '0.00',
        maxStorageMB: 100,
        availableSpaceMB: 100,
        isNearLimit: false,
        _offline: true
      };
    }
  }

  // ========== IMAGE COMPRESSION (Client-side) ==========

  /**
   * Compress image before upload
   * @param {File} file - Image file
   * @param {Object} options - Compression options
   * @returns {Promise<File>} Compressed image file
   */
  async compressImage(file, options = {}) {
    const maxWidth = options.maxWidth || 1920;
    const maxHeight = options.maxHeight || 1080;
    const quality = options.quality || 0.8;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            },
            'image/jpeg',
            quality
          );
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  // ========== UTILITY METHODS ==========

  /**
   * Clear file metadata cache
   */
  clearCache() {
    localStorage.removeItem(this.STORAGE_KEYS.FILE_METADATA_CACHE);
  }

  /**
   * Get statistics
   * @returns {Object} Cache statistics
   */
  getStatistics() {
    const cache = this.getFileMetadataCache();

    return {
      cachedFiles: Object.keys(cache).length,
      cacheSize: JSON.stringify(cache).length
    };
  }
}

// Create singleton instance
const fileService = new FileService();
export default fileService;