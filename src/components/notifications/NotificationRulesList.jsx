/**
 * NotificationRulesList
 * Display and manage notification rules
 * Q-Collector v0.8.0 Advanced Telegram Notification System
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faToggleOn,
  faToggleOff,
  faEdit,
  faTrash,
  faFlask,
  faCalendarAlt,
  faBolt,
  faExclamationCircle,
  faCheckCircle,
  faSync,
} from '@fortawesome/free-solid-svg-icons';
import NotificationService from '../../services/NotificationService';
import { componentVariants } from '../../lib/animations';

function NotificationRulesList({ rules, loading, onEdit, onDelete, onRefresh, canManageRules }) {
  const [testingRuleId, setTestingRuleId] = useState(null);
  const [togglingRuleId, setTogglingRuleId] = useState(null);

  /**
   * Handle toggle enabled/disabled
   */
  const handleToggleEnabled = async (rule) => {
    if (!canManageRules) return;

    setTogglingRuleId(rule.id);
    try {
      await NotificationService.updateRule(rule.id, {
        isEnabled: !rule.is_enabled,
      });
      await onRefresh();
    } catch (err) {
      console.error('Error toggling rule:', err);
      alert('ไม่สามารถเปลี่ยนสถานะกฎได้: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setTogglingRuleId(null);
    }
  };

  /**
   * Handle test rule
   */
  const handleTest = async (ruleId) => {
    setTestingRuleId(ruleId);
    try {
      const result = await NotificationService.testRule(ruleId);

      let message = 'ผลการทดสอบ:\n\n';
      message += `✅ เงื่อนไข: ${result.result.conditionMet ? 'ผ่าน' : 'ไม่ผ่าน'}\n`;
      message += `📤 จะส่งการแจ้งเตือน: ${result.result.wouldSend ? 'ใช่' : 'ไม่'}\n\n`;

      if (result.result.message) {
        message += `💬 ข้อความ:\n${result.result.message}`;
      }

      alert(message);
    } catch (err) {
      console.error('Error testing rule:', err);
      alert('ไม่สามารถทดสอบกฎได้: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setTestingRuleId(null);
    }
  };

  /**
   * Get trigger type label
   */
  const getTriggerTypeLabel = (type) => {
    return type === 'field_update' ? 'เมื่อข้อมูลเปลี่ยน' : 'ตามกำหนดเวลา';
  };

  /**
   * Get priority badge
   */
  const getPriorityBadge = (priority) => {
    const badges = {
      high: { label: 'สูง', color: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' },
      medium: { label: 'กลาง', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' },
      low: { label: 'ต่ำ', color: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' },
    };

    const badge = badges[priority] || badges.medium;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  /**
   * Get trigger type icon
   */
  const getTriggerIcon = (type) => {
    return type === 'field_update' ? faBolt : faCalendarAlt;
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <FontAwesomeIcon icon={faSync} className="w-8 h-8 text-orange-500 animate-spin" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">กำลังโหลดกฎการแจ้งเตือน...</span>
      </div>
    );
  }

  // Empty state
  if (rules.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center p-12 text-center"
      >
        <FontAwesomeIcon icon={faExclamationCircle} className="w-16 h-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
          ยังไม่มีกฎการแจ้งเตือน
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          คลิก "สร้างกฎใหม่" เพื่อเพิ่มกฎการแจ้งเตือนอัตโนมัติ
        </p>
      </motion.div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          กฎการแจ้งเตือนทั้งหมด ({rules.length})
        </h3>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRefresh}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="รีเฟรช"
        >
          <FontAwesomeIcon icon={faSync} className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        <AnimatePresence>
          {rules.map((rule) => (
            <motion.div
              key={rule.id}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={componentVariants.fadeInOut}
              className={`p-4 rounded-lg border-2 transition-all ${
                rule.is_enabled
                  ? 'bg-white dark:bg-gray-800 border-orange-200 dark:border-orange-800'
                  : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60'
              }`}
            >
              {/* Rule Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {/* Status Icon */}
                    <FontAwesomeIcon
                      icon={rule.is_enabled ? faCheckCircle : faExclamationCircle}
                      className={`w-5 h-5 ${
                        rule.is_enabled
                          ? 'text-green-500'
                          : 'text-gray-400 dark:text-gray-600'
                      }`}
                    />

                    {/* Rule Name */}
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {rule.name}
                    </h4>

                    {/* Priority Badge */}
                    {getPriorityBadge(rule.priority)}
                  </div>

                  {/* Description */}
                  {rule.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 ml-8">
                      {rule.description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  {/* Toggle Enabled */}
                  {canManageRules && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleToggleEnabled(rule)}
                      disabled={togglingRuleId === rule.id}
                      className={`p-2 rounded-lg transition-colors ${
                        rule.is_enabled
                          ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                          : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title={rule.is_enabled ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                    >
                      <FontAwesomeIcon
                        icon={rule.is_enabled ? faToggleOn : faToggleOff}
                        className="w-6 h-6"
                      />
                    </motion.button>
                  )}

                  {/* Test */}
                  {canManageRules && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleTest(rule.id)}
                      disabled={testingRuleId === rule.id}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="ทดสอบกฎ"
                    >
                      <FontAwesomeIcon
                        icon={faFlask}
                        className={testingRuleId === rule.id ? 'animate-pulse' : ''}
                      />
                    </motion.button>
                  )}

                  {/* Edit */}
                  {canManageRules && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onEdit(rule)}
                      className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                      title="แก้ไข"
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </motion.button>
                  )}

                  {/* Delete */}
                  {canManageRules && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onDelete(rule.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="ลบ"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </motion.button>
                  )}
                </div>
              </div>

              {/* Rule Details */}
              <div className="ml-8 space-y-2">
                {/* Trigger Type */}
                <div className="flex items-center gap-2 text-sm">
                  <FontAwesomeIcon
                    icon={getTriggerIcon(rule.trigger_type)}
                    className="w-4 h-4 text-gray-400"
                  />
                  <span className="text-gray-600 dark:text-gray-400">
                    ประเภท:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {getTriggerTypeLabel(rule.trigger_type)}
                  </span>
                  {rule.trigger_type === 'scheduled' && rule.schedule && (
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      ({rule.schedule})
                    </span>
                  )}
                </div>

                {/* Condition Formula */}
                {rule.condition_formula && (
                  <div className="text-sm">
                    <span className="text-gray-600 dark:text-gray-400">เงื่อนไข: </span>
                    <code className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-300 rounded">
                      {rule.condition_formula}
                    </code>
                  </div>
                )}

                {/* Message Template Preview */}
                {rule.message_template && (
                  <div className="text-sm">
                    <span className="text-gray-600 dark:text-gray-400">ข้อความ: </span>
                    <span className="text-gray-700 dark:text-gray-300 italic">
                      {rule.message_template.substring(0, 80)}
                      {rule.message_template.length > 80 ? '...' : ''}
                    </span>
                  </div>
                )}

                {/* Form/SubForm Info */}
                {(rule.form_id || rule.sub_form_id) && (
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    {rule.form_id && `Form ID: ${rule.form_id}`}
                    {rule.sub_form_id && ` | Sub-Form ID: ${rule.sub_form_id}`}
                  </div>
                )}

                {/* Send Once Flag */}
                {rule.send_once && (
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    ⚠️ ส่งครั้งเดียวเท่านั้น (ไม่ส่งซ้ำ)
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default NotificationRulesList;
