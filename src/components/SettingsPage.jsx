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
  faStar
} from '@fortawesome/free-solid-svg-icons';
import { useFont } from '../contexts/FontContext';
import { ThemeToggle } from './ThemeToggle';
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
    fontSizes,
    selectedFont,
    selectedFontSize,
    changeFont,
    changeFontSize,
    resetFont,
    resetFontSize,
    resetAll
  } = useFont();
  const [activeSection, setActiveSection] = useState('fonts');
  const [isChanging, setIsChanging] = useState(false);
  const [lastChanged, setLastChanged] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const sections = [
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

  const handleFontSizeChange = async (fontSizeId) => {
    setIsChanging(true);
    await new Promise(resolve => setTimeout(resolve, ANIMATION_CONFIG.timing.fast));
    changeFontSize(fontSizeId);
    setIsChanging(false);
    showSuccessFeedback('fontSize');
  };


  const renderFontSettings = () => (
    <motion.div
      className="space-y-6"
      variants={animationPresets.fadeInGlass}
      initial="initial"
      animate="animate"
    >
      {/* Font Size Selection - Single Row Button Group */}
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
            ขนาดตัวอักษร
          </motion.h2>
          <AnimatePresence>
            {showFeedback && lastChanged === 'fontSize' && (
              <motion.div
                variants={feedbackVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="inline-flex items-center gap-1 text-green-600 text-sm"
              >
                <FontAwesomeIcon icon={faCheck} className="w-3 h-3" />
                <span>เปลี่ยนแล้ว!</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex gap-3 lg:gap-4">
          {fontSizes.map((fontSize, index) => (
            <motion.button
              key={fontSize.id}
              onClick={() => handleFontSizeChange(fontSize.id)}
              className={`btn-glass flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 border-2 relative overflow-hidden ${
                selectedFontSize.id === fontSize.id
                  ? 'bg-primary/10 border-primary text-primary shadow-lg'
                  : 'bg-background/60 border-border/40 text-foreground hover:bg-background/80 hover:border-border/60'
              }`}
              variants={componentVariants.glassButton}
              whileHover={shouldReduceMotion ? {} : "hover"}
              whileTap={shouldReduceMotion ? {} : "tap"}
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: isChanging ? 1.02 : 1,
                transition: {
                  delay: index * 0.1,
                  duration: ANIMATION_CONFIG.timing.medium / 1000,
                  ease: ANIMATION_CONFIG.easing.glass
                }
              }}
              disabled={isChanging}
            >
              <span className={selectedFontSize.id === fontSize.id ? 'font-semibold' : 'font-medium'}>
                {fontSize.thaiName}
              </span>
              {selectedFontSize.id === fontSize.id && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{
                    duration: 1.5,
                    ease: 'linear',
                    repeat: Infinity,
                    repeatDelay: 3
                  }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Font Selection - Single Row Button Group */}
      <motion.div
        className="space-y-4"
        variants={componentVariants.glassCard}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-3">
          <motion.h2
            className="text-lg font-medium text-foreground"
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
          {fonts.map((font, index) => (
            <motion.button
              key={font.id}
              onClick={() => handleFontChange(font.id)}
              className={`btn-glass flex-1 px-4 py-3 rounded-lg transition-all duration-200 text-center border-2 relative overflow-hidden ${
                selectedFont.id === font.id
                  ? 'bg-primary/10 border-primary text-primary shadow-lg'
                  : 'bg-background/60 border-border/40 text-foreground hover:bg-background/80 hover:border-border/60'
              }`}
              variants={componentVariants.glassButton}
              whileHover={shouldReduceMotion ? {} : "hover"}
              whileTap={shouldReduceMotion ? {} : "tap"}
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: isChanging ? 1.02 : 1,
                transition: {
                  delay: index * 0.1 + 0.3,
                  duration: ANIMATION_CONFIG.timing.medium / 1000,
                  ease: ANIMATION_CONFIG.easing.glass
                }
              }}
              disabled={isChanging}
            >
              <div
                className="font-medium"
                style={{ fontFamily: selectedFont.id === font.id ? font.family : 'inherit' }}
              >
                {font.thaiName} - {font.name}
              </div>
              {selectedFont.id === font.id && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent"
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{
                    duration: 1.5,
                    ease: 'linear',
                    repeat: Infinity,
                    repeatDelay: 2
                  }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>

    </motion.div>
  );

  const renderThemeSettings = () => (
    <motion.div
      className="space-y-4"
      variants={animationPresets.fadeInGlass}
      initial="initial"
      animate="animate"
    >
      <motion.div
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
          <h2 className="text-lg font-medium text-foreground">ธีมสี</h2>
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
        className="text-lg font-medium text-foreground"
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

            {/* Loading indicator */}
            <AnimatePresence>
              {isChanging && (
                <motion.div
                  className="flex items-center gap-2 text-primary"
                  variants={feedbackVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <motion.div
                    className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: 'linear'
                    }}
                  />
                  <span className="text-sm font-medium">กำลังเปลี่ยนแปลง...</span>
                </motion.div>
              )}
            </AnimatePresence>
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
            className="flex gap-2 p-1 bg-muted rounded-lg overflow-x-auto"
            variants={componentVariants.glassCard}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.2 }}
          >
            {sections.map((section, index) => (
              <motion.button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-3 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap relative overflow-hidden touch-target-min ${
                  activeSection === section.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-foreground hover:bg-background'
                }`}
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
                <motion.div
                  variants={microInteractions.iconHover}
                  whileHover={shouldReduceMotion ? {} : "hover"}
                >
                  <FontAwesomeIcon
                    icon={section.icon}
                    className="w-4 h-4"
                  />
                </motion.div>
                <motion.span
                  animate={{
                    scale: activeSection === section.id ? 1.05 : 1,
                    transition: {
                      duration: ANIMATION_CONFIG.timing.fast / 1000,
                      ease: ANIMATION_CONFIG.easing.liquid
                    }
                  }}
                >
                  {section.title}
                </motion.span>
                {activeSection === section.id && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{
                      duration: 1.5,
                      ease: 'linear',
                      repeat: Infinity,
                      repeatDelay: 2
                    }}
                  />
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
                {lastChanged === 'font' && 'ฟอนต์เปลี่ยนแล้ว!'}
                {lastChanged === 'fontSize' && 'ขนาดตัวอักษรเปลี่ยนแล้ว!'}
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
    // Warm up the animation engine
    requestIdleCallback(() => {
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