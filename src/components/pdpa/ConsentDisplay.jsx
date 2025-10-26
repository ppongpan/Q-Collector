/**
 * ConsentDisplay Component
 * Displays saved PDPA consent records in submission detail view
 *
 * Features:
 * - Shows signature image with zoom modal
 * - Displays full name and verification timestamp
 * - Lists all consent items with granted/denied status
 * - Thai date/time formatting
 * - Privacy notice acceptance status
 *
 * @version v0.8.2-dev
 * @date 2025-10-23
 */

import React, { useState } from 'react';

const ConsentDisplay = ({
  consents = [],
  signatureData = null,
  fullName = '',
  privacyNoticeAccepted = false,
  privacyNoticeVersion = '',
  consentTimestamp = null,
  compact = false
}) => {
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  /**
   * Format Thai date and time
   */
  const formatThaiDateTime = (dateString) => {
    if (!dateString) return '-';

    try {
      const date = new Date(dateString);
      const thaiDate = new Intl.DateTimeFormat('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(date);

      return thaiDate;
    } catch (error) {
      console.error('Failed to format date:', error);
      return dateString;
    }
  };

  // If no consent data, don't render anything
  if (!signatureData && consents.length === 0 && !privacyNoticeAccepted) {
    return null;
  }

  return (
    <div className={`consent-display-container ${compact ? 'space-y-3' : 'space-y-4'}`}>
      {/* Section Header */}
      {!compact && (
        <div className="flex items-center gap-2 pb-3 border-b border-border/40">
          <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            การให้ความยินยอม PDPA
          </h3>
        </div>
      )}

      {/* Privacy Notice Acceptance */}
      {privacyNoticeAccepted && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                ยอมรับนโยบายความเป็นส่วนตัว
              </p>
              {privacyNoticeVersion && (
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  เวอร์ชัน: {privacyNoticeVersion}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Identity Verification Section */}
      {(signatureData || fullName) && (
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            ยืนยันตัวตน
          </h4>

          <div className="space-y-3">
            {/* Full Name */}
            {fullName && (
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  ชื่อ-นามสกุล
                </label>
                <p className="text-sm text-slate-900 dark:text-slate-100 font-medium">
                  {fullName}
                </p>
              </div>
            )}

            {/* Signature */}
            {signatureData && (
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-2">
                  ลายเซ็นดิจิทัล
                </label>
                <div
                  className="relative inline-block cursor-pointer group"
                  onClick={() => setShowSignatureModal(true)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setShowSignatureModal(true)}
                >
                  <img
                    src={signatureData}
                    alt="Digital Signature"
                    className="border-2 border-slate-300 dark:border-slate-600 rounded-lg bg-white max-w-full h-auto"
                    style={{ maxHeight: compact ? '80px' : '120px' }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  คลิกเพื่อดูภาพขยาย
                </p>
              </div>
            )}

            {/* Timestamp */}
            {consentTimestamp && (
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  เวลายืนยัน
                </label>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {formatThaiDateTime(consentTimestamp)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Consent Items List */}
      {consents.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            รายการความยินยอม ({consents.length})
          </h4>

          <div className="space-y-2">
            {consents.map((consent, index) => (
              <div
                key={consent.id || index}
                className={`
                  border rounded-lg p-3
                  ${consent.consentGiven
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Status Icon */}
                  <div className={`flex-shrink-0 mt-0.5 ${consent.consentGiven ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {consent.consentGiven ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>

                  {/* Consent Details */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${consent.consentGiven ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                      {consent.titleTh || consent.title || 'ไม่ระบุ'}
                    </p>
                    {consent.purpose && (
                      <p className={`text-xs mt-1 ${consent.consentGiven ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                        วัตถุประสงค์: {consent.purpose}
                      </p>
                    )}
                    {consent.retentionPeriod && (
                      <p className={`text-xs mt-0.5 ${consent.consentGiven ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        ระยะเวลาเก็บรักษา: {consent.retentionPeriod}
                      </p>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="flex-shrink-0">
                    <span className={`
                      inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                      ${consent.consentGiven
                        ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200'
                        : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200'
                      }
                    `}>
                      {consent.consentGiven ? 'ยินยอม' : 'ไม่ยินยอม'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {showSignatureModal && signatureData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowSignatureModal(false)}
        >
          <div
            className="relative bg-white dark:bg-slate-800 rounded-lg shadow-2xl max-w-4xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/40">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                ลายเซ็นดิจิทัล
              </h3>
              <button
                onClick={() => setShowSignatureModal(false)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex flex-col items-center">
              <img
                src={signatureData}
                alt="Digital Signature (Full Size)"
                className="border-2 border-slate-300 dark:border-slate-600 rounded-lg bg-white max-w-full h-auto"
              />
              {fullName && (
                <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                  ลงนามโดย: <span className="font-medium text-slate-900 dark:text-slate-100">{fullName}</span>
                </p>
              )}
              {consentTimestamp && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {formatThaiDateTime(consentTimestamp)}
                </p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="mt-6 pt-4 border-t border-border/40 flex justify-end">
              <button
                onClick={() => setShowSignatureModal(false)}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsentDisplay;
