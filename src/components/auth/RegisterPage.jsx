/**
 * Register Page Component
 *
 * Features:
 * - User registration form
 * - Department selection (Customer Service, Technic, Sales, Marketing, Others)
 * - Automatic role mapping based on department
 * - Form validation
 * - Password strength indicator
 * - Loading states
 * - Error messages
 * - Link to login
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { DEPARTMENTS, mapDepartmentToRole } from '../../config/roles.config';
import { GlassCard, GlassCardContent, GlassCardHeader } from '../ui/glass-card';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faEnvelope, faLock, faBriefcase, faUserPlus, faSignInAlt } from '@fortawesome/free-solid-svg-icons';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, isAuthenticating } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    confirmPassword: '',
    department: 'others' // Default department
  });

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Calculate password strength
  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 6) strength += 1;
    if (password.length >= 10) strength += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1;
    if (/\d/.test(password)) strength += 1;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 1;
    return strength;
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Calculate password strength
    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }

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
      newErrors.username = 'กรุณากรอกชื่อผู้ใช้';
    } else if (formData.username.trim().length < 3) {
      newErrors.username = 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร';
    } else if (!/^[a-zA-Z0-9]+$/.test(formData.username)) {
      newErrors.username = 'ชื่อผู้ใช้ต้องเป็นตัวอักษรและตัวเลขเท่านั้น';
    }

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'กรุณากรอกชื่อ-นามสกุล';
    } else if (formData.full_name.trim().length < 2) {
      newErrors.full_name = 'ชื่อ-นามสกุลต้องมีอย่างน้อย 2 ตัวอักษร';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'กรุณากรอกอีเมล';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    }

    if (!formData.password) {
      newErrors.password = 'กรุณากรอกรหัสผ่าน';
    } else if (formData.password.length < 6) {
      newErrors.password = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'กรุณายืนยันรหัสผ่าน';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'รหัสผ่านไม่ตรงกัน';
    }

    if (!formData.department) {
      newErrors.department = 'กรุณาเลือกแผนก';
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
      // Map department to role
      const role = mapDepartmentToRole(formData.department);

      await register({
        username: formData.username.trim(),
        email: formData.email.trim(),
        full_name: formData.full_name.trim(),
        password: formData.password,
        role: role
      });
      navigate('/'); // Redirect to home after successful registration
    } catch (error) {
      setApiError(error.message || 'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
  };

  // Password strength color
  const getStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-red-500';
    if (passwordStrength <= 2) return 'bg-orange-500';
    if (passwordStrength <= 3) return 'bg-yellow-500';
    if (passwordStrength <= 4) return 'bg-green-500';
    return 'bg-emerald-500';
  };

  const getStrengthText = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength <= 1) return 'อ่อนมาก';
    if (passwordStrength <= 2) return 'อ่อน';
    if (passwordStrength <= 3) return 'ปานกลาง';
    if (passwordStrength <= 4) return 'แข็งแรง';
    return 'แข็งแรงมาก';
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
                <FontAwesomeIcon icon={faUserPlus} className="text-3xl text-primary" />
              </motion.div>
              <h1 className="text-2xl font-bold">สมัครสมาชิก</h1>
              <p className="text-sm text-muted-foreground mt-2">
                สร้างบัญชีใหม่ของคุณ
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
                  <FontAwesomeIcon icon={faUser} className="mr-2" />
                  ชื่อผู้ใช้
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
                  placeholder="username123"
                  disabled={isAuthenticating}
                />
                {errors.username && (
                  <p className="mt-1 text-sm text-red-500">{errors.username}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  ภาษาอังกฤษและตัวเลขเท่านั้น ไม่มีช่องว่าง
                </p>
              </div>

              {/* Full Name Field */}
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium mb-2">
                  <FontAwesomeIcon icon={faUser} className="mr-2" />
                  ชื่อ-นามสกุล
                </label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg bg-background/50 border ${
                    errors.full_name ? 'border-red-500' : 'border-border'
                  } focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all`}
                  placeholder="ชื่อ นามสกุล"
                  disabled={isAuthenticating}
                />
                {errors.full_name && (
                  <p className="mt-1 text-sm text-red-500">{errors.full_name}</p>
                )}
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
                  อีเมล
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg bg-background/50 border ${
                    errors.email ? 'border-red-500' : 'border-border'
                  } focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all`}
                  placeholder="example@email.com"
                  disabled={isAuthenticating}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              {/* Department Selection */}
              <div>
                <label htmlFor="department" className="block text-sm font-medium mb-2">
                  <FontAwesomeIcon icon={faBriefcase} className="mr-2" />
                  แผนก
                </label>
                <select
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg bg-background text-foreground border ${
                    errors.department ? 'border-red-500' : 'border-border'
                  } focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all`}
                  disabled={isAuthenticating}
                >
                  {DEPARTMENTS.map(dept => (
                    <option key={dept.value} value={dept.value} className="bg-background text-foreground">
                      {dept.label}
                    </option>
                  ))}
                </select>
                {errors.department && (
                  <p className="mt-1 text-sm text-red-500">{errors.department}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  เลือกแผนกที่คุณสังกัด
                </p>
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

                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-all ${
                            level <= passwordStrength ? getStrengthColor() : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    {passwordStrength > 0 && (
                      <p className="text-xs mt-1 text-muted-foreground">
                        ความแข็งแรง: {getStrengthText()}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                  <FontAwesomeIcon icon={faLock} className="mr-2" />
                  ยืนยันรหัสผ่าน
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg bg-background/50 border ${
                    errors.confirmPassword ? 'border-red-500' : 'border-border'
                  } focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all`}
                  placeholder="••••••••"
                  disabled={isAuthenticating}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
                )}
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
                    กำลังสมัครสมาชิก...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faUserPlus} className="mr-2" />
                    สมัครสมาชิก
                  </>
                )}
              </motion.button>

              {/* Login Link */}
              <div className="text-center mt-6 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  มีบัญชีอยู่แล้ว?{' '}
                  <Link
                    to="/login"
                    className="text-primary hover:underline font-medium"
                  >
                    <FontAwesomeIcon icon={faSignInAlt} className="mr-1" />
                    เข้าสู่ระบบ
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

export default RegisterPage;