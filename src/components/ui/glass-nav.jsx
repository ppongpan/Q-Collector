import React from 'react';
import { cn } from '../../lib/utils';
import { GlassButton } from './glass-button';
import GlassTooltip from './glass-tooltip';

const GlassNavigation = React.forwardRef(({
  className,
  children,
  ...props
}, ref) => (
  <nav
    ref={ref}
    className={cn(
      'nav-glass',
      'px-6 py-4 flex items-center justify-between',
      className
    )}
    {...props}
  >
    {children}
  </nav>
));
GlassNavigation.displayName = 'GlassNavigation';

const GlassNavBrand = React.forwardRef(({
  className,
  children,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center space-x-3',
      className
    )}
    {...props}
  >
    {children}
  </div>
));
GlassNavBrand.displayName = 'GlassNavBrand';

const GlassNavMenu = React.forwardRef(({
  className,
  children,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center space-x-2',
      className
    )}
    {...props}
  >
    {children}
  </div>
));
GlassNavMenu.displayName = 'GlassNavMenu';

const GlassNavItem = React.forwardRef(({
  className,
  active = false,
  tooltip,
  children,
  ...props
}, ref) => {
  const item = (
    <GlassButton
      ref={ref}
      variant={active ? 'primary' : 'ghost'}
      size="sm"
      className={cn(
        'relative',
        active && 'shadow-glass-medium',
        className
      )}
      {...props}
    >
      {children}
      {active && (
        <div className="absolute inset-0 bg-glass-refraction-orange rounded-xl opacity-30" />
      )}
    </GlassButton>
  );

  if (tooltip) {
    return (
      <GlassTooltip content={tooltip}>
        {item}
      </GlassTooltip>
    );
  }

  return item;
});
GlassNavItem.displayName = 'GlassNavItem';

const GlassNavIcon = React.forwardRef(({
  className,
  tooltip,
  children,
  ...props
}, ref) => {
  const icon = (
    <GlassButton
      ref={ref}
      variant="icon"
      className={cn(
        'text-foreground/70 hover:text-foreground',
        className
      )}
      {...props}
    >
      {children}
    </GlassButton>
  );

  if (tooltip) {
    return (
      <GlassTooltip content={tooltip}>
        {icon}
      </GlassTooltip>
    );
  }

  return icon;
});
GlassNavIcon.displayName = 'GlassNavIcon';

export {
  GlassNavigation,
  GlassNavBrand,
  GlassNavMenu,
  GlassNavItem,
  GlassNavIcon
};