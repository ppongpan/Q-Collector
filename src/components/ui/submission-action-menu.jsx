import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEdit, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { cn } from '../../lib/utils';

const SubmissionActionMenu = ({
  isOpen,
  onClose,
  position,
  onView,
  onEdit,
  onDelete,
  className
}) => {
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  // Handle click outside to close and keyboard navigation
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleKeyDown = (event) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
        case 'ArrowDown':
          event.preventDefault();
          focusNextMenuItem();
          break;
        case 'ArrowUp':
          event.preventDefault();
          focusPreviousMenuItem();
          break;
        case 'Home':
          event.preventDefault();
          focusFirstMenuItem();
          break;
        case 'End':
          event.preventDefault();
          focusLastMenuItem();
          break;
        default:
          // No special handling for other keys
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Keyboard navigation helpers
  const focusNextMenuItem = () => {
    const buttons = menuRef.current?.querySelectorAll('button');
    const currentIndex = Array.from(buttons || []).findIndex(btn => btn === document.activeElement);
    const nextIndex = currentIndex < buttons.length - 1 ? currentIndex + 1 : 0;
    buttons?.[nextIndex]?.focus();
  };

  const focusPreviousMenuItem = () => {
    const buttons = menuRef.current?.querySelectorAll('button');
    const currentIndex = Array.from(buttons || []).findIndex(btn => btn === document.activeElement);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1;
    buttons?.[prevIndex]?.focus();
  };

  const focusFirstMenuItem = () => {
    const buttons = menuRef.current?.querySelectorAll('button');
    buttons?.[0]?.focus();
  };

  const focusLastMenuItem = () => {
    const buttons = menuRef.current?.querySelectorAll('button');
    buttons?.[buttons.length - 1]?.focus();
  };

  // Calculate position to ensure menu stays within viewport
  useEffect(() => {
    if (isOpen && position) {
      const menuWidth = 200;
      const menuHeight = 140;
      const padding = 16;

      let x = position.x;
      let y = position.y;

      // Adjust horizontal position
      if (x + menuWidth > window.innerWidth - padding) {
        x = window.innerWidth - menuWidth - padding;
      }
      if (x < padding) {
        x = padding;
      }

      // Adjust vertical position
      if (y + menuHeight > window.innerHeight - padding) {
        y = y - menuHeight - 10; // Show above cursor
      }
      if (y < padding) {
        y = padding;
      }

      setMenuPosition({ x, y });
    }
  }, [isOpen, position]);

  const handleAction = (action, callback) => {
    if (callback) {
      callback();
    }
    onClose();
  };

  const menuItems = [
    {
      icon: faEye,
      label: 'ดู',
      action: 'view',
      callback: onView,
      className: 'hover:bg-orange-500/10 hover:text-orange-400 focus:bg-orange-500/10 focus:text-orange-400'
    },
    {
      icon: faEdit,
      label: 'แก้ไข',
      action: 'edit',
      callback: onEdit,
      className: 'hover:bg-orange-500/10 hover:text-orange-400 focus:bg-orange-500/10 focus:text-orange-400'
    },
    {
      icon: faTrashAlt,
      label: 'ลบ',
      action: 'delete',
      callback: onDelete,
      className: 'hover:bg-red-500/10 hover:text-red-400 focus:bg-red-500/10 focus:text-red-400'
    }
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998]"
            style={{ pointerEvents: 'none' }}
          />

          {/* Menu */}
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25,
              duration: 0.2
            }}
            className={cn(
              'fixed z-[9999] min-w-[180px]',
              'glass-card backdrop-blur-xl border border-border/30',
              'rounded-2xl shadow-2xl',
              'overflow-hidden',
              className
            )}
            role="menu"
            aria-label="การจัดการข้อมูล"
            style={{
              left: menuPosition.x,
              top: menuPosition.y,
              background: 'rgba(var(--card), 0.8)',
              boxShadow: `
                0 0 20px rgba(249, 115, 22, 0.15),
                0 20px 40px rgba(0, 0, 0, 0.3),
                inset 0 1px 0 0 rgba(255, 255, 255, 0.1)
              `
            }}
          >
            <div className="py-2">
              {menuItems.map((item, index) => (
                <motion.button
                  key={item.action}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleAction(item.action, item.callback)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3',
                    'text-left text-sm font-medium',
                    'transition-all duration-200 ease-out',
                    'focus:outline-none',
                    'first:rounded-t-xl last:rounded-b-xl',
                    'relative overflow-hidden',
                    item.className
                  )}
                  role="menuitem"
                  aria-label={`${item.label} ข้อมูลนี้`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleAction(item.action, item.callback);
                    }
                  }}
                >
                  {/* Hover effect overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-current to-transparent opacity-0 translate-x-[-100%] hover:opacity-5 hover:translate-x-[100%] transition-all duration-500" />

                  <FontAwesomeIcon
                    icon={item.icon}
                    className="w-4 h-4 flex-shrink-0"
                  />
                  <span className="flex-1">{item.label}</span>
                </motion.button>
              ))}
            </div>

            {/* Bottom accent line */}
            <div className="h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Hook for managing menu state and position
export const useSubmissionActionMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const openMenu = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const rect = event.currentTarget.getBoundingClientRect();
    setPosition({
      x: event.clientX || rect.right,
      y: event.clientY || rect.bottom
    });
    setIsOpen(true);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    position,
    openMenu,
    closeMenu
  };
};

export default SubmissionActionMenu;