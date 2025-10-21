import React from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

const AnimatedAddButton = ({
  onClick,
  tooltip = "เพิ่มฟิลด์ใหม่",
  className = "",
  size = "default",
  testId = "add-field-btn",
  colorScheme = "orange" // ✅ NEW: Support multiple color schemes (orange, green)
}) => {
  // Size configurations
  const sizes = {
    small: { container: "w-12 h-12", icon: "w-4 h-4", text: "text-base" },
    default: { container: "w-16 h-16", icon: "w-6 h-6", text: "text-xl" },
    large: { container: "w-20 h-20", icon: "w-8 h-8", text: "text-2xl" }
  };

  // ✅ NEW: Color scheme configurations
  const colorSchemes = {
    orange: {
      outerGlow: "from-orange-400 via-orange-500 to-orange-600",
      middleRing: "from-orange-300 to-orange-400",
      mainButton: "from-orange-400 via-orange-500 to-orange-600",
      shadow: "shadow-orange-500/40",
      hoverShadow: "group-hover:shadow-orange-500/60",
      ripple: "border-orange-400/50",
      boxShadow: [
        "0 10px 20px rgba(249, 115, 22, 0.4)",
        "0 15px 30px rgba(249, 115, 22, 0.6)",
        "0 10px 20px rgba(249, 115, 22, 0.4)"
      ]
    },
    green: {
      outerGlow: "from-green-400 via-green-500 to-green-600",
      middleRing: "from-green-300 to-green-400",
      mainButton: "from-green-400 via-green-500 to-green-600",
      shadow: "shadow-green-500/40",
      hoverShadow: "group-hover:shadow-green-500/60",
      ripple: "border-green-400/50",
      boxShadow: [
        "0 10px 20px rgba(34, 197, 94, 0.4)",
        "0 15px 30px rgba(34, 197, 94, 0.6)",
        "0 10px 20px rgba(34, 197, 94, 0.4)"
      ]
    }
  };

  const sizeConfig = sizes[size] || sizes.default;
  const colors = colorSchemes[colorScheme] || colorSchemes.orange;
  return (
    <motion.div
      data-testid={testId}
      className={`relative group cursor-pointer ${className}`}
      onClick={onClick}
      title={tooltip}
      aria-label={tooltip}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
        duration: 0.3
      }}
    >
      {/* Outer glow ring - pulsing */}
      <motion.div
        className={`absolute inset-0 rounded-full bg-gradient-to-r ${colors.outerGlow} opacity-60`}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.6, 0.8, 0.6]
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{ filter: 'blur(6px)' }}
      />

      {/* Middle ring - rotating */}
      <motion.div
        className={`absolute inset-1 rounded-full bg-gradient-to-r ${colors.middleRing} opacity-40`}
        animate={{
          rotate: [0, 360],
          scale: [0.95, 1.05, 0.95]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{ filter: 'blur(3px)' }}
      />

      {/* Main button */}
      <motion.div
        className={`relative ${sizeConfig.container} rounded-full bg-gradient-to-br ${colors.mainButton}
                   shadow-lg ${colors.shadow} flex items-center justify-center
                   border-2 border-white/20 backdrop-blur-sm
                   ${colors.hoverShadow}
                   transition-all duration-300 ease-out`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{
          boxShadow: colors.boxShadow
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* Plus icon with rotation */}
        <motion.div
          className={`text-white ${sizeConfig.text} font-bold`}
          animate={{
            rotate: [0, 180, 360],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <FontAwesomeIcon
            icon={faPlus}
            className={`${sizeConfig.icon} drop-shadow-sm`}
          />
        </motion.div>

        {/* Sparkle effects */}
        <motion.div
          className="absolute top-2 right-2 w-1.5 h-1.5 bg-white rounded-full opacity-80"
          animate={{
            scale: [0, 1, 0],
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: 0.2
          }}
        />
        <motion.div
          className="absolute bottom-2 left-2 w-1 h-1 bg-white rounded-full opacity-60"
          animate={{
            scale: [0, 1, 0],
            opacity: [0, 0.8, 0]
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            delay: 0.8
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1 w-0.5 h-0.5 bg-white rounded-full opacity-40"
          animate={{
            scale: [0, 1, 0],
            opacity: [0, 0.6, 0]
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            delay: 1.4
          }}
        />
      </motion.div>

      {/* Ripple effect on hover */}
      <motion.div
        className={`absolute inset-0 rounded-full border-2 ${colors.ripple}`}
        initial={{ scale: 1, opacity: 0 }}
        whileHover={{
          scale: [1, 1.4, 1.8],
          opacity: [0, 0.7, 0]
        }}
        transition={{
          duration: 1,
          ease: "easeOut",
          times: [0, 0.5, 1]
        }}
      />

      {/* Tooltip - with higher z-index to prevent being covered by field cards */}
      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2
                      bg-black/90 text-white text-sm px-3 py-1.5 rounded-lg shadow-lg
                      opacity-0 group-hover:opacity-100 transition-opacity duration-200
                      pointer-events-none whitespace-nowrap z-[99999]">
        {tooltip}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2
                        w-0 h-0 border-l-4 border-r-4 border-t-4
                        border-transparent border-t-black/90" />
      </div>
    </motion.div>
  );
};

export default AnimatedAddButton;