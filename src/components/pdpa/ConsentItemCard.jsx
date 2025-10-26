/**
 * Consent Item Card Component
 *
 * Editable card for individual consent items with drag-and-drop support.
 * Displays Thai/English title, description, purpose, retention, and required status.
 *
 * @version 0.9.0-dev
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGripVertical,
  faTrashAlt,
  faChevronDown,
  faChevronUp,
  faCheckCircle,
  faCircle
} from '@fortawesome/free-solid-svg-icons';
import { GlassCard, GlassCardContent } from '../ui/glass-card';
import { GlassInput, GlassTextarea, GlassSelect } from '../ui/glass-input';

const ConsentItemCard = ({ item, onUpdate, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localItem, setLocalItem] = useState(item); // Local state buffer
  const [isDirty, setIsDirty] = useState(false); // Track if changes exist

  // Sync localItem when item prop changes (e.g., after save)
  useEffect(() => {
    setLocalItem(item);
    setIsDirty(false); // Reset dirty flag when synced with parent
  }, [item]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  // Update local state only (no auto-save)
  const handleFieldChange = useCallback((field, value) => {
    setLocalItem(prev => ({ ...prev, [field]: value }));
    setIsDirty(true); // Mark as dirty
  }, []);

  // Manual save - when user clicks "บันทึก" button
  const handleSave = useCallback(() => {
    onUpdate(localItem);
    setIsDirty(false);
  }, [localItem, onUpdate]);

  // Cancel changes - revert to original item
  const handleCancel = useCallback(() => {
    setLocalItem(item);
    setIsDirty(false);
  }, [item]);

  // Handle expand/collapse with dirty check
  const handleToggleExpanded = useCallback(() => {
    if (isExpanded && isDirty) {
      // If closing with unsaved changes, ask user
      if (window.confirm('มีการแก้ไขที่ยังไม่ได้บันทึก ต้องการบันทึกก่อนปิดหรือไม่?')) {
        handleSave();
      } else {
        handleCancel();
      }
    }
    setIsExpanded(!isExpanded);
  }, [isExpanded, isDirty, handleSave, handleCancel]);

  // Select all text on focus
  const handleFocus = (e) => {
    e.target.select();
  };

  return (
    <div ref={setNodeRef} style={style}>
      <GlassCard className={`form-card-animate transition-all duration-200 ${isDragging ? 'shadow-lg' : ''}`}>
        <GlassCardContent className="p-4">
          {/* Header Row */}
          <div className="flex items-start gap-3">
            {/* Drag Handle */}
            <button
              type="button"
              className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
              {...attributes}
              {...listeners}
            >
              <FontAwesomeIcon icon={faGripVertical} className="w-4 h-4" />
            </button>

            {/* Content */}
            <div className="flex-1 space-y-3">
              {/* Title and Actions Row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon
                      icon={item.required ? faCheckCircle : faCircle}
                      className={`w-4 h-4 ${item.required ? 'text-green-500' : 'text-muted-foreground'}`}
                    />
                    <span className="text-[14px] font-semibold text-foreground">
                      {item.titleTh || 'ไม่มีชื่อ'}
                    </span>
                    {item.required && (
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-green-500/10 text-green-600 rounded-full">
                        จำเป็น
                      </span>
                    )}
                  </div>
                  {!isExpanded && item.purpose && (
                    <p className="text-[12px] text-muted-foreground mt-1">
                      วัตถุประสงค์: {item.purpose}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleExpanded}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/20 rounded transition-all"
                    title={isExpanded ? 'ย่อ' : 'ขยาย'}
                  >
                    <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={onDelete}
                    className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                    title="ลบ"
                  >
                    <FontAwesomeIcon icon={faTrashAlt} className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="space-y-4 pt-2 animate-in slide-in-from-top-2 duration-300">
                  {/* Thai Title */}
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-foreground/70">
                      ชื่อ (ไทย) <span className="text-red-500">*</span>
                    </label>
                    <GlassInput
                      type="text"
                      value={localItem.titleTh || ''}
                      onChange={(e) => handleFieldChange('titleTh', e.target.value)}
                      onFocus={handleFocus}
                      placeholder="เช่น: การรับข่าวสารทางอีเมล"
                      className="w-full text-[13px]"
                    />
                  </div>

                  {/* English Title */}
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-foreground/70">
                      Title (English)
                    </label>
                    <GlassInput
                      type="text"
                      value={localItem.titleEn || ''}
                      onChange={(e) => handleFieldChange('titleEn', e.target.value)}
                      onFocus={handleFocus}
                      placeholder="e.g., Email Newsletter Subscription"
                      className="w-full text-[13px]"
                    />
                  </div>

                  {/* Thai Description */}
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-foreground/70">
                      คำอธิบาย (ไทย)
                    </label>
                    <GlassTextarea
                      value={localItem.descriptionTh || ''}
                      onChange={(e) => handleFieldChange('descriptionTh', e.target.value)}
                      onFocus={handleFocus}
                      placeholder="อธิบายรายละเอียดเกี่ยวกับการใช้ข้อมูล..."
                      rows={3}
                      className="w-full text-[13px]"
                    />
                  </div>

                  {/* English Description */}
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-foreground/70">
                      Description (English)
                    </label>
                    <GlassTextarea
                      value={localItem.descriptionEn || ''}
                      onChange={(e) => handleFieldChange('descriptionEn', e.target.value)}
                      onFocus={handleFocus}
                      placeholder="Describe how the data will be used..."
                      rows={3}
                      className="w-full text-[13px]"
                    />
                  </div>

                  {/* Purpose - Combobox (can select or type custom) */}
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-foreground/70">
                      วัตถุประสงค์ <span className="text-red-500">*</span>
                    </label>
                    <GlassInput
                      type="text"
                      list="purpose-options"
                      value={localItem.purpose || ''}
                      onChange={(e) => handleFieldChange('purpose', e.target.value)}
                      onFocus={handleFocus}
                      placeholder="เลือกหรือพิมพ์วัตถุประสงค์..."
                      className="w-full text-[13px]"
                    />
                    <datalist id="purpose-options">
                      <option value="การตลาดและโฆษณา (Marketing)" />
                      <option value="การวิเคราะห์ข้อมูล (Analytics)" />
                      <option value="การปรับแต่งบริการ (Personalization)" />
                      <option value="การติดต่อสื่อสาร (Communication)" />
                      <option value="การปฏิบัติตามกฎหมาย (Legal Compliance)" />
                      <option value="การวิจัยและพัฒนา (Research)" />
                      <option value="การปรับปรุงคุณภาพบริการ (Service Improvement)" />
                      <option value="การรักษาความปลอดภัย (Security)" />
                      <option value="อื่นๆ (Other)" />
                    </datalist>
                  </div>

                  {/* Retention Period */}
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-foreground/70">
                      ระยะเวลาเก็บข้อมูล <span className="text-red-500">*</span>
                    </label>
                    <GlassInput
                      type="text"
                      value={localItem.retentionPeriod || '3 ปี'}
                      onChange={(e) => handleFieldChange('retentionPeriod', e.target.value)}
                      onFocus={handleFocus}
                      placeholder="ค่าเริ่มต้น: 3 ปี (สามารถแก้ไขได้)"
                      className="w-full text-[13px]"
                    />
                  </div>

                  {/* Required Toggle and Version */}
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localItem.required || false}
                        onChange={(e) => handleFieldChange('required', e.target.checked)}
                        className="w-4 h-4 rounded border-2 border-border bg-background checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                      />
                      <span className="text-[12px] text-foreground/70">ความยินยอมจำเป็น</span>
                    </label>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-foreground/60">Version</label>
                      <GlassInput
                        type="number"
                        min="1"
                        value={localItem.version || 1}
                        onChange={(e) => handleFieldChange('version', parseInt(e.target.value) || 1)}
                        onFocus={handleFocus}
                        className="w-full text-[13px]"
                      />
                    </div>
                  </div>

                  {/* Save/Cancel Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/20">
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={!isDirty}
                      className="px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={!isDirty}
                      className="px-3 py-1.5 text-[12px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                    >
                      บันทึก
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  );
};

export default ConsentItemCard;
