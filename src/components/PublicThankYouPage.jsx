/**
 * PublicThankYouPage Component
 * Thank you page shown after successful public form submission
 *
 * Features:
 * - Success animation
 * - Submission ID display
 * - Form title display
 * - Clean, minimal design
 * - No navigation (standalone page)
 *
 * @version v0.9.0-dev
 * @date 2025-10-26
 */

import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GlassCard, GlassCardContent } from './ui/glass-card';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';

const PublicThankYouPage = () => {
  const { submissionId } = useParams();
  const location = useLocation();
  const formTitle = location.state?.formTitle || 'ฟอร์ม';

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
            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-6"
            >
              <FontAwesomeIcon
                icon={faCheckCircle}
                className="w-12 h-12 text-green-600 dark:text-green-400"
              />
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3"
            >
              ส่งฟอร์มสำเร็จ!
            </motion.h1>

            {/* Message */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-slate-600 dark:text-slate-400 mb-6"
            >
              ขอบคุณที่ส่งข้อมูลใน<br />
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formTitle}
              </span>
            </motion.p>

            {/* Submission ID */}
            {submissionId && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="inline-block px-6 py-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  หมายเลขอ้างอิง
                </div>
                <div className="font-mono text-sm text-slate-900 dark:text-slate-100">
                  {submissionId.substring(0, 8).toUpperCase()}
                </div>
              </motion.div>
            )}

            {/* Decorative Elements */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700"
            >
              <p className="text-sm text-slate-500 dark:text-slate-400">
                คุณสามารถปิดหน้านี้ได้แล้ว
              </p>
            </motion.div>
          </GlassCardContent>
        </GlassCard>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
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

export default PublicThankYouPage;
