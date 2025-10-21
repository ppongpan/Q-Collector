/**
 * NotificationRulesTab
 * Main tab content for notification rules in Form Settings
 * Shows list of notification rules for the current form
 * Q-Collector v0.8.0 Advanced Telegram Notification System - Per-Form Management
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faPlus, faInfoCircle, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import NotificationRulesList from './NotificationRulesList';
import NotificationRuleForm from './NotificationRuleForm';
import NotificationService from '../../services/NotificationService';
import { componentVariants } from '../../lib/animations';

/**
 * NotificationRulesTab Component
 *
 * @param {Object} props
 * @param {Object} props.form - Current form object with fields and subForms
 * @returns {JSX.Element}
 */
export default function NotificationRulesTab({ form }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  // Load rules for this form on mount
  useEffect(() => {
    loadRules();
  }, [form.id]);

  /**
   * Load notification rules for current form
   */
  const loadRules = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`[NotificationRulesTab] Loading rules for form: ${form.id} (${form.title})`);

      const response = await NotificationService.getRules(
        { formId: form.id },
        { page: 1, limit: 100 }
      );

      console.log(`[NotificationRulesTab] Loaded ${response.rules?.length || 0} rules`);

      setRules(response.rules || []);
    } catch (err) {
      console.error('[NotificationRulesTab] Error loading rules:', err);
      setError('ไม่สามารถโหลดกฎการแจ้งเตือนได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle create new rule button click
   */
  const handleCreate = () => {
    console.log('[NotificationRulesTab] Creating new rule for form:', form.id);
    setEditingRule(null);
    setShowForm(true);
  };

  /**
   * Handle edit rule button click
   * @param {Object} rule - Rule to edit
   */
  const handleEdit = (rule) => {
    console.log('[NotificationRulesTab] Editing rule:', rule.id);
    setEditingRule(rule);
    setShowForm(true);
  };

  /**
   * Handle rule save (create or update)
   */
  const handleSave = async () => {
    console.log('[NotificationRulesTab] Rule saved, reloading list');
    await loadRules();
    setShowForm(false);
    setEditingRule(null);
  };

  /**
   * Handle rule delete
   */
  const handleDelete = async () => {
    console.log('[NotificationRulesTab] Rule deleted, reloading list');
    await loadRules();
  };

  /**
   * Handle cancel create/edit
   */
  const handleCancel = () => {
    console.log('[NotificationRulesTab] Cancelled form');
    setShowForm(false);
    setEditingRule(null);
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={componentVariants.fadeInOut}
      className="notification-rules-tab p-6"
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <FontAwesomeIcon icon={faBell} className="text-white text-xl" />
              </div>
              กฎการแจ้งเตือนอัตโนมัติ
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 ml-13">
              จัดการการแจ้งเตือนไปยัง Telegram เมื่อมีการบันทึกข้อมูลในฟอร์ม <span className="font-semibold text-orange-600 dark:text-orange-400">"{form.title}"</span>
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreate}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FontAwesomeIcon icon={faPlus} />
            <span className="font-medium">สร้างกฎใหม่</span>
          </motion.button>
        </div>

        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
        >
          <div className="flex items-start gap-3">
            <FontAwesomeIcon
              icon={faInfoCircle}
              className="text-blue-600 dark:text-blue-400 mt-0.5"
            />
            <div className="flex-1 text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">💡 คำแนะนำ:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-300">
                <li>กฎจะ trigger อัตโนมัติเมื่อมีการบันทึกหรือแก้ไขข้อมูลในฟอร์มนี้</li>
                <li>คุณสามารถอ้างอิงฟิลด์ในฟอร์มนี้ได้โดยใช้ <code className="px-1 py-0.5 bg-white dark:bg-gray-800 rounded">[ชื่อฟิลด์]</code></li>
                <li>รองรับการอ้างอิงฟิลด์จาก Main Form และ Sub-Forms</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
          >
            <div className="flex items-center gap-3 text-red-800 dark:text-red-200">
              <FontAwesomeIcon icon={faExclamationCircle} />
              <span className="text-sm">{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rules List */}
      <NotificationRulesList
        rules={rules}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRefresh={loadRules}
        form={form}
      />

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <NotificationRuleForm
            rule={editingRule}
            form={form}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
