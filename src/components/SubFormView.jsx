import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription, GlassCardContent } from './ui/glass-card';
import { GlassButton } from './ui/glass-button';
import { GlassInput, GlassTextarea, GlassSelect } from './ui/glass-input';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faFileAlt, faMapMarkerAlt, faStar } from '@fortawesome/free-solid-svg-icons';
import ThaiDateInput from './ui/thai-date-input';
import ThaiDateTimeInput from './ui/thai-datetime-input';
import ThaiPhoneInput from './ui/thai-phone-input';

// Data services
import dataService from '../services/DataService.js';
import submissionService from '../services/SubmissionService.js';

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
      // Load main form
      const formData = dataService.getForm(formId);
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
      setSubForm(subFormData);

      // Load existing sub submission for editing
      if (subSubmissionId) {
        const subSubmission = dataService.getSubSubmission(subSubmissionId);
        if (subSubmission) {
          setFormData(subSubmission.data || {});
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

  const handleFileChange = (fieldId, files) => {
    const updatedFiles = [...uploadedFiles];
    const existingIndex = updatedFiles.findIndex(f => f.fieldId === fieldId);

    if (existingIndex >= 0) {
      updatedFiles[existingIndex] = { fieldId, files: Array.from(files) };
    } else {
      updatedFiles.push({ fieldId, files: Array.from(files) });
    }

    setUploadedFiles(updatedFiles);
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
      alert('✅ ได้รับตำแหน่งปัจจุบันแล้ว');
    } catch (error) {
      console.error('GPS error:', error);
      alert('❌ ไม่สามารถรับตำแหน่งปัจจุบันได้: ' + error.message);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;

    setSubmitting(true);
    try {
      let result;
      if (subSubmissionId) {
        // Update existing sub submission
        result = dataService.updateSubSubmission(subSubmissionId, formData);
      } else {
        // Create new sub submission
        result = dataService.createSubSubmission(submissionId, subFormId, formData);
      }

      alert('✅ บันทึกข้อมูลเรียบร้อยแล้ว');

      // Call onSave callback
      if (onSave) {
        onSave(result);
      }

    } catch (error) {
      console.error('Submission error:', error);
      alert('❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message);
    } finally {
      setSubmitting(false);
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
        return (
          <div key={field.id} className="space-y-2">
            <label className="block text-sm font-medium text-foreground/80">
              {field.title}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            <input
              type="file"
              accept={field.type === 'image_upload' ? 'image/*' : undefined}
              multiple={field.options?.allowMultiple}
              onChange={(e) => handleFileChange(field.id, e.target.files)}
              className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 transition-colors"
            />
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

  if (!form || !subForm) {
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
              <div className="space-y-4 sm:space-y-5">
                {/* SubForm Fields */}
                {subForm.fields?.map(field => renderField(field))}
              </div>

              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-6 mt-6 border-t border-border/30">
                {onCancel && (
                  <GlassButton
                    onClick={onCancel}
                    variant="secondary"
                    className="w-full sm:w-auto"
                  >
                    ยกเลิก
                  </GlassButton>
                )}
                <GlassButton
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="orange-neon-button w-full sm:w-auto"
                >
                  <FontAwesomeIcon
                    icon={faSave}
                    className="w-4 h-4 mr-2"
                  />
                  {submitting ? 'กำลังบันทึก...' : subSubmissionId ? 'อัพเดทข้อมูล' : 'บันทึกข้อมูล'}
                </GlassButton>
              </div>
            </GlassCardContent>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}