/**
 * SubFormEditPage - Edit existing sub-form submissions with FormView-style UI
 *
 * Features:
 * - Load existing sub-form submission data
 * - Support ALL field types (lat_long, file_upload, image_upload, rating, slider, etc.)
 * - Pre-fill fields with existing values
 * - FormView-style UI for consistent UX
 * - Save updates to database
 * - File upload/delete support
 * - GPS location support
 * - Theme support (glass/minimal)
 * - Mobile responsive
 *
 * @version 0.7.5
 * @since 2025-10-10
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { GlassCard, GlassCardContent } from '../ui/glass-card';
import { GlassButton } from '../ui/glass-button';
import { GlassInput, GlassTextarea, GlassSelect } from '../ui/glass-input';
import { useEnhancedToast } from '../ui/enhanced-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSave, faArrowLeft, faMapMarkerAlt, faStar
} from '@fortawesome/free-solid-svg-icons';
import ThaiDateInput from '../ui/thai-date-input';
import ThaiDateTimeInput from '../ui/thai-datetime-input';
import ThaiPhoneInput from '../ui/thai-phone-input';
import { FieldErrorAlert } from '../ui/alert';
import EnhancedFormSlider from '../ui/enhanced-form-slider';

// Data services
import fileServiceAPI from '../../services/FileService.api.js';
import submissionService from '../../services/SubmissionService.js';
import apiClient from '../../services/ApiClient';

// Utilities
import { useAuth } from '../../contexts/AuthContext';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';

export default function SubFormEditPage({
  formId,
  submissionId,
  subFormId,
  subSubmissionId,
  onSave,
  onCancel
}) {
  const [form, setForm] = useState(null);
  const [subForm, setSubForm] = useState(null);
  const [existingSubSubmission, setExistingSubSubmission] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [filesToDelete, setFilesToDelete] = useState([]); // ✅ Track files to delete on save
  const [fileUploadProgress, setFileUploadProgress] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [fieldTouched, setFieldTouched] = useState({});

  // Contexts
  const toast = useEnhancedToast();
  const { user } = useAuth();

  // Delayed loading to prevent flickering
  const showLoading = useDelayedLoading(loading, 1000);

  // Load existing files from backend
  const loadExistingFiles = async (subFormData, extractedData) => {
    try {
      const filesDataArray = [];

      // Loop through all fields to find file_upload and image_upload types
      for (const field of subFormData.fields) {
        if (field.type === 'file_upload' || field.type === 'image_upload') {
          const fieldValue = extractedData[field.id];

          if (fieldValue) {
            // fieldValue can be an array of file IDs or a single file ID
            const fileIds = Array.isArray(fieldValue) ? fieldValue : [fieldValue];

            if (fileIds.length > 0) {
              console.log(`📁 Loading files for field ${field.id}:`, fileIds);

              // Fetch file metadata from backend
              const filePromises = fileIds.map(fileId =>
                fileServiceAPI.getFileWithUrl(fileId).catch(err => {
                  console.error(`Failed to load file ${fileId}:`, err);
                  return null;
                })
              );

              const fileResults = await Promise.all(filePromises);
              const validFiles = fileResults.filter(f => f !== null);

              if (validFiles.length > 0) {
                filesDataArray.push({
                  fieldId: field.id,
                  files: validFiles.map(file => ({
                    id: file.id,
                    name: file.originalName || file.name,
                    type: file.mimeType || file.type,
                    size: file.size,
                    uploadedAt: file.uploadedAt,
                    isImage: fileServiceAPI.isImage(file.mimeType || file.type),
                    presignedUrl: file.presignedUrl || file.url
                  }))
                });

                console.log(`✅ Loaded ${validFiles.length} files for field ${field.id}`);
              }
            }
          }
        }
      }

      if (filesDataArray.length > 0) {
        setUploadedFiles(filesDataArray);
        console.log('✅ Total uploaded files loaded:', filesDataArray);
      }
    } catch (error) {
      console.error('Error loading existing files:', error);
      // Don't show error toast - this is not critical
    }
  };

  // Load sub-form and submission data
  useEffect(() => {
    loadSubFormData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, subFormId, subSubmissionId]);

  const loadSubFormData = async () => {
    setLoading(true);
    try {
      // Load main form from API
      const formResponse = await apiClient.getForm(formId);
      const formData = formResponse.data?.form || formResponse.data;
      if (!formData) {
        toast.error('ไม่พบแบบฟอร์มหลัก', { title: 'ข้อผิดพลาด' });
        if (onCancel) onCancel();
        return;
      }
      setForm(formData);

      // Find sub-form
      const subFormData = formData.subForms?.find(sf => sf.id === subFormId);
      if (!subFormData) {
        toast.error('ไม่พบฟอร์มย่อย', { title: 'ข้อผิดพลาด' });
        if (onCancel) onCancel();
        return;
      }
      setSubForm(subFormData);

      // Load existing sub-submission from API
      const subSubmissionResponse = await apiClient.get(`/subforms/${subFormId}/submissions/${subSubmissionId}`);
      const subSubmission = subSubmissionResponse.data?.submission || subSubmissionResponse.data;

      console.log('🔍 [SubFormEditPage] Loaded submission:', subSubmission);

      if (!subSubmission) {
        toast.error('ไม่พบข้อมูลฟอร์มย่อยที่ต้องการแก้ไข', { title: 'ข้อผิดพลาด' });
        if (onCancel) onCancel();
        return;
      }
      setExistingSubSubmission(subSubmission);

      // ✅ Extract actual values from wrapper objects
      // Backend returns: {fieldId: {fieldId, fieldTitle, fieldType, value}}
      if (subSubmission.data && typeof subSubmission.data === 'object') {
        const extractedData = {};

        for (const [fieldId, fieldWrapper] of Object.entries(subSubmission.data)) {
          // Check if it's a wrapper object with 'value' property
          if (fieldWrapper && typeof fieldWrapper === 'object' && 'value' in fieldWrapper) {
            let value = fieldWrapper.value;

            // ✅ Special handling for lat_long fields
            // If value is a string that looks like JSON, parse it
            if (fieldWrapper.fieldType === 'lat_long' && typeof value === 'string' && value.trim().startsWith('{')) {
              try {
                value = JSON.parse(value);
                console.log(`🗺️ Parsed lat_long value for ${fieldId}:`, value);
              } catch (e) {
                console.warn(`Failed to parse lat_long value for ${fieldId}:`, value);
              }
            }

            extractedData[fieldId] = value;
            console.log(`✅ Extracted value for ${fieldId} (type: ${fieldWrapper.fieldType}):`, value);
          } else {
            // If it's not a wrapper, use the value directly
            extractedData[fieldId] = fieldWrapper;
          }
        }

        console.log('🔍 [SubFormEditPage] Extracted form data:', extractedData);
        setFormData(extractedData);

        // ✅ Load existing files for file_upload and image_upload fields
        await loadExistingFiles(subFormData, extractedData);
      }

    } catch (error) {
      console.error('Error loading sub-form data:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล', { title: 'ข้อผิดพลาด' });
      if (onCancel) onCancel();
    } finally {
      setLoading(false);
    }
  };

  // Check if user can edit
  const canEdit = async () => {
    if (!user || !existingSubSubmission) return false;

    // Admin can edit all submissions
    if (['super_admin', 'admin'].includes(user.role)) return true;

    // User can edit their own submission
    try {
      const parentResponse = await apiClient.getSubmission(submissionId);
      const parentSubmission = parentResponse.data?.submission || parentResponse.data;
      return parentSubmission && (
        parentSubmission.userId === user.id ||
        parentSubmission.createdBy === user.email
      );
    } catch (error) {
      console.error('Error checking edit permission:', error);
      return false;
    }
  };

  // Validation
  const validateField = (field, value) => {
    const isEmpty = (val) => {
      if (val === null || val === undefined) return true;
      if (typeof val === 'string') return val.trim() === '';
      if (Array.isArray(val)) return val.length === 0;
      if (typeof val === 'object') {
        if (field.type === 'lat_long') {
          // ✅ Support both {lat, lng} and {x, y} formats
          const hasLatLng = val.lat !== undefined && val.lng !== undefined;
          const hasXY = val.x !== undefined && val.y !== undefined;
          return !hasLatLng && !hasXY;
        }
        return Object.keys(val).length === 0;
      }
      return false;
    };

    // ✅ Special validation for file_upload and image_upload fields
    if (field.type === 'file_upload' || field.type === 'image_upload') {
      if (field.required) {
        // Check if there are files in uploadedFiles state
        const fieldFiles = uploadedFiles.find(f => f.fieldId === field.id);
        const hasFiles = fieldFiles && fieldFiles.files && fieldFiles.files.length > 0;

        if (!hasFiles) {
          return 'ฟิลด์นี้จำเป็นต้องกรอก';
        }
      }
      return '';
    }

    if (field.required && isEmpty(value)) {
      return 'ฟิลด์นี้จำเป็นต้องกรอก';
    }

    return '';
  };

  // Handle input change
  const handleInputChange = useCallback((fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));

    // Mark field as touched
    setFieldTouched(prev => ({
      ...prev,
      [fieldId]: true
    }));

    // Validate field
    const field = subForm?.fields.find(f => f.id === fieldId);
    if (field) {
      const error = validateField(field, value);
      setFieldErrors(prev => ({
        ...prev,
        [fieldId]: error
      }));
    }
  }, [subForm]);

  // Handle GPS location
  const handleGPSLocation = async (fieldId) => {
    try {
      const position = await submissionService.getCurrentPosition();
      handleInputChange(fieldId, {
        lat: position.lat,
        lng: position.lng
      });
      toast.success('ได้รับตำแหน่งปัจจุบันแล้ว', { title: 'GPS สำเร็จ', duration: 3000 });
    } catch (error) {
      console.error('GPS error:', error);
      toast.error(error.message || 'ไม่สามารถรับตำแหน่ง GPS ได้', {
        title: 'GPS ล้มเหลว',
        duration: 5000
      });
    }
  };

  // Handle file change
  const handleFileChange = async (fieldId, files) => {
    if (!files || files.length === 0) return;

    setFileUploadProgress(prev => ({ ...prev, [fieldId]: 0 }));

    try {
      const fileArray = Array.from(files);
      const results = await fileServiceAPI.uploadMultipleFiles(
        fileArray,
        subSubmissionId,
        fieldId,
        (progress) => {
          setFileUploadProgress(prev => ({ ...prev, [fieldId]: progress }));
        }
      );

      const successfulFiles = results
        .filter(result => result.success)
        .map(result => ({
          id: result.file.id,
          name: result.file.originalName,
          type: result.file.mimeType,
          size: result.file.size,
          uploadedAt: result.file.uploadedAt,
          isImage: fileServiceAPI.isImage(result.file.mimeType),
          presignedUrl: result.file.presignedUrl
        }));

      if (successfulFiles.length > 0) {
        const updatedFiles = [...uploadedFiles];
        const existingIndex = updatedFiles.findIndex(f => f.fieldId === fieldId);

        if (existingIndex >= 0) {
          const existingFiles = updatedFiles[existingIndex].files || [];
          updatedFiles[existingIndex] = {
            fieldId,
            files: [...existingFiles, ...successfulFiles]
          };
        } else {
          updatedFiles.push({ fieldId, files: successfulFiles });
        }

        setUploadedFiles(updatedFiles);

        const fieldFiles = updatedFiles.find(f => f.fieldId === fieldId);
        const allFileIds = fieldFiles ? fieldFiles.files.map(f => f.id) : [];
        handleInputChange(fieldId, allFileIds);

        // ✅ Clear validation error manually after successful upload
        setFieldErrors(prev => ({
          ...prev,
          [fieldId]: ''
        }));

        toast.success(`อัปโหลด ${successfulFiles.length} ไฟล์เรียบร้อยแล้ว`, {
          title: 'อัปโหลดสำเร็จ',
          duration: 3000
        });
      }
    } catch (error) {
      console.error('File upload error:', error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์', {
        title: 'อัปโหลดล้มเหลว',
        duration: 5000
      });
    } finally {
      setFileUploadProgress(prev => {
        const updated = { ...prev };
        delete updated[fieldId];
        return updated;
      });
    }
  };

  // Handle file remove - Stage for deletion (will be deleted on save)
  const handleFileRemove = (fieldId, fileId) => {
    // Remove from UI immediately for instant feedback
    const updatedFiles = uploadedFiles.map(field => {
      if (field.fieldId === fieldId) {
        const updatedFieldFiles = field.files.filter(file => file.id !== fileId);
        return { ...field, files: updatedFieldFiles };
      }
      return field;
    }).filter(field => field.files.length > 0);

    setUploadedFiles(updatedFiles);

    // Update formData to reflect current file list
    const fieldFiles = updatedFiles.find(f => f.fieldId === fieldId);
    const fileIds = fieldFiles ? fieldFiles.files.map(f => f.id) : [];
    handleInputChange(fieldId, fileIds);

    // ✅ Stage file for deletion (will be deleted when user clicks save)
    setFilesToDelete(prev => [...prev, fileId]);

    toast.info('ไฟล์จะถูกลบเมื่อกดบันทึก', {
      title: 'เตรียมลบไฟล์',
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

  // Validate all fields
  const validateAllFields = () => {
    const errors = {};
    let hasErrors = false;

    subForm.fields.forEach(field => {
      const value = formData[field.id];
      const error = validateField(field, value);

      if (error) {
        errors[field.id] = error;
        hasErrors = true;
      }
    });

    if (hasErrors) {
      setFieldErrors(errors);
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน', { title: 'ข้อมูลไม่ครบถ้วน', duration: 5000 });
      return false;
    }

    return true;
  };

  // Handle submission
  const handleSubmit = async () => {
    if (!(await canEdit())) {
      toast.error('คุณไม่มีสิทธิ์แก้ไขข้อมูลนี้', { title: 'ไม่มีสิทธิ์' });
      return;
    }

    if (!validateAllFields()) {
      return;
    }

    toast.info('อยู่ระหว่างการบันทึกข้อมูล...', { title: 'กำลังบันทึก', duration: 2000 });

    setSubmitting(true);

    try {
      // Update sub-submission using API
      const updateResponse = await apiClient.put(`/subforms/${subFormId}/submissions/${subSubmissionId}`, {
        data: formData,
        updatedAt: new Date().toISOString()
      });

      const updatedSubSubmission = updateResponse.data?.submission || updateResponse.data;

      if (!updatedSubSubmission) {
        throw new Error('Failed to update sub-form submission');
      }

      // ✅ Delete staged files after successful save
      if (filesToDelete.length > 0) {
        console.log(`🗑️ Deleting ${filesToDelete.length} staged files...`);
        const deletePromises = filesToDelete.map(fileId =>
          fileServiceAPI.deleteFile(fileId).catch(err => {
            console.error(`Failed to delete file ${fileId}:`, err);
            return null;
          })
        );
        await Promise.all(deletePromises);
        setFilesToDelete([]); // Clear staged deletions
        console.log('✅ Staged files deleted successfully');
      }

      toast.success('บันทึกการแก้ไขข้อมูลฟอร์มย่อยเรียบร้อยแล้ว', {
        title: 'สำเร็จ',
        duration: 3000
      });

      if (onSave) {
        onSave(updatedSubSubmission, true);
      }

    } catch (error) {
      console.error('Error updating sub-form submission:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล', {
        title: 'ข้อผิดพลาด',
        description: error.message
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Factory button click handler
  const handleFactoryClick = useCallback((fieldId, factory, allowMultiple, currentValue) => {
    if (allowMultiple) {
      const selectedFactories = Array.isArray(currentValue) ? currentValue : (currentValue ? [currentValue] : []);
      const newSelection = selectedFactories.includes(factory)
        ? selectedFactories.filter(f => f !== factory)
        : [...selectedFactories, factory];
      handleInputChange(fieldId, newSelection);
    } else {
      handleInputChange(fieldId, factory);
    }
  }, [handleInputChange]);

  // Render field based on field type
  const renderField = (field) => {
    const fieldValue = formData[field.id];
    const hasError = fieldTouched[field.id] && fieldErrors[field.id];
    const uploadProgress = fileUploadProgress[field.id];

    switch (field.type) {
      case 'short_answer':
      case 'email':
      case 'url':
        return (
          <div key={field.id} data-field-id={field.id} className="space-y-2">
            <GlassInput
              label={field.title}
              type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
              required={field.required}
              placeholder={field.placeholder || `กรอก${field.title}`}
              value={fieldValue || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              hasValidationError={hasError}
              className="text-sm sm:text-base"
            />
            <FieldErrorAlert error={hasError ? fieldErrors[field.id] : null} />
          </div>
        );

      case 'phone':
        return (
          <div key={field.id} data-field-id={field.id}>
            <ThaiPhoneInput
              label={field.title}
              required={field.required}
              placeholder={field.placeholder || "XXX-XXX-XXXX"}
              value={fieldValue || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              hasValidationError={hasError}
            />
            <FieldErrorAlert error={hasError ? fieldErrors[field.id] : null} />
          </div>
        );

      case 'paragraph':
        return (
          <div key={field.id} data-field-id={field.id}>
            <GlassTextarea
              label={field.title}
              required={field.required}
              placeholder={field.placeholder || `กรอก${field.title}`}
              value={fieldValue || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              rows={4}
              hasValidationError={hasError}
            />
            <FieldErrorAlert error={hasError ? fieldErrors[field.id] : null} />
          </div>
        );

      case 'number':
        return (
          <div key={field.id} data-field-id={field.id}>
            <GlassInput
              type="number"
              label={field.title}
              required={field.required}
              placeholder={field.placeholder || `กรอก${field.title}`}
              value={fieldValue || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              hasValidationError={hasError}
            />
            <FieldErrorAlert error={hasError ? fieldErrors[field.id] : null} />
          </div>
        );

      case 'date':
        return (
          <div key={field.id} data-field-id={field.id}>
            <ThaiDateInput
              label={field.title}
              required={field.required}
              placeholder={field.placeholder || "DD/MM/YYYY"}
              value={fieldValue}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              hasValidationError={hasError}
            />
            <FieldErrorAlert error={hasError ? fieldErrors[field.id] : null} />
          </div>
        );

      case 'time':
        return (
          <div key={field.id} data-field-id={field.id}>
            <GlassInput
              type="time"
              label={field.title}
              required={field.required}
              value={fieldValue || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              hasValidationError={hasError}
            />
            <FieldErrorAlert error={hasError ? fieldErrors[field.id] : null} />
          </div>
        );

      case 'datetime':
        return (
          <div key={field.id} data-field-id={field.id}>
            <ThaiDateTimeInput
              label={field.title}
              required={field.required}
              placeholder={field.placeholder || "DD/MM/YYYY HH:MM"}
              value={fieldValue}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              hasValidationError={hasError}
            />
            <FieldErrorAlert error={hasError ? fieldErrors[field.id] : null} />
          </div>
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
            <div key={field.id} data-field-id={field.id}>
              <GlassSelect
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
              <FieldErrorAlert error={hasError ? fieldErrors[field.id] : null} />
            </div>
          );
        }

        if (displayStyle === 'buttons') {
          return (
            <div key={field.id} data-field-id={field.id} className="space-y-3">
              <label className="block text-sm font-medium text-foreground/80">
                {field.title}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </label>
              <div className="grid grid-cols-2 gap-2">
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
                        px-3 py-2 rounded-md border-2 transition-all text-sm
                        ${isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border/40 bg-muted/20 text-foreground/80 hover:border-primary/50'
                        }
                      `}
                    >
                      {optionText}
                    </button>
                  );
                })}
              </div>
              <FieldErrorAlert error={hasError ? fieldErrors[field.id] : null} />
            </div>
          );
        }

        // Default radio/checkbox style
        return (
          <div key={field.id} data-field-id={field.id} className="space-y-3">
            <label className="block text-sm font-medium text-foreground/80">
              {field.title}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            <div className="grid grid-cols-1 gap-2">
              {options.map((option, index) => {
                const optionValue = option.value || option.text || option;
                const optionText = option.text || option.value || option;

                return (
                  <label key={option.id || index} className="flex items-center cursor-pointer">
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
                      className="mr-2"
                      style={{ accentColor: '#f97316' }}
                    />
                    <span className="text-foreground/80 text-sm">{optionText}</span>
                  </label>
                );
              })}
            </div>
            <FieldErrorAlert error={hasError ? fieldErrors[field.id] : null} />
          </div>
        );

      case 'rating':
        const maxRating = field.options?.maxRating || 5;
        const currentRating = parseInt(fieldValue) || 0;

        return (
          <div key={field.id} data-field-id={field.id} className="space-y-2">
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
            <FieldErrorAlert error={hasError ? fieldErrors[field.id] : null} />
          </div>
        );

      case 'slider':
        const min = field.options?.min || 0;
        const max = field.options?.max || 100;
        const step = field.options?.step || 1;
        const currentValue = fieldValue !== undefined && fieldValue !== null ? Number(fieldValue) : min;

        return (
          <div key={field.id} data-field-id={field.id}>
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
            <FieldErrorAlert error={hasError ? fieldErrors[field.id] : null} />
          </div>
        );

      case 'file_upload':
      case 'image_upload':
        const fieldFiles = uploadedFiles.find(f => f.fieldId === field.id)?.files || [];

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
              className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
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
                    className="bg-primary h-2 rounded-full transition-all"
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
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {fieldFiles.map((file, index) => (
                    <div
                      key={file.id || index}
                      className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/40"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          {file.isImage ? (
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-muted/40 rounded-lg flex items-center justify-center">
                              <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">
                            {file.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)} • {file.type}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFileRemove(field.id, file.id)}
                        className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                        title="ลบไฟล์"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <FieldErrorAlert error={hasError ? fieldErrors[field.id] : null} />
          </div>
        );

      case 'lat_long':
        // ✅ Support both {lat, lng} and {x, y} formats
        const latValue = fieldValue?.lat || fieldValue?.y || '';
        const lngValue = fieldValue?.lng || fieldValue?.x || '';

        return (
          <div key={field.id} data-field-id={field.id} className="space-y-2">
            <label className="block text-sm font-medium text-foreground/80">
              {field.title}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <GlassInput
                type="number"
                step="any"
                placeholder="ละติจูด"
                value={latValue}
                onChange={(e) => handleInputChange(field.id, {
                  lat: e.target.value,
                  lng: lngValue
                })}
              />
              <GlassInput
                type="number"
                step="any"
                placeholder="ลองจิจูด"
                value={lngValue}
                onChange={(e) => handleInputChange(field.id, {
                  lat: latValue,
                  lng: e.target.value
                })}
              />
            </div>
            <GlassButton
              type="button"
              onClick={() => handleGPSLocation(field.id)}
              variant="secondary"
              className="w-full"
            >
              <FontAwesomeIcon icon={faMapMarkerAlt} className="w-4 h-4 mr-2" />
              ใช้ตำแหน่งปัจจุบัน
            </GlassButton>
            <FieldErrorAlert error={hasError ? fieldErrors[field.id] : null} />
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
          <div key={field.id} data-field-id={field.id}>
            <GlassSelect
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
            <FieldErrorAlert error={hasError ? fieldErrors[field.id] : null} />
          </div>
        );

      case 'factory':
        const factories = ['บางปะอิน', 'ระยอง', 'สระบุรี', 'สงขลา'];
        const allowMultipleFactory = field.options?.allowMultiple || false;

        // ✅ Normalize factory values: Support both "ระยอง" and "โรงงานระยอง" formats
        const normalizeFactoryValue = (value) => {
          if (!value) return null;
          if (typeof value === 'string' && value.startsWith('โรงงาน')) {
            return value.substring(6); // Remove "โรงงาน" prefix
          }
          return value;
        };

        const normalizedFieldValue = normalizeFactoryValue(fieldValue);
        const selectedFactories = Array.isArray(normalizedFieldValue)
          ? normalizedFieldValue
          : (normalizedFieldValue ? [normalizedFieldValue] : []);

        return (
          <div key={field.id} data-field-id={field.id} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {field.title}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </label>
              {field.description && (
                <p className="text-xs text-muted-foreground">
                  เลือกโรงงานที่ต้องการ
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {factories.map((factory, idx) => {
                const isSelected = allowMultipleFactory ? selectedFactories.includes(factory) : normalizedFieldValue === factory;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleFactoryClick(field.id, factory, allowMultipleFactory, fieldValue)}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all
                      ${isSelected
                        ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90 dark:hover:bg-primary/80'
                        : 'border-border bg-background text-foreground hover:bg-primary/10 hover:border-primary/50 hover:text-primary dark:hover:bg-primary/20'
                      }
                    `}
                  >
                    {factory}
                  </button>
                );
              })}
            </div>

            {allowMultipleFactory && selectedFactories.length > 0 && (
              <div className="p-3 rounded-md bg-muted/50 border">
                <p className="text-sm font-medium">เลือกแล้ว {selectedFactories.length} โรงงาน</p>
                <p className="text-xs text-muted-foreground">
                  {selectedFactories.join(', ')}
                </p>
              </div>
            )}

            <FieldErrorAlert error={hasError ? fieldErrors[field.id] : null} />
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

  if (showLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  // ✅ ไม่ต้องแสดงข้อความ "ไม่พบฟอร์มย่อย" ใน edit mode
  // เพราะถ้าไม่มีข้อมูลจริง จะถูก handle ใน loadSubFormData() และ onCancel() แล้ว
  if (!subForm) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-3xl mx-auto"
    >
      <GlassCard>
        <GlassCardContent className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              แก้ไขข้อมูล{subForm.title}
            </h2>
            {subForm.description && (
              <p className="text-muted-foreground mt-2">{subForm.description}</p>
            )}
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            {subForm.fields?.map(field => renderField(field))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-8">
            <GlassButton
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faSave} className="mr-2" />
                  บันทึกการแก้ไข
                </>
              )}
            </GlassButton>
            <GlassButton
              variant="outline"
              onClick={onCancel}
              disabled={submitting}
            >
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              ยกเลิก
            </GlassButton>
          </div>
        </GlassCardContent>
      </GlassCard>
    </motion.div>
  );
}
