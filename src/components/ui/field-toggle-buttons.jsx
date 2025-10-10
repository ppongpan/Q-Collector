import React, { useState, useCallback, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faExclamationTriangle, faTable, faComments
} from '@fortawesome/free-solid-svg-icons';

/**
 * FieldToggleButtons - Quick toggle buttons for field settings
 * Displays small toggle buttons for required, table display, and telegram notification
 *
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object
 * @param {Function} props.onUpdate - Update callback function
 * @param {boolean} props.isSubForm - Whether this is a sub form field
 * @param {number} props.tableFieldCount - Current count of fields showing in table
 * @param {number} props.maxTableFields - Maximum allowed table fields
 */
const FieldToggleButtons = ({
  field,
  onUpdate,
  isSubForm = false,
  tableFieldCount = 0,
  maxTableFields = 5
}) => {
  // Local state for immediate visual feedback
  // ✅ Support both camelCase and snake_case
  const [localSettings, setLocalSettings] = useState({
    required: field.required || false,
    showInTable: field.showInTable || field.show_in_table || false,
    sendTelegram: field.sendTelegram || field.send_telegram || false,
  });

  // Sync local state when field prop changes
  useEffect(() => {
    setLocalSettings({
      required: field.required || false,
      showInTable: field.showInTable || field.show_in_table || false,
      sendTelegram: field.sendTelegram || field.send_telegram || false,
    });

    // Debug log
    console.log('🔍 FieldToggleButtons field:', {
      id: field.id,
      title: field.title,
      required: field.required,
      showInTable: field.showInTable,
      show_in_table: field.show_in_table,
      computed_showInTable: field.showInTable || field.show_in_table || false
    });
  }, [field.required, field.showInTable, field.show_in_table, field.sendTelegram, field.send_telegram, field.id, field.title]);


  // Track pending updates to apply in useEffect (fixes React warning)
  const [pendingUpdate, setPendingUpdate] = useState(null);

  // Optimized update handler
  const handleSettingChange = useCallback((setting, value) => {
    // Update local state immediately for instant visual feedback
    setLocalSettings(prev => {
      const newSettings = {
        ...prev,
        [setting]: value
      };

      // Schedule update for useEffect (not in render phase)
      setPendingUpdate({
        fieldId: field.id,
        settings: newSettings
      });

      return newSettings;
    });
  }, [field.id]);

  // Apply pending updates in useEffect (outside render phase)
  useEffect(() => {
    if (pendingUpdate && pendingUpdate.fieldId === field.id) {
      const updatedField = {
        ...field,
        required: pendingUpdate.settings.required,
        showInTable: pendingUpdate.settings.showInTable,
        sendTelegram: pendingUpdate.settings.sendTelegram
      };

      onUpdate(updatedField);
      setPendingUpdate(null); // Clear after applying
    }
  }, [pendingUpdate, field, onUpdate]);

  // Enhanced update handler for complex updates
  const handleComplexUpdate = useCallback((updates) => {
    // Update local state immediately
    setLocalSettings(prev => {
      const newSettings = {
        ...prev,
        ...updates
      };

      // Schedule update for useEffect (not in render phase)
      setPendingUpdate({
        fieldId: field.id,
        settings: newSettings
      });

      return newSettings;
    });
  }, [field.id]);

  // Toggle handlers
  const handleRequiredToggle = useCallback((e) => {
    e.stopPropagation();
    const newRequired = !localSettings.required;

    if (!newRequired) {
      // If unchecking required, also uncheck dependent options
      handleComplexUpdate({
        required: false,
        showInTable: false,
        sendTelegram: false
      });
    } else {
      handleSettingChange('required', true);
    }
  }, [localSettings.required, handleSettingChange, handleComplexUpdate]);

  const handleTableToggle = useCallback((e) => {
    e.stopPropagation();

    // Cannot enable showInTable if field is not required
    if (!localSettings.required && !localSettings.showInTable) {
      return;
    }

    // Cannot enable if already at maximum table fields
    if (!localSettings.showInTable && tableFieldCount >= maxTableFields) {
      return;
    }

    handleSettingChange('showInTable', !localSettings.showInTable);
  }, [localSettings.required, localSettings.showInTable, tableFieldCount, maxTableFields, handleSettingChange]);

  const handleTelegramToggle = useCallback((e) => {
    e.stopPropagation();
    handleSettingChange('sendTelegram', !localSettings.sendTelegram);
  }, [localSettings.sendTelegram, handleSettingChange]);


  return (
    <div className="flex items-center gap-5 px-1" data-interactive="true">
      {/* Required Toggle */}
      <button
        type="button"
        onClick={handleRequiredToggle}
        className={`relative flex items-center justify-center w-12 h-12 rounded transition-all duration-200 ${
          localSettings.required
            ? 'text-red-600 hover:text-red-700'
            : 'text-muted-foreground/60 hover:text-red-500'
        }`}
        title={localSettings.required ? 'ฟิลด์จำเป็น (คลิกเพื่อยกเลิก)' : 'ทำให้เป็นฟิลด์จำเป็น'}
        data-interactive="true"
      >
        <FontAwesomeIcon icon={faExclamationTriangle} className="w-6 h-6" />
      </button>

      {/* Table Display Toggle - only when required */}
      {localSettings.required && (
        <button
          type="button"
          onClick={handleTableToggle}
          disabled={!localSettings.required || (!localSettings.showInTable && tableFieldCount >= maxTableFields)}
          className={`relative flex items-center justify-center w-12 h-12 rounded transition-all duration-200 ${
            localSettings.showInTable
              ? 'text-blue-600 hover:text-blue-700'
              : (!localSettings.required || tableFieldCount >= maxTableFields)
                ? 'text-muted-foreground/30 cursor-not-allowed'
                : 'text-muted-foreground/60 hover:text-blue-500'
          }`}
          title={
            !localSettings.required
              ? 'ต้องเป็นฟิลด์จำเป็นก่อน'
              : tableFieldCount >= maxTableFields && !localSettings.showInTable
                ? `เกินจำนวนสูงสุด (${tableFieldCount}/${maxTableFields})`
                : localSettings.showInTable
                  ? 'แสดงในตาราง (คลิกเพื่อยกเลิก)'
                  : 'แสดงในตาราง'
          }
          data-interactive="true"
        >
          <FontAwesomeIcon icon={faTable} className="w-6 h-6" />
        </button>
      )}

      {/* Telegram Toggle - always visible for main form */}
      {!isSubForm && (
        <button
          type="button"
          onClick={handleTelegramToggle}
          className={`relative flex items-center justify-center w-12 h-12 rounded transition-all duration-200 ${
            localSettings.sendTelegram
              ? 'text-green-600 hover:text-green-700'
              : 'text-muted-foreground/60 hover:text-green-500'
          }`}
          title={localSettings.sendTelegram ? 'แจ้งเตือน Telegram (คลิกเพื่อยกเลิก)' : 'เปิดแจ้งเตือน Telegram'}
          data-interactive="true"
        >
          <FontAwesomeIcon icon={faComments} className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};

export default FieldToggleButtons;