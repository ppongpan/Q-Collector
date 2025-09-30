import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription, GlassCardContent } from './ui/glass-card';
import { GlassButton } from './ui/glass-button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus
} from '@fortawesome/free-solid-svg-icons';
import { FileDisplay, FileDisplayCompact } from './ui/file-display';
import { FileGallery, ImageThumbnail } from './ui/image-thumbnail';
import { PhoneIcon } from './ui/phone-icon';
import { LocationMap } from './ui/location-map';

// Data services
import dataService from '../services/DataService.js';
import FileService from '../services/FileService.js';

// Auth context
import { useAuth } from '../contexts/AuthContext';

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
  useEffect(() => {
    const handleFocus = () => {
      loadSubmissionData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

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


      // Load submission
      const submissionData = dataService.getSubmission(submissionId);
      if (!submissionData) {
        console.error('Submission not found:', submissionId);
        return;
      }
      setSubmission(submissionData);

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


  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
        const maxRating = field.options?.maxRating || 5;
        const ratingValue = Math.max(0, Math.min(Number(value) || 0, maxRating));
        const emptyStars = Math.max(0, maxRating - ratingValue);
        return '⭐'.repeat(ratingValue) + '☆'.repeat(emptyStars);
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

  const renderFieldValue = (field, value) => {
    const isEmpty = !value && value !== 0;


    // Special handling for file upload fields
    if (field.type === 'file_upload' || field.type === 'image_upload') {
      // Get actual files from FileService
      const fileIds = Array.isArray(value) ? value : (value ? [value] : []);

      const files = fileIds
        .filter(item => item) // Remove empty items
        .map(item => {
          let fileData = null;

          // If it's a string ID, get from FileService
          if (typeof item === 'string') {
            fileData = FileService.getFile(item);
          }
          // If it's already an object with ID, try to get from FileService
          else if (typeof item === 'object' && item !== null && item.id) {
            fileData = FileService.getFile(item.id);
          }
          // If it's an object with name but no ID, try to find by name
          else if (typeof item === 'object' && item !== null && (item.name || item.fileName)) {
            const allFiles = FileService.getAllStoredFiles();
            fileData = Object.values(allFiles).find(file =>
              file.name === (item.name || item.fileName) &&
              file.fieldId === field.id &&
              file.submissionId === submissionId
            );
          }

          // Return processed file data if found
          if (fileData) {
            return {
              id: fileData.id,
              name: fileData.name,
              type: fileData.type,
              size: fileData.size,
              uploadedAt: fileData.uploadedAt,
              isImage: fileData.isImage || (fileData.type && fileData.type.startsWith('image/')),
              data: fileData.data // Include data for images
            };
          }

          return null;
        })
        .filter(file => file); // Remove null/undefined files

      return (
        <div key={field.id} className="space-y-3">
          <label className="block text-sm font-bold text-orange-300">
            {field.title}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </label>
          <div className={`w-full border border-border/50 rounded-lg p-4 backdrop-blur-sm ${
            isEmpty || files.length === 0
              ? 'bg-muted/40'
              : 'bg-background/50'
          }`}>
            {files.length > 0 ? (
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
                          <div className="text-sm font-medium text-foreground truncate" title={file.name}>
                            {file.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <FileDisplay
                    value={files}
                    maxDisplay={10}
                    onFileClick={(file) => {
                      console.log('FileDisplay click:', file);
                      if (file && file.id) {
                        const success = FileService.downloadFile(file.id);
                        console.log('Download result:', success);
                        if (!success) {
                          console.warn('Failed to download file:', file);
                        }
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
                        field.title?.toLowerCase().includes('เบอร์') ||
                        field.title?.toLowerCase().includes('โทร') ||
                        field.title?.toLowerCase().includes('phone') ||
                        field.title?.toLowerCase().includes('tel') ||
                        field.title?.toLowerCase().includes('mobile') ||
                        field.title?.toLowerCase().includes('contact');

    if (isPhoneField) {
      const isValidPhone = value && typeof value === 'string' && value.trim().length > 0;
      const phoneNumber = isValidPhone ? value.replace(/\D/g, '') : '';
      const isClickablePhone = phoneNumber && phoneNumber.length >= 9;

      return (
        <div key={field.id}>
          <div className="flex items-center gap-3 py-0.5">
            <label className="text-sm font-bold shrink-0 text-orange-300">
              {field.title}{field.required && <span className="text-destructive ml-1">*</span>} :
            </label>
            <div className={`text-sm min-w-0 flex-1 ${
              isEmpty ? 'text-muted-foreground/50' : 'text-foreground'
            }`}>
              {isClickablePhone ? (
                <a
                  href={`tel:${phoneNumber}`}
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

    // Get first few fields for table display (max 3-4)
    const displayFields = subForm.fields?.slice(0, 3) || [];
    const hasMoreFields = subForm.fields?.length > 3;

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
                  className="border-b border-border/20 cursor-pointer"
                  onClick={() => handleViewSubFormDetail(subForm.id, subSub.id)}
                >
                  <td className="p-2 text-[12px] text-center">
                    {index + 1}
                  </td>
                  {displayFields.map((field) => {
                    const value = subSub.data[field.id];

                    // Use FileDisplayCompact for file fields in table
                    if (field.type === 'file_upload' || field.type === 'image_upload') {
                      const fileIds = Array.isArray(value) ? value : (value ? [value] : []);
                      const fileCount = fileIds.filter(id => FileService.getFile(id)).length;

                      return (
                        <td key={field.id} className="p-2 text-[12px] text-center">
                          {fileCount > 0 ? (
                            <div className="flex items-center justify-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span>{fileCount}</span>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                      );
                    }

                    // Handle email fields in table
                    if (field.type === 'email') {
                      const isValidEmail = value && typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

                      return (
                        <td key={field.id} className="p-2 text-[12px] text-center">
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
                        <td key={field.id} className="p-2 text-[12px] text-center">
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
                        <td key={field.id} className="p-2 text-[12px] text-center">
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
                                target="_blank"
                  rel="noopener noreferrer"
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
                      <td key={field.id} className="p-2 text-[12px] text-center ">
                        {formattedValue}
                      </td>
                    );
                  })}
                  {hasMoreFields && (
                    <td className="p-1 sm:p-2 text-[10px] sm:text-[12px] text-center">
                      <span className="text-muted-foreground">...</span>
                    </td>
                  )}
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
          {/* Previous Arrow - Outside on large screens, hidden on mobile */}
          {hasPrevious && onNavigatePrevious && (
            <div
              onClick={onNavigatePrevious}
              className="hidden lg:flex absolute -left-20 top-1/2 -translate-y-1/2 w-16 h-16 cursor-pointer group items-center justify-center"
              title="คลิกเพื่อดูข้อมูลก่อนหน้า"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/20 backdrop-blur-md border border-orange-500/30 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-orange-500/30 shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-400 group-hover:text-orange-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </div>
            </div>
          )}

          {/* Next Arrow - Outside on large screens, hidden on mobile */}
          {hasNext && onNavigateNext && (
            <div
              onClick={onNavigateNext}
              className="hidden lg:flex absolute -right-20 top-1/2 -translate-y-1/2 w-16 h-16 cursor-pointer group items-center justify-center"
              title="คลิกเพื่อดูข้อมูลถัดไป"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/20 backdrop-blur-md border border-orange-500/30 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-orange-500/30 shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-400 group-hover:text-orange-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          )}

          {/* Previous Click Area - Hidden arrows on medium screens */}
          {hasPrevious && onNavigatePrevious && (
            <div
              onClick={onNavigatePrevious}
              className="lg:hidden absolute left-0 top-0 bottom-0 w-16 z-10 cursor-pointer group"
              title="คลิกเพื่อดูข้อมูลก่อนหน้า"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="hidden md:block absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:left-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-orange-400 drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </div>
            </div>
          )}

          {/* Next Click Area - Hidden arrows on medium screens */}
          {hasNext && onNavigateNext && (
            <div
              onClick={onNavigateNext}
              className="lg:hidden absolute right-0 top-0 bottom-0 w-16 z-10 cursor-pointer group"
              title="คลิกเพื่อดูข้อมูลถัดไป"
            >
              <div className="absolute inset-0 bg-gradient-to-l from-orange-500/0 via-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="hidden md:block absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:right-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-orange-400 drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                {(form.fields || []).map(field => {
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