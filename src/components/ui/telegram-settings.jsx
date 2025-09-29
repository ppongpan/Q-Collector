/**
 * TelegramSettings.jsx - Telegram Configuration Component for Q-Collector
 *
 * Features:
 * - Telegram bot configuration (token, group ID)
 * - Settings validation and testing
 * - User-friendly error messages
 * - Modern ShadCN UI styling
 * - Thai language support
 */

import React, { useState, useEffect } from 'react';
import { cn } from '../../utils/cn';
import { GlassCard, GlassCardContent } from './glass-card';
import { GlassButton } from './glass-button';
import { GlassInput } from './glass-input';
import { Alert, AlertDescription } from './alert';
import { useEnhancedToast } from './enhanced-toast';
import submissionService from '../../services/SubmissionService';
import telegramService from '../../services/TelegramService';

const TelegramSettings = ({
  settings = {},
  onSettingsChange,
  className
}) => {
  const toast = useEnhancedToast();

  // Local state for settings
  const [localSettings, setLocalSettings] = useState(() => ({
    enabled: false,
    botToken: '',
    groupId: '',
    enableTestMessages: true,
    ...settings
  }));

  // UI state
  const [isTesting, setIsTesting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [lastTestResult, setLastTestResult] = useState(null);

  // Sync with parent settings
  useEffect(() => {
    setLocalSettings(prev => ({
      ...prev,
      ...settings
    }));
  }, [settings]);

  // Handle setting changes
  const handleSettingChange = (key, value) => {
    const newSettings = {
      ...localSettings,
      [key]: value
    };

    setLocalSettings(newSettings);

    // Clear validation errors for this field
    if (validationErrors[key]) {
      setValidationErrors(prev => {
        const { [key]: removed, ...rest } = prev;
        return rest;
      });
    }

    // Propagate to parent
    if (onSettingsChange) {
      onSettingsChange(newSettings);
    }
  };

  // Validate settings
  const validateSettings = () => {
    const errors = {};

    if (localSettings.enabled) {
      if (!localSettings.botToken.trim()) {
        errors.botToken = 'Bot Token จำเป็นต้องกรอก';
      } else if (!localSettings.botToken.includes(':')) {
        errors.botToken = 'รูปแบบ Bot Token ไม่ถูกต้อง';
      }

      if (!localSettings.groupId.trim()) {
        errors.groupId = 'Group ID จำเป็นต้องกรอก';
      } else if (!localSettings.groupId.match(/^-?\d+$/) && !localSettings.groupId.startsWith('@')) {
        errors.groupId = 'รูปแบบ Group ID ไม่ถูกต้อง (ตัวเลข หรือ @username)';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Test telegram configuration
  const handleTestConfiguration = async () => {
    if (!validateSettings()) {
      toast.error('กรุณาแก้ไขข้อผิดพลาดในการตั้งค่าก่อน', {
        title: 'การตั้งค่าไม่ถูกต้อง'
      });
      return;
    }

    setIsTesting(true);
    setLastTestResult(null);

    try {
      const result = await submissionService.testTelegramConfiguration(localSettings);

      setLastTestResult(result);

      if (result.success) {
        toast.success('การทดสอบสำเร็จ! ข้อความทดสอบถูกส่งไปยัง Telegram แล้ว', {
          title: 'การทดสอบสำเร็จ',
          duration: 5000
        });
      } else {
        const friendlyMessage = telegramService.getUserFriendlyErrorMessage(new Error(result.error));
        toast.error(friendlyMessage, {
          title: 'การทดสอบล้มเหลว',
          duration: 8000
        });
      }
    } catch (error) {
      const friendlyMessage = telegramService.getUserFriendlyErrorMessage(error);
      toast.error(friendlyMessage, {
        title: 'เกิดข้อผิดพลาด',
        duration: 8000
      });
      setLastTestResult({ success: false, error: error.message });
    } finally {
      setIsTesting(false);
    }
  };

  // Handle enable/disable toggle
  const handleToggleEnabled = (enabled) => {
    handleSettingChange('enabled', enabled);

    if (!enabled) {
      setValidationErrors({});
      setLastTestResult(null);
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      <GlassCard className="glass-container">
        <GlassCardContent className="p-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  การแจ้งเตือน Telegram
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  ตั้งค่าการส่งแจ้งเตือนการกรอกฟอร์มไปยัง Telegram
                </p>
              </div>

              {/* Enable/Disable Toggle */}
              <button
                type="button"
                onClick={() => handleToggleEnabled(!localSettings.enabled)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2",
                  localSettings.enabled
                    ? "bg-orange-600"
                    : "bg-gray-200 dark:bg-gray-700"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    localSettings.enabled ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {/* Settings Form - Only show when enabled */}
            {localSettings.enabled && (
              <div className="space-y-4">
                {/* Bot Token */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Bot Token
                    <span className="text-destructive ml-1">*</span>
                  </label>
                  <GlassInput
                    type="password"
                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                    value={localSettings.botToken}
                    onChange={(e) => handleSettingChange('botToken', e.target.value)}
                    hasValidationError={!!validationErrors.botToken}
                    className="font-mono"
                  />
                  {validationErrors.botToken && (
                    <p className="text-sm text-destructive">{validationErrors.botToken}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    รับ Bot Token จาก @BotFather ใน Telegram
                  </p>
                </div>

                {/* Group ID */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Group ID หรือ Chat ID
                    <span className="text-destructive ml-1">*</span>
                  </label>
                  <GlassInput
                    type="text"
                    placeholder="-1001234567890 หรือ @groupname"
                    value={localSettings.groupId}
                    onChange={(e) => handleSettingChange('groupId', e.target.value)}
                    hasValidationError={!!validationErrors.groupId}
                    className="font-mono"
                  />
                  {validationErrors.groupId && (
                    <p className="text-sm text-destructive">{validationErrors.groupId}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    ID ของ Group หรือ Chat ที่ต้องการส่งแจ้งเตือน (เริ่มต้นด้วย - สำหรับ Group)
                  </p>
                </div>

                {/* Test Button */}
                <div className="flex items-center gap-3 pt-2">
                  <GlassButton
                    type="button"
                    onClick={handleTestConfiguration}
                    disabled={isTesting || !localSettings.botToken.trim() || !localSettings.groupId.trim()}
                    className="min-w-[120px]"
                  >
                    {isTesting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ทดสอบ...
                      </div>
                    ) : (
                      'ทดสอบการส่ง'
                    )}
                  </GlassButton>

                  {lastTestResult && (
                    <div className={cn(
                      "flex items-center gap-2 text-sm",
                      lastTestResult.success ? "text-green-600" : "text-destructive"
                    )}>
                      {lastTestResult.success ? (
                        <>
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          การทดสอบสำเร็จ
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-red-500 rounded-full" />
                          การทดสอบล้มเหลว
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Additional Options */}
                <div className="pt-4 border-t border-border/50">
                  <h4 className="text-sm font-medium text-foreground mb-3">
                    ตัวเลือกเพิ่มเติม
                  </h4>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localSettings.enableTestMessages}
                        onChange={(e) => handleSettingChange('enableTestMessages', e.target.checked)}
                        className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                      />
                      <div className="text-sm">
                        <div className="font-medium text-foreground">เปิดใช้ข้อความทดสอบ</div>
                        <div className="text-muted-foreground">อนุญาตให้ส่งข้อความทดสอบจากหน้าตั้งค่า</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Disabled State Message */}
            {!localSettings.enabled && (
              <Alert>
                <AlertDescription>
                  การแจ้งเตือน Telegram ถูกปิดใช้งาน เปิดใช้งานเพื่อตั้งค่าการส่งแจ้งเตือนอัตโนมัติ
                </AlertDescription>
              </Alert>
            )}
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Help Section */}
      <GlassCard className="glass-container">
        <GlassCardContent className="p-6">
          <h4 className="text-sm font-semibold text-foreground mb-3">
            วิธีตั้งค่า Telegram Bot
          </h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-orange-500/20 text-orange-600 rounded-full flex items-center justify-center text-xs font-medium">1</span>
              <div>ค้นหา <code className="px-1 py-0.5 bg-muted rounded text-xs">@BotFather</code> ใน Telegram และส่งคำสั่ง <code className="px-1 py-0.5 bg-muted rounded text-xs">/newbot</code></div>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-orange-500/20 text-orange-600 rounded-full flex items-center justify-center text-xs font-medium">2</span>
              <div>ตั้งชื่อและ Username สำหรับ Bot ของคุณ</div>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-orange-500/20 text-orange-600 rounded-full flex items-center justify-center text-xs font-medium">3</span>
              <div>คัดลอก Bot Token ที่ได้รับ</div>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-orange-500/20 text-orange-600 rounded-full flex items-center justify-center text-xs font-medium">4</span>
              <div>เพิ่ม Bot เข้า Group หรือ Channel ที่ต้องการ</div>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-orange-500/20 text-orange-600 rounded-full flex items-center justify-center text-xs font-medium">5</span>
              <div>ใช้ <code className="px-1 py-0.5 bg-muted rounded text-xs">@userinfobot</code> เพื่อหา Group ID</div>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  );
};

export { TelegramSettings };