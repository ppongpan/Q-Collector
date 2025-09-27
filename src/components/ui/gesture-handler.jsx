import React, { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useResponsiveMotion } from '../../hooks/useAnimations';

// Simple swipeable container with glass effects
export const SwipeableGlassContainer = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  className,
  disabled = false,
  ...props
}) => {
  const { shouldReduceMotion } = useResponsiveMotion();

  const handleDragEnd = useCallback((event, info) => {
    if (disabled) return;

    const { offset, velocity } = info;
    const swipeThreshold = Math.abs(velocity.x) > 500 || Math.abs(offset.x) > threshold;

    if (swipeThreshold) {
      if (offset.x > 0 && onSwipeRight) {
        onSwipeRight(info);
      } else if (offset.x < 0 && onSwipeLeft) {
        onSwipeLeft(info);
      }
    }
  }, [disabled, onSwipeLeft, onSwipeRight, threshold]);

  if (shouldReduceMotion || disabled) {
    return (
      <div className={cn('w-full', className)} {...props}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={cn('w-full cursor-grab active:cursor-grabbing', className)}
      drag="x"
      dragElastic={0.2}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      whileDrag={{
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Simple touch ripple effect
export const TouchRipple = ({ children, className, disabled = false, ...props }) => {
  const { shouldReduceMotion } = useResponsiveMotion();
  const [ripples, setRipples] = React.useState([]);

  const addRipple = useCallback((event) => {
    if (disabled || shouldReduceMotion) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const newRipple = {
      id: Date.now(),
      x,
      y,
      size: Math.max(rect.width, rect.height) * 2
    };

    setRipples(prev => [...prev, newRipple]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 600);
  }, [disabled, shouldReduceMotion]);

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      onPointerDown={addRipple}
      {...props}
    >
      {children}

      {/* Ripple effects */}
      {ripples.map(ripple => (
        <motion.div
          key={ripple.id}
          className="absolute rounded-full bg-white/20 pointer-events-none"
          style={{
            left: ripple.x - ripple.size / 2,
            top: ripple.y - ripple.size / 2,
            width: ripple.size,
            height: ripple.size
          }}
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 1, opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        />
      ))}
    </div>
  );
};

// Simple draggable card
export const DraggableGlassCard = ({
  children,
  onDragStart,
  onDragEnd,
  className,
  snapToOrigin = true,
  ...props
}) => {
  const { shouldReduceMotion } = useResponsiveMotion();
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    onDragStart?.();
  }, [onDragStart]);

  const handleDragEnd = useCallback((event, info) => {
    setIsDragging(false);
    onDragEnd?.(event, info);
  }, [onDragEnd]);

  if (shouldReduceMotion) {
    return (
      <div className={cn('glass-container', className)} {...props}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={cn(
        'glass-container cursor-grab active:cursor-grabbing select-none',
        isDragging && 'z-50',
        className
      )}
      drag
      dragElastic={0.1}
      dragMomentum={false}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.05 }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Simple long press handler
export const LongPressGlass = ({
  children,
  onLongPress,
  onPress,
  delay = 500,
  className,
  disabled = false,
  ...props
}) => {
  const { shouldReduceMotion } = useResponsiveMotion();
  const [isPressed, setIsPressed] = React.useState(false);
  const timeoutRef = useRef(null);

  const handlePressStart = useCallback(() => {
    if (disabled) return;

    setIsPressed(true);
    timeoutRef.current = setTimeout(() => {
      onLongPress?.();
    }, delay);
  }, [disabled, delay, onLongPress]);

  const handlePressEnd = useCallback(() => {
    if (disabled) return;

    setIsPressed(false);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      onPress?.();
    }
  }, [disabled, onPress]);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (shouldReduceMotion || disabled) {
    return (
      <div className={className} onClick={onPress} {...props}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={cn('select-none cursor-pointer', className)}
      onPointerDown={handlePressStart}
      onPointerUp={handlePressEnd}
      onPointerLeave={handlePressEnd}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      animate={{
        scale: isPressed ? 0.96 : 1
      }}
      transition={{ duration: 0.15 }}
      {...props}
    >
      {children}
    </motion.div>
  );
};