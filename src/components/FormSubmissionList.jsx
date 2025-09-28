import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from './ui/glass-card';
import { GlassButton } from './ui/glass-button';
import { GlassInput } from './ui/glass-input';
import SubmissionActionMenu, { useSubmissionActionMenu } from './ui/submission-action-menu';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';

// Data services
import dataService from '../services/DataService.js';
import submissionService from '../services/SubmissionService.js';

export default function FormSubmissionList({ formId, onNewSubmission, onViewSubmission, onEditSubmission, onBack }) {
  const [submissions, setSubmissions] = useState([]);
  const [form, setForm] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);

  // Action menu state
  const { isOpen, position, openMenu, closeMenu } = useSubmissionActionMenu();

  const loadData = useCallback(() => {
    setLoading(true);
    try {
      // Load form details
      const formData = dataService.getForm(formId);
      if (!formData) {
        console.error('Form not found:', formId);
        return;
      }
      setForm(formData);

      // Load submissions
      const submissionsData = dataService.getSubmissionsByFormId(formId);
      setSubmissions(submissionsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [formId]);

  // Load form and submissions data
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get table display fields (max 5 fields that are marked to show in table)
  // If less than 5 fields are selected, automatically add date and time columns to fill up to 5 total
  const getTableFields = () => {
    if (!form) return [];

    const selectedFields = form.fields.filter(field => field.showInTable).slice(0, 5);

    // If we have less than 5 fields, add automatic columns to fill up to 5 total
    if (selectedFields.length < 5) {
      const autoColumns = [];
      const availableSlots = 5 - selectedFields.length;

      // Add auto columns based on available slots
      if (availableSlots >= 1) {
        // Add date column first
        autoColumns.push({
          id: '_auto_date',
          title: 'วันที่บันทึกข้อมูล',
          type: 'auto_date',
          isAutoColumn: true
        });
      }

      if (availableSlots >= 2) {
        // Add time column second
        autoColumns.push({
          id: '_auto_time',
          title: 'เวลาบันทึก',
          type: 'auto_time',
          isAutoColumn: true
        });
      }

      // Return auto columns first, then selected fields (total = 5 or less)
      return [...autoColumns, ...selectedFields];
    }

    return selectedFields;
  };

  // Format submission data for display
  const formatSubmissionForDisplay = (submission) => {
    if (!form) return submission;
    return submissionService.formatSubmissionForDisplay(submission, form);
  };

  // Filter submissions based on search term
  const filteredSubmissions = submissions.filter(submission => {
    if (!searchTerm) return true;

    const formattedSubmission = formatSubmissionForDisplay(submission);
    const searchString = [
      formattedSubmission.documentNumber,
      ...Object.values(formattedSubmission.fields).map(field => field.value)
    ].join(' ').toLowerCase();

    return searchString.includes(searchTerm.toLowerCase());
  });

  const handleViewSubmission = (submissionId) => {
    if (onViewSubmission) {
      onViewSubmission(submissionId);
    }
  };

  const handleDeleteSubmission = async (submissionId) => {
    const confirmed = window.confirm('⚠️ คุณแน่ใจหรือไม่ที่จะลบข้อมูลนี้?\n\nการลบจะไม่สามารถย้อนกลับได้');
    if (confirmed) {
      try {
        dataService.deleteSubmission(submissionId);
        setSubmissions(prev => prev.filter(sub => sub.id !== submissionId));
        alert('✅ ลบข้อมูลเรียบร้อยแล้ว');
      } catch (error) {
        console.error('Delete error:', error);
        alert('❌ เกิดข้อผิดพลาดในการลบข้อมูล');
      }
    }
  };

  // Menu action handlers
  const handleMenuOpen = (event, submissionId) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedSubmissionId(submissionId);
    openMenu(event);
  };

  const handleMenuView = () => {
    if (selectedSubmissionId && onViewSubmission) {
      onViewSubmission(selectedSubmissionId);
    }
  };

  const handleMenuEdit = () => {
    if (selectedSubmissionId && onEditSubmission) {
      onEditSubmission(selectedSubmissionId);
    }
  };

  const handleMenuDelete = () => {
    if (selectedSubmissionId) {
      handleDeleteSubmission(selectedSubmissionId);
    }
  };

  // Enhanced date formatting utility
  const formatDate = (dateValue, format = 'dd/mm/yyyy') => {
    try {
      // Handle null, undefined, empty strings
      if (!dateValue || dateValue === '' || dateValue === 'undefined' || dateValue === 'null') {
        return '-';
      }

      let date;

      // Handle different date input formats
      if (typeof dateValue === 'string') {
        // Skip if it's just empty space or invalid string
        if (dateValue.trim() === '') {
          return '-';
        }
        // Handle ISO string or other string formats
        date = new Date(dateValue);
      } else if (dateValue instanceof Date) {
        date = dateValue;
      } else {
        return '-';
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return '-';
      }

      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();

      // Default to Christian Era (CE) format: dd/mm/yyyy
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('Date formatting error:', error);
      return '-';
    }
  };

  // Enhanced field value renderer for different field types
  const renderFieldValue = (fieldData, field) => {
    if (!fieldData || (!fieldData.value && fieldData.value !== 0)) {
      return <span className="text-muted-foreground text-[12px]">-</span>;
    }

    const { value, type } = fieldData;

    switch (type) {
      case 'date':
        if (!value || value === '' || value === 'undefined' || value === 'null' || value === '-' || value === 'Invalid Date') {
          return <span className="text-muted-foreground text-[12px]">-</span>;
        }
        return (
          <div className="text-[12px] text-foreground/80 text-center">
            <div className="font-medium">{value === 'Invalid Date' ? '-' : value}</div>
          </div>
        );

      case 'time':
        return (
          <div className="text-[12px] text-foreground/80 font-mono text-center">
            {value}
          </div>
        );

      case 'datetime':
        if (!value || value === '' || value === 'undefined' || value === 'null' || value === '-' || value === 'Invalid Date') {
          return <span className="text-muted-foreground text-[12px]">-</span>;
        }
        // If value is already formatted (contains time), use it directly
        if (typeof value === 'string' && value.includes(' ') && value !== 'Invalid Date') {
          const parts = value.split(' ');
          return (
            <div className="text-[12px] text-foreground/80 text-center">
              <div className="font-medium">{parts[0]}</div>
              <div className="text-muted-foreground">{parts[1]}</div>
            </div>
          );
        }
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return <span className="text-muted-foreground text-[12px]">-</span>;
        }
        return (
          <div className="text-[12px] text-foreground/80 text-center">
            <div className="font-medium">{formatDate(value)}</div>
            <div className="text-muted-foreground">{date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        );

      case 'rating':
        const rating = parseInt(value) || 0;
        return (
          <div className="flex items-center justify-center">
            <span className="text-[12px]">{'⭐'.repeat(rating)}</span>
          </div>
        );

      case 'lat_long':
        if (typeof value === 'object' && value.lat && value.lng) {
          return (
            <div className="text-[12px] text-foreground/80 font-mono text-center">
              <div>Lat: {parseFloat(value.lat).toFixed(4)}</div>
              <div>Lng: {parseFloat(value.lng).toFixed(4)}</div>
            </div>
          );
        }
        return <span className="text-[12px] text-foreground/80 text-center">{value}</span>;

      case 'multiple_choice':
        if (Array.isArray(value)) {
          return (
            <div className="flex flex-wrap gap-1 justify-center">
              {value.slice(0, 2).map((item, index) => (
                <span key={index} className="inline-block px-2 py-1 bg-primary/10 text-primary text-[12px] rounded">
                  {item}
                </span>
              ))}
              {value.length > 2 && (
                <span className="text-[12px] text-muted-foreground">+{value.length - 2}</span>
              )}
            </div>
          );
        }
        return (
          <div className="text-center">
            <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-[12px] rounded">
              {value}
            </span>
          </div>
        );

      case 'province':
      case 'factory':
        return (
          <div className="text-center">
            <span className="inline-block px-2 py-1 bg-accent/10 text-accent text-[12px] rounded">
              {value}
            </span>
          </div>
        );

      case 'file_upload':
      case 'image_upload':
        // Check for files - check rawValue first, then formatted value
        let hasFiles = false;
        const checkValue = fieldData.rawValue || value;

        if (Array.isArray(checkValue)) {
          hasFiles = checkValue.length > 0;
        } else if (typeof checkValue === 'object' && checkValue !== null) {
          hasFiles = !!(checkValue.fileName || checkValue.name || checkValue.file);
        } else if (typeof checkValue === 'string') {
          hasFiles = checkValue !== '' && checkValue !== '-' && checkValue !== 'ไฟล์ที่แนบ';
        } else if (checkValue) {
          hasFiles = true;
        }

        return (
          <div className="flex items-center justify-center">
            {hasFiles ? (
              <span className="text-green-500 font-semibold text-[12px]">✓</span>
            ) : (
              <span className="text-muted-foreground font-semibold text-[12px]">✗</span>
            )}
          </div>
        );

      case 'number':
        return (
          <span className="text-[12px] text-foreground/80 font-mono text-center block">
            {parseFloat(value).toLocaleString('th-TH')}
          </span>
        );

      case 'email':
        return (
          <div className="text-center">
            <a href={`mailto:${value}`} className="text-[12px] text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
              {value}
            </a>
          </div>
        );

      case 'phone':
        // Format phone number for display
        const formatPhoneDisplay = (phoneValue) => {
          if (!phoneValue) return phoneValue;
          const digits = phoneValue.toString().replace(/\D/g, '');
          if (digits.length === 10) {
            return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
          }
          return phoneValue;
        };

        const formattedPhone = formatPhoneDisplay(value);
        return (
          <div className="text-center">
            <a href={`tel:${value}`} className="text-[12px] text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
              {formattedPhone}
            </a>
          </div>
        );

      case 'url':
        return (
          <div className="text-center">
            <a href={value} target="_blank" rel="noopener noreferrer" className="text-[12px] text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
              {value.length > 30 ? `${value.substring(0, 30)}...` : value}
            </a>
          </div>
        );

      case 'slider':
        const sliderValue = parseFloat(value) || 0;
        const unit = field.options?.unit || '';
        return (
          <div className="flex items-center gap-2 justify-center">
            <div className="flex-1 bg-muted/30 rounded-full h-1 max-w-16">
              <div
                className="bg-primary h-1 rounded-full"
                style={{ width: `${(sliderValue / (field.options?.max || 100)) * 100}%` }}
              />
            </div>
            <span className="text-[12px] text-foreground/80 font-mono">{sliderValue}{unit}</span>
          </div>
        );

      case 'auto_date':
        // Auto date column - show submission date
        if (!value || value === '' || value === 'undefined' || value === 'null') {
          return <span className="text-muted-foreground text-[12px]">-</span>;
        }
        const formattedDate = formatDate(value);
        return (
          <div className="text-[12px] text-foreground/80 text-center">
            <div className="font-medium">{formattedDate === '-' ? '-' : formattedDate}</div>
          </div>
        );

      case 'auto_time':
        // Auto time column - show submission time
        if (!value || value === '' || value === 'undefined' || value === 'null') {
          return <span className="text-muted-foreground text-[12px]">-</span>;
        }
        const timeDate = new Date(value);
        if (isNaN(timeDate.getTime())) {
          return <span className="text-muted-foreground text-[12px]">-</span>;
        }
        return (
          <div className="text-[12px] text-foreground/80 text-center font-mono">
            {timeDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
          </div>
        );

      default:
        // For text fields and others
        const text = String(value);
        return (
          <div className="text-[12px] text-foreground/80 max-w-[180px] text-center">
            <span className={text.length > 50 ? "truncate block" : ""} title={text.length > 50 ? text : undefined}>
              {text}
            </span>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-foreground/80">กำลังโหลดข้อมูล...</div>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-destructive">ไม่พบฟอร์มที่ระบุ</div>
          {onBack && (
            <GlassButton onClick={onBack} className="mt-4">
              กลับ
            </GlassButton>
          )}
        </div>
      </div>
    );
  }

  const tableFields = getTableFields();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90">
      <div className="container-responsive px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6 sm:py-8 lg:py-12">

        {/* Form Title and Description with Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          {/* Desktop Layout: Title and Search in same row */}
          <div className="hidden lg:flex items-start justify-between gap-8 mb-6">
            {/* Left side: Form Title */}
            <div className="flex-1">
              <h1 className="text-xl font-bold text-primary mb-4 text-left" style={{ fontSize: '20px' }}>
                {form.title}
              </h1>
            </div>

            {/* Right side: Search Box */}
            <div className="relative w-80 flex-shrink-0">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/60">
                <FontAwesomeIcon icon={faSearch} className="w-4 h-4" />
              </div>
              <GlassInput
                type="text"
                placeholder="ค้นหาข้อมูล..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Mobile Layout: Title and Search stacked */}
          <div className="lg:hidden mb-6">
            <h1 className="text-xl font-bold text-primary mb-4 text-left" style={{ fontSize: '20px' }}>
              {form.title}
            </h1>
            <div className="relative max-w-md">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/60">
                <FontAwesomeIcon icon={faSearch} className="w-4 h-4" />
              </div>
              <GlassInput
                type="text"
                placeholder="ค้นหาข้อมูล..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Form Description (all layouts) */}
          {form.description && (
            <div className="mb-4">
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed text-left">
                {form.description}
              </p>
            </div>
          )}
        </motion.div>

        {/* Enhanced Submissions Table - Only Selected Fields */}
        {filteredSubmissions.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <GlassCard className="glass-container overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/30 bg-muted/20">
                      {tableFields.map(field => (
                        <th key={field.id} className="text-center p-3 text-[12px] font-medium text-foreground/80 uppercase tracking-wide bg-gradient-to-r from-muted/30 to-muted/20">
                          {field.title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.map((submission, index) => {
                      const formattedSubmission = formatSubmissionForDisplay(submission);

                      return (
                        <motion.tr
                          key={submission.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className={`border-b border-border/20 hover:bg-gradient-to-r hover:from-orange-50/30 hover:to-orange-100/20 hover:shadow-lg hover:scale-[1.02] hover:z-10 transition-all duration-300 cursor-pointer group relative ${
                            selectedSubmissionId === submission.id && isOpen
                              ? 'bg-gradient-to-r from-orange-50/30 to-orange-100/20 shadow-lg scale-[1.02] z-10'
                              : ''
                          }`}
                          onClick={(e) => handleMenuOpen(e, submission.id)}
                        >
                          {tableFields.map((field, fieldIndex) => {
                            let fieldData;

                            // Handle auto columns differently
                            if (field.isAutoColumn) {
                              if (field.type === 'auto_date' || field.type === 'auto_time') {
                                fieldData = {
                                  value: submission.submittedAt,
                                  type: field.type
                                };
                              }
                            } else {
                              fieldData = formattedSubmission.fields[field.id];
                            }

                            const isFirst = fieldIndex === 0;
                            const isLast = fieldIndex === tableFields.length - 1;
                            return (
                              <td
                                key={field.id}
                                className={`p-2 text-[12px] text-center group-hover:text-orange-600 transition-colors duration-300 ${
                                  selectedSubmissionId === submission.id && isOpen
                                    ? 'text-orange-600'
                                    : ''
                                }`}
                              >
                                {renderFieldValue(fieldData, field)}
                              </td>
                            );
                          })}
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </motion.div>
        ) : (
          <div className="text-center py-12 sm:py-16">
            <GlassCard className="glass-container max-w-md mx-auto">
              <div className="p-8 sm:p-12">
                <div className="text-6xl mb-4 opacity-30">📄</div>
                <h3 className="text-lg font-semibold text-foreground/80 mb-2">
                  {searchTerm ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีข้อมูล'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {searchTerm ? 'ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง' : 'ใช้ปุ่ม + ในเมนูด้านบนเพื่อเพิ่มข้อมูลแรก'}
                </p>
                {searchTerm && (
                  <GlassButton onClick={() => setSearchTerm('')} variant="secondary">
                    ล้างการค้นหา
                  </GlassButton>
                )}
              </div>
            </GlassCard>
          </div>
        )}

        {/* Action Menu */}
        <SubmissionActionMenu
          isOpen={isOpen}
          onClose={closeMenu}
          position={position}
          onView={handleMenuView}
          onEdit={handleMenuEdit}
          onDelete={handleMenuDelete}
        />
      </div>
    </div>
  );
}