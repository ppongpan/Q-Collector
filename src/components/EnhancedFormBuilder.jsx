import React, { useState, useRef, useEffect } from "react";

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
import FieldPreviewRow from "./ui/field-preview-row";
import FieldOptionsMenu from "./ui/field-options-menu";
// import EnhancedSlider from "./ui/enhanced-slider"; // Commented out - not used

// ShadCN UI components
import { Badge } from "./ui/badge"; // Used for role tags display
import { Separator } from "./ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

// FontAwesome imports
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faTrashAlt, faGripVertical, faChevronDown, faChevronUp,
  faStar, faSliders, faMapMarkerAlt, faGlobeAmericas, faIndustry,
  faTextHeight, faParagraph, faAt, faPhone, faLink, faFileAlt,
  faImage, faCalendarAlt, faClock, faCalendarDay, faListUl,
  faEllipsisV, faArrowUp, faArrowDown, faCopy, faUndo,
  faQuestionCircle, faLayerGroup, faComments, faFileUpload, faCog, faHashtag as faNumbers,
  faClipboardList, faSave, faUsers, faShieldAlt
} from '@fortawesome/free-solid-svg-icons';

// User Role definitions with colors for access control
const USER_ROLES = {
  SUPER_ADMIN: { id: 'super_admin', color: 'text-red-500', bgColor: 'bg-red-500/10', name: 'Super Admin', isDefault: true },
  ADMIN: { id: 'admin', color: 'text-pink-500', bgColor: 'bg-pink-500/10', name: 'Admin', isDefault: true },
  MODERATOR: { id: 'moderator', color: 'text-purple-500', bgColor: 'bg-purple-500/10', name: 'Moderator', isDefault: false },
  CUSTOMER_SERVICE: { id: 'customer_service', color: 'text-blue-500', bgColor: 'bg-blue-500/10', name: 'Customer Service', isDefault: false },
  TECHNIC: { id: 'technic', color: 'text-cyan-500', bgColor: 'bg-cyan-500/10', name: 'Technic', isDefault: false },
  SALE: { id: 'sale', color: 'text-green-500', bgColor: 'bg-green-500/10', name: 'Sale', isDefault: false },
  MARKETING: { id: 'marketing', color: 'text-orange-500', bgColor: 'bg-orange-500/10', name: 'Marketing', isDefault: false },
  GENERAL_USER: { id: 'general_user', color: 'text-gray-500', bgColor: 'bg-gray-500/10', name: 'General User', isDefault: false }
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
function InlineEdit({ value, onChange, placeholder, className = "", isTitle = false }) {
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
          className={`bg-transparent border-2 border-primary/50 rounded-lg px-3 py-2 text-base sm:text-lg font-semibold text-foreground/90 focus:outline-none focus:border-primary w-full ${className}`}
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
          className={`bg-transparent border-2 border-primary/50 rounded-lg px-3 py-2 text-sm text-muted-foreground focus:outline-none focus:border-primary w-full resize-none ${className}`}
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
        className={`text-base sm:text-lg font-semibold cursor-pointer transition-all duration-200 hover:text-primary/80 active:scale-98 ${isEmpty ? 'text-muted-foreground/60 italic' : 'text-foreground/90'} ${className}`}
        title="คลิกเพื่อแก้ไข"
      >
        {displayValue}
      </h1>
    );
  } else {
    return (
      <p
        onClick={() => setIsEditing(true)}
        className={`text-sm text-muted-foreground cursor-pointer transition-all duration-200 hover:text-primary/60 active:scale-98 ${isEmpty ? 'opacity-50 italic' : ''} ${className}`}
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
    <div ref={setNodeRef} style={style}>
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
  maxTableFields = 5
}) {
  const [isExpanded, setIsExpanded] = useState(true); // Changed default to true (expanded)
  const fieldType = FIELD_TYPES.find(type => type.value === field.type);

  // Check if field title is too long (roughly 50 characters for single line)
  const isTitleTooLong = (field.title || '').length > 50;

  // Count fields with showInTable enabled for validation
  const tableFieldCount = allFields.filter(f => f.showInTable).length;

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
        />
      </div>
    );
  };

  return (
    <GlassCard className="group bg-card/60 backdrop-blur-lg shadow-lg hover:shadow-xl hover:border-primary/30 hover:scale-[1.01] transition-all duration-300">
      {/* Field Header - Always Visible */}
      <GlassCardHeader className="pb-3">
        <div className="flex items-center gap-3">
          {/* Compact Drag Handle */}
          <div className="flex-shrink-0">
            <div
              {...dragHandleProps}
              className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-background/50 transition-colors cursor-grab active:cursor-grabbing opacity-50 group-hover:opacity-100"
              title="ลากเพื่อเรียงลำดับ"
            >
              <FontAwesomeIcon icon={faGripVertical} className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
            </div>
          </div>

          {/* Field Preview - Flexible */}
          <div
            className="flex-1 min-w-0 cursor-pointer"
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
            {getFieldPreview()}
          </div>

          {/* Compact Action Icons */}
          <div className="flex-shrink-0">
            <div className="inline-flex items-center gap-1 bg-background/50 rounded-lg px-1 py-1">
              {/* Expand/Collapse */}
              <GlassButton
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(!isExpanded)}
                tooltip={isExpanded ? "ย่อ" : "ขยาย"}
                className="opacity-70 hover:opacity-100 w-7 h-7"
              >
                <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} className="w-3 h-3 sm:w-4 sm:h-4" />
              </GlassButton>

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
              />
            </div>
          </div>
        </div>
      </GlassCardHeader>

      {/* Field Configuration - Expandable */}
      {isExpanded && (
        <GlassCardContent className="space-y-3 pt-0">
          <Separator />

          {/* Basic Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <GlassInput
                label="ชื่อฟิลด์"
                value={field.title}
                onChange={(e) => updateField({ title: e.target.value })}
                placeholder="ระบุชื่อฟิลด์"
                tooltip={isTitleTooLong ? "ชื่อฟิลด์ยาวเกินไป - จะแสดงเป็น 2 บรรทัด" : "ชื่อฟิลด์ที่จะแสดงให้ผู้ใช้เห็น"}
                minimal
                className={isTitleTooLong ? "text-amber-600 placeholder:text-amber-400/70 border-amber-300/50" : ""}
              />
              {isTitleTooLong && (
                <div className="flex items-center gap-2 text-xs text-amber-600">
                  <FontAwesomeIcon icon={faQuestionCircle} className="w-3 h-3" />
                  <span>ชื่อยาว ({field.title.length} ตัวอักษร) - จะแสดงเป็น 2 บรรทัด</span>
                </div>
              )}
            </div>

            {/* Field Type Selector - Scoped hover group to fix global hover issue */}
            <div className="space-y-3 group-fieldtype">
              <label
                className="block text-xs font-medium text-foreground/80 mb-2 transition-colors duration-200"
              >
                ประเภทฟิลด์ <span className="text-primary">*</span>
              </label>
              <div className="relative">
                <GlassSelect
                  value={field.type}
                  onChange={(e) => updateField({ type: e.target.value })}
                  tooltip="เลือกประเภทของฟิลด์ - สำคัญที่สุด!"
                  className="h-14 text-base font-medium border-3 border-primary/60 focus:border-primary shadow-lg shadow-primary/20 ring-4 ring-primary/10 hover:ring-primary/20 transition-all duration-300 bg-gradient-to-r from-primary/5 to-orange-400/10"
                >
                  <option value="" disabled className="text-muted-foreground">
                    🔥 เลือกประเภทฟิลด์ที่ต้องการ
                  </option>
                  {FIELD_TYPES.map((type) => (
                    <option key={type.value} value={type.value} className="text-foreground py-2">
                      {type.label}
                    </option>
                  ))}
                </GlassSelect>
                {/* Enhanced Visual Indicator */}
                <div className="absolute inset-0 pointer-events-none border-3 border-primary/80 rounded-xl animate-pulse shadow-2xl shadow-primary/30" />
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-primary to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg animate-bounce">
                  !
                </div>
              </div>
              <p className="text-sm text-primary/80 font-medium animate-pulse">
                ⚡ เลือกประเภทฟิลด์ก่อนดำเนินการต่อ
              </p>
            </div>
          </div>

          {/* Description and Placeholder */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlassTextarea
              label="คำอธิบาย"
              value={field.description || ''}
              onChange={(e) => updateField({ description: e.target.value })}
              placeholder="คำอธิบายเพิ่มเติม (จะแสดงเป็น tooltip)"
              tooltip="คำอธิบายที่จะปรากฏเป็น tooltip เมื่อ hover ที่ field ในโหมด preview"
              minimal
              className="min-h-16"
            />

            <GlassInput
              label="Placeholder"
              value={field.placeholder || ''}
              onChange={(e) => updateField({ placeholder: e.target.value })}
              placeholder="ข้อความแนะนำในช่องกรอกข้อมูล"
              tooltip="ข้อความตัวอย่างที่จะแสดงในช่องกรอกข้อมูล"
              minimal
            />
          </div>

          {/* Field Options */}
          {renderFieldSpecificOptions()}
        </GlassCardContent>
      )}
    </GlassCard>
  );

  function renderFieldSpecificOptions() {
    switch (field.type) {
      case 'multiple_choice':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
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

            <div className="space-y-2">
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
    <div className="space-y-2">
      {options.map((option, index) => (
        <div key={index} className="flex items-center gap-2">
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
            <GlassButton
              variant="ghost"
              size="icon"
              onClick={() => removeOption(index)}
              tooltip="ลบตัวเลือก"
              className="text-destructive hover:bg-destructive/10 w-8 h-8"
            >
              <FontAwesomeIcon icon={faTrashAlt} className="w-3 h-3 sm:w-4 sm:h-4" />
            </GlassButton>
          </div>
        </div>
      ))}

      {/* Add Option Button */}
      <GlassButton
        variant="ghost"
        onClick={addOption}
        className="w-full border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 py-2 mt-3"
      >
        <FontAwesomeIcon icon={faPlus} className="mr-2 w-4 h-4" />
        <span className="text-sm font-medium">เพิ่มตัวเลือก</span>
      </GlassButton>
    </div>
  );
}

// Enhanced Sub Form Builder with Main Form Structure
function SubFormBuilder({ subForm, onChange, onRemove, canMoveUp, canMoveDown, onMoveUp, onMoveDown, onDuplicate }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentTab, setCurrentTab] = useState('fields'); // 'fields' or 'settings'

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

  const updateSubForm = (updates) => {
    onChange({ ...subForm, ...updates });
  };

  // Handle drag end event for subform fields
  const handleSubFormDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id && subForm.fields) {
      const oldIndex = subForm.fields.findIndex((field) => field.id === active.id);
      const newIndex = subForm.fields.findIndex((field) => field.id === over.id);

      updateSubForm({
        fields: arrayMove(subForm.fields, oldIndex, newIndex),
      });
    }
  };

  const addField = () => {
    const newField = {
      id: generateId(),
      title: "",
      type: "short_answer",
      required: false,
      showInTable: false,
      sendTelegram: false,
      options: {}
    };
    updateSubForm({
      fields: [...(subForm.fields || []), newField]
    });
  };

  const updateField = (fieldId, fieldData) => {
    updateSubForm({
      fields: subForm.fields.map(field =>
        field.id === fieldId ? fieldData : field
      )
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
    <GlassCard variant="elevated" className="border-2 border-dashed border-accent/30 bg-card/60 backdrop-blur-lg shadow-lg hover:shadow-xl hover:border-accent/50 transition-all duration-300">
      <GlassCardHeader>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center">
            <FontAwesomeIcon icon={faLayerGroup} className="text-accent text-lg" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-foreground/90">
              {subForm.title || "ฟอร์มย่อย"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {subForm.fields?.length || 0} ฟิลด์
            </p>
          </div>

          {/* Compact Action Icons for SubForm */}
          <div className="flex-shrink-0">
            <div className="inline-flex items-center gap-1 bg-background/50 rounded-lg px-1 py-1">
              <GlassButton
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(!isExpanded)}
                tooltip={isExpanded ? "ย่อ" : "ขยาย"}
                className="opacity-70 hover:opacity-100 w-7 h-7"
              >
                <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} className="w-3 h-3 sm:w-4 sm:h-4" />
              </GlassButton>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <GlassButton
                    variant="ghost"
                    size="icon"
                    tooltip="ตัวเลือกเพิ่มเติม"
                    className="opacity-60 hover:opacity-100 transition-opacity w-7 h-7"
                  >
                    <FontAwesomeIcon icon={faEllipsisV} className="text-sm" />
                  </GlassButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass-container">
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
                  <DropdownMenuItem onClick={onRemove} className="text-destructive">
                    <FontAwesomeIcon icon={faTrashAlt} className="mr-2" />
                    ลบ
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </GlassCardHeader>

      {isExpanded && (
        <GlassCardContent className="space-y-6 pt-0">
          <Separator />

          {/* Form Info Section - Using InlineEdit like Main Form */}
          <GlassCard className="animate-fade-in border-2 border-primary/20">
            <GlassCardContent className="space-y-4 p-8">
              <div className="space-y-3">
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

          {/* Navigation Tabs - Matching Main Form */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 border-b border-border/20">
              <button
                onClick={() => setCurrentTab('fields')}
                className={`relative px-4 py-2 text-sm font-medium transition-all duration-200 ${
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
                className={`relative px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  currentTab === 'settings'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FontAwesomeIcon icon={faCog} className="mr-2" />
                ตั้งค่า
              </button>
            </div>

            {/* Fields Tab Content */}
            {currentTab === 'fields' && (
              <div className="space-y-4">
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
                      <div className="space-y-4">
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
                            maxTableFields={5}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : null}

                {/* Add Field Button - Always visible, positioned after fields or as standalone */}
                <div className="pt-4 flex justify-center">
                  {subForm.fields && subForm.fields.length > 0 ? (
                    <GlassButton
                      variant="primary"
                      onClick={addField}
                      tooltip="เพิ่มฟิลด์ใหม่"
                      className="flex items-center gap-3 h-12 px-6 touch-target-comfortable"
                    >
                      <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                      <span className="text-callout font-medium">เพิ่มฟิลด์</span>
                    </GlassButton>
                  ) : (
                    <GlassCard className="text-center py-8 border-2 border-dashed border-muted-foreground/30 w-full">
                      <GlassCardContent>
                        <div className="text-4xl mb-2 opacity-50">📝</div>
                        <p className="text-muted-foreground mb-3">ยังไม่มีฟิลด์ในฟอร์มย่อย</p>
                        <GlassButton
                          variant="primary"
                          onClick={addField}
                          className="h-12 px-6"
                        >
                          <FontAwesomeIcon icon={faPlus} className="mr-2" />
                          สร้างฟิลด์แรก
                        </GlassButton>
                      </GlassCardContent>
                    </GlassCard>
                  )}
                </div>
              </div>
            )}

            {/* Settings Tab Content */}
            {currentTab === 'settings' && (
              <div className="space-y-4">
                <GlassCard>
                  <GlassCardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <FontAwesomeIcon icon={faCog} className="text-primary" />
                      <h3 className="font-medium text-foreground">ตั้งค่าฟอร์มย่อย</h3>
                    </div>
                    <div className="text-sm text-muted-foreground">
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
export default function EnhancedFormBuilder({ initialForm, onSave, onCancel }) {
  const [form, setForm] = useState({
    id: initialForm?.id || generateFormId(),
    title: initialForm?.title || '',
    description: initialForm?.description || '',
    fields: initialForm?.fields || [
      {
        id: generateId(),
        title: "",
        type: "short_answer",
        required: false,
        options: {}
      }
    ],
    subForms: initialForm?.subForms || [],
    visibleRoles: initialForm?.visibleRoles || DEFAULT_VISIBLE_ROLES,
    settings: initialForm?.settings || {
      telegram: {
        enabled: false,
        botToken: '',
        groupId: '',
        fields: []
      },
      documentNumber: {
        enabled: false,
        prefix: 'DOC',
        format: 'prefix-number/year',
        yearFormat: 'buddhist'
      }
    }
  });

  const [activeSection, setActiveSection] = useState('main');

  const updateForm = (updates) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  const addField = () => {
    const newField = {
      id: generateId(),
      title: "",
      type: "short_answer",
      required: false,
      options: {}
    };
    updateForm({ fields: [...form.fields, newField] });
  };

  const updateField = (fieldId, fieldData) => {
    updateForm({
      fields: form.fields.map(field =>
        field.id === fieldId ? fieldData : field
      )
    });
  };

  const removeField = (fieldId) => {
    updateForm({
      fields: form.fields.filter(field => field.id !== fieldId)
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

    if (active.id !== over.id) {
      const oldIndex = form.fields.findIndex((field) => field.id === active.id);
      const newIndex = form.fields.findIndex((field) => field.id === over.id);

      updateForm({
        fields: arrayMove(form.fields, oldIndex, newIndex),
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

    updateForm({ fields: newFields });
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
      fields: []
    };
    updateForm({ subForms: [...form.subForms, newSubForm] });
  };

  const updateSubForm = (subFormId, subFormData) => {
    updateForm({
      subForms: form.subForms.map(subForm =>
        subForm.id === subFormId ? subFormData : subForm
      )
    });
  };

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

  const handleSave = () => {
    onSave(form, initialForm?.id);
  };

  const isFormValid = () => {
    return form.title.trim() !== '' && form.fields.some(field => field.title.trim() !== '');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90">
      <div className="container-responsive">
        {/* Enhanced Header with iOS 26 proportions */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8 lg:mb-10">
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-foreground/90 mb-2">
              {initialForm ? 'แก้ไขฟอร์ม' : 'สร้างฟอร์มใหม่'}
            </h1>
            <p className="text-sm text-muted-foreground leading-normal">
              สร้างและกำหนดค่าฟอร์มด้วยระบบ iOS 26 liquid glass design
            </p>
          </div>

          {/* Enhanced Action Bar */}
          <div className="flex items-center gap-3 lg:gap-4 shrink-0">

            <GlassButton
              variant="ghost"
              onClick={onCancel}
              tooltip="ยกเลิกและกลับ"
              className="flex items-center gap-3 h-12 px-6 touch-target-comfortable"
            >
              <FontAwesomeIcon icon={faUndo} className="w-4 h-4" />
              <span className="text-sm font-medium">ยกเลิก</span>
            </GlassButton>

            <GlassButton
              variant="primary"
              onClick={handleSave}
              disabled={!isFormValid()}
              tooltip={isFormValid() ? "บันทึกฟอร์ม" : "กรอกข้อมูลให้ครบถ้วน"}
              className="flex items-center gap-3 h-12 px-8 touch-target-primary"
            >
              <FontAwesomeIcon icon={faSave} className="w-4 h-4" />
              <span className="text-sm font-medium">บันทึก</span>
            </GlassButton>

            {/* Delete Button - Only show in edit mode */}
            {initialForm && (
              <GlassButton
                variant="ghost"
                onClick={() => {
                  if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบฟอร์มนี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้')) {
                    onCancel(initialForm.id, 'delete');
                  }
                }}
                tooltip="ลบฟอร์ม"
                className="flex items-center gap-3 h-12 px-6 touch-target-comfortable text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <FontAwesomeIcon icon={faTrashAlt} className="w-4 h-4" />
                <span className="text-sm font-medium">ลบ</span>
              </GlassButton>
            )}
          </div>
        </div>

        {/* Main Form Builder - Streamlined Layout */}
        <div className="space-y-3 sm:space-y-4">

            {/* Enhanced Section Navigation */}
            <div className="flex gap-3 lg:gap-4 overflow-x-auto pb-2">
              <GlassButton
                variant={activeSection === 'main' ? 'primary' : 'ghost'}
                onClick={() => setActiveSection('main')}
                className="whitespace-nowrap h-12 px-6 touch-target-comfortable"
              >
                <FontAwesomeIcon icon={faClipboardList} className="mr-2 w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-sm font-medium">ฟอร์มหลัก ({form.fields.length})</span>
              </GlassButton>
              <GlassButton
                variant={activeSection === 'sub' ? 'primary' : 'ghost'}
                onClick={() => setActiveSection('sub')}
                className="whitespace-nowrap h-12 px-6 touch-target-comfortable"
              >
                <FontAwesomeIcon icon={faLayerGroup} className="mr-2 w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-sm font-medium">ฟอร์มย่อย ({form.subForms.length})</span>
              </GlassButton>
              <GlassButton
                variant={activeSection === 'settings' ? 'primary' : 'ghost'}
                onClick={() => setActiveSection('settings')}
                className="whitespace-nowrap h-12 px-6 touch-target-comfortable"
              >
                <FontAwesomeIcon icon={faCog} className="mr-2 w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-sm font-medium">ตั้งค่า</span>
              </GlassButton>
            </div>

            {/* Main Fields Section */}
            {activeSection === 'main' && (
              <div className="space-y-3 sm:space-y-4">
                {/* Form Title and Description - Inline Editing */}
                <GlassCard className="animate-fade-in border-2 border-primary/20 bg-card/60 backdrop-blur-lg shadow-lg hover:shadow-xl hover:border-primary/40 transition-all duration-300">
                  <GlassCardContent className="space-y-3 px-4 py-3">
                    <div className="space-y-2">
                      <InlineEdit
                        value={form.title}
                        onChange={(value) => updateForm({ title: value })}
                        placeholder="คลิกเพื่อระบุชื่อฟอร์ม..."
                        isTitle={true}
                      />
                      <InlineEdit
                        value={form.description}
                        onChange={(value) => updateForm({ description: value })}
                        placeholder="คลิกเพื่อเพิ่มคำอธิบายฟอร์ม..."
                        isTitle={false}
                      />
                    </div>
                  </GlassCardContent>
                </GlassCard>

                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div>
                    <h2 className="text-base font-semibold text-foreground/90">ฟิลด์ในฟอร์ม</h2>
                    <p className="text-footnote text-muted-foreground mt-1">
                      จัดการฟิลด์ต่างๆ ในฟอร์มหลัก
                    </p>
                  </div>
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={form.fields.map(field => field.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3 sm:space-y-4">
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
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {/* Add Field Button - Positioned after all fields */}
                <div className="pt-4 flex justify-center">
                  <GlassButton
                    variant="primary"
                    onClick={addField}
                    tooltip="เพิ่มฟิลด์ใหม่"
                    className="flex items-center gap-3 h-12 px-6 touch-target-comfortable"
                  >
                    <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                    <span className="text-callout font-medium">เพิ่มฟิลด์</span>
                  </GlassButton>
                </div>
              </div>
            )}

            {/* Sub Forms */}
            {activeSection === 'sub' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground/90">ฟอร์มย่อย</h2>
                </div>

                {form.subForms.length > 0 ? (
                  <div className="space-y-4">
                    {form.subForms.map((subForm, index) => (
                      <SubFormBuilder
                        key={subForm.id}
                        subForm={subForm}
                        onChange={(subFormData) => updateSubForm(subForm.id, subFormData)}
                        onRemove={() => removeSubForm(subForm.id)}
                        canMoveUp={index > 0}
                        canMoveDown={index < form.subForms.length - 1}
                        onMoveUp={() => moveSubForm(subForm.id, 'up')}
                        onMoveDown={() => moveSubForm(subForm.id, 'down')}
                        onDuplicate={() => duplicateSubForm(subForm.id)}
                      />
                    ))}

                    {/* Add SubForm Button - Positioned after all subforms */}
                    <div className="pt-4 flex justify-center">
                      <GlassButton
                        variant="primary"
                        onClick={addSubForm}
                        tooltip="เพิ่มฟอร์มย่อย"
                        className="flex items-center gap-3 h-12 px-6 touch-target-comfortable"
                      >
                        <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                        <span className="text-callout font-medium">เพิ่มฟอร์มย่อย</span>
                      </GlassButton>
                    </div>
                  </div>
                ) : (
                  <GlassCard className="text-center py-12 border-2 border-dashed border-muted-foreground/30">
                    <GlassCardContent>
                      <div className="text-6xl mb-4 opacity-50">📄</div>
                      <GlassCardTitle className="mb-2">ยังไม่มีฟอร์มย่อย</GlassCardTitle>
                      <GlassCardDescription className="mb-4">
                        ฟอร์มย่อยใช้สำหรับเก็บข้อมูลเพิ่มเติมหลังจากบันทึกฟอร์มหลักแล้ว
                      </GlassCardDescription>
                      <GlassButton
                        variant="primary"
                        onClick={addSubForm}
                        className="h-12 px-6"
                      >
                        <FontAwesomeIcon icon={faPlus} className="mr-2" />
                        สร้างฟอร์มย่อยแรก
                      </GlassButton>
                    </GlassCardContent>
                  </GlassCard>
                )}
              </div>
            )}

            {/* Settings */}
            {activeSection === 'settings' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-foreground/90">ตั้งค่าฟอร์ม</h2>

                {/* Telegram Settings */}
                <GlassCard>
                  <GlassCardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
                        <FontAwesomeIcon icon={faComments} className="text-blue-600 text-lg" />
                      </div>
                      <div>
                        <GlassCardTitle>การแจ้งเตือน Telegram</GlassCardTitle>
                        <GlassCardDescription minimal>
                          ส่งการแจ้งเตือนไปยัง Telegram เมื่อมีการส่งฟอร์ม
                        </GlassCardDescription>
                      </div>
                    </div>
                  </GlassCardHeader>
                  <GlassCardContent className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={form.settings.telegram.enabled}
                        onChange={(e) => updateForm({
                          settings: {
                            ...form.settings,
                            telegram: { ...form.settings.telegram, enabled: e.target.checked }
                          }
                        })}
                        className="w-4 h-4 text-primary focus:ring-primary/20 focus:ring-2 rounded"
                      />
                      <span className="text-sm text-foreground/80 group-hover:text-foreground/90">
                        เปิดใช้งานการแจ้งเตือน Telegram
                      </span>
                    </label>

                    {form.settings.telegram.enabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <GlassInput
                          label="Bot Token"
                          value={form.settings.telegram.botToken}
                          onChange={(e) => updateForm({
                            settings: {
                              ...form.settings,
                              telegram: { ...form.settings.telegram, botToken: e.target.value }
                            }
                          })}
                          placeholder="1234567890:ABC..."
                          tooltip="Token ของ Telegram Bot"
                          minimal
                        />
                        <GlassInput
                          label="Group ID"
                          value={form.settings.telegram.groupId}
                          onChange={(e) => updateForm({
                            settings: {
                              ...form.settings,
                              telegram: { ...form.settings.telegram, groupId: e.target.value }
                            }
                          })}
                          placeholder="-1001234567890"
                          tooltip="ID ของกลุ่ม Telegram"
                          minimal
                        />
                      </div>
                    )}
                  </GlassCardContent>
                </GlassCard>

                {/* User Role Access Control Settings */}
                <GlassCard>
                  <GlassCardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center">
                        <FontAwesomeIcon icon={faUsers} className="text-green-600 text-lg" />
                      </div>
                      <div>
                        <GlassCardTitle>User Role Access Control</GlassCardTitle>
                        <GlassCardDescription minimal>
                          Select which user roles can view and access this form
                        </GlassCardDescription>
                      </div>
                    </div>
                  </GlassCardHeader>
                  <GlassCardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground mb-4">
                      <FontAwesomeIcon icon={faShieldAlt} className="mr-2" />
                      Choose user roles that can access this form
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {Object.values(USER_ROLES).map((role) => {
                        const isVisible = form.visibleRoles.includes(role.id);
                        const isDisabled = role.isDefault; // Super Admin and Admin are always selected

                        return (
                          <button
                            key={role.id}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => {
                              if (isDisabled) return;
                              const newVisibleRoles = isVisible
                                ? form.visibleRoles.filter(id => id !== role.id)
                                : [...form.visibleRoles, role.id];
                              updateForm({ visibleRoles: newVisibleRoles });
                            }}
                            className={`
                              px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200
                              ${isVisible
                                ? `${role.bgColor} ${role.color} shadow-sm border-2 border-current/20`
                                : 'bg-muted/20 text-muted-foreground border-2 border-transparent hover:bg-muted/40'
                              }
                              ${isDisabled
                                ? 'cursor-not-allowed opacity-90'
                                : 'cursor-pointer hover:scale-105'
                              }
                            `}
                          >
                            {role.name}
                            {isDisabled && (
                              <span className="ml-1 text-xs opacity-70">•</span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4 p-3 bg-muted/10 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <FontAwesomeIcon icon={faUsers} className="text-primary" />
                        <span className="font-medium">Selected Roles ({form.visibleRoles.length} of {Object.keys(USER_ROLES).length}):</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {form.visibleRoles.map(roleId => {
                          const role = Object.values(USER_ROLES).find(r => r.id === roleId);
                          if (!role) return null;
                          return (
                            <Badge
                              key={roleId}
                              className={`${role.bgColor} ${role.color} border-0 text-xs font-medium px-2 py-1`}
                            >
                              {role.name}
                              {role.isDefault && <span className="ml-1 opacity-70">•</span>}
                            </Badge>
                          );
                        })}
                        {form.visibleRoles.length === 0 && (
                          <span className="text-xs text-muted-foreground italic">No roles selected - form will not be visible to anyone</span>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground/70">
                        <span className="opacity-70">•</span> Always selected roles (cannot be changed)
                      </div>
                    </div>
                  </GlassCardContent>
                </GlassCard>

                {/* Document Number Settings */}
                <GlassCard>
                  <GlassCardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center">
                        <FontAwesomeIcon icon={faFileUpload} className="text-purple-600 text-lg" />
                      </div>
                      <div>
                        <GlassCardTitle>หมายเลขเอกสารอัตโนมัติ</GlassCardTitle>
                        <GlassCardDescription minimal>
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
                      <span className="text-sm text-foreground/80 group-hover:text-foreground/90">
                        เปิดใช้งานหมายเลขเอกสารอัตโนมัติ
                      </span>
                    </label>

                    {form.settings.documentNumber.enabled && (
                      <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                        <div className="p-4 bg-muted/10 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">ตัวอย่าง:</p>
                          <code className="text-sm font-mono text-foreground/80">
                            {form.settings.documentNumber.prefix}-
                            {form.settings.documentNumber.format === 'prefix-number/year' ? '0001/2567' : '2567/0001'}
                          </code>
                        </div>
                      </div>
                    )}
                  </GlassCardContent>
                </GlassCard>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
