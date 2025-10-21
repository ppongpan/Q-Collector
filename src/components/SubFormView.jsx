import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription, GlassCardContent } from './ui/glass-card';
import { GlassButton } from './ui/glass-button';
import { GlassInput, GlassTextarea, GlassSelect } from './ui/glass-input';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faFileAlt, faMapMarkerAlt, faStar } from '@fortawesome/free-solid-svg-icons';
import ThaiDateInput from './ui/thai-date-input';
import ThaiDateTimeInput from './ui/thai-datetime-input';
import ThaiPhoneInput from './ui/thai-phone-input';
import { useEnhancedToast } from './ui/enhanced-toast';

// Data services
import submissionService from '../services/SubmissionService.js';
import fileServiceAPI from '../services/FileService.api.js';
import apiClient from '../services/ApiClient';

// Utilities
import { formulaEngine } from '../utils/formulaEngine'; // ✅ v0.7.43: Field visibility evaluation

export default function SubFormView({
  formId,
  submissionId,
  subFormId,
  subSubmissionId,
  onSave,
  onCancel
}) {
  const [form, setForm] = useState(null);
  const [subForm, setSubForm] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Enhanced toast notifications
  const toast = useEnhancedToast();

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

  // Load form and subform data
  useEffect(() => {
    loadFormData();
  }, [formId, subFormId, subSubmissionId]);

  const loadFormData = async () => {
    setLoading(true);
    try {
      // Load main form from API
      const formResponse = await apiClient.getForm(formId);
      const formData = formResponse.data?.form || formResponse.data;

      if (!formData) {
        console.error('Form not found:', formId);
        return;
      }
      setForm(formData);

      // Find sub form
      const subFormData = formData.subForms?.find(sf => sf.id === subFormId);
      if (!subFormData) {
        console.error('SubForm not found:', subFormId);
        return;
      }

      // 🔍 DEBUG: Log field visibility data
      console.log('🔍 [SubFormView] SubForm fields loaded:', subFormData.fields?.map(f => ({
        id: f.id,
        title: f.title,
        showCondition: f.showCondition,
        show_condition: f.show_condition
      })));

      setSubForm(subFormData);

      // Load existing sub submission for editing
      if (subSubmissionId) {
        const subSubmissionResponse = await apiClient.get(`/subforms/${subFormId}/submissions/${subSubmissionId}`);
        const subSubmission = subSubmissionResponse.data?.submission || subSubmissionResponse.data;

        if (subSubmission && subSubmission.data) {
          // 🔧 CRITICAL FIX: Backend returns data in format {fieldId: {fieldId, fieldTitle, fieldType, value}}
          // Extract just the values for form editing
          const extractedFormData = {};
          Object.entries(subSubmission.data).forEach(([fieldId, fieldData]) => {
            // If fieldData is an object with 'value' property, extract it
            if (fieldData && typeof fieldData === 'object' && 'value' in fieldData) {
              extractedFormData[fieldId] = fieldData.value;
            } else {
              // Otherwise use the raw value
              extractedFormData[fieldId] = fieldData;
            }
          });
          setFormData(extractedFormData);
        }
      }
    } catch (error) {
      console.error('Error loading form data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleFileChange = async (fieldId, files) => {
    if (!files || files.length === 0) {
      handleInputChange(fieldId, null);
      return;
    }

    try {
      const fileArray = Array.from(files);
      const allowMultiple = subForm.fields.find(f => f.id === fieldId)?.options?.allowMultiple;

      if (allowMultiple) {
        // Upload multiple files
        const results = await fileServiceAPI.uploadMultipleFiles(
          fileArray,
          submissionId,
          fieldId,
          (progress) => console.log(`Upload progress: ${progress}%`)
        );

        const successfulFileIds = results
          .filter(result => result.success)
          .map(result => result.file.id);

        if (successfulFileIds.length > 0) {
          handleInputChange(fieldId, successfulFileIds);
          toast.success(`อัปโหลด ${successfulFileIds.length} ไฟล์เรียบร้อยแล้ว`, {
            title: "อัปโหลดสำเร็จ",
            duration: 3000
          });
        }
      } else {
        // Upload single file
        const result = await fileServiceAPI.uploadFile(
          fileArray[0],
          submissionId,
          fieldId,
          (progress) => console.log(`Upload progress: ${progress}%`)
        );

        if (result.success) {
          handleInputChange(fieldId, result.file.id);
          toast.success('อัปโหลดไฟล์เรียบร้อยแล้ว', {
            title: "อัปโหลดสำเร็จ",
            duration: 3000
          });
        }
      }
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('เกิดข้อผิดพลาดในการอัปโหลดไฟล์', {
        title: "อัปโหลดไม่สำเร็จ",
        duration: 5000
      });
    }
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
      toast.error(`ไม่สามารถรับตำแหน่งปัจจุบันได้: ${error.message}`, {
        title: "ไม่สามารถรับตำแหน่ง GPS ได้",
        duration: 8000,
        action: {
          label: "ลองอีกครั้ง",
          onClick: () => handleGPSLocation(fieldId)
        }
      });
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;

    // Show "saving" toast notification
    toast.info('อยู่ระหว่างการบันทึกข้อมูล...', {
      title: "กำลังบันทึก",
      duration: 2000
    });

    setSubmitting(true);
    try {
      let result;
      if (subSubmissionId) {
        // Update existing sub submission
        console.log('📝 Updating sub-form submission:', {
          subFormId,
          subSubmissionId,
          dataKeys: Object.keys(formData)
        });
        const updateResponse = await apiClient.put(`/subforms/${subFormId}/submissions/${subSubmissionId}`, {
          data: formData
        });
        result = updateResponse.data?.submission || updateResponse.data;
      } else {
        // Create new sub submission
        console.log('📝 Creating new sub-form submission:', {
          subFormId,
          parentId: submissionId,
          submissionIdProp: submissionId,
          dataKeys: Object.keys(formData)
        });
        const createResponse = await apiClient.post(`/subforms/${subFormId}/submissions`, {
          parentId: submissionId,
          data: formData
        });
        result = createResponse.data?.submission || createResponse.data;
        console.log('✅ Sub-form submission created:', result);
      }

      toast.success('บันทึกข้อมูลเรียบร้อยแล้ว', {
        title: "บันทึกสำเร็จ",
        duration: 3000
      });

      // Call onSave callback
      if (onSave) {
        onSave(result);
      }

    } catch (error) {
      console.error('Submission error:', error);
      toast.error(`เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${error.message}`, {
        title: "บันทึกไม่สำเร็จ",
        duration: 8000,
        action: {
          label: "ลองอีกครั้ง",
          onClick: () => handleSubmit()
        }
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ v0.7.43: Field map for visibility formula evaluation
  const fieldMap = useMemo(() => {
    const map = {};
    // Include both main form and sub-form fields for formula evaluation
    (form?.fields || []).forEach(field => {
      map[field.id] = field;
    });
    (subForm?.fields || []).forEach(field => {
      map[field.id] = field;
    });
    return map;
  }, [form?.fields, subForm?.fields]);

  // ✅ v0.7.43: Check if field should be visible based on showCondition
  const isFieldVisible = (field) => {
    // ✅ FIX: Handle both camelCase (showCondition) and snake_case (show_condition)
    const condition = field.showCondition || field.show_condition;

    // 🔍 DEBUG: Log every field check
    console.log(`🔍 [SubFormView] Checking visibility for field "${field.title}":`, {
      hasShowCondition: !!field.showCondition,
      hasShow_condition: !!field.show_condition,
      condition,
      enabled: condition?.enabled
    });

    // Always show if no show_condition set (or enabled is not explicitly false)
    if (!condition || condition.enabled !== false) {
      console.log(`  → VISIBLE (no condition or enabled !== false)`);
      return true;
    }

    // If no formula, hide the field (enabled: false means always hidden)
    if (!condition.formula) {
      console.log(`  → HIDDEN (no formula, enabled=false)`);
      return false;
    }

    // Evaluate formula
    try {
      const result = formulaEngine.evaluate(
        condition.formula,
        formData, // Use current form data for evaluation
        fieldMap
      );
      console.log(`🔍 [SubFormView] Field visibility evaluation:`, {
        fieldTitle: field.title,
        formula: condition.formula,
        result,
        formData
      });
      return result === true;
    } catch (error) {
      console.error(`❌ Error evaluating visibility formula for field "${field.title}":`, error);
      return true; // Show field on error to avoid hiding data
    }
  };

  const renderField = (field) => {
    const fieldValue = formData[field.id];

    switch (field.type) {
      case 'short_answer':
      case 'email':
      case 'url':
        return (
          <GlassInput
            key={field.id}
            label={field.title}
            type={field.type === 'short_answer' ? 'text' : field.type}
            required={field.required}
            placeholder={field.placeholder}
            value={fieldValue || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          />
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
          />
        );

      case 'paragraph':
        return (
          <GlassTextarea
            key={field.id}
            label={field.title}
            required={field.required}
            placeholder={field.placeholder}
            value={fieldValue || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            rows={3}
          />
        );

      case 'number':
        return (
          <GlassInput
            key={field.id}
            label={field.title}
            type="number"
            required={field.required}
            placeholder={field.placeholder}
            value={fieldValue || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
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
          />
        );

      case 'time':
        return (
          <GlassInput
            key={field.id}
            label={field.title}
            type="time"
            required={field.required}
            value={fieldValue || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
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
          />
        );

      case 'multiple_choice':
        const options = field.options?.options || [];
        const allowMultiple = field.options?.allowMultiple || false;
        const displayStyle = field.options?.displayStyle || 'radio';

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
              {options.map((option, index) => {
                const optionValue = option.value || option.text || option;
                const optionText = option.text || option.value || option;
                return (
                  <option key={index} value={optionValue}>{optionText}</option>
                );
              })}
            </GlassSelect>
          );
        }

        return (
          <div key={field.id} className="space-y-2">
            <label className="block text-sm font-medium text-foreground/80">
              {field.title}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {options.map((option, index) => {
                const optionValue = option.value || option.text || option;
                const optionText = option.text || option.value || option;

                if (allowMultiple) {
                  return (
                    <label key={index} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name={field.id}
                        value={optionValue}
                        checked={(fieldValue || []).includes(optionValue)}
                        onChange={(e) => {
                          const current = fieldValue || [];
                          const newValue = e.target.checked
                            ? [...current, optionValue]
                            : current.filter(item => item !== optionValue);
                          handleInputChange(field.id, newValue);
                        }}
                        className="w-4 h-4 text-primary border-border/40 rounded focus:ring-primary/40"
                      />
                      <span className="text-foreground/80">{optionText}</span>
                    </label>
                  );
                } else {
                  return (
                    <label key={index} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={field.id}
                        value={optionValue}
                        checked={fieldValue === optionValue}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className="w-4 h-4 text-primary border-border/40 focus:ring-primary/40"
                      />
                      <span className="text-foreground/80">{optionText}</span>
                    </label>
                  );
                }
              })}
            </div>
          </div>
        );

      case 'rating':
        const maxRating = field.options?.maxRating || 5;
        return (
          <div key={field.id} className="space-y-2">
            <label className="block text-sm font-medium text-foreground/80">
              {field.title}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            <div className="flex items-center gap-1">
              {Array.from({ length: maxRating }, (_, i) => i + 1).map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleInputChange(field.id, star)}
                  className="text-2xl transition-colors focus:outline-none"
                >
                  <FontAwesomeIcon
                    icon={faStar}
                    className={star <= (fieldValue || 0) ? 'text-yellow-500' : 'text-muted-foreground/40'}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground">
                {fieldValue || 0}/{maxRating}
              </span>
            </div>
          </div>
        );

      case 'slider':
        const min = field.options?.min || 0;
        const max = field.options?.max || 100;
        const step = field.options?.step || 1;

        return (
          <div key={field.id} className="space-y-2">
            <label className="block text-sm font-medium text-foreground/80">
              {field.title}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={fieldValue || min}
                onChange={(e) => handleInputChange(field.id, e.target.value)}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{min}</span>
                <span className="font-semibold text-foreground">ค่าที่เลือก: {fieldValue || min}</span>
                <span>{max}</span>
              </div>
            </div>
          </div>
        );

      case 'file_upload':
      case 'image_upload':
        // ✅ SINGLE FILE MODE: Only show the first file (1 file per field)
        const fieldFiles = uploadedFiles.find(f => f.fieldId === field.id)?.files || [];
        const currentFile = fieldFiles.length > 0 ? fieldFiles[0] : null;

        return (
          <div key={field.id} className="space-y-3">
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
            />

            {/* ✅ Display current filename next to button area if file exists */}
            {currentFile && (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-muted/10">
                {/* File Icon/Preview */}
                {currentFile.isImage && currentFile.presignedUrl ? (
                  <img
                    src={currentFile.presignedUrl}
                    alt={currentFile.name}
                    className="w-10 h-10 rounded object-cover flex-shrink-0"
                    onError={(e) => {
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
                      {fileServiceAPI.formatFileSize(currentFile.size)}
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
                    onClick={() => {
                      // Remove file from uploadedFiles state
                      setUploadedFiles(prev => prev.filter(f => f.fieldId !== field.id));
                      // Clear form data for this field
                      handleInputChange(field.id, null);
                      toast.info('ไฟล์ถูกลบแล้ว', {
                        title: "ลบไฟล์",
                        duration: 2000
                      });
                    }}
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
          </div>
        );

      case 'lat_long':
        return (
          <div key={field.id} className="space-y-2">
            <label className="block text-sm font-medium text-foreground/80">
              {field.title}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <GlassInput
                type="number"
                step="any"
                placeholder="ละติจูด"
                value={fieldValue?.lat || ''}
                onChange={(e) => handleInputChange(field.id, {
                  ...fieldValue,
                  lat: e.target.value
                })}
              />
              <GlassInput
                type="number"
                step="any"
                placeholder="ลองจิจูด"
                value={fieldValue?.lng || ''}
                onChange={(e) => handleInputChange(field.id, {
                  ...fieldValue,
                  lng: e.target.value
                })}
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
        const factories = ['โรงงานบางปะอิน', 'โรงงานระยอง', 'โรงงานสระบุรี', 'โรงงานสงขลา'];

        return (
          <div key={field.id} className="space-y-2">
            <label className="block text-sm font-medium text-foreground/80">
              {field.title}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {factories.map((factory, index) => (
                <label key={index} className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-border/40 hover:bg-accent/20 transition-colors">
                  <input
                    type="checkbox"
                    name={field.id}
                    value={factory}
                    checked={(fieldValue || []).includes(factory)}
                    onChange={(e) => {
                      const current = fieldValue || [];
                      const newValue = e.target.checked
                        ? [...current, factory]
                        : current.filter(item => item !== factory);
                      handleInputChange(field.id, newValue);
                    }}
                    className="w-4 h-4 text-primary border-border/40 rounded focus:ring-primary/40"
                  />
                  <span className="text-foreground/80">{factory}</span>
                </label>
              ))}
            </div>
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

  if ((!form || !subForm) && !loading) {
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

  // ✅ FIX v0.7.28: Add null check for form and subForm before rendering
  if (!form || !subForm) {
    return null; // Still loading
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90">
      <div className="container-responsive px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-4 sm:py-6">

        {/* Form Content */}
        <div className="max-w-3xl mx-auto">
          <GlassCard className="glass-container">
            <GlassCardHeader>
              <GlassCardTitle>{subForm.title}</GlassCardTitle>
              {subForm.description && (
                <GlassCardDescription>{subForm.description}</GlassCardDescription>
              )}
            </GlassCardHeader>

            <GlassCardContent>
              {/* ✅ v0.7.37: Responsive Grid Layout - Desktop 2-column → Mobile stacked */}

              {/* 🎯 Section 1: Basic Information */}
              {subForm.fields?.filter(field =>
                !['file_upload', 'image_upload', 'lat_long'].includes(field.type)
              ).filter(field => isFieldVisible(field)).length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-orange-400 mb-4 pb-2 border-b border-orange-400/30">
                    ข้อมูลพื้นฐาน
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {/* SubForm Fields with responsive grid */}
                    {/* ✅ FIX v0.7.33: Sort fields by order before rendering */}
                    {/* ✅ v0.7.43: Apply visibility filter */}
                    {subForm.fields
                      ?.filter(field => !['file_upload', 'image_upload', 'lat_long'].includes(field.type))
                      .filter(field => isFieldVisible(field))
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .map(field => renderField(field))}
                  </div>
                </div>
              )}

              {/* 🎯 Section 2: Location (if exists) */}
              {subForm.fields?.filter(field => field.type === 'lat_long').filter(field => isFieldVisible(field)).length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-orange-400 mb-4 pb-2 border-b border-orange-400/30">
                    ตำแหน่งที่ตั้ง
                  </h3>
                  <div className="space-y-6">
                    {/* ✅ v0.7.43: Apply visibility filter */}
                    {subForm.fields
                      ?.filter(field => field.type === 'lat_long')
                      .filter(field => isFieldVisible(field))
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .map(field => renderField(field))}
                  </div>
                </div>
              )}

              {/* 🎯 Section 3: Files & Images (if exists) */}
              {subForm.fields?.filter(field =>
                ['file_upload', 'image_upload'].includes(field.type)
              ).filter(field => isFieldVisible(field)).length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-orange-400 mb-4 pb-2 border-b border-orange-400/30">
                    ไฟล์และรูปภาพ
                  </h3>
                  <div className="space-y-6">
                    {/* ✅ v0.7.43: Apply visibility filter */}
                    {subForm.fields
                      ?.filter(field => ['file_upload', 'image_upload'].includes(field.type))
                      .filter(field => isFieldVisible(field))
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .map(field => renderField(field))}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-6 mt-6 border-t border-orange-400/30">
                {onCancel && (
                  <GlassButton
                    onClick={onCancel}
                    variant="secondary"
                    className="w-full sm:w-auto"
                  >
                    ยกเลิก
                  </GlassButton>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-orange-rounded inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed text-white text-sm font-medium w-full sm:w-auto"
                  style={{ transition: 'background-color 200ms ease-out' }}
                >
                  <FontAwesomeIcon
                    icon={faSave}
                    className="w-4 h-4"
                  />
                  <span>{submitting ? 'กำลังบันทึก...' : subSubmissionId ? 'อัพเดทข้อมูล' : 'บันทึกข้อมูล'}</span>
                </button>
              </div>
            </GlassCardContent>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}