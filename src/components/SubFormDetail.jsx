import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { GlassCard, GlassCardContent } from './ui/glass-card';
import { GlassButton } from './ui/glass-button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarAlt, faEdit
} from '@fortawesome/free-solid-svg-icons';
import { FileDisplay } from './ui/file-display';
import { ImageThumbnail, FileGallery } from './ui/image-thumbnail';
import { PhoneIcon } from './ui/phone-icon';
import { LocationMap } from './ui/location-map';
import { useEnhancedToast } from './ui/enhanced-toast'; // ✅ FIX v0.7.29: Add toast for mobile downloads

// Data services
import fileServiceAPI from '../services/FileService.api.js';
import apiClient from '../services/ApiClient';
import API_CONFIG from '../config/api.config.js';

// Utilities
import { formatNumberByContext } from '../utils/numberFormatter.js';
import { createPhoneLink, formatPhoneDisplay, shouldFormatAsPhone } from '../utils/phoneFormatter.js';
import { getConditionalStyle } from '../utils/conditionalFormattingEngine'; // ✅ v0.7.40: Conditional Formatting

// Hooks
import { useDelayedLoading } from '../hooks/useDelayedLoading';

// ✅ FIX v0.7.31: Floating Add Button Component using Portal (same as main form)
const FloatingAddButtonSubForm = ({ formId, submissionId, subFormId, onAddNew }) => {
  const [portalElement, setPortalElement] = useState(null);

  useEffect(() => {
    // Create portal element
    const element = document.createElement('div');
    element.id = 'floating-button-portal-subform';
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
    console.log('Floating button clicked - adding new sub-form submission:', { formId, submissionId, subFormId });
    if (onAddNew) {
      onAddNew(formId, submissionId, subFormId);
    } else {
      console.warn('onAddNew callback not provided to FloatingAddButtonSubForm');
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

export default function SubFormDetail({
  formId,
  submissionId,
  subFormId,
  subSubmissionId,
  onEdit,
  onDelete,
  onBack,
  onNavigatePrevious,
  onNavigateNext,
  hasPrevious,
  hasNext,
  onAddNew  // ✅ FIX v0.7.31: Add onAddNew prop for floating button
}) {
  console.log('🎯 SubFormDetail props received:', {
    hasPrevious,
    hasNext,
    hasOnNavigatePrevious: !!onNavigatePrevious,
    hasOnNavigateNext: !!onNavigateNext,
    subSubmissionId
  });

  const toast = useEnhancedToast(); // ✅ FIX v0.7.29: Initialize toast for mobile downloads
  const [form, setForm] = useState(null);
  const [subForm, setSubForm] = useState(null);
  const [subSubmission, setSubSubmission] = useState(null);
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

  // Load subform submission data
  useEffect(() => {
    loadSubSubmissionData();
  }, [formId, subFormId, subSubmissionId]);

  const loadSubSubmissionData = async () => {
    setLoading(true);
    try {
      // Load main form from API
      const formResponse = await apiClient.getForm(formId);
      const formData = formResponse.data?.form || formResponse.data;

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

      // Load sub submission from API
      const subSubmissionResponse = await apiClient.get(`/subforms/${subFormId}/submissions/${subSubmissionId}`);
      const subSubmissionData = subSubmissionResponse.data?.submission || subSubmissionResponse.data;

      console.log('🔍 Sub-form submission data from API:', {
        response: subSubmissionResponse.data,
        submission: subSubmissionData,
        dataKeys: subSubmissionData ? Object.keys(subSubmissionData) : null,
        dataField: subSubmissionData?.data
      });

      if (!subSubmissionData) {
        console.error('SubSubmission not found:', subSubmissionId);
        return;
      }
      setSubSubmission(subSubmissionData);

    } catch (error) {
      console.error('Error loading sub submission data:', error);
    } finally {
      setLoading(false);
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

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // ✅ FIX v0.7.29: Mobile download handler with toast notifications
  const handleFileDownload = async (file) => {
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      toast.loading('กำลังเตรียมดาวน์โหลด...', { id: file.id });
    }

    try {
      const downloadUrl = `${API_CONFIG.baseURL}/files/${file.id}/download`;
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

  // Create separate component for file fields to use hooks properly
  const FileFieldDisplay = ({ field, value }) => {
    const isEmpty = !value && value !== 0;

    // ✅ DEBUG: Log incoming value
    console.log(`🔍 [FileFieldDisplay] Field "${field.title}":`, {
      value,
      valueType: typeof value,
      isObject: value && typeof value === 'object',
      isArray: Array.isArray(value),
      hasId: value && typeof value === 'object' && 'id' in value,
      hasName: value && typeof value === 'object' && 'name' in value
    });

    // ✅ Handle different value formats:
    // 1. File object {id, name, type, size} - use directly
    // 2. Array of file objects/IDs
    // 3. Single file ID (string)
    let fileIds = [];
    let fileObjects = [];

    if (value && typeof value === 'object' && !Array.isArray(value) && value.id) {
      // Single file object with metadata
      console.log(`✅ [FileFieldDisplay] Detected file object with metadata:`, value);
      fileObjects = [value];
      fileIds = [value.id];
    } else if (Array.isArray(value)) {
      // Array of files
      console.log(`✅ [FileFieldDisplay] Detected array of files:`, value);
      fileIds = value.map(item => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item?.id) {
          fileObjects.push(item);
          return item.id;
        }
        return null;
      }).filter(id => id);
    } else if (typeof value === 'string') {
      // Single file ID
      console.log(`✅ [FileFieldDisplay] Detected single file ID:`, value);
      fileIds = [value];
    }

    console.log(`🔍 [FileFieldDisplay] Processing result:`, {
      fileIds,
      fileObjects,
      hasMetadata: fileObjects.length > 0
    });

    const [files, setFiles] = useState([]);
    const [filesLoading, setFilesLoading] = useState(true);
    const [imageBlobUrls, setImageBlobUrls] = useState({});

    useEffect(() => {
      const loadFiles = async () => {
        setFilesLoading(true);

        // ✅ If we already have file objects with names, use them directly
        if (fileObjects.length > 0) {
          const filesWithUrls = await Promise.all(
            fileObjects.map(async (fileObj) => {
              try {
                // Only fetch URL, we already have the metadata
                const fileData = await fileServiceAPI.getFileWithUrl(fileObj.id);
                return {
                  id: fileObj.id,
                  name: fileObj.name,
                  type: fileObj.type,
                  size: fileObj.size,
                  uploadedAt: fileObj.uploadedAt,
                  isImage: fileObj.type?.startsWith('image/') || fileServiceAPI.isImage(fileObj.type),
                  presignedUrl: fileData.presignedUrl
                };
              } catch (error) {
                console.error('Error loading file URL:', error);
                return null;
              }
            })
          );
          const validFiles = filesWithUrls.filter(file => file);
          setFiles(validFiles);

          // ✅ FIX: Load blob URLs for images (authenticated stream)
          await loadImageBlobUrls(validFiles);

          setFilesLoading(false);
          return;
        }

        // Otherwise, fetch full file info from backend
        const loadedFiles = await Promise.all(
          fileIds.map(async (fileId) => {
            try {
              // Get file from MinIO API with presigned URL
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
            } catch (error) {
              console.error('Error loading file:', error);
              return null;
            }
          })
        );

        const validFiles = loadedFiles.filter(file => file);
        setFiles(validFiles);

        // ✅ FIX: Load blob URLs for images (authenticated stream)
        await loadImageBlobUrls(validFiles);

        setFilesLoading(false);
      };

      // ✅ FIX: Helper function to load authenticated blob URLs for images
      const loadImageBlobUrls = async (fileList) => {
        const token = apiClient.getToken();
        if (!token) {
          console.warn('⚠️ No auth token available for image loading');
          return;
        }

        const blobUrlMap = {};
        for (const file of fileList) {
          if (file.isImage && file.id) {
            try {
              // ✅ Use API_CONFIG.baseURL instead of apiClient.defaults.baseURL
              const streamUrl = `${API_CONFIG.baseURL}/files/${file.id}/stream`;
              const response = await fetch(streamUrl, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (!response.ok) {
                console.error(`Failed to load image ${file.id}: ${response.status}`);
                continue;
              }

              const blob = await response.blob();
              const blobUrl = URL.createObjectURL(blob);
              blobUrlMap[file.id] = blobUrl;
            } catch (error) {
              console.error(`Error loading blob URL for ${file.id}:`, error);
            }
          }
        }
        setImageBlobUrls(blobUrlMap);
      };

      loadFiles();

      // Cleanup blob URLs on unmount
      return () => {
        Object.values(imageBlobUrls).forEach(url => URL.revokeObjectURL(url));
      };
    }, [JSON.stringify(fileIds), JSON.stringify(fileObjects)]); // Dependency on fileIds and fileObjects

    return (
      <div className="space-y-3">
        <label className="block text-sm font-bold text-orange-300">
          {field.title}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </label>
        <div className={`w-full border border-border/50 rounded-lg p-4 backdrop-blur-sm ${
          isEmpty || files.length === 0
            ? 'bg-muted/40'
            : 'bg-background/50'
        }`}>
          {filesLoading && files.length === 0 ? (
            // ✅ CRITICAL FIX: Only show loading text if there are NO files yet
            // If files exist, show them immediately (don't replace with text)
            <div className="text-center py-6 text-muted-foreground">
              <div className="text-sm">กำลังโหลดไฟล์...</div>
            </div>
          ) : files.length > 0 ? (
            <div className="space-y-3">
              {field.type === 'image_upload' ? (
                // ✅ FIX v0.7.29: Use ImageThumbnail with adaptive sizing and download functionality
                // Same pattern as main form: vertical stack for horizontal thumbnail+info layout
                // ✅ FIX v0.7.31: Add md:px-[200px] for responsive padding (200px left/right on PC)
                <div className="space-y-2 w-full sm:max-w-fit md:px-[200px]">
                  {files.map((file, index) => (
                    <ImageThumbnail
                      key={file.id || index}
                      file={file}
                      blobUrl={imageBlobUrls[file.id] || file.presignedUrl}
                      size="lg"
                      showFileName={true}
                      onDownload={handleFileDownload}  // ✅ FIX v0.7.29: Pass download handler with toast
                      adaptive={true}  // ✅ FIX v0.7.29: Enable adaptive sizing (uniform across screens)
                    />
                  ))}
                </div>
              ) : (
                // ไฟล์ทั่วไป
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

  // ✅ v0.7.40: Field map for conditional formatting formula evaluation
  const fieldMap = useMemo(() => {
    const map = {};
    // Include both main form and sub-form fields for formula evaluation
    (form?.fields || []).forEach(field => {
      map[field.id] = field;
    });
    (subForm?.fields || []).forEach(field => {
      map[field.id] = field;
    });
    return map;
  }, [form?.fields, subForm?.fields]);

  const renderFieldValue = (field, value) => {
    const isEmpty = !value && value !== 0;

    // ✅ v0.7.39: Hide fields with no data (empty, '-', or 'ไม่มีข้อมูล')
    if (isEmpty || value === '-' || value === 'ไม่มีข้อมูล') {
      return null; // Don't render empty fields
    }

    // Special handling for file upload fields - use component with hooks
    if (field.type === 'file_upload' || field.type === 'image_upload') {
      return <FileFieldDisplay key={field.id} field={field} value={value} />;
    }

    // Special handling for LatLong fields
    if (field.type === 'lat_long') {
      // ✅ Support both {lat, lng} and {x, y} coordinate formats
      let lat = null;
      let lng = null;

      if (value && typeof value === 'object') {
        // Standard format: {lat, lng}
        if (value.lat !== undefined && value.lng !== undefined) {
          lat = parseFloat(value.lat);
          lng = parseFloat(value.lng);
        }
        // ✅ CRITICAL FIX: Alternative format {x, y} where x=lng, y=lat (GIS standard)
        // In GIS systems: x-axis = longitude (east-west), y-axis = latitude (north-south)
        else if (value.x !== undefined && value.y !== undefined) {
          lng = parseFloat(value.x);  // ✅ x = longitude (100.5...)
          lat = parseFloat(value.y);  // ✅ y = latitude (13.8...)
        }
      }

      console.log('🗺️ [SubFormDetail] Coordinate parsing:', {
        originalValue: value,
        parsedLat: lat,
        parsedLng: lng
      });

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

    // ✅ v0.7.39: Enhanced email field with vertical card layout
    if (field.type === 'email') {
      const isValidEmail = value && typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

      return (
        <div key={field.id} className="space-y-2">
          <label className="block text-sm font-semibold text-orange-300/90">
            {field.title}{field.required && <span className="text-destructive ml-1">*</span>}
          </label>
          <div className={`text-base font-medium px-3 py-2 rounded-md bg-background/30 border border-border/20 ${
            isEmpty ? 'text-muted-foreground/60 italic' : 'text-foreground/90'
          }`}>
            {isValidEmail ? (
              <a
                href={`mailto:${value}`}
                className="text-primary hover:underline break-all"
                target="_blank"
                rel="noopener noreferrer"
              >
                {value}
              </a>
            ) : (
              value || 'ไม่มีข้อมูล'
            )}
          </div>
        </div>
      );
    }

    // ✅ v0.7.39: Enhanced phone field with vertical card layout
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
          <div className={`text-base font-medium px-3 py-2 rounded-md bg-background/30 border border-border/20 ${
            isEmpty ? 'text-muted-foreground/60 italic' : 'text-foreground/90'
          }`}>
            {phoneProps.isClickable ? (
              <div className="flex items-center gap-2">
                <PhoneIcon />
                <a
                  href={phoneProps.telLink}
                  className="text-primary hover:underline break-all"
                  title={phoneProps.title}
                  aria-label={phoneProps.ariaLabel}
                >
                  {phoneProps.display}
                </a>
              </div>
            ) : (
              <span>{formattedPhone || value || 'ไม่มีข้อมูล'}</span>
            )}
          </div>
        </div>
      );
    }

    // ✅ v0.7.39: Enhanced URL field with vertical card layout
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
          <div className={`text-base font-medium px-3 py-2 rounded-md bg-background/30 border border-border/20 ${
            isEmpty ? 'text-muted-foreground/60 italic' : 'text-foreground/90'
          }`}>
            {validUrl ? (
              <a
                href={validUrl}
                className="text-primary hover:underline break-all"
                target="_blank"
                rel="noopener noreferrer"
              >
                {value}
              </a>
            ) : (
              value || 'ไม่มีข้อมูล'
            )}
          </div>
        </div>
      );
    }

    // ✅ v0.7.39: Enhanced field display with vertical card layout (matching Main Form)
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

    // ✅ v0.7.40: Apply conditional formatting from parent form settings
    const conditionalStyle = getConditionalStyle(
      form?.settings, // Use parent form settings
      field.id,
      value,
      subSubmission?.data || {},
      fieldMap
    );

    // ✅ v0.7.39: Vertical card layout with better typography (matching Main Form Detail View)
    return (
      <div key={field.id} className="space-y-2">
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

  // ❌ REMOVED: Full-screen loading page (causes screen flicker)
  // Now show content immediately, no loading overlay

  // Only show "not found" error if loading is complete AND data is still missing
  if ((!form || !subForm || !subSubmission) && !loading) {
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
  if (!form || !subForm || !subSubmission) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90">
      <div className="container-responsive px-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-2 sm:py-3">

        {/* SubForm Title and Description */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto mb-4 sm:mb-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 text-left">
              <h1 className="text-lg sm:text-xl font-bold text-primary mb-3 sm:mb-4 text-left leading-tight">
                {subForm.title}
              </h1>
              {subForm.description && (
                <div className="mb-3 sm:mb-4">
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed text-left">
                    {subForm.description}
                  </p>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground text-left">
                <FontAwesomeIcon icon={faCalendarAlt} className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="break-all">บันทึกเมื่อ {new Date(subSubmission.submittedAt).toLocaleDateString('th-TH', {
                  year: 'numeric', month: 'long', day: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}</span>
              </div>
            </div>

            {/* ✅ Edit button removed - now in top menu (MainFormApp.jsx) */}
          </div>
        </motion.div>

        {/* SubForm Data Container with Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-3xl mx-auto mb-6 sm:mb-8 relative"
        >
          {/* Previous Arrow - Outside on large screens, hidden on mobile */}
          {/* Show enabled version when hasPrevious, disabled version when !hasPrevious */}
          <div
            onClick={hasPrevious && onNavigatePrevious ? onNavigatePrevious : undefined}
            className={`hidden lg:flex absolute -left-20 top-1/2 -translate-y-1/2 w-16 h-16 items-center justify-center ${
              hasPrevious && onNavigatePrevious ? 'cursor-pointer group' : 'cursor-not-allowed opacity-40'
            }`}
            title={hasPrevious ? "คลิกเพื่อดูข้อมูลก่อนหน้า" : "ไม่มีข้อมูลก่อนหน้า"}
          >
            <div className={`w-12 h-12 rounded-full backdrop-blur-md border flex items-center justify-center transition-all duration-300 ${
              hasPrevious && onNavigatePrevious
                ? 'bg-orange-500/10 dark:bg-orange-500/20 hover:bg-orange-500/80 dark:hover:bg-orange-500/60 border-orange-500/40 dark:border-orange-500/30 group-hover:scale-110 shadow-[0_0_0_0_rgba(249,115,22,0)] group-hover:shadow-[0_0_20px_8px_rgba(249,115,22,0.4)]'
                : 'bg-gray-400/10 dark:bg-gray-600/20 border-gray-400/40 dark:border-gray-500/30'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-colors duration-300 ${
                hasPrevious && onNavigatePrevious
                  ? 'text-orange-600 dark:text-orange-400 group-hover:text-white dark:group-hover:text-white'
                  : 'text-gray-400 dark:text-gray-600'
              }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
          </div>

          {/* Next Arrow - Outside on large screens, hidden on mobile */}
          {/* Show enabled version when hasNext, disabled version when !hasNext */}
          <div
            onClick={hasNext && onNavigateNext ? onNavigateNext : undefined}
            className={`hidden lg:flex absolute -right-20 top-1/2 -translate-y-1/2 w-16 h-16 items-center justify-center ${
              hasNext && onNavigateNext ? 'cursor-pointer group' : 'cursor-not-allowed opacity-40'
            }`}
            title={hasNext ? "คลิกเพื่อดูข้อมูลถัดไป" : "ไม่มีข้อมูลถัดไป"}
          >
            <div className={`w-12 h-12 rounded-full backdrop-blur-md border flex items-center justify-center transition-all duration-300 ${
              hasNext && onNavigateNext
                ? 'bg-orange-500/10 dark:bg-orange-500/20 hover:bg-orange-500/80 dark:hover:bg-orange-500/60 border-orange-500/40 dark:border-orange-500/30 group-hover:scale-110 shadow-[0_0_0_0_rgba(249,115,22,0)] group-hover:shadow-[0_0_20px_8px_rgba(249,115,22,0.4)]'
                : 'bg-gray-400/10 dark:bg-gray-600/20 border-gray-400/40 dark:border-gray-500/30'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-colors duration-300 ${
                hasNext && onNavigateNext
                  ? 'text-orange-600 dark:text-orange-400 group-hover:text-white dark:group-hover:text-white'
                  : 'text-gray-400 dark:text-gray-600'
              }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

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
            {/* ✅ v0.7.39: Responsive Grid Layout - Desktop 2-column → Mobile stacked */}
            <div className="p-6">
              {(!subForm.fields || subForm.fields.length === 0) ? (
                <div className="text-center py-6 sm:py-8">
                  <div className="text-3xl sm:text-4xl mb-3 sm:mb-4 opacity-50">📝</div>
                  <p className="text-sm sm:text-base text-muted-foreground">ฟอร์มย่อยนี้ไม่มีฟิลด์</p>
                </div>
              ) : (
                <>
                  {/* 🎯 Section 1: Basic Information (Non-file, non-location fields) */}
                  {(subForm.fields || [])
                    .filter(field => !['file_upload', 'image_upload', 'lat_long'].includes(field.type))
                    .length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-orange-400 mb-4 pb-2 border-b border-orange-400/30">
                        ข้อมูลพื้นฐาน
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {(subForm.fields || [])
                          .filter(field => !['file_upload', 'image_upload', 'lat_long'].includes(field.type))
                          .sort((a, b) => (a.order || 0) - (b.order || 0))
                          .map(field => {
                            let value = subSubmission.data[field.id];

                            // 🔧 Fix: Backend returns object {fieldId, fieldTitle, fieldType, value}
                            if (value && typeof value === 'object' && !Array.isArray(value) && 'fieldId' in value) {
                              value = value.value !== undefined ? value.value : null;
                            }

                            return renderFieldValue(field, value);
                          })}
                      </div>
                    </div>
                  )}

                  {/* 🎯 Section 2: Location (lat_long fields only) */}
                  {(subForm.fields || [])
                    .filter(field => field.type === 'lat_long')
                    .length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-orange-400 mb-4 pb-2 border-b border-orange-400/30">
                        ตำแหน่งที่ตั้ง
                      </h3>
                      <div className="space-y-6">
                        {(subForm.fields || [])
                          .filter(field => field.type === 'lat_long')
                          .sort((a, b) => (a.order || 0) - (b.order || 0))
                          .map(field => {
                            let value = subSubmission.data[field.id];

                            // 🔧 Fix: Backend returns object {fieldId, fieldTitle, fieldType, value}
                            if (value && typeof value === 'object' && !Array.isArray(value) && 'fieldId' in value) {
                              value = value.value !== undefined ? value.value : null;
                            }

                            return renderFieldValue(field, value);
                          })}
                      </div>
                    </div>
                  )}

                  {/* 🎯 Section 3: Files & Images (file_upload and image_upload fields) */}
                  {(subForm.fields || [])
                    .filter(field => ['file_upload', 'image_upload'].includes(field.type))
                    .length > 0 && (
                    <div className="mb-0">
                      <h3 className="text-lg font-semibold text-orange-400 mb-4 pb-2 border-b border-orange-400/30">
                        ไฟล์และรูปภาพ
                      </h3>
                      <div className="space-y-6">
                        {(subForm.fields || [])
                          .filter(field => ['file_upload', 'image_upload'].includes(field.type))
                          .sort((a, b) => (a.order || 0) - (b.order || 0))
                          .map(field => {
                            let value = subSubmission.data[field.id];

                            // 🔧 Fix: Backend returns object {fieldId, fieldTitle, fieldType, value}
                            if (value && typeof value === 'object' && !Array.isArray(value) && 'fieldId' in value) {
                              value = value.value !== undefined ? value.value : null;
                            }

                            return renderFieldValue(field, value);
                          })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </GlassCard>
        </motion.div>

      </div>

      {/* ✅ FIX v0.7.31: Floating Add Button using Portal (same as main form) */}
      <FloatingAddButtonSubForm
        formId={formId}
        submissionId={submissionId}
        subFormId={subFormId}
        onAddNew={onAddNew}
      />
    </div>
  );
}