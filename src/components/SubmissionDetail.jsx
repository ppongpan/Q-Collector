import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
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

// Data services
import fileServiceAPI from '../services/FileService.api.js';
import apiClient from '../services/ApiClient';

// Auth context
import { useAuth } from '../contexts/AuthContext';

// Hooks
import { useDelayedLoading } from '../hooks/useDelayedLoading';

// Utilities
import { formatNumberByContext } from '../utils/numberFormatter.js';
import { createPhoneLink, formatPhoneDisplay, shouldFormatAsPhone } from '../utils/phoneFormatter.js';

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

export default function SubmissionDetail({
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
  hasNext
}) {
  const { userRole } = useAuth();
  const [form, setForm] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [subSubmissions, setSubSubmissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

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

  // Load submission and related data
  useEffect(() => {
    loadSubmissionData();
  }, [formId, submissionId]);

  // Add effect to reload data when component is focused (for file updates)
  // ✅ CRITICAL FIX: Include formId and submissionId in dependencies to prevent stale closure
  // Without dependencies, the listener captures old formId/submissionId values and never updates
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔄 Window focused - reloading submission data:', { formId, submissionId });
      loadSubmissionData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [formId, submissionId]); // ← Re-create listener when IDs change to fix stale closure

  const loadSubmissionData = async () => {
    setLoading(true);
    try {
      // Load form from API
      const response = await apiClient.getForm(formId);
      const formData = response.data?.form || response.data;

      if (!formData) {
        console.error('Form not found:', formId);
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
        return formatNumberByContext(value, 'display');
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

  // Create separate component for file fields to use hooks properly
  const FileFieldDisplay = ({ field, value, submissionId }) => {
    // ✅ CRITICAL FIX: Declare ALL hooks FIRST before any conditional logic or early returns
    const [files, setFiles] = useState([]);
    const [filesLoading, setFilesLoading] = useState(true);

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

    console.log('📁 FileFieldDisplay:', {
      fieldId: field.id,
      fieldTitle: field.title,
      rawValue: value,
      rawValueType: typeof value,
      rawValueKeys: value && typeof value === 'object' ? Object.keys(value) : null,
      actualValue: actualValue,
      actualValueType: typeof actualValue,
      extractedFileIds: fileIds,
      submissionId,
      hasError
    });

    useEffect(() => {
      const loadFiles = async () => {
        // ✅ Skip loading if there's an error
        if (hasError) {
          console.log('⚠️ Error object detected for field:', field.title, value.error);
          setFilesLoading(false);
          return;
        }

        if (!fileIds || fileIds.length === 0) {
          console.log('⚠️ No file IDs to load for field:', field.title);
          setFilesLoading(false);
          return;
        }

        setFilesLoading(true);
        console.log('📥 Loading files from MinIO:', fileIds);

        try {
          // ✅ OPTIMIZATION: If actualValue already has file info (name, type, size), use it directly
          // This happens when file is stored as single object with all metadata
          if (!hasError && typeof actualValue === 'object' && actualValue?.id && actualValue?.name) {
            console.log('✅ Using file metadata from submission data:', actualValue);
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
            return;
          }

          // Try to get files for this submission and field
          const submissionFiles = await fileServiceAPI.getSubmissionFiles(submissionId);
          console.log('📦 All submission files:', submissionFiles);

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

          console.log('✅ Field files loaded:', {
            fieldId: field.id,
            fieldTitle: field.title,
            filesCount: fieldFiles.length,
            files: fieldFiles
          });

          setFiles(fieldFiles);
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
            console.log('✅ Files loaded individually:', validFiles.length);
            setFiles(validFiles);
          } catch (fallbackError) {
            console.error('❌ Fallback file loading failed:', fallbackError);
            setFiles([]);
          }
        } finally {
          setFilesLoading(false);
        }
      };

      loadFiles();
    }, [JSON.stringify(fileIds), submissionId, field.id]); // Dependency on fileIds and submissionId

    return (
      <div className="space-y-3">
        <label className="block text-sm font-bold text-orange-300">
          {field.title}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </label>
        <div className={`w-full border border-border/50 rounded-lg p-4 backdrop-blur-sm ${
          isEmpty || files.length === 0 || hasError
            ? 'bg-muted/40'
            : 'bg-background/50'
        }`}>
          {hasError ? (
            <div className="text-center py-6 text-muted-foreground">
              <div className="text-4xl mb-2 opacity-30">⚠️</div>
              <div className="text-sm font-medium text-orange-500">ไม่สามารถโหลดไฟล์ได้</div>
              <div className="text-xs mt-1">{value.error || 'ข้อมูลไฟล์สูญหาย'}</div>
            </div>
          ) : filesLoading ? (
            <div className="text-center py-6 text-muted-foreground">
              <div className="text-sm">กำลังโหลดไฟล์...</div>
            </div>
          ) : files.length > 0 ? (
            <div className="space-y-3">
              {field.type === 'image_upload' ? (
                // แสดงแบบ left-right layout สำหรับรูปภาพ
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div key={file.id || index} className="flex items-start gap-4">
                      {/* รูปภาพด้านซ้าย */}
                      <div className="flex-shrink-0">
                        <ImageThumbnail
                          file={file}
                          size="lg"
                          showFileName={false}
                        />
                      </div>

                      {/* รายละเอียดด้านขวา */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="text-sm font-medium text-foreground truncate" title={file.name || file.originalName || 'ไฟล์ที่แนบ'}>
                          {file.name || file.originalName || file.filename || 'ไฟล์ที่แนบ'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {file.size ? formatFileSize(file.size) : 'ไม่ทราบขนาด'}
                        </div>
                      </div>
                    </div>
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
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <div className="text-4xl mb-2 opacity-30">📁</div>
              <div className="text-sm">ไม่มีไฟล์</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderFieldValue = (field, value) => {
    const isEmpty = !value && value !== 0;

    // Special handling for file upload fields - use component with hooks
    if (field.type === 'file_upload' || field.type === 'image_upload') {
      return <FileFieldDisplay key={field.id} field={field} value={value} submissionId={submissionId} />;
    }

    // Special handling for LatLong fields
    if (field.type === 'lat_long') {
      const hasValidCoordinates = value && typeof value === 'object' && value.lat && value.lng;
      const lat = hasValidCoordinates ? parseFloat(value.lat) : null;
      const lng = hasValidCoordinates ? parseFloat(value.lng) : null;
      const isValidCoordinates = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);

      return (
        <div key={field.id} className="space-y-3">
          <label className="block text-sm font-bold text-orange-300">
            {field.title}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </label>
          <div className={`w-full border border-border/50 rounded-lg backdrop-blur-sm ${
            isEmpty || !isValidCoordinates
              ? 'bg-muted/40'
              : 'bg-background/50'
          }`}>
            {isValidCoordinates ? (
              <div className="p-3 space-y-3">
                {/* Map Display */}
                <LocationMap
                  latitude={lat}
                  longitude={lng}
                  responsive={true}
                  showCoordinates={true}
                  className="w-full"
                />
              </div>
            ) : (
              <div className="p-3 text-center text-muted-foreground">
                {isEmpty ? 'ไม่มีพิกัด' : 'พิกัดไม่ถูกต้อง'}
                {value && !isValidCoordinates && (
                  <div className="text-xs mt-1 text-muted-foreground/70">
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
        <div key={field.id}>
          <div className="flex items-center gap-3 py-0.5">
            <label className="text-sm font-bold shrink-0 text-orange-300">
              {field.title}{field.required && <span className="text-destructive ml-1">*</span>} :
            </label>
            <div className={`text-sm min-w-0 flex-1 ${
              isEmpty ? 'text-muted-foreground/50' : 'text-foreground'
            }`}>
              {isValidEmail ? (
                <a
                  href={`mailto:${value}`}
                  className="text-primary break-all"
                  style={{
                    transition: 'all 200ms ease-out',
                    display: 'inline-block',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.fontSize = '16.8px';
                    e.target.style.fontWeight = '600';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.fontSize = '14px';
                    e.target.style.fontWeight = '400';
                  }}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {value}
                </a>
              ) : (
                value || '-'
              )}
            </div>
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
        <div key={field.id}>
          <div className="flex items-center gap-3 py-0.5">
            <label className="text-sm font-bold shrink-0 text-orange-300">
              {field.title}{field.required && <span className="text-destructive ml-1">*</span>} :
            </label>
            <div className={`text-sm min-w-0 flex-1 ${
              isEmpty ? 'text-muted-foreground/50' : 'text-foreground'
            }`}>
              {phoneProps.isClickable ? (
                <div className="flex items-center gap-2">
                  <PhoneIcon />
                  <a
                    href={phoneProps.telLink}
                    className="text-primary break-all hover:underline transition-all duration-200"
                    style={{
                      display: 'inline-block',
                      fontSize: '14px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.fontSize = '16.8px';
                      e.target.style.fontWeight = '600';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.fontSize = '14px';
                      e.target.style.fontWeight = '400';
                    }}
                    title={phoneProps.title}
                    aria-label={phoneProps.ariaLabel}
                  >
                    {phoneProps.display}
                  </a>
                </div>
              ) : (
                <span>{formattedPhone || value || '-'}</span>
              )}
            </div>
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
        <div key={field.id}>
          <div className="flex items-center gap-3 py-0.5">
            <label className="text-sm font-bold shrink-0 text-orange-300">
              {field.title}{field.required && <span className="text-destructive ml-1">*</span>} :
            </label>
            <div className={`text-sm min-w-0 flex-1 ${
              isEmpty ? 'text-muted-foreground/50' : 'text-foreground'
            }`}>
              {validUrl ? (
                <a
                  href={validUrl}
                  className="text-primary break-all"
                  style={{
                    transition: 'all 200ms ease-out',
                    display: 'inline-block',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.fontSize = '16.8px';
                    e.target.style.fontWeight = '600';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.fontSize = '14px';
                    e.target.style.fontWeight = '400';
                  }}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {value}
                </a>
              ) : (
                value || '-'
              )}
            </div>
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


    return (
      <div key={field.id}>
        <div className="flex items-center gap-3 py-1">
          <label className="text-sm font-bold shrink-0 text-orange-300">
            {field.title}{field.required && <span className="text-destructive ml-1">*</span>} :
          </label>
          <div className={`text-sm min-w-0 flex-1 ${
            isEmpty
              ? 'text-muted-foreground/50'
              : 'text-foreground'
          }`}>
            {formattedValue || '-'}
          </div>
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

    // ✅ Filter fields by showInTable setting, show up to 5 fields (max allowed)
    // Support both camelCase (showInTable) and snake_case (show_in_table) from backend
    const visibleFields = (subForm.fields || []).filter(field =>
      field.showInTable === true || field.show_in_table === true
    );
    const maxDisplayFields = 5; // Maximum fields to display in table
    const displayFields = visibleFields.slice(0, maxDisplayFields);
    const hasMoreFields = visibleFields.length > maxDisplayFields;

    // 🔍 DEBUG: Log sub-form table data structure
    console.log('🔍 Sub-form table debug:', {
      subForm: {
        id: subForm.id,
        title: subForm.title,
        totalFields: subForm.fields?.length,
        fields: subForm.fields?.map(f => ({
          id: f.id,
          title: f.title,
          showInTable: f.showInTable
        }))
      },
      visibleFields: visibleFields.map(f => ({ id: f.id, title: f.title })),
      displayFields: displayFields.map(f => ({ id: f.id, title: f.title })),
      subSubmissions: subSubs.map(s => ({
        id: s.id,
        submittedAt: s.submittedAt,
        dataKeys: Object.keys(s.data || {}),
        sampleData: s.data
      }))
    });

    return (
      <div className="space-y-2">
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
                {displayFields.map((field) => (
                  <th key={field.id} className="py-4 px-3 sm:py-5 sm:px-4 text-[14px] sm:text-[15px] font-medium text-foreground/70 text-center">
                    {field.title}
                  </th>
                ))}
                {hasMoreFields && (
                  <th className="py-4 px-3 sm:py-5 sm:px-4 text-[14px] sm:text-[15px] font-medium text-foreground/70 text-center">อื่นๆ</th>
                )}
                {displayFields.length < 5 && (
                  <th className="py-4 px-3 sm:py-5 sm:px-4 text-[14px] sm:text-[15px] font-medium text-foreground/70 text-center">วันที่บันทึก</th>
                )}
              </tr>
            </thead>
            <tbody>
              {subSubs.map((subSub, index) => (
                <tr
                  key={subSub.id}
                  className="border-b border-border/20 cursor-pointer"
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

                    // 🔍 DEBUG: Log each field value lookup to diagnose data display issues
                    console.log(`🔍 SubForm Field "${field.title}" (${field.id}):`, {
                      fieldId: field.id,
                      rawValue: rawValue,
                      extractedValue: value,
                      hasData: !!subSub.data,
                      dataKeys: Object.keys(subSub.data || {}),
                      allData: subSub.data
                    });

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
                      formattedValue = formatNumberByContext(value, 'table');
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

  // Show loading only after 1 second delay
  if (showLoading) {
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

  // Only show "not found" error if loading is complete AND data is still missing
  if (!loading && (!form || !submission)) {
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
          {/* Previous Arrow - Floating Glass Button (Desktop) */}
          {/* Show enabled version when hasPrevious, disabled version when !hasPrevious */}
          <motion.div
            onClick={hasPrevious && onNavigatePrevious ? onNavigatePrevious : undefined}
            className={`hidden lg:flex absolute -left-24 top-1/2 -translate-y-1/2 w-20 h-20 items-center justify-center ${
              hasPrevious && onNavigatePrevious ? 'cursor-pointer group' : 'cursor-not-allowed opacity-40'
            }`}
            title={hasPrevious ? "คลิกเพื่อดูข้อมูลก่อนหน้า" : "ไม่มีข้อมูลก่อนหน้า"}
            whileHover={hasPrevious && onNavigatePrevious ? { scale: 1.15 } : {}}
            whileTap={hasPrevious && onNavigatePrevious ? { scale: 0.9 } : {}}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            {/* Glow Effect - Only show on enabled buttons */}
            {hasPrevious && onNavigatePrevious && (
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500/30 to-orange-600/30 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            )}

            {/* Glass Button */}
            <div className={`relative w-16 h-16 rounded-full bg-gradient-to-br backdrop-blur-xl border shadow-2xl flex items-center justify-center overflow-hidden transition-all duration-300 ${
              hasPrevious && onNavigatePrevious
                ? 'from-white/10 to-white/5 dark:from-white/20 dark:to-white/10 border-white/20 dark:border-white/30 group-hover:border-orange-400/60'
                : 'from-gray-400/10 to-gray-500/5 dark:from-gray-600/20 dark:to-gray-700/10 border-gray-400/20 dark:border-gray-500/30'
            }`}>
              {/* Inner Glow - Only on enabled buttons */}
              {hasPrevious && onNavigatePrevious && (
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400/0 to-orange-600/0 group-hover:from-orange-400/30 group-hover:to-orange-600/30 transition-all duration-500" />
              )}

              {/* Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className={`relative h-7 w-7 transition-colors duration-300 ${
                hasPrevious && onNavigatePrevious
                  ? 'text-gray-700 dark:text-gray-300 group-hover:text-orange-500 dark:group-hover:text-orange-400'
                  : 'text-gray-400 dark:text-gray-600'
              }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
              </svg>

              {/* Shimmer Effect - Only on enabled buttons */}
              {hasPrevious && onNavigatePrevious && (
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                </div>
              )}
            </div>
          </motion.div>

          {/* Next Arrow - Floating Glass Button (Desktop) */}
          {/* Show enabled version when hasNext, disabled version when !hasNext */}
          <motion.div
            onClick={hasNext && onNavigateNext ? onNavigateNext : undefined}
            className={`hidden lg:flex absolute -right-24 top-1/2 -translate-y-1/2 w-20 h-20 items-center justify-center ${
              hasNext && onNavigateNext ? 'cursor-pointer group' : 'cursor-not-allowed opacity-40'
            }`}
            title={hasNext ? "คลิกเพื่อดูข้อมูลถัดไป" : "ไม่มีข้อมูลถัดไป"}
            whileHover={hasNext && onNavigateNext ? { scale: 1.15 } : {}}
            whileTap={hasNext && onNavigateNext ? { scale: 0.9 } : {}}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            {/* Glow Effect - Only show on enabled buttons */}
            {hasNext && onNavigateNext && (
              <div className="absolute inset-0 rounded-full bg-gradient-to-l from-orange-500/30 to-orange-600/30 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            )}

            {/* Glass Button */}
            <div className={`relative w-16 h-16 rounded-full bg-gradient-to-br backdrop-blur-xl border shadow-2xl flex items-center justify-center overflow-hidden transition-all duration-300 ${
              hasNext && onNavigateNext
                ? 'from-white/10 to-white/5 dark:from-white/20 dark:to-white/10 border-white/20 dark:border-white/30 group-hover:border-orange-400/60'
                : 'from-gray-400/10 to-gray-500/5 dark:from-gray-600/20 dark:to-gray-700/10 border-gray-400/20 dark:border-gray-500/30'
            }`}>
              {/* Inner Glow - Only on enabled buttons */}
              {hasNext && onNavigateNext && (
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400/0 to-orange-600/0 group-hover:from-orange-400/30 group-hover:to-orange-600/30 transition-all duration-500" />
              )}

              {/* Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className={`relative h-7 w-7 transition-colors duration-300 ${
                hasNext && onNavigateNext
                  ? 'text-gray-700 dark:text-gray-300 group-hover:text-orange-500 dark:group-hover:text-orange-400'
                  : 'text-gray-400 dark:text-gray-600'
              }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>

              {/* Shimmer Effect - Only on enabled buttons */}
              {hasNext && onNavigateNext && (
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                </div>
              )}
            </div>
          </motion.div>

          {/* Previous Click Area - Arrows on narrow screens */}
          {hasPrevious && onNavigatePrevious && (
            <div
              onClick={onNavigatePrevious}
              className="lg:hidden absolute left-0 top-0 bottom-0 w-16 z-10 cursor-pointer group"
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
              className="lg:hidden absolute right-0 top-0 bottom-0 w-16 z-10 cursor-pointer group"
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
            className="glass-container"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="p-4">
              <div className="space-y-2 sm:space-y-3">
                {/* ⚠️ CRITICAL FIX: Filter out sub-form fields (sub_form_id !== null) and sort by order */}
                {/* Only display main form fields in the main form section */}
                {(form.fields || [])
                  .filter(field => !field.sub_form_id && !field.subFormId)
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map(field => {
                    // Extract value from API response structure: {fieldId, fieldTitle, fieldType, value}
                    const fieldData = submission.data[field.id];
                    const value = fieldData?.value !== undefined ? fieldData.value : fieldData;
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
            className="max-w-3xl mx-auto space-y-3"
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

      {/* Floating Add Button using Portal */}
      <FloatingAddButton formId={formId} onAddNew={onAddNew} />


    </div>
  );
}