/**
 * TelegramSettings Component
 * Super Admin only - Manage global Telegram Bot configuration
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Check, X, Eye, EyeOff, TestTube2 } from 'lucide-react';
import apiClient from '../../services/ApiClient';
import { useEnhancedToast } from '../ui/enhanced-toast';

const TelegramSettings = () => {
  const toast = useEnhancedToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const [settings, setSettings] = useState({
    bot_token: '',
    group_id: '',
    enabled: false,
  });

  const [originalSettings, setOriginalSettings] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings
  useEffect(() => {
    loadSettings();
  }, []);

  // Check for changes
  useEffect(() => {
    if (!originalSettings) return;

    const changed =
      settings.bot_token !== originalSettings.bot_token ||
      settings.group_id !== originalSettings.group_id ||
      settings.enabled !== originalSettings.enabled;

    setHasChanges(changed);
  }, [settings, originalSettings]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/telegram-settings');

      if (response.success) {
        // Backend returns masked token (***...xyz) for security
        // Use empty string if no token exists, otherwise show masked version as placeholder
        const data = {
          bot_token: response.settings.has_token ? response.settings.bot_token : '',
          group_id: response.settings.group_id || '',
          enabled: response.settings.enabled || false,
        };

        setSettings(data);
        setOriginalSettings(data);
      }
    } catch (error) {
      console.error('Load Telegram settings error:', error);
      toast.error('ไม่สามารถโหลดการตั้งค่า Telegram ได้', {
        title: 'โหลดข้อมูลล้มเหลว',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const response = await apiClient.put('/telegram-settings', settings);

      if (response.success) {
        // ⚠️ IMPORTANT: Backend hides bot_token in response (***...xyz)
        // We must keep the original bot_token from user input, not overwrite with masked version
        const data = {
          bot_token: response.settings.has_token ? settings.bot_token : '', // Keep original token
          group_id: response.settings.group_id || '',
          enabled: response.settings.enabled || false,
        };

        setSettings(data);
        setOriginalSettings(data);

        toast.success('บันทึกการตั้งค่า Telegram สำเร็จ', {
          title: 'บันทึกสำเร็จ',
        });
      }
    } catch (error) {
      console.error('Save Telegram settings error:', error);
      toast.error(error.message || 'ไม่สามารถบันทึกการตั้งค่าได้', {
        title: 'บันทึกล้มเหลว',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);

      const response = await apiClient.post('/telegram-settings/test');

      if (response.success) {
        toast.success(
          response.botName
            ? `เชื่อมต่อสำเร็จกับ Bot: @${response.botName}`
            : 'ทดสอบการเชื่อมต่อสำเร็จ',
          {
            title: 'ทดสอบสำเร็จ',
            duration: 5000,
          }
        );
      } else {
        toast.error(response.message || 'การทดสอบล้มเหลว', {
          title: 'ทดสอบล้มเหลว',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Test Telegram connection error:', error);
      toast.error(error.message || 'ไม่สามารถทดสอบการเชื่อมต่อได้', {
        title: 'ทดสอบล้มเหลว',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleReset = () => {
    setSettings({ ...originalSettings });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            การตั้งค่า Telegram Bot
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            ตั้งค่า Bot Token และ Group ID สำหรับการแจ้งเตือนผ่าน Telegram
          </p>
        </div>

        {/* Enable/Disable Toggle */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {settings.enabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
          </span>
          <button
            onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.enabled ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Bot Token */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Bot Token
        </label>
        <div className="relative">
          <input
            type={showToken ? 'text' : 'password'}
            value={settings.bot_token}
            onChange={(e) => setSettings({ ...settings, bot_token: e.target.value })}
            placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
            className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-orange-500 focus:border-transparent
                     transition-all duration-200"
          />
          <button
            onClick={() => setShowToken(!showToken)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          รับ Bot Token จาก{' '}
          <a
            href="https://t.me/BotFather"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-500 hover:underline"
          >
            @BotFather
          </a>
        </p>
      </div>

      {/* Group ID */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Group ID / Channel ID
        </label>
        <input
          type="text"
          value={settings.group_id}
          onChange={(e) => setSettings({ ...settings, group_id: e.target.value })}
          placeholder="-1001234567890"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                   focus:ring-2 focus:ring-orange-500 focus:border-transparent
                   transition-all duration-200"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          หา Group ID ได้จาก{' '}
          <a
            href="https://t.me/username_to_id_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-500 hover:underline"
          >
            @username_to_id_bot
          </a>
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleTest}
          disabled={testing || !settings.bot_token || !settings.group_id}
          className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 dark:text-blue-400
                   hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all duration-200"
        >
          <TestTube2 className="w-4 h-4" />
          {testing ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}
        </button>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400
                       hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg
                       transition-all duration-200"
            >
              <X className="w-4 h-4" />
              ยกเลิก
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-orange-500
                     hover:bg-orange-600 rounded-lg
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                กำลังบันทึก...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                บันทึกการตั้งค่า
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default TelegramSettings;
