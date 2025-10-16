/**
 * Trusted Device Duration Settings Component
 *
 * Super Admin only - Configure how long devices stay trusted
 *
 * Features:
 * - Set trust duration (1-720 hours)
 * - Preset durations (1h, 6h, 12h, 24h, 7d, 30d)
 * - Custom duration input
 * - Real-time API update
 * - Visual feedback
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClock,
  faShieldAlt,
  faCheck,
  faSave,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import { GlassCard, GlassCardContent, GlassCardHeader } from '../ui/glass-card';
import { useEnhancedToast } from '../ui/enhanced-toast';
import { useAuth } from '../../contexts/AuthContext';
import ApiClient from '../../services/ApiClient';

const TrustedDeviceDuration = () => {
  const { user } = useAuth();
  const toast = useEnhancedToast();
  const [duration, setDuration] = useState(24); // Default 24 hours
  const [customDuration, setCustomDuration] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Check if user is Super Admin
  const isSuperAdmin = user?.role === 'super_admin';

  // Preset durations in hours
  const presets = [
    { value: 1, label: '1 ชั่วโมง' },
    { value: 6, label: '6 ชั่วโมง' },
    { value: 12, label: '12 ชั่วโมง' },
    { value: 24, label: '24 ชั่วโมง' },
    { value: 168, label: '7 วัน' },
    { value: 720, label: '30 วัน' },
  ];

  useEffect(() => {
    if (isSuperAdmin) {
      loadSettings();
    }
  }, [isSuperAdmin]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await ApiClient.get('/auth/trusted-devices/settings');

      if (response.success && response.data?.duration) {
        setDuration(response.data.duration);
      }
    } catch (error) {
      console.error('Error loading trusted device settings:', error);
      // Use default value if settings not found
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (newDuration) => {
    if (newDuration < 1 || newDuration > 720) {
      toast.error('ระยะเวลาต้องอยู่ระหว่าง 1-720 ชั่วโมง', {
        title: '❌ ข้อผิดพลาด'
      });
      return;
    }

    try {
      setSaving(true);
      const response = await ApiClient.put('/auth/trusted-devices/settings', {
        duration: newDuration
      });

      if (response.success) {
        setDuration(newDuration);
        setCustomDuration('');

        toast.success('บันทึกการตั้งค่าสำเร็จ', {
          title: '✅ สำเร็จ',
          description: `อุปกรณ์จะถูกเชื่อถือเป็นเวลา ${newDuration} ชั่วโมง`
        });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('ไม่สามารถบันทึกการตั้งค่าได้', {
        title: '❌ ข้อผิดพลาด',
        description: error.message
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePresetClick = (value) => {
    handleSave(value);
  };

  const handleCustomSave = () => {
    const value = parseInt(customDuration);
    if (isNaN(value)) {
      toast.error('กรุณาใส่ตัวเลขที่ถูกต้อง', {
        title: '❌ ข้อผิดพลาด'
      });
      return;
    }
    handleSave(value);
  };

  const formatDuration = (hours) => {
    if (hours < 24) {
      return `${hours} ชั่วโมง`;
    } else if (hours % 24 === 0) {
      const days = hours / 24;
      return `${days} วัน`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days} วัน ${remainingHours} ชั่วโมง`;
    }
  };

  // Don't show if not Super Admin
  if (!isSuperAdmin) {
    return null;
  }

  if (loading) {
    return (
      <GlassCard>
        <GlassCardHeader>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FontAwesomeIcon icon={faClock} className="text-orange-500" />
            ระยะเวลาเชื่อถืออุปกรณ์
          </h3>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <GlassCardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FontAwesomeIcon icon={faClock} className="text-orange-500" />
            ระยะเวลาเชื่อถืออุปกรณ์
          </h3>
          <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded">
            Super Admin
          </span>
        </div>
      </GlassCardHeader>

      <GlassCardContent>
        {/* Info Banner */}
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <FontAwesomeIcon icon={faShieldAlt} className="text-blue-400 mt-1" />
            <div className="flex-1 text-sm">
              <p className="text-blue-300 font-medium mb-1">
                การตั้งค่านี้ใช้กับระบบทั้งหมด
              </p>
              <p className="text-blue-200/80">
                เมื่อผู้ใช้เลือก "จดจำอุปกรณ์" ระหว่างยืนยัน 2FA จะไม่ต้องยืนยันอีกตามระยะเวลาที่กำหนด
              </p>
            </div>
          </div>
        </div>

        {/* Current Duration */}
        <div className="mb-6 p-4 bg-muted/30 border border-border/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">ระยะเวลาปัจจุบัน</p>
              <p className="text-lg font-semibold text-foreground">
                {formatDuration(duration)}
              </p>
            </div>
            <FontAwesomeIcon
              icon={faClock}
              className="text-3xl text-orange-500/30"
            />
          </div>
        </div>

        {/* Preset Durations */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-foreground mb-3">
            เลือกระยะเวลาที่กำหนดไว้
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {presets.map((preset) => (
              <motion.button
                key={preset.value}
                onClick={() => handlePresetClick(preset.value)}
                disabled={saving}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`px-4 py-3 rounded-lg border transition-all ${
                  duration === preset.value
                    ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                    : 'bg-muted/30 border-border/50 text-foreground hover:bg-muted/50 hover:border-orange-500/30'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{preset.label}</span>
                  {duration === preset.value && (
                    <FontAwesomeIcon icon={faCheck} className="text-orange-500" />
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Custom Duration */}
        <div className="border-t border-border/50 pt-6">
          <h4 className="text-sm font-medium text-foreground mb-3">
            กำหนดเองระยะเวลา (ชั่วโมง)
          </h4>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              max="720"
              value={customDuration}
              onChange={(e) => setCustomDuration(e.target.value)}
              placeholder="ใส่จำนวนชั่วโมง (1-720)"
              className="flex-1 px-4 py-2 bg-muted/30 border border-border/50 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-orange-500/50"
              disabled={saving}
            />
            <button
              onClick={handleCustomSave}
              disabled={saving || !customDuration}
              className="btn-orange-rounded px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ transition: 'background-color 200ms ease-out' }}
            >
              {saving ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faSave} />
                  <span>บันทึก</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            ระยะเวลาต้องอยู่ระหว่าง 1-720 ชั่วโมง (1 ชั่วโมง - 30 วัน)
          </p>
        </div>
      </GlassCardContent>
    </GlassCard>
  );
};

export default TrustedDeviceDuration;
