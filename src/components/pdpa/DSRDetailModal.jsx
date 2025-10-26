/**
 * DSRDetailModal - Modal for viewing and managing DSR request details
 *
 * Features:
 * - View DSR request details
 * - Update status (pending → in_progress → completed/rejected)
 * - Add response notes
 * - View action history
 * - Track compliance with PDPA 30-day deadline
 *
 * @version v0.8.7-dev
 * @date 2025-10-26
 */

import React, { useState } from 'react';
import {
  X,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  User,
  Calendar,
  MessageSquare,
  Save,
  Loader2
} from 'lucide-react';
import PersonalDataService from '../../services/PersonalDataService';
import { useEnhancedToast } from '../ui/enhanced-toast';
import logger from '../../utils/logger';

const DSRDetailModal = ({ request, onClose, onUpdate }) => {
  const [status, setStatus] = useState(request.status);
  const [responseNotes, setResponseNotes] = useState(request.responseNotes || '');
  const [updating, setUpdating] = useState(false);
  const toast = useEnhancedToast();

  // DSR Type names in Thai
  const dsrTypeNames = {
    access: 'ขอเข้าถึงข้อมูล (Right to Access)',
    rectification: 'ขอแก้ไขข้อมูล (Right to Rectification)',
    erasure: 'ขอลบข้อมูล (Right to Erasure)',
    portability: 'ขอโอนย้ายข้อมูล (Right to Data Portability)',
    restriction: 'ขอระงับการใช้ (Right to Restriction)',
    objection: 'คัดค้านการใช้ (Right to Object)'
  };

  // All status options with colors (for display purposes)
  const allStatusOptions = [
    {
      value: 'pending',
      label: 'รอดำเนินการ',
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      icon: Clock
    },
    {
      value: 'in_progress',
      label: 'กำลังดำเนินการ',
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      icon: AlertTriangle
    },
    {
      value: 'completed',
      label: 'เสร็จสิ้น',
      color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      icon: CheckCircle
    },
    {
      value: 'rejected',
      label: 'ปฏิเสธ',
      color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      icon: XCircle
    },
    {
      value: 'cancelled',
      label: 'ยกเลิก',
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
      icon: XCircle
    }
  ];

  // Filter status options based on current status and valid transitions
  // Backend only accepts: ['in_progress', 'completed', 'rejected', 'cancelled']
  // Cannot update back to 'pending' or change from terminal states
  const getAvailableStatusOptions = () => {
    const currentStatus = request.status;

    // Terminal states - cannot change
    if (['completed', 'rejected', 'cancelled'].includes(currentStatus)) {
      return allStatusOptions.filter(opt => opt.value === currentStatus);
    }

    // From 'pending': can go to in_progress, completed, rejected, cancelled
    if (currentStatus === 'pending') {
      return allStatusOptions.filter(opt =>
        ['in_progress', 'completed', 'rejected', 'cancelled'].includes(opt.value)
      );
    }

    // From 'in_progress': can go to completed, rejected, cancelled
    if (currentStatus === 'in_progress') {
      return allStatusOptions.filter(opt =>
        ['in_progress', 'completed', 'rejected', 'cancelled'].includes(opt.value)
      );
    }

    // Default: show all except 'pending' (backend doesn't accept it)
    return allStatusOptions.filter(opt => opt.value !== 'pending');
  };

  const statusOptions = getAvailableStatusOptions();

  // For display, find in allStatusOptions (filtered list may not include current status for display)
  const currentStatusOption = allStatusOptions.find(opt => opt.value === request.status) || allStatusOptions[0];
  const CurrentStatusIcon = currentStatusOption?.icon || Clock;

  // Calculate days remaining until deadline (PDPA requires response within 30 days)
  const calculateDaysRemaining = () => {
    if (!request.deadlineDate) return null;
    const deadline = new Date(request.deadlineDate);
    const now = new Date();
    const diffTime = deadline - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = calculateDaysRemaining();
  const isOverdue = daysRemaining !== null && daysRemaining < 0;
  const isUrgent = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 7;

  // Handle status update
  const handleUpdateStatus = async () => {
    // Validation
    if (status === request.status && responseNotes === (request.responseNotes || '')) {
      toast.error('ไม่มีการเปลี่ยนแปลง', {
        title: 'ไม่สามารถบันทึกได้'
      });
      return;
    }

    if ((status === 'completed' || status === 'rejected') && !responseNotes.trim()) {
      toast.error('กรุณากรอกหมายเหตุการดำเนินการ เมื่อเปลี่ยนสถานะเป็น "เสร็จสิ้น" หรือ "ปฏิเสธ"', {
        title: 'ข้อมูลไม่ครบถ้วน',
        duration: 5000
      });
      return;
    }

    try {
      setUpdating(true);

      // Find the selected status option (not current status)
      const selectedStatusOption = allStatusOptions.find(opt => opt.value === status);

      const payload = {
        status,
        note: `อัปเดตสถานะเป็น ${selectedStatusOption?.label || status}`,
        responseNotes: responseNotes.trim() || undefined
      };

      console.log('🔍 Sending DSR status update:', payload);

      await PersonalDataService.updateDSRRequestStatus(request.id, payload);

      logger.info(`DSR request ${request.id} updated to ${status}`);

      toast.success(`อัปเดตสถานะเป็น "${selectedStatusOption?.label || status}" สำเร็จ`, {
        title: 'สำเร็จ',
        description: 'บันทึกข้อมูลเรียบร้อยแล้ว'
      });

      // Notify parent to reload data
      if (onUpdate) {
        onUpdate();
      }

      // Close modal after successful update
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      logger.error('Failed to update DSR request:', error);

      let errorMessage = 'ไม่สามารถอัปเดตสถานะได้';
      if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage, {
        title: 'เกิดข้อผิดพลาด',
        description: 'กรุณาลองใหม่อีกครั้ง'
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-orange-50 to-white dark:from-gray-900 dark:to-gray-800">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              รายละเอียดคำขอใช้สิทธิ์
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {dsrTypeNames[request.requestType] || request.requestType}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={updating}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status and Deadline Section */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  สถานะปัจจุบัน
                </label>
                <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${currentStatusOption.color}`}>
                  <CurrentStatusIcon className="w-4 h-4" />
                  <span className="font-medium">{currentStatusOption.label}</span>
                </div>
              </div>

              {/* Deadline Info */}
              {request.deadlineDate && (
                <div className={`text-right ${isOverdue ? 'text-red-600 dark:text-red-400' : isUrgent ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'}`}>
                  <div className="text-xs font-medium mb-1">
                    {isOverdue ? 'เกินกำหนด' : isUrgent ? 'ใกล้ครบกำหนด' : 'กำหนดส่ง'}
                  </div>
                  <div className="text-sm font-semibold">
                    {new Date(request.deadlineDate).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  {daysRemaining !== null && (
                    <div className="text-xs mt-1">
                      {isOverdue ? `เกิน ${Math.abs(daysRemaining)} วัน` : `อีก ${daysRemaining} วัน`}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Request Information */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5" />
              ข้อมูลคำขอ
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 mt-0.5 text-gray-400" />
                <div>
                  <div className="font-medium text-gray-700 dark:text-gray-300">ผู้ขอใช้สิทธิ์</div>
                  <div className="text-gray-600 dark:text-gray-400">{request.userIdentifier}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 mt-0.5 text-gray-400" />
                <div>
                  <div className="font-medium text-gray-700 dark:text-gray-300">วันที่สร้างคำขอ</div>
                  <div className="text-gray-600 dark:text-gray-400">
                    {new Date(request.createdAt).toLocaleString('th-TH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MessageSquare className="w-4 h-4 mt-0.5 text-gray-400" />
                <div className="flex-1">
                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">เหตุผลในการขอใช้สิทธิ์</div>
                  <div className="text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded p-3">
                    {request.requestDetails?.reason || 'ไม่ระบุเหตุผล'}
                  </div>
                </div>
              </div>

              {/* Selected Forms */}
              {request.requestDetails?.specificForms && request.requestDetails.specificForms.length > 0 && (
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 mt-0.5 text-gray-400" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ฟอร์มที่เลือก ({request.requestDetails.specificForms.length} ฟอร์ม)
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs">
                      ระบุฟอร์มเฉพาะสำหรับการดำเนินการ
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Update Status Section */}
          <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              อัปเดตสถานะ
            </h3>

            {/* Status Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                เปลี่ยนสถานะเป็น <span className="text-red-500">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={updating || ['completed', 'rejected', 'cancelled'].includes(request.status)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 dark:text-white disabled:opacity-50"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {['completed', 'rejected', 'cancelled'].includes(request.status) && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  คำขอนี้อยู่ในสถานะสุดท้าย ไม่สามารถเปลี่ยนแปลงได้
                </p>
              )}
            </div>

            {/* Response Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                หมายเหตุการดำเนินการ
                {(status === 'completed' || status === 'rejected') && (
                  <span className="text-red-500"> *</span>
                )}
              </label>
              <textarea
                value={responseNotes}
                onChange={(e) => setResponseNotes(e.target.value)}
                disabled={updating}
                rows={4}
                placeholder="ระบุรายละเอียดการดำเนินการ เช่น แก้ไขข้อมูล email สำเร็จ จาก old@email.com เป็น new@email.com"
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 dark:text-white disabled:opacity-50"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                หมายเหตุนี้จะถูกบันทึกลงใน Action Log และแสดงในประวัติการดำเนินการ
              </p>
            </div>
          </div>

          {/* Timeline Section */}
          <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Timeline การดำเนินการ
            </h3>

            {/* Timeline Container */}
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-orange-300 via-blue-300 to-green-300 dark:from-orange-600 dark:via-blue-600 dark:to-green-600"></div>

              {/* Timeline Items */}
              <div className="space-y-4">
                {/* 1. Created Event */}
                <div className="flex items-start gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 dark:from-orange-500 dark:to-orange-600 flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-800">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 bg-gradient-to-r from-orange-50 to-white dark:from-orange-900/20 dark:to-gray-800 rounded-lg p-4 border border-orange-200 dark:border-orange-700/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 dark:text-white mb-1">
                          📝 สร้างคำขอใช้สิทธิ์
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          ประเภท: {dsrTypeNames[request.requestType] || request.requestType}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-medium text-orange-600 dark:text-orange-400">
                          สร้างเมื่อ
                        </div>
                        <div className="text-sm text-gray-900 dark:text-white font-medium mt-0.5">
                          {new Date(request.createdAt).toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(request.createdAt).toLocaleTimeString('th-TH', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })} น.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Deadline Event */}
                {request.deadlineDate && (
                  <div className="flex items-start gap-4">
                    <div className="relative flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full ${
                        isOverdue
                          ? 'bg-gradient-to-br from-red-400 to-red-500 dark:from-red-500 dark:to-red-600'
                          : isUrgent
                          ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 dark:from-yellow-500 dark:to-yellow-600'
                          : 'bg-gradient-to-br from-blue-400 to-blue-500 dark:from-blue-500 dark:to-blue-600'
                      } flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-800`}>
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div className={`flex-1 bg-gradient-to-r ${
                      isOverdue
                        ? 'from-red-50 to-white dark:from-red-900/20 dark:to-gray-800 border-red-200 dark:border-red-700/50'
                        : isUrgent
                        ? 'from-yellow-50 to-white dark:from-yellow-900/20 dark:to-gray-800 border-yellow-200 dark:border-yellow-700/50'
                        : 'from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800 border-blue-200 dark:border-blue-700/50'
                    } rounded-lg p-4 border`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 dark:text-white mb-1">
                            ⏰ กำหนดส่งผลตอบกลับ
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {isOverdue && '⚠️ เกินกำหนด'}
                            {!isOverdue && isUrgent && '⚡ ใกล้ครบกำหนด'}
                            {!isOverdue && !isUrgent && '✅ อยู่ในกำหนด'}
                            {daysRemaining !== null && daysRemaining >= 0 && (
                              <span className="ml-2">
                                (เหลือ {daysRemaining} วัน)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xs font-medium ${
                            isOverdue ? 'text-red-600 dark:text-red-400' :
                            isUrgent ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-blue-600 dark:text-blue-400'
                          }`}>
                            ภายใน 30 วัน
                          </div>
                          <div className="text-sm text-gray-900 dark:text-white font-medium mt-0.5">
                            {new Date(request.deadlineDate).toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Action History */}
                {request.statusHistory && request.statusHistory.length > 0 && (
                  request.statusHistory.slice().reverse().map((history, idx) => {
                    const historyStatus = allStatusOptions.find(opt => opt.value === history.status);
                    const HistoryIcon = historyStatus?.icon || Clock;
                    const isCompleted = history.status === 'completed';
                    const isRejected = history.status === 'rejected';

                    return (
                      <div key={idx} className="flex items-start gap-4">
                        <div className="relative flex-shrink-0">
                          <div className={`w-10 h-10 rounded-full ${
                            isCompleted
                              ? 'bg-gradient-to-br from-green-400 to-green-500 dark:from-green-500 dark:to-green-600'
                              : isRejected
                              ? 'bg-gradient-to-br from-red-400 to-red-500 dark:from-red-500 dark:to-red-600'
                              : 'bg-gradient-to-br from-blue-400 to-blue-500 dark:from-blue-500 dark:to-blue-600'
                          } flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-800`}>
                            <HistoryIcon className="w-5 h-5 text-white" />
                          </div>
                        </div>
                        <div className={`flex-1 rounded-lg p-4 border ${
                          isCompleted
                            ? 'bg-gradient-to-r from-green-50 to-white dark:from-green-900/20 dark:to-gray-800 border-green-200 dark:border-green-700/50'
                            : isRejected
                            ? 'bg-gradient-to-r from-red-50 to-white dark:from-red-900/20 dark:to-gray-800 border-red-200 dark:border-red-700/50'
                            : 'bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800 border-blue-200 dark:border-blue-700/50'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div className={`px-2 py-0.5 rounded text-xs font-medium ${historyStatus?.color || 'bg-gray-100'}`}>
                                  {historyStatus?.label || history.status}
                                </div>
                              </div>
                              <div className="text-sm text-gray-900 dark:text-white font-medium">
                                {history.note || `เปลี่ยนสถานะเป็น ${historyStatus?.label || history.status}`}
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <div className={`text-xs font-medium ${
                                isCompleted ? 'text-green-600 dark:text-green-400' :
                                isRejected ? 'text-red-600 dark:text-red-400' :
                                'text-blue-600 dark:text-blue-400'
                              }`}>
                                ดำเนินการเมื่อ
                              </div>
                              <div className="text-sm text-gray-900 dark:text-white font-medium mt-0.5">
                                {new Date(history.timestamp).toLocaleDateString('th-TH', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(history.timestamp).toLocaleTimeString('th-TH', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })} น.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={onClose}
            disabled={updating}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleUpdateStatus}
            disabled={
              updating ||
              ['completed', 'rejected', 'cancelled'].includes(request.status) ||
              (status === request.status && responseNotes === (request.responseNotes || ''))
            }
            className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
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
      </div>
    </div>
  );
};

export default DSRDetailModal;
