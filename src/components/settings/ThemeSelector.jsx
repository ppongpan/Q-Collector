/**
 * ThemeSelector Component
 *
 * Provides UI for selecting application theme (Glass or Minimal).
 * Displays theme cards with preview and status indicators.
 *
 * @component
 * @version 0.6.0
 * @since 2025-10-01
 */

import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { themes, getAvailableThemes } from '../../config/themes';
import { Check, Lock } from 'lucide-react';

const ThemeSelector = () => {
  const { theme: currentTheme, setTheme } = useTheme();
  const availableThemes = getAvailableThemes();

  const handleThemeChange = (themeId) => {
    const selectedTheme = themes[themeId];
    if (selectedTheme && selectedTheme.available) {
      setTheme(themeId);
    }
  };

  return (
    <div className="space-y-6 pt-4 md:pt-0">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          เลือกธีม (Theme)
        </h3>
        <p className="text-sm text-muted-foreground">
          เลือกรูปแบบการแสดงผลของแอปพลิเคชัน
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.values(themes).map((themeOption) => {
          const isActive = currentTheme === themeOption.id;
          const isAvailable = themeOption.available;
          const isDefault = themeOption.isDefault;

          return (
            <button
              key={themeOption.id}
              onClick={() => handleThemeChange(themeOption.id)}
              disabled={!isAvailable}
              className={`
                relative p-4 rounded-lg border-2 transition-all duration-200
                ${isActive
                  ? 'border-primary bg-primary/5'
                  : isAvailable
                    ? 'border-border hover:border-primary/50 hover:bg-accent/5'
                    : 'border-border bg-muted/30 cursor-not-allowed opacity-60'
                }
                text-left
              `}
            >
              {/* Active Indicator */}
              {isActive && (
                <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Check className="h-4 w-4" />
                </div>
              )}

              {/* Locked Indicator */}
              {!isAvailable && (
                <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                  <Lock className="h-4 w-4" />
                </div>
              )}

              {/* Theme Preview Box */}
              <div className={`
                h-24 rounded-md mb-3 border flex items-center justify-center
                ${themeOption.id === 'glass'
                  ? 'bg-gradient-to-br from-orange-500/20 via-orange-400/10 to-transparent backdrop-blur-sm border-orange-500/30'
                  : themeOption.id === 'minimal'
                    ? 'bg-card border-border'
                    : 'bg-gradient-to-br from-blue-500/20 via-blue-400/10 to-transparent backdrop-blur-sm border-blue-500/30'
                }
              `}>
                {/* Preview Text */}
                <div className="text-center">
                  <div className={`text-2xl font-bold mb-1 ${themeOption.id === 'glass' ? 'text-orange-500' : 'text-foreground'}`}>
                    {themeOption.id === 'glass' ? '✨' : themeOption.id === 'minimal' ? '⚡' : '💧'}
                  </div>
                  <div className="text-xs text-muted-foreground font-medium">
                    {themeOption.id === 'glass' ? 'กระจกเรืองแสง' : themeOption.id === 'minimal' ? 'เรียบง่ายเร็ว' : 'ลื่นไหล iOS'}
                  </div>
                </div>
              </div>

              {/* Theme Info */}
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground">
                  {themeOption.name}
                </h4>
                {isDefault && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    ค่าเริ่มต้น
                  </span>
                )}
                {!isAvailable && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    เร็วๆ นี้
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Current Theme Info */}
      <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Check className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-1">
              ธีมปัจจุบัน: {themes[currentTheme]?.name}
            </h4>
            <p className="text-sm text-muted-foreground">
              {themes[currentTheme]?.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeSelector;
