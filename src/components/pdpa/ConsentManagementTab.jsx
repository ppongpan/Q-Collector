/**
 * Consent Management Tab Component
 *
 * Form Builder settings section for managing PDPA consent items.
 * Supports CRUD operations with drag-and-drop sorting.
 *
 * @version 0.9.0-dev
 */

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboardCheck, faPlus, faSpinner } from '@fortawesome/free-solid-svg-icons';
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
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription, GlassCardContent } from '../ui/glass-card';
import { GlassButton } from '../ui/glass-button';
import { useEnhancedToast } from '../ui/enhanced-toast';
import ConsentService from '../../services/ConsentService';
import ConsentItemCard from './ConsentItemCard';

const ConsentManagementTab = ({ form, onUpdate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [consentItems, setConsentItems] = useState([]);
  const [isEnabled, setIsEnabled] = useState(form.settings?.consentManagement?.enabled || false);
  const toast = useEnhancedToast();

  // Helper function to check if form is saved (has UUID format)
  const isFormSaved = () => {
    if (!form.id) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(form.id);
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  // Load consent items from backend
  useEffect(() => {
    if (form.id && isEnabled) {
      loadConsentItems();
    }
  }, [form.id, isEnabled]);

  const loadConsentItems = async () => {
    // Only load items if form is saved to database
    if (!isFormSaved()) {
      return;
    }

    setIsLoading(true);
    try {
      const items = await ConsentService.getConsentItemsByForm(form.id);
      // Sort by order
      const sortedItems = items.sort((a, b) => (a.order || 0) - (b.order || 0));
      setConsentItems(sortedItems);
    } catch (error) {
      console.error('Error loading consent items:', error);

      // Enhanced error messages
      let errorTitle = 'เกิดข้อผิดพลาด';
      let errorMessage = 'ไม่สามารถโหลดรายการความยินยอมได้';

      if (error.status === 500) {
        errorTitle = 'ข้อผิดพลาดเซิร์ฟเวอร์';
        errorMessage = 'เซิร์ฟเวอร์เกิดปัญหา กรุณาตรวจสอบ backend logs หรือติดต่อผู้ดูแลระบบ';
      } else if (error.status === 404) {
        errorMessage = 'ไม่พบฟอร์มนี้ในระบบ กรุณาตรวจสอบว่าฟอร์มถูกบันทึกแล้ว';
      } else if (error.status === 403) {
        errorMessage = 'คุณไม่มีสิทธิ์เข้าถึงฟอร์มนี้';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage, {
        title: errorTitle,
        duration: 8000 // Longer duration for detailed errors
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleEnabled = (enabled) => {
    // Check if form is saved before enabling
    if (enabled && !isFormSaved()) {
      toast.error('กรุณาบันทึกฟอร์มก่อนเปิดใช้งาน Consent Management', {
        title: 'ไม่สามารถเปิดใช้งานได้',
        duration: 5000
      });
      return;
    }

    setIsEnabled(enabled);
    onUpdate({
      settings: {
        ...form.settings,
        consentManagement: {
          ...form.settings?.consentManagement,
          enabled
        }
      }
    });

    if (enabled && form.id) {
      loadConsentItems();
    }
  };

  const handleAddItem = async () => {
    // Check if form is saved before adding items
    if (!isFormSaved()) {
      toast.error('กรุณาบันทึกฟอร์มก่อนเพิ่มรายการความยินยอม', {
        title: 'ไม่สามารถเพิ่มรายการได้',
        duration: 5000
      });
      return;
    }

    const newItem = {
      titleTh: 'รายการความยินยอมใหม่',
      titleEn: 'New Consent Item',
      descriptionTh: '',
      descriptionEn: '',
      purpose: 'marketing',
      retentionPeriod: '3 ปี',
      required: false,
      order: consentItems.length,
      version: 1
    };

    setIsLoading(true);
    try {
      const createdItem = await ConsentService.createConsentItem(form.id, newItem);
      setConsentItems([...consentItems, createdItem]);
      toast.success('เพิ่มรายการความยินยอมใหม่แล้ว', {
        title: 'เพิ่มรายการสำเร็จ',
        duration: 3000
      });
    } catch (error) {
      console.error('Error creating consent item:', error);
      toast.error(error.message || 'ไม่สามารถเพิ่มรายการได้', {
        title: 'เกิดข้อผิดพลาด',
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateItem = async (updatedItem) => {
    setIsLoading(true);
    try {
      // Optimistic update
      setConsentItems(consentItems.map(item =>
        item.id === updatedItem.id ? updatedItem : item
      ));

      // Validate before saving
      const validation = ConsentService.validateConsentItem(updatedItem);
      if (!validation.valid) {
        toast.error(validation.errors.join(', '), {
          title: 'ข้อมูลไม่ถูกต้อง',
          duration: 5000
        });
        return;
      }

      await ConsentService.updateConsentItem(updatedItem.id, updatedItem);
      toast.success('อัปเดตรายการความยินยอมแล้ว', {
        title: 'บันทึกสำเร็จ',
        duration: 3000
      });
    } catch (error) {
      console.error('Error updating consent item:', error);
      // Revert on error
      await loadConsentItems();
      toast.error(error.message || 'ไม่สามารถบันทึกการแก้ไขได้', {
        title: 'เกิดข้อผิดพลาด',
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) {
      return;
    }

    setIsLoading(true);
    try {
      await ConsentService.deleteConsentItem(itemId);
      setConsentItems(consentItems.filter(item => item.id !== itemId));
      toast.success('ลบรายการความยินยอมแล้ว', {
        title: 'ลบสำเร็จ',
        duration: 3000
      });
    } catch (error) {
      console.error('Error deleting consent item:', error);
      toast.error(error.message || 'ไม่สามารถลบรายการได้', {
        title: 'เกิดข้อผิดพลาด',
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = consentItems.findIndex(item => item.id === active.id);
    const newIndex = consentItems.findIndex(item => item.id === over.id);

    const reorderedItems = arrayMove(consentItems, oldIndex, newIndex);

    // Update order numbers
    const updatedItems = reorderedItems.map((item, index) => ({
      ...item,
      order: index
    }));

    setConsentItems(updatedItems);

    // Save new order to backend
    setIsLoading(true);
    try {
      // Update all items with new order
      await Promise.all(
        updatedItems.map(item =>
          ConsentService.updateConsentItem(item.id, { order: item.order })
        )
      );
      toast.success('บันทึกลำดับใหม่แล้ว', {
        title: 'เรียงลำดับสำเร็จ',
        duration: 3000
      });
    } catch (error) {
      console.error('Error reordering consent items:', error);
      // Revert on error
      await loadConsentItems();
      toast.error('ไม่สามารถบันทึกลำดับใหม่ได้', {
        title: 'เกิดข้อผิดพลาด',
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GlassCard className="form-card-glow form-card-animate form-card-borderless motion-container animation-optimized group transition-all duration-400 ease-out">
      <GlassCardHeader>
        <div className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center"
            style={{ clipPath: 'circle(50% at center)' }}
          >
            <FontAwesomeIcon icon={faClipboardCheck} className="text-green-600 w-4 h-4" />
          </div>
          <div>
            <GlassCardTitle className="form-card-title">Consent Management</GlassCardTitle>
            <GlassCardDescription className="form-card-description">
              จัดการรายการความยินยอมในการเก็บและใช้ข้อมูลส่วนบุคคล
            </GlassCardDescription>
          </div>
        </div>
      </GlassCardHeader>

      <GlassCardContent className="space-y-6">
        {/* Usage Guide - Show when feature is disabled */}
        {!isEnabled && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <div className="text-blue-600 mt-0.5">ℹ️</div>
              <div className="flex-1 space-y-2">
                <p className="text-[13px] font-semibold text-blue-600">
                  คู่มือการใช้งาน Consent Management
                </p>
                <ol className="text-[12px] text-foreground/70 space-y-1 list-decimal list-inside">
                  <li>บันทึกฟอร์มให้เรียบร้อยก่อน (ต้องมี Form ID แบบ UUID)</li>
                  <li>เปิดใช้งาน Consent Management ด้วยการคลิกช่องทำเครื่องหมาย</li>
                  <li>เพิ่มรายการความยินยอมที่ต้องการแสดงในฟอร์ม</li>
                  <li>กำหนดรายละเอียด (ชื่อ, วัตถุประสงค์, ระยะเวลาเก็บข้อมูล)</li>
                  <li>ระบุว่ารายการใดเป็น "จำเป็น" หรือ "เลือกได้"</li>
                  <li>เรียงลำดับรายการด้วยการลาก (Drag & Drop)</li>
                </ol>
                <p className="text-[12px] text-muted-foreground mt-2">
                  💡 <strong>หมายเหตุ:</strong> Consent Management จะแสดงในส่วนท้ายของฟอร์ม เมื่อผู้ใช้กรอกฟอร์มเสร็จ
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Enable Toggle */}
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => handleToggleEnabled(e.target.checked)}
            className="w-4 h-4 rounded border-2 border-border bg-background checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
          />
          <span className="text-[14px] font-medium text-foreground/80 group-hover:text-foreground transition-colors">
            เปิดใช้งาน Consent Management
          </span>
        </label>

        {/* Consent Items List */}
        {isEnabled && (
          <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
            {/* Info Message */}
            {!form.id && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-[13px] text-yellow-600">
                  กรุณาบันทึกฟอร์มก่อนเพิ่มรายการความยินยอม
                </p>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <FontAwesomeIcon icon={faSpinner} className="w-6 h-6 text-primary animate-spin" />
                <span className="ml-3 text-[14px] text-muted-foreground">กำลังโหลด...</span>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && consentItems.length === 0 && form.id && (
              <div className="text-center py-8">
                <p className="text-[14px] text-muted-foreground mb-4">
                  ยังไม่มีรายการความยินยอม
                </p>
                <GlassButton
                  onClick={handleAddItem}
                  disabled={isLoading || !form.id}
                  className="inline-flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                  เพิ่มรายการแรก
                </GlassButton>
              </div>
            )}

            {/* Consent Items with Drag & Drop */}
            {!isLoading && consentItems.length > 0 && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={consentItems.map(item => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {consentItems.map((item) => (
                      <ConsentItemCard
                        key={item.id}
                        item={item}
                        onUpdate={handleUpdateItem}
                        onDelete={() => handleDeleteItem(item.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* Add Button */}
            {!isLoading && consentItems.length > 0 && form.id && (
              <div className="pt-2">
                <GlassButton
                  onClick={handleAddItem}
                  disabled={isLoading || !form.id}
                  className="w-full inline-flex items-center justify-center gap-2"
                  variant="outline"
                >
                  <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                  เพิ่มรายการความยินยอม
                </GlassButton>
              </div>
            )}

            {/* Summary */}
            {consentItems.length > 0 && (
              <div className="p-3 bg-muted/10 rounded-lg border border-border/30">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">
                    จำนวนรายการทั้งหมด: <span className="font-semibold text-foreground">{consentItems.length}</span>
                  </span>
                  <span className="text-muted-foreground">
                    จำเป็น: <span className="font-semibold text-green-600">{consentItems.filter(i => i.required).length}</span>
                    {' / '}
                    เลือกได้: <span className="font-semibold text-blue-600">{consentItems.filter(i => !i.required).length}</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  );
};

export default ConsentManagementTab;
