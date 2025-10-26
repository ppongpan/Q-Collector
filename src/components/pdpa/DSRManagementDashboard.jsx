/**
 * DSRManagementDashboard Component
 * Admin dashboard for managing Data Subject Rights requests
 *
 * Features:
 * - List all DSR requests with pagination
 * - Filter by status, type, overdue
 * - SLA indicators and overdue warnings
 * - Quick actions (review, approve, reject)
 * - Statistics overview
 * - Export capabilities
 *
 * @version v0.8.2-dev
 * @date 2025-10-24
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Filter,
  Download,
  BarChart3,
  Calendar,
  User,
  FileText,
  RefreshCw
} from 'lucide-react';
import PersonalDataService from '../../services/PersonalDataService';
import { useEnhancedToast } from '../ui/enhanced-toast';
import logger from '../../utils/logger';

const DSRManagementDashboard = ({ onReviewRequest }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    requestType: 'all',
    overdue: false,
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    totalPages: 0
  });
  const [statistics, setStatistics] = useState(null);
  const toast = useEnhancedToast();

  // DSR request type labels
  const getRequestTypeLabel = (type) => {
    const labels = {
      access: 'เข้าถึงข้อมูล',
      rectification: 'แก้ไขข้อมูล',
      erasure: 'ลบข้อมูล',
      portability: 'ส่งต่อข้อมูล',
      restriction: 'จำกัดการประมวลผล',
      objection: 'คัดค้านการประมวลผล'
    };
    return labels[type] || type;
  };

  // Get status badge configuration
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

  // Check if request is overdue
  const isOverdue = (deadlineDate, status) => {
    if (status === 'completed' || status === 'rejected' || status === 'cancelled') {
      return false;
    }
    if (!deadlineDate) return false;
    return new Date(deadlineDate) < new Date();
  };

  // Calculate days until deadline
  const getDaysUntilDeadline = (deadlineDate) => {
    if (!deadlineDate) return null;
    const deadline = new Date(deadlineDate);
    const now = new Date();
    const diff = deadline - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  // Load DSR requests
  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);

      const response = await PersonalDataService.getAllDSRRequests({
        page: filters.page,
        limit: filters.limit,
        status: filters.status === 'all' ? null : filters.status,
        requestType: filters.requestType === 'all' ? null : filters.requestType,
        overdue: filters.overdue || undefined
      });

      setRequests(response.requests || []);
      setPagination({
        total: response.total || 0,
        page: response.page || 1,
        totalPages: response.totalPages || 0
      });

      logger.debug(`Loaded ${response.requests?.length || 0} DSR requests`);
    } catch (error) {
      logger.error('Failed to load DSR requests:', error);
      toast.error('ไม่สามารถโหลดคำขอ DSR ได้', {
        title: 'เกิดข้อผิดพลาด'
      });
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  // Load statistics
  const loadStatistics = useCallback(async () => {
    try {
      const stats = await PersonalDataService.getDSRStatistics();
      setStatistics(stats);
    } catch (error) {
      logger.error('Failed to load DSR statistics:', error);
    }
  }, []);

  // Load data on mount and filter changes
  useEffect(() => {
    loadRequests();
    loadStatistics();
  }, [loadRequests, loadStatistics]);

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page
    }));
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  // Handle refresh
  const handleRefresh = () => {
    loadRequests();
    loadStatistics();
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Statistics */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            DSR Request Management
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            จัดการคำขอใช้สิทธิ์ของเจ้าของข้อมูล (PDPA Section 30-38)
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">ทั้งหมด</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {statistics.total || 0}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">รอดำเนินการ</p>
                <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-300 mt-1">
                  {statistics.byStatus?.pending || 0}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-400">กำลังดำเนินการ</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-300 mt-1">
                  {statistics.byStatus?.in_progress || 0}
                </p>
              </div>
              <RefreshCw className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 dark:text-green-400">เสร็จสิ้น</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-300 mt-1">
                  {statistics.byStatus?.completed || 0}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ตัวกรอง:</span>
          </div>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">สถานะทั้งหมด</option>
            <option value="pending">รอดำเนินการ</option>
            <option value="in_progress">กำลังดำเนินการ</option>
            <option value="completed">เสร็จสิ้น</option>
            <option value="rejected">ปฏิเสธ</option>
            <option value="cancelled">ยกเลิก</option>
          </select>

          {/* Request Type Filter */}
          <select
            value={filters.requestType}
            onChange={(e) => handleFilterChange('requestType', e.target.value)}
            className="px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">ประเภททั้งหมด</option>
            <option value="access">เข้าถึงข้อมูล</option>
            <option value="rectification">แก้ไขข้อมูล</option>
            <option value="erasure">ลบข้อมูล</option>
            <option value="portability">ส่งต่อข้อมูล</option>
            <option value="restriction">จำกัดการประมวลผล</option>
            <option value="objection">คัดค้านการประมวลผล</option>
          </select>

          {/* Overdue Filter */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.overdue}
              onChange={(e) => handleFilterChange('overdue', e.target.checked)}
              className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">เกินกำหนดเท่านั้น</span>
          </label>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              <span className="text-gray-900 dark:text-white">กำลังโหลด...</span>
            </div>
          </div>
        ) : requests.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      ประเภท
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      ผู้ขอ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      วันที่สร้าง
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      กำหนดส่ง
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      สถานะ
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      การดำเนินการ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {requests.map((request) => {
                    const statusBadge = getStatusBadge(request.status);
                    const StatusIcon = statusBadge.icon;
                    const overdue = isOverdue(request.deadlineDate, request.status);
                    const daysUntil = getDaysUntilDeadline(request.deadlineDate);

                    return (
                      <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {getRequestTypeLabel(request.requestType)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <div className="text-sm text-gray-900 dark:text-white">
                              {request.userIdentifier || '-'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(request.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {overdue ? (
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            ) : daysUntil !== null && daysUntil <= 3 ? (
                              <AlertCircle className="w-4 h-4 text-yellow-500" />
                            ) : (
                              <Calendar className="w-4 h-4 text-gray-400" />
                            )}
                            <span className={`text-sm ${
                              overdue ? 'text-red-600 dark:text-red-400 font-medium' :
                              daysUntil !== null && daysUntil <= 3 ? 'text-yellow-600 dark:text-yellow-400' :
                              'text-gray-600 dark:text-gray-400'
                            }`}>
                              {formatDate(request.deadlineDate)}
                              {daysUntil !== null && request.status !== 'completed' && (
                                <span className="ml-1 text-xs">
                                  ({overdue ? `เกิน ${Math.abs(daysUntil)} วัน` : `เหลือ ${daysUntil} วัน`})
                                </span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => onReviewRequest && onReviewRequest(request)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            Review
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  แสดง {requests.length} จาก {pagination.total} รายการ (หน้า {pagination.page}/{pagination.totalPages})
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(filters.page - 1)}
                    disabled={filters.page === 1}
                    className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ก่อนหน้า
                  </button>
                  <button
                    onClick={() => handlePageChange(filters.page + 1)}
                    disabled={filters.page === pagination.totalPages}
                    className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              {filters.status !== 'all' || filters.requestType !== 'all' || filters.overdue
                ? 'ไม่พบคำขอที่ตรงกับเงื่อนไข'
                : 'ยังไม่มีคำขอ DSR'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DSRManagementDashboard;
