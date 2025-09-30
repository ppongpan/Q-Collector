/**
 * SubmissionService.js - Form Submission Processing for Q-Collector
 *
 * Features:
 * - Form submission processing and validation
 * - Field validation (required fields, data types)
 * - File upload handling (browser File API)
 * - GPS data processing (browser Geolocation API)
 * - Document number generation
 * - Data formatting and sanitization
 * - Telegram notification processing
 */

import dataService from './DataService.js';
import telegramService from './TelegramService.js';

class SubmissionService {
  constructor() {
    this.FIELD_TYPES = {
      SHORT_ANSWER: 'short_answer',
      PARAGRAPH: 'paragraph',
      EMAIL: 'email',
      PHONE: 'phone',
      NUMBER: 'number',
      URL: 'url',
      FILE_UPLOAD: 'file_upload',
      IMAGE_UPLOAD: 'image_upload',
      DATE: 'date',
      TIME: 'time',
      DATETIME: 'datetime',
      MULTIPLE_CHOICE: 'multiple_choice',
      RATING: 'rating',
      SLIDER: 'slider',
      LAT_LONG: 'lat_long',
      PROVINCE: 'province',
      FACTORY: 'factory'
    };

    this.VALIDATION_PATTERNS = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^[0-9]{10}$/,
      url: /^(https?:\/\/)?[^\s]+\.[^\s]+/,  // Allow URLs with or without protocol
      number: /^-?\d*\.?\d+$/
    };
  }

  // ========== FORM SUBMISSION ==========

  /**
   * Process and submit form data
   * @param {string} formId - Form ID
   * @param {Object} formData - Form field data
   * @param {Array} files - Uploaded files
   * @returns {Promise<Object>} Submission result
   */
  async submitForm(formId, formData, files = []) {
    try {
      // Get form configuration
      const form = dataService.getForm(formId);
      if (!form) {
        throw new Error(`Form with ID ${formId} not found`);
      }

      // Validate form data including files
      const validationResult = this.validateFormData(form, formData, files);
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Process uploaded files
      const processedFiles = await this.processUploadedFiles(files);

      // Process GPS data
      const processedData = await this.processGPSFields(form, formData);

      // Generate document number if configured
      const finalData = this.generateDocumentNumber(form, processedData);

      // Merge file data
      const completeData = {
        ...finalData,
        ...processedFiles
      };

      // Create submission
      const submission = dataService.createSubmission(formId, completeData);

      // Send Telegram notification if configured
      await this.sendTelegramNotification(form, submission);

      return {
        success: true,
        submission: submission,
        message: 'ฟอร์มถูกบันทึกเรียบร้อยแล้ว'
      };

    } catch (error) {
      console.error('Form submission error:', error);
      return {
        success: false,
        error: error.message,
        message: 'เกิดข้อผิดพลาดในการบันทึกฟอร์ม'
      };
    }
  }

  /**
   * Update existing form submission
   * @param {string} formId - Form ID
   * @param {string} submissionId - Submission ID to update
   * @param {Object} formData - Updated form field data
   * @param {Array} files - Uploaded files
   * @returns {Promise<Object>} Update result
   */
  async updateSubmission(formId, submissionId, formData, files = []) {
    try {
      // Check if this is a sub-form update (formId starts with "sub-")
      if (formId.startsWith('sub-')) {
        return this.updateSubFormSubmission(formId, submissionId, formData, files);
      }

      // Get form configuration
      const form = dataService.getForm(formId);
      if (!form) {
        throw new Error(`Form with ID ${formId} not found`);
      }

      // Get existing submission
      const existingSubmission = dataService.getSubmission(submissionId);
      if (!existingSubmission) {
        throw new Error(`Submission with ID ${submissionId} not found`);
      }

      // Validate form data including files and existing submission data
      const validationResult = this.validateFormData(form, formData, files, existingSubmission.data);
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Process uploaded files
      const processedFiles = await this.processUploadedFiles(files);

      // Process GPS data
      const processedData = await this.processGPSFields(form, formData);

      // Merge file data, preserving existing files if no new files for a field
      const existingFiles = {};
      form.fields.forEach(field => {
        if (field.type === this.FIELD_TYPES.FILE_UPLOAD || field.type === this.FIELD_TYPES.IMAGE_UPLOAD) {
          const hasExistingFile = existingSubmission.data[field.id];
          const hasNewFile = processedFiles[field.id];

          // Keep existing files if no new files uploaded for this field
          if (hasExistingFile && !hasNewFile) {
            existingFiles[field.id] = existingSubmission.data[field.id];
          }
        }
      });

      // Merge file data properly - only use new files if they exist, otherwise keep existing files
      const mergedFileData = { ...existingFiles };
      Object.keys(processedFiles).forEach(fieldId => {
        if (processedFiles[fieldId] && processedFiles[fieldId] !== undefined) {
          mergedFileData[fieldId] = processedFiles[fieldId];
        }
      });

      const completeData = {
        ...processedData,
        ...mergedFileData,
        // Preserve document number from original submission
        documentNumber: existingSubmission.data.documentNumber
      };

      // Update submission
      const updatedSubmission = dataService.updateSubmission(submissionId, completeData);

      return {
        success: true,
        submission: updatedSubmission,
        message: 'ข้อมูลถูกอัปเดตเรียบร้อยแล้ว'
      };

    } catch (error) {
      console.error('Submission update error:', error);
      return {
        success: false,
        error: error.message,
        message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล'
      };
    }
  }

  /**
   * Update existing sub form submission
   * @param {string} subFormId - Sub form ID
   * @param {string} subSubmissionId - Sub submission ID to update
   * @param {Object} formData - Updated form field data
   * @param {Array} files - Uploaded files
   * @returns {Promise<Object>} Update result
   */
  async updateSubFormSubmission(subFormId, subSubmissionId, formData, files = []) {
    try {
      // Get existing sub submission
      const existingSubSubmission = dataService.getSubSubmission(subSubmissionId);
      if (!existingSubSubmission) {
        throw new Error(`Sub submission with ID ${subSubmissionId} not found`);
      }

      // Get parent submission to find main form
      const parentSubmission = dataService.getSubmission(existingSubSubmission.parentSubmissionId);
      if (!parentSubmission) {
        throw new Error('Parent submission not found');
      }

      // Get main form to access sub form configuration
      const mainForm = dataService.getForm(parentSubmission.formId);
      if (!mainForm) {
        throw new Error('Main form not found');
      }

      // Find sub form configuration
      const subForm = mainForm.subForms.find(sf => sf.id === subFormId);
      if (!subForm) {
        throw new Error(`Sub form with ID ${subFormId} not found`);
      }

      // Validate sub form data
      const validationResult = this.validateSubFormData(subForm, formData);
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Process uploaded files
      const processedFiles = await this.processUploadedFiles(files);

      // Process GPS data
      const processedData = await this.processGPSFields(subForm, formData);

      // Merge file data, preserving existing files if no new files for a field
      const existingFiles = {};
      subForm.fields.forEach(field => {
        if ((field.type === this.FIELD_TYPES.FILE_UPLOAD || field.type === this.FIELD_TYPES.IMAGE_UPLOAD) &&
            existingSubSubmission.data[field.id] && !processedFiles[field.id]) {
          existingFiles[field.id] = existingSubSubmission.data[field.id];
        }
      });

      const completeData = {
        ...processedData,
        ...existingFiles,
        ...processedFiles
      };

      // Update sub submission
      const updatedSubSubmission = dataService.updateSubSubmission(subSubmissionId, completeData);

      return {
        success: true,
        submission: updatedSubSubmission,
        message: 'ข้อมูลถูกอัปเดตเรียบร้อยแล้ว'
      };

    } catch (error) {
      console.error('Sub submission update error:', error);
      return {
        success: false,
        error: error.message,
        message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลฟอร์มย่อย'
      };
    }
  }

  /**
   * Process and submit sub form data
   * @param {string} parentSubmissionId - Parent submission ID
   * @param {string} subFormId - Sub form ID
   * @param {Object} formData - Sub form field data
   * @param {Array} files - Uploaded files
   * @returns {Promise<Object>} Submission result
   */
  async submitSubForm(parentSubmissionId, subFormId, formData, files = []) {
    try {
      // Get parent submission
      const parentSubmission = dataService.getSubmission(parentSubmissionId);
      if (!parentSubmission) {
        throw new Error(`Parent submission with ID ${parentSubmissionId} not found`);
      }

      // Get main form to access sub form configuration
      const mainForm = dataService.getForm(parentSubmission.formId);
      if (!mainForm) {
        throw new Error('Main form not found');
      }

      // Find sub form configuration
      const subForm = mainForm.subForms.find(sf => sf.id === subFormId);
      if (!subForm) {
        throw new Error(`Sub form with ID ${subFormId} not found`);
      }

      // Validate sub form data
      const validationResult = this.validateSubFormData(subForm, formData);
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Process uploaded files
      const processedFiles = await this.processUploadedFiles(files);

      // Process GPS data
      const processedData = await this.processGPSFields(subForm, formData);

      // Merge file data
      const completeData = {
        ...processedData,
        ...processedFiles
      };

      // Create sub submission
      const subSubmission = dataService.createSubSubmission(
        parentSubmissionId,
        subFormId,
        completeData
      );

      return {
        success: true,
        subSubmission: subSubmission,
        message: 'ข้อมูลฟอร์มย่อยถูกบันทึกเรียบร้อยแล้ว'
      };

    } catch (error) {
      console.error('Sub form submission error:', error);
      return {
        success: false,
        error: error.message,
        message: 'เกิดข้อผิดพลาดในการบันทึกฟอร์มย่อย'
      };
    }
  }

  // ========== VALIDATION ==========

  /**
   * Validate main form data
   * @param {Object} form - Form configuration
   * @param {Object} formData - Form data to validate
   * @param {Array} files - Uploaded files
   * @param {Object} existingData - Existing submission data (for updates)
   * @returns {Object} Validation result
   */
  validateFormData(form, formData, files = [], existingData = null) {
    const errors = [];

    form.fields.forEach(field => {
      const value = formData[field.id];
      const fieldErrors = this.validateField(field, value, files, existingData);
      errors.push(...fieldErrors);
    });

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Validate sub form data
   * @param {Object} subForm - Sub form configuration
   * @param {Object} formData - Form data to validate
   * @returns {Object} Validation result
   */
  validateSubFormData(subForm, formData) {
    const errors = [];

    subForm.fields.forEach(field => {
      const value = formData[field.id];
      const fieldErrors = this.validateField(field, value);
      errors.push(...fieldErrors);
    });

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Validate individual field
   * @param {Object} field - Field configuration
   * @param {*} value - Field value
   * @param {Array} files - Uploaded files (for file upload validation)
   * @param {Object} existingData - Existing submission data (for updates)
   * @returns {Array} Array of error messages
   */
  validateField(field, value, files = [], existingData = null) {
    const errors = [];

    // Special handling for file upload fields
    if (field.type === this.FIELD_TYPES.FILE_UPLOAD || field.type === this.FIELD_TYPES.IMAGE_UPLOAD) {
      // For file fields, check if files are uploaded for this field
      const fieldFiles = files.filter(file => file.fieldId === field.id);

      // Check if there are existing files for this field
      const hasExistingFiles = existingData && existingData[field.id] &&
        (Array.isArray(existingData[field.id]) ? existingData[field.id].length > 0 : existingData[field.id]);

      // Field is valid if it has new files OR existing files (for updates)
      if (field.required && fieldFiles.length === 0 && !hasExistingFiles) {
        errors.push(`${field.title}: ต้องการข้อมูลในฟิลด์นี้`);
        return errors;
      }
      return errors; // Skip other validations for file fields
    }

    // Check required fields for non-file fields
    if (field.required && this.isEmptyValue(value)) {
      errors.push(`${field.title}: ต้องการข้อมูลในฟิลด์นี้`);
      return errors; // Skip other validations if required field is empty
    }

    // Skip validation if field is empty and not required
    if (this.isEmptyValue(value)) {
      return errors;
    }

    // Type-specific validation
    switch (field.type) {
      case this.FIELD_TYPES.EMAIL:
        if (!this.VALIDATION_PATTERNS.email.test(value)) {
          errors.push(`${field.title}: รูปแบบอีเมลไม่ถูกต้อง`);
        }
        break;

      case this.FIELD_TYPES.PHONE:
        if (!this.VALIDATION_PATTERNS.phone.test(value)) {
          errors.push(`${field.title}: รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง`);
        }
        break;

      case this.FIELD_TYPES.URL:
        if (!this.VALIDATION_PATTERNS.url.test(value)) {
          errors.push(`${field.title}: รูปแบบ URL ไม่ถูกต้อง`);
        }
        break;

      case this.FIELD_TYPES.NUMBER:
        if (!this.VALIDATION_PATTERNS.number.test(value)) {
          errors.push(`${field.title}: ต้องเป็นตัวเลขเท่านั้น`);
        }
        break;

      case this.FIELD_TYPES.DATE:
        if (!this.isValidDate(value)) {
          errors.push(`${field.title}: รูปแบบวันที่ไม่ถูกต้อง`);
        }
        break;

      case this.FIELD_TYPES.TIME:
        if (!this.isValidTime(value)) {
          errors.push(`${field.title}: รูปแบบเวลาไม่ถูกต้อง`);
        }
        break;

      case this.FIELD_TYPES.DATETIME:
        if (!this.isValidDateTime(value)) {
          errors.push(`${field.title}: รูปแบบวันที่และเวลาไม่ถูกต้อง`);
        }
        break;

      case this.FIELD_TYPES.LAT_LONG:
        if (!this.isValidLatLong(value)) {
          errors.push(`${field.title}: รูปแบบพิกัดไม่ถูกต้อง`);
        }
        break;

      case this.FIELD_TYPES.RATING:
        if (!this.isValidRating(value, field.options)) {
          errors.push(`${field.title}: คะแนนไม่อยู่ในช่วงที่กำหนด`);
        }
        break;

      case this.FIELD_TYPES.SLIDER:
        if (!this.isValidSlider(value, field.options)) {
          errors.push(`${field.title}: ค่าไม่อยู่ในช่วงที่กำหนด`);
        }
        break;
    }

    return errors;
  }

  // ========== VALIDATION HELPERS ==========

  isEmptyValue(value) {
    return value === null || value === undefined || value === '' ||
           (Array.isArray(value) && value.length === 0);
  }

  isValidDate(value) {
    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  isValidTime(value) {
    return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
  }

  isValidDateTime(value) {
    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  isValidLatLong(value) {
    if (typeof value !== 'object' || !value.lat || !value.lng) return false;
    const lat = parseFloat(value.lat);
    const lng = parseFloat(value.lng);
    return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  isValidRating(value, options) {
    const rating = parseInt(value);
    const max = options?.maxRating || 5;
    return !isNaN(rating) && rating >= 1 && rating <= max;
  }

  isValidSlider(value, options) {
    const num = parseFloat(value);
    const min = options?.min || 0;
    const max = options?.max || 100;
    return !isNaN(num) && num >= min && num <= max;
  }

  // ========== FILE PROCESSING ==========

  /**
   * Process uploaded files
   * @param {Array} files - Array of file info objects from FileService
   * @returns {Promise<Object>} Processed file data
   */
  async processUploadedFiles(files) {
    const processedFiles = {};

    for (const fileInfo of files) {
      try {
        // If this is already processed file data from FileService, use it directly
        if (fileInfo.data && fileInfo.uploadedAt) {
          // Group files by fieldId
          if (!processedFiles[fileInfo.fieldId]) {
            processedFiles[fileInfo.fieldId] = [];
          }

          // Convert file info to the expected format for storage
          const processedFile = {
            id: fileInfo.id,
            name: fileInfo.name,
            type: fileInfo.type,
            size: fileInfo.size,
            data: fileInfo.data,
            uploadedAt: fileInfo.uploadedAt,
            isImage: fileInfo.isImage || fileInfo.type?.startsWith('image/')
          };

          processedFiles[fileInfo.fieldId].push(processedFile);
        } else {
          // If this is a raw File object, process it normally
          const fileData = await this.processFile(fileInfo);
          processedFiles[fileInfo.fieldId] = fileData;
        }
      } catch (error) {
        console.error(`Error processing file for field ${fileInfo.fieldId}:`, error);
        if (!processedFiles[fileInfo.fieldId]) {
          processedFiles[fileInfo.fieldId] = [];
        }
        processedFiles[fileInfo.fieldId].push({
          error: 'File processing failed',
          fileName: fileInfo.name || 'Unknown file'
        });
      }
    }

    // Convert arrays to single values for single-file fields
    Object.keys(processedFiles).forEach(fieldId => {
      const files = processedFiles[fieldId];
      if (Array.isArray(files) && files.length === 1) {
        // For single file fields, store as single object instead of array
        processedFiles[fieldId] = files[0];
      }
    });

    return processedFiles;
  }

  /**
   * Process individual file
   * @param {File} file - File object
   * @returns {Promise<Object>} File data
   */
  async processFile(file) {
    return new Promise((resolve, reject) => {
      // Validate that file is actually a File or Blob instance
      if (!file || !(file instanceof File) && !(file instanceof Blob)) {
        console.error('Invalid file object:', file);
        reject(new Error('Invalid file object provided'));
        return;
      }

      // Check file size limit (10MB)
      const maxFileSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxFileSize) {
        reject(new Error('ไฟล์ใหญ่เกินไป ขนาดสูงสุด 10MB'));
        return;
      }

      const reader = new FileReader();

      reader.onload = (e) => {
        resolve({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          data: e.target.result, // Base64 data
          uploadedAt: new Date().toISOString(),
          toString: function() {
            return this.fileName || 'Unknown file';
          }
        });
      };

      reader.onerror = () => {
        reject(new Error('File reading failed'));
      };

      // For images, read as data URL; for others, read as text if small enough
      if (file.type && file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else if (file.size < 1024 * 1024) { // < 1MB
        reader.readAsDataURL(file);
      } else {
        // For large files, just store metadata
        resolve({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          data: null,
          uploadedAt: new Date().toISOString(),
          note: 'Large file - data not stored in browser storage',
          toString: function() {
            return this.fileName || 'Unknown file';
          }
        });
      }
    });
  }

  // ========== GPS PROCESSING ==========

  /**
   * Process GPS fields in form data
   * @param {Object} form - Form or sub form configuration
   * @param {Object} formData - Form data
   * @returns {Promise<Object>} Processed form data
   */
  async processGPSFields(form, formData) {
    const processedData = { ...formData };

    for (const field of form.fields) {
      if (field.type === this.FIELD_TYPES.LAT_LONG) {
        const value = formData[field.id];
        if (value && typeof value === 'object') {
          processedData[field.id] = {
            ...value,
            timestamp: new Date().toISOString()
          };
        }
      }
    }

    return processedData;
  }

  /**
   * Get current GPS position
   * @returns {Promise<Object>} GPS coordinates
   */
  async getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString()
          });
        },
        (error) => {
          reject(new Error(`GPS Error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  // ========== DOCUMENT NUMBER GENERATION ==========

  /**
   * Generate document number if configured
   * @param {Object} form - Form configuration
   * @param {Object} formData - Form data
   * @returns {Object} Form data with document number
   */
  generateDocumentNumber(form, formData) {
    const settings = form.settings?.documentNumber;
    if (!settings?.enabled) {
      return formData;
    }

    const year = new Date().getFullYear();
    const buddhistYear = year + 543;
    const displayYear = settings.yearFormat === 'buddhist' ? buddhistYear : year;

    // Get current count for this year
    const submissions = dataService.getSubmissionsByFormId(form.id);
    const currentYearSubmissions = submissions.filter(sub => {
      const subYear = new Date(sub.submittedAt).getFullYear();
      return subYear === year;
    });

    // Calculate next number based on initial number setting
    const initialNumber = settings.initialNumber || 1;
    const nextNumber = currentYearSubmissions.length + initialNumber;
    const paddedNumber = nextNumber.toString().padStart(4, '0');

    let documentNumber;
    if (settings.format === 'prefix-number/year') {
      documentNumber = `${settings.prefix}-${paddedNumber}/${displayYear}`;
    } else {
      documentNumber = `${settings.prefix}-${displayYear}/${paddedNumber}`;
    }

    return {
      ...formData,
      documentNumber: documentNumber
    };
  }

  // ========== TELEGRAM NOTIFICATIONS ==========

  /**
   * Send Telegram notification if configured using TelegramService
   * @param {Object} form - Form configuration
   * @param {Object} submission - Submission data
   */
  async sendTelegramNotification(form, submission) {
    try {
      // Try both settings locations for backward compatibility
      const telegramSettings = form.telegramSettings || form.settings?.telegram;

      // Check if telegram is configured
      if (!telegramSettings?.enabled) {
        console.log('Telegram notification skipped - not enabled');
        return {
          success: true,
          skipped: true,
          reason: 'Telegram notifications not enabled'
        };
      }

      // Validate that bot token and group ID are present
      if (!telegramSettings.botToken || !telegramSettings.groupId) {
        console.log('Telegram notification skipped - missing credentials');
        return {
          success: true,
          skipped: true,
          reason: 'Missing bot token or group ID'
        };
      }

      // Send notification using TelegramService
      const result = await telegramService.sendFormSubmissionNotification(
        form,
        submission,
        telegramSettings
      );

      if (result.success) {
        console.log('Telegram notification sent successfully:', {
          formId: form.id,
          submissionId: submission.id,
          messageId: result.messageId,
          skipped: result.skipped
        });
      } else {
        console.error('Telegram notification failed:', {
          formId: form.id,
          submissionId: submission.id,
          error: result.error
        });
      }

      return result;

    } catch (error) {
      console.error('Telegram notification error:', {
        formId: form?.id,
        submissionId: submission?.id,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test telegram configuration
   * @param {Object} telegramSettings - Telegram settings to test
   * @returns {Promise<Object>} Test result
   */
  async testTelegramConfiguration(telegramSettings) {
    try {
      return await telegramService.testTelegramConfiguration(telegramSettings);
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user-friendly telegram error message
   * @param {Error} error - Error object
   * @returns {string} User-friendly message
   */
  getTelegramErrorMessage(error) {
    return telegramService.getUserFriendlyErrorMessage(error);
  }

  // ========== UTILITY METHODS ==========

  /**
   * Format submission data for display
   * @param {Object} submission - Submission data
   * @param {Object} form - Form configuration
   * @returns {Object} Formatted data
   */
  formatSubmissionForDisplay(submission, form) {
    const formatted = {};

    form.fields.forEach(field => {
      const value = submission.data[field.id];
      formatted[field.id] = {
        title: field.title,
        value: this.formatValueForDisplay(value, field.type),
        rawValue: value,
        type: field.type
      };
    });

    return {
      id: submission.id,
      formId: submission.formId,
      submittedAt: submission.submittedAt,
      fields: formatted,
      documentNumber: submission.data.documentNumber
    };
  }

  /**
   * Format value for display
   * @param {*} value - Field value
   * @param {string} fieldType - Field type
   * @returns {string} Formatted value
   */
  formatValueForDisplay(value, fieldType) {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    switch (fieldType) {
      case this.FIELD_TYPES.DATE:
        try {
          const date = new Date(value);
          if (isNaN(date.getTime())) return 'Invalid Date';
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        } catch (error) {
          return 'Invalid Date';
        }
      case this.FIELD_TYPES.TIME:
        return value;
      case this.FIELD_TYPES.DATETIME:
        try {
          const date = new Date(value);
          if (isNaN(date.getTime())) return 'Invalid Date';
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear();
          const time = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
          return `${day}/${month}/${year} ${time}`;
        } catch (error) {
          return 'Invalid Date';
        }
      case this.FIELD_TYPES.PHONE:
        // Format phone number as XXX-XXX-XXXX
        const digits = value.toString().replace(/\D/g, '');
        if (digits.length === 10) {
          return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
        }
        return value;
      case this.FIELD_TYPES.LAT_LONG:
        return `${value.lat}, ${value.lng}`;
      case this.FIELD_TYPES.MULTIPLE_CHOICE:
        return Array.isArray(value) ? value.join(', ') : value;
      case this.FIELD_TYPES.RATING:
        return `${value}/5`;
      case this.FIELD_TYPES.FILE_UPLOAD:
      case this.FIELD_TYPES.IMAGE_UPLOAD:
        return value.fileName || 'ไฟล์ที่แนบ';
      default:
        return String(value);
    }
  }
}

// Create singleton instance
const submissionService = new SubmissionService();
export default submissionService;

// Export class for testing
export { SubmissionService };