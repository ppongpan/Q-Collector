/**
 * ConsentHistoryTab Component
 * Displays the complete timeline of consent changes with filtering
 *
 * Features:
 * - Chronological timeline view (newest first)
 * - Action type filtering (all, given, withdrawn, edited, renewed, expired)
 * - Detailed change information with user, timestamp, reason
 * - Visual indicators for different action types
 * - Pagination support
 *
 * @version v0.8.2-dev
 * @date 2025-10-24
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  RotateCw,
  AlertTriangle,
  User,
  Calendar,
  FileText
} from 'lucide-react';
import PersonalDataService from '../../services/PersonalDataService';
import { useEnhancedToast } from '../ui/enhanced-toast';
import logger from '../../utils/logger';

const ConsentHistoryTab = ({ userConsentId, profileId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const toast = useEnhancedToast();

  // Action icons and colors mapping
  const getActionConfig = (action) => {
    const configs = {
      given: {
        icon: CheckCircle,
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800',
        label: 'ให้ความยินยอม'
      },
      withdrawn: {
        icon: XCircle,
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
        label: 'ถอนความยินยอม'
      },
      edited: {
        icon: Edit,
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
        label: 'แก้ไข'
      },
      renewed: {
        icon: RotateCw,
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        borderColor: 'border-purple-200 dark:border-purple-800',
        label: 'ต่ออายุ'
      },
      expired: {
        icon: AlertTriangle,
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        borderColor: 'border-orange-200 dark:border-orange-800',
        label: 'หมดอายุ'
      }
    };
    return configs[action] || configs.edited;
  };

  // Load consent history
  const loadHistory = useCallback(async () => {
    if (!userConsentId) return;

    try {
      setLoading(true);

      const response = await PersonalDataService.getConsentHistory(userConsentId, {
        action: selectedFilter === 'all' ? null : selectedFilter,
        page: pagination.page,
        limit: pagination.limit
      });

      setHistory(response.data || []);
      setPagination({
        ...pagination,
        total: response.pagination?.total || 0,
        totalPages: response.pagination?.totalPages || 0
      });

      logger.debug(`Loaded ${response.data?.length || 0} consent history records`);
    } catch (error) {
      logger.error('Failed to load consent history:', error);
      toast.error('ไม่สามารถโหลดประวัติความยินยอมได้', {
        title: 'เกิดข้อผิดพลาด'
      });
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [userConsentId, selectedFilter, pagination.page, pagination.limit, toast]);

  // Load history on mount and when filters change
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Handle filter change
  const handleFilterChange = (filter) => {
    setSelectedFilter(filter);
    setPagination({ ...pagination, page: 1 }); // Reset to first page
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setPagination({ ...pagination, page: newPage });
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter buttons
  const filters = [
    { value: 'all', label: 'ทั้งหมด' },
    { value: 'given', label: 'ให้ความยินยอม' },
    { value: 'withdrawn', label: 'ถอนความยินยอม' },
    { value: 'edited', label: 'แก้ไข' },
    { value: 'renewed', label: 'ต่ออายุ' },
    { value: 'expired', label: 'หมดอายุ' }
  ];

  if (loading && history.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <span className="text-gray-900 dark:text-white">กำลังโหลดประวัติ...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Filters */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          ประวัติการเปลี่ยนแปลง
        </h3>

        {/* Filter Buttons */}
        <div className="flex gap-2 flex-wrap">
          {filters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => handleFilterChange(filter.value)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                selectedFilter === filter.value
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      {history.length > 0 ? (
        <div className="space-y-4">
          {/* Count */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            พบ {pagination.total} รายการ
          </div>

          {/* History Items */}
          <div className="relative space-y-6">
            {/* Timeline Line */}
            <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gray-200 dark:bg-gray-700" />

            {history.map((item, index) => {
              const config = getActionConfig(item.action);
              const Icon = config.icon;

              return (
                <div key={item.id} className="relative flex gap-4">
                  {/* Timeline Dot */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full ${config.bgColor} border-2 ${config.borderColor} flex items-center justify-center z-10`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>

                  {/* Content Card */}
                  <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className={`font-semibold ${config.color}`}>
                          {config.label}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          {formatDate(item.created_at || item.createdAt)}
                        </p>
                      </div>

                      {/* Status Change Badge */}
                      {item.old_status && item.new_status && (
                        <div className="text-xs bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                          <span className="text-gray-600 dark:text-gray-400">{item.old_status}</span>
                          <span className="mx-2">→</span>
                          <span className="text-gray-900 dark:text-white font-medium">{item.new_status}</span>
                        </div>
                      )}
                    </div>

                    {/* Reason */}
                    {item.reason && (
                      <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <div className="flex items-start gap-2">
                          <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">เหตุผล:</p>
                            <p className="text-sm text-gray-900 dark:text-white">{item.reason}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Legal Basis */}
                    {item.legal_basis && (
                      <div className="mb-3 text-xs text-gray-600 dark:text-gray-400">
                        <span className="font-medium">ฐานทางกฎหมาย:</span> {item.legal_basis}
                      </div>
                    )}

                    {/* User Info */}
                    {item.changedBy && (
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <User className="w-3 h-3" />
                        <span>
                          โดย: {item.changedBy.username} ({item.changedBy.role || item.changed_by_role})
                        </span>
                      </div>
                    )}

                    {/* Signature Indicator */}
                    {item.signature_data_url && (
                      <div className="mt-2 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        มีลายมือชื่อดิจิทัล
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                หน้า {pagination.page} จาก {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ก่อนหน้า
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <Clock className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {selectedFilter === 'all'
              ? 'ยังไม่มีประวัติการเปลี่ยนแปลง'
              : `ไม่พบประวัติ "${filters.find(f => f.value === selectedFilter)?.label}"`
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default ConsentHistoryTab;
