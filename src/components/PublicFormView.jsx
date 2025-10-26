/**
 * PublicFormView Component
 * Public-facing form view for anonymous submissions via public links
 *
 * Features:
 * - Slug-based form loading
 * - Banner display
 * - All 17 field types support
 * - PDPA consent integration
 * - Digital signature capture
 * - Anonymous submission with IP tracking
 * - Rate limiting & submission limits
 * - Security token validation
 * - Thai language UI
 * - Mobile-responsive design
 *
 * @version v0.9.0-dev
 * @date 2025-10-26
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import DOMPurify from 'dompurify';
import { GlassCard, GlassCardContent } from './ui/glass-card';
import { GlassButton } from './ui/glass-button';
import { GlassInput, GlassTextarea, GlassSelect } from './ui/glass-input';
import { useEnhancedToast } from './ui/enhanced-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faExclamationTriangle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import ThaiDateInput from './ui/thai-date-input';
import ThaiDateTimeInput from './ui/thai-datetime-input';
import ThaiPhoneInput from './ui/thai-phone-input';
import { FieldErrorAlert } from './ui/alert';
import EnhancedFormSlider from './ui/enhanced-form-slider';
import SignaturePad from './pdpa/SignaturePad';
import FullNameInput from './pdpa/FullNameInput';
import apiClient from '../services/ApiClient';

const PublicFormView = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const toast = useEnhancedToast();

  // Form state
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [fieldTouched, setFieldTouched] = useState({});
  const [hasSubmissionAttempt, setHasSubmissionAttempt] = useState(false);

  // PDPA consent state
  const [consentItems, setConsentItems] = useState([]);
  const [checkedConsents, setCheckedConsents] = useState({});
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const [fullName, setFullName] = useState('');
  const [showConsentForm, setShowConsentForm] = useState(false);

  // Load form data by slug
  useEffect(() => {
    loadFormBySlug();
  }, [slug]);

  /**
   * Load public form by slug
   */
  const loadFormBySlug = async () => {
    setLoading(true);
    try {
      console.log(`📋 Loading public form: ${slug}`);
      const formData = await apiClient.getPublicForm(slug);

      // Check if form exists
      if (!formData) {
        toast.error('ไม่พบฟอร์มที่ต้องการ', {
          title: 'ข้อผิดพลาด',
          duration: 5000
        });
        navigate('/404');
        return;
      }

      console.log('✅ Form loaded:', formData.title);
      setForm(formData);

      // Extract consent items if available
      if (formData.consentItems && formData.consentItems.length > 0) {
        const activeConsents = formData.consentItems
          .filter(item => item.isActive !== false)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        setConsentItems(activeConsents);
        console.log(`✅ Loaded ${activeConsents.length} consent items`);
      }

      setLoading(false);
    } catch (error) {
      console.error('❌ Error loading public form:', error);

      // Handle specific error codes
      const status = error.status;
      const errorCode = error.data?.code;

      if (status === 404) {
        toast.error('ฟอร์มนี้ไม่เปิดให้ส่งข้อมูลแบบสาธารณะ', {
          title: 'ไม่พบฟอร์ม',
          duration: 5000
        });
        navigate('/404');
      } else if (status === 410 || errorCode === 'PUBLIC_LINK_EXPIRED') {
        toast.error('ลิงก์นี้หมดอายุแล้ว กรุณาติดต่อผู้ดูแลระบบ', {
          title: 'ลิงก์หมดอายุ',
          duration: 5000
        });
        navigate('/expired');
      } else if (status === 429 || errorCode === 'SUBMISSION_LIMIT_REACHED') {
        toast.error('ฟอร์มนี้ถึงจำนวนการส่งสูงสุดแล้ว', {
          title: 'ถึงขอบเขต',
          duration: 5000
        });
        navigate('/limit-reached');
      } else {
        toast.error(error.message || 'ไม่สามารถโหลดฟอร์มได้', {
          title: 'เกิดข้อผิดพลาด',
          duration: 5000
        });
        navigate('/error');
      }

      setLoading(false);
    }
  };

  /**
   * Handle input change
   */
  const handleInputChange = (fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));

    // Clear error when user starts typing
    if (fieldErrors[fieldId]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }

    // Mark field as touched
    setFieldTouched(prev => ({
      ...prev,
      [fieldId]: true
    }));
  };

  /**
   * Validate single field
   */
  const validateField = (field, value) => {
    if (!field.required) return null;

    // Check if field is empty
    if (value === undefined || value === null || value === '') {
      return `กรุณากรอก${field.title}`;
    }

    // Array fields (multiple choice)
    if (Array.isArray(value) && value.length === 0) {
      return `กรุณาเลือก${field.title}`;
    }

    // Email validation
    if (field.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'รูปแบบอีเมลไม่ถูกต้อง';
      }
    }

    // Phone validation
    if (field.type === 'phone') {
      const phoneDigits = value.replace(/\D/g, '');
      if (phoneDigits.length !== 10) {
        return 'เบอร์โทรศัพท์ต้องมี 10 หลัก';
      }
    }

    // URL validation
    if (field.type === 'url') {
      try {
        new URL(value);
      } catch {
        return 'รูปแบบ URL ไม่ถูกต้อง';
      }
    }

    return null;
  };

  /**
   * Validate all fields
   */
  const validateAllFields = () => {
    const errors = {};
    let isValid = true;

    form.fields.forEach(field => {
      const error = validateField(field, formData[field.id]);
      if (error) {
        errors[field.id] = error;
        isValid = false;
      }
    });

    setFieldErrors(errors);
    return isValid;
  };

  /**
   * Handle privacy notice acknowledgment
   */
  const handlePrivacyAcknowledge = () => {
    setPrivacyAcknowledged(true);

    // If there are consent items, show consent form
    if (consentItems.length > 0) {
      setShowConsentForm(true);
    }
  };

  /**
   * Handle consent checkbox change
   */
  const handleConsentChange = (consentItemId, checked) => {
    setCheckedConsents(prev => ({
      ...prev,
      [consentItemId]: checked
    }));
  };

  /**
   * Proceed to form after consent
   */
  const handleConsentComplete = () => {
    // Validate signature if required
    const requiresSignature = form.settings?.pdpa?.requireSignature !== false;
    if (requiresSignature && !signatureData) {
      toast.error('กรุณาเซ็นชื่อเพื่อยืนยันความยินยอม', {
        title: 'ต้องมีลายเซ็น',
        duration: 3000
      });
      return;
    }

    if (requiresSignature && !fullName.trim()) {
      toast.error('กรุณากรอกชื่อ-นามสกุล เพื่อยืนยันตัวตน', {
        title: 'ต้องมีชื่อ',
        duration: 3000
      });
      return;
    }

    setShowConsentForm(false);
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setHasSubmissionAttempt(true);

    // Validate all fields
    const isFormValid = validateAllFields();
    if (!isFormValid) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน', {
        title: 'ข้อมูลไม่ครบ',
        duration: 4000
      });
      return;
    }

    // Validate privacy notice if required
    if (form.settings?.privacyNotice?.requireAcknowledgment && !privacyAcknowledged) {
      toast.error('กรุณายอมรับนโยบายความเป็นส่วนตัว', {
        title: 'จำเป็นต้องยอมรับ',
        duration: 3000
      });
      return;
    }

    setSubmitting(true);

    try {
      console.log('📤 Submitting public form:', slug);

      // Prepare consent data
      const consents = consentItems.map(item => ({
        consentItemId: item.id,
        consentGiven: checkedConsents[item.id] || false
      }));

      // Submit form
      const response = await apiClient.submitPublicForm(slug, {
        token: form.settings.publicLink.token,
        data: formData,
        consents: consents.length > 0 ? consents : undefined,
        fullName: fullName || undefined,
        signatureData: signatureData || undefined,
        privacyNoticeAccepted: privacyAcknowledged
      });

      console.log('✅ Form submitted successfully:', response.submissionId);

      // Success - redirect to thank you page
      toast.success('ส่งฟอร์มสำเร็จ ขอบคุณที่ให้ข้อมูล', {
        title: 'สำเร็จ',
        duration: 3000
      });

      // Navigate to thank you page with submission ID
      navigate(`/public/thank-you/${response.submissionId}`, {
        state: { formTitle: form.title }
      });

    } catch (error) {
      console.error('❌ Submission error:', error);

      const status = error.status;
      const errorCode = error.data?.code;

      if (status === 403 || errorCode === 'INVALID_TOKEN') {
        toast.error('รหัสความปลอดภัยไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง', {
          title: 'ข้อผิดพลาดความปลอดภัย',
          duration: 5000
        });
      } else if (status === 410 || errorCode === 'PUBLIC_LINK_EXPIRED') {
        toast.error('ลิงก์นี้หมดอายุแล้ว', {
          title: 'หมดอายุ',
          duration: 5000
        });
      } else if (status === 429) {
        const retryMessage = error.retryAfter
          ? ` กรุณารอ ${error.retryAfter} วินาที`
          : '';
        toast.error(`คุณส่งฟอร์มมากเกินไป${retryMessage}`, {
          title: 'ถึงขอบเขต',
          duration: 5000
        });
      } else {
        toast.error(error.message || 'ไม่สามารถส่งฟอร์มได้ กรุณาลองใหม่อีกครั้ง', {
          title: 'เกิดข้อผิดพลาด',
          duration: 5000
        });
      }

      setSubmitting(false);
    }
  };

  /**
   * Render field based on type
   */
  const renderField = (field) => {
    const fieldValue = formData[field.id];
    const hasError = hasSubmissionAttempt && field.required && validateField(field, fieldValue);
    const fieldError = fieldErrors[field.id];
    const isFieldTouched = fieldTouched[field.id];

    switch (field.type) {
      case 'short_answer':
      case 'email':
      case 'url':
        return (
          <div key={field.id} className="space-y-1 sm:space-y-2">
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
            placeholder={field.placeholder || `กรอก${field.title}`}
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
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {field.title}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <div className="p-4 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800">
                <p className="text-slate-500 dark:text-slate-400 text-sm">ยังไม่มีตัวเลือก</p>
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

        // Radio/Checkbox style
        return (
          <div key={field.id} className="space-y-3">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {field.title}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {options.map((option, index) => {
                const optionValue = option.value || option.text || option;
                const optionText = option.text || option.value || option;
                const isChecked = isMultiple
                  ? (fieldValue || []).includes(optionValue)
                  : fieldValue === optionValue;

                return (
                  <label
                    key={option.id || index}
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer hover:border-orange-400 dark:hover:border-orange-500 transition-colors"
                  >
                    <input
                      type={isMultiple ? 'checkbox' : 'radio'}
                      name={field.id}
                      value={optionValue}
                      checked={isChecked}
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
                      className="w-4 h-4"
                      style={{ accentColor: '#f97316' }}
                    />
                    <span className="text-slate-900 dark:text-slate-100 text-sm">{optionText}</span>
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
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {field.title}
              {field.required && <span className="text-red-500 ml-1">*</span>}
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
                      : 'text-slate-300 dark:text-slate-600 hover:text-yellow-300'
                  }`}
                >
                  <FontAwesomeIcon icon={faStar} className="w-6 h-6" />
                </button>
              ))}
              <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">
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

      default:
        // Unsupported field types (file_upload, image_upload, lat_long, province, factory)
        // For public forms, we might want to skip these or show a message
        return (
          <div key={field.id} className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {field.title}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="p-4 border border-orange-300 dark:border-orange-700 rounded-lg bg-orange-50 dark:bg-orange-900/20">
              <p className="text-orange-700 dark:text-orange-300 text-sm">
                ฟิลด์ประเภทนี้ไม่รองรับในฟอร์มสาธารณะ
              </p>
            </div>
          </div>
        );
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">กำลังโหลดฟอร์ม...</p>
        </div>
      </div>
    );
  }

  // No form state
  if (!form) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
        <GlassCard className="max-w-md w-full">
          <GlassCardContent className="text-center py-12">
            <FontAwesomeIcon icon={faExclamationTriangle} className="w-16 h-16 text-orange-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              ไม่พบฟอร์ม
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              ฟอร์มที่คุณกำลังค้นหาไม่พร้อมใช้งาน
            </p>
          </GlassCardContent>
        </GlassCard>
      </div>
    );
  }

  // Show privacy notice screen
  if (form.settings?.privacyNotice?.enabled && !privacyAcknowledged) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Banner */}
          {form.settings.publicLink?.banner && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-xl overflow-hidden shadow-lg"
            >
              <img
                src={form.settings.publicLink.banner}
                alt="Form Banner"
                className="w-full h-auto max-h-64 object-cover"
              />
            </motion.div>
          )}

          <GlassCard>
            <GlassCardContent className="py-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-4">
                  <svg className="w-8 h-8 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  นโยบายความเป็นส่วนตัว
                </h2>
              </div>

              {/* Custom text mode */}
              {form.settings.privacyNotice.mode === 'custom' && form.settings.privacyNotice.customText && (
                <div
                  className="prose dark:prose-invert max-w-none mb-6 p-6 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(
                      form.settings.privacyNotice.customText.th || form.settings.privacyNotice.customText.en
                    )
                  }}
                />
              )}

              {/* Link mode */}
              {form.settings.privacyNotice.mode === 'link' && form.settings.privacyNotice.linkUrl && (
                <div className="mb-6 text-center">
                  <a
                    href={form.settings.privacyNotice.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors"
                  >
                    {form.settings.privacyNotice.linkText?.th || form.settings.privacyNotice.linkText?.en || 'คลิกเพื่ออ่านนโยบาย'}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}

              {/* Acknowledgment required */}
              {form.settings.privacyNotice.requireAcknowledgment && (
                <div className="text-center">
                  <GlassButton
                    onClick={handlePrivacyAcknowledge}
                    className="px-8 py-3"
                  >
                    <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
                    ยอมรับและดำเนินการต่อ
                  </GlassButton>
                </div>
              )}
            </GlassCardContent>
          </GlassCard>
        </div>
      </div>
    );
  }

  // Show consent form screen
  if (showConsentForm && consentItems.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <GlassCard>
            <GlassCardContent className="py-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  การให้ความยินยอม
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                  กรุณาอ่านและให้ความยินยอมก่อนกรอกฟอร์ม
                </p>
              </div>

              {/* Consent Items */}
              <div className="space-y-4 mb-8">
                {consentItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checkedConsents[item.id] || false}
                        onChange={(e) => handleConsentChange(item.id, e.target.checked)}
                        className="mt-1 w-5 h-5"
                        style={{ accentColor: '#f97316' }}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {item.titleTh || item.title}
                        </div>
                        {item.purpose && (
                          <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            วัตถุประสงค์: {item.purpose}
                          </div>
                        )}
                        {item.retentionPeriod && (
                          <div className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
                            ระยะเวลาเก็บรักษา: {item.retentionPeriod}
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              {/* Identity Verification */}
              {form.settings?.pdpa?.requireSignature !== false && (
                <div className="space-y-6 mb-8">
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                      ยืนยันตัวตน
                    </h3>

                    {/* Full Name Input */}
                    <div className="mb-6">
                      <FullNameInput
                        value={fullName}
                        onChange={setFullName}
                        required={true}
                      />
                    </div>

                    {/* Signature Pad */}
                    <SignaturePad
                      value={signatureData}
                      onChange={setSignatureData}
                      onClear={() => setSignatureData(null)}
                      required={true}
                    />
                  </div>
                </div>
              )}

              {/* Continue Button */}
              <div className="text-center">
                <GlassButton
                  onClick={handleConsentComplete}
                  className="px-8 py-3"
                >
                  ดำเนินการต่อ
                </GlassButton>
              </div>
            </GlassCardContent>
          </GlassCard>
        </div>
      </div>
    );
  }

  // Main form view
  const publicLink = form.settings?.publicLink;
  const remainingSlots = publicLink?.maxSubmissions
    ? publicLink.maxSubmissions - (publicLink.submissionCount || 0)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Banner */}
        {publicLink?.banner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl overflow-hidden shadow-lg"
          >
            <img
              src={publicLink.banner}
              alt="Form Banner"
              className="w-full h-auto max-h-64 object-cover"
            />
          </motion.div>
        )}

        <GlassCard>
          <GlassCardContent className="py-8">
            {/* Form Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                {form.title}
              </h1>
              {form.description && (
                <p className="text-slate-600 dark:text-slate-400">
                  {form.description}
                </p>
              )}

              {/* Submission Counter */}
              {publicLink?.maxSubmissions && (
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                  <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm text-orange-700 dark:text-orange-300">
                    {publicLink.submissionCount || 0} / {publicLink.maxSubmissions} ส่งแล้ว
                    {remainingSlots !== null && remainingSlots > 0 && (
                      <span className="ml-1">({remainingSlots} ที่เหลือ)</span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {form.fields && form.fields.length > 0 ? (
                form.fields.map(field => renderField(field))
              ) : (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  ฟอร์มนี้ยังไม่มีฟิลด์
                </div>
              )}

              {/* Submit Button */}
              {form.fields && form.fields.length > 0 && (
                <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                  <GlassButton
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 text-lg"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2 inline-block"></div>
                        กำลังส่ง...
                      </>
                    ) : (
                      'ส่งฟอร์ม'
                    )}
                  </GlassButton>
                </div>
              )}
            </form>
          </GlassCardContent>
        </GlassCard>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          <p>
            Powered by <span className="font-semibold text-orange-600 dark:text-orange-400">Q-Collector</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicFormView;
