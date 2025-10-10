/**
 * Two-Factor Authentication Setup Page (Mandatory)
 *
 * This page is shown when a user has requires_2fa_setup = true
 * Forces user to complete 2FA setup before accessing the system
 */

import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TwoFactorSetup from './TwoFactorSetup';
import ApiClient from '../../services/ApiClient';
import { useAuth } from '../../contexts/AuthContext';
import { useEnhancedToast } from '../ui/enhanced-toast';

export function TwoFactorSetupPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshUser, logout } = useAuth();
  const toast = useEnhancedToast();

  // Get tempToken and username from location state (passed from LoginPage)
  const tempToken = location.state?.tempToken;
  const username = location.state?.username;

  // Check if tempToken exists
  useEffect(() => {
    if (!tempToken) {
      toast.error('ไม่พบข้อมูลการเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่', {
        title: '❌ ข้อผิดพลาด'
      });
      navigate('/login', { replace: true });
    }
  }, [tempToken, navigate, toast]);

  const handleComplete = async (data) => {
    console.log('2FA Setup completed:', data);

    try {
      // Refresh user data to get updated requires_2fa_setup status
      await refreshUser();

      toast.success('เปิดใช้งาน 2FA สำเร็จ!', {
        title: '🎉 สำเร็จ',
        description: 'บัญชีของคุณมีความปลอดภัยมากขึ้นแล้ว'
      });

      // Navigate to home page
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error refreshing user:', error);
      toast.error('เกิดข้อผิดพลาดในการอัพเดทข้อมูลผู้ใช้', {
        title: '❌ ข้อผิดพลาด'
      });
    }
  };

  const handleCancel = () => {
    // Logout and navigate back to login
    logout();
    navigate('/login', { replace: true });
  };

  // Don't render if no tempToken
  if (!tempToken) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <TwoFactorSetup
        tempToken={tempToken}
        username={username}
        apiClient={ApiClient}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    </div>
  );
}

export default TwoFactorSetupPage;
