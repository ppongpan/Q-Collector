/**
 * ThemeTestPage - Component Testing Page for Minimal Theme
 *
 * Tests all 6 core components to verify proper styling and functionality.
 * Use this page to test theme switching between Glass and Minimal themes.
 *
 * @component
 * @version 0.6.0
 * @since 2025-10-01
 */

import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
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
import { ArrowLeft, Moon, Sun } from 'lucide-react';

const ThemeTestPage = ({ onNavigate }) => {
  const { theme, isDarkMode, toggleDarkMode } = useTheme();
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('');
  const [checked, setChecked] = useState(false);

  return (
    <div className="min-h-screen bg-background p-6">
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

        {/* Button Variants Test */}
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

        {/* Input Component Test */}
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

        {/* Select Component Test */}
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

        {/* Checkbox and Label Test */}
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

        {/* Summary */}
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
      </div>
    </div>
  );
};

export default ThemeTestPage;
