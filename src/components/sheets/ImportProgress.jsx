/**
 * ImportProgress Component v0.8.0-revised
 * Step 4: Form Creation + Data Import Progress
 * - Creates new form + dynamic table
 * - Imports sheet data as Submission records
 * - 5-step progress indicator
 * - Success summary with navigation options
 */

import React, { useState, useEffect, useRef } from 'react';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent, GlassCardFooter } from '../ui/glass-card';
import { GlassButton } from '../ui/glass-button';
import apiClient from '../../services/ApiClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck, faTimes, faSpinner, faDatabase, faFileAlt,
  faUpload, faCheckCircle, faList, faEdit
} from '@fortawesome/free-solid-svg-icons';

const STEPS = [
  { id: 1, label: 'สร้างฟอร์ม', icon: faFileAlt },
  { id: 2, label: 'สร้างตาราง', icon: faDatabase },
  { id: 3, label: 'นำเข้าข้อมูล', icon: faUpload },
  { id: 4, label: 'ตรวจสอบ', icon: faCheckCircle },
  { id: 5, label: 'เสร็จสมบูรณ์', icon: faCheck }
];

const ImportProgress = ({ sheetData, selectedColumns, formConfig, onComplete, onNavigateToForm }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState('creating'); // creating, completed, error
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // ✅ FIX: Use useRef to prevent duplicate API calls in React StrictMode
  const hasExecuted = useRef(false);
  const isExecuting = useRef(false);

  useEffect(() => {
    // ✅ CRITICAL FIX: Prevent duplicate execution even in React StrictMode
    // Check both hasExecuted (already ran) AND isExecuting (currently running)
    if (!hasExecuted.current && !isExecuting.current) {
      hasExecuted.current = true;
      isExecuting.current = true;
      executeFormCreation();
    }
  }, []);

  const executeFormCreation = async () => {
    try {
      setStatus('creating');
      setCurrentStep(1);
      setProgress(10);

      // STEP 1: Create form from sheet
      // ✅ DEBUG: Log formConfig being sent
      console.log('🔗 [ImportProgress] Sending formConfig to backend:', formConfig);
      console.log('🔗 [ImportProgress] FK Mappings:', formConfig.foreignKeyMappings);

      const response = await apiClient.post('/sheets/create-form-from-sheet', {
        sheetData: {
          headers: sheetData.headers,
          rows: sheetData.rows,
          metadata: sheetData.metadata
        },
        formConfig
      });

      const creationResult = response.data;

      setProgress(25);
      setCurrentStep(2);

      // Simulate table creation progress
      await new Promise(resolve => setTimeout(resolve, 800));
      setProgress(50);
      setCurrentStep(3);

      // Simulate data import progress
      await new Promise(resolve => setTimeout(resolve, 800));
      setProgress(75);
      setCurrentStep(4);

      // Simulate verification progress
      await new Promise(resolve => setTimeout(resolve, 500));
      setProgress(90);
      setCurrentStep(5);

      // Complete
      setProgress(100);
      setStatus('completed');
      setResult(creationResult);

    } catch (err) {
      console.error('Form creation error:', err);
      setStatus('error');
      setError(err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการสร้างฟอร์ม');
    }
  };

  const handleViewForm = () => {
    if (result?.formId) {
      // Use navigation callback instead of window.location
      if (onNavigateToForm) {
        onNavigateToForm(result.formId);
      }
    }
  };

  const handleViewFormList = () => {
    // Navigate back to form list
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <GlassCard className="max-w-5xl">
      <GlassCardHeader>
        <GlassCardTitle className="text-2xl">
          ขั้นตอนที่ 4: กำลังสร้างฟอร์มและนำเข้าข้อมูล
        </GlassCardTitle>
        <p className="text-muted-foreground mt-2">
          {status === 'creating' && 'กรุณารอสักครู่...'}
          {status === 'completed' && 'สร้างฟอร์มและนำเข้าข้อมูลเรียบร้อยแล้ว!'}
          {status === 'error' && 'เกิดข้อผิดพลาด'}
        </p>
      </GlassCardHeader>

      <GlassCardContent className="space-y-6">
        {/* 5-Step Progress Indicator */}
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center space-y-2">
                {/* Step Circle */}
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-full font-semibold transition-all ${
                    currentStep > step.id
                      ? 'bg-green-500 text-white scale-105'
                      : currentStep === step.id
                      ? 'bg-primary text-white scale-110 animate-pulse'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {currentStep > step.id ? (
                    <FontAwesomeIcon icon={faCheck} className="text-lg" />
                  ) : currentStep === step.id ? (
                    <FontAwesomeIcon icon={faSpinner} className="text-lg animate-spin" />
                  ) : (
                    <FontAwesomeIcon icon={step.icon} className="text-lg" />
                  )}
                </div>

                {/* Step Label */}
                <div
                  className={`text-xs font-medium text-center transition-colors ${
                    currentStep >= step.id
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </div>
              </div>

              {/* Connector Line */}
              {index < STEPS.length - 1 && (
                <div className="flex-1 mx-2">
                  <div
                    className={`h-1 rounded-full transition-all duration-500 ${
                      currentStep > step.id ? 'bg-green-500' : 'bg-muted'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              status === 'completed' ? 'bg-green-500' : 'bg-primary'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Progress Percentage */}
        <div className="text-center text-sm font-medium text-muted-foreground">
          {progress}%
        </div>

        {/* Success Result */}
        {status === 'completed' && result && (
          <div className="space-y-4">
            {/* Success Icon */}
            <div className="flex justify-center">
              <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 border-4 border-green-500">
                <FontAwesomeIcon icon={faCheckCircle} className="text-4xl text-green-500" />
              </div>
            </div>

            {/* ✅ NEW: Import Errors Warning (if any failures occurred) */}
            {result.failedCount > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2 flex items-center gap-2">
                  <FontAwesomeIcon icon={faTimes} />
                  คำเตือน: พบข้อผิดพลาดบางรายการ
                </h4>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                  {result.failedCount} แถว ไม่สามารถนำเข้าได้เนื่องจากข้อผิดพลาด (เช่น ข้อมูลเกินขนาดที่กำหนด)
                </p>

                {/* Error Details Table */}
                {result.importErrors && result.importErrors.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border border-yellow-200 dark:border-yellow-800 rounded">
                      <thead className="bg-yellow-100 dark:bg-yellow-900/30">
                        <tr>
                          <th className="px-2 py-1 text-left">แถว</th>
                          <th className="px-2 py-1 text-left">ฟิลด์</th>
                          <th className="px-2 py-1 text-left">ข้อผิดพลาด</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.importErrors.map((err, idx) => (
                          <tr key={idx} className="border-t border-yellow-200 dark:border-yellow-800">
                            <td className="px-2 py-1 font-mono">{err.rowNumber}</td>
                            <td className="px-2 py-1">{err.fieldName}</td>
                            <td className="px-2 py-1 text-yellow-700 dark:text-yellow-300">
                              {err.error}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Help Text */}
                <div className="mt-3 text-xs text-yellow-700 dark:text-yellow-300">
                  <p className="font-semibold mb-1">วิธีแก้ไข:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>ตรวจสอบว่าข้อมูลในแถวที่มีปัญหามีความยาวไม่เกินที่กำหนด</li>
                    <li>สำหรับฟิลด์ phone ควรมีความยาวไม่เกิน 50 ตัวอักษร</li>
                    <li>ลองแก้ไขข้อมูลใน Google Sheets แล้วนำเข้าใหม่อีกครั้ง</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {/* Fields Created */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {result.fieldsCreated || 0}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  ฟิลด์
                </div>
              </div>

              {/* Data Imported */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                  {result.dataImported || 0}
                </div>
                <div className="text-sm text-green-700 dark:text-green-300 mt-1">
                  แถว
                </div>
              </div>

              {/* Form Type */}
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 text-center">
                <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                  {result.isSubForm ? 'ฟอร์มย่อย' : 'ฟอร์มหลัก'}
                </div>
                <div className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                  ประเภท
                </div>
              </div>

              {/* Table Name */}
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 text-center">
                <div className="text-sm font-mono text-orange-900 dark:text-orange-100 truncate">
                  {result.tableName || 'N/A'}
                </div>
                <div className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                  ตาราง
                </div>
              </div>
            </div>

            {/* Success Message */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                <FontAwesomeIcon icon={faCheckCircle} />
                สร้างฟอร์มสำเร็จ!
              </h4>
              <p className="text-sm text-green-800 dark:text-green-200">
                ระบบได้สร้างฟอร์ม <span className="font-semibold">&quot;{formConfig.name}&quot;</span> พร้อมฟิลด์ทั้งหมด {result.fieldsCreated} ฟิลด์
                และนำเข้าข้อมูล {result.dataImported} แถว เรียบร้อยแล้ว
              </p>
              {result.isSubForm && (
                <p className="text-sm text-green-800 dark:text-green-200 mt-2">
                  ฟอร์มย่อยนี้ถูกเชื่อมโยงกับฟอร์มหลักแล้ว
                </p>
              )}
            </div>

            {/* Form Info */}
            <div className="bg-muted/50 rounded-xl p-4">
              <h4 className="font-semibold text-foreground mb-3">รายละเอียดฟอร์มที่สร้าง:</h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">ชื่อฟอร์ม:</dt>
                  <dd className="font-medium">{formConfig.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">ประเภท:</dt>
                  <dd className="font-medium">{result.isSubForm ? 'ฟอร์มย่อย' : 'ฟอร์มหลัก'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">จำนวนฟิลด์:</dt>
                  <dd className="font-medium">{result.fieldsCreated} ฟิลด์</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">ข้อมูลที่นำเข้า:</dt>
                  <dd className="font-medium">{result.dataImported} แถว</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">ตารางฐานข้อมูล:</dt>
                  <dd className="font-mono text-xs">{result.tableName}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {/* Error Message */}
        {status === 'error' && (
          <div className="space-y-4">
            {/* Error Icon */}
            <div className="flex justify-center">
              <div className="flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 border-4 border-red-500">
                <FontAwesomeIcon icon={faTimes} className="text-4xl text-red-500" />
              </div>
            </div>

            {/* Error Details */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2 flex items-center gap-2">
                <FontAwesomeIcon icon={faTimes} />
                เกิดข้อผิดพลาด
              </h4>
              <p className="text-sm text-red-800 dark:text-red-200">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Loading Info */}
        {status === 'creating' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200 text-center">
              <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
              กำลังสร้างฟอร์มและตารางฐานข้อมูล กรุณารอสักครู่...
            </p>
          </div>
        )}
      </GlassCardContent>

      <GlassCardFooter className="justify-end space-x-4">
        {status === 'completed' && (
          <>
            <GlassButton
              variant="ghost"
              onClick={handleViewFormList}
            >
              <FontAwesomeIcon icon={faList} className="mr-2" />
              ดูรายการฟอร์ม
            </GlassButton>

            <GlassButton
              variant="primary"
              onClick={handleViewForm}
            >
              <FontAwesomeIcon icon={faEdit} className="mr-2" />
              แก้ไขฟอร์ม
            </GlassButton>
          </>
        )}

        {status === 'error' && (
          <GlassButton
            variant="primary"
            onClick={onComplete}
          >
            ลองใหม่อีกครั้ง
          </GlassButton>
        )}
      </GlassCardFooter>
    </GlassCard>
  );
};

export default ImportProgress;
