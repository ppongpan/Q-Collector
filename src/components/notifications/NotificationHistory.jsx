/**
 * NotificationHistory
 * View notification history with filtering
 * Q-Collector v0.8.0 Advanced Telegram Notification System
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faTimesCircle,
  faClock,
  faMinusCircle,
  faSync,
  faFilter,
  faChevronLeft,
  faChevronRight,
  faExclamationCircle,
} from '@fortawesome/free-solid-svg-icons';
import NotificationService from '../../services/NotificationService';
import { componentVariants } from '../../lib/animations';

function NotificationHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Load history on mount and when filters/pagination change
  useEffect(() => {
    loadHistory();
  }, [filters, pagination.page]);

  /**
   * Load notification history
   */
  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await NotificationService.getHistory(
        {
          status: filters.status || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
        },
        {
          page: pagination.page,
          limit: pagination.limit,
        }
      );

      setHistory(response.history || []);
      setPagination((prev) => ({
        ...prev,
        total: response.total || 0,
        totalPages: response.totalPages || 0,
      }));
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle filter change
   */
  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
  };

  /**
   * Handle page change
   */
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, page: newPage }));
    }
  };

  /**
   * Get status badge
   */
  const getStatusBadge = (status) => {
    const badges = {
      sent: {
        icon: faCheckCircle,
        label: 'ส่งสำเร็จ',
        color: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
      },
      failed: {
        icon: faTimesCircle,
        label: 'ส่งล้มเหลว',
        color: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
      },
      pending: {
        icon: faClock,
        label: 'รอดำเนินการ',
        color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
      },
      skipped: {
        icon: faMinusCircle,
        label: 'ข้าม',
        color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
      },
    };

    const badge = badges[status] || badges.pending;
    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-medium rounded ${badge.color}`}>
        <FontAwesomeIcon icon={badge.icon} />
        {badge.label}
      </span>
    );
  };

  /**
   * Format date
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          ประวัติการแจ้งเตือน
        </h3>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={loadHistory}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="รีเฟรช"
        >
          <FontAwesomeIcon icon={faSync} className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <FontAwesomeIcon icon={faFilter} className="text-orange-500" />
          <h4 className="font-semibold text-gray-900 dark:text-white">ตัวกรอง</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              สถานะ
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">ทั้งหมด</option>
              <option value="sent">ส่งสำเร็จ</option>
              <option value="failed">ส่งล้มเหลว</option>
              <option value="pending">รอดำเนินการ</option>
              <option value="skipped">ข้าม</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              จากวันที่
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ถึงวันที่
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <FontAwesomeIcon icon={faSync} className="w-8 h-8 text-orange-500 animate-spin" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">กำลังโหลดประวัติ...</span>
        </div>
      ) : history.length === 0 ? (
        // Empty State
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center p-12 text-center"
        >
          <FontAwesomeIcon icon={faExclamationCircle} className="w-16 h-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            ไม่พบประวัติการแจ้งเตือน
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            ยังไม่มีการแจ้งเตือนที่ตรงกับตัวกรอง
          </p>
        </motion.div>
      ) : (
        // History List
        <>
          <div className="space-y-3">
            <AnimatePresence>
              {history.map((item) => (
                <motion.div
                  key={item.id}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={componentVariants.fadeInOut}
                  className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {item.notificationRule?.name || 'ไม่ระบุชื่อ'}
                        </h4>
                        {getStatusBadge(item.status)}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(item.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Message */}
                  {item.message && (
                    <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-900 rounded text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {item.message}
                    </div>
                  )}

                  {/* Error Message (if failed) */}
                  {item.status === 'failed' && item.error_message && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded">
                      <p className="text-sm text-red-700 dark:text-red-400 font-medium mb-1">
                        ข้อผิดพลาด:
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-400">{item.error_message}</p>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    {item.submission_id && (
                      <div>Submission ID: {item.submission_id}</div>
                    )}
                    {item.telegram_message_id && (
                      <div>Telegram Message ID: {item.telegram_message_id}</div>
                    )}
                    {item.sent_at && (
                      <div>ส่งเมื่อ: {formatDate(item.sent_at)}</div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                แสดง {(pagination.page - 1) * pagination.limit + 1} -{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} จาก{' '}
                {pagination.total} รายการ
              </p>

              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FontAwesomeIcon icon={faChevronLeft} />
                </motion.button>

                <span className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  หน้า {pagination.page} / {pagination.totalPages}
                </span>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FontAwesomeIcon icon={faChevronRight} />
                </motion.button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default NotificationHistory;
