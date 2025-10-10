# 💻 Agent 5: UI-ENGINEER (REVISED FOR EXISTING FRONTEND)

## Overview
- **Sprint**: Week 7 (Sprint 5)
- **Focus**: Integrate Migration System with existing EnhancedFormBuilder
- **Strategy**: MODIFY existing components, NOT create new ones
- **Deliverables**: Enhanced form builder with migration awareness

---

## 🎯 Mission Statement

**Modify existing Q-Collector frontend to integrate with the Field Migration System WITHOUT breaking current functionality.**

The goal is to:
1. ✅ Add migration previews to existing EnhancedFormBuilder
2. ✅ Show migration status in real-time
3. ✅ Warn users before destructive operations
4. ✅ Display migration history (optional admin feature)
5. ✅ Keep ALL existing functionality working

**IMPORTANT**: This is NOT about creating new components. This is about enhancing what already exists.

---

## 📋 Prerequisites (Sprint 1-4 Complete)

- ✅ Backend Migration API ready (8 endpoints)
- ✅ FieldMigrationService working
- ✅ MigrationQueue processing migrations
- ✅ FormService.updateForm() auto-triggers migrations
- ✅ Current EnhancedFormBuilder.jsx (~2,200 lines)

---

## 🔍 Current Frontend Analysis

### Key Files to Modify:

1. **`src/components/EnhancedFormBuilder.jsx`** (Main target)
   - Current: 2,200+ lines
   - Handles: Form creation, field CRUD, sub-forms, save logic
   - Key methods:
     - `addField()` - Line 1244
     - `removeField()` - Line 1313
     - `updateField()` - Line 1301
     - `handleSave()` - Line 1520

2. **`backend/services/FormService.js`** (Backend)
   - Already has integration points:
     - `createForm()` → calls DynamicTableService
     - `updateForm()` → calls DynamicTableService.updateFormTableColumns()

### Current Save Flow:
```
User clicks "บันทึก" (Save)
    ↓
EnhancedFormBuilder.handleSave()
    ↓
apiClient.updateForm(formId, payload)
    ↓
Backend: FormService.updateForm()
    ↓
DynamicTableService.updateFormTableColumns()
    ↓
Direct ALTER TABLE (ไม่มี migration system)
```

### Target Save Flow (After Sprint 3-4):
```
User clicks "บันทึก" (Save)
    ↓
EnhancedFormBuilder.handleSave()
    ↓
[NEW] Show migration preview modal
    ↓
User confirms
    ↓
apiClient.updateForm(formId, payload)
    ↓
Backend: FormService.updateForm()
    ↓
[NEW] detectFieldChanges()
    ↓
[NEW] MigrationQueue.add(changes)
    ↓
[NEW] FieldMigrationService executes
    ↓
[NEW] Frontend shows migration status
```

---

## 📦 Tasks to Complete

### Task 5.1: Create Frontend Migration Service Wrapper
**File to CREATE**: `src/services/MigrationService.js`

**Purpose**: Wrapper around backend migration API endpoints

**Implementation**:
```javascript
/**
 * MigrationService - Frontend API wrapper for Field Migration System
 * @version 0.8.0
 */

import apiClient from './ApiClient';

class MigrationService {
  /**
   * Preview migration without executing
   * @param {string} migrationType - ADD_FIELD, DELETE_FIELD, RENAME_FIELD, CHANGE_TYPE
   * @param {string} tableName - Dynamic table name
   * @param {string} columnName - Column being modified
   * @param {Object} params - Additional parameters (fieldType, oldType, newType, etc.)
   * @returns {Promise<Object>} Preview with SQL, warnings, rollbackSql
   */
  async previewMigration(migrationType, tableName, columnName, params = {}) {
    try {
      const response = await apiClient.post('/api/migrations/preview', {
        migrationType,
        tableName,
        columnName,
        params
      });
      return response.data.preview;
    } catch (error) {
      console.error('Migration preview failed:', error);
      throw error;
    }
  }

  /**
   * Get migration history for a form
   * @param {string} formId - Form UUID
   * @param {Object} options - Filter options (success, limit, offset)
   * @returns {Promise<Object>} Migration history
   */
  async getMigrationHistory(formId, options = {}) {
    const { limit = 50, offset = 0, success } = options;
    const params = new URLSearchParams({ formId, limit, offset });
    if (success !== undefined) params.append('success', success);

    const response = await apiClient.get(`/api/migrations/history?${params}`);
    return response.data;
  }

  /**
   * Get real-time migration queue status
   * @param {string} formId - Form UUID
   * @returns {Promise<Object>} Queue status (waiting, active, failed counts)
   */
  async getQueueStatus(formId) {
    const response = await apiClient.get(`/api/migrations/status/${formId}`);
    return response.data.status;
  }

  /**
   * Rollback a migration
   * @param {string} migrationId - Migration UUID to rollback
   * @returns {Promise<Object>} Rollback result
   */
  async rollbackMigration(migrationId) {
    const response = await apiClient.post(`/api/migrations/rollback/${migrationId}`);
    return response.data;
  }

  /**
   * Get data backups for a form
   * @param {string} formId - Form UUID
   * @param {boolean} activeOnly - Only show non-expired backups
   * @returns {Promise<Array>} List of backups
   */
  async getBackups(formId, activeOnly = true) {
    const params = new URLSearchParams({ formId });
    if (activeOnly) params.append('active', 'true');

    const response = await apiClient.get(`/api/migrations/backups?${params}`);
    return response.data.backups;
  }

  /**
   * Restore data from backup
   * @param {string} backupId - Backup UUID
   * @returns {Promise<Object>} Restore result
   */
  async restoreBackup(backupId) {
    const response = await apiClient.post(`/api/migrations/restore/${backupId}`);
    return response.data;
  }

  /**
   * Detect field changes (helper for frontend preview)
   * @param {Array} oldFields - Previous fields array
   * @param {Array} newFields - Updated fields array
   * @returns {Array} Array of change objects
   */
  detectFieldChanges(oldFields, newFields) {
    const changes = [];

    // Detect additions
    const addedFields = newFields.filter(nf =>
      !oldFields.find(of => of.id === nf.id)
    );
    addedFields.forEach(field => {
      changes.push({
        type: 'ADD_FIELD',
        fieldId: field.id,
        fieldTitle: field.title,
        columnName: field.column_name || this._generateColumnName(field.title),
        dataType: field.type,
        action: 'เพิ่มฟิลด์ใหม่'
      });
    });

    // Detect deletions
    const deletedFields = oldFields.filter(of =>
      !newFields.find(nf => nf.id === of.id)
    );
    deletedFields.forEach(field => {
      changes.push({
        type: 'DELETE_FIELD',
        fieldId: field.id,
        fieldTitle: field.title,
        columnName: field.column_name || this._generateColumnName(field.title),
        action: 'ลบฟิลด์',
        warning: '⚠️ ข้อมูลจะถูก backup เป็นเวลา 90 วัน'
      });
    });

    // Detect type changes
    oldFields.forEach(oldField => {
      const newField = newFields.find(nf => nf.id === oldField.id);
      if (newField && oldField.type !== newField.type) {
        changes.push({
          type: 'CHANGE_TYPE',
          fieldId: oldField.id,
          fieldTitle: oldField.title,
          columnName: oldField.column_name || this._generateColumnName(oldField.title),
          oldType: oldField.type,
          newType: newField.type,
          action: 'เปลี่ยนชนิดฟิลด์',
          warning: '⚠️ ข้อมูลจะถูก backup และตรวจสอบความเข้ากันได้'
        });
      }
    });

    return changes;
  }

  /**
   * Generate column name from Thai title (helper)
   * @private
   */
  _generateColumnName(title) {
    // Simple transliteration - backend will use MyMemory API
    return title.toLowerCase().replace(/\s+/g, '_').substring(0, 20);
  }
}

export default new MigrationService();
```

**Lines of Code**: ~150 lines

---

### Task 5.2: Enhance EnhancedFormBuilder - Add Migration State
**File to MODIFY**: `src/components/EnhancedFormBuilder.jsx`

**Changes**:
1. Import MigrationService at top
2. Add state for migration status
3. Add useEffect to poll queue status

**Code to ADD** (after existing imports, around line 60):

```javascript
// ✅ NEW: Import Migration Service
import migrationService from '../services/MigrationService';

// ... existing code ...

// ✅ NEW: Add inside EnhancedFormBuilder component (after existing useState declarations)
const [migrationStatus, setMigrationStatus] = useState({
  waiting: 0,
  active: 0,
  failed: 0,
  lastChecked: null
});
const [showMigrationPreview, setShowMigrationPreview] = useState(false);
const [migrationChanges, setMigrationChanges] = useState([]);
const [isCheckingMigrations, setIsCheckingMigrations] = useState(false);

// ✅ NEW: Poll migration queue status when form exists
useEffect(() => {
  if (!initialForm?.id) return;

  const checkMigrationStatus = async () => {
    try {
      const status = await migrationService.getQueueStatus(initialForm.id);
      setMigrationStatus({
        ...status.queueStatus,
        lastChecked: new Date()
      });
    } catch (error) {
      console.error('Failed to check migration status:', error);
    }
  };

  // Check immediately
  checkMigrationStatus();

  // Poll every 5 seconds if there are pending migrations
  const interval = setInterval(() => {
    if (migrationStatus.waiting > 0 || migrationStatus.active > 0) {
      checkMigrationStatus();
    }
  }, 5000);

  return () => clearInterval(interval);
}, [initialForm?.id, migrationStatus.waiting, migrationStatus.active]);
```

---

### Task 5.3: Enhance handleSave() - Add Migration Detection
**File to MODIFY**: `src/components/EnhancedFormBuilder.jsx`

**Location**: Line 1520 (existing `handleSave` function)

**Strategy**: Wrap existing save logic with migration detection

**Code to MODIFY**:

```javascript
// ✅ BEFORE (Line 1520):
const handleSave = useCallback(async () => {
  // Show loading toast immediately
  const loadingToastId = toast.loading('กำลังบันทึกฟอร์ม...', {
    title: "กรุณารอสักครู่"
  });

  try {
    // ... existing validation code ...

// ✅ AFTER (Enhanced with migration detection):
const handleSave = useCallback(async () => {
  try {
    // ✅ NEW: Detect changes if editing existing form
    if (initialForm?.id && initialForm?.fields) {
      setIsCheckingMigrations(true);

      const changes = migrationService.detectFieldChanges(
        initialForm.fields,
        form.fields
      );

      // ✅ If there are schema-affecting changes, show preview
      if (changes.length > 0) {
        setMigrationChanges(changes);
        setShowMigrationPreview(true);
        setIsCheckingMigrations(false);
        return; // Stop here, wait for user confirmation
      }

      setIsCheckingMigrations(false);
    }

    // ✅ Continue with existing save logic
    // Show loading toast immediately
    const loadingToastId = toast.loading('กำลังบันทึกฟอร์ม...', {
      title: "กรุณารอสักครู่"
    });

    // ... rest of existing code stays the same ...
  } catch (error) {
    // ... existing error handling ...
  }
}, [form, initialForm, toast]);

// ✅ NEW: Handler for confirmed save (after user reviews migration preview)
const handleConfirmedSave = useCallback(async () => {
  setShowMigrationPreview(false);

  // Show loading toast
  const loadingToastId = toast.loading('กำลังบันทึกฟอร์มและทำ migration...', {
    title: "กรุณารอสักครู่"
  });

  try {
    // ✅ Same logic as original handleSave, but after confirmation
    // ... copy existing save logic from line 1543 onwards ...

    // After successful save, show migration info
    if (migrationChanges.length > 0) {
      toast.dismiss(loadingToastId);
      toast.success(
        `ฟอร์มถูกบันทึกเรียบร้อยแล้ว\n🔄 กำลังประมวลผล ${migrationChanges.length} migrations...`,
        {
          title: "บันทึกสำเร็จ",
          duration: 8000
        }
      );
    } else {
      toast.dismiss(loadingToastId);
      toast.success('ฟอร์มถูกบันทึกเรียบร้อยแล้ว', {
        title: "บันทึกสำเร็จ",
        duration: 5000
      });
    }

    setMigrationChanges([]);

    // ... existing callback logic ...
  } catch (error) {
    toast.dismiss(loadingToastId);
    // ... existing error handling ...
  }
}, [form, initialForm, migrationChanges, toast]);
```

---

### Task 5.4: Create Migration Preview Modal Component
**File to CREATE**: `src/components/ui/MigrationPreviewModal.jsx`

**Purpose**: Show users what migrations will happen before saving

**Implementation**:
```javascript
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faExclamationTriangle,
  faPlus,
  faTrash,
  faExchangeAlt,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import { GlassButton } from './glass-button';

/**
 * MigrationPreviewModal - Shows field changes before saving
 * Displays ADD_FIELD, DELETE_FIELD, CHANGE_TYPE migrations
 */
export default function MigrationPreviewModal({
  isOpen,
  changes,
  onConfirm,
  onCancel
}) {
  if (!isOpen) return null;

  const getMigrationIcon = (type) => {
    switch (type) {
      case 'ADD_FIELD': return faPlus;
      case 'DELETE_FIELD': return faTrash;
      case 'CHANGE_TYPE': return faExchangeAlt;
      default: return faInfoCircle;
    }
  };

  const getMigrationColor = (type) => {
    switch (type) {
      case 'ADD_FIELD': return 'text-green-600 bg-green-50 border-green-200';
      case 'DELETE_FIELD': return 'text-red-600 bg-red-50 border-red-200';
      case 'CHANGE_TYPE': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const hasDestructiveChanges = changes.some(c =>
    c.type === 'DELETE_FIELD' || c.type === 'CHANGE_TYPE'
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onCancel}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="w-5 h-5" />
                  ตรวจสอบการเปลี่ยนแปลงก่อนบันทึก
                </h3>
                <p className="text-orange-50 text-sm mt-1">
                  ระบบจะทำ migration ตามรายการด้านล่าง
                </p>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[50vh]">
                {/* Info Box */}
                {hasDestructiveChanges && (
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <FontAwesomeIcon
                        icon={faExclamationTriangle}
                        className="text-yellow-600 w-5 h-5 mt-0.5"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-yellow-800">
                          ⚠️ การเปลี่ยนแปลงนี้จะมีผลกับข้อมูลที่มีอยู่
                        </p>
                        <p className="text-xs text-yellow-700 mt-1">
                          • ข้อมูลจะถูก backup อัตโนมัติเป็นเวลา 90 วัน<br />
                          • คุณสามารถ rollback ได้ภายในระยะเวลาดังกล่าว
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Changes List */}
                <div className="space-y-3">
                  {changes.map((change, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-lg border ${getMigrationColor(change.type)}`}
                    >
                      <div className="flex items-start gap-3">
                        <FontAwesomeIcon
                          icon={getMigrationIcon(change.type)}
                          className="w-4 h-4 mt-1"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-sm">
                            {change.action}: {change.fieldTitle}
                          </p>
                          <p className="text-xs opacity-80 mt-1">
                            ชนิด: {change.dataType || change.oldType}
                            {change.newType && ` → ${change.newType}`}
                          </p>
                          {change.warning && (
                            <p className="text-xs mt-2 font-medium">
                              {change.warning}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Info Footer */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      className="text-blue-600 w-4 h-4 mt-0.5"
                    />
                    <div className="flex-1 text-xs text-blue-700">
                      <p className="font-semibold">ระบบ Migration จะทำงานอัตโนมัติ:</p>
                      <ul className="list-disc list-inside mt-1 space-y-0.5">
                        <li>เพิ่ม/ลบคอลัมน์ในตารางฐานข้อมูล</li>
                        <li>Backup ข้อมูลเดิมก่อนลบหรือเปลี่ยนชนิด</li>
                        <li>ตรวจสอบความถูกต้องของข้อมูล</li>
                        <li>บันทึก log ทุกการเปลี่ยนแปลง</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between gap-4">
                <p className="text-sm text-gray-600">
                  พบ <span className="font-bold">{changes.length}</span> การเปลี่ยนแปลง
                </p>
                <div className="flex gap-3">
                  <GlassButton
                    variant="secondary"
                    onClick={onCancel}
                    className="px-6"
                  >
                    ยกเลิก
                  </GlassButton>
                  <GlassButton
                    variant="primary"
                    onClick={onConfirm}
                    className="px-6 bg-orange-600 hover:bg-orange-700"
                  >
                    ยืนยันและบันทึก
                  </GlassButton>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

**Lines of Code**: ~200 lines

---

### Task 5.5: Add Migration Preview Modal to EnhancedFormBuilder
**File to MODIFY**: `src/components/EnhancedFormBuilder.jsx`

**Location**: Before the closing return statement (around line 2280)

**Code to ADD**:

```javascript
// ... existing JSX ...

      {/* ✅ NEW: Migration Preview Modal */}
      <MigrationPreviewModal
        isOpen={showMigrationPreview}
        changes={migrationChanges}
        onConfirm={handleConfirmedSave}
        onCancel={() => {
          setShowMigrationPreview(false);
          setMigrationChanges([]);
        }}
      />

      {/* ✅ NEW: Migration Status Indicator (if migrations are running) */}
      {(migrationStatus.waiting > 0 || migrationStatus.active > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl border-2 border-orange-500 p-4 z-40"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"
                />
              </div>
            </div>
            <div>
              <p className="font-semibold text-sm">กำลังประมวลผล Migrations</p>
              <p className="text-xs text-gray-600 mt-0.5">
                รอดำเนินการ: {migrationStatus.waiting} | กำลังทำ: {migrationStatus.active}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default EnhancedFormBuilder;
```

---

### Task 5.6: Add Migration Status Badge to Form Builder Header
**File to MODIFY**: `src/components/EnhancedFormBuilder.jsx`

**Location**: Inside the main header section (around line 1750, near the title)

**Code to ADD**:

```javascript
{/* Form Title Section */}
<div className="space-y-2">
  <label className="block text-sm font-semibold text-foreground/80 mb-2">
    ชื่อฟอร์ม *
  </label>
  <div className="relative">
    <GlassInput
      type="text"
      value={form.title}
      onChange={(value) => updateForm({ title: value })}
      placeholder="กรอกชื่อฟอร์ม"
      required
      className="w-full"
    />

    {/* ✅ NEW: Migration Status Badge (if editing existing form) */}
    {initialForm?.id && migrationStatus.lastChecked && (
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {migrationStatus.failed > 0 && (
          <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full font-medium">
            ⚠️ {migrationStatus.failed} ล้มเหลว
          </span>
        )}
        {migrationStatus.active > 0 && (
          <span className="px-2 py-1 bg-orange-100 text-orange-600 text-xs rounded-full font-medium animate-pulse">
            🔄 {migrationStatus.active} กำลังทำ
          </span>
        )}
        {migrationStatus.waiting > 0 && (
          <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full font-medium">
            ⏳ {migrationStatus.waiting} รอดำเนินการ
          </span>
        )}
      </div>
    )}
  </div>
</div>
```

---

### Task 5.7: Add "ดู Migration History" Button (Optional Admin Feature)
**File to MODIFY**: `src/components/EnhancedFormBuilder.jsx`

**Location**: Top actions area (near save button, around line 1730)

**Code to ADD**:

```javascript
{/* Action Buttons */}
<div className="flex flex-wrap items-center gap-3">
  {/* ✅ NEW: View Migration History (for admins only) */}
  {initialForm?.id && (userRole === 'super_admin' || userRole === 'admin') && (
    <GlassButton
      variant="secondary"
      onClick={async () => {
        try {
          const history = await migrationService.getMigrationHistory(initialForm.id);
          // Show in simple modal or navigate to history page
          alert(`Migration History:\n${JSON.stringify(history, null, 2)}`);
          // TODO: Replace with proper modal component
        } catch (error) {
          toast.error('ไม่สามารถโหลด migration history ได้');
        }
      }}
      className="gap-2"
    >
      <FontAwesomeIcon icon={faClipboardList} className="w-4 h-4" />
      ประวัติ Migrations
    </GlassButton>
  )}

  {/* Existing Save Button */}
  <GlassButton
    variant="primary"
    onClick={handleSave}
    disabled={isCheckingMigrations}
    className="gap-2 px-6"
  >
    {isCheckingMigrations ? (
      <>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
        />
        ตรวจสอบ Migrations...
      </>
    ) : (
      <>
        <FontAwesomeIcon icon={faSave} />
        บันทึกฟอร์ม
      </>
    )}
  </GlassButton>
</div>
```

---

## 📊 Deliverables Summary

| File | Type | Lines | Description |
|------|------|-------|-------------|
| `src/services/MigrationService.js` | **NEW** | ~150 | API wrapper |
| `src/components/ui/MigrationPreviewModal.jsx` | **NEW** | ~200 | Preview modal |
| `src/components/EnhancedFormBuilder.jsx` | **MODIFIED** | +~150 | Enhanced with migration detection |

**Total NEW Code**: ~350 lines
**Total MODIFIED Code**: ~150 lines
**Total Impact**: ~500 lines (minimal, non-breaking)

---

## ✅ Success Criteria

1. ✅ **Non-Breaking**: All existing functionality still works
2. ✅ **Migration Preview**: Users see what will change before saving
3. ✅ **Real-time Status**: Migration queue status shown in UI
4. ✅ **User Warnings**: Destructive operations show warnings
5. ✅ **Admin Features**: Migration history accessible (optional)
6. ✅ **Mobile Friendly**: All new UI components responsive
7. ✅ **Performance**: No noticeable performance impact

---

## 🧪 Testing Strategy

### Manual Testing Checklist:

1. **Add Field Test**:
   - Open existing form
   - Add new field
   - Click "บันทึก"
   - ✅ Should show migration preview modal
   - ✅ Should list "ADD_FIELD" change
   - ✅ After confirmation, should save successfully

2. **Delete Field Test**:
   - Open existing form with data
   - Delete field
   - Click "บันทึก"
   - ✅ Should show warning about backup
   - ✅ Should complete after confirmation

3. **Change Type Test**:
   - Change field type (text → number)
   - Click "บันทึก"
   - ✅ Should show type change warning
   - ✅ Should validate data compatibility

4. **Queue Status Test**:
   - Make multiple changes
   - Save
   - ✅ Should show migration queue status
   - ✅ Should update in real-time

5. **Create New Form Test**:
   - Create brand new form
   - Add fields
   - Click "บันทึก"
   - ✅ Should NOT show migration preview (no existing data)
   - ✅ Should save normally

---

## 📝 Implementation Notes

### Why This Approach?

1. **Minimal Changes**: Only ~500 lines added/modified
2. **Non-Breaking**: Existing code paths preserved
3. **Progressive Enhancement**: Features added, nothing removed
4. **User-Centric**: Clear warnings before destructive ops
5. **Admin Tools**: Optional advanced features for power users

### Integration Timeline:

1. **Day 1-2**: Create MigrationService.js + Test
2. **Day 3**: Enhance handleSave() with detection
3. **Day 4**: Create MigrationPreviewModal
4. **Day 5**: Add status indicators
5. **Day 6**: Testing & bug fixes
6. **Day 7**: Final polish & documentation

---

## 🎯 Next Steps After Sprint 5

After this sprint, the frontend will be **migration-aware**. Future enhancements could include:

1. **Advanced History View**: Dedicated page for migration history with filters
2. **Rollback UI**: One-click rollback from form builder
3. **Migration Scheduling**: Schedule migrations for off-peak hours
4. **Batch Operations**: Apply multiple migrations in one transaction
5. **Migration Templates**: Save common migration patterns

---

**Sprint 5 Status**: 📋 Ready to Implement
**Estimated Effort**: 5-7 days
**Complexity**: Medium (existing codebase integration)
**Risk**: Low (non-breaking changes only)
