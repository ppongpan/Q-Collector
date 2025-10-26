/**
 * SignatureDisplayModal
 *
 * Reusable modal component for displaying digital signatures with full metadata
 *
 * Features:
 * - Display signature image in large format
 * - Show signature metadata (name, date/time, IP, user-agent)
 * - Download signature as PNG file
 * - Responsive design with dark mode support
 *
 * @param {boolean} isOpen - Modal visibility
 * @param {function} onClose - Close handler
 * @param {object} signatureData - Signature data object
 * @param {string} signatureData.signatureDataUrl - Base64 signature image
 * @param {string} signatureData.fullName - Signer's name
 * @param {string} signatureData.consentedAt - Timestamp
 * @param {string} signatureData.ipAddress - IP address
 * @param {string} signatureData.userAgent - User-Agent string
 *
 * @version v0.8.5-dev
 * @date 2025-10-24
 */

import React from 'react';
import { X, User, Calendar, Download, Activity } from 'lucide-react';

const SignatureDisplayModal = ({ isOpen, onClose, signatureData }) => {
  if (!isOpen || !signatureData) return null;

  const handleDownload = () => {
    try {
      // Create download link for signature
      const link = document.createElement('a');
      link.href = signatureData.signatureDataUrl;
      const fileName = `signature_${signatureData.fullName || 'unknown'}_${new Date(signatureData.consentedAt).getTime()}.png`;
      link.download = fileName;
      link.click();
    } catch (error) {
      console.error('Failed to download signature:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            ลายเซ็นดิจิทัล
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Signature Image */}
          <div className="bg-gray-50 dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-lg p-6 mb-6">
            <img
              src={signatureData.signatureDataUrl}
              alt="Digital Signature"
              className="max-w-full h-auto mx-auto"
              style={{ maxHeight: '300px' }}
            />
          </div>

          {/* Metadata */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              ข้อมูลการลงนาม:
            </h4>

            {signatureData.fullName && (
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-gray-600 dark:text-gray-400">ชื่อผู้ลงนาม</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {signatureData.fullName}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-gray-600 dark:text-gray-400">วันที่-เวลาลงนาม</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(signatureData.consentedAt).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </p>
              </div>
            </div>

            {signatureData.ipAddress && (
              <div className="flex items-start gap-3">
                <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-gray-600 dark:text-gray-400">IP Address</p>
                  <p className="text-sm font-mono text-gray-900 dark:text-white">
                    {signatureData.ipAddress}
                  </p>
                </div>
              </div>
            )}

            {signatureData.userAgent && (
              <div className="flex items-start gap-3">
                <Activity className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-gray-600 dark:text-gray-400">User-Agent</p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 break-all font-mono bg-gray-100 dark:bg-gray-900 p-2 rounded">
                    {signatureData.userAgent}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            ลายเซ็นนี้มีผลทางกฎหมายตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              ดาวน์โหลด
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignatureDisplayModal;
