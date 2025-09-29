import React, { useState } from "react";
import { Slider } from "./slider";
import PercentageCircle from "./percentage-circle";
import { cn } from "../../lib/utils";

const EnhancedSlider = ({
  value = 0,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label = "",
  description = "",
  showCircle = true,
  showProgress = true,
  color = "blue",
  size = "default",
  className = "",
  disabled = false
}) => {
  const [isHovering, setIsHovering] = useState(false);

  const percentage = ((value - min) / (max - min)) * 100;

  // Size variants
  const sizes = {
    sm: { circle: 80, stroke: 6 },
    default: { circle: 100, stroke: 8 },
    lg: { circle: 120, stroke: 10 }
  };

  const currentSize = sizes[size] || sizes.default;

  // Color variants for different use cases
  const getColorByValue = (val) => {
    if (val < 25) return "red";
    if (val < 50) return "orange";
    if (val < 75) return "blue";
    return "green";
  };

  const dynamicColor = color === "auto" ? getColorByValue(percentage) : color;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Label and Description */}
      {(label || description) && (
        <div className="space-y-1">
          {label && (
            <label className="text-sm font-medium text-gray-700">
              {label}
            </label>
          )}
          {description && (
            <p className="text-[12px] text-gray-500">{description}</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-6">
        {/* Slider Section */}
        <div className="flex-1 space-y-3">
          <div
            className="relative"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <Slider
              value={[value]}
              onValueChange={(values) => onChange(values[0])}
              min={min}
              max={max}
              step={step}
              disabled={disabled}
              className="w-full"
            />

            {/* Interactive tooltip */}
            {isHovering && (
              <div className="absolute -top-8 left-0 right-0 pointer-events-none">
                <div
                  className="absolute bg-black text-white text-sm rounded px-2 py-1 whitespace-nowrap transform -translate-x-1/2 z-10"
                  style={{
                    left: `${percentage}%`
                  }}
                >
                  {value}
                </div>
              </div>
            )}
          </div>

          {/* Linear progress bar (optional) */}
          {showProgress && (
            <div className="w-full progress-bg rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  dynamicColor === "red" ? "bg-red-500" :
                  dynamicColor === "orange" ? "bg-orange-500" :
                  dynamicColor === "blue" ? "bg-blue-500" :
                  dynamicColor === "green" ? "bg-green-500" :
                  dynamicColor === "purple" ? "bg-purple-500" : "bg-blue-500"
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          )}

          {/* Range labels */}
          <div className="flex justify-between text-sm text-gray-500">
            <span>{min}</span>
            <span className="font-medium text-gray-700">
              ปัจจุบัน: {value}
            </span>
            <span>{max}</span>
          </div>
        </div>

        {/* Percentage Circle */}
        {showCircle && (
          <div className="flex-shrink-0">
            <PercentageCircle
              value={Math.round(percentage)}
              size={currentSize.circle}
              strokeWidth={currentSize.stroke}
              color={dynamicColor}
              label={label ? label.split(' ').pop() : ""}
              showValue={true}
            />
          </div>
        )}
      </div>

      {/* Value indicators */}
      <div className="grid grid-cols-4 gap-2 text-sm">
        <div className={`text-center p-2 rounded ${
          percentage < 25 ? 'status-badge-error' : 'text-muted-foreground'
        }`}>
          ต่ำ (0-25%)
        </div>
        <div className={`text-center p-2 rounded ${
          percentage >= 25 && percentage < 50 ? 'status-badge-warning' : 'text-muted-foreground'
        }`}>
          ปานกลาง (25-50%)
        </div>
        <div className={`text-center p-2 rounded ${
          percentage >= 50 && percentage < 75 ? 'status-badge-info' : 'text-muted-foreground'
        }`}>
          ดี (50-75%)
        </div>
        <div className={`text-center p-2 rounded ${
          percentage >= 75 ? 'status-badge-success' : 'text-muted-foreground'
        }`}>
          ดีเยี่ยม (75-100%)
        </div>
      </div>
    </div>
  );
};

export default EnhancedSlider;