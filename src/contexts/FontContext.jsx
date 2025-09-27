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

// Font size options with Thai labels and scale values
const FONT_SIZE_OPTIONS = [
  {
    id: 'extra-small',
    thaiName: 'เล็กมาก',
    description: 'ขนาดเล็กมาก',
    scale: 0.7,
    previewText: 'ข้อความขนาดเล็กมาก'
  },
  {
    id: 'small',
    thaiName: 'เล็ก',
    description: 'ขนาดเล็ก',
    scale: 0.8,
    previewText: 'ข้อความขนาดเล็ก'
  },
  {
    id: 'medium',
    thaiName: 'กลาง',
    description: 'ขนาดปกติ',
    scale: 1.0,
    previewText: 'ข้อความขนาดกลาง'
  },
  {
    id: 'large',
    thaiName: 'ใหญ่',
    description: 'ขนาดใหญ่',
    scale: 1.1,  // ลดจาก 1.2 เป็น 1.1 เพื่อไม่ให้ใหญ่เกินไป
    previewText: 'ข้อความขนาดใหญ่'
  }
];

const FontContext = createContext();

export function FontProvider({ children }) {
  const [selectedFont, setSelectedFont] = useState(FONT_OPTIONS[0]);
  const [selectedFontSize, setSelectedFontSize] = useState(FONT_SIZE_OPTIONS[1]); // Default to 'medium'
  const [isLoading, setIsLoading] = useState(true);

  // Apply font and font size to document root
  const applyFontToDocument = React.useCallback((font, fontSize = FONT_SIZE_OPTIONS[1]) => {
    console.log('Applying font settings:', { fontFamily: font.family, fontSize: fontSize.thaiName, scale: fontSize.scale });

    // Apply font family
    document.documentElement.style.setProperty('--font-family', font.family);

    // Apply font scale with proper bounds to prevent infinite growth/shrink
    const normalizedScale = Math.min(Math.max(fontSize.scale, 0.65), 1.15); // Updated bounds: 0.65-1.15 to support extra-small
    document.documentElement.style.setProperty('--font-scale', normalizedScale.toString());

    console.log('Font scale applied:', normalizedScale);
  }, []);

  // Load font and font size preferences from localStorage on mount
  useEffect(() => {
    const initializeSettings = () => {
      try {
        const savedFontId = localStorage.getItem('preferred-font');
        const savedFontSizeId = localStorage.getItem('preferred-font-size');

        const targetFont = savedFontId
          ? FONT_OPTIONS.find(f => f.id === savedFontId) || FONT_OPTIONS[0]
          : FONT_OPTIONS[0];

        const targetFontSize = savedFontSizeId
          ? FONT_SIZE_OPTIONS.find(s => s.id === savedFontSizeId) || FONT_SIZE_OPTIONS[1]
          : FONT_SIZE_OPTIONS[1];

        if (savedFontId) {
          setSelectedFont(targetFont);
        }

        if (savedFontSizeId) {
          setSelectedFontSize(targetFontSize);
        }

        // Apply settings to document
        applyFontToDocument(targetFont, targetFontSize);
      } catch (error) {
        console.error('Error loading font preferences:', error);
        // Apply defaults on error
        applyFontToDocument(FONT_OPTIONS[0], FONT_SIZE_OPTIONS[1]);
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
      applyFontToDocument(newFont, selectedFontSize);
      localStorage.setItem('preferred-font', fontId);
    } catch (error) {
      console.error('Error saving font preference:', error);
    }
  };

  // Change font size preference
  const changeFontSize = (fontSizeId) => {
    const newFontSize = FONT_SIZE_OPTIONS.find(size => size.id === fontSizeId);
    if (!newFontSize) return;

    try {
      setSelectedFontSize(newFontSize);
      applyFontToDocument(selectedFont, newFontSize);
      localStorage.setItem('preferred-font-size', fontSizeId);
    } catch (error) {
      console.error('Error saving font size preference:', error);
    }
  };

  // Reset to default font
  const resetFont = () => {
    const defaultFont = FONT_OPTIONS[0];
    setSelectedFont(defaultFont);
    applyFontToDocument(defaultFont, selectedFontSize);
    try {
      localStorage.removeItem('preferred-font');
    } catch (error) {
      console.error('Error removing font preference:', error);
    }
  };

  // Reset to default font size
  const resetFontSize = () => {
    const defaultFontSize = FONT_SIZE_OPTIONS[1]; // Medium
    setSelectedFontSize(defaultFontSize);
    applyFontToDocument(selectedFont, defaultFontSize);
    try {
      localStorage.removeItem('preferred-font-size');
    } catch (error) {
      console.error('Error removing font size preference:', error);
    }
  };

  // Reset both font and font size
  const resetAll = () => {
    const defaultFont = FONT_OPTIONS[0];
    const defaultFontSize = FONT_SIZE_OPTIONS[1];
    setSelectedFont(defaultFont);
    setSelectedFontSize(defaultFontSize);
    applyFontToDocument(defaultFont, defaultFontSize);
    try {
      localStorage.removeItem('preferred-font');
      localStorage.removeItem('preferred-font-size');
    } catch (error) {
      console.error('Error removing font preferences:', error);
    }
  };

  const value = {
    fonts: FONT_OPTIONS,
    fontSizes: FONT_SIZE_OPTIONS,
    selectedFont,
    selectedFontSize,
    changeFont,
    changeFontSize,
    resetFont,
    resetFontSize,
    resetAll,
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

export { FONT_OPTIONS, FONT_SIZE_OPTIONS };