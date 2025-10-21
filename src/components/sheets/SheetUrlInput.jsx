/**
 * SheetUrlInput Component
 * Step 1: Input Google Sheet URL and sheet name
 * @version 0.8.0
 */

import React, { useState } from 'react';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent, GlassCardFooter } from '../ui/glass-card';
import { GlassInput } from '../ui/glass-input';
import { GlassButton } from '../ui/glass-button';
import SheetsImportService from '../../services/SheetsImportService';

const SheetUrlInput = ({ onSuccess }) => {
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetName, setSheetName] = useState('Sheet1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFetchPreview = async () => {
    // Validate URL
    if (!sheetUrl.trim()) {
      setError('กรุณากรอก URL ของ Google Sheet');
      return;
    }

    if (!SheetsImportService.isValidSheetUrl(sheetUrl)) {
      setError('URL ไม่ถูกต้อง กรุณาใช้ URL จาก Google Sheets เท่านั้น');
      return;
    }

    // Validate sheet name
    if (!sheetName.trim()) {
      setError('กรุณากรอกชื่อแผ่นงาน (Sheet Name)');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const previewData = await SheetsImportService.fetchSheetPreview(sheetUrl, sheetName);

      // Check if we got valid data
      if (!previewData.headers || previewData.headers.length === 0) {
        throw new Error('ไม่พบข้อมูลในแผ่นงาน กรุณาตรวจสอบชื่อแผ่นงาน');
      }

      // Success - pass data to parent
      onSuccess(previewData);
    } catch (err) {
      console.error('Error fetching sheet preview:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleFetchPreview();
    }
  };

  return (
    <GlassCard className="max-w-3xl">
      <GlassCardHeader>
        <GlassCardTitle className="text-2xl">
          ขั้นตอนที่ 1: ใส่ URL ของ Google Sheet
        </GlassCardTitle>
      </GlassCardHeader>

      <GlassCardContent className="space-y-4">
        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            วิธีการใช้งาน:
          </h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
            <li>เปิด Google Sheet ของคุณ</li>
            <li>คลิก "แชร์" (Share) และตั้งค่าเป็น "ทุกคนที่มีลิงก์สามารถดูได้"</li>
            <li>คัดลอก URL จากแถบที่อยู่</li>
            <li>วาง URL ลงในช่องด้านล่าง</li>
          </ol>
        </div>

        {/* Sheet URL Input */}
        <GlassInput
          label="URL ของ Google Sheet"
          placeholder="https://docs.google.com/spreadsheets/d/..."
          value={sheetUrl}
          onChange={(e) => {
            setSheetUrl(e.target.value);
            setError(''); // Clear error on input
          }}
          onKeyPress={handleKeyPress}
          required
          error={error && error.includes('URL') ? error : ''}
          disabled={loading}
        />

        {/* Sheet Name Input */}
        <GlassInput
          label="ชื่อแผ่นงาน (Sheet Name)"
          placeholder="Sheet1"
          value={sheetName}
          onChange={(e) => {
            setSheetName(e.target.value);
            setError(''); // Clear error on input
          }}
          onKeyPress={handleKeyPress}
          required
          error={error && error.includes('แผ่นงาน') ? error : ''}
          disabled={loading}
          tooltip="ชื่อของแท็บในไฟล์ Google Sheets (ค่าเริ่มต้นคือ Sheet1)"
        />

        {/* General Error Display */}
        {error && !error.includes('URL') && !error.includes('แผ่นงาน') && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <p className="text-red-800 dark:text-red-200 text-sm">
              {error}
            </p>
          </div>
        )}
      </GlassCardContent>

      <GlassCardFooter>
        <GlassButton
          variant="primary"
          onClick={handleFetchPreview}
          disabled={loading || !sheetUrl.trim() || !sheetName.trim()}
          className="w-full sm:w-auto"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              กำลังดึงข้อมูล...
            </>
          ) : (
            'ดึงข้อมูล'
          )}
        </GlassButton>
      </GlassCardFooter>
    </GlassCard>
  );
};

export default SheetUrlInput;
