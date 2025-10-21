/**
 * NotificationRuleForm
 * Form for creating and editing notification rules
 * Q-Collector v0.8.0 Advanced Telegram Notification System
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSave,
  faTimes,
  faInfoCircle,
  faExclamationTriangle,
  faCheckCircle,
} from '@fortawesome/free-solid-svg-icons';
import { componentVariants } from '../../lib/animations';

function NotificationRuleForm({ rule, form, onSubmit, onCancel }) {
  const isEditMode = !!rule;

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    triggerType: 'field_update',
    formId: form?.id || '', // Auto-populated from parent form
    subFormId: '',
    targetFieldId: '',
    conditionFormula: '',
    messageTemplate: '',
    botToken: '',
    groupId: '',
    schedule: '',
    isEnabled: true,
    sendOnce: false,
    priority: 'medium',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Load existing rule data in edit mode OR initialize with form.id
  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name || '',
        description: rule.description || '',
        triggerType: rule.trigger_type || 'field_update',
        formId: rule.form_id || form?.id || '',
        subFormId: rule.sub_form_id || '',
        targetFieldId: rule.target_field_id || '',
        conditionFormula: rule.condition_formula || '',
        messageTemplate: rule.message_template || '',
        botToken: rule.bot_token || '',
        groupId: rule.group_id || '',
        schedule: rule.schedule || '',
        isEnabled: rule.is_enabled !== undefined ? rule.is_enabled : true,
        sendOnce: rule.send_once || false,
        priority: rule.priority || 'medium',
      });
    } else if (form?.id) {
      // Auto-populate form_id for new rules
      setFormData((prev) => ({
        ...prev,
        formId: form.id,
      }));
    }
  }, [rule, form]);

  /**
   * Handle input change
   */
  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  /**
   * Validate form
   */
  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'กรุณาระบุชื่อกฎ';
    }

    if (!formData.conditionFormula.trim()) {
      newErrors.conditionFormula = 'กรุณาระบุเงื่อนไขการแจ้งเตือน';
    }

    if (!formData.messageTemplate.trim()) {
      newErrors.messageTemplate = 'กรุณาระบุข้อความที่จะส่ง';
    }

    // Validate schedule for scheduled triggers
    if (formData.triggerType === 'scheduled' && !formData.schedule.trim()) {
      newErrors.schedule = 'กรุณาระบุรูปแบบ cron expression';
    }

    // Validate cron expression format (basic)
    if (formData.triggerType === 'scheduled' && formData.schedule.trim()) {
      const parts = formData.schedule.trim().split(/\s+/);
      if (parts.length !== 5) {
        newErrors.schedule = 'รูปแบบ cron expression ไม่ถูกต้อง (ต้องมี 5 ส่วน)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submit
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (err) {
      console.error('Error submitting form:', err);
      // Error handling is done by parent component
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={componentVariants.fadeInOut}
      className="p-6"
    >
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {isEditMode ? 'แก้ไขกฎการแจ้งเตือน' : 'สร้างกฎการแจ้งเตือนใหม่'}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          กำหนดเงื่อนไขและข้อความสำหรับการแจ้งเตือนอัตโนมัติผ่าน Telegram
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FontAwesomeIcon icon={faInfoCircle} className="w-5 h-5 text-orange-500" />
            ข้อมูลพื้นฐาน
          </h4>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ชื่อกฎ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="เช่น: แจ้งเตือนเมื่อปิดการขายได้"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <FontAwesomeIcon icon={faExclamationTriangle} className="w-4 h-4" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              คำอธิบาย
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="อธิบายวัตถุประสงค์ของกฎนี้..."
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ระดับความสำคัญ
            </label>
            <select
              value={formData.priority}
              onChange={(e) => handleChange('priority', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="high">สูง (ส่งก่อน)</option>
              <option value="medium">กลาง (ปกติ)</option>
              <option value="low">ต่ำ (ส่งทีหลัง)</option>
            </select>
          </div>
        </div>

        {/* Trigger Configuration */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            การเรียกใช้งาน
          </h4>

          {/* Trigger Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ประเภทการเรียกใช้ <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.triggerType}
              onChange={(e) => handleChange('triggerType', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="field_update">เมื่อข้อมูลเปลี่ยน (Field Update)</option>
              <option value="scheduled">ตามกำหนดเวลา (Scheduled)</option>
            </select>
          </div>

          {/* Schedule (only for scheduled trigger) */}
          {formData.triggerType === 'scheduled' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cron Expression <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.schedule}
                onChange={(e) => handleChange('schedule', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.schedule ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="เช่น: 0 9 * * * (ทุกวันเวลา 9:00)"
              />
              {errors.schedule && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="w-4 h-4" />
                  {errors.schedule}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                รูปแบบ: minute hour day month weekday (5 ส่วน)
                <br />
                ตัวอย่าง: 0 9 * * * = ทุกวันเวลา 9:00 น.
              </p>
            </div>
          )}

          {/* Form Selection (Read-Only Display) */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                ฟอร์มที่เลือก
              </label>
              <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 w-4 h-4" />
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {form?.title || 'ไม่ทราบชื่อฟอร์ม'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              ID: {formData.formId || 'ไม่พบ Form ID'}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              กฎนี้จะทำงานเมื่อมีการบันทึกข้อมูลในฟอร์มนี้เท่านั้น
            </p>
          </div>

          {/* Sub-Form Selector (Dropdown) */}
          {form?.subForms && form.subForms.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                เลือก Sub-Form (ถ้าต้องการ)
              </label>
              <select
                value={formData.subFormId}
                onChange={(e) => handleChange('subFormId', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">ไม่เลือก (Main Form เท่านั้น)</option>
                {form.subForms.map((subForm) => (
                  <option key={subForm.id} value={subForm.id}>
                    {subForm.title || `Sub-Form ${subForm.order}`}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                เลือก Sub-Form เฉพาะถ้าต้องการให้กฎนี้ trigger เมื่อมีการบันทึกข้อมูลใน Sub-Form เท่านั้น
              </p>
            </div>
          )}
        </div>

        {/* Condition & Message */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            เงื่อนไขและข้อความ
          </h4>

          {/* Condition Formula */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              เงื่อนไขการแจ้งเตือน (Formula) <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.conditionFormula}
              onChange={(e) => handleChange('conditionFormula', e.target.value)}
              rows={3}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-sm ${
                errors.conditionFormula ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder='เช่น: [สถานะ] = "ปิดการขายได้" AND [ยอดขาย] > 100000'
            />
            {errors.conditionFormula && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <FontAwesomeIcon icon={faExclamationTriangle} className="w-4 h-4" />
                {errors.conditionFormula}
              </p>
            )}
            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-gray-700 dark:text-gray-300">
              <strong>รูปแบบ Formula:</strong>
              <ul className="mt-1 space-y-1 list-disc list-inside">
                <li>อ้างฟิลด์: [ชื่อฟิลด์], [field_1], [field_2]</li>
                <li>เปรียบเทียบ: =, {'<>'}, {'>'}, {'<'}, {'>='}, {'<='}</li>
                <li>ตรรกะ: AND, OR, NOT</li>
                <li>ฟังก์ชัน: CONTAINS([ฟิลด์], "ค่า"), ISBLANK([ฟิลด์]), IF(condition, true_value, false_value)</li>
              </ul>
            </div>
          </div>

          {/* Message Template */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ข้อความที่จะส่ง (Template) <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.messageTemplate}
              onChange={(e) => handleChange('messageTemplate', e.target.value)}
              rows={4}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.messageTemplate ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="เช่น: 🎉 ปิดการขายได้!\n\nลูกค้า: {ชื่อลูกค้า}\nยอดขาย: {ยอดขาย} บาท\nสถานะ: {สถานะ}"
            />
            {errors.messageTemplate && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <FontAwesomeIcon icon={faExclamationTriangle} className="w-4 h-4" />
                {errors.messageTemplate}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              ใช้ {'{ชื่อฟิลด์}'} เพื่อแทนค่าจากข้อมูล | รองรับ Emoji และการขึ้นบรรทัดใหม่
            </p>
          </div>
        </div>

        {/* Advanced Options */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            ตัวเลือกขั้นสูง
          </h4>

          {/* Custom Bot Token & Group ID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bot Token (ถ้าต้องการใช้ bot อื่น)
              </label>
              <input
                type="text"
                value={formData.botToken}
                onChange={(e) => handleChange('botToken', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                เว้นว่างเพื่อใช้ bot ตาม .env
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Group ID (ถ้าต้องการส่งไปกลุ่มอื่น)
              </label>
              <input
                type="text"
                value={formData.groupId}
                onChange={(e) => handleChange('groupId', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="-1001234567890"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                เว้นว่างเพื่อใช้กลุ่มตาม .env
              </p>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            {/* Is Enabled */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isEnabled}
                onChange={(e) => handleChange('isEnabled', e.target.checked)}
                className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  เปิดใช้งานกฎนี้
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  เปิด/ปิดการทำงานของกฎโดยไม่ต้องลบ
                </p>
              </div>
            </label>

            {/* Send Once */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.sendOnce}
                onChange={(e) => handleChange('sendOnce', e.target.checked)}
                className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  ส่งครั้งเดียวต่อข้อมูล
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  ถ้าเปิดใช้ จะไม่ส่งซ้ำแม้เงื่อนไขจะยังเป็นจริง
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} className="mr-2" />
            ยกเลิก
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={submitting}
            className="px-6 py-2 text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <FontAwesomeIcon icon={faCheckCircle} className="mr-2 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faSave} className="mr-2" />
                {isEditMode ? 'บันทึกการแก้ไข' : 'สร้างกฎใหม่'}
              </>
            )}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
}

export default NotificationRuleForm;
