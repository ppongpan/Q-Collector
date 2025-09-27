import React from "react";

const PercentageCircle = ({
  value = 0,
  size = 120,
  strokeWidth = 8,
  className = "",
  showValue = true,
  color = "blue",
  label = ""
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  // Color variants
  const colors = {
    blue: {
      track: "#e2e8f0", // slate-200
      progress: "#3b82f6", // blue-500
      text: "#1e40af" // blue-700
    },
    green: {
      track: "#dcfce7", // green-100
      progress: "#22c55e", // green-500
      text: "#15803d" // green-700
    },
    orange: {
      track: "#fed7aa", // orange-200
      progress: "#f97316", // orange-500
      text: "#c2410c" // orange-700
    },
    purple: {
      track: "#e9d5ff", // purple-200
      progress: "#a855f7", // purple-500
      text: "#7c2d12" // purple-700
    },
    red: {
      track: "#fecaca", // red-200
      progress: "#ef4444", // red-500
      text: "#b91c1c" // red-700
    }
  };

  const currentColor = colors[color] || colors.blue;

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      <div className="relative">
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={currentColor.track}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={currentColor.progress}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center content */}
        {showValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div
              className="text-2xl font-bold"
              style={{ color: currentColor.text }}
            >
              {value}%
            </div>
            {label && (
              <div className="text-sm text-gray-500 text-center max-w-16 leading-tight">
                {label}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PercentageCircle;