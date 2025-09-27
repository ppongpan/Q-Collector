import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const GlassTooltip = ({
  content,
  children,
  position = 'top',
  delay = 300,
  className = '',
  disabled = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const timeoutRef = useRef(null);
  const tooltipRef = useRef(null);
  const triggerRef = useRef(null);

  const calculateTooltipPosition = () => {
    if (!triggerRef.current) return {};

    const rect = triggerRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // Approximate tooltip dimensions (will be refined when tooltip renders)
    const tooltipWidth = 200; // Max width approximation
    const tooltipHeight = 32; // Approximate height
    const offset = 8;

    let top = 0;
    let left = 0;
    let newPosition = position;

    // Calculate initial position
    switch (position) {
      case 'top':
        top = rect.top - tooltipHeight - offset;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        if (top < 0) newPosition = 'bottom';
        break;
      case 'bottom':
        top = rect.bottom + offset;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        if (top + tooltipHeight > viewport.height) newPosition = 'top';
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - offset;
        if (left < 0) newPosition = 'right';
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + offset;
        if (left + tooltipWidth > viewport.width) newPosition = 'left';
        break;
      default:
        // Default to top positioning
        top = rect.top - tooltipHeight - offset;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
    }

    // Recalculate if position was adjusted
    if (newPosition !== position) {
      switch (newPosition) {
        case 'top':
          top = rect.top - tooltipHeight - offset;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case 'bottom':
          top = rect.bottom + offset;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.left - tooltipWidth - offset;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.right + offset;
          break;
        default:
          // Default to top positioning if something goes wrong
          top = rect.top - tooltipHeight - offset;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
      }
    }

    // Keep tooltip within viewport
    left = Math.max(8, Math.min(left, viewport.width - tooltipWidth - 8));
    top = Math.max(8, Math.min(top, viewport.height - tooltipHeight - 8));
    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      zIndex: 9999,
    };
  };

  const showTooltip = () => {
    if (disabled) return;

    timeoutRef.current = setTimeout(() => {
      const style = calculateTooltipPosition();
      setTooltipStyle(style);
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getTooltipClasses = () => {
    const baseClasses = `
      tooltip-glass px-4 py-3 text-sm font-medium rounded-xl pointer-events-none
      transition-all duration-200 ease-out max-w-xs
      ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
      ${className}
    `;

    return baseClasses;
  };

  const tooltipElement = content && isVisible && (
    <div
      ref={tooltipRef}
      className={getTooltipClasses()}
      style={tooltipStyle}
      role="tooltip"
      aria-hidden={!isVisible}
    >
      {content}
    </div>
  );

  return (
    <>
      <div
        className="relative inline-block"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        ref={triggerRef}
        aria-describedby={content ? "tooltip" : undefined}
      >
        {children}
      </div>
      {tooltipElement && createPortal(tooltipElement, document.body)}
    </>
  );
};

export default GlassTooltip;