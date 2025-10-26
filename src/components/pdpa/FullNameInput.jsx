/**
 * FullNameInput Component
 * Text input for collecting full name for PDPA identity verification
 *
 * Features:
 * - Text input with validation
 * - Thai/English placeholder
 * - Required field indicator
 * - Character limit (255)
 * - Real-time validation feedback
 *
 * @version v0.8.2-dev
 * @date 2025-10-23
 */

import React, { useState } from 'react';

const FullNameInput = ({
  value,
  onChange,
  label = 'ชื่อ-นามสกุล (เต็ม)',
  placeholder = 'กรุณากรอกชื่อ-นามสกุล เพื่อยืนยันตัวตน',
  required = false,
  disabled = false,
  maxLength = 255,
  showCharCount = false
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [touched, setTouched] = useState(false);

  /**
   * Handle input change
   */
  const handleChange = (e) => {
    const newValue = e.target.value;
    onChange && onChange(newValue);
  };

  /**
   * Handle input blur
   */
  const handleBlur = () => {
    setIsFocused(false);
    setTouched(true);
  };

  /**
   * Handle input focus
   */
  const handleFocus = () => {
    setIsFocused(true);
  };

  /**
   * Validate input
   */
  const isValid = () => {
    if (!required) return true;
    return value && value.trim().length > 0;
  };

  const showError = touched && !isValid();
  const charCount = value ? value.length : 0;

  return (
    <div className="full-name-input-container">
      {/* Label */}
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Input */}
      <div className="relative">
        <input
          type="text"
          value={value || ''}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          className={`
            w-full px-4 py-3 rounded-lg
            border-2 transition-all duration-200
            bg-white dark:bg-slate-800
            text-slate-900 dark:text-slate-100
            placeholder-slate-400 dark:placeholder-slate-500
            focus:outline-none focus:ring-2
            ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900' : ''}
            ${
              showError
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                : isFocused
                ? 'border-orange-500 focus:border-orange-500 focus:ring-orange-500/30'
                : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
            }
          `}
        />

        {/* Clear Button */}
        {!disabled && value && value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange && onChange('')}
            className="
              absolute right-3 top-1/2 -translate-y-1/2
              p-1 rounded-full
              text-slate-400 hover:text-slate-600 dark:hover:text-slate-300
              hover:bg-slate-100 dark:hover:bg-slate-700
              transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-orange-500
            "
            tabIndex={-1}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Helper Text / Error Message / Character Count */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex-1">
          {showError && (
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              กรุณากรอกชื่อ-นามสกุล
            </p>
          )}

          {!showError && isValid() && value && value.length > 0 && (
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              ยืนยันแล้ว
            </p>
          )}
        </div>

        {/* Character Count */}
        {showCharCount && (
          <p className="text-xs text-slate-500 dark:text-slate-400 ml-2">
            {charCount}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
};

export default FullNameInput;
