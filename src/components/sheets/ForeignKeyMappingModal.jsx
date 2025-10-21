/**
 * ForeignKeyMappingModal Component v0.8.0
 * Step 3.5: Map foreign key relationships between sub-form and parent form
 *
 * User Flow:
 * 1. User selects parent form in FormTypeSelection
 * 2. Modal opens showing two columns:
 *    - Left: Sub-form fields (from selected columns in Step 2)
 *    - Right: Parent form fields (fetched from selected parent form)
 * 3. User selects which field pairs are foreign key relationships
 * 4. At least one mapping required to proceed
 *
 * Example Mapping:
 * Sub-form Field: "รหัสลูกค้า" (customer_id) → Parent Field: "ID" (id)
 */

import React, { useState, useEffect } from 'react';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent, GlassCardFooter } from '../ui/glass-card';
import { GlassButton } from '../ui/glass-button';
import apiClient from '../../services/ApiClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink, faArrowRight, faCheck, faTimes, faInfoCircle } from '@fortawesome/free-solid-svg-icons';

const ForeignKeyMappingModal = ({
  parentFormId,
  subFormFields, // Fields from Step 2 (selectedColumns)
  onSave,
  onCancel
}) => {
  const [parentForm, setParentForm] = useState(null);
  const [parentFields, setParentFields] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchParentForm();
  }, [parentFormId]);

  const fetchParentForm = async () => {
    try {
      setLoading(true);
      console.log('🔗 [FKModal] Fetching parent form:', parentFormId);

      const response = await apiClient.getForm(parentFormId);
      console.log('🔗 [FKModal] Raw response:', response);

      // ✅ FIX: Handle multiple response structures
      // API returns: {success: true, data: {form: {...}}}
      let form = response?.data || response;

      // Check if form is nested inside another 'form' property
      if (form?.form) {
        form = form.form;
      }

      console.log('🔗 [FKModal] Extracted form:', form);
      console.log('🔗 [FKModal] Form structure:', {
        hasFields: !!form?.fields,
        fieldsCount: form?.fields?.length || 0,
        formKeys: Object.keys(form || {})
      });

      setParentForm(form);

      // Extract fields from parent form
      const fields = form?.fields || [];
      console.log('🔗 [FKModal] Parent fields:', fields.length);
      console.log('🔗 [FKModal] Field details:', fields);

      setParentFields(fields);

      // Initialize mappings array (one for each sub-form field)
      const initialMappings = subFormFields.map(subField => ({
        subFormFieldName: subField.columnName,
        subFormFieldType: subField.fieldType,
        parentFieldId: '', // User will select
        parentFieldName: '',
        parentFieldType: ''
      }));

      setMappings(initialMappings);
    } catch (err) {
      console.error('❌ [FKModal] Error fetching parent form:', err);
      setError('ไม่สามารถโหลดข้อมูลฟอร์มหลักได้');
    } finally {
      setLoading(false);
    }
  };

  const updateMapping = (index, parentFieldId) => {
    const parentField = parentFields.find(f => f.id === parentFieldId);

    setMappings(prev => {
      const newMappings = [...prev];
      newMappings[index] = {
        ...newMappings[index],
        parentFieldId: parentFieldId,
        parentFieldName: parentField?.title || '',
        parentFieldType: parentField?.type || ''
      };
      return newMappings;
    });
  };

  const handleSave = () => {
    // Filter only mappings where user selected a parent field
    const activeMappings = mappings.filter(m => m.parentFieldId);

    if (activeMappings.length === 0) {
      setError('กรุณาเลือกอย่างน้อย 1 ความสัมพันธ์ระหว่างฟิลด์');
      return;
    }

    console.log('✅ [FKModal] Saving mappings:', activeMappings);
    onSave(activeMappings);
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
      time: 'เวลา',
      datetime: 'วันที่และเวลา',
      url: 'ลิงก์',
      province: 'จังหวัด',
      multiple_choice: 'ตัวเลือก',
      file_upload: 'ไฟล์',
      image_upload: 'รูปภาพ'
    };
    return types[type] || type;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="max-w-5xl w-full h-[85vh] bg-white dark:bg-gray-900 shadow-2xl rounded-2xl flex flex-col overflow-hidden border-2 border-gray-200 dark:border-gray-700">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-6 py-4 bg-gradient-to-r from-primary/5 to-transparent">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            <FontAwesomeIcon icon={faLink} className="mr-2 text-primary" />
            กำหนดความสัมพันธ์ระหว่างฟิลด์
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            เลือกฟิลด์ในฟอร์มย่อยที่จะเชื่อมโยงกับฟิลด์ในฟอร์มหลัก (Foreign Key)
          </p>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Parent Form Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex-shrink-0">
            <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
              ฟอร์มหลัก
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {parentForm?.title || 'กำลังโหลด...'}
            </p>
          </div>

          {/* Mapping Table - All fields visible with proper table layout */}
          {!loading && parentFields.length > 0 && (
            <div className="rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
              <table className="w-full text-sm">
                {/* Table Header - Fixed at top */}
                <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 border-b-2 border-gray-300 dark:border-gray-600 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-4 text-left font-bold text-gray-900 dark:text-gray-100 w-2/5">
                      ฟิลด์ในฟอร์มย่อย
                    </th>
                    <th className="px-4 py-4 text-center font-bold text-gray-900 dark:text-gray-100 w-16">
                      <FontAwesomeIcon icon={faArrowRight} className="text-xl" />
                    </th>
                    <th className="px-4 py-4 text-left font-bold text-gray-900 dark:text-gray-100 w-2/5">
                      เชื่อมโยงกับฟิลด์ในฟอร์มหลัก
                    </th>
                  </tr>
                </thead>

                {/* Table Body - All rows visible, content scrolls */}
                <tbody className="bg-white dark:bg-gray-900">
                  {mappings.map((mapping, index) => (
                    <tr
                      key={index}
                      className={`border-b border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${
                        index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'
                      }`}
                    >
                      {/* Sub-form Field */}
                      <td className="px-4 py-4 w-2/5">
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            {mapping.subFormFieldName}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            ประเภท: {getThaiType(mapping.subFormFieldType)}
                          </div>
                        </div>
                      </td>

                      {/* Arrow */}
                      <td className="px-4 py-4 text-center w-16">
                        <FontAwesomeIcon
                          icon={faArrowRight}
                          className={`text-xl ${
                            mapping.parentFieldId
                              ? 'text-primary animate-pulse'
                              : 'text-gray-400 dark:text-gray-600'
                          }`}
                        />
                      </td>

                      {/* Parent Field Selection */}
                      <td className="px-4 py-4 w-2/5">
                        <select
                          value={mapping.parentFieldId || ''}
                          onChange={(e) => updateMapping(index, e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm hover:shadow-md"
                        >
                          <option value="">-- ไม่เชื่อมโยง --</option>
                          {parentFields.map(field => (
                            <option key={field.id} value={field.id}>
                              {field.title} ({getThaiType(field.type)})
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <p className="text-sm text-red-800 dark:text-red-200">
                <FontAwesomeIcon icon={faTimes} className="mr-2" />
                {error}
              </p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">กำลังโหลดข้อมูลฟอร์มหลัก...</p>
            </div>
          )}

          {/* No Parent Fields Warning */}
          {!loading && parentFields.length === 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl p-6">
              <p className="text-sm text-yellow-900 dark:text-yellow-200 font-medium">
                <FontAwesomeIcon icon={faInfoCircle} className="mr-2 text-xl" />
                ฟอร์มหลักยังไม่มีฟิลด์ กรุณาเพิ่มฟิลด์ในฟอร์มหลักก่อน
              </p>
            </div>
          )}
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-2.5 rounded-lg font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ยกเลิก
          </button>

          <button
            onClick={handleSave}
            disabled={loading || parentFields.length === 0}
            className="px-6 py-2.5 rounded-lg font-semibold bg-primary text-white hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faCheck} />
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForeignKeyMappingModal;
