/**
 * Liquid Theme Demo Component
 * Showcases the iOS 26 Liquid Glass Theme with Framer Motion animations
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';

const LiquidThemeDemo = () => {
  const { theme } = useTheme();
  const [activeCard, setActiveCard] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Animation variants for liquid theme
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 50,
      scale: 0.9
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
        duration: 0.5
      }
    },
    hover: {
      scale: 1.05,
      y: -10,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 10
      }
    },
    tap: {
      scale: 0.98,
      transition: { duration: 0.1 }
    }
  };

  const modalVariants = {
    hidden: {
      opacity: 0,
      scale: 0.8,
      rotateX: -10
    },
    visible: {
      opacity: 1,
      scale: 1,
      rotateX: 0,
      transition: {
        type: "spring",
        duration: 0.6,
        bounce: 0.4
      }
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      rotateX: 10,
      transition: { duration: 0.3 }
    }
  };

  const buttonVariants = {
    idle: { scale: 1 },
    hover: {
      scale: 1.05,
      boxShadow: "0 0 40px rgba(255, 140, 0, 0.5)",
      transition: {
        type: "spring",
        stiffness: 400
      }
    },
    tap: { scale: 0.95 }
  };

  const floatingVariants = {
    float: {
      y: [0, -20, 0],
      rotate: [0, 5, -5, 0],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const shimmerVariants = {
    shimmer: {
      backgroundPosition: ["200% 0", "-200% 0"],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "linear"
      }
    }
  };

  if (theme !== 'liquid') {
    return null;
  }

  return (
    <motion.div
      className="liquid-demo p-8 min-h-screen"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header with liquid glow text */}
      <motion.h1
        className="text-4xl font-bold mb-8 text-center liquid-glow-text"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, type: "spring" }}
      >
        iOS 26 Liquid Glass Theme
      </motion.h1>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="liquid-card p-6 cursor-pointer"
            variants={cardVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={() => setActiveCard(i)}
            layoutId={`card-${i}`}
          >
            <motion.div
              className="mb-4"
              animate={floatingVariants.float}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full mx-auto opacity-80" />
            </motion.div>
            <h3 className="text-xl font-semibold mb-2">Liquid Card {i}</h3>
            <p className="text-sm opacity-75">
              Experience ultra-smooth animations with 60fps performance
            </p>
          </motion.div>
        ))}
      </div>

      {/* Interactive Buttons */}
      <div className="flex gap-4 justify-center mb-8">
        <motion.button
          className="liquid-button primary px-6 py-3"
          variants={buttonVariants}
          initial="idle"
          whileHover="hover"
          whileTap="tap"
          onClick={() => setShowModal(true)}
        >
          Open Liquid Modal
        </motion.button>

        <motion.button
          className="liquid-button px-6 py-3"
          variants={buttonVariants}
          initial="idle"
          whileHover="hover"
          whileTap="tap"
          whileInView={{
            rotate: [0, 360],
            transition: { duration: 2 }
          }}
        >
          Rotating Button
        </motion.button>
      </div>

      {/* Shimmer Loading Demo */}
      <div className="max-w-md mx-auto mb-8">
        <motion.div
          className="liquid-skeleton h-4 mb-2"
          animate="shimmer"
          variants={shimmerVariants}
        />
        <motion.div
          className="liquid-skeleton h-4 w-3/4 mb-2"
          animate="shimmer"
          variants={shimmerVariants}
        />
        <motion.div
          className="liquid-skeleton h-4 w-1/2"
          animate="shimmer"
          variants={shimmerVariants}
        />
      </div>

      {/* Liquid Input Demo */}
      <div className="max-w-md mx-auto mb-8">
        <motion.input
          type="text"
          placeholder="Liquid glass input with focus effects..."
          className="liquid-input w-full"
          whileFocus={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        />
      </div>

      {/* Toast Demo */}
      <motion.div
        className="liquid-toast success fixed bottom-8 right-8 p-4 min-w-[300px]"
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{
          type: "spring",
          damping: 20,
          stiffness: 200
        }}
      >
        <div className="font-semibold">Success!</div>
        <div className="text-sm opacity-75">Liquid theme loaded successfully</div>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              className="liquid-modal-backdrop fixed inset-0 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
            />
            <motion.div
              className="liquid-modal fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 p-8 min-w-[400px]"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <h2 className="text-2xl font-bold mb-4">Liquid Modal</h2>
              <p className="mb-6 opacity-75">
                This modal features iOS 26-style blur effects with spring animations
              </p>
              <motion.button
                className="liquid-button primary w-full"
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                onClick={() => setShowModal(false)}
              >
                Close Modal
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Expanded Card */}
      <AnimatePresence>
        {activeCard && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveCard(null)}
          >
            <motion.div
              className="liquid-card p-8 max-w-lg w-full"
              layoutId={`card-${activeCard}`}
              onClick={(e) => e.stopPropagation()}
            >
              <motion.h2
                className="text-3xl font-bold mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Expanded Liquid Card {activeCard}
              </motion.h2>
              <motion.p
                className="mb-6 opacity-75"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                This expanded view demonstrates smooth layout animations with shared element transitions.
                The liquid glass effect creates a beautiful depth and blur combination.
              </motion.p>
              <motion.button
                className="liquid-button w-full"
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                onClick={() => setActiveCard(null)}
              >
                Close
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default LiquidThemeDemo;