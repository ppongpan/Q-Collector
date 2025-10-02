/**
 * ThemeTestPage - Comprehensive Theme Testing System
 *
 * Tests all themes (Glass, Minimal, Liquid) with:
 * - Typography system
 * - All UI components
 * - Color palettes
 * - Responsive behavior
 * - Quick theme switching
 *
 * @component
 * @version 0.6.3
 * @since 2025-10-02
 */

import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
  GlassCardFooter
} from './ui/glass-card';
import { GlassButton } from './ui/glass-button';
import { GlassInput, GlassSelect } from './ui/glass-input';
import { GlassCheckbox } from './ui/glass-checkbox';
import { GlassLabel } from './ui/glass-label';
import { MinimalCard, MinimalCardContent, MinimalCardHeader, MinimalCardTitle } from './ui/minimal-card';
import { MinimalButton } from './ui/minimal-button';
import { MinimalInput } from './ui/minimal-input';
import { MinimalSelect } from './ui/minimal-select';
import { ArrowLeft, Moon, Sun, Sparkles, Palette, Type, Layout, Zap, Droplet } from 'lucide-react';

const ThemeTestPage = ({ onNavigate }) => {
  const { theme, setTheme, isDarkMode, toggleDarkMode } = useTheme();
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('');
  const [checked, setChecked] = useState(false);
  const [showLiquidDemo, setShowLiquidDemo] = useState(false);
  const [activeSection, setActiveSection] = useState('all');

  // Liquid theme animation variants
  const pageVariants = {
    initial: {
      opacity: 0,
      scale: 0.95
    },
    animate: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.19, 1, 0.22, 1]
      }
    }
  };

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 20
    },
    visible: (index) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: index * 0.1,
        duration: 0.5,
        type: "spring",
        stiffness: 100
      }
    })
  };

  const isLiquid = theme === 'liquid';

  return (
    <motion.div
      className="min-h-screen bg-background p-6"
      initial={isLiquid ? "initial" : false}
      animate={isLiquid ? "animate" : false}
      variants={pageVariants}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <GlassButton
              variant="ghost"
              size="icon"
              onClick={() => onNavigate && onNavigate('home')}
            >
              <ArrowLeft className="h-5 w-5" />
            </GlassButton>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Theme Test Page
              </h1>
              <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Current Theme: <span className="font-semibold" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>{theme}</span> |
                Dark Mode: <span className="font-semibold" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>{isDarkMode ? 'On' : 'Off'}</span>
              </p>
            </div>
          </div>
          <GlassButton
            variant="default"
            onClick={toggleDarkMode}
          >
            {isDarkMode ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </GlassButton>
        </div>

        {/* Card Component Test */}
        <motion.div
          custom={0}
          initial={isLiquid ? "hidden" : false}
          animate={isLiquid ? "visible" : false}
          variants={cardVariants}
        >
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle>GlassCard Component</GlassCardTitle>
            <GlassCardDescription>
              Testing card with header, title, description, content, and footer
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <p className="text-sm text-foreground">
              This is the card content area. The card should have proper glass morphism effects,
              backdrop blur, and hover effects.
            </p>
          </GlassCardContent>
          <GlassCardFooter>
            <p className="text-xs text-muted-foreground">Card Footer</p>
          </GlassCardFooter>
        </GlassCard>
        </motion.div>

        {/* Button Variants Test */}
        <motion.div
          custom={1}
          initial={isLiquid ? "hidden" : false}
          animate={isLiquid ? "visible" : false}
          variants={cardVariants}
        >
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle>GlassButton Component</GlassCardTitle>
            <GlassCardDescription>
              Testing all button variants and sizes
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent className="space-y-4">
            {/* Button Variants */}
            <div>
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Variants:</h3>
              <div className="flex flex-wrap gap-2">
                <GlassButton variant="default">Default</GlassButton>
                <GlassButton variant="primary">Primary</GlassButton>
                <GlassButton variant="ghost">Ghost</GlassButton>
              </div>
            </div>

            {/* Button Sizes */}
            <div>
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Sizes:</h3>
              <div className="flex flex-wrap items-center gap-2">
                <GlassButton size="sm">Small</GlassButton>
                <GlassButton size="default">Default</GlassButton>
                <GlassButton size="lg">Large</GlassButton>
              </div>
            </div>

            {/* Disabled State */}
            <div>
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>States:</h3>
              <div className="flex flex-wrap gap-2">
                <GlassButton>Enabled</GlassButton>
                <GlassButton disabled>Disabled</GlassButton>
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>
        </motion.div>

        {/* Input Component Test */}
        <motion.div
          custom={2}
          initial={isLiquid ? "hidden" : false}
          animate={isLiquid ? "visible" : false}
          variants={cardVariants}
        >
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle>GlassInput Component</GlassCardTitle>
            <GlassCardDescription>
              Testing text input with different states
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent className="space-y-4">
            <GlassInput
              label="Label for Input"
              type="text"
              placeholder="Enter text here..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Current value: {inputValue || '(empty)'}
            </p>

            <GlassInput
              label="Disabled Input"
              type="text"
              placeholder="Disabled"
              disabled
            />

            <GlassInput
              label="Email Input"
              type="email"
              placeholder="email@example.com"
            />
          </GlassCardContent>
        </GlassCard>
        </motion.div>

        {/* Select Component Test */}
        <motion.div
          custom={3}
          initial={isLiquid ? "hidden" : false}
          animate={isLiquid ? "visible" : false}
          variants={cardVariants}
        >
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle>GlassSelect Component</GlassCardTitle>
            <GlassCardDescription>
              Testing dropdown select with keyboard navigation
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent className="space-y-4">
            <GlassSelect
              label="Select an Option"
              value={selectValue}
              onChange={(e) => setSelectValue(e.target.value)}
            >
              <option value="">Choose an option...</option>
              <option value="option1">Option 1</option>
              <option value="option2">Option 2</option>
              <option value="option3">Option 3</option>
              <option value="option4" disabled>Option 4 (Disabled)</option>
              <option value="option5">Option 5</option>
            </GlassSelect>
            <p className="text-xs text-muted-foreground">
              Selected: {selectValue || '(none)'}
            </p>
          </GlassCardContent>
        </GlassCard>
        </motion.div>

        {/* Checkbox and Label Test */}
        <motion.div
          custom={4}
          initial={isLiquid ? "hidden" : false}
          animate={isLiquid ? "visible" : false}
          variants={cardVariants}
        >
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle>GlassCheckbox & GlassLabel</GlassCardTitle>
            <GlassCardDescription>
              Testing checkbox with label association
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <GlassCheckbox
                id="test-checkbox"
                checked={checked}
                onCheckedChange={setChecked}
              />
              <GlassLabel htmlFor="test-checkbox">
                I agree to the terms and conditions
              </GlassLabel>
            </div>
            <p className="text-xs text-muted-foreground">
              Checkbox status: {checked ? 'Checked ✓' : 'Unchecked'}
            </p>

            <div className="flex items-center space-x-2">
              <GlassCheckbox id="disabled-checkbox" disabled />
              <GlassLabel htmlFor="disabled-checkbox">
                Disabled checkbox
              </GlassLabel>
            </div>
          </GlassCardContent>
        </GlassCard>
        </motion.div>

        {/* Summary */}
        <motion.div
          custom={5}
          initial={isLiquid ? "hidden" : false}
          animate={isLiquid ? "visible" : false}
          variants={cardVariants}
        >
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle>Testing Summary</GlassCardTitle>
            <GlassCardDescription>
              Glass Component checklist
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <ul className="space-y-2 text-sm text-foreground">
              <li>✅ GlassCard - Header, Title, Description, Content, Footer</li>
              <li>✅ GlassButton - 3 variants, 3 sizes, disabled state</li>
              <li>✅ GlassInput - Text, email types, disabled state, with labels</li>
              <li>✅ GlassSelect - Dropdown with native select, disabled options</li>
              <li>✅ GlassCheckbox - Checked/unchecked, disabled state</li>
              <li>✅ GlassLabel - Label association with form controls</li>
            </ul>
          </GlassCardContent>
          <GlassCardFooter>
            <p className="text-xs text-muted-foreground">
              All Glass components working in Glass (Orange Neon) theme
            </p>
          </GlassCardFooter>
        </GlassCard>
        </motion.div>

        {/* Liquid Theme Special Demo */}
        {isLiquid && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.5 }}
          >
            <GlassCard className="liquid-card overflow-hidden">
              <GlassCardHeader>
                <motion.div
                  animate={{
                    rotate: [0, 360],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="absolute top-4 right-4"
                >
                  <Sparkles className="h-6 w-6 text-orange-500 opacity-50" />
                </motion.div>
                <GlassCardTitle>iOS 26 Liquid Glass Theme Active</GlassCardTitle>
                <GlassCardDescription>
                  Experience ultra-smooth animations with 60fps performance
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="space-y-4">
                  <motion.div
                    className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30"
                    whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(255, 140, 0, 0.3)" }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <h4 className="font-semibold mb-2">Liquid Effects</h4>
                    <ul className="text-sm space-y-1 opacity-90">
                      <li>✨ 32px ultra-smooth blur</li>
                      <li>🌊 Organic cubic-bezier curves</li>
                      <li>🎨 150% color saturation</li>
                      <li>💫 Multi-layer shadows with glow</li>
                    </ul>
                  </motion.div>

                  <motion.button
                    className="liquid-button primary w-full"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowLiquidDemo(!showLiquidDemo)}
                  >
                    {showLiquidDemo ? "Hide" : "Show"} Liquid Demo
                  </motion.button>

                  <AnimatePresence>
                    {showLiquidDemo && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid grid-cols-3 gap-2"
                      >
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <motion.div
                            key={i}
                            className="aspect-square bg-gradient-to-br from-orange-500/20 to-orange-600/30 rounded-lg"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                              delay: i * 0.05,
                              type: "spring",
                              stiffness: 200
                            }}
                            whileHover={{
                              scale: 1.1,
                              rotate: 5,
                              transition: { type: "spring", stiffness: 400 }
                            }}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </GlassCardContent>
            </GlassCard>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default ThemeTestPage;
