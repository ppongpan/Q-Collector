import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription, GlassCardContent } from './ui/glass-card';
import { GlassButton } from './ui/glass-button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileAlt, faCalendarAlt, faEdit, faTrashAlt, faLayerGroup
} from '@fortawesome/free-solid-svg-icons';

// Data services
import dataService from '../services/DataService.js';

export default function SubFormDetail({
  formId,
  submissionId,
  subFormId,
  subSubmissionId,
  onEdit,
  onDelete,
  onBack
}) {
  const [form, setForm] = useState(null);
  const [subForm, setSubForm] = useState(null);
  const [subSubmission, setSubSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fieldOrder, setFieldOrder] = useState([]);
  const [draggedField, setDraggedField] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedData, setEditedData] = useState({});

  // Load subform submission data
  useEffect(() => {
    loadSubSubmissionData();
  }, [formId, subFormId, subSubmissionId]);

  const loadSubSubmissionData = async () => {
    setLoading(true);
    try {
      // Load main form
      const formData = dataService.getForm(formId);
      if (!formData) {
        console.error('Form not found:', formId);
        return;
      }
      setForm(formData);

      // Find sub form
      const subFormData = formData.subForms?.find(sf => sf.id === subFormId);
      if (!subFormData) {
        console.error('SubForm not found:', subFormId);
        return;
      }
      setSubForm(subFormData);

      // Load field order from localStorage or use default
      const savedOrder = localStorage.getItem(`subFieldOrder_${subFormId}`);
      if (savedOrder) {
        const orderIds = JSON.parse(savedOrder);
        const orderedFields = orderIds.map(id => subFormData.fields?.find(f => f.id === id)).filter(Boolean);
        const newFields = subFormData.fields?.filter(f => !orderIds.includes(f.id)) || [];
        setFieldOrder([...orderedFields, ...newFields]);
      } else {
        setFieldOrder(subFormData.fields || []);
      }

      // Load sub submission
      const subSubmissionData = dataService.getSubSubmission(subSubmissionId);
      if (!subSubmissionData) {
        console.error('SubSubmission not found:', subSubmissionId);
        return;
      }
      setSubSubmission(subSubmissionData);
      setEditedData(subSubmissionData.data || {});

    } catch (error) {
      console.error('Error loading sub submission data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(subSubmissionId);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm('⚠️ คุณแน่ใจหรือไม่ที่จะลบข้อมูลนี้?\n\nการลบจะไม่สามารถย้อนกลับได้');
    if (confirmed) {
      try {
        await dataService.deleteSubSubmission(subSubmissionId);
        alert('✅ ลบข้อมูลเรียบร้อยแล้ว');
        if (onDelete) {
          onDelete(subSubmissionId);
        }
      } catch (error) {
        console.error('Delete error:', error);
        alert('❌ เกิดข้อผิดพลาดในการลบข้อมูล');
      }
    }
  };

  const handleSave = async () => {
    try {
      // Update sub submission data
      const updatedSubSubmission = {
        ...subSubmission,
        data: editedData,
        updatedAt: new Date().toISOString()
      };

      // Save to dataService
      dataService.updateSubSubmission(subSubmissionId, updatedSubSubmission);

      // Save field order
      const orderIds = fieldOrder.map(f => f.id);
      localStorage.setItem(`subFieldOrder_${subFormId}`, JSON.stringify(orderIds));

      // Update local state
      setSubSubmission(updatedSubSubmission);
      setIsEditMode(false);

      // Show success message
      alert('บันทึกข้อมูลเรียบร้อยแล้ว');

    } catch (error) {
      console.error('Error saving data:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const formatFieldValue = (field, value) => {
    if (!value && value !== 0) return '-';

    switch (field.type) {
      case 'date':
        try {
          const date = new Date(value);
          if (isNaN(date.getTime())) return 'Invalid Date';
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        } catch (error) {
          return 'Invalid Date';
        }
      case 'time':
        return value;
      case 'datetime':
        try {
          const date = new Date(value);
          if (isNaN(date.getTime())) return 'Invalid Date';
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear();
          const time = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
          return `${day}/${month}/${year} ${time}`;
        } catch (error) {
          return 'Invalid Date';
        }
      case 'rating':
        return '⭐'.repeat(value) + '☆'.repeat((field.options?.maxRating || 5) - value);
      case 'lat_long':
        if (typeof value === 'object' && value.lat && value.lng) {
          return `${value.lat}, ${value.lng}`;
        }
        return value;
      case 'multiple_choice':
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        return value;
      case 'factory':
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        return value;
      case 'file_upload':
      case 'image_upload':
        if (Array.isArray(value)) {
          return `${value.length} ไฟล์`;
        }
        return value;
      case 'slider':
        const unit = field.options?.unit || '';
        return `${value} ${unit}`;
      default:
        return value;
    }
  };

  const renderFieldValue = (field, value) => {
    const displayValue = isEditMode ? (editedData[field.id] || '') : value;
    const formattedValue = isEditMode ? displayValue : formatFieldValue(field, value);
    const isEmpty = !displayValue && displayValue !== 0;

    if (isEditMode) {
      return (
        <div
          key={field.id}
          className="space-y-2 p-3 bg-muted/10 rounded-lg border-2 border-dashed border-orange-300/50 hover:bg-muted/20 hover:border-orange-400/70 transition-all duration-200"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', field.id);
            e.dataTransfer.effectAllowed = 'move';
            setDraggedField(field);
          }}
          onDragEnter={(e) => {
            e.preventDefault();
          }}
          onDragOver={(e) => {
            e.preventDefault();
          }}
        >
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-foreground/80">
              {field.title}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            <div className="w-4 h-4 text-orange-500 cursor-move flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 6h2v2H8V6zm6 0h2v2h-2V6zM8 10h2v2H8v-2zm6 0h2v2h-2v-2zM8 14h2v2H8v-2zm6 0h2v2h-2v-2z"/>
              </svg>
            </div>
          </div>
          <input
            type="text"
            value={displayValue}
            onChange={(e) => {
              setEditedData(prev => ({
                ...prev,
                [field.id]: e.target.value
              }));
            }}
            className="w-full border border-border/50 rounded-lg px-3 py-2 text-sm backdrop-blur-sm bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            placeholder={field.title}
          />
        </div>
      );
    }

    return (
      <div key={field.id} className="space-y-2">
        <label className="block text-sm font-medium text-foreground/80">
          {field.title}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </label>
        <div className={`w-full border border-border/50 rounded-lg px-3 py-2 text-sm backdrop-blur-sm ${
          isEmpty
            ? 'bg-muted/40 text-muted-foreground/50'
            : 'bg-background/50 text-foreground'
        }`}>
          {formattedValue}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 flex items-center justify-center">
        <GlassCard className="glass-container">
          <GlassCardContent className="text-center py-8">
            <div className="text-xl font-semibold text-foreground/80">กำลังโหลดข้อมูล...</div>
          </GlassCardContent>
        </GlassCard>
      </div>
    );
  }

  if (!form || !subForm || !subSubmission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 flex items-center justify-center">
        <GlassCard className="glass-container">
          <GlassCardContent className="text-center py-8">
            <div className="text-xl font-semibold text-destructive">ไม่พบข้อมูลที่ระบุ</div>
            {onBack && (
              <GlassButton onClick={onBack} className="mt-4">
                กลับ
              </GlassButton>
            )}
          </GlassCardContent>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90">
      <div className="container-responsive px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-2 sm:py-3">

        {/* SubForm Title and Description with Edit Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto mb-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 text-left">
              <h1 className="text-xl font-bold text-primary mb-4 text-left" style={{ fontSize: '20px' }}>
                {subForm.title}
              </h1>
              {subForm.description && (
                <div className="mb-4">
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed text-left">
                    {subForm.description}
                  </p>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground text-left">
                <FontAwesomeIcon icon={faCalendarAlt} className="w-4 h-4" />
                บันทึกเมื่อ {new Date(subSubmission.submittedAt).toLocaleDateString('th-TH', {
                  year: 'numeric', month: 'long', day: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </div>
            </div>

            {/* Edit Controls */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {!isEditMode ? (
                <GlassButton
                  onClick={() => setIsEditMode(true)}
                  className="orange-neon-button"
                  size="sm"
                >
                  แก้ไข
                </GlassButton>
              ) : (
                <>
                  <GlassButton
                    onClick={() => {
                      setIsEditMode(false);
                      setEditedData(subSubmission.data || {});
                    }}
                    variant="outline"
                    size="sm"
                  >
                    ยกเลิก
                  </GlassButton>
                  <GlassButton
                    onClick={handleSave}
                    className="orange-neon-button"
                    size="sm"
                  >
                    บันทึก
                  </GlassButton>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* SubForm Data Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-3xl mx-auto mb-8"
        >
          <GlassCard className="glass-container">
            <div className="p-4">
              <div
                className="space-y-4 sm:space-y-6"
                onDragOver={(e) => {
                  if (!isEditMode) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  if (!isEditMode) return;
                  e.preventDefault();
                  const draggedFieldId = e.dataTransfer.getData('text/plain');

                  if (draggedFieldId && draggedField) {
                    const newOrder = [...fieldOrder];
                    const draggedIndex = newOrder.findIndex(f => f.id === draggedFieldId);
                    const targetIndex = newOrder.findIndex(f => f.id === draggedField.id);

                    if (draggedIndex !== -1 && targetIndex !== -1) {
                      const [draggedItem] = newOrder.splice(draggedIndex, 1);
                      newOrder.splice(targetIndex, 0, draggedItem);

                      setFieldOrder(newOrder);
                    }
                  }
                  setDraggedField(null);
                }}
              >
                {fieldOrder.map(field => {
                  const value = subSubmission.data[field.id];
                  return renderFieldValue(field, value);
                })}
              </div>

              {(!subForm.fields || subForm.fields.length === 0) && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4 opacity-50">📝</div>
                  <p className="text-muted-foreground">ฟอร์มย่อยนี้ไม่มีฟิลด์</p>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>

      </div>
    </div>
  );
}