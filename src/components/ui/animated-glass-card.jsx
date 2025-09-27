import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useGlassCardAnimation, useScrollAnimation } from '../../hooks/useAnimations';
import { componentVariants } from '../../lib/animations';

const AnimatedGlassCard = React.forwardRef(({
  className,
  variant = 'base',
  children,
  animated = true,
  scrollTrigger = false,
  hoverEffect = true,
  ...props
}, ref) => {
  const { controls, animateHover, animateLeave, initial } = useGlassCardAnimation();
  const { ref: scrollRef, isInView } = useScrollAnimation();

  const variants = {
    base: 'glass-container',
    elevated: 'glass-elevated',
    floating: 'glass-floating',
    primary: 'glass-primary glass-container'
  };

  const MotionDiv = animated ? motion.div : 'div';

  const motionProps = animated ? {
    ref: scrollTrigger ? scrollRef : ref,
    animate: scrollTrigger ? (isInView ? 'animate' : 'initial') : 'animate',
    initial: 'initial',
    variants: componentVariants.glassCard,
    whileHover: hoverEffect ? 'hover' : undefined,
    whileTap: hoverEffect ? 'tap' : undefined,
    style: {
      transformOrigin: 'center center',
      willChange: 'transform, opacity, filter, backdrop-filter'
    }
  } : {};

  return (
    <MotionDiv
      ref={!scrollTrigger ? ref : undefined}
      className={cn(
        'rounded-2xl overflow-visible relative group',
        'glass-shine', // Add shine effect
        variants[variant],
        animated && 'animate-glass-in',
        className
      )}
      {...motionProps}
      {...props}
    >
      {children}

      {/* Glass shine overlay for hover effects */}
      {hoverEffect && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 dark:via-white/5" />
        </div>
      )}
    </MotionDiv>
  );
});
AnimatedGlassCard.displayName = 'AnimatedGlassCard';

const AnimatedGlassCardHeader = React.forwardRef(({
  className,
  children,
  animated = true,
  ...props
}, ref) => {
  const MotionDiv = animated ? motion.div : 'div';

  return (
    <MotionDiv
      ref={ref}
      className={cn('p-6 pb-2', className)}
      initial={animated ? { opacity: 0, y: 10 } : undefined}
      animate={animated ? { opacity: 1, y: 0 } : undefined}
      transition={animated ? { delay: 0.1, duration: 0.3 } : undefined}
      {...props}
    >
      {children}
    </MotionDiv>
  );
});
AnimatedGlassCardHeader.displayName = 'AnimatedGlassCardHeader';

const AnimatedGlassCardTitle = React.forwardRef(({
  className,
  children,
  animated = true,
  ...props
}, ref) => {
  const MotionComponent = animated ? motion.h3 : 'h3';

  return (
    <MotionComponent
      ref={ref}
      className={cn(
        'text-lg font-semibold leading-none tracking-tight',
        'text-foreground/90',
        className
      )}
      initial={animated ? { opacity: 0, x: -10 } : undefined}
      animate={animated ? { opacity: 1, x: 0 } : undefined}
      transition={animated ? { delay: 0.2, duration: 0.3 } : undefined}
      {...props}
    >
      {children}
    </MotionComponent>
  );
});
AnimatedGlassCardTitle.displayName = 'AnimatedGlassCardTitle';

const AnimatedGlassCardDescription = React.forwardRef(({
  className,
  children,
  minimal = false,
  animated = true,
  ...props
}, ref) => {
  const MotionComponent = animated ? motion.p : 'p';

  return (
    <MotionComponent
      ref={ref}
      className={cn(
        'text-sm text-muted-foreground mt-1',
        minimal && 'text-muted-foreground/60 transition-all duration-200 group-hover:text-muted-foreground/85 group-hover:font-medium',
        className
      )}
      initial={animated ? { opacity: 0, y: 5 } : undefined}
      animate={animated ? { opacity: 1, y: 0 } : undefined}
      transition={animated ? { delay: 0.3, duration: 0.3 } : undefined}
      {...props}
    >
      {children}
    </MotionComponent>
  );
});
AnimatedGlassCardDescription.displayName = 'AnimatedGlassCardDescription';

const AnimatedGlassCardContent = React.forwardRef(({
  className,
  children,
  animated = true,
  stagger = false,
  ...props
}, ref) => {
  const MotionDiv = animated ? motion.div : 'div';

  const staggerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  return (
    <MotionDiv
      ref={ref}
      className={cn('p-6 pt-2', className)}
      initial={animated ? (stagger ? 'hidden' : { opacity: 0, y: 10 }) : undefined}
      animate={animated ? (stagger ? 'visible' : { opacity: 1, y: 0 }) : undefined}
      variants={stagger ? staggerVariants : undefined}
      transition={animated && !stagger ? { delay: 0.2, duration: 0.3 } : undefined}
      {...props}
    >
      {children}
    </MotionDiv>
  );
});
AnimatedGlassCardContent.displayName = 'AnimatedGlassCardContent';

const AnimatedGlassCardFooter = React.forwardRef(({
  className,
  children,
  animated = true,
  ...props
}, ref) => {
  const MotionDiv = animated ? motion.div : 'div';

  return (
    <MotionDiv
      ref={ref}
      className={cn('p-6 pt-0 flex items-center gap-3', className)}
      initial={animated ? { opacity: 0, y: 10 } : undefined}
      animate={animated ? { opacity: 1, y: 0 } : undefined}
      transition={animated ? { delay: 0.4, duration: 0.3 } : undefined}
      {...props}
    >
      {children}
    </MotionDiv>
  );
});
AnimatedGlassCardFooter.displayName = 'AnimatedGlassCardFooter';

export {
  AnimatedGlassCard,
  AnimatedGlassCardHeader,
  AnimatedGlassCardTitle,
  AnimatedGlassCardDescription,
  AnimatedGlassCardContent,
  AnimatedGlassCardFooter
};

// Also export with original names for backward compatibility
export {
  AnimatedGlassCard as GlassCard,
  AnimatedGlassCardHeader as GlassCardHeader,
  AnimatedGlassCardTitle as GlassCardTitle,
  AnimatedGlassCardDescription as GlassCardDescription,
  AnimatedGlassCardContent as GlassCardContent,
  AnimatedGlassCardFooter as GlassCardFooter
};