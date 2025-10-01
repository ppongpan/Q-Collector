import React from 'react';
import { cn } from '../../lib/utils';
import GlassTooltip from './glass-tooltip';

const GlassButton = React.forwardRef(({
  className,
  variant = 'default',
  size = 'default',
  tooltip,
  children,
  disabled,
  ...props
}, ref) => {
  const variants = {
    default: 'btn-glass glass-interactive blur-edge',
    primary: 'btn-glass-primary glass-interactive blur-edge-intense',
    ghost: 'btn-glass hover:bg-glass-elevated/50 glass-interactive blur-edge',
    icon: 'icon-glass glass-interactive blur-edge p-0 w-10 h-10'
  };

  const sizes = {
    default: 'px-6 py-3 text-base min-h-12',
    sm: 'px-5 py-3 text-sm min-h-10',
    lg: 'px-8 py-4 text-lg min-h-14',
    icon: 'w-12 h-12 p-0'
  };

  const button = (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap font-medium',
        'rounded-3xl',  // ใช้ rounded-3xl (1.5rem) สำหรับความโค้งมาก
        'transition-all duration-300 ease-out',
        'focus-glass disabled:opacity-50 disabled:pointer-events-none',
        'relative overflow-visible',
        'will-change-transform',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );

  if (tooltip) {
    return (
      <GlassTooltip content={tooltip} disabled={disabled}>
        {button}
      </GlassTooltip>
    );
  }

  return button;
});
GlassButton.displayName = 'GlassButton';

export { GlassButton };