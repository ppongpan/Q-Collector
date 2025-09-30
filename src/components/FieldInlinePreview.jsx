import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faCalendarAlt, faClock, faCalendarDay } from '@fortawesome/free-solid-svg-icons';
import GlassTooltip from './ui/glass-tooltip';
import MultiChoiceButtons from './ui/multi-choice-buttons';
import ThaiDateInput from './ui/thai-date-input';
import ThaiDateTimeInput from './ui/thai-datetime-input';
import ThaiPhoneInput from './ui/thai-phone-input';

/**
 * FieldInlinePreview - Interactive preview for collapsed field cards
 * Shows a functional preview of how the field will look and behave
 *
 * @param {Object} field - Field configuration object
 * @param {boolean} collapsed - Whether the field is collapsed
 * @param {Function} onTempChange - Optional callback for temporary value changes
 */
export default function FieldInlinePreview({ field, collapsed = true, onTempChange }) {
  const [temp, setTemp] = useState(field?.value ?? "");

  // File upload states
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);

  // Image upload states
  const [imageName, setImageName] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const imageInputRef = useRef(null);

  // Date/Time picker refs
  const dateInputRef = useRef(null);
  const timeInputRef = useRef(null);
  const datetimeInputRef = useRef(null);

  // File upload additional states
  const [fileError, setFileError] = useState('');
  const [isFileDragOver, setIsFileDragOver] = useState(false);

  // Image upload additional states
  const [imageError, setImageError] = useState('');
  const [isImageDragOver, setIsImageDragOver] = useState(false);
  const [imageFileSize, setImageFileSize] = useState(0);

  // GPS/Location states
  const [isGPSLoading, setIsGPSLoading] = useState(false);
  const [gpsStatus, setGPSStatus] = useState(''); // 'success', 'error', 'demo', ''
  const [gpsAccuracy, setGPSAccuracy] = useState(null);

  useEffect(() => {
    setTemp(field?.value ?? "");
  }, [field?.value]);

  if (!collapsed) return null;

  const handleChange = (v) => {
    setTemp(v);
    onTempChange?.(v);
  };

  // Enhanced input styling with orange neon focus effects - matching glass-input pattern
  const inputBaseClasses = "w-full max-w-md input-glass border-0 bg-transparent placeholder:text-muted-foreground/50 glass-interactive blur-edge focus-orange-neon hover-orange-neon transition-all duration-300 ease-out";
  const textareaClasses = "w-full max-w-md min-h-[80px] input-glass border-0 bg-transparent placeholder:text-muted-foreground/50 glass-interactive blur-edge focus-orange-neon hover-orange-neon transition-all duration-300 ease-out resize-none";
  const selectClasses = "w-full max-w-md input-glass border-0 bg-transparent glass-interactive blur-edge focus-orange-neon hover-orange-neon transition-all duration-300 ease-out [&>option]:bg-background [&>option]:text-foreground";

  // Helper function to wrap element with tooltip if description exists
  const withTooltip = (element) => {
    if (field.description?.trim()) {
      return (
        <GlassTooltip content={field.description}>
          {element}
        </GlassTooltip>
      );
    }
    return element;
  };

  switch (field.type) {
    case "rating":
      const maxRating = field.options?.maxRating || 5;
      return withTooltip(
        <div className="flex items-center space-x-1" role="group" aria-label={field.title}>
          {Array.from({ length: maxRating }, (_, i) => i + 1).map((n) => {
            const active = Number(temp) >= n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => handleChange(n)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleChange(n); }}
                aria-pressed={active}
                aria-label={`${n} out of ${maxRating} stars for ${field.title}`}
                className={`p-1 rounded-md transition-colors duration-200 hover:scale-110 ${
                  active ? "text-yellow-400" : "text-muted-foreground/40 hover:text-yellow-300"
                }`}
              >
                <FontAwesomeIcon icon={faStar} className="w-4 h-4" />
              </button>
            );
          })}
          <span className="ml-2 text-xs text-muted-foreground">
            {temp || 0}/{maxRating}
          </span>
        </div>
      );

    case "short_answer":
      const maxLength = field.options?.maxLength;
      return withTooltip(
        <div className="w-full max-w-md space-y-1">
          <input
            type="text"
            value={temp}
            onChange={(e) => {
              const value = e.target.value;
              if (!maxLength || value.length <= maxLength) {
                handleChange(value);
              }
            }}
            placeholder={field.placeholder || "ตัวอย่างข้อความสั้น..."}
            className={inputBaseClasses}
            aria-label={field.title}
            maxLength={maxLength}
          />
          {maxLength && (
            <div className="text-xs text-muted-foreground text-right">
              {temp.length}/{maxLength}
            </div>
          )}
        </div>
      );

    case "paragraph":
      const maxWords = field.options?.maxWords;
      const wordCount = temp ? temp.trim().split(/\s+/).filter(word => word.length > 0).length : 0;

      return withTooltip(
        <div className="w-full max-w-md space-y-1">
          <textarea
            value={temp}
            onChange={(e) => {
              const value = e.target.value;
              if (!maxWords) {
                handleChange(value);
              } else {
                const words = value.trim().split(/\s+/).filter(word => word.length > 0).length;
                if (words <= maxWords || value.length < temp.length) {
                  handleChange(value);
                }
              }
            }}
            placeholder={field.placeholder || "ตัวอย่างคำอธิบายยาว..."}
            className={textareaClasses}
            aria-label={field.title}
            rows={3}
          />
          {maxWords && (
            <div className="text-xs text-muted-foreground text-right">
              {wordCount}/{maxWords} คำ
            </div>
          )}
        </div>
      );

    case "email":
      const isValidEmail = temp ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(temp) : null;
      return withTooltip(
        <div className="w-full max-w-md space-y-1">
          <div className="relative">
            <input
              type="email"
              value={temp}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={field.placeholder || "example@domain.com"}
              className={`${inputBaseClasses} ${temp && isValidEmail === false ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
              aria-label={field.title}
            />
            {temp && isValidEmail !== null && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {isValidEmail ? (
                  <span className="text-green-500 text-sm">✓</span>
                ) : (
                  <span className="text-red-500 text-sm">✗</span>
                )}
              </div>
            )}
          </div>
          {temp && isValidEmail === false && (
            <div className="text-xs text-red-500">รูปแบบอีเมลไม่ถูกต้อง</div>
          )}
        </div>
      );

    case "phone":
      const phoneDigits = temp ? temp.replace(/\D/g, '') : '';
      const isValidPhone = phoneDigits.length === 10;
      return withTooltip(
        <div className="w-full max-w-md space-y-1">
          <div className="relative">
            <ThaiPhoneInput
              value={temp}
              onChange={handleChange}
              placeholder="XXX-XXX-XXXX"
              className={`${inputBaseClasses} ${temp && !isValidPhone ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
              aria-label={field.title}
            />
            {temp && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {isValidPhone ? (
                  <span className="text-green-500 text-sm">✓</span>
                ) : (
                  <span className="text-red-500 text-sm">✗</span>
                )}
              </div>
            )}
          </div>
          {temp && !isValidPhone && phoneDigits.length > 0 && (
            <div className="text-xs text-red-500">รูปแบบเบอร์โทรไม่ถูกต้อง (ต้องการ 10 หลัก)</div>
          )}
        </div>
      );

    case "number":
      const minValue = field.options?.min;
      const maxValue = field.options?.max;
      return withTooltip(
        <input
          type="number"
          value={temp}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={field.placeholder || "0"}
          className={inputBaseClasses}
          aria-label={field.title}
          min={minValue}
          max={maxValue}
        />
      );

    case "url":
      const isValidUrl = temp ? /^https?:\/\/.+\..+/.test(temp) : null;
      return withTooltip(
        <div className="w-full max-w-md space-y-1">
          <div className="relative">
            <input
              type="url"
              value={temp}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={field.placeholder || "https://example.com"}
              className={`${inputBaseClasses} ${temp && isValidUrl === false ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
              aria-label={field.title}
            />
            {temp && isValidUrl !== null && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {isValidUrl ? (
                  <span className="text-green-500 text-sm">✓</span>
                ) : (
                  <span className="text-red-500 text-sm">✗</span>
                )}
              </div>
            )}
          </div>
          {temp && isValidUrl === false && (
            <div className="text-xs text-red-500">รูปแบบ URL ไม่ถูกต้อง (https://example.com)</div>
          )}
        </div>
      );

    case "date":
      const handleDateIconClick = () => {
        if (dateInputRef.current) {
          dateInputRef.current.focus();
          dateInputRef.current.showPicker?.();
        }
      };

      const formatDateForDisplay = (dateValue) => {
        if (!dateValue) return '';
        try {
          const date = new Date(dateValue);
          if (isNaN(date.getTime())) return dateValue;
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        } catch (error) {
          return dateValue;
        }
      };

      const formatDateForInput = (dateValue) => {
        if (!dateValue) return '';
        try {
          const date = new Date(dateValue);
          if (isNaN(date.getTime())) return '';
          // Format as YYYY-MM-DD for HTML date input
          return date.toISOString().split('T')[0];
        } catch (error) {
          return '';
        }
      };

      return withTooltip(
        <div className="w-full max-w-md space-y-1">
          <ThaiDateInput
            value={temp}
            onChange={(e) => handleChange(e.target.value)}
            className={inputBaseClasses}
            placeholder="DD/MM/YYYY"
            aria-label={field.title}
          />
        </div>
      );

    case "time":
      const handleTimeIconClick = () => {
        if (timeInputRef.current) {
          timeInputRef.current.focus();
          timeInputRef.current.showPicker?.();
        }
      };

      const formatTimeForDisplay = (timeValue) => {
        if (!timeValue) return '';
        try {
          const [hours, minutes] = timeValue.split(':');
          const hour24 = parseInt(hours, 10);
          const displayHour = hour24.toString().padStart(2, '0');
          const displayMinute = minutes || '00';
          return `${displayHour}:${displayMinute} น.`;
        } catch {
          return timeValue;
        }
      };

      return withTooltip(
        <div className="w-full max-w-md space-y-1">
          <div className="relative">
            <input
              ref={timeInputRef}
              type="time"
              value={temp}
              onChange={(e) => handleChange(e.target.value)}
              className={`${inputBaseClasses} pr-10`}
              aria-label={field.title}
            />
            <button
              type="button"
              onClick={handleTimeIconClick}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-orange-500 transition-colors duration-200 focus:outline-none focus:text-orange-500"
              aria-label="เปิดตัวเลือกเวลา"
              tabIndex={-1}
            >
              <FontAwesomeIcon icon={faClock} className="w-4 h-4" />
            </button>
          </div>
        </div>
      );

    case "datetime":
      const handleDateTimeIconClick = () => {
        if (datetimeInputRef.current) {
          datetimeInputRef.current.focus();
          datetimeInputRef.current.showPicker?.();
        }
      };

      const formatDateTimeForDisplay = (datetimeValue) => {
        if (!datetimeValue) return '';
        try {
          const date = new Date(datetimeValue);
          if (isNaN(date.getTime())) return datetimeValue;

          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear();
          const dateStr = `${day}/${month}/${year}`;

          const timeStr = date.toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });

          return `${dateStr} ${timeStr} น.`;
        } catch {
          return datetimeValue;
        }
      };

      const formatDateTimeForInput = (datetimeValue) => {
        if (!datetimeValue) return '';
        try {
          const date = new Date(datetimeValue);
          if (isNaN(date.getTime())) return '';
          // Format as YYYY-MM-DDTHH:MM for HTML datetime-local input
          const isoString = date.toISOString();
          return isoString.slice(0, 16); // Remove seconds and timezone
        } catch (error) {
          return '';
        }
      };

      return withTooltip(
        <div className="w-full max-w-md space-y-1">
          <ThaiDateTimeInput
            value={temp}
            onChange={(e) => handleChange(e.target.value)}
            className={inputBaseClasses}
            placeholder="DD/MM/YYYY HH:MM"
            aria-label={field.title}
          />
        </div>
      );

    case "multiple_choice":
      const displayStyle = field.options?.displayStyle || 'radio';
      const allowMultiple = field.options?.allowMultiple || false;
      const options = field.options?.options || ['ตัวเลือก 1', 'ตัวเลือก 2', 'ตัวเลือก 3'];

      if (displayStyle === 'dropdown') {
        return withTooltip(
          <select
            value={temp || ""}
            onChange={(e) => handleChange(e.target.value)}
            className={selectClasses}
            aria-label={field.title}
          >
            <option value="">เลือก...</option>
            {options.map((opt, idx) => (
              <option key={idx} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      }

      if (displayStyle === 'buttons') {
        // Convert string options to {id, label} format for MultiChoiceButtons
        const formattedOptions = options.slice(0, 3).map((opt, idx) => ({
          id: `option-${idx}`,
          label: opt
        }));

        // Handle value format - convert selected values to array of IDs
        const selectedValues = allowMultiple
          ? (Array.isArray(temp) ? temp.map((val, idx) => `option-${options.indexOf(val)}`) : [])
          : (temp ? [`option-${options.indexOf(temp)}`] : []);

        const handleMultiChoiceChange = (selectedIds) => {
          if (allowMultiple) {
            // Convert back to option values for multi-select
            const selectedOptions = selectedIds.map(id => {
              const index = parseInt(id.split('-')[1]);
              return options[index];
            });
            handleChange(selectedOptions);
          } else {
            // Single select - get first selected option
            if (selectedIds.length > 0) {
              const index = parseInt(selectedIds[0].split('-')[1]);
              handleChange(options[index]);
            } else {
              handleChange('');
            }
          }
        };

        return withTooltip(
          <div className="w-full max-w-md">
            <MultiChoiceButtons
              options={formattedOptions}
              value={selectedValues}
              onChange={handleMultiChoiceChange}
              disabled={false} // Fully interactive in preview
            />
            {options.length > 3 && (
              <div className="mt-2 text-xs text-muted-foreground text-center">
                +{options.length - 3} ตัวเลือกเพิ่มเติม
              </div>
            )}
          </div>
        );
      }

      // Default radio/checkbox with interactive functionality
      const handleRadioCheckboxChange = (opt) => {
        if (allowMultiple) {
          const currentValues = Array.isArray(temp) ? temp : [];
          const newValues = currentValues.includes(opt)
            ? currentValues.filter(v => v !== opt)
            : [...currentValues, opt];
          handleChange(newValues);
        } else {
          handleChange(opt);
        }
      };

      return withTooltip(
        <div className="space-y-2" role="group" aria-label={field.title}>
          {options.slice(0, 3).map((opt, idx) => (
            <label key={idx} className="flex items-center space-x-3 text-sm cursor-pointer hover:bg-orange-50 hover:border-orange-200 dark:hover:bg-orange-900/20 rounded-md p-1 transition-all duration-200 border border-transparent">
              <input
                type={allowMultiple ? "checkbox" : "radio"}
                name={`preview-${field.id}`}
                value={opt}
                checked={allowMultiple ? (Array.isArray(temp) ? temp.includes(opt) : false) : temp === opt}
                onChange={() => handleRadioCheckboxChange(opt)}
                className="w-4 h-4 text-orange-600 focus:ring-orange-500 focus:ring-2 rounded transition-all"
              />
              <span className="flex-1">{opt}</span>
            </label>
          ))}
          {options.length > 3 && (
            <div className="text-xs text-muted-foreground pl-7 italic">
              +{options.length - 3} ตัวเลือกเพิ่มเติม
            </div>
          )}
        </div>
      );

    case "slider":
      const min = field.options?.min || 0;
      const max = field.options?.max || 100;
      const step = field.options?.step || 1;
      const unit = field.options?.unit || '';
      const currentValue = temp || min;
      const percentage = ((currentValue - min) / (max - min)) * 100;

      return withTooltip(
        <div className="w-full max-w-md space-y-3">
          <div className="relative">
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={currentValue}
              onChange={(e) => handleChange(e.target.value)}
              className="w-full h-2 bg-background/50 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/50 slider-orange"
              aria-label={field.title}
              style={{
                background: `linear-gradient(to right, #f97316 0%, #f97316 ${percentage}%, rgb(var(--background) / 0.5) ${percentage}%, rgb(var(--background) / 0.5) 100%)`
              }}
            />
            {/* Custom thumb styling via CSS */}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{min}{unit}</span>
            <span className="font-semibold text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-md">
              {currentValue}{unit}
            </span>
            <span>{max}{unit}</span>
          </div>
        </div>
      );

    case "file_upload":
      // File upload state management is now at component top

      // File type and size configuration
      const allowedFileTypes = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.zip', '.rar', '.7z'];
      const maxFileSize = 10 * 1024 * 1024; // 10MB

      // File validation function
      const validateFile = (file) => {
        // File size validation
        if (file.size > maxFileSize) {
          return `ไฟล์มีขนาดใหญ่เกินไป (ขีดจำกัด: ${Math.round(maxFileSize / 1024 / 1024)}MB)`;
        }

        // File type validation
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        if (!allowedFileTypes.includes(fileExtension)) {
          return `ประเภทไฟล์ไม่รองรับ (อนุญาต: ${allowedFileTypes.join(', ')})`;
        }

        return null;
      };

      // Get file icon based on extension
      const getFileIcon = (filename) => {
        const ext = filename.split('.').pop().toLowerCase();
        const iconMap = {
          pdf: '📄', doc: '📄', docx: '📄',
          xls: '📊', xlsx: '📊',
          ppt: '📎', pptx: '📎',
          txt: '📝',
          zip: '🗜️', rar: '🗜️', '7z': '🗜️'
        };
        return iconMap[ext] || '📁';
      };

      // Enhanced file selection handler
      const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
          const error = validateFile(file);
          if (error) {
            setFileError(error);
            setFileName('');
            handleChange('');
            // Clear error after 5 seconds
            setTimeout(() => setFileError(''), 5000);
          } else {
            setFileError('');
            setFileName(file.name);
            handleChange(file.name);
          }
        }
      };

      // Drag and drop handlers
      const handleDragOver = (e) => {
        e.preventDefault();
        setIsFileDragOver(true);
      };

      const handleDragLeave = (e) => {
        e.preventDefault();
        setIsFileDragOver(false);
      };

      const handleDrop = (e) => {
        e.preventDefault();
        setIsFileDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
          const file = files[0];
          const error = validateFile(file);
          if (error) {
            setFileError(error);
            setFileName('');
            handleChange('');
            setTimeout(() => setFileError(''), 5000);
          } else {
            setFileError('');
            setFileName(file.name);
            handleChange(file.name);
          }
        }
      };

      // formatFileSize function removed - not currently used

      return withTooltip(
        <div className="w-full max-w-md space-y-3">
          {/* Enhanced file upload area with drag & drop */}
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-4 transition-all duration-300 cursor-pointer
              ${isFileDragOver
                ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-orange-neon'
                : fileName
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : fileError
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-border/30 hover:border-orange-400 hover:bg-orange-50/50 dark:hover:bg-orange-900/10'
              }
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept={allowedFileTypes.join(',')}
              className="hidden"
              aria-label={field.title}
            />

            <div className="text-center space-y-2">
              <div className="text-2xl">
                {isFileDragOver ? '⬇️' : fileName ? getFileIcon(fileName) : '📁'}
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium text-foreground">
                  {isFileDragOver
                    ? 'วางไฟล์ที่นี่'
                    : fileName
                      ? 'เลือกไฟล์แล้ว'
                      : 'เลือกไฟล์'
                  }
                </div>

              </div>

            </div>
          </div>

          {/* File information display */}
          {fileName && !fileError && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center space-x-3">
                <span className="text-xl">{getFileIcon(fileName)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-green-800 dark:text-green-200 truncate">
                    {fileName}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">
                    ไฟล์พร้อมอัปโหลด
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFileName('');
                    handleChange('');
                    setFileError('');
                  }}
                  className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 p-1 rounded-md hover:bg-green-100 dark:hover:bg-green-800/30 transition-colors"
                  aria-label="ลบไฟล์"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Error display */}
          {fileError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <span className="text-red-500 text-sm">⚠️</span>
                <div className="text-sm text-red-700 dark:text-red-300">
                  {fileError}
                </div>
              </div>
            </div>
          )}

          {/* File type and size information */}
          <div className="text-xs text-muted-foreground bg-background/50 rounded-lg p-2 text-center">
            <div><strong>ประเภทเอกสาร ขนาดสูงสุด 10MB</strong></div>
          </div>
        </div>
      );

    case "image_upload":
      // Image upload state management is now at component top

      // Image type and size configuration
      const allowedImageTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
      const maxImageSize = 5 * 1024 * 1024; // 5MB

      // Image validation function
      const validateImage = (file) => {
        // File size validation
        if (file.size > maxImageSize) {
          return `รูปภาพมีขนาดใหญ่เกินไป (ขีดจำกัด: ${Math.round(maxImageSize / 1024 / 1024)}MB)`;
        }

        // File type validation
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        if (!allowedImageTypes.includes(fileExtension)) {
          return `ประเภทรูปภาพไม่รองรับ (อนุญาต: ${allowedImageTypes.join(', ')})`;
        }

        // Additional MIME type check
        if (!file.type.startsWith('image/')) {
          return 'ไฟล์ที่เลือกไม่ใช่รูปภาพ';
        }

        return null;
      };

      // Get image icon based on type
      const getImageIcon = (filename) => {
        const ext = filename.split('.').pop().toLowerCase();
        const iconMap = {
          jpg: '🖼️', jpeg: '🖼️', png: '🖼️',
          gif: '🎞️', webp: '🖼️', svg: '🎨'
        };
        return iconMap[ext] || '🖼️';
      };

      // Format file size for display
      const formatImageSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
      };

      // Enhanced image selection handler
      const handleImageSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
          const error = validateImage(file);
          if (error) {
            setImageError(error);
            setImageName('');
            setImagePreview('');
            setImageFileSize(0);
            handleChange('');
            // Clear error after 5 seconds
            setTimeout(() => setImageError(''), 5000);
          } else {
            setImageError('');
            setImageName(file.name);
            setImageFileSize(file.size);
            handleChange(file.name);

            // Create preview URL
            const reader = new FileReader();
            reader.onload = (e) => {
              setImagePreview(e.target?.result);
            };
            reader.readAsDataURL(file);
          }
        }
      };

      // Drag and drop handlers for images
      const handleImageDragOver = (e) => {
        e.preventDefault();
        setIsImageDragOver(true);
      };

      const handleImageDragLeave = (e) => {
        e.preventDefault();
        setIsImageDragOver(false);
      };

      const handleImageDrop = (e) => {
        e.preventDefault();
        setIsImageDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
          const file = files[0];
          const error = validateImage(file);
          if (error) {
            setImageError(error);
            setImageName('');
            setImagePreview('');
            setImageFileSize(0);
            handleChange('');
            setTimeout(() => setImageError(''), 5000);
          } else {
            setImageError('');
            setImageName(file.name);
            setImageFileSize(file.size);
            handleChange(file.name);

            // Create preview URL
            const reader = new FileReader();
            reader.onload = (e) => {
              setImagePreview(e.target?.result);
            };
            reader.readAsDataURL(file);
          }
        }
      };

      return withTooltip(
        <div className="w-full max-w-md space-y-3">
          {/* Enhanced image upload area with drag & drop */}
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-4 transition-all duration-300 cursor-pointer
              ${isImageDragOver
                ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-orange-neon'
                : imageName
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : imageError
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-border/30 hover:border-orange-400 hover:bg-orange-50/50 dark:hover:bg-orange-900/10'
              }
            `}
            onDragOver={handleImageDragOver}
            onDragLeave={handleImageDragLeave}
            onDrop={handleImageDrop}
            onClick={() => imageInputRef.current?.click()}
          >
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              aria-label={field.title}
            />

            <div className="text-center space-y-2">
              <div className="text-2xl">
                {isImageDragOver ? '⬇️' : imageName ? getImageIcon(imageName) : '🖼️'}
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium text-foreground">
                  {isImageDragOver
                    ? 'วางรูปภาพที่นี่'
                    : imageName
                      ? 'เลือกรูปภาพแล้ว'
                      : 'เลือกรูปภาพ'
                  }
                </div>

              </div>

            </div>
          </div>

          {/* Image preview and information */}
          {imageName && !imageError && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 space-y-3">
              {/* Image info header */}
              <div className="flex items-center space-x-3">
                <span className="text-xl">{getImageIcon(imageName)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-green-800 dark:text-green-200 truncate">
                    {imageName}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">
                    {formatImageSize(imageFileSize)} • รูปภาพพร้อมอัปโหลด
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setImageName('');
                    setImagePreview('');
                    setImageFileSize(0);
                    handleChange('');
                    setImageError('');
                  }}
                  className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 p-1 rounded-md hover:bg-green-100 dark:hover:bg-green-800/30 transition-colors"
                  aria-label="ลบรูปภาพ"
                >
                  ✕
                </button>
              </div>

              {/* Image preview */}
              {imagePreview && (
                <div className="relative overflow-hidden rounded-lg border border-green-300 dark:border-green-700 bg-background">
                  <img
                    src={imagePreview}
                    alt="ตัวอย่างรูปภาพ"
                    className="w-full max-h-32 object-contain"
                    style={{ aspectRatio: 'auto' }}
                  />
                  {/* Image dimensions overlay */}
                  <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                    Preview
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error display */}
          {imageError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <span className="text-red-500 text-sm">⚠️</span>
                <div className="text-sm text-red-700 dark:text-red-300">
                  {imageError}
                </div>
              </div>
            </div>
          )}

          {/* Image type and size information */}
          <div className="text-xs text-muted-foreground bg-background/50 rounded-lg p-2 text-center">
            <div><strong>JPG, PNG, GIF, SVG, WebP ขนาดสูงสุด 5MB</strong></div>
          </div>
        </div>
      );

    case "lat_long":
      const [lat, lng] = Array.isArray(temp) ? temp : (temp ? temp.split(',').map(v => v.trim()) : ['', '']);
      // GPS state management is now at component top

      // Enhanced coordinate validation
      const validateCoordinate = (value, type) => {
        if (!value || value.trim() === '') return null;
        const num = parseFloat(value);
        if (isNaN(num)) return false;

        if (type === 'lat') {
          return num >= -90 && num <= 90;
        } else {
          return num >= -180 && num <= 180;
        }
      };

      // Format coordinate with 6 decimal precision
      const formatCoordinate = (value) => {
        if (!value || value.trim() === '') return '';
        const num = parseFloat(value);
        return isNaN(num) ? value : num.toFixed(6);
      };

      const handleLatLngChange = (type, value) => {
        // Clear GPS status when manually editing
        if (gpsStatus) setGPSStatus('');

        const currentLat = type === 'lat' ? value : lat;
        const currentLng = type === 'lng' ? value : lng;
        handleChange([currentLat, currentLng]);
      };

      const handleGPSClick = () => {
        if (!navigator.geolocation) {
          // Fallback for unsupported browsers
          setGPSStatus('demo');
          handleChange(['13.7563', '100.5018']);
          setTimeout(() => setGPSStatus(''), 3000);
          return;
        }

        setIsGPSLoading(true);
        setGPSStatus('');
        setGPSAccuracy(null);

        const options = {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        };

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newLat = position.coords.latitude.toFixed(6);
            const newLng = position.coords.longitude.toFixed(6);
            const accuracy = position.coords.accuracy;

            setIsGPSLoading(false);
            setGPSStatus('success');
            setGPSAccuracy(accuracy);
            handleChange([newLat, newLng]);

            // Clear success status after 3 seconds
            setTimeout(() => {
              setGPSStatus('');
              setGPSAccuracy(null);
            }, 3000);
          },
          (error) => {
            setIsGPSLoading(false);

            switch(error.code) {
              case error.PERMISSION_DENIED:
                setGPSStatus('demo');
                // Show demo coordinates (Bangkok)
                handleChange(['13.7563', '100.5018']);
                break;
              case error.POSITION_UNAVAILABLE:
                setGPSStatus('error');
                break;
              case error.TIMEOUT:
                setGPSStatus('error');
                break;
              default:
                setGPSStatus('error');
            }

            // Clear error status after 5 seconds
            setTimeout(() => setGPSStatus(''), 5000);
          },
          options
        );
      };

      // Validation states
      const latValid = validateCoordinate(lat, 'lat');
      const lngValid = validateCoordinate(lng, 'lng');

      // Enhanced styling with validation states
      const getInputClassName = (isValid, value) => {
        let baseClass = "flex-1 bg-background/50 border rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/50 transition-all duration-200 focus:outline-none focus:ring-2";

        if (value && isValid === false) {
          return `${baseClass} border-red-500 text-red-600 focus:border-red-500 focus:ring-red-500/20`;
        } else if (value && isValid === true) {
          return `${baseClass} border-green-500 text-green-600 focus:border-green-500 focus:ring-green-500/20`;
        } else {
          return `${baseClass} input-glass border-0 bg-transparent glass-interactive blur-edge focus-orange-neon hover-orange-neon transition-all duration-300 ease-out`;
        }
      };

      return withTooltip(
        <div className="w-full max-w-md space-y-3">
          {/* GPS Status Banner */}
          {gpsStatus && (
            <div className={`text-xs px-3 py-2 rounded-lg flex items-center space-x-2 ${
              gpsStatus === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
              gpsStatus === 'demo' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
              'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              <span>
                {gpsStatus === 'success' ? '✓' :
                 gpsStatus === 'demo' ? '📍' : '⚠️'}
              </span>
              <span>
                {gpsStatus === 'success' && 'ได้รับตำแหน่งจาก GPS สำเร็จ' +
                  (gpsAccuracy ? ` (ความแม่นยำ: ${Math.round(gpsAccuracy)}m)` : '')}
                {gpsStatus === 'demo' && 'แสดงพิกัดตัวอย่าง (กรุงเทพฯ) - กรุณาอนุญาตการเข้าถึงตำแหน่ง'}
                {gpsStatus === 'error' && 'ไม่สามารถรับตำแหน่งได้ - กรุณาลองใหม่อีกครั้ง'}
              </span>
            </div>
          )}

          {/* Coordinate Inputs with Enhanced Styling */}
          <div className="space-y-3">
            {/* Latitude Input */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center space-x-2">
                <span>ละติจูด (Latitude)</span>
                {lat && latValid !== null && (
                  <span className={latValid ? 'text-green-500' : 'text-red-500'}>
                    {latValid ? '✓' : '✗'}
                  </span>
                )}
              </label>
              <input
                type="number"
                value={lat || ''}
                onChange={(e) => handleLatLngChange('lat', e.target.value)}
                onBlur={(e) => {
                  // Auto-format on blur if valid
                  if (validateCoordinate(e.target.value, 'lat')) {
                    handleLatLngChange('lat', formatCoordinate(e.target.value));
                  }
                }}
                placeholder="13.7563"
                className={getInputClassName(latValid, lat)}
                aria-label="ละติจูด"
                step="any"
                min="-90"
                max="90"
              />
              {lat && latValid === false && (
                <div className="text-xs text-red-500">ละติจูดต้องอยู่ระหว่าง -90 ถึง 90</div>
              )}
            </div>

            {/* Longitude Input */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center space-x-2">
                <span>ลองจิจูด (Longitude)</span>
                {lng && lngValid !== null && (
                  <span className={lngValid ? 'text-green-500' : 'text-red-500'}>
                    {lngValid ? '✓' : '✗'}
                  </span>
                )}
              </label>
              <input
                type="number"
                value={lng || ''}
                onChange={(e) => handleLatLngChange('lng', e.target.value)}
                onBlur={(e) => {
                  // Auto-format on blur if valid
                  if (validateCoordinate(e.target.value, 'lng')) {
                    handleLatLngChange('lng', formatCoordinate(e.target.value));
                  }
                }}
                placeholder="100.5018"
                className={getInputClassName(lngValid, lng)}
                aria-label="ลองจิจูด"
                step="any"
                min="-180"
                max="180"
              />
              {lng && lngValid === false && (
                <div className="text-xs text-red-500">ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180</div>
              )}
            </div>
          </div>

          {/* GPS Button with Enhanced Styling and Loading State */}
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={handleGPSClick}
              disabled={isGPSLoading}
              className={`
                inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg
                transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50
                min-w-[140px] justify-center
                ${isGPSLoading
                  ? 'bg-orange-400 text-white cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white hover:shadow-orange-neon hover:scale-105'
                }
              `}
              title={isGPSLoading ? 'กำลังค้นหาตำแหน่ง...' : 'รับตำแหน่งปัจจุบันจาก GPS'}
              aria-label={isGPSLoading ? 'กำลังค้นหาตำแหน่ง' : 'รับตำแหน่งปัจจุบัน'}
            >
              {isGPSLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>กำลังค้นหา...</span>
                </>
              ) : (
                <>
                  <span className="text-base">📍</span>
                  <span>ตำแหน่งปัจจุบัน</span>
                </>
              )}
            </button>
          </div>

          {/* Coordinate Display */}
          {(lat || lng) && (latValid !== false && lngValid !== false) && (
            <div className="bg-accent/20 rounded-lg px-3 py-2 space-y-1">
              <div className="text-xs font-medium text-muted-foreground">พิกัดปัจจุบัน:</div>
              <div className="text-sm font-mono text-foreground">
                {formatCoordinate(lat) || '0.000000'}, {formatCoordinate(lng) || '0.000000'}
              </div>
              <div className="text-xs text-muted-foreground">
                รูปแบบ: ทศนิยม 6 ตำแหน่ง (WGS84)
              </div>
            </div>
          )}

        </div>
      );

    case "province":
      const provinces = [
        'กรุงเทพมหานคร', 'กระบี่', 'กาญจนบุรี', 'กำแพงเพชร', 'ขอนแก่น',
        'จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 'ชัยภูมิ', 'ชุมพร',
        'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก',
        'นครนายก', 'นครปฐม', 'นครพนม', 'นครราชสีมา', 'นครศรีธรรมราช',
        'นครสวรรค์', 'นนทบุรี', 'นราธิวาส', 'น่าน', 'บึงกาฬ',
        'ปทุมธานี', 'ประจวบคีรีขันธ์', 'ปราจีนบุรี', 'ปัตตานี', 'พะเยา',
        'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'ภูเก็ต',
        'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยะลา', 'ยโสธร',
        'ร้อยเอ็ด', 'ระนอง', 'ระยอง', 'ลพบุรี', 'ลำปาง',
        'ลำพูน', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา',
        'สตูล', 'สมุทรปราการ', 'สมุทรสาคร', 'สมุทรสงคราม', 'สระบุรี',
        'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี', 'สุรินทร์',
        'หนองบัวลำภู', 'หนองคาย', 'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี',
        'อุตรดิตถ์', 'อุบลราชธานี'
      ];

      return withTooltip(
        <select
          value={temp || ""}
          onChange={(e) => handleChange(e.target.value)}
          className={selectClasses}
          aria-label={field.title}
        >
          <option value="">เลือกจังหวัด...</option>
          {provinces.map((province, idx) => (
            <option key={idx} value={province}>
              {province}
            </option>
          ))}
        </select>
      );

    case "factory":
      const factories = ['บางปะอิน', 'ระยอง', 'สระบุรี', 'สงขลา'];
      const allowMultipleFactory = field.options?.allowMultiple || false;
      const selectedFactories = Array.isArray(temp) ? temp : (temp ? [temp] : []);

      const handleFactoryChange = (factory) => {
        if (allowMultipleFactory) {
          const newSelection = selectedFactories.includes(factory)
            ? selectedFactories.filter(f => f !== factory)
            : [...selectedFactories, factory];
          handleChange(newSelection);
        } else {
          handleChange(factory);
        }
      };

      return withTooltip(
        <div className="w-full max-w-md space-y-2">
          <div className="grid grid-cols-2 gap-3 relative z-10" role="group" aria-label={field.title}>
            {factories.map((factory, idx) => {
              const isSelected = allowMultipleFactory ? selectedFactories.includes(factory) : temp === factory;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleFactoryChange(factory)}
                  className={`
                    inline-flex items-center justify-center
                    px-4 py-3 min-h-[3rem]
                    border-0
                    text-sm font-medium
                    transition-all duration-300 ease-out
                    focus:outline-none focus-orange-neon
                    will-change-transform
                    flex-shrink-0 cursor-pointer
                    active:scale-95 transform-gpu
                    factory-button-rounded
                    hover-orange-neon
                    rounded-lg
                    ${isSelected
                      ? `
                        bg-orange-600/90 text-white
                        hover:bg-orange-500
                        scale-[1.02] shadow-lg
                        blur-edge-intense
                      `
                      : `
                        bg-background/60 border-border/30
                        text-foreground
                        hover:bg-orange-100 hover:text-orange-700 hover:border-orange-300
                        dark:hover:bg-orange-900/30 dark:hover:text-orange-200
                        hover:scale-[1.01]
                        blur-edge
                      `
                    }
                  `}
                  style={{
                    borderRadius: '0.5rem !important',
                    '--border-radius': '0.5rem'
                  }}
                  aria-pressed={isSelected}
                >
                  <span className="text-center leading-tight line-clamp-2 max-w-full break-words hyphens-auto">
                    {factory}
                  </span>
                </button>
              );
            })}
          </div>
          {allowMultipleFactory && selectedFactories.length > 0 && (
            <div className="text-xs text-muted-foreground">
              เลือกแล้ว: {selectedFactories.join(', ')}
            </div>
          )}
        </div>
      );

    default:
      return withTooltip(
        <div className="flex items-center space-x-2 text-sm text-muted-foreground/70 bg-background/30 rounded-lg px-3 py-2">
          <span>{field.placeholder || field.title || "ตัวอย่างฟิลด์"}</span>
        </div>
      );
  }
}