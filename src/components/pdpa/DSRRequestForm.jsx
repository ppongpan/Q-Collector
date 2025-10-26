/**
 * DSRRequestForm - Form for creating Data Subject Rights requests
 *
 * Features:
 * - 6 DSR request types based on PDPA
 * - Form selection with checkboxes (v0.8.7)
 * - Form validation
 * - Integration with PersonalDataService
 *
 * @version v0.8.7-dev
 * @date 2025-10-26
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Edit3,
  Trash2,
  Download,
  ShieldOff,
  AlertCircle,
  Check,
  CheckSquare,
  Square,
  Loader2
} from 'lucide-react';
import PersonalDataService from '../../services/PersonalDataService';
import { useEnhancedToast } from '../ui/enhanced-toast';
import logger from '../../utils/logger';

const DSRRequestForm = ({ profileId, profile, onClose, onSuccess }) => {
  // 🔍 DEBUG: Component loaded
  console.log('🔍 DSRRequestForm - Component loaded');
  console.log('🔍 DSRRequestForm - profileId:', profileId);
  console.log('🔍 DSRRequestForm - profile:', profile);
  console.log('🔍 DSRRequestForm - profile keys:', profile ? Object.keys(profile) : 'null');

  const [formData, setFormData] = useState({
    requestType: '',
    reason: '',
    specificForms: [],
    specificFields: []
  });
  const [availableForms, setAvailableForms] = useState([]);
  const [loadingForms, setLoadingForms] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const toast = useEnhancedToast();

  // Load available forms for this profile
  useEffect(() => {
    const loadForms = async () => {
      try {
        setLoadingForms(true);
        const forms = await PersonalDataService.getProfileForms(profileId);
        setAvailableForms(forms);
        logger.debug('Loaded profile forms:', forms);
      } catch (error) {
        logger.error('Failed to load profile forms:', error);
        toast.error('ไม่สามารถโหลดรายการฟอร์มได้', {
          title: 'เกิดข้อผิดพลาด'
        });
      } finally {
        setLoadingForms(false);
      }
    };

    if (profileId) {
      loadForms();
    }
  }, [profileId, toast]);

  // DSR Request Types
  const requestTypes = [
    {
      value: 'access',
      label: 'ขอเข้าถึงข้อมูล (Right to Access)',
      description: 'ขอดูหรือรับสำเนาข้อมูลส่วนบุคคลที่เก็บไว้',
      icon: FileText,
      color: 'blue'
    },
    {
      value: 'rectification',
      label: 'ขอแก้ไขข้อมูล (Right to Rectification)',
      description: 'ขอแก้ไขข้อมูลที่ไม่ถูกต้องหรือไม่สมบูรณ์',
      icon: Edit3,
      color: 'yellow'
    },
    {
      value: 'erasure',
      label: 'ขอลบข้อมูล (Right to Erasure)',
      description: 'ขอลบข้อมูลส่วนบุคคลทั้งหมดหรือบางส่วน',
      icon: Trash2,
      color: 'red'
    },
    {
      value: 'portability',
      label: 'ขอโอนย้ายข้อมูล (Right to Data Portability)',
      description: 'ขอรับข้อมูลในรูปแบบที่สามารถนำไปใช้กับระบบอื่นได้',
      icon: Download,
      color: 'green'
    },
    {
      value: 'restriction',
      label: 'ขอจำกัดการประมวลผล (Right to Restriction)',
      description: 'ขอจำกัดการใช้หรือประมวลผลข้อมูลชั่วคราว',
      icon: ShieldOff,
      color: 'purple'
    },
    {
      value: 'objection',
      label: 'ขอคัดค้าน (Right to Object)',
      description: 'ขอคัดค้านการเก็บรวบรวม ใช้ หรือเปิดเผยข้อมูล',
      icon: AlertCircle,
      color: 'orange'
    }
  ];

  // Toggle form selection
  const toggleFormSelection = (formId) => {
    setFormData((prev) => ({
      ...prev,
      specificForms: prev.specificForms.includes(formId)
        ? prev.specificForms.filter((id) => id !== formId)
        : [...prev.specificForms, formId]
    }));
  };

  // Select all forms
  const selectAllForms = () => {
    setFormData((prev) => ({
      ...prev,
      specificForms: availableForms.map((f) => f.formId)
    }));
  };

  // Deselect all forms
  const deselectAllForms = () => {
    setFormData((prev) => ({
      ...prev,
      specificForms: []
    }));
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 🔍 DEBUG: Log profile object to console (using console.error to bypass filters)
    console.error('🔍 SUBMIT - Profile object:', profile);
    console.error('🔍 SUBMIT - Profile keys:', profile ? Object.keys(profile) : 'null');
    console.error('🔍 SUBMIT - primaryEmail:', profile?.primaryEmail);
    console.error('🔍 SUBMIT - primaryPhone:', profile?.primaryPhone);
    alert('🔍 SUBMITTING DSR Request\n\nEmail: ' + (profile?.primaryEmail || 'NO EMAIL') + '\nPhone: ' + (profile?.primaryPhone || 'NO PHONE'));

    if (!formData.requestType) {
      toast.error('กรุณาเลือกประเภทคำขอ', {
        title: 'ข้อมูลไม่ครบถ้วน'
      });
      return;
    }

    if (!formData.reason.trim()) {
      toast.error('กรุณาระบุเหตุผลในการขอใช้สิทธิ์', {
        title: 'ข้อมูลไม่ครบถ้วน'
      });
      return;
    }

    // ✅ v0.8.7-dev: Validate userIdentifier before submit
    // Backend returns camelCase (primaryEmail, primaryPhone) when underscored: true
    const userIdentifier = profile?.primaryEmail || profile?.primaryPhone || '';
    console.log('🔍 DEBUG - userIdentifier:', userIdentifier);

    if (!userIdentifier.trim()) {
      toast.error('ไม่พบข้อมูล Email หรือเบอร์โทรศัพท์ของเจ้าของข้อมูล', {
        title: 'ข้อมูลไม่ครบถ้วน',
        description: 'กรุณาตรวจสอบข้อมูลในโปรไฟล์ก่อนสร้างคำขอ'
      });
      return;
    }

    try {
      setSubmitting(true);

      await PersonalDataService.createDSRRequest(profileId, {
        requestType: formData.requestType,
        userIdentifier: userIdentifier,
        requestDetails: {
          reason: formData.reason,
          specificForms: formData.specificForms,
          specificFields: formData.specificFields
        }
      });

      logger.info('DSR request created successfully:', formData);

      toast.success('สร้างคำขอใช้สิทธิ์สำเร็จ', {
        title: 'สำเร็จ',
        description: 'ระบบจะดำเนินการตามคำขอภายใน 30 วัน'
      });

      onSuccess();
    } catch (error) {
      logger.error('Failed to create DSR request:', error);

      // ✅ v0.8.7-dev: Enhanced error handling - show backend validation errors
      let errorMessage = 'ไม่สามารถสร้างคำขอได้';
      let errorDescription = error.message;

      // Check if backend returned validation errors
      if (error.response && error.response.data) {
        const { error: backendError, errors } = error.response.data;

        if (errors && errors.length > 0) {
          // Show first validation error
          const firstError = errors[0];
          errorMessage = 'ข้อมูลไม่ถูกต้อง';
          errorDescription = firstError.msg || firstError.message || 'กรุณาตรวจสอบข้อมูลอีกครั้ง';

          logger.error('Backend validation errors:', errors);
        } else if (backendError) {
          errorDescription = backendError;
        }
      }

      toast.error(errorMessage, {
        title: 'เกิดข้อผิดพลาด',
        description: errorDescription
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedType = requestTypes.find((t) => t.value === formData.requestType);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-orange-50 to-white dark:from-gray-900 dark:to-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              สร้างคำขอใช้สิทธิ์ (DSR Request)
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              เจ้าของข้อมูล: {profile?.fullName || profile?.primaryEmail || 'ไม่ระบุ'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Request Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                ประเภทคำขอ <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {requestTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = formData.requestType === type.value;

                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, requestType: type.value })}
                      className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                        isSelected
                          ? `border-${type.color}-500 bg-${type.color}-50 dark:bg-${type.color}-900/20`
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          isSelected
                            ? `bg-${type.color}-100 dark:bg-${type.color}-900/40`
                            : 'bg-gray-100 dark:bg-gray-800'
                        }`}>
                          <Icon className={`w-5 h-5 ${
                            isSelected
                              ? `text-${type.color}-600 dark:text-${type.color}-400`
                              : 'text-gray-600 dark:text-gray-400'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <h4 className={`font-medium mb-1 ${
                            isSelected
                              ? `text-${type.color}-900 dark:text-${type.color}-100`
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {type.label}
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {type.description}
                          </p>
                        </div>
                        {isSelected && (
                          <div className={`absolute top-2 right-2 p-1 rounded-full bg-${type.color}-500`}>
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Type Details */}
            {selectedType && (
              <div className={`p-4 rounded-lg border-2 border-${selectedType.color}-200 dark:border-${selectedType.color}-800 bg-${selectedType.color}-50 dark:bg-${selectedType.color}-900/20`}>
                <div className="flex items-start gap-3">
                  <AlertCircle className={`w-5 h-5 text-${selectedType.color}-600 dark:text-${selectedType.color}-400 flex-shrink-0 mt-0.5`} />
                  <div className="text-sm">
                    <p className={`font-medium text-${selectedType.color}-900 dark:text-${selectedType.color}-100 mb-1`}>
                      ข้อมูลสำคัญ:
                    </p>
                    <ul className={`list-disc list-inside space-y-1 text-${selectedType.color}-800 dark:text-${selectedType.color}-200`}>
                      <li>ระยะเวลาดำเนินการ: 30 วันนับจากวันที่รับคำขอ</li>
                      <li>ท่านจะได้รับการแจ้งผลการดำเนินการทาง Email หรือโทรศัพท์</li>
                      {selectedType.value === 'erasure' && (
                        <li className="text-red-600 dark:text-red-400 font-medium">
                          การลบข้อมูลเป็นการดำเนินการที่ไม่สามารถย้อนกลับได้
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                เหตุผลในการขอใช้สิทธิ์ <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="กรุณาระบุเหตุผลในการขอใช้สิทธิ์อย่างละเอียด..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                ระบุรายละเอียดให้ชัดเจนเพื่อให้เราสามารถดำเนินการได้อย่างถูกต้อง
              </p>
            </div>

            {/* Specific Forms Selection - ✅ v0.8.7: Checkbox UI */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  เลือกฟอร์มที่ต้องการดำเนินการ
                </label>
                {availableForms.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllForms}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      เลือกทั้งหมด
                    </button>
                    <span className="text-gray-400">|</span>
                    <button
                      type="button"
                      onClick={deselectAllForms}
                      className="text-xs text-gray-600 dark:text-gray-400 hover:underline"
                    >
                      ยกเลิกทั้งหมด
                    </button>
                  </div>
                )}
              </div>

              {loadingForms ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">กำลังโหลดฟอร์ม...</span>
                </div>
              ) : availableForms.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  {availableForms.map((form) => {
                    const isSelected = formData.specificForms.includes(form.formId);

                    return (
                      <button
                        key={form.formId}
                        type="button"
                        onClick={() => toggleFormSelection(form.formId)}
                        className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-medium text-sm ${
                              isSelected
                                ? 'text-orange-900 dark:text-orange-100'
                                : 'text-gray-900 dark:text-white'
                            }`}>
                              {form.formTitle}
                              {form.formTitleEn && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                  ({form.formTitleEn})
                                </span>
                              )}
                            </h4>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-600 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {form.submissionCount} การส่ง
                              </span>
                              {form.hasConsents && (
                                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                  <Check className="w-3 h-3" />
                                  มีความยินยอม
                                </span>
                              )}
                              {form.hasPII && (
                                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                  <ShieldOff className="w-3 h-3" />
                                  มี PII
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              ส่งล่าสุด: {new Date(form.lastSubmissionDate).toLocaleDateString('th-TH', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p>ไม่พบฟอร์มที่เกี่ยวข้อง</p>
                </div>
              )}

              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {formData.specificForms.length > 0 ? (
                  <span className="text-orange-600 dark:text-orange-400 font-medium">
                    เลือกแล้ว {formData.specificForms.length} ฟอร์ม
                  </span>
                ) : (
                  'ไม่เลือกฟอร์มใด = ดำเนินการกับข้อมูลทั้งหมด'
                )}
              </p>
            </div>

            {/* Specific Fields (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ระบุฟิลด์เฉพาะ (ถ้ามี)
              </label>
              <input
                type="text"
                value={formData.specificFields.join(', ')}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    specificFields: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                  })
                }
                placeholder="ระบุชื่อฟิลด์ที่ต้องการ เช่น email, phone (คั่นด้วยเครื่องหมายจุลภาค)"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                เว้นว่างไว้หากต้องการดำเนินการกับฟิลด์ทั้งหมด
              </p>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !formData.requestType || !formData.reason.trim()}
            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                กำลังส่งคำขอ...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                ส่งคำขอใช้สิทธิ์
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DSRRequestForm;
