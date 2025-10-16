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

    // Show loading toast if taking longer than 1 second
    let loadingToastId = null;
    const loadingTimer = setTimeout(() => {
      loadingToastId = toast.info('กำลังโหลดข้อมูล...', {
        title: 'โปรดรอสักครู่',
        duration: Infinity // Keep showing until we dismiss it
      });
    }, 1000);

    try {
      // Load form from API first, fallback to LocalStorage
      let formData = null;
      try {
        const response = await apiClient.getForm(formId);
        formData = response.data?.form || response.data;
        console.log('✅ Form loaded from API:', formData?.title);
      } catch (apiError) {
        console.error('Failed to load form from API:', apiError);
        clearTimeout(loadingTimer);
        if (loadingToastId) toast.dismiss(loadingToastId);
        toast.error('ไม่สามารถโหลดข้อมูลฟอร์มจาก API ได้', {
          title: 'เกิดข้อผิดพลาด',
          duration: 5000
        });
        setLoading(false);
        return;
      }

      if (!formData) {
        console.error('Form not found:', formId);
        clearTimeout(loadingTimer);
        if (loadingToastId) toast.dismiss(loadingToastId);
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
        if (submissionsData.length > 0) {
          console.log('📦 First submission structure:', submissionsData[0]);
          console.log('📦 First submission JSON:', JSON.stringify(submissionsData[0], null, 2));
        }
      } catch (apiError) {
        console.error('Failed to load submissions from API:', apiError);
        clearTimeout(loadingTimer);
        if (loadingToastId) toast.dismiss(loadingToastId);
        toast.error('ไม่สามารถโหลดรายการข้อมูลจาก API ได้', {
          title: 'เกิดข้อผิดพลาด',
          duration: 5000
        });
        submissionsData = []; // Empty array on error
      }

      setSubmissions(submissionsData);

      // Clear loading toast on success
      clearTimeout(loadingTimer);
      if (loadingToastId) {
        toast.dismiss(loadingToastId);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      clearTimeout(loadingTimer);
      if (loadingToastId) toast.dismiss(loadingToastId);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล', {
        title: 'เกิดข้อผิดพลาด',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  }, [formId]); // ✅ FIX v0.7.11: Remove toast from dependencies - it's a stable context reference

  // Load form and submissions data
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get table display fields (max 5 fields that are marked to show in table)
  // If less than 5 fields are selected, automatically add date and time columns to fill up to 5 total
  const getTableFields = () => {
    if (!form) return [];

    // ✅ FIX: Only show main form fields, exclude sub-form fields
    // Support both camelCase and snake_case for compatibility
    const selectedFields = form.fields
      .filter(field => (field.showInTable === true || field.show_in_table === true) && !field.subFormId) // Exclude sub-form fields
      .slice(0, 5);

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
            // Delete via API
            await apiClient.deleteSubmission(submissionId);

            // Remove from local state
            setSubmissions(prev => prev.filter(sub => sub.id !== submissionId));

            toast.success('ลบข้อมูลเรียบร้อยแล้ว', {
              title: "ลบสำเร็จ",
              duration: 3000
            });
          } catch (error) {
            console.error('Delete error:', error);
            toast.error(`เกิดข้อผิดพลาดในการลบข้อมูล: ${error.message}`, {
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
      return <span className="text-muted-foreground text-[14px] sm:text-[15px]">-</span>;
    }

    const { value, type } = fieldData;

    switch (type) {
      case 'date':
        if (!value || value === '' || value === 'undefined' || value === 'null' || value === '-' || value === 'Invalid Date') {
          return <span className="text-muted-foreground text-[14px] sm:text-[15px]">-</span>;
        }
        return (
          <div className="text-[14px] sm:text-[15px] text-foreground/80 text-center">
            <div className="font-medium">{value === 'Invalid Date' ? '-' : value}</div>
          </div>
        );

      case 'time':
        return (
          <div className="text-[14px] sm:text-[15px] text-foreground/80 font-mono text-center">
            {value}
          </div>
        );

      case 'datetime':
        if (!value || value === '' || value === 'undefined' || value === 'null' || value === '-' || value === 'Invalid Date') {
          return <span className="text-muted-foreground text-[14px] sm:text-[15px]">-</span>;
        }
        // If value is already formatted (contains time), use it directly
        if (typeof value === 'string' && value.includes(' ') && value !== 'Invalid Date') {
          const parts = value.split(' ');
          return (
            <div className="text-[11px] sm:text-[12px] text-foreground/80 text-center leading-relaxed">
              <div className="font-medium">{parts[0]}</div>
              <div className="text-muted-foreground">{parts[1]}</div>
            </div>
          );
        }
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return <span className="text-muted-foreground text-[14px] sm:text-[15px]">-</span>;
        }
        return (
          <div className="text-[11px] sm:text-[12px] text-foreground/80 text-center leading-relaxed">
            <div className="font-medium">{formatDate(value)}</div>
            <div className="text-muted-foreground">{date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        );

      case 'rating':
        const rating = parseInt(value) || 0;
        return (
          <div className="flex items-center justify-center">
            <span className="text-[16px] sm:text-[18px]">{'⭐'.repeat(rating)}</span>
          </div>
        );

      case 'lat_long':
        // Handle coordinate objects with {lat, lng} format
        if (typeof value === 'object' && value !== null) {
          // Check for lat/lng format
          if (value.lat !== undefined && value.lng !== undefined) {
            return (
              <div className="text-[11px] sm:text-[12px] text-foreground/80 font-mono text-center leading-relaxed">
                <div>Lat: {parseFloat(value.lat).toFixed(4)}</div>
                <div>Lng: {parseFloat(value.lng).toFixed(4)}</div>
              </div>
            );
          }
          // Check for x/y format (alternative coordinate format)
          if (value.x !== undefined && value.y !== undefined) {
            return (
              <div className="text-[11px] sm:text-[12px] text-foreground/80 font-mono text-center leading-relaxed">
                <div>Lat: {parseFloat(value.y).toFixed(4)}</div>
                <div>Lng: {parseFloat(value.x).toFixed(4)}</div>
              </div>
            );
          }
        }
        // Handle string format "lat, lng"
        if (typeof value === 'string' && value.includes(',')) {
          const parts = value.split(',').map(p => p.trim());
          if (parts.length === 2) {
            const lat = parseFloat(parts[0]);
            const lng = parseFloat(parts[1]);
            if (!isNaN(lat) && !isNaN(lng)) {
              return (
                <div className="text-[11px] sm:text-[12px] text-foreground/80 font-mono text-center leading-relaxed">
                  <div>Lat: {lat.toFixed(4)}</div>
                  <div>Lng: {lng.toFixed(4)}</div>
                </div>
              );
            }
          }
        }
        return <span className="text-[14px] sm:text-[15px] text-foreground/80 text-center">{value || '-'}</span>;

      case 'multiple_choice':
        if (Array.isArray(value)) {
          return (
            <div className="flex flex-wrap gap-1 justify-center">
              {value.slice(0, 2).map((item, index) => (
                <span key={index} className="inline-block text-primary text-[14px] sm:text-[15px]">
                  {item}
                </span>
              ))}
              {value.length > 2 && (
                <span className="text-[14px] sm:text-[15px] text-muted-foreground">+{value.length - 2}</span>
              )}
            </div>
          );
        }
        return (
          <div className="text-center">
            <span className="inline-block text-primary text-[14px] sm:text-[15px]">
              {value}
            </span>
          </div>
        );

      case 'province':
      case 'factory':
        // ✅ FIX: Handle array values (factory can be multi-select)
        // Extract plain text from array: ["โรงงานระยอง"] → "โรงงานระยอง"
        let displayValue = value;
        if (Array.isArray(value)) {
          displayValue = value.join(', ');
        } else if (typeof value === 'object' && value !== null) {
          // If it's an object, convert to JSON string safely
          displayValue = JSON.stringify(value);
        }

        return (
          <div className="text-center">
            <span className="inline-block text-primary text-[14px] sm:text-[15px]">
              {displayValue}
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
          <span className="text-[14px] sm:text-[15px] text-foreground/80 font-mono text-center block">
            {formatNumberByContext(value, 'table')}
          </span>
        );

      case 'email':
        return (
          <div className="text-center">
            <a href={`mailto:${value}`} className="text-[14px] sm:text-[15px] text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
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
            className: 'text-[14px] sm:text-[15px]'
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
                <span className="text-[14px] sm:text-[15px] text-foreground/80">
                  {formatPhoneDisplay(value) || value || '-'}
                </span>
              )}
            </div>
          );
        }

        // Fallback for standard phone display
        return (
          <div className="text-center">
            <span className="text-[14px] sm:text-[15px] text-foreground/80">
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
                  className="text-[14px] sm:text-[15px] text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {displayText}
                </a>
              ) : (
                <span className="text-[14px] sm:text-[15px] text-foreground/80">{displayText}</span>
              )}
            </div>
          );
        }

        // Fallback for standard URL display
        return (
          <div className="text-center">
            <span className="text-[14px] sm:text-[15px] text-foreground/80">
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
            <span className="text-[14px] sm:text-[15px] text-foreground/80 font-mono">{sliderValue}{unit}</span>
          </div>
        );

      case 'auto_date':
        // Auto date column - show submission date (simplified structure)
        if (!value || value === '' || value === 'undefined' || value === 'null') {
          return <span className="text-muted-foreground text-[14px] sm:text-[15px]">-</span>;
        }
        const formattedDate = formatDate(value);
        return (
          <span className="text-[14px] sm:text-[15px] text-foreground/80 font-medium" style={{
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
          return <span className="text-muted-foreground text-[14px] sm:text-[15px]">-</span>;
        }
        const timeDate = new Date(value);
        if (isNaN(timeDate.getTime())) {
          return <span className="text-muted-foreground text-[14px] sm:text-[15px]">-</span>;
        }
        return (
          <span className="text-[14px] sm:text-[15px] text-foreground/80 font-mono" style={{
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
            className: 'text-[14px] sm:text-[15px]'
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
                <span className="text-[14px] sm:text-[15px] text-foreground/80">
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
                  className="text-[14px] sm:text-[15px] text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {displayText}
                </a>
              ) : (
                <span className="text-[14px] sm:text-[15px] text-foreground/80">{displayText}</span>
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
                className="text-[14px] sm:text-[15px] text-primary hover:underline"
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
          <div className="text-[14px] sm:text-[15px] text-foreground/80 max-w-[180px] text-center">
            <span className={text.length > 50 ? "truncate block" : ""} title={text.length > 50 ? text : undefined}>
              {text}
            </span>
          </div>
        );
    }
  };

  // ❌ REMOVED: Full-screen loading page (causes screen flicker)
  // Now show content immediately, no loading overlay

  // Don't render anything if form is not loaded yet (prevent null reference errors)
  if (!form) {
    // Only show error if loading is complete
    if (!loading) {
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
    // Still loading, show nothing (prevents flicker)
    return null;
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
        {/* ✅ FIX v0.7.11: Don't hide content during loading - show when ready */}
        {!loading && filteredSubmissions.length > 0 ? (
          <div>
            <GlassCard className="glass-container">
              <style>{`
                /* ✅ Simple hover effect - only change background color */
                .submission-table-override tbody tr {
                  cursor: pointer;
                }

                .submission-table-override tbody tr:hover {
                  background-color: rgb(229 231 235) !important;
                }

                .dark .submission-table-override tbody tr:hover {
                  background-color: rgb(55 65 81) !important;
                }
              `}</style>
              <div className="overflow-x-auto">
                <table data-testid="submission-list" className="w-full submission-table-override">
                  <thead>
                    <tr className="border-b border-border/30 bg-muted/20">
                      {tableFields.map(field => (
                        <th key={field.id} className="text-center p-3 text-[14px] sm:text-[15px] font-medium text-foreground/80 uppercase tracking-wide bg-gradient-to-r from-muted/30 to-muted/20">
                          {field.title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.map((submission, index) => {
                      const formattedSubmission = formatSubmissionForDisplay(submission);

                      return (
                        <tr
                          key={submission.id}
                          data-testid="submission-row"
                          className={`border-b border-border/20 cursor-pointer group relative ${
                            selectedSubmissionId === submission.id && isOpen
                              ? 'bg-muted/30'
                              : ''
                          }`}
                          onClick={() => onViewSubmission && onViewSubmission(submission.id)}
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
                                className={`py-4 px-3 sm:py-5 sm:px-4 text-[14px] sm:text-[15px] text-center min-h-[56px] sm:min-h-[64px]`}
                              >
                                {renderFieldValue(fieldData, field)}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        ) : !loading ? (
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
        ) : null}

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