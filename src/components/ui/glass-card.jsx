import React from 'react';
import { cn } from '../../lib/utils';

const GlassCard = React.forwardRef(({
  className,
  variant = 'base',
  children,
  ...props
}, ref) => {
  const variants = {
    base: 'glass-container blur-edge',
    elevated: 'glass-elevated blur-edge-intense',
    floating: 'glass-floating blur-edge-intense',
    primary: 'glass-primary glass-container blur-edge-intense'
  };

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl overflow-visible relative',
        'transition-all duration-300 ease-out',
        'will-change-transform',
        variants[variant],
        'animate-glass-in',
        className
      )}
      style={{
        borderRadius: '24px',
        ...props.style
      }}
      {...props}
    >
      {children}
    </div>
  );
});
GlassCard.displayName = 'GlassCard';

const GlassCardHeader = React.forwardRef(({
  className,
  children,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn('p-6 pb-3', className)}
    {...props}
  >
    {children}
  </div>
));
GlassCardHeader.displayName = 'GlassCardHeader';

const GlassCardTitle = React.forwardRef(({
  className,
  children,
  ...props
}, ref) => (
  <h3
    ref={ref}
    className={cn(
      // Remove default text-lg, let custom classes override
      'font-semibold leading-none tracking-tight text-foreground/90',
      className
    )}
    {...props}
  >
    {children}
  </h3>
));
GlassCardTitle.displayName = 'GlassCardTitle';

const GlassCardDescription = React.forwardRef(({
  className,
  children,
  minimal = false,
  ...props
}, ref) => (
  <p
    ref={ref}
    className={cn(
      // Remove default text-sm, let custom classes override
      'text-muted-foreground mt-1',
      minimal && 'text-muted-foreground/60 transition-all duration-200 group-hover:text-muted-foreground/85 group-hover:font-medium',
      className
    )}
    {...props}
  >
    {children}
  </p>
));
GlassCardDescription.displayName = 'GlassCardDescription';

const GlassCardContent = React.forwardRef(({
  className,
  children,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn('p-6 pt-3', className)}
    {...props}
  >
    {children}
  </div>
));
GlassCardContent.displayName = 'GlassCardContent';

const GlassCardFooter = React.forwardRef(({
  className,
  children,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn('p-6 pt-0 flex items-center gap-3', className)}
    {...props}
  >
    {children}
  </div>
));
GlassCardFooter.displayName = 'GlassCardFooter';

export {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
  GlassCardFooter
};