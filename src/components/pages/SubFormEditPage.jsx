/**
 * SubFormEditPage - Edit existing sub-form submissions
 *
 * Features:
 * - Load existing sub-form submission data
 * - Support multiple sub-form entries
 * - Order management for entries
 * - Pre-fill fields
 * - Save updates to dynamic tables
 * - Theme support (glass/minimal)
 * - Mobile responsive
 *
 * @version 0.6.3
 * @since 2025-10-02
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassCard, GlassCardContent } from '../ui/glass-card';
import { GlassButton } from '../ui/glass-button';
import { GlassInput, GlassTextarea, GlassSelect } from '../ui/glass-input';
import { MinimalCard, MinimalCardContent } from '../ui/minimal-card';
import { MinimalButton } from '../ui/minimal-button';
import { MinimalInput } from '../ui/minimal-input';
import { MinimalSelect } from '../ui/minimal-select';
import { useEnhancedToast } from '../ui/enhanced-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSave, faArrowLeft, faMapMarkerAlt, faStar, faGripVertical,
  faTrash, faPlus, faChevronUp, faChevronDown
} from '@fortawesome/free-solid-svg-icons';
import ThaiDateInput from '../ui/thai-date-input';
import ThaiDateTimeInput from '../ui/thai-datetime-input';
import ThaiPhoneInput from '../ui/thai-phone-input';
import { FieldErrorAlert } from '../ui/alert';
import EnhancedFormSlider from '../ui/enhanced-form-slider';

// Drag and drop
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Data services
import dataService from '../../services/DataService.js';
import FileService from '../../services/FileService.js';

// Utilities
import { formatNumberInput, parseNumberInput, isValidNumber } from '../../utils/numberFormatter.js';
import { useStorage } from '../../contexts/StorageContext.jsx';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { useAuth } from '../../contexts/AuthContext';

// Sortable Item Component
function SortableSubFormEntry({ id, entry, index, subForm, onFieldChange, onRemove, theme }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isMinimalTheme = theme === 'minimal';
  const Card = isMinimalTheme ? MinimalCard : GlassCard;
  const CardContent = isMinimalTheme ? MinimalCardContent : GlassCardContent;
  const Input = isMinimalTheme ? MinimalInput : GlassInput;
  const Textarea = isMinimalTheme ? MinimalInput : GlassTextarea;
  const Select = isMinimalTheme ? MinimalSelect : GlassSelect;

  const renderField = (field) => {
    const value = entry.data[field.id] || '';

    switch (field.type) {
      case 'short_answer':
        return (
          <Input
            value={value}
            onChange={(e) => onFieldChange(index, field.id, e.target.value)}
            placeholder={field.placeholder}
          />
        );

      case 'paragraph':
        return (
          <Textarea
            as="textarea"
            value={value}
            onChange={(e) => onFieldChange(index, field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
          />
        );

      case 'number':
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => {
              const formatted = formatNumberInput(e.target.value);
              onFieldChange(index, field.id, formatted);
            }}
            placeholder={field.placeholder || '0'}
          />
        );

      case 'date':
        return (
          <ThaiDateInput
            value={value}
            onChange={(val) => onFieldChange(index, field.id, val)}
          />
        );

      case 'multiple_choice':
        return (
          <Select
            value={value}
            onChange={(e) => onFieldChange(index, field.id, e.target.value)}
          >
            <option value="">เลือก...</option>
            {field.options?.map((option, idx) => (
              <option key={idx} value={option}>{option}</option>
            ))}
          </Select>
        );

      case 'rating':
        return (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => onFieldChange(index, field.id, star)}
                className="transition-colors"
              >
                <FontAwesomeIcon
                  icon={faStar}
                  className={`text-xl ${
                    star <= (value || 0) ? 'text-yellow-400' : 'text-muted-foreground/30'
                  }`}
                />
              </button>
            ))}
          </div>
        );

      default:
        return (
          <Input
            value={value}
            onChange={(e) => onFieldChange(index, field.id, e.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div
              {...attributes}
              {...listeners}
              className="mt-2 cursor-move touch-none"
            >
              <FontAwesomeIcon
                icon={faGripVertical}
                className="text-muted-foreground hover:text-foreground transition-colors"
              />
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">รายการที่ {index + 1}</h4>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="text-destructive hover:text-destructive/80 transition-colors"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>

              {subForm.fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <label className="text-sm font-medium">
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </label>
                  {renderField(field)}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SubFormEditPage({
  formId,
  submissionId,
  subFormId,
  subSubmissionId,
  onSave,
  onCancel
}) {
  const [form, setForm] = useState(null);
  const [subForm, setSubForm] = useState(null);
  const [existingSubSubmission, setExistingSubSubmission] = useState(null);
  const [subFormEntries, setSubFormEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Contexts
  const toast = useEnhancedToast();
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuth();

  // Theme components
  const isMinimalTheme = theme === 'minimal';
  const Card = isMinimalTheme ? MinimalCard : GlassCard;
  const CardContent = isMinimalTheme ? MinimalCardContent : GlassCardContent;
  const Button = isMinimalTheme ? MinimalButton : GlassButton;

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load sub-form and submission data
  useEffect(() => {
    loadSubFormData();
  }, [formId, subFormId, subSubmissionId]);

  const loadSubFormData = async () => {
    setLoading(true);
    try {
      // Load main form
      const formData = dataService.getForm(formId);
      if (!formData) {
        toast.error('ไม่พบแบบฟอร์มหลัก', { title: 'ข้อผิดพลาด' });
        if (onCancel) onCancel();
        return;
      }
      setForm(formData);

      // Find sub-form
      const subFormData = formData.subForms?.find(sf => sf.id === subFormId);
      if (!subFormData) {
        toast.error('ไม่พบฟอร์มย่อย', { title: 'ข้อผิดพลาด' });
        if (onCancel) onCancel();
        return;
      }
      setSubForm(subFormData);

      // Load existing sub-submission
      const subSubmission = dataService.getSubSubmission(subSubmissionId);
      if (!subSubmission) {
        toast.error('ไม่พบข้อมูลฟอร์มย่อยที่ต้องการแก้ไข', { title: 'ข้อผิดพลาด' });
        if (onCancel) onCancel();
        return;
      }
      setExistingSubSubmission(subSubmission);

      // Initialize entries from existing data
      if (subSubmission.data && Array.isArray(subSubmission.data)) {
        const entries = subSubmission.data.map((entryData, index) => ({
          id: `entry-${index}`,
          data: entryData
        }));
        setSubFormEntries(entries);
      } else if (subSubmission.data && typeof subSubmission.data === 'object') {
        // If data is not an array, treat it as a single entry
        setSubFormEntries([{
          id: 'entry-0',
          data: subSubmission.data
        }]);
      } else {
        // Default to one empty entry
        setSubFormEntries([{
          id: 'entry-0',
          data: {}
        }]);
      }

    } catch (error) {
      console.error('Error loading sub-form data:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล', { title: 'ข้อผิดพลาด' });
      if (onCancel) onCancel();
    } finally {
      setLoading(false);
    }
  };

  // Check if user can edit
  const canEdit = () => {
    if (!user || !existingSubSubmission) return false;

    // Admin and moderator can edit all submissions
    if (['super_admin', 'admin', 'moderator'].includes(user.role)) return true;

    // User can edit their own submission
    const parentSubmission = dataService.getSubmission(submissionId);
    return parentSubmission && (
      parentSubmission.userId === user.id ||
      parentSubmission.createdBy === user.email
    );
  };

  // Handle field change
  const handleFieldChange = (entryIndex, fieldId, value) => {
    setSubFormEntries(prev => {
      const updated = [...prev];
      if (!updated[entryIndex].data) {
        updated[entryIndex].data = {};
      }
      updated[entryIndex].data[fieldId] = value;
      return updated;
    });
  };

  // Add new entry
  const handleAddEntry = () => {
    const newEntry = {
      id: `entry-${Date.now()}`,
      data: {}
    };
    setSubFormEntries(prev => [...prev, newEntry]);
  };

  // Remove entry
  const handleRemoveEntry = (index) => {
    if (subFormEntries.length <= 1) {
      toast.error('ต้องมีข้อมูลอย่างน้อย 1 รายการ', { title: 'ไม่สามารถลบได้' });
      return;
    }
    setSubFormEntries(prev => prev.filter((_, i) => i !== index));
  };

  // Handle drag end
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setSubFormEntries((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Validate entries
  const validateEntries = () => {
    for (let i = 0; i < subFormEntries.length; i++) {
      const entry = subFormEntries[i];
      for (const field of subForm.fields) {
        if (field.required) {
          const value = entry.data[field.id];
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            toast.error(`กรุณากรอก ${field.label} ในรายการที่ ${i + 1}`, {
              title: 'ข้อมูลไม่ครบถ้วน'
            });
            return false;
          }
        }
      }
    }
    return true;
  };

  // Handle submission
  const handleSubmit = async () => {
    if (!canEdit()) {
      toast.error('คุณไม่มีสิทธิ์แก้ไขข้อมูลนี้', { title: 'ไม่มีสิทธิ์' });
      return;
    }

    if (!validateEntries()) {
      return;
    }

    setSubmitting(true);

    try {
      // Prepare submission data - extract only the data from entries
      const submissionData = subFormEntries.map(entry => {
        const processedData = {};
        subForm.fields.forEach(field => {
          const value = entry.data[field.id];
          if (field.type === 'number' && value) {
            processedData[field.id] = parseNumberInput(value);
          } else {
            processedData[field.id] = value;
          }
        });
        return processedData;
      });

      // Update sub-submission using DataService
      const updatedSubSubmission = dataService.updateSubSubmission(subSubmissionId, {
        ...existingSubSubmission,
        data: submissionData,
        updatedAt: new Date().toISOString()
      });

      if (!updatedSubSubmission) {
        throw new Error('Failed to update sub-form submission');
      }

      toast.success('บันทึกการแก้ไขข้อมูลฟอร์มย่อยเรียบร้อยแล้ว', {
        title: 'สำเร็จ',
        duration: 3000
      });

      if (onSave) {
        onSave(updatedSubSubmission, true);
      }

    } catch (error) {
      console.error('Error updating sub-form submission:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล', {
        title: 'ข้อผิดพลาด',
        description: error.message
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (!subForm) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">ไม่พบฟอร์มย่อย</p>
      </div>
    );
  }

  if (!canEdit()) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">คุณไม่มีสิทธิ์แก้ไขข้อมูลนี้</p>
        <Button onClick={onCancel} className="mt-4">
          กลับ
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-3xl mx-auto"
    >
      <Card>
        <CardContent className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              แก้ไขข้อมูลฟอร์มย่อย: {subForm.title}
            </h2>
            {subForm.description && (
              <p className="text-muted-foreground mt-2">{subForm.description}</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              กำลังแก้ไขข้อมูล ID: {subSubmissionId}
            </p>
          </div>

          {/* Sub-form entries */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={subFormEntries.map(e => e.id)}
              strategy={verticalListSortingStrategy}
            >
              {subFormEntries.map((entry, index) => (
                <SortableSubFormEntry
                  key={entry.id}
                  id={entry.id}
                  entry={entry}
                  index={index}
                  subForm={subForm}
                  onFieldChange={handleFieldChange}
                  onRemove={handleRemoveEntry}
                  theme={theme}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Add entry button */}
          <div className="flex justify-center mb-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleAddEntry}
              size="sm"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              เพิ่มรายการใหม่
            </Button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-8">
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faSave} className="mr-2" />
                  บันทึกการแก้ไข
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={submitting}
            >
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              ยกเลิก
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}