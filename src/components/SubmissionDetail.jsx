import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useEnhancedToast } from './ui/enhanced-toast'; // ✅ FIX v0.7.10: Use project's toast system
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription, GlassCardContent } from './ui/glass-card';
import { GlassButton } from './ui/glass-button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faEdit
} from '@fortawesome/free-solid-svg-icons';
import { FileDisplay, FileDisplayCompact } from './ui/file-display';
import { FileGallery, ImageThumbnail } from './ui/image-thumbnail';
import { PhoneIcon } from './ui/phone-icon';
import { LocationMap } from './ui/location-map';
import { MaskedValue } from './ui/masked-value'; // ✅ v0.8.1: Data masking for sensitive fields

// Data services
import fileServiceAPI from '../services/FileService.api.js';
import apiClient from '../services/ApiClient';
import { getFileStreamURL } from '../config/api.config.js'; // ✅ FIX v0.7.10: For blob URL stream
import API_CONFIG from '../config/api.config.js'; // ✅ FIX v0.7.10: Default import for API_CONFIG
import ImageLoadingQueue from '../services/ImageLoadingQueue'; // ✅ v0.7.30: Progressive Loading
import BlobUrlCache from '../utils/BlobUrlCache'; // ✅ v0.7.30: Progressive Loading

// Auth context
import { useAuth } from '../contexts/AuthContext';

// Hooks
import { useDelayedLoading } from '../hooks/useDelayedLoading';

// Utilities
import { formatNumberByContext } from '../utils/numberFormatter.js';
import { createPhoneLink, formatPhoneDisplay, shouldFormatAsPhone } from '../utils/phoneFormatter.js';
import { cn } from '../lib/utils'; // ✅ FIX v0.7.10: For className composition
import { getConditionalStyle } from '../utils/conditionalFormattingEngine'; // ✅ v0.7.40: Conditional Formatting
import { shouldMaskField } from '../utils/dataMasking'; // ✅ v0.8.1: Data masking utilities

// ✅ FIX v0.7.26: Fixed Navigation Buttons Component using Portal
// Buttons stay on screen edges even when scrolling (fixed position)
const FixedNavigationButtons = ({ hasPrevious, hasNext, onNavigatePrevious, onNavigateNext, currentIndex, totalCount }) => {
  const [portalElement, setPortalElement] = useState(null);

  useEffect(() => {
    // Create portal element for navigation buttons
    const element = document.createElement('div');
    element.id = 'fixed-navigation-portal';
    element.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100vh !important;
      pointer-events: none !important;
      z-index: 40 !important;
    `;
    document.body.appendChild(element);
    setPortalElement(element);

    return () => {
      if (document.body.contains(element)) {
        document.body.removeChild(element);
      }
    };
  }, []);

  // ✅ v0.7.45 DEBUG: Button visibility and position logging
  useEffect(() => {
    console.log('🎯 [v0.7.45] Navigation State:', {
      hasPrevious,
      hasNext,
      currentIndex,
      totalCount,
      position: currentIndex >= 0 && totalCount > 0 ? `${currentIndex + 1} of ${totalCount}` : 'unknown',
      portalCreated: !!portalElement
    });
  }, [hasPrevious, hasNext, currentIndex, totalCount, portalElement]);

  if (!portalElement) return null;

  return createPortal(
    <>
      {/* ✅ Previous Button - Fixed to left edge, always visible on desktop */}
      {hasPrevious && onNavigatePrevious && (
        <motion.div
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
          onClick={onNavigatePrevious}
          className="hidden md:flex fixed left-6 top-1/2 -translate-y-1/2 w-20 h-20 items-center justify-center cursor-pointer group pointer-events-auto"
          title="คลิกเพื่อดูข้อมูลก่อนหน้า"
          style={{
            zIndex: 50
          }}
        >
          {/* Glow Effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500/30 to-orange-600/30 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Glass Button */}
          <motion.div
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="relative w-16 h-16 rounded-full bg-gradient-to-br from-white/10 to-white/5 dark:from-white/20 dark:to-white/10 backdrop-blur-xl border border-white/20 dark:border-white/30 shadow-2xl flex items-center justify-center overflow-hidden group-hover:border-orange-400/60 transition-all duration-300"
          >
            {/* Inner Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-400/0 to-orange-600/0 group-hover:from-orange-400/30 group-hover:to-orange-600/30 transition-all duration-500" />

            {/* Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="relative h-7 w-7 text-gray-700 dark:text-gray-300 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>

            {/* Shimmer Effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ✅ Next Button - Fixed to right edge, always visible on desktop */}
      {hasNext && onNavigateNext && (
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
          onClick={onNavigateNext}
          className="hidden md:flex fixed right-6 top-1/2 -translate-y-1/2 w-20 h-20 items-center justify-center cursor-pointer group pointer-events-auto"
          title="คลิกเพื่อดูข้อมูลถัดไป"
          style={{
            zIndex: 50
          }}
        >
          {/* Glow Effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-l from-orange-500/30 to-orange-600/30 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Glass Button */}
          <motion.div
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="relative w-16 h-16 rounded-full bg-gradient-to-br from-white/10 to-white/5 dark:from-white/20 dark:to-white/10 backdrop-blur-xl border border-white/20 dark:border-white/30 shadow-2xl flex items-center justify-center overflow-hidden group-hover:border-orange-400/60 transition-all duration-300"
          >
            {/* Inner Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-400/0 to-orange-600/0 group-hover:from-orange-400/30 group-hover:to-orange-600/30 transition-all duration-500" />

            {/* Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="relative h-7 w-7 text-gray-700 dark:text-gray-300 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>

            {/* Shimmer Effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
          </motion.div>
        </motion.div>
      )}

    </>,
    portalElement
  );
};

// Floating Button Component using Portal
const FloatingAddButton = ({ formId, onAddNew }) => {
  const [portalElement, setPortalElement] = useState(null);

  useEffect(() => {
    // Create portal element
    const element = document.createElement('div');
    element.id = 'floating-button-portal';
    element.style.cssText = `
      position: fixed !important;
      bottom: 24px !important;
      right: 24px !important;
      z-index: 2147483647 !important;
      pointer-events: none !important;
    `;
    document.body.appendChild(element);
    setPortalElement(element);

    return () => {
      if (document.body.contains(element)) {
        document.body.removeChild(element);
      }
    };
  }, []);

  const handleClick = () => {
    console.log('Floating button clicked - adding new submission for form:', formId);
    if (onAddNew) {
      onAddNew(formId);
    } else {
      console.warn('onAddNew callback not provided to FloatingAddButton');
    }
  };

  if (!portalElement) return null;

  return createPortal(
    <motion.div
      initial={{ scale: 0, opacity: 0, y: 100 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{
        delay: 0.8,
        type: "spring",
        stiffness: 200,
        damping: 15,
        opacity: { duration: 0.3 }
      }}
      style={{
        position: 'relative',
        pointerEvents: 'auto'
      }}
    >
      {/* Ripple Background Effect */}
      <motion.div
        className="absolute inset-0 rounded-full bg-orange-400"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.1, 0.3]
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{
          width: '58px',
          height: '58px',
          borderRadius: '50%',
          position: 'absolute',
          top: '-3px',
          left: '-3px'
        }}
      />

      {/* Outer Glow Ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-orange-300"
        animate={{
          scale: [1, 1.4, 1],
          opacity: [0.6, 0, 0.6],
          rotate: [0, 180, 360]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          position: 'absolute',
          top: '-6px',
          left: '-6px'
        }}
      />

      {/* Main Button */}
      <motion.button
        onClick={handleClick}
        whileHover={{
          scale: 1.15,
          backgroundColor: '#ea580c',
          boxShadow: [
            '0 8px 32px rgba(249, 115, 22, 0.4)',
            '0 12px 40px rgba(249, 115, 22, 0.6)',
            '0 8px 32px rgba(249, 115, 22, 0.4)'
          ]
        }}
        whileTap={{
          scale: 0.9,
          transition: { duration: 0.1 }
        }}
        animate={{
          boxShadow: [
            '0 4px 20px rgba(249, 115, 22, 0.3)',
            '0 8px 30px rgba(249, 115, 22, 0.5)',
            '0 4px 20px rgba(249, 115, 22, 0.3)'
          ]
        }}
        transition={{
          boxShadow: {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }
        }}
        className="relative overflow-hidden"
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          border: 'none',
          background: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #dc2626 100%)',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          outline: 'none'
        }}
        title="เพิ่มข้อมูลใหม่"
      >
        {/* Shimmer Effect */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            background: [
              'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
              'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)'
            ],
            x: ['-100%', '100%']
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%'
          }}
        />

        {/* Plus Icon with Animation */}
        <motion.div
          animate={{
            rotate: [0, 90, 180, 270, 360],
            scale: [1, 1.1, 1, 1.1, 1]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            fontSize: '22px',
            fontWeight: '300',
            zIndex: 2,
            position: 'relative'
          }}
        >
          +
        </motion.div>

        {/* Inner Highlight */}
        <div
          style={{
            position: 'absolute',
            top: '6px',
            left: '10px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)',
            zIndex: 1
          }}
        />
      </motion.button>
    </motion.div>,
    portalElement
  );
};

// ✅ FIX v0.7.20: Wrap component with React.memo to prevent toast context re-renders
// Toast state changes in ToastProvider no longer trigger SubmissionDetail re-renders
const SubmissionDetailComponent = function SubmissionDetail({
  formId,
  submissionId,
  onEdit,
  onDelete,
  onBack,
  onAddSubForm,
  onViewSubFormDetail,
  onAddNew,
  onNavigatePrevious,
  onNavigateNext,
  hasPrevious,
  hasNext,
  currentIndex,  // ✅ v0.7.45: Current position in filtered list
  totalCount     // ✅ v0.7.45: Total count of filtered items
}) {
  const { userRole } = useAuth();
  const toast = useEnhancedToast(); // ✅ FIX v0.7.10: Initialize toast for mobile downloads
  const [form, setForm] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [subSubmissions, setSubSubmissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // ✅ FIX v0.7.29-v15: Hide images during navigation to prevent flicker
  // Track version + loading state to completely hide old images
  const imageBlobUrlsRef = useRef({});
  const [imageBlobUrls, setImageBlobUrls] = useState({});
  const [imageBlobUrlsVersion, setImageBlobUrlsVersion] = useState(0);
  const [imagesTransitioning, setImagesTransitioning] = useState(false);

  // Show loading UI only if loading takes longer than 1 second
  const showLoading = useDelayedLoading(loading, 1000);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && hasNext && onNavigateNext) {
      onNavigateNext();
    }
    if (isRightSwipe && hasPrevious && onNavigatePrevious) {
      onNavigatePrevious();
    }
  };

  // Load submission and related data whenever formId or submissionId changes
  // ✅ v0.7.43-fix: Removed loadSubmissionData from deps to prevent duplicate calls
  // loadSubmissionData is already stable via useCallback with [formId, submissionId]
  useEffect(() => {
    loadSubmissionData();
  }, [formId, submissionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ v0.7.30: Progressive Loading - Cancel pending requests on navigation
  useEffect(() => {
    return () => {
      console.log('🛑 [v0.7.30] Navigation detected, cancelling all pending image requests');
      ImageLoadingQueue.cancelAll();
      // Note: BlobUrlCache is managed by LRU policy, no need to clear manually
    };
  }, [submissionId]);

  // ✅ FIX v0.7.29-v16: COMPLETE IMAGE CLEARING - Clear ALL image sources
  // This fixes all 4 flicker causes: blob URLs, ref, state, and presignedUrls
  useEffect(() => {
    console.log('🔄 [v0.7.29-v16] Navigation detected, clearing ALL image sources for submission:', submissionId);

    // STEP 1: Hide ALL images IMMEDIATELY (prevents any rendering)
    setImagesTransitioning(true);

    // STEP 2: Revoke ALL old blob URLs (memory cleanup)
    const currentBlobUrls = { ...imageBlobUrlsRef.current };
    Object.keys(currentBlobUrls).forEach(fileId => {
      const blobUrl = currentBlobUrls[fileId];
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        console.log('🗑️ [v0.7.29-v16] Revoked blob URL for file:', fileId);
      }
    });

    // STEP 3: Clear BOTH ref AND state (removes blob URLs from all sources)
    imageBlobUrlsRef.current = {};
    setImageBlobUrls({});

    // STEP 4: Increment version (forces ImageThumbnail unmount/remount)
    setImageBlobUrlsVersion(prev => {
      const newVersion = prev + 1;
      console.log('✨ [v0.7.29-v16] Version incremented:', newVersion);
      return newVersion;
    });

    // STEP 5: Un-hide after brief delay (allows DOM to settle)
    const timer = setTimeout(() => {
      setImagesTransitioning(false);
      console.log('✅ [v0.7.29-v16] Transition complete, images can render');
    }, 50);  // ✅ v0.7.43-fix: Reduced to 50ms to prevent data display lag

    return () => clearTimeout(timer);
  }, [submissionId]);

  // ❌ REMOVED v0.7.13: Window focus reload - caused unnecessary re-renders and duplicate API calls
  // Users complained about excessive logs and API requests on every click
  // Files are already loaded correctly via useEffect, no need to reload on window focus

  // ✅ v0.7.43-fix: Wrap with useCallback to prevent stale closures during navigation
  const loadSubmissionData = useCallback(async () => {
    console.log('🔄 [v0.7.43-fix] Loading submission data:', { formId, submissionId });
    const abortController = new AbortController();
    setLoading(true);
    try {
      // Load form from API
      const response = await apiClient.getForm(formId);
      const formData = response.data?.form || response.data;

      if (!formData) {
        console.error('❌ Form not found:', formId);
        return;
      }
      setForm(formData);
      console.log('✅ Form loaded from API:', formData?.title);

      // Load submission from API
      const submissionResponse = await apiClient.getSubmission(submissionId);
      const submissionData = submissionResponse.data?.submission || submissionResponse.data;

      if (!submissionData) {
        console.error('Submission not found:', submissionId);
        return;
      }
      setSubmission(submissionData);
      console.log('✅ Submission loaded from API:', submissionData?.id);

      // Load sub form submissions for each sub form
      const subSubmissionsData = {};
      if (formData.subForms && formData.subForms.length > 0) {
        // ✅ CRITICAL FIX: Use submissionData.data.id (main form submission ID from dynamic table)
        // This is the actual parent ID we need for querying sub-forms
        const mainFormSubId = submissionData.data?.id || submissionData.id;

        console.log('🔍 Loading sub-form submissions:', {
          mainFormSubId,
          submissionId,
          submissionDataId: submissionData.data?.id,
          submissionDataKeys: Object.keys(submissionData.data || {})
        });

        for (const subForm of formData.subForms) {
          try {
            // ✅ NEW: Use the new endpoint with main_form_subid
            const subSubsResponse = await apiClient.get(`/submissions/${mainFormSubId}/sub-forms/${subForm.id}`);
            const subSubs = subSubsResponse.data?.subFormSubmissions || subSubsResponse.data?.submissions || subSubsResponse.data || [];

            console.log(`✅ Loaded ${subSubs.length} sub-form submissions for ${subForm.title}:`, {
              subFormId: subForm.id,
              mainFormSubId,
              count: subSubs.length,
              sampleData: subSubs[0]
            });

            subSubmissionsData[subForm.id] = subSubs;
          } catch (apiError) {
            console.error(`❌ Failed to load sub-submissions for subForm ${subForm.id}:`, {
              error: apiError.message,
              response: apiError.response?.data,
              mainFormSubId,
              subFormId: subForm.id
            });
            // Set empty array if API fails
            subSubmissionsData[subForm.id] = [];
          }
        }
      }
      setSubSubmissions(subSubmissionsData);

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('🛑 [v0.7.43-fix] Request aborted:', { formId, submissionId });
        return;
      }
      console.error('❌ Error loading submission data:', error);
    } finally {
      setLoading(false);
      console.log('✅ [v0.7.43-fix] Loading complete:', { formId, submissionId });
    }
  }, [formId, submissionId]); // ✅ v0.7.43-fix: Add dependencies to useCallback


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


  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatFieldValue = (field, value) => {
    // ✅ CRITICAL FIX: If value is wrapped in backend structure, extract it
    if (value && typeof value === 'object' && 'value' in value && 'fieldId' in value) {
      value = value.value;
    }

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
        const maxRating = field.options?.maxRating || 5;
        const ratingValue = Math.max(0, Math.min(Number(value) || 0, maxRating));
        const emptyStars = Math.max(0, maxRating - ratingValue);
        return '⭐'.repeat(ratingValue) + '☆'.repeat(emptyStars);
      case 'lat_long':
        // Handle both {lat, lng} and {x, y} formats
        if (typeof value === 'object' && value !== null) {
          // Check for lat/lng format
          if (value.lat !== undefined && value.lng !== undefined) {
            // ✅ Format coordinates to 4 decimal places for display
            const lat = parseFloat(value.lat).toFixed(4);
            const lng = parseFloat(value.lng).toFixed(4);
            return `${lat}, ${lng}`;
          }
          // Check for x/y format (alternative coordinate format)
          if (value.x !== undefined && value.y !== undefined) {
            // ✅ Format coordinates to 4 decimal places for display
            const x = parseFloat(value.x).toFixed(4);
            const y = parseFloat(value.y).toFixed(4);
            return `${x}, ${y}`;
          }
          // Fallback: convert object to JSON string to prevent React error
          return JSON.stringify(value);
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
      case 'number':
        return formatNumberByContext(value, 'display', field.options);
      case 'phone':
        // Return raw value for phone fields - formatting will be handled in render
        return value;
      case 'url':
        // Return raw value for URL fields - formatting will be handled in render
        return value;
      default:
        return value;
    }
  };

// ✅ FIX v0.7.17: Define FileFieldDisplay OUTSIDE parent component to prevent re-creation
// This prevents it from being recreated on every parent re-render → no unmount/remount → no flicker
const FileFieldDisplay = React.memo(({ field, value, submissionId, toast, imageBlobUrls, imagesTransitioning }) => {
    // ✅ CRITICAL FIX: Declare ALL hooks FIRST before any conditional logic or early returns
    const [files, setFiles] = useState([]);
    const [filesLoading, setFilesLoading] = useState(true);
    // ❌ REMOVED v0.7.16: imageBlobUrls state moved to parent to prevent re-render cycle
    // const [imageBlobUrls, setImageBlobUrls] = useState({});

    // ✅ FIX v0.7.15: Use useRef instead of useState to persist across re-renders
    const loadedFileIdsRef = React.useRef(new Set());
    const loadingFileIdsRef = React.useRef(new Set()); // Track currently loading files

    // ✅ Check for error objects AFTER hooks are declared
    const hasError = value && typeof value === 'object' && 'error' in value;

    // ✅ CRITICAL FIX: Backend wraps values in {value: actualValue, fieldId: '...'}
    // Extract the actual value first
    let actualValue = value;
    if (value && typeof value === 'object' && 'value' in value && 'fieldId' in value) {
      actualValue = value.value;
    }

    const isEmpty = !actualValue && actualValue !== 0;

    // Extract file IDs from various formats
    let fileIds = [];
    if (!hasError && Array.isArray(actualValue)) {
      // If it's already an array of IDs or objects
      fileIds = actualValue.map(item => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item?.id) return item.id;
        return null;
      }).filter(id => id);
    } else if (!hasError && typeof actualValue === 'string') {
      // Single file ID as string
      fileIds = [actualValue];
    } else if (!hasError && typeof actualValue === 'object' && actualValue?.id) {
      // ✅ CRITICAL FIX: Single file object (from SubmissionService line 603-609)
      // When there's only 1 file, it's stored as {id, name, type, size} instead of [{...}]
      fileIds = [actualValue.id];
    }

    // ❌ REMOVED v0.7.13: Debug logging - caused 6+ logs per interaction
    // console.log('📁 FileFieldDisplay:', {...})

    // ✅ FIX v0.7.14: Stable file IDs string to prevent excessive re-renders
    const fileIdsKey = fileIds && fileIds.length > 0 ? fileIds.sort().join(',') : '';

    useEffect(() => {
      // ✅ FIX v0.7.15: Check if already loaded OR currently loading using Ref
      if (fileIdsKey && (loadedFileIdsRef.current.has(fileIdsKey) || loadingFileIdsRef.current.has(fileIdsKey))) {
        console.log('✅ [v0.7.15] Skipping duplicate load:', fileIdsKey);
        return;
      }

      // Mark as loading
      loadingFileIdsRef.current.add(fileIdsKey);

      const loadFiles = async () => {
        // ✅ Skip loading if there's an error
        if (hasError) {
          setFilesLoading(false);
          return;
        }

        if (!fileIds || fileIds.length === 0) {
          setFilesLoading(false);
          return;
        }

        setFilesLoading(true);

        try {
          // ✅ OPTIMIZATION: If actualValue already has file info (name, type, size), use it directly
          // This happens when file is stored as single object with all metadata
          if (!hasError && typeof actualValue === 'object' && actualValue?.id && actualValue?.name) {
            const fileWithUrl = await fileServiceAPI.getFileWithUrl(actualValue.id);
            setFiles([{
              id: actualValue.id,
              name: actualValue.name,
              type: actualValue.type,
              size: actualValue.size,
              uploadedAt: actualValue.uploadedAt,
              isImage: actualValue.isImage || actualValue.type?.startsWith('image/'),
              presignedUrl: fileWithUrl.presignedUrl
            }]);
            setFilesLoading(false);
            // ✅ FIX v0.7.15: Mark as loaded using Ref
            loadingFileIdsRef.current.delete(fileIdsKey);
            loadedFileIdsRef.current.add(fileIdsKey);
            return;
          }

          // Try to get files for this submission and field
          const submissionFiles = await fileServiceAPI.getSubmissionFiles(submissionId);

          // Filter files for this specific field
          const fieldFiles = submissionFiles
            .filter(file => file.fieldId === field.id || fileIds.includes(file.id))
            .map(fileData => ({
              id: fileData.id,
              name: fileData.originalName || fileData.filename,
              type: fileData.mimeType,
              size: fileData.size,
              uploadedAt: fileData.uploadedAt,
              isImage: fileServiceAPI.isImage(fileData.mimeType),
              presignedUrl: fileData.presignedUrl
            }));

          setFiles(fieldFiles);
          // ✅ FIX v0.7.15: Mark as loaded using Ref
          loadingFileIdsRef.current.delete(fileIdsKey);
          loadedFileIdsRef.current.add(fileIdsKey);
        } catch (error) {
          console.error('❌ Error loading files from MinIO:', error);
          // Fallback: try loading files individually by ID
          try {
            const loadedFiles = await Promise.all(
              fileIds.map(async (fileId) => {
                try {
                  const fileData = await fileServiceAPI.getFileWithUrl(fileId);
                  return {
                    id: fileData.id,
                    name: fileData.originalName || fileData.filename,
                    type: fileData.mimeType,
                    size: fileData.size,
                    uploadedAt: fileData.uploadedAt,
                    isImage: fileServiceAPI.isImage(fileData.mimeType),
                    presignedUrl: fileData.presignedUrl
                  };
                } catch (err) {
                  console.error('Error loading individual file:', fileId, err);
                  return null;
                }
              })
            );

            const validFiles = loadedFiles.filter(file => file);
            setFiles(validFiles);
            // ✅ FIX v0.7.15: Mark as loaded using Ref
            loadingFileIdsRef.current.delete(fileIdsKey);
            loadedFileIdsRef.current.add(fileIdsKey);
          } catch (fallbackError) {
            console.error('❌ Fallback file loading failed:', fallbackError);
            setFiles([]);
            // ✅ FIX v0.7.15: Still mark as attempted even if failed
            loadingFileIdsRef.current.delete(fileIdsKey);
          }
        } finally {
          setFilesLoading(false);
        }
      };

      loadFiles();
    }, [fileIdsKey, submissionId, field.id, hasError, actualValue, fileIds]); // ✅ FIX v0.7.15: Complete dependencies

    // ✅ FIX v0.7.17: Use useMemo with JSON.stringify for truly stable comparison
    // This prevents useEffect from running when parent re-renders but file IDs haven't changed
    const fileIdsString = React.useMemo(() => {
      if (!files || files.length === 0) return '';
      return files.map(f => f.id).sort().join(',');
    }, [JSON.stringify(files?.map(f => f.id) || [])]);

    // ✅ Load authenticated image blob URLs for display (fixes 401 Unauthorized)
    // ✅ FIX v0.7.15: Track loaded blob URLs to prevent duplicate loading
    const loadedBlobUrlsRef = React.useRef(new Set());

    useEffect(() => {
      const loadAuthenticatedImages = async () => {
        // ✅ FIX: Use API_CONFIG to get consistent token key
        const token = localStorage.getItem(API_CONFIG.token.storageKey);

        // ✅ FIX v0.7.18: Debug logging for 401 error
        console.log('🔐 [SubmissionDetail] Image auth check:', {
          hasToken: !!token,
          tokenKey: API_CONFIG.token.storageKey,
          tokenLength: token?.length,
          filesCount: files?.length
        });

        if (!token || !files || files.length === 0) {
          if (!token) {
            console.error('❌ [SubmissionDetail] NO TOKEN found in localStorage!', {
              storageKey: API_CONFIG.token.storageKey,
              allKeys: Object.keys(localStorage)
            });
          }
          return;
        }

        // Iterate through all files in this field
        for (const file of files) {
          // ✅ FIX v0.7.17: Only load if we DON'T already have a blob URL AND haven't loaded before
          if (file.isImage && file.id && !imageBlobUrlsRef.current[file.id] && !loadedBlobUrlsRef.current.has(file.id)) {
            // ✅ Mark as loading to prevent duplicates
            loadedBlobUrlsRef.current.add(file.id);
            try {
              const streamUrl = getFileStreamURL(file.id);

              // ✅ FIX v0.7.18: Debug logging for fetch request
              console.log('🖼️ [SubmissionDetail] Fetching image stream:', {
                fileId: file.id,
                streamUrl,
                hasToken: !!token,
                tokenPreview: token?.substring(0, 20) + '...'
              });

              const response = await fetch(streamUrl, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (response.ok) {
                const blob = await response.blob();
                // ✅ FIX v0.7.29-v14: Write to BOTH ref AND state
                // Ref for stable reference, state to trigger immediate re-render with new images
                const blobUrl = URL.createObjectURL(blob);
                imageBlobUrlsRef.current[file.id] = blobUrl;
                setImageBlobUrls(prev => ({ ...prev, [file.id]: blobUrl }));
                console.log('✅ [v0.7.29-v14] Image loaded successfully:', file.id);
              } else {
                console.error(`❌ [SubmissionDetail] Failed to load image ${file.id}: ${response.status} ${response.statusText}`);
              }
            } catch (error) {
              console.error(`❌ [SubmissionDetail] Error loading image ${file.id}:`, error);
            }
          }
        }
      };

      loadAuthenticatedImages();

      // ✅ FIX v0.7.12: NO cleanup function - keep blob URLs stable
      // Images must display at all times on mobile (user requirement)
      // Blob URLs will be revoked automatically when component unmounts
    }, [fileIdsString]); // ✅ FIX v0.7.17: Only depend on fileIdsString, check imageBlobUrls inside loop

    // ✅ FIX v0.7.10: Mobile download handler with toast notifications
    const handleFileDownload = async (file) => {
      const isMobile = window.innerWidth < 768;

      if (isMobile) {
        toast.loading('กำลังเตรียมดาวน์โหลด...', { id: file.id });
      }

      try {
        const downloadUrl = `${API_CONFIG.baseURL}/files/${file.id}/download`;
        // ✅ FIX: Use API_CONFIG to get consistent token key
        const token = localStorage.getItem(API_CONFIG.token.storageKey);

        const response = await fetch(downloadUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`Download failed: ${response.status}`);
        }

        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = file.name || 'download';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.URL.revokeObjectURL(blobUrl);

        // ✅ Success toast (mobile only)
        if (isMobile) {
          toast.success('ดาวน์โหลดสำเร็จ!', { id: file.id, duration: 2000 });
        }
      } catch (error) {
        console.error('❌ Download failed:', error);

        // ✅ Error toast
        if (isMobile) {
          toast.error('ดาวน์โหลดไม่สำเร็จ', { id: file.id });
        } else {
          alert('ไม่สามารถดาวน์โหลดไฟล์ได้: ' + error.message);
        }
      }
    };

    // ✅ FIX v0.7.28: Add null check before rendering to prevent "Cannot read properties of null" errors
    if (!field) {
      console.warn('FileFieldDisplay received null field prop');
      return null;
    }

    return (
      <div className="space-y-3">
        <label className="block text-sm font-bold text-orange-300">
          {field.title}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </label>
        {/* ✅ FIX v0.7.10: Add min-height to prevent layout shift when content changes */}
        {/* ✅ FIX v0.7.28: Reduce container height by 50% (200px → 100px) */}
        <div className={cn(
          'w-full border border-border/50 rounded-lg p-4 backdrop-blur-sm',  // ✅ FIX v0.7.29-v12: Removed relative positioning (no overlay)
          'min-h-[100px]',  // ✅ FIX v0.7.28: 50% reduction for compact display
          isEmpty || files.length === 0 || hasError
            ? 'bg-muted/40'
            : 'bg-background/50'
        )}>
          {/* ❌ REMOVED v0.7.29-v12: Loading overlay - caused infinite loading + didn't fix stale images */}
          {hasError ? (
            <div className="text-center py-6 text-muted-foreground">
              <div className="text-4xl mb-2 opacity-30">⚠️</div>
              <div className="text-sm font-medium text-orange-500">ไม่สามารถโหลดไฟล์ได้</div>
              <div className="text-xs mt-1">{value.error || 'ข้อมูลไฟล์สูญหาย'}</div>
            </div>
          ) : files.length > 0 && !imagesTransitioning && (
            // ✅ FIX v0.7.29-v15: Hide images during navigation to prevent old images from flickering
            // Show files immediately when available AND not transitioning
            <div className="space-y-3">
              {field.type === 'image_upload' ? (
                // ✅ Use ImageThumbnail component with authenticated blob URLs
                // Provides: modal preview, download button, responsive horizontal layout on desktop
                // ✅ LAYOUT: Vertical stack for horizontal thumbnail+info layout
                // ✅ FIX v0.7.29-v4: Add sm:max-w-fit to prevent expansion on tablet/desktop
                // ✅ FIX v0.7.31: Add responsive padding - none on mobile, 200px left/right on desktop (md:px-[200px])
                <div className="space-y-2 w-full sm:max-w-fit md:px-[200px]">
                  {files.map((file, index) => (
                    <ImageThumbnail
                      key={`${file.id}-${imageBlobUrlsVersion}`}  // ✅ FIX v0.7.29-v13: Force unmount on navigation
                      file={file}
                      blobUrl={imageBlobUrls[file.id] || (!imagesTransitioning ? file.presignedUrl : null)}  // ✅ FIX v0.7.29-v16: Prevent presignedUrl during transition
                      size="lg"
                      showFileName={true}
                      onDownload={handleFileDownload}  // ✅ FIX v0.7.10: Pass download handler with toast
                      adaptive={true}  // ✅ FIX v0.7.23: Enable adaptive sizing (landscape 16:9, portrait 50vw)
                    />
                  ))}
                </div>
              ) : (
                <FileDisplay
                  value={files}
                  maxDisplay={10}
                  onFileClick={async (file) => {
                    console.log('FileDisplay click:', file);
                    if (file && file.presignedUrl) {
                      // Use presigned URL for download
                      const link = document.createElement('a');
                      link.href = file.presignedUrl;
                      link.download = file.name;
                      link.click();
                    } else {
                      console.warn('Invalid file object for download:', file);
                    }
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    );
}, (prevProps, nextProps) => {
  // ✅ FIX v0.7.19: Custom comparison function for React.memo
  // ✅ FIX v0.7.28: Add null checks to prevent "Cannot read properties of null" errors
  // ✅ FIX v0.7.29-v15: Re-render when imagesTransitioning changes to hide/show images

  // If either field is null, they must both be null to be equal
  if (!prevProps.field || !nextProps.field) {
    return prevProps.field === nextProps.field;
  }

  return (
    prevProps.field.id === nextProps.field.id &&
    prevProps.submissionId === nextProps.submissionId &&
    JSON.stringify(prevProps.value) === JSON.stringify(nextProps.value) &&
    prevProps.imagesTransitioning === nextProps.imagesTransitioning  // ✅ FIX v0.7.29-v15: Re-render when transitioning state changes
    // ✅ FIX v0.7.19: imageBlobUrls is ref.current (same reference ALWAYS), no comparison needed
    // ✅ FIX v0.7.19: toast is stable callback, no comparison needed
  );
});

  // ✅ FIX v0.7.29-v15: Memoize FileFieldDisplay with transitioning state
  // imagesTransitioning triggers immediate hiding of all images during navigation
  const memoizedFileFieldDisplays = React.useMemo(() => {
    const fileFields = {};
    (form?.fields || [])
      .filter(field => field.type === 'file_upload' || field.type === 'image_upload')
      .forEach(field => {
        fileFields[field.id] = (
          <FileFieldDisplay
            key={field.id}
            field={field}
            submissionId={submissionId}
            toast={toast}
            imageBlobUrls={imageBlobUrls}  // ✅ Use state instead of ref for immediate updates
            imagesTransitioning={imagesTransitioning}  // ✅ FIX v0.7.29-v15: Pass transitioning flag to hide images during navigation
          />
        );
      });
    return fileFields;
  }, [form?.fields, submissionId, imageBlobUrls, imageBlobUrlsVersion, imagesTransitioning]);

  // ✅ v0.7.40: Field map for conditional formatting formula evaluation
  const fieldMap = useMemo(() => {
    const map = {};
    (form?.fields || []).forEach(field => {
      map[field.id] = field;
    });
    return map;
  }, [form?.fields]);

  const renderFieldValue = (field, value) => {
    const isEmpty = !value && value !== 0;

    // ✅ v0.7.38: Hide fields with no data (empty, '-', or 'ไม่มีข้อมูล')
    if (isEmpty || value === '-' || value === 'ไม่มีข้อมูล') {
      return null; // Don't render empty fields
    }

    // Special handling for file upload fields - use component with hooks
    if (field.type === 'file_upload' || field.type === 'image_upload') {
      // ✅ FIX v0.7.21: Return memoized component instead of creating new one
      // Pass value as separate prop to force re-render only when value changes
      const MemoizedComponent = memoizedFileFieldDisplays[field.id];
      if (MemoizedComponent) {
        // Clone element with updated value prop
        return React.cloneElement(MemoizedComponent, { value });
      }
      // Fallback if not memoized (shouldn't happen)
      return <FileFieldDisplay key={field.id} field={field} value={value} submissionId={submissionId} toast={toast} imageBlobUrls={imageBlobUrlsRef.current} />;
    }

    // Special handling for LatLong fields
    if (field.type === 'lat_long') {
      // ✅ v0.8.0: Enhanced coordinate validation supporting both object and string formats
      let lat = null;
      let lng = null;

      // Parse coordinate data from different formats
      if (value) {
        if (typeof value === 'object') {
          // Object format: {lat: x, lng: y} or {x: lat, y: lng}
          lat = parseFloat(value.lat || value.x);
          lng = parseFloat(value.lng || value.y);
        } else if (typeof value === 'string') {
          // String format: "lat, lng" (from Google Sheets import)
          const parts = value.split(',').map(s => s.trim());
          if (parts.length === 2) {
            lat = parseFloat(parts[0]);
            lng = parseFloat(parts[1]);
          }
        }
      }

      // Validate coordinate ranges: lat [-90, 90], lng [-180, 180]
      const isValidLat = lat !== null && !isNaN(lat) && lat >= -90 && lat <= 90;
      const isValidLng = lng !== null && !isNaN(lng) && lng >= -180 && lng <= 180;
      const isValidCoordinates = isValidLat && isValidLng;

      return (
        <div key={field.id} className="space-y-3">
          <label className="block text-sm font-semibold text-orange-300/90">
            {field.title}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </label>
          <div className={`w-full border rounded-lg backdrop-blur-sm ${
            isEmpty || !isValidCoordinates
              ? 'border-border/30 bg-muted/20'
              : 'border-orange-400/40 bg-background/40'
          }`}>
            {isValidCoordinates ? (
              <div className="p-4 space-y-4">
                {/* Coordinates Display with Google Maps Link */}
                <div className="flex items-center justify-between bg-background/60 rounded-md p-3 border border-border/20">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm font-medium text-foreground/90">
                      {lat.toFixed(6)}, {lng.toFixed(6)}
                    </span>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${lat},${lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-500/90 hover:bg-orange-600 text-white text-sm font-medium rounded-md transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    <span>เปิดใน Google Maps</span>
                  </a>
                </div>
                {/* Map Display */}
                <LocationMap
                  latitude={lat}
                  longitude={lng}
                  responsive={true}
                  showCoordinates={false}
                  className="w-full"
                />
              </div>
            ) : (
              <div className="p-4 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 mb-3">
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-red-500 font-medium mb-1">
                  {isEmpty ? 'ไม่มีพิกัด' : 'พิกัดไม่ถูกต้อง'}
                </p>
                {value && !isValidCoordinates && (
                  <div className="text-xs text-muted-foreground/70 mt-2 font-mono bg-background/50 px-3 py-2 rounded border border-border/20">
                    ข้อมูล: {typeof value === 'object' ? JSON.stringify(value) : value}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Special handling for email fields - simple format with clickable links
    if (field.type === 'email') {
      const isValidEmail = value && typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

      return (
        <div key={field.id} className="space-y-2">
          <label className="block text-sm font-semibold text-orange-300/90">
            {field.title}{field.required && <span className="text-destructive ml-1">*</span>}
          </label>
          <div className={`px-3 py-2 rounded-md bg-background/30 border border-border/20 ${
            isEmpty ? 'text-muted-foreground/60 italic' : ''
          }`}>
            {isValidEmail ? (
              <MaskedValue
                value={value}
                fieldTitle={field.title}
                fieldType={field.type}
                className="text-primary font-medium break-all"
              />
            ) : (
              <span className="text-foreground/90 font-medium">{value || 'ไม่มีข้อมูล'}</span>
            )}
          </div>
        </div>
      );
    }

    // Special handling for phone fields - simple format with clickable links
    const isPhoneField = field.type === 'phone' ||
                        shouldFormatAsPhone(value, field.type) ||
                        field.title?.toLowerCase().includes('เบอร์') ||
                        field.title?.toLowerCase().includes('โทร') ||
                        field.title?.toLowerCase().includes('phone') ||
                        field.title?.toLowerCase().includes('tel') ||
                        field.title?.toLowerCase().includes('mobile') ||
                        field.title?.toLowerCase().includes('contact');

    if (isPhoneField) {
      const phoneProps = createPhoneLink(value, {
        includeIcon: true,
        size: 'md',
        showTooltip: true
      });

      const formattedPhone = formatPhoneDisplay(value);

      return (
        <div key={field.id} className="space-y-2">
          <label className="block text-sm font-semibold text-orange-300/90">
            {field.title}{field.required && <span className="text-destructive ml-1">*</span>}
          </label>
          <div className={`px-3 py-2 rounded-md bg-background/30 border border-border/20 ${
            isEmpty ? 'text-muted-foreground/60 italic' : ''
          }`}>
            {phoneProps.isClickable ? (
              <MaskedValue
                value={value}
                fieldTitle={field.title}
                fieldType={field.type}
                className="text-primary font-medium break-all"
              />
            ) : (
              <span className="text-foreground/90 font-medium">{formattedPhone || value || 'ไม่มีข้อมูล'}</span>
            )}
          </div>
        </div>
      );
    }

    // Special handling for URL/website fields - simple format with clickable links
    const isUrlField = field.type === 'url' ||
                      field.title?.toLowerCase().includes('url') ||
                      field.title?.toLowerCase().includes('link') ||
                      field.title?.toLowerCase().includes('เว็บ') ||
                      field.title?.toLowerCase().includes('website') ||
                      field.title?.toLowerCase().includes('web') ||
                      field.title?.toLowerCase().includes('site');

    if (isUrlField) {
      const formatUrlForDisplay = (url) => {
        if (!url || typeof url !== 'string') return null;
        const trimmedUrl = url.trim();
        if (!trimmedUrl) return null;

        // If it doesn't start with protocol, add https://
        if (!/^https?:\/\//i.test(trimmedUrl) && !/^ftp:\/\//i.test(trimmedUrl)) {
          return `https://${trimmedUrl}`;
        }
        return trimmedUrl;
      };

      const validUrl = formatUrlForDisplay(value);

      return (
        <div key={field.id} className="space-y-2">
          <label className="block text-sm font-semibold text-orange-300/90">
            {field.title}{field.required && <span className="text-destructive ml-1">*</span>}
          </label>
          <div className={`px-3 py-2 rounded-md bg-background/30 border border-border/20 ${
            isEmpty ? 'text-muted-foreground/60 italic' : ''
          }`}>
            {validUrl ? (
              <a
                href={validUrl}
                className="text-primary font-medium break-all hover:text-orange-400 transition-colors inline-flex items-center gap-2"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span>{value}</span>
              </a>
            ) : (
              <span className="text-foreground/90 font-medium">{value || 'ไม่มีข้อมูล'}</span>
            )}
          </div>
        </div>
      );
    }

    // Standard handling for other field types
    const rawFormattedValue = formatFieldValue(field, value);

    // Defensive conversion for objects to prevent React rendering errors
    const formattedValue = (() => {
      if (rawFormattedValue && typeof rawFormattedValue === 'object' && !Array.isArray(rawFormattedValue)) {
        // If it's an object with toString method, use it
        if (typeof rawFormattedValue.toString === 'function' && rawFormattedValue.toString !== Object.prototype.toString) {
          return rawFormattedValue.toString();
        }
        // If it's a file object with fileName, use that
        if (rawFormattedValue.fileName) {
          return rawFormattedValue.fileName;
        }
        // Otherwise convert to JSON string to prevent React error
        return JSON.stringify(rawFormattedValue);
      }
      return rawFormattedValue;
    })();

    // ✅ v0.7.40: Apply conditional formatting
    const conditionalStyle = getConditionalStyle(
      form?.settings,
      field.id,
      value,
      submission?.data || {},
      fieldMap
    );

    return (
      <div key={field.id} className="space-y-2">
        {/* ✅ v0.7.37: Improved typography with better spacing */}
        <label className="block text-sm font-semibold text-orange-300/90">
          {field.title}{field.required && <span className="text-destructive ml-1">*</span>}
        </label>
        <div
          className={`text-base font-medium px-3 py-2 rounded-md border ${
            isEmpty
              ? 'text-muted-foreground/60 italic bg-background/30 border-border/20'
              : 'text-foreground/90'
          }`}
          style={{
            ...conditionalStyle,
            // ✅ v0.7.40: Apply conditional background with fallback
            backgroundColor: conditionalStyle.backgroundColor || 'rgb(var(--background) / 0.3)',
            borderColor: conditionalStyle.backgroundColor ? 'transparent' : 'rgb(var(--border) / 0.2)'
          }}
        >
          {formattedValue || 'ไม่มีข้อมูล'}
        </div>
      </div>
    );
  };

  const renderSubFormSubmissionList = (subForm) => {
    const allSubSubs = subSubmissions[subForm.id] || [];

    // ✅ Sort by submittedAt (newest first) and take only latest 10 records
    const subSubs = [...allSubSubs]
      .sort((a, b) => {
        const dateA = new Date(a.submittedAt);
        const dateB = new Date(b.submittedAt);
        return dateB - dateA; // Descending order (newest first)
      })
      .slice(0, 10); // Take only 10 latest records

    if (subSubs.length === 0) {
      return (
        <div className="py-8 flex flex-col items-center">
          <div className="text-4xl mb-4 opacity-50">📝</div>
          <p className="text-muted-foreground mb-4 text-center">ยังไม่มีข้อมูลใน{subForm.title}</p>
          <button
            onClick={() => handleAddSubForm(subForm.id)}
            className="btn-orange-rounded inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium"
            style={{
              transition: 'background-color 200ms ease-out'
            }}
          >
            <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5" />
            <span>เพิ่ม{subForm.title}</span>
          </button>
        </div>
      );
    }

    // ✅ Filter fields by showInTable setting, show up to 5 fields (max allowed)
    // Support both camelCase (showInTable) and snake_case (show_in_table) from backend
    // ✅ FIX v0.7.33: Sort by order before displaying in table
    const visibleFields = (subForm.fields || [])
      .filter(field => field.showInTable === true || field.show_in_table === true)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const maxDisplayFields = 5; // Maximum fields to display in table
    const displayFields = visibleFields.slice(0, maxDisplayFields);
    const hasMoreFields = visibleFields.length > maxDisplayFields;

    // ❌ REMOVED v0.7.13: Debug logging - caused excessive console spam (27+ logs per click)
    // console.log('🔍 Sub-form table debug:', {...})

    return (
      <div className="space-y-2">
        <style>{`
          /* ✅ Simple hover effect for sub-form table - only change background color */
          .subform-table-override tbody tr {
            cursor: pointer;
          }

          .subform-table-override tbody tr:hover {
            background-color: rgb(229 231 235) !important;
          }

          .dark .subform-table-override tbody tr:hover {
            background-color: rgb(55 65 81) !important;
          }

          /* ✅ ULTIMATE FIX v3: Square corners except first/last column headers */
          .subform-content-no-radius,
          .subform-table-container,
          .subform-table-container *:not(th:first-child):not(th:last-child),
          .subform-table-override,
          .subform-table-override thead,
          .subform-table-override thead tr,
          .subform-table-override tbody,
          .subform-table-override tbody tr,
          .subform-table-override tbody td,
          .subform-table-override tbody td:first-child,
          .subform-table-override tbody td:last-child {
            border-radius: 0 !important;
            -webkit-border-radius: 0 !important;
            -moz-border-radius: 0 !important;
            -ms-border-radius: 0 !important;
            border-top-left-radius: 0 !important;
            border-top-right-radius: 0 !important;
            border-bottom-left-radius: 0 !important;
            border-bottom-right-radius: 0 !important;
            border-start-start-radius: 0 !important;
            border-start-end-radius: 0 !important;
            border-end-start-radius: 0 !important;
            border-end-end-radius: 0 !important;
          }

          /* ✅ Middle column headers - all corners square */
          .subform-table-override thead th:not(:first-child):not(:last-child) {
            border-radius: 0 !important;
            border-top-left-radius: 0 !important;
            border-top-right-radius: 0 !important;
            border-bottom-left-radius: 0 !important;
            border-bottom-right-radius: 0 !important;
          }

          /* ✅ FIRST column header - rounded top-left corner - HIGHEST PRIORITY */
          table.subform-table-override thead tr th:first-child,
          .subform-table-override thead tr th:first-child,
          .subform-table-override thead th:first-child {
            border-radius: 0 !important;
            border-top-left-radius: 16px !important;
            -webkit-border-top-left-radius: 16px !important;
            -moz-border-radius-topleft: 16px !important;
            border-top-right-radius: 0 !important;
            border-bottom-left-radius: 0 !important;
            border-bottom-right-radius: 0 !important;
            border-start-start-radius: 16px !important;
          }

          /* ✅ LAST column header - rounded top-right corner - HIGHEST PRIORITY */
          table.subform-table-override thead tr th:last-child,
          .subform-table-override thead tr th:last-child,
          .subform-table-override thead th:last-child {
            border-radius: 0 !important;
            border-top-left-radius: 0 !important;
            border-top-right-radius: 16px !important;
            -webkit-border-top-right-radius: 16px !important;
            -moz-border-radius-topright: 16px !important;
            border-bottom-left-radius: 0 !important;
            border-bottom-right-radius: 0 !important;
            border-start-end-radius: 16px !important;
          }

          /* ✅ CRITICAL: Remove overflow hidden from parent that clips content */
          .glass-container.subform-card-no-radius {
            overflow: visible !important;
          }

          .subform-table-container {
            overflow-x: auto !important;
            overflow-y: visible !important;
            border-radius: 0 !important;
          }

        `}</style>
        <div className="flex items-center justify-center mb-3">
          <button
            onClick={() => handleAddSubForm(subForm.id)}
            className="btn-orange-rounded inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium"
            style={{
              transition: 'background-color 200ms ease-out'
            }}
          >
            <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5" />
            <span>เพิ่ม{subForm.title}</span>
          </button>
        </div>

        {/* Table display similar to Submission List */}
        <div className="overflow-x-auto subform-table-container" style={{
          borderRadius: 0,
          WebkitBorderRadius: 0,
          MozBorderRadius: 0,
          overflow: 'auto'
        }}>
          <table className="w-full subform-table-override" style={{
            borderRadius: 0,
            borderCollapse: 'separate',
            borderSpacing: 0
          }}>
            <thead>
              <tr className="border-b-2 border-primary/20 bg-muted/40 sticky top-0 z-10" style={{
                borderRadius: 0,
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0
              }}>
                {displayFields.map((field, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === displayFields.length - 1 && !hasMoreFields && displayFields.length >= 5;

                  return (
                    <th
                      key={field.id}
                      className="text-center py-5 px-4 text-[16px] sm:text-[17px] md:text-[18px] font-bold text-foreground uppercase tracking-wide bg-gradient-to-b from-muted/50 to-muted/30 shadow-sm"
                      style={{
                        borderRadius: '0px',
                        borderTopLeftRadius: isFirst ? '16px' : '0px',
                        WebkitBorderTopLeftRadius: isFirst ? '16px' : '0px',
                        MozBorderRadiusTopleft: isFirst ? '16px' : '0px',
                        borderTopRightRadius: isLast ? '16px' : '0px',
                        WebkitBorderTopRightRadius: isLast ? '16px' : '0px',
                        MozBorderRadiusTopright: isLast ? '16px' : '0px',
                        borderBottomLeftRadius: '0px',
                        borderBottomRightRadius: '0px'
                      }}
                    >
                      {field.title}
                    </th>
                  );
                })}
                {hasMoreFields && (
                  <th
                    className="text-center py-5 px-4 text-[16px] sm:text-[17px] md:text-[18px] font-bold text-foreground uppercase tracking-wide bg-gradient-to-b from-muted/50 to-muted/30 shadow-sm"
                    style={{
                      borderRadius: '0px',
                      borderTopLeftRadius: '0px',
                      borderTopRightRadius: '16px',
                      WebkitBorderTopRightRadius: '16px',
                      MozBorderRadiusTopright: '16px',
                      borderBottomLeftRadius: '0px',
                      borderBottomRightRadius: '0px'
                    }}
                  >
                    อื่นๆ
                  </th>
                )}
                {displayFields.length < 5 && (
                  <th
                    className="text-center py-5 px-4 text-[16px] sm:text-[17px] md:text-[18px] font-bold text-foreground uppercase tracking-wide bg-gradient-to-b from-muted/50 to-muted/30 shadow-sm"
                    style={{
                      borderRadius: '0px',
                      borderTopLeftRadius: '0px',
                      borderTopRightRadius: hasMoreFields ? '0px' : '16px',
                      WebkitBorderTopRightRadius: hasMoreFields ? '0px' : '16px',
                      MozBorderRadiusTopright: hasMoreFields ? '0px' : '16px',
                      borderBottomLeftRadius: '0px',
                      borderBottomRightRadius: '0px'
                    }}
                  >
                    วันที่บันทึก
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {subSubs.map((subSub, index) => (
                <tr
                  key={subSub.id}
                  className="border-b border-border/20 cursor-pointer transition-all duration-300 hover:bg-primary/5 hover:shadow-md hover:border-primary/30"
                  onClick={() => handleViewSubFormDetail(subForm.id, subSub.id)}
                >
                  {displayFields.map((field) => {
                    // 🔧 CRITICAL FIX: Backend returns data with field_id as key, extract value properly
                    let rawValue = subSub.data?.[field.id];
                    let value = rawValue;

                    // Backend returns format: {fieldId, fieldTitle, fieldType, value}
                    // Extract the actual value if it's wrapped in an object
                    if (rawValue && typeof rawValue === 'object' && 'value' in rawValue) {
                      value = rawValue.value;
                    }

                    // ❌ REMOVED v0.7.13: Field value debug logging - caused 27+ logs per render
                    // console.log(`🔍 SubForm Field "${field.title}" ...`)

                    // ✅ Display file names in table for file/image upload fields
                    if (field.type === 'file_upload' || field.type === 'image_upload') {
                      // ✅ CRITICAL FIX: Value could be:
                      // 1. File object: {id, name, type, size} - Use name directly
                      // 2. File ID (UUID string) - Need to fetch file info from backend
                      // 3. File path string: "uploads/filename.jpg" - Extract filename

                      if (!value || value === '-') {
                        return (
                          <td key={field.id} className="py-4 px-3 sm:py-5 sm:px-4 text-[14px] sm:text-[15px] text-center">
                            -
                          </td>
                        );
                      }

                      let displayName = '-';
                      let fullFileName = '';

                      // Case 1: Value is a file object with name property
                      if (typeof value === 'object' && value?.name) {
                        fullFileName = value.name;
                        displayName = value.name;
                      }
                      // Case 2: Value is a string (could be file path or UUID)
                      else if (typeof value === 'string') {
                        // Check if it's a UUID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
                        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

                        if (isUUID) {
                          // It's a file ID - show a loading indicator or "File" text
                          // In a real scenario, you'd fetch the file info from backend
                          displayName = '📎 ไฟล์';
                          fullFileName = value; // Use ID as fallback
                        } else {
                          // It's a file path - extract filename
                          const parts = value.split('/');
                          fullFileName = parts[parts.length - 1];
                          displayName = fullFileName;
                        }
                      }

                      // ✅ Truncate long filenames to max 8 characters + extension for table display
                      if (displayName && displayName.length > 12 && !displayName.startsWith('📎')) {
                        const ext = displayName.split('.').pop();
                        const nameWithoutExt = displayName.substring(0, displayName.lastIndexOf('.'));
                        // Shorten to 8 characters max
                        displayName = nameWithoutExt.substring(0, 8) + '...' + ext;
                      }

                      return (
                        <td key={field.id} className="py-4 px-3 sm:py-5 sm:px-4 text-[14px] sm:text-[15px] text-center">
                          <div className="flex items-center justify-center gap-1">
                            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="truncate" title={fullFileName}>
                              {displayName}
                            </span>
                          </div>
                        </td>
                      );
                    }

                    // Handle email fields in table
                    if (field.type === 'email') {
                      const isValidEmail = value && typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

                      return (
                        <td key={field.id} className="py-4 px-3 sm:py-5 sm:px-4 text-[14px] sm:text-[15px] text-center">
                          {isValidEmail ? (
                            <div className="flex items-center justify-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <a
                                href={`mailto:${value}`}
                                className="text-primary font-medium cursor-pointer"
                                title={`ส่งอีเมลไปยัง ${value}`}
                                style={{ pointerEvents: 'auto' }}
                                target="_blank"
                  rel="noopener noreferrer"
                              >
                                {value.length > 20 ? `${value.substring(0, 20)}...` : value}
                              </a>
                            </div>
                          ) : (
                            <span>{value || '-'}</span>
                          )}
                        </td>
                      );
                    }

                    // Handle phone fields in table - comprehensive detection
                    const isPhoneFieldTable = field.type === 'phone' ||
                                            shouldFormatAsPhone(value, field.type) ||
                                            field.title?.toLowerCase().includes('เบอร์') ||
                                            field.title?.toLowerCase().includes('โทร') ||
                                            field.title?.toLowerCase().includes('phone') ||
                                            field.title?.toLowerCase().includes('tel') ||
                                            field.title?.toLowerCase().includes('mobile') ||
                                            field.title?.toLowerCase().includes('contact');

                    if (isPhoneFieldTable) {
                      const phoneProps = createPhoneLink(value, {
                        includeIcon: true,
                        size: 'xs',
                        showTooltip: true
                      });

                      return (
                        <td key={field.id} className="py-4 px-3 sm:py-5 sm:px-4 text-[14px] sm:text-[15px] text-center">
                          {phoneProps.isClickable ? (
                            <div className="flex items-center justify-center gap-1">
                              <PhoneIcon />
                              <a
                                href={phoneProps.telLink}
                                className="text-primary"
                                title={phoneProps.title}
                                aria-label={phoneProps.ariaLabel}
                                target="_blank"
                  rel="noopener noreferrer"
                              >
                                {phoneProps.display}
                              </a>
                            </div>
                          ) : (
                            <span>{formatPhoneDisplay(value) || value || '-'}</span>
                          )}
                        </td>
                      );
                    }

                    // Handle lat_long (coordinates) fields in table
                    if (field.type === 'lat_long') {
                      // Handle both {lat, lng} and {x, y} formats
                      let lat = null;
                      let lng = null;

                      if (value && typeof value === 'object') {
                        // Standard format: {lat, lng}
                        if (value.lat !== undefined && value.lng !== undefined) {
                          lat = parseFloat(value.lat);
                          lng = parseFloat(value.lng);
                        }
                        // Alternative format: {x, y}
                        else if (value.x !== undefined && value.y !== undefined) {
                          lat = parseFloat(value.x);
                          lng = parseFloat(value.y);
                        }
                      }

                      const isValidCoordinates = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);

                      return (
                        <td key={field.id} className="py-4 px-3 sm:py-5 sm:px-4 text-[14px] sm:text-[15px] text-center">
                          {isValidCoordinates ? (
                            <div className="flex items-center justify-center gap-1">
                              <svg className="w-3 h-3 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <a
                                href={`https://www.google.com/maps?q=${lat},${lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                                title={`ดูแผนที่: ${lat.toFixed(6)}, ${lng.toFixed(6)}`}
                              >
                                {`${lat.toFixed(4)}, ${lng.toFixed(4)}`}
                              </a>
                            </div>
                          ) : (
                            <span>{typeof value === 'object' ? JSON.stringify(value) : (value || '-')}</span>
                          )}
                        </td>
                      );
                    }

                    // Handle URL fields in table - comprehensive detection
                    const isUrlFieldTable = field.type === 'url' ||
                                          field.title?.toLowerCase().includes('url') ||
                                          field.title?.toLowerCase().includes('link') ||
                                          field.title?.toLowerCase().includes('เว็บ') ||
                                          field.title?.toLowerCase().includes('website') ||
                                          field.title?.toLowerCase().includes('web') ||
                                          field.title?.toLowerCase().includes('site') ||
                                          (value && typeof value === 'string' &&
                                           (/^https?:\/\//i.test(value.trim()) ||
                                            /^www\./i.test(value.trim()) ||
                                            /\.(com|net|org|co|th|io|edu|gov|mil|int|biz|info|pro|name|museum|coop|aero|asia|cat|jobs|mobi|tel|travel|xxx|ac|ad|ae|af|ag|ai|al|am|an|ao|aq|ar|as|at|au|aw|ax|az|ba|bb|bd|be|bf|bg|bh|bi|bj|bm|bn|bo|br|bs|bt|bv|bw|by|bz|ca|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|co|cr|cs|cu|cv|cx|cy|cz|de|dj|dk|dm|do|dz|ec|ee|eg|eh|er|es|et|eu|fi|fj|fk|fm|fo|fr|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gp|gq|gr|gs|gt|gu|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|in|io|iq|ir|is|it|je|jm|jo|jp|ke|kg|kh|ki|km|kn|kp|kr|kw|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|me|mg|mh|mk|ml|mm|mn|mo|mp|mq|mr|ms|mt|mu|mv|mw|mx|my|mz|na|nc|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|pa|pe|pf|pg|ph|pk|pl|pm|pn|pr|ps|pt|pw|py|qa|re|ro|rs|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sj|sk|sl|sm|sn|so|sr|st|su|sv|sy|sz|tc|td|tf|tg|th|tj|tk|tl|tm|tn|to|tp|tr|tt|tv|tw|tz|ua|ug|uk|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|ye|yt|za|zm|zw)$/.test(value.trim())));

                    if (isUrlFieldTable) {
                      const formatUrlForTable = (url) => {
                        if (!url || typeof url !== 'string') return null;

                        const trimmedUrl = url.trim();
                        if (!trimmedUrl) return null;

                        const urlPattern = /^(https?:\/\/|ftp:\/\/|www\.)/i;
                        const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}/;

                        let formattedUrl = trimmedUrl;
                        if (!urlPattern.test(trimmedUrl) && domainPattern.test(trimmedUrl)) {
                          formattedUrl = `https://${trimmedUrl}`;
                        }

                        try {
                          new URL(formattedUrl);
                          return formattedUrl;
                        } catch {
                          return null;
                        }
                      };

                      const validUrl = formatUrlForTable(value);
                      const displayText = value && value.length > 20 ? `${value.substring(0, 20)}...` : value;

                      return (
                        <td key={field.id} className="py-4 px-3 sm:py-5 sm:px-4 text-[14px] sm:text-[15px] text-center">
                          {validUrl ? (
                            <div className="flex items-center justify-center gap-1">
                              <svg className="w-3 h-3 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              <a
                                href={validUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary"
                                title={value}
                              >
                                {displayText}
                              </a>
                            </div>
                          ) : (
                            <span>{value || '-'}</span>
                          )}
                        </td>
                      );
                    }

                    let formattedValue;
                    if (field.type === 'number') {
                      formattedValue = formatNumberByContext(value, 'table', field.options);
                    } else {
                      formattedValue = formatFieldValue(field, value);
                    }
                    return (
                      <td key={field.id} className="py-4 px-3 sm:py-5 sm:px-4 text-[14px] sm:text-[15px] text-center ">
                        {formattedValue}
                      </td>
                    );
                  })}
                  {hasMoreFields && (
                    <td className="p-1 sm:p-2 text-[10px] sm:text-[12px] text-center">
                      <span className="text-muted-foreground">...</span>
                    </td>
                  )}
                  {displayFields.length < 5 && (
                    <td className="p-1 sm:p-2 text-[10px] sm:text-[12px] text-center ">
                      <span className="truncate block">
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
                    </span>
                    </td>
                  )}
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

  // ❌ REMOVED: Full-screen loading page (causes screen flicker)
  // Now show content immediately, no loading overlay

  // Don't render anything if data is not loaded yet (prevent null reference errors)
  if (!form || !submission) {
    // Only show error if loading is complete
    if (!loading) {
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
    // Still loading, show nothing (prevents flicker)
    return null;
  }

  // REMOVED: Old error check that's now handled above
  if (false && (!form || !submission)) {
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

  // Don't render main content until data is loaded
  if (!form || !submission) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 relative">
      <div className="container-responsive px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-2 sm:py-3">

        {/* Form Title and Description */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto mb-3"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 text-left">
              <h1 className="text-xl font-bold text-primary mb-2 text-left" style={{ fontSize: '20px' }}>
                {form.title}
              </h1>
              {form.description && (
                <div className="mb-2">
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed text-left">
                    {form.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Main Form Data Container with Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-3xl mx-auto mb-8 relative"
        >
          {/* Previous Click Area - Arrows on narrow screens */}
          {hasPrevious && onNavigatePrevious && (
            <div
              onClick={onNavigatePrevious}
              className="md:hidden absolute left-0 top-0 bottom-0 w-16 z-10 cursor-pointer group"
              title="คลิกเพื่อดูข้อมูลก่อนหน้า"
            >
              <div className="absolute inset-0 rounded-l-[24px] bg-gradient-to-r from-orange-500/10 dark:from-orange-500/20 via-orange-500/30 dark:via-orange-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-50 md:opacity-30 group-hover:opacity-100 transition-all duration-300 group-hover:left-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-8 md:w-8 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </div>
            </div>
          )}

          {/* Next Click Area - Arrows on narrow screens */}
          {hasNext && onNavigateNext && (
            <div
              onClick={onNavigateNext}
              className="md:hidden absolute right-0 top-0 bottom-0 w-16 z-10 cursor-pointer group"
              title="คลิกเพื่อดูข้อมูลถัดไป"
            >
              <div className="absolute inset-0 rounded-r-[24px] bg-gradient-to-l from-orange-500/10 dark:from-orange-500/20 via-orange-500/30 dark:via-orange-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 md:opacity-30 group-hover:opacity-100 transition-all duration-300 group-hover:right-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-8 md:w-8 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          )}

          <GlassCard
            className="glass-container form-card-glow form-card-animate form-card-borderless motion-container animation-optimized"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* ✅ v0.7.37: Responsive Grid Layout - Desktop 2-column → Mobile stacked */}
            <div className="p-6">
              {/* 🎯 Section 1: Basic Information */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-orange-400 mb-4 pb-2 border-b border-orange-400/30">
                  ข้อมูลพื้นฐาน
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {(form.fields || [])
                    .filter(field => !field.sub_form_id && !field.subFormId)
                    .filter(field => !['file_upload', 'image_upload', 'lat_long'].includes(field.type))
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map(field => {
                      const fieldData = submission.data[field.id];
                      const value = fieldData?.value !== undefined ? fieldData.value : fieldData;
                      return renderFieldValue(field, value);
                    })}
                </div>
              </div>

              {/* 🎯 Section 2: Location (if exists) */}
              {(form.fields || [])
                .filter(field => !field.sub_form_id && !field.subFormId)
                .filter(field => field.type === 'lat_long')
                .length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-orange-400 mb-4 pb-2 border-b border-orange-400/30">
                    ตำแหน่งที่ตั้ง
                  </h3>
                  <div className="space-y-6">
                    {(form.fields || [])
                      .filter(field => !field.sub_form_id && !field.subFormId)
                      .filter(field => field.type === 'lat_long')
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .map(field => {
                        const fieldData = submission.data[field.id];
                        const value = fieldData?.value !== undefined ? fieldData.value : fieldData;
                        return renderFieldValue(field, value);
                      })}
                  </div>
                </div>
              )}

              {/* 🎯 Section 3: Files & Images (if exists) */}
              {(form.fields || [])
                .filter(field => !field.sub_form_id && !field.subFormId)
                .filter(field => ['file_upload', 'image_upload'].includes(field.type))
                .length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-orange-400 mb-4 pb-2 border-b border-orange-400/30">
                    ไฟล์และรูปภาพ
                  </h3>
                  <div className="space-y-6">
                    {(form.fields || [])
                      .filter(field => !field.sub_form_id && !field.subFormId)
                      .filter(field => ['file_upload', 'image_upload'].includes(field.type))
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .map(field => {
                        const fieldData = submission.data[field.id];
                        const value = fieldData?.value !== undefined ? fieldData.value : fieldData;
                        return renderFieldValue(field, value);
                      })}
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* SubForms Section */}
        {form.subForms && form.subForms.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-3xl mx-auto space-y-3"
          >
            {form.subForms.map((subForm) => (
              <GlassCard
                key={subForm.id}
                className="glass-container subform-card-no-radius form-card-glow-green form-card-animate form-card-borderless motion-container animation-optimized"
                style={{
                  overflow: 'visible'
                }}
              >
                <GlassCardHeader style={{
                  padding: '1.5rem',
                  paddingBottom: '0.75rem'
                }}>
                  <GlassCardTitle>{subForm.title}</GlassCardTitle>
                  {subForm.description && (
                    <GlassCardDescription>{subForm.description}</GlassCardDescription>
                  )}
                </GlassCardHeader>
                <GlassCardContent
                  className="subform-content-no-radius"
                  style={{
                    padding: 0,
                    overflow: 'visible'
                  }}
                >
                  {renderSubFormSubmissionList(subForm)}
                </GlassCardContent>
              </GlassCard>
            ))}
          </motion.div>
        )}

      </div>

      {/* ✅ FIX v0.7.26: Fixed Navigation Buttons using Portal (Desktop only) */}
      <FixedNavigationButtons
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        onNavigatePrevious={onNavigatePrevious}
        onNavigateNext={onNavigateNext}
        currentIndex={currentIndex}
        totalCount={totalCount}
      />

      {/* Floating Add Button using Portal */}
      <FloatingAddButton formId={formId} onAddNew={onAddNew} />


    </div>
  );
};

// ✅ FIX v0.7.28: Remove React.memo comparison - it blocked navigation prop updates
// Navigation callbacks (onNavigatePrevious, onNavigateNext) change when submissions load
// React.memo was comparing only formId/submissionId but not callback functions
// This caused navigation buttons to appear but not work (callbacks were stale)
export default SubmissionDetailComponent;