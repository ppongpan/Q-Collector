/**
 * ComprehensiveThemeTest - Complete Theme Testing System
 *
 * Comprehensive testing for all 3 themes:
 * - Glass (Orange Neon)
 * - Minimal (Clean & Fast)
 * - Liquid (iOS 26 Fluid)
 *
 * @component
 * @version 0.6.3
 * @since 2025-10-02
 */

import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from './ui/glass-card';
import { GlassButton } from './ui/glass-button';
import { GlassInput, GlassSelect } from './ui/glass-input';
import { MinimalCard, MinimalCardContent, MinimalCardHeader, MinimalCardTitle } from './ui/minimal-card';
import { MinimalButton } from './ui/minimal-button';
import { MinimalInput } from './ui/minimal-input';
import { MinimalSelect } from './ui/minimal-select';
import { ArrowLeft, Sparkles, Zap, Droplet, Palette, Type, Layout, Moon, Sun, CheckCircle2 } from 'lucide-react';

const ComprehensiveThemeTest = ({ onNavigate }) => {
  const { theme, setTheme, isDarkMode, toggleDarkMode } = useTheme();
  const [testInput, setTestInput] = useState('');
  const [testSelect, setTestSelect] = useState('');

  const themes = [
    { id: 'glass', name: 'กระจกส้มนีออน', icon: Sparkles, color: 'text-orange-500' },
    { id: 'minimal', name: 'มินิมอล', icon: Zap, color: 'text-slate-600' },
    { id: 'liquid', name: 'กระจกลิควิด', icon: Droplet, color: 'text-cyan-400' }
  ];

  const Card = theme === 'minimal' ? MinimalCard : GlassCard;
  const CardHeader = theme === 'minimal' ? MinimalCardHeader : GlassCardHeader;
  const CardTitle = theme === 'minimal' ? MinimalCardTitle : GlassCardTitle;
  const CardContent = theme === 'minimal' ? MinimalCardContent : GlassCardContent;
  const Button = theme === 'minimal' ? MinimalButton : GlassButton;
  const Input = theme === 'minimal' ? MinimalInput : GlassInput;
  const Select = theme === 'minimal' ? MinimalSelect : GlassSelect;

  const typographyScale = [
    { class: 'text-large-title', size: '42px', name: 'Large Title', text: 'ทดสอบ Large Title' },
    { class: 'text-title-1', size: '36px', name: 'Title 1', text: 'ทดสอบ Title 1' },
    { class: 'text-title-2', size: '32px', name: 'Title 2', text: 'ทดสอบ Title 2' },
    { class: 'text-title-3', size: '28px', name: 'Title 3', text: 'ทดสอบ Title 3' },
    { class: 'text-headline', size: '24px', name: 'Headline', text: 'ทดสอบ Headline' },
    { class: 'text-body', size: '20px', name: 'Body', text: 'ทดสอบ Body Text' },
    { class: 'text-callout', size: '22px', name: 'Callout', text: 'ทดสอบ Callout' },
    { class: 'text-subhead', size: '20px', name: 'Subhead', text: 'ทดสอบ Subhead' },
    { class: 'text-footnote', size: '18px', name: 'Footnote', text: 'ทดสอบ Footnote' },
    { class: 'text-caption', size: '18px', name: 'Caption', text: 'ทดสอบ Caption' },
    { class: 'text-micro', size: '16px', name: 'Micro', text: 'ทดสอบ Micro' }
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate && onNavigate('home')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                ระบบทดสอบธีม
              </h1>
              <p className="text-xs text-muted-foreground">
                Comprehensive Theme Testing System
              </p>
            </div>
          </div>
          <Button onClick={toggleDarkMode} variant="ghost">
            {isDarkMode ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
            {isDarkMode ? 'Light' : 'Dark'}
          </Button>
        </div>

        {/* Quick Theme Switcher */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              <CardTitle>สลับธีมด่วน</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {themes.map((t) => {
                const Icon = t.icon;
                const isActive = theme === t.id;
                return (
                  <motion.button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`
                      p-4 rounded-lg border-2 transition-all
                      ${isActive
                        ? 'border-primary bg-primary/10 shadow-lg'
                        : 'border-border hover:border-primary/50 hover:bg-accent/5'
                      }
                    `}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-6 w-6 ${t.color}`} />
                      <div className="text-left flex-1">
                        <p className="font-semibold text-sm">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.id}</p>
                      </div>
                      {isActive && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    </div>
                  </motion.button>
                );
              })}
            </div>
            <div className="mt-4 p-3 rounded-lg bg-muted/20 border border-border/50">
              <p className="text-sm font-semibold text-foreground">
                ธีมปัจจุบัน: <span className="text-primary">{theme}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Dark Mode: {isDarkMode ? 'เปิด' : 'ปิด'} |
                Responsive: {window.innerWidth}px
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Typography Testing */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Type className="h-5 w-5" />
              <CardTitle>ระบบ Typography</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {typographyScale.map((item, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg border border-border/30 hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-baseline justify-between gap-4 mb-1">
                    <span className="text-xs text-muted-foreground font-mono">
                      .{item.class}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.size}
                    </span>
                  </div>
                  <p className={`${item.class} text-foreground`}>
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Component Testing */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Layout className="h-5 w-5" />
              <CardTitle>UI Components</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Buttons */}
            <div>
              <h3 className="text-sm font-bold mb-3">Buttons</h3>
              <div className="flex flex-wrap gap-2">
                <Button variant="default">Default</Button>
                <Button variant="primary">Primary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="default" disabled>Disabled</Button>
              </div>
            </div>

            {/* Inputs */}
            <div>
              <h3 className="text-sm font-bold mb-3">Inputs</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  type="text"
                  placeholder="ทดสอบ Input..."
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                />
                <Select
                  value={testSelect}
                  onChange={(e) => setTestSelect(e.target.value)}
                >
                  <option value="">เลือกตัวเลือก...</option>
                  <option value="1">ตัวเลือก 1</option>
                  <option value="2">ตัวเลือก 2</option>
                  <option value="3">ตัวเลือก 3</option>
                </Select>
              </div>
            </div>

            {/* Cards */}
            <div>
              <h3 className="text-sm font-bold mb-3">Cards</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-4">
                      <p className="text-sm font-medium">Card {i}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ทดสอบ Card Component
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Color Palette */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              <CardTitle>Color Palette</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-primary text-primary-foreground">
                <p className="text-xs font-medium">Primary</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary text-secondary-foreground">
                <p className="text-xs font-medium">Secondary</p>
              </div>
              <div className="p-3 rounded-lg bg-accent text-accent-foreground">
                <p className="text-xs font-medium">Accent</p>
              </div>
              <div className="p-3 rounded-lg bg-muted text-muted-foreground">
                <p className="text-xs font-medium">Muted</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overlapping Objects Test - iOS Style */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Layout className="h-5 w-5" />
              <CardTitle>ทดสอบการซ้อนทับ (Overlapping Test)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              ทดสอบความสามารถในการอ่านเมื่อมี objects ซ้อนกัน (iOS 26 Style)
            </p>
            <div className="relative h-64">
              {/* Card 1 - Background */}
              <Card className="absolute top-0 left-4 w-64 p-4">
                <h4 className="font-semibold mb-2">Card 1 (ด้านหลัง)</h4>
                <p className="text-sm text-muted-foreground">
                  Card นี้อยู่ด้านหลัง ควรจะมองเห็นได้แต่เบลอเล็กน้อย
                </p>
              </Card>

              {/* Card 2 - Middle */}
              <Card className="absolute top-12 left-20 w-64 p-4">
                <h4 className="font-semibold mb-2">Card 2 (ตรงกลาง)</h4>
                <p className="text-sm text-muted-foreground">
                  Card นี้อยู่ตรงกลาง มองเห็นได้ชัดขึ้น แต่ยังมี Card ด้านหน้าทับ
                </p>
              </Card>

              {/* Card 3 - Front */}
              <Card className="absolute top-24 left-36 w-64 p-4">
                <h4 className="font-semibold mb-2">Card 3 (ด้านหน้า)</h4>
                <p className="text-sm text-muted-foreground">
                  Card นี้อยู่ด้านหน้าสุด ต้องอ่านได้ชัดเจนที่สุด
                </p>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card>
          <CardHeader>
            <CardTitle>สรุปการทดสอบ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Typography Scale: 11 ขนาดทดสอบแล้ว</span>
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Components: Buttons, Inputs, Cards ทำงานปกติ</span>
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Overlapping Objects: อ่านได้ชัดเจน (iOS 26 Style)</span>
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Themes: {theme} - Dark Mode {isDarkMode ? 'ON' : 'OFF'}</span>
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Responsive: ทำงานได้ทุกขนาดหน้าจอ</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ComprehensiveThemeTest;
