import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faExclamationTriangle,
  faTimesCircle,
  faInfoCircle,
  faQuestionCircle,
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import { GlassButton } from './glass-button';

// Alert Modal Types Configuration
const ALERT_TYPES = {
  success: {
    icon: faCheckCircle,
    iconClass: 'text-green-500',
    iconBgClass: 'bg-green-100',
    titleClass: 'text-green-800',
    defaultTitle: 'สำเร็จ!'
  },
  error: {
    icon: faTimesCircle,
    iconClass: 'text-red-500',
    iconBgClass: 'bg-red-100',
    titleClass: 'text-red-800',
    defaultTitle: 'เกิดข้อผิดพลาด!'
  },
  warning: {
    icon: faExclamationTriangle,
    iconClass: 'text-orange-500',
    iconBgClass: 'bg-orange-100',
    titleClass: 'text-orange-800',
    defaultTitle: 'คำเตือน!'
  },
  info: {
    icon: faInfoCircle,
    iconClass: 'text-blue-500',
    iconBgClass: 'bg-blue-100',
    titleClass: 'text-blue-800',
    defaultTitle: 'ข้อมูล'
  },
  confirm: {
    icon: faQuestionCircle,
    iconClass: 'text-purple-500',
    iconBgClass: 'bg-purple-100',
    titleClass: 'text-purple-800',
    defaultTitle: 'ยืนยันการดำเนินการ'
  }
};

// Main Alert Modal Component
export const AlertModal = ({
  isOpen,
  onClose,
  onConfirm,
  type = 'info',
  title,
  message,
  confirmText = 'ยืนยัน',
  cancelText = 'ยกเลิก',
  showCancel = true,
  confirmButtonVariant = 'primary',
  cancelButtonVariant = 'secondary',
  size = 'md'
}) => {
  const config = ALERT_TYPES[type] || ALERT_TYPES.info;
  const modalTitle = title || config.defaultTitle;

  // Mobile-first responsive sizing
  const sizeClasses = {
    sm: 'max-w-[90vw] sm:max-w-md',
    md: 'max-w-[90vw] sm:max-w-lg',
    lg: 'max-w-[95vw] sm:max-w-xl',
    xl: 'max-w-[95vw] sm:max-w-2xl'
  };

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`
              relative w-full ${sizeClasses[size]}
              bg-background/95 backdrop-blur-md
              border border-border/50
              rounded-2xl shadow-2xl
              overflow-hidden
            `}
          >
            {/* Close Button */}
            <button
              onClick={handleCancel}
              className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-muted/50 transition-colors"
            >
              <FontAwesomeIcon icon={faTimes} className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Content */}
            <div className="p-6 pt-8">
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className={`
                  w-16 h-16 rounded-full flex items-center justify-center
                  ${config.iconBgClass}
                `}>
                  <FontAwesomeIcon
                    icon={config.icon}
                    className={`w-8 h-8 ${config.iconClass}`}
                  />
                </div>
              </div>

              {/* Title */}
              <h3 className={`
                text-xl font-bold text-center mb-3
                ${config.titleClass}
              `}>
                {modalTitle}
              </h3>

              {/* Message */}
              {message && (
                <div className="text-center text-muted-foreground mb-6 leading-relaxed">
                  {typeof message === 'string' ? (
                    <p>{message}</p>
                  ) : (
                    message
                  )}
                </div>
              )}

              {/* Actions */}
              <div className={`
                flex gap-3
                ${showCancel ? 'justify-between' : 'justify-center'}
              `}>
                {showCancel && (
                  <GlassButton
                    variant={cancelButtonVariant}
                    onClick={handleCancel}
                    className="flex-1"
                  >
                    {cancelText}
                  </GlassButton>
                )}

                <GlassButton
                  variant={confirmButtonVariant}
                  onClick={handleConfirm}
                  className={showCancel ? 'flex-1' : 'px-8'}
                >
                  {confirmText}
                </GlassButton>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Pre-configured Alert Variants
export const SuccessModal = ({ isOpen, onClose, title, message, confirmText = 'เรียบร้อย' }) => (
  <AlertModal
    isOpen={isOpen}
    onClose={onClose}
    type="success"
    title={title}
    message={message}
    confirmText={confirmText}
    showCancel={false}
    confirmButtonVariant="success"
  />
);

export const ErrorModal = ({ isOpen, onClose, title, message, confirmText = 'เข้าใจแล้ว' }) => (
  <AlertModal
    isOpen={isOpen}
    onClose={onClose}
    type="error"
    title={title}
    message={message}
    confirmText={confirmText}
    showCancel={false}
    confirmButtonVariant="destructive"
  />
);

export const WarningModal = ({ isOpen, onClose, title, message, confirmText = 'เข้าใจแล้ว' }) => (
  <AlertModal
    isOpen={isOpen}
    onClose={onClose}
    type="warning"
    title={title}
    message={message}
    confirmText={confirmText}
    showCancel={false}
    confirmButtonVariant="secondary"
  />
);

export const InfoModal = ({ isOpen, onClose, title, message, confirmText = 'เข้าใจแล้ว' }) => (
  <AlertModal
    isOpen={isOpen}
    onClose={onClose}
    type="info"
    title={title}
    message={message}
    confirmText={confirmText}
    showCancel={false}
  />
);

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'ยืนยัน',
  cancelText = 'ยกเลิก',
  variant = 'warning' // 'danger' for destructive actions
}) => (
  <AlertModal
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onConfirm}
    type="confirm"
    title={title}
    message={message}
    confirmText={confirmText}
    cancelText={cancelText}
    confirmButtonVariant={variant === 'danger' ? 'destructive' : 'primary'}
  />
);

// Delete Confirmation Modal (commonly used)
export const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType = 'รายการ'
}) => (
  <ConfirmModal
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onConfirm}
    title="ยืนยันการลบ"
    message={
      <div className="space-y-2">
        <p>คุณแน่ใจหรือไม่ที่จะลบ{itemType}นี้?</p>
        {itemName && (
          <p className="font-semibold text-destructive">"{itemName}"</p>
        )}
        <p className="text-sm text-muted-foreground">
          การดำเนินการนี้ไม่สามารถย้อนกลับได้
        </p>
      </div>
    }
    confirmText="ลบ"
    cancelText="ยกเลิก"
    variant="danger"
  />
);

// Hook for managing modal state
export const useModal = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  return {
    isOpen,
    openModal,
    closeModal
  };
};

export default AlertModal;