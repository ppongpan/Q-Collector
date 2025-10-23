/**
 * FormTypeSelection Component v0.8.0-revised
 * Step 3: Form Type Selection (Main Form OR Sub-Form)
 * - Radio buttons: Main Form vs Sub-Form
 * - If Sub-Form: Dropdown to select parent form
 * - Form name and description inputs
 * - Role permissions checkboxes
 */

import React, { useState, useEffect } from 'react';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent, GlassCardFooter } from '../ui/glass-card';
import { GlassButton } from '../ui/glass-button';
import { GlassInput, GlassTextarea } from '../ui/glass-input';
import apiClient from '../../services/ApiClient';
import ForeignKeyMappingModal from './ForeignKeyMappingModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileAlt, faLayerGroup, faUsers, faCheck, faTimes,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';

// User roles for permission selection
const USER_ROLES = [
  { id: 'super_admin', label: 'Super Admin', color: 'red', isDefault: true },
  { id: 'admin', label: 'Admin', color: 'pink', isDefault: true },
  { id: 'customer_service', label: 'Customer Service', color: 'blue', isDefault: false },
  { id: 'technic', label: 'Technic', color: 'cyan', isDefault: false },
  { id: 'sale', label: 'Sale', color: 'green', isDefault: false },
  { id: 'marketing', label: 'Marketing', color: 'orange', isDefault: false },
  { id: 'general_user', label: 'General User', color: 'gray', isDefault: false }
];

const FormTypeSelection = ({ sheetData, selectedColumns, onNext, onBack }) => {
  const [formType, setFormType] = useState('main'); // 'main' or 'sub'
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [parentFormId, setParentFormId] = useState('');
  const [selectedRoles, setSelectedRoles] = useState(['super_admin', 'admin']); // Default roles

  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ✅ NEW: Foreign key mapping state
  const [foreignKeyMappings, setForeignKeyMappings] = useState([]);
  const [showFKModal, setShowFKModal] = useState(false);

  // Fetch forms when switching to sub-form type
  useEffect(() => {
    if (formType === 'sub') {
      fetchForms();
    }
  }, [formType]);

  // ✅ NEW: Open FK modal automatically when parent form is selected
  useEffect(() => {
    if (formType === 'sub' && parentFormId && selectedColumns.length > 0) {
      console.log('🔗 Auto-opening FK modal for parent form:', parentFormId);
      setShowFKModal(true);
    }
  }, [parentFormId, formType, selectedColumns.length]);

  const fetchForms = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('📋 [FormTypeSelection] Fetching forms...');
      const response = await apiClient.listForms();

      // DEBUG: Log full response
      console.log('📋 [FormTypeSelection] Raw Response:', response);

      // ✅ FIX: Handle multiple response structures
      const formsList = response?.forms || response?.data?.forms || response || [];

      console.log('📋 [FormTypeSelection] Forms List:', formsList);

      if (!Array.isArray(formsList)) {
        console.error('❌ Forms list is not an array:', formsList);
        setError('รูปแบบข้อมูลไม่ถูกต้อง');
        setForms([]);
        return;
      }

      // Filter only active main forms (not sub-forms)
      const activeForms = formsList.filter(f => f.is_active !== false);

      console.log('📋 [FormTypeSelection] Active Forms:', activeForms);
      console.log('📋 [FormTypeSelection] Form Count:', activeForms.length);

      setForms(activeForms);

      if (activeForms.length === 0) {
        setError('ไม่พบฟอร์มหลักในระบบ กรุณาสร้างฟอร์มหลักก่อน');
      }
    } catch (err) {
      console.error('❌ [FormTypeSelection] Error fetching forms:', err);
      console.error('❌ Error details:', {
        message: err.message,
        status: err.status,
        data: err.data
      });
      setError('ไม่สามารถโหลดรายการฟอร์มได้: ' + (err.message || 'Unknown error'));
      setForms([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (roleId) => {
    setSelectedRoles(prev => {
      if (prev.includes(roleId)) {
        // Prevent removing all roles
        if (prev.length === 1) {
          setError('ต้องเลือกอย่างน้อย 1 บทบาท');
          return prev;
        }
        return prev.filter(r => r !== roleId);
      } else {
        setError('');
        return [...prev, roleId];
      }
    });
  };

  const handleNext = () => {
    // Validation
    if (!formName.trim()) {
      setError('กรุณากรอกชื่อฟอร์ม');
      return;
    }

    if (formType === 'sub' && !parentFormId) {
      setError('กรุณาเลือกฟอร์มหลัก');
      return;
    }

    if (selectedRoles.length === 0) {
      setError('กรุณาเลือกอย่างน้อย 1 บทบาทที่สามารถเข้าถึงฟอร์มได้');
      return;
    }

    // ✅ UPDATED: For sub-form, FK modal should already be configured
    // If user clicks "สร้างฟอร์ม" without FK mappings, show error
    if (formType === 'sub' && foreignKeyMappings.length === 0) {
      setError('กรุณากำหนดความสัมพันธ์ระหว่างฟิลด์ (Foreign Key Mapping)');
      setShowFKModal(true); // Re-open modal
      return;
    }

    // Proceed to next step
    proceedToNextStep(foreignKeyMappings);
  };

  const proceedToNextStep = (fkMappings = []) => {
    // Build form configuration
    const formConfig = {
      name: formName.trim(),
      description: formDescription.trim() || `นำเข้าจาก Google Sheets: ${sheetData.metadata?.sheetName || 'Sheet'}`,
      isSubForm: formType === 'sub',
      parentFormId: formType === 'sub' ? parentFormId : null,
      selectedColumns, // From previous step (Step 2)
      roles_allowed: selectedRoles,
      foreignKeyMappings: fkMappings // ✅ NEW: Add FK mappings
    };

    console.log('✅ Proceeding to next step with config:', formConfig);
    onNext(formConfig);
  };

  return (
    <GlassCard className="max-w-4xl">
      <GlassCardHeader>
        <GlassCardTitle className="text-2xl">
          ขั้นตอนที่ 3: กำหนดประเภทฟอร์ม
        </GlassCardTitle>
        <p className="text-muted-foreground mt-2">
          เลือกว่าจะสร้างเป็นฟอร์มหลัก หรือฟอร์มย่อยภายใต้ฟอร์มหลักที่มีอยู่
        </p>
      </GlassCardHeader>

      <GlassCardContent className="space-y-6">
        {/* Form Type Selection */}
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-foreground">
            ประเภทฟอร์ม <span className="text-red-500">*</span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Main Form Option */}
            <button
              type="button"
              onClick={() => setFormType('main')}
              className={`p-6 rounded-xl border-2 transition-all text-left ${
                formType === 'main'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${
                  formType === 'main' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  <FontAwesomeIcon icon={faFileAlt} className="text-xl" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-foreground">ฟอร์มหลัก</h3>
                    {formType === 'main' && (
                      <FontAwesomeIcon icon={faCheck} className="text-primary" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    สร้างฟอร์มใหม่แยกต่างหาก สามารถมีฟอร์มย่อยได้ภายหลัง
                  </p>
                </div>
              </div>
            </button>

            {/* Sub-Form Option */}
            <button
              type="button"
              onClick={() => setFormType('sub')}
              className={`p-6 rounded-xl border-2 transition-all text-left ${
                formType === 'sub'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${
                  formType === 'sub' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  <FontAwesomeIcon icon={faLayerGroup} className="text-xl" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-foreground">ฟอร์มย่อย</h3>
                    {formType === 'sub' && (
                      <FontAwesomeIcon icon={faCheck} className="text-primary" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    สร้างภายใต้ฟอร์มหลักที่มีอยู่ เหมาะสำหรับข้อมูลที่เกี่ยวข้องกัน
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Parent Form Selection (if Sub-Form) */}
        {formType === 'sub' && (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-foreground">
              เลือกฟอร์มหลัก <span className="text-red-500">*</span>
            </label>
            <select
              value={parentFormId}
              onChange={(e) => {
                const selectedId = e.target.value;
                setParentFormId(selectedId);
                // FK modal will open automatically via useEffect
              }}
              disabled={loading}
              className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
              <option value="">-- เลือกฟอร์มหลัก --</option>
              {forms.map(form => (
                <option key={form.id} value={form.id}>
                  {form.title}
                </option>
              ))}
            </select>
            {formType === 'sub' && forms.length === 0 && !loading && (
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                <FontAwesomeIcon icon={faInfoCircle} className="mr-1" />
                ยังไม่มีฟอร์มหลัก กรุณาสร้างฟอร์มหลักก่อน
              </p>
            )}
            {/* ✅ NEW: Show FK mapping status */}
            {formType === 'sub' && parentFormId && foreignKeyMappings.length > 0 && (
              <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <FontAwesomeIcon icon={faCheck} className="mr-2" />
                  กำหนดความสัมพันธ์แล้ว: {foreignKeyMappings.length} ฟิลด์
                </p>
                <button
                  type="button"
                  onClick={() => setShowFKModal(true)}
                  className="mt-1 text-xs text-green-700 dark:text-green-300 hover:underline"
                >
                  แก้ไขความสัมพันธ์
                </button>
              </div>
            )}
            {formType === 'sub' && parentFormId && foreignKeyMappings.length === 0 && (
              <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
                  กำลังรอกำหนดความสัมพันธ์ระหว่างฟิลด์...
                </p>
              </div>
            )}
          </div>
        )}

        {/* Form Name */}
        <div className="space-y-2">
          <GlassInput
            label={`ชื่อฟอร์ม${formType === 'sub' ? 'ย่อย' : 'หลัก'}`}
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder={`เช่น: ${sheetData.metadata?.sheetName || 'ฟอร์มจาก Google Sheets'}`}
            required
          />
        </div>

        {/* Form Description */}
        <div className="space-y-2">
          <GlassTextarea
            label="คำอธิบาย (ไม่บังคับ)"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="อธิบายวัตถุประสงค์ของฟอร์มนี้..."
            rows={3}
          />
        </div>

        {/* Role Permissions */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-foreground">
            <FontAwesomeIcon icon={faUsers} className="mr-2" />
            บทบาทที่สามารถเข้าถึงฟอร์มได้ <span className="text-red-500">*</span>
          </label>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {USER_ROLES.map(role => {
              const isSelected = selectedRoles.includes(role.id);
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => toggleRole(role.id)}
                  className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                    isSelected
                      ? `border-${role.color}-500 bg-${role.color}-500/10 text-${role.color}-600 dark:text-${role.color}-400`
                      : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    {isSelected && <FontAwesomeIcon icon={faCheck} className="text-xs" />}
                    <span>{role.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            <FontAwesomeIcon icon={faInfoCircle} className="mr-1" />
            เลือกอย่างน้อย 1 บทบาท บทบาทเหล่านี้จะสามารถดูและกรอกฟอร์มนี้ได้
          </p>
        </div>

        {/* Summary Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
            สรุป
          </h4>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• ประเภท: <span className="font-semibold">{formType === 'main' ? 'ฟอร์มหลัก' : 'ฟอร์มย่อย'}</span></li>
            <li>• จำนวนฟิลด์: <span className="font-semibold">{selectedColumns.length} ฟิลด์</span></li>
            <li>• จำนวนข้อมูล: <span className="font-semibold">{sheetData.rows?.length || 0} แถว</span></li>
            <li>• บทบาทที่เข้าถึงได้: <span className="font-semibold">{selectedRoles.length} บทบาท</span></li>
          </ul>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <p className="text-sm text-red-800 dark:text-red-200">
              <FontAwesomeIcon icon={faTimes} className="mr-2" />
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
          onClick={handleNext}
          disabled={loading}
        >
          สร้างฟอร์ม
        </GlassButton>
      </GlassCardFooter>

      {/* ✅ NEW: Foreign Key Mapping Modal */}
      {showFKModal && (
        <ForeignKeyMappingModal
          parentFormId={parentFormId}
          subFormFields={selectedColumns}
          onSave={(mappings) => {
            setForeignKeyMappings(mappings);
            setShowFKModal(false);
            // ✅ FIX: Don't proceed automatically - let user click "สร้างฟอร์ม" button
            // This ensures all validations (including form name) are checked
            console.log('✅ [FK] Mappings saved:', mappings.length);
          }}
          onCancel={() => setShowFKModal(false)}
        />
      )}
    </GlassCard>
  );
};

export default FormTypeSelection;
