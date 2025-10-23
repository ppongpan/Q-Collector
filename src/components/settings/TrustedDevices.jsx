/**
 * Trusted Devices Management Component
 *
 * Features:
 * - Display list of trusted devices
 * - Show device name, last used, IP address, expiration
 * - Revoke individual devices
 * - Revoke all devices
 * - Responsive design with glass morphism UI
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDesktop,
  faMobileAlt,
  faTabletAlt,
  faTrash,
  faExclamationTriangle,
  faCheckCircle,
  faGlobe,
  faClock,
  faFingerprint,
} from '@fortawesome/free-solid-svg-icons';
import { GlassCard, GlassCardContent, GlassCardHeader } from '../ui/glass-card';
import { useEnhancedToast } from '../ui/enhanced-toast';
import { ConfirmModal } from '../ui/alert-modal';
import ApiClient from '../../services/ApiClient';

const TrustedDevices = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(null);
  const [showRevokeAll, setShowRevokeAll] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ show: false, type: null, device: null });
  const toast = useEnhancedToast();

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const response = await ApiClient.get('/auth/trusted-devices');

      if (response.success) {
        setDevices(response.data.devices || []);
      }
    } catch (error) {
      console.error('Error loading trusted devices:', error);
      toast.error('ไม่สามารถโหลดรายการอุปกรณ์ได้', {
        title: '❌ ข้อผิดพลาด',
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeDevice = async (deviceId, deviceName) => {
    setConfirmDialog({
      show: true,
      type: 'single',
      device: { id: deviceId, name: deviceName }
    });
  };

  const confirmRevokeDevice = async () => {
    const { id: deviceId, name: deviceName } = confirmDialog.device;

    try {
      setRevoking(deviceId);
      setConfirmDialog({ show: false, type: null, device: null });
      const response = await ApiClient.delete(`/auth/trusted-devices/${deviceId}`);

      if (response.success) {
        toast.success('ยกเลิกอุปกรณ์สำเร็จ', {
          title: '✅ สำเร็จ',
          description: `อุปกรณ์ "${deviceName}" ถูกยกเลิกแล้ว`
        });

        // Remove device from list
        setDevices(devices.filter(d => d.id !== deviceId));
      }
    } catch (error) {
      console.error('Error revoking device:', error);
      toast.error('ไม่สามารถยกเลิกอุปกรณ์ได้', {
        title: '❌ ข้อผิดพลาด',
        description: error.message
      });
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeAllDevices = async () => {
    setConfirmDialog({
      show: true,
      type: 'all',
      device: null
    });
  };

  const confirmRevokeAllDevices = async () => {
    try {
      setRevoking('all');
      setConfirmDialog({ show: false, type: null, device: null });
      const response = await ApiClient.delete('/auth/trusted-devices');

      if (response.success) {
        toast.success('ยกเลิกอุปกรณ์ทั้งหมดสำเร็จ', {
          title: '✅ สำเร็จ',
          description: `ยกเลิก ${response.data.count} อุปกรณ์`
        });

        setDevices([]);
        setShowRevokeAll(false);
      }
    } catch (error) {
      console.error('Error revoking all devices:', error);
      toast.error('ไม่สามารถยกเลิกอุปกรณ์ทั้งหมดได้', {
        title: '❌ ข้อผิดพลาด',
        description: error.message
      });
    } finally {
      setRevoking(null);
    }
  };

  const getDeviceIcon = (deviceName) => {
    const name = deviceName?.toLowerCase() || '';
    if (name.includes('mobile') || name.includes('android') || name.includes('ios') || name.includes('iphone')) {
      return faMobileAlt;
    }
    if (name.includes('tablet') || name.includes('ipad')) {
      return faTabletAlt;
    }
    return faDesktop;
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'เมื่อสักครู่';
      if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
      if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
      if (diffDays < 30) return `${diffDays} วันที่แล้ว`;

      // Format as Thai date
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <GlassCard>
        <GlassCardHeader>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FontAwesomeIcon icon={faFingerprint} className="text-orange-500" />
            อุปกรณ์ที่เชื่อถือได้
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
            <FontAwesomeIcon icon={faFingerprint} className="text-orange-500" />
            อุปกรณ์ที่เชื่อถือได้
          </h3>
          {devices.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {devices.length} อุปกรณ์
            </span>
          )}
        </div>
      </GlassCardHeader>

      <GlassCardContent>
        {/* Info Banner */}
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <FontAwesomeIcon icon={faCheckCircle} className="text-blue-400 mt-1" />
            <div className="flex-1 text-sm">
              <p className="text-blue-300 font-medium mb-1">
                อุปกรณ์ที่เชื่อถือได้คืออะไร?
              </p>
              <p className="text-blue-200/80">
                อุปกรณ์ที่คุณเลือกให้ "จดจำอุปกรณ์" เมื่อยืนยัน 2FA จะไม่ต้องยืนยัน 2FA อีกเป็นเวลา 24 ชั่วโมง
              </p>
            </div>
          </div>
        </div>

        {/* Devices List */}
        {devices.length === 0 ? (
          <div className="text-center py-12">
            <FontAwesomeIcon
              icon={faDesktop}
              className="text-5xl text-muted-foreground/30 mb-4"
            />
            <p className="text-muted-foreground">
              ยังไม่มีอุปกรณ์ที่เชื่อถือได้
            </p>
            <p className="text-sm text-muted-foreground/70 mt-2">
              เลือก "จดจำอุปกรณ์" เมื่อยืนยัน 2FA เพื่อเพิ่มอุปกรณ์
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {devices.map((device, index) => {
                const isExpired = new Date(device.expires_at) < new Date();

                return (
                  <motion.div
                    key={device.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 bg-muted/30 border rounded-lg ${
                      isExpired
                        ? 'border-red-500/30 bg-red-500/5'
                        : 'border-border/50 hover:border-orange-500/50'
                    } transition-all`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Device Icon */}
                      <div className={`flex-shrink-0 w-12 h-12 rounded-lg ${
                        isExpired ? 'bg-red-500/20' : 'bg-orange-500/20'
                      } flex items-center justify-center`}>
                        <FontAwesomeIcon
                          icon={getDeviceIcon(device.device_name)}
                          className={`text-xl ${
                            isExpired ? 'text-red-400' : 'text-orange-500'
                          }`}
                        />
                      </div>

                      {/* Device Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-medium text-foreground truncate">
                            {device.device_name || 'Unknown Device'}
                          </h4>
                          {isExpired && (
                            <span className="text-xs text-red-400 bg-red-500/20 px-2 py-1 rounded">
                              หมดอายุ
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 text-xs text-muted-foreground">
                          {/* Last Used */}
                          <div className="flex items-center gap-2">
                            <FontAwesomeIcon icon={faClock} className="w-3" />
                            <span>ใช้งานล่าสุด: {formatDate(device.last_used_at)}</span>
                          </div>

                          {/* IP Address */}
                          {device.ip_address && (
                            <div className="flex items-center gap-2">
                              <FontAwesomeIcon icon={faGlobe} className="w-3" />
                              <span>IP: {device.ip_address}</span>
                            </div>
                          )}

                          {/* Expiration */}
                          <div className="flex items-center gap-2">
                            <FontAwesomeIcon
                              icon={isExpired ? faExclamationTriangle : faClock}
                              className="w-3"
                            />
                            <span className={isExpired ? 'text-red-400' : ''}>
                              {isExpired
                                ? `หมดอายุ ${formatDate(device.expires_at)}`
                                : `หมดอายุ ${formatDate(device.expires_at)}`
                              }
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Revoke Button */}
                      <button
                        onClick={() => handleRevokeDevice(device.id, device.device_name)}
                        disabled={revoking === device.id}
                        className="flex-shrink-0 p-2 text-red-400 hover:text-red-500 hover:scale-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="ยกเลิกอุปกรณ์"
                      >
                        {revoking === device.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                        ) : (
                          <FontAwesomeIcon icon={faTrash} className="w-4 h-4 hover:animate-pulse" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Revoke All Button */}
            {devices.length > 1 && (
              <div className="pt-4 mt-4 border-t border-border/50">
                {!showRevokeAll ? (
                  <button
                    onClick={() => setShowRevokeAll(true)}
                    className="w-full py-2 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors text-sm font-medium"
                  >
                    <FontAwesomeIcon icon={faTrash} className="mr-2" />
                    ยกเลิกอุปกรณ์ทั้งหมด
                  </button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-sm text-red-400 flex items-start gap-2">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="mt-0.5" />
                        <span>
                          การดำเนินการนี้จะยกเลิกอุปกรณ์ทั้งหมด และคุณจะต้องยืนยัน 2FA ทุกครั้งที่เข้าสู่ระบบ
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowRevokeAll(false)}
                        className="flex-1 py-2 px-4 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors text-sm"
                      >
                        ยกเลิก
                      </button>
                      <button
                        onClick={handleRevokeAllDevices}
                        disabled={revoking === 'all'}
                        className="flex-1 py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {revoking === 'all' ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            กำลังยกเลิก...
                          </div>
                        ) : (
                          'ยืนยันการยกเลิกทั้งหมด'
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        )}
      </GlassCardContent>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={confirmDialog.show && confirmDialog.type === 'single'}
        onClose={() => setConfirmDialog({ show: false, type: null, device: null })}
        onConfirm={confirmRevokeDevice}
        title="ยืนยันการยกเลิกอุปกรณ์"
        message={
          <div className="space-y-2">
            <p>คุณแน่ใจหรือไม่ที่จะยกเลิกอุปกรณ์นี้?</p>
            {confirmDialog.device && (
              <p className="font-semibold text-primary">"{confirmDialog.device.name}"</p>
            )}
            <p className="text-sm text-muted-foreground">
              คุณจะต้องยืนยัน 2FA อีกครั้งเมื่อเข้าสู่ระบบจากอุปกรณ์นี้
            </p>
          </div>
        }
        confirmText="ยกเลิกอุปกรณ์"
        cancelText="ปิด"
        variant="danger"
      />

      <ConfirmModal
        isOpen={confirmDialog.show && confirmDialog.type === 'all'}
        onClose={() => setConfirmDialog({ show: false, type: null, device: null })}
        onConfirm={confirmRevokeAllDevices}
        title="ยืนยันการยกเลิกอุปกรณ์ทั้งหมด"
        message={
          <div className="space-y-2">
            <p>คุณแน่ใจหรือไม่ที่จะยกเลิกอุปกรณ์ทั้งหมด?</p>
            <p className="text-sm text-muted-foreground">
              คุณจะต้องยืนยัน 2FA ทุกครั้งที่เข้าสู่ระบบ
            </p>
          </div>
        }
        confirmText="ยกเลิกทั้งหมด"
        cancelText="ปิด"
        variant="danger"
      />
    </GlassCard>
  );
};

export default TrustedDevices;
