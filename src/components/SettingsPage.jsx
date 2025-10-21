import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faFont,
  faCheck,
  faPalette,
  faCog,
  faGlobe,
  faBell,
  faStar,
  faShieldAlt
} from '@fortawesome/free-solid-svg-icons';
import { useFont } from '../contexts/FontContext';
import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import ThemeSelector from './settings/ThemeSelector';
import TwoFactorStatus from './settings/TwoFactorStatus';
import TrustedDevices from './settings/TrustedDevices';
import TrustedDeviceDuration from './settings/TrustedDeviceDuration';
import TelegramSettings from './settings/TelegramSettings';
import apiClient from '../services/ApiClient';
import { USER_ROLES } from '../config/roles.config';
import {
  pageTransitions,
  componentVariants,
  microInteractions,
  animationPresets,
  ANIMATION_CONFIG
} from '../lib/animations';

function SettingsPage({ onNavigate }) {
  const {
    fonts,
    selectedFont,
    changeFont,
    resetFont
  } = useFont();
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('security');
  const [isChanging, setIsChanging] = useState(false);
  const [lastChanged, setLastChanged] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // Check if user is Super Admin or Admin
  const isSuperAdmin = user?.role === USER_ROLES.SUPER_ADMIN;
  const isAdmin = user?.role === USER_ROLES.ADMIN || isSuperAdmin;

  const sections = [
    {
      id: 'security',
      title: 'ความปลอดภัย',
      icon: faShieldAlt,
      description: 'จัดการความปลอดภัยและ 2FA'
    },
    {
      id: 'fonts',
      title: 'ฟอนต์',
      icon: faFont,
      description: 'เลือกฟอนต์ที่ใช้ในแอปพลิเคชัน'
    },
    {
      id: 'theme',
      title: 'ธีม',
      icon: faPalette,
      description: 'เปลี่ยนธีมสีของแอปพลิเคชัน'
    },
    {
      id: 'general',
      title: 'ทั่วไป',
      icon: faCog,
      description: 'การตั้งค่าทั่วไปของแอปพลิเคชัน'
    }
  ];

  // Animation variants for settings changes
  const settingsChangeVariants = {
    initial: { scale: 1, filter: 'brightness(1)' },
    changing: {
      scale: 1.02,
      filter: 'brightness(1.1)',
      transition: {
        duration: ANIMATION_CONFIG.timing.fast / 1000,
        ease: ANIMATION_CONFIG.easing.ios
      }
    },
    changed: {
      scale: 1,
      filter: 'brightness(1)',
      transition: {
        duration: ANIMATION_CONFIG.timing.medium / 1000,
        ease: ANIMATION_CONFIG.easing.bounce
      }
    }
  };

  const feedbackVariants = {
    initial: { scale: 0, opacity: 0, rotate: -180 },
    animate: {
      scale: 1,
      opacity: 1,
      rotate: 0,
      transition: {
        type: 'spring',
        stiffness: 500,
        damping: 25
      }
    },
    exit: {
      scale: 0,
      opacity: 0,
      rotate: 180,
      transition: {
        duration: ANIMATION_CONFIG.timing.fast / 1000,
        ease: ANIMATION_CONFIG.easing.exit
      }
    }
  };

  const showSuccessFeedback = (type) => {
    setLastChanged(type);
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 2000);
  };

  const handleFontChange = async (fontId) => {
    setIsChanging(true);
    await new Promise(resolve => setTimeout(resolve, ANIMATION_CONFIG.timing.fast));
    changeFont(fontId);
    setIsChanging(false);
    showSuccessFeedback('font');
  };

  const renderSecuritySettings = () => (
    <motion.div
      className="space-y-6"
      variants={animationPresets.fadeInGlass}
      initial="initial"
      animate="animate"
    >
      <motion.div
        variants={componentVariants.glassCard}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.1 }}
      >
        <motion.h2
          className="text-lg font-medium text-foreground mt-2"
          variants={animationPresets.slideUpGlass}
          initial="initial"
          animate="animate"
        >
          ความปลอดภัย
        </motion.h2>
        <motion.p
          className="text-sm text-muted-foreground mt-1"
          variants={animationPresets.slideUpGlass}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.05 }}
        >
          จัดการการยืนยันตัวตนแบบสองขั้นตอน (2FA) และความปลอดภัยของบัญชี
        </motion.p>
      </motion.div>

      <motion.div
        variants={componentVariants.glassCard}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.2 }}
      >
        <TwoFactorStatus apiClient={apiClient} />
      </motion.div>

      <motion.div
        variants={componentVariants.glassCard}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.3 }}
      >
        <TrustedDevices />
      </motion.div>

      <motion.div
        variants={componentVariants.glassCard}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.4 }}
      >
        <TrustedDeviceDuration />
      </motion.div>

      {/* Telegram Settings - Super Admin Only */}
      {isSuperAdmin && (
        <motion.div
          variants={componentVariants.glassCard}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.5 }}
        >
          <TelegramSettings />
        </motion.div>
      )}

      {/* Notification Rules - Admin & Super Admin */}
      {isAdmin && (
        <motion.div
          className="p-4 rounded-lg bg-card/50 border border-border"
          variants={componentVariants.glassCard}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                <FontAwesomeIcon icon={faBell} className="text-orange-500" />
                การแจ้งเตือน Telegram
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                จัดการกฎการแจ้งเตือนอัตโนมัติและดูประวัติการส่ง
              </p>
            </div>
            <motion.button
              onClick={() => onNavigate && onNavigate('notification-rules')}
              className="px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
              variants={microInteractions.buttonPress}
              whileHover={shouldReduceMotion ? {} : "hover"}
              whileTap={shouldReduceMotion ? {} : "tap"}
            >
              จัดการกฎ
            </motion.button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );

  const renderFontSettings = () => (
    <motion.div
      className="space-y-6"
      variants={animationPresets.fadeInGlass}
      initial="initial"
      animate="animate"
    >

      {/* Font Selection - Single Row Button Group */}
      <motion.div
        className="space-y-4"
        variants={componentVariants.glassCard}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-3">
          <motion.h2
            className="text-lg font-medium text-foreground mt-2"
            animate={isChanging ? settingsChangeVariants.changing : settingsChangeVariants.changed}
          >
            เลือกฟอนต์
          </motion.h2>
          <AnimatePresence>
            {showFeedback && lastChanged === 'font' && (
              <motion.div
                variants={feedbackVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="inline-flex items-center gap-1 text-green-600 text-sm"
              >
                <FontAwesomeIcon icon={faStar} className="w-3 h-3" />
                <span>เปลี่ยนฟอนต์แล้ว!</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
          {fonts.map((font, index) => {
            const isActive = selectedFont.id === font.id;
            return (
              <motion.div
                key={font.id}
                className="flex-1 relative"
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: {
                    delay: index * 0.1 + 0.2,
                    duration: ANIMATION_CONFIG.timing.medium / 1000,
                    ease: ANIMATION_CONFIG.easing.glass
                  }
                }}
              >
                <button
                  onClick={() => handleFontChange(font.id)}
                  className={`btn-glass glass-interactive blur-edge w-full px-6 py-4 text-base min-h-12
                    inline-flex items-center justify-center whitespace-nowrap font-medium
                    rounded-3xl transition-all duration-300 ease-out
                    focus-glass disabled:opacity-50 disabled:pointer-events-none
                    relative overflow-visible will-change-transform
                    ${isActive
                      ? 'bg-primary/20 border-2 border-primary shadow-lg shadow-primary/30'
                      : 'hover:scale-[1.02] hover:shadow-xl'
                    }`}
                  disabled={isChanging}
                >
                  {/* Active Indicator Check Icon */}
                  {isActive && (
                    <motion.div
                      className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-lg"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <FontAwesomeIcon icon={faCheck} className="w-3 h-3" />
                    </motion.div>
                  )}

                  <div className="text-center w-full">
                    <div
                      className={`font-medium mb-1 ${isActive ? 'text-primary' : 'text-foreground'}`}
                      style={{ fontFamily: font.family }}
                    >
                      {font.thaiName}
                    </div>
                    <div className={`text-sm ${isActive ? 'text-primary/80' : 'text-muted-foreground'}`}>
                      {font.name}
                    </div>
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

    </motion.div>
  );

  const renderThemeSettings = () => (
    <motion.div
      className="space-y-6"
      variants={animationPresets.fadeInGlass}
      initial="initial"
      animate="animate"
    >
      {/* Theme Selector - Super Admin Only */}
      {/* HIDDEN: Theme selector disabled per user request (2025-10-21) */}
      {/* {isSuperAdmin && (
        <motion.div
          variants={componentVariants.glassCard}
          initial="initial"
          animate="animate"
        >
          <ThemeSelector />
        </motion.div>
      )} */}

      {/* Dark Mode Toggle */}
      {/* HIDDEN: Theme toggle disabled per user request (2025-10-21) */}
      {/* <motion.div
        className="flex items-center justify-between"
        variants={componentVariants.glassCard}
        initial="initial"
        animate="animate"
      >
        <motion.div
          variants={animationPresets.slideUpGlass}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-lg font-medium text-foreground">โหมดมืด (Dark Mode)</h2>
          <p className="text-sm text-muted-foreground">เปลี่ยนระหว่างธีมสีแสงและสีมืด</p>
        </motion.div>
        <motion.div
          variants={microInteractions.iconHover}
          whileHover={shouldReduceMotion ? {} : "hover"}
          initial={{ opacity: 0, x: 20 }}
          animate={{
            opacity: 1,
            x: 0,
            transition: {
              delay: 0.2,
              duration: ANIMATION_CONFIG.timing.medium / 1000,
              ease: ANIMATION_CONFIG.easing.glass
            }
          }}
        >
          <ThemeToggle />
        </motion.div>
      </motion.div> */}

      {/* Test Theme Button */}
      <motion.div
        className="flex items-center justify-between p-4 rounded-lg bg-card/50 border border-border"
        variants={componentVariants.glassCard}
        initial="initial"
        animate="animate"
      >
        <div>
          <h2 className="text-lg font-medium text-foreground">ทดสอบธีม (Theme Test)</h2>
          <p className="text-sm text-muted-foreground">ทดสอบการแสดงผลของคอมโพเนนต์ทั้ง 6 ตัว</p>
        </div>
        <motion.button
          onClick={() => onNavigate && onNavigate('theme-test')}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          variants={microInteractions.buttonPress}
          whileHover={shouldReduceMotion ? {} : "hover"}
          whileTap={shouldReduceMotion ? {} : "tap"}
        >
          ทดสอบธีม
        </motion.button>
      </motion.div>
    </motion.div>
  );

  const renderGeneralSettings = () => (
    <motion.div
      className="space-y-4"
      variants={animationPresets.fadeInGlass}
      initial="initial"
      animate="animate"
    >
      <motion.h2
        className="text-lg font-medium text-foreground mt-2"
        variants={animationPresets.slideUpGlass}
        initial="initial"
        animate="animate"
      >
        การตั้งค่าทั่วไป
      </motion.h2>

      <motion.div
        className="space-y-3"
        variants={componentVariants.glassCard}
        initial="initial"
        animate="animate"
      >
        {/* Language Settings */}
        <motion.div
          className="flex items-center justify-between py-2"
          variants={componentVariants.listItem}
          initial="initial"
          animate={(index) => componentVariants.listItem.animate(0)}
          whileHover={shouldReduceMotion ? {} : { scale: 1.01, transition: { duration: 0.15 } }}
        >
          <div className="flex items-center gap-2">
            <motion.div
              variants={microInteractions.iconHover}
              whileHover={shouldReduceMotion ? {} : "hover"}
            >
              <FontAwesomeIcon icon={faGlobe} className="w-4 h-4 text-muted-foreground" />
            </motion.div>
            <span className="text-sm font-medium text-foreground">ภาษา</span>
          </div>
          <motion.span
            className="px-3 py-1 bg-primary/10 rounded-md text-sm text-primary font-medium"
            variants={microInteractions.badge}
            initial="initial"
            animate="animate"
          >
            ไทย (TH)
          </motion.span>
        </motion.div>

        {/* Notifications */}
        <motion.div
          className="flex items-center justify-between py-2"
          variants={componentVariants.listItem}
          initial="initial"
          animate={(index) => componentVariants.listItem.animate(1)}
          whileHover={shouldReduceMotion ? {} : { scale: 1.01, transition: { duration: 0.15 } }}
        >
          <div className="flex items-center gap-2">
            <motion.div
              variants={microInteractions.iconHover}
              whileHover={shouldReduceMotion ? {} : "hover"}
            >
              <FontAwesomeIcon icon={faBell} className="w-4 h-4 text-muted-foreground" />
            </motion.div>
            <span className="text-sm font-medium text-foreground">การแจ้งเตือน</span>
          </div>
          <motion.label
            className="flex items-center gap-2"
            whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
            whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
          >
            <motion.input
              type="checkbox"
              className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
              defaultChecked
              aria-label="เปิดใช้งานการแจ้งเตือน"
              whileFocus={{ scale: 1.1, transition: { duration: 0.15 } }}
            />
            <span className="text-sm text-foreground">เปิดใช้งาน</span>
          </motion.label>
        </motion.div>

        {/* App Info */}
        <motion.div
          className="pt-3 border-t border-border/30"
          variants={animationPresets.slideUpGlass}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.3 }}
        >
          <motion.div
            className="text-sm text-muted-foreground space-y-1"
            variants={{ animate: { transition: { staggerChildren: 0.1 } } }}
            animate="animate"
          >
            <motion.div
              className="flex justify-between"
              variants={componentVariants.listItem}
              initial="initial"
              animate={(index) => componentVariants.listItem.animate(0)}
            >
              <span>ชื่อแอป:</span>
              <span className="font-medium text-foreground">Form Builder</span>
            </motion.div>
            <motion.div
              className="flex justify-between"
              variants={componentVariants.listItem}
              initial="initial"
              animate={(index) => componentVariants.listItem.animate(1)}
            >
              <span>เวอร์ชัน:</span>
              <span className="font-medium text-foreground">0.1.5</span>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );

  return (
    <motion.div
      className="min-h-screen bg-background transition-colors duration-300"
      variants={pageTransitions.liquidGlass}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Header */}
      <motion.header
        className="bg-background/95 backdrop-blur-sm border-b border-border/50 sticky top-0 z-50 shadow-elevation-low"
        variants={componentVariants.navigation}
        initial="initial"
        animate="animate"
      >
        <div className="container-responsive">
          <motion.div
            className="flex items-center justify-between py-4 md:py-6"
            variants={{ animate: { transition: { staggerChildren: 0.1 } } }}
            animate="animate"
          >
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: {
                  delay: 0.1,
                  duration: ANIMATION_CONFIG.timing.medium / 1000,
                  ease: ANIMATION_CONFIG.easing.glass
                }
              }}
            >
              <motion.h1
                className="text-responsive-xl font-bold text-foreground"
                animate={{
                  color: 'var(--foreground)',
                  transition: {
                    duration: ANIMATION_CONFIG.timing.medium / 1000,
                    ease: ANIMATION_CONFIG.easing.ios
                  }
                }}
              >
                จัดการการตั้งค่าแอปพลิเคชัน
              </motion.h1>
            </motion.div>

          </motion.div>
        </div>
      </motion.header>

      {/* Main Content */}
      <motion.div
        className="container-responsive py-4 lg:py-6"
        variants={animationPresets.fadeInGlass}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.1 }}
      >
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Compact Section Navigation */}
          <motion.div
            className="flex gap-1 sm:gap-2 overflow-x-auto flex-1"
            variants={componentVariants.glassCard}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.2 }}
          >
            {sections.map((section, index) => (
              <motion.button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                title={section.description}
                className={`relative px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-2 sm:py-3 md:py-4 text-xs sm:text-sm md:text-base lg:text-lg font-medium transition-all duration-300 rounded-t-lg border-b-3 whitespace-nowrap touch-target-comfortable ${
                  activeSection === section.id
                    ? 'text-primary bg-primary/5 border-primary shadow-sm backdrop-blur-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/10 border-transparent'
                }`}
                style={{
                  borderRadius: '16px 16px 0 0'
                }}
                variants={componentVariants.glassButton}
                whileHover={shouldReduceMotion ? {} : "hover"}
                whileTap={shouldReduceMotion ? {} : "tap"}
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: {
                    delay: index * 0.1 + 0.3,
                    duration: ANIMATION_CONFIG.timing.medium / 1000,
                    ease: ANIMATION_CONFIG.easing.glass
                  }
                }}
              >
                <FontAwesomeIcon icon={section.icon} className="w-4 h-4" />
                <span className="ml-2">{section.title}</span>
                {activeSection === section.id && (
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-primary to-orange-500 rounded-full" />
                )}
              </motion.button>
            ))}
          </motion.div>

          {/* Main Settings Content */}
          <motion.div
            className="card"
            variants={componentVariants.glassCard}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.3 }}
          >
            <motion.div
              className="card-content"
              animate={{
                scale: isChanging ? 1.005 : 1,
                transition: {
                  duration: ANIMATION_CONFIG.timing.medium / 1000,
                  ease: ANIMATION_CONFIG.easing.liquid
                }
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  variants={{
                    initial: { opacity: 0, x: 20, filter: 'blur(4px)' },
                    animate: {
                      opacity: 1,
                      x: 0,
                      filter: 'blur(0px)',
                      transition: {
                        duration: ANIMATION_CONFIG.timing.medium / 1000,
                        ease: ANIMATION_CONFIG.easing.glass
                      }
                    },
                    exit: {
                      opacity: 0,
                      x: -20,
                      filter: 'blur(4px)',
                      transition: {
                        duration: ANIMATION_CONFIG.timing.fast / 1000,
                        ease: ANIMATION_CONFIG.easing.exit
                      }
                    }
                  }}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  {activeSection === 'security' && renderSecuritySettings()}
                  {activeSection === 'fonts' && renderFontSettings()}
                  {activeSection === 'theme' && renderThemeSettings()}
                  {activeSection === 'general' && renderGeneralSettings()}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Global success feedback overlay */}
      <AnimatePresence>
        {showFeedback && (
          <motion.div
            className="fixed bottom-6 right-6 z-50"
            variants={feedbackVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <motion.div
              className="bg-green-600 dark:bg-green-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
              variants={microInteractions.badge}
              whileHover={shouldReduceMotion ? {} : "hover"}
            >
              <FontAwesomeIcon icon={faStar} className="w-4 h-4" />
              <span className="text-sm font-medium">
                ฟอนต์เปลี่ยนแล้ว!
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default SettingsPage;

// Performance optimization: Preload heavy animations
if (typeof window !== 'undefined') {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReducedMotion) {
    // Polyfill for requestIdleCallback (Safari/iOS compatibility)
    const requestIdleCallbackPolyfill = window.requestIdleCallback || function(cb) {
      const start = Date.now();
      return setTimeout(function() {
        cb({
          didTimeout: false,
          timeRemaining: function() {
            return Math.max(0, 50 - (Date.now() - start));
          }
        });
      }, 1);
    };

    // Warm up the animation engine
    requestIdleCallbackPolyfill(() => {
      const warmupElement = document.createElement('div');
      warmupElement.style.transform = 'translateZ(0)';
      warmupElement.style.opacity = '0';
      warmupElement.style.position = 'absolute';
      warmupElement.style.top = '-1px';
      document.body.appendChild(warmupElement);
      setTimeout(() => document.body.removeChild(warmupElement), 100);
    });
  }
}