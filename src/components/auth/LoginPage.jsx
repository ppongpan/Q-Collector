/**
 * Login Page Component
 *
 * Features:
 * - Email/password login form
 * - Two-Factor Authentication (2FA) support
 * - Form validation
 * - Loading states
 * - Error messages
 * - Link to registration
 * - Remember me (future)
 * - Forgot password link (future)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { GlassCard, GlassCardContent, GlassCardHeader } from '../ui/glass-card';
import { InfoModal } from '../ui/alert-modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faLock, faSignInAlt, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import TwoFactorVerification from './TwoFactorVerification';
import * as tokenManager from '../../utils/tokenManager';
import { getDeviceFingerprint } from '../../utils/deviceFingerprint';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticating, isAuthenticated, setUser } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState(null);
  const [username2FA, setUsername2FA] = useState('');
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (apiError) {
      setApiError('');
    }
  };

  // Validate form
  const validate = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'กรุณากรอก Username';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username ต้องมีอย่างน้อย 3 ตัวอักษร';
    }

    if (!formData.password) {
      newErrors.password = 'กรุณากรอกรหัสผ่าน';
    } else if (formData.password.length < 6) {
      newErrors.password = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    if (!validate()) return;

    try {
      // Clear all old tokens BEFORE login to prevent race conditions
      // This prevents FormListApp from using stale tokens while login is in progress
      console.log('LoginPage - Clearing old tokens before login');

      // ✅ Clear both old AND new storage keys for compatibility
      localStorage.removeItem('access_token'); // Old key
      localStorage.removeItem('refresh_token'); // Old key
      localStorage.removeItem('q-collector-auth-token'); // New key
      localStorage.removeItem('q-collector-refresh-token'); // New key
      localStorage.removeItem('user');

      // Get device fingerprint
      const deviceFingerprint = await getDeviceFingerprint();

      // Use AuthContext login which handles both 2FA and normal login
      const loginResponse = await login(
        formData.username,
        formData.password,
        deviceFingerprint
      );

      console.log('LoginPage - Login response:', JSON.stringify(loginResponse, null, 2));
      console.log('LoginPage - requires2FASetup check:', JSON.stringify({
        direct: loginResponse.requires2FASetup,
        nested: loginResponse.data?.requires2FASetup,
        hasRequires2FA: loginResponse.requires2FA,
        tempToken: loginResponse.tempToken?.substring(0, 20) + '...'
      }, null, 2));

      if (loginResponse) {
        // Check if mandatory 2FA setup is required (admin-created account)
        if (loginResponse.requires2FASetup || loginResponse.mandatory) {
          console.log('LoginPage - Mandatory 2FA setup required, redirecting to setup');
          // Clear any saved redirect path - 2FA setup is mandatory
          sessionStorage.removeItem('redirectAfterLogin');
          navigate('/2fa-setup', {
            state: {
              tempToken: loginResponse.tempToken || loginResponse.data?.tempToken,
              username: loginResponse.username || loginResponse.data?.username,
              mandatory: true
            },
            replace: true
          });
          return; // Exit early to prevent further processing
        }
        // Check if 2FA verification is required (normal 2FA login)
        else if (loginResponse.requires2FA) {
          console.log('LoginPage - 2FA verification required, setting state:', {
            tempToken: loginResponse.tempToken || loginResponse.data?.tempToken,
            username: loginResponse.username || loginResponse.data?.username
          });
          setRequires2FA(true);
          setTempToken(loginResponse.tempToken || loginResponse.data?.tempToken);
          setUsername2FA(loginResponse.username || loginResponse.data?.username);
        } else if (loginResponse.user) {
          // No 2FA - login successful
          console.log('LoginPage - Login successful, updating AuthContext');

          // Update AuthContext state immediately before navigation
          // This triggers isAuthenticated to become true
          setUser(loginResponse.user);

          // 🔄 CRITICAL FIX: Poll for tokens with retry logic
          // This prevents race condition where FormListApp loads before tokens are available
          console.log('LoginPage - Waiting for tokens to be saved to localStorage...');

          const waitForTokens = async () => {
            const maxAttempts = 20; // Try for 2 seconds max (20 × 100ms)

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
              // ✅ FIX: Check for correct storage keys matching API_CONFIG
              const hasToken = !!localStorage.getItem('q-collector-auth-token');
              const hasRefreshToken = !!localStorage.getItem('q-collector-refresh-token');
              const hasUser = !!localStorage.getItem('user');

              console.log(`LoginPage - Token check attempt ${attempt}/${maxAttempts}:`, {
                hasToken,
                hasRefreshToken,
                hasUser
              });

              if (hasToken && hasRefreshToken && hasUser) {
                console.log('✅ LoginPage - All tokens confirmed in localStorage!');
                return true;
              }

              // Wait 100ms before next check
              await new Promise(resolve => setTimeout(resolve, 100));
            }

            console.error('❌ LoginPage - Timeout: Tokens never appeared in localStorage after 2 seconds!');
            return false;
          };

          const tokensReady = await waitForTokens();

          if (!tokensReady) {
            console.error('❌ LoginPage - Cannot navigate: Tokens not available!');
            setApiError('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
            return; // Don't navigate if tokens aren't ready
          }

          // ✅ Tokens confirmed - safe to navigate now
          console.log('LoginPage - Navigating to home page with confirmed tokens');

          // ✅ FIX: Check if there's a saved redirect URL (from token expiry)
          const redirectPath = sessionStorage.getItem('redirectAfterLogin');
          if (redirectPath) {
            sessionStorage.removeItem('redirectAfterLogin'); // Clear after using
            navigate(redirectPath, { replace: true });
          } else {
            // Default to home page
            navigate('/', { replace: true });
          }
        }
      }
    } catch (error) {
      setApiError(error.message || 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
  };

  // Handle 2FA verification success
  const handle2FASuccess = async (data) => {
    try {
      console.log('handle2FASuccess - received data:', data);

      // Store tokens from 2FA response
      if (data.tokens?.accessToken) {
        tokenManager.setAccessToken(data.tokens.accessToken);
      }
      if (data.tokens?.refreshToken) {
        tokenManager.setRefreshToken(data.tokens.refreshToken);
      }
      if (data.user) {
        tokenManager.setUser(data.user);
        // Update AuthContext state immediately
        setUser(data.user);
      }

      // 🔄 CRITICAL FIX: Poll for tokens with retry logic (same as normal login)
      console.log('handle2FASuccess - Waiting for tokens to be saved to localStorage...');

      const waitForTokens = async () => {
        const maxAttempts = 20; // Try for 2 seconds max (20 × 100ms)

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          // ✅ FIX: Check for correct storage keys matching API_CONFIG
          const hasToken = !!localStorage.getItem('q-collector-auth-token');
          const hasRefreshToken = !!localStorage.getItem('q-collector-refresh-token');
          const hasUser = !!localStorage.getItem('user');

          console.log(`handle2FASuccess - Token check attempt ${attempt}/${maxAttempts}:`, {
            hasToken,
            hasRefreshToken,
            hasUser
          });

          if (hasToken && hasRefreshToken && hasUser) {
            console.log('✅ handle2FASuccess - All tokens confirmed in localStorage!');
            return true;
          }

          // Wait 100ms before next check
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.error('❌ handle2FASuccess - Timeout: Tokens never appeared in localStorage after 2 seconds!');
        return false;
      };

      const tokensReady = await waitForTokens();

      if (!tokensReady) {
        console.error('❌ handle2FASuccess - Cannot navigate: Tokens not available!');
        setApiError('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
        return; // Don't navigate if tokens aren't ready
      }

      // ✅ Tokens confirmed - safe to navigate now
      console.log('handle2FASuccess - Navigating with confirmed tokens');

      // ✅ FIX: Check if there's a saved redirect URL (from token expiry)
      const redirectPath = sessionStorage.getItem('redirectAfterLogin');
      if (redirectPath) {
        sessionStorage.removeItem('redirectAfterLogin'); // Clear after using
        navigate(redirectPath, { replace: true });
      } else {
        // Default to home page
        navigate('/', { replace: true });
      }
    } catch (error) {
      console.error('handle2FASuccess error:', error);
      setApiError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    }
  };

  // Handle 2FA cancel
  const handle2FACancel = () => {
    setRequires2FA(false);
    setTempToken(null);
    setUsername2FA('');
    setFormData({ username: '', password: '' });
  };

  // Show 2FA verification screen
  if (requires2FA) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <TwoFactorVerification
          tempToken={tempToken}
          username={username2FA}
          onSuccess={handle2FASuccess}
          onCancel={handle2FACancel}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <GlassCard>
          <GlassCardHeader>
            {/* Company Branding - Top */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="flex justify-center mb-6"
            >
              <img
                src="/SHARE_POTENTIALS.png"
                alt="Q-CON - Share Potentials to Shape Community"
                className="h-24 w-auto opacity-95"
              />
            </motion.div>

            <div className="text-center mb-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <p className="font-bold mb-2" style={{ fontSize: '20px' }}>
                  <span className="text-white">ยินดีต้อนรับสู่ </span>
                  <span className="text-primary">Q-Collector</span>
                </p>
              </motion.div>
            </div>
          </GlassCardHeader>

          <GlassCardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* API Error Message */}
              {apiError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm"
                >
                  {apiError}
                </motion.div>
              )}

              {/* Username Field */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium mb-2">
                  <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg bg-background/50 border ${
                    errors.username ? 'border-red-500' : 'border-border'
                  } focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all`}
                  placeholder="username"
                  autoComplete="off"
                  disabled={isAuthenticating}
                />
                {errors.username && (
                  <p className="mt-1 text-sm text-red-500">{errors.username}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2">
                  <FontAwesomeIcon icon={faLock} className="mr-2" />
                  รหัสผ่าน
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg bg-background/50 border ${
                    errors.password ? 'border-red-500' : 'border-border'
                  } focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all`}
                  placeholder="••••••••"
                  disabled={isAuthenticating}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-500">{errors.password}</p>
                )}
              </div>

              {/* Forgot Password Link (Future) */}
              <div className="text-right">
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                  onClick={() => setShowInfoModal(true)}
                  disabled={isAuthenticating}
                >
                  ลืมรหัสผ่าน?
                </button>
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                whileHover={{ scale: isAuthenticating ? 1 : 1.02 }}
                whileTap={{ scale: isAuthenticating ? 1 : 0.98 }}
                className="w-full py-3 px-4 bg-primary text-white rounded-3xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                style={{ borderRadius: '1.5rem' }}
                disabled={isAuthenticating}
              >
                {isAuthenticating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    กำลังเข้าสู่ระบบ...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faSignInAlt} className="mr-2" />
                    เข้าสู่ระบบ
                  </>
                )}
              </motion.button>

              {/* Register Link */}
              <div className="text-center mt-6 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  ยังไม่มีบัญชี?{' '}
                  <Link
                    to="/register"
                    className="text-primary hover:underline font-medium"
                  >
                    <FontAwesomeIcon icon={faUserPlus} className="mr-1" />
                    สมัครสมาชิก
                  </Link>
                </p>
              </div>
            </form>
          </GlassCardContent>
        </GlassCard>

        {/* App Info */}
        <div className="text-center mt-6 text-muted-foreground" style={{ fontSize: '10px' }}>
          <p>Q-Collector v0.7.5-dev</p>
          <p className="mt-1">Form Builder & Data Collection System</p>
        </div>

        {/* Info Modal for Forgot Password */}
        <InfoModal
          isOpen={showInfoModal}
          onClose={() => setShowInfoModal(false)}
          title="ฟีเจอร์กำลังพัฒนา"
          message="ฟีเจอร์การรีเซ็ตรหัสผ่านจะเปิดใช้งานในเร็วๆ นี้ กรุณาติดต่อผู้ดูแลระบบหากต้องการเปลี่ยนรหัสผ่าน"
          confirmText="เข้าใจแล้ว"
        />
      </motion.div>
    </div>
  );
}

export default LoginPage;