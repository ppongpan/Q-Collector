import React from 'react';

/**
 * ColorPicker Component
 *
 * Reusable color picker with preset Tailwind colors and custom color input
 * Used for Conditional Formatting feature
 *
 * @param {string} value - Current color value (hex)
 * @param {function} onChange - Callback when color changes
 * @param {string} label - Label for the color picker
 * @param {boolean} allowClear - Whether to show clear button (default: true)
 */
export function ColorPicker({ value, onChange, label, allowClear = true }) {
  // Preset color palette with Tailwind colors
  const presetColors = [
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Lime', value: '#84cc16' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Sky', value: '#0ea5e9' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Violet', value: '#8b5cf6' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Fuchsia', value: '#d946ef' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Gray', value: '#6b7280' },
    { name: 'Slate', value: '#64748b' },
    { name: 'Zinc', value: '#71717a' },
    { name: 'Black', value: '#000000' },
    { name: 'White', value: '#ffffff' }
  ];

  return (
    <div className="space-y-2">
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-foreground/90">
          {label}
        </label>
      )}

      {/* Current Color Display */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-10 h-10 rounded border-2 border-border/50 cursor-pointer hover:scale-110 transition-transform duration-200 shadow-sm"
          style={{ backgroundColor: value || '#ffffff' }}
          onClick={() => document.getElementById(`color-input-${label}`)?.click()}
          title="คลิกเพื่อเลือกสี"
        />
        <span className="text-xs font-mono text-muted-foreground min-w-[80px]">
          {value || 'ไม่กำหนด'}
        </span>

        {/* Clear Button */}
        {allowClear && value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            ล้างสี
          </button>
        )}
      </div>

      {/* Preset Colors Grid */}
      <div className="flex flex-wrap gap-1.5">
        {presetColors.map(color => (
          <button
            key={color.value}
            type="button"
            onClick={() => onChange(color.value)}
            className={`w-7 h-7 rounded border-2 transition-all duration-200 ${
              value === color.value
                ? 'border-orange-500 ring-2 ring-orange-500/30 scale-110'
                : 'border-border/30 hover:border-border hover:scale-110'
            }`}
            style={{ backgroundColor: color.value }}
            title={color.name}
            aria-label={`Select ${color.name}`}
          />
        ))}
      </div>

      {/* HTML5 Color Picker (hidden input triggered by current color display) */}
      <input
        id={`color-input-${label}`}
        type="color"
        value={value || '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        aria-label="Custom color picker"
      />

      {/* Custom Color Button */}
      <button
        type="button"
        onClick={() => document.getElementById(`color-input-${label}`)?.click()}
        className="w-full text-xs px-3 py-2 rounded bg-background/50 hover:bg-background/70 border border-border/50 hover:border-border transition-colors duration-200 text-foreground/70 hover:text-foreground"
      >
        🎨 เลือกสีกำหนดเอง
      </button>
    </div>
  );
}

export default ColorPicker;
