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
import submissionService from '../services/SubmissionService.js';
import fileServiceAPI from '../services/FileService.api.js';
import apiClient from '../services/ApiClient';
import { getFileStreamURL } from '../config/api.config.js';

// Utilities
import { formatNumberInput, parseNumberInput, isValidNumber } from '../utils/numberFormatter.js';
import { formulaEngine } from '../utils/formulaEngine.js';
import { useConditionalVisibility } from '../hooks/useConditionalVisibility.js';
import { useStorage } from '../contexts/StorageContext.jsx';
import { useDelayedLoading } from '../hooks/useDelayedLoading';

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
  const [filesToDelete, setFilesToDelete] = useState([]); // ✅ Track files to delete on save
  const [imageBlobUrls, setImageBlobUrls] = useState({}); // ✅ Authenticated blob URLs for images { fileId: blobUrl }

  // Enhanced toast notifications
  const toast = useEnhancedToast();

  // Storage configuration
  const { config: storageConfig } = useStorage();

  // Delayed loading to prevent screen flickering
  const showLoading = useDelayedLoading(loading, 1000);

  // Update storage usage
  const updateStorageUsage = useCallback(async () => {
    try {
      const stats = await fileServiceAPI.getFileStatistics();
      const totalSizeMB = (stats.totalSize || 0) / (1024 * 1024);
      const maxStorage = storageConfig.maxStorageSize || 10;
      const usedPercentage = (totalSizeMB / maxStorage) * 100;
      const isNearLimit = usedPercentage >= (storageConfig.warningThreshold || 80);

      setStorageUsage({
        totalSizeMB: totalSizeMB.toFixed(2),
        totalFiles: stats.totalFiles || 0,
        maxStorage,
        usedPercentage: usedPercentage.toFixed(1),
        isNearLimit
      });
    } catch (error) {
      console.error('Error fetching storage usage:', error);
      // Fallback to default values
      setStorageUsage({
        totalSizeMB: '0.00',
        totalFiles: 0,
        maxStorage: storageConfig.maxStorageSize || 10,
        usedPercentage: '0',
        isNearLimit: false
      });
    }
  }, [storageConfig]);

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
    // updateStorageUsage(); // Temporarily disabled - files table not yet created
  }, [formId, submissionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Expose handleSubmit function to parent component via ref
  useImperativeHandle(ref, () => ({
    handleSubmit
  }));

  const loadFormData = async () => {
    setLoading(true);
    try {
      // Load form from API
      const response = await apiClient.getForm(formId);
      const loadedForm = response.data?.form || response.data;
      if (!loadedForm) {
        console.error('Form not found:', formId);
        toast.error('ไม่พบฟอร์มที่ต้องการ', {
          title: 'เกิดข้อผิดพลาด',
          duration: 5000
        });
        return;
      }
      setForm(loadedForm);

      // ✅ Apply initial values for new form (no submissionId)
      if (!submissionId) {
        console.log('🎯 Applying initial values for new form');
        const initialFormData = {};

        // Process all fields (including sub-form fields)
        const allFields = [
          ...(loadedForm.fields || []),
          ...(loadedForm.subForms || []).flatMap(sf => sf.fields || [])
        ];

        allFields.forEach(field => {
          const initialValue = field.options?.initialValue;

          if (!initialValue) return; // Skip if no initial value

          let value = null;

          // Handle different field types
          if (field.type === 'date') {
            if (initialValue.type === 'dynamic' && initialValue.formula === 'Today()') {
              // Today's date in YYYY-MM-DD format
              const today = new Date();
              value = today.toISOString().split('T')[0];
              console.log(`  ✅ ${field.title}: Today() = ${value}`);
            } else if (initialValue.type === 'static') {
              value = initialValue.value;
              console.log(`  ✅ ${field.title}: Static date = ${value}`);
            }
          } else if (field.type === 'time') {
            if (initialValue.type === 'dynamic' && initialValue.formula === 'Now()') {
              // Current time in HH:MM format
              const now = new Date();
              value = now.toTimeString().slice(0, 5);
              console.log(`  ✅ ${field.title}: Now() = ${value}`);
            } else if (initialValue.type === 'static') {
              value = initialValue.value;
              console.log(`  ✅ ${field.title}: Static time = ${value}`);
            }
          } else if (field.type === 'datetime') {
            if (initialValue.type === 'dynamic' && initialValue.formula === 'Now()') {
              // Current datetime in YYYY-MM-DDTHH:MM format
              const now = new Date();
              value = now.toISOString().slice(0, 16);
              console.log(`  ✅ ${field.title}: Now() = ${value}`);
            } else if (initialValue.type === 'static') {
              value = initialValue.value;
              console.log(`  ✅ ${field.title}: Static datetime = ${value}`);
            }
          } else if (field.type === 'multiple_choice') {
            // For multiple choice, initialValue can be string or array
            value = initialValue;
            console.log(`  ✅ ${field.title}: Multiple choice = ${JSON.stringify(value)}`);
          } else if (field.type === 'lat_long') {
            // For lat_long, initialValue is { lat, lng }
            if (initialValue.lat && initialValue.lng) {
              value = initialValue;
              console.log(`  ✅ ${field.title}: Coordinates = ${initialValue.lat}, ${initialValue.lng}`);
            }
          } else {
            // For other types (text, number, rating, slider, etc.)
            value = initialValue;
            console.log(`  ✅ ${field.title}: ${value}`);
          }

          if (value !== null && value !== undefined && value !== '') {
            initialFormData[field.id] = value;
          }
        });

        console.log('📋 Initial Form Data:', initialFormData);
        setFormData(initialFormData);
      }

      // Load existing submission for editing
      if (submissionId) {
        try {
          console.log('📥 Loading existing submission:', submissionId);
          const response = await apiClient.getSubmission(submissionId);
          console.log('📊 Submission API Response:', response);

          // Extract submission from response.data.submission
          const submission = response.data?.submission || response.data;
          console.log('📝 Submission Data:', submission);

          if (submission && submission.data) {
            // Map submission data: { field_id: { value, ... } } -> { field_id: value }
            const mappedData = {};
            Object.keys(submission.data).forEach(fieldId => {
              const fieldData = submission.data[fieldId];
              mappedData[fieldId] = fieldData?.value;
            });
            console.log('🎯 Mapped Form Data:', mappedData);
            setFormData(mappedData);

            // Load existing files from MinIO API
            try {
              console.log('🔍 Loading files for submission:', submissionId);
              const existingFiles = await fileServiceAPI.getSubmissionFiles(submissionId);
              console.log('📂 Files from API:', existingFiles);

              // 🔍 CRITICAL FIX: Get list of main form field IDs (exclude sub-form fields)
              // ✅ Use loadedForm.fields (freshly loaded data) to avoid null reference
              const mainFormFieldIds = loadedForm.fields
                .filter(field => !field.sub_form_id && !field.subFormId)
                .map(field => field.id);
              console.log('🎯 Main form field IDs:', mainFormFieldIds);

              // ✅ Filter files to only include main form files (exclude sub-form files)
              const mainFormFiles = existingFiles.filter(file =>
                mainFormFieldIds.includes(file.fieldId || file.field_id)
              );
              console.log(`📋 Filtered ${mainFormFiles.length} main form files (from ${existingFiles.length} total)`);

              const filesByField = {};

              // ✅ Process each file and get fresh presigned URL
              for (const file of mainFormFiles) {
                console.log('📄 Processing file:', {
                  id: file.id,
                  fieldId: file.fieldId,
                  originalName: file.originalName,
                  filename: file.filename,
                  mimeType: file.mimeType,
                  size: file.size,
                  hasPresignedUrl: !!file.presignedUrl
                });

                if (!filesByField[file.fieldId]) {
                  filesByField[file.fieldId] = [];
                }

                // ✅ Get fresh presigned URL for each file
                let presignedUrl = file.presignedUrl || file.url;
                try {
                  // Fetch fresh URL to ensure it's not expired
                  const fileWithUrl = await fileServiceAPI.getFileWithUrl(file.id);
                  presignedUrl = fileWithUrl.presignedUrl || fileWithUrl.downloadUrl;
                  console.log('✅ Got fresh presigned URL for file:', file.id);
                } catch (urlError) {
                  console.warn('⚠️ Failed to get fresh URL for file:', file.id, urlError);
                }

                filesByField[file.fieldId].push({
                  id: file.id,
                  name: file.originalName || file.filename || file.name || 'ไฟล์ที่แนบ',
                  type: file.mimeType || file.mime_type || 'application/octet-stream',
                  size: file.size || 0,
                  uploadedAt: file.uploadedAt,
                  isImage: fileServiceAPI.isImage(file.mimeType || file.mime_type),
                  presignedUrl: presignedUrl
                });
              }

              console.log('📋 Files by field:', filesByField);

              // Convert to uploadedFiles format
              const uploadedFilesData = Object.keys(filesByField).map(fieldId => ({
                fieldId,
                files: filesByField[fieldId]
              }));
              console.log('✅ Final uploadedFiles:', uploadedFilesData);
              setUploadedFiles(uploadedFilesData);
            } catch (error) {
              console.error('❌ Error loading existing files:', error);
              setUploadedFiles([]);
            }
          }
        } catch (apiError) {
          console.error('Failed to load submission from API:', apiError);
          toast.error('ไม่สามารถโหลดข้อมูลการส่งฟอร์มจาก API ได้', {
            title: 'เกิดข้อผิดพลาด',
            duration: 5000
          });
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
            let urlToValidate = value.trim();
            if (!/^https?:\/\//i.test(urlToValidate)) {
              // Add https:// prefix if no protocol specified
              urlToValidate = 'https://' + urlToValidate;
            }
            // Validate URL format
            new URL(urlToValidate);
            // If validation passes, update the value to include protocol
            // This makes sure the saved value always has a protocol
          } catch {
            return 'รูปแบบ URL ไม่ถูกต้อง (ตัวอย่าง: www.google.com หรือ https://www.google.com)';
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
      // Default visibility is true (always show if no condition)
      let isVisible = true;

      // ✅ v0.7.40: Field Visibility Logic
      // enabled === false → Has condition, evaluate formula
      // enabled === true or undefined → Always show (default)

      if (field.showCondition?.enabled === false) {
        // Has condition → Evaluate formula
        if (field.showCondition?.formula && field.showCondition.formula.trim() !== '') {
          try {
            isVisible = formulaEngine.evaluate(
              field.showCondition.formula,
              currentFormData,
              fieldMap
            );
            console.log(`Field "${field.title}" visibility from formula: ${isVisible}`);
          } catch (error) {
            console.warn(`Error evaluating show condition for field ${field.title}:`, error);
            // Default to hidden on error when has condition
            isVisible = false;
          }
        } else {
          // Condition enabled but no formula → Hide by default
          isVisible = false;
          console.log(`Field "${field.title}" hidden: condition enabled but no formula`);
        }
      }
      // If enabled === true or undefined → Always visible (default isVisible = true)

      newVisibility[field.id] = isVisible;
    });

    setFieldVisibility(newVisibility);
  }, [form]);

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

  // Update field visibility when form data changes
  useEffect(() => {
    updateFieldVisibility(formData);
  }, [formData, updateFieldVisibility]);

  // ✅ Load authenticated image blob URLs for display
  useEffect(() => {
    const loadAuthenticatedImages = async () => {
      const token = localStorage.getItem('q-collector-auth-token');
      if (!token) {
        console.warn('⚠️ No auth token found, skipping image loading');
        return;
      }

      const newBlobUrls = {};

      // Iterate through all uploaded files
      for (const fieldGroup of uploadedFiles) {
        for (const file of fieldGroup.files) {
          // Only load images that don't already have blob URLs
          if (file.isImage && file.id && !imageBlobUrls[file.id]) {
            try {
              console.log(`🔄 Loading authenticated image: ${file.id}`);
              const streamUrl = getFileStreamURL(file.id);
              const response = await fetch(streamUrl, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (response.ok) {
                const blob = await response.blob();
                newBlobUrls[file.id] = URL.createObjectURL(blob);
                console.log(`✅ Loaded image blob URL for: ${file.id}`);
              } else {
                console.error(`❌ Failed to load image ${file.id}: ${response.status} ${response.statusText}`);
              }
            } catch (error) {
              console.error(`❌ Error loading image ${file.id}:`, error);
            }
          }
        }
      }

      // Update state with new blob URLs
      if (Object.keys(newBlobUrls).length > 0) {
        setImageBlobUrls(prev => ({ ...prev, ...newBlobUrls }));
      }
    };

    loadAuthenticatedImages();

    // Cleanup blob URLs on unmount
    return () => {
      Object.values(imageBlobUrls).forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [uploadedFiles]); // Re-run when uploadedFiles changes

  const handleFileChange = async (fieldId, files) => {
    if (!files || files.length === 0) return;

    // Show progress for this field
    setFileUploadProgress(prev => ({ ...prev, [fieldId]: 0 }));

    try {
      const fileArray = Array.from(files);
      const currentSubmissionId = submissionId || null; // MinIO API handles null submission IDs

      // Upload files using MinIO API
      const results = await fileServiceAPI.uploadMultipleFiles(
        fileArray,
        currentSubmissionId,
        fieldId,
        (progress) => {
          setFileUploadProgress(prev => ({ ...prev, [fieldId]: progress }));
        }
      );

      // Process successful uploads
      const successfulFiles = results
        .filter(result => result.success)
        .map(result => ({
          id: result.file.id,
          name: result.file.originalName,
          type: result.file.mimeType,
          size: result.file.size,
          uploadedAt: result.file.uploadedAt,
          isImage: fileServiceAPI.isImage(result.file.mimeType),
          presignedUrl: result.file.presignedUrl // Store presigned URL for immediate display
        }));

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
        await updateStorageUsage();
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

  const handleFileRemove = (fieldId, fileId) => {
    // ✅ STAGED DELETION: Don't delete immediately, mark for deletion on save
    setFilesToDelete(prev => [...prev, fileId]);

    // Update uploadedFiles state (remove from UI)
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

    // ✅ INFO TOAST: Notify user that file will be deleted on save
    toast.info('ไฟล์จะถูกลบเมื่อกดบันทึก', {
      title: "เตรียมลบไฟล์",
      duration: 2000
    });
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

    // ⚠️ CRITICAL FIX: Filter out sub-form fields (sub_form_id !== null)
    // Only validate main form fields
    const mainFormFields = form.fields.filter(field => !field.sub_form_id && !field.subFormId);
    console.log(`Validating ${mainFormFields.length} main form fields (filtered from ${form.fields.length} total fields)`);

    mainFormFields.forEach(field => {
      // Skip validation for hidden fields
      // Check if field is explicitly hidden (fieldVisibility[field.id] === false)
      // Fields without visibility config (undefined) are treated as visible
      const isFieldVisible = fieldVisibility[field.id] !== false;

      if (!isFieldVisible) {
        console.log(`⏭️ Skipping validation for hidden field: ${field.title} (visibility: ${fieldVisibility[field.id]})`);
        return;
      }

      console.log(`✅ Validating visible field: ${field.title} (visibility: ${fieldVisibility[field.id]})`);
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

    // Show "saving" toast notification
    toast.info('อยู่ระหว่างการบันทึกข้อมูล...', {
      title: "กำลังบันทึก",
      duration: 2000
    });

    setSubmitting(true);
    try {
      let result;
      if (submissionId) {
        // Update existing submission
        const flatFiles = uploadedFiles.flatMap(uf =>
          uf.files.map(file => ({
            id: file.id,
            fieldId: uf.fieldId,
            name: file.name,
            type: file.type,
            size: file.size
          }))
        );

        // ✅ CRITICAL FIX: Collect visible field IDs for backend validation (same as create)
        const mainFormFields = form.fields.filter(field => !field.sub_form_id && !field.subFormId);
        const visibleFieldIds = mainFormFields
          .filter(field => fieldVisibility[field.id] !== false)
          .map(field => field.id);

        console.log('🔍 DEBUG (UPDATE): Visible Field IDs being sent to backend:', visibleFieldIds);

        result = await submissionService.updateSubmission(formId, submissionId, formData, flatFiles, visibleFieldIds);
      } else {
        // Create new submission
        const flatFiles = uploadedFiles.flatMap(uf =>
          uf.files.map(file => ({
            id: file.id,
            fieldId: uf.fieldId,
            name: file.name,
            type: file.type,
            size: file.size
          }))
        );

        // ✅ CRITICAL FIX: Collect visible field IDs for backend validation
        // Include ALL fields that are visible (visibility !== false)
        // This includes:
        // 1. Fields with no conditional visibility (always visible)
        // 2. Fields with conditional visibility that evaluated to true
        const mainFormFields = form.fields.filter(field => !field.sub_form_id && !field.subFormId);
        const visibleFieldIds = mainFormFields
          .filter(field => fieldVisibility[field.id] !== false)  // Include if visibility is true or undefined (always visible)
          .map(field => field.id);

        console.log('🔍 DEBUG: Total main form fields:', mainFormFields.length);
        console.log('🔍 DEBUG: Field visibility state:', fieldVisibility);
        console.log('🔍 DEBUG: Visible Field IDs being sent to backend:', visibleFieldIds);
        console.log('🔍 DEBUG: Total visible fields:', visibleFieldIds.length);
        console.log('🔍 DEBUG: Hidden fields:', mainFormFields.filter(f => fieldVisibility[f.id] === false).map(f => f.title));

        result = await submissionService.submitForm(formId, formData, flatFiles, visibleFieldIds);
      }

      if (result.success) {
        // ✅ DELETE STAGED FILES: Delete files marked for deletion after successful save
        if (filesToDelete.length > 0) {
          console.log(`🗑️ Deleting ${filesToDelete.length} staged files...`);
          for (const fileId of filesToDelete) {
            try {
              await fileServiceAPI.deleteFile(fileId);
              console.log(`✅ Deleted file: ${fileId}`);
            } catch (error) {
              console.error(`❌ Failed to delete file ${fileId}:`, error);
              // Continue deleting other files even if one fails
            }
          }
          setFilesToDelete([]); // Clear the deletion queue
        }

        // File associations are now handled by the backend via submission_id linkage
        // No need to update file metadata as MinIO files are already uploaded with correct metadata

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
    // ⚠️ IMPORTANT: Only show error if field is visible (use isFieldVisible from line 1038)
    const hasError = hasSubmissionAttempt && field.required && isFieldVisible && validateField(field, rawFieldValue);
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
                        px-2 py-1.5 border-2 text-center focus:outline-none text-xs w-full
                        transition-colors duration-300
                        ${isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border/40 bg-muted/20 text-foreground/80 hover:border-primary/50 hover:bg-primary/5'
                        }
                      `}
                      style={{
                        minHeight: '32px',
                        borderRadius: '0.375rem', // 6px - consistent rounded corners
                        WebkitBorderRadius: '0.375rem',
                        MozBorderRadius: '0.375rem'
                      }}
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
        // ✅ SINGLE FILE MODE: Only show the first file (1 file per field)
        const fieldFiles = uploadedFiles.find(f => f.fieldId === field.id)?.files || [];
        const currentFile = fieldFiles.length > 0 ? fieldFiles[0] : null;
        const uploadProgress = fileUploadProgress[field.id];

        // 🔍 DEBUG: Log rendering state
        console.log(`🎨 Rendering ${field.type} field "${field.title}":`, {
          fieldId: field.id,
          uploadedFilesState: uploadedFiles,
          fieldFiles: fieldFiles,
          currentFile: currentFile,
          uploadProgress: uploadProgress,
          willShowFile: !!(currentFile && !uploadProgress)
        });

        return (
          <div key={field.id} data-field-id={field.id} className="space-y-3">
            <label className="block text-sm font-medium text-foreground/80">
              {field.title}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>

            {/* ✅ File Input - Always visible */}
            <input
              type="file"
              accept={field.type === 'image_upload' ? 'image/*' : undefined}
              onChange={(e) => handleFileChange(field.id, e.target.files)}
              className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 transition-colors"
              disabled={uploadProgress !== undefined}
            />

            {/* ✅ Display current filename next to button area if file exists */}
            {currentFile && !uploadProgress && (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-muted/10">
                {/* File Icon/Preview */}
                {currentFile.isImage && imageBlobUrls[currentFile.id] ? (
                  <img
                    src={imageBlobUrls[currentFile.id]}
                    alt={currentFile.name}
                    className="w-10 h-10 rounded object-cover flex-shrink-0"
                    onError={(e) => {
                      console.error('❌ Image failed to load:', currentFile.id);
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-10 h-10 bg-muted/40 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                )}

                {/* Filename and Size */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {currentFile.name}
                  </div>
                  {currentFile.size && (
                    <div className="text-xs text-muted-foreground">
                      {formatFileSize(currentFile.size)}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Download Button */}
                  {currentFile.presignedUrl && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          // Get file with presigned URL
                          const fileData = await fileServiceAPI.getFileWithUrl(currentFile.id);
                          // Open in new tab without switching focus
                          window.open(fileData.presignedUrl, '_blank', 'noopener,noreferrer');
                        } catch (error) {
                          console.error('Download error:', error);
                          toast.error('ไม่สามารถดาวน์โหลดไฟล์ได้', {
                            title: 'เกิดข้อผิดพลาด',
                            duration: 3000
                          });
                        }
                      }}
                      className="p-2 rounded hover:bg-muted/40 transition-colors"
                      title="ดาวน์โหลด"
                    >
                      <svg className="w-4 h-4 text-muted-foreground hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                  )}

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleFileRemove(field.id, currentFile.id)}
                    className="p-2 rounded hover:bg-destructive/10 transition-colors"
                    title="ลบไฟล์"
                  >
                    <svg className="w-4 h-4 text-muted-foreground hover:text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

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

  // ❌ REMOVED: Full-screen loading page (causes screen flicker)
  // Now use toast notifications instead

  if (!form && !loading) {
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

  // ✅ FIX v0.7.28: Add null check for form before rendering
  if (!form) {
    return null; // Still loading
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
                {/* Main Form Fields - Filter out sub-form fields (sub_form_id !== null) and sort by order */}
                {form.fields
                  ?.filter(field => !field.sub_form_id && !field.subFormId)
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map(field => renderField(field))}
              </div>
            </div>
          </GlassCard>
        </motion.div>

      </div>

      {/* Storage Usage Footer - Fixed at bottom left */}
      {storageUsage && (
        <div className="fixed bottom-4 left-4 z-10">
          <div className="text-xs text-muted-foreground/70" style={{ fontSize: '12px' }}>
            <span>การใช้งานพื้นที่จัดเก็บ: </span>
            <span className={`font-medium ${storageUsage.isNearLimit ? 'text-orange-500' : 'text-muted-foreground'}`}>
              {storageUsage.totalSizeMB}MB / {storageUsage.maxStorage || 8}MB
            </span>
            {storageUsage.totalFiles > 0 && (
              <span className="ml-1">({storageUsage.totalFiles} ไฟล์)</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default FormView;