import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription, GlassCardContent } from './ui/glass-card';
import { GlassButton } from './ui/glass-button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileAlt, faCalendarAlt, faUser, faPlus,
  faEye, faMapMarkerAlt, faStar, faDownload, faShare
} from '@fortawesome/free-solid-svg-icons';

// Data services
import dataService from '../services/DataService.js';
import submissionService from '../services/SubmissionService.js';

export default function SubmissionDetail({
  formId,
  submissionId,
  onEdit,
  onDelete,
  onBack,
  onAddSubForm,
  onViewSubFormDetail
}) {
  const [form, setForm] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [subSubmissions, setSubSubmissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [fieldOrder, setFieldOrder] = useState([]);
  const [draggedField, setDraggedField] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedData, setEditedData] = useState({});

  // Load submission and related data
  useEffect(() => {
    loadSubmissionData();
  }, [formId, submissionId]);

  const loadSubmissionData = async () => {
    setLoading(true);
    try {
      // Load form
      const formData = dataService.getForm(formId);
      if (!formData) {
        console.error('Form not found:', formId);
        return;
      }
      setForm(formData);

      // Load field order from localStorage or use default
      const savedOrder = localStorage.getItem(`fieldOrder_${formId}`);
      if (savedOrder) {
        const orderIds = JSON.parse(savedOrder);
        const orderedFields = orderIds.map(id => formData.fields?.find(f => f.id === id)).filter(Boolean);
        const newFields = formData.fields?.filter(f => !orderIds.includes(f.id)) || [];
        setFieldOrder([...orderedFields, ...newFields]);
      } else {
        setFieldOrder(formData.fields || []);
      }

      // Load submission
      const submissionData = dataService.getSubmission(submissionId);
      if (!submissionData) {
        console.error('Submission not found:', submissionId);
        return;
      }
      setSubmission(submissionData);
      setEditedData(submissionData.data || {});

      // Load sub form submissions for each sub form
      const subSubmissionsData = {};
      if (formData.subForms && formData.subForms.length > 0) {
        for (const subForm of formData.subForms) {
          const subSubs = dataService.getSubSubmissionsByParentId(submissionId)
            .filter(sub => sub.subFormId === subForm.id)
            .slice(0, 10); // Latest 10 entries
          subSubmissionsData[subForm.id] = subSubs;
        }
      }
      setSubSubmissions(subSubmissionsData);

    } catch (error) {
      console.error('Error loading submission data:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleAddSubForm = (subFormId) => {
    if (onAddSubForm) {
      onAddSubForm(formId, submissionId, subFormId);
    }
  };

  const handleViewSubFormDetail = (subFormId, subSubmissionId) => {
    if (onViewSubFormDetail) {
      onViewSubFormDetail(formId, submissionId, subFormId, subSubmissionId);
    }
  };

  const handleSave = async () => {
    try {
      // Update submission data
      const updatedSubmission = {
        ...submission,
        data: editedData,
        updatedAt: new Date().toISOString()
      };

      // Save to dataService
      dataService.updateSubmission(submissionId, updatedSubmission);

      // Save field order
      const orderIds = fieldOrder.map(f => f.id);
      localStorage.setItem(`fieldOrder_${formId}`, JSON.stringify(orderIds));

      // Update local state
      setSubmission(updatedSubmission);
      setIsEditMode(false);

      // Show success message (you can implement toast notification here)
      alert('บันทึกข้อมูลเรียบร้อยแล้ว');

    } catch (error) {
      console.error('Error saving data:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const formatFieldValue = (field, value) => {
    if (!value && value !== 0) return '-';

    // Handle error objects
    if (typeof value === 'object' && value.error) {
      return 'Error loading data';
    }

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

  const renderSubFormSubmissionList = (subForm) => {
    const subSubs = subSubmissions[subForm.id] || [];

    if (subSubs.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="text-4xl mb-4 opacity-50">📝</div>
          <p className="text-muted-foreground mb-4">ยังไม่มีข้อมูลใน{subForm.title}</p>
          <GlassButton
            onClick={() => handleAddSubForm(subForm.id)}
            className="orange-neon-button"
          >
            <FontAwesomeIcon icon={faPlus} className="w-4 h-4 mr-2" />
            เพิ่ม{subForm.title}
          </GlassButton>
        </div>
      );
    }

    // Get first few fields for table display (max 3-4)
    const displayFields = subForm.fields?.slice(0, 3) || [];
    const hasMoreFields = subForm.fields?.length > 3;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <GlassButton
            onClick={() => handleAddSubForm(subForm.id)}
            size="sm"
            className="orange-neon-button"
          >
            <FontAwesomeIcon icon={faPlus} className="w-3 h-3 mr-2" />
            เพิ่ม{subForm.title}
          </GlassButton>
        </div>

        {/* Table display similar to Submission List */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/30">
                <th className="p-2 text-[12px] font-medium text-foreground/70 text-center">#</th>
                {displayFields.map((field) => (
                  <th key={field.id} className="p-2 text-[12px] font-medium text-foreground/70 text-center">
                    {field.title}
                  </th>
                ))}
                {hasMoreFields && (
                  <th className="p-2 text-[12px] font-medium text-foreground/70 text-center">อื่นๆ</th>
                )}
                <th className="p-2 text-[12px] font-medium text-foreground/70 text-center">วันที่บันทึก</th>
              </tr>
            </thead>
            <tbody>
              {subSubs.map((subSub, index) => (
                <tr
                  key={subSub.id}
                  className="border-b border-border/20 hover:bg-gradient-to-r hover:from-orange-50/30 hover:to-orange-100/20 hover:shadow-lg hover:scale-[1.02] hover:z-10 transition-all duration-300 cursor-pointer group relative"
                  onClick={() => handleViewSubFormDetail(subForm.id, subSub.id)}
                >
                  <td className="p-2 text-[12px] text-center group-hover:text-orange-600 transition-colors duration-300">
                    {index + 1}
                  </td>
                  {displayFields.map((field) => {
                    const value = subSub.data[field.id];
                    const formattedValue = formatFieldValue(field, value);
                    return (
                      <td key={field.id} className="p-2 text-[12px] text-center group-hover:text-orange-600 transition-colors duration-300">
                        {formattedValue}
                      </td>
                    );
                  })}
                  {hasMoreFields && (
                    <td className="p-2 text-[12px] text-center group-hover:text-orange-600 transition-colors duration-300">
                      <span className="text-muted-foreground">...</span>
                    </td>
                  )}
                  <td className="p-2 text-[12px] text-center group-hover:text-orange-600 transition-colors duration-300">
                    {(() => {
                      try {
                        const date = new Date(subSub.submittedAt);
                        if (isNaN(date.getTime())) return 'Invalid Date';
                        const day = date.getDate().toString().padStart(2, '0');
                        const month = (date.getMonth() + 1).toString().padStart(2, '0');
                        const year = date.getFullYear();
                        return `${day}/${month}/${year}`;
                      } catch (error) {
                        return 'Invalid Date';
                      }
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {subSubs.length === 10 && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground">แสดง 10 รายการล่าสุด</p>
          </div>
        )}
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

  if (!form || !submission) {
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

        {/* Form Title and Description with Edit Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto mb-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 text-left">
              <h1 className="text-xl font-bold text-primary mb-4 text-left" style={{ fontSize: '20px' }}>
                {form.title}
              </h1>
              {form.description && (
                <div className="mb-4">
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed text-left">
                    {form.description}
                  </p>
                </div>
              )}
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
                      setEditedData(submission.data || {});
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

        {/* Main Form Data Container */}
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
                  const value = submission.data[field.id];
                  return renderFieldValue(field, value);
                })}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* SubForms Section */}
        {form.subForms && form.subForms.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-3xl mx-auto space-y-6"
          >
            {form.subForms.map((subForm) => (
              <GlassCard key={subForm.id} className="glass-container">
                <GlassCardHeader>
                  <GlassCardTitle>{subForm.title}</GlassCardTitle>
                  {subForm.description && (
                    <GlassCardDescription>{subForm.description}</GlassCardDescription>
                  )}
                </GlassCardHeader>
                <GlassCardContent>
                  {renderSubFormSubmissionList(subForm)}
                </GlassCardContent>
              </GlassCard>
            ))}
          </motion.div>
        )}

      </div>
    </div>
  );
}