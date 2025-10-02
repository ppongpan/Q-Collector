/**
 * MainFormEditPage - Edit existing form submissions
 *
 * Features:
 * - Load existing submission data
 * - Pre-fill form fields
 * - Support dual-write (old tables + dynamic tables)
 * - Field validation
 * - File upload handling
 * - Theme support (glass/minimal)
 * - Mobile responsive
 *
 * @version 0.6.3
 * @since 2025-10-02
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { GlassCard, GlassCardContent } from '../ui/glass-card';
import { GlassButton } from '../ui/glass-button';
import { GlassInput, GlassTextarea, GlassSelect } from '../ui/glass-input';
import { MinimalCard, MinimalCardContent } from '../ui/minimal-card';
import { MinimalButton } from '../ui/minimal-button';
import { MinimalInput } from '../ui/minimal-input';
import { MinimalSelect } from '../ui/minimal-select';
import { useEnhancedToast } from '../ui/enhanced-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faArrowLeft, faMapMarkerAlt, faStar } from '@fortawesome/free-solid-svg-icons';
import ThaiDateInput from '../ui/thai-date-input';
import ThaiDateTimeInput from '../ui/thai-datetime-input';
import ThaiPhoneInput from '../ui/thai-phone-input';
import { FieldErrorAlert } from '../ui/alert';
import EnhancedFormSlider from '../ui/enhanced-form-slider';

// Data services
import dataService from '../../services/DataService.js';
import submissionService from '../../services/SubmissionService.js';
import FileService from '../../services/FileService.js';

// Utilities
import { formatNumberInput, parseNumberInput, isValidNumber } from '../../utils/numberFormatter.js';
import { formulaEngine } from '../../utils/formulaEngine.js';
import { useConditionalVisibility } from '../../hooks/useConditionalVisibility.js';
import { useStorage } from '../../contexts/StorageContext.jsx';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { useAuth } from '../../contexts/AuthContext';

export default function MainFormEditPage({ formId, submissionId, onSave, onCancel }) {
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
  const [existingSubmission, setExistingSubmission] = useState(null);

  // Contexts
  const toast = useEnhancedToast();
  const { config: storageConfig } = useStorage();
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuth();

  // Theme components
  const isMinimalTheme = theme === 'minimal';
  const Card = isMinimalTheme ? MinimalCard : GlassCard;
  const CardContent = isMinimalTheme ? MinimalCardContent : GlassCardContent;
  const Button = isMinimalTheme ? MinimalButton : GlassButton;
  const Input = isMinimalTheme ? MinimalInput : GlassInput;
  const Textarea = isMinimalTheme ? MinimalInput : GlassTextarea;
  const Select = isMinimalTheme ? MinimalSelect : GlassSelect;

  // Date formatting utilities
  const formatDateForInput = (dateValue) => {
    if (!dateValue) return '';
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return '';
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
      const isoString = date.toISOString();
      return isoString.slice(0, 16);
    } catch (error) {
      return '';
    }
  };

  // Load form and submission data
  useEffect(() => {
    loadFormAndSubmissionData();
  }, [formId, submissionId]);

  const loadFormAndSubmissionData = async () => {
    setLoading(true);
    try {
      // Load form
      const formData = dataService.getForm(formId);
      if (!formData) {
        toast.error('ไม่พบแบบฟอร์ม', { title: 'ข้อผิดพลาด' });
        if (onCancel) onCancel();
        return;
      }
      setForm(formData);

      // Load existing submission
      const submission = dataService.getSubmission(submissionId);
      if (!submission) {
        toast.error('ไม่พบข้อมูลที่ต้องการแก้ไข', { title: 'ข้อผิดพลาด' });
        if (onCancel) onCancel();
        return;
      }
      setExistingSubmission(submission);

      // Pre-fill form data with existing submission
      const initialData = {};
      formData.fields.forEach((field) => {
        const fieldValue = submission.data[field.id];
        if (fieldValue !== undefined && fieldValue !== null) {
          // Handle different field types
          switch (field.type) {
            case 'date':
              initialData[field.id] = formatDateForInput(fieldValue);
              break;
            case 'datetime':
              initialData[field.id] = formatDateTimeForInput(fieldValue);
              break;
            case 'number':
              initialData[field.id] = formatNumberInput(fieldValue);
              break;
            case 'file_upload':
            case 'image_upload':
              // For file fields, keep the existing file info
              initialData[field.id] = fieldValue;
              if (fieldValue && typeof fieldValue === 'object') {
                setUploadedFiles(prev => [...prev, {
                  fieldId: field.id,
                  file: fieldValue
                }]);
              }
              break;
            default:
              initialData[field.id] = fieldValue;
          }
        } else {
          // Set default values
          initialData[field.id] = field.type === 'rating' ? 3 :
                                field.type === 'slider' ? 50 : '';
        }
      });

      setFormData(initialData);

      // Initialize field visibility
      const visibility = {};
      formData.fields.forEach((field) => {
        visibility[field.id] = field.conditionalVisibility?.condition
          ? formulaEngine.evaluate(field.conditionalVisibility.condition, initialData)
          : true;
      });
      setFieldVisibility(visibility);

    } catch (error) {
      console.error('Error loading submission data:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล', { title: 'ข้อผิดพลาด' });
      if (onCancel) onCancel();
    } finally {
      setLoading(false);
    }
  };

  // Check if user can edit this submission
  const canEdit = () => {
    if (!user || !existingSubmission) return false;

    // Admin and moderator can edit all submissions
    if (['super_admin', 'admin', 'moderator'].includes(user.role)) return true;

    // User can edit their own submission
    return existingSubmission.userId === user.id ||
           existingSubmission.createdBy === user.email;
  };

  // Handle field change
  const handleFieldChange = (fieldId, value, fieldType) => {
    const newFormData = { ...formData, [fieldId]: value };
    setFormData(newFormData);

    // Mark field as touched
    setFieldTouched(prev => ({ ...prev, [fieldId]: true }));

    // Clear field error when user starts typing
    if (fieldErrors[fieldId]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }

    // Re-evaluate conditional visibility for all fields
    const newVisibility = {};
    form.fields.forEach((field) => {
      if (field.conditionalVisibility?.condition) {
        newVisibility[field.id] = formulaEngine.evaluate(
          field.conditionalVisibility.condition,
          newFormData
        );
      } else {
        newVisibility[field.id] = true;
      }
    });
    setFieldVisibility(newVisibility);
  };

  // Handle file upload
  const handleFileUpload = async (fieldId, files) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const field = form.fields.find(f => f.id === fieldId);

    // Validate file type
    if (field.type === 'image_upload') {
      if (!file.type.startsWith('image/')) {
        toast.error('กรุณาอัพโหลดไฟล์รูปภาพเท่านั้น', { title: 'ไฟล์ไม่ถูกต้อง' });
        return;
      }
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)', { title: 'ไฟล์ใหญ่เกินไป' });
      return;
    }

    try {
      setFileUploadProgress(prev => ({ ...prev, [fieldId]: 0 }));

      // Store file for submission
      const fileData = {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        fieldId: fieldId
      };

      // Update uploaded files
      setUploadedFiles(prev => [
        ...prev.filter(f => f.fieldId !== fieldId),
        { fieldId, file: fileData, rawFile: file }
      ]);

      // Update form data
      handleFieldChange(fieldId, fileData, field.type);

      setFileUploadProgress(prev => ({ ...prev, [fieldId]: 100 }));

      setTimeout(() => {
        setFileUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fieldId];
          return newProgress;
        });
      }, 1000);

    } catch (error) {
      console.error('File upload error:', error);
      toast.error('เกิดข้อผิดพลาดในการอัพโหลดไฟล์', { title: 'ข้อผิดพลาด' });
      setFileUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[fieldId];
        return newProgress;
      });
    }
  };

  // Validate form before submission
  const validateForm = () => {
    const errors = {};

    form.fields.forEach(field => {
      // Skip hidden fields
      if (!fieldVisibility[field.id]) return;

      const value = formData[field.id];

      // Check required fields
      if (field.required) {
        if (value === undefined || value === null || value === '' ||
            (typeof value === 'string' && value.trim() === '')) {
          errors[field.id] = `${field.label} จำเป็นต้องกรอก`;
          return;
        }
      }

      // Type-specific validation
      switch (field.type) {
        case 'email':
          if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors[field.id] = 'รูปแบบอีเมลไม่ถูกต้อง';
          }
          break;
        case 'phone':
          if (value && !/^[0-9]{10}$/.test(value.replace(/[^0-9]/g, ''))) {
            errors[field.id] = 'หมายเลขโทรศัพท์ต้องมี 10 หลัก';
          }
          break;
        case 'url':
          if (value && !/^(https?:\/\/)?[^\s]+\.[^\s]+/.test(value)) {
            errors[field.id] = 'รูปแบบ URL ไม่ถูกต้อง';
          }
          break;
        case 'number':
          if (value && !isValidNumber(value)) {
            errors[field.id] = 'กรุณากรอกตัวเลขที่ถูกต้อง';
          }
          break;
      }
    });

    return errors;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!canEdit()) {
      toast.error('คุณไม่มีสิทธิ์แก้ไขข้อมูลนี้', { title: 'ไม่มีสิทธิ์' });
      return;
    }

    setHasSubmissionAttempt(true);

    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstErrorField = Object.keys(errors)[0];
      const firstErrorElement = document.getElementById(`field-${firstErrorField}`);
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      toast.error('กรุณาตรวจสอบข้อมูลที่กรอกให้ครบถ้วน', {
        title: 'ข้อมูลไม่ครบถ้วน',
        description: Object.values(errors)[0]
      });
      return;
    }

    setSubmitting(true);

    try {
      // Prepare submission data
      const submissionData = {};
      form.fields.forEach(field => {
        if (fieldVisibility[field.id]) {
          const value = formData[field.id];
          if (field.type === 'number' && value) {
            submissionData[field.id] = parseNumberInput(value);
          } else {
            submissionData[field.id] = value;
          }
        }
      });

      // Update submission using DataService
      const updatedSubmission = dataService.updateSubmission(submissionId, submissionData);

      if (!updatedSubmission) {
        throw new Error('Failed to update submission');
      }

      // Handle file uploads if any new files
      const newFiles = uploadedFiles.filter(f => f.rawFile);
      if (newFiles.length > 0) {
        for (const fileInfo of newFiles) {
          await FileService.saveFile(fileInfo.rawFile, fileInfo.fieldId);
        }
      }

      toast.success('บันทึกการแก้ไขข้อมูลเรียบร้อยแล้ว', {
        title: 'สำเร็จ',
        duration: 3000
      });

      if (onSave) {
        onSave(updatedSubmission, true);
      }

    } catch (error) {
      console.error('Error updating submission:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล', {
        title: 'ข้อผิดพลาด',
        description: error.message
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Render field based on type
  const renderField = (field) => {
    const isVisible = fieldVisibility[field.id] !== false;
    if (!isVisible) return null;

    const error = hasSubmissionAttempt && fieldErrors[field.id];
    const touched = fieldTouched[field.id];
    const showError = error && (touched || hasSubmissionAttempt);

    switch (field.type) {
      case 'short_answer':
        return (
          <div key={field.id} id={`field-${field.id}`} className="space-y-2">
            <label className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
            <Input
              value={formData[field.id] || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value, field.type)}
              placeholder={field.placeholder}
              className={showError ? 'border-destructive' : ''}
            />
            {showError && <FieldErrorAlert message={error} />}
          </div>
        );

      case 'paragraph':
        return (
          <div key={field.id} id={`field-${field.id}`} className="space-y-2">
            <label className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
            <Textarea
              as="textarea"
              value={formData[field.id] || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value, field.type)}
              placeholder={field.placeholder}
              rows={4}
              className={showError ? 'border-destructive' : ''}
            />
            {showError && <FieldErrorAlert message={error} />}
          </div>
        );

      case 'email':
        return (
          <div key={field.id} id={`field-${field.id}`} className="space-y-2">
            <label className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
            <Input
              type="email"
              value={formData[field.id] || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value, field.type)}
              placeholder={field.placeholder || 'email@example.com'}
              className={showError ? 'border-destructive' : ''}
            />
            {showError && <FieldErrorAlert message={error} />}
          </div>
        );

      case 'phone':
        return (
          <div key={field.id} id={`field-${field.id}`} className="space-y-2">
            <label className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
            <ThaiPhoneInput
              value={formData[field.id] || ''}
              onChange={(value) => handleFieldChange(field.id, value, field.type)}
              error={showError}
            />
            {showError && <FieldErrorAlert message={error} />}
          </div>
        );

      case 'number':
        return (
          <div key={field.id} id={`field-${field.id}`} className="space-y-2">
            <label className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
            <Input
              type="text"
              value={formData[field.id] || ''}
              onChange={(e) => {
                const formatted = formatNumberInput(e.target.value);
                handleFieldChange(field.id, formatted, field.type);
              }}
              placeholder={field.placeholder || '0'}
              className={showError ? 'border-destructive' : ''}
            />
            {showError && <FieldErrorAlert message={error} />}
          </div>
        );

      case 'date':
        return (
          <div key={field.id} id={`field-${field.id}`} className="space-y-2">
            <label className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
            <ThaiDateInput
              value={formData[field.id] || ''}
              onChange={(value) => handleFieldChange(field.id, value, field.type)}
              error={showError}
            />
            {showError && <FieldErrorAlert message={error} />}
          </div>
        );

      case 'datetime':
        return (
          <div key={field.id} id={`field-${field.id}`} className="space-y-2">
            <label className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
            <ThaiDateTimeInput
              value={formData[field.id] || ''}
              onChange={(value) => handleFieldChange(field.id, value, field.type)}
              error={showError}
            />
            {showError && <FieldErrorAlert message={error} />}
          </div>
        );

      case 'multiple_choice':
        return (
          <div key={field.id} id={`field-${field.id}`} className="space-y-2">
            <label className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
            <Select
              value={formData[field.id] || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value, field.type)}
              className={showError ? 'border-destructive' : ''}
            >
              <option value="">เลือก...</option>
              {field.options?.map((option, idx) => (
                <option key={idx} value={option}>{option}</option>
              ))}
            </Select>
            {showError && <FieldErrorAlert message={error} />}
          </div>
        );

      case 'rating':
        return (
          <div key={field.id} id={`field-${field.id}`} className="space-y-2">
            <label className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleFieldChange(field.id, star, field.type)}
                  className="transition-colors"
                >
                  <FontAwesomeIcon
                    icon={faStar}
                    className={`text-2xl ${
                      star <= (formData[field.id] || 0)
                        ? 'text-yellow-400'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                </button>
              ))}
            </div>
            {showError && <FieldErrorAlert message={error} />}
          </div>
        );

      case 'slider':
        return (
          <div key={field.id} id={`field-${field.id}`} className="space-y-2">
            <label className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
            <EnhancedFormSlider
              value={formData[field.id] || 50}
              onChange={(value) => handleFieldChange(field.id, value, field.type)}
              min={0}
              max={100}
              step={1}
            />
            {showError && <FieldErrorAlert message={error} />}
          </div>
        );

      case 'file_upload':
      case 'image_upload':
        return (
          <div key={field.id} id={`field-${field.id}`} className="space-y-2">
            <label className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
            {formData[field.id] && (
              <div className="mb-2 p-2 bg-muted/50 rounded">
                <p className="text-sm">
                  ไฟล์ปัจจุบัน: {formData[field.id].name || 'ไฟล์ที่อัพโหลดแล้ว'}
                </p>
              </div>
            )}
            <input
              type="file"
              accept={field.type === 'image_upload' ? 'image/*' : '*'}
              onChange={(e) => handleFileUpload(field.id, e.target.files)}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
            {fileUploadProgress[field.id] !== undefined && (
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${fileUploadProgress[field.id]}%` }}
                />
              </div>
            )}
            {showError && <FieldErrorAlert message={error} />}
          </div>
        );

      case 'lat_long':
        return (
          <div key={field.id} id={`field-${field.id}`} className="space-y-2">
            <label className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
            <div className="flex gap-2">
              <Input
                value={formData[field.id] || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value, field.type)}
                placeholder="Latitude, Longitude"
                className={showError ? 'border-destructive' : ''}
              />
              <Button
                type="button"
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        const coords = `${position.coords.latitude}, ${position.coords.longitude}`;
                        handleFieldChange(field.id, coords, field.type);
                      },
                      (error) => {
                        toast.error('ไม่สามารถรับตำแหน่งได้', { title: 'ข้อผิดพลาด' });
                      }
                    );
                  }
                }}
                size="sm"
              >
                <FontAwesomeIcon icon={faMapMarkerAlt} />
              </Button>
            </div>
            {showError && <FieldErrorAlert message={error} />}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">ไม่พบแบบฟอร์ม</p>
      </div>
    );
  }

  if (!canEdit()) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">คุณไม่มีสิทธิ์แก้ไขข้อมูลนี้</p>
        <Button onClick={onCancel} className="mt-4">
          กลับ
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-3xl mx-auto"
    >
      <Card>
        <CardContent className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              แก้ไขข้อมูล: {form.title}
            </h2>
            {form.description && (
              <p className="text-muted-foreground mt-2">{form.description}</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              กำลังแก้ไขข้อมูล ID: {submissionId}
            </p>
          </div>

          <div className="space-y-6">
            {form.fields.map((field) => renderField(field))}
          </div>

          <div className="flex gap-3 mt-8">
            <Button
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
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={submitting}
            >
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              ยกเลิก
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}