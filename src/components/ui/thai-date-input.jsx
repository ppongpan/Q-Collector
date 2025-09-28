import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import GlassTooltip from './glass-tooltip';

/**
 * ThaiDateInput - Custom date input component that shows DD/MM/YYYY format
 * Provides better control over date display format regardless of browser locale
 * Uses GlassInput pattern for consistent styling and behavior
 */
const ThaiDateInput = React.forwardRef(({
  className,
  tooltip,
  label,
  error,
  minimal = false,
  hasValidationError = false,
  required = false,
  placeholder = 'DD/MM/YYYY',
  value,
  onChange,
  disabled = false,
  ...props
}, ref) => {
  const [displayValue, setDisplayValue] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const hiddenInputRef = useRef(null);
  const displayInputRef = useRef(null);

  // Convert date value to DD/MM/YYYY display format
  const formatDateForDisplay = (dateValue) => {
    if (!dateValue) return '';
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return '';
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      return '';
    }
  };

  // Convert date value to YYYY-MM-DD format for HTML date input
  const formatDateForHtml = (dateValue) => {
    if (!dateValue) return '';
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch (error) {
      return '';
    }
  };

  // Parse DD/MM/YYYY input to Date object
  const parseDateFromDisplay = (displayValue) => {
    if (!displayValue) return '';
    const parts = displayValue.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      if (day && month && year && day.length === 2 && month.length === 2 && year.length === 4) {
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
        }
      }
    }
    return '';
  };

  // Update display value when prop value changes
  useEffect(() => {
    setDisplayValue(formatDateForDisplay(value));
  }, [value]);

  const handleDisplayInputChange = (e) => {
    let inputValue = e.target.value;

    // Remove non-numeric characters except /
    inputValue = inputValue.replace(/[^\d/]/g, '');

    // Auto-add slashes for DD/MM/YYYY format
    if (inputValue.length === 2 && !inputValue.includes('/')) {
      inputValue += '/';
    } else if (inputValue.length === 5 && inputValue.split('/').length === 2) {
      inputValue += '/';
    }

    // Limit to DD/MM/YYYY format (10 characters)
    if (inputValue.length > 10) {
      inputValue = inputValue.substring(0, 10);
    }

    setDisplayValue(inputValue);

    // Try to parse and convert to standard date format
    const parsedDate = parseDateFromDisplay(inputValue);
    if (parsedDate || inputValue === '') {
      onChange && onChange({ target: { value: parsedDate } });
    }
  };

  const handleDisplayInputFocus = () => {
    setIsInputFocused(true);
  };

  const handleDisplayInputBlur = () => {
    setIsInputFocused(false);
    // Validate and reformat the date on blur
    const parsedDate = parseDateFromDisplay(displayValue);
    if (parsedDate) {
      setDisplayValue(formatDateForDisplay(parsedDate));
    } else if (displayValue && displayValue !== '') {
      // Invalid date, clear the field
      setDisplayValue('');
      onChange && onChange({ target: { value: '' } });
    }
  };

  const handleCalendarIconClick = () => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.focus();
      hiddenInputRef.current.showPicker?.();
    }
  };

  const handleHiddenInputChange = (e) => {
    const htmlDateValue = e.target.value;
    setDisplayValue(formatDateForDisplay(htmlDateValue));
    onChange && onChange({ target: { value: htmlDateValue } });
  };

  const inputClasses = cn(
    'input-glass pr-10',
    'border-0 bg-transparent',
    'placeholder:text-muted-foreground/50',
    'glass-interactive blur-edge',
    'focus-orange-neon hover-orange-neon',
    'transition-all duration-300 ease-out',
    error && 'border-destructive focus:border-destructive',
    hasValidationError && 'red-neon-focus',
    className
  );

  const dateInputContent = (
    <div className="relative">
      {/* Display input for DD/MM/YYYY format */}
      <input
        ref={ref || displayInputRef}
        type="text"
        value={displayValue}
        onChange={handleDisplayInputChange}
        onFocus={handleDisplayInputFocus}
        onBlur={handleDisplayInputBlur}
        placeholder={placeholder}
        className={inputClasses}
        required={required}
        disabled={disabled}
        {...props}
      />

      {/* Hidden HTML date input for calendar picker */}
      <input
        ref={hiddenInputRef}
        type="date"
        value={formatDateForHtml(value)}
        onChange={handleHiddenInputChange}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -1
        }}
        tabIndex={-1}
      />

      {/* Calendar icon button */}
      <button
        type="button"
        onClick={handleCalendarIconClick}
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-orange-500 transition-colors duration-200"
        tabIndex={-1}
        disabled={disabled}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </button>
    </div>
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
            {dateInputContent}
          </GlassTooltip>
        ) : (
          dateInputContent
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}
    </div>
  );

  return wrappedInput;
});

ThaiDateInput.displayName = 'ThaiDateInput';

export default ThaiDateInput;