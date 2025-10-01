/**
 * User 2FA Management Component (Super Admin Only)
 *
 * Features:
 * - View 2FA status for all users
 * - Force enable 2FA for specific users
 * - Reset 2FA (remove secret, backup codes, trusted devices)
 * - Bulk 2FA operations
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldAlt,
  faCheckCircle,
  faTimesCircle,
  faRotateRight,
  faLock,
  faSearch,
  faFilter,
  faUser
} from '@fortawesome/free-solid-svg-icons';
import { GlassCard, GlassCardContent, GlassCardHeader } from '../ui/glass-card';
import { useEnhancedToast } from '../ui/enhanced-toast';
import { ConfirmModal } from '../ui/alert-modal';
import { useAuth } from '../../contexts/AuthContext';
import ApiClient from '../../services/ApiClient';

const User2FAManagement = () => {
  const { user: currentUser } = useAuth();
  const toast = useEnhancedToast();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, enabled, disabled
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ show: false, type: null, user: null });

  // Check if current user is Super Admin
  const isSuperAdmin = currentUser?.role === 'super_admin';

  useEffect(() => {
    if (isSuperAdmin) {
      loadUsers();
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, statusFilter, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await ApiClient.get('/admin/users/2fa-status');

      if (response.success) {
        setUsers(response.data.users || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('ไม่สามารถโหลดข้อมูลผู้ใช้ได้', {
        title: '❌ ข้อผิดพลาด',
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter === 'enabled') {
      filtered = filtered.filter(user => user.twoFactorEnabled);
    } else if (statusFilter === 'disabled') {
      filtered = filtered.filter(user => !user.twoFactorEnabled);
    }

    setFilteredUsers(filtered);
  };

  const handleForceEnable2FA = async (userId, username) => {
    setConfirmDialog({
      show: true,
      type: 'force',
      user: { id: userId, name: username }
    });
  };

  const confirmForceEnable2FA = async () => {
    const { id: userId, name: username } = confirmDialog.user;

    try {
      setActionLoading(userId);
      setConfirmDialog({ show: false, type: null, user: null });
      const response = await ApiClient.post(`/admin/users/${userId}/force-2fa`);

      if (response.success) {
        toast.success('บังคับเปิด 2FA สำเร็จ', {
          title: '✅ สำเร็จ',
          description: `${username} จะต้องตั้งค่า 2FA ในครั้งต่อไปที่เข้าสู่ระบบ`
        });
        loadUsers(); // Reload users
      }
    } catch (error) {
      console.error('Error forcing 2FA:', error);
      toast.error('ไม่สามารถบังคับเปิด 2FA ได้', {
        title: '❌ ข้อผิดพลาด',
        description: error.message
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReset2FA = async (userId, username) => {
    setConfirmDialog({
      show: true,
      type: 'reset',
      user: { id: userId, name: username }
    });
  };

  const confirmReset2FA = async () => {
    const { id: userId, name: username } = confirmDialog.user;

    try {
      setActionLoading(userId);
      setConfirmDialog({ show: false, type: null, user: null });
      const response = await ApiClient.post(`/admin/users/${userId}/reset-2fa`);

      if (response.success) {
        toast.success('รีเซ็ต 2FA สำเร็จ', {
          title: '✅ สำเร็จ',
          description: `รีเซ็ต 2FA ของ ${username} เรียบร้อยแล้ว`
        });
        loadUsers(); // Reload users
      }
    } catch (error) {
      console.error('Error resetting 2FA:', error);
      toast.error('ไม่สามารถรีเซ็ต 2FA ได้', {
        title: '❌ ข้อผิดพลาด',
        description: error.message
      });
    } finally {
      setActionLoading(null);
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
            <FontAwesomeIcon icon={faShieldAlt} className="text-orange-500" />
            การจัดการ 2FA ของผู้ใช้
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
            <FontAwesomeIcon icon={faShieldAlt} className="text-orange-500" />
            การจัดการ 2FA ของผู้ใช้
          </h3>
          <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded">
            Super Admin Only
          </span>
        </div>
      </GlassCardHeader>

      <GlassCardContent>
        {/* Search and Filter */}
        <div className="mb-4 flex gap-3">
          <div className="flex-1 relative">
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="ค้นหาชื่อผู้ใช้, อีเมล..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-muted/30 border border-border/50 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-orange-500/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faFilter} className="text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-muted/30 border border-border/50 rounded-lg text-foreground focus:outline-none focus:border-orange-500/50"
            >
              <option value="all">ทั้งหมด</option>
              <option value="enabled">เปิด 2FA</option>
              <option value="disabled">ปิด 2FA</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 bg-muted/30 border border-border/50 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">ทั้งหมด</div>
            <div className="text-xl font-semibold">{users.length}</div>
          </div>
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="text-xs text-green-400 mb-1">เปิด 2FA</div>
            <div className="text-xl font-semibold text-green-400">
              {users.filter(u => u.twoFactorEnabled).length}
            </div>
          </div>
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="text-xs text-red-400 mb-1">ปิด 2FA</div>
            <div className="text-xl font-semibold text-red-400">
              {users.filter(u => !u.twoFactorEnabled).length}
            </div>
          </div>
        </div>

        {/* User List */}
        <div className="space-y-2">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              ไม่พบผู้ใช้
            </div>
          ) : (
            filteredUsers.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="p-4 bg-muted/30 border border-border/50 rounded-lg hover:border-orange-500/50 transition-all"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FontAwesomeIcon icon={faUser} className="text-orange-500 text-xs" />
                      <span className="font-medium truncate">{user.username}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        ({user.email})
                      </span>
                    </div>
                    {user.full_name && (
                      <div className="text-sm text-muted-foreground">{user.full_name}</div>
                    )}
                  </div>

                  {/* 2FA Status */}
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded ${
                      user.twoFactorEnabled
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      <FontAwesomeIcon
                        icon={user.twoFactorEnabled ? faCheckCircle : faTimesCircle}
                        className="text-xs"
                      />
                      <span className="text-sm font-medium">
                        {user.twoFactorEnabled ? 'เปิด 2FA' : 'ปิด 2FA'}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {!user.twoFactorEnabled && (
                        <button
                          onClick={() => handleForceEnable2FA(user.id, user.username)}
                          disabled={actionLoading === user.id}
                          className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          title="บังคับเปิด 2FA"
                        >
                          <FontAwesomeIcon icon={faLock} className="text-xs" />
                          <span className="text-sm">บังคับเปิด</span>
                        </button>
                      )}

                      {user.twoFactorEnabled && (
                        <button
                          onClick={() => handleReset2FA(user.id, user.username)}
                          disabled={actionLoading === user.id}
                          className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          title="รีเซ็ต 2FA"
                        >
                          <FontAwesomeIcon icon={faRotateRight} className="text-xs" />
                          <span className="text-sm">รีเซ็ต</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </GlassCardContent>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={confirmDialog.show && confirmDialog.type === 'force'}
        onClose={() => setConfirmDialog({ show: false, type: null, user: null })}
        onConfirm={confirmForceEnable2FA}
        title="ยืนยันการบังคับเปิด 2FA"
        message={
          <div className="space-y-2">
            {confirmDialog.user && (
              <>
                <p>คุณแน่ใจหรือไม่ที่จะบังคับเปิด 2FA สำหรับ</p>
                <p className="font-semibold text-primary">"{confirmDialog.user.name}"</p>
                <p className="text-sm text-muted-foreground">
                  ผู้ใช้จะต้องตั้งค่า 2FA ในครั้งต่อไปที่เข้าสู่ระบบ
                </p>
              </>
            )}
          </div>
        }
        confirmText="บังคับเปิด 2FA"
        cancelText="ยกเลิก"
        variant="warning"
      />

      <ConfirmModal
        isOpen={confirmDialog.show && confirmDialog.type === 'reset'}
        onClose={() => setConfirmDialog({ show: false, type: null, user: null })}
        onConfirm={confirmReset2FA}
        title="ยืนยันการรีเซ็ต 2FA"
        message={
          <div className="space-y-2">
            {confirmDialog.user && (
              <>
                <p>คุณแน่ใจหรือไม่ที่จะรีเซ็ต 2FA สำหรับ</p>
                <p className="font-semibold text-primary">"{confirmDialog.user.name}"</p>
                <div className="mt-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <p className="font-semibold text-orange-500 mb-2">⚠️ การดำเนินการนี้จะ:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>ลบ 2FA secret และ backup codes ทั้งหมด</li>
                    <li>ลบ trusted devices ทั้งหมด</li>
                    <li>ผู้ใช้จะต้องตั้งค่า 2FA ใหม่ทั้งหมด</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        }
        confirmText="รีเซ็ต 2FA"
        cancelText="ยกเลิก"
        variant="danger"
      />
    </GlassCard>
  );
};

export default User2FAManagement;
