import React, { useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt } from '@fortawesome/free-solid-svg-icons';

/**
 * Thai Date Picker Component
 * Uses HTML5 date picker but displays in dd/mm/yyyy format
 *
 * @param {Object} props
 * @param {string} props.value - ISO date string (yyyy-mm-dd)
 * @param {Function} props.onChange - Callback when date changes
 * @param {string} props.label - Label text
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.minimal - Use minimal styling
 */
export function ThaiDatePicker({ value, onChange, label, placeholder = "dd/mm/yyyy", minimal = false }) {
  const dateInputRef = useRef(null);

  // Convert yyyy-mm-dd to dd/mm/yyyy for display
  const formatDateForDisplay = (isoDate) => {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    if (!year || !month || !day) return '';
    return `${day}/${month}/${year}`;
  };

  // Handle click on text input - open native date picker
  const handleTextClick = () => {
    if (dateInputRef.current) {
      dateInputRef.current.showPicker?.(); // Modern browsers
    }
  };

  // Handle date change from native picker
  const handleDateChange = (e) => {
    const isoDate = e.target.value;
    if (onChange) {
      onChange({ target: { value: isoDate } });
    }
  };

  const displayValue = formatDateForDisplay(value);

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-medium text-foreground/80">
          {label}
        </label>
      )}

      <div className="relative">
        {/* Visible text input showing dd/mm/yyyy */}
        <div
          onClick={handleTextClick}
          className={`
            flex items-center gap-2 cursor-pointer
            px-3 py-2 rounded-lg border
            transition-all duration-200
            ${minimal
              ? 'bg-background/40 border-border/40 hover:border-border/60'
              : 'bg-background/60 border-border/60 hover:border-primary/40'
            }
            hover:bg-background/80
            focus-within:ring-2 focus-within:ring-primary/20
          `}
        >
          <FontAwesomeIcon
            icon={faCalendarAlt}
            className="w-4 h-4 text-muted-foreground/60"
          />

          <input
            type="text"
            value={displayValue}
            readOnly
            placeholder={placeholder}
            className="
              flex-1 bg-transparent outline-none
              text-foreground placeholder:text-muted-foreground/50
              cursor-pointer select-none
            "
          />
        </div>

        {/* Hidden native date picker */}
        <input
          ref={dateInputRef}
          type="date"
          value={value || ''}
          onChange={handleDateChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          tabIndex={-1}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        กรอกในรูปแบบ วัน/เดือน/ปี (คลิกเพื่อเปิดปฏิทิน)
      </p>
    </div>
  );
}

/**
 * Thai DateTime Picker Component
 * Uses HTML5 datetime-local picker but displays in dd/mm/yyyy HH:MM format
 */
export function ThaiDateTimePicker({ value, onChange, label, placeholder = "dd/mm/yyyy HH:MM", minimal = false }) {
  const dateTimeInputRef = useRef(null);

  // Convert yyyy-mm-ddThh:mm to dd/mm/yyyy HH:MM for display
  const formatDateTimeForDisplay = (isoDateTime) => {
    if (!isoDateTime) return '';
    const [datePart, timePart] = isoDateTime.split('T');
    if (!datePart) return '';
    const [year, month, day] = datePart.split('-');
    if (!year || !month || !day) return '';
    return `${day}/${month}/${year} ${timePart || ''}`.trim();
  };

  // Handle click on text input - open native datetime picker
  const handleTextClick = () => {
    if (dateTimeInputRef.current) {
      dateTimeInputRef.current.showPicker?.(); // Modern browsers
    }
  };

  // Handle datetime change from native picker
  const handleDateTimeChange = (e) => {
    const isoDateTime = e.target.value;
    if (onChange) {
      onChange({ target: { value: isoDateTime } });
    }
  };

  const displayValue = formatDateTimeForDisplay(value);

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-medium text-foreground/80">
          {label}
        </label>
      )}

      <div className="relative">
        {/* Visible text input showing dd/mm/yyyy HH:MM */}
        <div
          onClick={handleTextClick}
          className={`
            flex items-center gap-2 cursor-pointer
            px-3 py-2 rounded-lg border
            transition-all duration-200
            ${minimal
              ? 'bg-background/40 border-border/40 hover:border-border/60'
              : 'bg-background/60 border-border/60 hover:border-primary/40'
            }
            hover:bg-background/80
            focus-within:ring-2 focus-within:ring-primary/20
          `}
        >
          <FontAwesomeIcon
            icon={faCalendarAlt}
            className="w-4 h-4 text-muted-foreground/60"
          />

          <input
            type="text"
            value={displayValue}
            readOnly
            placeholder={placeholder}
            className="
              flex-1 bg-transparent outline-none
              text-foreground placeholder:text-muted-foreground/50
              cursor-pointer select-none
            "
          />
        </div>

        {/* Hidden native datetime-local picker */}
        <input
          ref={dateTimeInputRef}
          type="datetime-local"
          value={value || ''}
          onChange={handleDateTimeChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          tabIndex={-1}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        กรอกในรูปแบบ วัน/เดือน/ปี ชั่วโมง:นาที (คลิกเพื่อเปิดปฏิทิน)
      </p>
    </div>
  );
}
