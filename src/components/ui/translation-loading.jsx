/**
 * Translation Loading Animation
 *
 * Displays animated loading state while LibreTranslate API is processing
 * Thai to English translation for form/field names.
 *
 * @version 1.0.0
 * @since 2025-10-02
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Languages, ArrowRight, Sparkles } from 'lucide-react';

const TranslationLoading = ({
  thaiText = '',
  stage = 'translating',
  compact = false
}) => {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.3 }
    }
  };

  const thaiTextVariants = {
    pulse: {
      scale: [1, 1.02, 1],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const arrowVariants = {
    slide: {
      x: [0, 5, 0],
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const sparkleVariants = {
    twinkle: {
      opacity: [0.3, 1, 0.3],
      scale: [0.8, 1.2, 0.8],
      rotate: [0, 180, 360],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const dotsVariants = {
    animate: {
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const dotVariants = {
    animate: {
      y: [0, -8, 0],
      transition: {
        duration: 0.8,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  // Stage-specific text
  const stageText = {
    'translating': 'กำลังแปลชื่อเป็นภาษาอังกฤษ',
    'generating': 'กำลังสร้างชื่อตาราง',
    'validating': 'กำลังตรวจสอบความถูกต้อง',
    'creating': 'กำลังสร้างตาราง',
    'complete': 'สำเร็จ!'
  };

  if (compact) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-orange-500/10 to-cyan-500/10 rounded-full border border-orange-500/20"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Languages className="w-4 h-4 text-orange-500" />
        </motion.div>
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {stageText[stage] || 'กำลังประมวลผล...'}
        </span>
        <motion.div variants={dotsVariants} animate="animate" className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              variants={dotVariants}
              className="w-1 h-1 bg-orange-500 rounded-full"
            />
          ))}
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center gap-6 p-8 bg-gradient-to-br from-orange-50 to-cyan-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-orange-200 dark:border-gray-700"
    >
      {/* Main Translation Visual */}
      <div className="relative flex items-center gap-6">
        {/* Thai Text */}
        <motion.div
          variants={thaiTextVariants}
          animate="pulse"
          className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-orange-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              ภาษาไทย
            </span>
          </div>
          <div className="px-4 py-2 bg-orange-50 dark:bg-gray-700 rounded-lg">
            <p className="text-lg font-medium text-gray-800 dark:text-gray-200">
              {thaiText || 'กำลังแปล...'}
            </p>
          </div>
        </motion.div>

        {/* Arrow with Sparkles */}
        <div className="relative">
          <motion.div
            variants={arrowVariants}
            animate="slide"
            className="text-orange-500"
          >
            <ArrowRight className="w-8 h-8" />
          </motion.div>
          <motion.div
            variants={sparkleVariants}
            animate="twinkle"
            className="absolute -top-2 -right-2"
          >
            <Sparkles className="w-4 h-4 text-cyan-500" />
          </motion.div>
        </div>

        {/* English Text (Placeholder) */}
        <motion.div
          variants={thaiTextVariants}
          animate="pulse"
          className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-cyan-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              English
            </span>
          </div>
          <div className="px-4 py-2 bg-cyan-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              >
                <Languages className="w-5 h-5 text-cyan-500" />
              </motion.div>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{
                      opacity: [0.3, 1, 0.3],
                      transition: {
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.2
                      }
                    }}
                    className="w-2 h-2 bg-cyan-500 rounded-full"
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Status Text */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {stageText[stage] || 'กำลังประมวลผล...'}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-4 h-4"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray="60"
                strokeDashoffset="40"
                strokeLinecap="round"
                className="text-orange-500"
              />
            </svg>
          </motion.div>
          <span>Powered by LibreTranslate</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-xs h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-orange-500 to-cyan-500"
          initial={{ width: "0%" }}
          animate={{ width: ["0%", "70%", "90%"] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>
    </motion.div>
  );
};

export default TranslationLoading;
