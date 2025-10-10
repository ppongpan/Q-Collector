/**
 * Migration Preview Modal
 * Q-Collector Migration System v0.8.0 - Sprint 5: Frontend Integration
 *
 * Shows field changes preview before saving form with destructive operations warnings
 * Displays ADD_FIELD, DELETE_FIELD, CHANGE_TYPE changes with color-coded indicators
 *
 * @version 0.8.0
 * @created 2025-10-07
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faTrashAlt,
  faExchangeAlt,
  faExclamationTriangle,
  faInfoCircle,
  faTimes,
  faCheck,
  faDatabase
} from '@fortawesome/free-solid-svg-icons';
import { GlassButton } from './glass-button';

/**
 * Get change type display info
 *
 * @param {string} type - Change type (ADD_FIELD, DELETE_FIELD, CHANGE_TYPE)
 * @returns {Object} Display information with color, icon, label, and severity
 */
const getChangeTypeInfo = (type) => {
  switch (type) {
    case 'ADD_FIELD':
      return {
        color: 'green',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
        textColor: 'text-green-600',
        icon: faPlus,
        label: 'เพิ่มฟิลด์',
        severity: 'safe'
      };
    case 'DELETE_FIELD':
      return {
        color: 'red',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        textColor: 'text-red-600',
        icon: faTrashAlt,
        label: 'ลบฟิลด์',
        severity: 'destructive'
      };
    case 'CHANGE_TYPE':
      return {
        color: 'yellow',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/30',
        textColor: 'text-yellow-600',
        icon: faExchangeAlt,
        label: 'เปลี่ยนชนิดข้อมูล',
        severity: 'warning'
      };
    default:
      return {
        color: 'gray',
        bgColor: 'bg-gray-500/10',
        borderColor: 'border-gray-500/30',
        textColor: 'text-gray-600',
        icon: faInfoCircle,
        label: 'อื่น ๆ',
        severity: 'info'
      };
  }
};

/**
 * Get field type display name in Thai
 *
 * @param {string} type - Field type
 * @returns {string} Thai display name
 */
const getFieldTypeDisplay = (type) => {
  const typeMap = {
    short_answer: 'ข้อความสั้น',
    paragraph: 'ข้อความยาว',
    email: 'อีเมล',
    phone: 'เบอร์โทร',
    number: 'ตัวเลข',
    url: 'ลิงก์',
    file_upload: 'แนบไฟล์',
    image_upload: 'แนบรูป',
    date: 'วันที่',
    time: 'เวลา',
    datetime: 'วันที่และเวลา',
    multiple_choice: 'ตัวเลือกหลายแบบ',
    rating: 'คะแนนดาว',
    slider: 'แถบเลื่อน',
    lat_long: 'พิกัด GPS',
    province: 'จังหวัด',
    factory: 'โรงงาน'
  };

  return typeMap[type] || type;
};

/**
 * Migration Preview Modal Component
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Modal visibility state
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onConfirm - Confirm handler (proceed with save)
 * @param {Array} props.changes - Array of field changes
 * @param {boolean} props.isLoading - Loading state during confirmation
 * @param {string} props.formTitle - Form title for display
 *
 * @example
 * <MigrationPreviewModal
 *   isOpen={showPreview}
 *   onClose={() => setShowPreview(false)}
 *   onConfirm={handleConfirmedSave}
 *   changes={detectedChanges}
 *   isLoading={isSaving}
 *   formTitle={form.title}
 * />
 */
const MigrationPreviewModal = ({
  isOpen,
  onClose,
  onConfirm,
  changes,
  isLoading = false,
  formTitle = 'ฟอร์ม'
}) => {
  // Calculate summary statistics
  const summary = {
    total: changes.length,
    add: changes.filter(c => c.type === 'ADD_FIELD').length,
    delete: changes.filter(c => c.type === 'DELETE_FIELD').length,
    change: changes.filter(c => c.type === 'CHANGE_TYPE').length,
    hasDestructive: changes.some(c => c.type === 'DELETE_FIELD' || c.type === 'CHANGE_TYPE')
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, type: 'spring' }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FontAwesomeIcon
                    icon={faDatabase}
                    className="text-white text-xl"
                  />
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      ตรวจสอบการเปลี่ยนแปลงฟิลด์
                    </h2>
                    <p className="text-orange-100 text-sm mt-0.5">
                      {formTitle}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  disabled={isLoading}
                >
                  <FontAwesomeIcon icon={faTimes} className="text-lg" />
                </button>
              </div>

              {/* Summary Statistics */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">ทั้งหมด:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{summary.total} รายการ</span>
                  </div>
                  {summary.add > 0 && (
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faPlus} className="text-green-600 text-xs" />
                      <span className="text-sm text-green-600">{summary.add} เพิ่ม</span>
                    </div>
                  )}
                  {summary.delete > 0 && (
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faTrashAlt} className="text-red-600 text-xs" />
                      <span className="text-sm text-red-600">{summary.delete} ลบ</span>
                    </div>
                  )}
                  {summary.change > 0 && (
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faExchangeAlt} className="text-yellow-600 text-xs" />
                      <span className="text-sm text-yellow-600">{summary.change} เปลี่ยน</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Warning Banner for Destructive Operations */}
              {summary.hasDestructive && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mx-6 mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <FontAwesomeIcon
                      icon={faExclamationTriangle}
                      className="text-yellow-600 dark:text-yellow-500 text-lg mt-0.5"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-yellow-800 dark:text-yellow-300">
                        การดำเนินการนี้อาจส่งผลกระทบต่อข้อมูลที่มีอยู่
                      </h3>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                        โปรดตรวจสอบการเปลี่ยนแปลงให้ถี่ถ้วนก่อนดำเนินการ
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Info Banner */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mx-6 mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon
                    icon={faInfoCircle}
                    className="text-blue-600 dark:text-blue-400"
                  />
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    การเปลี่ยนแปลงจะถูกประมวลผลใน background (ใช้เวลา 5-30 วินาที)
                  </p>
                </div>
              </motion.div>

              {/* Changes List */}
              <div className="px-6 py-4 max-h-[40vh] overflow-y-auto">
                <div className="space-y-3">
                  {changes.map((change, index) => {
                    const info = getChangeTypeInfo(change.type);

                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`p-4 rounded-lg border ${info.bgColor} ${info.borderColor}`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${info.bgColor} flex items-center justify-center`}>
                            <FontAwesomeIcon
                              icon={info.icon}
                              className={info.textColor}
                            />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`font-semibold ${info.textColor}`}>
                                {info.label}
                              </span>
                              {info.severity === 'destructive' && (
                                <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                                  อันตราย
                                </span>
                              )}
                            </div>

                            <div className="text-sm text-gray-700 dark:text-gray-300">
                              <span className="font-medium">{String(change.fieldTitle || 'ไม่มีชื่อ')}</span>
                              <span className="text-gray-500 dark:text-gray-400 mx-2">•</span>
                              <span className="text-gray-500 dark:text-gray-400 font-mono text-xs">
                                {String(change.columnName || 'unknown')}
                              </span>
                            </div>

                            {/* Type-specific details */}
                            {change.type === 'ADD_FIELD' && change.dataType && (
                              <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                ชนิด: {getFieldTypeDisplay(String(change.dataType))}
                              </div>
                            )}

                            {change.type === 'CHANGE_TYPE' && change.oldType && change.newType && (
                              <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                <span className="line-through">{getFieldTypeDisplay(String(change.oldType))}</span>
                                <FontAwesomeIcon icon={faExchangeAlt} className="mx-1" />
                                <span className="font-semibold">{getFieldTypeDisplay(String(change.newType))}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
                <GlassButton
                  onClick={onClose}
                  variant="secondary"
                  disabled={isLoading}
                  className="min-w-[100px]"
                >
                  <FontAwesomeIcon icon={faTimes} className="mr-2" />
                  ยกเลิก
                </GlassButton>

                <GlassButton
                  onClick={onConfirm}
                  variant="primary"
                  disabled={isLoading}
                  className="min-w-[120px]"
                >
                  {isLoading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="inline-block mr-2"
                      >
                        <FontAwesomeIcon icon={faDatabase} />
                      </motion.div>
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faCheck} className="mr-2" />
                      ยืนยันและบันทึก
                    </>
                  )}
                </GlassButton>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MigrationPreviewModal;
