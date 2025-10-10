import React, { useState, useEffect } from 'react';
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

// Data services
import fileServiceAPI from '../services/FileService.api.js';
import apiClient from '../services/ApiClient';

// Utilities
import { formatNumberByContext } from '../utils/numberFormatter.js';
import { createPhoneLink, formatPhoneDisplay, shouldFormatAsPhone } from '../utils/phoneFormatter.js';

// Hooks
import { useDelayedLoading } from '../hooks/useDelayedLoading';

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
  hasNext
}) {
  console.log('🎯 SubFormDetail props received:', {
    hasPrevious,
    hasNext,
    hasOnNavigatePrevious: !!onNavigatePrevious,
    hasOnNavigateNext: !!onNavigateNext,
    subSubmissionId
  });

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

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
          setFiles(filesWithUrls.filter(file => file));
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

        setFiles(loadedFiles.filter(file => file)); // Remove null/undefined files
        setFilesLoading(false);
      };

      loadFiles();
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
          {filesLoading ? (
            <div className="text-center py-6 text-muted-foreground">
              <div className="text-sm">กำลังโหลดไฟล์...</div>
            </div>
          ) : files.length > 0 ? (
            <div className="space-y-3">
              {field.type === 'image_upload' ? (
                // ✅ Left-right layout สำหรับรูปภาพ (เหมือน main form)
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

  const renderFieldValue = (field, value) => {
    const isEmpty = !value && value !== 0;

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

    // Special handling for email fields - simple format เหมือน main form
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

    // Special handling for phone fields - simple format เหมือน main form
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

    // Special handling for URL/website fields - simple format เหมือน main form
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

    // Standard handling for other field types - simple format เหมือน main form
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
  if (!loading && (!form || !subForm || !subSubmission)) {
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
            <div className="p-3 sm:p-4">
              <div className="space-y-3 sm:space-y-4 lg:space-y-6">
                {(subForm.fields || []).map(field => {
                  let value = subSubmission.data[field.id];

                  console.log(`🔍 Field "${field.title}" (${field.type}):`, {
                    fieldId: field.id,
                    rawValue: value,
                    valueType: typeof value,
                    isObject: value && typeof value === 'object',
                    isArray: Array.isArray(value),
                    hasFieldId: value && typeof value === 'object' && 'fieldId' in value
                  });

                  // 🔧 Fix: Backend returns object {fieldId, fieldTitle, fieldType, value}
                  // Extract the actual value from the wrapper object
                  if (value && typeof value === 'object' && !Array.isArray(value) && 'fieldId' in value) {
                    console.log(`🔧 Extracting value from wrapper object for field "${field.title}":`, value);
                    // Extract the actual value, defaulting to null if undefined
                    value = value.value !== undefined ? value.value : null;
                    console.log(`✅ Extracted value:`, value);
                  }

                  return renderFieldValue(field, value);
                })}
              </div>

              {(!subForm.fields || subForm.fields.length === 0) && (
                <div className="text-center py-6 sm:py-8">
                  <div className="text-3xl sm:text-4xl mb-3 sm:mb-4 opacity-50">📝</div>
                  <p className="text-sm sm:text-base text-muted-foreground">ฟอร์มย่อยนี้ไม่มีฟิลด์</p>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>

      </div>
    </div>
  );
}