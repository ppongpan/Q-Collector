/**
 * Two-Factor Authentication Setup Component
 *
 * Features:
 * - QR code display for authenticator apps
 * - Manual entry key (copyable)
 * - Backup codes display (downloadable)
 * - 6-digit verification code input
 * - Step-by-step wizard interface
 * - Enable/Disable 2FA functionality
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldAlt,
  faQrcode,
  faKey,
  faCheckCircle,
  faCopy,
  faDownload,
  faExclamationTriangle,
  faArrowLeft,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons';
import { GlassCard, GlassCardContent } from '../ui/glass-card';
import { useEnhancedToast } from '../ui/enhanced-toast';

const TwoFactorSetup = ({ onComplete, onCancel, apiClient }) => {
  const [step, setStep] = useState(1); // 1: QR Code, 2: Backup Codes, 3: Verification
  const [setupData, setSetupData] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const toast = useEnhancedToast();

  // Initialize 2FA setup
  useEffect(() => {
    initializeSetup();
  }, []);

  const initializeSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/2fa/setup');
      if (response.success) {
        setSetupData(response.data);
      } else {
        throw new Error(response.message || 'Failed to initialize 2FA setup');
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to initialize 2FA setup';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`คัดลอก${label}เรียบร้อยแล้ว`, {
        title: '✅ สำเร็จ',
        duration: 2000
      });
    }).catch(() => {
      toast.error('ไม่สามารถคัดลอกได้', {
        title: '❌ ข้อผิดพลาด'
      });
    });
  };

  const downloadBackupCodes = () => {
    if (!setupData?.backupCodes) return;

    const content = [
      'Q-Collector 2FA Backup Codes',
      '================================',
      'เก็บรหัสเหล่านี้ไว้ในที่ปลอดภัย',
      'แต่ละรหัสใช้ได้เพียงครั้งเดียว',
      '================================',
      '',
      ...setupData.backupCodes.map((code, i) => `${i + 1}. ${code}`),
      '',
      '================================',
      `Generated: ${new Date().toLocaleString('th-TH')}`
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `q-collector-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast.success('ดาวน์โหลด Backup Codes เรียบร้อยแล้ว', {
      title: '✅ สำเร็จ'
    });
  };

  const handleEnable2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('กรุณาใส่รหัส 6 หลักจาก Authenticator App');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/2fa/enable', {
        token: verificationCode
      });

      if (response.success) {
        toast.success('เปิดใช้งาน 2FA สำเร็จ!', {
          title: '🎉 สำเร็จ',
          description: 'บัญชีของคุณมีความปลอดภัยมากขึ้นแล้ว'
        });
        onComplete?.();
      } else {
        throw new Error(response.message || 'Failed to enable 2FA');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'รหัสยืนยันไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <FontAwesomeIcon icon={faQrcode} className="text-6xl text-orange-500 mb-4" />
        <h3 className="text-xl font-bold text-foreground mb-2">สแกน QR Code</h3>
        <p className="text-sm text-muted-foreground">
          ใช้ Authenticator App บนมือถือสแกน QR Code ด้านล่าง
        </p>
      </div>

      {setupData?.qrCode && (
        <div className="flex justify-center p-6 bg-white rounded-lg">
          <img
            src={setupData.qrCode}
            alt="2FA QR Code"
            className="w-64 h-64"
          />
        </div>
      )}

      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">หรือใส่รหัสด้วยตนเอง:</p>
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border/50">
          <code className="flex-1 text-sm font-mono text-foreground break-all">
            {setupData?.manualEntryKey}
          </code>
          <button
            onClick={() => copyToClipboard(setupData?.manualEntryKey, 'รหัส')}
            className="px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-500 rounded-md transition-colors"
            title="คัดลอกรหัส"
          >
            <FontAwesomeIcon icon={faCopy} />
          </button>
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-sm text-blue-400 flex items-start gap-2">
          <FontAwesomeIcon icon={faExclamationTriangle} className="mt-0.5 flex-shrink-0" />
          <span>
            แนะนำแอพ: Google Authenticator, Microsoft Authenticator, Authy, 1Password
          </span>
        </p>
      </div>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <FontAwesomeIcon icon={faKey} className="text-6xl text-orange-500 mb-4" />
        <h3 className="text-xl font-bold text-foreground mb-2">Backup Codes</h3>
        <p className="text-sm text-muted-foreground">
          เก็บรหัสเหล่านี้ไว้ในที่ปลอดภัย สำหรับกรณีที่โทรศัพท์หาย
        </p>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <p className="text-sm text-yellow-400 flex items-start gap-2">
          <FontAwesomeIcon icon={faExclamationTriangle} className="mt-0.5 flex-shrink-0" />
          <span>
            <strong>สำคัญมาก!</strong> แต่ละรหัสใช้ได้เพียงครั้งเดียว กรุณาดาวน์โหลดหรือพิมพ์เก็บไว้
          </span>
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
        <div className="grid grid-cols-2 gap-2">
          {setupData?.backupCodes?.map((code, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 bg-background/50 rounded border border-border/30"
            >
              <span className="text-xs text-muted-foreground w-5">{index + 1}.</span>
              <code className="flex-1 text-sm font-mono text-foreground">{code}</code>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={downloadBackupCodes}
        className="w-full py-3 bg-orange-500/20 hover:bg-orange-500/30 text-orange-500 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <FontAwesomeIcon icon={faDownload} />
        <span>ดาวน์โหลด Backup Codes</span>
      </button>
    </motion.div>
  );

  const renderStep3 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <FontAwesomeIcon icon={faCheckCircle} className="text-6xl text-green-500 mb-4" />
        <h3 className="text-xl font-bold text-foreground mb-2">ยืนยันการเปิดใช้งาน</h3>
        <p className="text-sm text-muted-foreground">
          ใส่รหัส 6 หลักจาก Authenticator App เพื่อยืนยัน
        </p>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">
          รหัสยืนยัน 6 หลัก
        </label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          className="w-full px-4 py-3 bg-muted/50 border border-border/50 rounded-lg text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20"
          autoFocus
        />
        {error && (
          <p className="text-sm text-red-400 flex items-center gap-2">
            <FontAwesomeIcon icon={faExclamationTriangle} />
            {error}
          </p>
        )}
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-sm text-blue-400">
          รหัสจะเปลี่ยนทุก 30 วินาที กรุณาใส่รหัสที่แสดงบน Authenticator App ในขณะนี้
        </p>
      </div>
    </motion.div>
  );

  if (loading && !setupData) {
    return (
      <GlassCard className="max-w-2xl mx-auto">
        <GlassCardContent className="p-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-muted-foreground">กำลังเตรียมการตั้งค่า 2FA...</p>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  if (error && !setupData) {
    return (
      <GlassCard className="max-w-2xl mx-auto">
        <GlassCardContent className="p-8">
          <div className="text-center py-12">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-5xl text-red-500 mb-4" />
            <p className="text-lg font-semibold text-foreground mb-2">เกิดข้อผิดพลาด</p>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={initializeSetup}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
              >
                ลองใหม่อีกครั้ง
              </button>
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="max-w-2xl mx-auto">
      <GlassCardContent className="p-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                    s === step
                      ? 'bg-orange-500 text-white'
                      : s < step
                      ? 'bg-green-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {s < step ? <FontAwesomeIcon icon={faCheckCircle} /> : s}
                </div>
                <p className={`text-xs mt-2 ${s === step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {s === 1 ? 'QR Code' : s === 2 ? 'Backup Codes' : 'ยืนยัน'}
                </p>
              </div>
              {s < 3 && (
                <div className={`h-1 w-16 mx-2 rounded ${s < step ? 'bg-green-500' : 'bg-muted'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {step === 1 && <div key="step1">{renderStep1()}</div>}
          {step === 2 && <div key="step2">{renderStep2()}</div>}
          {step === 3 && <div key="step3">{renderStep3()}</div>}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-8">
          {step > 1 && step < 3 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              ย้อนกลับ
            </button>
          )}

          {step < 3 && (
            <button
              onClick={() => setStep(step + 1)}
              className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              ถัดไป
              <FontAwesomeIcon icon={faArrowRight} />
            </button>
          )}

          {step === 3 && (
            <>
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
                disabled={loading}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleEnable2FA}
                disabled={loading || verificationCode.length !== 6}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    กำลังยืนยัน...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faCheckCircle} />
                    เปิดใช้งาน 2FA
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </GlassCardContent>
    </GlassCard>
  );
};

export default TwoFactorSetup;
