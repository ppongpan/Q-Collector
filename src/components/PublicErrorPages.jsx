/**
 * PublicErrorPages Component
 * Error pages for public form access issues
 *
 * Features:
 * - 404 Not Found
 * - Link Expired
 * - Submission Limit Reached
 * - Generic Error
 * - Clean, minimal design
 *
 * @version v0.9.0-dev
 * @date 2025-10-26
 */

import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard, GlassCardContent } from './ui/glass-card';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faExclamationTriangle,
  faCalendarTimes,
  faExclamationCircle,
  faBan
} from '@fortawesome/free-solid-svg-icons';

/**
 * Base Error Page Component
 */
const ErrorPageBase = ({ icon, iconColor, title, message, children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <GlassCard>
          <GlassCardContent className="py-12 text-center">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${iconColor} mb-6`}
            >
              <FontAwesomeIcon icon={icon} className="w-12 h-12" />
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3"
            >
              {title}
            </motion.h1>

            {/* Message */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-slate-600 dark:text-slate-400 mb-6"
            >
              {message}
            </motion.p>

            {/* Additional Content */}
            {children && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {children}
              </motion.div>
            )}
          </GlassCardContent>
        </GlassCard>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400"
        >
          <p>
            Powered by <span className="font-semibold text-orange-600 dark:text-orange-400">Q-Collector</span>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

/**
 * 404 Not Found Page
 */
export const NotFoundPage = () => {
  return (
    <ErrorPageBase
      icon={faExclamationTriangle}
      iconColor="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
      title="ไม่พบฟอร์ม"
      message="ฟอร์มที่คุณกำลังค้นหาไม่พร้อมใช้งาน หรือถูกปิดการใช้งานแล้ว"
    >
      <div className="text-sm text-slate-500 dark:text-slate-400">
        กรุณาตรวจสอบลิงก์หรือติดต่อผู้ดูแลระบบ
      </div>
    </ErrorPageBase>
  );
};

/**
 * Link Expired Page
 */
export const ExpiredPage = () => {
  return (
    <ErrorPageBase
      icon={faCalendarTimes}
      iconColor="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
      title="ลิงก์หมดอายุ"
      message="ลิงก์สำหรับส่งฟอร์มนี้หมดอายุแล้ว"
    >
      <div className="text-sm text-slate-500 dark:text-slate-400">
        กรุณาติดต่อผู้ดูแลระบบเพื่อขอลิงก์ใหม่
      </div>
    </ErrorPageBase>
  );
};

/**
 * Submission Limit Reached Page
 */
export const LimitReachedPage = () => {
  return (
    <ErrorPageBase
      icon={faBan}
      iconColor="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
      title="ถึงจำนวนสูงสุด"
      message="ฟอร์มนี้ถึงจำนวนการส่งสูงสุดแล้ว ไม่สามารถรับข้อมูลเพิ่มได้"
    >
      <div className="text-sm text-slate-500 dark:text-slate-400">
        ขอบคุณที่ให้ความสนใจ
      </div>
    </ErrorPageBase>
  );
};

/**
 * Generic Error Page
 */
export const GenericErrorPage = () => {
  return (
    <ErrorPageBase
      icon={faExclamationCircle}
      iconColor="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
      title="เกิดข้อผิดพลาด"
      message="ขออภัย เกิดข้อผิดพลาดในการโหลดฟอร์ม"
    >
      <div className="text-sm text-slate-500 dark:text-slate-400">
        กรุณาลองใหม่อีกครั้งภายหลัง
      </div>
    </ErrorPageBase>
  );
};

export default {
  NotFoundPage,
  ExpiredPage,
  LimitReachedPage,
  GenericErrorPage
};
