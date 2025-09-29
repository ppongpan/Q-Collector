import React, { useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { GlassCard, GlassCardContent } from './ui/glass-card';
import { GlassButton } from './ui/glass-button';
import { GlassInput, GlassTextarea, GlassSelect } from './ui/glass-input';
import { useEnhancedToast } from './ui/enhanced-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faMapMarkerAlt, faStar } from '@fortawesome/free-solid-svg-icons';
import ThaiDateInput from './ui/thai-date-input';
import ThaiDateTimeInput from './ui/thai-datetime-input';
import ThaiPhoneInput from './ui/thai-phone-input';
import { FieldErrorAlert } from './ui/alert';
import { Slider } from './ui/slider';
import EnhancedFormSlider from './ui/enhanced-form-slider';

// Data services
import dataService from '../services/DataService.js';
import submissionService from '../services/SubmissionService.js';
import FileService from '../services/FileService.js';

// Utilities
import { formatNumberInput, parseNumberInput, isValidNumber } from '../utils/numberFormatter.js';
import { formulaEngine } from '../utils/formulaEngine.js';
import { useConditionalVisibility } from '../hooks/useConditionalVisibility.js';

const FormView = forwardRef(({ formId, submissionId, onSave, onCancel }, ref) => {
  const [form, setForm] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [fileUploadProgress, setFileUploadProgress] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [fieldTouched, setFieldTouched] = useState({});
  const [hasSubmissionAttempt, setHasSubmissionAttempt] = useState(false);
  const [storageUsage, setStorageUsage] = useState(null);
  const [fieldVisibility, setFieldVisibility] = useState({});

  // Enhanced toast notifications
  const toast = useEnhancedToast();

  // Update storage usage
  const updateStorageUsage = useCallback(() => {
    const usage = FileService.getStorageUsage();
    setStorageUsage(usage);
  }, []);

  // Date formatting utilities
  const formatDateForInput = (dateValue) => {
    if (!dateValue) return '';
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return '';
      // Format as YYYY-MM-DD for HTML date input
      return date.toISOString().split('T')[0];
    } catch (error) {
      return '';
    }
  };

  const formatDateTimeForInput = (dateTimeValue) => {
    if (!dateTimeValue) return '';
    try {
      const date = new Date(dateTimeValue);
      if (isNaN(date.getTime())) return '';
      // Format as YYYY-MM-DDTHH:MM for HTML datetime-local input
      const isoString = date.toISOString();
      return isoString.slice(0, 16); // Remove seconds and timezone
    } catch (error) {
      return '';
    }
  };

  // Load form and submission data
  useEffect(() => {
    loadFormData();
    updateStorageUsage();
  }, [formId, submissionId, updateStorageUsage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Expose handleSubmit function to parent component via ref
  useImperativeHandle(ref, () => ({
    handleSubmit
  }));

  const loadFormData = async () => {
    setLoading(true);
    try {
      // Load form
      const formData = dataService.getForm(formId);
      if (!formData) {
        console.error('Form not found:', formId);
        return;
      }
      setForm(formData);

      // Load existing submission for editing
      if (submissionId) {
        const submission = dataService.getSubmission(submissionId);
        if (submission) {
          setFormData(submission.data || {});

          // Load existing files
          const existingFiles = FileService.getSubmissionFiles(submissionId);
          const filesByField = {};
          existingFiles.forEach(file => {
            if (!filesByField[file.fieldId]) {
              filesByField[file.fieldId] = [];
            }
            filesByField[file.fieldId].push({
              id: file.id,
              name: file.name,
              type: file.type,
              size: file.size,
              uploadedAt: file.uploadedAt,
              isImage: file.isImage
            });
          });

          // Convert to uploadedFiles format
          const uploadedFilesData = Object.keys(filesByField).map(fieldId => ({
            fieldId,
            files: filesByField[fieldId]
          }));
          setUploadedFiles(uploadedFilesData);
        }
      }
    } catch (error) {
      console.error('Error loading form data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Validation functions
  const validateField = (field, value) => {
    // Helper function to check if value is empty
    const isEmpty = (val) => {
      if (val === null || val === undefined) return true;
      if (typeof val === 'string') return val.trim() === '';
      if (Array.isArray(val)) return val.length === 0;
      if (typeof val === 'object') {
        // For objects like lat_long, check if it has meaningful values
        if (field.type === 'lat_long') {
          return !val.lat || !val.lng;
        }
        // For other objects, check if they have any keys
        return Object.keys(val).length === 0;
      }
      if (typeof val === 'number') return isNaN(val);
      return false;
    };

    // Check required fields
    if (field.required && isEmpty(value)) {
      return 'ฟิลด์นี้จำเป็นต้องกรอก';
    }

    // If field is empty and not required, skip validation
    if (!field.required && isEmpty(value)) {
      return '';
    }

    // Type-specific validation (only if value exists)
    if (!isEmpty(value)) {
      switch (field.type) {
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            return 'รูปแบบอีเมลไม่ถูกต้อง';
          }
          break;
        case 'phone':
          const phoneDigits = value.replace(/\D/g, '');
          if (phoneDigits.length !== 10) {
            return 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (ต้องการ 10 หลัก)';
          }
          break;
        case 'url':
          try {
            // Auto-add https:// if no protocol is specified
            let urlToValidate = value;
            if (!/^https?:\/\//i.test(value)) {
              urlToValidate = 'https://' + value;
            }
            new URL(urlToValidate);
          } catch {
            return 'รูปแบบ URL ไม่ถูกต้อง';
          }
          break;
        case 'number':
          const cleanValue = parseNumberInput(value);
          if (!isValidNumber(cleanValue)) {
            return 'กรุณากรอกตัวเลขที่ถูกต้อง';
          }
          break;
        case 'multiple_choice':
          // Multiple choice validation is handled by the isEmpty check above
          break;
        case 'rating':
          // Rating validation is handled by the isEmpty check above
          break;
        case 'slider':
          // Slider validation is handled by the isEmpty check above
          break;
        case 'lat_long':
          // Lat/Long validation - check if it has both lat and lng
          if (value && typeof value === 'object') {
            if (!value.lat || !value.lng) {
              return 'กรุณาเลือกตำแหน่งให้ครบถ้วน';
            }
          }
          break;
        case 'province':
        case 'factory':
          // Province and factory validation is handled by the isEmpty check above
          break;
      }
    }

    return '';
  };

  const handleInputChange = useCallback((fieldId, value) => {
    const newFormData = { ...formData, [fieldId]: value };

    setFormData(newFormData);

    // Mark field as touched
    setFieldTouched(prev => ({
      ...prev,
      [fieldId]: true
    }));

    // Validate field
    const field = form?.fields.find(f => f.id === fieldId);
    if (field) {
      const error = validateField(field, value);
      setFieldErrors(prev => ({
        ...prev,
        [fieldId]: error
      }));
    }

    // Update conditional field visibility after data change
    updateFieldVisibility(newFormData);
  }, [form, formData, updateFieldVisibility]);

  // Special handler for number fields with live formatting
  const handleNumberInputChange = useCallback((fieldId, inputValue, previousValue) => {
    const { formattedValue } = formatNumberInput(inputValue, previousValue);

    // Store the clean value (without commas) in form data
    const cleanValue = parseNumberInput(formattedValue);
    setFormData(prev => ({
      ...prev,
      [fieldId]: cleanValue
    }));

    // Mark field as touched
    setFieldTouched(prev => ({
      ...prev,
      [fieldId]: true
    }));

    // Validate field with clean value
    const field = form?.fields.find(f => f.id === fieldId);
    if (field) {
      const error = validateField(field, cleanValue);
      setFieldErrors(prev => ({
        ...prev,
        [fieldId]: error
      }));
    }

    // Update conditional field visibility after data change
    const newFormData = { ...formData, [fieldId]: cleanValue };
    updateFieldVisibility(newFormData);

    return formattedValue;
  }, [form, formData, updateFieldVisibility]);

  // Factory button click handler
  const handleFactoryClick = useCallback((fieldId, factory, allowMultiple, currentValue) => {
    if (allowMultiple) {
      const selectedFactories = Array.isArray(currentValue) ? currentValue : (currentValue ? [currentValue] : []);
      const newSelection = selectedFactories.includes(factory)
        ? selectedFactories.filter(f => f !== factory)
        : [...selectedFactories, factory];
      const newFormData = { ...formData, [fieldId]: newSelection };

      setFormData(newFormData);

      // Mark field as touched
      setFieldTouched(prev => ({
        ...prev,
        [fieldId]: true
      }));

      // Validate field
      const field = form?.fields.find(f => f.id === fieldId);
      if (field) {
        const error = validateField(field, newSelection);
        setFieldErrors(prev => ({
          ...prev,
          [fieldId]: error
        }));
      }

      // Update conditional field visibility after data change
      updateFieldVisibility(newFormData);
    } else {
      const newFormData = { ...formData, [fieldId]: factory };

      setFormData(newFormData);

      // Mark field as touched
      setFieldTouched(prev => ({
        ...prev,
        [fieldId]: true
      }));

      // Validate field
      const field = form?.fields.find(f => f.id === fieldId);
      if (field) {
        const error = validateField(field, factory);
        setFieldErrors(prev => ({
          ...prev,
          [fieldId]: error
        }));
      }

      // Update conditional field visibility after data change
      updateFieldVisibility(newFormData);
    }
  }, [form, formData, updateFieldVisibility]);

  // Calculate field visibility based on conditional formulas
  const updateFieldVisibility = useCallback((currentFormData) => {
    if (!form?.fields) return;

    const newVisibility = {};
    const fieldMap = {};

    // Create field map for formula evaluation
    form.fields.forEach(field => {
      fieldMap[field.id] = field;
    });

    form.fields.forEach(field => {
      // Default visibility is true
      let isVisible = true;

      // Check if field has conditional visibility
      // showCondition.enabled === false means formula is active (unchecked checkbox)
      // showCondition.enabled === true or undefined means always show (checked checkbox)
      if (field.showCondition?.enabled === false && field.showCondition?.formula) {
        try {
          // Evaluate the formula with current form data
          isVisible = formulaEngine.evaluate(
            field.showCondition.formula,
            currentFormData,
            fieldMap
          );
        } catch (error) {
          console.warn(`Error evaluating show condition for field ${field.title}:`, error);
          // Default to visible on error
          isVisible = true;
        }
      }
      // If showCondition.enabled is true or undefined, field is always visible

      newVisibility[field.id] = isVisible;
    });

    setFieldVisibility(newVisibility);
  }, [form]);

  // Update field visibility when form data changes
  useEffect(() => {
    updateFieldVisibility(formData);
  }, [formData, updateFieldVisibility]);

  const handleFileChange = async (fieldId, files) => {
    if (!files || files.length === 0) return;

    // Show progress for this field
    setFileUploadProgress(prev => ({ ...prev, [fieldId]: 0 }));

    try {
      const fileArray = Array.from(files);
      const currentSubmissionId = submissionId || `temp_${Date.now()}`;

      // Upload files using FileService
      const results = await FileService.saveMultipleFiles(
        fileArray,
        fieldId,
        currentSubmissionId,
        (progress) => {
          setFileUploadProgress(prev => ({ ...prev, [fieldId]: progress }));
        }
      );

      // Process successful uploads
      const successfulFiles = results
        .filter(result => result.success)
        .map(result => result.fileInfo);

      // Process failed uploads
      const failedFiles = results
        .filter(result => !result.success)
        .map(result => result.error);

      if (failedFiles.length > 0) {
        toast.error(`ไม่สามารถอัปโหลดไฟล์บางไฟล์ได้: ${failedFiles.join(', ')}`, {
          title: "อัปโหลดไฟล์ไม่สำเร็จ",
          duration: 8000
        });
      }

      if (successfulFiles.length > 0) {
        // Update uploadedFiles state
        const updatedFiles = [...uploadedFiles];
        const existingIndex = updatedFiles.findIndex(f => f.fieldId === fieldId);

        if (existingIndex >= 0) {
          // Merge with existing files
          const existingFiles = updatedFiles[existingIndex].files || [];
          updatedFiles[existingIndex] = {
            fieldId,
            files: [...existingFiles, ...successfulFiles]
          };
        } else {
          updatedFiles.push({ fieldId, files: successfulFiles });
        }

        setUploadedFiles(updatedFiles);

        // Update form data for validation
        const fieldFiles = updatedFiles.find(f => f.fieldId === fieldId);
        const allFileIds = fieldFiles ? fieldFiles.files.map(f => f.id) : [];
        handleInputChange(fieldId, allFileIds);

        toast.success(`อัปโหลด ${successfulFiles.length} ไฟล์เรียบร้อยแล้ว`, {
          title: "อัปโหลดสำเร็จ",
          duration: 3000
        });

        // Update storage usage after upload
        updateStorageUsage();
      }

    } catch (error) {
      console.error('File upload error:', error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์', {
        title: "อัปโหลดไฟล์ไม่สำเร็จ",
        duration: 8000
      });
    } finally {
      // Hide progress
      setFileUploadProgress(prev => {
        const updated = { ...prev };
        delete updated[fieldId];
        return updated;
      });
    }
  };

  const handleFileRemove = async (fieldId, fileId) => {
    try {
      // Remove file from FileService
      const success = FileService.deleteFile(fileId);

      if (success) {
        // Update uploadedFiles state
        const updatedFiles = uploadedFiles.map(field => {
          if (field.fieldId === fieldId) {
            const updatedFieldFiles = field.files.filter(file => file.id !== fileId);
            return { ...field, files: updatedFieldFiles };
          }
          return field;
        }).filter(field => field.files.length > 0); // Remove empty field entries

        setUploadedFiles(updatedFiles);

        // Update form data
        const fieldFiles = updatedFiles.find(f => f.fieldId === fieldId);
        const fileIds = fieldFiles ? fieldFiles.files.map(f => f.id) : [];
        handleInputChange(fieldId, fileIds);

        toast.success('ลบไฟล์เรียบร้อยแล้ว', {
          title: "ลบไฟล์สำเร็จ",
          duration: 2000
        });

        // Update storage usage after deletion
        updateStorageUsage();
      } else {
        throw new Error('ไม่สามารถลบไฟล์ได้');
      }
    } catch (error) {
      console.error('File removal error:', error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการลบไฟล์', {
        title: "ลบไฟล์ไม่สำเร็จ",
        duration: 5000
      });
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleGPSLocation = async (fieldId) => {
    try {
      const position = await submissionService.getCurrentPosition();
      handleInputChange(fieldId, {
        lat: position.lat,
        lng: position.lng,
        accuracy: position.accuracy,
        timestamp: position.timestamp
      });
      toast.success('ได้รับตำแหน่งปัจจุบันแล้ว', {
        title: "GPS สำเร็จ",
        duration: 3000
      });
    } catch (error) {
      console.error('GPS error:', error);

      let errorTitle = "ไม่สามารถรับตำแหน่ง GPS ได้";
      let errorMessage = error.message;
      let actionLabel = "ลองอีกครั้ง";

      if (error.message.includes('Permission denied')) {
        errorTitle = "ไม่ได้รับอนุญาตใช้ GPS";
        errorMessage = "กรุณาอนุญาตให้เว็บไซต์เข้าถึงตำแหน่งของคุณ";
        actionLabel = "ตั้งค่าอนุญาต";
      } else if (error.message.includes('Position unavailable')) {
        errorTitle = "ไม่พบสัญญาณ GPS";
        errorMessage = "กรุณาตรวจสอบการเชื่อมต่อและลองใหม่";
      }

      toast.error(errorMessage, {
        title: errorTitle,
        duration: 8000,
        action: {
          label: actionLabel,
          onClick: () => handleGPSLocation(fieldId)
        }
      });
    }
  };

  // Form-level validation
  const validateAllFields = () => {
    const errors = {};
    const touched = {};
    let hasErrors = false;

    console.log('=== Form Validation Debug ===');
    console.log('Form fields:', form.fields);
    console.log('Form data:', formData);
    console.log('Uploaded files:', uploadedFiles);
    console.log('Field visibility:', fieldVisibility);

    form.fields.forEach(field => {
      // Skip validation for hidden fields
      if (fieldVisibility[field.id] === false) {
        console.log(`Skipping validation for hidden field: ${field.title}`);
        return;
      }
      let error = '';

      // Special handling for file upload fields
      if (field.type === 'file_upload' || field.type === 'image_upload') {
        const fieldFiles = uploadedFiles.find(uf => uf.fieldId === field.id);
        console.log(`File field ${field.title} (${field.id}):`, { required: field.required, files: fieldFiles });
        if (field.required && (!fieldFiles || fieldFiles.files.length === 0)) {
          error = 'ฟิลด์นี้จำเป็นต้องกรอก';
        }
      } else {
        // Regular field validation
        const value = formData[field.id];
        console.log(`Field ${field.title} (${field.id}):`, {
          type: field.type,
          required: field.required,
          value: value,
          isEmpty: !value || (typeof value === 'string' && value.trim() === '')
        });
        error = validateField(field, value);
      }

      if (error) {
        console.log(`Validation error for ${field.title}:`, error);
        errors[field.id] = error;
        touched[field.id] = true;
        hasErrors = true;
      }
    });

    console.log('Final validation result:', { hasErrors, errors });

    if (hasErrors) {
      setFieldErrors(errors);
      setFieldTouched(touched);

      // Create detailed error message with specific field names and issues
      const errorFields = Object.keys(errors);
      const errorCount = errorFields.length;
      const fieldNames = errorFields.map(fieldId => {
        const field = form.fields.find(f => f.id === fieldId);
        return field ? field.title : fieldId;
      });

      let errorMessage = `พบข้อผิดพลาด ${errorCount} จุด: `;
      if (errorCount === 1) {
        errorMessage = `กรุณาแก้ไขข้อมูล "${fieldNames[0]}" - ${errors[errorFields[0]]}`;
      } else if (errorCount <= 3) {
        errorMessage += fieldNames.join(', ');
      } else {
        errorMessage += `${fieldNames.slice(0, 2).join(', ')} และอีก ${errorCount - 2} ฟิลด์`;
      }

      toast.error(errorMessage, {
        title: "ข้อมูลไม่ครบถ้วน",
        duration: 8000,
        action: {
          label: "ไปที่ฟิลด์แรก",
          onClick: () => {
            const firstErrorField = document.querySelector(`[data-field-id="${errorFields[0]}"]`);
            if (firstErrorField) {
              firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }
      });

      // Auto scroll to first error field
      setTimeout(() => {
        const firstErrorField = document.querySelector(`[data-field-id="${errorFields[0]}"]`);
        if (firstErrorField) {
          firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);

      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (submitting) return;

    // Mark that user has attempted to submit
    setHasSubmissionAttempt(true);

    // Validate all fields before submission
    if (!validateAllFields()) {
      return;
    }

    setSubmitting(true);
    try {
      let result;
      if (submissionId) {
        // Update existing submission
        const flatFiles = uploadedFiles.flatMap(uf =>
          uf.files.map(file => {
            // Get full file data from FileService
            const fileData = FileService.getFile(file.id);
            return {
              ...file,
              fieldId: uf.fieldId,
              // Include the full file data for processing
              ...fileData
            };
          })
        );
        result = await submissionService.updateSubmission(formId, submissionId, formData, flatFiles);
      } else {
        // Create new submission
        const flatFiles = uploadedFiles.flatMap(uf =>
          uf.files.map(file => {
            // Get full file data from FileService
            const fileData = FileService.getFile(file.id);
            return {
              ...file,
              fieldId: uf.fieldId,
              // Include the full file data for processing
              ...fileData
            };
          })
        );
        result = await submissionService.submitForm(formId, formData, flatFiles);
      }

      if (result.success) {
        // If this was a new submission (not editing), update file submission IDs
        if (!submissionId && result.submission) {
          const newSubmissionId = result.submission.id;

          // Find all files that were uploaded with temporary IDs during this session
          uploadedFiles.forEach(fieldFiles => {
            fieldFiles.files.forEach(file => {
              // Check if this file has a temporary submission ID
              const storedFile = FileService.getFile(file.id);
              if (storedFile && storedFile.submissionId.startsWith('temp_')) {
                // Update the file's submission ID to the real one
                const updatedFileInfo = {
                  ...storedFile,
                  submissionId: newSubmissionId
                };
                FileService.storeFileInfo(updatedFileInfo);
              }
            });
          });
        }

        toast.success(result.message || 'บันทึกข้อมูลเรียบร้อยแล้ว', {
          title: submissionId ? "อัพเดทข้อมูลสำเร็จ" : "บันทึกข้อมูลสำเร็จ",
          duration: 5000
        });
        if (onSave) {
          onSave(result.submission || result.updatedSubmission, !!submissionId);
        }
      } else {
        // Enhanced error handling for submission failure
        console.error('Submission failed:', result);

        if (result.validationErrors && result.validationErrors.length > 0) {
          // Handle validation errors from server
          const validationMessage = result.validationErrors.join(', ');
          toast.error(validationMessage, {
            title: "การตรวจสอบข้อมูลล้มเหลว",
            duration: 10000,
            action: {
              label: "ตรวจสอบข้อมูล",
              onClick: () => setHasSubmissionAttempt(true)
            }
          });
        } else if (result.message) {
          toast.error(result.message, {
            title: "บันทึกข้อมูลไม่สำเร็จ",
            duration: 8000
          });
        } else {
          toast.error('กรุณาลองใหม่อีกครั้ง', {
            title: "บันทึกข้อมูลไม่สำเร็จ",
            duration: 8000
          });
        }
      }
    } catch (error) {
      console.error('Submit error:', error);

      // Enhanced error handling with specific error types
      let errorMessage = 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';

      if (error.message.includes('Network')) {
        errorMessage = 'เกิดปัญหาการเชื่อมต่อ กรุณาตรวจสอบอินเทอร์เน็ตและลองใหม่';
      } else if (error.message.includes('Validation failed')) {
        errorMessage = `ข้อมูลไม่ถูกต้อง: ${error.message.replace('Validation failed: ', '')}`;
      } else if (error.message.includes('Permission denied')) {
        errorMessage = 'ไม่มีสิทธิ์ในการบันทึกข้อมูล';
      } else if (error.message.includes('Storage quota')) {
        errorMessage = 'พื้นที่จัดเก็บข้อมูลเต็ม กรุณาลบข้อมูลเก่าหรือติดต่อผู้ดูแลระบบ';
      } else if (error.message.includes('File too large')) {
        errorMessage = 'ไฟล์ที่แนบมีขนาดใหญ่เกินไป กรุณาเลือกไฟล์ที่มีขนาดเล็กกว่า';
      } else {
        errorMessage += `: ${error.message}`;
      }

      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field) => {
    // Check if field should be visible based on conditional formulas
    const isFieldVisible = fieldVisibility[field.id] !== false;
    if (!isFieldVisible) {
      return null; // Don't render hidden fields
    }

    const rawFieldValue = formData[field.id];

    // Defensive conversion for objects to prevent React rendering errors
    const fieldValue = (() => {
      if (rawFieldValue && typeof rawFieldValue === 'object' && !Array.isArray(rawFieldValue)) {
        // Special handling for lat_long fields - preserve object structure
        if (field.type === 'lat_long' && (rawFieldValue.lat !== undefined || rawFieldValue.lng !== undefined)) {
          return rawFieldValue;
        }
        // If it's an object with toString method, use it
        if (typeof rawFieldValue.toString === 'function' && rawFieldValue.toString !== Object.prototype.toString) {
          return rawFieldValue.toString();
        }
        // If it's a file object with fileName, use that
        if (rawFieldValue.fileName) {
          return rawFieldValue.fileName;
        }
        // Otherwise convert to JSON string to prevent React error
        return JSON.stringify(rawFieldValue);
      }
      // Arrays should be preserved for multiple_choice fields
      return rawFieldValue;
    })();

    // Check if field has validation error and user has attempted to submit
    const hasError = hasSubmissionAttempt && field.required && validateField(field, rawFieldValue);
    const fieldError = fieldErrors[field.id];
    const isFieldTouched = fieldTouched[field.id];

    switch (field.type) {
      case 'short_answer':
      case 'email':
      case 'url':
        return (
          <div key={field.id} data-field-id={field.id} className="space-y-1 sm:space-y-2">
            <GlassInput
              label={field.title}
              type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
              required={field.required}
              placeholder={field.placeholder || `กรอก${field.title}`}
              value={fieldValue || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              hasValidationError={hasError || (isFieldTouched && fieldError)}
              className="text-sm sm:text-base"
            />
            <FieldErrorAlert error={isFieldTouched && fieldError ? fieldError : null} />
          </div>
        );

      case 'phone':
        return (
          <ThaiPhoneInput
            key={field.id}
            label={field.title}
            required={field.required}
            placeholder={field.placeholder || "XXX-XXX-XXXX"}
            value={fieldValue || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            hasValidationError={hasError}
          />
        );

      case 'paragraph':
        return (
          <GlassTextarea
            key={field.id}
            label={field.title}
            required={field.required}
            placeholder={field.placeholder || `กรอก${field.title}`}
            value={fieldValue || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            rows={4}
            hasValidationError={hasError}
          />
        );

      case 'number':
        return (
          <GlassInput
            key={field.id}
            type="number"
            label={field.title}
            required={field.required}
            placeholder={field.placeholder || `กরอก${field.title}`}
            value={fieldValue || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            hasValidationError={hasError}
          />
        );

      case 'date':
        return (
          <ThaiDateInput
            key={field.id}
            label={field.title}
            required={field.required}
            placeholder={field.placeholder || "DD/MM/YYYY"}
            value={fieldValue}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            hasValidationError={hasError}
          />
        );

      case 'time':
        return (
          <GlassInput
            key={field.id}
            type="time"
            label={field.title}
            required={field.required}
            value={fieldValue || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            hasValidationError={hasError}
          />
        );

      case 'datetime':
        return (
          <ThaiDateTimeInput
            key={field.id}
            label={field.title}
            required={field.required}
            placeholder={field.placeholder || "DD/MM/YYYY HH:MM"}
            value={fieldValue}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            hasValidationError={hasError}
          />
        );

      case 'multiple_choice':
        const options = field.options?.options || [];
        const isMultiple = field.options?.allowMultiple || false;
        const displayStyle = field.options?.displayStyle || 'radio';

        if (!options || options.length === 0) {
          return (
            <div key={field.id} className="space-y-3">
              <label className="block text-sm font-medium text-foreground/80">
                {field.title}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </label>
              <div className="p-4 border border-border/40 rounded-lg bg-muted/10">
                <p className="text-muted-foreground text-sm">ยังไม่มีตัวเลือกสำหรับฟิลด์นี้</p>
              </div>
            </div>
          );
        }

        if (displayStyle === 'dropdown') {
          return (
            <GlassSelect
              key={field.id}
              label={field.title}
              required={field.required}
              value={fieldValue || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
            >
              <option value="">เลือก...</option>
              {options.map((option, index) => (
                <option key={option.id || index} value={option.value || option.text || option}>
                  {option.text || option.value || option}
                </option>
              ))}
            </GlassSelect>
          );
        }

        if (displayStyle === 'buttons') {
          // Advanced layout calculation system
          const calculateOptimalLayout = (options) => {
            // Calculate max text length and estimate button width
            const maxLength = Math.max(...options.map(option => {
              const text = option.text || option.value || option;
              return String(text).length;
            }));

            // Estimate button width based on text length (approximate)
            // Base: 24px padding + 8px per character + 16px margin/gap
            const estimatedButtonWidth = 48 + (maxLength * 7);

            // Screen width breakpoints (approximate container widths)
            const breakpoints = {
              xs: 320,   // Mobile portrait
              sm: 576,   // Mobile landscape
              md: 768,   // Tablet
              lg: 1024,  // Desktop small
              xl: 1280   // Desktop large
            };

            // Calculate columns for each breakpoint
            const calculateColumns = (containerWidth) => {
              const availableWidth = containerWidth - 32; // Account for padding
              const cols = Math.floor(availableWidth / estimatedButtonWidth);
              return Math.max(1, Math.min(cols, options.length));
            };

            const layout = {
              xs: calculateColumns(breakpoints.xs),
              sm: calculateColumns(breakpoints.sm),
              md: calculateColumns(breakpoints.md),
              lg: calculateColumns(breakpoints.lg),
              xl: calculateColumns(breakpoints.xl)
            };

            // Generate responsive grid classes
            const gridClasses = [
              `grid gap-2`,
              `grid-cols-${layout.xs}`,
              `sm:grid-cols-${layout.sm}`,
              `md:grid-cols-${layout.md}`,
              `lg:grid-cols-${layout.lg}`,
              `xl:grid-cols-${layout.xl}`
            ].join(' ');

            return { gridClasses, maxLength, estimatedButtonWidth };
          };

          const { gridClasses, maxLength } = calculateOptimalLayout(options);

          return (
            <div key={field.id} className="space-y-3">
              <label className="block text-sm font-medium text-foreground/80">
                {field.title}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </label>
              <div className={gridClasses}>
                {options.map((option, index) => {
                  const optionValue = option.value || option.text || option;
                  const optionText = option.text || option.value || option;
                  const isSelected = isMultiple
                    ? (fieldValue || []).includes(optionValue)
                    : fieldValue === optionValue;

                  return (
                    <button
                      key={option.id || index}
                      type="button"
                      onClick={() => {
                        if (isMultiple) {
                          const current = fieldValue || [];
                          const newValue = isSelected
                            ? current.filter(item => item !== optionValue)
                            : [...current, optionValue];
                          handleInputChange(field.id, newValue);
                        } else {
                          handleInputChange(field.id, optionValue);
                        }
                      }}
                      className={`
                        px-2 py-1.5 rounded-md border-2 transition-all duration-300 text-center focus:outline-none text-xs w-full
                        ${isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border/40 bg-muted/20 text-foreground/80 hover:border-primary/50 hover:bg-primary/5'
                        }
                      `}
                      style={{ minHeight: '32px' }}
                    >
                      <span className="truncate block">{optionText}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }

        // Default radio/checkbox style with advanced layout calculation
        const calculateRadioLayout = (options) => {
          // Calculate max text length and estimate item width for radio/checkbox
          const maxLength = Math.max(...options.map(option => {
            const text = option.text || option.value || option;
            return String(text).length;
          }));

          // Estimate item width for radio/checkbox style
          // Base: 20px radio + 8px gap + text width (7px per char) + 16px padding
          const estimatedItemWidth = 44 + (maxLength * 7);

          // Screen width breakpoints (approximate container widths)
          const breakpoints = {
            xs: 320,   // Mobile portrait
            sm: 576,   // Mobile landscape
            md: 768,   // Tablet
            lg: 1024,  // Desktop small
            xl: 1280   // Desktop large
          };

          // Calculate columns for each breakpoint
          const calculateColumns = (containerWidth) => {
            const availableWidth = containerWidth - 32; // Account for padding
            const cols = Math.floor(availableWidth / estimatedItemWidth);
            return Math.max(1, Math.min(cols, options.length));
          };

          const layout = {
            xs: calculateColumns(breakpoints.xs),
            sm: calculateColumns(breakpoints.sm),
            md: calculateColumns(breakpoints.md),
            lg: calculateColumns(breakpoints.lg),
            xl: calculateColumns(breakpoints.xl)
          };

          // Generate responsive grid classes for radio/checkbox
          const gridClasses = [
            `grid gap-1`,
            `grid-cols-${layout.xs}`,
            `sm:grid-cols-${layout.sm}`,
            `md:grid-cols-${layout.md}`,
            `lg:grid-cols-${layout.lg}`,
            `xl:grid-cols-${layout.xl}`
          ].join(' ');

          return { gridClasses, maxLength, estimatedItemWidth };
        };

        const { gridClasses } = calculateRadioLayout(options);

        return (
          <div key={field.id} className="space-y-3">
            <label className="block text-sm font-medium text-foreground/80">
              {field.title}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            <div className={gridClasses}>
              {options.map((option, index) => {
                const optionValue = option.value || option.text || option;
                const optionText = option.text || option.value || option;

                return (
                  <label key={option.id || index} className="flex items-center cursor-pointer py-1 transition-colors" style={{ gap: '4px' }}>
                    <input
                      type={isMultiple ? "checkbox" : "radio"}
                      name={field.id}
                      value={optionValue}
                      checked={
                        isMultiple
                          ? (fieldValue || []).includes(optionValue)
                          : fieldValue === optionValue
                      }
                      onChange={(e) => {
                        if (isMultiple) {
                          const current = fieldValue || [];
                          const newValue = e.target.checked
                            ? [...current, optionValue]
                            : current.filter(item => item !== optionValue);
                          handleInputChange(field.id, newValue);
                        } else {
                          handleInputChange(field.id, optionValue);
                        }
                      }}
                      className="flex-shrink-0"
                      style={{
                        width: '13px',
                        height: '13px',
                        margin: '0',
                        padding: '0',
                        border: 'none',
                        outline: 'none',
                        boxShadow: 'none',
                        appearance: 'auto',
                        accentColor: '#f97316'
                      }}
                      onFocus={(e) => {
                        e.target.style.outline = 'none';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <span className="text-foreground/80 flex-1 text-xs truncate">{optionText}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );

      case 'rating':
        const maxRating = field.options?.maxRating || 5;
        const currentRating = parseInt(fieldValue) || 0;

        return (
          <div key={field.id} className="space-y-2">
            <label className="block text-sm font-medium text-foreground/80">
              {field.title}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            <div className="flex gap-1">
              {[...Array(maxRating)].map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleInputChange(field.id, index + 1)}
                  className={`p-1 transition-colors ${
                    index < currentRating
                      ? 'text-yellow-400 hover:text-yellow-500'
                      : 'text-muted-foreground/40 hover:text-yellow-300'
                  }`}
                >
                  <FontAwesomeIcon icon={faStar} className="w-6 h-6" />
                </button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground">
                {currentRating > 0 ? `${currentRating}/${maxRating}` : 'ยังไม่ได้เลือก'}
              </span>
            </div>
          </div>
        );

      case 'slider':
        const min = field.options?.min || 0;
        const max = field.options?.max || 100;
        const step = field.options?.step || 1;
        const currentValue = fieldValue !== undefined && fieldValue !== null ? Number(fieldValue) : min;

        return (
          <div key={field.id}>
            <EnhancedFormSlider
              value={currentValue}
              onValueChange={(value) => handleInputChange(field.id, value[0])}
              min={min}
              max={max}
              step={step}
              label={field.title}
              required={field.required}
              description={field.description}
              disabled={submitting}
            />
          </div>
        );

      case 'file_upload':
      case 'image_upload':
        const fieldFiles = uploadedFiles.find(f => f.fieldId === field.id)?.files || [];
        const uploadProgress = fileUploadProgress[field.id];

        return (
          <div key={field.id} data-field-id={field.id} className="space-y-3">
            <label className="block text-sm font-medium text-foreground/80">
              {field.title}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>

            {/* File Input */}
            <input
              type="file"
              accept={field.type === 'image_upload' ? 'image/*' : undefined}
              multiple={field.options?.allowMultiple}
              onChange={(e) => handleFileChange(field.id, e.target.files)}
              className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 transition-colors"
              disabled={uploadProgress !== undefined}
            />

            {/* Upload Progress */}
            {uploadProgress !== undefined && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>กำลังอัปโหลด...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Uploaded Files List */}
            {fieldFiles.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  ไฟล์ที่อัปโหลดแล้ว ({fieldFiles.length} ไฟล์)
                </div>
                <div className="space-y-1 sm:space-y-2 max-h-40 sm:max-h-48 overflow-y-auto">
                  {fieldFiles.map((file, index) => (
                    <div
                      key={file.id || index}
                      className="flex items-center justify-between p-2 sm:p-3 bg-muted/20 rounded-lg border border-border/40"
                    >
                      <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                        {/* File Icon/Preview */}
                        <div className="flex-shrink-0">
                          {file.isImage ? (
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          ) : (
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-muted/40 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 sm:w-6 sm:h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs sm:text-sm font-medium text-foreground truncate">
                            {file.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)} • {file.type}
                          </div>
                          {file.uploadedAt && (
                            <div className="text-xs text-muted-foreground">
                              {new Date(file.uploadedAt).toLocaleString('th-TH')}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                        {/* Download Button */}
                        <button
                          type="button"
                          onClick={() => FileService.downloadFile(file.id)}
                          className="p-1 sm:p-2 text-muted-foreground hover:text-primary transition-colors"
                          title="ดาวน์โหลด"
                        >
                          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>

                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={() => handleFileRemove(field.id, file.id)}
                          className="p-1 sm:p-2 text-muted-foreground hover:text-destructive transition-colors"
                          title="ลบไฟล์"
                        >
                          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Validation Error */}
            <FieldErrorAlert error={isFieldTouched && fieldError ? fieldError : null} />
          </div>
        );

      case 'lat_long':
        return (
          <div key={field.id} className="space-y-2">
            <label className="block text-sm font-medium text-foreground/80">
              {field.title}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <GlassInput
                type="number"
                step="any"
                placeholder="ละติจูด"
                value={fieldValue?.lat || ''}
                onChange={(e) => handleInputChange(field.id, {
                  ...rawFieldValue,
                  lat: e.target.value
                })}
                className="text-sm sm:text-base"
              />
              <GlassInput
                type="number"
                step="any"
                placeholder="ลองจิจูด"
                value={fieldValue?.lng || ''}
                onChange={(e) => handleInputChange(field.id, {
                  ...rawFieldValue,
                  lng: e.target.value
                })}
                className="text-sm sm:text-base"
              />
            </div>
            <GlassButton
              type="button"
              onClick={() => handleGPSLocation(field.id)}
              variant="secondary"
              className="w-full sm:w-auto"
            >
              <FontAwesomeIcon icon={faMapMarkerAlt} className="w-4 h-4 mr-2" />
              ใช้ตำแหน่งปัจจุบัน
            </GlassButton>
          </div>
        );

      case 'province':
        const provinces = [
          "กรุงเทพมหานคร", "กระบี่", "กาญจนบุรี", "กาฬสินธุ์", "กำแพงเพชร", "ขอนแก่น",
          "จันทบุรี", "ฉะเชิงเทรา", "ชลบุรี", "ชัยนาท", "ชัยภูมิ", "ชุมพร", "เชียงราย",
          "เชียงใหม่", "ตรัง", "ตราด", "ตาก", "นครนายก", "นครปฐม", "นครพนม", "นครราชสีมา",
          "นครศรีธรรมราช", "นครสวรรค์", "นนทบุรี", "นราธิวาส", "น่าน", "บึงกาฬ", "บุรีรัมย์",
          "ปทุมธานี", "ประจวบคีรีขันธ์", "ปราจีนบุรี", "ปัตตานี", "พระนครศรีอยุธยา", "พังงา",
          "พัทลุง", "พิจิตร", "พิษณุโลก", "เพชรบุรี", "เพชรบูรณ์", "แพร่", "พะเยา", "ภูเก็ต",
          "มหาสารคาม", "มุกดาหาร", "แม่ฮ่องสอน", "ยะลา", "ยโสธร", "ร้อยเอ็ด", "ระนอง", "ระยอง",
          "ราชบุรี", "ลพบุรี", "ลำปาง", "ลำพูน", "เลย", "ศรีสะเกษ", "สกลนคร", "สงขลา", "สตูล",
          "สมุทรปราการ", "สมุทรสงคราม", "สมุทรสาคร", "สระแก้ว", "สระบุรี", "สิงห์บุรี", "สุโขทัย",
          "สุพรรณบุรี", "สุราษฎร์ธานี", "สุรินทร์", "หนองคาย", "หนองบัวลำภู", "อ่างทอง", "อุดรธานี",
          "อุทัยธานี", "อุตรดิตถ์", "อุบลราชธานี", "อำนาจเจริญ"
        ];

        return (
          <GlassSelect
            key={field.id}
            label={field.title}
            required={field.required}
            value={fieldValue || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          >
            <option value="">เลือกจังหวัด...</option>
            {provinces.map((province, index) => (
              <option key={index} value={province}>{province}</option>
            ))}
          </GlassSelect>
        );

      case 'factory':
        const factories = ['บางปะอิน', 'ระยอง', 'สระบุรี', 'สงขลา'];
        const allowMultipleFactory = field.options?.allowMultiple || false;
        const selectedFactories = Array.isArray(fieldValue) ? fieldValue : (fieldValue ? [fieldValue] : []);

        return (
          <div key={field.id} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {field.title}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </label>
              {field.description && (
                <p className="text-[12px] text-muted-foreground">
                  เลือกโรงงานที่ต้องการ
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {factories.map((factory, idx) => {
                const isSelected = allowMultipleFactory ? selectedFactories.includes(factory) : fieldValue === factory;

                return (
                  <button
                    key={idx}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleFactoryClick(field.id, factory, allowMultipleFactory, fieldValue);
                    }}
                    className={`
                      inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs sm:text-sm font-medium
                      ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2
                      focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none
                      disabled:opacity-50 h-8 sm:h-10 px-2 sm:px-4 py-1 sm:py-2 w-full min-h-[2.5rem] sm:min-h-[3rem] relative overflow-hidden
                      border-2
                      ${isSelected
                        ? 'bg-white text-orange-600 border-orange-600 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-700 shadow-lg shadow-orange-500/25'
                        : 'border-input bg-background hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 dark:hover:bg-orange-900/20 dark:hover:text-orange-200 dark:hover:border-orange-500'
                      }
                    `}
                    aria-pressed={isSelected}
                  >
                    <div className="flex items-center justify-center gap-1 sm:gap-2">
                      {isSelected && (
                        <svg
                          className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600"
                          fill="none"
                          strokeWidth="2"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <polyline points="20,6 9,17 4,12"></polyline>
                        </svg>
                      )}
                      <span className="font-medium text-center">{factory}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {allowMultipleFactory && selectedFactories.length > 0 && (
              <div className="flex items-center gap-2 p-2 sm:p-3 rounded-md bg-muted/50 border">
                <svg
                  className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0"
                  fill="none"
                  strokeWidth="2"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="m9 12 2 2 4-4"></path>
                  <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"></path>
                </svg>
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-medium">เลือกแล้ว {selectedFactories.length} โรงงาน</p>
                  <p className="text-xs text-muted-foreground break-words">
                    {selectedFactories.join(', ')}
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div key={field.id} className="p-4 border border-border/40 rounded-lg bg-muted/20">
            <p className="text-muted-foreground">
              ประเภทฟิลด์ "{field.type}" ยังไม่รองรับในการกรอกข้อมูล
            </p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 flex items-center justify-center">
        <GlassCard className="glass-container">
          <GlassCardContent className="text-center py-8">
            <div className="text-xl font-semibold text-foreground/80">กำลังโหลดข้อมูล...</div>
          </GlassCardContent>
        </GlassCard>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 flex items-center justify-center">
        <GlassCard className="glass-container">
          <GlassCardContent className="text-center py-8">
            <div className="text-xl font-semibold text-destructive">ไม่พบฟอร์มที่ระบุ</div>
            {onCancel && (
              <GlassButton onClick={onCancel} className="mt-4">
                กลับ
              </GlassButton>
            )}
          </GlassCardContent>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90">
      <div className="container-responsive px-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-2 sm:py-3">

        {/* Form Header - Outside Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto mb-4 sm:mb-6"
        >
          <div className="text-left">
            <h1 className="text-lg sm:text-xl font-bold text-primary mb-3 sm:mb-4 leading-tight">
              {form.title}
            </h1>
            {form.description && (
              <div className="mb-3 sm:mb-4">
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {form.description}
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Form Fields Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-3xl mx-auto mb-6 sm:mb-8"
        >
          <GlassCard className="glass-container">
            <div className="p-3 sm:p-4">

              <div className="space-y-3 sm:space-y-4 lg:space-y-6">
                {/* Main Form Fields */}
                {form.fields?.map(field => renderField(field))}
              </div>

              {/* Storage Usage Indicator */}
              {storageUsage && (
                <div className="mt-4 pt-4 border-t border-border/20">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>การใช้งานพื้นที่จัดเก็บ:</span>
                    <span className={`font-medium ${storageUsage.isNearLimit ? 'text-orange-500' : 'text-foreground'}`}>
                      {storageUsage.totalSizeMB}MB / 8MB
                      {storageUsage.totalFiles > 0 && (
                        <span className="ml-2">({storageUsage.totalFiles} ไฟล์)</span>
                      )}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        storageUsage.isNearLimit ? 'bg-orange-500' : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min((parseFloat(storageUsage.totalSizeMB) / 8) * 100, 100)}%` }}
                    />
                  </div>

                  {storageUsage.isNearLimit && (
                    <div className="mt-2 text-xs text-orange-500">
                      เตือน: พื้นที่จัดเก็บใกล้เต็ม ไฟล์ขนาดใหญ่อาจอัปโหลดไม่ได้
                    </div>
                  )}
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>

      </div>
    </div>
  );
});

export default FormView;