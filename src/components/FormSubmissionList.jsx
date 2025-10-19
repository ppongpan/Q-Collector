import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from './ui/glass-card';
import { GlassButton } from './ui/glass-button';
import { GlassInput } from './ui/glass-input';
import SubmissionActionMenu, { useSubmissionActionMenu } from './ui/submission-action-menu';
import { PaginationControls } from './ui/pagination-controls';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faCalendar, faCalendarAlt, faSortAmountDown, faSortAmountUp, faList, faChevronDown, faCheck, faCog, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { FileDisplayCompact } from './ui/file-display';
import { useEnhancedToast } from './ui/enhanced-toast';
import { PhoneIcon } from './ui/phone-icon';

// Data services
import submissionService from '../services/SubmissionService.js';
import apiClient from '../services/ApiClient.js';
import userPreferencesService from '../services/UserPreferencesService.js'; // ✅ v0.7.38: User preferences

// Utilities
import { formatNumberByContext } from '../utils/numberFormatter.js';
import { createPhoneLink, formatPhoneDisplay, shouldFormatAsPhone } from '../utils/phoneFormatter.js';
import { getConditionalStyle } from '../utils/conditionalFormattingEngine'; // ✅ v0.7.40: Conditional Formatting

// Auth context
import { useAuth } from '../contexts/AuthContext'; // ✅ v0.7.38: Get user ID for preferences

export default function FormSubmissionList({ formId, onNewSubmission, onViewSubmission, onEditSubmission, onBack }) {
  const { user } = useAuth(); // ✅ v0.7.38: Get current user for preferences
  const [submissions, setSubmissions] = useState([]);
  const [form, setForm] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);

  // Filter and sort state
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1); // ✅ DEFAULT: Current month (1-12)
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear()); // ✅ DEFAULT: Current year
  const [sortBy, setSortBy] = useState('_auto_date'); // Default sort by date
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  const [hideEmptyRows, setHideEmptyRows] = useState(true); // ✅ DEFAULT: Hide empty rows enabled

  // Pagination state
  const [itemsPerPage, setItemsPerPage] = useState(20); // 20, 50, 80, 100
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0); // Total count from backend

  // Dropdown states for compact filter buttons
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false); // Changed to modal
  const [showDateFieldModal, setShowDateFieldModal] = useState(false); // Date field selector modal
  const [selectedDateField, setSelectedDateField] = useState(null); // Selected date field for filtering

  // Action menu state
  const { isOpen, position, openMenu, closeMenu } = useSubmissionActionMenu();

  // Enhanced toast notifications
  const toast = useEnhancedToast();

  // ✅ v0.7.38: Load saved preferences on component mount
  useEffect(() => {
    if (user?.id && formId) {
      const savedPrefs = userPreferencesService.loadFormListPreferences(user.id, formId);

      if (savedPrefs) {
        console.log('📥 [Preferences] Loading saved preferences:', savedPrefs);

        // Restore saved preferences
        if (savedPrefs.sortBy) setSortBy(savedPrefs.sortBy);
        if (savedPrefs.sortOrder) setSortOrder(savedPrefs.sortOrder);
        if (savedPrefs.selectedDateField) setSelectedDateField(savedPrefs.selectedDateField);
        if (savedPrefs.month) setSelectedMonth(savedPrefs.month === 'all' ? 'all' : parseInt(savedPrefs.month));
        if (savedPrefs.year) setSelectedYear(savedPrefs.year === 'all' ? 'all' : parseInt(savedPrefs.year));
        if (savedPrefs.itemsPerPage) setItemsPerPage(savedPrefs.itemsPerPage);
      } else {
        console.log('ℹ️ [Preferences] No saved preferences, using defaults');
      }
    }
  }, [user?.id, formId]); // Only run once when user/form changes

  // ✅ v0.7.38: Auto-save preferences when they change
  useEffect(() => {
    if (user?.id && formId && form) {
      // Don't save on initial render (wait for user interaction)
      const timer = setTimeout(() => {
        const prefs = {
          sortBy,
          sortOrder,
          selectedDateField,
          month: selectedMonth === 'all' ? 'all' : String(selectedMonth),
          year: selectedYear === 'all' ? 'all' : String(selectedYear),
          itemsPerPage
        };

        userPreferencesService.saveFormListPreferences(user.id, formId, prefs);
      }, 500); // Debounce: save 500ms after last change

      return () => clearTimeout(timer);
    }
  }, [user?.id, formId, form, sortBy, sortOrder, selectedDateField, selectedMonth, selectedYear, itemsPerPage]);

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

      // ✅ OPTIMIZED: Load only current page data with server-side filtering
      // This prevents loading all 750+ items at once, improving performance significantly
      let submissionsData = [];
      let totalCount = 0;
      let paginationInfo = null;

      try {
        // ✅ v0.7.36: Build comprehensive filter parameters for server-side processing
        const filters = {
          page: currentPage,
          limit: itemsPerPage
        };

        // Add month/year filter if selected
        if (selectedMonth !== null || selectedYear !== null) {
          filters.month = selectedMonth;
          filters.year = selectedYear;
          // ✅ NEW v0.7.36: Add dateField parameter for custom date field filtering
          filters.dateField = selectedDateField || '_auto_date';
        }

        // ✅ NEW v0.7.36: Add search filter
        if (searchTerm && searchTerm.trim()) {
          filters.search = searchTerm.trim();
        }

        // ✅ NEW v0.7.36: Add sorting parameters
        // Convert sortBy from UI field (including _auto_date) to backend field
        if (sortBy === '_auto_date' || sortBy === '_auto_time') {
          filters.sortBy = 'submittedAt'; // Backend uses submittedAt for both date and time sorting
        } else {
          filters.sortBy = sortBy;
        }
        filters.sortOrder = sortOrder;

        console.log('📡 Requesting data with filters:', filters);

        const response = await apiClient.listSubmissions(formId, filters);
        submissionsData = response.data?.submissions || response.data || [];
        paginationInfo = response.data?.pagination || {};
        totalCount = paginationInfo.total || submissionsData.length;

        console.log(`✅ Loaded ${submissionsData.length} items (Page ${currentPage}, Total: ${totalCount})`);
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
      setTotalItems(totalCount); // Store total count for pagination

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
  }, [formId, currentPage, itemsPerPage, selectedMonth, selectedYear, searchTerm, sortBy, sortOrder, selectedDateField]); // ✅ v0.7.36: Added search, sort, and dateField dependencies

  // Load form and submissions data
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-select date field if only one exists
  useEffect(() => {
    if (form && form.fields) {
      const dateFields = form.fields.filter(field =>
        (field.type === 'date' || field.type === 'datetime') && !field.subFormId
      );

      // If only one date field, auto-select it
      if (dateFields.length === 1 && !selectedDateField) {
        setSelectedDateField(dateFields[0].id);
        console.log('✅ Auto-selected date field:', dateFields[0].title);
      }
      // If no date field selected but multiple exist, default to submittedAt
      else if (dateFields.length > 1 && !selectedDateField) {
        setSelectedDateField('_auto_date'); // Use submission date as default
        console.log('✅ Defaulted to submission date (multiple date fields available)');
      }
      // If no date fields exist, use submittedAt
      else if (dateFields.length === 0 && !selectedDateField) {
        setSelectedDateField('_auto_date');
        console.log('✅ Using submission date (no date fields in form)');
      }
    }
  }, [form, selectedDateField]);

  // Get table display fields based on showInTable setting
  // ✅ FIX: Use showInTable setting from form definition, with fallback to submission data
  const getTableFields = () => {
    if (!form || !form.fields) return [];

    // Step 1: Get fields with showInTable = true
    const fieldsMarkedForTable = form.fields
      .filter(field => field.showInTable === true && !field.subFormId)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(field => ({
        id: field.id,
        title: field.title,
        type: field.type,
        options: field.options || {}
      }));

    console.log('📋 Fields with showInTable=true:', fieldsMarkedForTable.length);

    // Step 2: If we have fields marked for table, use them (max 5)
    if (fieldsMarkedForTable.length > 0) {
      const selectedFields = fieldsMarkedForTable.slice(0, 5);

      // If less than 5 fields, add auto columns to fill up
      if (selectedFields.length < 5) {
        const availableSlots = 5 - selectedFields.length;
        const autoColumns = [];

        if (availableSlots >= 1) {
          autoColumns.push({
            id: '_auto_date',
            title: 'วันที่บันทึกข้อมูล',
            type: 'auto_date',
            isAutoColumn: true
          });
        }

        if (availableSlots >= 2) {
          autoColumns.push({
            id: '_auto_time',
            title: 'เวลาบันทึก',
            type: 'auto_time',
            isAutoColumn: true
          });
        }

        return [...selectedFields, ...autoColumns];
      }

      return selectedFields;
    }

    // Step 3: Fallback - No fields marked with showInTable, use first 5 fields from form
    console.log('⚠️  No fields with showInTable=true, using first 5 fields');
    const fallbackFields = form.fields
      .filter(field => !field.subFormId)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .slice(0, 3)
      .map(field => ({
        id: field.id,
        title: field.title,
        type: field.type,
        options: field.options || {}
      }));

    // Add auto columns
    return [
      {
        id: '_auto_date',
        title: 'วันที่บันทึกข้อมูล',
        type: 'auto_date',
        isAutoColumn: true
      },
      {
        id: '_auto_time',
        title: 'เวลาบันทึก',
        type: 'auto_time',
        isAutoColumn: true
      },
      ...fallbackFields
    ];
  };

  // Format submission data for display
  const formatSubmissionForDisplay = (submission) => {
    if (!form) return submission;
    return submissionService.formatSubmissionForDisplay(submission, form);
  };

  // ✅ v0.7.36: Use fixed year range instead of client-side data
  // Improved performance by not iterating through submissions
  const getAvailableYears = () => {
    const currentYear = new Date().getFullYear();
    const startYear = 2024; // System start year
    const years = [];
    for (let year = currentYear; year >= startYear; year--) {
      years.push(year);
    }
    return years;
  };

  const availableYears = getAvailableYears();

  // Thai month names
  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  // Get date fields for filtering
  const getDateFields = () => {
    if (!form || !form.fields) return [];
    return form.fields.filter(field =>
      (field.type === 'date' || field.type === 'datetime') && !field.subFormId
    );
  };

  // ✅ IMPROVED: Check if submission is mostly empty (based on table fields only)
  const isSubmissionMostlyEmpty = (submission) => {
    if (!form || !submission) return false;

    // Get the fields that are actually displayed in the table
    const displayedFields = getTableFields();
    if (displayedFields.length === 0) return false;

    const formattedSubmission = formatSubmissionForDisplay(submission);

    let emptyCount = 0;
    displayedFields.forEach(field => {
      let value;

      // Handle auto columns
      if (field.isAutoColumn) {
        value = submission.submittedAt;
      } else {
        const fieldData = formattedSubmission.fields[field.id];
        value = fieldData?.value;
      }

      // Consider empty if: null, undefined, empty string, or "-"
      if (value === null || value === undefined || value === '' || value === '-') {
        emptyCount++;
      }
    });

    // Return true if >70% of displayed fields are empty (stricter threshold)
    return (emptyCount / displayedFields.length) > 0.7;
  };

  // ✅ v0.7.36: Backend returns filtered, sorted, and paginated data
  // Only apply client-side hideEmptyRows filter (optional UI enhancement)
  const displaySubmissions = hideEmptyRows
    ? submissions.filter(submission => !isSubmissionMostlyEmpty(submission))
    : submissions;

  // ✅ v0.7.36 FIX: Always use backend's totalItems - it's the source of truth
  // Do NOT adjust based on displaySubmissions.length (that's only current page!)
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedSubmissions = displaySubmissions;

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth, selectedYear, sortBy, sortOrder, searchTerm, hideEmptyRows]);

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
  // ✅ v0.7.40: Added conditionalStyle parameter for formatting
  const renderFieldValue = (fieldData, field, conditionalStyle = {}) => {
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
          <div className="text-[14px] sm:text-[15px] text-center" style={conditionalStyle}>
            <div className="font-medium">{value === 'Invalid Date' ? '-' : value}</div>
          </div>
        );

      case 'time':
        return (
          <div className="text-[14px] sm:text-[15px] font-mono text-center" style={conditionalStyle}>
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
            <div className="text-[11px] sm:text-[12px] text-center leading-relaxed" style={conditionalStyle}>
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
          <div className="text-[11px] sm:text-[12px] text-center leading-relaxed" style={conditionalStyle}>
            <div className="font-medium">{formatDate(value)}</div>
            <div className="text-muted-foreground">{date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        );

      case 'rating':
        const rating = parseInt(value) || 0;
        return (
          <div className="flex items-center justify-center" style={conditionalStyle}>
            <span className="text-[16px] sm:text-[18px]">{'⭐'.repeat(rating)}</span>
          </div>
        );

      case 'lat_long':
        // Handle coordinate objects with {lat, lng} format
        if (typeof value === 'object' && value !== null) {
          // Check for lat/lng format
          if (value.lat !== undefined && value.lng !== undefined) {
            return (
              <div className="text-[11px] sm:text-[12px] font-mono text-center leading-relaxed" style={conditionalStyle}>
                <div>Lat: {parseFloat(value.lat).toFixed(4)}</div>
                <div>Lng: {parseFloat(value.lng).toFixed(4)}</div>
              </div>
            );
          }
          // Check for x/y format (alternative coordinate format)
          if (value.x !== undefined && value.y !== undefined) {
            return (
              <div className="text-[11px] sm:text-[12px] font-mono text-center leading-relaxed" style={conditionalStyle}>
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
                <div className="text-[11px] sm:text-[12px] font-mono text-center leading-relaxed" style={conditionalStyle}>
                  <div>Lat: {lat.toFixed(4)}</div>
                  <div>Lng: {lng.toFixed(4)}</div>
                </div>
              );
            }
          }
        }
        return <span className="text-[14px] sm:text-[15px] text-center" style={conditionalStyle}>{value || '-'}</span>;

      case 'multiple_choice':
        if (Array.isArray(value)) {
          return (
            <div className="flex flex-wrap gap-1 justify-center" style={conditionalStyle}>
              {value.slice(0, 2).map((item, index) => (
                <span key={index} className="inline-block text-[14px] sm:text-[15px]">
                  {item}
                </span>
              ))}
              {value.length > 2 && (
                <span className="text-[14px] sm:text-[15px] opacity-70">+{value.length - 2}</span>
              )}
            </div>
          );
        }
        return (
          <div className="text-center" style={conditionalStyle}>
            <span className="inline-block text-[14px] sm:text-[15px]">
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
          <div className="text-center" style={conditionalStyle}>
            <span className="inline-block text-[14px] sm:text-[15px]">
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
          <span className="text-[14px] sm:text-[15px] font-mono text-center block" style={conditionalStyle}>
            {formatNumberByContext(value, 'table', field.options)}
          </span>
        );

      case 'email':
        return (
          <div className="text-center" style={conditionalStyle}>
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
            <div className="text-center" style={conditionalStyle}>
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
                <span className="text-[14px] sm:text-[15px]">
                  {formatPhoneDisplay(value) || value || '-'}
                </span>
              )}
            </div>
          );
        }

        // Fallback for standard phone display
        return (
          <div className="text-center" style={conditionalStyle}>
            <span className="text-[14px] sm:text-[15px]">
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
            <div className="text-center" style={conditionalStyle}>
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
                <span className="text-[14px] sm:text-[15px]">{displayText}</span>
              )}
            </div>
          );
        }

        // Fallback for standard URL display
        return (
          <div className="text-center" style={conditionalStyle}>
            <span className="text-[14px] sm:text-[15px]">
              {value?.length > 30 ? `${value.substring(0, 30)}...` : value}
            </span>
          </div>
        );

      case 'slider':
        const sliderValue = parseFloat(value) || 0;
        const unit = field.options?.unit || '';
        return (
          <div className="flex items-center gap-2 justify-center" style={conditionalStyle}>
            <div className="flex-1 bg-muted/30 h-1 max-w-16">
              <div
                className="bg-primary h-1"
                style={{ width: `${(sliderValue / (field.options?.max || 100)) * 100}%` }}
              />
            </div>
            <span className="text-[14px] sm:text-[15px] font-mono">{sliderValue}{unit}</span>
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
            <div className="text-center" style={conditionalStyle}>
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
                <span className="text-[14px] sm:text-[15px]">
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
            <div className="text-center" style={conditionalStyle}>
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
                <span className="text-[14px] sm:text-[15px]">{displayText}</span>
              )}
            </div>
          );
        }

        // Handle email field
        if (isEmailFromTitle || isEmailFromValue) {
          return (
            <div className="text-center" style={conditionalStyle}>
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
          <div
            className="text-[14px] sm:text-[15px] max-w-[180px] text-center"
            style={conditionalStyle}
          >
            <span
              className={text.length > 50 ? "truncate block" : ""}
              title={text.length > 50 ? text : undefined}
            >
              {text}
            </span>
          </div>
        );
    }
  };

  // ✅ v0.7.40: Field map for conditional formatting formula evaluation
  const fieldMap = useMemo(() => {
    const map = {};
    (form?.fields || []).forEach(field => {
      map[field.id] = field;
    });
    return map;
  }, [form?.fields]);

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

            {/* Right side: Search Box with Gear Icon */}
            <div className="relative w-80 flex-shrink-0 flex items-center gap-2">
              <div className="relative flex-1">
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
              {/* Gear Icon for Date Field Selector - No border, just icon */}
              <div className="relative">
                <button
                  onClick={() => setShowDateFieldModal(!showDateFieldModal)}
                  className="p-2 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  title="เลือกฟิลด์วันที่สำหรับ Filter"
                >
                  <FontAwesomeIcon icon={faCog} className="text-lg" />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Layout: Title and Search stacked */}
          <div className="lg:hidden mb-6">
            <h1 className="text-xl font-bold text-primary mb-4 text-left" style={{ fontSize: '20px' }}>
              {form.title}
            </h1>
            <div className="flex items-center gap-2 max-w-md">
              <div className="relative flex-1">
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
              {/* Gear Icon for Date Field Selector (Mobile) - No border, just icon */}
              <div className="relative">
                <button
                  onClick={() => setShowDateFieldModal(!showDateFieldModal)}
                  className="p-2 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  title="เลือกฟิลด์วันที่สำหรับ Filter"
                >
                  <FontAwesomeIcon icon={faCog} className="text-lg" />
                </button>
              </div>
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

        {/* Filter and Sort Controls */}
        {!loading && form && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-6 relative z-50"
          >
            <GlassCard className="p-1.5 overflow-visible">
              <div className="flex gap-1.5 items-center justify-start">
                {/* Month Filter Button */}
                <div className="relative z-[60]">
                  <GlassButton
                    variant="secondary"
                    onClick={() => {
                      setShowMonthDropdown(!showMonthDropdown);
                      setShowYearDropdown(false);
                      setShowSortModal(false);
                    }}
                    className="px-2 py-1 text-xs flex items-center gap-1.5 min-w-fit h-8"
                    title={`กรองตามเดือนจาก: ${selectedDateField === '_auto_date' ? 'วันที่บันทึกข้อมูล' : form.fields?.find(f => f.id === selectedDateField)?.title || 'ฟิลด์วันที่'}`}
                  >
                    <FontAwesomeIcon icon={faCalendar} className="text-primary" />
                    <span>{selectedMonth === null ? 'ทั้งหมด' : monthNames[selectedMonth - 1]}</span>
                    <FontAwesomeIcon icon={faChevronDown} className="text-xs opacity-60" />
                  </GlassButton>

                  {/* Month Dropdown */}
                  {showMonthDropdown && (
                    <>
                      {/* Backdrop overlay */}
                      <div
                        className="fixed inset-0 z-[100]"
                        onClick={() => setShowMonthDropdown(false)}
                      />
                      <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border-2 border-primary rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[101] max-h-[500px] overflow-y-auto min-w-[110px]">
                      {/* All months option */}
                      <button
                        onClick={() => {
                          setSelectedMonth(null);
                          setShowMonthDropdown(false);
                        }}
                        className={'w-full px-2.5 py-1.5 text-xs text-left hover:bg-primary/10 transition-colors border-b border-border/20 ' + (
                          selectedMonth === null ? 'bg-primary/20 text-primary font-semibold' : 'text-foreground'
                        )}
                      >
                        ทั้งหมด
                      </button>
                      {monthNames.map((month, index) => (
                        <button
                          key={index + 1}
                          onClick={() => {
                            setSelectedMonth(index + 1);
                            setShowMonthDropdown(false);
                          }}
                          className={'w-full px-2.5 py-1.5 text-xs text-left hover:bg-primary/10 transition-colors ' + (index < monthNames.length - 1 ? 'border-b border-border/20 ' : '') + (
                            selectedMonth === index + 1 ? 'bg-primary/20 text-primary font-semibold' : 'text-foreground'
                          )}
                        >
                          {month}
                        </button>
                      ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Year Filter Button */}
                <div className="relative z-[60]">
                  <GlassButton
                    variant="secondary"
                    onClick={() => {
                      setShowYearDropdown(!showYearDropdown);
                      setShowMonthDropdown(false);
                      setShowSortModal(false);
                    }}
                    className="px-2 py-1 text-xs flex items-center gap-1.5 min-w-fit h-8"
                    title={`กรองตามปีจาก: ${selectedDateField === '_auto_date' ? 'วันที่บันทึกข้อมูล' : form.fields?.find(f => f.id === selectedDateField)?.title || 'ฟิลด์วันที่'}`}
                  >
                    <FontAwesomeIcon icon={faCalendarAlt} className="text-primary" />
                    <span>{selectedYear === null ? 'ทั้งหมด' : selectedYear}</span>
                    <FontAwesomeIcon icon={faChevronDown} className="text-xs opacity-60" />
                  </GlassButton>

                  {/* Year Dropdown */}
                  {showYearDropdown && (
                    <>
                      {/* Backdrop overlay */}
                      <div
                        className="fixed inset-0 z-[100]"
                        onClick={() => setShowYearDropdown(false)}
                      />
                      <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border-2 border-primary rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[101] max-h-64 overflow-y-auto min-w-[100px]">
                      {/* All years option */}
                      <button
                        onClick={() => {
                          setSelectedYear(null);
                          setShowYearDropdown(false);
                        }}
                        className={'w-full px-3 py-2 text-xs text-left hover:bg-primary/10 transition-colors border-b border-border/20 ' + (
                          selectedYear === null ? 'bg-primary/20 text-primary font-semibold' : 'text-foreground'
                        )}
                      >
                        ทั้งหมด
                      </button>
                      {(availableYears.length > 0 ? availableYears : [currentDate.getFullYear()]).map(year => (
                        <button
                          key={year}
                          onClick={() => {
                            setSelectedYear(year);
                            setShowYearDropdown(false);
                          }}
                          className={'w-full px-3 py-2 text-xs text-left hover:bg-primary/10 transition-colors ' + (
                            selectedYear === year ? 'bg-primary/20 text-primary font-semibold' : 'text-foreground'
                          )}
                        >
                          {year}
                        </button>
                      ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Divider */}
                <div className="h-4 w-px bg-border"></div>

                {/* Sort By Button */}
                <div className="relative z-[60]">
                  <GlassButton
                    variant="secondary"
                    onClick={() => {
                      setShowSortModal(true);
                      setShowMonthDropdown(false);
                      setShowYearDropdown(false);
                    }}
                    className="px-2 py-1 text-xs flex items-center gap-1.5 min-w-fit h-8"
                  >
                  <FontAwesomeIcon
                    icon={sortOrder === 'asc' ? faSortAmountUp : faSortAmountDown}
                    className="text-primary"
                  />
                  <span className="max-w-[100px] truncate">
                    {sortBy === '_auto_date' ? 'วันที่' :
                     sortBy === '_auto_time' ? 'เวลา' :
                     form.fields?.find(f => f.id === sortBy)?.title || 'เรียง'}
                  </span>
                  <FontAwesomeIcon icon={faChevronDown} className="text-xs opacity-60" />
                </GlassButton>
                </div>

                {/* Sort Order Toggle */}
                <GlassButton
                  variant="secondary"
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="px-2 py-1 text-xs flex items-center gap-1 h-8"
                  title={sortOrder === 'asc' ? 'น้อย→มาก' : 'มาก→น้อย'}
                >
                  <span className="hidden sm:inline">{sortOrder === 'asc' ? '↑ น้อย→มาก' : '↓ มาก→น้อย'}</span>
                  <span className="sm:hidden">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                </GlassButton>

                {/* Divider */}
                <div className="h-4 w-px bg-border"></div>

                {/* ✅ NEW: Hide Empty Rows Checkbox */}
                <label
                  className="flex items-center gap-1.5 px-2 py-1 cursor-pointer hover:bg-primary/5 rounded transition-colors h-8"
                  title="ซ่อนแถวที่มีข้อมูลว่างมากกว่า 50%"
                >
                  <input
                    type="checkbox"
                    checked={hideEmptyRows}
                    onChange={(e) => setHideEmptyRows(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-2 border-primary/40 text-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  />
                  <FontAwesomeIcon icon={faEyeSlash} className="text-primary text-xs" />
                  <span className="text-xs text-foreground/80 hidden sm:inline">ซ่อนข้อมูลว่าง</span>
                </label>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Sort Modal - OUTSIDE of GlassCard container */}
        {showSortModal && (
          <div
            className="fixed inset-0 z-[9999] flex items-start justify-center pt-32 bg-black/20"
            onClick={() => {
              console.log('🔍 Backdrop clicked');
              setShowSortModal(false);
            }}
          >
            {/* Modal content - Fixed width 360px, responsive height */}
            <div
              className="relative bg-white dark:bg-gray-800 border-2 border-primary rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.8)] w-[360px]"
              onClick={(e) => {
                console.log('🔍 Modal content clicked');
                e.stopPropagation();
              }}
            >
              {/* Scrollable content area with responsive height */}
              <div className="p-3 max-h-[60vh] sm:max-h-[70vh] md:max-h-[80vh] overflow-y-auto">
                <style>{`
                  .sort-modal-button {
                    transition: background-color 150ms, border-color 150ms, transform 150ms;
                  }
                  .sort-modal-button:hover:not(.selected) {
                    background-color: rgba(249, 115, 22, 0.15) !important;
                    border-color: rgba(249, 115, 22, 1) !important;
                    transform: scale(1.02) !important;
                  }
                  .dark .sort-modal-button:hover:not(.selected) {
                    background-color: rgba(249, 115, 22, 0.15) !important;
                  }
                `}</style>
                <div className="grid grid-cols-2 gap-2">
                  {/* Auto columns */}
                  <button
                    onClick={() => {
                      setSortBy('_auto_date');
                      setShowSortModal(false);
                    }}
                    className={'sort-modal-button px-3 py-2.5 text-sm text-left rounded border ' + (
                      sortBy === '_auto_date'
                        ? 'selected bg-primary/20 border-primary text-primary font-semibold'
                        : 'bg-background border-border'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faCalendar} className="text-primary text-xs" />
                      <span className="truncate">วันที่</span>
                      {sortBy === '_auto_date' && (
                        <FontAwesomeIcon icon={faCheck} className="ml-auto text-xs" />
                      )}
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setSortBy('_auto_time');
                      setShowSortModal(false);
                    }}
                    className={'sort-modal-button px-3 py-2.5 text-sm text-left rounded border ' + (
                      sortBy === '_auto_time'
                        ? 'selected bg-primary/20 border-primary text-primary font-semibold'
                        : 'bg-background border-border'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faCalendarAlt} className="text-primary text-xs" />
                      <span className="truncate">เวลา</span>
                      {sortBy === '_auto_time' && (
                        <FontAwesomeIcon icon={faCheck} className="ml-auto text-xs" />
                      )}
                    </div>
                  </button>

                  {/* Form fields - show all main form fields */}
                  {form && form.fields && form.fields
                    .filter(field => !field.subFormId)
                    .map(field => (
                      <button
                        key={field.id}
                        onClick={() => {
                          setSortBy(field.id);
                          setShowSortModal(false);
                        }}
                        className={'sort-modal-button px-3 py-2.5 text-sm text-left rounded border ' + (
                          sortBy === field.id
                            ? 'selected bg-primary/20 border-primary text-primary font-semibold'
                            : 'bg-background border-border'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="truncate">{field.title}</span>
                          {sortBy === field.id && (
                            <FontAwesomeIcon icon={faCheck} className="ml-auto flex-shrink-0 text-xs" />
                          )}
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pagination Controls (Top) */}
        {!loading && totalItems > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-4"
          >
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => setCurrentPage(page)}
              onItemsPerPageChange={(perPage) => {
                setItemsPerPage(perPage);
                setCurrentPage(1); // Reset to first page
              }}
            />
          </motion.div>
        )}

        {/* Enhanced Submissions Table - Only Selected Fields */}
        {/* ✅ FIX v0.7.11: Don't hide content during loading - show when ready */}
        {!loading && totalItems > 0 ? (
          <div>
            <GlassCard className="glass-container">
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
                    {paginatedSubmissions.map((submission, index) => {
                      const formattedSubmission = formatSubmissionForDisplay(submission);

                      // ✅ DEBUG: Log formatted data for first row
                      if (index === 0) {
                        console.log('🔍 First submission formatted data:', {
                          submissionId: submission.id,
                          formattedFields: formattedSubmission.fields,
                          fieldKeys: Object.keys(formattedSubmission.fields || {}),
                          fieldCount: Object.keys(formattedSubmission.fields || {}).length
                        });
                        console.log('🔍 Table fields expecting:', tableFields.map(f => ({ id: f.id, title: f.title })));
                      }

                      return (
                        <tr
                          key={submission.id}
                          data-testid="submission-row"
                          className={'border-b border-border/20 cursor-pointer group relative ' + (
                            selectedSubmissionId === submission.id && isOpen
                              ? 'bg-muted/30'
                              : ''
                          )}
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

                              // ✅ DEBUG: Log field data lookup for first row
                              if (index === 0) {
                                console.log(`🔍 Looking up field "${field.title}" (${field.id}):`, fieldData);
                              }
                            }

                            const isFirst = fieldIndex === 0;
                            const isLast = fieldIndex === tableFields.length - 1;

                            // ✅ v0.7.40: Apply conditional formatting to table cells
                            const conditionalStyle = getConditionalStyle(
                              form?.settings,
                              field.id,
                              fieldData?.value,
                              formattedSubmission.fields,
                              fieldMap
                            );

                            return (
                              <td
                                key={field.id}
                                className="py-4 px-3 sm:py-5 sm:px-4 text-[14px] sm:text-[15px] text-center min-h-[56px] sm:min-h-[64px]"
                              >
                                {renderFieldValue(fieldData, field, conditionalStyle)}
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

            {/* Pagination Controls (Bottom) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-6"
            >
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={(page) => setCurrentPage(page)}
                onItemsPerPageChange={(perPage) => {
                  setItemsPerPage(perPage);
                  setCurrentPage(1);
                }}
              />
            </motion.div>
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

        {/* Date Field Selector Modal - Dropdown style near gear icon */}
        {showDateFieldModal && (
          <>
            {/* Backdrop overlay */}
            <div
              className="fixed inset-0 z-[200]"
              onClick={() => setShowDateFieldModal(false)}
            />
            {/* Modal - positioned near top, aligned right */}
            <div className="fixed top-[120px] right-8 lg:right-12 bg-white dark:bg-gray-800 border-2 border-primary rounded-xl shadow-[0_10px_60px_rgba(0,0,0,0.9)] z-[201] w-[90vw] max-w-md max-h-[calc(100vh-140px)] overflow-y-auto">
              <div className="p-4">
                {/* Header */}
                <div className="mb-4 pb-3 border-b border-border">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <FontAwesomeIcon icon={faCalendar} className="text-primary" />
                    เลือกฟิลด์วันที่สำหรับ Filter
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    เลือกฟิลด์ที่ต้องการใช้กรองข้อมูลตามเดือน/ปี
                  </p>
                </div>

                {/* Date field options */}
                <div className="space-y-2">
                  {/* Always show submission date option */}
                  <button
                    onClick={() => {
                      setSelectedDateField('_auto_date');
                      setShowDateFieldModal(false);
                    }}
                    className={'w-full px-4 py-3 text-left rounded-lg border transition-all ' + (
                      selectedDateField === '_auto_date'
                        ? 'bg-primary/20 border-primary text-primary font-semibold'
                        : 'bg-background border-border hover:border-primary/50 hover:bg-primary/5'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <FontAwesomeIcon icon={faCalendar} className="text-primary" />
                      <div className="flex-1">
                        <div className="font-medium">วันที่บันทึกข้อมูล</div>
                        <div className="text-xs text-muted-foreground">วันที่ส่งข้อมูล (submittedAt)</div>
                      </div>
                      {selectedDateField === '_auto_date' && (
                        <FontAwesomeIcon icon={faCheck} className="text-primary" />
                      )}
                    </div>
                  </button>

                  {/* Form date fields */}
                  {getDateFields().map(field => (
                    <button
                      key={field.id}
                      onClick={() => {
                        setSelectedDateField(field.id);
                        setShowDateFieldModal(false);
                      }}
                      className={'w-full px-4 py-3 text-left rounded-lg border transition-all ' + (
                        selectedDateField === field.id
                          ? 'bg-primary/20 border-primary text-primary font-semibold'
                          : 'bg-background border-border hover:border-primary/50 hover:bg-primary/5'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <FontAwesomeIcon
                          icon={field.type === 'datetime' ? faCalendarAlt : faCalendar}
                          className="text-primary"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{field.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {field.type === 'datetime' ? 'วันที่และเวลา' : 'วันที่'}
                          </div>
                        </div>
                        {selectedDateField === field.id && (
                          <FontAwesomeIcon icon={faCheck} className="text-primary" />
                        )}
                      </div>
                    </button>
                  ))}

                  {/* Show message if no date fields */}
                  {getDateFields().length === 0 && (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      ฟอร์มนี้ไม่มีฟิลด์วันที่ จะใช้วันที่บันทึกข้อมูลสำหรับ Filter
                    </div>
                  )}
                </div>

                {/* Close button */}
                <div className="mt-4 pt-3 border-t border-border">
                  <GlassButton
                    variant="ghost"
                    onClick={() => setShowDateFieldModal(false)}
                    className="w-full"
                  >
                    ปิด
                  </GlassButton>
                </div>
              </div>
            </div>
          </>
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