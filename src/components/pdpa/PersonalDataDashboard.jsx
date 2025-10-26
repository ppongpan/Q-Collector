/**
 * PersonalDataDashboard - Personal Data Management Dashboard for PDPA Compliance
 *
 * Main dashboard for managing data subjects, consents, and data retention.
 * Features:
 * - Dashboard statistics (data subjects, consents, DSR requests, retention)
 * - Profile search and list with pagination
 * - Data retention management (expired data, deletion)
 * - PDPA compliance monitoring
 *
 * @version v0.8.2-dev
 * @date 2025-10-24
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Search, AlertTriangle, CheckCircle2, Clock, Users, FileText, Trash2, Shield } from 'lucide-react';
import PersonalDataService from '../../services/PersonalDataService';
import { useEnhancedToast } from '../ui/enhanced-toast';
import logger from '../../utils/logger';
import ProfileDetailModal from './ProfileDetailModal';

// Helper function to calculate time ago from date
const getTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'วันนี้';
  if (diffDays === 1) return 'เมื่อวาน';
  if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} สัปดาห์ที่แล้ว`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} เดือนที่แล้ว`;
  return `${Math.floor(diffDays / 365)} ปีที่แล้ว`;
};

const PersonalDataDashboard = () => {
  // State management
  const [dashboardStats, setDashboardStats] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [expiredData, setExpiredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [retentionPage, setRetentionPage] = useState(1);
  const [retentionTotalPages, setRetentionTotalPages] = useState(1);
  const [selectedExpiredIds, setSelectedExpiredIds] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, profiles, retention
  const [selectedProfileId, setSelectedProfileId] = useState(null); // For ProfileDetailModal

  const toast = useEnhancedToast();

  // Load dashboard stats
  const loadDashboardStats = useCallback(async () => {
    try {
      const stats = await PersonalDataService.getDashboardStats();
      setDashboardStats(stats);
      logger.debug('Dashboard stats loaded:', stats);
    } catch (error) {
      logger.error('Failed to load dashboard stats:', error);
      toast.error('ไม่สามารถโหลดสถิติแดชบอร์ดได้', {
        title: 'เกิดข้อผิดพลาด'
      });
    }
  }, [toast]);

  // Load profiles list
  const loadProfiles = useCallback(async (page = 1, search = '') => {
    try {
      setLoading(true);
      const result = await PersonalDataService.getProfiles({
        page,
        limit: 20,
        search,
        sortBy: 'last_submission_date',
        sortOrder: 'DESC'
      });

      setProfiles(result.profiles);
      setTotalPages(result.totalPages);
      setCurrentPage(page);
      logger.debug(`Loaded ${result.profiles.length} profiles (page ${page})`);
    } catch (error) {
      logger.error('Failed to load profiles:', error);
      toast.error('ไม่สามารถโหลดรายการโปรไฟล์ได้', {
        title: 'เกิดข้อผิดพลาด'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Load expired data
  const loadExpiredData = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const result = await PersonalDataService.getExpiredData({
        page,
        limit: 50,
        category: 'all'
      });

      setExpiredData(result.expiredData);
      setRetentionTotalPages(result.totalPages);
      setRetentionPage(page);
      logger.debug(`Loaded ${result.expiredData.length} expired items (page ${page})`);
    } catch (error) {
      logger.error('Failed to load expired data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลที่หมดอายุได้', {
        title: 'เกิดข้อผิดพลาด'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Initial load
  useEffect(() => {
    loadDashboardStats();
    loadProfiles(1, '');
    loadExpiredData(1);
  }, [loadDashboardStats, loadProfiles, loadExpiredData]);

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    loadProfiles(1, searchTerm);
  };

  // Handle delete expired data
  const handleDeleteExpired = async () => {
    if (selectedExpiredIds.length === 0) {
      toast.warning('กรุณาเลือกข้อมูลที่ต้องการลบอย่างน้อย 1 รายการ', {
        title: 'กรุณาเลือกข้อมูล'
      });
      return;
    }

    try {
      const result = await PersonalDataService.deleteExpiredData({
        dataIds: selectedExpiredIds,
        category: 'all',
        reason: 'PDPA retention period expired - deleted via dashboard',
        hardDelete: false // Soft delete
      });

      toast.success(`ลบข้อมูลที่หมดอายุ ${result.deleted} รายการ`, {
        title: 'ลบข้อมูลสำเร็จ'
      });

      // Reload data
      setSelectedExpiredIds([]);
      setShowDeleteConfirm(false);
      await loadDashboardStats();
      await loadExpiredData(retentionPage);
    } catch (error) {
      logger.error('Failed to delete expired data:', error);
      toast.error('ไม่สามารถลบข้อมูลได้', {
        title: 'เกิดข้อผิดพลาด'
      });
    }
  };

  // Toggle select all expired items
  const toggleSelectAll = () => {
    if (selectedExpiredIds.length === expiredData.length) {
      setSelectedExpiredIds([]);
    } else {
      setSelectedExpiredIds(expiredData.map(item => item.id));
    }
  };

  // Toggle individual item selection
  const toggleSelectItem = (id) => {
    if (selectedExpiredIds.includes(id)) {
      setSelectedExpiredIds(selectedExpiredIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedExpiredIds([...selectedExpiredIds, id]);
    }
  };

  if (!dashboardStats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2 sm:gap-3">
          <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500" />
          <span className="truncate">Personal Data Management Dashboard</span>
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          จัดการข้อมูลส่วนบุคคล ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-4 sm:mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto scrollbar-thin">
        <button
          data-testid="pdpa-overview-tab"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-3 font-medium transition-all whitespace-nowrap text-sm sm:text-base min-h-[44px] ${
            activeTab === 'overview'
              ? 'text-orange-600 border-b-2 border-orange-500'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          ภาพรวม
        </button>
        <button
          data-testid="pdpa-profiles-tab"
          onClick={() => setActiveTab('profiles')}
          className={`px-4 py-3 font-medium transition-all whitespace-nowrap text-sm sm:text-base min-h-[44px] ${
            activeTab === 'profiles'
              ? 'text-orange-600 border-b-2 border-orange-500'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          รายการเจ้าของข้อมูล
        </button>
        <button
          data-testid="pdpa-retention-tab"
          onClick={() => setActiveTab('retention')}
          className={`px-4 py-3 font-medium transition-all whitespace-nowrap text-sm sm:text-base min-h-[44px] ${
            activeTab === 'retention'
              ? 'text-orange-600 border-b-2 border-orange-500'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2">
            ข้อมูลที่ต้องลบ
            {dashboardStats.dataRetention.total > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                {dashboardStats.dataRetention.total}
              </span>
            )}
          </span>
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Data Subjects Card */}
            <div data-testid="stat-card-subjects" className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {dashboardStats.dataSubjects}
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                เจ้าของข้อมูล (Data Subjects)
              </h3>
            </div>

            {/* Consents Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">
                    {dashboardStats.consents.given}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                    / {dashboardStats.consents.total}
                  </span>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                ความยินยอม (Consents Given)
              </h3>
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>อัตราการยินยอม</span>
                  <span>{dashboardStats.consents.complianceRate}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${dashboardStats.consents.complianceRate}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* DSR Requests Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <FileText className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">
                    {dashboardStats.dsrRequests.pending}
                  </span>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                DSR Requests (รอดำเนินการ)
              </h3>
              {dashboardStats.dsrRequests.overdue > 0 && (
                <div className="mt-2 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{dashboardStats.dsrRequests.overdue} เกินกำหนด</span>
                </div>
              )}
            </div>

            {/* Data Retention Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {dashboardStats.dataRetention.total}
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                ข้อมูลที่ต้องลบ (To Delete)
              </h3>
              <div className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>Consents หมดอายุ:</span>
                  <span>{dashboardStats.dataRetention.expiredConsents}</span>
                </div>
                <div className="flex justify-between">
                  <span>Submissions หมดอายุ:</span>
                  <span>{dashboardStats.dataRetention.expiredSubmissions}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              กิจกรรมล่าสุด (Recent Activity)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {dashboardStats.activity.recentSubmissions}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Submissions (30 วัน)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {dashboardStats.activity.formsWithConsents}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Forms ที่มี Consent
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="p-3 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                  <Shield className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {dashboardStats.activity.sensitiveFields}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Sensitive Fields
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profiles Tab */}
      {activeTab === 'profiles' && (
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ค้นหาด้วย Email, เบอร์โทร, หรือชื่อ..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
              >
                ค้นหา
              </button>
            </form>
          </div>

          {/* Profiles Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="first:rounded-tl-lg px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[120px]">
                      ชื่อ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[180px]">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[100px]">
                      จำนวนฟอร์ม
                    </th>
                    <th className="last:rounded-tr-lg px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[140px]">
                      กิจกรรมล่าสุด
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                        </div>
                      </td>
                    </tr>
                  ) : profiles.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        ไม่พบข้อมูล
                      </td>
                    </tr>
                  ) : (
                    profiles.map((profile) => (
                      <tr
                        key={profile.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedProfileId(profile.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {profile.fullName || profile.primaryName || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="max-w-[200px] truncate">
                            {profile.primaryEmail || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            {profile.formCount || profile.totalForms || 0} ฟอร์ม
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {profile.lastSubmissionDate ? (
                            <div className="flex flex-col">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {new Date(profile.lastSubmissionDate).toLocaleDateString('th-TH', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                ({profile.lastSubmissionDate && getTimeAgo(profile.lastSubmissionDate)})
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-600 dark:text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  หน้า {currentPage} จาก {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadProfiles(currentPage - 1, searchTerm)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ก่อนหน้า
                  </button>
                  <button
                    onClick={() => loadProfiles(currentPage + 1, searchTerm)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Data Retention Tab */}
      {activeTab === 'retention' && (
        <div className="space-y-6">
          {/* Warning Alert */}
          {dashboardStats.dataRetention.total > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                  พบข้อมูลที่หมดอายุและต้องลบ {dashboardStats.dataRetention.total} รายการ
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300">
                  ข้อมูลเหล่านี้เกินกำหนดระยะเวลาเก็บรักษาตามที่กำหนดใน Consent Items
                  กรุณาตรวจสอบและดำเนินการลบเพื่อให้สอดคล้องกับ พ.ร.บ. PDPA
                </p>
              </div>
            </div>
          )}

          {/* Bulk Actions */}
          {selectedExpiredIds.length > 0 && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  เลือกแล้ว {selectedExpiredIds.length} รายการ
                </span>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                ลบข้อมูลที่เลือก
              </button>
            </div>
          )}

          {/* Expired Data Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                ข้อมูลที่หมดอายุ (Expired Data)
              </h2>
              <button
                onClick={toggleSelectAll}
                className="text-sm text-orange-600 dark:text-orange-400 hover:underline"
              >
                {selectedExpiredIds.length === expiredData.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedExpiredIds.length === expiredData.length && expiredData.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      ประเภท
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      รายละเอียด
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      วันที่หมดอายุ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      เกินมาแล้ว
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                        </div>
                      </td>
                    </tr>
                  ) : expiredData.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <CheckCircle2 className="w-12 h-12 text-green-500" />
                          <p className="text-gray-600 dark:text-gray-400">
                            ไม่มีข้อมูลที่หมดอายุ
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    expiredData.map((item) => {
                      const daysOverdue = Math.abs(PersonalDataService.calculateDaysUntilExpiry(item.expiryDate));
                      const severity = PersonalDataService.getOverdueSeverity(daysOverdue);
                      const severityColors = {
                        low: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30',
                        medium: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30',
                        high: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30',
                        critical: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30'
                      };

                      return (
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedExpiredIds.includes(item.id)}
                              onChange={() => toggleSelectItem(item.id)}
                              className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                              {item.category === 'consents' ? 'Consent' : 'Submission'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                            <div className="max-w-xs truncate">
                              {item.description || item.email || item.phone || item.id}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {new Date(item.expiryDate).toLocaleDateString('th-TH')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${severityColors[severity]}`}>
                              {daysOverdue} วัน
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {retentionTotalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  หน้า {retentionPage} จาก {retentionTotalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadExpiredData(retentionPage - 1)}
                    disabled={retentionPage === 1}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ก่อนหน้า
                  </button>
                  <button
                    onClick={() => loadExpiredData(retentionPage + 1)}
                    disabled={retentionPage === retentionTotalPages}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                ยืนยันการลบข้อมูล
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              คุณต้องการลบข้อมูลที่เลือก {selectedExpiredIds.length} รายการ ใช่หรือไม่?
              <br />
              <br />
              การลบจะเป็นแบบ Soft Delete (ข้อมูลยังอยู่ในระบบแต่ถูกทำเครื่องหมายว่าลบแล้ว)
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDeleteExpired}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Detail Modal */}
      {selectedProfileId && (
        <ProfileDetailModal
          profileId={selectedProfileId}
          onClose={() => {
            setSelectedProfileId(null);
            // Reload data in case changes were made
            loadDashboardStats();
            loadProfiles(currentPage, searchTerm);
          }}
        />
      )}
    </div>
  );
};

export default PersonalDataDashboard;
