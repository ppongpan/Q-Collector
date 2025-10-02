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

  // Theme preview configuration
  const themePreview = {
    glass: {
      emoji: '✨',
      subtitle: 'กระจกเรืองแสง',
      gradient: 'bg-gradient-to-br from-orange-500/20 via-orange-400/10 to-transparent backdrop-blur-sm border-orange-500/30',
      textColor: 'text-orange-500'
    },
    minimal: {
      emoji: '⚡',
      subtitle: 'เรียบง่ายเร็ว',
      gradient: 'bg-card border-border',
      textColor: 'text-foreground'
    },
    liquid: {
      emoji: '💧',
      subtitle: 'Liquid สีฟ้า',
      gradient: 'bg-gradient-to-br from-cyan-400/30 via-blue-500/20 to-transparent backdrop-blur-xl border-cyan-400/40',
      textColor: 'text-cyan-400'
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
                      relative p-3 rounded-lg border-2 transition-all duration-200
                      ${isActive
                        ? 'border-primary bg-primary/5 shadow-lg'
                        : isAvailable
                          ? 'border-border hover:border-primary/50 hover:bg-accent/5 hover:shadow-md'
                          : 'border-border bg-muted/30 cursor-not-allowed opacity-50'
                      }
                      text-left group
                    `}
                  >
                    {/* Active Indicator */}
                    {isActive && (
                      <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check className="h-3 w-3" />
                      </div>
                    )}

                    {/* Locked Indicator */}
                    {!isAvailable && (
                      <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                        <Lock className="h-3 w-3" />
                      </div>
                    )}

                    {/* Theme Preview Box */}
                    <div className={`
                      h-20 rounded-md mb-2 border flex items-center justify-center
                      transition-all duration-300 group-hover:scale-[1.02]
                      ${preview.gradient}
                    `}>
                      <div className="text-center">
                        <div className={`text-3xl mb-1 ${preview.textColor}`}>
                          {preview.emoji}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-medium">
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
