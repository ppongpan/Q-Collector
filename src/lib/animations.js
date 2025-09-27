/**
 * iOS 26 Liquid Glass Animation System
 * Enhanced animation library with liquid-glass morphism effects
 * Built for 60fps performance across all devices
 */

// Core animation configuration
export const ANIMATION_CONFIG = {
  // Timing
  timing: {
    fast: 150,        // Micro-interactions
    medium: 250,      // Component animations
    slow: 400,        // Page transitions
    ultra: 600        // Complex sequences
  },

  // iOS-like easing curves (Framer Motion format)
  easing: {
    // Main iOS curve - natural and responsive
    ios: [0.4, 0, 0.2, 1],
    // Sharp entrance
    entrance: [0.34, 1.56, 0.64, 1],
    // Smooth exit
    exit: [0.4, 0, 1, 1],
    // Bouncy feel
    bounce: [0.68, -0.55, 0.265, 1.55],
    // Liquid motion
    liquid: [0.25, 0.46, 0.45, 0.94],
    // Glass slide
    glass: [0.19, 1, 0.22, 1]
  },

  // Transform origins for glass effects
  transformOrigin: {
    center: '50% 50%',
    top: '50% 0%',
    bottom: '50% 100%',
    left: '0% 50%',
    right: '100% 50%'
  }
};

// Page transition variants with liquid-glass effects
export const pageTransitions = {
  // Main page transition with glass morphism
  liquidGlass: {
    initial: {
      opacity: 0,
      scale: 0.96,
      filter: 'blur(8px)',
      backdropFilter: 'blur(0px) saturate(100%)'
    },
    animate: {
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      backdropFilter: 'blur(20px) saturate(180%)',
      transition: {
        duration: ANIMATION_CONFIG.timing.slow / 1000,
        ease: ANIMATION_CONFIG.easing.ios,
        staggerChildren: 0.05
      }
    },
    exit: {
      opacity: 0,
      scale: 1.04,
      filter: 'blur(4px)',
      backdropFilter: 'blur(40px) saturate(120%)',
      transition: {
        duration: ANIMATION_CONFIG.timing.medium / 1000,
        ease: ANIMATION_CONFIG.easing.exit
      }
    }
  },

  // Slide transitions for navigation
  slideLeft: {
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
  },

  slideRight: {
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
  },

  // Modal/overlay transitions
  modalGlass: {
    initial: {
      opacity: 0,
      scale: 0.9,
      backdropFilter: 'blur(0px)',
      y: 20
    },
    animate: {
      opacity: 1,
      scale: 1,
      backdropFilter: 'blur(20px)',
      y: 0,
      transition: {
        duration: ANIMATION_CONFIG.timing.medium / 1000,
        ease: ANIMATION_CONFIG.easing.bounce
      }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      backdropFilter: 'blur(0px)',
      y: 10,
      transition: {
        duration: ANIMATION_CONFIG.timing.fast / 1000,
        ease: ANIMATION_CONFIG.easing.exit
      }
    }
  }
};

// Component animation variants
export const componentVariants = {
  // Glass card animations
  glassCard: {
    initial: {
      opacity: 0,
      y: 20,
      scale: 0.95,
      filter: 'blur(4px)',
      backdropFilter: 'blur(0px) saturate(100%)'
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      backdropFilter: 'blur(20px) saturate(180%)',
      transition: {
        duration: ANIMATION_CONFIG.timing.medium / 1000,
        ease: ANIMATION_CONFIG.easing.glass
      }
    },
    hover: {
      scale: 1.015,
      y: -2,
      backdropFilter: 'blur(24px) saturate(200%)',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
      transition: {
        duration: ANIMATION_CONFIG.timing.fast / 1000,
        ease: ANIMATION_CONFIG.easing.liquid
      }
    },
    tap: {
      scale: 0.98,
      transition: {
        duration: 0.1,
        ease: ANIMATION_CONFIG.easing.ios
      }
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      y: -10,
      filter: 'blur(8px)',
      transition: {
        duration: ANIMATION_CONFIG.timing.fast / 1000,
        ease: ANIMATION_CONFIG.easing.exit
      }
    }
  },

  // Button animations with glass effects
  glassButton: {
    initial: { scale: 1, backdropFilter: 'blur(20px) saturate(150%)' },
    hover: {
      scale: 1.02,
      backdropFilter: 'blur(24px) saturate(180%)',
      boxShadow: '0 8px 32px rgba(247, 115, 22, 0.3)',
      transition: {
        duration: ANIMATION_CONFIG.timing.fast / 1000,
        ease: ANIMATION_CONFIG.easing.liquid
      }
    },
    tap: {
      scale: 0.97,
      backdropFilter: 'blur(16px) saturate(120%)',
      transition: {
        duration: 0.1,
        ease: ANIMATION_CONFIG.easing.ios
      }
    },
    focus: {
      boxShadow: '0 0 0 3px rgba(247, 115, 22, 0.3)',
      transition: {
        duration: ANIMATION_CONFIG.timing.fast / 1000,
        ease: ANIMATION_CONFIG.easing.ios
      }
    }
  },

  // Input field animations
  glassInput: {
    initial: {
      borderColor: 'rgba(255, 255, 255, 0.2)',
      backdropFilter: 'blur(16px) saturate(150%)'
    },
    focus: {
      borderColor: 'rgba(247, 115, 22, 0.6)',
      backdropFilter: 'blur(20px) saturate(180%)',
      boxShadow: '0 0 0 3px rgba(247, 115, 22, 0.1)',
      scale: 1.005,
      transition: {
        duration: ANIMATION_CONFIG.timing.fast / 1000,
        ease: ANIMATION_CONFIG.easing.ios
      }
    },
    error: {
      borderColor: 'rgba(239, 68, 68, 0.6)',
      boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)',
      x: [0, -2, 2, -2, 2, 0],
      transition: {
        duration: 0.4,
        ease: ANIMATION_CONFIG.easing.bounce
      }
    }
  },

  // List item stagger animations
  listItem: {
    initial: {
      opacity: 0,
      x: -20,
      filter: 'blur(4px)'
    },
    animate: (index) => ({
      opacity: 1,
      x: 0,
      filter: 'blur(0px)',
      transition: {
        duration: ANIMATION_CONFIG.timing.medium / 1000,
        delay: index * 0.05,
        ease: ANIMATION_CONFIG.easing.glass
      }
    }),
    exit: (index) => ({
      opacity: 0,
      x: 20,
      filter: 'blur(4px)',
      transition: {
        duration: ANIMATION_CONFIG.timing.fast / 1000,
        delay: index * 0.02,
        ease: ANIMATION_CONFIG.easing.exit
      }
    })
  },

  // Navigation animations
  navigation: {
    initial: {
      opacity: 0,
      y: -20,
      backdropFilter: 'blur(0px)'
    },
    animate: {
      opacity: 1,
      y: 0,
      backdropFilter: 'blur(40px) saturate(180%)',
      transition: {
        duration: ANIMATION_CONFIG.timing.medium / 1000,
        ease: ANIMATION_CONFIG.easing.glass
      }
    }
  }
};

// Loading state animations with glass effects
export const loadingVariants = {
  // Skeleton shimmer with glass effect
  glassSkeleton: {
    initial: {
      backgroundPosition: '-200px 0'
    },
    animate: {
      backgroundPosition: 'calc(200px + 100%) 0',
      transition: {
        duration: 1.5,
        ease: 'linear',
        repeat: Infinity
      }
    }
  },

  // Spinning loader with glass morphism
  glassSpinner: {
    animate: {
      rotate: 360,
      transition: {
        duration: 1,
        ease: 'linear',
        repeat: Infinity
      }
    }
  },

  // Pulsing dot loader
  pulseDot: {
    animate: {
      scale: [1, 1.2, 1],
      opacity: [0.5, 1, 0.5],
      backdropFilter: ['blur(10px)', 'blur(20px)', 'blur(10px)'],
      transition: {
        duration: 1.5,
        ease: ANIMATION_CONFIG.easing.liquid,
        repeat: Infinity
      }
    }
  },

  // Progress bar with glass effect
  glassProgress: {
    initial: { width: '0%', opacity: 0 },
    animate: {
      width: '100%',
      opacity: 1,
      transition: {
        duration: 2,
        ease: ANIMATION_CONFIG.easing.ios
      }
    }
  }
};

// Micro-interaction variants
export const microInteractions = {
  // Icon hover effects
  iconHover: {
    hover: {
      scale: 1.1,
      rotate: 5,
      filter: 'drop-shadow(0 4px 12px rgba(247, 115, 22, 0.3))',
      transition: {
        duration: ANIMATION_CONFIG.timing.fast / 1000,
        ease: ANIMATION_CONFIG.easing.bounce
      }
    },
    tap: {
      scale: 0.9,
      rotate: -5,
      transition: {
        duration: 0.1,
        ease: ANIMATION_CONFIG.easing.ios
      }
    }
  },

  // Badge animations
  badge: {
    initial: { scale: 0, opacity: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 500,
        damping: 25
      }
    },
    hover: {
      scale: 1.05,
      transition: {
        duration: ANIMATION_CONFIG.timing.fast / 1000,
        ease: ANIMATION_CONFIG.easing.liquid
      }
    }
  },

  // Toggle switch with liquid effect
  liquidToggle: {
    initial: { x: 0 },
    animate: (isOn) => ({
      x: isOn ? 24 : 0,
      backgroundColor: isOn ? 'rgba(247, 115, 22, 1)' : 'rgba(156, 163, 175, 1)',
      transition: {
        type: 'spring',
        stiffness: 700,
        damping: 30
      }
    })
  }
};

// Gesture variants for touch interactions
export const gestureVariants = {
  // Swipe detection
  swipeLeft: {
    x: { min: -100, max: 0 }
  },
  swipeRight: {
    x: { min: 0, max: 100 }
  },

  // Drag constraints
  dragConstraints: {
    left: -50,
    right: 50,
    top: -50,
    bottom: 50
  },

  // Pull to refresh
  pullToRefresh: {
    y: { min: 0, max: 100 }
  }
};

// Glass shine effect keyframes (for CSS animation)
export const glassShineKeyframes = `
  @keyframes glass-shine {
    0% {
      transform: translateX(-100%) skewX(-15deg);
      opacity: 0;
    }
    50% {
      opacity: 1;
    }
    100% {
      transform: translateX(200%) skewX(-15deg);
      opacity: 0;
    }
  }

  .glass-shine {
    position: relative;
    overflow: hidden;
  }

  .glass-shine::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
    animation: glass-shine 2s infinite;
    pointer-events: none;
  }

  .dark .glass-shine::before {
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.1),
      transparent
    );
  }
`;

// Performance optimization utilities
export const performanceConfig = {
  // Use will-change for better performance
  willChange: {
    transform: { willChange: 'transform' },
    opacity: { willChange: 'opacity' },
    filter: { willChange: 'filter' },
    backdrop: { willChange: 'backdrop-filter' },
    all: { willChange: 'transform, opacity, filter, backdrop-filter' }
  },

  // Hardware acceleration
  hardwareAcceleration: {
    transform: 'translateZ(0)',
    backfaceVisibility: 'hidden',
    perspective: 1000
  },

  // Reduced motion preferences
  respectsReducedMotion: {
    transition: 'none',
    animation: 'none'
  }
};

// Animation presets for common use cases
export const animationPresets = {
  // Fade in with glass effect
  fadeInGlass: {
    initial: { opacity: 0, filter: 'blur(8px)' },
    animate: {
      opacity: 1,
      filter: 'blur(0px)',
      transition: {
        duration: ANIMATION_CONFIG.timing.medium / 1000,
        ease: ANIMATION_CONFIG.easing.glass
      }
    }
  },

  // Scale in with bounce
  scaleInBounce: {
    initial: { scale: 0, opacity: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 25
      }
    }
  },

  // Slide up with glass
  slideUpGlass: {
    initial: { y: 50, opacity: 0, filter: 'blur(4px)' },
    animate: {
      y: 0,
      opacity: 1,
      filter: 'blur(0px)',
      transition: {
        duration: ANIMATION_CONFIG.timing.medium / 1000,
        ease: ANIMATION_CONFIG.easing.glass
      }
    }
  },

  // Liquid reveal
  liquidReveal: {
    initial: {
      scaleY: 0,
      originY: 0,
      filter: 'blur(8px)',
      backdropFilter: 'blur(0px)'
    },
    animate: {
      scaleY: 1,
      filter: 'blur(0px)',
      backdropFilter: 'blur(20px)',
      transition: {
        duration: ANIMATION_CONFIG.timing.slow / 1000,
        ease: ANIMATION_CONFIG.easing.liquid
      }
    }
  }
};

const animationsLibrary = {
  ANIMATION_CONFIG,
  pageTransitions,
  componentVariants,
  loadingVariants,
  microInteractions,
  gestureVariants,
  glassShineKeyframes,
  performanceConfig,
  animationPresets
};

export default animationsLibrary;