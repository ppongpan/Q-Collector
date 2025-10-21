/**
 * NotificationStats
 * Display statistics and analytics for notification rules
 * Q-Collector v0.8.0 Advanced Telegram Notification System
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartBar,
  faBell,
  faCheckCircle,
  faTimesCircle,
  faToggleOn,
  faToggleOff,
  faSync,
  faExclamationCircle,
} from '@fortawesome/free-solid-svg-icons';
import NotificationService from '../../services/NotificationService';
import { componentVariants } from '../../lib/animations';

function NotificationStats({ rules }) {
  const [ruleStats, setRuleStats] = useState({});
  const [loading, setLoading] = useState(true);

  // Load statistics for all rules
  useEffect(() => {
    loadAllStats();
  }, [rules]);

  /**
   * Load statistics for all rules
   */
  const loadAllStats = async () => {
    if (!rules || rules.length === 0) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const statsPromises = rules.map(async (rule) => {
        try {
          const response = await NotificationService.getRuleStats(rule.id);
          return { ruleId: rule.id, stats: response.stats };
        } catch (err) {
          console.error(`Error loading stats for rule ${rule.id}:`, err);
          return { ruleId: rule.id, stats: null };
        }
      });

      const results = await Promise.all(statsPromises);
      const statsMap = {};
      results.forEach((result) => {
        if (result.stats) {
          statsMap[result.ruleId] = result.stats;
        }
      });

      setRuleStats(statsMap);
    } catch (err) {
      console.error('Error loading statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculate overall statistics
   */
  const calculateOverallStats = () => {
    const totalRules = rules.length;
    const enabledRules = rules.filter((r) => r.is_enabled).length;
    const disabledRules = totalRules - enabledRules;

    let totalSent = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    Object.values(ruleStats).forEach((stats) => {
      totalSent += stats.sent || 0;
      totalFailed += stats.failed || 0;
      totalSkipped += stats.skipped || 0;
    });

    const total = totalSent + totalFailed + totalSkipped;
    const successRate = total > 0 ? ((totalSent / total) * 100).toFixed(1) : 0;

    return {
      totalRules,
      enabledRules,
      disabledRules,
      totalSent,
      totalFailed,
      totalSkipped,
      total,
      successRate,
    };
  };

  const overallStats = calculateOverallStats();

  // Loading state
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <FontAwesomeIcon icon={faSync} className="w-8 h-8 text-orange-500 animate-spin" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">กำลังโหลดสถิติ...</span>
      </div>
    );
  }

  // Empty state
  if (rules.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-12 flex flex-col items-center justify-center text-center"
      >
        <FontAwesomeIcon icon={faExclamationCircle} className="w-16 h-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
          ยังไม่มีข้อมูลสถิติ
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          สร้างกฎการแจ้งเตือนเพื่อดูสถิติการใช้งาน
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={componentVariants.fadeInOut}
      className="p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <FontAwesomeIcon icon={faChartBar} className="text-orange-500" />
          สถิติการแจ้งเตือน
        </h3>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={loadAllStats}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="รีเฟรช"
        >
          <FontAwesomeIcon icon={faSync} className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Overall Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Total Rules */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-800"
        >
          <div className="flex items-center justify-between mb-2">
            <FontAwesomeIcon icon={faBell} className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {overallStats.totalRules}
          </div>
          <div className="text-sm text-blue-700 dark:text-blue-300">กฎทั้งหมด</div>
        </motion.div>

        {/* Enabled Rules */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border border-green-200 dark:border-green-800"
        >
          <div className="flex items-center justify-between mb-2">
            <FontAwesomeIcon icon={faToggleOn} className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="text-2xl font-bold text-green-900 dark:text-green-100">
            {overallStats.enabledRules}
          </div>
          <div className="text-sm text-green-700 dark:text-green-300">เปิดใช้งาน</div>
        </motion.div>

        {/* Disabled Rules */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-2">
            <FontAwesomeIcon icon={faToggleOff} className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {overallStats.disabledRules}
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300">ปิดใช้งาน</div>
        </motion.div>

        {/* Success Rate */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg border border-orange-200 dark:border-orange-800"
        >
          <div className="flex items-center justify-between mb-2">
            <FontAwesomeIcon icon={faCheckCircle} className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
            {overallStats.successRate}%
          </div>
          <div className="text-sm text-orange-700 dark:text-orange-300">อัตราสำเร็จ</div>
        </motion.div>
      </div>

      {/* Notification Counts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Total Sent */}
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">ส่งสำเร็จ</div>
              <div className="text-2xl font-bold text-green-600">{overallStats.totalSent}</div>
            </div>
            <FontAwesomeIcon icon={faCheckCircle} className="w-8 h-8 text-green-500" />
          </div>
        </div>

        {/* Total Failed */}
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">ล้มเหลว</div>
              <div className="text-2xl font-bold text-red-600">{overallStats.totalFailed}</div>
            </div>
            <FontAwesomeIcon icon={faTimesCircle} className="w-8 h-8 text-red-500" />
          </div>
        </div>

        {/* Total Skipped */}
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">ข้าม</div>
              <div className="text-2xl font-bold text-gray-600">{overallStats.totalSkipped}</div>
            </div>
            <FontAwesomeIcon icon={faExclamationCircle} className="w-8 h-8 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Per-Rule Statistics */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          สถิติแยกตามกฎ
        </h4>
        <div className="space-y-3">
          {rules.map((rule) => {
            const stats = ruleStats[rule.id];
            if (!stats) {
              return null;
            }

            const total = (stats.sent || 0) + (stats.failed || 0) + (stats.skipped || 0);
            const successRate = total > 0 ? ((stats.sent / total) * 100).toFixed(1) : 0;

            return (
              <motion.div
                key={rule.id}
                whileHover={{ scale: 1.01 }}
                className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                {/* Rule Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h5 className="font-semibold text-gray-900 dark:text-white">{rule.name}</h5>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {rule.trigger_type === 'field_update' ? 'เมื่อข้อมูลเปลี่ยน' : 'ตามกำหนดเวลา'}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded ${
                      rule.is_enabled
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    {rule.is_enabled ? 'เปิดใช้' : 'ปิดใช้'}
                  </span>
                </div>

                {/* Statistics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-900 rounded">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{total}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">ทั้งหมด</div>
                  </div>

                  <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                    <div className="text-lg font-bold text-green-600">{stats.sent || 0}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">ส่งสำเร็จ</div>
                  </div>

                  <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
                    <div className="text-lg font-bold text-red-600">{stats.failed || 0}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">ล้มเหลว</div>
                  </div>

                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-900 rounded">
                    <div className="text-lg font-bold text-gray-600">{stats.skipped || 0}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">ข้าม</div>
                  </div>

                  <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                    <div className="text-lg font-bold text-orange-600">{successRate}%</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">สำเร็จ</div>
                  </div>
                </div>

                {/* Last Sent */}
                {stats.lastSentAt && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                    ส่งล่าสุด:{' '}
                    {new Intl.DateTimeFormat('th-TH', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(stats.lastSentAt))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

export default NotificationStats;
