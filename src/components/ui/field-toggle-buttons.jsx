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
  const [localSettings, setLocalSettings] = useState({
    required: field.required || false,
    showInTable: field.showInTable || false,
    sendTelegram: field.sendTelegram || false,
  });

  // Sync local state when field prop changes
  useEffect(() => {
    setLocalSettings({
      required: field.required || false,
      showInTable: field.showInTable || false,
      sendTelegram: field.sendTelegram || false,
    });
  }, [field.required, field.showInTable, field.sendTelegram]);


  // Optimized update handler
  const handleSettingChange = useCallback((setting, value) => {
    // Update local state immediately for instant visual feedback
    setLocalSettings(prev => ({
      ...prev,
      [setting]: value
    }));

    // Update parent state
    onUpdate({
      ...field,
      [setting]: value
    });
  }, [field, onUpdate]);

  // Enhanced update handler for complex updates
  const handleComplexUpdate = useCallback((updates) => {
    // Update local state immediately
    setLocalSettings(prev => ({
      ...prev,
      ...updates
    }));

    // Update parent state
    onUpdate({
      ...field,
      ...updates
    });
  }, [field, onUpdate]);

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
    <div className="flex items-center gap-1 px-1" data-interactive="true">
      {/* Required Toggle */}
      <button
        type="button"
        onClick={handleRequiredToggle}
        className={`relative flex items-center justify-center w-6 h-6 rounded transition-all duration-200 ${
          localSettings.required
            ? 'bg-red-500/20 text-red-600 hover:bg-red-500/30'
            : 'bg-muted/20 text-muted-foreground hover:bg-red-500/10 hover:text-red-500'
        }`}
        title={localSettings.required ? 'ฟิลด์จำเป็น (คลิกเพื่อยกเลิก)' : 'ทำให้เป็นฟิลด์จำเป็น'}
        data-interactive="true"
      >
        <FontAwesomeIcon icon={faExclamationTriangle} className="w-3 h-3" />
        {localSettings.required && (
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full"></div>
        )}
      </button>

      {/* Table Display Toggle - only when required */}
      {localSettings.required && (
        <button
          type="button"
          onClick={handleTableToggle}
          disabled={!localSettings.required || (!localSettings.showInTable && tableFieldCount >= maxTableFields)}
          className={`relative flex items-center justify-center w-6 h-6 rounded transition-all duration-200 ${
            localSettings.showInTable
              ? 'bg-blue-500/20 text-blue-600 hover:bg-blue-500/30'
              : (!localSettings.required || tableFieldCount >= maxTableFields)
                ? 'bg-muted/10 text-muted-foreground/50 cursor-not-allowed'
                : 'bg-muted/20 text-muted-foreground hover:bg-blue-500/10 hover:text-blue-500'
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
          <FontAwesomeIcon icon={faTable} className="w-3 h-3" />
          {localSettings.showInTable && (
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full"></div>
          )}
        </button>
      )}

      {/* Telegram Toggle - always visible for main form */}
      {!isSubForm && (
        <button
          type="button"
          onClick={handleTelegramToggle}
          className={`relative flex items-center justify-center w-6 h-6 rounded transition-all duration-200 ${
            localSettings.sendTelegram
              ? 'bg-green-500/20 text-green-600 hover:bg-green-500/30'
              : 'bg-muted/20 text-muted-foreground hover:bg-green-500/10 hover:text-green-500'
          }`}
          title={localSettings.sendTelegram ? 'แจ้งเตือน Telegram (คลิกเพื่อยกเลิก)' : 'เปิดแจ้งเตือน Telegram'}
          data-interactive="true"
        >
          <FontAwesomeIcon icon={faComments} className="w-3 h-3" />
          {localSettings.sendTelegram && (
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full"></div>
          )}
        </button>
      )}
    </div>
  );
};

export default FieldToggleButtons;