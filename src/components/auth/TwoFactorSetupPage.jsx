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
import * as tokenManager from '../../utils/tokenManager';

export function TwoFactorSetupPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser, logout } = useAuth();
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
    console.log('2FA Setup completed - Full data:', data);
    console.log('2FA Setup - data.tokens:', data?.tokens);
    console.log('2FA Setup - data.user:', data?.user);

    try {
      // ✅ FIX: Store tokens and user data from 2FA setup response
      if (data?.tokens?.accessToken) {
        console.log('Setting access token:', data.tokens.accessToken.substring(0, 20) + '...');
        tokenManager.setAccessToken(data.tokens.accessToken);
      } else {
        console.error('❌ No access token in response!');
      }

      if (data?.tokens?.refreshToken) {
        console.log('Setting refresh token:', data.tokens.refreshToken.substring(0, 20) + '...');
        tokenManager.setRefreshToken(data.tokens.refreshToken);
      } else {
        console.error('❌ No refresh token in response!');
      }

      if (data?.user) {
        console.log('Setting user:', data.user.username);
        tokenManager.setUser(data.user);
        // Update AuthContext state immediately
        setUser(data.user);
      } else {
        console.error('❌ No user in response!');
      }

      toast.success('เปิดใช้งาน 2FA สำเร็จ!', {
        title: '🎉 สำเร็จ',
        description: 'บัญชีของคุณมีความปลอดภัยมากขึ้นแล้ว'
      });

      // Wait a bit to ensure state is synced
      await new Promise(resolve => setTimeout(resolve, 200));

      // Navigate to home page
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error in 2FA setup completion:', error);
      toast.error('เกิดข้อผิดพลาดในการตั้งค่า 2FA', {
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
