/**
 * File Storage Service - DEPRECATED
 *
 * ⚠️ DEPRECATED - DO NOT USE IN NEW CODE ⚠️
 *
 * This service uses localStorage for file storage and is being phased out.
 * All components should use FileService.api.js (MinIO-based) instead.
 *
 * Migration Guide:
 * - saveFile() → fileServiceAPI.uploadFile()
 * - saveMultipleFiles() → fileServiceAPI.uploadMultipleFiles()
 * - getFile() → fileServiceAPI.getFileWithUrl()
 * - getSubmissionFiles() → fileServiceAPI.getSubmissionFiles()
 * - deleteFile() → fileServiceAPI.deleteFile()
 *
 * See: src/services/FileService.api.js
 *
 * This service will be removed in v0.8.0
 */

class FileService {
  static FILE_STORAGE_KEY = 'q_collector_files';
  static MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  static IMAGE_COMPRESSION_QUALITY = 0.8;
  static IMAGE_MAX_WIDTH = 1920;
  static IMAGE_MAX_HEIGHT = 1080;

  /**
   * Log deprecation warning
   * @private
   */
  static _logDeprecationWarning(method) {
    console.warn(
      `%c⚠️ DEPRECATED: FileService.${method}`,
      'color: #f97316; font-weight: bold; font-size: 12px;',
      '\n📝 FileService (localStorage) is deprecated and will be removed in v0.8.0',
      '\n✅ Use fileServiceAPI (MinIO) instead',
      '\n📖 See migration guide in FileService.js header'
    );
  }

  /**
   * บันทึกไฟล์ลง localStorage
   * @deprecated Use fileServiceAPI.uploadFile() instead
   * @param {File} file - ไฟล์ที่จะบันทึก
   * @param {string} fieldId - ID ของ field
   * @param {string} submissionId - ID ของ submission
   * @param {Function} onProgress - callback สำหรับ progress (0-100)
   * @returns {Promise<Object>} ข้อมูลไฟล์ที่บันทึกแล้ว
   */
  static async saveFile(file, fieldId, submissionId, onProgress = null) {
    this._logDeprecationWarning('saveFile() - Use fileServiceAPI.uploadFile()');
    try {
      // ตรวจสอบขนาดไฟล์
      if (file.size > this.MAX_FILE_SIZE) {
        throw new Error(`ไฟล์ใหญ่เกินไป ขนาดสูงสุด ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`);
      }

      if (onProgress) onProgress(10);

      const fileId = this.generateFileId(fieldId, submissionId, file.name);
      const isImage = file.type.startsWith('image/');

      let fileData;
      if (isImage) {
        // Compress และ resize รูปภาพ
        fileData = await this.compressImage(file, onProgress);
      } else {
        // แปลงไฟล์ทั่วไปเป็น base64
        fileData = await this.fileToBase64(file);
      }

      if (onProgress) onProgress(80);

      // ตรวจสอบพื้นที่ storage ก่อนบันทึก
      const currentUsage = this.getStorageUsage();
      const estimatedFileSize = fileData.length / (1024 * 1024); // MB

      console.log(`Current storage: ${currentUsage.totalSizeMB}MB, File size: ${estimatedFileSize.toFixed(2)}MB`);

      // ถ้าพื้นที่ไม่พอ ลองทำความสะอาดไฟล์เก่า
      if (parseFloat(currentUsage.totalSizeMB) + estimatedFileSize > 7) {
        console.log('Storage space running low, cleaning old files...');
        const deletedCount = this.cleanOldFiles(7); // ลบไฟล์เก่ากว่า 7 วัน
        if (deletedCount > 0) {
          console.log(`Cleaned ${deletedCount} old files`);
        }
      }

      const fileInfo = {
        id: fileId,
        name: file.name,
        type: file.type,
        size: file.size,
        originalSize: file.size,
        compressedSize: fileData.length,
        data: fileData,
        fieldId,
        submissionId,
        uploadedAt: new Date().toISOString(),
        isImage
      };

      // บันทึกลง localStorage
      this.storeFileInfo(fileInfo);

      if (onProgress) onProgress(100);

      return {
        success: true,
        fileInfo: {
          id: fileId,
          name: file.name,
          type: file.type,
          size: file.size,
          compressedSize: fileData.length,
          uploadedAt: fileInfo.uploadedAt,
          isImage
        }
      };

    } catch (error) {
      console.error('Error saving file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * บันทึกหลายไฟล์พร้อมกัน
   * @deprecated Use fileServiceAPI.uploadMultipleFiles() instead
   * @param {FileList} files - รายการไฟล์
   * @param {string} fieldId - ID ของ field
   * @param {string} submissionId - ID ของ submission
   * @param {Function} onProgress - callback สำหรับ progress
   * @returns {Promise<Array>} รายการผลลัพธ์การบันทึก
   */
  static async saveMultipleFiles(files, fieldId, submissionId, onProgress = null) {
    this._logDeprecationWarning('saveMultipleFiles() - Use fileServiceAPI.uploadMultipleFiles()');
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

      const result = await this.saveFile(file, fieldId, submissionId, fileProgress);
      results.push(result);
    }

    return results;
  }

  /**
   * ดึงข้อมูลไฟล์จาก localStorage
   * @deprecated Use fileServiceAPI.getFileWithUrl() instead
   * @param {string} fileId - ID ของไฟล์
   * @returns {Object|null} ข้อมูลไฟล์
   */
  static getFile(fileId) {
    this._logDeprecationWarning('getFile() - Use fileServiceAPI.getFileWithUrl()');
    try {
      const files = this.getAllStoredFiles();
      return files[fileId] || null;
    } catch (error) {
      console.error('Error getting file:', error);
      return null;
    }
  }

  /**
   * ดึงไฟล์ทั้งหมดของ submission
   * @deprecated Use fileServiceAPI.getSubmissionFiles() instead
   * @param {string} submissionId - ID ของ submission
   * @returns {Array} รายการไฟล์
   */
  static getSubmissionFiles(submissionId) {
    this._logDeprecationWarning('getSubmissionFiles() - Use fileServiceAPI.getSubmissionFiles()');
    try{
      const files = this.getAllStoredFiles();
      return Object.values(files).filter(file => file.submissionId === submissionId);
    } catch (error) {
      console.error('Error getting submission files:', error);
      return [];
    }
  }

  /**
   * ดึงไฟล์ของ field ใน submission
   * @param {string} fieldId - ID ของ field
   * @param {string} submissionId - ID ของ submission
   * @returns {Array} รายการไฟล์
   */
  static getFieldFiles(fieldId, submissionId) {
    try {
      const files = this.getAllStoredFiles();
      return Object.values(files).filter(file =>
        file.fieldId === fieldId && file.submissionId === submissionId
      );
    } catch (error) {
      console.error('Error getting field files:', error);
      return [];
    }
  }

  /**
   * ลบไฟล์
   * @deprecated Use fileServiceAPI.deleteFile() instead
   * @param {string} fileId - ID ของไฟล์
   * @returns {boolean} ผลลัพธ์การลบ
   */
  static deleteFile(fileId) {
    this._logDeprecationWarning('deleteFile() - Use fileServiceAPI.deleteFile()');
    try {
      const files = this.getAllStoredFiles();
      if (files[fileId]) {
        delete files[fileId];
        localStorage.setItem(this.FILE_STORAGE_KEY, JSON.stringify(files));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * ลบไฟล์ทั้งหมดของ submission
   * @param {string} submissionId - ID ของ submission
   * @returns {number} จำนวนไฟล์ที่ลบ
   */
  static deleteSubmissionFiles(submissionId) {
    try {
      const files = this.getAllStoredFiles();
      let deletedCount = 0;

      Object.keys(files).forEach(fileId => {
        if (files[fileId].submissionId === submissionId) {
          delete files[fileId];
          deletedCount++;
        }
      });

      localStorage.setItem(this.FILE_STORAGE_KEY, JSON.stringify(files));
      return deletedCount;
    } catch (error) {
      console.error('Error deleting submission files:', error);
      return 0;
    }
  }

  /**
   * สร้าง download URL จาก base64
   * @param {string} fileId - ID ของไฟล์
   * @returns {string|null} URL สำหรับดาวน์โหลด
   */
  static createDownloadUrl(fileId) {
    try {
      const file = this.getFile(fileId);
      if (!file) return null;

      const byteCharacters = atob(file.data.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);

      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: file.type });

      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error creating download URL:', error);
      return null;
    }
  }

  /**
   * ดาวน์โหลดไฟล์
   * @param {string} fileId - ID ของไฟล์
   * @returns {boolean} ผลลัพธ์การดาวน์โหลด
   */
  static downloadFile(fileId) {
    try {
      const file = this.getFile(fileId);
      if (!file) return false;

      const url = this.createDownloadUrl(fileId);
      if (!url) return false;

      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // ปลดปล่อย URL object
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      return true;
    } catch (error) {
      console.error('Error downloading file:', error);
      return false;
    }
  }

  /**
   * ได้ข้อมูลสถิติการใช้งาน storage
   * @returns {Object} ข้อมูลสถิติ
   */
  static getStorageStats() {
    try {
      const files = this.getAllStoredFiles();
      const fileCount = Object.keys(files).length;
      let totalSize = 0;
      let totalCompressedSize = 0;
      let imageCount = 0;

      Object.values(files).forEach(file => {
        totalSize += file.size;
        totalCompressedSize += file.compressedSize;
        if (file.isImage) imageCount++;
      });

      const storageUsed = JSON.stringify(files).length;
      const storageLimit = 10 * 1024 * 1024; // 10MB localStorage limit (approximate)

      return {
        fileCount,
        imageCount,
        totalSize,
        totalCompressedSize,
        compressionRatio: totalSize > 0 ? (totalCompressedSize / totalSize) : 0,
        storageUsed,
        storageLimit,
        storageUsedPercent: (storageUsed / storageLimit) * 100
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return null;
    }
  }

  // === Helper Methods ===

  /**
   * แปลงไฟล์เป็น base64
   * @param {File} file - ไฟล์
   * @returns {Promise<string>} base64 string
   */
  static fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Compress รูปภาพ
   * @param {File} file - ไฟล์รูปภาพ
   * @param {Function} onProgress - callback สำหรับ progress
   * @returns {Promise<string>} base64 string ที่ compress แล้ว
   */
  static compressImage(file, onProgress = null) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          if (onProgress) onProgress(30);

          // คำนวณขนาดใหม่
          let { width, height } = img;

          if (width > this.IMAGE_MAX_WIDTH || height > this.IMAGE_MAX_HEIGHT) {
            const ratio = Math.min(
              this.IMAGE_MAX_WIDTH / width,
              this.IMAGE_MAX_HEIGHT / height
            );
            width *= ratio;
            height *= ratio;
          }

          canvas.width = width;
          canvas.height = height;

          if (onProgress) onProgress(50);

          // วาดรูปภาพ
          ctx.drawImage(img, 0, 0, width, height);

          if (onProgress) onProgress(70);

          // แปลงเป็น base64 พร้อม compression
          const compressedData = canvas.toDataURL(file.type, this.IMAGE_COMPRESSION_QUALITY);
          resolve(compressedData);

        } catch (error) {
          reject(error);
        }
      };

      img.onerror = reject;

      // อ่านไฟล์เป็น URL
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * สร้าง ID สำหรับไฟล์
   * @param {string} fieldId - ID ของ field
   * @param {string} submissionId - ID ของ submission
   * @param {string} fileName - ชื่อไฟล์
   * @returns {string} File ID
   */
  static generateFileId(fieldId, submissionId, fileName) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${submissionId}_${fieldId}_${timestamp}_${random}`;
  }

  /**
   * ดึงไฟล์ทั้งหมดจาก localStorage
   * @returns {Object} Object ของไฟล์ทั้งหมด
   */
  static getAllStoredFiles() {
    try {
      const stored = localStorage.getItem(this.FILE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error getting stored files:', error);
      return {};
    }
  }

  /**
   * บันทึกข้อมูลไฟล์ลง localStorage
   * @param {Object} fileInfo - ข้อมูลไฟล์
   */
  static storeFileInfo(fileInfo) {
    try {
      const files = this.getAllStoredFiles();
      files[fileInfo.id] = fileInfo;

      // ตรวจสอบขนาดข้อมูลก่อนบันทึก
      const dataToStore = JSON.stringify(files);
      const dataSizeInMB = (dataToStore.length / (1024 * 1024)).toFixed(2);

      console.log(`Attempting to store ${dataSizeInMB}MB of file data`);

      // ตรวจสอบว่าข้อมูลใหญ่เกินไปหรือไม่ (localStorage limit ประมาณ 5-10MB)
      if (dataToStore.length > 8 * 1024 * 1024) { // 8MB limit
        throw new Error(`ข้อมูลไฟล์มีขนาดใหญ่เกินไป (${dataSizeInMB}MB) ขีดจำกัด localStorage คือ 8MB`);
      }

      localStorage.setItem(this.FILE_STORAGE_KEY, dataToStore);
      console.log(`Successfully stored ${dataSizeInMB}MB of file data`);

    } catch (error) {
      console.error('Error storing file info:', error);

      // ตรวจสอบประเภทของ error
      if (error.name === 'QuotaExceededError' || error.code === 22) {
        throw new Error(`พื้นที่จัดเก็บไฟล์เต็ม ไม่สามารถบันทึกไฟล์ได้ กรุณาลบไฟล์เก่าออกหรือใช้ไฟล์ขนาดเล็กกว่า`);
      } else {
        throw new Error(`ไม่สามารถบันทึกไฟล์ได้: ${error.message}`);
      }
    }
  }

  /**
   * ตรวจสอบขนาดการใช้งาน localStorage
   * @param {number} maxStorageSize - ขนาดพื้นที่สูงสุด (MB) - default 8MB
   * @param {number} warningThreshold - ขีดเตือน (MB) - default 6MB
   * @returns {Object} ข้อมูลการใช้งาน storage
   */
  static getStorageUsage(maxStorageSize = 8, warningThreshold = 6) {
    try {
      const files = this.getAllStoredFiles();
      const dataSize = JSON.stringify(files).length;
      const dataSizeInMB = (dataSize / (1024 * 1024)).toFixed(2);
      const fileCount = Object.keys(files).length;

      return {
        totalFiles: fileCount,
        totalSizeBytes: dataSize,
        totalSizeMB: dataSizeInMB,
        availableSpaceMB: (maxStorageSize - parseFloat(dataSizeInMB)).toFixed(2),
        isNearLimit: parseFloat(dataSizeInMB) > warningThreshold
      };
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return {
        totalFiles: 0,
        totalSizeBytes: 0,
        totalSizeMB: '0.00',
        availableSpaceMB: maxStorageSize.toFixed(2),
        isNearLimit: false
      };
    }
  }

  /**
   * ลบไฟล์เก่าเพื่อเพิ่มพื้นที่ storage
   * @param {number} daysOld - ลบไฟล์ที่เก่ากว่ากี่วัน (default: 7 วัน)
   * @returns {number} จำนวนไฟล์ที่ลบ
   */
  static cleanOldFiles(daysOld = 7) {
    try {
      const files = this.getAllStoredFiles();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      let deletedCount = 0;
      Object.keys(files).forEach(fileId => {
        const file = files[fileId];
        if (file.uploadedAt && new Date(file.uploadedAt) < cutoffDate) {
          delete files[fileId];
          deletedCount++;
        }
      });

      if (deletedCount > 0) {
        localStorage.setItem(this.FILE_STORAGE_KEY, JSON.stringify(files));
        console.log(`Cleaned ${deletedCount} old files from storage`);
      }

      return deletedCount;
    } catch (error) {
      console.error('Error cleaning old files:', error);
      return 0;
    }
  }

  /**
   * ตรวจสอบว่าเป็นไฟล์รูปภาพหรือไม่
   * @param {string} type - MIME type ของไฟล์
   * @returns {boolean}
   */
  static isImageFile(type) {
    return type.startsWith('image/');
  }

  /**
   * ล้างไฟล์ที่เก่าเกินกำหนด (cleanup)
   * @param {number} daysOld - จำนวนวันที่เก่า (default: 30)
   * @returns {number} จำนวนไฟล์ที่ลบ
   */
  static cleanupOldFiles(daysOld = 30) {
    try {
      const files = this.getAllStoredFiles();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      let deletedCount = 0;

      Object.keys(files).forEach(fileId => {
        const file = files[fileId];
        const uploadDate = new Date(file.uploadedAt);

        if (uploadDate < cutoffDate) {
          delete files[fileId];
          deletedCount++;
        }
      });

      if (deletedCount > 0) {
        localStorage.setItem(this.FILE_STORAGE_KEY, JSON.stringify(files));
      }

      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old files:', error);
      return 0;
    }
  }
}

export default FileService;