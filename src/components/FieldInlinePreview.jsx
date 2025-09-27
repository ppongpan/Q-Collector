import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar } from '@fortawesome/free-solid-svg-icons';
import GlassTooltip from './ui/glass-tooltip';
import MultiChoiceButtons from './ui/multi-choice-buttons';

/**
 * FieldInlinePreview - Interactive preview for collapsed field cards
 * Shows a functional preview of how the field will look and behave
 *
 * @param {Object} field - Field configuration object
 * @param {boolean} collapsed - Whether the field is collapsed
 * @param {Function} onTempChange - Optional callback for temporary value changes
 */
export default function FieldInlinePreview({ field, collapsed = true, onTempChange }) {
  const [temp, setTemp] = useState(field?.value ?? "");

  useEffect(() => {
    setTemp(field?.value ?? "");
  }, [field?.value]);

  if (!collapsed) return null;

  const handleChange = (v) => {
    setTemp(v);
    onTempChange?.(v);
  };

  // Unified input styling for consistent alignment
  const inputBaseClasses = "w-full max-w-md bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200";
  const textareaClasses = "w-full max-w-md min-h-[80px] bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none transition-all duration-200";
  const selectClasses = "w-full max-w-md bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200";

  // Helper function to wrap element with tooltip if description exists
  const withTooltip = (element) => {
    if (field.description?.trim()) {
      return (
        <GlassTooltip content={field.description}>
          {element}
        </GlassTooltip>
      );
    }
    return element;
  };

  switch (field.type) {
    case "rating":
      const maxRating = field.options?.maxRating || 5;
      return withTooltip(
        <div className="flex items-center space-x-1" role="group" aria-label={field.title}>
          {Array.from({ length: maxRating }, (_, i) => i + 1).map((n) => {
            const active = Number(temp) >= n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => handleChange(n)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleChange(n); }}
                aria-pressed={active}
                aria-label={`${n} out of ${maxRating} stars for ${field.title}`}
                className={`p-1 rounded-md transition-colors duration-200 hover:scale-110 ${
                  active ? "text-yellow-400" : "text-muted-foreground/40 hover:text-yellow-300"
                }`}
              >
                <FontAwesomeIcon icon={faStar} className="w-4 h-4" />
              </button>
            );
          })}
          <span className="ml-2 text-xs text-muted-foreground">
            {temp || 0}/{maxRating}
          </span>
        </div>
      );

    case "short_answer":
      return withTooltip(
        <input
          type="text"
          readOnly
          value={temp}
          placeholder={field.placeholder || "ตัวอย่างข้อความสั้น..."}
          className={inputBaseClasses}
          aria-label={field.title}
        />
      );

    case "paragraph":
      return withTooltip(
        <textarea
          readOnly
          value={temp}
          placeholder={field.placeholder || "ตัวอย่างคำอธิบายยาว..."}
          className={textareaClasses}
          aria-label={field.title}
        />
      );

    case "email":
      return withTooltip(
        <input
          type="email"
          readOnly
          value={temp}
          placeholder={field.placeholder || "example@domain.com"}
          className={inputBaseClasses}
          aria-label={field.title}
        />
      );

    case "phone":
      return withTooltip(
        <input
          type="tel"
          readOnly
          value={temp}
          placeholder={field.placeholder || "081-234-5678"}
          className={inputBaseClasses}
          aria-label={field.title}
        />
      );

    case "number":
      return withTooltip(
        <input
          type="number"
          readOnly
          value={temp}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={field.placeholder || "0"}
          className={inputBaseClasses}
          aria-label={field.title}
        />
      );

    case "url":
      return withTooltip(
        <input
          type="url"
          readOnly
          value={temp}
          placeholder={field.placeholder || "https://example.com"}
          className={inputBaseClasses}
          aria-label={field.title}
        />
      );

    case "date":
      return withTooltip(
        <input
          type="date"
          readOnly
          value={temp}
          onChange={(e) => handleChange(e.target.value)}
          className={inputBaseClasses}
          aria-label={field.title}
        />
      );

    case "time":
      return withTooltip(
        <input
          type="time"
          readOnly
          value={temp}
          onChange={(e) => handleChange(e.target.value)}
          className={inputBaseClasses}
          aria-label={field.title}
        />
      );

    case "datetime":
      return withTooltip(
        <input
          type="datetime-local"
          readOnly
          value={temp}
          onChange={(e) => handleChange(e.target.value)}
          className={inputBaseClasses}
          aria-label={field.title}
        />
      );

    case "multiple_choice":
      const displayStyle = field.options?.displayStyle || 'radio';
      const allowMultiple = field.options?.allowMultiple || false;
      const options = field.options?.options || ['ตัวเลือก 1', 'ตัวเลือก 2', 'ตัวเลือก 3'];

      if (displayStyle === 'dropdown') {
        return withTooltip(
          <select
            value={temp || ""}
            onChange={(e) => handleChange(e.target.value)}
            className={selectClasses}
            aria-label={field.title}
            disabled
          >
            <option value="">เลือก...</option>
            {options.map((opt, idx) => (
              <option key={idx} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      }

      if (displayStyle === 'buttons') {
        // Convert string options to {id, label} format for MultiChoiceButtons
        const formattedOptions = options.slice(0, 3).map((opt, idx) => ({
          id: `option-${idx}`,
          label: opt
        }));

        // Handle value format - convert selected values to array of IDs
        const selectedValues = allowMultiple
          ? (Array.isArray(temp) ? temp.map((val, idx) => `option-${options.indexOf(val)}`) : [])
          : (temp ? [`option-${options.indexOf(temp)}`] : []);

        const handleMultiChoiceChange = (selectedIds) => {
          if (allowMultiple) {
            // Convert back to option values for multi-select
            const selectedOptions = selectedIds.map(id => {
              const index = parseInt(id.split('-')[1]);
              return options[index];
            });
            handleChange(selectedOptions);
          } else {
            // Single select - get first selected option
            if (selectedIds.length > 0) {
              const index = parseInt(selectedIds[0].split('-')[1]);
              handleChange(options[index]);
            } else {
              handleChange('');
            }
          }
        };

        return withTooltip(
          <div className="w-full max-w-md">
            <MultiChoiceButtons
              options={formattedOptions}
              value={selectedValues}
              onChange={handleMultiChoiceChange}
              disabled={true} // Read-only in preview
            />
            {options.length > 3 && (
              <div className="mt-2 text-xs text-muted-foreground text-center">
                +{options.length - 3} ตัวเลือกเพิ่มเติม
              </div>
            )}
          </div>
        );
      }

      // Default radio/checkbox
      return withTooltip(
        <div className="space-y-1" role="group" aria-label={field.title}>
          {options.slice(0, 2).map((opt, idx) => (
            <label key={idx} className="flex items-center space-x-2 text-sm cursor-pointer">
              <input
                type={allowMultiple ? "checkbox" : "radio"}
                name={`preview-${field.id}`}
                value={opt}
                checked={allowMultiple ? temp?.includes?.(opt) : temp === opt}
                onChange={() => handleChange(opt)}
                className="w-4 h-4 text-primary"
              />
              <span>{opt}</span>
            </label>
          ))}
          {options.length > 2 && (
            <div className="text-xs text-muted-foreground pl-6">
              +{options.length - 2} ตัวเลือกเพิ่มเติม
            </div>
          )}
        </div>
      );

    case "slider":
      const min = field.options?.min || 0;
      const max = field.options?.max || 100;
      const step = field.options?.step || 1;
      const unit = field.options?.unit || '';

      return withTooltip(
        <div className="w-full max-w-md space-y-2">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={temp || min}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full h-2 bg-background/50 rounded-lg appearance-none cursor-pointer slider"
            aria-label={field.title}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{min}{unit}</span>
            <span className="font-medium text-foreground">
              {temp || min}{unit}
            </span>
            <span>{max}{unit}</span>
          </div>
        </div>
      );

    case "file_upload":
      return withTooltip(
        <div className="flex items-center space-x-2">
          <input
            type="file"
            disabled
            className="text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-background/50 file:text-foreground cursor-pointer"
            aria-label={field.title}
          />
          <span className="text-xs text-muted-foreground">ไฟล์ทั่วไป</span>
        </div>
      );

    case "image_upload":
      return withTooltip(
        <div className="flex items-center space-x-2">
          <input
            type="file"
            accept="image/*"
            disabled
            className="text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-background/50 file:text-foreground cursor-pointer"
            aria-label={field.title}
          />
          <span className="text-xs text-muted-foreground">รูปภาพ</span>
        </div>
      );

    case "lat_long":
      return withTooltip(
        <div className="w-full max-w-md flex items-center space-x-2">
          <input
            type="number"
            readOnly
            placeholder="13.7563"
            className="flex-1 bg-background/50 border border-border/50 rounded-lg px-2 py-2 text-sm placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
            aria-label="ละติจูด"
          />
          <span className="text-xs text-muted-foreground">,</span>
          <input
            type="number"
            readOnly
            placeholder="100.5018"
            className="flex-1 bg-background/50 border border-border/50 rounded-lg px-2 py-2 text-sm placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
            aria-label="ลองจิจูด"
          />
          <button
            type="button"
            disabled
            className="px-3 py-2 text-xs bg-primary/20 text-primary rounded-lg flex-shrink-0"
          >
            📍 GPS
          </button>
        </div>
      );

    case "province":
      return withTooltip(
        <select
          disabled
          className={selectClasses}
          aria-label={field.title}
        >
          <option>เลือกจังหวัด...</option>
          <option>กรุงเทพมหานคร</option>
          <option>เชียงใหม่</option>
          <option>ภูเก็ต</option>
        </select>
      );

    case "factory":
      const factories = ['บางปะอิน', 'ระยอง', 'สระบุรี', 'สงขลา'];
      return withTooltip(
        <div className="w-full max-w-md flex flex-wrap gap-2" role="group" aria-label={field.title}>
          {factories.map((factory, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleChange(factory)}
              className={`px-3 py-2 text-sm rounded-lg border transition-colors duration-200 flex-shrink-0 ${
                temp === factory
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-background/50 border-border/50 hover:bg-green-50 hover:border-green-300'
              }`}
              aria-pressed={temp === factory}
            >
              {factory}
            </button>
          ))}
        </div>
      );

    default:
      return withTooltip(
        <div className="flex items-center space-x-2 text-sm text-muted-foreground/70 bg-background/30 rounded-lg px-3 py-2">
          <span>{field.placeholder || field.title || "ตัวอย่างฟิลด์"}</span>
        </div>
      );
  }
}