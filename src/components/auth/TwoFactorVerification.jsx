/**
 * Two-Factor Authentication Verification Component
 *
 * Features:
 * - 6-digit code input for TOTP
 * - Backup code input (alternative)
 * - Auto-focus and auto-submit on complete
 * - Error handling with retry
 * - Visual feedback and animations
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldAlt,
  faKey,
  faArrowLeft,
  faExclamationTriangle,
  faClock,
} from '@fortawesome/free-solid-svg-icons';
import { GlassCard, GlassCardContent } from '../ui/glass-card';
import { useEnhancedToast } from '../ui/enhanced-toast';
import ApiClient from '../../services/ApiClient';
import { getDeviceFingerprint, getDeviceInfo } from '../../utils/deviceFingerprint';

const TwoFactorVerification = ({
  tempToken,
  username,
  onSuccess,
  onCancel
}) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [trustDevice, setTrustDevice] = useState(true); // Default to true
  const inputRefs = useRef([]);
  const toast = useEnhancedToast();

  // Timer for TOTP countdown
  useEffect(() => {
    if (useBackupCode) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) return 30;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [useBackupCode]);

  // Auto-focus first input
  useEffect(() => {
    if (!useBackupCode && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [useBackupCode]);

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (!useBackupCode && code.every(digit => digit !== '') && !loading) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, useBackupCode]);

  const handleCodeChange = (index, value) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '');

    if (digit.length > 1) {
      // Paste handling
      const digits = digit.slice(0, 6).split('');
      const newCode = [...code];
      digits.forEach((d, i) => {
        if (index + i < 6) {
          newCode[index + i] = d;
        }
      });
      setCode(newCode);

      // Focus last filled input or next empty
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
    } else {
      const newCode = [...code];
      newCode[index] = digit;
      setCode(newCode);

      // Auto-focus next input
      if (digit && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }

    setError(null);
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const verificationCode = useBackupCode ? backupCode.trim() : code.join('');

    if (!verificationCode) {
      setError('กรุณาใส่รหัสยืนยัน');
      return;
    }

    if (!useBackupCode && verificationCode.length !== 6) {
      setError('กรุณาใส่รหัส 6 หลัก');
      return;
    }

    setLoading(true);
    setError(null);

    console.log('2FA Verification - Request data:', {
      tempToken,
      token: verificationCode,
      tempTokenLength: tempToken?.length,
      trustDevice
    });

    try {
      // Get device fingerprint and info
      const deviceFingerprint = await getDeviceFingerprint();
      const deviceInfo = await getDeviceInfo();

      const response = await ApiClient.post('/auth/login/2fa', {
        tempToken,
        token: verificationCode,
        trustDevice,
        deviceFingerprint,
        deviceInfo
      });

      if (response.success) {
        toast.success('ยืนยันตัวตน 2FA สำเร็จ!', {
          title: '🎉 เข้าสู่ระบบสำเร็จ',
          duration: 3000
        });
        onSuccess?.(response.data);
      } else {
        throw new Error(response.message || 'Verification failed');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'รหัสยืนยันไม่ถูกต้อง';
      setError(errorMessage);
      toast.error('รหัสยืนยันไม่ถูกต้อง', {
        title: '❌ ข้อผิดพลาด',
        description: 'กรุณาตรวจสอบรหัสและลองใหม่อีกครั้ง'
      });

      // Reset code on error
      if (!useBackupCode) {
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToBackupCode = () => {
    setUseBackupCode(true);
    setCode(['', '', '', '', '', '']);
    setBackupCode('');
    setError(null);
  };

  const handleSwitchToTOTP = () => {
    setUseBackupCode(false);
    setBackupCode('');
    setCode(['', '', '', '', '', '']);
    setError(null);
  };

  return (
    <GlassCard className="max-w-md mx-auto">
      <GlassCardContent className="p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500/20 rounded-full mb-4">
            <FontAwesomeIcon icon={faShieldAlt} className="text-3xl text-orange-500" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            ยืนยันตัวตน 2FA
          </h2>
          <p className="text-sm text-muted-foreground">
            ผู้ใช้งาน: <span className="font-medium text-orange-500">{username}</span>
          </p>
        </div>

        {/* TOTP Input */}
        {!useBackupCode ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-foreground">
                  รหัสจาก Authenticator App
                </label>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FontAwesomeIcon icon={faClock} />
                  <span>{timeLeft}s</span>
                  <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 transition-all"
                      style={{ width: `${(timeLeft / 30) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* 6-Digit Input */}
              <div className="flex gap-2 justify-center">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className={`w-12 h-14 text-center text-2xl font-mono bg-muted/50 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                      error
                        ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-border/50 focus:border-orange-500 focus:ring-orange-500/20'
                    }`}
                    disabled={loading}
                  />
                ))}
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-400 flex items-center gap-2 mt-3"
                >
                  <FontAwesomeIcon icon={faExclamationTriangle} />
                  {error}
                </motion.p>
              )}
            </div>

            {/* Trust Device Checkbox */}
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
              <input
                type="checkbox"
                id="trustDevice"
                checked={trustDevice}
                onChange={(e) => setTrustDevice(e.target.checked)}
                className="w-4 h-4 rounded border-border/50 bg-background/50 text-orange-500 focus:ring-2 focus:ring-orange-500/20"
                disabled={loading}
              />
              <label htmlFor="trustDevice" className="text-sm text-foreground cursor-pointer flex-1">
                จดจำอุปกรณ์นี้เป็นเวลา 24 ชั่วโมง
              </label>
            </div>

            <button
              onClick={handleSwitchToBackupCode}
              className="w-full text-sm text-muted-foreground hover:text-orange-500 transition-colors flex items-center justify-center gap-2"
              disabled={loading}
            >
              <FontAwesomeIcon icon={faKey} />
              ใช้ Backup Code แทน
            </button>
          </motion.div>
        ) : (
          /* Backup Code Input */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Backup Code
              </label>
              <input
                type="text"
                value={backupCode}
                onChange={(e) => {
                  setBackupCode(e.target.value.toUpperCase());
                  setError(null);
                }}
                placeholder="XXXXXXXX"
                maxLength={8}
                className={`w-full px-4 py-3 text-center text-xl font-mono tracking-wider bg-muted/50 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  error
                    ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-border/50 focus:border-orange-500 focus:ring-orange-500/20'
                }`}
                autoFocus
                disabled={loading}
              />

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-400 flex items-center gap-2 mt-3"
                >
                  <FontAwesomeIcon icon={faExclamationTriangle} />
                  {error}
                </motion.p>
              )}
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-xs text-yellow-400">
                <strong>หมายเหตุ:</strong> Backup Code ใช้ได้เพียงครั้งเดียว
              </p>
            </div>

            <button
              onClick={handleSwitchToTOTP}
              className="w-full text-sm text-muted-foreground hover:text-orange-500 transition-colors flex items-center justify-center gap-2"
              disabled={loading}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              ย้อนกลับใช้ Authenticator App
            </button>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
            disabled={loading}
          >
            ยกเลิก
          </button>

          {useBackupCode && (
            <button
              onClick={handleVerify}
              disabled={loading || !backupCode}
              className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  กำลังยืนยัน...
                </>
              ) : (
                'ยืนยัน'
              )}
            </button>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            ไม่สามารถเข้าถึงรหัสได้? ติดต่อผู้ดูแลระบบ
          </p>
        </div>
      </GlassCardContent>
    </GlassCard>
  );
};

export default TwoFactorVerification;
