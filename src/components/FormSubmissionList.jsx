import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from './ui/glass-card';
import { GlassButton } from './ui/glass-button';
import { GlassInput } from './ui/glass-input';
import SubmissionActionMenu, { useSubmissionActionMenu } from './ui/submission-action-menu';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { FileDisplayCompact } from './ui/file-display';
import { useEnhancedToast } from './ui/enhanced-toast';
import { PhoneIcon } from './ui/phone-icon';

// Data services
import dataService from '../services/DataService.js';
import submissionService from '../services/SubmissionService.js';
import apiClient from '../services/ApiClient.js';

// Utilities
import { formatNumberByContext } from '../utils/numberFormatter.js';
import { createPhoneLink, formatPhoneDisplay, shouldFormatAsPhone } from '../utils/phoneFormatter.js';

export default function FormSubmissionList({ formId, onNewSubmission, onViewSubmission, onEditSubmission, onBack }) {
  const [submissions, setSubmissions] = useState([]);
  const [form, setForm] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);

  // Action menu state
  const { isOpen, position, openMenu, closeMenu } = useSubmissionActionMenu();

  // Enhanced toast notifications
  const toast = useEnhancedToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load form from API first, fallback to LocalStorage
      let formData = null;
      try {
        const response = await apiClient.getForm(formId);
        formData = response.data?.form || response.data;
        console.log('✅ Form loaded from API:', formData?.title);
      } catch (apiError) {
        console.warn('Failed to load form from API, trying LocalStorage:', apiError);
        formData = dataService.getForm(formId);
      }

      if (!formData) {
        console.error('Form not found:', formId);
        toast.error('ไม่พบฟอร์มที่ต้องการ', {
          title: 'เกิดข้อผิดพลาด',
          duration: 5000
        });
        return;
      }
      setForm(formData);

      // Load submissions from API first, fallback to LocalStorage
      let submissionsData = [];
      try {
        const response = await apiClient.listSubmissions(formId);
        submissionsData = response.data?.submissions || response.data || [];
        console.log('✅ Submissions loaded from API:', submissionsData.length, 'items');
        console.log('📦 First submission structure:', submissionsData[0]);
        console.log('📦 First submission JSON:', JSON.stringify(submissionsData[0], null, 2));
      } catch (apiError) {
        console.warn('Failed to load submissions from API, trying LocalStorage:', apiError);
        submissionsData = dataService.getSubmissionsByFormId(formId);
      }

      setSubmissions(submissionsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล', {
        title: 'เกิดข้อผิดพลาด',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  }, [formId, toast]);

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
    // Show confirmation toast with action buttons
    const toastId = toast.error('การลบจะไม่สามารถย้อนกลับได้', {
      title: "คุณแน่ใจหรือไม่ที่จะลบข้อมูลนี้?",
      duration: 10000,
      action: {
        label: "ยืนยันการลบ",
        onClick: async () => {
          // Dismiss confirmation toast immediately
          toast.dismiss(toastId);

          try {
            dataService.deleteSubmission(submissionId);
            setSubmissions(prev => prev.filter(sub => sub.id !== submissionId));
            toast.success('ลบข้อมูลเรียบร้อยแล้ว', {
              title: "ลบสำเร็จ",
              duration: 3000
            });
          } catch (error) {
            console.error('Delete error:', error);
            toast.error('เกิดข้อผิดพลาดในการลบข้อมูล', {
              title: "ลบไม่สำเร็จ",
              duration: 5000
            });
          }
        }
      }
    });
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
                <span key={index} className="inline-block text-primary text-[12px]">
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
            <span className="inline-block text-primary text-[12px]">
              {value}
            </span>
          </div>
        );

      case 'province':
      case 'factory':
        return (
          <div className="text-center">
            <span className="inline-block text-primary text-[12px]">
              {value}
            </span>
          </div>
        );

      case 'file_upload':
      case 'image_upload':
        // Use FileDisplayCompact for better file display in table
        const fileValue = fieldData.rawValue || value;
        return (
          <div className="flex items-center justify-center">
            <FileDisplayCompact value={fileValue} maxDisplay={1} />
          </div>
        );

      case 'number':
        return (
          <span className="text-[12px] text-foreground/80 font-mono text-center block">
            {formatNumberByContext(value, 'table')}
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
        // Check if this should be treated as a phone field based on comprehensive detection
        const isPhoneFieldFormSubmission = type === 'phone' ||
                                          shouldFormatAsPhone(value, type) ||
                                          field?.title?.toLowerCase().includes('เบอร์') ||
                                          field?.title?.toLowerCase().includes('โทร') ||
                                          field?.title?.toLowerCase().includes('phone') ||
                                          field?.title?.toLowerCase().includes('tel') ||
                                          field?.title?.toLowerCase().includes('mobile') ||
                                          field?.title?.toLowerCase().includes('contact');

        if (isPhoneFieldFormSubmission) {
          const phoneProps = createPhoneLink(value, {
            includeIcon: true,
            size: 'xs',
            showTooltip: true,
            className: 'text-[12px]'
          });

          return (
            <div className="text-center">
              {phoneProps.isClickable ? (
                <div className="flex items-center justify-center gap-1">
                  <PhoneIcon />
                  <a
                    href={phoneProps.telLink}
                    className={phoneProps.className}
                    title={phoneProps.title}
                    aria-label={phoneProps.ariaLabel}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {phoneProps.display}
                  </a>
                </div>
              ) : (
                <span className="text-[12px] text-foreground/80">
                  {formatPhoneDisplay(value) || value || '-'}
                </span>
              )}
            </div>
          );
        }

        // Fallback for standard phone display
        return (
          <div className="text-center">
            <span className="text-[12px] text-foreground/80">
              {formatPhoneDisplay(value) || value || '-'}
            </span>
          </div>
        );

      case 'url':
        // Check if this should be treated as a URL field based on comprehensive detection
        const isUrlFieldFormSubmission = type === 'url' ||
                                        field?.title?.toLowerCase().includes('url') ||
                                        field?.title?.toLowerCase().includes('link') ||
                                        field?.title?.toLowerCase().includes('เว็บ') ||
                                        field?.title?.toLowerCase().includes('website') ||
                                        field?.title?.toLowerCase().includes('web') ||
                                        field?.title?.toLowerCase().includes('site') ||
                                        (value && typeof value === 'string' &&
                                         (/^https?:\/\//i.test(value.trim()) ||
                                          /^www\./i.test(value.trim()) ||
                                          /\.(com|net|org|co|th|io|edu|gov|mil|int|biz|info|pro|name|museum|coop|aero|asia|cat|jobs|mobi|tel|travel|xxx|ac|ad|ae|af|ag|ai|al|am|an|ao|aq|ar|as|at|au|aw|ax|az|ba|bb|bd|be|bf|bg|bh|bi|bj|bm|bn|bo|br|bs|bt|bv|bw|by|bz|ca|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|co|cr|cs|cu|cv|cx|cy|cz|de|dj|dk|dm|do|dz|ec|ee|eg|eh|er|es|et|eu|fi|fj|fk|fm|fo|fr|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gp|gq|gr|gs|gt|gu|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|in|io|iq|ir|is|it|je|jm|jo|jp|ke|kg|kh|ki|km|kn|kp|kr|kw|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|me|mg|mh|mk|ml|mm|mn|mo|mp|mq|mr|ms|mt|mu|mv|mw|mx|my|mz|na|nc|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|pa|pe|pf|pg|ph|pk|pl|pm|pn|pr|ps|pt|pw|py|qa|re|ro|rs|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sj|sk|sl|sm|sn|so|sr|st|su|sv|sy|sz|tc|td|tf|tg|th|tj|tk|tl|tm|tn|to|tp|tr|tt|tv|tw|tz|ua|ug|uk|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|ye|yt|za|zm|zw)$/.test(value.trim())));

        if (isUrlFieldFormSubmission && value) {
          // Format URL for linking
          const formatUrlForLinking = (url) => {
            if (!url || typeof url !== 'string') return null;
            const trimmedUrl = url.trim();
            if (!trimmedUrl) return null;

            const urlPattern = /^(https?:\/\/|ftp:\/\/)/i;
            let formattedUrl = trimmedUrl;

            if (!urlPattern.test(trimmedUrl)) {
              formattedUrl = `https://${trimmedUrl}`;
            }

            try {
              new URL(formattedUrl);
              return formattedUrl;
            } catch {
              return null;
            }
          };

          const validUrl = formatUrlForLinking(value);
          const displayText = value.length > 30 ? `${value.substring(0, 30)}...` : value;

          return (
            <div className="text-center">
              {validUrl ? (
                <a
                  href={validUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {displayText}
                </a>
              ) : (
                <span className="text-[12px] text-foreground/80">{displayText}</span>
              )}
            </div>
          );
        }

        // Fallback for standard URL display
        return (
          <div className="text-center">
            <span className="text-[12px] text-foreground/80">
              {value?.length > 30 ? `${value.substring(0, 30)}...` : value}
            </span>
          </div>
        );

      case 'slider':
        const sliderValue = parseFloat(value) || 0;
        const unit = field.options?.unit || '';
        return (
          <div className="flex items-center gap-2 justify-center">
            <div className="flex-1 bg-muted/30 h-1 max-w-16">
              <div
                className="bg-primary h-1"
                style={{ width: `${(sliderValue / (field.options?.max || 100)) * 100}%` }}
              />
            </div>
            <span className="text-[12px] text-foreground/80 font-mono">{sliderValue}{unit}</span>
          </div>
        );

      case 'auto_date':
        // Auto date column - show submission date (simplified structure)
        if (!value || value === '' || value === 'undefined' || value === 'null') {
          return <span className="text-muted-foreground text-[12px]">-</span>;
        }
        const formattedDate = formatDate(value);
        return (
          <span className="text-[12px] text-foreground/80 font-medium" style={{
            background: 'transparent !important',
            backgroundColor: 'transparent !important',
            border: 'none !important',
            borderRadius: '0 !important',
            boxShadow: 'none !important',
            outline: 'none !important'
          }}>
            {formattedDate === '-' ? '-' : formattedDate}
          </span>
        );

      case 'auto_time':
        // Auto time column - show submission time (simplified structure)
        if (!value || value === '' || value === 'undefined' || value === 'null') {
          return <span className="text-muted-foreground text-[12px]">-</span>;
        }
        const timeDate = new Date(value);
        if (isNaN(timeDate.getTime())) {
          return <span className="text-muted-foreground text-[12px]">-</span>;
        }
        return (
          <span className="text-[12px] text-foreground/80 font-mono" style={{
            background: 'transparent !important',
            backgroundColor: 'transparent !important',
            border: 'none !important',
            borderRadius: '0 !important',
            boxShadow: 'none !important',
            outline: 'none !important'
          }}>
            {timeDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
          </span>
        );

      default:
        // Check if this should be treated as phone or URL field even if not explicitly typed
        const isPhoneFromTitle = field?.title?.toLowerCase().includes('เบอร์') ||
                                field?.title?.toLowerCase().includes('โทร') ||
                                field?.title?.toLowerCase().includes('phone') ||
                                field?.title?.toLowerCase().includes('tel') ||
                                field?.title?.toLowerCase().includes('mobile') ||
                                field?.title?.toLowerCase().includes('contact');

        const isUrlFromTitle = field?.title?.toLowerCase().includes('url') ||
                              field?.title?.toLowerCase().includes('link') ||
                              field?.title?.toLowerCase().includes('เว็บ') ||
                              field?.title?.toLowerCase().includes('website') ||
                              field?.title?.toLowerCase().includes('web') ||
                              field?.title?.toLowerCase().includes('site');

        const isEmailFromTitle = field?.title?.toLowerCase().includes('email') ||
                                field?.title?.toLowerCase().includes('อีเมล') ||
                                field?.title?.toLowerCase().includes('e-mail');

        const isPhoneFromValue = value && typeof value === 'string' &&
                               (/^\d{3}-\d{3}-\d{4}$/.test(value.trim()) ||
                                /^\d{10}$/.test(value.replace(/\D/g, '')));

        const isUrlFromValue = value && typeof value === 'string' &&
                             (/^https?:\/\//i.test(value.trim()) ||
                              /^www\./i.test(value.trim()) ||
                              /\.(com|net|org|co|th|io|edu|gov|mil|int|biz|info|pro|name|museum|coop|aero|asia|cat|jobs|mobi|tel|travel|xxx)$/.test(value.trim()));

        const isEmailFromValue = value && typeof value === 'string' &&
                                /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

        // Handle phone field
        if (isPhoneFromTitle || isPhoneFromValue) {
          const phoneProps = createPhoneLink(value, {
            includeIcon: true,
            size: 'xs',
            showTooltip: true,
            className: 'text-[12px]'
          });

          return (
            <div className="text-center">
              {phoneProps.isClickable ? (
                <div className="flex items-center justify-center gap-1">
                  <PhoneIcon />
                  <a
                    href={phoneProps.telLink}
                    className={phoneProps.className}
                    title={phoneProps.title}
                    aria-label={phoneProps.ariaLabel}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {phoneProps.display}
                  </a>
                </div>
              ) : (
                <span className="text-[12px] text-foreground/80">
                  {formatPhoneDisplay(value) || value || '-'}
                </span>
              )}
            </div>
          );
        }

        // Handle URL field
        if (isUrlFromTitle || isUrlFromValue) {
          const formatUrlForLinking = (url) => {
            if (!url || typeof url !== 'string') return null;
            const trimmedUrl = url.trim();
            if (!trimmedUrl) return null;

            const urlPattern = /^(https?:\/\/|ftp:\/\/)/i;
            let formattedUrl = trimmedUrl;

            if (!urlPattern.test(trimmedUrl)) {
              formattedUrl = `https://${trimmedUrl}`;
            }

            try {
              new URL(formattedUrl);
              return formattedUrl;
            } catch {
              return null;
            }
          };

          const validUrl = formatUrlForLinking(value);
          const displayText = value && value.length > 30 ? `${value.substring(0, 30)}...` : value;

          return (
            <div className="text-center">
              {validUrl ? (
                <a
                  href={validUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {displayText}
                </a>
              ) : (
                <span className="text-[12px] text-foreground/80">{displayText}</span>
              )}
            </div>
          );
        }

        // Handle email field
        if (isEmailFromTitle || isEmailFromValue) {
          return (
            <div className="text-center">
              <a
                href={`mailto:${value}`}
                className="text-[12px] text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {value}
              </a>
            </div>
          );
        }

        // For other text fields
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
            <GlassCard className="glass-container">
              <style>{`
                .submission-table-override tbody tr {
                  background: transparent !important;
                }
                /* Disable all transitions and animations globally in table */
                .submission-table-override,
                .submission-table-override *,
                .submission-table-override *::before,
                .submission-table-override *::after {
                  transition: none !important;
                  animation: none !important;
                  transform: none !important;
                }
                .submission-table-override tbody tr:hover {
                  background: rgb(229 231 235) !important;
                  border-radius: 0 !important;
                }
                .submission-table-override tbody tr:hover td,
                .submission-table-override tbody tr:hover td *,
                .submission-table-override tbody tr:hover td div,
                .submission-table-override tbody tr:hover td span,
                .submission-table-override tbody tr:hover td a,
                .submission-table-override tbody tr:hover td div *,
                .submission-table-override tbody tr:hover td span *,
                .submission-table-override tbody tr:hover td a * {
                  background: transparent !important;
                  background-color: transparent !important;
                  border: none !important;
                  border-radius: 0 !important;
                  box-shadow: none !important;
                  outline: none !important;
                }
                .dark .submission-table-override tbody tr:hover {
                  background: rgb(55 65 81) !important;
                }
                .submission-table-override tbody td *,
                .submission-table-override tbody td div,
                .submission-table-override tbody td span,
                .submission-table-override tbody td a {
                  background: transparent !important;
                  background-color: transparent !important;
                  border: none !important;
                  border-radius: 0 !important;
                  box-shadow: none !important;
                  outline: none !important;
                  transition: none !important;
                  animation: none !important;
                }
                /* Specific override for ALL date field containers including auto_date */
                .submission-table-override tbody td div.text-center,
                .submission-table-override tbody td div.text-\\[12px\\],
                .submission-table-override tbody td div.font-medium,
                .submission-table-override tbody td div.text-foreground\\/80 {
                  background: transparent !important;
                  background-color: transparent !important;
                  border: none !important;
                  border-radius: 0 !important;
                  box-shadow: none !important;
                  outline: none !important;
                  transition: none !important;
                  animation: none !important;
                }
                /* Nuclear option: Override ALL divs in table cells */
                .submission-table-override tbody td div {
                  background: transparent !important;
                  background-color: transparent !important;
                  border: none !important;
                  border-radius: 0 !important;
                  box-shadow: none !important;
                  outline: none !important;
                  transition: none !important;
                  animation: none !important;
                  transform: none !important;
                  filter: none !important;
                  backdrop-filter: none !important;
                }
                /* Override any glass effects or backdrop filters */
                .submission-table-override tbody td *::before,
                .submission-table-override tbody td *::after {
                  display: none !important;
                  content: none !important;
                  background: transparent !important;
                  backdrop-filter: none !important;
                  filter: none !important;
                }
                /* Force remove any hover states on individual elements */
                .submission-table-override tbody td:hover *,
                .submission-table-override tbody td *:hover,
                .submission-table-override tbody td:hover div,
                .submission-table-override tbody td div:hover {
                  background: transparent !important;
                  background-color: transparent !important;
                  border: none !important;
                  border-radius: 0 !important;
                  box-shadow: none !important;
                  outline: none !important;
                  transform: none !important;
                  filter: none !important;
                  backdrop-filter: none !important;
                }
                /* Specific override for auto date fields on hover */
                .submission-table-override tbody td:hover div.text-center,
                .submission-table-override tbody td:hover div.font-medium,
                .submission-table-override tbody td:hover div.text-\\[12px\\],
                .submission-table-override tbody td:hover div.text-foreground\\/80 {
                  background: transparent !important;
                  background-color: transparent !important;
                  border: none !important;
                  border-radius: 0 !important;
                  box-shadow: none !important;
                  outline: none !important;
                  transform: none !important;
                  filter: none !important;
                  backdrop-filter: none !important;
                }
              `}</style>
              <div className="overflow-x-auto">
                <table data-testid="submission-list" className="w-full submission-table-override">
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
                          data-testid="submission-row"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className={`border-b border-border/20 transition-all duration-300 cursor-pointer group relative ${
                            selectedSubmissionId === submission.id && isOpen
                              ? 'bg-muted/30'
                              : ''
                          }`}
                          onClick={() => onViewSubmission && onViewSubmission(submission.id)}
                          onMouseEnter={(e) => {
                            // Force clean styling with JavaScript
                            const row = e.currentTarget;
                            const allElements = row.querySelectorAll('*');

                            allElements.forEach(element => {
                              // Remove all computed styles
                              element.style.cssText = '';
                              // Force specific overrides
                              element.style.setProperty('background', 'transparent', 'important');
                              element.style.setProperty('background-color', 'transparent', 'important');
                              element.style.setProperty('border', 'none', 'important');
                              element.style.setProperty('border-radius', '0', 'important');
                              element.style.setProperty('box-shadow', 'none', 'important');
                              element.style.setProperty('outline', 'none', 'important');
                              element.style.setProperty('transform', 'none', 'important');
                              element.style.setProperty('filter', 'none', 'important');
                              element.style.setProperty('backdrop-filter', 'none', 'important');
                              element.style.setProperty('transition', 'none', 'important');
                              element.style.setProperty('animation', 'none', 'important');
                            });

                            // Set row background to darker gray for better readability
                            const isDarkMode = document.documentElement.classList.contains('dark');
                            const hoverColor = isDarkMode ? 'rgb(55, 65, 81)' : 'rgb(229, 231, 235)';
                            row.style.setProperty('background-color', hoverColor, 'important');
                          }}
                          onMouseLeave={(e) => {
                            const row = e.currentTarget;
                            row.style.removeProperty('background-color');
                          }}
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
                                className={`p-3 text-[12px] text-center transition-colors duration-300 [&_*]:!bg-transparent [&_*]:!border-none [&_*]:!rounded-none [&_*]:!shadow-none`}
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