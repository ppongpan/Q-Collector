import React, { createContext, useContext, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faExclamationTriangle,
  faExclamationCircle,
  faInfoCircle,
  faTimes
} from '@fortawesome/free-solid-svg-icons';

// Toast Context
const ToastContext = createContext();

export const useEnhancedToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useEnhancedToast must be used within a ToastProvider');
  }
  return context;
};

// Toast Provider Component
export const EnhancedToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [recentToasts, setRecentToasts] = useState(new Map()); // Track recent toasts for debouncing

  const addToast = (message, type = 'info', options = {}) => {
    const toastKey = `${type}_${message}_${options.title || ''}`;

    // Check for duplicate toast with same message, type, and title - ปิดกล่องเดิมทันที
    const existingToast = toasts.find(existingToast =>
      existingToast.message === message &&
      existingToast.type === type &&
      existingToast.title === options.title
    );

    if (existingToast) {
      console.log('Duplicate toast found - closing old one:', { message, type, title: options.title });
      removeToast(existingToast.id); // ปิดกล่องเดิมทันที
    }

    // Update recent toasts map
    const now = Date.now();
    setRecentToasts(prev => {
      const updated = new Map(prev);
      updated.set(toastKey, now);

      // Clean up old entries (older than 5 seconds)
      for (const [key, timestamp] of updated.entries()) {
        if (now - timestamp > 5000) {
          updated.delete(key);
        }
      }

      return updated;
    });

    const id = Date.now() + Math.random();
    const duration = options.duration || (type === 'error' ? 5000 : 3000); // ลดเวลาลง: error 5s, อื่นๆ 3s

    const toast = {
      id,
      message,
      type,
      duration,
      title: options.title,
      action: options.action,
      dismissible: options.dismissible !== false,
      persistent: options.persistent || false
    };

    setToasts(prev => [...prev, toast]);

    // Auto remove after duration (unless persistent)
    if (!toast.persistent) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const removeAllToasts = () => {
    setToasts([]);
  };

  // Convenience methods
  const toast = {
    success: (message, options) => addToast(message, 'success', options),
    error: (message, options) => addToast(message, 'error', options),
    warning: (message, options) => addToast(message, 'warning', options),
    info: (message, options) => addToast(message, 'info', options),
    loading: (message, options) => addToast(message, 'loading', { ...options, persistent: true }),
    dismiss: removeToast,
    dismissAll: removeAllToasts
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
};

// Enhanced Toast Component
const EnhancedToast = ({ toast, onDismiss }) => {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return faCheckCircle;
      case 'warning':
        return faExclamationTriangle;
      case 'error':
        return faExclamationCircle;
      case 'loading':
        return faInfoCircle;
      default:
        return faInfoCircle;
    }
  };

  const getVariantStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          container: 'border-l-green-500 bg-green-50/95 dark:bg-green-950/80 text-green-900 dark:text-green-100',
          icon: 'text-green-600 dark:text-green-400',
          title: 'text-green-900 dark:text-green-100',
          message: 'text-green-700 dark:text-green-300'
        };
      case 'warning':
        return {
          container: 'border-l-yellow-500 bg-yellow-50/95 dark:bg-yellow-950/80 text-yellow-900 dark:text-yellow-100',
          icon: 'text-yellow-600 dark:text-yellow-400',
          title: 'text-yellow-900 dark:text-yellow-100',
          message: 'text-yellow-700 dark:text-yellow-300'
        };
      case 'error':
        return {
          container: 'border-l-red-500 bg-red-50/95 dark:bg-red-950/80 text-red-900 dark:text-red-100',
          icon: 'text-red-600 dark:text-red-400',
          title: 'text-red-900 dark:text-red-100',
          message: 'text-red-700 dark:text-red-300'
        };
      case 'loading':
        return {
          container: 'border-l-blue-500 bg-blue-50/95 dark:bg-blue-950/80 text-blue-900 dark:text-blue-100',
          icon: 'text-blue-600 dark:text-blue-400 animate-pulse-scale',
          title: 'text-blue-900 dark:text-blue-100',
          message: 'text-blue-700 dark:text-blue-300'
        };
      default:
        return {
          container: 'border-l-gray-500 bg-gray-50/95 dark:bg-gray-950/80 text-gray-900 dark:text-gray-100',
          icon: 'text-gray-600 dark:text-gray-400',
          title: 'text-gray-900 dark:text-gray-100',
          message: 'text-gray-700 dark:text-gray-300'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      transition={{
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1]
      }}
      className={cn(
        // Base styles with glass morphism
        "relative w-full max-w-md rounded-xl border-l-4 shadow-xl backdrop-blur-md",
        "transition-all duration-300 ease-out",
        "hover:shadow-2xl hover:scale-[1.02]",
        styles.container
      )}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className={cn("flex-shrink-0 mt-0.5", styles.icon)}>
          <FontAwesomeIcon icon={getIcon()} className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {toast.title && (
            <div className={cn("font-semibold text-sm mb-1", styles.title)}>
              {toast.title}
            </div>
          )}
          <div className={cn("text-sm leading-relaxed", styles.message)}>
            {toast.message}
          </div>

          {/* Action Button */}
          {toast.action && (
            <div className="mt-3">
              <button
                onClick={toast.action.onClick}
                className={cn(
                  "text-xs font-medium px-3 py-1 rounded-md transition-colors",
                  "hover:bg-black/10 dark:hover:bg-white/10",
                  "focus:outline-none focus:ring-2 focus:ring-offset-2",
                  toast.type === 'success' && "focus:ring-green-500",
                  toast.type === 'warning' && "focus:ring-yellow-500",
                  toast.type === 'error' && "focus:ring-red-500",
                  "focus:ring-blue-500"
                )}
              >
                {toast.action.label}
              </button>
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        {toast.dismissible && (
          <button
            onClick={() => onDismiss(toast.id)}
            className={cn(
              "flex-shrink-0 p-1 rounded-md transition-colors duration-200",
              "hover:bg-black/10 dark:hover:bg-white/10",
              "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent"
            )}
            aria-label="ปิดการแจ้งเตือน"
          >
            <FontAwesomeIcon
              icon={faTimes}
              className="w-3 h-3 opacity-60 hover:opacity-100 transition-opacity"
            />
          </button>
        )}
      </div>

      {/* Progress Bar for non-persistent toasts */}
      {!toast.persistent && (
        <motion.div
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: toast.duration / 1000, ease: "linear" }}
          className={cn(
            "absolute bottom-0 left-0 h-1 rounded-bl-xl",
            toast.type === 'success' && "bg-green-500",
            toast.type === 'warning' && "bg-yellow-500",
            toast.type === 'error' && "bg-red-500",
            toast.type === 'loading' && "bg-blue-500",
            "bg-gray-500"
          )}
        />
      )}
    </motion.div>
  );
};

// Toast Container Component with Portal for maximum z-index
// Floating overlay that stays at top-right corner, above everything
// Fixed positioning to ensure visibility from any scroll position
const ToastContainer = ({ toasts, onDismiss }) => {
  const [portalElement, setPortalElement] = useState(null);

  useEffect(() => {
    // Create portal element for toasts
    const element = document.createElement('div');
    element.id = 'toast-portal';
    element.style.cssText = `
      position: fixed !important;
      top: 24px !important;
      right: 24px !important;
      z-index: 2147483646 !important;
      pointer-events: none !important;
      max-width: 384px !important;
    `;
    document.body.appendChild(element);
    setPortalElement(element);

    return () => {
      if (document.body.contains(element)) {
        document.body.removeChild(element);
      }
    };
  }, []);

  if (!portalElement) return null;

  return createPortal(
    <div className="space-y-3 pointer-events-none">
      <AnimatePresence mode="sync" initial={false}>
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <EnhancedToast toast={toast} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>,
    portalElement
  );
};

export default EnhancedToastProvider;