import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassCard, GlassCardContent } from './ui/glass-card';
import { GlassButton } from './ui/glass-button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarAlt
} from '@fortawesome/free-solid-svg-icons';
import { FileDisplay } from './ui/file-display';
import { FileGallery } from './ui/image-thumbnail';
import { PhoneIcon } from './ui/phone-icon';
import { LocationMap } from './ui/location-map';

// Data services
import dataService from '../services/DataService.js';
import FileService from '../services/FileService.js';

// Utilities
import { formatNumberByContext } from '../utils/numberFormatter.js';
import { createPhoneLink, formatPhoneDisplay, shouldFormatAsPhone } from '../utils/phoneFormatter.js';

export default function SubFormDetail({
  formId,
  submissionId,
  subFormId,
  subSubmissionId,
  onEdit,
  onDelete,
  onBack
}) {
  const [form, setForm] = useState(null);
  const [subForm, setSubForm] = useState(null);
  const [subSubmission, setSubSubmission] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load subform submission data
  useEffect(() => {
    loadSubSubmissionData();
  }, [formId, subFormId, subSubmissionId]);

  const loadSubSubmissionData = async () => {
    setLoading(true);
    try {
      // Load main form
      const formData = dataService.getForm(formId);
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


      // Load sub submission
      const subSubmissionData = dataService.getSubSubmission(subSubmissionId);
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

  const renderFieldValue = (field, value) => {
    const isEmpty = !value && value !== 0;

    // Special handling for file upload fields
    if (field.type === 'file_upload' || field.type === 'image_upload') {
      // Debug log to see the raw value
      console.log(`File field ${field.title} (${field.id}):`, {
        fieldType: field.type,
        rawValue: value,
        valueType: typeof value,
        isEmpty: isEmpty
      });

      // Get actual files from FileService
      const fileIds = Array.isArray(value) ? value : (value ? [value] : []);
      console.log('File IDs extracted:', fileIds);

      const files = fileIds
        .filter(item => item) // Remove empty items
        .map(item => {
          // Check if item is already a file object or needs to be fetched
          if (typeof item === 'object' && item !== null) {
            console.log(`File item is already an object:`, item);
            // If it's already a file object, use it directly
            if (item.name || item.fileName) {
              return {
                id: item.id || 'temp-' + Date.now(),
                name: item.name || item.fileName,
                type: item.type,
                size: item.size,
                uploadedAt: item.uploadedAt || new Date().toISOString(),
                isImage: item.isImage || (item.type && item.type.startsWith('image/'))
              };
            }
          } else if (typeof item === 'string') {
            // If it's a string ID, try to get from FileService
            const file = FileService.getFile(item);
            console.log(`Getting file for ID "${item}":`, file);
            return file ? {
              id: file.id,
              name: file.name,
              type: file.type,
              size: file.size,
              uploadedAt: file.uploadedAt,
              isImage: file.isImage
            } : null;
          }
          return null;
        })
        .filter(file => file); // Remove null/undefined files

      console.log('Final processed files:', files);

      return (
        <div key={field.id} className="space-y-2 sm:space-y-3">
          <label className="block text-sm font-medium text-foreground/80">
            {field.title}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </label>
          <div className={`w-full border border-border/50 rounded-lg p-2 sm:p-3 backdrop-blur-sm ${
            isEmpty || files.length === 0
              ? 'bg-muted/40'
              : 'bg-background/50'
          }`}>
            {files.length > 0 ? (
              <FileGallery
                files={files}
                maxDisplay={6}
                size="sm"
                showFileNames={true}
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3"
              />
            ) : (
              <div className="text-center py-3 sm:py-4 text-muted-foreground text-sm">
                ไม่มีไฟล์
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
        <div key={field.id} className="space-y-2 sm:space-y-3">
          <label className="block text-sm font-medium text-foreground/80">
            {field.title}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </label>
          <div className={`w-full border border-border/50 rounded-lg backdrop-blur-sm ${
            isEmpty || !isValidCoordinates
              ? 'bg-muted/40'
              : 'bg-background/50'
          }`}>
            {isValidCoordinates ? (
              <div className="p-2 sm:p-3 space-y-2 sm:space-y-3">
                {/* Map Display */}
                <LocationMap
                  latitude={lat}
                  longitude={lng}
                  responsive={true}
                  showCoordinates={true}
                  className="w-full"
                  height="180px"
                />
              </div>
            ) : (
              <div className="p-2 sm:p-3 text-center text-muted-foreground text-sm">
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

    // Special handling for URL fields
    if (field.type === 'url') {
      // Helper function to validate and format URL
      const formatUrlForDisplay = (url) => {
        if (!url || typeof url !== 'string') return null;

        const trimmedUrl = url.trim();
        if (!trimmedUrl) return null;

        // Check if it's a valid URL pattern
        const urlPattern = /^(https?:\/\/|ftp:\/\/|www\.)/i;
        const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}/;

        let formattedUrl = trimmedUrl;

        // If it doesn't start with protocol, add https://
        if (!urlPattern.test(trimmedUrl)) {
          // Check if it looks like a domain
          if (domainPattern.test(trimmedUrl)) {
            formattedUrl = `https://${trimmedUrl}`;
          } else {
            return null; // Invalid URL
          }
        }

        // Additional validation
        try {
          new URL(formattedUrl);
          return formattedUrl;
        } catch {
          return null;
        }
      };

      const validUrl = formatUrlForDisplay(value);
      const displayText = value && value.length > 30 ? `${value.substring(0, 30)}...` : value;

      return (
        <div key={field.id} className="space-y-2">
          <label className="block text-sm font-medium text-foreground/80">
            {field.title}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </label>
          <div className={`w-full border border-border/50 rounded-lg px-2 sm:px-3 py-2 text-sm backdrop-blur-sm ${
            isEmpty
              ? 'bg-muted/40 text-muted-foreground/50'
              : 'bg-background/50 text-foreground'
          }`}>
            {validUrl ? (
              <div className="flex items-center gap-2">
                <svg
                  className="w-3 h-3 sm:w-4 sm:h-4 text-primary flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                <a
                  href={validUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 hover:underline transition-colors duration-200 break-all text-xs sm:text-sm"
                  title={value}
                  onClick={(e) => e.stopPropagation()}
                >
                  {displayText}
                </a>
              </div>
            ) : (
              <span className="text-foreground break-all text-xs sm:text-sm">{value || '-'}</span>
            )}
          </div>
        </div>
      );
    }

    // Special handling for phone fields
    if (field.type === 'phone' || shouldFormatAsPhone(value, field.type)) {
      const phoneProps = createPhoneLink(value, {
        includeIcon: true,
        size: 'md',
        showTooltip: true
      });

      return (
        <div key={field.id} className="space-y-2">
          <label className="block text-sm font-medium text-foreground/80">
            {field.title}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </label>
          <div className={`w-full border border-border/50 rounded-lg px-2 sm:px-3 py-2 text-sm backdrop-blur-sm ${
            isEmpty
              ? 'bg-muted/40 text-muted-foreground/50'
              : 'bg-background/50 text-foreground'
          }`}>
            {phoneProps.isClickable ? (
              <div className="flex items-center gap-2">
                <PhoneIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                <a
                  href={phoneProps.telLink}
                  className={`${phoneProps.className} text-xs sm:text-sm`}
                  title={phoneProps.title}
                  aria-label={phoneProps.ariaLabel}
                  onClick={(e) => e.stopPropagation()}
                >
                  {phoneProps.display}
                </a>
              </div>
            ) : (
              <span className="text-foreground break-all text-xs sm:text-sm">{formatPhoneDisplay(value) || value || '-'}</span>
            )}
          </div>
        </div>
      );
    }

    // Standard handling for other field types
    const formattedValue = formatFieldValue(field, value);

    return (
      <div key={field.id} className="space-y-2">
        <label className="block text-sm font-medium text-foreground/80">
          {field.title}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </label>
        <div className={`w-full border border-border/50 rounded-lg px-2 sm:px-3 py-2 text-sm backdrop-blur-sm ${
          isEmpty
            ? 'bg-muted/40 text-muted-foreground/50'
            : 'bg-background/50 text-foreground'
        }`}>
          <span className="text-xs sm:text-sm break-words">{formattedValue}</span>
        </div>
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

  if (!form || !subForm || !subSubmission) {
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

          </div>
        </motion.div>

        {/* SubForm Data Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-3xl mx-auto mb-6 sm:mb-8"
        >
          <GlassCard className="glass-container">
            <div className="p-3 sm:p-4">
              <div className="space-y-3 sm:space-y-4 lg:space-y-6">
                {(subForm.fields || []).map(field => {
                  const value = subSubmission.data[field.id];
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