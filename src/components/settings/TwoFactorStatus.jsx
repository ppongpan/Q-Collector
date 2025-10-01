/**
 * Two-Factor Authentication Status Component
 *
 * Features:
 * - Display current 2FA status
 * - Show backup codes remaining count
 * - Enable/Disable 2FA toggle
 * - Regenerate backup codes
 * - Confirmation modals for destructive actions
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldAlt,
  faToggleOn,
  faToggleOff,
  faKey,
  faRefresh,
  faExclamationTriangle,
  faCheckCircle,
  faDownload,
  faCopy,
} from '@fortawesome/free-solid-svg-icons';
import { GlassCard, GlassCardContent } from '../ui/glass-card';
import { useEnhancedToast } from '../ui/enhanced-toast';
import TwoFactorSetup from '../auth/TwoFactorSetup';

const TwoFactorStatus = ({ apiClient }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [newBackupCodes, setNewBackupCodes] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const toast = useEnhancedToast();

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/2fa/status');
      if (response.success) {
        setStatus(response.data);
      }
    } catch (err) {
      toast.error('ไม่สามารถโหลดสถานะ 2FA ได้', {
        title: '❌ ข้อผิดพลาด'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('กรุณาใส่รหัส 6 หลักจาก Authenticator App', {
        title: '⚠️ แจ้งเตือน'
      });
      return;
    }

    setActionLoading(true);
    try {
      const response = await apiClient.post('/2fa/disable', {
        token: verificationCode
      });

      if (response.success) {
        toast.success('ปิดการใช้งาน 2FA เรียบร้อยแล้ว', {
          title: '✅ สำเร็จ'
        });
        setShowDisableConfirm(false);
        setVerificationCode('');
        await fetchStatus();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'ไม่สามารถปิดการใช้งาน 2FA ได้', {
        title: '❌ ข้อผิดพลาด'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('กรุณาใส่รหัส 6 หลักจาก Authenticator App', {
        title: '⚠️ แจ้งเตือน'
      });
      return;
    }

    setActionLoading(true);
    try {
      const response = await apiClient.post('/2fa/backup-codes', {
        token: verificationCode
      });

      if (response.success) {
        setNewBackupCodes(response.data.backupCodes);
        toast.success('สร้าง Backup Codes ใหม่เรียบร้อยแล้ว', {
          title: '✅ สำเร็จ',
          description: 'กรุณาดาวน์โหลดและเก็บรหัสใหม่ไว้'
        });
        setShowRegenerateConfirm(false);
        setVerificationCode('');
        await fetchStatus();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'ไม่สามารถสร้าง Backup Codes ใหม่ได้', {
        title: '❌ ข้อผิดพลาด'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    if (!newBackupCodes) return;

    const content = [
      'Q-Collector 2FA Backup Codes',
      '================================',
      'เก็บรหัสเหล่านี้ไว้ในที่ปลอดภัย',
      'แต่ละรหัสใช้ได้เพียงครั้งเดียว',
      '================================',
      '',
      ...newBackupCodes.map((code, i) => `${i + 1}. ${code}`),
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

  const handleSetupComplete = async () => {
    setShowSetup(false);
    await fetchStatus();
  };

  if (loading) {
    return (
      <GlassCard>
        <GlassCardContent className="p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto mb-3"></div>
            <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  if (showSetup) {
    return (
      <TwoFactorSetup
        onComplete={handleSetupComplete}
        onCancel={() => setShowSetup(false)}
        apiClient={apiClient}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Status Card */}
      <GlassCard>
        <GlassCardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <motion.div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  status?.enabled ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}
                animate={status?.enabled ? {
                  boxShadow: [
                    '0 0 0 0 rgba(34, 197, 94, 0)',
                    '0 0 0 8px rgba(34, 197, 94, 0.1)',
                    '0 0 0 0 rgba(34, 197, 94, 0)'
                  ]
                } : {}}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                title="สถานะความปลอดภัย"
              >
                <FontAwesomeIcon
                  icon={faShieldAlt}
                  className={`text-xl transition-colors duration-300 ${
                    status?.enabled ? 'text-green-500' : 'text-red-500'
                  }`}
                />
              </motion.div>

              <div className="flex-1">
                <div
                  className="text-base font-semibold text-foreground flex items-center gap-2"
                  title="เพิ่มความปลอดภัยให้บัญชีของคุณด้วยรหัสยืนยันตัวตน 2 ชั้น"
                >
                  การยืนยันตัวตนแบบสองขั้นตอน (2FA)
                </div>
                {status?.enabled && status.enabledAt && (
                  <span className="text-xs text-muted-foreground">
                    เปิดใช้งานตั้งแต่ {new Date(status.enabledAt).toLocaleDateString('th-TH')}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => status?.enabled ? setShowDisableConfirm(true) : setShowSetup(true)}
              className={`ml-auto px-3 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 font-medium ${
                status?.enabled
                  ? 'bg-green-500/20 hover:bg-green-500/30 text-green-500'
                  : 'bg-red-500/20 hover:bg-red-500/30 text-red-500'
              }`}
              title={status?.enabled ? 'คลิกเพื่อปิดการใช้งาน 2FA' : 'คลิกเพื่อเปิดการใช้งาน 2FA'}
            >
              <motion.div
                animate={status?.enabled ? { x: 6 } : { x: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <FontAwesomeIcon icon={status?.enabled ? faToggleOn : faToggleOff} className="text-lg" />
              </motion.div>
              <span className="text-sm">{status?.enabled ? 'เปิดอยู่' : 'ปิดอยู่'}</span>
            </button>
          </div>

          {status?.enabled && (
            <div className="mt-6 pt-6 border-t border-border/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    Backup Codes
                  </p>
                  <p className="text-xs text-muted-foreground">
                    เหลืออีก {status.backupCodesRemaining} / {status.totalBackupCodes} รหัส
                  </p>
                </div>
                <button
                  onClick={() => setShowRegenerateConfirm(true)}
                  className="px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-500 rounded-lg transition-colors flex items-center gap-2 text-sm"
                >
                  <FontAwesomeIcon icon={faRefresh} />
                  สร้างใหม่
                </button>
              </div>

              {status.backupCodesRemaining < 3 && (
                <div className="mt-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-xs text-yellow-400 flex items-start gap-2">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="mt-0.5 flex-shrink-0" />
                    <span>
                      Backup Codes เหลือน้อย แนะนำให้สร้างรหัสใหม่
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}
        </GlassCardContent>
      </GlassCard>

      {/* Disable Confirmation Modal */}
      <AnimatePresence>
        {showDisableConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !actionLoading && setShowDisableConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <GlassCard>
                <GlassCardContent className="p-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FontAwesomeIcon icon={faExclamationTriangle} className="text-3xl text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      ปิดการใช้งาน 2FA
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      บัญชีของคุณจะมีความปลอดภัยน้อยลง กรุณายืนยันด้วยรหัส 2FA
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
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
                        className="w-full px-4 py-3 bg-muted/50 border border-border/50 rounded-lg text-center text-xl font-mono tracking-widest focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20"
                        autoFocus
                        disabled={actionLoading}
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowDisableConfirm(false);
                          setVerificationCode('');
                        }}
                        className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
                        disabled={actionLoading}
                      >
                        ยกเลิก
                      </button>
                      <button
                        onClick={handleDisable2FA}
                        disabled={actionLoading || verificationCode.length !== 6}
                        className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading ? 'กำลังปิดการใช้งาน...' : 'ยืนยันปิดการใช้งาน'}
                      </button>
                    </div>
                  </div>
                </GlassCardContent>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Regenerate Backup Codes Modal */}
      <AnimatePresence>
        {showRegenerateConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !actionLoading && setShowRegenerateConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <GlassCard>
                <GlassCardContent className="p-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FontAwesomeIcon icon={faKey} className="text-3xl text-orange-500" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      สร้าง Backup Codes ใหม่
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Backup Codes เก่าจะไม่สามารถใช้งานได้อีก กรุณายืนยันด้วยรหัส 2FA
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
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
                        className="w-full px-4 py-3 bg-muted/50 border border-border/50 rounded-lg text-center text-xl font-mono tracking-widest focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20"
                        autoFocus
                        disabled={actionLoading}
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowRegenerateConfirm(false);
                          setVerificationCode('');
                        }}
                        className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
                        disabled={actionLoading}
                      >
                        ยกเลิก
                      </button>
                      <button
                        onClick={handleRegenerateBackupCodes}
                        disabled={actionLoading || verificationCode.length !== 6}
                        className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading ? 'กำลังสร้าง...' : 'ยืนยันสร้างใหม่'}
                      </button>
                    </div>
                  </div>
                </GlassCardContent>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Backup Codes Display Modal */}
      <AnimatePresence>
        {newBackupCodes && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setNewBackupCodes(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <GlassCard>
                <GlassCardContent className="p-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FontAwesomeIcon icon={faCheckCircle} className="text-3xl text-green-500" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      Backup Codes ใหม่
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      กรุณาดาวน์โหลดและเก็บรหัสเหล่านี้ไว้ในที่ปลอดภัย
                    </p>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 border border-border/50 mb-4">
                    <div className="grid grid-cols-2 gap-2">
                      {newBackupCodes.map((code, index) => (
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

                  <div className="flex gap-3">
                    <button
                      onClick={() => setNewBackupCodes(null)}
                      className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
                    >
                      ปิด
                    </button>
                    <button
                      onClick={downloadBackupCodes}
                      className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <FontAwesomeIcon icon={faDownload} />
                      ดาวน์โหลด
                    </button>
                  </div>
                </GlassCardContent>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TwoFactorStatus;
