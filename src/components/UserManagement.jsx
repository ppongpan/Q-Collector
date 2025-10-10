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
import { motion } from 'framer-motion';
import { GlassCard, GlassCardContent } from './ui/glass-card';
import { useEnhancedToast } from './ui/enhanced-toast';
import CustomSelect from './ui/custom-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faSearch,
  faFilter,
  faLock,
  faUnlock,
  faTrash,
  faChevronDown,
  faPlus
} from '@fortawesome/free-solid-svg-icons';
import { ALL_ROLES, getRoleLabel, getRoleBadgeColor, getRoleTextColor } from '../config/roles.config';
import { useAuth } from '../contexts/AuthContext';
import ApiClient from '../services/ApiClient';
import { Switch } from './ui/switch';

export default function UserManagement({ onEditUser }) {
  const { user: currentUser } = useAuth();
  const toast = useEnhancedToast();

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    role: 'general_user'
  });


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

      // DEBUG: Check authentication state
      const token = localStorage.getItem('access_token');
      const user = localStorage.getItem('user');
      console.log('🔍 UserManagement loadUsers() - Auth Check:', {
        hasToken: !!token,
        tokenLength: token?.length,
        hasUser: !!user,
        currentUser: currentUser,
        currentUserRole: currentUser?.role
      });

      // Fetch users from API (with 2FA status)
      const [usersResponse, twoFAResponse] = await Promise.all([
        ApiClient.get('/users', {
          params: {
            page: 1,
            limit: 1000 // Get all users
          }
        }),
        ApiClient.get('/admin/users/2fa-status')
      ]);

      // DEBUG: Log API responses
      console.log('📡 UserManagement API Responses:', {
        usersResponse: usersResponse,
        twoFAResponse: twoFAResponse
      });

      // Extract users from response
      const fetchedUsers = usersResponse.data?.users || usersResponse.users || [];
      const twoFAUsers = twoFAResponse.data?.users || [];

      console.log('✅ Extracted users:', {
        fetchedUsersCount: fetchedUsers.length,
        twoFAUsersCount: twoFAUsers.length,
        fetchedUsers: fetchedUsers
      });

      // Create a map of 2FA status by user ID
      const twoFAMap = new Map(
        twoFAUsers.map(user => [user.id, {
          twoFactorEnabled: user.twoFactorEnabled || false,
          requires_2fa_setup: user.requires_2fa_setup || false,
          requires2FASetup: user.requires_2fa_setup || false // Support both naming conventions
        }])
      );

      // Transform users to match expected format
      const transformedUsers = fetchedUsers.map(user => {
        const twoFAStatus = twoFAMap.get(user.id) || {
          twoFactorEnabled: false,
          requires_2fa_setup: false,
          requires2FASetup: false
        };

        return {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          is_active: user.is_active !== undefined ? user.is_active : true,
          createdAt: user.created_at || user.createdAt,
          special_forms: user.special_forms || [],
          twoFactorEnabled: twoFAStatus.twoFactorEnabled,
          requires_2fa_setup: twoFAStatus.requires_2fa_setup,
          requires2FASetup: twoFAStatus.requires2FASetup
        };
      });

      setUsers(transformedUsers);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('ไม่สามารถโหลดข้อมูลผู้ใช้ได้', {
        description: error.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
      });
      setUsers([]);
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

  const handleUserClick = (user) => {
    // Navigate to user edit page instead of opening modal
    if (onEditUser) {
      onEditUser(user.id);
    }
  };

  // Get 2FA status (disabled/pending/enabled)
  const get2FAStatus = (user) => {
    if (user.twoFactorEnabled) return 'enabled'; // 🟢 เขียว - 2FA เปิดใช้งาน
    if (user.requires_2fa_setup || user.requires2FASetup) {
      console.log(`User ${user.username} is PENDING:`, { requires_2fa_setup: user.requires_2fa_setup, requires2FASetup: user.requires2FASetup });
      return 'pending'; // 🟡 เหลือง - รอตั้งค่า 2FA
    }
    return 'disabled'; // 🔴 แดง - 2FA ปิด
  };

  // Get 2FA color based on status
  const get2FAColor = (user) => {
    const status = get2FAStatus(user);
    if (status === 'enabled') return 'bg-green-500';
    if (status === 'pending') return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const handleToggle2FA = (user) => {
    const status = get2FAStatus(user);
    const isEnabling = status === 'disabled'; // Only enable if fully disabled

    const confirmAction = async (toastId) => {
      try {
        if (isEnabling) {
          // Call API to force 2FA setup on next login
          await ApiClient.post(`/admin/users/${user.id}/force-2fa`);

          toast.success('บังคับตั้งค่า 2FA สำเร็จ', {
            description: `${user.username} จะต้องตั้งค่า 2FA ในครั้งต่อไปที่เข้าสู่ระบบ (แสกน QR Code)`
          });
        } else {
          // Call API to completely disable 2FA
          await ApiClient.post(`/admin/users/${user.id}/reset-2fa`);

          toast.success('ปิด 2FA สำเร็จ', {
            description: `${user.username} สามารถเข้าสู่ระบบด้วยรหัสผ่านเท่านั้น (ไม่ต้องใช้ 2FA)`
          });
        }

        // Reload users to get updated 2FA status
        await loadUsers();
      } catch (error) {
        toast.error(`ไม่สามารถ${isEnabling ? 'เปิด' : 'ปิด'} 2FA ได้`, {
          description: error.response?.data?.message || error.message
        });
      }
    };

    if (isEnabling) {
      toast.warning(`ยืนยันการบังคับตั้งค่า 2FA สำหรับ "${user.username}"`, {
        title: '⚠️ บังคับตั้งค่า 2FA',
        description: 'ผู้ใช้จะต้องแสกน QR Code และยืนยัน OTP ในครั้งต่อไปที่ล็อกอิน',
        persistent: true,
        action: {
          label: 'บังคับตั้งค่า 2FA',
          onClick: confirmAction
        }
      });
    } else {
      toast.error(`ยืนยันการปิด 2FA สำหรับ "${user.username}"`, {
        title: '🔴 ยืนยันการปิด 2FA',
        description: 'ผู้ใช้จะสามารถเข้าสู่ระบบด้วยรหัสผ่านเท่านั้น (ไม่ต้องใช้ 2FA) จะลบ secret, backup codes และ trusted devices ทั้งหมด',
        persistent: true,
        action: {
          label: 'ปิด 2FA',
          onClick: confirmAction
        }
      });
    }
  };

  const handleDeleteUser = (user) => {
    // ป้องกันการลบตัวเอง
    if (user.id === currentUser?.id) {
      toast.error('ไม่สามารถลบบัญชีของตัวเองได้', {
        description: 'กรุณาใช้บัญชี Super Admin อื่นเพื่อลบบัญชีนี้'
      });
      return;
    }

    const toastId = toast.warning(`คุณแน่ใจหรือไม่ที่จะลบผู้ใช้ "${user.username}"?`, {
      title: '⚠️ ยืนยันการลบผู้ใช้',
      description: 'การดำเนินการนี้ไม่สามารถย้อนกลับได้',
      duration: 10000,
      action: {
        label: 'ยืนยันการลบ',
        onClick: async () => {
          // ปิด toast ทันทีเมื่อกดปุ่มยืนยัน
          toast.dismiss(toastId);

          try {
            console.log('Deleting user with ID:', user.id);
            const response = await ApiClient.delete(`/admin/users/${user.id}`);
            console.log('Delete response:', response);

            toast.success('ลบผู้ใช้เรียบร้อยแล้ว', {
              title: 'สำเร็จ'
            });

            await loadUsers();
          } catch (error) {
            console.error('Failed to delete user:', error);
            console.error('Error details:', error.response?.data);
            const errorMessage = error.response?.data?.error?.message || error.message || 'เกิดข้อผิดพลาด';
            toast.error(errorMessage, {
              title: 'ลบไม่สำเร็จ'
            });
          }
        }
      }
    });
  };

  const handleCreateUser = async () => {
    try {
      const response = await ApiClient.post('/admin/users', {
        ...newUser,
        requires_2fa_setup: true // Force 2FA setup on first login
      });

      toast.success('สร้างผู้ใช้สำเร็จ', {
        description: `สร้างผู้ใช้ ${newUser.username} เรียบร้อยแล้ว ผู้ใช้จะต้องตั้งค่า 2FA ในการเข้าใช้งานครั้งแรก`
      });

      setShowCreateUserModal(false);
      setNewUser({
        username: '',
        email: '',
        full_name: '',
        password: '',
        role: 'general_user'
      });

      await loadUsers();
    } catch (error) {
      toast.error('ไม่สามารถสร้างผู้ใช้ได้', {
        description: error.response?.data?.message || error.message
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
        {/* User Management Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          {/* Search and Filter Row */}
          <div className="flex items-center gap-2 mb-6">
            {/* Search Box */}
            <div className="relative flex-1">
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

            {/* Add User Button */}
            <motion.div className="flex-shrink-0">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCreateUserModal(true)}
                className="flex items-center justify-center border border-primary/40 hover:bg-primary/20 transition-all backdrop-blur-sm bg-primary/10"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  minWidth: '40px',
                  minHeight: '40px',
                  padding: 0
                }}
              >
                <FontAwesomeIcon icon={faPlus} className="w-4 h-4 text-primary" />
              </motion.button>
            </motion.div>

            {/* Filter Icon Button (Mobile/Tablet) - Circular */}
            <div className="sm:hidden flex-shrink-0">
              <button
                onClick={() => setShowFilterPopup(true)}
                className="flex items-center justify-center border border-border/40 hover:bg-muted/20 transition-all backdrop-blur-sm bg-background/80"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  minWidth: '40px',
                  minHeight: '40px',
                  padding: 0
                }}
              >
                <FontAwesomeIcon icon={faFilter} className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Role Filter (Desktop) */}
            <div className="hidden sm:block relative w-auto">
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
                className="w-auto pl-10"
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
                        <th className="px-2 py-2 text-left font-semibold text-foreground/80 w-20">ชื่อผู้ใช้</th>
                        <th className="px-2 py-2 text-center font-semibold text-foreground/80 w-36">บทบาท</th>
                        <th className="px-2 py-2 text-center font-semibold text-foreground/80 w-28">สถานะ</th>
                        <th className="px-2 py-2 text-center font-semibold text-foreground/80 w-24">2FA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user, index) => (
                        <motion.tr
                          key={user.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                        >
                          <td
                            className="px-2 py-3 cursor-pointer w-20"
                            onClick={() => handleUserClick(user)}
                          >
                            <div className="flex items-start gap-1.5">
                              <FontAwesomeIcon icon={faUser} className="text-primary text-[10px] mt-0.5 flex-shrink-0" />
                              <span className="font-medium leading-tight break-words text-[11px]">{user.username}</span>
                            </div>
                          </td>
                          <td
                            className="px-2 py-3 text-center cursor-pointer"
                            onClick={() => handleUserClick(user)}
                          >
                            <span className={`text-[11px] font-semibold ${getRoleTextColor(user.role)}`}>
                              {getRoleLabel(user.role)}
                            </span>
                          </td>
                          <td
                            className="px-2 py-3 text-center cursor-pointer"
                            onClick={() => handleUserClick(user)}
                          >
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                              user.is_active
                                ? 'bg-green-500/20 text-green-700 dark:text-green-300'
                                : 'bg-gray-500/20 text-gray-700 dark:text-gray-300'
                            }`}>
                              <FontAwesomeIcon icon={user.is_active ? faUnlock : faLock} className="text-[8px]" />
                              {user.is_active ? 'ใช้งาน' : 'ระงับ'}
                            </span>
                          </td>
                          <td className="px-2 py-3">
                            <div className="flex justify-center items-center gap-2">
                              <Switch
                                checked={get2FAStatus(user) !== 'disabled'}
                                onCheckedChange={() => handleToggle2FA(user)}
                                onClick={(e) => e.stopPropagation()}
                                className={
                                  get2FAStatus(user) === 'enabled'
                                    ? 'data-[state=checked]:bg-green-500'
                                    : get2FAStatus(user) === 'pending'
                                    ? 'data-[state=checked]:bg-yellow-500'
                                    : 'data-[state=unchecked]:bg-red-500'
                                }
                              />
                            </div>
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

      {/* Filter Popup (Mobile) */}
      {showFilterPopup && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-24 p-4"
          onClick={() => setShowFilterPopup(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm"
          >
            <GlassCard>
              <GlassCardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">กรองตามบทบาท</h3>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setRoleFilter('all');
                      setShowFilterPopup(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                      roleFilter === 'all'
                        ? 'bg-primary/20 border-2 border-primary'
                        : 'bg-muted/20 border-2 border-transparent hover:bg-muted/30'
                    }`}
                  >
                    <span className="text-base font-medium">ทุกบทบาท</span>
                  </button>

                  {ALL_ROLES.map(role => (
                    <button
                      key={role.value}
                      onClick={() => {
                        setRoleFilter(role.value);
                        setShowFilterPopup(false);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                        roleFilter === role.value
                          ? 'bg-primary/20 border-2 border-primary'
                          : 'bg-muted/20 border-2 border-transparent hover:bg-muted/30'
                      }`}
                    >
                      <span className={`text-base font-semibold ${getRoleTextColor(role.value)}`}>
                        {role.label}
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowFilterPopup(false)}
                  className="w-full mt-4 px-4 py-2 rounded-lg bg-muted/30 hover:bg-muted/40 transition-colors text-sm font-medium"
                >
                  ปิด
                </button>
              </GlassCardContent>
            </GlassCard>
          </motion.div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-24 p-4"
          onClick={() => setShowCreateUserModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md"
          >
            <GlassCard>
              <GlassCardContent className="p-6">
                <h3 className="text-xl font-semibold text-foreground mb-6">สร้างผู้ใช้ใหม่</h3>

                <div className="space-y-4">
                  {/* Username */}
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-2">
                      ชื่อผู้ใช้
                    </label>
                    <input
                      type="text"
                      value={newUser.username}
                      onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg input-glass border border-border/40 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      placeholder="username"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-2">
                      อีเมล
                    </label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg input-glass border border-border/40 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      placeholder="user@example.com"
                    />
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-2">
                      ชื่อ-นามสกุล
                    </label>
                    <input
                      type="text"
                      value={newUser.full_name}
                      onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg input-glass border border-border/40 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      placeholder="ชื่อ นามสกุล"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-2">
                      รหัสผ่านเริ่มต้น
                    </label>
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg input-glass border border-border/40 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      placeholder="รหัสผ่าน"
                    />
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-2">
                      บทบาท
                    </label>
                    <CustomSelect
                      value={newUser.role}
                      onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                      options={ALL_ROLES.map(role => ({
                        value: role.value,
                        label: role.label
                      }))}
                      className="w-full"
                    />
                  </div>

                  {/* Info */}
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                    <p className="text-sm text-foreground/80">
                      ⓘ ผู้ใช้จะถูกบังคับให้ตั้งค่า 2FA ในการเข้าใช้งานครั้งแรก
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowCreateUserModal(false)}
                    className="flex-1 px-4 py-2 rounded-lg bg-muted/30 hover:bg-muted/40 transition-colors text-sm font-medium"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleCreateUser}
                    className="flex-1 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white transition-colors text-sm font-medium"
                  >
                    สร้างผู้ใช้
                  </button>
                </div>
              </GlassCardContent>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </div>
  );
}