import React from 'react';
import { motion } from 'framer-motion';
import { Slider } from './slider';

const EnhancedFormSlider = ({
  value = 0,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  label = "",
  required = false,
  description = "",
  className = "",
  disabled = false
}) => {
  const currentValue = value !== undefined && value !== null ? Number(value) : min;
  const percentage = ((currentValue - min) / (max - min)) * 100;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Label */}
      <label className="block text-sm font-medium text-foreground/80">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>

      {/* Slider Container */}
      <div className="space-y-4 px-2">
        {/* Main Slider */}
        <Slider
          value={[currentValue]}
          onValueChange={onValueChange}
          max={max}
          min={min}
          step={step}
          disabled={disabled}
          className="w-full"
        />

        {/* Value display and range indicators */}
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground font-mono">{min}</span>

          {/* Current value badge */}
          <motion.div
            className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg border-2 border-white/20"
            animate={{
              scale: [1, 1.05, 1],
              boxShadow: [
                "0 4px 12px rgba(249, 115, 22, 0.3)",
                "0 8px 24px rgba(249, 115, 22, 0.4)",
                "0 4px 12px rgba(249, 115, 22, 0.3)"
              ]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            key={currentValue} // Re-trigger animation on value change
          >
            {currentValue}
          </motion.div>

          <span className="text-xs text-muted-foreground font-mono">{max}</span>
        </div>



        {/* Description */}
        {description && (
          <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

export default EnhancedFormSlider;