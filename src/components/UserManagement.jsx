/**
 * User Management Component
 *
 * Features:
 * - View all users with search and filter
 * - Edit user information (username, email, full_name, role)
 * - Reset user password
 * - Change user role (Super Admin only)
 * - Manage special form access permissions
 * - Active/inactive user status
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from './ui/glass-card';
import { useEnhancedToast } from './ui/enhanced-toast';
import { ConfirmModal } from './ui/alert-modal';
import CustomSelect from './ui/custom-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faEnvelope,
  faUserTag,
  faKey,
  faEdit,
  faSave,
  faTimes,
  faSearch,
  faFilter,
  faLock,
  faUnlock,
  faFileAlt,
  faPlus,
  faTrash,
  faBriefcase,
  faShieldAlt,
  faRotateRight,
  faCheckCircle,
  faTimesCircle
} from '@fortawesome/free-solid-svg-icons';
import { ALL_ROLES, getRoleLabel, getRoleBadgeColor, getRoleTextColor } from '../config/roles.config';
import { useAuth } from '../contexts/AuthContext';
import User2FAManagement from './admin/User2FAManagement';

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const toast = useEnhancedToast();

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({ show: false, type: null, user: null });

  // Edit form state
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    full_name: '',
    role: '',
    is_active: true,
    special_forms: '' // Comma-separated form names with brackets
  });

  // Password reset state
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  // Check if current user is Super Admin
  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Load users
  useEffect(() => {
    loadUsers();
  }, []);

  // Filter users when search or role filter changes
  useEffect(() => {
    filterUsers();
  }, [searchTerm, roleFilter, users]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      // TODO: Replace with actual API call
      const mockUsers = [
        {
          id: '1',
          username: 'pongpanp',
          email: 'admin@example.com',
          full_name: 'Pongpan Peerawanichkul',
          role: 'super_admin',
          is_active: true,
          createdAt: '2025-09-30T03:00:19.531Z',
          special_forms: [],
          twoFactorEnabled: true
        },
        {
          id: '2',
          username: 'technicuser',
          email: 'technic@example.com',
          full_name: 'Technic User',
          role: 'technic',
          is_active: true,
          createdAt: '2025-09-30T03:01:59.506Z',
          special_forms: ['[Technic Request]', '[บันทึกการเข้าไซต์งาน]'],
          twoFactorEnabled: false
        }
      ];
      setUsers(mockUsers);
      setIsLoading(false);
    } catch (error) {
      toast.error('ไม่สามารถโหลดข้อมูลผู้ใช้ได้', {
        description: error.message
      });
      setIsLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        (user.full_name && user.full_name.toLowerCase().includes(search))
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditForm({
      username: user.username,
      email: user.email,
      full_name: user.full_name || '',
      role: user.role,
      is_active: user.is_active,
      special_forms: user.special_forms ? user.special_forms.join(', ') : ''
    });
    setShowPasswordReset(false);
    setPasswordForm({ newPassword: '', confirmPassword: '' });
    setIsEditModalOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      // Validate
      if (!editForm.username || !editForm.email) {
        toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
        return;
      }

      // Parse special forms
      const specialForms = editForm.special_forms
        .split(',')
        .map(f => f.trim())
        .filter(f => f.length > 0);

      // TODO: Replace with actual API call
      const updatedUser = {
        ...selectedUser,
        username: editForm.username,
        email: editForm.email,
        full_name: editForm.full_name,
        role: editForm.role,
        is_active: editForm.is_active,
        special_forms: specialForms
      };

      // Update local state
      setUsers(users.map(u => u.id === selectedUser.id ? updatedUser : u));

      toast.success('บันทึกข้อมูลผู้ใช้สำเร็จ', {
        description: `อัปเดตข้อมูลของ ${editForm.username} เรียบร้อยแล้ว`
      });

      setIsEditModalOpen(false);
    } catch (error) {
      toast.error('ไม่สามารถบันทึกข้อมูลได้', {
        description: error.message
      });
    }
  };

  const handleResetPassword = async () => {
    try {
      // Validate
      if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
        toast.error('กรุณากรอกรหัสผ่านให้ครบถ้วน');
        return;
      }

      if (passwordForm.newPassword.length < 8) {
        toast.error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
        return;
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        toast.error('รหัสผ่านไม่ตรงกัน');
        return;
      }

      // TODO: Replace with actual API call
      toast.success('รีเซ็ตรหัสผ่านสำเร็จ', {
        description: `รีเซ็ตรหัสผ่านของ ${selectedUser.username} เรียบร้อยแล้ว`
      });

      setPasswordForm({ newPassword: '', confirmPassword: '' });
      setShowPasswordReset(false);
    } catch (error) {
      toast.error('ไม่สามารถรีเซ็ตรหัสผ่านได้', {
        description: error.message
      });
    }
  };

  const handleForceEnable2FA = async (user) => {
    setConfirmDialog({
      show: true,
      type: 'force',
      user: user
    });
  };

  const confirmForceEnable2FA = async () => {
    const user = confirmDialog.user;

    try {
      setConfirmDialog({ show: false, type: null, user: null });
      // TODO: Replace with actual API call
      // await ApiClient.post(`/admin/users/${user.id}/force-2fa`);

      // Update local state
      setUsers(users.map(u =>
        u.id === user.id ? { ...u, twoFactorEnabled: true } : u
      ));

      toast.success('บังคับเปิด 2FA สำเร็จ', {
        title: '✅ สำเร็จ',
        description: `${user.username} จะต้องตั้งค่า 2FA ในครั้งต่อไปที่เข้าสู่ระบบ`
      });
    } catch (error) {
      toast.error('ไม่สามารถบังคับเปิด 2FA ได้', {
        title: '❌ ข้อผิดพลาด',
        description: error.message
      });
    }
  };

  const handleReset2FA = async (user) => {
    setConfirmDialog({
      show: true,
      type: 'reset',
      user: user
    });
  };

  const confirmReset2FA = async () => {
    const user = confirmDialog.user;

    try {
      setConfirmDialog({ show: false, type: null, user: null });
      // TODO: Replace with actual API call
      // await ApiClient.post(`/admin/users/${user.id}/reset-2fa`);

      // Update local state
      setUsers(users.map(u =>
        u.id === user.id ? { ...u, twoFactorEnabled: false } : u
      ));

      toast.success('รีเซ็ต 2FA สำเร็จ', {
        title: '✅ สำเร็จ',
        description: `รีเซ็ต 2FA ของ ${user.username} เรียบร้อยแล้ว`
      });
    } catch (error) {
      toast.error('ไม่สามารถรีเซ็ต 2FA ได้', {
        title: '❌ ข้อผิดพลาด',
        description: error.message
      });
    }
  };

  // getRoleBadgeColor is now imported from roles.config.js to match Form Settings colors

  if (!isSuperAdmin) {
    return (
      <div className="container-responsive py-8">
        <GlassCard>
          <GlassCardContent className="text-center py-12">
            <FontAwesomeIcon icon={faLock} className="text-6xl text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
            <p className="text-muted-foreground">
              เฉพาะ Super Admin เท่านั้นที่สามารถจัดการผู้ใช้ได้
            </p>
          </GlassCardContent>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90">
      <div className="container-responsive px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6 sm:py-8 lg:py-12 space-y-8">
        {/* User 2FA Management Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <User2FAManagement />
        </motion.div>

        {/* User Management Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          {/* Search and Filter Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/60">
                <FontAwesomeIcon icon={faSearch} className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="ค้นหาผู้ใช้..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg input-glass border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
              />
            </div>

            {/* Role Filter */}
            <div className="relative w-full sm:w-auto">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/60 pointer-events-none z-10">
                <FontAwesomeIcon icon={faFilter} className="w-4 h-4" />
              </div>
              <CustomSelect
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'ทุกบทบาท' },
                  ...ALL_ROLES.map(role => ({
                    value: role.value,
                    label: role.label
                  }))
                ]}
                placeholder="ทุกบทบาท"
                className="w-full sm:w-auto pl-10"
              />
            </div>
          </div>
        </motion.div>

        {/* Users Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <GlassCard>
            <GlassCardContent className="p-0">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-sm text-muted-foreground">กำลังโหลดข้อมูล...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4 opacity-30">👥</div>
                  <h3 className="text-lg font-semibold text-foreground/80 mb-2">
                    {searchTerm ? 'ไม่พบผู้ใช้ที่ค้นหา' : 'ยังไม่มีผู้ใช้'}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {searchTerm ? 'ลองเปลี่ยนคำค้นหา' : 'ไม่มีผู้ใช้ในระบบ'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead className="bg-muted/30 border-b border-border/40">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-foreground/80">ชื่อผู้ใช้</th>
                        <th className="px-3 py-2 text-left font-semibold text-foreground/80">อีเมล</th>
                        <th className="px-3 py-2 text-left font-semibold text-foreground/80">ชื่อ-นามสกุล</th>
                        <th className="px-3 py-2 text-center font-semibold text-foreground/80">บทบาท</th>
                        <th className="px-3 py-2 text-center font-semibold text-foreground/80">สถานะ</th>
                        <th className="px-3 py-2 text-center font-semibold text-foreground/80">สิทธิ์พิเศษ</th>
                        <th className="px-3 py-2 text-center font-semibold text-foreground/80">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user, index) => (
                        <motion.tr
                          key={user.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer"
                        >
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <FontAwesomeIcon icon={faUser} className="text-primary text-[10px]" />
                              <span className="font-medium">{user.username}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{user.email}</td>
                          <td className="px-3 py-2">{user.full_name || '-'}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${getRoleBadgeColor(user.role)}`}>
                              {getRoleLabel(user.role)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                              user.is_active
                                ? 'bg-green-500/20 text-green-700 dark:text-green-300'
                                : 'bg-gray-500/20 text-gray-700 dark:text-gray-300'
                            }`}>
                              <FontAwesomeIcon icon={user.is_active ? faUnlock : faLock} className="text-[8px]" />
                              {user.is_active ? 'ใช้งาน' : 'ระงับ'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {user.special_forms && user.special_forms.length > 0 ? (
                              <div className="inline-flex items-center gap-1 text-primary">
                                <FontAwesomeIcon icon={faFileAlt} className="text-[10px]" />
                                <span>{user.special_forms.length}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => handleEditUser(user)}
                              className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-primary/10 text-primary transition-colors"
                              title="แก้ไขข้อมูล"
                            >
                              <FontAwesomeIcon icon={faEdit} className="text-[11px]" />
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </GlassCardContent>
          </GlassCard>
        </motion.div>
      </div>

      {/* Edit User Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsEditModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <GlassCard>
                <GlassCardHeader>
                  <div className="flex items-center justify-between">
                    <GlassCardTitle>แก้ไขข้อมูลผู้ใช้</GlassCardTitle>
                    <button
                      onClick={() => setIsEditModalOpen(false)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background/50 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                </GlassCardHeader>

                <GlassCardContent className="space-y-4">
                  {/* Username */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      <FontAwesomeIcon icon={faUser} className="mr-2" />
                      ชื่อผู้ใช้
                    </label>
                    <input
                      type="text"
                      value={editForm.username}
                      onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-background/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
                      อีเมล
                    </label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-background/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      <FontAwesomeIcon icon={faUser} className="mr-2" />
                      ชื่อ-นามสกุล
                    </label>
                    <input
                      type="text"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-background/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      <FontAwesomeIcon icon={faUserTag} className="mr-2" />
                      บทบาท
                    </label>
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-background text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    >
                      {ALL_ROLES.map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-muted-foreground">
                      เฉพาะ Super Admin เท่านั้นที่สามารถเปลี่ยนบทบาทได้
                    </p>
                  </div>

                  {/* Active Status */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.is_active}
                        onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary/50"
                      />
                      <span className="text-sm font-medium">
                        <FontAwesomeIcon icon={faUnlock} className="mr-2" />
                        บัญชีใช้งานได้
                      </span>
                    </label>
                  </div>

                  {/* Special Form Access */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      <FontAwesomeIcon icon={faFileAlt} className="mr-2" />
                      สิทธิ์พิเศษเข้าถึงฟอร์ม
                    </label>
                    <textarea
                      value={editForm.special_forms}
                      onChange={(e) => setEditForm({ ...editForm, special_forms: e.target.value })}
                      placeholder="[Technic Request], [บันทึกการเข้าไซต์งาน]"
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg bg-background/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      ใส่ชื่อฟอร์มในวงเล็บ [] คั่นด้วยเครื่องหมาย , เช่น [Technic Request], [Sales Report]
                    </p>
                    <p className="mt-1 text-xs text-primary">
                      💡 ผู้ใช้จะสามารถเข้าถึงฟอร์มที่ระบุได้ นอกเหนือจากฟอร์มที่ tag Role ของตนเองไว้
                    </p>
                  </div>

                  {/* Password Reset Section */}
                  <div className="border-t border-border pt-4">
                    <button
                      onClick={() => setShowPasswordReset(!showPasswordReset)}
                      className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                      <FontAwesomeIcon icon={faKey} />
                      {showPasswordReset ? 'ซ่อนการรีเซ็ตรหัสผ่าน' : 'รีเซ็ตรหัสผ่าน'}
                    </button>

                    {showPasswordReset && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 space-y-3"
                      >
                        <div>
                          <label className="block text-sm font-medium mb-2">รหัสผ่านใหม่</label>
                          <input
                            type="password"
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                            placeholder="อย่างน้อย 8 ตัวอักษร"
                            className="w-full px-4 py-2 rounded-lg bg-background/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">ยืนยันรหัสผ่านใหม่</label>
                          <input
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                            placeholder="กรอกรหัสผ่านอีกครั้ง"
                            className="w-full px-4 py-2 rounded-lg bg-background/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                          />
                        </div>
                        <button
                          onClick={handleResetPassword}
                          className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <FontAwesomeIcon icon={faKey} />
                          รีเซ็ตรหัสผ่าน
                        </button>
                      </motion.div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={handleSaveUser}
                      className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <FontAwesomeIcon icon={faSave} />
                      บันทึก
                    </button>
                    <button
                      onClick={() => setIsEditModalOpen(false)}
                      className="px-4 py-2 bg-background/50 hover:bg-background border border-border rounded-lg font-medium transition-colors"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </GlassCardContent>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                <p className="font-semibold text-primary">"{confirmDialog.user.username}"</p>
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
                <p className="font-semibold text-primary">"{confirmDialog.user.username}"</p>
                <div className="mt-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <p className="font-semibold text-orange-500 mb-2">⚠️ การดำเนินการนี้จะ:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>ลบ 2FA secret และ backup codes ทั้งหมด</li>
                    <li>ผู้ใช้จะต้องตั้งค่า 2FA ใหม่ทั้งหมด</li>
                    <li>Trusted devices ทั้งหมดจะถูกลบ</li>
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
    </div>
  );
}