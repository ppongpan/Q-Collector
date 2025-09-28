import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import GlassTooltip from './glass-tooltip';

/**
 * ThaiDateTimeInput - Custom datetime input component that shows DD/MM/YYYY HH:MM format
 * Provides better control over datetime display format regardless of browser locale
 * Uses GlassInput pattern for consistent styling and behavior
 */
const ThaiDateTimeInput = React.forwardRef(({
  className,
  tooltip,
  label,
  error,
  minimal = false,
  hasValidationError = false,
  required = false,
  placeholder = 'DD/MM/YYYY HH:MM',
  value,
  onChange,
  disabled = false,
  ...props
}, ref) => {
  const [displayValue, setDisplayValue] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const hiddenInputRef = useRef(null);
  const displayInputRef = useRef(null);

  // Convert datetime value to DD/MM/YYYY HH:MM display format
  const formatDateTimeForDisplay = (datetimeValue) => {
    if (!datetimeValue) return '';
    try {
      const date = new Date(datetimeValue);
      if (isNaN(date.getTime())) return '';
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error) {
      return '';
    }
  };

  // Convert datetime value to YYYY-MM-DDTHH:MM format for HTML datetime-local input
  const formatDateTimeForHtml = (datetimeValue) => {
    if (!datetimeValue) return '';
    try {
      const date = new Date(datetimeValue);
      if (isNaN(date.getTime())) return '';
      const isoString = date.toISOString();
      return isoString.slice(0, 16); // Remove seconds and timezone
    } catch (error) {
      return '';
    }
  };

  // Parse DD/MM/YYYY HH:MM input to Date object
  const parseDateTimeFromDisplay = (displayValue) => {
    if (!displayValue) return '';
    const parts = displayValue.split(' ');
    if (parts.length === 2) {
      const [datePart, timePart] = parts;
      const dateParts = datePart.split('/');
      const timeParts = timePart.split(':');

      if (dateParts.length === 3 && timeParts.length === 2) {
        const [day, month, year] = dateParts;
        const [hours, minutes] = timeParts;

        if (day && month && year && hours && minutes &&
            day.length === 2 && month.length === 2 && year.length === 4 &&
            hours.length === 2 && minutes.length === 2) {
          const date = new Date(year, month - 1, day, hours, minutes);
          if (!isNaN(date.getTime())) {
            return date.toISOString(); // Return ISO format
          }
        }
      }
    }
    return '';
  };

  // Update display value when prop value changes
  useEffect(() => {
    setDisplayValue(formatDateTimeForDisplay(value));
  }, [value]);

  const handleDisplayInputChange = (e) => {
    let inputValue = e.target.value;

    // Remove non-numeric characters except / : and space
    inputValue = inputValue.replace(/[^\d/: ]/g, '');

    // Auto-add slashes and colons for DD/MM/YYYY HH:MM format
    if (inputValue.length === 2 && !inputValue.includes('/')) {
      inputValue += '/';
    } else if (inputValue.length === 5 && inputValue.split('/').length === 2) {
      inputValue += '/';
    } else if (inputValue.length === 10 && !inputValue.includes(' ')) {
      inputValue += ' ';
    } else if (inputValue.length === 13 && inputValue.split(':').length === 1) {
      inputValue += ':';
    }

    // Limit to DD/MM/YYYY HH:MM format (16 characters)
    if (inputValue.length > 16) {
      inputValue = inputValue.substring(0, 16);
    }

    setDisplayValue(inputValue);

    // Try to parse and convert to standard datetime format
    const parsedDateTime = parseDateTimeFromDisplay(inputValue);
    if (parsedDateTime || inputValue === '') {
      onChange && onChange({ target: { value: parsedDateTime } });
    }
  };

  const handleDisplayInputFocus = () => {
    setIsInputFocused(true);
  };

  const handleDisplayInputBlur = () => {
    setIsInputFocused(false);
    // Validate and reformat the datetime on blur
    const parsedDateTime = parseDateTimeFromDisplay(displayValue);
    if (parsedDateTime) {
      setDisplayValue(formatDateTimeForDisplay(parsedDateTime));
    } else if (displayValue && displayValue !== '') {
      // Invalid datetime, clear the field
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
    const htmlDateTimeValue = e.target.value;
    setDisplayValue(formatDateTimeForDisplay(htmlDateTimeValue));
    onChange && onChange({ target: { value: htmlDateTimeValue } });
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

  const dateTimeInputContent = (
    <div className="relative">
      {/* Display input for DD/MM/YYYY HH:MM format */}
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

      {/* Hidden HTML datetime-local input for calendar picker */}
      <input
        ref={hiddenInputRef}
        type="datetime-local"
        value={formatDateTimeForHtml(value)}
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
            {dateTimeInputContent}
          </GlassTooltip>
        ) : (
          dateTimeInputContent
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}
    </div>
  );

  return wrappedInput;
});

ThaiDateTimeInput.displayName = 'ThaiDateTimeInput';

export default ThaiDateTimeInput;