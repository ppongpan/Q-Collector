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
 * - API integration with backend
 */

// ✅ REMOVED: dataService import (deprecated, replaced with apiClient)
import apiClient from './ApiClient.js';
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
   * @param {Array} visibleFieldIds - IDs of visible fields for validation
   * @returns {Promise<Object>} Submission result
   */
  async submitForm(formId, formData, files = [], visibleFieldIds = null) {
    try {
      // Get form configuration from API for validation
      const formResponse = await apiClient.getForm(formId);
      const form = formResponse.data?.form || formResponse.data;
      if (!form) {
        throw new Error(`Form with ID ${formId} not found`);
      }

      // Validate form data including files
      // ✅ CRITICAL FIX: Pass visibleFieldIds to skip validation for hidden fields
      const validationResult = this.validateFormData(form, formData, files, null, visibleFieldIds);
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

      // ⚠️ CRITICAL FIX: Filter out sub-form fields before sending to API
      // Only send main form fields (where sub_form_id is null/undefined)
      const mainFormFieldData = {};
      const mainFormFieldIds = new Set(
        form.fields
          .filter(field => !field.sub_form_id && !field.subFormId)
          .map(field => field.id)
      );

      // Only include data for main form fields
      Object.keys(completeData).forEach(key => {
        if (mainFormFieldIds.has(key) || key === 'documentNumber') {
          mainFormFieldData[key] = completeData[key];
        }
      });

      // Submit to backend API with filtered data
      console.log('🔍 DEBUG: Sending visibleFieldIds to API:', visibleFieldIds);
      const response = await apiClient.createSubmission(formId, mainFormFieldData, {
        ipAddress: await this.getClientIP(),
        userAgent: navigator.userAgent,
        visibleFieldIds  // ✅ CRITICAL FIX: Pass visible field IDs for backend validation
      });

      // Extract submission from response
      const submission = response.data?.submission || response.data;

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
        message: error.message || 'เกิดข้อผิดพลาดในการบันทึกฟอร์ม'
      };
    }
  }

  /**
   * Get client IP address (best effort)
   */
  async getClientIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Update existing form submission
   * ✅ UPDATED: Removed obsolete sub-form redirect (now handled by SubFormEditPage via API)
   * @param {string} formId - Form ID
   * @param {string} submissionId - Submission ID to update
   * @param {Object} formData - Updated form field data
   * @param {Array} files - Uploaded files
   * @param {Array} visibleFieldIds - IDs of visible fields for validation
   * @returns {Promise<Object>} Update result
   */
  async updateSubmission(formId, submissionId, formData, files = [], visibleFieldIds = null) {
    try {
      // Get form configuration from API for validation
      const formResponse = await apiClient.getForm(formId);
      const form = formResponse.data?.form || formResponse.data;
      if (!form) {
        throw new Error(`Form with ID ${formId} not found`);
      }

      // Validate form data including files
      // ✅ CRITICAL FIX: Pass visibleFieldIds to skip validation for hidden fields
      const validationResult = this.validateFormData(form, formData, files, null, visibleFieldIds);
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Process uploaded files
      const processedFiles = await this.processUploadedFiles(files);

      // Process GPS data
      const processedData = await this.processGPSFields(form, formData);

      // Merge file data
      const completeData = {
        ...processedData,
        ...processedFiles
      };

      // Update via backend API
      const response = await apiClient.updateSubmission(submissionId, completeData);

      return {
        success: true,
        submission: response,
        message: 'ข้อมูลถูกอัปเดตเรียบร้อยแล้ว'
      };

    } catch (error) {
      console.error('Submission update error:', error);
      return {
        success: false,
        error: error.message,
        message: error.message || 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล'
      };
    }
  }

  // ✅ REMOVED: updateSubFormSubmission() - Obsolete localStorage-based method
  // Sub-form updates now handled by SubFormEditPage.jsx via API endpoints:
  // PUT /api/v1/subforms/:subFormId/submissions/:submissionId

  // ✅ REMOVED: submitSubForm() - Obsolete localStorage-based method
  // Sub-form submissions now handled by SubFormView.jsx via API endpoints:
  // POST /api/v1/subforms/:subFormId/submissions

  // ========== VALIDATION ==========

  /**
   * Validate main form data
   * @param {Object} form - Form configuration
   * @param {Object} formData - Form data to validate
   * @param {Array} files - Uploaded files
   * @param {Object} existingData - Existing submission data (for updates)
   * @param {Array} visibleFieldIds - IDs of visible fields (skip validation for hidden fields)
   * @returns {Object} Validation result
   */
  validateFormData(form, formData, files = [], existingData = null, visibleFieldIds = null) {
    const errors = [];

    // ⚠️ CRITICAL FIX: Filter out sub-form fields (sub_form_id !== null)
    // Only validate main form fields during main form submission
    const mainFormFields = form.fields.filter(field => !field.sub_form_id && !field.subFormId);

    console.log('🔍 Frontend Validation: Total main form fields:', mainFormFields.length);
    console.log('🔍 Frontend Validation: Visible field IDs:', visibleFieldIds);

    mainFormFields.forEach(field => {
      // ✅ CRITICAL FIX: Skip validation for hidden fields
      // If visibleFieldIds is provided and field is not in the list, it's hidden
      if (visibleFieldIds && !visibleFieldIds.includes(field.id)) {
        console.log(`⏭️ Frontend Validation: Skipping hidden field: ${field.title} (${field.id})`);
        return;
      }

      const value = formData[field.id];
      const fieldErrors = this.validateField(field, value, files, existingData);
      if (fieldErrors.length > 0) {
        console.log(`❌ Frontend Validation Error: ${field.title} - ${fieldErrors.join(', ')}`);
      }
      errors.push(...fieldErrors);
    });

    console.log('🔍 Frontend Validation Result:', { isValid: errors.length === 0, errorCount: errors.length });

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // ✅ REMOVED: validateSubFormData() - Obsolete method only used by deleted sub-form methods
  // Sub-form validation now handled by backend via API endpoints

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
        // ✅ FIX: Check if this is a pre-uploaded file from MinIO (has id property)
        // Pre-uploaded files from FileService/MinIO have: id, fieldId, name, type, size
        if (fileInfo.id && fileInfo.fieldId) {
          // This is already uploaded to MinIO - use it directly
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
            uploadedAt: fileInfo.uploadedAt || new Date().toISOString(),
            isImage: fileInfo.isImage || fileInfo.type?.startsWith('image/')
          };

          processedFiles[fileInfo.fieldId].push(processedFile);
          console.log(`✅ Using pre-uploaded file: ${fileInfo.name} (ID: ${fileInfo.id})`);
        } else if (fileInfo instanceof File || fileInfo instanceof Blob) {
          // This is a raw File object from browser - process it
          console.log(`⚠️ Raw File object detected: ${fileInfo.name} - should be uploaded via FileService first`);
          const fileData = await this.processFile(fileInfo);
          if (!processedFiles[fileInfo.fieldId]) {
            processedFiles[fileInfo.fieldId] = [];
          }
          processedFiles[fileInfo.fieldId].push(fileData);
        } else {
          console.error('Invalid file object - neither pre-uploaded nor File instance:', fileInfo);
          throw new Error('Invalid file object provided');
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
   * ✅ UPDATED: Document number generation moved to backend
   * This method now just passes through the formData
   * Backend handles document number generation in SubmissionService.createSubmission()
   * @param {Object} form - Form configuration
   * @param {Object} formData - Form data
   * @returns {Object} Form data (unchanged - backend will add document number)
   */
  generateDocumentNumber(form, formData) {
    // Document number generation now handled by backend
    // Backend has access to accurate submission counts via database
    return formData;
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
    // ✅ DEBUG: Log inputs
    console.log('🔍 formatSubmissionForDisplay called:', {
      submissionId: submission?.id,
      hasData: !!submission?.data,
      dataKeys: submission?.data ? Object.keys(submission.data).length : 0,
      hasForm: !!form,
      hasFields: !!form?.fields,
      fieldsCount: form?.fields?.length || 0
    });

    // If submission doesn't have data field (e.g., from listSubmissions API),
    // return basic info only
    if (!submission.data || (typeof submission.data === 'object' && Object.keys(submission.data).length === 0)) {
      console.warn('⚠️ formatSubmissionForDisplay: No data or empty data', submission.id);
      return {
        id: submission.id,
        formId: submission.formId,
        submittedAt: submission.submittedAt,
        submittedBy: submission.submittedBy,
        status: submission.status,
        fields: {},
        documentNumber: null
      };
    }

    // ✅ FIX: Check if form.fields exists
    if (!form || !form.fields || !Array.isArray(form.fields)) {
      console.error('❌ formatSubmissionForDisplay: Invalid form or missing fields!', {
        hasForm: !!form,
        hasFields: !!form?.fields,
        isArray: Array.isArray(form?.fields),
        form: form
      });
      return {
        id: submission.id,
        formId: submission.formId,
        submittedAt: submission.submittedAt,
        submittedBy: submission.submittedBy,
        status: submission.status,
        fields: {},
        documentNumber: null
      };
    }

    const formatted = {};

    // ✅ FIX: Only format fields that exist in submission.data
    // Don't format all form fields - only format fields with actual data
    const submissionFieldIds = Object.keys(submission.data);

    console.log('🔧 Filtering fields:', {
      totalFormFields: form.fields.length,
      submissionDataFields: submissionFieldIds.length,
      willFormat: submissionFieldIds.length
    });

    submissionFieldIds.forEach(fieldId => {
      // Find the field definition from form.fields
      const field = form.fields.find(f => f.id === fieldId);

      if (!field) {
        console.warn(`⚠️ Field ${fieldId} not found in form definition`);
        return; // Skip this field if not found in form
      }

      // Extract value from API response structure: {fieldId, fieldTitle, fieldType, value}
      // Or use direct value from LocalStorage format
      const fieldData = submission.data[fieldId];
      const value = fieldData?.value !== undefined ? fieldData.value : fieldData;

      formatted[fieldId] = {
        title: field.title,
        value: this.formatValueForDisplay(value, field.type),
        rawValue: value,
        type: field.type
      };
    });

    console.log('✅ formatSubmissionForDisplay result:', {
      submissionId: submission.id,
      formattedCount: Object.keys(formatted).length
    });

    return {
      id: submission.id,
      formId: submission.formId,
      submittedAt: submission.submittedAt,
      submittedBy: submission.submittedBy,
      status: submission.status,
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