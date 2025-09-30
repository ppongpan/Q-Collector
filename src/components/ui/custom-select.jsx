import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';

const CustomSelect = React.forwardRef(({
  value,
  onChange,
  options = [],
  placeholder = 'เลือก...',
  className,
  disabled = false,
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value);
  const containerRef = useRef(null);

  // Get selected option label
  const selectedOption = options.find(opt => opt.value === selectedValue);
  const selectedLabel = selectedOption ? selectedOption.label : placeholder;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Update selected value when prop changes
  useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  const handleSelect = (optionValue) => {
    setSelectedValue(optionValue);
    setIsOpen(false);

    // Create synthetic event for onChange
    if (onChange) {
      onChange({ target: { value: optionValue } });
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full', className)}
      {...props}
    >
      {/* Select trigger */}
      <button
        ref={ref}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={cn(
          'input-glass',
          'w-full h-8 px-3',
          'flex items-center gap-2',
          'text-xs text-left',
          'border-0 rounded-xl',
          'transition-all duration-300',
          'focus:outline-none focus-orange-neon hover-orange-neon',
          disabled && 'opacity-50 cursor-not-allowed',
          'dark:bg-[rgb(40,40,40)] dark:text-white',
          'bg-white/85'
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={cn(
          'flex-1 truncate',
          !selectedOption && 'text-muted-foreground'
        )}>
          {selectedLabel}
        </span>
        <FontAwesomeIcon
          icon={faChevronDown}
          className={cn(
            'w-3 h-3 flex-shrink-0 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className={cn(
          'absolute z-50 left-0 mt-1',
          'min-w-full w-max max-w-[400px]',
          'rounded-xl overflow-hidden',
          'shadow-xl border',
          'dark:bg-[rgb(30,30,30)] dark:border-white/10',
          'bg-white border-black/10',
          'animate-in fade-in-0 zoom-in-95',
          'max-h-[480px] overflow-y-auto'
        )}>
          <div className="grid grid-cols-2 gap-0">
            {options.map((option) => {
              const isSelected = option.value === selectedValue;
              const isDisabled = option.disabled;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => !isDisabled && handleSelect(option.value)}
                  disabled={isDisabled}
                  className={cn(
                    'w-full py-3 text-sm text-left whitespace-nowrap',
                    'transition-all duration-200',
                    'focus:outline-none',
                    'border-r border-b last:border-r-0',
                    'dark:border-white/5 border-black/5',
                    'min-h-[44px]',
                    'relative flex items-center gap-2',
                    isSelected ? 'dark:bg-orange-500/20 dark:text-orange-400 bg-orange-500 text-white font-semibold shadow-inner ring-1 dark:ring-orange-500/50 ring-orange-600 pl-3 pr-4' : 'pl-7 pr-4',
                    !isSelected && 'dark:text-white dark:hover:bg-[rgb(55,55,55)] dark:hover:text-orange-400 text-foreground hover:bg-orange-50 hover:text-orange-600',
                    isDisabled && 'opacity-50 cursor-not-allowed'
                  )}
                  role="option"
                  aria-selected={isSelected}
                >
                  {isSelected && (
                    <span className="text-sm flex-shrink-0">✓</span>
                  )}
                  <span className="flex-1">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

CustomSelect.displayName = 'CustomSelect';

export default CustomSelect;