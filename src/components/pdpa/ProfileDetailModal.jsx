/**
 * ProfileDetailModal - Modal for viewing detailed profile information
 *
 * Features:
 * - Tabbed interface (Overview, Forms & Data, Consents, DSR Requests)
 * - Display profile information, submissions, consents, and DSR history
 * - Create new DSR requests
 * - Status badges and indicators
 *
 * @version v0.8.2-dev
 * @date 2025-10-24
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Calendar,
  FileText,
  Shield,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Activity,
  ChevronRight,
  Download,
  Plus,
  Edit2,
  History,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PersonalDataService from '../../services/PersonalDataService';
import { useEnhancedToast } from '../ui/enhanced-toast';
import logger from '../../utils/logger';
import DSRRequestForm from './DSRRequestForm';
import ConsentEditModal from './ConsentEditModal';
import ConsentHistoryTab from './ConsentHistoryTab';
import DSRDetailModal from './DSRDetailModal'; // ✅ v0.8.7-dev: DSR Management Modal

const ProfileDetailModal = ({ profileId, onClose }) => {
  const [profile, setProfile] = useState(null);
  const [dsrRequests, setDsrRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('forms');
  const [showDSRForm, setShowDSRForm] = useState(false);
  const [editingConsent, setEditingConsent] = useState(null);
  const [showConsentEditModal, setShowConsentEditModal] = useState(false);
  const [selectedDSRRequest, setSelectedDSRRequest] = useState(null); // ✅ v0.8.7-dev: Selected DSR for detail modal
  const [showDSRDetail, setShowDSRDetail] = useState(false); // ✅ v0.8.7-dev: Show DSR detail modal
  const [expandedConsentHistory, setExpandedConsentHistory] = useState(null);
  const [expandedFormIds, setExpandedFormIds] = useState(new Set()); // ✅ v0.8.4: Track expanded forms
  const [expandedSignature, setExpandedSignature] = useState(null); // ✅ v0.8.5: Track expanded signatures in Forms tab
  const [expandedConsentSignature, setExpandedConsentSignature] = useState(null); // ✅ v0.8.5: Track expanded signatures in Consents tab
  const navigate = useNavigate();
  const toast = useEnhancedToast();

  // Load profile details
  useEffect(() => {
    if (!profileId) return;

    const loadProfileDetail = async () => {
      try {
        setLoading(true);

        // Load profile detail
        const profileData = await PersonalDataService.getProfileDetail(profileId);
        setProfile(profileData);

        // Load DSR requests for this profile
        const dsrData = await PersonalDataService.getProfileDSRRequests(profileId);
        setDsrRequests(dsrData);

        logger.debug('Profile detail loaded:', profileData);
      } catch (error) {
        logger.error('Failed to load profile detail:', error);
        toast.error('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้', {
          title: 'เกิดข้อผิดพลาด'
        });
      } finally {
        setLoading(false);
      }
    };

    loadProfileDetail();
  }, [profileId, toast]);

  // Get DSR status badge
  const getDSRStatusBadge = (status) => {
    const badges = {
      pending: {
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: Clock,
        text: 'รอดำเนินการ'
      },
      in_progress: {
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        icon: Activity,
        text: 'กำลังดำเนินการ'
      },
      completed: {
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        icon: CheckCircle2,
        text: 'เสร็จสิ้น'
      },
      rejected: {
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        icon: XCircle,
        text: 'ปฏิเสธ'
      },
      cancelled: {
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
        icon: XCircle,
        text: 'ยกเลิก'
      }
    };

    return badges[status] || badges.pending;
  };

  // Get DSR request type name in Thai
  const getDSRTypeName = (type) => {
    const types = {
      access: 'ขอเข้าถึงข้อมูล',
      rectification: 'ขอแก้ไขข้อมูล',
      erasure: 'ขอลบข้อมูล',
      portability: 'ขอโอนย้ายข้อมูล',
      restriction: 'ขอจำกัดการประมวลผล',
      objection: 'ขอคัดค้าน'
    };
    return types[type] || type;
  };

  // Handle DSR request created
  const handleDSRRequestCreated = async () => {
    setShowDSRForm(false);

    // Reload DSR requests
    try {
      const dsrData = await PersonalDataService.getProfileDSRRequests(profileId);
      setDsrRequests(dsrData);

      toast.success('สร้างคำขอใช้สิทธิ์สำเร็จ', {
        title: 'สำเร็จ'
      });
    } catch (error) {
      logger.error('Failed to reload DSR requests:', error);
    }
  };

  // Handle view submission detail
  const handleViewSubmission = (submissionId) => {
    // Store context for back button
    sessionStorage.setItem('returnToProfile', profileId);
    sessionStorage.setItem('returnTab', 'forms');

    // Navigate to submission detail
    navigate(`/submissions/${submissionId}`);
  };

  // Handle edit consent
  const handleEditConsent = (consent) => {
    setEditingConsent(consent);
    setShowConsentEditModal(true);
  };

  // Handle consent updated
  const handleConsentUpdated = async (updatedConsent) => {
    setShowConsentEditModal(false);
    setEditingConsent(null);

    // Reload profile data to get updated consents
    try {
      const profileData = await PersonalDataService.getProfileDetail(profileId);
      setProfile(profileData);

      toast.success('อัปเดตความยินยอมสำเร็จ', {
        title: 'สำเร็จ'
      });
    } catch (error) {
      logger.error('Failed to reload profile after consent update:', error);
    }
  };

  // Toggle consent history
  const handleToggleConsentHistory = (consentId) => {
    setExpandedConsentHistory(expandedConsentHistory === consentId ? null : consentId);
  };

  // ✅ v0.8.4: Toggle form expansion to show all submissions
  const handleToggleFormExpand = (formId) => {
    const newExpanded = new Set(expandedFormIds);
    if (newExpanded.has(formId)) {
      newExpanded.delete(formId);
    } else {
      newExpanded.add(formId);
    }
    setExpandedFormIds(newExpanded);
  };

  // ✅ v0.8.7-dev: Handle DSR request click - Open detail modal
  const handleDSRRequestClick = (request) => {
    setSelectedDSRRequest(request);
    setShowDSRDetail(true);
  };

  // ✅ v0.8.7-dev: Handle DSR request updated - Reload data
  const handleDSRRequestUpdated = async () => {
    try {
      // Reload DSR requests
      const dsrData = await PersonalDataService.getProfileDSRRequests(profileId);
      setDsrRequests(dsrData);

      // Reload profile to get updated statistics
      const profileData = await PersonalDataService.getProfileDetail(profileId);
      setProfile(profileData);

      logger.info('DSR requests reloaded after update');
    } catch (error) {
      logger.error('Failed to reload DSR requests:', error);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            <span className="text-gray-900 dark:text-white">กำลังโหลด...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md">
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
            <AlertCircle className="w-6 h-6" />
            <span className="font-medium">ไม่พบข้อมูลโปรไฟล์</span>
          </div>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-none sm:rounded-xl shadow-2xl max-w-6xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header - ✅ v0.8.7: Improved spacing and rounded corners */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-orange-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-t-none sm:rounded-t-xl">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex-shrink-0">
              <User className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                {profile?.fullName || profile?.full_name || profile?.primaryName || profile?.primary_name || 'ไม่ระบุชื่อ'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                Profile ID: {profile?.id?.slice(0, 8) || 'N/A'}...
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Tabs - ✅ v0.8.7: Improved styling & renamed DSR Requests → DSR */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex gap-4 sm:gap-8 px-6 overflow-x-auto scrollbar-thin">
            <button
              onClick={() => setActiveTab('forms')}
              className={`px-4 py-3.5 font-medium transition-all whitespace-nowrap text-sm sm:text-base min-h-[52px] flex items-center gap-2 border-b-2 ${
                activeTab === 'forms'
                  ? 'text-orange-600 dark:text-orange-400 border-orange-500'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white border-transparent'
              }`}
            >
              <span>Consents</span>
              <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full min-w-[24px] text-center">
                {profile.uniqueForms?.length || profile.statistics?.totalForms || 0}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('dsr')}
              className={`px-4 py-3.5 font-medium transition-all whitespace-nowrap text-sm sm:text-base min-h-[52px] flex items-center gap-2 border-b-2 ${
                activeTab === 'dsr'
                  ? 'text-orange-600 dark:text-orange-400 border-orange-500'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white border-transparent'
              }`}
            >
              <span>DSR</span>
              <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full min-w-[24px] text-center">
                {dsrRequests.length}
              </span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Consents Tab - ✅ v0.8.6: Renamed from Forms & Data */}
          {activeTab === 'forms' && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  ฟอร์ม ({profile.uniqueForms?.length || 0}) - การส่งทั้งหมด ({profile.submissions?.length || 0} ครั้ง)
                </h3>
              </div>

              {profile.uniqueForms && profile.uniqueForms.length > 0 ? (
                profile.uniqueForms.map((formGroup) => {
                  const isExpanded = expandedFormIds.has(formGroup.formId);
                  const latestSubmission = formGroup.latestSubmission;

                  return (
                    <div
                      key={formGroup.formId}
                      className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                    >
                      {/* Form Header */}
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                              {formGroup.formTitle}
                            </h4>

                            {/* ✅ v0.8.6: Data Retention Period at Form Level */}
                            {formGroup.consentItems && formGroup.consentItems.length > 0 && (
                              (() => {
                                // Find shortest retention period from all consent items
                                const retentionPeriods = formGroup.consentItems
                                  .map(item => item.retentionPeriod)
                                  .filter(Boolean);

                                if (retentionPeriods.length > 0) {
                                  // If multiple periods exist, select the shortest one
                                  const shortestPeriod = retentionPeriods.reduce((shortest, current) => {
                                    // Simple comparison: extract numbers and compare
                                    const shortestNum = parseInt(shortest.match(/\d+/)?.[0] || '999');
                                    const currentNum = parseInt(current.match(/\d+/)?.[0] || '999');

                                    // If both contain "เดือน" (months) vs "ปี" (years), convert to months
                                    const shortestMonths = shortest.includes('เดือน') ? shortestNum : shortestNum * 12;
                                    const currentMonths = current.includes('เดือน') ? currentNum : currentNum * 12;

                                    return currentMonths < shortestMonths ? current : shortest;
                                  });

                                  return (
                                    <div className="mb-2 text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <span className="font-medium">ระยะเวลาเก็บข้อมูล:</span>
                                      <span>{shortestPeriod}</span>
                                    </div>
                                  );
                                }
                                return null;
                              })()
                            )}

                            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                              <span>
                                ส่งล่าสุด: {latestSubmission?.submittedAt || latestSubmission?.submitted_at
                                  ? new Date(latestSubmission.submittedAt || latestSubmission.submitted_at).toLocaleDateString('th-TH', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })
                                  : '-'}
                              </span>
                              <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 text-xs rounded-full font-medium">
                                {formGroup.submissionCount} การส่ง
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* ✅ v0.8.6: Consent Items Section - Moved BEFORE PII fields */}
                        {formGroup.consentItems && formGroup.consentItems.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                              <span>✅ ความยินยอม ({formGroup.consentItems.length} รายการ)</span>
                            </p>

                            <div className="space-y-2">
                              {formGroup.consentItems.map((consentItem, idx) => (
                                <div
                                  key={consentItem.consentItemId}
                                  className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        {consentItem.consentGiven ? (
                                          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                                        ) : (
                                          <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                                        )}
                                        <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                                          {consentItem.consentItemTitle}
                                        </h5>
                                      </div>

                                      {/* ✅ v0.8.6: Removed description & retentionPeriod for compact display */}
                                      {consentItem.purpose && (
                                        <div className="ml-6 text-xs text-gray-500 dark:text-gray-500">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium">วัตถุประสงค์:</span>
                                            <span>{consentItem.purpose}</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 ml-2">
                                      {/* View History Button */}
                                      <button
                                        onClick={() => handleToggleConsentHistory(consentItem.latestConsentId || `${formGroup.formId}-${consentItem.consentItemId}`)}
                                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors group min-h-[32px] min-w-[32px] flex items-center justify-center"
                                        title="ดูประวัติการเปลี่ยนแปลง"
                                      >
                                        <History className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                                      </button>

                                      {/* Edit Button */}
                                      <button
                                        onClick={() => {
                                          // Create consent object compatible with handleEditConsent
                                          const consentToEdit = {
                                            id: consentItem.latestConsentId,
                                            consentItemId: consentItem.consentItemId,
                                            consentItemTitle: consentItem.consentItemTitle,
                                            consentItemDescription: consentItem.consentItemDescription,
                                            consentGiven: consentItem.consentGiven,
                                            purpose: consentItem.purpose,
                                            retentionPeriod: consentItem.retentionPeriod,
                                            formTitle: formGroup.formTitle,
                                            formId: formGroup.formId
                                          };
                                          handleEditConsent(consentToEdit);
                                        }}
                                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors group min-h-[32px] min-w-[32px] flex items-center justify-center"
                                        title="แก้ไขความยินยอม"
                                      >
                                        <Edit2 className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400" />
                                      </button>

                                      {/* Show signature button if exists */}
                                      {consentItem.hasSignature && (
                                        <button
                                          onClick={() => setExpandedSignature(
                                            expandedSignature === consentItem.consentItemId ? null : consentItem.consentItemId
                                          )}
                                          className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-1 min-h-[32px]"
                                          title="ดูลายเซ็นดิจิทัล"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                          ลายเซ็น
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Expandable Signature Section */}
                                  {expandedSignature === consentItem.consentItemId && (
                                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        ลายเซ็นดิจิทัล:
                                      </p>

                                      {consentItem.allConsents
                                        .filter(c => c.hasSignature)
                                        .map((consent, sigIdx) => (
                                          <div
                                            key={sigIdx}
                                            className="bg-gray-50 dark:bg-gray-800/50 rounded p-2 mb-2"
                                          >
                                            {/* Signature Image */}
                                            <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded p-2 mb-2">
                                              <img
                                                src={consent.signatureDataUrl}
                                                alt="Digital Signature"
                                                className="max-w-full h-auto cursor-pointer"
                                                style={{ maxHeight: '100px' }}
                                                onClick={() => window.open(consent.signatureDataUrl, '_blank')}
                                              />
                                            </div>

                                            {/* Signature Metadata */}
                                            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                              {consent.fullName && (
                                                <div className="flex items-center gap-2">
                                                  <span className="font-medium">ชื่อ:</span>
                                                  <span>{consent.fullName}</span>
                                                </div>
                                              )}
                                              <div className="flex items-center gap-2">
                                                <span className="font-medium">วันที่:</span>
                                                <span>
                                                  {new Date(consent.consentedAt).toLocaleDateString('th-TH', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    second: '2-digit'
                                                  })}
                                                </span>
                                              </div>
                                              {consent.ipAddress && (
                                                <div className="flex items-center gap-2">
                                                  <span className="font-medium">IP Address:</span>
                                                  <span className="font-mono">{consent.ipAddress}</span>
                                                </div>
                                              )}
                                              {consent.userAgent && (
                                                <div className="flex items-start gap-2">
                                                  <span className="font-medium">User-Agent:</span>
                                                  <span className="text-[10px] break-all">{consent.userAgent}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  )}

                                  {/* Expandable History Section */}
                                  {expandedConsentHistory === (consentItem.latestConsentId || `${formGroup.formId}-${consentItem.consentItemId}`) && (
                                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        ประวัติการเปลี่ยนแปลง:
                                      </p>
                                      <ConsentHistoryTab
                                        userConsentId={consentItem.latestConsentId}
                                        profileId={profileId}
                                      />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* ✅ v0.8.6: PII Fields - Moved AFTER Consent Items */}
                        {latestSubmission?.piiFieldValues && latestSubmission.piiFieldValues.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                              <span>ข้อมูลส่วนบุคคลที่บันทึกในฟอร์ม ({latestSubmission.piiFieldCount} ฟิลด์)</span>
                              {latestSubmission.piiFieldValues.some(f => f.isEncrypted) && (
                                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] rounded-full">
                                  🔒 Encrypted
                                </span>
                              )}
                            </p>
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                  <tr>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                      ฟิลด์
                                    </th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                      ค่า
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-900/50 divide-y divide-gray-200 dark:divide-gray-700">
                                  {latestSubmission.piiFieldValues.map((field, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                      <td className="px-3 py-2 text-xs text-gray-900 dark:text-white font-medium">
                                        {field.fieldTitle}
                                        {field.isEncrypted && (
                                          <span className="ml-1 text-green-600 dark:text-green-400" title="Encrypted">🔒</span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">
                                        {field.value !== null && field.value !== undefined ? (
                                          typeof field.value === 'object' ? (
                                            <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto">
                                              {JSON.stringify(field.value, null, 2)}
                                            </pre>
                                          ) : (
                                            <span className="break-words">{String(field.value)}</span>
                                          )
                                        ) : (
                                          <span className="text-gray-400 dark:text-gray-500 italic">-</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="mt-3 flex gap-2 flex-col sm:flex-row">
                          <button
                            onClick={() => handleViewSubmission(latestSubmission.id)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors min-h-[44px] text-sm sm:text-base"
                          >
                            <ExternalLink className="w-4 h-4" />
                            ดูการส่งล่าสุด
                          </button>
                          {formGroup.submissionCount > 1 && (
                            <button
                              onClick={() => handleToggleFormExpand(formGroup.formId)}
                              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors flex items-center gap-2 justify-center min-h-[44px] text-sm sm:text-base"
                            >
                              <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              {isExpanded ? 'ซ่อน' : 'ดู'}การส่งทั้งหมด ({formGroup.submissionCount})
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expanded Submissions List */}
                      {isExpanded && formGroup.submissionCount > 1 && (
                        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                          <div className="p-4 space-y-3">
                            <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                              การส่งทั้งหมด ({formGroup.submissionCount} ครั้ง):
                            </p>
                            {formGroup.submissions.map((submission, idx) => (
                              <div
                                key={submission.id}
                                className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className="text-sm text-gray-900 dark:text-white font-medium">
                                      ครั้งที่ {formGroup.submissionCount - idx}
                                    </p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                      {submission.submittedAt || submission.submitted_at
                                        ? new Date(submission.submittedAt || submission.submitted_at).toLocaleDateString('th-TH', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })
                                        : 'ไม่ทราบวันที่'}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handleViewSubmission(submission.id)}
                                    className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded transition-colors flex items-center gap-1"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    ดูรายละเอียด
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  ไม่พบข้อมูลฟอร์ม
                </div>
              )}
            </div>
          )}

          {/* Consents Tab */}
          {activeTab === 'consents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  ความยินยอม ({profile.consents?.length || 0})
                </h3>
              </div>

              {profile.consents && profile.consents.length > 0 ? (
                profile.consents.map((consent) => (
                  <div
                    key={consent.id}
                    className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    <div className="p-4">
                      {/* ✅ v0.8.3: Display form name for each consent */}
                      {consent.formTitle && (
                        <div className="mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                          <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 flex items-center gap-1">
                            <span>📋</span>
                            <span>ฟอร์ม: {consent.formTitle}</span>
                          </p>
                        </div>
                      )}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {consent.consentItemTitle}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {consent.consentItemDescription}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {consent.consentGiven ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                          )}
                          <button
                            onClick={() => handleToggleConsentHistory(consent.id)}
                            className={`p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors group ${
                              expandedConsentHistory === consent.id ? 'bg-gray-200 dark:bg-gray-700' : ''
                            }`}
                            title="ดูประวัติ"
                          >
                            <History className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                          </button>
                          <button
                            onClick={() => handleEditConsent(consent)}
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                            title="แก้ไขความยินยอม"
                          >
                            <Edit2 className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
                        <div className="flex justify-between">
                          <span>วัตถุประสงค์: {consent.purpose || '-'}</span>
                          <span>ระยะเวลาเก็บ: {consent.retentionPeriod || '-'}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <span>
                            ให้ความยินยอมเมื่อ: {new Date(consent.consentedAt).toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>

                          {/* ✅ v0.8.5: Show signature indicator */}
                          {consent.hasSignature && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedConsentSignature(
                                  expandedConsentSignature === consent.id ? null : consent.id
                                );
                              }}
                              className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                              title="ดูลายเซ็นดิจิทัล"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>ลายเซ็น</span>
                            </button>
                          )}
                        </div>

                        {/* ✅ v0.8.5: Expandable Signature Display */}
                        {expandedConsentSignature === consent.id && consent.hasSignature && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                              ลายเซ็นดิจิทัล:
                            </p>

                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
                              {/* Signature Image */}
                              <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded p-2 mb-3">
                                <img
                                  src={consent.signatureDataUrl || consent.signature_data_url}
                                  alt="Digital Signature"
                                  className="max-w-full h-auto cursor-pointer"
                                  style={{ maxHeight: '120px' }}
                                  onClick={() => {
                                    // Open in modal for full view
                                    window.open(consent.signatureDataUrl || consent.signature_data_url, '_blank');
                                  }}
                                />
                              </div>

                              {/* Signature Metadata */}
                              <div className="space-y-2">
                                {consent.metadata?.fullName && (
                                  <div className="flex items-center gap-2">
                                    <User className="w-3 h-3 text-gray-400" />
                                    <span className="font-medium">ชื่อผู้ลงนาม:</span>
                                    <span>{consent.metadata.fullName}</span>
                                  </div>
                                )}

                                <div className="flex items-center gap-2">
                                  <Calendar className="w-3 h-3 text-gray-400" />
                                  <span className="font-medium">วันที่-เวลา:</span>
                                  <span>
                                    {new Date(consent.metadata?.consentedAt || consent.consentedAt).toLocaleDateString('th-TH', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      second: '2-digit'
                                    })}
                                  </span>
                                </div>

                                {consent.metadata?.ipAddress && (
                                  <div className="flex items-center gap-2">
                                    <Activity className="w-3 h-3 text-gray-400" />
                                    <span className="font-medium">IP Address:</span>
                                    <span className="font-mono text-[10px]">{consent.metadata.ipAddress}</span>
                                  </div>
                                )}

                                {consent.metadata?.userAgent && (
                                  <div className="flex items-start gap-2">
                                    <Activity className="w-3 h-3 text-gray-400 mt-0.5" />
                                    <span className="font-medium">User-Agent:</span>
                                    <span className="text-[10px] break-all text-gray-500 dark:text-gray-500">
                                      {consent.metadata.userAgent}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expandable History Section */}
                    {expandedConsentHistory === consent.id && (
                      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                        <ConsentHistoryTab
                          userConsentId={consent.id}
                          profileId={profileId}
                        />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  ไม่พบข้อมูล Consent
                </div>
              )}
            </div>
          )}

          {/* DSR Tab - ✅ v0.8.7: Renamed from DSR Requests */}
          {activeTab === 'dsr' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  คำขอใช้สิทธิ์ ({dsrRequests.length})
                </h3>
                <button
                  onClick={() => setShowDSRForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  สร้างคำขอใหม่
                </button>
              </div>

              {dsrRequests.length > 0 ? (
                dsrRequests.map((request) => {
                  const statusBadge = getDSRStatusBadge(request.status);
                  const StatusIcon = statusBadge.icon;

                  return (
                    <div
                      key={request.id}
                      className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {getDSRTypeName(request.requestType)}
                            </h4>
                            <span className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full ${statusBadge.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusBadge.text}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {request.requestDetails?.reason || 'ไม่ระบุเหตุผล'}
                          </p>
                        </div>
                        {/* ✅ v0.8.7-dev: Manage button */}
                        <button
                          onClick={() => handleDSRRequestClick(request)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors ml-3"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          จัดการ
                        </button>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            สร้างเมื่อ: {new Date(request.createdAt).toLocaleDateString('th-TH')}
                          </div>
                          <div>
                            กำหนดส่ง: {request.deadlineDate
                              ? new Date(request.deadlineDate).toLocaleDateString('th-TH')
                              : '-'}
                          </div>
                          {request.processedAt && (
                            <div className="col-span-2">
                              ดำเนินการแล้วเมื่อ: {new Date(request.processedAt).toLocaleDateString('th-TH')}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status History */}
                      {request.statusHistory && request.statusHistory.length > 1 && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">ประวัติการดำเนินการ:</p>
                          <div className="space-y-1">
                            {request.statusHistory.slice().reverse().map((history, idx) => (
                              <div key={idx} className="text-xs text-gray-500 dark:text-gray-500">
                                • {history.note || `เปลี่ยนสถานะเป็น ${history.status}`}
                                ({new Date(history.timestamp).toLocaleString('th-TH')})
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  ไม่มีคำขอใช้สิทธิ์
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            ปิด
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => {
                // TODO: Export profile data
                toast.info('กำลังพัฒนาฟีเจอร์นี้', { title: 'Export Data' });
              }}
              className="flex items-center gap-2 px-4 py-2 border border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export ข้อมูล
            </button>
          </div>
        </div>
      </div>

      {/* DSR Request Form Modal */}
      {showDSRForm && (
        <>
          {/* 🔍 DEBUG: Before rendering DSRRequestForm */}
          {console.log('🔍 ProfileDetailModal - Rendering DSRRequestForm')}
          {console.log('🔍 ProfileDetailModal - profileId:', profileId)}
          {console.log('🔍 ProfileDetailModal - profile:', profile)}
          <DSRRequestForm
            profileId={profileId}
            profile={profile}
            onClose={() => setShowDSRForm(false)}
            onSuccess={handleDSRRequestCreated}
          />
        </>
      )}

      {/* Consent Edit Modal */}
      {showConsentEditModal && editingConsent && (
        <ConsentEditModal
          isOpen={showConsentEditModal}
          onClose={() => {
            setShowConsentEditModal(false);
            setEditingConsent(null);
          }}
          consent={editingConsent}
          profileId={profileId}
          onUpdate={handleConsentUpdated}
        />
      )}

      {/* ✅ v0.8.7-dev: DSR Detail Modal for managing DSR requests */}
      {showDSRDetail && selectedDSRRequest && (
        <DSRDetailModal
          request={selectedDSRRequest}
          onClose={() => {
            setShowDSRDetail(false);
            setSelectedDSRRequest(null);
          }}
          onUpdate={handleDSRRequestUpdated}
        />
      )}
    </div>
  );
};

export default ProfileDetailModal;
