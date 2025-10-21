# 🐛 SubForm Field Visibility Bug - Complete Analysis v0.7.43

**Date**: 2025-10-19
**Status**: 🔍 ROOT CAUSE IDENTIFIED - Complete Fix Plan Ready
**Severity**: ❌ CRITICAL - Feature Missing in SubForm UI

---

## 🎯 Executive Summary

**Problem**: SubForm fields **DO NOT have** Field Visibility UI in Form Builder
**Impact**: Users cannot configure conditional visibility for SubForm fields
**Root Cause**: Missing UI component in `SubFormBuilder` (not a backend bug!)
**Solution**: Add Field Visibility checkbox and formula input to SubForm field editor

---

## 🔍 Investigation Results

### ✅ Backend Status: WORKING CORRECTLY

**Files Checked**:
- `backend/services/FormService.js` - ✅ FIXED (all `||` → `??` operators)
- `backend/models/Field.js` - ✅ Correct (has `show_condition` JSONB column)

**Backend Changes Made** (Lines fixed):
- Line 99: `show_condition: fields[i].show_condition ?? null` ✅
- Line 102: `show_in_table: fields[i].showInTable ?? false` ✅
- Line 142: `show_condition: subFormData.fields[j].show_condition ?? null` ✅
- Line 145: `show_in_table: subFormData.fields[j].showInTable ?? false` ✅
- Line 540: `field.show_condition = fieldData.show_condition ?? null` ✅
- Line 543: `field.show_in_table = fieldData.showInTable ?? false` ✅
- Line 563: `show_condition: fieldData.show_condition ?? null` ✅
- Line 566: `show_in_table: fieldData.showInTable ?? false` ✅
- Line 658: `field.show_condition = fieldData.show_condition ?? null` ✅ (SubForm UPDATE)
- Line 661: `field.show_in_table = fieldData.showInTable ?? false` ✅ (SubForm UPDATE)
- Line 682: `show_condition: fieldData.show_condition ?? null` ✅ (SubForm CREATE)
- Line 685: `show_in_table: fieldData.showInTable ?? false` ✅ (SubForm CREATE)

**Conclusion**: Backend correctly saves `show_condition` for both Main Form and SubForm fields.

---

### ❌ Frontend Status: **MISSING UI COMPONENT**

**Main Form Field Editor** (`EnhancedFormBuilder.jsx` lines 469-530):
```jsx
{/* Field Visibility Settings */}
<div className="space-y-4 p-4 bg-gradient-to-r from-purple-500/5...">
  <div className="flex items-center gap-2">
    <label className="text-sm font-medium">การแสดงฟิลด์</label>
  </div>

  <label className="flex items-center gap-3">
    <input
      type="checkbox"
      checked={field.showCondition?.enabled !== false}
      onChange={(e) => {
        updateField({
          showCondition: {
            enabled: e.target.checked ? undefined : false,
            formula: ...
          }
        });
      }}
    />
    <span>แสดงฟิลด์ (แสดงเสมอ)</span>
  </label>

  {/* Conditional Formula Input */}
  {field.showCondition?.enabled === false && (
    <GlassTextarea
      value={field.showCondition?.formula || ''}
      onChange={...}
    />
  )}
</div>
```

**SubForm Field Editor** (`SubFormBuilder` component lines 779-1400):
**❌ NO VISIBILITY CHECKBOX!**

The SubForm field editor **only has**:
- Field Title input
- Field Type dropdown
- Required checkbox
- Show in Table checkbox
- **MISSING**: Field Visibility checkbox
- **MISSING**: Conditional formula input

**Problem Located**: Lines 847-857 (`addField` function)
```javascript
const newField = {
  id: generateId(),
  title: "",
  type: "short_answer",
  required: true,
  showInTable: canAddToTable,
  sendTelegram: false,
  // ❌ MISSING: showCondition property!
  options: {}
};
```

---

## 📊 Comparison: Main Form vs SubForm

| Feature | Main Form | SubForm | Status |
|---------|-----------|---------|--------|
| **Backend save** | ✅ Works | ✅ Works | FIXED |
| **Field Visibility UI** | ✅ Has checkbox | ❌ Missing | **BUG** |
| **Formula input** | ✅ Has textarea | ❌ Missing | **BUG** |
| **Formula validation** | ✅ Working | ❌ Not accessible | **BUG** |
| **Data structure** | ✅ Correct | ✅ Correct | OK |

---

## 🎯 Complete Fix Plan

### Phase 1: Add SubForm Field Visibility UI

**File**: `src/components/EnhancedFormBuilder.jsx`
**Location**: `SubFormBuilder` component (around line 1100-1300)

**Task 1.1**: Find SubForm Field Settings Section
- Search for "แสดงในตาราง" checkbox in SubForm field editor
- Locate the field settings card/container

**Task 1.2**: Add Field Visibility Checkbox
```jsx
{/* Field Visibility Settings - SAME AS MAIN FORM */}
<div className="space-y-4 p-4 bg-gradient-to-r from-purple-500/5 to-blue-500/5 border border-purple-200/20 rounded-lg">
  <div className="flex items-center gap-2">
    <FontAwesomeIcon icon={faQuestionCircle} className="w-4 h-4 text-purple-600" />
    <label className="text-sm font-medium text-purple-800">
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
          updateField(field.id, {
            showCondition: {
              enabled: isAlwaysVisible ? undefined : false,
              formula: isAlwaysVisible ? '' : (field.showCondition?.formula || '')
            }
          });
        }}
        className="w-4 h-4 text-primary focus:ring-primary/20 rounded"
      />
      <span className="text-sm">
        แสดงฟิลด์ <span className="text-xs text-muted-foreground ml-1">(แสดงเสมอ)</span>
      </span>
    </label>

    {/* Conditional Formula Input */}
    {field.showCondition?.enabled === false && (
      <div className="space-y-3 pl-7">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faCog} className="w-3 h-3 text-orange-600" />
          <label className="text-xs font-medium text-orange-800">
            เงื่อนไขการแสดงฟิลด์
          </label>
        </div>

        <GlassTextarea
          value={field.showCondition?.formula || ''}
          onChange={(e) => {
            updateField(field.id, {
              showCondition: {
                ...field.showCondition,
                formula: e.target.value
              }
            });
          }}
          placeholder="[ชื่อฟิลด์] = &quot;ค่า&quot;"
          rows={3}
          className="font-mono text-sm"
        />

        {/* Help Text */}
        <div className="text-xs text-muted-foreground">
          <FontAwesomeIcon icon={faInfoCircle} className="mr-1" />
          ใช้สูตรแบบ Google AppSheet: [ชื่อฟิลด์] = &quot;ค่า&quot;
        </div>
      </div>
    )}
  </div>
</div>
```

**Task 1.3**: Update `addField` function to include `showCondition`
```javascript
const newField = {
  id: generateId(),
  title: "",
  type: "short_answer",
  required: true,
  showInTable: canAddToTable,
  sendTelegram: false,
  telegramPrefix: '',
  telegramOrder: 0,
  showCondition: undefined, // ✅ ADD THIS
  options: {}
};
```

---

### Phase 2: Verify Data Flow

**File**: `src/components/EnhancedFormBuilder.jsx`

**Task 2.1**: Check `updateField` propagation (line 875-908)
```javascript
const updateField = (fieldId, fieldData) => {
  const updatedFields = subForm.fields.map(field => {
    if (field.id === fieldId) {
      return { ...field, ...fieldData }; // ✅ Should merge showCondition
    }
    return field;
  });

  // ✅ Propagate to main form state
  if (onFieldUpdate) {
    const mergedFieldData = { ...subForm.fields.find(f => f.id === fieldId), ...fieldData };
    onFieldUpdate(subForm.id, fieldId, mergedFieldData);
  }

  updateSubForm({ fields: updatedFields });
};
```

**Task 2.2**: Verify `cleanFieldData` includes `showCondition` (line 1850-1923)
```javascript
const cleanFieldData = (field) => {
  const normalizedField = {
    ...field,
    showInTable: field.showInTable !== undefined ? field.showInTable : (field.show_in_table ?? false),
    // ✅ VERIFY THIS LINE EXISTS:
    ...(field.showCondition !== undefined || field.show_condition !== undefined
      ? { showCondition: field.showCondition !== undefined ? field.showCondition : field.show_condition }
      : {}),
  };

  // Remove camelCase, add as snake_case
  const { showCondition, ...cleanedField } = normalizedField;

  if (savedShowCondition !== undefined) {
    cleanedField.show_condition = savedShowCondition; // ✅ Sent to backend
  }

  return cleanedField;
};
```

---

### Phase 3: Testing

**Test Case 1**: Create SubForm Field with Visibility = Unchecked
1. Open Form Builder
2. Add SubForm
3. Add field to SubForm
4. **Uncheck** "แสดงฟิลด์" checkbox
5. Enter formula: `[status] = "active"`
6. Save form
7. Reload Form Builder
8. **Expected**: Checkbox remains unchecked, formula preserved

**Test Case 2**: Toggle Visibility
1. Start with checked (always visible)
2. Uncheck → formula input appears
3. Check again → formula input hides
4. Save → should save current state

**Test Case 3**: Main Form Regression Test
1. Verify Main Form field visibility still works
2. Both Main and SubForm should work identically

**Test Case 4**: Database Verification
```sql
SELECT
  f.id,
  f.title,
  f.show_condition,
  sf.title as subform_title
FROM fields f
LEFT JOIN sub_forms sf ON f.sub_form_id = sf.id
WHERE f.sub_form_id IS NOT NULL;
```

Expected: `show_condition` should be `{ "enabled": false, "formula": "..." }` when unchecked

---

## 📋 Implementation Checklist

### Phase 1: UI Implementation (60 minutes)
- [ ] Locate SubForm field editor section in `EnhancedFormBuilder.jsx`
- [ ] Add Field Visibility checkbox (copy from Main Form lines 469-530)
- [ ] Add conditional formula textarea
- [ ] Add help text and icons
- [ ] Update `addField` function to include `showCondition: undefined`
- [ ] Test UI appears correctly
- [ ] Test checkbox toggle works
- [ ] Test formula input shows/hides

### Phase 2: Data Flow Verification (15 minutes)
- [ ] Verify `updateField` merges `showCondition` correctly
- [ ] Verify `onFieldUpdate` propagates to main form state
- [ ] Verify `cleanFieldData` includes `showCondition`
- [ ] Verify snake_case conversion (`show_condition`)
- [ ] Add console.log to debug save flow

### Phase 3: Testing (30 minutes)
- [ ] Test Case 1: Create field with visibility unchecked
- [ ] Test Case 2: Toggle visibility checkbox
- [ ] Test Case 3: Main Form regression test
- [ ] Test Case 4: Database verification
- [ ] Test Case 5: Formula validation works
- [ ] Test Case 6: Save/load persistence

### Phase 4: Code Review & Cleanup (15 minutes)
- [ ] Remove debug console.log statements
- [ ] Ensure consistent styling with Main Form
- [ ] Verify accessibility (labels, ARIA)
- [ ] Check responsive design (mobile/desktop)
- [ ] Update code comments

---

## 🎯 Expected Outcome

After fix:
1. ✅ SubForm fields have Field Visibility UI (same as Main Form)
2. ✅ Users can uncheck "แสดงฟิลด์" for SubForm fields
3. ✅ Formula input appears when unchecked
4. ✅ Settings save to database correctly
5. ✅ Settings load correctly when re-opening Form Builder
6. ✅ FormView respects SubForm field visibility conditions
7. ✅ Main Form functionality unaffected (regression-free)

---

## 🔗 Related Files

**Frontend**:
- `src/components/EnhancedFormBuilder.jsx` (lines 779-1400: SubFormBuilder)
- `src/components/EnhancedFormBuilder.jsx` (lines 469-530: Main Form visibility UI reference)
- `src/utils/formulaEngine.js` (formula validation)

**Backend**:
- `backend/services/FormService.js` (✅ Already fixed)
- `backend/models/Field.js` (✅ Working correctly)

**Documentation**:
- `FIELD-VISIBILITY-MANUAL.md` (formula syntax reference)

---

## ⚠️ Important Notes

1. **Backend is Working**: The `??` operator fix was necessary but not sufficient
2. **UI was Missing**: The real problem is missing UI in SubForm field editor
3. **Copy from Main Form**: UI code should be identical to Main Form (lines 469-530)
4. **Formula Validation**: Must call `validateFormula()` for SubForm fields too
5. **Consistent UX**: SubForm and Main Form should have identical field settings UI

---

## 📊 Timeline Estimate

| Phase | Time | Status |
|-------|------|--------|
| Backend Fix | ✅ Done | COMPLETED |
| Frontend Investigation | ✅ Done | COMPLETED |
| UI Implementation | 60 min | READY |
| Data Flow Verification | 15 min | READY |
| Testing | 30 min | READY |
| Code Review | 15 min | READY |
| **Total** | **~2 hours** | READY TO START |

---

**Version**: v0.7.43-dev
**Last Updated**: 2025-10-19 18:45:00 UTC+7
**Status**: 🎯 Complete analysis done - Ready for implementation
