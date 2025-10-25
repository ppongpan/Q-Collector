import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion } from 'framer-motion';

// Data services
import apiClient from '../services/ApiClient';
// ✅ NEW: Migration service for field change detection and migration operations
import MigrationService from '../services/MigrationService';
// ✅ v0.7.40: Formula engine for validation
import formulaEngine from '../utils/formulaEngine';

// Auth context
import { useAuth } from '../contexts/AuthContext';

// Drag and Drop imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GlassButton } from "./ui/glass-button";
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription, GlassCardContent } from "./ui/glass-card";
import { GlassInput, GlassTextarea, GlassSelect } from "./ui/glass-input";
import CustomSelect from "./ui/custom-select";
import FieldPreviewRow from "./ui/field-preview-row";
import FieldOptionsMenu from "./ui/field-options-menu";
import FieldToggleButtons from "./ui/field-toggle-buttons";
import { useEnhancedToast } from './ui/enhanced-toast';
import AnimatedAddButton from './ui/animated-add-button';
import TelegramNotificationSettings from './ui/telegram-notification-settings';
// ✅ NEW: Migration preview modal for field change confirmation
import MigrationPreviewModal from './ui/MigrationPreviewModal';
// ✅ v0.7.40: Conditional Formatting components
import { FormattingRuleCard } from './ui/formatting-rule-card';
// ✅ v0.8.0: Notification Rules Management
import NotificationRulesTab from './notifications/NotificationRulesTab';
// ✅ v0.9.0: PDPA Compliance Components
import PrivacyNoticeSettings from './pdpa/PrivacyNoticeSettings';
import ConsentManagementTab from './pdpa/ConsentManagementTab';
// ✅ Thai Date Picker components for dd/mm/yyyy format
import { ThaiDatePicker, ThaiDateTimePicker } from './ui/date-picker-thai';
// import EnhancedSlider from "./ui/enhanced-slider"; // Commented out - not used

// ShadCN UI components
// Badge import removed - not currently used
import { Separator } from "./ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

// FontAwesome imports
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faTrashAlt, faGripVertical, faChevronDown, faChevronUp,
  faStar, faSliders, faMapMarkerAlt, faGlobeAmericas, faIndustry,
  faTextHeight, faParagraph, faAt, faPhone, faLink, faFileAlt,
  faImage, faCalendarAlt, faClock, faCalendarDay, faListUl,
  faEllipsisV, faArrowUp, faArrowDown, faCopy,
  faQuestionCircle, faLayerGroup, faComments, faFileUpload, faCog, faHashtag as faNumbers,
  faClipboardList, faSave, faUsers, faTrash,
  faDatabase, faCheck, faTimes, faPalette, faBell, faShieldAlt, faInfoCircle
} from '@fortawesome/free-solid-svg-icons';

// User Role definitions with colors for access control
// User Role definitions with colors for access control (17 roles sorted alphabetically)
const USER_ROLES = {
  // Admin Tier (2 roles - hidden from Form Settings as they can view all forms)
  SUPER_ADMIN: { id: 'super_admin', color: 'text-red-500', bgColor: 'bg-red-500/10', name: 'Super Admin', showInSettings: false },
  ADMIN: { id: 'admin', color: 'text-pink-500', bgColor: 'bg-pink-500/10', name: 'Admin', showInSettings: false },

  // Tag-based Roles (Existing - 4 roles)
  CUSTOMER_SERVICE: { id: 'customer_service', color: 'text-blue-500', bgColor: 'bg-blue-500/10', name: 'Customer Service', showInSettings: true },
  MARKETING: { id: 'marketing', color: 'text-orange-500', bgColor: 'bg-orange-500/10', name: 'Marketing', showInSettings: true },
  SALES: { id: 'sales', color: 'text-green-500', bgColor: 'bg-green-500/10', name: 'Sales', showInSettings: true },
  TECHNIC: { id: 'technic', color: 'text-cyan-500', bgColor: 'bg-cyan-500/10', name: 'Technic', showInSettings: true },

  // Tag-based Roles (NEW v0.8.1 - 11 roles)
  ACCOUNTING: { id: 'accounting', color: 'text-indigo-500', bgColor: 'bg-indigo-500/10', name: 'Accounting', showInSettings: true },
  BD: { id: 'bd', color: 'text-teal-500', bgColor: 'bg-teal-500/10', name: 'BD', showInSettings: true },
  HR: { id: 'hr', color: 'text-rose-500', bgColor: 'bg-rose-500/10', name: 'HR', showInSettings: true },
  IT: { id: 'it', color: 'text-violet-500', bgColor: 'bg-violet-500/10', name: 'IT', showInSettings: true },
  MAINTENANCE: { id: 'maintenance', color: 'text-amber-500', bgColor: 'bg-amber-500/10', name: 'Maintenance', showInSettings: true },
  OPERATION: { id: 'operation', color: 'text-lime-500', bgColor: 'bg-lime-500/10', name: 'Operation', showInSettings: true },
  PRODUCTION: { id: 'production', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', name: 'Production', showInSettings: true },
  PURCHASING: { id: 'purchasing', color: 'text-sky-500', bgColor: 'bg-sky-500/10', name: 'Purchasing', showInSettings: true },
  QC: { id: 'qc', color: 'text-fuchsia-500', bgColor: 'bg-fuchsia-500/10', name: 'QC', showInSettings: true },
  RND: { id: 'rnd', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', name: 'R&D', showInSettings: true },
  WAREHOUSE: { id: 'warehouse', color: 'text-slate-500', bgColor: 'bg-slate-500/10', name: 'Warehouse', showInSettings: true },

  // Limited Access (1 role)
  GENERAL_USER: { id: 'general_user', color: 'text-gray-500', bgColor: 'bg-gray-500/10', name: 'General User', showInSettings: true }
};

// Default roles that can see forms
const DEFAULT_VISIBLE_ROLES = ['super_admin', 'admin'];

// Field type definitions with modern minimal design
const FIELD_TYPES = [
  { value: "short_answer", label: "ข้อความสั้น", icon: faTextHeight, color: "blue", description: "ข้อความบรรทัดเดียว" },
  { value: "paragraph", label: "ข้อความยาว", icon: faParagraph, color: "indigo", description: "ข้อความหลายบรรทัด" },
  { value: "email", label: "อีเมล", icon: faAt, color: "green", description: "ที่อยู่อีเมล" },
  { value: "phone", label: "เบอร์โทร", icon: faPhone, color: "emerald", description: "หมายเลขโทรศัพท์" },
  { value: "number", label: "ตัวเลข", icon: faNumbers, color: "purple", description: "ตัวเลขจำนวนเต็มหรือทศนิยม" },
  { value: "url", label: "ลิงก์", icon: faLink, color: "cyan", description: "ลิงก์เว็บไซต์" },
  { value: "file_upload", label: "แนบไฟล์", icon: faFileAlt, color: "orange", description: "อัพโหลดไฟล์" },
  { value: "image_upload", label: "แนบรูป", icon: faImage, color: "pink", description: "อัพโหลดรูปภาพ" },
  { value: "date", label: "วันที่", icon: faCalendarAlt, color: "red", description: "เลือกวันที่" },
  { value: "time", label: "เวลา", icon: faClock, color: "amber", description: "เลือกเวลา" },
  { value: "datetime", label: "วันที่และเวลา", icon: faCalendarDay, color: "rose", description: "เลือกวันที่และเวลา" },
  { value: "multiple_choice", label: "ตัวเลือกหลายแบบ", icon: faListUl, color: "teal", description: "ตัวเลือกหลายแบบ" },
  { value: "rating", label: "คะแนนดาว", icon: faStar, color: "yellow", description: "ให้คะแนนด้วยดาว" },
  { value: "slider", label: "แถบเลื่อน", icon: faSliders, color: "violet", description: "เลื่อนเลือกค่า" },
  { value: "lat_long", label: "พิกัด GPS", icon: faMapMarkerAlt, color: "lime", description: "ละติจูด ลองจิจูด" },
  { value: "province", label: "จังหวัด", icon: faGlobeAmericas, color: "sky", description: "จังหวัดของไทย" },
  { value: "factory", label: "โรงงาน", icon: faIndustry, color: "stone", description: "เลือกโรงงาน" },
];

/* const THAI_PROVINCES = [
  "กรุงเทพมหานคร", "กระบี่", "กาญจนบุรี", "กาฬสินธุ์", "กำแพงเพชร", "ขอนแก่น",
  "จันทบุรี", "ฉะเชิงเทรา", "ชลบุรี", "ชัยนาท", "ชัยภูมิ", "ชุมพร", "เชียงราย",
  "เชียงใหม่", "ตรัง", "ตราด", "ตาก", "นครนายก", "นครปฐม", "นครพนม", "นครราชสีมา",
  "นครศรีธรรมราช", "นครสวรรค์", "นนทบุรี", "นราธิวาส", "น่าน", "บึงกาฬ", "บุรีรัมย์",
  "ปทุมธานี", "ประจวบคีรีขันธ์", "ปราจีนบุรี", "ปัตตานี", "พระนครศรีอยุธยา", "พังงา",
  "พัทลุง", "พิจิตร", "พิษณุโลก", "เพชรบุรี", "เพชรบูรณ์", "แพร่", "พะเยา", "ภูเก็ต",
  "มหาสารคาม", "มุกดาหาร", "แม่ฮ่องสอน", "ยะลา", "ยโสธร", "ร้อยเอ็ด", "ระนอง", "ระยอง",
  "ราชบุรี", "ลพบุรี", "ลำปาง", "ลำพูน", "เลย", "ศรีสะเกษ", "สกลนคร", "สงขลา", "สตูล",
  "สมุทรปราการ", "สมุทรสงคราม", "สมุทรสาคร", "สระแก้ว", "สระบุรี", "สิงห์บุรี", "สุโขทัย",
  "สุพรรณบุรี", "สุราษฎร์ธานี", "สุรินทร์", "หนองคาย", "หนองบัวลำภู", "อ่างทอง", "อุดรธานี",
  "อุทัยธานี", "อุตรดิตถ์", "อุบลราชธานี", "อำนาจเจริญ"
]; */

/* const FACTORY_OPTIONS = [
  { label: "บางปะอิน", value: "bangpain", icon: faRocket },
  { label: "ระยอง", value: "rayong", icon: faGlobe },
  { label: "สระบุรี", value: "saraburi", icon: faDatabase },
  { label: "สงขลา", value: "songkhla", icon: faChartLine }
]; */

// Inline Edit Component
function InlineEdit({ value, onChange, placeholder, className = "", isTitle = false, dataTestId }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    onChange(tempValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  if (isEditing) {
    if (isTitle) {
      return (
        <input
          ref={inputRef}
          type="text"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          data-testid={dataTestId}
          className={`input-glass glass-interactive blur-edge rounded-xl text-xl font-semibold focus-orange-neon hover-orange-neon transition-all duration-300 ease-out w-full text-left ${className}`}
        />
      );
    } else {
      return (
        <textarea
          ref={inputRef}
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`input-glass glass-interactive blur-edge rounded-xl text-base min-h-[80px] resize-none focus-orange-neon hover-orange-neon transition-all duration-300 ease-out w-full text-left ${className}`}
          rows={2}
        />
      );
    }
  }

  const displayValue = value || placeholder;
  const isEmpty = !value || value.trim() === '';

  if (isTitle) {
    return (
      <h1
        onClick={() => setIsEditing(true)}
        data-testid={dataTestId}
        className={`text-xl font-semibold cursor-pointer transition-all duration-300 ease-out px-3 py-2 hover:text-primary/80 text-left ${isEmpty ? 'text-muted-foreground/60 italic' : 'text-foreground/90'} ${className}`}
        title="คลิกเพื่อแก้ไข"
      >
        {displayValue}
      </h1>
    );
  } else {
    return (
      <p
        onClick={() => setIsEditing(true)}
        className={`text-base cursor-pointer transition-all duration-300 ease-out px-3 py-2 hover:text-primary/70 text-left ${isEmpty ? 'text-muted-foreground/60 italic' : 'text-muted-foreground'} ${className}`}
        title="คลิกเพื่อแก้ไข"
      >
        {displayValue}
      </p>
    );
  }
}

// Utility functions
function generateId() {
  return `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateFormId() {
  return `form-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Sortable Field Editor Wrapper
function SortableFieldEditor(props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} data-field-id={props.field.id} data-testid="field-item">
      <FieldEditor
        {...props}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
      />
    </div>
  );
}

// Modern Field Editor with Minimal Interface
function FieldEditor({
  field,
  onChange,
  onRemove,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  dragHandleProps,
  isDragging,
  isSubForm = false,
  allFields = [],
  tableFieldCount: propTableFieldCount,
  maxTableFields = 5,
  formTitle = '',
  validateFormula,
  toast
}) {
  const [isExpanded, setIsExpanded] = useState(false); // Default to collapsed for better overview
  const fieldCardRef = useRef(null);
  const fieldType = FIELD_TYPES.find(type => type.value === field.type);

  // Auto-scroll when expanding the field
  useEffect(() => {
    if (isExpanded && fieldCardRef.current) {
      setTimeout(() => {
        const topMenuHeight = 80; // Approximate height of top menu
        const elementTop = fieldCardRef.current.getBoundingClientRect().top;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        window.scrollTo({
          top: scrollTop + elementTop - topMenuHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [isExpanded]);

  // Check if field title is too long (roughly 50 characters for single line)
  const isTitleTooLong = (field.title || '').length > 50;

  // Use prop if provided, otherwise calculate from allFields
  // Support both camelCase and snake_case for compatibility
  const tableFieldCount = propTableFieldCount !== undefined
    ? propTableFieldCount
    : allFields.filter(f => f.showInTable === true || f.show_in_table === true).length;

  const updateField = (updates) => {
    onChange({ ...field, ...updates });
  };

  const getFieldPreview = () => {
    if (!fieldType) return null;

    return (
      <div className="transition-all duration-200">
        <FieldPreviewRow
          field={field}
          fieldType={fieldType}
          isExpanded={isExpanded}
          showFieldTypeIcon={isExpanded}
          onUpdate={updateField}
          isSubForm={isSubForm}
          tableFieldCount={tableFieldCount}
          maxTableFields={maxTableFields}
          allFields={allFields}
          formTitle={formTitle || (isSubForm ? 'ฟอร์มย่อย' : 'ฟอร์มหลัก')}
        />
      </div>
    );
  };

  return (
    <GlassCard ref={fieldCardRef} className="form-card-glow form-card-animate form-card-borderless motion-container animation-optimized group transition-all duration-400 ease-out shadow-lg hover:shadow-xl hover:border-primary/30 hover:scale-[1.01] orange-neon-permanent">
      {/* Field Header - Compact and Minimal */}
      <GlassCardHeader
        className="py-1 cursor-pointer border-b-0"
        style={{ paddingLeft: '5px', paddingRight: '5px' }}
        onClick={(e) => {
          // Don't expand/collapse if clicking on interactive elements
          const isInteractiveElement = e.target.closest(
            'input, button, select, textarea, [role="button"], [data-interactive="true"]'
          );

          if (!isInteractiveElement) {
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <div className={`flex items-center gap-2 ${isExpanded ? 'pl-0 pr-1' : 'px-0'}`}>
          {/* Drag Handle - Accessible Touch Target */}
          <div className="flex-shrink-0">
            <div
              {...dragHandleProps}
              className="flex items-center justify-center min-w-12 min-h-12 w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-full hover:bg-background/50 focus:bg-background/70 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200 cursor-grab active:cursor-grabbing opacity-50 group-hover:opacity-100 touch-target-min"
              style={{ clipPath: 'circle(50% at center)' }}
              title="ลากเพื่อเรียงลำดับ"
              tabIndex="0"
              role="button"
              aria-label="เลื่อนเพื่อย้ายฟิลด์"
              data-interactive="true"
            >
              <FontAwesomeIcon icon={faGripVertical} className="w-3 h-3 text-muted-foreground" />
            </div>
          </div>

          {/* Field Type Selector - Only visible when expanded */}
          {isExpanded && (
            <div className="flex-shrink-0">
              <CustomSelect
                value={field.type}
                onChange={(e) => updateField({ type: e.target.value })}
                options={FIELD_TYPES.map(type => ({
                  value: type.value,
                  label: type.label,
                  disabled: type.value === ''
                }))}
                placeholder="เลือกประเภท"
                className="w-full min-w-[180px]"
              />
            </div>
          )}


          {/* Field Preview - Flexible */}
          <div className="flex-1 min-w-0">
            {getFieldPreview()}
          </div>

          {/* Action Icons - Accessible Touch Targets */}
          <div className={`flex-shrink-0 ${isExpanded ? 'mr-1' : 'mr-0'}`}>
            <div className="inline-flex items-center">
              {/* Optimized Field Options Menu */}
              <FieldOptionsMenu
                field={field}
                onUpdate={updateField}
                onRemove={onRemove}
                onDuplicate={onDuplicate}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
                canMoveUp={canMoveUp}
                canMoveDown={canMoveDown}
                isSubForm={isSubForm}
                tableFieldCount={tableFieldCount}
                maxTableFields={maxTableFields}
                allFields={allFields}
                formTitle={formTitle || (isSubForm ? 'ฟอร์มย่อย' : 'ฟอร์มหลัก')}
              />
            </div>
          </div>
        </div>
      </GlassCardHeader>

      {/* Field Configuration - Responsive Expandable */}
      {isExpanded && (
        <GlassCardContent className="space-y-4 sm:space-y-6 lg:space-y-8 pt-0">
          <Separator />

          {/* Basic Configuration - Enhanced Grid */}
          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
            <div className="space-y-2 xs:space-y-3 sm:space-y-4">
              <GlassInput
                label="ชื่อฟิลด์"
                value={field.title}
                onChange={(e) => updateField({ title: e.target.value })}
                placeholder="ระบุชื่อฟิลด์"
                tooltip={isTitleTooLong ? "ชื่อฟิลด์ยาวเกินไป - จะแสดงเป็น 2 บรรทัด" : "ชื่อฟิลด์ที่จะแสดงให้ผู้ใช้เห็น"}
                minimal
                className={isTitleTooLong ? "text-amber-600 placeholder:text-amber-400/70 border-amber-300/50" : ""}
                data-testid="field-title-input"
              />
              {isTitleTooLong && (
                <div className="flex items-center gap-2 text-xs text-amber-600">
                  <FontAwesomeIcon icon={faQuestionCircle} className="w-3 h-3" />
                  <span>ชื่อยาว ({field.title.length} ตัวอักษร) - จะแสดงเป็น 2 บรรทัด</span>
                </div>
              )}
            </div>
          </div>

          {/* Description Field */}
          <div className="space-y-3">
            <GlassTextarea
              label="คำอธิบาย"
              value={field.description || ''}
              onChange={(e) => updateField({ description: e.target.value })}
              placeholder="คำอธิบายเพิ่มเติม (จะแสดงเป็น tooltip)"
              tooltip="คำอธิบายที่จะปรากฏเป็น tooltip เมื่อ hover ที่ field ในโหมด preview"
              minimal
              className="min-h-16"
            />
          </div>

          {/* Placeholder Field - Only for text-based fields */}
          {!['date', 'time', 'datetime', 'rating', 'slider', 'multiple_choice', 'file_upload', 'image_upload', 'lat_long', 'province', 'factory'].includes(field.type) && (
            <div className="space-y-3">
              <GlassInput
                label="Placeholder"
                value={field.placeholder || ''}
                onChange={(e) => updateField({ placeholder: e.target.value })}
                placeholder="ข้อความแนะนำในช่องกรอกข้อมูล"
                tooltip="ข้อความตัวอย่างที่จะแสดงในช่องกรอกข้อมูล"
                minimal
              />
            </div>
          )}

          {/* ✅ Initial Value Settings - For all field types except file uploads */}
          {!['file_upload', 'image_upload'].includes(field.type) && (
            <div className="space-y-4 p-4 bg-gradient-to-r from-green-500/5 to-teal-500/5 border border-green-200/20 rounded-lg">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faCog} className="w-4 h-4 text-green-600" />
                <label className="text-sm font-medium text-green-800 dark:text-green-200">
                  ค่าเริ่มต้น (Initial Value)
                </label>
              </div>

              {renderInitialValueInput()}
            </div>
          )}

          {/* Field Visibility Settings */}
          <div className="space-y-4 p-4 bg-gradient-to-r from-purple-500/5 to-blue-500/5 border border-purple-200/20 rounded-lg">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faQuestionCircle} className="w-4 h-4 text-purple-600" />
              <label className="text-sm font-medium text-purple-800 dark:text-purple-200">
                การแสดงฟิลด์
              </label>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.showCondition?.enabled !== false}
                  onChange={(e) => {
                    const isAlwaysVisible = e.target.checked;
                    updateField({
                      showCondition: {
                        enabled: isAlwaysVisible ? undefined : false,
                        formula: isAlwaysVisible ? '' : (field.showCondition?.formula || '')
                      }
                    });
                  }}
                  className="w-4 h-4 text-primary focus:ring-primary/20 focus:ring-2 rounded"
                />
                <span className="text-sm text-foreground/80">
                  แสดงฟิลด์ <span className="text-xs text-muted-foreground ml-1">(แสดงเสมอ)</span>
                </span>
              </label>

              {/* Conditional Formula Input - Only show when checkbox is unchecked */}
              {field.showCondition?.enabled === false && (
                <div className="space-y-3 pl-7 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faCog} className="w-3 h-3 text-orange-600" />
                    <label className="text-xs font-medium text-orange-800 dark:text-orange-200">
                      เงื่อนไขการแสดงฟิลด์
                    </label>
                  </div>

                  <div className="space-y-2">
                    <GlassTextarea
                      value={field.showCondition?.formula || ''}
                      onChange={(e) => {
                        const newFormula = e.target.value;

                        // Update field immediately for responsive UX
                        updateField({
                          showCondition: {
                            ...field.showCondition,
                            formula: newFormula
                          }
                        });

                        // Validate formula with debounce (only if not empty)
                        if (newFormula.trim()) {
                          // Clear previous validation timeout
                          if (window.formulaValidationTimeout) {
                            clearTimeout(window.formulaValidationTimeout);
                          }

                          // Validate after 1 second of no typing
                          window.formulaValidationTimeout = setTimeout(() => {
                            const validation = validateFormula(newFormula, field.title);
                            if (!validation.valid) {
                              toast.error(`❌ สูตรผิด (${field.title}): ${validation.error}`);
                            }
                          }, 1000);
                        }
                      }}
                      placeholder='เช่น: [สถานะ] = "ปิดการขายได้" หรือ [ยอดขาย] > 100000'
                      className="min-h-20 font-mono text-xs bg-orange-500/5 border-orange-200/30"
                      minimal
                    />

                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• ใช้อ้างฟิลด์: [ชื่อฟิลด์], [field_1], [field_2], ...</p>
                      <p>• เปรียบเทียบ: =, &lt;&gt;, &gt;, &lt;, &gt;=, &lt;=</p>
                      <p>• ตรรกะ: AND (และ), OR (หรือ), NOT (ไม่)</p>
                      <p>• ตัวอย่าง: [field_1] = "ใช่" AND [field_2] &gt; 5</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Field Options */}
          {renderFieldSpecificOptions()}
        </GlassCardContent>
      )}
    </GlassCard>
  );

  function renderInitialValueInput() {
    const initialValue = field.options?.initialValue;

    switch (field.type) {
      case 'short_answer':
      case 'paragraph':
      case 'email':
      case 'phone':
      case 'url':
        return (
          <GlassInput
            label="ค่าเริ่มต้น"
            value={initialValue || ''}
            onChange={(e) => updateField({
              options: { ...field.options, initialValue: e.target.value }
            })}
            placeholder="ค่าที่จะแสดงเมื่อเปิดฟอร์มครั้งแรก"
            minimal
          />
        );

      case 'number':
        return (
          <GlassInput
            label="ค่าเริ่มต้น"
            type="number"
            value={initialValue || ''}
            onChange={(e) => updateField({
              options: { ...field.options, initialValue: e.target.value }
            })}
            placeholder="ตัวเลขเริ่มต้น"
            minimal
          />
        );

      case 'date': {
        // Determine dropdown value from initialValue
        let dateDropdownValue = 'none';
        if (initialValue?.type === 'dynamic' && initialValue?.formula === 'Today()') {
          dateDropdownValue = 'today';
        } else if (initialValue?.type === 'static' && initialValue?.value) {
          dateDropdownValue = 'specific';
        }

        return (
          <div className="space-y-3">
            <GlassSelect
              label="ค่าเริ่มต้น"
              value={dateDropdownValue}
              onChange={(e) => {
                const type = e.target.value;
                if (type === 'none') {
                  updateField({
                    options: { ...field.options, initialValue: null }
                  });
                } else if (type === 'today') {
                  updateField({
                    options: { ...field.options, initialValue: { type: 'dynamic', formula: 'Today()' } }
                  });
                } else {
                  updateField({
                    options: { ...field.options, initialValue: { type: 'static', value: '' } }
                  });
                }
              }}
              minimal
            >
              <option value="none">ไม่มีค่าเริ่มต้น</option>
              <option value="today">วันที่ปัจจุบัน (Today)</option>
              <option value="specific">วันที่ที่กำหนด</option>
            </GlassSelect>

            {initialValue?.type === 'static' && (
              <ThaiDatePicker
                label="เลือกวันที่"
                value={initialValue?.value || ''}
                onChange={(e) => updateField({
                  options: { ...field.options, initialValue: { type: 'static', value: e.target.value } }
                })}
                minimal
              />
            )}
          </div>
        );
      }

      case 'time': {
        // Determine dropdown value from initialValue
        let timeDropdownValue = 'none';
        if (initialValue?.type === 'dynamic' && initialValue?.formula === 'Now()') {
          timeDropdownValue = 'now';
        } else if (initialValue?.type === 'static' && initialValue?.value) {
          timeDropdownValue = 'specific';
        }

        return (
          <div className="space-y-3">
            <GlassSelect
              label="ค่าเริ่มต้น"
              value={timeDropdownValue}
              onChange={(e) => {
                const type = e.target.value;
                if (type === 'none') {
                  updateField({
                    options: { ...field.options, initialValue: null }
                  });
                } else if (type === 'now') {
                  updateField({
                    options: { ...field.options, initialValue: { type: 'dynamic', formula: 'Now()' } }
                  });
                } else {
                  updateField({
                    options: { ...field.options, initialValue: { type: 'static', value: '' } }
                  });
                }
              }}
              minimal
            >
              <option value="none">ไม่มีค่าเริ่มต้น</option>
              <option value="now">เวลาปัจจุบัน (Now)</option>
              <option value="specific">เวลาที่กำหนด</option>
            </GlassSelect>

            {initialValue?.type === 'static' && (
              <GlassInput
                label="เลือกเวลา"
                type="time"
                value={initialValue?.value || ''}
                onChange={(e) => updateField({
                  options: { ...field.options, initialValue: { type: 'static', value: e.target.value } }
                })}
                minimal
              />
            )}
          </div>
        );
      }

      case 'datetime': {
        // Determine dropdown value from initialValue
        let datetimeDropdownValue = 'none';
        if (initialValue?.type === 'dynamic' && initialValue?.formula === 'Now()') {
          datetimeDropdownValue = 'now';
        } else if (initialValue?.type === 'static' && initialValue?.value) {
          datetimeDropdownValue = 'specific';
        }

        return (
          <div className="space-y-3">
            <GlassSelect
              label="ค่าเริ่มต้น"
              value={datetimeDropdownValue}
              onChange={(e) => {
                const type = e.target.value;
                if (type === 'none') {
                  updateField({
                    options: { ...field.options, initialValue: null }
                  });
                } else if (type === 'now') {
                  updateField({
                    options: { ...field.options, initialValue: { type: 'dynamic', formula: 'Now()' } }
                  });
                } else {
                  updateField({
                    options: { ...field.options, initialValue: { type: 'static', value: '' } }
                  });
                }
              }}
              minimal
            >
              <option value="none">ไม่มีค่าเริ่มต้น</option>
              <option value="now">วันที่และเวลาปัจจุบัน (Now)</option>
              <option value="specific">วันที่และเวลาที่กำหนด</option>
            </GlassSelect>

            {initialValue?.type === 'static' && (
              <ThaiDateTimePicker
                label="เลือกวันที่และเวลา"
                value={initialValue?.value || ''}
                onChange={(e) => updateField({
                  options: { ...field.options, initialValue: { type: 'static', value: e.target.value } }
                })}
                minimal
              />
            )}
          </div>
        );
      }

      case 'multiple_choice':
        const options = field.options?.options || [];
        const allowMultiple = field.options?.allowMultiple || false;

        if (options.length === 0) {
          return (
            <p className="text-sm text-muted-foreground">
              เพิ่มตัวเลือกก่อนเพื่อกำหนดค่าเริ่มต้น
            </p>
          );
        }

        if (allowMultiple) {
          // Multiple selection - checkboxes
          return (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80">เลือกตัวเลือกเริ่มต้น</label>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <label key={index} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(initialValue || []).includes(option)}
                      onChange={(e) => {
                        const currentValues = initialValue || [];
                        const newValues = e.target.checked
                          ? [...currentValues, option]
                          : currentValues.filter(v => v !== option);
                        updateField({
                          options: { ...field.options, initialValue: newValues.length > 0 ? newValues : null }
                        });
                      }}
                      className="w-4 h-4 text-primary focus:ring-primary/20 focus:ring-2 rounded"
                    />
                    <span className="text-sm">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        } else {
          // Single selection - radio
          return (
            <GlassSelect
              label="ตัวเลือกเริ่มต้น"
              value={initialValue || ''}
              onChange={(e) => updateField({
                options: { ...field.options, initialValue: e.target.value || null }
              })}
              minimal
            >
              <option value="">ไม่มีค่าเริ่มต้น</option>
              {options.map((option, index) => (
                <option key={index} value={option}>{option}</option>
              ))}
            </GlassSelect>
          );
        }

      case 'rating':
        const maxRating = field.options?.maxRating || 5;
        return (
          <GlassSelect
            label="คะแนนเริ่มต้น"
            value={initialValue || ''}
            onChange={(e) => updateField({
              options: { ...field.options, initialValue: e.target.value ? parseInt(e.target.value) : null }
            })}
            minimal
          >
            <option value="">ไม่มีค่าเริ่มต้น</option>
            {Array.from({ length: maxRating }, (_, i) => i + 1).map(rating => (
              <option key={rating} value={rating}>{rating} ดาว</option>
            ))}
          </GlassSelect>
        );

      case 'slider':
        const min = field.options?.min || 0;
        const max = field.options?.max || 100;
        const step = field.options?.step || 1;

        return (
          <div className="space-y-2">
            <GlassInput
              label="ค่าเริ่มต้น"
              type="number"
              value={initialValue !== null && initialValue !== undefined ? initialValue : ''}
              onChange={(e) => {
                const value = e.target.value === '' ? null : parseFloat(e.target.value);
                updateField({
                  options: { ...field.options, initialValue: value }
                });
              }}
              min={min}
              max={max}
              step={step}
              placeholder={`ค่าระหว่าง ${min} - ${max}`}
              minimal
            />
            {initialValue !== null && initialValue !== undefined && (
              <p className="text-xs text-success">
                ✅ ค่าเริ่มต้น: {initialValue} {field.options?.unit || ''}
              </p>
            )}
          </div>
        );

      case 'province':
        // สามารถเพิ่มรายการจังหวัดได้ แต่ตอนนี้ให้ user พิมพ์ชื่อจังหวัดเอง
        return (
          <GlassInput
            label="จังหวัดเริ่มต้น"
            value={initialValue || ''}
            onChange={(e) => updateField({
              options: { ...field.options, initialValue: e.target.value }
            })}
            placeholder="เช่น กรุงเทพมหานคร"
            minimal
          />
        );

      case 'factory':
        return (
          <GlassInput
            label="โรงงานเริ่มต้น"
            value={initialValue || ''}
            onChange={(e) => updateField({
              options: { ...field.options, initialValue: e.target.value }
            })}
            placeholder="ชื่อโรงงาน"
            minimal
          />
        );

      case 'lat_long':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <GlassInput
                label="Latitude เริ่มต้น"
                type="number"
                value={initialValue?.lat || ''}
                onChange={(e) => updateField({
                  options: {
                    ...field.options,
                    initialValue: {
                      lat: e.target.value ? parseFloat(e.target.value) : null,
                      lng: initialValue?.lng || null
                    }
                  }
                })}
                placeholder="เช่น 13.7563"
                step="0.0001"
                minimal
              />
              <GlassInput
                label="Longitude เริ่มต้น"
                type="number"
                value={initialValue?.lng || ''}
                onChange={(e) => updateField({
                  options: {
                    ...field.options,
                    initialValue: {
                      lat: initialValue?.lat || null,
                      lng: e.target.value ? parseFloat(e.target.value) : null
                    }
                  }
                })}
                placeholder="เช่น 100.5018"
                step="0.0001"
                minimal
              />
            </div>
            {initialValue?.lat && initialValue?.lng && (
              <p className="text-xs text-success">
                ✅ พิกัดเริ่มต้น: {initialValue.lat}, {initialValue.lng}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  }

  function renderFieldSpecificOptions() {
    switch (field.type) {
      case 'multiple_choice':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <GlassSelect
                label="รูปแบบการแสดงผล"
                value={field.options?.displayStyle || 'radio'}
                onChange={(e) => updateField({
                  options: { ...field.options, displayStyle: e.target.value }
                })}
                minimal
              >
                <option value="radio">ปุ่มเลือก</option>
                <option value="buttons">ปุ่มกด</option>
                <option value="dropdown">เมนูดรอปดาวน์</option>
              </GlassSelect>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.options?.allowMultiple || false}
                  onChange={(e) => updateField({
                    options: { ...field.options, allowMultiple: e.target.checked }
                  })}
                  className="w-4 h-4 text-primary focus:ring-primary/20 focus:ring-2 rounded"
                />
                <span className="text-sm">เลือกได้หลายตัว</span>
              </label>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground/80">ตัวเลือก</label>
              <MultipleChoiceOptions
                options={field.options?.options || []}
                onChange={(options) => updateField({
                  options: { ...field.options, options }
                })}
              />
            </div>
          </div>
        );

      case 'number':
        return (
          <div className="space-y-4">
            <GlassSelect
              label="รูปแบบการแสดงผล"
              value={field.options?.decimalPlaces !== undefined ? field.options.decimalPlaces : '-1'}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                updateField({
                  options: {
                    ...field.options,
                    decimalPlaces: value === -1 ? undefined : value
                  }
                });
              }}
              minimal
            >
              <option value="-1">ไม่จัดรูปแบบ</option>
              <option value="0">จำนวนเต็ม (xxx,xxx)</option>
              <option value="1">ทศนิยม 1 ตำแหน่ง (xxx,xxx.x)</option>
              <option value="2">ทศนิยม 2 ตำแหน่ง (xxx,xxx.xx)</option>
              <option value="3">ทศนิยม 3 ตำแหน่ง (xxx,xxx.xxx)</option>
              <option value="4">ทศนิยม 4 ตำแหน่ง (xxx,xxx.xxxx)</option>
            </GlassSelect>

            {(field.options?.decimalPlaces === undefined || field.options?.decimalPlaces === null) && (
              <p className="text-xs text-muted-foreground">
                ℹ️ เมื่อเลือก "ไม่จัดรูปแบบ" ตัวเลขจะแสดงตามที่ผู้ใช้ป้อนโดยไม่มี comma คั่น
              </p>
            )}

            {field.options?.decimalPlaces !== undefined && field.options?.decimalPlaces !== null && (
              <p className="text-xs text-success">
                ✅ ตัวเลขจะแสดงในรูปแบบ: {field.options.decimalPlaces === 0 ? '1,234' : `1,234.${'0'.repeat(field.options.decimalPlaces)}`}
              </p>
            )}
          </div>
        );

      case 'rating':
        return (
          <GlassInput
            label="คะแนนสูงสุด"
            type="number"
            value={field.options?.maxRating || 5}
            onChange={(e) => updateField({
              options: { ...field.options, maxRating: parseInt(e.target.value) || 5 }
            })}
            min="1"
            max="10"
            tooltip="จำนวนดาวสูงสุด (1-10)"
            minimal
          />
        );

      case 'slider':
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <GlassInput
              label="ค่าต่ำสุด"
              type="number"
              value={field.options?.min || 0}
              onChange={(e) => updateField({
                options: { ...field.options, min: parseInt(e.target.value) || 0 }
              })}
              minimal
            />
            <GlassInput
              label="ค่าสูงสุด"
              type="number"
              value={field.options?.max || 100}
              onChange={(e) => updateField({
                options: { ...field.options, max: parseInt(e.target.value) || 100 }
              })}
              minimal
            />
            <GlassInput
              label="ช่วงห่าง"
              type="number"
              value={field.options?.step || 1}
              onChange={(e) => updateField({
                options: { ...field.options, step: parseInt(e.target.value) || 1 }
              })}
              min="1"
              minimal
            />
            <GlassInput
              label="หน่วย"
              value={field.options?.unit || ''}
              onChange={(e) => updateField({
                options: { ...field.options, unit: e.target.value }
              })}
              placeholder="เช่น %, บาท"
              minimal
            />
          </div>
        );

      default:
        return null;
    }
  }
}

// Multiple Choice Options Manager
function MultipleChoiceOptions({ options = [], onChange }) {
  const addOption = () => {
    onChange([...options, '']);
  };

  const updateOption = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    onChange(newOptions);
  };

  const removeOption = (index) => {
    onChange(options.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2 sm:space-y-3">
      {options.map((option, index) => (
        <div key={index} className="flex items-center gap-2 sm:gap-3">
          {/* Option Input - Takes most space */}
          <div className="flex-1">
            <GlassInput
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              placeholder={`ตัวเลือก ${index + 1}`}
              minimal
            />
          </div>

          {/* Compact Delete Button */}
          <div className="flex-shrink-0">
            <div
              onClick={() => removeOption(index)}
              title="ลบตัวเลือก"
              className="flex items-center justify-center text-destructive hover:text-red-400 min-w-12 min-h-12 w-8 xs:w-9 sm:w-10 h-8 xs:h-9 sm:h-10 touch-target-min cursor-pointer transition-all duration-300"
              style={{
                background: 'transparent',
                border: 'none'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
              }}
            >
              <FontAwesomeIcon icon={faTrashAlt} className="w-3 h-3" />
            </div>
          </div>
        </div>
      ))}

      {/* Add Option Button - Accessible */}
      <GlassButton
        variant="ghost"
        onClick={addOption}
        className="w-full border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/50 py-2 sm:py-3 mt-3 sm:mt-4 touch-target-comfortable min-h-12 rounded-xl"
        aria-label="เพิ่มตัวเลือกใหม่"
      >
        <FontAwesomeIcon icon={faPlus} className="mr-2 w-4 h-4" />
        <span className="text-sm font-medium">เพิ่มตัวเลือก</span>
      </GlassButton>
    </div>
  );
}

// Enhanced Sub Form Builder with Main Form Structure
function SubFormBuilder({ subForm, onChange, onFieldUpdate, onRemove, canMoveUp, canMoveDown, onMoveUp, onMoveDown, onDuplicate, isDefaultEmpty = false, validateFormula, toast }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentTab, setCurrentTab] = useState('fields'); // 'fields' or 'settings'
  const subFormCardRef = useRef(null);

  // Auto-scroll when expanding the sub-form
  useEffect(() => {
    if (isExpanded && subFormCardRef.current) {
      setTimeout(() => {
        const topMenuHeight = 80; // Approximate height of top menu
        const elementTop = subFormCardRef.current.getBoundingClientRect().top;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        window.scrollTo({
          top: scrollTop + elementTop - topMenuHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [isExpanded]);

  // Drag and drop sensors for subform fields
  const subFormSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Calculate table field count (max 5 fields)
  // Support both camelCase and snake_case for compatibility
  const tableFieldCount = useMemo(() => {
    return (subForm.fields || []).filter(f => f.showInTable === true || f.show_in_table === true).length;
  }, [subForm.fields]);

  const maxTableFields = 5; // Maximum fields allowed in table

  const updateSubForm = (updates) => {
    onChange({ ...subForm, ...updates });
  };

  // Handle drag end event for subform fields
  const handleSubFormDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id && subForm.fields) {
      const oldIndex = subForm.fields.findIndex((field) => field.id === active.id);
      const newIndex = subForm.fields.findIndex((field) => field.id === over.id);

      // ✅ FIX: Update order property after sub-form field reordering
      const reorderedFields = arrayMove(subForm.fields, oldIndex, newIndex)
        .map((field, index) => ({ ...field, order: index }));

      updateSubForm({
        fields: reorderedFields,
      });
    }
  };

  const addField = () => {
    // Check if we already have 5 fields with showInTable enabled
    const currentTableFieldCount = (subForm.fields || []).filter(f => f.showInTable === true || f.show_in_table === true).length;
    const canAddToTable = currentTableFieldCount < maxTableFields;

    const newField = {
      id: generateId(),
      title: "",
      type: "short_answer",
      required: true, // Default to true to allow showInTable
      showInTable: canAddToTable, // Only enable if under limit (5 fields max)
      sendTelegram: false,
      telegramPrefix: '',
      telegramOrder: 0,
      showCondition: undefined, // Field visibility - always visible by default
      options: {}
    };
    updateSubForm({
      fields: [...(subForm.fields || []), newField]
    });

    // Scroll to the new field after a short delay to ensure DOM is updated
    setTimeout(() => {
      const fieldElements = document.querySelectorAll(`[data-field-id="${newField.id}"]`);
      if (fieldElements.length > 0) {
        fieldElements[0].scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    }, 100);
  };

  const updateField = (fieldId, fieldData) => {
    // ✅ FIX: Preserve all existing field properties when updating
    const updatedFields = subForm.fields.map(field => {
      if (field.id === fieldId) {
        // Merge new data with existing field to preserve settings like required, showInTable
        return { ...field, ...fieldData };
      }
      return field;
    });

    console.log('🔄 SubFormBuilder.updateField:', {
      fieldId,
      fieldData,
      updatedField: updatedFields.find(f => f.id === fieldId)
    });

    // ✅ NEW: If onFieldUpdate callback provided, use it for immediate propagation to main form state
    if (onFieldUpdate) {
      const mergedFieldData = { ...subForm.fields.find(f => f.id === fieldId), ...fieldData };
      onFieldUpdate(subForm.id, fieldId, mergedFieldData);
      console.log('✅ Field update propagated to main form via onFieldUpdate:', {
        subFormId: subForm.id,
        fieldId,
        fieldData: mergedFieldData,
        showInTable: mergedFieldData.showInTable,  // ✅ Explicitly log showInTable
        required: mergedFieldData.required,
        showCondition: mergedFieldData.showCondition  // ✅ Explicitly log showCondition
      });
    }

    // Also update local SubFormBuilder state for UI responsiveness
    updateSubForm({
      fields: updatedFields
    });
  };

  const removeField = (fieldId) => {
    updateSubForm({
      fields: subForm.fields.filter(field => field.id !== fieldId)
    });
  };

  const moveField = (fieldId, direction) => {
    const currentIndex = subForm.fields.findIndex(field => field.id === fieldId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= subForm.fields.length) return;

    const newFields = [...subForm.fields];
    [newFields[currentIndex], newFields[newIndex]] = [newFields[newIndex], newFields[currentIndex]];

    updateSubForm({ fields: newFields });
  };

  const duplicateField = (fieldId) => {
    const fieldToDuplicate = subForm.fields.find(field => field.id === fieldId);
    if (fieldToDuplicate) {
      const duplicatedField = {
        ...fieldToDuplicate,
        id: generateId(),
        title: `${fieldToDuplicate.title} (สำเนา)`
      };
      const fieldIndex = subForm.fields.findIndex(field => field.id === fieldId);
      const newFields = [...subForm.fields];
      newFields.splice(fieldIndex + 1, 0, duplicatedField);
      updateSubForm({ fields: newFields });
    }
  };

  return (
    <GlassCard ref={subFormCardRef} variant="elevated" className="form-card-glow form-card-animate form-card-borderless motion-container animation-optimized group transition-all duration-400 ease-out border-2 border-dashed border-accent/30 shadow-lg hover:shadow-xl hover:border-accent/50 orange-neon-permanent">
      <GlassCardHeader>
        <div className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-full bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center"
            style={{ clipPath: 'circle(50% at center)' }}
          >
            <FontAwesomeIcon icon={faLayerGroup} className="text-white w-4 h-4" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="form-card-title">
              {subForm.title || "ฟอร์มย่อย"}
            </h3>
            <p className="form-card-stats mt-1">
              {subForm.fields?.length || 0} ฟิลด์
            </p>
          </div>

          {/* Action Icons for SubForm - 8px Grid */}
          <div className="flex-shrink-0">
            <div className="inline-flex items-center gap-2 rounded-xl px-2 py-2">
              <div
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "ย่อ" : "ขยาย"}
                className="flex items-center justify-center opacity-70 hover:opacity-100 w-8 h-8 touch-target-min cursor-pointer transition-all duration-300"
                style={{
                  background: 'transparent',
                  border: 'none'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                }}
              >
                <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} className="w-3 h-3" />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div
                    title="ตัวเลือกเพิ่มเติม"
                    className="flex items-center justify-center opacity-60 hover:opacity-100 transition-all duration-300 w-8 h-8 touch-target-min cursor-pointer"
                    style={{
                      background: 'transparent',
                      border: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'scale(1)';
                    }}
                  >
                    <FontAwesomeIcon icon={faEllipsisV} className="w-3 h-3" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass-container blur-edge-intense">
                  {canMoveUp && (
                    <DropdownMenuItem onClick={onMoveUp}>
                      <FontAwesomeIcon icon={faArrowUp} className="mr-2" />
                      ย้ายขึ้น
                    </DropdownMenuItem>
                  )}
                  {canMoveDown && (
                    <DropdownMenuItem onClick={onMoveDown}>
                      <FontAwesomeIcon icon={faArrowDown} className="mr-2" />
                      ย้ายลง
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={onDuplicate}>
                    <FontAwesomeIcon icon={faCopy} className="mr-2" />
                    ทำสำเนา
                  </DropdownMenuItem>
                  {!isDefaultEmpty && (
                    <DropdownMenuItem onClick={onRemove} className="text-destructive">
                      <FontAwesomeIcon icon={faTrashAlt} className="mr-2" />
                      ลบ
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </GlassCardHeader>

      {isExpanded && (
        <GlassCardContent className="space-y-8 pt-0">
          <Separator />

          {/* Form Info Section - Using InlineEdit like Main Form - 8px Grid */}
          <GlassCard className="form-card-glow form-card-animate form-card-borderless motion-container animation-optimized group transition-all duration-400 ease-out animate-fade-in border-2 border-primary/20 orange-neon-permanent">
            <GlassCardContent className="space-y-6 p-6 sm:p-8">
              <div className="space-y-4">
                <InlineEdit
                  value={subForm.title}
                  onChange={(value) => updateSubForm({ title: value })}
                  placeholder="คลิกเพื่อระบุชื่อฟอร์มย่อย..."
                  isTitle={true}
                />
                <InlineEdit
                  value={subForm.description || ''}
                  onChange={(value) => updateSubForm({ description: value })}
                  placeholder="คลิกเพื่อเพิ่มคำอธิบายฟอร์มย่อย..."
                  isTitle={false}
                />
              </div>
            </GlassCardContent>
          </GlassCard>

          {/* Navigation Tabs - Matching Main Form - 8px Grid */}
          <div className="space-y-6">
            <div className="flex items-center gap-6 border-b border-border/20">
              <button
                onClick={() => setCurrentTab('fields')}
                className={`relative px-6 py-3 text-sm font-medium transition-all duration-200 ${
                  currentTab === 'fields'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FontAwesomeIcon icon={faLayerGroup} className="mr-2" />
                ฟิลด์ในฟอร์มย่อย
              </button>
              <button
                onClick={() => setCurrentTab('settings')}
                className={`relative px-6 py-3 text-sm font-medium transition-all duration-200 ${
                  currentTab === 'settings'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FontAwesomeIcon icon={faCog} className="mr-2" />
                ตั้งค่า
              </button>
            </div>

            {/* Fields Tab Content - 8px Grid */}
            {currentTab === 'fields' && (
              <div className="space-y-6">
                {subForm.fields && subForm.fields.length > 0 ? (
                  <DndContext
                    sensors={subFormSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleSubFormDragEnd}
                  >
                    <SortableContext
                      items={subForm.fields.map(field => field.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-6">
                        {subForm.fields.map((field, index) => (
                          <SortableFieldEditor
                            key={field.id}
                            field={field}
                            onChange={(fieldData) => updateField(field.id, fieldData)}
                            onRemove={() => removeField(field.id)}
                            canMoveUp={index > 0}
                            canMoveDown={index < subForm.fields.length - 1}
                            onMoveUp={() => moveField(field.id, 'up')}
                            onMoveDown={() => moveField(field.id, 'down')}
                            onDuplicate={() => duplicateField(field.id)}
                            isSubForm={true}
                            allFields={subForm.fields}
                            tableFieldCount={tableFieldCount}
                            maxTableFields={maxTableFields}
                            formTitle={subForm.title}
                            validateFormula={validateFormula}
                            toast={toast}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : null}

                {/* Add Field Button - Always visible, positioned after fields or as standalone - 8px Grid */}
                <div className="pt-8 flex justify-center">
                  {subForm.fields && subForm.fields.length > 0 ? (
                    <AnimatedAddButton
                      onClick={addField}
                      tooltip="เพิ่มฟิลด์ใหม่"
                    />
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4 opacity-50">📝</div>
                      <p className="form-card-description mb-6 text-muted-foreground">ยังไม่มีฟิลด์ในฟอร์มย่อย</p>
                      <div className="flex justify-center">
                        <AnimatedAddButton
                          onClick={addField}
                          tooltip="สร้างฟิลด์แรก"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Settings Tab Content - 8px Grid */}
            {currentTab === 'settings' && (
              <div className="space-y-6">
                <GlassCard className="form-card-glow form-card-animate form-card-borderless motion-container animation-optimized group transition-all duration-400 ease-out orange-neon-permanent">
                  <GlassCardContent className="space-y-6 p-6 sm:p-8">
                    <div className="flex items-center gap-4">
                      <FontAwesomeIcon icon={faCog} className="text-primary" />
                      <h3 className="form-card-title">ตั้งค่าฟอร์มย่อย</h3>
                    </div>
                    <div className="form-card-description">
                      <p>• ฟอร์มย่อยจะแสดงในหน้ารายละเอียดของฟอร์มหลักหลังจากบันทึกข้อมูลแล้ว</p>
                      <p>• ผู้ใช้สามารถเพิ่มข้อมูลฟอร์มย่อยได้หลายครั้ง</p>
                      <p>• ข้อมูลฟอร์มย่อยจะแสดงในรูปแบบตารางสรุป</p>
                    </div>
                  </GlassCardContent>
                </GlassCard>
              </div>
            )}
          </div>
        </GlassCardContent>
      )}
    </GlassCard>
  );
}


// Main Enhanced Form Builder Component
export default function EnhancedFormBuilder({ initialForm, onSave, onCancel, onSaveHandlerReady }) {
  const { userRole } = useAuth();
  const [showCopied, setShowCopied] = useState(false);

  // ✅ v0.8.4: Form Title Uniqueness validation state
  const [titleValidation, setTitleValidation] = useState({
    isChecking: false,
    exists: false,
    message: '',
  });

  // Check if user has permission to see PowerBI info
  const canSeePowerBIInfo = ['super_admin', 'admin'].includes(userRole);

  // Check if user has permission to delete forms
  const canDeleteForms = ['super_admin', 'admin'].includes(userRole);

  const [form, setForm] = useState({
    id: initialForm?.id || generateFormId(),
    title: initialForm?.title || '',
    description: initialForm?.description || '',
    table_name: initialForm?.table_name || null,
    data_retention_years: initialForm?.data_retention_years || initialForm?.dataRetentionYears || 2,
    // ⚠️ CRITICAL FIX: Filter out sub-form fields (sub_form_id !== null)
    // Only include main form fields in the form builder
    fields: initialForm?.fields ? initialForm.fields
      .filter(field => !field.sub_form_id && !field.subFormId)
      .map(field => ({
        ...field,
        // Ensure new properties exist with default values if not present
        showInTable: field.showInTable !== undefined ? field.showInTable : false,
        sendTelegram: field.sendTelegram !== undefined ? field.sendTelegram : false,
        telegramOrder: field.telegramOrder !== undefined ? field.telegramOrder : 0,
        telegramPrefix: field.telegramPrefix !== undefined ? field.telegramPrefix : '',
      })) : [
      {
        id: generateId(),
        title: "",
        type: "short_answer",
        required: false,
        showInTable: true, // Default to true so fields are visible in table
        sendTelegram: false,
        telegramPrefix: '',
        telegramOrder: 0,
        options: {}
      }
    ],
    subForms: initialForm?.subForms ? initialForm.subForms.map(subForm => ({
      ...subForm,
      fields: subForm.fields ? subForm.fields.map(field => {
        // ✅ CRITICAL: Clean snake_case properties when loading from backend
        const {
          show_in_table,
          send_telegram,
          telegram_order,
          telegram_prefix,
          show_condition,
          telegram_config,
          validation_rules,
          createdAt,
          updatedAt,
          ...cleanField
        } = field;

        return {
          ...cleanField,
          // Ensure camelCase properties exist with correct values
          showInTable: field.showInTable !== undefined ? field.showInTable : (field.show_in_table ?? false),
          sendTelegram: field.sendTelegram !== undefined ? field.sendTelegram : (field.send_telegram ?? false),
          telegramOrder: field.telegramOrder !== undefined ? field.telegramOrder : (field.telegram_order ?? 0),
          telegramPrefix: field.telegramPrefix !== undefined ? field.telegramPrefix : (field.telegram_prefix ?? ''),
          showCondition: field.showCondition !== undefined ? field.showCondition : (field.show_condition ?? undefined),
        };
      }) : []
    })) : [],
    visibleRoles: initialForm?.roles_allowed || initialForm?.visibleRoles || DEFAULT_VISIBLE_ROLES,
    settings: {
      telegram: {
        enabled: initialForm?.settings?.telegram?.enabled || false,
        botToken: initialForm?.settings?.telegram?.botToken || '',
        groupId: initialForm?.settings?.telegram?.groupId || '',
        fields: initialForm?.settings?.telegram?.fields || []
      },
      documentNumber: {
        enabled: initialForm?.settings?.documentNumber?.enabled || false,
        prefix: initialForm?.settings?.documentNumber?.prefix || 'DOC',
        format: initialForm?.settings?.documentNumber?.format || 'prefix-number/year',
        yearFormat: initialForm?.settings?.documentNumber?.yearFormat || 'buddhist',
        initialNumber: initialForm?.settings?.documentNumber?.initialNumber || 1
      },
      dateFormat: {
        yearFormat: initialForm?.settings?.dateFormat?.yearFormat || 'christian',
        format: initialForm?.settings?.dateFormat?.format || 'dd/mm/yyyy'
      },
      // ✅ v0.7.40: Conditional Formatting
      conditionalFormatting: {
        enabled: initialForm?.settings?.conditionalFormatting?.enabled || false,
        rules: initialForm?.settings?.conditionalFormatting?.rules || []
      },
      // ✅ v0.9.0: PDPA Privacy Notice
      privacyNotice: {
        enabled: initialForm?.settings?.privacyNotice?.enabled || false,
        mode: initialForm?.settings?.privacyNotice?.mode || 'disabled',
        customText: initialForm?.settings?.privacyNotice?.customText || { th: '', en: '' },
        linkUrl: initialForm?.settings?.privacyNotice?.linkUrl || '',
        linkText: initialForm?.settings?.privacyNotice?.linkText || { th: 'นโยบายความเป็นส่วนตัว', en: 'Privacy Policy' },
        requireAcknowledgment: initialForm?.settings?.privacyNotice?.requireAcknowledgment !== false
      },
      // ✅ v0.9.0: PDPA Consent Management
      consentManagement: {
        enabled: initialForm?.settings?.consentManagement?.enabled || false
      }
    },
    // New telegram settings structure for enhanced component
    telegramSettings: {
      enabled: initialForm?.telegramSettings?.enabled || false,
      botToken: initialForm?.telegramSettings?.botToken || '',
      groupId: initialForm?.telegramSettings?.groupId || '',
      messagePrefix: initialForm?.telegramSettings?.messagePrefix || 'ข้อมูลใหม่จาก [FormName] [DateTime]',
      selectedFields: initialForm?.telegramSettings?.selectedFields || []
    }
  });

  const [activeSection, setActiveSection] = useState('main');

  // Enhanced toast notifications
  const toast = useEnhancedToast();

  // ✅ v0.7.40: Formula validation function
  const validateFormula = useCallback((formula, fieldTitle) => {
    if (!formula || formula.trim() === '') {
      return { valid: true, error: null };
    }

    try {
      // Create a field map for validation (use current form fields)
      const fieldMap = {};
      form.fields.forEach(field => {
        fieldMap[field.id] = field;
      });

      // Try to evaluate with dummy data to check syntax
      formulaEngine.evaluate(formula, {}, fieldMap);

      return { valid: true, error: null };
    } catch (error) {
      console.error(`❌ [Formula Validation] Field "${fieldTitle}":`, error.message);
      return {
        valid: false,
        error: error.message
      };
    }
  }, [form.fields]);

  // ✅ NEW: Migration state for field change detection and preview
  const [showMigrationPreview, setShowMigrationPreview] = useState(false);
  const [detectedChanges, setDetectedChanges] = useState([]);
  const [pendingMigrationChanges, setPendingMigrationChanges] = useState(null);
  const [migrationQueueStatus, setMigrationQueueStatus] = useState({
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0
  });
  const [isPollingQueue, setIsPollingQueue] = useState(false);

  // ✅ FIX: Store original FILTERED fields snapshot for accurate change detection
  // This ensures we compare against what was actually displayed in the form builder,
  // not the raw backend data which may include sub-form fields
  const originalFieldsSnapshot = useRef(
    initialForm?.fields
      ? initialForm.fields
          .filter(field => !field.sub_form_id && !field.subFormId)
          .map(field => ({
            id: field.id,
            title: field.title,
            type: field.type,
            columnName: field.columnName || field.column_name || null,
            required: field.required || false
          }))
      : []
  );

  const updateForm = (updates) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  // ✅ v0.8.4: Debounced function to check title uniqueness
  const checkTitleDebounced = useRef(null);

  const checkTitleUniqueness = useCallback(async (title) => {
    if (!title || title.trim().length === 0) {
      setTitleValidation({ isChecking: false, exists: false, message: '' });
      return;
    }

    setTitleValidation({ isChecking: true, exists: false, message: '' });

    try {
      // ✅ v0.8.4: Build params conditionally - don't send excludeFormId if creating new form
      const params = { title: title.trim() };
      if (initialForm?.id) {
        params.excludeFormId = initialForm.id;
      }

      const response = await apiClient.get('/forms/check-title', { params });

      if (response.data.success) {
        setTitleValidation({
          isChecking: false,
          exists: response.data.data.exists,
          message: response.data.data.message,
        });
      }
    } catch (error) {
      // Silently fail - don't show error to user for validation endpoint
      setTitleValidation({ isChecking: false, exists: false, message: '' });
    }
  }, [initialForm?.id]);

  // ✅ v0.8.4: Watch for title changes and validate
  useEffect(() => {
    // Clear existing timeout
    if (checkTitleDebounced.current) {
      clearTimeout(checkTitleDebounced.current);
    }

    // Only check if title has actually changed from initial
    if (form.title && form.title.trim() !== initialForm?.title) {
      checkTitleDebounced.current = setTimeout(() => {
        checkTitleUniqueness(form.title);
      }, 800); // 800ms debounce
    } else {
      setTitleValidation({ isChecking: false, exists: false, message: '' });
    }

    // Cleanup on unmount
    return () => {
      if (checkTitleDebounced.current) {
        clearTimeout(checkTitleDebounced.current);
      }
    };
  }, [form.title, initialForm?.title, checkTitleUniqueness]);

  // ✅ NEW: Poll migration queue status every 5 seconds if there are pending migrations
  useEffect(() => {
    let intervalId;

    const pollQueueStatus = async () => {
      if (!initialForm?.id) return; // Only poll for existing forms

      try {
        const response = await MigrationService.getQueueStatus(initialForm.id);
        const status = response.data?.queue || {};

        setMigrationQueueStatus({
          waiting: status.waiting || 0,
          active: status.active || 0,
          completed: status.completed || 0,
          failed: status.failed || 0
        });

        // Stop polling if no active or waiting migrations
        const hasPendingMigrations = (status.waiting || 0) > 0 || (status.active || 0) > 0;
        setIsPollingQueue(hasPendingMigrations);

        if (!hasPendingMigrations && intervalId) {
          clearInterval(intervalId);
        }
      } catch (error) {
        console.error('Failed to poll queue status:', error);
        // Continue polling even on error (might be temporary network issue)
      }
    };

    // Start polling if we detect migrations were triggered
    if (isPollingQueue || (migrationQueueStatus.waiting > 0 || migrationQueueStatus.active > 0)) {
      // Poll immediately
      pollQueueStatus();

      // Then poll every 5 seconds
      intervalId = setInterval(pollQueueStatus, 5000);
    }

    // Cleanup on unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isPollingQueue, initialForm?.id, migrationQueueStatus.waiting, migrationQueueStatus.active]);

  // Copy to clipboard function
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    });
  };

  // Generate PowerBI connection info
  const getPowerBIInfo = () => {
    // PostgreSQL Connection Details
    const server = 'localhost:5432';
    const database = 'qcollector_db';

    // Use actual table_name from database (with Thai→English translation)
    // If table_name doesn't exist, fallback to old generator
    const mainTable = form.table_name || (() => {
      const { generateTableName } = require('../utils/tableNameGenerator');
      return generateTableName(form.title, 'form_');
    })();

    // Use actual table_name from sub-forms
    const subFormTables = form.subForms?.map(sf => ({
      title: sf.title,
      tableName: sf.table_name || (() => {
        const { generateTableName } = require('../utils/tableNameGenerator');
        return generateTableName(sf.title, 'form_');
      })()
    })) || [];

    return {
      server,
      database,
      mainTable,
      mainTableDisplay: `${mainTable} (${form.title})`,
      subFormTables,
      formId: form.id,
      description: 'Connect directly to PostgreSQL database in Power BI Desktop'
    };
  };

  // Calculate available fields for telegram notifications
  const getAvailableFields = () => {
    return form.fields.filter(field => field.sendTelegram);
  };

  const addField = () => {
    // Check if we already have 5 fields with showInTable enabled
    const maxTableFields = 5; // Maximum fields allowed in table for main form
    const currentTableFieldCount = form.fields.filter(f => f.showInTable === true || f.show_in_table === true).length;
    const canAddToTable = currentTableFieldCount < maxTableFields;

    const newField = {
      id: generateId(),
      title: "",
      type: "short_answer",
      required: true, // Default to true to allow showInTable
      showInTable: canAddToTable, // Only enable if under limit (5 fields max)
      sendTelegram: false,
      telegramPrefix: '',
      telegramOrder: 0,
      showCondition: undefined, // Field visibility - always visible by default
      options: {}
    };
    updateForm({ fields: [...form.fields, newField] });

    // Scroll to the new field after a short delay to ensure DOM is updated
    setTimeout(() => {
      const fieldElements = document.querySelectorAll(`[data-field-id="${newField.id}"]`);
      if (fieldElements.length > 0) {
        fieldElements[0].scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    }, 100);
  };

  // Helper function to reorder telegram fields sequentially
  const reorderTelegramFields = (fieldsArray) => {
    // DON'T reorder fields - just update telegramOrder numbers
    // Keep fields in their current position in the form

    // Get telegram fields in their original order
    const telegramFields = [];
    fieldsArray.forEach((field, index) => {
      if (field.sendTelegram) {
        telegramFields.push({ field, originalIndex: index });
      }
    });

    // Create a map of field ID to new telegram order
    const telegramOrderMap = {};
    telegramFields.forEach(({ field }, index) => {
      telegramOrderMap[field.id] = index + 1;
    });

    // Update all fields with new telegram orders without changing position
    return fieldsArray.map(field => ({
      ...field,
      telegramOrder: field.sendTelegram ? (telegramOrderMap[field.id] || 0) : 0
    }));
  };

  const updateField = (fieldId, fieldData) => {
    // Debug logging
    console.log('🔧 updateField called:', {
      fieldId,
      fieldData,
      hasShowCondition: !!fieldData.showCondition,
      showConditionValue: fieldData.showCondition
    });

    const updatedFields = form.fields.map(field =>
      field.id === fieldId ? fieldData : field
    );

    // If telegram setting was changed, reorder all telegram fields
    const originalField = form.fields.find(f => f.id === fieldId);
    const telegramChanged = originalField && (
      originalField.sendTelegram !== fieldData.sendTelegram
    );

    updateForm({
      fields: telegramChanged ? reorderTelegramFields(updatedFields) : updatedFields
    });
  };

  const removeField = (fieldId) => {
    const remainingFields = form.fields.filter(field => field.id !== fieldId);
    const removedField = form.fields.find(field => field.id === fieldId);

    // If the removed field had telegram enabled, reorder remaining telegram fields
    const shouldReorder = removedField && removedField.sendTelegram;

    updateForm({
      fields: shouldReorder ? reorderTelegramFields(remainingFields) : remainingFields
    });
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end event
  const handleDragEnd = (event) => {
    const { active, over } = event;

    // Safety check: over must exist and have valid id
    if (!over || !over.id || !active || !active.id) {
      console.warn('[DragEnd] Invalid drag event:', { active, over });
      return;
    }

    // Check if over exists and is different from active
    if (active.id !== over.id) {
      const oldIndex = form.fields.findIndex((field) => field.id === active.id);
      const newIndex = form.fields.findIndex((field) => field.id === over.id);

      // Additional safety check for valid indices
      if (oldIndex === -1 || newIndex === -1) {
        console.warn('[DragEnd] Invalid field indices:', { oldIndex, newIndex, activeId: active.id, overId: over.id });
        return;
      }

      // ✅ FIX: Update order property after reordering
      const reorderedFields = arrayMove(form.fields, oldIndex, newIndex)
        .map((field, index) => ({ ...field, order: index }));

      // Check if any telegram fields were moved, if so reorder telegram numbers
      const hasTelegramFields = reorderedFields.some(f => f.sendTelegram);

      updateForm({
        fields: hasTelegramFields ? reorderTelegramFields(reorderedFields) : reorderedFields,
      });
    }
  };

  const moveField = (fieldId, direction) => {
    const currentIndex = form.fields.findIndex(field => field.id === fieldId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= form.fields.length) return;

    const newFields = [...form.fields];
    [newFields[currentIndex], newFields[newIndex]] = [newFields[newIndex], newFields[currentIndex]];

    // ✅ FIX: Update order property after arrow-button reordering
    const reorderedWithOrder = newFields.map((field, index) => ({ ...field, order: index }));

    // Check if any telegram fields were moved, if so reorder telegram numbers
    const hasTelegramFields = reorderedWithOrder.some(f => f.sendTelegram);

    updateForm({
      fields: hasTelegramFields ? reorderTelegramFields(reorderedWithOrder) : reorderedWithOrder
    });
  };

  const duplicateField = (fieldId) => {
    const fieldToDuplicate = form.fields.find(field => field.id === fieldId);
    if (fieldToDuplicate) {
      const duplicatedField = {
        ...fieldToDuplicate,
        id: generateId(),
        title: `${fieldToDuplicate.title} (สำเนา)`
      };
      const fieldIndex = form.fields.findIndex(field => field.id === fieldId);
      const newFields = [...form.fields];
      newFields.splice(fieldIndex + 1, 0, duplicatedField);
      updateForm({ fields: newFields });
    }
  };

  const addSubForm = () => {
    const newSubForm = {
      id: generateId(),
      title: "",
      description: "",
      fields: [],
      order: form.subForms.length // Add order field
    };
    console.log('➕ Adding new sub-form with order:', newSubForm.order);
    updateForm({ subForms: [...form.subForms, newSubForm] });

    // Scroll to the new sub-form after a short delay to ensure DOM is updated
    setTimeout(() => {
      const subFormElements = document.querySelectorAll(`[data-subform-id="${newSubForm.id}"]`);
      if (subFormElements.length > 0) {
        subFormElements[0].scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    }, 100);
  };

  const updateSubForm = (subFormId, subFormData) => {
    console.log('🔄 updateSubForm called:', {
      subFormId,
      title: subFormData.title,
      fieldsCount: subFormData.fields?.length || 0,
      currentSubFormsCount: form.subForms.length
    });

    const updatedSubForms = form.subForms.map(subForm =>
      subForm.id === subFormId ? subFormData : subForm
    );

    console.log('✅ Updated subForms array:', updatedSubForms.map(sf => ({
      id: sf.id,
      title: sf.title,
      fields: sf.fields?.length || 0
    })));

    updateForm({
      subForms: updatedSubForms
    });
  };

  // ✅ NEW: Update specific field within a sub-form (for field settings like required, showInTable)
  const updateSubFormField = useCallback((subFormId, fieldId, fieldUpdates) => {
    console.log('🔄 updateSubFormField called:', {
      subFormId,
      fieldId,
      updates: fieldUpdates
    });

    const updatedSubForms = form.subForms.map(subForm => {
      if (subForm.id === subFormId) {
        const updatedFields = subForm.fields.map(field =>
          field.id === fieldId ? { ...field, ...fieldUpdates } : field
        );

        console.log('✅ Updated field in sub-form:', {
          subFormId,
          fieldId,
          field: updatedFields.find(f => f.id === fieldId)
        });

        return {
          ...subForm,
          fields: updatedFields
        };
      }
      return subForm;
    });

    updateForm({
      subForms: updatedSubForms
    });
  }, [form.subForms, updateForm]);

  const removeSubForm = (subFormId) => {
    updateForm({
      subForms: form.subForms.filter(subForm => subForm.id !== subFormId)
    });
  };

  const moveSubForm = (subFormId, direction) => {
    const currentIndex = form.subForms.findIndex(subForm => subForm.id === subFormId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= form.subForms.length) return;

    const newSubForms = [...form.subForms];
    [newSubForms[currentIndex], newSubForms[newIndex]] = [newSubForms[newIndex], newSubForms[currentIndex]];

    updateForm({ subForms: newSubForms });
  };

  const duplicateSubForm = (subFormId) => {
    const subFormToDuplicate = form.subForms.find(subForm => subForm.id === subFormId);
    if (subFormToDuplicate) {
      const duplicatedSubForm = {
        ...subFormToDuplicate,
        id: generateId(),
        title: `${subFormToDuplicate.title} (สำเนา)`,
        fields: subFormToDuplicate.fields.map(field => ({
          ...field,
          id: generateId()
        }))
      };
      const subFormIndex = form.subForms.findIndex(subForm => subForm.id === subFormId);
      const newSubForms = [...form.subForms];
      newSubForms.splice(subFormIndex + 1, 0, duplicatedSubForm);
      updateForm({ subForms: newSubForms });
    }
  };

  const handleSave = useCallback(async () => {
    // ✅ v0.7.40: Validate all formulas before saving
    const invalidFormulas = [];
    form.fields.forEach(field => {
      if (field.showCondition?.enabled === false && field.showCondition?.formula) {
        const validation = validateFormula(field.showCondition.formula, field.title);
        if (!validation.valid) {
          invalidFormulas.push({
            fieldTitle: field.title,
            error: validation.error
          });
        }
      }
    });

    // If there are invalid formulas, show errors and abort save
    if (invalidFormulas.length > 0) {
      invalidFormulas.forEach(({ fieldTitle, error }) => {
        toast.error(`❌ สูตรผิด (${fieldTitle}): ${error}`, {
          title: "ตรวจสอบเงื่อนไขการแสดงฟิลด์",
          duration: 8000
        });
      });
      return; // Abort save
    }

    // Show loading toast immediately
    const loadingToastId = toast.loading('กำลังบันทึกฟอร์ม...', {
      title: "กรุณารอสักครู่"
    });

    try {
      // Debug: Log form data before save
      console.log('💾 Saving form:', {
        title: form.title,
        mainFields: form.fields.length,
        subForms: form.subForms.length,
        subFormsData: form.subForms.map(sf => ({
          id: sf.id,
          title: sf.title,
          fields: sf.fields?.length || 0
        }))
      });

      // ตรวจสอบว่ามีการเลือกฟิลด์สำหรับแสดงในตารางหรือไม่ (หลังจากกดปุ่ม save)
      // Support both camelCase and snake_case for compatibility
      const tableFields = form.fields.filter(field => field.showInTable === true || field.show_in_table === true);

      if (tableFields.length === 0) {
        // Dismiss loading toast
        toast.dismiss(loadingToastId);

        toast.error('กรุณาเลือกฟิลด์อย่างน้อย 1 ฟิลด์เพื่อแสดงในตาราง Submission', {
          title: "ข้อมูลไม่ครบถ้วน",
          duration: 8000,
          action: {
            label: "ไปที่การตั้งค่า",
            onClick: () => {
              // ค้นหาฟิลด์แรกและเปิดการตั้งค่า
              const firstFieldElement = document.querySelector('[data-field-id]');
              if (firstFieldElement) {
                firstFieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
          }
        });
        return;
      }

      // ✅ NEW: Detect field changes for existing forms (migration preview)
      // ✅ FIX: Use originalFieldsSnapshot instead of initialForm.fields
      // This ensures we only detect changes to fields that were actually displayed in the form builder
      if (initialForm?.id && originalFieldsSnapshot.current.length > 0) {
        const changes = MigrationService.detectFieldChanges(
          originalFieldsSnapshot.current,
          form.fields
        );

        console.log('🔍 Migration detection:', {
          isExistingForm: !!initialForm?.id,
          oldFieldsCount: originalFieldsSnapshot.current.length,
          newFieldsCount: form.fields.length,
          changesDetected: changes.length,
          changes
        });

        if (changes.length > 0) {
          // Dismiss loading toast
          toast.dismiss(loadingToastId);

          // Show migration preview modal
          setDetectedChanges(changes);
          setPendingMigrationChanges({
            formId: initialForm.id,
            changes
          });
          setShowMigrationPreview(true);

          console.log('⚠️ Field changes detected - showing preview modal');
          return; // Stop save process, wait for user confirmation
        }
      }

      // ✅ Helper function to clean field data (remove snake_case duplicates)
      const cleanFieldData = (field) => {
        // 🔍 Debug: Log raw field before cleaning
        console.log('📋 cleanFieldData - BEFORE:', {
          id: field.id,
          title: field.title,
          showInTable: field.showInTable,
          show_in_table: field.show_in_table,
          required: field.required,
          sendTelegram: field.sendTelegram,
          send_telegram: field.send_telegram,
          showCondition: field.showCondition,
          show_condition: field.show_condition
        });

        // First, ensure camelCase versions exist by copying from snake_case if needed
        // ✅ CRITICAL: Use !== undefined to preserve false values
        // ✅ v0.7.40: Only add properties if they exist (don't add null values)
        const normalizedField = {
          ...field,
          showInTable: field.showInTable !== undefined ? field.showInTable : (field.show_in_table ?? false),
          sendTelegram: field.sendTelegram !== undefined ? field.sendTelegram : (field.send_telegram ?? false),
          telegramOrder: field.telegramOrder !== undefined ? field.telegramOrder : (field.telegram_order ?? null),
          telegramPrefix: field.telegramPrefix !== undefined ? field.telegramPrefix : (field.telegram_prefix ?? ''),
          // Only add these if they exist (don't set to null)
          ...(field.showCondition !== undefined || field.show_condition !== undefined
            ? { showCondition: field.showCondition !== undefined ? field.showCondition : field.show_condition }
            : {}),
          ...(field.telegramConfig !== undefined || field.telegram_config !== undefined
            ? { telegramConfig: field.telegramConfig !== undefined ? field.telegramConfig : field.telegram_config }
            : {}),
          ...(field.validationRules !== undefined || field.validation_rules !== undefined
            ? { validationRules: field.validationRules !== undefined ? field.validationRules : field.validation_rules }
            : {})
        };

        console.log('🔍 normalizedField:', {
          id: normalizedField.id,
          title: normalizedField.title,
          showCondition: normalizedField.showCondition,
          show_condition: normalizedField.show_condition
        });

        // ✅ v0.7.40: Save camelCase values before destructuring
        const savedShowCondition = normalizedField.showCondition;
        const savedTelegramConfig = normalizedField.telegramConfig;
        const savedValidationRules = normalizedField.validationRules;

        console.log('💾 Saved values:', {
          id: normalizedField.id,
          savedShowCondition,
          savedTelegramConfig,
          savedValidationRules,
          savedShowConditionType: typeof savedShowCondition,
          isUndefined: savedShowCondition === undefined,
          isNull: savedShowCondition === null
        });

        // Then remove snake_case duplicates and timestamps
        // ✅ v0.7.40: Convert camelCase back to snake_case for backend
        const {
          show_in_table,
          send_telegram,
          telegram_order,
          telegram_prefix,
          show_condition,
          telegram_config,
          validation_rules,
          showCondition,    // Remove camelCase version
          telegramConfig,   // Remove camelCase version
          validationRules,  // Remove camelCase version
          createdAt,
          updatedAt,
          ...cleanedField
        } = normalizedField;

        // Re-add as snake_case for backend using saved values
        console.log('🔄 Re-adding snake_case:', {
          id: normalizedField.id,
          willAddShowCondition: savedShowCondition !== undefined,
          willAddTelegramConfig: savedTelegramConfig !== undefined,
          willAddValidationRules: savedValidationRules !== undefined
        });

        if (savedShowCondition !== undefined) {
          cleanedField.show_condition = savedShowCondition;
          console.log('✅ Added show_condition:', cleanedField.show_condition);
        }
        if (savedTelegramConfig !== undefined) {
          cleanedField.telegram_config = savedTelegramConfig;
        }
        if (savedValidationRules !== undefined) {
          cleanedField.validation_rules = savedValidationRules;
        }

        // 🔍 Debug: Log cleaned field after cleaning
        console.log('✅ cleanFieldData - AFTER:', {
          id: cleanedField.id,
          title: cleanedField.title,
          showInTable: cleanedField.showInTable,
          required: cleanedField.required,
          sendTelegram: cleanedField.sendTelegram,
          show_condition: cleanedField.show_condition
        });

        return cleanedField;
      };

      // 🔍 Debug: Log form.subForms before cleaning
      console.log('📦 SubForms BEFORE cleaning:', form.subForms.map(sf => ({
        id: sf.id,
        title: sf.title,
        fieldsCount: sf.fields?.length,
        fields: sf.fields?.map(f => ({
          id: f.id,
          title: f.title,
          showInTable: f.showInTable,
          show_in_table: f.show_in_table
        }))
      })));

      // ✅ Clean sub-forms fields before sending
      const cleanedSubForms = form.subForms.map(subForm => ({
        ...subForm,
        fields: subForm.fields?.map(cleanFieldData) || []
      }));

      // 🔍 Debug: Log cleanedSubForms after cleaning
      console.log('✨ SubForms AFTER cleaning:', cleanedSubForms.map(sf => ({
        id: sf.id,
        title: sf.title,
        fieldsCount: sf.fields?.length,
        fields: sf.fields?.map(f => ({
          id: f.id,
          title: f.title,
          showInTable: f.showInTable
        }))
      })));

      // ตรวจสอบว่าเป็นการแก้ไขหรือสร้างใหม่
      let savedForm;
      if (initialForm?.id) {
        // 🔍 Debug: Log form.fields BEFORE cleaning to check if showCondition exists
        console.log('🔍 form.fields BEFORE cleaning:', form.fields.map(f => ({
          id: f.id,
          title: f.title,
          showCondition: f.showCondition
        })));

        // แก้ไขฟอร์มที่มีอยู่ - Use API
        const payload = {
          title: form.title,
          description: form.description,
          data_retention_years: form.data_retention_years || 2, // PDPA compliance
          fields: form.fields.map(cleanFieldData),
          sub_forms: cleanedSubForms, // Use snake_case for backend
          settings: form.settings,
          telegram_settings: form.telegramSettings, // Use snake_case for backend
          roles_allowed: form.visibleRoles // JSONB array for backend
        };

        console.log('📤 Sending UPDATE payload to backend:', {
          title: payload.title,
          fields: payload.fields.length,
          fieldsWithShowCondition: payload.fields.filter(f => f.show_condition).map(f => ({
            id: f.id,
            title: f.title,
            show_condition: f.show_condition
          })),
          sub_forms_count: payload.sub_forms.length,
          sub_forms_detail: payload.sub_forms.map(sf => ({
            id: sf.id,
            title: sf.title,
            description: sf.description,
            order: sf.order,
            fields: sf.fields?.map(f => ({
              id: f.id,
              title: f.title,
              type: f.type,
              required: f.required,
              showInTable: f.showInTable,
              hasSnakeCaseFields: ('show_in_table' in f) // ✅ Check if snake_case still exists
            }))
          }))
        });

        // ✅ Log first sub-form field to verify cleaning
        if (payload.sub_forms[0]?.fields?.[0]) {
          console.log('🧹 Cleaned field sample:', payload.sub_forms[0].fields[0]);
        }

        const response = await apiClient.updateForm(initialForm.id, payload);
        savedForm = response.data?.form || response.data;

        // Dismiss loading toast and show success
        toast.dismiss(loadingToastId);
        toast.success('ฟอร์มถูกอัพเดทเรียบร้อยแล้ว', {
          title: "อัพเดทสำเร็จ",
          duration: 5000
        });
      } else {
        // สร้างฟอร์มใหม่ - Use API
        const response = await apiClient.createForm({
          title: form.title,
          description: form.description,
          fields: form.fields.map(cleanFieldData),
          sub_forms: cleanedSubForms, // Use snake_case for backend
          settings: form.settings,
          telegram_settings: form.telegramSettings, // Use snake_case for backend
          roles_allowed: form.visibleRoles // JSONB array for backend
        });
        savedForm = response.data?.form || response.data;

        // Dismiss loading toast and show success
        toast.dismiss(loadingToastId);
        toast.success('ฟอร์มถูกบันทึกเรียบร้อยแล้ว', {
          title: "บันทึกสำเร็จ",
          duration: 5000
        });
      }

      // เรียก onSave callback ถ้ามี (สำหรับ navigation หรือ actions อื่น ๆ)
      if (onSave) {
        onSave(savedForm, initialForm?.id);
      }

    } catch (error) {
      console.error('Form save error:', error);

      // Dismiss loading toast and show error
      toast.dismiss(loadingToastId);

      // ✅ v0.8.4: Extract error message from backend response
      let errorMessage = error.message;

      // Try different error structures
      if (error.data) {
        if (typeof error.data === 'string') {
          errorMessage = error.data;
        } else if (error.data.error) {
          // error.data.error can be string or object
          if (typeof error.data.error === 'string') {
            errorMessage = error.data.error;
          } else if (error.data.error.details && error.data.error.details[0]) {
            errorMessage = error.data.error.details[0].message || error.data.error.details[0].msg;
          } else if (error.data.error.message) {
            errorMessage = error.data.error.message;
          }
        } else if (error.data.message) {
          errorMessage = error.data.message;
        }
      }

      if (error.response && error.response.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      }

      // Special handling for duplicate title error (409 Conflict)
      if (error.status === 409 || error.response?.status === 409) {
        errorMessage = errorMessage || `ชื่อฟอร์ม "${form.title}" มีอยู่แล้วในระบบ กรุณาใช้ชื่ออื่น`;
      }

      toast.error(`เกิดข้อผิดพลาดในการบันทึกฟอร์ม: ${errorMessage}`, {
        title: "บันทึกไม่สำเร็จ",
        duration: 8000,
        action: {
          label: "ลองอีกครั้ง",
          onClick: () => handleSave()
        }
      });
    }
  }, [form, initialForm, onSave, toast, validateFormula]);

  // ✅ NEW: Handle confirmed save after migration preview
  const handleConfirmedSave = useCallback(async () => {
    console.log('✅ User confirmed migration - proceeding with save and migration execution');

    // Close preview modal
    setShowMigrationPreview(false);

    // Show loading toast
    const loadingToastId = toast.loading('กำลังบันทึกฟอร์มและประมวลผล migrations...', {
      title: "กรุณารอสักครู่"
    });

    try {
      // ✅ Step 1: Save form first (same logic as handleSave but without migration detection)
      const cleanFieldData = (field) => {
        const normalizedField = {
          ...field,
          showInTable: field.showInTable !== undefined ? field.showInTable : (field.show_in_table ?? false),
          sendTelegram: field.sendTelegram !== undefined ? field.sendTelegram : (field.send_telegram ?? false),
          telegramOrder: field.telegramOrder !== undefined ? field.telegramOrder : (field.telegram_order ?? null),
          telegramPrefix: field.telegramPrefix !== undefined ? field.telegramPrefix : (field.telegram_prefix ?? ''),
          showCondition: field.showCondition !== undefined ? field.showCondition : (field.show_condition ?? null),
          telegramConfig: field.telegramConfig !== undefined ? field.telegramConfig : (field.telegram_config ?? null),
          validationRules: field.validationRules !== undefined ? field.validationRules : (field.validation_rules ?? null)
        };

        const {
          show_in_table,
          send_telegram,
          telegram_order,
          telegram_prefix,
          show_condition,
          telegram_config,
          validation_rules,
          createdAt,
          updatedAt,
          ...cleanedField
        } = normalizedField;

        return cleanedField;
      };

      const cleanedSubForms = form.subForms.map(subForm => ({
        ...subForm,
        fields: subForm.fields?.map(cleanFieldData) || []
      }));

      const payload = {
        title: form.title,
        description: form.description,
        data_retention_years: form.data_retention_years || 2, // PDPA compliance
        fields: form.fields.map(cleanFieldData),
        sub_forms: cleanedSubForms,
        settings: form.settings,
        telegram_settings: form.telegramSettings,
        roles_allowed: form.visibleRoles
      };

      let savedForm;
      if (initialForm?.id) {
        const response = await apiClient.updateForm(initialForm.id, payload);
        savedForm = response.data?.form || response.data;
      } else {
        const response = await apiClient.createForm(payload);
        savedForm = response.data?.form || response.data;
      }

      console.log('✅ Form saved successfully');

      // ✅ Step 2: Execute migrations if there are pending changes
      if (pendingMigrationChanges && pendingMigrationChanges.changes.length > 0) {
        console.log('🚀 Executing migrations:', pendingMigrationChanges.changes);

        try {
          const migrationResponse = await MigrationService.executeMigration(
            pendingMigrationChanges.formId,
            pendingMigrationChanges.changes
          );

          console.log('✅ Migrations queued:', migrationResponse.data);

          // Start polling for queue status
          setIsPollingQueue(true);

          // Dismiss loading toast
          toast.dismiss(loadingToastId);

          // Show success with migration info
          toast.success(
            `ฟอร์มถูกอัพเดทเรียบร้อยแล้ว - กำลังประมวลผล ${pendingMigrationChanges.changes.length} migrations ใน background`,
            {
              title: "บันทึกสำเร็จ",
              duration: 8000
            }
          );

          // Clear pending changes
          setPendingMigrationChanges(null);
          setDetectedChanges([]);

        } catch (migrationError) {
          console.error('Migration execution error:', migrationError);

          // Dismiss loading toast
          toast.dismiss(loadingToastId);

          // Show warning (form saved but migrations failed)
          toast.warning(
            `ฟอร์มถูกบันทึกแล้ว แต่เกิดข้อผิดพลาดในการ queue migrations: ${migrationError.message}`,
            {
              title: "บันทึกสำเร็จ แต่ migration ล้มเหลว",
              duration: 10000
            }
          );
        }
      } else {
        // No migrations needed
        toast.dismiss(loadingToastId);
        toast.success('ฟอร์มถูกอัพเดทเรียบร้อยแล้ว', {
          title: "อัพเดทสำเร็จ",
          duration: 5000
        });
      }

      // Call onSave callback
      if (onSave) {
        onSave(savedForm, initialForm?.id);
      }

    } catch (error) {
      console.error('Confirmed save error:', error);

      // Dismiss loading toast
      toast.dismiss(loadingToastId);

      // ✅ v0.8.4: Extract error message from backend response
      let errorMessage = error.message;

      // Try different error structures
      if (error.data) {
        if (typeof error.data === 'string') {
          errorMessage = error.data;
        } else if (error.data.error) {
          // error.data.error can be string or object
          if (typeof error.data.error === 'string') {
            errorMessage = error.data.error;
          } else if (error.data.error.details && error.data.error.details[0]) {
            errorMessage = error.data.error.details[0].message || error.data.error.details[0].msg;
          } else if (error.data.error.message) {
            errorMessage = error.data.error.message;
          }
        } else if (error.data.message) {
          errorMessage = error.data.message;
        }
      }

      if (error.response && error.response.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          if (typeof error.response.data.error === 'string') {
            errorMessage = error.response.data.error;
          } else if (error.response.data.error.message) {
            errorMessage = error.response.data.error.message;
          }
        }
      }

      // Special handling for duplicate title error (409 Conflict)
      if (error.status === 409 || error.response?.status === 409) {
        errorMessage = errorMessage || `ชื่อฟอร์ม "${form.title}" มีอยู่แล้วในระบบ กรุณาใช้ชื่ออื่น`;
      }

      toast.error(`เกิดข้อผิดพลาดในการบันทึกฟอร์ม: ${errorMessage}`, {
        title: "บันทึกไม่สำเร็จ",
        duration: 8000,
        action: {
          label: "ลองอีกครั้ง",
          onClick: () => handleConfirmedSave()
        }
      });
    }
  }, [form, initialForm, onSave, pendingMigrationChanges, toast]);

  const isFormValid = () => {
    // ✅ v0.8.4: Check title is not empty and not duplicate
    const hasValidTitle = form.title.trim() !== '' && !titleValidation.exists;
    const hasValidFields = form.fields.some(field => field.title.trim() !== '');
    return hasValidTitle && hasValidFields;
  };

  // Send save handler to parent component
  useEffect(() => {
    if (onSaveHandlerReady) {
      onSaveHandlerReady(handleSave);
    }
    return () => {
      if (onSaveHandlerReady) {
        onSaveHandlerReady(null);
      }
    };
  }, [onSaveHandlerReady, handleSave]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90">
      <div className="container-responsive px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">

        {/* Main Form Builder - Optimized Layout Hierarchy */}
        <div className="space-y-6 sm:space-y-8 lg:space-y-10 xl:space-y-12">

            {/* Enhanced Tab Navigation - Responsive Proportions */}
            <div className="flex items-center justify-between gap-2 sm:gap-4 lg:gap-6 border-b border-border/20 pb-3 sm:pb-4 mb-6 sm:mb-8 lg:mb-10">
              {/* Tab Navigation */}
              <div className="flex gap-1 sm:gap-2 overflow-x-auto flex-1">
                <button
                  onClick={() => setActiveSection('main')}
                  title="ฟอร์มหลัก"
                  className={`relative px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-2 sm:py-3 md:py-4 text-xs sm:text-sm md:text-base lg:text-lg font-medium transition-all duration-300 rounded-t-lg border-b-3 whitespace-nowrap touch-target-comfortable hover:shadow-[0_0_15px_rgba(249,115,22,0.3)] ${
                    activeSection === 'main'
                      ? 'text-primary bg-primary/5 border-primary shadow-sm backdrop-blur-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/10 border-transparent'
                  }`}
                  style={{
                    borderRadius: '16px 16px 0 0',
                    overflow: 'visible'
                  }}
                  onMouseEnter={(e) => {
                    if (activeSection !== 'main') {
                      e.target.style.boxShadow = '0 0 15px 2px rgba(249,115,22,0.3), 0 0 30px 4px rgba(249,115,22,0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeSection !== 'main') {
                      e.target.style.boxShadow = '';
                    }
                  }}
                >
                  <FontAwesomeIcon icon={faClipboardList} className="w-4 h-4" />
                  <span className="ml-2">({form.fields.length})</span>
                  {activeSection === 'main' && (
                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-primary to-orange-500 rounded-full" />
                  )}
                </button>

                <button
                  data-testid="subform-tab"
                  onClick={() => setActiveSection('sub')}
                  title="ฟอร์มย่อย"
                  className={`relative px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-2 sm:py-3 md:py-4 text-xs sm:text-sm md:text-base lg:text-lg font-medium transition-all duration-300 rounded-t-xl border-b-3 whitespace-nowrap touch-target-comfortable hover:shadow-[0_0_15px_rgba(249,115,22,0.3)] ${
                    activeSection === 'sub'
                      ? 'text-primary bg-primary/5 border-primary shadow-sm backdrop-blur-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/10 border-transparent'
                  }`}
                >
                  <FontAwesomeIcon icon={faLayerGroup} className="w-4 h-4" />
                  <span className="ml-2">({form.subForms.length})</span>
                  {activeSection === 'sub' && (
                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-primary to-orange-500 rounded-full" />
                  )}
                </button>

                <button
                  data-testid="notifications-tab"
                  onClick={() => setActiveSection('notifications')}
                  title="การแจ้งเตือน"
                  className={`relative px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-2 sm:py-3 md:py-4 text-xs sm:text-sm md:text-base lg:text-lg font-medium transition-all duration-300 rounded-t-xl border-b-3 whitespace-nowrap touch-target-comfortable hover:shadow-[0_0_15px_rgba(249,115,22,0.3)] ${
                    activeSection === 'notifications'
                      ? 'text-primary bg-primary/5 border-primary shadow-sm backdrop-blur-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/10 border-transparent'
                  }`}
                >
                  <FontAwesomeIcon icon={faBell} className="w-4 h-4" />
                  {activeSection === 'notifications' && (
                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-primary to-orange-500 rounded-full" />
                  )}
                </button>

                <button
                  onClick={() => setActiveSection('settings')}
                  title="ตั้งค่า"
                  className={`relative px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-2 sm:py-3 md:py-4 text-xs sm:text-sm md:text-base lg:text-lg font-medium transition-all duration-300 rounded-t-xl border-b-3 whitespace-nowrap touch-target-comfortable hover:shadow-[0_0_15px_rgba(249,115,22,0.3)] ${
                    activeSection === 'settings'
                      ? 'text-primary bg-primary/5 border-primary shadow-sm backdrop-blur-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/10 border-transparent'
                  }`}
                >
                  <FontAwesomeIcon icon={faCog} className="w-4 h-4" />
                  {activeSection === 'settings' && (
                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-primary to-orange-500 rounded-full" />
                  )}
                </button>
              </div>

              {/* Delete Form Button - Right side of tabs (only in edit mode) */}
              {initialForm && activeSection === 'settings' && canDeleteForms && (
                <div className="ml-auto">
                  <motion.div
                    onClick={() => {
                      // Show confirmation toast with action button
                      toast.error(`การลบฟอร์ม "${form.title}" จะลบข้อมูลที่เกี่ยวข้องทั้งหมด`, {
                        title: 'ยืนยันการลบฟอร์ม',
                        duration: 10000,
                        action: {
                          label: 'ยืนยันการลบ',
                          onClick: async () => {
                            try {
                              await apiClient.deleteForm(initialForm.id);
                              toast.success('ลบฟอร์มสำเร็จ', {
                                title: 'ลบสำเร็จ',
                                duration: 3000
                              });
                              // Navigate back to form list
                              if (onSave) {
                                onSave(null, initialForm.id);
                              }
                            } catch (error) {
                              console.error('Delete form error:', error);
                              toast.error(`ไม่สามารถลบฟอร์มได้: ${error.message}`, {
                                title: 'ลบไม่สำเร็จ',
                                duration: 5000
                              });
                            }
                          }
                        }
                      });
                    }}
                    className="relative flex items-center justify-center w-10 h-10 cursor-pointer group"
                    title="ลบฟอร์ม"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      outline: 'none'
                    }}
                  >
                    {/* Pulsing danger glow on hover */}
                    <motion.div
                      className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100"
                      animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0, 0.3, 0]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      style={{
                        background: 'radial-gradient(circle, rgba(239, 68, 68, 0.4) 0%, rgba(220, 38, 38, 0.2) 50%, transparent 70%)',
                        filter: 'blur(6px)'
                      }}
                    />

                    {/* Icon with shake animation on hover */}
                    <motion.div
                      className="relative z-10"
                      whileHover={{
                        rotate: [0, -10, 10, -10, 10, 0],
                        transition: { duration: 0.5 }
                      }}
                    >
                      <FontAwesomeIcon
                        icon={faTrash}
                        className="text-xl text-red-500 group-hover:text-red-600 transition-colors duration-300"
                        style={{
                          filter: 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.5))'
                        }}
                      />
                    </motion.div>
                  </motion.div>
                </div>
              )}

              {/* Action Buttons - Enhanced Responsive */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              </div>
            </div>

            {/* Main Fields Section - Optimized Proportions */}
            {activeSection === 'main' && (
              <div className="space-y-6 sm:space-y-8 lg:space-y-10">
                {/* Form Title and Description - Responsive Layout */}
                <GlassCard className="form-card-glow form-card-animate form-card-borderless motion-container animation-optimized group transition-all duration-400 ease-out animate-fade-in border-2 border-primary/20 shadow-lg hover:shadow-xl hover:border-primary/40">
                  <GlassCardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <InlineEdit
                          value={form.title}
                          onChange={(value) => updateForm({ title: value })}
                          placeholder="คลิกเพื่อระบุชื่อฟอร์ม..."
                          isTitle={true}
                          dataTestId="form-title-input"
                        />
                        {/* ✅ v0.8.4: Title uniqueness validation message */}
                        {titleValidation.isChecking && form.title && form.title.trim() !== initialForm?.title && (
                          <div className="mt-2 px-3 py-2 text-sm text-blue-500 bg-blue-500/10 rounded-lg border border-blue-500/20 animate-pulse">
                            <FontAwesomeIcon icon={faClock} className="mr-2" />
                            กำลังตรวจสอบชื่อฟอร์ม...
                          </div>
                        )}
                        {!titleValidation.isChecking && titleValidation.message && (
                          <div className={`mt-2 px-3 py-2 text-sm rounded-lg border ${
                            titleValidation.exists
                              ? 'text-red-500 bg-red-500/10 border-red-500/20'
                              : 'text-green-500 bg-green-500/10 border-green-500/20'
                          }`}>
                            <FontAwesomeIcon
                              icon={titleValidation.exists ? faTimes : faCheck}
                              className="mr-2"
                            />
                            {titleValidation.message}
                          </div>
                        )}
                      </div>
                      <InlineEdit
                        value={form.description}
                        onChange={(value) => updateForm({ description: value })}
                        placeholder="คลิกเพื่อเพิ่มคำอธิบายฟอร์ม..."
                        isTitle={false}
                      />
                    </div>
                  </GlassCardContent>
                </GlassCard>


                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={form.fields.map(field => field.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-6 sm:space-y-8 lg:space-y-10">
                      {form.fields.map((field, index) => (
                        <SortableFieldEditor
                          key={field.id}
                          field={field}
                          onChange={(fieldData) => updateField(field.id, fieldData)}
                          onRemove={() => removeField(field.id)}
                          canMoveUp={index > 0}
                          canMoveDown={index < form.fields.length - 1}
                          onMoveUp={() => moveField(field.id, 'up')}
                          onMoveDown={() => moveField(field.id, 'down')}
                          onDuplicate={() => duplicateField(field.id)}
                          isSubForm={false}
                          allFields={form.fields}
                          maxTableFields={5}
                          formTitle={form.title}
                          validateFormula={validateFormula}
                          toast={toast}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {/* Add Field Button - Animated Circular */}
                <div className="pt-4 sm:pt-6 md:pt-8 lg:pt-10 flex justify-center">
                  <AnimatedAddButton
                    onClick={addField}
                    tooltip="เพิ่มฟิลด์ใหม่"
                  />
                </div>
              </div>
            )}

            {/* Sub Forms - 8px Grid */}
            {activeSection === 'sub' && (() => {
              // Always ensure there's at least one subForm to show
              // Use form.subForms if not empty, otherwise show existing subForms
              const subFormsToShow = form.subForms.length > 0 ? form.subForms : [];

              return (
                <div className="space-y-6">
                  <div className="space-y-6">
                    {subFormsToShow.map((subForm, index) => (
                      <div key={subForm.id} data-subform-id={subForm.id}>
                        <SubFormBuilder
                          subForm={subForm}
                        onChange={(subFormData) => {
                          // Always update existing sub-form
                          console.log('📝 Updating subForm:', subFormData.title);
                          updateSubForm(subForm.id, subFormData);
                        }}
                        onFieldUpdate={updateSubFormField}
                        onRemove={() => {
                          removeSubForm(subForm.id);
                        }}
                        canMoveUp={index > 0}
                        canMoveDown={index < subFormsToShow.length - 1}
                        onMoveUp={() => moveSubForm(subForm.id, 'up')}
                        onMoveDown={() => moveSubForm(subForm.id, 'down')}
                        onDuplicate={() => duplicateSubForm(subForm.id)}
                        validateFormula={validateFormula}
                        toast={toast}
                        />
                      </div>
                  ))}

                  {/* Add SubForm Button - Positioned after all subforms - 8px Grid */}
                  <div className="pt-8 flex justify-center">
                    <AnimatedAddButton
                      onClick={addSubForm}
                      tooltip="เพิ่มฟอร์มย่อย"
                      colorScheme="green"
                    />
                  </div>
                </div>
              </div>
              );
            })()}

            {/* Notifications Tab */}
            {activeSection === 'notifications' && initialForm && (
              <NotificationRulesTab form={form} />
            )}

            {/* Settings - 8px Grid */}
            {activeSection === 'settings' && (
              <div className="space-y-8">
                <div>
                  <h2 className="form-card-title text-[14px] font-semibold">ตั้งค่าฟอร์ม</h2>
                  <p className="form-card-description mt-2 text-[12px]">
                    กำหนดค่าขั้นสูงสำหรับการแจ้งเตือน การจัดการผู้ใช้ และระบบอัตโนมัติ
                  </p>
                </div>

                {/* User Role Access Control Settings - 8px Grid - MOVED TO TOP */}
                <GlassCard className="form-card-glow form-card-animate form-card-borderless motion-container animation-optimized group transition-all duration-400 ease-out orange-neon-permanent">
                  <GlassCardHeader>
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center"
                        style={{ clipPath: 'circle(50% at center)' }}
                      >
                        <FontAwesomeIcon icon={faUsers} className="text-green-600 w-4 h-4" />
                      </div>
                      <div>
                        <GlassCardTitle className="form-card-title">การควบคุมสิทธิ์ผู้ใช้</GlassCardTitle>
                      </div>
                    </div>
                  </GlassCardHeader>
                  <GlassCardContent className="space-y-4">

                    <div className="flex flex-wrap gap-2">
                      {Object.values(USER_ROLES)
                        .filter(role => role.showInSettings !== false) // Hide Super Admin and Admin (they can view all forms)
                        .map((role) => {
                          const isVisible = form.visibleRoles.includes(role.id);

                          return (
                            <button
                              key={role.id}
                              type="button"
                              onClick={() => {
                                const newVisibleRoles = isVisible
                                  ? form.visibleRoles.filter(id => id !== role.id)
                                  : [...form.visibleRoles, role.id];
                                updateForm({
                                  visibleRoles: newVisibleRoles
                                });
                              }}
                              title={`Toggle ${role.name} access`}
                              className={`
                                px-3 py-2 rounded-xl font-medium text-[12px] transition-all duration-200
                                cursor-pointer hover:scale-105
                                ${isVisible
                                  ? `${role.bgColor} ${role.color} shadow-sm hover:shadow-[0_0_15px_rgba(249,115,22,0.4)]`
                                  : 'bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:shadow-[0_0_10px_rgba(249,115,22,0.2)]'
                                }
                              `}
                              style={{ border: 'none' }}
                            >
                              {role.name}
                              {false && (
                              <span className="ml-1 text-xs opacity-70">•</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </GlassCardContent>
                </GlassCard>

                {/* PDPA Data Retention Period - 8px Grid */}
                <GlassCard className="form-card-glow form-card-animate form-card-borderless motion-container animation-optimized group transition-all duration-400 ease-out orange-neon-permanent">
                  <GlassCardHeader>
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center"
                        style={{ clipPath: 'circle(50% at center)' }}
                      >
                        <FontAwesomeIcon icon={faShieldAlt} className="text-orange-600 w-4 h-4" />
                      </div>
                      <div>
                        <GlassCardTitle className="form-card-title">PDPA - ระยะเวลาเก็บข้อมูล</GlassCardTitle>
                        <GlassCardDescription className="form-card-description">
                          กำหนดระยะเวลาในการจัดเก็บข้อมูลส่วนบุคคลตามกฎหมาย PDPA
                        </GlassCardDescription>
                      </div>
                    </div>
                  </GlassCardHeader>
                  <GlassCardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[14px] font-medium text-foreground/80">
                        ระยะเวลาเก็บข้อมูล (ปี)
                      </label>
                      <select
                        value={form.data_retention_years || 2}
                        onChange={(e) => updateForm({ data_retention_years: parseInt(e.target.value) })}
                        className="w-full md:w-auto px-4 py-2.5 bg-background/60 border border-border/30 rounded-lg text-[14px] text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
                      >
                        {[...Array(20)].map((_, i) => {
                          const years = i + 1;
                          return (
                            <option key={years} value={years}>
                              {years} ปี
                            </option>
                          );
                        })}
                      </select>
                      <p className="text-[12px] text-muted-foreground mt-2">
                        • ข้อมูลที่เก็บเกินระยะเวลาที่กำหนดจะแสดงในรายการ "ข้อมูลที่ต้องลบ" ใน PDPA Dashboard
                      </p>
                      <p className="text-[12px] text-muted-foreground">
                        • การตั้งค่านี้ใช้กับทุก Consent Item และการ Submit ทั้งหมดในฟอร์มนี้
                      </p>
                      <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                        <div className="flex items-start gap-2">
                          <FontAwesomeIcon icon={faInfoCircle} className="text-orange-600 mt-0.5" />
                          <div className="flex-1 text-[12px] text-foreground/80">
                            <p className="font-medium mb-1">ตัวอย่าง:</p>
                            <p>หากตั้งค่าเป็น <span className="font-mono font-semibold">{form.data_retention_years || 2} ปี</span> และมีข้อมูลที่ส่งเมื่อวันที่ 25 ต.ค. 2023</p>
                            <p className="mt-1">ข้อมูลนี้จะหมดอายุในวันที่ <span className="font-mono font-semibold">
                              {(() => {
                                const exampleDate = new Date('2023-10-25');
                                exampleDate.setFullYear(exampleDate.getFullYear() + (form.data_retention_years || 2));
                                return exampleDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
                              })()}
                            </span></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </GlassCardContent>
                </GlassCard>

                {/* Date Format Settings - 8px Grid */}
                <GlassCard className="form-card-glow form-card-animate form-card-borderless motion-container animation-optimized group transition-all duration-400 ease-out">
                  <GlassCardHeader>
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center"
                        style={{ clipPath: 'circle(50% at center)' }}
                      >
                        <FontAwesomeIcon icon={faCalendarAlt} className="text-purple-600 w-4 h-4" />
                      </div>
                      <div>
                        <GlassCardTitle className="form-card-title">รูปแบบวันที่</GlassCardTitle>
                        <GlassCardDescription className="form-card-description">
                          กำหนดรูปแบบการแสดงวันที่ในฟอร์มและการแสดงผล
                        </GlassCardDescription>
                      </div>
                    </div>
                  </GlassCardHeader>
                  <GlassCardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[14px] font-medium text-foreground/80">ประเภทปี</label>
                        <div className="flex gap-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="yearFormat"
                              value="christian"
                              checked={form.settings.dateFormat?.yearFormat === 'christian'}
                              onChange={(e) => updateForm({
                                settings: {
                                  ...form.settings,
                                  dateFormat: { ...(form.settings.dateFormat || { format: 'dd/mm/yyyy' }), yearFormat: e.target.value }
                                }
                              })}
                              className="w-4 h-4 text-primary focus:ring-primary/20 focus:ring-2"
                            />
                            <span className="text-[14px] text-foreground/80">ค.ศ. (2024)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="yearFormat"
                              value="buddhist"
                              checked={form.settings.dateFormat?.yearFormat === 'buddhist'}
                              onChange={(e) => updateForm({
                                settings: {
                                  ...form.settings,
                                  dateFormat: { ...(form.settings.dateFormat || { format: 'dd/mm/yyyy' }), yearFormat: e.target.value }
                                }
                              })}
                              className="w-4 h-4 text-primary focus:ring-primary/20 focus:ring-2"
                            />
                            <span className="text-[14px] text-foreground/80">พ.ศ. (2567)</span>
                          </label>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[14px] font-medium text-foreground/80">รูปแบบการแสดงผล</label>
                        <div className="p-2 bg-muted/20 rounded-lg border border-border/30">
                          <div className="text-[14px] text-foreground/80">
                            <div className="font-medium">ตัวอย่าง:
                              <span className="ml-2 font-mono text-primary">
                                {(() => {
                                  const now = new Date();
                                  const day = now.getDate().toString().padStart(2, '0');
                                  const month = (now.getMonth() + 1).toString().padStart(2, '0');
                                  const year = form.settings.dateFormat?.yearFormat === 'buddhist'
                                    ? now.getFullYear() + 543
                                    : now.getFullYear();
                                  return `${day}/${month}/${year}`;
                                })()}
                              </span>
                            </div>
                            <div className="text-[12px] text-muted-foreground mt-1">
                              รูปแบบ: dd/mm/yyyy ({form.settings.dateFormat?.yearFormat === 'buddhist' ? 'พ.ศ.' : 'ค.ศ.'})
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </GlassCardContent>
                </GlassCard>

                {/* Enhanced Telegram Notification Settings */}
                <TelegramNotificationSettings
                  form={form}
                  onUpdate={(updatedForm) => updateForm(updatedForm)}
                  availableFields={getAvailableFields()}
                  className="form-card-glow form-card-animate form-card-borderless motion-container animation-optimized group transition-all duration-400 ease-out"
                />

                {/* ✅ v0.9.0: PDPA Privacy Notice Settings */}
                <PrivacyNoticeSettings
                  form={form}
                  onUpdate={(updates) => updateForm(updates)}
                />

                {/* ✅ v0.9.0: PDPA Consent Management */}
                <ConsentManagementTab
                  form={form}
                  onUpdate={(updates) => updateForm(updates)}
                />

                {/* ✅ v0.7.40: Conditional Formatting Settings */}
                <GlassCard className="form-card-glow form-card-animate form-card-borderless motion-container animation-optimized group transition-all duration-400 ease-out">
                  <GlassCardHeader>
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/20 to-pink-600/20 flex items-center justify-center"
                        style={{ clipPath: 'circle(50% at center)' }}
                      >
                        <FontAwesomeIcon icon={faPalette} className="text-pink-600 w-4 h-4" />
                      </div>
                      <div>
                        <GlassCardTitle className="form-card-title">การจัดรูปแบบตามเงื่อนไข</GlassCardTitle>
                        <GlassCardDescription className="form-card-description">
                          กำหนดสีและรูปแบบการแสดงผลข้อมูลตามเงื่อนไขที่กำหนด
                        </GlassCardDescription>
                      </div>
                    </div>
                  </GlassCardHeader>
                  <GlassCardContent className="space-y-6">
                    {/* Enable Toggle */}
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={form.settings.conditionalFormatting?.enabled || false}
                        onChange={(e) => {
                          updateForm({
                            settings: {
                              ...form.settings,
                              conditionalFormatting: {
                                ...form.settings.conditionalFormatting,
                                enabled: e.target.checked
                              }
                            }
                          });
                        }}
                        className="w-4 h-4 rounded border-2 border-border bg-background checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                      />
                      <span className="text-[14px] font-medium text-foreground/80 group-hover:text-foreground transition-colors">
                        เปิดใช้งาน Conditional Formatting
                      </span>
                    </label>

                    {/* Formatting Rules */}
                    {form.settings.conditionalFormatting?.enabled && (
                      <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                        {/* Rules List */}
                        {(form.settings.conditionalFormatting.rules || []).map((rule, index) => (
                          <FormattingRuleCard
                            key={rule.id}
                            rule={rule}
                            index={index}
                            fieldOptions={(() => {
                              const options = [];
                              // Main form fields
                              if (form.fields && form.fields.length > 0) {
                                options.push({
                                  group: "Main Form",
                                  fields: form.fields.map(f => ({
                                    id: f.id,
                                    title: f.title,
                                    source: "main",
                                    subFormId: null
                                  }))
                                });
                              }
                              // Sub-form fields
                              if (form.subForms && form.subForms.length > 0) {
                                form.subForms.forEach(subForm => {
                                  if (subForm.fields && subForm.fields.length > 0) {
                                    options.push({
                                      group: `Sub-Form: ${subForm.title}`,
                                      fields: subForm.fields.map(f => ({
                                        id: f.id,
                                        title: f.title,
                                        source: "subform",
                                        subFormId: subForm.id
                                      }))
                                    });
                                  }
                                });
                              }
                              return options;
                            })()}
                            onUpdate={(updatedRule) => {
                              const newRules = [...(form.settings.conditionalFormatting.rules || [])];
                              newRules[index] = updatedRule;
                              updateForm({
                                settings: {
                                  ...form.settings,
                                  conditionalFormatting: {
                                    ...form.settings.conditionalFormatting,
                                    rules: newRules
                                  }
                                }
                              });
                            }}
                            onDelete={() => {
                              const newRules = (form.settings.conditionalFormatting.rules || []).filter((_, i) => i !== index);
                              updateForm({
                                settings: {
                                  ...form.settings,
                                  conditionalFormatting: {
                                    ...form.settings.conditionalFormatting,
                                    rules: newRules
                                  }
                                }
                              });
                            }}
                          />
                        ))}

                        {/* Add New Rule Button */}
                        <GlassButton
                          onClick={() => {
                            const newRule = {
                              id: `rule_${Date.now()}`,
                              order: (form.settings.conditionalFormatting.rules?.length || 0) + 1,
                              fieldId: '',
                              fieldSource: 'main',
                              subFormId: null,
                              fieldTitle: '',
                              condition: '',
                              style: {
                                textColor: null,
                                backgroundColor: null,
                                fontWeight: 'normal'
                              }
                            };

                            updateForm({
                              settings: {
                                ...form.settings,
                                conditionalFormatting: {
                                  ...form.settings.conditionalFormatting,
                                  rules: [...(form.settings.conditionalFormatting.rules || []), newRule]
                                }
                              }
                            });
                          }}
                          className="w-full"
                        >
                          <FontAwesomeIcon icon={faPlus} className="mr-2" />
                          เพิ่มกฎใหม่
                        </GlassButton>

                        {/* Help Text */}
                        <p className="text-xs text-muted-foreground">
                          💡 กฎจะถูกประเมินตามลำดับ (กฎแรกที่ตรงเงื่อนไขจะถูกใช้)
                        </p>
                      </div>
                    )}
                  </GlassCardContent>
                </GlassCard>

                {/* Document Number Settings - 8px Grid */}
                <GlassCard className="form-card-glow form-card-animate form-card-borderless motion-container animation-optimized group transition-all duration-400 ease-out">
                  <GlassCardHeader>
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center"
                        style={{ clipPath: 'circle(50% at center)' }}
                      >
                        <FontAwesomeIcon icon={faFileUpload} className="text-purple-600 w-4 h-4" />
                      </div>
                      <div>
                        <GlassCardTitle className="form-card-title">หมายเลขเอกสารอัตโนมัติ</GlassCardTitle>
                        <GlassCardDescription className="form-card-description">
                          สร้างหมายเลขเอกสารอัตโนมัติสำหรับแต่ละการส่งฟอร์ม
                        </GlassCardDescription>
                      </div>
                    </div>
                  </GlassCardHeader>
                  <GlassCardContent className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={form.settings.documentNumber.enabled}
                        onChange={(e) => updateForm({
                          settings: {
                            ...form.settings,
                            documentNumber: { ...form.settings.documentNumber, enabled: e.target.checked }
                          }
                        })}
                        className="w-4 h-4 text-primary focus:ring-primary/20 focus:ring-2 rounded"
                      />
                      <span className="text-[14px] text-foreground/80 group-hover:text-foreground/90">
                        เปิดใช้งานหมายเลขเอกสารอัตโนมัติ
                      </span>
                    </label>

                    {form.settings.documentNumber.enabled && (
                      <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <GlassInput
                            label="คำนำหน้า"
                            value={form.settings.documentNumber.prefix}
                            onChange={(e) => updateForm({
                              settings: {
                                ...form.settings,
                                documentNumber: { ...form.settings.documentNumber, prefix: e.target.value }
                              }
                            })}
                            placeholder="DOC"
                            tooltip="คำนำหน้าหมายเลขเอกสาร"
                            minimal
                          />

                          <GlassInput
                            label="เลขเริ่มต้น"
                            type="number"
                            min="1"
                            value={form.settings.documentNumber.initialNumber || 1}
                            onChange={(e) => updateForm({
                              settings: {
                                ...form.settings,
                                documentNumber: { ...form.settings.documentNumber, initialNumber: parseInt(e.target.value) || 1 }
                              }
                            })}
                            placeholder="1"
                            tooltip="หมายเลขเริ่มต้นของเอกสารแรก"
                            minimal
                          />

                          <GlassSelect
                            label="รูปแบบ"
                            value={form.settings.documentNumber.format}
                            onChange={(e) => updateForm({
                              settings: {
                                ...form.settings,
                                documentNumber: { ...form.settings.documentNumber, format: e.target.value }
                              }
                            })}
                            minimal
                          >
                            <option value="prefix-number/year">คำนำหน้า-เลขที่/ปี</option>
                            <option value="prefix-year/number">คำนำหน้า-ปี/เลขที่</option>
                          </GlassSelect>

                          <GlassSelect
                            label="ปีที่ใช้"
                            value={form.settings.documentNumber.yearFormat}
                            onChange={(e) => updateForm({
                              settings: {
                                ...form.settings,
                                documentNumber: { ...form.settings.documentNumber, yearFormat: e.target.value }
                              }
                            })}
                            minimal
                          >
                            <option value="buddhist">พ.ศ.</option>
                            <option value="christian">ค.ศ.</option>
                          </GlassSelect>
                        </div>

                        <div className="p-4 bg-muted/10 rounded-xl">
                          <p className="text-[14px] text-muted-foreground mb-1">ตัวอย่าง:</p>
                          <code className="text-[14px] font-mono text-foreground/80">
                            {(() => {
                              const currentYear = new Date().getFullYear();
                              const displayYear = form.settings.documentNumber.yearFormat === 'buddhist'
                                ? currentYear + 543
                                : currentYear;
                              const paddedNumber = (form.settings.documentNumber.initialNumber || 1).toString().padStart(4, '0');

                              return form.settings.documentNumber.format === 'prefix-number/year'
                                ? `${form.settings.documentNumber.prefix}-${paddedNumber}/${displayYear}`
                                : `${form.settings.documentNumber.prefix}-${displayYear}/${paddedNumber}`;
                            })()}
                          </code>
                          <p className="text-[12px] text-muted-foreground mt-1">
                            หมายเลขจะเริ่มต้นที่ {(form.settings.documentNumber.initialNumber || 1).toString().padStart(4, '0')} และรีเซ็ตเป็น 0001 ทุกปีใหม่
                          </p>
                        </div>
                      </div>
                    )}
                  </GlassCardContent>
                </GlassCard>

                {/* PowerBI Connection Info - After Document Number Settings */}
                {canSeePowerBIInfo && (
                  <GlassCard className="mt-6">
                    <GlassCardHeader>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse mt-1.5"></div>
                        <div className="flex-1">
                          <GlassCardTitle className="text-sm">Power BI - PostgreSQL Connection</GlassCardTitle>
                          <GlassCardDescription className="text-xs">{getPowerBIInfo().description}</GlassCardDescription>
                        </div>
                      </div>
                    </GlassCardHeader>
                    <GlassCardContent>
                      <div className="space-y-3">
                        {/* Server and Database */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="bg-background/50 rounded p-3 border border-border/40">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-foreground/80">Server:</span>
                              <button
                                onClick={() => copyToClipboard(getPowerBIInfo().server)}
                                className="text-primary hover:text-primary/80 transition-colors text-xs px-2 py-1 rounded bg-primary/10 hover:bg-primary/20"
                              >
                                Copy
                              </button>
                            </div>
                            <code className="text-xs text-primary font-mono">{getPowerBIInfo().server}</code>
                          </div>

                          <div className="bg-background/50 rounded p-3 border border-border/40">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-foreground/80">Database:</span>
                              <button
                                onClick={() => copyToClipboard(getPowerBIInfo().database)}
                                className="text-primary hover:text-primary/80 transition-colors text-xs px-2 py-1 rounded bg-primary/10 hover:bg-primary/20"
                              >
                                Copy
                              </button>
                            </div>
                            <code className="text-xs text-primary font-mono">{getPowerBIInfo().database}</code>
                          </div>
                        </div>

                        {/* Main Form Table */}
                        <div className="bg-background/50 rounded p-3 border border-border/40">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className="text-xs font-medium text-foreground/80 block">Main Form Table:</span>
                              <span className="text-xs text-muted-foreground mt-0.5 block">{form.title}</span>
                            </div>
                            <button
                              onClick={() => copyToClipboard(getPowerBIInfo().mainTable)}
                              className="text-primary hover:text-primary/80 transition-colors text-xs px-2 py-1 rounded bg-primary/10 hover:bg-primary/20"
                            >
                              Copy
                            </button>
                          </div>
                          <code className="text-xs text-primary font-mono break-all">{getPowerBIInfo().mainTable}</code>
                        </div>

                        {/* Sub-Form Tables */}
                        {getPowerBIInfo().subFormTables.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-xs font-medium text-foreground/80 block">Sub-Form Tables:</span>
                            {getPowerBIInfo().subFormTables.map((subForm, index) => (
                              <div key={index} className="bg-background/50 rounded p-3 border border-border/40">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium text-foreground/60">{subForm.title}:</span>
                                  <button
                                    onClick={() => copyToClipboard(subForm.tableName)}
                                    className="text-primary hover:text-primary/80 transition-colors text-xs px-2 py-1 rounded bg-primary/10 hover:bg-primary/20"
                                  >
                                    Copy
                                  </button>
                                </div>
                                <code className="text-xs text-primary font-mono break-all">{subForm.tableName}</code>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Instructions */}
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3">
                          <p className="text-xs text-foreground/70">
                            <strong>How to connect:</strong> Open Power BI Desktop → Get Data → PostgreSQL database → Enter Server and Database → Select tables above
                          </p>
                        </div>
                      </div>
                    </GlassCardContent>
                  </GlassCard>
                )}
              </div>
            )}
        </div>
      </div>

      {/* ✅ NEW: Migration Preview Modal */}
      <MigrationPreviewModal
        isOpen={showMigrationPreview}
        onClose={() => {
          setShowMigrationPreview(false);
          setPendingMigrationChanges(null);
          setDetectedChanges([]);
        }}
        onConfirm={handleConfirmedSave}
        changes={detectedChanges}
        isLoading={false}
        formTitle={form.title}
      />

      {/* ✅ NEW: Floating Migration Status Indicator */}
      {(migrationQueueStatus.waiting > 0 || migrationQueueStatus.active > 0 || migrationQueueStatus.failed > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-6 right-6 z-40 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-orange-200 dark:border-orange-700 p-4 min-w-[280px]"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <FontAwesomeIcon icon={faDatabase} className="text-orange-500" />
              </motion.div>
              สถานะ Migration
            </h3>
            {migrationQueueStatus.waiting === 0 && migrationQueueStatus.active === 0 && (
              <button
                onClick={() => setMigrationQueueStatus({ waiting: 0, active: 0, completed: 0, failed: 0 })}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            )}
          </div>

          <div className="space-y-2">
            {migrationQueueStatus.waiting > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                  รอดำเนินการ
                </span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {migrationQueueStatus.waiting}
                </span>
              </div>
            )}

            {migrationQueueStatus.active > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                  กำลังประมวลผล
                </span>
                <span className="font-semibold text-orange-600 dark:text-orange-400">
                  {migrationQueueStatus.active}
                </span>
              </div>
            )}

            {migrationQueueStatus.failed > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  ล้มเหลว
                </span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {migrationQueueStatus.failed}
                </span>
              </div>
            )}

            {migrationQueueStatus.completed > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheck} className="text-green-500 text-xs" />
                  สำเร็จ
                </span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {migrationQueueStatus.completed}
                </span>
              </div>
            )}
          </div>

          {(migrationQueueStatus.waiting > 0 || migrationQueueStatus.active > 0) && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                กำลังอัพเดทฐานข้อมูล... อาจใช้เวลา 5-30 วินาที
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
