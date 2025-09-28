import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import GlassTooltip from './glass-tooltip';

/**
 * ThaiPhoneInput - Custom phone input component that shows XXX-XXX-XXXX format
 * Accepts only numbers and automatically formats with dashes
 * Uses GlassInput pattern for consistent styling and behavior
 */
const ThaiPhoneInput = React.forwardRef(({
  className,
  tooltip,
  label,
  error,
  minimal = false,
  hasValidationError = false,
  required = false,
  placeholder = 'XXX-XXX-XXXX',
  value,
  onChange,
  disabled = false,
  ...props
}, ref) => {
  const [displayValue, setDisplayValue] = useState('');

  // Format phone number to XXX-XXX-XXXX display format
  const formatPhoneForDisplay = (phoneValue) => {
    if (!phoneValue) return '';
    // Remove all non-digits
    const digits = phoneValue.toString().replace(/\D/g, '');

    // Apply XXX-XXX-XXXX formatting
    if (digits.length >= 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    } else if (digits.length >= 6) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length >= 3) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    } else {
      return digits;
    }
  };

  // Parse phone number from display format to numbers only
  const parsePhoneFromDisplay = (displayValue) => {
    if (!displayValue) return '';
    // Remove all non-digits
    return displayValue.replace(/\D/g, '');
  };

  // Update display value when prop value changes
  useEffect(() => {
    setDisplayValue(formatPhoneForDisplay(value));
  }, [value]);

  const handleInputChange = (e) => {
    let inputValue = e.target.value;

    // Remove all non-digits
    const digits = inputValue.replace(/\D/g, '');

    // Limit to 10 digits maximum
    const limitedDigits = digits.slice(0, 10);

    // Format for display
    const formattedValue = formatPhoneForDisplay(limitedDigits);
    setDisplayValue(formattedValue);

    // Send raw digits to parent component
    if (onChange) {
      onChange({ target: { value: limitedDigits } });
    }
  };

  const handleInputBlur = () => {
    // Validate and reformat on blur
    const digits = parsePhoneFromDisplay(displayValue);
    if (digits) {
      setDisplayValue(formatPhoneForDisplay(digits));
    }
  };

  const handleKeyPress = (e) => {
    // Only allow digits
    if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
      e.preventDefault();
    }
  };

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
      type="text"
      value={displayValue}
      onChange={handleInputChange}
      onBlur={handleInputBlur}
      onKeyPress={handleKeyPress}
      placeholder={placeholder}
      className={inputClasses}
      required={required}
      disabled={disabled}
      maxLength={12} // XXX-XXX-XXXX = 12 characters
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

ThaiPhoneInput.displayName = 'ThaiPhoneInput';

export default ThaiPhoneInput;