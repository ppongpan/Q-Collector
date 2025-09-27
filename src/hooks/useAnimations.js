/**
 * Simplified Animation Hooks for iOS 26 Liquid Glass System
 * Performance-optimized hooks for animation patterns
 */

import { useAnimation, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useCallback, useState } from 'react';
import { ANIMATION_CONFIG, componentVariants } from '../lib/animations';

// Hook for respecting user's reduced motion preference
export const useResponsiveMotion = () => {
  const shouldReduceMotion = useReducedMotion();

  return {
    shouldReduceMotion,
    getTransition: (transition) =>
      shouldReduceMotion ? { duration: 0 } : transition,
    getVariant: (variant) =>
      shouldReduceMotion ? { ...variant, transition: { duration: 0 } } : variant
  };
};

// Hook for glass card animations
export const useGlassCardAnimation = () => {
  const controls = useAnimation();
  const { shouldReduceMotion, getVariant } = useResponsiveMotion();

  const animateIn = useCallback(() => {
    if (shouldReduceMotion) return;
    controls.start(getVariant(componentVariants.glassCard.animate));
  }, [controls, shouldReduceMotion, getVariant]);

  const animateOut = useCallback(() => {
    if (shouldReduceMotion) return;
    controls.start(getVariant(componentVariants.glassCard.exit));
  }, [controls, shouldReduceMotion, getVariant]);

  const animateHover = useCallback(() => {
    if (shouldReduceMotion) return;
    controls.start(getVariant(componentVariants.glassCard.hover));
  }, [controls, shouldReduceMotion, getVariant]);

  const animateLeave = useCallback(() => {
    if (shouldReduceMotion) return;
    controls.start(getVariant({
      scale: 1,
      y: 0,
      backdropFilter: 'blur(20px) saturate(180%)',
      boxShadow: 'none',
      transition: {
        duration: ANIMATION_CONFIG.timing.fast / 1000,
        ease: ANIMATION_CONFIG.easing.ios
      }
    }));
  }, [controls, shouldReduceMotion, getVariant]);

  return {
    controls,
    animateIn,
    animateOut,
    animateHover,
    animateLeave,
    initial: getVariant(componentVariants.glassCard.initial)
  };
};

// Hook for staggered list animations
export const useStaggeredAnimation = (itemCount) => {
  const [isVisible, setIsVisible] = useState(false);
  const { shouldReduceMotion } = useResponsiveMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: shouldReduceMotion ? 0 : ANIMATION_CONFIG.timing.medium / 1000,
        staggerChildren: shouldReduceMotion ? 0 : 0.05,
        delayChildren: shouldReduceMotion ? 0 : 0.1
      }
    }
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      filter: 'blur(4px)',
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      scale: 1,
      transition: {
        duration: shouldReduceMotion ? 0 : ANIMATION_CONFIG.timing.medium / 1000,
        ease: ANIMATION_CONFIG.easing.glass
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return {
    containerVariants,
    itemVariants,
    isVisible,
    animate: isVisible ? 'visible' : 'hidden'
  };
};

// Hook for smooth page transitions
export const usePageTransition = (direction = 'forward') => {
  const { shouldReduceMotion } = useResponsiveMotion();

  if (shouldReduceMotion) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 }
    };
  }

  switch (direction) {
    case 'forward':
      return {
        initial: { x: 100, opacity: 0, filter: 'blur(4px)' },
        animate: {
          x: 0,
          opacity: 1,
          filter: 'blur(0px)',
          transition: {
            duration: ANIMATION_CONFIG.timing.slow / 1000,
            ease: ANIMATION_CONFIG.easing.glass
          }
        },
        exit: {
          x: -100,
          opacity: 0,
          filter: 'blur(4px)',
          transition: {
            duration: ANIMATION_CONFIG.timing.medium / 1000,
            ease: ANIMATION_CONFIG.easing.exit
          }
        }
      };
    case 'backward':
      return {
        initial: { x: -100, opacity: 0, filter: 'blur(4px)' },
        animate: {
          x: 0,
          opacity: 1,
          filter: 'blur(0px)',
          transition: {
            duration: ANIMATION_CONFIG.timing.slow / 1000,
            ease: ANIMATION_CONFIG.easing.glass
          }
        },
        exit: {
          x: 100,
          opacity: 0,
          filter: 'blur(4px)',
          transition: {
            duration: ANIMATION_CONFIG.timing.medium / 1000,
            ease: ANIMATION_CONFIG.easing.exit
          }
        }
      };
    default:
      return {
        initial: {
          opacity: 0,
          scale: 0.96,
          filter: 'blur(8px)'
        },
        animate: {
          opacity: 1,
          scale: 1,
          filter: 'blur(0px)',
          transition: {
            duration: ANIMATION_CONFIG.timing.slow / 1000,
            ease: ANIMATION_CONFIG.easing.ios
          }
        },
        exit: {
          opacity: 0,
          scale: 1.04,
          filter: 'blur(4px)',
          transition: {
            duration: ANIMATION_CONFIG.timing.medium / 1000,
            ease: ANIMATION_CONFIG.easing.exit
          }
        }
      };
  }
};

// Hook for scroll-triggered animations
export const useScrollAnimation = (threshold = 0.1) => {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold]);

  return { ref, isInView };
};

// Hook for performance monitoring
export const useAnimationPerformance = () => {
  const frameRate = useRef(0);
  const [performanceWarning, setPerformanceWarning] = useState(false);

  useEffect(() => {
    let lastTime = performance.now();
    let frameCount = 0;

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime - lastTime >= 1000) {
        frameRate.current = Math.round((frameCount * 1000) / (currentTime - lastTime));

        // Warn if FPS drops below 45
        if (frameRate.current < 45) {
          setPerformanceWarning(true);
        } else {
          setPerformanceWarning(false);
        }

        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(measureFPS);
    };

    const rafId = requestAnimationFrame(measureFPS);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return {
    currentFPS: frameRate.current,
    performanceWarning,
    isPerformant: frameRate.current >= 50
  };
};
// Hook for loading states with glass effects
export const useGlassLoader = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { shouldReduceMotion } = useResponsiveMotion();

  const spinnerVariants = {
    animate: shouldReduceMotion ? {} : {
      rotate: 360,
      transition: {
        duration: 1,
        ease: "linear",
        repeat: Infinity
      }
    }
  };

  const pulseVariants = {
    animate: shouldReduceMotion ? {} : {
      scale: [1, 1.1, 1],
      opacity: [0.5, 1, 0.5],
      transition: {
        duration: 1.5,
        ease: [0.25, 0.46, 0.45, 0.94],
        repeat: Infinity
      }
    }
  };

  const skeletonVariants = {
    animate: shouldReduceMotion ? {} : {
      backgroundPosition: ["0px 0", "200px 0", "400px 0"],
      transition: {
        duration: 1.5,
        ease: "linear",
        repeat: Infinity
      }
    }
  };

  return {
    isLoading,
    setIsLoading,
    spinnerVariants,
    pulseVariants,
    skeletonVariants
  };
};

