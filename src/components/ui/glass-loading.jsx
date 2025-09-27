import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { loadingVariants } from '../../lib/animations';
import { useGlassLoader, useResponsiveMotion } from '../../hooks/useAnimations';

// Glass Skeleton Loader
const GlassSkeleton = ({
  className,
  width = 'w-full',
  height = 'h-4',
  rounded = 'rounded-md',
  animated = true,
  ...props
}) => {
  const { shouldReduceMotion } = useResponsiveMotion();

  return (
    <div
      className={cn(
        'glass-skeleton relative overflow-visible',
        'bg-white/10 dark:bg-white/5',
        'backdrop-blur-sm',
        width,
        height,
        rounded,
        className
      )}
      {...props}
    >
      {animated && !shouldReduceMotion && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-white/10"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear'
          }}
        />
      )}
    </div>
  );
};

// Glass Spinner
const GlassSpinner = ({
  size = 'md',
  className,
  animated = true,
  ...props
}) => {
  const { shouldReduceMotion } = useResponsiveMotion();
  const { spinnerVariants } = useGlassLoader();

  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  return (
    <motion.div
      className={cn(
        'glass-spinner relative rounded-full',
        'border-2 border-white/20 border-t-primary/80',
        'backdrop-blur-sm bg-white/5 dark:bg-black/10',
        sizes[size],
        className
      )}
      variants={animated && !shouldReduceMotion ? spinnerVariants : undefined}
      animate={animated && !shouldReduceMotion ? 'animate' : undefined}
      {...props}
    >
      {/* Inner glow effect */}
      <div className="absolute inset-1 rounded-full bg-gradient-to-tr from-primary/20 to-transparent" />
    </motion.div>
  );
};

// Glass Pulse Loader (3 dots)
const GlassPulse = ({
  className,
  animated = true,
  ...props
}) => {
  const { shouldReduceMotion } = useResponsiveMotion();

  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.2,
        repeat: Infinity,
        repeatDelay: 0.5
      }
    }
  };

  const dotVariants = {
    animate: {
      scale: [1, 1.2, 1],
      opacity: [0.5, 1, 0.5],
      backgroundColor: [
        'rgba(247, 115, 22, 0.5)',
        'rgba(247, 115, 22, 1)',
        'rgba(247, 115, 22, 0.5)'
      ],
      transition: {
        duration: 0.8,
        ease: 'easeInOut'
      }
    }
  };

  return (
    <motion.div
      className={cn('flex items-center gap-2', className)}
      variants={animated && !shouldReduceMotion ? containerVariants : undefined}
      animate={animated && !shouldReduceMotion ? 'animate' : undefined}
      {...props}
    >
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="w-3 h-3 rounded-full backdrop-blur-sm bg-primary/50 border border-white/20"
          variants={animated && !shouldReduceMotion ? dotVariants : undefined}
        />
      ))}
    </motion.div>
  );
};

// Glass Progress Bar
const GlassProgressBar = ({
  progress = 0,
  className,
  animated = true,
  showPercentage = false,
  ...props
}) => {
  const { shouldReduceMotion } = useResponsiveMotion();

  return (
    <div className={cn('relative', className)} {...props}>
      {/* Background */}
      <div className="w-full h-2 rounded-full backdrop-blur-sm bg-white/10 dark:bg-black/20 border border-white/20 overflow-hidden">
        {/* Progress Fill */}
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary relative overflow-hidden"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          transition={
            animated && !shouldReduceMotion
              ? { duration: 0.5, ease: [0.4, 0, 0.2, 1] }
              : { duration: 0 }
          }
        >
          {/* Shine effect */}
          {animated && !shouldReduceMotion && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'linear',
                repeatDelay: 1
              }}
            />
          )}
        </motion.div>
      </div>

      {/* Percentage */}
      {showPercentage && (
        <motion.div
          className="absolute top-1/2 right-0 transform -translate-y-1/2 translate-x-full ml-3 text-sm font-medium text-foreground/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {Math.round(progress)}%
        </motion.div>
      )}
    </div>
  );
};

// Glass Circular Progress
const GlassCircularProgress = ({
  progress = 0,
  size = 60,
  strokeWidth = 4,
  className,
  animated = true,
  showPercentage = false,
  ...props
}) => {
  const { shouldReduceMotion } = useResponsiveMotion();

  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }} {...props}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        {/* Background Circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
          fill="none"
          className="drop-shadow-sm"
        />

        {/* Progress Circle */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          stroke="url(#glassPrimary)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={
            animated && !shouldReduceMotion
              ? { duration: 1, ease: [0.4, 0, 0.2, 1] }
              : { duration: 0 }
          }
          className="filter drop-shadow-sm"
        />

        {/* Gradient Definition */}
        <defs>
          <linearGradient id="glassPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(247, 115, 22, 0.8)" />
            <stop offset="100%" stopColor="rgba(247, 115, 22, 1)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Percentage */}
      {showPercentage && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center text-sm font-medium text-foreground/80"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          {Math.round(progress)}%
        </motion.div>
      )}
    </div>
  );
};

// Glass Loading Overlay
const GlassLoadingOverlay = ({
  visible = false,
  message = 'กำลังโหลด...',
  type = 'spinner',
  className,
  children,
  ...props
}) => {
  const { shouldReduceMotion } = useResponsiveMotion();

  const overlayVariants = {
    initial: {
      opacity: 0,
      backdropFilter: 'blur(0px)',
      backgroundColor: 'rgba(255, 255, 255, 0)'
    },
    visible: {
      opacity: 1,
      backdropFilter: 'blur(20px)',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1]
      }
    },
    exit: {
      opacity: 0,
      backdropFilter: 'blur(0px)',
      backgroundColor: 'rgba(255, 255, 255, 0)',
      transition: {
        duration: 0.2,
        ease: [0.4, 0, 1, 1]
      }
    }
  };

  const contentVariants = {
    initial: { opacity: 0, scale: 0.9, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: [0.34, 1.56, 0.64, 1]
      }
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      y: -20,
      transition: {
        duration: 0.2,
        ease: [0.4, 0, 1, 1]
      }
    }
  };

  if (!visible) return children;

  return (
    <div className="relative">
      {children}
      <motion.div
        className={cn(
          'absolute inset-0 flex items-center justify-center z-50',
          'dark:bg-black/20',
          className
        )}
        variants={shouldReduceMotion ? undefined : overlayVariants}
        initial="initial"
        animate="visible"
        exit="exit"
        {...props}
      >
        <motion.div
          className="glass-container p-6 flex flex-col items-center gap-4 max-w-xs mx-4"
          variants={shouldReduceMotion ? undefined : contentVariants}
        >
          {/* Loading Component */}
          {type === 'spinner' && <GlassSpinner size="lg" />}
          {type === 'pulse' && <GlassPulse />}
          {type === 'skeleton' && (
            <div className="space-y-2 w-full">
              <GlassSkeleton height="h-3" width="w-3/4" />
              <GlassSkeleton height="h-3" width="w-1/2" />
              <GlassSkeleton height="h-3" width="w-2/3" />
            </div>
          )}

          {/* Message */}
          {message && (
            <motion.p
              className="text-sm font-medium text-foreground/80 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {message}
            </motion.p>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

// Glass Button with Loading State
const GlassButtonLoading = ({
  loading = false,
  children,
  className,
  disabled,
  ...props
}) => {
  const { shouldReduceMotion } = useResponsiveMotion();

  return (
    <motion.button
      className={cn(
        'relative btn-glass-primary min-w-[100px]',
        loading && 'cursor-not-allowed',
        className
      )}
      disabled={disabled || loading}
      whileHover={!loading && !shouldReduceMotion ? { scale: 1.02 } : undefined}
      whileTap={!loading && !shouldReduceMotion ? { scale: 0.98 } : undefined}
      {...props}
    >
      {/* Button Content */}
      <motion.span
        className="flex items-center justify-center gap-2"
        animate={{
          opacity: loading ? 0 : 1,
          y: loading ? 10 : 0
        }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.span>

      {/* Loading Spinner Overlay */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={{
          opacity: loading ? 1 : 0,
          y: loading ? 0 : -10
        }}
        transition={{ duration: 0.2 }}
      >
        <GlassSpinner size="sm" />
      </motion.div>
    </motion.button>
  );
};

export {
  GlassSkeleton,
  GlassSpinner,
  GlassPulse,
  GlassProgressBar,
  GlassCircularProgress,
  GlassLoadingOverlay,
  GlassButtonLoading
};