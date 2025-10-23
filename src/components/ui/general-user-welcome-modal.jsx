/**
 * General User Welcome Modal
 *
 * Displays a welcome message for newly registered General Users
 * explaining that they need admin approval to access the system.
 *
 * Features:
 * - Shows once per session (uses sessionStorage)
 * - Only visible for role='general_user'
 * - Animated entrance with Framer Motion
 * - Glass morphism styling
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserClock, faTimes, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../contexts/AuthContext';

export function GeneralUserWelcomeModal() {
  const { userRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only show for general_user role
    if (userRole !== 'general_user') return;

    // Check if modal has been shown this session
    const hasSeenModal = sessionStorage.getItem('generalUserWelcomeShown');

    if (!hasSeenModal) {
      // Show modal after a short delay for better UX
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [userRole]);

  const handleClose = () => {
    setIsOpen(false);
    // Mark modal as shown for this session
    sessionStorage.setItem('generalUserWelcomeShown', 'true');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md z-[201]"
          >
            {/* Glass Card */}
            <div className="relative rounded-2xl border border-border/40 shadow-2xl overflow-hidden bg-card/95 backdrop-blur-xl">
              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-all duration-200 text-muted-foreground hover:text-foreground z-10"
              >
                <FontAwesomeIcon icon={faTimes} className="text-sm" />
              </button>

              {/* Header with Icon */}
              <div className="p-6 pb-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30">
                    <FontAwesomeIcon icon={faUserClock} className="text-xl text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">ยินดีต้อนรับสู่ Q-Collector</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">สมัครสมาชิกสำเร็จ</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Success Message */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 text-lg mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-600">การสมัครสมาชิกของคุณสำเร็จแล้ว</p>
                    <p className="text-xs text-green-600/80 mt-1">ระบบได้บันทึกข้อมูลของคุณเรียบร้อยแล้ว</p>
                  </div>
                </div>

                {/* Waiting for Approval */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">ขั้นตอนต่อไป:</h4>
                  <div className="space-y-2">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 text-xs font-bold text-blue-600 mt-0.5">1</div>
                      <div className="flex-1">
                        <p className="text-sm text-foreground">รอ Admin ตรวจสอบและอนุมัติบัญชีของคุณ</p>
                        <p className="text-xs text-muted-foreground mt-1">ผู้ดูแลระบบจะตรวจสอบข้อมูลและกำหนดสิทธิ์การเข้าถึง</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/30 text-xs font-bold text-purple-600 mt-0.5">2</div>
                      <div className="flex-1">
                        <p className="text-sm text-foreground">รับสิทธิ์การใช้งานเต็มรูปแบบ</p>
                        <p className="text-xs text-muted-foreground mt-1">หลังจากได้รับอนุมัติ คุณจะสามารถใช้งานระบบได้ทันที</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info Note */}
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-xs text-yellow-600/90">
                    💡 <span className="font-semibold">หมายเหตุ:</span> หากมีข้อสงสัย กรุณาติดต่อผู้ดูแลระบบของคุณ
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-gradient-to-br from-primary/5 to-transparent border-t border-border/30">
                <button
                  onClick={handleClose}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-primary/80 to-primary hover:from-primary hover:to-primary/90 text-white font-semibold text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  เข้าใจแล้ว
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default GeneralUserWelcomeModal;
