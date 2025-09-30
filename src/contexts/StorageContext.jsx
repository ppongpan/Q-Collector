import React, { createContext, useContext, useState, useEffect } from 'react';

const StorageContext = createContext();

const STORAGE_CONFIG_KEY = 'q_collector_storage_config';

// ค่าเริ่มต้นที่แนะนำ
const DEFAULT_CONFIG = {
  maxStorageSize: 8, // MB - ขีดจำกัด localStorage (แนะนำ 5-10MB)
  warningThreshold: 6, // MB - เตือนเมื่อใช้งานเกิน (แนะนำ 75% ของ maxStorageSize)
  maxFileSize: 10, // MB - ขนาดไฟล์สูงสุดต่อไฟล์
  imageCompression: true, // บีบอัดรูปภาพอัตโนมัติ
  imageQuality: 0.8, // คุณภาพรูปภาพหลังบีบอัด (0-1)
  imageMaxWidth: 1920, // ความกว้างสูงสุดของรูปภาพ (px)
  imageMaxHeight: 1080, // ความสูงสูงสุดของรูปภาพ (px)
  autoCleanupDays: 30, // ทำความสะอาดไฟล์อัตโนมัติหลังกี่วัน
};

// ค่าที่แนะนำตามขนาดพื้นที่
export const RECOMMENDED_CONFIGS = {
  small: {
    label: 'เล็ก (5MB)',
    maxStorageSize: 5,
    warningThreshold: 4,
    maxFileSize: 5,
    description: 'เหมาะสำหรับเก็บเฉพาะข้อความและไฟล์เล็ก'
  },
  medium: {
    label: 'ปานกลาง (8MB) - แนะนำ',
    maxStorageSize: 8,
    warningThreshold: 6,
    maxFileSize: 10,
    description: 'สมดุลระหว่างพื้นที่และประสิทธิภาพ'
  },
  large: {
    label: 'ใหญ่ (10MB)',
    maxStorageSize: 10,
    warningThreshold: 8,
    maxFileSize: 15,
    description: 'รองรับไฟล์จำนวนมาก อาจมีปัญหาบางเบราว์เซอร์'
  }
};

export function StorageProvider({ children }) {
  const [config, setConfig] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_CONFIG_KEY);
      return stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored) } : DEFAULT_CONFIG;
    } catch (error) {
      console.error('Error loading storage config:', error);
      return DEFAULT_CONFIG;
    }
  });

  // บันทึกการตั้งค่าลง localStorage เมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
      console.log('Storage config saved:', config);
    } catch (error) {
      console.error('Error saving storage config:', error);
    }
  }, [config]);

  const updateConfig = (updates) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const resetConfig = () => {
    setConfig(DEFAULT_CONFIG);
  };

  const applyPreset = (presetName) => {
    const preset = RECOMMENDED_CONFIGS[presetName];
    if (preset) {
      updateConfig({
        maxStorageSize: preset.maxStorageSize,
        warningThreshold: preset.warningThreshold,
        maxFileSize: preset.maxFileSize
      });
    }
  };

  const value = {
    config,
    updateConfig,
    resetConfig,
    applyPreset,
    DEFAULT_CONFIG,
    RECOMMENDED_CONFIGS
  };

  return (
    <StorageContext.Provider value={value}>
      {children}
    </StorageContext.Provider>
  );
}

export function useStorage() {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
}

export default StorageContext;