/**
 * NotificationRulesPage
 * Main page for managing Telegram notification rules
 * Q-Collector v0.8.0 Advanced Telegram Notification System
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faBell,
  faPlus,
  faList,
  faHistory,
  faChartBar,
  faCog,
} from '@fortawesome/free-solid-svg-icons';
import NotificationService from '../services/NotificationService';
import NotificationRulesList from './notifications/NotificationRulesList';
import NotificationRuleForm from './notifications/NotificationRuleForm';
import NotificationHistory from './notifications/NotificationHistory';
import NotificationStats from './notifications/NotificationStats';
import { useAuth } from '../contexts/AuthContext';
import { USER_ROLES } from '../config/roles.config';
import { pageTransitions, componentVariants } from '../lib/animations';

function NotificationRulesPage({ onNavigate }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('rules');
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [queueStats, setQueueStats] = useState(null);

  // Check if user has permission to manage rules
  const canManageRules = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(user?.role);

  // Tabs configuration
  const tabs = [
    {
      id: 'rules',
      title: 'กฎการแจ้งเตือน',
      icon: faList,
      description: 'จัดการกฎการแจ้งเตือนทั้งหมด',
    },
    {
      id: 'history',
      title: 'ประวัติ',
      icon: faHistory,
      description: 'ดูประวัติการแจ้งเตือน',
    },
    {
      id: 'stats',
      title: 'สถิติ',
      icon: faChartBar,
      description: 'สถิติและรายงาน',
    },
    {
      id: 'queue',
      title: 'คิว',
      icon: faCog,
      description: 'สถานะคิวการแจ้งเตือน',
      adminOnly: true,
    },
  ];

  // Load rules on mount
  useEffect(() => {
    loadRules();
    loadQueueStats();
    // Refresh queue stats every 10 seconds
    const interval = setInterval(loadQueueStats, 10000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Load notification rules
   */
  const loadRules = async () => {
    try {
      setLoading(true);
      const response = await NotificationService.getRules({}, { page: 1, limit: 100 });
      setRules(response.rules || []);
      setError(null);
    } catch (err) {
      console.error('Error loading rules:', err);
      setError('ไม่สามารถโหลดกฎการแจ้งเตือนได้');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load queue statistics
   */
  const loadQueueStats = async () => {
    try {
      const response = await NotificationService.getQueueStats();
      setQueueStats(response.stats);
    } catch (err) {
      console.error('Error loading queue stats:', err);
    }
  };

  /**
   * Handle create new rule
   */
  const handleCreate = () => {
    setEditingRule(null);
    setShowForm(true);
  };

  /**
   * Handle edit rule
   */
  const handleEdit = (rule) => {
    setEditingRule(rule);
    setShowForm(true);
  };

  /**
   * Handle delete rule
   */
  const handleDelete = async (ruleId) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบกฎนี้?')) {
      return;
    }

    try {
      await NotificationService.deleteRule(ruleId);
      await loadRules();
    } catch (err) {
      console.error('Error deleting rule:', err);
      alert('ไม่สามารถลบกฎได้: ' + (err.response?.data?.error?.message || err.message));
    }
  };

  /**
   * Handle form submit
   */
  const handleFormSubmit = async (ruleData) => {
    try {
      if (editingRule) {
        await NotificationService.updateRule(editingRule.id, ruleData);
      } else {
        await NotificationService.createRule(ruleData);
      }
      setShowForm(false);
      setEditingRule(null);
      await loadRules();
    } catch (err) {
      console.error('Error saving rule:', err);
      throw err;
    }
  };

  /**
   * Handle form cancel
   */
  const handleFormCancel = () => {
    setShowForm(false);
    setEditingRule(null);
  };

  /**
   * Render tab content
   */
  const renderTabContent = () => {
    switch (activeTab) {
      case 'rules':
        return showForm ? (
          <NotificationRuleForm
            rule={editingRule}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
          />
        ) : (
          <NotificationRulesList
            rules={rules}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onRefresh={loadRules}
            canManageRules={canManageRules}
          />
        );

      case 'history':
        return <NotificationHistory />;

      case 'stats':
        return <NotificationStats rules={rules} />;

      case 'queue':
        return (
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-4">สถานะคิว</h3>
            {queueStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">รอดำเนินการ</div>
                  <div className="text-2xl font-bold text-blue-600">{queueStats.waiting}</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">กำลังประมวลผล</div>
                  <div className="text-2xl font-bold text-green-600">{queueStats.active}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">สำเร็จ</div>
                  <div className="text-2xl font-bold text-gray-600">{queueStats.completed}</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">ล้มเหลว</div>
                  <div className="text-2xl font-bold text-red-600">{queueStats.failed}</div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageTransitions.slideUp}
      className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800"
    >
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate('settings')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="w-5 h-5" />
              </motion.button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FontAwesomeIcon icon={faBell} className="text-orange-500" />
                  การแจ้งเตือน Telegram
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  จัดการกฎการแจ้งเตือนอัตโนมัติ
                </p>
              </div>
            </div>

            {/* Create button */}
            {canManageRules && activeTab === 'rules' && !showForm && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCreate}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <FontAwesomeIcon icon={faPlus} />
                <span>สร้างกฎใหม่</span>
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => {
            // Hide admin-only tabs for non-admin users
            if (tab.adminOnly && !canManageRules) {
              return null;
            }

            return (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setActiveTab(tab.id);
                  setShowForm(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <FontAwesomeIcon icon={tab.icon} />
                <span>{tab.title}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + (showForm ? '-form' : '')}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={componentVariants.fadeInOut}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
          >
            {error ? (
              <div className="p-6 text-center text-red-600">
                <p>{error}</p>
                <button
                  onClick={loadRules}
                  className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  ลองอีกครั้ง
                </button>
              </div>
            ) : (
              renderTabContent()
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default NotificationRulesPage;
