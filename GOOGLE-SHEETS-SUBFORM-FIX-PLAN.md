# Google Sheets Sub-Form Import Fix Plan v0.8.0
**Date**: 2025-10-17
**Priority**: 🔴 HIGH - User-reported bug blocking sub-form imports
**Status**: 📋 PLANNING COMPLETE - Ready for implementation

---

## 🐛 Problem Summary

When importing Google Sheets data to a **sub-form**, the user encounters two critical issues:

### Issue 1: Empty Parent Form Dropdown
- **Location**: `FormTypeSelection.jsx` Step 3 (lines 195-220)
- **Symptom**: Dropdown shows "-- เลือกฟอร์มหลัก --" with NO options
- **Expected**: Should show all available main forms from database
- **Current Code**: Lines 51-66 in FormTypeSelection.jsx

```javascript
const fetchForms = async () => {
  try {
    setLoading(true);
    const response = await apiClient.listForms();
    const formsList = response.forms || response || [];

    // Filter only active main forms (not sub-forms)
    const activeForms = formsList.filter(f => f.is_active !== false);
    setForms(activeForms);
  } catch (err) {
    console.error('Error fetching forms:', err);
    setError('ไม่สามารถโหลดรายการฟอร์มได้');
  } finally {
    setLoading(false);
  }
};
```

**Root Cause Analysis**:
- `apiClient.listForms()` call likely returning empty array OR
- Response structure mismatch (expects `response.forms` but API returns different structure) OR
- Authentication/authorization issue preventing data fetch OR
- Filtering logic removing all forms incorrectly

### Issue 2: Missing Foreign Key Mapping UI
- **Location**: Missing completely - No component exists
- **User Requirement**: "จะต้องมีระบบให้เลือกว่า จะเชื่อมโยงรายการตารางฟอร์มย่อย ฟิลด์ไหน เข้ากับฟิลด์ไหนของตารางหลัก"
- **Translation**: "Must have a system to choose which sub-form field links to which parent form field"
- **Example Use Case**: Sub-form "customer_id" field → Parent form "id" field
- **Missing Step**: Between Step 3 (Form Type Selection) and Step 4 (Import Progress)

**User Impact**:
- **Issue 1**: Cannot complete sub-form import workflow (blocking)
- **Issue 2**: No way to establish foreign key relationships between sub-form and parent form data

---

## 🔍 Investigation Steps

### Step 1: Debug API Response ✅
**Action**: Add console logging to verify `apiClient.listForms()` response structure

**Test Commands**:
```javascript
// Add to FormTypeSelection.jsx fetchForms() function (line 54-55)
console.log('📋 [FormTypeSelection] API Response:', response);
console.log('📋 [FormTypeSelection] Forms List:', formsList);
console.log('📋 [FormTypeSelection] Active Forms:', activeForms);
```

**Expected Debug Output**:
```javascript
// Successful case:
{
  success: true,
  forms: [
    { id: "uuid-1", title: "ฟอร์มลูกค้า", is_active: true, ... },
    { id: "uuid-2", title: "ฟอร์มสินค้า", is_active: true, ... }
  ],
  pagination: { ... }
}

// Problem case 1: Wrong structure
{
  data: { forms: [...] } // Need response.data.forms
}

// Problem case 2: Empty array
{
  success: true,
  forms: [] // API returns empty despite database having forms
}
```

### Step 2: Verify Backend API Endpoint ✅
**Action**: Check backend route returns correct data structure

**Files to Review**:
- `backend/api/routes/forms.routes.js` - GET /forms endpoint
- Backend logs when frontend calls `/api/v1/forms`

**Expected API Response Format**:
```javascript
{
  success: true,
  forms: [
    {
      id: "uuid",
      title: "Form Title",
      description: "...",
      is_active: true,
      created_at: "2025-10-17T...",
      fields: [...],
      sub_forms: [...]
    }
  ],
  pagination: {
    page: 1,
    limit: 50,
    totalCount: 10,
    totalPages: 1
  }
}
```

### Step 3: Check Browser Network Tab ✅
**Action**: Monitor actual API calls when opening sub-form import

**Steps**:
1. Open Developer Tools → Network tab
2. Navigate to Google Sheets Import → Step 3
3. Select "ฟอร์มย่อย" (Sub-form) radio button
4. Check for GET request to `/api/v1/forms`
5. Verify HTTP status code (200 = success, 401 = unauthorized, 500 = server error)
6. Inspect response body

**Common Issues to Look For**:
- ❌ 401 Unauthorized - Token expired or missing
- ❌ 403 Forbidden - User lacks permissions
- ❌ 500 Internal Server Error - Backend crash
- ❌ Empty response body despite 200 status
- ❌ Incorrect response structure

---

## 🛠️ Solution Design

### Solution 1: Fix Empty Dropdown

#### Option A: Fix Response Structure Parsing (Most Likely)
**If API returns nested structure like `response.data.forms`:**

```javascript
// FormTypeSelection.jsx - Line 54
const fetchForms = async () => {
  try {
    setLoading(true);
    setError('');

    console.log('📋 [FormTypeSelection] Fetching forms...');
    const response = await apiClient.listForms();

    // DEBUG: Log full response
    console.log('📋 [FormTypeSelection] Raw Response:', response);

    // ✅ FIX: Handle multiple response structures
    const formsList = response?.forms || response?.data?.forms || response || [];

    console.log('📋 [FormTypeSelection] Forms List:', formsList);

    if (!Array.isArray(formsList)) {
      console.error('❌ Forms list is not an array:', formsList);
      setError('รูปแบบข้อมูลไม่ถูกต้อง');
      setForms([]);
      return;
    }

    // Filter only active main forms (not sub-forms)
    const activeForms = formsList.filter(f => f.is_active !== false);

    console.log('📋 [FormTypeSelection] Active Forms:', activeForms);
    console.log('📋 [FormTypeSelection] Form Count:', activeForms.length);

    setForms(activeForms);

    if (activeForms.length === 0) {
      setError('ไม่พบฟอร์มหลักในระบบ กรุณาสร้างฟอร์มหลักก่อน');
    }
  } catch (err) {
    console.error('❌ [FormTypeSelection] Error fetching forms:', err);
    console.error('❌ Error details:', {
      message: err.message,
      status: err.status,
      data: err.data
    });
    setError('ไม่สามารถโหลดรายการฟอร์มได้: ' + (err.message || 'Unknown error'));
    setForms([]);
  } finally {
    setLoading(false);
  }
};
```

**Changes**:
1. Added comprehensive console logging for debugging
2. Handle multiple possible response structures (`response.forms`, `response.data.forms`, `response`)
3. Validate `formsList` is an array before filtering
4. Show specific error message when no forms found
5. Enhanced error handling with detailed logging

#### Option B: Fix Backend Route (If API returns wrong format)
**If backend `/api/v1/forms` returns incorrect structure:**

**Check**: `backend/api/routes/forms.routes.js` or `backend/controllers/form.controller.js`

**Expected Return Format**:
```javascript
// Correct format (used by frontend):
res.json({
  success: true,
  forms: [...],
  pagination: {...}
});

// Wrong format (if this is the case):
res.json({
  data: {
    forms: [...] // Nested too deep
  }
});
```

**Fix**: Ensure backend returns flat structure with `forms` at top level.

---

### Solution 2: Add Foreign Key Mapping UI

#### New Component: `ForeignKeyMappingModal.jsx`

**Purpose**: Allow user to map sub-form fields to parent form fields for foreign key relationships

**Location**: `src/components/sheets/ForeignKeyMappingModal.jsx`

**Component Structure**:

```javascript
/**
 * ForeignKeyMappingModal Component v0.8.0
 * Step 3.5: Map foreign key relationships between sub-form and parent form
 *
 * User Flow:
 * 1. User selects parent form in FormTypeSelection
 * 2. Modal opens showing two columns:
 *    - Left: Sub-form fields (from selected columns in Step 2)
 *    - Right: Parent form fields (fetched from selected parent form)
 * 3. User selects which field pairs are foreign key relationships
 * 4. At least one mapping required to proceed
 *
 * Example Mapping:
 * Sub-form Field: "รหัสลูกค้า" (customer_id) → Parent Field: "ID" (id)
 */

import React, { useState, useEffect } from 'react';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent, GlassCardFooter } from '../ui/glass-card';
import { GlassButton } from '../ui/glass-button';
import { GlassSelect } from '../ui/glass-input';
import apiClient from '../../services/ApiClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink, faArrowRight, faCheck, faTimes, faInfoCircle } from '@fortawesome/free-solid-svg-icons';

const ForeignKeyMappingModal = ({
  parentFormId,
  subFormFields, // Fields from Step 2 (selectedColumns)
  onSave,
  onCancel
}) => {
  const [parentForm, setParentForm] = useState(null);
  const [parentFields, setParentFields] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchParentForm();
  }, [parentFormId]);

  const fetchParentForm = async () => {
    try {
      setLoading(true);
      const form = await apiClient.getForm(parentFormId);
      setParentForm(form);

      // Extract fields from parent form
      const fields = form.fields || [];
      setParentFields(fields);

      // Initialize mappings array (one for each sub-form field)
      const initialMappings = subFormFields.map(subField => ({
        subFormFieldName: subField.columnName,
        subFormFieldType: subField.fieldType,
        parentFieldId: '', // User will select
        parentFieldName: '',
        parentFieldType: ''
      }));

      setMappings(initialMappings);
    } catch (err) {
      console.error('Error fetching parent form:', err);
      setError('ไม่สามารถโหลดข้อมูลฟอร์มหลักได้');
    } finally {
      setLoading(false);
    }
  };

  const updateMapping = (index, parentFieldId) => {
    const parentField = parentFields.find(f => f.id === parentFieldId);

    setMappings(prev => {
      const newMappings = [...prev];
      newMappings[index] = {
        ...newMappings[index],
        parentFieldId: parentFieldId,
        parentFieldName: parentField?.title || '',
        parentFieldType: parentField?.type || ''
      };
      return newMappings;
    });
  };

  const handleSave = () => {
    // Filter only mappings where user selected a parent field
    const activeMappings = mappings.filter(m => m.parentFieldId);

    if (activeMappings.length === 0) {
      setError('กรุณาเลือกอย่างน้อย 1 ความสัมพันธ์ระหว่างฟิลด์');
      return;
    }

    onSave(activeMappings);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <GlassCard className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <GlassCardHeader>
          <GlassCardTitle className="text-2xl">
            <FontAwesomeIcon icon={faLink} className="mr-2 text-primary" />
            กำหนดความสัมพันธ์ระหว่างฟิลด์
          </GlassCardTitle>
          <p className="text-muted-foreground mt-2">
            เลือกฟิลด์ในฟอร์มย่อยที่จะเชื่อมโยงกับฟิลด์ในฟอร์มหลัก (Foreign Key)
          </p>
        </GlassCardHeader>

        <GlassCardContent className="space-y-6">
          {/* Parent Form Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
              ฟอร์มหลัก
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {parentForm?.title || 'กำลังโหลด...'}
            </p>
          </div>

          {/* Mapping Table */}
          {!loading && parentFields.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold border-b border-border">
                      ฟิลด์ในฟอร์มย่อย
                    </th>
                    <th className="px-4 py-3 text-center font-semibold border-b border-border w-20">
                      <FontAwesomeIcon icon={faArrowRight} />
                    </th>
                    <th className="px-4 py-3 text-left font-semibold border-b border-border">
                      เชื่อมโยงกับฟิลด์ในฟอร์มหลัก
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((mapping, index) => (
                    <tr key={index} className="border-b border-border hover:bg-muted/30 transition-colors">
                      {/* Sub-form Field */}
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium">{mapping.subFormFieldName}</div>
                          <div className="text-xs text-muted-foreground">
                            ประเภท: {mapping.subFormFieldType}
                          </div>
                        </div>
                      </td>

                      {/* Arrow */}
                      <td className="px-4 py-3 text-center">
                        <FontAwesomeIcon
                          icon={faArrowRight}
                          className={mapping.parentFieldId ? 'text-primary' : 'text-muted-foreground'}
                        />
                      </td>

                      {/* Parent Field Selection */}
                      <td className="px-4 py-3">
                        <select
                          value={mapping.parentFieldId || ''}
                          onChange={(e) => updateMapping(index, e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">-- ไม่เชื่อมโยง --</option>
                          {parentFields.map(field => (
                            <option key={field.id} value={field.id}>
                              {field.title} ({field.type})
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
              <span className="font-semibold">คำแนะนำ:</span> เลือกฟิลด์ที่จะใช้เชื่อมโยงข้อมูลระหว่างฟอร์มหลักและฟอร์มย่อย
              เช่น ฟิลด์ "รหัสลูกค้า" ในฟอร์มย่อย เชื่อมกับฟิลด์ "ID" ในฟอร์มหลัก
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <p className="text-sm text-red-800 dark:text-red-200">
                <FontAwesomeIcon icon={faTimes} className="mr-2" />
                {error}
              </p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">กำลังโหลดข้อมูลฟอร์มหลัก...</p>
            </div>
          )}
        </GlassCardContent>

        <GlassCardFooter className="justify-between">
          <GlassButton
            variant="ghost"
            onClick={onCancel}
            disabled={loading}
          >
            ยกเลิก
          </GlassButton>

          <GlassButton
            variant="primary"
            onClick={handleSave}
            disabled={loading}
          >
            <FontAwesomeIcon icon={faCheck} className="mr-2" />
            บันทึก
          </GlassButton>
        </GlassCardFooter>
      </GlassCard>
    </div>
  );
};

export default ForeignKeyMappingModal;
```

#### Integration into FormTypeSelection.jsx

**Changes Required**:

1. **Add state for FK mappings** (line 39):
```javascript
const [foreignKeyMappings, setForeignKeyMappings] = useState([]);
const [showFKModal, setShowFKModal] = useState(false);
```

2. **Modify handleNext function** (lines 84-112):
```javascript
const handleNext = () => {
  // Validation
  if (!formName.trim()) {
    setError('กรุณากรอกชื่อฟอร์ม');
    return;
  }

  if (formType === 'sub' && !parentFormId) {
    setError('กรุณาเลือกฟอร์มหลัก');
    return;
  }

  if (selectedRoles.length === 0) {
    setError('กรุณาเลือกอย่างน้อย 1 บทบาทที่สามารถเข้าถึงฟอร์มได้');
    return;
  }

  // ✅ NEW: If sub-form, show FK mapping modal
  if (formType === 'sub') {
    setShowFKModal(true);
    return;
  }

  // Main form: proceed directly
  proceedToNextStep();
};

const proceedToNextStep = (fkMappings = []) => {
  // Build form configuration
  const formConfig = {
    name: formName.trim(),
    description: formDescription.trim() || `นำเข้าจาก Google Sheets: ${sheetData.metadata?.sheetName || 'Sheet'}`,
    isSubForm: formType === 'sub',
    parentFormId: formType === 'sub' ? parentFormId : null,
    selectedColumns,
    roles_allowed: selectedRoles,
    foreignKeyMappings: fkMappings // ✅ NEW: Add FK mappings
  };

  onNext(formConfig);
};
```

3. **Add modal component at the end of JSX** (after line 322):
```javascript
{/* Foreign Key Mapping Modal */}
{showFKModal && (
  <ForeignKeyMappingModal
    parentFormId={parentFormId}
    subFormFields={selectedColumns}
    onSave={(mappings) => {
      setForeignKeyMappings(mappings);
      setShowFKModal(false);
      proceedToNextStep(mappings);
    }}
    onCancel={() => setShowFKModal(false)}
  />
)}
```

4. **Add import statement** (line 18):
```javascript
import ForeignKeyMappingModal from './ForeignKeyMappingModal';
```

---

### Solution 3: Backend Support for Foreign Keys

**File**: `backend/services/SheetFormCreationService.js`

**Changes Required**:

1. **Update `createFormFromSheet` method** to accept `foreignKeyMappings`:

```javascript
async createFormFromSheet(userId, sheetData, formConfig) {
  // ... existing code ...

  // ✅ NEW: Extract FK mappings
  const foreignKeyMappings = formConfig.foreignKeyMappings || [];

  // Store FK mappings in SheetImportConfig
  if (formConfig.isSubForm && foreignKeyMappings.length > 0) {
    await this.storeForeignKeyMappings(importConfig.id, foreignKeyMappings);
  }

  // ... rest of method ...
}
```

2. **Add new method `storeForeignKeyMappings`**:

```javascript
async storeForeignKeyMappings(importConfigId, mappings) {
  const { SheetImportConfig } = require('../models');

  // Store as JSON in SheetImportConfig
  await SheetImportConfig.update(
    {
      foreign_key_mappings: mappings
    },
    {
      where: { id: importConfigId }
    }
  );

  logger.info(`Stored ${mappings.length} foreign key mappings for import config ${importConfigId}`);
}
```

3. **Add column to `sheet_import_configs` table** (new migration):

```javascript
// backend/migrations/YYYYMMDDHHMMSS-add-fk-mappings-to-sheet-import-configs.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('sheet_import_configs', 'foreign_key_mappings', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Foreign key relationships between sub-form and parent form fields',
      defaultValue: []
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('sheet_import_configs', 'foreign_key_mappings');
  }
};
```

---

## 📋 Implementation Checklist

### Phase 1: Debug and Fix Empty Dropdown (30 minutes)

- [ ] **Task 1.1**: Add debug logging to `FormTypeSelection.jsx` fetchForms() (5 min)
  - Location: Lines 51-66
  - Add console.log statements as shown in Solution 1

- [ ] **Task 1.2**: Test sub-form import flow and review console logs (10 min)
  - Navigate to Google Sheets Import → Step 3
  - Select "ฟอร์มย่อย" radio button
  - Check browser console for debug output
  - Check browser Network tab for API call

- [ ] **Task 1.3**: Apply fix based on debug findings (10 min)
  - If response structure issue: Update response parsing
  - If backend issue: Fix backend route
  - If empty database: Create test forms first

- [ ] **Task 1.4**: Verify dropdown shows forms correctly (5 min)
  - Dropdown should show all active main forms
  - Forms should be selectable
  - Error message if no forms found

### Phase 2: Create Foreign Key Mapping Component (1 hour)

- [ ] **Task 2.1**: Create `ForeignKeyMappingModal.jsx` component (30 min)
  - Location: `src/components/sheets/ForeignKeyMappingModal.jsx`
  - Copy full component code from Solution 2
  - Add imports and exports

- [ ] **Task 2.2**: Integrate modal into `FormTypeSelection.jsx` (20 min)
  - Add state variables (line 39)
  - Modify handleNext function (lines 84-112)
  - Add proceedToNextStep function
  - Add modal JSX at end of component (after line 322)
  - Add import statement (line 18)

- [ ] **Task 2.3**: Test FK mapping modal (10 min)
  - Select sub-form type
  - Choose parent form
  - Click "สร้างฟอร์ม" button
  - Modal should open showing sub-form and parent form fields
  - Test mapping selection
  - Verify "บันทึก" button passes mappings correctly

### Phase 3: Backend Support (30 minutes)

- [ ] **Task 3.1**: Create database migration for FK mappings column (10 min)
  - File: `backend/migrations/YYYYMMDDHHMMSS-add-fk-mappings.js`
  - Run migration: `cd backend && npx sequelize-cli db:migrate`

- [ ] **Task 3.2**: Update `SheetImportConfig` model (5 min)
  - Add `foreign_key_mappings` field definition

- [ ] **Task 3.3**: Update `SheetFormCreationService.js` (10 min)
  - Add `storeForeignKeyMappings` method
  - Update `createFormFromSheet` to call new method

- [ ] **Task 3.4**: Test end-to-end sub-form import (5 min)
  - Import sub-form with FK mappings
  - Verify mappings saved in database
  - Check console logs for confirmation

### Phase 4: Testing and Validation (30 minutes)

- [ ] **Task 4.1**: Test empty dropdown fix (10 min)
  - Create at least 2 main forms in database
  - Navigate to sub-form import
  - Verify dropdown shows both forms

- [ ] **Task 4.2**: Test FK mapping workflow (15 min)
  - Import sub-form with 3+ fields
  - Map 2 fields to parent form
  - Verify mappings saved correctly
  - Check database: `sheet_import_configs.foreign_key_mappings`

- [ ] **Task 4.3**: Edge case testing (5 min)
  - Try to proceed without selecting any FK mappings (should show error)
  - Try to create sub-form with no parent forms in database (should show warning)
  - Test canceling FK modal (should return to form type selection)

---

## 🧪 Testing Scenarios

### Test Case 1: Empty Dropdown Fix

**Prerequisites**: At least 2 active main forms in database

**Steps**:
1. Navigate to Google Sheets Import page
2. Complete Step 1 (URL input) and Step 2 (column selection)
3. In Step 3, select "ฟอร์มย่อย" radio button
4. Check parent form dropdown

**Expected**:
- ✅ Dropdown shows all active main forms
- ✅ Forms are selectable
- ✅ Selecting form enables "สร้างฟอร์ม" button

**Failure Cases**:
- ❌ Dropdown shows "-- เลือกฟอร์มหลัก --" with no options
- ❌ Console shows API error
- ❌ Error message displayed to user

### Test Case 2: Foreign Key Mapping

**Prerequisites**: 1 parent form with 5+ fields, Google Sheet with 3+ columns

**Steps**:
1. Complete Steps 1-3 of Google Sheets import
2. Select sub-form type and choose parent form
3. Click "สร้างฟอร์ม" button
4. FK mapping modal should appear
5. Map 2 sub-form fields to parent form fields
6. Click "บันทึก"

**Expected**:
- ✅ Modal shows sub-form fields (left column)
- ✅ Modal shows parent form fields in dropdown (right column)
- ✅ User can select mappings
- ✅ "บันทึก" button enabled after selecting at least 1 mapping
- ✅ Mappings saved to `formConfig.foreignKeyMappings`
- ✅ Import proceeds to Step 4

**Failure Cases**:
- ❌ Modal doesn't open
- ❌ Parent fields not loaded
- ❌ Can't select mappings
- ❌ Error when saving

### Test Case 3: Database Persistence

**Prerequisites**: Complete Test Case 2 successfully

**Steps**:
1. After import completes, connect to PostgreSQL
2. Query: `SELECT foreign_key_mappings FROM sheet_import_configs ORDER BY created_at DESC LIMIT 1;`

**Expected**:
```json
[
  {
    "subFormFieldName": "รหัสลูกค้า",
    "subFormFieldType": "number",
    "parentFieldId": "uuid-parent-field",
    "parentFieldName": "ID",
    "parentFieldType": "number"
  },
  {
    "subFormFieldName": "ชื่อโครงการ",
    "subFormFieldType": "short_answer",
    "parentFieldId": "uuid-parent-field-2",
    "parentFieldName": "Project Name",
    "parentFieldType": "short_answer"
  }
]
```

---

## 🚀 Rollout Plan

### Step 1: Development (2 hours)
- Implement all changes in development environment
- Test with sample data

### Step 2: User Testing (30 minutes)
- Have user test with real Google Sheets
- Verify dropdown shows their forms
- Test FK mapping with actual use case

### Step 3: Documentation (15 minutes)
- Update `CLAUDE.md` with new feature
- Add FK mapping to user guide
- Document troubleshooting steps

### Step 4: Deployment
- Commit changes with descriptive message
- Push to main branch
- Monitor logs for issues

---

## 📝 Success Criteria

✅ **Issue 1 Fixed**: Parent form dropdown shows all available main forms
✅ **Issue 2 Fixed**: FK mapping modal allows field relationship selection
✅ **Data Persistence**: Foreign key mappings saved to database correctly
✅ **User Validation**: User confirms both issues resolved
✅ **No Regressions**: Main form import still works correctly

---

## 🔗 Related Files

**Frontend**:
- `src/components/sheets/FormTypeSelection.jsx` (main fix location)
- `src/components/sheets/ForeignKeyMappingModal.jsx` (new component)
- `src/services/ApiClient.js` (listForms method)

**Backend**:
- `backend/api/routes/forms.routes.js` (GET /forms endpoint)
- `backend/services/SheetFormCreationService.js` (FK storage)
- `backend/models/SheetImportConfig.js` (add FK field)
- `backend/migrations/YYYYMMDD-add-fk-mappings.js` (new migration)

**Documentation**:
- `CLAUDE.md` (update with v0.8.0 changes)
- `qtodo.md` (track implementation progress)

---

## 💡 Notes

- **Priority**: This is a user-reported bug blocking sub-form imports. Fix ASAP.
- **Testing**: Use real Google Sheets data for testing, not mock data.
- **Logging**: Keep debug logs for initial release, remove in v0.8.1.
- **Future Enhancement**: Add drag-and-drop for FK mapping UI (optional).

---

**Plan Created**: 2025-10-17 17:00 (Bangkok Time)
**Estimated Implementation Time**: 2 hours
**Developer**: Claude Code Agent
**Status**: 📋 Ready for Implementation
