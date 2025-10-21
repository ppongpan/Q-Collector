/**
 * SheetPreview Component v0.8.0-revised
 * Step 2: Column Selection + Field Type Mapping
 * - Select which columns to import
 * - Map each column to field type (17 types)
 * - Auto-detection with confidence indicators
 * - Sample data preview
 */

import React, { useState, useEffect } from 'react';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent, GlassCardFooter } from '../ui/glass-card';
import { GlassButton } from '../ui/glass-button';
import apiClient from '../../services/ApiClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTimes, faRobot, faCheckCircle, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

// All 17 field types from EnhancedFormBuilder
const FIELD_TYPES = [
  { value: "short_answer", label: "ข้อความสั้น", color: "blue" },
  { value: "paragraph", label: "ข้อความยาว", color: "indigo" },
  { value: "email", label: "อีเมล", color: "green" },
  { value: "phone", label: "เบอร์โทร", color: "emerald" },
  { value: "number", label: "ตัวเลข", color: "purple" },
  { value: "url", label: "ลิงก์", color: "cyan" },
  { value: "file_upload", label: "แนบไฟล์", color: "orange" },
  { value: "image_upload", label: "แนบรูป", color: "pink" },
  { value: "date", label: "วันที่", color: "red" },
  { value: "time", label: "เวลา", color: "amber" },
  { value: "datetime", label: "วันที่และเวลา", color: "rose" },
  { value: "multiple_choice", label: "ตัวเลือกหลายแบบ", color: "teal" },
  { value: "rating", label: "คะแนนดาว", color: "yellow" },
  { value: "slider", label: "แถบเลื่อน", color: "violet" },
  { value: "lat_long", label: "พิกัด GPS", color: "lime" },
  { value: "province", label: "จังหวัด", color: "sky" },
  { value: "factory", label: "โรงงาน", color: "stone" }
];

const SheetPreview = ({ data, onNext, onBack }) => {
  const { headers = [], rows = [], metadata = {} } = data || {};

  // Column configurations: { selected, fieldType, placeholder, required, order }
  const [columnConfigs, setColumnConfigs] = useState([]);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState('');

  // Initialize column configs when data changes
  useEffect(() => {
    if (headers.length > 0) {
      initializeColumnConfigs();
    }
  }, [headers]);

  const initializeColumnConfigs = async () => {
    setDetecting(true);
    setError('');

    try {
      // Call auto-detection API
      const sampleRows = rows.slice(0, 50); // Send first 50 rows for detection
      const response = await apiClient.post('/sheets/detect-field-types', {
        headers,
        sampleRows
      });

      const detectedTypes = response.data?.detectedTypes || [];

      // Initialize configs with auto-detected types
      const configs = headers.map((header, index) => {
        const detection = detectedTypes[index] || {};
        const detectedType = detection.detectedType || {};

        return {
          columnName: header,
          selected: true, // All selected by default
          fieldType: detectedType.type || 'short_answer',
          confidence: detectedType.confidence || 0,
          sampleValues: detection.sampleValues || [],
          placeholder: `กรอก${header}`,
          required: false,
          order: index,
          columnIndex: index // ✅ FIX: Store original sheet column index
        };
      });

      setColumnConfigs(configs);
    } catch (err) {
      console.error('Auto-detection error:', err);
      // Fallback: Initialize without detection
      const configs = headers.map((header, index) => ({
        columnName: header,
        selected: true,
        fieldType: 'short_answer',
        confidence: 0,
        sampleValues: [],
        placeholder: `กรอก${header}`,
        required: false,
        order: index,
        columnIndex: index // ✅ FIX: Store original sheet column index
      }));
      setColumnConfigs(configs);
      setError('ไม่สามารถตรวจจับประเภทข้อมูลอัตโนมัติได้ กรุณาเลือกประเภทข้อมูลด้วยตัวเอง');
    } finally {
      setDetecting(false);
    }
  };

  const updateColumnConfig = (index, updates) => {
    setColumnConfigs(prev => {
      const newConfigs = [...prev];
      newConfigs[index] = { ...newConfigs[index], ...updates };
      return newConfigs;
    });
  };

  const toggleSelection = (index) => {
    updateColumnConfig(index, { selected: !columnConfigs[index]?.selected });
  };

  const handleFieldTypeChange = (index, fieldType) => {
    updateColumnConfig(index, { fieldType });
  };

  const handleNext = () => {
    const selectedConfigs = columnConfigs.filter(c => c.selected);

    if (selectedConfigs.length === 0) {
      setError('กรุณาเลือกอย่างน้อย 1 คอลัมน์สำหรับนำเข้า');
      return;
    }

    // Pass selected columns configuration to next step
    onNext(selectedConfigs);
  };

  // Get confidence badge color
  const getConfidenceBadge = (confidence) => {
    if (confidence >= 0.8) {
      return { color: 'text-green-600 dark:text-green-400', icon: faCheckCircle, text: 'มั่นใจสูง' };
    } else if (confidence >= 0.5) {
      return { color: 'text-yellow-600 dark:text-yellow-400', icon: faExclamationTriangle, text: 'ปานกลาง' };
    } else {
      return { color: 'text-gray-500 dark:text-gray-400', icon: faRobot, text: 'คาดเดา' };
    }
  };

  const selectedCount = columnConfigs.filter(c => c.selected).length;
  const totalCount = columnConfigs.length;

  return (
    <GlassCard className="max-w-7xl">
      <GlassCardHeader>
        <GlassCardTitle className="text-2xl">
          ขั้นตอนที่ 2: เลือกคอลัมน์และกำหนดประเภทข้อมูล
        </GlassCardTitle>
        <p className="text-muted-foreground mt-2">
          พบทั้งหมด <span className="font-semibold text-primary">{metadata.rowCount || rows.length}</span> แถว
          และ <span className="font-semibold text-primary">{totalCount}</span> คอลัมน์
          {' • '}
          เลือกแล้ว <span className="font-semibold text-green-600">{selectedCount}</span> คอลัมน์
        </p>
      </GlassCardHeader>

      <GlassCardContent>
        {detecting ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">
                <FontAwesomeIcon icon={faRobot} className="mr-2" />
                กำลังตรวจจับประเภทข้อมูลอัตโนมัติ...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Column Configuration Table */}
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-center font-semibold border-b border-border w-16">
                      <input
                        type="checkbox"
                        checked={selectedCount === totalCount && totalCount > 0}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setColumnConfigs(prev =>
                            prev.map(c => ({ ...c, selected: checked }))
                          );
                        }}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-semibold border-b border-border w-48">
                      ชื่อคอลัมน์
                    </th>
                    <th className="px-4 py-3 text-left font-semibold border-b border-border w-56">
                      ประเภทข้อมูล
                    </th>
                    <th className="px-4 py-3 text-center font-semibold border-b border-border w-32">
                      ความมั่นใจ
                    </th>
                    <th className="px-4 py-3 text-left font-semibold border-b border-border">
                      ตัวอย่างข้อมูล (3 แถวแรก)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {columnConfigs.map((config, index) => {
                    const badge = getConfidenceBadge(config.confidence);
                    const sampleData = rows.slice(0, 3).map(row => row[index]);

                    return (
                      <tr
                        key={index}
                        className={`border-b border-border transition-colors ${
                          config.selected
                            ? 'hover:bg-primary/5'
                            : 'opacity-50 bg-muted/20 hover:bg-muted/30'
                        }`}
                      >
                        {/* Selection Checkbox */}
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={config.selected || false}
                            onChange={() => toggleSelection(index)}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                          />
                        </td>

                        {/* Column Name */}
                        <td className="px-4 py-3 font-medium text-foreground">
                          {config.columnName}
                        </td>

                        {/* Field Type Dropdown */}
                        <td className="px-4 py-3">
                          <select
                            value={config.fieldType || 'short_answer'}
                            onChange={(e) => handleFieldTypeChange(index, e.target.value)}
                            disabled={!config.selected}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                            {FIELD_TYPES.map(type => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Confidence Badge */}
                        <td className="px-4 py-3 text-center">
                          {config.confidence > 0 ? (
                            <div className="flex items-center justify-center gap-1">
                              <FontAwesomeIcon
                                icon={badge.icon}
                                className={`text-xs ${badge.color}`}
                              />
                              <span className={`text-xs font-medium ${badge.color}`}>
                                {Math.round(config.confidence * 100)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">-</span>
                          )}
                        </td>

                        {/* Sample Data */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            {sampleData.map((value, i) => (
                              <div
                                key={i}
                                className="text-xs text-muted-foreground truncate max-w-xs"
                                title={value}
                              >
                                {i + 1}. {value || <span className="italic text-muted-foreground/50">ว่าง</span>}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Info messages */}
            <div className="mt-4 space-y-3">
              {/* Auto-detection info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <FontAwesomeIcon icon={faRobot} className="mr-2" />
                  <span className="font-semibold">ตรวจจับอัตโนมัติ:</span> ระบบได้วิเคราะห์ข้อมูลและคาดเดาประเภทฟิลด์แล้ว
                  คุณสามารถเปลี่ยนแปลงได้ตามต้องการ
                </p>
              </div>

              {/* Selection guide */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
                  <span className="font-semibold">คำแนะนำ:</span> เลือกเฉพาะคอลัมน์ที่ต้องการนำเข้า
                  ถ้าไม่ต้องการคอลัมน์ใด ให้ยกเลิกการเลือก
                </p>
              </div>

              {/* Error message */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    <FontAwesomeIcon icon={faTimes} className="mr-2" />
                    {error}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </GlassCardContent>

      <GlassCardFooter className="justify-between">
        <GlassButton
          variant="ghost"
          onClick={onBack}
          disabled={detecting}
        >
          ย้อนกลับ
        </GlassButton>

        <GlassButton
          variant="primary"
          onClick={handleNext}
          disabled={detecting || selectedCount === 0}
        >
          ถัดไป ({selectedCount} คอลัมน์)
        </GlassButton>
      </GlassCardFooter>
    </GlassCard>
  );
};

export default SheetPreview;
