/**
 * User Menu Component
 *
 * Features:
 * - User profile display
 * - Role badge
 * - Logout button
 * - Dropdown menu with settings
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { getRoleLabel } from '../../config/roles.config';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faSignOutAlt, faCog, faChevronDown } from '@fortawesome/free-solid-svg-icons';

export function UserMenu({ onSettingsClick }) {
  const { user, logout, userName, userRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      // Router will redirect to login
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
      case 'admin':
        return 'bg-red-500/20 text-red-500 border-red-500/30';
      case 'moderator':
        return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      case 'customer_service':
        return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'sales':
        return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
      case 'marketing':
        return 'bg-pink-500/20 text-pink-500 border-pink-500/30';
      case 'technic':
        return 'bg-cyan-500/20 text-cyan-500 border-cyan-500/30';
      default:
        return 'bg-gray-500/20 text-gray-500 border-gray-500/30';
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* User Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg hover:bg-background/50 transition-colors"
      >
        {/* User Avatar */}
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary">
          <FontAwesomeIcon icon={faUser} className="text-sm" />
        </div>

        {/* User Info (hidden on mobile) */}
        <div className="hidden lg:block text-left">
          <p className="text-sm font-medium text-foreground truncate max-w-[120px]">{userName}</p>
          <p className="text-xs text-muted-foreground truncate max-w-[120px]">{getRoleLabel(userRole)}</p>
        </div>

        {/* Dropdown Icon */}
        <FontAwesomeIcon
          icon={faChevronDown}
          className={`text-xs text-muted-foreground transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[60px] right-2 sm:right-4 w-[200px] sm:w-[220px] glass-container rounded-lg shadow-xl border border-border/40 overflow-hidden z-[100]"
          >
            {/* User Info Section */}
            <div className="p-1.5 border-b border-border/40 bg-gradient-to-br from-primary/5 to-transparent">
              <div className="flex items-start gap-1.5">
                {/* Avatar */}
                <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary border border-primary/30">
                  <FontAwesomeIcon icon={faUser} className="text-[9px]" />
                </div>

                {/* User Details */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-[11px] truncate">{userName}</p>

                  {/* Role Badge */}
                  <div className="mt-0.5">
                    <span
                      className={`inline-block px-1 py-0.5 text-[8px] font-medium rounded border ${getRoleBadgeColor(
                        userRole
                      )}`}
                    >
                      {getRoleLabel(userRole)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-1">
              {/* Settings */}
              {onSettingsClick && (
                <button
                  onClick={() => {
                    onSettingsClick();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-background/50 transition-all duration-200 text-left group"
                >
                  <div className="flex items-center justify-center w-5 h-5 rounded bg-muted/50 group-hover:bg-primary/10 transition-colors">
                    <FontAwesomeIcon icon={faCog} className="text-muted-foreground group-hover:text-primary transition-colors text-[9px]" />
                  </div>
                  <span className="text-[11px] font-medium text-foreground">ตั้งค่า</span>
                </button>
              )}

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-red-500/10 transition-all duration-200 text-left group"
              >
                <div className="flex items-center justify-center w-5 h-5 rounded bg-red-500/10 group-hover:bg-red-500/20 transition-colors">
                  <FontAwesomeIcon icon={faSignOutAlt} className="text-red-500 text-[9px]" />
                </div>
                <span className="text-[11px] font-semibold text-red-500">ออกจากระบบ</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default UserMenu;