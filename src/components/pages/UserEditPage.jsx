import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../ui/glass-card';
import { GlassButton } from '../ui/glass-button';
import { useEnhancedToast } from '../ui/enhanced-toast';
import apiClient from '../../services/ApiClient';

const USER_ROLES = [
  { id: 'super_admin', name: 'Super Admin', color: 'text-red-500' },
  { id: 'admin', name: 'Admin', color: 'text-pink-500' },
  { id: 'moderator', name: 'Moderator', color: 'text-purple-500' },
  { id: 'customer_service', name: 'Customer Service', color: 'text-blue-500' },
  { id: 'technic', name: 'Technic', color: 'text-cyan-500' },
  { id: 'sale', name: 'Sale', color: 'text-green-500' },
  { id: 'marketing', name: 'Marketing', color: 'text-orange-500' },
  { id: 'general_user', name: 'General User', color: 'text-gray-500' }
];

export default function UserEditPage({ userId, onSave, onCancel }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editedUser, setEditedUser] = useState({
    username: '',
    email: '',
    role: 'general_user',
    firstName: '',
    lastName: ''
  });
  const toast = useEnhancedToast();

  useEffect(() => {
    loadUser();
  }, [userId]);

  const loadUser = async () => {
    try {
      setLoading(true);
      console.log('Loading user with ID:', userId);
      const response = await apiClient.get(`/users/${userId}`);
      const userData = response.data?.user || response.data;
      console.log('User data loaded:', userData);

      setUser(userData);
      setEditedUser({
        username: userData.username || '',
        email: userData.email || '',
        role: userData.role || 'general_user',
        firstName: userData.firstName || userData.first_name || '',
        lastName: userData.lastName || userData.last_name || ''
      });
    } catch (error) {
      console.error('Failed to load user:', error);
      toast.error('ไม่สามารถโหลดข้อมูลผู้ใช้ได้', {
        title: 'ข้อผิดพลาด'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Validate
      if (!editedUser.username?.trim()) {
        toast.error('กรุณากรอกชื่อผู้ใช้', { title: 'ข้อมูลไม่ครบถ้วน' });
        return;
      }
      if (!editedUser.email?.trim()) {
        toast.error('กรุณากรอกอีเมล', { title: 'ข้อมูลไม่ครบถ้วน' });
        return;
      }

      const updateData = {
        username: editedUser.username.trim(),
        email: editedUser.email.trim(),
        role: editedUser.role,
        firstName: editedUser.firstName?.trim() || null,
        lastName: editedUser.lastName?.trim() || null
      };

      await apiClient.put(`/users/${userId}`, updateData);

      toast.success('บันทึกข้อมูลผู้ใช้เรียบร้อยแล้ว', {
        title: 'สำเร็จ'
      });

      if (onSave) {
        onSave(updateData);
      }
    } catch (error) {
      console.error('Failed to save user:', error);
      const errorMessage = error.response?.data?.error?.message || error.message || 'เกิดข้อผิดพลาด';
      toast.error(errorMessage, {
        title: 'บันทึกไม่สำเร็จ'
      });
    }
  };

  const handleDelete = () => {
    console.log('Delete button clicked - User ID:', userId, 'User:', user);
    const toastId = toast.warning(`คุณแน่ใจหรือไม่ที่จะลบผู้ใช้ "${user?.username}"?`, {
      title: '⚠️ ยืนยันการลบผู้ใช้',
      description: 'การดำเนินการนี้ไม่สามารถย้อนกลับได้',
      duration: 10000,
      action: {
        label: 'ยืนยันการลบ',
        onClick: async () => {
          // ปิด toast ทันทีเมื่อกดปุ่มยืนยัน
          toast.dismiss(toastId);

          try {
            console.log('Deleting user with ID:', userId);
            const response = await apiClient.delete(`/users/${userId}`);
            console.log('Delete response:', response);
            toast.success('ลบผู้ใช้เรียบร้อยแล้ว', {
              title: 'สำเร็จ'
            });
            if (onCancel) {
              onCancel();
            }
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

  if (loading) {
    return (
      <div className="container-responsive py-8">
        <div className="text-center py-16">
          <div className="text-xl font-semibold text-foreground/80 mb-2">กำลังโหลดข้อมูล...</div>
          <div className="text-sm text-muted-foreground">โปรดรอสักครู่</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container-responsive py-8">
        <div className="text-center py-16">
          <div className="text-xl font-semibold text-destructive mb-2">ไม่พบข้อมูลผู้ใช้</div>
          <GlassButton onClick={onCancel} className="mt-4">
            กลับ
          </GlassButton>
        </div>
      </div>
    );
  }

  return (
    <div className="container-responsive py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <GlassCard className="max-w-2xl mx-auto">
          <div className="p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              แก้ไขข้อมูลผู้ใช้
            </h2>

            <div className="space-y-6">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">
                  ชื่อผู้ใช้ <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={editedUser.username}
                  onChange={(e) => setEditedUser({ ...editedUser, username: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-border/50 bg-background/50
                           text-foreground placeholder-muted-foreground
                           focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                           transition-all"
                  placeholder="ชื่อผู้ใช้"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">
                  อีเมล <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  value={editedUser.email}
                  onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-border/50 bg-background/50
                           text-foreground placeholder-muted-foreground
                           focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                           transition-all"
                  placeholder="อีเมล"
                />
              </div>

              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">
                  ชื่อจริง
                </label>
                <input
                  type="text"
                  value={editedUser.firstName}
                  onChange={(e) => setEditedUser({ ...editedUser, firstName: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-border/50 bg-background/50
                           text-foreground placeholder-muted-foreground
                           focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                           transition-all"
                  placeholder="ชื่อจริง"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">
                  นามสกุล
                </label>
                <input
                  type="text"
                  value={editedUser.lastName}
                  onChange={(e) => setEditedUser({ ...editedUser, lastName: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-border/50 bg-background/50
                           text-foreground placeholder-muted-foreground
                           focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                           transition-all"
                  placeholder="นามสกุล"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">
                  บทบาท <span className="text-destructive">*</span>
                </label>
                <select
                  value={editedUser.role}
                  onChange={(e) => setEditedUser({ ...editedUser, role: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-border/50 bg-background/50
                           text-foreground
                           focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                           transition-all cursor-pointer"
                >
                  {USER_ROLES.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* User Info Summary */}
              <div className="pt-4 border-t border-border/20">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">ข้อมูลเพิ่มเติม</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">สถานะ 2FA:</span>
                    <span className="ml-2 text-foreground">
                      {user.twoFactorEnabled ? '✅ เปิดใช้งาน' : '❌ ปิดใช้งาน'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">อุปกรณ์ที่เชื่อถือ:</span>
                    <span className="ml-2 text-foreground">
                      {user.trustedDeviceCount || 0} อุปกรณ์
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">สร้างเมื่อ:</span>
                    <span className="ml-2 text-foreground">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('th-TH') : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">อัพเดทล่าสุด:</span>
                    <span className="ml-2 text-foreground">
                      {user.updatedAt ? new Date(user.updatedAt).toLocaleDateString('th-TH') : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 mt-8 pt-6 border-t border-border/20">
              <div className="flex gap-3">
                <GlassButton
                  onClick={handleSave}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  บันทึก
                </GlassButton>
                <GlassButton
                  onClick={onCancel}
                  variant="outline"
                  className="flex-1"
                >
                  ยกเลิก
                </GlassButton>
              </div>
              <GlassButton
                onClick={handleDelete}
                variant="outline"
                className="w-full bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/30"
              >
                ลบผู้ใช้
              </GlassButton>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
