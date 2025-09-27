import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import GlassTooltip from './glass-tooltip';
import { componentVariants, microInteractions } from '../../lib/animations';
import { useResponsiveMotion } from '../../hooks/useAnimations';

const AnimatedGlassInput = React.forwardRef(({
  className,
  type = 'text',
  placeholder,
  tooltip,
  minimal = false,
  error = false,
  success = false,
  animated = true,
  floatingLabel = false,
  icon,
  rightIcon,
  onFocus,
  onBlur,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  const { shouldReduceMotion, getVariant } = useResponsiveMotion();

  const handleFocus = useCallback((e) => {
    setIsFocused(true);
    onFocus?.(e);
  }, [onFocus]);

  const handleBlur = useCallback((e) => {
    setIsFocused(false);
    setHasValue(e.target.value.length > 0);
    onBlur?.(e);
  }, [onBlur]);

  const MotionInput = animated ? motion.input : 'input';
  const MotionDiv = animated ? motion.div : 'div';

  const containerVariants = {
    initial: {
      borderColor: 'rgba(255, 255, 255, 0.2)',
      backdropFilter: 'blur(16px) saturate(150%)'
    },
    focused: {
      borderColor: error ? 'rgba(239, 68, 68, 0.6)' : success ? 'rgba(16, 185, 129, 0.6)' : 'rgba(247, 115, 22, 0.6)',
      backdropFilter: 'blur(20px) saturate(180%)',
      boxShadow: error
        ? '0 0 0 3px rgba(239, 68, 68, 0.1)'
        : success
          ? '0 0 0 3px rgba(16, 185, 129, 0.1)'
          : '0 0 0 3px rgba(247, 115, 22, 0.1)',
      scale: 1.005,
      transition: {
        duration: 0.15,
        ease: [0.4, 0, 0.2, 1]
      }
    },
    error: {
      borderColor: 'rgba(239, 68, 68, 0.6)',
      boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)',
      x: [0, -2, 2, -2, 2, 0],
      transition: {
        duration: 0.4,
        ease: [0.68, -0.55, 0.265, 1.55]
      }
    }
  };

  const labelVariants = {
    initial: {
      y: 0,
      scale: 1,
      color: 'rgb(156, 163, 175)',
      opacity: 0.7
    },
    floating: {
      y: -24,
      scale: 0.85,
      color: error ? 'rgb(239, 68, 68)' : success ? 'rgb(16, 185, 129)' : 'rgb(247, 115, 22)',
      opacity: 1,
      transition: {
        duration: 0.2,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  };

  const inputElement = (
    <MotionDiv
      className={cn(
        'relative flex items-center',
        'glass-input-container rounded-2xl overflow-visible',
        'border border-white/20 dark:border-white/10',
        'backdrop-blur-16 bg-white/5 dark:bg-black/20',
        'transition-all duration-200 ease-out',
        minimal && 'bg-transparent border-transparent',
        error && 'border-destructive/50',
        success && 'border-success/50',
        className
      )}
      variants={animated && !shouldReduceMotion ? containerVariants : undefined}
      initial="initial"
      animate={
        error && animated ? 'error'
        : isFocused && animated ? 'focused'
        : 'initial'
      }
      style={{
        willChange: 'transform, border-color, backdrop-filter, box-shadow'
      }}
    >
      {/* Left Icon */}
      {icon && (
        <motion.div
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/70 z-10"
          initial={{ opacity: 0.6, scale: 1 }}
          animate={{
            opacity: isFocused ? 0.8 : 0.6,
            scale: isFocused ? 1.05 : 1,
            color: isFocused ? (error ? 'rgb(239, 68, 68)' : success ? 'rgb(16, 185, 129)' : 'rgb(247, 115, 22)') : undefined
          }}
          transition={{ duration: 0.15 }}
        >
          {icon}
        </motion.div>
      )}

      {/* Floating Label */}
      {floatingLabel && placeholder && (
        <motion.label
          className={cn(
            'absolute left-3 pointer-events-none z-10 font-medium',
            icon && 'left-10'
          )}
          variants={labelVariants}
          initial="initial"
          animate={(isFocused || hasValue) ? 'floating' : 'initial'}
        >
          {placeholder}
        </motion.label>
      )}

      {/* Input Field */}
      <MotionInput
        ref={ref}
        type={type}
        className={cn(
          'w-full px-4 py-3 bg-transparent',
          'text-foreground/90 placeholder:text-muted-foreground/50',
          'border-none outline-none ring-0 focus:ring-0',
          'font-medium text-sm',
          icon && 'pl-10',
          rightIcon && 'pr-10',
          floatingLabel && 'placeholder-transparent focus:placeholder-muted-foreground/30'
        )}
        placeholder={floatingLabel ? '' : placeholder}
        onFocus={handleFocus}
        onBlur={handleBlur}
        initial={animated && !shouldReduceMotion ? { opacity: 0.8 } : undefined}
        animate={animated && !shouldReduceMotion ? { opacity: 1 } : undefined}
        transition={animated && !shouldReduceMotion ? { duration: 0.2 } : undefined}
        {...props}
      />

      {/* Right Icon */}
      {rightIcon && (
        <motion.div
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/70 z-10"
          initial={{ opacity: 0.6, scale: 1 }}
          animate={{
            opacity: isFocused ? 0.8 : 0.6,
            scale: isFocused ? 1.05 : 1,
            color: isFocused ? (error ? 'rgb(239, 68, 68)' : success ? 'rgb(16, 185, 129)' : 'rgb(247, 115, 22)') : undefined
          }}
          transition={{ duration: 0.15 }}
        >
          {rightIcon}
        </motion.div>
      )}

      {/* Focus Glow Effect */}
      {animated && !shouldReduceMotion && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{
            opacity: isFocused ? 1 : 0,
            background: isFocused
              ? error
                ? 'linear-gradient(45deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05))'
                : success
                  ? 'linear-gradient(45deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05))'
                  : 'linear-gradient(45deg, rgba(247, 115, 22, 0.1), rgba(247, 115, 22, 0.05))'
              : 'transparent'
          }}
          transition={{ duration: 0.2 }}
        />
      )}
    </MotionDiv>
  );

  return tooltip ? (
    <GlassTooltip content={tooltip}>
      {inputElement}
    </GlassTooltip>
  ) : inputElement;
});
AnimatedGlassInput.displayName = 'AnimatedGlassInput';

const AnimatedGlassTextarea = React.forwardRef(({
  className,
  rows = 4,
  placeholder,
  tooltip,
  minimal = false,
  error = false,
  success = false,
  animated = true,
  floatingLabel = false,
  onFocus,
  onBlur,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  const { shouldReduceMotion } = useResponsiveMotion();

  const handleFocus = useCallback((e) => {
    setIsFocused(true);
    onFocus?.(e);
  }, [onFocus]);

  const handleBlur = useCallback((e) => {
    setIsFocused(false);
    setHasValue(e.target.value.length > 0);
    onBlur?.(e);
  }, [onBlur]);

  const MotionTextarea = animated ? motion.textarea : 'textarea';
  const MotionDiv = animated ? motion.div : 'div';

  const containerVariants = {
    initial: {
      borderColor: 'rgba(255, 255, 255, 0.2)',
      backdropFilter: 'blur(16px) saturate(150%)'
    },
    focused: {
      borderColor: error ? 'rgba(239, 68, 68, 0.6)' : success ? 'rgba(16, 185, 129, 0.6)' : 'rgba(247, 115, 22, 0.6)',
      backdropFilter: 'blur(20px) saturate(180%)',
      boxShadow: error
        ? '0 0 0 3px rgba(239, 68, 68, 0.1)'
        : success
          ? '0 0 0 3px rgba(16, 185, 129, 0.1)'
          : '0 0 0 3px rgba(247, 115, 22, 0.1)',
      scale: 1.002,
      transition: {
        duration: 0.15,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  };

  const textareaElement = (
    <MotionDiv
      className={cn(
        'relative',
        'glass-input-container rounded-2xl overflow-visible',
        'border border-white/20 dark:border-white/10',
        'backdrop-blur-16 bg-white/5 dark:bg-black/20',
        'transition-all duration-200 ease-out',
        minimal && 'bg-transparent border-transparent',
        error && 'border-destructive/50',
        success && 'border-success/50',
        className
      )}
      variants={animated && !shouldReduceMotion ? containerVariants : undefined}
      initial="initial"
      animate={isFocused && animated ? 'focused' : 'initial'}
    >
      {/* Floating Label */}
      {floatingLabel && placeholder && (
        <motion.label
          className="absolute left-3 top-3 pointer-events-none z-10 font-medium"
          initial={{ y: 0, scale: 1, color: 'rgb(156, 163, 175)', opacity: 0.7 }}
          animate={{
            y: (isFocused || hasValue) ? -20 : 0,
            scale: (isFocused || hasValue) ? 0.85 : 1,
            color: (isFocused || hasValue) ? (error ? 'rgb(239, 68, 68)' : success ? 'rgb(16, 185, 129)' : 'rgb(247, 115, 22)') : 'rgb(156, 163, 175)',
            opacity: 1
          }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        >
          {placeholder}
        </motion.label>
      )}

      {/* Textarea Field */}
      <MotionTextarea
        ref={ref}
        rows={rows}
        className={cn(
          'w-full px-4 py-3 bg-transparent resize-none',
          'text-foreground/90 placeholder:text-muted-foreground/50',
          'border-none outline-none ring-0 focus:ring-0',
          'font-medium text-sm',
          floatingLabel && 'placeholder-transparent focus:placeholder-muted-foreground/30'
        )}
        placeholder={floatingLabel ? '' : placeholder}
        onFocus={handleFocus}
        onBlur={handleBlur}
        initial={animated && !shouldReduceMotion ? { opacity: 0.8 } : undefined}
        animate={animated && !shouldReduceMotion ? { opacity: 1 } : undefined}
        transition={animated && !shouldReduceMotion ? { duration: 0.2 } : undefined}
        {...props}
      />
    </MotionDiv>
  );

  return tooltip ? (
    <GlassTooltip content={tooltip}>
      {textareaElement}
    </GlassTooltip>
  ) : textareaElement;
});
AnimatedGlassTextarea.displayName = 'AnimatedGlassTextarea';

const AnimatedGlassSelect = React.forwardRef(({
  className,
  children,
  placeholder,
  tooltip,
  minimal = false,
  error = false,
  success = false,
  animated = true,
  icon,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const { shouldReduceMotion } = useResponsiveMotion();

  const MotionSelect = animated ? motion.select : 'select';
  const MotionDiv = animated ? motion.div : 'div';

  const containerVariants = {
    initial: {
      borderColor: 'rgba(255, 255, 255, 0.2)',
      backdropFilter: 'blur(16px) saturate(150%)'
    },
    focused: {
      borderColor: error ? 'rgba(239, 68, 68, 0.6)' : success ? 'rgba(16, 185, 129, 0.6)' : 'rgba(247, 115, 22, 0.6)',
      backdropFilter: 'blur(20px) saturate(180%)',
      boxShadow: error
        ? '0 0 0 3px rgba(239, 68, 68, 0.1)'
        : success
          ? '0 0 0 3px rgba(16, 185, 129, 0.1)'
          : '0 0 0 3px rgba(247, 115, 22, 0.1)',
      scale: 1.005,
      transition: {
        duration: 0.15,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  };

  const selectElement = (
    <MotionDiv
      className={cn(
        'relative',
        'glass-input-container rounded-2xl overflow-visible',
        'border border-white/20 dark:border-white/10',
        'backdrop-blur-16 bg-white/5 dark:bg-black/20',
        'transition-all duration-200 ease-out',
        minimal && 'bg-transparent border-transparent',
        error && 'border-destructive/50',
        success && 'border-success/50',
        className
      )}
      variants={animated && !shouldReduceMotion ? containerVariants : undefined}
      initial="initial"
      animate={isFocused && animated ? 'focused' : 'initial'}
    >
      {/* Left Icon */}
      {icon && (
        <motion.div
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/70 z-10 pointer-events-none"
          initial={{ opacity: 0.6, scale: 1 }}
          animate={{
            opacity: isFocused ? 0.8 : 0.6,
            scale: isFocused ? 1.05 : 1,
            color: isFocused ? (error ? 'rgb(239, 68, 68)' : success ? 'rgb(16, 185, 129)' : 'rgb(247, 115, 22)') : undefined
          }}
          transition={{ duration: 0.15 }}
        >
          {icon}
        </motion.div>
      )}

      {/* Select Field */}
      <MotionSelect
        ref={ref}
        className={cn(
          'w-full px-4 py-3 bg-transparent appearance-none',
          'text-foreground/90',
          'border-none outline-none ring-0 focus:ring-0',
          'font-medium text-sm cursor-pointer',
          icon && 'pl-10'
        )}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        initial={animated && !shouldReduceMotion ? { opacity: 0.8 } : undefined}
        animate={animated && !shouldReduceMotion ? { opacity: 1 } : undefined}
        transition={animated && !shouldReduceMotion ? { duration: 0.2 } : undefined}
        {...props}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {children}
      </MotionSelect>

      {/* Dropdown Arrow */}
      <motion.div
        className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
        initial={{ opacity: 0.6, rotate: 0 }}
        animate={{
          opacity: isFocused ? 0.8 : 0.6,
          rotate: isFocused ? 180 : 0
        }}
        transition={{ duration: 0.2 }}
      >
        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </motion.div>
    </MotionDiv>
  );

  return tooltip ? (
    <GlassTooltip content={tooltip}>
      {selectElement}
    </GlassTooltip>
  ) : selectElement;
});
AnimatedGlassSelect.displayName = 'AnimatedGlassSelect';

export {
  AnimatedGlassInput,
  AnimatedGlassTextarea,
  AnimatedGlassSelect
};

// Export with original names for backward compatibility
export {
  AnimatedGlassInput as GlassInput,
  AnimatedGlassTextarea as GlassTextarea,
  AnimatedGlassSelect as GlassSelect
};