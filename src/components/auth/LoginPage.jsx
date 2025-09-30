/**
 * Login Page Component
 *
 * Features:
 * - Email/password login form
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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faLock, faSignInAlt, faUserPlus } from '@fortawesome/free-solid-svg-icons';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticating, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');

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
      const response = await login(formData.username, formData.password);
      // Navigation is handled by AppRouter based on isAuthenticated state
      // The AuthContext will update and trigger the redirect
      if (response && response.user) {
        navigate('/', { replace: true });
      }
    } catch (error) {
      setApiError(error.message || 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
  };

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
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4"
              >
                <FontAwesomeIcon icon={faSignInAlt} className="text-3xl text-primary" />
              </motion.div>
              <h1 className="text-2xl font-bold">เข้าสู่ระบบ</h1>
              <p className="text-sm text-muted-foreground mt-2">
                ยินดีต้อนรับกลับสู่ Q-Collector
              </p>
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
                  onClick={() => alert('ฟีเจอร์นี้จะเปิดใช้งานในเร็วๆ นี้')}
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
                className="w-full py-3 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>Q-Collector v0.5.0</p>
          <p className="mt-1">Form Builder & Data Collection System</p>
        </div>
      </motion.div>
    </div>
  );
}

export default LoginPage;