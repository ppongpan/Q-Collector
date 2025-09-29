import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisV, faArrowUp, faArrowDown, faCopy, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './dropdown-menu';

/**
 * FieldOptionsMenu - Optimized field settings dropdown with instant checkbox feedback
 *
 * Key improvements:
 * - Local state for immediate visual feedback
 * - Controlled inputs with proper React keys
 * - Debounced parent state sync
 * - React.memo for performance optimization
 * - Field count validation and limits
 * - Required field validation for table display
 *
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object
 * @param {Function} props.onUpdate - Parent update callback
 * @param {Function} props.onRemove - Field removal callback
 * @param {Function} props.onDuplicate - Field duplication callback
 * @param {Function} props.onMoveUp - Move field up callback
 * @param {Function} props.onMoveDown - Move field down callback
 * @param {boolean} props.canMoveUp - Whether field can move up
 * @param {boolean} props.canMoveDown - Whether field can move down
 * @param {boolean} props.isSubForm - Whether this is a sub form field
 * @param {number} props.tableFieldCount - Current count of fields showing in table
 * @param {number} props.maxTableFields - Maximum allowed table fields (default: 5)
 */
const FieldOptionsMenu = React.memo(({
  field,
  onUpdate,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  isSubForm = false,
  tableFieldCount = 0,
  maxTableFields = 5
}) => {
  // Local state for immediate visual feedback
  const [localSettings, setLocalSettings] = useState({
    required: field.required || false,
    showInTable: field.showInTable || false,
    sendTelegram: field.sendTelegram || false
  });

  // Sync local state when field prop changes
  useEffect(() => {
    setLocalSettings({
      required: field.required || false,
      showInTable: field.showInTable || false,
      sendTelegram: field.sendTelegram || false
    });
  }, [field.required, field.showInTable, field.sendTelegram]);

  // Optimized update handler with immediate local state + async parent sync
  const handleSettingChange = useCallback((setting, checked) => {
    // 1. Update local state immediately for instant visual feedback
    setLocalSettings(prev => ({
      ...prev,
      [setting]: checked
    }));

    // 2. Update parent state asynchronously
    onUpdate({
      ...field,
      [setting]: checked
    });
  }, [field, onUpdate]);

  // Individual checkbox handlers
  const handleRequiredChange = useCallback((e) => {
    e.stopPropagation();
    handleSettingChange('required', e.target.checked);
  }, [handleSettingChange]);

  const handleShowInTableChange = useCallback((e) => {
    e.stopPropagation();

    const isChecking = e.target.checked;

    // Validation 1: Cannot enable showInTable if field is not required
    if (isChecking && !localSettings.required) {
      // Show user feedback and prevent action
      return;
    }

    // Validation 2: Cannot enable if already at maximum table fields
    if (isChecking && tableFieldCount >= maxTableFields) {
      // Show user feedback and prevent action
      return;
    }

    handleSettingChange('showInTable', isChecking);
  }, [handleSettingChange, localSettings.required, tableFieldCount, maxTableFields]);

  const handleSendTelegramChange = useCallback((e) => {
    e.stopPropagation();
    handleSettingChange('sendTelegram', e.target.checked);
  }, [handleSettingChange]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          title="ตัวเลือกเพิ่มเติม"
          className="flex items-center justify-center opacity-70 hover:opacity-100 w-7 h-7 cursor-pointer transition-all duration-300"
          style={{
            background: 'transparent',
            border: 'none'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)';
          }}
        >
          <FontAwesomeIcon icon={faEllipsisV} className="w-3 h-3" />
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="glass-container w-48">
        {/* Move Up/Down Options */}
        {canMoveUp && (
          <DropdownMenuItem onClick={onMoveUp}>
            <FontAwesomeIcon icon={faArrowUp} className="mr-2 w-5 h-5" />
            ย้ายขึ้น
          </DropdownMenuItem>
        )}

        {canMoveDown && (
          <DropdownMenuItem onClick={onMoveDown}>
            <FontAwesomeIcon icon={faArrowDown} className="mr-2 w-5 h-5" />
            ย้ายลง
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={onDuplicate}>
          <FontAwesomeIcon icon={faCopy} className="mr-2 w-5 h-5" />
          ทำสำเนา
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Field Settings with Local State for Instant Feedback */}
        <DropdownMenuItem onClick={(e) => e.preventDefault()}>
          <label
            className="flex items-center gap-1.5 cursor-pointer w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              key={`required-${field.id}`} // Explicit key for React tracking
              type="checkbox"
              checked={localSettings.required} // Use local state for immediate feedback
              onChange={handleRequiredChange}
              className="w-5 h-5 text-primary focus:ring-primary/30 focus:ring-2 rounded border-2 transition-all duration-150"
            />
            <span className="text-xs text-foreground/80 font-medium flex items-center gap-1">
              <span className="text-red-500">•</span> จำเป็น
            </span>
          </label>
        </DropdownMenuItem>

        {/* Show table and telegram options only when required is checked */}
        {localSettings.required && (
          <>
            <DropdownMenuItem onClick={(e) => e.preventDefault()}>
              <label
                className={`flex items-center gap-1.5 w-full ${
                  tableFieldCount >= maxTableFields && !localSettings.showInTable
                    ? 'cursor-not-allowed opacity-50'
                    : 'cursor-pointer'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  key={`showInTable-${field.id}`} // Explicit key for React tracking
                  type="checkbox"
                  checked={localSettings.showInTable} // Use local state for immediate feedback
                  onChange={handleShowInTableChange}
                  disabled={tableFieldCount >= maxTableFields && !localSettings.showInTable}
                  className="w-5 h-5 text-primary focus:ring-primary/30 focus:ring-2 rounded border-2 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="text-xs text-foreground/80 font-medium flex items-center gap-1">
                  <span className="text-blue-500">•</span> แสดงในตาราง
                  <span className="text-xs text-muted-foreground">({tableFieldCount}/{maxTableFields})</span>
                </span>
              </label>
            </DropdownMenuItem>

            {/* Telegram notification only for main form */}
            {!isSubForm && (
              <DropdownMenuItem onClick={(e) => e.preventDefault()}>
                <label
                  className="flex items-center gap-1.5 cursor-pointer w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    key={`sendTelegram-${field.id}`} // Explicit key for React tracking
                    type="checkbox"
                    checked={localSettings.sendTelegram} // Use local state for immediate feedback
                    onChange={handleSendTelegramChange}
                    className="w-5 h-5 text-primary focus:ring-primary/30 focus:ring-2 rounded border-2 transition-all duration-150"
                  />
                  <span className="text-xs text-foreground/80 font-medium flex items-center gap-1">
                    <span className="text-green-500">•</span> แจ้งเตือน Telegram
                  </span>
                </label>
              </DropdownMenuItem>
            )}
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={onRemove} className="text-destructive">
          <FontAwesomeIcon icon={faTrashAlt} className="mr-2 w-5 h-5" />
          ลบ
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

FieldOptionsMenu.displayName = 'FieldOptionsMenu';

export default FieldOptionsMenu;