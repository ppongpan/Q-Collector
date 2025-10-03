/**
 * ThemeSelector Component
 *
 * Provides UI for selecting application theme (Glass, Minimal, or Liquid).
 * Displays theme cards with preview and tooltips.
 *
 * @component
 * @version 0.6.3
 * @since 2025-10-01
 */

import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { themes } from '../../config/themes';
import { Check, Lock, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

const ThemeSelector = () => {
  const { theme: currentTheme, setTheme } = useTheme();

  const handleThemeChange = (themeId) => {
    const selectedTheme = themes[themeId];
    if (selectedTheme && selectedTheme.available) {
      setTheme(themeId);
    }
  };

  // Theme preview configuration with fixed colors for each theme
  const themePreview = {
    glass: {
      emoji: '✨',
      subtitle: 'กระจกเรืองแสง',
      // Fixed glass theme colors (orange + dark background)
      previewBg: 'bg-gradient-to-br from-orange-500/20 via-orange-400/10 to-black/80',
      previewBorder: 'border-orange-500/30',
      backdropBlur: 'backdrop-blur-sm',
      textColor: 'text-orange-400',
      subtitleColor: 'text-orange-200/60'
    },
    minimal: {
      emoji: '⚡',
      subtitle: 'เรียบง่ายเร็ว',
      // Fixed minimal theme colors (clean white/gray)
      previewBg: 'bg-white dark:bg-gray-900',
      previewBorder: 'border-gray-200 dark:border-gray-700',
      backdropBlur: '',
      textColor: 'text-gray-900 dark:text-gray-100',
      subtitleColor: 'text-gray-500 dark:text-gray-400'
    },
    liquid: {
      emoji: '💧',
      subtitle: 'Liquid สีฟ้า',
      // Fixed liquid theme colors (cyan + blue)
      previewBg: 'bg-gradient-to-br from-cyan-400/30 via-blue-500/20 to-black/80',
      previewBorder: 'border-cyan-400/40',
      backdropBlur: 'backdrop-blur-xl',
      textColor: 'text-cyan-400',
      subtitleColor: 'text-cyan-200/60'
    }
  };

  return (
    <div className="space-y-5 pt-4 md:pt-0">
      {/* Header with reduced description */}
      <div>
        <h3 className="text-xl font-bold text-foreground mb-1">
          เลือกธีม
        </h3>
        <p className="text-xs text-muted-foreground">
          รูปแบบการแสดงผล
        </p>
      </div>

      {/* Theme Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {Object.values(themes).map((themeOption) => {
          const isActive = currentTheme === themeOption.id;
          const isAvailable = themeOption.available;
          const isDefault = themeOption.isDefault;
          const preview = themePreview[themeOption.id];

          return (
            <TooltipProvider key={themeOption.id} delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleThemeChange(themeOption.id)}
                    disabled={!isAvailable}
                    className={`
                      relative p-3 transition-all duration-300 overflow-hidden
                      ${isActive
                        ? themeOption.id === 'glass'
                          ? 'bg-gradient-to-br from-orange-500/20 via-orange-400/10 to-transparent backdrop-blur-sm shadow-lg shadow-orange-500/30 animate-pulse-glow'
                          : 'bg-primary/10 shadow-lg shadow-primary/20'
                        : isAvailable
                          ? themeOption.id === 'glass'
                            ? 'bg-gradient-to-br from-orange-500/10 via-orange-400/5 to-transparent backdrop-blur-sm hover:from-orange-500/20 hover:shadow-md hover:shadow-orange-500/20 hover:scale-[1.02]'
                            : 'bg-card/50 hover:bg-card/80 hover:shadow-md hover:scale-[1.02]'
                          : 'bg-muted/30 cursor-not-allowed opacity-50'
                      }
                      text-left group
                    `}
                    style={{
                      borderRadius: '1.5rem'
                    }}
                  >
                    {/* Active Indicator */}
                    {isActive && (
                      <div className={`absolute top-2 right-2 h-5 w-5 rounded-full flex items-center justify-center
                        ${themeOption.id === 'glass'
                          ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/50'
                          : 'bg-primary text-primary-foreground'
                        }`}>
                        <Check className="h-3 w-3" />
                      </div>
                    )}

                    {/* Locked Indicator */}
                    {!isAvailable && (
                      <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                        <Lock className="h-3 w-3" />
                      </div>
                    )}

                    {/* Theme Preview Box - Fixed theme-specific styling */}
                    <div className={`
                      h-20 rounded-2xl mb-2 border flex items-center justify-center
                      transition-all duration-300 group-hover:scale-[1.02]
                      ${preview.previewBg}
                      ${preview.previewBorder}
                      ${preview.backdropBlur}
                    `}>
                      <div className="text-center">
                        <div className={`text-3xl mb-1 ${preview.textColor}`}>
                          {preview.emoji}
                        </div>
                        <div className={`text-[10px] font-medium ${preview.subtitleColor}`}>
                          {preview.subtitle}
                        </div>
                      </div>
                    </div>

                    {/* Theme Name & Badges */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-foreground truncate">
                          {themeOption.name}
                        </h4>
                        {isAvailable && (
                          <Info className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex gap-1">
                        {isDefault && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            ค่าเริ่มต้น
                          </span>
                        )}
                        {!isAvailable && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                            เร็วๆ นี้
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs font-medium mb-1">{themeOption.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {themeOption.description}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>

      {/* Current Theme Compact Info */}
      <div className="p-3 rounded-lg bg-muted/20 border border-border/50">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Check className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-foreground truncate">
              {themes[currentTheme]?.name}
            </h4>
            <p className="text-[11px] text-muted-foreground truncate">
              กำลังใช้งาน
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeSelector;
