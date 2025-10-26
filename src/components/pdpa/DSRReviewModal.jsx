/**
 * DSRReviewModal Component
 * Modal for reviewing and processing DSR requests
 *
 * Purpose: Allows administrators to review DSR request details, view action history,
 * and take actions (approve, reject, mark in progress, add comments)
 * PDPA Requirements: Section 30-38 - DSR rights processing
 *
 * @version v0.8.2-dev
 * @date 2025-10-24
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  Calendar,
  User,
  Mail,
  Phone,
  FileText,
  MessageSquare,
  Send,
  ThumbsUp,
  ThumbsDown,
  Play,
  Download,
  Paperclip
} from 'lucide-react';
import PersonalDataService from '../../services/PersonalDataService';

const DSRReviewModal = ({ isOpen, onClose, request, onActionComplete }) => {
  const [actionHistory, setActionHistory] = useState([]);
  const [actionType, setActionType] = useState(''); // 'approve', 'reject', 'in_progress', 'comment'
  const [notes, setNotes] = useState('');
  const [justification, setJustification] = useState('');
  const [responseData, setResponseData] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load action history when modal opens
  useEffect(() => {
    if (isOpen && request?.id) {
      loadActionHistory();
    }
  }, [isOpen, request?.id]);

  // ✅ v0.8.7: Load action history using new API
  const loadActionHistory = async () => {
    setLoadingHistory(true);
    try {
      const history = await PersonalDataService.getDSRActionHistory(request.id);
      setActionHistory(history || []);
    } catch (error) {
      console.error('Error loading action history:', error);
      setActionHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Reset form when modal closes or action type changes
  useEffect(() => {
    if (!isOpen) {
      setActionType('');
      setNotes('');
      setJustification('');
      setResponseData('');
    }
  }, [isOpen]);

  if (!isOpen || !request) return null;

  // Status badge configuration
  const getStatusBadge = (status) => {
    const badges = {
      pending: {
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: Clock,
        label: 'รอดำเนินการ'
      },
      in_progress: {
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        icon: RefreshCw,
        label: 'กำลังดำเนินการ'
      },
      completed: {
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        icon: CheckCircle,
        label: 'เสร็จสิ้น'
      },
      rejected: {
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        icon: XCircle,
        label: 'ปฏิเสธ'
      },
      cancelled: {
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
        icon: XCircle,
        label: 'ยกเลิก'
      }
    };
    return badges[status] || badges.pending;
  };

  // Request type labels
  const getRequestTypeLabel = (type) => {
    const labels = {
      access: 'ขอเข้าถึงข้อมูล',
      portability: 'ขอโอนย้ายข้อมูล',
      objection: 'ขอคัดค้านการประมวลผล',
      erasure: 'ขอลบข้อมูล',
      restriction: 'ขอจำกัดการประมวลผล',
      rectification: 'ขอแก้ไขข้อมูล',
      withdraw_consent: 'ขอถอนความยินยอม',
      complain: 'ยื่นข้อร้องเรียน'
    };
    return labels[type] || type;
  };

  // Check if overdue
  const isOverdue = () => {
    if (request.status === 'completed' || request.status === 'rejected' || request.status === 'cancelled') {
      return false;
    }
    if (!request.deadlineDate) return false;
    return new Date(request.deadlineDate) < new Date();
  };

  const getDaysUntilDeadline = () => {
    if (!request.deadlineDate) return null;
    const deadline = new Date(request.deadlineDate);
    const now = new Date();
    const diff = deadline - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ✅ v0.8.7: Handle action submission using new workflow API
  const handleSubmitAction = async () => {
    if (!actionType) return;

    // Validation
    if (actionType === 'reject' && (!justification.trim() || justification.trim().length < 50)) {
      alert('กรุณาระบุเหตุผลในการปฏิเสธอย่างน้อย 50 ตัวอักษร');
      return;
    }

    if (actionType === 'approve' && (!notes.trim() || notes.trim().length < 20)) {
      alert('กรุณาระบุหมายเหตุการอนุมัติอย่างน้อย 20 ตัวอักษร');
      return;
    }

    if ((actionType === 'approve' || actionType === 'reject') && !justification.trim()) {
      alert('กรุณาระบุฐานทางกฎหมาย');
      return;
    }

    if (actionType === 'execute' && !responseData.trim()) {
      alert('กรุณาระบุรายละเอียดการดำเนินการ (JSON format)');
      return;
    }

    setLoading(true);
    try {
      // Call appropriate workflow API
      switch (actionType) {
        case 'in_progress':
          await PersonalDataService.reviewDSRRequest(request.id, {
            notes: notes || null
          });
          break;

        case 'approve':
          await PersonalDataService.approveDSRRequest(request.id, {
            notes: notes.trim(),
            legalBasis: justification.trim()
          });
          break;

        case 'reject':
          await PersonalDataService.rejectDSRRequest(request.id, {
            reason: justification.trim(),
            legalBasis: notes.trim() || justification.trim()
          });
          break;

        case 'execute':
          let executionDetails;
          try {
            executionDetails = JSON.parse(responseData);
          } catch (e) {
            alert('รูปแบบ JSON ไม่ถูกต้อง');
            setLoading(false);
            return;
          }

          await PersonalDataService.executeDSRRequest(request.id, {
            executionDetails,
            notes: notes || null
          });
          break;

        default:
          throw new Error('Invalid action type');
      }

      // Reload history
      await loadActionHistory();

      // Reset form
      setActionType('');
      setNotes('');
      setJustification('');
      setResponseData('');

      // Notify parent
      if (onActionComplete) {
        onActionComplete();
      }

      // Close modal if completed or rejected
      if (actionType === 'approve' || actionType === 'reject') {
        onClose();
      }
    } catch (error) {
      console.error('Error submitting action:', error);
      alert('เกิดข้อผิดพลาดในการดำเนินการ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = getStatusBadge(request.status);
  const StatusIcon = statusBadge.icon;
  const overdue = isOverdue();
  const daysUntil = getDaysUntilDeadline();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-orange-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                รายละเอียดคำขอ DSR
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {getRequestTypeLabel(request.requestType)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status and SLA Warning */}
          <div className="flex items-center justify-between">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${statusBadge.color}`}>
              <StatusIcon className="w-4 h-4" />
              <span className="text-sm font-medium">{statusBadge.label}</span>
            </div>

            {overdue && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-medium">
                  เกินกำหนด {Math.abs(daysUntil)} วัน
                </span>
              </div>
            )}
            {!overdue && daysUntil !== null && daysUntil <= 3 && request.status !== 'completed' && (
              <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-medium">
                  เหลือเวลา {daysUntil} วัน
                </span>
              </div>
            )}
          </div>

          {/* Request Information */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">ข้อมูลผู้ขอ</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">ชื่อผู้ขอ</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">
                    {request.requesterName || '-'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">อีเมล</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">
                    {request.requesterEmail || '-'}
                  </p>
                </div>
              </div>

              {request.requesterPhone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">เบอร์โทรศัพท์</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">
                      {request.requesterPhone}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">วันที่สร้างคำขอ</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">
                    {formatDate(request.createdAt)}
                  </p>
                </div>
              </div>

              {request.deadlineDate && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">กำหนดส่ง</p>
                    <p className={`text-sm font-medium mt-0.5 ${
                      overdue ? 'text-red-600 dark:text-red-400' :
                      daysUntil !== null && daysUntil <= 3 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-gray-900 dark:text-white'
                    }`}>
                      {formatDate(request.deadlineDate)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Request Details */}
          {request.requestDetails && (
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">รายละเอียดคำขอ</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {request.requestDetails}
              </p>
            </div>
          )}

          {/* Attachments */}
          {request.attachmentsJson && request.attachmentsJson.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                เอกสารแนบ ({request.attachmentsJson.length})
              </h3>
              <div className="space-y-2">
                {request.attachmentsJson.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {attachment.filename || `Attachment ${index + 1}`}
                    </span>
                    <button
                      onClick={() => window.open(attachment.url, '_blank')}
                      className="text-orange-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Timeline */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">ประวัติการดำเนินการ</h3>

            {loadingHistory ? (
              <div className="text-center py-4">
                <RefreshCw className="w-5 h-5 animate-spin text-gray-400 mx-auto" />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">กำลังโหลด...</p>
              </div>
            ) : actionHistory.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                ยังไม่มีการดำเนินการ
              </p>
            ) : (
              <div className="space-y-3">
                {actionHistory.map((action, index) => (
                  <div
                    key={action.id}
                    className="flex gap-3 pb-3 border-b border-gray-200 dark:border-gray-700 last:border-0 last:pb-0"
                  >
                    <div className="flex-shrink-0 mt-1">
                      {action.actionType === 'comment_added' ? (
                        <MessageSquare className="w-4 h-4 text-blue-500" />
                      ) : action.actionType === 'completed' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : action.actionType === 'rejected' ? (
                        <XCircle className="w-4 h-4 text-red-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {action.performedByUsername || 'System'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(action.createdAt)}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {action.oldStatus && action.newStatus && action.oldStatus !== action.newStatus
                            ? `${action.oldStatus} → ${action.newStatus}`
                            : action.actionType}
                        </span>
                      </div>
                      {(action.notes || action.justification) && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                          {action.notes || action.justification}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons and Form */}
          {request.status !== 'completed' && request.status !== 'rejected' && request.status !== 'cancelled' && (
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white">ดำเนินการ</h3>

              {!actionType ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <button
                    onClick={() => setActionType('in_progress')}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    <span className="text-sm">เริ่มดำเนินการ</span>
                  </button>
                  <button
                    onClick={() => setActionType('approve')}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span className="text-sm">อนุมัติ</span>
                  </button>
                  <button
                    onClick={() => setActionType('reject')}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <ThumbsDown className="w-4 h-4" />
                    <span className="text-sm">ปฏิเสธ</span>
                  </button>
                  <button
                    onClick={() => setActionType('comment')}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-sm">เพิ่มความเห็น</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {actionType === 'approve' && 'อนุมัติคำขอ'}
                      {actionType === 'reject' && 'ปฏิเสธคำขอ'}
                      {actionType === 'in_progress' && 'เริ่มดำเนินการ'}
                      {actionType === 'comment' && 'เพิ่มความเห็น'}
                    </h4>
                    <button
                      onClick={() => {
                        setActionType('');
                        setNotes('');
                        setJustification('');
                        setResponseData('');
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      ยกเลิก
                    </button>
                  </div>

                  {actionType === 'reject' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        เหตุผลในการปฏิเสธ <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={justification}
                        onChange={(e) => setJustification(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        rows="3"
                        placeholder="ระบุเหตุผลในการปฏิเสธคำขอ..."
                      />
                    </div>
                  )}

                  {actionType === 'approve' && request.requestType === 'access' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        ข้อมูลที่จะส่งให้ผู้ขอ <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={responseData}
                        onChange={(e) => setResponseData(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        rows="4"
                        placeholder="ระบุข้อมูลที่จะส่งให้ผู้ขอ (JSON หรือ text)..."
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      หมายเหตุ {actionType === 'comment' && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      rows="3"
                      placeholder="เพิ่มหมายเหตุ (ถ้ามี)..."
                    />
                  </div>

                  <button
                    onClick={handleSubmitAction}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium">
                      {loading ? 'กำลังดำเนินการ...' : 'ยืนยัน'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Response Data (for completed requests) */}
          {request.status === 'completed' && request.responseData && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <h3 className="font-medium text-green-900 dark:text-green-400 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                ข้อมูลที่ส่งให้ผู้ขอ
              </h3>
              <pre className="text-sm text-green-800 dark:text-green-300 whitespace-pre-wrap font-mono bg-white dark:bg-gray-800 p-3 rounded">
                {JSON.stringify(request.responseData, null, 2)}
              </pre>
            </div>
          )}

          {/* Rejection Reason (for rejected requests) */}
          {request.status === 'rejected' && request.responseNotes && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
              <h3 className="font-medium text-red-900 dark:text-red-400 mb-2 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                เหตุผลในการปฏิเสธ
              </h3>
              <p className="text-sm text-red-800 dark:text-red-300 whitespace-pre-wrap">
                {request.responseNotes}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};

export default DSRReviewModal;
