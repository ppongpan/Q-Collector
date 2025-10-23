/**
 * Masked Value Component
 *
 * Displays sensitive data (phone, email) with privacy masking
 * and interactive reveal/action features.
 *
 * Features:
 * - Default: Shows masked value
 * - Single click: Reveals full value temporarily (3 seconds)
 * - Double click: Opens tel: or mailto: link
 * - Visual feedback with icons and transitions
 */

import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash, faPhone, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { maskValue, detectSensitiveFieldType } from '../../utils/dataMasking';

export function MaskedValue({ value, fieldTitle, fieldType, className = '' }) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const timeoutRef = useRef(null);
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef(null);

  // Detect field type
  const sensitiveType = detectSensitiveFieldType(fieldTitle, fieldType);

  // Get masked value
  const maskedValue = maskValue(value, fieldTitle, fieldType);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  // Handle click (single = reveal, double = action)
  const handleClick = () => {
    clickCountRef.current += 1;

    // Clear existing click timer
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    // Wait for potential second click
    clickTimerRef.current = setTimeout(() => {
      if (clickCountRef.current === 1) {
        // Single click: Reveal value temporarily
        handleReveal();
      } else if (clickCountRef.current >= 2) {
        // Double click: Perform action (call or email)
        handleAction();
      }
      clickCountRef.current = 0;
    }, 300); // 300ms window for double click
  };

  // Reveal value temporarily
  const handleReveal = () => {
    setIsRevealed(true);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Hide after 3 seconds
    timeoutRef.current = setTimeout(() => {
      setIsRevealed(false);
    }, 3000);
  };

  // Perform action (call or email)
  const handleAction = () => {
    if (sensitiveType === 'phone') {
      // Remove all non-digit characters for tel: link
      const cleanPhone = value.replace(/\D/g, '');
      window.location.href = `tel:${cleanPhone}`;
    } else if (sensitiveType === 'email') {
      window.location.href = `mailto:${value}`;
    }
  };

  // Get icon based on type
  const getIcon = () => {
    if (isRevealed) return faEyeSlash;
    if (sensitiveType === 'phone') return faPhone;
    if (sensitiveType === 'email') return faEnvelope;
    return faEye;
  };

  // Get tooltip text
  const getTooltipText = () => {
    if (sensitiveType === 'phone') {
      return 'คลิก 1 ครั้ง: ดูเบอร์เต็ม | คลิก 2 ครั้ง: โทรออก';
    } else if (sensitiveType === 'email') {
      return 'คลิก 1 ครั้ง: ดูอีเมลเต็ม | คลิก 2 ครั้ง: ส่งอีเมล';
    }
    return 'คลิกเพื่อดูข้อมูลเต็ม';
  };

  // If not a sensitive field, just display the value
  if (!sensitiveType) {
    return <span className={className}>{value}</span>;
  }

  return (
    <div
      className="relative inline-flex items-center gap-2 group"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Masked/Revealed Value */}
      <span
        onClick={handleClick}
        className={`cursor-pointer select-none transition-all duration-200 ${
          isRevealed
            ? 'text-foreground font-semibold'
            : 'text-muted-foreground hover:text-foreground'
        } ${className}`}
      >
        {isRevealed ? value : maskedValue}
      </span>

      {/* Icon */}
      <button
        onClick={handleClick}
        className={`w-6 h-6 flex items-center justify-center rounded-md transition-all duration-200 ${
          isRevealed
            ? 'bg-primary/20 text-primary'
            : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
        aria-label={isRevealed ? 'Hide' : 'Reveal'}
      >
        <FontAwesomeIcon icon={getIcon()} className="text-xs" />
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute top-full left-0 mt-1 z-50 px-2 py-1 rounded-lg bg-card border border-border/40 shadow-lg whitespace-nowrap text-xs text-foreground animate-in fade-in slide-in-from-top-1 duration-200">
          {getTooltipText()}
        </div>
      )}
    </div>
  );
}

export default MaskedValue;
