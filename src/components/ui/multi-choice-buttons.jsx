import React from 'react';

/**
 * MultiChoiceButtons - Responsive multi-select button group component
 *
 * Features:
 * - Responsive 2/3 column grid layout
 * - Text wrapping with line-clamp-2
 * - Hover, focus, and active states
 * - Multi-select functionality
 * - Full accessibility support
 * - Smooth transitions and animations
 *
 * @param {Object} props - Component props
 * @param {Array} props.options - Array of option objects with id and label
 * @param {Array} props.value - Array of selected option ids
 * @param {Function} props.onChange - Callback when selection changes
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.disabled - Whether the component is disabled
 */
const MultiChoiceButtons = ({
  options = [],
  value = [],
  onChange,
  className = '',
  disabled = false
}) => {
  /**
   * Handle option selection toggle
   * @param {string} optionId - The id of the option to toggle
   */
  const handleOptionToggle = (optionId) => {
    if (disabled || !onChange) return;

    const newValue = value.includes(optionId)
      ? value.filter(id => id !== optionId) // Remove if already selected
      : [...value, optionId]; // Add if not selected

    onChange(newValue);
  };

  /**
   * Handle keyboard interaction for accessibility
   * @param {KeyboardEvent} event - Keyboard event
   * @param {string} optionId - The option id
   */
  const handleKeyDown = (event, optionId) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOptionToggle(optionId);
    }
  };

  if (!options.length) {
    return (
      <div className="text-sm text-muted-foreground italic p-4 text-center">
        No options available
      </div>
    );
  }

  return (
    <div
      className={`
        grid grid-cols-2 md:grid-cols-3 gap-3
        ${className}
      `}
      role="group"
      aria-label="Multiple choice options"
    >
      {options.map((option) => {
        const isSelected = value.includes(option.id);

        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => handleOptionToggle(option.id)}
            onKeyDown={(e) => handleKeyDown(e, option.id)}
            aria-pressed={isSelected}
            aria-describedby={`option-${option.id}-description`}
            className={`
              inline-flex items-center justify-center
              px-4 py-3 min-h-[3rem]
              rounded-lg border-2
              text-sm font-medium
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed

              ${isSelected
                ? `
                  bg-orange-600 text-white border-orange-600
                  hover:bg-orange-700 hover:border-orange-700
                  focus:ring-orange-500
                  shadow-lg shadow-orange-600/25
                  scale-[1.02]
                `
                : `
                  bg-background border-border
                  text-foreground hover:bg-accent hover:text-accent-foreground
                  hover:border-accent-foreground/20
                  focus:ring-primary
                  hover:shadow-md hover:shadow-foreground/5
                  hover:scale-[1.01]
                `
              }

              active:scale-95
              transform-gpu
            `}
          >
            {/* Hidden checkbox for form integration and screen readers */}
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}} // Controlled by button click
              className="sr-only"
              aria-hidden="true"
              tabIndex={-1}
            />

            {/* Option label with text wrapping */}
            <span
              className="
                text-center leading-tight
                line-clamp-2
                max-w-full
                break-words
                hyphens-auto
              "
              id={`option-${option.id}-description`}
            >
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default MultiChoiceButtons;

/**
 * Example Usage:
 *
 * const [selectedValues, setSelectedValues] = useState(['option-1']);
 *
 * const options = [
 *   { id: 'option-1', label: 'Short Label' },
 *   { id: 'option-2', label: 'Very Long Label That Will Wrap to Multiple Lines' },
 *   { id: 'option-3', label: 'Medium Length Label' },
 *   { id: 'option-4', label: 'Another Option' },
 *   { id: 'option-5', label: 'Final Option with Even Longer Text That Demonstrates Wrapping' },
 * ];
 *
 * <div className="max-w-md mx-auto p-4"> // Responsive parent container
 *   <MultiChoiceButtons
 *     options={options}
 *     value={selectedValues}
 *     onChange={setSelectedValues}
 *     className="w-full"
 *   />
 * </div>
 */