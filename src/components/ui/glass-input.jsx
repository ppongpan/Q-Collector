import React from 'react';
import { cn } from '../../lib/utils';
import GlassTooltip from './glass-tooltip';

const GlassInput = React.forwardRef(({
  className,
  type = 'text',
  tooltip,
  label,
  error,
  minimal = false,
  hasValidationError = false,
  required = false,
  ...props
}, ref) => {
  const inputClasses = cn(
    'input-glass',
    'border-0 bg-transparent',
    'placeholder:text-muted-foreground/50',
    'glass-interactive blur-edge',
    'focus-orange-neon hover-orange-neon',
    'transition-all duration-300 ease-out',
    error && 'border-destructive focus:border-destructive',
    hasValidationError && 'red-neon-focus',
    className
  );

  const input = (
    <input
      type={type}
      className={inputClasses}
      ref={ref}
      {...props}
    />
  );

  const wrappedInput = (
    <div className={cn(
      "relative group glass-input-group w-full",
      hasValidationError && "field-error-container"
    )}>
      {label && (
        <label className={cn(
          'text-sm font-medium text-foreground/80 mb-2 block transition-all duration-300',
          'group-focus-within:text-primary group-hover:text-primary',
          'group-focus-within:font-semibold group-hover:font-medium',
          'group-focus-within:transform group-focus-within:-translate-y-0.5',
          'group-hover:transform group-hover:-translate-y-0.5',
          minimal && 'text-foreground/60',
          !minimal && 'text-foreground/80',
          hasValidationError && 'text-red-500'
        )}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <div className="w-full">
        {tooltip ? (
          <GlassTooltip content={tooltip}>
            {input}
          </GlassTooltip>
        ) : (
          input
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}
    </div>
  );

  return wrappedInput;
});
GlassInput.displayName = 'GlassInput';

const GlassTextarea = React.forwardRef(({
  className,
  tooltip,
  label,
  error,
  minimal = false,
  hasValidationError = false,
  required = false,
  ...props
}, ref) => {
  const textareaClasses = cn(
    'input-glass min-h-[80px] resize-none',
    'border-0 bg-transparent',
    'placeholder:text-muted-foreground/50',
    'glass-interactive blur-edge',
    'focus-orange-neon hover-orange-neon',
    'transition-all duration-300 ease-out',
    error && 'border-destructive focus:border-destructive',
    hasValidationError && 'red-neon-focus',
    className
  );

  const textarea = (
    <textarea
      className={textareaClasses}
      ref={ref}
      {...props}
    />
  );

  return (
    <div className={cn(
      "relative group glass-input-group w-full",
      hasValidationError && "field-error-container"
    )}>
      {label && (
        <label className={cn(
          'text-sm font-medium text-foreground/80 mb-2 block transition-all duration-300',
          'group-focus-within:text-primary group-hover:text-primary',
          'group-focus-within:font-semibold group-hover:font-medium',
          'group-focus-within:transform group-focus-within:-translate-y-0.5',
          'group-hover:transform group-hover:-translate-y-0.5',
          minimal && 'text-foreground/60',
          !minimal && 'text-foreground/80',
          hasValidationError && 'text-red-500'
        )}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <div className="w-full">
        {tooltip ? (
          <GlassTooltip content={tooltip}>
            {textarea}
          </GlassTooltip>
        ) : (
          textarea
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}
    </div>
  );
});
GlassTextarea.displayName = 'GlassTextarea';

const GlassSelect = React.forwardRef(({
  className,
  tooltip,
  label,
  error,
  minimal = false,
  required = false,
  children,
  ...props
}, ref) => {
  // State for dark mode detection with proper updates
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  React.useEffect(() => {
    // Initial check
    const checkDarkMode = () => {
      const darkMode = document.documentElement.classList.contains('dark') ||
                      document.body.classList.contains('dark');
      console.log('[GlassSelect] Dark mode detected:', darkMode);
      setIsDarkMode(darkMode);
    };

    checkDarkMode();

    // Watch for changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  const selectClasses = cn(
    'input-glass',
    'border-0',
    'appearance-none bg-no-repeat bg-right bg-[length:16px_16px] pr-10',
    'rounded-xl',
    'focus-orange-neon hover-orange-neon',
    'transition-all duration-300 ease-out',
    error && 'border-destructive focus:border-destructive',
    className
  );

  // Inline styles for dark mode - nuclear option with !important equivalent
  const inlineStyle = isDarkMode ? {
    backgroundColor: 'rgb(40, 40, 40)',
    color: 'rgb(255, 255, 255)',
    backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%23f97316\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'m6 8 4 4 4-4\'/%3e%3c/svg%3e")'
  } : {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%23f97316\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'m6 8 4 4 4-4\'/%3e%3c/svg%3e")'
  };

  const select = (
    <select
      className={selectClasses}
      style={inlineStyle}
      ref={ref}
      data-dark-mode={isDarkMode ? 'true' : 'false'}
      {...props}
    >
      {children}
    </select>
  );

  return (
    <div className={cn(
      "relative group glass-input-group w-full",
      error && "field-error-container"
    )}>
      {label && (
        <label className={cn(
          'text-sm font-medium text-foreground/80 mb-2 block transition-all duration-300',
          'group-focus-within:text-primary group-hover:text-primary',
          'group-focus-within:font-semibold group-hover:font-medium',
          'group-focus-within:transform group-focus-within:-translate-y-0.5',
          'group-hover:transform group-hover:-translate-y-0.5',
          minimal && 'text-foreground/60',
          !minimal && 'text-foreground/80',
          error && 'text-red-500'
        )}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <div className="w-full">
        {tooltip ? (
          <GlassTooltip content={tooltip}>
            {select}
          </GlassTooltip>
        ) : (
          select
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}
    </div>
  );
});
GlassSelect.displayName = 'GlassSelect';

export { GlassInput, GlassTextarea, GlassSelect };