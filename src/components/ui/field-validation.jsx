import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faExclamationTriangle,
  faTimesCircle,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';

// Field Error Message Component
export const FieldError = ({ message, show = true }) => {
  if (!message || !show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -10, height: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-2 mt-1 px-1"
        role="alert"
        aria-live="polite"
      >
        <FontAwesomeIcon
          icon={faTimesCircle}
          className="w-3 h-3 text-red-500 flex-shrink-0"
        />
        <span className="text-xs text-red-600 font-medium">
          {message}
        </span>
      </motion.div>
    </AnimatePresence>
  );
};

// Field Success Message Component
export const FieldSuccess = ({ message, show = true }) => {
  if (!message || !show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -10, height: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-2 mt-1 px-1"
        role="status"
        aria-live="polite"
      >
        <FontAwesomeIcon
          icon={faCheckCircle}
          className="w-3 h-3 text-green-500 flex-shrink-0"
        />
        <span className="text-xs text-green-600 font-medium">
          {message}
        </span>
      </motion.div>
    </AnimatePresence>
  );
};

// Field Warning Message Component
export const FieldWarning = ({ message, show = true }) => {
  if (!message || !show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -10, height: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-2 mt-1 px-1"
        role="alert"
        aria-live="polite"
      >
        <FontAwesomeIcon
          icon={faExclamationTriangle}
          className="w-3 h-3 text-orange-500 flex-shrink-0"
        />
        <span className="text-xs text-orange-600 font-medium">
          {message}
        </span>
      </motion.div>
    </AnimatePresence>
  );
};

// Field Info Message Component
export const FieldInfo = ({ message, show = true }) => {
  if (!message || !show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -10, height: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-2 mt-1 px-1"
        role="status"
        aria-live="polite"
      >
        <FontAwesomeIcon
          icon={faInfoCircle}
          className="w-3 h-3 text-blue-500 flex-shrink-0"
        />
        <span className="text-xs text-blue-600 font-medium">
          {message}
        </span>
      </motion.div>
    </AnimatePresence>
  );
};

// Generic Field Validation Component
export const FieldValidation = ({ type, message, show = true }) => {
  const components = {
    error: FieldError,
    success: FieldSuccess,
    warning: FieldWarning,
    info: FieldInfo
  };

  const Component = components[type] || FieldError;
  return <Component message={message} show={show} />;
};

// Enhanced Glass Input with validation
export const ValidatedGlassInput = ({
  label,
  error,
  success,
  warning,
  info,
  required,
  hasValidationError = false,
  className = '',
  ...props
}) => {
  const hasError = error && error.trim();
  const hasSuccess = success && success.trim();
  const hasWarning = warning && warning.trim();
  const hasInfo = info && info.trim();

  const getBorderClass = () => {
    if (hasError) return 'border-red-300 focus:border-red-500 focus:ring-red-500/20';
    if (hasSuccess) return 'border-green-300 focus:border-green-500 focus:ring-green-500/20';
    if (hasWarning) return 'border-orange-300 focus:border-orange-500 focus:ring-orange-500/20';
    return 'border-border/30 focus:border-primary focus:ring-primary/20';
  };

  return (
    <div className="space-y-1 group">
      {label && (
        <label className="block text-sm font-medium text-foreground/80 transition-all duration-300 group-hover:text-primary group-focus-within:text-primary group-hover:font-medium group-focus-within:font-semibold">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}

      <input
        {...props}
        className={`
          w-full px-4 py-3 rounded-lg
          bg-background/60 backdrop-blur-sm
          border transition-all duration-200
          text-foreground placeholder:text-muted-foreground
          focus:outline-none focus:ring-2
          hover-orange-neon focus-orange-neon
          ${getBorderClass()}
          ${hasValidationError ? 'red-neon-focus' : ''}
          ${className}
        `}
      />

      {/* Validation Messages */}
      <div className="min-h-[20px]">
        <FieldError message={error} show={hasError} />
        <FieldSuccess message={success} show={hasSuccess && !hasError} />
        <FieldWarning message={warning} show={hasWarning && !hasError && !hasSuccess} />
        <FieldInfo message={info} show={hasInfo && !hasError && !hasSuccess && !hasWarning} />
      </div>
    </div>
  );
};

// Form Validation Hook
export const useFormValidation = (validationRules = {}) => {
  const [errors, setErrors] = React.useState({});
  const [touched, setTouched] = React.useState({});

  const validateField = (fieldName, value) => {
    const rules = validationRules[fieldName];
    if (!rules) return '';

    for (const rule of rules) {
      const error = rule(value);
      if (error) return error;
    }
    return '';
  };

  const validateForm = (formData) => {
    const newErrors = {};
    Object.keys(validationRules).forEach(fieldName => {
      const error = validateField(fieldName, formData[fieldName]);
      if (error) newErrors[fieldName] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const setFieldTouched = (fieldName) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
  };

  const setFieldError = (fieldName, error) => {
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  };

  const clearFieldError = (fieldName) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  const getFieldError = (fieldName) => {
    return touched[fieldName] ? errors[fieldName] : '';
  };

  return {
    errors,
    touched,
    validateField,
    validateForm,
    setFieldTouched,
    setFieldError,
    clearFieldError,
    getFieldError,
    hasErrors: Object.keys(errors).length > 0
  };
};

// Common validation rules
export const validationRules = {
  required: (message = 'ฟิลด์นี้จำเป็นต้องกรอก') => (value) => {
    if (!value || value.toString().trim() === '') return message;
    return '';
  },

  email: (message = 'รูปแบบอีเมลไม่ถูกต้อง') => (value) => {
    if (!value) return '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? '' : message;
  },

  phone: (message = 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง') => (value) => {
    if (!value) return '';
    const phoneRegex = /^[0-9\-\+\(\)\s]+$/;
    return phoneRegex.test(value) ? '' : message;
  },

  minLength: (min, message = `ต้องมีอย่างน้อย ${min} ตัวอักษร`) => (value) => {
    if (!value) return '';
    return value.length >= min ? '' : message;
  },

  maxLength: (max, message = `ต้องไม่เกิน ${max} ตัวอักษร`) => (value) => {
    if (!value) return '';
    return value.length <= max ? '' : message;
  },

  url: (message = 'รูปแบบ URL ไม่ถูกต้อง') => (value) => {
    if (!value) return '';
    try {
      new URL(value);
      return '';
    } catch {
      return message;
    }
  }
};

export default FieldValidation;