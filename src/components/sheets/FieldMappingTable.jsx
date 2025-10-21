/**
 * FieldMappingTable Component
 * Step 3: Map sheet columns to form fields
 * @version 0.8.0
 */

import React, { useState, useEffect } from 'react';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent, GlassCardFooter } from '../ui/glass-card';
import { GlassButton } from '../ui/glass-button';
import { GlassSelect } from '../ui/glass-input';
import apiClient from '../../services/ApiClient';

const FieldMappingTable = ({ sheetData, selectedForm, onFormSelect, onMappingComplete, onBack }) => {
  const { headers = [], sample_rows = [], field_detections = [] } = sheetData || {};

  const [forms, setForms] = useState([]);
  const [formFields, setFormFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mappings, setMappings] = useState([]);

  // Fetch forms on mount
  useEffect(() => {
    fetchForms();
  }, []);

  // Initialize mappings when form is selected
  useEffect(() => {
    if (selectedForm && formFields.length > 0) {
      initializeMappings();
    }
  }, [selectedForm, formFields]);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const response = await apiClient.listForms();
      const formsList = response.forms || response || [];

      // Filter only active forms
      const activeForms = formsList.filter(f => f.is_active !== false);
      setForms(activeForms);
    } catch (err) {
      console.error('Error fetching forms:', err);
      setError('ไม่สามารถโหลดรายการฟอร์มได้');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = async (e) => {
    const formId = e.target.value;
    if (!formId) {
      onFormSelect(null);
      setFormFields([]);
      setMappings([]);
      return;
    }

    try {
      setLoading(true);
      const form = await apiClient.getForm(formId);
      onFormSelect(form);

      // Extract fields from form structure
      const fields = form.fields || [];
      setFormFields(fields);
    } catch (err) {
      console.error('Error fetching form details:', err);
      setError('ไม่สามารถโหลดรายละเอียดฟอร์มได้');
    } finally {
      setLoading(false);
    }
  };

  const initializeMappings = () => {
    const initialMappings = headers.map((header, index) => {
      const detection = field_detections[index] || {};

      // Try to find matching field by title (case-insensitive)
      const matchingField = formFields.find(field =>
        field.title.toLowerCase() === header.toLowerCase()
      );

      return {
        sheet_column: header,
        column_index: index,
        field_id: matchingField?.id || '',
        field_type: matchingField?.type || detection.detected_type || 'short_answer',
        skip: false
      };
    });

    setMappings(initialMappings);
  };

  const updateMapping = (columnIndex, updates) => {
    setMappings(prev => {
      const newMappings = [...prev];
      newMappings[columnIndex] = {
        ...newMappings[columnIndex],
        ...updates
      };
      return newMappings;
    });
  };

  const handleFieldChange = (columnIndex, fieldId) => {
    const field = formFields.find(f => f.id === fieldId);
    updateMapping(columnIndex, {
      field_id: fieldId,
      field_type: field?.type || 'short_answer',
      skip: !fieldId // Auto-skip if no field selected
    });
  };

  const handleTypeChange = (columnIndex, type) => {
    updateMapping(columnIndex, { field_type: type });
  };

  const handleSkipChange = (columnIndex, skip) => {
    updateMapping(columnIndex, { skip });
  };

  const handleStartImport = () => {
    // Filter out skipped columns
    const activeMappings = mappings.filter(m => !m.skip && m.field_id);

    if (activeMappings.length === 0) {
      setError('กรุณาเลือกอย่างน้อย 1 ฟิลด์สำหรับนำเข้า');
      return;
    }

    onMappingComplete(mappings);
  };

  // Get Thai field type name
  const getThaiType = (type) => {
    const types = {
      short_answer: 'ข้อความสั้น',
      paragraph: 'ข้อความยาว',
      number: 'ตัวเลข',
      email: 'อีเมล',
      phone: 'เบอร์โทร',
      date: 'วันที่',
      url: 'ลิงก์',
      province: 'จังหวัด',
      multiple_choice: 'ตัวเลือก',
      file_upload: 'ไฟล์',
      image_upload: 'รูปภาพ'
    };
    return types[type] || type;
  };

  const fieldTypes = [
    'short_answer',
    'paragraph',
    'number',
    'email',
    'phone',
    'date',
    'url',
    'province',
    'multiple_choice'
  ];

  return (
    <GlassCard className="max-w-7xl">
      <GlassCardHeader>
        <GlassCardTitle className="text-2xl">
          ขั้นตอนที่ 3: จับคู่ฟิลด์
        </GlassCardTitle>
        <p className="text-muted-foreground mt-2">
          เลือกฟอร์มที่ต้องการนำเข้า และจับคู่คอลัมน์จาก Sheet กับฟิลด์ในฟอร์ม
        </p>
      </GlassCardHeader>

      <GlassCardContent className="space-y-6">
        {/* Form Selection */}
        <GlassSelect
          label="เลือกฟอร์มที่ต้องการนำเข้า"
          value={selectedForm?.id || ''}
          onChange={handleFormChange}
          required
          disabled={loading}
        >
          <option value="">-- เลือกฟอร์ม --</option>
          {forms.map(form => (
            <option key={form.id} value={form.id}>
              {form.title}
            </option>
          ))}
        </GlassSelect>

        {/* Mapping Table */}
        {selectedForm && formFields.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold border-b border-border w-48">
                    คอลัมน์จาก Sheet
                  </th>
                  <th className="px-4 py-3 text-left font-semibold border-b border-border w-64">
                    จับคู่กับฟิลด์
                  </th>
                  <th className="px-4 py-3 text-left font-semibold border-b border-border w-40">
                    ประเภทข้อมูล
                  </th>
                  <th className="px-4 py-3 text-left font-semibold border-b border-border w-48">
                    ตัวอย่างข้อมูล
                  </th>
                  <th className="px-4 py-3 text-center font-semibold border-b border-border w-24">
                    ข้าม
                  </th>
                </tr>
              </thead>
              <tbody>
                {headers.map((header, index) => {
                  const mapping = mappings[index] || {};
                  const sampleValue = sample_rows[0]?.[index] || '';

                  return (
                    <tr
                      key={index}
                      className={`border-b border-border ${mapping.skip ? 'opacity-50 bg-muted/20' : 'hover:bg-muted/30'} transition-colors`}
                    >
                      {/* Column Name */}
                      <td className="px-4 py-3 font-medium">
                        {header}
                      </td>

                      {/* Field Selection */}
                      <td className="px-4 py-3">
                        <select
                          value={mapping.field_id || ''}
                          onChange={(e) => handleFieldChange(index, e.target.value)}
                          disabled={mapping.skip}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">-- ไม่เลือก --</option>
                          {formFields.map(field => (
                            <option key={field.id} value={field.id}>
                              {field.title} ({getThaiType(field.type)})
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Type Selection */}
                      <td className="px-4 py-3">
                        <select
                          value={mapping.field_type || 'short_answer'}
                          onChange={(e) => handleTypeChange(index, e.target.value)}
                          disabled={mapping.skip || !mapping.field_id}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {fieldTypes.map(type => (
                            <option key={type} value={type}>
                              {getThaiType(type)}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Sample Value */}
                      <td className="px-4 py-3 text-muted-foreground">
                        <div className="max-w-xs truncate" title={sampleValue}>
                          {sampleValue || <span className="italic">ว่าง</span>}
                        </div>
                      </td>

                      {/* Skip Checkbox */}
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={mapping.skip || false}
                          onChange={(e) => handleSkipChange(index, e.target.checked)}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Info Message */}
        {selectedForm && formFields.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <span className="font-semibold">คำแนะนำ:</span> เลือกฟิลด์ที่ต้องการนำเข้า
              และกำหนดประเภทข้อมูล หากต้องการข้ามคอลัมน์ใด ให้เลือก "ข้าม"
            </p>
          </div>
        )}

        {/* No Fields Message */}
        {selectedForm && formFields.length === 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ฟอร์มนี้ยังไม่มีฟิลด์ กรุณาสร้างฟิลด์ในฟอร์มก่อนนำเข้าข้อมูล
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <p className="text-sm text-red-800 dark:text-red-200">
              {error}
            </p>
          </div>
        )}
      </GlassCardContent>

      <GlassCardFooter className="justify-between">
        <GlassButton
          variant="ghost"
          onClick={onBack}
        >
          ย้อนกลับ
        </GlassButton>

        <GlassButton
          variant="primary"
          onClick={handleStartImport}
          disabled={!selectedForm || formFields.length === 0 || loading}
        >
          เริ่มนำเข้า
        </GlassButton>
      </GlassCardFooter>
    </GlassCard>
  );
};

export default FieldMappingTable;
