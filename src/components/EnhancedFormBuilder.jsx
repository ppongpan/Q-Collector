import React, { useState, useRef, useEffect, useCallback } from "react";

// Data services
import dataService from '../services/DataService.js';

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
import FieldToggleButtons from "./ui/field-toggle-buttons";
import { useEnhancedToast } from './ui/enhanced-toast';
import AnimatedAddButton from './ui/animated-add-button';
import TelegramNotificationSettings from './ui/telegram-notification-settings';
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
  faClipboardList, faSave, faUsers
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
  maxTableFields = 5,
  formTitle = ''
}) {
  const [isExpanded, setIsExpanded] = useState(false); // Default to collapsed for better overview
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
    <GlassCard className="form-card-glow form-card-animate form-card-borderless motion-container animation-optimized group transition-all duration-400 ease-out shadow-lg hover:shadow-xl hover:border-primary/30 hover:scale-[1.01]">
      {/* Field Header - Responsive Visual Hierarchy */}
      <GlassCardHeader
        className="pb-3 sm:pb-4 lg:pb-6 cursor-pointer"
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
        <div className="flex items-center gap-2 px-2">
          {/* Drag Handle - Accessible Touch Target */}
          <div className="flex-shrink-0 ml-1">
            <div
              {...dragHandleProps}
              className="flex items-center justify-center min-w-12 min-h-12 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full hover:bg-background/50 focus:bg-background/70 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200 cursor-grab active:cursor-grabbing opacity-50 group-hover:opacity-100 touch-target-min"
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
              <GlassSelect
                value={field.type}
                onChange={(e) => updateField({ type: e.target.value })}
                tooltip="เลือกประเภทฟิลด์"
                className="h-8 w-36 text-xs border-0 bg-orange-500/10 text-orange-500 orange-neon-permanent"
                data-interactive="true"
              >
                <option value="" disabled className="text-muted-foreground">
                  เลือกประเภท
                </option>
                {FIELD_TYPES.map((type) => (
                  <option key={type.value} value={type.value} className="text-foreground">
                    {type.label}
                  </option>
                ))}
              </GlassSelect>
            </div>
          )}


          {/* Field Preview - Flexible */}
          <div className="flex-1 min-w-0">
            {getFieldPreview()}
          </div>

          {/* Action Icons - Accessible Touch Targets */}
          <div className="flex-shrink-0 mr-1">
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
                  checked={field.showCondition?.enabled !== true}
                  onChange={(e) => {
                    const isAlwaysVisible = e.target.checked;
                    updateField({
                      showCondition: {
                        enabled: !isAlwaysVisible,
                        formula: isAlwaysVisible ? '' : (field.showCondition?.formula || '')
                      }
                    });
                  }}
                  className="w-4 h-4 text-primary focus:ring-primary/20 focus:ring-2 rounded"
                />
                <span className="text-sm text-foreground/80">
                  แสดง <span className="text-xs text-muted-foreground ml-1">(แสดงฟิลด์นี้เสมอ)</span>
                </span>
              </label>

              {/* Conditional Formula Input - Only show when checkbox is unchecked */}
              {field.showCondition?.enabled === true && (
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
                      onChange={(e) => updateField({
                        showCondition: {
                          ...field.showCondition,
                          formula: e.target.value
                        }
                      })}
                      placeholder="เช่น: field_1 == 'value' หรือ field_2 > 10"
                      className="min-h-20 font-mono text-xs bg-orange-500/5 border-orange-200/30"
                      minimal
                    />

                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• ใช้ชื่อฟิลด์: field_1, field_2, ...</p>
                      <p>• เปรียบเทียบ: ==, !=, &gt;, &lt;, &gt;=, &lt;=</p>
                      <p>• ตรรกะ: &amp;&amp; (และ), || (หรือ), ! (ไม่)</p>
                      <p>• ตัวอย่าง: field_1 == 'ใช่' &amp;&amp; field_2 &gt; 5</p>
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
function SubFormBuilder({ subForm, onChange, onRemove, canMoveUp, canMoveDown, onMoveUp, onMoveDown, onDuplicate, isDefaultEmpty = false }) {
  const [isExpanded, setIsExpanded] = useState(false);
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
      telegramPrefix: '',
      telegramOrder: 0,
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
    <GlassCard variant="elevated" className="form-card-glow form-card-animate form-card-borderless motion-container animation-optimized group transition-all duration-400 ease-out border-2 border-dashed border-accent/30 shadow-lg hover:shadow-xl hover:border-accent/50">
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
          <GlassCard className="form-card-glow form-card-animate form-card-borderless motion-container animation-optimized group transition-all duration-400 ease-out animate-fade-in border-2 border-primary/20">
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
                            maxTableFields={5}
                            formTitle={subForm.title}
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
                <GlassCard className="form-card-glow form-card-animate form-card-borderless motion-container animation-optimized group transition-all duration-400 ease-out">
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
        showInTable: false,
        sendTelegram: false,
        telegramPrefix: '',
        telegramOrder: 0,
        options: {}
      }
    ],
    subForms: initialForm?.subForms || [],
    visibleRoles: initialForm?.visibleRoles || DEFAULT_VISIBLE_ROLES,
    userRoles: initialForm?.userRoles || initialForm?.visibleRoles || DEFAULT_VISIBLE_ROLES,
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
        yearFormat: 'buddhist',
        initialNumber: 1
      },
      dateFormat: {
        yearFormat: 'christian', // 'buddhist' or 'christian'
        format: 'dd/mm/yyyy'     // Default to dd/mm/yyyy CE
      }
    },
    // New telegram settings structure for enhanced component
    telegramSettings: initialForm?.telegramSettings || {
      enabled: false,
      botToken: '',
      groupId: '',
      messagePrefix: 'ข้อมูลใหม่จาก [FormName] [DateTime]',
      selectedFields: []
    }
  });

  const [activeSection, setActiveSection] = useState('main');

  // Enhanced toast notifications
  const toast = useEnhancedToast();

  const updateForm = (updates) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  // Calculate available fields for telegram notifications
  const getAvailableFields = () => {
    return form.fields.filter(field => field.sendTelegram);
  };

  const addField = () => {
    const newField = {
      id: generateId(),
      title: "",
      type: "short_answer",
      required: false,
      showInTable: false,
      sendTelegram: false,
      telegramPrefix: '',
      telegramOrder: 0,
      options: {}
    };
    updateForm({ fields: [...form.fields, newField] });
  };

  // Helper function to reorder telegram fields sequentially
  const reorderTelegramFields = (fieldsArray) => {
    const telegramFields = fieldsArray.filter(f => f.sendTelegram);
    const nonTelegramFields = fieldsArray.filter(f => !f.sendTelegram);

    // Sort telegram fields by their current order, then assign sequential numbers
    const orderedTelegramFields = telegramFields
      .sort((a, b) => (a.telegramOrder || 0) - (b.telegramOrder || 0))
      .map((field, index) => ({
        ...field,
        telegramOrder: index + 1
      }));

    // Reset non-telegram fields order to 0
    const resetNonTelegramFields = nonTelegramFields.map(field => ({
      ...field,
      telegramOrder: 0
    }));

    return [...orderedTelegramFields, ...resetNonTelegramFields];
  };

  const updateField = (fieldId, fieldData) => {
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

    if (active.id !== over.id) {
      const oldIndex = form.fields.findIndex((field) => field.id === active.id);
      const newIndex = form.fields.findIndex((field) => field.id === over.id);

      const reorderedFields = arrayMove(form.fields, oldIndex, newIndex);

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

    // Check if any telegram fields were moved, if so reorder telegram numbers
    const hasTelegramFields = newFields.some(f => f.sendTelegram);

    updateForm({
      fields: hasTelegramFields ? reorderTelegramFields(newFields) : newFields
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

  const handleSave = useCallback(async () => {
    try {
      // ตรวจสอบว่ามีการเลือกฟิลด์สำหรับแสดงในตารางหรือไม่ (หลังจากกดปุ่ม save)
      const tableFields = form.fields.filter(field => field.showInTable);

      if (tableFields.length === 0) {
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

      // ตรวจสอบว่าเป็นการแก้ไขหรือสร้างใหม่
      let savedForm;
      if (initialForm?.id) {
        // แก้ไขฟอร์มที่มีอยู่
        savedForm = dataService.updateForm(initialForm.id, {
          title: form.title,
          description: form.description,
          fields: form.fields,
          subForms: form.subForms,
          settings: form.settings,
          telegramSettings: form.telegramSettings,
          visibleRoles: form.visibleRoles
        });
        toast.success('ฟอร์มถูกอัพเดทเรียบร้อยแล้ว', {
          title: "อัพเดทสำเร็จ",
          duration: 5000
        });
      } else {
        // สร้างฟอร์มใหม่
        savedForm = dataService.createForm({
          title: form.title,
          description: form.description,
          fields: form.fields,
          subForms: form.subForms,
          settings: form.settings,
          telegramSettings: form.telegramSettings,
          visibleRoles: form.visibleRoles
        });
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
      toast.error(`เกิดข้อผิดพลาดในการบันทึกฟอร์ม: ${error.message}`, {
        title: "บันทึกไม่สำเร็จ",
        duration: 8000,
        action: {
          label: "ลองอีกครั้ง",
          onClick: () => handleSave()
        }
      });
    }
  }, [form, initialForm, onSave]);

  const isFormValid = () => {
    return form.title.trim() !== '' && form.fields.some(field => field.title.trim() !== '');
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

              {/* Action Buttons - Enhanced Responsive */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">

                {/* Delete Button - Only show in edit mode */}
                {initialForm && (
                  <div
                    onClick={async () => {
                      const submissions = dataService.getSubmissionsByFormId(initialForm.id);
                      const submissionCount = submissions.length;

                      let confirmMessage = `คุณแน่ใจหรือไม่ที่จะลบฟอร์ม "${form.title}"?`;
                      let warningMessage = "การลบจะไม่สามารถย้อนกลับได้";

                      if (submissionCount > 0) {
                        warningMessage += ` ฟอร์มนี้มีข้อมูล ${submissionCount} รายการ ข้อมูลทั้งหมดจะถูกลบด้วย`;
                      }

                      // Show confirmation toast with action buttons
                      toast.error(warningMessage, {
                        title: confirmMessage,
                        duration: 10000,
                        action: {
                          label: "ยืนยันการลบ",
                          onClick: async () => {
                            try {
                              dataService.deleteForm(initialForm.id);
                              toast.success('ลบฟอร์มเรียบร้อยแล้ว', {
                                title: "ลบสำเร็จ",
                                duration: 3000
                              });
                              // Navigate back to form list
                              onCancel();
                            } catch (error) {
                              console.error('Delete error:', error);
                              toast.error('เกิดข้อผิดพลาดในการลบฟอร์ม', {
                                title: "ลบไม่สำเร็จ",
                                duration: 5000
                              });
                            }
                          }
                        }
                      });
                    }}
                    title="ลบฟอร์ม"
                    className="p-2 text-red-500 hover:text-red-400 transition-all duration-300 touch-target-comfortable cursor-pointer"
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
                    <FontAwesomeIcon icon={faTrashAlt} className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>

            {/* Main Fields Section - Optimized Proportions */}
            {activeSection === 'main' && (
              <div className="space-y-6 sm:space-y-8 lg:space-y-10">
                {/* Form Title and Description - Responsive Layout */}
                <GlassCard className="form-card-glow form-card-animate form-card-borderless motion-container animation-optimized group transition-all duration-400 ease-out animate-fade-in border-2 border-primary/20 shadow-lg hover:shadow-xl hover:border-primary/40">
                  <GlassCardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
                    <div className="space-y-3 sm:space-y-4">
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
            {activeSection === 'sub' && (
              <div className="space-y-6">
                {(() => {
                  // Always ensure there's at least one empty subForm
                  const subFormsToShow = form.subForms.length > 0 ? form.subForms : [{
                    id: generateId(),
                    title: "",
                    description: "",
                    fields: []
                  }];

                  return (
                    <div className="space-y-6">
                      {subFormsToShow.map((subForm, index) => (
                        <SubFormBuilder
                          key={subForm.id}
                          subForm={subForm}
                          onChange={(subFormData) => {
                            if (form.subForms.length === 0) {
                              // If this is the default empty subForm, add it to the form
                              updateForm({ subForms: [subFormData] });
                            } else {
                              updateSubForm(subForm.id, subFormData);
                            }
                          }}
                          onRemove={() => {
                            if (form.subForms.length > 0) {
                              removeSubForm(subForm.id);
                            }
                          }}
                          canMoveUp={index > 0}
                          canMoveDown={index < subFormsToShow.length - 1}
                          onMoveUp={() => moveSubForm(subForm.id, 'up')}
                          onMoveDown={() => moveSubForm(subForm.id, 'down')}
                          onDuplicate={() => duplicateSubForm(subForm.id)}
                          isDefaultEmpty={form.subForms.length === 0 && index === 0}
                        />
                      ))}

                      {/* Add SubForm Button - Positioned after all subforms - 8px Grid */}
                      <div className="pt-8 flex justify-center">
                        <AnimatedAddButton
                          onClick={addSubForm}
                          tooltip="เพิ่มฟอร์มย่อย"
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Settings - 8px Grid */}
            {activeSection === 'settings' && (
              <div className="space-y-8">
                <div>
                  <h2 className="form-card-title text-lg font-semibold">ตั้งค่าฟอร์ม</h2>
                  <p className="form-card-description mt-2 text-xs">
                    กำหนดค่าขั้นสูงสำหรับการแจ้งเตือน การจัดการผู้ใช้ และระบบอัตโนมัติ
                  </p>
                </div>

                {/* User Role Access Control Settings - 8px Grid - MOVED TO TOP */}
                <GlassCard className="form-card-glow form-card-animate form-card-borderless motion-container animation-optimized group transition-all duration-400 ease-out">
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
                  <GlassCardContent className="space-y-6">

                    <div className="flex flex-wrap gap-3">
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
                              updateForm({
                                visibleRoles: newVisibleRoles
                              });
                            }}
                            title={isDisabled ? `${role.name} • Always selected (cannot be changed)` : `Toggle ${role.name} access`}
                            className={`
                              px-3 py-2 rounded-xl font-medium text-sm transition-all duration-200
                              ${isVisible
                                ? `${role.bgColor} ${role.color} shadow-sm hover:shadow-[0_0_15px_rgba(249,115,22,0.4)]`
                                : 'bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:shadow-[0_0_10px_rgba(249,115,22,0.2)]'
                              }
                              ${isDisabled
                                ? 'cursor-not-allowed opacity-90'
                                : 'cursor-pointer hover:scale-105'
                              }
                            `}
                            style={{ border: 'none' }}
                          >
                            {role.name}
                            {isDisabled && (
                              <span className="ml-1 text-xs opacity-70">•</span>
                            )}
                          </button>
                        );
                      })}
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
                  <GlassCardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-foreground/80">ประเภทปี</label>
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
                            <span className="text-sm text-foreground/80">ค.ศ. (2024)</span>
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
                            <span className="text-sm text-foreground/80">พ.ศ. (2567)</span>
                          </label>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-medium text-foreground/80">รูปแบบการแสดงผล</label>
                        <div className="p-3 bg-muted/20 rounded-lg border border-border/30">
                          <div className="text-sm text-foreground/80">
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
                            <div className="text-xs text-muted-foreground mt-1">
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
                  <GlassCardContent className="space-y-6">
                    <label className="flex items-center gap-4 cursor-pointer group">
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
                      <div className="space-y-6 pt-3">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

                        <div className="p-6 bg-muted/10 rounded-xl">
                          <p className="text-sm text-muted-foreground mb-2">ตัวอย่าง:</p>
                          <code className="text-sm font-mono text-foreground/80">
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
                          <p className="text-xs text-muted-foreground mt-2">
                            หมายเลขจะเริ่มต้นที่ {(form.settings.documentNumber.initialNumber || 1).toString().padStart(4, '0')} และรีเซ็ตเป็น 0001 ทุกปีใหม่
                          </p>
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
