/**
 * ConsentEditModal Component
 * Modal for editing user consent records with digital signature support
 *
 * Features:
 * - Toggle consent status (given/withdrawn)
 * - Provide reason for change
 * - Legal basis documentation
 * - Digital signature capture
 * - DSR requirement validation (v0.8.7)
 * - Integration with ConsentHistoryService
 *
 * @version v0.8.7-dev
 * @date 2025-10-26
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SignatureCanvas from 'react-signature-canvas';
import { X, Check, Save, RotateCcw, Edit2, AlertTriangle } from 'lucide-react';
import logger from '../../utils/logger';
import PersonalDataService from '../../services/PersonalDataService';

const ConsentEditModal = ({ isOpen, onClose, consent, profileId, onUpdate }) => {
  const [formData, setFormData] = useState({
    consent_given: consent?.consentGiven ?? true,
    reason: '',
    legal_basis: '',
  });
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showDSRWarning, setShowDSRWarning] = useState(false);

  const signatureRef = useRef(null);

  // ✅ v0.8.7: Check if change requires DSR
  const requiresDSR = useCallback(() => {
    const currentStatus = consent?.consentGiven ?? true;
    const newStatus = formData.consent_given;

    // Withdrawal (true → false) requires DSR
    if (currentStatus === true && newStatus === false) {
      return true;
    }

    // Renewal after withdrawal (false → true) requires DSR
    if (currentStatus === false && newStatus === true) {
      return true;
    }

    return false;
  }, [consent, formData.consent_given]);

  // Reset form when consent changes
  useEffect(() => {
    if (consent) {
      setFormData({
        consent_given: consent.consentGiven ?? true,
        reason: '',
        legal_basis: '',
      });
      setSignatureDataUrl(null);
      setError(null);
    }
  }, [consent]);

  // Handle form field changes
  const handleFieldChange = useCallback((field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      // ✅ v0.8.7: Check if DSR warning should be shown
      if (field === 'consent_given') {
        const currentStatus = consent?.consentGiven ?? true;
        const needsDSR = (currentStatus === true && value === false) ||
                         (currentStatus === false && value === true);
        setShowDSRWarning(needsDSR);
      }

      return newData;
    });
    setError(null);
  }, [consent]);

  // Clear signature
  const handleClearSignature = useCallback(() => {
    if (signatureRef.current) {
      signatureRef.current.clear();
      setSignatureDataUrl(null);
    }
  }, []);

  // Save signature data
  const handleSaveSignature = useCallback(() => {
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      const dataUrl = signatureRef.current.toDataURL('image/png');
      setSignatureDataUrl(dataUrl);
      logger.debug('Signature captured successfully');
    }
  }, []);

  // Validate form
  const validateForm = useCallback(() => {
    if (!formData.reason || formData.reason.trim().length < 10) {
      setError('กรุณาระบุเหตุผลอย่างน้อย 10 ตัวอักษร');
      return false;
    }

    if (!formData.consent_given && !signatureDataUrl) {
      setError('กรุณาลงลายมือชื่อเพื่อยืนยันการถอนความยินยอม');
      return false;
    }

    // ✅ v0.8.7: Warn about DSR requirement
    if (requiresDSR()) {
      logger.warn('Consent change requires approved DSR request');
      // Note: Backend will validate and reject if DSR is not found
    }

    return true;
  }, [formData, signatureDataUrl, requiresDSR]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    setError(null);

    try {
      // Prepare update data
      const updateData = {
        consent_given: formData.consent_given,
        reason: formData.reason.trim(),
        legal_basis: formData.legal_basis?.trim() || null,
        signature_data_url: signatureDataUrl,
      };

      logger.debug('Updating consent:', { consentId: consent.id, updateData });

      // Call API (PersonalDataService.updateConsent will be created in Sprint 3.4)
      const updatedConsent = await PersonalDataService.updateConsent(
        consent.id,
        updateData
      );

      logger.info('Consent updated successfully:', updatedConsent);

      // Notify parent component
      if (onUpdate) {
        onUpdate(updatedConsent);
      }

      // Close modal
      onClose();
    } catch (err) {
      logger.error('Error updating consent:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSaving(false);
    }
  }, [formData, signatureDataUrl, consent, validateForm, onUpdate, onClose]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    const hasChanges =
      formData.consent_given !== (consent?.consentGiven ?? true) ||
      formData.reason.trim() !== '' ||
      formData.legal_basis?.trim() !== '' ||
      signatureDataUrl !== null;

    if (hasChanges) {
      if (window.confirm('มีการแก้ไขที่ยังไม่ได้บันทึก ต้องการยกเลิกหรือไม่?')) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [formData, signatureDataUrl, consent, onClose]);

  if (!consent) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Edit2 className="w-5 h-5 text-orange-500" />
                    แก้ไขความยินยอม
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {consent.consentItem?.title_th || consent.consentItem?.titleTh || 'ไม่ระบุหัวข้อ'}
                  </p>
                </div>
                <button
                  onClick={handleCancel}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  disabled={isSaving}
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Error Display */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Current Consent Info */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  สถานะปัจจุบัน
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">ความยินยอม:</span>
                    <span className={`ml-2 font-medium ${
                      consent.consentGiven
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {consent.consentGiven ? '✓ ให้ความยินยอม' : '✗ ไม่ยินยอม'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">เมื่อ:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {consent.consentedAt
                        ? new Date(consent.consentedAt).toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : '-'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600 dark:text-gray-400">วัตถุประสงค์:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {consent.purpose || consent.consentItem?.purpose || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Consent Status Toggle */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  สถานะความยินยอมใหม่ *
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => handleFieldChange('consent_given', true)}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                      formData.consent_given
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-400'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-green-300'
                    }`}
                  >
                    <Check className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-sm font-medium">ให้ความยินยอม</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFieldChange('consent_given', false)}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                      !formData.consent_given
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-400'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-red-300'
                    }`}
                  >
                    <X className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-sm font-medium">ถอนความยินยอม</span>
                  </button>
                </div>
              </div>

              {/* ✅ v0.8.7: DSR Warning */}
              {showDSRWarning && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                        ⚠️ ต้องมีคำขอใช้สิทธิ์ (DSR) ที่ได้รับการอนุมัติ
                      </p>
                      <p className="text-orange-800 dark:text-orange-200 mb-2">
                        การเปลี่ยนแปลงนี้ต้องการคำขอใช้สิทธิ์ (DSR) ที่ได้รับการอนุมัติภายใน 30 วันที่ผ่านมา ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล มาตรา 30-38
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-orange-700 dark:text-orange-300 text-xs">
                        <li>ถอนความยินยอม (Withdrawal) - มาตรา 19</li>
                        <li>ต่ออายุหลังถอน (Renewal) - ต้องมีคำขอ</li>
                        <li>หากไม่มี DSR ที่อนุมัติแล้ว ระบบจะปฏิเสธการเปลี่ยนแปลง</li>
                      </ul>
                      <p className="mt-2 text-xs font-medium text-orange-900 dark:text-orange-100">
                        💡 กรุณาสร้างคำขอใช้สิทธิ์ใน "DSR" tab ก่อนทำการเปลี่ยนแปลงความยินยอม
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Reason (Required) */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  เหตุผลในการเปลี่ยนแปลง * <span className="text-xs text-gray-500">(อย่างน้อย 10 ตัวอักษร)</span>
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => handleFieldChange('reason', e.target.value)}
                  placeholder="กรุณาระบุเหตุผลในการเปลี่ยนแปลงความยินยอม..."
                  rows={4}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none"
                  disabled={isSaving}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formData.reason.length} / 10 ตัวอักษร
                </p>
              </div>

              {/* Legal Basis (Optional) */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  ฐานทางกฎหมาย (PDPA Section) <span className="text-xs text-gray-500">(ไม่บังคับ)</span>
                </label>
                <textarea
                  value={formData.legal_basis}
                  onChange={(e) => handleFieldChange('legal_basis', e.target.value)}
                  placeholder="เช่น Section 24: Consent, Section 19: Right to withdraw consent"
                  rows={2}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none"
                  disabled={isSaving}
                />
              </div>

              {/* Digital Signature (Required for withdrawal) */}
              {!formData.consent_given && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    ลายมือชื่อดิจิทัล * <span className="text-xs text-gray-500">(จำเป็นสำหรับการถอนความยินยอม)</span>
                  </label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-900">
                    {!signatureDataUrl ? (
                      <div className="space-y-3">
                        <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white">
                          <SignatureCanvas
                            ref={signatureRef}
                            canvasProps={{
                              className: 'w-full h-40 cursor-crosshair',
                              style: { touchAction: 'none' }
                            }}
                            backgroundColor="white"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleSaveSignature}
                            className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                            <Save className="w-4 h-4" />
                            บันทึกลายมือชื่อ
                          </button>
                          <button
                            type="button"
                            onClick={handleClearSignature}
                            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                            <RotateCcw className="w-4 h-4" />
                            ล้าง
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <img
                          src={signatureDataUrl}
                          alt="Digital Signature"
                          className="w-full h-40 object-contain border border-gray-300 dark:border-gray-600 rounded-lg bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setSignatureDataUrl(null);
                            handleClearSignature();
                          }}
                          className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          เซ็นใหม่
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    กรุณาลงลายมือชื่อในกรอบด้านบน จากนั้นกดปุ่ม "บันทึกลายมือชื่อ"
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex gap-3 justify-end">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    บันทึกการเปลี่ยนแปลง
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConsentEditModal;
