import React, { createContext, useContext, useState, useEffect } from 'react';

// Font options with Thai labels and descriptions
const FONT_OPTIONS = [
  {
    id: 'noto-thai',
    name: 'Noto Sans Thai',
    thaiName: 'โนโต',
    description: 'ฟอนต์เริ่มต้น - รองรับอักขระครบถ้วน เสถียรและชัดเจน',
    family: "'Noto Sans Thai', sans-serif",
    previewText: 'สวัสดี Form Builder - สร้างฟอร์มได้อย่างง่ายดาย'
  },
  {
    id: 'mitr',
    name: 'Mitr',
    thaiName: 'มิตร',
    description: 'อ่านง่าย สไตล์โมเดิร์น',
    family: "'Mitr', 'Noto Sans Thai', sans-serif",
    previewText: 'สวัสดี Form Builder - สร้างฟอร์มได้อย่างง่ายดาย'
  },
  {
    id: 'sarabun',
    name: 'Sarabun',
    thaiName: 'สารบรรณ์',
    description: 'ทันสมัย เหมาะสำหรับงานเอกสาร',
    family: "'Sarabun', 'Noto Sans Thai', sans-serif",
    previewText: 'สวัสดี Form Builder - สร้างฟอร์มได้อย่างง่ายดาย'
  },
  {
    id: 'prompt',
    name: 'Prompt',
    thaiName: 'พร้อมต์',
    description: 'ร่วมสมัย อ่านง่าย เหมาะสำหรับหน้าจอ',
    family: "'Prompt', 'Noto Sans Thai', sans-serif",
    previewText: 'สวัสดี Form Builder - สร้างฟอร์มได้อย่างง่ายดาย'
  }
];

// Fixed font size - medium scale only
const DEFAULT_FONT_SCALE = 1.0;

const FontContext = createContext();

export function FontProvider({ children }) {
  const [selectedFont, setSelectedFont] = useState(FONT_OPTIONS[0]);
  const [isLoading, setIsLoading] = useState(true);

  // Apply font to document root with fixed medium scale
  const applyFontToDocument = React.useCallback((font) => {
    console.log('Applying font settings:', { fontFamily: font.family, scale: DEFAULT_FONT_SCALE });

    // Apply font family
    document.documentElement.style.setProperty('--font-family', font.family);

    // Apply fixed medium font scale
    document.documentElement.style.setProperty('--font-scale', DEFAULT_FONT_SCALE.toString());

    console.log('Font scale applied:', DEFAULT_FONT_SCALE);
  }, []);

  // Load font preferences from localStorage on mount
  useEffect(() => {
    const initializeSettings = () => {
      try {
        const savedFontId = localStorage.getItem('preferred-font');

        // Clean up old font size preference
        localStorage.removeItem('preferred-font-size');

        const targetFont = savedFontId
          ? FONT_OPTIONS.find(f => f.id === savedFontId) || FONT_OPTIONS[0]
          : FONT_OPTIONS[0];

        if (savedFontId) {
          setSelectedFont(targetFont);
        }

        // Apply settings to document with fixed scale
        applyFontToDocument(targetFont);
      } catch (error) {
        console.error('Error loading font preferences:', error);
        // Apply defaults on error
        applyFontToDocument(FONT_OPTIONS[0]);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSettings();
  }, [applyFontToDocument]);

  // Change font preference
  const changeFont = (fontId) => {
    const newFont = FONT_OPTIONS.find(font => font.id === fontId);
    if (!newFont) return;

    try {
      setSelectedFont(newFont);
      applyFontToDocument(newFont);
      localStorage.setItem('preferred-font', fontId);
    } catch (error) {
      console.error('Error saving font preference:', error);
    }
  };

  // Reset to default font
  const resetFont = () => {
    const defaultFont = FONT_OPTIONS[0];
    setSelectedFont(defaultFont);
    applyFontToDocument(defaultFont);
    try {
      localStorage.removeItem('preferred-font');
    } catch (error) {
      console.error('Error removing font preference:', error);
    }
  };

  const value = {
    fonts: FONT_OPTIONS,
    selectedFont,
    changeFont,
    resetFont,
    isLoading
  };

  return (
    <FontContext.Provider value={value}>
      {children}
    </FontContext.Provider>
  );
}

export function useFont() {
  const context = useContext(FontContext);
  if (!context) {
    throw new Error('useFont must be used within a FontProvider');
  }
  return context;
}

export { FONT_OPTIONS };