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
  const { user, logout, userName, userRole, userEmail } = useAuth();
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

  // Import from central config for consistency
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-500/20 text-red-500 border-red-500/30'; // RED: Form Settings
      case 'admin':
        return 'bg-pink-500/20 text-pink-500 border-pink-500/30'; // PINK: Form Settings
      case 'moderator':
        return 'bg-purple-500/20 text-purple-500 border-purple-500/30'; // PURPLE: Form Settings
      case 'customer_service':
        return 'bg-blue-500/20 text-blue-500 border-blue-500/30'; // BLUE: Form Settings
      case 'sales':
        return 'bg-green-500/20 text-green-500 border-green-500/30'; // GREEN: Form Settings
      case 'marketing':
        return 'bg-orange-500/20 text-orange-500 border-orange-500/30'; // ORANGE: Form Settings
      case 'technic':
        return 'bg-cyan-500/20 text-cyan-500 border-cyan-500/30'; // CYAN: Form Settings
      default:
        return 'bg-gray-500/20 text-gray-500 border-gray-500/30'; // GRAY: Form Settings
    }
  };

  const getRoleTextColor = (role) => {
    switch (role) {
      case 'super_admin':
        return 'text-red-500'; // RED: Form Settings
      case 'admin':
        return 'text-pink-500'; // PINK: Form Settings
      case 'moderator':
        return 'text-purple-500'; // PURPLE: Form Settings
      case 'customer_service':
        return 'text-blue-500'; // BLUE: Form Settings
      case 'sales':
        return 'text-green-500'; // GREEN: Form Settings
      case 'marketing':
        return 'text-orange-500'; // ORANGE: Form Settings
      case 'technic':
        return 'text-cyan-500'; // CYAN: Form Settings
      default:
        return 'text-gray-500'; // GRAY: Form Settings
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* User Button */}
      <button
        data-testid="user-menu-button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-all duration-200 group"
      >
        {/* User Avatar */}
        <div className="relative flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 group-hover:border-primary/40 transition-all duration-200">
          <FontAwesomeIcon icon={faUser} className="text-sm text-primary" />
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-background"></div>
        </div>

        {/* User Info (hidden on mobile) */}
        <div className="hidden lg:block text-left">
          <p data-testid="user-menu-username" className={`text-sm font-semibold truncate max-w-[150px] ${getRoleTextColor(userRole)}`}>{userName}</p>
        </div>

        {/* Dropdown Icon */}
        <FontAwesomeIcon
          icon={faChevronDown}
          className={`text-xs text-muted-foreground transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="fixed top-[60px] right-2 sm:right-4 w-[200px] sm:w-[220px] rounded-2xl shadow-2xl border border-border/40 overflow-hidden z-[100] bg-card"
          >
            {/* User Info Section */}
            <div className="p-2.5 border-b border-border/30 bg-gradient-to-br from-primary/5 to-transparent">
              <div className="flex flex-col items-center text-center">
                {/* Username with Role Color and Icon */}
                <div className="flex items-center gap-1.5">
                  <p className={`font-bold text-sm sm:text-base truncate ${getRoleTextColor(userRole)}`}>{userName}</p>
                  <FontAwesomeIcon icon={faUser} className={`text-[10px] sm:text-xs ${getRoleTextColor(userRole)}`} />
                </div>
                {/* Email */}
                <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate max-w-full mt-0.5">{userEmail}</p>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-1.5 sm:p-2">
              {/* Settings */}
              {onSettingsClick && (
                <button
                  onClick={() => {
                    onSettingsClick();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl hover:bg-primary/10 transition-all duration-200 text-left group"
                >
                  <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-muted/80 to-muted/40 group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-200">
                    <FontAwesomeIcon icon={faCog} className="text-muted-foreground group-hover:text-primary transition-colors text-xs sm:text-sm" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-foreground group-hover:text-primary transition-colors">ตั้งค่า</span>
                </button>
              )}

              {/* Logout */}
              <button
                data-testid="logout-button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl hover:bg-red-500/10 transition-all duration-200 text-left group mt-1"
              >
                <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-red-500/10 to-red-500/5 group-hover:from-red-500/20 group-hover:to-red-500/10 transition-all duration-200">
                  <FontAwesomeIcon icon={faSignOutAlt} className="text-red-500 text-xs sm:text-sm" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-red-500">ออกจากระบบ</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default UserMenu;