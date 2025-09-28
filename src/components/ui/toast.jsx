import React, { createContext, useContext, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faInfoCircle,
  faExclamationTriangle,
  faTimesCircle,
  faTimes
} from '@fortawesome/free-solid-svg-icons';

// Toast Context for global state management
const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Toast types และ configurations
const TOAST_TYPES = {
  success: {
    icon: faCheckCircle,
    bgClass: 'bg-green-50 border-green-200',
    iconClass: 'text-green-500',
    textClass: 'text-green-700',
    duration: 4000
  },
  error: {
    icon: faTimesCircle,
    bgClass: 'bg-red-50 border-red-200',
    iconClass: 'text-red-500',
    textClass: 'text-red-700',
    duration: 6000
  },
  warning: {
    icon: faExclamationTriangle,
    bgClass: 'bg-orange-50 border-orange-200',
    iconClass: 'text-orange-500',
    textClass: 'text-orange-700',
    duration: 5000
  },
  info: {
    icon: faInfoCircle,
    bgClass: 'bg-blue-50 border-blue-200',
    iconClass: 'text-blue-500',
    textClass: 'text-blue-700',
    duration: 4000
  }
};

// Toast Component
const Toast = React.forwardRef(({ id, type, message, onClose }, ref) => {
  const config = TOAST_TYPES[type] || TOAST_TYPES.info;

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, config.duration);

    return () => clearTimeout(timer);
  }, [id, onClose, config.duration]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -20, x: 200, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, x: 150, scale: 0.95 }}
      transition={{
        type: "tween",
        ease: [0.25, 0.1, 0.25, 1],
        duration: 0.2
      }}
      role="alert"
      className={`
        flex items-center gap-3 rounded-xl border p-4 shadow-lg backdrop-blur-sm
        min-w-[320px] max-w-[480px] cursor-pointer group hover:shadow-xl
        transition-all duration-200 ${config.bgClass}
      `}
      onClick={() => onClose(id)}
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        <FontAwesomeIcon
          icon={config.icon}
          className={`w-5 h-5 ${config.iconClass}`}
        />
      </div>

      {/* Message */}
      <div className={`flex-1 text-sm font-medium ${config.textClass}`}>
        {message}
      </div>

      {/* Close Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose(id);
        }}
        className={`
          flex-shrink-0 ml-2 p-1 rounded-full transition-all duration-200
          ${config.iconClass} hover:bg-black/5 opacity-70 hover:opacity-100
        `}
      >
        <FontAwesomeIcon icon={faTimes} className="w-3 h-3" />
      </button>
    </motion.div>
  );
});

// Set displayName for debugging purposes
Toast.displayName = 'Toast';

// Toast Container
const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2">
      <AnimatePresence mode="popLayout" initial={false}>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onClose={removeToast}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// Toast Provider
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (type, message) => {
    const id = Date.now() + Math.random();
    const newToast = { id, type, message };

    setToasts((prev) => [...prev, newToast]);
    return id;
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  // Helper functions
  const toast = {
    success: (message) => addToast('success', message),
    error: (message) => addToast('error', message),
    warning: (message) => addToast('warning', message),
    info: (message) => addToast('info', message),
    clear: clearAllToasts
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

export default Toast;