import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { pageTransitions } from '../../lib/animations';
import { usePageTransition, useResponsiveMotion } from '../../hooks/useAnimations';

// Main Page Transition Wrapper
const PageTransition = ({
  children,
  direction = 'forward',
  type = 'liquidGlass',
  className,
  pageKey,
  ...props
}) => {
  const { shouldReduceMotion } = useResponsiveMotion();
  const transitionVariant = usePageTransition(direction);

  // Get predefined transition or use custom
  const variants = pageTransitions[type] || transitionVariant;

  if (shouldReduceMotion) {
    return (
      <div className={cn('w-full min-h-screen', className)} {...props}>
        {children}
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pageKey}
        className={cn(
          'w-full min-h-screen',
          'will-change-transform will-change-opacity will-change-filter',
          className
        )}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{
          transformOrigin: direction === 'forward' ? 'left center' : 'right center'
        }}
        {...props}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// Slide Transition (for navigation)
const SlideTransition = ({
  children,
  direction = 'right',
  className,
  pageKey,
  duration = 0.4,
  ...props
}) => {
  const { shouldReduceMotion } = useResponsiveMotion();

  const slideVariants = {
    initial: (direction) => ({
      x: direction === 'right' ? 100 : direction === 'left' ? -100 : 0,
      y: direction === 'down' ? 100 : direction === 'up' ? -100 : 0,
      opacity: 0,
      filter: 'blur(4px)'
    }),
    animate: {
      x: 0,
      y: 0,
      opacity: 1,
      filter: 'blur(0px)',
      transition: {
        duration: duration,
        ease: [0.4, 0, 0.2, 1]
      }
    },
    exit: (direction) => ({
      x: direction === 'right' ? -100 : direction === 'left' ? 100 : 0,
      y: direction === 'down' ? -100 : direction === 'up' ? 100 : 0,
      opacity: 0,
      filter: 'blur(4px)',
      transition: {
        duration: duration * 0.7,
        ease: [0.4, 0, 1, 1]
      }
    })
  };

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        className={cn('w-full', className)}
        custom={direction}
        variants={slideVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        {...props}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// Fade Transition with Glass Effect
const FadeGlassTransition = ({
  children,
  className,
  pageKey,
  duration = 0.3,
  ...props
}) => {
  const { shouldReduceMotion } = useResponsiveMotion();

  const fadeVariants = {
    initial: {
      opacity: 0,
      scale: 0.95,
      filter: 'blur(8px)',
      backdropFilter: 'blur(0px)'
    },
    animate: {
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      backdropFilter: 'blur(20px)',
      transition: {
        duration: duration,
        ease: [0.4, 0, 0.2, 1]
      }
    },
    exit: {
      opacity: 0,
      scale: 1.05,
      filter: 'blur(4px)',
      backdropFilter: 'blur(40px)',
      transition: {
        duration: duration * 0.7,
        ease: [0.4, 0, 1, 1]
      }
    }
  };

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        className={cn('w-full', className)}
        variants={fadeVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        {...props}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// Modal/Overlay Transition
const ModalTransition = ({
  children,
  visible = false,
  onClose,
  className,
  overlayClassName,
  backdrop = true,
  closeOnBackdrop = true,
  ...props
}) => {
  const { shouldReduceMotion } = useResponsiveMotion();

  const overlayVariants = {
    initial: {
      opacity: 0,
      backdropFilter: 'blur(0px)'
    },
    animate: {
      opacity: 1,
      backdropFilter: 'blur(20px)',
      transition: {
        duration: 0.2,
        ease: [0.4, 0, 0.2, 1]
      }
    },
    exit: {
      opacity: 0,
      backdropFilter: 'blur(0px)',
      transition: {
        duration: 0.15,
        ease: [0.4, 0, 1, 1],
        delay: 0.05
      }
    }
  };

  const modalVariants = {
    initial: {
      opacity: 0,
      scale: 0.9,
      y: 20,
      filter: 'blur(4px)'
    },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        duration: 0.3,
        ease: [0.34, 1.56, 0.64, 1]
      }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: -10,
      filter: 'blur(4px)',
      transition: {
        duration: 0.2,
        ease: [0.4, 0, 1, 1]
      }
    }
  };

  if (shouldReduceMotion) {
    if (!visible) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {backdrop && (
          <div
            className={cn('absolute inset-0 bg-black/50', overlayClassName)}
            onClick={closeOnBackdrop ? onClose : undefined}
          />
        )}
        <div className={cn('relative z-10', className)} {...props}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          {backdrop && (
            <motion.div
              className={cn('absolute inset-0 bg-black/50', overlayClassName)}
              variants={overlayVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              onClick={closeOnBackdrop ? onClose : undefined}
            />
          )}

          {/* Modal Content */}
          <motion.div
            className={cn('relative z-10', className)}
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            {...props}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Staggered Children Transition
const StaggerTransition = ({
  children,
  className,
  staggerDelay = 0.1,
  duration = 0.3,
  ...props
}) => {
  const { shouldReduceMotion } = useResponsiveMotion();

  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        duration: 0.1,
        staggerChildren: shouldReduceMotion ? 0 : staggerDelay,
        delayChildren: shouldReduceMotion ? 0 : 0.1
      }
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 0.1,
        staggerChildren: shouldReduceMotion ? 0 : staggerDelay * 0.5,
        staggerDirection: -1
      }
    }
  };

  const itemVariants = {
    initial: {
      opacity: 0,
      y: 20,
      filter: 'blur(4px)',
      scale: 0.95
    },
    animate: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      scale: 1,
      transition: {
        duration: shouldReduceMotion ? 0 : duration,
        ease: [0.4, 0, 0.2, 1]
      }
    },
    exit: {
      opacity: 0,
      y: -10,
      filter: 'blur(4px)',
      scale: 0.95,
      transition: {
        duration: shouldReduceMotion ? 0 : duration * 0.7,
        ease: [0.4, 0, 1, 1]
      }
    }
  };

  return (
    <motion.div
      className={cn('w-full', className)}
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      {...props}
    >
      {React.Children.map(children, (child, index) =>
        child ? (
          <motion.div key={index} variants={itemVariants}>
            {child}
          </motion.div>
        ) : null
      )}
    </motion.div>
  );
};

// Route Transition Hook for navigation
export const useRouteTransition = (currentRoute) => {
  const getTransitionType = (from, to) => {
    // Define transition types based on route hierarchy
    const routes = {
      'form-list': 0,
      'form-builder': 1,
      'submission-list': 1,
      'main-form-detail': 2,
      'main-form-entry': 2,
      'sub-form-entry': 3,
      'sub-form-detail': 3,
      'settings': 1
    };

    const fromLevel = routes[from] || 0;
    const toLevel = routes[to] || 0;

    if (toLevel > fromLevel) {
      return { direction: 'forward', type: 'slideLeft' };
    } else if (toLevel < fromLevel) {
      return { direction: 'backward', type: 'slideRight' };
    } else {
      return { direction: 'neutral', type: 'fadeGlass' };
    }
  };

  return { getTransitionType };
};

export {
  PageTransition,
  SlideTransition,
  FadeGlassTransition,
  ModalTransition,
  StaggerTransition
};