import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import GlassTooltip from './glass-tooltip';
import { componentVariants, microInteractions } from '../../lib/animations';
import { useResponsiveMotion } from '../../hooks/useAnimations';

const AnimatedGlassButton = React.forwardRef(({
  className,
  variant = 'default',
  size = 'default',
  tooltip,
  children,
  disabled,
  animated = true,
  hoverEffect = true,
  ripple = false,
  shine = false,
  ...props
}, ref) => {
  const { shouldReduceMotion, getVariant } = useResponsiveMotion();

  const variants = {
    default: 'btn-glass',
    primary: 'btn-glass-primary',
    ghost: 'btn-glass hover:bg-glass-elevated/50',
    icon: 'icon-glass p-0 w-10 h-10'
  };

  const sizes = {
    default: 'px-6 py-3 text-base min-h-12',
    sm: 'px-5 py-3 text-sm min-h-10',
    lg: 'px-8 py-4 text-lg min-h-14',
    icon: 'w-12 h-12 p-0'
  };

  const MotionButton = animated ? motion.button : 'button';

  const motionProps = animated && !shouldReduceMotion ? {
    variants: componentVariants.glassButton,
    initial: 'initial',
    animate: 'initial',
    whileHover: hoverEffect && !disabled ? 'hover' : undefined,
    whileTap: !disabled ? 'tap' : undefined,
    whileFocus: !disabled ? 'focus' : undefined,
    style: {
      willChange: 'transform, opacity, filter, backdrop-filter, box-shadow'
    }
  } : {};

  const buttonElement = (
    <MotionButton
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-xl font-medium',
        'transition-all duration-200 ease-out relative overflow-hidden',
        'focus-glass disabled:opacity-50 disabled:pointer-events-none',
        shine && 'glass-shine',
        ripple && 'glass-ripple',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled}
      {...motionProps}
      {...props}
    >
      {/* Ripple effect container */}
      {ripple && (
        <span className="absolute inset-0 overflow-hidden rounded-xl">
          <span className="absolute inset-0 bg-gradient-radial from-white/30 to-transparent scale-0 rounded-full transition-transform duration-300 group-active:scale-100 dark:from-white/20" />
        </span>
      )}

      {/* Button content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>

      {/* Shine effect overlay */}
      {shine && (
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-out dark:via-white/10" />
      )}

      {/* Glass morphism enhancement on hover */}
      {hoverEffect && (
        <span className="absolute inset-0 bg-gradient-to-t from-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 dark:from-white/2 dark:to-white/5" />
      )}
    </MotionButton>
  );

  // Icon-specific animation wrapper
  if (size === 'icon') {
    const iconMotionProps = animated && !shouldReduceMotion ? {
      variants: microInteractions.iconHover,
      whileHover: hoverEffect && !disabled ? 'hover' : undefined,
      whileTap: !disabled ? 'tap' : undefined
    } : {};

    const wrappedButton = animated ? (
      <motion.div {...iconMotionProps}>
        {buttonElement}
      </motion.div>
    ) : buttonElement;

    return tooltip ? (
      <GlassTooltip content={tooltip} disabled={disabled}>
        {wrappedButton}
      </GlassTooltip>
    ) : wrappedButton;
  }

  // Regular button with tooltip
  if (tooltip) {
    return (
      <GlassTooltip content={tooltip} disabled={disabled}>
        {buttonElement}
      </GlassTooltip>
    );
  }

  return buttonElement;
});
AnimatedGlassButton.displayName = 'AnimatedGlassButton';

// Enhanced button variants for specific use cases
const AnimatedGlassIconButton = React.forwardRef((props, ref) => (
  <AnimatedGlassButton
    ref={ref}
    size="icon"
    variant="ghost"
    hoverEffect={true}
    animated={true}
    {...props}
  />
));
AnimatedGlassIconButton.displayName = 'AnimatedGlassIconButton';

const AnimatedGlassPrimaryButton = React.forwardRef((props, ref) => (
  <AnimatedGlassButton
    ref={ref}
    variant="primary"
    hoverEffect={true}
    animated={true}
    shine={true}
    ripple={true}
    {...props}
  />
));
AnimatedGlassPrimaryButton.displayName = 'AnimatedGlassPrimaryButton';

const AnimatedGlassFloatingButton = React.forwardRef(({
  className,
  ...props
}, ref) => (
  <AnimatedGlassButton
    ref={ref}
    className={cn(
      'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg',
      'backdrop-blur-xl bg-primary/90 hover:bg-primary',
      'border border-white/20',
      className
    )}
    size="icon"
    variant="primary"
    hoverEffect={true}
    animated={true}
    shine={true}
    ripple={true}
    {...props}
  />
));
AnimatedGlassFloatingButton.displayName = 'AnimatedGlassFloatingButton';

export {
  AnimatedGlassButton,
  AnimatedGlassIconButton,
  AnimatedGlassPrimaryButton,
  AnimatedGlassFloatingButton
};

// Export with original name for backward compatibility
export { AnimatedGlassButton as GlassButton };