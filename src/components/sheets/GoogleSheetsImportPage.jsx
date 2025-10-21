/**
 * GoogleSheetsImportPage Component v0.8.0-revised
 * Main wizard page for Google Sheets import feature
 * Super Admin + Desktop ONLY
 *
 * NEW WORKFLOW:
 * Step 1: URL Input (ใส่ URL)
 * Step 2: Column Selection + Field Type Mapping (เลือกคอลัมน์)
 * Step 3: Form Type Selection (กำหนดประเภท)
 * Step 4: Form Creation + Data Import (สร้างฟอร์ม)
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { GlassCard } from '../ui/glass-card';
import SheetUrlInput from './SheetUrlInput';
import SheetPreview from './SheetPreview';
import FormTypeSelection from './FormTypeSelection';
import ImportProgress from './ImportProgress';

const GoogleSheetsImportPage = ({ onNavigate }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [sheetData, setSheetData] = useState(null);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [formConfig, setFormConfig] = useState(null);

  // Mobile detection with resize listener
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Access control - Super Admin ONLY
  if (!user || user.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
        <GlassCard className="p-8 max-w-md text-center">
          <div className="mb-4">
            <svg className="h-16 w-16 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            ไม่มีสิทธิ์เข้าถึง
          </h2>
          <p className="text-muted-foreground">
            ฟีเจอร์นี้สำหรับ Super Admin เท่านั้น
          </p>
          <p className="text-sm text-muted-foreground/70 mt-2">
            บทบาทของคุณ: <span className="font-semibold">{user?.role || 'ไม่ทราบ'}</span>
          </p>
        </GlassCard>
      </div>
    );
  }

  // Mobile restriction
  if (isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
        <GlassCard className="p-8 max-w-md text-center">
          <div className="mb-4">
            <svg className="h-16 w-16 mx-auto text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-orange-600 mb-4">
            ใช้งานได้บน PC เท่านั้น
          </h2>
          <p className="text-muted-foreground">
            กรุณาเปิดใช้งานบนคอมพิวเตอร์หรือแท็บเล็ต
          </p>
          <p className="text-sm text-muted-foreground/70 mt-2">
            ขนาดหน้าจอขั้นต่ำ: 768px
          </p>
        </GlassCard>
      </div>
    );
  }

  // Reset wizard to step 1
  const resetWizard = () => {
    setStep(1);
    setSheetData(null);
    setSelectedColumns([]);
    setFormConfig(null);
  };

  // Navigate to form builder or form list
  const handleNavigateToForm = (formId) => {
    if (onNavigate) {
      onNavigate('form-builder', { formId });
    }
  };

  const handleNavigateToFormList = () => {
    if (onNavigate) {
      onNavigate('form-list');
    } else {
      resetWizard();
    }
  };

  // Main wizard content
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">
            สร้างฟอร์มจาก Google Sheets
          </h1>
          <p className="text-muted-foreground text-lg">
            สร้างฟอร์มใหม่พร้อมนำเข้าข้อมูลจาก Google Sheets อย่างง่ายดาย
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center space-x-4 py-4">
          {[1, 2, 3, 4].map((stepNumber) => (
            <React.Fragment key={stepNumber}>
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${
                  step === stepNumber
                    ? 'bg-primary text-white scale-110'
                    : step > stepNumber
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step > stepNumber ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  stepNumber
                )}
              </div>
              {stepNumber < 4 && (
                <div
                  className={`w-16 h-1 rounded-full transition-all ${
                    step > stepNumber ? 'bg-green-500' : 'bg-muted'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Labels */}
        <div className="flex items-center justify-center space-x-4 pb-8">
          {['ใส่ URL', 'เลือกคอลัมน์', 'กำหนดประเภท', 'สร้างฟอร์ม'].map((label, index) => (
            <React.Fragment key={index}>
              <div
                className={`text-sm font-medium transition-all ${
                  step === index + 1
                    ? 'text-primary'
                    : step > index + 1
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-muted-foreground'
                }`}
              >
                {label}
              </div>
              {index < 3 && <div className="w-16" />}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <div className="flex justify-center">
          {/* Step 1: URL Input */}
          {step === 1 && (
            <SheetUrlInput
              onSuccess={(data) => {
                setSheetData(data);
                setStep(2);
              }}
            />
          )}

          {/* Step 2: Column Selection + Field Type Mapping */}
          {step === 2 && sheetData && (
            <SheetPreview
              data={sheetData}
              onNext={(columns) => {
                setSelectedColumns(columns);
                setStep(3);
              }}
              onBack={() => setStep(1)}
            />
          )}

          {/* Step 3: Form Type Selection (Main/Sub-form) */}
          {step === 3 && sheetData && selectedColumns.length > 0 && (
            <FormTypeSelection
              sheetData={sheetData}
              selectedColumns={selectedColumns}
              onNext={(config) => {
                setFormConfig(config);
                setStep(4);
              }}
              onBack={() => setStep(2)}
            />
          )}

          {/* Step 4: Form Creation + Data Import */}
          {step === 4 && sheetData && selectedColumns.length > 0 && formConfig && (
            <ImportProgress
              sheetData={sheetData}
              selectedColumns={selectedColumns}
              formConfig={formConfig}
              onComplete={handleNavigateToFormList}
              onNavigateToForm={handleNavigateToForm}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleSheetsImportPage;
